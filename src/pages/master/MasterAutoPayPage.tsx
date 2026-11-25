import React, { useEffect, useMemo, useState } from 'react';
import {
  razorpayBillingService,
  StudioBillingRecord,
  PlatformTransactionRecord,
  computeDaysRemaining
} from '../../services/razorpayBillingService';
import { masterAdminService } from '../../services/masterAdminService';
import {
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  PauseCircle,
  PlayCircle,
  XCircle,
  IndianRupee,
  Download,
  Search,
  Building2,
  ShieldCheck
} from 'lucide-react';
import { useMasterAdmin } from '../../context/MasterAdminContext';

export const MasterAutoPayPage: React.FC = () => {
  const { setSelectedStudioId, setMasterRoute } = useMasterAdmin();
  const [subs, setSubs] = useState<StudioBillingRecord[]>([]);
  const [txs, setTxs] = useState<PlatformTransactionRecord[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const studiosMap = useMemo(() => {
    const map = new Map<string, string>();
    masterAdminService.getAllStudios().forEach((s) => map.set(s.id, s.name));
    return map;
  }, []);

  useEffect(() => {
    const unsub1 = razorpayBillingService.subscribeAllSubscriptions(setSubs);
    const unsub2 = razorpayBillingService.subscribeAllTransactions(setTxs);
    return () => {
      unsub1();
      unsub2();
    };
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const kpis = useMemo(() => {
    const now = Date.now();
    const sevenDaysMs = 7 * 86400000;

    const activeSubs = subs.filter((s) => s.status === 'active').length;
    const activeMandates = subs.filter((s) => s.mandateStatus === 'active').length;
    const pendingAuth = subs.filter(
      (s) => s.mandateStatus === 'authorization_pending' || s.mandateStatus === 'authenticated'
    ).length;
    const failedPayments = txs.filter((t) => t.status === 'failed').length;
    const upcomingRenewals = subs.filter((s) => {
      const target = s.nextRenewalDate ? new Date(s.nextRenewalDate).getTime() : 0;
      return target > now && target - now <= sevenDaysMs && s.status === 'active';
    }).length;
    const revokedPaused = subs.filter(
      (s) => s.mandateStatus === 'paused' || s.mandateStatus === 'revoked'
    ).length;
    const cancelledSubs = subs.filter((s) => s.status === 'cancelled').length;

    const mrr = subs
      .filter((s) => s.status === 'active' && Number(s.amountInr) > 0)
      .reduce((acc, s) => {
        const amt = Number(s.amountInr || 0);
        if (s.billingCycle === 'yearly') return acc + Math.round(amt / 12);
        if (s.billingCycle === 'quarterly') return acc + Math.round(amt / 3);
        return acc + amt;
      }, 0);

    return {
      activeSubs,
      activeMandates,
      pendingAuth,
      failedPayments,
      upcomingRenewals,
      revokedPaused,
      cancelledSubs,
      mrr,
      yrr: mrr * 12
    };
  }, [subs, txs]);

  const filtered = useMemo(() => {
    return subs.filter((s) => {
      if (filter === 'active_mandate' && s.mandateStatus !== 'active') return false;
      if (
        filter === 'pending' &&
        s.mandateStatus !== 'authorization_pending' &&
        s.mandateStatus !== 'authenticated'
      )
        return false;
      if (filter === 'failed' && s.mandateStatus !== 'failed' && s.status !== 'payment_failed')
        return false;
      if (filter === 'paused' && s.mandateStatus !== 'paused' && s.mandateStatus !== 'revoked')
        return false;
      if (filter === 'cancelled' && s.status !== 'cancelled') return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const sName = (s.studioName || studiosMap.get(s.studioId) || s.studioId).toLowerCase();
        if (
          !sName.includes(q) &&
          !(s.razorpaySubscriptionId || '').toLowerCase().includes(q) &&
          !(s.upiVpa || '').toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [subs, filter, search, studiosMap]);

  const handlePauseResume = async (sub: StudioBillingRecord) => {
    if (!sub.razorpaySubscriptionId) return;
    setBusyId(sub.studioId);
    try {
      const mode = sub.mandateStatus === 'paused' ? 'resume' : 'pause';
      await razorpayBillingService.adminPauseOrResumeMandate({
        studioId: sub.studioId,
        subscriptionId: sub.razorpaySubscriptionId,
        mode
      });
      showToast(`Mandate ${mode === 'pause' ? 'paused' : 'resumed'} for ${sub.studioName || sub.studioId}`);
    } catch (err: any) {
      showToast(err?.message || 'Mandate update failed');
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = async (sub: StudioBillingRecord) => {
    if (!window.confirm(`Cancel subscription & AutoPay mandate for ${sub.studioName || sub.studioId}? Studio data will remain safely archived.`)) {
      return;
    }
    setBusyId(sub.studioId);
    try {
      await razorpayBillingService.adminCancelSubscription({
        studioId: sub.studioId,
        subscriptionId: sub.razorpaySubscriptionId,
        cancelAtCycleEnd: false,
        reason: 'Master Admin AutoPay cancellation'
      });
      showToast(`Cancelled subscription & mandate for ${sub.studioName || sub.studioId}`);
    } catch (err: any) {
      showToast(err?.message || 'Cancellation failed');
    } finally {
      setBusyId(null);
    }
  };

  const handleExportCsv = () => {
    const headers = 'Studio ID,Studio Name,Plan,Cycle,Amount INR,Sub Status,Mandate Status,UPI VPA,Razorpay Sub ID,Next Renewal,Days Left\n';
    const rows = filtered
      .map((s) =>
        `"${s.studioId}","${s.studioName || studiosMap.get(s.studioId) || s.studioId}","${s.planName}","${s.billingCycle}","${s.amountInr}","${s.status}","${s.mandateStatus}","${s.upiVpa || ''}","${s.razorpaySubscriptionId || ''}","${s.nextRenewalDate || ''}","${computeDaysRemaining(s.expiryDate)}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `studio_os_autopay_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-50 text-orange-800 border border-orange-200">
            UPI AutoPay & Mandates
          </span>
          <h1 className="text-2xl font-black text-zinc-900 font-display tracking-tight mt-1">
            AutoPay Mandate Management
          </h1>
          <p className="text-xs text-zinc-500">
            Live Razorpay subscription mandates, recurring revenue metrics, and admin mandate lifecycle controls.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-50 border border-zinc-200 text-xs font-bold text-zinc-800 flex items-center gap-1.5 cursor-pointer self-start"
        >
          <Download className="w-3.5 h-3.5 text-orange-600" />
          <span>Export AutoPay CSV</span>
        </button>
      </div>

      {toast && (
        <div className="p-3 rounded-xl bg-zinc-900 text-white text-xs font-semibold flex items-center justify-between">
          <span>{toast}</span>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-zinc-200 rounded-2xl p-4">
          <div className="text-xs font-bold text-zinc-400 uppercase">Active Mandates</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{kpis.activeMandates}</div>
          <div className="text-xs text-zinc-500">{kpis.activeSubs} total active subscriptions</div>
        </div>
        <div className="bg-white border border-zinc-200 rounded-2xl p-4">
          <div className="text-xs font-bold text-zinc-400 uppercase">MRR / YRR</div>
          <div className="text-2xl font-black text-zinc-900 font-mono mt-1">
            ₹{kpis.mrr.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-zinc-500 font-mono">
            Annualized: ₹{kpis.yrr.toLocaleString('en-IN')}
          </div>
        </div>
        <div className="bg-white border border-zinc-200 rounded-2xl p-4">
          <div className="text-xs font-bold text-zinc-400 uppercase">Pending / Renewals (7d)</div>
          <div className="text-2xl font-black text-amber-600 mt-1">
            {kpis.pendingAuth} / {kpis.upcomingRenewals}
          </div>
          <div className="text-xs text-zinc-500">Auth pending / due within 7 days</div>
        </div>
        <div className="bg-white border border-zinc-200 rounded-2xl p-4">
          <div className="text-xs font-bold text-zinc-400 uppercase">Failed / Paused / Cancelled</div>
          <div className="text-2xl font-black text-rose-600 mt-1">
            {kpis.failedPayments} / {kpis.revokedPaused + kpis.cancelledSubs}
          </div>
          <div className="text-xs text-zinc-500">Real payment failures & stopped mandates</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-zinc-200 p-3 rounded-2xl">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by studio name, sub_... ID, or UPI ID..."
            className="w-full pl-9 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:bg-white focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs">
          {[
            ['all', 'All'],
            ['active_mandate', 'Active Mandates'],
            ['pending', 'Pending Auth'],
            ['failed', 'Failed / Halted'],
            ['paused', 'Paused / Revoked'],
            ['cancelled', 'Cancelled']
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer ${
                filter === key
                  ? 'bg-zinc-900 text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Mandates Table */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase font-bold">
              <tr>
                <th className="px-4 py-3">Studio</th>
                <th className="px-4 py-3">Plan & Amount</th>
                <th className="px-4 py-3">Razorpay Sub ID</th>
                <th className="px-4 py-3">Mandate Status</th>
                <th className="px-4 py-3">UPI / Method</th>
                <th className="px-4 py-3">Next Charge</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-zinc-500">
                    No subscription mandates match this filter yet. Real Razorpay mandates appear here once configured and authorized.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.studioId} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 font-bold text-zinc-900">
                      <button
                        onClick={() => {
                          setSelectedStudioId(s.studioId);
                          setMasterRoute('studio-detail');
                        }}
                        className="flex items-center gap-1.5 hover:text-orange-600 cursor-pointer"
                      >
                        <Building2 className="w-3.5 h-3.5 text-orange-500" />
                        <span>{s.studioName || studiosMap.get(s.studioId) || s.studioId}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-zinc-800">{s.planName}</div>
                      <div className="text-xs font-mono text-zinc-500">
                        ₹{Number(s.amountInr || 0).toLocaleString('en-IN')} / {s.billingCycle}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-zinc-600">
                      {s.razorpaySubscriptionId || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                          s.mandateStatus === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : s.mandateStatus === 'failed' || s.mandateStatus === 'cancelled'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {s.mandateStatus || 'not_set_up'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-zinc-700">
                      {s.upiVpa || s.paymentMethodDetail || s.paymentMode}
                    </td>
                    <td className="px-4 py-3 font-mono text-zinc-700">
                      {s.nextRenewalDate ? new Date(s.nextRenewalDate).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {s.razorpaySubscriptionId && (s.mandateStatus === 'active' || s.mandateStatus === 'paused') && (
                          <button
                            disabled={busyId === s.studioId}
                            onClick={() => handlePauseResume(s)}
                            className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold cursor-pointer inline-flex items-center gap-1"
                          >
                            {s.mandateStatus === 'paused' ? (
                              <>
                                <PlayCircle className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Resume</span>
                              </>
                            ) : (
                              <>
                                <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
                                <span>Pause</span>
                              </>
                            )}
                          </button>
                        )}
                        {s.status !== 'cancelled' && (
                          <button
                            disabled={busyId === s.studioId}
                            onClick={() => handleCancel(s)}
                            className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold cursor-pointer inline-flex items-center gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Cancel</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
