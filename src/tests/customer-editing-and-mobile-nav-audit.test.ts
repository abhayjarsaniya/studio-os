import { describe, it, expect, beforeEach } from 'vitest';
import { customerService } from '../services/customerService';
import { TenantStore } from '../services/tenantStore';
import { Customer } from '../types/schema';

describe('Customer Editing and Cascading Updates Audit', () => {
  const TEST_STUDIO = 'std_audit_test_studio';

  beforeEach(() => {
    TenantStore.clearAll();
  });

  it('successfully creates and updates a customer with sanitized optional fields', () => {
    const customer = customerService.createCustomer(TEST_STUDIO, {
      name: 'Priya Sharma',
      phone: '9876543210',
      email: 'priya@example.com',
      city: 'Mumbai',
      state: 'Maharashtra'
    });

    expect(customer.id).toBeDefined();
    expect(customer.name).toBe('Priya Sharma');

    // Update with empty strings for optional fields (which previously could fail strict schema checks)
    const updated = customerService.updateCustomer(TEST_STUDIO, customer.id, {
      name: 'Priya Verma',
      alternatePhone: '   ',
      notes: 'Updated VIP client notes',
      companyName: ''
    });

    expect(updated.name).toBe('Priya Verma');
    expect(updated.notes).toBe('Updated VIP client notes');
    expect(updated.alternatePhone).toBeUndefined();
    expect(updated.companyName).toBeUndefined();

    // Verify stored in TenantStore
    const stored = TenantStore.get<Customer>(TEST_STUDIO, 'customers').find(c => c.id === customer.id);
    expect(stored).toBeDefined();
    expect(stored?.name).toBe('Priya Verma');
  });

  it('cascades customer name, phone, and email updates to linked bookings in studio_bookings_v2', () => {
    const customer = customerService.createCustomer(TEST_STUDIO, {
      name: 'Aditya Mehta',
      phone: '9820011223',
      email: 'aditya@example.com'
    });

    // Seed a booking linked to this customer
    const mockBooking = {
      id: 'bkg_test_001',
      studioId: TEST_STUDIO,
      customerId: customer.id,
      customerName: 'Aditya Mehta',
      customerPhone: '9820011223',
      customerEmail: 'aditya@example.com',
      eventName: 'Aditya & Ananya Wedding',
      mainEventDate: '2026-12-15',
      financials: { finalAgreedAmount: 150000 }
    };
    TenantStore.set(TEST_STUDIO, 'studio_bookings_v2', [mockBooking]);

    // Update customer name and email
    customerService.updateCustomer(TEST_STUDIO, customer.id, {
      name: 'Aditya & Ananya Mehta',
      email: 'mehta.wedding@example.com'
    });

    // Check that studio_bookings_v2 record was cascaded
    const updatedBookings = TenantStore.get<any>(TEST_STUDIO, 'studio_bookings_v2');
    expect(updatedBookings[0].customerName).toBe('Aditya & Ananya Mehta');
    expect(updatedBookings[0].customerEmail).toBe('mehta.wedding@example.com');
  });

  it('cascades customer updates to quotations, invoices, and events', () => {
    const customer = customerService.createCustomer(TEST_STUDIO, {
      name: 'Rohan Joshi',
      phone: '9811122233',
      email: 'rohan@example.com'
    });

    // Seed quotation
    const mockQuotation = {
      id: 'quot_001',
      customerId: customer.id,
      customerName: 'Rohan Joshi',
      customerPhone: '9811122233',
      customerEmail: 'rohan@example.com',
      title: 'Cinematic Package'
    };
    TenantStore.set(TEST_STUDIO, 'quotations', [mockQuotation]);

    // Seed invoice
    const mockInvoice = {
      id: 'inv_001',
      customerId: customer.id,
      customerName: 'Rohan Joshi',
      customerPhone: '9811122233',
      amount: 50000
    };
    TenantStore.set(TEST_STUDIO, 'invoices', [mockInvoice]);

    // Seed event
    const mockEvent = {
      id: 'ev_001',
      customerId: customer.id,
      clientName: 'Rohan Joshi',
      clientPhone: '9811122233',
      clientEmail: 'rohan@example.com',
      title: 'Engagement Shoot'
    };
    TenantStore.set(TEST_STUDIO, 'events', [mockEvent]);

    // Perform update
    customerService.updateCustomer(TEST_STUDIO, customer.id, {
      name: 'Rohan Joshi & Family',
      phone: '9811199999',
      email: 'rohan.family@example.com'
    });

    // Verify quotation cascaded
    const quotations = TenantStore.get<any>(TEST_STUDIO, 'quotations');
    expect(quotations[0].customerName).toBe('Rohan Joshi & Family');
    expect(quotations[0].customerEmail).toBe('rohan.family@example.com');

    // Verify invoice cascaded
    const invoices = TenantStore.get<any>(TEST_STUDIO, 'invoices');
    expect(invoices[0].customerName).toBe('Rohan Joshi & Family');
    expect(invoices[0].customerPhone).toBe('9811199999');

    // Verify event cascaded
    const events = TenantStore.get<any>(TEST_STUDIO, 'events');
    expect(events[0].clientName).toBe('Rohan Joshi & Family');
    expect(events[0].clientPhone).toBe('9811199999');
    expect(events[0].clientEmail).toBe('rohan.family@example.com');
  });

  it('keeps customer ID intact and handles non-existent records gracefully', () => {
    const updated = customerService.updateCustomer(TEST_STUDIO, 'cust_resilient_999', {
      name: 'Resilient Customer',
      phone: '9988776655'
    });

    expect(updated.id).toBe('cust_resilient_999');
    expect(updated.name).toBe('Resilient Customer');
  });
});
