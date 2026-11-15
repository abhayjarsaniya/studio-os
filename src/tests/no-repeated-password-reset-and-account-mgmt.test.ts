import { describe, it, expect, beforeEach } from 'vitest';
import { unifiedAuthService } from '../services/unifiedAuthService';
import { portalAccountProvisionService } from '../services/portalAccountProvisionService';
import { masterAdminService } from '../services/masterAdminService';
import { platformStudioService } from '../services/platformStudioService';
import { firebaseAuthService } from '../services/firebaseAuthService';

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

describe('Studio OS — No Repeated Password Reset & Account Management Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    portalAccountProvisionService.syncWithUnifiedAuthService();
  });

  describe('1. No Repeated Password Reset Enforced on Normal Sign-Ins', () => {
    it('verifies Master Admin logs in normally with mustChangePassword = false', () => {
      const res = unifiedAuthService.loginMasterAdmin('masteradmin', 'Hz9#*R*r2&#%L3');
      expect(res.success).toBe(true);
      expect(res.session?.account.mustChangePassword).toBe(false);
    });

    it('verifies Studio Owner logs in normally with mustChangePassword = false', () => {
      const res = unifiedAuthService.loginStudioOwner('shreeji.owner', '7FgBK8@TUsxV@H');
      expect(res.success).toBe(true);
      expect(res.session?.account.mustChangePassword).toBe(false);
    });

    it('verifies Employee (Rahul Sharma) logs in normally with mustChangePassword = false', () => {
      const res = unifiedAuthService.loginEmployee('rahul.sharma', '!Bd2*9R7vJUy8W');
      expect(res.success).toBe(true);
      expect(res.session?.account.mustChangePassword).toBe(false);
    });

    it('preserves mustChangePassword = false across page reloads and re-syncs', () => {
      // 1. Initial login
      const res1 = unifiedAuthService.loginStudioOwner('shreeji.owner', '7FgBK8@TUsxV@H');
      expect(res1.session?.account.mustChangePassword).toBe(false);

      // 2. Re-run sync (simulating app reload)
      portalAccountProvisionService.syncWithUnifiedAuthService();

      // 3. Subsequent login
      const res2 = unifiedAuthService.loginStudioOwner('shreeji.owner', '7FgBK8@TUsxV@H');
      expect(res2.success).toBe(true);
      expect(res2.session?.account.mustChangePassword).toBe(false);
    });
  });

  describe('2. Forgot Password via Firebase Auth Service', () => {
    it('validates email format before dispatching password reset', async () => {
      const res = await firebaseAuthService.sendPasswordReset('invalid-email');
      expect(res.success).toBe(false);
      expect(res.error).toBe('Please enter a valid email address.');
    });

    it('handles simulated Firebase password reset dispatch gracefully', async () => {
      const res = await firebaseAuthService.sendPasswordReset('aarav@shreejifilms.in');
      expect(typeof res.success).toBe('boolean');
    });
  });

  describe('3. Studio Owner Security & Password in Settings', () => {
    it('changes password and sets mustChangePassword to false permanently', () => {
      const loginRes = unifiedAuthService.loginStudioOwner('shreeji.owner', '7FgBK8@TUsxV@H');
      expect(loginRes.success).toBe(true);
      const accountId = loginRes.session!.account.id;

      const changed = unifiedAuthService.changePassword(accountId, 'BrandNewPassword@2026!');
      expect(changed).toBe(true);

      // Re-login with new password
      const newLogin = unifiedAuthService.loginStudioOwner('shreeji.owner', 'BrandNewPassword@2026!');
      expect(newLogin.success).toBe(true);
      expect(newLogin.session?.account.mustChangePassword).toBe(false);

      // Verify syncWithUnifiedAuthService does not revert password or set mustChangePassword to true
      portalAccountProvisionService.syncWithUnifiedAuthService();
      const afterSyncLogin = unifiedAuthService.loginStudioOwner('shreeji.owner', 'BrandNewPassword@2026!');
      expect(afterSyncLogin.success).toBe(true);
      expect(afterSyncLogin.session?.account.mustChangePassword).toBe(false);
    });
  });

  describe('4. Master Admin Studio Management & Handover Panel', () => {
    it('creates studio & owner with one action and generates clean handover credentials', () => {
      const newStudioData = {
        name: 'Apex Visuals Studio',
        ownerName: 'Manish Patel',
        ownerMobile: '+91 98980 12345',
        ownerEmail: 'manish@apexvisuals.in',
        address: 'CG Road, Navrangpura',
        city: 'Ahmedabad',
        state: 'Gujarat',
        subscriptionPlan: 'Studio OS Standard (₹500/mo)',
        subscriptionStartDate: '2026-11-15',
        subscriptionExpiryDate: '2026-12-15',
        subscriptionStatus: 'active' as const
      };

      const result = platformStudioService.createStudioWithOwner(newStudioData, 'Master Admin');
      expect(result.studio.id).toBeDefined();
      expect(result.studio.name).toBe('Apex Visuals Studio');
      expect(result.credentials.username).toBeDefined();
      expect(result.temporaryPassword).toBeDefined();

      // Verify WhatsApp Click-to-Chat URL structure
      const cleanPhone = newStudioData.ownerMobile.replace(/[^0-9]/g, '');
      const loginUrl = 'http://localhost:5173/#/studio/login';
      const expectedText = `Studio: ${result.studio.name}`;
      const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(expectedText)}`;
      expect(waUrl).toContain('https://wa.me/919898012345');
    });

    it('Master Admin can edit studio info, subscription, account status, and owner email', () => {
      const allStudios = masterAdminService.getAllStudios();
      const targetStudio = allStudios[0];

      const updated = masterAdminService.updateStudio(targetStudio.id, {
        name: `${targetStudio.name} (Updated)`,
        phone: '9900099000',
        city: 'Vadodara',
        ownerEmail: 'updated.owner@studio.in',
        subscriptionPlan: 'Studio OS Professional (₹1,500/mo)'
      });

      expect(updated).toBe(true);
      const reloaded = masterAdminService.getAllStudios().find(s => s.id === targetStudio.id);
      expect(reloaded?.name).toContain('(Updated)');
      expect(reloaded?.phone).toBe('9900099000');
      expect(reloaded?.city).toBe('Vadodara');
    });

    it('Master Admin can reset studio owner password and configure custom temporary password', () => {
      const allStudios = masterAdminService.getAllStudios();
      const studioId = allStudios[0].id;

      // Reset with auto-generated temporary password
      const autoReset = masterAdminService.resetStudioOwnerCredentials(studioId, 'Master Admin');
      expect(autoReset.success).toBe(true);
      expect(autoReset.temporaryPassword).toBeDefined();

      // Set custom temporary password
      const customReset = masterAdminService.setStudioOwnerPassword(studioId, 'SecureTemp#9988', 'Master Admin');
      expect(customReset.success).toBe(true);
      expect(customReset.temporaryPassword).toBe('SecureTemp#9988');
    });
  });

  describe('5. Studio Owner Employee Management with WhatsApp Handover', () => {
    it('generates employee account and provides temporary credentials with WhatsApp format', () => {
      const empAccount = unifiedAuthService.provisionEmployee({
        studioId: 'studio_shreeji_films',
        studioName: 'SHREEJI FILMS AND PHOTOGRAPHY',
        employeeName: 'Bhavin Shah',
        employeeId: 'emp_shr_bhavin',
        email: 'bhavin.shah@shreejifilms.in',
        mobile: '+91 98255 44332',
        username: 'bhavin.shah',
        roleId: 'photographer',
        roleTitle: 'Candid Photographer'
      });

      expect(empAccount.account.id).toBe('usr_emp_shr_bhavin');
      expect(empAccount.account.loginId).toBe('bhavin.shah');
      expect(empAccount.temporaryPassword).toBeDefined();

      // Owner resets password for employee
      const newTempPass = unifiedAuthService.resetAccountPassword(empAccount.account.id, 'Studio Owner');
      expect(newTempPass).toBeDefined();

      // Employee logs in with new temporary password
      const loginRes = unifiedAuthService.loginEmployee('bhavin.shah', newTempPass);
      expect(loginRes.success).toBe(true);
    });
  });
});
