import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { 
  StudioProfile, 
  User, 
  Customer, 
  StudioEvent, 
  Task, 
  StudioNotification, 
  UserRole,
  EventStatus,
  TaskStatus,
  EventAttachment,
  EventAssignment,
  SubEvent,
  SubEventStatus,
  SubEventMemberAssignment,
  Role,
  Employee,
  EmploymentStatus,
  SalaryProfile,
  PayrollRun,
  SalaryTransaction,
  LeaveType,
  LeaveRequest,
  LeaveBalance,
  AttendanceRecord,
  PermissionModule,
  PermissionAction,
  PermissionOverride,
  ApprovalRequest,
  ApprovalHistory,
  WorkflowTemplate,
  WorkflowInstance,
  // Phase 7 CRM & WhatsApp
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
  // Phase 8 Finance & Billing
  Quotation,
  Invoice,
  Payment,
  Refund,
  Expense,
  FinancialSettings
} from '../types';
import { AuditLog } from '../types/schema';
import { useStudio } from './StudioContext';
import { eventService } from '../services/eventService';
import { customerService, CRMDashboardMetrics } from '../services/customerService';
import { taskService, EmployeeWorkloadItem } from '../services/taskService';
import { workflowService } from '../services/workflowService';
import { notificationService } from '../services/notificationService';
import { memberService } from '../services/memberService';
import { auditService } from '../services/auditService';
import { subEventService } from '../services/subEventService';
import { employeeService } from '../services/employeeService';
import { roleService } from '../services/roleService';
import { salaryService } from '../services/salaryService';
import { payrollService } from '../services/payrollService';
import { leaveService } from '../services/leaveService';
import { attendanceService } from '../services/attendanceService';
import { authCredentialService } from '../services/authCredentialService';
import { authorizationEngine, AuthorizationContext } from '../services/authorizationEngine';
import { permissionOverrideService } from '../services/permissionOverrideService';
import { approvalService } from '../services/approvalService';
import { leadService } from '../services/leadService';
import { whatsappService } from '../services/whatsappService';
import { followUpService } from '../services/followUpService';
import { quotationService } from '../services/quotationService';
import { invoiceService } from '../services/invoiceService';
import { paymentService } from '../services/paymentService';
import { expenseService } from '../services/expenseService';
import { financialSettingsService } from '../services/financialSettingsService';
import { pdfGeneratorService } from '../services/pdfGeneratorService';
import { TenantStore } from '../services/tenantStore';
import { ShreejiBookingSeedService } from '../services/shreejiBookingSeedService';
import { unifiedAuthService } from '../services/unifiedAuthService';
import { liveRbacService } from '../services/liveRbacService';
import { liveFeatureService } from '../services/liveFeatureService';
import { featureVisibilityService } from '../services/featureVisibilityService';
import { auth as firebaseAuth } from '../lib/firebase';

export type EventViewMode = 'list' | 'calendar' | 'kanban' | 'mobile';

export interface EventFilterState {
  status?: string;
  category?: string;
  dateRange?: string; // 'Today' | 'This Week' | 'This Month' | 'This Year' | 'Custom'
  startDate?: string;
  endDate?: string;
  search?: string;
}

export type EventRouteState = 
  | { mode: 'list'; view?: EventViewMode }
  | { mode: 'create' }
  | { mode: 'detail'; eventId: string }
  | { mode: 'edit'; eventId: string };

interface AppContextType {
  // Studio & Auth preview
  studio: StudioProfile;
  currentUser: User;
  users: User[];
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  isRoleSwitcherOpen: boolean;
  setIsRoleSwitcherOpen: (open: boolean) => void;

  // Navigation & Sub-routing
  activeTab: string;
  setActiveTab: (tab: string) => void;
  eventRoute: EventRouteState;
  setEventRoute: (route: EventRouteState) => void;
  navigateToEvents: (filter?: EventFilterState, view?: EventViewMode) => void;
  navigateToCreateEvent: () => void;
  navigateToEventDetail: (eventId: string) => void;
  navigateToEditEvent: (eventId: string) => void;

  // Event Filters
  eventFilterOverride: EventFilterState | null;
  setEventFilterOverride: (filter: EventFilterState | null) => void;

  // Events
  events: StudioEvent[];
  selectedEventId: string | null;
  setSelectedEventId: (id: string | null) => void;
  isEventFormOpen: boolean;
  setIsEventFormOpen: (open: boolean) => void;
  editingEvent: StudioEvent | null;
  setEditingEvent: (event: StudioEvent | null) => void;
  createEvent: (eventData: Omit<StudioEvent, 'id' | 'eventNumber' | 'createdAt' | 'updatedAt'>) => StudioEvent;
  updateEvent: (id: string, updates: Partial<StudioEvent>) => void;
  deleteEvent: (id: string) => void;
  updateEventStatus: (id: string, status: EventStatus, remarks?: string) => void;
  addEventAttachment: (eventId: string, attachment: Omit<EventAttachment, 'id' | 'uploadedAt'>) => void;
  removeEventAttachment: (eventId: string, attachmentId: string) => void;
  assignMemberToEvent: (eventId: string, assignment: EventAssignment) => void;
  removeMemberFromEvent: (eventId: string, memberId: string) => void;

  // Customers & CRM (Phase 7)
  customers: Customer[];
  selectedCustomerId: string | null;
  setSelectedCustomerId: (id: string | null) => void;
  isCustomerFormOpen: boolean;
  setIsCustomerFormOpen: (open: boolean) => void;
  editingCustomer: Customer | null;
  setEditingCustomer: (customer: Customer | null) => void;
  createCustomer: (customerData: Partial<Customer> & { name: string; phone: string; allowDuplicate?: boolean }) => Customer;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  mergeCustomers: (primaryId: string, secondaryId: string, resolutions: Partial<Customer>) => Customer;
  addCustomerNote: (customerId: string, text: string, isPrivate?: boolean) => CustomerNote;
  listCustomerNotes: (customerId: string) => CustomerNote[];
  logCustomerInteraction: (customerId: string, interaction: { type: 'whatsapp' | 'call' | 'email' | 'meeting' | 'note' | 'booking'; summary: string }) => CustomerInteraction;
  listCustomerInteractions: (customerId: string) => CustomerInteraction[];
  crmDashboardMetrics: CRMDashboardMetrics;

  // Leads & Pipeline
  leads: Lead[];
  selectedLeadId: string | null;
  setSelectedLeadId: (id: string | null) => void;
  isLeadModalOpen: boolean;
  setIsLeadModalOpen: (open: boolean) => void;
  editingLead: Lead | null;
  setEditingLead: (lead: Lead | null) => void;
  createLead: (data: any) => Lead;
  updateLead: (id: string, updates: Partial<Lead>) => Lead;
  deleteLead: (id: string) => void;
  convertLead: (id: string, options?: any) => { customer: any; event?: any; lead: Lead };

  // Follow-Ups
  followUps: FollowUp[];
  isFollowUpModalOpen: boolean;
  setIsFollowUpModalOpen: (open: boolean) => void;
  editingFollowUp: FollowUp | null;
  setEditingFollowUp: (fu: FollowUp | null) => void;
  createFollowUp: (data: any) => FollowUp;
  completeFollowUp: (id: string, completionNotes?: string) => FollowUp;
  rescheduleFollowUp: (id: string, newDueDate: string, newDueTime?: string) => FollowUp;
  reassignFollowUp: (id: string, newEmployeeId: string, newEmployeeName: string) => FollowUp;

  // WhatsApp Message Templates & Logs
  messageTemplates: MessageTemplate[];
  messageLogs: WhatsAppLog[];
  createMessageTemplate: (data: any) => MessageTemplate;
  updateMessageTemplate: (id: string, updates: Partial<MessageTemplate>) => MessageTemplate;
  duplicateMessageTemplate: (id: string) => MessageTemplate;
  deleteMessageTemplate: (id: string) => void;
  isWhatsAppPreviewOpen: boolean;
  setIsWhatsAppPreviewOpen: (open: boolean) => void;
  whatsAppPreviewData: { customer: Customer | null; templateId?: string; prefilledMessage?: string; event?: StudioEvent | null; lead?: Lead | null } | null;
  openWhatsAppModal: (data: { customer: Customer | null; templateId?: string; prefilledMessage?: string; event?: StudioEvent | null; lead?: Lead | null }) => void;
  logWhatsAppClick: (data: { customerId: string; customerName: string; phone: string; templateTitle?: string; messageText: string; relatedEventId?: string; relatedLeadId?: string }) => WhatsAppLog;
  confirmWhatsAppSent: (logId: string) => void;
  cancelWhatsAppLog: (logId: string, reason?: string) => void;

  // Merge Modal
  isMergeModalOpen: boolean;
  setIsMergeModalOpen: (open: boolean) => void;
  mergeModalData: { primaryCustomer: Customer; secondaryCustomer: Customer } | null;
  openMergeModal: (primaryCustomer: Customer, secondaryCustomer: Customer) => void;

