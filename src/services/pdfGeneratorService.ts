import { financialSettingsService } from './financialSettingsService';
import { Quotation, Invoice, Payment, Refund, CreditNote, Expense, FinancialSettings } from '../types/schema';

export type PDFDocumentType =
  | 'quotation'
  | 'booking_confirmation'
  | 'invoice'
  | 'payment_receipt'
  | 'credit_note'
  | 'refund_receipt'
  | 'expense_report'
  | 'salary_slip'
  | 'payroll_summary'
  | 'customer_account_statement'
  | 'event_financial_summary'
  | 'financial_report';

export interface PDFGenerationPayload {
  documentType: PDFDocumentType;
  title: string;
  documentNumber?: string;
  date?: string;
  dueDate?: string;
  studioSettings?: Partial<FinancialSettings>;
  customer?: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    gstin?: string;
  };
  event?: {
    name: string;
    category?: string;
    date?: string;
    venue?: string;
  };
  items?: {
    name: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    taxRate?: number;
    amount: number;
  }[];
  financials?: {
    subtotal: number;
    discountAmount?: number;
    cgst?: number;
    sgst?: number;
    igst?: number;
    taxAmount?: number;
    totalAmount: number;
    paidAmount?: number;
    pendingAmount?: number;
  };
  notes?: string;
  terms?: string;
  rawPayload?: any;
}

export const PDF_ACCENT_COLORS = [
  { id: 'slate', name: 'Slate Black', hex: '#09090b' },
  { id: 'rose_gold', name: 'Rose Gold', hex: '#831843' },
  { id: 'royal_navy', name: 'Royal Navy', hex: '#1e1b4b' },
  { id: 'emerald', name: 'Emerald Green', hex: '#064e3b' },
  { id: 'amber_gold', name: 'Classic Gold / Amber', hex: '#78350f' }
];

