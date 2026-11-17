import { z } from 'zod';

// ==========================================
// 1. MASTER ADMIN & HIERARCHY
// Level 1: Master Admin (Platform Owner)
// Level 2: Studio Owner (Studio Super Admin)
// Level 3: Team Members
// ==========================================

export const MasterAdminRoleEnum = z.enum([
  'master_super_admin',
  'master_finance_admin',
  'master_support_admin',
  'master_auditor'
]);
export type MasterAdminRole = z.infer<typeof MasterAdminRoleEnum>;

export const MasterAdminPermissionEnum = z.enum([
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
  'manage_settings',
  'manage_global_rbac',
  'manage_features',
  'view_consolidated_reports'
]);
export type MasterAdminPermission = z.infer<typeof MasterAdminPermissionEnum>;

export const MasterAdminUserSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  role: MasterAdminRoleEnum,
  permissions: z.array(MasterAdminPermissionEnum).default([]),
  status: z.enum(['active', 'suspended']).default('active'),
  lastLoginAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional()
});
export type MasterAdminUser = z.infer<typeof MasterAdminUserSchema>;

// ==========================================
// 2. GLOBAL ROLE DEFINITIONS (14 DEFAULT ROLES)
// ==========================================

export const MasterGlobalRoleIdEnum = z.enum([
  'studio_owner',       // Studio Super Admin - full studio level
  'admin',              // Studio Admin
  'manager',            // Operations & Shoot Manager
  'photographer',       // Lead & Candid Photographer
  'videographer',       // Traditional & Event Videographer
  'cinematographer',    // Cinematic Director & Drone/Gimbal
  'photo_editor',       // Colorist & Retoucher
  'video_editor',       // Video Editor & Reel Creator
  'album_designer',     // Album & Photobook Layout Designer
  'accountant',         // Studio Accountant & Billing
  'delivery_manager',   // Deliverables, Prints & Courier Manager
  'receptionist',       // Front Desk, Inquiries & Lead Intake
  'external_supplier',  // Outside Freelancer / Vendor Partner
  'custom_role'         // Studio-specific custom role
]);
export type MasterGlobalRoleId = z.infer<typeof MasterGlobalRoleIdEnum>;

export interface MasterGlobalRoleMeta {
  id: MasterGlobalRoleId;
  name: string;
  label: string;
  description: string;
  isSystemRole: boolean;
  isProtected: boolean;
  category: 'Executive' | 'Management' | 'Creative Crew' | 'Post-Production' | 'Administration' | 'External';
}

