import { TenantStore } from './tenantStore';
import { Customer, StudioEvent, Quotation, Invoice, Payment, Employee } from '../types/schema';
import { BookingRecord, DeliverableSpecification } from '../types/bookingProduction';
import { ShreejiBookingSeedService } from './shreejiBookingSeedService';

export interface HistoryMainKPIs {
  totalBookings: number;
  totalCustomers: number;
  confirmedBookings: number;
  completedEvents: number;
  totalQuotationValue: number;
  finalAgreedValue: number;
  totalPaymentsReceived: number;
  outstandingPayments: number;
  negotiatedDiscounts: number;
  totalDeliverables: number;
  photosDelivered: number;
  albumsCompleted: number;
}

export interface HistoryAdditionalInsights {
  averageBookingValue: number;
  averageNegotiationDiscount: number;
  repeatCustomerCount: number;
  quotationConversionsCount: number;
  quotationConversionRate: number;
  pendingQuotations: number;
  pendingDeliveries: number;
  overdueDeliveries: number;
  completedAlbums: number;
  completedVideos: number;
  upcomingShoots: number;
}

export interface CustomerCompleteHistory {
  customer: Customer;
  bookings: BookingRecord[];
  events: StudioEvent[];
  quotations: Quotation[];
  invoices: Invoice[];
  payments: Payment[];
  negotiationTimeline: Array<{
    bookingNumber: string;
    eventName: string;
    originalPrice: number;
    discount: number;
    finalPrice: number;
    reason: string;
    date: string;
  }>;
  deliverables: DeliverableSpecification[];
  photosSummary: {
    rawPhotosTotal: number;
    editedPhotosTotal: number;
    deliveredPhotosTotal: number;
  };
  videosSummary: {
    totalVideos: number;
    totalReels: number;
    completedVideos: number;
  };
  albumsSummary: {
    totalAlbums: number;
    deliveredAlbums: number;
    statuses: string[];
  };
  totalBilled: number;
  totalPaid: number;
  outstandingBalance: number;
}

export type WhatsAppTemplateId = 
  | 'booking_confirmation'
  | 'quotation_summary'
  | 'negotiated_price_confirmation'
  | 'payment_received'
  | 'outstanding_payment_reminder'
  | 'invoice_shared'
  | 'photo_delivery_update'
  | 'raw_photos_delivered'
  | 'edited_photos_delivered'
  | 'album_design_completed'
  | 'album_ready_for_printing'
  | 'album_dispatched'
  | 'final_delivery_completed'
  | 'thank_you_message'
  | 'custom_message';

export interface WhatsAppTemplateConfig {
  id: WhatsAppTemplateId;
  title: string;
  category: 'Booking' | 'Finance' | 'Delivery' | 'General';
  templateText: string;
}

