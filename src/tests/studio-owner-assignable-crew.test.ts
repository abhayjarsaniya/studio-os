import { describe, it, expect, beforeEach } from 'vitest';
import { TenantStore } from '../services/tenantStore';
import { crewConflictService } from '../services/crewConflictService';
import { calendarVisibilityService } from '../services/calendarVisibilityService';
import { bookingProductionService } from '../services/bookingProductionService';
import {
  getStudioOwnerProfile,
  getStudioOwnerCrewMember,
  isStudioOwnerId,
  setDynamicStudioOwner,
  formatOwnerCrewDisplayName,
  sanitizeOwnerName
} from '../services/studioOwnerHelper';
import { BookingRecord } from '../types/bookingProduction';

// Ensure localStorage mock is present in Node/Vitest environment
if (typeof (globalThis as any).localStorage === 'undefined') {
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = String(v); },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); }
  };
}

const TEST_STUDIO = 'studio_shreeji_films';

describe('Studio Owner Assignable Crew & Personal Calendar Visibility Suite', () => {
  beforeEach(() => {
    TenantStore.set(TEST_STUDIO, 'events', []);
    TenantStore.set(TEST_STUDIO, 'studio_bookings_v2', []);
    TenantStore.set(TEST_STUDIO, 'crewAssignments', []);
    TenantStore.set(TEST_STUDIO, 'calendarVisibility', []);
    localStorage.clear();
    setDynamicStudioOwner(null);
  });

  describe('1. Studio Owner Roster & Dynamic Name Resolution', () => {
    it('should resolve dynamic owner name from localStorage and session without duplicate account creation', () => {
      localStorage.setItem('studio_os_owner_name', 'Abhay');
      localStorage.setItem('studio_os_owner_uid', '9NJ9xM4Aradq2gqW7ySTHLLdDin2');

      const ownerProfile = getStudioOwnerProfile(TEST_STUDIO);
      expect(ownerProfile.name).toBe('Abhay');
      expect(ownerProfile.fullName).toBe('Abhay (Studio Owner)');
      expect(ownerProfile.id).toBe('9NJ9xM4Aradq2gqW7ySTHLLdDin2');
      expect(ownerProfile.designation).toBe('Studio Owner');
      expect(ownerProfile.isStudioOwner).toBe(true);
    });

    it('should never display generic "Owner" label when real owner name is available', () => {
      localStorage.setItem('studio_os_user_name', 'Abhay Jarsaniya');
      const profile = getStudioOwnerProfile(TEST_STUDIO);
      expect(profile.name).toBe('Abhay Jarsaniya');
      expect(profile.fullName).toBe('Abhay Jarsaniya (Studio Owner)');
      expect(profile.name).not.toBe('Owner');
    });

    it('should properly sanitize existing "(Studio Owner)" suffixes to avoid duplicate tags', () => {
      expect(sanitizeOwnerName('Abhay (Studio Owner)')).toBe('Abhay');
      expect(formatOwnerCrewDisplayName('Abhay (Studio Owner)')).toBe('Abhay (Studio Owner)');
      expect(formatOwnerCrewDisplayName('Abhay')).toBe('Abhay (Studio Owner)');
    });

    it('should prepend the Studio Owner to getActiveEmployees as the first entry', () => {
      localStorage.setItem('studio_os_owner_name', 'Abhay');
      const activeEmployees = crewConflictService.getActiveEmployees(TEST_STUDIO);

      expect(activeEmployees.length).toBeGreaterThanOrEqual(15);
      const firstEntry = activeEmployees[0];
      expect(firstEntry.fullName).toBe('Abhay (Studio Owner)');
      expect(firstEntry.designation).toBe('Studio Owner');
      expect((firstEntry as any).isStudioOwner).toBe(true);
      expect(isStudioOwnerId(firstEntry.id, TEST_STUDIO)).toBe(true);
    });
  });

  describe('2. Self-Assignment & Scheduling Conflict Detection', () => {
    it('should detect scheduling conflict when Studio Owner is assigned to overlapping shoots', () => {
      setDynamicStudioOwner({ name: 'Abhay', id: 'usr_owner_shreeji_films' });
      const ownerMember = getStudioOwnerCrewMember(TEST_STUDIO);

      // Seed an existing event on Nov 25, 2026 with owner assigned
      TenantStore.set(TEST_STUDIO, 'events', [
        {
          id: 'evt_existing_001',
          studioId: TEST_STUDIO,
          name: 'Mehta Pre-Wedding Shoot',
          startDate: '2026-11-25',
          endDate: '2026-11-25',
          startTime: '10:00',
          endTime: '18:00',
          venue: 'Taj Gandhinagar',
          assignedTeamIds: [ownerMember.id]
        }
      ]);

      // Check conflict for same date/time
      const conflict = crewConflictService.checkConflict(
        TEST_STUDIO,
        ownerMember.id,
        '2026-11-25',
        '11:00',
        '17:00'
      );

      expect(conflict.hasConflict).toBe(true);
      expect(conflict.employeeName).toContain('Abhay (Studio Owner)');
      expect(conflict.warningMessage).toContain('already assigned to another event');
    });

    it('should report no conflict on non-overlapping dates for Studio Owner', () => {
      setDynamicStudioOwner({ name: 'Abhay', id: 'usr_owner_shreeji_films' });
      const ownerMember = getStudioOwnerCrewMember(TEST_STUDIO);

      const conflict = crewConflictService.checkConflict(
        TEST_STUDIO,
        ownerMember.id,
        '2026-12-05',
        '10:00',
        '18:00'
      );

      expect(conflict.hasConflict).toBe(false);
    });
  });

  describe('3. Test Scenario: Wedding Booking with Owner + 3 Employees', () => {
    it('should assign Studio Owner and 3 employees, save to Firestore/Store, and retain all assignments on refresh', async () => {
      setDynamicStudioOwner({ name: 'Abhay', id: 'usr_owner_shreeji' });
      const owner = getStudioOwnerCrewMember(TEST_STUDIO);
      const employees = crewConflictService.getActiveEmployees(TEST_STUDIO);
      
      const empRahul = employees.find(e => e.fullName.includes('Rahul')) || employees[1];
      const empKaran = employees.find(e => e.fullName.includes('Karan')) || employees[2];
      const empVishal = employees.find(e => e.fullName.includes('Vishal')) || employees[3];

      // 1. Create a wedding booking with 2 wedding functions
      const booking: BookingRecord = {
        id: 'bkg_wedding_grand_2026',
        studioId: TEST_STUDIO,
        bookingNumber: 'BKG-2026-7788',
        customerId: 'cust_sharma_01',
        customerName: 'Rohit Sharma & Ritu Verma',
        customerPhone: '+91 98250 11223',
        customerWhatsApp: '+91 98250 11223',
        eventName: 'Rohit & Ritu Grand Royal Wedding',
        category: 'Wedding',
        mainEventDate: '2026-11-28',
        startDate: '2026-11-28',
        status: 'deal_confirmed',
        venue: 'Grand Hyatt Ahmedabad',
        city: 'Ahmedabad',
        notes: 'Grand wedding coverage',
        numberOfDays: 2,
        numberOfFunctions: 2,
        functions: [
          {
            id: 'fn_sangeet_01',
            bookingId: 'bkg_wedding_grand_2026',
            name: 'Sangeet & Cocktail Evening',
            category: 'Sangeet',
            date: '2026-11-28',
            startTime: '17:00',
            endTime: '23:00',
            venue: 'Hyatt Ballroom',
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
          },
          {
            id: 'fn_wedding_02',
            bookingId: 'bkg_wedding_grand_2026',
            name: 'Vedic Wedding Ceremony',
            category: 'Wedding',
            date: '2026-11-29',
            startTime: '09:00',
            endTime: '16:00',
            venue: 'Hyatt Royal Lawns',
            city: 'Ahmedabad',
            assignedPhotographerIds: [],
            assignedVideographerIds: [],
            assignedDroneOperatorIds: [],
            assignedEditorIds: [],
            assignedSupplierIds: [],
            deliverables: [],
            priority: 'urgent',
            status: 'scheduled',
            assignedCrew: []
          }
        ],
        financials: {
          originalQuotation: 250000,
          negotiatedDiscount: 0,
          finalAgreedAmount: 250000,
          verifiedPaymentsReceived: 100000,
          remainingBalance: 150000,
          advanceRequired: 100000,
          advanceReceived: 100000,
          isAdvanceConfirmed: true,
          paymentMilestones: []
        },
        deliverables: [],
        billingVersions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await bookingProductionService.saveBooking(TEST_STUDIO, booking);

      // 2. Assign Studio Owner (Lead Photographer) - Visible
      const asgn1 = await calendarVisibilityService.assignCrewMember({
        studioId: TEST_STUDIO,
        bookingId: booking.id,
        functionId: 'fn_wedding_02',
        employeeId: owner.id,
        employeeName: owner.fullName,
        designation: owner.designation,
        department: owner.department,
        role: 'Lead Photographer',
        isVisibleOnCalendar: true
      });
      expect(asgn1.success).toBe(true);

      // 3. Assign Rahul (Photographer) - Visible
      const asgn2 = await calendarVisibilityService.assignCrewMember({
        studioId: TEST_STUDIO,
        bookingId: booking.id,
        functionId: 'fn_wedding_02',
        employeeId: empRahul.id,
        employeeName: empRahul.fullName,
        designation: empRahul.designation,
        department: empRahul.department,
        role: 'Photographer',
        isVisibleOnCalendar: true
      });
      expect(asgn2.success).toBe(true);

      // 4. Assign Karan (Videographer) - Visible
      const asgn3 = await calendarVisibilityService.assignCrewMember({
        studioId: TEST_STUDIO,
        bookingId: booking.id,
        functionId: 'fn_wedding_02',
        employeeId: empKaran.id,
        employeeName: empKaran.fullName,
        designation: empKaran.designation,
        department: empKaran.department,
        role: 'Videographer',
        isVisibleOnCalendar: true
      });
      expect(asgn3.success).toBe(true);

      // 5. Assign Vishal (Assistant) - Hidden from employee calendar
      const asgn4 = await calendarVisibilityService.assignCrewMember({
        studioId: TEST_STUDIO,
        bookingId: booking.id,
        functionId: 'fn_wedding_02',
        employeeId: empVishal.id,
        employeeName: empVishal.fullName,
        designation: empVishal.designation,
        department: empVishal.department,
        role: 'Assistant',
        isVisibleOnCalendar: false // Hidden!
      });
      expect(asgn4.success).toBe(true);

      // SIMULATE PAGE REFRESH: Reload booking and crew table directly from persistence
      const reloadedBooking = bookingProductionService.getBooking(TEST_STUDIO, booking.id);
      expect(reloadedBooking).toBeDefined();

      const crewTable = calendarVisibilityService.getBookingCrewTable(TEST_STUDIO, reloadedBooking!);
      expect(crewTable).toHaveLength(4);

      // Verify Owner Row
      const ownerRow = crewTable.find(r => r.employeeId === owner.id);
      expect(ownerRow).toBeDefined();
      expect(ownerRow?.employeeName).toBe('Abhay (Studio Owner)');
      expect(ownerRow?.role).toBe('Lead Photographer');
      expect(ownerRow?.designation).toBe('Studio Owner');
      expect(ownerRow?.isAssigned).toBe(true);
      expect(ownerRow?.isVisibleOnCalendar).toBe(true);

      // Verify Rahul Row
      const rahulRow = crewTable.find(r => r.employeeId === empRahul.id);
      expect(rahulRow).toBeDefined();
      expect(rahulRow?.role).toBe('Photographer');
      expect(rahulRow?.isVisibleOnCalendar).toBe(true);

      // Verify Karan Row
      const karanRow = crewTable.find(r => r.employeeId === empKaran.id);
      expect(karanRow).toBeDefined();
      expect(karanRow?.role).toBe('Videographer');
      expect(karanRow?.isVisibleOnCalendar).toBe(true);

      // Verify Vishal Row (Hidden)
      const vishalRow = crewTable.find(r => r.employeeId === empVishal.id);
      expect(vishalRow).toBeDefined();
      expect(vishalRow?.role).toBe('Assistant');
      expect(vishalRow?.isVisibleOnCalendar).toBe(false);

      // 6. Test Calendar Visibility Queries
      // Owner personal calendar: Event appears because isVisible is true
      const ownerCalEvents = calendarVisibilityService.getEmployeeCalendarEvents(TEST_STUDIO, owner.id);
      expect(ownerCalEvents.some(e => e.bookingId === booking.id)).toBe(true);

      // Vishal personal calendar: Event DOES NOT appear because isVisible is false
      const vishalCalEvents = calendarVisibilityService.getEmployeeCalendarEvents(TEST_STUDIO, empVishal.id);
      expect(vishalCalEvents.some(e => e.bookingId === booking.id)).toBe(false);

      // 7. Toggle Owner Calendar Visibility: Hide owner shoot from personal schedule
      await calendarVisibilityService.setEmployeeCalendarVisibility(
        TEST_STUDIO,
        booking.id,
        owner.id,
        'fn_wedding_02',
        false
      );

      expect(calendarVisibilityService.isEmployeeVisibleOnCalendar(TEST_STUDIO, booking.id, owner.id, 'fn_wedding_02')).toBe(false);
      const ownerCalEventsAfterHide = calendarVisibilityService.getEmployeeCalendarEvents(TEST_STUDIO, owner.id);
      expect(ownerCalEventsAfterHide.some(e => e.bookingId === booking.id)).toBe(false);

      // Studio Owner must STILL retain access to the entire booking in studio list!
      const allStudioBookings = bookingProductionService.listBookings(TEST_STUDIO);
      expect(allStudioBookings.some(b => b.id === booking.id)).toBe(true);

      // 8. Unassign/Remove Owner assignment later
      await calendarVisibilityService.unassignCrewMember(TEST_STUDIO, booking.id, 'fn_wedding_02', owner.id);
      const crewTableAfterUnassign = calendarVisibilityService.getBookingCrewTable(TEST_STUDIO, booking.id);
      expect(crewTableAfterUnassign.find(r => r.employeeId === owner.id)).toBeUndefined();
      expect(crewTableAfterUnassign).toHaveLength(3);
    });
  });
});
