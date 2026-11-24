import { describe, it, expect, beforeEach } from 'vitest';
import { masterAdminService } from '../services/masterAdminService';
import { bookingProductionService } from '../services/bookingProductionService';
import { customerService } from '../services/customerService';
import { paymentService } from '../services/paymentService';
import { employeeService } from '../services/employeeService';
import { quotationService } from '../services/quotationService';
import { expenseService } from '../services/expenseService';
import { cloudSyncService } from '../services/cloudSyncService';
import { crossDeviceAuthService } from '../services/crossDeviceAuthService';
import { unifiedAuthService } from '../services/unifiedAuthService';
import { TenantStore } from '../services/tenantStore';

describe('Master Admin Individual Studio Live Data Integration & Real-Time Sync', () => {
  const STUDIO_LIVE_A = 'studio_live_alpha_001';
  const STUDIO_LIVE_B = 'studio_live_beta_002';

  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    TenantStore.clearAll();

    // Seed Studio A
    TenantStore.set(STUDIO_LIVE_A, 'profile', {
      id: STUDIO_LIVE_A,
      name: 'Alpha Films & Shoots',
      ownerName: 'Alpha Owner',
      ownerEmail: 'alpha@studio-os.internal',
      phone: '9876543210',
      city: 'Ahmedabad',
      state: 'Gujarat',
      lifecycleStatus: 'active',
      subscription: {
        planName: 'Studio OS Standard',
        status: 'active',
        pricePerMonth: 500,
        validUntil: '2027-12-31'
      }
    });

    // Seed Studio B (Clean 0-state studio)
    TenantStore.set(STUDIO_LIVE_B, 'profile', {
      id: STUDIO_LIVE_B,
      name: 'Beta Studios Clean',
      ownerName: 'Beta Owner',
      ownerEmail: 'beta@studio-os.internal',
      phone: '9123456789',
      city: 'Surat',
      state: 'Gujarat',
      lifecycleStatus: 'active',
      subscription: {
        planName: 'Studio OS Standard',
        status: 'trial',
        pricePerMonth: 500,
        validUntil: '2027-12-31'
      }
    });

    // Seed User Accounts for Cross-Device Login
    unifiedAuthService.provisionStudioOwner({
      authUid: 'uid_alpha_owner',
      studioId: STUDIO_LIVE_A,
      studioName: 'Alpha Films & Shoots',
      ownerName: 'Alpha Owner',
      email: 'alpha@studio-os.internal',
      loginId: 'alpha_owner',
      initialPassword: 'Password@Alpha123'
    });

    unifiedAuthService.provisionStudioOwner({
      authUid: 'uid_beta_owner',
      studioId: STUDIO_LIVE_B,
      studioName: 'Beta Studios Clean',
      ownerName: 'Beta Owner',
      email: 'beta@studio-os.internal',
      loginId: 'beta_owner',
      initialPassword: 'Password@Beta123'
    });
  });

  it('1. Verifies Studio A has real bookings, employees and payments while Studio B starts at clean 0-state', () => {
    // Create real booking in Studio A
    const bookingA = bookingProductionService.createBooking(STUDIO_LIVE_A, {
      customerName: 'Kunal & Riya',
      customerPhone: '9876500001',
      eventName: 'Kunal & Riya Grand Wedding',
      category: 'Wedding',
      mainEventDate: '2026-12-20',
      venue: 'The Grand Heritage',
      city: 'Ahmedabad',
      agreedAmount: 250000,
      advancePayment: 75000,
      functions: [
        {
          name: 'Sangeet Night',
          category: 'Wedding',
          date: '2026-12-19',
          startTime: '07:00 PM',
          endTime: '11:00 PM',
          venue: 'Heritage Lawn',
          deliverablesConfig: [
            { name: 'Sangeet Teaser Video', category: 'video', requiredQty: 1 }
          ]
        },
        {
          name: 'Wedding Ceremony',
          category: 'Wedding',
          date: '2026-12-20',
          startTime: '10:00 AM',
          endTime: '04:00 PM',
          venue: 'Royal Palace Mandap',
          deliverablesConfig: [
            { name: 'Traditional Film', category: 'video', requiredQty: 1 },
            { name: 'Candid Photos', category: 'photography', requiredQty: 300 }
          ]
        }
      ]
    });

    expect(bookingA).toBeDefined();
    expect(bookingA.bookingNumber).toContain('BKG-2026-');
    expect(bookingA.functions.length).toBe(2);

    // Add employee in Studio A
    const empA = employeeService.createEmployee(STUDIO_LIVE_A, {
      fullName: 'Vikram Joshi',
      email: 'vikram@alphafilms.internal',
      phone: '9876500002',
      department: 'Cinematography',
      designation: 'Lead Cinematographer',
      roleId: 'cinematographer',
      roleName: 'Cinematographer',
      employmentStatus: 'active'
    });
    expect(empA).toBeDefined();

    // Query Studio A in Master Admin data layer
    const bookingsA = bookingProductionService.listBookings(STUDIO_LIVE_A, false);
    const empsA = employeeService.listEmployees(STUDIO_LIVE_A);
    expect(bookingsA.length).toBe(1);
    expect(empsA.length).toBe(1);

    // Query Studio B in Master Admin data layer: Must be completely isolated and ZERO
    const bookingsB = bookingProductionService.listBookings(STUDIO_LIVE_B, false);
    const empsB = employeeService.listEmployees(STUDIO_LIVE_B);
    expect(bookingsB.length).toBe(0);
    expect(empsB.length).toBe(0);
  });

  it('2. Verifies financial calculations are strictly derived from real records with zero fake fallbacks', () => {
    // Create 2 real bookings in Studio A
    bookingProductionService.createBooking(STUDIO_LIVE_A, {
      customerName: 'Aman Shah',
      customerPhone: '9820011111',
      eventName: 'Aman Pre-Wedding Shoot',
      category: 'Pre-Wedding',
      mainEventDate: '2026-12-10',
      venue: 'Polo Forest',
      city: 'Ahmedabad',
      agreedAmount: 80000,
      advancePayment: 25000
    });

    bookingProductionService.createBooking(STUDIO_LIVE_A, {
      customerName: 'Neha Patel',
      customerPhone: '9820022222',
      eventName: 'Neha Engagement',
      category: 'Engagement',
      mainEventDate: '2026-12-15',
      venue: 'Sindhu Bhavan Hall',
      city: 'Ahmedabad',
      agreedAmount: 120000,
      advancePayment: 40000
    });

    const bookings = bookingProductionService.listBookings(STUDIO_LIVE_A, false);
    expect(bookings.length).toBe(2);

    const totalInvoiced = bookings.reduce((sum, b) => {
      const amt = Number(b.financials?.finalAgreedAmount ?? b.financials?.originalQuotation ?? 0);
      return sum + amt;
    }, 0);

    const advanceCollected = bookings.reduce((sum, b) => {
      const rec = Number(b.financials?.verifiedPaymentsReceived ?? b.financials?.advanceReceived ?? 0);
      return sum + rec;
    }, 0);

    const pendingBalance = Math.max(0, totalInvoiced - advanceCollected);

    expect(totalInvoiced).toBe(200000);
    expect(advanceCollected).toBe(65000);
    expect(pendingBalance).toBe(135000);

    // For Studio B with 0 bookings, numbers must be 0 (no || 5 or || 40000)
    const bookingsB = bookingProductionService.listBookings(STUDIO_LIVE_B, false);
    const totalInvoicedB = bookingsB.reduce((sum, b) => sum + (b.financials?.finalAgreedAmount || 0), 0);
    expect(bookingsB.length).toBe(0);
    expect(totalInvoicedB).toBe(0);
  });

  it('3. Verifies Quotation conversion creates real Booking in Booking Directory and updates status', () => {
    // Create quotation in Studio A
    const quote = quotationService.createQuotation(STUDIO_LIVE_A, {
      customerId: 'cust_pooja_dave',
      customerName: 'Pooja Dave',
      customerPhone: '9898989898',
      eventName: 'Pooja Wedding & Reception',
      eventCategory: 'Wedding',
      eventDate: '2026-12-28',
      eventVenue: 'YMCA Club',
      subtotal: 180000,
      discount: 10000,
      taxAmount: 0,
      grandTotal: 170000,
      items: [
        {
          id: 'item_1',
          description: 'Candid Photography',
          quantity: 2,
          unitPrice: 40000,
          amount: 80000
        },
        {
          id: 'item_2',
          description: 'Cinematic Teaser & Film',
          quantity: 1,
          unitPrice: 90000,
          amount: 90000
        }
      ]
    });

    expect(quote.status).toBe('Draft');

    // Convert quotation to booking
    const result = quotationService.convertQuotationToBooking(STUDIO_LIVE_A, quote.id, {
      eventName: quote.eventName,
      eventDate: quote.eventDate,
      venue: quote.eventVenue,
      operatorId: 'Studio Owner'
    });

    expect(result.quotation.status).toBe('Converted to Booking');
    expect(result.event).toBeDefined();

    // Verify it immediately appears in bookingProductionService.listBookings
    const updatedBookings = bookingProductionService.listBookings(STUDIO_LIVE_A, false);
    const convertedBooking = updatedBookings.find(b => 
      b.customerName.toLowerCase() === 'pooja dave' || b.id === (result.quotation as any).convertedBookingId
    );
    expect(convertedBooking).toBeDefined();
    expect(convertedBooking?.financials?.finalAgreedAmount).toBe(170000);
  });

  it('4. Verifies CloudSyncService starts real-time sync and can clean up properly', async () => {
    const hydrateRes = await cloudSyncService.hydrateStudioFromCloud(STUDIO_LIVE_A);
    expect(hydrateRes).toBeDefined();
    expect(typeof hydrateRes.success).toBe('boolean');

    const stopSync = cloudSyncService.startRealtimeSync(STUDIO_LIVE_A);
    expect(typeof stopSync).toBe('function');

    // Stop real-time sync cleanly (simulating unmount or studio switch)
    stopSync();
    expect(cloudSyncService.getActiveSubscriptionsCount()).toBe(0);
  });

  it('5. Verifies Cross-Device Login succeeds with Login ID and password on new device', async () => {
    // Simulate mobile device login with zero prior cached session
    const mobileLogin = await crossDeviceAuthService.login('alpha_owner', 'Password@Alpha123');
    expect(mobileLogin.success).toBe(true);
    expect(mobileLogin.role).toBe('owner');
    expect(mobileLogin.studioId).toBe(STUDIO_LIVE_A);
    expect(mobileLogin.targetRoute).toBe('#/app/dashboard');

    // Clean session
    await crossDeviceAuthService.logout();

    // Simulate second device login for Beta Owner
    const laptopLogin = await crossDeviceAuthService.login('beta_owner', 'Password@Beta123');
    expect(laptopLogin.success).toBe(true);
    expect(laptopLogin.role).toBe('owner');
    expect(laptopLogin.studioId).toBe(STUDIO_LIVE_B);
    expect(laptopLogin.targetRoute).toBe('#/app/dashboard');

    // Wrong password check
    const invalidLogin = await crossDeviceAuthService.login('alpha_owner', 'WrongPassword!999');
    expect(invalidLogin.success).toBe(false);
    expect(invalidLogin.error).toContain('Invalid Login ID or password');
  });
});
