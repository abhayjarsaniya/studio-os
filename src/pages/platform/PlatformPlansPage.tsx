import React, { useState, useMemo } from 'react';
import { usePlatform } from '../../context/PlatformContext';
import { platformPlanService } from '../../services/platformPlanService';
import { PlatformPlan } from '../../types/schema';
import { 
  CreditCard, 
  Plus, 
  Copy, 
  Check, 
  Sparkles, 
  Sliders, 
  IndianRupee, 
  Users, 
  Building2, 
  HardDrive,
  Info
} from 'lucide-react';

export const PlatformPlansPage: React.FC = () => {
  const { triggerRefresh, refreshTrigger, canAdmin, currentAdmin } = usePlatform();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlatformPlan | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [priceMonthly, setPriceMonthly] = useState(500);
  const [priceAnnual, setPriceAnnual] = useState(5000);
  const [employeeLimit, setEmployeeLimit] = useState(25);
  const [branchLimit, setBranchLimit] = useState(3);
  const [storageGb, setStorageGb] = useState(50);
  const [trialDays, setTrialDays] = useState(14);
  const [gracePeriodDays, setGracePeriodDays] = useState(7);
  const [description, setDescription] = useState('');

  const plans = useMemo(() => {
    return platformPlanService.listPlans();
  }, [refreshTrigger]);

  const handleOpenCreate = () => {
    setEditingPlan(null);
    setName('');
    setPriceMonthly(500);
    setPriceAnnual(5000);
    setEmployeeLimit(25);
    setBranchLimit(3);
    setStorageGb(50);
    setTrialDays(14);
    setGracePeriodDays(7);
    setDescription('Complete photography studio operations ERP');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (plan: PlatformPlan) => {
    setEditingPlan(plan);
    setName(plan.name);
    setPriceMonthly(plan.priceMonthly);
    setPriceAnnual(plan.priceAnnual);
    setEmployeeLimit(plan.employeeLimit);
    setBranchLimit(plan.branchLimit);
    setStorageGb(plan.storageGb);
    setTrialDays(plan.trialDays);
    setGracePeriodDays(plan.gracePeriodDays);
    setDescription(plan.description);
    setIsModalOpen(true);
  };

  const handleSavePlan = () => {
    if (!name.trim()) return;

    if (editingPlan) {
      platformPlanService.updatePlan(
        editingPlan.id,
        {
          name: name.trim(),
          priceMonthly,
          priceAnnual,
          employeeLimit,
          branchLimit,
          storageGb,
          trialDays,
          gracePeriodDays,
          description
        },
        currentAdmin.name
      );
    } else {
      platformPlanService.createPlan(
        {
          name: name.trim(),
          priceMonthly,
          priceAnnual,
          currency: 'INR',
          billingCycle: 'monthly',
          employeeLimit,
          branchLimit,
          storageGb,
          features: ['events', 'sub_events', 'crm_customers', 'tasks', 'finance', 'pdf_generator'],
          trialDays,
          gracePeriodDays,
          description,
          isActive: true
        },
        currentAdmin.name
      );
    }

    setIsModalOpen(false);
    triggerRefresh();
  };

  const handleDuplicate = (planId: string) => {
    platformPlanService.duplicatePlan(planId, undefined, currentAdmin.name);
    triggerRefresh();
  };

  const handleToggleActive = (plan: PlatformPlan) => {
    platformPlanService.togglePlanActive(plan.id, !plan.isActive, currentAdmin.name);
    triggerRefresh();
  };

  return (
    <div className="w-full space-y-4 sm:space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <CreditCard className="w-7 h-7 text-indigo-600" />
            SaaS Subscription Plans Manager
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure flat per-studio SaaS tiers, grace periods, quotas, and automated price versioning.
          </p>
        </div>

        {canAdmin('manage_plans') && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" /> Create New Plan
          </button>
        )}
      </div>

      {/* Pricing Guarantee Banner */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div className="text-xs text-indigo-950 leading-relaxed">
          <strong className="font-bold">Grandfathered Pricing & Versioning Rule:</strong> Editing a plan's price creates a new plan version ($$v+1$$). Existing subscribers retain their agreed historical pricing and are never silently charged a higher rate unless explicitly migrated or renegotiated by Master Admin.
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map(plan => {
          const isStandard = plan.id === 'plan_standard_500';

          return (
            <div
              key={plan.id}
              className={`bg-white rounded-2xl border p-5 shadow-sm flex flex-col justify-between transition-all ${
                plan.isActive ? 'border-slate-200 hover:border-indigo-400' : 'border-slate-200/60 opacity-60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-base text-slate-900">{plan.name}</span>
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                      v{plan.version}
                    </span>
                  </div>
                  <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${
                    plan.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {plan.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <p className="text-xs text-slate-500 mt-2 min-h-8">{plan.description}</p>

                {/* Price Display */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-900">₹{plan.priceMonthly}</span>
                  <span className="text-xs text-slate-500 font-semibold">/ month per studio</span>
                </div>
                <div className="text-xs text-indigo-600 font-medium">
                  Annual Option: ₹{plan.priceAnnual} / year
                </div>

                {/* Limits */}
                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-slate-400" /> Max Employees:</span>
                    <span className="font-bold text-slate-800">{plan.employeeLimit}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-slate-400" /> Max Branches:</span>
                    <span className="font-bold text-slate-800">{plan.branchLimit}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-1.5"><HardDrive className="w-3.5 h-3.5 text-slate-400" /> Cloud Storage:</span>
                    <span className="font-bold text-slate-800">{plan.storageGb} GB</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Grace Period:</span>
                    <span className="font-bold text-slate-800">{plan.gracePeriodDays} days</span>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleDuplicate(plan.id)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100"
                  title="Duplicate Plan"
                >
                  <Copy className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2">
                  {canAdmin('manage_plans') && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(plan)}
                        className="text-xs font-semibold text-slate-600 hover:text-slate-800"
                      >
                        {plan.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(plan)}
                        className="px-3 py-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                      >
                        Edit Plan
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Plan Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              {editingPlan ? `Edit Plan: ${editingPlan.name} (Increments Version)` : 'Create New SaaS Plan'}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Plan Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Studio OS Enterprise"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Monthly Price (INR) *</label>
                  <input
                    type="number"
                    value={priceMonthly}
                    onChange={e => setPriceMonthly(Number(e.target.value))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Annual Price (INR) *</label>
                  <input
                    type="number"
                    value={priceAnnual}
                    onChange={e => setPriceAnnual(Number(e.target.value))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Max Staff</label>
                  <input
                    type="number"
                    value={employeeLimit}
                    onChange={e => setEmployeeLimit(Number(e.target.value))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Max Branches</label>
                  <input
                    type="number"
                    value={branchLimit}
                    onChange={e => setBranchLimit(Number(e.target.value))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Storage (GB)</label>
                  <input
                    type="number"
                    value={storageGb}
                    onChange={e => setStorageGb(Number(e.target.value))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Plan Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Target audience and included capabilities..."
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs h-20"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePlan}
                disabled={!name.trim()}
                className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs disabled:opacity-50"
              >
                Save Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
