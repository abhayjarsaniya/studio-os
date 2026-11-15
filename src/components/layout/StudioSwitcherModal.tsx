import React from 'react';
import { useStudio } from '../../context/StudioContext';
import { Modal } from '../ui/Modal';
import { Building2, CheckCircle2, ShieldCheck, MapPin, Sparkles, Plus } from 'lucide-react';

export const StudioSwitcherModal: React.FC = () => {
  const { 
    isStudioSwitcherOpen, 
    setIsStudioSwitcherOpen, 
    availableStudios, 
    currentStudio, 
    switchStudio,
    branches
  } = useStudio();

  return (
    <Modal
      isOpen={isStudioSwitcherOpen}
      onClose={() => setIsStudioSwitcherOpen(false)}
      title="Multi-Tenant Studio Switcher"
      subtitle="Switch between independent photography studio tenants to test complete data isolation."
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Architecture Note */}
        <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200/80 flex items-start gap-3 text-xs text-emerald-900 leading-relaxed">
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold">Tenant Isolation Guarantee:</strong> Each studio maintains its own independent database partition (customers, events, branches, team crew, tasks, and settings). No data leaks across studios.
          </div>
        </div>

        {/* Studio Cards List */}
        <div className="space-y-3">
          {availableStudios.map(s => {
            const isSelected = currentStudio.id === s.id;

            return (
              <div
                key={s.id}
                onClick={() => {
                  switchStudio(s.id);
                  setIsStudioSwitcherOpen(false);
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                  isSelected
                    ? 'border-zinc-900 bg-zinc-900/5 shadow-xs ring-1 ring-zinc-900'
                    : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-zinc-900 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-zinc-900 truncate font-display">
                        {s.name}
                      </h4>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {s.subscription.status}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{s.tagline}</p>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 mt-2">
                      <span className="flex items-center gap-1 font-medium text-zinc-700">
                        <MapPin className="w-3 h-3 text-zinc-400" />
                        {s.city}
                      </span>
                      <span className="text-zinc-400">•</span>
                      <span className="font-mono text-zinc-400 text-xs">
                        ID: {s.id}
                      </span>
                      <span className="text-zinc-400">•</span>
                      <span className="text-xs text-zinc-500">
                        ₹{s.subscription.pricePerMonth}/mo
                      </span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 mt-1">
                  {isSelected ? (
                    <CheckCircle2 className="w-5 h-5 text-zinc-900 fill-zinc-900/10" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-zinc-300" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Multi-branch info for active studio */}
        <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/70 text-xs text-zinc-600">
          <strong className="text-zinc-900 block mb-1">
            Active Studio Branches ({branches.length}):
          </strong>
          <div className="flex flex-wrap gap-1.5">
            {branches.map(b => (
              <span key={b.id} className="px-2 py-0.5 bg-white border border-zinc-200 rounded text-xs font-medium text-zinc-700">
                {b.name} ({b.city})
              </span>
            ))}
            {branches.length === 0 && <span className="text-zinc-400 italic">No branches configured</span>}
          </div>
        </div>

        <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-400 font-mono">
          <span>Active Tenant: {currentStudio.tenantId}</span>
          <span className="text-xs text-zinc-500">SaaS Multi-Tenant Mode</span>
        </div>
      </div>
    </Modal>
  );
};
