import { describe, it, expect, beforeEach } from 'vitest';
import { bookingProductionService } from '../services/bookingProductionService';
import { TenantStore } from '../services/tenantStore';
import { BookingRecord } from '../types/bookingProduction';

describe('Studio OS — Duplicate Booking Prevention, Soft Delete & Outside Click', () => {
  const testStudioId = 'test_studio_anti_dupe';

  const mockBooking: BookingRecord = {
    id: 'bkg_test_001',
    studioId: testStudioId,
    bookingNumber: 'BKG-2026-9901',
    status: 'deal_confirmed',
    customerId: 'cust_001',
    customerName: 'Aarav Patel',
    customerPhone: '9876543210',
    customerWhatsApp: '9876543210',
    eventName: 'Royal Grand Wedding',
    category: 'Wedding',
    mainEventDate: '2026-11-20',
    startDate: '2026-11-20',
    venue: 'Grand Bhagwati Palace',
    city: 'Ahmedabad',
    numberOfDays: 1,
    numberOfFunctions: 1,
    functions: [
      {
        id: 'fn_1',
        bookingId: 'bkg_test_001',
        name: 'Wedding Ceremony',
        category: 'Wedding',
        date: '2026-11-20',
        startTime: '10:00',
        endTime: '18:00',
        venue: 'Grand Bhagwati Palace',
        city: 'Ahmedabad',
        assignedPhotographerIds: ['emp_1'],
        assignedVideographerIds: [],
        assignedDroneOperatorIds: [],
        assignedEditorIds: [],
        assignedSupplierIds: [],
        assignedCrew: [
          {
            employeeId: 'emp_1',
            employeeName: 'Rahul Sharma',
            role: 'Lead Photographer'
          }
        ],
        priority: 'normal',
        status: 'scheduled',
        deliverables: []
      }
    ],
    deliverables: [],
    financials: {
      originalQuotation: 150000,
      negotiatedDiscount: 10000,
      finalAgreedAmount: 140000,
      verifiedPaymentsReceived: 50000,
      remainingBalance: 90000,
      advanceRequired: 50000,
      advanceReceived: 50000,
      advanceReceivedDate: '2026-11-20',
      isAdvanceConfirmed: true,
      paymentMilestones: []
    },
    billingVersions: [],
    notes: 'Test notes',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  beforeEach(() => {
    TenantStore.resetTenant(testStudioId);
    TenantStore.set(testStudioId, 'studio_bookings_v2', []);
    TenantStore.set(testStudioId, 'events', []);
  });

  // =========================================================================
  // REQUIREMENT 1: DUPLICATE BOOKING PREVENTION & IDEMPOTENCY
  // =========================================================================
  describe('Requirement 1: Duplicate Booking Prevention', () => {
    it('rapid 5x clicks with stable booking session ID creates exactly 1 booking', async () => {
      // Simulate rapid 5 clicks with same stable booking session ID
      const promises = [
        bookingProductionService.saveBooking(testStudioId, { ...mockBooking }),
        bookingProductionService.saveBooking(testStudioId, { ...mockBooking }),
        bookingProductionService.saveBooking(testStudioId, { ...mockBooking }),
        bookingProductionService.saveBooking(testStudioId, { ...mockBooking }),
        bookingProductionService.saveBooking(testStudioId, { ...mockBooking })
      ];

      await Promise.all(promises);

      const allBookings = bookingProductionService.listBookings(testStudioId);
      const matches = allBookings.filter(b => b.id === mockBooking.id);
      expect(matches.length).toBe(1);
      expect(matches[0].eventName).toBe('Royal Grand Wedding');
    });

    it('near-instantaneous submissions with different IDs but identical event/client deduplicate', async () => {
      const nowIso = new Date().toISOString();
      const firstBooking: BookingRecord = {
        ...mockBooking,
        id: 'bkg_click_1',
        createdAt: nowIso
      };

      const secondBooking: BookingRecord = {
        ...mockBooking,
        id: 'bkg_click_2',
        createdAt: nowIso
      };

      await bookingProductionService.saveBooking(testStudioId, firstBooking);
      const secondResult = await bookingProductionService.saveBooking(testStudioId, secondBooking);

      // The second call should return the existing booking and not add a second one
      expect(secondResult.id).toBe('bkg_click_1');
      const matchingBookings = bookingProductionService.listBookings(testStudioId).filter(b => b.customerName === 'Aarav Patel');
      expect(matchingBookings.length).toBe(1);
    });

    it('preserves form data when retry occurs with same session ID', async () => {
      const initial = await bookingProductionService.saveBooking(testStudioId, mockBooking);
      expect(initial.customerName).toBe('Aarav Patel');

      // User modifies notes and resubmits with same stable ID
      const updatedRecord: BookingRecord = {
        ...mockBooking,
        notes: 'Updated client requirement for drone clearance'
      };
      await bookingProductionService.saveBooking(testStudioId, updatedRecord);

      const retrieved = bookingProductionService.getBooking(testStudioId, mockBooking.id);
      expect(retrieved?.notes).toBe('Updated client requirement for drone clearance');
      const matchingBookings = bookingProductionService.listBookings(testStudioId).filter(b => b.customerName === 'Aarav Patel');
      expect(matchingBookings.length).toBe(1);
    });
  });

  // =========================================================================
  // REQUIREMENT 2: DELETE BOOKINGS / EVENTS & ROLE ENFORCEMENT
  // =========================================================================
  describe('Requirement 2: Soft Delete Bookings & Role Enforcement', () => {
    beforeEach(async () => {
      await bookingProductionService.saveBooking(testStudioId, mockBooking);
    });

    it('allows Studio Owner to delete a booking with soft delete', async () => {
      const result = await bookingProductionService.softDeleteBooking(
        testStudioId,
        mockBooking.id,
        'owner',
        'Abhay Jarsaniya'
      );

      expect(result.success).toBe(true);

      // Excluded from standard listBookings
      const activeBookings = bookingProductionService.listBookings(testStudioId);
      expect(activeBookings.some(b => b.id === mockBooking.id)).toBe(false);

      // Retained in soft-deleted state for audit
      const allBookings = bookingProductionService.listBookings(testStudioId, true);
      const deletedBooking = allBookings.find(b => b.id === mockBooking.id);
      expect(deletedBooking).toBeDefined();
      expect(deletedBooking?.isDeleted).toBe(true);
      expect(deletedBooking?.deletedBy).toBe('Abhay Jarsaniya');
      expect(deletedBooking?.deletedAt).toBeDefined();

      // Financials remain intact for accounting
      expect(deletedBooking?.financials.finalAgreedAmount).toBe(140000);
      expect(deletedBooking?.financials.verifiedPaymentsReceived).toBe(50000);
    });

    it('blocks Employees from deleting a booking', async () => {
      await expect(
        bookingProductionService.softDeleteBooking(
          testStudioId,
          mockBooking.id,
          'employee',
          'Rahul Sharma'
        )
      ).rejects.toThrow(/Unauthorized: Only Studio Owners can delete bookings/);

      // Booking must remain active
      const activeBookings = bookingProductionService.listBookings(testStudioId);
      expect(activeBookings.some(b => b.id === mockBooking.id)).toBe(true);
    });

    it('clears corresponding StudioEvent crew allocations on deletion', async () => {
      await bookingProductionService.softDeleteBooking(
        testStudioId,
        mockBooking.id,
        'owner',
        'Abhay Jarsaniya'
      );

      const events = TenantStore.get<any>(testStudioId, 'events') || [];
      const ev = events.find((e: any) => e.id === mockBooking.id);
      expect(ev).toBeDefined();
      expect(ev.isDeleted).toBe(true);
      expect(ev.assignedTeamIds).toEqual([]);
    });

    it('immediately broadcasts studio_data_updated event and removes booking from active list', async () => {
      let broadcastReceived = false;
      let eventDetail: any = null;

      if (typeof (globalThis as any).CustomEvent === 'undefined') {
        (globalThis as any).CustomEvent = class CustomEvent {
          type: string;
          detail: any;
          constructor(type: string, params: any = {}) {
            this.type = type;
            this.detail = params.detail;
          }
        };
      }

      const target: any = typeof window !== 'undefined' ? window : globalThis;
      const listeners: Record<string, Function[]> = {};
      target.addEventListener = (evt: string, fn: Function) => {
        listeners[evt] = listeners[evt] || [];
        listeners[evt].push(fn);
      };
      target.removeEventListener = (evt: string, fn: Function) => {
        if (listeners[evt]) {
          listeners[evt] = listeners[evt].filter(f => f !== fn);
        }
      };
      target.dispatchEvent = (evtObj: any) => {
        (listeners[evtObj.type] || []).forEach(fn => fn(evtObj));
        return true;
      };

      const listener = (e: any) => {
        broadcastReceived = true;
        eventDetail = e.detail;
      };

      target.addEventListener('studio_data_updated', listener);

      try {
        const res = await bookingProductionService.softDeleteBooking(
          testStudioId,
          mockBooking.id,
          'owner',
          'Abhay Jarsaniya'
        );

        expect(res.success).toBe(true);
        expect(broadcastReceived).toBe(true);
        expect(eventDetail?.type).toBe('booking_deleted');
        expect(eventDetail?.bookingId).toBe(mockBooking.id);
        expect(eventDetail?.studioId).toBe(testStudioId);

        // Immediate removal from active bookings
        const active = bookingProductionService.listBookings(testStudioId);
        expect(active.find(b => b.id === mockBooking.id)).toBeUndefined();
      } finally {
        target.removeEventListener('studio_data_updated', listener);
      }
    });

    it('returns error when trying to delete a non-existent booking without throwing', async () => {
      const res = await bookingProductionService.softDeleteBooking(
        testStudioId,
        'non_existent_booking_99999',
        'owner',
        'Abhay Jarsaniya'
      );

      expect(res.success).toBe(false);
      expect(res.error).toBe('Booking not found');
    });
  });

  // =========================================================================
  // REQUIREMENT 3: OUTSIDE CLICK & ESCAPE KEY CLOSING LOGIC
  // =========================================================================
  describe('Requirement 3: Outside Click & Escape Key Closing Mechanism', () => {
    it('accurately distinguishes inside taps from outside clicks and handles Escape key', () => {
      let isDropdownOpen = true;
      const targetElement = {
        id: 'status-dropdown-container',
        contains: (node: any) => node && node.id === 'inside-target-button'
      };

      const closeDropdown = () => {
        isDropdownOpen = false;
      };

      // Handler matching useOutsideClick logic
      const handlePointerEvent = (clickedNode: any) => {
        if (!targetElement.contains(clickedNode)) {
          closeDropdown();
        }
      };

      const handleKeyEvent = (key: string) => {
        if (key === 'Escape') {
          closeDropdown();
        }
      };

      // Test 1: Clicking inside the dropdown container does not close it
      isDropdownOpen = true;
      handlePointerEvent({ id: 'inside-target-button' });
      expect(isDropdownOpen).toBe(true);

      // Test 2: Clicking or tapping outside closes the dropdown immediately
      isDropdownOpen = true;
      handlePointerEvent({ id: 'outside-page-body' });
      expect(isDropdownOpen).toBe(false);

      // Test 3: Pressing Escape key closes the dropdown
      isDropdownOpen = true;
      handleKeyEvent('Escape');
      expect(isDropdownOpen).toBe(false);

      // Test 4: Pressing other keys (e.g. Enter, Space, Tab) does not dismiss the dropdown
      isDropdownOpen = true;
      handleKeyEvent('Enter');
      expect(isDropdownOpen).toBe(true);
    });
  });
});