export const MASTER_GLOBAL_ROLES_META: MasterGlobalRoleMeta[] = [
  {
    id: 'studio_owner',
    name: 'Studio Owner',
    label: 'Studio Owner',
    description: 'Complete studio-level authority. Manages employees, finances, settings, and workflows within their studio.',
    isSystemRole: true,
    isProtected: true,
    category: 'Executive'
  },
  {
    id: 'admin',
    name: 'Studio Admin',
    label: 'Studio Administrator',
    description: 'Operational studio admin. Cannot modify studio owner account or transfer studio ownership.',
    isSystemRole: true,
    isProtected: false,
    category: 'Executive'
  },
  {
    id: 'manager',
    name: 'Studio Manager',
    label: 'Operations & Production Manager',
    description: 'Manages bookings, shoot schedules, team assignments, crew dispatch, and workflow pipelines.',
    isSystemRole: true,
    isProtected: false,
    category: 'Management'
  },
  {
    id: 'photographer',
    name: 'Photographer',
    label: 'Lead / Candid Photographer',
    description: 'Views assigned shoots and sub-events. Updates shoot status and shot lists. Client PII & financials masked.',
    isSystemRole: true,
    isProtected: false,
    category: 'Creative Crew'
  },
  {
    id: 'videographer',
    name: 'Videographer',
    label: 'Event Videographer',
    description: 'Views assigned shoots and sub-events. Updates video footage logs and shoot completion status.',
    isSystemRole: true,
    isProtected: false,
    category: 'Creative Crew'
  },
  {
    id: 'cinematographer',
    name: 'Cinematographer',
    label: 'Cinematic Director / Drone Pilot',
    description: 'Handles cinematic shoots, drone flights, and gimbal setups for assigned events.',
    isSystemRole: true,
    isProtected: false,
    category: 'Creative Crew'
  },
  {
    id: 'photo_editor',
    name: 'Photo Editor',
    label: 'Photo Editor & Retoucher',
    description: 'Manages culling, color grading, retouching tasks, and proof uploads. No client financial access.',
    isSystemRole: true,
    isProtected: false,
    category: 'Post-Production'
  },
  {
    id: 'video_editor',
    name: 'Video Editor',
    label: 'Video Editor & Colorist',
    description: 'Edits teasers, highlight films, and full ceremony reels for assigned tasks.',
    isSystemRole: true,
    isProtected: false,
    category: 'Post-Production'
  },
  {
    id: 'album_designer',
    name: 'Album Designer',
    label: 'Album & Photobook Designer',
    description: 'Creates album layouts, tracks client proof reviews, and oversees print approvals.',
    isSystemRole: true,
    isProtected: false,
    category: 'Post-Production'
  },
  {
    id: 'accountant',
    name: 'Accountant',
    label: 'Studio Accountant & Finance Lead',
    description: 'Full finance authority: customer invoices, payment recording, expenses, payroll runs, and financial reports.',
    isSystemRole: true,
    isProtected: false,
    category: 'Administration'
  },
  {
    id: 'delivery_manager',
    name: 'Delivery Manager',
    label: 'Deliverables & Dispatch Manager',
    description: 'Tracks packaging, courier dispatches, pendrive delivery, and client handover sign-offs.',
    isSystemRole: true,
    isProtected: false,
    category: 'Administration'
  },
  {
    id: 'receptionist',
    name: 'Receptionist',
    label: 'Front Desk & Lead Coordinator',
    description: 'Customer inquiry intake, lead entry, client calendar viewing, and appointment coordination.',
    isSystemRole: true,
    isProtected: false,
    category: 'Administration'
  },
  {
    id: 'external_supplier',
    name: 'External Supplier',
    label: 'Supplier / Freelance Partner',
    description: 'Restricted portal view for outside vendors: sees only specifically assigned sub-events and submit status.',
    isSystemRole: true,
    isProtected: false,
    category: 'External'
  },
  {
    id: 'custom_role',
    name: 'Custom Studio Role',
    label: 'Custom Role Template',
    description: 'Configurable custom role created by Studio Owner within limits permitted by Master Admin.',
    isSystemRole: false,
    isProtected: false,
    category: 'Administration'
  }
];

// ==========================================
// 3. 28 STUDIO OS MODULES
// ==========================================

export const MasterModuleIdEnum = z.enum([
  'dashboard',
  'events',
  'sub_events',
  'bookings',
  'quotations',
  'customers_crm',
  'whatsapp',
  'team_members',
  'attendance_leave',
  'payroll_salary',
  'tasks',
  'workflows_pipelines',
  'calendar_scheduling',
  'deliverables_production',
  'invoices_billing',
  'payments_collections',
  'expenses_purchases',
  'financial_reports',
  'studio_analytics',
  'platform_analytics',
  'suppliers_vendors',
  'roles_permissions',
  'studio_settings',
  'branch_management',
  'audit_logs',
  'notifications',
  'customer_privacy',
  'export_download'
]);
export type MasterModuleId = z.infer<typeof MasterModuleIdEnum>;

export interface MasterModuleMeta {
  id: MasterModuleId;
  label: string;
  category: 'Core Operations' | 'Client & Sales' | 'Workforce' | 'Post-Production' | 'Finance & Accounts' | 'Governance & Analytics';
  description: string;
  isPlatformOnly?: boolean;
}

