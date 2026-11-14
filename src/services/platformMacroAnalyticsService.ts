import { platformSubscriptionManager } from './platformSubscriptionManager';
import { platformBillingService } from './platformBillingService';
import { platformStudioService } from './platformStudioService';

export interface MacroSaaSKPIs {
  totalStudios: number;
  activeStudios: number;
  trialStudios: number;
  suspendedStudios: number;
  cancelledStudios: number;
  expiredStudios: number;
  monthlyRecurringRevenue: number; // MRR in INR
  annualizedRunRate: number; // ARR in INR
  paymentsReceivedTotal: number;
  pendingInvoicedRevenue: number;
  renewalsDueToday: number;
  renewalsNext7Days: number;
  renewalsNext30Days: number;
  churnRate: number;
  renewalRate: number;
  planDistribution: Record<string, number>;
}

export class PlatformMacroAnalyticsService {
  getMacroKPIs(): MacroSaaSKPIs {
    const subs = platformSubscriptionManager.listSubscriptions();
    const invoices = platformBillingService.listInvoices();
    const payments = platformBillingService.listPayments();
    const studios = platformStudioService.listStudios();

    const totalStudios = Math.max(subs.length, studios.length);
    const activeSubs = subs.filter(s => s.status === 'active');
    const trialSubs = subs.filter(s => s.status === 'trial');
    const suspendedSubs = subs.filter(s => s.status === 'suspended');
    const cancelledSubs = subs.filter(s => s.status === 'cancelled');
    const expiredSubs = subs.filter(s => s.status === 'expired');

    // MRR: strictly active recurring subscriptions at agreed monthly price
    const monthlyRecurringRevenue = activeSubs.reduce((sum, s) => {
      const price = s.billingCycle === 'annual' ? Math.round(s.agreedPrice / 12) : s.agreedPrice;
      return sum + (price || 500);
    }, 0);

    const annualizedRunRate = monthlyRecurringRevenue * 12;

    const churnRate = totalStudios > 0 ? Math.round((cancelledSubs.length / totalStudios) * 100) : 0;
    const renewalRate = 100 - churnRate;

    const paymentsReceivedTotal = payments.reduce((sum, p) => sum + p.amount, 0);

    const pendingInvoices = invoices.filter(i => i.status === 'issued' || i.status === 'partially_paid' || i.status === 'overdue');
    const pendingInvoicedRevenue = pendingInvoices.reduce((sum, i) => sum + i.balanceAmount, 0);

    // Renewal horizons
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const sevenDaysLater = new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0];
    const thirtyDaysLater = new Date(now.getTime() + 30 * 86400000).toISOString().split('T')[0];

    const renewalsDueToday = subs.filter(s => s.nextBillingDate === todayStr).length;
    const renewalsNext7Days = subs.filter(s => s.nextBillingDate >= todayStr && s.nextBillingDate <= sevenDaysLater).length;
    const renewalsNext30Days = subs.filter(s => s.nextBillingDate >= todayStr && s.nextBillingDate <= thirtyDaysLater).length;

    const planDistribution: Record<string, number> = {};
    subs.forEach(s => {
      planDistribution[s.planName] = (planDistribution[s.planName] || 0) + 1;
    });

    return {
      totalStudios,
      activeStudios: activeSubs.length,
      trialStudios: trialSubs.length,
      suspendedStudios: suspendedSubs.length,
      cancelledStudios: cancelledSubs.length,
      expiredStudios: expiredSubs.length,
      monthlyRecurringRevenue,
      annualizedRunRate,
      paymentsReceivedTotal,
      pendingInvoicedRevenue,
      renewalsDueToday,
      renewalsNext7Days,
      renewalsNext30Days,
      churnRate,
      renewalRate,
      planDistribution
    };
  }
}

export const platformMacroAnalyticsService = new PlatformMacroAnalyticsService();
