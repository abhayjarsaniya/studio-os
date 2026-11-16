import React, { useState, useMemo, useEffect } from 'react';
import { useApp, EventViewMode } from '../context/AppContext';
import { useStudio } from '../context/StudioContext';
import { StudioEvent, EventStatus, Priority } from '../types';
import { ALL_EVENT_CATEGORIES } from '../data/demoData';
import { EventCardMobile } from '../components/events/EventCardMobile';
import { EventTableDesktop } from '../components/events/EventTableDesktop';
import { EventKanbanView } from '../components/events/EventKanbanView';
import { EventCalendarMultiView } from '../components/events/EventCalendarMultiView';
import { EventDetailPage } from './EventDetailPage';
import { EventCreateEditPage } from './EventCreateEditPage';
import { Button } from '../components/ui/Button';
import { 
  Plus, 
  Search, 
  Filter, 
  X, 
  List, 
  Kanban, 
  Calendar as CalendarIcon, 
  Smartphone,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown
} from 'lucide-react';

export const EventsPage: React.FC = () => {
  const { 
    events, 
    eventRoute,
    setEventRoute,
    navigateToCreateEvent,
    navigateToEventDetail,
    navigateToEditEvent,
    eventFilterOverride,
    setEventFilterOverride,
    updateEventStatus,
    globalSearchQuery 
  } = useApp();

  const { currentStudio } = useStudio();

  // If subroute is create / detail / edit, render dedicated pages directly!
  if (eventRoute.mode === 'create') {
    return <EventCreateEditPage />;
  }
  if (eventRoute.mode === 'edit' && eventRoute.eventId) {
    return <EventCreateEditPage eventIdToEdit={eventRoute.eventId} />;
  }
  if (eventRoute.mode === 'detail' && eventRoute.eventId) {
    return <EventDetailPage eventId={eventRoute.eventId} />;
  }

  // Active View Mode (list, kanban, calendar, mobile)
  const [viewMode, setViewMode] = useState<EventViewMode>(
    eventRoute.mode === 'list' && eventRoute.view ? eventRoute.view : 'list'
  );

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedPriority, setSelectedPriority] = useState<string>('All');
  const [sortField, setSortField] = useState<'startDate' | 'name' | 'priority'>('startDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Pagination (10 per page)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Apply dashboard filter override if present
  useEffect(() => {
    if (eventFilterOverride) {
      if (eventFilterOverride.status) setSelectedStatus(eventFilterOverride.status);
      if (eventFilterOverride.category) setSelectedCategory(eventFilterOverride.category);
      if (eventFilterOverride.search) setSearch(eventFilterOverride.search);
      setEventFilterOverride(null); // clear after applying
    }
  }, [eventFilterOverride, setEventFilterOverride]);

  const effectiveSearch = search || globalSearchQuery;

  // Filtered & Sorted Events
  const filteredEvents = useMemo(() => {
    const list = events.filter(e => {
      // Search
      const matchesSearch = !effectiveSearch || 
        e.name.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
        e.customerName.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
        e.venue.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
        e.eventNumber.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
        e.category.toLowerCase().includes(effectiveSearch.toLowerCase());

      // Category
      const matchesCategory = selectedCategory === 'All' || e.category === selectedCategory;

      // Status
      let matchesStatus = true;
      if (selectedStatus === 'Delayed') {
        const todayStr = new Date().toISOString().split('T')[0];
        matchesStatus = e.endDate < todayStr && !['Completed', 'Delivered', 'Cancelled'].includes(e.status);
      } else if (selectedStatus !== 'All') {
        matchesStatus = e.status === selectedStatus;
      }

      // Priority
      const matchesPriority = selectedPriority === 'All' || e.priority === selectedPriority;

      return matchesSearch && matchesCategory && matchesStatus && matchesPriority;
    });

    // Sorting
    list.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'startDate') {
        comparison = a.startDate.localeCompare(b.startDate);
      } else if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === 'priority') {
        const pOrder: Record<Priority, number> = { Urgent: 4, High: 3, Medium: 2, Low: 1 };
        comparison = pOrder[a.priority] - pOrder[b.priority];
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return list;
  }, [events, effectiveSearch, selectedCategory, selectedStatus, selectedPriority, sortField, sortDirection]);

  // Paginated List
  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / pageSize));
  const paginatedEvents = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredEvents.slice(startIndex, startIndex + pageSize);
  }, [filteredEvents, currentPage, pageSize]);

  const resetFilters = () => {
    setSearch('');
    setSelectedCategory('All');
    setSelectedStatus('All');
    setSelectedPriority('All');
    setCurrentPage(1);
  };

  const allStatuses: EventStatus[] = [
    'Enquiry',
    'Tentative',
    'Confirmed',
    'In Progress',
    'On Hold',
    'Completed',
    'Cancelled'
  ];

  return (
    <div className="w-full space-y-4 sm:space-y-5 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 font-display">
              Events & Shoots
            </h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-700">
              {filteredEvents.length} Total
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Active tenant: <strong className="text-zinc-800">{currentStudio.name}</strong> • Multi-view shoot manager
          </p>
        </div>

        {/* View Switchers & Create CTA */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 4 View Tabs */}
          <div className="flex items-center p-1 bg-zinc-100 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 sm:px-3 sm:py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'list' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-800'
              }`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">List</span>
            </button>

            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 sm:px-3 sm:py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'kanban' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-800'
              }`}
              title="Kanban Board"
            >
              <Kanban className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kanban</span>
            </button>

            <button
              onClick={() => setViewMode('calendar')}
              className={`p-1.5 sm:px-3 sm:py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'calendar' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-800'
              }`}
              title="Calendar Schedule"
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Calendar</span>
            </button>

            <button
              onClick={() => setViewMode('mobile')}
              className={`p-1.5 sm:px-3 sm:py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'mobile' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-800'
              }`}
              title="Mobile Cards"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cards</span>
            </button>
          </div>

          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={navigateToCreateEvent}
          >
            Create Event
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-zinc-200/90 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          {/* Search box */}
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by event, client, venue, or EVT number..."
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-zinc-200 text-xs bg-zinc-50 focus:bg-white focus:outline-none min-h-[44px]"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Dropdown */}
          <div>
            <select
              value={selectedStatus}
              onChange={e => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-800 bg-white focus:outline-none min-h-[44px]"
            >
              <option value="All">All Statuses</option>
              {allStatuses.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
              <option value="Delayed">Delayed / Overdue</option>
            </select>
          </div>

          {/* Priority Dropdown */}
          <div>
            <select
              value={selectedPriority}
              onChange={e => {
                setSelectedPriority(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-800 bg-white focus:outline-none min-h-[44px]"
            >
              <option value="All">All Priorities</option>
              <option value="Urgent">Urgent Priority</option>
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>
          </div>
        </div>

        {/* Category Pill Filters (Horizontal Scroll) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-none text-xs">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Categories ({ALL_EVENT_CATEGORIES.length}):
          </span>
          <button
            onClick={() => {
              setSelectedCategory('All');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium shrink-0 transition-all cursor-pointer ${
              selectedCategory === 'All'
                ? 'bg-zinc-900 text-white shadow-xs'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            All
          </button>
          {ALL_EVENT_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium shrink-0 transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Active Filters Reset Pill */}
        {(selectedCategory !== 'All' || selectedStatus !== 'All' || selectedPriority !== 'All' || search) && (
          <div className="flex items-center justify-between text-xs pt-2 border-t border-zinc-100">
            <span className="text-zinc-500 font-medium">
              Filtered: Showing {filteredEvents.length} matching events
            </span>
            <button
              onClick={resetFilters}
              className="text-xs text-blue-600 font-bold hover:underline"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* RENDER ACTIVE VIEW */}

      {/* 1. KANBAN VIEW */}
      {viewMode === 'kanban' && (
        <EventKanbanView
          events={filteredEvents}
          onSelectEvent={navigateToEventDetail}
          onUpdateStatus={(eventId, newStatus) => updateEventStatus(eventId, newStatus)}
        />
      )}

      {/* 2. CALENDAR MULTI-VIEW (Month / Week / Day) */}
      {viewMode === 'calendar' && (
        <EventCalendarMultiView
          events={filteredEvents}
          onSelectEvent={navigateToEventDetail}
        />
      )}

      {/* 3. MOBILE CARDS VIEW */}
      {viewMode === 'mobile' && (
        <div className="space-y-3">
          {paginatedEvents.map(event => (
            <EventCardMobile
              key={event.id}
              event={event}
              onSelect={() => navigateToEventDetail(event.id)}
            />
          ))}

          {filteredEvents.length === 0 && (
            <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center text-xs text-zinc-400">
              No events found matching current criteria.
            </div>
          )}
        </div>
      )}

      {/* 4. LIST VIEW (Default Responsive Table / Cards) */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {/* Mobile view automatically rendered on small screens */}
          <div className="sm:hidden space-y-3">
            {paginatedEvents.map(event => (
              <EventCardMobile
                key={event.id}
                event={event}
                onSelect={() => navigateToEventDetail(event.id)}
              />
            ))}
          </div>

          {/* Desktop CRM Table */}
          <div className="hidden sm:block">
            <EventTableDesktop
              events={paginatedEvents}
              onSelectEvent={(ev) => navigateToEventDetail(ev.id)}
              onEditEvent={(ev) => navigateToEditEvent(ev.id)}
            />
          </div>

          {/* Pagination Controls */}
          {filteredEvents.length > pageSize && (
            <div className="bg-white p-3.5 rounded-2xl border border-zinc-200 shadow-xs flex items-center justify-between text-xs">
              <span className="text-zinc-500 font-medium">
                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredEvents.length)} of {filteredEvents.length} events
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="px-2.5 py-1 rounded-lg border border-zinc-200 hover:bg-zinc-50 disabled:opacity-40 disabled:pointer-events-none"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-semibold text-zinc-800 px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="px-2.5 py-1 rounded-lg border border-zinc-200 hover:bg-zinc-50 disabled:opacity-40 disabled:pointer-events-none"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
