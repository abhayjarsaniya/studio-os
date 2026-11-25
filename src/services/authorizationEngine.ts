import { 
  PermissionModule, 
  PermissionAction, 
  AccessScope, 
  Employee, 
  Role, 
  ApprovalWorkflowType,
  FieldVisibility 
} from '../types/schema';
import { TenantStore } from './tenantStore';
import { roleService } from './roleService';
import { permissionOverrideService } from './permissionOverrideService';
import { PERMISSION_MODULES_CATALOG } from '../types/rbac';
import { liveRbacService } from './liveRbacService';

export interface AuthorizationContext {
  resourceOwnerId?: string;
  assignedMemberIds?: string[];
  branchId?: string;
  departmentId?: string;
  eventId?: string;
}

export class AuthorizationEngine {
  /**
   * Primary authorization check: can an employee perform an action on a module?
   * Evaluation order:
   * 1. Inactive/Suspended status -> Denied
   * 2. Studio Owner bypass -> Always Allowed
   * 3. Explicit Employee Overrides -> Explicit Deny > Explicit Allow (unless expired)
   * 4. Assigned Roles (union of primary and additional roles) with resource scope matching
   * 5. Default -> Denied
   */
  can(
    studioId: string,
    employeeIdOrUid: string,
    module: PermissionModule,
    action: PermissionAction,
    context?: AuthorizationContext
  ): boolean {
    if (!studioId) return false;
    if (!employeeIdOrUid) return false;

    // 0. Live Master Admin RBAC Bundle (real-time Firebase policies)
    const liveBundle = liveRbacService.getActiveBundle();
    if (liveBundle && liveBundle.studioId === studioId) {
      const liveAllowed = liveRbacService.canFromActiveBundle(module, action);
      if (liveAllowed !== null) {
        return liveAllowed;
      }
    }

    // 1. Find employee
    const employees = TenantStore.get<Employee>(studioId, 'employees');
    const employee = employees.find(e => e.id === employeeIdOrUid || e.userId === employeeIdOrUid);

    // If no employee record found, check if it's the Studio Owner root account
    if (!employee) {
      if (employeeIdOrUid === 'user_owner_1' || employeeIdOrUid === 'owner_1' || employeeIdOrUid === 'owner') {
        return true;
      }
      return false;
    }

    // Inactive or suspended employees lose all permissions immediately
    if (employee.employmentStatus === 'inactive' || employee.employmentStatus === 'suspended') {
      return false;
    }

    // Check if employee is Studio Owner role
    if (employee.roleName === 'Studio Owner' || employee.designation?.toLowerCase().includes('owner')) {
      return true;
    }

    // 2. Check Explicit Employee Overrides
    const overrides = permissionOverrideService.listOverrides(studioId, employee.id);
    const now = new Date().toISOString();

    for (const ovr of overrides) {
      if (ovr.module === module && ovr.action === action) {
        // Check expiration
        if (ovr.expiresAt && ovr.expiresAt < now) {
          continue; // expired override
        }

        // Check context constraints on override
        if (ovr.branchId && context?.branchId && ovr.branchId !== context.branchId) {
          continue;
        }
        if (ovr.eventId && context?.eventId && ovr.eventId !== context.eventId) {
          continue;
        }

        // PRECEDENCE 1: Explicit Deny
        if (ovr.granted === false) {
          return false;
        }

        // PRECEDENCE 2: Explicit Allow
        if (ovr.granted === true) {
          return true;
        }
      }
    }

    // 3. Check Assigned Roles
    const allRoles = roleService.listRoles(studioId);
    const roleIdsToEvaluate: string[] = [];

    if (employee.roleId) {
      roleIdsToEvaluate.push(employee.roleId);
    }
    if (employee.assignedRoleIds && Array.isArray(employee.assignedRoleIds)) {
      employee.assignedRoleIds.forEach(id => {
        if (!roleIdsToEvaluate.includes(id)) {
          roleIdsToEvaluate.push(id);
        }
      });
    }

    for (const roleId of roleIdsToEvaluate) {
      const role = allRoles.find(r => r.id === roleId || r.name.toLowerCase() === roleId.toLowerCase());
      if (!role) continue;

      if (role.name === 'Studio Owner') {
        return true;
      }

      const hasAction = roleService.hasPermission(role, module, action);
      if (hasAction) {
        // Action is granted by role. Now evaluate resource scope constraint
        const modulePerms = role.permissions ? role.permissions[module] : null;
        const scope: AccessScope = modulePerms?.scope || 'all';

        if (this.evaluateScope(scope, employee, context)) {
          return true; // Granted by this role
        }
      }
    }

    return false;
  }

