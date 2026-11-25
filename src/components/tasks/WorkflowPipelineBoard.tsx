import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { WorkflowInstance, WorkflowStage } from '../../types';
import { Button } from '../ui/Button';
import { useModalLifecycle } from '../../hooks/useModalLifecycle';
import { X,
  Layers, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  Settings, 
  Plus, 
  Calendar, 
  Sparkles,
  ChevronRight
} from 'lucide-react';

interface WorkflowPipelineBoardProps {
  onOpenTemplateManager: () => void;
  onSelectTask: (taskId: string) => void;
}

export const WorkflowPipelineBoard: React.FC<WorkflowPipelineBoardProps> = ({
  onOpenTemplateManager,
  onSelectTask
}) => {
  const { 
    workflowInstances, 
    workflowTemplates, 
    tasks, 
    events, 
    attachWorkflow, 
    updateWorkflowStage 
  } = useApp();

  const [selectedInstanceId, setSelectedInstanceId] = useState<string>(workflowInstances[0]?.id || '');
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  const { handleAttemptClose, handleBackdropClick } = useModalLifecycle({
    isOpen: isAttachModalOpen,
    onClose: () => setIsAttachModalOpen(false)
  });

  const activeInstance = workflowInstances.find(w => w.id === selectedInstanceId) || workflowInstances[0];
  const template = activeInstance ? workflowTemplates.find(t => t.id === activeInstance.templateId) : workflowTemplates[0];
  const stages: WorkflowStage[] = template?.stages || [];

  const handleAttachSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId || !selectedTemplateId) return;
    const targetEvent = events.find(ev => ev.id === selectedEventId);
    if (!targetEvent) return;

    const instance = attachWorkflow({
      templateId: selectedTemplateId,
      entityType: 'main_event',
      entityId: targetEvent.id,
      entityName: targetEvent.name
    });

    setIsAttachModalOpen(false);
    setSelectedInstanceId(instance.id);
  };

  return (
    <div className="space-y-5">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-zinc-200 bg-white shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-zinc-900">
                Active Production Pipeline:
              </h3>
              <select
                value={selectedInstanceId}
                onChange={e => setSelectedInstanceId(e.target.value)}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-zinc-300 bg-white cursor-pointer"
              >
                {workflowInstances.map(inst => (
                  <option key={inst.id} value={inst.id}>
                    {inst.entityName} ({inst.progressPercentage}% Complete)
                  </option>
                ))}
              </select>
            </div>
            {activeInstance && (
              <p className="text-xs text-zinc-500 mt-0.5">
                Template: <span className="font-semibold">{activeInstance.templateName}</span> • Current Stage: <span className="font-semibold text-indigo-700">{activeInstance.currentStageName}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenTemplateManager}
          >
            <Settings className="w-3.5 h-3.5 mr-1" /> Workflow Templates
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAttachModalOpen(true)}
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Attach Pipeline
          </Button>
        </div>
      </div>

      {/* Progress Bar for Active Workflow */}
      {activeInstance && (
        <div className="p-4 rounded-2xl border border-zinc-200 bg-white shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-700">Overall Pipeline Production Progress</span>
            <span className="font-bold text-zinc-900">{activeInstance.progressPercentage}%</span>
          </div>
          <div className="w-full bg-zinc-100 rounded-full h-2.5 overflow-hidden">
            <div 
              className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${activeInstance.progressPercentage}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>{activeInstance.completedTasksCount} of {activeInstance.totalTasksCount} tasks completed</span>
            <span className="capitalize font-semibold text-zinc-700">Status: {activeInstance.status}</span>
          </div>
        </div>
      )}

      {/* Horizontal Pipeline Stages Scroller */}
      <div className="flex gap-3 overflow-x-auto pb-4 pt-1 items-start scrollbar-thin">
        {stages.map((stage, idx) => {
          const isCurrent = activeInstance?.currentStageId === stage.id;
          const stageIndex = stages.findIndex(s => s.id === activeInstance?.currentStageId);
          const isPast = activeInstance && idx < stageIndex;

          const stageTasks = tasks.filter(t => 
            activeInstance ? t.workflowId === activeInstance.id && t.workflowStageId === stage.id : t.workflowStageId === stage.id
          );
          const completedTasks = stageTasks.filter(t => t.status === 'Completed' || t.status === 'Done');

          return (
            <div
              key={stage.id}
              className={`w-64 shrink-0 rounded-2xl border p-4 shadow-xs space-y-3 transition-all select-none ${
                isCurrent
                  ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-600/20'
                  : isPast
                  ? 'border-emerald-200 bg-emerald-50/20'
                  : 'border-zinc-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between gap-1 text-xs">
                <span className="font-mono font-bold text-zinc-500">Stage {stage.order}</span>
                {isPast ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Done
                  </span>
                ) : isCurrent ? (
                  <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold">
                    Active
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">
                    Pending
                  </span>
                )}
              </div>

              <div>
                <h4 className="text-sm font-bold text-zinc-900 leading-snug">
                  {stage.name}
                </h4>
                <div className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1">
                  <span>{stage.department}</span>
                  {stage.estimatedHours > 0 && <span>• {stage.estimatedHours} hrs</span>}
                </div>
              </div>

              {/* Tasks in this stage */}
              <div className="space-y-1.5 pt-2 border-t border-zinc-200/60">
                <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Stage Tasks ({completedTasks.length}/{stageTasks.length})
                </div>
                {stageTasks.length === 0 ? (
                  <div className="text-center py-3 text-zinc-400 text-xs italic">
                    No tasks in this stage
                  </div>
                ) : (
                  stageTasks.map(task => (
                    <div
                      key={task.id}
                      onClick={() => onSelectTask(task.id)}
                      className="p-2 rounded-lg border border-zinc-200/80 bg-white hover:bg-zinc-50 transition-colors text-xs cursor-pointer flex items-center justify-between gap-1"
                    >
                      <span className="font-medium text-zinc-800 truncate">{task.title}</span>
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded uppercase shrink-0 ${
                        task.status === 'Completed' || task.status === 'Done' ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-600'
                      }`}>
                        {task.status}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Stage advance button */}
              {activeInstance && isCurrent && (
                <Button
                  size="xs"
                  variant="primary"
                  onClick={() => {
                    const nextStage = stages[idx + 1];
                    if (nextStage) {
                      updateWorkflowStage(activeInstance.id, nextStage.id);
                    }
                  }}
                  className="w-full mt-2"
                >
                  Advance to Next Stage <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Attach Workflow Modal */}
      {isAttachModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xs"
          onClick={handleBackdropClick}
          role="dialog"
          aria-modal="true"
        >
          <div 
            className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-zinc-200 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-zinc-900">Attach Production Workflow to Event</h3>
              <button 
                type="button" 
                onClick={handleAttemptClose}
                className="min-w-[44px] min-h-[44px] rounded-lg text-zinc-400 hover:text-zinc-600 flex items-center justify-center"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAttachSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Select Event / Shoot</label>
                <select
                  value={selectedEventId}
                  onChange={e => setSelectedEventId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 focus:outline-none cursor-pointer"
                  required
                >
                  <option value="">Select Event...</option>
                  {events.map(ev => (
                    <option key={ev.id} value={ev.id}>{ev.name} ({ev.category})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Select Workflow Template</label>
                <select
                  value={selectedTemplateId}
                  onChange={e => setSelectedTemplateId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 focus:outline-none cursor-pointer"
                  required
                >
                  <option value="">Select Template...</option>
                  {workflowTemplates.map(tmpl => (
                    <option key={tmpl.id} value={tmpl.id}>{tmpl.name} ({tmpl.stages.length} Stages)</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsAttachModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Attach & Generate Tasks
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
