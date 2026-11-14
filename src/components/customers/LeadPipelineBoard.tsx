import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Lead, LeadStatus } from '../../types';
import { Button } from '../ui/Button';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { 
  Plus, 
  MessageCircle, 
  UserPlus, 
  Search, 
  Calendar, 
  Tag, 
  ArrowRight, 
  CheckCircle2, 
  Clock,
  Building2,
  DollarSign
} from 'lucide-react';

const PIPELINE_COLUMNS: Array<{ status: LeadStatus; label: string; color: string }> = [
  { status: 'New Inquiry', label: 'New Inquiry', color: 'border-blue-400 bg-blue-50/40 text-blue-800' },
  { status: 'Contacted', label: 'Contacted', color: 'border-indigo-400 bg-indigo-50/40 text-indigo-800' },
  { status: 'Quotation Sent', label: 'Quotation Sent', color: 'border-purple-400 bg-purple-50/40 text-purple-800' },
  { status: 'Negotiation', label: 'Negotiation', color: 'border-amber-400 bg-amber-50/40 text-amber-800' },
  { status: 'Booked', label: 'Booked', color: 'border-emerald-400 bg-emerald-50/40 text-emerald-800' },
  { status: 'Lost', label: 'Lost', color: 'border-rose-400 bg-rose-50/40 text-rose-800' }
];