  /**
   * Evaluates resource-level scope restrictions
   */
  private evaluateScope(
    scope: AccessScope,
    employee: Employee,
    context?: AuthorizationContext
  ): boolean {
    if (scope === 'all') return true;

    if (!context) {
      // General navigation / list view request without a specific single resource target
      return true;
    }

    if (scope === 'branch') {
      if (context.branchId && employee.assignedBranchId) {
        return context.branchId === employee.assignedBranchId;
      }
      return true;
    }

    if (scope === 'department') {
      if (context.departmentId && employee.department) {
        return context.departmentId === employee.department;
      }
      return true;
    }

    if (scope === 'assigned') {
      if (context.assignedMemberIds && Array.isArray(context.assignedMemberIds)) {
        return context.assignedMemberIds.includes(employee.id) || context.assignedMemberIds.includes(employee.userId || '');
      }
      // If resource has assigned members and employee is not among them
      return false;
    }

    if (scope === 'own') {
      if (context.resourceOwnerId) {
        return context.resourceOwnerId === employee.id || context.resourceOwnerId === employee.userId;
      }
      return false;
    }

    return true;
  }

  /**
   * Check approval permission for specific workflow
   */
  canApprove(studioId: string, employeeId: string, workflowType: ApprovalWorkflowType): boolean {
    const workflowToModuleMap: Record<ApprovalWorkflowType, PermissionModule> = {
      event_cancellation: 'events',
      event_completion: 'events',
      leave_requests: 'leave',
      expense_claims: 'expenses',
      invoice_approval: 'invoices',
      payment_verification: 'payments',
      salary_payment_confirmation: 'payroll',
      document_approval: 'documents'
    };

    const module = workflowToModuleMap[workflowType];
    return this.can(studioId, employeeId, module, 'approve');
  }

  /**
   * Field-level permission sanitizer: strips or masks hidden fields on any object
   */
  filterRecord<T extends Record<string, any>>(
    studioId: string,
    employeeId: string,
    module: PermissionModule,
    record: T
  ): T {
    if (!record || typeof record !== 'object') return record;

    const employees = TenantStore.get<Employee>(studioId, 'employees');
    const employee = employees.find(e => e.id === employeeId || e.userId === employeeId);

    // Studio owner sees all fields
    if (employee?.roleName === 'Studio Owner' || employeeId === 'user_owner_1' || employeeId === 'owner') {
      return record;
    }

    const cloned = { ...record };

    // Standard rule: Salary & Compensation details are strictly hidden from non-finance/non-owner roles
    const isFinanceOrAdmin = employee?.roleName === 'Studio Owner' || 
                             employee?.roleName === 'Super Admin' || 
                             employee?.roleName === 'Accountant';

    if (!isFinanceOrAdmin) {
      if (module === 'salary' || module === 'payroll') {
        // Strip critical compensation fields
        delete (cloned as any).monthlySalary;
        delete (cloned as any).dailySalary;
        delete (cloned as any).bankDetails;
        delete (cloned as any).netPayableSalary;
        delete (cloned as any).baseSalary;
        delete (cloned as any).netPayable;
        delete (cloned as any).totalGrossPayable;
        delete (cloned as any).totalNetPayable;
      }

      if (module === 'team') {
        delete (cloned as any).salaryProfile;
        delete (cloned as any).bankDetails;
      }

      // Customer name & detail privacy for team members
      if (module === 'customers') {
        const rawDigits = ((cloned as any).id || '').replace(/\D/g, '');
        const clientCode = rawDigits.length >= 3 ? rawDigits.slice(-3) : '001';
        (cloned as any).name = `Client #${clientCode}`;
        (cloned as any).email = '••••••••@client.protected';
        (cloned as any).phone = '+91 ••••• •••' + ((cloned as any).phone?.slice(-2) || '00');
        delete (cloned as any).address;
        delete (cloned as any).notes;
        delete (cloned as any).totalSpend;
      }

      // Financial privacy on events
      if (module === 'events') {
        const rawDigits = ((cloned as any).customerId || (cloned as any).id || '').replace(/\D/g, '');
        const clientCode = rawDigits.length >= 3 ? rawDigits.slice(-3) : '001';
        if ((cloned as any).customerName) {
          (cloned as any).customerName = `Client #${clientCode}`;
        }
        if ((cloned as any).customerContact) {
          (cloned as any).customerContact = '+91 ••••• •••' + ((cloned as any).customerContact?.slice(-2) || '00');
        }
        delete (cloned as any).budget;
        delete (cloned as any).totalAmount;
        delete (cloned as any).paidAmount;
      }
    }

    // Role-specific field visibility policy check
    if (employee?.roleId) {
      const role = roleService.getRole(studioId, employee.roleId);
      if (role?.fieldPermissions && role.fieldPermissions[module]) {
        const policy = role.fieldPermissions[module];
        for (const [field, visibility] of Object.entries(policy)) {
          if (visibility === 'hidden') {
            delete (cloned as any)[field];
          }
        }
      }
    }

    return cloned;
  }

  /**
   * Returns a complete matrix of effective permissions for an employee across all 24 modules
   */
  getEffectivePermissions(studioId: string, employeeId: string): Record<PermissionModule, Record<PermissionAction, boolean>> {
    const matrix: any = {};
    PERMISSION_MODULES_CATALOG.forEach(mod => {
      matrix[mod.id] = {};
      const actions: PermissionAction[] = ['view', 'create', 'edit', 'delete', 'export', 'download', 'share', 'assign', 'approve', 'reject', 'manageSettings'];
      actions.forEach(act => {
        matrix[mod.id][act] = this.can(studioId, employeeId, mod.id, act);
      });
    });
    return matrix;
  }
}

export const authorizationEngine = new AuthorizationEngine();
