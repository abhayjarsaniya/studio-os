import { Role, RoleSchema, PermissionModule, PermissionAction, AccessScope, FieldPermissionPolicy } from '../types/schema';
import { TenantStore } from './tenantStore';
import { auditService } from './auditService';
import { PERMISSION_MODULES_CATALOG } from '../types/rbac';

// Helper to generate full module permissions object with all 11 actions and scope
export function createModulePerm(
  actions: { [key in PermissionAction]?: boolean },
  scope: AccessScope = 'all'
) {
  return {
    view: !!actions.view,
    create: !!actions.create,
    edit: !!actions.edit,
    delete: !!actions.delete,
    export: !!actions.export,
    download: !!actions.download,
    share: !!actions.share,
    assign: !!actions.assign,
    approve: !!actions.approve,
    reject: !!actions.reject,
    manageSettings: !!actions.manageSettings,
    scope
  };
}

// Full permissions builder for Studio Owner / Super Admin
function createAllPermissions(scope: AccessScope = 'all') {
  const perms: Record<string, any> = {};
  PERMISSION_MODULES_CATALOG.forEach(m => {
    const actMap: Record<string, boolean> = {};
    m.supportedActions.forEach(a => {
      actMap[a] = true;
    });
    perms[m.id] = createModulePerm(actMap, scope);
  });
  // Backward compatibility keys
  perms.leave = { ...perms.leave, request: true, viewAll: true, approve: true };
  perms.payroll = { ...perms.payroll, manage: true };
  return perms;
}

// Hidden field policy for standard staff (hides all salary & compensation details)
const RESTRICTED_SALARY_FIELDS: Record<string, FieldPermissionPolicy> = {
  salary: {
    monthlySalary: 'hidden',
    dailySalary: 'hidden',
    bankDetails: 'hidden',
    netPayableSalary: 'hidden',
    allowances: 'hidden',
    bonuses: 'hidden',
    deductions: 'hidden'
  },
  payroll: {
    baseSalary: 'hidden',
    netPayable: 'hidden',
    totalGrossPayable: 'hidden'
  }
};

const OPEN_FINANCIAL_FIELDS: Record<string, FieldPermissionPolicy> = {
  salary: {
    monthlySalary: 'editable',
    dailySalary: 'editable',
    bankDetails: 'editable',
    netPayableSalary: 'editable'
  },
  payroll: {
    baseSalary: 'editable',
    netPayable: 'editable',
    totalGrossPayable: 'editable'
  }
};

