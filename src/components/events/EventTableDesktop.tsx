import React from 'react';
import { StudioEvent } from '../../types';
import { formatDate, formatTime, getCategoryBadgeColor, getStatusBadgeColor, getPriorityBadgeColor } from '../../utils/formatters';
import { MessageCircle, Edit3, Trash2, Eye, MapPin } from 'lucide-react';
import { openWhatsAppChat, generateWhatsAppMessage } from '../../utils/whatsapp';
import { useApp } from '../../context/AppContext';

interface EventTableDesktopProps {
  events: StudioEvent[];
  onSelectEvent: (event: StudioEvent) => void;
  onEditEvent: (event: StudioEvent) => void;
}

export const EventTableDesktop: React.FC<EventTableDesktopProps> = ({
  events,
  onSelectEvent,
  onEditEvent
}) => {
  const { studio, users, deleteEvent } = useApp();

  const handleWhatsApp = (e: React.MouseEvent, event: StudioEvent) => {
    e.stopPropagation();
    const msg = generateWhatsAppMessage('event_reminder', {
      customerName: event.customerName,
      studioName: studio.name,
      eventName: event.name,
      eventDate: `${formatDate(event.startDate)} (${formatTime(event.startTime)})`,
      venue: `${event.venue}, ${event.venueCity}`
    });
    openWhatsAppChat(event.customerPhone, msg);
  };

  const handleDelete = (e: React.MouseEvent, eventId: string, name: string) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to remove event "${name}"?`)) {
      deleteEvent(eventId);
    }
  };

  if (events.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center">
        <p className="text-sm font-medium text-zinc-900">No events found matching your criteria</p>
        <p className="text-xs text-zinc-500 mt-1">Try resetting your filters or create a new shoot event.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-zinc-200/90 overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/70 text-zinc-500 font-semibold uppercase tracking-wider text-[10px]">
              <th className="py-3.5 px-4">Event & Category</th>
              <th className="py-3.5 px-4">Customer</th>
              <th className="py-3.5 px-4">Shoot Schedule & Venue</th>
              <th className="py-3.5 px-4">Assigned Crew</th>
              <th className="py-3.5 px-4">Priority</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {events.map((event) => {
              const assignedUsers = users.filter(u => event.assignedTeamIds.includes(u.id));

              return (
                <tr
                  key={event.id}
                  onClick={() => onSelectEvent(event)}
                  className="hover:bg-zinc-50/70 transition-colors cursor-pointer group"
                >
                  {/* Event & Category */}
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-zinc-900 text-sm group-hover:text-zinc-950 font-display">
                      {event.name}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getCategoryBadgeColor(event.category)}`}>
                        {event.category}
                      </span>
                      <span className="font-mono text-[10px] text-zinc-400">{event.eventNumber}</span>
                    </div>
                  </td>

                  {/* Customer */}
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-zinc-800">{event.customerName}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] text-zinc-500">{event.customerPhone}</span>
                      <button
                        onClick={(e) => handleWhatsApp(e, event)}
                        className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 transition-colors"
                        title="Chat on WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>

                  {/* Shoot Schedule & Venue */}
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-zinc-800 flex items-center gap-1.5">
                      <span>{formatDate(event.startDate)}</span>
                      <span className="text-zinc-400">•</span>
                      <span className="text-zinc-500 font-normal">{formatTime(event.startTime)}</span>
                    </div>
                    <div className="text-[11px] text-zinc-500 flex items-center gap-1 mt-0.5 truncate max-w-[200px]">
                      <MapPin className="w-3 h-3 text-zinc-400 shrink-0" />
                      <span className="truncate">{event.venue}, {event.venueCity}</span>
                    </div>
                  </td>

                  {/* Assigned Crew */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center -space-x-1.5">
                      {assignedUsers.slice(0, 3).map((u) => (
                        <img
                          key={u.id}
                          src={u.avatar}
                          alt={u.name}
                          title={`${u.name} (${u.roleTitle})`}
                          className="w-6 h-6 rounded-full object-cover border-2 border-white shadow-xs"
                        />
                      ))}
                      {assignedUsers.length > 3 && (
                        <div className="w-6 h-6 rounded-full bg-zinc-100 border-2 border-white flex items-center justify-center text-[9px] font-bold text-zinc-600">
                          +{assignedUsers.length - 3}
                        </div>
                      )}
                      {assignedUsers.length === 0 && (
                        <span className="text-zinc-400 text-[11px]">No crew assigned</span>
                      )}
                    </div>
                  </td>

                  {/* Priority */}
                  <td className="py-3.5 px-4">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${getPriorityBadgeColor(event.priority)}`}>
                      {event.priority}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4">
                    <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${getStatusBadgeColor(event.status)}`}>
                      {event.status}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEvent(event);
                        }}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 transition-colors"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditEvent(event);
                        }}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 transition-colors"
                        title="Edit event"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, event.id, event.name)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete event"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
