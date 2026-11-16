import React, { useMemo, useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useStudio } from '../context/StudioContext';
import { bookingProductionService } from '../services/bookingProductionService';
import { NewBookingButton } from '../components/common/NewBookingButton';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Plus, 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight,
  Sparkles,
  Building2,
  CalendarDays,
  IndianRupee,
  PackageCheck,
  ChevronRight,
  Phone
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { setActiveTab } = useApp();
  const { currentStudio } = useStudio();
  const studioId = currentStudio.id || 'studio_shreeji_films';
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const todayFormatted = today.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const [dataVersion, setDataVersion] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setDataVersion(v => v + 1);
    window.addEventListener('studio_data_updated', handleUpdate);
    return () => window.removeEventListener('studio_data_updated', handleUpdate);
  }, []);

  // Bookings list from production service
  const bookings = useMemo(() => {
    return bookingProductionService.listBookings(studioId);
  }, [studioId, dataVersion]);

  // All deliverables across all bookings
  const allDeliverables = useMemo(() => {
    return bookings.flatMap(b => 
      (b.deliverables || []).map(d => ({ ...d, booking: b }))
    );
  }, [bookings]);

  // 1. Upcoming Bookings Count
  const upcomingBookings = useMemo(() => {
    return bookings
      .filter(b => {
        if (b.isDeleted) return false;
        const d = b.mainEventDate || b.startDate || '';
        return d >= todayStr && b.status !== 'completed' && b.status !== 'cancelled';
      })
      .sort((a, b) => (a.mainEventDate || a.startDate || '').localeCompare(b.mainEventDate || b.startDate || ''));
  }, [bookings, todayStr]);

  // 2. Confirmed Bookings Count
  const confirmedBookingsCount = useMemo(() => {
    return bookings.filter(b => 
      !b.isDeleted && ['deal_confirmed', 'advance_received', 'event_scheduled', 'confirmed', 'in_progress'].includes(b.status)
    ).length;
  }, [bookings]);

  // 3. Pending Payments Total (in ₹)
  const pendingPaymentsTotal = useMemo(() => {
    return bookings.filter(b => !b.isDeleted).reduce((sum, b) => sum + (b.financials?.remainingBalance || 0), 0);
  }, [bookings]);

  // 4. Pending Deliveries Count
  const pendingDeliveries = useMemo(() => {
    return allDeliverables.filter(d => !d.isDelivered);
  }, [allDeliverables]);

  // Today's Events
  const todayEvents = useMemo(() => {
    return bookings.filter(b => !b.isDeleted && (b.mainEventDate || b.startDate) === todayStr);
  }, [bookings, todayStr]);

  // Next 5 upcoming bookings
  const nextFiveBookings = useMemo(() => {
    return upcomingBookings.slice(0, 5);
  }, [upcomingBookings]);

  // Pending Work Items (Deliverables near or past deadline, or balances due)
  const pendingWorkItems = useMemo(() => {
    const list: Array<{
      id: string;
      bookingId: string;
      title: string;
      subtitle: string;
      tag: string;
      tagColor: string;
      deadline: string;
      isOverdue: boolean;
    }> = [];

    // Overdue or upcoming deliverables
    allDeliverables
      .filter(d => !d.isDelivered)
      .slice(0, 5)
      .forEach(d => {
        const isOverdue = d.calculatedDeadline < todayStr;
        list.push({
          id: d.id,
          bookingId: d.bookingId,
          title: d.name,
          subtitle: `${d.booking?.customerName || 'Client'} • ${d.booking?.eventName || 'Event'}`,
          tag: isOverdue ? 'Overdue Delivery' : 'In Production',
          tagColor: isOverdue ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200',
          deadline: d.calculatedDeadline,
          isOverdue
        });
      });

    // Bookings with pending balance
    bookings
      .filter(b => (b.financials?.remainingBalance || 0) > 0 && b.status !== 'cancelled')
      .slice(0, 3)
      .forEach(b => {
        list.push({
          id: `pay_${b.id}`,
          bookingId: b.id,
          title: `Pending Balance: ₹${(b.financials?.remainingBalance || 0).toLocaleString('en-IN')}`,
          subtitle: `${b.customerName} • ${b.eventName}`,
          tag: 'Payment Due',
          tagColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          deadline: b.mainEventDate || b.startDate || 'Pending',
          isOverdue: false
        });
      });

    return list.slice(0, 6);
  }, [allDeliverables, bookings, todayStr]);

  const openBookingWorkspace = (bookingId: string) => {
    setActiveTab('bookings');
    window.location.hash = `#/app/bookings/${bookingId}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'deal_confirmed':
      case 'confirmed':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 font-sans">Confirmed</span>;
      case 'advance_received':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 font-sans">Advance Paid</span>;
      case 'in_progress':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 font-sans">In Progress</span>;
      case 'fully_delivered':
      case 'completed':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200 font-sans">Completed</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-600 border border-zinc-200 font-sans">New Inquiry</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-24 font-sans">
      {/* 1. Compact Dashboard Header (No duplicate studio branding — already in top header) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-zinc-200/90 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 font-sans">
              Live Operations
            </span>
            <span className="text-zinc-300">•</span>
            <span className="text-xs font-semibold text-zinc-600 flex items-center gap-1 font-sans">
              <CalendarDays className="w-3.5 h-3.5 text-orange-500" />
              <span>{todayFormatted}</span>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight font-heading mt-1">
            Dashboard Overview
          </h1>
        </div>

        <button
          onClick={() => {
            setActiveTab('create-booking');
            window.location.hash = '#/app/bookings/new';
          }}
          className="w-full sm:w-auto min-h-[50px] sm:min-h-[44px] px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 via-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-sm tracking-tight shadow-md shadow-orange-500/25 hover:shadow-lg hover:shadow-orange-500/35 border border-orange-400/30 transition-all cursor-pointer touch-manipulation active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4 text-white shrink-0 stroke-[2.5]" />
          <span>+ New Booking</span>
        </button>
      </div>

      {/* 2. Exactly 4 Key Indicator Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Indicator 1: Upcoming Bookings */}
        <div 
          onClick={() => {
            setActiveTab('bookings');
            window.location.hash = '#/app/bookings';
          }}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-zinc-200/90 shadow-2xs hover:border-zinc-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs font-semibold text-zinc-600 font-sans">Upcoming Bookings</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-zinc-900 font-tabular tabular-nums tracking-tight">
              {upcomingBookings.length}
            </div>
            <p className="text-xs text-zinc-500 mt-0.5 font-sans">Scheduled events ahead</p>
          </div>
        </div>

        {/* Indicator 2: Confirmed Bookings */}
        <div 
          onClick={() => {
            setActiveTab('bookings');
            window.location.hash = '#/app/bookings';
          }}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-zinc-200/90 shadow-2xs hover:border-zinc-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs sm:text-sm font-semibold text-zinc-700 font-sans">Confirmed Bookings</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-zinc-900 font-tabular tabular-nums tracking-tight">
              {confirmedBookingsCount}
            </div>
            <p className="text-xs text-zinc-500 mt-0.5 font-sans">Advance or contract signed</p>
          </div>
        </div>

        {/* Indicator 3: Pending Payments */}
        <div 
          onClick={() => {
            setActiveTab('bookings');
            window.location.hash = '#/app/bookings';
          }}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-zinc-200/90 shadow-2xs hover:border-zinc-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs sm:text-sm font-semibold text-zinc-700 font-sans">Pending Payments</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-extrabold text-rose-600 font-tabular tabular-nums tracking-tight truncate">
              ₹{pendingPaymentsTotal.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-zinc-500 mt-0.5 font-sans">Receivable client balance</p>
          </div>
        </div>

        {/* Indicator 4: Pending Deliveries */}
        <div 
          onClick={() => {
            setActiveTab('bookings');
            window.location.hash = '#/app/bookings';
          }}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-zinc-200/90 shadow-2xs hover:border-zinc-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs sm:text-sm font-semibold text-zinc-700 font-sans">Pending Deliveries</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <PackageCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-zinc-900 font-tabular tabular-nums tracking-tight">
              {pendingDeliveries.length}
            </div>
            <p className="text-xs text-zinc-500 mt-0.5 font-sans">Photos & videos in queue</p>
          </div>
        </div>
      </div>

      {/* 3. Actionable Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Today's Events & Upcoming Bookings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Today's Events */}
          <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                <h2 className="text-base sm:text-lg font-bold text-zinc-900 font-heading">Today's Events</h2>
              </div>
              <span className="text-xs sm:text-sm font-semibold text-zinc-500 font-sans">
                {todayEvents.length > 0 ? `${todayEvents.length} Shoots Today` : 'None Scheduled'}
              </span>
            </div>

            {todayEvents.length > 0 ? (
              <div className="space-y-2.5">
                {todayEvents.map(ev => (
                  <div 
                    key={ev.id}
                    onClick={() => openBookingWorkspace(ev.id)}
                    className="p-3.5 rounded-xl border border-zinc-200/80 bg-zinc-50/60 hover:bg-zinc-100/80 transition-all cursor-pointer flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm sm:text-base font-bold text-zinc-900 truncate font-heading">{ev.eventName}</h3>
                        {getStatusBadge(ev.status)}
                      </div>
                      <p className="text-xs sm:text-sm text-zinc-600 mt-0.5 font-sans">
                        {ev.customerName} • {ev.venue}, {ev.city}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openBookingWorkspace(ev.id);
                      }}
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-900 border border-orange-200/80 text-xs sm:text-sm font-bold shrink-0 touch-manipulation active:scale-95 shadow-2xs cursor-pointer font-sans"
                    >
                      Open
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-zinc-400 bg-zinc-50/50 rounded-xl border border-dashed border-zinc-200 font-sans">
                <Calendar className="w-6 h-6 mx-auto mb-1.5 text-zinc-300" />
                <p className="text-xs sm:text-sm font-medium text-zinc-600">No events scheduled for today</p>
                <p className="text-xs text-zinc-400 mt-0.5">All teams are on editing & studio prep</p>
              </div>
            )}
          </div>

          {/* Section 2: Upcoming Bookings (Next 5) */}
          <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <h2 className="text-base sm:text-lg font-bold text-zinc-900 font-heading">Upcoming Bookings</h2>
              </div>
              <button
                onClick={() => {
                  setActiveTab('bookings');
                  window.location.hash = '#/app/bookings';
                }}
                className="text-xs sm:text-sm font-semibold text-zinc-500 hover:text-zinc-900 flex items-center gap-1 cursor-pointer font-sans"
              >
                <span>View All ({bookings.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {nextFiveBookings.map(b => (
                <div
                  key={b.id}
                  onClick={() => openBookingWorkspace(b.id)}
                  className="p-3.5 rounded-xl border border-zinc-200/80 hover:border-zinc-300 hover:bg-zinc-50/70 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm sm:text-base font-bold text-zinc-900 truncate group-hover:text-orange-600 transition-colors font-heading">
                        {b.customerName}
                      </span>
                      {getStatusBadge(b.status)}
                    </div>
                    <p className="text-xs sm:text-sm text-zinc-600 mt-0.5 truncate font-sans">
                      {b.eventName} • {b.mainEventDate || b.startDate}
                    </p>
                    <p className="text-xs text-zinc-400 truncate font-sans">
                      {b.venue}, {b.city}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm sm:text-base font-bold text-zinc-900 font-tabular tabular-nums">
                      ₹{(b.financials?.finalAgreedAmount || 0).toLocaleString('en-IN')}
                    </div>
                    {(b.financials?.remainingBalance || 0) > 0 ? (
                      <div className="text-xs font-semibold text-rose-600 font-tabular tabular-nums">
                        Due: ₹{(b.financials?.remainingBalance || 0).toLocaleString('en-IN')}
                      </div>
                    ) : (
                      <div className="text-xs font-semibold text-emerald-600 font-sans">
                        Fully Paid
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {nextFiveBookings.length === 0 && (
                <div className="py-6 text-center text-zinc-400 text-xs sm:text-sm font-sans">
                  No upcoming bookings found.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (1 col): Pending Work & Quick Actions */}
        <div className="space-y-6">
          {/* Section 3: Pending Work */}
          <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h2 className="text-base sm:text-lg font-bold text-zinc-900 font-heading">Pending Work</h2>
              </div>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-sans">
                Action Required
              </span>
            </div>

            <div className="space-y-2">
              {pendingWorkItems.map(item => (
                <div
                  key={item.id}
                  onClick={() => openBookingWorkspace(item.bookingId)}
                  className="p-3 rounded-xl border border-zinc-200/70 hover:bg-zinc-50 transition-all cursor-pointer space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${item.tagColor} font-sans`}>
                      {item.tag}
                    </span>
                    <span className="text-xs text-zinc-400 font-sans">
                      {item.deadline}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-zinc-900 truncate font-heading">{item.title}</h4>
                  <p className="text-xs text-zinc-500 truncate font-sans">{item.subtitle}</p>
                </div>
              ))}

              {pendingWorkItems.length === 0 && (
                <div className="py-4 text-center text-zinc-400 text-xs font-sans">
                  All work and deliveries are up to date!
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Quick Actions */}
          <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-2xs space-y-3">
            <h2 className="text-sm font-bold text-zinc-900 font-heading border-b border-zinc-100 pb-2">
              Studio Quick Actions
            </h2>

            <div className="space-y-2.5 font-sans">
              <button
                onClick={() => {
                  setActiveTab('create-booking');
                  window.location.hash = '#/app/bookings/new';
                }}
                className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-orange-50/80 hover:bg-orange-100 text-orange-950 border border-orange-200/80 text-sm font-semibold flex items-center justify-between transition-all cursor-pointer shadow-2xs touch-manipulation active:scale-[0.98]"
              >
                <div className="flex items-center gap-2.5">
                  <Plus className="w-4 h-4 text-orange-600 shrink-0" />
                  <span>Start New Booking</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-orange-500" />
              </button>

              <button
                onClick={() => {
                  setActiveTab('bookings');
                  window.location.hash = '#/app/bookings';
                }}
                className="w-full min-h-[48px] px-4 py-2.5 rounded-xl border border-zinc-200/90 hover:bg-zinc-50 hover:border-zinc-300 text-zinc-800 text-sm font-semibold flex items-center justify-between transition-all cursor-pointer touch-manipulation active:scale-[0.98] shadow-2xs"
              >
                <div className="flex items-center gap-2.5">
                  <PackageCheck className="w-4 h-4 text-zinc-600" />
                  <span>All Bookings Directory</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
              </button>

              <button
                onClick={() => {
                  setActiveTab('calendar');
                  window.location.hash = '#/app/calendar';
                }}
                className="w-full min-h-[48px] px-4 py-2.5 rounded-xl border border-zinc-200/90 hover:bg-zinc-50 hover:border-zinc-300 text-zinc-800 text-sm font-semibold flex items-center justify-between transition-all cursor-pointer touch-manipulation active:scale-[0.98] shadow-2xs"
              >
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-zinc-600" />
                  <span>Studio Shoot Calendar</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
              </button>

              <button
                onClick={() => {
                  setActiveTab('crew');
                  window.location.hash = '#/app/crew';
                }}
                className="w-full min-h-[48px] px-4 py-2.5 rounded-xl border border-zinc-200/90 hover:bg-zinc-50 hover:border-zinc-300 text-zinc-800 text-sm font-semibold flex items-center justify-between transition-all cursor-pointer touch-manipulation active:scale-[0.98] shadow-2xs"
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-zinc-600" />
                  <span>Team & Crew Allocation</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
