import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  deriveLoginId,
  normalizeFirestoreAccount,
  MASTER_ADMIN_EMAIL
} from '../services/masterAccountsService';
import fs from 'node:fs';
import path from 'node:path';

describe('Master Accounts Directory — Normalization & Hygiene', () => {
  it('derives clean loginId from @studio-os.internal emails and hides internal domain as contactEmail', () => {
    const studioMap = new Map<string, string>([['studio_demo_1', 'Demo Films']]);

    const normalized = normalizeFirestoreAccount(
      'uid_owner_1',
      {
        email: 'abhaystudio@studio-os.internal',
        displayName: 'Abhay Jarsaniya',
        accountType: 'STUDIO_OWNER',
        studioId: 'studio_demo_1',
        status: 'active',
        phone: '+91 98765 43210'
      },
      studioMap
    );

    expect(normalized.loginId).toBe('abhaystudio');
    expect(normalized.contactEmail).toBe('');
    expect(normalized.studioName).toBe('Demo Films');
    expect(normalized.accountType).toBe('STUDIO_OWNER');
    expect(normalized.status).toBe('active');
  });

  it('preserves real Gmail contactEmail and identifies Master Admin strictly', () => {
    const admin = normalizeFirestoreAccount('mmrIcufwmoQ4JawzKd0pbgjNRsx2', {
      email: MASTER_ADMIN_EMAIL,
      displayName: 'Abhay Jarsaniya',
      accountType: 'MASTER_ADMIN',
      status: 'active'
    });

    expect(admin.accountType).toBe('MASTER_ADMIN');
    expect(admin.loginId).toBe(MASTER_ADMIN_EMAIL);
    expect(admin.contactEmail).toBe(MASTER_ADMIN_EMAIL);
    expect(admin.studioId).toBeNull();
  });

  it('normalizes employee accounts created by Studio Owner and tracks deactivated status', () => {
    const emp = normalizeFirestoreAccount('uid_emp_1', {
      email: 'rahul.editor@gmail.com',
      displayName: 'Rahul Editor',
      accountType: 'EMPLOYEE',
      studioId: 'studio_123',
      studioName: 'Shreeji Studio',
      employeeId: 'emp_001',
      designation: 'Video Editor',
      isActive: false
    });

    expect(emp.accountType).toBe('EMPLOYEE');
    expect(emp.status).toBe('deactivated');
    expect(emp.employeeId).toBe('emp_001');
    expect(emp.roleTitle).toBe('Video Editor');
  });

  it('deriveLoginId prefers explicit loginId over email', () => {
    expect(deriveLoginId({ loginId: 'custom_id', email: 'other@studio-os.internal' })).toBe('custom_id');
    expect(deriveLoginId({ email: '9749797974@studio-os.internal' })).toBe('9749797974');
  });
});

describe('Master Accounts Directory — Security & Code Hygiene', () => {
  it('accountReconciliationService does not reference obsolete Master Admin alias UIDs', () => {
    const filePath = path.resolve(process.cwd(), 'src/services/accountReconciliationService.ts');
    const content = fs.readFileSync(filePath, 'utf8');
    expect(content).not.toContain('CazTsmfHx2h1G45ot6pScMKPZVs2');
    expect(content).not.toContain('UR0EvNxYYxTevIwNdjWC2yjO3nw2');
    expect(content).toContain('mmrIcufwmoQ4JawzKd0pbgjNRsx2');
  });

  it('unifiedAuthService skips demo seeding outside test environments', () => {
    const filePath = path.resolve(process.cwd(), 'src/services/unifiedAuthService.ts');
    const content = fs.readFileSync(filePath, 'utf8');
    expect(content).toContain('if (!isTestEnv)');
    expect(content).toContain('Never seed demo/alias accounts into localStorage in production');
  });

  it('MasterAccountsPage uses text-xs minimum typography (strictly 12px or larger)', () => {
    const pageContent = fs.readFileSync(
      path.resolve(process.cwd(), 'src/pages/master/MasterAccountsPage.tsx'),
      'utf8'
    );
    const modalContent = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/master/AccountDetailModal.tsx'),
      'utf8'
    );
    expect(pageContent).not.toMatch(/text-\[1[01]px\]/);
    expect(modalContent).not.toMatch(/text-\[1[01]px\]/);
  });
});

describe('Master Accounts API — Protection & Authorization Guards', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('api/accounts/delete rejects unauthenticated or non-Master Admin requests with 403', async () => {
    vi.doMock('../../server/lib/razorpayServer', () => ({
      MASTER_ADMIN_EMAIL: 'jarsaniya.abhay@gmail.com',
      verifyFirebaseCaller: vi.fn().mockResolvedValue({ uid: 'someone', email: 'owner@studio.com', isMasterAdmin: false }),
      getFirebaseAdmin: vi.fn()
    }));

    const { default: deleteHandler } = await import('../../server/routes/accounts/delete');
    const res: any = {
      headers: {},
      statusCode: 200,
      body: null,
      setHeader(k: string, v: string) { this.headers[k] = v; },
      status(code: number) { this.statusCode = code; return this; },
      json(data: any) { this.body = data; return this; }
    };

    await deleteHandler({ method: 'POST', body: { uid: 'target_1' } }, res);
    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('api/accounts/delete blocks deleting Master Admin account', async () => {
    const deleteUserMock = vi.fn();
    vi.doMock('../../server/lib/razorpayServer', () => ({
      MASTER_ADMIN_EMAIL: 'jarsaniya.abhay@gmail.com',
      verifyFirebaseCaller: vi.fn().mockResolvedValue({
        uid: 'mmrIcufwmoQ4JawzKd0pbgjNRsx2',
        email: 'jarsaniya.abhay@gmail.com',
        isMasterAdmin: true
      }),
      getFirebaseAdmin: vi.fn().mockReturnValue({
        auth: { deleteUser: deleteUserMock },
        db: { collection: vi.fn() }
      })
    }));

    const { default: deleteHandler } = await import('../../server/routes/accounts/delete');
    const res: any = {
      headers: {},
      statusCode: 200,
      body: null,
      setHeader(k: string, v: string) { this.headers[k] = v; },
      status(code: number) { this.statusCode = code; return this; },
      json(data: any) { this.body = data; return this; }
    };

    await deleteHandler({ method: 'POST', body: { uid: 'mmrIcufwmoQ4JawzKd0pbgjNRsx2' } }, res);
    expect(res.statusCode).toBe(403);
    expect(deleteUserMock).not.toHaveBeenCalled();
  });
});
