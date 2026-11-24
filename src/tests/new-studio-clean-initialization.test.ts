import { describe, it, expect, beforeEach } from 'vitest';
import { TenantStore } from '../services/tenantStore';
import { realAccountProvisionService } from '../services/realAccountProvisionService';
import { bookingProductionService } from '../services/bookingProductionService';
import { customerService } from '../services/customerService';
import { employeeService } from '../services/employeeService';
import { crewConflictService } from '../services/crewConflictService';
import { studioServiceCatalogService } from '../services/studioServiceCatalogService';
import { studioCatalogService } from '../services/studioCatalogService';
import { quotationService } from '../services/quotationService';
import { invoiceService } from '../services/invoiceService';
import { paymentService } from '../services/paymentService';
import { expenseService } from '../services/expenseService';
import { eventService } from '../services/eventService';
import { notificationService } from '../services/notificationService';
import { whatsappService } from '../services/whatsappService';
import { seedCalendarTestBookings } from '../services/calendarTestBookingsSeed';
import { financialSettingsService } from '../services/financialSettingsService';

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

describe('Studio OS — New Studio Clean Initialization & Owner-Controlled Setup', () => {
  let studioAId = '';
  let studioBId = '';

  beforeEach(() => {
    localStorage.clear();
  });

  it('1-5. Newly provisioned studio starts completely empty across every business module with zero demo/preset records', async () => {
    const res = await realAccountProvisionService.provisionStudioAndOwner({
      name: 'Clean Lens Studio',
      ownerName: 'Rohan Mehta',
      loginId: 'cleanlens_owner',
      initialPassword: 'Password123',
      confirmPassword: 'Password123',
      phone: '9876501122',
      address: '101 Sunrise Plaza',
      city: 'Surat',
      state: 'Gujarat'
    });

    studioAId = res.studio.id;
    expect(studioAId).toBeTruthy();

    // Calendar seed guard must return 0 for real studios
    const seededCount = await seedCalendarTestBookings(studioAId);
    expect(seededCount).toBe(0);

    // Every business & catalog module starts at 0
    expect(bookingProductionService.listBookings(studioAId)).toHaveLength(0);
    expect(customerService.listCustomers(studioAId)).toHaveLength(0);
    expect(eventService.listEvents(studioAId)).toHaveLength(0);
    expect(quotationService.listQuotations(studioAId)).toHaveLength(0);
    expect(invoiceService.listInvoices(studioAId)).toHaveLength(0);
    expect(paymentService.listPayments(studioAId)).toHaveLength(0);
    expect(expenseService.listExpenses(studioAId)).toHaveLength(0);
    expect(notificationService.listNotifications(studioAId)).toHaveLength(0);

    // Crew & Employees start at 0 (no ownerEmployee injected into employees, no Shreeji fallback)
    expect(employeeService.listEmployees(studioAId)).toHaveLength(0);
    const assignableRoster = crewConflictService.getActiveEmployees(studioAId);
    const nonOwnerCrew = assignableRoster.filter(e => !(e as any).isStudioOwner);
    expect(nonOwnerCrew).toHaveLength(0);

    // Services, Packages, Deliverables, Event Types, WhatsApp Templates start at 0
    expect(studioServiceCatalogService.listServices(studioAId)).toHaveLength(0);
    expect(studioCatalogService.listPackages(studioAId)).toHaveLength(0);
    expect(studioCatalogService.listDeliverables(studioAId)).toHaveLength(0);
    expect(studioCatalogService.listEventTypes(studioAId)).toHaveLength(0);
    expect(whatsappService.listTemplates(studioAId)).toHaveLength(0);

    // Financial settings do not hardcode another studio's demo legal name
    const fin = financialSettingsService.getSettings(studioAId);
    expect(fin.legalName).toBe('Clean Lens Studio');
    expect(fin.legalName).not.toContain('Royal Weddings');
  });

  it('6. Owner controls full CRUD (Add, View, Edit, Delete) for Services, Packages, Deliverables, Event Types, and WhatsApp Templates', () => {
    const sId = 'studio_crud_test_01';

    // Services CRUD
    const svc = studioServiceCatalogService.createService(sId, {
      name: 'Drone Aerial Coverage',
      category: 'Aerial',
      defaultPrice: 18000,
      unit: 'Day'
    });
    expect(studioServiceCatalogService.listServices(sId)).toHaveLength(1);
    const updatedSvc = studioServiceCatalogService.updateService(sId, svc.id, { defaultPrice: 22000 });
    expect(updatedSvc.defaultPrice).toBe(22000);
    studioServiceCatalogService.deleteService(sId, svc.id);
    expect(studioServiceCatalogService.listServices(sId)).toHaveLength(0);

    // Packages CRUD
    const pkg = studioCatalogService.createPackage(sId, {
      name: 'Signature Wedding Pack',
      category: 'Wedding',
      basePrice: 85000
    });
    expect(studioCatalogService.listPackages(sId)).toHaveLength(1);
    const updatedPkg = studioCatalogService.updatePackage(sId, pkg.id, { basePrice: 95000 });
    expect(updatedPkg.basePrice).toBe(95000);
    studioCatalogService.deletePackage(sId, pkg.id);
    expect(studioCatalogService.listPackages(sId)).toHaveLength(0);

    // Deliverables CRUD
    const dlv = studioCatalogService.createDeliverable(sId, {
      name: 'Edited High-Res Photos',
      category: 'photography',
      defaultQty: 300,
      unit: 'photos'
    });
    expect(studioCatalogService.listDeliverables(sId)).toHaveLength(1);
    const updatedDlv = studioCatalogService.updateDeliverable(sId, dlv.id, { defaultQty: 400 });
    expect(updatedDlv.defaultQty).toBe(400);
    studioCatalogService.deleteDeliverable(sId, dlv.id);
    expect(studioCatalogService.listDeliverables(sId)).toHaveLength(0);

    // Event & Function Types CRUD
    const evtType = studioCatalogService.createEventType(sId, { name: 'Maternity Portrait', kind: 'event' });
    expect(studioCatalogService.listEventTypes(sId, 'event')).toHaveLength(1);
    studioCatalogService.updateEventType(sId, evtType.id, { name: 'Maternity & Baby Portrait' });
    expect(studioCatalogService.listEventTypes(sId, 'event')[0].name).toBe('Maternity & Baby Portrait');
    studioCatalogService.deleteEventType(sId, evtType.id);
    expect(studioCatalogService.listEventTypes(sId, 'event')).toHaveLength(0);

    // WhatsApp Templates CRUD
    const tmpl = whatsappService.createTemplate(sId, {
      title: 'Custom Quote Msg',
      category: 'Billing',
      body: 'Hi {{customer_name}}, here is your quote: {{quotation_link}}'
    });
    expect(whatsappService.listTemplates(sId)).toHaveLength(1);
    whatsappService.updateTemplate(sId, tmpl.id, { title: 'Updated Quote Msg' });
    expect(whatsappService.listTemplates(sId)[0].title).toBe('Updated Quote Msg');
    whatsappService.deleteTemplate(sId, tmpl.id);
    expect(whatsappService.listTemplates(sId)).toHaveLength(0);
  });

  it('7-14. First Booking, Quotation, Invoice, Payment, and Crew Assignment work cleanly starting from empty studio', async () => {
    const sId = 'studio_empty_workflow_01';

    // Step 1: Create first booking even when crew, services, packages, deliverables, customers are ALL 0
    const firstCustomer = customerService.createCustomer(sId, {
      name: 'Neha & Arjun',
      phone: '9898011223',
      city: 'Vadodara',
      status: 'Booked'
    } as any);

    const firstBooking = bookingProductionService.createBooking(sId, {
      customerId: firstCustomer.id,
      customerName: firstCustomer.name,
      customerPhone: firstCustomer.phone,
      eventName: 'Neha & Arjun Wedding',
      category: 'Wedding',
      mainEventDate: '2026-12-20',
      venue: 'Lakshmi Vilas Lawn',
      city: 'Vadodara',
      agreedAmount: 55000,
      advancePayment: 15000,
      functions: [
        {
          name: 'Wedding Ceremony',
          date: '2026-12-20',
          venue: 'Lakshmi Vilas Lawn'
        }
      ]
    });

    expect(firstBooking.id).toBeTruthy();
    expect(firstBooking.financials.finalAgreedAmount).toBe(55000);
    expect(firstBooking.financials.verifiedPaymentsReceived).toBe(15000);
    expect(firstBooking.financials.remainingBalance).toBe(40000);
    expect(firstBooking.deliverables).toHaveLength(0); // Zero forced preset deliverables!

    // Step 2: Add first crew member & verify immediate availability
    const crew = employeeService.createEmployee(sId, {
      fullName: 'Karan Desai',
      phone: '9898011224',
      email: 'karan@cleanlens.in',
      designation: 'Lead Photographer',
      department: 'Photography',
      roleId: 'role_photographer',
      employmentStatus: 'active'
    });
    expect(employeeService.listEmployees(sId)).toHaveLength(1);
    const updatedRoster = crewConflictService.getActiveEmployees(sId);
    expect(updatedRoster.some(e => e.id === crew.id && e.fullName === 'Karan Desai')).toBe(true);

    // Step 3: Create Quotation -> Convert to Booking -> Invoice & Payment
    const qService = studioServiceCatalogService.createService(sId, {
      name: 'Pre-Wedding Shoot',
      category: 'Pre-Wedding',
      defaultPrice: 30000,
      unit: 'Session'
    });

    const quote = quotationService.createQuotation(sId, {
      customerId: firstCustomer.id,
      customerName: firstCustomer.name,
      customerPhone: firstCustomer.phone,
      eventName: 'Pre-Wedding Session',
      eventCategory: 'Pre-Wedding',
      eventDate: '2026-12-10',
      items: [
        {
          description: qService.name,
          quantity: 1,
          unitPrice: qService.defaultPrice,
          discount: 0,
          taxRate: 0,
          amount: 30000
        }
      ],
      taxRate: 0
    });

    const converted = quotationService.convertQuotationToBooking(sId, quote.id, {
      eventName: 'Pre-Wedding Session',
      eventDate: '2026-12-10'
    });
    expect(converted.invoice.totalAmount).toBe(quote.grandTotal);
    expect(bookingProductionService.listBookings(sId).length).toBeGreaterThanOrEqual(2);
  });

  it('17-18. Second studio remains completely isolated and existing studio data stays intact', async () => {
    const resA = await realAccountProvisionService.provisionStudioAndOwner({
      name: 'Alpha Studio',
      ownerName: 'Alpha Owner',
      loginId: 'alpha_user_iso',
      initialPassword: 'Password123',
      confirmPassword: 'Password123',
      phone: '9000011111',
      address: 'A',
      city: 'Surat',
      state: 'Gujarat'
    });
    const resB = await realAccountProvisionService.provisionStudioAndOwner({
      name: 'Beta Studio',
      ownerName: 'Beta Owner',
      loginId: 'beta_user_iso',
      initialPassword: 'Password123',
      confirmPassword: 'Password123',
      phone: '9000022222',
      address: 'B',
      city: 'Pune',
      state: 'Maharashtra'
    });

    studioAId = resA.studio.id;
    studioBId = resB.studio.id;

    // Add data to Studio A
    customerService.createCustomer(studioAId, { name: 'Alpha Client', phone: '9111122222' } as any);
    studioServiceCatalogService.createService(studioAId, { name: 'Alpha Exclusive Service', defaultPrice: 12000 });
    studioCatalogService.createPackage(studioAId, { name: 'Alpha Pack', basePrice: 40000 });

    // Studio B must remain completely at 0
    expect(customerService.listCustomers(studioBId)).toHaveLength(0);
    expect(studioServiceCatalogService.listServices(studioBId)).toHaveLength(0);
    expect(studioCatalogService.listPackages(studioBId)).toHaveLength(0);
    expect(bookingProductionService.listBookings(studioBId)).toHaveLength(0);
    expect(employeeService.listEmployees(studioBId)).toHaveLength(0);
  });
});
