import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { SubEvent, SubEventStatus, Priority } from '../../types';
import { useModalLifecycle } from '../../hooks/useModalLifecycle';
import { 
  X, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Tag, 
  AlertCircle,
  FileText,
  Sparkles,
  Check
} from 'lucide-react';
import { Button } from '../ui/Button';

interface SubEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentEventId: string;
  initialSubEvent?: SubEvent | null;
}

const COMMON_SUB_EVENT_PRESETS = [
  'Engagement',
  'Mandvo',
  'Pithi',
  'Mehndi',
  'Sanji',
  'Sangeet',
  'Haldi',
  'Chooda & Kaleere',
  'Baraat',
  'Wedding Ceremony',
  'Reception',
  'Vidaai',
  'Cocktail Night',
  'After Party'
];

export const SubEventModal: React.FC<SubEventModalProps> = ({
  isOpen,
  onClose,
  parentEventId,
  initialSubEvent
}) => {
  const { 
    createSubEvent, 
    updateSubEvent, 
    events, 
    employees, 
    users 
  } = useApp();

  const parentEvent = events.find(e => e.id === parentEventId);

  const [name, setName] = useState('');
  const [customCategory, setCustomCategory] = useState('Wedding Ceremony');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('17:00');
  const [endTime, setEndTime] = useState('21:00');
  const [venue, setVenue] = useState('');
  const [address, setAddress] = useState('');
  const [requiredTeamSize, setRequiredTeamSize] = useState(2);
  const [priority, setPriority] = useState<Priority>('High');
  const [status, setStatus] = useState<SubEventStatus>('Confirmed');
  const [instructions, setInstructions] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const { handleAttemptClose, handleBackdropClick } = useModalLifecycle({
    isOpen,
    onClose,
    isDirty,
    confirmMessage: 'Discard unsaved changes to this sub-event?'
  });

  useEffect(() => {
    if (initialSubEvent) {
      setName(initialSubEvent.name);
      setCustomCategory(initialSubEvent.customCategory);
      setDate(initialSubEvent.date);
      setStartTime(initialSubEvent.startTime);
      setEndTime(initialSubEvent.endTime);
      setVenue(initialSubEvent.venue);
      setAddress(initialSubEvent.address || '');
      setRequiredTeamSize(initialSubEvent.requiredTeamSize);
      setPriority(initialSubEvent.priority);
      setStatus(initialSubEvent.status);
      setInstructions(initialSubEvent.instructions || '');
      setNotes(initialSubEvent.notes || '');
      setSelectedMemberIds(initialSubEvent.assignedMemberIds || []);
    } else {
      setName('');
      setCustomCategory('Wedding Ceremony');
      setDate(parentEvent ? parentEvent.startDate : new Date().toISOString().split('T')[0]);
      setStartTime('17:00');
      setEndTime('21:00');
      setVenue(parentEvent ? parentEvent.venue : '');
      setAddress(parentEvent?.fullAddress || '');
      setRequiredTeamSize(2);
      setPriority('High');
      setStatus('Confirmed');
      setInstructions('');
      setNotes('');
      setSelectedMemberIds(parentEvent?.assignedTeamIds || []);
    }
    setError(null);
  }, [initialSubEvent, parentEvent, isOpen]);

  if (!isOpen) return null;

  const handlePresetSelect = (preset: string) => {
    setName(preset);
    setCustomCategory(preset);
  };

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMemberIds(prev => 
      prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Sub-event title is required.');
      return;
    }
    if (!venue.trim()) {
      setError('Venue location is required.');
      return;
    }
    if (!date) {
      setError('Date is required.');
      return;
    }

    // Build assigned members array
    const assignedMembers = selectedMemberIds.map(id => {
      const emp = employees.find(e => e.id === id || e.userId === id);
      const usr = users.find(u => u.id === id);
      return {
        memberId: id,
        memberName: emp ? emp.fullName : (usr ? usr.name : 'Crew Member'),
        roleTitle: emp ? emp.designation : (usr ? usr.roleTitle : 'Photographer'),
        department: emp ? emp.department : 'Photography',
        avatarUrl: emp?.profilePhoto || usr?.avatar
      };
    });

    try {
      if (initialSubEvent) {
        updateSubEvent(initialSubEvent.id, {
          name: name.trim(),
          customCategory,
          date,
          startTime,
          endTime,
          venue: venue.trim(),
          address: address.trim(),
          requiredTeamSize,
          priority,
          status,
          instructions: instructions.trim(),
          notes: notes.trim(),
          assignedMemberIds: selectedMemberIds,
          assignedMembers
        });
      } else {
        createSubEvent({
          parentEventId,
          name: name.trim(),
          customCategory,
          date,
          startTime,
          endTime,
          venue: venue.trim(),
          address: address.trim(),
          requiredTeamSize,
          priority,
          status,
          instructions: instructions.trim(),
          notes: notes.trim(),
          assignedMemberIds: selectedMemberIds,
          assignedMembers,
          sortOrder: 0
        });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save sub-event');
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl border border-zinc-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 bg-zinc-50/50">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-zinc-900 font-display flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              {initialSubEvent ? 'Edit Sub-Event' : 'Add Custom Sub-Event'}
            </h3>
            <p className="text-xs text-zinc-500 truncate max-w-sm sm:max-w-md">
              Parent: {parentEvent?.name} ({parentEvent?.eventNumber})
            </p>
          </div>
          <button
            type="button"
            onClick={handleAttemptClose}
            className="min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
            aria-label="Close sub-event form"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form 
          onSubmit={handleSubmit} 
          onChange={() => !isDirty && setIsDirty(true)}
          className="flex-1 overflow-y-auto p-5 space-y-4 text-xs sm:text-sm"
        >
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Preset Selector */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Quick Pre-fills or Custom Name
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pb-1">
              {COMMON_SUB_EVENT_PRESETS.map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePresetSelect(preset)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    name === preset 
                      ? 'bg-zinc-900 text-white shadow-xs' 
                      : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Sub-Event Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Sub-Event Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Sangeet & Cocktail Night"
                required
                className="w-full px-3 py-2 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-xs sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Custom Category / Tag
              </label>
              <input
                type="text"
                value={customCategory}
                onChange={e => setCustomCategory(e.target.value)}
                placeholder="e.g. Sangeet, Pooja, Haldi"
                className="w-full px-3 py-2 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* Date & Timings */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                Date *
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-xs sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-xs sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                End Time
              </label>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* Venue & Full Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                Venue Name *
              </label>
              <input
                type="text"
                value={venue}
                onChange={e => setVenue(e.target.value)}
                placeholder="e.g. Poolside Lawn, Taj Lands End"
                required
                className="w-full px-3 py-2 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-xs sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Address / Hall Details
              </label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="e.g. 2nd Floor, West Wing"
                className="w-full px-3 py-2 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* Priority, Status, Required Crew Size */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as Priority)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-xs sm:text-sm bg-white"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as SubEventStatus)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-xs sm:text-sm bg-white"
              >
                <option value="Tentative">Tentative</option>
                <option value="Confirmed">Confirmed</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Required Crew Size
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={requiredTeamSize}
                onChange={e => setRequiredTeamSize(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* Assign Crew Members */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-zinc-400" />
                Assign Crew for This Sub-Event
              </span>
              <span className="text-xs text-zinc-400">
                {selectedMemberIds.length} assigned / {requiredTeamSize} required
              </span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto p-1 border border-zinc-200 rounded-xl bg-zinc-50/50">
              {employees.length > 0 ? (
                employees.map(emp => {
                  const isSelected = selectedMemberIds.includes(emp.id) || selectedMemberIds.includes(emp.userId);
                  return (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => toggleMemberSelection(emp.id)}
                      className={`flex items-center justify-between p-2 rounded-xl text-left transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-zinc-900 text-white shadow-xs' 
                          : 'bg-white border border-zinc-200 text-zinc-800 hover:border-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-zinc-100 text-zinc-700'
                        }`}>
                          {emp.fullName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate leading-tight">{emp.fullName}</p>
                          <p className={`text-xs truncate ${isSelected ? 'text-zinc-300' : 'text-zinc-500'}`}>
                            {emp.designation}
                          </p>
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0 ml-1" />}
                    </button>
                  );
                })
              ) : (
                users.map(usr => {
                  const isSelected = selectedMemberIds.includes(usr.id);
                  return (
                    <button
                      key={usr.id}
                      type="button"
                      onClick={() => toggleMemberSelection(usr.id)}
                      className={`flex items-center justify-between p-2 rounded-xl text-left transition-all ${
                        isSelected 
                          ? 'bg-zinc-900 text-white shadow-xs' 
                          : 'bg-white border border-zinc-200 text-zinc-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center text-xs font-bold shrink-0">
                          {usr.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{usr.name}</p>
                          <p className="text-xs text-zinc-500 truncate">{usr.roleTitle}</p>
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Instructions & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-zinc-400" />
                Crew Instructions / Call Sheet Brief
              </label>
              <textarea
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                rows={2}
                placeholder="e.g. 120fps slow-motion water splash, wireless audio feed"
                className="w-full px-3 py-2 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Internal Notes
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                placeholder="Confidential studio notes..."
                className="w-full px-3 py-2 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-xs"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAttemptClose}
              className="min-h-[44px]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="bg-zinc-900 hover:bg-black text-white"
            >
              {initialSubEvent ? 'Update Sub-Event' : 'Create Sub-Event'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
