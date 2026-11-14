import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useStudio } from '../../context/StudioContext';
import { StudioEvent, EventStatus, PaymentMethod } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { formatDate, formatTime, formatCurrency, getCategoryBadgeColor, getStatusBadgeColor, getPriorityBadgeColor } from '../../utils/formatters';
import { paymentService } from '../../services/paymentService';
import { pdfGeneratorService } from '../../services/pdfGeneratorService';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Phone, 
  MessageCircle, 
  UserCheck, 
  CheckCircle2, 
  Edit3, 
  Trash2, 
  FileText,
  CreditCard,
  Send,
  Workflow,
  Plus,
  Receipt,
  Download,
  AlertTriangle,
  Check,
  Truck,
  RotateCcw
} from 'lucide-react';
import { openWhatsAppChat, generateWhatsAppMessage, WhatsAppActionType } from '../../utils/whatsapp';

interface EventDetailModalProps {
  event: StudioEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (event: StudioEvent) => void;
}

const DEFAULT_9_DELIVERABLE_MILESTONES = [
  'RAW photo backup verified',
  'Selection gallery sent to customer',
  'Customer selection received',
  'Edited photos ready',
  'Video teaser delivered',
  'Long film delivered',
  'Album design approved by customer',
  'Album sent to print',
  'Album delivered to customer'
];

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  event,
  isOpen,
  onClose,
  onEdit
}) => {
  const { 
    studio, 
    users, 
    updateEventStatus, 
    updateEvent,
    deleteEvent, 
    tasks, 
    workflowInstances, 
    workflowTemplates,
    subEvents,
    openPdfViewer,
    setActiveTab
  } = useApp();

  const { currentStudio } = useStudio();
  const studioId = currentStudio.id;

  // Add Payment Modal State
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<PaymentMethod>('UPI');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Refund Modal State
  const [isRefundOpen, setIsRefundOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundReason, setRefundReason] = useState('');

  // Deliverables Checklist State (stored in event.deliverables or local toggle)
  const [confirmedMilestones, setConfirmedMilestones] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    if (event?.deliverables) {
      event.deliverables.forEach(d => {
        initial[d] = true;
      });
    }
    return initial;
  });

  if (!event) return null;

  const assignedUsers = users.filter(u => event.assignedTeamIds.includes(u.id));
  const eventSubEvents = subEvents.filter(s => s.parentEventId === event.id);
  const eventTasks = tasks.filter(t => t.eventId === event.id);
  const attachedWorkflow = (workflowInstances || []).find(w => w.entityId === event.id && w.entityType === 'main_event');
  const attachedTemplate = attachedWorkflow ? (workflowTemplates || []).find(t => t.id === attachedWorkflow.templateId) : null;

  // Payment calculations
  const eventPayments = paymentService.listPayments(studioId, { eventId: event.id });
  const totalReceived = eventPayments.reduce((sum, p) => sum + p.amount, 0) || (event.advancePaid || 0);
  const totalBudget = event.estimatedBudget || 0;
  const pendingAmount = Math.max(0, totalBudget - totalReceived);
  const isOverdue = event.endDate && new Date(event.endDate) < new Date() && pendingAmount > 0;

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateEventStatus(event.id, e.target.value as EventStatus);
  };

  const handleToggleMilestone = (milestone: string) => {
    const nextState = !confirmedMilestones[milestone];
    const updated = { ...confirmedMilestones, [milestone]: nextState };
    setConfirmedMilestones(updated);

    const activeList = Object.keys(updated).filter(k => updated[k]);
    updateEvent(event.id, {
      deliverables: activeList
    });
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentAmount <= 0) return;

    try {
      paymentService.recordEventPayment(studioId, {
        eventId: event.id,
        amount: paymentAmount,
        paymentMethod: paymentMode,
        transactionReference: paymentRef,
        notes: paymentNotes,
        operatorName: 'Studio Owner'
      });

      // Update event advancePaid
      updateEvent(event.id, {
        advancePaid: totalReceived + paymentAmount
      });

      setIsAddPaymentOpen(false);
      setPaymentAmount(0);
      setPaymentRef('');
      setPaymentNotes('');
      alert('Payment recorded successfully!');
    } catch (err: any) {
      alert(`Failed to record payment: ${err.message || 'Unknown error'}`);
    }
  };

  const handleConfirmFullPayment = () => {
    if (pendingAmount <= 0) return;
    if (window.confirm(`Confirm receipt of remaining ₹${pendingAmount.toLocaleString('en-IN')}?`)) {
      paymentService.recordEventPayment(studioId, {
        eventId: event.id,
        amount: pendingAmount,
        paymentMethod: 'UPI',
        transactionReference: `FULL_PAYMENT_${Date.now()}`,
        notes: 'Final balance settled in full',
        operatorName: 'Studio Owner'
      });

      updateEvent(event.id, {
        advancePaid: totalBudget
      });
      alert('Payment settled in full!');
    }
  };

  const handleViewReceipt = (receiptNumber: string) => {
    const payment = eventPayments.find(p => p.receiptNumber === receiptNumber);
    if (payment) {
      const payload = pdfGeneratorService.createPaymentReceiptPayload(payment);
      openPdfViewer(payload);
    }
  };

  const handleSendWhatsApp = (action: WhatsAppActionType) => {
    const msg = generateWhatsAppMessage(action, {
      customerName: event.customerName,
      studioName: studio.name,
      eventName: event.name,
      eventDate: `${formatDate(event.startDate)} (${formatTime(event.startTime)})`,
      venue: `${event.venue}, ${event.venueCity}`,
      invoiceAmount: totalBudget,
      pendingAmount: pendingAmount,
      invoiceLink: `https://studio-os.preview/inv/${event.eventNumber.toLowerCase()}`
    });
    openWhatsAppChat(event.customerPhone, msg);
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete event "${event.name}"?`)) {
      deleteEvent(event.id);
      onClose();
    }
  };

  const allStatuses: EventStatus[] = [
    'Draft',
    'Confirmed',
    'Shooting',
    'Post-Production',
    'Under Review',
    'Delivered',
    'Completed',
    'Cancelled'
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={event.name}
      subtitle={`${event.category} • ${event.eventNumber}`}
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* Top Badges & Status Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200/80">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${getCategoryBadgeColor(event.category)}`}>
              {event.category}
            </span>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getPriorityBadgeColor(event.priority)}`}>
              {event.priority} Priority
            </span>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-zinc-500">Event Status:</label>
            <select
              value={event.status}
              onChange={handleStatusChange}
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl border ${getStatusBadgeColor(event.status)} cursor-pointer focus:outline-none`}
            >
              {allStatuses.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Schedule & Venue Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl border border-zinc-200/80 bg-white space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              <Calendar className="w-3.5 h-3.5 text-zinc-500" /> Shoot Schedule
            </div>
            <div className="text-sm font-semibold text-zinc-900">
              {formatDate(event.startDate)}
              {event.endDate && event.endDate !== event.startDate && ` to ${formatDate(event.endDate)}`}
            </div>
            <div className="text-xs text-zinc-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              <span>{formatTime(event.startTime)} – {formatTime(event.endTime)}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-zinc-200/80 bg-white space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              <MapPin className="w-3.5 h-3.5 text-zinc-500" /> Location & Venue
            </div>
            <div className="text-sm font-semibold text-zinc-900 truncate">
              {event.venue}
            </div>
            <div className="text-xs text-zinc-500">
              {event.venueCity}
            </div>
          </div>
        </div>

        {/* Customer & WhatsApp Click-to-Chat Section */}
        <div className="p-4 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Client Details</span>
              <h4 className="text-sm font-bold text-zinc-900 mt-0.5">{event.customerName}</h4>
              <p className="text-xs text-zinc-500">{event.customerPhone}</p>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`tel:${event.customerPhone}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 bg-white text-zinc-800 text-xs font-medium hover:bg-zinc-100 transition-colors shadow-xs"
              >
                <Phone className="w-3.5 h-3.5 text-zinc-600" />
                <span>Call</span>
              </a>

              <button
                onClick={() => handleSendWhatsApp('chat_direct')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>
            </div>
          </div>

          {/* Quick WhatsApp Notification Dispatcher */}
          <div className="pt-3 border-t border-zinc-200/60">
            <div className="text-xs font-medium text-zinc-700 mb-2 flex items-center justify-between">
              <span>Send WhatsApp Notification:</span>
              <span className="text-[10px] text-zinc-400 font-normal">Prefilled instant chat</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleSendWhatsApp('event_reminder')}
                className="text-xs px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 text-emerald-800 font-medium hover:bg-emerald-100 transition-colors cursor-pointer flex items-center gap-1"
              >
                <Send className="w-3 h-3 text-emerald-600" />
                Event Reminder
              </button>
              <button
                onClick={() => handleSendWhatsApp('booking_reminder')}
                className="text-xs px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 text-emerald-800 font-medium hover:bg-emerald-100 transition-colors cursor-pointer flex items-center gap-1"
              >
                <Send className="w-3 h-3 text-emerald-600" />
                Booking Confirmation
              </button>
              <button
                onClick={() => handleSendWhatsApp('payment_reminder')}
                className="text-xs px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 text-emerald-800 font-medium hover:bg-emerald-100 transition-colors cursor-pointer flex items-center gap-1"
              >
                <Send className="w-3 h-3 text-emerald-600" />
                Payment Reminder
              </button>
            </div>
          </div>
        </div>

        {/* DEDICATED PAYMENT & BILLING SECTION */}
        <div className="p-4 rounded-2xl border border-zinc-200 bg-white space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900">
                Payment & Financial Management
              </h4>
            </div>

            <div className="flex items-center gap-2">
              {pendingAmount > 0 && (
                <button
                  type="button"
                  onClick={handleConfirmFullPayment}
                  className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                >
                  Confirm Balance Settled
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsAddPaymentOpen(true)}
                className="flex items-center gap-1 px-3 py-1 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Payment
              </button>
            </div>
          </div>

          {/* Overdue Warning */}
          {isOverdue && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Overdue Payment Warning: Event completed with ₹{pendingAmount.toLocaleString('en-IN')} outstanding.</span>
            </div>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
              <div className="text-[10px] text-zinc-400 uppercase font-semibold">Total Booking</div>
              <div className="text-sm font-bold text-zinc-900 mt-0.5">{formatCurrency(totalBudget)}</div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
              <div className="text-[10px] text-emerald-600 uppercase font-semibold">Received to Date</div>
              <div className="text-sm font-bold text-emerald-700 mt-0.5">{formatCurrency(totalReceived)}</div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
              <div className="text-[10px] text-zinc-400 uppercase font-semibold">Remaining Balance</div>
              <div className={`text-sm font-bold mt-0.5 ${pendingAmount > 0 ? 'text-amber-600' : 'text-zinc-600'}`}>
                {formatCurrency(pendingAmount)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
              <div className="text-[10px] text-zinc-400 uppercase font-semibold">Final Due Date</div>
              <div className="text-xs font-bold text-zinc-800 mt-1">
                {event.endDate ? formatDate(event.endDate) : formatDate(event.startDate)}
              </div>
            </div>
          </div>

          {/* Payment History Table */}
          {eventPayments.length > 0 && (
            <div className="pt-2">
              <div className="text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-2">
                Recorded Payments ({eventPayments.length})
              </div>
              <div className="border border-zinc-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 text-zinc-500 border-b border-zinc-200">
                    <tr>
                      <th className="px-3 py-2">Receipt</th>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Method</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                      <th className="px-3 py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {eventPayments.map(p => (
                      <tr key={p.id} className="hover:bg-zinc-50/50">
                        <td className="px-3 py-2 font-mono font-bold text-zinc-900">{p.receiptNumber}</td>
                        <td className="px-3 py-2 text-zinc-600">{p.paymentDate}</td>
                        <td className="px-3 py-2 text-zinc-600">{p.paymentMethod}</td>
                        <td className="px-3 py-2 text-right font-bold text-emerald-700">{formatCurrency(p.amount)}</td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => handleViewReceipt(p.receiptNumber)}
                            className="px-2 py-0.5 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 rounded"
                          >
                            Receipt PDF
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* DELIVERABLES CHECKLIST (9-POINT MILESTONES) */}
        <div className="p-4 rounded-2xl border border-zinc-200 bg-white space-y-3 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Deliverables & Production Milestones Checklist
            </h4>
            <span className="text-[11px] text-zinc-400">One-click stage confirmation</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {DEFAULT_9_DELIVERABLE_MILESTONES.map((milestone, idx) => {
              const isDone = !!confirmedMilestones[milestone];
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleToggleMilestone(milestone)}
                  className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                    isDone
                      ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900 shadow-2xs'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-md mt-0.5 shrink-0 flex items-center justify-center border ${
                    isDone ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-zinc-300 bg-white'
                  }`}>
                    {isDone && <Check className="w-3 h-3" />}
                  </div>
                  <div>
                    <div className="text-xs font-semibold leading-tight">{milestone}</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">
                      {isDone ? 'Confirmed' : 'Pending action'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sub-Events List */}
        {eventSubEvents.length > 0 && (
          <div className="p-4 rounded-2xl border border-zinc-200 bg-white space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-zinc-500" />
              Sub-Events & Ceremonies ({eventSubEvents.length})
            </h4>

            <div className="space-y-2">
              {eventSubEvents.map(se => (
                <div key={se.id} className="p-3 rounded-xl border border-zinc-200 bg-zinc-50/60 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-zinc-900">{se.name}</div>
                    <div className="text-zinc-500 text-[11px]">
                      {se.date} • {se.startTime} - {se.endTime} • {se.venue}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-200 text-zinc-700">
                    {se.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Assigned Crew */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-zinc-500" /> Assigned Crew ({assignedUsers.length})
            </h5>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {assignedUsers.map(user => (
              <div key={user.id} className="p-2.5 rounded-xl border border-zinc-200 bg-white flex items-center gap-3">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-9 h-9 rounded-full object-cover border border-zinc-200"
                />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-zinc-900 truncate">{user.name}</div>
                  <div className="text-[11px] text-zinc-500 truncate">{user.roleTitle}</div>
                </div>
              </div>
            ))}
            {assignedUsers.length === 0 && (
              <p className="text-xs text-zinc-400 italic">No crew assigned to this event yet.</p>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-zinc-100 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            size="sm"
            icon={<Trash2 className="w-4 h-4 text-rose-600" />}
            onClick={handleDelete}
            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
          >
            Delete Event
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
            >
              Close
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<Edit3 className="w-4 h-4" />}
              onClick={() => {
                onClose();
                onEdit(event);
              }}
            >
              Edit Event
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Calendar className="w-4 h-4 text-emerald-400" />}
              onClick={() => {
                onClose();
                setActiveTab('bookings');
                window.location.hash = `#/app/bookings/${event.id}`;
              }}
            >
              Open Workspace
            </Button>
          </div>
        </div>
      </div>

      {/* Add Payment Modal Dialog */}
      {isAddPaymentOpen && (
        <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200">
            <h3 className="text-base font-bold text-zinc-900 mb-1">
              Record Payment: {event.name}
            </h3>
            <p className="text-xs text-zinc-500 mb-4">
              Enter received payment amount and reference. A PDF receipt will be automatically generated.
            </p>

            <form onSubmit={handleRecordPayment} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-zinc-700 block mb-1">Payment Amount (₹) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={paymentAmount || ''}
                  onChange={e => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  placeholder={`Pending: ₹${pendingAmount.toLocaleString('en-IN')}`}
                  className="w-full p-2.5 border border-zinc-200 rounded-xl font-bold text-sm"
                />
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1">Payment Method *</label>
                <select
                  value={paymentMode}
                  onChange={e => setPaymentMode(e.target.value as PaymentMethod)}
                  className="w-full p-2.5 border border-zinc-200 rounded-xl bg-white"
                >
                  <option value="UPI">UPI / QR Code</option>
                  <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1">Transaction Reference</label>
                <input
                  type="text"
                  value={paymentRef}
                  onChange={e => setPaymentRef(e.target.value)}
                  placeholder="e.g. UPI/2026/091283"
                  className="w-full p-2.5 border border-zinc-200 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1">Internal Notes</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={e => setPaymentNotes(e.target.value)}
                  placeholder="e.g., Received advance on booking"
                  className="w-full p-2.5 border border-zinc-200 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddPaymentOpen(false)}
                  className="px-3 py-1.5 font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Modal>
  );
};