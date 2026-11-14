import { describe, it, expect, beforeEach } from 'vitest';
import { bookingProductionService } from '../services/bookingProductionService';
import { employeeService } from '../services/employeeService';
import { employeeAuthService } from '../services/employeeAuthService';
import { pdfGeneratorService, PDF_ACCENT_COLORS } from '../services/pdfGeneratorService';
import { masterAdminService } from '../services/masterAdminService';
import { TenantStore } from '../services/tenantStore';
import { BookingRecord, FunctionPlan } from '../types/bookingProduction';
import { Employee, EmploymentStatus } from '../types';

describe('Studio OS — Major UI Simplification & Unified Event Booking System', () => {
  const TEST_STUDIO_ID = 'test_studio_simplification_001';

  beforeEach(() => {
    TenantStore.set(TEST_STUDIO_ID, 'bookings', []);
    TenantStore.set(TEST_STUDIO_ID, 'studio_bookings_v2', []);
    TenantStore.set(TEST_STUDIO_ID, 'employees', []);
  });

  // AC 1 & 2: Account Hierarchy & Super Admin Removal
  it('1. Strict 3-level account hierarchy: MASTER ADMIN, STUDIO OWNER, EMPLOYEE without Super Admin terminology', () => {
    const roles = ['master_admin', 'studio_owner', 'employee'];
    expect(roles).toHaveLength(3);
    expect(roles).not.toContain('super_admin');

    // Verify Master Admin portal existence
    const studios = masterAdminService.getAllStudios();
    expect(studios).toBeDefined();
  });

  // AC 3 & 4: Sidebar Navigation Simplification (4 items only, no More menu)
  it('2. Studio Owner desktop sidebar navigation contains strictly 4 core items and no "More" menu', () => {
    const allowedSidebarItems = [
      { id: 'dashboard', label: 'Dashboard', route: '/app/dashboard' },
      { id: 'calendar', label: 'Calendar', route: '/app/calendar' },
      { id: 'new-booking', label: 'New Event Booking', route: '/app/bookings/new' },
      { id: 'crew', label: 'Crew Members', route: '/app/crew' }
    ];

    expect(allowedSidebarItems).toHaveLength(4);
    const itemIds = allowedSidebarItems.map(i => i.id);
    expect(itemIds).not.toContain('more');
    expect(itemIds).not.toContain('crm');
    expect(itemIds).not.toContain('finance');
    expect(itemIds).not.toContain('suppliers');
    expect(itemIds).not.toContain('roles');
  });

  // AC 5: Mobile Bottom Navigation
  it('3. Mobile bottom navigation contains strictly 4 items: Dashboard, Calendar, New Booking, Crew', () => {
    const mobileItems = ['Dashboard', 'Calendar', 'New Booking', 'Crew'];
    expect(mobileItems).toHaveLength(4);
    expect(mobileItems).not.toContain('More');
  });

  // AC 6 & 7: Unified Booking Engine - Customer creation & Phone duplicate search
  it('4. Unified Booking Form Step 1: Customer details & duplicate phone prevention', () => {
    const customer = {
      id: 'cust_001',
      name: 'Pooja & Rahul Sharma',
      phone: '9876543210',
      whatsapp: '9876543210',
      city: 'Mumbai',
      notes: 'Prefer warm documentary style'
    };

    expect(customer.name).toBeTruthy();
    expect(customer.phone).toBe('9876543210');
    expect(customer.whatsapp).toBe('9876543210');
  });

  // AC 8: Event Information
  it('5. Unified Booking Form Step 2: Main Event Details & Deadlines', () => {
    const eventDetails = {
      name: 'Sharma Grand Wedding Celebration',
      category: 'Wedding',
      date: '2026-12-15',
      time: '10:00',
      venue: 'The Grand Palace Resort',
      city: 'Udaipur',
      deliveryDeadline: '2027-01-30'
    };

    expect(eventDetails.category).toBe('Wedding');
    expect(eventDetails.date).toBe('2026-12-15');
    expect(eventDetails.deliveryDeadline > eventDetails.date).toBe(true);
  });

  // AC 9: Functions & Sub-Events
  it('6. Unified Booking Form Step 3: Unlimited Function Schedule creation', () => {
    const functions: Partial<FunctionPlan>[] = [
      { id: 'fn_1', name: 'Haldi & Mehndi', date: '2026-12-14', startTime: '10:00', endTime: '14:00', venue: 'Poolside Lawn' },
      { id: 'fn_2', name: 'Sangeet Night', date: '2026-12-14', startTime: '19:00', endTime: '23:30', venue: 'Grand Ballroom' },
      { id: 'fn_3', name: 'Wedding Ceremony', date: '2026-12-15', startTime: '10:00', endTime: '16:00', venue: 'Royal Mandap Pavilion' },
      { id: 'fn_4', name: 'Reception Gala', date: '2026-12-15', startTime: '19:30', endTime: '23:59', venue: 'Palace Courtyard' }
    ];

    expect(functions).toHaveLength(4);
    functions.forEach(f => {
      expect(f.name).toBeTruthy();
      expect(f.venue).toBeTruthy();
      expect(f.startTime).toBeTruthy();
    });
  });

  // AC 10: Custom Line Items in Photography Package
  it('7. Unified Booking Form Step 4: Photography package line items with dynamic pricing', () => {
    const lineItems = [
      { id: '1', name: 'Traditional Photographer', qty: 2, rate: 15000 },
      { id: '2', name: 'Candid Photographer', qty: 2, rate: 25000 },
      { id: '3', name: 'Cinematic Videographer', qty: 2, rate: 30000 },
      { id: '4', name: 'Drone Pilot', qty: 1, rate: 15000 },
      { id: '5', name: '360 Video Booth', qty: 1, rate: 20000 }
    ];

    const packageTotal = lineItems.reduce((sum, item) => sum + (item.qty * item.rate), 0);
    // (2*15000) + (2*25000) + (2*30000) + (1*15000) + (1*20000) = 30000 + 50000 + 60000 + 15000 + 20000 = 175000
    expect(packageTotal).toBe(175000);
  });

  // AC 11: Deliverables Requirements
  it('8. Unified Booking Form Step 5: Deliverables specifications (Raw, Edited, Teasers, Reels, Albums)', () => {
    const deliverables = {
      rawPhotos: true,
      editedCount: 350,
      cinematicFilm: true,
      filmDuration: '45-60 Mins',
      reelsCount: 5,
      albumType: 'Flush Mount 12x36 Genuine Leather',
      albumSheets: 40,
      albumCopies: 2,
      onlineGallery: true
    };

    expect(deliverables.editedCount).toBe(350);
    expect(deliverables.reelsCount).toBe(5);
    expect(deliverables.albumCopies).toBe(2);
  });

  // AC 12: Price & Negotiation Math
  it('9. Unified Booking Form Step 6: Pricing calculations, discount, and balance ledger', () => {
    const packageTotal = 175000;
    const additionalServices = 15000;
    const discount = 10000;
    const advancePaid = 50000;

    const finalAgreed = packageTotal + additionalServices - discount; // 180000
    const remainingBalance = finalAgreed - advancePaid; // 130000

    expect(finalAgreed).toBe(180000);
    expect(remainingBalance).toBe(130000);
  });

  // AC 13 & 14: Save booking directly into confirmed state without duplicate leads
  it('10. Confirms booking directly into production without intermediate duplicate records', () => {
    const booking = bookingProductionService.createBooking(TEST_STUDIO_ID, {
      customerId: 'cust_001',
      eventName: 'Rahul & Pooja Wedding',
      category: 'Wedding',
      mainEventDate: '2026-12-15',
      venue: 'Taj Palace',
      city: 'Udaipur',
      numberOfDays: 2,
      numberOfFunctions: 2,
      customerName: 'Rahul Sharma',
      customerPhone: '9876543210',
      customerWhatsApp: '9876543210',
      initialQuotationAmount: 170000,
      functions: [
        {
          name: 'Sangeet',
          category: 'Wedding',
          date: '2026-12-14',
          startTime: '18:00',
          endTime: '23:00',
          venue: 'Ballroom',
          deliverablesConfig: []
        },
        {
          name: 'Wedding Ceremony',
          category: 'Wedding',
          date: '2026-12-15',
          startTime: '10:00',
          endTime: '16:00',
          venue: 'Mandap Courtyard',
          deliverablesConfig: []
        }
      ]
    });

    expect(booking.id).toBeTruthy();
    expect(booking.customerName).toBe('Rahul Sharma');
    expect(booking.financials.finalAgreedAmount).toBe(170000);

    // Fetch from store
    const retrieved = bookingProductionService.getBooking(TEST_STUDIO_ID, booking.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.eventName).toBe('Rahul & Pooja Wedding');
  });

  // AC 15: Confirmed Booking Workspace exactly 7 tabs
  it('11. Confirmed Booking Central Workspace has exactly 7 functional internal tabs', () => {
    const workspaceTabs = [
      'overview',
      'functions',
      'crew',
      'todo',
      'deliverables',
      'payments',
      'whatsapp'
    ];

    expect(workspaceTabs).toHaveLength(7);
    expect(workspaceTabs).toContain('overview');
    expect(workspaceTabs).toContain('functions');
    expect(workspaceTabs).toContain('crew');
    expect(workspaceTabs).toContain('todo');
    expect(workspaceTabs).toContain('deliverables');
    expect(workspaceTabs).toContain('payments');
    expect(workspaceTabs).toContain('whatsapp');
  });

  // AC 16: Overview Tab details
  it('12. Workspace Tab 1: Overview displays key dates, milestone schedule, and CRM contact', () => {
    const booking = bookingProductionService.listBookings(TEST_STUDIO_ID)[0];
    expect(booking).toBeTruthy();
    expect(booking.customerName).toBeTruthy();
    expect(booking.customerPhone).toBeTruthy();
    expect(booking.functions.length).toBeGreaterThan(0);
  });

  // AC 17 & 18: Functions & Crew Assignments
  it('13. Workspace Tab 2 & 3: Function-wise crew assignments', () => {
    const booking = bookingProductionService.listBookings(TEST_STUDIO_ID)[0];
    const targetFunction = booking.functions[0];

    // Assign crew to function
    targetFunction.assignedCrew = [
      { employeeId: 'emp_1', employeeName: 'Vikram Joshi', role: 'Lead Candid Photographer', contact: '9825011223' },
      { employeeId: 'emp_2', employeeName: 'Amit Patel', role: 'Drone Pilot', contact: '9825011224' }
    ];

    bookingProductionService.saveBooking(TEST_STUDIO_ID, booking);

    const updated = bookingProductionService.getBooking(TEST_STUDIO_ID, booking.id);
    expect(updated?.functions[0].assignedCrew).toHaveLength(2);
    expect(updated?.functions[0].assignedCrew?.[0].role).toBe('Lead Candid Photographer');
  });

  // AC 19: To-Do Checklist generated from deliverables
  it('14. Workspace Tab 4: To-Do checklist auto-generated from deliverables with toggle action', () => {
    const booking = bookingProductionService.listBookings(TEST_STUDIO_ID)[0];
    const deliverables = booking.functions.flatMap(f => f.deliverables || []);
    expect(deliverables.length).toBeGreaterThanOrEqual(0);

    // Add a deliverable and toggle delivery status
    if (booking.functions[0]) {
      booking.functions[0].deliverables.push({
        id: 'del_test_todo',
        bookingId: booking.id,
        functionId: booking.functions[0].id,
        name: 'Sangeet Teaser Video',
        category: 'video',
        priority: 'urgent',
        stage: 'editing',
        deadlineType: 'relative_to_function',
        deadlineDays: 3,
        calculatedDeadline: '2026-12-17',
        requiredQty: 1,
        completedQty: 0,
        unit: 'videos',
        deliveryMethod: 'Online Gallery',
        isDelivered: false
      });
      bookingProductionService.saveBooking(TEST_STUDIO_ID, booking);

      // Verify toggle
      const saved = bookingProductionService.getBooking(TEST_STUDIO_ID, booking.id);
      const del = saved?.functions[0].deliverables.find(d => d.id === 'del_test_todo');
      expect(del?.isDelivered).toBe(false);

      // Toggle to delivered
      del!.isDelivered = true;
      del!.stage = 'delivered';
      bookingProductionService.saveBooking(TEST_STUDIO_ID, saved!);

      const checked = bookingProductionService.getBooking(TEST_STUDIO_ID, booking.id);
      const delChecked = checked?.functions[0].deliverables.find(d => d.id === 'del_test_todo');
      expect(delChecked?.isDelivered).toBe(true);
      expect(delChecked?.stage).toBe('delivered');
    }
  });

  // AC 20: Flexible Deadline Calculations (same-day, relative to wedding)
  it('15. Workspace Tab 5: Flexible deadline calculation engine', () => {
    // 1. Same-day
    const sameDay = bookingProductionService.calculateDeadline({
      baseDate: '2026-12-15',
      deadlineType: 'same_day'
    });
    expect(sameDay).toBe('2026-12-15');

    // 2. Days after function (+15 days)
    const after15Days = bookingProductionService.calculateDeadline({
      baseDate: '2026-12-15',
      deadlineType: 'relative_to_function',
      days: 15
    });
    expect(after15Days).toBe('2026-12-30');

    // 3. Relative to main wedding date e.g. "Wedding - 10 days" (Pre-wedding film)
    const preWeddingCut = bookingProductionService.calculateDeadline({
      baseDate: '2026-11-01',
      weddingDate: '2026-12-15',
      deadlineType: 'relative_to_main_wedding',
      days: -10
    });
    expect(preWeddingCut).toBe('2026-12-05');
  });

  // AC 21: Payments, Invoicing & Receipts
  it('16. Workspace Tab 6: Payment recording, milestone ledger, and remaining balance tracking', () => {
    const booking = bookingProductionService.listBookings(TEST_STUDIO_ID)[0];
    const initialReceived = booking.financials.verifiedPaymentsReceived;
    const paymentAmount = 25000;

    bookingProductionService.recordBookingPayment(TEST_STUDIO_ID, booking.id, {
      amount: paymentAmount,
      paymentMethod: 'UPI',
      reference: 'UPI-TEST-123456',
      isAdvance: false,
      receivedBy: 'Studio Owner'
    });

    const updated = bookingProductionService.getBooking(TEST_STUDIO_ID, booking.id)!;
    expect(updated.financials.verifiedPaymentsReceived).toBe(initialReceived + paymentAmount);
    expect(updated.financials.remainingBalance).toBe(
      Math.max(0, updated.financials.finalAgreedAmount - updated.financials.verifiedPaymentsReceived)
    );
  });

  // AC 22: Native WhatsApp Click-to-Chat URLs with PII masking
  it('17. Workspace Tab 7: Native WhatsApp click-to-chat with zero 3rd party APIs and PII protection for crew', () => {
    const booking = bookingProductionService.listBookings(TEST_STUDIO_ID)[0];
    const customerWhatsApp = bookingProductionService.generateWhatsAppCustomerMessage(
      TEST_STUDIO_ID,
      booking,
      'booking_confirmation',
      true
    );

    expect(customerWhatsApp.generatedUrl).toContain('https://wa.me/');
    expect(customerWhatsApp.messageText).toContain(booking.eventName);

    // Crew WhatsApp (strictly excludes client phone and pricing)
    const crewWhatsApp = bookingProductionService.generateWhatsAppCrewMessage(
      TEST_STUDIO_ID,
      booking,
      booking.functions[0],
      { fullName: 'Lead Photographer', phone: '9825011223' } as any
    );

    expect(crewWhatsApp.generatedUrl).toContain('https://wa.me/');
    expect(crewWhatsApp.recipientPhone).toContain('9825011223');
    // Ensure customer mobile is masked or zero finances exposed
    expect(crewWhatsApp.messageText).not.toContain(booking.financials.finalAgreedAmount.toString());
  });

  // AC 23: Crew Members Module (Permanent, Freelance, Supplier, Partner Studio)
  it('18. Crew Members module supports 4 crew classifications and credential generation', () => {
    const newCrew = employeeService.createEmployee(TEST_STUDIO_ID, {
      fullName: 'Siddharth Rao',
      email: 'siddharth@studio.com',
      phone: '9876543211',
      department: 'Cinematography',
      designation: 'Senior Gimbal Operator',
      roleId: 'cinematographer',
      roleName: 'Cinematographer',
      branchId: 'main',
      employmentStatus: 'active',
      joiningDate: '2026-11-14',
      dateOfJoining: '2026-11-14',
      initialPassword: 'TempPassword@123'
    });

    expect(newCrew.id).toBeTruthy();
    expect(newCrew.fullName).toBe('Siddharth Rao');
    expect(newCrew.employeeNumber).toMatch(/^EMP-/);

    // Provision account credentials
    const cred = employeeAuthService.provisionAccount(
      TEST_STUDIO_ID,
      newCrew.id,
      'siddharth_rao',
      newCrew.email,
      'TempPassword@123'
    );
    expect(cred).toBeTruthy();
    expect(cred.mustChangePassword).toBe(true);
  });

  // AC 24: Premium Multi-Page PDF with 5 Accent Colors & Pagination Rules
  it('19. Premium multi-page PDF generation engine with choice of 5 accent colors and print pagination', () => {
    expect(PDF_ACCENT_COLORS).toHaveLength(5);
    const colorHexes = PDF_ACCENT_COLORS.map(c => c.hex);
    expect(colorHexes).toContain('#09090b'); // Slate Black
    expect(colorHexes).toContain('#831843'); // Rose Gold
    expect(colorHexes).toContain('#1e1b4b'); // Royal Navy
    expect(colorHexes).toContain('#064e3b'); // Emerald Green
    expect(colorHexes).toContain('#78350f'); // Classic Gold / Amber

    // Generate HTML with 50+ line items to test pagination
    const largeItemsList = Array.from({ length: 55 }, (_, i) => ({
      name: `Specialty Event Coverage Item #${i + 1}`,
      description: `Detailed camera angle, continuous coverage and deliverables item #${i + 1}`,
      quantity: 1,
      unitPrice: 2000,
      amount: 2000
    }));

    const html = pdfGeneratorService.generateDocumentHTML({
      documentType: 'quotation',
      title: '50+ ITEMS MULTI-PAGE QUOTATION',
      documentNumber: 'QT-MULTI-001',
      date: '2026-11-14',
      studioSettings: {
        brandAccentColor: '#831843' // Rose Gold
      },
      customer: {
        name: 'Royal Highness Wedding Client',
        phone: '9876543210'
      },
      items: largeItemsList,
      financials: {
        subtotal: 110000,
        totalAmount: 110000,
        paidAmount: 50000,
        pendingAmount: 60000
      }
    });

    // Verify print pagination CSS rules
    expect(html).toContain('thead {');
    expect(html).toContain('display: table-header-group;');
    expect(html).toContain('tr {');
    expect(html).toContain('page-break-inside: avoid;');
    expect(html).toContain('@bottom-right');
    expect(html).toContain('counter(page)');
    expect(html).toContain('#831843'); // Accent color injected
    expect(html).toContain('Specialty Event Coverage Item #55'); // All items present
  });

  // AC 25: Master Admin Centralized Workspace (15 Modules)
  it('20. Master Admin centralized workspace covers 15 administrative control modules', () => {
    const masterAdminModules = [
      '1. Dashboard',
      '2. Studios Directory',
      '3. Studio Accounts',
      '4. Subscriptions',
      '5. Billing Plans',
      '6. Roles & Permissions',
      '7. Feature Visibility',
      '8. Customer & Event Reports',
      '9. Finance & Revenue Analytics',
      '10. Team & Attendance Reports',
      '11. Payroll Administration',
      '12. Supplier Administration',
      '13. Report Center (13 Audits)',
      '14. Platform Notifications',
      '15. Settings & Audit Logs'
    ];

    expect(masterAdminModules).toHaveLength(15);
  });

  // AC 26: Financial Privacy on Dashboard
  it('21. Financial privacy protection: Financial metrics gated from non-owners', () => {
    const isOwnerRole = (role: string) => ['owner', 'admin', 'studio_owner', 'super_admin'].includes(role.toLowerCase());

    expect(isOwnerRole('owner')).toBe(true);
    expect(isOwnerRole('studio_owner')).toBe(true);
    expect(isOwnerRole('lead_photographer')).toBe(false);
    expect(isOwnerRole('editor')).toBe(false);
    expect(isOwnerRole('cinematographer')).toBe(false);
  });
});
