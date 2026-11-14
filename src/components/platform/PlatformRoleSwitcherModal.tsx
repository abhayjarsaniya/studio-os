import React from 'react';
import { usePlatform } from '../../context/PlatformContext';
import { PlatformRole } from '../../types/schema';
import { X, ShieldAlert, Check } from 'lucide-react';

export const PlatformRoleSwitcherModal: React.FC = () => {
  const { isRoleSwitcherOpen, setIsRoleSwitcherOpen, currentAdmin, setCurrentAdminRole } = usePlatform();

  if (!isRoleSwitcherOpen) return null;

  const roles: { role: PlatformRole; label: string; description: string }[] = [
    {
      role: 'super_admin',
      label: 'Platform Super Admin',
      description: 'Studio OS SaaS Owner. Complete access to all studios, billing, plans, admins, and settings.'
    },
    {
      role: 'platform_admin',
      label: 'Platform Admin',
      description: 'Operations manager. Studio management, subscriptions, revenue, announcements, and support.'
    },
    {
      role: 'billing_manager',
      label: 'Billing Manager',
      description: 'Subscription invoicing, payment reconciliation, offline payments, and plan pricing.'
    },
    {
      role: 'support_manager',
      label: 'Support Manager',
      description: 'Customer assistance, support ticket handling, and announcements. No financial access.'
    },
    {
      role: 'read_only_analyst',
      label: 'Read-Only Analyst',
      description: 'Observer role. Macro SaaS analytics, studio directory view, and audit logs with zero mutation rights.'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="text-sm font-bold">Platform Role Switcher (Dev Mode)</h3>
              <p className="text-[11px] text-slate-300">Test platform RBAC and permission isolation</p>
            </div>
          </div>
          <button
            onClick={() => setIsRoleSwitcherOpen(false)}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-2">
          {roles.map(r => {
            const isSelected = currentAdmin.role === r.role;
            return (
              <div
                key={r.role}
                onClick={() => {
                  setCurrentAdminRole(r.role);
                  setIsRoleSwitcherOpen(false);
                }}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between ${
                  isSelected
                    ? 'bg-indigo-50/70 border-indigo-500 shadow-xs'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{r.label}</span>
                    {isSelected && (
                      <span className="text-[10px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    {r.description}
                  </p>
                </div>
                {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />}
              </div>
            );
          })}
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-100 text-center text-[11px] text-slate-500">
          Studio owners cannot switch to Platform Super Admin in production.
        </div>
      </div>
    </div>
  );
};
