import { jsPDF } from 'jspdf';
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
  studioSettings?: Partial<FinancialSettings> & {
    supportPhone?: string;
    supportEmail?: string;
  };
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
    const studioName = s.legalName || (s as any).name || 'Studio OS';
    const studioAddr = s.businessAddress || [(s as any).address, (s as any).city, (s as any).state, (s as any).pincode].filter(Boolean).join(', ') || '';
    const studioPhone = s.supportPhone || (s as any).phone || '';
    const studioEmail = s.supportEmail || (s as any).email || '';
    const gstin = s.gstin ? `GSTIN: ${s.gstin}` : '';
    const pan = s.pan ? `PAN: ${s.pan}` : '';
    const accent = s.brandAccentColor || '#09090b';
    const logoUrl = (s as any).logoUrl || (s as any).logo || '';

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
            ${logoUrl ? `<img src="${logoUrl}" alt="${studioName}" style="max-height: 48px; max-width: 180px; object-fit: contain; margin-bottom: 8px; display: block;" />` : ''}
            <h1>${studioName}</h1>
            ${studioAddr ? `<p>${studioAddr}</p>` : ''}
            ${[studioPhone, studioEmail].filter(Boolean).length > 0 ? `<p>${[studioPhone, studioEmail].filter(Boolean).join(' | ')}</p>` : ''}
            ${[gstin, pan].filter(Boolean).length > 0 ? `<p>${[gstin, pan].filter(Boolean).join(' | ')}</p>` : ''}
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

  // Format currency in Indian comma numbering
  formatCurrency(amount: number): string {
    const num = Math.round(amount || 0);
    return num.toLocaleString('en-IN');
  }

  // Generate genuine binary PDF document via jsPDF
  generateDocumentPDF(payload: PDFGenerationPayload): jsPDF {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const s = payload.studioSettings || {};
    const studioName = s.legalName || (s as any).name || 'Studio OS';
    const studioAddr = s.businessAddress || [(s as any).address, (s as any).city, (s as any).state, (s as any).pincode].filter(Boolean).join(', ') || '';
    const studioPhone = s.supportPhone || (s as any).phone || '';
    const studioEmail = s.supportEmail || (s as any).email || '';
    const gstin = s.gstin ? `GSTIN: ${s.gstin}` : '';
    const pan = s.pan ? `PAN: ${s.pan}` : '';
    const docTitle = (payload.title || 'QUOTATION / PROPOSAL').toUpperCase();
    const docNum = payload.documentNumber || 'QT-2026-001';
    const docDate = payload.date || new Date().toISOString().split('T')[0];
    const dueDate = payload.dueDate || '';

    let y = 18;
    const leftMargin = 15;
    const pageWidth = 210;
    const rightMargin = 15;
    const contentWidth = pageWidth - leftMargin - rightMargin; // 180mm

    // 1. Studio Header (Left)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(24, 24, 27); // zinc-900
    doc.text(studioName, leftMargin, y);

    // Document Title & Number Badge (Right)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(249, 115, 22); // Orange / Amber
    doc.text(docTitle, pageWidth - rightMargin, y, { align: 'right' });

    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(113, 113, 122); // zinc-500
    doc.text(`Doc #: ${docNum}`, pageWidth - rightMargin, y, { align: 'right' });

    y += 4;
    doc.text(`Date: ${docDate}`, pageWidth - rightMargin, y, { align: 'right' });
    if (dueDate) {
      y += 4;
      doc.text(`Valid Until: ${dueDate}`, pageWidth - rightMargin, y, { align: 'right' });
    }

    // Studio details on left
    let studioInfoY = 24;
    doc.setFontSize(8);
    doc.setTextColor(82, 82, 91); // zinc-600
    if (studioAddr) {
      const splitAddr = doc.splitTextToSize(studioAddr, 100);
      doc.text(splitAddr, leftMargin, studioInfoY);
      studioInfoY += splitAddr.length * 3.5;
    }
    const contactLine = [studioPhone, studioEmail].filter(Boolean).join(' | ');
    if (contactLine) {
      doc.text(contactLine, leftMargin, studioInfoY);
      studioInfoY += 3.5;
    }
    const taxLine = [gstin, pan].filter(Boolean).join('  ');
    if (taxLine) {
      doc.text(taxLine, leftMargin, studioInfoY);
      studioInfoY += 3.5;
    }

    y = Math.max(y + 6, studioInfoY + 4);

    // Decorative Separator Line
    doc.setDrawColor(249, 115, 22); // Orange accent
    doc.setLineWidth(0.8);
    doc.line(leftMargin, y, pageWidth - rightMargin, y);
    y += 6;

    // 2. Client & Event Info Box (Two column card)
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(228, 228, 231); // zinc-200
    doc.setLineWidth(0.3);
    const infoBoxHeight = 30;
    doc.roundedRect(leftMargin, y, contentWidth, infoBoxHeight, 2, 2, 'FD');

    // Left Column: PREPARED FOR
    const col1X = leftMargin + 4;
    let col1Y = y + 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(161, 161, 170); // zinc-400
    doc.text('CLIENT DETAILS', col1X, col1Y);
    col1Y += 4.5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(24, 24, 27);
    doc.text(payload.customer?.name || 'Valued Client', col1X, col1Y);
    col1Y += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(82, 82, 91);
    if (payload.customer?.phone) {
      doc.text(`Phone: ${payload.customer.phone}`, col1X, col1Y);
      col1Y += 3.5;
    }
    if (payload.customer?.email) {
      doc.text(`Email: ${payload.customer.email}`, col1X, col1Y);
      col1Y += 3.5;
    }
    if (payload.customer?.address) {
      const splitCustAddr = doc.splitTextToSize(payload.customer.address, 80);
      doc.text(splitCustAddr[0], col1X, col1Y);
    }

    // Right Column: EVENT DETAILS
    const col2X = leftMargin + (contentWidth / 2) + 4;
    let col2Y = y + 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(161, 161, 170);
    doc.text('EVENT INFORMATION', col2X, col2Y);
    col2Y += 4.5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(24, 24, 27);
    doc.text(payload.event?.name || 'Wedding Photography', col2X, col2Y);
    col2Y += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(82, 82, 91);
    if (payload.event?.category) {
      doc.text(`Category: ${payload.event.category}`, col2X, col2Y);
      col2Y += 3.5;
    }
    if (payload.event?.date) {
      doc.text(`Event Date: ${payload.event.date}`, col2X, col2Y);
      col2Y += 3.5;
    }
    if (payload.event?.venue) {
      const splitVenue = doc.splitTextToSize(`Venue: ${payload.event.venue}`, 80);
      doc.text(splitVenue[0], col2X, col2Y);
    }

    y += infoBoxHeight + 6;

    // 3. Table Header
    const drawTableHeader = (currentY: number) => {
      doc.setFillColor(24, 24, 27); // zinc-900
      doc.rect(leftMargin, currentY, contentWidth, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text('#', leftMargin + 3, currentY + 4.8);
      doc.text('SERVICE / DELIVERABLE', leftMargin + 12, currentY + 4.8);
      doc.text('QTY', leftMargin + 110, currentY + 4.8, { align: 'center' });
      doc.text('RATE (INR)', leftMargin + 145, currentY + 4.8, { align: 'right' });
      doc.text('AMOUNT (INR)', leftMargin + contentWidth - 4, currentY + 4.8, { align: 'right' });
      return currentY + 7;
    };

    y = drawTableHeader(y);

    // 4. Item Rows
    const items = payload.items || [];
    items.forEach((item, index) => {
      // Calculate row height based on description wrapping
      const descLines = item.description ? doc.splitTextToSize(item.description, 92) : [];
      const rowHeight = Math.max(8, 5 + descLines.length * 3.5);

      // Check for page overflow
      if (y + rowHeight > 270) {
        doc.addPage();
        y = 20;
        y = drawTableHeader(y);
      }

      // Alternating row background
      if (index % 2 === 1) {
        doc.setFillColor(250, 250, 250);
        doc.rect(leftMargin, y, contentWidth, rowHeight, 'F');
      }

      // Bottom border for row
      doc.setDrawColor(244, 244, 245);
      doc.setLineWidth(0.2);
      doc.line(leftMargin, y + rowHeight, leftMargin + contentWidth, y + rowHeight);

      // Row content
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(82, 82, 91);
      doc.text(`${index + 1}`, leftMargin + 3, y + 4.5);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(24, 24, 27);
      doc.text(item.name, leftMargin + 12, y + 4.5);

      if (descLines.length > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(113, 113, 122);
        doc.text(descLines, leftMargin + 12, y + 8);
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(24, 24, 27);
      doc.text(`${item.quantity}`, leftMargin + 110, y + 4.5, { align: 'center' });
      doc.text(`Rs. ${this.formatCurrency(item.unitPrice)}`, leftMargin + 145, y + 4.5, { align: 'right' });

      doc.setFont('helvetica', 'bold');
      doc.text(`Rs. ${this.formatCurrency(item.amount)}`, leftMargin + contentWidth - 4, y + 4.5, { align: 'right' });

      y += rowHeight;
    });

    y += 4;

    // Check if summary box fits on page, else add page
    if (y + 55 > 270) {
      doc.addPage();
      y = 20;
    }

    // 5. Summary / Financial Totals (Right side)
    const summaryWidth = 85;
    const summaryX = leftMargin + contentWidth - summaryWidth;
    const fin = payload.financials || { subtotal: 0, totalAmount: 0 };

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(82, 82, 91);

    // Subtotal
    doc.text('Subtotal:', summaryX + 4, y + 4);
    doc.text(`Rs. ${this.formatCurrency(fin.subtotal)}`, leftMargin + contentWidth - 4, y + 4, { align: 'right' });
    y += 5.5;

    // Discount if any
    if (fin.discountAmount && fin.discountAmount > 0) {
      doc.setTextColor(225, 29, 72); // rose-600
      doc.text('Discount / Concession:', summaryX + 4, y + 4);
      doc.text(`- Rs. ${this.formatCurrency(fin.discountAmount)}`, leftMargin + contentWidth - 4, y + 4, { align: 'right' });
      y += 5.5;
    }

    // Tax / GST if applicable
    if (fin.taxAmount && fin.taxAmount > 0) {
      doc.setTextColor(82, 82, 91);
      doc.text('GST / Tax (18%):', summaryX + 4, y + 4);
      doc.text(`Rs. ${this.formatCurrency(fin.taxAmount)}`, leftMargin + contentWidth - 4, y + 4, { align: 'right' });
      y += 5.5;
    }

    // Total Box
    y += 2;
    doc.setFillColor(24, 24, 27); // zinc-900
    doc.roundedRect(summaryX, y, summaryWidth, 9, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text('TOTAL INVESTMENT:', summaryX + 4, y + 6);
    doc.text(`Rs. ${this.formatCurrency(fin.totalAmount)}`, leftMargin + contentWidth - 4, y + 6, { align: 'right' });

    y += 13;

    // 6. Terms and Payment Notes (Left Box)
    const terms = payload.terms || '1. 25% advance to confirm booking.\n2. Balance payable upon delivery handover.\n3. Turnaround time: 3-4 weeks for edited deliverables.';
    const termsLines = doc.splitTextToSize(terms, contentWidth);

    if (y + (termsLines.length * 3.5) + 20 > 275) {
      doc.addPage();
      y = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(24, 24, 27);
    doc.text('TERMS & CONDITIONS', leftMargin, y);
    y += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(113, 113, 122);
    doc.text(termsLines, leftMargin, y);
    y += (termsLines.length * 3.5) + 8;

    // Signatory
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(82, 82, 91);
    doc.text('Authorized Signatory', pageWidth - rightMargin - 40, y);
    doc.setDrawColor(200, 200, 200);
    doc.line(pageWidth - rightMargin - 45, y + 6, pageWidth - rightMargin, y + 6);

    // 7. Footer on all pages
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(161, 161, 170);
      doc.text(
        `Generated by Studio OS — Photography Studio Management System | Page ${i} of ${pageCount}`,
        pageWidth / 2,
        290,
        { align: 'center' }
      );
    }

    return doc;
  }

  // Trigger browser download of genuine PDF
  downloadPDF(payload: PDFGenerationPayload, filename?: string): void {
    const doc = this.generateDocumentPDF(payload);
    const cleanDocNum = payload.documentNumber || 'DOC';
    const cleanFilename = filename || (
      payload.documentType === 'quotation'
        ? `Quotation_${cleanDocNum}.pdf`
        : `${payload.title.replace(/\s+/g, '_')}_${cleanDocNum}.pdf`
    );

    if (typeof window !== 'undefined') {
      doc.save(cleanFilename);
    }
  }

  // Alias for downloadPDF
  downloadDocumentPDF(payload: PDFGenerationPayload, filename?: string): void {
    this.downloadPDF(payload, filename);
  }

  // Output as standard Blob
  getPDFBlob(payload: PDFGenerationPayload): Blob {
    const doc = this.generateDocumentPDF(payload);
    return doc.output('blob');
  }

  // Generate Quotation PDF payload
  createQuotationPayload(
    quotation: Quotation, 
    studioSettings?: Partial<FinancialSettings> & { 
      name?: string; 
      address?: string; 
      city?: string; 
      pincode?: string;
      supportPhone?: string; 
      supportEmail?: string; 
      [key: string]: any;
    }
  ): PDFGenerationPayload {
    const resolvedSettings: any = studioSettings ? {
      ...studioSettings,
      name: (studioSettings as any).name || studioSettings.legalName || 'Studio OS',
      legalName: studioSettings.legalName || (studioSettings as any).name || 'Studio OS',
      businessAddress: studioSettings.businessAddress || (studioSettings as any).address || ''
    } : undefined;
    return {
      documentType: 'quotation',
      title: 'Quotation / Estimate',
      documentNumber: quotation.quotationNumber,
      date: quotation.quotationDate || (quotation.createdAt ? quotation.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]),
      dueDate: quotation.validUntil || quotation.expiryDate,
      studioSettings: resolvedSettings,
      customer: {
        name: quotation.customerName,
        phone: quotation.customerPhone,
        email: quotation.customerEmail,
        address: quotation.customerAddress
      },
      event: {
        name: quotation.eventName || 'Photography Shoot',
        category: quotation.eventCategory,
        venue: quotation.venue || quotation.eventVenue
      },
      items: quotation.items.map(it => ({
        name: it.title || it.description,
        description: it.description,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        taxRate: it.taxRate,
        amount: it.totalPrice ?? it.amount ?? (it.quantity * it.unitPrice)
      })),
      financials: {
        subtotal: quotation.subtotal,
        discountAmount: quotation.discountAmount ?? quotation.discount ?? 0,
        cgst: quotation.cgst || 0,
        sgst: quotation.sgst || 0,
        igst: quotation.igst || 0,
        taxAmount: quotation.taxAmount || 0,
        totalAmount: quotation.grandTotal ?? quotation.totalAmount ?? quotation.subtotal
      },
      notes: quotation.notes || quotation.additionalNotes,
      terms: quotation.termsAndConditions || quotation.paymentTerms
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