  // Tasks (Phase 6 Advanced Task Management)
  tasks: Task[];
  selectedTaskId: string | null;
  setSelectedTaskId: (id: string | null) => void;
  isTaskFormOpen: boolean;
  setIsTaskFormOpen: (open: boolean) => void;
  isTaskDetailModalOpen: boolean;
  setIsTaskDetailModalOpen: (open: boolean) => void;
  createTask: (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Task;
  updateTask: (id: string, updates: Partial<Task>) => Task;
  updateTaskStatus: (id: string, status: TaskStatus, managerOverrideReason?: string) => void;
  deleteTask: (id: string) => void;
  addChecklistItem: (taskId: string, title: string) => void;
  toggleChecklistItem: (taskId: string, itemId: string) => void;
  addComment: (taskId: string, text: string, isInternal?: boolean) => void;
  addAttachment: (taskId: string, attachment: { name: string; url: string; fileType?: string; size?: number }) => void;
  submitTaskForReview: (taskId: string) => void;
  approveTask: (taskId: string, reviewNotes?: string) => void;
  rejectTask: (taskId: string, reviewNotes: string) => void;
  reassignTask: (taskId: string, newAssigneeId: string, newAssigneeName: string, reason?: string) => void;
  recalculateDueDates: (eventId: string, newEventDate: string, shiftDays: number) => { affectedTasksCount: number };
  teamWorkload: EmployeeWorkloadItem[];

  // Photography Production Workflows (Phase 6)
  workflowTemplates: WorkflowTemplate[];
  workflowInstances: WorkflowInstance[];
  createWorkflowTemplate: (data: any) => WorkflowTemplate;
  updateWorkflowTemplate: (id: string, updates: Partial<WorkflowTemplate>) => WorkflowTemplate;
  duplicateWorkflowTemplate: (id: string) => WorkflowTemplate;
  deleteWorkflowTemplate: (id: string) => void;
  attachWorkflow: (params: { templateId: string; entityType: 'main_event' | 'sub_event' | 'production_job'; entityId: string; entityName: string }) => WorkflowInstance;
  generateTasksFromWorkflow: (workflowInstanceId: string, entityStartDate?: string) => Task[];
  updateWorkflowStage: (workflowId: string, stageId: string) => void;

  // Notifications
  notifications: StudioNotification[];
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  unreadNotificationsCount: number;

  // Audit Logs
  auditLogs: AuditLog[];

  // Sub-Events
  subEvents: SubEvent[];
  selectedSubEventId: string | null;
  setSelectedSubEventId: (id: string | null) => void;
  isSubEventModalOpen: boolean;
  setIsSubEventModalOpen: (open: boolean) => void;
  editingSubEvent: SubEvent | null;
  setEditingSubEvent: (sub: SubEvent | null) => void;
  createSubEvent: (data: Omit<SubEvent, 'id' | 'studioId' | 'subEventNumber' | 'createdAt' | 'updatedAt'>) => SubEvent;
  updateSubEvent: (id: string, updates: Partial<SubEvent>) => void;
  deleteSubEvent: (id: string) => void;
  duplicateSubEvent: (id: string) => SubEvent;
  reorderSubEvents: (parentEventId: string, orderedIds: string[]) => void;
  updateSubEventStatus: (id: string, status: SubEventStatus) => void;
  assignMemberToSubEvent: (subEventId: string, member: SubEventMemberAssignment) => void;
  removeMemberFromSubEvent: (subEventId: string, memberId: string) => void;
  calculateParentProgress: (parentEventId: string) => { total: number; completed: number; upcoming: number; pending: number; inProgress: number; cancelled: number; percentage: number };

  // Employees & Team
  employees: Employee[];
  selectedEmployeeId: string | null;
  setSelectedEmployeeId: (id: string | null) => void;
  isEmployeeModalOpen: boolean;
  setIsEmployeeModalOpen: (open: boolean) => void;
  editingEmployee: Employee | null;
  setEditingEmployee: (emp: Employee | null) => void;
  createEmployee: (data: any) => Employee;
  updateEmployee: (id: string, updates: Partial<Employee>) => void;
  setEmploymentStatus: (id: string, status: EmploymentStatus) => void;
  deleteEmployee: (id: string) => void;
  resetEmployeePassword: (employeeId: string, newPassword: string) => void;

  // Roles & Permissions (Phase 5 RBAC)
  roles: Role[];
  currentRoleObject: Role | null;
  createRole: (data: any) => Role;
  updateRole: (id: string, updates: Partial<Role>) => void;
  deleteRole: (id: string) => void;
  duplicateRole: (id: string) => Role;
  restoreDefaultRoles: () => Role[];
  hasPermission: (module: string, action: string) => boolean;
  can: (module: PermissionModule, action: PermissionAction, context?: AuthorizationContext) => boolean;
  isFeatureEnabled: (featureIdOrKey: string) => boolean;
  filterRecord: <T extends Record<string, any>>(module: PermissionModule, record: T) => T;

  // Individual Employee Permission Overrides
  permissionOverrides: PermissionOverride[];
  createPermissionOverride: (data: Omit<PermissionOverride, 'id' | 'studioId' | 'createdAt'>) => PermissionOverride;
  deletePermissionOverride: (overrideId: string) => void;

  // Approval Workflows
  approvalRequests: ApprovalRequest[];
  submitApprovalRequest: (data: Omit<ApprovalRequest, 'id' | 'studioId' | 'status' | 'createdAt' | 'updatedAt'>) => ApprovalRequest;
  approveApprovalRequest: (requestId: string, remarks?: string) => void;
  rejectApprovalRequest: (requestId: string, remarks?: string) => void;
  getApprovalHistory: (requestId: string) => ApprovalHistory[];

  // Salary & Payroll (Admin Only)
  salaryProfiles: SalaryProfile[];
  payrollRuns: PayrollRun[];
  generateMonthlyPayrollRun: (month: string, title: string) => PayrollRun;
  recordSalaryTransaction: (data: any) => SalaryTransaction;
  saveSalaryProfile: (data: any) => SalaryProfile;
  canViewSalary: boolean;
  canManagePayroll: boolean;

  // Leave Management
  leaveTypes: LeaveType[];
  leaveRequests: LeaveRequest[];
  isLeaveModalOpen: boolean;
  setIsLeaveModalOpen: (open: boolean) => void;
  applyLeave: (data: any) => LeaveRequest;
  approveLeave: (id: string) => void;
  rejectLeave: (id: string, remarks: string) => void;
  cancelLeave: (id: string) => void;
  getLeaveBalance: (employeeId: string) => LeaveBalance;
  employeesOnLeaveToday: LeaveRequest[];
  upcomingLeaves: LeaveRequest[];

  // Attendance
  attendanceRecords: AttendanceRecord[];
  markAttendance: (data: any) => AttendanceRecord;

  // Phase 8 Finance & Billing
  quotations: Quotation[];
  invoices: Invoice[];
  payments: Payment[];
  refunds: Refund[];
  expenses: Expense[];
  financialSettings: FinancialSettings;
  pdfViewerModal: { isOpen: boolean; payload: any | null };
  openPdfViewer: (payload: any) => void;
  closePdfViewer: () => void;
  createQuotation: (data: any) => Quotation;
  updateQuotation: (id: string, updates: any) => Quotation;
  convertQuotationToBooking: (id: string) => { event: StudioEvent; invoice: Invoice; quotation: Quotation };
  createInvoice: (data: any) => Invoice;
  issueInvoice: (id: string) => Invoice;
  cancelInvoice: (id: string, reason: string) => Invoice;
  recordPayment: (data: any) => { payment: Payment; invoice: Invoice };
  createRefund: (data: any) => { refund: Refund; invoice: Invoice };
  createExpense: (data: any) => Expense;
  approveExpense: (id: string) => Expense;
  rejectExpense: (id: string, reason: string) => Expense;
  markExpensePaid: (id: string, data: any) => Expense;
  updateFinancialSettings: (settings: Partial<FinancialSettings>) => FinancialSettings;
  refreshFinancials: () => void;

  // Search & Global state
  globalSearchQuery: string;
  setGlobalSearchQuery: (q: string) => void;
  resetDemoData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentStudio, members } = useStudio();

  // Navigation State
  const [activeTab, setActiveTabState] = useState<string>('dashboard');
  const [eventRoute, setEventRouteState] = useState<EventRouteState>({ mode: 'list', view: 'list' });
  const [eventFilterOverride, setEventFilterOverride] = useState<EventFilterState | null>(null);

