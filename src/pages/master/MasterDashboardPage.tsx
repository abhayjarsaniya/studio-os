import React, { useMemo } from 'react';
import { useMasterAdmin } from '../../context/MasterAdminContext';
import { masterAdminService } from '../../services/masterAdminService';
import { 
  Building2, 
  Users, 
  Calendar, 
  CreditCard, 
  IndianRupee, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  ShieldCheck, 
  EyeOff, 
  PauseCircle, 
  Sparkles,
  ArrowRight,
  Filter
} from 'lucide-react';

export const MasterDashboardPage: React.FC = () => {
  const { filterState, setFilterState, setMasterRoute, refreshTrigger } = useMasterAdmin();

  // Dynamic calculations based on filter state
  const kpis = useMemo(() => {
    return masterAdminService.getDashboardKPIs(filterState);
  }, [filterState, refreshTrigger]);

  const charts = useMemo(() => {
    return masterAdminService.getChartDatasets(filterState);
  }, [filterState, refreshTrigger]);

  const allStudios = useMemo(() => {
    return masterAdminService.getAllStudios();
  }, [refreshTrigger]);

  const cities = useMemo(() => {
    const set = new Set(allStudios.map(s => s.city).filter(Boolean));
    return ['all', ...Array.from(set)];
  }, [allStudios]);

  return (
    <div className="space-y-8 pb-12">
      {/* Platform Console Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
              Master Admin Control Center
            </span>
            <span className="text-xs text-zinc-500">Platform Owner Level 1 Authority</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 font-display tracking-tight mt-1">
            Platform Master Overview
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Real-time multi-studio performance, subscription MRR, consolidated financials, and global governance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setMasterRoute('reports')}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200 transition-all flex items-center gap-1.5"
          >
            <span>Platform Reports</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setMasterRoute('studios')}
            className="px-3.5 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 transition-all shadow-md shadow-amber-500/20"
          >
            Manage Studios
          </button>
        </div>
      </div>

      {/* 3.3. Global Filter Bar */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center gap-2 text-xs font-bold text-zinc-700 mb-3 uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5 text-amber-400" />
          <span>Global Real-Time Filter Bar</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Date Range */}
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Date Range</label>
            <select
              value={filterState.dateRange}
              onChange={e => setFilterState(prev => ({ ...prev, dateRange: e.target.value as any }))}
              className="w-full bg-white border border-zinc-200 rounded-xl px-2.5 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-amber-400"
            >
              <option value="all_time">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="this_quarter">This Quarter</option>
              <option value="this_year">This Year</option>
            </select>
          </div>

          {/* Studio Filter */}
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Studio</label>
            <select
              value={filterState.studioId || 'all'}
              onChange={e => setFilterState(prev => ({ ...prev, studioId: e.target.value }))}
              className="w-full bg-white border border-zinc-200 rounded-xl px-2.5 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-amber-400"
            >
              <option value="all">All Studios</option>
              {allStudios.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* City / Location */}
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">City</label>
            <select
              value={filterState.city || 'all'}
              onChange={e => setFilterState(prev => ({ ...prev, city: e.target.value }))}
              className="w-full bg-white border border-zinc-200 rounded-xl px-2.5 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-amber-400"
            >
              {cities.map(c => (
                <option key={c} value={c}>{c === 'all' ? 'All Cities' : c}</option>
              ))}
            </select>
          </div>

          {/* Subscription Plan */}
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Billing Plan</label>
            <select
              value={filterState.planId || 'all'}
              onChange={e => setFilterState(prev => ({ ...prev, planId: e.target.value }))}
              className="w-full bg-white border border-zinc-200 rounded-xl px-2.5 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-amber-400"
            >
              <option value="all">All Plans</option>
              <option value="starter">Standard (₹500/mo)</option>
              <option value="professional">Professional (₹1,500/mo)</option>
              <option value="enterprise">Enterprise (₹3,500/mo)</option>
            </select>
          </div>

          {/* Studio Status */}
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Studio Status</label>
            <select
              value={filterState.studioStatus || 'all'}
              onChange={e => setFilterState(prev => ({ ...prev, studioStatus: e.target.value as any }))}
              className="w-full bg-white border border-zinc-200 rounded-xl px-2.5 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-amber-400"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="hidden">Hidden Only</option>
              <option value="suspended">Suspended Only</option>
            </select>
          </div>

          {/* Event Category */}
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Event Category</label>
            <select
              value={filterState.eventCategory || 'all'}
              onChange={e => setFilterState(prev => ({ ...prev, eventCategory: e.target.value }))}
              className="w-full bg-white border border-zinc-200 rounded-xl px-2.5 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-amber-400"
            >
              <option value="all">All Categories</option>
              <option value="Wedding">Wedding</option>
              <option value="Pre-Wedding">Pre-Wedding</option>
              <option value="Engagement">Engagement</option>
              <option value="Reception">Reception</option>
              <option value="Corporate Event">Corporate</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3.1. 16 Master Platform KPI Cards (Calculated from Real Database Records) */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
          Executive KPI Matrix (16 Indicators)
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3.5">
          {/* 1. Total Studios */}
          <div
            onClick={() => setMasterRoute('studios')}
            className="bg-white p-4 rounded-2xl border border-zinc-200 hover:border-amber-500/50 transition-all cursor-pointer group shadow-md"
          >
            <div className="flex items-center justify-between text-xs text-zinc-500 font-medium mb-1">
              <span>Total Studios</span>
              <Building2 className="w-4 h-4 text-zinc-400 group-hover:text-amber-400 transition-colors" />
            </div>
            <div className="text-2xl font-black text-zinc-900 font-display">{kpis.totalStudios}</div>
            <div className="text-xs text-emerald-400 font-semibold mt-1">
              {kpis.trends.studiosGrowth}
            </div>
          </div>

          {/* 2. Active Studios */}
          <div
            onClick={() => setMasterRoute('studios')}
            className="bg-white p-4 rounded-2xl border border-zinc-200 hover:border-emerald-500/50 transition-all cursor-pointer group shadow-md"
          >
            <div className="flex items-center justify-between text-xs text-emerald-400 font-medium mb-1">
              <span>Active Studios</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400">{kpis.activeStudios}</div>
            <div className="text-xs text-zinc-500 mt-1">Operational studios</div>
          </div>

          {/* 3. Hidden Studios */}
          <div
            onClick={() => setMasterRoute('studios')}
            className="bg-white p-4 rounded-2xl border border-zinc-200 hover:border-amber-500/50 transition-all cursor-pointer group shadow-md"
          >
            <div className="flex items-center justify-between text-xs text-amber-400 font-medium mb-1">
              <span>Hidden Studios</span>
              <EyeOff className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-400">{kpis.hiddenStudios}</div>
            <div className="text-xs text-zinc-500 mt-1">Hidden from discovery</div>
          </div>

          {/* 4. Suspended Studios */}
          <div
            onClick={() => setMasterRoute('studios')}
            className="bg-white p-4 rounded-2xl border border-zinc-200 hover:border-rose-500/50 transition-all cursor-pointer group shadow-md"
          >
            <div className="flex items-center justify-between text-xs text-rose-400 font-medium mb-1">
              <span>Suspended Studios</span>
              <PauseCircle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-black text-rose-400">{kpis.suspendedStudios}</div>
            <div className="text-xs text-zinc-500 mt-1">Administrative lock</div>
          </div>

          {/* 5. Active Subscriptions */}
          <div
            onClick={() => setMasterRoute('subscriptions')}
            className="bg-white p-4 rounded-2xl border border-zinc-200 hover:border-indigo-500/50 transition-all cursor-pointer group shadow-md"
          >
            <div className="flex items-center justify-between text-xs text-indigo-400 font-medium mb-1">
              <span>Active Subscriptions</span>
              <CreditCard className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-black text-indigo-300">{kpis.activeSubscriptions}</div>
            <div className="text-xs text-indigo-400/80 font-medium mt-1">Billed ₹500/mo</div>
          </div>

          {/* 6. Expired / Past Due */}
          <div
            onClick={() => setMasterRoute('subscriptions')}
            className="bg-white p-4 rounded-2xl border border-zinc-200 hover:border-rose-500/50 transition-all cursor-pointer group shadow-md"
          >
            <div className="flex items-center justify-between text-xs text-rose-400 font-medium mb-1">
              <span>Past Due / Expired</span>
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-black text-rose-300">{kpis.expiredPastDueSubscriptions}</div>
            <div className="text-xs text-zinc-500 mt-1">Action required</div>
          </div>

          {/* 7. Total Studio Employees */}
          <div
            onClick={() => setMasterRoute('reports')}
            className="bg-white p-4 rounded-2xl border border-zinc-200 hover:border-cyan-500/50 transition-all cursor-pointer group shadow-md"
          >
            <div className="flex items-center justify-between text-xs text-cyan-400 font-medium mb-1">
              <span>Studio Employees</span>
              <Users className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-black text-cyan-300">{kpis.totalStudioEmployees}</div>
            <div className="text-xs text-zinc-500 mt-1">Across all studios</div>
          </div>

          {/* 8. Total Events */}
          <div
            onClick={() => setMasterRoute('studios')}
            className="bg-white p-4 rounded-2xl border border-zinc-200 hover:border-amber-500/50 transition-all cursor-pointer group shadow-md"
          >
            <div className="flex items-center justify-between text-xs text-zinc-500 font-medium mb-1">
              <span>Total Events</span>
              <Calendar className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="text-2xl font-black text-zinc-900 font-display">{kpis.totalEvents}</div>
            <div className="text-xs text-emerald-400 font-medium mt-1">{kpis.trends.eventsGrowth}</div>
          </div>

          {/* 9. Completed Events */}
          <div
            onClick={() => setMasterRoute('studios')}
            className="bg-white p-4 rounded-2xl border border-zinc-200 hover:border-emerald-500/50 transition-all cursor-pointer group shadow-md"
          >
            <div className="flex items-center justify-between text-xs text-emerald-400 font-medium mb-1">
              <span>Completed Events</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400">{kpis.completedEvents}</div>
            <div className="text-xs text-zinc-500 mt-1">Delivered to clients</div>
          </div>

          {/* 10. Upcoming Events */}
          <div
            onClick={() => setMasterRoute('studios')}
            className="bg-white p-4 rounded-2xl border border-zinc-200 hover:border-indigo-500/50 transition-all cursor-pointer group shadow-md"
          >
            <div className="flex items-center justify-between text-xs text-indigo-400 font-medium mb-1">
              <span>Upcoming Events</span>
              <Clock className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-black text-indigo-300">{kpis.upcomingEvents}</div>
            <div className="text-xs text-zinc-500 mt-1">In schedule queue</div>
          </div>

          {/* 11. Confirmed Bookings */}
          <div
            onClick={() => setMasterRoute('studios')}
            className="bg-white p-4 rounded-2xl border border-zinc-200 hover:border-amber-500/50 transition-all cursor-pointer group shadow-md"
          >
            <div className="flex items-center justify-between text-xs text-amber-400 font-medium mb-1">
              <span>Confirmed Bookings</span>
              <ShieldCheck className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-300">{kpis.confirmedBookings}</div>
            <div className="text-xs text-zinc-500 mt-1">Advance received</div>
          </div>

          {/* 12. Invoiced Revenue */}
          <div
            onClick={() => setMasterRoute('reports')}
            className="bg-white p-4 rounded-2xl border border-zinc-200 hover:border-purple-500/50 transition-all cursor-pointer group shadow-md"
          >
            <div className="flex items-center justify-between text-xs text-purple-400 font-medium mb-1">
              <span>Invoiced Revenue</span>
              <IndianRupee className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-black text-purple-300">₹{kpis.invoicedRevenue.toLocaleString('en-IN')}</div>
            <div className="text-xs text-purple-400/80 font-medium mt-1">{kpis.trends.revenueGrowth}</div>
          </div>

          {/* 13. Payments Received */}
          <div
            onClick={() => setMasterRoute('reports')}
            className="bg-white p-4 rounded-2xl border border-zinc-200 hover:border-emerald-500/50 transition-all cursor-pointer group shadow-md"
          >
            <div className="flex items-center justify-between text-xs text-emerald-400 font-medium mb-1">
              <span>Payments Received</span>
              <IndianRupee className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400">₹{kpis.paymentsReceived.toLocaleString('en-IN')}</div>
            <div className="text-xs text-emerald-400/80 font-medium mt-1">All studios total</div>
          </div>

          {/* 14. Outstanding Balance */}
          <div
            onClick={() => setMasterRoute('reports')}
            className="bg-white p-4 rounded-2xl border border-zinc-200 hover:border-amber-500/50 transition-all cursor-pointer group shadow-md"
          >
            <div className="flex items-center justify-between text-xs text-amber-400 font-medium mb-1">
              <span>Outstanding Balance</span>
              <IndianRupee className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-300">₹{kpis.outstandingBalance.toLocaleString('en-IN')}</div>
            <div className="text-xs text-zinc-500 mt-1">Pending studio collections</div>
          </div>

          {/* 15. Platform MRR */}
          <div
            onClick={() => setMasterRoute('analytics')}
            className="bg-white p-4 rounded-2xl border border-amber-500/40 hover:border-amber-400 transition-all cursor-pointer group shadow-lg shadow-amber-950/20"
          >
            <div className="flex items-center justify-between text-xs text-amber-400 font-black mb-1">
              <span>Platform MRR (₹500/mo)</span>
              <Sparkles className="w-4 h-4 text-amber-400 animate-spin-slow" />
            </div>
            <div className="text-2xl font-black text-zinc-900 font-display">₹{kpis.platformMrr.toLocaleString('en-IN')}</div>
            <div className="text-xs text-amber-400 font-semibold mt-1">
              ARR: ₹{(kpis.platformMrr * 12).toLocaleString('en-IN')}
            </div>
          </div>

          {/* 16. Subscription Renewals Due */}
          <div
            onClick={() => setMasterRoute('subscriptions')}
            className="bg-white p-4 rounded-2xl border border-zinc-200 hover:border-sky-500/50 transition-all cursor-pointer group shadow-md"
          >
            <div className="flex items-center justify-between text-xs text-sky-400 font-medium mb-1">
              <span>Renewals Due (30d)</span>
              <Clock className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-2xl font-black text-sky-300">{kpis.renewalsDueNext30Days}</div>
            <div className="text-xs text-zinc-500 mt-1">Upcoming billing cycles</div>
          </div>
        </div>
      </div>

      {/* 3.2. 9 Interactive Charts Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            Consolidated Platform Intelligence (9 Visualizations)
          </h2>
          <span className="text-xs text-zinc-400 font-mono">Live aggregated records</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Chart 1: Studio Registration Growth */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-md">
            <div className="text-xs font-bold text-zinc-800 mb-1">1. Studio Registration Growth</div>
            <div className="text-xs text-zinc-500 mb-4">Monthly studio onboardings</div>
            <div className="space-y-2">
              {charts.studioRegistrationGrowth.map(item => (
                <div key={item.month} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">{item.month}</span>
                    <span className="font-semibold text-amber-400">{item.count} studios ({item.cumulative} total)</span>
                  </div>
                  <div className="h-2 w-full bg-white rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all"
                      style={{ width: `${Math.min(100, item.cumulative * 18)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chart 2: Revenue Across Studios */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-md">
            <div className="text-xs font-bold text-zinc-800 mb-1">2. Revenue Across Studios</div>
            <div className="text-xs text-zinc-500 mb-4">Invoiced vs Received (₹)</div>
            <div className="space-y-2.5">
              {charts.revenueAcrossStudios.slice(-4).map(item => (
                <div key={item.month} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">{item.month}</span>
                    <span className="font-mono text-emerald-400">₹{item.received.toLocaleString('en-IN')} / ₹{item.invoiced.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="h-2 w-full bg-white rounded-full flex gap-1 overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${Math.min(70, (item.received / (item.invoiced || 1)) * 70)}%` }}
                    />
                    <div 
                      className="h-full bg-purple-500/50 rounded-full"
                      style={{ width: '30%' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chart 3: Platform Subscription Growth */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-md">
            <div className="text-xs font-bold text-zinc-800 mb-1">3. Platform Subscription MRR Trend</div>
            <div className="text-xs text-zinc-500 mb-4">Recurring revenue growth (@ ₹500/mo)</div>
            <div className="space-y-2">
              {charts.platformSubscriptionGrowth.map(item => (
                <div key={item.month} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">{item.month}</span>
                    <span className="font-mono font-bold text-amber-400">₹{item.mrr.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="h-2 w-full bg-white rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-400 rounded-full"
                      style={{ width: `${Math.min(100, (item.mrr / (kpis.platformMrr || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chart 4: Events Completed by Month */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-md">
            <div className="text-xs font-bold text-zinc-800 mb-1">4. Events Completed by Month</div>
            <div className="text-xs text-zinc-500 mb-4">Shoot delivery throughput</div>
            <div className="space-y-2">
              {charts.eventsCompletedByMonth.slice(-4).map(item => (
                <div key={item.month} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">{item.month}</span>
                    <span className="text-indigo-300 font-semibold">{item.completed} completed of {item.total}</span>
                  </div>
                  <div className="h-2 w-full bg-white rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${Math.min(100, (item.completed / item.total) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chart 5: Bookings by Studio */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-md">
            <div className="text-xs font-bold text-zinc-800 mb-1">5. Bookings by Studio (Ranking)</div>
            <div className="text-xs text-zinc-500 mb-4">Confirmed booking distribution</div>
            <div className="space-y-2">
              {charts.bookingsByStudio.slice(0, 5).map((item, idx) => (
                <div key={item.studioId} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-700 truncate max-w-[170px]">#{idx + 1} {item.studioName}</span>
                    <span className="font-bold text-cyan-400">{item.bookingsCount} shoots</span>
                  </div>
                  <div className="h-2 w-full bg-white rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-cyan-500 rounded-full"
                      style={{ width: `${Math.min(100, item.bookingsCount * 14)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chart 6: Revenue by Studio */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-md">
            <div className="text-xs font-bold text-zinc-800 mb-1">6. Revenue by Studio (Top Earners)</div>
            <div className="text-xs text-zinc-500 mb-4">Gross invoicing share</div>
            <div className="space-y-2">
              {charts.revenueByStudio.slice(0, 5).map(item => (
                <div key={item.studioId} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-700 truncate max-w-[170px]">{item.studioName}</span>
                    <span className="font-mono text-emerald-400">₹{item.revenue.toLocaleString('en-IN')} ({item.percentage}%)</span>
                  </div>
                  <div className="h-2 w-full bg-white rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chart 7: Employee Growth Across Studios */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-md">
            <div className="text-xs font-bold text-zinc-800 mb-1">7. Employee Growth Across Studios</div>
            <div className="text-xs text-zinc-500 mb-4">Total workforce size</div>
            <div className="space-y-2">
              {charts.employeeGrowthAcrossStudios.slice(-4).map(item => (
                <div key={item.month} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">{item.month}</span>
                    <span className="font-bold text-zinc-800">{item.count} staff</span>
                  </div>
                  <div className="h-2 w-full bg-white rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-rose-500 rounded-full"
                      style={{ width: `${Math.min(100, item.count * 4)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chart 8: Subscription Plan Distribution */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-md">
            <div className="text-xs font-bold text-zinc-800 mb-1">8. Subscription Plan Distribution</div>
            <div className="text-xs text-zinc-500 mb-4">Active plan tier breakdown</div>
            <div className="space-y-2.5">
              {charts.subscriptionPlanDistribution.map(item => (
                <div key={item.planId} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-700">{item.planName}</span>
                    <span className="font-bold text-amber-400">{item.count} studios ({item.percentage}%)</span>
                  </div>
                  <div className="h-2 w-full bg-white rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-400 rounded-full"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chart 9: Studio Activity Comparison */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-md">
            <div className="text-xs font-bold text-zinc-800 mb-1">9. Studio Activity Comparison</div>
            <div className="text-xs text-zinc-500 mb-4">Events vs Tasks vs Revenue</div>
            <div className="space-y-2">
              {charts.studioActivityComparison.slice(0, 4).map(item => (
                <div key={item.studioId} className="p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs">
                  <div className="font-bold text-zinc-800 truncate">{item.studioName}</div>
                  <div className="flex items-center justify-between text-zinc-500 mt-1">
                    <span>Events: <strong className="text-zinc-800">{item.events}</strong></span>
                    <span>Tasks: <strong className="text-zinc-800">{item.tasks}</strong></span>
                    <span className="text-emerald-400 font-mono">₹{item.revenue.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
