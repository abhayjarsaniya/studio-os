import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useStudio } from '../context/StudioContext';
import { bookingProductionService } from '../services/bookingProductionService';
import { SingleBookingWorkspace } from '../components/bookings/SingleBookingWorkspace';
import { 
  BOOKING_STATUS_LABELS 
} from '../types/bookingProduction';
import { 
  Calendar, 
  MapPin, 
  Search, 
  Plus, 
  CreditCard, 
  CheckCircle2, 
  Sparkles, 
  ArrowLeft,
  ChevronRight,
  PackageCheck,
  Phone,
  IndianRupee,
  CalendarDays,
  Building2
} from 'lucide-react';

export const BookingsWorkspacePage: React.FC = () => {
  const { currentStudio } = useStudio();
  const { setActiveTab } = useApp();
  const studioId = currentStudio?.id || 'studio_shreeji_films';
  const todayStr = new Date().toISOString().split('T')[0];

  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      const match = hash.match(/#\/app\/bookings\/([^/?#]+)/);
      if (match && match[1] !== 'new' && match[1] !== 'create') {
        return match[1];
      }
    }
    return null;
  });

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Listen to hash changes for deep linking e.g. #/app/bookings/:id
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      const match = hash.match(/#\/app\/bookings\/([^/?#]+)/);
      if (match && match[1] !== 'new' && match[1] !== 'create') {
        setSelectedBookingId(match[1]);
      } else if (hash === '#/app/bookings') {
        setSelectedBookingId(null);
      }
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const bookings = useMemo(() => {
    return bookingProductionService.listBookings(studioId);
  }, [studioId]);

  // Filters: All, Upcoming, Confirmed, In Progress, Completed, Pending Payment
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const eventDate = b.mainEventDate || b.startDate || '';

      // Status filtering
      if (statusFilter === 'upcoming') {
        if (eventDate < todayStr || b.status === 'completed' || b.status === 'cancelled') return false;
      } else if (statusFilter === 'confirmed') {
        if (!['deal_confirmed', 'advance_received', 'event_scheduled'].includes(b.status)) return false;
      } else if (statusFilter === 'in_progress') {
        if (!['in_production', 'editing', 'delivery_in_progress'].includes(b.status)) return false;
      } else if (statusFilter === 'completed') {
        if (b.status !== 'completed' && b.status !== 'fully_delivered') return false;
      } else if (statusFilter === 'pending_payment') {
        if ((b.financials?.remainingBalance || 0) <= 0) return false;
      } else if (statusFilter !== 'all') {
        if (b.status !== statusFilter) return false;
      }

      // Search matching
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          b.eventName.toLowerCase().includes(q) ||
          b.customerName.toLowerCase().includes(q) ||
          b.bookingNumber.toLowerCase().includes(q) ||
          (b.customerPhone && b.customerPhone.includes(q)) ||
          b.city.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [bookings, statusFilter, searchTerm, todayStr]);

  // Open booking workspace
  const handleOpenBooking = (id: string) => {
    setSelectedBookingId(id);
    window.location.hash = `#/app/bookings/${id}`;
  };

  // Status Badge Helper
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'deal_confirmed':
      case 'confirmed':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Confirmed</span>;
      case 'advance_received':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">Advance Paid</span>;
      case 'in_progress':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">In Progress</span>;
      case 'fully_delivered':
      case 'completed':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-700 border border-zinc-200">Completed</span>;
      case 'cancelled':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Cancelled</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-600 border border-zinc-200">New Inquiry</span>;
    }
  };

  // If a booking is selected, render the Single Unified Booking Workspace!
  if (selectedBookingId) {
    return (
      <SingleBookingWorkspace
        bookingId={selectedBookingId}
        onBack={() => {
          setSelectedBookingId(null);
          window.location.hash = '#/app/bookings';
        }}
      />
    );
  }

  // ALL BOOKINGS LIST VIEW
  return (
    <div className="space-y-6 pb-20 max-w-6xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-zinc-900 text-white">
              Studio Workspace
            </span>
            <span className="text-xs text-zinc-500">{bookings.length} Bookings Registered</span>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight mt-1 font-display">
            Bookings Directory
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Select any booking to manage customer details, payments, delivery checklists, and WhatsApp messages in one workspace.
          </p>
        </div>

        <button
          onClick={() => {
            setActiveTab('create-booking');
            window.location.hash = '#/app/bookings/new';
          }}
          className="min-h-[44px] px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-emerald-400" />
          <span>+ New Booking</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white border border-zinc-200/90 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by customer name, mobile phone, booking ID, or event name..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-zinc-900"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          {[
            { id: 'all', label: 'All Bookings', count: bookings.length },
            { 
              id: 'upcoming', 
              label: 'Upcoming', 
              count: bookings.filter(b => (b.mainEventDate || b.startDate || '') >= todayStr && b.status !== 'completed' && b.status !== 'cancelled').length 
            },
            { 
              id: 'confirmed', 
              label: 'Confirmed', 
              count: bookings.filter(b => ['deal_confirmed', 'advance_received', 'event_scheduled'].includes(b.status)).length 
            },
            { 
              id: 'in_progress', 
              label: 'In Progress', 
              count: bookings.filter(b => ['in_production', 'editing', 'delivery_in_progress'].includes(b.status)).length 
            },
            { 
              id: 'completed', 
              label: 'Completed', 
              count: bookings.filter(b => b.status === 'completed' || b.status === 'fully_delivered').length 
            },
            { 
              id: 'pending_payment', 
              label: 'Pending Payment', 
              count: bookings.filter(b => (b.financials?.remainingBalance || 0) > 0).length 
            }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`min-h-[36px] px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === f.id
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'bg-zinc-100/80 text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-900'
              }`}
            >
              <span>{f.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                statusFilter === f.id ? 'bg-white/20 text-white' : 'bg-zinc-200 text-zinc-700'
              }`}>
                {f.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* MOBILE CARDS VIEW (Hidden on desktop) */}
      <div className="sm:hidden space-y-3">
        {filteredBookings.map(b => (
          <div
            key={b.id}
            onClick={() => handleOpenBooking(b.id)}
            className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-2xs space-y-3 active:scale-[0.99] transition-all cursor-pointer"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-mono font-bold text-zinc-400 block">{b.bookingNumber}</span>
                <h3 className="text-sm font-bold text-zinc-900">{b.customerName}</h3>
                <p className="text-xs text-zinc-500 mt-0.5">{b.eventName}</p>
              </div>
              {renderStatusBadge(b.status)}
            </div>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-zinc-100 text-zinc-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                {b.mainEventDate || b.startDate}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                {b.city}
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
              <div>
                <span className="text-[10px] text-zinc-400 block">Agreed Amount</span>
                <span className="text-xs font-bold text-zinc-900">
                  ₹{(b.financials?.finalAgreedAmount || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-zinc-400 block">Balance Due</span>
                {(b.financials?.remainingBalance || 0) > 0 ? (
                  <span className="text-xs font-bold text-rose-600">
                    ₹{(b.financials?.remainingBalance || 0).toLocaleString('en-IN')}
                  </span>
                ) : (
                  <span className="text-xs font-bold text-emerald-600">Paid</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* DESKTOP TABLE VIEW (Hidden on mobile) */}
      <div className="hidden sm:block bg-white rounded-2xl border border-zinc-200/90 shadow-2xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50/70 text-zinc-400 uppercase text-[10px] font-bold">
              <th className="py-3 px-4">Booking ID</th>
              <th className="py-3 px-4">Customer & Phone</th>
              <th className="py-3 px-4">Event & Date</th>
              <th className="py-3 px-4">Venue & City</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Agreed Amount</th>
              <th className="py-3 px-4">Balance</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filteredBookings.map(b => {
              const balance = b.financials?.remainingBalance || 0;
              const isPaid = balance <= 0;

              return (
                <tr
                  key={b.id}
                  onClick={() => handleOpenBooking(b.id)}
                  className="hover:bg-zinc-50/80 transition-colors cursor-pointer group"
                >
                  <td className="py-3.5 px-4 font-mono font-bold text-zinc-700">
                    {b.bookingNumber}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-zinc-900 group-hover:text-blue-600 transition-colors">
                      {b.customerName}
                    </div>
                    <div className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                      <Phone className="w-2.5 h-2.5" />
                      <span>{b.customerPhone || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-zinc-900 truncate max-w-[180px]">
                      {b.eventName}
                    </div>
                    <div className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-2.5 h-2.5" />
                      <span>{b.mainEventDate || b.startDate}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="text-zinc-700 truncate max-w-[140px]">{b.venue || 'TBD'}</div>
                    <div className="text-[11px] text-zinc-400">{b.city}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    {renderStatusBadge(b.status)}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-zinc-900">
                    ₹{(b.financials?.finalAgreedAmount || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3.5 px-4">
                    {isPaid ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Paid</span>
                      </span>
                    ) : (
                      <span className="text-rose-600 font-bold">
                        ₹{balance.toLocaleString('en-IN')}
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenBooking(b.id);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-900 hover:text-white font-bold text-[11px] text-zinc-700 transition-all inline-flex items-center gap-1 shadow-2xs"
                    >
                      <span>Open</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              );
            })}

            {filteredBookings.length === 0 && (
              <tr>
                <td colSpan={8} className="py-12 text-center text-zinc-400 text-xs">
                  No bookings matching your search or filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
