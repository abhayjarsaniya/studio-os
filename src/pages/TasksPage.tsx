import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { TaskKanbanBoard } from '../components/tasks/TaskKanbanBoard';
import { TaskListTable } from '../components/tasks/TaskListTable';
import { MyTasksView } from '../components/tasks/MyTasksView';
import { WorkflowPipelineBoard } from '../components/tasks/WorkflowPipelineBoard';
import { TaskCalendarView } from '../components/tasks/TaskCalendarView';
import { TeamWorkloadView } from '../components/tasks/TeamWorkloadView';
import { TaskDetailModal } from '../components/tasks/TaskDetailModal';
import { WorkflowTemplateManagerModal } from '../components/tasks/WorkflowTemplateManagerModal';
import { Button } from '../components/ui/Button';
import { 
  CheckSquare, 
  Kanban, 
  List, 
  Calendar as CalendarIcon, 
  UserCheck, 
  Layers, 
  Users, 
  Plus, 
  Sparkles,
  Settings
} from 'lucide-react';

export type TaskViewMode = 'kanban' | 'list' | 'my-tasks' | 'pipeline' | 'calendar' | 'workload';

export const TasksPage: React.FC = () => {
  const { 
    tasks, 
    updateTaskStatus, 
    setIsTaskFormOpen,
    can
  } = useApp();

  const [activeView, setActiveView] = useState<TaskViewMode>('kanban');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false);

  // Sync hash routing for /app/tasks/my-tasks, /app/tasks/assigned, /app/tasks/overdue
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('my-tasks')) {
      setActiveView('my-tasks');
    } else if (hash.includes('pipeline') || hash.includes('workflows')) {
      setActiveView('pipeline');
    } else if (hash.includes('workload')) {
      setActiveView('workload');
    } else if (hash.includes('list')) {
      setActiveView('list');
    } else if (hash.includes('calendar')) {
      setActiveView('calendar');
    }
  }, []);

  const pendingCount = tasks.filter(t => t.status !== 'Completed' && t.status !== 'Done' && t.status !== 'Cancelled').length;

  return (
    <div className="w-full space-y-4 sm:space-y-5 pb-20">
      {/* Top Banner & Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center shadow-xs">
              <CheckSquare className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 font-display">
                  Production & Task Management
                </h1>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-800">
                  {pendingCount} Active
                </span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
                Photography production pipeline, culling, color grading, album review milestones & crew workloads.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsTemplateManagerOpen(true)}
          >
            <Settings className="w-3.5 h-3.5 mr-1.5" />
            Workflow Templates
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsTaskFormOpen(true)}
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Create Task
          </Button>
        </div>
      </div>

      {/* Navigation View Switcher Tabs (Touch-friendly for Mobile) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-zinc-200">
        {[
          { id: 'kanban', label: 'Kanban Board', icon: <Kanban className="w-4 h-4" /> },
          { id: 'list', label: 'List View', icon: <List className="w-4 h-4" /> },
          { id: 'my-tasks', label: 'My Tasks', icon: <UserCheck className="w-4 h-4" /> },
          { id: 'pipeline', label: 'Production Pipeline', icon: <Layers className="w-4 h-4" /> },
          { id: 'calendar', label: 'Calendar View', icon: <CalendarIcon className="w-4 h-4" /> },
          { id: 'workload', label: 'Team Workload', icon: <Users className="w-4 h-4" /> }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setActiveView(tab.id as TaskViewMode);
              window.location.hash = `#/app/tasks/${tab.id}`;
            }}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
              activeView === tab.id
                ? 'bg-zinc-900 text-white shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Render Active View */}
      <div className="min-h-[500px]">
        {activeView === 'kanban' && (
          <TaskKanbanBoard
            tasks={tasks}
            onSelectTask={id => setSelectedTaskId(id)}
            onUpdateStatus={(id, st) => updateTaskStatus(id, st)}
          />
        )}

        {activeView === 'list' && (
          <TaskListTable
            tasks={tasks}
            onSelectTask={id => setSelectedTaskId(id)}
            onUpdateStatus={(id, st) => updateTaskStatus(id, st)}
          />
        )}

        {activeView === 'my-tasks' && (
          <MyTasksView
            onSelectTask={id => setSelectedTaskId(id)}
            onUpdateStatus={(id, st) => updateTaskStatus(id, st)}
          />
        )}

        {activeView === 'pipeline' && (
          <WorkflowPipelineBoard
            onOpenTemplateManager={() => setIsTemplateManagerOpen(true)}
            onSelectTask={id => setSelectedTaskId(id)}
          />
        )}

        {activeView === 'calendar' && (
          <TaskCalendarView
            tasks={tasks}
            onSelectTask={id => setSelectedTaskId(id)}
          />
        )}

        {activeView === 'workload' && (
          <TeamWorkloadView
            onSelectTask={id => setSelectedTaskId(id)}
          />
        )}
      </div>

      {/* Task Detail Modal */}
      <TaskDetailModal
        taskId={selectedTaskId}
        isOpen={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
      />

      {/* Workflow Template Manager Modal */}
      <WorkflowTemplateManagerModal
        isOpen={isTemplateManagerOpen}
        onClose={() => setIsTemplateManagerOpen(false)}
      />
    </div>
  );
};
