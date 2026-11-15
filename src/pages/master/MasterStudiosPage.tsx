import React, { useState, useMemo } from 'react';
import { useMasterAdmin } from '../../context/MasterAdminContext';
import { masterAdminService } from '../../services/masterAdminService';
import { MasterStudioListItem } from '../../types/masterAdmin';
import { StudioHandoverModal, StudioHandoverData } from '../../components/master/StudioHandoverModal';
import { 
  Building2, 
  Search, 
  Filter, 
  MoreVertical, 
  Eye, 
  EyeOff, 
  PauseCircle, 
  PlayCircle, 
  ShieldAlert, 
  FileText, 
  Users, 
  Calendar, 
  CreditCard, 
  ToggleRight, 
  ExternalLink,
  ChevronDown,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  AlertTriangle,
  KeyRound,
  Share2,
  Edit3
} from 'lucide-react';

export const MasterStudiosPage: React.FC = () => {
  const { setMasterRoute, setSelectedStudioId, triggerRefresh, refreshTrigger } = useMasterAdmin();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'hidden' | 'suspended'>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [activeMenuStudioId, setActiveMenuStudioId] = useState<string | null>(null);

  // Handover Modal State
  const [handoverData, setHandoverData] = useState<StudioHandoverData | null>(null);
  const [isHandoverOpen, setIsHandoverOpen] = useState(false);

  const studios = useMemo(() => {
    return masterAdminService.getMasterStudiosList();
  }, [refreshTrigger]);

  const cities = useMemo(() => {
    const set = new Set(studios.map(s => s.city).filter(Boolean));
    return ['all', ...Array.from(set)];
  }, [studios]);

  const filteredStudios = useMemo(() => {
    return studios.filter(s => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (cityFilter !== 'all' && s.city.toLowerCase() !== cityFilter.toLowerCase()) return false;
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matches = 
          s.name.toLowerCase().includes(query) ||
          s.studioCode.toLowerCase().includes(query) ||
          s.ownerName.toLowerCase().includes(query) ||
          s.ownerEmail.toLowerCase().includes(query) ||
          s.city.toLowerCase().includes(query);
        if (!matches) return false;
      }
      return true;
    });
  }, [studios, statusFilter, cityFilter, searchTerm]);

  const handleDrilldown = (studioId: string, tab = 'overview') => {
    setSelectedStudioId(studioId);
    setMasterRoute('studio-detail');
  };

  const handleManageRoles = (studioId: string) => {
    setSelectedStudioId(studioId);
    setMasterRoute('studio-roles-overrides');
  };

  const handleToggleHide = (studio: MasterStudioListItem) => {
    if (studio.status === 'hidden') {
      masterAdminService.unhideStudio(studio.studioId, 'Unhidden by Master Admin');
    } else {
      masterAdminService.hideStudio(studio.studioId, 'Hidden from public discovery');
    }
    setActiveMenuStudioId(null);
    triggerRefresh();
  };

  const handleToggleSuspend = (studio: MasterStudioListItem) => {
    if (studio.status === 'suspended') {
      masterAdminService.reactivateStudio(studio.studioId, 'Reactivated by Master Admin');
    } else {
      masterAdminService.suspendStudio(studio.studioId, 'Administrative suspension');
    }
    setActiveMenuStudioId(null);
    triggerRefresh();
  };

  const handleResetPassword = (studio: MasterStudioListItem) => {
    setActiveMenuStudioId(null);
    try {
      const res = masterAdminService.setStudioOwnerPassword(studio.studioId, undefined, 'Master Admin');
      setHandoverData({
        studioName: studio.name,
        studioId: studio.studioId,
        ownerName: studio.ownerName,
        ownerMobile: studio.ownerPhone || '9876543210',
        ownerEmail: res.ownerEmail || studio.ownerEmail,
        username: res.username || studio.ownerEmail.split('@')[0],
        temporaryPassword: res.temporaryPassword,
        loginUrl: `${window.location.origin}/#/studio/login`
      });
      setIsHandoverOpen(true);
    } catch (e: any) {
      alert(e.message || 'Failed to reset password');
    }
  };

  const handleShareLogin = (studio: MasterStudioListItem) => {
    setActiveMenuStudioId(null);
    setHandoverData({
      studioName: studio.name,
      studioId: studio.studioId,
      ownerName: studio.ownerName,
      ownerMobile: studio.ownerPhone || '9876543210',
      ownerEmail: studio.ownerEmail,
      username: studio.ownerEmail.split('@')[0],
      temporaryPassword: 'Password previously set',
      loginUrl: `${window.location.origin}/#/studio/login`
    });
    setIsHandoverOpen(true);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
              Multi-Studio Directory
            </span>
            <span className="text-xs text-zinc-500">Master Governance Console</span>
          </div>
          <h1 className="text-2xl font-black text-zinc-900 font-display tracking-tight mt-1">
            Global Studio Directory ({studios.length})
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Inspect studio subscriptions, team headcounts, booking activity, and manage individual studio access.
          </p>
        </div>

        <button
          onClick={() => setMasterRoute('create-studio')}
          className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center gap-2 shadow-md shadow-amber-500/20 transition-all self-start sm:self-auto"
        >
          <Building2 className="w-4 h-4" />
          <span>Provision New Studio</span>
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by studio name, owner, city or ID..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-3 sm:py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-base sm:text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-zinc-900 min-h-[48px] sm:min-h-[40px]"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 touch-scroll">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 sm:py-2 text-base sm:text-xs text-zinc-700 focus:outline-none focus:bg-white min-h-[48px] sm:min-h-[38px] cursor-pointer"
          >
            <option value="all">All Statuses ({studios.length})</option>
            <option value="active">Active Only</option>
            <option value="hidden">Hidden Only</option>
            <option value="suspended">Suspended Only</option>
          </select>

          {/* City Filter */}
          <select
            value={cityFilter}
            onChange={e => setCityFilter(e.target.value)}
            className="bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 sm:py-2 text-base sm:text-xs text-zinc-700 focus:outline-none focus:bg-white min-h-[48px] sm:min-h-[38px] cursor-pointer"
          >
            {cities.map(c => (
              <option key={c} value={c}>{c === 'all' ? 'All Cities' : c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* MOBILE STUDIOS CARD VIEW (sm:hidden) */}
      <div className="sm:hidden space-y-3.5">
        {filteredStudios.length === 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-200 p-8 text-center text-zinc-400 text-xs">
            No studios found matching the criteria.
          </div>
        ) : (
          filteredStudios.map(studio => (
            <div
              key={studio.studioId}
              className="bg-white rounded-2xl border border-zinc-200/90 p-4 shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-amber-500 font-bold shrink-0">
                    {studio.logoUrl ? (
                      <img src={studio.logoUrl} alt="" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <Building2 className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 font-display">{studio.name}</h3>
                    <p className="text-[11px] font-mono text-amber-700 font-semibold">{studio.studioCode}</p>
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  studio.status === 'active'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : studio.status === 'hidden'
                    ? 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  {studio.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs bg-zinc-50/80 p-3 rounded-xl border border-zinc-100">
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase font-bold block">Owner</span>
                  <span className="font-semibold text-zinc-800">{studio.ownerName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase font-bold block">City</span>
                  <span className="font-semibold text-zinc-800">{studio.city}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase font-bold block">Plan</span>
                  <span className="font-semibold text-indigo-700">{studio.subscriptionPlan}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase font-bold block">Total Revenue</span>
                  <span className="font-bold text-emerald-700 font-mono">₹{studio.totalRevenue.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => handleDrilldown(studio.studioId)}
                  className="min-h-[44px] px-3 py-2 rounded-xl bg-zinc-900 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation active:scale-95"
                >
                  <Eye className="w-4 h-4" />
                  <span>View Studio</span>
                </button>
                <button
                  onClick={() => handleResetPassword(studio)}
                  className="min-h-[44px] px-3 py-2 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation active:scale-95"
                >
                  <KeyRound className="w-4 h-4 text-amber-600" />
                  <span>Reset Key</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 4.1. All Studios Comprehensive Table (14 Columns) - Desktop view */}
      <div className="hidden sm:block bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-zinc-50 text-zinc-500 font-semibold uppercase text-[10px] tracking-wider border-b border-zinc-200">
              <tr>
                <th className="px-4 py-3">1. Studio ID / Code</th>
                <th className="px-4 py-3">2. Studio Name</th>
                <th className="px-4 py-3">3. Owner Name</th>
                <th className="px-4 py-3">4. Owner Email</th>
                <th className="px-4 py-3">5. Owner Phone</th>
                <th className="px-4 py-3">6. City & State</th>
                <th className="px-4 py-3">7. Subscription Plan</th>
                <th className="px-4 py-3">8. Sub Status</th>
                <th className="px-4 py-3">9. Renewal Date</th>
                <th className="px-4 py-3 text-center">10. Employees</th>
                <th className="px-4 py-3 text-center">11. Events</th>
                <th className="px-4 py-3 text-right">12. Total Revenue</th>
                <th className="px-4 py-3 text-center">13. Status</th>
                <th className="px-4 py-3">14. Created Date</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredStudios.length === 0 ? (
                <tr>
                  <td colSpan={15} className="px-4 py-12 text-center text-zinc-400">
                    No studios found matching the criteria.
                  </td>
                </tr>
              ) : (
                filteredStudios.map(studio => {
                  const isMenuOpen = activeMenuStudioId === studio.studioId;

                  return (
                    <tr key={studio.studioId} className="hover:bg-zinc-50 transition-colors">
                      {/* 1. Studio Code */}
                      <td className="px-4 py-3 font-mono text-[11px] text-amber-400 font-bold">
                        {studio.studioCode}
                      </td>

                      {/* 2. Studio Name & Logo */}
                      <td className="px-4 py-3 font-bold text-zinc-900 font-display flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center text-amber-400 text-xs shrink-0">
                          {studio.logoUrl ? (
                            <img src={studio.logoUrl} alt="" className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            <Building2 className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <button
                          onClick={() => handleDrilldown(studio.studioId)}
                          className="hover:text-amber-400 transition-colors text-left truncate max-w-[150px]"
                        >
                          {studio.name}
                        </button>
                      </td>

                      {/* 3. Owner Name */}
                      <td className="px-4 py-3 text-zinc-800 font-medium">
                        {studio.ownerName}
                      </td>

                      {/* 4. Owner Email */}
                      <td className="px-4 py-3 text-zinc-500 font-mono text-[11px]">
                        {studio.ownerEmail}
                      </td>

                      {/* 5. Owner Phone */}
                      <td className="px-4 py-3 text-zinc-700 font-mono text-[11px]">
                        {studio.ownerPhone}
                      </td>

                      {/* 6. City & State */}
                      <td className="px-4 py-3 text-zinc-700">
                        {studio.city}, {studio.state}
                      </td>

                      {/* 7. Subscription Plan */}
                      <td className="px-4 py-3 text-indigo-300 font-medium">
                        {studio.subscriptionPlan}
                      </td>

                      {/* 8. Subscription Status */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          studio.subscriptionStatus === 'active'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : studio.subscriptionStatus === 'trial'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}>
                          {studio.subscriptionStatus}
                        </span>
                      </td>

                      {/* 9. Renewal Date */}
                      <td className="px-4 py-3 text-zinc-500 font-mono text-[11px]">
                        {studio.renewalDate}
                      </td>

                      {/* 10. Active Employees */}
                      <td className="px-4 py-3 text-center font-bold text-zinc-800">
                        {studio.activeEmployeesCount}
                      </td>

                      {/* 11. Total Events */}
                      <td className="px-4 py-3 text-center font-bold text-zinc-800">
                        {studio.totalEventsCount}
                      </td>

                      {/* 12. Total Revenue */}
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">
                        ₹{studio.totalRevenue.toLocaleString('en-IN')}
                      </td>

                      {/* 13. Status */}
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          studio.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : studio.status === 'hidden'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {studio.status}
                        </span>
                      </td>

                      {/* 14. Created Date */}
                      <td className="px-4 py-3 text-zinc-500 font-mono text-[11px]">
                        {studio.createdAt}
                      </td>

                      {/* Action Menu */}
                      <td className="px-4 py-3 text-center relative">
                        <button
                          onClick={() => setActiveMenuStudioId(isMenuOpen ? null : studio.studioId)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {/* Dropdown Menu */}
                        {isMenuOpen && (
                          <div 
                            className="absolute right-4 top-10 z-30 w-52 bg-white border border-zinc-200 rounded-xl shadow-2xl py-1 text-left text-xs"
                            onClick={e => e.stopPropagation()}
                          >
                            <button
                              onClick={() => handleDrilldown(studio.studioId, 'overview')}
                              className="w-full px-3 py-2 text-zinc-800 hover:bg-zinc-100 flex items-center gap-2"
                            >
                              <Eye className="w-3.5 h-3.5 text-amber-500" />
                              <span>View Studio (8 Tabs)</span>
                            </button>

                            <button
                              onClick={() => handleShareLogin(studio)}
                              className="w-full px-3 py-2 text-zinc-800 hover:bg-zinc-100 flex items-center gap-2"
                            >
                              <Share2 className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Share Login Details</span>
                            </button>

                            <button
                              onClick={() => handleResetPassword(studio)}
                              className="w-full px-3 py-2 text-zinc-800 hover:bg-zinc-100 flex items-center gap-2"
                            >
                              <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                              <span>Reset Owner Password</span>
                            </button>

                            <button
                              onClick={() => handleDrilldown(studio.studioId, 'events')}
                              className="w-full px-3 py-2 text-zinc-800 hover:bg-zinc-100 flex items-center gap-2"
                            >
                              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                              <span>View Events (Read-Only)</span>
                            </button>

                            <button
                              onClick={() => handleDrilldown(studio.studioId, 'employees')}
                              className="w-full px-3 py-2 text-zinc-800 hover:bg-zinc-100 flex items-center gap-2"
                            >
                              <Users className="w-3.5 h-3.5 text-cyan-400" />
                              <span>View Employees</span>
                            </button>

                            <button
                              onClick={() => handleManageRoles(studio.studioId)}
                              className="w-full px-3 py-2 text-zinc-800 hover:bg-zinc-100 flex items-center gap-2"
                            >
                              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                              <span>Manage Roles & Overrides</span>
                            </button>

                            <button
                              onClick={() => {
                                setSelectedStudioId(studio.studioId);
                                setMasterRoute('studio-features');
                              }}
                              className="w-full px-3 py-2 text-zinc-800 hover:bg-zinc-100 flex items-center gap-2"
                            >
                              <ToggleRight className="w-3.5 h-3.5 text-amber-500" />
                              <span>Configure Features</span>
                            </button>

                            <button
                              onClick={() => handleDrilldown(studio.studioId, 'subscription')}
                              className="w-full px-3 py-2 text-zinc-800 hover:bg-zinc-100 flex items-center gap-2"
                            >
                              <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Manage Subscription</span>
                            </button>

                            <div className="border-t border-zinc-200 my-1" />

                            <button
                              onClick={() => handleToggleHide(studio)}
                              className="w-full px-3 py-2 text-amber-300 hover:bg-zinc-100 flex items-center gap-2"
                            >
                              {studio.status === 'hidden' ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                              <span>{studio.status === 'hidden' ? 'Unhide Studio' : 'Hide Studio'}</span>
                            </button>

                            <button
                              onClick={() => handleToggleSuspend(studio)}
                              className="w-full px-3 py-2 text-rose-400 hover:bg-zinc-100 flex items-center gap-2"
                            >
                              {studio.status === 'suspended' ? <PlayCircle className="w-3.5 h-3.5" /> : <PauseCircle className="w-3.5 h-3.5" />}
                              <span>{studio.status === 'suspended' ? 'Reactivate Studio' : 'Suspend Studio'}</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Handover Modal */}
      {handoverData && (
        <StudioHandoverModal
          isOpen={isHandoverOpen}
          onClose={() => setIsHandoverOpen(false)}
          data={handoverData}
        />
      )}
    </div>
  );
};
