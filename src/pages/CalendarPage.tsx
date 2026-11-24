import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useStudio } from '../context/StudioContext';
import { formatDate, formatTime, getCategoryBadgeColor, getStatusBadgeColor } from '../utils/formatters';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  MapPin, 
  Plus,
  UserCheck,
  AlertTriangle,
  Edit3,
  ExternalLink,
  Users,
  X,
  ChevronDown,
  CheckCircle2,
  Sparkles,
  Check
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { NewBookingButton } from '../components/common/NewBookingButton';
import { seedCalendarTestBookings, CALENDAR_TEST_FLAG } from '../services/calendarTestBookingsSeed';
import { TenantStore } from '../services/tenantStore';
import { StudioEvent } from '../types';
import { BookingRecord } from '../types/bookingProduction';
import { bookingProductionService } from '../services/bookingProductionService';
import { calendarVisibilityService } from '../services/calendarVisibilityService';
import { crewConflictService } from '../services/crewConflictService';
import { getStudioOwnerProfile, isStudioOwnerId } from '../services/studioOwnerHelper';
import { THEME } from '../utils/theme';

type CalendarViewMode = 'month' | 'week' | 'day';

// Helper for colored event dots in calendar date cells
const getEventDotColor = (category?: string): string => {
  const cat = (category || '').toLowerCase();
  if (cat.includes('pre-wedding') || cat.includes('pre wedding')) return 'bg-amber-500';
  if (cat.includes('wedding')) return 'bg-orange-500';
  if (cat.includes('engagement') || cat.includes('ring')) return 'bg-rose-500';
  if (cat.includes('haldi') || cat.includes('mehndi') || cat.includes('sangeet') || cat.includes('mandvo')) return 'bg-yellow-500';
  if (cat.includes('reception')) return 'bg-purple-500';
  if (cat.includes('corporate') || cat.includes('commercial')) return 'bg-blue-500';
  if (cat.includes('birthday') || cat.includes('baby') || cat.includes('maternity')) return 'bg-emerald-500';
  return 'bg-orange-500';
};

