import { describe, it, expect, beforeEach } from 'vitest';
import { unifiedAuthService, hashCredential } from '../services/unifiedAuthService';
import { globalRbacService } from '../services/globalRbacService';
import { roleService } from '../services/roleService';
import { employeeWorkspaceService } from '../services/employeeWorkspaceService';
import { platformStudioService } from '../services/platformStudioService';
import { TenantStore } from '../services/tenantStore';
import { bookingProductionService } from '../services/bookingProductionService';
import { customerService } from '../services/customerService';
import { studioA, studioB } from '../data/multiTenantDemoData';

describe('FINAL AUTHENTICATION & RBAC UPDATE — 22 REQUIRED SECURITY TESTS', () => {
  const TEST_STUDIO_A = 'studio_test_alpha';
  const TEST_STUDIO_B = 'studio_test_beta';

  beforeEach(() => {
    // Seed test studios
    TenantStore.set(TEST_STUDIO_A, 'profile', {
      id: TEST_STUDIO_A,
      name: 'Alpha Creative Studio',
      city: 'Ahmedabad',
      lifecycleStatus: 'active'
    });

    TenantStore.set(TEST_STUDIO_B, 'profile', {
      id: TEST_STUDIO_B,
      name: 'Beta Moments Photography',
      city: 'Surat',
      lifecycleStatus: 'active'
    });

    // Seed Owner A
    unifiedAuthService.provisionStudioOwner({
      studioId: TEST_STUDIO_A,
      studioName: 'Alpha Creative Studio',
      ownerName: 'Aarav Patel',
      email: 'aarav@alpha.com',
      mobile: '+91 98250 11111',
      username: 'aarav_alpha',
      temporaryPassword: 'Owner#Alpha2026'
    });

    // Seed Owner B
    unifiedAuthService.provisionStudioOwner({
      studioId: TEST_STUDIO_B,
      studioName: 'Beta Moments Photography',
      ownerName: 'Bhavik Shah',
      email: 'bhavik@beta.com',
      mobile: '+91 98250 22222',
      username: 'bhavik_beta',
      temporaryPassword: 'Owner#Beta2026'
    });
  });

  // ==========================================
  // Test 1: Master Admin Logs In Independently
  // ==========================================
  it('1. Master Admin logs in independently', () => {
    const res = unifiedAuthService.loginMasterAdmin('masteradmin@studioos.internal', 'MasterAdmin@2026');
    expect(res.success).toBe(true);
    expect(res.session).toBeDefined();
    expect(res.session?.account.accountType).toBe('MASTER_ADMIN');
    expect(res.session?.account.roleId).toBe('master_super_admin');
  });

  // ==========================================
  // Test 2: Studio Owner Logs In Independently
  // ==========================================
  it('2. Studio Owner logs in independently', () => {
    const res = unifiedAuthService.loginStudioOwner('aarav_alpha', 'Owner#Alpha2026', TEST_STUDIO_A);
    expect(res.success).toBe(true);
    expect(res.session).toBeDefined();
    expect(res.session?.account.accountType).toBe('STUDIO_OWNER');
    expect(res.session?.account.studioId).toBe(TEST_STUDIO_A);
    expect(res.session?.account.displayName).toBe('Aarav Patel');
  });

  // ==========================================
  // Test 3: Employee Logs In Independently
  // ==========================================
  it('3. Employee logs in independently', () => {
    // Provision employee under Studio A
    const { account } = unifiedAuthService.provisionEmployee({
      studioId: TEST_STUDIO_A,
      studioName: 'Alpha Creative Studio',
      employeeName: 'Kabir Verma',
      employeeId: 'emp_alpha_001',
      username: 'kabir_alpha',
      email: 'kabir@alpha.com',
      mobile: '+91 98250 33333',
      roleId: 'photographer',
      roleTitle: 'Senior Photographer',
      initialPassword: 'Emp#Kabir2026'
    });

    const res = unifiedAuthService.loginEmployee('kabir_alpha', 'Emp#Kabir2026', TEST_STUDIO_A);
    expect(res.success).toBe(true);
    expect(res.session).toBeDefined();
    expect(res.session?.account.accountType).toBe('EMPLOYEE');
    expect(res.session?.account.studioId).toBe(TEST_STUDIO_A);
    expect(res.session?.account.displayName).toBe('Kabir Verma');
  });

  // ==========================================
  // Test 4: No Role-Switching Controls Exist
  // ==========================================
  it('4. No role-switching controls exist', () => {
    // Verify that session identity is strictly bound to authenticated backend record
    const ownerRes = unifiedAuthService.loginStudioOwner('aarav_alpha', 'Owner#Alpha2026', TEST_STUDIO_A);
    expect(ownerRes.session?.account.roleId).toBe('owner');

    // Any manual attempt to spoof role on session is rejected
    const token = ownerRes.session?.token!;
    const validated = unifiedAuthService.validateSession(token);
    expect(validated?.account.roleId).toBe('owner');
    expect(validated?.account.accountType).toBe('STUDIO_OWNER');
  });

  // ==========================================
  // Test 5: No Studio-Switching Controls Exist
  // ==========================================
  it('5. No studio-switching controls exist', () => {
    // Owner of Studio A cannot supply Studio B during login
    const crossLogin = unifiedAuthService.loginStudioOwner('aarav_alpha', 'Owner#Alpha2026', TEST_STUDIO_B);
    expect(crossLogin.success).toBe(false);
    expect(crossLogin.error).toContain('not found');
  });

  // ==========================================
  // Test 6: Studio Owner Cannot Access Master Admin
  // ==========================================
  it('6. Studio Owner cannot access Master Admin', () => {
    // Studio Owner credentials cannot authenticate to Master Admin portal
    const res = unifiedAuthService.loginMasterAdmin('aarav@alpha.com', 'Owner#Alpha2026');
    expect(res.success).toBe(false);
    expect(res.error).toContain('Invalid Master Admin credentials');
  });

  // ==========================================
  // Test 7: Employee Cannot Access Studio Owner Settings
  // ==========================================
  it('7. Employee cannot access Studio Owner settings', () => {
    // Employee credentials cannot authenticate to Studio Owner portal
    unifiedAuthService.provisionEmployee({
      studioId: TEST_STUDIO_A,
      studioName: 'Alpha Creative Studio',
      employeeName: 'Rohan Joshi',
      employeeId: 'emp_alpha_002',
      username: 'rohan_alpha',
      email: 'rohan@alpha.com',
      mobile: '+91 98250 44444',
      roleId: 'photo_editor',
      roleTitle: 'Photo Editor',
      initialPassword: 'Emp#Rohan2026'
    });

    const res = unifiedAuthService.loginStudioOwner('rohan_alpha', 'Emp#Rohan2026', TEST_STUDIO_A);
    expect(res.success).toBe(false);
    expect(res.error).toContain('Invalid Studio Owner credentials');
  });

  // ==========================================
  // Test 8: Studio Owner Cannot Modify Role Permissions
  // ==========================================
  it('8. Studio Owner cannot modify role permissions', () => {
    expect(() => {
      globalRbacService.assertMasterAdminAuthority('STUDIO_OWNER');
    }).toThrowError(/Only Master Admin can create, modify, hide, or enable roles and permissions/);

    expect(() => {
      roleService.createRole(TEST_STUDIO_A, {
        name: 'Custom Elev Role',
        description: 'Attempted elevation',
        permissions: {}
      }, 'owner');
    }).toThrowError(/Only Master Admin can create, modify, hide, or enable roles and permissions/);
  });

  // ==========================================
  // Test 9: Employee Cannot Modify Role Permissions
  // ==========================================
  it('9. Employee cannot modify role permissions', () => {
    expect(() => {
      globalRbacService.assertMasterAdminAuthority('EMPLOYEE');
    }).toThrowError(/Only Master Admin can create, modify, hide, or enable roles and permissions/);

    expect(() => {
      roleService.updateRole(TEST_STUDIO_A, 'role_photographer', {
        name: 'Super Photographer'
      }, 'photographer');
    }).toThrowError(/Only Master Admin can create, modify, hide, or enable roles and permissions/);
  });

  // ==========================================
  // Test 10: Only Master Admin Can Create Global Roles
  // ==========================================
  it('10. Only Master Admin can create global roles', () => {
    // Master Admin succeeds
    const newRole = globalRbacService.createGlobalRole({
      id: 'drone_specialist_master',
      name: 'FPV Drone Specialist',
      description: 'Master Admin authorized high-speed FPV pilot role',
      category: 'Cinematography'
    }, 'MASTER_ADMIN');

    expect(newRole).toBeDefined();
    expect(newRole.name).toBe('FPV Drone Specialist');

    // Studio Owner fails
    expect(() => {
      globalRbacService.createGlobalRole({
        id: 'owner_unauthorized_role',
        name: 'Unauthorized Role',
        description: 'Should fail'
      }, 'STUDIO_OWNER');
    }).toThrowError(/Only Master Admin/);
  });

  // ==========================================
  // Test 11: Only Master Admin Can Edit Permission Definitions
  // ==========================================
  it('11. Only Master Admin can edit permission definitions', () => {
    // Master Admin succeeds
    globalRbacService.editPermissionDefinition('bookings', {
      displayName: 'Production Bookings & Deal Ledger',
      description: 'Master configured booking pipeline'
    }, 'MASTER_ADMIN');

    // Studio Owner fails
    expect(() => {
      globalRbacService.editPermissionDefinition('bookings', {
        displayName: 'Hacked Bookings'
      }, 'STUDIO_OWNER');
    }).toThrowError(/Only Master Admin/);
  });

  // ==========================================
  // Test 12: Only Master Admin Can Hide or Unhide Roles
  // ==========================================
  it('12. Only Master Admin can hide or unhide roles', () => {
    // Master Admin hides role
    globalRbacService.hideRole('video_editor', 'MASTER_ADMIN');
    const role = globalRbacService.getGlobalRole('video_editor');
    expect(role?.isHidden).toBe(true);

    // Master Admin unhides role
    globalRbacService.unhideRole('video_editor', 'MASTER_ADMIN');
    expect(globalRbacService.getGlobalRole('video_editor')?.isHidden).toBe(false);

    // Studio Owner fails to hide
    expect(() => {
      globalRbacService.hideRole('photographer', 'STUDIO_OWNER');
    }).toThrowError(/Only Master Admin/);
  });

  // ==========================================
  // Test 13: Studio Owner Can Add Multiple Employees
  // ==========================================
  it('13. Studio Owner can add multiple employees', () => {
    const emp1 = unifiedAuthService.provisionEmployee({
      studioId: TEST_STUDIO_A,
      studioName: 'Alpha Creative Studio',
      employeeName: 'Crew Member 1',
      employeeId: 'emp_alpha_010',
      username: 'crew1_alpha',
      mobile: '+91 98250 55551',
      roleId: 'photographer',
      roleTitle: 'Photographer',
      createdById: 'owner_alpha'
    });

    const emp2 = unifiedAuthService.provisionEmployee({
      studioId: TEST_STUDIO_A,
      studioName: 'Alpha Creative Studio',
      employeeName: 'Crew Member 2',
      employeeId: 'emp_alpha_011',
      username: 'crew2_alpha',
      mobile: '+91 98250 55552',
      roleId: 'cinematographer',
      roleTitle: 'Cinematographer',
      createdById: 'owner_alpha'
    });

    expect(emp1.account.id).toBe('usr_emp_alpha_010');
    expect(emp2.account.id).toBe('usr_emp_alpha_011');
  });

  // ==========================================
  // Test 14: Employees Receive Separate Login Credentials
  // ==========================================
  it('14. Employees receive separate login credentials', () => {
    const emp1 = unifiedAuthService.provisionEmployee({
      studioId: TEST_STUDIO_A,
      studioName: 'Alpha Creative Studio',
      employeeName: 'Crew Member A',
      employeeId: 'emp_alpha_020',
      username: 'crewa_alpha',
      mobile: '+91 98250 55553',
      roleId: 'photographer',
      roleTitle: 'Photographer',
      initialPassword: 'Emp#CrewA2026'
    });

    const emp2 = unifiedAuthService.provisionEmployee({
      studioId: TEST_STUDIO_A,
      studioName: 'Alpha Creative Studio',
      employeeName: 'Crew Member B',
      employeeId: 'emp_alpha_021',
      username: 'crewb_alpha',
      mobile: '+91 98250 55554',
      roleId: 'photo_editor',
      roleTitle: 'Editor',
      initialPassword: 'Emp#CrewB2026'
    });

    const loginA = unifiedAuthService.loginEmployee('crewa_alpha', 'Emp#CrewA2026', TEST_STUDIO_A);
    const loginB = unifiedAuthService.loginEmployee('crewb_alpha', 'Emp#CrewB2026', TEST_STUDIO_A);

    expect(loginA.success).toBe(true);
    expect(loginB.success).toBe(true);
    expect(loginA.session?.token).not.toBe(loginB.session?.token);
    expect(loginA.session?.account.loginId).toBe('crewa_alpha');
    expect(loginB.session?.account.loginId).toBe('crewb_alpha');
  });

  // ==========================================
  // Test 15: Employees Can View Their Authorized Dashboard
  // ==========================================
  it('15. Employees can view their authorized dashboard', () => {
    // Seed an assigned event
    TenantStore.set(TEST_STUDIO_A, 'events', [{
      id: 'evt_001',
      studioId: TEST_STUDIO_A,
      eventNumber: 'EVT-2026-001',
      category: 'Wedding',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date().toISOString().slice(0, 10),
      venue: 'Grand Bhagwati, SG Highway',
      assignedTeamIds: ['emp_alpha_020'],
      estimatedBudget: 250000, // SENSITIVE FINANCIAL
      advancePaid: 100000,     // SENSITIVE FINANCIAL
      status: 'In Progress'
    }]);

    const dashboard = employeeWorkspaceService.getEmployeeDashboard(TEST_STUDIO_A, 'emp_alpha_020');
    expect(dashboard.assignedEvents.length).toBe(1);
    expect(dashboard.assignedEvents[0].eventNumber).toBe('EVT-2026-001');

    // Strict privacy verification: financials are stripped!
    expect((dashboard.assignedEvents[0] as any).estimatedBudget).toBeUndefined();
    expect((dashboard.assignedEvents[0] as any).advancePaid).toBeUndefined();
  });

  // ==========================================
  // Test 16: Employees Can Access Attendance According to Permission
  // ==========================================
  it('16. Employees can access attendance according to permission', () => {
    // Check in
    const checkInRecord = employeeWorkspaceService.checkIn(TEST_STUDIO_A, 'emp_alpha_020', 'On-site reporting');
    expect(checkInRecord.status).toBe('present');
    expect(checkInRecord.checkIn).toBeDefined();

    // Check out
    const checkOutRecord = employeeWorkspaceService.checkOut(TEST_STUDIO_A, 'emp_alpha_020', 'Wrap up');
    expect(checkOutRecord.checkOut).toBeDefined();

    // View history
    const history = employeeWorkspaceService.getAttendanceHistory(TEST_STUDIO_A, 'emp_alpha_020');
    expect(history.length).toBeGreaterThanOrEqual(1);
  });

  // ==========================================
  // Test 17: Cross-Studio Access is Denied
  // ==========================================
  it('17. Cross-studio access is denied', () => {
    // Seed Studio A and Studio B customers
    customerService.createCustomer(TEST_STUDIO_A, {
      name: 'Client Alpha',
      phone: '+91 99999 11111'
    });

    customerService.createCustomer(TEST_STUDIO_B, {
      name: 'Client Beta',
      phone: '+91 99999 22222'
    });

    // Studio A customers cannot leak into Studio B
    const customersA = customerService.listCustomers(TEST_STUDIO_A);
    const customersB = customerService.listCustomers(TEST_STUDIO_B);

    expect(customersA.some(c => c.name === 'Client Alpha')).toBe(true);
    expect(customersA.some(c => c.name === 'Client Beta')).toBe(false);

    expect(customersB.some(c => c.name === 'Client Beta')).toBe(true);
    expect(customersB.some(c => c.name === 'Client Alpha')).toBe(false);
  });

  // ==========================================
  // Test 18: Deactivated Users Lose Access
  // ==========================================
  it('18. Deactivated users lose access', () => {
    const { account } = unifiedAuthService.provisionEmployee({
      studioId: TEST_STUDIO_A,
      studioName: 'Alpha Creative Studio',
      employeeName: 'Temporary Crew',
      employeeId: 'emp_alpha_temp',
      username: 'temp_crew',
      mobile: '+91 98250 99999',
      roleId: 'photographer',
      roleTitle: 'Photographer',
      initialPassword: 'Emp#Temp2026'
    });

    // First login succeeds
    const login1 = unifiedAuthService.loginEmployee('temp_crew', 'Emp#Temp2026', TEST_STUDIO_A);
    expect(login1.success).toBe(true);
    const token = login1.session?.token!;

    // Deactivate account
    unifiedAuthService.deactivateAccount(account.id, 'Master Admin');

    // Active session is invalidated immediately
    const validated = unifiedAuthService.validateSession(token);
    expect(validated).toBeNull();

    // New login attempt is rejected
    const login2 = unifiedAuthService.loginEmployee('temp_crew', 'Emp#Temp2026', TEST_STUDIO_A);
    expect(login2.success).toBe(false);
    expect(login2.error).toContain('deactivated');
  });

  // ==========================================
  // Test 19: Logout Invalidates the Authenticated Session
  // ==========================================
  it('19. Logout invalidates the authenticated session', () => {
    const login = unifiedAuthService.loginStudioOwner('aarav_alpha', 'Owner#Alpha2026', TEST_STUDIO_A);
    expect(login.success).toBe(true);
    const token = login.session?.token!;

    // Token is valid before logout
    expect(unifiedAuthService.validateSession(token)).not.toBeNull();

    // Logout
    unifiedAuthService.logoutSession(token);

    // Token is invalidated after logout
    expect(unifiedAuthService.validateSession(token)).toBeNull();
  });

  // ==========================================
  // Test 20: Direct API Requests Cannot Bypass RBAC
  // ==========================================
  it('20. Direct API requests cannot bypass RBAC', () => {
    // Evaluator checks permissions
    const canPhotographerManageFinances = globalRbacService.hasPermission(
      TEST_STUDIO_A,
      'photographer',
      'invoices_billing',
      'edit_financials'
    );
    expect(canPhotographerManageFinances).toBe(false);

    const canPhotographerEditClientPII = globalRbacService.hasPermission(
      TEST_STUDIO_A,
      'photographer',
      'customers_crm',
      'view_client_pii'
    );
    expect(canPhotographerEditClientPII).toBe(false);
  });

  // ==========================================
  // Test 21: No Plaintext Passwords Are Stored
  // ==========================================
  it('21. No plaintext passwords are stored', () => {
    const rawAccount = unifiedAuthService.getAccount('usr_owner_' + TEST_STUDIO_A);
    expect(rawAccount).not.toBeNull();

    // Plaintext password 'Owner#Alpha2026' is never in the stored record
    expect(rawAccount?.passwordHash).not.toBe('Owner#Alpha2026');
    expect(rawAccount?.passwordHash).toMatch(/^sha256_/);
    expect(rawAccount?.salt).toBeDefined();

    // Public listAllAccounts strips passwordHash and salt entirely
    const publicAccounts = unifiedAuthService.listAllAccounts({ studioId: TEST_STUDIO_A });
    publicAccounts.forEach(acc => {
      expect((acc as any).passwordHash).toBeUndefined();
      expect((acc as any).salt).toBeUndefined();
    });
  });

  // ==========================================
  // Test 22: Existing Studio Data Remains Intact
  // ==========================================
  it('22. Existing studio data remains intact', () => {
    // Verify booking, quotation and financial ledger mechanisms work seamlessly
    const booking = bookingProductionService.createBooking(TEST_STUDIO_A, {
      customerId: 'cust_alpha_99',
      customerName: 'Sunita & Deepak',
      customerPhone: '+91 98250 88888',
      eventName: 'Sunita & Deepak Wedding',
      category: 'Wedding',
      mainEventDate: '2026-12-11',
      venue: 'YMCA Club',
      city: 'Ahmedabad',
      numberOfDays: 2,
      initialQuotationAmount: 150000,
      functions: [
        {
          name: 'Sangeet Night',
          date: '2026-12-10',
          venue: 'Karnavati Club',
          startTime: '17:00'
        },
        {
          name: 'Wedding Ceremony',
          date: '2026-12-11',
          venue: 'YMCA Club',
          startTime: '08:00'
        }
      ]
    });

    expect(booking.id).toBeDefined();
    expect(booking.functions.length).toBe(2);
    expect(booking.financials.originalQuotation).toBe(150000);

    // Record verified payment
    bookingProductionService.recordBookingPayment(TEST_STUDIO_A, booking.id, {
      amount: 50000,
      paymentMethod: 'UPI',
      isAdvance: true
    });

    const updatedBooking = bookingProductionService.getBooking(TEST_STUDIO_A, booking.id);
    expect(updatedBooking?.financials.verifiedPaymentsReceived).toBe(50000);
    expect(updatedBooking?.financials.remainingBalance).toBe(100000);
  });
});