  // Sync hash with route for browser URL support (/app/events, /app/events/create, /app/events/:id, /app/events/:id/edit)
  const syncHashToRoute = useCallback((hash: string) => {
    if (!hash || hash === '#' || hash === '#/app' || hash === '#/app/dashboard') {
      setActiveTabState('dashboard');
      setEventRouteState({ mode: 'list' });
    } else if (hash.startsWith('#/app/bookings/new') || hash.startsWith('#/app/bookings/create') || hash.startsWith('#/app/create-booking')) {
      setActiveTabState('create-booking');
    } else if (hash.startsWith('#/app/crew')) {
      setActiveTabState('crew');
    } else if (hash.startsWith('#/app/quotations/create') || hash.startsWith('#/app/create-quotation')) {
      setActiveTabState('create-quotation');
    } else if (hash.startsWith('#/app/events/create')) {
      setActiveTabState('events');
      setEventRouteState({ mode: 'create' });
    } else if (hash.match(/#\/app\/events\/([^/]+)\/edit/)) {
      const match = hash.match(/#\/app\/events\/([^/]+)\/edit/);
      if (match) {
        setActiveTabState('events');
        setEventRouteState({ mode: 'edit', eventId: match[1] });
      }
    } else if (hash.match(/#\/app\/events\/([^/]+)/)) {
      const match = hash.match(/#\/app\/events\/([^/]+)/);
      if (match) {
        setActiveTabState('events');
        setEventRouteState({ mode: 'detail', eventId: match[1] });
      }
    } else if (hash.startsWith('#/app/events')) {
      setActiveTabState('events');
      setEventRouteState({ mode: 'list' });
    } else if (hash.startsWith('#/app/history') || hash.startsWith('#/app/bookings')) {
      setActiveTabState('bookings');
    } else if (hash.startsWith('#/app/deliveries')) {
      setActiveTabState('deliveries');
    } else if (hash.startsWith('#/app/customers')) {
      setActiveTabState('customers');
    } else if (hash.startsWith('#/app/tasks')) {
      setActiveTabState('tasks');
    } else if (hash.startsWith('#/app/calendar')) {
      setActiveTabState('calendar');
    } else if (hash.startsWith('#/app/team')) {
      setActiveTabState('team');
    } else if (hash.startsWith('#/app/suppliers')) {
      setActiveTabState('suppliers');
    } else if (hash.startsWith('#/app/roles')) {
      setActiveTabState('roles');
    } else if (hash.startsWith('#/app/leave')) {
      setActiveTabState('leave');
    } else if (hash.startsWith('#/app/payroll')) {
      setActiveTabState('payroll');
    } else if (hash.startsWith('#/app/notifications')) {
      setActiveTabState('notifications');
    } else if (hash.startsWith('#/app/finance')) {
      setActiveTabState('finance');
    } else if (hash.startsWith('#/app/analytics')) {
      setActiveTabState('analytics');
    } else if (hash.startsWith('#/app/reports')) {
      setActiveTabState('reports');
    } else if (hash.startsWith('#/platform/analytics')) {
      setActiveTabState('platform-analytics');
    } else if (hash.startsWith('#/app/settings')) {
      setActiveTabState('settings');
    }
  }, []);

  useEffect(() => {
    syncHashToRoute(window.location.hash);
    const onHashChange = () => syncHashToRoute(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [syncHashToRoute]);

  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    if (tab === 'create-booking') {
      window.location.hash = '#/app/bookings/create';
    } else if (tab === 'create-quotation') {
      window.location.hash = '#/app/quotations/create';
    } else {
      window.location.hash = `#/app/${tab}`;
    }
    if (tab === 'events' && eventRoute.mode !== 'list') {
      setEventRouteState({ mode: 'list' });
    }
  };

  const setEventRoute = (route: EventRouteState) => {
    setEventRouteState(route);
    setActiveTabState('events');
    if (route.mode === 'create') {
      window.location.hash = '#/app/events/create';
    } else if (route.mode === 'edit') {
      window.location.hash = `#/app/events/${route.eventId}/edit`;
    } else if (route.mode === 'detail') {
      window.location.hash = `#/app/events/${route.eventId}`;
    } else {
      window.location.hash = '#/app/events';
    }
  };

  const navigateToEvents = (filter?: EventFilterState, view: EventViewMode = 'list') => {
    if (filter) setEventFilterOverride(filter);
    setEventRoute({ mode: 'list', view });
  };

  const navigateToCreateEvent = () => {
    setEventRoute({ mode: 'create' });
  };

  const navigateToEventDetail = (eventId: string) => {
    setEventRoute({ mode: 'detail', eventId });
  };

  const navigateToEditEvent = (eventId: string) => {
    setEventRoute({ mode: 'edit', eventId });
  };

  // Convert active Studio to StudioProfile interface
  const studio: StudioProfile = {
    id: currentStudio.id,
    tenantId: currentStudio.tenantId,
    name: currentStudio.name,
    tagline: currentStudio.tagline || '',
    logo: currentStudio.logoUrl || '',
    email: currentStudio.email,
    phone: currentStudio.phone,
    address: currentStudio.address,
    city: currentStudio.city,
    gstNumber: currentStudio.gstNumber,
    subscriptionPlan: 'Studio OS Monthly',
    subscriptionPrice: currentStudio.subscription.pricePerMonth,
    subscriptionStatus: currentStudio.subscription.status === 'active' ? 'Active' : 'Trial',
    subscriptionValidUntil: currentStudio.subscription.validUntil,
    storageUsageMb: currentStudio.storageUsageMb,
    storageQuotaMb: currentStudio.storageQuotaMb
  };

  // Convert members to Users format for the UI
  const users: User[] = members.map(m => ({
    id: m.id,
    name: m.displayName,
    email: m.email,
    phone: m.phone,
    avatar: m.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    role: m.role as UserRole,
    roleTitle: m.roleTitle,
    specialization: m.specialization,
    activeEventsCount: 2
  }));

  // Role Switcher State
  const [currentRole, setCurrentRole] = useState<UserRole>('owner');
  const [isRoleSwitcherOpen, setIsRoleSwitcherOpen] = useState(false);
  const ownerSession = unifiedAuthService.getStudioOwnerSession();
  const defaultOwnerName = ownerSession?.account?.displayName || 'Studio Owner';
  const currentUser = users.find(u => u.role === currentRole) || users[0] || {
    id: ownerSession?.account?.id || 'usr_default',
    name: defaultOwnerName,
    email: ownerSession?.account?.email || currentStudio.email,
    phone: currentStudio.phone,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    role: 'owner' as UserRole,
    roleTitle: 'Studio Owner',
    specialization: ['Direction'],
    activeEventsCount: 0
  };

  // Tenant-isolated state loaded via Services
  const [events, setEvents] = useState<StudioEvent[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notifications, setNotifications] = useState<StudioNotification[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // UI Modals & Selections
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isEventFormOpen, setIsEventFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<StudioEvent | null>(null);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isCustomerFormOpen, setIsCustomerFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);

  // Sub-Events State
  const [subEvents, setSubEvents] = useState<SubEvent[]>([]);
  const [selectedSubEventId, setSelectedSubEventId] = useState<string | null>(null);
  const [isSubEventModalOpen, setIsSubEventModalOpen] = useState(false);
  const [editingSubEvent, setEditingSubEvent] = useState<SubEvent | null>(null);

  // Employees State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Roles State
  const [roles, setRoles] = useState<Role[]>([]);

  // Salary & Payroll State (Admin Only)
  const [salaryProfiles, setSalaryProfiles] = useState<SalaryProfile[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);

  // Leave Management State
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);

  // Attendance State
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);

  // RBAC Permission Overrides & Approvals (Phase 5)
  const [permissionOverrides, setPermissionOverrides] = useState<PermissionOverride[]>([]);
  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequest[]>([]);

  // Phase 6 Task & Workflow State
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isTaskDetailModalOpen, setIsTaskDetailModalOpen] = useState(false);
  const [workflowTemplates, setWorkflowTemplates] = useState<WorkflowTemplate[]>([]);
  const [workflowInstances, setWorkflowInstances] = useState<WorkflowInstance[]>([]);

  // Phase 7 CRM & WhatsApp State
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [editingFollowUp, setEditingFollowUp] = useState<FollowUp | null>(null);

  const [messageTemplates, setMessageTemplates] = useState<MessageTemplate[]>([]);
  const [messageLogs, setMessageLogs] = useState<WhatsAppLog[]>([]);

  const [isWhatsAppPreviewOpen, setIsWhatsAppPreviewOpen] = useState(false);
  const [whatsAppPreviewData, setWhatsAppPreviewData] = useState<{
    customer: Customer | null;
    templateId?: string;
    prefilledMessage?: string;
    event?: StudioEvent | null;
    lead?: Lead | null;
  } | null>(null);

  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [mergeModalData, setMergeModalData] = useState<{
    primaryCustomer: Customer;
    secondaryCustomer: Customer;
  } | null>(null);

  // Phase 8 Finance & Billing State
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [financialSettings, setFinancialSettings] = useState<FinancialSettings>(() => financialSettingsService.getSettings(currentStudio.id));
  const [pdfViewerModal, setPdfViewerModal] = useState<{ isOpen: boolean; payload: any | null }>({ isOpen: false, payload: null });

  // Global search
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');

  // Reload data whenever currentStudio.id changes!
  const loadTenantData = useCallback((studioId: string) => {
    try {
      const isTestEnv = typeof process !== 'undefined' && Boolean(process.env?.VITEST || process.env?.NODE_ENV === 'test');
      if (isTestEnv && (studioId === 'studio_shreeji_films' || studioId === 'std_demo_royal')) {
        const seeded = TenantStore.getSingle(studioId, ShreejiBookingSeedService.SEED_FLAG_KEY);
        if (!seeded) {
          ShreejiBookingSeedService.seedAllSampleBookings(false, studioId);
        }
      }

      const evs = eventService.listEvents(studioId);
      const custs = customerService.listCustomers(studioId);
      const tsks = taskService.listTasks(studioId);
      const notifs = notificationService.listNotifications(studioId);
      const logs = auditService.listAuditLogs(studioId);

      const subs = subEventService.listSubEvents(studioId);
      const emps = employeeService.listEmployees(studioId);
      const rls = roleService.listRoles(studioId);
      const lTypes = leaveService.listLeaveTypes(studioId);
      const lReqs = leaveService.listLeaveRequests(studioId);
      const atts = attendanceService.listAttendance(studioId);
      const ovrs = permissionOverrideService.listOverrides(studioId);
      const apprs = approvalService.listRequests(studioId);
      const wfTemplates = workflowService.listTemplates(studioId);
      const wfInstances = workflowService.listWorkflowInstances(studioId);

      // Phase 7 CRM
      const lds = leadService.listLeads(studioId);
      const fus = followUpService.listFollowUps(studioId);
      const msgTemplates = whatsappService.listTemplates(studioId);
      const msgLogs = whatsappService.listLogs(studioId);

      // Phase 8 Finance & Billing
      const quots = quotationService.listQuotations(studioId);
      const invs = invoiceService.listInvoices(studioId);
      const pays = paymentService.listPayments(studioId);
      const refs = paymentService.listRefunds(studioId);
      const exps = expenseService.listExpenses(studioId);
      const finSettings = financialSettingsService.getSettings(studioId);

      setEvents(evs as unknown as StudioEvent[]);
      setCustomers(custs as unknown as Customer[]);
      setTasks(tsks as unknown as Task[]);
      setNotifications(notifs as unknown as StudioNotification[]);
      setAuditLogs(logs);
      setSubEvents(subs);
      setEmployees(emps);
      setRoles(rls);
      setLeaveTypes(lTypes);
      setLeaveRequests(lReqs);
      setAttendanceRecords(atts);
      setPermissionOverrides(ovrs);
      setApprovalRequests(apprs);
      setWorkflowTemplates(wfTemplates);
      setWorkflowInstances(wfInstances);
      setLeads(lds);
      setFollowUps(fus);
      setMessageTemplates(msgTemplates);
      setMessageLogs(msgLogs);
      setQuotations(quots);
      setInvoices(invs);
      setPayments(pays);
      setRefunds(refs);
      setExpenses(exps);
      setFinancialSettings(finSettings);

      // Attempt loading confidential salary data safely
      try {
        const activeRoleObj = rls.find(r => r.name.toLowerCase().includes(currentRole)) || rls[0];
        const sals = salaryService.listSalaryProfiles(studioId, activeRoleObj);
        const runs = payrollService.listPayrollRuns(studioId, activeRoleObj);
        setSalaryProfiles(sals);
        setPayrollRuns(runs);
      } catch {
        setSalaryProfiles([]);
        setPayrollRuns([]);
      }

      setSelectedEventId(null);
      setSelectedCustomerId(null);
    } catch (e) {
      console.error(`Error loading data for studio ${studioId}:`, e);
    }
  }, [currentRole]);

  useEffect(() => {
    loadTenantData(currentStudio.id);
  }, [currentStudio.id, loadTenantData]);

  // Synchronize context and tenant events immediately when bookings/events are updated or soft-deleted
  useEffect(() => {
    const handleDataUpdate = () => {
      loadTenantData(currentStudio.id);
    };
    window.addEventListener('studio_data_updated', handleDataUpdate);
    return () => window.removeEventListener('studio_data_updated', handleDataUpdate);
  }, [currentStudio.id, loadTenantData]);

  // Event Handlers
  const createEvent = (eventData: Omit<StudioEvent, 'id' | 'eventNumber' | 'createdAt' | 'updatedAt'>): StudioEvent => {
    const newEvent = eventService.createEvent(currentStudio.id, {
      ...eventData,
      branchId: undefined,
      category: eventData.category,
      deliverables: eventData.deliverables || ['4K Film', 'Curated Stills'],
      assignedTeamIds: eventData.assignedTeamIds || [],
      detailedAssignments: eventData.detailedAssignments || [],
      leadPhotographerId: eventData.leadPhotographerId,
      estimatedBudget: eventData.estimatedBudget || 0,
      advancePaid: eventData.advancePaid || 0,
      fullAddress: eventData.fullAddress,
      googleMapsLocation: eventData.googleMapsLocation,
      description: eventData.description,
      internalNotes: eventData.internalNotes,
      attachments: eventData.attachments || [],
      createdBy: currentUser.id
    });

    // Bump customer booking counts in customerService
    if (eventData.customerId) {
      const cust = customerService.getCustomer(currentStudio.id, eventData.customerId);
      if (cust) {
        customerService.updateCustomer(currentStudio.id, cust.id, {
          totalBookings: cust.totalBookings + 1,
          totalSpent: cust.totalSpent + (eventData.estimatedBudget || 0),
          pendingBalance: cust.pendingBalance + ((eventData.estimatedBudget || 0) - (eventData.advancePaid || 0))
        });
      }
    }

    // Add activity notification
    notificationService.createNotification(currentStudio.id, {
      title: `New Shoot Created: ${newEvent.name}`,
      message: `${newEvent.category} scheduled for ${newEvent.startDate} at ${newEvent.venue}`,
      type: 'event',
      timestamp: 'Just now',
      read: false,
      linkTab: 'events',
      linkId: newEvent.id
    });

    // Audit log
    auditService.logAction(
      currentStudio.id,
      currentUser.id,
      'CREATE_EVENT',
      'event',
      newEvent.id,
      { name: newEvent.name, category: newEvent.category, eventNumber: newEvent.eventNumber },
      currentUser.name,
      currentUser.role
    );

    loadTenantData(currentStudio.id);
    return newEvent as unknown as StudioEvent;
  };

  const updateEvent = (id: string, updates: Partial<StudioEvent>) => {
    eventService.updateEvent(currentStudio.id, id, updates as any);
    auditService.logAction(
      currentStudio.id,
      currentUser.id,
      'UPDATE_EVENT',
      'event',
      id,
      updates,
      currentUser.name,
      currentUser.role
    );
    loadTenantData(currentStudio.id);
  };

  const deleteEvent = (id: string) => {
    eventService.deleteEvent(currentStudio.id, id);
    auditService.logAction(
      currentStudio.id,
      currentUser.id,
      'DELETE_EVENT',
      'event',
      id,
      {},
      currentUser.name,
      currentUser.role
    );
    if (selectedEventId === id) setSelectedEventId(null);
    if (eventRoute.mode === 'detail' && eventRoute.eventId === id) {
      setEventRoute({ mode: 'list' });
    }
    loadTenantData(currentStudio.id);
  };

  const updateEventStatus = (id: string, status: EventStatus, remarks?: string) => {
    eventService.updateEventStatus(
      currentStudio.id, 
      id, 
      status, 
      currentUser.id, 
      currentUser.name, 
      remarks
    );
    auditService.logAction(
      currentStudio.id,
      currentUser.id,
      'EVENT_STATUS_CHANGE',
      'event',
      id,
      { status, remarks },
      currentUser.name,
      currentUser.role
    );
    loadTenantData(currentStudio.id);
  };

  const addEventAttachment = (eventId: string, attachment: Omit<EventAttachment, 'id' | 'uploadedAt'>) => {
    eventService.addAttachment(currentStudio.id, eventId, {
      ...attachment,
      uploadedBy: currentUser.id,
      uploadedByName: currentUser.name
    });
    auditService.logAction(
      currentStudio.id,
      currentUser.id,
      'UPLOAD_ATTACHMENT',
      'event',
      eventId,
      { fileName: attachment.name },
      currentUser.name,
      currentUser.role
    );
    loadTenantData(currentStudio.id);
  };

  const removeEventAttachment = (eventId: string, attachmentId: string) => {
    eventService.removeAttachment(currentStudio.id, eventId, attachmentId);
    auditService.logAction(
      currentStudio.id,
      currentUser.id,
      'DELETE_ATTACHMENT',
      'event',
      eventId,
      { attachmentId },
      currentUser.name,
      currentUser.role
    );
    loadTenantData(currentStudio.id);
  };

  const assignMemberToEvent = (eventId: string, assignment: EventAssignment) => {
    eventService.assignMember(currentStudio.id, eventId, assignment);
    auditService.logAction(
      currentStudio.id,
      currentUser.id,
      'ASSIGN_MEMBER',
      'event',
      eventId,
      { memberName: assignment.memberName, roleTitle: assignment.roleTitle },
      currentUser.name,
      currentUser.role
    );
    loadTenantData(currentStudio.id);
  };

  const removeMemberFromEvent = (eventId: string, memberId: string) => {
    eventService.removeMember(currentStudio.id, eventId, memberId);
    auditService.logAction(
      currentStudio.id,
      currentUser.id,
      'REMOVE_MEMBER',
      'event',
      eventId,
      { memberId },
      currentUser.name,
      currentUser.role
    );
    loadTenantData(currentStudio.id);
  };

  // Customer Handlers
  const createCustomer = (customerData: Omit<Customer, 'id' | 'totalBookings' | 'totalSpent' | 'pendingBalance' | 'createdAt'>): Customer => {
    const newCustomer = customerService.createCustomer(currentStudio.id, {
      ...customerData,
      createdBy: currentUser.id
    });
    auditService.logAction(
      currentStudio.id,
      currentUser.id,
      'CREATE_CUSTOMER',
      'customer',
      newCustomer.id,
      { name: newCustomer.name, phone: newCustomer.phone },
      currentUser.name,
      currentUser.role
    );
    loadTenantData(currentStudio.id);
    return newCustomer as unknown as Customer;
  };

  const updateCustomer = (id: string, updates: Partial<Customer>) => {
    // Immediate optimistic update
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c));
    if (updates.name || updates.phone) {
      setEvents(prev => prev.map(ev => ev.customerId === id ? {
        ...ev,
        customerName: updates.name || ev.customerName,
        customerPhone: updates.phone || ev.customerPhone
      } : ev));
    }

    try {
      customerService.updateCustomer(currentStudio.id, id, updates, currentUser.id);
      auditService.logAction(
        currentStudio.id,
        currentUser.id,
        'UPDATE_CUSTOMER',
        'customer',
        id,
        updates,
        currentUser.name,
        currentUser.role
      );
      loadTenantData(currentStudio.id);
    } catch (err) {
      console.error('[AppContext.updateCustomer] Error updating customer:', err);
      loadTenantData(currentStudio.id);
    }
  };