export const MASTER_MODULES_CATALOG: MasterModuleMeta[] = [
  // 1. Core Operations
  { id: 'dashboard', label: 'Dashboard', category: 'Core Operations', description: 'Studio operational overview and KPIs' },
  { id: 'events', label: 'Events', category: 'Core Operations', description: 'Main photography and videography events' },
  { id: 'sub_events', label: 'Sub-Events & Shoots', category: 'Core Operations', description: 'Individual shoot ceremonies, call times, crew allocations' },
  { id: 'bookings', label: 'Bookings & Confirmation', category: 'Core Operations', description: 'Booking lifecycle, dates, package agreements' },
  { id: 'calendar_scheduling', label: 'Calendar & Scheduling', category: 'Core Operations', description: 'Master calendar, shoot clashes, availability tracker' },
  
  // 2. Client & Sales
  { id: 'customers_crm', label: 'Customers CRM', category: 'Client & Sales', description: 'Client profiles, interaction logs, notes, family details' },
  { id: 'quotations', label: 'Quotations & Estimates', category: 'Client & Sales', description: 'Package pricing, proposals, client quotation acceptance' },
  { id: 'whatsapp', label: 'WhatsApp Integration', category: 'Client & Sales', description: 'Click-to-chat messaging, templates, client updates' },
  
  // 3. Workforce
  { id: 'team_members', label: 'Team Members / Employees', category: 'Workforce', description: 'Staff directory, emergency contacts, skills, designations' },
  { id: 'attendance_leave', label: 'Attendance & Leave', category: 'Workforce', description: 'Daily check-in logs, biometric/app attendance, leave approvals' },
  { id: 'payroll_salary', label: 'Payroll & Salary', category: 'Workforce', description: 'Monthly payroll runs, deductions, salary slips, advances' },
  { id: 'suppliers_vendors', label: 'Suppliers & Vendors', category: 'Workforce', description: 'External suppliers, gear rental houses, freelance crew' },
  
  // 4. Post-Production
  { id: 'tasks', label: 'Tasks & Production', category: 'Post-Production', description: 'Editing tickets, culling assignments, review stages' },
  { id: 'workflows_pipelines', label: 'Workflows & Pipelines', category: 'Post-Production', description: '12-stage photography production pipeline' },
  { id: 'deliverables_production', label: 'Deliverables & Production', category: 'Post-Production', description: 'Albums, pendrives, frames, client handover delivery' },
  
  // 5. Finance & Accounts
  { id: 'invoices_billing', label: 'Invoices & Billing', category: 'Finance & Accounts', description: 'Client tax invoices, GST calculations, line items' },
  { id: 'payments_collections', label: 'Payments & Collections', category: 'Finance & Accounts', description: 'Customer receipts, UPI, bank transfers, overdue balance' },
  { id: 'expenses_purchases', label: 'Expenses & Purchases', category: 'Finance & Accounts', description: 'Shoot expenses, travel, gear rent, studio petty cash' },
  { id: 'financial_reports', label: 'Financial Reports', category: 'Finance & Accounts', description: 'P&L, cash flow, outstanding aging, tax summaries' },
  
  // 6. Governance & Analytics
  { id: 'studio_analytics', label: 'Studio Analytics', category: 'Governance & Analytics', description: 'Studio business intelligence, shoot stats, team load' },
  { id: 'platform_analytics', label: 'Platform Analytics', category: 'Governance & Analytics', description: 'Macro SaaS platform KPIs (Master Admin Only)', isPlatformOnly: true },
  { id: 'roles_permissions', label: 'Roles & Permissions', category: 'Governance & Analytics', description: 'RBAC configuration, employee access matrix' },
  { id: 'studio_settings', label: 'Studio Settings', category: 'Governance & Analytics', description: 'Branding, business hours, currency, prefix configuration' },
  { id: 'branch_management', label: 'Branch Management', category: 'Governance & Analytics', description: 'Multi-branch locations, desks, regional hubs' },
  { id: 'audit_logs', label: 'Audit Logs', category: 'Governance & Analytics', description: 'Security trails, record modification timestamps' },
  { id: 'notifications', label: 'Notifications', category: 'Governance & Analytics', description: 'System alerts, shoot reminders, push broadcasts' },
  { id: 'customer_privacy', label: 'Customer Privacy Controls', category: 'Governance & Analytics', description: 'Masking of client PII (Client #001) & financial masking' },
  { id: 'export_download', label: 'Export & Download Data', category: 'Governance & Analytics', description: 'CSV/PDF exports, client zip archives, data backup' }
];

// ==========================================
// 4. 12 PERMISSION ACTIONS
// ==========================================

export const MasterActionIdEnum = z.enum([
  'view',
  'create',
  'edit',
  'delete',
  'export',
  'approve',
  'assign',
  'view_financials',
  'edit_financials',
  'view_client_pii',
  'manage_settings',
  'bulk_action'
]);
export type MasterActionId = z.infer<typeof MasterActionIdEnum>;

export interface MasterActionMeta {
  id: MasterActionId;
  label: string;
  description: string;
  isSensitive?: boolean;
}

