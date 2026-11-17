import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useStudio } from '../../context/StudioContext';
import { featureVisibilityService } from '../../services/featureVisibilityService';
import { CENTRAL_FEATURE_REGISTRY } from '../../services/featureRegistry';
import { 
  Building2, 
  Bell, 
  Shield, 
  Menu, 
  X, 
  LayoutDashboard, 
  Calendar, 
  BookOpen,
  Plus,
  PlusCircle, 
  Users, 
  LogOut,
  Settings,
  ChevronRight,
  Crown
} from 'lucide-react';
import { SaveIndicator } from '../common/SaveIndicator';

export const MobileHeader: React.FC = () => {
  const { 
    currentUser, 
    unreadNotificationsCount, 
    setActiveTab,
    activeTab
  } = useApp();

  const { currentStudio } = useStudio();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const enabledFeatures = CENTRAL_FEATURE_REGISTRY.filter(f => {
    if (['dashboard', 'calendar', 'history', 'bookings'].includes(f.route) || f.id === 'crew' || f.id === 'bookings') return false;
    const access = featureVisibilityService.evaluateFeature(currentStudio.id || 'std_demo_royal', f.id, currentUser.role === 'owner');
    return access.accessible && access.visibleInNav;
  });

  const handleLogout = () => {
    localStorage.removeItem('studio_os_session_token');
    localStorage.removeItem('studio_os_user_role');
    window.location.hash = '#/studio/login';
  };

  return (
    <>
      <header className="sm:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-zinc-200/80 px-4 py-2.5 flex items-center justify-between shadow-2xs">
        {/* Left: Menu button & Studio Branding */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="min-h-[48px] min-w-[48px] p-2.5 rounded-xl text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 flex items-center justify-center cursor-pointer border border-zinc-200/80 shrink-0 touch-manipulation active:scale-95 transition-transform"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5 min-w-0 text-left">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 border border-orange-400/40 text-white flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
              {currentStudio.logoUrl ? (
                <img 
                  src={currentStudio.logoUrl} 
                  alt={currentStudio.name || 'Studio Logo'} 
                  className="w-full h-full object-contain p-0.5 rounded-md"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <Building2 className="w-4 h-4 text-amber-400" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-zinc-900 truncate font-display">
                {currentStudio.name}
              </h1>
              <div className="flex items-center gap-1 text-xs text-zinc-500 font-medium">
                <Shield className="w-3 h-3 text-emerald-600 inline shrink-0" />
                <span className="capitalize truncate">{currentUser.role === 'owner' ? 'Studio Owner' : currentUser.role.replace('_', ' ')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <SaveIndicator />
          <button
            onClick={() => setActiveTab('notifications')}
            className="relative min-w-[48px] min-h-[48px] rounded-xl border border-zinc-200 flex items-center justify-center text-zinc-700 bg-zinc-50 active:scale-95 cursor-pointer touch-manipulation"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-rose-500" />
            )}
          </button>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex sm:hidden">
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-xs" 
            onClick={() => setMobileDrawerOpen(false)} 
          />
          <div className="relative z-10 w-72 h-full bg-white flex flex-col shadow-2xl border-r border-zinc-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/60">
              <div>
                <h3 className="font-bold text-base text-zinc-900 font-display">{currentStudio.name}</h3>
                <p className="text-xs text-zinc-500">Navigation & Additional Features</p>
              </div>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="min-h-[48px] min-w-[48px] p-2 rounded-lg text-zinc-500 hover:text-zinc-900 flex items-center justify-center cursor-pointer touch-manipulation active:scale-95"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nav list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 touch-scroll">
              <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider px-3 py-1">Core Modules</div>
              {/* Primary Action: New Booking */}
              <div className="pb-2">
                <button
                  onClick={() => {
                    setActiveTab('create-booking');
                    setMobileDrawerOpen(false);
                    window.location.hash = '#/app/bookings/new';
                  }}
                  className="w-full min-h-[48px] px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 touch-manipulation bg-gradient-to-r from-orange-500 via-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md shadow-orange-500/25 border border-orange-400/30 cursor-pointer active:scale-[0.98] transition-all"
                >
                  <Plus className="w-4 h-4 text-white stroke-[2.5]" />
                  <span>+ New Booking</span>
                </button>
              </div>

              {/* 1. Dashboard */}
              <button
                onClick={() => {
                  setActiveTab('dashboard');
                  setMobileDrawerOpen(false);
                  window.location.hash = '#/app/dashboard';
                }}
                className={`w-full min-h-[48px] px-3.5 py-3 rounded-xl text-sm font-semibold flex items-center gap-3 touch-manipulation transition-colors ${
                  activeTab === 'dashboard' ? 'text-orange-600 font-bold bg-orange-50/60' : 'text-zinc-700 hover:bg-zinc-100/70'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-zinc-600" />
                <span>Dashboard</span>
              </button>

              {/* 2. Calendar */}
              <button
                onClick={() => {
                  setActiveTab('calendar');
                  setMobileDrawerOpen(false);
                  window.location.hash = '#/app/calendar';
                }}
                className={`w-full min-h-[48px] px-3.5 py-3 rounded-xl text-sm font-semibold flex items-center gap-3 touch-manipulation transition-colors ${
                  activeTab === 'calendar' ? 'text-orange-600 font-bold bg-orange-50/60' : 'text-zinc-700 hover:bg-zinc-100/70'
                }`}
              >
                <Calendar className="w-4 h-4 text-zinc-600" />
                <span>Calendar</span>
              </button>

              {/* 3. Bookings (Replaces separate History Bookings) */}
              <button
                onClick={() => {
                  setActiveTab('bookings');
                  setMobileDrawerOpen(false);
                  window.location.hash = '#/app/bookings';
                }}
                className={`w-full min-h-[48px] px-3.5 py-3 rounded-xl text-sm font-semibold flex items-center gap-3 touch-manipulation transition-colors ${
                  activeTab === 'bookings' || activeTab === 'history' ? 'text-orange-600 font-bold bg-orange-50/60' : 'text-zinc-700 hover:bg-zinc-100/70'
                }`}
              >
                <BookOpen className="w-4 h-4 text-zinc-600" />
                <span>Bookings</span>
              </button>

              {/* 4. Crew Members */}
              <button
                onClick={() => {
                  setActiveTab('crew');
                  setMobileDrawerOpen(false);
                  window.location.hash = '#/app/crew';
                }}
                className={`w-full min-h-[48px] px-3.5 py-3 rounded-xl text-sm font-semibold flex items-center gap-3 touch-manipulation transition-colors ${
                  activeTab === 'crew' ? 'text-orange-600 font-bold bg-orange-50/60' : 'text-zinc-700 hover:bg-zinc-100/70'
                }`}
              >
                <Users className="w-4 h-4 text-zinc-600" />
                <span>Crew Members</span>
              </button>

              {/* Master Admin Enabled Features */}
              {enabledFeatures.map(feat => (
                <button
                  key={feat.id}
                  onClick={() => {
                    setActiveTab(feat.route as any);
                    setMobileDrawerOpen(false);
                    window.location.hash = `#/app/${feat.route}`;
                  }}
                  className={`w-full min-h-[48px] px-3.5 py-3 rounded-xl text-sm font-semibold flex items-center justify-between touch-manipulation ${
                    activeTab === feat.route ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold shadow-xs' : 'text-zinc-700 hover:bg-orange-50/50'
                  }`}
                >
                  <span className="truncate">{feat.name}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                </button>
              ))}
            </div>

            {/* Footer / Logout */}
            <div className="p-3 border-t border-zinc-100 bg-zinc-50/50">
              <button
                onClick={handleLogout}
                className="w-full min-h-[48px] flex items-center justify-center gap-2 px-3 py-2 text-sm font-bold rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-zinc-200 touch-manipulation active:scale-98 transition-transform cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out of Studio</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