export const WHATSAPP_TEMPLATES: WhatsAppTemplateConfig[] = [
  {
    id: 'booking_confirmation',
    title: '1. Booking Confirmation',
    category: 'Booking',
    templateText: `Hello {{customer_name}},\n\nYour booking with {{studio_name}} is officially confirmed!\n\nBooking ID: {{booking_id}}\nEvent: {{event_name}}\nDate: {{event_date}}\nVenue: {{venue}}\nFinal Agreed Amount: ₹{{final_amount}}\nAdvance Received: ₹{{amount_received}}\nRemaining Balance: ₹{{remaining_balance}}\n\nOur creative crew is excited to capture your unforgettable moments.\n\nThank you for choosing {{studio_name}}!`
  },
  {
    id: 'quotation_summary',
    title: '2. Quotation Summary',
    category: 'Booking',
    templateText: `Hello {{customer_name}},\n\nWe have prepared your customized photography proposal from {{studio_name}}.\n\nEvent: {{event_name}}\nQuotation ID: {{quotation_id}}\nTotal Package Value: ₹{{quoted_amount}}\n\nServices Included:\n{{services_list}}\n\nPlease review and let us know if you would like any package customisation.\n\nBest regards,\n{{studio_name}}`
  },
  {
    id: 'negotiated_price_confirmation',
    title: '3. Negotiated Price Confirmation',
    category: 'Booking',
    templateText: `Hello {{customer_name}},\n\nFollowing our discussion, we are delighted to confirm the revised special agreed pricing for {{event_name}}.\n\nOriginal Quoted Amount: ₹{{quoted_amount}}\nSpecial Courtesy Discount: ₹{{discount_amount}}\nFinal Agreed Booking Price: ₹{{final_amount}}\n\nNotes / Concession: {{discount_reason}}\n\nWe look forward to partnering with you on this memorable celebration!\n\nWarm regards,\n{{studio_name}}`
  },
  {
    id: 'payment_received',
    title: '4. Payment Received Receipt',
    category: 'Finance',
    templateText: `Hello {{customer_name}},\n\nWe have successfully received and verified your payment.\n\nReceipt Number: {{receipt_number}}\nAmount Received: ₹{{amount_received}}\nPayment Method: {{payment_method}}\nTransaction Ref: {{payment_ref}}\nRemaining Balance: ₹{{remaining_balance}}\n\nThank you for your prompt settlement.\n{{studio_name}}`
  },
  {
    id: 'outstanding_payment_reminder',
    title: '5. Outstanding Balance Reminder',
    category: 'Finance',
    templateText: `Hello {{customer_name}},\n\nThis is a gentle payment reminder from {{studio_name}} regarding your booking for {{event_name}}.\n\nTotal Agreed Amount: ₹{{final_amount}}\nTotal Paid to Date: ₹{{amount_received}}\nOutstanding Balance Due: ₹{{remaining_balance}}\n\nKindly process the balance via UPI or Bank Transfer at your earliest convenience to release final delivery.\n\nThank you,\n{{studio_name}}`
  },
  {
    id: 'invoice_shared',
    title: '6. Official Invoice Shared',
    category: 'Finance',
    templateText: `Hello {{customer_name}},\n\nYour official tax invoice from {{studio_name}} is ready.\n\nBooking: {{event_name}}\nInvoice Number: {{invoice_number}}\nFinal Agreed Amount: ₹{{final_amount}}\nAmount Received: ₹{{amount_received}}\nRemaining Balance: ₹{{remaining_balance}}\n\nThank you for choosing {{studio_name}}!`
  },
  {
    id: 'photo_delivery_update',
    title: '7. Overall Photo Delivery Update',
    category: 'Delivery',
    templateText: `Hello {{customer_name}},\n\nYour photography delivery update is ready.\n\nEvent: {{event_name}}\n\nPhotos:\n- Raw Stills Captured: {{raw_photo_count}}\n- Retouched / Edited Photos: {{edited_photo_count}}\n\nVideos:\n- Completed 4K Films & Reels: {{completed_video_count}}\n\nAlbum:\n- Album Status: {{album_status}}\n\nCloud Access Link: {{delivery_link}}\n\nThank you,\n{{studio_name}}`
  },
  {
    id: 'raw_photos_delivered',
    title: '8. Raw Photos Released',
    category: 'Delivery',
    templateText: `Hello {{customer_name}},\n\nAll raw photographs from {{event_name}} have been securely backed up and uploaded to your private cloud storage folder.\n\nTotal Raw Photos: {{raw_photo_count}}\nAccess Link: {{delivery_link}}\n\nPlease download and mark your favorites for album layout selection.\n\nRegards,\n{{studio_name}}`
  },
  {
    id: 'edited_photos_delivered',
    title: '9. Edited High-Res Photos Ready',
    category: 'Delivery',
    templateText: `Hello {{customer_name}},\n\nGreat news! Your high-resolution edited and color-graded photographs for {{event_name}} are ready.\n\nTotal Edited Photos: {{edited_photo_count}}\nPrivate Cloud Link: {{delivery_link}}\n\nWe hope you love revisiting every emotion!\n{{studio_name}}`
  },
  {
    id: 'album_design_completed',
    title: '10. Album Design Proofing Ready',
    category: 'Delivery',
    templateText: `Hello {{customer_name}},\n\nThe digital design layout for your luxury wedding album ({{event_name}}) is complete!\n\nAlbum Sheets: {{album_sheets_count}}\nPhotobook Size: {{album_size}}\nDigital Proof Link: {{delivery_link}}\n\nPlease review the digital pages and reply with your approval or any adjustment notes before print production.\n\n{{studio_name}} Design Team`
  },
  {
    id: 'album_ready_for_printing',
    title: '11. Album Approved for Printing',
    category: 'Delivery',
    templateText: `Hello {{customer_name}},\n\nYour album layout has been approved and dispatched to our specialized Canvera laboratory for ultra-HD printing and bespoke leather binding.\n\nEstimated Print Turnaround: 10-12 business days.\n\nWe will notify you once your physical album arrives at the studio.\n\nWarm regards,\n{{studio_name}}`
  },
  {
    id: 'album_dispatched',
    title: '12. Physical Album Dispatched / Courier',
    category: 'Delivery',
    templateText: `Hello {{customer_name}},\n\nYour handcrafted wedding album and presentation box have been safely packed and dispatched for delivery!\n\nPackage: {{album_status}}\nCourier / Handover: Studio Courier Desk\nTracking / Booking: {{booking_id}}\n\nLooking forward to placing your timeless heirloom into your hands.\n{{studio_name}}`
  },
  {
    id: 'final_delivery_completed',
    title: '13. Final Complete Delivery Handover',
    category: 'Delivery',
    templateText: `Hello {{customer_name}},\n\nWe are delighted to confirm that all deliverables for {{event_name}} have been 100% fulfilled:\n\n- High-Res Digital Photo Gallery\n- 4K Feature Films & Teasers\n- Social Media Vertical Reels\n- Printed Bespoke Albums\n\nThank you immensely for letting {{studio_name}} be a part of your journey.\n{{studio_name}} Team`
  },
  {
    id: 'thank_you_message',
    title: '14. Thank You & Review Request',
    category: 'General',
    templateText: `Dear {{customer_name}},\n\nIt was an honor for the entire {{studio_name}} team to capture {{event_name}}.\n\nIf you enjoyed your experience with our crew, we would deeply appreciate a 5-star Google review: https://g.page/r/shreejistudio/review\n\nWishing you and your family abundant happiness!\n\nAarav Patel & Team {{studio_name}}`
  },
  {
    id: 'custom_message',
    title: '15. Custom Studio Message',
    category: 'General',
    templateText: `Hello {{customer_name}},\n\n{{custom_note}}\n\nWarm regards,\n{{studio_name}}`
  }
];

