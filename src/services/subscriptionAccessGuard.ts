import { platformSubscriptionManager } from './platformSubscriptionManager';
import { platformPlanService } from './platformPlanService';
import { SaaSSubscriptionStatus } from '../types/schema';

export interface StudioAccessEvaluation {
  isAllowed: boolean;
  allowed: boolean; // Alias for isAllowed
  isRestricted: boolean;
  restrictedMode: 'none' | 'billing_only';
  status: SaaSSubscriptionStatus;
  warningMessage?: string;
  blockReason?: string;
  redirectRoute?: string;
  gracePeriodEndsAt?: string;
  canAccessFeature: (featureKey: string) => boolean;
}

export class SubscriptionAccessGuard {
  // Dedicated demo studios for developer preview are never locked out
  private readonly DEV_DEMO_STUDIO_IDS = new Set(['studio_royal_001', 'studio_creative_002']);

  /**
   * Evaluate studio access against SaaS subscription and lifecycle status
   */
  checkStudioAccess(studioId: string, currentRoute?: string): StudioAccessEvaluation {
    // 1. Exemption for development preview studios
    if (this.DEV_DEMO_STUDIO_IDS.has(studioId)) {
      return {
        isAllowed: true,
        allowed: true,
        isRestricted: false,
        restrictedMode: 'none',
        status: 'active',
        canAccessFeature: () => true
      };
    }

    const sub = platformSubscriptionManager.getSubscription(studioId);

    // If no subscription recorded, treat as pending activation
    if (!sub) {
      const isRemediationRoute = currentRoute?.includes('/billing') || currentRoute?.includes('/support');
      return {
        isAllowed: isRemediationRoute || false,
        allowed: isRemediationRoute || false,
        isRestricted: true,
        restrictedMode: 'billing_only',
        status: 'expired',
        redirectRoute: isRemediationRoute ? undefined : '/app/billing',
        blockReason: 'No active SaaS subscription found for this studio.',
        canAccessFeature: () => false
      };
    }

    const plan = platformPlanService.getPlan(sub.planId);
    const planFeatures = new Set(plan ? plan.features : ['events', 'crm_customers', 'tasks']);

    const canAccessFeature = (key: string) => {
      return planFeatures.has(key);
    };

    const todayStr = new Date().toISOString().split('T')[0];

    switch (sub.status) {
      case 'active':
        return {
          isAllowed: true,
          allowed: true,
          isRestricted: false,
          restrictedMode: 'none',
          status: 'active',
          canAccessFeature
        };

      case 'trial': {
        const isExpired = sub.trialEndsAt && sub.trialEndsAt < todayStr;
        if (isExpired) {
          const isRemediationRoute = currentRoute?.includes('/billing') || currentRoute?.includes('/support');
          return {
            isAllowed: isRemediationRoute || false,
            allowed: isRemediationRoute || false,
            isRestricted: true,
            restrictedMode: 'billing_only',
            status: 'expired',
            redirectRoute: isRemediationRoute ? undefined : '/app/billing',
            blockReason: 'Your free trial has ended. Please subscribe to Studio OS Standard (₹500/mo) to continue full operations.',
            canAccessFeature: () => false
          };
        }
        return {
          isAllowed: true,
          allowed: true,
          isRestricted: false,
          restrictedMode: 'none',
          status: 'trial',
          warningMessage: sub.trialEndsAt ? `Studio OS Trial active until ${sub.trialEndsAt}.` : undefined,
          canAccessFeature
        };
      }

      case 'past_due':
      case 'payment_failed':
        return {
          isAllowed: true,
          allowed: true,
          isRestricted: false,
          restrictedMode: 'none',
          status: sub.status,
          warningMessage: 'Subscription payment failed or is past due. Please complete payment in Settings → Subscription & Billing to avoid service interruption.',
          redirectRoute: '/app/settings',
          canAccessFeature
        };

      case 'grace_period':
        return {
          isAllowed: true,
          allowed: true,
          isRestricted: false,
          restrictedMode: 'none',
          status: 'grace_period',
          warningMessage: `Studio is in a grace period until ${sub.gracePeriodEndsAt || 'soon'}. Service will suspend if payment is not completed.`,
          gracePeriodEndsAt: sub.gracePeriodEndsAt,
          canAccessFeature
        };

      case 'payment_pending':
        return {
          isAllowed: true,
          allowed: true,
          isRestricted: false,
          restrictedMode: 'none',
          status: 'payment_pending',
          warningMessage: 'Payment verification is pending.',
          canAccessFeature
        };

      case 'suspended': {
        const isRemediationRoute = currentRoute?.includes('/billing') || currentRoute?.includes('/support');
        return {
          isAllowed: isRemediationRoute || false,
          allowed: isRemediationRoute || false,
          isRestricted: true,
          restrictedMode: 'billing_only',
          status: 'suspended',
          redirectRoute: isRemediationRoute ? undefined : '/app/billing',
          blockReason: 'Studio operations are currently suspended due to billing or policy action. All studio data is preserved. Access is restricted to billing and support.',
          canAccessFeature: () => false
        };
      }

      case 'cancelled':
      case 'expired':
      default: {
        const isRemediationRoute = currentRoute?.includes('/billing') || currentRoute?.includes('/support');
        return {
          isAllowed: isRemediationRoute || false,
          allowed: isRemediationRoute || false,
          isRestricted: true,
          restrictedMode: 'billing_only',
          status: sub.status,
          redirectRoute: isRemediationRoute ? undefined : '/app/billing',
          blockReason: 'SaaS subscription is expired or cancelled. Data is safely archived. Renew subscription to resume full access.',
          canAccessFeature: () => false
        };
      }
    }
  }
}

export const subscriptionAccessGuard = new SubscriptionAccessGuard();
