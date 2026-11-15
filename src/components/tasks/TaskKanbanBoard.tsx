import React, { useState } from 'react';
import { Task, TaskStatus } from '../../types';
import { taskDependencyService } from '../../services/taskDependencyService';
import { 
  Clock, 
  Calendar, 
  User, 
  CheckSquare, 
  Lock, 
  AlertCircle, 
  Layers, 
  CheckCircle2, 
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

interface TaskKanbanBoardProps {
  tasks: Task[];
  onSelectTask: (taskId: string) => void;
  onUpdateStatus: (taskId: string, newStatus: TaskStatus) => void;
}

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'Not Started', label: 'Not Started', color: 'border-zinc-300 bg-zinc-50/50' },
  { id: 'In Progress', label: 'In Progress', color: 'border-amber-300 bg-amber-50/30' },
  { id: 'Under Review', label: 'Under Review', color: 'border-purple-300 bg-purple-50/30' },
  { id: 'Revision Required', label: 'Revision Required', color: 'border-rose-300 bg-rose-50/30' },
  { id: 'Completed', label: 'Completed', color: 'border-emerald-300 bg-emerald-50/30' }
];

export const TaskKanbanBoard: React.FC<TaskKanbanBoardProps> = ({
  tasks,
  onSelectTask,
  onUpdateStatus
}) => {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('taskId', id);
    setDraggedTaskId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('taskId') || draggedTaskId;
    if (id) {
      onUpdateStatus(id, status);
      setDraggedTaskId(null);
    }
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 pt-1 items-start scrollbar-thin">
      {COLUMNS.map(col => {
        const colTasks = tasks.filter(t => {
          if (col.id === 'Not Started') return t.status === 'Not Started' || t.status === 'Assigned' || t.status === 'Todo';
          if (col.id === 'Completed') return t.status === 'Completed' || t.status === 'Done';
          return t.status === col.id;
        });

        return (
          <div
            key={col.id}
            onDragOver={handleDragOver}
            onDrop={e => handleDrop(e, col.id)}
            className={`w-72 sm:w-80 shrink-0 rounded-2xl border ${col.color} flex flex-col max-h-[750px] shadow-xs select-none`}
          >
            {/* Column Header */}
            <div className="p-3.5 border-b border-zinc-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs sm:text-sm text-zinc-900">{col.label}</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-700">
                  {colTasks.length}
                </span>
              </div>
            </div>

            {/* Column Body */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 max-h-[660px]">
              {colTasks.length === 0 ? (
                <div className="text-center py-10 text-zinc-400 text-xs italic">
                  Drop tasks here
                </div>
              ) : (
                colTasks.map(task => {
                  const isBlocked = taskDependencyService.isTaskBlocked(task, tasks);
                  const isOverdue = task.dueDate < today && task.status !== 'Completed' && task.status !== 'Done';
                  const checklistTotal = task.checklist?.length || 0;
                  const checklistDone = task.checklist?.filter(c => c.completed).length || 0;

                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={e => handleDragStart(e, task.id)}
                      onClick={() => onSelectTask(task.id)}
                      className="p-3 rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-md transition-all cursor-pointer space-y-2 active:cursor-grabbing"
                    >
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-1 text-xs">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {task.taskNumber && (
                            <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700">
                              {task.taskNumber}
                            </span>
                          )}
                          <span className={`font-bold px-1.5 py-0.5 rounded uppercase ${
                            task.priority === 'Urgent' ? 'bg-rose-100 text-rose-800' :
                            task.priority === 'High' ? 'bg-amber-100 text-amber-800' :
                            'bg-zinc-100 text-zinc-600'
                          }`}>
                            {task.priority}
                          </span>
                        </div>

                        {/* Blocked or Approval indicator */}
                        {isBlocked.blocked ? (
                          <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" /> Blocked
                          </span>
                        ) : task.requiresApproval ? (
                          <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 font-semibold">
                            Needs Review
                          </span>
                        ) : null}
                      </div>

                      {/* Title */}
                      <h4 className="text-xs sm:text-sm font-bold text-zinc-900 leading-snug line-clamp-2">
                        {task.title}
                      </h4>

                      {/* Event / Sub-Event Reference */}
                      {(task.eventName || task.workflowStageName) && (
                        <div className="text-xs text-zinc-500 line-clamp-1 flex items-center gap-1">
                          {task.workflowStageName && (
                            <span className="font-semibold text-indigo-700">
                              {task.workflowStageName}
                            </span>
                          )}
                          {task.eventName && <span>• {task.eventName}</span>}
                        </div>
                      )}

                      {/* Meta Footer */}
                      <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
                        <div className="flex items-center gap-1 font-medium truncate max-w-[120px]">
                          <User className="w-3 h-3 text-zinc-400 shrink-0" />
                          <span className="truncate">{task.assignedToName}</span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {checklistTotal > 0 && (
                            <span className="flex items-center gap-0.5 text-zinc-600 font-mono text-xs">
                              <CheckSquare className="w-3 h-3 text-zinc-400" />
                              {checklistDone}/{checklistTotal}
                            </span>
                          )}

                          <span className={`font-semibold flex items-center gap-0.5 ${
                            isOverdue ? 'text-rose-600 font-bold' : 'text-zinc-600'
                          }`}>
                            <Calendar className="w-3 h-3 shrink-0" />
                            {task.dueDate.slice(5)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
