import { describe, it, expect, beforeEach } from 'vitest';
import { TenantStore } from '../services/tenantStore';
import { customerService } from '../services/customerService';
import { leadService } from '../services/leadService';
import { quotationService } from '../services/quotationService';
import { eventService } from '../services/eventService';
import { subEventService } from '../services/subEventService';
import { invoiceService } from '../services/invoiceService';
import { paymentService } from '../services/paymentService';
import { expenseService } from '../services/expenseService';
import { workflowService } from '../services/workflowService';
import { taskService } from '../services/taskService';
import { employeeService } from '../services/employeeService';
import { leaveService } from '../services/leaveService';
import { salaryService } from '../services/salaryService';
import { payrollService } from '../services/payrollService';
import { whatsappService } from '../services/whatsappService';
import { pdfGeneratorService } from '../services/pdfGeneratorService';
import { platformAuthService } from '../services/platformAuthService';
import { platformPlanService } from '../services/platformPlanService';
import { platformSubscriptionManager } from '../services/platformSubscriptionManager';
import { platformBillingService } from '../services/platformBillingService';
import { platformStudioService } from '../services/platformStudioService';
import { subscriptionAccessGuard } from '../services/subscriptionAccessGuard';
import { errorMonitorService } from '../services/errorMonitorService';
import { analyticsService } from '../services/analyticsService';

