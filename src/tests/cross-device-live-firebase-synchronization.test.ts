import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TenantStore } from '../services/tenantStore';
import { firestoreService } from '../services/firestoreService';
import { cloudSyncService } from '../services/cloudSyncService';
import { customerService } from '../services/customerService';
import { bookingProductionService } from '../services/bookingProductionService';
import { BookingRecord } from '../types/bookingProduction';
import { quotationService } from '../services/quotationService';
import { paymentService } from '../services/paymentService';
import { employeeService } from '../services/employeeService';
import { eventService } from '../services/eventService';

const STUDIO_A = 'studio_sync_test_A_' + Date.now();
const STUDIO_B = 'studio_sync_test_B_' + Date.now();

describe('Studio OS — Production Live Firebase Synchronization & Multi-Session Audit', () => {
  beforeEach(() => {
    TenantStore.clearAll?.();
  });

  it('1. Device A (Mobile) provisions customer, booking, functions, crew, and payment', async () => {
    // 1. Create Studio Profile for Studio A
    TenantStore.set(STUDIO_A, 'profile', {
      id: STUDIO_A,
      name: 'Royal Moments Photography',
      email: 'owner@royalmoments.in',
      phone: '9876543210',
      subscription: { status: 'active', planName: 'Studio OS Monthly' }
    });

    // 2. Add Crew Member on Device A
    const crewMember = employeeService.createEmployee(STUDIO_A, {
      fullName: 'Vikramaditya Rathore',
      email: 'vikram@royalmoments.in',
      phone: '9825100111',
      designation: 'Senior Candid Cinematographer',
      roleId: 'cinematographer',
      department: 'Cinematography'
    });
    expect(crewMember.id).toBeDefined();

    // 3. Create Customer on Device A
    const customer = customerService.createCustomer(STUDIO_A, {
      name: 'Pooja & Sameer Wedding',
      phone: '9820011223',
      email: 'pooja.sameer@example.com',
      city: 'Mumbai',
      customerSource: 'Instagram'
    });
    expect(customer.id).toBeDefined();

    // 4. Create Quotation on Device A
    const quotation = quotationService.createQuotation(STUDIO_A, {
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      eventName: 'Grand Wedding & Sangeet',
      eventCategory: 'Wedding',
      eventDate: '2026-12-18',
      eventVenue: 'Taj Mahal Palace, Mumbai',
      items: [
        { description: '2 Candid Photographers (Full Day)', quantity: 1, unitPrice: 70000, amount: 70000 },
        { description: '4K Cinematic Teaser & Film', quantity: 1, unitPrice: 80000, amount: 80000 }
      ],
      subtotal: 150000,
      grandTotal: 177000,
      advanceAmount: 50000
    });
    expect(quotation.id).toBeDefined();

    // 5. Convert Quotation to Booking on Device A
    const conversionResult = quotationService.convertQuotationToBooking(STUDIO_A, quotation.id, {
      eventName: quotation.eventName,
      eventDate: quotation.eventDate,
      venue: quotation.eventVenue
    });
    expect(conversionResult.quotation.status).toBe('Converted to Booking');

    // Verify booking was created in directory
    const bookingsA = bookingProductionService.listBookings(STUDIO_A);
    expect(bookingsA.length).toBeGreaterThanOrEqual(1);
    const booking = bookingsA[0];
    expect(booking.customerName).toBe('Pooja & Sameer Wedding');
    expect(booking.financials.finalAgreedAmount).toBe(177000);

    // 6. Add Functions and Assign Crew on Device A
    const newFunction = {
      id: `fn_${Date.now()}`,
      name: 'Sangeet & Cocktail Gala',
      category: 'Sangeet',
      date: '2026-12-17',
      startTime: '19:00',
      endTime: '23:30',
      venue: 'Crystal Ballroom, Taj Mahal Palace',
      city: 'Mumbai',
      status: 'scheduled' as const,
      assignedCrew: [
        {
          employeeId: crewMember.id,
          employeeName: crewMember.fullName,
          role: 'Cinematographer',
          status: 'assigned' as const
        }
      ],
      deliverablesConfig: []
    };
    booking.functions = [newFunction as any];
    booking.numberOfFunctions = 1;
    bookingProductionService.saveBooking(STUDIO_A, booking);

    const reloadedBooking = bookingProductionService.getBooking(STUDIO_A, booking.id)!;
    expect(reloadedBooking.functions.length).toBe(1);
    expect(reloadedBooking.functions[0].assignedCrew[0].employeeName).toBe('Vikramaditya Rathore');

    // 7. Record Payment on Device A
    const paymentResult = bookingProductionService.recordBookingPayment(STUDIO_A, booking.id, {
      amount: 50000,
      paymentMethod: 'UPI',
      reference: 'UPI-REF-998877',
      isAdvance: true,
      receivedBy: 'Studio Owner'
    });
    expect((paymentResult.booking.financials as any).paidAmount).toBe(50000);
    expect(paymentResult.booking.financials.remainingBalance).toBe(127000);
  });

  it('2. Device B (Laptop with completely empty localStorage) hydrates and displays identical business records', async () => {
    // 1. Prepare simulated Firestore snapshot of the studio data
    const mockCustomers = [
      {
        id: 'cust_pooja_sameer',
        studioId: STUDIO_A,
        name: 'Pooja & Sameer Wedding',
        phone: '9820011223',
        email: 'pooja.sameer@example.com',
        city: 'Mumbai',
        totalSpent: 50000,
        pendingBalance: 127000,
        status: 'Booked'
      }
    ];

    const mockBookings: any[] = [
      {
        id: 'bkg_taj_wedding_001',
        studioId: STUDIO_A,
        bookingNumber: 'BKG-2026-0001',
        customerId: 'cust_pooja_sameer',
        customerName: 'Pooja & Sameer Wedding',
        customerPhone: '9820011223',
        eventName: 'Grand Wedding & Sangeet',
        category: 'Wedding',
        mainEventDate: '2026-12-18',
        startDate: '2026-12-17',
        venue: 'Taj Mahal Palace, Mumbai',
        city: 'Mumbai',
        financials: {
          packagePrice: 150000,
          customAddonsTotal: 0,
          discountAmount: 0,
          subtotal: 150000,
          taxPercent: 18,
          taxAmount: 27000,
          finalAgreedAmount: 177000,
          advancePaid: 50000,
          paidAmount: 50000,
          remainingBalance: 127000,
          paymentStatus: 'partially_paid'
        },
        functions: [
          {
            id: 'fn_sangeet_001',
            name: 'Sangeet & Cocktail Gala',
            category: 'Sangeet',
            date: '2026-12-17',
            startTime: '19:00',
            endTime: '23:30',
            venue: 'Crystal Ballroom, Taj Mahal Palace',
            city: 'Mumbai',
            status: 'scheduled',
            assignedCrew: [
              {
                employeeId: 'emp_vikram_001',
                employeeName: 'Vikramaditya Rathore',
                role: 'Cinematographer',
                status: 'assigned'
              }
            ],
            deliverablesConfig: []
          }
        ],
        deliverables: [
          {
            id: 'del_film_001',
            bookingId: 'bkg_taj_wedding_001',
            name: '4K Cinematic Wedding Film',
            category: 'video',
            productionStage: 'editing',
            isDelivered: false,
            calculatedDeadline: '2027-01-18',
            timelineDays: 30
          }
        ],
        status: 'advance_received',
        workflowStage: 'advance_received',
        paymentHistory: [
          {
            id: 'pay_taj_001',
            amount: 50000,
            date: '2026-11-24',
            method: 'UPI',
            reference: 'UPI-REF-998877',
            receivedBy: 'Studio Owner'
          }
        ],
        isDeleted: false,
        createdAt: '2026-11-24T03:00:00Z',
        updatedAt: '2026-11-24T03:15:00Z'
      }
    ];

    const mockPayments = [
      {
        id: 'pay_taj_001',
        studioId: STUDIO_A,
        bookingId: 'bkg_taj_wedding_001',
        customerId: 'cust_pooja_sameer',
        amount: 50000,
        paymentDate: '2026-11-24',
        paymentMethod: 'UPI',
        receiptNumber: 'REC-2026-000001'
      }
    ];

    const mockEmployees = [
      {
        id: 'emp_vikram_001',
        studioId: STUDIO_A,
        fullName: 'Vikramaditya Rathore',
        email: 'vikram@royalmoments.in',
        phone: '9825100111',
        designation: 'Senior Candid Cinematographer',
        roleId: 'cinematographer',
        department: 'Cinematography',
        employmentStatus: 'active'
      }
    ];

    // Spy on FirestoreService to return simulated cloud data
    vi.spyOn(firestoreService, 'getCollection').mockImplementation(async (sId: string, col: string) => {
      if (sId !== STUDIO_A) return [];
      if (col === 'customers') return mockCustomers as any;
      if (col === 'studio_bookings_v2' || col === 'bookings') return mockBookings as any;
      if (col === 'payments') return mockPayments as any;
      if (col === 'employees') return mockEmployees as any;
      return [];
    });

    vi.spyOn(firestoreService, 'getDocument').mockImplementation(async (sId: string, col: string, docId: string) => {
      if (sId !== STUDIO_A) return null;
      if (col === 'profile') {
        return {
          id: STUDIO_A,
          name: 'Royal Moments Photography',
          email: 'owner@royalmoments.in',
          phone: '9876543210'
        } as any;
      }
      return null;
    });

    // Device B opens: localStorage is completely cleared
    TenantStore.clearAll?.();
    expect(TenantStore.get(STUDIO_A, 'customers')).toEqual([]);
    expect(TenantStore.get(STUDIO_A, 'studio_bookings_v2')).toEqual([]);

    // Device B runs authoritative Cloud Hydration
    const hydrateResult = await cloudSyncService.hydrateStudioFromCloud(STUDIO_A);
    expect(hydrateResult.success).toBe(true);
    expect(hydrateResult.stats.customers).toBe(1);
    expect(hydrateResult.stats.bookings).toBe(1);
    expect(hydrateResult.stats.payments).toBe(1);
    expect(hydrateResult.stats.employees).toBe(1);

    // Verify Device B views now display all business data
    const customersOnLaptopB = customerService.listCustomers(STUDIO_A);
    expect(customersOnLaptopB.length).toBe(1);
    expect(customersOnLaptopB[0].name).toBe('Pooja & Sameer Wedding');
    expect(customersOnLaptopB[0].phone).toBe('9820011223');

    const bookingsOnLaptopB = bookingProductionService.listBookings(STUDIO_A);
    expect(bookingsOnLaptopB.length).toBe(1);
    const bookingB = bookingsOnLaptopB[0];
    expect(bookingB.id).toBe('bkg_taj_wedding_001');
    expect(bookingB.eventName).toBe('Grand Wedding & Sangeet');
    expect(bookingB.financials.finalAgreedAmount).toBe(177000);
    expect((bookingB.financials as any).paidAmount).toBe(50000);
    expect(bookingB.financials.remainingBalance).toBe(127000);
    expect(bookingB.functions.length).toBe(1);
    expect(bookingB.functions[0].name).toBe('Sangeet & Cocktail Gala');
    expect(bookingB.functions[0].assignedCrew[0].employeeName).toBe('Vikramaditya Rathore');

    const crewOnLaptopB = employeeService.listEmployees(STUDIO_A);
    expect(crewOnLaptopB.length).toBe(1);
    expect(crewOnLaptopB[0].fullName).toBe('Vikramaditya Rathore');
  });

  it('3. Real-time live onSnapshot sync: edits made on Device B update Device A instantly', async () => {
    // Set up mock snapshot triggers
    let capturedListener: ((items: any[]) => void) | null = null;
    vi.spyOn(firestoreService, 'subscribeCollection').mockImplementation((sId, col, onData) => {
      if (col === 'studio_bookings_v2') {
        capturedListener = onData;
      }
      return () => {};
    });

    // Device A starts live real-time sync
    cloudSyncService.startRealtimeSync(STUDIO_A);

    // Device B makes an edit in cloud (e.g. changes venue to "The Oberoi, Mumbai" and status to "confirmed")
    const cloudUpdatedBookings: any[] = [
      {
        id: 'bkg_taj_wedding_001',
        studioId: STUDIO_A,
        bookingNumber: 'BKG-2026-0001',
        customerId: 'cust_pooja_sameer',
        customerName: 'Pooja & Sameer Wedding',
        customerPhone: '9820011223',
        eventName: 'Grand Wedding & Sangeet (Updated)',
        category: 'Wedding',
        mainEventDate: '2026-12-18',
        startDate: '2026-12-17',
        venue: 'The Oberoi, Nariman Point, Mumbai',
        city: 'Mumbai',
        financials: {
          packagePrice: 150000,
          customAddonsTotal: 0,
          discountAmount: 0,
          subtotal: 150000,
          taxPercent: 18,
          taxAmount: 27000,
          finalAgreedAmount: 177000,
          advancePaid: 70000,
          paidAmount: 70000,
          remainingBalance: 107000,
          paymentStatus: 'partially_paid'
        },
        functions: [],
        deliverables: [],
        status: 'confirmed',
        workflowStage: 'confirmed',
        isDeleted: false,
        createdAt: '2026-11-24T03:00:00Z',
        updatedAt: '2026-11-24T03:30:00Z'
      }
    ];

    // Fire simulated real-time onSnapshot from Firebase to Device A
    expect(capturedListener).toBeDefined();
    capturedListener!(cloudUpdatedBookings);

    // Device A's local store reflects the update without manual refresh
    const deviceABookings = bookingProductionService.listBookings(STUDIO_A);
    expect(deviceABookings.length).toBe(1);
    expect(deviceABookings[0].eventName).toBe('Grand Wedding & Sangeet (Updated)');
    expect(deviceABookings[0].venue).toBe('The Oberoi, Nariman Point, Mumbai');
    expect((deviceABookings[0].financials as any).paidAmount).toBe(70000);
    expect(deviceABookings[0].financials.remainingBalance).toBe(107000);

    cloudSyncService.stopRealtimeSync();
  });

  it('4. Multi-Tenant Studio Isolation: Studio B cannot view Studio A data', () => {
    // Seed Studio A data
    TenantStore.set(STUDIO_A, 'customers', [
      { id: 'c1', name: 'Confidential Client A', phone: '9999999991' }
    ]);
    TenantStore.set(STUDIO_A, 'studio_bookings_v2', [
      { id: 'b1', eventName: 'VIP Wedding A', financials: { finalAgreedAmount: 500000 } }
    ]);

    // Studio B checks customers and bookings
    const studioBCustomers = customerService.listCustomers(STUDIO_B);
    const studioBBookings = bookingProductionService.listBookings(STUDIO_B);

    expect(studioBCustomers).toEqual([]);
    expect(studioBBookings).toEqual([]);

    // Modifying Studio B data does not alter Studio A
    customerService.createCustomer(STUDIO_B, {
      name: 'Client of Studio B',
      phone: '9820055555',
      city: 'Delhi'
    });

    const studioACustomers = customerService.listCustomers(STUDIO_A);
    expect(studioACustomers.length).toBe(1);
    expect(studioACustomers[0].name).toBe('Confidential Client A');
  });

  it('5. Clean Zero State: Fresh studio has zero revenue and zero bookings', () => {
    const FRESH_STUDIO = 'studio_fresh_launch_' + Date.now();
    const bookings = bookingProductionService.listBookings(FRESH_STUDIO);
    const customers = customerService.listCustomers(FRESH_STUDIO);
    const quotations = quotationService.listQuotations(FRESH_STUDIO);

    expect(bookings).toEqual([]);
    expect(customers).toEqual([]);
    expect(quotations).toEqual([]);

    const totalRevenue = bookings.reduce((sum, b) => sum + ((b.financials as any)?.paidAmount || 0), 0);
    expect(totalRevenue).toBe(0);
  });
});
