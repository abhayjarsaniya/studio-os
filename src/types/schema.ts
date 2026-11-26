import { z } from 'zod';

// ==========================================
// 1. User & Global Profile
// ==========================================
export const UserProfileSchema = z.object({
  uid: z.string().min(1),
  displayName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(7),
  photoUrl: z.string().url().optional(),
  bio: z.string().optional(),
  defaultStudioId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

// Cross-studio membership reference in user's profile
export const UserMembershipRefSchema = z.object({
  studioId: z.string().min(1),
  studioName: z.string().min(1),
  role: z.string().min(1),
  status: z.enum(['active', 'invited', 'suspended', 'left']),
  joinedAt: z.string()
});
export type UserMembershipRef = z.infer<typeof UserMembershipRefSchema>;

// ==========================================
// 2. Studio & Branches
// ==========================================
export const StudioSubscriptionSchema = z.object({
  planId: z.string().default('studio_os_monthly'),
  planName: z.literal('Studio OS Monthly'),
  pricePerMonth: z.number().default(500), // ₹500/month per studio
  currency: z.literal('INR'),
  status: z.enum(['active', 'trial', 'pending', 'grace_period', 'suspended', 'cancelled']),
  validUntil: z.string(),
  trialEndsAt: z.string().optional(),
  autoRenew: z.boolean().default(true)
});
export type StudioSubscription = z.infer<typeof StudioSubscriptionSchema>;

export const StudioSettingsSchema = z.object({
  defaultCurrency: z.string().default('INR'),
  timezone: z.string().default('Asia/Kolkata'),
  dateFormat: z.string().default('DD/MM/YYYY'),
  timeFormat: z.enum(['12h', '24h']).default('12h'),
  allowDirectWhatsApp: z.boolean().default(true),
  watermarkEnabled: z.boolean().default(true),
  invoicePrefix: z.string().default('INV'),
  eventPrefix: z.string().default('EV')
});
export type StudioSettings = z.infer<typeof StudioSettingsSchema>;

export const StudioSchema = z.object({
  id: z.string().min(1), // Unique studio ID
  tenantId: z.string().min(1),
  name: z.string().min(2),
  title: z.string().optional(),
  tagline: z.string().optional(),
  logoUrl: z.string().optional(),
  phone: z.string().min(7),
  email: z.string().email(),
  address: z.string(),
  city: z.string(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  gstNumber: z.string().optional(),
  website: z.string().optional(),
  socialLinks: z.record(z.string(), z.string()).optional(),
  businessHours: z.string().optional(),
  brandColor: z.string().optional(),
  departments: z.array(z.string()).optional(),
  customCategories: z.array(z.string()).optional(),
  lifecycleStatus: z.enum(['pending_activation', 'active', 'hidden', 'suspended', 'deactivated', 'archived', 'draft']).default('active').optional(),
  ownerAuthUid: z.string().optional(),
  ownerName: z.string().optional(),
  ownerEmail: z.string().optional(),
  ownerPhone: z.string().optional(),
  ownerUsername: z.string().optional(),
  isHidden: z.boolean().default(false).optional(),
  hiddenReason: z.string().optional(),
  subscription: StudioSubscriptionSchema,
  settings: StudioSettingsSchema,
  storageUsageMb: z.number().default(0),
  storageQuotaMb: z.number().default(15360), // 15GB
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.string(),
  isDeleted: z.boolean().optional(),
  deletedAt: z.string().optional(),
  deletedBy: z.string().optional()
});
export type Studio = z.infer<typeof StudioSchema>;

export const BranchSchema = z.object({
  id: z.string().min(1),
  studioId: z.string().optional().default('studio_royal_001'),
  name: z.string().min(2),
  title: z.string().optional(), // e.g. "Bandra Flagship" or "Goa Beach Desk"
  code: z.string().min(2), // e.g. "MUM-01", "GOA-01"
  address: z.string(),
  city: z.string(),
  phone: z.string(),
  email: z.string().email().optional(),
  isMainBranch: z.boolean().default(false),
  isActive: z.boolean().default(true),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type Branch = z.infer<typeof BranchSchema>;

// ==========================================
// 3. Studio Membership (Staff & Roles)
// ==========================================
export const MembershipRoleEnum = z.enum([
  'owner',
  'manager',
  'lead_photographer',
  'cinematographer',
  'editor',
  'client_relations'
]);
export type MembershipRole = z.infer<typeof MembershipRoleEnum>;

export const MembershipStatusEnum = z.enum(['active', 'invited', 'suspended', 'inactive']);
export type MembershipStatus = z.infer<typeof MembershipStatusEnum>;

export const MembershipSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  studioId: z.string().min(1),
  displayName: z.string().min(1),
  email: z.string().email(),
  phone: z.string(),
  avatarUrl: z.string().optional(),
  role: MembershipRoleEnum,
  roleTitle: z.string(),
  roleIds: z.array(z.string()).default([]),
  department: z.string().optional(),
  branchAssignments: z.array(z.string()).default([]), // Branch IDs
  status: MembershipStatusEnum.default('active'),
  specialization: z.array(z.string()).default([]),
  invitationDate: z.string().optional(),
  joinedDate: z.string(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type Membership = z.infer<typeof MembershipSchema>;

// ==========================================
// 4. Customer CRM & WhatsApp Click-to-Chat (Phase 7)
// ==========================================
export const CustomerStatusEnum = z.enum([
  'New Inquiry',
  'Contacted',
  'Follow-up Required',
  'Quotation Sent',
  'Negotiation',
  'Booked',
  'Active',
  'Completed',
  'Lost',
  'Inactive'
]);
export type CustomerStatus = z.infer<typeof CustomerStatusEnum>;

export const CustomerPreferencesSchema = z.object({
  preferredContactMethod: z.enum(['whatsapp', 'call', 'email', 'in_person']).default('whatsapp'),
  whatsappConsent: z.boolean().default(true),
  emailConsent: z.boolean().default(true),
  marketingConsent: z.boolean().default(false),
  marketingOptOut: z.boolean().optional(),
  optOut: z.boolean().default(false),
  preferredLanguage: z.string().optional(),
  notes: z.string().optional()
});
export type CustomerPreferences = z.infer<typeof CustomerPreferencesSchema>;

export const CustomerSchema = z.object({
  id: z.string().min(1),
  studioId: z.string().optional(),
  branchId: z.string().optional(),
  name: z.string().min(1),
  phone: z.string().min(7),
  alternatePhone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  address: z.string().optional(),
  dob: z.string().optional(), // YYYY-MM-DD
  anniversaryDate: z.string().optional(), // YYYY-MM-DD
  companyName: z.string().optional(), // Corporate clients
  companyGst: z.string().optional(),
  customerSource: z.string().optional(),
  status: CustomerStatusEnum.optional(),
  assignedManagerId: z.string().optional(),
  assignedManagerName: z.string().optional(),
  assignedManager: z.string().optional(),
  avatarUrl: z.string().optional(),
  avatar: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  totalBookings: z.number().optional(),
  totalSpent: z.number().optional(), // in INR
  totalSpend: z.number().optional(),
  vipTier: z.string().optional(),
  company: z.string().optional(),
  pendingBalance: z.number().optional(), // in INR
  outstandingBalance: z.number().optional(), // in INR
  lastInteractionDate: z.string().optional(),
  nextFollowUpDate: z.string().optional(),
  communicationPreferences: CustomerPreferencesSchema.optional(),
  mergedIntoId: z.string().optional(), // Audit trace if merged
  mergedAt: z.string().optional(),
  mergedBy: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  createdBy: z.string().optional()
});
export type Customer = z.infer<typeof CustomerSchema>;

// Lead & Inquiry Management
export const LeadStatusEnum = z.enum([
  'New Inquiry',
  'Contacted',
  'Quotation Sent',
  'Negotiation',
  'Booked',
  'Lost'
]);
export type LeadStatus = z.infer<typeof LeadStatusEnum>;

export const LeadSchema = z.object({
  id: z.string().min(1),
  studioId: z.string().optional().default('studio_royal_001'),
  leadNumber: z.string().default('LED-001'),
  customerName: z.string().min(1),
  name: z.string().optional(),
  phone: z.string().min(7),
  email: z.string().email().optional().or(z.literal('')),
  eventCategory: z.string().default('General'),
  expectedDate: z.string().optional(),
  estimatedBudget: z.number().optional().default(0),
  source: z.string().default('Instagram'),
  assignedEmployeeId: z.string().optional(),
  assignedEmployeeName: z.string().optional(),
  status: LeadStatusEnum.default('New Inquiry'),
  stage: LeadStatusEnum.optional(),
  notes: z.string().optional(),
  nextFollowUpDate: z.string().optional(),
  convertedCustomerId: z.string().optional(),
  convertedEventId: z.string().optional(),
  convertedAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type Lead = z.infer<typeof LeadSchema>;

// WhatsApp Message Templates (Phase 7)
export const MessageTemplateSchema = z.object({
  id: z.string().min(1),
  studioId: z.string().optional().default('studio_royal_001'),
  title: z.string().min(1),
  category: z.string().default('General'), // Inquiry, Booking, Billing, Post-Production, Delivery, Greetings
  body: z.string().min(1),
  placeholders: z.array(z.string()).default([]),
  applicableCategories: z.array(z.string()).optional(),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string().optional()
});
export type MessageTemplate = z.infer<typeof MessageTemplateSchema>;

// WhatsApp Activity Logs
export const WhatsAppLogStatusEnum = z.enum([
  'Drafted',
  'Link Opened',
  'User Confirmed Sent',
  'Cancelled'
]);
export type WhatsAppLogStatus = z.infer<typeof WhatsAppLogStatusEnum>;

export const WhatsAppLogSchema = z.object({
  id: z.string().min(1),
  studioId: z.string().optional().default('studio_royal_001'),
  customerId: z.string().min(1),
  customerName: z.string().min(1),
  phone: z.string().min(7),
  url: z.string().optional(),
  templateId: z.string().optional(),
  templateTitle: z.string().optional(),
  messageText: z.string(),
  initiatedById: z.string().default('system'),
  initiatedByName: z.string().default('System Admin'),
  timestamp: z.string(),
  relatedEventId: z.string().optional(),
  relatedLeadId: z.string().optional(),
  status: WhatsAppLogStatusEnum.default('Link Opened'),
  confirmedSentAt: z.string().optional(),
  cancelReason: z.string().optional()
});
export type WhatsAppLog = z.infer<typeof WhatsAppLogSchema>;

// Follow-Up Management
export const FollowUpStatusEnum = z.enum(['pending', 'completed', 'cancelled', 'rescheduled']);
export type FollowUpStatus = z.infer<typeof FollowUpStatusEnum>;

export const FollowUpSchema = z.object({
  id: z.string().min(1),
  studioId: z.string().optional().default('studio_royal_001'),
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  relatedLeadId: z.string().optional(),
  relatedEventId: z.string().optional(),
  assignedEmployeeId: z.string().min(1),
  assignedEmployeeName: z.string().optional().default('Assigned Staff'),
  dueDate: z.string(), // YYYY-MM-DD
  dueTime: z.string().optional(), // HH:mm
  reason: z.string().min(1),
  notes: z.string().optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).default('Medium'),
  status: FollowUpStatusEnum.default('pending'),
  completedAt: z.string().optional(),
  completedBy: z.string().optional(),
  createdAt: z.string()
});
export type FollowUp = z.infer<typeof FollowUpSchema>;

// Customer Internal Notes
export const CustomerNoteSchema = z.object({
  id: z.string().min(1),
  studioId: z.string().optional().default('studio_royal_001'),
  customerId: z.string().min(1),
  text: z.string().min(1),
  authorId: z.string().min(1),
  authorName: z.string().min(1),
  isPrivate: z.boolean().default(true),
  createdAt: z.string()
});
export type CustomerNote = z.infer<typeof CustomerNoteSchema>;

// Customer Interactions History
export const CustomerInteractionSchema = z.object({
  id: z.string().min(1),
  studioId: z.string().optional().default('studio_royal_001'),
  customerId: z.string().min(1),
  type: z.enum(['whatsapp', 'call', 'email', 'meeting', 'note', 'booking']),
  summary: z.string().min(1),
  initiatedById: z.string(),
  initiatedByName: z.string(),
  timestamp: z.string()
});
export type CustomerInteraction = z.infer<typeof CustomerInteractionSchema>;

// ==========================================
// 5. Event Categories
// ==========================================
export const EventCategoryItemSchema = z.object({
  id: z.string().min(1),
  studioId: z.string().optional().default('studio_royal_001'),
  name: z.string().min(1),
  slug: z.string().min(1),
  color: z.string().default('blue'),
  description: z.string().optional(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
  sortOrder: z.number().default(0),
  createdAt: z.string()
});
export type EventCategoryItem = z.infer<typeof EventCategoryItemSchema>;

// ==========================================
// 6. Events & Shoots
// ==========================================
export const EventPriorityEnum = z.enum(['Low', 'Medium', 'High', 'Urgent']);
export type EventPriority = z.infer<typeof EventPriorityEnum>;

export const EventStatusEnum = z.enum([
  'Enquiry',
  'Tentative',
  'Confirmed',
  'In Progress',
  'On Hold',
  'Completed',
  'Cancelled',
  // Legacy aliases
  'Draft',
  'Shooting',
  'Post-Production',
  'Under Review',
  'Delivered'
]);
export type EventStatus = z.infer<typeof EventStatusEnum>;

export const EventAttachmentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  url: z.string(),
  type: z.enum(['image', 'document', 'other']).default('image'),
  size: z.number().optional(),
  uploadedBy: z.string(),
  uploadedByName: z.string().optional(),
  uploadedAt: z.string()
});
export type EventAttachment = z.infer<typeof EventAttachmentSchema>;

export const StatusChangeRecordSchema = z.object({
  id: z.string().min(1),
  fromStatus: EventStatusEnum,
  toStatus: EventStatusEnum,
  changedBy: z.string(),
  changedByName: z.string(),
  timestamp: z.string(),
  remarks: z.string().optional()
});
export type StatusChangeRecord = z.infer<typeof StatusChangeRecordSchema>;

export const EventAssignmentSchema = z.object({
  memberId: z.string().min(1),
  memberName: z.string().min(1),
  roleTitle: z.string().optional().default('Crew Member'),
  department: z.string().optional(),
  assignedDates: z.array(z.string()).optional(),
  assignedBy: z.string().optional().default('system'),
  assignedAt: z.string().optional().default(new Date().toISOString())
});
export type EventAssignment = z.infer<typeof EventAssignmentSchema>;

export const PaymentScheduleItemSchema = z.object({
  id: z.string().min(1),
  milestoneName: z.string().min(1),
  amount: z.number().min(0),
  dueDate: z.string(),
  status: z.enum(['pending', 'partial', 'paid']).default('pending'),
  paidAmount: z.number().default(0),
  paidDate: z.string().optional(),
  paymentMethod: z.string().optional(),
  transactionRef: z.string().optional()
});
export type PaymentScheduleItem = z.infer<typeof PaymentScheduleItemSchema>;

export const DeliverablesConfigSchema = z.object({
  albumRequired: z.boolean().default(false),
  albumType: z.string().optional(),
  albumSize: z.string().optional(),
  albumSheetsCount: z.number().optional(),
  albumsCount: z.number().optional(),
  selectedPhotographsCount: z.number().optional(),
  albumCoverType: z.string().optional(),
  parentAlbumRequired: z.boolean().default(false),
  editedPhotosRequired: z.boolean().default(true),
  rawPhotosRequired: z.boolean().default(false),
  videoRequired: z.boolean().default(false),
  cinematicHighlightRequired: z.boolean().default(false),
  totalDigitalPhotographs: z.number().optional(),
  deliveryMethod: z.string().default('Cloud Gallery & USB Drive'),
  expectedDeliveryDate: z.string().optional(),
  selectedServices: z.array(z.string()).default([]),
  customDeliverables: z.array(z.string()).default([]),
  packageType: z.string().default('custom')
});
export type DeliverablesConfig = z.infer<typeof DeliverablesConfigSchema>;

export const EventSchema = z.object({
  id: z.string().min(1),
  studioId: z.string().optional().default('studio_royal_001'),
  branchId: z.string().optional(),
  eventNumber: z.string().min(1),
  name: z.string().min(2),
  title: z.string().optional(),
  customerId: z.string().min(1),
  customerName: z.string().min(1),
  customerPhone: z.string().min(7),
  category: z.string().min(1),
  startDate: z.string(), // YYYY-MM-DD
  startTime: z.string(), // HH:mm
  endDate: z.string(), // YYYY-MM-DD
  endTime: z.string(), // HH:mm
  venue: z.string().min(1),
  venueCity: z.string(),
  fullAddress: z.string().optional(),
  googleMapsLocation: z.string().optional(),
  priority: EventPriorityEnum.default('High'),
  status: EventStatusEnum.default('Confirmed'),
  assignedTeamIds: z.array(z.string()).optional(),
  detailedAssignments: z.array(EventAssignmentSchema).optional(),
  leadPhotographerId: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  attachments: z.array(EventAttachmentSchema).optional(),
  statusHistory: z.array(StatusChangeRecordSchema).optional(),
  deliverables: z.array(z.string()).optional(),
  packageId: z.string().optional(),
  // Separate financial record IDs (no raw balance mutation on base doc)
  invoiceIds: z.array(z.string()).optional(),
  estimatedBudget: z.number().optional(),
  advancePaid: z.number().optional(),
  tasksCount: z.object({
    total: z.number().default(0),
    completed: z.number().default(0)
  }).default({ total: 0, completed: 0 }),
  totalStartDate: z.string().optional(),
  totalEndDate: z.string().optional(),
  overallVenue: z.string().optional(),
  customerContact: z.string().optional(),
  budget: z.number().optional(),
  totalAmount: z.number().optional(),
  paidAmount: z.number().optional(),
  assignedMemberIds: z.array(z.string()).optional(),
  deliverablesConfig: DeliverablesConfigSchema.optional(),
  paymentSchedule: z.array(PaymentScheduleItemSchema).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.string(),
  isDeleted: z.boolean().optional(),
  deletedAt: z.string().optional(),
  deletedBy: z.string().optional()
});
export type StudioEvent = z.infer<typeof EventSchema>;

// ==========================================
// 7. Tasks (Phase 6 Advanced Task Management)
// ==========================================
export const TaskStatusEnum = z.enum([
  'Not Started',
  'Assigned',
  'In Progress',
  'On Hold',
  'Under Review',
  'Revision Required',
  'Completed',
  'Cancelled',
  // Backward compatibility with Phase 1-5 tests & demo data
  'Todo',
  'Review',
  'Done'
]);
export type TaskStatus = z.infer<typeof TaskStatusEnum>;

export const TaskApprovalStatusEnum = z.enum([
  'none',
  'pending',
  'approved',
  'rejected',
  'revision_requested'
]);
export type TaskApprovalStatus = z.infer<typeof TaskApprovalStatusEnum>;

export const TaskChecklistItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  completed: z.boolean().default(false),
  completedBy: z.string().optional(),
  completedByName: z.string().optional(),
  completedAt: z.string().optional()
});
export type TaskChecklistItem = z.infer<typeof TaskChecklistItemSchema>;

export const TaskAttachmentItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  url: z.string().min(1),
  fileType: z.string().optional(),
  size: z.number().optional(),
  uploadedBy: z.string().optional(),
  uploadedByName: z.string().optional(),
  uploadedAt: z.string()
});
export type TaskAttachmentItem = z.infer<typeof TaskAttachmentItemSchema>;

export const TaskCommentItemSchema = z.object({
  id: z.string().min(1),
  taskId: z.string().min(1),
  authorId: z.string().min(1),
  authorName: z.string().min(1),
  authorRole: z.string().optional(),
  text: z.string().min(1),
  isInternal: z.boolean().default(true),
  createdAt: z.string()
});
export type TaskCommentItem = z.infer<typeof TaskCommentItemSchema>;

export const TaskActivityItemSchema = z.object({
  id: z.string().min(1),
  taskId: z.string().min(1),
  action: z.string().min(1),
  details: z.string(),
  actorId: z.string(),
  actorName: z.string(),
  timestamp: z.string()
});
export type TaskActivityItem = z.infer<typeof TaskActivityItemSchema>;

export const TaskSchema = z.object({
  id: z.string().min(1),
  taskNumber: z.string().optional(),
  studioId: z.string().optional().default('studio_royal_001'),
  branchId: z.string().optional(),
  eventId: z.string().optional(),
  eventName: z.string().optional(),
  subEventId: z.string().optional(),
  subEventName: z.string().optional(),
  workflowId: z.string().optional(),
  workflowStageId: z.string().optional(),
  workflowStageName: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  assignedToId: z.string().optional(),
  assignedToName: z.string().optional(),
  collaboratorIds: z.array(z.string()).optional(),
  department: z.string().optional(),
  priority: EventPriorityEnum.optional().default('Medium'),
  status: TaskStatusEnum.optional().default('Not Started'),
  startDate: z.string().optional(),
  dueDate: z.string(), // YYYY-MM-DD
  relativeDaysFromEvent: z.number().optional(),
  estimatedDuration: z.number().optional(),
  actualTimeSpent: z.number().optional(),
  checklist: z.array(TaskChecklistItemSchema).optional(),
  attachments: z.array(TaskAttachmentItemSchema).optional(),
  comments: z.array(TaskCommentItemSchema).optional(),
  dependencies: z.array(z.string()).optional(), // Prerequisite task IDs
  internalNotes: z.string().optional(),
  managerOverrideReason: z.string().optional(),
  submittedForReviewAt: z.string().optional(),
  approvalStatus: TaskApprovalStatusEnum.optional(),
  requiresApproval: z.boolean().optional(),
  reviewerId: z.string().optional(),
  reviewerName: z.string().optional(),
  approvedBy: z.string().optional(),
  reviewedAt: z.string().optional(),
  reviewNotes: z.string().optional(),
  isArchived: z.boolean().optional(),
  completedAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  createdBy: z.string().optional().default('system')
});
export type Task = Omit<z.infer<typeof TaskSchema>, 'studioId' | 'createdBy' | 'priority' | 'status'> & {
  studioId?: string;
  createdBy?: string;
  priority?: EventPriority;
  status?: TaskStatus;
};

// ==========================================
// 8. Form & Workflow Templates (Phase 6 Production Pipelines)
// ==========================================
export const FormTemplateFieldSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  type: z.enum([
    'text', 'textarea', 'number', 'date', 'time', 'radio', 'checkbox', 
    'toggle', 'dropdown', 'multi-select', 'upload', 'image', 'phone', 
    'email', 'location', 'member-selector', 'heading', 'divider', 'signature'
  ]),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
  defaultValue: z.any().optional(),
  placeholder: z.string().optional()
});
export type FormTemplateField = z.infer<typeof FormTemplateFieldSchema>;