  const deleteCustomer = (id: string) => {
    customerService.deleteCustomer(currentStudio.id, id, currentUser.id);
    if (selectedCustomerId === id) setSelectedCustomerId(null);
    loadTenantData(currentStudio.id);
  };

  const mergeCustomers = (primaryId: string, secondaryId: string, resolutions: Partial<Customer>): Customer => {
    const merged = customerService.mergeCustomers(
      currentStudio.id,
      primaryId,
      secondaryId,
      resolutions,
      currentUser.id,
      currentUser.name
    );
    loadTenantData(currentStudio.id);
    return merged;
  };

  const addCustomerNote = (customerId: string, text: string, isPrivate: boolean = true) => {
    const newNote = customerService.addNote(currentStudio.id, customerId, {
      text,
      authorId: currentUser.id,
      authorName: currentUser.name,
      isPrivate
    });
    loadTenantData(currentStudio.id);
    return newNote;
  };

  const listCustomerNotes = (customerId: string) => {
    return customerService.listNotes(currentStudio.id, customerId);
  };

  const logCustomerInteraction = (customerId: string, interaction: { type: 'whatsapp' | 'call' | 'email' | 'meeting' | 'note' | 'booking'; summary: string }) => {
    const newInt = customerService.logInteraction(currentStudio.id, customerId, {
      ...interaction,
      initiatedById: currentUser.id,
      initiatedByName: currentUser.name
    });
    loadTenantData(currentStudio.id);
    return newInt;
  };

