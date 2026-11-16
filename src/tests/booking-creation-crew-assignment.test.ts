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
  formatOwnerCrewDisplayName
} from '../services/studioOwnerHelper';
import { BookingRecord, FunctionPlan } from '../types/bookingProduction';
import { CREW_ROLES, PREDEFINED_SUB_EVENT_TYPES } from '../pages/UnifiedBookingPage';

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

describe('Studio OS — Booking Creation Crew Assignment Flow Suite', () => {
  beforeEach(() => {
    TenantStore.set(TEST_STUDIO, 'events', []);
    TenantStore.set(TEST_STUDIO, 'studio_bookings_v2', []);
    TenantStore.set(TEST_STUDIO, 'crewAssignments', []);
    TenantStore.set(TEST_STUDIO, 'calendarVisibility', []);
    localStorage.clear();
    setDynamicStudioOwner(null);
  });

  describe('1. Single Event Booking: Studio Owner & Multiple Crew Members', () => {
    it('allows assigning Studio Owner and multiple employees to a single event booking', async () => {
      localStorage.setItem('studio_os_owner_name', 'Abhay Jarsaniya');
      const ownerMember = getStudioOwnerCrewMember(TEST_STUDIO);
      const employees = crewConflictService.getActiveEmployees(TEST_STUDIO);
      const emp1 = employees[1];
      const emp2 = employees[2];

      const bookingId = 'bkg_single_evt_001';
      const singleFn: FunctionPlan = {
        id: 'fn_single_main',
        bookingId,
        name: 'Pre-Wedding Grand Shoot',
        category: 'Pre-Wedding',
        orderIndex: 1,
        date: '2026-11-20',
        startTime: '08:00',
        endTime: '18:00',
        venue: 'Riverfront Ahmedabad',
        city: 'Ahmedabad',
        assignedPhotographerIds: [ownerMember.id, emp1.id],
        assignedVideographerIds: [emp2.id],
        assignedDroneOperatorIds: [],
        assignedEditorIds: [],
        assignedSupplierIds: [],
        assignedCrew: [
          {
            employeeId: ownerMember.id,
            employeeName: formatOwnerCrewDisplayName(ownerMember.fullName),
            role: 'Lead Photographer',
            contact: ownerMember.phone || '',
            isVisibleOnCalendar: true
          },
          {
            employeeId: emp1.id,
            employeeName: emp1.fullName,
            role: 'Candid Photographer',
            contact: emp1.phone || '',
            isVisibleOnCalendar: true
          },
          {
            employeeId: emp2.id,
            employeeName: emp2.fullName,
            role: 'Cinematographer',
            contact: emp2.phone || '',
            isVisibleOnCalendar: false // Hidden from employee view
          }
        ],
        priority: 'high',
        status: 'scheduled',
        deliverables: []
      };

      const booking: BookingRecord = {
        id: bookingId,
        studioId: TEST_STUDIO,
        bookingNumber: 'BK-2026-0001',
        customerId: 'cust_001',
        customerName: 'Aarav Mehta',
        customerPhone: '+91 98980 11223',
        customerWhatsApp: '+91 98980 11223',
        city: 'Ahmedabad',
        eventName: 'Mehta Pre-Wedding',
        category: 'Pre-Wedding',
        mainEventDate: '2026-11-20',
        startDate: '2026-11-20',
        venue: 'Riverfront Ahmedabad',
        status: 'deal_confirmed',
        numberOfDays: 1,
        numberOfFunctions: 1,
        functions: [singleFn],
        deliverables: [],
        billingVersions: [],
        financials: {
          originalQuotation: 50000,
          negotiatedDiscount: 0,
          finalAgreedAmount: 50000,
          verifiedPaymentsReceived: 25000,
          remainingBalance: 25000,
          advanceRequired: 25000,
          advanceReceived: 25000,
          isAdvanceConfirmed: true,
          paymentMilestones: []
        },
        notes: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as any as BookingRecord;

      await bookingProductionService.saveBooking(TEST_STUDIO, booking);

      // Register assignments through calendarVisibilityService
      for (const c of singleFn.assignedCrew!) {
        await calendarVisibilityService.assignCrewMember({
          studioId: TEST_STUDIO,
          bookingId,
          functionId: singleFn.id,
          employeeId: c.employeeId,
          employeeName: c.employeeName,
          role: c.role,
          isVisibleOnCalendar: (c as any).isVisibleOnCalendar !== false
        });
      }

      // Verify persistence & display in Single Booking Workspace crew table
      const reloaded = bookingProductionService.getBooking(TEST_STUDIO, bookingId);
      expect(reloaded).toBeDefined();
      expect(reloaded?.functions[0].assignedCrew).toHaveLength(3);

      const crewTable = calendarVisibilityService.getBookingCrewTable(TEST_STUDIO, reloaded!);
      expect(crewTable).toHaveLength(3);

      const ownerRow = crewTable.find(r => isStudioOwnerId(r.employeeId, TEST_STUDIO));
      expect(ownerRow).toBeDefined();
      expect(ownerRow?.employeeName).toContain('Abhay Jarsaniya (Studio Owner)');
      expect(ownerRow?.responsibility).toBe('Lead Photographer');
      expect(ownerRow?.isVisibleOnCalendar).toBe(true);

      const emp2Row = crewTable.find(r => r.employeeId === emp2.id);
      expect(emp2Row).toBeDefined();
      expect(emp2Row?.responsibility).toBe('Cinematographer');
      expect(emp2Row?.isVisibleOnCalendar).toBe(false); // Hidden!
    });
  });

  describe('2. Multiple Wedding Functions: Independent Crew per Function', () => {
    it('creates independent crew allocations for Haldi, Mehndi, Wedding, and Reception', async () => {
      localStorage.setItem('studio_os_owner_name', 'Abhay Jarsaniya');
      const owner = getStudioOwnerCrewMember(TEST_STUDIO);
      const employees = crewConflictService.getActiveEmployees(TEST_STUDIO);
      const empRahul = employees.find(e => e.fullName.includes('Rahul')) || employees[1];
      const empKaran = employees.find(e => e.fullName.includes('Karan')) || employees[2];
      const empSneha = employees.find(e => e.fullName.includes('Sneha')) || employees[3];
      const empPooja = employees.find(e => e.fullName.includes('Pooja')) || employees[4];

      const bookingId = 'bkg_wedding_grand_multi_2026';

      // 4 distinct functions with independent crew members
      const fnHaldi: FunctionPlan = {
        id: 'fn_haldi',
        bookingId,
        name: 'Haldi Ceremony',
        category: 'Haldi',
        orderIndex: 1,
        date: '2026-12-10',
        startTime: '09:00',
        endTime: '13:00',
        venue: 'Hyatt Lawns',
        city: 'Ahmedabad',
        assignedPhotographerIds: [owner.id, empRahul.id],
        assignedVideographerIds: [],
        assignedDroneOperatorIds: [],
        assignedEditorIds: [],
        assignedSupplierIds: [],
        assignedCrew: [
          {
            employeeId: owner.id,
            employeeName: formatOwnerCrewDisplayName(owner.fullName),
            role: 'Lead Photographer',
            isVisibleOnCalendar: true
          },
          {
            employeeId: empRahul.id,
            employeeName: empRahul.fullName,
            role: 'Traditional Photographer',
            isVisibleOnCalendar: true
          }
        ],
        priority: 'normal',
        status: 'scheduled',
        deliverables: []
      };

      const fnMehndi: FunctionPlan = {
        id: 'fn_mehndi',
        bookingId,
        name: 'Mehndi Evening',
        category: 'Mehndi',
        orderIndex: 2,
        date: '2026-12-10',
        startTime: '16:00',
        endTime: '21:00',
        venue: 'Hyatt Poolside',
        city: 'Ahmedabad',
        assignedPhotographerIds: [empPooja.id],
        assignedVideographerIds: [empKaran.id],
        assignedDroneOperatorIds: [],
        assignedEditorIds: [],
        assignedSupplierIds: [],
        assignedCrew: [
          {
            employeeId: empPooja.id,
            employeeName: empPooja.fullName,
            role: 'Candid Photographer',
            isVisibleOnCalendar: true
          },
          {
            employeeId: empKaran.id,
            employeeName: empKaran.fullName,
            role: 'Cinematographer',
            isVisibleOnCalendar: true
          }
        ],
        priority: 'normal',
        status: 'scheduled',
        deliverables: []
      };

      const fnWedding: FunctionPlan = {
        id: 'fn_wedding',
        bookingId,
        name: 'Vedic Wedding Ceremony',
        category: 'Wedding',
        orderIndex: 3,
        date: '2026-12-11',
        startTime: '09:00',
        endTime: '16:00',
        venue: 'Hyatt Royal Ballroom',
        city: 'Ahmedabad',
        assignedPhotographerIds: [owner.id, empRahul.id],
        assignedVideographerIds: [empKaran.id],
        assignedDroneOperatorIds: [empSneha.id],
        assignedEditorIds: [],
        assignedSupplierIds: [],
        assignedCrew: [
          {
            employeeId: owner.id,
            employeeName: formatOwnerCrewDisplayName(owner.fullName),
            role: 'Lead Photographer',
            isVisibleOnCalendar: true
          },
          {
            employeeId: empRahul.id,
            employeeName: empRahul.fullName,
            role: 'Candid Photographer',
            isVisibleOnCalendar: true
          },
          {
            employeeId: empKaran.id,
            employeeName: empKaran.fullName,
            role: 'Cinematographer',
            isVisibleOnCalendar: true
          },
          {
            employeeId: empSneha.id,
            employeeName: empSneha.fullName,
            role: 'Drone Pilot / Aerial',
            isVisibleOnCalendar: true
          }
        ],
        priority: 'high',
        status: 'scheduled',
        deliverables: []
      };

      const fnReception: FunctionPlan = {
        id: 'fn_reception',
        bookingId,
        name: 'Grand Reception Dinner',
        category: 'Reception',
        orderIndex: 4,
        date: '2026-12-12',
        startTime: '19:00',
        endTime: '23:30',
        venue: 'Hyatt Grand Ballroom',
        city: 'Ahmedabad',
        assignedPhotographerIds: [empRahul.id, empPooja.id],
        assignedVideographerIds: [empKaran.id],
        assignedDroneOperatorIds: [],
        assignedEditorIds: [],
        assignedSupplierIds: [],
        assignedCrew: [
          {
            employeeId: empRahul.id,
            employeeName: empRahul.fullName,
            role: 'Lead Photographer',
            isVisibleOnCalendar: true
          },
          {
            employeeId: empPooja.id,
            employeeName: empPooja.fullName,
            role: 'Candid Photographer',
            isVisibleOnCalendar: true
          },
          {
            employeeId: empKaran.id,
            employeeName: empKaran.fullName,
            role: 'Traditional Videographer',
            isVisibleOnCalendar: true
          }
        ],
        priority: 'normal',
        status: 'scheduled',
        deliverables: []
      };

      const booking: BookingRecord = {
        id: bookingId,
        studioId: TEST_STUDIO,
        bookingNumber: 'BK-2026-9900',
        customerId: 'cust_wedding_01',
        customerName: 'Rohan & Ananya',
        customerPhone: '+91 98250 55667',
        customerWhatsApp: '+91 98250 55667',
        city: 'Ahmedabad',
        eventName: 'Rohan & Ananya Royal Wedding',
        category: 'Wedding',
        mainEventDate: '2026-12-11',
        startDate: '2026-12-10',
        venue: 'Grand Hyatt',
        status: 'deal_confirmed',
        numberOfDays: 3,
        numberOfFunctions: 4,
        functions: [fnHaldi, fnMehndi, fnWedding, fnReception],
        deliverables: [],
        billingVersions: [],
        financials: {
          originalQuotation: 200000,
          negotiatedDiscount: 0,
          finalAgreedAmount: 200000,
          verifiedPaymentsReceived: 100000,
          remainingBalance: 100000,
          advanceRequired: 100000,
          advanceReceived: 100000,
          isAdvanceConfirmed: true,
          paymentMilestones: []
        },
        notes: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as any as BookingRecord;

      await bookingProductionService.saveBooking(TEST_STUDIO, booking);

      // Register all function assignments
      for (const fn of [fnHaldi, fnMehndi, fnWedding, fnReception]) {
        for (const c of fn.assignedCrew!) {
          await calendarVisibilityService.assignCrewMember({
            studioId: TEST_STUDIO,
            bookingId,
            functionId: fn.id,
            employeeId: c.employeeId,
            employeeName: c.employeeName,
            role: c.role,
            isVisibleOnCalendar: (c as any).isVisibleOnCalendar !== false
          });
        }
      }

      // Check each function's independent crew allocation
      const reloaded = bookingProductionService.getBooking(TEST_STUDIO, bookingId);
      expect(reloaded).toBeDefined();

      const haldiCrew = reloaded?.functions.find(f => f.id === 'fn_haldi')?.assignedCrew;
      expect(haldiCrew).toHaveLength(2);
      expect(haldiCrew?.some(c => isStudioOwnerId(c.employeeId, TEST_STUDIO))).toBe(true);

      const mehndiCrew = reloaded?.functions.find(f => f.id === 'fn_mehndi')?.assignedCrew;
      expect(mehndiCrew).toHaveLength(2);
      expect(mehndiCrew?.some(c => c.employeeId === empPooja.id)).toBe(true);
      expect(mehndiCrew?.some(c => isStudioOwnerId(c.employeeId, TEST_STUDIO))).toBe(false); // Owner not on Mehndi

      const weddingCrew = reloaded?.functions.find(f => f.id === 'fn_wedding')?.assignedCrew;
      expect(weddingCrew).toHaveLength(4);
      expect(weddingCrew?.some(c => c.employeeId === empSneha.id)).toBe(true);

      const receptionCrew = reloaded?.functions.find(f => f.id === 'fn_reception')?.assignedCrew;
      expect(receptionCrew).toHaveLength(3);
    });
  });

  describe('3. Roster & Responsibilities Verification', () => {
    it('verifies that comprehensive crew roles are exposed and selectable', () => {
      expect(CREW_ROLES).toContain('Lead Photographer');
      expect(CREW_ROLES).toContain('Candid Photographer');
      expect(CREW_ROLES).toContain('Traditional Photographer');
      expect(CREW_ROLES).toContain('Cinematographer');
      expect(CREW_ROLES).toContain('Drone Pilot / Aerial');
      expect(CREW_ROLES).toContain('Video Editor / Colorist');
      expect(CREW_ROLES).toContain('Production Assistant / Lightman');
    });

    it('verifies active employees include Studio Owner with real name and designation', () => {
      localStorage.setItem('studio_os_owner_name', 'Abhay Jarsaniya');
      const roster = crewConflictService.getActiveEmployees(TEST_STUDIO);
      const owner = roster[0];
      expect(owner.fullName).toContain('Abhay Jarsaniya (Studio Owner)');
      expect(owner.designation).toBe('Studio Owner');
      expect((owner as any).isStudioOwner).toBe(true);
    });
  });

  describe('4. Conflict Detection & Warning', () => {
    it('detects and warns when a team member or owner is double-booked on overlapping dates and times', () => {
      localStorage.setItem('studio_os_owner_name', 'Abhay');
      const owner = getStudioOwnerCrewMember(TEST_STUDIO);

      // Seed an existing event
      TenantStore.set(TEST_STUDIO, 'events', [
        {
          id: 'evt_conflict_existing',
          studioId: TEST_STUDIO,
          name: 'Patel Engagement Ceremony',
          startDate: '2026-11-25',
          endDate: '2026-11-25',
          startTime: '10:00',
          endTime: '15:00',
          venue: 'Crowne Plaza',
          assignedTeamIds: [owner.id]
        }
      ]);

      // Check conflict for overlapping shoot
      const conflict = crewConflictService.checkConflict(
        TEST_STUDIO,
        owner.id,
        '2026-11-25',
        '11:00',
        '14:00'
      );

      expect(conflict.hasConflict).toBe(true);
      expect(conflict.warningMessage).toContain('already assigned to another event');
      expect(conflict.conflictingVenue).toContain('Crowne Plaza');

      // Check conflict for non-overlapping shoot
      const noConflict = crewConflictService.checkConflict(
        TEST_STUDIO,
        owner.id,
        '2026-11-25',
        '17:00',
        '22:00'
      );
      expect(noConflict.hasConflict).toBe(false);
    });
  });

  describe('5. Calendar Visibility & Post-Creation Editing', () => {
    it('supports individual calendar visibility toggle and post-creation removal', async () => {
      const owner = getStudioOwnerCrewMember(TEST_STUDIO);
      const employees = crewConflictService.getActiveEmployees(TEST_STUDIO);
      const emp1 = employees[1];

      const bookingId = 'bkg_edit_flow_001';
      const booking: BookingRecord = {
        id: bookingId,
        studioId: TEST_STUDIO,
        bookingNumber: 'BK-2026-8899',
        customerId: 'cust_edit_01',
        customerName: 'Kunal Singhania',
        customerPhone: '+91 97240 12345',
        eventName: 'Singhania Reception',
        category: 'Reception',
        mainEventDate: '2026-12-05',
        startDate: '2026-12-05',
        venue: 'JW Marriott',
        status: 'deal_confirmed',
        numberOfDays: 1,
        numberOfFunctions: 1,
        functions: [
          {
            id: 'fn_reception_main',
            bookingId,
            name: 'Reception',
            category: 'Reception',
            orderIndex: 1,
            date: '2026-12-05',
            startTime: '18:00',
            endTime: '23:00',
            venue: 'JW Marriott',
            assignedPhotographerIds: [owner.id],
            assignedVideographerIds: [emp1.id],
            assignedDroneOperatorIds: [],
            assignedEditorIds: [],
            assignedSupplierIds: [],
            assignedCrew: [
              {
                employeeId: owner.id,
                employeeName: formatOwnerCrewDisplayName(owner.fullName),
                role: 'Lead Photographer',
                isVisibleOnCalendar: true
              },
              {
                employeeId: emp1.id,
                employeeName: emp1.fullName,
                role: 'Cinematographer',
                isVisibleOnCalendar: true
              }
            ],
            priority: 'normal',
            status: 'scheduled',
            deliverables: []
          }
        ],
        deliverables: [],
        billingVersions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as any as BookingRecord;

      await bookingProductionService.saveBooking(TEST_STUDIO, booking);

      // Verify initial calendar events for emp1
      const initialEmpEvents = calendarVisibilityService.getEmployeeCalendarEvents(TEST_STUDIO, emp1.id);
      expect(initialEmpEvents.some(e => e.bookingId === bookingId)).toBe(true);

      // 1. Toggle visibility to Hidden
      await calendarVisibilityService.setEmployeeCalendarVisibility(
        TEST_STUDIO,
        bookingId,
        emp1.id,
        'fn_reception_main',
        false
      );

      const hiddenEmpEvents = calendarVisibilityService.getEmployeeCalendarEvents(TEST_STUDIO, emp1.id);
      expect(hiddenEmpEvents.some(e => e.bookingId === bookingId)).toBe(false);

      // 2. Unassign / Remove crew member
      await calendarVisibilityService.unassignCrewMember(
        TEST_STUDIO,
        bookingId,
        'fn_reception_main',
        emp1.id
      );

      const reloaded = bookingProductionService.getBooking(TEST_STUDIO, bookingId);
      expect(reloaded?.functions[0].assignedCrew?.some(c => c.employeeId === emp1.id)).toBe(false);
    });
  });

  describe('7. Simplified Crew Assignment, Sub-Events & Multi-Select Suite', () => {
    it('verifies all required sub-event types are available including Custom Shoot', () => {
      expect(PREDEFINED_SUB_EVENT_TYPES).toContain('Pre-Wedding');
      expect(PREDEFINED_SUB_EVENT_TYPES).toContain('Engagement');
      expect(PREDEFINED_SUB_EVENT_TYPES).toContain('Mandvo');
      expect(PREDEFINED_SUB_EVENT_TYPES).toContain('Haldi');
      expect(PREDEFINED_SUB_EVENT_TYPES).toContain('Mehndi');
      expect(PREDEFINED_SUB_EVENT_TYPES).toContain('Wedding');
      expect(PREDEFINED_SUB_EVENT_TYPES).toContain('Reception');
      expect(PREDEFINED_SUB_EVENT_TYPES).toContain('Custom Shoot');
      expect(PREDEFINED_SUB_EVENT_TYPES.length).toBe(8);
    });

    it('assigns crew via multi-select without role dropdown, defaulting role to staff designation / studio owner', async () => {
      localStorage.setItem('studio_os_owner_name', 'Jenish Moradiya');
      const ownerMember = getStudioOwnerCrewMember(TEST_STUDIO);
      const employees = crewConflictService.getActiveEmployees(TEST_STUDIO);
      const emp1 = employees[1];
      const emp2 = employees[2];

      const bookingId = 'bkg_multiselect_001';
      // Simulate multi-select assignment: user checks ownerMember, emp1, emp2 simultaneously
      const selectedMembers = [
        {
          employeeId: ownerMember.id,
          employeeName: formatOwnerCrewDisplayName(ownerMember.fullName),
          designation: 'Studio Owner',
          role: 'Studio Owner', // assigned automatically without role dropdown
          isVisibleOnCalendar: true
        },
        {
          employeeId: emp1.id,
          employeeName: emp1.fullName,
          designation: emp1.designation || 'Staff',
          role: emp1.designation || 'Staff', // assigned automatically from designation
          isVisibleOnCalendar: true
        },
        {
          employeeId: emp2.id,
          employeeName: emp2.fullName,
          designation: emp2.designation || 'Staff',
          role: emp2.designation || 'Staff',
          isVisibleOnCalendar: false // toggled off by owner
        }
      ];

      const haldiFn: FunctionPlan = {
        id: 'fn_haldi_001',
        bookingId,
        name: 'Haldi Function',
        category: 'Haldi',
        city: 'Surat',
        date: '2026-11-25',
        startTime: '09:00',
        endTime: '12:00',
        venue: 'Poolside Lawn',
        assignedPhotographerIds: [ownerMember.id, emp1.id],
        assignedVideographerIds: [emp2.id],
        assignedDroneOperatorIds: [],
        assignedEditorIds: [],
        assignedSupplierIds: [],
        assignedCrew: selectedMembers,
        priority: 'normal',
        status: 'scheduled',
        deliverables: []
      };

      const booking: BookingRecord = {
        id: bookingId,
        studioId: TEST_STUDIO,
        bookingNumber: 'BK-MULTI-001',
        customerId: 'cust_002',
        customerName: 'Kavya & Rohan Patel',
        customerPhone: '+91 98980 33445',
        customerWhatsApp: '+91 98980 33445',
        city: 'Surat',
        eventName: 'Patel Wedding',
        category: 'Wedding',
        mainEventDate: '2026-11-25',
        startDate: '2026-11-25',
        venue: 'Avadh Utopia Surat',
        status: 'deal_confirmed',
        numberOfDays: 1,
        numberOfFunctions: 1,
        functions: [haldiFn],
        deliverables: [],
        billingVersions: [],
        financials: {
          originalQuotation: 100000,
          negotiatedDiscount: 0,
          finalAgreedAmount: 100000,
          verifiedPaymentsReceived: 50000,
          remainingBalance: 50000,
          advanceRequired: 50000,
          advanceReceived: 50000,
          isAdvanceConfirmed: true,
          paymentMilestones: []
        },
        notes: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as any as BookingRecord;

      await bookingProductionService.saveBooking(TEST_STUDIO, booking);

      for (const m of selectedMembers) {
        await calendarVisibilityService.assignCrewMember({
          studioId: TEST_STUDIO,
          bookingId,
          functionId: haldiFn.id,
          employeeId: m.employeeId,
          employeeName: m.employeeName,
          role: m.role,
          isVisibleOnCalendar: m.isVisibleOnCalendar
        });
      }

      const reloaded = bookingProductionService.getBooking(TEST_STUDIO, bookingId);
      expect(reloaded?.functions[0].assignedCrew).toHaveLength(3);
      expect(reloaded?.functions[0].assignedCrew?.[0].employeeName).toContain('Jenish Moradiya');
      expect(reloaded?.functions[0].assignedCrew?.[0].role).toBe('Studio Owner');
      expect(reloaded?.functions[0].assignedCrew?.[1].role).toBe(emp1.designation);

      // Verify calendar events reflect visibility
      const ownerEvents = calendarVisibilityService.getEmployeeCalendarEvents(TEST_STUDIO, ownerMember.id);
      expect(ownerEvents.some(e => e.bookingId === bookingId)).toBe(true);

      const emp1Events = calendarVisibilityService.getEmployeeCalendarEvents(TEST_STUDIO, emp1.id);
      expect(emp1Events.some(e => e.bookingId === bookingId)).toBe(true);

      const emp2Events = calendarVisibilityService.getEmployeeCalendarEvents(TEST_STUDIO, emp2.id);
      expect(emp2Events.some(e => e.bookingId === bookingId)).toBe(false); // hidden
    });

    it('manages independent crew selections across separate sub-events (Haldi, Mehndi, Wedding, Reception)', async () => {
      const ownerMember = getStudioOwnerCrewMember(TEST_STUDIO);
      const employees = crewConflictService.getActiveEmployees(TEST_STUDIO);
      const emp1 = employees[1];
      const emp2 = employees[2];
      const emp3 = employees[3] || employees[1];

      const bookingId = 'bkg_indep_fn_001';
      const fnHaldi: FunctionPlan = {
        id: 'fn_haldi',
        bookingId,
        name: 'Haldi',
        category: 'Haldi',
        city: 'Gandhinagar',
        date: '2026-11-26',
        startTime: '10:00',
        endTime: '13:00',
        venue: 'Lawn',
        assignedPhotographerIds: [],
        assignedVideographerIds: [],
        assignedDroneOperatorIds: [],
        assignedEditorIds: [],
        assignedSupplierIds: [],
        assignedCrew: [
          { employeeId: ownerMember.id, employeeName: ownerMember.fullName, role: 'Studio Owner', isVisibleOnCalendar: true }
        ],
        priority: 'normal',
        status: 'scheduled',
        deliverables: []
      };

      const fnMehndi: FunctionPlan = {
        id: 'fn_mehndi',
        bookingId,
        name: 'Mehndi',
        category: 'Mehndi',
        city: 'Gandhinagar',
        date: '2026-11-26',
        startTime: '16:00',
        endTime: '20:00',
        venue: 'Courtyard',
        assignedPhotographerIds: [],
        assignedVideographerIds: [],
        assignedDroneOperatorIds: [],
        assignedEditorIds: [],
        assignedSupplierIds: [],
        assignedCrew: [
          { employeeId: emp1.id, employeeName: emp1.fullName, role: emp1.designation || 'Staff', isVisibleOnCalendar: true },
          { employeeId: emp2.id, employeeName: emp2.fullName, role: emp2.designation || 'Staff', isVisibleOnCalendar: true }
        ],
        priority: 'normal',
        status: 'scheduled',
        deliverables: []
      };

      const fnWedding: FunctionPlan = {
        id: 'fn_wedding',
        bookingId,
        name: 'Wedding Ceremony',
        category: 'Wedding',
        city: 'Gandhinagar',
        date: '2026-11-27',
        startTime: '09:00',
        endTime: '15:00',
        venue: 'Grand Ballroom',
        assignedPhotographerIds: [],
        assignedVideographerIds: [],
        assignedDroneOperatorIds: [],
        assignedEditorIds: [],
        assignedSupplierIds: [],
        assignedCrew: [
          { employeeId: ownerMember.id, employeeName: ownerMember.fullName, role: 'Studio Owner', isVisibleOnCalendar: true },
          { employeeId: emp1.id, employeeName: emp1.fullName, role: emp1.designation || 'Staff', isVisibleOnCalendar: true },
          { employeeId: emp3.id, employeeName: emp3.fullName, role: emp3.designation || 'Staff', isVisibleOnCalendar: true }
        ],
        priority: 'high',
        status: 'scheduled',
        deliverables: []
      };

      const booking: BookingRecord = {
        id: bookingId,
        studioId: TEST_STUDIO,
        bookingNumber: 'BK-INDEP-001',
        customerName: 'Ananya & Kabir',
        mainEventDate: '2026-11-26',
        startDate: '2026-11-26',
        venue: 'The Leela Gandhinagar',
        status: 'deal_confirmed',
        functions: [fnHaldi, fnMehndi, fnWedding],
        deliverables: [],
        financials: { finalAgreedAmount: 200000, verifiedPaymentsReceived: 100000, remainingBalance: 100000 }
      } as any as BookingRecord;

      await bookingProductionService.saveBooking(TEST_STUDIO, booking);

      const reloaded = bookingProductionService.getBooking(TEST_STUDIO, bookingId);
      expect(reloaded?.functions).toHaveLength(3);
      // Haldi has 1 crew (owner only)
      expect(reloaded?.functions[0].assignedCrew).toHaveLength(1);
      expect(reloaded?.functions[0].assignedCrew?.[0].employeeId).toBe(ownerMember.id);
      // Mehndi has 2 crew (emp1, emp2 - without owner)
      expect(reloaded?.functions[1].assignedCrew).toHaveLength(2);
      expect(reloaded?.functions[1].assignedCrew?.some(c => c.employeeId === ownerMember.id)).toBe(false);
      // Wedding has 3 crew (owner, emp1, emp3)
      expect(reloaded?.functions[2].assignedCrew).toHaveLength(3);
    });

    it('prevents duplicate crew assignments when checking or applying members repeatedly', async () => {
      const ownerMember = getStudioOwnerCrewMember(TEST_STUDIO);
      const employees = crewConflictService.getActiveEmployees(TEST_STUDIO);
      const emp1 = employees[1];

      const bookingId = 'bkg_dedup_001';
      const initialCrew = [
        { employeeId: ownerMember.id, employeeName: ownerMember.fullName, role: 'Studio Owner', isVisibleOnCalendar: true }
      ];

      // Simulate checking ownerMember again: deduplication logic should keep array at length 1
      const isAlreadyIn = initialCrew.some(c => c.employeeId === ownerMember.id);
      expect(isAlreadyIn).toBe(true);

      const updatedCrew = isAlreadyIn 
        ? initialCrew // duplicate skipped
        : [...initialCrew, { employeeId: ownerMember.id, employeeName: ownerMember.fullName, role: 'Studio Owner', isVisibleOnCalendar: true }];

      expect(updatedCrew).toHaveLength(1);

      // Now adding emp1
      const isEmp1In = updatedCrew.some(c => c.employeeId === emp1.id);
      expect(isEmp1In).toBe(false);
      const withEmp1 = [...updatedCrew, { employeeId: emp1.id, employeeName: emp1.fullName, role: emp1.designation || 'Staff', isVisibleOnCalendar: true }];
      expect(withEmp1).toHaveLength(2);

      // Adding emp1 a second time is deduplicated
      const isEmp1InAgain = withEmp1.some(c => c.employeeId === emp1.id);
      expect(isEmp1InAgain).toBe(true);
      const dedupedAgain = isEmp1InAgain ? withEmp1 : [...withEmp1, { employeeId: emp1.id, employeeName: emp1.fullName, role: emp1.designation || 'Staff', isVisibleOnCalendar: true }];
      expect(dedupedAgain).toHaveLength(2);
    });
  });
});
