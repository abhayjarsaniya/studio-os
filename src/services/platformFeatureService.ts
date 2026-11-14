import { TenantStore } from './tenantStore';
import { FeatureCatalogItem, FeatureCatalogItemSchema } from '../types/schema';
import { platformPlanService } from './platformPlanService';
import { platformSubscriptionManager } from './platformSubscriptionManager';
import { platformAuditService } from './platformAuditService';

export const DEFAULT_FEATURE_CATALOG: FeatureCatalogItem[] = [
  { key: 'events', name: 'Main Events & Shoots', category: 'Operations', description: 'Schedule and manage photography & videography bookings', isGlobalEnabled: true },
  { key: 'sub_events', name: 'Parent-Child Sub-Events', category: 'Operations', description: 'Multi-day celebrations: Haldi, Mehndi, Sangeet, Wedding, Reception', isGlobalEnabled: true },
  { key: 'crm_customers', name: 'Customer Relationship CRM', category: 'CRM', description: 'Customer directory, lead pipeline, interactions, and VIP segmentation', isGlobalEnabled: true },
  { key: 'whatsapp_chat', name: 'WhatsApp Click-to-Chat', category: 'CRM', description: 'Pre-formatted templated WhatsApp notifications & links', isGlobalEnabled: true },
  { key: 'tasks', name: 'Task Management Engine', category: 'Production', description: 'Checklists, task assignments, due dates and reviewer approval', isGlobalEnabled: true },
  { key: 'photography_workflows', name: '10-Stage Production Pipeline', category: 'Production', description: 'Shoot prep, backup, culling, editing, album design, QC and delivery', isGlobalEnabled: true },
  { key: 'team_management', name: 'Crew & Team Directory', category: 'HR', description: 'Photographer, videographer, and editor team rosters', isGlobalEnabled: true },
  { key: 'attendance', name: 'Attendance & Check-In', category: 'HR', description: 'Daily attendance marking and sub-event shoot check-in', isGlobalEnabled: true },
  { key: 'leave_management', name: 'Staff Leave System', category: 'HR', description: 'Leave requests, category balances, and manager approval', isGlobalEnabled: true },
  { key: 'payroll', name: 'Confidential Payroll', category: 'Finance', description: 'Monthly salary runs, deductions, allowances, and pay slips', isGlobalEnabled: true },
  { key: 'finance', name: 'Billing & Invoicing', category: 'Finance', description: 'Quotations, tax invoices, customer payments, and studio expenses', isGlobalEnabled: true },
  { key: 'pdf_generator', name: 'Studio-Branded PDF Engine', category: 'Finance', description: 'Instant professional print-ready PDFs for quotes and invoices', isGlobalEnabled: true },
  { key: 'analytics', name: 'Business Intelligence & KPIs', category: 'Analytics', description: '16 core studio KPIs, cash flow charts, and funnel bottlenecks', isGlobalEnabled: true },
  { key: 'reports', name: 'Report Center & Safe Exports', category: 'Analytics', description: 'Formula-injection-safe CSV export across 7 standard categories', isGlobalEnabled: true },
  { key: 'equipment', name: 'Gear & Equipment Register', category: 'Inventory', description: 'Camera bodies, lenses, drones, lighting and maintenance logs', isGlobalEnabled: true },
  { key: 'custom_reports', name: 'Custom Report Builder', category: 'Analytics', description: 'Multi-dimensional custom report configuration and scheduling', isGlobalEnabled: true },
  { key: 'advanced_exports', name: 'Advanced Data Exports', category: 'Operations', description: 'Bulk JSON and CSV archival exports', isGlobalEnabled: true },
  { key: 'branches', name: 'Multi-Branch Management', category: 'Operations', description: 'Support for multiple studio locations, desks, and branch filters', isGlobalEnabled: true },
  { key: 'document_storage', name: 'Cloud File Attachments', category: 'Storage', description: 'Secure storage quota for project briefs, moodboards and RAW previews', isGlobalEnabled: true },
  { key: 'client_review_portal', name: 'Client Review & Approval', category: 'Client Portal', description: 'Direct customer portal for album selection and approval', isGlobalEnabled: true }
];

export class PlatformFeatureService {
  private readonly STORE_KEY = 'platform_features';

  listFeatures(): FeatureCatalogItem[] {
    let features = TenantStore.get<FeatureCatalogItem>('platform_system', this.STORE_KEY);
    if (!features || features.length === 0) {
      features = [...DEFAULT_FEATURE_CATALOG];
      TenantStore.set('platform_system', this.STORE_KEY, features);
    }
    return features;
  }