  const listCustomerInteractions = (customerId: string) => {
    return customerService.listInteractions(currentStudio.id, customerId);
  };

  // Lead Handlers
  const createLead = (data: any): Lead => {
    const newLead = leadService.createLead(currentStudio.id, data, currentUser.id);
    loadTenantData(currentStudio.id);
    return newLead;
  };

  const updateLead = (id: string, updates: Partial<Lead>): Lead => {
    const updated = leadService.updateLead(currentStudio.id, id, updates, currentUser.id);
    loadTenantData(currentStudio.id);
    return updated;
  };

  const deleteLead = (id: string) => {
    leadService.deleteLead(currentStudio.id, id, currentUser.id);
    loadTenantData(currentStudio.id);
  };

  const convertLead = (id: string, options?: any) => {
    const res = leadService.convertLead(currentStudio.id, id, {
      ...options,
      operatorId: currentUser.id,
      operatorName: currentUser.name
    });
    loadTenantData(currentStudio.id);
    return res;
  };

  // Follow-Up Handlers
  const createFollowUp = (data: any): FollowUp => {
    const newFU = followUpService.createFollowUp(currentStudio.id, data, currentUser.id);
    loadTenantData(currentStudio.id);
    return newFU;
  };

  const completeFollowUp = (id: string, notes?: string): FollowUp => {
    const completed = followUpService.completeFollowUp(currentStudio.id, id, currentUser.id, currentUser.name, notes);
    loadTenantData(currentStudio.id);
    return completed;
  };

  const rescheduleFollowUp = (id: string, newDueDate: string, newDueTime?: string): FollowUp => {
    const rescheduled = followUpService.rescheduleFollowUp(currentStudio.id, id, newDueDate, newDueTime, currentUser.id);
    loadTenantData(currentStudio.id);
    return rescheduled;
  };

  const reassignFollowUp = (id: string, newEmployeeId: string, newEmployeeName: string): FollowUp => {
    const reassigned = followUpService.reassignFollowUp(currentStudio.id, id, newEmployeeId, newEmployeeName, currentUser.id);
    loadTenantData(currentStudio.id);
    return reassigned;
  };

  // Message Template Handlers
  const createMessageTemplate = (data: any): MessageTemplate => {
    const newTmpl = whatsappService.createTemplate(currentStudio.id, data, currentUser.id);
    loadTenantData(currentStudio.id);
    return newTmpl;
  };

  const updateMessageTemplate = (id: string, updates: Partial<MessageTemplate>): MessageTemplate => {
    const updated = whatsappService.updateTemplate(currentStudio.id, id, updates, currentUser.id);
    loadTenantData(currentStudio.id);
    return updated;
  };

  const duplicateMessageTemplate = (id: string): MessageTemplate => {
    const duplicated = whatsappService.duplicateTemplate(currentStudio.id, id, currentUser.id);
    loadTenantData(currentStudio.id);
    return duplicated;
  };

  const deleteMessageTemplate = (id: string) => {
    whatsappService.deleteTemplate(currentStudio.id, id, currentUser.id);
    loadTenantData(currentStudio.id);
  };

  // WhatsApp Modal & Logs
  const openWhatsAppModal = (data: { customer: Customer | null; templateId?: string; prefilledMessage?: string; event?: StudioEvent | null; lead?: Lead | null }) => {
    setWhatsAppPreviewData(data);
    setIsWhatsAppPreviewOpen(true);
  };

  const logWhatsAppClick = (data: { customerId: string; customerName: string; phone: string; templateTitle?: string; messageText: string; relatedEventId?: string; relatedLeadId?: string }): WhatsAppLog => {
    const log = whatsappService.logWhatsAppInitiation(currentStudio.id, {
      ...data,
      initiatedById: currentUser.id,
      initiatedByName: currentUser.name
    });
    // Log as interaction too
    customerService.logInteraction(currentStudio.id, data.customerId, {
      type: 'whatsapp',
      summary: `WhatsApp click-to-chat initiated: ${data.templateTitle || 'Message'}`,
      initiatedById: currentUser.id,
      initiatedByName: currentUser.name
    });
    loadTenantData(currentStudio.id);
    return log;
  };

  const confirmWhatsAppSent = (logId: string) => {
    whatsappService.confirmMessageSent(currentStudio.id, logId, currentUser.id);
    loadTenantData(currentStudio.id);
  };

  const cancelWhatsAppLog = (logId: string, reason?: string) => {
    whatsappService.cancelMessageLog(currentStudio.id, logId, reason, currentUser.id);
    loadTenantData(currentStudio.id);
  };

  const openMergeModal = (primaryCustomer: Customer, secondaryCustomer: Customer) => {
    setMergeModalData({ primaryCustomer, secondaryCustomer });
    setIsMergeModalOpen(true);
  };

  const crmDashboardMetrics = useMemo(() => {
    try {
      return customerService.getCRMDashboardMetrics(currentStudio.id);
    } catch {
      return {
        totalCustomers: customers.length,
        newThisMonth: 0,
        newCustomersThisMonth: 0,
        activeCustomers: 0,
        leadsCount: 0,
        potentialLeads: 0,
        bookedCustomers: 0,
        customersWithUpcomingEvents: 0,
        upcomingEventCustomers: 0,
        awaitingFollowUp: 0,
        pendingPaymentCustomers: 0,
        recentlyContactedCount: 0,
        recentlyContactedCustomers: 0,
        completedCustomers: 0,
        completedEventCustomers: 0
      };
    }
  }, [currentStudio.id, customers, events, leads, followUps]);

