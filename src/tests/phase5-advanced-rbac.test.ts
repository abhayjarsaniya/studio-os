import { describe, it, expect, beforeEach } from 'vitest';
import { roleService } from '../services/roleService';
import { authorizationEngine } from '../services/authorizationEngine';
import { permissionOverrideService } from '../services/permissionOverrideService';
import { approvalService } from '../services/approvalService';
import { employeeService } from '../services/employeeService';
import { TenantStore } from '../services/tenantStore';
import { Employee, Role } from '../types/schema';

describe('STUDIO OS - Phase 5: Advanced Role & Permission Management (RBAC)', () => {
  const STUDIO_A = 'studio_royal_001';
  const STUDIO_B = 'studio_creative_002';

  beforeEach(() => {
    TenantStore.initializeDefaults();
    roleService.restoreDefaultRoles(STUDIO_A);
    roleService.restoreDefaultRoles(STUDIO_B);
  });

  // Test 1: 13 Default Roles initialization
  it('1. should initialize all 13 standard default roles for a tenant', () => {
    const roles = roleService.listRoles(STUDIO_A);
    expect(roles.length).toBeGreaterThanOrEqual(13);

    const roleNames = roles.map(r => r.name);
    expect(roleNames).toContain('Studio Owner');
    expect(roleNames).toContain('Super Admin');
    expect(roleNames).toContain('Admin');
    expect(roleNames).toContain('Manager');
    expect(roleNames).toContain('Photographer');
    expect(roleNames).toContain('Videographer');
    expect(roleNames).toContain('Photo Editor');
    expect(roleNames).toContain('Video Editor');
    expect(roleNames).toContain('Album Designer');
    expect(roleNames).toContain('Accountant');
    expect(roleNames).toContain('Delivery Manager');
    expect(roleNames).toContain('Receptionist');
    expect(roleNames).toContain('Custom Role');
  });

  // Test 2: Studio Owner protection
  it('2. should protect Studio Owner from deletion and privilege stripping', () => {
    const roles = roleService.listRoles(STUDIO_A);
    const ownerRole = roles.find(r => r.name === 'Studio Owner')!;

    // Cannot delete Studio Owner
    expect(() => roleService.deleteRole(STUDIO_A, ownerRole.id)).toThrowError(/protected and cannot be deleted/);

    // Cannot rename Studio Owner
    expect(() => roleService.updateRole(STUDIO_A, ownerRole.id, { name: 'Ordinary Employee' })).toThrowError(/cannot be modified/);

    // Even if updates attempt to revoke permissions, Studio Owner retains full access
    const updated = roleService.updateRole(STUDIO_A, ownerRole.id, {
      permissions: { events: { view: false } }
    });
    expect(updated.permissions.events.view).toBe(true);
  });

  // Test 3: System roles cannot be deleted
  it('3. should prevent deletion of standard system roles', () => {
    const roles = roleService.listRoles(STUDIO_A);
    const photographerRole = roles.find(r => r.name === 'Photographer')!;
    expect(() => roleService.deleteRole(STUDIO_A, photographerRole.id)).toThrowError(/System role.*cannot be deleted/);
  });

  // Test 4: Custom role creation, duplication, and deletion
  it('4. should support creating, duplicating, and deleting custom roles', () => {
    const customRole = roleService.createRole(STUDIO_A, {
      name: 'Drone Chief',
      description: 'Manages all aerial shoots and drone safety compliance',
      color: 'teal',
      permissions: {
        events: { view: true, scope: 'assigned' },
        equipment: { view: true, assign: true, scope: 'all' }
      }
    });

    expect(customRole.id).toBeDefined();
    expect(customRole.name).toBe('Drone Chief');
    expect(customRole.isSystem).toBe(false);

    // Duplicate
    const duplicate = roleService.duplicateRole(STUDIO_A, customRole.id);
    expect(duplicate.name).toBe('Drone Chief (Copy)');
    expect(duplicate.isSystem).toBe(false);

    // Delete custom role
    roleService.deleteRole(STUDIO_A, duplicate.id);
    expect(roleService.getRole(STUDIO_A, duplicate.id)).toBeNull();
  });

  // Test 5: Cannot delete a role that is currently assigned to employees
  it('5. should reject deleting a role that is actively assigned to an employee', () => {
    const customRole = roleService.createRole(STUDIO_A, {
      name: 'Temporary Intern',
      permissions: { events: { view: true } }
    });

    // Create employee with this role
    employeeService.createEmployee(STUDIO_A, {
      fullName: 'Rohit Sharma',
      email: 'rohit.intern@royalstudios.in',
      phone: '+91 99988 77766',
      joiningDate: '2026-10-01',
      department: 'Photography',
      designation: 'Intern',
      roleId: customRole.id,
      roleName: customRole.name
    });

    expect(() => roleService.deleteRole(STUDIO_A, customRole.id)).toThrowError(/currently assigned to 1 employee/);
  });

  // Test 6: Restore default roles resets standards while preserving custom roles
  it('6. should restore 13 default roles while keeping user-created custom roles', () => {
    const customRole = roleService.createRole(STUDIO_A, {
      name: 'Steadicam Operator',
      permissions: { events: { view: true } }
    });

    const restored = roleService.restoreDefaultRoles(STUDIO_A);
    const names = restored.map(r => r.name);
    expect(names).toContain('Studio Owner');
    expect(names).toContain('Photographer');
    expect(names).toContain('Steadicam Operator'); // Custom preserved!
  });

  // Test 7: Photographer scope 'assigned'
  it('7. should enforce assigned-only access scope for Photographer role', () => {
    const roles = roleService.listRoles(STUDIO_A);
    const photoRole = roles.find(r => r.name === 'Photographer')!;

    const photoEmp = employeeService.createEmployee(STUDIO_A, {
      fullName: 'Kunal Verma',
      email: 'kunal.photo@royalstudios.in',
      phone: '+91 98888 11111',
      joiningDate: '2026-01-10',
      department: 'Photography',
      designation: 'Shooter',
      roleId: photoRole.id,
      roleName: photoRole.name
    });

    // When assigned to shoot -> Allowed
    const canViewAssigned = authorizationEngine.can(STUDIO_A, photoEmp.id, 'events', 'view', {
      assignedMemberIds: [photoEmp.id, 'emp_other']
    });
    expect(canViewAssigned).toBe(true);

    // When NOT assigned to shoot -> Denied!
    const canViewUnassigned = authorizationEngine.can(STUDIO_A, photoEmp.id, 'events', 'view', {
      assignedMemberIds: ['emp_other_1', 'emp_other_2']
    });
    expect(canViewUnassigned).toBe(false);
  });

  // Test 8: Manager role can manage branch events and approve leave, but salary is strictly false
  it('8. should allow Manager to approve leave but strictly hide salary & payroll', () => {
    const roles = roleService.listRoles(STUDIO_A);
    const managerRole = roles.find(r => r.name === 'Manager')!;

    const managerEmp = employeeService.createEmployee(STUDIO_A, {
      fullName: 'Vikram Rajput',
      email: 'vikram.manager@royalstudios.in',
      phone: '+91 97777 22222',
      joiningDate: '2025-06-01',
      department: 'Operations',
      designation: 'Studio Operations Manager',
      roleId: managerRole.id,
      roleName: managerRole.name,
      assignedBranchId: 'branch_royal_main'
    });

    // Leave approval allowed
    expect(authorizationEngine.can(STUDIO_A, managerEmp.id, 'leave', 'approve')).toBe(true);

    // Salary & Payroll strictly prohibited!
    expect(authorizationEngine.can(STUDIO_A, managerEmp.id, 'salary', 'view')).toBe(false);
    expect(authorizationEngine.can(STUDIO_A, managerEmp.id, 'salary', 'edit')).toBe(false);
    expect(authorizationEngine.can(STUDIO_A, managerEmp.id, 'payroll', 'view')).toBe(false);
  });

  // Test 9: Accountant role has financial access but no equipment assignment
  it('9. should grant Accountant salary and invoice access but restrict equipment checkout', () => {
    const roles = roleService.listRoles(STUDIO_A);
    const accountantRole = roles.find(r => r.name === 'Accountant')!;

    const accountantEmp = employeeService.createEmployee(STUDIO_A, {
      fullName: 'Meera Shah',
      email: 'meera.accounts@royalstudios.in',
      phone: '+91 96666 33333',
      joiningDate: '2025-08-01',
      department: 'Accounts',
      designation: 'Senior Accountant',
      roleId: accountantRole.id,
      roleName: accountantRole.name
    });

    expect(authorizationEngine.can(STUDIO_A, accountantEmp.id, 'salary', 'view')).toBe(true);
    expect(authorizationEngine.can(STUDIO_A, accountantEmp.id, 'salary', 'edit')).toBe(true);
    expect(authorizationEngine.can(STUDIO_A, accountantEmp.id, 'invoices', 'create')).toBe(true);
    expect(authorizationEngine.can(STUDIO_A, accountantEmp.id, 'payroll', 'approve')).toBe(true);

    // Equipment is not enabled for accountant
    expect(authorizationEngine.can(STUDIO_A, accountantEmp.id, 'equipment', 'view')).toBe(false);
  });

  // Test 10: Receptionist front-desk privileges and boundaries
  it('10. should allow Receptionist to manage customer CRM and calendar but block salary and roles', () => {
    const roles = roleService.listRoles(STUDIO_A);
    const recRole = roles.find(r => r.name === 'Receptionist')!;

    const recEmp = employeeService.createEmployee(STUDIO_A, {
      fullName: 'Pooja Dave',
      email: 'pooja.reception@royalstudios.in',
      phone: '+91 95555 44444',
      joiningDate: '2026-03-01',
      department: 'Client Relations',
      designation: 'Receptionist',
      roleId: recRole.id,
      roleName: recRole.name
    });

    expect(authorizationEngine.can(STUDIO_A, recEmp.id, 'customers', 'create')).toBe(true);
    expect(authorizationEngine.can(STUDIO_A, recEmp.id, 'calendar', 'view')).toBe(true);
    expect(authorizationEngine.can(STUDIO_A, recEmp.id, 'events', 'create')).toBe(true);

    // Blocked
    expect(authorizationEngine.can(STUDIO_A, recEmp.id, 'salary', 'view')).toBe(false);
    expect(authorizationEngine.can(STUDIO_A, recEmp.id, 'roles', 'view')).toBe(false);
  });

  // Test 11: Multi-role aggregation
  it('11. should aggregate permissions across multiple assigned roles', () => {
    const roles = roleService.listRoles(STUDIO_A);
    const photoRole = roles.find(r => r.name === 'Photographer')!;
    const editorRole = roles.find(r => r.name === 'Photo Editor')!;

    // Employee has primary role Photographer, and secondary role Photo Editor
    const multiRoleEmp = employeeService.createEmployee(STUDIO_A, {
      fullName: 'Aakash Mehta',
      email: 'aakash.hybrid@royalstudios.in',
      phone: '+91 94444 55555',
      joiningDate: '2026-02-01',
      department: 'Creative',
      designation: 'Photographer & Colorist',
      roleId: photoRole.id,
      roleName: photoRole.name,
      assignedRoleIds: [editorRole.id]
    });

    // Photographer grants subEvents view
    expect(authorizationEngine.can(STUDIO_A, multiRoleEmp.id, 'subEvents', 'view', {
      assignedMemberIds: [multiRoleEmp.id]
    })).toBe(true);

    // Photo Editor grants tasks edit
    expect(authorizationEngine.can(STUDIO_A, multiRoleEmp.id, 'tasks', 'edit', {
      assignedMemberIds: [multiRoleEmp.id]
    })).toBe(true);
  });

  // Test 12: Explicit Deny Override takes precedence over Role Grant
  it('12. should strictly enforce explicit deny override over role permissions', () => {
    const roles = roleService.listRoles(STUDIO_A);
    const adminRole = roles.find(r => r.name === 'Admin')!;

    const adminEmp = employeeService.createEmployee(STUDIO_A, {
      fullName: 'Sanjay Rawat',
      email: 'sanjay.admin@royalstudios.in',
      phone: '+91 93333 66666',
      joiningDate: '2025-01-01',
      department: 'Administration',
      designation: 'Studio Admin',
      roleId: adminRole.id,
      roleName: adminRole.name
    });

    // Admin initially has delete permission on events
    expect(authorizationEngine.can(STUDIO_A, adminEmp.id, 'events', 'delete')).toBe(true);

    // Apply explicit deny override
    permissionOverrideService.createOverride(STUDIO_A, {
      employeeId: adminEmp.id,
      module: 'events',
      action: 'delete',
      granted: false, // EXPLICIT DENY
      reason: 'Safety lock on event deletion'
    });

    // Now must be DENIED!
    expect(authorizationEngine.can(STUDIO_A, adminEmp.id, 'events', 'delete')).toBe(false);
  });

  // Test 13: Explicit Allow Override grants access where role does not
  it('13. should allow employee access via explicit grant override even if role does not permit it', () => {
    const roles = roleService.listRoles(STUDIO_A);
    const photoRole = roles.find(r => r.name === 'Photographer')!;

    const photoEmp = employeeService.createEmployee(STUDIO_A, {
      fullName: 'Varun Nair',
      email: 'varun.photo@royalstudios.in',
      phone: '+91 92222 77777',
      joiningDate: '2026-04-01',
      department: 'Photography',
      designation: 'Junior Shooter',
      roleId: photoRole.id,
      roleName: photoRole.name
    });

    // Photographer does not have event creation permission
    expect(authorizationEngine.can(STUDIO_A, photoEmp.id, 'events', 'create')).toBe(false);

    // Grant explicit override
    permissionOverrideService.createOverride(STUDIO_A, {
      employeeId: photoEmp.id,
      module: 'events',
      action: 'create',
      granted: true,
      reason: 'Allowed to log emergency client bookings'
    });

    expect(authorizationEngine.can(STUDIO_A, photoEmp.id, 'events', 'create')).toBe(true);
  });

  // Test 14: Temporary Override Expiration
  it('14. should ignore expired permission overrides', () => {
    const roles = roleService.listRoles(STUDIO_A);
    const photoRole = roles.find(r => r.name === 'Photographer')!;

    const photoEmp = employeeService.createEmployee(STUDIO_A, {
      fullName: 'Devansh Joshi',
      email: 'devansh.photo@royalstudios.in',
      phone: '+91 91111 88888',
      joiningDate: '2026-05-01',
      department: 'Photography',
      designation: 'Photographer',
      roleId: photoRole.id,
      roleName: photoRole.name
    });

    // Create override that expired 1 hour ago
    const pastTime = new Date(Date.now() - 3600 * 1000).toISOString();
    permissionOverrideService.createOverride(STUDIO_A, {
      employeeId: photoEmp.id,
      module: 'expenses',
      action: 'approve',
      granted: true,
      expiresAt: pastTime
    });

    // Must be false because override expired
    expect(authorizationEngine.can(STUDIO_A, photoEmp.id, 'expenses', 'approve')).toBe(false);
  });

  // Test 15: Field-Level Data Masking for ordinary employees
  it('15. should strip salary and compensation details when ordinary employee queries records', () => {
    const roles = roleService.listRoles(STUDIO_A);
    const photoRole = roles.find(r => r.name === 'Photographer')!;

    const photoEmp = employeeService.createEmployee(STUDIO_A, {
      fullName: 'Harish Patel',
      email: 'harish.photo@royalstudios.in',
      phone: '+91 90000 99999',
      joiningDate: '2026-06-01',
      department: 'Photography',
      designation: 'Shooter',
      roleId: photoRole.id,
      roleName: photoRole.name
    });

    const sensitiveSalaryRecord = {
      id: 'sal_101',
      employeeId: 'emp_peer_1',
      employeeName: 'Peer Employee',
      monthlySalary: 75000,
      dailySalary: 2500,
      netPayableSalary: 72000,
      bankDetails: {
        accountNumber: '1234567890',
        ifscCode: 'HDFC0001234'
      }
    };

    const sanitized = authorizationEngine.filterRecord(
      STUDIO_A,
      photoEmp.id,
      'salary',
      sensitiveSalaryRecord
    );

    expect(sanitized.id).toBe('sal_101');
    expect(sanitized.employeeName).toBe('Peer Employee');
    expect((sanitized as any).monthlySalary).toBeUndefined();
    expect((sanitized as any).dailySalary).toBeUndefined();
    expect((sanitized as any).netPayableSalary).toBeUndefined();
    expect((sanitized as any).bankDetails).toBeUndefined();
  });

  // Test 16: Inactive employees lose all permissions immediately
  it('16. should revoke all permissions immediately for inactive or suspended employees', () => {
    const roles = roleService.listRoles(STUDIO_A);
    const adminRole = roles.find(r => r.name === 'Admin')!;

    const emp = employeeService.createEmployee(STUDIO_A, {
      fullName: 'Suspended Staff',
      email: 'suspended@royalstudios.in',
      phone: '+91 91234 56789',
      joiningDate: '2025-01-01',
      department: 'Operations',
      designation: 'Coordinator',
      roleId: adminRole.id,
      roleName: adminRole.name
    });

    // Active -> permitted
    expect(authorizationEngine.can(STUDIO_A, emp.id, 'events', 'view')).toBe(true);

    // Deactivate
    employeeService.setEmploymentStatus(STUDIO_A, emp.id, 'suspended');

    // Suspended -> denied immediately
    expect(authorizationEngine.can(STUDIO_A, emp.id, 'events', 'view')).toBe(false);
    expect(authorizationEngine.can(STUDIO_A, emp.id, 'dashboard', 'view')).toBe(false);
  });

  // Test 17: Approval Workflow operations
  it('17. should submit, approve, and track approval requests with immutable history', () => {
    const request = approvalService.submitRequest(STUDIO_A, {
      workflowType: 'expense_claims',
      entityType: 'expense',
      entityId: 'exp_outstation_001',
      entityTitle: 'Outstation Hotel & Travel Claim - Udaipur Shoot (₹14,500)',
      requestedBy: 'emp_shooter_1',
      requestedByName: 'Rahul Verma',
      details: { amount: 14500, category: 'Travel & Stay' }
    });

    expect(request.id).toBeDefined();
    expect(request.status).toBe('pending');

    // List pending
    const pendingList = approvalService.listRequests(STUDIO_A, { status: 'pending' });
    expect(pendingList.length).toBeGreaterThan(0);
    expect(pendingList[0].id).toBe(request.id);

    // Approve
    const approved = approvalService.approveRequest(
      STUDIO_A,
      request.id,
      'emp_owner_1',
      'Studio Director',
      'Approved after verifying hotel tax invoice receipts'
    );
    expect(approved.status).toBe('approved');
    expect(approved.reviewedByName).toBe('Studio Director');

    // History check
    const history = approvalService.listHistory(STUDIO_A, request.id);
    expect(history.length).toBe(2); // submitted + approved
    expect(history[0].action).toBe('approved');
    expect(history[1].action).toBe('submitted');
  });

  // Test 18: Multi-Tenant RBAC Isolation
  it('18. should strictly isolate roles, overrides, and approvals between Studio A and Studio B', () => {
    // Custom role created in Studio A
    const customRoleA = roleService.createRole(STUDIO_A, {
      name: 'Studio A Exclusive Colorist',
      permissions: { tasks: { view: true, edit: true } }
    });

    // Must NOT exist in Studio B
    const rolesB = roleService.listRoles(STUDIO_B);
    expect(rolesB.find(r => r.name === 'Studio A Exclusive Colorist')).toBeUndefined();

    // Approval request in Studio A
    const reqA = approvalService.submitRequest(STUDIO_A, {
      workflowType: 'event_cancellation',
      entityType: 'event',
      entityId: 'evt_a_999',
      entityTitle: 'Client Wedding Postponement',
      requestedBy: 'emp_a_1',
      requestedByName: 'Manager A'
    });

    // Studio B must see zero requests from Studio A
    const reqsB = approvalService.listRequests(STUDIO_B);
    expect(reqsB.find(r => r.id === reqA.id)).toBeUndefined();
  });
});
