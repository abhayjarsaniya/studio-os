// Studio OS - Core Type Definitions

export type UserRole = 
  | 'owner' 
  | 'manager' 
  | 'lead_photographer' 
  | 'cinematographer' 
  | 'editor' 
  | 'client_relations';

export interface User {
  id: string;
  name: string;
  title?: string;
  email: string;
  phone: string;
  avatar: string;
  role: UserRole;
  roleTitle: string;
  specialization: string[];
  activeEventsCount: number;
}

export type EventCategory =
  | 'Wedding'
  | 'Pre-Wedding'
  | 'Engagement'
  | 'Reception'
  | 'Haldi'
  | 'Mehndi'
  | 'Sangeet'
  | 'Birthday'
  | 'Baby Shower'
  | 'Maternity'
  | 'Newborn'
  | 'Corporate Event'
  | 'Product Photography'
  | 'Fashion Photography'
  | 'School Event'
  | 'College Event'
  | 'Anniversary'
  | 'Family Photoshoot'
  | 'Religious Event'
  | 'Portfolio Shoot'
  | 'Drone Photography'
  | 'Cinematography'
  | 'Exhibition'
  | 'Conference'
  | 'Custom Event'
  // Backward compatibility aliases
  | 'Corporate'
  | 'Product Shoot'
  | 'Fashion Shoot'
  | 'Family Shoot';

export type EventStatus = 
  | 'Enquiry'
  | 'Tentative'
  | 'Confirmed' 
  | 'In Progress'
  | 'On Hold'
  | 'Completed' 
  | 'Cancelled'
  // Workflow stage aliases
  | 'Draft'
  | 'Shooting' 
  | 'Post-Production' 
  | 'Under Review' 
  | 'Delivered';

export type Priority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface EventAttachment {
  id: string;
  name: string;
  title?: string;
  url: string;
  type: 'image' | 'document' | 'other';
  size?: number; // bytes
  uploadedBy: string;
  uploadedByName?: string;
  uploadedAt: string;
}

export interface StatusChangeRecord {
  id: string;
  fromStatus: EventStatus;
  toStatus: EventStatus;
  changedBy: string;
  changedByName: string;
  timestamp: string;
  remarks?: string;
}

export interface EventAssignment {
  memberId: string;
  memberName: string;
  roleTitle: string;
  department?: string;
  assignedDates?: string[]; // Date array for multi-day shoots
  assignedBy: string;
  assignedAt: string;
}

