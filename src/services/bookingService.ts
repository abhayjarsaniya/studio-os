import { TenantStore } from './tenantStore';
import { 
  StudioEvent, 
  SubEvent, 
  Customer, 
  DeliverablesConfig, 
  PaymentScheduleItem 
} from '../types';
import { customerService } from './customerService';
import { eventService } from './eventService';
import { subEventService } from './subEventService';
import { auditService } from './auditService';
import { quotationService } from './quotationService';

export interface CreateBookingData {
  // Step 1: Customer
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerWhatsApp?: string;
  customerEmail?: string;
  customerCity?: string;
  customerAddress?: string;

  // Step 2: Event
  eventName: string;
  category: string;
  startDate: string;
  startTime?: string;
  endDate: string;
  endTime?: string;
  venue: string;
  city: string;
  fullAddress?: string;
  googleMapsLocation?: string;
  notes?: string;

  // Multiple Sub-Events
  subEvents?: Array<{
    name: string;
    customCategory?: string;
    date: string;
    startTime: string;
    endTime: string;
    venue: string;
    address?: string;
    notes?: string;
  }>;

  // Step 3 & 4: Services & Deliverables
  deliverablesConfig: DeliverablesConfig;

  // Step 5: Pricing & Payment
  packagePrice: number;
  additionalServicesPrice?: number;
  discount?: number;
  taxAmount?: number;
  finalBookingAmount: number;
  advanceRequired: number;
  advanceReceived: number;
  paymentMethod?: string;
  paymentSchedule?: Array<{
    milestoneName: string;
    amount: number;
    dueDate: string;
  }>;

  // Status
  isDraft?: boolean;
}

export class BookingService {
  /**
   * Creates a complete Booking with Customer, Event, Sub-Events, Deliverables, and Payment Schedule.
   * Prevents duplicate customer creation.
   */
  createBooking(studioId: string, data: CreateBookingData, createdBy = 'Studio Owner'): {
    customer: Customer;
    event: StudioEvent;
    subEvents: SubEvent[];
  } {
    // 1. Resolve or Create Customer (no duplicates!)
    let customer: Customer;
    if (data.customerId) {
      const existing = customerService.getCustomer(studioId, data.customerId);
      if (existing) {
        customer = existing;
      } else {
        throw new Error(`Customer with ID ${data.customerId} not found`);
      }
    } else {
      // Check by phone number to avoid duplicates
      const allCusts = customerService.listCustomers(studioId);
      const cleanPhone = data.customerPhone.replace(/\D/g, '');
      const duplicate = allCusts.find(c => c.phone && c.phone.replace(/\D/g, '') === cleanPhone);

      if (duplicate) {
        customer = duplicate;
      } else {
        customer = customerService.createCustomer(studioId, {
          name: data.customerName.trim(),
          phone: data.customerPhone.trim(),
          alternatePhone: data.customerWhatsApp?.trim(),
          email: data.customerEmail?.trim() || undefined,
          city: data.customerCity?.trim() || data.city,
          address: data.customerAddress?.trim() || data.fullAddress,
          status: 'Active' as any,
          totalBookings: 1,
          totalSpent: data.advanceReceived || 0
        });
      }
    }

    // 2. Prepare Payment Schedule
    const paymentScheduleItems: PaymentScheduleItem[] = [];
    if (data.advanceRequired > 0) {
      paymentScheduleItems.push({
        id: `pay_sched_adv_${Date.now()}`,
        milestoneName: 'Booking Advance Deposit',
        amount: data.advanceRequired,
        dueDate: data.startDate,
        status: data.advanceReceived >= data.advanceRequired ? 'paid' : data.advanceReceived > 0 ? 'partial' : 'pending',
        paidAmount: data.advanceReceived || 0,
        paidDate: data.advanceReceived > 0 ? new Date().toISOString().split('T')[0] : undefined,
        paymentMethod: data.paymentMethod || 'UPI'
      });
    }

    if (data.paymentSchedule && data.paymentSchedule.length > 0) {
      data.paymentSchedule.forEach((ps, idx) => {
        paymentScheduleItems.push({
          id: `pay_sched_${Date.now()}_${idx}`,
          milestoneName: ps.milestoneName,
          amount: ps.amount,
          dueDate: ps.dueDate,
          status: 'pending',
          paidAmount: 0
        });
      });
    }

    // 3. Create Main Event
    const status = data.isDraft ? 'Draft' : 'Confirmed';
    const event = eventService.createEvent(studioId, {
      name: data.eventName.trim(),
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      category: data.category as any,
      startDate: data.startDate,
      startTime: data.startTime || '09:00',
      endDate: data.endDate || data.startDate,
      endTime: data.endTime || '22:00',
      venue: data.venue,
      venueCity: data.city,
      fullAddress: data.fullAddress,
      googleMapsLocation: data.googleMapsLocation,
      status: status as any,
      priority: 'High' as any,
      assignedTeamIds: [],
      createdBy: createdBy || 'Studio Owner',
      description: `Package: ${(data.deliverablesConfig as any).packageType || (data.deliverablesConfig as any).packageTier || 'Standard'}. Services: ${(data.deliverablesConfig.selectedServices || (data.deliverablesConfig as any).includedServices || []).join(', ')}`,
      notes: data.notes,
      totalStartDate: data.startDate,
      totalEndDate: data.endDate || data.startDate,
      overallVenue: data.venue,
      customerContact: customer.phone,
      estimatedBudget: data.finalBookingAmount,
      advancePaid: data.advanceReceived || 0,
      budget: data.finalBookingAmount,
      totalAmount: data.finalBookingAmount,
      paidAmount: data.advanceReceived || 0,
      deliverablesConfig: data.deliverablesConfig,
      paymentSchedule: paymentScheduleItems,
      deliverables: (data.deliverablesConfig as any).deliverables || [
        (data.deliverablesConfig as any).albumRequired ? `Album: ${(data.deliverablesConfig as any).albumType || 'Standard'} (${(data.deliverablesConfig as any).albumSheetsCount || 30} sheets)` : 'No Album',
        (data.deliverablesConfig as any).rawPhotosRequired ? 'Raw Photographs included' : 'Curated Edited Photographs',
        (data.deliverablesConfig as any).videoRequired ? 'Cinematic Highlights & Full Event Video' : 'Photography Only'
      ]
    });

    // 4. Create Sub-Events
    const createdSubEvents: SubEvent[] = [];
    if (data.subEvents && data.subEvents.length > 0) {
      data.subEvents.forEach((se, idx) => {
        const sub = subEventService.createSubEvent(studioId, {
          parentEventId: event.id,
          name: se.name,
          customCategory: se.customCategory || data.category,
          date: se.date,
          startTime: se.startTime,
          endTime: se.endTime,
          venue: se.venue,
          address: se.address || se.venue,
          notes: se.notes,
          status: 'Confirmed' as any,
          priority: 'High' as any,
          sortOrder: idx,
          requiredTeamSize: 2
        });
        createdSubEvents.push(sub);
      });
    }

    // 5. Update Customer stats
    customerService.updateCustomer(studioId, customer.id, {
      totalBookings: (customer.totalBookings || 0) + 1,
      totalSpent: (customer.totalSpent || 0) + (data.advanceReceived || 0)
    });

    auditService.log(
      studioId,
      createdBy,
      'CREATE_BOOKING',
      'event',
      event.id,
      {
        bookingAmount: data.finalBookingAmount,
        advance: data.advanceReceived,
        customerName: customer.name,
        packageType: data.deliverablesConfig.packageType
      }
    );

    return {
      customer,
      event: event as StudioEvent,
      subEvents: createdSubEvents
    };
  }

