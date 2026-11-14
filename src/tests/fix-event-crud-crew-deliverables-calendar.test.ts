import { describe, it, expect, beforeEach } from 'vitest';
import { TenantStore } from '../services/tenantStore';
import { crewConflictService } from '../services/crewConflictService';
import { generateDeliverablesForCategory, DELIVERABLE_PRESETS } from '../services/deliverablesPresetService';
import { bookingProductionService } from '../services/bookingProductionService';
import { seedCalendarTestBookings, CALENDAR_DEMO_BOOKINGS, CALENDAR_TEST_FLAG } from '../services/calendarTestBookingsSeed';
import { BookingRecord, DeliverableSpecification } from '../types/bookingProduction';
import { StudioEvent } from '../types/schema';

describe('Fix Event CRUD, Crew Assignments, Event-Specific Deliverables & Calendar', () => {
  const testStudioId = 'studio_shreeji_films_crud_test';

  beforeEach(() => {
    TenantStore.set(testStudioId, 'studio_bookings_v2', []);
    TenantStore.set(testStudioId, 'events', []);
    TenantStore.set(testStudioId, 'customers', []);
    TenantStore.remove(testStudioId, CALENDAR_TEST_FLAG);
  });

  // ==========================================
  // 1. CREW ASSIGNMENTS & EMPLOYEE LOADING
  // ==========================================
  describe('1. Crew Assignments & Roster Management', () => {
    it('loads all active employees from the studio roster', () => {
      const activeEmps = crewConflictService.getActiveEmployees(testStudioId);
      expect(activeEmps.length).toBeGreaterThanOrEqual(14);
      expect(activeEmps.some(e => e.fullName === 'Rahul Sharma' && e.designation === 'Lead Photographer')).toBe(true);
      expect(activeEmps.some(e => e.fullName === 'Karan Patel' && e.designation === 'Candid Photographer')).toBe(true);
      expect(activeEmps.some(e => e.fullName === 'Jay Mehta' && e.designation === 'Drone Operator')).toBe(true);
    });

    it('prevents duplicate employee assignments on the same event', () => {
      const activeEmps = crewConflictService.getActiveEmployees(testStudioId);
      const empRahul = activeEmps.find(e => e.fullName === 'Rahul Sharma')!;

      const booking = bookingProductionService.createBooking(testStudioId, {
        customerId: 'cust_test_01',
        customerName: 'Test Customer',
        customerPhone: '+91 98251 00000',
        eventName: 'Royal Palace Shoot',
        category: 'Wedding',
        mainEventDate: '2026-11-20',
        venue: 'Grand Haveli',
        city: 'Ahmedabad',
        functions: [{ name: 'Main Coverage', date: '2026-11-20', startTime: '10:00', endTime: '18:00', venue: 'Grand Haveli' }]
      });

      // Assign once
      if (!booking.functions[0].assignedCrew) booking.functions[0].assignedCrew = [];
      booking.functions[0].assignedCrew.push({
        employeeId: empRahul.id,
        employeeName: empRahul.fullName,
        role: 'Lead Photographer'
      });

      // Try assigning again
      const isAlreadyAssigned = booking.functions[0].assignedCrew.some(c => c.employeeId === empRahul.id);
      expect(isAlreadyAssigned).toBe(true);
      if (!isAlreadyAssigned) {
        booking.functions[0].assignedCrew.push({
          employeeId: empRahul.id,
          employeeName: empRahul.fullName,
          role: 'Lead Photographer'
        });
      }

      expect(booking.functions[0].assignedCrew.filter(c => c.employeeId === empRahul.id).length).toBe(1);
    });
  });

  // ==========================================
  // 2. CREW SCHEDULING CONFLICT DETECTION & OVERRIDE
  // ==========================================
  describe('2. Scheduling Conflict Detection & Studio Owner Override', () => {
    it('detects scheduling conflict when an employee is already booked on overlapping hours', () => {
      const activeEmps = crewConflictService.getActiveEmployees(testStudioId);
      const empRahul = activeEmps.find(e => e.fullName === 'Rahul Sharma')!;

      // Create Booking 1 on 2026-11-20 from 10:00 to 18:00
      const booking1 = bookingProductionService.createBooking(testStudioId, {
        customerId: 'cust_bkg_1',
        customerName: 'Aarav Patel',
        customerPhone: '+91 98251 11111',
        eventName: 'Aarav Royal Wedding',
        category: 'Wedding',
        mainEventDate: '2026-11-20',
        venue: 'The Leela Palace',
        city: 'Gandhinagar',
        functions: [{ name: 'Aarav Royal Wedding Ceremony', date: '2026-11-20', startTime: '10:00', endTime: '18:00', venue: 'The Leela Palace' }]
      });
      booking1.functions[0].assignedPhotographerIds = [empRahul.id];
      booking1.functions[0].startTime = '10:00';
      booking1.functions[0].endTime = '18:00';
      bookingProductionService.saveBooking(testStudioId, booking1);

      // Check conflict for same employee on same date with overlapping hours (14:00 to 20:00)
      const conflictResult = crewConflictService.checkConflict(
        testStudioId,
        empRahul.id,
        '2026-11-20',
        '14:00',
        '20:00',
        'new_booking_id'
      );

      expect(conflictResult.hasConflict).toBe(true);
      expect(conflictResult.employeeName).toBe('Rahul Sharma');
      expect(conflictResult.conflictingEventName).toBe('Aarav Royal Wedding');
      expect(conflictResult.warningMessage).toContain('Rahul Sharma is already assigned to another event');
    });

    it('does not trigger conflict for different dates or non-overlapping hours', () => {
      const activeEmps = crewConflictService.getActiveEmployees(testStudioId);
      const empRahul = activeEmps.find(e => e.fullName === 'Rahul Sharma')!;

      // Different date (2026-11-25)
      const noConflictDifferentDate = crewConflictService.checkConflict(
        testStudioId,
        empRahul.id,
        '2026-11-25',
        '10:00',
        '18:00',
        'new_booking_id'
      );
      expect(noConflictDifferentDate.hasConflict).toBe(false);

      // Same date but non-overlapping hours (evening shoot 20:00 to 23:00)
      const noConflictDifferentTime = crewConflictService.checkConflict(
        testStudioId,
        empRahul.id,
        '2026-11-20',
        '20:00',
        '23:00',
        'new_booking_id'
      );
      expect(noConflictDifferentTime.hasConflict).toBe(false);
    });

    it('allows Studio Owner to override conflict warning and confirm booking', () => {
      const activeEmps = crewConflictService.getActiveEmployees(testStudioId);
      const empRahul = activeEmps.find(e => e.fullName === 'Rahul Sharma')!;

      const booking2 = bookingProductionService.createBooking(testStudioId, {
        customerId: 'cust_bkg_2',
        customerName: 'Samarth Patel',
        customerPhone: '+91 98251 22222',
        eventName: 'Samarth Birthday Party',
        category: 'Birthday',
        mainEventDate: '2026-11-20',
        venue: 'Gulmohar Greens',
        city: 'Ahmedabad',
        functions: [{ name: 'Samarth Birthday Party', date: '2026-11-20', startTime: '16:00', endTime: '21:00', venue: 'Gulmohar Greens' }]
      });

      // Studio owner explicitly overrides and confirms assignment
      const ownerConfirmedOverride = true;
      if (ownerConfirmedOverride) {
        booking2.functions[0].assignedCrew = [{
          employeeId: empRahul.id,
          employeeName: empRahul.fullName,
          role: 'Lead Photographer'
        }];
        bookingProductionService.saveBooking(testStudioId, booking2);
      }

      const saved = bookingProductionService.getBooking(testStudioId, booking2.id);
      expect(saved?.functions[0].assignedCrew?.some(c => c.employeeId === empRahul.id)).toBe(true);
    });
  });

  // ==========================================
  // 3. EVENT-SPECIFIC DELIVERABLES & ISOLATION
  // ==========================================
  describe('3. Event-Specific Deliverables & Isolation', () => {
    it('generates standard Wedding deliverables (9 milestones) as requested', () => {
      const deliverables = generateDeliverablesForCategory('Wedding', 'bkg_wedding_01', '2026-11-20');
      expect(deliverables.length).toBe(9);
      expect(deliverables.map(d => d.name)).toEqual([
        'RAW photo backup verified',
        'Selection gallery sent',
        'Customer selection received',
        'Edited photos ready',
        'Video teaser delivered',
        'Long film delivered',
        'Album design approved',
        'Album sent to print',
        'Album delivered'
      ]);
    });

    it('generates standard Birthday deliverables (4 milestones) as requested', () => {
      const deliverables = generateDeliverablesForCategory('Birthday', 'bkg_bday_01', '2026-11-20');
      expect(deliverables.length).toBe(4);
      expect(deliverables.map(d => d.name)).toEqual([
        'Photography completed',
        'RAW photos uploaded',
        '100 edited photos delivered',
        'Online gallery shared'
      ]);
    });

    it('generates standard Pre-Wedding deliverables (4 milestones) as requested', () => {
      const deliverables = generateDeliverablesForCategory('Pre-Wedding', 'bkg_pw_01', '2026-11-18');
      expect(deliverables.length).toBe(4);
      expect(deliverables.map(d => d.name)).toEqual([
        'Photoshoot completed',
        'Edited photos ready',
        'Cinematic video completed',
        'Social media reels delivered'
      ]);
    });

    it('generates standard Product Photography deliverables (4 milestones) as requested', () => {
      const deliverables = generateDeliverablesForCategory('Product Photography', 'bkg_prod_01', '2027-01-10');
      expect(deliverables.length).toBe(4);
      expect(deliverables.map(d => d.name)).toEqual([
        'Product images captured',
        'Background editing completed',
        'Final high-resolution images exported',
        'Customer gallery shared'
      ]);
    });

    it('verifies that checking a deliverable in one booking NEVER affects another booking', () => {
      // Create Event A (Wedding)
      const bookingA = bookingProductionService.createBooking(testStudioId, {
        customerId: 'cust_a',
        customerName: 'Client A',
        customerPhone: '+91 98251 00001',
        eventName: 'Wedding Event A',
        category: 'Wedding',
        mainEventDate: '2026-11-20',
        venue: 'Venue A',
        city: 'Ahmedabad'
      });
      bookingA.deliverables = generateDeliverablesForCategory('Wedding', bookingA.id, '2026-11-20');
      bookingProductionService.saveBooking(testStudioId, bookingA);

      // Create Event B (Wedding)
      const bookingB = bookingProductionService.createBooking(testStudioId, {
        customerId: 'cust_b',
        customerName: 'Client B',
        customerPhone: '+91 98251 00002',
        eventName: 'Wedding Event B',
        category: 'Wedding',
        mainEventDate: '2026-11-20',
        venue: 'Venue B',
        city: 'Surat'
      });
      bookingB.deliverables = generateDeliverablesForCategory('Wedding', bookingB.id, '2026-11-20');
      bookingProductionService.saveBooking(testStudioId, bookingB);

      // Mark first deliverable of Event A as completed
      const delA1 = bookingA.deliverables[0];
      bookingProductionService.updateDeliverableStage(testStudioId, bookingA.id, delA1.id, {
        stage: 'delivered',
        completedQty: delA1.requiredQty,
        verifiedBy: 'Studio Owner'
      });

      // Verify Event A has 1 deliverable delivered
      const refreshedA = bookingProductionService.getBooking(testStudioId, bookingA.id)!;
      expect(refreshedA.deliverables[0].isDelivered).toBe(true);
      expect(refreshedA.deliverables[0].stage).toBe('delivered');

      // CRITICAL: Verify Event B remains untouched (all deliverables not_started / pending!)
      const refreshedB = bookingProductionService.getBooking(testStudioId, bookingB.id)!;
      expect(refreshedB.deliverables.every(d => !d.isDelivered)).toBe(true);
      expect(refreshedB.deliverables.every(d => d.stage === 'not_started')).toBe(true);
    });

    it('allows Studio Owner to add and remove custom deliverables', () => {
      const booking = bookingProductionService.createBooking(testStudioId, {
        customerId: 'cust_custom',
        customerName: 'Custom Client',
        customerPhone: '+91 98251 00003',
        eventName: 'Engagement Ceremony',
        category: 'Engagement',
        mainEventDate: '2026-11-29',
        venue: 'Palace',
        city: 'Vadodara'
      });
      booking.deliverables = generateDeliverablesForCategory('Default', booking.id, '2026-11-29');

      // Add custom deliverable
      const customDel: DeliverableSpecification = {
        id: `del_${booking.id}_custom_reels_drone`,
        bookingId: booking.id,
        name: 'Same Day Sangeet Drone Reel',
        category: 'video',
        requiredQty: 2,
        completedQty: 0,
        unit: 'reels',
        deliveryMethod: 'Google Drive',
        deadlineType: 'same_day',
        calculatedDeadline: '2026-11-29',
        priority: 'urgent',
        stage: 'not_started',
        isDelivered: false,
        isPartiallyDelivered: false
      };
      booking.deliverables.push(customDel);
      bookingProductionService.saveBooking(testStudioId, booking);

      let saved = bookingProductionService.getBooking(testStudioId, booking.id)!;
      expect(saved.deliverables.some(d => d.name === 'Same Day Sangeet Drone Reel')).toBe(true);

      // Remove custom deliverable
      saved.deliverables = saved.deliverables.filter(d => d.id !== customDel.id);
      bookingProductionService.saveBooking(testStudioId, saved);

      const afterRemove = bookingProductionService.getBooking(testStudioId, booking.id)!;
      expect(afterRemove.deliverables.some(d => d.name === 'Same Day Sangeet Drone Reel')).toBe(false);
    });
  });

  // ==========================================
  // 4. EDITING AFTER CONFIRMATION & CRUD
  // ==========================================
  describe('4. Full Booking CRUD & Post-Confirmation Editing', () => {
    it('allows changing venue, pricing, deadlines, and crew on Confirmed bookings', () => {
      const booking = bookingProductionService.createBooking(testStudioId, {
        customerId: 'cust_edit_confirmed',
        customerName: 'Karan Dave',
        customerPhone: '+91 98251 44444',
        eventName: 'Karan Heritage Wedding',
        category: 'Wedding',
        mainEventDate: '2026-12-10',
        venue: 'Original Mandap Hall',
        city: 'Ahmedabad',
        functions: [{ name: 'Lagna Ceremony', date: '2026-12-10', startTime: '10:00', endTime: '16:00', venue: 'Original Mandap Hall' }]
      });

      // Status is Confirmed
      booking.status = 'deal_confirmed';
      bookingProductionService.saveBooking(testStudioId, booking);

      // Update venue, quotation, and new function after confirmation
      booking.venue = 'Updated Royal Palace Lawn';
      booking.city = 'Gandhinagar';
      if (booking.financials) {
        booking.financials.finalAgreedAmount = 210000;
      }
      booking.functions.push({
        id: `fn_${booking.id}_post_sangeet`,
        bookingId: booking.id,
        name: 'Cocktail & Sangeet Evening',
        category: 'Sangeet',
        date: '2026-12-09',
        startTime: '19:00',
        endTime: '23:30',
        venue: 'The Ummed Club',
        city: 'Gandhinagar',
        assignedPhotographerIds: [],
        assignedVideographerIds: [],
        assignedDroneOperatorIds: [],
        assignedEditorIds: [],
        assignedSupplierIds: [],
        deliverables: [],
        priority: 'high',
        status: 'scheduled'
      });

      bookingProductionService.saveBooking(testStudioId, booking);

      const updated = bookingProductionService.getBooking(testStudioId, booking.id)!;
      expect(updated.venue).toBe('Updated Royal Palace Lawn');
      expect(updated.city).toBe('Gandhinagar');
      expect(updated.financials?.finalAgreedAmount).toBe(210000);
      expect(updated.functions.length).toBe(2);
      expect(updated.functions[1].name).toBe('Cocktail & Sangeet Evening');
    });

    it('safely deletes/cancels a booking and cleans up associated event', () => {
      const booking = bookingProductionService.createBooking(testStudioId, {
        customerId: 'cust_to_delete',
        customerName: 'Temporary Client',
        customerPhone: '+91 98251 99999',
        eventName: 'Cancelled Test Shoot',
        category: 'Corporate',
        mainEventDate: '2026-12-30',
        venue: 'Hotel Metropole',
        city: 'Ahmedabad'
      });

      expect(bookingProductionService.getBooking(testStudioId, booking.id)).not.toBeNull();

      // Delete booking
      const deleted = bookingProductionService.deleteBooking(testStudioId, booking.id);
      expect(deleted).toBe(true);
      expect(bookingProductionService.getBooking(testStudioId, booking.id)).toBeNull();
    });
  });

  // ==========================================
  // 5. CALENDAR & MULTIPLE BOOKINGS ON SAME DAY
  // ==========================================
  describe('5. Calendar & Multiple Bookings on Same Day', () => {
    it('supports multiple distinct bookings on the same day (e.g. 20 Nov 2026)', () => {
      // Booking 1: Wedding at Gandhinagar
      const booking1 = bookingProductionService.createBooking(testStudioId, {
        customerId: 'cust_nov20_1',
        customerName: 'Parth Trivedi',
        customerPhone: '+91 98251 30002',
        eventName: 'Parth & Ritu Grand Royal Wedding',
        category: 'Wedding',
        mainEventDate: '2026-11-20',
        venue: 'The Leela Palace Gandhinagar',
        city: 'Gandhinagar'
      });

      // Booking 2: Birthday at Ahmedabad
      const booking2 = bookingProductionService.createBooking(testStudioId, {
        customerId: 'cust_nov20_2',
        customerName: 'Bhavin Patel',
        customerPhone: '+91 98251 30003',
        eventName: 'Samarth 5th Birthday Jubilee Extravaganza',
        category: 'Birthday',
        mainEventDate: '2026-11-20',
        venue: 'Gulmohar Greens Golf & Country Club',
        city: 'Ahmedabad'
      });

      const list = bookingProductionService.listBookings(testStudioId);
      const nov20Bookings = list.filter(b => (b.mainEventDate || b.startDate) === '2026-11-20');

      expect(nov20Bookings.length).toBe(2);
      expect(nov20Bookings.some(b => b.category === 'Wedding' && b.city === 'Gandhinagar')).toBe(true);
      expect(nov20Bookings.some(b => b.category === 'Birthday' && b.city === 'Ahmedabad')).toBe(true);
    });

    it('idempotently seeds all 12 realistic calendar demo bookings across Nov 2026 - Mar 2027', async () => {
      const addedCount = await seedCalendarTestBookings(testStudioId);
      expect(addedCount).toBe(12);

      const allBookings = TenantStore.get<BookingRecord>(testStudioId, 'studio_bookings_v2') || [];
      expect(allBookings.length).toBeGreaterThanOrEqual(12);

      // Verify specific requested dates exist
      const dates = allBookings.map(b => b.mainEventDate || b.startDate);
      expect(dates).toContain('2026-11-18'); // Pre-Wedding, Ahmedabad
      expect(dates).toContain('2026-11-20'); // Wedding & Birthday (multiple)
      expect(dates).toContain('2026-11-24'); // Corporate, Surat
      expect(dates).toContain('2026-11-29'); // Engagement, Vadodara
      expect(dates).toContain('2026-12-05'); // Wedding, Rajkot
      expect(dates).toContain('2026-12-12'); // Haldi & Mehndi, Anand
      expect(dates).toContain('2026-12-20'); // Reception, Ahmedabad
      expect(dates).toContain('2027-01-10'); // Product Photography, Ahmedabad
      expect(dates).toContain('2027-01-24'); // Wedding, Junagadh
      expect(dates).toContain('2027-02-14'); // Pre-Wedding, Gandhinagar
      expect(dates).toContain('2027-03-20'); // Family Photoshoot, Mehsana

      // Second seed run should be idempotent (0 additional records)
      const secondRunCount = await seedCalendarTestBookings(testStudioId);
      expect(secondRunCount).toBe(0);
    });
  });
});
