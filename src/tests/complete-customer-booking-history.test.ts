import { describe, it, expect, beforeEach } from 'vitest';
import { bookingProductionService } from '../services/bookingProductionService';
import { bookingHistoryService } from '../services/bookingHistoryService';
import { employeeWorkspaceService } from '../services/employeeWorkspaceService';
import { TenantStore } from '../services/tenantStore';
import { BookingRecord } from '../types/bookingProduction';
import { BookingHistoryItem } from '../types/bookingHistory';

describe('STUDIO OS — Complete Customer Booking History & Activity Timeline', () => {
  const TEST_STUDIO_ID = 'studio_shreeji_films_test';
  const TEST_BOOKING_ID = 'bkg_history_test_001';

  beforeEach(() => {
    TenantStore.set(TEST_STUDIO_ID, 'studio_bookings_v2', []);
    TenantStore.set(TEST_STUDIO_ID, 'payments', []);
    TenantStore.set(TEST_STUDIO_ID, `booking_history_${TEST_BOOKING_ID}`, []);
    TenantStore.set(TEST_STUDIO_ID, `booking_albums_${TEST_BOOKING_ID}`, []);
    TenantStore.set(TEST_STUDIO_ID, `booking_services_${TEST_BOOKING_ID}`, []);
    TenantStore.set(TEST_STUDIO_ID, `booking_deliveries_${TEST_BOOKING_ID}`, []);

    // Create realistic test booking
    const sampleBooking: BookingRecord = {
      id: TEST_BOOKING_ID,
      studioId: TEST_STUDIO_ID,
      bookingNumber: 'BK-2026-8801',
      status: 'deal_confirmed',
      customerId: 'cust_singhania_001',
      customerName: 'Singhania Family (Rahul & Priya)',
      customerPhone: '9825011223',
      customerWhatsApp: '9825011223',
      customerEmail: 'rahul.priya@singhania.com',
      eventName: 'Rahul & Priya Royal Wedding',
      category: 'Wedding',
      mainEventDate: '2026-12-20',
      startDate: '2026-12-18',
      venue: 'The Grand Bhagwati',
      city: 'Ahmedabad',
      description: 'Client requested warm documentary cinematography and genuine leather albums.',
      numberOfDays: 3,
      numberOfFunctions: 3,
      functions: [
        {
          id: 'fn_mandvo',
          bookingId: TEST_BOOKING_ID,
          name: 'Mandvo & Pithi',
          category: 'Wedding',
          date: '2026-12-18',
          startTime: '09:00',
          endTime: '13:00',
          venue: 'Courtyard Lawn',
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
          id: 'fn_sangeet',
          bookingId: TEST_BOOKING_ID,
          name: 'Haldi & Sangeet Night',
          category: 'Wedding',
          date: '2026-12-19',
          startTime: '18:00',
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
          id: 'fn_wedding',
          bookingId: TEST_BOOKING_ID,
          name: 'Wedding Ceremony & Reception',
          category: 'Wedding',
          date: '2026-12-20',
          startTime: '10:00',
          endTime: '22:00',
          venue: 'Royal Palace Pavilion',
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
      deliverables: [
        {
          id: 'del_culling',
          bookingId: TEST_BOOKING_ID,
          name: 'Photo Culling',
          category: 'photography',
          priority: 'normal',
          stage: 'delivered',
          deadlineType: 'relative_to_shoot',
          calculatedDeadline: '2026-12-22',
          requiredQty: 1,
          completedQty: 1,
          unit: 'set',
          deliveryMethod: 'Google Drive',
          isDelivered: true
        },
        {
          id: 'del_album',
          bookingId: TEST_BOOKING_ID,
          name: 'Premium Leather Wedding Album',
          category: 'physical',
          priority: 'normal',
          stage: 'editing',
          deadlineType: 'relative_to_shoot',
          calculatedDeadline: '2027-01-20',
          requiredQty: 2,
          completedQty: 0,
          unit: 'albums',
          deliveryMethod: 'Direct Handover',
          isDelivered: false
        }
      ],
      financials: {
        originalQuotation: 150000,
        negotiatedDiscount: 20000,
        finalAgreedAmount: 130000,
        advanceRequired: 50000,
        advanceReceived: 50000,
        verifiedPaymentsReceived: 50000,
        remainingBalance: 80000,
        isAdvanceConfirmed: true,
        advanceReceivedDate: '2026-11-10T11:00:00Z',
        paymentMilestones: []
      },
      billingVersions: [],
      notes: [],
      createdAt: '2026-11-05T09:30:00Z',
      updatedAt: '2026-11-10T11:00:00Z'
    };

    bookingProductionService.saveBooking(TEST_STUDIO_ID, sampleBooking);
  });

  // 1. COMPLETE BOOKING HISTORY SECTION
  it('1. Provides complete chronological history inside the booking workspace with sorting options', () => {
    const history = bookingHistoryService.getBookingHistory(TEST_STUDIO_ID, TEST_BOOKING_ID, 'desc');
    expect(history.length).toBeGreaterThan(0);

    // Default newest first
    for (let i = 0; i < history.length - 1; i++) {
      expect(history[i].createdAt >= history[i + 1].createdAt).toBe(true);
    }

    // Toggle oldest first
    const oldestFirst = bookingHistoryService.getBookingHistory(TEST_STUDIO_ID, TEST_BOOKING_ID, 'asc');
    expect(oldestFirst[0].createdAt <= oldestFirst[oldestFirst.length - 1].createdAt).toBe(true);
  });

  // 2. AUTOMATIC PAYMENT HISTORY UPDATE
  it('2. Automatically creates a history entry when adding a payment with previous and new balance', () => {
    const bBefore = bookingProductionService.getBooking(TEST_STUDIO_ID, TEST_BOOKING_ID)!;
    expect(bBefore.financials.verifiedPaymentsReceived).toBe(50000);
    expect(bBefore.financials.remainingBalance).toBe(80000);

    // Studio Owner adds ₹25,000 installment
    const result = bookingProductionService.recordBookingPayment(TEST_STUDIO_ID, TEST_BOOKING_ID, {
      amount: 25000,
      paymentMethod: 'UPI',
      reference: 'UPI-STAGE-2-998811',
      receivedBy: 'Studio Owner'
    });

    expect(result.booking.financials.verifiedPaymentsReceived).toBe(75000);
    expect(result.booking.financials.remainingBalance).toBe(55000);

    // Verify it automatically appears in Complete History
    const history = bookingHistoryService.getBookingHistory(TEST_STUDIO_ID, TEST_BOOKING_ID);
    const paymentEntry = history.find(h => 
      h.activityType === 'payment_received' && 
      h.metadata?.reference === 'UPI-STAGE-2-998811'
    );

    expect(paymentEntry).toBeDefined();
    expect(paymentEntry!.amount).toBe(25000);
    expect(paymentEntry!.metadata?.paymentMethod).toBe('UPI');
    expect(paymentEntry!.metadata?.previousBalance).toBe(80000);
    expect(paymentEntry!.metadata?.newBalance).toBe(55000);
    expect(paymentEntry!.metadata?.receiptNumber).toBeDefined();
    expect(paymentEntry!.performedByName).toBe('Studio Owner');
  });

  // 3. RECORD ALL CUSTOMER SERVICES & PHOTOGRAPHY DETAILS
  it('3. Records photography/videography service details and distinguishes quoted, confirmed, completed, and delivered', () => {
    // Add drone service
    const service = bookingHistoryService.addService(TEST_STUDIO_ID, TEST_BOOKING_ID, 'cust_singhania_001', {
      name: 'Drone Aerial Cinematography',
      category: 'drone',
      quantity: 1,
      status: 'confirmed',
      assignedEmployeeName: 'Jay Mehta',
      functionId: 'fn_wedding',
      functionName: 'Wedding Ceremony & Reception',
      notes: '4K aerial shots of grand entry'
    });

    expect(service.id).toBeDefined();
    expect(service.name).toBe('Drone Aerial Cinematography');

    // Update status to completed
    const updated = bookingHistoryService.updateServiceStatus(
      TEST_STUDIO_ID,
      TEST_BOOKING_ID,
      'cust_singhania_001',
      service.id,
      'completed',
      { completedDate: '2026-12-20', notes: 'All 4K drone footage backed up' }
    );

    expect(updated?.status).toBe('completed');

    // Verify timeline records
    const history = bookingHistoryService.getBookingHistory(TEST_STUDIO_ID, TEST_BOOKING_ID);
    expect(history.some(h => h.activityType === 'service_added' && h.title.includes('Drone'))).toBe(true);
    expect(history.some(h => h.activityType === 'service_status_changed' && h.title.includes('COMPLETED'))).toBe(true);
  });

  // 4. ALBUM AND PRODUCT SELECTION HISTORY
  it('4. Records album and product selection and tracks status changes without overwriting original selection', () => {
    // Add Album Selection
    const album = bookingHistoryService.addAlbumOrProduct(TEST_STUDIO_ID, TEST_BOOKING_ID, 'cust_singhania_001', {
      name: 'Royal Flush Mount Wedding Album',
      productType: 'album',
      size: '12 × 36 inches',
      quantity: 2,
      sheetsCount: 40,
      coverMaterial: 'Genuine Leather',
      coverDesign: 'Gold Foil Couple Names',
      selectedPhotosCount: 250,
      status: 'design_in_progress',
      addedBy: 'Studio Owner'
    });

    expect(album.id).toBeDefined();
    expect(album.sheetsCount).toBe(40);

    // Later customer approves album design
    const approved = bookingHistoryService.updateAlbumStatus(
      TEST_STUDIO_ID,
      TEST_BOOKING_ID,
      'cust_singhania_001',
      album.id,
      'customer_approved',
      { notes: 'Client confirmed layout via WhatsApp' }
    );
    expect(approved?.status).toBe('customer_approved');
    expect(approved?.approvalDate).toBeDefined();

    // Verify both original selection and approval appear in timeline
    const history = bookingHistoryService.getBookingHistory(TEST_STUDIO_ID, TEST_BOOKING_ID);
    const selectionEntry = history.find(h => h.activityType === 'album_selected' && h.relatedRecordId === album.id);
    const approvalEntry = history.find(h => h.activityType === 'album_status_changed' && h.relatedRecordId === album.id);

    expect(selectionEntry).toBeDefined();
    expect(approvalEntry).toBeDefined();
    expect(selectionEntry?.description).toContain('Genuine Leather');
  });

  // 5. COMPLETE DELIVERY HISTORY
  it('5. Records delivery handovers with item, event, quantity, delivery method, delivered by, and confirmation', () => {
    const delivery = bookingHistoryService.recordDeliveryHandover(TEST_STUDIO_ID, TEST_BOOKING_ID, 'cust_singhania_001', {
      itemDelivered: '180 Edited Photographs',
      functionId: 'fn_mandvo',
      functionName: 'Mandvo & Pithi',
      deliveryDate: '2026-12-22',
      quantity: 180,
      unit: 'photos',
      deliveryMethod: 'Google Drive',
      linkOrReference: 'https://drive.google.com/drive/folders/shreeji-mandvo',
      deliveredBy: 'Priya Joshi',
      customerConfirmation: 'confirmed',
      notes: 'Customer confirmed download and gave 5-star feedback'
    });

    expect(delivery.id).toBeDefined();
    expect(delivery.deliveredBy).toBe('Priya Joshi');

    const history = bookingHistoryService.getBookingHistory(TEST_STUDIO_ID, TEST_BOOKING_ID);
    const deliveryEntry = history.find(h => h.activityType === 'delivery_recorded' && h.relatedRecordId === delivery.id);

    expect(deliveryEntry).toBeDefined();
    expect(deliveryEntry?.title).toContain('180 Edited Photographs');
    expect(deliveryEntry?.performedByName).toBe('Priya Joshi');
  });

  // 6. RECORD EVENT AND FUNCTION HISTORY & FUNCTION FILTERING
  it('6. Records function schedule milestones and allows filtering history by function', () => {
    const history = bookingHistoryService.getBookingHistory(TEST_STUDIO_ID, TEST_BOOKING_ID);

    // Filter by Mandvo function
    const mandvoHistory = history.filter(h => 
      h.relatedFunctionId === 'fn_mandvo' || 
      h.relatedFunctionName === 'Mandvo & Pithi'
    );
    expect(mandvoHistory.length).toBeGreaterThan(0);
    expect(mandvoHistory.some(h => h.title.includes('Mandvo'))).toBe(true);
  });

  // 7. RECORD PRICE CHANGES AND NEGOTIATIONS
  it('7. Records previous and new quotation and agreed amounts when price is updated', () => {
    const priceEntry = bookingHistoryService.recordPriceUpdateHistory(TEST_STUDIO_ID, TEST_BOOKING_ID, {
      customerId: 'cust_singhania_001',
      previousQuotation: 150000,
      newQuotation: 160000,
      previousDiscount: 20000,
      newDiscount: 25000,
      previousAgreedAmount: 130000,
      newAgreedAmount: 135000,
      reason: 'Added extra Drone & Reels coverage with courtesy discount',
      updatedBy: 'Studio Owner'
    });

    expect(priceEntry.activityType).toBe('price_updated');
    expect(priceEntry.metadata?.previousAgreedAmount).toBe(130000);
    expect(priceEntry.metadata?.newAgreedAmount).toBe(135000);
    expect(priceEntry.metadata?.reason).toContain('Drone & Reels');

    const history = bookingHistoryService.getBookingHistory(TEST_STUDIO_ID, TEST_BOOKING_ID);
    expect(history.some(h => h.historyId === priceEntry.historyId)).toBe(true);
  });

  // 8. CUSTOMER NOTES & COMMUNICATION HISTORY
  it('8. Records customer notes, special requests, and WhatsApp communication history', () => {
    const note = bookingProductionService.addCustomerNote(TEST_STUDIO_ID, {
      customerId: 'cust_singhania_001',
      bookingId: TEST_BOOKING_ID,
      noteType: 'customer_communication',
      title: 'Customer Approval for Video Teaser',
      content: 'Rahul Singhania approved the 60-second Instagram teaser with audio track "Kudmayi".',
      isPrivate: false,
      createdBy: 'Studio Owner'
    });

    expect(note.id).toBeDefined();

    const history = bookingHistoryService.getBookingHistory(TEST_STUDIO_ID, TEST_BOOKING_ID);
    const noteEntry = history.find(h => h.activityType === 'note_added' && h.relatedRecordId === note.id);
    expect(noteEntry).toBeDefined();
    expect(noteEntry?.title).toBe('Customer Note Added');
    expect(noteEntry?.description).toContain('Kudmayi');
  });

  // 9. BOOKING HISTORY SUMMARY
  it('9. Computes booking history summary metrics directly from verified records', () => {
    const summary = bookingHistoryService.getBookingHistorySummary(TEST_STUDIO_ID, TEST_BOOKING_ID);

    expect(summary.totalPaymentsReceived).toBe(50000);
    expect(summary.paymentTransactionsCount).toBeGreaterThanOrEqual(1);
    expect(summary.totalServicesBooked).toBeGreaterThanOrEqual(1);
    expect(summary.albumsSelected).toBeGreaterThanOrEqual(1);
    expect(summary.deliveriesCompleted).toBeGreaterThanOrEqual(1);
    expect(summary.pendingDeliveries).toBeGreaterThanOrEqual(1);
    expect(summary.lastActivityDate).toBeDefined();
  });

  // 10. BACKFILL MIGRATION SAFETY
  it('10. Safely backfills existing Shreeji Studio bookings without duplicating entries or fabricating dates', () => {
    const beforeCount = bookingHistoryService.getBookingHistory(TEST_STUDIO_ID, TEST_BOOKING_ID).length;

    // Running backfill again on the same booking must not create duplicate entries
    bookingHistoryService.backfillFromBookingRecord(TEST_STUDIO_ID, TEST_BOOKING_ID);

    const afterCount = bookingHistoryService.getBookingHistory(TEST_STUDIO_ID, TEST_BOOKING_ID).length;
    expect(afterCount).toBe(beforeCount);
  });

  // 11. EMPLOYEE FINANCIAL ISOLATION
  it('11. Conceals financial figures from employee dashboard while providing assigned task history', () => {
    const empMetrics = employeeWorkspaceService.getEmployeeDashboard('std_demo_royal', 'emp_royal_002');
    expect(empMetrics).toBeDefined();

    // Verify financial data is omitted
    expect((empMetrics as any).originalQuotation).toBeUndefined();
    expect((empMetrics as any).finalAgreedAmount).toBeUndefined();
    expect((empMetrics as any).verifiedPaymentsReceived).toBeUndefined();
    expect((empMetrics as any).remainingBalance).toBeUndefined();
  });
});
