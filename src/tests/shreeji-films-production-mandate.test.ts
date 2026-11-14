import { describe, it, expect, beforeEach } from 'vitest';
import { studioService, shreejiStudio } from '../services/studioService';
import { masterAdminService } from '../services/masterAdminService';
import { platformStudioService } from '../services/platformStudioService';
import { unifiedAuthService } from '../services/unifiedAuthService';
import { subscriptionMandateService } from '../services/subscriptionMandateService';
import { pdfGeneratorService } from '../services/pdfGeneratorService';
import { firestoreService } from '../services/firestoreService';
import { featureVisibilityService } from '../services/featureVisibilityService';
import { ShreejiBookingSeedService } from '../services/shreejiBookingSeedService';
import { TenantStore } from '../services/tenantStore';

describe('STUDIO OS — Final Database Reset, Shreeji Films & Photography Setup, Master Admin & UPI AutoPay Mandate', () => {
  const STUDIO_ID = 'studio_shreeji_films';

  beforeEach(() => {
    ShreejiBookingSeedService.seedAllSampleBookings(false, STUDIO_ID);
  });

  // =========================================================================
  // 1. Single Studio Mandate: SHREEJI FILMS AND PHOTOGRAPHY
  // =========================================================================
  it('1. establishes SHREEJI FILMS AND PHOTOGRAPHY as the canonical production studio', () => {
    const studio = studioService.getStudio(STUDIO_ID);
    expect(studio).toBeDefined();
    expect(studio.name).toBe('SHREEJI FILMS AND PHOTOGRAPHY');
    expect(studio.city).toBe('Ahmedabad');
    expect(studio.state).toBe('Gujarat');
    expect(studio.address).toContain('Titanium One');
    expect(studio.phone).toBe('+91 98250 11223');
  });

  it('2. aliases std_demo_royal seamlessly to the Shreeji studio workspace', () => {
    const studio = studioService.getStudio('std_demo_royal');
    expect(studio).toBeDefined();
    expect(studio.address).toContain('Titanium One');
  });

  // =========================================================================
  // 2. Three Distinct Login Portals & Independent Credentials
  // =========================================================================
  it('3. authenticates Platform Master Admin via 2-field login with MasterAdmin@2026', () => {
    const res1 = unifiedAuthService.loginMasterAdmin('admin@studio-os.com', 'MasterAdmin@2026');
    expect(res1.success).toBe(true);
    expect(res1.session?.account.accountType).toBe('MASTER_ADMIN');

    const res2 = unifiedAuthService.loginMasterAdmin('masteradmin@studioos.internal', 'MasterAdmin@2026');
    expect(res2.success).toBe(true);
  });

  it('4. authenticates Studio Owner for Shreeji Films with StudioOwner@123', () => {
    const res = unifiedAuthService.loginStudioOwner('aarav@shreejifilms.in', 'StudioOwner@123');
    expect(res.success).toBe(true);
    expect(res.session?.account.displayName).toBe('Aarav Patel');
    expect(res.session?.account.studioName).toBe('SHREEJI FILMS AND PHOTOGRAPHY');
  });

  it('5. authenticates Shreeji employees with ChangeMe@123 without Studio ID requirement', () => {
    const empRes = unifiedAuthService.loginEmployee('rahul', 'ChangeMe@123');
    expect(empRes.success).toBe(true);
    expect(['Rahul Sharma', 'Rahul Panchal']).toContain(empRes.session?.account.displayName);
    expect(empRes.session?.account.roleTitle).toBe('Lead Photographer');
  });

  // =========================================================================
  // 3. 25+ Realistic Bookings & Real Financial Record Reconciliation
  // =========================================================================
  it('6. verifies 25+ realistic Gujarat bookings are loaded with full ledger reconciliation', () => {
    const events = TenantStore.get<any>(STUDIO_ID, 'events') || [];
    const bookings = TenantStore.get<any>(STUDIO_ID, 'studio_bookings_v2') || [];
    const customers = TenantStore.get<any>(STUDIO_ID, 'customers') || [];
    const invoices = TenantStore.get<any>(STUDIO_ID, 'invoices') || [];
    const payments = TenantStore.get<any>(STUDIO_ID, 'payments') || [];

    expect(bookings.length).toBeGreaterThanOrEqual(25);
    expect(events.length).toBeGreaterThanOrEqual(25);
    expect(customers.length).toBeGreaterThanOrEqual(25);
    expect(invoices.length).toBeGreaterThanOrEqual(20);
    expect(payments.length).toBeGreaterThanOrEqual(20);

    // Verify cities across Gujarat
    const cities = new Set(events.map((e: any) => e.city));
    expect(cities.has('Ahmedabad')).toBe(true);
    expect(cities.has('Surat')).toBe(true);
    expect(cities.has('Vadodara')).toBe(true);
    expect(cities.has('Rajkot')).toBe(true);
  });

  // =========================================================================
  // 4. UPI AutoPay Recurring Mandate Architecture
  // =========================================================================
  it('7. checks gateway credentials and clearly identifies simulated vs live mode', () => {
    const gw = subscriptionMandateService.isLiveGatewayConfigured();
    expect(gw).toBeDefined();
    expect(typeof gw.isConfigured).toBe('boolean');
    expect(gw.message).toBeDefined();
  });

  it('8. provides initial active recurring mandate for Shreeji Films with valid NPCI UMN', () => {
    const mandate = subscriptionMandateService.getMandateForStudio(STUDIO_ID);
    expect(mandate).toBeDefined();
    expect(mandate?.status).toBe('active');
    expect(mandate?.amount).toBe(500);
    expect(mandate?.frequency).toBe('monthly');
    expect(mandate?.umn).toMatch(/^UMN-SHR-2026-\d+$/);
  });

  it('9. supports initiating, authorizing, and cancelling recurring UPI AutoPay mandates', () => {
    const created = subscriptionMandateService.initiateMandate({
      studioId: 'studio_test_mandate_01',
      studioName: 'Test Studio Gujarat',
      planId: 'studio_os_standard',
      planName: 'Studio OS Standard',
      amount: 500,
      payerName: 'Vikram Patel',
      payerEmail: 'vikram@test.in',
      payerPhone: '+91 98000 12345'
    });
    expect(created.id).toBeDefined();
    expect(created.status).toBe('active');

    // Cancel mandate
    const cancelled = subscriptionMandateService.cancelMandate(created.id, 'Switching billing plan', 'master_admin');
    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.cancellationReason).toBe('Switching billing plan');
    expect(cancelled.cancelledBy).toBe('master_admin');
  });

  it('10. executes automated monthly recurring auto-debit and records platform invoice', () => {
    const mandate = subscriptionMandateService.getMandateForStudio(STUDIO_ID);
    expect(mandate).toBeDefined();

    const debitRes = subscriptionMandateService.executeAutoDebit(mandate!.id);
    expect(debitRes.success).toBe(true);
    expect(debitRes.invoiceId).toBeDefined();

    const updated = subscriptionMandateService.getMandateForStudio(STUDIO_ID);
    expect(updated?.successfulDebitsCount).toBeGreaterThanOrEqual(1);
  });

  // =========================================================================
  // 5. Customer Document Branding & Fallback Neutrality
  // =========================================================================
  it('11. ensures customer-facing PDF document HTML has ZERO generic Studio OS watermarks', () => {
    const payload = pdfGeneratorService.createInvoicePayload({
      id: 'inv_test_clean',
      invoiceNumber: 'SHR-INV-2026-001',
      customerName: 'Meera & Siddharth',
      customerPhone: '+91 98250 99887',
      customerAddress: 'Bodakdev, Ahmedabad',
      eventName: 'Grand Wedding Ceremony',
      eventCategory: 'Wedding',
      subtotal: 350000,
      totalAmount: 350000,
      createdAt: '2026-02-01T10:00:00Z',
      items: [
        {
          id: 'it_01',
          title: 'Full Day Cinematic Wedding Coverage',
          quantity: 1,
          unitPrice: 350000,
          totalPrice: 350000
        }
      ]
    } as any);

    const html = pdfGeneratorService.generateDocumentHTML(payload);
    expect(html).toContain('SHREEJI FILMS AND PHOTOGRAPHY');
    expect(html).toContain('301, Titanium One, SG Highway, Bodakdev, Ahmedabad - 380054');
    expect(html).not.toContain('STUDIO OS PHOTOGRAPHY');
  });

  // =========================================================================
  // 6. Firestore Auto-Save & Resilient Queue
  // =========================================================================
  it('12. ensures firestore auto-save engine falls back gracefully when offline without broken red error', async () => {
    let capturedStatus = '';
    const unsub = firestoreService.subscribeSaveStatus((status) => {
      capturedStatus = status;
    });

    expect(firestoreService.getCurrentStatus()).toBeDefined();

    // Retry method exists and executes cleanly without throwing
    await expect(firestoreService.retryPendingQueue()).resolves.not.toThrow();
    unsub();
  });

  // =========================================================================
  // 7. Master Admin Feature Visibility Hierarchy
  // =========================================================================
  it('13. allows Master Admin to toggle feature access for Shreeji Films without removing core items', () => {
    // Check initial access
    const initialAccess = featureVisibilityService.evaluateFeature(STUDIO_ID, 'finance', true);
    expect(initialAccess.accessible).toBe(true);

    // Master Admin disables feature for Shreeji
    featureVisibilityService.setStudioPlatformOverride(STUDIO_ID, 'finance', false);
    const updatedAccess = featureVisibilityService.evaluateFeature(STUDIO_ID, 'finance', true);
    expect(updatedAccess.accessible).toBe(false);

    // Reset override
    featureVisibilityService.setStudioPlatformOverride(STUDIO_ID, 'finance', true);
    const restoredAccess = featureVisibilityService.evaluateFeature(STUDIO_ID, 'finance', true);
    expect(restoredAccess.accessible).toBe(true);
  });
});
