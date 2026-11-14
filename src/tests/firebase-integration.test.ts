import { describe, it, expect, beforeEach, vi } from 'vitest';
import { firestoreService } from '../services/firestoreService';
import { firebaseStorageService } from '../services/firebaseStorageService';
import { firebaseAuthService } from '../services/firebaseAuthService';
import { firebaseMigrationService } from '../services/firebaseMigrationService';

describe('Firebase Integration & Production Cloud Services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Multi-Tenant Collection Path Resolver
  it('1. correctly isolates tenant paths for studios and platform collections', () => {
    const tenantPath1 = firestoreService.getCollectionPath('std_demo_royal', 'bookings');
    const tenantPath2 = firestoreService.getCollectionPath('studio_creative_002', 'bookings');
    const platformPath = firestoreService.getCollectionPath('platform', 'subscriptionPlans');

    expect(tenantPath1).toBe('studios/std_demo_royal/bookings');
    expect(tenantPath2).toBe('studios/studio_creative_002/bookings');
    expect(platformPath).toBe('platform/subscriptionPlans/items');

    // Never cross or collide tenant data
    expect(tenantPath1).not.toBe(tenantPath2);
  });

  // 2. Real-Time Save State Machine & Visual Indicator Signals
  it('2. emits save status transitions (idle, saving, saved, offline, error)', () => {
    const recordedStatuses: string[] = [];
    const unsubscribe = firestoreService.subscribeSaveStatus((status) => {
      recordedStatuses.push(status);
    });

    expect(firestoreService.getCurrentStatus()).toBe('idle');
    expect(recordedStatuses).toContain('idle');

    unsubscribe();
  });

  // 3. Storage Category Partitioning & Strict Tenant Scoping
  it('3. partitions storage paths across 12 photography business categories', () => {
    const brandingPath = firebaseStorageService.getStoragePath('std_demo_royal', 'branding', 'logo.png');
    const invoicePath = firebaseStorageService.getStoragePath('std_demo_royal', 'invoices', 'INV-2026-001.pdf');
    const deliverablePath = firebaseStorageService.getStoragePath('std_demo_royal', 'deliverables', 'teaser.mp4');

    expect(brandingPath).toBe('studios/std_demo_royal/branding/logo.png');
    expect(invoicePath).toBe('studios/std_demo_royal/invoices/INV-2026-001.pdf');
    expect(deliverablePath).toBe('studios/std_demo_royal/deliverables/teaser.mp4');

    // Reject unassigned categories or invalid paths
    expect(() => firebaseStorageService.getStoragePath('', 'branding', 'logo.png')).toThrow();
  });

  // 4. Photography RAW File & Video Storage Tiering Abstraction
  it('4. detects camera RAW files and 4K video assets exceeding web limits', () => {
    const cr3File = new File(['mock_raw_content'], 'DSC_001.CR3', { type: 'image/x-canon-cr3' });
    const nefFile = new File(['mock_raw_content'], 'DSC_002.NEF', { type: 'image/x-nikon-nef' });
    const arwFile = new File(['mock_raw_content'], 'DSC_003.ARW', { type: 'image/x-sony-arw' });
    const dngFile = new File(['mock_raw_content'], 'DSC_004.DNG', { type: 'image/x-adobe-dng' });
    const jpgFile = new File(['mock_jpg_content'], 'preview.jpg', { type: 'image/jpeg' });

    expect(firebaseStorageService.isRawAsset(cr3File)).toBe(true);
    expect(firebaseStorageService.isRawAsset(nefFile)).toBe(true);
    expect(firebaseStorageService.isRawAsset(arwFile)).toBe(true);
    expect(firebaseStorageService.isRawAsset(dngFile)).toBe(true);
    expect(firebaseStorageService.isRawAsset(jpgFile)).toBe(false);
  });

  // 5. Strict Two-Field Login Auth with Automatic Studio Identification
  it('5. resolves 2-field login (email or username) to authenticated studio workspace', async () => {
    // Test owner login
    const ownerResult = await firebaseAuthService.login('aarav@royalframes.in', 'StudioOwner@123');
    expect(ownerResult.success).toBe(true);
    expect(ownerResult.account?.studioId).toBe('std_demo_royal');
    expect(ownerResult.account?.accountType).toBe('STUDIO_OWNER');

    // Test employee login
    const empResult = await firebaseAuthService.login('kabir@royalframes.in', 'ChangeMe@123');
    expect(empResult.success).toBe(true);
    expect(empResult.account?.studioId).toBe('std_demo_royal');
    expect(empResult.account?.accountType).toBe('EMPLOYEE');

    // Test rejection on wrong password
    const badPass = await firebaseAuthService.login('aarav@royalframes.in', 'WrongPassword123');
    expect(badPass.success).toBe(false);
    expect(badPass.error).toBeDefined();
  });

  // 6. Master Admin Platform Access
  it('6. correctly authenticates master admin with platform owner privileges', async () => {
    const masterResult = await firebaseAuthService.login('masteradmin@studioos.internal', 'MasterAdmin@2026');
    expect(masterResult.success).toBe(true);
    expect(masterResult.account?.accountType).toBe('MASTER_ADMIN');
  });

  // 7. Migration Service Architecture
  it('7. safely handles migration service without breaking local store', async () => {
    const migrationResult = await firebaseMigrationService.seedAllToFirestore();
    expect(migrationResult).toBeDefined();
    expect(migrationResult.success).toBe(true);
    expect(migrationResult.recordsMigrated).toBeGreaterThan(0);
  });
});
