import React from 'react';
import { StudioEvent, EventStatus } from '../../types';
import { formatDate, formatTime, getCategoryBadgeColor, getPriorityBadgeColor } from '../../utils/formatters';
import { Calendar, Clock, MapPin, ChevronRight, ArrowRight } from 'lucide-react';

interface EventKanbanViewProps {
  events: StudioEvent[];
  onSelectEvent: (eventId: string) => void;
  onUpdateStatus: (eventId: string, newStatus: EventStatus) => void;
}

const KANBAN_COLUMNS: { status: EventStatus; label: string; color: string }[] = [
  { status: 'Enquiry', label: 'Enquiry', color: 'border-blue-300 bg-blue-50/50 text-blue-900' },
  { status: 'Tentative', label: 'Tentative', color: 'border-amber-300 bg-amber-50/50 text-amber-900' },
  { status: 'Confirmed', label: 'Confirmed', color: 'border-emerald-300 bg-emerald-50/50 text-emerald-900' },
  { status: 'In Progress', label: 'In Progress', color: 'border-indigo-300 bg-indigo-50/50 text-indigo-900' },
  { status: 'On Hold', label: 'On Hold', color: 'border-yellow-300 bg-yellow-50/50 text-yellow-900' },
  { status: 'Completed', label: 'Completed', color: 'border-teal-300 bg-teal-50/50 text-teal-900' },
  { status: 'Cancelled', label: 'Cancelled', color: 'border-rose-300 bg-rose-50/50 text-rose-900' }
];

export const EventKanbanView: React.FC<EventKanbanViewProps> = ({
  events,
  onSelectEvent,
  onUpdateStatus
}) => {
  return (
    <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-thin">
      {KANBAN_COLUMNS.map(col => {
        const colEvents = events.filter(e => {
          if (col.status === 'In Progress') {
            return ['In Progress', 'Shooting', 'Post-Production'].includes(e.status);
          }
          if (col.status === 'On Hold') {
            return ['On Hold', 'Under Review'].includes(e.status);
          }
          if (col.status === 'Completed') {
            return ['Completed', 'Delivered'].includes(e.status);
          }
          if (col.status === 'Enquiry') {
            return ['Enquiry', 'Draft'].includes(e.status);
          }
          return e.status === col.status;
        });

        return (
          <div
            key={col.status}
            className="w-80 shrink-0 bg-zinc-100/70 rounded-2xl border border-zinc-200/90 flex flex-col max-h-[75vh]"
          >
            {/* Column Header */}
            <div className={`p-3.5 border-b rounded-t-2xl flex items-center justify-between font-display ${col.color}`}>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs uppercase tracking-wider">{col.label}</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/80 border text-zinc-800">
                  {colEvents.length}
                </span>
              </div>
            </div>

            {/* Column Cards List */}
            <div className="p-3 overflow-y-auto space-y-3 flex-1 overscroll-contain">
              {colEvents.map(event => (
                <div
                  key={event.id}
                  onClick={() => onSelectEvent(event.id)}
                  className="p-3.5 rounded-xl bg-white border border-zinc-200 shadow-xs hover:border-zinc-300 hover:shadow-sm transition-all cursor-pointer space-y-2.5 group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${getCategoryBadgeColor(event.category)}`}>
                      {event.category}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityBadgeColor(event.priority)}`}>
                      {event.priority}
                    </span>
                  </div>

                  <div>
                    <h5 className="font-bold text-xs text-zinc-900 group-hover:text-zinc-950 line-clamp-2 font-display">
                      {event.name}
                    </h5>
                    <div className="text-xs text-zinc-500 mt-0.5 flex items-center justify-between">
                      <span className="truncate">{event.customerName}</span>
                      <span className="font-mono text-xs text-zinc-400 shrink-0">{event.eventNumber}</span>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-zinc-500 pt-1 border-t border-zinc-100">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-zinc-400" />
                      <span>{formatDate(event.startDate)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3 h-3 text-zinc-400 shrink-0" />
                      <span className="truncate">{event.venue}</span>
                    </div>
                  </div>

                  {/* Quick Move Status Dropdown */}
                  <div className="pt-2 border-t border-zinc-100 flex items-center justify-between gap-2" onClick={e => e.stopPropagation()}>
                    <span className="text-xs text-zinc-400">Move to:</span>
                    <select
                      value={event.status}
                      onChange={e => onUpdateStatus(event.id, e.target.value as EventStatus)}
                      className="text-xs font-semibold px-2 py-1 rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-800 focus:outline-none cursor-pointer"
                    >
                      {KANBAN_COLUMNS.map(c => (
                        <option key={c.status} value={c.status}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}

              {colEvents.length === 0 && (
                <div className="p-8 text-center text-xs text-zinc-400 italic">
                  No {col.label.toLowerCase()} events
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
