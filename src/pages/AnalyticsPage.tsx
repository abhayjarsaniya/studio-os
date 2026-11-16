import React, { useState, useMemo } from 'react';
import { useStudio } from '../context/StudioContext';
import { useApp } from '../context/AppContext';
import { analyticsService } from '../services/analyticsService';
import { branchService } from '../services/branchService';
import { AnalyticsFilter, AnalyticsDatePreset, OperationalAlert } from '../types/schema';
import { AnalyticsFilterBar } from '../components/analytics/AnalyticsFilterBar';
import { OperationalAlertsBanner } from '../components/analytics/OperationalAlertsBanner';
import { ProductionFunnelChart } from '../components/analytics/ProductionFunnelChart';
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  Users, 
  IndianRupee, 
  Workflow, 
  CheckCircle, 
  Clock, 
  ShieldAlert, 
  Building2, 
  Camera, 
  FolderArchive,
  ArrowRight,
  FileSpreadsheet
} from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const { currentStudio } = useStudio();
  const { setActiveTab } = useApp();
  const studioId = currentStudio?.id || 'studio_royal_001';

  // Sub-tabs
  const [activeSubTab, setActiveSubTab] = useState<
    'overview' | 'events' | 'production' | 'customers' | 'finance' | 'team' | 'equipment'
  >('overview');

  // Filter state
  const todayStr = new Date().toISOString().split('T')[0];
  const [filter, setFilter] = useState<AnalyticsFilter>({
    preset: 'this_month',
    startDate: `${todayStr.substring(0, 7)}-01`,
    endDate: todayStr
  });

  const branches = useMemo(() => branchService.listBranches(studioId), [studioId]);
  const categories = [
    'Wedding', 'Pre-Wedding', 'Engagement', 'Reception', 'Haldi', 
    'Mehndi', 'Sangeet', 'Birthday', 'Baby Shower', 'Maternity', 
    'Corporate Event', 'Fashion Photography'
  ];

  // Derived datasets
  const kpis = useMemo(() => analyticsService.getMainKPIs(studioId, filter), [studioId, filter]);
  const eventAnalytics = useMemo(() => analyticsService.getEventAnalytics(studioId, filter), [studioId, filter]);
  const productionAnalytics = useMemo(() => analyticsService.getProductionFunnelAnalytics(studioId), [studioId]);
  const customerAnalytics = useMemo(() => analyticsService.getCustomerAnalytics(studioId), [studioId]);
  const teamAnalytics = useMemo(() => analyticsService.getTeamAnalytics(studioId, false), [studioId]);
  const equipmentAnalytics = useMemo(() => analyticsService.getEquipmentAnalytics(studioId), [studioId]);
  const alerts = useMemo(() => analyticsService.getOperationalAlerts(studioId), [studioId]);

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-indigo-600" />
            Analytics & Business Intelligence
          </h1>
        </div>

        <button
          onClick={() => setActiveTab('reports')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors shadow-sm self-start sm:self-auto"
        >
          <FileSpreadsheet className="w-4 h-4 text-indigo-300" />
          Report Center & Exports
        </button>
      </div>

      {/* Global Filter Bar */}
      <AnalyticsFilterBar
        filter={filter}
        onFilterChange={setFilter}
        branches={branches}
        categories={categories}
      />

      {/* Sub Tabs Navigation */}
      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto pb-1">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'events', label: 'Events' },
          { id: 'production', label: 'Production Funnel' },
          { id: 'customers', label: 'Customers & CRM' },
          { id: 'finance', label: 'Financial Performance' },
          { id: 'team', label: 'Team Workload' },
          { id: 'equipment', label: 'Equipment' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`px-4 py-2.5 text-xs font-bold rounded-lg whitespace-nowrap transition-colors ${
              activeSubTab === tab.id
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 1. OVERVIEW TAB */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* Operational Alerts Banner */}
          <OperationalAlertsBanner alerts={alerts} />

          {/* 16 KPI Metric Cards Grid */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Executive Business KPIs ({filter.preset.replace('_', ' ')})
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3.5">
              {/* Row 1: Events */}
              <div 
                onClick={() => setActiveTab('events')} 
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-300 transition-all cursor-pointer"
              >
                <div className="text-xs text-slate-500 font-medium">Total Events</div>
                <div className="text-2xl font-black text-slate-900 mt-1">{kpis.totalEvents}</div>
                <div className="text-xs text-slate-400 mt-1">Booked in range</div>
              </div>

              <div 
                onClick={() => setActiveTab('events')} 
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-300 transition-all cursor-pointer"
              >
                <div className="text-xs text-blue-600 font-medium">Upcoming Events</div>
                <div className="text-2xl font-black text-blue-700 mt-1">{kpis.upcomingEvents}</div>
                <div className="text-xs text-slate-400 mt-1">Scheduled ahead</div>
              </div>

              <div 
                onClick={() => setActiveTab('events')} 
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-300 transition-all cursor-pointer"
              >
                <div className="text-xs text-emerald-600 font-medium">Completed Events</div>
                <div className="text-2xl font-black text-emerald-700 mt-1">{kpis.completedEvents}</div>
                <div className="text-xs text-slate-400 mt-1">Successfully delivered</div>
              </div>

              <div 
                onClick={() => setActiveTab('events')} 
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-300 transition-all cursor-pointer"
              >
                <div className="text-xs text-rose-600 font-medium">Cancelled Events</div>
                <div className="text-2xl font-black text-rose-700 mt-1">{kpis.cancelledEvents}</div>
                <div className="text-xs text-slate-400 mt-1">Cancelled bookings</div>
              </div>

              {/* Row 2: Customers & Conversion */}
              <div 
                onClick={() => setActiveTab('customers')} 
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-300 transition-all cursor-pointer"
              >
                <div className="text-xs text-slate-500 font-medium">Total Customers</div>
                <div className="text-2xl font-black text-slate-900 mt-1">{kpis.totalCustomers}</div>
                <div className="text-xs text-slate-400 mt-1">All-time studio clients</div>
              </div>

              <div 
                onClick={() => setActiveTab('customers')} 
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-300 transition-all cursor-pointer"
              >
                <div className="text-xs text-indigo-600 font-medium">New Customers</div>
                <div className="text-2xl font-black text-indigo-700 mt-1">{kpis.newCustomers}</div>
                <div className="text-xs text-slate-400 mt-1">Acquired in period</div>
              </div>

              <div 
                onClick={() => setActiveTab('customers')} 
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-300 transition-all cursor-pointer"
              >
                <div className="text-xs text-purple-600 font-medium">Lead Conversion</div>
                <div className="text-2xl font-black text-purple-700 mt-1">{kpis.leadConversionRate}%</div>
                <div className="text-xs text-slate-400 mt-1">Enquiries to bookings</div>
              </div>

              <div 
                onClick={() => setActiveTab('finance')} 
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-300 transition-all cursor-pointer"
              >
                <div className="text-xs text-amber-600 font-medium">Invoiced Revenue</div>
                <div className="text-2xl font-black text-amber-700 mt-1">₹{kpis.invoicedRevenue.toLocaleString('en-IN')}</div>
                <div className="text-xs text-slate-400 mt-1">Issued invoice total</div>
              </div>

              {/* Row 3: Finance */}
              <div 
                onClick={() => setActiveTab('finance')} 
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-300 transition-all cursor-pointer"
              >
                <div className="text-xs text-emerald-600 font-medium">Cash Received</div>
                <div className="text-2xl font-black text-emerald-700 mt-1">₹{kpis.revenueReceived.toLocaleString('en-IN')}</div>
                <div className="text-xs text-slate-400 mt-1">Cleared payments</div>
              </div>

              <div 
                onClick={() => setActiveTab('finance')} 
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-300 transition-all cursor-pointer"
              >
                <div className="text-xs text-rose-600 font-medium">Outstanding Due</div>
                <div className="text-2xl font-black text-rose-700 mt-1">₹{kpis.outstandingPayments.toLocaleString('en-IN')}</div>
                <div className="text-xs text-slate-400 mt-1">Pending receivables</div>
              </div>

              <div 
                onClick={() => setActiveTab('finance')} 
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-300 transition-all cursor-pointer"
              >
                <div className="text-xs text-slate-500 font-medium">Total Expenses</div>
                <div className="text-2xl font-black text-slate-900 mt-1">₹{kpis.totalExpenses.toLocaleString('en-IN')}</div>
                <div className="text-xs text-slate-400 mt-1">Recognized costs</div>
              </div>

              <div 
                onClick={() => setActiveTab('finance')} 
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-300 transition-all cursor-pointer"
              >
                <div className={`text-xs font-medium ${kpis.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  Net Operating Profit
                </div>
                <div className={`text-2xl font-black mt-1 ${kpis.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  ₹{kpis.netProfit.toLocaleString('en-IN')}
                </div>
                <div className="text-xs text-slate-400 mt-1">Cash basis</div>
              </div>

              {/* Row 4: Tasks & Team */}
              <div 
                onClick={() => setActiveTab('tasks')} 
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-300 transition-all cursor-pointer"
              >
                <div className="text-xs text-indigo-600 font-medium">Active Workflows</div>
                <div className="text-2xl font-black text-indigo-700 mt-1">{kpis.activeWorkflows}</div>
                <div className="text-xs text-slate-400 mt-1">In progress pipelines</div>
              </div>

              <div 
                onClick={() => setActiveTab('tasks')} 
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-300 transition-all cursor-pointer"
              >
                <div className="text-xs text-emerald-600 font-medium">Completed Tasks</div>
                <div className="text-2xl font-black text-emerald-700 mt-1">{kpis.completedTasks}</div>
                <div className="text-xs text-slate-400 mt-1">Tasks finished</div>
              </div>

              <div 
                onClick={() => setActiveTab('tasks')} 
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-300 transition-all cursor-pointer"
              >
                <div className="text-xs text-rose-600 font-medium">Overdue Tasks</div>
                <div className="text-2xl font-black text-rose-700 mt-1">{kpis.overdueTasks}</div>
                <div className="text-xs text-slate-400 mt-1">Requiring action</div>
              </div>

              <div 
                onClick={() => setActiveTab('team')} 
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-300 transition-all cursor-pointer"
              >
                <div className="text-xs text-blue-600 font-medium">Team Utilization</div>
                <div className="text-2xl font-black text-blue-700 mt-1">{kpis.teamUtilization}%</div>
                <div className="text-xs text-slate-400 mt-1">Active crew deployment</div>
              </div>
            </div>
          </div>

          {/* Quick Summary Panels */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Cash Flow Health */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800">Cash Flow Realization</h3>
              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between text-slate-600 mb-1">
                    <span>Revenue Collected</span>
                    <span className="font-bold text-slate-900">₹{kpis.revenueReceived.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full rounded-full"
                      style={{ width: `${kpis.invoicedRevenue > 0 ? Math.min(100, Math.round((kpis.revenueReceived / kpis.invoicedRevenue) * 100)) : 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-600 mb-1">
                    <span>Pending Receivables</span>
                    <span className="font-bold text-amber-700">₹{kpis.outstandingPayments.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-amber-500 h-full rounded-full"
                      style={{ width: `${kpis.invoicedRevenue > 0 ? Math.min(100, Math.round((kpis.outstandingPayments / kpis.invoicedRevenue) * 100)) : 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-600 mb-1">
                    <span>Expenses Paid</span>
                    <span className="font-bold text-rose-700">₹{kpis.totalExpenses.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-rose-500 h-full rounded-full"
                      style={{ width: `${kpis.revenueReceived > 0 ? Math.min(100, Math.round((kpis.totalExpenses / kpis.revenueReceived) * 100)) : 50}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Event Category Distribution */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-800">Top Event Categories</h3>
              <div className="space-y-2 text-xs">
                {eventAnalytics.categoryDistribution.slice(0, 5).map(cat => (
                  <div key={cat.category} className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="font-medium text-slate-700">{cat.category}</span>
                    <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      {cat.count} shoots
                    </span>
                  </div>
                ))}
                {eventAnalytics.categoryDistribution.length === 0 && (
                  <div className="text-slate-400 py-4 text-center">No events in this period</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. EVENTS TAB */}
      {activeSubTab === 'events' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-800">Status Distribution</h3>
              <div className="space-y-2 text-xs">
                {eventAnalytics.statusDistribution.map(s => (
                  <div key={s.status} className="flex justify-between items-center py-1 border-b border-slate-50">
                    <span className="text-slate-600">{s.status}</span>
                    <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-800">Branch Distribution</h3>
              <div className="space-y-2 text-xs">
                {eventAnalytics.branchDistribution.map(b => (
                  <div key={b.branchId} className="flex justify-between items-center py-1 border-b border-slate-50">
                    <span className="text-slate-600">{b.branchName}</span>
                    <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">{b.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-800">Crew Deployment</h3>
              <div className="space-y-2 text-xs max-h-48 overflow-y-auto">
                {eventAnalytics.crewDistribution.map(c => (
                  <div key={c.employeeId} className="flex justify-between items-center py-1 border-b border-slate-50">
                    <div>
                      <span className="text-slate-800 font-medium block">{c.employeeName}</span>
                      <span className="text-xs text-slate-400">{c.roleTitle}</span>
                    </div>
                    <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{c.count} shoots</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. PRODUCTION TAB */}
      {activeSubTab === 'production' && (
        <div className="space-y-6">
          <ProductionFunnelChart
            stages={productionAnalytics.stages}
            bottlenecks={productionAnalytics.bottlenecks}
          />
        </div>
      )}

      {/* 4. CUSTOMERS & CRM TAB */}
      {activeSubTab === 'customers' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center shadow-2xs">
              <div className="text-xs text-purple-600 font-semibold uppercase">VIP Clients</div>
              <div className="text-xl font-black text-purple-700 mt-1">{customerAnalytics.segments.vip.count}</div>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center shadow-2xs">
              <div className="text-xs text-indigo-600 font-semibold uppercase">Repeat Clients</div>
              <div className="text-xl font-black text-indigo-700 mt-1">{customerAnalytics.segments.repeat.count}</div>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center shadow-2xs">
              <div className="text-xs text-blue-600 font-semibold uppercase">New Clients</div>
              <div className="text-xl font-black text-blue-700 mt-1">{customerAnalytics.segments.new.count}</div>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center shadow-2xs">
              <div className="text-xs text-emerald-600 font-semibold uppercase">Upcoming Shoots</div>
              <div className="text-xl font-black text-emerald-700 mt-1">{customerAnalytics.segments.upcomingEvents.count}</div>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center shadow-2xs">
              <div className="text-xs text-rose-600 font-semibold uppercase">Outstanding Due</div>
              <div className="text-xl font-black text-rose-700 mt-1">{customerAnalytics.segments.outstandingDue.count}</div>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center shadow-2xs">
              <div className="text-xs text-slate-500 font-semibold uppercase">Inactive Clients</div>
              <div className="text-xl font-black text-slate-700 mt-1">{customerAnalytics.segments.inactive.count}</div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-800">Acquisition Channels & Conversion</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {customerAnalytics.acquisitionSources.map(s => (
                <div key={s.source} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-xs font-semibold text-slate-700">{s.source}</div>
                  <div className="text-lg font-black text-slate-900 mt-1">{s.count} clients</div>
                  <div className="text-xs text-slate-500 mt-0.5">{s.percentage}% of total base</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. FINANCE TAB */}
      {activeSubTab === 'finance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
              <div className="text-xs text-slate-500 font-medium">Invoiced Revenue</div>
              <div className="text-2xl font-black text-slate-900">₹{kpis.invoicedRevenue.toLocaleString('en-IN')}</div>
              <div className="text-xs text-slate-400">Total legally issued billing</div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
              <div className="text-xs text-emerald-600 font-medium">Realized Cash Collections</div>
              <div className="text-2xl font-black text-emerald-700">₹{kpis.revenueReceived.toLocaleString('en-IN')}</div>
              <div className="text-xs text-slate-400">Paid customer receipts</div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
              <div className="text-xs text-rose-600 font-medium">Total Operating Costs</div>
              <div className="text-2xl font-black text-rose-700">₹{kpis.totalExpenses.toLocaleString('en-IN')}</div>
              <div className="text-xs text-slate-400">Studio & production expenses</div>
            </div>
          </div>
        </div>
      )}

      {/* 6. TEAM TAB */}
      {activeSubTab === 'team' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800">Team Workload & Completion Intelligence</h3>
              <span className="text-xs text-slate-400">Aggregated operational metrics (Confidential data protected)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Member</th>
                    <th className="px-4 py-3">Designation</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3 text-right">Shoots</th>
                    <th className="px-4 py-3 text-right">Tasks</th>
                    <th className="px-4 py-3 text-right">Completed</th>
                    <th className="px-4 py-3 text-right">Overdue</th>
                    <th className="px-4 py-3 text-right">Completion %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {teamAnalytics.map(emp => (
                    <tr key={emp.employeeId} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-800">{emp.fullName}</td>
                      <td className="px-4 py-3 text-slate-600">{emp.designation}</td>
                      <td className="px-4 py-3 text-slate-500">{emp.department}</td>
                      <td className="px-4 py-3 text-right font-medium">{emp.assignedEventsCount}</td>
                      <td className="px-4 py-3 text-right">{emp.totalTasksCount}</td>
                      <td className="px-4 py-3 text-right text-emerald-600 font-medium">{emp.completedTasksCount}</td>
                      <td className="px-4 py-3 text-right text-rose-600 font-medium">{emp.overdueTasksCount}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">{emp.completionRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 7. EQUIPMENT TAB */}
      {activeSubTab === 'equipment' && (
        <div>
          {equipmentAnalytics.isEmpty ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
              <Camera className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-700">No Studio Equipment Logged Yet</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No cameras, lenses, or lighting gear are cataloged. When equipment is added to the inventory, utilization metrics and maintenance logs will appear here.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-800">Gear Utilization & Availability</h3>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="text-xs text-slate-500">Total Items</div>
                  <div className="text-xl font-bold text-slate-900">{equipmentAnalytics.totalEquipment}</div>
                </div>
                <div className="p-3 bg-emerald-50 rounded-lg">
                  <div className="text-xs text-emerald-600">Available</div>
                  <div className="text-xl font-bold text-emerald-700">{equipmentAnalytics.available}</div>
                </div>
                <div className="p-3 bg-indigo-50 rounded-lg">
                  <div className="text-xs text-indigo-600">In Use</div>
                  <div className="text-xl font-bold text-indigo-700">{equipmentAnalytics.inUse}</div>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg">
                  <div className="text-xs text-amber-600">Maintenance</div>
                  <div className="text-xl font-bold text-amber-700">{equipmentAnalytics.maintenance}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