export const FormTemplateSchema = z.object({
  id: z.string().min(1),
  studioId: z.string().optional().default('studio_royal_001'),
  title: z.string().min(1),
  category: z.string().optional(),
  description: z.string().optional(),
  version: z.number().default(1),
  fields: z.array(FormTemplateFieldSchema).default([]),
  isActive: z.boolean().default(true),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type FormTemplate = z.infer<typeof FormTemplateSchema>;

export const WorkflowStageSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  department: z.string().default('Production'),
  roleTitle: z.string().optional(),
  color: z.string().default('blue'),
  order: z.number(),
  estimatedHours: z.number().default(24),
  requiresApproval: z.boolean().default(false),
  mandatoryTaskTitles: z.array(z.string()).optional()
});
export type WorkflowStage = z.infer<typeof WorkflowStageSchema>;

export const TaskTemplateSchema = z.object({
  id: z.string().min(1),
  stageId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  department: z.string().default('Production'),
  roleTitle: z.string().optional(),
  assigneeRule: z.enum(['lead_photographer', 'lead_videographer', 'editor', 'manager', 'specific_user']).default('lead_photographer'),
  priority: EventPriorityEnum.default('Medium'),
  estimatedDurationHours: z.number().default(4),
  relativeDaysFromEvent: z.number().default(0), // -2 = 2 days before shoot, 3 = 3 days after shoot
  checklist: z.array(z.string()).optional(),
  requiresApproval: z.boolean().default(false),
  prerequisiteTemplateIds: z.array(z.string()).optional()
});
export type TaskTemplate = z.infer<typeof TaskTemplateSchema>;

