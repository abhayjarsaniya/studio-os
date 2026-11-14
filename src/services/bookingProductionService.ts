import { TenantStore } from './tenantStore';
import { 
  BookingRecord, 
  BookingStatus, 
  BOOKING_STATUS_LABELS,
  FunctionPlan, 
  DeliverableSpecification, 
  DeliverableCategory,
  DeliveryPriority, 
  DeliveryStage, 
  DeadlineCalculationType,
  CustomerNoteRecord, 
  BookingVersionRecord, 
  BookingFinancialSummary,
  WhatsAppTemplateType, 
  WhatsAppMessagePayload 
} from '../types/bookingProduction';
import { StudioEvent, SubEvent, Customer, Employee, Task } from '../types/schema';
import { customerService } from './customerService';
import { eventService } from './eventService';
import { subEventService } from './subEventService';
import { taskService } from './taskService';
import { platformStudioService } from './platformStudioService';
import { platformAuditService } from './platformAuditService';
import { auditService } from './auditService';
import { bookingHistoryService } from './bookingHistoryService';
import { firestoreService } from './firestoreService';

export class BookingProductionService {
  private static BOOKINGS_COLLECTION = 'studio_bookings_v2';
  private static CUSTOMER_NOTES_COLLECTION = 'studio_customer_notes_v2';

  // Helper to get bookings list
  listBookings(studioId: string): BookingRecord[] {
    const raw = TenantStore.get(studioId, BookingProductionService.BOOKINGS_COLLECTION) as BookingRecord[];
    if (Array.isArray(raw) && raw.length > 0) return raw;

    // Seed initial demo booking if empty
    return this.seedDemoBookings(studioId);
  }

  // Get single booking
  getBooking(studioId: string, bookingId: string): BookingRecord | null {
    const list = this.listBookings(studioId);
    return list.find(b => b.id === bookingId || (b as any).bookingNumber === bookingId) || null;
  }

  // Save booking with full Firestore & StudioEvent synchronization
  saveBooking(studioId: string, booking: BookingRecord): void {
    const list = this.listBookings(studioId);
    const idx = list.findIndex(b => b.id === booking.id);
    if (idx >= 0) {
      list[idx] = booking;
    } else {
      list.unshift(booking);
    }
    TenantStore.set(studioId, BookingProductionService.BOOKINGS_COLLECTION, list);

    // 1. Sync corresponding StudioEvent in TenantStore
    try {
      const events = TenantStore.get<StudioEvent>(studioId, 'events') || [];
      const evIdx = events.findIndex(e => e.id === booking.id);
      const allAssignedIds = Array.from(new Set(
        (booking.functions || []).flatMap(fn => [
          ...(fn.assignedPhotographerIds || []),
          ...(fn.assignedVideographerIds || []),
          ...(fn.assignedDroneOperatorIds || []),
          ...(fn.assignedCrew || []).map(c => c.employeeId)
        ])
      ));

      const eventPayload: Partial<StudioEvent> = {
        id: booking.id,
        studioId,
        name: booking.eventName,
        title: booking.eventName,
        customerId: booking.customerId,
        customerName: booking.customerName,
        customerPhone: booking.customerPhone,
        category: booking.category as any,
        startDate: booking.mainEventDate || booking.startDate || new Date().toISOString().split('T')[0],
        endDate: (booking.functions && booking.functions.length > 0) ? booking.functions[booking.functions.length - 1].date : booking.mainEventDate,
        venue: booking.venue,
        venueCity: booking.city,
        status: (booking.status === 'completed' || booking.status === 'fully_delivered' ? 'Completed' : booking.status === 'cancelled' ? 'Cancelled' : 'Confirmed') as any,
        assignedTeamIds: allAssignedIds,
        estimatedBudget: booking.financials?.finalAgreedAmount || booking.financials?.originalQuotation || 0,
        advancePaid: booking.financials?.verifiedPaymentsReceived || booking.financials?.advanceReceived || 0,
        deliverables: (booking.deliverables || []).map(d => d.name),
        updatedAt: new Date().toISOString()
      };

      if (evIdx >= 0) {
        events[evIdx] = { ...events[evIdx], ...eventPayload };
      } else {
        events.unshift({
          eventNumber: `EVT-${booking.bookingNumber}`,
          priority: 'High',
          startTime: '10:00',
          endTime: '18:00',
          ...eventPayload
        } as StudioEvent);
      }
      TenantStore.set(studioId, 'events', events);
    } catch (e) {
      console.warn('[saveBooking] Event sync note:', e);
    }

    // 2. Background Firestore write
    const isTestRunner = typeof process !== 'undefined' && Boolean(process.env?.VITEST || process.env?.NODE_ENV === 'test');
    if (!isTestRunner) {
      firestoreService.saveDocument(studioId, 'bookings', booking.id, booking).catch(err => {
        console.warn(`[bookingProductionService.saveBooking] Firestore save note:`, err);
      });
      // Subcollections
      (booking.deliverables || []).forEach(del => {
        firestoreService.saveDocument(studioId, `bookings/${booking.id}/deliverables`, del.id, del).catch(() => {});
      });
      (booking.functions || []).forEach(fn => {
        firestoreService.saveDocument(studioId, `bookings/${booking.id}/subEvents`, fn.id, fn).catch(() => {});
        (fn.assignedCrew || []).forEach(c => {
          firestoreService.saveDocument(studioId, `bookings/${booking.id}/assignments`, `asgn_${booking.id}_${fn.id}_${c.employeeId}`, {
            assignmentId: `asgn_${booking.id}_${fn.id}_${c.employeeId}`,
            studioId,
            bookingId: booking.id,
            subEventId: fn.id,
            employeeId: c.employeeId,
            employeeName: c.employeeName,
            role: c.role,
            assignedAt: new Date().toISOString(),
            assignedBy: 'Studio Owner',
            assignmentStatus: 'confirmed'
          }).catch(() => {});
        });
      });
    }
  }

  // Delete booking and related references
  deleteBooking(studioId: string, bookingId: string): boolean {
    const list = this.listBookings(studioId);
    const updated = list.filter(b => b.id !== bookingId);
    TenantStore.set(studioId, BookingProductionService.BOOKINGS_COLLECTION, updated);

    const events = TenantStore.get<StudioEvent>(studioId, 'events') || [];
    TenantStore.set(studioId, 'events', events.filter(e => e.id !== bookingId));

    const isTestRunner = typeof process !== 'undefined' && Boolean(process.env?.VITEST || process.env?.NODE_ENV === 'test');
    if (!isTestRunner) {
      firestoreService.deleteDocument(studioId, 'bookings', bookingId).catch(() => {});
      firestoreService.deleteDocument(studioId, 'events', bookingId).catch(() => {});
    }
    return true;
  }

