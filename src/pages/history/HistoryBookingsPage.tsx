import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useStudio } from '../../context/StudioContext';
import { 
  historyBookingsService, 
  HistoryMainKPIs, 
  HistoryAdditionalInsights 
} from '../../services/historyBookingsService';
import { CustomerDetailModal } from '../../components/history/CustomerDetailModal';
import { WhatsAppChatModal } from '../../components/history/WhatsAppChatModal';
import { PDFViewerModal } from '../../components/finance/PDFViewerModal';
import { pdfGeneratorService, PDFGenerationPayload } from '../../services/pdfGeneratorService';
import { financialSettingsService } from '../../services/financialSettingsService';
import { 
  History, 
  Search, 
  Filter, 
  Calendar, 
  Users, 
  FileText, 
  IndianRupee, 
  Camera, 
  Film, 
  BookOpen, 
  ArrowUpDown, 
  Download, 
  Share2, 
  MessageCircle, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  Eye, 
  Sparkles,
  MapPin,
  Tag,
  Building,
  RefreshCw,
  Plus
} from 'lucide-react';
import { ShreejiBookingSeedService } from '../../services/shreejiBookingSeedService';

type InnerTabId = 
  | 'bookings' 
  | 'customers' 
  | 'quotations' 
  | 'negotiations' 
  | 'invoices' 
  | 'payments' 
  | 'deliveries' 
  | 'reports';

