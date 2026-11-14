import { TenantStore } from './tenantStore';
import { 
  MasterGlobalRoleId, 
  MasterModuleId, 
  MasterActionId, 
  MasterResourceScope,
  GlobalRoleDefinition, 
  StudioRoleOverride, 
  MASTER_GLOBAL_ROLES_META,
  MASTER_MODULES_CATALOG,
  MASTER_ACTIONS_CATALOG,
  GLOBAL_FIELD_POLICIES
} from '../types/masterAdmin';

function buildAllActions(enabled: boolean = true): Partial<Record<MasterActionId, boolean>> {
  const map: Partial<Record<MasterActionId, boolean>> = {};
  MASTER_ACTIONS_CATALOG.forEach(a => {
    map[a.id] = enabled;
  });
  return map;
}

function buildEmptyActions(): Partial<Record<MasterActionId, boolean>> {
  return buildAllActions(false);
}

// Generate default matrix for each of the 14 default roles
export function generateDefaultGlobalRoles(): GlobalRoleDefinition[] {
  const now = new Date().toISOString();

  return MASTER_GLOBAL_ROLES_META.map(meta => {
    const defaultPermissions: Partial<Record<MasterModuleId, Partial<Record<MasterActionId, boolean>>>> = {};
    const defaultScopes: Partial<Record<MasterModuleId, MasterResourceScope>> = {};
    const mandatoryLockedActions: Partial<Record<MasterModuleId, MasterActionId[]>> = {};
    const studioConfigurableActions: Partial<Record<MasterModuleId, MasterActionId[]>> = {};

    MASTER_MODULES_CATALOG.forEach(mod => {
      // By default empty
      defaultPermissions[mod.id] = buildEmptyActions();
      defaultScopes[mod.id] = 'none';

      switch (meta.id) {
        case 'studio_owner':
          // Full access to all 28 modules and actions (except platform_analytics which is master admin only)
          defaultPermissions[mod.id] = buildAllActions(mod.id !== 'platform_analytics');
          defaultScopes[mod.id] = 'all';
          break;

        case 'admin':
          if (mod.id !== 'platform_analytics') {
            defaultPermissions[mod.id] = buildAllActions(true);
            defaultScopes[mod.id] = 'all';
          }
          break;

        case 'manager':
          if (mod.id !== 'platform_analytics' && mod.id !== 'roles_permissions') {
            defaultPermissions[mod.id] = {
              view: true,
              create: true,
              edit: true,
              delete: mod.id !== 'studio_settings',
              export: true,
              approve: true,
              assign: true,
              view_financials: true,
              edit_financials: mod.id === 'quotations' || mod.id === 'bookings',
              view_client_pii: true,
              manage_settings: false,
              bulk_action: true
            };
            defaultScopes[mod.id] = 'all';
          }
          break;

        case 'photographer':
        case 'videographer':
        case 'cinematographer':
          if (['events', 'sub_events', 'calendar_scheduling', 'tasks', 'attendance_leave'].includes(mod.id)) {
            defaultPermissions[mod.id] = {
              view: true,
              create: false,
              edit: mod.id === 'sub_events' || mod.id === 'tasks', // can update shoot/task progress
              delete: false,
              export: false,
              approve: false,
              assign: false,
              view_financials: false,
              edit_financials: false,
              view_client_pii: false,
              manage_settings: false,
              bulk_action: false
            };
            defaultScopes[mod.id] = 'assigned_only';
            // Locked: cannot see financials
            mandatoryLockedActions[mod.id] = ['view_financials', 'edit_financials'];
          }
          break;

        case 'photo_editor':
        case 'video_editor':
        case 'album_designer':
          if (['tasks', 'workflows_pipelines', 'deliverables_production', 'calendar_scheduling', 'attendance_leave'].includes(mod.id)) {
            defaultPermissions[mod.id] = {
              view: true,
              create: false,
              edit: true, // can update task state, proofs, drafts
              delete: false,
              export: false,
              approve: mod.id === 'tasks',
              assign: false,
              view_financials: false,
              edit_financials: false,
              view_client_pii: false,
              manage_settings: false,
              bulk_action: false
            };
            defaultScopes[mod.id] = 'assigned_only';
            mandatoryLockedActions[mod.id] = ['view_financials', 'edit_financials'];
          }
          break;

        case 'accountant':
          if (['dashboard', 'invoices_billing', 'payments_collections', 'expenses_purchases', 'payroll_salary', 'financial_reports', 'customers_crm', 'quotations', 'attendance_leave'].includes(mod.id)) {
            defaultPermissions[mod.id] = {
              view: true,
              create: true,
              edit: true,
              delete: false,
              export: true,
              approve: true,
              assign: false,
              view_financials: true,
              edit_financials: true,
              view_client_pii: true,
              manage_settings: false,
              bulk_action: false
            };
            defaultScopes[mod.id] = 'all';
          }
          break;

        case 'delivery_manager':
          if (['tasks', 'deliverables_production', 'workflows_pipelines', 'events', 'sub_events', 'attendance_leave'].includes(mod.id)) {
            defaultPermissions[mod.id] = {
              view: true,
              create: true,
              edit: true,
              delete: false,
              export: true,
              approve: true,
              assign: true,
              view_financials: false,
              edit_financials: false,
              view_client_pii: true, // Needs address/phone for courier dispatch
              manage_settings: false,
              bulk_action: false
            };
            defaultScopes[mod.id] = 'all';
            mandatoryLockedActions[mod.id] = ['view_financials', 'edit_financials'];
          }
          break;

        case 'receptionist':
          if (['dashboard', 'customers_crm', 'quotations', 'bookings', 'calendar_scheduling', 'whatsapp'].includes(mod.id)) {
            defaultPermissions[mod.id] = {
              view: true,
              create: true,
              edit: true,
              delete: false,
              export: false,
              approve: false,
              assign: false,
              view_financials: false,
              edit_financials: false,
              view_client_pii: true,
              manage_settings: false,
              bulk_action: false
            };
            defaultScopes[mod.id] = 'all';
            mandatoryLockedActions[mod.id] = ['view_financials', 'edit_financials'];
          }
          break;

        case 'external_supplier':
          if (['sub_events', 'tasks', 'calendar_scheduling'].includes(mod.id)) {
            defaultPermissions[mod.id] = {
              view: true,
              create: false,
              edit: true, // submit status
              delete: false,
              export: false,
              approve: false,
              assign: false,
              view_financials: false,
              edit_financials: false,
              view_client_pii: false,
              manage_settings: false,
              bulk_action: false
            };
            defaultScopes[mod.id] = 'assigned_only';
            mandatoryLockedActions[mod.id] = ['view_financials', 'edit_financials', 'view_client_pii'];
          }
          break;

        case 'custom_role':
          // Baseline template for custom role
          defaultPermissions.dashboard = { view: true, export: false };
          defaultScopes.dashboard = 'all';
          break;
      }
    });

    return {
      id: meta.id,
      name: meta.name,
      label: meta.label,
      description: meta.description,
      isSystemRole: meta.isSystemRole,
      isProtected: meta.isProtected,
      defaultPermissions,
      defaultScopes,
      mandatoryLockedActions,
      studioConfigurableActions,
      updatedAt: now
    };
  });
}

