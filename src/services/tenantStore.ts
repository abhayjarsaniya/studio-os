import { 
  studioA, branchesA, membersA, customersA, eventsA, tasksA, notificationsA,
  subEventsA, employeesA, salaryProfilesA, leaveRequestsA,
  studioB, branchesB, membersB, customersB, eventsB, tasksB, notificationsB,
  subEventsB, employeesB, salaryProfilesB, leaveRequestsB
} from '../data/multiTenantDemoData';
import { firestoreService } from './firestoreService';

// In-memory fallback for Node/Vitest test environments where localStorage may not exist
const memoryStorage: Record<string, string> = {};

function storageGet(key: string): string | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage.getItem(key);
  }
  return memoryStorage[key] || null;
}

function storageSet(key: string, value: string): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(key, value);
  } else {
    memoryStorage[key] = value;
  }
}

function storageRemove(key: string): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem(key);
  } else {
    delete memoryStorage[key];
  }
}

export class TenantStore {
  private static getKey(studioId: string, collection: string): string {
    if (!studioId || typeof studioId !== 'string' || !studioId.trim()) {
      throw new Error(`[Tenant Security Exception]: studioId is required for collection "${collection}". Cross-tenant operations are forbidden.`);
    }
    return `studio_os_${studioId.trim()}_${collection}`;
  }

  static initializeDefaults(): void {
    const initializedKey = 'studio_os_tenants_initialized_v5';
    if (!storageGet(initializedKey)) {
      // Seed Studio A
      this.set('studio_royal_001', 'profile', studioA);
      this.set('studio_royal_001', 'branches', branchesA);
      this.set('studio_royal_001', 'members', membersA);
      this.set('studio_royal_001', 'customers', customersA);
      this.set('studio_royal_001', 'events', eventsA);
      this.set('studio_royal_001', 'tasks', tasksA);
      this.set('studio_royal_001', 'notifications', notificationsA);
      this.set('studio_royal_001', 'subEvents', subEventsA);
      this.set('studio_royal_001', 'employees', employeesA);
      this.set('studio_royal_001', 'salaryProfiles', salaryProfilesA);
      this.set('studio_royal_001', 'leaveRequests', leaveRequestsA);

      // Seed Studio B
      this.set('studio_creative_002', 'profile', studioB);
      this.set('studio_creative_002', 'branches', branchesB);
      this.set('studio_creative_002', 'members', membersB);
      this.set('studio_creative_002', 'customers', customersB);
      this.set('studio_creative_002', 'events', eventsB);
      this.set('studio_creative_002', 'tasks', tasksB);
      this.set('studio_creative_002', 'notifications', notificationsB);
      this.set('studio_creative_002', 'subEvents', subEventsB);
      this.set('studio_creative_002', 'employees', employeesB);
      this.set('studio_creative_002', 'salaryProfiles', salaryProfilesB);
      this.set('studio_creative_002', 'leaveRequests', leaveRequestsB);

      storageSet(initializedKey, 'true');
    }
  }

  static get<T>(studioId: string, collection: string): T[] {
    this.assertStudioId(studioId);
    const key = this.getKey(studioId, collection);
    const raw = storageGet(key);
    if (!raw) {
      // Fallback to seed data if not yet saved in storage
      if (studioId === 'studio_royal_001') {
        if (collection === 'branches') return branchesA as unknown as T[];
        if (collection === 'members') return membersA as unknown as T[];
        if (collection === 'customers') return customersA as unknown as T[];
        if (collection === 'events') return eventsA as unknown as T[];
        if (collection === 'tasks') return tasksA as unknown as T[];
        if (collection === 'notifications') return notificationsA as unknown as T[];
        if (collection === 'subEvents') return subEventsA as unknown as T[];
        if (collection === 'employees') return employeesA as unknown as T[];
        if (collection === 'salaryProfiles') return salaryProfilesA as unknown as T[];
        if (collection === 'leaveRequests') return leaveRequestsA as unknown as T[];
      } else if (studioId === 'studio_creative_002') {
        if (collection === 'branches') return branchesB as unknown as T[];
        if (collection === 'members') return membersB as unknown as T[];
        if (collection === 'customers') return customersB as unknown as T[];
        if (collection === 'events') return eventsB as unknown as T[];
        if (collection === 'tasks') return tasksB as unknown as T[];
        if (collection === 'notifications') return notificationsB as unknown as T[];
        if (collection === 'subEvents') return subEventsB as unknown as T[];
        if (collection === 'employees') return employeesB as unknown as T[];
        if (collection === 'salaryProfiles') return salaryProfilesB as unknown as T[];
        if (collection === 'leaveRequests') return leaveRequestsB as unknown as T[];
      }
      return [];
    }
    try {
      return JSON.parse(raw) as T[];
    } catch {
      return [];
    }
  }