export class HistoryBookingsService {
  private static DEFAULT_STUDIO = 'studio_shreeji_films';

  // Ensure sample bookings are seeded
  private ensureSeeded(studioId: string): void {
    const isShreeji = studioId === 'studio_shreeji_films' || studioId === 'std_demo_royal' || studioId === 'studio_royal_001';
    if (isShreeji) {
      const seeded = TenantStore.getSingle(studioId, ShreejiBookingSeedService.SEED_FLAG_KEY);
      if (!seeded) {
        ShreejiBookingSeedService.seedAllSampleBookings(false, studioId);
        ShreejiBookingSeedService.seedAllSampleBookings(false, 'studio_shreeji_films');
        ShreejiBookingSeedService.seedAllSampleBookings(false, 'std_demo_royal');
      }
    }
  }

  // Get All Raw Data for Studio
  getAllData(studioId: string = HistoryBookingsService.DEFAULT_STUDIO) {
    this.ensureSeeded(studioId);
    let bookings = TenantStore.get<BookingRecord>(studioId, 'studio_bookings_v2') || [];
    let events = TenantStore.get<StudioEvent>(studioId, 'events') || [];
    let customers = TenantStore.get<Customer>(studioId, 'customers') || [];
    let quotations = TenantStore.get<Quotation>(studioId, 'quotations') || [];
    let invoices = TenantStore.get<Invoice>(studioId, 'invoices') || [];
    let payments = TenantStore.get<Payment>(studioId, 'payments') || [];
    let employees = TenantStore.get<Employee>(studioId, 'employees') || [];

    // Fallback alias between studio_shreeji_films and std_demo_royal
    if (bookings.length === 0 && (studioId === 'studio_shreeji_films' || studioId === 'std_demo_royal')) {
      const fallbackId = studioId === 'studio_shreeji_films' ? 'std_demo_royal' : 'studio_shreeji_films';
      bookings = TenantStore.get<BookingRecord>(fallbackId, 'studio_bookings_v2') || [];
      events = TenantStore.get<StudioEvent>(fallbackId, 'events') || [];
      customers = TenantStore.get<Customer>(fallbackId, 'customers') || [];
      quotations = TenantStore.get<Quotation>(fallbackId, 'quotations') || [];
      invoices = TenantStore.get<Invoice>(fallbackId, 'invoices') || [];
      payments = TenantStore.get<Payment>(fallbackId, 'payments') || [];
      employees = TenantStore.get<Employee>(fallbackId, 'employees') || [];
    }

    return {
      bookings,
      events,
      customers,
      quotations,
      invoices,
      payments,
      employees
    };
  }

