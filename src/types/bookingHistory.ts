export type BookingActivityType =
  | 'booking_created'
  | 'booking_confirmed'
  | 'payment_received'
  | 'price_updated'
  | 'service_added'
  | 'service_status_changed'
  | 'album_selected'
  | 'album_status_changed'
  | 'product_selected'
  | 'delivery_recorded'
  | 'event_updated'
  | 'crew_assigned'
  | 'note_added'
  | 'whatsapp_sent';

export interface PaymentHistoryMetadata {
  amount: number;
  paymentMethod: 'UPI' | 'Cash' | 'Bank Transfer' | 'Card' | 'Cheque';
  reference: string;
  receiptNumber: string;
  previousBalance: number;
  newBalance: number;
  note?: string;
  recordedBy: string;
}

export interface ServiceRecord {
  id: string;
  bookingId: string;
  name: string;
  category: 'photography' | 'videography' | 'drone' | 'editing' | 'custom';
  description?: string;
  quantity: number;
  unitPrice?: number;
  status: 'quoted' | 'confirmed' | 'completed' | 'delivered' | 'cancelled';
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
  serviceDate?: string;
  completionDate?: string;
  notes?: string;
  functionId?: string;
  functionName?: string;
}

export interface AlbumProductRecord {
  id: string;
  bookingId: string;
  productType: 
    | 'album' 
    | 'pendrive' 
    | 'printed_photos' 
    | 'photo_frame' 
    | 'online_gallery' 
    | 'raw_package' 
    | 'edited_package' 
    | 'video_files' 
    | 'custom';
  name: string;
  size?: string;
  quantity: number;
  sheetsCount?: number;
  coverMaterial?: string;
  coverDesign?: string;
  selectedPhotosCount?: number;
  status: 
    | 'selecting_photos' 
    | 'design_in_progress' 
    | 'customer_approved' 
    | 'printing' 
    | 'ready' 
    | 'delivered';
  approvalDate?: string;
  printingDate?: string;
  readyDate?: string;
  deliveryDate?: string;
  notes?: string;
  addedBy: string;
  createdAt: string;
  updatedAt?: string;
}

export interface DeliveryRecord {
  id: string;
  bookingId: string;
  itemDelivered: string;
  functionId?: string;
  functionName?: string;
  deliveryDate: string;
  deliveryTime?: string;
  quantity: number;
  unit: string;
  deliveryMethod: 
    | 'Google Drive' 
    | 'Pendrive / Hard Drive' 
    | 'Studio Handover' 
    | 'Courier' 
    | 'Cloud Gallery';
  linkOrReference?: string;
  deliveredBy: string;
  customerConfirmation: 'confirmed' | 'pending_confirmation';
  notes?: string;
  createdAt: string;
}

export interface PriceRevisionRecord {
  id: string;
  bookingId: string;
  previousQuotation: number;
  newQuotation: number;
  previousDiscount: number;
  newDiscount: number;
  previousAgreedAmount: number;
  newAgreedAmount: number;
  reason: string;
  updatedBy: string;
  date: string;
}

export interface BookingHistoryItem {
  historyId: string;
  studioId: string;
  bookingId: string;
  customerId: string;
  activityType: BookingActivityType;
  title: string;
  description: string;
  relatedRecordId?: string;
  relatedFunctionId?: string;
  relatedFunctionName?: string;
  amount?: number;
  amountPaise?: number;
  quantity?: number;
  metadata?: Record<string, any>;
  performedBy: string;
  performedByName: string;
  createdAt: string;
  updatedAt?: string;
  isDemoData?: boolean;
}

export interface BookingHistorySummary {
  totalPaymentsReceived: number;
  paymentTransactionsCount: number;
  totalServicesBooked: number;
  servicesCompleted: number;
  albumsSelected: number;
  deliveriesCompleted: number;
  pendingDeliveries: number;
  lastActivityDate: string;
}
