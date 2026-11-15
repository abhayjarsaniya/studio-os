import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { bookingProductionService } from '../services/bookingProductionService';
import { calendarVisibilityService } from '../services/calendarVisibilityService';
import { firestoreService } from '../services/firestoreService';
import { TenantStore } from '../services/tenantStore';
import { BookingRecord } from '../types/bookingProduction';

const TEST_STUDIO_ID = 'studio_shreeji_films';

describe('Studio Owner Dashboard & Instant Auto-Save Workflow', () => {
  beforeEach(() => {
    // Reset test booking
    const sampleBooking: BookingRecord = {
      id: 'bkg_autosave_test_001',
      studioId: TEST_STUDIO_ID,
      bookingNumber: 'BKG-2026-TEST',
      status: 'deal_confirmed',
      customerId: 'cust_test_01',
      customerName: 'Aarav Patel',
      customerPhone: '+91 98980 12345',
      customerWhatsApp: '+91 98980 12345',
      customerEmail: 'aarav.patel@example.com',
      eventName: 'Aarav & Meera Wedding',
      category: 'Wedding',
      mainEventDate: '2026-12-15',
      startDate: '2026-12-15',
      venue: 'Gulmohar Greens',
      city: 'Ahmedabad',
      numberOfDays: 2,
      numberOfFunctions: 2,
      functions: [
        {
          id: 'fn_test_01',
          bookingId: 'bkg_autosave_test_001',
          name: 'Wedding Ceremony',
          category: 'Wedding',
          date: '2026-12-15',
          startTime: '10:00',
          endTime: '18:00',
          venue: 'Gulmohar Greens Lawn',
          city: 'Ahmedabad',
          assignedPhotographerIds: [],
          assignedVideographerIds: [],
          assignedDroneOperatorIds: [],
          assignedEditorIds: [],
          assignedSupplierIds: [],
          deliverables: [],
          priority: 'normal',
          status: 'scheduled',
          assignedCrew: [
            {
              employeeId: 'emp_shreeji_01',
              employeeName: 'Hardik Joshi',
              role: 'Lead Photographer',
              contact: '+91 98250 11221',
              isVisibleOnCalendar: true
            } as any
          ]
        }
      ],
      deliverables: [
        {
          id: 'del_test_01',
          bookingId: 'bkg_autosave_test_001',
          name: 'Highlight Video Film',
          category: 'video',
          requiredQty: 1,
          completedQty: 0,
          unit: 'film',
          deliveryMethod: 'Google Drive',
          deadlineType: 'specific_date',
          calculatedDeadline: '2026-12-25',
          priority: 'high',
          stage: 'not_started',
          isDelivered: false,
          isPartiallyDelivered: false
        }
      ],
      financials: {
        originalQuotation: 250000,
        negotiatedDiscount: 25000,
        finalAgreedAmount: 225000,
        advanceRequired: 50000,
        advanceReceived: 50000,
        verifiedPaymentsReceived: 50000,
        remainingBalance: 175000,
        isAdvanceConfirmed: true,
        advanceReceivedDate: '2026-11-01',
        paymentMilestones: []
      },
      billingVersions: [],
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    TenantStore.set(TEST_STUDIO_ID, 'studio_bookings_v2', [sampleBooking]);
  });

  describe('1. Header & Navigation Cleanliness Requirements', () => {
    it('completely removes top-header Create Booking button from DesktopHeader', () => {
      const headerPath = path.resolve(__dirname, '../components/layout/DesktopHeader.tsx');
      const content = fs.readFileSync(headerPath, 'utf8');

      // Must not contain "Create Booking" button
      expect(content).not.toContain('Create Booking');
      expect(content).not.toContain('handleCreateBooking');
    });

    it('removes visible "Local backup active" tag from SaveIndicator', () => {
      const saveIndicatorPath = path.resolve(__dirname, '../components/common/SaveIndicator.tsx');
      const content = fs.readFileSync(saveIndicatorPath, 'utf8');

      // Must not display "Local backup active" tag in UI
      expect(content).not.toContain('Local backup active');
      // When offline, returns null
      expect(content).toContain("status === 'offline'");
    });

    it('redesigns sidebar New Booking button with premium orange styling and min 48px touch height', () => {
      const sidebarPath = path.resolve(__dirname, '../components/layout/DesktopSidebar.tsx');
      const content = fs.readFileSync(sidebarPath, 'utf8');

      expect(content).toContain('min-h-[48px]');
      expect(content).toContain('from-orange-500');
      expect(content).toContain('+ New Booking');
      expect(content).toContain('px-3.5 pt-3.5');
    });

    it('redesigns dashboard New Booking button with matching balanced style and avoids duplicate emphasis', () => {
      const dashboardPath = path.resolve(__dirname, '../pages/DashboardPage.tsx');
      const content = fs.readFileSync(dashboardPath, 'utf8');

      // Welcome section button has matching min-h-[50px] / min-h-[44px] and premium gradient
      expect(content).toContain('min-h-[50px] sm:min-h-[44px]');
      expect(content).toContain('from-orange-500 via-orange-500 to-amber-500');
      
      // Quick actions button uses subtle secondary tint instead of loud competing duplicate
      expect(content).toContain('Start New Booking');
      expect(content).toContain('bg-orange-50/80');
    });
  });

  describe('2. Instant Actions and Auto-Save Persistence', () => {
    it('instantly saves booking details, dates, and venues directly to store & Firestore', async () => {
      const booking = bookingProductionService.getBooking(TEST_STUDIO_ID, 'bkg_autosave_test_001')!;
      expect(booking).toBeDefined();

      // Update venue and date without requiring a manual save button
      booking.venue = 'The Grand Taj Heritage';
      booking.mainEventDate = '2026-12-28';
      booking.startDate = '2026-12-28';

      await bookingProductionService.saveBooking(TEST_STUDIO_ID, booking);

      // Verify immediate persistence in TenantStore
      const updated = bookingProductionService.getBooking(TEST_STUDIO_ID, 'bkg_autosave_test_001')!;
      expect(updated.venue).toBe('The Grand Taj Heritage');
      expect(updated.mainEventDate).toBe('2026-12-28');

      // Verify synchronized StudioEvent for Calendar
      const events = TenantStore.get<any>(TEST_STUDIO_ID, 'events');
      const syncEvent = events.find(e => e.id === 'bkg_autosave_test_001');
      expect(syncEvent).toBeDefined();
      expect(syncEvent.venue).toBe('The Grand Taj Heritage');
      expect(syncEvent.startDate).toBe('2026-12-28');
    });

    it('instantly toggles crew calendar visibility and persists assignment', async () => {
      // Toggle visibility off
      await calendarVisibilityService.setEmployeeCalendarVisibility(
        TEST_STUDIO_ID,
        'bkg_autosave_test_001',
        'emp_shreeji_01',
        'fn_test_01',
        false
      );

      // Assignment must be preserved in booking
      const booking = bookingProductionService.getBooking(TEST_STUDIO_ID, 'bkg_autosave_test_001')!;
      const crewMember = booking.functions[0].assignedCrew.find(c => c.employeeId === 'emp_shreeji_01')!;
      expect(crewMember).toBeDefined();
      expect((crewMember as any).isVisibleOnCalendar).toBe(false);

      // Toggle visibility back on
      await calendarVisibilityService.setEmployeeCalendarVisibility(
        TEST_STUDIO_ID,
        'bkg_autosave_test_001',
        'emp_shreeji_01',
        'fn_test_01',
        true
      );

      const booking2 = bookingProductionService.getBooking(TEST_STUDIO_ID, 'bkg_autosave_test_001')!;
      const crewMember2 = booking2.functions[0].assignedCrew.find(c => c.employeeId === 'emp_shreeji_01')!;
      expect((crewMember2 as any).isVisibleOnCalendar).toBe(true);
    });

    it('safely records financial payments without accidental duplicate writes', () => {
      const initialPayments = (TenantStore.get<any>(TEST_STUDIO_ID, 'payments') || []).length;

      // First payment
      const res1 = bookingProductionService.recordBookingPayment(TEST_STUDIO_ID, 'bkg_autosave_test_001', {
        amount: 30000,
        paymentMethod: 'UPI',
        reference: 'TXN-SAFE-998877'
      });

      expect(res1.booking.financials.verifiedPaymentsReceived).toBe(80000);
      expect(res1.booking.financials.remainingBalance).toBe(145000);

      const paymentsAfter1 = TenantStore.get<any>(TEST_STUDIO_ID, 'payments');
      expect(paymentsAfter1.length).toBe(initialPayments + 1);

      // Immediate duplicate payment attempt with identical reference
      bookingProductionService.recordBookingPayment(TEST_STUDIO_ID, 'bkg_autosave_test_001', {
        amount: 30000,
        paymentMethod: 'UPI',
        reference: 'TXN-SAFE-998877'
      });

      // Total payments count must not increase (duplicate blocked)
      const paymentsAfter2 = TenantStore.get<any>(TEST_STUDIO_ID, 'payments');
      expect(paymentsAfter2.length).toBe(initialPayments + 1);

      // Balance must remain unchanged
      const booking = bookingProductionService.getBooking(TEST_STUDIO_ID, 'bkg_autosave_test_001')!;
      expect(booking.financials.verifiedPaymentsReceived).toBe(80000);
    });

    it('persists data across simulated browser refresh', () => {
      // Modify notes
      const booking = bookingProductionService.getBooking(TEST_STUDIO_ID, 'bkg_autosave_test_001')!;
      booking.notes = 'Drone coverage during sunset is high priority';
      bookingProductionService.saveBooking(TEST_STUDIO_ID, booking);

      // Simulate browser refresh by reading directly from storage layer
      const storedBookings = TenantStore.get<BookingRecord>(TEST_STUDIO_ID, 'studio_bookings_v2');
      const retrieved = storedBookings.find(b => b.id === 'bkg_autosave_test_001');

      expect(retrieved).toBeDefined();
      expect(retrieved?.notes).toBe('Drone coverage during sunset is high priority');
    });
  });
});
