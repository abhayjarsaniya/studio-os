import { z } from 'zod';

// ==========================================
// 1. BOOKING STATUSES (14 CORE STATUSES)
// ==========================================
export const BookingStatusEnum = z.enum([
  'new_inquiry',
  'quotation_draft',
  'quotation_sent',
  'negotiation',
  'deal_confirmed',
  'advance_pending',
  'advance_received',
  'event_scheduled',
  'in_production',
  'editing',
  'delivery_in_progress',
  'partially_delivered',
  'fully_delivered',
  'completed',
  'cancelled'
]);
export type BookingStatus = z.infer<typeof BookingStatusEnum>;

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  new_inquiry: 'New Inquiry',
  quotation_draft: 'Quotation Draft',
  quotation_sent: 'Quotation Sent',
  negotiation: 'Negotiation',
  deal_confirmed: 'Deal Confirmed',
  advance_pending: 'Advance Pending',
  advance_received: 'Advance Received',
  event_scheduled: 'Event Scheduled',
  in_production: 'In Production',
  editing: 'Editing',
  delivery_in_progress: 'Delivery In Progress',
  partially_delivered: 'Partially Delivered',
  fully_delivered: 'Fully Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled'
};

// ==========================================
// 2. DELIVERY PRIORITIES & STAGES
// ==========================================
export const DeliveryPriorityEnum = z.enum([
  'instant_same_day',
  'urgent',
  'high',
  'normal',
  'low'
]);
export type DeliveryPriority = z.infer<typeof DeliveryPriorityEnum>;

export const DELIVERY_PRIORITY_LABELS: Record<DeliveryPriority, string> = {
  instant_same_day: 'Instant / Same Day',
  urgent: 'Urgent',
  high: 'High',
  normal: 'Normal',
  low: 'Low'
};

export const DeliveryStageEnum = z.enum([
  'not_started',
  'photography_pending',
  'photography_completed',
  'data_backup',
  'selection_culling',
  'editing',
  'video_editing',
  'quality_check',
  'ready_for_delivery',
  'delivered',
  'customer_confirmation'
]);
export type DeliveryStage = z.infer<typeof DeliveryStageEnum>;

export const DELIVERY_STAGE_LABELS: Record<DeliveryStage, string> = {
  not_started: 'Not Started',
  photography_pending: 'Photography Pending',
  photography_completed: 'Photography Completed',
  data_backup: 'Data Backup',
  selection_culling: 'Selection / Culling',
  editing: 'Photo Editing',
  video_editing: 'Video Editing',
  quality_check: 'Quality Check',
  ready_for_delivery: 'Ready for Delivery',
  delivered: 'Delivered',
  customer_confirmation: 'Customer Confirmation'
};

// ==========================================
// 3. DELIVERABLE CATEGORIES & SPECIFICATIONS
// ==========================================
export const DeliverableCategoryEnum = z.enum([
  'photography',
  'video',
  'physical',
  'digital'
]);
export type DeliverableCategory = z.infer<typeof DeliverableCategoryEnum>;

export const DeadlineCalculationTypeEnum = z.enum([
  'specific_date',
  'same_day',
  'relative_to_shoot',
  'relative_to_function',
  'relative_to_main_wedding',
  'relative_to_previous_task'
]);
export type DeadlineCalculationType = z.infer<typeof DeadlineCalculationTypeEnum>;

export interface DeliverableSpecification {
  id: string;
  bookingId: string;
  functionId?: string;
  functionName?: string;
  name: string;
  category: DeliverableCategory;
  
  // Quantities & specs
  requiredQty: number;
  completedQty: number;
  unit: string; // 'photos', 'videos', 'reels', 'albums', 'pendrive', 'link', 'prints'
  photoCount?: number;
  videoCount?: number;
  reelCount?: number;
  albumSize?: string;
  sheetCount?: number;
  printSize?: string;
  fileFormat?: string;
  resolution?: string;
  deliveryMethod: 'Google Drive' | 'Online Gallery' | 'Download Link' | 'Physical Pendrive' | 'Physical Album' | 'Direct Handover';
  specialInstructions?: string;

  // Deadline calculation
  deadlineType: DeadlineCalculationType;
  deadlineDays?: number; // e.g. +2 days, or -10 days (before wedding)
  calculatedDeadline: string; // ISO date string
  isWorkingDays?: boolean; // exclude weekends if true
  isManuallyLocked?: boolean;

  // Lifecycle
  priority: DeliveryPriority;
  stage: DeliveryStage;
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
  completedDate?: string;
  fileLinkRef?: string;
  uploadedBy?: string;
  verifiedBy?: string;
  deliveryNotes?: string;
  isPartiallyDelivered?: boolean;
  isDelivered?: boolean;
}

