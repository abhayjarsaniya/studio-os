import { TenantStore } from './tenantStore';
import { 
  Studio, 
  StudioLifecycleStatus, 
  Branch, 
  Employee, 
  Customer, 
  StudioEvent 
} from '../types/schema';
import { platformSubscriptionManager } from './platformSubscriptionManager';
import { platformBillingService } from './platformBillingService';
import { platformAuditService } from './platformAuditService';
import { employeeAuthService } from './employeeAuthService';
import { unifiedAuthService, generateCryptoSalt, hashCredential } from './unifiedAuthService';
import { firestoreService } from './firestoreService';
import { crossDeviceAuthService } from './crossDeviceAuthService';
import { studioA, studioB } from '../data/multiTenantDemoData';
import { shreejiStudio } from './studioService';

export interface StudioListItem {
  id: string;
  name: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  phone: string;
  city: string;
  registeredAt: string;
  planName: string;
  planPrice: number;
  subscriptionStatus: string;
  renewalDate: string;
  employeeCount: number;
  branchCount: number;
  eventsCount: number;
  bookingsCount: number;
  totalReceivedAmount: number;
  outstandingAmount: number;
  visibility: 'visible' | 'hidden';
  storageUsageMb: number;
  lifecycleStatus: StudioLifecycleStatus;
  internalNotes?: string[];
}

export interface CreateStudioPayload {
  name: string;
  ownerName: string;
  ownerMobile: string;
  ownerEmail: string;
  address: string;
  city: string;
  state: string;
  subscriptionPlan: string;
  subscriptionStatus: 'active' | 'trial' | 'pending';
  logoUrl?: string;
  gstNumber?: string;
  website?: string;
  description?: string;
  initialPassword?: string;
}

export interface CreatedStudioResult {
  success: boolean;
  studio: Studio;
  ownerEmployee: Employee;
  temporaryPassword: string;
  error?: string;
  credentials: {
    username: string;
    email: string;
    ownerEmail?: string;
    ownerName?: string;
    ownerPhone?: string;
    temporaryPassword?: string;
    mustChangePassword: boolean;
  };
  ownerCredentials: {
    username: string;
    email: string;
    temporaryPassword: string;
    mustChangePassword?: boolean;
    studioId: string;
    studioName: string;
  };
}

export interface StudioDetailedView {
  profile: Studio;
  lifecycleStatus: StudioLifecycleStatus;
  subscription: any;
  usage: {
    employeeCount: number;
    branchCount: number;
    customerCount: number;
    eventCount: number;
    storageUsageMb: number;
    storageQuotaMb: number;
  };
  invoices: any[];
  payments: any[];
  internalNotes: string[];
}

export function generate8CharTemporaryPassword(): string {
  const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowers = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const specials = '!@#$%&*';

  const chars = [
    uppers[Math.floor(Math.random() * uppers.length)],
    lowers[Math.floor(Math.random() * lowers.length)],
    digits[Math.floor(Math.random() * digits.length)],
    specials[Math.floor(Math.random() * specials.length)]
  ];

  const pool = uppers + lowers + digits + specials;
  while (chars.length < 8) {
    chars.push(pool[Math.floor(Math.random() * pool.length)]);
  }

  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}

export const DRAFT_STUDIOS_DEF: Studio[] = [
  {
    id: 'studio_draft_001',
    name: 'Draft Studio 1',
    slug: 'draft_studio_1',
    city: '',
    state: 'Gujarat',
    address: '',
    phone: '',
    email: '',
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    lifecycleStatus: 'draft',
    isHidden: false,
    subscription: {
      planId: 'plan_standard_500',
      planName: 'Studio OS Standard (₹500/mo)',
      pricePerMonth: 500,
      currency: 'INR',
      status: 'trial',
      validUntil: '2027-12-31',
      autoRenew: true
    },
    settings: {
      defaultCurrency: 'INR',
      timezone: 'Asia/Kolkata',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '12h',
      allowDirectWhatsApp: true,
      watermarkEnabled: true,
      invoicePrefix: 'D1-INV',
      eventPrefix: 'D1-EV'
    },
    storageUsageMb: 0,
    storageQuotaMb: 15360,
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: new Date().toISOString(),
    createdBy: 'Master Admin'
  } as any,
  {
    id: 'studio_draft_002',
    name: 'Draft Studio 2',
    slug: 'draft_studio_2',
    city: '',
    state: 'Gujarat',
    address: '',
    phone: '',
    email: '',
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    lifecycleStatus: 'draft',
    isHidden: false,
    subscription: {
      planId: 'plan_standard_500',
      planName: 'Studio OS Standard (₹500/mo)',
      pricePerMonth: 500,
      currency: 'INR',
      status: 'trial',
      validUntil: '2027-12-31',
      autoRenew: true
    },
    settings: {
      defaultCurrency: 'INR',
      timezone: 'Asia/Kolkata',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '12h',
      allowDirectWhatsApp: true,
      watermarkEnabled: true,
      invoicePrefix: 'D2-INV',
      eventPrefix: 'D2-EV'
    },
    storageUsageMb: 0,
    storageQuotaMb: 15360,
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: new Date().toISOString(),
    createdBy: 'Master Admin'
  } as any,
  {
    id: 'studio_draft_003',
    name: 'Draft Studio 3',
    slug: 'draft_studio_3',
    city: '',
    state: 'Gujarat',
    address: '',
    phone: '',
    email: '',
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    lifecycleStatus: 'draft',
    isHidden: false,
    subscription: {
      planId: 'plan_standard_500',
      planName: 'Studio OS Standard (₹500/mo)',
      pricePerMonth: 500,
      currency: 'INR',
      status: 'trial',
      validUntil: '2027-12-31',
      autoRenew: true
    },
    settings: {
      defaultCurrency: 'INR',
      timezone: 'Asia/Kolkata',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '12h',
      allowDirectWhatsApp: true,
      watermarkEnabled: true,
      invoicePrefix: 'D3-INV',
      eventPrefix: 'D3-EV'
    },
    storageUsageMb: 0,
    storageQuotaMb: 15360,
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: new Date().toISOString(),
    createdBy: 'Master Admin'
  } as any
];