  // 1. Calculate Main 12 KPIs
  getMainKPIs(studioId: string = HistoryBookingsService.DEFAULT_STUDIO): HistoryMainKPIs {
    const { bookings, customers, events, quotations, payments } = this.getAllData(studioId);

    const totalBookings = bookings.length;
    const totalCustomers = customers.length;

    const confirmedBookings = bookings.filter(b => 
      ['confirmed', 'deal_confirmed', 'advance_received', 'advance_pending', 'event_scheduled', 'in_production', 'editing'].includes(b.status)
    ).length;

    const completedEvents = bookings.filter(b => 
      ['completed', 'fully_delivered'].includes(b.status)
    ).length;

    let totalQuotationValue = 0;
    quotations.forEach(q => {
      totalQuotationValue += q.totalAmount || 0;
    });

    let finalAgreedValue = 0;
    let negotiatedDiscounts = 0;
    let outstandingPayments = 0;
    let totalDeliverables = 0;
    let photosDelivered = 0;
    let albumsCompleted = 0;

    bookings.forEach(b => {
      const agreed = b.financials?.finalAgreedAmount || 0;
      finalAgreedValue += agreed;
      negotiatedDiscounts += b.financials?.negotiatedDiscount || 0;
      outstandingPayments += b.financials?.remainingBalance || 0;

      if (Array.isArray(b.deliverables)) {
        totalDeliverables += b.deliverables.length;
        b.deliverables.forEach(d => {
          if (d.isDelivered || d.stage === 'delivered') {
            if (d.category === 'photography') {
              photosDelivered += d.photoCount || (d.completedQty > 1 ? d.completedQty : 250);
            }
            if (d.category === 'physical' && d.name.toLowerCase().includes('album')) {
              albumsCompleted += d.completedQty || 1;
            }
          }
        });
      }
    });

    let totalPaymentsReceived = 0;
    payments.forEach(p => {
      if (p.status === 'success' || (p as any).status === 'completed' || !p.status) {
        totalPaymentsReceived += p.amount || 0;
      }
    });

    return {
      totalBookings,
      totalCustomers,
      confirmedBookings,
      completedEvents,
      totalQuotationValue,
      finalAgreedValue,
      totalPaymentsReceived,
      outstandingPayments,
      negotiatedDiscounts,
      totalDeliverables,
      photosDelivered,
      albumsCompleted
    };
  }

