import { describe, it, expect, beforeEach } from 'vitest';
import { realAccountProvisionService } from '../services/realAccountProvisionService';
import { firebaseAuthService } from '../services/firebaseAuthService';
import { platformStudioService } from '../services/platformStudioService';
import { TenantStore } from '../services/tenantStore';

describe('STUDIO OS — Final Studio Owner and Employee Authentication Workflow', () => {
  const timestamp = Date.now();
  const testOwnerEmail = `test.studio.owner.${timestamp}@gmail.com`;
  const testInitialPassword = 'SuperSecret#2026!';
  const testStudioName = `Shiv Studio ${timestamp}`;

  beforeEach(() => {
    (TenantStore as any).clearAll?.();
  });

  it('1. Master Admin creates studio with Initial Password, setting account active and mustChangePassword false', async () => {
    const result = await realAccountProvisionService.provisionStudioAndOwner(
      {
        name: testStudioName,
        ownerName: 'Shiv Patel',
        ownerEmail: testOwnerEmail,
        ownerMobile: '+91 98980 11223',
        initialPassword: testInitialPassword,
        address: '101 Lotus Ring Road',
        city: 'Ahmedabad',
        state: 'Gujarat',
        subscriptionStatus: 'active'
      },
      'Master Admin'
    );

    expect(result.success).toBe(true);
    expect(result.studio.id).toBeDefined();
    expect(result.ownerEmail).toBe(testOwnerEmail);
    expect(result.initialPassword).toBe(testInitialPassword);
    expect((result.studio as any).accountStatus).toBe('active');
    expect(result.authUid).toBeDefined();

    // Verify studio is immediately visible in platformStudioService
    const studioList = platformStudioService.listStudios();
    const created = studioList.find(s => s.id === result.studio.id);
    expect(created).toBeDefined();
    expect(created?.name).toBe(testStudioName);
  });

  it('2. Studio Owner logs in directly at common login page with Gmail and Initial Password without needing setup link', async () => {
    const loginResult = await firebaseAuthService.login(
      testOwnerEmail,
      testInitialPassword
    );

    expect(loginResult.success).toBe(true);
    const account = loginResult.account || loginResult.session?.account;
    expect(account).toBeDefined();
    expect(account?.email.toLowerCase()).toBe(testOwnerEmail.toLowerCase());
    expect(account?.accountType).toBe('STUDIO_OWNER');
    expect(account?.mustChangePassword).toBe(false);
  });

  it('3. Studio Owner creates an Employee with an Initial Password', async () => {
    const studios = platformStudioService.listStudios();
    const studio = studios.find(s => s.ownerEmail?.toLowerCase() === testOwnerEmail.toLowerCase());
    expect(studio).toBeDefined();

    const empEmail = `crew.editor.${timestamp}@gmail.com`;
    const empPassword = 'CrewPassword#2026!';

    const empResult = await realAccountProvisionService.provisionEmployeeAccount(
      studio!.id,
      {
        fullName: 'Manish Video Editor',
        email: empEmail,
        mobile: '+91 98765 44332',
        department: 'Post Production',
        designation: 'Senior Video Editor',
        roleId: 'editor',
        roleName: 'Video Editor',
        initialPassword: empPassword,
        status: 'active'
      },
      'Shiv Patel'
    );

    expect(empResult.success).toBe(true);
    expect(empResult.email).toBe(empEmail);
    expect(empResult.initialPassword).toBe(empPassword);
    expect((empResult.employee as any).accountStatus).toBe('active');

    // 4. Employee logs in directly at common login page with email and Initial Password
    const empLogin = await firebaseAuthService.login(
      empEmail,
      empPassword
    );

    expect(empLogin.success).toBe(true);
    const empAccount = empLogin.account || empLogin.session?.account;
    expect(empAccount).toBeDefined();
    expect(empAccount?.email.toLowerCase()).toBe(empEmail.toLowerCase());
    expect(empAccount?.accountType).toBe('EMPLOYEE');
    expect(empAccount?.mustChangePassword).toBe(false);
  });

  it('5. Normalizes uppercase and whitespace in Gmail addresses consistently', async () => {
    const unnormalizedEmail = `  TEST.STUDIO.OWNER.${timestamp}@GMAIL.COM  `;
    const loginResult = await firebaseAuthService.login(
      unnormalizedEmail,
      testInitialPassword
    );

    expect(loginResult.success).toBe(true);
    const account = loginResult.account || loginResult.session?.account;
    expect(account?.email.toLowerCase()).toBe(testOwnerEmail.toLowerCase());
  });

  it('6. Rejects login attempts with wrong password with clear error message', async () => {
    const loginResult = await firebaseAuthService.login(
      testOwnerEmail,
      'WrongPassword#123'
    );

    expect(loginResult.success).toBe(false);
    expect(loginResult.error).toBeDefined();
    // Must NOT state "Invalid Master Admin credentials"
    expect(loginResult.error).not.toContain('Invalid Master Admin credentials');
  });
});