  static getSingle<T>(studioId: string, collection: string): T | null {
    this.assertStudioId(studioId);
    const key = this.getKey(studioId, collection);
    const raw = storageGet(key);
    if (!raw) {
      if (studioId === 'studio_royal_001' && collection === 'profile') return studioA as unknown as T;
      if (studioId === 'studio_creative_002' && collection === 'profile') return studioB as unknown as T;
      return null;
    }
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  static set<T>(studioId: string, collection: string, data: T): void {
    this.assertStudioId(studioId);
    const key = this.getKey(studioId, collection);
    storageSet(key, JSON.stringify(data));

    // Automatic Real-Time Cloud Save to Firebase Firestore
    // Enable only in browser runtime when authenticated to avoid unauthenticated node CLI background gRPC attempts
    const isClientSide = typeof window !== 'undefined';
    const isTestRunner = typeof process !== 'undefined' && Boolean(process.env?.VITEST || process.env?.NODE_ENV === 'test');
    if (isClientSide && !isTestRunner) {
      try {
        if (Array.isArray(data)) {
          firestoreService.saveCollectionBatch(studioId, collection, data as any);
        } else if (data && typeof data === 'object') {
          const docId = (data as any).id || (collection === 'profile' ? 'profile' : 'settings');
          firestoreService.saveDocument(studioId, collection, docId, data as any);
        }
      } catch {
        // In-memory or test environment safe fallback
      }
    }
  }

  static remove(studioId: string, collection: string): void {
    this.assertStudioId(studioId);
    const key = this.getKey(studioId, collection);
    storageRemove(key);
  }

  static resetTenant(studioId: string): void {
    this.assertStudioId(studioId);
    const collections = [
      'profile', 'branches', 'members', 'customers', 'events', 'tasks', 
      'notifications', 'auditLogs', 'invoices', 'subEvents', 'employees', 
      'roles', 'salaryProfiles', 'payrollRuns', 'salaryTransactions', 
      'leaveTypes', 'leaveRequests', 'leaveBalances', 'attendance', 'authCredentials',
      'quotations', 'payments', 'refunds', 'expenses', 'paymentSchedules', 'financialSettings',
      'savedReports', 'reportJobs',
      'platform_admins', 'platform_plans', 'platform_studio_subscriptions', 'platform_invoices',
      'platform_payments', 'platform_announcements', 'platform_support_tickets',
      'platform_support_access_grants', 'platform_audit_logs', 'platform_features', 'platform_settings'
    ];
    for (const c of collections) {
      storageRemove(this.getKey(studioId, c));
    }
  }

  static resetAll(): void {
    storageRemove('studio_os_tenants_initialized_v4');
    this.resetTenant('studio_royal_001');
    this.resetTenant('studio_creative_002');
    this.initializeDefaults();
  }

  private static assertStudioId(studioId: string): void {
    if (!studioId || typeof studioId !== 'string' || !studioId.trim()) {
      throw new Error('[Tenant Security Exception]: studioId cannot be empty. Every multi-tenant operation requires a valid studioId.');
    }
  }
}

// Auto initialize on import
TenantStore.initializeDefaults();
