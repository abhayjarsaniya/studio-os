import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useStudio } from '../context/StudioContext';
import { bookingProductionService } from '../services/bookingProductionService';
import { SingleBookingWorkspace } from '../components/bookings/SingleBookingWorkspace';
import { NewBookingButton } from '../components/common/NewBookingButton';
import { 
  BookingRecord,
  BOOKING_STATUS_LABELS 
} from '../types/bookingProduction';
import { 
  Calendar, 
  MapPin, 
  Search, 
  Plus, 
  CreditCard, 
  CheckCircle2, 
  CheckCircle,
  Sparkles, 
  ArrowLeft,
  ChevronRight,
  PackageCheck,
  Phone,
  IndianRupee,
  CalendarDays,
  Building2,
  Trash2,
  Loader2,
  AlertCircle,
  X,
  ChevronDown
} from 'lucide-react';

export const BookingsWorkspacePage: React.FC = () => {
  const { currentStudio } = useStudio();
  const { setActiveTab, currentUser } = useApp();
  const studioId = currentStudio?.id || '';
  const todayStr = new Date().toISOString().split('T')[0];
  const [refreshKey, setRefreshKey] = useState(0);

  const userRole = localStorage.getItem('studio_os_user_role') || (currentUser as any)?.role || 'owner';
  const isOwner = userRole === 'owner' || userRole === 'studio_owner' || userRole === 'platform_master_admin';

  // Delete modal state
  const [deletingBooking, setDeletingBooking] = useState<BookingRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Listen for Escape key on delete confirmation modal
  useEffect(() => {
    if (!deletingBooking) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) {
        setDeletingBooking(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deletingBooking, isDeleting]);

  // Synchronize state immediately whenever bookings change across tabs/modals
  useEffect(() => {
    const handleUpdate = () => setRefreshKey(k => k + 1);
    window.addEventListener('studio_data_updated', handleUpdate);
    return () => window.removeEventListener('studio_data_updated', handleUpdate);
  }, []);

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
  }, [studioId, refreshKey]);

  // Soft Delete Handler with explicit confirmation and Owner authorization
  const handleConfirmDelete = async () => {
    if (!deletingBooking || isDeleting) return;
    setIsDeleting(true);
    setDeleteError('');
    const targetBookingNumber = deletingBooking.bookingNumber;
    const targetEventName = deletingBooking.eventName;
    try {
      const res = await bookingProductionService.softDeleteBooking(
        studioId,
        deletingBooking.id,
        userRole,
        currentUser?.name || 'Studio Owner'
      );
      if (!res.success) {
        throw new Error(res.error || 'Failed to delete booking');
      }
      setDeletingBooking(null);
      setRefreshKey(k => k + 1);
      showToast(`Booking ${targetBookingNumber} (${targetEventName}) deleted successfully.`);
    } catch (err: any) {
      console.error('[BookingsWorkspacePage.handleConfirmDelete] Error:', err);
      setDeleteError(err.message || 'Failed to delete booking. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

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
    }).sort((a, b) => {
      const dateA = a.createdAt || a.mainEventDate || a.startDate || '';
      const dateB = b.createdAt || b.mainEventDate || b.startDate || '';
      return dateB.localeCompare(dateA);
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
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Confirmed</span>;
      case 'advance_received':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">Advance Paid</span>;
      case 'in_progress':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">In Progress</span>;
      case 'fully_delivered':
      case 'completed':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-zinc-100 text-zinc-700 border border-zinc-200">Completed</span>;
      case 'cancelled':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">Cancelled</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-zinc-100 text-zinc-600 border border-zinc-200">New Inquiry</span>;
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
    <div className="space-y-4 sm:space-y-5 pb-20 w-full font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-zinc-100 border border-zinc-200 text-zinc-700">
              Studio Workspace
            </span>
            <span className="text-xs text-zinc-500 font-medium">{bookings.length} Bookings Registered</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight mt-1 font-display">
            Bookings Directory
          </h1>
        </div>

        <button
          onClick={() => {
            setActiveTab('create-booking');
            window.location.hash = '#/app/bookings/new';
          }}
          className="w-full sm:w-auto min-h-[50px] sm:min-h-[44px] px-5 py-3 sm:py-2.5 rounded-xl bg-gradient-to-r from-orange-500 via-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-base sm:text-sm tracking-tight shadow-md shadow-orange-500/25 border border-orange-400/30 transition-all cursor-pointer touch-manipulation active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4 text-white shrink-0 stroke-[2.5]" />
          <span>+ New Booking</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white border border-zinc-200/90 rounded-2xl p-3.5 sm:p-4 shadow-2xs space-y-3">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-4 sm:top-3" />
          <input
            type="text"
            placeholder="Search by customer name, mobile phone, booking ID, or event name..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 sm:py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-base sm:text-sm text-zinc-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-zinc-900 min-h-[48px] sm:min-h-[42px]"
          />
        </div>

        {/* Mobile Filter Dropdown (sm:hidden) */}
        <div className="sm:hidden relative w-full">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-sm font-bold text-zinc-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-zinc-900 appearance-none cursor-pointer pr-10 shadow-2xs"
            aria-label="Filter bookings by status"
          >
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
                count: bookings.filter(b => ['deal_confirmed', 'advance_received', 'event_scheduled', 'confirmed'].includes(b.status)).length 
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
            ].map(tab => (
              <option key={tab.id} value={tab.id}>
                {tab.label} ({tab.count})
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-zinc-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Desktop Filter Pills (hidden sm:flex) */}
        <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs sm:text-sm touch-scroll">
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
              count: bookings.filter(b => ['deal_confirmed', 'advance_received', 'event_scheduled', 'confirmed'].includes(b.status)).length 
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
              className={`min-h-[44px] sm:min-h-[36px] px-3.5 sm:px-3 py-2 sm:py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 touch-manipulation active:scale-95 text-xs sm:text-sm ${
                statusFilter === f.id
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'bg-zinc-100 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200'
              }`}
            >
              <span>{f.label}</span>
              <span className={`text-xs px-1.5 py-0.2 rounded-full font-bold ${
                statusFilter === f.id ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-200/80 text-zinc-600'
              }`}>
                {f.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* MOBILE LIST VIEW (Clean divided rows, zero nested card clutter) */}
      <div className="sm:hidden bg-white rounded-2xl border border-zinc-200/90 divide-y divide-zinc-100 overflow-hidden shadow-2xs">
        {filteredBookings.map(b => (
          <div
            key={b.id}
            onClick={() => handleOpenBooking(b.id)}
            className="p-3.5 hover:bg-zinc-50/80 active:bg-zinc-100 transition-all cursor-pointer space-y-2.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-xs font-mono font-bold text-zinc-400 block">{b.bookingNumber}</span>
                <h3 className="text-base font-bold text-zinc-900">{b.customerName}</h3>
                <p className="text-sm text-zinc-600 mt-0.5">{b.eventName}</p>
              </div>
              <div className="flex items-center gap-1.5">
                {renderStatusBadge(b.status)}
                {isOwner && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingBooking(b);
                    }}
                    className="min-w-[48px] min-h-[48px] w-12 h-12 rounded-xl flex items-center justify-center text-zinc-400 hover:text-rose-600 hover:bg-rose-50 border border-zinc-200 transition-colors cursor-pointer touch-manipulation active:scale-95"
                    title="Delete booking"
                    aria-label={`Delete booking ${b.bookingNumber}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs sm:text-sm pt-1.5 border-t border-zinc-100/80 text-zinc-600">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                {b.mainEventDate || b.startDate}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                {b.city}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1.5 border-t border-zinc-100/80">
              <div>
                <span className="text-xs text-zinc-500 block">Agreed Amount</span>
                <span className="text-base font-bold text-zinc-900 font-tabular tabular-nums">
                  ₹{(b.financials?.finalAgreedAmount || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-zinc-500 block">Balance Due</span>
                {(b.financials?.remainingBalance || 0) > 0 ? (
                  <span className="text-base font-bold text-rose-600 font-tabular tabular-nums">
                    ₹{(b.financials?.remainingBalance || 0).toLocaleString('en-IN')}
                  </span>
                ) : (
                  <span className="text-base font-bold text-emerald-600">Paid</span>
                )}
              </div>
            </div>
          </div>
        ))}

        {filteredBookings.length === 0 && (
          <div className="p-8 text-center text-zinc-400 text-sm">
            No bookings matching your search or filters.
          </div>
        )}
      </div>

      {/* DESKTOP TABLE VIEW (Hidden on mobile) */}
      <div className="hidden sm:block bg-white rounded-2xl border border-zinc-200/90 shadow-2xs overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50/70 text-zinc-500 uppercase text-xs font-bold tracking-wider">
              <th className="py-3.5 px-4">Booking ID</th>
              <th className="py-3.5 px-4">Customer & Phone</th>
              <th className="py-3.5 px-4">Event & Date</th>
              <th className="py-3.5 px-4">Venue & City</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4">Agreed Amount</th>
              <th className="py-3.5 px-4">Balance</th>
              <th className="py-3.5 px-4 text-right">Action</th>
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
                    <div className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                      <Phone className="w-2.5 h-2.5" />
                      <span>{b.customerPhone || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-zinc-900 truncate max-w-[180px]">
                      {b.eventName}
                    </div>
                    <div className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-2.5 h-2.5" />
                      <span>{b.mainEventDate || b.startDate}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="text-zinc-700 truncate max-w-[140px]">{b.venue || 'TBD'}</div>
                    <div className="text-xs text-zinc-400">{b.city}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    {renderStatusBadge(b.status)}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-zinc-900 font-tabular tabular-nums">
                    ₹{(b.financials?.finalAgreedAmount || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3.5 px-4">
                    {isPaid ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1 font-sans">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Paid</span>
                      </span>
                    ) : (
                      <span className="text-rose-600 font-bold font-tabular tabular-nums">
                        ₹{balance.toLocaleString('en-IN')}
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenBooking(b.id);
                        }}
                        className="min-h-[36px] px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-500 hover:text-white font-bold text-xs text-orange-900 border border-orange-200/80 transition-all inline-flex items-center gap-1 shadow-2xs"
                      >
                        <span>Open</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>

                      {isOwner && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingBooking(b);
                          }}
                          className="min-h-[36px] min-w-[36px] p-2 rounded-xl border border-zinc-200 hover:border-rose-300 hover:bg-rose-50 text-zinc-400 hover:text-rose-600 transition-colors inline-flex items-center justify-center shadow-2xs"
                          title="Delete booking"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
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

      {/* Delete Confirmation Modal (Studio Owner Only - Requirement 2) */}
      {deletingBooking && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeleting) {
              setDeletingBooking(null);
            }
          }}
        >
          <div 
            className="bg-white rounded-3xl border border-zinc-200/90 max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2.5 text-rose-600">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 font-display">Delete Event Booking</h3>
                  <p className="text-xs text-zinc-500 font-mono">{deletingBooking.bookingNumber}</p>
                </div>
              </div>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingBooking(null)}
                className="min-w-[44px] min-h-[44px] rounded-xl hover:bg-zinc-100 flex items-center justify-center text-zinc-500 cursor-pointer disabled:opacity-50 touch-manipulation active:scale-95 transition-transform"
                aria-label="Close delete confirmation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-zinc-600">
              <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-1.5">
                <div className="font-bold text-zinc-900 text-sm sm:text-base">{deletingBooking.eventName}</div>
                <div className="text-zinc-500 font-medium text-xs sm:text-sm">Customer: <strong className="text-zinc-800">{deletingBooking.customerName}</strong></div>
                <div className="text-zinc-500 font-medium text-xs sm:text-sm">Date: <strong className="text-zinc-800">{deletingBooking.mainEventDate || deletingBooking.startDate}</strong></div>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200 text-rose-900 leading-relaxed text-xs">
                <strong>Warning:</strong> Deleting this booking will remove it from active studio schedules, day agenda, and calendar. Financial transactions and audit logs will be securely preserved. This action cannot be undone.
              </div>

              {deleteError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 font-semibold flex items-center gap-2 text-xs">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{deleteError}</span>
                </div>
              )}
            </div>

            <div className="pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingBooking(null)}
                className="w-full sm:w-auto min-h-[48px] px-5 py-2.5 border border-zinc-200 rounded-xl font-semibold text-zinc-600 hover:bg-zinc-50 text-sm cursor-pointer disabled:opacity-50 touch-manipulation active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="w-full sm:w-auto min-h-[50px] px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs text-sm cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 touch-manipulation"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Deleting Booking...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 text-white" />
                    <span>Delete Event Booking</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Immediate Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs sm:text-sm font-semibold border border-zinc-700 animate-in slide-in-from-bottom-5">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
