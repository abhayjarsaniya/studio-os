import React, { useState, useEffect } from 'react';
import { useMasterAdmin } from '../../context/MasterAdminContext';
import { platformPlanService } from '../../services/platformPlanService';
import {
  razorpayBillingService,
  StudioBillingRecord
} from '../../services/razorpayBillingService';
import { PlatformPlan } from '../../types/schema';
import {
  Layers,
  Check,
  Zap,
  Crown,
  Edit2,
  Plus,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  X
} from 'lucide-react';

export const MasterPlansPage: React.FC = () => {
  const { setMasterRoute } = useMasterAdmin();
  const [plans, setPlans] = useState<PlatformPlan[]>(() => platformPlanService.listPlans());
  const [subs, setSubs] = useState<StudioBillingRecord[]>([]);
  const [editingPlan, setEditingPlan] = useState<Partial<PlatformPlan> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [syncingKey, setSyncingKey] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    razorpayBillingService.listFirestorePlans().then((fsPlans) => {
      if (fsPlans.length > 0) {
        const merged = [...platformPlanService.listPlans()];
        fsPlans.forEach((fp) => {
          const idx = merged.findIndex((m) => m.id === fp.id);
          if (idx >= 0) {
            merged[idx] = {
              ...merged[idx],
              ...fp,
              priceAnnual: fp.priceYearly ?? merged[idx].priceAnnual
            };
          } else {
            merged.push({
              ...fp,
              priceAnnual: fp.priceYearly ?? 0,
              currency: 'INR',
              billingCycle: 'monthly',
              version: 1,
              createdAt: fp.updatedAt || new Date().toISOString()
            } as PlatformPlan);
          }
        });
        setPlans(merged);
      }
    }).catch(() => {});

    const unsub = razorpayBillingService.subscribeAllSubscriptions(setSubs);
    return () => unsub();
  }, []);

  const handleOpenCreate = () => {
    setIsNew(true);
    setEditingPlan({
      name: '',
      description: '',
      priceMonthly: 999,
      priceQuarterly: 2699,
      priceAnnual: 9990,
      setupFee: 0,
      trialDays: 14,
      gracePeriodDays: 7,
      renewalPolicy: 'manual_or_autopay',
      employeeLimit: 25,
      branchLimit: 3,
      storageGb: 50,
      features: ['events', 'crm_customers', 'quotations', 'whatsapp_chat', 'finance', 'analytics'],
      isActive: true
    });
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan?.name) return;
    setBanner(null);

    try {
      let saved: PlatformPlan;
      if (isNew) {
        saved = platformPlanService.createPlan({
          name: editingPlan.name.trim(),
          description: editingPlan.description || '',
          priceMonthly: Number(editingPlan.priceMonthly || 0),
          priceQuarterly: Number(editingPlan.priceQuarterly || 0),
          priceAnnual: Number(editingPlan.priceAnnual || 0),
          setupFee: Number(editingPlan.setupFee || 0),
          trialDays: Number(editingPlan.trialDays ?? 14),
          gracePeriodDays: Number(editingPlan.gracePeriodDays ?? 7),
          renewalPolicy: (editingPlan.renewalPolicy as any) || 'manual_or_autopay',
          currency: 'INR',
          billingCycle: 'monthly',
          employeeLimit: Number(editingPlan.employeeLimit || 25),
          branchLimit: Number(editingPlan.branchLimit || 3),
          storageGb: Number(editingPlan.storageGb || 50),
          features: editingPlan.features || [],
          isActive: editingPlan.isActive !== false
        });
      } else if (editingPlan.id) {
        saved = platformPlanService.updatePlan(editingPlan.id, {
          name: editingPlan.name.trim(),
          description: editingPlan.description,
          priceMonthly: Number(editingPlan.priceMonthly || 0),
          priceQuarterly: Number(editingPlan.priceQuarterly || 0),
          priceAnnual: Number(editingPlan.priceAnnual || 0),
          setupFee: Number(editingPlan.setupFee || 0),
          trialDays: Number(editingPlan.trialDays ?? 14),
          gracePeriodDays: Number(editingPlan.gracePeriodDays ?? 7),
          renewalPolicy: (editingPlan.renewalPolicy as any) || 'manual_or_autopay',
          employeeLimit: Number(editingPlan.employeeLimit || 25),
          branchLimit: Number(editingPlan.branchLimit || 3),
          storageGb: Number(editingPlan.storageGb || 50),
          features: editingPlan.features || [],
          isActive: editingPlan.isActive !== false
        });
      } else {
        return;
      }

      await razorpayBillingService.saveFirestorePlan({
        id: saved.id,
        name: saved.name,
        description: saved.description,
        priceMonthly: saved.priceMonthly,
        priceQuarterly: saved.priceQuarterly ?? Math.round(saved.priceMonthly * 3 * 0.9),
        priceYearly: saved.priceAnnual,
        setupFee: saved.setupFee ?? 0,
        trialDays: saved.trialDays ?? 14,
        gracePeriodDays: saved.gracePeriodDays ?? 7,
        renewalPolicy: saved.renewalPolicy ?? 'manual_or_autopay',
        features: saved.features,
        employeeLimit: saved.employeeLimit,
        branchLimit: saved.branchLimit,
        storageGb: saved.storageGb,
        isActive: saved.isActive
      });

      setPlans(platformPlanService.listPlans());
      setEditingPlan(null);
      setBanner({
        type: 'success',
        text: `Plan "${saved.name}" saved. Existing active studio subscriptions retain their contracted amounts unless explicitly migrated.`
      });
    } catch (err: any) {
      setBanner({ type: 'error', text: err?.message || 'Unable to save billing plan.' });
    }
  };

  const handleSyncRazorpay = async (
    plan: PlatformPlan,
    cycle: 'monthly' | 'quarterly' | 'yearly',
    amountInr: number
  ) => {
    const key = `${plan.id}_${cycle}`;
    setSyncingKey(key);
    setBanner(null);
    try {
      const res = await razorpayBillingService.syncPlanToRazorpay({
        planId: plan.id,
        planName: plan.name,
        cycle,
        amountInr,
        description: plan.description
      });
      setBanner({
        type: 'success',
        text: `Created genuine Razorpay ${res.environment.toUpperCase()} Plan (${res.razorpayPlanId}) for ${plan.name} [${cycle}].`
      });
      const fsPlans = await razorpayBillingService.listFirestorePlans();
      setPlans((prev) =>
        prev.map((p) => {
          const matched = fsPlans.find((fp) => fp.id === p.id);
          return matched ? { ...p, ...matched } : p;
        })
      );
    } catch (err: any) {
      setBanner({ type: 'error', text: err?.message || 'Razorpay Plan creation failed.' });
    } finally {
      setSyncingKey(null);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
            SaaS Billing & Razorpay Plans
          </span>
          <h1 className="text-2xl font-black text-zinc-900 font-display tracking-tight mt-1">
            Subscription Plans Management
          </h1>
          <p className="text-xs text-zinc-500">
            Configure Monthly, Quarterly, and Yearly pricing synced with Razorpay Plan IDs for UPI AutoPay & One-Time Checkout.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-orange-400" />
            <span>New Plan</span>
          </button>
          <button
            onClick={() => setMasterRoute('subscriptions')}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-sm cursor-pointer"
          >
            View Studio Subscriptions
          </button>
        </div>
      </div>

      {/* Price Protection Notice */}
      <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <span>
          <strong>Active Subscriber Protection:</strong> Updating a plan&apos;s price creates a new version and Razorpay plan rate without silently altering existing subscribed studios&apos; agreed amounts.
        </span>
      </div>

      {banner && (
        <div
          className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 ${
            banner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {banner.type === 'success' ? (
            <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          )}
          <span className="font-medium">{banner.text}</span>
        </div>
      )}

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {plans.map((plan) => {
          const subscriberCount = subs.filter((s) => s.planId === plan.id && s.status === 'active').length;
          const qPrice = plan.priceQuarterly ?? Math.round(plan.priceMonthly * 3 * 0.9);
          return (
            <div
              key={plan.id}
              className={`bg-white rounded-3xl border p-5 flex flex-col justify-between shadow-2xs relative ${
                plan.isActive ? 'border-zinc-200' : 'border-rose-200 opacity-80'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {plan.priceMonthly >= 1000 ? (
                      <Crown className="w-4 h-4 text-amber-500 shrink-0" />
                    ) : (
                      <Zap className="w-4 h-4 text-orange-500 shrink-0" />
                    )}
                    <span className="text-sm font-black text-zinc-900 truncate">{plan.name}</span>
                  </div>
                  <button
                    onClick={() => {
                      setIsNew(false);
                      setEditingPlan({ ...plan, priceQuarterly: qPrice });
                    }}
                    className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 cursor-pointer"
                    title="Edit Plan"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="mt-2 flex items-center gap-2 text-xs font-bold">
                  <span className={`px-2 py-0.5 rounded-full ${plan.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                    {plan.isActive ? 'Enabled' : 'Disabled'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">
                    {subscriberCount} Active Studios
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">
                    v{plan.version || 1}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center bg-zinc-50 border border-zinc-200 rounded-2xl p-3">
                  <div>
                    <div className="text-xs uppercase font-bold text-zinc-400">Monthly</div>
                    <div className="text-sm font-black text-zinc-900 font-mono">
                      ₹{plan.priceMonthly.toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="border-x border-zinc-200">
                    <div className="text-xs uppercase font-bold text-zinc-400">Quarterly</div>
                    <div className="text-sm font-black text-zinc-900 font-mono">
                      ₹{qPrice.toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase font-bold text-zinc-400">Yearly</div>
                    <div className="text-sm font-black text-emerald-700 font-mono">
                      ₹{plan.priceAnnual.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                <div className="mt-3 space-y-1 text-xs text-zinc-600">
                  <div className="flex justify-between">
                    <span>Trial / Grace:</span>
                    <strong>{plan.trialDays ?? 14}d trial / {plan.gracePeriodDays ?? 7}d grace</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Setup Fee:</span>
                    <strong className="font-mono">₹{(plan.setupFee || 0).toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Quotas:</span>
                    <strong>{plan.employeeLimit} staff • {plan.branchLimit} branches • {plan.storageGb}GB</strong>
                  </div>
                </div>

                {/* Razorpay Plan Sync */}
                <div className="mt-4 pt-3 border-t border-zinc-100 space-y-1.5">
                  <div className="text-xs font-bold uppercase text-zinc-400">
                    Razorpay Plan Sync
                  </div>
                  {(
                    [
                      ['monthly', plan.priceMonthly],
                      ['quarterly', qPrice],
                      ['yearly', plan.priceAnnual]
                    ] as const
                  ).map(([cycle, amt]) => {
                    const testId = (plan as any).razorpayTestPlanIds?.[cycle];
                    const liveId = (plan as any).razorpayLivePlanIds?.[cycle];
                    const syncKey = `${plan.id}_${cycle}`;
                    return (
                      <div key={cycle} className="flex items-center justify-between text-xs bg-zinc-50 px-2.5 py-1.5 rounded-xl">
                        <div>
                          <span className="font-bold capitalize">{cycle}</span>
                          <span className="font-mono text-zinc-500 ml-1.5">
                            {liveId || testId || 'Not synced'}
                          </span>
                        </div>
                        <button
                          type="button"
                          disabled={amt <= 0 || syncingKey === syncKey}
                          onClick={() => handleSyncRazorpay(plan, cycle, amt)}
                          className="text-orange-600 hover:underline font-bold flex items-center gap-1 cursor-pointer disabled:opacity-40"
                        >
                          <RefreshCw className={`w-3 h-3 ${syncingKey === syncKey ? 'animate-spin' : ''}`} />
                          <span>Sync</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create / Edit Modal */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSavePlan}
            className="bg-white border border-zinc-200 rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto text-xs"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-base font-black text-zinc-900">
                {isNew ? 'Create Subscription Plan' : `Edit Plan: ${editingPlan.name}`}
              </h3>
              <button type="button" onClick={() => setEditingPlan(null)} className="text-zinc-400 hover:text-zinc-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block font-bold text-zinc-700 mb-1">Plan Name *</label>
                <input
                  type="text"
                  required
                  value={editingPlan.name || ''}
                  onChange={(e) => setEditingPlan((p) => ({ ...p!, name: e.target.value }))}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Monthly Price (₹ INR)</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={editingPlan.priceMonthly ?? 0}
                  onChange={(e) => setEditingPlan((p) => ({ ...p!, priceMonthly: Number(e.target.value) }))}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Quarterly Price (₹ INR)</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={editingPlan.priceQuarterly ?? 0}
                  onChange={(e) => setEditingPlan((p) => ({ ...p!, priceQuarterly: Number(e.target.value) }))}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Yearly Price (₹ INR)</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={editingPlan.priceAnnual ?? 0}
                  onChange={(e) => setEditingPlan((p) => ({ ...p!, priceAnnual: Number(e.target.value) }))}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">One-Time Setup Fee (₹ INR)</label>
                <input
                  type="number"
                  min={0}
                  value={editingPlan.setupFee ?? 0}
                  onChange={(e) => setEditingPlan((p) => ({ ...p!, setupFee: Number(e.target.value) }))}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Trial Period (Days)</label>
                <input
                  type="number"
                  min={0}
                  value={editingPlan.trialDays ?? 14}
                  onChange={(e) => setEditingPlan((p) => ({ ...p!, trialDays: Number(e.target.value) }))}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Grace Period (Days)</label>
                <input
                  type="number"
                  min={0}
                  value={editingPlan.gracePeriodDays ?? 7}
                  onChange={(e) => setEditingPlan((p) => ({ ...p!, gracePeriodDays: Number(e.target.value) }))}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 font-bold"
                />
              </div>
            </div>

            <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-200 cursor-pointer">
              <span className="font-bold text-zinc-800">Plan Enabled for Studios</span>
              <input
                type="checkbox"
                checked={editingPlan.isActive !== false}
                onChange={(e) => setEditingPlan((p) => ({ ...p!, isActive: e.target.checked }))}
              />
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingPlan(null)}
                className="px-4 py-2 rounded-xl border border-zinc-200 font-bold text-zinc-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold cursor-pointer"
              >
                Save Plan
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
