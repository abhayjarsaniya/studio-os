import { PlatformSubscriptionPlan, PlatformStudioSubscription, PlatformStudioSubscriptionSchema } from '../types/schema';
import { TenantStore } from './tenantStore';

export const DEFAULT_PLATFORM_PLAN: PlatformSubscriptionPlan = {
  id: 'plan_standard_500',
  name: 'Studio OS Standard',
  pricePerMonth: 500,
  currency: 'INR',
  billingCycle: 'monthly',
  employeeLimit: 25,
  storageAllowanceGb: 500,
  features: [
    'Multi-Tenant Photography ERP',
    'Customer CRM & WhatsApp Click-to-Chat',
    'Photography Production Pipelines & Task Engine',
    'Quotation & Customer Invoicing with PDF Generator',
    'Expense & Confidential Payroll Management'
  ],
  isActive: true
};

export class PlatformSubscriptionService {
  private readonly PLATFORM_STORE_KEY = 'platform_studio_subscriptions';

  getPlan(): PlatformSubscriptionPlan {
    return { ...DEFAULT_PLATFORM_PLAN };
  }

  listStudioSubscriptions(): PlatformStudioSubscription[] {
    // Stored globally in TenantStore under system key or platform scope
    let subscriptions = TenantStore.get<PlatformStudioSubscription>('platform_system', this.PLATFORM_STORE_KEY);
    if (!subscriptions || subscriptions.length === 0) {
      // Seed initial demo studio subscription
      const initial: PlatformStudioSubscription = {
        id: 'sub_studio_royal_001',
        studioId: 'studio_royal_001',
        studioName: 'Royal Weddings Studio',
        planId: DEFAULT_PLATFORM_PLAN.id,
        planName: DEFAULT_PLATFORM_PLAN.name,
        pricePerMonth: 500,
        billingCycle: 'monthly',
        startDate: '2026-01-01',
        renewalDate: '2026-12-31',
        status: 'active',
        paymentStatus: 'Paid',
        autoRenew: true,
        lastPaymentAmount: 500,
        lastPaymentDate: '2026-04-01',
        gracePeriodDays: 7,
        billingHistory: [],
        createdAt: '2026-01-01T00:00:00Z'
      };
      subscriptions = [initial];
      TenantStore.set('platform_system', this.PLATFORM_STORE_KEY, subscriptions);
    }
    return subscriptions;
  }

  listAllSubscriptions(): PlatformStudioSubscription[] {
    return this.listStudioSubscriptions();
  }

  getStudioSubscription(studioId: string): PlatformStudioSubscription | null {
    if (!studioId) return null;
    const subs = this.listStudioSubscriptions();
    return subs.find(s => s.studioId === studioId) || null;
  }

  registerStudioSubscription(studioId: string, studioName: string, billingCycle: 'monthly' | 'yearly' = 'monthly'): PlatformStudioSubscription {
    if (!studioId) throw new Error('[platformSubscriptionService.registerStudioSubscription]: studioId is required');
    const subs = this.listStudioSubscriptions();
    const existing = subs.find(s => s.studioId === studioId);
    if (existing) return existing;

    const today = new Date();
    const renewal = new Date(today);
    if (billingCycle === 'monthly') {
      renewal.setMonth(renewal.getMonth() + 1);
    } else {
      renewal.setFullYear(renewal.getFullYear() + 1);
    }

    const price = billingCycle === 'monthly' ? 500 : 500 * 12;

    const newSub: PlatformStudioSubscription = {
      id: `sub_${studioId}_${Date.now()}`,
      studioId,
      studioName: studioName || studioId,
      planId: DEFAULT_PLATFORM_PLAN.id,
      planName: DEFAULT_PLATFORM_PLAN.name,
      pricePerMonth: 500,
      billingCycle,
      startDate: today.toISOString().split('T')[0],
      renewalDate: renewal.toISOString().split('T')[0],
      status: 'active',
      paymentStatus: 'Paid',
      autoRenew: true,
      lastPaymentAmount: price,
      lastPaymentDate: today.toISOString().split('T')[0],
      gracePeriodDays: 7,
      billingHistory: [],
      createdAt: new Date().toISOString()
    };

    PlatformStudioSubscriptionSchema.parse(newSub);

    TenantStore.set('platform_system', this.PLATFORM_STORE_KEY, [newSub, ...subs]);
    return newSub;
  }

  renewStudioSubscription(studioId: string): PlatformStudioSubscription {
    if (!studioId) throw new Error('[platformSubscriptionService.renewStudioSubscription]: studioId is required');
    const subs = this.listStudioSubscriptions();
    const existingIndex = subs.findIndex(s => s.studioId === studioId);
    if (existingIndex < 0) {
      throw new Error(`[platformSubscriptionService.renewStudioSubscription]: Subscription for ${studioId} not found`);
    }

    const sub = subs[existingIndex];
    const currentRenewal = new Date(sub.renewalDate || new Date());
    if (sub.billingCycle === 'monthly') {
      currentRenewal.setMonth(currentRenewal.getMonth() + 1);
    } else {
      currentRenewal.setFullYear(currentRenewal.getFullYear() + 1);
    }

    const updated: PlatformStudioSubscription = {
      ...sub,
      status: 'active',
      paymentStatus: 'Paid',
      lastPaymentDate: new Date().toISOString().split('T')[0],
      renewalDate: currentRenewal.toISOString().split('T')[0]
    };

    subs[existingIndex] = updated;
    TenantStore.set('platform_system', this.PLATFORM_STORE_KEY, subs);
    return updated;
  }

  cancelStudioSubscription(studioId: string): PlatformStudioSubscription {
    if (!studioId) throw new Error('[platformSubscriptionService.cancelStudioSubscription]: studioId is required');
    const subs = this.listStudioSubscriptions();
    const existingIndex = subs.findIndex(s => s.studioId === studioId);
    if (existingIndex < 0) {
      throw new Error(`[platformSubscriptionService.cancelStudioSubscription]: Subscription for ${studioId} not found`);
    }

    const updated: PlatformStudioSubscription = {
      ...subs[existingIndex],
      status: 'cancelled',
      autoRenew: false
    };

    subs[existingIndex] = updated;
    TenantStore.set('platform_system', this.PLATFORM_STORE_KEY, subs);
    return updated;
  }

  getPlatformMetrics(): {
    totalStudios: number;
    activeStudios: number;
    expiredStudios: number;
    suspendedStudios: number;
    mrr: number;
  } {
    const subs = this.listStudioSubscriptions();
    const totalStudios = subs.length;
    const activeSubs = subs.filter(s => s.status.toLowerCase() === 'active');
    const expiredSubs = subs.filter(s => s.status.toLowerCase() === 'expired');
    const suspendedSubs = subs.filter(s => s.status.toLowerCase() === 'suspended');

    // SaaS MRR = active studios * ₹500/month
    const mrr = activeSubs.length * 500;

    return {
      totalStudios,
      activeStudios: activeSubs.length,
      expiredStudios: expiredSubs.length,
      suspendedStudios: suspendedSubs.length,
      mrr
    };
  }
}

export const platformSubscriptionService = new PlatformSubscriptionService();
