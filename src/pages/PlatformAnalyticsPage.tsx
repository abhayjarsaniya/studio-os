import React, { useMemo } from 'react';
import { platformAnalyticsService } from '../services/platformAnalyticsService';
import { useApp } from '../context/AppContext';
import { 
  ShieldCheck, 
  Layers, 
  TrendingUp, 
  Building2, 
  IndianRupee, 
  RotateCcw, 
  AlertCircle, 
  Lock,
  ArrowLeft 
} from 'lucide-react';

export const PlatformAnalyticsPage: React.FC = () => {
  const { setActiveTab } = useApp();
  const metrics = useMemo(() => platformAnalyticsService.getPlatformSaaSAnalytics(), []);

  return (
    <div className="space-y-6 pb-12 max-w-7xl w-full mx-auto px-3.5 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
              Master Admin Platform Console
            </span>
            <span className="text-xs text-slate-400">Strictly Isolated from Photography Revenue</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <Layers className="w-7 h-7 text-indigo-600" />
            Studio OS SaaS Platform Analytics
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Macro-level SaaS subscription health, monthly recurring revenue (MRR @ ₹500/studio/month), churn, and retention.
          </p>
        </div>

        <button
          onClick={() => setActiveTab('dashboard')}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors self-start sm:self-auto"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Studio Dashboard
        </button>
      </div>

      {/* Security & Isolation Callout */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-start gap-3">
        <Lock className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div className="text-xs text-indigo-950 leading-relaxed">
          <strong className="font-bold">Multi-Tenant Financial Isolation Guarantee:</strong> Platform subscription billing (₹500 per photography studio per month) is strictly quarantined from individual tenant financial ledgers. Photography studio client invoices, customer payments, employee salaries, and vendor expenses are never aggregated or co-mingled into platform SaaS revenues.
        </div>
      </div>

      {/* Primary SaaS KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
            <span>Total Studios</span>
            <Building2 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-3xl font-black text-slate-900">{metrics.totalStudios}</div>
          <div className="text-xs text-slate-400 mt-1">
            {metrics.activeStudios} Active / {metrics.inactiveStudios} Inactive
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-indigo-600 mb-2">
            <span>Platform MRR</span>
            <IndianRupee className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-3xl font-black text-indigo-700">₹{metrics.monthlyRecurringRevenue.toLocaleString('en-IN')}</div>
          <div className="text-xs text-slate-400 mt-1">₹500/studio monthly</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-600 mb-2">
            <span>Annual Run Rate (ARR)</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-emerald-700">₹{metrics.annualizedRunRate.toLocaleString('en-IN')}</div>
          <div className="text-xs text-slate-400 mt-1">Annualized SaaS projection</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-blue-600 mb-2">
            <span>Renewal Rate</span>
            <RotateCcw className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-3xl font-black text-blue-700">{metrics.renewalRate}%</div>
          <div className="text-xs text-slate-400 mt-1">Churn: {metrics.churnRate}%</div>
        </div>
      </div>

      {/* Secondary SaaS Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Renewal Horizon */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-slate-600" />
            30-Day Renewal Pipeline
          </h3>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500 font-medium">Studios Due for Renewal</div>
              <div className="text-xs text-slate-400 mt-0.5">Automated subscription charge within next 30 days</div>
            </div>
            <div className="text-2xl font-black text-slate-900">
              {metrics.studiosDueForRenewalNext30Days}
            </div>
          </div>
        </div>

        {/* Subscription Plan Distribution */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-slate-600" />
            Active SaaS Plan Tiers
          </h3>
          <div className="space-y-2">
            {Object.entries(metrics.planDistribution).map(([planName, count]) => (
              <div key={planName} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-slate-800">{planName}</span>
                  <span className="text-xs text-slate-400 block mt-0.5">₹500 / month flat studio fee</span>
                </div>
                <span className="text-sm font-black text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg">
                  {String(count)} Studios
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
