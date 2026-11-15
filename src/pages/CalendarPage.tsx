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
  Users
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { seedCalendarTestBookings, CALENDAR_TEST_FLAG } from '../services/calendarTestBookingsSeed';
import { TenantStore } from '../services/tenantStore';
import { StudioEvent } from '../types';
import { BookingRecord } from '../types/bookingProduction';
import { bookingProductionService } from '../services/bookingProductionService';
import { calendarVisibilityService } from '../services/calendarVisibilityService';
import { getStudioOwnerProfile, isStudioOwnerId } from '../services/studioOwnerHelper';
import { THEME } from '../utils/theme';

type CalendarViewMode = 'month' | 'week' | 'day';

export const CalendarPage: React.FC = () => {
  const { events, setSelectedEventId, setIsEventFormOpen, setEditingEvent } = useApp();
  const { currentStudio } = useStudio();
  const studioId = currentStudio?.id || 'studio_shreeji_films';
  const [dataVersion, setDataVersion] = useState(0);

  // Seed 12 calendar test bookings idempotently on mount if needed
  useEffect(() => {
    seedCalendarTestBookings(studioId).then(count => {
      if (count > 0) {
        setDataVersion(v => v + 1);
      }
    }).catch(err => {
      console.warn('[CalendarPage] Auto-seed note:', err);
    });
  }, [studioId]);

  // Calendar view mode: month, week, day
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [ownerScheduleFilter, setOwnerScheduleFilter] = useState<'all' | 'mine'>('all');

  // November 2026 as initial active date (matches test data timeline)
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(10); // 0-indexed, 10 = November
  const [selectedDay, setSelectedDay] = useState<number>(20); // Default to Nov 20, 2026 (Multiple shoots day)

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
    // Jump to November 15, 2026 (current application demo date)
    setCurrentYear(2026);
    setCurrentMonth(10);
    setSelectedDay(15);
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

  // Check crew conflicts on the selected day
  const crewConflictsOnSelectedDay = useMemo(() => {
    if (dayEvents.length < 2) return [];

    const conflicts: string[] = [];
    const memberAssignments: Record<string, { eventName: string; time: string }[]> = {};

    dayEvents.forEach(ev => {
      const team = ev.assignedTeamIds || [];
      team.forEach(mId => {
        if (!memberAssignments[mId]) memberAssignments[mId] = [];
        memberAssignments[mId].push({
          eventName: ev.name,
          time: `${ev.startTime || '10:00'} - ${ev.endTime || '18:00'}`
        });
      });
    });

    Object.entries(memberAssignments).forEach(([mId, asgns]) => {
      if (asgns.length > 1) {
        conflicts.push(`Crew member is assigned to ${asgns.length} overlapping shoots today (${asgns.map(a => a.eventName).join(' & ')}).`);
      }
    });

    return conflicts;
  }, [dayEvents]);

  // Handle click on a date cell in month view (Requirement 5)
  const handleDateClick = (dayNumber: number) => {
    setSelectedDay(dayNumber);
    const targetDateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
    const eventsOnThisDay = combinedCalendarEvents.filter(e => e.startDate === targetDateStr);

    if (eventsOnThisDay.length === 0) {
      // EMPTY DATE: Automatically open New Event Booking with this date pre-filled!
      setEditingEvent({
        id: '',
        studioId,
        eventNumber: '',
        name: '',
        title: '',
        customerId: '',
        customerName: '',
        customerPhone: '',
        category: 'Wedding',
        startDate: targetDateStr,
        startTime: '10:00',
        endDate: targetDateStr,
        endTime: '18:00',
        venue: '',
        venueCity: currentStudio?.city || 'Ahmedabad',
        priority: 'High',
        status: 'Confirmed',
        assignedTeamIds: [],
        estimatedBudget: 120000,
        advancePaid: 50000,
        notes: ''
      } as unknown as StudioEvent);
      setIsEventFormOpen(true);
    }
  };

  // Open New Booking for selected day
  const handleCreateBookingForDay = () => {
    setEditingEvent({
      id: '',
      studioId,
      eventNumber: '',
      name: '',
      title: '',
      customerId: '',
      customerName: '',
      customerPhone: '',
      category: 'Wedding',
      startDate: formattedSelectedDayStr,
      startTime: '10:00',
      endDate: formattedSelectedDayStr,
      endTime: '18:00',
      venue: '',
      venueCity: currentStudio?.city || 'Ahmedabad',
      priority: 'High',
      status: 'Confirmed',
      assignedTeamIds: [],
      estimatedBudget: 120000,
      advancePaid: 50000,
      notes: ''
    } as unknown as StudioEvent);
    setIsEventFormOpen(true);
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-8">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 font-display">
              Studio Shoot Calendar
            </h2>
            <span className="text-xs px-3 py-1 rounded-full bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold shadow-2xs">
              {combinedCalendarEvents.length} Shoots
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Overview of photography bookings, crew allocations and multi-event schedules
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Studio Owner Schedule Filter (Requirement 3: Owner personal calendar visibility) */}
          <div className="flex items-center p-1 bg-zinc-100 rounded-xl text-xs font-semibold border border-zinc-200/70">
            <button
              onClick={() => setOwnerScheduleFilter('all')}
              className={`min-h-[40px] px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                ownerScheduleFilter === 'all' ? 'bg-orange-500 text-white shadow-2xs font-bold' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              All Shoots
            </button>
            <button
              onClick={() => setOwnerScheduleFilter('mine')}
              className={`min-h-[40px] px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                ownerScheduleFilter === 'mine' ? 'bg-orange-500 text-white shadow-2xs font-bold' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>My Shoots</span>
            </button>
          </div>

          {/* Mode Switcher: Month / Week / Day */}
          <div className="flex items-center p-1 bg-zinc-100 rounded-xl text-xs font-semibold border border-zinc-200/70">
            <button
              onClick={() => setViewMode('month')}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'month' ? 'bg-orange-500 text-white shadow-2xs font-bold' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'week' ? 'bg-orange-500 text-white shadow-2xs font-bold' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'day' ? 'bg-orange-500 text-white shadow-2xs font-bold' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Day
            </button>
          </div>

          <Button
            variant="primary"
            size="md"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setEditingEvent(null);
              setIsEventFormOpen(true);
            }}
          >
            Book Shoot
          </Button>
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
              <div className="grid grid-cols-7 gap-1.5">
                {daysArray.map((day, idx) => {
                  if (day === null) {
                    return <div key={`empty-${idx}`} className="h-16 sm:h-22 rounded-xl bg-zinc-50/50" />;
                  }

                  const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const eventsOnDay = combinedCalendarEvents.filter(e => e.startDate === dateStr);
                  const isSelected = selectedDay === day;
                  const isToday = day === 15 && currentMonth === 10 && currentYear === 2026;
                  const hasMultiple = eventsOnDay.length > 1;

                  return (
                    <div
                      key={`day-${day}`}
                      onClick={() => handleDateClick(day)}
                      className={`h-16 sm:h-22 p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-orange-500 bg-orange-50/70 ring-2 ring-orange-500/40'
                          : isToday
                          ? 'border-orange-300 bg-orange-50/40 hover:border-orange-400'
                          : 'border-zinc-200 hover:border-orange-300 hover:bg-orange-50/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[15px] sm:text-base md:text-[17px] ${
                          isSelected ? 'text-orange-950 font-black' : isToday ? 'text-orange-800 font-bold' : 'text-zinc-800 font-bold'
                        }`}>
                          {day}
                        </span>
                        {isToday && (
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-orange-200 text-orange-900 hidden sm:inline">
                            Today
                          </span>
                        )}
                        {hasMultiple && (
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 border border-orange-200">
                            {eventsOnDay.length} shoots
                          </span>
                        )}
                      </div>

                      {/* Event Badges */}
                      <div className="space-y-1 overflow-hidden">
                        {eventsOnDay.slice(0, 2).map(ev => (
                          <div
                            key={ev.id}
                            className={`text-xs sm:text-[13px] font-semibold px-1 sm:px-1.5 py-0.5 rounded truncate border ${getCategoryBadgeColor(ev.category)}`}
                            title={`${ev.name} (${ev.category})`}
                          >
                            {ev.name || ev.category}
                          </div>
                        ))}
                        {eventsOnDay.length > 2 && (
                          <div className="text-xs text-orange-700 font-bold px-1">
                            +{eventsOnDay.length - 2} more
                          </div>
                        )}
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
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xs sm:text-sm font-bold shadow-2xs cursor-pointer active:scale-95 transition-all"
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
              <p className="text-xs text-orange-700 font-medium">{dayEvents.length} Shoots Scheduled</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200/80 flex items-center justify-center text-orange-600">
              <CalendarIcon className="w-4 h-4" />
            </div>
          </div>

          {/* Crew Conflict Warning Banner if multiple events share crew */}
          {crewConflictsOnSelectedDay.length > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm space-y-1.5 shadow-2xs">
              <div className="font-bold flex items-center gap-1.5 text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Crew Scheduling Conflict Detected</span>
              </div>
              {crewConflictsOnSelectedDay.map((msg, i) => (
                <p key={i} className="text-xs sm:text-[13px] leading-relaxed text-amber-900/90">{msg}</p>
              ))}
            </div>
          )}

          {/* Day's Event List */}
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {dayEvents.map(ev => (
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

                {/* Assigned Crew Indicators */}
                {ev.assignedTeamIds && ev.assignedTeamIds.length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <Users className="w-3.5 h-3.5 text-orange-500" />
                    <span>{ev.assignedTeamIds.length} team members assigned</span>
                  </div>
                )}

                {/* Actions: Open Booking Workspace & Edit Event */}
                <div className="pt-2 border-t border-zinc-200/60 flex items-center gap-2">
                  <button
                    onClick={() => {
                      window.location.hash = `#/app/bookings/${ev.id}`;
                    }}
                    className="flex-1 min-h-[42px] py-2 px-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 transition-all"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Workspace</span>
                  </button>

                  <button
                    onClick={() => {
                      setEditingEvent(ev as unknown as StudioEvent);
                      setIsEventFormOpen(true);
                    }}
                    className="min-h-[42px] py-2 px-3.5 rounded-xl border border-zinc-200 hover:border-orange-300 hover:bg-orange-50/40 text-zinc-700 text-xs sm:text-sm font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                    title="Edit Event Details"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                </div>
              </div>
            ))}

            {dayEvents.length === 0 && (
              <div className="p-8 text-center text-xs text-zinc-400 space-y-2">
                <p>No shoots booked on this date.</p>
                <button
                  onClick={handleCreateBookingForDay}
                  className="text-xs font-bold text-orange-600 underline hover:text-orange-700 cursor-pointer"
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
              className="w-full min-h-[44px] py-2.5 px-3 rounded-xl border border-dashed border-orange-300 hover:border-orange-500 text-xs font-bold text-orange-800 hover:bg-orange-50/50 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4 text-orange-600" />
              <span>+ Book Another Shoot on this Date</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
