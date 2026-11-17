import { describe, it, expect, beforeEach } from 'vitest';
import { platformStudioService } from '../services/platformStudioService';
import { masterAdminService } from '../services/masterAdminService';
import { unifiedAuthService } from '../services/unifiedAuthService';
import { firebaseAuthService } from '../services/firebaseAuthService';
import { studioService } from '../services/studioService';
import { TenantStore } from '../services/tenantStore';

describe('STUDIO OS — Real Studio Owner Authentication & Master Admin Security Audit', () => {
  beforeEach(() => {
    platformStudioService.ensureSeeded();
  });

  // Point 1 & 2 & 3: Master Admin creates new studio with real owner email and initial password
  it('1, 2 & 3. creates studio with Master Admin supplied initial password and real email', () => {
    const testStudio = {
      name: 'Artisan Lens Studios',
      ownerName: 'Manish Varma',
      ownerEmail: 'manish.varma@artisanlens.in',
      ownerMobile: '9825199999',
      initialPassword: 'Artisan#2026Secure!',
      address: 'Near Iscon Circle, SG Highway',
      city: 'Ahmedabad',
      state: 'Gujarat',
      subscriptionPlan: 'plan_pro_1500',
      subscriptionStatus: 'active' as const
    };

    const result = platformStudioService.createStudioWithOwner(testStudio, 'Master Admin');

    expect(result.success).toBe(true);
    expect(result.studio.id).toBeDefined();
    expect(result.studio.ownerEmail).toBe('manish.varma@artisanlens.in');
    // Verify initial password supplied by Master Admin was used
    expect(result.temporaryPassword).toBe('Artisan#2026Secure!');
    expect(result.credentials.temporaryPassword).toBe('Artisan#2026Secure!');
  });

  // Point 4 & 5: Exact Auth UID links studio profile and unifiedAuth account
  it('4 & 5. verifies exact Auth UID matches between studio record and owner auth account', () => {
    const allStudios = studioService.listStudios();
    const studio = allStudios.find(s => s.ownerEmail === 'manish.varma@artisanlens.in');

    expect(studio).toBeDefined();
    expect(studio?.ownerAuthUid).toBeDefined();
    expect(studio?.ownerAuthUid).toMatch(/^(auth_)?uid_/);

    const ownerAcc = unifiedAuthService.findAccount('manish.varma@artisanlens.in');
    expect(ownerAcc).toBeDefined();
    // EXACT Auth UID MATCH
    expect(ownerAcc?.id).toBe(studio?.ownerAuthUid);
    expect(ownerAcc?.studioId).toBe(studio?.id);
    expect(ownerAcc?.accountType).toBe('STUDIO_OWNER');
    expect(ownerAcc?.status).toBe('active');
  });

  // Point 6 & 7: Common login page authentication with registered email and initial password
  it('6 & 7. signs in using registered email and initial password to correct studio dashboard', async () => {
    const studio = studioService.listStudios().find(s => s.ownerEmail === 'manish.varma@artisanlens.in')!;

    // Log in with real email and the Master Admin assigned initial password
    const loginRes = await unifiedAuthService.login({
      identity: 'manish.varma@artisanlens.in',
      password: 'Artisan#2026Secure!'
    });

    expect(loginRes.success).toBe(true);
    expect(loginRes.role).toBe('STUDIO_OWNER');
    expect(loginRes.redirectRoute).toBe('#/app/dashboard');
    expect(loginRes.studioId).toBe(studio.id);
  });

  // Point 8 & 9: Forgot Password recovery and password update
  it('8 & 9. dispatches password reset email and verifies new password can log in immediately', async () => {
    // Forgot Password
    const resetRes = await firebaseAuthService.sendPasswordReset('manish.varma@artisanlens.in');
    expect(resetRes.success).toBe(true);
    expect(resetRes.message).toContain('manish.varma@artisanlens.in');

    // Update password via secure account service
    const ownerAcc = unifiedAuthService.findAccount('manish.varma@artisanlens.in')!;
    unifiedAuthService.changePassword(ownerAcc.id, 'NewBrandPass#2027');

    // Old password should fail
    const oldLogin = await unifiedAuthService.login({
      identity: 'manish.varma@artisanlens.in',
      password: 'Artisan#2026Secure!'
    });
    expect(oldLogin.success).toBe(false);

    // New password succeeds
    const newLogin = await unifiedAuthService.login({
      identity: 'manish.varma@artisanlens.in',
      password: 'NewBrandPass#2027'
    });
    expect(newLogin.success).toBe(true);
    expect(newLogin.role).toBe('STUDIO_OWNER');
  });

  // Point 10: Strict Master Admin separation: Studio Owner cannot access Master Admin
  it('10. strictly prevents Studio Owner from authenticating as Master Admin', () => {
    // Studio Owner credentials attempt to log into Master Admin
    const adminLoginAttempt = unifiedAuthService.loginMasterAdmin('manish.varma@artisanlens.in', 'NewBrandPass#2027');
    expect(adminLoginAttempt.success).toBe(false);
    expect(adminLoginAttempt.error).toContain('Invalid Master Admin');
  });

  // Point 11: Main Master Admin jarsaniya.abhay@gmail.com logs in to Master Admin Dashboard
  it('11. authenticates main Master Admin jarsaniya.abhay@gmail.com to Master Console', async () => {
    const adminLogin = await unifiedAuthService.login({
      identity: 'jarsaniya.abhay@gmail.com',
      password: 'MasterAdmin@2026'
    });

    expect(adminLogin.success).toBe(true);
    expect(adminLogin.role).toBe('MASTER_ADMIN');
    expect(adminLogin.redirectRoute).toBe('#/master/dashboard');
    expect(adminLogin.session?.account.email).toBe('jarsaniya.abhay@gmail.com');
  });

  // Point 12: Existing Shreeji Studio owner and employees continue working
  it('12. ensures existing Shreeji Studio owner and employees continue working seamlessly', async () => {
    const shreejiOwnerLogin = await unifiedAuthService.login({
      identity: 'aarav@shreejifilms.in',
      password: '7FgBK8@TUsxV@H'
    });
    expect(shreejiOwnerLogin.success).toBe(true);
    expect(shreejiOwnerLogin.role).toBe('STUDIO_OWNER');
    expect(shreejiOwnerLogin.redirectRoute).toBe('#/app/dashboard');

    const employeeLogin = await unifiedAuthService.login({
      identity: 'rahul.sharma@shreejifilms.in',
      password: '!Bd2*9R7vJUy8W'
    });
    expect(employeeLogin.success).toBe(true);
    expect(employeeLogin.role).toBe('EMPLOYEE');
    expect(employeeLogin.redirectRoute).toBe('#/employee/dashboard');
  });

  // Point 13: Audit and repair function guarantees consistency
  it('13. executes repairAndVerifyAllStudioAccounts ensuring zero orphaned studios', () => {
    const repairResult = platformStudioService.auditAndRepairAllStudios();
    expect(repairResult.totalStudiosAudited).toBeGreaterThanOrEqual(4);
    expect(repairResult.actions).toBeDefined();

    // Verify all studios now have matching ownerAuthUid in accounts registry
    const allStudios = studioService.listStudios();
    for (const s of allStudios) {
      if (s.ownerEmail && s.ownerEmail.includes('@')) {
        expect(s.ownerAuthUid).toBeDefined();
        const acc = unifiedAuthService.findAccount(s.ownerEmail);
        expect(acc).toBeDefined();
        expect(acc?.studioId).toBe(s.id);
        expect(acc?.accountType).toBe('STUDIO_OWNER');
      }
    }
  });
});
