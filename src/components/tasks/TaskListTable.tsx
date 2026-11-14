import React, { useState, useMemo } from 'react';
import { Task, TaskStatus } from '../../types';
import { taskDependencyService } from '../../services/taskDependencyService';
import { 
  Search, 
  ArrowUpDown, 
  User, 
  Calendar, 
  Lock, 
  AlertCircle, 
  CheckCircle2, 
  CheckSquare 
} from 'lucide-react';

interface TaskListTableProps {
  tasks: Task[];
  onSelectTask: (taskId: string) => void;
  onUpdateStatus: (taskId: string, newStatus: TaskStatus) => void;
}

export const TaskListTable: React.FC<TaskListTableProps> = ({
  tasks,
  onSelectTask,
  onUpdateStatus
}) => {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'title' | 'status'>('dueDate');
  const [sortAsc, setSortAsc] = useState(true);

  const today = new Date().toISOString().split('T')[0];

  const filteredTasks = useMemo(() => {
    let result = tasks.filter(t => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        (t.taskNumber && t.taskNumber.toLowerCase().includes(q)) ||
        (t.eventName && t.eventName.toLowerCase().includes(q)) ||
        t.assignedToName.toLowerCase().includes(q)
      );
    });

    result.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'dueDate') cmp = a.dueDate.localeCompare(b.dueDate);
      if (sortBy === 'title') cmp = a.title.localeCompare(b.title);
      if (sortBy === 'status') cmp = a.status.localeCompare(b.status);
      if (sortBy === 'priority') {
        const pOrder: Record<string, number> = { Urgent: 4, High: 3, Medium: 2, Low: 1 };
        cmp = (pOrder[b.priority] || 0) - (pOrder[a.priority] || 0);
      }
      return sortAsc ? cmp : -cmp;
    });

    return result;
  }, [tasks, search, sortBy, sortAsc]);

  const toggleSort = (col: 'dueDate' | 'priority' | 'title' | 'status') => {
    if (sortBy === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(col);
      setSortAsc(true);
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-xs overflow-hidden flex flex-col">
      {/* Search Header */}
      <div className="p-3.5 border-b border-zinc-200/80 bg-zinc-50/50 flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search tasks, deliverables, shoots, assignees..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
          />
        </div>
        <span className="text-xs font-semibold text-zinc-500">
          Showing {filteredTasks.length} of {tasks.length} tasks
        </span>
      </div>

      {/* Table Body */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase tracking-wider font-semibold text-[11px] select-none">
            <tr>
              <th className="py-3 px-4">Task Number</th>
              <th className="py-3 px-4 cursor-pointer" onClick={() => toggleSort('title')}>
                <div className="flex items-center gap-1">Task Title <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th className="py-3 px-4">Event & Stage</th>
              <th className="py-3 px-4">Assignee</th>
              <th className="py-3 px-4 cursor-pointer" onClick={() => toggleSort('priority')}>
                <div className="flex items-center gap-1">Priority <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th className="py-3 px-4 cursor-pointer" onClick={() => toggleSort('status')}>
                <div className="flex items-center gap-1">Status <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th className="py-3 px-4 cursor-pointer" onClick={() => toggleSort('dueDate')}>
                <div className="flex items-center gap-1">Due Date <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th className="py-3 px-4">Checklist</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filteredTasks.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-zinc-400">
                  No tasks found matching your criteria.
                </td>
              </tr>
            ) : (
              filteredTasks.map(task => {
                const isBlocked = taskDependencyService.isTaskBlocked(task, tasks);
                const isOverdue = task.dueDate < today && task.status !== 'Completed' && task.status !== 'Done';
                const checklistTotal = task.checklist?.length || 0;
                const checklistDone = task.checklist?.filter(c => c.completed).length || 0;
                const checklistPercent = checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0;

                return (
                  <tr
                    key={task.id}
                    onClick={() => onSelectTask(task.id)}
                    className="hover:bg-zinc-50/80 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-zinc-700">
                      {task.taskNumber || task.id.slice(-6)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-zinc-900 line-clamp-1">{task.title}</div>
                      {isBlocked.blocked && (
                        <span className="text-[10px] text-rose-600 font-bold flex items-center gap-1 mt-0.5">
                          <Lock className="w-2.5 h-2.5" /> Blocked by prerequisites
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-zinc-600">
                      <div className="line-clamp-1 font-medium">{task.eventName || 'Studio Internal'}</div>
                      {task.workflowStageName && (
                        <div className="text-[10px] text-indigo-700 font-semibold">{task.workflowStageName}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-zinc-800 font-medium">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-zinc-400" />
                        <span>{task.assignedToName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        task.priority === 'Urgent' ? 'bg-rose-100 text-rose-800' :
                        task.priority === 'High' ? 'bg-amber-100 text-amber-800' :
                        'bg-zinc-100 text-zinc-700'
                      }`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        task.status === 'Completed' || task.status === 'Done' ? 'bg-emerald-100 text-emerald-800' :
                        task.status === 'Under Review' ? 'bg-purple-100 text-purple-800' :
                        task.status === 'Revision Required' ? 'bg-rose-100 text-rose-800' :
                        task.status === 'In Progress' ? 'bg-amber-100 text-amber-800' :
                        'bg-zinc-100 text-zinc-700'
                      }`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`font-semibold ${isOverdue ? 'text-rose-600 font-bold' : 'text-zinc-700'}`}>
                        {task.dueDate}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {checklistTotal > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-zinc-200 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-emerald-600 h-1.5 rounded-full" style={{ width: `${checklistPercent}%` }} />
                          </div>
                          <span className="font-mono text-[10px] text-zinc-500">{checklistDone}/{checklistTotal}</span>
                        </div>
                      ) : (
                        <span className="text-zinc-400 text-[11px]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