  toggleGlobalFeature(key: string, isGlobalEnabled: boolean, actingAdminName = 'Super Admin'): FeatureCatalogItem {
    const features = this.listFeatures();
    const index = features.findIndex(f => f.key === key);
    if (index === -1) throw new Error(`Feature "${key}" not found in catalog`);

    const updated: FeatureCatalogItem = {
      ...features[index],
      isGlobalEnabled
    };

    features[index] = updated;
    TenantStore.set('platform_system', this.STORE_KEY, features);

    platformAuditService.log({
      adminId: 'admin_sys',
      adminName: actingAdminName,
      action: 'TOGGLE_GLOBAL_FEATURE',
      targetType: 'feature_catalog',
      targetId: key,
      details: `Set feature "${updated.name}" globally ${isGlobalEnabled ? 'ENABLED' : 'DISABLED'}`
    });

    return updated;
  }

  /**
   * Compatibility alias for feature checking
   */
  checkStudioFeatureAccess(studioId: string, featureKey: string): { isAllowed: boolean; reason?: string } {
    const res = this.canStudioUseFeature(studioId, featureKey);
    return { isAllowed: res.allowed, reason: res.reason };
  }

  /**
   * Compatibility alias for studio quota checking
   */
  checkStudioQuota(studioId: string, limitType: 'employees' | 'branches' | 'storage'): { allowed: boolean; current: number; max: number; reason?: string } {
    const res = this.checkUsageLimit(studioId, limitType);
    return { allowed: res.withinLimit, current: res.current, max: res.max, reason: res.reason };
  }

  /**
   * Check if a studio's plan includes a specific feature and if it's globally active.
   * Note: This is separate from user RBAC permissions!
   */
  canStudioUseFeature(studioId: string, featureKey: string): { allowed: boolean; reason?: string } {
    // Check global kill switch
    const features = this.listFeatures();
    const feature = features.find(f => f.key === featureKey);
    if (feature && !feature.isGlobalEnabled) {
      return { allowed: false, reason: `Feature "${feature.name}" is currently disabled across the platform for maintenance.` };
    }

    // Exempt demo studios
    if (studioId === 'studio_royal_001' || studioId === 'studio_creative_002') {
      return { allowed: true };
    }

    const sub = platformSubscriptionManager.getSubscription(studioId);
    if (!sub) {
      return { allowed: false, reason: 'No active subscription found.' };
    }

    const plan = platformPlanService.getPlan(sub.planId);
    if (!plan) {
      return { allowed: false, reason: 'Plan not found.' };
    }

    const hasFeature = plan.features.includes(featureKey);
    if (!hasFeature) {
      return { 
        allowed: false, 
        reason: `Feature "${feature?.name || featureKey}" is not included in your ${plan.name} plan. Upgrade plan to access.` 
      };
    }

    return { allowed: true };
  }

  /**
   * Validate if studio has reached quota limits (e.g. employee count limit)
   */
  checkUsageLimit(studioId: string, limitType: 'employees' | 'branches' | 'storage'): { withinLimit: boolean; current: number; max: number; reason?: string } {
    if (studioId === 'studio_royal_001' || studioId === 'studio_creative_002') {
      return { withinLimit: true, current: 5, max: 999 };
    }

    const sub = platformSubscriptionManager.getSubscription(studioId);
    const plan = platformPlanService.getPlan(sub?.planId || 'plan_standard_500');

    if (limitType === 'employees') {
      const employees = TenantStore.get(studioId, 'employees') || [];
      const current = employees.length;
      const max = plan?.employeeLimit || 25;
      return {
        withinLimit: current < max,
        current,
        max,
        reason: current >= max ? `Studio has reached the maximum employee limit (${max}) for ${plan?.name}.` : undefined
      };
    }

    if (limitType === 'branches') {
      const branches = TenantStore.get(studioId, 'branches') || [];
      const current = branches.length;
      const max = plan?.branchLimit || 3;
      return {
        withinLimit: current < max,
        current,
        max,
        reason: current >= max ? `Studio has reached the maximum branch limit (${max}) for ${plan?.name}.` : undefined
      };
    }

    return { withinLimit: true, current: 0, max: 100 };
  }
}

export const platformFeatureService = new PlatformFeatureService();
