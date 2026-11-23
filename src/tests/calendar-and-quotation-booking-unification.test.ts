import { describe, it, expect, beforeEach } from 'vitest';
import { quotationService } from '../services/quotationService';
import { bookingProductionService } from '../services/bookingProductionService';
import { eventService } from '../services/eventService';
import { customerService } from '../services/customerService';
import { TenantStore } from '../services/tenantStore';

const TEST_STUDIO = 'studio_unification_test_' + Date.now();

describe('Studio OS: Calendar Instant Booking & Quotation to Booking Directory Unification', () => {
  beforeEach(() => {
    (TenantStore as any).clearAll?.();
  });

  it('1. Converting a quotation automatically creates a BookingRecord in Booking Directory', () => {
    // 1. Create a customer & quotation
    const customer = customerService.createCustomer(TEST_STUDIO, {
      name: 'Dhaval Raninga',
      phone: '9749797974',
      email: 'dhaval@example.com',
      city: 'Ahmedabad'
    });

    const quotation = quotationService.createQuotation(TEST_STUDIO, {
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerEmail: customer.email,
      eventName: 'Wedding Photography & Film',
      eventCategory: 'Wedding',
      eventDate: '2026-11-28',
      eventVenue: 'The Grand Heritage Lawn, Ahmedabad',
      items: [
        {
          description: 'Traditional & Candid Photography',
          quantity: 1,
          unitPrice: 50000,
          amount: 50000
        },
        {
          description: 'Cinematic Wedding Film & Teaser',
          quantity: 1,
          unitPrice: 60000,
          amount: 60000
        }
      ],
      subtotal: 110000,
      grandTotal: 121540,
      advanceAmount: 30000
    });

    expect(quotation.status).toBe('Draft');

    // 2. Convert quotation to booking
    const result = quotationService.convertQuotationToBooking(TEST_STUDIO, quotation.id, {
      eventName: quotation.eventName,
      eventDate: quotation.eventDate,
      venue: quotation.eventVenue,
      operatorId: 'Studio Owner'
    });

    expect(result.quotation.status).toBe('Converted to Booking');
    expect(result.event).toBeDefined();
    expect(result.event.name).toBe('Wedding Photography & Film');

    // 3. Verify that Booking Directory (bookingProductionService.listBookings) now includes this booking!
    const bookings = bookingProductionService.listBookings(TEST_STUDIO);
    expect(bookings.length).toBeGreaterThanOrEqual(1);

    const matchedBooking = bookings.find(b => b.customerName === 'Dhaval Raninga');
    expect(matchedBooking).toBeDefined();
    expect(matchedBooking?.eventName).toBe('Wedding Photography & Film');
    expect(matchedBooking?.financials.finalAgreedAmount).toBe(121540);
    expect(matchedBooking?.status).toBe('deal_confirmed');
  });

  it('2. Auto-reconciles previously converted quotations that had no booking record', () => {
    const quoteId = 'quo_legacy_001';
    // Simulate pre-existing converted quotation in TenantStore
    TenantStore.set(TEST_STUDIO, 'quotations', [
      {
        id: quoteId,
        quotationNumber: 'QUO-2026-000001',
        status: 'Converted to Booking',
        customerName: 'Pooja & Rohan',
        customerPhone: '9898001122',
        eventName: 'Destination Wedding',
        eventCategory: 'Wedding',
        eventDate: '2026-12-15',
        eventVenue: 'Udaipur Palace',
        grandTotal: 250000,
        subtotal: 250000,
        items: [{ description: 'Complete Photo & Video', quantity: 1, unitPrice: 250000, amount: 250000 }]
      }
    ]);

    // Query bookings directory
    const bookings = bookingProductionService.listBookings(TEST_STUDIO);
    const matched = bookings.find(b => b.customerName === 'Pooja & Rohan');
    expect(matched).toBeDefined();
    expect(matched?.eventName).toBe('Destination Wedding');
    expect(matched?.financials.finalAgreedAmount).toBe(250000);
  });

  it('3. Instant Calendar shoot booking creates both BookingRecord and StudioEvent', () => {
    const instantShoot = bookingProductionService.createBooking(TEST_STUDIO, {
      customerName: 'Ananya Sharma',
      customerPhone: '9876500001',
      eventName: 'Pre-Wedding Shoot',
      category: 'Pre-Wedding',
      mainEventDate: '2026-11-26',
      venue: 'Sabarmati Riverfront, Ahmedabad',
      city: 'Ahmedabad',
      agreedAmount: 45000,
      advancePayment: 15000,
      createdBy: 'Studio Owner'
    });

    expect(instantShoot.bookingNumber).toContain('BKG-2026');
    expect(instantShoot.eventName).toBe('Pre-Wedding Shoot');
    expect(instantShoot.financials.finalAgreedAmount).toBe(45000);
    expect(instantShoot.financials.verifiedPaymentsReceived).toBe(15000);

    // Verify it is in bookings list
    const allBookings = bookingProductionService.listBookings(TEST_STUDIO);
    expect(allBookings.some(b => b.id === instantShoot.id)).toBe(true);

    // Verify it automatically synchronized to events for the Calendar
    const events = TenantStore.get(TEST_STUDIO, 'events') as any[];
    expect(events.some(e => e.id === instantShoot.id || e.name === 'Pre-Wedding Shoot')).toBe(true);
  });
});
