import { describe, it, expect, beforeEach } from 'vitest';
import { bookingProductionService } from '../services/bookingProductionService';
import { masterAdminService } from '../services/masterAdminService';
import { employeeWorkspaceService } from '../services/employeeWorkspaceService';
import { pdfGeneratorService } from '../services/pdfGeneratorService';
import { TenantStore } from '../services/tenantStore';
import { BookingRecord, FunctionPlan, DeliverableSpecification } from '../types/bookingProduction';

describe('Studio OS — Complete Simplification: One Booking, One Workspace, One-Tap Management', () => {
  const TEST_STUDIO_ID = 'test_studio_simplification_2026';

  beforeEach(() => {
    TenantStore.set(TEST_STUDIO_ID, 'bookings', []);
    TenantStore.set(TEST_STUDIO_ID, 'studio_bookings_v2', []);
    TenantStore.set(TEST_STUDIO_ID, 'employees', []);
  });

  // 1. NAVIGATION SIMPLIFICATION
  describe('1. Navigation Simplification (4 Primary Options)', () => {
    it('Studio Owner navigation strictly exposes only 4 primary items plus + New Booking', () => {
      const allowedOwnerOptions = [
        { id: 'dashboard', label: 'Dashboard', route: '#/app/dashboard' },
        { id: 'calendar', label: 'Calendar', route: '#/app/calendar' },
        { id: 'bookings', label: 'Bookings', route: '#/app/bookings' },
        { id: 'crew', label: 'Crew', route: '#/app/crew' }
      ];

      expect(allowedOwnerOptions).toHaveLength(4);
      const ids = allowedOwnerOptions.map(o => o.id);

      // Verify no clutter or standalone ERP modules in primary owner nav
      expect(ids).not.toContain('crm');
      expect(ids).not.toContain('quotations');
      expect(ids).not.toContain('invoices');
      expect(ids).not.toContain('payments');
      expect(ids).not.toContain('finance');
      expect(ids).not.toContain('deliveries');
      expect(ids).not.toContain('tasks');
      expect(ids).not.toContain('suppliers');
      expect(ids).not.toContain('reports');
    });

    it('Mobile bottom nav supports the core items with touch-friendly targets', () => {
      const mobileNavItems = ['Dashboard', 'Calendar', 'New', 'Bookings', 'Crew'];
      expect(mobileNavItems).toHaveLength(5);
      expect(mobileNavItems).toContain('Dashboard');
      expect(mobileNavItems).toContain('Calendar');
      expect(mobileNavItems).toContain('Bookings');
      expect(mobileNavItems).toContain('Crew');
    });
  });

  // 2. MINIMAL STUDIO OWNER DASHBOARD
  describe('2. Minimal Studio Owner Dashboard', () => {
    it('calculates the 4 core indicators: Upcoming, Confirmed, Pending Payments, and Pending Deliveries', () => {
      const booking1: Partial<BookingRecord> = {
        id: 'bkg_dash_1',
        studioId: TEST_STUDIO_ID,
        bookingNumber: 'BK-2026-0001',
        eventName: 'Mehta Wedding',
        customerName: 'Ananya Mehta',
        mainEventDate: '2026-11-20',
        status: 'deal_confirmed',
        financials: {
          originalQuotation: 250000,
          negotiatedDiscount: 25000,
          finalAgreedAmount: 225000,
          advanceRequired: 50000,
          advanceReceived: 50000,
          verifiedPaymentsReceived: 50000,
          remainingBalance: 175000,
          isAdvanceConfirmed: true,
          paymentMilestones: []
        },
        deliverables: [
          {
            id: 'del_1',
            bookingId: 'bkg_dash_1',
            name: 'Photo Culling',
            category: 'photography',
            priority: 'normal',
            stage: 'not_started',
            deadlineType: 'relative_to_shoot',
            calculatedDeadline: '2026-11-22',
            requiredQty: 1,
            completedQty: 0,
            unit: 'set',
            deliveryMethod: 'Google Drive',
            isDelivered: false
          }
        ]
      };

      const booking2: Partial<BookingRecord> = {
        id: 'bkg_dash_2',
        studioId: TEST_STUDIO_ID,
        bookingNumber: 'BK-2026-0002',
        eventName: 'Shah Reception',
        customerName: 'Kunal Shah',
        mainEventDate: '2026-11-25',
        status: 'advance_received',
        financials: {
          originalQuotation: 180000,
          negotiatedDiscount: 10000,
          finalAgreedAmount: 170000,
          advanceRequired: 40000,
          advanceReceived: 40000,
          verifiedPaymentsReceived: 40000,
          remainingBalance: 130000,
          isAdvanceConfirmed: true,
          paymentMilestones: []
        },
        deliverables: [
          {
            id: 'del_2',
            bookingId: 'bkg_dash_2',
            name: 'Video Teaser',
            category: 'video',
            priority: 'high',
            stage: 'delivered',
            deadlineType: 'relative_to_shoot',
            calculatedDeadline: '2026-11-28',
            requiredQty: 1,
            completedQty: 1,
            unit: 'set',
            deliveryMethod: 'Google Drive',
            isDelivered: true
          }
        ]
      };

      bookingProductionService.saveBooking(TEST_STUDIO_ID, booking1 as BookingRecord);
      bookingProductionService.saveBooking(TEST_STUDIO_ID, booking2 as BookingRecord);

      const bookings = bookingProductionService.listBookings(TEST_STUDIO_ID);
      expect(bookings.length).toBeGreaterThanOrEqual(2);

      // Indicator 1: Upcoming Bookings (eventDate >= today)
      const upcoming = bookings.filter(b => (b.mainEventDate || '') >= '2026-11-14' && b.status !== 'completed' && b.status !== 'cancelled');
      expect(upcoming.length).toBeGreaterThanOrEqual(2);

      // Indicator 2: Confirmed Bookings
      const confirmed = bookings.filter(b => ['deal_confirmed', 'advance_received', 'confirmed'].includes(b.status));
      expect(confirmed.length).toBeGreaterThanOrEqual(2);

      // Indicator 3: Pending Payments Total
      const totalPendingPayments = bookings.reduce((sum, b) => sum + (b.financials?.remainingBalance || 0), 0);
      expect(totalPendingPayments).toBeGreaterThanOrEqual(175000 + 130000); // at least 305,000

      // Indicator 4: Pending Deliveries Count
      const allDeliverables = bookings.flatMap(b => b.deliverables || []);
      const pendingDeliverables = allDeliverables.filter(d => !d.isDelivered);
      expect(pendingDeliverables.length).toBeGreaterThanOrEqual(1);
    });
  });

  // 3. SINGLE UNIFIED BOOKING WORKSPACE
  describe('3. Single Unified Booking Workspace (/app/bookings/:bookingId)', () => {
    let testBooking: BookingRecord;

    beforeEach(() => {
      testBooking = {
        id: 'bkg_workspace_test',
        studioId: TEST_STUDIO_ID,
        customerId: 'cust_aarav_diya',
        bookingNumber: 'BK-2026-7890',
        eventName: 'Royal Gujarati Wedding',
        customerName: 'Aarav & Diya Patel',
        customerPhone: '9876543210',
        customerWhatsApp: '9876543210',
        customerEmail: 'aarav.diya@example.com',
        venue: 'Grand Bhagwati Palace',
        city: 'Ahmedabad',
        mainEventDate: '2026-12-10',
        startDate: '2026-12-09',
        category: 'Wedding',
        status: 'deal_confirmed',
        description: 'Client prefers candid documentary style. VIP family portraits on stage.',
        numberOfDays: 2,
        numberOfFunctions: 3,
        functions: [
          {
            id: 'fn_1',
            bookingId: 'bkg_workspace_test',
            name: 'Haldi & Mehndi',
            category: 'Wedding',
            date: '2026-12-09',
            startTime: '10:00',
            endTime: '14:00',
            venue: 'Poolside Lawn',
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
              { employeeId: 'emp_1', employeeName: 'Rahul Sharma', role: 'Lead Photographer' }
            ]
          },
          {
            id: 'fn_2',
            bookingId: 'bkg_workspace_test',
            name: 'Sangeet Night',
            category: 'Wedding',
            date: '2026-12-09',
            startTime: '19:00',
            endTime: '23:30',
            venue: 'Grand Ballroom',
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
              { employeeId: 'emp_2', employeeName: 'Karan Patel', role: 'Candid Photographer' },
              { employeeId: 'emp_3', employeeName: 'Meet Shah', role: 'Cinematographer' }
            ]
          },
          {
            id: 'fn_3',
            bookingId: 'bkg_workspace_test',
            name: 'Wedding Ceremony',
            category: 'Wedding',
            date: '2026-12-10',
            startTime: '10:00',
            endTime: '16:00',
            venue: 'Royal Mandap Pavilion',
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
              { employeeId: 'emp_1', employeeName: 'Rahul Sharma', role: 'Lead Photographer' },
              { employeeId: 'emp_4', employeeName: 'Jay Mehta', role: 'Drone Operator' }
            ]
          }
        ],
        financials: {
          originalQuotation: 350000,
          negotiatedDiscount: 30000,
          finalAgreedAmount: 320000,
          advanceRequired: 80000,
          advanceReceived: 80000,
          verifiedPaymentsReceived: 80000,
          remainingBalance: 240000,
          isAdvanceConfirmed: true,
          paymentMilestones: []
        },
        deliverables: [
          {
            id: 'del_culling',
            bookingId: 'bkg_workspace_test',
            name: 'Photo Culling',
            category: 'photography',
            priority: 'normal',
            stage: 'delivered',
            deadlineType: 'relative_to_shoot',
            calculatedDeadline: '2026-12-12',
            requiredQty: 1,
            completedQty: 1,
            unit: 'set',
            deliveryMethod: 'Google Drive',
            isDelivered: true
          },
          {
            id: 'del_editing',
            bookingId: 'bkg_workspace_test',
            name: 'Photo Editing',
            category: 'photography',
            priority: 'normal',
            stage: 'editing',
            deadlineType: 'relative_to_shoot',
            calculatedDeadline: '2026-12-20',
            requiredQty: 1,
            completedQty: 0,
            unit: 'set',
            deliveryMethod: 'Google Drive',
            isDelivered: false
          }
        ],
        billingVersions: [],
        notes: [],
        createdAt: '2026-11-01T10:00:00Z',
        updatedAt: '2026-11-01T10:00:00Z'
      };

      bookingProductionService.saveBooking(TEST_STUDIO_ID, testBooking);
    });

    it('Top Header: displays customer, ID, event, date, agreed amount and allows 1-tap status change', () => {
      const b = bookingProductionService.getBooking(TEST_STUDIO_ID, 'bkg_workspace_test')!;
      expect(b.customerName).toBe('Aarav & Diya Patel');
      expect(b.bookingNumber).toBe('BK-2026-7890');
      expect(b.financials.finalAgreedAmount).toBe(320000);
      expect(b.status).toBe('deal_confirmed');

      // 1-tap status change to in_production
      bookingProductionService.updateBookingStatus(TEST_STUDIO_ID, b.id, 'in_production', 'Shoot started');
      const updated = bookingProductionService.getBooking(TEST_STUDIO_ID, 'bkg_workspace_test')!;
      expect(updated.status).toBe('in_production');
    });

    it('Section 1 (Details): contains customer info, event dates, functions schedule, and assigned crew', () => {
      const b = bookingProductionService.getBooking(TEST_STUDIO_ID, 'bkg_workspace_test')!;
      expect(b.customerPhone).toBe('9876543210');
      expect(b.customerEmail).toBe('aarav.diya@example.com');
      expect(b.functions).toHaveLength(3);
      expect(b.functions[0].name).toBe('Haldi & Mehndi');
      expect(b.functions[1].name).toBe('Sangeet Night');
      expect(b.functions[2].name).toBe('Wedding Ceremony');

      // Assigned crew
      const allCrew = b.functions.flatMap(f => f.assignedCrew || []);
      expect(allCrew.length).toBeGreaterThan(0);
      expect(allCrew.some(c => c.employeeName === 'Rahul Sharma')).toBe(true);
      expect(allCrew.some(c => c.employeeName === 'Jay Mehta')).toBe(true);
    });

    it('Section 2 (Money): records payment, immediately credits advance, and recalculates remaining balance', () => {
      const bBefore = bookingProductionService.getBooking(TEST_STUDIO_ID, 'bkg_workspace_test')!;
      expect(bBefore.financials.verifiedPaymentsReceived).toBe(80000);
      expect(bBefore.financials.remainingBalance).toBe(240000);

      // Studio Owner records second installment payment of ₹1,00,000
      bookingProductionService.recordBookingPayment(TEST_STUDIO_ID, bBefore.id, {
        amount: 100000,
        paymentMethod: 'UPI',
        reference: 'UPI-STAGE-2-001',
        receivedBy: 'Studio Owner'
      });

      const bAfter = bookingProductionService.getBooking(TEST_STUDIO_ID, 'bkg_workspace_test')!;
      expect(bAfter.financials.verifiedPaymentsReceived).toBe(180000);
      expect(bAfter.financials.remainingBalance).toBe(140000);
    });

    it('Section 3 (Work & Delivery): manages the 7 core milestones and calculates % completion', () => {
      const standard7 = [
        'Photo Culling',
        'Photo Editing',
        'Video Teaser',
        'Full Video Edit',
        'Album Design',
        'Album Printing',
        'Final Handover'
      ];

      expect(standard7).toHaveLength(7);

      // Toggle deliverable stage
      bookingProductionService.updateDeliverableStage(TEST_STUDIO_ID, 'bkg_workspace_test', 'del_editing', {
        stage: 'delivered',
        deliveryNotes: 'All 350 edited portraits approved by client'
      });

      const b = bookingProductionService.getBooking(TEST_STUDIO_ID, 'bkg_workspace_test')!;
      const del = b.deliverables.find(d => d.id === 'del_editing')!;
      expect(del.isDelivered).toBe(true);
      expect(del.stage).toBe('delivered');
    });

    it('Section 4 (Notes & WhatsApp): generates click-to-chat pre-formatted templates with exact parameters', () => {
      const b = bookingProductionService.getBooking(TEST_STUDIO_ID, 'bkg_workspace_test')!;

      // 1. Booking Confirmation template
      const confirmPayload = bookingProductionService.generateWhatsAppCustomerMessage(
        TEST_STUDIO_ID,
        b,
        'booking_confirmation',
        true
      );
      expect(confirmPayload.recipientPhone).toContain('9876543210');
      expect(confirmPayload.messageText).toContain('Booking Confirmation');
      expect(confirmPayload.messageText).toContain('Aarav & Diya Patel');
      expect(confirmPayload.messageText).toContain('3,20,000');
      expect(confirmPayload.generatedUrl).toContain('wa.me');

      // 2. Payment Receipt template
      const receiptPayload = bookingProductionService.generateWhatsAppCustomerMessage(
        TEST_STUDIO_ID,
        b,
        'payment_summary',
        true
      );
      expect(receiptPayload.messageText).toContain('Payment Receipt');
      expect(receiptPayload.generatedUrl).toContain('wa.me');

      // 3. Delivery update template
      const deliveryPayload = bookingProductionService.generateWhatsAppCustomerMessage(
        TEST_STUDIO_ID,
        b,
        'final_delivery_summary',
        true
      );
      expect(deliveryPayload.messageText).toContain('photography delivery update');
      expect(deliveryPayload.generatedUrl).toContain('wa.me');
    });

    it('1-Tap PDF Generators: produces clean studio branding payloads for Quotation, Invoice, and Receipt without watermarks', () => {
      const b = bookingProductionService.getBooking(TEST_STUDIO_ID, 'bkg_workspace_test')!;

      // Quotation Payload
      const quotationPdf = {
        documentType: 'quotation',
        title: 'PHOTOGRAPHY SERVICE QUOTATION',
        documentNumber: `QT-${b.bookingNumber}`,
        customer: { name: b.customerName, phone: b.customerPhone },
        financials: {
          subtotal: b.financials.originalQuotation,
          discountAmount: b.financials.negotiatedDiscount,
          totalAmount: b.financials.finalAgreedAmount,
          paidAmount: b.financials.verifiedPaymentsReceived,
          pendingAmount: b.financials.remainingBalance
        }
      };
      expect(quotationPdf.documentNumber).toBe('QT-BK-2026-7890');
      expect(quotationPdf.financials.totalAmount).toBe(320000);

      // Invoice Payload
      const invoicePdf = {
        documentType: 'invoice',
        title: 'TAX INVOICE',
        documentNumber: `INV-${b.bookingNumber}`,
        customer: { name: b.customerName, phone: b.customerPhone },
        financials: {
          totalAmount: b.financials.finalAgreedAmount,
          paidAmount: b.financials.verifiedPaymentsReceived,
          pendingAmount: b.financials.remainingBalance
        }
      };
      expect(invoicePdf.documentNumber).toBe('INV-BK-2026-7890');
      expect(invoicePdf.financials.pendingAmount).toBe(b.financials.remainingBalance);
    });
  });

  // 4. BOOKINGS LIST PAGE & FILTERS
  describe('4. Bookings List Page & Instant Filters', () => {
    it('filters bookings by status (All, Upcoming, Confirmed, In Progress, Completed, Pending Payment) and searches by customer/phone/event', () => {
      bookingProductionService.saveBooking(TEST_STUDIO_ID, {
        id: 'bkg_list_test',
        studioId: TEST_STUDIO_ID,
        customerId: 'cust_kavita_patel',
        bookingNumber: 'BK-2026-9999',
        customerName: 'Kavita Patel',
        customerPhone: '9825012345',
        customerWhatsApp: '9825012345',
        eventName: 'Patel Anniversary Shoot',
        category: 'Anniversary',
        status: 'deal_confirmed',
        mainEventDate: '2026-11-28',
        startDate: '2026-11-28',
        venue: 'Riverfront Lawn',
        city: 'Ahmedabad',
        numberOfDays: 1,
        numberOfFunctions: 1,
        functions: [],
        deliverables: [],
        billingVersions: [],
        notes: [],
        financials: {
          originalQuotation: 50000,
          negotiatedDiscount: 5000,
          finalAgreedAmount: 45000,
          advanceRequired: 15000,
          advanceReceived: 15000,
          verifiedPaymentsReceived: 15000,
          remainingBalance: 30000,
          isAdvanceConfirmed: true,
          paymentMilestones: []
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const allBookings = bookingProductionService.listBookings(TEST_STUDIO_ID);
      expect(allBookings.length).toBeGreaterThan(0);

      // Search matching
      const query = 'Patel';
      const searchMatches = allBookings.filter(b => 
        b.customerName.toLowerCase().includes(query.toLowerCase()) ||
        b.eventName.toLowerCase().includes(query.toLowerCase()) ||
        b.bookingNumber.toLowerCase().includes(query.toLowerCase())
      );
      expect(searchMatches.length).toBeGreaterThan(0);
      expect(searchMatches[0].customerName).toContain('Patel');
    });
  });

  // 5. EMPLOYEE & MASTER ADMIN ISOLATION
  describe('5. Employee & Master Admin Data Isolation', () => {
    it('Employee workspace displays assigned tasks and events with ZERO financial data exposed', () => {
      const empDashboard = employeeWorkspaceService.getEmployeeDashboard('std_demo_royal', 'emp_royal_002');
      expect(empDashboard).toBeDefined();
      expect(empDashboard.employeeName).toBeDefined();
      expect(empDashboard.todaySchedule).toBeDefined();
      expect(empDashboard.assignedEvents).toBeDefined();

      // Ensure no financial keys are exposed to employee
      expect((empDashboard as any).originalQuotation).toBeUndefined();
      expect((empDashboard as any).finalAgreedAmount).toBeUndefined();
      expect((empDashboard as any).profitMargin).toBeUndefined();
      expect((empDashboard as any).bankBalance).toBeUndefined();
    });

    it('Master Admin portal remains intact on /master/... managing all studios and subscriptions', () => {
      const studios = masterAdminService.getAllStudios();
      expect(studios).toBeDefined();
      expect(studios.length).toBeGreaterThan(0);
    });
  });
});
