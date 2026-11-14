import { PermissionOverride, PermissionOverrideSchema } from '../types/schema';
import { TenantStore } from './tenantStore';
import { auditService } from './auditService';

export class PermissionOverrideService {
  listOverrides(studioId: string, employeeId?: string): PermissionOverride[] {
    if (!studioId) throw new Error('[permissionOverrideService.listOverrides]: studioId is required');
    const all = TenantStore.get<PermissionOverride>(studioId, 'permissionOverrides');
    if (employeeId) {
      return all.filter(o => o.employeeId === employeeId);
    }
    return all;
  }

  getOverride(studioId: string, id: string): PermissionOverride | null {
    if (!studioId) throw new Error('[permissionOverrideService.getOverride]: studioId is required');
    const all = this.listOverrides(studioId);
    return all.find(o => o.id === id) || null;
  }

  createOverride(
    studioId: string,
    data: Omit<PermissionOverride, 'id' | 'studioId' | 'createdAt' | 'createdBy'> & { createdBy?: string }
  ): PermissionOverride {
    if (!studioId) throw new Error('[permissionOverrideService.createOverride]: studioId is required');
    if (!data.employeeId) throw new Error('Employee ID is required for override');
    if (!data.module || !data.action) throw new Error('Module and Action are required');

    const all = this.listOverrides(studioId);

    // Remove any existing identical module+action override for this employee to keep clean
    const filtered = all.filter(o => !(o.employeeId === data.employeeId && o.module === data.module && o.action === data.action));

    const newOverride: PermissionOverride = {
      createdBy: 'system',
      ...data,
      id: `ovr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      studioId,
      createdAt: new Date().toISOString()
    };

    PermissionOverrideSchema.parse(newOverride);
    TenantStore.set(studioId, 'permissionOverrides', [...filtered, newOverride]);

    auditService.log(
      studioId,
      data.createdBy || 'system',
      'CREATE_PERMISSION_OVERRIDE',
      'permissionOverride',
      newOverride.id,
      {
        employeeId: data.employeeId,
        module: data.module,
        action: data.action,
        granted: data.granted,
        scope: data.scope,
        expiresAt: data.expiresAt
      }
    );

    return newOverride;
  }

  deleteOverride(studioId: string, overrideId: string, operatorId?: string): void {
    if (!studioId) throw new Error('[permissionOverrideService.deleteOverride]: studioId is required');
    const all = this.listOverrides(studioId);
    const target = all.find(o => o.id === overrideId);
    if (!target) return;

    const filtered = all.filter(o => o.id !== overrideId);
    TenantStore.set(studioId, 'permissionOverrides', filtered);

    auditService.log(
      studioId,
      operatorId || 'system',
      'DELETE_PERMISSION_OVERRIDE',
      'permissionOverride',
      overrideId,
      { employeeId: target.employeeId, module: target.module, action: target.action }
    );
  }

  clearExpiredOverrides(studioId: string): number {
    const all = this.listOverrides(studioId);
    const now = new Date().toISOString();
    const active = all.filter(o => !o.expiresAt || o.expiresAt > now);
    const expiredCount = all.length - active.length;
    if (expiredCount > 0) {
      TenantStore.set(studioId, 'permissionOverrides', active);
    }
    return expiredCount;
  }
}

export const permissionOverrideService = new PermissionOverrideService();
