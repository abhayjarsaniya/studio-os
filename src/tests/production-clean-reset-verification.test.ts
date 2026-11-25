import { describe, it, expect, beforeEach } from 'vitest';
import { firebaseAuthService } from '../services/firebaseAuthService';
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

describe('Studio OS — Production Clean Reset & Master Admin Verification', () => {
  beforeEach(() => {
    (globalThis as any).localStorage.clear();
  });

  it('1. Master Admin jarsaniya.abhay@gmail.com logs in with Google OAuth and is directed to #/master/dashboard', async () => {
    const masterGoogleUser = {
      uid: 'mmrIcufwmoQ4JawzKd0pbgjNRsx2',
      email: 'jarsaniya.abhay@gmail.com',
      displayName: 'Abhay Jarsaniya',
      photoURL: 'https://lh3.googleusercontent.com/a/ACg8ocJPHbGLL3cdwOs5h_qteRa4Xynqnm71qYd4iMA1c4xUxLeVpWv3DQ=s96-c'
    };

    const result = await firebaseAuthService.loginMasterAdminWithGoogle(masterGoogleUser);

    expect(result.success).toBe(true);
    expect(result.role).toBe('platform_master_admin');
    expect(result.targetRoute).toBe('#/master/dashboard');
    expect((globalThis as any).localStorage.getItem('studio_os_user_role')).toBe('platform_master_admin');
    expect((globalThis as any).localStorage.getItem('studio_os_master_token')).toBeTruthy();
  });

  it('2. Unauthorized arbitrary Google user is rejected with clear error', async () => {
    const unauthorizedUser = {
      uid: 'random_uid_99999',
      email: 'unauthorized.user@gmail.com',
      displayName: 'Random User'
    };

    const result = await firebaseAuthService.loginMasterAdminWithGoogle(unauthorizedUser);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Google Sign-In is exclusively reserved for Platform Master Admin');
    expect((globalThis as any).localStorage.getItem('studio_os_master_token')).toBeNull();
  });

  it('3. Deleted legacy test accounts (e.g. demo owners, crew members) cannot log in', async () => {
    const deletedUser = {
      uid: 'BA8VvStAcUeLBJDCdAikUBYZcnk1',
      email: 'owner.emp.test.1795265306853@gmail.com',
      displayName: 'Former Owner'
    };

    const result = await firebaseAuthService.loginMasterAdminWithGoogle(deletedUser);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Google Sign-In is exclusively reserved for Platform Master Admin');
  });

  it('4. Master Admin user profile in TenantStore and unifiedAuthService has Master Super Admin permissions', () => {
    const master = unifiedAuthService.findAccountByIdentifier('jarsaniya.abhay@gmail.com');
    expect(master).toBeDefined();
    expect(master?.accountType).toBe('MASTER_ADMIN');
    expect(master?.roleId).toBe('master_super_admin');
  });
});