export const LeadPipelineBoard: React.FC = () => {
  const { 
    leads, 
    updateLead, 
    createLead, 
    convertLead, 
    openWhatsAppModal, 
    canViewSalary,
    employees
  } = useApp();

  const [search, setSearch] = useState('');
  const [isCreateLeadOpen, setIsCreateLeadOpen] = useState(false);

  // New Lead Form State
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCategory, setNewCategory] = useState('Wedding');
  const [newDate, setNewDate] = useState('');
  const [newBudget, setNewBudget] = useState('150000');
  const [newSource, setNewSource] = useState('Instagram');
  const [newNotes, setNewNotes] = useState('');

  // Convert Lead Modal State
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null);
  const [createEventOnConvert, setCreateEventOnConvert] = useState(true);

  const filteredLeads = leads.filter(l =>
    l.customerName.toLowerCase().includes(search.toLowerCase()) ||
    l.phone.includes(search) ||
    l.eventCategory.toLowerCase().includes(search.toLowerCase()) ||
    l.leadNumber.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) return;

    createLead({
      customerName: newName,
      phone: newPhone,
      email: newEmail.trim() || undefined,
      eventCategory: newCategory,
      expectedDate: newDate || undefined,
      estimatedBudget: Number(newBudget) || 0,
      source: newSource,
      notes: newNotes,
      status: 'New Inquiry'
    });

    setIsCreateLeadOpen(false);
    setNewName('');
    setNewPhone('');
    setNewEmail('');
    setNewNotes('');
  };

  const handleStatusChange = (leadId: string, newStatus: LeadStatus) => {
    updateLead(leadId, { status: newStatus });
  };

  const handleConfirmConvert = () => {
    if (!convertingLead) return;
    convertLead(convertingLead.id, {
      createEvent: createEventOnConvert,
      eventName: `${convertingLead.customerName} ${convertingLead.eventCategory}`
    });
    setConvertingLead(null);
  };

  return (
    <div className="space-y-4">
      {/* Top Filter & Create Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search leads by name, phone, event category..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-zinc-200 bg-white text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 min-h-[44px]"
          />
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setIsCreateLeadOpen(true)}
        >
          Add New Lead / Inquiry
        </Button>
      </div>

      {/* Kanban Pipeline Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 min-h-[500px]">
        {PIPELINE_COLUMNS.map(col => {
          const columnLeads = filteredLeads.filter(l => l.status === col.status);
          return (
            <div
              key={col.status}
              className="flex flex-col bg-zinc-50/70 border border-zinc-200 rounded-2xl p-3 space-y-3"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2 border-b border-zinc-200/80">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${col.color}`}>
                  {col.label}
                </span>
                <span className="text-xs font-mono font-bold text-zinc-500">
                  {columnLeads.length}
                </span>
              </div>

              {/* Cards Container */}
              <div className="space-y-2.5 flex-1 overflow-y-auto">
                {columnLeads.map(lead => (
                  <div
                    key={lead.id}
                    className="p-3 bg-white rounded-xl border border-zinc-200/90 shadow-xs space-y-2 hover:border-zinc-300 transition-all text-xs"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div>
                        <span className="font-bold text-zinc-900 block truncate max-w-[130px]">
                          {lead.customerName}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono">
                          {lead.leadNumber} • {lead.source}
                        </span>
                      </div>
                      <span className="text-[10px] bg-zinc-100 text-zinc-700 font-semibold px-1.5 py-0.5 rounded">
                        {lead.eventCategory}
                      </span>
                    </div>

                    <div className="text-[11px] text-zinc-600 space-y-0.5">
                      <p className="font-mono">{lead.phone}</p>
                      {lead.expectedDate && (
                        <p className="text-[10px] text-zinc-500">Exp: {formatDate(lead.expectedDate)}</p>
                      )}
                      {canViewSalary && lead.estimatedBudget && (
                        <p className="text-[10px] font-semibold text-emerald-700">
                          Est: {formatCurrency(lead.estimatedBudget)}
                        </p>
                      )}
                    </div>

                    {/* Actions on Lead */}
                    <div className="pt-2 border-t border-zinc-100 flex items-center justify-between gap-1">
                      <button
                        onClick={() => openWhatsAppModal({ lead, customer: null })}
                        className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors cursor-pointer"
                        title="WhatsApp Lead"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </button>

                      {lead.status !== 'Booked' && (
                        <button
                          onClick={() => setConvertingLead(lead)}
                          className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                          title="Convert to Client"
                        >
                          <UserPlus className="w-3 h-3" />
                          <span>Convert</span>
                        </button>
                      )}

                      {/* Stage Selector */}
                      <select
                        value={lead.status}
                        onChange={e => handleStatusChange(lead.id, e.target.value as LeadStatus)}
                        className="text-[10px] font-semibold bg-zinc-50 border border-zinc-200 rounded px-1.5 py-0.5 cursor-pointer"
                      >
                        {PIPELINE_COLUMNS.map(c => (
                          <option key={c.status} value={c.status}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}

                {columnLeads.length === 0 && (
                  <div className="text-center py-8 text-zinc-400 text-xs italic">
                    No leads
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE LEAD MODAL */}
      {isCreateLeadOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
              <h3 className="font-bold text-base text-zinc-900 font-display">Create New Inquiry / Lead</h3>
              <button onClick={() => setIsCreateLeadOpen(false)} className="text-zinc-400 hover:text-zinc-600">✕</button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">Client / Bride & Groom *</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="e.g. Rahul & Pooja"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">Mobile (WhatsApp) *</label>
                  <input
                    type="tel"
                    required
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    placeholder="+91 98201 12345"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 font-mono min-h-[44px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">Event Category</label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 min-h-[44px]"
                  >
                    <option value="Wedding">Wedding</option>
                    <option value="Pre-Wedding">Pre-Wedding</option>
                    <option value="Birthday">Birthday</option>
                    <option value="Corporate Event">Corporate Event</option>
                    <option value="Maternity">Maternity</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">Expected Date</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={e => setNewDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">Estimated Budget (₹)</label>
                  <input
                    type="number"
                    value={newBudget}
                    onChange={e => setNewBudget(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 min-h-[44px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">Lead Source</label>
                  <select
                    value={newSource}
                    onChange={e => setNewSource(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 min-h-[44px]"
                  >
                    <option value="Instagram">Instagram DM / Ad</option>
                    <option value="Referral">Word of Mouth / Referral</option>
                    <option value="Google">Google Search</option>
                    <option value="Walk-in">Studio Walk-in</option>
                    <option value="WedMeGood">WedMeGood / WeddingWire</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">Email</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    placeholder="Optional email"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-zinc-700 block mb-1">Initial Inquiry Remarks</label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  placeholder="Inquiry requirements, guest count, venue preferences..."
                  className="w-full p-2.5 rounded-xl border border-zinc-200"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateLeadOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Save Inquiry
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONVERT LEAD CONFIRMATION MODAL */}
      {convertingLead && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl space-y-4 text-xs">
            <h3 className="font-bold text-base text-zinc-900 font-display">
              Convert Lead into Customer
            </h3>
            <p className="text-zinc-600 leading-relaxed">
              Converting lead <strong>{convertingLead.leadNumber}</strong> ({convertingLead.customerName}).
              Studio OS will verify whether an existing customer record already exists to prevent duplicates.
            </p>

            <label className="flex items-center gap-2 p-3 bg-zinc-50 rounded-xl border border-zinc-200 cursor-pointer">
              <input
                type="checkbox"
                checked={createEventOnConvert}
                onChange={e => setCreateEventOnConvert(e.target.checked)}
                className="w-4 h-4 rounded text-zinc-900"
              />
              <span className="font-semibold text-zinc-800">
                Also create an Event record for {convertingLead.eventCategory}
              </span>
            </label>

            <div className="pt-2 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setConvertingLead(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleConfirmConvert}>
                Confirm Conversion
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
