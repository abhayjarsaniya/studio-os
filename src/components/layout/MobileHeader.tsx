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
  History,
  PlusCircle, 
  Users, 
  LogOut,
  Settings,
  ChevronRight
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
    if (['dashboard', 'calendar', 'history'].includes(f.route) || f.id === 'crew') return false;
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
              <h1 className="text-xs font-bold text-zinc-900 truncate font-display">
                {currentStudio.name}
              </h1>
              <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-medium">
                <Shield className="w-2.5 h-2.5 text-emerald-600 inline shrink-0" />
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
                <h3 className="font-bold text-sm text-zinc-900 font-display">{currentStudio.name}</h3>
                <p className="text-[10px] text-zinc-500">Navigation & Additional Features</p>
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
              <div className="text-[10px] font-bold text-zinc-400 uppercase px-3 py-1">Core Modules</div>
              
              <button
                onClick={() => {
                  setActiveTab('dashboard');
                  setMobileDrawerOpen(false);
                  window.location.hash = '#/app/dashboard';
                }}
                className={`w-full min-h-[48px] px-3.5 py-3 rounded-xl text-xs font-semibold flex items-center gap-3 touch-manipulation ${
                  activeTab === 'dashboard' ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold shadow-xs' : 'text-zinc-700 hover:bg-orange-50/50'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('calendar');
                  setMobileDrawerOpen(false);
                  window.location.hash = '#/app/calendar';
                }}
                className={`w-full min-h-[48px] px-3.5 py-3 rounded-xl text-xs font-semibold flex items-center gap-3 touch-manipulation ${
                  activeTab === 'calendar' ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold shadow-xs' : 'text-zinc-700 hover:bg-orange-50/50'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Calendar</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('history');
                  setMobileDrawerOpen(false);
                  window.location.hash = '#/app/history';
                }}
                className={`w-full min-h-[48px] px-3.5 py-3 rounded-xl text-xs font-semibold flex items-center gap-3 touch-manipulation ${
                  activeTab === 'history' ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold shadow-xs' : 'text-zinc-700 hover:bg-orange-50/50'
                }`}
              >
                <History className="w-4 h-4 text-amber-600" />
                <span>History Bookings</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('create-booking');
                  setMobileDrawerOpen(false);
                  window.location.hash = '#/app/bookings/new';
                }}
                className={`w-full min-h-[48px] px-3.5 py-3 rounded-xl text-xs font-semibold flex items-center gap-3 touch-manipulation ${
                  activeTab === 'create-booking' || activeTab === 'new-booking' ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold shadow-xs' : 'text-zinc-700 hover:bg-orange-50/50'
                }`}
              >
                <PlusCircle className="w-4 h-4 text-emerald-600" />
                <span>New Event Booking</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('crew');
                  setMobileDrawerOpen(false);
                  window.location.hash = '#/app/crew';
                }}
                className={`w-full min-h-[48px] px-3.5 py-3 rounded-xl text-xs font-semibold flex items-center gap-3 touch-manipulation ${
                  activeTab === 'crew' ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold shadow-xs' : 'text-zinc-700 hover:bg-orange-50/50'
                }`}
              >
                <Users className="w-4 h-4 text-indigo-600" />
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
                  className={`w-full min-h-[48px] px-3.5 py-3 rounded-xl text-xs font-semibold flex items-center justify-between touch-manipulation ${
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
                className="w-full min-h-[48px] flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-zinc-200 touch-manipulation active:scale-98 transition-transform"
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
