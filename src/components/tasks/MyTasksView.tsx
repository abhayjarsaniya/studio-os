import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Task, TaskStatus } from '../../types';
import { taskDependencyService } from '../../services/taskDependencyService';
import { 
  CheckSquare, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  Lock, 
  CheckCircle, 
  User, 
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface MyTasksViewProps {
  onSelectTask: (taskId: string) => void;
  onUpdateStatus: (taskId: string, newStatus: TaskStatus) => void;
}

export const MyTasksView: React.FC<MyTasksViewProps> = ({
  onSelectTask,
  onUpdateStatus
}) => {
  const { tasks, currentUser, employees } = useApp();
  const [activeSection, setActiveSection] = useState<'today' | 'overdue' | 'review' | 'blocked' | 'upcoming' | 'completed'>('today');

  const today = new Date().toISOString().split('T')[0];

  // Match current active employee ID
  const activeEmp = employees.find(e => 
    e.id === currentUser.id || 
    e.userId === currentUser.id || 
    e.fullName.toLowerCase().includes(currentUser.name.toLowerCase())
  );
  const employeeId = activeEmp ? activeEmp.id : currentUser.id;

  // Filter tasks belonging to this user
  const myTasks = tasks.filter(t => 
    t.assignedToId === employeeId || 
    (t.collaboratorIds || []).includes(employeeId) ||
    currentUser.role === 'owner' // Studio owner can see all
  );

  const overdueTasks = myTasks.filter(t => t.dueDate < today && t.status !== 'Completed' && t.status !== 'Done');
  const todayTasks = myTasks.filter(t => t.dueDate === today && t.status !== 'Completed' && t.status !== 'Done');
  const reviewTasks = myTasks.filter(t => t.status === 'Under Review');
  const blockedTasks = myTasks.filter(t => taskDependencyService.isTaskBlocked(t, tasks).blocked && t.status !== 'Completed' && t.status !== 'Done');
  const upcomingTasks = myTasks.filter(t => t.dueDate > today && t.status !== 'Completed' && t.status !== 'Done');
  const completedTasks = myTasks.filter(t => t.status === 'Completed' || t.status === 'Done');

  const getSectionList = () => {
    switch (activeSection) {
      case 'today': return todayTasks;
      case 'overdue': return overdueTasks;
      case 'review': return reviewTasks;
      case 'blocked': return blockedTasks;
      case 'upcoming': return upcomingTasks;
      case 'completed': return completedTasks;
    }
  };

  const list = getSectionList();

  return (
    <div className="space-y-5">
      {/* Overview Metric Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { id: 'today', label: "Today's Tasks", count: todayTasks.length, color: 'border-zinc-300 bg-white text-zinc-900' },
          { id: 'overdue', label: 'Overdue Alert', count: overdueTasks.length, color: 'border-rose-200 bg-rose-50 text-rose-900' },
          { id: 'review', label: 'Under Review', count: reviewTasks.length, color: 'border-purple-200 bg-purple-50 text-purple-900' },
          { id: 'blocked', label: 'Blocked Tasks', count: blockedTasks.length, color: 'border-amber-200 bg-amber-50 text-amber-900' },
          { id: 'upcoming', label: 'Upcoming', count: upcomingTasks.length, color: 'border-blue-200 bg-blue-50 text-blue-900' },
          { id: 'completed', label: 'Completed', count: completedTasks.length, color: 'border-emerald-200 bg-emerald-50 text-emerald-900' }
        ].map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveSection(item.id as any)}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer shadow-2xs ${item.color} ${
              activeSection === item.id ? 'ring-2 ring-zinc-900 shadow-xs' : 'hover:opacity-90'
            }`}
          >
            <div className="text-xl sm:text-2xl font-black">{item.count}</div>
            <div className="text-xs font-semibold mt-0.5">{item.label}</div>
          </button>
        ))}
      </div>

      {/* Task List for Active Section */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <h3 className="text-sm font-bold text-zinc-900 capitalize">
            {activeSection} Tasks ({list.length})
          </h3>
          <span className="text-xs text-zinc-500">
            Personalized for {activeEmp ? activeEmp.fullName : currentUser.name}
          </span>
        </div>

        {list.length === 0 ? (
          <div className="text-center py-12 text-zinc-400 text-xs flex flex-col items-center gap-2">
            <CheckCircle className="w-8 h-8 text-emerald-500/50" />
            <span>No tasks in this category. You are all caught up!</span>
          </div>
        ) : (
          <div className="space-y-2.5">
            {list.map(task => {
              const isBlocked = taskDependencyService.isTaskBlocked(task, tasks);
              const isDone = task.status === 'Completed' || task.status === 'Done';

              return (
                <div
                  key={task.id}
                  onClick={() => onSelectTask(task.id)}
                  className="p-3.5 rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {task.taskNumber && (
                        <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700">
                          {task.taskNumber}
                        </span>
                      )}
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded uppercase ${
                        task.priority === 'Urgent' ? 'bg-rose-100 text-rose-800' :
                        task.priority === 'High' ? 'bg-amber-100 text-amber-800' :
                        'bg-zinc-100 text-zinc-600'
                      }`}>
                        {task.priority}
                      </span>
                      {isBlocked.blocked && !isDone && (
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" /> Blocked
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-zinc-900 mt-1 truncate">
                      {task.title}
                    </h4>

                    {(task.eventName || task.workflowStageName) && (
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {task.eventName} {task.workflowStageName ? `• ${task.workflowStageName}` : ''}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                    <div className="text-right text-xs">
                      <div className="font-semibold text-zinc-800 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-zinc-400" /> Due: {task.dueDate}
                      </div>
                      <div className="text-xs text-zinc-400">
                        {task.checklist?.length ? `${task.checklist.filter(c => c.completed).length}/${task.checklist.length} checklist items` : ''}
                      </div>
                    </div>

                    {!isDone ? (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          onUpdateStatus(task.id, 'Completed');
                        }}
                        disabled={isBlocked.blocked}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Complete
                      </button>
                    ) : (
                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle className="w-4 h-4 text-emerald-600" /> Done
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
