import React, { useState, useMemo } from 'react';
import { usePlatform } from '../../context/PlatformContext';
import { platformSupportService } from '../../services/platformSupportService';
import { SupportTicket } from '../../types/schema';
import { 
  LifeBuoy, 
  Search, 
  Filter, 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Key,
  ShieldAlert
} from 'lucide-react';

export const PlatformSupportPage: React.FC = () => {
  const { triggerRefresh, refreshTrigger, canAdmin, currentAdmin, setSelectedStudioId, setPlatformRoute } = usePlatform();
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [internalNote, setInternalNote] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const tickets = useMemo(() => {
    return platformSupportService.listTickets({
      status: statusFilter !== 'all' ? statusFilter : undefined
    });
  }, [statusFilter, refreshTrigger]);

  const handleUpdateStatus = (ticketId: string, newStatus: any) => {
    platformSupportService.updateTicketStatus(ticketId, newStatus, currentAdmin.name);
    if (selectedTicket && selectedTicket.id === ticketId) {
      setSelectedTicket({ ...selectedTicket, status: newStatus });
    }
    triggerRefresh();
  };

  const handleAddNote = () => {
    if (!selectedTicket || !internalNote.trim()) return;
    const updated = platformSupportService.addInternalNote(selectedTicket.id, internalNote.trim(), currentAdmin.name);
    setSelectedTicket(updated);
    setInternalNote('');
    triggerRefresh();
  };

  const handleOpenStudioConsole = (studioId: string) => {
    setSelectedStudioId(studioId);
    setPlatformRoute('studio-detail');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <LifeBuoy className="w-7 h-7 text-indigo-600" />
            Support Tickets & Studio Assistance
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Resolve studio operational inquiries, billing questions, technical assistance, and authorized time-limited grants.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white"
          >
            <option value="all">All Ticket Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="waiting_for_studio">Waiting for Studio</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Grid: Tickets List & Active Ticket Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ticket List */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-3 border-b border-slate-100 bg-slate-50 font-bold text-xs text-slate-700">
            Tickets Queue ({tickets.length})
          </div>
          <div className="divide-y divide-slate-100 overflow-y-auto max-h-[70vh]">
            {tickets.map(ticket => {
              const isSelected = selectedTicket?.id === ticket.id;
              return (
                <div
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className={`p-3.5 transition-all cursor-pointer ${
                    isSelected ? 'bg-indigo-50/70 border-l-4 border-indigo-600' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-[11px] text-slate-500">{ticket.ticketNumber}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                      ticket.status === 'open' 
                        ? 'bg-rose-100 text-rose-800' 
                        : ticket.status === 'resolved' 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {ticket.status.replace('_', ' ')}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mt-1 line-clamp-1">{ticket.subject}</h4>
                  <div className="text-[11px] text-slate-500 mt-1">{ticket.studioName}</div>
                </div>
              );
            })}
            {tickets.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-400">No support tickets found.</div>
            )}
          </div>
        </div>

        {/* Selected Ticket Detail View */}
        <div className="lg:col-span-2">
          {selectedTicket ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      {selectedTicket.ticketNumber}
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs font-bold text-slate-700 capitalize">{selectedTicket.category}</span>
                  </div>
                  <h2 className="text-base font-black text-slate-900 mt-2">{selectedTicket.subject}</h2>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Studio: <strong className="text-slate-800">{selectedTicket.studioName}</strong> ({selectedTicket.submittedBy} - {selectedTicket.contactEmail})
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedTicket.status}
                    onChange={e => handleUpdateStatus(selectedTicket.id, e.target.value)}
                    className="text-xs font-bold border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="waiting_for_studio">Waiting for Studio</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>

                  <button
                    onClick={() => handleOpenStudioConsole(selectedTicket.studioId)}
                    className="px-2.5 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors"
                  >
                    Studio Console
                  </button>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Issue Description</h4>
                <div className="p-3.5 bg-slate-50 rounded-xl text-xs text-slate-800 leading-relaxed border border-slate-100">
                  {selectedTicket.description}
                </div>
              </div>

              {/* Internal Platform Notes (Confidential) */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-indigo-600" />
                    Internal Platform Notes (Strictly Hidden from Studio)
                  </h4>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={internalNote}
                    onChange={e => setInternalNote(e.target.value)}
                    placeholder="Add confidential technician note..."
                    className="flex-1 text-xs border border-slate-200 rounded-xl px-3 py-2"
                  />
                  <button
                    onClick={handleAddNote}
                    disabled={!internalNote.trim()}
                    className="px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:opacity-50"
                  >
                    Post Note
                  </button>
                </div>

                <div className="space-y-2">
                  {(selectedTicket.internalNotes || []).map((note, idx) => (
                    <div key={idx} className="p-2.5 bg-amber-50/60 border border-amber-200/60 rounded-xl text-xs text-amber-950">
                      {note}
                    </div>
                  ))}
                  {(!selectedTicket.internalNotes || selectedTicket.internalNotes.length === 0) && (
                    <div className="text-xs text-slate-400">No internal notes added yet.</div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
              Select a ticket from the left queue to view details, update resolution status, and log notes.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