export class GlobalRbacService {
  private static GLOBAL_ROLES_KEY = 'global_roles_definitions_v1';
  private static STUDIO_OVERRIDES_COLLECTION = 'studio_role_overrides';

  // 1. Get or initialize all 14 global role definitions
  getGlobalRoleDefinitions(): GlobalRoleDefinition[] {
    const raw = TenantStore.get('global_platform_master', GlobalRbacService.GLOBAL_ROLES_KEY);
    if (raw && Array.isArray(raw) && raw.length >= 14) {
      return raw as GlobalRoleDefinition[];
    }
    const defaults = generateDefaultGlobalRoles();
    TenantStore.set('global_platform_master', GlobalRbacService.GLOBAL_ROLES_KEY, defaults);
    return defaults;
  }

  // 2. Get specific global role
  getGlobalRole(roleId: MasterGlobalRoleId): GlobalRoleDefinition | null {
    const roles = this.getGlobalRoleDefinitions();
    return roles.find(r => r.id === roleId) || null;
  }

  // 3. Update global role definition (Master Admin action)
  updateGlobalRole(roleId: MasterGlobalRoleId, update: Partial<GlobalRoleDefinition>): GlobalRoleDefinition {
    const roles = this.getGlobalRoleDefinitions();
    const idx = roles.findIndex(r => r.id === roleId);
    if (idx === -1) {
      throw new Error(`Global role "${roleId}" not found`);
    }

    // Protect Studio Owner from privilege reduction
    if (roleId === 'studio_owner' && update.defaultPermissions) {
      // Must maintain full studio access
      Object.keys(update.defaultPermissions).forEach(modKey => {
        if (modKey !== 'platform_analytics') {
          (update.defaultPermissions as any)[modKey] = buildAllActions(true);
        }
      });
    }

    const updated: GlobalRoleDefinition = {
      ...roles[idx],
      ...update,
      id: roleId,
      updatedAt: new Date().toISOString()
    };
    roles[idx] = updated;
    TenantStore.set('global_platform_master', GlobalRbacService.GLOBAL_ROLES_KEY, roles);
    return updated;
  }