export const MASTER_ACTIONS_CATALOG: MasterActionMeta[] = [
  { id: 'view', label: 'View', description: 'Read records in this module' },
  { id: 'create', label: 'Create', description: 'Add new records in this module' },
  { id: 'edit', label: 'Edit', description: 'Modify existing records' },
  { id: 'delete', label: 'Delete', description: 'Remove or archive records' },
  { id: 'export', label: 'Export', description: 'Download CSV, Excel or PDF datasets' },
  { id: 'approve', label: 'Approve', description: 'Approve leave, expenses, quotations, proofs' },
  { id: 'assign', label: 'Assign', description: 'Assign tasks, shoots, or crew to team members' },
  { id: 'view_financials', label: 'View Financials', description: 'See prices, budgets, payments, salaries (₹)', isSensitive: true },
  { id: 'edit_financials', label: 'Edit Financials', description: 'Modify rates, issue invoices, enter payments', isSensitive: true },
  { id: 'view_client_pii', label: 'View Client PII', description: 'Unmask client personal phone, email, address', isSensitive: true },
  { id: 'manage_settings', label: 'Manage Settings', description: 'Configure module rules, thresholds and prefixes' },
  { id: 'bulk_action', label: 'Bulk Action', description: 'Perform bulk updates or multi-row operations' }
];

// ==========================================
// 5. RESOURCE SCOPES
// ==========================================

export const MasterResourceScopeEnum = z.enum([
  'all',
  'assigned_only',
  'branch_only',
  'department_only',
  'none'
]);
export type MasterResourceScope = z.infer<typeof MasterResourceScopeEnum>;

export interface ResourceScopeMeta {
  id: MasterResourceScope;
  label: string;
  description: string;
}

export const MASTER_RESOURCE_SCOPES: ResourceScopeMeta[] = [
  { id: 'all', label: 'All Studio Records', description: 'Access records across the entire studio' },
  { id: 'assigned_only', label: 'Assigned Only', description: 'Access only records explicitly assigned to the logged-in user' },
  { id: 'branch_only', label: 'Branch Only', description: 'Access records belonging to the user\'s home branch' },
  { id: 'department_only', label: 'Department Only', description: 'Access records within the user\'s department' },
  { id: 'none', label: 'None', description: 'No access granted' }
];

// ==========================================
// 6. FIELD LEVEL ACCESS RULES
// ==========================================

export interface FieldAccessPolicy {
  fieldName: string;
  fieldLabel: string;
  module: MasterModuleId;
  isPii?: boolean;
  isFinancial?: boolean;
  visibleRoles: MasterGlobalRoleId[];
  editableRoles: MasterGlobalRoleId[];
  requiredAction?: MasterActionId;
}

export const GLOBAL_FIELD_POLICIES: FieldAccessPolicy[] = [
  // Customer PII
  { fieldName: 'phone', fieldLabel: 'Customer Phone', module: 'customers_crm', isPii: true, visibleRoles: ['studio_owner', 'admin', 'manager', 'receptionist'], editableRoles: ['studio_owner', 'admin', 'manager', 'receptionist'], requiredAction: 'view_client_pii' },
  { fieldName: 'email', fieldLabel: 'Customer Email', module: 'customers_crm', isPii: true, visibleRoles: ['studio_owner', 'admin', 'manager', 'receptionist'], editableRoles: ['studio_owner', 'admin', 'manager'], requiredAction: 'view_client_pii' },
  { fieldName: 'address', fieldLabel: 'Customer Home Address', module: 'customers_crm', isPii: true, visibleRoles: ['studio_owner', 'admin', 'manager'], editableRoles: ['studio_owner', 'admin', 'manager'], requiredAction: 'view_client_pii' },
  
  // Financial Records
  { fieldName: 'totalAmount', fieldLabel: 'Event / Booking Fee', module: 'events', isFinancial: true, visibleRoles: ['studio_owner', 'admin', 'manager', 'accountant'], editableRoles: ['studio_owner', 'admin', 'accountant'], requiredAction: 'view_financials' },
  { fieldName: 'advancePaid', fieldLabel: 'Advance & Payments Received', module: 'events', isFinancial: true, visibleRoles: ['studio_owner', 'admin', 'manager', 'accountant'], editableRoles: ['studio_owner', 'admin', 'accountant'], requiredAction: 'view_financials' },
  { fieldName: 'balanceAmount', fieldLabel: 'Outstanding Balance', module: 'invoices_billing', isFinancial: true, visibleRoles: ['studio_owner', 'admin', 'manager', 'accountant'], editableRoles: ['studio_owner', 'admin', 'accountant'], requiredAction: 'view_financials' },
  { fieldName: 'monthlySalary', fieldLabel: 'Employee Monthly CTC', module: 'payroll_salary', isFinancial: true, visibleRoles: ['studio_owner', 'admin', 'accountant'], editableRoles: ['studio_owner', 'accountant'], requiredAction: 'view_financials' }
];

