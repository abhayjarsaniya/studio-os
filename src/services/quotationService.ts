import { Quotation, QuotationSchema, QuotationItem, QuotationStatus } from '../types/schema';
import { TenantStore } from './tenantStore';
import { auditService } from './auditService';
import { financialSettingsService } from './financialSettingsService';
import { invoiceService } from './invoiceService';
import { eventService } from './eventService';
import { customerService } from './customerService';
import { StudioEvent } from '../types';
import { bookingProductionService } from './bookingProductionService';

export interface PhotographyPackageTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  suggestedPrice: number;
  advancePercentage: number;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export const DEFAULT_10_PHOTOGRAPHY_PACKAGES: PhotographyPackageTemplate[] = [
  {
    id: 'pkg_wedding_photo',
    name: 'Wedding Photography (Classic)',
    category: 'Wedding',
    description: 'Full day traditional and candid wedding photography coverage.',
    suggestedPrice: 75000,
    advancePercentage: 50,
    items: [
      { description: '2 Senior Candid Photographers (Full Day)', quantity: 1, unitPrice: 40000 },
      { description: '1 Traditional Setup Photographer with Lighting', quantity: 1, unitPrice: 20000 },
      { description: 'Premium Leather Hardcover Album (40 Sheets, 250 Photos)', quantity: 1, unitPrice: 15000 }
    ]
  },
  {
    id: 'pkg_wedding_cinema',
    name: 'Wedding Photography + Cinematography (Royal)',
    category: 'Wedding',
    description: 'Comprehensive 4K cinematic film, drone aerials and candid photography.',
    suggestedPrice: 150000,
    advancePercentage: 50,
    items: [
      { description: '2 Candid Photographers & 2 4K Cinematographers', quantity: 1, unitPrice: 90000 },
      { description: 'Licensed 4K Aerial Drone Coverage with Pilot', quantity: 1, unitPrice: 20000 },
      { description: '3-Minute Cinematic Teaser + 30-Minute Highlight Film', quantity: 1, unitPrice: 25000 },
      { description: '2 Deluxe Embossed Photobooks in Presentation Box', quantity: 1, unitPrice: 15000 }
    ]
  },
  {
    id: 'pkg_pre_wedding',
    name: 'Pre-Wedding Cinematic Shoot',
    category: 'Pre-Wedding',
    description: 'Exotic destination outdoor cinematic couple session.',
    suggestedPrice: 45000,
    advancePercentage: 50,
    items: [
      { description: 'Full Day Destination Shoot (Up to 3 Outfit Changes)', quantity: 1, unitPrice: 30000 },
      { description: 'Cinematic 4K Love Story Video Teaser', quantity: 1, unitPrice: 15000 }
    ]
  },
  {
    id: 'pkg_engagement',
    name: 'Engagement / Roka Ceremony',
    category: 'Engagement',
    description: 'Half-day photo and video coverage for rings and family rituals.',
    suggestedPrice: 35000,
    advancePercentage: 50,
    items: [
      { description: '1 Candid Photographer & 1 Traditional Videographer (5 Hours)', quantity: 1, unitPrice: 25000 },
      { description: 'Edited High-Res Gallery & 4-Minute Highlight Reel', quantity: 1, unitPrice: 10000 }
    ]
  },
  {
    id: 'pkg_birthday',
    name: 'Birthday & Milestone Celebration',
    category: 'Birthday',
    description: 'Vibrant party coverage, cake cutting and guest candid portraits.',
    suggestedPrice: 20000,
    advancePercentage: 50,
    items: [
      { description: '1 Senior Candid Photographer (4 Hours Coverage)', quantity: 1, unitPrice: 15000 },
      { description: 'Mini Keepsake Album (20 Sheets)', quantity: 1, unitPrice: 5000 }
    ]
  },
  {
    id: 'pkg_maternity',
    name: 'Maternity Glow Photoshoot',
    category: 'Maternity',
    description: 'Studio and outdoor creative pregnancy portraits with gowns and lighting.',
    suggestedPrice: 25000,
    advancePercentage: 50,
    items: [
      { description: 'Creative Maternity Session (2 Sets, Styling Included)', quantity: 1, unitPrice: 18000 },
      { description: '25 Master Retouched High-Definition Portraits', quantity: 1, unitPrice: 7000 }
    ]
  },
  {
    id: 'pkg_newborn',
    name: 'Newborn & Baby Portraits',
    category: 'Newborn',
    description: 'Safe, temperature-regulated baby props, wraps and sleepy poses.',
    suggestedPrice: 22000,
    advancePercentage: 50,
    items: [
      { description: 'Newborn Posing Session with Props & Sanitized Wraps (3 Hours)', quantity: 1, unitPrice: 16000 },
      { description: 'Fine Art Accordion Mini-Album', quantity: 1, unitPrice: 6000 }
    ]
  },
  {
    id: 'pkg_corporate',
    name: 'Corporate Event & Conference',
    category: 'Corporate Event',
    description: 'Professional speaker headshots, auditorium stage and networking photos.',
    suggestedPrice: 50000,
    advancePercentage: 50,
    items: [
      { description: '2 Commercial Photographers (Full Day Corporate Summit)', quantity: 1, unitPrice: 35000 },
      { description: 'Same-Day Press Release Social Media Edits (50 Photos)', quantity: 1, unitPrice: 15000 }
    ]
  },
  {
    id: 'pkg_product',
    name: 'Product & E-Commerce Shoot',
    category: 'Product Photography',
    description: 'Clean white background catalog shots and lifestyle flat-lays.',
    suggestedPrice: 30000,
    advancePercentage: 50,
    items: [
      { description: 'Studio Product Session (Up to 30 SKUs with Clipping Path)', quantity: 1, unitPrice: 22000 },
      { description: 'Amazon/Instagram Ready Color Graded Assets', quantity: 1, unitPrice: 8000 }
    ]
  },
  {
    id: 'pkg_custom',
    name: 'Custom Tailored Photography Package',
    category: 'Custom Event',
    description: 'Flexible custom services configured to client requirements.',
    suggestedPrice: 25000,
    advancePercentage: 50,
    items: [
      { description: 'Professional Photography Coverage', quantity: 1, unitPrice: 25000 }
    ]
  }
];