export const WorkflowTemplateSchema = z.object({
  id: z.string().min(1),
  studioId: z.string().optional().default('studio_royal_001'),
  name: z.string().min(1),
  category: z.string().optional(),
  description: z.string().optional(),
  stages: z.array(WorkflowStageSchema).default([]),
  taskTemplates: z.array(TaskTemplateSchema).optional(),
  isActive: z.boolean().optional().default(true),
  isDefault: z.boolean().optional().default(false),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type WorkflowTemplate = Omit<z.infer<typeof WorkflowTemplateSchema>, 'isActive' | 'isDefault'> & {
  isActive?: boolean;
  isDefault?: boolean;
};

export const WorkflowInstanceSchema = z.object({
  id: z.string().min(1),
  studioId: z.string().optional().default('studio_royal_001'),
  templateId: z.string().min(1),
  templateName: z.string().min(1),
  entityType: z.enum(['main_event', 'sub_event', 'production_job']).default('main_event'),
  entityId: z.string().min(1),
  entityName: z.string().min(1),
  currentStageId: z.string().min(1),
  currentStageName: z.string().min(1),
  status: z.enum(['active', 'on_hold', 'completed', 'cancelled']).default('active'),
  totalTasksCount: z.number().default(0),
  completedTasksCount: z.number().default(0),
  progressPercentage: z.number().default(0),
  startedAt: z.string(),
  completedAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type WorkflowInstance = z.infer<typeof WorkflowInstanceSchema>;

// ==========================================
// 9. Department & Package
// ==========================================
export const DepartmentSchema = z.object({
  id: z.string().min(1),
  studioId: z.string().optional().default('studio_royal_001'),
  name: z.string().min(1), // e.g. "Cinematography", "Post-Production", "Client Experience"
  headMemberId: z.string().optional(),
  createdAt: z.string()
});
export type Department = z.infer<typeof DepartmentSchema>;

export const PackageSchema = z.object({
  id: z.string().min(1),
  studioId: z.string().optional().default('studio_royal_001'),
  name: z.string().min(1), // e.g. "Royal 3-Day Cinematic Package"
  category: z.string().optional(),
  basePrice: z.number().min(0),
  description: z.string().optional(),
  deliverables: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  createdAt: z.string()
});
export type Package = z.infer<typeof PackageSchema>;

// ==========================================
// 10. Financial Records & Phase 8 Billing Engine
// ==========================================

// Quotations
export const QuotationStatusEnum = z.enum([
  'Draft',
  'Saved',
  'Sent',
  'Viewed',
  'Accepted',
  'Rejected',
  'Expired',
  'Converted to Booking'
]);
export type QuotationStatus = z.infer<typeof QuotationStatusEnum>;

export const QuotationItemSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  description: z.string().min(1),
  quantity: z.number().default(1),
  unitPrice: z.number().min(0),
  discount: z.number().optional().default(0),
  taxRate: z.number().optional().default(18),
  taxAmount: z.number().optional().default(0),
  amount: z.number().min(0),
  totalPrice: z.number().optional()
});
export type QuotationItem = z.infer<typeof QuotationItemSchema>;

export const QuotationSchema = z.object({
  id: z.string().min(1),
  studioId: z.string().optional().default('studio_royal_001'),
  branchId: z.string().optional(),
  quotationNumber: z.string().min(1),
  title: z.string().optional(),
  customerId: z.string().min(1),
  customerName: z.string().min(1),
  customerPhone: z.string().optional(),
  customerEmail: z.string().optional(),
  customerAddress: z.string().optional(),
  relatedLeadId: z.string().optional(),
  relatedEventId: z.string().optional(),
  eventCategory: z.string().default('Wedding Photography'),
  eventName: z.string().optional(),
  eventDate: z.string().optional(),
  eventVenue: z.string().optional(),
  venue: z.string().optional(),
  quotationDate: z.string().optional().default(() => new Date().toISOString().split('T')[0]),
  expiryDate: z.string().optional().default(() => new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]),
  validUntil: z.string().optional(),
  packageName: z.string().default('Custom Package'),
  items: z.array(QuotationItemSchema).default([]),
  subtotal: z.number().min(0),
  discount: z.number().optional().default(0),
  discountAmount: z.number().optional().default(0),
  taxRate: z.number().optional().default(18),
  taxAmount: z.number().optional().default(0),
  cgst: z.number().optional().default(0),
  sgst: z.number().optional().default(0),
  igst: z.number().optional().default(0),
  grandTotal: z.number().min(0),
  totalAmount: z.number().optional(),
  advanceAmount: z.number().optional().default(0),
  paymentTerms: z.string().optional().default('50% advance upon booking, 50% on final delivery'),
  additionalNotes: z.string().optional(),
  notes: z.string().optional(),
  termsAndConditions: z.string().optional(),
  status: QuotationStatusEnum.default('Draft'),
  convertedEventId: z.string().optional(),
  convertedInvoiceId: z.string().optional(),
  convertedAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  createdBy: z.string().optional().default('system')
});
export type Quotation = z.infer<typeof QuotationSchema>;

// Invoices
export const InvoiceTypeEnum = z.enum([
  'Booking Invoice',
  'Advance Invoice',
  'Partial Payment Invoice',
  'Final Invoice',
  'Additional Services Invoice',
  'Custom Invoice'
]);
export type InvoiceType = z.infer<typeof InvoiceTypeEnum>;

export const InvoiceStatusEnum = z.enum([
  'Draft',
  'Issued',
  'Partially Paid',
  'Paid',
  'Overdue',
  'Cancelled',
  'Refunded',
  'draft',
  'issued',
  'partially_paid',
  'paid',
  'overdue',
  'cancelled'
]);
export type InvoiceStatus = z.infer<typeof InvoiceStatusEnum>;

export const InvoiceItemSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  description: z.string().min(1),
  quantity: z.number().default(1),
  unitPrice: z.number().optional().default(0),
  rate: z.number().optional().default(0),
  discount: z.number().optional().default(0),
  taxRate: z.number().optional().default(18),
  taxAmount: z.number().optional().default(0),
  amount: z.number().min(0),
  totalPrice: z.number().optional()
});
export type InvoiceItem = z.infer<typeof InvoiceItemSchema>;