// ==========================================
// 7. GLOBAL ROLE MATRIX & STUDIO OVERRIDES
// ==========================================

export type ModulePermissionMap = Record<MasterActionId, boolean>;

export interface GlobalRoleDefinition {
  id: MasterGlobalRoleId;
  name: string;
  label: string;
  description: string;
  isSystemRole: boolean;
  isProtected: boolean;
  isHidden?: boolean;
  isEnabled?: boolean;
  category?: string;
  createdAt?: string;
  defaultPermissions: Partial<Record<MasterModuleId, Partial<Record<MasterActionId, boolean>>>>;
  defaultScopes: Partial<Record<MasterModuleId, MasterResourceScope>>;
  mandatoryLockedActions?: Partial<Record<MasterModuleId, MasterActionId[]>>; // Studio Owner cannot enable/disable
  studioConfigurableActions?: Partial<Record<MasterModuleId, MasterActionId[]>>;
  updatedAt: string;
}

export interface StudioRoleOverride {
  id: string; // override_${studioId}_${roleId}
  studioId: string;
  roleId: MasterGlobalRoleId;
  roleName?: string;
  overriddenPermissions: Partial<Record<MasterModuleId, Partial<Record<MasterActionId, boolean>>>>;
  overriddenScopes: Partial<Record<MasterModuleId, MasterResourceScope>>;
  isCustomRole?: boolean;
  isLockedByMaster?: boolean;
  customRoleName?: string;
  updatedBy: string;
  updatedAt: string;
}

// ==========================================
// 8. 5-TIER FEATURE VISIBILITY ENGINE
// ==========================================

export interface GlobalFeaturePolicy {
  key: string;
  name: string;
  description: string;
  category: 'Communication' | 'Finance' | 'Creative' | 'Security' | 'Logistics';
  globalEnabled: boolean;       // Tier 1
  minPlanRequired: 'starter' | 'professional' | 'enterprise'; // Tier 2
  statusFlag: 'stable' | 'beta' | 'deprecated';
  updatedAt: string;
}

export interface FeatureResolutionResult {
  featureKey: string;
  featureName: string;
  isAvailable: boolean;
  activeTier: 1 | 2 | 3 | 4 | 5;
  tierStatus: {
    tier1Global: boolean;
    tier2PlanEntitled: boolean;
    tier3MasterOverride: 'forced_enabled' | 'forced_disabled' | 'default';
    tier4StudioPreference: boolean;
    tier5RolePermission: boolean;
  };
  reason: string;
}

// ==========================================
// 9. 16 MASTER DASHBOARD KPIS & 9 CHARTS
// ==========================================

export interface MasterDashboardKPIs {
  totalStudios: number;
  activeStudios: number;
  hiddenStudios: number;
  suspendedStudios: number;
  activeSubscriptions: number;
  expiredPastDueSubscriptions: number;
  totalStudioEmployees: number;
  totalEvents: number;
  completedEvents: number;
  upcomingEvents: number;
  confirmedBookings: number;
  invoicedRevenue: number;
  paymentsReceived: number;
  outstandingBalance: number;
  platformMrr: number;
  renewalsDueNext30Days: number;
  
  // Percentages / trends
  trends: {
    studiosGrowth: string;
    revenueGrowth: string;
    subscriptionGrowth: string;
    eventsGrowth: string;
  };
}

export interface MasterChartDatasets {
  studioRegistrationGrowth: Array<{ month: string; count: number; cumulative: number }>;
  revenueAcrossStudios: Array<{ month: string; invoiced: number; received: number }>;
  platformSubscriptionGrowth: Array<{ month: string; mrr: number; activeStudios: number }>;
  eventsCompletedByMonth: Array<{ month: string; completed: number; total: number }>;
  bookingsByStudio: Array<{ studioId: string; studioName: string; bookingsCount: number }>;
  revenueByStudio: Array<{ studioId: string; studioName: string; revenue: number; percentage: number }>;
  employeeGrowthAcrossStudios: Array<{ month: string; count: number }>;
  subscriptionPlanDistribution: Array<{ planId: string; planName: string; count: number; percentage: number }>;
  studioActivityComparison: Array<{ studioId: string; studioName: string; events: number; tasks: number; revenue: number }>;
}

