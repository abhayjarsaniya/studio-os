import { CallerIdentity, getFirebaseAdmin } from './razorpayServer';

export interface ServerPermissionsBundle {
  uid: string;
  studioId: string | null;
  roleId: string;
  isDeactivated: boolean;
  isMasterAdmin: boolean;
  permissions: Record<string, Record<string, boolean>>;
  scopes: Record<string, string>;
  fieldAccess: Record<string, { visible: boolean; editable: boolean }>;
}

const DEFAULT_ALLOWED_ACTIONS = [
  'view',
  'create',
  'edit',
  'delete',
  'export',
  'approve',
  'assign',
  'view_financials',
  'edit_financials',
  'view_client_pii',
  'manage_settings',
  'bulk_action'
];

export async function resolveServerPermissions(
  caller: CallerIdentity,
  requestedStudioId?: string | null
): Promise<ServerPermissionsBundle> {
  if (caller.isMasterAdmin) {
    return {
      uid: caller.uid,
      studioId: requestedStudioId || null,
      roleId: 'master_super_admin',
      isDeactivated: false,
      isMasterAdmin: true,
      permissions: {},
      scopes: {},
      fieldAccess: {}
    };
  }

  const adminCtx = getFirebaseAdmin();
  if (!adminCtx) {
    return {
      uid: caller.uid,
      studioId: requestedStudioId || caller.studioId || null,
      roleId: caller.role || 'studio_owner',
      isDeactivated: false,
      isMasterAdmin: false,
      permissions: {},
      scopes: {},
      fieldAccess: {}
    };
  }

  const userSnap = await adminCtx.db.collection('users').doc(caller.uid).get();
  const userData = userSnap.data() || {};
  const studioId = requestedStudioId || userData.studioId || caller.studioId || null;
  const isDeactivated =
    !userSnap.exists ||
    userData.status === 'deactivated' ||
    userData.status === 'suspended' ||
    userData.isActive === false;

  const rawRole = String(userData.roleId || userData.role || '').toLowerCase();
  const roleId =
    userData.accountType === 'STUDIO_OWNER' || rawRole === 'owner'
      ? 'studio_owner'
      : rawRole || 'photographer';

  if (!studioId || isDeactivated) {
    return {
      uid: caller.uid,
      studioId,
      roleId,
      isDeactivated: true,
      isMasterAdmin: false,
      permissions: {},
      scopes: {},
      fieldAccess: {}
    };
  }

  const [globalRoleSnap, studioRoleSnap, userOvrSnap] = await Promise.all([
    adminCtx.db.collection('globalRoles').doc(roleId).get(),
    adminCtx.db.collection('studios').doc(studioId).collection('rbacRoles').doc(roleId).get(),
    adminCtx.db.collection('studios').doc(studioId).collection('userPermissions').doc(caller.uid).get()
  ]);

  const globalRole = globalRoleSnap.exists ? (globalRoleSnap.data() || {}) : {};
  const studioRole = studioRoleSnap.exists ? (studioRoleSnap.data() || {}) : {};
  const userOvr = userOvrSnap.exists ? (userOvrSnap.data() || {}) : {};

  const allModules = new Set<string>([
    ...Object.keys(globalRole.permissions || {}),
    ...Object.keys(studioRole.permissions || {}),
    ...Object.keys(userOvr.permissions || {})
  ]);

  const permissions: Record<string, Record<string, boolean>> = {};
  const scopes: Record<string, string> = {};

  for (const mod of allModules) {
    if (mod === 'platform_analytics') {
      permissions[mod] = {};
      scopes[mod] = 'none';
      continue;
    }

    const modPerms: Record<string, boolean> = {};
    for (const act of DEFAULT_ALLOWED_ACTIONS) {
      const ovrVal = userOvr.permissions?.[mod]?.[act];
      if (ovrVal === true || ovrVal === false) {
        modPerms[act] = ovrVal;
      } else if (studioRole.permissions?.[mod]?.[act] !== undefined) {
        modPerms[act] = Boolean(studioRole.permissions[mod][act]);
      } else if (globalRole.permissions?.[mod]?.[act] !== undefined) {
        modPerms[act] = Boolean(globalRole.permissions[mod][act]);
      } else {
        modPerms[act] = roleId === 'studio_owner';
      }
    }
    permissions[mod] = modPerms;
    scopes[mod] =
      userOvr.scopes?.[mod] ||
      studioRole.scopes?.[mod] ||
      globalRole.scopes?.[mod] ||
      (roleId === 'studio_owner' ? 'all' : 'assigned_only');
  }

  const fieldAccess: Record<string, { visible: boolean; editable: boolean }> = {};
  const fieldKeys = new Set<string>([
    ...Object.keys(globalRole.fieldAccess || {}),
    ...Object.keys(studioRole.fieldAccess || {}),
    ...Object.keys(userOvr.fieldAccess || {})
  ]);
  for (const fk of fieldKeys) {
    const base = studioRole.fieldAccess?.[fk] || globalRole.fieldAccess?.[fk] || {
      visible: roleId === 'studio_owner',
      editable: roleId === 'studio_owner'
    };
    const ovr = userOvr.fieldAccess?.[fk];
    fieldAccess[fk] = {
      visible: ovr?.visible === true || ovr?.visible === false ? ovr.visible : Boolean(base.visible),
      editable: ovr?.editable === true || ovr?.editable === false ? ovr.editable : Boolean(base.editable)
    };
  }

  return {
    uid: caller.uid,
    studioId,
    roleId,
    isDeactivated: false,
    isMasterAdmin: false,
    permissions,
    scopes,
    fieldAccess
  };
}

export function checkBundlePermission(
  bundle: ServerPermissionsBundle,
  moduleId: string,
  actionId: string
): boolean {
  if (bundle.isMasterAdmin) return true;
  if (bundle.isDeactivated) return false;
  if (moduleId === 'platform_analytics') return false;

  const modPerms = bundle.permissions[moduleId];
  if (!modPerms) {
    // If no explicit policy doc exists yet for studio_owner, default allow; others default deny
    return bundle.roleId === 'studio_owner';
  }
  return Boolean(modPerms[actionId]);
}

export function sanitizeRecordByPermissions<T extends Record<string, any>>(
  record: T,
  moduleId: string,
  bundle: ServerPermissionsBundle
): Partial<T> {
  if (bundle.isMasterAdmin) return record;
  const out: Record<string, any> = { ...record };

  const canViewPii = checkBundlePermission(bundle, moduleId, 'view_client_pii');
  const canViewFin = checkBundlePermission(bundle, moduleId, 'view_financials');

  if (!canViewPii) {
    delete out.phone;
    delete out.mobile;
    delete out.whatsapp;
    delete out.email;
    delete out.address;
  }

  if (!canViewFin) {
    delete out.totalAmount;
    delete out.advancePaid;
    delete out.balanceAmount;
    delete out.amount;
    delete out.budget;
    delete out.monthlySalary;
    delete out.dailySalary;
    delete out.netPayableSalary;
    delete out.profit;
    delete out.revenue;
  }

  // Apply explicit field-level visibility rules
  Object.entries(bundle.fieldAccess).forEach(([key, policy]) => {
    const [mod, field] = key.split('.');
    if (mod === moduleId && !policy.visible) {
      delete out[field];
    }
  });

  return out as Partial<T>;
}
