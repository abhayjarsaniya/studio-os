import React from 'react';
import { useApp } from '../context/AppContext';
import { Bell, Check, CheckCheck, Calendar, DollarSign, CheckSquare, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const NotificationsPage: React.FC = () => {
  const { 
    notifications, 
    markNotificationAsRead, 
    markAllNotificationsAsRead, 
    setActiveTab, 
    setSelectedEventId 
  } = useApp();

  const handleNotificationClick = (id: string, linkTab?: string, linkId?: string) => {
    markNotificationAsRead(id);
    if (linkTab) {
      setActiveTab(linkTab);
      if (linkId && linkTab === 'events') {
        setSelectedEventId(linkId);
      }
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'event':
        return <Calendar className="w-4 h-4 text-blue-600" />;
      case 'payment':
        return <DollarSign className="w-4 h-4 text-emerald-600" />;
      case 'task':
        return <CheckSquare className="w-4 h-4 text-amber-600" />;
      case 'system':
      default:
        return <Sparkles className="w-4 h-4 text-purple-600" />;
    }
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 font-display">
              Notifications & Alerts
            </h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-700">
              {notifications.filter(n => !n.read).length} Unread
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Operational updates, live shoot check-ins, advance payments and tasks
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          icon={<CheckCheck className="w-4 h-4" />}
          onClick={markAllNotificationsAsRead}
        >
          Mark All Read
        </Button>
      </div>

      {/* Notifications List */}
      <div className="space-y-2.5">
        {notifications.map(notif => (
          <div
            key={notif.id}
            onClick={() => handleNotificationClick(notif.id, notif.linkTab, notif.linkId)}
            className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
              !notif.read 
                ? 'bg-white border-zinc-300 shadow-xs ring-1 ring-zinc-900/5' 
                : 'bg-zinc-50/70 border-zinc-200/70 opacity-80'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center shrink-0 mt-0.5">
                {getIcon(notif.type)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className={`text-xs sm:text-sm font-semibold ${!notif.read ? 'text-zinc-900' : 'text-zinc-700'}`}>
                    {notif.title}
                  </h4>
                  {!notif.read && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                  {notif.message}
                </p>
                <div className="text-xs text-zinc-400 mt-2 font-medium">
                  {notif.timestamp}
                </div>
              </div>
            </div>

            {!notif.read && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  markNotificationAsRead(notif.id);
                }}
                className="text-xs text-zinc-500 hover:text-zinc-900 px-2 py-1 rounded hover:bg-zinc-100 shrink-0"
              >
                Mark Read
              </button>
            )}
          </div>
        ))}

        {notifications.length === 0 && (
          <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center text-xs text-zinc-500">
            No notifications at this time.
          </div>
        )}
      </div>
    </div>
  );
};
