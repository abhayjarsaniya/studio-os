import React, { useState } from 'react';
import { useMasterAdmin } from '../../context/MasterAdminContext';
import { 
  Layers, 
  Check, 
  IndianRupee, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  Crown,
  Edit2
} from 'lucide-react';

export const MasterPlansPage: React.FC = () => {
  const { setMasterRoute } = useMasterAdmin();
  const [plans, setPlans] = useState([
    {
      id: 'starter',
      name: 'Studio OS Standard / Starter',
      priceMonthly: 500,
      priceAnnual: 5000,
      employeeLimit: 25,
      eventsPerMonth: 100,
      storageGb: 50,
      features: ['CRM & Leads', 'WhatsApp Direct', 'GST Invoicing & PDF', 'Event Schedules', 'Team & Leaves', 'Standard RBAC'],
      support: 'Standard Email & WhatsApp',
      isPublic: true,
      status: 'active',
      isDefaultPreserved: true
    },
    {
      id: 'professional',
      name: 'Studio OS Professional',
      priceMonthly: 1500,
      priceAnnual: 15000,
      employeeLimit: 50,
      eventsPerMonth: 300,
      storageGb: 200,
      features: ['All Standard Features', 'Multi-Branch Management', 'Advanced 12-Stage Pipelines', 'External Supplier Portal', 'Custom Role Templates'],
      support: 'Priority WhatsApp Support',
      isPublic: true,
      status: 'active',
      isDefaultPreserved: false
    },
    {
      id: 'enterprise',
      name: 'Studio OS Enterprise',
      priceMonthly: 3500,
      priceAnnual: 35000,
      employeeLimit: 150,
      eventsPerMonth: 1000,
      storageGb: 1000,
      features: ['All Professional Features', 'Unlimited Multi-Branch Hubs', 'Cross-Studio Crew Collaboration', 'Dedicated Audit Vault', 'Automated Daily Backups'],
      support: 'Dedicated Account Manager',
      isPublic: true,
      status: 'active',
      isDefaultPreserved: false
    },
    {
      id: 'custom',
      name: 'Custom Enterprise Agreement',
      priceMonthly: 0,
      priceAnnual: 0,
      employeeLimit: 500,
      eventsPerMonth: 5000,
      storageGb: 5000,
      features: ['Bespoke Custom ERP Architecture', 'White-Label Branding', 'Custom SLA Guarantee', 'Dedicated Cloud Infrastructure'],
      support: '24/7 Phone & Direct Engineer SLA',
      isPublic: false,
      status: 'active',
      isDefaultPreserved: false
    }
  ]);

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
              SaaS Billing Governance
            </span>
            <span className="text-xs text-zinc-500">Preserved ₹500/mo Standard Plan</span>
          </div>
          <h1 className="text-2xl font-black text-zinc-900 font-display tracking-tight mt-1">
            Subscription Plans Management
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Configure platform pricing tiers, storage quotas, employee limits, and feature entitlements.
          </p>
        </div>

        <button
          onClick={() => setMasterRoute('subscriptions')}
          className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md shadow-amber-500/20 transition-all"
        >
          View Active Studio Subscriptions
        </button>
      </div>

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map(plan => (
          <div 
            key={plan.id}
            className={`bg-white rounded-2xl border p-5 flex flex-col justify-between shadow-xl relative ${
              plan.isDefaultPreserved ? 'border-amber-500/50 ring-1 ring-amber-500/30' : 'border-zinc-200'
            }`}
          >
            {plan.isDefaultPreserved && (
              <span className="absolute -top-3 left-4 px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500 text-zinc-950">
                Core Standard (Preserved)
              </span>
            )}

            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider">{plan.name}</span>
                {plan.id === 'enterprise' ? <Crown className="w-4 h-4 text-amber-400" /> : <Zap className="w-4 h-4 text-indigo-400" />}
              </div>

              <div className="mt-4 mb-4">
                {plan.priceMonthly > 0 ? (
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-zinc-900 font-display font-mono">₹{plan.priceMonthly.toLocaleString('en-IN')}</span>
                    <span className="text-xs text-zinc-500">/ month</span>
                  </div>
                ) : (
                  <div className="text-2xl font-black text-amber-400">Custom Pricing</div>
                )}
                {plan.priceAnnual > 0 && (
                  <div className="text-xs text-emerald-400 mt-0.5">
                    ₹{plan.priceAnnual.toLocaleString('en-IN')} / year (Save 2 months)
                  </div>
                )}
              </div>

              {/* Quotas */}
              <div className="space-y-1.5 py-3 border-y border-zinc-200 text-xs">
                <div className="flex justify-between text-zinc-700">
                  <span className="text-zinc-400">Max Employees:</span>
                  <strong>{plan.employeeLimit} Staff</strong>
                </div>
                <div className="flex justify-between text-zinc-700">
                  <span className="text-zinc-400">Events / Month:</span>
                  <strong>{plan.eventsPerMonth} Shoots</strong>
                </div>
                <div className="flex justify-between text-zinc-700">
                  <span className="text-zinc-400">Cloud Storage:</span>
                  <strong>{plan.storageGb} GB</strong>
                </div>
              </div>

              {/* Features */}
              <div className="mt-4 space-y-2 text-xs">
                <div className="text-xs font-bold uppercase tracking-wider text-zinc-500">Included Features</div>
                {plan.features.map(f => (
                  <div key={f} className="flex items-center gap-2 text-zinc-700 text-xs">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-zinc-200">
              <div className="text-xs text-zinc-400 text-center">
                Support: {plan.support}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
