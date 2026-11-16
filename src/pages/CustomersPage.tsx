import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Customer, CustomerStatus } from '../types';
import { Button } from '../components/ui/Button';
import { formatCurrency, formatDate } from '../utils/formatters';
import { 
  Users, 
  Plus, 
  Search, 
  Phone, 
  MessageCircle, 
  Mail, 
  MapPin, 
  Calendar, 
  ChevronRight,
  Filter,
  Download,
  LayoutGrid,
  List,
  ArrowUpDown,
  TrendingUp,
  UserCheck,
  Clock,
  AlertCircle,
  Briefcase,
  GitMerge,
  Kanban,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { LeadPipelineBoard } from '../components/customers/LeadPipelineBoard';
import { FollowUpManagerView } from '../components/customers/FollowUpManagerView';
import { MessageTemplateManager } from '../components/customers/MessageTemplateManagerModal';

export const CustomersPage: React.FC = () => {
  const { 
    customers, 
    studio, 
    employees,
    events,
    crmDashboardMetrics,
    setSelectedCustomerId, 
    setIsCustomerFormOpen,
    openWhatsAppModal,
    openMergeModal,
    can
  } = useApp();

  const members = employees.map(e => ({ id: e.id, name: e.fullName }));

  // Navigation tab within CRM
  const [activeSubTab, setActiveSubTab] = useState<'directory' | 'pipeline' | 'followups' | 'templates'>('directory');

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [managerFilter, setManagerFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'newest' | 'spent' | 'pending'>('newest');

  const canViewFinancials = can ? (can('invoices', 'view') || can('payments', 'view')) : true;
  const canExport = can ? can('customers', 'export') : true;
  const canCreate = can ? can('customers', 'create') : true;

  // Filter and sort customers
  const filteredCustomers = useMemo(() => {
    let result = customers.filter(c => {
      // Exclude merged secondary customers unless explicitly searched
      if (c.mergedIntoId && !search) return false;

      // Status filter
      if (statusFilter !== 'All' && c.status !== statusFilter) {
        return false;
      }

      // Manager filter
      if (managerFilter !== 'All' && c.assignedManager !== managerFilter) {
        return false;
      }

      // Search query (name, phone, email, city, company, ID)
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = c.name.toLowerCase().includes(q);
        const matchPhone = c.phone.includes(q) || (c.alternatePhone && c.alternatePhone.includes(q));
        const matchEmail = (c.email || '').toLowerCase().includes(q);
        const matchCity = (c.city || '').toLowerCase().includes(q);
        const matchCompany = (c.companyName || '').toLowerCase().includes(q);
        const matchId = c.id.toLowerCase().includes(q);

        if (!matchName && !matchPhone && !matchEmail && !matchCity && !matchCompany && !matchId) {
          return false;
        }
      }

      return true;
    });

    // Sorting
    return result.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'spent') return (b.totalSpent || 0) - (a.totalSpent || 0);
      if (sortBy === 'pending') return (b.pendingBalance || 0) - (a.pendingBalance || 0);
      // default: newest
      return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
    });
  }, [customers, search, statusFilter, managerFilter, sortBy]);

  const handleOpenWhatsApp = (e: React.MouseEvent, customer: Customer) => {
    e.stopPropagation();
    openWhatsAppModal({
      customer,
      templateId: undefined
    });
  };

  const handleCall = (e: React.MouseEvent, phone: string) => {
    e.stopPropagation();
    window.location.href = `tel:${phone}`;
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Name', 'Phone', 'Email', 'City', 'Status', 'Total Bookings', 'Total Spent', 'Pending Balance'];
    const rows = filteredCustomers.map(c => [
      c.id,
      `"${c.name}"`,
      `"${c.phone}"`,
      `"${c.email || ''}"`,
      `"${c.city || ''}"`,
      c.status || 'Active',
      c.totalBookings || 0,
      c.totalSpent || 0,
      c.pendingBalance || 0
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `StudioOS_Clients_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Status badge style helper
  const getStatusBadge = (status?: CustomerStatus) => {
    const s = status || 'Active';
    switch (s) {
      case 'New Inquiry':
        return 'bg-purple-100 text-purple-700';
      case 'Contacted':
        return 'bg-blue-100 text-blue-700';
      case 'Follow-up Required':
        return 'bg-amber-100 text-amber-800';
      case 'Quotation Sent':
        return 'bg-cyan-100 text-cyan-800';
      case 'Negotiation':
        return 'bg-indigo-100 text-indigo-700';
      case 'Booked':
      case 'Active':
        return 'bg-emerald-100 text-emerald-800';
      case 'Completed':
        return 'bg-teal-100 text-teal-800';
      case 'Lost':
      case 'Inactive':
        return 'bg-zinc-100 text-zinc-600';
      default:
        return 'bg-zinc-100 text-zinc-700';
    }
  };

  return (
    <div className="w-full space-y-4 sm:space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 font-display">
              Customer CRM
            </h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-700">
              {filteredCustomers.length} Clients
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Complete photography client directory, lead pipelines, scheduled follow-ups, and WhatsApp communications
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canExport && (
            <Button
              variant="outline"
              size="sm"
              icon={<Download className="w-4 h-4" />}
              onClick={handleExportCSV}
              className="hidden sm:flex"
            >
              Export
            </Button>
          )}

          {canCreate && (
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setIsCustomerFormOpen(true)}
            >
              Add Client
            </Button>
          )}
        </div>
      </div>

      {/* CRM Dashboard KPI Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Total Customers */}
        <button
          onClick={() => {
            setActiveSubTab('directory');
            setStatusFilter('All');
          }}
          className="p-3.5 rounded-2xl bg-white border border-zinc-200/80 hover:border-zinc-300 text-left transition-all shadow-xs cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Total Clients</span>
            <Users className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <p className="text-xl font-bold font-display mt-1.5 text-zinc-900">
            {crmDashboardMetrics?.totalCustomers || customers.length}
          </p>
          <span className="text-xs text-zinc-400">All registered profiles</span>
        </button>

        {/* New This Month */}
        <button
          onClick={() => {
            setActiveSubTab('directory');
          }}
          className="p-3.5 rounded-2xl bg-white border border-zinc-200/80 hover:border-zinc-300 text-left transition-all shadow-xs cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">New This Month</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <p className="text-xl font-bold font-display mt-1.5 text-emerald-600">
            {crmDashboardMetrics?.newCustomersThisMonth || 0}
          </p>
          <span className="text-xs text-zinc-400">Added this calendar month</span>
        </button>

        {/* Active Customers */}
        <button
          onClick={() => {
            setActiveSubTab('directory');
            setStatusFilter('Active');
          }}
          className="p-3.5 rounded-2xl bg-white border border-zinc-200/80 hover:border-zinc-300 text-left transition-all shadow-xs cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Active Clients</span>
            <UserCheck className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <p className="text-xl font-bold font-display mt-1.5 text-blue-600">
            {crmDashboardMetrics?.activeCustomers || 0}
          </p>
          <span className="text-xs text-zinc-400">Ongoing engagements</span>
        </button>

        {/* Potential Leads */}
        <button
          onClick={() => setActiveSubTab('pipeline')}
          className="p-3.5 rounded-2xl bg-white border border-zinc-200/80 hover:border-zinc-300 text-left transition-all shadow-xs cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Inquiry Leads</span>
            <Briefcase className="w-3.5 h-3.5 text-purple-500" />
          </div>
          <p className="text-xl font-bold font-display mt-1.5 text-purple-600">
            {crmDashboardMetrics?.potentialLeads || 0}
          </p>
          <span className="text-xs text-zinc-400">Pre-booking stage</span>
        </button>

        {/* Awaiting Follow-Up */}
        <button
          onClick={() => setActiveSubTab('followups')}
          className="p-3.5 rounded-2xl bg-white border border-zinc-200/80 hover:border-zinc-300 text-left transition-all shadow-xs cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Awaiting Follow-Up</span>
            <Clock className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <p className="text-xl font-bold font-display mt-1.5 text-amber-600">
            {crmDashboardMetrics?.awaitingFollowUp || 0}
          </p>
          <span className="text-xs text-zinc-400">Action items scheduled</span>
        </button>

        {/* Booked Customers */}
        <button
          onClick={() => {
            setActiveSubTab('directory');
            setStatusFilter('Booked');
          }}
          className="p-3.5 rounded-2xl bg-white border border-zinc-200/80 hover:border-zinc-300 text-left transition-all shadow-xs cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Booked Clients</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <p className="text-xl font-bold font-display mt-1.5 text-zinc-900">
            {crmDashboardMetrics?.bookedCustomers || 0}
          </p>
          <span className="text-xs text-zinc-400">Locked confirmed bookings</span>
        </button>

        {/* Upcoming Events */}
        <button
          onClick={() => setActiveSubTab('directory')}
          className="p-3.5 rounded-2xl bg-white border border-zinc-200/80 hover:border-zinc-300 text-left transition-all shadow-xs cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Upcoming Shoots</span>
            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <p className="text-xl font-bold font-display mt-1.5 text-zinc-900">
            {crmDashboardMetrics?.upcomingEventCustomers || 0}
          </p>
          <span className="text-xs text-zinc-400">Clients with events ahead</span>
        </button>

        {/* Pending Payments */}
        <button
          onClick={() => {
            setActiveSubTab('directory');
            setSortBy('pending');
          }}
          className="p-3.5 rounded-2xl bg-white border border-zinc-200/80 hover:border-zinc-300 text-left transition-all shadow-xs cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Pending Dues</span>
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <p className="text-xl font-bold font-display mt-1.5 text-rose-600">
            {crmDashboardMetrics?.pendingPaymentCustomers || 0}
          </p>
          <span className="text-xs text-zinc-400">Uncollected balances</span>
        </button>

        {/* Recently Contacted */}
        <button
          onClick={() => setActiveSubTab('directory')}
          className="p-3.5 rounded-2xl bg-white border border-zinc-200/80 hover:border-zinc-300 text-left transition-all shadow-xs cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Recently Contacted</span>
            <MessageCircle className="w-3.5 h-3.5 text-teal-500" />
          </div>
          <p className="text-xl font-bold font-display mt-1.5 text-zinc-900">
            {crmDashboardMetrics?.recentlyContactedCustomers || 0}
          </p>
          <span className="text-xs text-zinc-400">Touched in last 7 days</span>
        </button>

        {/* Completed Events */}
        <button
          onClick={() => {
            setActiveSubTab('directory');
            setStatusFilter('Completed');
          }}
          className="p-3.5 rounded-2xl bg-white border border-zinc-200/80 hover:border-zinc-300 text-left transition-all shadow-xs cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Completed</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
          </div>
          <p className="text-xl font-bold font-display mt-1.5 text-zinc-900">
            {crmDashboardMetrics?.completedEventCustomers || 0}
          </p>
          <span className="text-xs text-zinc-400">All deliverables closed</span>
        </button>
      </div>

      {/* CRM Sub-Navigation Tabs */}
      <div className="flex items-center border-b border-zinc-200/80 overflow-x-auto gap-4 text-xs font-semibold">
        <button
          onClick={() => setActiveSubTab('directory')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'directory'
              ? 'border-zinc-900 text-zinc-900'
              : 'border-transparent text-zinc-500 hover:text-zinc-700'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Client Directory ({customers.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('pipeline')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'pipeline'
              ? 'border-zinc-900 text-zinc-900'
              : 'border-transparent text-zinc-500 hover:text-zinc-700'
          }`}
        >
          <Kanban className="w-4 h-4" />
          <span>Leads & Pipeline</span>
        </button>

        <button
          onClick={() => setActiveSubTab('followups')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'followups'
              ? 'border-zinc-900 text-zinc-900'
              : 'border-transparent text-zinc-500 hover:text-zinc-700'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Follow-Up Reminders</span>
        </button>

        <button
          onClick={() => setActiveSubTab('templates')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'templates'
              ? 'border-zinc-900 text-zinc-900'
              : 'border-transparent text-zinc-500 hover:text-zinc-700'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>WhatsApp Message Templates</span>
        </button>
      </div>

      {/* SUB-TAB CONTENTS */}

      {/* 1. Leads & Pipeline Tab */}
      {activeSubTab === 'pipeline' && <LeadPipelineBoard />}

      {/* 2. Follow-Ups Tab */}
      {activeSubTab === 'followups' && <FollowUpManagerView />}

      {/* 3. WhatsApp Templates Tab */}
      {activeSubTab === 'templates' && <MessageTemplateManager isStandaloneView={true} />}

      {/* 4. Directory Tab */}
      {activeSubTab === 'directory' && (
        <div className="space-y-4">
          {/* Controls Bar: Search, Filters, Sort, View Toggle */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-zinc-200/80 shadow-xs">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search clients by name, mobile, email, city, company, or ID..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 min-h-[44px]"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Status */}
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="text-xs font-medium bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 min-h-[44px]"
              >
                <option value="All">All Statuses</option>
                <option value="New Inquiry">New Inquiry</option>
                <option value="Contacted">Contacted</option>
                <option value="Follow-up Required">Follow-up Required</option>
                <option value="Quotation Sent">Quotation Sent</option>
                <option value="Negotiation">Negotiation</option>
                <option value="Booked">Booked</option>
                <option value="Active">Active</option>
                <option value="Completed">Completed</option>
                <option value="Lost">Lost</option>
                <option value="Inactive">Inactive</option>
              </select>

              {/* Manager */}
              <select
                value={managerFilter}
                onChange={e => setManagerFilter(e.target.value)}
                className="text-xs font-medium bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 min-h-[44px]"
              >
                <option value="All">All Managers</option>
                {members.map(m => (
                  <option key={m.id} value={m.name}>{m.name}</option>
                ))}
              </select>

              {/* Sort By */}
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="text-xs font-medium bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 min-h-[44px]"
              >
                <option value="newest">Sort: Newest First</option>
                <option value="name">Sort: Name (A-Z)</option>
                <option value="spent">Sort: Total Spent</option>
                <option value="pending">Sort: Pending Balance</option>
              </select>

              {/* View Toggle */}
              <div className="flex items-center bg-zinc-100 p-1 rounded-xl">
                <button
                  onClick={() => setViewMode('grid')}
                  title="Grid View"
                  className={`p-2 rounded-lg transition-all min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer ${
                    viewMode === 'grid' ? 'bg-white shadow-xs text-zinc-900' : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  title="List View"
                  className={`p-2 rounded-lg transition-all min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer ${
                    viewMode === 'list' ? 'bg-white shadow-xs text-zinc-900' : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Customer Cards (GRID VIEW) */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCustomers.map(customer => (
                <div
                  key={customer.id}
                  onClick={() => setSelectedCustomerId(customer.id)}
                  className={`p-5 rounded-2xl bg-white border ${
                    customer.mergedIntoId ? 'border-zinc-300 opacity-60' : 'border-zinc-200/90'
                  } hover:border-zinc-300 shadow-xs transition-all cursor-pointer flex flex-col justify-between space-y-4 group`}
                >
                  {/* Top row */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {customer.avatar ? (
                          <img
                            src={customer.avatar}
                            alt={customer.name}
                            className="w-11 h-11 rounded-2xl object-cover border border-zinc-200 shrink-0"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-2xl bg-zinc-100 text-zinc-700 font-bold flex items-center justify-center shrink-0 border border-zinc-200">
                            {customer.name.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="font-semibold text-sm text-zinc-900 group-hover:text-zinc-950 truncate font-display">
                              {customer.name}
                            </h3>
                            {customer.mergedIntoId && (
                              <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                                Merged
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-zinc-400 shrink-0" />
                            <span className="truncate">{customer.city || 'No city set'}</span>
                            {customer.companyName && (
                              <span className="text-zinc-400 truncate">• {customer.companyName}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${getStatusBadge(customer.status)}`}>
                        {customer.status || 'Active'}
                      </span>
                    </div>

                    {/* Contact numbers */}
                    <div className="text-xs text-zinc-600 space-y-1 pt-1">
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span>{customer.phone}</span>
                        {customer.alternatePhone && (
                          <span className="text-zinc-400 text-xs">/ {customer.alternatePhone}</span>
                        )}
                      </div>
                      {customer.email && (
                        <div className="flex items-center gap-2 text-zinc-500 truncate">
                          <Mail className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span className="truncate">{customer.email}</span>
                        </div>
                      )}
                    </div>

                    {/* Tags */}
                    {customer.tags && customer.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {customer.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Financials & Bookings row */}
                  <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-xs text-zinc-400 uppercase font-semibold">Bookings</span>
                      <div className="font-bold text-zinc-900">{customer.totalBookings || 0} Shoots</div>
                    </div>

                    {canViewFinancials ? (
                      <>
                        <div>
                          <span className="text-xs text-zinc-400 uppercase font-semibold">Total Spent</span>
                          <div className="font-bold text-zinc-900">{formatCurrency(customer.totalSpent || 0)}</div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs text-zinc-400 uppercase font-semibold">Pending</span>
                          <div className={`font-bold ${(customer.pendingBalance || 0) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {formatCurrency(customer.pendingBalance || 0)}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-right text-xs text-zinc-400 italic">
                        Financials restricted
                      </div>
                    )}
                  </div>

                  {/* Direct Action Buttons */}
                  <div className="pt-1 flex items-center gap-2">
                    <button
                      onClick={(e) => handleCall(e, customer.phone)}
                      className="flex-1 py-2 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[44px]"
                    >
                      <Phone className="w-3.5 h-3.5 text-zinc-600" />
                      <span>Call</span>
                    </button>

                    <button
                      onClick={(e) => handleOpenWhatsApp(e, customer)}
                      className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs min-h-[44px]"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* LIST VIEW */
            <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-semibold">
                      <th className="py-3 px-4">Client</th>
                      <th className="py-3 px-4">Contact</th>
                      <th className="py-3 px-4">City</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Bookings</th>
                      {canViewFinancials && (
                        <>
                          <th className="py-3 px-4">Total Spent</th>
                          <th className="py-3 px-4">Pending</th>
                        </>
                      )}
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filteredCustomers.map(c => (
                      <tr
                        key={c.id}
                        onClick={() => setSelectedCustomerId(c.id)}
                        className="hover:bg-zinc-50/80 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-zinc-100 text-zinc-700 font-bold flex items-center justify-center shrink-0 border border-zinc-200 text-xs">
                              {c.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-zinc-900">{c.name}</div>
                              {c.companyName && <div className="text-xs text-zinc-400">{c.companyName}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-zinc-700">
                          <div>{c.phone}</div>
                          {c.email && <div className="text-xs text-zinc-400">{c.email}</div>}
                        </td>
                        <td className="py-3 px-4 text-zinc-600">{c.city || '—'}</td>
                        <td className="py-3 px-4">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getStatusBadge(c.status)}`}>
                            {c.status || 'Active'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-zinc-900">{c.totalBookings || 0}</td>
                        {canViewFinancials && (
                          <>
                            <td className="py-3 px-4 font-semibold text-zinc-900">{formatCurrency(c.totalSpent || 0)}</td>
                            <td className="py-3 px-4">
                              <span className={`font-semibold ${(c.pendingBalance || 0) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {formatCurrency(c.pendingBalance || 0)}
                              </span>
                            </td>
                          </>
                        )}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={(e) => handleCall(e, c.phone)}
                              title="Call"
                              className="p-2 rounded-xl bg-zinc-100 text-zinc-700 hover:bg-zinc-200 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                            >
                              <Phone className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => handleOpenWhatsApp(e, c)}
                              title="WhatsApp"
                              className="p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {filteredCustomers.length === 0 && (
            <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center text-xs text-zinc-500">
              No clients found matching the selected filters or search "{search}".
            </div>
          )}
        </div>
      )}
    </div>
  );
};
