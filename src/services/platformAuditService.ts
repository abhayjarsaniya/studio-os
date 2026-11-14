import { TenantStore } from './tenantStore';
import { PlatformAuditLog, PlatformAuditLogSchema } from '../types/schema';

export class PlatformAuditService {
  private readonly STORE_KEY = 'platform_audit_logs';

  listLogs(): PlatformAuditLog[] {
    return TenantStore.get<PlatformAuditLog>('platform_system', this.STORE_KEY) || [];
  }

  log(data: {
    adminId: string;
    adminName: string;
    action: string;
    targetType: string;
    targetId: string;
    details: string;
    ipAddress?: string;
  }): PlatformAuditLog {
    const newLog: PlatformAuditLog = {
      id: `plog_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      adminId: data.adminId,
      adminName: data.adminName,
      action: data.action,
      targetType: data.targetType,
      targetId: data.targetId,
      details: data.details,
      ipAddress: data.ipAddress || '127.0.0.1 (Local Dev)',
      timestamp: new Date().toISOString()
    };

    PlatformAuditLogSchema.parse(newLog);

    const logs = this.listLogs();
    TenantStore.set('platform_system', this.STORE_KEY, [newLog, ...logs]);
    return newLog;
  }

  logAction(
    adminName: string,
    action: string,
    targetType: string,
    targetId: string,
    details: string,
    ipAddress?: string
  ): PlatformAuditLog {
    return this.log({
      adminId: 'master_admin_01',
      adminName,
      action,
      targetType,
      targetId,
      details,
      ipAddress
    });
  }
}

export const platformAuditService = new PlatformAuditService();
