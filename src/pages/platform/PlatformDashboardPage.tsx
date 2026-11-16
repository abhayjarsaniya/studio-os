import React, { useMemo } from 'react';
import { usePlatform } from '../../context/PlatformContext';
import { platformMacroAnalyticsService } from '../../services/platformMacroAnalyticsService';
import { platformStudioService } from '../../services/platformStudioService';
import { platformAuditService } from '../../services/platformAuditService';
import { 
  Building2, 
  Layers, 
  CreditCard, 
  TrendingUp, 
  IndianRupee, 
  AlertTriangle, 
  CheckCircle, 
  RotateCcw, 
  Clock, 
  ArrowRight,
  ShieldCheck,
  Megaphone,
  LifeBuoy
} from 'lucide-react';

export const PlatformDashboardPage: React.FC = () => {
  const { setPlatformRoute, setSelectedStudioId, canAdmin } = usePlatform();
  const kpis = useMemo(() => platformMacroAnalyticsService.getMacroKPIs(), []);
  const studios = useMemo(() => platformStudioService.listStudios(), []);
  const auditLogs = useMemo(() => platformAuditService.listLogs().slice(0, 6), []);

  const handleOpenStudio = (studioId: string) => {
    setSelectedStudioId(studioId);
    setPlatformRoute('studio-detail');
  };

  return (
    <div className="w-full space-y-4 sm:space-y-6 pb-12">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 border border-indigo-200">
            SaaS Platform Console
          </span>
          <span className="text-xs text-slate-400">Strictly Isolated from Photography Studio Financials</span>
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
          Platform Master Admin Dashboard
        </h1>
      </div>

      {/* Primary KPI Grid (Clickable) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3.5">
        {/* Total Studios */}
        <div
          onClick={() => setPlatformRoute('studios')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-400 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
            <span>Total Studios</span>
            <Building2 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900">{kpis.totalStudios}</div>
          <div className="text-xs text-slate-400 mt-1">
            {kpis.activeStudios} Active / {kpis.trialStudios} Trial
          </div>
        </div>

        {/* Monthly Recurring Revenue */}
        <div
          onClick={() => setPlatformRoute('analytics')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-400 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs text-indigo-600 font-semibold mb-1">
            <span>Platform MRR</span>
            <IndianRupee className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-indigo-700">₹{kpis.monthlyRecurringRevenue.toLocaleString('en-IN')}</div>
          <div className="text-xs text-slate-400 mt-1">
            ARR: ₹{kpis.annualizedRunRate.toLocaleString('en-IN')}
          </div>
        </div>

        {/* Total Payments Collected */}
        <div
          onClick={() => setPlatformRoute('billing')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-400 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs text-emerald-600 font-semibold mb-1">
            <span>SaaS Collections</span>
            <CreditCard className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">₹{kpis.paymentsReceivedTotal.toLocaleString('en-IN')}</div>
          <div className="text-xs text-slate-400 mt-1">
            Pending: ₹{kpis.pendingInvoicedRevenue.toLocaleString('en-IN')}
          </div>
        </div>

        {/* Renewal & Churn */}
        <div
          onClick={() => setPlatformRoute('subscriptions')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-400 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs text-blue-600 font-semibold mb-1">
            <span>Retention Rate</span>
            <RotateCcw className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-700">{kpis.renewalRate}%</div>
          <div className="text-xs text-slate-400 mt-1">
            Churn: {kpis.churnRate}% ({kpis.cancelledStudios} cancelled)
          </div>
        </div>
      </div>

      {/* Secondary Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 text-xs shadow-xs">
        <div className="p-2.5 bg-slate-50 rounded-xl">
          <span className="text-slate-500 font-medium block">Renewals Due Today</span>
          <span className="text-lg font-black text-slate-900 mt-0.5 block">{kpis.renewalsDueToday}</span>
        </div>
        <div className="p-2.5 bg-slate-50 rounded-xl">
          <span className="text-slate-500 font-medium block">Renewals Next 7 Days</span>
          <span className="text-lg font-black text-slate-900 mt-0.5 block">{kpis.renewalsNext7Days}</span>
        </div>
        <div className="p-2.5 bg-slate-50 rounded-xl">
          <span className="text-slate-500 font-medium block">Renewals Next 30 Days</span>
          <span className="text-lg font-black text-indigo-700 mt-0.5 block">{kpis.renewalsNext30Days}</span>
        </div>
        <div className="p-2.5 bg-slate-50 rounded-xl">
          <span className="text-slate-500 font-medium block">Suspended Studios</span>
          <span className="text-lg font-black text-rose-700 mt-0.5 block">{kpis.suspendedStudios}</span>
        </div>
      </div>

      {/* 2-Column Split: Studios Overview & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Studios Directory Preview */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Photography Studios Overview</h3>
                <p className="text-xs text-slate-400">Registered SaaS tenants across India</p>
              </div>
              <button
                onClick={() => setPlatformRoute('studios')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
              >
                View All <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Studio Name</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Renewal</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {studios.slice(0, 5).map(s => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{s.name}</div>
                        <div className="text-xs text-slate-400 font-mono">{s.id}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-700">{s.planName}</span>
                        <span className="text-xs text-slate-400 block">₹{s.planPrice}/mo</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{s.renewalDate}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                          s.subscriptionStatus === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : s.subscriptionStatus === 'trial'
                            ? 'bg-blue-100 text-blue-800'
                            : s.subscriptionStatus === 'suspended'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {s.subscriptionStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleOpenStudio(s.id)}
                          className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-400 text-center">
            Studio data isolation guaranteed. Platform admins cannot view or alter studio client shoots or salaries without explicit audited support grants.
          </div>
        </div>

        {/* Recent Platform Audit Trail */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Platform Audit Trail
            </h3>
            <button
              onClick={() => setPlatformRoute('audit-logs')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              All Logs
            </button>
          </div>

          <div className="space-y-3">
            {auditLogs.map(log => (
              <div key={log.id} className="text-xs pb-2 border-b border-slate-100 last:border-0">
                <div className="flex items-center justify-between font-semibold text-slate-800">
                  <span className="truncate">{log.action}</span>
                  <span className="text-xs text-slate-400 font-mono">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                  {log.details}
                </p>
                <div className="text-xs text-slate-400 mt-1">
                  Actor: <span className="font-medium text-slate-600">{log.adminName}</span>
                </div>
              </div>
            ))}
            {auditLogs.length === 0 && (
              <div className="text-xs text-slate-400 text-center py-6">No platform audit logs recorded yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
