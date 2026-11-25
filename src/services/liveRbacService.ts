import { auth, db } from '../lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  deleteDoc,
  Unsubscribe
} from 'firebase/firestore';
import {
  MASTER_MODULES_CATALOG,
  MASTER_ACTIONS_CATALOG,
  MASTER_GLOBAL_ROLES_META,
  GLOBAL_FIELD_POLICIES,
  MasterGlobalRoleId,
  MasterModuleId,
  MasterActionId,
  MasterResourceScope
} from '../types/masterAdmin';
import { generateDefaultGlobalRoles } from './globalRbacService';

export interface StudioRbacRole {
  id: string;
  name: string;
  label: string;
  description: string;
  isSystemRole: boolean;
  isCustomRole?: boolean;
  studioId?: string;
  permissions: Partial<Record<MasterModuleId, Partial<Record<MasterActionId, boolean>>>>;
  scopes: Partial<Record<MasterModuleId, MasterResourceScope>>;
  fieldAccess: Record<string, { visible: boolean; editable: boolean }>;
  updatedAt: string;
  updatedBy?: string;
}

export interface UserPermissionOverrideDoc {
  uid: string;
  studioId: string;
  roleId: string;
  displayName?: string;
  loginId?: string;
  /** Explicit overrides: true = allow, false = deny, undefined = inherit from role */
  permissions: Partial<Record<MasterModuleId, Partial<Record<MasterActionId, boolean | null>>>>;
  scopes?: Partial<Record<MasterModuleId, MasterResourceScope | null>>;
  fieldAccess?: Record<string, { visible?: boolean | null; editable?: boolean | null }>;
  updatedAt: string;
  updatedBy?: string;
}

export interface RbacAuditEntry {
  id: string;
  actingAdmin: string;
  studioId: string;
  targetType: 'global_role' | 'studio_role' | 'custom_role' | 'user_override';
  targetId: string;
  module: string;
  permissionChanged: string;
  previousValue: any;
  newValue: any;
  timestamp: string;
}

export interface EffectivePermissionsBundle {
  studioId: string;
  uid: string;
  roleId: string;
  isDeactivated: boolean;
  permissions: Record<MasterModuleId, Record<MasterActionId, boolean>>;
  scopes: Record<MasterModuleId, MasterResourceScope>;
  fieldAccess: Record<string, { visible: boolean; editable: boolean }>;
}

/** Map legacy PermissionModule names to MasterModuleId */
export function mapLegacyModuleId(mod: string): MasterModuleId {
  const map: Record<string, MasterModuleId> = {
    dashboard: 'dashboard',
    events: 'events',
    subEvents: 'sub_events',
    sub_events: 'sub_events',
    bookings: 'bookings',
    calendar: 'calendar_scheduling',
    calendar_scheduling: 'calendar_scheduling',
    customers: 'customers_crm',
    customers_crm: 'customers_crm',
    quotations: 'quotations',
    documents: 'quotations',
    whatsapp: 'whatsapp',
    team: 'team_members',
    team_members: 'team_members',
    crew: 'team_members',
    attendance: 'attendance_leave',
    leave: 'attendance_leave',
    attendance_leave: 'attendance_leave',
    salary: 'payroll_salary',
    payroll: 'payroll_salary',
    payroll_salary: 'payroll_salary',
    suppliers: 'suppliers_vendors',
    suppliers_vendors: 'suppliers_vendors',
    tasks: 'tasks',
    workflows: 'workflows_pipelines',
    workflows_pipelines: 'workflows_pipelines',
    deliveries: 'deliverables_production',
    deliverables_production: 'deliverables_production',
    invoices: 'invoices_billing',
    invoices_billing: 'invoices_billing',
    payments: 'payments_collections',
    payments_collections: 'payments_collections',
    expenses: 'expenses_purchases',
    expenses_purchases: 'expenses_purchases',
    reports: 'financial_reports',
    financial_reports: 'financial_reports',
    analytics: 'studio_analytics',
    studio_analytics: 'studio_analytics',
    platform_analytics: 'platform_analytics',
    roles: 'roles_permissions',
    roles_permissions: 'roles_permissions',
    settings: 'studio_settings',
    studio_settings: 'studio_settings',
    branches: 'branch_management',
    branch_management: 'branch_management',
    auditLogs: 'audit_logs',
    audit_logs: 'audit_logs',
    notifications: 'notifications',
    customer_privacy: 'customer_privacy',
    export_download: 'export_download'
  };
  return map[mod] || (mod as MasterModuleId);
}