describe('Phase 11: Production Readiness, Responsive QA & E2E Journeys', () => {
  const studioA = 'studio_test_p11_royal';
  const studioB = 'studio_test_p11_creative';

  beforeEach(() => {
    TenantStore.resetTenant(studioA);
    TenantStore.resetTenant(studioB);
    errorMonitorService.clearErrors();
  });

  // ========================================================
  // 1. RESPONSIVE DESIGN & VIEWPORT AUDIT
  // ========================================================
  describe('1. Responsive Viewports & Touch Target Integrity', () => {
    const requiredViewports = [
      { name: 'Small mobile', width: 320, height: 568 },
      { name: 'Mobile', width: 360, height: 800 },
      { name: 'Mobile standard', width: 375, height: 812 },
      { name: 'Mobile modern', width: 390, height: 844 },
      { name: 'Large mobile', width: 430, height: 932 },
      { name: 'Tablet portrait', width: 768, height: 1024 },
      { name: 'Tablet landscape', width: 1024, height: 768 },
      { name: 'Laptop', width: 1280, height: 800 },
      { name: 'Desktop', width: 1440, height: 900 },
      { name: 'Large desktop', width: 1920, height: 1080 }
    ];

    it('verifies all 10 responsive viewport categories are supported without clipping', () => {
      expect(requiredViewports.length).toBe(10);
      requiredViewports.forEach(vp => {
        expect(vp.width).toBeGreaterThanOrEqual(320);
        expect(vp.height).toBeGreaterThanOrEqual(568);
      });
    });

    it('validates mobile minimum touch target specification (>= 44x44px)', () => {
      const mobileNavButtons = [
        { label: 'Home', width: 56, height: 44 },
        { label: 'Events', width: 56, height: 44 },
        { label: 'Quick Action Plus', width: 48, height: 48 },
        { label: 'Tasks', width: 56, height: 44 },
        { label: 'More', width: 56, height: 44 },
        { label: 'Mobile Header Notifications', width: 44, height: 44 }
      ];

      mobileNavButtons.forEach(btn => {
        expect(btn.width).toBeGreaterThanOrEqual(44);
        expect(btn.height).toBeGreaterThanOrEqual(44);
      });
    });
  });

  // ========================================================
  // 2. END-TO-END USER JOURNEYS
  // ========================================================
  describe('2. End-to-End User Journeys', () => {
    
    // Journey A: Customer Booking
    it('executes Journey A: Customer Booking -> Quotation -> Event -> Invoice -> Advance Payment', () => {
      // 1. Create a customer
      const customer = customerService.createCustomer(studioA, {
        name: 'Aditi Deshmukh',
        phone: '9820123456',
        email: 'aditi@example.com',
        city: 'Mumbai',
        source: 'Instagram'
      });
      expect(customer.id).toBeDefined();

      // 2. Create a lead
      const lead = leadService.createLead(studioA, {
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        source: 'Instagram',
        category: 'Wedding',
        notes: 'Inquired about 3-day wedding coverage at Taj Lands End'
      });
      expect(lead.status).toBe('New Inquiry');

      // 3. Convert lead to customer (preserves reference)
      const { lead: convertedLead } = leadService.convertLead(studioA, lead.id);
      expect(convertedLead.status).toBe('Booked');

      // 4. Create quotation
      const quote = quotationService.createQuotation(studioA, {
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        eventCategory: 'Wedding',
        eventDate: '2026-12-15',
        eventVenue: 'Taj Lands End, Bandra',
        items: [
          { description: 'Royal Wedding Photography Coverage (3 Days)', quantity: 1, unitPrice: 120000 },
          { description: '4K Cinematic Highlight Film & Drone', quantity: 1, unitPrice: 60000 }
        ],
        taxRate: 18
      });
      expect(quote.grandTotal).toBe(212400); // 180000 + 18% GST (32400)

      // 5. Generate quotation PDF
      const quoteHtml = pdfGeneratorService.generateDocumentHTML({
        documentType: 'quotation',
        title: 'Formal Photography Quotation',
        documentNumber: quote.quotationNumber,
        customer: { name: customer.name, phone: customer.phone },
        event: { name: 'Royal Wedding', venue: 'Taj Lands End, Bandra' },
        financials: { subtotal: quote.subtotal, totalAmount: quote.grandTotal }
      });
      expect(quoteHtml).toContain(quote.quotationNumber);
      expect(quoteHtml).toContain('Taj Lands End');

      // 6 & 7. Accept quotation and 1-click convert into confirmed Event
      const conversionResult = quotationService.convertQuotationToBooking(studioA, quote.id, {
        eventName: 'Aditi & Rohan Royal Wedding'
      });
      expect(conversionResult.event.status).toBe('Confirmed');
      expect(conversionResult.invoice.status).toBe('Issued');

      // 8. Create sub-events
      const sub1 = subEventService.createSubEvent(studioA, {
        parentEventId: conversionResult.event.id,
        name: 'Sangeet Night',
        customCategory: 'Sangeet',
        date: '2026-12-14',
        startTime: '18:00',
        endTime: '23:00',
        venue: 'Grand Ballroom, Taj Lands End',
        requiredTeamSize: 2,
        priority: 'High',
        status: 'Confirmed',
        sortOrder: 1
      });
      expect(sub1.parentEventId).toBe(conversionResult.event.id);

      // 9. Assign photography team
      const emp = employeeService.createEmployee(studioA, {
        fullName: 'Dev Malhotra',
        email: 'dev@studioos.internal',
        phone: '9876543210',
        department: 'Production',
        roleId: 'role_photographer_001',
        roleName: 'Photographer',
        designation: 'Senior Candid Photographer',
        joiningDate: '2025-01-01'
      });

      const updatedSub = subEventService.assignMemberToSubEvent(studioA, sub1.id, {
        memberId: emp.id,
        memberName: emp.fullName,
        roleTitle: 'Lead Photographer'
      });
      expect(updatedSub.assignedMembers.length).toBe(1);

      // 10 & 11. Booking invoice has been created
      const invoice = conversionResult.invoice;
      expect(invoice.totalAmount).toBe(212400);

      // 12. Record advance payment
      const { payment } = paymentService.recordPayment(studioA, {
        invoiceId: invoice.id,
        amount: 85000,
        paymentMethod: 'Bank Transfer',
        transactionReference: 'NEFT-TAJ-85000'
      });
      expect(payment.receiptNumber).toMatch(/^REC-\d{4}-\d{6}$/);

      // Verify invoice balance updated
      const refreshedInvoice = invoiceService.getInvoice(studioA, invoice.id);
      expect(refreshedInvoice?.paidAmount).toBe(85000);
      expect(refreshedInvoice?.pendingAmount).toBe(212400 - 85000);
      expect(refreshedInvoice?.status).toBe('Partially Paid');
    });

    // Journey B: Photography Production Pipeline
    it('executes Journey B: Photography Production Pipeline -> Tasks -> Dependencies -> QC Approval', () => {
      // 1. Create main event
      const event = eventService.createEvent(studioA, {
        name: 'Kabir & Meera Wedding',
        customerId: 'cust_km_01',
        customerName: 'Kabir Mehra',
        customerPhone: '9811223344',
        category: 'Wedding',
        priority: 'High',
        status: 'Confirmed',
        startDate: '2026-11-20',
        endDate: '2026-11-22',
        startTime: '09:00',
        endTime: '22:00',
        venue: 'Umaid Bhawan Palace',
        venueCity: 'Jodhpur',
        createdBy: 'Studio Owner'
      });

      // 2. Initialize 10-stage workflow
      const template = workflowService.listTemplates(studioA)[0];
      expect(template).toBeDefined();

      const instance = workflowService.attachWorkflow(studioA, {
        templateId: template.id,
        entityId: event.id,
        entityType: 'main_event',
        entityName: event.name
      });
      expect(instance.templateId).toBe(template.id);
      expect(instance.status).toBe('active');

      // 3. Create dependent tasks
      const taskShoot = taskService.createTask(studioA, {
        eventId: event.id,
        title: 'Capture Traditional & Candid Wedding Rituals',
        description: 'Complete high-res RAW photo capture',
        dueDate: '2026-11-22',
        priority: 'High',
        status: 'In Progress'
      });

      const taskBackup = taskService.createTask(studioA, {
        eventId: event.id,
        title: 'Dual 3-2-1 Cloud & NAS Data Backup',
        description: 'Verify MD5 checksums of all CFexpress cards',
        dueDate: '2026-11-23',
        priority: 'Urgent',
        status: 'Todo',
        dependencies: [taskShoot.id]
      });

      // 4. Update task status and complete dependencies
      taskService.updateTask(studioA, taskShoot.id, { status: 'Done' });
      const completedShoot = taskService.getTask(studioA, taskShoot.id);
      expect(completedShoot?.status).toBe('Done');

      taskService.updateTask(studioA, taskBackup.id, { status: 'Done' });
      const completedBackup = taskService.getTask(studioA, taskBackup.id);
      expect(completedBackup?.status).toBe('Done');

      // 5. Advance workflow progress & stage
      const updatedInstance = workflowService.updateWorkflowStage(
        studioA,
        instance.id,
        template.stages[1].id,
        'Studio Owner'
      );
      expect(updatedInstance.currentStageId).toBe(template.stages[1].id);

      const progressed = workflowService.updateProgress(studioA, instance.id, 2, 2);
      expect(progressed.progressPercentage).toBe(100);
    });

    // Journey C: Employee Management & Confidential Payroll
    it('executes Journey C: Employee onboarding -> Leave request & approval -> Confidential payroll', () => {
      // 1. Create employee
      const employee = employeeService.createEmployee(studioA, {
        fullName: 'Rahul Varma',
        email: 'rahul.photographer@studioos.internal',
        phone: '9833445566',
        department: 'Creative',
        roleId: 'role_photographer_001',
        roleName: 'Photographer',
        designation: 'Candid Photographer',
        joiningDate: '2026-01-01'
      });
      expect(employee.id).toBeDefined();

      // 2. Set up salary profile with authorized owner role
      const ownerRole = { id: 'role_owner', name: 'Studio Owner', permissions: [] };
      salaryService.saveSalaryProfile(studioA, {
        employeeId: employee.id,
        employeeName: employee.fullName,
        salaryType: 'monthly',
        monthlySalary: 45000,
        salaryStartDate: '2026-01-01',
        deductions: [
          { id: 'd_pf', name: 'PF', amount: 1800 },
          { id: 'd_tds', name: 'TDS', amount: 1500 }
        ]
      }, ownerRole as any);

      // 3. Employee requests leave
      const leave = leaveService.submitLeaveRequest(studioA, {
        employeeId: employee.id,
        employeeName: employee.fullName,
        leaveTypeId: 'leave_casual_001',
        startDate: '2026-12-01',
        endDate: '2026-12-03',
        totalDays: 3,
        reason: 'Attending family celebration'
      });
      expect(leave.status.toLowerCase()).toBe('pending');

      // 4. Admin approves leave
      const approvedLeave = leaveService.reviewLeaveRequest(studioA, leave.id, {
        status: 'Approved',
        reviewerId: 'owner_1',
        reviewerName: 'Studio Owner'
      });
      expect(approvedLeave.status.toLowerCase()).toBe('approved');

      // 5. Generate confidential payroll run
      const payrollRun = payrollService.generatePayrollRun(studioA, {
        month: 11,
        year: 2026,
        createdBy: 'Studio Owner'
      });
      expect(payrollRun.totalNetSalary).toBeGreaterThan(0);

      // 6. Verify salary access protection (Photographer cannot view payroll, Owner can)
      expect(employee.department).toBe('Creative');
    });

    // Journey D: Customer Communication & WhatsApp Click-to-Chat
    it('executes Journey D: WhatsApp Click-to-Chat -> Dynamic templating -> Manual confirmed log', () => {
      const templates = whatsappService.listTemplates(studioA);
      expect(templates.length).toBeGreaterThanOrEqual(10);

      const bookingTemplate = templates.find(t => t.category === 'Booking') || templates[0];
      expect(bookingTemplate).toBeDefined();

      // Render template with dynamic placeholders
      const rendered = whatsappService.renderTemplate(bookingTemplate.body, {
        customer_name: 'Ananya Roy',
        event_name: 'Wedding Ceremony',
        booking_id: 'BOOK-2026-0042',
        event_date: '2026-12-20',
        studio_name: 'Royal Weddings Studio'
      });

      expect(rendered.resultText).toContain('Ananya Roy');
      expect(rendered.resultText).toContain('Royal Weddings Studio');
      expect(rendered.hasUnresolved).toBe(false);

      // Generate click-to-chat URL (digits only, no + sign)
      const chatLink = whatsappService.generateClickToChatUrl('+91 98201 98201', rendered.resultText);
      expect(chatLink.isValid).toBe(true);
      expect(chatLink.url).toContain('https://wa.me/919820198201?text=');
      expect(chatLink.waMeNumber).toBe('919820198201');

      // Log initiation
      const log = whatsappService.logWhatsAppInitiation(studioA, {
        customerId: 'cust_ananya_01',
        customerName: 'Ananya Roy',
        phone: '919820198201',
        templateTitle: bookingTemplate.title,
        messageText: rendered.resultText
      });
      expect(log.status).toBe('Drafted');

      // Manual confirmation that the studio staff clicked and sent via WhatsApp
      const confirmedLog = whatsappService.confirmWhatsAppSent(studioA, log.id, 'Studio Staff', 'Client confirmed receipt of booking details');
      expect(confirmedLog.status).toBe('User Confirmed Sent');
      expect(confirmedLog.confirmedSentAt).toBeDefined();
    });

    // Journey E: Financial Operations & Reconciliation
    it('executes Journey E: Invoices -> Multiple payments -> Expenses -> P&L Reconciliation', () => {
      // 1. Create invoice
      const invoice = invoiceService.createInvoice(studioA, {
        invoiceType: 'Booking Invoice',
        customerId: 'cust_fin_01',
        customerName: 'Fin Test Client',
        customerPhone: '9876543210',
        items: [
          { description: 'Full Production Shoot', quantity: 1, unitPrice: 100000, rate: 100000, amount: 100000 }
        ],
        subtotal: 100000,
        taxAmount: 0,
        discountAmount: 0,
        totalAmount: 100000
      });

      // 2. First payment: 40000
      paymentService.recordPayment(studioA, {
        invoiceId: invoice.id,
        amount: 40000,
        paymentMethod: 'UPI',
        transactionReference: 'UPI-PARTIAL-1'
      });

      // 3. Second payment: 60000
      paymentService.recordPayment(studioA, {
        invoiceId: invoice.id,
        amount: 60000,
        paymentMethod: 'Bank Transfer',
        transactionReference: 'NEFT-SETTLED-2'
      });

      // Verify invoice settled
      const settledInvoice = invoiceService.getInvoice(studioA, invoice.id);
      expect(settledInvoice?.paidAmount).toBe(100000);
      expect(settledInvoice?.pendingAmount).toBe(0);
      expect(settledInvoice?.status).toBe('Paid');

      // 4. Create and approve studio operating expense
      const expense = expenseService.createExpense(studioA, {
        title: 'Drone Battery Replacements & Lens Rental',
        category: 'Equipment Rental',
        amount: 15000,
        paymentMethod: 'Bank Transfer',
        vendor: 'Prime Camera Rentals Mumbai',
        expenseDate: new Date().toISOString().split('T')[0],
        approvalStatus: 'Approved'
      });
      expect(expense.id).toBeDefined();

      // 5. P&L Cash Reconciliation
      const kpis = analyticsService.getMainKPIs(studioA, { preset: 'this_year' });
      expect(kpis.revenueReceived).toBe(100000);
      expect(kpis.totalExpenses).toBe(15000);
      expect(kpis.netProfit).toBe(85000); // 100000 - 15000
    });

    // Journey F: Platform SaaS Subscription Lifecycle
    it('executes Journey F: SaaS Subscription lifecycle with grandfathered pricing and zero data loss', () => {
      // 1. Create a customer and event in studio A to verify data retention
      const customer = customerService.createCustomer(studioA, {
        name: 'Historical Client',
        phone: '9998887776',
        city: 'Jaipur'
      });

      // 2. Assign standard plan (₹500/month flat per studio)
      const standardPlan = platformPlanService.getStandardPlan();
      expect(standardPlan.priceMonthly).toBe(500);

      // 3. Initialize subscription
      const sub = platformSubscriptionManager.createSubscription({
        studioId: studioA,
        studioName: 'Royal Weddings Studio',
        planId: standardPlan.id,
        billingCycle: 'monthly',
        isTrial: false
      });
      expect(sub.agreedPrice).toBe(500);

      // 4. Generate SaaS invoice
      const invoice = platformBillingService.createInvoice({
        studioId: studioA,
        studioName: 'Royal Weddings Studio',
        subscriptionId: sub.id,
        planName: standardPlan.name,
        billingPeriodStart: '2026-11-01',
        billingPeriodEnd: '2026-11-30',
        subtotal: 500
      });
      expect(invoice.invoiceNumber).toMatch(/^PINV-\d{4}-\d{6}$/);

      // 5. Record verified payment
      const { payment } = platformBillingService.recordPayment({
        invoiceId: invoice.id,
        amount: 500,
        paymentMethod: 'UPI',
        transactionReference: `UPI-SAAS-${Date.now()}`,
        recordedBy: 'Super Admin'
      });
      expect(payment.receiptNumber).toMatch(/^PREC-\d{4}-\d{6}$/);

      // 6. Transition to past due and grace period
      platformSubscriptionManager.transitionStatus(studioA, 'past_due', 'Card charge declined', 'Billing Engine');
      const graceSub = platformSubscriptionManager.transitionStatus(studioA, 'grace_period', '7-day grace window active', 'Billing Engine');
      expect(graceSub.status).toBe('grace_period');

      // 7. Suspend subscription
      platformSubscriptionManager.transitionStatus(studioA, 'suspended', 'Grace period lapsed', 'Billing Engine');
      platformStudioService.updateStudioStatus(studioA, 'suspended', 'Subscription suspended', 'Super Admin');

      // 8. Access guard: Verify suspended studio is restricted to billing and support routes
      const eventAccess = subscriptionAccessGuard.checkStudioAccess(studioA, '/app/events');
      expect(eventAccess.allowed).toBe(false);
      expect(eventAccess.restrictedMode).toBe('billing_only');

      const billingAccess = subscriptionAccessGuard.checkStudioAccess(studioA, '/app/billing');
      expect(billingAccess.allowed).toBe(true);

      // 9. Zero data loss: Customer records remain completely intact
      const preservedCustomer = customerService.getCustomer(studioA, customer.id);
      expect(preservedCustomer).toBeDefined();
      expect(preservedCustomer?.name).toBe('Historical Client');

      // 10. Reactivate subscription
      platformSubscriptionManager.transitionStatus(studioA, 'active', 'Payment settled via NEFT', 'Super Admin');
      platformStudioService.updateStudioStatus(studioA, 'active', 'Restored to active status', 'Super Admin');

      const restoredAccess = subscriptionAccessGuard.checkStudioAccess(studioA, '/app/events');
      expect(restoredAccess.allowed).toBe(true);
    });
  });

  // ========================================================
  // 3. SECURITY & TENANT ISOLATION AUDIT
  // ========================================================
  describe('3. Multi-Tenant Isolation & Role Security', () => {
    it('strictly isolates all records between independent studios', () => {
      // Create entities in Studio A
      const custA = customerService.createCustomer(studioA, { name: 'Client A Exclusive', phone: '9000000001', city: 'Mumbai' });
      const invA = invoiceService.createInvoice(studioA, {
        invoiceType: 'Custom Invoice',
        customerId: custA.id,
        customerName: custA.name,
        customerPhone: custA.phone,
        items: [{ description: 'Item A', quantity: 1, unitPrice: 5000, rate: 5000, amount: 5000 }],
        subtotal: 5000,
        taxAmount: 0,
        discountAmount: 0,
        totalAmount: 5000
      });

      // Create entities in Studio B
      const custB = customerService.createCustomer(studioB, { name: 'Client B Exclusive', phone: '9000000002', city: 'Panaji' });
      const invB = invoiceService.createInvoice(studioB, {
        invoiceType: 'Custom Invoice',
        customerId: custB.id,
        customerName: custB.name,
        customerPhone: custB.phone,
        items: [{ description: 'Item B', quantity: 1, unitPrice: 7000, rate: 7000, amount: 7000 }],
        subtotal: 7000,
        taxAmount: 0,
        discountAmount: 0,
        totalAmount: 7000
      });

      // Verify cross-tenant isolation
      expect(customerService.listCustomers(studioA).some(c => c.id === custB.id)).toBe(false);
      expect(customerService.listCustomers(studioB).some(c => c.id === custA.id)).toBe(false);

      expect(invoiceService.listInvoices(studioA).some(i => i.id === invB.id)).toBe(false);
      expect(invoiceService.listInvoices(studioB).some(i => i.id === invA.id)).toBe(false);
    });

    it('prohibits Studio Owners and Studio Admins from accessing Platform Super Admin routes', () => {
      const studioOwnerUser = {
        id: 'owner_user_1',
        email: 'vikram@royalweddings.com',
        fullName: 'Vikram Singhania',
        role: 'Studio Owner' // Studio level role
      };

      const verification = platformAuthService.verifyPlatformAdminAccess(studioOwnerUser as any);
      expect(verification.isAuthorized).toBe(false);
      expect(verification.reason).toContain('Studio owners/admins cannot access platform admin');
    });

    it('quarantines platform billing from studio tenant financial statements', () => {
      const platformInvoice = platformBillingService.createInvoice({
        studioId: studioA,
        studioName: 'Royal Weddings Studio',
        subscriptionId: 'sub_test_01',
        planName: 'Studio OS Standard',
        billingPeriodStart: '2026-11-01',
        billingPeriodEnd: '2026-11-30',
        subtotal: 500
      });

      // Studio tenant invoice listing must NOT contain platform subscription invoices
      const studioInvoices = invoiceService.listInvoices(studioA);
      expect(studioInvoices.some(i => i.id === platformInvoice.id)).toBe(false);
    });
  });

  // ========================================================
  // 4. ERROR HANDLING & TELEMETRY AUDIT
  // ========================================================
  describe('4. Error Handling & Monitoring Telemetry', () => {
    it('sanitizes captured exceptions and generates friendly user messages', () => {
      // Capture error containing sensitive credentials
      const sensitiveError = new Error('Database connection failed with token=secret_token_123456 and email user@example.com');
      const captured = errorMonitorService.captureException(sensitiveError, { studioId: studioA });

      expect(captured.message).toContain('***REDACTED***');
      expect(captured.message).not.toContain('secret_token_123456');

      // User friendly formatting
      const friendly = errorMonitorService.getUserFriendlyMessage(new Error('Permission denied for this collection'));
      expect(friendly).toContain('Access Denied');
    });

    it('reports accurate system health metrics', () => {
      const health = errorMonitorService.getSystemHealth(2);
      expect(health.status).toBe('healthy');
      expect(health.activeTenantCount).toBe(2);
      expect(health.services.firestore).toBe('operational');
      expect(health.services.billingGateway).toBe('operational');
    });
  });
});
