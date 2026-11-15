import React, { useState } from 'react';
import { usePlatform } from '../../context/PlatformContext';
import { PlatformSidebar } from './PlatformSidebar';
import { 
  Menu, 
  X, 
  ShieldAlert, 
  ShieldCheck, 
  Building2, 
  ExternalLink,
  ChevronRight
} from 'lucide-react';

export const PlatformLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentAdmin, setIsRoleSwitcherOpen, platformRoute, setPlatformRoute } = usePlatform();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 overflow-hidden font-sans">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex shrink-0">
        <PlatformSidebar />
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs" 
            onClick={() => setIsMobileMenuOpen(false)} 
          />
          <div className="relative w-72 max-w-[85vw] bg-slate-950 flex flex-col h-full z-10 shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="p-3 border-b border-slate-800 flex justify-end">
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto" onClick={() => setIsMobileMenuOpen(false)}>
              <PlatformSidebar />
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-14 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                Platform Master Admin
              </span>
              <span className="text-xs text-slate-400 hidden sm:inline">•</span>
              <span className="text-xs text-slate-500 hidden sm:inline capitalize">
                {platformRoute.replace('-', ' ')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200 inline-flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Role:</span>
              <span className="capitalize">{currentAdmin.role.replace('_', ' ')}</span>
            </div>

            <a
              href="#/app/dashboard"
              className="text-xs font-semibold text-slate-600 hover:text-indigo-600 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 hover:border-indigo-200 transition-colors"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Studio Workspace</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
};
