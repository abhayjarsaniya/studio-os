import { describe, it, expect, beforeEach } from 'vitest';
import { 
  googleAuthInvitationService, 
  hashInvitationToken,
  generateRawInvitationToken 
} from '../services/googleAuthInvitationService';
import { TenantStore } from '../services/tenantStore';
import { platformStudioService } from '../services/platformStudioService';
import { unifiedAuthService } from '../services/unifiedAuthService';

// Ensure localStorage mock is present in Node/Vitest environment
if (typeof (globalThis as any).localStorage === 'undefined') {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (key: string) => store.get(key) || null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
    key: (index: number) => Array.from(store.keys())[index] || null,
    get length() { return store.size; }
  };
}

describe('STUDIO OS — Google Sign-In & One-Time Studio Registration Invitations (16-Point Audit)', () => {
  const timestamp = Date.now();
  const testGmail = `master.test.owner.${timestamp}@gmail.com`;
  const wrongGmail = `unauthorized.imposter.${timestamp}@gmail.com`;
  const testStudioName = `Shiv Divine Studios ${timestamp}`;
  let authorizationId = '';
  let invitationRawToken = '';

  beforeEach(() => {
    // Keep baseline tenant stores intact
  });

  // Test 1: Master Admin adds a new Gmail address
  it('1. Master Admin adds a new Gmail address to Authorized Studio Emails', async () => {
    const res = await googleAuthInvitationService.addAuthorizedEmail({
      email: testGmail,
      ownerName: 'Shiv Patel',
      sendInvitationImmediately: false,
      createdBy: 'Master Admin'
    });

    expect(res.record).toBeDefined();
    expect(res.record.email).toBe(testGmail);
    expect(res.record.status).toBe('enabled');
    expect(res.record.invitationStatus).toBe('not_sent');
    authorizationId = res.record.id;

    // Verify it is listed in authorized emails
    const all = await googleAuthInvitationService.listAuthorizedEmails();
    const found = all.find(a => a.id === authorizationId);
    expect(found).toBeDefined();
    expect(found?.email).toBe(testGmail);
  });

  // Test 2 & 3: Master Admin sends an invitation and owner receives it
  it('2 & 3. Master Admin sends a one-time invitation, generating expiring token and secure hash', async () => {
    const inviteRes = await googleAuthInvitationService.sendInvitation(authorizationId, 7, 'Master Admin');
    expect(inviteRes.success).toBe(true);
    expect(inviteRes.rawToken).toBeDefined();
    expect(inviteRes.invitationLink).toContain('/#/signup?token=');
    invitationRawToken = inviteRes.rawToken;

    // Verify token hash is stored, NOT raw token
    const tokenHash = await hashInvitationToken(invitationRawToken);
    const storedInvite = await googleAuthInvitationService.getInvitationByHash(tokenHash);
    expect(storedInvite).toBeDefined();
    expect(storedInvite?.email).toBe(testGmail);
    expect(storedInvite?.status).toBe('pending');
    expect(storedInvite?.tokenHash).toBe(tokenHash);
  });

  // Test 4: Owner opens the one-time registration link
  it('4. Owner opens the one-time registration link and the invitation is validated', async () => {
    const valRes = await googleAuthInvitationService.validateInvitationToken(invitationRawToken);
    expect(valRes.valid).toBe(true);
    expect(valRes.invitation).toBeDefined();
    expect(valRes.invitation?.email).toBe(testGmail);
    expect(valRes.invitation?.status).toBe('pending');
  });

  // Test 12: Another Gmail account cannot use that invitation
  it('12. Prevents a mismatched Google account from claiming the invitation', async () => {
    const wrongGoogleUser = {
      uid: `g_uid_${Date.now()}_imposter`,
      email: wrongGmail,
      displayName: 'Imposter User'
    };

    const attempt = await googleAuthInvitationService.registerStudioWithOwner(
      invitationRawToken,
      wrongGoogleUser,
      {
        name: 'Imposter Studio',
        ownerName: 'Imposter User',
        phone: '9999999999',
        address: 'Fake Street',
        city: 'Ahmedabad',
        state: 'Gujarat'
      }
    );

    expect(attempt.success).toBe(false);
    expect(attempt.error).toContain('Identity mismatch');
  });

  // Test 5, 6 & 7: Owner signs in with matching Google account and completes registration
  let ownerGoogleUid = `g_uid_${timestamp}_real_owner`;
  let registeredStudioId = '';

  it('5, 6 & 7. Owner signs in with matching Google account, creates studio, and saves record', async () => {
    const validGoogleUser = {
      uid: ownerGoogleUid,
      email: testGmail,
      displayName: 'Shiv Patel',
      photoURL: 'https://lh3.googleusercontent.com/photo.jpg'
    };

    const regRes = await googleAuthInvitationService.registerStudioWithOwner(
      invitationRawToken,
      validGoogleUser,
      {
        name: testStudioName,
        ownerName: 'Shiv Patel',
        phone: '+91 98980 99887',
        address: '402 Sunset Tower, Satellite',
        city: 'Ahmedabad',
        state: 'Gujarat',
        pinCode: '380015',
        gstNumber: '24ABCDE1234F1Z5',
        website: 'https://shivdivine.in',
        description: 'Luxury Destination Wedding Cinematography'
      }
    );

    expect(regRes.success).toBe(true);
    expect(regRes.studioId).toBeDefined();
    registeredStudioId = regRes.studioId;

    // Verify studio is registered in TenantStore and platform list
    const studioList = platformStudioService.listStudios();
    const created = studioList.find(s => s.id === registeredStudioId);
    expect(created).toBeDefined();
    expect(created?.name).toBe(testStudioName);
    expect(created?.ownerEmail).toBe(testGmail);

    // Verify authorized email record was updated with registration info
    const allAuth = await googleAuthInvitationService.listAuthorizedEmails();
    const authRec = allAuth.find(a => a.id === authorizationId);
    expect(authRec?.invitationStatus).toBe('accepted');
    expect(authRec?.registeredUid).toBe(ownerGoogleUid);
    expect(authRec?.linkedStudioId).toBe(registeredStudioId);
  });

  // Test 11: Invitation cannot be reused
  it('11. Verifies the single-use invitation cannot be reused', async () => {
    const valRes = await googleAuthInvitationService.validateInvitationToken(invitationRawToken);
    expect(valRes.valid).toBe(false);
    expect(valRes.error).toContain('already been used');

    // Attempting to register again fails
    const reAttempt = await googleAuthInvitationService.registerStudioWithOwner(
      invitationRawToken,
      { uid: ownerGoogleUid, email: testGmail, displayName: 'Shiv Patel' },
      { name: 'Duplicate Studio', ownerName: 'Shiv', phone: '123', address: 'addr', city: 'c', state: 's' }
    );
    expect(reAttempt.success).toBe(false);
  });

  // Test 8, 9 & 10: Owner logs out, returns, signs in with Google, and dashboard opens
  it('8, 9 & 10. Owner logs out, returns, clicks Continue with Google, and opens dashboard immediately', async () => {
    // 8. Logout
    await googleAuthInvitationService.logout();
    if (typeof localStorage !== 'undefined') {
      expect(localStorage.getItem('studio_os_session_token')).toBeNull();
    }

    // 9. Returns and signs in with same Google account
    const loginRes = await googleAuthInvitationService.loginWithGoogle({
      uid: ownerGoogleUid,
      email: testGmail,
      displayName: 'Shiv Patel'
    });

    // 10. Correct Studio Dashboard opens
    expect(loginRes.success).toBe(true);
    expect(loginRes.role).toBe('owner');
    expect(loginRes.studioId).toBe(registeredStudioId);
    expect(loginRes.targetRoute).toBe('#/app/dashboard');
  });

  // Test 13: Master Admin disables the email and access is blocked
  it('13. Master Admin disables the authorized email and access is immediately blocked', async () => {
    await googleAuthInvitationService.disableAuthorizedEmail(authorizationId, 'Master Admin');

    // Sign in attempt fails
    const loginAttempt = await googleAuthInvitationService.loginWithGoogle({
      uid: ownerGoogleUid,
      email: testGmail,
      displayName: 'Shiv Patel'
    });

    expect(loginAttempt.success).toBe(false);
    expect(loginAttempt.error).toMatch(/disabled|deactivated/i);
  });

  // Test 14: Master Admin enables it again and authorized access works
  it('14. Master Admin enables the email again and authorized access works', async () => {
    await googleAuthInvitationService.enableAuthorizedEmail(authorizationId, 'Master Admin');

    const loginRes = await googleAuthInvitationService.loginWithGoogle({
      uid: ownerGoogleUid,
      email: testGmail,
      displayName: 'Shiv Patel'
    });

    expect(loginRes.success).toBe(true);
    expect(loginRes.role).toBe('owner');
    expect(loginRes.studioId).toBe(registeredStudioId);
  });

  // Test 14b: Master Admin connects Google account jarsaniya.abhay@gmail.com and opens Master Admin panel
  it('14b. Master Admin connects Google account jarsaniya.abhay@gmail.com and opens Master Admin panel', async () => {
    const masterGoogleUid = 'g_uid_abhay_jarsaniya_master';
    const masterEmail = 'jarsaniya.abhay@gmail.com';

    const loginRes = await googleAuthInvitationService.loginWithGoogle({
      uid: masterGoogleUid,
      email: masterEmail,
      displayName: 'Abhay Jarsaniya'
    });

    expect(loginRes.success).toBe(true);
    expect(loginRes.role).toBe('platform_master_admin');
    expect(loginRes.targetRoute).toBe('#/master/dashboard');

    // Verify session in unifiedAuthService
    const masterSession = unifiedAuthService.getMasterSession();
    expect(masterSession).toBeDefined();
    expect(masterSession?.account.accountType).toBe('MASTER_ADMIN');
    expect(masterSession?.account.email.toLowerCase()).toBe(masterEmail.toLowerCase());

    // Verify localStorage tokens are set
    expect(localStorage.getItem('studio_os_master_token')).toBeDefined();
    expect(localStorage.getItem('studio_os_user_role')).toBe('platform_master_admin');
  });

  // Test 15: Employee invitation and Google login work
  it('15. Studio Owner creates an employee Google invitation, and employee registers and logs in', async () => {
    const employeeEmail = `crew.cinematographer.${timestamp}@gmail.com`;
    const employeeUid = `g_uid_${timestamp}_crew_cinematographer`;

    // Studio Owner creates employee invitation
    const empInvite = await googleAuthInvitationService.createEmployeeInvitation(
      registeredStudioId,
      {
        fullName: 'Kiran Cinematographer',
        email: employeeEmail,
        roleId: 'cinematographer',
        roleName: 'Lead Cinematographer',
        department: 'Production',
        mobile: '+91 97234 56789'
      },
      'Shiv Patel'
    );

    expect(empInvite.success).toBe(true);
    expect(empInvite.invitationLink).toBeDefined();

    // Employee registers using Google
    const regEmp = await googleAuthInvitationService.registerEmployeeWithGoogle(
      empInvite.rawToken,
      {
        uid: employeeUid,
        email: employeeEmail,
        displayName: 'Kiran Cinematographer'
      }
    );

    expect(regEmp.success).toBe(true);
    expect(regEmp.studioId).toBe(registeredStudioId);

    // Employee signs in via one-tap Google login
    const empLogin = await googleAuthInvitationService.loginWithGoogle({
      uid: employeeUid,
      email: employeeEmail,
      displayName: 'Kiran Cinematographer'
    });

    expect(empLogin.success).toBe(true);
    expect(empLogin.role).toBe('employee');
    expect(empLogin.studioId).toBe(registeredStudioId);
    expect(empLogin.targetRoute).toBe('#/employee/dashboard');

    // Verify employee cannot log in as Master Admin
    expect(empLogin.role).not.toBe('platform_master_admin');
  });

  // Test 16: Existing studio data remains intact
  it('16. Verifies existing studio records and data remain intact without disruption', () => {
    const allStudios = platformStudioService.listStudios();
    expect(allStudios.length).toBeGreaterThan(0);

    const shreeji = allStudios.find(s => s.id === 'studio_shreeji_films');
    expect(shreeji).toBeDefined();
    expect(shreeji?.name.toUpperCase()).toContain('SHREEJI FILMS');
  });
});