export const InvoiceSchema = z.object({
  id: z.string().min(1),
  studioId: z.string().optional().default('studio_royal_001'),
  branchId: z.string().optional(),
  invoiceNumber: z.string().min(1),
  invoiceType: InvoiceTypeEnum.optional().default('Booking Invoice'),
  customerId: z.string().min(1),
  customerName: z.string().min(1),
  customerPhone: z.string().optional(),
  customerEmail: z.string().optional(),
  customerAddress: z.string().optional(),
  customerGst: z.string().optional(),
  eventId: z.string().optional(),
  eventName: z.string().optional(),
  relatedQuotationId: z.string().optional(),
  items: z.array(InvoiceItemSchema).default([]),
  subtotal: z.number().min(0),
  taxAmount: z.number().optional().default(0),
  discountAmount: z.number().optional().default(0),
  cgst: z.number().optional().default(0),
  sgst: z.number().optional().default(0),
  igst: z.number().optional().default(0),
  totalAmount: z.number().min(0),
  paidAmount: z.number().optional().default(0),
  pendingAmount: z.number().optional().default(0),
  outstandingBalance: z.number().optional().default(0),
  invoiceDate: z.string().optional(),
  dueDate: z.string(),
  status: InvoiceStatusEnum.default('Issued'),
  paymentTerms: z.string().optional().default('Due on Receipt'),
  notes: z.string().optional(),
  termsAndConditions: z.string().optional(),
  cancelReason: z.string().optional(),
  cancelledAt: z.string().optional(),
  cancelledBy: z.string().optional(),
  isIssued: z.boolean().optional().default(true),
  issuedAt: z.string().optional(),
  pdfUrl: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  createdBy: z.string().optional().default('system')
});
export type Invoice = z.infer<typeof InvoiceSchema>;

// Payments
export const PaymentMethodEnum = z.enum([
  'Cash',
  'UPI',
  'Bank Transfer',
  'Cheque',
  'Card',
  'Other',
  'cash',
  'upi',
  'bank_transfer',
  'credit_card',
  'cheque'
]);
export type PaymentMethod = z.infer<typeof PaymentMethodEnum>;

export const PaymentSchema = z.object({
  id: z.string().min(1),
  studioId: z.string().optional().default('studio_royal_001'),
  receiptNumber: z.string().optional(),
  invoiceId: z.string().min(1),
  invoiceNumber: z.string().optional(),
  customerId: z.string().min(1),
  customerName: z.string().optional(),
  eventId: z.string().optional(),
  eventName: z.string().optional(),
  amount: z.number().positive(),
  paymentMethod: PaymentMethodEnum.optional().default('UPI'),
  paymentMode: z.string().optional().default('upi'),
  transactionReference: z.string().optional(),
  paymentDate: z.string(),
  status: z.enum(['success', 'pending', 'failed', 'refunded']).optional().default('success'),
  receivedById: z.string().optional().default('system'),
  receivedByName: z.string().optional().default('Studio Admin'),
  receiptPdfUrl: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
  createdBy: z.string().optional().default('system')
});
export type Payment = z.infer<typeof PaymentSchema>;

// Payment Milestones & Schedules
export const PaymentMilestoneSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  amount: z.number().min(0),
  percentage: z.number().min(0).max(100),
  dueDate: z.string(),
  status: z.enum(['pending', 'paid']).default('pending'),
  paidAmount: z.number().optional().default(0),
  paidAt: z.string().optional(),
  paymentId: z.string().optional()
});
export type PaymentMilestone = z.infer<typeof PaymentMilestoneSchema>;