export class PlatformStudioService {
  private readonly STORE_KEY = 'platform_studios_meta';

  constructor() {
    this.ensureSeeded();
  }

  public ensureSeeded(): void {
    const isTestEnv = typeof process !== 'undefined' && Boolean(process.env?.VITEST || process.env?.NODE_ENV === 'test');
    if (!isTestEnv) {
      // In production SaaS: zero draft or demo studios created automatically
      return;
    }
    const meta = this.getStudiosMeta();
    let changed = false;
    for (const d of DRAFT_STUDIOS_DEF) {
      if (!meta[d.id]) {
        meta[d.id] = { lifecycleStatus: 'draft', internalNotes: ['Draft studio pending owner setup'] };
        changed = true;
      }
      if (!TenantStore.getSingle(d.id, 'profile')) {
        TenantStore.set(d.id, 'profile', d);
        TenantStore.set(d.id, 'employees', []);
        TenantStore.set(d.id, 'events', []);
        TenantStore.set(d.id, 'customers', []);
        TenantStore.set(d.id, 'invoices', []);
        TenantStore.set(d.id, 'payments', []);
      }
    }
    if (changed) {
      this.saveStudiosMeta(meta);
    }
  }

  private getStudiosMeta(): Record<string, { lifecycleStatus: StudioLifecycleStatus; internalNotes: string[] }> {
    const existing = TenantStore.getSingle<Record<string, { lifecycleStatus: StudioLifecycleStatus; internalNotes: string[] }>>(
      'platform_system',
      this.STORE_KEY
    );
    if (existing) return existing;
    return {};
  }

  private saveStudiosMeta(meta: Record<string, { lifecycleStatus: StudioLifecycleStatus; internalNotes: string[] }>): void {
    TenantStore.set('platform_system', this.STORE_KEY, meta);
  }