export const DEFAULT_ROLE_TEMPLATES: Array<Omit<Role, 'id' | 'studioId' | 'createdAt' | 'updatedAt'>> = [
  // 1. Studio Owner
  {
    name: 'Studio Owner',
    description: 'Ultimate studio authority, billing owner, multi-branch director and complete operational controller.',
    isSystem: true,
    color: 'emerald',
    permissions: createAllPermissions('all'),
    fieldPermissions: OPEN_FINANCIAL_FIELDS
  },
  // 2. Super Admin
  {
    name: 'Super Admin',
    description: 'Studio-wide executive administrator. Full operational and financial management access across branches.',
    isSystem: true,
    color: 'purple',
    permissions: createAllPermissions('all'),
    fieldPermissions: OPEN_FINANCIAL_FIELDS
  },
  // 3. Admin
  {
    name: 'Admin',
    description: 'General studio administration, shoot scheduling, crew allocation, client relations and leave approvals.',
    isSystem: true,
    color: 'indigo',
    permissions: {
      ...createAllPermissions('all'),
      salary: createModulePerm({ view: true, export: true }, 'all'),
      payroll: createModulePerm({ view: true, export: true }, 'all'),
      roles: createModulePerm({ view: true, create: true, edit: true, delete: false }, 'all')
    },
    fieldPermissions: OPEN_FINANCIAL_FIELDS
  },
  // 4. Manager
  {
    name: 'Manager',
    description: 'Branch shoot operations, crew coordination and client deliveries. Zero access to team salary & payroll.',
    isSystem: true,
    color: 'blue',
    permissions: {
      dashboard: createModulePerm({ view: true, export: true }, 'branch'),
      events: createModulePerm({ view: true, create: true, edit: true, delete: false, export: true, assign: true, share: true }, 'branch'),
      subEvents: createModulePerm({ view: true, create: true, edit: true, delete: false, export: true, assign: true }, 'branch'),
      customers: createModulePerm({ view: true, create: true, edit: true, delete: false, export: true }, 'branch'),
      team: createModulePerm({ view: true, assign: true }, 'branch'),
      roles: createModulePerm({ view: false }, 'own'),
      departments: createModulePerm({ view: true }, 'all'),
      tasks: createModulePerm({ view: true, create: true, edit: true, delete: false, assign: true, approve: true }, 'branch'),
      calendar: createModulePerm({ view: true, export: true }, 'branch'),
      attendance: createModulePerm({ view: true, create: true, edit: true, export: true }, 'branch'),
      leave: { ...createModulePerm({ view: true, create: true, approve: true, reject: true }, 'branch'), request: true, viewAll: true, approve: true },
      salary: createModulePerm({}, 'own'), // COMPLETELY RESTRICTED
      payroll: createModulePerm({}, 'own'), // COMPLETELY RESTRICTED
      invoices: createModulePerm({ view: true, create: true, edit: true }, 'branch'),
      payments: createModulePerm({ view: true, create: true }, 'branch'),
      expenses: createModulePerm({ view: true, create: true, edit: true, approve: true }, 'branch'),
      equipment: createModulePerm({ view: true, assign: true }, 'branch'),
      inventory: createModulePerm({ view: true, create: true, edit: true }, 'branch'),
      reports: createModulePerm({ view: true, export: true }, 'branch'),
      documents: createModulePerm({ view: true, create: true, edit: true, download: true, share: true }, 'branch'),
      notifications: createModulePerm({ view: true }, 'all'),
      settings: createModulePerm({ view: true }, 'all'),
      branches: createModulePerm({ view: true }, 'all'),
      auditLogs: createModulePerm({ view: false }, 'own')
    },
    fieldPermissions: RESTRICTED_SALARY_FIELDS
  },
  // 5. Photographer
  {
    name: 'Photographer',
    description: 'Lead or assistant shooter. Can view assigned shoots, sub-events, call times and submit leave requests.',
    isSystem: true,
    color: 'cyan',
    permissions: {
      dashboard: createModulePerm({ view: true }, 'assigned'),
      events: createModulePerm({ view: true }, 'assigned'),
      subEvents: createModulePerm({ view: true }, 'assigned'),
      customers: createModulePerm({ view: true }, 'assigned'),
      team: createModulePerm({ view: true }, 'all'),
      roles: createModulePerm({}, 'own'),
      departments: createModulePerm({ view: true }, 'all'),
      tasks: createModulePerm({ view: true, edit: true }, 'assigned'),
      calendar: createModulePerm({ view: true }, 'assigned'),
      attendance: createModulePerm({ view: true, create: true }, 'own'),
      leave: { ...createModulePerm({ view: true, create: true }, 'own'), request: true, viewAll: false, approve: false },
      salary: createModulePerm({}, 'own'), // RESTRICTED
      payroll: createModulePerm({}, 'own'), // RESTRICTED
      invoices: createModulePerm({}, 'own'),
      payments: createModulePerm({}, 'own'),
      expenses: createModulePerm({ view: true, create: true }, 'own'),
      equipment: createModulePerm({ view: true }, 'branch'),
      inventory: createModulePerm({ view: true }, 'branch'),
      reports: createModulePerm({}, 'own'),
      documents: createModulePerm({ view: true, download: true }, 'assigned'),
      notifications: createModulePerm({ view: true }, 'all'),
      settings: createModulePerm({}, 'own'),
      branches: createModulePerm({ view: true }, 'all'),
      auditLogs: createModulePerm({}, 'own')
    },
    fieldPermissions: RESTRICTED_SALARY_FIELDS
  },
  // 6. Videographer
  {
    name: 'Videographer',
    description: 'Cinematographer and drone pilot. Can view assigned shoots, shot-lists and submit daily attendance.',
    isSystem: true,
    color: 'teal',
    permissions: {
      dashboard: createModulePerm({ view: true }, 'assigned'),
      events: createModulePerm({ view: true }, 'assigned'),
      subEvents: createModulePerm({ view: true }, 'assigned'),
      customers: createModulePerm({ view: true }, 'assigned'),
      team: createModulePerm({ view: true }, 'all'),
      roles: createModulePerm({}, 'own'),
      departments: createModulePerm({ view: true }, 'all'),
      tasks: createModulePerm({ view: true, edit: true }, 'assigned'),
      calendar: createModulePerm({ view: true }, 'assigned'),
      attendance: createModulePerm({ view: true, create: true }, 'own'),
      leave: { ...createModulePerm({ view: true, create: true }, 'own'), request: true, viewAll: false, approve: false },
      salary: createModulePerm({}, 'own'), // RESTRICTED
      payroll: createModulePerm({}, 'own'), // RESTRICTED
      invoices: createModulePerm({}, 'own'),
      payments: createModulePerm({}, 'own'),
      expenses: createModulePerm({ view: true, create: true }, 'own'),
      equipment: createModulePerm({ view: true }, 'branch'),
      inventory: createModulePerm({ view: true }, 'branch'),
      reports: createModulePerm({}, 'own'),
      documents: createModulePerm({ view: true, download: true }, 'assigned'),
      notifications: createModulePerm({ view: true }, 'all'),
      settings: createModulePerm({}, 'own'),
      branches: createModulePerm({ view: true }, 'all'),
      auditLogs: createModulePerm({}, 'own')
    },
    fieldPermissions: RESTRICTED_SALARY_FIELDS
  },
  // 7. Photo Editor
  {
    name: 'Photo Editor',
    description: 'Color grading, culling and photo touch-up tasks. Access to assigned tasks and deliverables.',
    isSystem: true,
    color: 'amber',
    permissions: {
      dashboard: createModulePerm({ view: true }, 'assigned'),
      events: createModulePerm({ view: true }, 'assigned'),
      subEvents: createModulePerm({ view: true }, 'assigned'),
      customers: createModulePerm({}, 'own'),
      team: createModulePerm({ view: true }, 'all'),
      roles: createModulePerm({}, 'own'),
      departments: createModulePerm({ view: true }, 'all'),
      tasks: createModulePerm({ view: true, edit: true }, 'assigned'),
      calendar: createModulePerm({ view: true }, 'assigned'),
      attendance: createModulePerm({ view: true, create: true }, 'own'),
      leave: { ...createModulePerm({ view: true, create: true }, 'own'), request: true, viewAll: false, approve: false },
      salary: createModulePerm({}, 'own'), // RESTRICTED
      payroll: createModulePerm({}, 'own'), // RESTRICTED
      invoices: createModulePerm({}, 'own'),
      payments: createModulePerm({}, 'own'),
      expenses: createModulePerm({ view: true, create: true }, 'own'),
      equipment: createModulePerm({}, 'own'),
      inventory: createModulePerm({}, 'own'),
      reports: createModulePerm({}, 'own'),
      documents: createModulePerm({ view: true, download: true }, 'assigned'),
      notifications: createModulePerm({ view: true }, 'all'),
      settings: createModulePerm({}, 'own'),
      branches: createModulePerm({ view: true }, 'all'),
      auditLogs: createModulePerm({}, 'own')
    },
    fieldPermissions: RESTRICTED_SALARY_FIELDS
  },
  // 8. Video Editor
  {
    name: 'Video Editor',
    description: 'Video teaser, trailer, reels and long-format editing. Task timeline management.',
    isSystem: true,
    color: 'orange',
    permissions: {
      dashboard: createModulePerm({ view: true }, 'assigned'),
      events: createModulePerm({ view: true }, 'assigned'),
      subEvents: createModulePerm({ view: true }, 'assigned'),
      customers: createModulePerm({}, 'own'),
      team: createModulePerm({ view: true }, 'all'),
      roles: createModulePerm({}, 'own'),
      departments: createModulePerm({ view: true }, 'all'),
      tasks: createModulePerm({ view: true, edit: true }, 'assigned'),
      calendar: createModulePerm({ view: true }, 'assigned'),
      attendance: createModulePerm({ view: true, create: true }, 'own'),
      leave: { ...createModulePerm({ view: true, create: true }, 'own'), request: true, viewAll: false, approve: false },
      salary: createModulePerm({}, 'own'), // RESTRICTED
      payroll: createModulePerm({}, 'own'), // RESTRICTED
      invoices: createModulePerm({}, 'own'),
      payments: createModulePerm({}, 'own'),
      expenses: createModulePerm({ view: true, create: true }, 'own'),
      equipment: createModulePerm({}, 'own'),
      inventory: createModulePerm({}, 'own'),
      reports: createModulePerm({}, 'own'),
      documents: createModulePerm({ view: true, download: true }, 'assigned'),
      notifications: createModulePerm({ view: true }, 'all'),
      settings: createModulePerm({}, 'own'),
      branches: createModulePerm({ view: true }, 'all'),
      auditLogs: createModulePerm({}, 'own')
    },
    fieldPermissions: RESTRICTED_SALARY_FIELDS
  },
  // 9. Album Designer
  {
    name: 'Album Designer',
    description: 'Album layouts, sheet designs and client proofing revision cycles.',
    isSystem: true,
    color: 'rose',
    permissions: {
      dashboard: createModulePerm({ view: true }, 'assigned'),
      events: createModulePerm({ view: true }, 'assigned'),
      subEvents: createModulePerm({ view: true }, 'assigned'),
      customers: createModulePerm({}, 'own'),
      team: createModulePerm({ view: true }, 'all'),
      roles: createModulePerm({}, 'own'),
      departments: createModulePerm({ view: true }, 'all'),
      tasks: createModulePerm({ view: true, edit: true }, 'assigned'),
      calendar: createModulePerm({ view: true }, 'assigned'),
      attendance: createModulePerm({ view: true, create: true }, 'own'),
      leave: { ...createModulePerm({ view: true, create: true }, 'own'), request: true, viewAll: false, approve: false },
      salary: createModulePerm({}, 'own'), // RESTRICTED
      payroll: createModulePerm({}, 'own'), // RESTRICTED
      invoices: createModulePerm({}, 'own'),
      payments: createModulePerm({}, 'own'),
      expenses: createModulePerm({ view: true, create: true }, 'own'),
      equipment: createModulePerm({}, 'own'),
      inventory: createModulePerm({}, 'own'),
      reports: createModulePerm({}, 'own'),
      documents: createModulePerm({ view: true, download: true }, 'assigned'),
      notifications: createModulePerm({ view: true }, 'all'),
      settings: createModulePerm({}, 'own'),
      branches: createModulePerm({ view: true }, 'all'),
      auditLogs: createModulePerm({}, 'own')
    },
    fieldPermissions: RESTRICTED_SALARY_FIELDS
  },
  // 10. Accountant
  {
    name: 'Accountant',
    description: 'Financial ledgers, client invoices, payment collections, salary profiles and monthly payroll runs.',
    isSystem: true,
    color: 'emerald',
    permissions: {
      dashboard: createModulePerm({ view: true, export: true }, 'all'),
      events: createModulePerm({ view: true }, 'all'),
      subEvents: createModulePerm({ view: true }, 'all'),
      customers: createModulePerm({ view: true, export: true }, 'all'),
      team: createModulePerm({ view: true }, 'all'),
      roles: createModulePerm({ view: false }, 'own'),
      departments: createModulePerm({ view: true }, 'all'),
      tasks: createModulePerm({ view: true }, 'all'),
      calendar: createModulePerm({ view: true }, 'all'),
      attendance: createModulePerm({ view: true, export: true }, 'all'),
      leave: { ...createModulePerm({ view: true, export: true }, 'all'), request: true, viewAll: true, approve: false },
      salary: createModulePerm({ view: true, create: true, edit: true, delete: false, export: true }, 'all'),
      payroll: { ...createModulePerm({ view: true, create: true, edit: true, approve: true, export: true }, 'all'), manage: true },
      invoices: createModulePerm({ view: true, create: true, edit: true, delete: false, export: true, approve: true }, 'all'),
      payments: createModulePerm({ view: true, create: true, edit: true, approve: true, export: true }, 'all'),
      expenses: createModulePerm({ view: true, create: true, edit: true, approve: true, export: true }, 'all'),
      equipment: createModulePerm({ view: false }, 'own'), // No gear checkout needed
      inventory: createModulePerm({ view: true }, 'all'),
      reports: createModulePerm({ view: true, export: true, download: true }, 'all'),
      documents: createModulePerm({ view: true, download: true }, 'all'),
      notifications: createModulePerm({ view: true }, 'all'),
      settings: createModulePerm({ view: false }, 'own'),
      branches: createModulePerm({ view: true }, 'all'),
      auditLogs: createModulePerm({ view: true, export: true }, 'all')
    },
    fieldPermissions: OPEN_FINANCIAL_FIELDS
  },
  // 11. Delivery Manager
  {
    name: 'Delivery Manager',
    description: 'Final client deliveries, cloud drive links, raw-footage dispatches and client feedback handovers.',
    isSystem: true,
    color: 'sky',
    permissions: {
      dashboard: createModulePerm({ view: true }, 'all'),
      events: createModulePerm({ view: true, edit: true }, 'all'),
      subEvents: createModulePerm({ view: true }, 'all'),
      customers: createModulePerm({ view: true, edit: true }, 'all'),
      team: createModulePerm({ view: true }, 'all'),
      roles: createModulePerm({}, 'own'),
      departments: createModulePerm({ view: true }, 'all'),
      tasks: createModulePerm({ view: true, create: true, edit: true, approve: true }, 'all'),
      calendar: createModulePerm({ view: true }, 'all'),
      attendance: createModulePerm({ view: true, create: true }, 'own'),
      leave: { ...createModulePerm({ view: true, create: true }, 'own'), request: true, viewAll: false, approve: false },
      salary: createModulePerm({}, 'own'), // RESTRICTED
      payroll: createModulePerm({}, 'own'), // RESTRICTED
      invoices: createModulePerm({ view: true }, 'all'),
      payments: createModulePerm({ view: true }, 'all'),
      expenses: createModulePerm({ view: true, create: true }, 'own'),
      equipment: createModulePerm({ view: true }, 'all'),
      inventory: createModulePerm({ view: true, create: true, edit: true }, 'all'),
      reports: createModulePerm({ view: true }, 'all'),
      documents: createModulePerm({ view: true, create: true, edit: true, download: true, share: true }, 'all'),
      notifications: createModulePerm({ view: true }, 'all'),
      settings: createModulePerm({}, 'own'),
      branches: createModulePerm({ view: true }, 'all'),
      auditLogs: createModulePerm({}, 'own')
    },
    fieldPermissions: RESTRICTED_SALARY_FIELDS
  },
  // 12. Receptionist
  {
    name: 'Receptionist',
    description: 'Front-desk reception, walk-in inquiries, customer registration, calendar appointments and visitor attendance.',
    isSystem: true,
    color: 'pink',
    permissions: {
      dashboard: createModulePerm({ view: true }, 'branch'),
      events: createModulePerm({ view: true, create: true, edit: true }, 'branch'),
      subEvents: createModulePerm({ view: true, create: true }, 'branch'),
      customers: createModulePerm({ view: true, create: true, edit: true }, 'branch'),
      team: createModulePerm({ view: true }, 'branch'),
      roles: createModulePerm({}, 'own'),
      departments: createModulePerm({ view: true }, 'all'),
      tasks: createModulePerm({ view: true, create: true }, 'branch'),
      calendar: createModulePerm({ view: true }, 'branch'),
      attendance: createModulePerm({ view: true, create: true }, 'branch'),
      leave: { ...createModulePerm({ view: true, create: true }, 'own'), request: true, viewAll: false, approve: false },
      salary: createModulePerm({}, 'own'), // RESTRICTED
      payroll: createModulePerm({}, 'own'), // RESTRICTED
      invoices: createModulePerm({ view: true, create: true }, 'branch'),
      payments: createModulePerm({ view: true, create: true }, 'branch'),
      expenses: createModulePerm({ view: true, create: true }, 'own'),
      equipment: createModulePerm({ view: true }, 'branch'),
      inventory: createModulePerm({ view: true }, 'branch'),
      reports: createModulePerm({}, 'own'),
      documents: createModulePerm({ view: true, create: true, download: true }, 'branch'),
      notifications: createModulePerm({ view: true }, 'all'),
      settings: createModulePerm({}, 'own'),
      branches: createModulePerm({ view: true }, 'all'),
      auditLogs: createModulePerm({}, 'own')
    },
    fieldPermissions: RESTRICTED_SALARY_FIELDS
  },
  // 13. Custom Role
  {
    name: 'Custom Role',
    description: 'Flexible role template for custom studio designations, freelancers and contract staff.',
    isSystem: false,
    color: 'gray',
    permissions: {
      dashboard: createModulePerm({ view: true }, 'assigned'),
      events: createModulePerm({ view: true }, 'assigned'),
      subEvents: createModulePerm({ view: true }, 'assigned'),
      customers: createModulePerm({ view: true }, 'assigned'),
      team: createModulePerm({ view: true }, 'all'),
      roles: createModulePerm({}, 'own'),
      departments: createModulePerm({ view: true }, 'all'),
      tasks: createModulePerm({ view: true, edit: true }, 'assigned'),
      calendar: createModulePerm({ view: true }, 'assigned'),
      attendance: createModulePerm({ view: true, create: true }, 'own'),
      leave: { ...createModulePerm({ view: true, create: true }, 'own'), request: true, viewAll: false, approve: false },
      salary: createModulePerm({}, 'own'),
      payroll: createModulePerm({}, 'own'),
      invoices: createModulePerm({}, 'own'),
      payments: createModulePerm({}, 'own'),
      expenses: createModulePerm({ view: true, create: true }, 'own'),
      equipment: createModulePerm({ view: true }, 'branch'),
      inventory: createModulePerm({ view: true }, 'branch'),
      reports: createModulePerm({}, 'own'),
      documents: createModulePerm({ view: true, download: true }, 'assigned'),
      notifications: createModulePerm({ view: true }, 'all'),
      settings: createModulePerm({}, 'own'),
      branches: createModulePerm({ view: true }, 'all'),
      auditLogs: createModulePerm({}, 'own')
    },
    fieldPermissions: RESTRICTED_SALARY_FIELDS
  }
];