export const PaymentScheduleSchema = z.object({
  id: z.string().min(1),
  studioId: z.string().optional().default('studio_royal_001'),
  invoiceId: z.string().optional(),
  eventId: z.string().optional(),
  customerId: z.string().min(1),
  totalAmount: z.number().min(0),
  milestones: z.array(PaymentMilestoneSchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string().optional()
});
export type PaymentSchedule = z.infer<typeof PaymentScheduleSchema>;

// Refunds
export const RefundSchema = z.object({
  id: z.string().min(1),
  studioId: z.string().optional().default('studio_royal_001'),
  refundNumber: z.string().min(1),
  originalPaymentId: z.string().min(1),
  receiptNumber: z.string().optional(),
  invoiceId: z.string().min(1),
  invoiceNumber: z.string().optional(),
  customerId: z.string().min(1),
  customerName: z.string().optional(),
  amount: z.number().positive(),
  refundDate: z.string(),
  reason: z.string().min(1),
  referenceNumber: z.string().optional(),
  paymentMethod: PaymentMethodEnum.optional().default('UPI'),
  approvedById: z.string().optional().default('system'),
  approvedByName: z.string().optional().default('Studio Owner'),
  status: z.enum(['Approved', 'Processed']).default('Processed'),
  createdAt: z.string(),
  createdBy: z.string().optional().default('system')
});
export type Refund = z.infer<typeof RefundSchema>;

// Credit Notes
export const CreditNoteSchema = z.object({
  id: z.string().min(1),
  studioId: z.string().optional().default('studio_royal_001'),
  creditNoteNumber: z.string().min(1),
  invoiceId: z.string().min(1),
  invoiceNumber: z.string().optional(),
  customerId: z.string().min(1),
  customerName: z.string().optional(),
  amount: z.number().positive(),
  reason: z.string().min(1),
  issueDate: z.string(),
  items: z.array(InvoiceItemSchema).optional().default([]),
  subtotal: z.number().optional().default(0),
  taxAmount: z.number().optional().default(0),
  totalAmount: z.number().min(0),
  status: z.enum(['Issued', 'Applied', 'Cancelled']).default('Issued'),
  createdAt: z.string(),
  createdBy: z.string().optional().default('system')
});
export type CreditNote = z.infer<typeof CreditNoteSchema>;

// Expenses
export const ExpenseCategoryEnum = z.enum([
  'Camera Equipment',
  'Lens & Accessories',
  'Lighting Equipment',
  'Travel',
  'Accommodation',
  'Food',
  'Fuel',
  'Printing',
  'Album Production',
  'Editing Software',
  'Cloud Storage',
  'Marketing',
  'Office Rent',
  'Electricity',
  'Internet',
  'Employee Salary',
  'Freelancers',
  'Maintenance',
  'Packaging',
  'Miscellaneous'
]);
export type ExpenseCategory = z.infer<typeof ExpenseCategoryEnum>;

export const ExpenseApprovalStatusEnum = z.enum([
  'Draft',
  'Pending Approval',
  'Approved',
  'Rejected',
  'Paid',
  'Cancelled',
  'pending_approval',
  'approved',
  'reimbursed',
  'rejected'
]);
export type ExpenseApprovalStatus = z.infer<typeof ExpenseApprovalStatusEnum>;

export const ExpenseSchema = z.object({
  id: z.string().min(1),
  studioId: z.string().optional().default('studio_royal_001'),
  branchId: z.string().optional(),
  branchName: z.string().optional(),
  expenseNumber: z.string().optional(),
  eventId: z.string().optional(),
  eventName: z.string().optional(),
  title: z.string().min(1),
  category: z.string().min(1),
  description: z.string().optional(),
  amount: z.number().positive(),
  tax: z.number().optional().default(0),
  vendor: z.string().optional(),
  expenseDate: z.string(),
  paymentDate: z.string().optional(),
  paymentMethod: PaymentMethodEnum.optional().default('Cash'),
  referenceNumber: z.string().optional(),
  receiptUrl: z.string().optional(),
  relatedEmployeeId: z.string().optional(),
  relatedEmployeeName: z.string().optional(),
  paidById: z.string().optional(),
  paidByName: z.string().optional(),
  createdById: z.string().optional().default('system'),
  createdByName: z.string().optional().default('Staff'),
  approvalStatus: ExpenseApprovalStatusEnum.default('Approved'),
  status: z.string().optional().default('approved'),
  approvedById: z.string().optional(),
  approvedByName: z.string().optional(),
  approvedAt: z.string().optional(),
  rejectionReason: z.string().optional(),
  paidAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional()
});
export type Expense = z.infer<typeof ExpenseSchema>;

// Financial Settings
export const FinancialSettingsSchema = z.object({
  studioId: z.string().min(1),
  legalName: z.string().default('Royal Weddings Studio Pvt Ltd'),
  businessAddress: z.string().default('Bandra West, Mumbai, MH - 400050'),
  gstin: z.string().optional().default('27AAAAA0000A1Z5'),
  pan: z.string().optional().default('AAAAA0000A'),
  state: z.string().default('Maharashtra'),
  country: z.string().default('India'),
  currency: z.string().default('INR'),
  currencySymbol: z.string().default('₹'),
  invoicePrefix: z.string().default('INV'),
  quotationPrefix: z.string().default('QUO'),
  receiptPrefix: z.string().default('REC'),
  creditNotePrefix: z.string().default('CRN'),
  refundPrefix: z.string().default('REF'),
  expensePrefix: z.string().default('EXP'),
  fyStartMonth: z.number().default(4),
  defaultCgstRate: z.number().default(9),
  defaultSgstRate: z.number().default(9),
  defaultIgstRate: z.number().default(18),
  defaultPaymentTerms: z.string().default('Due on Receipt'),
  invoiceFooter: z.string().default('Thank you for trusting us to capture your precious milestones!'),
  termsAndConditions: z.string().default('1. All payments are non-refundable once shooting commences.\n2. Final deliverables are released upon 100% invoice settlement.\n3. Raw footage backup maintained for 90 days after delivery.'),
  defaultDiscountPercent: z.number().default(0),
  rounding: z.boolean().default(true),
  brandAccentColor: z.string().default('#09090b'),
  updatedAt: z.string().optional()
});
export type FinancialSettings = z.infer<typeof FinancialSettingsSchema>;

// SaaS Platform Subscriptions
export const PlatformSubscriptionPlanSchema = z.object({
  id: z.string().min(1),
  name: z.string().default('Studio OS Standard'),
  pricePerMonth: z.number().default(500),
  currency: z.string().default('INR'),
  billingCycle: z.enum(['monthly', 'yearly']).default('monthly'),
  employeeLimit: z.number().default(25),
  storageAllowanceGb: z.number().default(500),
  features: z.array(z.string()).default([
    'Multi-Tenant Photography ERP',
    'Customer CRM & WhatsApp Click-to-Chat',
    'Photography Production Pipelines & Task Engine',
    'Quotation & Customer Invoicing with PDF Generator',
    'Expense & Payroll Management'
  ]),
  isActive: z.boolean().default(true)
});
export type PlatformSubscriptionPlan = z.infer<typeof PlatformSubscriptionPlanSchema>;

export const PlatformStudioSubscriptionSchema = z.object({
  id: z.string().min(1),
  studioId: z.string().min(1),
  studioName: z.string().min(1),
  planId: z.string().default('plan_standard_500'),
  planName: z.string().default('Studio OS Standard'),
  pricePerMonth: z.number().default(500),
  billingCycle: z.enum(['monthly', 'yearly']).default('monthly'),
  startDate: z.string(),
  renewalDate: z.string(),
  status: z.enum(['active', 'trial', 'expired', 'suspended', 'cancelled', 'Active', 'Expired', 'Suspended', 'Cancelled']).default('active'),
  paymentStatus: z.string().optional().default('Paid'),
  autoRenew: z.boolean().default(true),
  lastPaymentAmount: z.number().optional().default(500),
  gracePeriodDays: z.number().default(7),
  lastPaymentDate: z.string().optional(),
  lastPaymentReference: z.string().optional(),
  billingHistory: z.array(z.object({
    invoiceNumber: z.string(),
    billingDate: z.string(),
    amount: z.number(),
    status: z.enum(['paid', 'pending', 'failed']),
    paymentMethod: z.string()
  })).default([]),
  createdAt: z.string().optional().default(() => new Date().toISOString()),
  updatedAt: z.string().optional()
});
export type PlatformStudioSubscription = z.infer<typeof PlatformStudioSubscriptionSchema>;

// ==========================================
// 11. Equipment
// ==========================================
export const EquipmentSchema = z.object({
  id: z.string().min(1),
  studioId: z.string().optional().default('studio_royal_001'),
  branchId: z.string().optional(),
  name: z.string().min(1), // e.g. "Sony FX3 Cinema Line Body #1"
  category: z.enum(['camera_body', 'lens', 'drone', 'lighting', 'audio', 'gimbal', 'accessory']),
  serialNumber: z.string().optional(),
  status: z.enum(['available', 'checked_out', 'maintenance', 'retired']).default('available'),
  assignedToEventId: z.string().optional(),
  assignedToMemberId: z.string().optional(),
  purchaseDate: z.string().optional(),
  createdAt: z.string()
});
export type Equipment = z.infer<typeof EquipmentSchema>;

// ==========================================
// 12. Notification & Audit Log
// ==========================================
export const StudioNotificationSchema = z.object({
  id: z.string().min(1),
  studioId: z.string().optional().default('studio_royal_001'),
  title: z.string().min(1),
  message: z.string().min(1),
  type: z.enum(['event', 'task', 'payment', 'system']),
  timestamp: z.string(),
  read: z.boolean().default(false),
  linkTab: z.string().optional(),
  linkId: z.string().optional(),
  createdAt: z.string()
});
export type StudioNotification = z.infer<typeof StudioNotificationSchema>;

export const AuditLogSchema = z.object({
  id: z.string().min(1),
  studioId: z.string().optional().default('studio_royal_001'),
  userId: z.string().min(1),
  userName: z.string().optional(),
  userRole: z.string().optional(),
  action: z.string().min(1), // e.g. "CREATE_EVENT", "DELETE_CUSTOMER", "STATUS_CHANGE"
  entityType: z.string().min(1), // e.g. "event", "customer", "invoice"
  entityId: z.string().min(1),
  details: z.record(z.string(), z.any()).default({}),
  timestamp: z.string(),
  ipAddress: z.string().nullable().optional()
});
export type AuditLog = z.infer<typeof AuditLogSchema>;

// ==========================================
// 13. Sub-Events (Parent-Child Event Architecture)
// ==========================================
export const SubEventStatusEnum = z.enum([
  'Tentative',
  'Confirmed',
  'In Progress',
  'Completed',
  'Cancelled'
]);
export type SubEventStatus = z.infer<typeof SubEventStatusEnum>;

export const SubEventMemberAssignmentSchema = z.object({
  memberId: z.string().min(1),
  memberName: z.string().min(1),
  roleTitle: z.string(),
  department: z.string().optional(),
  avatarUrl: z.string().optional()
});
export type SubEventMemberAssignment = z.infer<typeof SubEventMemberAssignmentSchema>;

export const SubEventSchema = z.object({
  id: z.string().min(1),
  studioId: z.string().optional().default('studio_royal_001'),
  parentEventId: z.string().min(1),
  subEventNumber: z.string().min(1), // e.g. EVT-2026-000001-S01
  name: z.string().min(1), // e.g. "Mandvo", "Pithi", "Sangeet", "Wedding Ceremony"
  customCategory: z.string().min(1),
  date: z.string(), // YYYY-MM-DD
  startTime: z.string(), // HH:mm
  endTime: z.string(), // HH:mm
  venue: z.string().min(1),
  address: z.string().optional(),
  assignedMemberIds: z.array(z.string()).optional(),
  assignedMembers: z.array(SubEventMemberAssignmentSchema).optional(),
  requiredTeamSize: z.number().default(2),
  priority: EventPriorityEnum.default('High'),
  status: SubEventStatusEnum.default('Confirmed'),
  instructions: z.string().optional(),
  notes: z.string().optional(),
  attachments: z.array(EventAttachmentSchema).optional(),
  sortOrder: z.number().default(0),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type SubEvent = z.infer<typeof SubEventSchema>;

// ==========================================
// 14. Roles & Permissions Matrix (Phase 5 RBAC)
// ==========================================
export const PermissionModuleEnum = z.enum([
  'dashboard',
  'events',
  'subEvents',
  'customers',
  'team',
  'roles',
  'departments',
  'tasks',
  'calendar',
  'attendance',
  'leave',
  'salary',
  'payroll',
  'invoices',
  'payments',
  'expenses',
  'equipment',
  'inventory',
  'reports',
  'analytics',
  'documents',
  'notifications',
  'settings',
  'branches',
  'auditLogs'
]);
export type PermissionModule = z.infer<typeof PermissionModuleEnum>;

export const PermissionActionEnum = z.enum([
  'view',
  'create',
  'edit',
  'delete',
  'export',
  'download',
  'share',
  'assign',
  'approve',
  'reject',
  'manageSettings'
]);
export type PermissionAction = z.infer<typeof PermissionActionEnum>;

export const AccessScopeEnum = z.enum([
  'all',
  'branch',
  'department',
  'assigned',
  'own',
  'custom'
]);
export type AccessScope = z.infer<typeof AccessScopeEnum>;

export const FieldVisibilityEnum = z.enum(['visible', 'editable', 'hidden']);
export type FieldVisibility = z.infer<typeof FieldVisibilityEnum>;

export const FieldPermissionPolicySchema = z.record(z.string(), FieldVisibilityEnum);
export type FieldPermissionPolicy = z.infer<typeof FieldPermissionPolicySchema>;

export const ModuleActionPermissionsSchema = z.object({
  view: z.boolean().default(false),
  create: z.boolean().default(false),
  edit: z.boolean().default(false),
  delete: z.boolean().default(false),
  export: z.boolean().default(false),
  download: z.boolean().default(false),
  share: z.boolean().default(false),
  assign: z.boolean().default(false),
  approve: z.boolean().default(false),
  reject: z.boolean().default(false),
  manageSettings: z.boolean().default(false),
  scope: AccessScopeEnum.default('all')
}).partial();
export type ModuleActionPermissions = z.infer<typeof ModuleActionPermissionsSchema>;

export const ModulePermissionSchema = z.object({
  view: z.boolean().default(true),
  create: z.boolean().default(false),
  edit: z.boolean().default(false),
  delete: z.boolean().default(false)
});
export type ModulePermission = z.infer<typeof ModulePermissionSchema>;

export const RolePermissionsSchema = z.record(z.string(), z.any());
export type RolePermissions = Record<string, Record<string, any>>;

export const RoleSchema = z.object({
  id: z.string().min(1),
  studioId: z.string().optional().default('studio_royal_001'),
  name: z.string().min(1), // e.g. "Studio Owner", "Photographer", "Video Editor"
  description: z.string().optional(),
  isSystem: z.boolean().optional(),
  isHidden: z.boolean().optional(),
  isEnabled: z.boolean().optional(),
  color: z.string().optional().default('blue'),
  permissions: RolePermissionsSchema,
  fieldPermissions: z.record(z.string(), FieldPermissionPolicySchema).optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type Role = z.infer<typeof RoleSchema>;

// Individual Employee Permission Overrides
export const PermissionOverrideSchema = z.object({
  id: z.string().min(1),
  studioId: z.string().optional().default('studio_royal_001'),
  employeeId: z.string().min(1),
  module: PermissionModuleEnum,
  action: PermissionActionEnum,
  granted: z.boolean(), // true = Allow, false = Explicit Deny
  scope: AccessScopeEnum.optional(),
  branchId: z.string().optional(),
  eventId: z.string().optional(),
  expiresAt: z.string().optional(), // ISO string date-time
  reason: z.string().optional(),
  createdBy: z.string().optional().default('system'),
  createdAt: z.string()
});
export type PermissionOverride = z.infer<typeof PermissionOverrideSchema>;

// Approval Workflows
export const ApprovalWorkflowTypeEnum = z.enum([
  'event_cancellation',
  'event_completion',
  'leave_requests',
  'expense_claims',
  'invoice_approval',
  'payment_verification',
  'salary_payment_confirmation',
  'document_approval'
]);
export type ApprovalWorkflowType = z.infer<typeof ApprovalWorkflowTypeEnum>;

export const ApprovalStatusEnum = z.enum(['pending', 'approved', 'rejected', 'cancelled']);
export type ApprovalStatus = z.infer<typeof ApprovalStatusEnum>;

export const ApprovalRequestSchema = z.object({
  id: z.string().min(1),
  studioId: z.string().optional().default('studio_royal_001'),
  workflowType: ApprovalWorkflowTypeEnum,
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  entityTitle: z.string().min(1),
  requestedBy: z.string().min(1),
  requestedByName: z.string().min(1),
  details: z.record(z.string(), z.any()).optional().default({}),
  status: ApprovalStatusEnum.default('pending'),
  reviewedBy: z.string().optional(),
  reviewedByName: z.string().optional(),
  reviewedAt: z.string().optional(),
  remarks: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type ApprovalRequest = z.infer<typeof ApprovalRequestSchema>;

export const ApprovalHistorySchema = z.object({
  id: z.string().min(1),
  studioId: z.string().optional().default('studio_royal_001'),
  approvalRequestId: z.string().min(1),
  action: z.enum(['submitted', 'approved', 'rejected', 'cancelled']),
  actorId: z.string().min(1),
  actorName: z.string().min(1),
  remarks: z.string().optional(),
  timestamp: z.string()
});
export type ApprovalHistory = z.infer<typeof ApprovalHistorySchema>;

// ==========================================
// 15. Employee Management & Admin Credentials
// ==========================================
export const EmploymentStatusEnum = z.enum(['active', 'inactive', 'probation', 'suspended']);
export type EmploymentStatus = z.infer<typeof EmploymentStatusEnum>;

export const EmergencyContactSchema = z.object({
  name: z.string().default(''),
  relationship: z.string().default(''),
  phone: z.string().default('')
});
export type EmergencyContact = z.infer<typeof EmergencyContactSchema>;

export const EmployeeLoginCredentialsSchema = z.object({
  loginId: z.string().min(1),
  hasAccess: z.boolean().default(true),
  lastPasswordReset: z.string().optional()
  // NOTE: Plain-text password is NEVER saved in Firestore or Employee schema!
});
export type EmployeeLoginCredentials = z.infer<typeof EmployeeLoginCredentialsSchema>;

export const EmployeeSchema = z.object({
  id: z.string().min(1),
  studioId: z.string().optional().default('studio_royal_001'),
  userId: z.string().optional(),
  employeeNumber: z.string().min(1), // e.g. EMP-001
  fullName: z.string().min(1),
  profilePhoto: z.string().optional(),
  phone: z.string().min(7),
  email: z.string().email(),
  address: z.string().optional(),
  joiningDate: z.string(), // YYYY-MM-DD
  department: z.string().min(1),
  designation: z.string().min(1),
  assignedBranchId: z.string().optional(),
  assignedBranchName: z.string().optional(),
  roleId: z.string().min(1),
  roleName: z.string().min(1),
  name: z.string().optional(),
  dateOfJoining: z.string().optional(),
  branchId: z.string().optional(),
  roleIds: z.array(z.string()).optional(),
  assignedRoleIds: z.array(z.string()).optional(),
  employmentStatus: EmploymentStatusEnum.optional(),
  emergencyContact: EmergencyContactSchema.optional(),
  notes: z.string().optional(),
  loginCredentials: EmployeeLoginCredentialsSchema.optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type Employee = z.infer<typeof EmployeeSchema>;

// ==========================================
// 16. Salary & Payroll (Admin Only)
// ==========================================
export const SalaryTypeEnum = z.enum(['monthly', 'daily', 'custom']);
export type SalaryType = z.infer<typeof SalaryTypeEnum>;

export const SalaryComponentItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1), // e.g. "HRA", "Travel Allowance", "TDS"
  amount: z.number().min(0)
});
export type SalaryComponentItem = z.infer<typeof SalaryComponentItemSchema>;

export const SalaryProfileSchema = z.object({
  id: z.string().min(1),
  studioId: z.string().optional().default('studio_royal_001'),
  employeeId: z.string().min(1),
  employeeName: z.string().min(1),
  salaryType: SalaryTypeEnum.default('monthly'),
  monthlySalary: z.number().default(0),
  dailySalary: z.number().default(0),
  paymentMethod: PaymentMethodEnum.default('bank_transfer'),
  bankDetails: z.object({
    accountName: z.string().optional(),
    accountNumber: z.string().optional(),
    ifscCode: z.string().optional(),
    bankName: z.string().optional(),
    upiId: z.string().optional()
  }).optional(),
  salaryStartDate: z.string(),
  allowances: z.array(SalaryComponentItemSchema).default([]),
  bonuses: z.array(SalaryComponentItemSchema).default([]),
  deductions: z.array(SalaryComponentItemSchema).default([]),
  advanceSalary: z.number().default(0),
  leaveAdjustments: z.number().default(0),
  netPayableSalary: z.number().default(0),
  paymentStatus: z.enum(['paid', 'pending', 'processing', 'partial']).default('pending'),
  paymentDate: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type SalaryProfile = z.infer<typeof SalaryProfileSchema>;

export const PayrollEntrySchema = z.object({
  id: z.string().min(1),
  studioId: z.string().optional().default('studio_royal_001'),
  payrollRunId: z.string().min(1),
  employeeId: z.string().min(1),
  employeeName: z.string().min(1),
  department: z.string(),
  salaryType: SalaryTypeEnum,
  baseSalary: z.number().default(0),
  workingDays: z.number().default(30),
  presentDays: z.number().default(30),
  paidLeaves: z.number().default(0),
  unpaidLeaves: z.number().default(0),
  leaveDeduction: z.number().default(0),
  bonusAmount: z.number().default(0),
  deductionAmount: z.number().default(0),
  advanceDeducted: z.number().default(0),
  netPayable: z.number().default(0),
  paidAmount: z.number().default(0),
  paymentStatus: z.enum(['pending', 'paid', 'partial']).default('pending'),
  paymentMethod: PaymentMethodEnum.default('bank_transfer'),
  paymentDate: z.string().optional(),
  transactionReference: z.string().optional(),
  notes: z.string().optional()
});
export type PayrollEntry = z.infer<typeof PayrollEntrySchema>;

export const PayrollRunSchema = z.object({
  id: z.string().min(1),
  studioId: z.string().optional().default('studio_royal_001'),
  month: z.string().min(7), // e.g. "2026-10"
  title: z.string().min(1), // e.g. "October 2026 Payroll Run"
  totalEmployees: z.number().default(0),
  totalGrossPayable: z.number().default(0),
  totalDeductions: z.number().default(0),
  totalBonuses: z.number().default(0),
  totalNetPayable: z.number().default(0),
  totalPaidAmount: z.number().default(0),
  status: z.enum(['draft', 'approved', 'processed', 'paid']).default('draft'),
  entries: z.array(PayrollEntrySchema).default([]),
  processedBy: z.string(),
  processedByName: z.string().optional(),
  processedAt: z.string().optional(),
  createdAt: z.string()
});
export type PayrollRun = z.infer<typeof PayrollRunSchema>;

export const SalaryTransactionSchema = z.object({
  id: z.string().min(1),
  studioId: z.string().optional().default('studio_royal_001'),
  employeeId: z.string().min(1),
  employeeName: z.string().min(1),
  payrollEntryId: z.string().optional(),
  amount: z.number().positive(),
  type: z.enum(['salary_payment', 'salary_advance', 'bonus', 'adjustment']).default('salary_payment'),
  paymentMethod: PaymentMethodEnum.default('bank_transfer'),
  transactionReference: z.string().optional(),
  paymentDate: z.string(),
  recordedBy: z.string(),
  notes: z.string().optional(),
  createdAt: z.string()
});
export type SalaryTransaction = z.infer<typeof SalaryTransactionSchema>;

// ==========================================
// 17. Leave Management
// ==========================================
export const LeaveTypeSchema = z.object({
  id: z.string().min(1),
  studioId: z.string().optional().default('studio_royal_001'),
  name: z.string().min(1), // Casual Leave, Sick Leave, Emergency Leave, etc.
  defaultAllowancePerYear: z.number().min(0).default(12),
  isPaid: z.boolean().default(true),
  color: z.string().default('blue'),
  isActive: z.boolean().default(true)
});
export type LeaveType = z.infer<typeof LeaveTypeSchema>;

export const LeaveRequestStatusEnum = z.enum(['pending', 'approved', 'rejected', 'cancelled']);
export type LeaveRequestStatus = z.infer<typeof LeaveRequestStatusEnum>;

export const LeaveRequestSchema = z.object({
  id: z.string().min(1),
  studioId: z.string().optional().default('studio_royal_001'),
  employeeId: z.string().min(1),
  employeeName: z.string().min(1),
  leaveTypeId: z.string().min(1),
  leaveTypeName: z.string().min(1),
  startDate: z.string(), // YYYY-MM-DD
  endDate: z.string(), // YYYY-MM-DD
  totalDays: z.number().positive(),
  reason: z.string().min(1),
  documentUrl: z.string().optional(),
  status: LeaveRequestStatusEnum.default('pending'),
  appliedAt: z.string(),
  reviewedBy: z.string().optional(),
  reviewedByName: z.string().optional(),
  reviewedAt: z.string().optional(),
  rejectionRemarks: z.string().optional()
});
export type LeaveRequest = z.infer<typeof LeaveRequestSchema>;

export const LeaveCategoryBalanceSchema = z.object({
  leaveTypeId: z.string().min(1),
  leaveTypeName: z.string().min(1),
  totalAllowed: z.number().default(12),
  usedDays: z.number().default(0),
  remainingDays: z.number().default(12)
});
export type LeaveCategoryBalance = z.infer<typeof LeaveCategoryBalanceSchema>;

export const LeaveBalanceSchema = z.object({
  id: z.string().min(1),
  studioId: z.string().optional().default('studio_royal_001'),
  employeeId: z.string().min(1),
  employeeName: z.string().min(1),
  year: z.number().default(2026),
  balances: z.array(LeaveCategoryBalanceSchema).default([]),
  totalAllowed: z.number().default(24),
  totalUsed: z.number().default(0),
  totalRemaining: z.number().default(24),
  totalUnpaid: z.number().default(0)
});
export type LeaveBalance = z.infer<typeof LeaveBalanceSchema>;

// ==========================================
// 18. Attendance Record
// ==========================================
export const AttendanceStatusEnum = z.enum(['present', 'absent', 'half_day', 'on_leave']);
export type AttendanceStatus = z.infer<typeof AttendanceStatusEnum>;

export const AttendanceRecordSchema = z.object({
  id: z.string().min(1),
  studioId: z.string().optional().default('studio_royal_001'),
  employeeId: z.string().min(1),
  employeeName: z.string().min(1),
  date: z.string(), // YYYY-MM-DD
  status: AttendanceStatusEnum.default('present'),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  subEventId: z.string().optional(),
  notes: z.string().optional()
});
export type AttendanceRecord = z.infer<typeof AttendanceRecordSchema>;

// ==========================================
// 19. Phase 9 Analytics & Reporting Intelligence
// ==========================================

export const AnalyticsDatePresetEnum = z.enum([
  'today',
  'yesterday',
  'this_week',
  'last_week',
  'this_month',
  'last_month',
  'this_quarter',
  'this_year',
  'last_year',
  'financial_year',
  'custom'
]);
export type AnalyticsDatePreset = z.infer<typeof AnalyticsDatePresetEnum>;

export const AnalyticsFilterSchema = z.object({
  preset: AnalyticsDatePresetEnum.default('this_month'),
  startDate: z.string(), // YYYY-MM-DD
  endDate: z.string(), // YYYY-MM-DD
  branchId: z.string().optional(),
  eventCategory: z.string().optional(),
  employeeId: z.string().optional(),
  department: z.string().optional(),
  customerSource: z.string().optional(),
  eventStatus: z.string().optional()
});
export type AnalyticsFilter = z.infer<typeof AnalyticsFilterSchema>;

export const MainKPIsSchema = z.object({
  totalEvents: z.number().default(0),
  upcomingEvents: z.number().default(0),
  completedEvents: z.number().default(0),
  cancelledEvents: z.number().default(0),
  totalCustomers: z.number().default(0),
  newCustomers: z.number().default(0),
  leadConversionRate: z.number().default(0), // Percentage (0-100)
  invoicedRevenue: z.number().default(0),
  revenueReceived: z.number().default(0),
  outstandingPayments: z.number().default(0),
  totalExpenses: z.number().default(0),
  netProfit: z.number().default(0),
  activeWorkflows: z.number().default(0),
  completedTasks: z.number().default(0),
  overdueTasks: z.number().default(0),
  teamUtilization: z.number().default(0) // Percentage (0-100)
});
export type MainKPIs = z.infer<typeof MainKPIsSchema>;

export const OperationalAlertTypeEnum = z.enum([
  'unassigned_crew',
  'overdue_subevent',
  'blocked_workflow',
  'overdue_task',
  'pending_followup',
  'overdue_invoice',
  'workload_overload'
]);
export type OperationalAlertType = z.infer<typeof OperationalAlertTypeEnum>;

export const OperationalAlertSeverityEnum = z.enum(['critical', 'warning', 'info']);
export type OperationalAlertSeverity = z.infer<typeof OperationalAlertSeverityEnum>;

export const OperationalAlertSchema = z.object({
  id: z.string().min(1),
  studioId: z.string(),
  type: OperationalAlertTypeEnum,
  severity: OperationalAlertSeverityEnum,
  title: z.string().min(1),
  description: z.string(),
  entityId: z.string().optional(),
  entityType: z.string().optional(),
  actionUrl: z.string(),
  actionLabel: z.string(),
  createdAt: z.string()
});
export type OperationalAlert = z.infer<typeof OperationalAlertSchema>;

export const ReportCategoryEnum = z.enum([
  'business',
  'events',
  'customers',
  'production',
  'finance',
  'team',
  'equipment'
]);
export type ReportCategory = z.infer<typeof ReportCategoryEnum>;

export const SavedReportConfigSchema = z.object({
  id: z.string().min(1),
  studioId: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  category: ReportCategoryEnum,
  filters: AnalyticsFilterSchema,
  selectedFields: z.array(z.string()).default([]),
  groupBy: z.string().optional(),
  sortBy: z.string().optional(),
  sortDirection: z.enum(['asc', 'desc']).default('desc'),
  visualizationType: z.enum(['table', 'bar', 'pie', 'line']).default('table'),
  scheduledFrequency: z.enum(['daily', 'weekly', 'monthly', 'none']).default('none'),
  recipients: z.array(z.string()).optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  createdBy: z.string()
});
export type SavedReportConfig = z.infer<typeof SavedReportConfigSchema>;

export const ReportJobSchema = z.object({
  id: z.string().min(1),
  studioId: z.string(),
  reportConfigId: z.string().optional(),
  reportName: z.string(),
  category: ReportCategoryEnum,
  format: z.enum(['pdf', 'csv', 'json']).default('csv'),
  status: z.enum(['pending', 'completed', 'failed']).default('completed'),
  downloadUrl: z.string().optional(),
  recordCount: z.number().default(0),
  generatedAt: z.string(),
  generatedBy: z.string()
});
export type ReportJob = z.infer<typeof ReportJobSchema>;

export const ProductionFunnelStageSchema = z.object({
  stageKey: z.string(),
  stageName: z.string(),
  order: z.number(),
  count: z.number().default(0),
  avgDaysInStage: z.number().default(0),
  delayedCount: z.number().default(0),
  revisionCount: z.number().default(0)
});
export type ProductionFunnelStage = z.infer<typeof ProductionFunnelStageSchema>;

export const CustomerSegmentationSummarySchema = z.object({
  vip: z.number().default(0),
  repeat: z.number().default(0),
  new: z.number().default(0),
  upcomingEvents: z.number().default(0),
  outstandingDue: z.number().default(0),
  inactive: z.number().default(0),
  leadPipelineCount: z.number().default(0),
  conversionRate: z.number().default(0),
  repeatBookingRate: z.number().default(0)
});
export type CustomerSegmentationSummary = z.infer<typeof CustomerSegmentationSummarySchema>;

export const PlatformSaaSAnalyticsSchema = z.object({
  totalStudios: z.number().default(0),
  activeStudios: z.number().default(0),
  inactiveStudios: z.number().default(0),
  monthlyRecurringRevenue: z.number().default(0), // In INR (₹500 per active studio)
  annualizedRunRate: z.number().default(0),
  churnRate: z.number().default(0),
  renewalRate: z.number().default(0),
  studiosDueForRenewalNext30Days: z.number().default(0),
  planDistribution: z.record(z.string(), z.number()).default({})
});
export type PlatformSaaSAnalytics = z.infer<typeof PlatformSaaSAnalyticsSchema>;

// ==========================================
// 20. Phase 10 Platform Super Admin & SaaS Subscription Management
// ==========================================

export const PlatformRoleEnum = z.enum([
  'super_admin',
  'platform_admin',
  'billing_manager',
  'support_manager',
  'read_only_analyst'
]);
export type PlatformRole = z.infer<typeof PlatformRoleEnum>;

export const PlatformPermissionEnum = z.enum([
  'view_studios',
  'manage_studios',
  'view_subscriptions',
  'manage_subscriptions',
  'manage_plans',
  'view_revenue',
  'record_payments',
  'manage_refunds',
  'manage_announcements',
  'manage_support',
  'manage_admins',
  'view_audit_logs',
  'manage_settings'
]);
export type PlatformPermission = z.infer<typeof PlatformPermissionEnum>;

export const PlatformAdminUserSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  role: PlatformRoleEnum,
  permissions: z.array(PlatformPermissionEnum).default([]),
  status: z.enum(['active', 'suspended']).default('active'),
  lastLoginAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional()
});
export type PlatformAdminUser = z.infer<typeof PlatformAdminUserSchema>;

export const StudioLifecycleStatusEnum = z.enum([
  'pending_activation',
  'active',
  'hidden',
  'suspended',
  'deactivated',
  'archived',
  'draft'
]);
export type StudioLifecycleStatus = z.infer<typeof StudioLifecycleStatusEnum>;

export const SaaSSubscriptionStatusEnum = z.enum([
  'trial',
  'active',
  'payment_pending',
  'past_due',
  'payment_failed',
  'grace_period',
  'suspended',
  'cancelled',
  'expired'
]);
export type SaaSSubscriptionStatus = z.infer<typeof SaaSSubscriptionStatusEnum>;

export const PlatformPlanSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.number().default(1),
  priceMonthly: z.number().default(500), // ₹500/month flat per studio
  priceQuarterly: z.number().optional(),
  priceAnnual: z.number().default(5000), // 2 months discount option
  setupFee: z.number().optional(),
  renewalPolicy: z.enum(['auto_renew', 'manual_or_autopay', 'fixed_term']).optional(),
  razorpayTestPlanIds: z.record(z.string(), z.string()).optional(),
  razorpayLivePlanIds: z.record(z.string(), z.string()).optional(),
  currency: z.literal('INR').default('INR'),
  billingCycle: z.enum(['monthly', 'annual']).default('monthly'),
  employeeLimit: z.number().default(25),
  branchLimit: z.number().default(3),
  storageGb: z.number().default(50),
  features: z.array(z.string()).default([]),
  trialDays: z.number().default(14),
  gracePeriodDays: z.number().default(7),
  description: z.string().default('Complete photography studio management ERP'),
  isActive: z.boolean().default(true),
  createdAt: z.string(),
  updatedAt: z.string().optional()
});
export type PlatformPlan = z.infer<typeof PlatformPlanSchema>;

export const SubscriptionTransitionRecordSchema = z.object({
  id: z.string().min(1),
  fromStatus: SaaSSubscriptionStatusEnum,
  toStatus: SaaSSubscriptionStatusEnum,
  reason: z.string(),
  changedBy: z.string(),
  changedByName: z.string(),
  timestamp: z.string()
});
export type SubscriptionTransitionRecord = z.infer<typeof SubscriptionTransitionRecordSchema>;

export const PlatformInvoiceSchema = z.object({
  id: z.string().min(1),
  invoiceNumber: z.string().min(1), // PINV-YYYY-000001
  studioId: z.string().min(1),
  studioName: z.string().min(1),
  subscriptionId: z.string().min(1),
  planName: z.string(),
  planVersion: z.number().default(1),
  billingPeriodStart: z.string(),
  billingPeriodEnd: z.string(),
  invoiceDate: z.string(),
  dueDate: z.string(),
  subtotal: z.number().min(0),
  taxAmount: z.number().default(0),
  discountAmount: z.number().default(0),
  totalAmount: z.number().min(0),
  paidAmount: z.number().default(0),
  balanceAmount: z.number().default(0),
  status: z.enum(['draft', 'issued', 'paid', 'partially_paid', 'overdue', 'cancelled', 'refunded']).default('issued'),
  paymentReference: z.string().optional(),
  pdfUrl: z.string().optional(),
  createdAt: z.string()
});
export type PlatformInvoice = z.infer<typeof PlatformInvoiceSchema>;

export const PlatformPaymentSchema = z.object({
  id: z.string().min(1),
  receiptNumber: z.string().min(1), // PREC-YYYY-000001
  invoiceId: z.string().min(1),
  studioId: z.string().min(1),
  studioName: z.string().min(1),
  amount: z.number().positive(),
  paymentMethod: z.enum(['UPI', 'Bank Transfer', 'Card', 'Gateway', 'Cash']).default('UPI'),
  transactionReference: z.string(),
  paymentDate: z.string(),
  isManual: z.boolean().default(false),
  recordedBy: z.string(),
  notes: z.string().optional(),
  createdAt: z.string()
});
export type PlatformPayment = z.infer<typeof PlatformPaymentSchema>;

export const FeatureCatalogItemSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  category: z.string(),
  description: z.string(),
  isGlobalEnabled: z.boolean().default(true),
  defaultLimit: z.number().optional()
});
export type FeatureCatalogItem = z.infer<typeof FeatureCatalogItemSchema>;

export const PlatformAnnouncementSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  type: z.enum(['general', 'feature', 'maintenance', 'billing', 'security', 'urgent']).default('general'),
  targetScope: z.enum(['all', 'specific_studios', 'specific_plans', 'active_only']).default('all'),
  targetStudioIds: z.array(z.string()).optional(),
  targetPlanIds: z.array(z.string()).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  status: z.enum(['draft', 'published', 'archived']).default('published'),
  publishedAt: z.string().optional(),
  expiresAt: z.string().optional(),
  createdBy: z.string(),
  createdAt: z.string()
});
export type PlatformAnnouncement = z.infer<typeof PlatformAnnouncementSchema>;