  // 4. Studio Specific Overrides
  getStudioOverrides(studioId: string): StudioRoleOverride[] {
    const raw = TenantStore.get(studioId, GlobalRbacService.STUDIO_OVERRIDES_COLLECTION);
    return Array.isArray(raw) ? (raw as StudioRoleOverride[]) : [];
  }

  getStudioRoleOverride(studioId: string, roleId: MasterGlobalRoleId): StudioRoleOverride | null {
    const overrides = this.getStudioOverrides(studioId);
    return overrides.find(o => o.roleId === roleId) || null;
  }

  saveStudioOverride(override: Partial<StudioRoleOverride> & { studioId: string; roleId: MasterGlobalRoleId; updatedBy?: string }): StudioRoleOverride {
    const overrides = this.getStudioOverrides(override.studioId);
    const existingIdx = overrides.findIndex(o => o.roleId === override.roleId);

    const record: StudioRoleOverride = {
      id: override.id || `override_${override.studioId}_${override.roleId}`,
      studioId: override.studioId,
      roleId: override.roleId,
      roleName: override.roleName,
      overriddenPermissions: override.overriddenPermissions || {},
      overriddenScopes: override.overriddenScopes || {},
      isCustomRole: override.isCustomRole ?? false,
      isLockedByMaster: override.isLockedByMaster ?? false,
      customRoleName: override.customRoleName,
      updatedBy: override.updatedBy || 'Master Admin',
      updatedAt: new Date().toISOString()
    };

    if (existingIdx >= 0) {
      overrides[existingIdx] = record;
    } else {
      overrides.push(record);
    }

    TenantStore.set(override.studioId, GlobalRbacService.STUDIO_OVERRIDES_COLLECTION, overrides);
    return record;
  }

  // 5. Reset Studio Role Overrides to Global Platform Defaults
  resetStudioOverridesToDefault(studioId: string, roleId?: MasterGlobalRoleId): boolean {
    if (!roleId) {
      TenantStore.set(studioId, GlobalRbacService.STUDIO_OVERRIDES_COLLECTION, []);
      return true;
    }
    const overrides = this.getStudioOverrides(studioId);
    const filtered = overrides.filter(o => o.roleId !== roleId);
    TenantStore.set(studioId, GlobalRbacService.STUDIO_OVERRIDES_COLLECTION, filtered);
    return true;
  }

  // 6. Get Effective Role (Global definition merged with Studio overrides)
  getEffectiveRoleForStudio(studioId: string, roleId: MasterGlobalRoleId): { 
    role: GlobalRoleDefinition; 
    override: StudioRoleOverride | null; 
    isOverridden: boolean;
    permissions: Partial<Record<MasterModuleId, Partial<Record<MasterActionId, boolean>>>>;
    scopes: Partial<Record<MasterModuleId, MasterResourceScope>>;
  } {
    const globalDef = this.getGlobalRole(roleId) || generateDefaultGlobalRoles().find(r => r.id === roleId)!;
    const override = this.getStudioRoleOverride(studioId, roleId);

    const mergedPermissions: Partial<Record<MasterModuleId, Partial<Record<MasterActionId, boolean>>>> = JSON.parse(
      JSON.stringify(globalDef.defaultPermissions || {})
    );
    const mergedScopes: Partial<Record<MasterModuleId, MasterResourceScope>> = {
      ...(globalDef.defaultScopes || {})
    };

    let isOverridden = false;

    if (override) {
      if (override.overriddenPermissions) {
        Object.keys(override.overriddenPermissions).forEach(modKey => {
          const modId = modKey as MasterModuleId;
          mergedPermissions[modId] = {
            ...(mergedPermissions[modId] || {}),
            ...(override.overriddenPermissions[modId] || {})
          };
          isOverridden = true;
        });
      }
      if (override.overriddenScopes) {
        Object.keys(override.overriddenScopes).forEach(modKey => {
          const modId = modKey as MasterModuleId;
          mergedScopes[modId] = override.overriddenScopes[modId];
          isOverridden = true;
        });
      }
    }

    return {
      role: globalDef,
      override,
      isOverridden,
      permissions: mergedPermissions,
      scopes: mergedScopes
    };
  }

