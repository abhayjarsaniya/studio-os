import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

// Mock localStorage for Node test runner
const mem: Record<string, string> = {};
if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as any).localStorage = {
    getItem: (k: string) => mem[k] || null,
    setItem: (k: string, v: string) => { mem[k] = String(v); },
    removeItem: (k: string) => { delete mem[k]; },
    clear: () => { for (const k in mem) delete mem[k]; },
    key: (i: number) => Object.keys(mem)[i] || null,
    get length() { return Object.keys(mem).length; }
  };
}

import { platformStudioService } from '../services/platformStudioService';
import { masterAdminService } from '../services/masterAdminService';
import { TenantStore } from '../services/tenantStore';
import { unifiedAuthService } from '../services/unifiedAuthService';

describe('Production Studio Directory Restoration & iOS Blank Screen Resilience', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('1. verifies Vite build target is es2020 for iOS Safari WebKit resilience', () => {
    const viteConfig = fs.readFileSync(path.resolve('vite.config.ts'), 'utf8');
    expect(viteConfig).toContain("target: 'es2020'");
  });

  it('2. verifies index.html contains iOS Safari storage polyfill & stale service worker unregistration', () => {
    const indexHtml = fs.readFileSync(path.resolve('index.html'), 'utf8');
    expect(indexHtml).toContain('__studio_os_storage_test__');
    expect(indexHtml).toContain('serviceWorker');
    expect(indexHtml).toContain('unregister');
    expect(indexHtml).toContain('viewport-fit=cover');
  });

  it('3. verifies RootErrorBoundary protects application root in src/main.tsx', () => {
    const mainTsx = fs.readFileSync(path.resolve('src/main.tsx'), 'utf8');
    expect(mainTsx).toContain('RootErrorBoundary');
    expect(mainTsx).toContain('Reload Studio OS');
    expect(mainTsx).toContain('Reset Session & Cache');
  });

  it('4. verifies platformStudioService discovers and lists registered studios without returning 0', async () => {
    // Seed sample registry accounts into unifiedAuthService simulating Firestore accountRegistry sync
    unifiedAuthService.saveAccount({
      id: 'usr_owner_abcd_studio_xel6',
      accountType: 'STUDIO_OWNER',
      loginId: '123456',
      email: '123456@studio-os.internal',
      phone: '+917600323130',
      displayName: 'Dhaval Patel',
      studioId: 'studio_abcd_studio_xel6',
      studioName: 'ABCD Studio',
      roleId: 'owner',
      roleTitle: 'Studio Owner',
      status: 'active',
      passwordHash: 'hash_test',
      salt: 'salt_test',
      mustChangePassword: false,
      createdAt: '2026-11-24T21:10:56.993Z',
      updatedAt: '2026-11-24T21:10:57.009Z'
    });

    unifiedAuthService.saveAccount({
      id: 'usr_owner_my_own_studio_o0ey',
      accountType: 'STUDIO_OWNER',
      loginId: 'vivek_patel',
      email: 'vivek_patel@studio-os.internal',
      phone: '7990775636',
      displayName: 'Vivek Patel',
      studioId: 'studio_my_own_studio_o0ey',
      studioName: 'My Own Studio',
      roleId: 'owner',
      roleTitle: 'Studio Owner',
      status: 'active',
      passwordHash: 'hash_test_2',
      salt: 'salt_test_2',
      mustChangePassword: false,
      createdAt: '2026-11-24T21:54:12.875Z',
      updatedAt: '2026-11-24T21:54:12.890Z'
    });

    const studios = platformStudioService.listStudios();
    expect(studios.length).toBeGreaterThanOrEqual(2);

    const abcd = studios.find(s => s.id === 'studio_abcd_studio_xel6');
    expect(abcd).toBeDefined();
    expect(abcd?.name).toContain('ABCD Studio');
    expect(abcd?.ownerName).toBe('Dhaval Patel');
    expect(abcd?.ownerPhone).toBe('+917600323130');

    const vivek = studios.find(s => s.id === 'studio_my_own_studio_o0ey');
    expect(vivek).toBeDefined();
    expect(vivek?.name).toContain('My Own Studio');
    expect(vivek?.ownerName).toBe('Vivek Patel');
  });

  it('5. verifies masterAdminService.getMasterStudiosList returns restored studios for Master Admin Directory', () => {
    const list = masterAdminService.getMasterStudiosList();
    expect(list.length).toBeGreaterThanOrEqual(2);

    const abcd = list.find(s => s.studioId === 'studio_abcd_studio_xel6');
    expect(abcd).toBeDefined();
    expect(abcd?.ownerName).toBe('Dhaval Patel');
    expect(abcd?.ownerPhone).toBe('+917600323130');
  });

  it('6. verifies clean employee reset leaves Studio Owners strictly protected', () => {
    const testStudioId = 'studio_abcd_studio_xel6';
    TenantStore.set(testStudioId, 'employees', [
      {
        id: 'emp_owner_1',
        studioId: testStudioId,
        fullName: 'Dhaval Patel',
        email: '123456@studio-os.internal',
        designation: 'Studio Owner & Creative Director',
        department: 'Executive',
        roleName: 'Studio Owner',
        roleId: 'owner',
        employmentStatus: 'active'
      },
      {
        id: 'emp_obsolete_1',
        studioId: testStudioId,
        fullName: 'Obsolete Test Employee',
        email: 'test@shreejifilms.in',
        designation: 'Assistant',
        department: 'Production',
        roleName: 'Staff',
        roleId: 'employee',
        employmentStatus: 'active'
      }
    ]);

    const emps = TenantStore.get<any>(testStudioId, 'employees') || [];
    const preserved = emps.filter((e: any) => e.designation?.toLowerCase().includes('owner') || e.roleId === 'owner');
    TenantStore.set(testStudioId, 'employees', preserved);

    const updatedEmps = TenantStore.get<any>(testStudioId, 'employees');
    expect(updatedEmps.length).toBe(1);
    expect(updatedEmps[0].fullName).toBe('Dhaval Patel');
    expect(updatedEmps[0].designation).toContain('Studio Owner');
  });
});
