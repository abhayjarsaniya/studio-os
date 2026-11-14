import { describe, it, expect, beforeEach } from 'vitest';
import { TenantStore } from '../services/tenantStore';
import { financialSettingsService } from '../services/financialSettingsService';
import { quotationService, DEFAULT_10_PHOTOGRAPHY_PACKAGES } from '../services/quotationService';
import { invoiceService } from '../services/invoiceService';
import { paymentService } from '../services/paymentService';
import { expenseService, DEFAULT_20_EXPENSE_CATEGORIES } from '../services/expenseService';
import { financialReportService } from '../services/financialReportService';
import { pdfGeneratorService } from '../services/pdfGeneratorService';
import { platformSubscriptionService } from '../services/platformSubscriptionService';

describe('Phase 8: Finance, PDF & Billing System', () => {
  const TEST_STUDIO = 'studio_test_fin_001';
  const OTHER_STUDIO = 'studio_test_fin_002';

  beforeEach(() => {
    TenantStore.resetTenant(TEST_STUDIO);
    TenantStore.resetTenant(OTHER_STUDIO);
  });

  // -------------------------------------------------------------
  // Criterion 1: Financial settings default configuration
  // -------------------------------------------------------------
  it('1. financialSettingsService returns default configuration (legal name, GSTIN, PAN, prefixes)', () => {
    const settings = financialSettingsService.getSettings(TEST_STUDIO);
    expect(settings.studioId).toBe(TEST_STUDIO);
    expect(settings.legalName).toBeDefined();
    expect(settings.gstin).toBeDefined();
    expect(settings.pan).toBeDefined();
    expect(settings.currency).toBe('INR');
    expect(settings.currencySymbol).toBe('₹');
    expect(settings.invoicePrefix).toBe('INV');
    expect(settings.quotationPrefix).toBe('QUO');
    expect(settings.receiptPrefix).toBe('REC');
    expect(settings.refundPrefix).toBe('REF');
    expect(settings.expensePrefix).toBe('EXP');
  });

  // -------------------------------------------------------------
  // Criterion 2: Concurrency-safe sequential document numbering
  // -------------------------------------------------------------
  it('2. generates sequential document numbers for QUO, INV, REC, EXP, REF, CRN', () => {
    const currentYear = new Date().getFullYear();
    const quo1 = financialSettingsService.generateDocumentNumber(TEST_STUDIO, 'QUO');
    const quo2 = financialSettingsService.generateDocumentNumber(TEST_STUDIO, 'QUO');
    const inv1 = financialSettingsService.generateDocumentNumber(TEST_STUDIO, 'INV');
    const rec1 = financialSettingsService.generateDocumentNumber(TEST_STUDIO, 'REC');
    const exp1 = financialSettingsService.generateDocumentNumber(TEST_STUDIO, 'EXP');
    const ref1 = financialSettingsService.generateDocumentNumber(TEST_STUDIO, 'REF');

    expect(quo1).toBe(`QUO-${currentYear}-000001`);
    expect(quo2).toBe(`QUO-${currentYear}-000002`);
    expect(inv1).toBe(`INV-${currentYear}-000001`);
    expect(rec1).toBe(`REC-${currentYear}-000001`);
    expect(exp1).toBe(`EXP-${currentYear}-000001`);
    expect(ref1).toBe(`REF-${currentYear}-000001`);
  });

  // -------------------------------------------------------------
  // Criterion 3: Tax calculations (Intra-state CGST/SGST & Inter-state IGST)
  // -------------------------------------------------------------
  it('3. financialSettingsService.calculateTaxes calculates intra-state CGST+SGST and inter-state IGST', () => {
    // Intra-state (Maharashtra to Maharashtra) -> CGST 9% + SGST 9%
    const intra = financialSettingsService.calculateTaxes(TEST_STUDIO, 100000, 0, 'Maharashtra');
    expect(intra.taxableAmount).toBe(100000);
    expect(intra.cgstAmount).toBe(9000);
    expect(intra.sgstAmount).toBe(9000);
    expect(intra.igstAmount).toBe(0);
    expect(intra.totalTax).toBe(18000);
    expect(intra.grandTotal).toBe(118000);

    // Inter-state (Maharashtra to Gujarat) -> IGST 18%
    const inter = financialSettingsService.calculateTaxes(TEST_STUDIO, 100000, 0, 'Gujarat');
    expect(inter.taxableAmount).toBe(100000);
    expect(inter.cgstAmount).toBe(0);
    expect(inter.sgstAmount).toBe(0);
    expect(inter.igstAmount).toBe(18000);
    expect(inter.totalTax).toBe(18000);
    expect(inter.grandTotal).toBe(118000);
  });

  // -------------------------------------------------------------
  // Criterion 4: 10 Default Photography Package Templates
  // -------------------------------------------------------------
  it('4. quotationService provides 10 default editable photography package templates', () => {
    const packages = quotationService.getPackageTemplates();
    expect(packages.length).toBe(10);
    expect(packages).toEqual(DEFAULT_10_PHOTOGRAPHY_PACKAGES);

    const weddingPkg = packages.find(p => p.name.includes('Wedding'));
    expect(weddingPkg).toBeDefined();
    expect(weddingPkg!.items.length).toBeGreaterThan(0);
    expect(weddingPkg!.suggestedPrice).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------
  // Criterion 5: Quotation Creation
  // -------------------------------------------------------------
  it('5. quotationService.createQuotation creates quotation with line items and GST', () => {
    const q = quotationService.createQuotation(TEST_STUDIO, {
      customerId: 'cust_001',
      customerName: 'Aarav & Priya Patel',
      customerPhone: '+91 98200 44556',
      customerEmail: 'aarav@patel.com',
      eventCategory: 'Wedding',
      packageName: 'Royal Palace 3-Day Wedding',
      items: [
        {
          description: 'Candid Photography 3 Days',
          quantity: 1,
          unitPrice: 150000,
          discount: 0,
          taxRate: 18,
          amount: 150000
        }
      ],
      subtotal: 150000,
      taxAmount: 27000,
      grandTotal: 177000,
      expiryDate: '2026-12-31'
    });

    expect(q.id).toBeDefined();
    expect(q.quotationNumber).toMatch(/^QUO-\d{4}-\d{6}$/);
    expect(q.customerName).toBe('Aarav & Priya Patel');
    expect(q.grandTotal).toBe(177000);
    expect(q.status).toBe('Draft');
  });

  // -------------------------------------------------------------
  // Criterion 6: Quotation Lifecycle Status Transitions
  // -------------------------------------------------------------
  it('6. quotationService.updateStatus transitions lifecycle states', () => {
    const q = quotationService.createQuotation(TEST_STUDIO, {
      customerId: 'cust_001',
      customerName: 'Aarav Patel',
      items: [{ description: 'Photoshoot', quantity: 1, unitPrice: 50000, amount: 50000 }],
      subtotal: 50000,
      grandTotal: 59000
    });

    const sent = quotationService.updateStatus(TEST_STUDIO, q.id, 'Sent');
    expect(sent.status).toBe('Sent');

    const accepted = quotationService.updateStatus(TEST_STUDIO, q.id, 'Accepted');
    expect(accepted.status).toBe('Accepted');
  });

  // -------------------------------------------------------------
  // Criterion 7: 1-Click Convert Quotation to Booking Event & Invoice
  // -------------------------------------------------------------
  it('7. quotationService.convertQuotationToBooking converts quote to booking event, creates invoice, and logs audit', () => {
    const q = quotationService.createQuotation(TEST_STUDIO, {
      customerId: 'cust_002',
      customerName: 'Kunal Kapoor & Tara Sutaria',
      customerPhone: '+91 98111 22334',
      eventCategory: 'Pre-Wedding',
      items: [{ description: 'Pre-Wedding Shoot in Ladakh', quantity: 1, unitPrice: 120000, amount: 120000 }],
      subtotal: 120000,
      grandTotal: 141600
    });

    const conversion = quotationService.convertQuotationToBooking(TEST_STUDIO, q.id, {
      operatorId: 'usr_director',
      operatorName: 'Creative Director'
    });

    expect(conversion.quotation.status).toBe('Converted to Booking');
    expect(conversion.event).toBeDefined();
    expect(conversion.event.customerId).toBe('cust_002');
    expect(conversion.invoice).toBeDefined();
    expect(conversion.invoice.totalAmount).toBe(141600);
    expect(conversion.invoice.relatedQuotationId).toBe(q.id);
  });

  // -------------------------------------------------------------
  // Criterion 8: Conversion idempotency guard
  // -------------------------------------------------------------
  it('8. convertQuotationToBooking throws an error if already converted', () => {
    const q = quotationService.createQuotation(TEST_STUDIO, {
      customerId: 'cust_003',
      customerName: 'Samir & Ritu Verma',
      items: [{ description: 'Engagement Shoot', quantity: 1, unitPrice: 60000, amount: 60000 }],
      subtotal: 60000,
      grandTotal: 70800
    });

    quotationService.convertQuotationToBooking(TEST_STUDIO, q.id);

    expect(() => {
      quotationService.convertQuotationToBooking(TEST_STUDIO, q.id);
    }).toThrow(/already converted/i);
  });

  // -------------------------------------------------------------
  // Criterion 9: Invoice creation and balance calculations
  // -------------------------------------------------------------
  it('9. invoiceService.createInvoice creates invoice and computes pendingAmount', () => {
    const inv = invoiceService.createInvoice(TEST_STUDIO, {
      invoiceType: 'Booking Invoice',
      customerId: 'cust_004',
      customerName: 'Dev & Meera Roy',
      dueDate: '2026-12-15',
      items: [
        {
          description: 'Full Day Wedding Coverage',
          quantity: 1,
          unitPrice: 100000,
          amount: 100000
        }
      ],
      subtotal: 100000,
      discountAmount: 10000,
      taxAmount: 16200,
      totalAmount: 106200,
      paidAmount: 0
    });

    expect(inv.id).toBeDefined();
    expect(inv.invoiceNumber).toMatch(/^INV-\d{4}-\d{6}$/);
    expect(inv.totalAmount).toBe(106200);
    expect(inv.pendingAmount).toBe(106200);
    expect(inv.status).toBe('Issued');
  });

  // -------------------------------------------------------------
  // Criterion 10: Dynamic Invoice Status Derivation
  // -------------------------------------------------------------
  it('10. invoiceService.recalculateStatus dynamically derives status based on paid amount and due date', () => {
    const pastDue = '2020-01-01';
    const futureDue = '2099-01-01';

    // 1. Unpaid past due date -> Overdue
    const overdueInv = invoiceService.recalculateStatus({
      id: 'i1',
      totalAmount: 100000,
      paidAmount: 0,
      dueDate: pastDue,
      status: 'Issued'
    } as any, '2026-11-13');
    expect(overdueInv.status).toBe('Overdue');

    // 2. Unpaid future due date -> Issued
    const issuedInv = invoiceService.recalculateStatus({
      id: 'i2',
      totalAmount: 100000,
      paidAmount: 0,
      dueDate: futureDue,
      status: 'Issued'
    } as any, '2026-11-13');
    expect(issuedInv.status).toBe('Issued');

    // 3. Partially paid -> Partially Paid
    const partialInv = invoiceService.recalculateStatus({
      id: 'i3',
      totalAmount: 100000,
      paidAmount: 40000,
      dueDate: futureDue,
      status: 'Issued'
    } as any, '2026-11-13');
    expect(partialInv.status).toBe('Partially Paid');

    // 4. Fully paid -> Paid
    const paidInv = invoiceService.recalculateStatus({
      id: 'i4',
      totalAmount: 100000,
      paidAmount: 100000,
      dueDate: pastDue,
      status: 'Issued'
    } as any, '2026-11-13');
    expect(paidInv.status).toBe('Paid');
  });

  // -------------------------------------------------------------
  // Criterion 11: Draft Invoice issuance
  // -------------------------------------------------------------
  it('11. invoiceService.issueInvoice marks draft invoice as officially issued', () => {
    const inv = invoiceService.createInvoice(TEST_STUDIO, {
      customerId: 'cust_draft',
      customerName: 'Draft Client',
      dueDate: '2026-12-31',
      items: [{ description: 'Test', quantity: 1, amount: 20000 }],
      totalAmount: 20000,
      isIssued: false
    });

    expect(inv.status).toBe('Draft');

    const issued = invoiceService.issueInvoice(TEST_STUDIO, inv.id, 'usr_admin');
    expect(issued.isIssued).toBe(true);
    expect(issued.status).toBe('Issued');
    expect(issued.issuedAt).toBeDefined();
  });

  // -------------------------------------------------------------
  // Criterion 12: Controlled Invoice Cancellation (Audit Trail)
  // -------------------------------------------------------------
  it('12. invoiceService.cancelInvoice marks invoice cancelled with mandatory reason without deleting record', () => {
    const inv = invoiceService.createInvoice(TEST_STUDIO, {
      customerId: 'cust_cancel',
      customerName: 'Cancel Client',
      dueDate: '2026-12-31',
      items: [{ description: 'Test Shoot', quantity: 1, amount: 30000 }],
      totalAmount: 30000
    });

    const cancelled = invoiceService.cancelInvoice(TEST_STUDIO, inv.id, 'Client postponed indefinitely');
    expect(cancelled.status).toBe('Cancelled');
    expect(cancelled.cancelReason).toBe('Client postponed indefinitely');
    expect(cancelled.cancelledAt).toBeDefined();

    // Verify it still exists in query (non-destructive)
    const fetched = invoiceService.getInvoice(TEST_STUDIO, inv.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.status).toBe('Cancelled');
  });

  // -------------------------------------------------------------
  // Criterion 13: Offline Payment Recording & Receipt Generation
  // -------------------------------------------------------------
  it('13. paymentService.recordPayment creates receipt, updates invoice balance & status', () => {
    const inv = invoiceService.createInvoice(TEST_STUDIO, {
      customerId: 'cust_pay',
      customerName: 'Payment Client',
      dueDate: '2026-12-31',
      items: [{ description: 'Bridal Portrait Shoot', quantity: 1, amount: 50000 }],
      totalAmount: 50000,
      paidAmount: 0
    });

    const { payment, invoice } = paymentService.recordPayment(TEST_STUDIO, {
      invoiceId: inv.id,
      amount: 20000,
      paymentMethod: 'UPI',
      transactionReference: 'UPI-HDFC-991244'
    });

    expect(payment.receiptNumber).toMatch(/^REC-\d{4}-\d{6}$/);
    expect(payment.amount).toBe(20000);
    expect(invoice.paidAmount).toBe(20000);
    expect(invoice.pendingAmount).toBe(30000);
    expect(invoice.status).toBe('Partially Paid');

    // Pay remaining balance
    const secondPayment = paymentService.recordPayment(TEST_STUDIO, {
      invoiceId: inv.id,
      amount: 30000,
      paymentMethod: 'Bank Transfer'
    });

    expect(secondPayment.invoice.paidAmount).toBe(50000);
    expect(secondPayment.invoice.pendingAmount).toBe(0);
    expect(secondPayment.invoice.status).toBe('Paid');
  });

  // -------------------------------------------------------------
  // Criterion 14: Overpayment validation guard
  // -------------------------------------------------------------
  it('14. paymentService.recordPayment rejects payment exceeding remaining invoice balance', () => {
    const inv = invoiceService.createInvoice(TEST_STUDIO, {
      customerId: 'cust_overpay',
      customerName: 'Overpay Client',
      dueDate: '2026-12-31',
      items: [{ description: 'Family Portrait', quantity: 1, amount: 25000 }],
      totalAmount: 25000,
      paidAmount: 0
    });

    expect(() => {
      paymentService.recordPayment(TEST_STUDIO, {
        invoiceId: inv.id,
        amount: 30000 // Exceeds 25000
      });
    }).toThrow(/exceeds remaining pending balance/i);
  });

  // -------------------------------------------------------------
  // Criterion 15: Payment against cancelled invoice guard
  // -------------------------------------------------------------
  it('15. paymentService.recordPayment blocks recording payment against a cancelled invoice', () => {
    const inv = invoiceService.createInvoice(TEST_STUDIO, {
      customerId: 'cust_cancelled_inv',
      customerName: 'Cancelled Inv Client',
      dueDate: '2026-12-31',
      items: [{ description: 'Cancelled Shoot', quantity: 1, amount: 15000 }],
      totalAmount: 15000
    });

    invoiceService.cancelInvoice(TEST_STUDIO, inv.id, 'Shoot cancelled');

    expect(() => {
      paymentService.recordPayment(TEST_STUDIO, {
        invoiceId: inv.id,
        amount: 5000
      });
    }).toThrow(/cancelled invoice/i);
  });

  // -------------------------------------------------------------
  // Criterion 16: Customer Refunds & Balance Reversals
  // -------------------------------------------------------------
  it('16. paymentService.createRefund creates refund voucher and readjusts invoice balances', () => {
    const inv = invoiceService.createInvoice(TEST_STUDIO, {
      customerId: 'cust_refund',
      customerName: 'Refund Client',
      dueDate: '2026-12-31',
      items: [{ description: 'Commercial Lookbook Shoot', quantity: 1, amount: 80000 }],
      totalAmount: 80000
    });

    const { payment } = paymentService.recordPayment(TEST_STUDIO, {
      invoiceId: inv.id,
      amount: 40000,
      paymentMethod: 'Bank Transfer'
    });

    const { refund, invoice } = paymentService.createRefund(TEST_STUDIO, {
      originalPaymentId: payment.id,
      amount: 15000,
      reason: 'Partial cancellation of day 2 footage'
    });

    expect(refund.refundNumber).toMatch(/^REF-\d{4}-\d{6}$/);
    expect(refund.amount).toBe(15000);
    expect(invoice.paidAmount).toBe(25000); // 40000 - 15000
    expect(invoice.pendingAmount).toBe(55000); // 80000 - 25000
    expect(invoice.status).toBe('Partially Paid');
  });

  // -------------------------------------------------------------
  // Criterion 17: Refund amount guard
  // -------------------------------------------------------------
  it('17. paymentService.createRefund rejects refund exceeding original payment amount', () => {
    const inv = invoiceService.createInvoice(TEST_STUDIO, {
      customerId: 'cust_excess_ref',
      customerName: 'Excess Refund Client',
      dueDate: '2026-12-31',
      items: [{ description: 'Shoot', quantity: 1, amount: 30000 }],
      totalAmount: 30000
    });

    const { payment } = paymentService.recordPayment(TEST_STUDIO, {
      invoiceId: inv.id,
      amount: 10000
    });

    expect(() => {
      paymentService.createRefund(TEST_STUDIO, {
        originalPaymentId: payment.id,
        amount: 15000, // Exceeds 10000
        reason: 'Refund error'
      });
    }).toThrow(/cannot exceed original payment amount/i);
  });

  // -------------------------------------------------------------
  // Criterion 18: Payment Schedule & Milestone Automation
  // -------------------------------------------------------------
  it('18. paymentService manages payment schedules and auto-updates milestones on payment', () => {
    const schedule = paymentService.generateDefaultSchedule(100000, 'inv_sched_1', 'cust_sched');
    expect(schedule.milestones.length).toBe(3);
    expect(schedule.milestones[0].percentage).toBe(20);
    expect(schedule.milestones[0].amount).toBe(20000);

    const saved = paymentService.savePaymentSchedule(TEST_STUDIO, schedule);
    expect(saved.id).toBeDefined();

    const retrieved = paymentService.getPaymentSchedule(TEST_STUDIO, 'inv_sched_1');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.totalAmount).toBe(100000);
  });

  // -------------------------------------------------------------
  // Criterion 19: 20 Default Expense Categories
  // -------------------------------------------------------------
  it('19. expenseService provides 20 default photography cost categories', () => {
    const categories = expenseService.getCategories();
    expect(categories.length).toBe(20);
    expect(categories).toEqual([...DEFAULT_20_EXPENSE_CATEGORIES]);
    expect(categories).toContain('Camera Equipment');
    expect(categories).toContain('Employee Salary');
    expect(categories).toContain('Album Production');
  });

  // -------------------------------------------------------------
  // Criterion 20: Expense creation with EXP-YYYY-000001
  // -------------------------------------------------------------
  it('20. expenseService.createExpense logs expense with sequential expense number', () => {
    const exp = expenseService.createExpense(TEST_STUDIO, {
      title: 'Sony FX3 Cage & Matte Box Rental',
      category: 'Camera Equipment',
      amount: 12500,
      vendor: 'Bandra Rental House',
      createdById: 'emp_cameraman',
      createdByName: 'John Cameraman'
    });

    expect(exp.id).toBeDefined();
    expect(exp.expenseNumber).toMatch(/^EXP-\d{4}-\d{6}$/);
    expect(exp.amount).toBe(12500);
    expect(exp.approvalStatus).toBe('Pending Approval');
  });

  // -------------------------------------------------------------
  // Criterion 21: Conflict of interest prevention in expense approvals
  // -------------------------------------------------------------
  it('21. expenseService.approveExpense blocks employee from approving their own submitted expense', () => {
    const exp = expenseService.createExpense(TEST_STUDIO, {
      title: 'Meals & Snacks during Jaipur Shoot',
      category: 'Food',
      amount: 4500,
      createdById: 'emp_raj',
      createdByName: 'Raj Photographer'
    });

    // Employee Raj tries to approve his own expense -> Conflict of Interest blocked!
    expect(() => {
      expenseService.approveExpense(TEST_STUDIO, exp.id, {
        userId: 'emp_raj',
        userName: 'Raj Photographer',
        roleTitle: 'Photographer'
      });
    }).toThrow(/Conflict of interest: Employees cannot approve their own submitted expenses/i);
  });

  // -------------------------------------------------------------
  // Criterion 22: Studio Owner / Manager can approve expenses
  // -------------------------------------------------------------
  it('22. expenseService.approveExpense allows Studio Owner or Manager to approve expenses', () => {
    const exp = expenseService.createExpense(TEST_STUDIO, {
      title: 'Gimbal Battery Pack',
      category: 'Camera Equipment',
      amount: 6000,
      createdById: 'emp_raj',
      createdByName: 'Raj Photographer'
    });

    const approved = expenseService.approveExpense(TEST_STUDIO, exp.id, {
      userId: 'usr_owner',
      userName: 'Studio Director',
      roleTitle: 'Studio Owner'
    });

    expect(approved.approvalStatus).toBe('Approved');
    expect(approved.approvedByName).toBe('Studio Director');
  });

  // -------------------------------------------------------------
  // Criterion 23: Expense payment marking
  // -------------------------------------------------------------
  it('23. expenseService.markExpensePaid marks approved expense as paid', () => {
    const exp = expenseService.createExpense(TEST_STUDIO, {
      title: 'Hard Drive 4TB Backup',
      category: 'Cloud Storage',
      amount: 9000,
      createdById: 'emp_raj',
      approvalStatus: 'Approved'
    });

    const paid = expenseService.markExpensePaid(TEST_STUDIO, exp.id, {
      paidById: 'usr_accountant',
      paidByName: 'Accountant Anita'
    });

    expect(paid.approvalStatus).toBe('Paid');
    expect(paid.paidByName).toBe('Accountant Anita');
    expect(paid.paymentDate).toBeDefined();
  });

  // -------------------------------------------------------------
  // Criterion 24: Finance Dashboard KPIs computation
  // -------------------------------------------------------------
  it('24. financialReportService.getDashboardKPIs accurately computes all 12 KPIs from TenantStore data', () => {
    // 1. Create an invoice of ₹1,00,000
    const inv = invoiceService.createInvoice(TEST_STUDIO, {
      customerId: 'cust_kpi',
      customerName: 'KPI Client',
      dueDate: '2026-12-31',
      items: [{ description: 'Shoot', quantity: 1, amount: 100000 }],
      totalAmount: 100000
    });

    // 2. Pay ₹60,000
    paymentService.recordPayment(TEST_STUDIO, {
      invoiceId: inv.id,
      amount: 60000
    });

    // 3. Log paid expense of ₹20,000
    expenseService.createExpense(TEST_STUDIO, {
      title: 'Lens Rental',
      category: 'Camera Equipment',
      amount: 20000,
      approvalStatus: 'Approved'
    });

    const kpis = financialReportService.getDashboardKPIs(TEST_STUDIO, 'all');

    expect(kpis.totalRevenue).toBe(100000);
    expect(kpis.revenueReceived).toBe(60000);
    expect(kpis.outstandingPayments).toBe(40000);
    expect(kpis.totalExpenses).toBe(20000);
    expect(kpis.netProfit).toBe(40000); // 60000 received - 20000 expenses
  });

  // -------------------------------------------------------------
  // Criterion 25: Professional PDF HTML Generation Engine
  // -------------------------------------------------------------
  it('25. pdfGeneratorService generates complete, clean HTML with studio branding and ₹ Rupee formatting', () => {
    const html = pdfGeneratorService.generateDocumentHTML({
      documentType: 'invoice',
      title: 'Tax Invoice',
      documentNumber: 'INV-2026-000042',
      customer: {
        name: 'Dev & Meera Roy',
        phone: '+91 98201 11223',
        gstin: '27AAAAA1234A1Z1'
      },
      items: [
        {
          name: 'Royal Heritage Shoot Day 1',
          quantity: 1,
          unitPrice: 50000,
          amount: 50000
        }
      ],
      financials: {
        subtotal: 50000,
        cgst: 4500,
        sgst: 4500,
        totalAmount: 59000,
        paidAmount: 20000,
        pendingAmount: 39000
      }
    });

    expect(html).toContain('Tax Invoice');
    expect(html).toContain('INV-2026-000042');
    expect(html).toContain('Dev & Meera Roy');
    expect(html).toContain('₹50,000.00');
    expect(html).toContain('₹59,000.00');
    expect(html).toContain('Authorized Signatory');
  });

  // -------------------------------------------------------------
  // Criterion 26: SaaS Platform Subscription Billing & Multi-Tenant Isolation
  // -------------------------------------------------------------
  it('26. platformSubscriptionService isolates platform subscription (₹500/month) from studio photography revenue', () => {
    const plan = platformSubscriptionService.getPlan();
    expect(plan.pricePerMonth).toBe(500);
    expect(plan.currency).toBe('INR');

    const sub = platformSubscriptionService.registerStudioSubscription(TEST_STUDIO, 'Test Heritage Studio');
    expect(sub.studioId).toBe(TEST_STUDIO);
    expect(sub.pricePerMonth).toBe(500);

    const metrics = platformSubscriptionService.getPlatformMetrics();
    expect(metrics.totalStudios).toBeGreaterThanOrEqual(1);
    expect(metrics.mrr).toBe(metrics.activeStudios * 500);

    // Verify tenant isolation: Create an invoice in TEST_STUDIO and ensure OTHER_STUDIO has 0 invoices
    invoiceService.createInvoice(TEST_STUDIO, {
      customerId: 'cust_iso',
      customerName: 'Isolation Customer',
      dueDate: '2026-12-31',
      items: [{ description: 'Isolated Shoot', quantity: 1, amount: 25000 }],
      totalAmount: 25000
    });

    const studioInvoices = invoiceService.listInvoices(TEST_STUDIO);
    const otherInvoices = invoiceService.listInvoices(OTHER_STUDIO);
    expect(studioInvoices.length).toBeGreaterThan(0);
    expect(otherInvoices.length).toBe(0);
  });
});