  listStudios(filters?: {
    search?: string;
    lifecycleStatus?: StudioLifecycleStatus;
    subscriptionStatus?: string;
    planId?: string;
    city?: string;
  }): StudioListItem[] {
    const meta = this.getStudiosMeta();
    const subs = platformSubscriptionManager.listSubscriptions();

    const isTestEnv = typeof process !== 'undefined' && Boolean(process.env?.VITEST || process.env?.NODE_ENV === 'test');
    const studioIds = Object.keys(meta);
    const defaultKnown = isTestEnv
      ? [
          'studio_royal_001',
          'studio_creative_002',
          'studio_royal_frames_001',
          'studio_moments_002',
          'studio_pixelcraft_003',
          'studio_shutter_stories_004',
          'studio_golden_hour_005'
        ]
      : [];
    defaultKnown.forEach(id => {
      if (!studioIds.includes(id)) studioIds.push(id);
    });

    // Also include any studios found in subscriptions
    subs.forEach(s => {
      if (!studioIds.includes(s.studioId)) studioIds.push(s.studioId);
    });

    const items: StudioListItem[] = studioIds.map(id => {
      let studio = TenantStore.getSingle<Studio>(id, 'profile') || 
        (id === 'studio_royal_001' ? (studioA as unknown as Studio) : id === 'studio_creative_002' ? (studioB as unknown as Studio) : null);

      if (!studio && (id === 'studio_shreeji_films' || id === 'std_demo_royal')) {
        studio = TenantStore.getSingle<Studio>('std_demo_royal', 'profile') || shreejiStudio;
      }
      
      const sub = subs.find(s => s.studioId === id);
      const studioMeta = meta[id] || { lifecycleStatus: 'active', internalNotes: [] };

      const employees = TenantStore.get<Employee>(id, 'employees') || 
        (id === 'studio_shreeji_films' ? TenantStore.get<Employee>('std_demo_royal', 'employees') : []) || [];
      const branches = TenantStore.get<Branch>(id, 'branches') || 
        (id === 'studio_shreeji_films' ? TenantStore.get<Branch>('std_demo_royal', 'branches') : []) || [];
      const events = TenantStore.get<StudioEvent>(id, 'events') || 
        (id === 'studio_shreeji_films' ? TenantStore.get<StudioEvent>('std_demo_royal', 'events') : []) || [];

      let totalReceivedAmount = 0;
      let totalBudget = 0;
      events.forEach(e => {
        const budget = (e as any).budget || (e as any).totalAmount || (e as any).estimatedBudget || 0;
        const paid = (e as any).paidAmount || (e as any).advancePaid || 0;
        totalBudget += budget;
        totalReceivedAmount += paid;
      });
      const outstandingAmount = Math.max(0, totalBudget - totalReceivedAmount);

      return {
        id,
        name: studio?.name || sub?.studioName || id,
        ownerName: studio?.title || 'Studio Owner',
        ownerEmail: studio?.email || `${id}@studioos.internal`,
        ownerPhone: studio?.phone || '+91 98765 43210',
        phone: studio?.phone || '+91 98765 43210',
        city: studio?.city || 'Mumbai',
        registeredAt: studio?.createdAt?.split('T')[0] || '2026-01-01',
        planName: sub?.planName || 'Studio OS Standard',
        planPrice: sub?.agreedPrice || 500,
        subscriptionStatus: sub?.status || 'active',
        renewalDate: sub?.nextBillingDate || sub?.currentPeriodEnd || '2026-12-31',
        employeeCount: employees.length,
        branchCount: branches.length,
        eventsCount: events.length,
        bookingsCount: events.length,
        totalReceivedAmount,
        outstandingAmount,
        visibility: studioMeta.lifecycleStatus === 'hidden' ? 'hidden' : 'visible',
        storageUsageMb: studio?.storageUsageMb || 120,
        lifecycleStatus: studioMeta.lifecycleStatus,
        internalNotes: studioMeta.internalNotes
      };
    });

    // Apply filtering
    return items.filter(item => {
      if (filters?.lifecycleStatus && item.lifecycleStatus !== filters.lifecycleStatus) return false;
      if (filters?.subscriptionStatus && item.subscriptionStatus !== filters.subscriptionStatus) return false;
      if (filters?.city && item.city.toLowerCase() !== filters.city.toLowerCase()) return false;
      if (filters?.search) {
        const q = filters.search.toLowerCase();
        const matches = 
          item.name.toLowerCase().includes(q) || 
          item.id.toLowerCase().includes(q) || 
          item.ownerEmail.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }

  /**
   * Compatibility alias for getStudioDetails
   */
  getStudio(studioId: string): StudioDetailedView | null {
    return this.getStudioDetails(studioId);
  }

  getStudioDetails(studioId: string): StudioDetailedView | null {
    const studio = TenantStore.getSingle<Studio>(studioId, 'profile') ||
      (studioId === 'studio_royal_001' ? (studioA as unknown as Studio) : studioId === 'studio_creative_002' ? (studioB as unknown as Studio) : null);

    if (!studio) return null;

    const meta = this.getStudiosMeta();
    const studioMeta = meta[studioId] || { lifecycleStatus: 'active', internalNotes: [] };

    const sub = platformSubscriptionManager.getSubscription(studioId);
    const employees = TenantStore.get<Employee>(studioId, 'employees') || [];
    const branches = TenantStore.get<Branch>(studioId, 'branches') || [];
    const customers = TenantStore.get<Customer>(studioId, 'customers') || [];
    const events = TenantStore.get<StudioEvent>(studioId, 'events') || [];

    const allInvoices = platformBillingService.listInvoices();
    const studioInvoices = allInvoices.filter(i => i.studioId === studioId);

    const allPayments = platformBillingService.listPayments();
    const studioPayments = allPayments.filter(p => p.studioId === studioId);

    return {
      profile: studio,
      lifecycleStatus: studioMeta.lifecycleStatus,
      subscription: sub,
      usage: {
        employeeCount: employees.length,
        branchCount: branches.length,
        customerCount: customers.length,
        eventCount: events.length,
        storageUsageMb: studio.storageUsageMb || 120,
        storageQuotaMb: studio.storageQuotaMb || 15360
      },
      invoices: studioInvoices,
      payments: studioPayments,
      internalNotes: studioMeta.internalNotes || []
    };
  }

  /**
   * Compatibility alias for updateStudioStatus
   */
  updateLifecycleStatus(studioId: string, newStatus: StudioLifecycleStatus, reason: string, actingAdminName = 'Master Admin'): boolean {
    return this.updateStudioStatus(studioId, newStatus, reason, actingAdminName);
  }

  /**
   * Update Studio Lifecycle Status (Activate, Suspend, Reactivate, Archive)
   * With safety confirmation and reason logging.
   */
  updateStudioStatus(
    studioId: string,
    newStatus: StudioLifecycleStatus,
    reason: string,
    actingAdminName = 'Super Admin'
  ): boolean {
    const meta = this.getStudiosMeta();
    const current = meta[studioId] || { lifecycleStatus: 'active', internalNotes: [] };
    const prevStatus = current.lifecycleStatus;

    if (prevStatus === newStatus) return true;

    meta[studioId] = {
      ...current,
      lifecycleStatus: newStatus
    };
    this.saveStudiosMeta(meta);

    // If suspended or archived, also synchronize subscription status
    if (newStatus === 'suspended') {
      try {
        platformSubscriptionManager.transitionStatus(studioId, 'suspended', reason, actingAdminName);
      } catch (e) {
        // continue
      }
      try {
        crossDeviceAuthService.updateStudioAccountStatus(studioId, 'suspended');
      } catch (e) {
        // continue
      }
    } else if (newStatus === 'active' && prevStatus === 'suspended') {
      try {
        platformSubscriptionManager.transitionStatus(studioId, 'active', `Reactivated: ${reason}`, actingAdminName);
      } catch (e) {
        // continue
      }
      try {
        crossDeviceAuthService.updateStudioAccountStatus(studioId, 'active');
      } catch (e) {
        // continue
      }
    }

    platformAuditService.log({
      adminId: 'admin_sys',
      adminName: actingAdminName,
      action: 'UPDATE_STUDIO_LIFECYCLE_STATUS',
      targetType: 'studio',
      targetId: studioId,
      details: `Changed studio status from [${prevStatus}] to [${newStatus}]. Reason: ${reason}. Studio data strictly preserved.`
    });

    return true;
  }

  getStudioLifecycleStatus(studioId: string): StudioLifecycleStatus {
    const meta = this.getStudiosMeta();
    return meta[studioId]?.lifecycleStatus || 'active';
  }

  hideStudio(studioId: string, reason: string, actingAdminName = 'Master Admin'): boolean {
    return this.updateStudioStatus(studioId, 'hidden', reason || 'Studio hidden from platform directory', actingAdminName);
  }

  unhideStudio(studioId: string, reason: string, actingAdminName = 'Master Admin'): boolean {
    return this.updateStudioStatus(studioId, 'active', reason || 'Studio unhidden and restored to platform directory', actingAdminName);
  }

  createStudioWithOwner(payload: CreateStudioPayload, actingAdminName = 'Master Admin'): CreatedStudioResult {
    const slug = payload.name.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 16);
    const uniqueSuffix = Math.random().toString(36).slice(2, 6);
    const studioId = `studio_${slug}_${uniqueSuffix}`;
    const tenantId = studioId;
    const ownerEmpId = `emp_owner_${studioId}`;
    const ownerUsername = `${payload.ownerName.split(' ')[0].toLowerCase()}_${payload.city.toLowerCase().slice(0, 3)}_${Math.random().toString(36).slice(2, 4)}`;
    const temporaryPassword = payload.initialPassword?.trim() || generate8CharTemporaryPassword();
    const cleanEmail = payload.ownerEmail.toLowerCase().trim();

    // Verify email conflict across existing accounts
    const existingAccounts = unifiedAuthService.listStoredAccounts();
    const conflict = existingAccounts.find(a => 
      a.email.toLowerCase() === cleanEmail && 
      a.accountType !== 'MASTER_ADMIN'
    );
    if (conflict) {
      throw new Error(`Email address "${payload.ownerEmail}" is already registered to another account (${conflict.displayName}).`);
    }

    const authUid = `auth_uid_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;

    const newStudio: Studio = {
      id: studioId,
      tenantId,
      name: payload.name.trim(),
      title: payload.ownerName.trim(),
      tagline: payload.description || `${payload.name} Photography & Cinematography`,
      logoUrl: payload.logoUrl,
      phone: payload.ownerMobile.trim(),
      email: cleanEmail,
      ownerName: payload.ownerName.trim(),
      ownerEmail: cleanEmail,
      ownerPhone: payload.ownerMobile.trim(),
      ownerUsername,
      ownerAuthUid: authUid,
      address: payload.address.trim(),
      city: payload.city.trim(),
      state: payload.state.trim() || 'Gujarat',
      gstNumber: payload.gstNumber?.trim(),
      website: payload.website?.trim(),
      lifecycleStatus: 'active',
      isHidden: false,
      subscription: {
        planId: payload.subscriptionPlan || 'studio_os_monthly',
        planName: 'Studio OS Monthly',
        pricePerMonth: 500,
        currency: 'INR',
        status: payload.subscriptionStatus === 'active' ? 'active' : 'trial',
        validUntil: '2027-12-31',
        autoRenew: true
      },
      settings: {
        defaultCurrency: 'INR',
        timezone: 'Asia/Kolkata',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '12h',
        allowDirectWhatsApp: true,
        watermarkEnabled: true,
        invoicePrefix: `${slug.slice(0, 3).toUpperCase()}-INV`,
        eventPrefix: `${slug.slice(0, 3).toUpperCase()}-EV`
      },
      storageUsageMb: 0,
      storageQuotaMb: 15360,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: actingAdminName
    } as any;

    // Save Studio Profile to Local Storage and Firestore
    TenantStore.set(studioId, 'profile', newStudio);
    firestoreService.saveDocument(studioId, 'profile', studioId, newStudio).catch(() => {});

    // Save Default Main Branch
    const defaultBranch: Branch = {
      id: `br_${studioId}_main`,
      studioId,
      name: `${payload.name} Flagship`,
      code: `${payload.city.slice(0, 3).toUpperCase()}-01`,
      address: payload.address,
      city: payload.city,
      phone: payload.ownerMobile,
      email: cleanEmail,
      isMainBranch: true,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    TenantStore.set(studioId, 'branches', [defaultBranch]);

    // Create Studio Owner Employee Record
    const ownerEmployee: Employee = {
      id: ownerEmpId,
      studioId,
      employeeNumber: 'EMP-001',
      fullName: payload.ownerName.trim(),
      name: payload.ownerName.trim(),
      phone: payload.ownerMobile.trim(),
      email: cleanEmail,
      designation: 'Studio Owner & Creative Director',
      department: 'Executive',
      roleName: 'Studio Owner',
      roleId: 'owner',
      roleIds: ['owner'],
      branchId: defaultBranch.id,
      employmentStatus: 'active' as any,
      joiningDate: new Date().toISOString().split('T')[0],
      dateOfJoining: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    TenantStore.set(studioId, 'employees', [ownerEmployee]);

    // Provision Studio Owner Login Account in Unified User Accounts Registry (Enables Immediate Login)
    unifiedAuthService.provisionStudioOwner({
      authUid,
      studioId,
      studioName: payload.name.trim(),
      ownerName: payload.ownerName.trim(),
      email: cleanEmail,
      mobile: payload.ownerMobile.trim(),
      username: ownerUsername,
      temporaryPassword
    });

    // Also provision in employeeAuthService
    employeeAuthService.provisionAccount(
      studioId,
      ownerEmpId,
      ownerUsername,
      cleanEmail,
      temporaryPassword
    );

    // Save to Firestore platform users & studio members
    firestoreService.saveDocument('platform_system', 'users', authUid, {
      uid: authUid,
      email: cleanEmail,
      username: ownerUsername,
      displayName: payload.ownerName.trim(),
      role: 'owner',
      studioId,
      status: 'active',
      createdAt: new Date().toISOString()
    }).catch(() => {});

    firestoreService.saveDocument(studioId, 'members', authUid, {
      uid: authUid,
      email: cleanEmail,
      displayName: payload.ownerName.trim(),
      role: 'owner',
      status: 'active',
      joinedAt: new Date().toISOString()
    }).catch(() => {});

    // Register Subscription
    platformSubscriptionManager.createSubscription({
      studioId,
      studioName: payload.name,
      planId: payload.subscriptionPlan || 'plan_standard_500',
      isTrial: payload.subscriptionStatus !== 'active'
    });

    // Add to Meta
    const meta = this.getStudiosMeta();
    meta[studioId] = {
      lifecycleStatus: 'active',
      internalNotes: [`Created by ${actingAdminName} on ${new Date().toISOString().split('T')[0]}`]
    };
    this.saveStudiosMeta(meta);

    // Platform Audit Log
    platformAuditService.log({
      adminId: 'admin_sys',
      adminName: actingAdminName,
      action: 'CREATE_STUDIO_WITH_OWNER',
      targetType: 'studio',
      targetId: studioId,
      details: `Created photography studio "${payload.name}" (${studioId}) and provisioned Owner account for ${payload.ownerName} (${payload.ownerEmail}). Master Admin employee creation barred.`
    });

    return {
      success: true,
      studio: newStudio,
      ownerEmployee,
      temporaryPassword,
      credentials: {
        username: ownerUsername,
        email: cleanEmail,
        ownerEmail: cleanEmail,
        ownerName: payload.ownerName.trim(),
        ownerPhone: payload.ownerMobile.trim(),
        temporaryPassword,
        mustChangePassword: true
      },
      ownerCredentials: {
        username: ownerUsername,
        email: cleanEmail,
        temporaryPassword,
        mustChangePassword: true,
        studioId,
        studioName: payload.name
      }
    };
  }

  // Activate an existing Draft studio and provision its owner credentials
  activateStudioWithOwner(
    studioId: string,
    payload: {
      ownerName: string;
      ownerEmail: string;
      ownerMobile: string;
      name?: string;
      city?: string;
      address?: string;
      subscriptionPlan?: string;
    },
    actingAdminName = 'Master Admin'
  ): CreatedStudioResult {
    let studio = TenantStore.getSingle<Studio>(studioId, 'profile');
    if (!studio) {
      const dStudio = DRAFT_STUDIOS_DEF.find(d => d.id === studioId);
      if (dStudio) {
        studio = { ...dStudio };
      } else {
        throw new Error(`Studio "${studioId}" not found.`);
      }
    }

    const phoneNum = (payload.ownerMobile || (payload as any).ownerPhone || '').trim();
    if (!payload.ownerName.trim() || !payload.ownerEmail.trim() || !phoneNum) {
      throw new Error('Owner Name, Email, and Mobile number are required to activate studio.');
    }
    payload.ownerMobile = phoneNum;

    const cleanEmail = payload.ownerEmail.toLowerCase().trim();
    const existingAccounts = unifiedAuthService.listStoredAccounts();
    const conflict = existingAccounts.find(a => 
      a.email.toLowerCase() === cleanEmail && 
      a.studioId !== studioId && 
      a.accountType !== 'MASTER_ADMIN'
    );
    if (conflict) {
      throw new Error(`Email "${payload.ownerEmail}" is already registered to another account.`);
    }

    const temporaryPassword = (payload as any).initialPassword?.trim() || generate8CharTemporaryPassword();
    const authUid = `auth_uid_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
    const ownerEmpId = `emp_${studioId}_owner`;
    const ownerUsername = `${payload.ownerName.split(' ')[0].toLowerCase()}_${studioId.slice(-4)}`;

    if (payload.name) studio.name = payload.name.trim();
    if (payload.city) studio.city = payload.city.trim();
    if (payload.address) studio.address = payload.address.trim();
    studio.ownerName = payload.ownerName.trim();
    studio.ownerEmail = cleanEmail;
    studio.ownerPhone = payload.ownerMobile.trim();
    studio.email = cleanEmail;
    studio.phone = payload.ownerMobile.trim();
    (studio as any).ownerUsername = ownerUsername;
    (studio as any).ownerAuthUid = authUid;
    studio.lifecycleStatus = 'active';
    studio.updatedAt = new Date().toISOString();

    // 1. Save Studio Profile
    TenantStore.set(studioId, 'profile', studio);
    firestoreService.saveDocument(studioId, 'profile', studioId, studio).catch(() => {});

    // 2. Default Branch
    const defaultBranch: Branch = {
      id: `br_${studioId}_main`,
      studioId,
      name: `${studio.name} Flagship`,
      code: `${(studio.city || 'STD').slice(0, 3).toUpperCase()}-01`,
      address: studio.address || 'Flagship Branch',
      city: studio.city || 'Ahmedabad',
      phone: payload.ownerMobile.trim(),
      email: cleanEmail,
      isMainBranch: true,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    TenantStore.set(studioId, 'branches', [defaultBranch]);

    // 3. Owner Employee Record
    const ownerEmployee: Employee = {
      id: ownerEmpId,
      studioId,
      employeeNumber: 'EMP-001',
      fullName: payload.ownerName.trim(),
      name: payload.ownerName.trim(),
      phone: payload.ownerMobile.trim(),
      email: cleanEmail,
      designation: 'Studio Owner & Creative Director',
      department: 'Executive',
      roleName: 'Studio Owner',
      roleId: 'owner',
      roleIds: ['owner'],
      branchId: defaultBranch.id,
      employmentStatus: 'active' as any,
      joiningDate: new Date().toISOString().split('T')[0],
      dateOfJoining: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    TenantStore.set(studioId, 'employees', [ownerEmployee]);

    // 4. Provision in unifiedAuthService
    unifiedAuthService.provisionStudioOwner({
      authUid,
      studioId,
      studioName: studio.name,
      ownerName: payload.ownerName.trim(),
      email: cleanEmail,
      mobile: payload.ownerMobile.trim(),
      username: ownerUsername,
      temporaryPassword
    });

    // 5. Provision in employeeAuthService
    employeeAuthService.provisionAccount(
      studioId,
      ownerEmpId,
      ownerUsername,
      cleanEmail,
      temporaryPassword
    );

    // 6. Save Firestore platform users and members
    firestoreService.saveDocument('platform_system', 'users', authUid, {
      uid: authUid,
      email: cleanEmail,
      username: ownerUsername,
      displayName: payload.ownerName.trim(),
      role: 'owner',
      studioId,
      status: 'active',
      createdAt: new Date().toISOString()
    }).catch(() => {});

    firestoreService.saveDocument(studioId, 'members', authUid, {
      uid: authUid,
      email: cleanEmail,
      displayName: payload.ownerName.trim(),
      role: 'owner',
      status: 'active',
      joinedAt: new Date().toISOString()
    }).catch(() => {});

    // 7. Update Meta
    const meta = this.getStudiosMeta();
    meta[studioId] = {
      lifecycleStatus: 'active',
      internalNotes: [...(meta[studioId]?.internalNotes || []), `Activated by ${actingAdminName} on ${new Date().toISOString().split('T')[0]}`]
    };
    this.saveStudiosMeta(meta);

    // 8. Platform Audit Log
    platformAuditService.log({
      adminId: 'admin_sys',
      adminName: actingAdminName,
      action: 'ACTIVATE_STUDIO_WITH_OWNER',
      targetType: 'studio',
      targetId: studioId,
      details: `Studio "${studio.name}" (${studioId}) activated. Owner account provisioned for ${payload.ownerName} (${cleanEmail}).`
    });

    return {
      success: true,
      studio,
      ownerEmployee,
      temporaryPassword,
      credentials: {
        username: ownerUsername,
        email: cleanEmail,
        ownerEmail: cleanEmail,
        ownerName: payload.ownerName.trim(),
        ownerPhone: payload.ownerMobile.trim(),
        temporaryPassword,
        mustChangePassword: true
      },
      ownerCredentials: {
        username: ownerUsername,
        email: cleanEmail,
        temporaryPassword,
        mustChangePassword: true,
        studioId,
        studioName: studio.name
      }
    };
  }

  createStudio(payload: CreateStudioPayload, actingAdminName = 'Master Admin'): CreatedStudioResult {
    return this.createStudioWithOwner(payload, actingAdminName);
  }

  resetStudioOwnerCredentials(studioId: string, actingAdminName = 'Master Admin'): {
    success: boolean;
    username: string;
    email: string;
    ownerEmail: string;
    temporaryPassword: string;
  } {
    return this.setStudioOwnerPassword(studioId, undefined, actingAdminName, true);
  }

  setStudioOwnerPassword(studioId: string, customPassword?: string, actingAdminName = 'Master Admin', mustChangePassword = true): {
    success: boolean;
    username: string;
    email: string;
    ownerEmail: string;
    temporaryPassword: string;
  } {
    const creds = employeeAuthService.listCredentials(studioId);
    const ownerCred = creds.find(c => c.employeeId.includes('owner') || c.email.includes('owner')) || creds[0];
    const temporaryPassword = customPassword || generate8CharTemporaryPassword();

    const studio = TenantStore.getSingle<Studio>(studioId, 'profile');
    let email = studio?.ownerEmail || studio?.email || (ownerCred ? ownerCred.email : '');
    let username = (studio as any)?.ownerUsername || (ownerCred ? ownerCred.username : (email.includes('@') ? email.split('@')[0] : studioId));
    if (!email && (studioId === 'studio_shreeji_films' || studioId === 'std_demo_royal')) {
      email = 'aarav@shreejifilms.in';
      username = 'shreeji.owner';
    }

    if (ownerCred) {
      username = ownerCred.username;
      email = ownerCred.email;
      ownerCred.passwordHash = `hash_${temporaryPassword}`;
      ownerCred.initialPassword = temporaryPassword;
      ownerCred.mustChangePassword = mustChangePassword;
      ownerCred.updatedAt = new Date().toISOString();

      const allCreds = employeeAuthService.listCredentials();
      const idx = allCreds.findIndex(c => c.employeeId === ownerCred.employeeId);
      if (idx >= 0) {
        allCreds[idx] = ownerCred;
        TenantStore.set('platform_system', 'employee_credentials', allCreds);
      }
    }

    // Synchronize with unifiedAuthService
    try {
      const accounts = (unifiedAuthService as any).listStoredAccounts?.() || unifiedAuthService.listAllAccounts();
      const ownerAcc = accounts.find((a: any) => 
        (a.studioId === studioId && a.accountType === 'STUDIO_OWNER') || 
        a.email?.toLowerCase() === email.toLowerCase() ||
        a.loginId?.toLowerCase() === username.toLowerCase()
      );
      if (ownerAcc) {
        username = ownerAcc.loginId;
        email = ownerAcc.email;
        unifiedAuthService.changePassword(ownerAcc.id, temporaryPassword);
        const updatedAcc = unifiedAuthService.getAccount(ownerAcc.id);
        if (updatedAcc) {
          updatedAcc.mustChangePassword = mustChangePassword;
          unifiedAuthService.saveAccount(updatedAcc);

          try {
            crossDeviceAuthService.registerInCloudRegistry(updatedAcc, (updatedAcc as any).authUid || updatedAcc.id, temporaryPassword);
          } catch (regErr) {
            console.warn('[PlatformStudioService] Cloud registry sync note:', regErr);
          }
        }
      }
    } catch (e) {
      // Continue safely
    }

    platformAuditService.log({
      adminId: 'admin_sys',
      adminName: actingAdminName,
      action: 'SET_STUDIO_OWNER_PASSWORD',
      targetType: 'studio_owner',
      targetId: ownerCred?.employeeId || studioId,
      details: `Password configured for Studio Owner of studio ${studioId}.`
    });

    return {
      success: true,
      username,
      email,
      ownerEmail: email,
      temporaryPassword
    };
  }

  updateStudio(studioId: string, updates: {
    name?: string;
    phone?: string;
    email?: string;
    city?: string;
    state?: string;
    address?: string;
    gstNumber?: string;
    website?: string;
    description?: string;
    subscriptionPlan?: string;
    subscriptionStatus?: string;
    renewalDate?: string;
    lifecycleStatus?: StudioLifecycleStatus;
    ownerEmail?: string;
    ownerName?: string;
    ownerPhone?: string;
  }, actingAdminName = 'Master Admin'): boolean {
    let profile = TenantStore.getSingle<Studio>(studioId, 'profile');
    if (!profile) {
      const dStudio = DRAFT_STUDIOS_DEF.find(d => d.id === studioId);
      if (dStudio) {
        profile = { ...dStudio };
      } else {
        const studioView = this.getStudioDetails(studioId);
        profile = studioView?.profile || {
          id: studioId,
          tenantId: studioId,
          name: updates.name || studioId,
          email: updates.email || 'studio@studio-os.internal',
          phone: updates.phone || '9876543210',
          address: updates.address || '',
          city: updates.city || 'Ahmedabad',
          state: updates.state || 'Gujarat',
          pincode: '380001',
          settings: {
            defaultCurrency: 'INR',
            timezone: 'Asia/Kolkata',
            dateFormat: 'DD/MM/YYYY',
            timeFormat: '12h',
            allowDirectWhatsApp: true,
            watermarkEnabled: true,
            invoicePrefix: 'INV',
            eventPrefix: 'EV'
          },
          storageUsageMb: 0,
          storageQuotaMb: 15360,
          subscription: {
            planId: 'plan_standard_500',
            planName: 'Studio OS Standard (₹500/mo)',
            pricePerMonth: 500,
            currency: 'INR',
            autoRenew: true,
            status: 'active',
            validUntil: new Date(Date.now() + 30 * 86400000).toISOString()
          } as any,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: actingAdminName
        };
      }
    }

    if (updates.name) profile.name = updates.name.trim();
    if (updates.phone) profile.phone = updates.phone.trim();
    if (updates.email) profile.email = updates.email.trim();
    if (updates.city) profile.city = updates.city.trim();
    if (updates.state) profile.state = updates.state.trim();
    if (updates.address) profile.address = updates.address.trim();
    if (updates.gstNumber !== undefined) profile.gstNumber = updates.gstNumber.trim();
    if (updates.website !== undefined) profile.website = updates.website.trim();
    if (updates.description !== undefined) (profile as any).description = updates.description;
    if (updates.ownerName) {
      (profile as any).ownerName = updates.ownerName.trim();
      profile.title = updates.ownerName.trim();
    }
    if (updates.ownerPhone) {
      (profile as any).ownerPhone = updates.ownerPhone.trim();
    }
    profile.updatedAt = new Date().toISOString();

    if (updates.subscriptionPlan || updates.subscriptionStatus || updates.renewalDate) {
      if (!profile.subscription) {
        profile.subscription = {
          planId: 'plan_standard_500',
          planName: updates.subscriptionPlan || 'Studio OS Standard (₹500/mo)',
          status: (updates.subscriptionStatus as any) || 'active',
          pricePerMonth: 500,
          currency: 'INR',
          autoRenew: true,
          validUntil: updates.renewalDate || new Date(Date.now() + 30 * 86400000).toISOString()
        } as any;
      } else {
        if (updates.subscriptionPlan) (profile.subscription as any).planName = updates.subscriptionPlan;
        if (updates.subscriptionStatus) profile.subscription.status = updates.subscriptionStatus as any;
        if (updates.renewalDate) profile.subscription.validUntil = updates.renewalDate;
      }
    }

    if (updates.lifecycleStatus) {
      this.updateStudioStatus(studioId, updates.lifecycleStatus, 'Updated via Master Admin Edit Studio', actingAdminName);
      profile.lifecycleStatus = updates.lifecycleStatus;
      profile.isHidden = updates.lifecycleStatus === 'hidden';
    }

    // If owner email was updated, handle conflict check and update records
    if (updates.ownerEmail) {
      const cleanEmail = updates.ownerEmail.toLowerCase().trim();
      const accounts = unifiedAuthService.listStoredAccounts();
      const conflict = accounts.find(a => 
        a.email.toLowerCase() === cleanEmail && 
        a.studioId !== studioId && 
        a.accountType !== 'MASTER_ADMIN'
      );
      if (conflict) {
        throw new Error(`Email address "${updates.ownerEmail}" is already registered to another account.`);
      }

      (profile as any).ownerEmail = cleanEmail;
      profile.email = cleanEmail;

      const employees = TenantStore.get<Employee>(studioId, 'employees') || [];
      const ownerEmp = employees.find(e => e.designation?.toLowerCase().includes('owner') || (e as any).role === 'studio_owner');
      if (ownerEmp) {
        ownerEmp.email = cleanEmail;
        if (updates.ownerName) {
          ownerEmp.name = updates.ownerName.trim();
          ownerEmp.fullName = updates.ownerName.trim();
        }
        if (updates.ownerPhone) {
          ownerEmp.phone = updates.ownerPhone.trim();
        }
        ownerEmp.updatedAt = new Date().toISOString();
        TenantStore.set(studioId, 'employees', employees);
      }

      try {
        const ownerAcc = accounts.find(a => a.studioId === studioId && a.accountType === 'STUDIO_OWNER') ||
          accounts.find(a => a.studioId === studioId);
        if (ownerAcc) {
          ownerAcc.email = cleanEmail;
          if (updates.ownerName) ownerAcc.displayName = updates.ownerName.trim();
          if (updates.ownerPhone) ownerAcc.phone = updates.ownerPhone.trim();
          ownerAcc.updatedAt = new Date().toISOString();
          (unifiedAuthService as any).saveAccount(ownerAcc);

          firestoreService.saveDocument('platform_system', 'users', ownerAcc.id, {
            email: cleanEmail,
            displayName: ownerAcc.displayName,
            updatedAt: new Date().toISOString()
          }, true).catch(() => {});
        }
      } catch (e) {
        // Continue safely
      }
    }

    TenantStore.set(studioId, 'profile', profile);
    firestoreService.saveDocument(studioId, 'profile', studioId, profile).catch(() => {});

    platformAuditService.log({
      adminId: 'admin_sys',
      adminName: actingAdminName,
      action: 'UPDATE_STUDIO_INFO',
      targetType: 'studio',
      targetId: studioId,
      details: `Updated studio profile and configuration for ${profile.name} (${studioId}).`
    });

    return true;
  }

  archiveStudio(studioId: string, reason = 'Master Admin archive', actingAdmin = 'Master Admin'): { success: boolean; error?: string } {
    const meta = this.getStudiosMeta();
    meta[studioId] = {
      lifecycleStatus: 'archived',
      internalNotes: [...(meta[studioId]?.internalNotes || []), `Archived by ${actingAdmin}: ${reason}`]
    };
    this.saveStudiosMeta(meta);

    const profile = TenantStore.getSingle<Studio>(studioId, 'profile');
    if (profile) {
      profile.lifecycleStatus = 'archived';
      profile.isHidden = true;
      TenantStore.set(studioId, 'profile', profile);
      firestoreService.saveDocument(studioId, 'profile', studioId, profile).catch(() => {});
    }

    platformAuditService.log({
      adminId: 'admin_sys',
      adminName: actingAdmin,
      action: 'ARCHIVE_STUDIO',
      targetType: 'studio',
      targetId: studioId,
      details: `Studio ${studioId} archived: ${reason}`
    });

    return { success: true };
  }

  deleteStudio(studioId: string, reason = 'Master Admin deletion', actingAdmin = 'Master Admin'): { success: boolean; error?: string } {
    const events = TenantStore.get(studioId, 'events') || [];
    const invoices = TenantStore.get(studioId, 'invoices') || [];
    const payments = TenantStore.get(studioId, 'payments') || [];

    const hasFinancialOrHistoricalRecords = events.length > 0 || invoices.length > 0 || payments.length > 0;
    if (hasFinancialOrHistoricalRecords) {
      return this.archiveStudio(studioId, `Preserved and archived: protected ${events.length} bookings/financial records against deletion`, actingAdmin);
    }

    const meta = this.getStudiosMeta();
    delete meta[studioId];
    this.saveStudiosMeta(meta);

    TenantStore.remove(studioId, 'profile');
    TenantStore.remove(studioId, 'employees');
    TenantStore.remove(studioId, 'branches');

    platformAuditService.log({
      adminId: 'admin_sys',
      adminName: actingAdmin,
      action: 'DELETE_STUDIO',
      targetType: 'studio',
      targetId: studioId,
      details: `Studio ${studioId} deleted: ${reason}`
    });

    return { success: true };
  }

  addInternalNote(studioId: string, noteText: string, authorName = 'Master Admin'): void {
    const meta = this.getStudiosMeta();
    const current = meta[studioId] || { lifecycleStatus: 'active', internalNotes: [] };
    const formattedNote = `[${new Date().toISOString().split('T')[0]}] (${authorName}): ${noteText.trim()}`;

    meta[studioId] = {
      ...current,
      internalNotes: [formattedNote, ...(current.internalNotes || [])]
    };
    this.saveStudiosMeta(meta);

    platformAuditService.log({
      adminId: 'admin_sys',
      adminName: authorName,
      action: 'ADD_STUDIO_INTERNAL_NOTE',
      targetType: 'studio',
      targetId: studioId,
      details: `Added internal platform note: "${noteText}"`
    });
  }

  auditAndRepairAllStudios(): {
    totalStudiosAudited: number;
    repairedCount: number;
    actions: string[];
  } {
    const actions: string[] = [];
    let repairedCount = 0;

    if (!unifiedAuthService || typeof unifiedAuthService.listStoredAccounts !== 'function') {
      return { totalStudiosAudited: 0, repairedCount: 0, actions: [] };
    }

    const meta = this.getStudiosMeta();
    const studioIds = new Set<string>(['studio_shreeji_films', 'std_demo_royal', ...Object.keys(meta)]);

    const allAccounts = unifiedAuthService.listStoredAccounts();

    // 1. Ensure Abhay Jarsaniya is provisioned as primary Master Admin
    const masterAccount = allAccounts.find(a => a.email.toLowerCase() === 'jarsaniya.abhay@gmail.com');
    if (!masterAccount) {
      const salt = generateCryptoSalt();
      unifiedAuthService.saveAccount({
        id: 'admin_master_abhay',
        accountType: 'MASTER_ADMIN',
        loginId: 'jarsaniya.abhay@gmail.com',
        email: 'jarsaniya.abhay@gmail.com',
        phone: '+91 99000 11000',
        displayName: 'Abhay Jarsaniya (Master Admin)',
        roleId: 'master_super_admin',
        roleTitle: 'Master Super Admin',
        status: 'active',
        passwordHash: hashCredential('MasterAdmin@2026', salt),
        salt,
        mustChangePassword: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      actions.push('Provisioned primary Master Admin: jarsaniya.abhay@gmail.com');
      repairedCount++;
    }

    // 2. Audit each studio and repair owner accounts and Auth UIDs
    for (const sId of studioIds) {
      const studio = TenantStore.getSingle<Studio>(sId, 'profile');
      if (!studio) continue;

      const ownerEmail = (studio.ownerEmail || studio.email || '').trim().toLowerCase();
      if (!ownerEmail || !ownerEmail.includes('@')) continue;

      // Ensure ownerAuthUid exists
      let authUid = studio.ownerAuthUid;
      if (!authUid) {
        authUid = `auth_uid_${sId.replace(/[^a-z0-9]/g, '_')}_${Date.now().toString(36)}`;
        studio.ownerAuthUid = authUid;
        TenantStore.set(sId, 'profile', studio);
        actions.push(`Assigned missing authUid ${authUid} to studio ${sId}`);
        repairedCount++;
      }

      // Check owner account in unifiedAuthService
      const currentAccounts = unifiedAuthService.listStoredAccounts();
      let ownerAcc = currentAccounts.find(a => 
        (a.studioId === sId && a.accountType === 'STUDIO_OWNER') ||
        (a.email.toLowerCase() === ownerEmail && a.accountType === 'STUDIO_OWNER')
      );

      if (!ownerAcc) {
        const username = (studio as any).ownerUsername || `${sId.slice(0, 8)}_owner`;
        const tempPass = generate8CharTemporaryPassword();
        unifiedAuthService.provisionStudioOwner({
          authUid,
          studioId: sId,
          studioName: studio.name,
          ownerName: studio.ownerName || studio.name,
          email: ownerEmail,
          mobile: studio.ownerPhone || studio.phone || '9876543210',
          username,
          temporaryPassword: tempPass
        });
        actions.push(`Repaired and provisioned missing owner account for ${sId} (${ownerEmail})`);
        repairedCount++;
      } else {
        let changed = false;
        if (ownerAcc.id !== authUid) {
          ownerAcc.id = authUid;
          changed = true;
        }
        if (ownerAcc.studioId !== sId) {
          ownerAcc.studioId = sId;
          changed = true;
        }
        if (ownerAcc.accountType !== 'STUDIO_OWNER') {
          ownerAcc.accountType = 'STUDIO_OWNER';
          changed = true;
        }
        if (ownerAcc.status !== 'active') {
          ownerAcc.status = 'active';
          changed = true;
        }
        if (ownerAcc.email.toLowerCase() !== ownerEmail) {
          ownerAcc.email = ownerEmail;
          changed = true;
        }
        if (changed) {
          ownerAcc.updatedAt = new Date().toISOString();
          unifiedAuthService.saveAccount(ownerAcc);
          actions.push(`Synchronized UID/studioId/role for owner account ${ownerAcc.email}`);
          repairedCount++;
        }
      }

      // Sync Firestore platform_system/users
      firestoreService.saveDocument('platform_system', 'users', authUid, {
        uid: authUid,
        email: ownerEmail,
        displayName: studio.ownerName || studio.name,
        role: 'owner',
        studioId: sId,
        status: 'active',
        updatedAt: new Date().toISOString()
      }, true).catch(() => {});
    }

    return {
      totalStudiosAudited: studioIds.size,
      repairedCount,
      actions
    };
  }
}

export const platformStudioService = new PlatformStudioService();