  // 2. Additional Business Insights
  getAdditionalInsights(studioId: string = HistoryBookingsService.DEFAULT_STUDIO): HistoryAdditionalInsights {
    const { bookings, customers, quotations } = this.getAllData(studioId);
    const mainKpis = this.getMainKPIs(studioId);

    const averageBookingValue = mainKpis.totalBookings > 0 
      ? Math.round(mainKpis.finalAgreedValue / mainKpis.totalBookings) 
      : 0;

    const negotiatedCount = bookings.filter(b => (b.financials?.negotiatedDiscount || 0) > 0).length;
    const averageNegotiationDiscount = negotiatedCount > 0 
      ? Math.round(mainKpis.negotiatedDiscounts / negotiatedCount) 
      : 0;

    // Customer repeat booking count
    const customerBookingMap: Record<string, number> = {};
    bookings.forEach(b => {
      const cId = b.customerId;
      customerBookingMap[cId] = (customerBookingMap[cId] || 0) + 1;
    });
    const repeatCustomerCount = Object.values(customerBookingMap).filter(cnt => cnt > 1).length;

    // Quotation conversions
    const totalQuotations = quotations.length;
    const convertedQuotations = quotations.filter(q => q.status === 'Accepted' || q.status === 'Converted to Booking' || (q as any).status === 'accepted' || (q as any).status === 'converted').length;
    const quotationConversionRate = totalQuotations > 0 
      ? Math.round((convertedQuotations / totalQuotations) * 100) 
      : 0;

    const pendingQuotations = quotations.filter(q => q.status === 'Sent' || q.status === 'Draft' || (q as any).status === 'sent' || (q as any).status === 'draft').length;

    let pendingDeliveries = 0;
    let overdueDeliveries = 0;
    let completedAlbums = mainKpis.albumsCompleted;
    let completedVideos = 0;
    let upcomingShoots = 0;

    const todayStr = new Date().toISOString().split('T')[0];

    bookings.forEach(b => {
      if (b.mainEventDate >= todayStr && b.status !== 'cancelled') {
        upcomingShoots++;
      }

      if (Array.isArray(b.deliverables)) {
        b.deliverables.forEach(d => {
          if (!d.isDelivered && d.stage !== 'delivered') {
            pendingDeliveries++;
            if (d.calculatedDeadline && d.calculatedDeadline < todayStr) {
              overdueDeliveries++;
            }
          } else {
            if (d.category === 'video') {
              completedVideos += d.completedQty || d.videoCount || 1;
            }
          }
        });
      }
    });

    return {
      averageBookingValue,
      averageNegotiationDiscount,
      repeatCustomerCount,
      quotationConversionsCount: convertedQuotations,
      quotationConversionRate,
      pendingQuotations,
      pendingDeliveries,
      overdueDeliveries,
      completedAlbums,
      completedVideos,
      upcomingShoots
    };
  }

