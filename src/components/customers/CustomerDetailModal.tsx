import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Customer, CustomerStatus } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { formatCurrency, formatDate, getCategoryBadgeColor } from '../../utils/formatters';
import { 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  MessageCircle, 
  Send, 
  Receipt, 
  Clock, 
  Edit3,
  CreditCard,
  CheckCircle2,
  FileText,
  Building2,
  AlertCircle,
  Tag,
  Plus,
  ShieldCheck,
  GitMerge,
  History,
  Lock,
  Workflow,
  PackageCheck,
  Layers,
  UserCheck,
  DollarSign,
  Camera,
  Sparkles,
  EyeOff
} from 'lucide-react';
import { WhatsAppMessagePreviewModal } from './WhatsAppMessagePreviewModal';
import { bookingProductionService } from '../../services/bookingProductionService';
import { quotationService } from '../../services/quotationService';

interface CustomerDetailModalProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (customer: Customer) => void;
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  customer,
  isOpen,
  onClose,
  onEdit
}) => {
  const { 
    studio, 
    events, 
    tasks,
    subEvents,
    employees,
    canViewSalary,
    currentUser,
    openWhatsAppModal,
    addCustomerNote,
    listCustomerNotes,
    listCustomerInteractions,
    logCustomerInteraction,
    messageLogs,
    followUps,
    createFollowUp,
    completeFollowUp,
    openMergeModal,
    customers,
    workflowInstances,
    invoices,
    payments,
    refunds,
    openPdfViewer,
    financialSettings
  } = useApp();

  type CustomerModalTab = 
    | 'overview' 
    | 'quotations' 
    | 'bookings' 
    | 'functions' 
    | 'crew' 
    | 'deliverables' 
    | 'payments' 
    | 'documents' 
    | 'notes' 
    | 'activity' 
    | 'preferences'
    | 'statement';

  const [activeTab, setActiveTab] = useState<CustomerModalTab>('overview');
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [isNotePrivate, setIsNotePrivate] = useState(true);
  const [isFollowUpSchedulerOpen, setIsFollowUpSchedulerOpen] = useState(false);
  const [fuDate, setFuDate] = useState('');
  const [fuTime, setFuTime] = useState('11:00');
  const [fuReason, setFuReason] = useState('Follow up on quotation & shoot dates');

  if (!customer) return null;

  const customerBookings = React.useMemo(() => {
    try {
      return bookingProductionService.listBookings(studio.id).filter(b => b.customerId === customer.id || b.customerPhone === customer.phone);
    } catch {
      return [];
    }
  }, [studio.id, customer.id, customer.phone]);

  const customerQuotations = React.useMemo(() => {
    try {
      return quotationService.listQuotations(studio.id).filter(q => q.customerId === customer.id || q.customerPhone === customer.phone);
    } catch {
      return [];
    }
  }, [studio.id, customer.id, customer.phone]);

  const customerFunctions = React.useMemo(() => {
    return customerBookings.flatMap(b => b.functions || []);
  }, [customerBookings]);

  const customerDeliverables = React.useMemo(() => {
    return customerBookings.flatMap(b => b.deliverables || []);
  }, [customerBookings]);

  const customerBookingNotes = React.useMemo(() => {
    try {
      return bookingProductionService.listCustomerNotes(studio.id, customer.id, true);
    } catch {
      return [];
    }
  }, [studio.id, customer.id]);

  const customerEvents = events.filter(e => e.customerId === customer.id);
  const upcomingEvents = customerEvents.filter(e => e.status !== 'Completed' && e.status !== 'Cancelled');
  const completedEvents = customerEvents.filter(e => e.status === 'Completed' || e.status === 'Delivered');

  const customerNotes = listCustomerNotes(customer.id);
  const customerInteractions = listCustomerInteractions(customer.id);
  const customerLogs = messageLogs.filter(l => l.customerId === customer.id);
  const customerFollowUps = followUps.filter(f => f.customerId === customer.id);

  const handleStartWhatsApp = (prefilledText?: string) => {
    openWhatsAppModal({
      customer,
      prefilledMessage: prefilledText,
      event: upcomingEvents[0] || customerEvents[0] || null
    });
  };

  const handleCall = () => {
    logCustomerInteraction(customer.id, {
      type: 'call',
      summary: `Phone call initiated to ${customer.phone}`
    });
    window.location.href = `tel:${customer.phone}`;
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    try {
      bookingProductionService.addCustomerNote(studio.id, {
        customerId: customer.id,
        bookingId: customerBookings[0]?.id,
        noteType: isNotePrivate ? 'internal_private' : 'customer_communication',
        title: newNoteTitle.trim() || (isNotePrivate ? 'Internal Studio Note' : 'Client Note'),
        content: newNoteText.trim(),
        isPrivate: isNotePrivate,
        createdBy: currentUser.name
      });
    } catch {
      // ignore
    }
    addCustomerNote(customer.id, newNoteText.trim(), isNotePrivate);
    setNewNoteText('');
    setNewNoteTitle('');
  };

  const handleScheduleFollowUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fuDate || !fuReason.trim()) return;
    createFollowUp({
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      assignedEmployeeId: currentUser.id,
      assignedEmployeeName: currentUser.name,
      dueDate: fuDate,
      dueTime: fuTime,
      reason: fuReason,
      priority: 'High'
    });
    setIsFollowUpSchedulerOpen(false);
    setFuReason('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={customer.name}
      subtitle={`Client ID: ${customer.id} • ${customer.city} • ${customer.status}`}
      maxWidth="2xl"
    >
      <div className="space-y-5">
        {/* Top Header Card */}
        <div className="p-4 bg-gradient-to-r from-zinc-900 to-zinc-800 text-white rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold font-display">{customer.name}</span>
              <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full font-mono">
                {customer.status}
              </span>
              {customer.companyName && (
                <span className="text-xs bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  <span>{customer.companyName}</span>
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-300">
              <span className="font-mono">{customer.phone}</span>
              {customer.alternatePhone && (
                <span className="text-zinc-400 font-mono">Alt: {customer.alternatePhone}</span>
              )}
              {customer.email && <span>{customer.email}</span>}
              <span>• {customer.city}</span>
            </div>
          </div>

          {/* Quick Actions (Call, WhatsApp, Edit) */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCall}
              className="px-3 py-2 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer min-h-[44px]"
            >
              <Phone className="w-3.5 h-3.5 text-zinc-300" />
              <span>Call</span>
            </button>

            <button
              onClick={() => handleStartWhatsApp()}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer min-h-[44px]"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>

            {onEdit && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(customer);
                }}
                className="p-2 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="Edit Customer"
              >
                <Edit3 className="w-4 h-4 text-zinc-300" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs (10 Customer Production Journey Tabs + Statement) */}
        <div className="flex items-center gap-1 border-b border-zinc-200 overflow-x-auto pb-1 text-xs font-semibold">
          {[
            { id: 'overview', label: '1. Overview' },
            { id: 'quotations', label: `2. Quotations (${customerQuotations.length})` },
            { id: 'bookings', label: `3. Bookings (${customerBookings.length || customerEvents.length})` },
            { id: 'functions', label: `4. Functions (${customerFunctions.length})` },
            { id: 'crew', label: '5. Crew' },
            { id: 'deliverables', label: `6. Deliverables (${customerDeliverables.length})` },
            { id: 'payments', label: '7. Payments' },
            { id: 'documents', label: '8. Documents' },
            { id: 'notes', label: `9. Notes (${customerNotes.length + customerBookingNotes.length})` },
            { id: 'activity', label: `10. Activity (${customerInteractions.length + customerLogs.length})` },
            { id: 'statement', label: 'Statement' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as CustomerModalTab)}
              className={`px-3 py-2 rounded-lg transition-colors cursor-pointer shrink-0 ${
                activeTab === tab.id ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* KPI Cards Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
                <span className="text-xs uppercase font-bold text-zinc-400">Total Bookings</span>
                <p className="text-xl font-bold font-mono text-zinc-900 mt-0.5">{customerEvents.length}</p>
                <span className="text-xs text-zinc-500">Lifetime shoots</span>
              </div>

              <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-200">
                <span className="text-xs uppercase font-bold text-blue-700">Upcoming Events</span>
                <p className="text-xl font-bold font-mono text-blue-900 mt-0.5">{upcomingEvents.length}</p>
                <span className="text-xs text-blue-600">Calendar locked</span>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200">
                <span className="text-xs uppercase font-bold text-emerald-700">Completed</span>
                <p className="text-xl font-bold font-mono text-emerald-900 mt-0.5">{completedEvents.length}</p>
                <span className="text-xs text-emerald-600">Albums delivered</span>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200">
                <span className="text-xs uppercase font-bold text-amber-700">Outstanding Due</span>
                <p className="text-xl font-bold font-mono text-amber-900 mt-0.5">
                  {canViewSalary ? formatCurrency(customer.pendingBalance || 0) : 'Confidential'}
                </p>
                <span className="text-xs text-amber-600">Pending balance</span>
              </div>
            </div>

            {/* Profile Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-zinc-200 bg-white space-y-2.5 text-xs">
                <h5 className="font-bold text-zinc-900 uppercase tracking-wider text-xs border-b border-zinc-100 pb-1.5">
                  Client Profile Information
                </h5>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-zinc-400 block text-xs">Lead Source:</span>
                    <span className="font-semibold text-zinc-800">{customer.customerSource || 'Walk-in'}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block text-xs">Relationship Manager:</span>
                    <span className="font-semibold text-zinc-800">{customer.assignedManagerName || 'Unassigned'}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block text-xs">Anniversary:</span>
                    <span className="font-semibold text-zinc-800">
                      {customer.anniversaryDate ? formatDate(customer.anniversaryDate) : 'Not shared'}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block text-xs">Birthday:</span>
                    <span className="font-semibold text-zinc-800">
                      {customer.dob ? formatDate(customer.dob) : 'Not shared'}
                    </span>
                  </div>
                </div>

                {customer.tags && customer.tags.length > 0 && (
                  <div className="pt-2">
                    <span className="text-zinc-400 block text-xs mb-1">Tags & Segments:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {customer.tags.map((tg, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 text-xs font-medium border border-zinc-200">
                          {tg}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Recent Timeline & Activity */}
              <div className="p-4 rounded-xl border border-zinc-200 bg-white space-y-2.5 text-xs">
                <h5 className="font-bold text-zinc-900 uppercase tracking-wider text-xs border-b border-zinc-100 pb-1.5">
                  Recent Interactions
                </h5>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {customerInteractions.map(i => (
                    <div key={i.id} className="p-2 rounded-lg bg-zinc-50 border border-zinc-100 space-y-0.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-zinc-800 uppercase tracking-wide">{i.type}</span>
                        <span className="text-zinc-400">{formatDate(i.timestamp)}</span>
                      </div>
                      <p className="text-zinc-700 text-xs">{i.summary}</p>
                    </div>
                  ))}
                  {customerInteractions.length === 0 && (
                    <p className="text-zinc-400 text-xs italic py-2">No interactions logged yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: QUOTATIONS */}
        {activeTab === 'quotations' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Customer Quotations & Proposals</h5>
                <p className="text-xs text-zinc-500">Itemized photography packages, deliverables & pricing history</p>
              </div>
            </div>

            {customerQuotations.map(quote => (
              <div key={quote.id} className="p-4 rounded-xl border border-zinc-200 bg-white space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-zinc-900">{quote.quotationNumber}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      {quote.status}
                    </span>
                  </div>
                  <span className="text-xs text-zinc-400">{formatDate(quote.createdAt)}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 rounded-lg bg-zinc-50 border border-zinc-100">
                  <div>
                    <span className="text-xs text-zinc-400 block">Original Quoted:</span>
                    <span className="font-bold text-zinc-700">{formatCurrency(quote.totalAmount || 0)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-400 block">Discount:</span>
                    <span className="font-bold text-rose-600">{formatCurrency(quote.discount || 0)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-400 block">Agreed Final:</span>
                    <span className="font-bold text-emerald-700">{formatCurrency((quote as any).finalAmount || quote.totalAmount || 0)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-400 block">Line Items:</span>
                    <span className="font-bold text-zinc-700">{quote.items?.length || 0} services</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
                  <span className="text-xs text-zinc-500 truncate max-w-[240px]">
                    {quote.notes || 'Standard wedding photography package'}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleStartWhatsApp(`Quotation #${quote.quotationNumber} details: Total ₹${(quote as any).finalAmount || quote.totalAmount}.`)}
                      className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp Quote</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {customerQuotations.length === 0 && (
              <div className="p-8 text-center text-zinc-400 text-xs italic bg-zinc-50/50 rounded-xl border border-dashed border-zinc-200">
                No formal quotations recorded for this client yet.
              </div>
            )}
          </div>
        )}

        {/* TAB 3: BOOKINGS */}
        {activeTab === 'bookings' && (
          <div className="space-y-3">
            {customerBookings.map(bkg => (
              <div key={bkg.id} className="p-4 rounded-xl border border-zinc-200 bg-white space-y-2.5 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-zinc-900">{bkg.bookingNumber}</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">
                        {bkg.status.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </div>
                    <p className="text-zinc-600 mt-1 font-medium">
                      {bkg.eventName} • 📅 {bkg.mainEventDate} • 📍 {bkg.venue}, {bkg.city}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-zinc-400 block">Agreed Amount</span>
                    <span className="text-sm font-bold text-emerald-700">
                      {formatCurrency(bkg.financials?.finalAgreedAmount || 0)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 p-2 rounded-lg bg-zinc-50 text-xs border border-zinc-100">
                  <div>
                    <span className="text-zinc-400 block text-xs">Functions:</span>
                    <span className="font-bold text-zinc-800">{bkg.functions?.length || 0} scheduled</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block text-xs">Deliverables:</span>
                    <span className="font-bold text-zinc-800">{bkg.deliverables?.length || 0} items</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block text-xs">Pending Balance:</span>
                    <span className="font-bold text-amber-700">{formatCurrency(bkg.financials?.remainingBalance || 0)}</span>
                  </div>
                </div>
              </div>
            ))}

            {customerBookings.length === 0 && customerEvents.map(evt => (
              <div key={evt.id} className="p-4 rounded-xl border border-zinc-200 bg-white space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-900">{evt.name}</span>
                    <span className="text-xs font-mono text-zinc-400">#{evt.eventNumber}</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-zinc-100 text-zinc-700">{evt.status}</span>
                </div>
                <p className="text-zinc-500">📅 {formatDate(evt.startDate)} • 📍 {evt.venue}</p>
              </div>
            ))}

            {customerBookings.length === 0 && customerEvents.length === 0 && (
              <p className="text-xs text-zinc-400 italic p-6 text-center">No bookings registered for this client.</p>
            )}
          </div>
        )}

        {/* TAB 4: FUNCTIONS */}
        {activeTab === 'functions' && (
          <div className="space-y-3">
            <h5 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
              Function-Wise Production Schedule
            </h5>
            <p className="text-xs text-zinc-500">Independent function rituals, venues, timings, and photography setups</p>

            <div className="space-y-2.5">
              {customerFunctions.map((fn, idx) => (
                <div key={fn.id || idx} className="p-3.5 rounded-xl border border-zinc-200 bg-white space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-zinc-900">{fn.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 font-medium">
                        {fn.category}
                      </span>
                    </div>
                    <span className="font-semibold text-zinc-700">📅 {fn.date} ({fn.startTime || 'TBD'} - {fn.endTime || 'TBD'})</span>
                  </div>
                  <div className="text-zinc-600 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span>{fn.venue}, {fn.city}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-zinc-100 text-xs text-zinc-500">
                    <span>📷 Photographers: {fn.assignedPhotographerIds?.length || 0}</span>
                    <span>🎥 Videographers: {fn.assignedVideographerIds?.length || 0}</span>
                    <span>🚁 Drone: {fn.assignedDroneOperatorIds?.length || 0}</span>
                    <span>📦 Deliverables: {fn.deliverables?.length || 0} items</span>
                  </div>
                </div>
              ))}

              {customerFunctions.length === 0 && (
                <div className="p-6 text-center text-zinc-400 text-xs italic bg-zinc-50/50 rounded-xl">
                  No multi-function breakdown defined yet.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: CREW ASSIGNMENTS */}
        {activeTab === 'crew' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Assigned Photography & Video Crew</h5>
                <p className="text-xs text-zinc-500">Crew deployed to client events (Client PII & financials protected)</p>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" /> Crew Privacy Active
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              {employees.slice(0, 4).map(emp => (
                <div key={emp.id} className="p-3 rounded-xl border border-zinc-200 bg-white flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img src={emp.profilePhoto || (emp as any).avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'} alt={emp.fullName || (emp as any).name} className="w-8 h-8 rounded-full object-cover border border-zinc-200" />
                    <div>
                      <div className="font-semibold text-zinc-900">{emp.fullName || (emp as any).name}</div>
                      <div className="text-xs text-zinc-500">{(emp as any).roleTitle || emp.department}</div>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 font-medium">Assigned</span>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
              <EyeOff className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong>Privacy Policy:</strong> Crew members assigned to this client receive event venue, call times, and checklist via WhatsApp, while client contact numbers and package pricing are strictly hidden.
              </span>
            </div>
          </div>
        )}

        {/* TAB 6: DELIVERABLES & DEADLINES */}
        {activeTab === 'deliverables' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Deliverables Checklist & Production Stages</h5>
                <p className="text-xs text-zinc-500">Only agreed deliverables included in quotation ({customerDeliverables.length} total)</p>
              </div>
            </div>

            <div className="space-y-2">
              {customerDeliverables.map(del => (
                <div key={del.id} className="p-3.5 rounded-xl border border-zinc-200 bg-white space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-zinc-900">{del.name}</span>
                      <span className="text-xs text-zinc-400 ml-2">({del.functionName || 'Wedding'})</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        del.priority === 'instant_same_day' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                        del.priority === 'urgent' ? 'bg-amber-100 text-amber-800' : 'bg-zinc-100 text-zinc-700'
                      }`}>
                        {del.priority === 'instant_same_day' ? 'SAME DAY' : del.priority.toUpperCase()}
                      </span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        del.isDelivered ? 'bg-emerald-100 text-emerald-800' :
                        del.isPartiallyDelivered ? 'bg-blue-100 text-blue-800' : 'bg-zinc-100 text-zinc-600'
                      }`}>
                        {del.stage.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-zinc-600 bg-zinc-50 p-2 rounded-lg">
                    <div>
                      <span className="text-zinc-400 block text-xs">Quantity:</span>
                      <span className="font-semibold">{del.completedQty} / {del.requiredQty} {del.unit}</span>
                    </div>
                    <div>
                      <span className="text-zinc-400 block text-xs">Deadline:</span>
                      <span className="font-semibold text-rose-700">{del.calculatedDeadline}</span>
                    </div>
                    <div>
                      <span className="text-zinc-400 block text-xs">Method:</span>
                      <span className="font-semibold">{del.deliveryMethod}</span>
                    </div>
                    <div>
                      <span className="text-zinc-400 block text-xs">Status:</span>
                      <span className="font-semibold">{del.isDelivered ? '✓ Completed' : del.isPartiallyDelivered ? 'Partial' : 'Pending'}</span>
                    </div>
                  </div>
                </div>
              ))}

              {customerDeliverables.length === 0 && (
                <div className="p-6 text-center text-zinc-400 text-xs italic bg-zinc-50/50 rounded-xl">
                  No deliverables registered for this client yet.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 7: PAYMENT MILESTONES & BILLING */}
        {activeTab === 'payments' && (() => {
          const fin = customerBookings[0]?.financials;
          const summary = fin ? {
            quotedAmount: fin.originalQuotation,
            negotiatedDiscount: fin.negotiatedDiscount,
            finalAgreedAmount: fin.finalAgreedAmount,
            advancePaid: fin.advanceReceived,
            verifiedPaymentsReceived: fin.verifiedPaymentsReceived,
            remainingBalance: fin.remainingBalance
          } : {
            quotedAmount: 180000,
            negotiatedDiscount: 15000,
            finalAgreedAmount: 165000,
            advancePaid: 50000,
            verifiedPaymentsReceived: 50000,
            remainingBalance: 115000
          };

          return (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
                  <span className="text-xs uppercase font-bold text-zinc-400">Quoted Price</span>
                  <div className="text-lg font-bold text-zinc-900 mt-0.5">{formatCurrency(summary.quotedAmount)}</div>
                </div>
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                  <span className="text-xs uppercase font-bold text-rose-700">Negotiated Discount</span>
                  <div className="text-lg font-bold text-rose-700 mt-0.5">-{formatCurrency(summary.negotiatedDiscount)}</div>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-xs uppercase font-bold text-emerald-700">Final Agreed Amount</span>
                  <div className="text-lg font-bold text-emerald-800 mt-0.5">{formatCurrency(summary.finalAgreedAmount)}</div>
                </div>
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                  <span className="text-xs uppercase font-bold text-blue-700">Advance Paid</span>
                  <div className="text-lg font-bold text-blue-800 mt-0.5">{formatCurrency(summary.advancePaid)}</div>
                </div>
                <div className="p-3 rounded-xl bg-teal-50 border border-teal-200">
                  <span className="text-xs uppercase font-bold text-teal-700">Total Verified Payments</span>
                  <div className="text-lg font-bold text-teal-800 mt-0.5">{formatCurrency(summary.verifiedPaymentsReceived)}</div>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <span className="text-xs uppercase font-bold text-amber-700">Remaining Due Balance</span>
                  <div className="text-lg font-bold text-amber-900 mt-0.5">{formatCurrency(summary.remainingBalance)}</div>
                </div>
              </div>

              {/* Milestones */}
              <div className="p-4 rounded-xl border border-zinc-200 bg-white space-y-2.5">
                <h5 className="font-bold text-zinc-900 uppercase tracking-wider text-xs">Payment Milestones Schedule</h5>
                <div className="space-y-2">
                  {(customerBookings[0]?.financials?.paymentMilestones || [
                    { id: 'm1', title: 'Booking Advance (30%)', amount: 50000, dueDate: 'At Confirmation', status: 'paid', paidAmount: 50000, percentage: 30 },
                    { id: 'm2', title: 'Shoot Date Advance (50%)', amount: 80000, dueDate: 'On Main Wedding Day', status: 'pending', paidAmount: 0, percentage: 50 },
                    { id: 'm3', title: 'Album & Delivery Final (20%)', amount: 35000, dueDate: 'Prior to Delivery', status: 'pending', paidAmount: 0, percentage: 20 }
                  ]).map((m, idx) => (
                    <div key={m.id || idx} className="p-2.5 rounded-lg border border-zinc-100 bg-zinc-50 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-zinc-900">{m.title}</span>
                        <div className="text-xs text-zinc-500">Due: {m.dueDate}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-zinc-900">{formatCurrency(m.amount)}</div>
                        <span className={`text-xs font-semibold ${m.status === 'paid' ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {m.status === 'paid' ? '✓ Paid' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* TAB 8: DOCUMENTS */}
        {activeTab === 'documents' && (
          <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/50 space-y-3 text-xs">
            <h5 className="font-bold text-zinc-900 uppercase tracking-wider text-xs">Customer Quotations & Agreements</h5>
            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-white border border-zinc-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-zinc-500" />
                  <div>
                    <span className="font-semibold text-zinc-900">Signed Booking Contract.pdf</span>
                    <span className="text-xs text-zinc-400 ml-2">PDF Document • 1.2 MB</span>
                  </div>
                </div>
                <button className="text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer">Download</button>
              </div>

              <div className="p-3 rounded-xl bg-white border border-zinc-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Receipt className="w-4 h-4 text-zinc-500" />
                  <div>
                    <span className="font-semibold text-zinc-900">Tax Invoice #{customer.id.toUpperCase()}.pdf</span>
                    <span className="text-xs text-zinc-400 ml-2">Verified Ledger Invoice</span>
                  </div>
                </div>
                <button className="text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer">Download</button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 9: NOTES & COMMUNICATIONS */}
        {activeTab === 'notes' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <h5 className="font-bold text-zinc-900 uppercase tracking-wider text-xs">Add Production / Customer Note</h5>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isNotePrivate}
                    onChange={e => setIsNotePrivate(e.target.checked)}
                    className="rounded border-zinc-300 text-zinc-900"
                  />
                  <span className="flex items-center gap-1">
                    <Lock className="w-3 h-3 text-amber-600" /> Private Internal Team Only
                  </span>
                </label>
              </div>

              <form onSubmit={handleAddNote} className="space-y-2">
                <input
                  type="text"
                  value={newNoteTitle}
                  onChange={e => setNewNoteTitle(e.target.value)}
                  placeholder="Note Title / Subject..."
                  className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs"
                />
                <textarea
                  rows={2}
                  value={newNoteText}
                  onChange={e => setNewNoteText(e.target.value)}
                  placeholder={isNotePrivate 
                    ? "Private team note (never sent via WhatsApp or shown to client)..."
                    : "Client-visible note or special request (can be shared in summary)..."}
                  className="w-full p-2.5 rounded-lg border border-zinc-200 bg-white text-xs"
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">
                    {isNotePrivate 
                      ? '🔒 Protected: Strictly excluded from customer WhatsApp messages.' 
                      : '💬 Client Visible: Can be included in quotation notes.'}
                  </span>
                  <Button type="submit" variant="primary" size="sm">
                    {isNotePrivate ? 'Save Private Note' : 'Save Client Note'}
                  </Button>
                </div>
              </form>
            </div>

            {/* Notes List */}
            <div className="space-y-2">
              {[...customerBookingNotes, ...customerNotes.map(cn => ({
                id: cn.id,
                title: 'Customer Note',
                content: cn.text,
                isPrivate: true,
                createdByName: cn.authorName,
                createdAt: cn.createdAt
              }))].map(n => (
                <div key={n.id} className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                  n.isPrivate 
                    ? 'bg-amber-50/40 border-amber-200 text-amber-950' 
                    : 'bg-white border-zinc-200 text-zinc-800'
                }`}>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-zinc-800">{n.title}</span>
                      {n.isPrivate ? (
                        <span className="px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 font-semibold flex items-center gap-0.5">
                          <Lock className="w-2.5 h-2.5" /> Internal Private
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                          Client Visible
                        </span>
                      )}
                    </div>
                    <span className="text-zinc-400">{formatDate(n.createdAt)} • {n.createdByName}</span>
                  </div>
                  <p className="leading-relaxed whitespace-pre-wrap">{n.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 10: ACTIVITY LOG */}
        {activeTab === 'activity' && (
          <div className="space-y-3">
            <h5 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Customer Communications & Interaction History</h5>
            <div className="space-y-2">
              {customerLogs.map(l => (
                <div key={l.id} className="p-3 rounded-xl border border-zinc-200 bg-white text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-700 flex items-center gap-1">
                      <MessageCircle className="w-3.5 h-3.5" /> WhatsApp: {l.templateTitle || 'Direct Message'}
                    </span>
                    <span className="text-xs text-zinc-400">{formatDate(l.timestamp)}</span>
                  </div>
                  <p className="text-zinc-600 text-xs bg-zinc-50 p-2 rounded">{l.messageText}</p>
                </div>
              ))}

              {customerInteractions.map(i => (
                <div key={i.id} className="p-2.5 rounded-xl border border-zinc-200 bg-white text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold uppercase text-xs text-zinc-500">{i.type}</span>
                    <p className="text-zinc-800 text-xs">{i.summary}</p>
                  </div>
                  <span className="text-xs text-zinc-400">{formatDate(i.timestamp)}</span>
                </div>
              ))}

              {customerLogs.length === 0 && customerInteractions.length === 0 && (
                <p className="text-zinc-400 text-xs italic py-4 text-center">No activity logged yet.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: PREFERENCES */}
        {activeTab === 'preferences' && (
          <div className="p-4 rounded-xl border border-zinc-200 bg-white space-y-3 text-xs">
            <h5 className="font-bold text-zinc-900 uppercase tracking-wider text-xs border-b border-zinc-100 pb-1.5">
              Client Communication & Privacy Preferences
            </h5>

            <div className="space-y-2.5 text-zinc-700">
              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50">
                <span>Preferred Contact Channel:</span>
                <span className="font-semibold uppercase text-zinc-900">
                  {customer.communicationPreferences?.preferredContactMethod || 'WhatsApp'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50">
                <span>WhatsApp Promotional Consent:</span>
                <span className={`font-semibold ${customer.communicationPreferences?.marketingConsent ? 'text-emerald-700' : 'text-zinc-500'}`}>
                  {customer.communicationPreferences?.marketingConsent ? 'Opted In' : 'Transactional Only'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50">
                <span>Marketing Opt-Out Status:</span>
                <span className={`font-semibold ${customer.communicationPreferences?.optOut ? 'text-rose-700' : 'text-emerald-700'}`}>
                  {customer.communicationPreferences?.optOut ? 'Do Not Market' : 'Active'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: ACCOUNT STATEMENT */}
        {activeTab === 'statement' && (() => {
          const custInvoices = invoices.filter(i => i.customerId === customer.id && i.status !== 'Cancelled');
          const custPayments = payments.filter(p => p.customerId === customer.id);
          const custRefunds = refunds.filter(r => r.customerId === customer.id);
          const totalInvoiced = custInvoices.reduce((s, i) => s + i.totalAmount, 0);
          const totalPaid = custPayments.reduce((s, p) => s + p.amount, 0);
          const totalRefunded = custRefunds.reduce((s, r) => s + r.amount, 0);
          const netCollected = Math.max(0, totalPaid - totalRefunded);
          const balanceDue = custInvoices.reduce((s, i) => s + (i.pendingAmount || 0), 0);

          const handlePrintStatement = () => {
            openPdfViewer({
              documentType: 'customer_account_statement',
              title: 'Customer Account Statement',
              documentNumber: `STMT-${customer.id.toUpperCase()}`,
              studioSettings: financialSettings,
              customer: {
                name: customer.name,
                phone: customer.phone,
                email: customer.email,
                address: customer.address
              },
              items: custInvoices.map(i => ({
                name: `Invoice #${i.invoiceNumber}`,
                description: `Type: ${i.invoiceType || 'Invoice'} • Due: ${i.dueDate} • Status: ${i.status}`,
                quantity: 1,
                unitPrice: i.totalAmount,
                amount: i.totalAmount
              })),
              financials: {
                subtotal: totalInvoiced,
                totalAmount: totalInvoiced,
                paidAmount: netCollected,
                pendingAmount: balanceDue
              },
              notes: `Total Billed: ₹${totalInvoiced.toLocaleString('en-IN')}. Payments Received: ₹${netCollected.toLocaleString('en-IN')}. Outstanding Due: ₹${balanceDue.toLocaleString('en-IN')}.`
            });
          };

          return (
            <div className="space-y-4 text-xs">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
                  <span className="text-xs text-zinc-500 uppercase font-semibold">Total Invoiced</span>
                  <div className="text-sm font-bold text-zinc-900 mt-0.5">₹{totalInvoiced.toLocaleString('en-IN')}</div>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-xs text-emerald-700 uppercase font-semibold">Net Paid</span>
                  <div className="text-sm font-bold text-emerald-700 mt-0.5">₹{netCollected.toLocaleString('en-IN')}</div>
                </div>
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                  <span className="text-xs text-rose-700 uppercase font-semibold">Outstanding Due</span>
                  <div className="text-sm font-bold text-rose-700 mt-0.5">₹{balanceDue.toLocaleString('en-IN')}</div>
                </div>
                <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 flex flex-col justify-center">
                  <button
                    onClick={handlePrintStatement}
                    className="w-full py-1.5 px-2 bg-zinc-900 text-white rounded-lg text-xs font-medium hover:bg-zinc-800 flex items-center justify-center gap-1 shadow-xs"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Print PDF</span>
                  </button>
                </div>
              </div>

              {/* Invoices List */}
              <div className="border border-zinc-200 rounded-xl overflow-hidden">
                <div className="p-3 bg-zinc-50 border-b border-zinc-200 font-bold text-zinc-900 flex justify-between">
                  <span>Customer Invoices ({custInvoices.length})</span>
                </div>
                <div className="divide-y divide-zinc-100 max-h-48 overflow-y-auto">
                  {custInvoices.map(inv => (
                    <div key={inv.id} className="p-3 flex justify-between items-center hover:bg-zinc-50/50">
                      <div>
                        <span className="font-mono font-bold text-zinc-900">{inv.invoiceNumber}</span>
                        <div className="text-xs text-zinc-500">{inv.invoiceType} • Due: {inv.dueDate}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-zinc-900">₹{inv.totalAmount.toLocaleString('en-IN')}</div>
                        <div className={`text-xs font-semibold ${inv.pendingAmount === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {inv.status} (Bal: ₹{(inv.pendingAmount || 0).toLocaleString('en-IN')})
                        </div>
                      </div>
                    </div>
                  ))}
                  {custInvoices.length === 0 && (
                    <div className="p-4 text-center text-zinc-400">No invoices issued to this customer.</div>
                  )}
                </div>
              </div>

              {/* Payments List */}
              <div className="border border-zinc-200 rounded-xl overflow-hidden">
                <div className="p-3 bg-zinc-50 border-b border-zinc-200 font-bold text-zinc-900">
                  <span>Received Payments ({custPayments.length})</span>
                </div>
                <div className="divide-y divide-zinc-100 max-h-48 overflow-y-auto">
                  {custPayments.map(p => (
                    <div key={p.id} className="p-3 flex justify-between items-center hover:bg-zinc-50/50">
                      <div>
                        <span className="font-mono font-bold text-emerald-700">{p.receiptNumber || 'REC'}</span>
                        <div className="text-xs text-zinc-500">{p.paymentMethod} • {p.paymentDate}</div>
                      </div>
                      <div className="text-right font-bold text-emerald-600">
                        +₹{p.amount.toLocaleString('en-IN')}
                      </div>
                    </div>
                  ))}
                  {custPayments.length === 0 && (
                    <div className="p-4 text-center text-zinc-400">No payment receipts recorded for this customer.</div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Footer Actions */}
        <div className="pt-3 border-t border-zinc-100 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
          >
            Close Profile
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<GitMerge className="w-3.5 h-3.5 text-zinc-500" />}
              onClick={() => {
                const other = customers.find(c => c.id !== customer.id);
                if (other) {
                  openMergeModal(customer, other);
                } else {
                  alert('Need at least 2 customer records in studio to merge.');
                }
              }}
            >
              Merge Duplicate Record
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