export interface StudioEvent {
  id: string;
  studioId?: string;
  branchId?: string;
  eventNumber: string; // e.g. "EVT-2026-000001"
  name: string;
  title?: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  category: EventCategory;
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endDate: string; // YYYY-MM-DD
  endTime: string; // HH:mm
  venue: string;
  venueCity: string;
  fullAddress?: string;
  googleMapsLocation?: string;
  assignedTeamIds: string[];
  detailedAssignments?: EventAssignment[];
  leadPhotographerId?: string;
  priority: Priority;
  status: EventStatus;
  description?: string;
  notes?: string;
  internalNotes?: string;
  attachments?: EventAttachment[];
  statusHistory?: StatusChangeRecord[];
  estimatedBudget?: number; // In ₹
  advancePaid?: number; // In ₹
  deliverables?: string[];
  tasksCount?: {
    total: number;
    completed: number;
  };
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export type { 
  Customer, 
  CustomerStatus, 
  CustomerPreferences,
  Lead,
  LeadStatus,
  MessageTemplate,
  WhatsAppLog,
  WhatsAppLogStatus,
  FollowUp,
  FollowUpStatus,
  CustomerNote,
  CustomerInteraction,
  Task, 
  TaskStatus 
} from './schema';

export interface StudioNotification {
  id: string;
  title: string;
  message: string;
  type: 'event' | 'task' | 'payment' | 'system';
  timestamp: string;
  read: boolean;
  linkTab?: string;
  linkId?: string;
}

export interface StudioProfile {
  id: string;
  tenantId: string;
  name: string;
  title?: string;
  tagline: string;
  logo: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  website?: string;
  gstNumber?: string;
  subscriptionPlan: 'Studio OS Monthly';
  subscriptionPrice: number; // ₹500
  subscriptionStatus: 'Active' | 'Trial' | 'Grace Period' | 'Pending';
  subscriptionValidUntil: string;
  storageUsageMb: number;
  storageQuotaMb: number;
}

// ==========================================
// Phase 4, Phase 5 & Phase 6: RBAC, Workflows & Advanced Tasks
// ==========================================
export type {
  SubEvent,
  SubEventStatus,
  SubEventMemberAssignment,
  Role,
  RolePermissions,
  ModulePermission,
  ModuleActionPermissions,
  PermissionModule,
  PermissionAction,
  AccessScope,
  FieldVisibility,
  FieldPermissionPolicy,
  PermissionOverride,
  ApprovalWorkflowType,
  ApprovalStatus,
  ApprovalRequest,
  ApprovalHistory,
  Employee,
  EmploymentStatus,
  EmergencyContact,
  EmployeeLoginCredentials,
  SalaryProfile,
  SalaryType,
  PaymentMethod,
  SalaryComponentItem,
  PayrollRun,
  PayrollEntry,
  SalaryTransaction,
  LeaveType,
  LeaveRequest,
  LeaveRequestStatus,
  LeaveBalance,
  LeaveCategoryBalance,
  AttendanceRecord,
  AttendanceStatus,
  // Phase 6
  TaskApprovalStatus,
  TaskChecklistItem,
  TaskAttachmentItem,
  TaskCommentItem,
  TaskActivityItem,
  WorkflowStage,
  TaskTemplate,
  WorkflowTemplate,
  WorkflowInstance,
  // Phase 8 Finance & Billing
  Quotation,
  QuotationStatus,
  QuotationItem,
  Invoice,
  InvoiceType,
  InvoiceStatus,
  InvoiceItem,
  Payment,
  PaymentMilestone,
  PaymentSchedule,
  Refund,
  CreditNote,
  Expense,
  ExpenseCategory,
  ExpenseApprovalStatus,
  FinancialSettings,
  PlatformSubscriptionPlan,
  StudioSubscription,
  PlatformStudioSubscription,
  // Phase 9 Analytics & Reporting Intelligence
  AnalyticsDatePreset,
  AnalyticsFilter,
  MainKPIs,
  OperationalAlert,
  OperationalAlertType,
  OperationalAlertSeverity,
  ReportCategory,
  SavedReportConfig,
  ReportJob,
  ProductionFunnelStage,
  CustomerSegmentationSummary,
  PlatformSaaSAnalytics,
  // Phase 10 Platform Super Admin & SaaS Subscription Management
  PlatformRole,
  PlatformPermission,
  PlatformAdminUser,
  StudioLifecycleStatus,
  SaaSSubscriptionStatus,
  PlatformPlan,
  SubscriptionTransitionRecord,
  PlatformInvoice,
  PlatformPayment,
  FeatureCatalogItem,
  PlatformAnnouncement,
  SupportTicket,
  SupportAccessGrant,
  PlatformAuditLog,
  // Phase 12 External Suppliers, Collaboration & Multi-Studio
  SupplierCategory,
  Supplier,
  SupplierMember,
  SupplierAssignmentStatus,
  SupplierPaymentStatus,
  SupplierAssignment,
  CollaborationStatus,
  StudioCollaborationRequest,
  StudioFeatureSettings,
  PlatformStudioFeatureOverride,
  CustomerPrivacyPolicy,
  EmployeeCredentials,
  DashboardWidgetConfig,
  // Phase 13 Simple Booking & Workspace
  PaymentScheduleItem,
  DeliverablesConfig
} from './schema';
export { SUPPLIER_CATEGORY_LABELS } from './schema';

// Master Admin & Global RBAC Control Center
export * from './masterAdmin';

// Advanced Booking, Billing, Production & Delivery Management
export * from './bookingProduction';