export class QuotationService {
  getPackageTemplates(): PhotographyPackageTemplate[] {
    return DEFAULT_10_PHOTOGRAPHY_PACKAGES;
  }

  listQuotations(studioId: string, filter?: { customerId?: string; status?: QuotationStatus }): Quotation[] {
    if (!studioId) throw new Error('[quotationService.listQuotations]: studioId is required');
    let all = TenantStore.get<Quotation>(studioId, 'quotations');
    if (filter?.customerId) {
      all = all.filter(q => q.customerId === filter.customerId);
    }
    if (filter?.status) {
      all = all.filter(q => q.status === filter.status);
    }
    return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getQuotation(studioId: string, quotationId: string): Quotation | undefined {
    if (!studioId) throw new Error('[quotationService.getQuotation]: studioId is required');
    return this.listQuotations(studioId).find(q => q.id === quotationId);
  }

  /**
   * Public Customer Quotation Resolver:
   * Safely retrieves a quotation by unique ID for unauthenticated client view
   * without exposing other studio or customer records.
   */
  getQuotationPublic(quotationId: string): { quotation: Quotation; studio?: any } | null {
    if (!quotationId || typeof quotationId !== 'string') return null;

    // 1. Scan storage for tenant quotation collections
    const storageKeys = TenantStore.getStorageKeys();
    for (const key of storageKeys) {
      if (key && key.startsWith('studio_os_') && key.endsWith('_quotations')) {
        try {
          const raw = TenantStore.rawGet(key);
          if (raw) {
            const list = JSON.parse(raw) as Quotation[];
            const found = list.find(q => q.id === quotationId);
            if (found) {
              const studioProfile = TenantStore.getSingle<any>(found.studioId, 'profile') || null;
              return { quotation: found, studio: studioProfile };
            }
          }
        } catch {
          // continue scan
        }
      }
    }

    // 2. Also check default demo/royal studios if applicable
    for (const sid of ['studio_royal_001', 'studio_creative_002']) {
      try {
        const q = this.getQuotation(sid, quotationId);
        if (q) {
          const studioProfile = TenantStore.getSingle<any>(sid, 'profile') || null;
          return { quotation: q, studio: studioProfile };
        }
      } catch {
        // ignore
      }
    }

    return null;
  }

  createQuotation(
    studioId: string,
    data: {
      quotationNumber?: string;
      customerId: string;
      customerName: string;
      customerPhone?: string;
      customerEmail?: string;
      customerAddress?: string;
      relatedLeadId?: string;
      relatedEventId?: string;
      eventCategory?: string;
      eventName?: string;
      eventDate?: string;
      eventVenue?: string;
      venue?: string;
      quotationDate?: string;
      expiryDate?: string;
      validUntil?: string;
      packageName?: string;
      items: Array<{
        id?: string;
        title?: string;
        description: string;
        quantity: number;
        unitPrice: number;
        discount?: number;
        taxRate?: number;
        taxAmount?: number;
        amount?: number;
        totalPrice?: number;
      }>;
      subtotal?: number;
      discount?: number;
      discountAmount?: number;
      taxRate?: number;
      taxAmount?: number;
      cgst?: number;
      sgst?: number;
      igst?: number;
      grandTotal?: number;
      totalAmount?: number;
      advanceAmount?: number;
      paymentTerms?: string;
      additionalNotes?: string;
      notes?: string;
      status?: QuotationStatus;
    },
    operatorId: string = 'system'
  ): Quotation {
    if (!studioId) throw new Error('[quotationService.createQuotation]: studioId is required');
    if (!data.customerId) throw new Error('Customer ID is required for quotation');
    if (!data.items || data.items.length === 0) throw new Error('Quotation must contain at least one line item');

    const quotations = this.listQuotations(studioId);
    const quotationNumber = data.quotationNumber || financialSettingsService.generateDocumentNumber(studioId, 'QUO');

    const mappedItems = data.items.map((item, idx) => ({
      id: item.id || `item_${idx + 1}`,
      title: item.title || item.description,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount || 0,
      taxRate: item.taxRate || 18,
      taxAmount: item.taxAmount || 0,
      amount: item.amount || (item.quantity * item.unitPrice) - (item.discount || 0),
      totalPrice: item.totalPrice || item.amount || (item.quantity * item.unitPrice) - (item.discount || 0)
    }));

    // Calculate totals accurately
    const subtotal = mappedItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const discount = data.discount || 0;
    const taxRate = data.taxRate !== undefined ? data.taxRate : 18;
    const taxCalculation = financialSettingsService.calculateTaxes(subtotal, discount, taxRate);

    const grandTotal = data.grandTotal !== undefined ? data.grandTotal : taxCalculation.grandTotal;
    const advanceAmount = data.advanceAmount !== undefined ? data.advanceAmount : Math.round(grandTotal * 0.5);

    const newQuotation: Quotation = {
      ...data,
      eventCategory: data.eventCategory || 'Wedding Photography',
      packageName: data.packageName || 'Custom Package',
      discount,
      discountAmount: data.discountAmount !== undefined ? data.discountAmount : discount,
      cgst: data.cgst || Math.round((data.taxAmount || taxCalculation.totalTax) / 2),
      sgst: data.sgst || Math.round((data.taxAmount || taxCalculation.totalTax) / 2),
      igst: data.igst || 0,
      paymentTerms: data.paymentTerms || '50% advance upon booking, 50% on final delivery',
      items: mappedItems,
      quotationDate: data.quotationDate || new Date().toISOString().split('T')[0],
      expiryDate: data.expiryDate || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      id: `quo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      studioId,
      quotationNumber,
      subtotal,
      taxRate,
      taxAmount: data.taxAmount !== undefined ? data.taxAmount : taxCalculation.totalTax,
      grandTotal,
      advanceAmount,
      status: data.status || 'Draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: operatorId
    };

    QuotationSchema.parse(newQuotation);
    TenantStore.set(studioId, 'quotations', [newQuotation, ...quotations]);

    auditService.log(
      studioId,
      operatorId,
      'CREATE_QUOTATION',
      'quotation',
      newQuotation.id,
      { quotationNumber, customerName: newQuotation.customerName, grandTotal }
    );

    return newQuotation;
  }

  updateQuotation(
    studioId: string,
    quotationId: string,
    updates: Partial<Quotation>,
    operatorId: string = 'system'
  ): Quotation {
    if (!studioId) throw new Error('[quotationService.updateQuotation]: studioId is required');
    const quotations = this.listQuotations(studioId);
    const index = quotations.findIndex(q => q.id === quotationId);
    if (index === -1) throw new Error(`Quotation ${quotationId} not found`);

    const existing = quotations[index];
    if (existing.status === 'Converted to Booking') {
      throw new Error('Converted quotations cannot be modified.');
    }

    // Recompute totals if items, discount, or taxRate modified
    let subtotal = updates.items ? updates.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) : existing.subtotal;
    let discount = updates.discount !== undefined ? updates.discount : existing.discount;
    let taxRate = updates.taxRate !== undefined ? updates.taxRate : existing.taxRate;
    const taxCalculation = financialSettingsService.calculateTaxes(subtotal, discount, taxRate);

    const updated: Quotation = {
      ...existing,
      ...updates,
      subtotal,
      discount,
      taxRate,
      taxAmount: taxCalculation.totalTax,
      grandTotal: taxCalculation.grandTotal,
      updatedAt: new Date().toISOString()
    };

    QuotationSchema.parse(updated);
    quotations[index] = updated;
    TenantStore.set(studioId, 'quotations', quotations);

    auditService.log(
      studioId,
      operatorId,
      'UPDATE_QUOTATION',
      'quotation',
      quotationId,
      { quotationNumber: existing.quotationNumber, updatedFields: Object.keys(updates) }
    );

    return updated;
  }

  updateStatus(
    studioId: string,
    quotationId: string,
    status: QuotationStatus,
    operatorId: string = 'system'
  ): Quotation {
    const q = this.getQuotation(studioId, quotationId);
    if (!q) throw new Error(`Quotation ${quotationId} not found`);

    return this.updateQuotation(studioId, quotationId, { status }, operatorId);
  }

  deleteQuotation(studioId: string, quotationId: string, operatorId: string = 'system'): void {
    if (!studioId) throw new Error('[quotationService.deleteQuotation]: studioId is required');
    const quotations = this.listQuotations(studioId);
    const target = quotations.find(q => q.id === quotationId);
    if (!target) return;
    if (target.status === 'Converted to Booking') {
      throw new Error('Cannot delete a quotation that has already been converted into a booking.');
    }

    TenantStore.set(studioId, 'quotations', quotations.filter(q => q.id !== quotationId));
    auditService.log(studioId, operatorId, 'DELETE_QUOTATION', 'quotation', quotationId, { quotationNumber: target.quotationNumber });
  }

  duplicateQuotation(studioId: string, quotationId: string, operatorId: string = 'system'): Quotation {
    if (!studioId) throw new Error('[quotationService.duplicateQuotation]: studioId is required');
    const original = this.getQuotation(studioId, quotationId);
    if (!original) throw new Error(`Quotation ${quotationId} not found`);

    const newQuotation = this.createQuotation(
      studioId,
      {
        customerId: original.customerId,
        customerName: original.customerName,
        customerPhone: original.customerPhone,
        customerEmail: original.customerEmail,
        customerAddress: original.customerAddress,
        eventCategory: original.eventCategory,
        eventName: `${original.eventName || 'Quotation'} (Copy)`,
        eventDate: original.eventDate,
        eventVenue: original.eventVenue,
        venue: original.venue,
        packageName: original.packageName,
        items: original.items.map(item => ({
          title: item.title,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          taxRate: item.taxRate,
          taxAmount: item.taxAmount
        })),
        subtotal: original.subtotal,
        discount: original.discount,
        taxRate: original.taxRate,
        grandTotal: original.grandTotal,
        advanceAmount: original.advanceAmount,
        paymentTerms: original.paymentTerms,
        notes: original.notes,
        status: 'Draft'
      },
      operatorId
    );

    auditService.log(studioId, operatorId, 'DUPLICATE_QUOTATION', 'quotation', newQuotation.id, {
      originalId: quotationId,
      newQuotationNumber: newQuotation.quotationNumber
    });

    return newQuotation;
  }

  /**
   * 1-Click Convert Accepted Quotation to Booking:
   * - Reuses client profile
   * - Creates or connects Event
   * - Generates formal Booking Invoice with line items & tax calculations
   * - Preserves conversion history & marks status "Converted to Booking"
   */
  convertQuotationToBooking(
    studioId: string,
    quotationId: string,
    options?: {
      eventId?: string;
      eventName?: string;
      eventDate?: string;
      venue?: string;
      operatorId?: string;
      operatorName?: string;
    }
  ): { quotation: Quotation; event: StudioEvent; invoice: any } {
    if (!studioId) throw new Error('[quotationService.convertQuotationToBooking]: studioId is required');
    const quotation = this.getQuotation(studioId, quotationId);
    if (!quotation) throw new Error(`Quotation ${quotationId} not found`);
    if (quotation.status === 'Converted to Booking') {
      throw new Error(`Quotation ${quotation.quotationNumber} is already converted.`);
    }

    const operator = options?.operatorId || 'system';
    const eventDate = options?.eventDate || quotation.eventDate || new Date().toISOString().split('T')[0];
    const eventName = options?.eventName || `${quotation.customerName} - ${quotation.eventCategory}`;
    const venue = options?.venue || quotation.eventVenue || 'Studio / On-Site';

    // 1. Create or connect Event
    let event: any;
    if (options?.eventId) {
      const existing = eventService.getEvent(studioId, options.eventId);
      if (!existing) throw new Error(`Event ${options.eventId} not found`);
      event = existing;
    } else {
      event = eventService.createEvent(studioId, {
        name: eventName,
        title: eventName,
        customerId: quotation.customerId,
        customerName: quotation.customerName,
        customerPhone: quotation.customerPhone || '9820112233',
        category: quotation.eventCategory || 'Wedding',
        startDate: eventDate,
        startTime: '10:00',
        endDate: eventDate,
        endTime: '18:00',
        venue,
        venueCity: 'Mumbai',
        estimatedBudget: quotation.grandTotal,
        advancePaid: 0,
        assignedTeamIds: [],
        priority: 'High',
        deliverables: quotation.items.map(i => i.description),
        status: 'Confirmed',
        createdBy: operator
      });
    }

    // 2. Generate formal Initial Booking Invoice
    const invoice = invoiceService.createInvoice(studioId, {
      invoiceType: 'Booking Invoice',
      customerId: quotation.customerId,
      customerName: quotation.customerName,
      customerPhone: quotation.customerPhone || '',
      customerEmail: quotation.customerEmail || '',
      eventId: event.id,
      eventName: event.name,
      relatedQuotationId: quotation.id,
      items: quotation.items.map(i => ({
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        rate: i.unitPrice,
        discount: i.discount || 0,
        taxRate: i.taxRate || quotation.taxRate || 18,
        taxAmount: i.taxAmount || 0,
        amount: i.amount
      })),
      subtotal: quotation.subtotal,
      discountAmount: quotation.discount || 0,
      taxAmount: quotation.taxAmount || 0,
      totalAmount: quotation.grandTotal,
      paidAmount: 0,
      pendingAmount: quotation.grandTotal,
      outstandingBalance: quotation.grandTotal,
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: eventDate,
      status: 'Issued',
      paymentTerms: quotation.paymentTerms || 'Due on Receipt',
      notes: `Generated from Quotation #${quotation.quotationNumber}. ${quotation.additionalNotes || ''}`,
      termsAndConditions: quotation.termsAndConditions,
      isIssued: true,
      issuedAt: new Date().toISOString(),
      createdBy: operator
    });

    // 3. Create or sync BookingRecord in bookingProductionService for Booking Directory
    let bookingRecord: any;
    try {
      bookingRecord = bookingProductionService.createBooking(studioId, {
        customerId: quotation.customerId,
        customerName: quotation.customerName,
        customerPhone: quotation.customerPhone || '9820112233',
        customerEmail: quotation.customerEmail,
        eventName: eventName,
        category: quotation.eventCategory || 'Wedding',
        mainEventDate: eventDate,
        startDate: eventDate,
        venue,
        city: (quotation as any).eventCity || 'Ahmedabad',
        description: quotation.additionalNotes || `Converted from Quotation #${quotation.quotationNumber}`,
        agreedAmount: quotation.grandTotal,
        advancePayment: (quotation as any).advanceRequired || 0,
        functions: [
          {
            name: quotation.eventName || `${quotation.eventCategory || 'Event'} Shoot`,
            category: quotation.eventCategory || 'Wedding',
            date: eventDate,
            venue,
            city: (quotation as any).eventCity || 'Ahmedabad',
            deliverablesConfig: quotation.items.map(item => ({
              name: item.description,
              category: 'photography',
              requiredQty: item.quantity || 1
            }))
          }
        ],
        createdBy: operator
      });
      if (bookingRecord?.id) {
        bookingRecord = bookingProductionService.updateBookingStatus(
          studioId,
          bookingRecord.id,
          'deal_confirmed',
          `Converted from Quotation #${quotation.quotationNumber}`
        );
      }
    } catch (bkgErr) {
      console.warn('[quotationService.convertQuotationToBooking] bookingProductionService warning:', bkgErr);
    }

    // 4. Mark Quotation as Converted to Booking
    const updatedQuotation = this.updateQuotation(studioId, quotation.id, {
      status: 'Converted to Booking',
      convertedEventId: event.id,
      convertedBookingId: bookingRecord?.id || event.id,
      convertedBookingNumber: bookingRecord?.bookingNumber,
      convertedInvoiceId: invoice.id,
      convertedAt: new Date().toISOString()
    } as any, operator);

    // 5. Update Customer status to Booked if customer exists, or register
    try {
      const cust = customerService.getCustomer(studioId, quotation.customerId);
      if (cust) {
        customerService.updateCustomer(studioId, quotation.customerId, {
          status: 'Booked'
        }, operator);
      } else {
        customerService.createCustomer(studioId, {
          id: quotation.customerId,
          name: quotation.customerName,
          phone: quotation.customerPhone || '9820011223',
          email: quotation.customerEmail || '',
          status: 'Booked',
          customerSource: 'Quotation Conversion',
          createdBy: operator
        } as any);
      }
    } catch {
      // Non-fatal if customer directory creation skipped
    }

    auditService.log(
      studioId,
      operator,
      'CONVERT_QUOTATION_TO_BOOKING',
      'quotation',
      quotation.id,
      {
        quotationNumber: quotation.quotationNumber,
        eventId: event.id,
        invoiceId: invoice.id,
        grandTotal: quotation.grandTotal
      }
    );

    return {
      quotation: updatedQuotation,
      event,
      invoice
    };
  }
}

export const quotationService = new QuotationService();
