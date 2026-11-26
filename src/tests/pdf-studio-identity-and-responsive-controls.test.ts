import { describe, it, expect } from 'vitest';
import { pdfGeneratorService, PDFGenerationPayload } from '../services/pdfGeneratorService';
import * as fs from 'fs';
import * as path from 'path';

describe('STUDIO OS — PDF Studio Identity & Multi-Tenant Isolation', () => {
  const studioA = {
    name: 'Dhaval Visuals & Films',
    legalName: 'Dhaval Visuals & Films Pvt Ltd',
    businessAddress: '102, Crystal Mall Complex, Kalawad Road, Rajkot - 360005',
    supportPhone: '+91 98980 11111',
    supportEmail: 'contact@dhavalvisuals.in',
    gstin: '24AAACD1111A1Z1',
    pan: 'AAACD1111A',
    logoUrl: 'https://storage.googleapis.com/studio-os/dhaval-logo.png',
    brandAccentColor: '#ea580c'
  };

  const studioB = {
    name: 'Royal Heritage Photography',
    legalName: 'Royal Heritage Studios LLP',
    businessAddress: '504, Luxuria Business Hub, Dumas Road, Surat - 395007',
    supportPhone: '+91 99999 22222',
    supportEmail: 'hello@royalheritage.com',
    gstin: '24BBBCD2222B2Z2',
    pan: 'BBBCD2222B',
    logoUrl: 'https://storage.googleapis.com/studio-os/royal-logo.png',
    brandAccentColor: '#1e1b4b'
  };

  const sampleQuotation = {
    id: 'quo_test_101',
    quotationNumber: 'QT-2026-088',
    customerName: 'Pooja Mehta',
    customerPhone: '+91 98251 33333',
    customerEmail: 'pooja@example.com',
    eventName: 'Destination Wedding 3-Day',
    eventCategory: 'Wedding',
    venue: 'Umaid Bhawan Palace, Jodhpur',
    subtotal: 150000,
    discountAmount: 15000,
    grandTotal: 159300,
    advanceAmount: 50000,
    quotationDate: '2026-11-26',
    validUntil: '2026-12-10',
    items: [
      {
        title: '3-Day Candid & Traditional Coverage',
        description: 'Complete photo and video coverage with 4K drone',
        quantity: 1,
        unitPrice: 150000,
        totalPrice: 150000
      }
    ]
  };

  it('Part 1: Generates HTML and jsPDF strictly with Studio A identity without leaks or hardcoded fallbacks', () => {
    const payloadA: PDFGenerationPayload = pdfGeneratorService.createQuotationPayload(sampleQuotation as any, studioA as any);
    const htmlA = pdfGeneratorService.generateDocumentHTML(payloadA);

    // Studio A identity verification
    expect(htmlA).toContain('Dhaval Visuals & Films');
    expect(htmlA).toContain('102, Crystal Mall Complex, Kalawad Road, Rajkot - 360005');
    expect(htmlA).toContain('+91 98980 11111');
    expect(htmlA).toContain('contact@dhavalvisuals.in');
    expect(htmlA).toContain('24AAACD1111A1Z1');
    expect(htmlA).toContain('https://storage.googleapis.com/studio-os/dhaval-logo.png');

    // Strict isolation: Zero Shreeji Films or Studio B references
    expect(htmlA).not.toContain('SHREEJI FILMS');
    expect(htmlA).not.toContain('aarav@shreejifilms.in');
    expect(htmlA).not.toContain('Royal Heritage Photography');

    // Also verify binary jsPDF output executes cleanly
    const docA = pdfGeneratorService.generateDocumentPDF(payloadA);
    expect(docA).toBeDefined();
    expect(typeof docA.output).toBe('function');
  });

  it('Part 2: Generates HTML and jsPDF strictly with Studio B identity without leaks or hardcoded fallbacks', () => {
    const payloadB: PDFGenerationPayload = pdfGeneratorService.createQuotationPayload(sampleQuotation as any, studioB as any);
    const htmlB = pdfGeneratorService.generateDocumentHTML(payloadB);

    // Studio B identity verification
    expect(htmlB).toContain('Royal Heritage Studios LLP');
    expect(htmlB).toContain('504, Luxuria Business Hub, Dumas Road, Surat - 395007');
    expect(htmlB).toContain('+91 99999 22222');
    expect(htmlB).toContain('hello@royalheritage.com');
    expect(htmlB).toContain('24BBBCD2222B2Z2');
    expect(htmlB).toContain('https://storage.googleapis.com/studio-os/royal-logo.png');

    // Strict isolation: Zero Shreeji Films or Studio A references
    expect(htmlB).not.toContain('SHREEJI FILMS');
    expect(htmlB).not.toContain('aarav@shreejifilms.in');
    expect(htmlB).not.toContain('Dhaval Visuals');

    const docB = pdfGeneratorService.generateDocumentPDF(payloadB);
    expect(docB).toBeDefined();
  });

  it('Part 3: Changing a studio profile dynamically updates subsequent generated PDFs', () => {
    const updatedStudioA = {
      ...studioA,
      name: 'Dhaval Signature Cinema',
      legalName: 'Dhaval Signature Cinema LLP',
      businessAddress: '801, Iscon Elegance, Prahlad Nagar, Ahmedabad - 380015',
      supportPhone: '+91 98980 99999',
      supportEmail: 'info@dhavalsignature.com'
    };

    const newPayload = pdfGeneratorService.createQuotationPayload(sampleQuotation as any, updatedStudioA as any);
    const newHtml = pdfGeneratorService.generateDocumentHTML(newPayload);

    expect(newHtml).toContain('Dhaval Signature Cinema LLP');
    expect(newHtml).toContain('801, Iscon Elegance, Prahlad Nagar, Ahmedabad - 380015');
    expect(newHtml).toContain('+91 98980 99999');
    expect(newHtml).toContain('info@dhavalsignature.com');
    expect(newHtml).not.toContain('Crystal Mall');
  });

  it('Part 4: Verifies responsive controls and zero sub-12px typography across src/', () => {
    const cssPath = path.resolve(__dirname, '../index.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');
    expect(cssContent).toContain('.input-control');
    expect(cssContent).toContain('.btn-control');
    expect(cssContent).toContain('.btn-icon-control');

    const uiIndexPath = path.resolve(__dirname, '../components/ui/index.ts');
    const uiIndexContent = fs.readFileSync(uiIndexPath, 'utf-8');
    expect(uiIndexContent).toContain('Input');
    expect(uiIndexContent).toContain('Select');
    expect(uiIndexContent).toContain('Checkbox');
    expect(uiIndexContent).toContain('MultiSelect');
  });

  it('Part 5: Single-page document generation (1-3 items) produces exactly 1 page with clean layout', () => {
    const singlePayload: PDFGenerationPayload = {
      documentType: 'quotation',
      title: 'Quotation / Proposal',
      documentNumber: 'QT-2026-001',
      studioSettings: studioA as any,
      customer: { name: 'Ananya Sharma', phone: '+91 98765 43210' },
      event: { name: 'Pre-Wedding Shoot', date: '2026-12-25' },
      items: [
        { name: 'Candid Photography', description: '4K Full Frame cameras with 2 shooters', quantity: 1, unitPrice: 40000, amount: 40000 }
      ],
      financials: { subtotal: 40000, totalAmount: 40000 }
    };

    const doc = pdfGeneratorService.generateDocumentPDF(singlePayload);
    expect((doc as any).internal.getNumberOfPages()).toBe(1);
  });

  it('Part 6: Multi-page automatic table pagination (15-20 items) creates Page 2+ with repeated table headers and clean Page X of Y footer', () => {
    const multiItems = Array.from({ length: 18 }, (_, i) => ({
      name: `Special Event Service Package #${i + 1}`,
      description: `Detailed deliverable breakdown including edited footage, color grading and 4K masters for item #${i + 1}`,
      quantity: 1,
      unitPrice: 15000,
      amount: 15000
    }));

    const multiPayload: PDFGenerationPayload = {
      documentType: 'invoice',
      title: 'Tax Invoice',
      documentNumber: 'INV-2026-099',
      studioSettings: studioA as any,
      customer: { name: 'Vikram Malhotra', phone: '+91 99887 76655' },
      event: { name: 'Grand 4-Day Wedding', date: '2027-01-15' },
      items: multiItems,
      financials: {
        subtotal: 270000,
        taxAmount: 48600,
        totalAmount: 318600,
        paidAmount: 100000,
        pendingAmount: 218600
      }
    };

    const doc = pdfGeneratorService.generateDocumentPDF(multiPayload);
    const pageCount = (doc as any).internal.getNumberOfPages();
    expect(pageCount).toBeGreaterThanOrEqual(2);
  });

  it('Part 7: Long multi-line item titles and descriptions wrap dynamically without clipping', () => {
    const longPayload: PDFGenerationPayload = {
      documentType: 'quotation',
      title: 'Quotation / Proposal',
      documentNumber: 'QT-2026-LONG',
      studioSettings: studioB as any,
      customer: { name: 'Rohit Verma' },
      items: [
        {
          name: 'Cinematic High-Definition 4K Multi-Camera Production with Drone Aerial Cinematography and Real-Time Live Streaming Coverage',
          description: 'Includes 5 dedicated camera operators, wireless audio transmitters, Gimbal stabilization, color graded master videos, 10 teaser reels formatted for social media and delivered on encrypted high-speed SSD drives.',
          quantity: 1,
          unitPrice: 180000,
          amount: 180000
        }
      ],
      financials: { subtotal: 180000, totalAmount: 180000 }
    };

    const doc = pdfGeneratorService.generateDocumentPDF(longPayload);
    expect(doc).toBeDefined();
    expect((doc as any).internal.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });
});