/** Map legacy PermissionAction names to MasterActionId */
export function mapLegacyActionId(action: string): MasterActionId {
  const map: Record<string, MasterActionId> = {
    view: 'view',
    create: 'create',
    edit: 'edit',
    delete: 'delete',
    export: 'export',
    download: 'export',
    approve: 'approve',
    reject: 'approve',
    assign: 'assign',
    share: 'export',
    view_financials: 'view_financials',
    viewFinancials: 'view_financials',
    edit_financials: 'edit_financials',
    editFinancials: 'edit_financials',
    view_client_pii: 'view_client_pii',
    viewClientPii: 'view_client_pii',
    manageSettings: 'manage_settings',
    manage_settings: 'manage_settings',
    bulk_action: 'bulk_action',
    bulkAction: 'bulk_action'
  };
  return map[action] || (action as MasterActionId);
}

export function buildDefaultFieldAccessForRole(roleId: string): Record<string, { visible: boolean; editable: boolean }> {
  const out: Record<string, { visible: boolean; editable: boolean }> = {};
  GLOBAL_FIELD_POLICIES.forEach((p) => {
    const key = `${p.module}.${p.fieldName}`;
    out[key] = {
      visible: p.visibleRoles.includes(roleId as MasterGlobalRoleId),
      editable: p.editableRoles.includes(roleId as MasterGlobalRoleId)
    };
  });
  return out;
}