export interface MasterFilterState {
  dateRange: 'today' | 'yesterday' | 'this_week' | 'this_month' | 'this_quarter' | 'this_year' | 'all_time' | 'custom';
  startDate?: string;
  endDate?: string;
  studioId?: string; // 'all' or specific studio ID
  city?: string;
  planId?: string;
  studioStatus?: 'all' | 'active' | 'hidden' | 'suspended';
  eventCategory?: string;
}

// ==========================================
// 10. ALL STUDIOS TABLE (14 COLUMNS)
// ==========================================

export interface MasterStudioListItem {
  studioId: string;
  studioCode: string;
  name: string;
  logoUrl?: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  city: string;
  state: string;
  subscriptionPlan: string;
  subscriptionStatus: 'active' | 'trial' | 'past_due' | 'suspended' | 'expired';
  renewalDate: string;
  activeEmployeesCount: number;
  totalEventsCount: number;
  totalRevenue: number;
  status: 'active' | 'hidden' | 'suspended' | 'draft';
  createdAt: string;
}

// ==========================================
// 11. 13 CONSOLIDATED PLATFORM REPORTS
// ==========================================

export const MasterReportTypeEnum = z.enum([
  'platform_revenue',
  'studio_performance',
  'cross_studio_events',
  'subscription_aging',
  'feature_adoption',
  'employee_statistics',
  'financial_audit',
  'storage_utilization',
  'customer_volume',
  'delivery_efficiency',
  'supplier_utilization',
  'churn_risk',
  'audit_trail'
]);
export type MasterReportType = z.infer<typeof MasterReportTypeEnum>;

export interface MasterReportMetadata {
  id: MasterReportType;
  title: string;
  description: string;
  category: 'Financial' | 'Operational' | 'Subscribers' | 'System';
}

export const MASTER_REPORTS_LIST: MasterReportMetadata[] = [
  { id: 'platform_revenue', title: 'Platform Revenue Report', description: 'Monthly SaaS revenue, MRR, ARPU, churn rate, and plan breakdown', category: 'Financial' },
  { id: 'studio_performance', title: 'Studio Performance Comparison', description: 'Studios ranked by shoot volume, revenue generation, growth, and team efficiency', category: 'Operational' },
  { id: 'cross_studio_events', title: 'Cross-Studio Event Volume Report', description: 'Aggregated shoot distribution by category (Wedding, Pre-Wedding, Corporate) and month', category: 'Operational' },
  { id: 'subscription_aging', title: 'Subscription Aging Report', description: 'Studios with subscriptions expiring in 7, 15, 30, and 60 days with renewal status', category: 'Subscribers' },
  { id: 'feature_adoption', title: 'Feature Adoption Report', description: 'Platform-wide usage metrics for CRM, WhatsApp, Invoicing, RBAC, and Suppliers', category: 'Operational' },
  { id: 'employee_statistics', title: 'Platform Employee Statistics', description: 'Total employees, photographers, editors, and role distribution across all studios', category: 'Operational' },
  { id: 'financial_audit', title: 'Financial Audit Summary', description: 'Total invoiced vs received across all studios, outstanding overdue amounts and GST', category: 'Financial' },
  { id: 'storage_utilization', title: 'Storage & Resource Utilization', description: 'Cloud storage used per studio, GB quotas, event limits, and overage flags', category: 'System' },
  { id: 'customer_volume', title: 'Customer Volume Report', description: 'Total unique client accounts across platform, new leads per month, booking conversions', category: 'Operational' },
  { id: 'delivery_efficiency', title: 'Delivery & Workflow Efficiency', description: 'Average turnaround days from shoot completion to client proof and album dispatch', category: 'Operational' },
  { id: 'supplier_utilization', title: 'Supplier Utilization Report', description: 'Active external suppliers, drone pilots, rental houses, and cross-studio usage', category: 'Operational' },
  { id: 'churn_risk', title: 'Studio Health & Churn Risk Report', description: 'Inactive studios, declining booking activity, and retention risk alerts', category: 'Subscribers' },
  { id: 'audit_trail', title: 'Platform Audit Trail Report', description: 'Comprehensive audit trail of Master Admin actions, overrides, and studio updates', category: 'System' }
];

export interface MasterReportResult {
  reportType: MasterReportType;
  title: string;
  generatedAt: string;
  filterSummary: string;
  summaryMetrics: Array<{ label: string; value: string | number; change?: string }>;
  columns: string[];
  rows: Array<Record<string, any>>;
}