export const HistoryBookingsPage: React.FC = () => {
  const { currentStudio } = useStudio();
  const studioId = currentStudio.id || 'std_demo_royal';

  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<InnerTabId>('bookings');
  const [updateTrigger, setUpdateTrigger] = useState(0);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterCity, setFilterCity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterNegotiated, setFilterNegotiated] = useState<'all' | 'negotiated' | 'non_negotiated'>('all');
  const [sortBy, setSortBy] = useState<string>('newest');

  // Modals State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [whatsAppData, setWhatsAppModalData] = useState<{
    customerName: string;
    phone: string;
    bookingId?: string;
    eventName?: string;
    finalAmount?: number;
    amountReceived?: number;
    remainingBalance?: number;
  } | null>(null);

  const [pdfPayload, setPdfPayload] = useState<PDFGenerationPayload | null>(null);

  // Ensure initial seed on mount
  useEffect(() => {
    ShreejiBookingSeedService.seedAllSampleBookings(false, studioId);
    ShreejiBookingSeedService.seedAllSampleBookings(false, 'studio_shreeji_films');
    ShreejiBookingSeedService.seedAllSampleBookings(false, 'std_demo_royal');
  }, [studioId]);

  // Load All Data
  const rawData = useMemo(() => {
    return historyBookingsService.getAllData(studioId);
  }, [studioId, updateTrigger]);

  const mainKPIs: HistoryMainKPIs = useMemo(() => {
    return historyBookingsService.getMainKPIs(studioId);
  }, [studioId, updateTrigger]);

  const additionalInsights: HistoryAdditionalInsights = useMemo(() => {
    return historyBookingsService.getAdditionalInsights(studioId);
  }, [studioId, updateTrigger]);

  // Unique Filter Options
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    rawData.bookings.forEach(b => { if (b.category) set.add(b.category); });
    return Array.from(set);
  }, [rawData.bookings]);

  const citiesList = useMemo(() => {
    const set = new Set<string>();
    rawData.bookings.forEach(b => { if (b.city) set.add(b.city); });
    return Array.from(set);
  }, [rawData.bookings]);

  // Filtered Bookings
  const filteredBookings = useMemo(() => {
    return rawData.bookings.filter(b => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match = 
          b.customerName.toLowerCase().includes(q) ||
          b.customerPhone.includes(q) ||
          b.bookingNumber.toLowerCase().includes(q) ||
          b.eventName.toLowerCase().includes(q) ||
          b.venue.toLowerCase().includes(q) ||
          (b.city && b.city.toLowerCase().includes(q));
        if (!match) return false;
      }
      // Category
      if (filterCategory !== 'all' && b.category !== filterCategory) return false;
      // City
      if (filterCity !== 'all' && b.city !== filterCity) return false;
      // Status
      if (filterStatus !== 'all' && b.status !== filterStatus) return false;
      // Negotiated
      if (filterNegotiated === 'negotiated' && (b.financials?.negotiatedDiscount || 0) <= 0) return false;
      if (filterNegotiated === 'non_negotiated' && (b.financials?.negotiatedDiscount || 0) > 0) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.mainEventDate).getTime() - new Date(a.mainEventDate).getTime();
      if (sortBy === 'oldest') return new Date(a.mainEventDate).getTime() - new Date(b.mainEventDate).getTime();
      if (sortBy === 'highest_amount') return (b.financials?.finalAgreedAmount || 0) - (a.financials?.finalAgreedAmount || 0);
      if (sortBy === 'lowest_amount') return (a.financials?.finalAgreedAmount || 0) - (b.financials?.finalAgreedAmount || 0);
      if (sortBy === 'balance_due') return (b.financials?.remainingBalance || 0) - (a.financials?.remainingBalance || 0);
      return 0;
    });
  }, [rawData.bookings, searchQuery, filterCategory, filterCity, filterStatus, filterNegotiated, sortBy]);

  // Filtered Customers
  const filteredCustomers = useMemo(() => {
    return rawData.customers.filter(c => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return c.name.toLowerCase().includes(q) || c.phone.includes(q) || (c.city && c.city.toLowerCase().includes(q));
      }
      if (filterCity !== 'all' && c.city !== filterCity) return false;
      return true;
    });
  }, [rawData.customers, searchQuery, filterCity]);

  // Filtered Negotiations
  const filteredNegotiations = useMemo(() => {
    return rawData.bookings.filter(b => (b.financials?.negotiatedDiscount || 0) > 0).map(b => ({
      booking: b,
      originalQuotation: b.financials.originalQuotation,
      discount: b.financials.negotiatedDiscount,
      finalAmount: b.financials.finalAgreedAmount,
      reason: b.billingVersions?.[0]?.negotiationReason || (b.billingVersions?.[0] as any)?.reason || 'Customer relationship concession',
      date: b.mainEventDate,
      percent: Math.round((b.financials.negotiatedDiscount / b.financials.originalQuotation) * 100)
    }));
  }, [rawData.bookings]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Booking ID', 'Customer Name', 'Phone', 'Event Name', 'Category', 'Date', 'Venue', 'City', 'Quoted Amount', 'Discount', 'Final Amount', 'Payments Received', 'Balance Due', 'Status'];
    const rows = filteredBookings.map(b => [
      b.bookingNumber,
      `"${b.customerName}"`,
      b.customerPhone,
      `"${b.eventName}"`,
      b.category,
      b.mainEventDate,
      `"${b.venue}"`,
      b.city,
      b.financials?.originalQuotation || 0,
      b.financials?.negotiatedDiscount || 0,
      b.financials?.finalAgreedAmount || 0,
      b.financials?.verifiedPaymentsReceived || 0,
      b.financials?.remainingBalance || 0,
      b.status
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Shreeji_Studio_Bookings_History_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-zinc-50/70 p-3 sm:p-6 space-y-6 font-sans select-none">
      
      {/* 1. TOP HEADER BANNER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-zinc-200 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-zinc-900 text-white flex items-center justify-center shrink-0 shadow-xs">
            <History className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 font-display">
                History Bookings
              </h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                Shreeji Studio
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              All customers, bookings, quotations, payments, invoices and delivery history in one place.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => {
              ShreejiBookingSeedService.seedAllSampleBookings(true);
              setUpdateTrigger(v => v + 1);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-700 transition-colors cursor-pointer min-h-[44px]"
            title="Refresh & sync sample data"
          >
            <RefreshCw className="w-3.5 h-3.5 text-zinc-500" />
            <span>Sync Data</span>
          </button>
          
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer min-h-[44px]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 2. 12 MAIN KPI CARDS MATRIX */}
      <div>
        <div className="flex items-center justify-between mb-2.5 px-1">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Platform Business History Overview
          </h3>
          <span className="text-xs text-zinc-400">Click any card to inspect filtered records</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {/* 1. Total Bookings */}
          <div 
            onClick={() => setActiveTab('bookings')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-2xs hover:border-zinc-400 bg-white ${
              activeTab === 'bookings' ? 'border-zinc-900 ring-2 ring-zinc-900/10' : 'border-zinc-200'
            }`}
          >
            <div className="flex items-center justify-between text-zinc-400 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Total Bookings</span>
              <Calendar className="w-4 h-4 text-zinc-500" />
            </div>
            <p className="text-lg font-bold text-zinc-900">{mainKPIs.totalBookings}</p>
            <span className="text-xs text-zinc-500 font-medium">All recorded orders</span>
          </div>

          {/* 2. Total Customers */}
          <div 
            onClick={() => setActiveTab('customers')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-2xs hover:border-zinc-400 bg-white ${
              activeTab === 'customers' ? 'border-zinc-900 ring-2 ring-zinc-900/10' : 'border-zinc-200'
            }`}
          >
            <div className="flex items-center justify-between text-zinc-400 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Total Customers</span>
              <Users className="w-4 h-4 text-sky-600" />
            </div>
            <p className="text-lg font-bold text-zinc-900">{mainKPIs.totalCustomers}</p>
            <span className="text-xs text-sky-600 font-medium">{additionalInsights.repeatCustomerCount} Repeat Clients</span>
          </div>

          {/* 3. Confirmed Bookings */}
          <div 
            onClick={() => { setActiveTab('bookings'); setFilterStatus('confirmed'); }}
            className="p-3.5 rounded-xl border border-zinc-200 bg-white hover:border-zinc-400 transition-all cursor-pointer shadow-2xs"
          >
            <div className="flex items-center justify-between text-zinc-400 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Confirmed</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-lg font-bold text-emerald-600">{mainKPIs.confirmedBookings}</p>
            <span className="text-xs text-zinc-500 font-medium">Active & In Production</span>
          </div>

          {/* 4. Completed Events */}
          <div 
            onClick={() => { setActiveTab('bookings'); setFilterStatus('completed'); }}
            className="p-3.5 rounded-xl border border-zinc-200 bg-white hover:border-zinc-400 transition-all cursor-pointer shadow-2xs"
          >
            <div className="flex items-center justify-between text-zinc-400 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Completed</span>
              <Clock className="w-4 h-4 text-zinc-700" />
            </div>
            <p className="text-lg font-bold text-zinc-900">{mainKPIs.completedEvents}</p>
            <span className="text-xs text-zinc-500 font-medium">Delivered & Closed</span>
          </div>

          {/* 5. Total Quotation Value */}
          <div 
            onClick={() => setActiveTab('quotations')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-2xs hover:border-zinc-400 bg-white ${
              activeTab === 'quotations' ? 'border-zinc-900 ring-2 ring-zinc-900/10' : 'border-zinc-200'
            }`}
          >
            <div className="flex items-center justify-between text-zinc-400 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Quoted Total</span>
              <FileText className="w-4 h-4 text-indigo-600" />
            </div>
            <p className="text-lg font-bold text-zinc-900">₹{(mainKPIs.totalQuotationValue / 100000).toFixed(1)}L</p>
            <span className="text-xs text-zinc-500 font-medium">₹{mainKPIs.totalQuotationValue.toLocaleString('en-IN')}</span>
          </div>

          {/* 6. Final Agreed Value */}
          <div 
            onClick={() => setActiveTab('bookings')}
            className="p-3.5 rounded-xl border border-zinc-200 bg-white hover:border-zinc-400 transition-all cursor-pointer shadow-2xs"
          >
            <div className="flex items-center justify-between text-zinc-400 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Agreed Value</span>
              <IndianRupee className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-lg font-bold text-emerald-700">₹{(mainKPIs.finalAgreedValue / 100000).toFixed(1)}L</p>
            <span className="text-xs text-emerald-600 font-medium">Net Booking Value</span>
          </div>

          {/* 7. Payments Received */}
          <div 
            onClick={() => setActiveTab('payments')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-2xs hover:border-zinc-400 bg-white ${
              activeTab === 'payments' ? 'border-zinc-900 ring-2 ring-zinc-900/10' : 'border-zinc-200'
            }`}
          >
            <div className="flex items-center justify-between text-zinc-400 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Received</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-lg font-bold text-emerald-600">₹{(mainKPIs.totalPaymentsReceived / 100000).toFixed(1)}L</p>
            <span className="text-xs text-zinc-500 font-medium">Verified in Ledger</span>
          </div>

          {/* 8. Outstanding Payments */}
          <div 
            onClick={() => { setActiveTab('invoices'); setSortBy('balance_due'); }}
            className="p-3.5 rounded-xl border border-zinc-200 bg-white hover:border-zinc-400 transition-all cursor-pointer shadow-2xs"
          >
            <div className="flex items-center justify-between text-zinc-400 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Outstanding</span>
              <AlertCircle className="w-4 h-4 text-rose-500" />
            </div>
            <p className="text-lg font-bold text-rose-600">₹{(mainKPIs.outstandingPayments / 100000).toFixed(1)}L</p>
            <span className="text-xs text-rose-500 font-medium">Remaining Balance</span>
          </div>

          {/* 9. Negotiated Discounts */}
          <div 
            onClick={() => setActiveTab('negotiations')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-2xs hover:border-zinc-400 bg-white ${
              activeTab === 'negotiations' ? 'border-zinc-900 ring-2 ring-zinc-900/10' : 'border-zinc-200'
            }`}
          >
            <div className="flex items-center justify-between text-zinc-400 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Discounts Given</span>
              <TrendingDown className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-lg font-bold text-amber-700">₹{(mainKPIs.negotiatedDiscounts / 1000).toFixed(0)}K</p>
            <span className="text-xs text-zinc-500 font-medium">Avg ₹{additionalInsights.averageNegotiationDiscount.toLocaleString('en-IN')}</span>
          </div>

          {/* 10. Total Deliverables */}
          <div 
            onClick={() => setActiveTab('deliveries')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-2xs hover:border-zinc-400 bg-white ${
              activeTab === 'deliveries' ? 'border-zinc-900 ring-2 ring-zinc-900/10' : 'border-zinc-200'
            }`}
          >
            <div className="flex items-center justify-between text-zinc-400 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Deliverables</span>
              <Tag className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-lg font-bold text-zinc-900">{mainKPIs.totalDeliverables}</p>
            <span className="text-xs text-zinc-500 font-medium">{additionalInsights.pendingDeliveries} In Progress</span>
          </div>

          {/* 11. Photos Delivered */}
          <div 
            onClick={() => setActiveTab('deliveries')}
            className="p-3.5 rounded-xl border border-zinc-200 bg-white hover:border-zinc-400 transition-all cursor-pointer shadow-2xs"
          >
            <div className="flex items-center justify-between text-zinc-400 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Photos Delivered</span>
              <Camera className="w-4 h-4 text-teal-600" />
            </div>
            <p className="text-lg font-bold text-teal-700">{mainKPIs.photosDelivered.toLocaleString('en-IN')}</p>
            <span className="text-xs text-zinc-500 font-medium">Curated High-Res</span>
          </div>

          {/* 12. Albums Completed */}
          <div 
            onClick={() => setActiveTab('deliveries')}
            className="p-3.5 rounded-xl border border-zinc-200 bg-white hover:border-zinc-400 transition-all cursor-pointer shadow-2xs"
          >
            <div className="flex items-center justify-between text-zinc-400 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Albums Done</span>
              <BookOpen className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-lg font-bold text-amber-700">{mainKPIs.albumsCompleted}</p>
            <span className="text-xs text-zinc-500 font-medium">Canvera Photobooks</span>
          </div>
        </div>
      </div>

      {/* 3. BUSINESS INSIGHTS HIGHLIGHT BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 p-3.5 bg-white rounded-xl border border-zinc-200 text-xs shadow-2xs">
        <div>
          <span className="text-zinc-400 block text-xs uppercase font-bold">Avg Booking</span>
          <span className="font-bold text-zinc-900">₹{additionalInsights.averageBookingValue.toLocaleString('en-IN')}</span>
        </div>
        <div>
          <span className="text-zinc-400 block text-xs uppercase font-bold">Conversion Rate</span>
          <span className="font-bold text-emerald-600">{additionalInsights.quotationConversionRate}% ({additionalInsights.quotationConversionsCount} won)</span>
        </div>
        <div>
          <span className="text-zinc-400 block text-xs uppercase font-bold">Upcoming Shoots</span>
          <span className="font-bold text-sky-700">{additionalInsights.upcomingShoots} Booked</span>
        </div>
        <div>
          <span className="text-zinc-400 block text-xs uppercase font-bold">Videos Done</span>
          <span className="font-bold text-indigo-700">{additionalInsights.completedVideos} Delivered</span>
        </div>
        <div>
          <span className="text-zinc-400 block text-xs uppercase font-bold">Pending Quotations</span>
          <span className="font-bold text-amber-700">{additionalInsights.pendingQuotations} Active</span>
        </div>
        <div>
          <span className="text-zinc-400 block text-xs uppercase font-bold">Overdue Handover</span>
          <span className="font-bold text-emerald-600">0 Overdue (100% on time)</span>
        </div>
      </div>

      {/* 4. SEARCH & GLOBAL FILTERS TOOLBAR */}
      <div className="p-4 bg-white rounded-2xl border border-zinc-200 space-y-3 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by customer, phone, booking ID, event name, venue, city..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 min-h-[44px]"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Category */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-700 bg-white focus:outline-none min-h-[44px] cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categoriesList.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* City */}
            <select
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
              className="px-3 py-2 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-700 bg-white focus:outline-none min-h-[44px] cursor-pointer"
            >
              <option value="all">All Gujarat Cities</option>
              {citiesList.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>

            {/* Negotiation */}
            <select
              value={filterNegotiated}
              onChange={(e) => setFilterNegotiated(e.target.value as any)}
              className="px-3 py-2 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-700 bg-white focus:outline-none min-h-[44px] cursor-pointer"
            >
              <option value="all">All Pricing</option>
              <option value="negotiated">Negotiated Concessions</option>
              <option value="non_negotiated">Standard Price Only</option>
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-700 bg-white focus:outline-none min-h-[44px] cursor-pointer"
            >
              <option value="newest">Newest Event Date</option>
              <option value="oldest">Oldest Event Date</option>
              <option value="highest_amount">Highest Value First</option>
              <option value="lowest_amount">Lowest Value First</option>
              <option value="balance_due">Highest Balance Due</option>
            </select>
          </div>
        </div>

        {/* Active Filters Pill display */}
        {(searchQuery || filterCategory !== 'all' || filterCity !== 'all' || filterStatus !== 'all' || filterNegotiated !== 'all') && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-100 text-xs">
            <span className="text-zinc-400 text-xs font-bold">Filtered:</span>
            {searchQuery && (
              <span className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 text-xs font-medium">
                Query: "{searchQuery}"
              </span>
            )}
            {filterCategory !== 'all' && (
              <span className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 text-xs font-medium">
                Category: {filterCategory}
              </span>
            )}
            {filterCity !== 'all' && (
              <span className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 text-xs font-medium">
                City: {filterCity}
              </span>
            )}
            {filterNegotiated !== 'all' && (
              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-xs font-medium border border-amber-200">
                {filterNegotiated === 'negotiated' ? 'Negotiated Only' : 'Standard Price Only'}
              </span>
            )}
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterCategory('all');
                setFilterCity('all');
                setFilterStatus('all');
                setFilterNegotiated('all');
              }}
              className="text-xs font-bold text-rose-600 hover:underline cursor-pointer ml-auto"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* 5. 8 INNER TABS STRIP */}
      <div className="border-b border-zinc-200 bg-white rounded-t-2xl px-2 sm:px-4 flex gap-1 sm:gap-2 overflow-x-auto shadow-2xs">
        {[
          { id: 'bookings', label: '1. All Bookings', count: filteredBookings.length },
          { id: 'customers', label: '2. Customers', count: filteredCustomers.length },
          { id: 'quotations', label: '3. Quotations', count: rawData.quotations.length },
          { id: 'negotiations', label: '4. Negotiations', count: filteredNegotiations.length },
          { id: 'invoices', label: '5. Invoices & Bills', count: rawData.invoices.length },
          { id: 'payments', label: '6. Payments', count: rawData.payments.length },
          { id: 'deliveries', label: '7. Deliveries & Albums', count: mainKPIs.totalDeliverables },
          { id: 'reports', label: '8. Reports', count: undefined }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as InnerTabId)}
            className={`py-3.5 px-3 sm:px-4 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === tab.id
                ? 'border-zinc-900 text-zinc-900 bg-zinc-50/50'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50/30'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className={`text-xs px-1.5 py-0.2 rounded-full ${
                activeTab === tab.id ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 6. TAB CONTENT SECTIONS */}
      <div className="bg-white rounded-b-2xl border-x border-b border-zinc-200 p-4 sm:p-6 shadow-2xs">
        
        {/* TAB 1: ALL BOOKINGS */}
        {activeTab === 'bookings' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-zinc-500 pb-1">
              <span>Showing <strong>{filteredBookings.length}</strong> bookings for Shreeji Studio</span>
              <span className="text-xs text-zinc-400">Gujarat Destinations & Local Events</span>
            </div>

            <div className="space-y-3">
              {filteredBookings.map(b => (
                <div 
                  key={b.id} 
                  className="p-4 rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 transition-all shadow-2xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold text-zinc-900 truncate font-display">
                          {b.eventName}
                        </h4>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700">
                          {b.bookingNumber}
                        </span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {b.category}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="font-semibold text-zinc-800 flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-zinc-400" />
                          {b.customerName}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                          {b.mainEventDate}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                          {b.venue}, {b.city}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                      <div className="text-right">
                        <p className="text-sm font-bold text-zinc-900">
                          ₹{(b.financials?.finalAgreedAmount || 0).toLocaleString('en-IN')}
                        </p>
                        <p className="text-xs font-semibold text-emerald-600">
                          ₹{(b.financials?.verifiedPaymentsReceived || 0).toLocaleString('en-IN')} Paid
                        </p>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase ${
                        b.status === 'completed' || b.status === 'fully_delivered'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : b.status === 'cancelled'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-zinc-900 text-white'
                      }`}>
                        {b.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Pricing Concession Ribbon */}
                  {(b.financials?.negotiatedDiscount || 0) > 0 && (
                    <div className="px-3 py-1.5 rounded-lg bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 flex items-center justify-between">
                      <span>
                        <strong>Negotiation Concession:</strong> Quoted ₹{b.financials.originalQuotation.toLocaleString('en-IN')} → Discount -₹{b.financials.negotiatedDiscount.toLocaleString('en-IN')}
                      </span>
                      <span className="italic text-amber-800 truncate max-w-xs ml-2">
                        "{b.billingVersions?.[0]?.negotiationReason || (b.billingVersions?.[0] as any)?.reason || 'Special courtesy discount'}"
                      </span>
                    </div>
                  )}

                  {/* Actions Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-100">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setSelectedCustomerId(b.customerId)}
                        className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold transition-colors cursor-pointer min-h-[36px]"
                      >
                        View Customer History
                      </button>

                      <button
                        onClick={() => {
                          const inv = rawData.invoices.find(i => i.customerId === b.customerId);
                          if (inv) {
                            setPdfPayload(pdfGeneratorService.createInvoicePayload(inv, financialSettingsService.getSettings(studioId)));
                          } else {
                            alert('No formal invoice generated yet for this booking.');
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-700 text-xs font-semibold transition-colors cursor-pointer min-h-[36px]"
                      >
                        View Invoice
                      </button>

                      <button
                        onClick={() => {
                          const qt = rawData.quotations.find(q => q.customerId === b.customerId);
                          if (qt) {
                            setPdfPayload(pdfGeneratorService.createQuotationPayload(qt, financialSettingsService.getSettings(studioId)));
                          } else {
                            alert('No quotation on record.');
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-700 text-xs font-semibold transition-colors cursor-pointer min-h-[36px]"
                      >
                        View Quotation
                      </button>
                    </div>

                    <button
                      onClick={() => setWhatsAppModalData({
                        customerName: b.customerName,
                        phone: b.customerPhone,
                        bookingId: b.bookingNumber,
                        eventName: b.eventName,
                        finalAmount: b.financials?.finalAgreedAmount,
                        amountReceived: b.financials?.verifiedPaymentsReceived,
                        remainingBalance: b.financials?.remainingBalance
                      })}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs min-h-[36px]"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp Summary</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: CUSTOMERS */}
        {activeTab === 'customers' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredCustomers.map(c => {
                const cBookings = rawData.bookings.filter(b => b.customerId === c.id);
                const totalVal = cBookings.reduce((sum, b) => sum + (b.financials?.finalAgreedAmount || 0), 0);
                const totalPaid = cBookings.reduce((sum, b) => sum + (b.financials?.verifiedPaymentsReceived || 0), 0);
                const bal = Math.max(0, totalVal - totalPaid);

                return (
                  <div 
                    key={c.id}
                    onClick={() => setSelectedCustomerId(c.id)}
                    className="p-4 rounded-xl border border-zinc-200 bg-white hover:border-zinc-400 transition-all cursor-pointer shadow-2xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                          {c.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-zinc-900 truncate">{c.name}</h4>
                          <p className="text-xs text-zinc-500 truncate flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-zinc-400" />
                            {c.city || 'Gujarat'}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700">
                        {cBookings.length} Bookings
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-100 text-xs text-center">
                      <div>
                        <span className="text-zinc-400 block text-xs uppercase font-bold">Total</span>
                        <span className="font-bold text-zinc-900">₹{totalVal.toLocaleString('en-IN')}</span>
                      </div>
                      <div>
                        <span className="text-zinc-400 block text-xs uppercase font-bold">Paid</span>
                        <span className="font-bold text-emerald-600">₹{totalPaid.toLocaleString('en-IN')}</span>
                      </div>
                      <div>
                        <span className="text-zinc-400 block text-xs uppercase font-bold">Balance</span>
                        <span className={`font-bold ${bal > 0 ? 'text-rose-600' : 'text-zinc-600'}`}>
                          ₹{bal.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 text-zinc-400 hover:text-zinc-900 font-bold">
                      <span>Inspect Complete History</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: QUOTATIONS */}
        {activeTab === 'quotations' && (
          <div className="space-y-3">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 text-zinc-400 uppercase text-xs font-bold">
                    <th className="py-3 px-3">Quotation ID</th>
                    <th className="py-3 px-3">Customer</th>
                    <th className="py-3 px-3">Valid Until</th>
                    <th className="py-3 px-3">Items</th>
                    <th className="py-3 px-3 text-right">Quoted Amount</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {rawData.quotations.map(q => (
                    <tr key={q.id} className="hover:bg-zinc-50/70">
                      <td className="py-3 px-3 font-bold text-zinc-900">{q.quotationNumber}</td>
                      <td className="py-3 px-3 text-zinc-800 font-semibold">{q.customerName}</td>
                      <td className="py-3 px-3 text-zinc-500">{q.validUntil}</td>
                      <td className="py-3 px-3 text-zinc-500">{q.items?.length || 0} line items</td>
                      <td className="py-3 px-3 text-right font-bold text-zinc-900">₹{q.totalAmount.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {q.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => setPdfPayload(pdfGeneratorService.createQuotationPayload(q, financialSettingsService.getSettings(studioId)))}
                          className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-bold cursor-pointer"
                        >
                          View PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: NEGOTIATIONS */}
        {activeTab === 'negotiations' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80 text-xs text-amber-900 flex items-center justify-between">
              <div>
                <h4 className="font-bold">Negotiation & Discount Transparency Ledger</h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  Original quotations are permanently preserved. Discounts are recorded with reasons.
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold uppercase text-amber-700 block">Total Concessions</span>
                <span className="text-base font-bold text-amber-900">₹{mainKPIs.negotiatedDiscounts.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="space-y-3">
              {filteredNegotiations.map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-zinc-200 bg-white space-y-2 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div>
                      <h4 className="text-xs font-bold text-zinc-900">{item.booking.eventName}</h4>
                      <p className="text-xs text-zinc-500">{item.booking.customerName} • {item.booking.city} • {item.date}</p>
                    </div>
                    <span className="text-xs font-bold text-rose-600 self-start sm:self-center">
                      -₹{item.discount.toLocaleString('en-IN')} ({item.percent}% Off)
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 p-3 bg-zinc-50 rounded-lg text-xs font-semibold">
                    <span className="text-zinc-500">
                      Original Quote: <strong className="line-through text-zinc-400">₹{item.originalQuotation.toLocaleString('en-IN')}</strong>
                    </span>
                    <span className="text-zinc-300">→</span>
                    <span className="text-rose-600 font-bold">
                      Discount Concession: -₹{item.discount.toLocaleString('en-IN')}
                    </span>
                    <span className="text-zinc-300">→</span>
                    <span className="text-emerald-700 font-bold">
                      Final Agreed Price: ₹{item.finalAmount.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-600 italic">
                    <strong className="text-zinc-700 not-italic">Justification / Reason:</strong> "{item.reason}"
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: INVOICES & BILLS */}
        {activeTab === 'invoices' && (
          <div className="space-y-3">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 text-zinc-400 uppercase text-xs font-bold">
                    <th className="py-3 px-3">Invoice No</th>
                    <th className="py-3 px-3">Customer</th>
                    <th className="py-3 px-3">Issue Date</th>
                    <th className="py-3 px-3">Due Date</th>
                    <th className="py-3 px-3 text-right">Invoiced Amount</th>
                    <th className="py-3 px-3 text-right">Balance Due</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {rawData.invoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-zinc-50/70">
                      <td className="py-3 px-3 font-bold text-zinc-900">{inv.invoiceNumber}</td>
                      <td className="py-3 px-3 text-zinc-800 font-semibold">{inv.customerName}</td>
                      <td className="py-3 px-3 text-zinc-500">{inv.issuedAt || (inv as any).issueDate}</td>
                      <td className="py-3 px-3 text-zinc-500">{inv.dueDate}</td>
                      <td className="py-3 px-3 text-right font-bold text-zinc-900">₹{inv.totalAmount.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-3 text-right font-bold text-rose-600">₹{((inv as any).balanceAmount ?? ((inv.totalAmount || 0) - (inv.paidAmount || 0))).toLocaleString('en-IN')}</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase ${
                          inv.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => setPdfPayload(pdfGeneratorService.createInvoicePayload(inv, financialSettingsService.getSettings(studioId)))}
                          className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-bold cursor-pointer"
                        >
                          View PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: PAYMENTS */}
        {activeTab === 'payments' && (
          <div className="space-y-3">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 text-zinc-400 uppercase text-xs font-bold">
                    <th className="py-3 px-3">Receipt / Ref</th>
                    <th className="py-3 px-3">Customer</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Method</th>
                    <th className="py-3 px-3">Reference Code</th>
                    <th className="py-3 px-3 text-right">Amount Received</th>
                    <th className="py-3 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {rawData.payments.map(p => (
                    <tr key={p.id} className="hover:bg-zinc-50/70">
                      <td className="py-3 px-3 font-bold text-zinc-900">{(p as any).paymentNumber || p.receiptNumber || p.id}</td>
                      <td className="py-3 px-3 text-zinc-800 font-semibold">{p.customerName}</td>
                      <td className="py-3 px-3 text-zinc-500">{p.paymentDate}</td>
                      <td className="py-3 px-3">
                        <span className="capitalize px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 font-semibold">
                          {p.paymentMethod.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-zinc-500 font-mono text-xs">{p.transactionReference || 'N/A'}</td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-600">₹{p.amount.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Verified
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 7: DELIVERIES & ALBUMS */}
        {activeTab === 'deliveries' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl border border-zinc-200 bg-white shadow-2xs">
                <div className="flex items-center gap-2 text-indigo-600 mb-1">
                  <Camera className="w-4 h-4" />
                  <span className="text-xs font-bold">Photos Delivered</span>
                </div>
                <p className="text-2xl font-bold text-zinc-900">{mainKPIs.photosDelivered.toLocaleString('en-IN')}</p>
                <p className="text-xs text-zinc-500 mt-1">Curated, Color-Graded Stills</p>
              </div>

              <div className="p-4 rounded-xl border border-zinc-200 bg-white shadow-2xs">
                <div className="flex items-center gap-2 text-rose-600 mb-1">
                  <Film className="w-4 h-4" />
                  <span className="text-xs font-bold">Videos & Reels</span>
                </div>
                <p className="text-2xl font-bold text-zinc-900">{additionalInsights.completedVideos}</p>
                <p className="text-xs text-zinc-500 mt-1">4K Cinematic Films & 9:16 Reels</p>
              </div>

              <div className="p-4 rounded-xl border border-zinc-200 bg-white shadow-2xs">
                <div className="flex items-center gap-2 text-amber-600 mb-1">
                  <BookOpen className="w-4 h-4" />
                  <span className="text-xs font-bold">Luxury Albums</span>
                </div>
                <p className="text-2xl font-bold text-zinc-900">{mainKPIs.albumsCompleted}</p>
                <p className="text-xs text-zinc-500 mt-1">Canvera Ultra-HD Print Spec</p>
              </div>
            </div>

            <div className="space-y-2">
              {filteredBookings.map(b => (
                <div key={b.id} className="p-3.5 rounded-xl border border-zinc-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
                  <div>
                    <h4 className="font-bold text-zinc-900">{b.eventName}</h4>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Client: {b.customerName} • {b.deliverables?.length || 0} deliverable items configured
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedCustomerId(b.customerId)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Update Deliverables
                    </button>
                    <button
                      onClick={() => setWhatsAppModalData({
                        customerName: b.customerName,
                        phone: b.customerPhone,
                        bookingId: b.bookingNumber,
                        eventName: b.eventName
                      })}
                      className="p-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
                      title="Send Delivery Update"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 8: REPORTS & ANALYTICS */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-zinc-900">Executive Business Performance Reports</h4>
                <p className="text-xs text-zinc-500">Live consolidated calculations from confirmed studio bookings</p>
              </div>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Report Data</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/50 space-y-2">
                <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider block">Financial Performance</span>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between py-1 border-b border-zinc-200/60">
                    <span className="text-zinc-500">Gross Quoted Value:</span>
                    <span className="font-bold">₹{mainKPIs.totalQuotationValue.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-200/60">
                    <span className="text-zinc-500">Negotiated Concessions:</span>
                    <span className="font-bold text-amber-600">-₹{mainKPIs.negotiatedDiscounts.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-200/60">
                    <span className="text-zinc-500">Net Agreed Sales:</span>
                    <span className="font-bold text-emerald-700">₹{mainKPIs.finalAgreedValue.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-200/60">
                    <span className="text-zinc-500">Collected Revenue:</span>
                    <span className="font-bold text-emerald-600">₹{mainKPIs.totalPaymentsReceived.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-zinc-500">Pending Collection:</span>
                    <span className="font-bold text-rose-600">₹{mainKPIs.outstandingPayments.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/50 space-y-2">
                <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider block">Production & Fulfillment</span>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between py-1 border-b border-zinc-200/60">
                    <span className="text-zinc-500">Total Orders Received:</span>
                    <span className="font-bold">{mainKPIs.totalBookings} Bookings</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-200/60">
                    <span className="text-zinc-500">Completed & Handed Over:</span>
                    <span className="font-bold text-emerald-600">{mainKPIs.completedEvents} Events</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-200/60">
                    <span className="text-zinc-500">High-Res Photos Delivered:</span>
                    <span className="font-bold text-teal-700">{mainKPIs.photosDelivered.toLocaleString('en-IN')} Photos</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-200/60">
                    <span className="text-zinc-500">Wedding Albums Printed:</span>
                    <span className="font-bold text-amber-700">{mainKPIs.albumsCompleted} Bespoke Photobooks</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-zinc-500">On-Time Delivery Rate:</span>
                    <span className="font-bold text-emerald-600">100% SLA Fulfillment</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/50 space-y-2">
                <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider block">Customer Growth & Conversion</span>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between py-1 border-b border-zinc-200/60">
                    <span className="text-zinc-500">Total Unique Clients:</span>
                    <span className="font-bold">{mainKPIs.totalCustomers} Clients</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-200/60">
                    <span className="text-zinc-500">Quotation Conversion Rate:</span>
                    <span className="font-bold text-emerald-600">{additionalInsights.quotationConversionRate}%</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-200/60">
                    <span className="text-zinc-500">Average Order Value:</span>
                    <span className="font-bold">₹{additionalInsights.averageBookingValue.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-200/60">
                    <span className="text-zinc-500">Repeat Bookings:</span>
                    <span className="font-bold text-sky-700">{additionalInsights.repeatCustomerCount} Multi-event Clients</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-zinc-500">Primary Geographic Base:</span>
                    <span className="font-bold text-zinc-800">Gujarat (Ahmedabad, Surat, Rajkot, Vadodara)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* 7. CUSTOMER DETAIL MODAL */}
      {selectedCustomerId && (
        <CustomerDetailModal
          customerId={selectedCustomerId}
          studioId={studioId}
          onClose={() => setSelectedCustomerId(null)}
          onOpenWhatsApp={(payload) => {
            setSelectedCustomerId(null);
            setWhatsAppModalData(payload);
          }}
        />
      )}

      {/* 8. WHATSAPP CHAT MODAL */}
      {whatsAppData && (
        <WhatsAppChatModal
          customerName={whatsAppData.customerName}
          phone={whatsAppData.phone}
          bookingId={whatsAppData.bookingId}
          eventName={whatsAppData.eventName}
          finalAmount={whatsAppData.finalAmount}
          amountReceived={whatsAppData.amountReceived}
          remainingBalance={whatsAppData.remainingBalance}
          onClose={() => setWhatsAppModalData(null)}
        />
      )}

      {/* 9. PDF VIEWER MODAL */}
      <PDFViewerModal
        isOpen={Boolean(pdfPayload)}
        onClose={() => setPdfPayload(null)}
        payload={pdfPayload}
      />

    </div>
  );
};
