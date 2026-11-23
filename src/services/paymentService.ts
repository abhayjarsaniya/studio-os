import { Payment, PaymentSchema, Refund, RefundSchema, PaymentSchedule, PaymentScheduleSchema, Invoice, PaymentMethod, StudioEvent } from '../types/schema';
import { TenantStore } from './tenantStore';
import { invoiceService } from './invoiceService';
import { financialSettingsService } from './financialSettingsService';
import { customerService } from './customerService';
import { auditService } from './auditService';
import { firestoreService } from './firestoreService';

export interface PaymentFilterOptions {
  invoiceId?: string;
  customerId?: string;
  eventId?: string;
  startDate?: string;
  endDate?: string;
  paymentMethod?: PaymentMethod;
}

export class PaymentService {
  listPayments(studioId: string, filter?: PaymentFilterOptions): Payment[] {
    if (!studioId) throw new Error('[paymentService.listPayments]: studioId is required');
    let payments = TenantStore.get<Payment>(studioId, 'payments');

    if (filter) {
      if (filter.invoiceId) {
        payments = payments.filter(p => p.invoiceId === filter.invoiceId);
      }
      if (filter.customerId) {
        payments = payments.filter(p => p.customerId === filter.customerId);
      }
      if (filter.eventId) {
        payments = payments.filter(p => p.eventId === filter.eventId);
      }
      if (filter.startDate) {
        payments = payments.filter(p => p.paymentDate >= filter.startDate!);
      }
      if (filter.endDate) {
        payments = payments.filter(p => p.paymentDate <= filter.endDate!);
      }
      if (filter.paymentMethod) {
        payments = payments.filter(p => p.paymentMethod === filter.paymentMethod);
      }
    }

    return payments.sort((a, b) => new Date(b.paymentDate || b.createdAt).getTime() - new Date(a.paymentDate || a.createdAt).getTime());
  }

  getPayment(studioId: string, paymentId: string): Payment | null {
    if (!studioId || !paymentId) return null;
    const payments = this.listPayments(studioId);
    return payments.find(p => p.id === paymentId) || null;
  }

  recordEventPayment(
    studioId: string,
    data: {
      eventId: string;
      amount: number;
      paymentMethod?: PaymentMethod;
      transactionReference?: string;
      paymentDate?: string;
      notes?: string;
      operatorId?: string;
      operatorName?: string;
    }
  ): Payment {
    if (!studioId) throw new Error('[paymentService.recordEventPayment]: studioId is required');
    const events = TenantStore.get<StudioEvent>(studioId, 'events');
    const event = events.find(e => e.id === data.eventId);
    if (!event) throw new Error(`Event with ID ${data.eventId} not found`);

    let invoice = invoiceService.listInvoices(studioId, { eventId: event.id })[0];
    if (!invoice) {
      invoice = invoiceService.createInvoice(studioId, {
        customerId: event.customerId || `cust_${event.id}`,
        customerName: event.customerName,
        customerPhone: event.customerPhone,
        eventId: event.id,
        eventName: event.name,
        invoiceDate: event.startDate,
        dueDate: event.startDate,
        items: [
          {
            description: `${event.name} - Photography & Cinematography Services`,
            quantity: 1,
            unitPrice: event.estimatedBudget || data.amount,
            amount: event.estimatedBudget || data.amount
          }
        ],
        subtotal: event.estimatedBudget || data.amount,
        discountAmount: 0,
        taxAmount: 0,
        totalAmount: event.estimatedBudget || data.amount,
        paidAmount: event.advancePaid || 0,
        status: 'Issued'
      });
    }

    const paymentResult = this.recordPayment(studioId, {
      invoiceId: invoice.id,
      amount: data.amount,
      paymentMethod: data.paymentMethod || 'UPI',
      transactionReference: data.transactionReference,
      paymentDate: data.paymentDate || new Date().toISOString().split('T')[0],
      notes: data.notes,
      operatorId: data.operatorId,
      operatorName: data.operatorName
    });

    // Update event advancePaid
    const newAdvance = (event.advancePaid || 0) + data.amount;
    const updatedEvents = events.map(e => e.id === event.id ? { ...e, advancePaid: newAdvance, updatedAt: new Date().toISOString() } : e);
    TenantStore.set(studioId, 'events', updatedEvents);

    return paymentResult.payment;
  }

