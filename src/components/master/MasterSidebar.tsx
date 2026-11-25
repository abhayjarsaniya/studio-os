import React from 'react';
import { useMasterAdmin } from '../../context/MasterAdminContext';
import { 
  LayoutDashboard, 
  Building2, 
  CreditCard, 
  Layers, 
  ShieldAlert, 
  ToggleRight, 
  BarChart3, 
  FileText, 
  Settings, 
  LogOut,
  Users,
  Crown,
  FileSpreadsheet,
  UserCheck,
  Receipt,
  Truck,
  Bell,
  Repeat
} from 'lucide-react';

export const MasterSidebar: React.FC = () => {
  const { masterRoute, setMasterRoute, currentAdmin } = useMasterAdmin();

  // Master Platform Modules (unprefixed labels)
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'studios', label: 'Studios Directory', icon: Building2 },
    { id: 'accounts', label: 'Studio Accounts', icon: Users },
    { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
    { id: 'autopay', label: 'AutoPay Management', icon: Repeat },
    { id: 'transactions', label: 'Payments & Transactions', icon: Receipt },
    { id: 'plans', label: 'Billing Plans', icon: Layers },
    { id: 'roles-permissions', label: 'Roles & Permissions', icon: ShieldAlert },
    { id: 'features', label: 'Feature Visibility', icon: ToggleRight },
    { id: 'customer-reports', label: 'Customer & Event Reports', icon: FileSpreadsheet },
    { id: 'analytics', label: 'Finance & Revenue Analytics', icon: BarChart3 },
    { id: 'team-reports', label: 'Team & Attendance Reports', icon: UserCheck },
    { id: 'payroll', label: 'Payroll Administration', icon: Receipt },
    { id: 'suppliers', label: 'Supplier Administration', icon: Truck },
    { id: 'reports', label: 'Report Center', icon: FileText },
    { id: 'notifications', label: 'Platform Notifications', icon: Bell },
    { id: 'settings', label: 'Settings & Audit Logs', icon: Settings }
  ];

  const handleLogout = () => {
    localStorage.removeItem('studio_os_master_token');
    window.location.hash = '#/master/login';
  };

  return (
    <aside className="w-64 bg-white text-zinc-900 flex flex-col h-screen border-r border-zinc-200 shrink-0 select-none shadow-2xs font-sans">
      {/* Brand & Platform Identity */}
      <div className="p-4 border-b border-zinc-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 border border-orange-400/40 flex items-center justify-center text-white shadow-xs">
            <Crown className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-black tracking-tight text-zinc-900 flex items-center gap-1.5 font-display">
              <span>Studio OS</span>
              <span className="text-xs font-bold uppercase px-1.5 py-0.5 rounded bg-orange-50 text-orange-800 border border-orange-200">
                Master
              </span>
            </div>
            <div className="text-xs text-zinc-500 font-medium truncate">Platform Master Control</div>
          </div>
        </div>
      </div>

      {/* Admin Profile Pill */}
      <div className="px-3.5 py-3 border-b border-zinc-100 bg-zinc-50/70">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-zinc-200 border border-zinc-300 flex items-center justify-center text-zinc-800 font-bold text-xs shrink-0">
            MA
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-zinc-900 truncate">{currentAdmin.name}</div>
            <div className="text-xs text-orange-700 font-medium truncate">Platform Owner (Level 1)</div>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-2.5 py-3.5 space-y-1 overflow-y-auto">
        <div className="px-2 py-1 text-xs font-bold uppercase tracking-wider text-zinc-400">
          Platform Modules
        </div>

        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = masterRoute === item.id || 
            (item.id === 'studios' && (masterRoute === 'studio-detail' || masterRoute === 'studio-roles-overrides' || masterRoute === 'studio-features')) ||
            (item.id === 'settings' && masterRoute === 'audit-logs');

          return (
            <button
              key={item.id}
              onClick={() => {
                setMasterRoute(item.id);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13.5px] font-semibold transition-all text-left min-h-[44px] cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-orange-50/50'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-zinc-500'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div className="p-3 border-t border-zinc-100 bg-zinc-50/50">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl bg-white hover:bg-rose-50 hover:text-rose-700 text-zinc-700 border border-zinc-200 hover:border-rose-200 transition-all shadow-2xs min-h-[44px] cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Log Out</span>
        </button>
        <div className="mt-2 text-xs text-center text-zinc-400 font-mono">
          Studio OS Enterprise v2.4
        </div>
      </div>
    </aside>
  );
};