  // ==========================================
  // 1. FLEXIBLE DELIVERY DEADLINE CALCULATION ENGINE
  // ==========================================
  calculateDeadline(options: {
    baseDate: string; // Shoot or Function date (YYYY-MM-DD)
    deadlineType: DeadlineCalculationType;
    days?: number;
    isWorkingDays?: boolean;
    weddingDate?: string;
  }): string {
    const { baseDate, deadlineType, days = 0, isWorkingDays = false, weddingDate } = options;

    if (deadlineType === 'same_day') {
      return baseDate;
    }

    if (deadlineType === 'specific_date') {
      return baseDate;
    }

    let targetDateObj: Date;

    if (deadlineType === 'relative_to_main_wedding' && weddingDate) {
      targetDateObj = new Date(weddingDate);
    } else {
      targetDateObj = new Date(baseDate);
    }

    if (isNaN(targetDateObj.getTime())) {
      targetDateObj = new Date();
    }

    if (!isWorkingDays) {
      targetDateObj.setDate(targetDateObj.getDate() + days);
    } else {
      // Add working days (skip Sat/Sun)
      let added = 0;
      const step = days >= 0 ? 1 : -1;
      const targetAbs = Math.abs(days);

      while (added < targetAbs) {
        targetDateObj.setDate(targetDateObj.getDate() + step);
        const dayOfWeek = targetDateObj.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          added++;
        }
      }
    }

