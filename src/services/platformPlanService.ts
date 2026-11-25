import { TenantStore } from './tenantStore';
import { PlatformPlan, PlatformPlanSchema } from '../types/schema';
import { platformAuditService } from './platformAuditService';
import { db, isAuthBypassed } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

function syncPlanToFirestore(plan: PlatformPlan): void {
  const isTestEnv = typeof process !== 'undefined' && Boolean(process.env?.VITEST || process.env?.NODE_ENV === 'test');
  if (isTestEnv || !db || isAuthBypassed) return;
  setDoc(doc(db, 'billingPlans', plan.id), {
    ...plan,
    priceYearly: plan.priceAnnual,
    priceQuarterly: plan.priceQuarterly ?? Math.round(plan.priceMonthly * 3 * 0.9),
    setupFee: plan.setupFee ?? 0,
    renewalPolicy: plan.renewalPolicy ?? 'manual_or_autopay',
    updatedAt: new Date().toISOString()
  }, { merge: true }).catch(() => {});
}

export const INITIAL_STANDARD_PLAN: PlatformPlan = {
  id: 'plan_standard_500',
  name: 'Studio OS Standard',
  version: 1,
  priceMonthly: 500, // ₹500/month per studio (not per employee!)
  priceQuarterly: 1350,
  priceAnnual: 5000, // ₹5000/year (2 months savings)
  setupFee: 0,
  renewalPolicy: 'manual_or_autopay',
  currency: 'INR',
  billingCycle: 'monthly',
  employeeLimit: 25,
  branchLimit: 3,
  storageGb: 50,
  features: [
    'events',
    'sub_events',
    'crm_customers',
    'whatsapp_chat',
    'tasks',
    'photography_workflows',
    'team_management',
    'attendance',
    'leave_management',
    'payroll',
    'finance',
    'pdf_generator',
    'analytics',
    'reports'
  ],
  trialDays: 14,
  gracePeriodDays: 7,
  description: 'Complete photography studio management ERP with CRM, shoots, workflows, and billing.',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z'
};

export const INITIAL_PREVIEW_PLANS: PlatformPlan[] = [
  INITIAL_STANDARD_PLAN,
  {
    id: 'plan_professional_1200',
    name: 'Studio OS Professional',
    version: 1,
    priceMonthly: 1200,
    priceAnnual: 12000,
    currency: 'INR',
    billingCycle: 'monthly',
    employeeLimit: 60,
    branchLimit: 10,
    storageGb: 200,
    features: [
      'events', 'sub_events', 'crm_customers', 'whatsapp_chat',
      'tasks', 'photography_workflows', 'team_management',
      'attendance', 'leave_management', 'payroll', 'finance',
      'pdf_generator', 'analytics', 'reports', 'equipment',
      'custom_reports', 'advanced_exports'
    ],
    trialDays: 14,
    gracePeriodDays: 7,
    description: 'Advanced studio operations for growing multi-branch photography agencies.',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z'
  }
];

export class PlatformPlanService {
  private readonly STORE_KEY = 'platform_plans';

  listPlans(): PlatformPlan[] {
    let plans = TenantStore.get<PlatformPlan>('platform_system', this.STORE_KEY);
    if (!plans || plans.length === 0) {
      plans = [...INITIAL_PREVIEW_PLANS];
      TenantStore.set('platform_system', this.STORE_KEY, plans);
    }
    return plans;
  }

  getPlan(id: string): PlatformPlan | undefined {
    return this.listPlans().find(p => p.id === id);
  }

  getStandardPlan(): PlatformPlan {
    return this.getPlan('plan_standard_500') || INITIAL_STANDARD_PLAN;
  }

  createPlan(data: Omit<PlatformPlan, 'id' | 'version' | 'createdAt' | 'updatedAt'>, actingAdminName = 'Super Admin'): PlatformPlan {
    const id = `plan_${data.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
    const newPlan: PlatformPlan = {
      ...data,
      id,
      version: 1,
      createdAt: new Date().toISOString()
    };

    PlatformPlanSchema.parse(newPlan);

    const plans = this.listPlans();
    TenantStore.set('platform_system', this.STORE_KEY, [...plans, newPlan]);
    syncPlanToFirestore(newPlan);

    platformAuditService.log({
      adminId: 'admin_sys',
      adminName: actingAdminName,
      action: 'CREATE_PLAN',
      targetType: 'platform_plan',
      targetId: id,
      details: `Created new SaaS plan "${newPlan.name}" (Monthly: ₹${newPlan.priceMonthly}, Annual: ₹${newPlan.priceAnnual})`
    });

    return newPlan;
  }

  updatePlan(
    id: string,
    updates: Partial<Omit<PlatformPlan, 'id' | 'createdAt'>>,
    actingAdminName = 'Super Admin'
  ): PlatformPlan {
    const plans = this.listPlans();
    const index = plans.findIndex(p => p.id === id);
    if (index === -1) throw new Error(`Plan "${id}" not found`);

    const existing = plans[index];
    // Plan versioning: increment version when pricing, limits, or features change
    const hasBreakingChanges = 
      (updates.priceMonthly !== undefined && updates.priceMonthly !== existing.priceMonthly) ||
      (updates.priceAnnual !== undefined && updates.priceAnnual !== existing.priceAnnual) ||
      (updates.employeeLimit !== undefined && updates.employeeLimit !== existing.employeeLimit) ||
      (updates.features !== undefined);

    const updated: PlatformPlan = {
      ...existing,
      ...updates,
      version: hasBreakingChanges ? existing.version + 1 : existing.version,
      updatedAt: new Date().toISOString()
    };

    PlatformPlanSchema.parse(updated);

    plans[index] = updated;
    TenantStore.set('platform_system', this.STORE_KEY, plans);
    syncPlanToFirestore(updated);

    platformAuditService.log({
      adminId: 'admin_sys',
      adminName: actingAdminName,
      action: 'UPDATE_PLAN',
      targetType: 'platform_plan',
      targetId: id,
      details: `Updated plan "${updated.name}" to version ${updated.version} (Price: ₹${updated.priceMonthly}/mo). Existing subscribers retain agreed pricing.`
    });

    return updated;
  }

  duplicatePlan(id: string, newName?: string, actingAdminName = 'Super Admin'): PlatformPlan {
    const plan = this.getPlan(id);
    if (!plan) throw new Error(`Plan "${id}" not found`);

    const copyData: Omit<PlatformPlan, 'id' | 'version' | 'createdAt' | 'updatedAt'> = {
      ...plan,
      name: newName || `${plan.name} (Copy)`
    };

    return this.createPlan(copyData, actingAdminName);
  }

  togglePlanActive(id: string, isActive: boolean, actingAdminName = 'Super Admin'): PlatformPlan {
    return this.updatePlan(id, { isActive }, actingAdminName);
  }
}

export const platformPlanService = new PlatformPlanService();
