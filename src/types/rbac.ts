import { PermissionModule, PermissionAction, AccessScope, FieldVisibility } from './schema';

export interface ModuleMetadata {
  id: PermissionModule;
  label: string;
  category: 'Operations' | 'CRM & Creative' | 'Team & Workforce' | 'Finance' | 'Assets & Logistics' | 'System & Governance';
  description: string;
  supportedActions: PermissionAction[];
  sensitiveFields?: string[];
}

export const PERMISSION_MODULES_CATALOG: ModuleMetadata[] = [
  // 1. Operations
  {
    id: 'dashboard',
    label: 'Dashboard',
    category: 'Operations',
    description: 'Executive KPI metrics, charts, activity feeds and schedule widgets.',
    supportedActions: ['view', 'export']
  },
  {
    id: 'events',
    label: 'Main Events',
    category: 'Operations',
    description: 'Booking records, dates, venues, packages, customer assignments.',
    supportedActions: ['view', 'create', 'edit', 'delete', 'export', 'share', 'assign', 'approve', 'reject'],
    sensitiveFields: ['budget', 'totalAmount', 'advancePaid', 'internalNotes']
  },
  {
    id: 'subEvents',
    label: 'Sub-Events & Shoots',
    category: 'Operations',
    description: 'Parent-child sub-events, call times, crew allocations, shoot briefs.',
    supportedActions: ['view', 'create', 'edit', 'delete', 'export', 'share', 'assign'],
    sensitiveFields: ['internalNotes']
  },
  {
    id: 'tasks',
    label: 'Tasks & Deliverables',
    category: 'Operations',
    description: 'Post-production tasks, editing queues, album reviews and delivery tracking.',
    supportedActions: ['view', 'create', 'edit', 'delete', 'export', 'assign', 'approve', 'reject']
  },
  {
    id: 'calendar',
    label: 'Calendar & Schedules',
    category: 'Operations',
    description: 'Master studio timeline, shoot schedules and crew calendar.',
    supportedActions: ['view', 'export']
  },

  // 2. CRM & Creative
  {
    id: 'customers',
    label: 'Customers CRM',
    category: 'CRM & Creative',
    description: 'Client profiles, contact details, booking history and notes.',
    supportedActions: ['view', 'create', 'edit', 'delete', 'export', 'share'],
    sensitiveFields: ['phone', 'email', 'totalSpent', 'pendingBalance']
  },
  {
    id: 'documents',
    label: 'Documents & Contracts',
    category: 'CRM & Creative',
    description: 'Client agreements, model releases, quotations and handover forms.',
    supportedActions: ['view', 'create', 'edit', 'delete', 'download', 'share', 'approve', 'reject']
  },
  {
    id: 'reports',
    label: 'Analytics & Reports',
    category: 'CRM & Creative',
    description: 'Revenue reports, shoot statistics, team performance analytics.',
    supportedActions: ['view', 'export', 'download']
  },

  // 3. Team & Workforce
  {
    id: 'team',
    label: 'Team Members',
    category: 'Team & Workforce',
    description: 'Staff profiles, designations, emergency contacts, branch allocations.',
    supportedActions: ['view', 'create', 'edit', 'delete', 'export', 'assign'],
    sensitiveFields: ['phone', 'email', 'emergencyContact', 'salaryDetails', 'bankDetails']
  },
  {
    id: 'departments',
    label: 'Departments',
    category: 'Team & Workforce',
    description: 'Photography, Cinematography, Editing, Design and Accounts divisions.',
    supportedActions: ['view', 'create', 'edit', 'delete']
  },
  {
    id: 'attendance',
    label: 'Attendance & Check-in',
    category: 'Team & Workforce',
    description: 'Daily check-in logs, biometric/app attendance and event presence.',
    supportedActions: ['view', 'create', 'edit', 'delete', 'export']
  },
  {
    id: 'leave',
    label: 'Leave Management',
    category: 'Team & Workforce',
    description: 'Leave applications, category balances, approvals and holidays.',
    supportedActions: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export']
  },

  // 4. Finance & Billing
  {
    id: 'salary',
    label: 'Salary Profiles',
    category: 'Finance',
    description: 'Employee compensation structures, monthly CTC, daily wages, bank details.',
    supportedActions: ['view', 'create', 'edit', 'delete', 'export'],
    sensitiveFields: ['monthlySalary', 'dailySalary', 'bankDetails', 'netPayableSalary']
  },
  {
    id: 'payroll',
    label: 'Monthly Payroll',
    category: 'Finance',
    description: 'Monthly payroll runs, attendance adjustments, bonus, advance deductions and salary disbursements.',
    supportedActions: ['view', 'create', 'edit', 'delete', 'approve', 'export']
  },
  {
    id: 'invoices',
    label: 'Invoices & Billing',
    category: 'Finance',
    description: 'Client tax invoices, GST breakdowns, line items and overdue tracking.',
    supportedActions: ['view', 'create', 'edit', 'delete', 'export', 'download', 'share', 'approve', 'reject']
  },
  {
    id: 'payments',
    label: 'Payments & Receipts',
    category: 'Finance',
    description: 'UPI, bank transfer, cash collection logs and transaction verification.',
    supportedActions: ['view', 'create', 'edit', 'delete', 'export', 'approve', 'reject']
  },
  {
    id: 'expenses',
    label: 'Studio & Shoot Expenses',
    category: 'Finance',
    description: 'Travel, lodging, freelance fees, rentals and petty cash expense claims.',
    supportedActions: ['view', 'create', 'edit', 'delete', 'export', 'approve', 'reject']
  },

  // 5. Assets & Logistics
  {
    id: 'equipment',
    label: 'Equipment & Gear',
    category: 'Assets & Logistics',
    description: 'Camera bodies, lenses, drones, lighting and shoot checkouts.',
    supportedActions: ['view', 'create', 'edit', 'delete', 'assign', 'export']
  },
  {
    id: 'inventory',
    label: 'Inventory & Supplies',
    category: 'Assets & Logistics',
    description: 'Hard drives, memory cards, studio backdrops and consumable items.',
    supportedActions: ['view', 'create', 'edit', 'delete', 'export']
  },

  // 6. System & Governance
  {
    id: 'roles',
    label: 'Role & Permissions (RBAC)',
    category: 'System & Governance',
    description: 'Role definitions, granular matrix policies, employee overrides.',
    supportedActions: ['view', 'create', 'edit', 'delete', 'manageSettings']
  },
  {
    id: 'settings',
    label: 'Studio Settings',
    category: 'System & Governance',
    description: 'Studio profile, branding, logo, GST info, business configurations.',
    supportedActions: ['view', 'edit', 'manageSettings']
  },
  {
    id: 'branches',
    label: 'Branch Management',
    category: 'System & Governance',
    description: 'Multi-branch locations, head offices and regional studios.',
    supportedActions: ['view', 'create', 'edit', 'delete']
  },
  {
    id: 'notifications',
    label: 'System Notifications',
    category: 'System & Governance',
    description: 'Alert broadcasts, shoot reminders and workflow pings.',
    supportedActions: ['view', 'create', 'delete']
  },
  {
    id: 'auditLogs',
    label: 'Security & Audit Logs',
    category: 'System & Governance',
    description: 'Immutable system audit trails of every record creation, edit and deletion.',
    supportedActions: ['view', 'export']
  }
];

export const ALL_PERMISSION_ACTIONS: PermissionAction[] = [
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
];

export const ACCESS_SCOPES: AccessScope[] = [
  'all',
  'branch',
  'department',
  'assigned',
  'own',
  'custom'
];
