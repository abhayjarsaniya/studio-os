import { TenantStore } from './tenantStore';
import { 
  PlatformAdminUser, 
  PlatformRole, 
  PlatformPermission, 
  PlatformAdminUserSchema 
} from '../types/schema';

export const ROLE_PERMISSIONS_MAP: Record<PlatformRole, PlatformPermission[]> = {
  super_admin: [
    'view_studios', 'manage_studios',
    'view_subscriptions', 'manage_subscriptions',
    'manage_plans',
    'view_revenue', 'record_payments', 'manage_refunds',
    'manage_announcements',
    'manage_support',
    'manage_admins',
    'view_audit_logs',
    'manage_settings'
  ],
  platform_admin: [
    'view_studios', 'manage_studios',
    'view_subscriptions', 'manage_subscriptions',
    'manage_plans',
    'view_revenue', 'record_payments', 'manage_refunds',
    'manage_announcements',
    'manage_support',
    'view_audit_logs'
  ],
  billing_manager: [
    'view_studios',
    'view_subscriptions', 'manage_subscriptions',
    'manage_plans',
    'view_revenue', 'record_payments', 'manage_refunds',
    'view_audit_logs'
  ],
  support_manager: [
    'view_studios',
    'manage_support',
    'manage_announcements',
    'view_audit_logs'
  ],
  read_only_analyst: [
    'view_studios',
    'view_subscriptions',
    'view_revenue',
    'view_audit_logs'
  ]
};

export const DEFAULT_PLATFORM_SUPER_ADMIN: PlatformAdminUser = {
  id: 'admin_super_01',
  name: 'Platform Super Admin',
  email: 'superadmin@studioos.internal',
  role: 'super_admin',
  permissions: ROLE_PERMISSIONS_MAP.super_admin,
  status: 'active',
  createdAt: '2026-01-01T00:00:00.000Z'
};

export class PlatformAuthService {
  private readonly STORE_KEY = 'platform_admins';

  listAdmins(): PlatformAdminUser[] {
    let admins = TenantStore.get<PlatformAdminUser>('platform_system', this.STORE_KEY);
    if (!admins || admins.length === 0) {
      admins = [DEFAULT_PLATFORM_SUPER_ADMIN];
      TenantStore.set('platform_system', this.STORE_KEY, admins);
    }
    return admins;
  }

  getAdmin(id: string): PlatformAdminUser | undefined {
    return this.listAdmins().find(a => a.id === id);
  }

  getAdminByEmail(email: string): PlatformAdminUser | undefined {
    return this.listAdmins().find(a => a.email.toLowerCase() === email.toLowerCase());
  }

  createAdmin(data: {
    name: string;
    email: string;
    role: PlatformRole;
    permissions?: PlatformPermission[];
  }): PlatformAdminUser {
    const existing = this.getAdminByEmail(data.email);
    if (existing) {
      throw new Error(`Admin with email "${data.email}" already exists`);
    }

    const permissions = data.permissions || ROLE_PERMISSIONS_MAP[data.role];
    const newAdmin: PlatformAdminUser = {
      id: `padmin_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      role: data.role,
      permissions,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    PlatformAdminUserSchema.parse(newAdmin);

    const admins = this.listAdmins();
    TenantStore.set('platform_system', this.STORE_KEY, [newAdmin, ...admins]);
    return newAdmin;
  }

  updateAdmin(
    id: string,
    updates: Partial<Omit<PlatformAdminUser, 'id' | 'createdAt'>>,
    actingAdminId?: string
  ): PlatformAdminUser {
    const admins = this.listAdmins();
    const index = admins.findIndex(a => a.id === id);
    if (index === -1) throw new Error(`Platform admin "${id}" not found`);

    const target = admins[index];

    // Safety guard: Super Admin cannot demote or suspend themselves if they are the last active super_admin
    if (target.role === 'super_admin' && (updates.role !== undefined || updates.status === 'suspended')) {
      const activeSuperAdmins = admins.filter(a => a.role === 'super_admin' && a.status === 'active' && a.id !== id);
      if (activeSuperAdmins.length === 0) {
        throw new Error('Safety Protection: Cannot demote or suspend the last active Platform Super Admin.');
      }
    }

    const updated: PlatformAdminUser = {
      ...target,
      ...updates,
      permissions: updates.role ? ROLE_PERMISSIONS_MAP[updates.role] : (updates.permissions || target.permissions),
      updatedAt: new Date().toISOString()
    };

    admins[index] = updated;
    TenantStore.set('platform_system', this.STORE_KEY, admins);
    return updated;
  }

  deleteAdmin(id: string, actingAdminId?: string): boolean {
    const admins = this.listAdmins();
    const target = admins.find(a => a.id === id);
    if (!target) return false;

    // Safety guard: Cannot delete the last active Super Admin
    if (target.role === 'super_admin') {
      const remainingSuperAdmins = admins.filter(a => a.role === 'super_admin' && a.id !== id);
      if (remainingSuperAdmins.length === 0) {
        throw new Error('Safety Protection: Cannot delete the last Platform Super Admin account.');
      }
    }

    const filtered = admins.filter(a => a.id !== id);
    TenantStore.set('platform_system', this.STORE_KEY, filtered);
    return true;
  }

  /**
   * Authorize a platform admin operation
   */
  hasPermission(admin: PlatformAdminUser | null | undefined, permission: PlatformPermission): boolean {
    if (!admin || admin.status !== 'active') return false;
    if (admin.role === 'super_admin') return true;
    return admin.permissions.includes(permission);
  }

  /**
   * Verify if a user context is an authorized platform administrator.
   * Studio Owners and Studio Admins do NOT possess platform admin access.
   */
  verifyPlatformAdminAccess(userOrId: string | { email?: string; id?: string; role?: string }): { isAuthorized: boolean; admin?: PlatformAdminUser; reason?: string } {
    if (!userOrId) {
      return { isAuthorized: false, reason: 'Unauthenticated platform request.' };
    }

    let identifier = '';
    if (typeof userOrId === 'string') {
      identifier = userOrId;
    } else if (typeof userOrId === 'object') {
      // Check if user is a studio-level role
      const platformRoles = ['super_admin', 'platform_admin', 'billing_manager', 'support_manager', 'read_only_analyst'];
      if (userOrId.role && !platformRoles.includes(userOrId.role)) {
        return { isAuthorized: false, reason: 'Invalid or missing platform role. Studio owners/admins cannot access platform admin.' };
      }
      identifier = userOrId.email || userOrId.id || '';
    }

    if (!identifier) {
      return { isAuthorized: false, reason: 'Invalid or missing user identifier.' };
    }

    const admin = this.getAdmin(identifier) || this.getAdminByEmail(identifier);
    if (!admin) {
      return { isAuthorized: false, reason: 'User is not a provisioned Platform Administrator. Studio owners cannot access platform admin.' };
    }

    if (admin.status !== 'active') {
      return { isAuthorized: false, reason: 'Platform Administrator account is suspended.' };
    }

    return { isAuthorized: true, admin };
  }

  hasPlatformPermission(admin: PlatformAdminUser | null | undefined, permission: PlatformPermission): boolean {
    return this.hasPermission(admin, permission);
  }
}

export const platformAuthService = new PlatformAuthService();
