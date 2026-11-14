import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useStudio } from '../context/StudioContext';
import { EventStatus, EventAttachment, EventAssignment } from '../types';
import { formatDate, formatTime, formatCurrency, getCategoryBadgeColor, getStatusBadgeColor, getPriorityBadgeColor } from '../utils/formatters';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  MapPin, 
  Phone, 
  Mail, 
  MessageCircle, 
  Send, 
  UserCheck, 
  FileText, 
  CheckCircle2, 
  Upload, 
  Trash2, 
  ExternalLink, 
  Edit3, 
  Activity, 
  ShieldCheck,
  Plus,
  X,
  Eye,
  AlertCircle
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { openWhatsAppChat, generateWhatsAppMessage } from '../utils/whatsapp';
import { SubEventsManager } from '../components/events/SubEventsManager';

interface EventDetailPageProps {
  eventId: string;
}

export const EventDetailPage: React.FC<EventDetailPageProps> = ({ eventId }) => {
  const { 
    events, 
    users, 
    updateEventStatus, 
    deleteEvent, 
    addEventAttachment, 
    removeEventAttachment,
    assignMemberToEvent,
    removeMemberFromEvent,
    navigateToEditEvent, 
    setEventRoute,
    currentUser,
    studio
  } = useApp();

  const { currentStudio } = useStudio();

  const event = events.find(e => e.id === eventId);

  // Attachment upload simulation state
  const [newAttachmentName, setNewAttachmentName] = useState('');
  const [newAttachmentUrl, setNewAttachmentUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [previewAttachmentUrl, setPreviewAttachmentUrl] = useState<string | null>(null);

  // Status update with remarks modal state
  const [statusRemarks, setStatusRemarks] = useState('');
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<EventStatus>('Confirmed');

  // Crew assignment state
  const [selectedCrewMemberId, setSelectedCrewMemberId] = useState('');
  const [isAssignCrewOpen, setIsAssignCrewOpen] = useState(false);

  if (!event) {
    return (
      <div className="p-8 text-center max-w-lg mx-auto bg-white rounded-2xl border border-zinc-200 space-y-3">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
        <h3 className="text-base font-bold text-zinc-900">Event Not Found</h3>
        <p className="text-xs text-zinc-500">The requested event ID could not be found in active studio "{currentStudio.name}".</p>
        <Button variant="outline" size="sm" onClick={() => setEventRoute({ mode: 'list' })}>
          Back to Events
        </Button>
      </div>
    );
  }

  const assignedUsers = users.filter(u => (event.assignedTeamIds || []).includes(u.id));
  const pendingAmount = Math.max(0, (event.estimatedBudget || 0) - (event.advancePaid || 0));

  const handleOpenStatusModal = (status: EventStatus) => {
    setTargetStatus(status);
    setStatusRemarks('');
    setIsStatusModalOpen(true);
  };

  const handleConfirmStatusChange = () => {
    updateEventStatus(event.id, targetStatus, statusRemarks || undefined);
    setIsStatusModalOpen(false);
  };

  const handleAddAttachment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAttachmentName.trim()) return;

    addEventAttachment(event.id, {
      name: newAttachmentName.trim(),
      url: newAttachmentUrl.trim() || 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&auto=format&fit=crop&q=80',
      type: 'image',
      uploadedBy: currentUser.id,
      uploadedByName: currentUser.name
    });

    setNewAttachmentName('');
    setNewAttachmentUrl('');
    setIsUploading(false);
  };

  const handleAssignCrew = () => {
    if (!selectedCrewMemberId) return;
    const user = users.find(u => u.id === selectedCrewMemberId);
    if (!user) return;

    const assignment: EventAssignment = {
      memberId: user.id,
      memberName: user.name,
      roleTitle: user.roleTitle,
      assignedBy: currentUser.name,
      assignedAt: new Date().toISOString()
    };

    assignMemberToEvent(event.id, assignment);
    setSelectedCrewMemberId('');
    setIsAssignCrewOpen(false);
  };

  const handleSendWhatsApp = (action: 'event_reminder' | 'payment_reminder') => {
    const msg = generateWhatsAppMessage(action, {
      customerName: event.customerName,
      studioName: studio.name,
      eventName: event.name,
      eventDate: `${formatDate(event.startDate)} (${formatTime(event.startTime)})`,
      venue: `${event.venue}, ${event.venueCity}`,
      invoiceAmount: event.estimatedBudget,
      pendingAmount: pendingAmount,
      invoiceLink: `https://studio-os.preview/inv/${event.eventNumber.toLowerCase()}`
    });
    openWhatsAppChat(event.customerPhone, msg);
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete event "${event.name}"? This action cannot be undone.`)) {
      deleteEvent(event.id);
    }
  };

  const isMultiDay = event.endDate && event.endDate !== event.startDate;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Back button & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          onClick={() => setEventRoute({ mode: 'list' })}
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-600 hover:text-zinc-950 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Events</span>
        </button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<Edit3 className="w-4 h-4" />}
            onClick={() => navigateToEditEvent(event.id)}
          >
            Edit Event
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<Trash2 className="w-4 h-4 text-rose-600" />}
            onClick={handleDelete}
            className="text-rose-600 hover:bg-rose-50 border-rose-200"
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Main Overview Card */}
      <div className="bg-white rounded-3xl border border-zinc-200/90 p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${getCategoryBadgeColor(event.category)}`}>
                {event.category}
              </span>
              <span className={`text-xs px-2.5 py-1 rounded-full ${getPriorityBadgeColor(event.priority)}`}>
                {event.priority} Priority
              </span>
              <span className="font-mono text-xs font-bold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-lg border border-zinc-200">
                {event.eventNumber}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 font-display">
              {event.name}
            </h1>
            <p className="text-xs text-zinc-500">
              Created on {formatDate(event.createdAt)} • Tenant Partition: {currentStudio.tenantId}
            </p>
          </div>

          {/* Status selector with popup remarks */}
          <div className="flex items-center gap-2 self-start sm:self-auto bg-zinc-50 p-2 rounded-2xl border border-zinc-200">
            <span className="text-xs text-zinc-500 font-medium pl-1">Status:</span>
            <select
              value={event.status}
              onChange={e => handleOpenStatusModal(e.target.value as EventStatus)}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl border ${getStatusBadgeColor(event.status)} cursor-pointer focus:outline-none`}
            >
              <option value="Enquiry">Enquiry</option>
              <option value="Tentative">Tentative</option>
              <option value="Confirmed">Confirmed</option>
              <option value="In Progress">In Progress</option>
              <option value="On Hold">On Hold</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Schedule & Venue Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-zinc-100">
          <div className="p-4 rounded-2xl bg-zinc-50/70 border border-zinc-200/80 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">
              <Calendar className="w-3.5 h-3.5 text-zinc-600" /> Shoot Schedule
            </div>
            <div className="text-sm font-bold text-zinc-900 flex items-center gap-2">
              <span>{formatDate(event.startDate)}</span>
              {isMultiDay && (
                <>
                  <span className="text-zinc-400">to</span>
                  <span>{formatDate(event.endDate)}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                    Multi-Day Shoot
                  </span>
                </>
              )}
            </div>
            <div className="text-xs text-zinc-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              <span>{formatTime(event.startTime)} – {formatTime(event.endTime)}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-50/70 border border-zinc-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                <MapPin className="w-3.5 h-3.5 text-zinc-600" /> Venue & Location
              </div>
              {event.googleMapsLocation && (
                <a
                  href={event.googleMapsLocation}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  <span>Google Maps</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <div className="text-sm font-bold text-zinc-900">{event.venue}</div>
            <div className="text-xs text-zinc-500">
              {event.fullAddress || `${event.venueCity}`}
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Events Management (Parent-Child Ceremonies Breakdown) */}
      <SubEventsManager parentEventId={event.id} />

      {/* Customer Information & WhatsApp Actions */}
      <div className="bg-white rounded-3xl border border-zinc-200/90 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider font-display">
              Client & Communication
            </h3>
          </div>
          <span className="text-xs font-mono text-zinc-400">ID: {event.customerId}</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-base font-bold text-zinc-900">{event.customerName}</h4>
            <div className="flex items-center gap-3 text-xs text-zinc-600 mt-1">
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-zinc-400" /> {event.customerPhone}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`tel:${event.customerPhone}`}
              className="px-3.5 py-2 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-xs font-bold text-zinc-800 flex items-center gap-1.5 transition-colors cursor-pointer min-h-[44px]"
            >
              <Phone className="w-3.5 h-3.5 text-zinc-600" />
              <span>Call Client</span>
            </a>
            <button
              onClick={() => handleSendWhatsApp('event_reminder')}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs min-h-[44px]"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp Update</span>
            </button>
          </div>
        </div>
      </div>

      {/* Team Crew Assignments */}
      <div className="bg-white rounded-3xl border border-zinc-200/90 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-zinc-600" />
            <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider font-display">
              Assigned Photography Crew ({assignedUsers.length})
            </h3>
          </div>

          <Button
            variant="outline"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setIsAssignCrewOpen(!isAssignCrewOpen)}
          >
            Assign Member
          </Button>
        </div>

        {/* Inline Assign Member Form */}
        {isAssignCrewOpen && (
          <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200 flex flex-wrap items-center gap-2 animate-in fade-in">
            <select
              value={selectedCrewMemberId}
              onChange={e => setSelectedCrewMemberId(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-white focus:outline-none min-h-[40px]"
            >
              <option value="">-- Choose team member to assign --</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.roleTitle})</option>
              ))}
            </select>
            <Button variant="primary" size="sm" onClick={handleAssignCrew}>
              Confirm Assignment
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {assignedUsers.map(user => (
            <div key={user.id} className="p-3 rounded-2xl border border-zinc-200 bg-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-10 h-10 rounded-xl object-cover border border-zinc-200 shrink-0"
                />
                <div className="min-w-0">
                  <div className="font-bold text-xs text-zinc-900 truncate">{user.name}</div>
                  <div className="text-[10px] text-zinc-500 truncate">{user.roleTitle}</div>
                </div>
              </div>

              <button
                onClick={() => removeMemberFromEvent(event.id, user.id)}
                className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                title="Remove assignment"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {assignedUsers.length === 0 && (
            <p className="text-xs text-zinc-400 italic">No crew assigned yet. Click "Assign Member" above.</p>
          )}
        </div>
      </div>

      {/* Description & Internal Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {event.description && (
          <div className="bg-white rounded-3xl border border-zinc-200/90 p-5 shadow-xs space-y-2">
            <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
              Client Brief & Description
            </h4>
            <p className="text-xs text-zinc-600 leading-relaxed whitespace-pre-line">
              {event.description}
            </p>
          </div>
        )}

        {event.internalNotes && (
          <div className="bg-amber-50/50 rounded-3xl border border-amber-200/70 p-5 shadow-xs space-y-2">
            <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
              Internal Crew Notes (Confidential)
            </h4>
            <p className="text-xs text-amber-800 leading-relaxed whitespace-pre-line">
              {event.internalNotes}
            </p>
          </div>
        )}
      </div>

      {/* Attachments Section */}
      <div className="bg-white rounded-3xl border border-zinc-200/90 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-zinc-600" />
            <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider font-display">
              Event Attachments & Moodboards ({event.attachments?.length || 0})
            </h3>
          </div>

          <Button
            variant="outline"
            size="sm"
            icon={<Upload className="w-3.5 h-3.5" />}
            onClick={() => setIsUploading(!isUploading)}
          >
            Upload Attachment
          </Button>
        </div>

        {/* Upload Form Modal / Drawer */}
        {isUploading && (
          <form onSubmit={handleAddAttachment} className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3">
            <div className="text-xs font-bold text-zinc-800">Add Image or Reference Document</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                required
                placeholder="Attachment title (e.g. Moodboard Varmala Reference)"
                value={newAttachmentName}
                onChange={e => setNewAttachmentName(e.target.value)}
                className="px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs focus:outline-none"
              />
              <input
                type="url"
                placeholder="Image/Document URL (or leave blank for demo photo)"
                value={newAttachmentUrl}
                onChange={e => setNewAttachmentUrl(e.target.value)}
                className="px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsUploading(false)}>Cancel</Button>
              <Button type="submit" variant="primary" size="sm">Save Attachment</Button>
            </div>
          </form>
        )}

        {/* Attachments Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(event.attachments || []).map(att => (
            <div key={att.id} className="group relative rounded-2xl border border-zinc-200 overflow-hidden bg-zinc-50">
              <img
                src={att.url}
                alt={att.name}
                className="w-full h-32 object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                onClick={() => setPreviewAttachmentUrl(att.url)}
              />
              <div className="p-2 bg-white flex items-center justify-between">
                <span className="text-[11px] font-semibold text-zinc-900 truncate" title={att.name}>{att.name}</span>
                <button
                  onClick={() => removeEventAttachment(event.id, att.id)}
                  className="p-1 text-zinc-400 hover:text-rose-600 rounded transition-colors"
                  title="Remove attachment"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {(!event.attachments || event.attachments.length === 0) && (
            <div className="col-span-full p-8 text-center text-xs text-zinc-400 italic">
              No reference images or call sheets uploaded. Click "Upload Attachment" to add.
            </div>
          )}
        </div>
      </div>

      {/* Activity Trail & Status History */}
      <div className="bg-white rounded-3xl border border-zinc-200/90 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-zinc-600" />
            <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider font-display">
              Event Status History & Activity Log
            </h3>
          </div>
        </div>

        <div className="space-y-3">
          {(event.statusHistory || []).map(sh => (
            <div key={sh.id} className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/80 flex items-start justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadgeColor(sh.toStatus)}`}>
                    {sh.toStatus}
                  </span>
                  <span className="text-zinc-500 font-medium">Changed by {sh.changedByName}</span>
                </div>
                {sh.remarks && (
                  <p className="text-zinc-600 italic">"{sh.remarks}"</p>
                )}
              </div>
              <span className="text-[10px] text-zinc-400 shrink-0">{formatDate(sh.timestamp.split('T')[0])}</span>
            </div>
          ))}

          {(!event.statusHistory || event.statusHistory.length === 0) && (
            <p className="text-xs text-zinc-400 italic">No status history records available.</p>
          )}
        </div>
      </div>

      {/* Status Remarks Modal */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h4 className="text-base font-bold text-zinc-900 font-display">
              Update Status to "{targetStatus}"
            </h4>
            <p className="text-xs text-zinc-500">
              Provide optional operational remarks for this milestone transition:
            </p>
            <textarea
              rows={3}
              value={statusRemarks}
              onChange={e => setStatusRemarks(e.target.value)}
              placeholder="e.g. Client cleared advance payment; shot list finalized."
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:outline-none"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsStatusModalOpen(false)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleConfirmStatusChange}>Confirm Update</Button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewAttachmentUrl && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md cursor-pointer"
          onClick={() => setPreviewAttachmentUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img src={previewAttachmentUrl} alt="Preview" className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain" />
            <button 
              onClick={() => setPreviewAttachmentUrl(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-zinc-900/80 text-white flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