  recordPayment(
    studioId: string,
    data: {
      invoiceId: string;
      amount: number;
      paymentMethod?: PaymentMethod;
      paymentMode?: string;
      transactionReference?: string;
      paymentDate?: string;
      notes?: string;
      receivedById?: string;
      receivedByName?: string;
      operatorId?: string;
      operatorName?: string;
    }
  ): { payment: Payment; invoice: Invoice } {
    if (!studioId) throw new Error('[paymentService.recordPayment]: studioId is required');
    if (!data.invoiceId) throw new Error('[paymentService.recordPayment]: invoiceId is required');
    if (!data.amount || data.amount <= 0) throw new Error('[paymentService.recordPayment]: amount must be greater than zero');

    const invoice = invoiceService.getInvoice(studioId, data.invoiceId);
    if (!invoice) throw new Error(`[paymentService.recordPayment]: Invoice ${data.invoiceId} not found`);

    if (invoice.status === 'Cancelled') {
      throw new Error('[paymentService.recordPayment]: Cannot record payment against a cancelled invoice');
    }

    const currentPaid = invoice.paidAmount || 0;
    const total = invoice.totalAmount;
    const remainingPending = Math.max(0, total - currentPaid);

    if (data.amount > remainingPending + 0.01) {
      throw new Error(`[paymentService.recordPayment]: Payment amount (₹${data.amount}) exceeds remaining pending balance (₹${remainingPending})`);
    }

    const receiptNumber = financialSettingsService.generateDocumentNumber(studioId, 'REC');
    const paymentDate = data.paymentDate || new Date().toISOString().split('T')[0];

    const newPayment: Payment = {
      id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      studioId,
      receiptNumber,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerId: invoice.customerId,
      customerName: invoice.customerName,
      eventId: invoice.eventId,
      eventName: invoice.eventName,
      amount: Math.round(data.amount * 100) / 100,
      paymentMethod: data.paymentMethod || 'UPI',
      paymentMode: (data.paymentMethod || 'upi').toLowerCase().replace(/\s+/g, '_'),
      transactionReference: data.transactionReference || '',
      paymentDate,
      status: 'success',
      receivedById: data.receivedById || data.operatorId || 'system',
      receivedByName: data.receivedByName || data.operatorName || 'Studio Admin',
      notes: data.notes || '',
      createdAt: new Date().toISOString(),
      createdBy: data.operatorId || 'system'
    };

    PaymentSchema.parse(newPayment);

    // Save payment
    const payments = TenantStore.get<Payment>(studioId, 'payments');
    TenantStore.set(studioId, 'payments', [newPayment, ...payments]);
    firestoreService.saveDocument(studioId, 'payments', newPayment.id, newPayment).catch(() => {});

    // Update invoice paid & pending amount
    const newPaidAmount = Math.round((currentPaid + newPayment.amount) * 100) / 100;
    const newPendingAmount = Math.max(0, Math.round((total - newPaidAmount) * 100) / 100);

    const updatedInvoice: Invoice = {
      ...invoice,
      paidAmount: newPaidAmount,
      pendingAmount: newPendingAmount,
      outstandingBalance: newPendingAmount,
      status: newPendingAmount === 0 ? 'Paid' : 'Partially Paid',
      updatedAt: new Date().toISOString()
    };

    const invoices = TenantStore.get<Invoice>(studioId, 'invoices');
    const updatedInvoices = invoices.map(i => i.id === invoice.id ? updatedInvoice : i);
    TenantStore.set(studioId, 'invoices', updatedInvoices);
    firestoreService.saveDocument(studioId, 'invoices', updatedInvoice.id, updatedInvoice).catch(() => {});

    // Update customer totalSpent and outstandingBalance if customer exists
    try {
      const customer = customerService.getCustomer(studioId, invoice.customerId);
      if (customer) {
        const currentSpent = customer.totalSpent || 0;
        const currentOutstanding = customer.outstandingBalance || 0;
        customerService.updateCustomer(studioId, customer.id, {
          totalSpent: Math.round((currentSpent + newPayment.amount) * 100) / 100,
          outstandingBalance: Math.max(0, Math.round((currentOutstanding - newPayment.amount) * 100) / 100)
        });
      }
    } catch {
      // Non-fatal if customer update skipped in unit mock environment
    }

    // Auto-update milestone if payment schedule exists
    this.updateScheduleOnPayment(studioId, invoice.id, newPayment);

    // Audit log
    auditService.log({
      studioId,
      entityType: 'payment',
      entityId: newPayment.id,
      action: 'PAYMENT_RECORDED',
      details: {
        receiptNumber: newPayment.receiptNumber,
        invoiceNumber: invoice.invoiceNumber,
        amount: newPayment.amount,
        method: newPayment.paymentMethod
      },
      operatorId: data.operatorId || 'system',
      operatorName: data.operatorName || 'Studio Admin'
    });

    return { payment: newPayment, invoice: updatedInvoice };
  }