  // 3. Customer Complete History Detail Assembler
  getCustomerCompleteHistory(studioId: string, customerId: string): CustomerCompleteHistory | null {
    const { bookings, customers, events, quotations, invoices, payments } = this.getAllData(studioId);

    let customer = customers.find(c => c.id === customerId);
    if (!customer) {
      const matchBooking = bookings.find(b => b.customerId === customerId);
      if (matchBooking) {
        customer = {
          id: customerId,
          studioId,
          name: matchBooking.customerName,
          phone: matchBooking.customerPhone,
          email: matchBooking.customerEmail,
          city: matchBooking.city,
          address: matchBooking.customerAddress || matchBooking.venue,
          status: 'active' as any,
          totalBookings: 1,
          totalRevenue: matchBooking.financials?.verifiedPaymentsReceived || 0,
          totalQuotedValue: matchBooking.financials?.originalQuotation || 0,
          pendingBalance: matchBooking.financials?.remainingBalance || 0,
          createdAt: matchBooking.createdAt || new Date().toISOString(),
          updatedAt: matchBooking.updatedAt || new Date().toISOString()
        } as any;
      }
    }
    if (!customer) return null;

    const customerBookings = bookings.filter(b => b.customerId === customerId);
    const customerEvents = events.filter(e => e.customerId === customerId);
    const customerQuotations = quotations.filter(q => q.customerId === customerId);
    const customerInvoices = invoices.filter(i => i.customerId === customerId);
    const customerPayments = payments.filter(p => p.customerId === customerId);

    const negotiationTimeline: Array<{
      bookingNumber: string;
      eventName: string;
      originalPrice: number;
      discount: number;
      finalPrice: number;
      reason: string;
      date: string;
    }> = [];

    const allDeliverables: DeliverableSpecification[] = [];
    let rawPhotosTotal = 0;
    let editedPhotosTotal = 0;
    let deliveredPhotosTotal = 0;
    let totalVideos = 0;
    let totalReels = 0;
    let completedVideos = 0;
    let totalAlbums = 0;
    let deliveredAlbums = 0;
    const albumStatuses: string[] = [];

    let totalBilled = 0;
    let totalPaid = 0;

    customerBookings.forEach(b => {
      totalBilled += b.financials?.finalAgreedAmount || 0;
      totalPaid += b.financials?.verifiedPaymentsReceived || 0;

      if ((b.financials?.negotiatedDiscount || 0) > 0) {
        negotiationTimeline.push({
          bookingNumber: b.bookingNumber,
          eventName: b.eventName,
          originalPrice: b.financials.originalQuotation,
          discount: b.financials.negotiatedDiscount,
          finalPrice: b.financials.finalAgreedAmount,
          reason: b.billingVersions?.[0]?.negotiationReason || (b.billingVersions?.[0] as any)?.reason || 'Direct negotiation concession',
          date: b.mainEventDate
        });
      }

      if (Array.isArray(b.deliverables)) {
        b.deliverables.forEach(d => {
          allDeliverables.push(d);
          if (d.category === 'photography') {
            editedPhotosTotal += d.photoCount || 150;
            if (d.isDelivered) deliveredPhotosTotal += d.photoCount || 150;
          } else if (d.category === 'video') {
            totalVideos += d.videoCount || 1;
            totalReels += d.reelCount || 0;
            if (d.isDelivered) completedVideos += d.videoCount || 1;
          } else if (d.category === 'physical' && d.name.toLowerCase().includes('album')) {
            totalAlbums += d.requiredQty || 1;
            if (d.isDelivered) deliveredAlbums += d.completedQty || 1;
            albumStatuses.push(d.stage);
          }
        });
      }
    });

    customerEvents.forEach(e => {
      rawPhotosTotal += (e.deliverablesConfig?.rawPhotosRequired ? 1200 : 0);
    });

    return {
      customer,
      bookings: customerBookings,
      events: customerEvents,
      quotations: customerQuotations,
      invoices: customerInvoices,
      payments: customerPayments,
      negotiationTimeline,
      deliverables: allDeliverables,
      photosSummary: {
        rawPhotosTotal,
        editedPhotosTotal,
        deliveredPhotosTotal
      },
      videosSummary: {
        totalVideos,
        totalReels,
        completedVideos
      },
      albumsSummary: {
        totalAlbums,
        deliveredAlbums,
        statuses: albumStatuses
      },
      totalBilled,
      totalPaid,
      outstandingBalance: Math.max(0, totalBilled - totalPaid)
    };
  }