  // Phase 6 Task Handlers
  const createTask = (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Task => {
    const newTask = taskService.createTask(currentStudio.id, {
      ...taskData,
      createdBy: taskData.createdBy || currentUser.id
    });
    auditService.logAction(
      currentStudio.id,
      currentUser.id,
      'CREATE_TASK',
      'task',
      newTask.id,
      { title: newTask.title },
      currentUser.name,
      currentUser.role
    );
    loadTenantData(currentStudio.id);
    return newTask;
  };

  const updateTask = (id: string, updates: Partial<Task>): Task => {
    const updated = taskService.updateTask(currentStudio.id, id, updates, currentUser.id, currentUser.name);
    loadTenantData(currentStudio.id);
    return updated;
  };

  const updateTaskStatus = (id: string, status: TaskStatus, managerOverrideReason?: string) => {
    taskService.updateTaskStatus(currentStudio.id, id, status, currentUser.id, currentUser.name, managerOverrideReason);
    loadTenantData(currentStudio.id);
  };

  const deleteTask = (id: string) => {
    taskService.deleteTask(currentStudio.id, id);
    if (selectedTaskId === id) setSelectedTaskId(null);
    loadTenantData(currentStudio.id);
  };

  const addChecklistItem = (taskId: string, title: string) => {
    taskService.addChecklistItem(currentStudio.id, taskId, title);
    loadTenantData(currentStudio.id);
  };

  const toggleChecklistItem = (taskId: string, itemId: string) => {
    taskService.toggleChecklistItem(currentStudio.id, taskId, itemId, currentUser.id, currentUser.name);
    loadTenantData(currentStudio.id);
  };

  const addComment = (taskId: string, text: string, isInternal: boolean = true) => {
    taskService.addComment(currentStudio.id, taskId, {
      text,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorRole: currentUser.roleTitle,
      isInternal
    });
    loadTenantData(currentStudio.id);
  };

  const addAttachment = (taskId: string, attachment: { name: string; url: string; fileType?: string; size?: number }) => {
    taskService.addAttachment(currentStudio.id, taskId, {
      ...attachment,
      uploadedBy: currentUser.id,
      uploadedByName: currentUser.name
    });
    loadTenantData(currentStudio.id);
  };

  const submitTaskForReview = (taskId: string) => {
    taskService.submitForReview(currentStudio.id, taskId, currentUser.id, currentUser.name);
    loadTenantData(currentStudio.id);
  };

  const approveTask = (taskId: string, reviewNotes?: string) => {
    taskService.approveTask(currentStudio.id, taskId, currentUser.id, currentUser.name, reviewNotes);
    loadTenantData(currentStudio.id);
  };

  const rejectTask = (taskId: string, reviewNotes: string) => {
    taskService.rejectTask(currentStudio.id, taskId, currentUser.id, currentUser.name, reviewNotes);
    loadTenantData(currentStudio.id);
  };

  const reassignTask = (taskId: string, newAssigneeId: string, newAssigneeName: string, reason?: string) => {
    taskService.reassignTask(currentStudio.id, taskId, newAssigneeId, newAssigneeName, currentUser.id, currentUser.name, reason);
    loadTenantData(currentStudio.id);
  };

  const recalculateDueDates = (eventId: string, newEventDate: string, shiftDays: number) => {
    const res = taskService.recalculateDueDates(currentStudio.id, eventId, newEventDate, shiftDays);
    loadTenantData(currentStudio.id);
    return res;
  };

  const teamWorkload = useMemo(() => {
    return taskService.getTeamWorkload(currentStudio.id);
  }, [currentStudio.id, tasks, employees]);

  // Phase 6 Photography Production Workflows
  const createWorkflowTemplate = (data: any): WorkflowTemplate => {
    const tmpl = workflowService.createTemplate(currentStudio.id, data);
    loadTenantData(currentStudio.id);
    return tmpl;
  };

  const updateWorkflowTemplate = (id: string, updates: Partial<WorkflowTemplate>): WorkflowTemplate => {
    const tmpl = workflowService.updateTemplate(currentStudio.id, id, updates);
    loadTenantData(currentStudio.id);
    return tmpl;
  };

  const duplicateWorkflowTemplate = (id: string): WorkflowTemplate => {
    const tmpl = workflowService.duplicateTemplate(currentStudio.id, id);
    loadTenantData(currentStudio.id);
    return tmpl;
  };

  const deleteWorkflowTemplate = (id: string) => {
    workflowService.deleteTemplate(currentStudio.id, id);
    loadTenantData(currentStudio.id);
  };

  const attachWorkflow = (params: { templateId: string; entityType: 'main_event' | 'sub_event' | 'production_job'; entityId: string; entityName: string }): WorkflowInstance => {
    const instance = workflowService.attachWorkflow(currentStudio.id, {
      ...params,
      operatorId: currentUser.id
    });
    // Automatically generate tasks from this workflow!
    taskService.generateTasksFromWorkflow(currentStudio.id, instance.id);
    loadTenantData(currentStudio.id);
    return instance;
  };

  const generateTasksFromWorkflow = (workflowInstanceId: string, entityStartDate?: string): Task[] => {
    const generated = taskService.generateTasksFromWorkflow(currentStudio.id, workflowInstanceId, entityStartDate);
    loadTenantData(currentStudio.id);
    return generated;
  };

  const updateWorkflowStage = (workflowId: string, stageId: string) => {
    workflowService.updateWorkflowStage(currentStudio.id, workflowId, stageId, currentUser.id);
    loadTenantData(currentStudio.id);
  };

  // Notification Handlers
  const markNotificationAsRead = (id: string) => {
    notificationService.markRead(currentStudio.id, id);
    loadTenantData(currentStudio.id);
  };

  const markAllNotificationsAsRead = () => {
    notificationService.markAllRead(currentStudio.id);
    loadTenantData(currentStudio.id);
  };

  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  const resetDemoData = () => {
    TenantStore.resetAll();
    loadTenantData(currentStudio.id);
  };

  // Sub-Event Handlers
  const createSubEvent = (data: Omit<SubEvent, 'id' | 'studioId' | 'subEventNumber' | 'createdAt' | 'updatedAt'>): SubEvent => {
    const created = subEventService.createSubEvent(currentStudio.id, data);
    loadTenantData(currentStudio.id);
    return created;
  };

  const updateSubEvent = (id: string, updates: Partial<SubEvent>) => {
    subEventService.updateSubEvent(currentStudio.id, id, updates);
    loadTenantData(currentStudio.id);
  };

  const deleteSubEvent = (id: string) => {
    subEventService.deleteSubEvent(currentStudio.id, id);
    if (selectedSubEventId === id) setSelectedSubEventId(null);
    loadTenantData(currentStudio.id);
  };

  const duplicateSubEvent = (id: string): SubEvent => {
    const dup = subEventService.duplicateSubEvent(currentStudio.id, id);
    loadTenantData(currentStudio.id);
    return dup;
  };

  const reorderSubEvents = (parentEventId: string, orderedIds: string[]) => {
    subEventService.reorderSubEvents(currentStudio.id, parentEventId, orderedIds);
    loadTenantData(currentStudio.id);
  };

  const updateSubEventStatus = (id: string, status: SubEventStatus) => {
    subEventService.updateSubEventStatus(currentStudio.id, id, status);
    loadTenantData(currentStudio.id);
  };

  const assignMemberToSubEvent = (subEventId: string, member: SubEventMemberAssignment) => {
    subEventService.assignMember(currentStudio.id, subEventId, member);
    loadTenantData(currentStudio.id);
  };

  const removeMemberFromSubEvent = (subEventId: string, memberId: string) => {
    subEventService.removeMember(currentStudio.id, subEventId, memberId);
    loadTenantData(currentStudio.id);
  };

  const calculateParentProgress = useCallback((parentEventId: string) => {
    return subEventService.calculateParentProgress(currentStudio.id, parentEventId);
  }, [currentStudio.id, subEvents]);

  // Employee Handlers
  const createEmployee = (data: any): Employee => {
    const emp = employeeService.createEmployee(currentStudio.id, data);
    loadTenantData(currentStudio.id);
    return emp;
  };

  const updateEmployee = (id: string, updates: Partial<Employee>) => {
    employeeService.updateEmployee(currentStudio.id, id, updates);
    loadTenantData(currentStudio.id);
  };

  const setEmploymentStatus = (id: string, status: EmploymentStatus) => {
    employeeService.setEmploymentStatus(currentStudio.id, id, status);
    loadTenantData(currentStudio.id);
  };

  const deleteEmployee = (id: string) => {
    employeeService.deleteEmployee(currentStudio.id, id);
    if (selectedEmployeeId === id) setSelectedEmployeeId(null);
    loadTenantData(currentStudio.id);
  };

  const resetEmployeePassword = (employeeId: string, newPassword: string) => {
    authCredentialService.resetEmployeePassword(currentStudio.id, employeeId, newPassword, currentUser.id);
    loadTenantData(currentStudio.id);
  };

  // Role Permissions
  const currentRoleObject = useMemo(() => {
    if (!roles.length) return null;
    const match = roles.find(r => {
      const rLower = r.name.toLowerCase();
      if (currentRole === 'owner') return rLower.includes('owner');
      if (currentRole === 'manager') return rLower.includes('manager');
      if (currentRole === 'lead_photographer') return rLower.includes('photographer');
      if (currentRole === 'cinematographer') return rLower.includes('videographer') || rLower.includes('cinematographer');
      if (currentRole === 'editor') return rLower.includes('editor');
      if (currentRole === 'client_relations') return rLower.includes('delivery') || rLower.includes('client');
      return false;
    });
    return match || roles[0];
  }, [roles, currentRole]);

  // Active Employee associated with current preview role
  const activeEmployee = useMemo(() => {
    if (!employees.length) return null;
    const match = employees.find(e => {
      const rLower = e.roleName?.toLowerCase() || '';
      const dLower = e.designation?.toLowerCase() || '';
      if (currentRole === 'owner') return rLower.includes('owner') || dLower.includes('owner');
      if (currentRole === 'manager') return rLower.includes('manager') || dLower.includes('manager');
      if (currentRole === 'lead_photographer') return rLower.includes('photographer') || dLower.includes('photographer');
      if (currentRole === 'cinematographer') return rLower.includes('videographer') || dLower.includes('cinematographer');
      if (currentRole === 'editor') return rLower.includes('editor') || dLower.includes('editor');
      if (currentRole === 'client_relations') return rLower.includes('delivery') || rLower.includes('client');
      return false;
    });
    return match || employees[0];
  }, [employees, currentRole]);

  const [liveRbacTick, setLiveRbacTick] = useState(0);
  const [liveFeatureTick, setLiveFeatureTick] = useState(0);

  useEffect(() => {
    const sId = currentStudio?.id;
    if (!sId) return;
    const unsub = liveFeatureService.subscribeStudioFeatures(sId, () => {
      setLiveFeatureTick((t) => t + 1);
    });
    return () => unsub();
  }, [currentStudio?.id]);

  const isFeatureEnabled = useCallback((featureIdOrKey: string): boolean => {
    const sId = currentStudio?.id || 'std_demo_royal';
    const liveVal = liveFeatureService.isFeatureEnabledLive(sId, featureIdOrKey);
    if (liveVal !== null) return liveVal;
    return featureVisibilityService.evaluateFeature(sId, featureIdOrKey, currentRole === 'owner').accessible;
  }, [currentStudio?.id, currentRole, liveFeatureTick]);

  useEffect(() => {
    const uid = firebaseAuth?.currentUser?.uid;
    const sId = currentStudio?.id;
    if (!uid || !sId) return;
    const fallbackRole = currentRole === 'owner' ? 'studio_owner' : currentRole;
    const unsub = liveRbacService.subscribeUserEffectivePermissions(sId, uid, fallbackRole, (bundle) => {
      setLiveRbacTick((t) => t + 1);
      if (bundle.isDeactivated && typeof window !== 'undefined') {
        localStorage.removeItem('studio_os_session_token');
        localStorage.removeItem('studio_os_user_role');
        window.location.hash = '#/studio/login';
      }
    });
    return () => unsub();
  }, [currentStudio?.id, currentRole]);

  const can = useCallback((
    module: PermissionModule, 
    action: PermissionAction, 
    context?: AuthorizationContext
  ): boolean => {
    const liveAllowed = liveRbacService.canFromActiveBundle(module, action);
    if (liveAllowed !== null) {
      return liveAllowed;
    }
    const actorId = activeEmployee?.id || (currentRole === 'owner' ? 'owner_1' : currentUser.id);
    return authorizationEngine.can(currentStudio.id, actorId, module, action, context);
  }, [currentStudio.id, activeEmployee, currentRole, currentUser.id, liveRbacTick]);

  const filterRecord = useCallback(<T extends Record<string, any>>(
    module: PermissionModule,
    record: T
  ): T => {
    const actorId = activeEmployee?.id || (currentRole === 'owner' ? 'owner_1' : currentUser.id);
    return authorizationEngine.filterRecord(currentStudio.id, actorId, module, record);
  }, [currentStudio.id, activeEmployee, currentRole, currentUser.id, liveRbacTick]);

  const hasPermission = useCallback((module: string, action: string): boolean => {
    const liveAllowed = liveRbacService.canFromActiveBundle(module, action);
    if (liveAllowed !== null) {
      return liveAllowed;
    }
    if (!currentRoleObject) return true;
    if (currentRoleObject.name === 'Studio Owner' || currentRoleObject.name === 'Super Admin') return true;
    return roleService.hasPermission(currentRoleObject, module, action);
  }, [currentRoleObject, liveRbacTick]);

  const canViewSalary = useMemo(() => {
    const liveAllowed = liveRbacService.canFromActiveBundle('payroll_salary', 'view');
    if (liveAllowed !== null) return liveAllowed;
    if (currentRole === 'owner') return true;
    return can('salary', 'view');
  }, [currentRole, can, liveRbacTick]);

  const canManagePayroll = useMemo(() => {
    const liveAllowed = liveRbacService.canFromActiveBundle('payroll_salary', 'edit');
    if (liveAllowed !== null) return liveAllowed;
    if (currentRole === 'owner') return true;
    return can('payroll', 'edit') || can('payroll', 'manageSettings');
  }, [currentRole, can, liveRbacTick]);

  const createRole = (data: any): Role => {
    const role = roleService.createRole(currentStudio.id, data);
    loadTenantData(currentStudio.id);
    return role;
  };

  const updateRole = (id: string, updates: Partial<Role>) => {
    roleService.updateRole(currentStudio.id, id, updates);
    loadTenantData(currentStudio.id);
  };

  const deleteRole = (id: string) => {
    roleService.deleteRole(currentStudio.id, id);
    loadTenantData(currentStudio.id);
  };

  const duplicateRole = (id: string): Role => {
    const dup = roleService.duplicateRole(currentStudio.id, id);
    loadTenantData(currentStudio.id);
    return dup;
  };

  const restoreDefaultRoles = (): Role[] => {
    const restored = roleService.restoreDefaultRoles(currentStudio.id);
    loadTenantData(currentStudio.id);
    return restored;
  };

  // Permission Overrides Handlers
  const createPermissionOverride = (data: Omit<PermissionOverride, 'id' | 'studioId' | 'createdAt'>): PermissionOverride => {
    const ovr = permissionOverrideService.createOverride(currentStudio.id, data);
    loadTenantData(currentStudio.id);
    return ovr;
  };

  const deletePermissionOverride = (overrideId: string) => {
    permissionOverrideService.deleteOverride(currentStudio.id, overrideId, currentUser.id);
    loadTenantData(currentStudio.id);
  };

  // Approval Handlers
  const submitApprovalRequest = (data: Omit<ApprovalRequest, 'id' | 'studioId' | 'status' | 'createdAt' | 'updatedAt'>): ApprovalRequest => {
    const req = approvalService.submitRequest(currentStudio.id, data);
    loadTenantData(currentStudio.id);
    return req;
  };

  const approveApprovalRequest = (requestId: string, remarks?: string) => {
    approvalService.approveRequest(currentStudio.id, requestId, currentUser.id, currentUser.name, remarks);
    loadTenantData(currentStudio.id);
  };

  const rejectApprovalRequest = (requestId: string, remarks?: string) => {
    approvalService.rejectRequest(currentStudio.id, requestId, currentUser.id, currentUser.name, remarks);
    loadTenantData(currentStudio.id);
  };

  const getApprovalHistory = (requestId: string): ApprovalHistory[] => {
    return approvalService.listHistory(currentStudio.id, requestId);
  };

  // Salary & Payroll Handlers
  const generateMonthlyPayrollRun = (month: string, title: string): PayrollRun => {
    const run = payrollService.generateMonthlyPayrollRun(currentStudio.id, month, title, currentRoleObject, currentUser.id);
    loadTenantData(currentStudio.id);
    return run;
  };

  const recordSalaryTransaction = (data: any): SalaryTransaction => {
    const tx = payrollService.recordPaymentTransaction(currentStudio.id, data, currentRoleObject);
    loadTenantData(currentStudio.id);
    return tx;
  };

  const saveSalaryProfile = (data: any): SalaryProfile => {
    const profile = salaryService.saveSalaryProfile(currentStudio.id, data, currentRoleObject);
    loadTenantData(currentStudio.id);
    return profile;
  };

  // Leave Handlers
  const applyLeave = (data: any): LeaveRequest => {
    const req = leaveService.applyLeave(currentStudio.id, data);
    loadTenantData(currentStudio.id);
    return req;
  };

  const approveLeave = (id: string) => {
    leaveService.approveLeave(currentStudio.id, id, currentUser.id, currentUser.name);
    loadTenantData(currentStudio.id);
  };

  const rejectLeave = (id: string, remarks: string) => {
    leaveService.rejectLeave(currentStudio.id, id, remarks, currentUser.id, currentUser.name);
    loadTenantData(currentStudio.id);
  };

  const cancelLeave = (id: string) => {
    leaveService.cancelLeave(currentStudio.id, id, currentUser.id);
    loadTenantData(currentStudio.id);
  };

  const getLeaveBalance = useCallback((employeeId: string): LeaveBalance => {
    return leaveService.getLeaveBalance(currentStudio.id, employeeId);
  }, [currentStudio.id, leaveRequests]);

  const employeesOnLeaveToday = useMemo(() => {
    return leaveService.getEmployeesOnLeaveToday(currentStudio.id);
  }, [currentStudio.id, leaveRequests]);

  const upcomingLeaves = useMemo(() => {
    return leaveService.getUpcomingLeaves(currentStudio.id);
  }, [currentStudio.id, leaveRequests]);

  // Attendance Handlers
  const markAttendance = (data: any): AttendanceRecord => {
    const record = attendanceService.markAttendance(currentStudio.id, data);
    loadTenantData(currentStudio.id);
    return record;
  };

  // Phase 8 Finance Handlers
  const openPdfViewer = (payload: any) => setPdfViewerModal({ isOpen: true, payload });
  const closePdfViewer = () => setPdfViewerModal({ isOpen: false, payload: null });

  const refreshFinancials = useCallback(() => {
    const quots = quotationService.listQuotations(currentStudio.id);
    const invs = invoiceService.listInvoices(currentStudio.id);
    const pays = paymentService.listPayments(currentStudio.id);
    const refs = paymentService.listRefunds(currentStudio.id);
    const exps = expenseService.listExpenses(currentStudio.id);
    const finSettings = financialSettingsService.getSettings(currentStudio.id);

    setQuotations(quots);
    setInvoices(invs);
    setPayments(pays);
    setRefunds(refs);
    setExpenses(exps);
    setFinancialSettings(finSettings);
  }, [currentStudio.id]);

  const createQuotation = (data: any): Quotation => {
    const q = quotationService.createQuotation(currentStudio.id, {
      ...data,
      createdBy: currentUser.id
    });
    refreshFinancials();
    return q;
  };

  const updateQuotation = (id: string, updates: any): Quotation => {
    const q = quotationService.updateQuotation(currentStudio.id, id, updates);
    refreshFinancials();
    return q;
  };

  const convertQuotationToBooking = (id: string) => {
    const result = quotationService.convertQuotationToBooking(currentStudio.id, id, {
      operatorId: currentUser.id,
      operatorName: currentUser.name
    });
    loadTenantData(currentStudio.id);
    return result;
  };

  const createInvoice = (data: any): Invoice => {
    const inv = invoiceService.createInvoice(currentStudio.id, {
      ...data,
      createdBy: currentUser.id
    });
    refreshFinancials();
    return inv;
  };

  const issueInvoice = (id: string): Invoice => {
    const inv = invoiceService.issueInvoice(currentStudio.id, id, currentUser.id);
    refreshFinancials();
    return inv;
  };

  const cancelInvoice = (id: string, reason: string): Invoice => {
    const inv = invoiceService.cancelInvoice(currentStudio.id, id, reason, currentUser.id);
    refreshFinancials();
    return inv;
  };

  const recordPayment = (data: any): { payment: Payment; invoice: Invoice } => {
    const result = paymentService.recordPayment(currentStudio.id, {
      ...data,
      operatorId: currentUser.id,
      operatorName: currentUser.name,
      receivedById: currentUser.id,
      receivedByName: currentUser.name
    });
    loadTenantData(currentStudio.id);
    return result;
  };

  const createRefund = (data: any): { refund: Refund; invoice: Invoice } => {
    const result = paymentService.createRefund(currentStudio.id, {
      ...data,
      operatorId: currentUser.id,
      operatorName: currentUser.name,
      approvedById: currentUser.id,
      approvedByName: currentUser.name
    });
    loadTenantData(currentStudio.id);
    return result;
  };

  const createExpense = (data: any): Expense => {
    const exp = expenseService.createExpense(currentStudio.id, {
      ...data,
      createdById: currentUser.id,
      createdByName: currentUser.name
    });
    refreshFinancials();
    return exp;
  };

  const approveExpense = (id: string): Expense => {
    const exp = expenseService.approveExpense(currentStudio.id, id, {
      userId: currentUser.id,
      userName: currentUser.name,
      roleTitle: currentUser.roleTitle || currentUser.role
    });
    refreshFinancials();
    return exp;
  };

  const rejectExpense = (id: string, reason: string): Expense => {
    const exp = expenseService.rejectExpense(currentStudio.id, id, {
      userId: currentUser.id,
      userName: currentUser.name,
      reason
    });
    refreshFinancials();
    return exp;
  };

  const markExpensePaid = (id: string, data: any): Expense => {
    const exp = expenseService.markExpensePaid(currentStudio.id, id, {
      ...data,
      paidById: currentUser.id,
      paidByName: currentUser.name
    });
    refreshFinancials();
    return exp;
  };

  const updateFinancialSettings = (settings: Partial<FinancialSettings>): FinancialSettings => {
    const updated = financialSettingsService.updateSettings(currentStudio.id, settings);
    setFinancialSettings(updated);
    return updated;
  };

  return (
    <AppContext.Provider
      value={{
        studio,
        currentUser,
        users,
        currentRole,
        setCurrentRole,
        isRoleSwitcherOpen,
        setIsRoleSwitcherOpen,
        activeTab,
        setActiveTab,
        eventRoute,
        setEventRoute,
        navigateToEvents,
        navigateToCreateEvent,
        navigateToEventDetail,
        navigateToEditEvent,
        eventFilterOverride,
        setEventFilterOverride,
        events,
        selectedEventId,
        setSelectedEventId,
        isEventFormOpen,
        setIsEventFormOpen,
        editingEvent,
        setEditingEvent,
        createEvent,
        updateEvent,
        deleteEvent,
        updateEventStatus,
        addEventAttachment,
        removeEventAttachment,
        assignMemberToEvent,
        removeMemberFromEvent,
        customers,
        selectedCustomerId,
        setSelectedCustomerId,
        isCustomerFormOpen,
        setIsCustomerFormOpen,
        editingCustomer,
        setEditingCustomer,
        createCustomer,
        updateCustomer,
        deleteCustomer,
        mergeCustomers,
        addCustomerNote,
        listCustomerNotes,
        logCustomerInteraction,
        listCustomerInteractions,
        crmDashboardMetrics,
        // Leads
        leads,
        selectedLeadId,
        setSelectedLeadId,
        isLeadModalOpen,
        setIsLeadModalOpen,
        editingLead,
        setEditingLead,
        createLead,
        updateLead,
        deleteLead,
        convertLead,
        // Follow-Ups
        followUps,
        isFollowUpModalOpen,
        setIsFollowUpModalOpen,
        editingFollowUp,
        setEditingFollowUp,
        createFollowUp,
        completeFollowUp,
        rescheduleFollowUp,
        reassignFollowUp,
        // WhatsApp Templates & Logs
        messageTemplates,
        messageLogs,
        createMessageTemplate,
        updateMessageTemplate,
        duplicateMessageTemplate,
        deleteMessageTemplate,
        isWhatsAppPreviewOpen,
        setIsWhatsAppPreviewOpen,
        whatsAppPreviewData,
        openWhatsAppModal,
        logWhatsAppClick,
        confirmWhatsAppSent,
        cancelWhatsAppLog,
        // Merge Modal
        isMergeModalOpen,
        setIsMergeModalOpen,
        mergeModalData,
        openMergeModal,
        tasks,
        selectedTaskId,
        setSelectedTaskId,
        isTaskFormOpen,
        setIsTaskFormOpen,
        isTaskDetailModalOpen,
        setIsTaskDetailModalOpen,
        createTask,
        updateTask,
        updateTaskStatus,
        deleteTask,
        addChecklistItem,
        toggleChecklistItem,
        addComment,
        addAttachment,
        submitTaskForReview,
        approveTask,
        rejectTask,
        reassignTask,
        recalculateDueDates,
        teamWorkload,
        // Phase 6 Workflows
        workflowTemplates,
        workflowInstances,
        createWorkflowTemplate,
        updateWorkflowTemplate,
        duplicateWorkflowTemplate,
        deleteWorkflowTemplate,
        attachWorkflow,
        generateTasksFromWorkflow,
        updateWorkflowStage,
        notifications,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        unreadNotificationsCount,
        auditLogs,
        // Phase 4
        subEvents,
        selectedSubEventId,
        setSelectedSubEventId,
        isSubEventModalOpen,
        setIsSubEventModalOpen,
        editingSubEvent,
        setEditingSubEvent,
        createSubEvent,
        updateSubEvent,
        deleteSubEvent,
        duplicateSubEvent,
        reorderSubEvents,
        updateSubEventStatus,
        assignMemberToSubEvent,
        removeMemberFromSubEvent,
        calculateParentProgress,
        employees,
        selectedEmployeeId,
        setSelectedEmployeeId,
        isEmployeeModalOpen,
        setIsEmployeeModalOpen,
        editingEmployee,
        setEditingEmployee,
        createEmployee,
        updateEmployee,
        setEmploymentStatus,
        deleteEmployee,
        resetEmployeePassword,
        roles,
        currentRoleObject,
        createRole,
        updateRole,
        deleteRole,
        duplicateRole,
        restoreDefaultRoles,
        hasPermission,
        can,
        isFeatureEnabled,
        filterRecord,
        permissionOverrides,
        createPermissionOverride,
        deletePermissionOverride,
        approvalRequests,
        submitApprovalRequest,
        approveApprovalRequest,
        rejectApprovalRequest,
        getApprovalHistory,
        salaryProfiles,
        payrollRuns,
        generateMonthlyPayrollRun,
        recordSalaryTransaction,
        saveSalaryProfile,
        canViewSalary,
        canManagePayroll,
        leaveTypes,
        leaveRequests,
        isLeaveModalOpen,
        setIsLeaveModalOpen,
        applyLeave,
        approveLeave,
        rejectLeave,
        cancelLeave,
        getLeaveBalance,
        employeesOnLeaveToday,
        upcomingLeaves,
        attendanceRecords,
        markAttendance,
        // Phase 8 Finance & Billing
        quotations,
        invoices,
        payments,
        refunds,
        expenses,
        financialSettings,
        pdfViewerModal,
        openPdfViewer,
        closePdfViewer,
        createQuotation,
        updateQuotation,
        convertQuotationToBooking,
        createInvoice,
        issueInvoice,
        cancelInvoice,
        recordPayment,
        createRefund,
        createExpense,
        approveExpense,
        rejectExpense,
        markExpensePaid,
        updateFinancialSettings,
        refreshFinancials,
        globalSearchQuery,
        setGlobalSearchQuery,
        resetDemoData
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
