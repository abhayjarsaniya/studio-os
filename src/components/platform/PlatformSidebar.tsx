import React from 'react';
import { usePlatform } from '../../context/PlatformContext';
import { 
  LayoutDashboard, 
  Building2, 
  Layers, 
  CreditCard, 
  FileText, 
  TrendingUp, 
  Sliders, 
  Megaphone, 
  LifeBuoy, 
  Users, 
  ShieldCheck, 
  Settings, 
  LogOut, 
  ChevronRight,
  Shield,
  Receipt,
  Calendar
} from 'lucide-react';

interface SidebarItemProps {
  id: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number | string;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ id, icon, label, active, onClick, badge }) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
      active
        ? 'bg-indigo-600 text-white shadow-xs'
        : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
    }`}
  >
    <div className="flex items-center gap-2.5">
      <span className={active ? 'text-white' : 'text-slate-400'}>{icon}</span>
      <span>{label}</span>
    </div>
    {badge !== undefined && (
      <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
        active ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'
      }`}>
        {badge}
      </span>
    )}
  </button>
);

export const PlatformSidebar: React.FC = () => {
  const { 
    platformRoute, 
    setPlatformRoute, 
    currentAdmin, 
    setIsRoleSwitcherOpen,
    canAdmin 
  } = usePlatform();

  return (
    <aside className="w-64 bg-slate-950 text-white border-r border-slate-800 flex flex-col h-screen shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800 flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-indigo-600/30">
          OS
        </div>
        <div>
          <div className="font-extrabold text-sm tracking-tight text-white flex items-center gap-1.5">
            Studio OS
            <span className="text-xs font-black uppercase px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              SaaS Admin
            </span>
          </div>
          <p className="text-xs text-slate-400">Multi-Tenant Platform Console</p>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Core SaaS */}
        <div className="space-y-1">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 px-3 pb-1">
            Core Platform
          </div>
          <SidebarItem
            id="dashboard"
            icon={<LayoutDashboard className="w-4 h-4" />}
            label="Master Admin Dashboard"
            active={platformRoute === 'dashboard'}
            onClick={() => setPlatformRoute('dashboard')}
          />
          {canAdmin('view_studios') && (
            <>
              <SidebarItem
                id="studios"
                icon={<Building2 className="w-4 h-4" />}
                label="Photography Studios"
                active={platformRoute === 'studios' || platformRoute === 'studio-detail'}
                onClick={() => setPlatformRoute('studios')}
              />
              <SidebarItem
                id="events"
                icon={<Calendar className="w-4 h-4" />}
                label="All Studio Events"
                active={platformRoute === 'events'}
                onClick={() => setPlatformRoute('events')}
              />
            </>
          )}
          {canAdmin('view_subscriptions') && (
            <SidebarItem
              id="subscriptions"
              icon={<Layers className="w-4 h-4" />}
              label="SaaS Subscriptions"
              active={platformRoute === 'subscriptions'}
              onClick={() => setPlatformRoute('subscriptions')}
            />
          )}
          {canAdmin('manage_plans') && (
            <SidebarItem
              id="plans"
              icon={<CreditCard className="w-4 h-4" />}
              label="Subscription Plans"
              active={platformRoute === 'plans'}
              onClick={() => setPlatformRoute('plans')}
            />
          )}
        </div>

        {/* Finance & Revenue */}
        <div className="space-y-1">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 px-3 pb-1">
            Finance & Billing
          </div>
          {canAdmin('view_revenue') && (
            <SidebarItem
              id="billing"
              icon={<Receipt className="w-4 h-4" />}
              label="Platform Invoices"
              active={platformRoute === 'billing'}
              onClick={() => setPlatformRoute('billing')}
            />
          )}
          {canAdmin('record_payments') && (
            <SidebarItem
              id="payments"
              icon={<FileText className="w-4 h-4" />}
              label="Payments & Offline"
              active={platformRoute === 'payments'}
              onClick={() => setPlatformRoute('payments')}
            />
          )}
          {canAdmin('view_revenue') && (
            <SidebarItem
              id="analytics"
              icon={<TrendingUp className="w-4 h-4" />}
              label="SaaS Revenue Analytics"
              active={platformRoute === 'analytics'}
              onClick={() => setPlatformRoute('analytics')}
            />
          )}
        </div>

        {/* Governance & Support */}
        <div className="space-y-1">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 px-3 pb-1">
            Platform Operations
          </div>
          {canAdmin('manage_settings') && (
            <SidebarItem
              id="features"
              icon={<Sliders className="w-4 h-4" />}
              label="Feature Catalog"
              active={platformRoute === 'features'}
              onClick={() => setPlatformRoute('features')}
            />
          )}
          {canAdmin('manage_announcements') && (
            <SidebarItem
              id="announcements"
              icon={<Megaphone className="w-4 h-4" />}
              label="Announcements"
              active={platformRoute === 'announcements'}
              onClick={() => setPlatformRoute('announcements')}
            />
          )}
          {canAdmin('manage_support') && (
            <SidebarItem
              id="support"
              icon={<LifeBuoy className="w-4 h-4" />}
              label="Support Tickets"
              active={platformRoute === 'support'}
              onClick={() => setPlatformRoute('support')}
            />
          )}
          {canAdmin('manage_admins') && (
            <SidebarItem
              id="admins"
              icon={<Users className="w-4 h-4" />}
              label="Platform Admins"
              active={platformRoute === 'admins'}
              onClick={() => setPlatformRoute('admins')}
            />
          )}
          {canAdmin('view_audit_logs') && (
            <SidebarItem
              id="audit-logs"
              icon={<ShieldCheck className="w-4 h-4" />}
              label="Platform Audit Logs"
              active={platformRoute === 'audit-logs'}
              onClick={() => setPlatformRoute('audit-logs')}
            />
          )}
          {canAdmin('manage_settings') && (
            <SidebarItem
              id="settings"
              icon={<Settings className="w-4 h-4" />}
              label="Platform Settings"
              active={platformRoute === 'settings'}
              onClick={() => setPlatformRoute('settings')}
            />
          )}
        </div>
      </div>

      {/* Switch to Tenant Studio Workspace */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/60">
        <a
          href="#/app/dashboard"
          className="w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 transition-colors"
        >
          <div className="flex items-center gap-2">
            <LogOut className="w-4 h-4 text-slate-400" />
            <span>Open Studio Workspace</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
        </a>
      </div>

      {/* Authenticated Platform Admin User Info */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-900">
        <div className="w-full flex items-center justify-between p-2 rounded-xl border border-slate-800 bg-slate-800/40">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30">
              <Shield className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">{currentAdmin.name}</div>
              <div className="text-xs text-indigo-300 truncate capitalize">
                {currentAdmin.role.replace('_', ' ')}
              </div>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded">
            Auth
          </span>
        </div>
      </div>
    </aside>
  );
};
