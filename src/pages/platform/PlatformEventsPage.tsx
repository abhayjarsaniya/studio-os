import React, { useState, useMemo } from 'react';
import { usePlatform } from '../../context/PlatformContext';
import { platformEventsService, PlatformEventItem } from '../../services/platformEventsService';
import { platformStudioService } from '../../services/platformStudioService';
import { 
  Calendar, 
  Search, 
  Filter, 
  MapPin, 
  Building2, 
  Users, 
  Clock, 
  CheckCircle, 
  Sparkles, 
  ChevronRight, 
  X,
  Layers,
  Truck,
  Eye
} from 'lucide-react';

export const PlatformEventsPage: React.FC = () => {
  const { setPlatformRoute, setSelectedStudioId } = usePlatform();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudio, setSelectedStudio] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  
  // Inspection modal state
  const [inspectingEvent, setInspectingEvent] = useState<{ studioId: string; eventId: string } | null>(null);

  const studios = useMemo(() => platformStudioService.listStudios(), []);

  const events = useMemo(() => {
    return platformEventsService.listAllPlatformEvents({
      search: searchTerm.trim() || undefined,
      studioId: selectedStudio !== 'all' ? selectedStudio : undefined,
      category: selectedCategory !== 'all' ? selectedCategory : undefined,
      city: selectedCity !== 'all' ? selectedCity : undefined,
      status: selectedStatus !== 'all' ? selectedStatus : undefined
    });
  }, [searchTerm, selectedStudio, selectedCategory, selectedCity, selectedStatus]);

  const inspectionData = useMemo(() => {
    if (!inspectingEvent) return null;
    return platformEventsService.getEventInspection(inspectingEvent.studioId, inspectingEvent.eventId);
  }, [inspectingEvent]);

  // High-level metrics
  const totalEvents = events.length;
  const inProgressEvents = events.filter(e => e.status === 'in_progress').length;
  const totalSuppliersCount = events.reduce((sum, e) => sum + e.assignedSuppliersCount, 0);

  return (
    <div className="w-full space-y-4 sm:space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Calendar className="w-7 h-7 text-indigo-600" />
            Global Studio Events Directory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Platform-wide management view across all photography studios, sub-events, assigned crew and external suppliers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs font-semibold text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
            {totalEvents} Total Events
          </div>
          <div className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100 shadow-2xs">
            {inProgressEvents} Shoots In Progress
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search across all studios by event title, venue, studio name..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full md:w-auto">
            <select
              value={selectedStudio}
              onChange={e => setSelectedStudio(e.target.value)}
              className="text-xs border border-slate-200 rounded-xl px-2.5 py-2 bg-white"
            >
              <option value="all">All Studios</option>
              {studios.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            <select
              value={selectedCity}
              onChange={e => setSelectedCity(e.target.value)}
              className="text-xs border border-slate-200 rounded-xl px-2.5 py-2 bg-white"
            >
              <option value="all">All Cities</option>
              <option value="Ahmedabad">Ahmedabad</option>
              <option value="Surat">Surat</option>
              <option value="Vadodara">Vadodara</option>
              <option value="Rajkot">Rajkot</option>
              <option value="Gandhinagar">Gandhinagar</option>
            </select>

            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="text-xs border border-slate-200 rounded-xl px-2.5 py-2 bg-white"
            >
              <option value="all">All Categories</option>
              <option value="Wedding">Wedding</option>
              <option value="Pre-Wedding">Pre-Wedding</option>
              <option value="Engagement">Engagement</option>
              <option value="Corporate Event">Corporate Event</option>
              <option value="Fashion Photography">Fashion Photography</option>
              <option value="Product Photography">Product Photography</option>
            </select>

            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="text-xs border border-slate-200 rounded-xl px-2.5 py-2 bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Events Directory Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Event Details</th>
                <th className="px-4 py-3">Studio & City</th>
                <th className="px-4 py-3">Dates & Venue</th>
                <th className="px-4 py-3 text-center">Sub-Events</th>
                <th className="px-4 py-3 text-center">Crew / Suppliers</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {events.map(ev => {
                const isCompleted = ev.status === 'completed';
                const isInProgress = ev.status === 'in_progress';

                return (
                  <tr key={`${ev.studioId}_${ev.id}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900 text-sm">{ev.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-mono text-slate-400">{ev.id}</span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
                          {ev.category}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        {ev.studioName}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {ev.studioCity}
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-medium text-slate-800 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {ev.totalStartDate} → {ev.totalEndDate}
                      </div>
                      <div className="text-xs text-slate-500 truncate max-w-xs mt-0.5">
                        {ev.overallVenue}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs">
                        <Layers className="w-3 h-3" />
                        {ev.subEventsCount}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700" title="Assigned Studio Crew">
                          <Users className="w-3 h-3 text-slate-400" />
                          {ev.assignedTeamCount}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700" title="External Suppliers">
                          <Truck className="w-3 h-3 text-amber-500" />
                          {ev.assignedSuppliersCount}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1 ${
                        isCompleted
                          ? 'bg-emerald-100 text-emerald-800'
                          : isInProgress
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {isCompleted && <CheckCircle className="w-3 h-3" />}
                        {isInProgress && <Clock className="w-3 h-3" />}
                        {ev.status.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => setInspectingEvent({ studioId: ev.studioId, eventId: ev.id })}
                        className="px-2.5 py-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg inline-flex items-center gap-1 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
              {events.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    No studio events found matching your search and filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Read-Only Event Inspection Drawer / Modal */}
      {inspectionData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <Calendar className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{inspectionData.event.name}</h3>
                  <p className="text-xs text-slate-500">
                    Studio: <strong className="text-slate-700">{inspectionData.studio.name}</strong> ({inspectionData.studio.city})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectingEvent(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Event Metadata Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-xs uppercase font-bold text-slate-400 block">Category</span>
                  <span className="text-xs font-bold text-slate-800">{inspectionData.event.category}</span>
                </div>
                <div>
                  <span className="text-xs uppercase font-bold text-slate-400 block">Dates</span>
                  <span className="text-xs font-bold text-slate-800">
                    {inspectionData.event.totalStartDate || inspectionData.event.startDate} to {inspectionData.event.totalEndDate || inspectionData.event.endDate}
                  </span>
                </div>
                <div>
                  <span className="text-xs uppercase font-bold text-slate-400 block">Status</span>
                  <span className="text-xs font-bold text-indigo-600 uppercase">{inspectionData.event.status}</span>
                </div>
                <div>
                  <span className="text-xs uppercase font-bold text-slate-400 block">Venue</span>
                  <span className="text-xs font-bold text-slate-800 truncate block">
                    {inspectionData.event.overallVenue || inspectionData.event.venue}
                  </span>
                </div>
              </div>

              {/* Sub-Events */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  Scheduled Sub-Events ({inspectionData.subEvents.length})
                </h4>
                <div className="space-y-2">
                  {inspectionData.subEvents.map(se => (
                    <div key={se.id} className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="font-bold text-slate-800 text-xs">{se.name}</div>
                        <div className="text-xs text-slate-500">
                          {se.date} • {se.startTime} - {se.endTime} • {se.venue}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 self-start sm:self-auto">
                        {se.status}
                      </span>
                    </div>
                  ))}
                  {inspectionData.subEvents.length === 0 && (
                    <p className="text-xs text-slate-400">No sub-events attached to this booking.</p>
                  )}
                </div>
              </div>

              {/* Assigned In-House Team */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-600" />
                  In-House Studio Crew ({inspectionData.assignedTeam.length})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {inspectionData.assignedTeam.map(t => (
                    <div key={t.id} className="p-3 bg-white rounded-xl border border-slate-200 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center">
                        {t.name[0]}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 text-xs">{t.name}</div>
                        <div className="text-xs text-slate-400">{t.role}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* External Suppliers & Specialized Gear */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-amber-600" />
                  Assigned External Suppliers ({inspectionData.assignedSuppliers.length})
                </h4>
                <div className="space-y-2">
                  {inspectionData.assignedSuppliers.map(sup => (
                    <div key={sup.id} className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="font-bold text-slate-800 text-xs flex items-center gap-2">
                          {sup.supplierName}
                          <span className="text-xs font-normal text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                            {sup.category.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Call Time: <strong>{sup.callTime}</strong> • Venue: {sup.venue}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-800">Fee: ₹{sup.agreedFee.toLocaleString()}</span>
                        <span className="block text-xs text-slate-400 capitalize">Payment: {sup.paymentStatus}</span>
                      </div>
                    </div>
                  ))}
                  {inspectionData.assignedSuppliers.length === 0 && (
                    <p className="text-xs text-slate-400">No external suppliers assigned to this event.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => setInspectingEvent(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
