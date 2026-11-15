import React from 'react';
import { StudioEvent } from '../../types';
import { formatDate, formatTime, getCategoryBadgeColor, getStatusBadgeColor } from '../../utils/formatters';
import { Calendar, MapPin, MessageCircle, Clock, ChevronRight, User } from 'lucide-react';
import { openWhatsAppChat, generateWhatsAppMessage } from '../../utils/whatsapp';
import { useApp } from '../../context/AppContext';

interface EventCardMobileProps {
  event: StudioEvent;
  onSelect: (event: StudioEvent) => void;
}

export const EventCardMobile: React.FC<EventCardMobileProps> = ({ event, onSelect }) => {
  const { studio, users } = useApp();

  const handleWhatsAppClick = (e: React.MouseEvent) => {
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

  const leadUser = users.find(u => u.id === event.leadPhotographerId);

  return (
    <div
      onClick={() => onSelect(event)}
      className="bg-white rounded-2xl border border-zinc-200/90 p-4 shadow-xs active:scale-[0.99] transition-all cursor-pointer space-y-3"
    >
      {/* Top Header: Category & Status */}
      <div className="flex items-center justify-between gap-2">
        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${getCategoryBadgeColor(event.category)}`}>
          {event.category}
        </span>
        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${getStatusBadgeColor(event.status)}`}>
          {event.status}
        </span>
      </div>

      {/* Event Title & Customer */}
      <div>
        <h4 className="text-base font-semibold text-zinc-900 leading-snug line-clamp-1 font-display">
          {event.name}
        </h4>
        <div className="text-xs text-zinc-500 mt-0.5 flex items-center justify-between">
          <span className="truncate">{event.customerName}</span>
          <span className="font-mono text-xs text-zinc-400 shrink-0">{event.eventNumber}</span>
        </div>
      </div>

      {/* Date & Venue details */}
      <div className="space-y-1.5 pt-1 text-xs text-zinc-600">
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <span className="font-medium text-zinc-800">{formatDate(event.startDate)}</span>
          <span className="text-zinc-400">•</span>
          <span className="flex items-center gap-1 text-zinc-500">
            <Clock className="w-3 h-3 text-zinc-400" />
            {formatTime(event.startTime)}
          </span>
        </div>

        <div className="flex items-center gap-2 truncate">
          <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <span className="truncate text-zinc-600">{event.venue}, {event.venueCity}</span>
        </div>
      </div>

      {/* Footer: Lead crew & WhatsApp quick action */}
      <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {leadUser ? (
            <div className="flex items-center gap-1.5 text-xs text-zinc-700">
              <img
                src={leadUser.avatar}
                alt={leadUser.name}
                className="w-5 h-5 rounded-full object-cover border border-zinc-200"
              />
              <span className="text-xs font-medium text-zinc-600">{leadUser.name.split(' ')[0]} (Lead)</span>
            </div>
          ) : (
            <span className="text-xs text-zinc-400 flex items-center gap-1">
              <User className="w-3.5 h-3.5" /> Unassigned
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleWhatsAppClick}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium active:bg-emerald-100 transition-colors cursor-pointer"
            title="Send WhatsApp update to client"
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>WhatsApp</span>
          </button>
          <ChevronRight className="w-4 h-4 text-zinc-300" />
        </div>
      </div>
    </div>
  );
};