    return targetDateObj.toISOString().slice(0, 10);
  }

  // Recalculate deadlines on event date shift
  recalculateDeadlinesOnDateShift(
    studioId: string, 
    bookingId: string, 
    newWeddingDate: string, 
    preserveManualOverrides = true
  ): { affectedCount: number; updatedBooking: BookingRecord } {
    const booking = this.getBooking(studioId, bookingId);
    if (!booking) throw new Error(`Booking ${bookingId} not found`);

    booking.mainEventDate = newWeddingDate;
    let affectedCount = 0;

    booking.deliverables = booking.deliverables.map(del => {
      if (del.isManuallyLocked && preserveManualOverrides) {
        return del;
      }

      if (del.deadlineType === 'relative_to_main_wedding') {
        const newDeadline = this.calculateDeadline({
          baseDate: booking.mainEventDate,
          deadlineType: 'relative_to_main_wedding',
          days: del.deadlineDays || 0,
          isWorkingDays: del.isWorkingDays,
          weddingDate: newWeddingDate
        });
        affectedCount++;
        return {
          ...del,
          calculatedDeadline: newDeadline
        };
      }
      return del;
    });

    booking.updatedAt = new Date().toISOString();
    this.saveBooking(studioId, booking);
    return { affectedCount, updatedBooking: booking };
  }

  // ==========================================
  // 2. COMPLETE BOOKING WORKSPACE & LIFECYCLE
  // ==========================================
  createBooking(studioId: string, data: {
    customerId: string;
    customerName: string;
    customerPhone: string;
    customerWhatsApp?: string;
    customerEmail?: string;
    customerAddress?: string;
    eventName: string;
    category: string;
    mainEventDate: string;
    venue: string;
    city: string;
    description?: string;
    numberOfDays?: number;
    numberOfFunctions?: number;
    functions?: Array<{
      name: string;
      category?: string;
      date: string;
      startTime?: string;
      endTime?: string;
      venue?: string;
      deliverablesConfig?: Partial<DeliverableSpecification>[];
    }>;
    initialQuotationAmount?: number;
    originalQuotation?: number;
    advanceRequired?: number;
    advanceReceived?: number;
    createdBy?: string;
  }): BookingRecord {
    const bookingId = `bkg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const bookingNumber = `BKG-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const functions: FunctionPlan[] = [];
    const allDeliverables: DeliverableSpecification[] = [];

    // Construct functions and child deliverables
    (data.functions || []).forEach((fn, fIdx) => {
      const functionId = `fn_${bookingId}_${fIdx + 1}`;
      const fnDeliverables: DeliverableSpecification[] = [];

      (fn.deliverablesConfig || []).forEach((delCfg, dIdx) => {
        const delId = `del_${functionId}_${dIdx + 1}`;
        const deadline = this.calculateDeadline({
          baseDate: fn.date || data.mainEventDate,
          deadlineType: delCfg.deadlineType || 'relative_to_shoot',
          days: delCfg.deadlineDays ?? 2,
          isWorkingDays: delCfg.isWorkingDays,
          weddingDate: data.mainEventDate
        });

        const spec: DeliverableSpecification = {
          id: delId,
          bookingId,
          functionId,
          functionName: fn.name,
          name: delCfg.name || `${fn.name} Edited Photos`,
          category: delCfg.category || 'photography',
          requiredQty: delCfg.requiredQty || 100,
          completedQty: 0,
          unit: delCfg.unit || 'photos',
          photoCount: delCfg.photoCount,
          videoCount: delCfg.videoCount,
          reelCount: delCfg.reelCount,
          albumSize: delCfg.albumSize,
          sheetCount: delCfg.sheetCount,
          deliveryMethod: delCfg.deliveryMethod || 'Google Drive',
          specialInstructions: delCfg.specialInstructions,
          deadlineType: delCfg.deadlineType || 'relative_to_shoot',
          deadlineDays: delCfg.deadlineDays ?? 2,
          calculatedDeadline: delCfg.calculatedDeadline || deadline,
          priority: delCfg.priority || 'normal',
          stage: 'not_started',
          isDelivered: false,
          isPartiallyDelivered: false
        };

        fnDeliverables.push(spec);
        allDeliverables.push(spec);
      });

      functions.push({
        id: functionId,
        bookingId,
        name: fn.name,
        category: fn.category || data.category,
        date: fn.date || data.mainEventDate,
        startTime: fn.startTime || '09:00 AM',
        endTime: fn.endTime || '02:00 PM',
        venue: fn.venue || data.venue,
        city: data.city,
        assignedPhotographerIds: [],
        assignedVideographerIds: [],
        assignedDroneOperatorIds: [],
        assignedEditorIds: [],
        assignedSupplierIds: [],
        deliverables: fnDeliverables,
        priority: 'normal',
        status: 'scheduled'
      });
    });

    const agreedPrice = data.initialQuotationAmount ?? data.originalQuotation ?? 150000;
    const advancePaid = data.advanceReceived || 0;

    const record: BookingRecord = {
      id: bookingId,
      studioId,
      bookingNumber,
      status: advancePaid > 0 ? 'deal_confirmed' : 'new_inquiry',
      customerId: data.customerId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerWhatsApp: data.customerWhatsApp || data.customerPhone,
      customerEmail: data.customerEmail,
      customerAddress: data.customerAddress,
      eventName: data.eventName,
      category: data.category,
      mainEventDate: data.mainEventDate,
      venue: data.venue,
      city: data.city,
      description: data.description,
      numberOfDays: data.numberOfDays || 1,
      numberOfFunctions: functions.length || 1,
      functions,
      deliverables: allDeliverables,
      financials: {
        originalQuotation: agreedPrice,
        negotiatedDiscount: 0,
        finalAgreedAmount: agreedPrice,
        verifiedPaymentsReceived: advancePaid,
        remainingBalance: Math.max(0, agreedPrice - advancePaid),
        advanceRequired: data.advanceRequired || Math.round(agreedPrice * 0.3),
        advanceReceived: advancePaid,
        advanceReceivedDate: advancePaid > 0 ? new Date().toISOString() : undefined,
        isAdvanceConfirmed: advancePaid > 0,
        paymentMilestones: [
          {
            id: `m_${bookingId}_adv`,
            title: 'Booking Advance (Token)',
            percentage: 30,
            amount: Math.round(agreedPrice * 0.3),
            dueDate: data.mainEventDate,
            status: advancePaid > 0 ? 'paid' : 'pending',
            paidAmount: advancePaid
          },
          {
            id: `m_${bookingId}_shoot`,
            title: 'On Shoot Date Payment',
            percentage: 50,
            amount: Math.round(agreedPrice * 0.5),
            dueDate: data.mainEventDate,
            status: 'pending',
            paidAmount: 0
          },
          {
            id: `m_${bookingId}_delivery`,
            title: 'Final Album & Deliverables Handover',
            percentage: 20,
            amount: Math.round(agreedPrice * 0.2),
            dueDate: this.calculateDeadline({ baseDate: data.mainEventDate, deadlineType: 'relative_to_shoot', days: 30 }),
            status: 'pending',
            paidAmount: 0
          }
        ]
      },
      billingVersions: [
        {
          id: `bver_${bookingId}_1`,
          bookingId,
          versionNumber: 1,
          originalQuotedAmount: agreedPrice,
          negotiatedDiscount: 0,
          deliverablesAdjustment: 0,
          finalAgreedAmount: agreedPrice,
          negotiationReason: 'Initial Booking Creation',
          approvedBy: data.createdBy || 'Studio Owner',
          dateOfChange: new Date().toISOString()
        }
      ],
      notes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: data.createdBy || 'Studio Owner'
    };

    this.saveBooking(studioId, record);
    return record;
  }

  // Update Booking Status
  updateBookingStatus(studioId: string, bookingId: string, status: BookingStatus, notes?: string): BookingRecord {
    const booking = this.getBooking(studioId, bookingId);
    if (!booking) throw new Error(`Booking ${bookingId} not found`);

    booking.status = status;
    booking.updatedAt = new Date().toISOString();

    if (notes) {
      booking.notes.push({
        id: `note_${Date.now()}`,
        studioId,
        customerId: booking.customerId,
        bookingId: booking.id,
        noteType: 'booking',
        title: `Status updated to ${BOOKING_STATUS_LABELS[status] || status}`,
        content: notes,
        isPrivate: false,
        createdBy: 'Studio Owner',
        createdByName: 'Studio Owner',
        createdAt: new Date().toISOString()
      });
    }

    this.saveBooking(studioId, booking);
    return booking;
  }

  confirmDeal(studioId: string, bookingId: string, advanceAmount?: number): BookingRecord {
    const booking = this.getBooking(studioId, bookingId);
    if (!booking) throw new Error(`Booking ${bookingId} not found`);

    if (advanceAmount && advanceAmount > 0) {
      this.recordBookingPayment(studioId, bookingId, {
        amount: advanceAmount,
        paymentMethod: 'UPI',
        isAdvance: true,
        reference: `ADV-${booking.bookingNumber}`,
        receivedBy: 'Studio Owner'
      });
      const updated = this.getBooking(studioId, bookingId)!;
      updated.status = 'advance_received';
      this.saveBooking(studioId, updated);
      return updated;
    } else {
      booking.status = 'deal_confirmed';
      this.saveBooking(studioId, booking);
      return booking;
    }
  }

  addFunctionPlan(studioId: string, bookingId: string, fnData: Partial<FunctionPlan> & { name: string }): FunctionPlan {
    const booking = this.getBooking(studioId, bookingId);
    if (!booking) throw new Error(`Booking ${bookingId} not found`);

    const fnId = fnData.id || `fn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newFn: FunctionPlan = {
      id: fnId,
      bookingId,
      name: fnData.name,
      category: fnData.category || booking.category,
      date: fnData.date || booking.mainEventDate,
      startTime: fnData.startTime || '09:00 AM',
      endTime: fnData.endTime || '02:00 PM',
      venue: fnData.venue || booking.venue,
      city: fnData.city || booking.city,
      address: fnData.address,
      assignedPhotographerIds: fnData.assignedPhotographerIds || [],
      assignedVideographerIds: fnData.assignedVideographerIds || [],
      assignedDroneOperatorIds: fnData.assignedDroneOperatorIds || [],
      assignedEditorIds: fnData.assignedEditorIds || [],
      assignedSupplierIds: fnData.assignedSupplierIds || [],
      deliverables: fnData.deliverables || [],
      photographyRequirements: fnData.photographyRequirements,
      editingRequirements: fnData.editingRequirements,
      priority: fnData.priority || 'normal',
      status: fnData.status || 'scheduled',
      notes: fnData.notes
    };

    booking.functions.push(newFn);
    booking.numberOfFunctions = booking.functions.length;
    this.saveBooking(studioId, booking);
    return newFn;
  }

  addDeliverable(studioId: string, bookingId: string, deliverableData: Partial<DeliverableSpecification> & { name: string; category: DeliverableCategory }): DeliverableSpecification {
    const booking = this.getBooking(studioId, bookingId);
    if (!booking) throw new Error(`Booking ${bookingId} not found`);

    const delId = deliverableData.id || `del_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const deadlineType = deliverableData.deadlineType || 'relative_to_shoot';
    const deadlineDays = deliverableData.deadlineDays !== undefined ? deliverableData.deadlineDays : (deadlineType === 'same_day' ? 0 : 3);
    const baseDate = deliverableData.functionId 
      ? (booking.functions.find(f => f.id === deliverableData.functionId)?.date || booking.mainEventDate)
      : booking.mainEventDate;

    const calculatedDeadline = deliverableData.calculatedDeadline || this.calculateDeadline({
      baseDate,
      weddingDate: booking.mainEventDate,
      deadlineType,
      days: deadlineDays,
      isWorkingDays: deliverableData.isWorkingDays
    });

    const newDel: DeliverableSpecification = {
      id: delId,
      bookingId,
      functionId: deliverableData.functionId,
      functionName: deliverableData.functionName,
      name: deliverableData.name,
      category: deliverableData.category,
      requiredQty: deliverableData.requiredQty || 1,
      completedQty: deliverableData.completedQty || 0,
      unit: deliverableData.unit || 'photos',
      photoCount: deliverableData.photoCount,
      videoCount: deliverableData.videoCount,
      reelCount: deliverableData.reelCount,
      albumSize: deliverableData.albumSize,
      sheetCount: deliverableData.sheetCount,
      printSize: deliverableData.printSize,
      fileFormat: deliverableData.fileFormat,
      resolution: deliverableData.resolution,
      deliveryMethod: deliverableData.deliveryMethod || 'Google Drive',
      specialInstructions: deliverableData.specialInstructions,
      deadlineType,
      deadlineDays,
      calculatedDeadline,
      isWorkingDays: deliverableData.isWorkingDays,
      isManuallyLocked: deliverableData.isManuallyLocked,
      priority: deliverableData.priority || 'normal',
      stage: deliverableData.stage || 'not_started',
      assignedEmployeeId: deliverableData.assignedEmployeeId,
      assignedEmployeeName: deliverableData.assignedEmployeeName,
      isPartiallyDelivered: deliverableData.isPartiallyDelivered || false,
      isDelivered: deliverableData.isDelivered || false
    };

    booking.deliverables.push(newDel);
    if (deliverableData.functionId) {
      const fn = booking.functions.find(f => f.id === deliverableData.functionId);
      if (fn) fn.deliverables.push(newDel);
    }
    this.saveBooking(studioId, booking);
    return newDel;
  }

  negotiateBookingBilling(studioId: string, bookingId: string, adjustment: {
    negotiatedDiscount?: number;
    newFinalAmount?: number;
    deliverablesAdjustment?: number;
    reason: string;
    approvedBy: string;
  }): BookingRecord {
    return this.adjustNegotiatedBilling(studioId, bookingId, adjustment);
  }

  // ==========================================
  // 3. NEGOTIATED BILLING & FINANCIAL LEDGER
  // ==========================================
  adjustNegotiatedBilling(studioId: string, bookingId: string, adjustment: {
    negotiatedDiscount?: number;
    newFinalAmount?: number;
    deliverablesAdjustment?: number;
    reason: string;
    approvedBy: string;
  }): BookingRecord {
    const booking = this.getBooking(studioId, bookingId);
    if (!booking) throw new Error(`Booking ${bookingId} not found`);

    const origQuotation = booking.financials.originalQuotation;
    const discount = adjustment.negotiatedDiscount !== undefined 
      ? adjustment.negotiatedDiscount 
      : (adjustment.newFinalAmount !== undefined ? Math.max(0, origQuotation - adjustment.newFinalAmount) : booking.financials.negotiatedDiscount);

    const deliverablesAdj = adjustment.deliverablesAdjustment || 0;
    const finalAmount = adjustment.newFinalAmount !== undefined
      ? adjustment.newFinalAmount
      : Math.max(0, origQuotation - discount + deliverablesAdj);

    const received = booking.financials.verifiedPaymentsReceived;
    const remaining = Math.max(0, finalAmount - received);

    booking.financials.negotiatedDiscount = discount;
    booking.financials.finalAgreedAmount = finalAmount;
    booking.financials.remainingBalance = remaining;

    const nextVerNumber = booking.billingVersions.length + 1;
    const versionRecord: BookingVersionRecord = {
      id: `bver_${booking.id}_${nextVerNumber}`,
      bookingId: booking.id,
      versionNumber: nextVerNumber,
      originalQuotedAmount: origQuotation,
      negotiatedDiscount: discount,
      deliverablesAdjustment: deliverablesAdj,
      finalAgreedAmount: finalAmount,
      negotiationReason: adjustment.reason || 'Client Package Negotiation',
      approvedBy: adjustment.approvedBy || 'Studio Owner',
      dateOfChange: new Date().toISOString()
    };

    booking.billingVersions.unshift(versionRecord);
    booking.updatedAt = new Date().toISOString();

    this.saveBooking(studioId, booking);
    return booking;
  }

  // Alias for recordBookingPayment
  recordPayment(studioId: string, options: {
    bookingId: string;
    amount: number;
    paymentMethod: any;
    reference?: string;
    isAdvance?: boolean;
  }): { payment: any; booking: BookingRecord } {
    return this.recordBookingPayment(studioId, options.bookingId, options);
  }

  // Record verified customer payment
  recordBookingPayment(studioId: string, bookingId: string, payment: {
    amount: number;
    paymentMethod: 'UPI' | 'Bank Transfer' | 'Cash' | 'Card';
    reference?: string;
    isAdvance?: boolean;
    receivedBy?: string;
  }): { payment: any; booking: BookingRecord } {
    const booking = this.getBooking(studioId, bookingId);
    if (!booking) throw new Error(`Booking ${bookingId} not found`);

    const verifiedAmount = Number(payment.amount) || 0;
    if (verifiedAmount <= 0) throw new Error('Payment amount must be greater than zero');

    // Prevent duplicate payments: create real ledger payment in TenantStore
    const paymentRecord = {
      id: `pay_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      studioId,
      bookingId: booking.id,
      customerId: booking.customerId,
      amount: verifiedAmount,
      method: payment.paymentMethod,
      reference: payment.reference || `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
      paymentDate: new Date().toISOString(),
      isVerified: true,
      receivedBy: payment.receivedBy || 'Studio Owner'
    };

    const existingPayments = (TenantStore.get(studioId, 'payments') as any[]) || [];
    TenantStore.set(studioId, 'payments', [paymentRecord, ...existingPayments]);

    // Recalculate balances
    const previousBalance = booking.financials.remainingBalance;
    booking.financials.verifiedPaymentsReceived += verifiedAmount;
    booking.financials.remainingBalance = Math.max(0, booking.financials.finalAgreedAmount - booking.financials.verifiedPaymentsReceived);
    const newBalance = booking.financials.remainingBalance;

    // Automatically record payment in complete customer booking history
    bookingHistoryService.recordPaymentHistory(studioId, booking.id, {
      customerId: booking.customerId,
      paymentId: paymentRecord.id,
      amount: verifiedAmount,
      paymentMethod: payment.paymentMethod,
      reference: paymentRecord.reference,
      receiptNumber: `REC-${booking.bookingNumber}-${existingPayments.length + 1}`,
      previousBalance,
      newBalance,
      note: (payment as any).note || (payment as any).notes,
      recordedBy: payment.receivedBy || 'Studio Owner',
      date: paymentRecord.paymentDate
    });

    if (payment.isAdvance) {
      booking.financials.advanceReceived += verifiedAmount;
      booking.financials.isAdvanceConfirmed = true;
      booking.financials.advanceReceivedDate = new Date().toISOString();
      if (booking.status === 'new_inquiry' || booking.status === 'deal_confirmed') {
        booking.status = 'advance_received';
      }
    }

    booking.updatedAt = new Date().toISOString();
    this.saveBooking(studioId, booking);

    // Return booking with payment metadata for maximum compatibility
    const resBooking = Object.assign(booking, { 
      payment: paymentRecord,
      booking: booking 
    });
    return resBooking as unknown as { payment: any; booking: BookingRecord } & BookingRecord;
  }

  // ==========================================
  // 4. DELIVERY CHECKLIST & STAGE TRACKING
  // ==========================================
  listDeliverables(studioId: string, filter?: {
    bookingId?: string;
    priority?: DeliveryPriority;
    stage?: DeliveryStage;
  }): DeliverableSpecification[] {
    const bookings = this.listBookings(studioId);
    let all: DeliverableSpecification[] = [];
    bookings.forEach(b => {
      all = all.concat(b.deliverables || []);
    });

    return all.filter(del => {
      if (filter?.bookingId && del.bookingId !== filter.bookingId) return false;
      if (filter?.priority && del.priority !== filter.priority) return false;
      if (filter?.stage && del.stage !== filter.stage) return false;
      return true;
    });
  }

  updateDeliverableStage(studioId: string, bookingId: string, deliverableId: string, update: {
    stage: DeliveryStage;
    completedQty?: number;
    assignedEmployeeId?: string;
    assignedEmployeeName?: string;
    fileLinkRef?: string;
    verifiedBy?: string;
    deliveryNotes?: string;
  }): DeliverableSpecification {
    const booking = this.getBooking(studioId, bookingId);
    if (!booking) throw new Error(`Booking ${bookingId} not found`);

    const del = booking.deliverables.find(d => d.id === deliverableId);
    if (!del) throw new Error(`Deliverable ${deliverableId} not found`);

    del.stage = update.stage;
    if (update.completedQty !== undefined) {
      del.completedQty = update.completedQty;
    }
    if (update.assignedEmployeeId) del.assignedEmployeeId = update.assignedEmployeeId;
    if (update.assignedEmployeeName) del.assignedEmployeeName = update.assignedEmployeeName;
    if (update.fileLinkRef) del.fileLinkRef = update.fileLinkRef;
    if (update.verifiedBy) del.verifiedBy = update.verifiedBy;
    if (update.deliveryNotes) del.deliveryNotes = update.deliveryNotes;

    // Partial delivery vs full delivery
    if (del.completedQty > 0 && del.completedQty < del.requiredQty) {
      del.isPartiallyDelivered = true;
      del.isDelivered = false;
    } else if (del.completedQty >= del.requiredQty || update.stage === 'delivered' || update.stage === 'customer_confirmation') {
      del.isPartiallyDelivered = false;
      del.isDelivered = true;
      del.completedDate = new Date().toISOString();
      if (del.completedQty === 0) del.completedQty = del.requiredQty;

      // Automatically add history entry for delivery
      bookingHistoryService.addHistoryItem(studioId, {
        bookingId: booking.id,
        customerId: booking.customerId,
        activityType: 'delivery_recorded',
        title: `Delivery Handover — ${del.name}`,
        description: `Delivered ${del.completedQty || del.requiredQty} ${del.unit || 'units'} via ${del.deliveryMethod || 'Google Drive'}.${update.deliveryNotes ? ' Note: ' + update.deliveryNotes : ''}`,
        relatedRecordId: del.id,
        relatedFunctionId: del.functionId,
        quantity: del.completedQty || del.requiredQty,
        performedBy: update.assignedEmployeeId || 'owner',
        performedByName: update.assignedEmployeeName || update.verifiedBy || 'Studio Owner'
      });
    }

    // Check parent booking delivery state
    const allDelivered = booking.deliverables.every(d => d.isDelivered);
    const anyDelivered = booking.deliverables.some(d => d.isDelivered || d.isPartiallyDelivered);

    if (allDelivered) {
      booking.status = 'fully_delivered';
    } else if (anyDelivered) {
      booking.status = 'partially_delivered';
    }

    booking.updatedAt = new Date().toISOString();
    this.saveBooking(studioId, booking);

    return del;
  }

  // ==========================================
  // 5. TASK AUTO-GENERATION (IDEMPOTENT)
  // ==========================================
  generateTasksFromDeliverable(studioId: string, bookingId: string, deliverableId: string): Task[] {
    const booking = this.getBooking(studioId, bookingId);
    if (!booking) throw new Error(`Booking ${bookingId} not found`);

    const del = booking.deliverables.find(d => d.id === deliverableId);
    if (!del) throw new Error(`Deliverable ${deliverableId} not found`);

    const existingTasks = (TenantStore.get(studioId, 'tasks') as Task[]) || [];
    const prefix = `del_${del.id}`;

    // Prevent duplicate task generation
    const alreadyExists = existingTasks.some(t => t.id.startsWith(prefix));
    if (alreadyExists) {
      return existingTasks.filter(t => t.id.startsWith(prefix));
    }

    const taskTitles = [
      `[Data Backup] ${del.name}`,
      `[Selection & Culling] ${del.name}`,
      `[Editing & Retouching] ${del.name}`,
      `[Quality Check & Approval] ${del.name}`,
      `[Customer Delivery & Handover] ${del.name}`
    ];

    const newTasks: Task[] = taskTitles.map((title, idx) => ({
      id: `${prefix}_step_${idx + 1}`,
      studioId,
      title,
      description: `Production task for ${del.name}. Required: ${del.requiredQty} ${del.unit}. Target deadline: ${del.calculatedDeadline}`,
      status: idx === 0 ? 'To Do' : 'Pending',
      priority: del.priority === 'instant_same_day' || del.priority === 'urgent' ? 'High' : 'Medium',
      dueDate: del.calculatedDeadline,
      eventId: booking.id,
      assignedTo: del.assignedEmployeeId || 'unassigned',
      assignedToName: del.assignedEmployeeName || 'Unassigned',
      createdAt: new Date().toISOString()
    } as unknown as Task));

    TenantStore.set(studioId, 'tasks', [...newTasks, ...existingTasks]);
    return newTasks;
  }

  syncTasksForBooking(studioId: string, bookingId: string): Task[] {
    const booking = this.getBooking(studioId, bookingId);
    if (!booking) throw new Error(`Booking ${bookingId} not found`);
    let allTasks: Task[] = [];
    (booking.deliverables || []).forEach(d => {
      const generated = this.generateTasksFromDeliverable(studioId, bookingId, d.id);
      allTasks = allTasks.concat(generated);
    });
    return allTasks;
  }

  recalculateDeliverableDeadlines(studioId: string, bookingId: string, shiftDays: number): {
    affectedCount: number;
    preservedManualLocksCount: number;
  } {
    const booking = this.getBooking(studioId, bookingId);
    if (!booking) throw new Error(`Booking ${bookingId} not found`);

    let affectedCount = 0;
    let preservedManualLocksCount = 0;

    booking.deliverables.forEach(d => {
      if (d.isManuallyLocked) {
        preservedManualLocksCount++;
      } else {
        const curDate = new Date(d.calculatedDeadline);
        curDate.setDate(curDate.getDate() + shiftDays);
        d.calculatedDeadline = curDate.toISOString().slice(0, 10);
        affectedCount++;
      }
    });

    this.saveBooking(studioId, booking);
    return { affectedCount, preservedManualLocksCount };
  }

  // ==========================================
  // 6. CUSTOMER NOTES MANAGEMENT (STRICT PRIVACY)
  // ==========================================
  addCustomerNote(studioId: string, note: {
    customerId: string;
    bookingId?: string;
    functionId?: string;
    noteType: 'internal_private' | 'booking' | 'function' | 'payment' | 'delivery' | 'customer_communication';
    title: string;
    content: string;
    isPrivate?: boolean;
    createdBy?: string;
  }): CustomerNoteRecord {
    const noteRecord: CustomerNoteRecord = {
      id: `cnote_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      studioId,
      customerId: note.customerId,
      bookingId: note.bookingId,
      functionId: note.functionId,
      noteType: note.noteType,
      title: note.title,
      content: note.content,
      isPrivate: note.isPrivate ?? (note.noteType === 'internal_private'),
      createdBy: note.createdBy || 'Studio Owner',
      createdByName: 'Studio Owner',
      createdAt: new Date().toISOString()
    };

    const notes = (TenantStore.get(studioId, BookingProductionService.CUSTOMER_NOTES_COLLECTION) as CustomerNoteRecord[]) || [];
    TenantStore.set(studioId, BookingProductionService.CUSTOMER_NOTES_COLLECTION, [noteRecord, ...notes]);

    // Also link note inside booking if bookingId provided
    if (note.bookingId) {
      const booking = this.getBooking(studioId, note.bookingId);
      if (booking) {
        booking.notes.unshift(noteRecord);
        this.saveBooking(studioId, booking);

        // Automatically log note into booking history
        bookingHistoryService.addHistoryItem(studioId, {
          bookingId: note.bookingId,
          customerId: note.customerId,
          activityType: 'note_added',
          title: note.isPrivate ? 'Internal Note Added' : 'Customer Note Added',
          description: `${note.title}: ${note.content}`,
          relatedRecordId: noteRecord.id,
          relatedFunctionId: note.functionId,
          performedBy: 'owner',
          performedByName: note.createdBy || 'Studio Owner'
        });
      }
    }

    return noteRecord;
  }

  listCustomerNotes(studioId: string, customerId: string, includePrivate = true): CustomerNoteRecord[] {
    const notes = (TenantStore.get(studioId, BookingProductionService.CUSTOMER_NOTES_COLLECTION) as CustomerNoteRecord[]) || [];
    return notes.filter(n => {
      if (n.customerId !== customerId) return false;
      if (!includePrivate && n.isPrivate) return false;
      return true;
    });
  }

  // ==========================================
  // 7. WHATSAPP CLICK-TO-CHAT SUMMARY GENERATORS
  // ==========================================
  generateWhatsAppCustomerMessage(
    studioId: string, 
    booking: BookingRecord, 
    templateType: WhatsAppTemplateType, 
    includeFinancials: boolean
  ): WhatsAppMessagePayload {
    const studioProfile = TenantStore.getSingle<any>(studioId, 'profile');
    const studioName = studioProfile?.name || 'Studio OS';
    const customerName = booking.customerName || 'Valued Client';
    const phone = (booking.customerWhatsApp || booking.customerPhone).replace(/[^0-9]/g, '');

    const deliverablesList = (booking.deliverables || []).map(d => `- ${d.name} (${d.requiredQty} ${d.unit}) [Due: ${d.calculatedDeadline}]`).join('\n');
    const completedDeliverables = (booking.deliverables || []).filter(d => d.isDelivered).map(d => `✓ ${d.name} (${d.completedQty} ${d.unit})`).join('\n') || 'None completed yet';
    const pendingDeliverables = (booking.deliverables || []).filter(d => !d.isDelivered).map(d => `• ${d.name} (Remaining: ${d.requiredQty - d.completedQty} ${d.unit}) [Due: ${d.calculatedDeadline}]`).join('\n') || 'All items delivered!';

    let messageText = '';

    switch (templateType) {
      case 'quotation_summary':
        messageText = `Hello ${customerName},\n\nHere is your photography quotation summary from ${studioName}:\n\nEvent: ${booking.eventName}\nDate: ${booking.mainEventDate}\nVenue: ${booking.venue}, ${booking.city}\n\nDeliverables:\n${deliverablesList}`;
        if (includeFinancials && booking.financials) {
          messageText += `\n\nQuotation Details:\nOriginal Package: ₹${(booking.financials.originalQuotation || 0).toLocaleString('en-IN')}\nNegotiated Discount: ₹${(booking.financials.negotiatedDiscount || 0).toLocaleString('en-IN')}\nFinal Agreed Amount: ₹${(booking.financials.finalAgreedAmount || 0).toLocaleString('en-IN')}`;
        }
        messageText += `\n\nThank you for choosing ${studioName}!`;
        break;

      case 'payment_summary':
        messageText = `Hello ${customerName},\n\nPayment Receipt & Ledger update from ${studioName}:\n\nEvent: ${booking.eventName}\nTotal Agreed: ₹${(booking.financials?.finalAgreedAmount || 0).toLocaleString('en-IN')}\nPayments Received: ₹${(booking.financials?.verifiedPaymentsReceived || 0).toLocaleString('en-IN')}\nRemaining Balance: ₹${(booking.financials?.remainingBalance || 0).toLocaleString('en-IN')}\n\nThank you for your payment!`;
        break;

      case 'booking_confirmation':
        messageText = `Hello ${customerName},\n\nBooking Confirmation with ${studioName}!\n\nYour photography booking is confirmed.\n\nEvent: ${booking.eventName}\nDate: ${booking.mainEventDate}\nVenue: ${booking.venue}, ${booking.city}\n\nIncluded Functions:\n${booking.functions.map(f => `• ${f.name} on ${f.date} (${f.startTime}) @ ${f.venue}`).join('\n')}\n\nDeliverables:\n${deliverablesList}`;
        if (includeFinancials) {
          messageText += `\n\nPayment Summary:\nFinal Agreed Amount: ₹${booking.financials.finalAgreedAmount.toLocaleString('en-IN')}\nAdvance Received: ₹${booking.financials.verifiedPaymentsReceived.toLocaleString('en-IN')}\nRemaining Balance: ₹${booking.financials.remainingBalance.toLocaleString('en-IN')}`;
        }
        messageText += `\n\nThank you for choosing ${studioName}. We look forward to capturing your memories!`;
        break;

      case 'same_day_delivery_update':
        messageText = `Hello ${customerName},\n\nHere is your SAME-DAY photo delivery update from ${studioName}!\n\nEvent: ${booking.eventName}\n\nCompleted:\n${completedDeliverables}\n\nYour proofs have been uploaded to your private online gallery.\nThank you!`;
        break;

      case 'final_delivery_summary':
      case 'photos_delivered':
        messageText = `Hello ${customerName},\n\nHere is your photography delivery update from ${studioName}.\n\nEvent: ${booking.eventName}\n\nCompleted Deliverables:\n${completedDeliverables}\n\nPending Items:\n${pendingDeliverables}`;
        if (includeFinancials && booking.financials.remainingBalance > 0) {
          messageText += `\n\nPending Balance Due: ₹${booking.financials.remainingBalance.toLocaleString('en-IN')}`;
        }
        messageText += `\n\nWe will update you as remaining items progress.`;
        break;

      default:
        messageText = `Hello ${customerName},\n\nGreetings from ${studioName}! Here is the latest update regarding ${booking.eventName}.\n\nDeliverables Status:\n${deliverablesList}\n\nThank you for trusting ${studioName}!`;
        break;
    }

    const cleanPhone = phone.startsWith('91') ? phone : `91${phone}`;
    const generatedUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`;

    return {
      templateType,
      recipientName: customerName,
      recipientPhone: cleanPhone,
      recipientRole: 'customer',
      messageText,
      includeFinancials,
      generatedUrl,
      status: 'drafted'
    };
  }

  generateWhatsAppCrewMessage(
    studioId: string, 
    booking: BookingRecord, 
    functionPlanOrEmployee: any, 
    maybeEmployee?: any
  ): WhatsAppMessagePayload {
    const studioProfile = TenantStore.getSingle<any>(studioId, 'profile');
    const studioName = studioProfile?.name || 'Studio OS';

    let functionPlan: FunctionPlan;
    let employee: any;

    if (maybeEmployee) {
      functionPlan = functionPlanOrEmployee;
      employee = maybeEmployee;
    } else {
      employee = functionPlanOrEmployee;
      functionPlan = booking.functions[0] || {
        id: 'fn_default',
        bookingId: booking.id,
        name: 'Main Shoot Coverage',
        category: booking.category,
        date: booking.mainEventDate,
        startTime: '09:00 AM',
        endTime: '11:00 PM',
        venue: booking.venue,
        city: booking.city,
        assignedPhotographerIds: [],
        assignedVideographerIds: [],
        assignedDroneOperatorIds: [],
        assignedEditorIds: [],
        assignedSupplierIds: [],
        deliverables: booking.deliverables || [],
        priority: 'normal',
        status: 'scheduled'
      };
    }

    const empName = employee?.name || employee?.fullName || 'Crew Member';
    const empPhone = (employee?.phone || '').replace(/[^0-9]/g, '') || '919876543210';

    // Default privacy: Customer Name masked, customer phone hidden, booking financials hidden
    const messageText = `Hello ${empName},\n\nShoot Assignment & Call Sheet from ${studioName}:\n\nEvent: ${booking.eventName}\nFunction: ${functionPlan.name}\nDate: ${functionPlan.date}\nCall Time: ${functionPlan.startTime}\nVenue: ${functionPlan.venue}, ${functionPlan.city}\n\nEquipment Checklist:\n• Primary & Backup Camera Bodies\n• Charged Batteries & Formatted High-Speed SD Cards\n• Speedlights & Diffusers\n• Studio Black Uniform\n\nRequired Deliverables:\n${(functionPlan.deliverables || []).map(d => `• ${d.name} (${d.requiredQty} ${d.unit})`).join('\n') || '• Event coverage photos and footage'}\n\nPlease confirm your availability.`;

    const cleanPhone = empPhone.startsWith('91') ? empPhone : `91${empPhone}`;
    const generatedUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`;

    return {
      templateType: 'crew_assignment',
      recipientName: empName,
      recipientPhone: cleanPhone,
      recipientRole: 'employee',
      messageText,
      includeFinancials: false, // strictly false for crew
      generatedUrl,
      status: 'drafted'
    };
  }

  // ==========================================
  // 8. PRODUCTION OVERVIEW METRICS & ANALYTICS
  // ==========================================
  getProductionMetrics(studioId: string) {
    const bookings = this.listBookings(studioId);
    const deliverables = this.listDeliverables(studioId);
    const todayStr = new Date().toISOString().slice(0, 10);
    const tomorrowObj = new Date();
    tomorrowObj.setDate(tomorrowObj.getDate() + 1);
    const tomorrowStr = tomorrowObj.toISOString().slice(0, 10);

    let sameDayCount = 0;
    let urgentCount = 0;
    let dueTomorrowCount = 0;
    let overdueCount = 0;
    let editingInProgressCount = 0;
    let albumsPendingCount = 0;
    let rawPhotosPendingCount = 0;
    let socialMediaPendingCount = 0;
    let completedDeliveriesCount = 0;

    deliverables.forEach(d => {
      if (d.priority === 'instant_same_day') sameDayCount++;
      if (d.priority === 'urgent') urgentCount++;
      if (d.calculatedDeadline === tomorrowStr && !d.isDelivered) dueTomorrowCount++;
      if (d.calculatedDeadline < todayStr && !d.isDelivered) overdueCount++;

      if (d.stage === 'editing' || d.stage === 'video_editing') editingInProgressCount++;
      if (d.category === 'physical' && !d.isDelivered) albumsPendingCount++;
      if (d.name.toLowerCase().includes('raw') && !d.isDelivered) rawPhotosPendingCount++;
      if ((d.name.toLowerCase().includes('reel') || d.name.toLowerCase().includes('social')) && !d.isDelivered) socialMediaPendingCount++;
      if (d.isDelivered) completedDeliveriesCount++;
    });

    const totalActiveBookings = bookings.filter(b => b.status !== 'completed' && b.status !== 'cancelled').length;
    const onTimePercentage = deliverables.length > 0
      ? Math.round(((deliverables.length - overdueCount) / deliverables.length) * 100)
      : 100;

    return {
      totalActiveBookings,
      totalDeliverables: deliverables.length,
      sameDayCount,
      urgentCount,
      dueTomorrowCount,
      overdueCount,
      editingInProgressCount,
      albumsPendingCount,
      rawPhotosPendingCount,
      socialMediaPendingCount,
      completedDeliveriesCount,
      pendingDeliveriesCount: deliverables.length - completedDeliveriesCount,
      onTimePercentage
    };
  }

  // ==========================================
  // SEED INITIAL DEMO BOOKINGS
  // ==========================================
  private seedDemoBookings(studioId: string): BookingRecord[] {
    const demoBooking: BookingRecord = {
      id: `bkg_demo_${studioId}_001`,
      studioId,
      bookingNumber: 'BKG-2026-0042',
      status: 'deal_confirmed',
      customerId: 'cust_singhania_01',
      customerName: 'Singhania Family (Rahul & Priya)',
      customerPhone: '+91 98250 11223',
      customerWhatsApp: '+91 98250 11223',
      customerEmail: 'rahul.singhania@gmail.com',
      customerAddress: 'Bodakdev, Ahmedabad',
      eventName: 'Rahul & Priya Royal Wedding',
      category: 'Wedding',
      mainEventDate: '2026-12-20',
      venue: 'The Grand Bhagwati',
      city: 'Ahmedabad',
      numberOfDays: 3,
      numberOfFunctions: 3,
      functions: [
        {
          id: `fn_demo_${studioId}_1`,
          bookingId: `bkg_demo_${studioId}_001`,
          name: 'Mandvo & Pithi',
          category: 'Pre-Wedding',
          date: '2026-12-18',
          startTime: '08:00 AM',
          endTime: '01:00 PM',
          venue: 'Bodakdev Bungalow',
          city: 'Ahmedabad',
          assignedPhotographerIds: ['emp_photo_01'],
          assignedVideographerIds: [],
          assignedDroneOperatorIds: [],
          assignedEditorIds: ['emp_edit_01'],
          assignedSupplierIds: [],
          deliverables: [
            {
              id: `del_demo_1`,
              bookingId: `bkg_demo_${studioId}_001`,
              functionId: `fn_demo_${studioId}_1`,
              functionName: 'Mandvo & Pithi',
              name: 'Mandvo Selected Photos',
              category: 'photography',
              requiredQty: 200,
              completedQty: 0,
              unit: 'photos',
              deliveryMethod: 'Google Drive',
              deadlineType: 'relative_to_shoot',
              deadlineDays: 2,
              calculatedDeadline: '2026-12-20',
              priority: 'high',
              stage: 'not_started',
              isDelivered: false
            }
          ],
          priority: 'high',
          status: 'scheduled'
        },
        {
          id: `fn_demo_${studioId}_2`,
          bookingId: `bkg_demo_${studioId}_001`,
          name: 'Haldi & Sangeet Night',
          category: 'Wedding',
          date: '2026-12-19',
          startTime: '04:00 PM',
          endTime: '11:00 PM',
          venue: 'YMCA Club Lawn',
          city: 'Ahmedabad',
          assignedPhotographerIds: ['emp_photo_01', 'emp_photo_02'],
          assignedVideographerIds: ['emp_video_01'],
          assignedDroneOperatorIds: [],
          assignedEditorIds: [],
          assignedSupplierIds: [],
          deliverables: [
            {
              id: `del_demo_2`,
              bookingId: `bkg_demo_${studioId}_001`,
              functionId: `fn_demo_${studioId}_2`,
              functionName: 'Haldi & Sangeet Night',
              name: 'Sangeet Instagram Reels (Same-Day Highlight)',
              category: 'video',
              requiredQty: 2,
              completedQty: 0,
              unit: 'reels',
              deliveryMethod: 'Online Gallery',
              deadlineType: 'same_day',
              calculatedDeadline: '2026-12-19',
              priority: 'instant_same_day',
              stage: 'not_started',
              isDelivered: false
            }
          ],
          priority: 'instant_same_day',
          status: 'scheduled'
        },
        {
          id: `fn_demo_${studioId}_3`,
          bookingId: `bkg_demo_${studioId}_001`,
          name: 'Wedding Ceremony & Reception',
          category: 'Wedding',
          date: '2026-12-20',
          startTime: '06:00 PM',
          endTime: '01:00 AM',
          venue: 'The Grand Bhagwati',
          city: 'Ahmedabad',
          assignedPhotographerIds: ['emp_photo_01'],
          assignedVideographerIds: ['emp_video_01'],
          assignedDroneOperatorIds: [],
          assignedEditorIds: [],
          assignedSupplierIds: [],
          deliverables: [
            {
              id: `del_demo_3`,
              bookingId: `bkg_demo_${studioId}_001`,
              functionId: `fn_demo_${studioId}_3`,
              functionName: 'Wedding Ceremony & Reception',
              name: 'Premium Leather Wedding Album',
              category: 'physical',
              requiredQty: 1,
              completedQty: 0,
              unit: 'albums',
              albumSize: '12x36 inches',
              sheetCount: 40,
              deliveryMethod: 'Physical Album',
              deadlineType: 'relative_to_main_wedding',
              deadlineDays: 30,
              calculatedDeadline: '2027-01-19',
              priority: 'normal',
              stage: 'not_started',
              isDelivered: false
            }
          ],
          priority: 'normal',
          status: 'scheduled'
        }
      ],
      deliverables: [],
      financials: {
        originalQuotation: 150000,
        negotiatedDiscount: 20000,
        finalAgreedAmount: 130000,
        verifiedPaymentsReceived: 50000,
        remainingBalance: 80000,
        advanceRequired: 40000,
        advanceReceived: 50000,
        advanceReceivedDate: '2026-11-01T10:00:00.000Z',
        isAdvanceConfirmed: true,
        paymentMilestones: [
          {
            id: `m_1`,
            title: 'Booking Advance Received',
            percentage: 38,
            amount: 50000,
            dueDate: '2026-11-01',
            status: 'paid',
            paidAmount: 50000
          },
          {
            id: `m_2`,
            title: 'Shoot Day Payment',
            percentage: 38,
            amount: 50000,
            dueDate: '2026-12-20',
            status: 'pending',
            paidAmount: 0
          },
          {
            id: `m_3`,
            title: 'Album Handover Balance',
            percentage: 24,
            amount: 30000,
            dueDate: '2027-01-19',
            status: 'pending',
            paidAmount: 0
          }
        ]
      },
      billingVersions: [
        {
          id: 'bver_demo_2',
          bookingId: `bkg_demo_${studioId}_001`,
          versionNumber: 2,
          originalQuotedAmount: 150000,
          negotiatedDiscount: 20000,
          deliverablesAdjustment: 0,
          finalAgreedAmount: 130000,
          negotiationReason: 'Client negotiated package discount for 3-day full wedding bundle',
          approvedBy: 'Studio Owner',
          dateOfChange: '2026-11-02T14:30:00.000Z'
        },
        {
          id: 'bver_demo_1',
          bookingId: `bkg_demo_${studioId}_001`,
          versionNumber: 1,
          originalQuotedAmount: 150000,
          negotiatedDiscount: 0,
          deliverablesAdjustment: 0,
          finalAgreedAmount: 150000,
          negotiationReason: 'Initial Quote Submitted',
          approvedBy: 'Studio Owner',
          dateOfChange: '2026-11-01T10:00:00.000Z'
        }
      ],
      notes: [
        {
          id: 'note_demo_1',
          studioId,
          customerId: 'cust_singhania_01',
          bookingId: `bkg_demo_${studioId}_001`,
          noteType: 'customer_communication',
          title: 'Client Delivery Preferences',
          content: 'Client requested Google Drive link for instant raw review and 1 physical USB pendrive.',
          isPrivate: false,
          createdBy: 'Studio Owner',
          createdByName: 'Studio Owner',
          createdAt: '2026-11-02T15:00:00.000Z'
        },
        {
          id: 'note_demo_2',
          studioId,
          customerId: 'cust_singhania_01',
          bookingId: `bkg_demo_${studioId}_001`,
          noteType: 'internal_private',
          title: 'Confidential Client Negotiation Note',
          content: 'Approved ₹20,000 discount because client is referring 2 other high-budget weddings in Ahmedabad.',
          isPrivate: true, // Never exported to client WhatsApp
          createdBy: 'Studio Owner',
          createdByName: 'Studio Owner',
          createdAt: '2026-11-02T14:35:00.000Z'
        }
      ],
      createdAt: '2026-11-01T10:00:00.000Z',
      updatedAt: '2026-11-02T15:00:00.000Z',
      createdBy: 'Studio Owner'
    };

    // Flatten deliverables pool
    demoBooking.functions.forEach(f => {
      demoBooking.deliverables.push(...f.deliverables);
    });

    TenantStore.set(studioId, BookingProductionService.BOOKINGS_COLLECTION, [demoBooking]);
    return [demoBooking];
  }
}

export const bookingProductionService = new BookingProductionService();