export const CalendarPage: React.FC = () => {
  const { events, setSelectedEventId, setIsEventFormOpen, setEditingEvent } = useApp();
  const { currentStudio } = useStudio();
  const studioId = currentStudio?.id || 'studio_shreeji_films';
  const [dataVersion, setDataVersion] = useState(0);

  // Seed 12 calendar test bookings idempotently on mount ONLY for demo studios
  useEffect(() => {
    const isDemo = studioId === 'studio_shreeji_films' || studioId === 'std_demo_royal' || studioId === 'studio_royal_001';
    if (!isDemo) return;
    seedCalendarTestBookings(studioId).then(count => {
      if (count > 0) {
        setDataVersion(v => v + 1);
      }
    }).catch(err => {
      console.warn('[CalendarPage] Auto-seed note:', err);
    });
  }, [studioId]);

  // Sync calendar immediately whenever a booking/event is created, updated or soft-deleted
  useEffect(() => {
    const handleUpdate = () => setDataVersion(v => v + 1);
    window.addEventListener('studio_data_updated', handleUpdate);
    return () => window.removeEventListener('studio_data_updated', handleUpdate);
  }, []);

  // Calendar view mode: month, week, day
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [ownerScheduleFilter, setOwnerScheduleFilter] = useState<'all' | 'mine'>('all');

  // Dynamic current date initialization
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number>(today.getDate());

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Combine StudioEvents and BookingRecords for seamless calendar visibility
  const combinedCalendarEvents = useMemo(() => {
    const userRole = localStorage.getItem('studio_os_user_role');
    const employeeId = localStorage.getItem('studio_os_employee_id');

    // If viewing as an employee, strictly show ONLY assigned and visible events
    if (userRole === 'employee' && employeeId) {
      const empEvents = calendarVisibilityService.getEmployeeCalendarEvents(studioId, employeeId);
      return empEvents.map(ev => ({
        id: ev.bookingId,
        studioId,
        eventNumber: ev.bookingNumber,
        name: ev.eventName,
        title: ev.eventName,
        customerId: '',
        customerName: ev.customerName,
        customerPhone: ev.customerPhone,
        category: ev.category as any,
        startDate: ev.date,
        startTime: ev.startTime,
        endDate: ev.date,
        endTime: ev.endTime,
        venue: ev.venue,
        venueCity: ev.city,
        priority: 'High',
        status: ev.status as any,
        assignedTeamIds: [employeeId],
        notes: ''
      } as unknown as StudioEvent));
    }

    // If Studio Owner has selected "My Assigned Shoots", show only their personal assigned & visible events
    if (ownerScheduleFilter === 'mine') {
      const ownerProfile = getStudioOwnerProfile(studioId);
      const ownerEvents = calendarVisibilityService.getEmployeeCalendarEvents(studioId, ownerProfile.id);
      return ownerEvents.map(ev => ({
        id: ev.bookingId,
        studioId,
        eventNumber: ev.bookingNumber,
        name: ev.eventName,
        title: ev.eventName,
        customerId: '',
        customerName: ev.customerName,
        customerPhone: ev.customerPhone,
        category: ev.category as any,
        startDate: ev.date,
        startTime: ev.startTime,
        endDate: ev.date,
        endTime: ev.endTime,
        venue: ev.venue,
        venueCity: ev.city,
        priority: 'High',
        status: ev.status as any,
        assignedTeamIds: [ownerProfile.id],
        notes: ''
      } as unknown as StudioEvent));
    }

    const list: StudioEvent[] = [...events].filter(e => !e.isDeleted) as any[];
    const bookings = bookingProductionService.listBookings(studioId);

    bookings.forEach(bkg => {
      if (bkg.isDeleted) return;
      // If not already in list, map into StudioEvent structure
      if (!list.some(e => e.id === bkg.id)) {
        list.push({
          id: bkg.id,
          studioId,
          eventNumber: bkg.bookingNumber,
          name: bkg.eventName,
          title: bkg.eventName,
          customerId: bkg.customerId,
          customerName: bkg.customerName,
          customerPhone: bkg.customerPhone,
          category: bkg.category as any,
          startDate: bkg.mainEventDate || bkg.startDate || '',
          startTime: (bkg.functions && bkg.functions[0]?.startTime) || '10:00',
          endDate: (bkg.functions && bkg.functions[bkg.functions.length - 1]?.date) || bkg.mainEventDate || '',
          endTime: (bkg.functions && bkg.functions[bkg.functions.length - 1]?.endTime) || '18:00',
          venue: bkg.venue,
          venueCity: bkg.city,
          priority: 'High',
          status: (bkg.status === 'completed' ? 'Completed' : bkg.status === 'cancelled' ? 'Cancelled' : 'Confirmed') as any,
          assignedTeamIds: (bkg.functions || []).flatMap(f => [
            ...(f.assignedPhotographerIds || []),
            ...(f.assignedVideographerIds || []),
            ...(f.assignedCrew || []).map(c => c.employeeId)
          ]),
          detailedAssignments: (bkg.functions || []).flatMap(f => (f.assignedCrew || []).map(c => ({
            memberId: c.employeeId,
            memberName: c.employeeName,
            role: c.role,
            status: 'Confirmed'
          }))),
          estimatedBudget: bkg.financials?.finalAgreedAmount || 0,
          advancePaid: bkg.financials?.verifiedPaymentsReceived || 0,
          notes: bkg.notes
        } as unknown as StudioEvent);
      }
    });

    return list;
  }, [events, studioId, dataVersion, ownerScheduleFilter]);

  const handlePrev = () => {
    if (viewMode === 'month') {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    } else if (viewMode === 'week') {
      const d = new Date(currentYear, currentMonth, selectedDay - 7);
      setCurrentYear(d.getFullYear());
      setCurrentMonth(d.getMonth());
      setSelectedDay(d.getDate());
    } else {
      const d = new Date(currentYear, currentMonth, selectedDay - 1);
      setCurrentYear(d.getFullYear());
      setCurrentMonth(d.getMonth());
      setSelectedDay(d.getDate());
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    } else if (viewMode === 'week') {
      const d = new Date(currentYear, currentMonth, selectedDay + 7);
      setCurrentYear(d.getFullYear());
      setCurrentMonth(d.getMonth());
      setSelectedDay(d.getDate());
    } else {
      const d = new Date(currentYear, currentMonth, selectedDay + 1);
      setCurrentYear(d.getFullYear());
      setCurrentMonth(d.getMonth());
      setSelectedDay(d.getDate());
    }
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    setSelectedDay(now.getDate());
  };

  // Helper to calculate days in month & offset
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0 is Sun
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Pad dates for month view
  const daysArray: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    daysArray.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    daysArray.push(d);
  }

  // Week View dates (7 days centered around selectedDay)
  const weekDays = useMemo(() => {
    const base = new Date(currentYear, currentMonth, selectedDay);
    const dayOfWeek = base.getDay();
    const diffToSun = base.getDate() - dayOfWeek;
    const sunday = new Date(currentYear, currentMonth, diffToSun);

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      return d;
    });
  }, [currentYear, currentMonth, selectedDay]);

  // Find events for selected day
  const formattedSelectedDayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
  const dayEvents = combinedCalendarEvents.filter(e => e.startDate === formattedSelectedDayStr);

  // Background crew conflict detection per event (Requirement 1: subtle popover without persistent warning banner)
  const [activeConflictInfo, setActiveConflictInfo] = useState<{
    eventId: string;
    eventName: string;
    conflicts: { memberName: string; conflictingEventName: string; conflictingTime: string }[];
  } | null>(null);

  const getEventConflicts = (event: StudioEvent | any) => {
    const team = event.assignedTeamIds || [];
    if (team.length === 0 || dayEvents.length < 2) return [];

    const activeEmployees = crewConflictService.getActiveEmployees(studioId);
    const conflicts: { memberName: string; conflictingEventName: string; conflictingTime: string }[] = [];

    dayEvents.forEach(otherEv => {
      if (otherEv.id === event.id) return;
      const otherTeam = otherEv.assignedTeamIds || [];
      team.forEach((mId: string) => {
        if (otherTeam.includes(mId)) {
          const emp = activeEmployees.find(e => e.id === mId);
          const memberName = emp?.name || (isStudioOwnerId(mId) ? getStudioOwnerProfile(studioId).name : 'Crew Member');
          conflicts.push({
            memberName,
            conflictingEventName: otherEv.name || 'Other Shoot',
            conflictingTime: `${otherEv.startTime || '10:00'} - ${otherEv.endTime || '18:00'}`
          });
        }
      });
    });

    return conflicts;
  };

  // Instant Calendar Shoot Booking Modal State
  const [isInstantShootModalOpen, setIsInstantShootModalOpen] = useState(false);
  const [instantForm, setInstantForm] = useState({
    eventName: '',
    category: 'Wedding',
    customerName: '',
    customerPhone: '',
    eventDate: formattedSelectedDayStr,
    startTime: '10:00 AM',
    endTime: '06:00 PM',
    venue: '',
    city: currentStudio?.city || '',
    agreedAmount: 0,
    advancePaid: 0
  });
  const [isSavingInstant, setIsSavingInstant] = useState(false);
  const [instantError, setInstantError] = useState('');
  const [calendarToast, setCalendarToast] = useState<string | null>(null);

  const openInstantBookingModal = (dateStr?: string) => {
    const targetDate = dateStr || formattedSelectedDayStr;
    setInstantForm({
      eventName: '',
      category: 'Wedding',
      customerName: '',
      customerPhone: '',
      eventDate: targetDate,
      startTime: '10:00 AM',
      endTime: '06:00 PM',
      venue: '',
      city: currentStudio?.city || '',
      agreedAmount: 0,
      advancePaid: 0
    });
    setInstantError('');
    setIsInstantShootModalOpen(true);
  };

  const handleSaveInstantShoot = async (e: React.FormEvent) => {
    e.preventDefault();
    setInstantError('');

    const eventName = instantForm.eventName.trim();
    const customerName = instantForm.customerName.trim();
    const customerPhone = instantForm.customerPhone.trim();
    const targetDate = instantForm.eventDate.trim() || formattedSelectedDayStr;
    const venue = instantForm.venue.trim() || 'Main Studio / Venue';
    const city = instantForm.city.trim() || currentStudio?.city || '';
    const agreedAmount = Number(instantForm.agreedAmount) || 0;
    const advancePaid = Number(instantForm.advancePaid) || 0;

    if (!eventName) {
      setInstantError('Please enter an event or shoot name.');
      return;
    }
    if (!customerName) {
      setInstantError('Please enter client full name.');
      return;
    }
    if (!customerPhone || customerPhone.length < 6) {
      setInstantError('Please enter a valid client phone number.');
      return;
    }

    setIsSavingInstant(true);
    try {
      const created = bookingProductionService.createBooking(studioId, {
        customerName,
        customerPhone,
        customerWhatsApp: customerPhone,
        eventName,
        category: instantForm.category || 'Wedding',
        mainEventDate: targetDate,
        startDate: targetDate,
        endDate: targetDate,
        venue,
        city,
        description: `Direct calendar shoot booking for ${customerName}.`,
        agreedAmount,
        advancePayment: advancePaid,
        advanceReceived: advancePaid,
        paymentStatus: advancePaid > 0 ? 'partially_paid' : 'pending',
        functions: [
          {
            name: eventName,
            category: instantForm.category || 'Wedding',
            date: targetDate,
            startTime: instantForm.startTime,
            endTime: instantForm.endTime,
            venue,
            city,
            deliverablesConfig: [
              {
                name: `${instantForm.category} High-Res Stills`,
                category: 'photography',
                requiredQty: 100,
                unit: 'photos',
                deadlineDays: 7
              },
              {
                name: `${instantForm.category} Teaser Reel`,
                category: 'video',
                requiredQty: 1,
                unit: 'video',
                deadlineDays: 14
              }
            ]
          }
        ],
        createdBy: 'Studio Owner'
      });

      setIsInstantShootModalOpen(false);
      setDataVersion(v => v + 1);
      window.dispatchEvent(new Event('studio_data_updated'));
      setCalendarToast(`Booking ${created.bookingNumber} ("${created.eventName}") scheduled! Active on Calendar & Booking Directory.`);
      setTimeout(() => setCalendarToast(null), 5000);
    } catch (err: any) {
      console.error('[handleSaveInstantShoot] Error:', err);
      setInstantError(err.message || 'Failed to create shoot. Please try again.');
    } finally {
      setIsSavingInstant(false);
    }
  };

  // Handle click on a date cell in month view (Requirement 5)
  const handleDateClick = (dayNumber: number) => {
    setSelectedDay(dayNumber);
    const targetDateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
    const eventsOnThisDay = combinedCalendarEvents.filter(e => e.startDate === targetDateStr);

    if (eventsOnThisDay.length === 0) {
      // EMPTY DATE: Instantly open Quick Shoot Modal with this date pre-filled!
      openInstantBookingModal(targetDateStr);
    }
  };

  // Open New Booking for selected day
  const handleCreateBookingForDay = () => {
    openInstantBookingModal(formattedSelectedDayStr);
  };

  return (
    <div className="space-y-4 sm:space-y-5 w-full pb-8">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 font-display">
              Studio Shoot Calendar
            </h2>
            <span className="text-xs px-2.5 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-700 font-semibold shadow-2xs">
              {combinedCalendarEvents.length} Shoots
            </span>
          </div>
        </div>

        {/* Mobile Compact Controls (sm:hidden) */}
        <div className="flex sm:hidden items-center justify-between gap-2 w-full">
          {/* Dropdown 1: All Shoots / My Shoots */}
          <div className="relative flex-1">
            <select
              value={ownerScheduleFilter}
              onChange={(e) => setOwnerScheduleFilter(e.target.value as 'all' | 'mine')}
              className="w-full min-h-[48px] px-3 py-2.5 rounded-xl bg-white border border-zinc-200 text-xs font-bold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 shadow-2xs appearance-none cursor-pointer pr-8"
              aria-label="Filter Shoots"
            >
              <option value="all">All Shoots ({combinedCalendarEvents.length})</option>
              <option value="mine">My Shoots</option>
            </select>
            <ChevronDown className="w-4 h-4 text-zinc-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Dropdown 2: Month / Week / Day View */}
          <div className="relative flex-1">
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as CalendarViewMode)}
              className="w-full min-h-[48px] px-3 py-2.5 rounded-xl bg-white border border-zinc-200 text-xs font-bold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 shadow-2xs appearance-none cursor-pointer pr-8"
              aria-label="Calendar View Mode"
            >
              <option value="month">Month View</option>
              <option value="week">Week View</option>
              <option value="day">Day View</option>
            </select>
            <ChevronDown className="w-4 h-4 text-zinc-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Compact Plus (+) Button for Mobile (48–56px touch target, Shiny Orange signature) */}
          <button
            type="button"
            onClick={() => openInstantBookingModal()}
            className="min-w-[48px] min-h-[48px] w-12 h-12 rounded-xl bg-gradient-to-r from-orange-500 via-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white flex items-center justify-center shadow-md shadow-orange-500/25 active:scale-95 transition-all cursor-pointer shrink-0 border border-orange-400/30"
            aria-label="New Booking"
            title="Create New Booking"
          >
            <Plus className="w-5 h-5 text-white stroke-[2.5]" />
          </button>
        </div>

        {/* Desktop Controls (hidden sm:flex) */}
        <div className="hidden sm:flex items-center gap-2 sm:gap-2.5 flex-wrap">
          {/* Studio Owner Schedule Filter (Requirement 3: Owner personal calendar visibility) */}
          <div className="flex items-center p-1 bg-zinc-100 rounded-xl text-xs sm:text-sm font-semibold border border-zinc-200/70">
            <button
              onClick={() => setOwnerScheduleFilter('all')}
              className={`min-h-[44px] sm:min-h-[38px] px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                ownerScheduleFilter === 'all'
                  ? 'bg-white text-zinc-900 shadow-2xs font-bold border border-zinc-200/80'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              All Shoots
            </button>
            <button
              onClick={() => setOwnerScheduleFilter('mine')}
              className={`min-h-[44px] sm:min-h-[38px] px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                ownerScheduleFilter === 'mine'
                  ? 'bg-white text-zinc-900 shadow-2xs font-bold border border-zinc-200/80 text-orange-600'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>My Shoots</span>
            </button>
          </div>

          {/* Mode Switcher: Month / Week / Day */}
          <div className="flex items-center p-1 bg-zinc-100 rounded-xl text-xs sm:text-sm font-semibold border border-zinc-200/70">
            <button
              onClick={() => setViewMode('month')}
              className={`min-h-[44px] sm:min-h-[38px] px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'month'
                  ? 'bg-white text-zinc-900 shadow-2xs font-bold border border-zinc-200/80'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`min-h-[44px] sm:min-h-[38px] px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'week'
                  ? 'bg-white text-zinc-900 shadow-2xs font-bold border border-zinc-200/80'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`min-h-[44px] sm:min-h-[38px] px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'day'
                  ? 'bg-white text-zinc-900 shadow-2xs font-bold border border-zinc-200/80'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Day
            </button>
          </div>

          <NewBookingButton
            onClick={() => openInstantBookingModal()}
          />
        </div>
      </div>

      {/* Main Grid: Calendar on Left, Selected Day's Schedule on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid (2 Cols on desktop) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-200/90 p-4 sm:p-5 shadow-xs space-y-4">
          {/* Navigator Bar */}
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <div className="flex items-center gap-3">
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-zinc-900 font-display tracking-tight">
                {viewMode === 'month' && `${monthNames[currentMonth]} ${currentYear}`}
                {viewMode === 'week' && `Week of ${formatDate(weekDays[0].toISOString().split('T')[0])}`}
                {viewMode === 'day' && `${monthNames[currentMonth]} ${selectedDay}, ${currentYear}`}
              </h3>
              <button
                onClick={handleToday}
                className="text-xs sm:text-sm min-h-[40px] px-3.5 py-1.5 rounded-xl border border-orange-200 bg-orange-50/70 hover:bg-orange-100 text-orange-800 font-bold cursor-pointer transition-all active:scale-95"
              >
                Today
              </button>
            </div>

            {/* 48x48px Touch-friendly Navigation Buttons with Orange Hover/Active States */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrev}
                className="min-w-[48px] min-h-[48px] w-12 h-12 rounded-xl border border-zinc-200 bg-white hover:bg-orange-50 hover:border-orange-300 text-zinc-700 hover:text-orange-600 flex items-center justify-center cursor-pointer transition-all active:scale-95 shadow-2xs"
                title="Previous"
                aria-label="Previous Month"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleNext}
                className="min-w-[48px] min-h-[48px] w-12 h-12 rounded-xl border border-zinc-200 bg-white hover:bg-orange-50 hover:border-orange-300 text-zinc-700 hover:text-orange-600 flex items-center justify-center cursor-pointer transition-all active:scale-95 shadow-2xs"
                title="Next"
                aria-label="Next Month"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* VIEW MODE 1: MONTH VIEW */}
          {viewMode === 'month' && (
            <div className="space-y-1.5">
              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs sm:text-sm font-bold text-zinc-500 uppercase tracking-wider py-1.5">
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                {daysArray.map((day, idx) => {
                  if (day === null) {
                    return <div key={`empty-${idx}`} className="aspect-square sm:aspect-auto sm:h-22 rounded-xl bg-zinc-50/50" />;
                  }

                  const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const eventsOnDay = combinedCalendarEvents.filter(e => e.startDate === dateStr);
                  const isSelected = selectedDay === day;
                  const now = new Date();
                  const isToday = day === now.getDate() && currentMonth === now.getMonth() && currentYear === now.getFullYear();
                  const hasMultiple = eventsOnDay.length > 1;

                  return (
                    <div
                      key={`day-${day}`}
                      onClick={() => handleDateClick(day)}
                      className={`aspect-square sm:aspect-auto sm:h-22 p-1 sm:p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-orange-500 bg-orange-50/70 ring-2 ring-orange-500/40'
                          : isToday
                          ? 'border-orange-300 bg-orange-50/40 hover:border-orange-400'
                          : 'border-zinc-200 hover:border-orange-300 hover:bg-orange-50/20'
                      }`}
                    >
                      {/* Mobile View: Clean Square Date Cell with Centered Number & Colored Dots */}
                      <div className="flex sm:hidden flex-col items-center justify-between h-full py-0.5">
                        <span className={`text-xs sm:text-sm font-bold ${
                          isSelected ? 'text-orange-950 font-black' : isToday ? 'text-orange-800' : 'text-zinc-800'
                        }`}>
                          {day}
                        </span>
                        <div className="flex items-center justify-center gap-1 flex-wrap max-w-full px-0.5 min-h-[10px]">
                          {eventsOnDay.slice(0, 3).map((ev, i) => (
                            <span
                              key={i}
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${getEventDotColor(ev.category)}`}
                              title={`${ev.name || ev.category}`}
                            />
                          ))}
                          {eventsOnDay.length > 3 && (
                            <span className="text-[12px] font-bold text-zinc-500 leading-none">
                              +{eventsOnDay.length - 3}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Desktop View (sm and up) */}
                      <div className="hidden sm:flex flex-col justify-between h-full">
                        <div className="flex items-center justify-between">
                          <span className={`text-[15px] sm:text-base md:text-[17px] ${
                            isSelected ? 'text-orange-950 font-black' : isToday ? 'text-orange-800 font-bold' : 'text-zinc-800 font-bold'
                          }`}>
                            {day}
                          </span>
                          {isToday && (
                            <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-orange-200 text-orange-900">
                              Today
                            </span>
                          )}
                          {hasMultiple && (
                            <div className="flex items-center gap-1">
                              <div className="flex items-center gap-0.5">
                                {eventsOnDay.slice(0, 3).map((ev, i) => (
                                  <span key={i} className={`w-1.5 h-1.5 rounded-full ${getEventDotColor(ev.category)}`} />
                                ))}
                              </div>
                              <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 border border-orange-200">
                                {eventsOnDay.length} shoots
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Event Badges */}
                        <div className="space-y-1 overflow-hidden mt-1">
                          {eventsOnDay.slice(0, 2).map(ev => (
                            <div
                              key={ev.id}
                              className={`text-xs sm:text-[13px] font-semibold px-1.5 py-0.5 rounded truncate border flex items-center gap-1 ${getCategoryBadgeColor(ev.category)}`}
                              title={`${ev.name} (${ev.category})`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getEventDotColor(ev.category)}`} />
                              <span className="truncate">{ev.name || ev.category}</span>
                            </div>
                          ))}
                          {eventsOnDay.length > 2 && (
                            <div className="text-xs text-orange-700 font-bold px-1">
                              +{eventsOnDay.length - 2} more
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 text-xs sm:text-sm text-zinc-500 flex items-center justify-between">
                <span>💡 Tap empty date to create new booking instantly. Tap date with bookings to manage schedule.</span>
              </div>
            </div>
          )}

          {/* VIEW MODE 2: WEEK VIEW */}
          {viewMode === 'week' && (
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map(d => {
                const dayDateStr = d.toISOString().split('T')[0];
                const dayNum = d.getDate();
                const dayEventsForWeek = combinedCalendarEvents.filter(e => e.startDate === dayDateStr);
                const isSelected = selectedDay === dayNum && currentMonth === d.getMonth();

                return (
                  <div
                    key={dayDateStr}
                    onClick={() => {
                      setSelectedDay(dayNum);
                      setCurrentMonth(d.getMonth());
                      setCurrentYear(d.getFullYear());
                      if (dayEventsForWeek.length === 0) {
                        handleDateClick(dayNum);
                      }
                    }}
                    className={`min-h-[220px] p-2 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                      isSelected ? 'border-orange-500 bg-orange-50/70 ring-2 ring-orange-500/40' : 'border-zinc-200 bg-white hover:border-orange-200 hover:bg-orange-50/20'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                        {d.toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                      <div className={`text-[15px] sm:text-base font-bold ${isSelected ? 'text-orange-950 font-black' : 'text-zinc-900'}`}>{dayNum}</div>

                      <div className="space-y-1.5 mt-2">
                        {dayEventsForWeek.map(ev => (
                          <div
                            key={ev.id}
                            className={`p-1.5 rounded-lg border text-xs sm:text-[13px] font-semibold ${getCategoryBadgeColor(ev.category)}`}
                          >
                            <div className="truncate font-bold">{ev.name}</div>
                            <div className="text-xs opacity-85">{ev.startTime}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {dayEventsForWeek.length === 0 && (
                      <span className="text-xs text-orange-600 font-bold text-center py-2">+ Add</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* VIEW MODE 3: DAY VIEW */}
          {viewMode === 'day' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-orange-50/50 border border-orange-200/80">
                <span className="text-sm font-bold text-orange-950">
                  Detailed Hourly Schedule for {formatDate(formattedSelectedDayStr)}
                </span>
                <button
                  onClick={handleCreateBookingForDay}
                  className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs sm:text-sm font-bold shadow-2xs cursor-pointer active:scale-95 transition-all"
                >
                  + Add Shoot on this Day
                </button>
              </div>

              {dayEvents.map(ev => (
                <div
                  key={ev.id}
                  className="p-4 rounded-xl border border-zinc-200 bg-white shadow-2xs space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${getCategoryBadgeColor(ev.category)}`}>
                      {ev.category}
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-zinc-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {ev.startTime} - {ev.endTime}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-base font-bold text-zinc-900">{ev.name}</h4>
                    <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">{ev.customerName} ({ev.customerPhone})</p>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-zinc-600">
                    <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{ev.venue}, {ev.venueCity}</span>
                  </div>
                </div>
              ))}

              {dayEvents.length === 0 && (
                <div className="p-8 text-center text-zinc-400 text-xs">
                  No events scheduled for this day. Tap "+ Add Shoot on this Day" to create one.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Selected Day Agenda (1 Col on right) */}
        <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-xs space-y-4">
          <div className="pb-3 border-b border-zinc-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-zinc-900 font-display">
                {monthNames[currentMonth]} {selectedDay}, {currentYear}
              </h3>
              <p className="text-xs text-zinc-500 font-medium">{dayEvents.length} Shoots Scheduled</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-700">
              <CalendarIcon className="w-4 h-4" />
            </div>
          </div>

          {/* Day's Event List */}
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {dayEvents.map(ev => {
              const eventConflicts = getEventConflicts(ev as unknown as StudioEvent);

              return (
                <div
                  key={ev.id}
                  className="p-3.5 rounded-xl border border-zinc-200 hover:border-orange-200 transition-all space-y-2.5 bg-zinc-50/50 hover:bg-orange-50/10"
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${getCategoryBadgeColor(ev.category)}`}>
                      {ev.category}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusBadgeColor(ev.status)}`}>
                      {ev.status}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm sm:text-base font-bold text-zinc-900">{ev.name}</h4>
                    <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">{ev.customerName} • {ev.customerPhone}</p>
                  </div>

                  <div className="text-xs sm:text-sm text-zinc-600 space-y-1 pt-1 border-t border-zinc-200/60">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{formatTime(ev.startTime)} - {formatTime(ev.endTime)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span className="truncate">{ev.venue}, {ev.venueCity}</span>
                    </div>
                  </div>

                  {/* Assigned Crew Indicators & Subtle Conflict Info */}
                  {ev.assignedTeamIds && ev.assignedTeamIds.length > 0 && (
                    <div className="flex items-center justify-between gap-1.5 text-xs text-zinc-500 pt-1 border-t border-zinc-200/60 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                        <span>{ev.assignedTeamIds.length} team members assigned</span>
                      </div>
                      {eventConflicts.length > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveConflictInfo({
                              eventId: ev.id,
                              eventName: ev.name,
                              conflicts: eventConflicts
                            });
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 transition-colors cursor-pointer shrink-0"
                          title="View schedule conflict details"
                          aria-label="View conflict details"
                        >
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Conflict Info</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Actions: Open Booking Workspace & Edit Event */}
                  <div className="pt-2 border-t border-zinc-200/60 flex items-center gap-2">
                    <button
                      onClick={() => {
                        window.location.hash = `#/app/bookings/${ev.id}`;
                      }}
                      className="flex-1 min-h-[48px] sm:min-h-[42px] py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-sm sm:text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 transition-all"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Workspace</span>
                    </button>

                    <button
                      onClick={() => {
                        setEditingEvent(ev as unknown as StudioEvent);
                        setIsEventFormOpen(true);
                      }}
                      className="min-h-[48px] sm:min-h-[42px] py-2 px-4 rounded-xl border border-zinc-200 hover:border-orange-300 hover:bg-orange-50/40 text-zinc-700 text-sm sm:text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Edit Event Details"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>Edit</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {dayEvents.length === 0 && (
              <div className="p-8 text-center text-xs text-zinc-400 space-y-2">
                <p>No shoots booked on this date.</p>
                <button
                  onClick={handleCreateBookingForDay}
                  className="text-sm sm:text-xs font-bold text-orange-600 underline hover:text-orange-700 cursor-pointer min-h-[44px] inline-flex items-center"
                >
                  Schedule a shoot
                </button>
              </div>
            )}
          </div>

          {/* Button: + Book Another Shoot on this Date */}
          <div className="pt-2 border-t border-zinc-100">
            <button
              onClick={handleCreateBookingForDay}
              className="w-full min-h-[50px] sm:min-h-[44px] py-2.5 px-3 rounded-xl border border-dashed border-orange-300 hover:border-orange-500 text-sm sm:text-xs font-bold text-orange-800 hover:bg-orange-50/50 flex items-center justify-center gap-1.5 cursor-pointer transition-colors active:scale-98"
            >
              <Plus className="w-4 h-4 text-orange-600" />
              <span>+ Book Another Shoot on this Date</span>
            </button>
          </div>
        </div>
      </div>

      {/* Subtle Crew Conflict Overlap Details Popover / Modal (Requirement 1) */}
      {activeConflictInfo && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in"
          onClick={() => setActiveConflictInfo(null)}
        >
          <div 
            className="bg-white rounded-2xl border border-zinc-200/90 shadow-xl max-w-sm w-full p-4.5 space-y-3"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                </div>
                <h4 className="text-sm font-bold text-zinc-900 font-display">Crew Schedule Overlap</h4>
              </div>
              <button
                onClick={() => setActiveConflictInfo(null)}
                className="min-w-[32px] min-h-[32px] rounded-lg hover:bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-zinc-700 cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-zinc-600">
              <p>
                Shoot: <strong className="text-zinc-900">{activeConflictInfo.eventName}</strong>
              </p>
              <p className="text-zinc-500">
                The following crew member(s) have concurrent assignments on {formatDate(formattedSelectedDayStr)}:
              </p>
              <div className="space-y-1.5 pt-1">
                {activeConflictInfo.conflicts.map((c, i) => (
                  <div key={i} className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/70 space-y-0.5">
                    <div className="font-bold text-amber-950 flex items-center justify-between">
                      <span>{c.memberName}</span>
                      <span className="text-[12px] font-semibold text-amber-800 font-mono">{c.conflictingTime}</span>
                    </div>
                    <div className="text-amber-800 text-[12px]">
                      Conflicting Shoot: <strong className="text-amber-950">{c.conflictingEventName}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-100 flex justify-end">
              <button
                onClick={() => setActiveConflictInfo(null)}
                className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-xs font-bold text-zinc-800 cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {calendarToast && (
        <div className="fixed top-5 right-5 z-50 p-4 rounded-2xl bg-emerald-900 text-white shadow-2xl border border-emerald-700 flex items-center gap-3 text-xs font-semibold animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{calendarToast}</span>
          <button onClick={() => setCalendarToast(null)} className="ml-2 text-emerald-300 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Quick Instant Shoot Creation Modal (1-Step, Zero Friction) */}
      {isInstantShootModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in overflow-y-auto"
          onClick={() => setIsInstantShootModalOpen(false)}
        >
          <div 
            className="bg-white rounded-3xl border border-zinc-200/90 shadow-2xl max-w-lg w-full p-5 sm:p-7 space-y-4 my-8"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-zinc-900 font-display">
                      Schedule Shoot / Event
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">
                      Instant Booking
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 font-medium">
                    Quickly add shoot to Calendar & Booking Directory
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsInstantShootModalOpen(false)}
                className="w-8 h-8 rounded-xl hover:bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-zinc-700 cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error Message */}
            {instantError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{instantError}</span>
              </div>
            )}

            <form onSubmit={handleSaveInstantShoot} className="space-y-4">
              {/* Event / Shoot Name */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                  Event / Shoot Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul & Pooja Wedding or Pre-Wedding Shoot"
                  value={instantForm.eventName}
                  onChange={e => setInstantForm(f => ({ ...f, eventName: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 font-medium bg-zinc-50 focus:bg-white"
                />
              </div>

              {/* Event Category Chips */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                  Category
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {['Wedding', 'Pre-Wedding', 'Engagement', 'Reception', 'Haldi / Mehndi', 'Maternity', 'Corporate', 'Birthday'].map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setInstantForm(f => ({ ...f, category: cat }))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        instantForm.category === cat
                          ? 'bg-zinc-900 text-white shadow-xs'
                          : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Client Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Client Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Patel"
                    value={instantForm.customerName}
                    onChange={e => setInstantForm(f => ({ ...f, customerName: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 font-medium bg-zinc-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Mobile / WhatsApp *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={instantForm.customerPhone}
                    onChange={e => setInstantForm(f => ({ ...f, customerPhone: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 font-medium bg-zinc-50 focus:bg-white"
                  />
                </div>
              </div>

              {/* Date & Time Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Shoot Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={instantForm.eventDate}
                    onChange={e => setInstantForm(f => ({ ...f, eventDate: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 font-medium bg-zinc-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Start Time
                  </label>
                  <input
                    type="text"
                    value={instantForm.startTime}
                    onChange={e => setInstantForm(f => ({ ...f, startTime: e.target.value }))}
                    placeholder="10:00 AM"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 font-medium bg-zinc-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    End Time
                  </label>
                  <input
                    type="text"
                    value={instantForm.endTime}
                    onChange={e => setInstantForm(f => ({ ...f, endTime: e.target.value }))}
                    placeholder="06:00 PM"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 font-medium bg-zinc-50 focus:bg-white"
                  />
                </div>
              </div>

              {/* Venue & City Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Venue / Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Grand Heritage Lawn"
                    value={instantForm.venue}
                    onChange={e => setInstantForm(f => ({ ...f, venue: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 font-medium bg-zinc-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={instantForm.city}
                    onChange={e => setInstantForm(f => ({ ...f, city: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 font-medium bg-zinc-50 focus:bg-white"
                  />
                </div>
              </div>

              {/* Financials Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-zinc-50 rounded-2xl border border-zinc-200/70">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Agreed Package (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={instantForm.agreedAmount}
                    onChange={e => setInstantForm(f => ({ ...f, agreedAmount: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 font-mono font-bold bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Advance Paid (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={instantForm.advancePaid}
                    onChange={e => setInstantForm(f => ({ ...f, advancePaid: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-emerald-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 font-mono font-bold bg-white"
                  />
                </div>
              </div>

              {/* Form Buttons */}
              <div className="pt-2 space-y-2.5">
                <button
                  type="submit"
                  disabled={isSavingInstant}
                  className="w-full min-h-[46px] py-2.5 px-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-60"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>{isSavingInstant ? 'Saving Shoot...' : '⚡ Save & Schedule Shoot'}</span>
                </button>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsInstantShootModalOpen(false);
                      window.location.hash = `#/app/bookings/new?date=${encodeURIComponent(instantForm.eventDate || formattedSelectedDayStr)}&name=${encodeURIComponent(instantForm.customerName)}&phone=${encodeURIComponent(instantForm.customerPhone)}&event=${encodeURIComponent(instantForm.eventName)}&category=${encodeURIComponent(instantForm.category)}&venue=${encodeURIComponent(instantForm.venue)}`;
                    }}
                    className="text-orange-600 hover:text-orange-800 font-bold underline cursor-pointer"
                  >
                    Need multi-function crew & gear? Open 8-step wizard →
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsInstantShootModalOpen(false)}
                    className="text-zinc-500 hover:text-zinc-800 font-bold px-2 py-1 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
