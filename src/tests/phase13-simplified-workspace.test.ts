import { describe, it, expect, beforeEach } from 'vitest';
import { platformStudioService } from '../services/platformStudioService';
import { bookingService } from '../services/bookingService';
import { quotationService } from '../services/quotationService';
import { paymentService } from '../services/paymentService';
import { employeeAuthService } from '../services/employeeAuthService';
import { customerService } from '../services/customerService';
import { eventService } from '../services/eventService';
import { subEventService } from '../services/subEventService';
import { TenantStore } from '../services/tenantStore';

describe('Phase 13: Simplified Studio Workspace, Booking Management & Super Admin Separation', () => {
  const TEST_STUDIO_ID = 'std_test_phase13';

  beforeEach(() => {
    TenantStore.resetAll();
  });

  describe('1. Platform Super Admin Studio Creation & Management', () => {
    it('provisions studio, main branch, owner employee, and owner login account with mandatory password change', () => {
      const result = platformStudioService.createStudioWithOwner({
        name: 'Aura Cinematics',
        ownerName: 'Vikas Sharma',
        ownerMobile: '9898011223',
        ownerEmail: 'vikas@auracinematics.com',
        city: 'Ahmedabad',
        state: 'Gujarat',
        address: '101 Heritage Complex, CG Road',
        subscriptionPlan: 'Professional Studio',
        subscriptionStatus: 'active'
      });

      expect(result.success).toBe(true);
      expect(result.studio.id).toBeDefined();
      expect(result.studio.name).toBe('Aura Cinematics');
      expect(result.studio.tenantId).toBe(result.studio.id);
      expect(result.ownerEmployee.fullName).toBe('Vikas Sharma');
      expect(result.ownerEmployee.roleName).toBe('Studio Owner');
      expect(result.credentials.email).toBe('vikas@auracinematics.com');
      expect(result.credentials.mustChangePassword).toBe(true);
      expect(result.temporaryPassword).toBeDefined();
      expect(result.temporaryPassword.length).toBeGreaterThanOrEqual(8);
    });

    it('lists studios with financial & operational metrics (events, bookings, received, outstanding, visibility)', () => {
      const res = platformStudioService.createStudioWithOwner({
        name: 'Horizon Studio',
        ownerName: 'Pooja Mehta',
        ownerMobile: '9825000111',
        ownerEmail: 'pooja@horizon.com',
        city: 'Surat',
        state: 'Gujarat',
        address: 'Ring Road, Surat',
        subscriptionPlan: 'Professional Studio',
        subscriptionStatus: 'active'
      });

      const studios = platformStudioService.listStudios({ search: 'Horizon' });
      expect(studios.length).toBe(1);
      const studio = studios[0];

      expect(studio.name).toBe('Horizon Studio');
      expect(studio.ownerName).toBe('Pooja Mehta');
      expect(studio.ownerPhone).toBe('9825000111');
      expect(studio.eventsCount).toBe(0);
      expect(studio.bookingsCount).toBe(0);
      expect(studio.totalReceivedAmount).toBe(0);
      expect(studio.outstandingAmount).toBe(0);
      expect(studio.visibility).toBe('visible');
    });

    it('Super Admin can reset Studio Owner credentials with a new temporary password and mandatory change flag', () => {
      const provisioned = platformStudioService.createStudioWithOwner({
        name: 'Lumina Studio',
        ownerName: 'Karan Dave',
        ownerMobile: '9876543210',
        ownerEmail: 'karan@lumina.com',
        city: 'Vadodara',
        state: 'Gujarat',
        address: 'Alkapuri',
        subscriptionPlan: 'Professional Studio',
        subscriptionStatus: 'active'
      });

      const reset = platformStudioService.resetStudioOwnerCredentials(provisioned.studio.id);
      expect(reset.success).toBe(true);
      expect(reset.temporaryPassword).toBeDefined();
      expect(reset.ownerEmail).toBe('karan@lumina.com');

      // Verify the new temporary password works for login
      const loginRes = employeeAuthService.verifyLogin('karan@lumina.com', reset.temporaryPassword!);
      expect(loginRes.success).toBe(true);
      expect(loginRes.mustChangePassword).toBe(true);
    });
  });

  describe('2. Studio Owner Team Management & Staff Credential Reset', () => {
    it('allows Studio Owner to reset employee password without exposing plaintext or breaking account', () => {
      const studioId = 'std_team_test';
      const empId = 'emp_photographer_01';

      // Provision staff account
      employeeAuthService.provisionAccount(
        studioId,
        empId,
        'rahul_photo',
        'rahul@studio.com',
        'Initial@Pass1'
      );

      // Studio Owner triggers password reset
      const reset = employeeAuthService.resetEmployeeCredentials(studioId, empId, 'Studio Owner');
      expect(reset.success).toBe(true);
      expect(reset.temporaryPassword).toBeDefined();
      expect(reset.temporaryPassword).not.toBe('Initial@Pass1');

      // Staff logs in with temporary password and must change it
      const login = employeeAuthService.verifyLogin('rahul@studio.com', reset.temporaryPassword!);
      expect(login.success).toBe(true);
      expect(login.mustChangePassword).toBe(true);

      // Staff changes password
      const change = employeeAuthService.changeInitialPassword(empId, reset.temporaryPassword!, 'NewSecure@Password999');
      expect(change.success).toBe(true);

      // Old temporary password can no longer log in
      const oldLogin = employeeAuthService.verifyLogin('rahul@studio.com', reset.temporaryPassword!);
      expect(oldLogin.success).toBe(false);

      // New password succeeds
      const newLogin = employeeAuthService.verifyLogin('rahul@studio.com', 'NewSecure@Password999');
      expect(newLogin.success).toBe(true);
      expect(newLogin.mustChangePassword).toBe(false);
    });
  });

  describe('3. Create Booking Fast-Track Workflow', () => {
    it('creates booking with customer, prevents duplicate CRM records when phone matches', () => {
      const studioId = 'std_booking_test';

      // 1. Existing customer in CRM
      customerService.createCustomer(studioId, {
        name: 'Aarav Patel',
        phone: '9898123456',
        email: 'aarav@gmail.com',
        city: 'Ahmedabad'
      });

      const initialCount = customerService.listCustomers(studioId).length;
      expect(initialCount).toBe(1);

      // 2. Create booking using same phone number
      const booking = bookingService.createBooking(studioId, {
        customerName: 'Aarav Patel (Groom)',
        customerPhone: '9898123456', // same phone
        eventName: 'Aarav & Meera Wedding',
        category: 'Wedding',
        startDate: '2026-12-10',
        endDate: '2026-12-12',
        venue: 'Grand Bhagwati',
        city: 'Ahmedabad',
        subEvents: [
          {
            name: 'Mehndi Ceremony',
            date: '2026-12-10',
            startTime: '16:00',
            endTime: '20:00',
            venue: 'Poolside Lawn'
          },
          {
            name: 'Wedding & Reception',
            date: '2026-12-12',
            startTime: '10:00',
            endTime: '23:00',
            venue: 'Main Ballroom'
          }
        ],
        deliverablesConfig: {
          packageType: 'Royal Luxury',
          albumRequired: true,
          albumType: 'Flush Mount Velvet',
          albumSize: '12x36',
          albumCoverType: 'Leather',
          albumSheetsCount: 40,
          albumsCount: 2,
          parentAlbumRequired: false,
          rawPhotosRequired: true,
          editedPhotosRequired: true,
          selectedPhotographsCount: 350,
          videoRequired: true,
          cinematicHighlightRequired: true,
          deliveryMethod: 'Cloud Gallery & Velvet Box USB Drive',
          selectedServices: ['Candid Photography', 'Cinematic Video', 'Drone'],
          customDeliverables: []
        },
        packagePrice: 150000,
        additionalServicesPrice: 20000,
        discount: 10000,
        taxAmount: 28800,
        finalBookingAmount: 188800,
        advanceRequired: 60000,
        advanceReceived: 60000,
        paymentMethod: 'UPI'
      });

      // Verify no duplicate customer was created
      const finalCount = customerService.listCustomers(studioId).length;
      expect(finalCount).toBe(1);
      expect(booking.customer.phone).toBe('9898123456');

      // Verify event was created
      expect(booking.event.name).toBe('Aarav & Meera Wedding');
      expect(booking.event.status).toBe('Confirmed');
      expect(booking.event.advancePaid).toBe(60000);
      expect(booking.event.estimatedBudget).toBe(188800);

      // Verify sub-events were created
      expect(booking.subEvents.length).toBe(2);
      expect(booking.subEvents[0].name).toBe('Mehndi Ceremony');
      expect(booking.subEvents[1].name).toBe('Wedding & Reception');

      // Verify customer metrics updated
      const updatedCust = customerService.getCustomer(studioId, booking.customer.id);
      expect(updatedCust?.totalBookings).toBe(1);
      expect(updatedCust?.totalSpent).toBe(60000);
    });
  });

  describe('4. Create Quotation Workflow & 1-Click Booking Conversion', () => {
    it('creates quotation proposal with items, taxes, and converts directly to booking without duplication', () => {
      const studioId = 'std_quote_test';

      const customer = customerService.createCustomer(studioId, {
        name: 'Rohan Shah',
        phone: '9824099887',
        email: 'rohan@shah.com',
        city: 'Vadodara'
      });

      // Create quotation
      const quote = quotationService.createQuotation(
        studioId,
        {
          customerId: customer.id,
          customerName: customer.name,
          customerPhone: customer.phone,
          customerEmail: customer.email,
          eventName: 'Rohan Engagement Shoot',
          eventCategory: 'Engagement',
          eventDate: '2026-11-25',
          venue: 'Sayaji Hotel',
          items: [
            { description: '2 Candid Photographers (5 Hours)', quantity: 1, unitPrice: 30000 },
            { description: 'Cinematic Teaser 4K', quantity: 1, unitPrice: 15000 },
            { description: 'Keepsake Photobook 12x18', quantity: 1, unitPrice: 10000 }
          ],
          subtotal: 55000,
          discount: 5000,
          taxRate: 18,
          taxAmount: 9000,
          grandTotal: 59000,
          advanceAmount: 30000,
          paymentTerms: '50% advance to confirm booking',
          status: 'Sent' as any
        },
        'Studio Owner'
      );

      expect(quote.quotationNumber).toBeDefined();
      expect(quote.grandTotal).toBe(59000);
      expect(quote.status).toBe('Sent');

      // Convert quotation directly to confirmed booking
      const converted = bookingService.convertQuotationToBooking(studioId, quote.id, 30000, 'UPI');
      expect(converted.event).toBeDefined();
      expect(converted.event.name).toBe('Rohan Engagement Shoot');
      expect(converted.event.status).toBe('Confirmed');
      expect(converted.event.estimatedBudget).toBe(59000);
      expect(converted.event.advancePaid).toBe(30000);

      // Verify quotation marked as Accepted
      const updatedQuote = quotationService.getQuotation(studioId, quote.id);
      expect(updatedQuote?.status).toBe('Accepted');

      // Customer count must remain 1
      expect(customerService.listCustomers(studioId).length).toBe(1);
    });
  });

  describe('5. Payment Management inside Event', () => {
    it('records event payment, recalculates balance, and updates event advancePaid', () => {
      const studioId = 'std_pay_test';

      const event = eventService.createEvent(studioId, {
        name: 'Kavita Wedding Ceremony',
        category: 'Wedding',
        startDate: '2026-12-01',
        startTime: '10:00',
        endDate: '2026-12-01',
        endTime: '18:00',
        venue: 'Novotel Ahmedabad',
        venueCity: 'Ahmedabad',
        status: 'Confirmed',
        priority: 'High',
        customerId: 'cust_kavita_01',
        customerName: 'Kavita Joshi',
        customerPhone: '9898989898',
        estimatedBudget: 100000,
        advancePaid: 30000,
        assignedTeamIds: [],
        createdBy: 'system'
      });

      // Record second milestone payment of ₹40,000
      const payment = paymentService.recordEventPayment(studioId, {
        eventId: event.id,
        amount: 40000,
        paymentMethod: 'Bank Transfer',
        transactionReference: 'NEFT_20261114_001',
        notes: 'Mid-shoot milestone payment'
      });

      expect(payment.receiptNumber).toBeDefined();
      expect(payment.amount).toBe(40000);

      // Verify event advancePaid is updated
      const updatedEvent = eventService.getEvent(studioId, event.id);
      expect(updatedEvent?.advancePaid).toBe(70000);

      // Check payment list for this event
      const payments = paymentService.listPayments(studioId, { eventId: event.id });
      expect(payments.length).toBeGreaterThanOrEqual(1);
      expect(payments[0].transactionReference).toBe('NEFT_20261114_001');
    });
  });
});
