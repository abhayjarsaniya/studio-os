import React, { useState } from 'react';
import { StudioEvent } from '../../types';
import { formatDate, formatTime, getCategoryBadgeColor, getStatusBadgeColor } from '../../utils/formatters';
import { ChevronLeft, ChevronRight, Clock, MapPin, Calendar as CalendarIcon } from 'lucide-react';

interface EventCalendarMultiViewProps {
  events: StudioEvent[];
  onSelectEvent: (eventId: string) => void;
}

type CalendarMode = 'month' | 'week' | 'day';

export const EventCalendarMultiView: React.FC<EventCalendarMultiViewProps> = ({
  events,
  onSelectEvent
}) => {
  const [mode, setMode] = useState<CalendarMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date(2026, 10, 13)); // November 13, 2026

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrev = () => {
    if (mode === 'month') {
      setCurrentDate(new Date(year, month - 1, 1));
    } else if (mode === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 1);
      setCurrentDate(d);
    }
  };

  const handleNext = () => {
    if (mode === 'month') {
      setCurrentDate(new Date(year, month + 1, 1));
    } else if (mode === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 1);
      setCurrentDate(d);
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date(2026, 10, 13));
  };

  // Month calculations
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysArray: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) daysArray.push(null);
  for (let d = 1; d <= daysInMonth; d++) daysArray.push(d);

  // Week calculations
  const startOfWeek = new Date(currentDate);
  const dayOfWeek = startOfWeek.getDay();
  const diffToMon = startOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  startOfWeek.setDate(diffToMon);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });

  const currentDateIso = currentDate.toISOString().split('T')[0];

  return (
    <div className="bg-white rounded-2xl border border-zinc-200/90 p-4 sm:p-5 shadow-xs space-y-4">
      {/* Calendar Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
        <div className="flex items-center gap-3">
          <h3 className="text-base sm:text-lg font-bold text-zinc-900 font-display">
            {mode === 'month' && `${monthNames[month]} ${year}`}
            {mode === 'week' && `Week of ${formatDate(weekDays[0].toISOString().split('T')[0])}`}
            {mode === 'day' && `${formatDate(currentDateIso)}`}
          </h3>
          <button
            onClick={handleToday}
            className="text-xs px-2.5 py-1 rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 font-medium"
          >
            Today
          </button>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3">
          {/* Mode Switcher */}
          <div className="flex items-center p-1 bg-zinc-100 rounded-xl text-xs font-semibold">
            {(['month', 'week', 'day'] as CalendarMode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1 rounded-lg capitalize transition-all cursor-pointer ${
                  mode === m ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Navigation Arrows */}
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              className="w-8 h-8 rounded-lg border border-zinc-200 flex items-center justify-center text-zinc-600 hover:bg-zinc-50 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              className="w-8 h-8 rounded-lg border border-zinc-200 flex items-center justify-center text-zinc-600 hover:bg-zinc-50 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* MONTH VIEW */}
      {mode === 'month' && (
        <div className="space-y-2">
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-zinc-400 uppercase tracking-wider py-1">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {daysArray.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="h-20 sm:h-28 rounded-xl bg-zinc-50/50" />;
              }

              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              // Support multiple-day events: event covers date if startDate <= dateStr and endDate >= dateStr
              const dayEvents = events.filter(e => {
                const s = e.startDate;
                const end = e.endDate || e.startDate;
                return dateStr >= s && dateStr <= end;
              });

              const isToday = day === 13 && month === 10 && year === 2026;

              return (
                <div
                  key={`day-${day}`}
                  className={`h-20 sm:h-28 p-1 sm:p-2 rounded-xl border flex flex-col justify-between overflow-hidden transition-all ${
                    isToday ? 'border-amber-300 bg-amber-50/40 ring-1 ring-amber-300' : 'border-zinc-200/90 bg-white hover:bg-zinc-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold ${isToday ? 'text-amber-900 font-bold' : 'text-zinc-700'}`}>
                      {day}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[9px] font-bold text-zinc-400">{dayEvents.length}</span>
                    )}
                  </div>

                  <div className="space-y-1 overflow-y-auto max-h-16 scrollbar-none">
                    {dayEvents.map(ev => {
                      const isMultiDay = ev.endDate && ev.endDate !== ev.startDate;
                      return (
                        <div
                          key={ev.id}
                          onClick={() => onSelectEvent(ev.id)}
                          className={`text-[9px] sm:text-[10px] font-medium px-1.5 py-0.5 rounded truncate border cursor-pointer hover:opacity-85 ${getCategoryBadgeColor(ev.category)}`}
                          title={`${ev.name} (${formatTime(ev.startTime)})${isMultiDay ? ' [Multi-Day Shoot]' : ''}`}
                        >
                          {isMultiDay && <span className="font-bold mr-0.5">●</span>}
                          {ev.name}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* WEEK VIEW */}
      {mode === 'week' && (
        <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
          {weekDays.map(d => {
            const dateStr = d.toISOString().split('T')[0];
            const dayEvents = events.filter(e => {
              const s = e.startDate;
              const end = e.endDate || e.startDate;
              return dateStr >= s && dateStr <= end;
            });

            return (
              <div key={dateStr} className="p-3 rounded-2xl border border-zinc-200 bg-white min-h-[220px] flex flex-col justify-between">
                <div className="pb-2 border-b border-zinc-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-800">
                    {d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-zinc-100 text-zinc-600">
                    {dayEvents.length}
                  </span>
                </div>

                <div className="space-y-2 py-2 flex-1 overflow-y-auto">
                  {dayEvents.map(ev => (
                    <div
                      key={ev.id}
                      onClick={() => onSelectEvent(ev.id)}
                      className="p-2 rounded-xl border border-zinc-200/80 bg-zinc-50 hover:bg-zinc-100 cursor-pointer text-xs space-y-1 transition-all"
                    >
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${getCategoryBadgeColor(ev.category)}`}>
                        {ev.category}
                      </span>
                      <div className="font-bold text-zinc-900 line-clamp-1">{ev.name}</div>
                      <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" /> {formatTime(ev.startTime)}
                      </div>
                    </div>
                  ))}

                  {dayEvents.length === 0 && (
                    <div className="text-[11px] text-zinc-400 italic pt-6 text-center">No shoots</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DAY VIEW */}
      {mode === 'day' && (
        <div className="space-y-3">
          <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-zinc-900">Agenda for {formatDate(currentDateIso)}</h4>
              <p className="text-xs text-zinc-500">Timeline view for single shoot day</p>
            </div>
          </div>

          <div className="space-y-2.5">
            {events.filter(e => {
              const s = e.startDate;
              const end = e.endDate || e.startDate;
              return currentDateIso >= s && currentDateIso <= end;
            }).map(ev => (
              <div
                key={ev.id}
                onClick={() => onSelectEvent(ev.id)}
                className="p-4 rounded-2xl border border-zinc-200 bg-white hover:border-zinc-300 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getCategoryBadgeColor(ev.category)}`}>
                      {ev.category}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getStatusBadgeColor(ev.status)}`}>
                      {ev.status}
                    </span>
                    <span className="font-mono text-[10px] text-zinc-400">{ev.eventNumber}</span>
                  </div>
                  <h4 className="text-sm font-bold text-zinc-900 group-hover:text-zinc-950 font-display">
                    {ev.name}
                  </h4>
                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-zinc-400" />
                      {formatTime(ev.startTime)} - {formatTime(ev.endTime)}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                      {ev.venue}, {ev.venueCity}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-semibold text-zinc-900">{ev.customerName}</div>
                  <div className="text-[10px] text-zinc-400">{ev.customerPhone}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
