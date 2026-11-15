import { describe, it, expect, beforeEach } from 'vitest';
import { THEME } from '../utils/theme';
import { calendarVisibilityService } from '../services/calendarVisibilityService';
import { bookingProductionService } from '../services/bookingProductionService';
import { crewConflictService } from '../services/crewConflictService';
import { employeeWorkspaceService } from '../services/employeeWorkspaceService';
import { TenantStore } from '../services/tenantStore';

describe('Studio OS — Orange Theme, Mobile App UX & Smart Team Calendar', () => {
  const testStudioId = 'studio_shreeji_films';
  const testBookingId = 'bkg_dec16_wedding_test';

  beforeEach(() => {
    // Clean only Dec 16 test bookings to preserve employee roster
    const currentBookings = bookingProductionService.listBookings(testStudioId);
    const cleaned = currentBookings.filter(b => b.mainEventDate !== '2026-12-16' && b.startDate !== '2026-12-16' && b.id !== testBookingId);
    TenantStore.set(testStudioId, 'studio_bookings_v2', cleaned);

    const events = TenantStore.get(testStudioId, 'events') || [];
    TenantStore.set(testStudioId, 'events', events.filter((e: any) => e.startDate !== '2026-12-16' && e.id !== testBookingId));
  });

  describe('1. Premium Medium-Orange Theme Design Tokens', () => {
    it('defines vibrant orange gradient tokens for primary interactive controls', () => {
      expect(THEME.colors.primary).toBe('#ea580c'); // orange-600
      expect(THEME.button.primary).toContain('from-orange-500');
      expect(THEME.button.primary).toContain('to-amber-600');
      expect(THEME.button.primary).toContain('text-white');
    });

    it('defines warm light-orange surfaces and borders for selected states', () => {
      expect(THEME.colors.surfaceLight).toBe('#fff7ed'); // orange-50
      expect(THEME.colors.surfaceBorder).toBe('#fed7aa'); // orange-200
      expect(THEME.button.secondary).toContain('bg-orange-50');
      expect(THEME.active.navItem).toContain('bg-gradient-to-r');
      expect(THEME.active.navItem).toContain('text-white');
    });

    it('defines touch-friendly 48x48px calendar navigation and active day styling', () => {
      expect(THEME.calendar.navButton).toContain('w-12');
      expect(THEME.calendar.navButton).toContain('h-12');
      expect(THEME.calendar.navButton).toContain('min-w-[48px]');
      expect(THEME.calendar.navButton).toContain('min-h-[48px]');
      expect(THEME.calendar.activeDay).toContain('border-orange-500');
      expect(THEME.calendar.activeDay).toContain('bg-orange-50');
    });
  });

  describe('2. Real-World Scenario: 16 December 2026 Customer Wedding Inquiry & Smart Team Calendar', () => {
    it('executes full availability check, booking creation, crew assignment, and visibility separation', async () => {
      const eventDate = '2026-12-16';

      // Step A: Check availability on 16 Dec 2026
      const existingBookings = bookingProductionService.listBookings(testStudioId);
      const shootsOnDec16 = existingBookings.filter(b => b.mainEventDate === eventDate || b.startDate === eventDate);
      expect(shootsOnDec16.length).toBe(0); // Available for booking!

      // Step B: Create New Booking for 16 Dec 2026 (Kavya & Rohan Wedding)
      const newBooking = bookingProductionService.createBooking(testStudioId, {
        customerName: 'Kavya & Rohan Shah',
        customerPhone: '+91 98250 99881',
        customerEmail: 'kavya.rohan@gmail.com',
        eventName: 'Kavya & Rohan Grand Wedding',
        category: 'Wedding',
        mainEventDate: eventDate,
        startDate: eventDate,
        venue: 'The Grand Bhagwati',
        city: 'Ahmedabad',
        financials: {
          originalQuotation: 160000,
          negotiatedDiscount: 15000,
          finalAgreedAmount: 145000,
          advanceReceived: 50000,
          verifiedPaymentsReceived: 50000
        },
        functions: [
          {
            id: 'fn_dec16_wedding',
            bookingId: testBookingId,
            name: 'Wedding Ceremony & Reception',
            category: 'Wedding',
            date: eventDate,
            startTime: '16:00',
            endTime: '23:30',
            venue: 'The Grand Bhagwati Grand Ballroom',
            city: 'Ahmedabad',
            assignedPhotographerIds: [],
            assignedVideographerIds: [],
            assignedDroneOperatorIds: [],
            assignedEditorIds: [],
            assignedSupplierIds: [],
            deliverables: [],
            priority: 'high',
            status: 'scheduled',
            assignedCrew: []
          }
        ]
      });

      expect(newBooking).toBeDefined();
      expect(newBooking.id).toBeTruthy();
      const bkgId = newBooking.id;

      const activeEmps = crewConflictService.getActiveEmployees(testStudioId);
      const empRahul = activeEmps.find(e => e.fullName === 'Rahul Sharma') || { id: 'emp_shr_rahul', fullName: 'Rahul Sharma' };
      const empKaran = activeEmps.find(e => e.fullName === 'Karan Patel') || { id: 'emp_shr_karan', fullName: 'Karan Patel' };
      const empVishal = activeEmps.find(e => e.fullName === 'Vishal Desai') || { id: 'emp_shr_vishal', fullName: 'Vishal Desai' };

      // Step C: Assign Rahul Sharma (Lead Photographer) with Calendar Visibility = TRUE
      const rahulAssign = await calendarVisibilityService.assignCrewMember({
        studioId: testStudioId,
        bookingId: bkgId,
        functionId: 'fn_dec16_wedding',
        employeeId: empRahul.id,
        employeeName: 'Rahul Sharma',
        responsibility: 'Lead Photographer',
        isVisibleOnCalendar: true,
        assignedBy: 'Studio Owner'
      });
      expect(rahulAssign.success).toBe(true);

      // Step D: Assign Karan Patel (Candid Photographer / Cinematographer) with Calendar Visibility = TRUE
      const karanAssign = await calendarVisibilityService.assignCrewMember({
        studioId: testStudioId,
        bookingId: bkgId,
        functionId: 'fn_dec16_wedding',
        employeeId: empKaran.id,
        employeeName: 'Karan Patel',
        responsibility: 'Candid Photographer',
        isVisibleOnCalendar: true,
        assignedBy: 'Studio Owner'
      });
      expect(karanAssign.success).toBe(true);

      // Step E: Assign Vishal Desai (Production Assistant) with Calendar Visibility = FALSE (Hidden)
      const vishalAssign = await calendarVisibilityService.assignCrewMember({
        studioId: testStudioId,
        bookingId: bkgId,
        functionId: 'fn_dec16_wedding',
        employeeId: empVishal.id,
        employeeName: 'Vishal Desai',
        responsibility: 'Production Assistant',
        isVisibleOnCalendar: false, // HIDDEN from employee calendar
        assignedBy: 'Studio Owner'
      });
      expect(vishalAssign.success).toBe(true);

      // Step F: Verify Crew Table Structure for Studio Owner
      const crewTable = calendarVisibilityService.getBookingCrewTable(testStudioId, bkgId);
      expect(crewTable.length).toBe(3);

      const rahulRow = crewTable.find(r => r.employeeId === empRahul.id);
      const karanRow = crewTable.find(r => r.employeeId === empKaran.id);
      const vishalRow = crewTable.find(r => r.employeeId === empVishal.id);

      expect(rahulRow?.isAssigned).toBe(true);
      expect(rahulRow?.isVisibleOnCalendar).toBe(true);
      expect(rahulRow?.responsibility).toBe('Lead Photographer');

      expect(karanRow?.isAssigned).toBe(true);
      expect(karanRow?.isVisibleOnCalendar).toBe(true);
      expect(karanRow?.responsibility).toBe('Candid Photographer');

      // Crucial test: Vishal is assigned, but his calendar visibility is false!
      expect(vishalRow?.isAssigned).toBe(true);
      expect(vishalRow?.isVisibleOnCalendar).toBe(false);
      expect(vishalRow?.responsibility).toBe('Production Assistant');

      // Step G: Test Employee Portal View — Rahul Sharma's Calendar
      const rahulEvents = calendarVisibilityService.getEmployeeCalendarEvents(testStudioId, empRahul.id);
      const rahulHasDec16 = rahulEvents.some(e => e.date === eventDate && e.bookingId === bkgId);
      expect(rahulHasDec16).toBe(true);
      // Verify Rahul does NOT see private financial info
      expect((rahulEvents[0] as any).finalAgreedAmount).toBeUndefined();
      expect((rahulEvents[0] as any).financials).toBeUndefined();

      // Step H: Test Employee Portal View — Karan Patel's Calendar
      const karanEvents = calendarVisibilityService.getEmployeeCalendarEvents(testStudioId, empKaran.id);
      const karanHasDec16 = karanEvents.some(e => e.date === eventDate && e.bookingId === bkgId);
      expect(karanHasDec16).toBe(true);

      // Step I: Test Employee Portal View — Vishal Desai's Calendar
      // Vishal is assigned, but hidden => Must NOT appear on his calendar!
      const vishalEventsBefore = calendarVisibilityService.getEmployeeCalendarEvents(testStudioId, empVishal.id);
      const vishalHasDec16Before = vishalEventsBefore.some(e => e.date === eventDate && e.bookingId === bkgId);
      expect(vishalHasDec16Before).toBe(false);

      // Step J: Studio Owner Unhides Vishal Desai from Workspace Table
      await calendarVisibilityService.setEmployeeCalendarVisibility({
        studioId: testStudioId,
        bookingId: bkgId,
        functionId: 'fn_dec16_wedding',
        employeeId: empVishal.id,
        isVisible: true,
        updatedBy: 'Studio Owner'
      });

      // Step K: Verify Vishal now immediately sees the wedding on his calendar!
      const vishalEventsAfter = calendarVisibilityService.getEmployeeCalendarEvents(testStudioId, empVishal.id);
      const vishalHasDec16After = vishalEventsAfter.some(e => e.date === eventDate && e.bookingId === bkgId);
      expect(vishalHasDec16After).toBe(true);
      expect(vishalEventsAfter.find(e => e.date === eventDate)?.responsibility).toBe('Production Assistant');

      // Step L: Re-hiding Vishal keeps his assignment intact while removing from calendar
      await calendarVisibilityService.setEmployeeCalendarVisibility({
        studioId: testStudioId,
        bookingId: bkgId,
        functionId: 'fn_dec16_wedding',
        employeeId: empVishal.id,
        isVisible: false,
        updatedBy: 'Studio Owner'
      });

      const updatedTable = calendarVisibilityService.getBookingCrewTable(testStudioId, bkgId);
      const vishalUpdatedRow = updatedTable.find(r => r.employeeId === empVishal.id);
      expect(vishalUpdatedRow?.isAssigned).toBe(true); // Assignment preserved!
      expect(vishalUpdatedRow?.isVisibleOnCalendar).toBe(false);

      const vishalEventsRehidden = calendarVisibilityService.getEmployeeCalendarEvents(testStudioId, empVishal.id);
      expect(vishalEventsRehidden.some(e => e.date === eventDate && e.bookingId === bkgId)).toBe(false);
    });

    it('detects scheduling conflicts when an employee is double-booked across overlapping shoots', () => {
      const activeEmps = crewConflictService.getActiveEmployees(testStudioId);
      const empRahul = activeEmps.find(e => e.fullName === 'Rahul Sharma') || { id: 'emp_shr_rahul', fullName: 'Rahul Sharma' };

      // First shoot: 10:00 to 14:00 on 2026-12-16
      const bkg1 = bookingProductionService.createBooking(testStudioId, {
        customerName: 'Customer A',
        customerPhone: '+91 99999 11111',
        eventName: 'Morning Haldi Shoot',
        mainEventDate: '2026-12-16',
        category: 'Haldi',
        venue: 'Grand Bhagwati',
        city: 'Ahmedabad',
        financials: { finalAgreedAmount: 30000 },
        functions: [{
          id: 'fn_haldi',
          bookingId: 'bkg_1',
          name: 'Haldi Function',
          category: 'Haldi',
          date: '2026-12-16',
          startTime: '10:00',
          endTime: '14:00',
          venue: 'Venue A',
          city: 'Ahmedabad',
          assignedCrew: [{
            employeeId: empRahul.id,
            employeeName: 'Rahul Sharma',
            role: 'Lead Photographer'
          }]
        } as any]
      });

      // Check conflict for Rahul Sharma on another shoot from 12:00 to 16:00 (overlaps 12:00-14:00)
      const conflictCheck = crewConflictService.checkConflict(
        testStudioId,
        empRahul.id,
        '2026-12-16',
        '12:00',
        '16:00',
        'bkg_different_2'
      );

      expect(conflictCheck.hasConflict).toBe(true);
      expect(conflictCheck.warningMessage).toContain('Morning Haldi Shoot');
    });
  });
});