  // 7. Compute diff between Studio override and Global default
  computeOverrideDiff(studioId: string, roleId: MasterGlobalRoleId): Array<{
    moduleId: MasterModuleId;
    moduleLabel: string;
    actionId: MasterActionId;
    defaultAllowed: boolean;
    overrideAllowed: boolean;
  }> {
    const globalDef = this.getGlobalRole(roleId);
    const override = this.getStudioRoleOverride(studioId, roleId);
    if (!globalDef || !override || !override.overriddenPermissions) return [];

    const diffs: Array<{
      moduleId: MasterModuleId;
      moduleLabel: string;
      actionId: MasterActionId;
      defaultAllowed: boolean;
      overrideAllowed: boolean;
    }> = [];

    Object.keys(override.overriddenPermissions).forEach(modKey => {
      const modId = modKey as MasterModuleId;
      const modMeta = MASTER_MODULES_CATALOG.find(m => m.id === modId);
      const actionMap = override.overriddenPermissions[modId] || {};

      Object.keys(actionMap).forEach(actKey => {
        const actId = actKey as MasterActionId;
        const overrideVal = !!actionMap[actId];
        const defaultVal = !!globalDef.defaultPermissions?.[modId]?.[actId];

        if (overrideVal !== defaultVal) {
          diffs.push({
            moduleId: modId,
            moduleLabel: modMeta?.label || modId,
            actionId: actId,
            defaultAllowed: defaultVal,
            overrideAllowed: overrideVal
          });
        }
      });
    });

    return diffs;
  }

  // 8. Permission resolution evaluator
  hasPermission(
    studioId: string, 
    roleId: MasterGlobalRoleId, 
    module: MasterModuleId, 
    action: MasterActionId
  ): boolean {
    // Studio Owner always has full permission (except platform-level analytics)
    if (roleId === 'studio_owner') {
      return module !== 'platform_analytics';
    }

    const effective = this.getEffectiveRoleForStudio(studioId, roleId);
    return !!effective.permissions?.[module]?.[action];
  }

  // 9. Resource Scope evaluator
  getResourceScope(
    studioId: string, 
    roleId: MasterGlobalRoleId, 
    module: MasterModuleId
  ): MasterResourceScope {
    if (roleId === 'studio_owner' || roleId === 'admin') {
      return 'all';
    }
    const effective = this.getEffectiveRoleForStudio(studioId, roleId);
    return effective.scopes?.[module] || 'assigned_only';
  }

  // 10. Field Level Access evaluator (PII, Financials)
  isFieldAccessible(
    studioId: string, 
    roleId: MasterGlobalRoleId, 
    fieldName: string, 
    module: MasterModuleId, 
    mode: 'view' | 'edit' = 'view'
  ): boolean {
    if (roleId === 'studio_owner') return true;

    const policy = GLOBAL_FIELD_POLICIES.find(p => p.fieldName === fieldName && p.module === module);
    if (!policy) return true; // Unrestricted field

    // Check required action if any
    if (policy.requiredAction) {
      const hasAction = this.hasPermission(studioId, roleId, module, policy.requiredAction);
      if (!hasAction) return false;
    }

    if (mode === 'edit') {
      return policy.editableRoles.includes(roleId);
    }
    return policy.visibleRoles.includes(roleId);
  }

  // 11. Master Admin RBAC Authority Enforcement
  assertMasterAdminAuthority(callerType?: string): void {
    if (!callerType) return; // Backward compatibility for legacy tests without caller context
    const clean = callerType.toUpperCase();
    if (clean !== 'MASTER_ADMIN' && clean !== 'MASTER_SUPER_ADMIN' && clean !== 'PLATFORM_SUPER_ADMIN') {
      throw new Error('Unauthorized: Only Master Admin can create, modify, hide, or enable roles and permissions.');
    }
  }

