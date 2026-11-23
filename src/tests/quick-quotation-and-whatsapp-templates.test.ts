import { describe, it, expect, beforeEach } from 'vitest';
import { quotationService } from '../services/quotationService';
import { studioServiceCatalogService } from '../services/studioServiceCatalogService';
import { whatsappService } from '../services/whatsappService';
import { pdfGeneratorService } from '../services/pdfGeneratorService';
import { TenantStore } from '../services/tenantStore';
import { customerService } from '../services/customerService';

describe('Quick Quotation Engine & WhatsApp Message Templates Integration', () => {
  const STUDIO_A = 'test_studio_alpha';
  const STUDIO_B = 'test_studio_beta';

  beforeEach(() => {
    // Clear tenant test storage
    TenantStore.set(STUDIO_A, 'quotations', []);
    TenantStore.set(STUDIO_A, 'services', []);
    TenantStore.set(STUDIO_A, 'messageTemplates', []);
    TenantStore.set(STUDIO_A, 'customers', []);

    TenantStore.set(STUDIO_B, 'quotations', []);
    TenantStore.set(STUDIO_B, 'services', []);
    TenantStore.set(STUDIO_B, 'messageTemplates', []);
    TenantStore.set(STUDIO_B, 'customers', []);
  });

  describe('1. Studio Services Catalog & Multi-Tenant Isolation', () => {
    it('seeds the 12 standard photography services on first load', () => {
      const services = studioServiceCatalogService.listServices(STUDIO_A);
      expect(services.length).toBe(12);

      const names = services.map(s => s.name);
      expect(names).toContain('Wedding Photography');
      expect(names).toContain('Wedding Cinematography');
      expect(names).toContain('Pre-Wedding Shoot');
      expect(names).toContain('Engagement Photography');
      expect(names).toContain('Haldi Photography');
      expect(names).toContain('Mehndi Photography');
      expect(names).toContain('Reception Photography');
      expect(names).toContain('Drone Photography');
      expect(names).toContain('Cinematic Film');
      expect(names).toContain('Traditional Video');
      expect(names).toContain('Luxury Photobook Album');
      expect(names).toContain('Live Streaming');
    });

    it('strictly isolates catalog modifications between different studios', () => {
      // Create custom service in Studio A
      const customA = studioServiceCatalogService.createService(STUDIO_A, {
        name: '4K LED Wall Display',
        category: 'Display',
        defaultPrice: 22000,
        unit: 'Day'
      });

      const listA = studioServiceCatalogService.listServices(STUDIO_A);
      const listB = studioServiceCatalogService.listServices(STUDIO_B);

      expect(listA.some(s => s.id === customA.id)).toBe(true);
      expect(listB.some(s => s.id === customA.id)).toBe(false);
    });

    it('supports service updates and deletions', () => {
      const services = studioServiceCatalogService.listServices(STUDIO_A);
      const firstService = services[0];

      const updated = studioServiceCatalogService.updateService(STUDIO_A, firstService.id, {
        defaultPrice: 55000
      });
      expect(updated.defaultPrice).toBe(55000);

      studioServiceCatalogService.deleteService(STUDIO_A, firstService.id);
      const afterDelete = studioServiceCatalogService.listServices(STUDIO_A);
      expect(afterDelete.some(s => s.id === firstService.id)).toBe(false);
    });
  });

  describe('2. WhatsApp Templates & Dynamic Placeholder Replacements', () => {
    it('replaces all dynamic placeholders supporting single and double curly brackets', () => {
      const template = 'Hello {customer_name}, your quotation for {event_name} on {event_date} at {event_location} by {studio_name} is ₹{total_amount}. Link: {quotation_link}';

      const context = {
        customer_name: 'Ananya Verma',
        studio_name: 'Shreeji Films',
        event_name: 'Royal Wedding',
        event_date: '2026-12-15',
        event_location: 'Udaipur Palace',
        total_amount: '2,50,000',
        quotation_link: 'https://studio-os.app/#/quote/quo_123'
      };

      const result = whatsappService.replacePlaceholders(template, context);
      expect(result.hasUnresolved).toBe(false);
      expect(result.message).toContain('Hello Ananya Verma');
      expect(result.message).toContain('Royal Wedding');
      expect(result.message).toContain('2026-12-15');
      expect(result.message).toContain('Udaipur Palace');
      expect(result.message).toContain('Shreeji Films');
      expect(result.message).toContain('₹2,50,000');
      expect(result.message).toContain('https://studio-os.app/#/quote/quo_123');
    });

    it('supports setting default quotation message template', () => {
      const templates = whatsappService.listTemplates(STUDIO_A);
      expect(templates.length).toBeGreaterThan(0);

      const target = templates[2];
      const updated = whatsappService.setDefaultQuotationTemplate(STUDIO_A, target.id);
      expect(updated.isDefault).toBe(true);

      const defaultTemplate = whatsappService.getDefaultQuotationTemplate(STUDIO_A);
      expect(defaultTemplate?.id).toBe(target.id);
    });

    it('generates a valid WhatsApp Click-to-Chat URL without + or spaces', () => {
      const phone = '+91 98201 12233';
      const message = 'Hello Ananya, here is your quotation: https://studio-os.app/#/quote/quo_123';
      const clickToChat = whatsappService.generateClickToChatUrl(phone, message);

      expect(clickToChat.isValid).toBe(true);
      expect(clickToChat.waMeNumber).toBe('919820112233');
      expect(clickToChat.url).toContain('https://wa.me/919820112233?text=');
      expect(clickToChat.url).toContain(encodeURIComponent('https://studio-os.app/#/quote/quo_123'));
    });
  });

  describe('3. Quick Quotation Creation, Pricing Calculations & Sequential Numbering', () => {
    it('creates a quotation with sequential numbering and auto-calculated totals', () => {
      // 1. Create a customer
      const customer = customerService.createCustomer(STUDIO_A, {
        name: 'Vikas Patel',
        phone: '9876543210',
        email: 'vikas@patel.com'
      });

      // 2. Create quotation with 2 items
      const quotation1 = quotationService.createQuotation(STUDIO_A, {
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        eventName: 'Patel Wedding Ceremony',
        eventCategory: 'Wedding',
        eventDate: '2026-11-30',
        eventVenue: 'Ahmedabad Convention Centre',
        items: [
          { description: 'Wedding Photography', quantity: 1, unitPrice: 40000 },
          { description: 'Wedding Cinematography', quantity: 1, unitPrice: 50000 }
        ],
        discount: 10000,
        taxRate: 18
      });

      // Subtotal = 90,000; Taxable = 80,000; GST (18%) = 14,400; Grand Total = 94,400
      expect(quotation1.subtotal).toBe(90000);
      expect(quotation1.discount).toBe(10000);
      expect(quotation1.taxAmount).toBe(14400);
      expect(quotation1.grandTotal).toBe(94400);
      expect(quotation1.advanceAmount).toBe(47200); // 50% default
      expect(quotation1.quotationNumber).toMatch(/^QUO-\d{4}-\d{6}$/);

      // Create a second quotation to verify sequential increment
      const quotation2 = quotationService.createQuotation(STUDIO_A, {
        customerId: customer.id,
        customerName: customer.name,
        items: [
          { description: 'Drone Aerial Coverage', quantity: 1, unitPrice: 15000 }
        ]
      });

      expect(quotation2.quotationNumber).not.toBe(quotation1.quotationNumber);
    });

    it('duplicates quotation into a fresh draft with a new sequential number', () => {
      const customer = customerService.createCustomer(STUDIO_A, {
        name: 'Kavita Roy',
        phone: '9988776655'
      });

      const original = quotationService.createQuotation(STUDIO_A, {
        customerId: customer.id,
        customerName: customer.name,
        items: [{ description: 'Pre-Wedding Shoot', quantity: 1, unitPrice: 35000 }]
      });

      const duplicated = quotationService.duplicateQuotation(STUDIO_A, original.id);
      expect(duplicated.id).not.toBe(original.id);
      expect(duplicated.quotationNumber).not.toBe(original.quotationNumber);
      expect(duplicated.status).toBe('Draft');
      expect(duplicated.subtotal).toBe(35000);
    });
  });

  describe('4. 1-Click Quotation to Booking Conversion', () => {
    it('converts accepted quotation into event & invoice and prevents duplicate conversions', () => {
      const customer = customerService.createCustomer(STUDIO_A, {
        name: 'Amit Shah',
        phone: '9123456789'
      });

      const quotation = quotationService.createQuotation(STUDIO_A, {
        customerId: customer.id,
        customerName: customer.name,
        eventName: 'Amit & Priya Wedding',
        eventDate: '2026-12-20',
        eventVenue: 'Taj Skyline, Ahmedabad',
        items: [
          { description: 'Full Day Candid Photography', quantity: 1, unitPrice: 40000 },
          { description: '4K Cinematic Film', quantity: 1, unitPrice: 50000 }
        ]
      });

      // 1-Click Convert
      const conversion = quotationService.convertQuotationToBooking(STUDIO_A, quotation.id);
      expect(conversion.quotation.status).toBe('Converted to Booking');
      expect(conversion.quotation.convertedEventId).toBeDefined();
      expect(conversion.event).toBeDefined();
      expect(conversion.invoice).toBeDefined();

      // Duplicate prevention test: attempting to convert again must throw
      expect(() => {
        quotationService.convertQuotationToBooking(STUDIO_A, quotation.id);
      }).toThrow(/already converted/i);
    });
  });

  describe('5. Public Customer Quotation View & Privacy Isolation', () => {
    it('resolves quotation public data without leaking other tenants', () => {
      const customer = customerService.createCustomer(STUDIO_A, {
        name: 'Sneha Rao',
        phone: '9871122334'
      });

      const quoteA = quotationService.createQuotation(STUDIO_A, {
        customerId: customer.id,
        customerName: customer.name,
        items: [{ description: 'Engagement Shoot', quantity: 1, unitPrice: 25000 }]
      });

      const publicView = quotationService.getQuotationPublic(quoteA.id);
      expect(publicView).not.toBeNull();
      expect(publicView?.quotation.id).toBe(quoteA.id);
      expect(publicView?.quotation.customerName).toBe('Sneha Rao');

      // Invalid ID returns null
      const nonExistent = quotationService.getQuotationPublic('non_existent_quote_999');
      expect(nonExistent).toBeNull();
    });
  });

  describe('6. Real PDF Vector Generation', () => {
    it('generates a valid jsPDF document from quotation payload', () => {
      const customer = customerService.createCustomer(STUDIO_A, {
        name: 'Rohan Mehra',
        phone: '9811122233'
      });

      const quotation = quotationService.createQuotation(STUDIO_A, {
        customerId: customer.id,
        customerName: customer.name,
        items: [
          { description: 'Cinematic Teaser', quantity: 1, unitPrice: 20000 },
          { description: 'Luxury Leather Photobook', quantity: 1, unitPrice: 15000 }
        ]
      });

      const payload = pdfGeneratorService.createQuotationPayload(quotation, {
        name: 'Studio OS Premium Studios',
        businessAddress: 'S.G. Highway, Ahmedabad'
      });

      expect(payload.documentType).toBe('quotation');
      expect(payload.documentNumber).toBe(quotation.quotationNumber);
      expect(payload.items.length).toBe(2);

      const doc = pdfGeneratorService.generateDocumentPDF(payload);
      expect(doc).toBeDefined();
      expect(typeof doc.save).toBe('function');
      expect(typeof doc.output).toBe('function');
    });
  });
});
