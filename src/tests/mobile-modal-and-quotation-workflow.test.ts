import { describe, it, expect } from 'vitest';
import { quotationService } from '../services/quotationService';
import { QuotationStatusEnum, Quotation } from '../types/schema';
import * as fs from 'fs';
import * as path from 'path';

describe('Studio OS - Mobile Modal, Quotation Lifecycle & Poppins Typography', () => {
  const testStudioId = 'test_studio_mobile_audit_001';

  it('Part 1: QuotationStatusEnum must include "Saved" status', () => {
    const parseResult = QuotationStatusEnum.safeParse('Saved');
    expect(parseResult.success).toBe(true);
    expect(parseResult.data).toBe('Saved');

    // Also verify all mandatory lifecycle statuses are supported
    const mandatoryStatuses = ['Draft', 'Saved', 'Sent', 'Accepted', 'Rejected', 'Converted to Booking'];
    mandatoryStatuses.forEach(st => {
      expect(QuotationStatusEnum.safeParse(st).success).toBe(true);
    });
  });

  it('Part 2: Quotation Service can create with "Saved" status and update without duplicates', () => {
    // 1. Create a Saved quotation
    const createdQuote = quotationService.createQuotation(testStudioId, {
      customerId: 'cust_001',
      customerName: 'Ananya Sharma',
      customerPhone: '+91 98765 43210',
      eventName: 'Grand Reception',
      eventCategory: 'Reception',
      eventDate: '2026-12-15',
      eventVenue: 'Taj Mahal Palace',
      venue: 'Taj Mahal Palace',
      quotationDate: '2026-11-26',
      expiryDate: '2026-12-05',
      validUntil: '2026-12-05',
      items: [
        {
          description: 'Traditional Photography & 4K Cinematography',
          quantity: 1,
          unitPrice: 75000
        }
      ],
      subtotal: 75000,
      discount: 5000,
      taxRate: 18,
      taxAmount: 12600,
      grandTotal: 82600,
      advanceAmount: 25000,
      paymentTerms: '30% Advance, 50% on Event Day, 20% on Album Delivery',
      notes: 'Evening session starting 6 PM',
      status: 'Saved'
    });

    expect(createdQuote).toBeDefined();
    expect(createdQuote.id).toBeDefined();
    expect(createdQuote.status).toBe('Saved');
    expect(createdQuote.grandTotal).toBe(82600);

    // 2. Update the existing quotation
    const updatedQuote = quotationService.updateQuotation(testStudioId, createdQuote.id, {
      eventName: 'Grand Wedding & Reception',
      discount: 10000,
      grandTotal: 76700,
      status: 'Sent'
    });

    expect(updatedQuote).toBeDefined();
    expect(updatedQuote?.id).toBe(createdQuote.id); // Same ID, NO duplicates
    expect(updatedQuote?.eventName).toBe('Grand Wedding & Reception');
    expect(updatedQuote?.status).toBe('Sent');

    // 3. Verify single entry in list
    const studioQuotes = quotationService.listQuotations(testStudioId);
    const matches = studioQuotes.filter(q => q.id === createdQuote.id);
    expect(matches.length).toBe(1);
  });

  it('Part 3: index.html loads Poppins font and index.css applies Poppins to tabular numbers', () => {
    const indexPath = path.resolve(__dirname, '../../index.html');
    const indexContent = fs.readFileSync(indexPath, 'utf-8');
    expect(indexContent).toContain('family=Poppins');

    const cssPath = path.resolve(__dirname, '../index.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');
    expect(cssContent).toContain('.font-tabular');
    expect(cssContent).toContain('Poppins');
    expect(cssContent).toContain('tabular-nums');
  });

  it('Part 4: Modal.tsx and CalendarPage.tsx satisfy responsive mobile modal standards', () => {
    const modalPath = path.resolve(__dirname, '../components/ui/Modal.tsx');
    const modalContent = fs.readFileSync(modalPath, 'utf-8');
    // Verify 44px touch target on close button
    expect(modalContent).toContain('min-w-[44px]');
    expect(modalContent).toContain('min-h-[44px]');
    expect(modalContent).toContain('pb-safe');

    const calendarPath = path.resolve(__dirname, '../pages/CalendarPage.tsx');
    const calendarContent = fs.readFileSync(calendarPath, 'utf-8');
    // Verify Calendar instant shoot modal has sticky header, scrollable body, and close button
    expect(calendarContent).toContain('isInstantShootModalOpen');
    expect(calendarContent).toContain('sticky top-0');
    expect(calendarContent).toContain('sticky bottom-0');
    expect(calendarContent).toContain('overflow-y-auto');
    expect(calendarContent).toContain('Save & Schedule Shoot');
  });
});
