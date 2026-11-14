import { PlatformSaaSAnalytics, PlatformStudioSubscription } from '../types/schema';
import { platformSubscriptionService } from './platformSubscriptionService';

export class PlatformAnalyticsService {
  /**
   * Calculate Platform-Level SaaS Metrics (Super Admin Only)
   * Strictly isolated from individual tenant photography income.
   */
  getPlatformSaaSAnalytics(): PlatformSaaSAnalytics {
    const subscriptions = platformSubscriptionService.listAllSubscriptions();
    
    const totalStudios = subscriptions.length;
    const activeSubs = subscriptions.filter(s => s.status === 'active' || s.status === 'trial');
    const inactiveSubs = subscriptions.filter(s => s.status === 'suspended' || s.status === 'cancelled');

    // SaaS monthly price: ₹500/month per studio
    const monthlyRecurringRevenue = activeSubs.reduce((sum, s) => {
      return sum + (s.pricePerMonth || 500);
    }, 0);

    const annualizedRunRate = monthlyRecurringRevenue * 12;

    const churnCount = subscriptions.filter(s => s.status === 'cancelled').length;
    const churnRate = totalStudios > 0 ? Math.round((churnCount / totalStudios) * 100) : 0;
    const renewalRate = totalStudios > 0 ? 100 - churnRate : 100;

    // Renewals due in next 30 days
    const now = new Date();
    const thirtyDaysAhead = new Date(now.getTime() + 30 * 86400000).toISOString().split('T')[0];
    const todayStr = now.toISOString().split('T')[0];

    const studiosDueForRenewalNext30Days = subscriptions.filter(s => {
      const renDate = s.renewalDate || (s as any).validUntil || '';
      return renDate >= todayStr && renDate <= thirtyDaysAhead;
    }).length;

    // Plan breakdown
    const planDistribution: Record<string, number> = {};
    subscriptions.forEach(s => {
      const plan = s.planName || 'Studio OS Monthly';
      planDistribution[plan] = (planDistribution[plan] || 0) + 1;
    });

    return {
      totalStudios,
      activeStudios: activeSubs.length,
      inactiveStudios: inactiveSubs.length,
      monthlyRecurringRevenue,
      annualizedRunRate,
      churnRate,
      renewalRate,
      studiosDueForRenewalNext30Days,
      planDistribution
    };
  }
}

export const platformAnalyticsService = new PlatformAnalyticsService();