  /**
   * Converts an existing accepted Quotation directly into a confirmed Booking.
   * Avoids duplicate records and preserves deliverables.
   */
  convertQuotationToBooking(studioId: string, quotationId: string, advanceReceived = 0, paymentMethod = 'UPI'): {
    event: StudioEvent;
    customer: Customer;
  } {
    const quote = quotationService.getQuotation(studioId, quotationId);
    if (!quote) throw new Error(`Quotation "${quotationId}" not found`);

    const customer = customerService.getCustomer(studioId, quote.customerId);
    if (!customer) throw new Error(`Customer for quotation "${quotationId}" not found`);

    // Parse deliverables config from quotation notes or build fallback
    const deliverablesConfig: DeliverablesConfig = (quote as any).deliverablesConfig || {
      albumRequired: true,
      albumType: 'Premium Flush Mount',
      albumSheetsCount: 35,
      editedPhotosRequired: true,
      rawPhotosRequired: true,
      videoRequired: true,
      deliveryMethod: 'Cloud Gallery & Velvet Box USB',
      selectedServices: quote.items?.map(i => i.title || i.description) || ['Photography', 'Videography'],
      customDeliverables: [],
      packageType: 'Complete Wedding Package'
    };

    const bookingResult = this.createBooking(studioId, {
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      eventName: (quote as any).eventName || (quote as any).name || quote.title || `${customer.name} Celebration`,
      category: (quote as any).eventCategory || 'Wedding',
      startDate: (quote as any).eventDate || new Date().toISOString().split('T')[0],
      endDate: (quote as any).eventDate || new Date().toISOString().split('T')[0],
      venue: (quote as any).venue || 'Main Venue',
      city: customer.city || 'Ahmedabad',
      deliverablesConfig,
      packagePrice: quote.grandTotal || quote.totalAmount || quote.subtotal,
      finalBookingAmount: quote.grandTotal || quote.totalAmount || quote.subtotal,
      advanceRequired: Math.round((quote.grandTotal || quote.totalAmount || quote.subtotal) * 0.3),
      advanceReceived,
      paymentMethod
    });

    // Mark quotation converted
    quotationService.updateQuotation(studioId, quotationId, {
      status: 'Accepted' as any
    });

    auditService.log(
      studioId,
      'Studio Owner',
      'CONVERT_QUOTATION_TO_BOOKING',
      'quotation',
      quotationId,
      { linkedEventId: bookingResult.event.id, amount: quote.totalAmount }
    );

    return {
      event: bookingResult.event,
      customer
    };
  }
}

export const bookingService = new BookingService();