// ==========================================
// 4. FUNCTION-WISE EVENT PLANNING
// ==========================================
export interface FunctionPlan {
  id: string;
  bookingId: string;
  name: string; // e.g. 'Mandvo', 'Haldi', 'Wedding Ceremony'
  category: string;
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  city: string;
  address?: string;

  // Assigned Crew
  assignedPhotographerIds: string[];
  assignedVideographerIds: string[];
  assignedDroneOperatorIds: string[];
  assignedEditorIds: string[];
  assignedSupplierIds: string[];
  assignedCrew?: Array<{
    employeeId: string;
    employeeName: string;
    role: string;
    contact?: string;
  }>;

  // Deliverables specific to this function
  deliverables: DeliverableSpecification[];
  photographyRequirements?: string;
  editingRequirements?: string;
  priority: DeliveryPriority;
  status: 'scheduled' | 'in_progress' | 'completed' | 'delivered';
  notes?: string;
}

// ==========================================
// 5. CUSTOMER NOTES & PRIVACY
// ==========================================
export const NoteTypeEnum = z.enum([
  'internal_private',
  'booking',
  'function',
  'payment',
  'delivery',
  'customer_communication'
]);
export type NoteType = z.infer<typeof NoteTypeEnum>;

export interface CustomerNoteRecord {
  id: string;
  studioId: string;
  customerId: string;
  bookingId?: string;
  functionId?: string;
  noteType: NoteType;
  title: string;
  content: string;
  isPrivate: boolean; // NEVER included in WhatsApp or client views
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt?: string;
}

// ==========================================
// 6. NEGOTIATED BILLING & FINANCIAL LEDGER
// ==========================================
export interface BookingVersionRecord {
  id: string;
  bookingId: string;
  versionNumber: number;
  originalQuotedAmount: number;
  negotiatedDiscount: number;
  deliverablesAdjustment: number;
  finalAgreedAmount: number;
  negotiationReason: string;
  approvedBy: string;
  dateOfChange: string;
  notes?: string;
}

export interface BookingFinancialSummary {
  originalQuotation: number;
  negotiatedDiscount: number;
  finalAgreedAmount: number;
  verifiedPaymentsReceived: number;
  remainingBalance: number;
  advanceRequired: number;
  advanceReceived: number;
  advanceReceivedDate?: string;
  isAdvanceConfirmed: boolean;
  paymentMilestones: Array<{
    id: string;
    title: string;
    percentage: number;
    amount: number;
    dueDate: string;
    status: 'pending' | 'partially_paid' | 'paid';
    paidAmount: number;
  }>;
}

// ==========================================
// 7. COMPLETE BOOKING WORKSPACE RECORD
// ==========================================
export interface BookingRecord {
  id: string;
  studioId: string;
  bookingNumber: string; // BKG-2026-0001
  status: BookingStatus;
  
  // Customer reference
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerWhatsApp: string;
  customerEmail?: string;
  customerAddress?: string;

  // Main Event information
  eventName: string;
  category: string;
  eventCategory?: string;
  mainEventDate: string;
  startDate?: string;
  venue: string;
  city: string;
  description?: string;
  numberOfDays: number;
  numberOfFunctions: number;

  // Function-wise schedule
  functions: FunctionPlan[];

  // Deliverables pool across all functions
  deliverables: DeliverableSpecification[];

  // Financials
  financials: BookingFinancialSummary;
  billingVersions: BookingVersionRecord[];

  // Notes
  notes: any;

  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
}

// ==========================================
// 8. WHATSAPP TEMPLATES & PREVIEW
// ==========================================
export const WhatsAppTemplateTypeEnum = z.enum([
  'inquiry_summary',
  'quotation_summary',
  'booking_confirmation',
  'function_schedule',
  'payment_summary',
  'pre_wedding_delivery_update',
  'same_day_delivery_update',
  'photos_delivered',
  'album_production_update',
  'final_delivery_summary',
  'crew_assignment'
]);
export type WhatsAppTemplateType = z.infer<typeof WhatsAppTemplateTypeEnum>;

export interface WhatsAppMessagePayload {
  templateType: WhatsAppTemplateType;
  recipientName: string;
  recipientPhone: string;
  recipientRole?: 'customer' | 'employee' | 'supplier';
  messageText: string;
  includeFinancials: boolean;
  generatedUrl: string;
  status: 'drafted' | 'link_opened' | 'user_confirmed_sent' | 'cancelled';
}
