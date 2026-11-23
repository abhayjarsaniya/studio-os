import { describe, it, expect, beforeEach } from 'vitest';
import { crossDeviceAuthService } from '../services/crossDeviceAuthService';
import { unifiedAuthService, hashCredential, generateCryptoSalt, UserAccount } from '../services/unifiedAuthService';
import { TenantStore } from '../services/tenantStore';
import { Studio } from '../types/schema';

describe('STUDIO OS — 5-Device Multi-Location Cross-Device Login Audit', () => {
  beforeEach(() => {
    // Reset simulated client device storage before each device simulation
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    TenantStore.initializeDefaults();

    // Seed abhaystudio in unifiedAuthService for Node runner fallback
    const salt = generateCryptoSalt();
    const abhayAccount: UserAccount = {
      id: 'fvz8OiYTsUV0BMqW513PP7dmxru1',
      accountType: 'STUDIO_OWNER',
      roleId: 'owner',
      loginId: 'abhaystudio',
      email: 'abhaystudio@studio-os.internal',
      displayName: 'Abhay Jarsaniya',
      roleTitle: 'Studio Owner',
      studioId: 'studio_dfgfvf_sj7r',
      studioName: 'dfgfvf',
      phone: '+917600323130',
      status: 'active',
      passwordHash: hashCredential('123456', salt),
      salt,
      mustChangePassword: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    unifiedAuthService.saveAccount(abhayAccount);
  });

  // DEVICE 1: Simulated Mobile Device (iPhone 15 Pro, Safari, Location: Mumbai, India)
  it('Device 1 (Mobile iPhone, Mumbai IP): Logs in with abhaystudio and 123456 with ZERO local storage', async () => {
    const loginRes = await crossDeviceAuthService.login('abhaystudio', '123456');
    expect(loginRes.success).toBe(true);
    expect(loginRes.role).toBe('owner');
    expect(loginRes.studioId).toBe('studio_dfgfvf_sj7r');
    expect(loginRes.targetRoute).toBe('#/app/dashboard');
  });

  // DEVICE 2: Simulated Android Phone (Samsung S24, Chrome, Location: New York, USA)
  it('Device 2 (Android Chrome, New York IP): New Studio creation and instant login on fresh device', async () => {
    // Master Admin provisions a new studio "rajeshfilms"
    const salt = generateCryptoSalt();
    const newOwner: UserAccount = {
      id: 'usr_rajesh_99',
      accountType: 'STUDIO_OWNER',
      roleId: 'owner',
      loginId: 'rajeshfilms',
      email: 'rajeshfilms@studio-os.internal',
      displayName: 'Rajesh Mehta',
      roleTitle: 'Studio Owner',
      studioId: 'studio_rajesh_films',
      studioName: 'Rajesh Films Studio',
      phone: '9820112345',
      status: 'active',
      passwordHash: hashCredential('Rajesh#2026', salt),
      salt,
      mustChangePassword: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    unifiedAuthService.saveAccount(newOwner);

    // Simulate Device 2 opening login page with 0 cached session
    if (typeof localStorage !== 'undefined') localStorage.clear();

    const loginRes = await crossDeviceAuthService.login('rajeshfilms', 'Rajesh#2026');
    expect(loginRes.success).toBe(true);
    expect(loginRes.studioId).toBe('studio_rajesh_films');
    expect(loginRes.role).toBe('owner');
    expect(loginRes.targetRoute).toBe('#/app/dashboard');
  });

  // DEVICE 3: Simulated Laptop (MacBook Pro, Safari, Location: London, UK)
  it('Device 3 (MacBook Safari, London IP): Resolves login via email identifier on a fresh machine', async () => {
    if (typeof localStorage !== 'undefined') localStorage.clear();

    const loginRes = await crossDeviceAuthService.login('abhaystudio@studio-os.internal', '123456');
    expect(loginRes.success).toBe(true);
    expect(loginRes.role).toBe('owner');
    expect(loginRes.studioId).toBe('studio_dfgfvf_sj7r');
    expect(loginRes.targetRoute).toBe('#/app/dashboard');
  });

  // DEVICE 4: Simulated Windows PC (Edge, Location: Singapore)
  it('Device 4 (Windows PC, Singapore IP): Immediate login rejection when studio account is suspended', async () => {
    if (typeof localStorage !== 'undefined') localStorage.clear();

    // Deactivate account
    await crossDeviceAuthService.updateStudioAccountStatus('studio_dfgfvf_sj7r', 'suspended');

    const loginRes = await crossDeviceAuthService.login('abhaystudio', '123456');
    expect(loginRes.success).toBe(false);
    expect(loginRes.error).toMatch(/suspended|disabled/i);

    // Restore for other tests
    await crossDeviceAuthService.updateStudioAccountStatus('studio_dfgfvf_sj7r', 'active');
  });

  // DEVICE 5: Simulated iPad Tablet (Mobile Safari, Location: Dubai, UAE)
  it('Device 5 (iPad Tablet, Dubai IP): Password change immediately invalidates old password on fresh device', async () => {
    if (typeof localStorage !== 'undefined') localStorage.clear();

    const acc = unifiedAuthService.findAccountByIdentifier('abhaystudio')!;
    expect(acc).toBeDefined();

    // Master Admin changes password to NewPass#2026
    unifiedAuthService.changePassword(acc.id, 'NewPass#2026');

    // Fresh iPad tries old password -> must fail
    const oldLogin = await crossDeviceAuthService.login('abhaystudio', '123456');
    expect(oldLogin.success).toBe(false);

    // Fresh iPad tries new password -> must succeed
    const newLogin = await crossDeviceAuthService.login('abhaystudio', 'NewPass#2026');
    expect(newLogin.success).toBe(true);
    expect(newLogin.studioId).toBe('studio_dfgfvf_sj7r');
    expect(newLogin.role).toBe('owner');
  });
});