export function getDefaultRoleTemplate(roleId: string): StudioRbacRole {
  const defaults = generateDefaultGlobalRoles();
  const matched = defaults.find((d) => d.id === roleId);
  const meta = MASTER_GLOBAL_ROLES_META.find((m) => m.id === roleId);
  if (matched) {
    return {
      id: matched.id,
      name: matched.name,
      label: matched.label,
      description: matched.description,
      isSystemRole: matched.isSystemRole,
      permissions: matched.defaultPermissions || {},
      scopes: matched.defaultScopes || {},
      fieldAccess: buildDefaultFieldAccessForRole(matched.id),
      updatedAt: matched.updatedAt
    };
  }
  return {
    id: roleId,
    name: meta?.name || roleId,
    label: meta?.label || roleId,
    description: meta?.description || 'Custom studio role',
    isSystemRole: false,
    isCustomRole: true,
    permissions: {},
    scopes: {},
    fieldAccess: buildDefaultFieldAccessForRole(roleId),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Pure deterministic permission resolution engine:
 * Precedence:
 * 1. Platform security restrictions (deactivated user = deny all; platform_analytics = master admin only)
 * 2. Master Admin's individual user override (explicit true/false)
 * 3. Studio role permission (studio role override merged on top of global role template)
 * 4. Default deny
 */
export function resolveEffectivePermissions(params: {
  studioId: string;
  uid: string;
  roleId: string;
  isDeactivated?: boolean;
  globalRole?: Partial<StudioRbacRole> | null;
  studioRole?: Partial<StudioRbacRole> | null;
  userOverride?: UserPermissionOverrideDoc | null;
}): EffectivePermissionsBundle {
  const { studioId, uid, roleId, isDeactivated = false, globalRole, studioRole, userOverride } = params;
  const fallback = getDefaultRoleTemplate(roleId);

  const permissions = {} as Record<MasterModuleId, Record<MasterActionId, boolean>>;
  const scopes = {} as Record<MasterModuleId, MasterResourceScope>;
  const fieldAccess: Record<string, { visible: boolean; editable: boolean }> = {};

  MASTER_MODULES_CATALOG.forEach((mod) => {
    const modPerms = {} as Record<MasterActionId, boolean>;
    const isPlatformOnly = Boolean(mod.isPlatformOnly);

    MASTER_ACTIONS_CATALOG.forEach((act) => {
      if (isDeactivated || isPlatformOnly) {
        modPerms[act.id] = false;
        return;
      }

      const ovrVal = userOverride?.permissions?.[mod.id]?.[act.id];
      if (ovrVal === true || ovrVal === false) {
        modPerms[act.id] = ovrVal;
        return;
      }

      const studioVal = studioRole?.permissions?.[mod.id]?.[act.id];
      if (studioVal !== undefined) {
        modPerms[act.id] = Boolean(studioVal);
        return;
      }

      const globalVal = globalRole?.permissions?.[mod.id]?.[act.id];
      if (globalVal !== undefined) {
        modPerms[act.id] = Boolean(globalVal);
        return;
      }

      modPerms[act.id] = Boolean(fallback.permissions?.[mod.id]?.[act.id]);
    });

    permissions[mod.id] = modPerms;

    if (isDeactivated || isPlatformOnly) {
      scopes[mod.id] = 'none';
    } else {
      const ovrScope = userOverride?.scopes?.[mod.id];
      scopes[mod.id] =
        ovrScope ||
        studioRole?.scopes?.[mod.id] ||
        globalRole?.scopes?.[mod.id] ||
        fallback.scopes?.[mod.id] ||
        'none';
    }
  });

  GLOBAL_FIELD_POLICIES.forEach((policy) => {
    const key = `${policy.module}.${policy.fieldName}`;
    if (isDeactivated) {
      fieldAccess[key] = { visible: false, editable: false };
      return;
    }

    const base =
      studioRole?.fieldAccess?.[key] ||
      globalRole?.fieldAccess?.[key] ||
      fallback.fieldAccess[key] || { visible: false, editable: false };

    const ovr = userOverride?.fieldAccess?.[key];
    fieldAccess[key] = {
      visible: ovr?.visible === true || ovr?.visible === false ? ovr.visible : Boolean(base.visible),
      editable: ovr?.editable === true || ovr?.editable === false ? ovr.editable : Boolean(base.editable)
    };
  });

  return {
    studioId,
    uid,
    roleId,
    isDeactivated,
    permissions,
    scopes,
    fieldAccess
  };
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const user = auth?.currentUser;
  if (user) {
    const token = await user.getIdToken();
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

class LiveRbacService {
  private activeBundle: EffectivePermissionsBundle | null = null;
  private listeners = new Set<(bundle: EffectivePermissionsBundle | null) => void>();

  setActiveBundle(bundle: EffectivePermissionsBundle | null) {
    this.activeBundle = bundle;
    this.listeners.forEach((fn) => fn(bundle));
  }

  getActiveBundle(): EffectivePermissionsBundle | null {
    return this.activeBundle;
  }

  subscribeActiveBundle(fn: (bundle: EffectivePermissionsBundle | null) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /**
   * Live Firestore subscription for a logged-in Studio Owner or Employee.
   * Automatically updates whenever Master Admin changes global roles, studio roles,
   * individual user overrides, or deactivates the user.
   */
  subscribeUserEffectivePermissions(
    studioId: string,
    uid: string,
    fallbackRoleId: string,
    onUpdate: (bundle: EffectivePermissionsBundle) => void
  ): Unsubscribe {
    if (!db || !studioId || !uid) {
      const bundle = resolveEffectivePermissions({ studioId, uid, roleId: fallbackRoleId });
      this.setActiveBundle(bundle);
      onUpdate(bundle);
      return () => {};
    }

    let currentRoleId = fallbackRoleId;
    let isDeactivated = false;
    let globalRolesMap = new Map<string, Partial<StudioRbacRole>>();
    let studioRolesMap = new Map<string, Partial<StudioRbacRole>>();
    let userOverride: UserPermissionOverrideDoc | null = null;

    const recompute = () => {
      const bundle = resolveEffectivePermissions({
        studioId,
        uid,
        roleId: currentRoleId,
        isDeactivated,
        globalRole: globalRolesMap.get(currentRoleId) || null,
        studioRole: studioRolesMap.get(currentRoleId) || null,
        userOverride
      });
      this.setActiveBundle(bundle);
      onUpdate(bundle);
    };

    const unsubUser = onSnapshot(doc(db, 'users', uid), (snap) => {
      if (snap.exists()) {
        const d = snap.data() || {};
        isDeactivated = d.status === 'deactivated' || d.status === 'suspended' || d.isActive === false;
        const r = String(d.roleId || d.role || '').toLowerCase();
        if (r === 'owner' || d.accountType === 'STUDIO_OWNER') {
          currentRoleId = 'studio_owner';
        } else if (r) {
          currentRoleId = r;
        }
      }
      recompute();
    });

    const unsubGlobal = onSnapshot(collection(db, 'globalRoles'), (snap) => {
      const map = new Map<string, Partial<StudioRbacRole>>();
      snap.docs.forEach((d) => map.set(d.id, d.data() as Partial<StudioRbacRole>));
      globalRolesMap = map;
      recompute();
    });

    const unsubStudioRoles = onSnapshot(collection(db, 'studios', studioId, 'rbacRoles'), (snap) => {
      const map = new Map<string, Partial<StudioRbacRole>>();
      snap.docs.forEach((d) => map.set(d.id, d.data() as Partial<StudioRbacRole>));
      studioRolesMap = map;
      recompute();
    });

    const unsubOverride = onSnapshot(doc(db, 'studios', studioId, 'userPermissions', uid), (snap) => {
      userOverride = snap.exists() ? (snap.data() as UserPermissionOverrideDoc) : null;
      recompute();
    });

    return () => {
      unsubUser();
      unsubGlobal();
      unsubStudioRoles();
      unsubOverride();
    };
  }

  /**
   * Check whether the currently active live RBAC bundle permits (module, action).
   * Returns null if live bundle is not active (caller can fall back to local authorizationEngine).
   */
  canFromActiveBundle(module: string, action: string): boolean | null {
    if (!this.activeBundle) return null;
    if (this.activeBundle.isDeactivated) return false;
    const mId = mapLegacyModuleId(module);
    const aId = mapLegacyActionId(action);
    const modPerms = this.activeBundle.permissions[mId];
    if (!modPerms) return false;
    return Boolean(modPerms[aId]);
  }

  getActiveScope(module: string): MasterResourceScope | null {
    if (!this.activeBundle) return null;
    const mId = mapLegacyModuleId(module);
    return this.activeBundle.scopes[mId] || 'none';
  }

  isFieldVisible(module: string, fieldName: string): boolean | null {
    if (!this.activeBundle) return null;
    if (this.activeBundle.isDeactivated) return false;
    const mId = mapLegacyModuleId(module);
    const key = `${mId}.${fieldName}`;
    const entry = this.activeBundle.fieldAccess[key];
    return entry ? entry.visible : true;
  }

  isFieldEditable(module: string, fieldName: string): boolean | null {
    if (!this.activeBundle) return null;
    if (this.activeBundle.isDeactivated) return false;
    const mId = mapLegacyModuleId(module);
    const key = `${mId}.${fieldName}`;
    const entry = this.activeBundle.fieldAccess[key];
    return entry ? entry.editable : true;
  }

  // ==========================================================
  // MASTER ADMIN DATA LOADERS & MUTATIONS
  // ==========================================================

  async fetchStudioRbacState(studioId: string | 'all'): Promise<{
    globalRoles: StudioRbacRole[];
    studioRoles: StudioRbacRole[];
    userOverrides: UserPermissionOverrideDoc[];
    studioUsers: Array<{ uid: string; displayName: string; loginId: string; roleId: string; accountType: string; status: string }>;
    auditLogs: RbacAuditEntry[];
  }> {
    // 1. Global roles
    const defaults = MASTER_GLOBAL_ROLES_META.filter((m) => m.id !== 'custom_role').map((m) =>
      getDefaultRoleTemplate(m.id)
    );
    const globalRolesMap = new Map<string, StudioRbacRole>(defaults.map((r) => [r.id, r]));

    if (db) {
      const globalSnap = await getDocs(collection(db, 'globalRoles')).catch(() => null);
      globalSnap?.docs.forEach((d) => {
        const data = d.data() as Partial<StudioRbacRole>;
        const base = globalRolesMap.get(d.id) || getDefaultRoleTemplate(d.id);
        globalRolesMap.set(d.id, {
          ...base,
          ...data,
          id: d.id,
          permissions: { ...base.permissions, ...(data.permissions || {}) },
          scopes: { ...base.scopes, ...(data.scopes || {}) },
          fieldAccess: { ...base.fieldAccess, ...(data.fieldAccess || {}) }
        });
      });
    }

    const studioRoles: StudioRbacRole[] = [];
    const userOverrides: UserPermissionOverrideDoc[] = [];
    const studioUsers: Array<{ uid: string; displayName: string; loginId: string; roleId: string; accountType: string; status: string }> = [];

    if (db && studioId !== 'all') {
      const [srSnap, uoSnap, usersSnap] = await Promise.all([
        getDocs(collection(db, 'studios', studioId, 'rbacRoles')).catch(() => null),
        getDocs(collection(db, 'studios', studioId, 'userPermissions')).catch(() => null),
        getDocs(collection(db, 'users')).catch(() => null)
      ]);

      srSnap?.docs.forEach((d) => {
        const data = d.data() as Partial<StudioRbacRole>;
        const base = globalRolesMap.get(d.id) || getDefaultRoleTemplate(d.id);
        studioRoles.push({
          ...base,
          ...data,
          id: d.id,
          studioId,
          permissions: { ...base.permissions, ...(data.permissions || {}) },
          scopes: { ...base.scopes, ...(data.scopes || {}) },
          fieldAccess: { ...base.fieldAccess, ...(data.fieldAccess || {}) }
        });
      });

      uoSnap?.docs.forEach((d) => {
        userOverrides.push({ ...(d.data() as UserPermissionOverrideDoc), uid: d.id });
      });

      usersSnap?.docs.forEach((d) => {
        const u = d.data() || {};
        if (u.studioId === studioId) {
          const r = String(u.roleId || u.role || '').toLowerCase();
          const normalizedRole =
            u.accountType === 'STUDIO_OWNER' || r === 'owner' ? 'studio_owner' : r || 'photographer';
          studioUsers.push({
            uid: d.id,
            displayName: u.displayName || u.name || u.email || d.id,
            loginId: u.loginId || String(u.email || '').replace(/@studio-os\.internal$/i, ''),
            roleId: normalizedRole,
            accountType: u.accountType || 'EMPLOYEE',
            status: u.status || 'active'
          });
        }
      });
    }

    let auditLogs: RbacAuditEntry[] = [];
    if (db) {
      const logsSnap = await getDocs(collection(db, 'platformAuditLogs')).catch(() => null);
      if (logsSnap) {
        auditLogs = logsSnap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<RbacAuditEntry, 'id'>) }))
          .filter((l) => l.targetType && (studioId === 'all' || l.studioId === studioId || l.studioId === 'global'))
          .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
          .slice(0, 50);
      }
    }

    return {
      globalRoles: Array.from(globalRolesMap.values()),
      studioRoles,
      userOverrides,
      studioUsers,
      auditLogs
    };
  }

  async saveRolePolicy(params: {
    studioId: string | 'all';
    role: StudioRbacRole;
    actingAdmin: string;
    auditChanges?: Array<{ module: string; permissionChanged: string; previousValue: any; newValue: any }>;
  }): Promise<void> {
    const { studioId, role, actingAdmin, auditChanges = [] } = params;
    const now = new Date().toISOString();
    const payload: StudioRbacRole = {
      ...role,
      updatedAt: now,
      updatedBy: actingAdmin
    };

    // Attempt server-side API first
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch('/api/rbac/policies', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: studioId === 'all' ? 'save_global_role' : 'save_studio_role',
          studioId,
          role: payload,
          auditChanges
        })
      });
      if (resp.ok) {
        const json = await resp.json();
        if (json.success) return;
      }
    } catch {
      // Fallback to authenticated Master Admin Firestore write
    }

    if (!db) throw new Error('Firestore is not initialized.');

    if (studioId === 'all') {
      await setDoc(doc(db, 'globalRoles', role.id), payload, { merge: true });
    } else {
      await setDoc(doc(db, 'studios', studioId, 'rbacRoles', role.id), { ...payload, studioId }, { merge: true });
    }

    // Write audit logs
    for (const ch of auditChanges.slice(0, 20)) {
      const logId = `rbac_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      await setDoc(doc(db, 'platformAuditLogs', logId), {
        actingAdmin,
        studioId: studioId === 'all' ? 'global' : studioId,
        targetType: studioId === 'all' ? 'global_role' : role.isCustomRole ? 'custom_role' : 'studio_role',
        targetId: role.id,
        module: ch.module,
        permissionChanged: ch.permissionChanged,
        previousValue: ch.previousValue,
        newValue: ch.newValue,
        timestamp: now
      }).catch(() => {});
    }
  }

  async saveUserOverride(params: {
    studioId: string;
    override: UserPermissionOverrideDoc;
    actingAdmin: string;
    auditChanges?: Array<{ module: string; permissionChanged: string; previousValue: any; newValue: any }>;
  }): Promise<void> {
    const { studioId, override, actingAdmin, auditChanges = [] } = params;
    const now = new Date().toISOString();
    const payload: UserPermissionOverrideDoc = {
      ...override,
      studioId,
      updatedAt: now,
      updatedBy: actingAdmin
    };

    try {
      const headers = await getAuthHeaders();
      const resp = await fetch('/api/rbac/policies', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'save_user_override',
          studioId,
          override: payload,
          auditChanges
        })
      });
      if (resp.ok) {
        const json = await resp.json();
        if (json.success) return;
      }
    } catch {
      // Fallback to Firestore
    }

    if (!db) throw new Error('Firestore is not initialized.');
    await setDoc(doc(db, 'studios', studioId, 'userPermissions', override.uid), payload, { merge: true });

    for (const ch of auditChanges.slice(0, 20)) {
      const logId = `rbac_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      await setDoc(doc(db, 'platformAuditLogs', logId), {
        actingAdmin,
        studioId,
        targetType: 'user_override',
        targetId: override.uid,
        module: ch.module,
        permissionChanged: ch.permissionChanged,
        previousValue: ch.previousValue,
        newValue: ch.newValue,
        timestamp: now
      }).catch(() => {});
    }
  }

  async resetUserOverrides(studioId: string, uid: string, actingAdmin: string): Promise<void> {
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch('/api/rbac/policies', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'reset_user_override', studioId, uid })
      });
      if (resp.ok) {
        const json = await resp.json();
        if (json.success) return;
      }
    } catch {
      // Fallback
    }
    if (!db) return;
    await deleteDoc(doc(db, 'studios', studioId, 'userPermissions', uid));
    const logId = `rbac_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await setDoc(doc(db, 'platformAuditLogs', logId), {
      actingAdmin,
      studioId,
      targetType: 'user_override',
      targetId: uid,
      module: 'all',
      permissionChanged: 'reset_to_role_defaults',
      previousValue: 'custom_overrides',
      newValue: 'inherited',
      timestamp: new Date().toISOString()
    }).catch(() => {});
  }

  async deleteCustomRole(studioId: string, roleId: string, actingAdmin: string): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized.');
    const usersSnap = await getDocs(collection(db, 'users'));
    const assignedCount = usersSnap.docs.filter((d) => {
      const u = d.data() || {};
      return u.studioId === studioId && (u.roleId === roleId || u.role === roleId);
    }).length;

    if (assignedCount > 0) {
      throw new Error(`Cannot delete role "${roleId}": ${assignedCount} user(s) are still assigned to it. Reassign them first.`);
    }

    await deleteDoc(doc(db, 'studios', studioId, 'rbacRoles', roleId));
    const logId = `rbac_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await setDoc(doc(db, 'platformAuditLogs', logId), {
      actingAdmin,
      studioId,
      targetType: 'custom_role',
      targetId: roleId,
      module: 'roles_permissions',
      permissionChanged: 'delete_custom_role',
      previousValue: roleId,
      newValue: 'deleted',
      timestamp: new Date().toISOString()
    }).catch(() => {});
  }

  async assignUserRole(studioId: string, uid: string, newRoleId: string, actingAdmin: string): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized.');
    const now = new Date().toISOString();
    await setDoc(
      doc(db, 'users', uid),
      { roleId: newRoleId, role: newRoleId, updatedAt: now },
      { merge: true }
    );
    await setDoc(
      doc(db, 'studios', studioId, 'members', uid),
      { role: newRoleId, updatedAt: now },
      { merge: true }
    ).catch(() => {});
    const userSnap = await getDoc(doc(db, 'users', uid));
    const empId = userSnap.data()?.employeeId;
    if (empId) {
      await setDoc(
        doc(db, 'studios', studioId, 'employees', empId),
        { roleId: newRoleId, updatedAt: now },
        { merge: true }
      ).catch(() => {});
    }
    const logId = `rbac_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await setDoc(doc(db, 'platformAuditLogs', logId), {
      actingAdmin,
      studioId,
      targetType: 'user_override',
      targetId: uid,
      module: 'roles_permissions',
      permissionChanged: 'assigned_role',
      previousValue: 'previous_role',
      newValue: newRoleId,
      timestamp: now
    }).catch(() => {});
  }
}

export const liveRbacService = new LiveRbacService();
