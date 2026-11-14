import { 
  Users, 
  IndianRupee, 
  BarChart3, 
  FileText, 
  Calendar, 
  CheckSquare, 
  Truck, 
  FolderLock, 
  Clock, 
  Plane, 
  CreditCard,
  Package,
  MessageSquare,
  Shield,
  Building2,
  FileSpreadsheet
} from 'lucide-react';

export interface PlatformFeatureDefinition {
  id: string;
  key: string;
  name: string;
  description: string;
  category: 'CRM' | 'Finance' | 'Operations' | 'HR' | 'Analytics' | 'Creative' | 'Logistics';
  icon: string;
  route: string;
  requiredPermissions: string[];
  minPlan: 'starter' | 'professional' | 'enterprise';
  dependencies: string[]; // Feature IDs required
  defaultEnabled: boolean;
  defaultHidden: boolean;
}

export const CENTRAL_FEATURE_REGISTRY: PlatformFeatureDefinition[] = [
  {
    id: 'customer_crm',
    key: 'crm_customers',
    name: 'Customer CRM & Pipeline',
    description: 'Customer directory, lead pipeline, VIP categorization, and communication logs',
    category: 'CRM',
    icon: 'Users',
    route: 'customers',
    requiredPermissions: ['customers:view'],
    minPlan: 'starter',
    dependencies: [],
    defaultEnabled: true,
    defaultHidden: false
  },
  {
    id: 'whatsapp_chat',
    key: 'whatsapp_chat',
    name: 'WhatsApp Click-to-Chat',
    description: 'Pre-formatted templated WhatsApp messages for shoot schedules and quotes',
    category: 'CRM',
    icon: 'MessageSquare',
    route: 'customers',
    requiredPermissions: ['customers:view'],
    minPlan: 'starter',
    dependencies: ['customer_crm'],
    defaultEnabled: true,
    defaultHidden: false
  },
  {
    id: 'finance_billing',
    key: 'finance',
    name: 'Finance & Invoicing',
    description: 'Quotations, GST tax invoices, customer installment payments, and studio expenses',
    category: 'Finance',
    icon: 'IndianRupee',
    route: 'finance',
    requiredPermissions: ['invoices:view', 'payments:view'],
    minPlan: 'starter',
    dependencies: [],
    defaultEnabled: true,
    defaultHidden: false
  },
  {
    id: 'tasks_production',
    key: 'tasks',
    name: 'Task & Production Boards',
    description: 'Post-production checklists, editing milestones, and crew task assignments',
    category: 'Operations',
    icon: 'CheckSquare',
    route: 'tasks',
    requiredPermissions: ['tasks:view'],
    minPlan: 'starter',
    dependencies: [],
    defaultEnabled: true,
    defaultHidden: false
  },
  {
    id: 'advanced_delivery',
    key: 'deliverables',
    name: 'Advanced Delivery Tracking',
    description: 'Photobook courier tracking, pendrive delivery, client approval, and dispatch logs',
    category: 'Logistics',
    icon: 'Package',
    route: 'deliveries',
    requiredPermissions: ['events:view', 'tasks:view'],
    minPlan: 'starter',
    dependencies: ['tasks_production'],
    defaultEnabled: true,
    defaultHidden: false
  },
  {
    id: 'analytics_bi',
    key: 'analytics',
    name: 'Analytics & Business Intelligence',
    description: 'Studio revenue trends, booking conversion rates, and financial reports',
    category: 'Analytics',
    icon: 'BarChart3',
    route: 'analytics',
    requiredPermissions: ['reports:view'],
    minPlan: 'professional',
    dependencies: ['finance_billing'],
    defaultEnabled: true,
    defaultHidden: false
  },
  {
    id: 'report_center',
    key: 'reports',
    name: 'Report Center & Audits',
    description: 'Comprehensive financial, attendance, crew utilization, and CSV data exports',
    category: 'Analytics',
    icon: 'FileSpreadsheet',
    route: 'reports',
    requiredPermissions: ['reports:view'],
    minPlan: 'professional',
    dependencies: ['finance_billing'],
    defaultEnabled: true,
    defaultHidden: false
  },
  {
    id: 'leave_management',
    key: 'leave_management',
    name: 'Staff Leave System',
    description: 'Employee leave requests, approvals, leave balances, and calendar tracking',
    category: 'HR',
    icon: 'Plane',
    route: 'leave',
    requiredPermissions: ['leave:view'],
    minPlan: 'starter',
    dependencies: [],
    defaultEnabled: true,
    defaultHidden: false
  },
  {
    id: 'payroll_salaries',
    key: 'payroll',
    name: 'Confidential Payroll & Salaries',
    description: 'Monthly payroll runs, salary slips, deductions, allowances, and payment ledgers',
    category: 'Finance',
    icon: 'CreditCard',
    route: 'payroll',
    requiredPermissions: ['payroll:view', 'salary:view'],
    minPlan: 'professional',
    dependencies: ['leave_management'],
    defaultEnabled: true,
    defaultHidden: false
  },
  {
    id: 'external_suppliers',
    key: 'suppliers',
    name: 'External Suppliers Collaboration',
    description: 'Directory for freelance drone pilots, LED screen vendors, and equipment rentals',
    category: 'Logistics',
    icon: 'Truck',
    route: 'suppliers',
    requiredPermissions: ['events:view'],
    minPlan: 'starter',
    dependencies: [],
    defaultEnabled: true,
    defaultHidden: false
  },
  {
    id: 'multibranch',
    key: 'branches',
    name: 'Multi-Branch Management',
    description: 'Manage multiple studio offices, branch filters, and branch-specific crew',
    category: 'Operations',
    icon: 'Building2',
    route: 'settings',
    requiredPermissions: ['branches:view'],
    minPlan: 'professional',
    dependencies: [],
    defaultEnabled: true,
    defaultHidden: false
  }
];

export const getFeatureById = (id: string): PlatformFeatureDefinition | undefined => {
  return CENTRAL_FEATURE_REGISTRY.find(f => f.id === id || f.key === id);
};
