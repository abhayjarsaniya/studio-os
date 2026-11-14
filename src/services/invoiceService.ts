import { Invoice, InvoiceSchema, InvoiceStatus, InvoiceType } from '../types/schema';
import { TenantStore } from './tenantStore';
import { auditService } from './auditService';
import { financialSettingsService } from './financialSettingsService';
import { customerService } from './customerService';

export interface InvoiceFilterOptions {
  customerId?: string;
  eventId?: string;
  status?: InvoiceStatus;
  type?: InvoiceType;
  startDate?: string;
  endDate?: string;
  isOverdue?: boolean;
}

export class InvoiceService {
  listInvoices(studioId: string, filter?: InvoiceFilterOptions): Invoice[] {
    if (!studioId) throw new Error('[invoiceService.listInvoices]: studioId is required');
    let all = TenantStore.get<Invoice>(studioId, 'invoices');
    const todayStr = new Date().toISOString().split('T')[0];

    // Ensure status is dynamically derived for issued invoices
    all = all.map(inv => this.recalculateStatus(inv, todayStr));

    if (filter) {
      if (filter.customerId) {
        all = all.filter(i => i.customerId === filter.customerId);
      }
      if (filter.eventId) {
        all = all.filter(i => i.eventId === filter.eventId);
      }
      if (filter.status) {
        all = all.filter(i => i.status.toLowerCase() === filter.status!.toLowerCase());
      }
      if (filter.type) {
        all = all.filter(i => i.invoiceType === filter.type);
      }
      if (filter.startDate) {
        all = all.filter(i => (i.invoiceDate || i.createdAt) >= filter.startDate!);
      }
      if (filter.endDate) {
        all = all.filter(i => (i.invoiceDate || i.createdAt) <= filter.endDate!);
      }
      if (filter.isOverdue) {
        all = all.filter(i => i.dueDate < todayStr && (i.status === 'Issued' || i.status === 'Partially Paid' || i.status === 'Overdue'));
      }
    }

    return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getInvoice(studioId: string, invoiceId: string): Invoice | undefined {
    if (!studioId) throw new Error('[invoiceService.getInvoice]: studioId is required');
    return this.listInvoices(studioId).find(i => i.id === invoiceId);
  }

  /**
   * Status derivation rule based on actual payment data and due date
   */
  recalculateStatus(inv: Invoice, todayStr: string): Invoice {
    if (inv.status === 'Cancelled' || inv.status === 'cancelled') {
      return inv;
    }
    if (inv.status === 'Refunded') {
      return inv;
    }
    if (inv.status === 'Draft' || inv.status === 'draft') {
      return inv;
    }

    const paid = inv.paidAmount || 0;
    const total = inv.totalAmount || 0;

    if (paid >= total && total > 0) {
      return { ...inv, status: 'Paid', outstandingBalance: 0, pendingAmount: 0 };
    }
    if (paid > 0 && paid < total) {
      const balance = total - paid;
      const isOverdue = inv.dueDate < todayStr;
      return { ...inv, status: isOverdue ? 'Overdue' : 'Partially Paid', outstandingBalance: balance, pendingAmount: balance };
    }
    if (inv.dueDate < todayStr) {
      return { ...inv, status: 'Overdue', outstandingBalance: total, pendingAmount: total };
    }

    return { ...inv, status: 'Issued', outstandingBalance: total - paid, pendingAmount: total - paid };
  }

  createInvoice(
    studioId: string,
    data: {
      invoiceType?: InvoiceType;
      invoiceNumber?: string;
      customerId: string;
      customerName: string;
      customerPhone?: string;
      customerEmail?: string;
      customerAddress?: string;
      customerGst?: string;
      eventId?: string;
      eventName?: string;
      relatedQuotationId?: string;
      items: Array<{
        description: string;
        quantity: number;
        unitPrice?: number;
        rate?: number;
        discount?: number;
        taxRate?: number;
        taxAmount?: number;
        amount: number;
      }>;
      subtotal?: number;
      taxAmount?: number;
      discountAmount?: number;
      cgst?: number;
      sgst?: number;
      igst?: number;
      totalAmount?: number;
      paidAmount?: number;
      pendingAmount?: number;
      outstandingBalance?: number;
      invoiceDate?: string;
      dueDate?: string;
      status?: InvoiceStatus;
      paymentTerms?: string;
      notes?: string;
      termsAndConditions?: string;
      isIssued?: boolean;
      issuedAt?: string;
      pdfUrl?: string;
      createdBy?: string;
    },
    operatorId: string = 'system'
  ): Invoice {
    if (!studioId) throw new Error('[invoiceService.createInvoice]: studioId is required');
    if (!data.customerId) throw new Error('Customer ID is required');
    if (!data.items || data.items.length === 0) throw new Error('Invoice must contain at least one line item');

    const invoices = TenantStore.get<Invoice>(studioId, 'invoices');
    const isIssued = data.isIssued !== false && data.status !== 'Draft' && data.status !== 'draft';
    const invoiceNumber = data.invoiceNumber || financialSettingsService.generateDocumentNumber(studioId, 'INV');

    // Recalculate item amounts and totals
    const subtotal = data.items.reduce((sum, item) => sum + (item.quantity * (item.unitPrice || item.rate || 0)), 0);
    const discountAmount = data.discountAmount || 0;
    const taxCalc = financialSettingsService.calculateTaxes(subtotal, discountAmount, 18);

    const totalAmount = data.totalAmount !== undefined ? data.totalAmount : taxCalc.grandTotal;
    const paidAmount = data.paidAmount || 0;
    const pendingAmount = Math.max(0, totalAmount - paidAmount);
    const todayStr = new Date().toISOString().split('T')[0];

    const initialStatus: InvoiceStatus = !isIssued
      ? 'Draft'
      : (paidAmount >= totalAmount && totalAmount > 0)
      ? 'Paid'
      : (paidAmount > 0)
      ? 'Partially Paid'
      : (data.dueDate < todayStr)
      ? 'Overdue'
      : 'Issued';

    const mappedItems: any[] = data.items.map((it, idx) => ({
      id: (it as any).id || `inv_item_${idx + 1}`,
      title: (it as any).title || it.description,
      description: it.description,
      quantity: it.quantity,
      unitPrice: it.unitPrice || it.rate || 0,
      rate: it.rate || it.unitPrice || 0,
      discount: it.discount || 0,
      taxRate: it.taxRate || 18,
      taxAmount: it.taxAmount || 0,
      amount: it.amount || 0,
      totalPrice: it.amount || 0
    }));

    const newInvoice: Invoice = {
      ...data,
      items: mappedItems,
      id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      studioId,
      invoiceNumber,
      invoiceType: data.invoiceType || 'Booking Invoice',
      subtotal,
      discountAmount,
      taxAmount: taxCalc.totalTax,
      cgst: taxCalc.cgstAmount,
      sgst: taxCalc.sgstAmount,
      igst: taxCalc.igstAmount,
      totalAmount,
      paidAmount,
      pendingAmount,
      outstandingBalance: pendingAmount,
      invoiceDate: data.invoiceDate || todayStr,
      dueDate: data.dueDate || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      status: initialStatus,
      paymentTerms: data.paymentTerms || 'Due on Receipt',
      isIssued,
      issuedAt: isIssued ? (data.issuedAt || new Date().toISOString()) : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: data.createdBy || operatorId
    };

    InvoiceSchema.parse(newInvoice);
    TenantStore.set(studioId, 'invoices', [newInvoice, ...invoices]);

    // Update customer pending balance
    if (isIssued && pendingAmount > 0) {
      const cust = customerService.getCustomer(studioId, data.customerId);
      if (cust) {
        customerService.updateCustomer(studioId, data.customerId, {
          pendingBalance: (cust.pendingBalance || 0) + pendingAmount,
          totalBookings: (cust.totalBookings || 0) + 1
        }, operatorId);
      }
    }

    auditService.log(
      studioId,
      operatorId,
      'CREATE_INVOICE',
      'invoice',
      newInvoice.id,
      { invoiceNumber, customerName: newInvoice.customerName, totalAmount, status: newInvoice.status }
    );

    return newInvoice;
  }

  issueInvoice(studioId: string, invoiceId: string, operatorId: string = 'system'): Invoice {
    const inv = this.getInvoice(studioId, invoiceId);
    if (!inv) throw new Error(`Invoice ${invoiceId} not found`);
    if (inv.isIssued && inv.status !== 'Draft' && inv.status !== 'draft') {
      return inv;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const updatedStatus: InvoiceStatus = (inv.paidAmount || 0) >= inv.totalAmount
      ? 'Paid'
      : (inv.paidAmount || 0) > 0
      ? 'Partially Paid'
      : inv.dueDate < todayStr
      ? 'Overdue'
      : 'Issued';

    const updated: Invoice = {
      ...inv,
      isIssued: true,
      issuedAt: new Date().toISOString(),
      status: updatedStatus,
      updatedAt: new Date().toISOString()
    };

    InvoiceSchema.parse(updated);
    const invoices = TenantStore.get<Invoice>(studioId, 'invoices');
    const index = invoices.findIndex(i => i.id === invoiceId);
    invoices[index] = updated;
    TenantStore.set(studioId, 'invoices', invoices);

    auditService.log(
      studioId,
      operatorId,
      'ISSUE_INVOICE',
      'invoice',
      invoiceId,
      { invoiceNumber: inv.invoiceNumber, totalAmount: inv.totalAmount }
    );

    return updated;
  }

  updateDraftInvoice(
    studioId: string,
    invoiceId: string,
    updates: Partial<Invoice>,
    operatorId: string = 'system'
  ): Invoice {
    const inv = this.getInvoice(studioId, invoiceId);
    if (!inv) throw new Error(`Invoice ${invoiceId} not found`);
    if (inv.isIssued && inv.status !== 'Draft' && inv.status !== 'draft') {
      throw new Error(`Issued invoice "${inv.invoiceNumber}" cannot be silently edited. Use credit note or controlled cancellation.`);
    }

    const updated: Invoice = {
      ...inv,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    InvoiceSchema.parse(updated);
    const invoices = TenantStore.get<Invoice>(studioId, 'invoices');
    const index = invoices.findIndex(i => i.id === invoiceId);
    invoices[index] = updated;
    TenantStore.set(studioId, 'invoices', invoices);

    auditService.log(
      studioId,
      operatorId,
      'UPDATE_DRAFT_INVOICE',
      'invoice',
      invoiceId,
      { invoiceNumber: inv.invoiceNumber, updatedFields: Object.keys(updates) }
    );

    return updated;
  }

  cancelInvoice(
    studioId: string,
    invoiceId: string,
    reason: string,
    operatorId: string = 'system',
    operatorName: string = 'Studio Admin'
  ): Invoice {
    if (!studioId) throw new Error('[invoiceService.cancelInvoice]: studioId is required');
    if (!reason || !reason.trim()) throw new Error('Cancellation reason is required.');

    const inv = this.getInvoice(studioId, invoiceId);
    if (!inv) throw new Error(`Invoice ${invoiceId} not found`);
    if (inv.status === 'Cancelled' || inv.status === 'cancelled') {
      throw new Error('Invoice is already cancelled.');
    }

    const now = new Date().toISOString();
    const updated: Invoice = {
      ...inv,
      status: 'Cancelled',
      cancelReason: reason.trim(),
      cancelledAt: now,
      cancelledBy: operatorName,
      outstandingBalance: 0,
      pendingAmount: 0,
      updatedAt: now
    };

    InvoiceSchema.parse(updated);
    const invoices = TenantStore.get<Invoice>(studioId, 'invoices');
    const index = invoices.findIndex(i => i.id === invoiceId);
    invoices[index] = updated;
    TenantStore.set(studioId, 'invoices', invoices);

    // Adjust customer pending balance
    if (inv.pendingAmount && inv.pendingAmount > 0) {
      const cust = customerService.getCustomer(studioId, inv.customerId);
      if (cust) {
        customerService.updateCustomer(studioId, inv.customerId, {
          pendingBalance: Math.max(0, (cust.pendingBalance || 0) - inv.pendingAmount)
        }, operatorId);
      }
    }

    auditService.log(
      studioId,
      operatorId,
      'CANCEL_INVOICE',
      'invoice',
      invoiceId,
      { invoiceNumber: inv.invoiceNumber, reason, cancelledBy: operatorName }
    );

    return updated;
  }

  duplicateInvoice(studioId: string, invoiceId: string, operatorId: string = 'system'): Invoice {
    const inv = this.getInvoice(studioId, invoiceId);
    if (!inv) throw new Error(`Invoice ${invoiceId} not found`);

    const { id: _i, invoiceNumber: _n, createdAt: _c, updatedAt: _u, ...rest } = inv;
    return this.createInvoice(studioId, {
      ...rest,
      status: 'Draft',
      isIssued: false,
      paidAmount: 0,
      pendingAmount: rest.totalAmount,
      outstandingBalance: rest.totalAmount
    }, operatorId);
  }
}

export const invoiceService = new InvoiceService();
