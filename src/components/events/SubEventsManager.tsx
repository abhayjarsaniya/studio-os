import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SubEvent, SubEventStatus } from '../../types';
import { 
  Plus, 
  Sparkles, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Copy, 
  Trash2, 
  Edit3, 
  ChevronRight, 
  CheckCircle2, 
  Check, 
  AlertCircle 
} from 'lucide-react';
import { Button } from '../ui/Button';
import { SubEventModal } from './SubEventModal';
import { SubEventDetailModal } from './SubEventDetailModal';

interface SubEventsManagerProps {
  parentEventId: string;
}

const QUICK_ADD_PRESETS = [
  'Engagement',
  'Mandvo',
  'Pithi',
  'Mehndi',
  'Sanji',
  'Wedding Ceremony',
  'Reception',
  'Vidaai'
];

export const SubEventsManager: React.FC<SubEventsManagerProps> = ({ parentEventId }) => {
  const { 
    subEvents, 
    calculateParentProgress, 
    updateSubEventStatus,
    duplicateSubEvent,
    deleteSubEvent,
    createSubEvent,
    events
  } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubEvent, setEditingSubEvent] = useState<SubEvent | null>(null);
  const [selectedSubEvent, setSelectedSubEvent] = useState<SubEvent | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const parentEvent = events.find(e => e.id === parentEventId);
  const currentSubEvents = subEvents.filter(s => s.parentEventId === parentEventId).sort((a, b) => a.sortOrder - b.sortOrder);
  const progress = calculateParentProgress(parentEventId);

  const handleOpenCreate = () => {
    setEditingSubEvent(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sub: SubEvent) => {
    setEditingSubEvent(sub);
    setIsModalOpen(true);
  };

  const handleOpenDetail = (sub: SubEvent) => {
    setSelectedSubEvent(sub);
    setIsDetailModalOpen(true);
  };

  const handleQuickAdd = (preset: string) => {
    createSubEvent({
      parentEventId,
      name: preset,
      customCategory: preset,
      date: parentEvent ? parentEvent.startDate : new Date().toISOString().split('T')[0],
      startTime: '17:00',
      endTime: '21:00',
      venue: parentEvent ? parentEvent.venue : 'Grand Ballroom',
      address: parentEvent?.fullAddress || '',
      requiredTeamSize: 2,
      priority: 'High',
      status: 'Confirmed',
      sortOrder: currentSubEvents.length,
      assignedMemberIds: parentEvent?.assignedTeamIds || [],
      assignedMembers: []
    });
  };

  const getStatusStyle = (status: SubEventStatus) => {
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
    <div className="space-y-4">
      {/* Header & Overall Progress Summary */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-zinc-200/90 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-zinc-900 font-display flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Sub-Events Breakdown
              </h3>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700">
                {currentSubEvents.length} Functions
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Manage parent-child wedding ceremonies, individual rituals, timings and distinct crew assignments
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            className="bg-zinc-900 hover:bg-black text-white shrink-0 self-start sm:self-auto cursor-pointer"
            icon={<Plus className="w-4 h-4" />}
            onClick={handleOpenCreate}
          >
            Add Sub-Event
          </Button>
        </div>

        {/* Progress Bar & KPI Chips */}
        <div className="pt-2 border-t border-zinc-100 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-700">
              Overall Shoot Progress: {progress.completed} of {progress.total} Completed
            </span>
            <span className="font-bold font-mono text-zinc-900">
              {progress.percentage}%
            </span>
          </div>
          <div className="w-full h-2.5 bg-zinc-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>

          {/* Counts Badges */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-medium">
            <span className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700">
              Total: <strong>{progress.total}</strong>
            </span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
              Completed: <strong>{progress.completed}</strong>
            </span>
            <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
              In Progress: <strong>{progress.inProgress}</strong>
            </span>
            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
              Upcoming: <strong>{progress.upcoming}</strong>
            </span>
            <span className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600">
              Pending: <strong>{progress.pending}</strong>
            </span>
            {progress.cancelled > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                Cancelled: <strong>{progress.cancelled}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Quick Add Presets Row */}
        <div className="pt-2 border-t border-zinc-100 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-xs font-semibold text-zinc-400 shrink-0">Quick Add:</span>
          {QUICK_ADD_PRESETS.map(preset => (
            <button
              key={preset}
              onClick={() => handleQuickAdd(preset)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-50 border border-zinc-200 text-zinc-700 hover:bg-zinc-100 hover:border-zinc-300 transition-all shrink-0 cursor-pointer"
            >
              + {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Sub-Events List (Mobile Cards & Desktop Table) */}
      {currentSubEvents.length === 0 ? (
        <div className="p-8 rounded-2xl bg-white border border-dashed border-zinc-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 text-zinc-400 mx-auto flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-zinc-400" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-zinc-800">No Sub-Events Added Yet</h4>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1">
              Break down this main shoot into ceremonies like Engagement, Haldi, Sangeet, Wedding, and Reception.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={handleOpenCreate}
          >
            Add First Sub-Event
          </Button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {currentSubEvents.map((sub, index) => {
            return (
              <div
                key={sub.id}
                onClick={() => handleOpenDetail(sub)}
                className="p-3.5 sm:p-4 rounded-xl bg-white border border-zinc-200/90 hover:border-zinc-300 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group cursor-pointer"
              >
                {/* Left Info */}
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                    {index + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-xs text-zinc-500 font-semibold bg-zinc-50 border border-zinc-200 px-1.5 py-0.5 rounded">
                        {sub.subEventNumber}
                      </span>
                      <h4 className="text-sm font-bold text-zinc-900 truncate">
                        {sub.name}
                      </h4>
                      <span className="text-xs font-semibold text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-full">
                        {sub.customCategory}
                      </span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${getStatusStyle(sub.status)}`}>
                        {sub.status}
                      </span>
                    </div>

                    {/* Metadata line */}
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                        {sub.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-zinc-400" />
                        {sub.startTime} – {sub.endTime}
                      </span>
                      <span className="flex items-center gap-1 truncate max-w-xs">
                        <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className="truncate">{sub.venue}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Crew & Actions */}
                <div 
                  className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100 shrink-0"
                  onClick={e => e.stopPropagation()}
                >
                  {/* Crew Indicator */}
                  <div className="flex items-center gap-1.5 text-xs text-zinc-600 bg-zinc-50 px-2.5 py-1 rounded-lg border border-zinc-200">
                    <Users className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{sub.assignedMembers?.length || 0} / {sub.requiredTeamSize} Crew</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => duplicateSubEvent(sub.id)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                      title="Duplicate Sub-Event"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenEdit(sub)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                      title="Edit Sub-Event"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteSubEvent(sub.id)}
                      className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete Sub-Event"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenDetail(sub)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sub-Event Create/Edit Modal */}
      <SubEventModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingSubEvent(null);
        }}
        parentEventId={parentEventId}
        initialSubEvent={editingSubEvent}
      />

      {/* Sub-Event Detail Modal */}
      <SubEventDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedSubEvent(null);
        }}
        subEvent={selectedSubEvent}
        onEdit={handleOpenEdit}
      />
    </div>
  );
};