  // 4. WhatsApp Message Generator
  generateWhatsAppMessage(options: {
    templateId: WhatsAppTemplateId;
    customerName: string;
    studioName?: string;
    phone: string;
    bookingId?: string;
    eventName?: string;
    eventDate?: string;
    venue?: string;
    finalAmount?: number;
    amountReceived?: number;
    remainingBalance?: number;
    quotationId?: string;
    quotedAmount?: number;
    discountAmount?: number;
    discountReason?: string;
    servicesList?: string;
    invoiceNumber?: string;
    receiptNumber?: string;
    paymentMethod?: string;
    paymentRef?: string;
    rawPhotoCount?: number;
    editedPhotoCount?: number;
    completedVideoCount?: number;
    albumStatus?: string;
    albumSheetsCount?: number;
    albumSize?: string;
    deliveryLink?: string;
    customNote?: string;
  }): { message: string; waUrl: string } {
    const {
      templateId,
      customerName,
      studioName = 'Shreeji Studio',
      phone,
      bookingId = 'SHR-BKG-2026-001',
      eventName = 'Grand Celebration',
      eventDate = '2026-04-15',
      venue = 'The Ummed Palace, Ahmedabad',
      finalAmount = 150000,
      amountReceived = 80000,
      remainingBalance = 70000,
      quotationId = 'SHR-QT-2026-001',
      quotedAmount = 175000,
      discountAmount = 25000,
      discountReason = 'Festival package courtesy concession',
      servicesList = '• 2 Candid Photographers\n• 4K Cinematic Highlights Film\n• Licensed Drone Aerials\n• Luxury Hardcover Photobook (40 Sheets)',
      invoiceNumber = 'SHR-INV-2026-001',
      receiptNumber = 'SHR-REC-2026-001',
      paymentMethod = 'UPI / Bank Transfer',
      paymentRef = 'UPI-TXN-9898011223',
      rawPhotoCount = 1850,
      editedPhotoCount = 350,
      completedVideoCount = 2,
      albumStatus = 'Canvera Ultra-HD Print Complete',
      albumSheetsCount = 40,
      albumSize = '12x36 Flushmount',
      deliveryLink = 'https://gallery.shreejistudio.in/client/view',
      customNote = 'Thank you for your valuable association with Shreeji Studio.'
    } = options;

    const tplConfig = WHATSAPP_TEMPLATES.find(t => t.id === templateId) || WHATSAPP_TEMPLATES[0];
    let msg = tplConfig.templateText;

    const replacements: Record<string, string> = {
      '{{customer_name}}': customerName,
      '{{studio_name}}': studioName,
      '{{booking_id}}': bookingId,
      '{{event_name}}': eventName,
      '{{event_date}}': eventDate,
      '{{venue}}': venue,
      '{{final_amount}}': finalAmount.toLocaleString('en-IN'),
      '{{amount_received}}': amountReceived.toLocaleString('en-IN'),
      '{{remaining_balance}}': remainingBalance.toLocaleString('en-IN'),
      '{{quotation_id}}': quotationId,
      '{{quoted_amount}}': quotedAmount.toLocaleString('en-IN'),
      '{{discount_amount}}': discountAmount.toLocaleString('en-IN'),
      '{{discount_reason}}': discountReason,
      '{{services_list}}': servicesList,
      '{{invoice_number}}': invoiceNumber,
      '{{receipt_number}}': receiptNumber,
      '{{payment_method}}': paymentMethod,
      '{{payment_ref}}': paymentRef,
      '{{raw_photo_count}}': rawPhotoCount.toLocaleString('en-IN'),
      '{{edited_photo_count}}': editedPhotoCount.toLocaleString('en-IN'),
      '{{completed_video_count}}': completedVideoCount.toString(),
      '{{album_status}}': albumStatus,
      '{{album_sheets_count}}': albumSheetsCount.toString(),
      '{{album_size}}': albumSize,
      '{{delivery_link}}': deliveryLink,
      '{{custom_note}}': customNote
    };

    Object.entries(replacements).forEach(([placeholder, val]) => {
      msg = msg.split(placeholder).join(val);
    });

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;

    return {
      message: msg,
      waUrl
    };
  }
}

export const historyBookingsService = new HistoryBookingsService();
