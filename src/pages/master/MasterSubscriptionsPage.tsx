import React, { useState, useMemo, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { useMasterAdmin } from '../../context/MasterAdminContext';
import { masterAdminService } from '../../services/masterAdminService';
import { platformPlanService } from '../../services/platformPlanService';
import {
  razorpayBillingService,
  StudioBillingRecord,
  computeDaysRemaining,
  formatRemainingLabel,
  SubscriptionLifecycleStatus,
  BillingCycle
} from '../../services/razorpayBillingService';
import {
  CreditCard,
  Search,
  Download,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Zap,
  Edit3,
  XCircle,
  PauseCircle,
  X
} from 'lucide-react';

export const MasterSubscriptionsPage: React.FC = () => {
  const { setMasterRoute, setSelectedStudioId, triggerRefresh, refreshTrigger } = useMasterAdmin();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [firestoreSubs, setFirestoreSubs] = useState<StudioBillingRecord[]>([]);
  const [gatewayEnabled, setGatewayEnabled] = useState<boolean>(false);
  const [gatewayEnv, setGatewayEnv] = useState<'test' | 'live'>('test');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [managingSub, setManagingSub] = useState<{
    studioId: string;
    studioName: string;
    planId: string;
    billingCycle: BillingCycle;
    status: SubscriptionLifecycleStatus;
    expiryDate: string;
    nextRenewalDate: string;
    extendDays: number;
    razorpaySubscriptionId?: string | null;
    reason: string;
  } | null>(null);
  const [savingAdminEdit, setSavingAdminEdit] = useState(false);

  const plans = useMemo(() => platformPlanService.listPlans(), []);

  useEffect(() => {
    const unsub = razorpayBillingService.subscribeAllSubscriptions(setFirestoreSubs);
    razorpayBillingService
      .fetchGatewayConfig()
      .then((cfg) => {
        setGatewayEnabled(Boolean(cfg.enabled && cfg.isConfigured));
        setGatewayEnv(cfg.environment || 'test');
      })
      .catch(() => {});
    return () => unsub();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const studios = useMemo(() => {
    return masterAdminService.getAllStudios();
  }, [refreshTrigger]);

  const subscriptions = useMemo(() => {
    const fsMap = new Map<string, StudioBillingRecord>();
    firestoreSubs.forEach((rec) => fsMap.set(rec.studioId, rec));

    return studios.map((s) => {
      const live = fsMap.get(s.id);
      const sub = s.subscription;
      const expiryIso =
        live?.expiryDate ||
        sub?.validUntil ||
        (s as any).subscriptionExpiry ||
        new Date(Date.now() + 14 * 86400000).toISOString();
      const daysLeft = computeDaysRemaining(expiryIso);
      const status = (live?.status || sub?.status || 'trial') as SubscriptionLifecycleStatus;

      return {
        studioId: s.id,
        studioName: s.name,
        city: s.city,
        planId: live?.planId || sub?.planId || 'plan_standard_500',
        planName: live?.planName || sub?.planName || 'Studio OS Standard',
        amountInr: live?.amountInr ?? sub?.pricePerMonth ?? 500,
        billingCycle: (live?.billingCycle || 'monthly') as BillingCycle,
        status,
        expiryDate: expiryIso,
        nextRenewalDate: live?.nextRenewalDate || expiryIso,
        daysRemaining: daysLeft,
        remainingLabel: formatRemainingLabel(expiryIso),
        paymentMode: live?.paymentMode || 'manual',
        mandateStatus: live?.mandateStatus || 'not_set_up',
        razorpaySubscriptionId: live?.razorpaySubscriptionId || null,
        upiVpa: live?.upiVpa || null,
        autoRenew: Boolean(live?.autoRenew ?? sub?.autoRenew ?? false)
      };
    });
  }, [studios, firestoreSubs]);

  const filteredSubs = useMemo(() => {
    return subscriptions.filter((sub) => {
      if (statusFilter !== 'all' && sub.status !== statusFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        if (
          !sub.studioName.toLowerCase().includes(q) &&
          !sub.studioId.toLowerCase().includes(q) &&
          !(sub.razorpaySubscriptionId || '').toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [subscriptions, statusFilter, searchTerm]);

  const handleQuickExtend = async (studioId: string, currentExpiry: string, days: number) => {
    const baseMs = Math.max(Date.now(), new Date(currentExpiry || Date.now()).getTime());
    const nextIso = new Date(baseMs + days * 86400000).toISOString();
    try {
      await razorpayBillingService.adminUpdateSubscriptionRecord(
        studioId,
        {
          expiryDate: nextIso,
          nextRenewalDate: nextIso,
          status: 'active'
        },
        `Extended subscription by +${days} days until ${nextIso.slice(0, 10)}`
      );
      showToast(`Subscription extended by +${days} days and saved to Firebase.`);
      triggerRefresh();
    } catch (err: any) {
      showToast(err?.message || 'Failed to update subscription in Firebase.');
    }
  };

  const handleSaveAdminEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingSub) return;
    setSavingAdminEdit(true);
    try {
      const selectedPlan = plans.find((p) => p.id === managingSub.planId);
      const amountInr =
        managingSub.billingCycle === 'yearly'
          ? selectedPlan?.priceAnnual ?? 5000
          : managingSub.billingCycle === 'quarterly'
            ? selectedPlan?.priceQuarterly ?? Math.round((selectedPlan?.priceMonthly ?? 500) * 3 * 0.9)
            : selectedPlan?.priceMonthly ?? 500;

      const baseDate = new Date(managingSub.expiryDate || Date.now());
      if (managingSub.extendDays > 0) {
        baseDate.setTime(Math.max(Date.now(), baseDate.getTime()) + managingSub.extendDays * 86400000);
      }
      const finalExpiryIso = baseDate.toISOString();
      const finalRenewalIso = new Date(managingSub.nextRenewalDate || finalExpiryIso).toISOString();

      await razorpayBillingService.adminUpdateSubscriptionRecord(
        managingSub.studioId,
        {
          studioName: managingSub.studioName,
          planId: managingSub.planId,
          planName: selectedPlan?.name || 'Studio OS Plan',
          billingCycle: managingSub.billingCycle,
          amountInr,
          status: managingSub.status,
          expiryDate: finalExpiryIso,
          nextRenewalDate: managingSub.extendDays > 0 ? finalExpiryIso : finalRenewalIso
        },
        managingSub.reason.trim() ||
          `Master Admin updated plan=${selectedPlan?.name}, status=${managingSub.status}, expiry=${finalExpiryIso.slice(0, 10)}`
      );

      showToast(`Updated subscription governance for ${managingSub.studioName}.`);
      setManagingSub(null);
      triggerRefresh();
    } catch (err: any) {
      showToast(err?.message || 'Update failed.');
    } finally {
      setSavingAdminEdit(false);
    }
  };

  const handleAdminCancel = async () => {
    if (!managingSub) return;
    if (!window.confirm(`Cancel subscription for ${managingSub.studioName}? Studio business data will stay intact, but studio operations will lock until renewed.`)) {
      return;
    }
    setSavingAdminEdit(true);
    try {
      await razorpayBillingService.adminCancelSubscription({
        studioId: managingSub.studioId,
        subscriptionId: managingSub.razorpaySubscriptionId,
        cancelAtCycleEnd: false,
        reason: managingSub.reason || 'Master Admin cancellation'
      });
      showToast(`Subscription cancelled for ${managingSub.studioName}.`);
      setManagingSub(null);
      triggerRefresh();
    } catch (err: any) {
      showToast(err?.message || 'Cancel failed.');
    } finally {
      setSavingAdminEdit(false);
    }
  };

  const handleExportCsv = () => {
    const headers =
      'Studio ID,Studio Name,Plan,Fee (INR),Cycle,Status,Days Remaining,Next Renewal Date,Payment Mode,Mandate Status,Razorpay Sub ID\n';
    const rows = filteredSubs
      .map(
        (s) =>
          `"${s.studioId}","${s.studioName}","${s.planName}","${s.amountInr}","${s.billingCycle}","${s.status}","${s.daysRemaining}","${s.nextRenewalDate.slice(0, 10)}","${s.paymentMode}","${s.mandateStatus}","${s.razorpaySubscriptionId || ''}"`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `studio_subscriptions_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    showToast('Subscriptions exported to CSV successfully!');
  };

  const handleExportPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text('STUDIO OS — SUBSCRIPTIONS & RENEWAL REPORT', 14, 16);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString('en-IN')} | Studios: ${filteredSubs.length}`, 14, 23);
    let y = 33;
    filteredSubs.slice(0, 35).forEach((s, i) => {
      doc.text(
        `${i + 1}. ${s.studioName} | ${s.planName} (INR ${s.amountInr}) | ${s.status.toUpperCase()} | ${s.remainingLabel} | Mandate: ${s.mandateStatus}`,
        14,
        y
      );
      y += 6;
    });
    doc.save(`studio_subscriptions_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
            SaaS Billing & AutoPay Control
          </span>
          <h1 className="text-2xl font-black text-zinc-900 font-display tracking-tight mt-1">
            Studio Subscriptions Management
          </h1>
          <p className="text-xs text-zinc-500">
            Only Master Admin can assign plans, extend validity, change renewal dates, suspend, or cancel subscriptions.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setMasterRoute('autopay')}
            className="px-3 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-200 text-xs font-bold text-orange-800 cursor-pointer"
          >
            AutoPay Mandates
          </button>
          <button
            onClick={() => setMasterRoute('transactions')}
            className="px-3 py-2 rounded-xl bg-white hover:bg-zinc-50 border border-zinc-200 text-xs font-bold text-zinc-800 cursor-pointer"
          >
            Transactions Ledger
          </button>
          <button
            onClick={handleExportCsv}
            className="px-3 py-2 rounded-xl bg-white hover:bg-zinc-50 border border-zinc-200 text-xs font-bold text-zinc-800 flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>CSV</span>
          </button>
          <button
            onClick={handleExportPdf}
            className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-orange-400" />
            <span>PDF</span>
          </button>
        </div>
      </div>

      {/* Gateway Banner */}
      <div
        className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          gatewayEnabled
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white border border-zinc-200 flex items-center justify-center shrink-0">
            <Zap className={`w-4 h-4 ${gatewayEnabled ? 'text-emerald-600' : 'text-amber-600'}`} />
          </div>
          <div className="text-xs">
            <div className="font-bold">
              {gatewayEnabled
                ? `Razorpay (${gatewayEnv.toUpperCase()} Mode) Connected & Active`
                : 'Razorpay Payment Gateway Not Enabled Yet'}
            </div>
            <div className="opacity-80">
              {gatewayEnabled
                ? 'Studio Owners can authorize UPI AutoPay mandates or complete One-Time payments in real time.'
                : 'Configure Key ID, Key Secret & Webhook Secret in Settings → Payment Gateway.'}
            </div>
          </div>
        </div>
        <button
          onClick={() => setMasterRoute('settings')}
          className="px-3 py-1.5 rounded-xl bg-white border border-zinc-300 text-xs font-bold text-zinc-800 hover:bg-zinc-50 cursor-pointer shrink-0"
        >
          Configure Razorpay Gateway
        </button>
      </div>

      {toastMessage && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-zinc-200 p-3 rounded-2xl">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search subscriptions by studio name, ID, or sub_..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:bg-white focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-zinc-50 border border-zinc-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold"
        >
          <option value="all">All States ({subscriptions.length})</option>
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="grace_period">Grace Period</option>
          <option value="payment_failed">Payment Failed</option>
          <option value="expired">Expired</option>
          <option value="suspended">Suspended</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase font-bold border-b border-zinc-200">
              <tr>
                <th className="px-4 py-3">Studio Name</th>
                <th className="px-4 py-3">Plan & Fee</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3">Days Left & Renewal</th>
                <th className="px-4 py-3">Payment / AutoPay Mandate</th>
                <th className="px-4 py-3 text-right">Admin Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredSubs.map((sub) => (
                <tr key={sub.studioId} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-4 py-3 font-bold text-zinc-900">
                    <button
                      onClick={() => {
                        setSelectedStudioId(sub.studioId);
                        setMasterRoute('studio-detail');
                      }}
                      className="flex items-center gap-2 hover:text-orange-600 cursor-pointer"
                    >
                      <Building2 className="w-3.5 h-3.5 text-orange-500" />
                      <span>{sub.studioName}</span>
                    </button>
                  </td>

                  <td className="px-4 py-3">
                    <div className="font-bold text-zinc-900">{sub.planName}</div>
                    <div className="text-xs font-mono text-zinc-500">
                      ₹{Number(sub.amountInr).toLocaleString('en-IN')} / {sub.billingCycle}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                        sub.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : sub.status === 'trial'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : sub.status === 'grace_period'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {sub.status}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <div className="font-bold text-zinc-900">{sub.remainingLabel}</div>
                    <div className="text-xs font-mono text-zinc-500">
                      Renews: {sub.nextRenewalDate ? new Date(sub.nextRenewalDate).toLocaleDateString('en-IN') : '—'}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="font-semibold text-zinc-800 capitalize">
                      {sub.paymentMode.replace('_', ' ')} ({sub.mandateStatus})
                    </div>
                    <div className="text-xs font-mono text-zinc-500">
                      {sub.razorpaySubscriptionId || sub.upiVpa || 'No mandate configured'}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        onClick={() => handleQuickExtend(sub.studioId, sub.expiryDate, 30)}
                        className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-xs font-bold text-zinc-800 cursor-pointer"
                      >
                        +30d
                      </button>
                      <button
                        onClick={() =>
                          setManagingSub({
                            studioId: sub.studioId,
                            studioName: sub.studioName,
                            planId: sub.planId,
                            billingCycle: sub.billingCycle,
                            status: sub.status,
                            expiryDate: (sub.expiryDate || new Date().toISOString()).slice(0, 10),
                            nextRenewalDate: (sub.nextRenewalDate || new Date().toISOString()).slice(0, 10),
                            extendDays: 0,
                            razorpaySubscriptionId: sub.razorpaySubscriptionId,
                            reason: ''
                          })
                        }
                        className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Manage</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Master Admin Subscription Governance Modal */}
      {managingSub && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveAdminEdit}
            className="bg-white border border-zinc-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-xs"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-base font-black text-zinc-900">Manage Subscription</h3>
                <p className="text-xs text-zinc-500">{managingSub.studioName}</p>
              </div>
              <button type="button" onClick={() => setManagingSub(null)} className="text-zinc-400 hover:text-zinc-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-zinc-700 mb-1">Assign / Switch Plan</label>
                <select
                  value={managingSub.planId}
                  onChange={(e) => setManagingSub((m) => ({ ...m!, planId: e.target.value }))}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 font-bold"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (₹{p.priceMonthly}/mo)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Billing Cycle</label>
                <select
                  value={managingSub.billingCycle}
                  onChange={(e) => setManagingSub((m) => ({ ...m!, billingCycle: e.target.value as BillingCycle }))}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 font-bold"
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Subscription Status</label>
                <select
                  value={managingSub.status}
                  onChange={(e) => setManagingSub((m) => ({ ...m!, status: e.target.value as SubscriptionLifecycleStatus }))}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 font-bold"
                >
                  <option value="active">Active</option>
                  <option value="trial">Trial</option>
                  <option value="grace_period">Grace Period</option>
                  <option value="payment_failed">Payment Failed</option>
                  <option value="expired">Expired</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Extend Days (+Bonus Days)</label>
                <input
                  type="number"
                  min={0}
                  value={managingSub.extendDays}
                  onChange={(e) => setManagingSub((m) => ({ ...m!, extendDays: Number(e.target.value) }))}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={managingSub.expiryDate}
                  onChange={(e) => setManagingSub((m) => ({ ...m!, expiryDate: e.target.value }))}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Next Renewal Date</label>
                <input
                  type="date"
                  value={managingSub.nextRenewalDate}
                  onChange={(e) => setManagingSub((m) => ({ ...m!, nextRenewalDate: e.target.value }))}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-zinc-700 mb-1">Audit Note / Reason</label>
                <input
                  type="text"
                  value={managingSub.reason}
                  onChange={(e) => setManagingSub((m) => ({ ...m!, reason: e.target.value }))}
                  placeholder="e.g. Promotional 30-day extension or plan upgrade"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-zinc-100">
              <button
                type="button"
                disabled={savingAdminEdit}
                onClick={handleAdminCancel}
                className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Cancel Subscription</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setManagingSub(null)}
                  className="px-3.5 py-2 rounded-xl border border-zinc-200 font-bold text-zinc-600"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={savingAdminEdit}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold cursor-pointer"
                >
                  {savingAdminEdit ? 'Saving...' : 'Apply Changes'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
