import { describe, it, expect, beforeEach } from 'vitest';

// Node/Vitest storage polyfill
if (typeof globalThis.localStorage === 'undefined') {
  const store: Record<string, string> = {};
  globalThis.localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = String(v); },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    length: 0,
    key: () => null
  } as any;
}

import { googleAuthInvitationService } from '../services/googleAuthInvitationService';
import { realAccountProvisionService } from '../services/realAccountProvisionService';
import { platformStudioService } from '../services/platformStudioService';
import { unifiedAuthService } from '../services/unifiedAuthService';
import { TenantStore } from '../services/tenantStore';

describe('Studio OS — Production Authentication Rebuild & Clean Database Suite', () => {
  beforeEach(() => {
    // Clear user session tokens without wiping data store
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('studio_os_session_token');
      localStorage.removeItem('studio_os_master_token');
      localStorage.removeItem('studio_os_user_role');
      localStorage.removeItem('studio_os_active_studio_id_v2');
      localStorage.removeItem('studio_os_active_employee_id');
    }
  });

  it('1. Verifies clean environment: zero demo studios and preserved Master Admin accounts', async () => {
    const studios = platformStudioService.listStudios();
    // Verify no demo studios exist
    expect(studios.some(s => s.id === 'std_demo_royal')).toBe(false);
    expect(studios.some(s => s.id === 'studio_shreeji_films')).toBe(false);

    // Verify Master Admin accounts exist in unifiedAuthService
    const abhayMaster = unifiedAuthService.findAccountByIdentifier('jarsaniya.abhay@gmail.com');
    expect(abhayMaster).toBeDefined();
    expect(abhayMaster?.accountType).toBe('MASTER_ADMIN');
    expect(abhayMaster?.status).toBe('active');

    const adminMaster = unifiedAuthService.findAccountByIdentifier('admin@studio-os.com');
    expect(adminMaster).toBeDefined();
    expect(adminMaster?.accountType).toBe('MASTER_ADMIN');
  });

  it('2. Master Admin creates a new studio with real owner account', async () => {
    const ownerEmail = `owner.test.${Date.now()}@gmail.com`;
    const studioName = 'Apex Cinematic Studio';

    const provisionRes = await realAccountProvisionService.provisionStudioAndOwner({
      name: studioName,
      ownerName: 'Vikas Sharma',
      ownerEmail,
      ownerMobile: '9876543210',
      initialPassword: 'ApexOwner@2026!',
      address: '104 SG Highway',
      city: 'Ahmedabad',
      state: 'Gujarat',
      subscriptionStatus: 'active'
    }, 'Master Admin');

    expect(provisionRes.success).toBe(true);
    expect(provisionRes.studio.id).toBeDefined();
    expect(provisionRes.studio.name).toBe(studioName);
    expect(provisionRes.ownerEmail).toBe(ownerEmail);
    expect(provisionRes.setupLink).toBeDefined();

    // Verify Studio is immediately visible in platform directory
    const allStudios = platformStudioService.listStudios();
    const createdInList = allStudios.find(s => s.id === provisionRes.studio.id);
    expect(createdInList).toBeDefined();
    expect(createdInList?.name).toBe(studioName);

    // Verify owner was automatically added to Authorized Emails registry
    const authorizedList = await googleAuthInvitationService.listAuthorizedEmails();
    const authRecord = authorizedList.find(a => a.email.toLowerCase() === ownerEmail.toLowerCase());
    expect(authRecord).toBeDefined();
    expect(authRecord?.role).toBe('studio_owner');
    expect(authRecord?.status).toBe('enabled');
    expect(authRecord?.allowPasswordLogin).toBe(true);
    expect(authRecord?.allowGoogleLogin).toBe(true);
  });

  it('3. Dual Login Methods: Studio Owner can log in with Email+Password AND Continue with Google', async () => {
    const ownerEmail = `dual.test.${Date.now()}@gmail.com`;
    const password = 'DualSecurePass@2026!';
    const studioName = 'Lumiere Studios';

    const provisionRes = await realAccountProvisionService.provisionStudioAndOwner({
      name: studioName,
      ownerName: 'Rohan Mehta',
      ownerEmail,
      ownerMobile: '9123456789',
      initialPassword: password,
      address: '22 Park Avenue',
      city: 'Surat',
      state: 'Gujarat',
      subscriptionStatus: 'active'
    });

    // Method 1: Email + Password Login
    const passLoginRes = await googleAuthInvitationService.loginWithPassword(ownerEmail, password);
    expect(passLoginRes.success).toBe(true);
    expect(passLoginRes.role).toBe('owner');
    expect(passLoginRes.studioId).toBe(provisionRes.studio.id);
    expect(passLoginRes.targetRoute).toBe('#/app/dashboard');

    // Method 2: Continue with Google Login
    const googleLoginRes = await googleAuthInvitationService.loginWithGoogle({
      uid: provisionRes.authUid,
      email: ownerEmail,
      displayName: 'Rohan Mehta'
    });
    expect(googleLoginRes.success).toBe(true);
    expect(googleLoginRes.role).toBe('owner');
    expect(googleLoginRes.studioId).toBe(provisionRes.studio.id);
    expect(googleLoginRes.targetRoute).toBe('#/app/dashboard');
  });

  it('4. Master Admin disables Google Sign-In: Google login rejected, Password login works', async () => {
    const ownerEmail = `passonly.test.${Date.now()}@gmail.com`;
    const password = 'PassOnlyPass@2026!';

    await realAccountProvisionService.provisionStudioAndOwner({
      name: 'Pass Only Studio',
      ownerName: 'Kunal Verma',
      ownerEmail,
      ownerMobile: '9988776655',
      initialPassword: password,
      address: '77 Ring Road',
      city: 'Rajkot',
      state: 'Gujarat',
      subscriptionStatus: 'active'
    });

    const allAuth = await googleAuthInvitationService.listAuthorizedEmails();
    const authRecord = allAuth.find(a => a.email.toLowerCase() === ownerEmail.toLowerCase())!;
    expect(authRecord).toBeDefined();

    // Master Admin disables Google Login for this email
    await googleAuthInvitationService.toggleGoogleLogin(authRecord.id, false);

    // Attempt Continue with Google
    const googleRes = await googleAuthInvitationService.loginWithGoogle({
      uid: 'uid_pass_only_user',
      email: ownerEmail,
      displayName: 'Kunal Verma'
    });
    expect(googleRes.success).toBe(false);
    expect(googleRes.error).toBe(
      'Google Sign-In has not been enabled for this email by the platform administrator. Please sign in with your email and password or contact your administrator.'
    );

    // Attempt Email + Password Login -> MUST SUCCEED
    const passRes = await googleAuthInvitationService.loginWithPassword(ownerEmail, password);
    expect(passRes.success).toBe(true);
    expect(passRes.targetRoute).toBe('#/app/dashboard');
  });

  it('5. Master Admin disables Password Login: Password login rejected, Google login works', async () => {
    const ownerEmail = `googleonly.test.${Date.now()}@gmail.com`;
    const password = 'GoogleOnlyPass@2026!';

    const provisionRes = await realAccountProvisionService.provisionStudioAndOwner({
      name: 'Google Only Studio',
      ownerName: 'Pooja Bhatt',
      ownerEmail,
      ownerMobile: '9822334455',
      initialPassword: password,
      address: '12 University Road',
      city: 'Vadodara',
      state: 'Gujarat',
      subscriptionStatus: 'active'
    });

    const allAuth = await googleAuthInvitationService.listAuthorizedEmails();
    const authRecord = allAuth.find(a => a.email.toLowerCase() === ownerEmail.toLowerCase())!;
    expect(authRecord).toBeDefined();

    // Master Admin disables Password Login for this email
    await googleAuthInvitationService.togglePasswordLogin(authRecord.id, false);

    // Attempt Password Login -> MUST BE REJECTED WITH EXACT MESSAGE
    const passRes = await googleAuthInvitationService.loginWithPassword(ownerEmail, password);
    expect(passRes.success).toBe(false);
    expect(passRes.error).toBe(
      'Password login has been disabled for this account by the platform administrator. Please use Google Sign-In or contact your administrator.'
    );

    // Attempt Continue with Google -> MUST SUCCEED
    const googleRes = await googleAuthInvitationService.loginWithGoogle({
      uid: provisionRes.authUid,
      email: ownerEmail,
      displayName: 'Pooja Bhatt'
    });
    expect(googleRes.success).toBe(true);
    expect(googleRes.targetRoute).toBe('#/app/dashboard');
  });

  it('6. Deactivation & Reactivation: Disabling account blocks ALL logins immediately, Reactivating restores access', async () => {
    const ownerEmail = `deactivate.test.${Date.now()}@gmail.com`;
    const password = 'DeactPassword@2026!';

    const prov = await realAccountProvisionService.provisionStudioAndOwner({
      name: 'Deact Studio',
      ownerName: 'Manish Dave',
      ownerEmail,
      ownerMobile: '9000011111',
      initialPassword: password,
      address: 'Plot 4, GIDC',
      city: 'Ahmedabad',
      state: 'Gujarat',
      subscriptionStatus: 'active'
    });

    const allAuth = await googleAuthInvitationService.listAuthorizedEmails();
    const authRecord = allAuth.find(a => a.email.toLowerCase() === ownerEmail.toLowerCase())!;
    expect(authRecord).toBeDefined();

    // Master Admin disables the account
    await googleAuthInvitationService.disableAuthorizedEmail(authRecord.id);

    // Password login should be blocked with exact message
    const passRes1 = await googleAuthInvitationService.loginWithPassword(ownerEmail, password);
    expect(passRes1.success).toBe(false);
    expect(passRes1.error).toBe('Your account is currently inactive. Please contact the platform administrator to reactivate your access.');

    // Google login should also be blocked with exact message
    const googleRes1 = await googleAuthInvitationService.loginWithGoogle({
      uid: prov.authUid,
      email: ownerEmail,
      displayName: 'Manish Dave'
    });
    expect(googleRes1.success).toBe(false);
    expect(googleRes1.error).toBe('Your account is currently inactive. Please contact the platform administrator to reactivate your access.');

    // Master Admin reactivates the account
    await googleAuthInvitationService.enableAuthorizedEmail(authRecord.id);

    // Both logins should now succeed without recreating account or losing studio data
    const passRes2 = await googleAuthInvitationService.loginWithPassword(ownerEmail, password);
    expect(passRes2.success).toBe(true);
    expect(passRes2.studioId).toBe(prov.studio.id);

    const googleRes2 = await googleAuthInvitationService.loginWithGoogle({
      uid: prov.authUid,
      email: ownerEmail,
      displayName: 'Manish Dave'
    });
    expect(googleRes2.success).toBe(true);
    expect(googleRes2.studioId).toBe(prov.studio.id);
  });

  it('7. Studio Owner adds Employee and Employee logs in with permitted methods', async () => {
    const ownerEmail = `owner.emp.test.${Date.now()}@gmail.com`;
    const empEmail = `crew.test.${Date.now()}@gmail.com`;
    const empPassword = 'CrewMember@2026!';

    const provStudio = await realAccountProvisionService.provisionStudioAndOwner({
      name: 'Crew Vision Studio',
      ownerName: 'Harshil Shah',
      ownerEmail,
      ownerMobile: '9111122222',
      initialPassword: 'OwnerPass@2026!',
      address: 'Main Road',
      city: 'Ahmedabad',
      state: 'Gujarat'
    });

    // Provision employee
    const provEmp = await realAccountProvisionService.provisionEmployeeAccount(provStudio.studio.id, {
      fullName: 'Aarav Cinematographer',
      email: empEmail,
      mobile: '9333344444',
      roleId: 'cinematographer',
      roleName: 'Lead Cinematographer',
      department: 'Camera',
      initialPassword: empPassword
    });

    expect(provEmp.success).toBe(true);
    expect(provEmp.employee.studioId).toBe(provStudio.studio.id);

    // Employee logs in with Password
    const empPassRes = await googleAuthInvitationService.loginWithPassword(empEmail, empPassword);
    expect(empPassRes.success).toBe(true);
    expect(empPassRes.role).toBe('employee');
    expect(empPassRes.studioId).toBe(provStudio.studio.id);
    expect(empPassRes.targetRoute).toBe('#/employee/dashboard');

    // Employee logs in with Google
    const empGoogleRes = await googleAuthInvitationService.loginWithGoogle({
      uid: provEmp.authUid,
      email: empEmail,
      displayName: 'Aarav Cinematographer'
    });
    expect(empGoogleRes.success).toBe(true);
    expect(empGoogleRes.role).toBe('employee');
    expect(empGoogleRes.targetRoute).toBe('#/employee/dashboard');
  });

  it('8. Rejects unauthorized Google accounts cleanly', async () => {
    const unauthorizedEmail = `random.stranger.${Date.now()}@gmail.com`;
    const res = await googleAuthInvitationService.loginWithGoogle({
      uid: 'random_uid_999',
      email: unauthorizedEmail,
      displayName: 'Random Person'
    });

    expect(res.success).toBe(false);
    expect(res.error).toBe(
      `This Google account (${unauthorizedEmail}) is not authorized to access Studio OS. Please contact Master Admin or your Studio Administrator for an invitation link.`
    );
  });

  it('9. Master Admin logs in via Google with jarsaniya.abhay@gmail.com directly into Master Admin Portal', async () => {
    const masterGoogleUser = {
      uid: 'mmrIcufwmoQ4JawzKd0pbgjNRsx2',
      email: 'jarsaniya.abhay@gmail.com',
      displayName: 'Abhay Jarsaniya'
    };

    const res = await googleAuthInvitationService.loginWithGoogle(masterGoogleUser);
    expect(res.success).toBe(true);
    expect(res.role).toBe('platform_master_admin');
    expect(res.targetRoute).toBe('#/master/dashboard');

    // Verify session in unifiedAuthService
    const masterSession = unifiedAuthService.getMasterSession();
    expect(masterSession).toBeDefined();
    expect(masterSession?.account?.accountType).toBe('MASTER_ADMIN');
  });
});
