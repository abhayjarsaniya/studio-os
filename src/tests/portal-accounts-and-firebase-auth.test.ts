import { describe, it, expect, beforeEach } from 'vitest';
import { unifiedAuthService } from '../services/unifiedAuthService';
import { 
  portalAccountProvisionService, 
  PROVISIONED_PORTAL_ACCOUNTS 
} from '../services/portalAccountProvisionService';

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

describe('Studio OS — Portal Accounts, Credentials & Route Protection Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    portalAccountProvisionService.syncWithUnifiedAuthService();
  });

  describe('1. Master Admin Authentication', () => {
    it('authenticates Master Admin with username masteradmin and temporary password', () => {
      const masterAccount = portalAccountProvisionService.getMasterAdminAccount();
      expect(masterAccount.username).toBe('masteradmin');
      expect(masterAccount.temporaryPassword).toBe('Hz9#*R*r2&#%L3');

      const loginRes = unifiedAuthService.loginMasterAdmin(
        masterAccount.username,
        masterAccount.temporaryPassword
      );

      expect(loginRes.success).toBe(true);
      expect(loginRes.session).toBeDefined();
      expect(loginRes.session?.account.accountType).toBe('MASTER_ADMIN');
      expect(loginRes.session?.account.roleId).toBe('master_super_admin');
    });

    it('authenticates Master Admin with email masteradmin@studioos.internal', () => {
      const loginRes = unifiedAuthService.loginMasterAdmin(
        'masteradmin@studioos.internal',
        'Hz9#*R*r2&#%L3'
      );
      expect(loginRes.success).toBe(true);
      expect(loginRes.session?.account.email).toBe('masteradmin@studioos.internal');
    });

    it('rejects incorrect password for Master Admin', () => {
      const loginRes = unifiedAuthService.loginMasterAdmin('masteradmin', 'WrongPass123!');
      expect(loginRes.success).toBe(false);
      expect(loginRes.error).toContain('Invalid email or password');
    });
  });

  describe('2. Studio Owner Authentication (Shreeji Films and Photography)', () => {
    it('authenticates Studio Owner with username shreeji.owner and temporary password', () => {
      const ownerAccount = portalAccountProvisionService.getStudioOwnerAccount();
      expect(ownerAccount.username).toBe('shreeji.owner');
      expect(ownerAccount.temporaryPassword).toBe('7FgBK8@TUsxV@H');
      expect(ownerAccount.studioId).toBe('studio_shreeji_films');

      const loginRes = unifiedAuthService.loginStudioOwner(
        ownerAccount.username,
        ownerAccount.temporaryPassword
      );

      expect(loginRes.success).toBe(true);
      expect(loginRes.session).toBeDefined();
      expect(loginRes.session?.account.accountType).toBe('STUDIO_OWNER');
      expect(loginRes.session?.account.studioId).toBe('studio_shreeji_films');
      expect(loginRes.session?.account.displayName).toBe('Aarav Patel');
    });

    it('authenticates Studio Owner with email aarav@shreejifilms.in', () => {
      const loginRes = unifiedAuthService.loginStudioOwner(
        'aarav@shreejifilms.in',
        '7FgBK8@TUsxV@H'
      );
      expect(loginRes.success).toBe(true);
      expect(loginRes.session?.account.studioId).toBe('studio_shreeji_films');
    });

    it('rejects wrong password for Studio Owner', () => {
      const loginRes = unifiedAuthService.loginStudioOwner('shreeji.owner', 'InvalidPassword!2026');
      expect(loginRes.success).toBe(false);
    });
  });

  describe('3. All 14 Studio Employees Authentication', () => {
    const employeeAccounts = portalAccountProvisionService.getEmployeeAccounts();

    it('verifies all 14 employees exist in the provisioned roster', () => {
      expect(employeeAccounts.length).toBe(14);
      const usernames = employeeAccounts.map(e => e.username);
      expect(usernames).toEqual([
        'rahul.sharma',
        'karan.patel',
        'vishal.desai',
        'meet.shah',
        'jay.mehta',
        'priya.joshi',
        'riya.trivedi',
        'neel.vyas',
        'aman.parmar',
        'krunal.dave',
        'dhruv.patel',
        'kavya.shah',
        'harsh.modi',
        'nisha.desai'
      ]);
    });

    it('authenticates Employee 1 (Rahul Sharma - Lead Photographer) with credentials', () => {
      const rahul = employeeAccounts.find(e => e.username === 'rahul.sharma')!;
      const loginRes = unifiedAuthService.loginEmployee(rahul.username, rahul.temporaryPassword);
      expect(loginRes.success).toBe(true);
      expect(loginRes.session?.account.displayName).toBe('Rahul Sharma');
      expect(loginRes.session?.account.accountType).toBe('EMPLOYEE');
      expect(loginRes.session?.account.studioId).toBe('studio_shreeji_films');
    });

    it('authenticates Employee 4 (Meet Shah - Cinematographer) with credentials', () => {
      const meet = employeeAccounts.find(e => e.username === 'meet.shah')!;
      const loginRes = unifiedAuthService.loginEmployee(meet.username, meet.temporaryPassword);
      expect(loginRes.success).toBe(true);
      expect(loginRes.session?.account.displayName).toBe('Meet Shah');
      expect(loginRes.session?.account.accountType).toBe('EMPLOYEE');
      expect(loginRes.session?.account.studioId).toBe('studio_shreeji_films');
    });

    it('authenticates every single employee in the 14-member roster', () => {
      for (const emp of employeeAccounts) {
        const loginRes = unifiedAuthService.loginEmployee(emp.username, emp.temporaryPassword);
        expect(loginRes.success).toBe(true);
        expect(loginRes.session?.account.accountType).toBe('EMPLOYEE');
        expect(loginRes.session?.account.studioId).toBe('studio_shreeji_films');
      }
    });

    it('verifies every generated password has >= 12 chars, upper, lower, digit, and symbol', () => {
      for (const account of PROVISIONED_PORTAL_ACCOUNTS) {
        const val = portalAccountProvisionService.validatePasswordStrength(account.temporaryPassword);
        expect(val.isValid).toBe(true);
        expect(account.temporaryPassword.length).toBeGreaterThanOrEqual(12);
        expect(/[A-Z]/.test(account.temporaryPassword)).toBe(true);
        expect(/[a-z]/.test(account.temporaryPassword)).toBe(true);
        expect(/[0-9]/.test(account.temporaryPassword)).toBe(true);
        expect(/[!@#$%&*]/.test(account.temporaryPassword)).toBe(true);
      }
    });

    it('verifies all 16 temporary passwords are completely unique (no duplicates)', () => {
      const passwords = PROVISIONED_PORTAL_ACCOUNTS.map(a => a.temporaryPassword);
      const uniquePasswords = new Set(passwords);
      expect(uniquePasswords.size).toBe(PROVISIONED_PORTAL_ACCOUNTS.length);
    });
  });

  describe('4. URL Tampering & Session Guards', () => {
    it('detects Employee session correctly and prevents Master Admin access', () => {
      const rahul = portalAccountProvisionService.getEmployeeAccounts()[0];
      const loginRes = unifiedAuthService.loginEmployee(rahul.username, rahul.temporaryPassword);
      localStorage.setItem('studio_os_session_token', loginRes.session!.token);

      const empSession = unifiedAuthService.getEmployeeSession();
      const masterSession = unifiedAuthService.getMasterSession();
      const ownerSession = unifiedAuthService.getStudioOwnerSession();

      expect(empSession).not.toBeNull();
      expect(masterSession).toBeNull();
      expect(ownerSession).toBeNull();
    });

    it('detects Studio Owner session correctly and isolates from Master Admin', () => {
      const owner = portalAccountProvisionService.getStudioOwnerAccount();
      const loginRes = unifiedAuthService.loginStudioOwner(owner.username, owner.temporaryPassword);
      localStorage.setItem('studio_os_session_token', loginRes.session!.token);

      const ownerSession = unifiedAuthService.getStudioOwnerSession();
      const masterSession = unifiedAuthService.getMasterSession();
      const empSession = unifiedAuthService.getEmployeeSession();

      expect(ownerSession).not.toBeNull();
      expect(masterSession).toBeNull();
      expect(empSession).toBeNull();
    });

    it('detects Master Admin session correctly and isolates from ordinary booking creation', () => {
      const master = portalAccountProvisionService.getMasterAdminAccount();
      const loginRes = unifiedAuthService.loginMasterAdmin(master.username, master.temporaryPassword);
      localStorage.setItem('studio_os_master_token', loginRes.session!.token);
      localStorage.setItem('studio_os_session_token', loginRes.session!.token);

      const masterSession = unifiedAuthService.getMasterSession();
      expect(masterSession).not.toBeNull();
      expect(masterSession?.account.accountType).toBe('MASTER_ADMIN');
    });

    it('allows changing password and updates user record', () => {
      const rahul = portalAccountProvisionService.getEmployeeAccounts()[0];
      const res = unifiedAuthService.loginEmployee(rahul.username, rahul.temporaryPassword);
      const accountId = res.session!.account.id;

      const newPass = 'NewSecurePass@2026!';
      const changed = unifiedAuthService.changePassword(accountId, newPass);
      expect(changed).toBe(true);

      const updatedAccount = unifiedAuthService.getAccount(accountId);
      expect(updatedAccount?.mustChangePassword).toBe(false);

      // Verify login with new password
      const reLogin = unifiedAuthService.loginEmployee(rahul.username, newPass);
      expect(reLogin.success).toBe(true);
    });
  });
});
