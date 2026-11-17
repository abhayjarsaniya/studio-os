import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { unifiedAuthService } from '../services/unifiedAuthService';
import { platformStudioService } from '../services/platformStudioService';
import { portalAccountProvisionService } from '../services/portalAccountProvisionService';
import { TenantStore } from '../services/tenantStore';

describe('STUDIO OS — Fix New Studio Owner Login & Account Provisioning', () => {
  beforeEach(() => {
    portalAccountProvisionService.syncWithUnifiedAuthService();
  });

  it('1. verifies StudioLoginPage contains clean single login form without portal switchers', () => {
    const loginFilePath = path.resolve(__dirname, '../pages/StudioLoginPage.tsx');
    const content = fs.readFileSync(loginFilePath, 'utf-8');

    // Required elements
    expect(content).toContain('Welcome to Studio OS');
    expect(content).toContain('Email / Username');
    expect(content).toContain('Password');
    expect(content).toContain('Forgot Password?');
    expect(content).toContain('Sign In');

    // Forbidden elements (role-specific buttons and badges)
    expect(content).not.toContain('Employee Portal');
    expect(content).not.toContain('Platform Master Admin');
    expect(content).not.toContain('Studio Owner Portal');
  });

  it('2. verifies Master Admin authenticates on common login method and redirects to #/master/dashboard', () => {
    // Test with email
    const resEmail = unifiedAuthService.login('admin@studio-os.com', 'MasterAdmin@2026');
    expect(resEmail.success).toBe(true);
    expect(resEmail.role).toBe('MASTER_ADMIN');
    expect(resEmail.targetRoute).toBe('#/master/dashboard');
    expect(resEmail.session).toBeDefined();

    // Test with username
    const resUsername = unifiedAuthService.login('masteradmin', 'MasterAdmin@2026');
    expect(resUsername.success).toBe(true);
    expect(resUsername.role).toBe('MASTER_ADMIN');
    expect(resUsername.targetRoute).toBe('#/master/dashboard');
  });

  it('3. verifies existing Studio Owner authenticates on common login method and redirects to #/app/dashboard', () => {
    // Test with username
    const resUsername = unifiedAuthService.login('shreeji.owner', '7FgBK8@TUsxV@H');
    expect(resUsername.success).toBe(true);
    expect(resUsername.role).toBe('STUDIO_OWNER');
    expect(resUsername.targetRoute).toBe('#/app/dashboard');
    expect(resUsername.session?.account.studioId).toBe('studio_shreeji_films');

    // Test with email
    const resEmail = unifiedAuthService.login('aarav@shreejifilms.in', '7FgBK8@TUsxV@H');
    expect(resEmail.success).toBe(true);
    expect(resEmail.role).toBe('STUDIO_OWNER');
    expect(resEmail.targetRoute).toBe('#/app/dashboard');
  });

  it('4. verifies Employee authenticates on common login method and redirects to #/employee/dashboard', () => {
    // Test with username
    const res = unifiedAuthService.login('rahul.sharma', '!Bd2*9R7vJUy8W');
    expect(res.success).toBe(true);
    expect(res.role).toBe('EMPLOYEE');
    expect(res.targetRoute).toBe('#/employee/dashboard');
  });

  it('5. verifies newly created Studio Owner account is immediately active and can log in without delay', () => {
    const testStudioPayload = {
      name: 'Luxe Visuals Studio',
      ownerName: 'Devansh Parekh',
      ownerMobile: '+91 99881 22334',
      ownerEmail: `devansh.parekh.${Date.now()}@luxevisuals.in`,
      address: '401 Sapphire Arcade, CG Road',
      city: 'Ahmedabad',
      state: 'Gujarat',
      subscriptionPlan: 'plan_standard_500',
      subscriptionStartDate: new Date().toISOString().slice(0, 10),
      subscriptionExpiryDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      subscriptionStatus: 'active' as const
    };

    // 1. Master Admin creates studio
    const createdResult = platformStudioService.createStudioWithOwner(testStudioPayload, 'Master Admin');
    expect(createdResult.success).toBe(true);
    expect(createdResult.studio.id).toBeDefined();
    expect(createdResult.credentials.username).toBeDefined();
    expect(createdResult.temporaryPassword).toBeDefined();
    expect(createdResult.temporaryPassword.startsWith('Owner#')).toBe(true);

    // 2. Immediate Login via Username on Common Login Method
    const loginByUsername = unifiedAuthService.login(
      createdResult.credentials.username,
      createdResult.temporaryPassword
    );
    expect(loginByUsername.success).toBe(true);
    expect(loginByUsername.role).toBe('STUDIO_OWNER');
    expect(loginByUsername.targetRoute).toBe('#/app/dashboard');
    expect(loginByUsername.session?.account.studioId).toBe(createdResult.studio.id);

    // 3. Immediate Login via Email on Common Login Method
    const loginByEmail = unifiedAuthService.login(
      testStudioPayload.ownerEmail,
      createdResult.temporaryPassword
    );
    expect(loginByEmail.success).toBe(true);
    expect(loginByEmail.role).toBe('STUDIO_OWNER');
    expect(loginByEmail.targetRoute).toBe('#/app/dashboard');

    // 4. Verify Studio Profile has owner metadata linked
    const studioProfile = TenantStore.get(createdResult.studio.id, 'profile') as any;
    expect(studioProfile).toBeDefined();
    expect(studioProfile.ownerUsername).toBe(createdResult.credentials.username);
    expect(studioProfile.ownerAuthUid).toBeDefined();
    expect(studioProfile.ownerAuthUid.startsWith('auth_uid_')).toBe(true);
  });

  it('6. verifies invalid credentials return standard safe error message without leaking account existence', () => {
    const badLogin1 = unifiedAuthService.login('nonexistent.user@fake.com', 'WrongPassword123');
    expect(badLogin1.success).toBe(false);
    expect(badLogin1.error).toBe('Invalid email or password.');

    const badLogin2 = unifiedAuthService.login('shreeji.owner', 'IncorrectPassword123');
    expect(badLogin2.success).toBe(false);
    expect(badLogin2.error).toBe('Invalid email or password.');
  });

  it('7. verifies password update via setStudioOwnerPassword retains credential synchronization', () => {
    const testStudioPayload = {
      name: 'Aura Cinematics',
      ownerName: 'Manan Dave',
      ownerMobile: '+91 98251 99112',
      ownerEmail: `manan.dave.${Date.now()}@auracinematics.in`,
      address: '702 Titanium Square',
      city: 'Ahmedabad',
      state: 'Gujarat',
      subscriptionPlan: 'plan_standard_500',
      subscriptionStatus: 'active' as const
    };

    const createdResult = platformStudioService.createStudioWithOwner(testStudioPayload, 'Master Admin');
    const studioId = createdResult.studio.id;

    // Reset password via Master Admin
    const resetResult = platformStudioService.setStudioOwnerPassword(studioId, 'Owner#NewSecure9911', 'Master Admin');
    expect(resetResult.success).toBe(true);

    // Login with new password
    const loginRes = unifiedAuthService.login(createdResult.credentials.username, 'Owner#NewSecure9911');
    expect(loginRes.success).toBe(true);
    expect(loginRes.role).toBe('STUDIO_OWNER');
  });
});