export class PDFGeneratorService {
  generateDocumentHTML(payload: PDFGenerationPayload): string {
    const s = payload.studioSettings || {};
    const studioName = s.legalName || 'SHREEJI FILMS AND PHOTOGRAPHY';
    const studioAddr = s.businessAddress || '301, Titanium One, SG Highway, Bodakdev, Ahmedabad - 380054';
    const gstin = s.gstin ? `GSTIN: ${s.gstin}` : '';
    const pan = s.pan ? `PAN: ${s.pan}` : '';
    const accent = s.brandAccentColor || '#09090b';

    const items = payload.items || [];
    const fin = payload.financials || { subtotal: 0, totalAmount: 0 };
    const dateStr = payload.date || new Date().toISOString().split('T')[0];

    const formatINR = (val: number = 0) => '₹' + Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${payload.title} - ${payload.documentNumber || 'Doc'}</title>
        <style>
          @page {
            size: A4;
            margin: 15mm;
            @bottom-right {
              content: "Page " counter(page);
              font-size: 10px;
              color: #a1a1aa;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }
          }
          * {
            box-sizing: border-box;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          }
          body {
            margin: 0;
            padding: 24px;
            color: #18181b;
            background: #ffffff;
            font-size: 13px;
            line-height: 1.5;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid ${accent};
            padding-bottom: 16px;
            margin-bottom: 24px;
            page-break-inside: avoid;
          }
          .studio-info h1 {
            margin: 0 0 4px 0;
            font-size: 20px;
            font-weight: 700;
            letter-spacing: -0.5px;
            color: ${accent};
          }
          .studio-info p {
            margin: 2px 0;
            color: #52525b;
            font-size: 11px;
          }
          .doc-badge {
            text-align: right;
          }
          .doc-badge h2 {
            margin: 0;
            font-size: 22px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: ${accent};
          }
          .doc-badge .doc-num {
            font-size: 14px;
            font-weight: 600;
            color: #71717a;
            margin-top: 2px;
          }
          .details-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            margin-bottom: 24px;
            page-break-inside: avoid;
          }
          .card {
            background: #f8fafc;
            padding: 12px 16px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
          }
          .card h3 {
            margin: 0 0 6px 0;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #64748b;
          }
          .card p {
            margin: 2px 0;
            font-size: 12px;
          }
          .card .strong {
            font-weight: 600;
            font-size: 13px;
            color: #0f172a;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
          }
          thead {
            display: table-header-group;
          }
          tr {
            page-break-inside: avoid;
          }
          th {
            background: #f1f5f9;
            text-align: left;
            padding: 10px 12px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 2px solid #cbd5e1;
            color: #334155;
          }
          td {
            padding: 10px 12px;
            border-bottom: 1px solid #f1f5f9;
            font-size: 12px;
            vertical-align: top;
          }
          .text-right {
            text-align: right;
          }
          .text-center {
            text-align: center;
          }
          .totals-section {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 24px;
            page-break-inside: avoid;
          }
          .totals-table {
            width: 340px;
          }
          .totals-table tr td {
            padding: 5px 8px;
            border: none;
          }
          .totals-table tr.grand-total {
            font-weight: 700;
            font-size: 15px;
            border-top: 1px solid #cbd5e1;
            border-bottom: 2px solid ${accent};
            color: ${accent};
          }
          .footer-section {
            border-top: 1px solid #e2e8f0;
            padding-top: 16px;
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 24px;
            margin-top: 32px;
            page-break-inside: avoid;
          }
          .terms h4 {
            margin: 0 0 4px 0;
            font-size: 11px;
            text-transform: uppercase;
            color: #64748b;
          }
          .terms p {
            margin: 0;
            font-size: 10px;
            color: #64748b;
            white-space: pre-line;
          }
          .sign-box {
            text-align: right;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            align-items: flex-end;
          }
          .sign-line {
            width: 150px;
            border-bottom: 1.5px solid #64748b;
            margin-bottom: 6px;
          }
          .sign-label {
            font-size: 10px;
            color: #64748b;
            text-transform: uppercase;
            font-weight: 600;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none !important; }
            tr { page-break-inside: avoid; }
            thead { display: table-header-group; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="studio-info">
            <h1>${studioName}</h1>
            <p>${studioAddr}</p>
            <p>${[gstin, pan].filter(Boolean).join(' | ')}</p>
          </div>
          <div class="doc-badge">
            <h2>${payload.title}</h2>
            <div class="doc-num">${payload.documentNumber || ''}</div>
          </div>
        </div>

        <div class="details-grid">
          <div class="card">
            <h3>Billed To</h3>
            <p class="strong">${payload.customer?.name || 'Valued Customer'}</p>
            ${payload.customer?.phone ? `<p>Phone: ${payload.customer.phone}</p>` : ''}
            ${payload.customer?.email ? `<p>Email: ${payload.customer.email}</p>` : ''}
            ${payload.customer?.address ? `<p>${payload.customer.address}</p>` : ''}
            ${payload.customer?.gstin ? `<p>GSTIN: ${payload.customer.gstin}</p>` : ''}
          </div>
          <div class="card">
            <h3>Document Details</h3>
            <p><span style="color:#71717a">Date:</span> ${dateStr}</p>
            ${payload.dueDate ? `<p><span style="color:#71717a">Due Date:</span> ${payload.dueDate}</p>` : ''}
            ${payload.event?.name ? `<p><span style="color:#71717a">Event:</span> ${payload.event.name}</p>` : ''}
            ${payload.event?.date ? `<p><span style="color:#71717a">Event Date:</span> ${payload.event.date}</p>` : ''}
            ${payload.event?.venue ? `<p><span style="color:#71717a">Venue:</span> ${payload.event.venue}</p>` : ''}
          </div>
        </div>

        ${items.length > 0 ? `
          <table>
            <thead>
              <tr>
                <th style="width: 5%">#</th>
                <th style="width: 45%">Item & Description</th>
                <th style="width: 15%" class="text-center">Qty</th>
                <th style="width: 15%" class="text-right">Rate</th>
                <th style="width: 20%" class="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((it, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>
                    <strong>${it.name}</strong>
                    ${it.description ? `<div style="font-size:11px;color:#71717a;">${it.description}</div>` : ''}
                  </td>
                  <td class="text-center">${it.quantity}</td>
                  <td class="text-right">${formatINR(it.unitPrice)}</td>
                  <td class="text-right">${formatINR(it.amount)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}

        <div class="totals-section">
          <table class="totals-table">
            <tr>
              <td>Subtotal</td>
              <td class="text-right">${formatINR(fin.subtotal)}</td>
            </tr>
            ${(fin.discountAmount || 0) > 0 ? `
              <tr>
                <td>Discount</td>
                <td class="text-right" style="color:#dc2626;">-${formatINR(fin.discountAmount)}</td>
              </tr>
            ` : ''}
            ${(fin.cgst || 0) > 0 ? `
              <tr>
                <td>CGST</td>
                <td class="text-right">${formatINR(fin.cgst)}</td>
              </tr>
            ` : ''}
            ${(fin.sgst || 0) > 0 ? `
              <tr>
                <td>SGST</td>
                <td class="text-right">${formatINR(fin.sgst)}</td>
              </tr>
            ` : ''}
            ${(fin.igst || 0) > 0 ? `
              <tr>
                <td>IGST</td>
                <td class="text-right">${formatINR(fin.igst)}</td>
              </tr>
            ` : ''}
            <tr class="grand-total">
              <td>Total Amount</td>
              <td class="text-right">${formatINR(fin.totalAmount)}</td>
            </tr>
            ${fin.paidAmount !== undefined ? `
              <tr>
                <td style="color:#16a34a;font-weight:600;">Amount Paid</td>
                <td class="text-right" style="color:#16a34a;font-weight:600;">${formatINR(fin.paidAmount)}</td>
              </tr>
            ` : ''}
            ${fin.pendingAmount !== undefined ? `
              <tr>
                <td style="color:#e11d48;font-weight:600;">Balance Due</td>
                <td class="text-right" style="color:#e11d48;font-weight:600;">${formatINR(fin.pendingAmount)}</td>
              </tr>
            ` : ''}
          </table>
        </div>

        <div class="footer-section">
          <div class="terms">
            <h4>Terms & Conditions</h4>
            <p>${payload.terms || s.termsAndConditions || 'Payment is due on receipt. Thank you for your business.'}</p>
            ${payload.notes ? `<div style="margin-top:8px;"><strong>Note:</strong> ${payload.notes}</div>` : ''}
          </div>
          <div class="sign-box">
            <div class="sign-line"></div>
            <div class="sign-label">Authorized Signatory</div>
            <div style="font-size:10px;color:#a1a1aa;margin-top:2px;">${studioName}</div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Prepares printable window or popup
  printDocument(payload: PDFGenerationPayload): void {
    const html = this.generateDocumentHTML(payload);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 300);
    }
  }

  // Generate Quotation PDF payload
  createQuotationPayload(quotation: Quotation, studioSettings?: Partial<FinancialSettings>): PDFGenerationPayload {
    return {
      documentType: 'quotation',
      title: 'Quotation / Estimate',
      documentNumber: quotation.quotationNumber,
      date: quotation.createdAt.split('T')[0],
      dueDate: quotation.validUntil,
      studioSettings,
      customer: {
        name: quotation.customerName,
        phone: quotation.customerPhone,
        email: quotation.customerEmail,
        address: quotation.customerAddress
      },
      event: {
        name: quotation.eventName || 'Photography Shoot',
        category: quotation.eventCategory,
        venue: quotation.venue
      },
      items: quotation.items.map(it => ({
        name: it.title,
        description: it.description,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        taxRate: it.taxRate,
        amount: it.totalPrice
      })),
      financials: {
        subtotal: quotation.subtotal,
        discountAmount: quotation.discountAmount,
        cgst: quotation.cgst,
        sgst: quotation.sgst,
        igst: quotation.igst,
        taxAmount: quotation.taxAmount,
        totalAmount: quotation.totalAmount
      },
      notes: quotation.notes,
      terms: quotation.termsAndConditions
    };
  }

  // Generate Invoice PDF payload
  createInvoicePayload(invoice: Invoice, studioSettings?: Partial<FinancialSettings>): PDFGenerationPayload {
    return {
      documentType: 'invoice',
      title: invoice.invoiceType || 'Tax Invoice',
      documentNumber: invoice.invoiceNumber,
      date: invoice.invoiceDate || invoice.createdAt.split('T')[0],
      dueDate: invoice.dueDate,
      studioSettings,
      customer: {
        name: invoice.customerName,
        phone: invoice.customerPhone,
        email: invoice.customerEmail,
        address: invoice.customerAddress,
        gstin: invoice.customerGst
      },
      event: {
        name: invoice.eventName || 'Event Photography'
      },
      items: invoice.items.map(it => ({
        name: it.title || it.description || 'Photography Service',
        description: it.description || '',
        quantity: it.quantity,
        unitPrice: it.unitPrice || it.rate || 0,
        taxRate: it.taxRate,
        amount: it.totalPrice || it.amount || 0
      })),
      financials: {
        subtotal: invoice.subtotal,
        discountAmount: invoice.discountAmount,
        cgst: invoice.cgst,
        sgst: invoice.sgst,
        igst: invoice.igst,
        taxAmount: invoice.taxAmount,
        totalAmount: invoice.totalAmount,
        paidAmount: invoice.paidAmount,
        pendingAmount: invoice.pendingAmount
      },
      notes: invoice.notes,
      terms: invoice.termsAndConditions
    };
  }

  // Generate Payment Receipt PDF payload
  createPaymentReceiptPayload(payment: Payment, studioSettings?: FinancialSettings): PDFGenerationPayload {
    return {
      documentType: 'payment_receipt',
      title: 'Payment Receipt',
      documentNumber: payment.receiptNumber || 'REC',
      date: payment.paymentDate,
      studioSettings,
      customer: {
        name: payment.customerName || 'Valued Client'
      },
      event: {
        name: payment.eventName || `Invoice #${payment.invoiceNumber}`
      },
      items: [
        {
          name: `Payment Received for Invoice #${payment.invoiceNumber || 'INV'}`,
          description: `Method: ${payment.paymentMethod} ${payment.transactionReference ? `(Ref: ${payment.transactionReference})` : ''}`,
          quantity: 1,
          unitPrice: payment.amount,
          amount: payment.amount
        }
      ],
      financials: {
        subtotal: payment.amount,
        totalAmount: payment.amount,
        paidAmount: payment.amount,
        pendingAmount: 0
      },
      notes: `Received with thanks by ${payment.receivedByName || 'Studio Admin'}. ${payment.notes || ''}`
    };
  }

  // Generate Refund Receipt PDF payload
  createRefundReceiptPayload(refund: Refund, studioSettings?: FinancialSettings): PDFGenerationPayload {
    return {
      documentType: 'refund_receipt',
      title: 'Refund Voucher / Receipt',
      documentNumber: refund.refundNumber,
      date: refund.refundDate,
      studioSettings,
      customer: {
        name: refund.customerName || 'Customer'
      },
      items: [
        {
          name: `Refund Processed for Invoice #${refund.invoiceNumber || 'INV'}`,
          description: `Reason: ${refund.reason}. Mode: ${refund.paymentMethod}`,
          quantity: 1,
          unitPrice: refund.amount,
          amount: refund.amount
        }
      ],
      financials: {
        subtotal: refund.amount,
        totalAmount: refund.amount
      },
      notes: `Approved by: ${refund.approvedByName || 'Studio Owner'}`
    };
  }
}

export const pdfGeneratorService = new PDFGeneratorService();
