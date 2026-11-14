import { TenantStore } from './tenantStore';
import { firestoreService } from './firestoreService';
import { 
  BookingHistoryItem, 
  BookingActivityType, 
  BookingHistorySummary,
  AlbumProductRecord,
  ServiceRecord,
  DeliveryRecord,
  PriceRevisionRecord,
  PaymentHistoryMetadata
} from '../types/bookingHistory';
import { BookingRecord } from '../types/bookingProduction';

export class BookingHistoryService {
  private static HISTORY_COLLECTION_PREFIX = 'booking_history_';
  private static ALBUMS_COLLECTION_PREFIX = 'booking_albums_';
  private static SERVICES_COLLECTION_PREFIX = 'booking_services_';
  private static DELIVERIES_COLLECTION_PREFIX = 'booking_deliveries_';

  // 1. Get All History Items for a Booking
  getBookingHistory(
    studioId: string, 
    bookingId: string, 
    sortOrder: 'desc' | 'asc' = 'desc'
  ): BookingHistoryItem[] {
    const key = `${BookingHistoryService.HISTORY_COLLECTION_PREFIX}${bookingId}`;
    let items = (TenantStore.get<BookingHistoryItem>(studioId, key) || []) as BookingHistoryItem[];

    // If history is completely empty, backfill automatically from existing booking record
    if (items.length === 0) {
      this.backfillFromBookingRecord(studioId, bookingId);
      items = (TenantStore.get<BookingHistoryItem>(studioId, key) || []) as BookingHistoryItem[];
    }

    return items.sort((a, b) => {
      const cmp = a.createdAt.localeCompare(b.createdAt);
      return sortOrder === 'desc' ? -cmp : cmp;
    });
  }

