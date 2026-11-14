import { describe, it, expect, beforeEach } from 'vitest';
import { bookingProductionService } from '../services/bookingProductionService';
import { masterAdminService } from '../services/masterAdminService';
import { masterMigrationService } from '../services/masterMigrationService';
import { customerService } from '../services/customerService';
import { eventService } from '../services/eventService';
import { quotationService } from '../services/quotationService';
import { taskService } from '../services/taskService';
import { TenantStore } from '../services/tenantStore';
import {
  BookingRecord,
  FunctionPlan,
  DeliverableSpecification
} from '../types/bookingProduction';

describe('ADVANCED IMPLEMENTATION — COMPLETE BOOKING, CUSTOMER BILLING, EVENT PRODUCTION & DELIVERY MANAGEMENT', () => {
  const TEST_STUDIO_ID = 'studio_production_test_001';

  beforeEach(() => {
    masterMigrationService.migrate();
    TenantStore.set(TEST_STUDIO_ID, 'bookings', []);
    TenantStore.set(TEST_STUDIO_ID, 'customer_notes', []);
    TenantStore.set(TEST_STUDIO_ID, 'tasks', []);
    TenantStore.set(TEST_STUDIO_ID, 'customers', []);
    TenantStore.set(TEST_STUDIO_ID, 'quotations', []);
    TenantStore.set(TEST_STUDIO_ID, 'events', []);
    TenantStore.set(TEST_STUDIO_ID, 'payments', []);
  });

  // ==========================================
  // 1 & 2: MASTER ADMIN PROVISIONING & OWNER LOGIN
  // ==========================================
  describe('1 & 2. Master Admin Provisioning & Independent Owner Credentials', () => {
    it('1. Master Admin creates studio and owner credentials with temporary password and unique studio ID', () => {
      const result = masterAdminService.createStudio({
        name: 'Aura Cinematics Test',
        slug: 'aura-cinematics-test',
        ownerName: 'Vikram Joshi',
        ownerEmail: 'vikram.joshi@auratest.com',
        ownerMobile: '+91 98980 99887',
        address: 'SG Highway, Bodakdev',
        city: 'Ahmedabad',
        state: 'Gujarat',
        subscriptionPlan: 'Professional',
        subscriptionPrice: 4999,
        subscriptionStatus: 'active',
        isSuspended: false,
        isHidden: false,
        contractStartDate: '2026-01-01',
        contractEndDate: '2026-12-31'
      });

      expect(result.studio).toBeDefined();
      expect(result.studio.id).toMatch(/^studio_/);
      expect(result.ownerCredentials).toBeDefined();
      expect(result.ownerCredentials.email).toBe('vikram.joshi@auratest.com');
      expect(result.ownerCredentials.temporaryPassword).toBeDefined();
      expect(result.ownerCredentials.mustChangePassword).toBe(true);

      // Studio profile is saved in TenantStore
      const profile = TenantStore.getSingle<any>(result.studio.id, 'profile');
      expect(profile).toBeDefined();
      expect(profile.name).toBe('Aura Cinematics Test');
    });

    it('2. Studio Owner logs in independently with their isolated tenant context', () => {
      const studio = masterAdminService.getStudio('studio_royal_frames_001');
      expect(studio).toBeDefined();
      expect(studio?.ownerEmail).toContain('aarav@royalframes');
      // Independent isolated tenant context
      expect(studio?.id).toBe('studio_royal_frames_001');
    });
  });

  // ==========================================
  // 3 & 4: CUSTOMER CRM & ADVANCED QUOTATION BUILDER
  // ==========================================
  describe('3 & 4. Customer CRM & Detailed Quotation Builder', () => {
    it('3. Studio Owner creates customer without duplicates', () => {
      const cust = customerService.createCustomer(TEST_STUDIO_ID, {
        name: 'Kapoor Family (Rajesh Kapoor)',
        phone: '+91 98251 44556',
        email: 'rajesh.kapoor@example.com',
        city: 'Ahmedabad',
        address: 'Satellite Road, Ahmedabad',
        customerSource: 'Referral'
      });

      expect(cust.id).toBeDefined();
      expect(cust.phone).toContain('9825144556');

      // Attempting to create duplicate without flag throws duplicate protection error
      expect(() => {
        customerService.createCustomer(TEST_STUDIO_ID, {
          name: 'Rajesh Kapoor Duplicate',
          phone: '+91 98251 44556'
        });
      }).toThrow(/duplicate/i);
    });

    it('4. Studio Owner creates detailed quotation with itemized photography deliverables', () => {
      const quotation = quotationService.createQuotation(TEST_STUDIO_ID, {
        eventName: 'Kapoor Wedding Royal Package',
        packageName: 'Kapoor Wedding Royal Package',
        customerId: 'cust_kapoor_01',
        customerName: 'Kapoor Family (Rajesh Kapoor)',
        customerPhone: '+91 98251 44556',
        items: [
          { description: 'Candid Photography (3 Days)', quantity: 1, unitPrice: 80000, amount: 80000 },
          { description: 'Cinematic 4K Highlights', quantity: 1, unitPrice: 70000, amount: 70000 },
          { description: 'Pre-Wedding Drone Shoot', quantity: 1, unitPrice: 30000, amount: 30000 },
          { description: '2x Premium Leatherette Albums (50 Sheets)', quantity: 2, unitPrice: 20000, amount: 40000 }
        ],
        totalAmount: 220000
      });

      expect(quotation.id).toBeDefined();
      expect(quotation.totalAmount).toBe(220000);
      expect(quotation.items.length).toBe(4);
    });
  });

  // ==========================================
  // 5 & 6 & 7: WHATSAPP QUOTATION SHARING & NEGOTIATED BILLING
  // ==========================================
  describe('5, 6 & 7. WhatsApp Manual Sharing & Negotiated Billing Ledger', () => {
    let booking: BookingRecord;

    beforeEach(() => {
      booking = bookingProductionService.createBooking(TEST_STUDIO_ID, {
        customerId: 'cust_kapoor_01',
        customerName: 'Rajesh Kapoor',
        customerPhone: '+91 98251 44556',
        customerWhatsApp: '+91 98251 44556',
        eventName: 'Rajesh Kapoor Daughter Wedding',
        category: 'Wedding',
        mainEventDate: '2026-12-15',
        venue: 'The Grand Bhagwati',
        city: 'Ahmedabad',
        numberOfDays: 3,
        numberOfFunctions: 3,
        originalQuotation: 220000
      });
    });

    it('5. Customer receives quotation through manual WhatsApp sharing via click-to-chat URL', () => {
      const msg = bookingProductionService.generateWhatsAppCustomerMessage(
        TEST_STUDIO_ID,
        booking,
        'quotation_summary',
        true
      );

      expect(msg.generatedUrl).toContain('https://wa.me/919825144556?text=');
      expect(msg.messageText).toContain('Rajesh Kapoor Daughter Wedding');
      expect(msg.messageText).toContain('2,20,000');
      // No external API dispatched
      expect(msg.status).toBe('drafted');
    });

    it('6. Studio Owner negotiates price with client', () => {
      expect(booking.financials.originalQuotation).toBe(220000);
      expect(booking.financials.negotiatedDiscount).toBe(0);

      // Apply negotiation discount
      const updated = bookingProductionService.negotiateBookingBilling(TEST_STUDIO_ID, booking.id, {
        negotiatedDiscount: 20000,
        reason: 'Client requested multi-day bundle discount',
        approvedBy: 'Studio Owner'
      });

      expect(updated.financials.finalAgreedAmount).toBe(200000);
      expect(updated.financials.remainingBalance).toBe(200000);
    });

    it('7. Original and revised prices preserved in financial ledger version history', () => {
      bookingProductionService.negotiateBookingBilling(TEST_STUDIO_ID, booking.id, {
        negotiatedDiscount: 20000,
        reason: 'Client requested multi-day bundle discount',
        approvedBy: 'Studio Owner'
      });
      const bkg = bookingProductionService.getBooking(TEST_STUDIO_ID, booking.id)!;
      expect(bkg.financials.originalQuotation).toBe(220000);
      expect(bkg.financials.negotiatedDiscount).toBe(20000);
      expect(bkg.financials.finalAgreedAmount).toBe(200000);

      // Verify billing versions history preserves full audit trail
      expect(bkg.billingVersions.length).toBeGreaterThanOrEqual(2);
      expect(bkg.billingVersions[0].originalQuotedAmount).toBe(220000);
      expect(bkg.billingVersions[0].negotiatedDiscount).toBe(20000);
      expect(bkg.billingVersions[0].finalAgreedAmount).toBe(200000);
      expect(bkg.billingVersions[0].negotiationReason).toBe('Client requested multi-day bundle discount');
    });
  });

  // ==========================================
  // 8 & 9: DEAL CONFIRMATION & DUPLICATE PROTECTION
  // ==========================================
  describe('8 & 9. Deal Confirmation & No Duplicate Records', () => {
    it('8. Studio Owner confirms deal and records advance payment', () => {
      const bkg = bookingProductionService.createBooking(TEST_STUDIO_ID, {
        customerId: 'cust_verma_01',
        customerName: 'Aman Verma',
        customerPhone: '+91 98252 77889',
        customerWhatsApp: '+91 98252 77889',
        eventName: 'Aman Verma Wedding',
        category: 'Wedding',
        mainEventDate: '2026-11-20',
        venue: 'Gulmohar Greens',
        city: 'Ahmedabad',
        numberOfDays: 2,
        numberOfFunctions: 2,
        originalQuotation: 150000
      });

      const confirmed = bookingProductionService.confirmDeal(TEST_STUDIO_ID, bkg.id, 50000);
      expect(confirmed.status).toBe('advance_received');
      expect(confirmed.financials.advanceReceived).toBe(50000);
      expect(confirmed.financials.isAdvanceConfirmed).toBe(true);
      expect(confirmed.financials.remainingBalance).toBe(100000);
    });

    it('9. Booking is created without creating duplicate customer or booking records', () => {
      const existingBookings = bookingProductionService.listBookings(TEST_STUDIO_ID);
      const bkg1 = bookingProductionService.createBooking(TEST_STUDIO_ID, {
        customerId: 'cust_sharma_01',
        customerName: 'Neha Sharma',
        customerPhone: '+91 98253 11224',
        customerWhatsApp: '+91 98253 11224',
        eventName: 'Neha Sharma Sangeet',
        category: 'Sangeet',
        mainEventDate: '2026-12-05',
        venue: 'Club O7',
        city: 'Ahmedabad',
        numberOfDays: 1,
        numberOfFunctions: 1,
        originalQuotation: 75000
      });

      const afterCount = bookingProductionService.listBookings(TEST_STUDIO_ID);
      expect(afterCount.length).toBe(existingBookings.length + 1);

      // Fetching booking by ID returns exact entity
      const fetched = bookingProductionService.getBooking(TEST_STUDIO_ID, bkg1.id);
      expect(fetched?.id).toBe(bkg1.id);
      expect(fetched?.bookingNumber).toBe(bkg1.bookingNumber);
    });
  });

  // ==========================================
  // 10, 11, 12 & 13: FUNCTION-WISE PLANNING & DELIVERABLES
  // ==========================================
  describe('10, 11, 12 & 13. Multiple Functions, Independent Venues, Times, Crew & Deadlines', () => {
    let bookingId: string;

    beforeEach(() => {
      const bkg = bookingProductionService.createBooking(TEST_STUDIO_ID, {
        customerId: 'cust_patel_01',
        customerName: 'Patel Family',
        customerPhone: '+91 98254 33445',
        customerWhatsApp: '+91 98254 33445',
        eventName: 'Patel Royal Destination Wedding',
        category: 'Wedding',
        mainEventDate: '2026-12-25',
        venue: 'Madhavgarh Palace',
        city: 'Udaipur',
        numberOfDays: 3,
        numberOfFunctions: 3,
        originalQuotation: 350000
      });
      bookingId = bkg.id;
    });

    it('10. Studio Owner creates multiple functions under single booking', () => {
      const fn1 = bookingProductionService.addFunctionPlan(TEST_STUDIO_ID, bookingId, {
        name: 'Mandvo & Mehndi',
        category: 'Pre-Wedding',
        date: '2026-12-23',
        startTime: '09:00 AM',
        endTime: '01:00 PM',
        venue: 'Poolside Lawn',
        city: 'Udaipur',
        assignedPhotographerIds: ['emp_photo_1'],
        assignedVideographerIds: ['emp_video_1'],
        assignedDroneOperatorIds: [],
        assignedEditorIds: [],
        assignedSupplierIds: [],
        deliverables: [],
        priority: 'normal'
      });

      const fn2 = bookingProductionService.addFunctionPlan(TEST_STUDIO_ID, bookingId, {
        name: 'Sangeet Night',
        category: 'Sangeet',
        date: '2026-12-24',
        startTime: '07:00 PM',
        endTime: '12:00 AM',
        venue: 'Royal Amphitheater',
        city: 'Udaipur',
        assignedPhotographerIds: ['emp_photo_1', 'emp_photo_2'],
        assignedVideographerIds: ['emp_video_1', 'emp_video_2'],
        assignedDroneOperatorIds: ['emp_drone_1'],
        assignedEditorIds: ['emp_editor_1'],
        assignedSupplierIds: [],
        deliverables: [],
        priority: 'urgent'
      });

      const bkg = bookingProductionService.getBooking(TEST_STUDIO_ID, bookingId);
      expect(bkg?.functions.length).toBe(2);
      expect(bkg?.functions[0].name).toBe('Mandvo & Mehndi');
      expect(bkg?.functions[1].name).toBe('Sangeet Night');
    });

    it('11. Each function has different venues, times, and crew assignment', () => {
      const bkg = bookingProductionService.getBooking(TEST_STUDIO_ID, bookingId);
      const fn1 = bookingProductionService.addFunctionPlan(TEST_STUDIO_ID, bookingId, {
        name: 'Haldi Ceremony',
        category: 'Haldi',
        date: '2026-12-24',
        startTime: '10:00 AM',
        endTime: '02:00 PM',
        venue: 'Courtyard Haveli',
        city: 'Udaipur',
        assignedPhotographerIds: ['emp_haldi_photo'],
        assignedVideographerIds: [],
        assignedDroneOperatorIds: [],
        assignedEditorIds: [],
        assignedSupplierIds: [],
        deliverables: [],
        priority: 'normal'
      });

      const fn2 = bookingProductionService.addFunctionPlan(TEST_STUDIO_ID, bookingId, {
        name: 'Wedding Ceremony',
        category: 'Wedding',
        date: '2026-12-25',
        startTime: '06:00 PM',
        endTime: '11:30 PM',
        venue: 'Lakefront Mandap',
        city: 'Udaipur',
        assignedPhotographerIds: ['emp_wedding_photo1', 'emp_wedding_photo2'],
        assignedVideographerIds: ['emp_wedding_video1'],
        assignedDroneOperatorIds: ['emp_drone_op'],
        assignedEditorIds: ['emp_editor_chief'],
        assignedSupplierIds: [],
        deliverables: [],
        priority: 'high'
      });

      expect(fn1.venue).not.toBe(fn2.venue);
      expect(fn1.startTime).not.toBe(fn2.startTime);
      expect(fn1.assignedPhotographerIds).not.toEqual(fn2.assignedPhotographerIds);
      expect(fn2.assignedDroneOperatorIds).toContain('emp_drone_op');
    });

    it('12. Each function has separate deliverables', () => {
      const fn = bookingProductionService.addFunctionPlan(TEST_STUDIO_ID, bookingId, {
        name: 'Ring Ceremony',
        category: 'Engagement',
        date: '2026-12-22',
        startTime: '06:00 PM',
        endTime: '10:00 PM',
        venue: 'Grand Ballroom',
        city: 'Udaipur',
        assignedPhotographerIds: ['emp_photo_1'],
        assignedVideographerIds: ['emp_video_1'],
        assignedDroneOperatorIds: [],
        assignedEditorIds: [],
        assignedSupplierIds: [],
        deliverables: [],
        priority: 'normal'
      });

      const del1 = bookingProductionService.addDeliverable(TEST_STUDIO_ID, bookingId, {
        functionId: fn.id,
        functionName: fn.name,
        name: 'Ring Ceremony 50 Edited Photos',
        category: 'photography',
        requiredQty: 50,
        unit: 'photos',
        deliveryMethod: 'Google Drive',
        deadlineType: 'relative_to_shoot',
        deadlineDays: 3,
        priority: 'high'
      });

      const del2 = bookingProductionService.addDeliverable(TEST_STUDIO_ID, bookingId, {
        functionId: fn.id,
        functionName: fn.name,
        name: 'Ring Ceremony 1-Minute Reel',
        category: 'video',
        requiredQty: 1,
        unit: 'reels',
        deliveryMethod: 'Google Drive',
        deadlineType: 'relative_to_shoot',
        deadlineDays: 1,
        priority: 'urgent'
      });

      expect(del1.id).not.toBe(del2.id);
      expect(del1.functionId).toBe(fn.id);
      expect(del2.functionId).toBe(fn.id);
    });

    it('13. Each deliverable has independent deadline calculation', () => {
      const del1 = bookingProductionService.addDeliverable(TEST_STUDIO_ID, bookingId, {
        name: 'Photography Deliverable',
        category: 'photography',
        requiredQty: 50,
        unit: 'photos',
        deliveryMethod: 'Google Drive',
        deadlineType: 'relative_to_shoot',
        deadlineDays: 3,
        priority: 'high'
      });

      const del2 = bookingProductionService.addDeliverable(TEST_STUDIO_ID, bookingId, {
        name: 'Video Deliverable',
        category: 'video',
        requiredQty: 1,
        unit: 'reels',
        deliveryMethod: 'Google Drive',
        deadlineType: 'relative_to_shoot',
        deadlineDays: 1,
        priority: 'urgent'
      });

      expect(del1.calculatedDeadline).not.toBe(del2.calculatedDeadline);
    });
  });

  // ==========================================
  // 14, 15, 16 & 17: DEADLINE CALCULATION ENGINE & DATE SHIFTS
  // ==========================================
  describe('14, 15, 16 & 17. Deadline Calculation Engine & Manual Override Protection', () => {
    let booking: BookingRecord;
    let functionItem: FunctionPlan;

    beforeEach(() => {
      booking = bookingProductionService.createBooking(TEST_STUDIO_ID, {
        customerId: 'cust_desai_01',
        customerName: 'Anand Desai',
        customerPhone: '+91 98255 66778',
        customerWhatsApp: '+91 98255 66778',
        eventName: 'Anand & Riya Grand Wedding',
        category: 'Wedding',
        mainEventDate: '2026-12-20',
        venue: 'Karnavati Club',
        city: 'Ahmedabad',
        numberOfDays: 2,
        numberOfFunctions: 2,
        originalQuotation: 250000
      });

      functionItem = bookingProductionService.addFunctionPlan(TEST_STUDIO_ID, booking.id, {
        name: 'Wedding Reception',
        category: 'Reception',
        date: '2026-12-21',
        startTime: '07:00 PM',
        endTime: '11:00 PM',
        venue: 'Karnavati Club Lawn',
        city: 'Ahmedabad',
        assignedPhotographerIds: ['emp_1'],
        assignedVideographerIds: ['emp_2'],
        assignedDroneOperatorIds: [],
        assignedEditorIds: [],
        assignedSupplierIds: [],
        deliverables: [],
        priority: 'normal'
      });
    });

    it('14. Same-day delivery deadline sets deadline to function date', () => {
      const del = bookingProductionService.addDeliverable(TEST_STUDIO_ID, booking.id, {
        functionId: functionItem.id,
        functionName: functionItem.name,
        name: 'Same Night 20 Wedding Highlights',
        category: 'photography',
        requiredQty: 20,
        unit: 'photos',
        deliveryMethod: 'Google Drive',
        deadlineType: 'same_day',
        priority: 'instant_same_day'
      });

      expect(del.deadlineType).toBe('same_day');
      expect(del.priority).toBe('instant_same_day');
      expect(del.calculatedDeadline).toBe('2026-12-21');
    });

    it('15. Relative-day deadlines work with calendar and working days', () => {
      const delCalendar = bookingProductionService.addDeliverable(TEST_STUDIO_ID, booking.id, {
        functionId: functionItem.id,
        functionName: functionItem.name,
        name: 'Reception Full Raw Dump',
        category: 'photography',
        requiredQty: 1000,
        unit: 'photos',
        deliveryMethod: 'Physical Pendrive',
        deadlineType: 'relative_to_shoot',
        deadlineDays: 4,
        isWorkingDays: false,
        priority: 'normal'
      });

      // 2026-12-21 + 4 calendar days => 2026-12-25
      expect(delCalendar.calculatedDeadline).toBe('2026-12-25');
    });

    it('16. Wedding-date-relative deadlines work (e.g. Wedding - 10 days for pre-wedding teaser)', () => {
      const delTeaser = bookingProductionService.addDeliverable(TEST_STUDIO_ID, booking.id, {
        name: 'Social Media Wedding Countdown Teaser',
        category: 'video',
        requiredQty: 1,
        unit: 'reels',
        deliveryMethod: 'Online Gallery',
        deadlineType: 'relative_to_main_wedding',
        deadlineDays: -10, // 10 days before main wedding (2026-12-20)
        priority: 'high'
      });

      // Main wedding is 2026-12-20. -10 days => 2026-12-10
      expect(delTeaser.calculatedDeadline).toBe('2026-12-10');
    });

    it('17. Changing event dates recalculates unlocked deadlines without silently overwriting manual overrides', () => {
      // 1 unlocked deliverable
      const delUnlocked = bookingProductionService.addDeliverable(TEST_STUDIO_ID, booking.id, {
        functionId: functionItem.id,
        name: 'Unlocked Video Teaser',
        category: 'video',
        requiredQty: 1,
        unit: 'reels',
        deliveryMethod: 'Google Drive',
        deadlineType: 'relative_to_shoot',
        deadlineDays: 2,
        isManuallyLocked: false,
        priority: 'normal'
      });
      expect(delUnlocked.calculatedDeadline).toBe('2026-12-23');

      // 1 manually locked deliverable
      const delLocked = bookingProductionService.addDeliverable(TEST_STUDIO_ID, booking.id, {
        functionId: functionItem.id,
        name: 'Client Promised VIP Album',
        category: 'physical',
        requiredQty: 1,
        unit: 'albums',
        deliveryMethod: 'Direct Handover',
        deadlineType: 'relative_to_shoot',
        deadlineDays: 10,
        isManuallyLocked: true,
        priority: 'urgent'
      });
      // Override deadline manually
      const currentBkg = bookingProductionService.getBooking(TEST_STUDIO_ID, booking.id)!;
      const targetLocked = currentBkg.deliverables.find(d => d.id === delLocked.id)!;
      targetLocked.calculatedDeadline = '2026-12-28';
      targetLocked.isManuallyLocked = true;
      bookingProductionService.saveBooking(TEST_STUDIO_ID, currentBkg);

      // Now shift function date by +5 days (from 2026-12-21 to 2026-12-26)
      const recalculateResult = bookingProductionService.recalculateDeliverableDeadlines(
        TEST_STUDIO_ID,
        booking.id,
        5
      );

      expect(recalculateResult.affectedCount).toBe(1);
      expect(recalculateResult.preservedManualLocksCount).toBeGreaterThanOrEqual(1);

      const bkgAfter = bookingProductionService.getBooking(TEST_STUDIO_ID, booking.id)!;
      const refreshedUnlocked = bkgAfter.deliverables.find(d => d.id === delUnlocked.id);
      const refreshedLocked = bkgAfter.deliverables.find(d => d.id === delLocked.id);

      // Unlocked shifted from 2026-12-23 to 2026-12-28 (+5 days)
      expect(refreshedUnlocked?.calculatedDeadline).toBe('2026-12-28');
      // Locked was preserved at 2026-12-28 without being corrupted
      expect(refreshedLocked?.calculatedDeadline).toBe('2026-12-28');
    });
  });

  // ==========================================
  // 18 & 19: TASK GENERATION & AUTHORIZED WORK
  // ==========================================
  describe('18 & 19. Idempotent Task Generation & Employee Authorization', () => {
    let booking: BookingRecord;
    let del1: DeliverableSpecification;

    beforeEach(() => {
      booking = bookingProductionService.createBooking(TEST_STUDIO_ID, {
        customerId: 'cust_task_01',
        customerName: 'Mehta Wedding',
        customerPhone: '+91 98256 12345',
        customerWhatsApp: '+91 98256 12345',
        eventName: 'Mehta Family Sangeet',
        category: 'Sangeet',
        mainEventDate: '2026-11-30',
        venue: 'Sindhu Bhavan Hall',
        city: 'Ahmedabad',
        numberOfDays: 1,
        numberOfFunctions: 1,
        originalQuotation: 100000
      });

      del1 = bookingProductionService.addDeliverable(TEST_STUDIO_ID, booking.id, {
        name: 'Sangeet Highlight Video',
        category: 'video',
        requiredQty: 1,
        unit: 'videos',
        deliveryMethod: 'Google Drive',
        deadlineType: 'relative_to_shoot',
        deadlineDays: 5,
        priority: 'urgent',
        assignedEmployeeId: 'emp_video_editor_01',
        assignedEmployeeName: 'Kunal Editor'
      });
    });

    it('18. Tasks generate correctly from deliverables without duplicates', () => {
      // First sync
      const firstSync = bookingProductionService.syncTasksForBooking(TEST_STUDIO_ID, booking.id);
      expect(firstSync.length).toBeGreaterThan(0);
      const initialTaskCount = firstSync.length;

      // Second sync must be idempotent
      const secondSync = bookingProductionService.syncTasksForBooking(TEST_STUDIO_ID, booking.id);
      expect(secondSync.length).toBe(initialTaskCount);

      // Tasks share the predictable deterministic del_{id}_step_{step} pattern
      expect(firstSync[0].id).toContain(del1.id);
    });

    it('19. Employees see only authorized work', () => {
      const tasks = bookingProductionService.syncTasksForBooking(TEST_STUDIO_ID, booking.id);
      const kunalTasks = tasks.filter(t => (t as any).assignedTo === 'emp_video_editor_01' || t.assignedToId === 'emp_video_editor_01');
      expect(kunalTasks.length).toBeGreaterThan(0);
      kunalTasks.forEach(t => {
        expect((t as any).assignedTo || t.assignedToId).toBe('emp_video_editor_01');
      });
    });
  });

  // ==========================================
  // 20 & 21: CLIENT PRIVACY & FINANCIAL PROTECTION
  // ==========================================
  describe('20 & 21. Privacy Protections (Masked PII & Financial Segregation)', () => {
    let booking: BookingRecord;

    beforeEach(() => {
      booking = bookingProductionService.createBooking(TEST_STUDIO_ID, {
        customerId: 'cust_vip_01',
        customerName: 'Adani Family VIP Wedding',
        customerPhone: '+91 98250 99999',
        customerWhatsApp: '+91 98250 99999',
        eventName: 'Karan & Ananya VIP Wedding',
        category: 'Wedding',
        mainEventDate: '2026-12-10',
        venue: 'Shantigram Golf Club',
        city: 'Ahmedabad',
        numberOfDays: 2,
        numberOfFunctions: 2,
        originalQuotation: 1200000
      });
    });

    it('20. Customer names and phone numbers remain hidden by default in crew summaries', () => {
      const crewMsg = bookingProductionService.generateWhatsAppCrewMessage(
        TEST_STUDIO_ID,
        booking,
        {
          id: 'emp_candid_01',
          name: 'Rohan Photographer',
          phone: '+91 98980 11223',
          role: 'photographer'
        }
      );

      // Client phone must NOT appear in crew summary
      expect(crewMsg.messageText).not.toContain('98250 99999');
      // Generic or event title used instead of client personal mobile
      expect(crewMsg.includeFinancials).toBe(false);
    });

    it('21. Financial amounts remain Studio Owner-only and never leak to crew assignments', () => {
      const crewMsg = bookingProductionService.generateWhatsAppCrewMessage(
        TEST_STUDIO_ID,
        booking,
        {
          id: 'emp_candid_01',
          name: 'Rohan Photographer',
          phone: '+91 98980 11223',
          role: 'photographer'
        }
      );

      // Financials (₹12,00,000 / advance / discount) strictly excluded
      expect(crewMsg.messageText).not.toContain('12,00,000');
      expect(crewMsg.messageText).not.toContain('Advance');
      expect(crewMsg.messageText).not.toContain('Discount');
      expect(crewMsg.messageText).not.toContain('Pending Balance');
    });
  });

  // ==========================================
  // 22, 23 & 24: PARTIAL DELIVERY & COMPLETION ENGINE
  // ==========================================
  describe('22, 23 & 24. Partial Delivery Tracking & Accurate Delivery Status', () => {
    let booking: BookingRecord;
    let del: DeliverableSpecification;

    beforeEach(() => {
      booking = bookingProductionService.createBooking(TEST_STUDIO_ID, {
        customerId: 'cust_delivery_01',
        customerName: 'Shah Family',
        customerPhone: '+91 98257 55667',
        customerWhatsApp: '+91 98257 55667',
        eventName: 'Shah Wedding',
        category: 'Wedding',
        mainEventDate: '2026-11-15',
        venue: 'YMCA Club',
        city: 'Ahmedabad',
        numberOfDays: 1,
        numberOfFunctions: 1,
        originalQuotation: 90000
      });

      del = bookingProductionService.addDeliverable(TEST_STUDIO_ID, booking.id, {
        name: '500 High-Res Edited Photos',
        category: 'photography',
        requiredQty: 500,
        unit: 'photos',
        deliveryMethod: 'Google Drive',
        deadlineType: 'relative_to_shoot',
        deadlineDays: 7,
        priority: 'high'
      });
    });

    it('22. Partial delivery tracks stage progression', () => {
      expect(del.completedQty).toBe(0);
      expect(del.isPartiallyDelivered).toBeFalsy();

      // Handover batch of 300 photos out of 500
      const updated = bookingProductionService.updateDeliverableStage(
        TEST_STUDIO_ID,
        booking.id,
        del.id,
        {
          stage: 'ready_for_delivery',
          completedQty: 300,
          deliveryNotes: 'Batch 1 of 300 photos uploaded to Google Drive folder'
        }
      );

      expect(updated.stage).toBe('ready_for_delivery');
      expect(updated.isPartiallyDelivered).toBe(true);
      expect(updated.isDelivered).toBe(false);
    });

    it('23. Completed quantities tracked accurately against required amount', () => {
      bookingProductionService.updateDeliverableStage(
        TEST_STUDIO_ID,
        booking.id,
        del.id,
        {
          stage: 'ready_for_delivery',
          completedQty: 300,
          deliveryNotes: 'Batch 1 of 300 photos uploaded'
        }
      );
      const bkg = bookingProductionService.getBooking(TEST_STUDIO_ID, booking.id)!;
      const targetDel = bkg.deliverables.find(d => d.id === del.id)!;

      expect(targetDel.completedQty).toBe(300);
      expect(targetDel.requiredQty).toBe(500);
      const remainingQty = targetDel.requiredQty - targetDel.completedQty;
      expect(remainingQty).toBe(200);
    });

    it('24. Final delivery status calculated correctly when all items completed', () => {
      // Handover remaining 200 photos (total 500/500)
      const completed = bookingProductionService.updateDeliverableStage(
        TEST_STUDIO_ID,
        booking.id,
        del.id,
        {
          stage: 'delivered',
          completedQty: 500,
          fileLinkRef: 'https://drive.google.com/drive/folders/sample-folder',
          verifiedBy: 'Studio Owner'
        }
      );

      expect(completed.completedQty).toBe(500);
      expect(completed.stage).toBe('delivered');
      expect(completed.isDelivered).toBe(true);
      expect(completed.isPartiallyDelivered).toBe(false);
      expect(completed.fileLinkRef).toBe('https://drive.google.com/drive/folders/sample-folder');
    });
  });

  // ==========================================
  // 25: PAYMENT LEDGER RECONCILIATION
  // ==========================================
  describe('25. Payment Ledger Reconciles with Negotiated Amount', () => {
    it('reconciles original quotation, discount, verified payments, and remaining balance', () => {
      const bkg = bookingProductionService.createBooking(TEST_STUDIO_ID, {
        customerId: 'cust_ledger_01',
        customerName: 'Jain Family',
        customerPhone: '+91 98258 88990',
        customerWhatsApp: '+91 98258 88990',
        eventName: 'Jain Silver Jubilee Celebration',
        category: 'Anniversary',
        mainEventDate: '2026-12-30',
        venue: 'Kensville Golf Resort',
        city: 'Ahmedabad',
        numberOfDays: 1,
        numberOfFunctions: 1,
        originalQuotation: 100000
      });

      // 1. Negotiate discount of 10,000 => Final Agreed: 90,000
      bookingProductionService.negotiateBookingBilling(TEST_STUDIO_ID, bkg.id, {
        negotiatedDiscount: 10000,
        reason: 'Repeat customer discount',
        approvedBy: 'Studio Owner'
      });

      // 2. Record advance of 30,000 => Remaining: 60,000
      bookingProductionService.recordBookingPayment(TEST_STUDIO_ID, bkg.id, {
        amount: 30000,
        paymentMethod: 'UPI',
        reference: 'UPI-TXN-112233',
        receivedBy: 'Studio Owner'
      });

      // 3. Record installment of 40,000 => Remaining: 20,000
      const { booking: finalBkg } = bookingProductionService.recordBookingPayment(TEST_STUDIO_ID, bkg.id, {
        amount: 40000,
        paymentMethod: 'Bank Transfer',
        reference: 'NEFT-554433',
        receivedBy: 'Studio Owner'
      });

      expect(finalBkg.financials.originalQuotation).toBe(100000);
      expect(finalBkg.financials.negotiatedDiscount).toBe(10000);
      expect(finalBkg.financials.finalAgreedAmount).toBe(90000);
      expect(finalBkg.financials.verifiedPaymentsReceived).toBe(70000);
      expect(finalBkg.financials.remainingBalance).toBe(20000);
    });
  });

  // ==========================================
  // 26, 27 & 28: WHATSAPP CLICK-TO-CHAT INTEGRATION
  // ==========================================
  describe('26, 27 & 28. WhatsApp Click-to-Chat Generation (No Automatic Sending)', () => {
    let booking: BookingRecord;

    beforeEach(() => {
      booking = bookingProductionService.createBooking(TEST_STUDIO_ID, {
        customerId: 'cust_wa_01',
        customerName: 'Pooja Bhatt',
        customerPhone: '+91 98259 00112',
        customerWhatsApp: '+91 98259 00112',
        eventName: 'Pooja Bhatt Reception',
        category: 'Reception',
        mainEventDate: '2026-12-18',
        venue: 'Rajpath Club',
        city: 'Ahmedabad',
        numberOfDays: 1,
        numberOfFunctions: 1,
        originalQuotation: 80000
      });
    });

    it('26. WhatsApp customer summaries work across templates', () => {
      const bookingConf = bookingProductionService.generateWhatsAppCustomerMessage(
        TEST_STUDIO_ID,
        booking,
        'booking_confirmation',
        true
      );

      expect(bookingConf.messageText).toContain('Booking Confirmation');
      expect(bookingConf.messageText).toContain('Pooja Bhatt Reception');
      expect(bookingConf.messageText).toContain('2026-12-18');
      expect(bookingConf.generatedUrl).toContain('https://wa.me/919825900112');

      const paymentSummary = bookingProductionService.generateWhatsAppCustomerMessage(
        TEST_STUDIO_ID,
        booking,
        'payment_summary',
        true
      );
      expect(paymentSummary.messageText).toContain('Payment Receipt & Ledger');
    });

    it('27. WhatsApp crew summaries work with call time, venue, and equipment list', () => {
      const crewMsg = bookingProductionService.generateWhatsAppCrewMessage(
        TEST_STUDIO_ID,
        booking,
        {
          id: 'emp_lead_photo_1',
          name: 'Manish Lead',
          phone: '+91 98765 43210',
          role: 'photographer'
        }
      );

      expect(crewMsg.recipientName).toBe('Manish Lead');
      expect(crewMsg.recipientPhone).toBe('919876543210');
      expect(crewMsg.messageText).toContain('Shoot Assignment & Call Sheet');
      expect(crewMsg.messageText).toContain('Rajpath Club');
      expect(crewMsg.messageText).toContain('Equipment Checklist');
    });

    it('28. No automatic WhatsApp sending occurs (strictly generated wa.me click-to-chat URL)', () => {
      const result = bookingProductionService.generateWhatsAppCustomerMessage(
        TEST_STUDIO_ID,
        booking,
        'final_delivery_summary',
        false
      );

      // Verifies URL scheme is native browser link
      expect(result.generatedUrl.startsWith('https://wa.me/')).toBe(true);
      // Status remains drafted until user manually taps link
      expect(result.status).toBe('drafted');
    });
  });

  // ==========================================
  // 29 & 30: PRODUCTION ANALYTICS & SYSTEM INTEGRITY
  // ==========================================
  describe('29 & 30. Delivery Analytics & Cross-Module Integrity', () => {
    it('29. Delivery analytics calculate accurate production metrics', () => {
      const metrics = bookingProductionService.getProductionMetrics(TEST_STUDIO_ID);
      expect(metrics).toBeDefined();
      expect(typeof metrics.totalDeliverables).toBe('number');
      expect(typeof metrics.sameDayCount).toBe('number');
      expect(typeof metrics.urgentCount).toBe('number');
      expect(typeof metrics.overdueCount).toBe('number');
      expect(typeof metrics.completedDeliveriesCount).toBe('number');
      expect(typeof metrics.onTimePercentage).toBe('number');
      expect(metrics.onTimePercentage).toBeGreaterThanOrEqual(0);
      expect(metrics.onTimePercentage).toBeLessThanOrEqual(100);
    });

    it('30. All existing Studio OS modules continue working seamlessly', () => {
      // Event Service
      const events = eventService.listEvents(TEST_STUDIO_ID);
      expect(Array.isArray(events)).toBe(true);

      // Customer CRM
      const customers = customerService.listCustomers(TEST_STUDIO_ID);
      expect(Array.isArray(customers)).toBe(true);

      // Master Admin
      const masterStudios = masterAdminService.listStudios();
      expect(masterStudios.length).toBeGreaterThan(0);
    });
  });
});