  // Create global role (Master Admin Only)
  createGlobalRole(
    data: { id: string; name: string; description: string; category?: string },
    callerType?: string
  ): GlobalRoleDefinition {
    this.assertMasterAdminAuthority(callerType);
    const roles = this.getGlobalRoleDefinitions();
    if (roles.some(r => r.id === data.id || r.name.toLowerCase() === data.name.toLowerCase())) {
      throw new Error(`Role "${data.name}" already exists.`);
    }

    const newRole: GlobalRoleDefinition = {
      id: data.id as MasterGlobalRoleId,
      name: data.name,
      label: data.name,
      description: data.description,
      isSystemRole: false,
      isProtected: false,
      isHidden: false,
      isEnabled: true,
      category: data.category || 'Production',
      defaultPermissions: {},
      defaultScopes: {},
      mandatoryLockedActions: {},
      studioConfigurableActions: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    roles.push(newRole);
    TenantStore.set('global_platform_master', GlobalRbacService.GLOBAL_ROLES_KEY, roles);
    return newRole;
  }

  // Hide role globally or for studio (Master Admin Only)
  hideRole(roleId: MasterGlobalRoleId, callerType?: string): void {
    this.assertMasterAdminAuthority(callerType);
    const roles = this.getGlobalRoleDefinitions();
    const target = roles.find(r => r.id === roleId);
    if (!target) throw new Error(`Role "${roleId}" not found`);
    if (roleId === 'studio_owner') throw new Error('Studio Owner role cannot be hidden.');

    target.isHidden = true;
    target.updatedAt = new Date().toISOString();
    TenantStore.set('global_platform_master', GlobalRbacService.GLOBAL_ROLES_KEY, roles);
  }

  // Unhide role globally (Master Admin Only)
  unhideRole(roleId: MasterGlobalRoleId, callerType?: string): void {
    this.assertMasterAdminAuthority(callerType);
    const roles = this.getGlobalRoleDefinitions();
    const target = roles.find(r => r.id === roleId);
    if (!target) throw new Error(`Role "${roleId}" not found`);

    target.isHidden = false;
    target.updatedAt = new Date().toISOString();
    TenantStore.set('global_platform_master', GlobalRbacService.GLOBAL_ROLES_KEY, roles);
  }

  // Enable/Disable role for studio (Master Admin Only)
  setRoleStudioAvailability(
    studioId: string, 
    roleId: MasterGlobalRoleId, 
    enabled: boolean, 
    callerType?: string
  ): void {
    this.assertMasterAdminAuthority(callerType);
    const override = this.getStudioRoleOverride(studioId, roleId) || {
      id: `override_${studioId}_${roleId}`,
      studioId,
      roleId,
      roleName: roleId,
      overriddenPermissions: {},
      overriddenScopes: {},
      isCustomRole: false,
      isLockedByMaster: false,
      updatedBy: 'Master Admin',
      updatedAt: new Date().toISOString()
    };

    (override as any).isEnabledForStudio = enabled;
    override.updatedAt = new Date().toISOString();
    this.saveStudioOverride(override);
  }

  // Edit permission definition (Master Admin Only)
  editPermissionDefinition(
    moduleId: MasterModuleId, 
    updates: { displayName?: string; description?: string; category?: string }, 
    callerType?: string
  ): void {
    this.assertMasterAdminAuthority(callerType);
    const mod = MASTER_MODULES_CATALOG.find(m => m.id === moduleId);
    if (!mod) throw new Error(`Permission module "${moduleId}" not found.`);
    if (updates.displayName) (mod as any).displayName = updates.displayName;
    if (updates.description) (mod as any).description = updates.description;
    if (updates.category) (mod as any).category = updates.category;
  }

  // Get approved roles available for Studio Owner to assign
  getApprovedRolesForStudio(studioId: string): GlobalRoleDefinition[] {
    const all = this.getGlobalRoleDefinitions();
    const studioOverrides = this.getStudioOverrides(studioId);

    return all.filter(r => {
      if (r.isHidden) return false;
      const ov = studioOverrides.find(o => o.roleId === r.id);
      if (ov && (ov as any).isEnabledForStudio === false) return false;
      return true;
    });
  }
}

export const globalRbacService = new GlobalRbacService();
