import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SubEvent, SubEventStatus } from '../../types';
import { 
  X, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Tag, 
  Edit3, 
  Copy, 
  Trash2, 
  CheckCircle2, 
  FileText,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { Button } from '../ui/Button';

interface SubEventDetailModalProps {
  subEvent: SubEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (subEvent: SubEvent) => void;
}

export const SubEventDetailModal: React.FC<SubEventDetailModalProps> = ({
  subEvent,
  isOpen,
  onClose,
  onEdit
}) => {
  const { 
    updateSubEventStatus, 
    deleteSubEvent, 
    duplicateSubEvent,
    events
  } = useApp();

  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !subEvent) return null;

  const parentEvent = events.find(e => e.id === subEvent.parentEventId);

  const handleStatusChange = (status: SubEventStatus) => {
    updateSubEventStatus(subEvent.id, status);
  };

  const handleDuplicate = () => {
    duplicateSubEvent(subEvent.id);
    onClose();
  };

  const handleDelete = () => {
    deleteSubEvent(subEvent.id);
    onClose();
  };

  const getStatusBadge = (status: SubEventStatus) => {
    switch (status) {
      case 'Completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'In Progress':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Confirmed':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Cancelled':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Tentative':
      default:
        return 'bg-zinc-100 text-zinc-700 border-zinc-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl border border-zinc-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-100 bg-zinc-50/60 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-mono text-xs font-semibold text-zinc-500 bg-white border border-zinc-200 px-2 py-0.5 rounded-md">
                {subEvent.subEventNumber}
              </span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(subEvent.status)}`}>
                {subEvent.status}
              </span>
              <span className="text-xs font-semibold text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-full">
                {subEvent.customCategory}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-zinc-900 truncate">
              {subEvent.name}
            </h3>
            <p className="text-xs text-zinc-500 truncate">
              Parent Shoot: {parentEvent?.name} ({parentEvent?.eventNumber})
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs sm:text-sm">
          {/* Status Quick Switcher */}
          <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-semibold text-zinc-700">Update Sub-Event Status:</span>
            <div className="flex flex-wrap gap-1">
              {(['Tentative', 'Confirmed', 'In Progress', 'Completed', 'Cancelled'] as SubEventStatus[]).map(st => (
                <button
                  key={st}
                  onClick={() => handleStatusChange(st)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    subEvent.status === st 
                      ? 'bg-zinc-900 text-white shadow-xs' 
                      : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Schedule & Venue Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl border border-zinc-200 bg-white space-y-2">
              <div className="flex items-center gap-2 text-zinc-600 font-semibold text-xs">
                <Calendar className="w-4 h-4 text-zinc-400" />
                <span>Shoot Timing</span>
              </div>
              <p className="text-xs text-zinc-900 font-bold">{subEvent.date}</p>
              <p className="text-xs text-zinc-600 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                {subEvent.startTime} – {subEvent.endTime}
              </p>
            </div>

            <div className="p-3 rounded-xl border border-zinc-200 bg-white space-y-2">
              <div className="flex items-center gap-2 text-zinc-600 font-semibold text-xs">
                <MapPin className="w-4 h-4 text-zinc-400" />
                <span>Venue & Landmark</span>
              </div>
              <p className="text-xs text-zinc-900 font-bold">{subEvent.venue}</p>
              {subEvent.address && (
                <p className="text-xs text-zinc-500 line-clamp-2">{subEvent.address}</p>
              )}
            </div>
          </div>

          {/* Assigned Crew Members */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-zinc-400" />
                Assigned Team Members ({subEvent.assignedMembers?.length || 0})
              </span>
              <span className="text-xs text-zinc-500">
                Team Requirement: {subEvent.requiredTeamSize} Crew
              </span>
            </div>

            {subEvent.assignedMembers && subEvent.assignedMembers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {subEvent.assignedMembers.map(m => (
                  <div key={m.memberId} className="flex items-center gap-2.5 p-2 rounded-xl border border-zinc-200 bg-white">
                    <div className="w-7 h-7 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                      {m.memberName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-zinc-900 truncate">{m.memberName}</p>
                      <p className="text-xs text-zinc-500 truncate">{m.roleTitle}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-xl border border-dashed border-zinc-200 text-center text-zinc-400 text-xs">
                No team members assigned yet.
              </div>
            )}
          </div>

          {/* Instructions / Call Sheet Brief */}
          {subEvent.instructions && (
            <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200 space-y-1">
              <p className="text-xs font-bold text-amber-900 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-amber-600" />
                Call Sheet Instructions
              </p>
              <p className="text-xs text-amber-800 whitespace-pre-wrap">{subEvent.instructions}</p>
            </div>
          )}

          {/* Internal Notes */}
          {subEvent.notes && (
            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1">
              <p className="text-xs font-bold text-zinc-700">Internal Notes</p>
              <p className="text-xs text-zinc-600 whitespace-pre-wrap">{subEvent.notes}</p>
            </div>
          )}

          {/* Confirmation Box for Deletion */}
          {isDeleting && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-rose-800">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Confirm Sub-Event Deletion</span>
              </div>
              <p className="text-rose-700">
                Are you sure you want to delete &ldquo;{subEvent.name}&rdquo;? This cannot be undone.
              </p>
              <div className="flex items-center justify-end gap-2 pt-1">
                <Button variant="outline" size="xs" onClick={() => setIsDeleting(false)}>
                  Cancel
                </Button>
                <Button variant="danger" size="xs" onClick={handleDelete}>
                  Yes, Delete Sub-Event
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Action Bar */}
        <div className="p-3 sm:p-4 border-t border-zinc-100 bg-zinc-50/50 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="xs"
              icon={<Copy className="w-3.5 h-3.5" />}
              onClick={handleDuplicate}
              title="Duplicate Sub-Event"
            >
              Duplicate
            </Button>
            {!isDeleting && (
              <Button
                variant="outline"
                size="xs"
                className="text-rose-600 hover:bg-rose-50 border-rose-200"
                icon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={() => setIsDeleting(true)}
              >
                Delete
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="xs"
              onClick={onClose}
            >
              Close
            </Button>
            <Button
              variant="primary"
              size="xs"
              className="bg-zinc-900 text-white"
              icon={<Edit3 className="w-3.5 h-3.5" />}
              onClick={() => {
                onClose();
                onEdit(subEvent);
              }}
            >
              Edit Sub-Event
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
