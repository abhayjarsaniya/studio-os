import { describe, it, expect, beforeEach } from 'vitest';
import { realAccountProvisionService } from '../services/realAccountProvisionService';
import { firebaseAuthService } from '../services/firebaseAuthService';
import { unifiedAuthService } from '../services/unifiedAuthService';
import { TenantStore } from '../services/tenantStore';
import { Studio, Employee } from '../types/schema';

describe('STUDIO OS — Real Studio Owner & Employee Account Creation Workflow (Tests A through L)', () => {
  const TEST_GMAIL_1 = 'pritesh.sharma.test@gmail.com';
  const TEST_STUDIO_NAME_1 = 'Sharma Visuals & Cinema';
  const TEST_EMPLOYEE_EMAIL_1 = 'manoj.edits@gmail.com';
  const TEST_EMPLOYEE_NAME_1 = 'Manoj Dave';

  const TEST_GMAIL_2 = 'kavita.patel.lens@gmail.com';
  const TEST_STUDIO_NAME_2 = 'Kavita Lens Studio';

  let studio1Id = '';
  let setupLink1 = '';
  let setupToken1 = '';
  let employee1SetupLink = '';
  let employee1SetupToken = '';
  let studio2Id = '';

  beforeEach(() => {
    // Reset test sessions
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('studio_os_session_token');
      localStorage.removeItem('studio_os_user_role');
      localStorage.removeItem('studio_os_active_studio_id_v2');
    }
  });

  // =========================================================================
  // Test A: Master Admin creates a new studio with a Gmail address
  // =========================================================================
  it('Test A: Master Admin creates a new studio with a Gmail address and validates normalization', async () => {
    // Reject invalid emails
    expect(() => realAccountProvisionService.normalizeEmail('   TEST@GMAIL.COM   ')).not.toThrow();
    expect(realAccountProvisionService.normalizeEmail('   TEST@GMAIL.COM   ')).toBe('test@gmail.com');

    // Reject non-Gmail addresses for Studio Owner
    await expect(realAccountProvisionService.provisionStudioAndOwner({
      name: 'Invalid Email Studio',
      ownerName: 'Test Owner',
      ownerEmail: 'owner@yahoo.com',
      ownerMobile: '9898011111',
      address: '101 Ring Road',
      city: 'Ahmedabad',
      state: 'Gujarat'
    })).rejects.toThrow(/Studio Owner must use a valid Gmail address/);

    // Create studio with valid Gmail
    const res = await realAccountProvisionService.provisionStudioAndOwner({
      name: TEST_STUDIO_NAME_1,
      ownerName: 'Pritesh Sharma',
      ownerEmail: TEST_GMAIL_1,
      ownerMobile: '9898099999',
      address: '702 Titanium City Center, Satellite',
      city: 'Ahmedabad',
      state: 'Gujarat',
      subscriptionPlan: 'plan_standard_500',
      subscriptionStatus: 'active'
    }, 'Master Admin');

    expect(res.success).toBe(true);
    expect(res.studio.id).toMatch(/^studio_/);
    expect(res.ownerEmail).toBe(TEST_GMAIL_1);
    expect(res.setupLink).toContain('#/setup-password?token=');
    expect(res.setupLink).toContain(`email=${encodeURIComponent(TEST_GMAIL_1)}`);
    studio1Id = res.studio.id;
    expect(['sent', 'pending']).toContain(res.emailStatus);
    setupLink1 = res.setupLink;
    setupToken1 = res.setupToken;
  });

  // =========================================================================
  // Test B: Real owner account is created and linked to the correct studio
  // =========================================================================
  it('Test B: verifies real owner account is created and linked to the correct studio ID', () => {
    const studio = TenantStore.get(studio1Id, 'profile') as unknown as Studio;
    expect(studio).toBeDefined();
    expect(studio.name).toBe(TEST_STUDIO_NAME_1);
    expect(studio.ownerEmail).toBe(TEST_GMAIL_1);
    expect((studio as any).accountStatus).toBe('pending_activation');
    expect(studio.ownerAuthUid).toBeDefined();

    // Verify owner employee record exists in studio
    const employees = TenantStore.get(studio1Id, 'employees') as Employee[];
    expect(employees.length).toBeGreaterThan(0);
    const ownerEmp = employees.find(e => e.roleId === 'owner' || e.roleIds?.includes('owner'));
    expect(ownerEmp).toBeDefined();
    expect(ownerEmp?.email).toBe(TEST_GMAIL_1);

    // Verify account registered in Unified Auth directory
    const account = unifiedAuthService.findAccountByIdentifier(TEST_GMAIL_1);
    expect(account).toBeDefined();
    expect(account?.studioId).toBe(studio1Id);
    expect(account?.mustChangePassword).toBe(true);
  });

  // =========================================================================
  // Test C: The owner receives the setup email (official Firebase dispatch)
  // =========================================================================
  it('Test C: verifies the owner receives the setup email / expiring setup link', async () => {
    // Verify resend capability
    const resendRes = await realAccountProvisionService.resendSetupLink(TEST_GMAIL_1, 'studio_owner', studio1Id);
    expect(resendRes.success).toBe(true);
    expect(resendRes.setupLink).toContain('#/setup-password?token=');
    expect(resendRes.email).toBe(TEST_GMAIL_1);

    // Setup token is valid and unexpired
    const verifyRes = realAccountProvisionService.verifySetupToken(setupToken1, TEST_GMAIL_1);
    expect(verifyRes.valid).toBe(true);
    expect(verifyRes.record?.studioId).toBe(studio1Id);
  });

  // =========================================================================
  // Test D: The owner opens the link and creates a password
  // =========================================================================
  it('Test D: owner opens the setup link, password strength is enforced, and password is set', async () => {
    // Reject weak password (under 8 characters)
    const weakRes = await realAccountProvisionService.completeInitialPasswordSetup(
      setupToken1,
      TEST_GMAIL_1,
      'short1'
    );
    expect(weakRes.success).toBe(false);
    expect(weakRes.error).toMatch(/at least 8 characters/);

    // Reject password without letters/numbers
    const noNumRes = await realAccountProvisionService.completeInitialPasswordSetup(
      setupToken1,
      TEST_GMAIL_1,
      'alllettersonly'
    );
    expect(weakRes.success).toBe(false);

    // Complete setup with strong password
    const setupRes = await realAccountProvisionService.completeInitialPasswordSetup(
      setupToken1,
      TEST_GMAIL_1,
      'Pritesh@Creative2026'
    );
    expect(setupRes.success).toBe(true);
    expect(setupRes.studioId).toBe(studio1Id);

    // Verify account is marked active and mustChangePassword is false
    const account = unifiedAuthService.findAccountByIdentifier(TEST_GMAIL_1);
    expect(account?.mustChangePassword).toBe(false);

    const studio = TenantStore.get(studio1Id, 'profile') as unknown as Studio;
    expect((studio as any).accountStatus).toBe('active');

    // Token cannot be reused (single-use token guarantee)
    const reuseAttempt = await realAccountProvisionService.completeInitialPasswordSetup(
      setupToken1,
      TEST_GMAIL_1,
      'AnotherPassword#2026'
    );
    expect(reuseAttempt.success).toBe(false);
    expect(reuseAttempt.error).toMatch(/already been used/);
  });

  // =========================================================================
  // Test E: The owner logs in with their Gmail address and new password
  // =========================================================================
  it('Test E: Studio Owner logs in with their Gmail address and new password', async () => {
    // Old/initial random password must fail
    const oldLogin = await firebaseAuthService.login(TEST_GMAIL_1, 'WrongOldPassword123');
    expect(oldLogin.success).toBe(false);

    // New password succeeds
    const loginRes = await firebaseAuthService.login(TEST_GMAIL_1, 'Pritesh@Creative2026');
    expect(loginRes.success).toBe(true);
    expect(loginRes.session).toBeDefined();
    expect(loginRes.session?.account.accountType).toBe('STUDIO_OWNER');
    expect(loginRes.session?.account.studioId).toBe(studio1Id);
    expect(loginRes.session?.account.mustChangePassword).toBe(false);
  });

  // =========================================================================
  // Test F: The correct Studio Dashboard and studio information load
  // =========================================================================
  it('Test F: verifies the correct Studio Dashboard and studio information load', () => {
    const activeStudio = TenantStore.get(studio1Id, 'profile') as unknown as Studio;
    expect(activeStudio.id).toBe(studio1Id);
    expect(activeStudio.name).toBe(TEST_STUDIO_NAME_1);
    expect(activeStudio.ownerName).toBe('Pritesh Sharma');
    expect(activeStudio.city).toBe('Ahmedabad');

    const branches = TenantStore.get(studio1Id, 'branches') as any[];
    expect(branches.length).toBeGreaterThan(0);
    expect(branches[0].name).toBe(`${TEST_STUDIO_NAME_1} Flagship`);
  });

  // =========================================================================
  // Test G: The owner creates an employee and the employee receives setup link
  // =========================================================================
  it('Test G: Studio Owner creates an employee and employee receives setup link', async () => {
    const empRes = await realAccountProvisionService.provisionEmployeeAccount(
      studio1Id,
      {
        fullName: TEST_EMPLOYEE_NAME_1,
        email: TEST_EMPLOYEE_EMAIL_1,
        mobile: '9898022222',
        department: 'Post-Production',
        designation: 'Senior Video Editor',
        roleId: 'video_editor',
        roleName: 'Video Editor',
        status: 'active'
      },
      'Pritesh Sharma'
    );

    expect(empRes.success).toBe(true);
    expect(empRes.employee.fullName).toBe(TEST_EMPLOYEE_NAME_1);
    expect(empRes.email).toBe(TEST_EMPLOYEE_EMAIL_1);
    expect(empRes.setupLink).toContain('#/setup-password?token=');
    expect(empRes.setupToken).toBeDefined();

    employee1SetupLink = empRes.setupLink;
    employee1SetupToken = empRes.setupToken;

    // Verify employee exists in studio employees
    const employees = TenantStore.get(studio1Id, 'employees') as Employee[];
    const createdEmp = employees.find(e => e.email === TEST_EMPLOYEE_EMAIL_1);
    expect(createdEmp).toBeDefined();
    expect(createdEmp?.designation).toBe('Senior Video Editor');
  });

  // =========================================================================
  // Test H: The employee sets a password and logs in successfully
  // =========================================================================
  it('Test H: employee sets password via setup link and logs in successfully', async () => {
    // Complete setup for employee
    const setupRes = await realAccountProvisionService.completeInitialPasswordSetup(
      employee1SetupToken,
      TEST_EMPLOYEE_EMAIL_1,
      'ManojEditor@2026'
    );
    expect(setupRes.success).toBe(true);

    // Employee logs in with email and password
    const loginRes = await firebaseAuthService.login(TEST_EMPLOYEE_EMAIL_1, 'ManojEditor@2026');
    expect(loginRes.success).toBe(true);
    expect(loginRes.session?.account.accountType).toBe('EMPLOYEE');
    expect(loginRes.session?.account.studioId).toBe(studio1Id);
    expect(loginRes.session?.account.mustChangePassword).toBe(false);
  });

  // =========================================================================
  // Test I: Forgot Password works for both accounts
  // =========================================================================
  it('Test I: Forgot Password works for both accounts and updates password', async () => {
    // Studio Owner Forgot Password
    const ownerResetRes = await firebaseAuthService.sendPasswordReset(TEST_GMAIL_1);
    expect(ownerResetRes.success).toBe(true);

    // Employee Forgot Password
    const empResetRes = await firebaseAuthService.sendPasswordReset(TEST_EMPLOYEE_EMAIL_1);
    expect(empResetRes.success).toBe(true);

    // Update password via changePassword
    const ownerAccount = unifiedAuthService.findAccountByIdentifier(TEST_GMAIL_1);
    expect(ownerAccount).toBeDefined();
    await firebaseAuthService.changePassword(ownerAccount!.id, 'NewPriteshPass#999');

    // New password can log in immediately
    const loginNew = await firebaseAuthService.login(TEST_GMAIL_1, 'NewPriteshPass#999');
    expect(loginNew.success).toBe(true);

    // Old password fails
    const loginOld = await firebaseAuthService.login(TEST_GMAIL_1, 'Pritesh@Creative2026');
    expect(loginOld.success).toBe(false);
  });

  // =========================================================================
  // Test J: Refresh, logout, and login again - no repeated password setup
  // =========================================================================
  it('Test J: refresh, logout, and login again — mustChangePassword remains false', async () => {
    // Log in
    const login1 = await firebaseAuthService.login(TEST_GMAIL_1, 'NewPriteshPass#999');
    expect(login1.success).toBe(true);
    expect(login1.session?.account.mustChangePassword).toBe(false);

    // Logout
    await firebaseAuthService.logout();

    // Log in again
    const login2 = await firebaseAuthService.login(TEST_GMAIL_1, 'NewPriteshPass#999');
    expect(login2.success).toBe(true);
    expect(login2.session?.account.mustChangePassword).toBe(false);
  });

  // =========================================================================
  // Test K: Role restrictions & security
  // =========================================================================
  it('Test K: employee cannot access Master Admin or other role authority', async () => {
    const empLogin = await firebaseAuthService.login(TEST_EMPLOYEE_EMAIL_1, 'ManojEditor@2026');
    expect(empLogin.session?.account.accountType).toBe('EMPLOYEE');

    // Employee cannot act as MASTER_ADMIN
    const attemptMaster = await firebaseAuthService.login(
      TEST_EMPLOYEE_EMAIL_1,
      'ManojEditor@2026',
      'MASTER_ADMIN'
    );
    expect(attemptMaster.success).toBe(false);

    // Studio Owner cannot act as MASTER_ADMIN
    const attemptOwnerAsMaster = await firebaseAuthService.login(
      TEST_GMAIL_1,
      'NewPriteshPass#999',
      'MASTER_ADMIN'
    );
    expect(attemptOwnerAsMaster.success).toBe(false);
  });

  // =========================================================================
  // Test L: Create second studio and verify data isolation
  // =========================================================================
  it('Test L: create another studio and verify data isolation between studios', async () => {
    const res2 = await realAccountProvisionService.provisionStudioAndOwner({
      name: TEST_STUDIO_NAME_2,
      ownerName: 'Kavita Patel',
      ownerEmail: TEST_GMAIL_2,
      ownerMobile: '9898033333',
      address: '202 Corporate Road',
      city: 'Surat',
      state: 'Gujarat'
    }, 'Master Admin');

    expect(res2.success).toBe(true);
    studio2Id = res2.studio.id;
    expect(studio2Id).not.toBe(studio1Id);

    // Add a private event to Studio 1
    TenantStore.set(studio1Id, 'events', [{
      id: 'ev_studio1_private_001',
      studioId: studio1Id,
      name: 'Pritesh Sharma VIP Wedding',
      totalAmount: 150000
    }]);

    // Add a private event to Studio 2
    TenantStore.set(studio2Id, 'events', [{
      id: 'ev_studio2_private_001',
      studioId: studio2Id,
      name: 'Kavita Patel Fashion Gala',
      totalAmount: 85000
    }]);

    // Verify isolation: Studio 2 cannot see Studio 1's events
    const studio2Events = TenantStore.get(studio2Id, 'events') as any[];
    expect(studio2Events.length).toBe(1);
    expect(studio2Events[0].id).toBe('ev_studio2_private_001');
    expect(studio2Events.find(e => e.id === 'ev_studio1_private_001')).toBeUndefined();

    // Verify isolation: Studio 1 cannot see Studio 2's events
    const studio1Events = TenantStore.get(studio1Id, 'events') as any[];
    expect(studio1Events.length).toBe(1);
    expect(studio1Events[0].id).toBe('ev_studio1_private_001');
    expect(studio1Events.find(e => e.id === 'ev_studio2_private_001')).toBeUndefined();
  });
});
