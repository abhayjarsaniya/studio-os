import React from 'react';
import { useApp } from '../../context/AppContext';
import { useStudio } from '../../context/StudioContext';
import { Search, Bell, Shield, Sparkles, Building2 } from 'lucide-react';
import { SaveIndicator } from '../common/SaveIndicator';

export const DesktopHeader: React.FC = () => {
  const { 
    globalSearchQuery, 
    setGlobalSearchQuery, 
    unreadNotificationsCount,
    setActiveTab,
    currentUser
  } = useApp();

  const { currentStudio, setIsStudioSwitcherOpen } = useStudio();

  return (
    <header className="h-16 border-b border-zinc-200/80 bg-white/90 backdrop-blur-md px-6 flex items-center justify-between gap-4 sticky top-0 z-20">
      {/* Global Search Bar */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={globalSearchQuery}
            onChange={(e) => setGlobalSearchQuery(e.target.value)}
            placeholder={`Search ${currentStudio.name} shoots, clients, venues...`}
            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all"
          />
          {globalSearchQuery && (
            <button
              onClick={() => setGlobalSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-700"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-2.5">
        {/* Real-Time Cloud Save Status Indicator */}
        <SaveIndicator />

        {/* Studio Workspace Pill */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs font-medium text-zinc-800 shadow-2xs"
          title="Active photography studio workspace"
        >
          <Building2 className="w-3.5 h-3.5 text-zinc-600" />
          <span className="truncate max-w-[150px] font-semibold text-zinc-900">{currentStudio.name}</span>
        </div>

        {/* Quick Quotation Header Button */}
        <button
          onClick={() => setActiveTab('create-quotation')}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Quick Quotation</span>
        </button>

        {/* Authenticated User Role Badge (Non-clickable, derived from backend membership) */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs font-medium text-zinc-700">
          <Shield className="w-3.5 h-3.5 text-emerald-600" />
          <span>Role: <strong className="capitalize text-zinc-900">{currentUser.role.replace('_', ' ')}</strong></span>
        </div>

        {/* Notification Bell */}
        <button
          onClick={() => setActiveTab('notifications')}
          className="relative w-10 h-10 rounded-xl border border-zinc-200 flex items-center justify-center text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-colors cursor-pointer"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
          )}
        </button>
      </div>
    </header>
  );
};