export class RoleService {
  listRoles(studioId: string): Role[] {
    if (!studioId) throw new Error('[roleService.listRoles]: studioId is required');
    const existing = TenantStore.get<Role>(studioId, 'roles');
    if (existing.length === 0) {
      return this.restoreDefaultRoles(studioId);
    }
    return existing;
  }

  getRole(studioId: string, roleId: string): Role | null {
    if (!studioId) throw new Error('[roleService.getRole]: studioId is required');
    const roles = this.listRoles(studioId);
    return roles.find(r => r.id === roleId) || null;
  }

  createRole(
    studioId: string,
    data: Omit<Role, 'id' | 'studioId' | 'createdAt' | 'updatedAt' | 'color'> & { color?: string },
    callerRole?: string
  ): Role {
    if (callerRole && callerRole !== 'master_admin' && callerRole !== 'master_super_admin' && callerRole !== 'MASTER_ADMIN') {
      throw new Error('Unauthorized: Only Master Admin can create, modify, hide, or enable roles and permissions.');
    }
    if (!studioId) throw new Error('[roleService.createRole]: studioId is required');
    if (!data.name || !data.name.trim()) throw new Error('[roleService.createRole]: role name is required');

    const all = this.listRoles(studioId);
    const newRole: Role = {
      color: 'blue',
      ...data,
      id: `role_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      studioId,
      isSystem: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    RoleSchema.parse(newRole);
    TenantStore.set(studioId, 'roles', [...all, newRole]);

    auditService.log(
      studioId,
      'system',
      'CREATE_ROLE',
      'role',
      newRole.id,
      { roleName: newRole.name }
    );

    return newRole;
  }

  updateRole(studioId: string, roleId: string, updates: Partial<Role>, callerRole?: string): Role {
    if (callerRole && callerRole !== 'master_admin' && callerRole !== 'master_super_admin' && callerRole !== 'MASTER_ADMIN') {
      throw new Error('Unauthorized: Only Master Admin can create, modify, hide, or enable roles and permissions.');
    }
    if (!studioId) throw new Error('[roleService.updateRole]: studioId is required');
    const all = this.listRoles(studioId);
    const index = all.findIndex(r => r.id === roleId);
    if (index === -1) throw new Error(`[roleService.updateRole]: Role ${roleId} not found`);

    const existing = all[index];

    // PROTECT STUDIO OWNER: Cannot reduce permissions or alter system status of Studio Owner
    if (existing.name === 'Studio Owner' || (existing.isSystem && existing.id.includes('default_1'))) {
      if (updates.name && updates.name !== 'Studio Owner') {
        throw new Error('Studio Owner role name cannot be modified.');
      }
      if (updates.permissions) {
        // Enforce that Studio Owner always maintains all permissions
        updates.permissions = createAllPermissions('all');
      }
    }

    const updated: Role = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    RoleSchema.parse(updated);
    all[index] = updated;
    TenantStore.set(studioId, 'roles', all);

    auditService.log(
      studioId,
      'system',
      'UPDATE_ROLE',
      'role',
      roleId,
      { updates: Object.keys(updates) }
    );

    return updated;
  }

  deleteRole(studioId: string, roleId: string, callerRole?: string): void {
    if (callerRole && callerRole !== 'master_admin' && callerRole !== 'master_super_admin' && callerRole !== 'MASTER_ADMIN') {
      throw new Error('Unauthorized: Only Master Admin can create, modify, hide, or enable roles and permissions.');
    }
    if (!studioId) throw new Error('[roleService.deleteRole]: studioId is required');
    const all = this.listRoles(studioId);
    const target = all.find(r => r.id === roleId);
    if (!target) return;

    if (target.name === 'Studio Owner') {
      throw new Error('[roleService.deleteRole]: Studio Owner role is protected and cannot be deleted.');
    }

    if (target.isSystem) {
      throw new Error(`[roleService.deleteRole]: System role "${target.name}" cannot be deleted.`);
    }

    // Check if any employees currently assigned this role
    const employees = TenantStore.get<any>(studioId, 'employees');
    const assignedCount = employees.filter(e => e.roleId === roleId || (e.assignedRoleIds && e.assignedRoleIds.includes(roleId))).length;
    if (assignedCount > 0) {
      throw new Error(`[roleService.deleteRole]: Cannot delete role "${target.name}" because it is currently assigned to ${assignedCount} employee(s).`);
    }

    const filtered = all.filter(r => r.id !== roleId);
    TenantStore.set(studioId, 'roles', filtered);

    auditService.log(
      studioId,
      'system',
      'DELETE_ROLE',
      'role',
      roleId,
      { roleName: target.name }
    );
  }

  duplicateRole(studioId: string, roleId: string): Role {
    const original = this.getRole(studioId, roleId);
    if (!original) throw new Error(`Role ${roleId} not found`);

    const { id: _i, studioId: _s, createdAt: _c, updatedAt: _u, ...rest } = original;

    return this.createRole(studioId, {
      ...rest,
      name: `${original.name} (Copy)`,
      isSystem: false
    });
  }

  restoreDefaultRoles(studioId: string): Role[] {
    if (!studioId) throw new Error('[roleService.restoreDefaultRoles]: studioId is required');
    const existing = TenantStore.get<Role>(studioId, 'roles');
    const customRoles = existing.filter(r => !r.isSystem);

    const now = new Date().toISOString();
    const defaults: Role[] = DEFAULT_ROLE_TEMPLATES.map((tmpl, idx) => ({
      ...tmpl,
      id: `role_${studioId}_default_${idx + 1}`,
      studioId,
      createdAt: now,
      updatedAt: now
    }));

    const merged = [...defaults, ...customRoles];
    TenantStore.set(studioId, 'roles', merged);

    auditService.log(
      studioId,
      'system',
      'RESTORE_DEFAULT_ROLES',
      'role',
      'all',
      { count: defaults.length }
    );

    return merged;
  }

  hideRole(studioId: string, roleId: string, callerRole?: string): Role {
    if (callerRole && callerRole !== 'master_admin' && callerRole !== 'master_super_admin' && callerRole !== 'MASTER_ADMIN') {
      throw new Error('Unauthorized: Only Master Admin can create, modify, hide, or enable roles and permissions.');
    }
    const role = this.getRole(studioId, roleId);
    if (!role) throw new Error(`Role ${roleId} not found`);
    if (role.name === 'Studio Owner') throw new Error('Studio Owner role cannot be hidden.');
    return this.updateRole(studioId, roleId, { isHidden: true });
  }

  unhideRole(studioId: string, roleId: string, callerRole?: string): Role {
    if (callerRole && callerRole !== 'master_admin' && callerRole !== 'master_super_admin' && callerRole !== 'MASTER_ADMIN') {
      throw new Error('Unauthorized: Only Master Admin can create, modify, hide, or enable roles and permissions.');
    }
    return this.updateRole(studioId, roleId, { isHidden: false });
  }

  hasPermission(role: Role, module: string, action: string): boolean {
    if (!role || !role.permissions) return false;
    const modulePerms = role.permissions[module];
    if (!modulePerms) return false;
    if (typeof modulePerms[action] === 'boolean') {
      return modulePerms[action];
    }
    // Backward compatibility for legacy custom keys
    if (action === 'view' && modulePerms.view !== undefined) return !!modulePerms.view;
    if (action === 'edit' && modulePerms.edit !== undefined) return !!modulePerms.edit;
    if (action === 'create' && modulePerms.create !== undefined) return !!modulePerms.create;
    if (action === 'delete' && modulePerms.delete !== undefined) return !!modulePerms.delete;
    if (action === 'approve' && modulePerms.approve !== undefined) return !!modulePerms.approve;
    return false;
  }
}

export const roleService = new RoleService();