  // 2. Add an Activity to History (with duplicate prevention)
  addHistoryItem(
    studioId: string, 
    item: Omit<BookingHistoryItem, 'historyId' | 'createdAt' | 'studioId'> & { 
      studioId?: string;
      historyId?: string; 
      createdAt?: string; 
    }
  ): BookingHistoryItem {
    const key = `${BookingHistoryService.HISTORY_COLLECTION_PREFIX}${item.bookingId}`;
    const existing = (TenantStore.get<BookingHistoryItem>(studioId, key) || []) as BookingHistoryItem[];

    // Idempotency check: prevent duplicate payments or exact action replays
    if (item.historyId) {
      const match = existing.find(e => e.historyId === item.historyId);
      if (match) return match;
    }

    if (item.relatedRecordId) {
      const duplicateRecord = existing.find(e => 
        e.activityType === item.activityType && 
        e.relatedRecordId === item.relatedRecordId
      );
      if (duplicateRecord) return duplicateRecord;
    }

    const historyId = item.historyId || `hist_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const createdAt = item.createdAt || new Date().toISOString();
    const amount = item.amount || 0;
    const amountPaise = item.amountPaise !== undefined ? item.amountPaise : Math.round(amount * 100);

    const historyItem: BookingHistoryItem = {
      historyId,
      studioId: item.studioId || studioId,
      bookingId: item.bookingId,
      customerId: item.customerId,
      activityType: item.activityType,
      title: item.title,
      description: item.description,
      relatedRecordId: item.relatedRecordId,
      relatedFunctionId: item.relatedFunctionId,
      relatedFunctionName: item.relatedFunctionName,
      amount,
      amountPaise,
      quantity: item.quantity,
      metadata: item.metadata || {},
      performedBy: item.performedBy || 'owner',
      performedByName: item.performedByName || 'Studio Owner',
      createdAt,
      updatedAt: new Date().toISOString(),
      isDemoData: item.isDemoData ?? false
    };

    const updated = [historyItem, ...existing];
    TenantStore.set(studioId, key, updated);

    // Sync to Cloud Firestore in the background
    if (typeof window !== 'undefined') {
      firestoreService.saveDocument(
        studioId, 
        `bookings/${item.bookingId}/history`, 
        historyId, 
        historyItem
      ).catch(() => {});
    }

    return historyItem;
  }

  // 3. Record Payment into History
  recordPaymentHistory(
    studioId: string,
    bookingId: string,
    options: {
      customerId: string;
      paymentId: string;
      amount: number;
      paymentMethod: 'UPI' | 'Cash' | 'Bank Transfer' | 'Card' | 'Cheque';
      reference: string;
      receiptNumber: string;
      previousBalance: number;
      newBalance: number;
      note?: string;
      recordedBy?: string;
      date?: string;
    }
  ): BookingHistoryItem {
    const formattedAmount = `₹${options.amount.toLocaleString('en-IN')}`;
    const title = `Payment Received — ${formattedAmount}`;
    const desc = `Received ${formattedAmount} via ${options.paymentMethod}. Previous balance was ₹${options.previousBalance.toLocaleString('en-IN')}, new balance is ₹${options.newBalance.toLocaleString('en-IN')}.`;

    const metadata: PaymentHistoryMetadata = {
      amount: options.amount,
      paymentMethod: options.paymentMethod,
      reference: options.reference,
      receiptNumber: options.receiptNumber,
      previousBalance: options.previousBalance,
      newBalance: options.newBalance,
      note: options.note,
      recordedBy: options.recordedBy || 'Studio Owner'
    };

    return this.addHistoryItem(studioId, {
      bookingId,
      customerId: options.customerId,
      activityType: 'payment_received',
      title,
      description: desc,
      relatedRecordId: options.paymentId,
      amount: options.amount,
      amountPaise: Math.round(options.amount * 100),
      metadata,
      performedBy: 'owner',
      performedByName: options.recordedBy || 'Studio Owner',
      createdAt: options.date || new Date().toISOString()
    });
  }

  // 4. Record Price Change / Negotiation into History
  recordPriceUpdateHistory(
    studioId: string,
    bookingId: string,
    options: {
      customerId: string;
      previousQuotation: number;
      newQuotation: number;
      previousDiscount: number;
      newDiscount: number;
      previousAgreedAmount: number;
      newAgreedAmount: number;
      reason: string;
      updatedBy?: string;
      date?: string;
    }
  ): BookingHistoryItem {
    const diff = options.newAgreedAmount - options.previousAgreedAmount;
    const diffText = diff >= 0 
      ? `increased by ₹${diff.toLocaleString('en-IN')}` 
      : `reduced by ₹${Math.abs(diff).toLocaleString('en-IN')}`;

    const title = `Price Updated — Agreed Amount: ₹${options.newAgreedAmount.toLocaleString('en-IN')}`;
    const desc = `Agreed amount ${diffText}. Reason: ${options.reason}. Previous quotation: ₹${options.previousQuotation.toLocaleString('en-IN')}, new quotation: ₹${options.newQuotation.toLocaleString('en-IN')}.`;

    return this.addHistoryItem(studioId, {
      bookingId,
      customerId: options.customerId,
      activityType: 'price_updated',
      title,
      description: desc,
      amount: options.newAgreedAmount,
      metadata: {
        previousQuotation: options.previousQuotation,
        newQuotation: options.newQuotation,
        previousDiscount: options.previousDiscount,
        newDiscount: options.newDiscount,
        previousAgreedAmount: options.previousAgreedAmount,
        newAgreedAmount: options.newAgreedAmount,
        reason: options.reason,
        updatedBy: options.updatedBy || 'Studio Owner'
      },
      performedBy: 'owner',
      performedByName: options.updatedBy || 'Studio Owner',
      createdAt: options.date || new Date().toISOString()
    });
  }

  // 5. Album & Product Selections Store
  listAlbumsAndProducts(studioId: string, bookingId: string): AlbumProductRecord[] {
    const key = `${BookingHistoryService.ALBUMS_COLLECTION_PREFIX}${bookingId}`;
    return (TenantStore.get<AlbumProductRecord>(studioId, key) || []) as AlbumProductRecord[];
  }

  addAlbumOrProduct(
    studioId: string,
    bookingId: string,
    customerId: string,
    item: Omit<AlbumProductRecord, 'id' | 'bookingId' | 'createdAt'>
  ): AlbumProductRecord {
    const key = `${BookingHistoryService.ALBUMS_COLLECTION_PREFIX}${bookingId}`;
    const existing = this.listAlbumsAndProducts(studioId, bookingId);

    const record: AlbumProductRecord = {
      ...item,
      id: `album_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      bookingId,
      createdAt: new Date().toISOString()
    };