export const SupportTicketSchema = z.object({
  id: z.string().min(1),
  ticketNumber: z.string().min(1), // TICK-YYYY-000001
  studioId: z.string().min(1),
  studioName: z.string().min(1),
  submittedBy: z.string().min(1),
  contactEmail: z.string().email(),
  subject: z.string().min(1),
  description: z.string().min(1),
  category: z.enum(['account', 'subscription', 'billing', 'technical', 'feature_request', 'data', 'other']).default('technical'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  status: z.enum(['open', 'in_progress', 'waiting_for_studio', 'resolved', 'closed']).default('open'),
  assignedAdminId: z.string().optional(),
  assignedAdminName: z.string().optional(),
  internalNotes: z.array(z.string()).default([]),
  createdAt: z.string(),
  updatedAt: z.string().optional()
});
export type SupportTicket = z.infer<typeof SupportTicketSchema>;

export const SupportAccessGrantSchema = z.object({
  id: z.string().min(1),
  studioId: z.string().min(1),
  studioName: z.string().min(1),
  adminId: z.string().min(1),
  adminName: z.string().min(1),
  reason: z.string().min(1),
  expiresAt: z.string(),
  isRevoked: z.boolean().default(false),
  revokedAt: z.string().optional(),
  createdAt: z.string()
});
export type SupportAccessGrant = z.infer<typeof SupportAccessGrantSchema>;

export const PlatformAuditLogSchema = z.object({
  id: z.string().min(1),
  adminId: z.string().min(1),
  adminName: z.string().min(1),
  action: z.string().min(1),
  targetType: z.string().min(1),
  targetId: z.string().min(1),
  details: z.string(),
  ipAddress: z.string().optional(),
  timestamp: z.string()
});
export type PlatformAuditLog = z.infer<typeof PlatformAuditLogSchema>;

// ==========================================
// Phase 12: External Suppliers & Collaboration
// ==========================================

export const SupplierCategoryEnum = z.enum([
  'drone_pilots',
  'traditional_videographers',
  'cinematic_videographers',
  'traditional_photographers',
  'candid_photographers',
  'crane_jib_operators',
  'led_wall_live_screening',
  'sound_audio_engineers',
  'lighting_technicians',
  'album_printers_bookbinders',
  'frame_manufacturers',
  'video_editors_external',
  'photo_retouchers_external',
  'makeup_artists_stylists',
  'event_decorators_prop_providers',
  'transport_vehicle_rentals',
  'equipment_rental_houses'
]);
export type SupplierCategory = z.infer<typeof SupplierCategoryEnum>;

export const SUPPLIER_CATEGORY_LABELS: Record<SupplierCategory, string> = {
  drone_pilots: 'Drone Pilots & Aerial Cinematography',
  traditional_videographers: 'Traditional Videographers',
  cinematic_videographers: 'Cinematic Videographers',
  traditional_photographers: 'Traditional Photographers',
  candid_photographers: 'Candid Photographers',
  crane_jib_operators: 'Crane / Jib Operators',
  led_wall_live_screening: 'LED Wall & Live Screening',
  sound_audio_engineers: 'Sound & Audio Engineers',
  lighting_technicians: 'Lighting Technicians',
  album_printers_bookbinders: 'Album Printers & Bookbinders',
  frame_manufacturers: 'Frame Manufacturers',
  video_editors_external: 'External Video Editors',
  photo_retouchers_external: 'External Photo Retouchers',
  makeup_artists_stylists: 'Makeup Artists & Stylists',
  event_decorators_prop_providers: 'Event Decorators & Prop Providers',
  transport_vehicle_rentals: 'Transport & Vehicle Rentals',
  equipment_rental_houses: 'Equipment Rental Houses'
};

export const SupplierSchema = z.object({
  id: z.string().min(1),
  studioId: z.string().min(1),
  businessName: z.string().min(2),
  contactPerson: z.string().min(2),
  category: SupplierCategoryEnum,
  phone: z.string().min(7),
  email: z.string().email().optional(),
  gstin: z.string().optional(),
  city: z.string(),
  address: z.string().optional(),
  rating: z.number().min(1).max(5).default(5),
  baseDayRate: z.number().default(0),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
  hasPortalAccess: z.boolean().default(false),
  portalLoginEmail: z.string().email().optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional()
});
export type Supplier = z.infer<typeof SupplierSchema>;

export const SupplierMemberSchema = z.object({
  id: z.string().min(1),
  supplierId: z.string().min(1),
  studioId: z.string().min(1),
  name: z.string().min(2),
  phone: z.string().min(7),
  email: z.string().email().optional(),
  specialization: z.string().optional(),
  roleTitle: z.string().min(2),
  isAvailable: z.boolean().default(true),
  createdAt: z.string()
});
export type SupplierMember = z.infer<typeof SupplierMemberSchema>;

export const SupplierAssignmentStatusEnum = z.enum([
  'requested',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled'
]);
export type SupplierAssignmentStatus = z.infer<typeof SupplierAssignmentStatusEnum>;

export const SupplierPaymentStatusEnum = z.enum([
  'pending',
  'partial',
  'paid'
]);
export type SupplierPaymentStatus = z.infer<typeof SupplierPaymentStatusEnum>;

export const SupplierAssignmentSchema = z.object({
  id: z.string().min(1),
  studioId: z.string().min(1),
  supplierId: z.string().min(1),
  supplierName: z.string().min(1),
  supplierMemberId: z.string().optional(),
  supplierMemberName: z.string().optional(),
  category: SupplierCategoryEnum,
  eventId: z.string().min(1),
  eventTitle: z.string().min(1),
  subEventId: z.string().optional(),
  subEventTitle: z.string().optional(),
  taskId: z.string().optional(),
  roleDescription: z.string().optional(),
  date: z.string(),
  callTime: z.string(),
  venue: z.string(),
  agreedFee: z.number().default(0), // Owner/Accountant only
  paidAmount: z.number().default(0),
  paymentStatus: SupplierPaymentStatusEnum.default('pending'),
  status: SupplierAssignmentStatusEnum.default('confirmed'),
  instructions: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional()
});
export type SupplierAssignment = z.infer<typeof SupplierAssignmentSchema>;

// Studio-to-Studio Crew Collaboration
export const CollaborationStatusEnum = z.enum([
  'draft',
  'sent',
  'accepted',
  'declined',
  'completed',
  'cancelled'
]);
export type CollaborationStatus = z.infer<typeof CollaborationStatusEnum>;

export const StudioCollaborationRequestSchema = z.object({
  id: z.string().min(1),
  requestingStudioId: z.string().min(1),
  requestingStudioName: z.string().min(1),
  targetStudioId: z.string().min(1),
  targetStudioName: z.string().min(1),
  eventId: z.string().min(1),
  eventTitle: z.string().min(1),
  eventDate: z.string(),
  subEventId: z.string().optional(),
  subEventTitle: z.string().optional(),
  requiredRoles: z.array(z.string()).min(1), // e.g. ['Candid Photographer', 'Drone Pilot']
  assignedMemberIds: z.array(z.string()).default([]), // Member IDs assigned by lending studio
  assignedMemberNames: z.array(z.string()).default([]),
  agreedRate: z.number().default(0),
  status: CollaborationStatusEnum.default('draft'),
  requestMessage: z.string().optional(),
  responseNotes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional()
});
export type StudioCollaborationRequest = z.infer<typeof StudioCollaborationRequestSchema>;

// Studio-Level Hide/Unhide Feature Settings
export const StudioFeatureSettingsSchema = z.object({
  studioId: z.string().min(1),
  hiddenModules: z.array(z.string()).default([]), // Module keys hidden inside studio UI
  hiddenWidgets: z.array(z.string()).default([]), // Dashboard widgets hidden
  hiddenEventCategories: z.array(z.string()).default([]), // Categories hidden from dropdowns
  hiddenSubEventTypes: z.array(z.string()).default([]),
  updatedAt: z.string()
});
export type StudioFeatureSettings = z.infer<typeof StudioFeatureSettingsSchema>;

// Platform Super Admin Studio Override
export const PlatformStudioFeatureOverrideSchema = z.object({
  studioId: z.string().min(1),
  featureOverrides: z.record(z.string(), z.boolean()).default({}), // key -> true (forced enabled) or false (forced disabled)
  updatedBy: z.string(),
  updatedAt: z.string()
});
export type PlatformStudioFeatureOverride = z.infer<typeof PlatformStudioFeatureOverrideSchema>;

// Customer & Financial Privacy Policy
export const CustomerPrivacyPolicySchema = z.object({
  studioId: z.string().min(1),
  maskCustomerNamesForNonOwners: z.boolean().default(true),
  allowedRolesForCustomerData: z.array(z.string()).default(['owner', 'manager']),
  allowedRolesForFinancials: z.array(z.string()).default(['owner', 'manager', 'accountant']),
  updatedAt: z.string()
});
export type CustomerPrivacyPolicy = z.infer<typeof CustomerPrivacyPolicySchema>;

// Employee Provisioned Account Credentials
export const EmployeeCredentialsSchema = z.object({
  employeeId: z.string().min(1),
  studioId: z.string().min(1),
  username: z.string().min(3),
  email: z.string().email(),
  passwordHash: z.string().min(1),
  initialPassword: z.string().min(1),
  mustChangePassword: z.boolean().default(true),
  hasChangedPassword: z.boolean().default(false),
  lastLoginAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional()
});
export type EmployeeCredentials = z.infer<typeof EmployeeCredentialsSchema>;

// Dashboard Widget Configuration
export const DashboardWidgetConfigSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  category: z.string().default('general'),
  defaultVisible: z.boolean().default(true),
  defaultOrder: z.number().default(0),
  allowedRoles: z.array(z.string()).optional() // If undefined, all authorized view roles
});
export type DashboardWidgetConfig = z.infer<typeof DashboardWidgetConfigSchema>;



