import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useStudio } from '../../context/StudioContext';
import { 
  LayoutDashboard, 
  Calendar, 
  BookOpen,
  PlusCircle, 
  Users, 
  Building2, 
  MapPin, 
  ShieldCheck, 
  LogOut,
  Settings as SettingsIcon,
  X
} from 'lucide-react';
import { SettingsPage } from '../../pages/SettingsPage';

interface SidebarItemProps {
  id: string;
  icon: React.ReactNode;
  label: string;
  badge?: number | string;
  active: boolean;
  onClick: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({
  icon,
  label,
  badge,
  active,
  onClick
}) => {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13.5px] font-semibold transition-all group select-none min-h-[44px] cursor-pointer ${
        active 
          ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-xs font-bold' 
          : 'text-zinc-600 hover:text-zinc-900 hover:bg-orange-50/50'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className={`shrink-0 transition-transform ${active ? 'text-white' : 'text-zinc-500 group-hover:text-orange-600'}`}>
          {icon}
        </span>
        <span className="truncate">{label}</span>
      </div>

      {badge !== undefined && (
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${
          active 
            ? 'bg-white/20 text-white' 
            : 'bg-zinc-200/80 text-zinc-700'
        }`}>
          {badge}
        </span>
      )}
    </button>
  );
};

export const DesktopSidebar: React.FC = () => {
  const { 
    studio, 
    activeTab, 
    setActiveTab, 
    currentUser 
  } = useApp();

  const { branches, currentStudio } = useStudio();
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('studio_os_session_token');
    localStorage.removeItem('studio_os_user_role');
    window.location.hash = '#/studio/login';
  };

  return (
    <>
      <aside className="w-64 border-r border-zinc-200/90 bg-white flex flex-col h-screen shrink-0 select-none font-sans">
        {/* Brand Header */}
        <div className="p-3 border-b border-zinc-100">
          <div className="w-full flex items-center justify-between p-2.5 rounded-xl border border-zinc-200/80 bg-zinc-50/70 shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 border border-orange-400/40 text-white flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
                {currentStudio.logoUrl || studio.logo ? (
                  <img 
                    src={currentStudio.logoUrl || studio.logo} 
                    alt={studio.name || 'Studio Logo'} 
                    className="w-full h-full object-contain p-0.5 rounded-lg"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <Building2 className="w-5 h-5 text-amber-400" />
                )}
              </div>
              <div className="min-w-0">
                <h1 className="font-bold text-sm tracking-tight text-zinc-900 truncate font-display">
                  {studio.name || currentStudio.name}
                </h1>
                <p className="text-xs text-zinc-500 truncate flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 text-zinc-400 shrink-0" />
                  <span>{branches.length > 0 ? `${branches.length} Branches` : 'Main Branch'} • {(studio.city || currentStudio.city || 'Studio').split(',')[0]}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Action: New Booking */}
        <div className="px-3 pt-3">
          <button
            onClick={() => {
              setActiveTab('create-booking');
              window.location.hash = '#/app/bookings/new';
            }}
            className="w-full min-h-[46px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-[13.5px] font-bold shadow-xs shadow-orange-500/20 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-white" />
            <span>+ New Booking</span>
          </button>
        </div>

        {/* Primary Studio Navigation: Strictly 4 Core Modules */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          <div className="text-xs font-bold tracking-wider text-zinc-400 uppercase px-3 pb-1">
            Studio Menu
          </div>

          {/* 1. Dashboard */}
          <SidebarItem
            id="dashboard"
            icon={<LayoutDashboard className="w-4 h-4" />}
            label="Dashboard"
            active={activeTab === 'dashboard'}
            onClick={() => {
              setActiveTab('dashboard');
              window.location.hash = '#/app/dashboard';
            }}
          />

          {/* 2. Calendar */}
          <SidebarItem
            id="calendar"
            icon={<Calendar className="w-4 h-4" />}
            label="Calendar"
            active={activeTab === 'calendar'}
            onClick={() => {
              setActiveTab('calendar');
              window.location.hash = '#/app/calendar';
            }}
          />

          {/* 3. Bookings */}
          <SidebarItem
            id="bookings"
            icon={<BookOpen className="w-4 h-4 text-amber-600" />}
            label="Bookings"
            active={activeTab === 'bookings' || activeTab === 'history'}
            onClick={() => {
              setActiveTab('bookings');
              window.location.hash = '#/app/bookings';
            }}
          />

          {/* 4. Crew */}
          <SidebarItem
            id="crew"
            icon={<Users className="w-4 h-4 text-indigo-600" />}
            label="Crew"
            active={activeTab === 'crew' || activeTab === 'team'}
            onClick={() => {
              setActiveTab('crew');
              window.location.hash = '#/app/crew';
            }}
          />
        </div>

        {/* Minimal User Profile & Quick Actions */}
        <div className="p-3 border-t border-zinc-100 bg-zinc-50/50">
          <div className="w-full flex items-center justify-between p-2 rounded-xl border border-zinc-200 bg-white shadow-2xs">
            <div className="flex items-center gap-2 min-w-0">
              <img
                src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces'}
                alt={currentUser.name}
                className="w-8 h-8 rounded-full object-cover shrink-0 border border-zinc-200"
              />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-zinc-900 truncate">
                  {currentUser.name}
                </div>
                <div className="text-xs text-zinc-500 truncate flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 inline shrink-0" />
                  <span className="capitalize">{currentUser.role === 'owner' ? 'Studio Owner' : currentUser.role.replace('_', ' ')}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-0.5 shrink-0">
              <button
                onClick={() => setIsSettingsModalOpen(true)}
                title="Studio Profile & Password Settings"
                className="min-h-[44px] min-w-[44px] p-2 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer flex items-center justify-center"
              >
                <SettingsIcon className="w-4 h-4" />
              </button>
              <button
                onClick={handleLogout}
                title="Log Out of Studio Workspace"
                className="min-h-[44px] min-w-[44px] p-2 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer flex items-center justify-center"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Settings Modal */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-zinc-200 max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-zinc-50/70">
              <div>
                <h3 className="text-base font-bold text-zinc-900 font-display">Account & Studio Settings</h3>
                <p className="text-xs text-zinc-500">Manage studio profile, branches, and credentials.</p>
              </div>
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <SettingsPage />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