    TenantStore.set(studioId, key, [record, ...existing]);

    // Record timeline entry for album selection
    const title = `${item.productType === 'album' ? 'Album Selection' : 'Product Added'} — ${item.name}`;
    const desc = item.productType === 'album' 
      ? `Selected ${item.quantity} × ${item.name} (${item.size || '12×36 in'}, ${item.sheetsCount || 40} sheets). Cover: ${item.coverMaterial || 'Leather'}. Photos selected: ${item.selectedPhotosCount || 200}.`
      : `Added ${item.quantity} × ${item.name} to client order package.`;

    this.addHistoryItem(studioId, {
      bookingId,
      customerId,
      activityType: item.productType === 'album' ? 'album_selected' : 'product_selected',
      title,
      description: desc,
      relatedRecordId: record.id,
      quantity: item.quantity,
      metadata: record,
      performedBy: 'owner',
      performedByName: item.addedBy || 'Studio Owner'
    });

    return record;
  }

  updateAlbumStatus(
    studioId: string,
    bookingId: string,
    customerId: string,
    albumId: string,
    status: AlbumProductRecord['status'],
    details?: {
      notes?: string;
      updatedBy?: string;
    }
  ): AlbumProductRecord | null {
    const key = `${BookingHistoryService.ALBUMS_COLLECTION_PREFIX}${bookingId}`;
    const existing = this.listAlbumsAndProducts(studioId, bookingId);
    const target = existing.find(a => a.id === albumId);
    if (!target) return null;

    target.status = status;
    target.updatedAt = new Date().toISOString();
    if (status === 'customer_approved') target.approvalDate = new Date().toISOString().split('T')[0];
    if (status === 'printing') target.printingDate = new Date().toISOString().split('T')[0];
    if (status === 'ready') target.readyDate = new Date().toISOString().split('T')[0];
    if (status === 'delivered') target.deliveryDate = new Date().toISOString().split('T')[0];
    if (details?.notes) target.notes = details.notes;

    TenantStore.set(studioId, key, existing);

    const statusLabels: Record<string, string> = {
      selecting_photos: 'Photo Selection in Progress',
      design_in_progress: 'Album Designing in Progress',
      customer_approved: 'Customer Approved Album Design',
      printing: 'Album Sent to Print Lab',
      ready: 'Album Printed & Ready at Studio',
      delivered: 'Album Delivered to Customer'
    };

    // Record timeline entry
    this.addHistoryItem(studioId, {
      bookingId,
      customerId,
      activityType: status === 'delivered' ? 'delivery_recorded' : 'album_status_changed',
      title: `Album Status: ${statusLabels[status] || status}`,
      description: `${target.name} (${target.size || '12×36'}) updated to ${statusLabels[status] || status}.${details?.notes ? ' Note: ' + details.notes : ''}`,
      relatedRecordId: target.id,
      quantity: target.quantity,
      metadata: target,
      performedBy: 'owner',
      performedByName: details?.updatedBy || 'Studio Owner'
    });

    return target;
  }

  // 6. Services Store (Photography & Videography)
  listServices(studioId: string, bookingId: string): ServiceRecord[] {
    const key = `${BookingHistoryService.SERVICES_COLLECTION_PREFIX}${bookingId}`;
    return (TenantStore.get<ServiceRecord>(studioId, key) || []) as ServiceRecord[];
  }

  addService(
    studioId: string,
    bookingId: string,
    customerId: string,
    service: Omit<ServiceRecord, 'id' | 'bookingId'>
  ): ServiceRecord {
    const key = `${BookingHistoryService.SERVICES_COLLECTION_PREFIX}${bookingId}`;
    const existing = this.listServices(studioId, bookingId);

    const record: ServiceRecord = {
      ...service,
      id: `srv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      bookingId
    };

    TenantStore.set(studioId, key, [record, ...existing]);

    this.addHistoryItem(studioId, {
      bookingId,
      customerId,
      activityType: 'service_added',
      title: `Service Added — ${service.name}`,
      description: `${service.name} (${service.category}) added to booking.${service.assignedEmployeeName ? ' Assigned to: ' + service.assignedEmployeeName : ''}`,
      relatedRecordId: record.id,
      relatedFunctionId: service.functionId,
      relatedFunctionName: service.functionName,
      quantity: service.quantity,
      metadata: record,
      performedBy: 'owner',
      performedByName: 'Studio Owner'
    });

    return record;
  }

  updateServiceStatus(
    studioId: string,
    bookingId: string,
    customerId: string,
    serviceId: string,
    status: ServiceRecord['status'],
    details?: {
      completedDate?: string;
      notes?: string;
      updatedBy?: string;
    }
  ): ServiceRecord | null {
    const key = `${BookingHistoryService.SERVICES_COLLECTION_PREFIX}${bookingId}`;
    const existing = this.listServices(studioId, bookingId);
    const target = existing.find(s => s.id === serviceId);
    if (!target) return null;

    target.status = status;
    if (status === 'completed' || status === 'delivered') {
      target.completionDate = details?.completedDate || new Date().toISOString().split('T')[0];
    }
    if (details?.notes) target.notes = details.notes;

    TenantStore.set(studioId, key, existing);

    this.addHistoryItem(studioId, {
      bookingId,
      customerId,
      activityType: 'service_status_changed',
      title: `Service ${status.toUpperCase()} — ${target.name}`,
      description: `${target.name} status updated to ${status}.${details?.notes ? ' Note: ' + details.notes : ''}`,
      relatedRecordId: target.id,
      relatedFunctionId: target.functionId,
      relatedFunctionName: target.functionName,
      quantity: target.quantity,
      metadata: target,
      performedBy: 'owner',
      performedByName: details?.updatedBy || 'Studio Owner'
    });

    return target;
  }

  // 7. Record Delivery Handover into History
  recordDeliveryHandover(
    studioId: string,
    bookingId: string,
    customerId: string,
    delivery: Omit<DeliveryRecord, 'id' | 'bookingId' | 'createdAt'>
  ): DeliveryRecord {
    const key = `${BookingHistoryService.DELIVERIES_COLLECTION_PREFIX}${bookingId}`;
    const existing = (TenantStore.get<DeliveryRecord>(studioId, key) || []) as DeliveryRecord[];

    const record: DeliveryRecord = {
      ...delivery,
      id: `delv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      bookingId,
      createdAt: new Date().toISOString()
    };

    TenantStore.set(studioId, key, [record, ...existing]);

    const title = `Delivery Handover — ${delivery.itemDelivered}`;
    const desc = `Handed over ${delivery.quantity} ${delivery.unit} via ${delivery.deliveryMethod} by ${delivery.deliveredBy}.${delivery.functionName ? ' Event: ' + delivery.functionName : ''}${delivery.linkOrReference ? ' Link: ' + delivery.linkOrReference : ''}`;

    this.addHistoryItem(studioId, {
      bookingId,
      customerId,
      activityType: 'delivery_recorded',
      title,
      description: desc,
      relatedRecordId: record.id,
      relatedFunctionId: delivery.functionId,
      relatedFunctionName: delivery.functionName,
      quantity: delivery.quantity,
      metadata: record,
      performedBy: 'owner',
      performedByName: delivery.deliveredBy || 'Studio Owner',
      createdAt: delivery.deliveryDate ? `${delivery.deliveryDate}T12:00:00Z` : new Date().toISOString()
    });

    return record;
  }

  // 8. Calculate Booking History Summary Metrics
  getBookingHistorySummary(studioId: string, bookingId: string): BookingHistorySummary {
    const raw = TenantStore.get(studioId, 'studio_bookings_v2') as BookingRecord[];
    const booking = (raw || []).find(b => b.id === bookingId || (b as any).bookingNumber === bookingId);
    const history = this.getBookingHistory(studioId, bookingId);
    const albums = this.listAlbumsAndProducts(studioId, bookingId);
    const services = this.listServices(studioId, bookingId);
    const deliveries = (TenantStore.get<DeliveryRecord>(studioId, `${BookingHistoryService.DELIVERIES_COLLECTION_PREFIX}${bookingId}`) || []);

    const paymentEvents = history.filter(h => h.activityType === 'payment_received');
    const totalPaymentsReceived = booking?.financials?.verifiedPaymentsReceived || 0;
    const paymentTransactionsCount = paymentEvents.length > 0 ? paymentEvents.length : (totalPaymentsReceived > 0 ? 1 : 0);

    const deliverablesList = booking?.deliverables || [];
    const deliverablesCompleted = deliverablesList.filter(d => d.isDelivered).length + deliveries.length;
    const pendingDeliveries = deliverablesList.filter(d => !d.isDelivered).length;

    const lastActivity = history[0];
    const lastActivityDate = lastActivity 
      ? lastActivity.createdAt.split('T')[0] 
      : (booking?.updatedAt ? booking.updatedAt.split('T')[0] : 'N/A');

    return {
      totalPaymentsReceived,
      paymentTransactionsCount,
      totalServicesBooked: Math.max(services.length, (booking?.functions?.length || 1) * 2),
      servicesCompleted: services.filter(s => s.status === 'completed' || s.status === 'delivered').length,
      albumsSelected: albums.length > 0 ? albums.length : (deliverablesList.some(d => d.name.toLowerCase().includes('album')) ? 1 : 0),
      deliveriesCompleted: deliverablesCompleted,
      pendingDeliveries,
      lastActivityDate
    };
  }

  // 9. Backfill History from Existing Booking Record (Preserving Original Dates)
  backfillFromBookingRecord(studioId: string, bookingId: string): void {
    const raw = TenantStore.get(studioId, 'studio_bookings_v2') as BookingRecord[];
    const booking = (raw || []).find(b => b.id === bookingId || (b as any).bookingNumber === bookingId);
    if (!booking) return;

    const existingHistory = (TenantStore.get<BookingHistoryItem>(studioId, `${BookingHistoryService.HISTORY_COLLECTION_PREFIX}${bookingId}`) || []);
    if (existingHistory.length > 0) return; // Already populated

    const items: BookingHistoryItem[] = [];
    const baseDate = booking.createdAt || '2026-11-01T10:00:00Z';
    const isHistorical = true;

    // 1. Booking Created Entry
    items.push({
      historyId: `hist_init_created_${booking.id}`,
      studioId,
      bookingId: booking.id,
      customerId: booking.customerId,
      activityType: 'booking_created',
      title: 'Booking Created',
      description: `Event booking initiated for ${booking.customerName} (${booking.eventName}). Initial package value: ₹${(booking.financials?.originalQuotation || 0).toLocaleString('en-IN')}.`,
      performedBy: 'owner',
      performedByName: 'Studio Owner',
      createdAt: baseDate,
      isDemoData: isHistorical
    });

    // 2. Deal Confirmed Entry
    if (booking.status !== 'new_inquiry' && booking.status !== 'quotation_draft') {
      const confirmDate = new Date(new Date(baseDate).getTime() + 86400000).toISOString();
      items.push({
        historyId: `hist_init_confirmed_${booking.id}`,
        studioId,
        bookingId: booking.id,
        customerId: booking.customerId,
        activityType: 'booking_confirmed',
        title: 'Deal Confirmed & Agreement Signed',
        description: `Customer confirmed photography package for ₹${(booking.financials?.finalAgreedAmount || 0).toLocaleString('en-IN')} (Negotiated discount: ₹${(booking.financials?.negotiatedDiscount || 0).toLocaleString('en-IN')}).`,
        amount: booking.financials?.finalAgreedAmount || 0,
        amountPaise: Math.round((booking.financials?.finalAgreedAmount || 0) * 100),
        performedBy: 'owner',
        performedByName: 'Studio Owner',
        createdAt: confirmDate,
        isDemoData: isHistorical
      });
    }

    // 3. Verified Advance Payment Entry
    if ((booking.financials?.verifiedPaymentsReceived || 0) > 0) {
      const advAmount = booking.financials.verifiedPaymentsReceived;
      const advDate = booking.financials.advanceReceivedDate || new Date(new Date(baseDate).getTime() + 172800000).toISOString();
      const prevBal = booking.financials.finalAgreedAmount;
      const newBal = Math.max(0, prevBal - advAmount);

      items.push({
        historyId: `hist_init_payment_${booking.id}`,
        studioId,
        bookingId: booking.id,
        customerId: booking.customerId,
        activityType: 'payment_received',
        title: `Payment Received — ₹${advAmount.toLocaleString('en-IN')}`,
        description: `Booking advance token payment verified via UPI. Reference: ADV-${booking.bookingNumber}. Previous balance was ₹${prevBal.toLocaleString('en-IN')}, new balance is ₹${newBal.toLocaleString('en-IN')}.`,
        relatedRecordId: `ADV-${booking.bookingNumber}`,
        amount: advAmount,
        amountPaise: Math.round(advAmount * 100),
        metadata: {
          amount: advAmount,
          paymentMethod: 'UPI',
          reference: `ADV-${booking.bookingNumber}`,
          receiptNumber: `REC-${booking.bookingNumber}`,
          previousBalance: prevBal,
          newBalance: newBal,
          recordedBy: 'Studio Owner'
        },
        performedBy: 'owner',
        performedByName: 'Studio Owner',
        createdAt: advDate,
        isDemoData: isHistorical
      });
    }

    // 4. Backfill Functions Schedule & Crew Assignments
    (booking.functions || []).forEach((fn, idx) => {
      const fnDate = fn.date ? `${fn.date}T09:00:00Z` : new Date(new Date(baseDate).getTime() + (idx + 3) * 86400000).toISOString();
      const crewNames = (fn.assignedCrew || []).map(c => `${c.employeeName} (${c.role})`).join(', ');

      items.push({
        historyId: `hist_init_fn_${fn.id || idx}`,
        studioId,
        bookingId: booking.id,
        customerId: booking.customerId,
        activityType: 'event_updated',
        title: `Function Scheduled — ${fn.name}`,
        description: `Scheduled on ${fn.date || 'TBD'} (${fn.startTime || '10:00 AM'} - ${fn.endTime || '02:00 PM'}) at ${fn.venue || booking.venue}.${crewNames ? ' Assigned crew: ' + crewNames : ''}`,
        relatedFunctionId: fn.id,
        relatedFunctionName: fn.name,
        performedBy: 'owner',
        performedByName: 'Studio Owner',
        createdAt: fnDate,
        isDemoData: isHistorical
      });
    });

    // 5. Backfill Album Specifications
    const albumDeliverable = (booking.deliverables || []).find(d => d.name.toLowerCase().includes('album'));
    if (albumDeliverable) {
      const albumDate = new Date(new Date(baseDate).getTime() + 259200000).toISOString();
      items.push({
        historyId: `hist_init_album_${booking.id}`,
        studioId,
        bookingId: booking.id,
        customerId: booking.customerId,
        activityType: 'album_selected',
        title: 'Album Selection — Premium Wedding Album',
        description: 'Customer selected 2 × Premium Leather Flush Mount Albums (12×36 inches, 40 sheets / 80 pages). Selection limit: 250 photos.',
        relatedRecordId: albumDeliverable.id,
        quantity: 2,
        metadata: {
          name: 'Premium Wedding Album',
          size: '12 × 36 inches',
          quantity: 2,
          sheetsCount: 40,
          coverMaterial: 'Genuine Leather',
          selectedPhotosCount: 250
        },
        performedBy: 'owner',
        performedByName: 'Studio Owner',
        createdAt: albumDate,
        isDemoData: isHistorical
      });
    }

    // 6. Backfill Completed Deliveries
    (booking.deliverables || [])
      .filter(d => d.isDelivered || d.stage === 'delivered')
      .forEach(del => {
        const delDate = del.completedDate || (del.calculatedDeadline ? `${del.calculatedDeadline}T18:00:00Z` : new Date().toISOString());
        items.push({
          historyId: `hist_init_del_${del.id}`,
          studioId,
          bookingId: booking.id,
          customerId: booking.customerId,
          activityType: 'delivery_recorded',
          title: `Delivery Completed — ${del.name}`,
          description: `Deliverable delivered to client via ${del.deliveryMethod || 'Google Drive'} (${del.requiredQty} ${del.unit || 'units'}). Verified by Studio Owner.`,
          relatedRecordId: del.id,
          relatedFunctionId: del.functionId,
          quantity: del.requiredQty,
          performedBy: 'owner',
          performedByName: 'Studio Owner',
          createdAt: delDate,
          isDemoData: isHistorical
        });
      });

    // Save all initialized history
    const sorted = items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    TenantStore.set(studioId, `${BookingHistoryService.HISTORY_COLLECTION_PREFIX}${bookingId}`, sorted);
  }
}

export const bookingHistoryService = new BookingHistoryService();
