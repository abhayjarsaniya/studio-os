import React, { useState } from 'react';
import { MasterSidebar } from './MasterSidebar';
import { useMasterAdmin } from '../../context/MasterAdminContext';
import { masterAdminService } from '../../services/masterAdminService';
import { 
  Building2, 
  IndianRupee, 
  Activity, 
  Menu, 
  X, 
  RefreshCw
} from 'lucide-react';

export const MasterLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { currentAdmin, triggerRefresh, refreshTrigger } = useMasterAdmin();
  const kpis = React.useMemo(() => masterAdminService.getDashboardKPIs(), [refreshTrigger]);

  return (
    <div className="flex h-screen w-full bg-zinc-50/70 text-zinc-900 font-sans overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex shrink-0">
        <MasterSidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-xs" 
            onClick={() => setMobileMenuOpen(false)} 
          />
          <div className="relative z-10 w-64 h-full bg-white flex flex-col shadow-2xl border-r border-zinc-200">
            <div className="p-3 flex justify-end border-b border-zinc-100">
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[44px] min-w-[44px] p-2 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 flex items-center justify-center cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto" onClick={() => setMobileMenuOpen(false)}>
              <MasterSidebar />
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-zinc-50/70">
        {/* Master Status & Header Bar */}
        <header className="h-16 border-b border-zinc-200/90 bg-white/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden min-h-[44px] min-w-[44px] p-2 rounded-xl text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 flex items-center justify-center cursor-pointer border border-zinc-200/80"
              aria-label="Open mobile menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-zinc-800 uppercase tracking-wider hidden sm:inline font-display">
                Master Control Center
              </span>
            </div>
          </div>

          {/* Platform Status Indicators */}
          <div className="flex items-center gap-2 sm:gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 shadow-2xs">
              <Building2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="font-semibold truncate">{kpis.activeStudios} Studios</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 shadow-2xs">
              <IndianRupee className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="font-semibold truncate">₹{kpis.platformMrr.toLocaleString('en-IN')}</span>
            </div>

            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 shadow-2xs">
              <Activity className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="font-semibold">Health: 99.98%</span>
            </div>

            <button
              onClick={() => triggerRefresh()}
              title="Refresh Data"
              className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors border border-zinc-200 flex items-center justify-center cursor-pointer bg-white"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8 bg-zinc-50/70 text-zinc-900">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