  createRefund(
    studioId: string,
    data: {
      originalPaymentId: string;
      amount: number;
      reason: string;
      paymentMethod?: PaymentMethod;
      referenceNumber?: string;
      approvedById?: string;
      approvedByName?: string;
      operatorId?: string;
      operatorName?: string;
    }
  ): { refund: Refund; invoice: Invoice } {
    if (!studioId) throw new Error('[paymentService.createRefund]: studioId is required');
    if (!data.originalPaymentId) throw new Error('[paymentService.createRefund]: originalPaymentId is required');
    if (!data.amount || data.amount <= 0) throw new Error('[paymentService.createRefund]: refund amount must be greater than zero');
    if (!data.reason) throw new Error('[paymentService.createRefund]: refund reason is required');

    const payment = this.getPayment(studioId, data.originalPaymentId);
    if (!payment) throw new Error(`[paymentService.createRefund]: Payment ${data.originalPaymentId} not found`);

    const invoice = invoiceService.getInvoice(studioId, payment.invoiceId);
    if (!invoice) throw new Error(`[paymentService.createRefund]: Invoice ${payment.invoiceId} not found`);

    if (data.amount > payment.amount) {
      throw new Error(`[paymentService.createRefund]: Refund amount (₹${data.amount}) cannot exceed original payment amount (₹${payment.amount})`);
    }

    const currentPaid = invoice.paidAmount || 0;
    if (data.amount > currentPaid) {
      throw new Error(`[paymentService.createRefund]: Refund amount (₹${data.amount}) cannot exceed invoice paid amount (₹${currentPaid})`);
    }

    const refundNumber = financialSettingsService.generateDocumentNumber(studioId, 'REF');
    const newRefund: Refund = {
      id: `ref_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      studioId,
      refundNumber,
      originalPaymentId: payment.id,
      receiptNumber: payment.receiptNumber,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerId: invoice.customerId,
      customerName: invoice.customerName,
      amount: Math.round(data.amount * 100) / 100,
      refundDate: new Date().toISOString().split('T')[0],
      reason: data.reason,
      referenceNumber: data.referenceNumber || '',
      paymentMethod: data.paymentMethod || payment.paymentMethod || 'UPI',
      approvedById: data.approvedById || data.operatorId || 'system',
      approvedByName: data.approvedByName || data.operatorName || 'Studio Owner',
      status: 'Processed',
      createdAt: new Date().toISOString(),
      createdBy: data.operatorId || 'system'
    };

    RefundSchema.parse(newRefund);

    // Save refund
    const refunds = TenantStore.get<Refund>(studioId, 'refunds');
    TenantStore.set(studioId, 'refunds', [newRefund, ...refunds]);

    // Recalculate invoice
    const newPaidAmount = Math.max(0, Math.round((currentPaid - newRefund.amount) * 100) / 100);
    const newPendingAmount = Math.round((invoice.totalAmount - newPaidAmount) * 100) / 100;
    const todayStr = new Date().toISOString().split('T')[0];

    let newStatus = invoice.status;
    if (newPaidAmount === 0) {
      newStatus = (invoice.dueDate < todayStr) ? 'Overdue' : 'Issued';
    } else if (newPaidAmount < invoice.totalAmount) {
      newStatus = 'Partially Paid';
    }

    const updatedInvoice: Invoice = {
      ...invoice,
      paidAmount: newPaidAmount,
      pendingAmount: newPendingAmount,
      outstandingBalance: newPendingAmount,
      status: newStatus,
      updatedAt: new Date().toISOString()
    };

    const invoices = TenantStore.get<Invoice>(studioId, 'invoices');
    const updatedInvoices = invoices.map(i => i.id === invoice.id ? updatedInvoice : i);
    TenantStore.set(studioId, 'invoices', updatedInvoices);
    firestoreService.saveDocument(studioId, 'invoices', updatedInvoice.id, updatedInvoice).catch(() => {});

    // Update customer outstandingBalance and totalSpent
    try {
      const customer = customerService.getCustomer(studioId, invoice.customerId);
      if (customer) {
        const currentSpent = customer.totalSpent || 0;
        const currentOutstanding = customer.outstandingBalance || 0;
        customerService.updateCustomer(studioId, customer.id, {
          totalSpent: Math.max(0, Math.round((currentSpent - newRefund.amount) * 100) / 100),
          outstandingBalance: Math.round((currentOutstanding + newRefund.amount) * 100) / 100
        });
      }
    } catch {
      // Non-fatal
    }

    // Audit log
    auditService.log({
      studioId,
      entityType: 'payment',
      entityId: newRefund.id,
      action: 'REFUND_PROCESSED',
      details: {
        refundNumber: newRefund.refundNumber,
        originalReceipt: payment.receiptNumber,
        amount: newRefund.amount,
        reason: newRefund.reason
      },
      operatorId: data.operatorId || 'system',
      operatorName: data.operatorName || 'Studio Owner'
    });

    return { refund: newRefund, invoice: updatedInvoice };
  }

  listRefunds(studioId: string, filter?: { invoiceId?: string; customerId?: string }): Refund[] {
    if (!studioId) throw new Error('[paymentService.listRefunds]: studioId is required');
    let refunds = TenantStore.get<Refund>(studioId, 'refunds');
    if (filter) {
      if (filter.invoiceId) {
        refunds = refunds.filter(r => r.invoiceId === filter.invoiceId);
      }
      if (filter.customerId) {
        refunds = refunds.filter(r => r.customerId === filter.customerId);
      }
    }
    return refunds.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Payment Schedules & Milestones
  getPaymentSchedule(studioId: string, invoiceIdOrEventId: string): PaymentSchedule | null {
    if (!studioId || !invoiceIdOrEventId) return null;
    const schedules = TenantStore.get<PaymentSchedule>(studioId, 'paymentSchedules');
    return schedules.find(s => s.invoiceId === invoiceIdOrEventId || s.eventId === invoiceIdOrEventId) || null;
  }

  savePaymentSchedule(studioId: string, scheduleData: Omit<PaymentSchedule, 'id' | 'createdAt'> & { id?: string }): PaymentSchedule {
    if (!studioId) throw new Error('[paymentService.savePaymentSchedule]: studioId is required');
    const schedules = TenantStore.get<PaymentSchedule>(studioId, 'paymentSchedules');
    const existingIndex = scheduleData.id ? schedules.findIndex(s => s.id === scheduleData.id) : -1;

    const schedule: PaymentSchedule = {
      ...scheduleData,
      id: scheduleData.id || `sched_${Date.now()}`,
      studioId,
      createdAt: existingIndex >= 0 ? schedules[existingIndex].createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    PaymentScheduleSchema.parse(schedule);

    if (existingIndex >= 0) {
      schedules[existingIndex] = schedule;
      TenantStore.set(studioId, 'paymentSchedules', [...schedules]);
    } else {
      TenantStore.set(studioId, 'paymentSchedules', [schedule, ...schedules]);
    }

    return schedule;
  }

  generateDefaultSchedule(totalAmount: number, invoiceId?: string, customerId?: string, eventId?: string): PaymentSchedule {
    const advanceAmount = Math.round(totalAmount * 0.2);
    const eventDayAmount = Math.round(totalAmount * 0.5);
    const deliveryAmount = totalAmount - advanceAmount - eventDayAmount;

    const today = new Date();
    const eventDay = new Date(today);
    eventDay.setDate(eventDay.getDate() + 14);
    const deliveryDay = new Date(eventDay);
    deliveryDay.setDate(deliveryDay.getDate() + 21);

    return {
      id: `sched_${Date.now()}`,
      studioId: 'studio_royal_001',
      invoiceId,
      eventId,
      customerId: customerId || 'cust_temp',
      totalAmount,
      milestones: [
        {
          id: `ms_1_${Date.now()}`,
          title: 'Booking Advance (20%)',
          amount: advanceAmount,
          percentage: 20,
          dueDate: today.toISOString().split('T')[0],
          status: 'pending',
          paidAmount: 0
        },
        {
          id: `ms_2_${Date.now()}`,
          title: 'Event Day Payment (50%)',
          amount: eventDayAmount,
          percentage: 50,
          dueDate: eventDay.toISOString().split('T')[0],
          status: 'pending',
          paidAmount: 0
        },
        {
          id: `ms_3_${Date.now()}`,
          title: 'Final Delivery Settlement (30%)',
          amount: deliveryAmount,
          percentage: 30,
          dueDate: deliveryDay.toISOString().split('T')[0],
          status: 'pending',
          paidAmount: 0
        }
      ],
      createdAt: new Date().toISOString()
    };
  }

  private updateScheduleOnPayment(studioId: string, invoiceId: string, payment: Payment): void {
    try {
      const schedule = this.getPaymentSchedule(studioId, invoiceId);
      if (!schedule || !schedule.milestones.length) return;

      let remainingPayment = payment.amount;
      const updatedMilestones = schedule.milestones.map(m => {
        if (remainingPayment <= 0 || m.status === 'paid') return m;

        const currentPaid = m.paidAmount || 0;
        const needed = m.amount - currentPaid;

        if (remainingPayment >= needed) {
          remainingPayment -= needed;
          return {
            ...m,
            status: 'paid' as const,
            paidAmount: m.amount,
            paidAt: payment.paymentDate,
            paymentId: payment.id
          };
        } else {
          const newPaid = currentPaid + remainingPayment;
          remainingPayment = 0;
          return {
            ...m,
            paidAmount: newPaid
          };
        }
      });

      this.savePaymentSchedule(studioId, {
        ...schedule,
        milestones: updatedMilestones
      });
    } catch {
      // Non-fatal
    }
  }
}

export const paymentService = new PaymentService();
