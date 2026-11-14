import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { EmployeeWorkloadItem } from '../../services/taskService';
import { Button } from '../ui/Button';
import { 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  ArrowRightLeft, 
  Briefcase,
  UserCheck
} from 'lucide-react';

interface TeamWorkloadViewProps {
  onSelectTask: (taskId: string) => void;
}

export const TeamWorkloadView: React.FC<TeamWorkloadViewProps> = ({
  onSelectTask
}) => {
  const { teamWorkload, tasks, reassignTask, employees } = useApp();
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);
  const [reassignTaskId, setReassignTaskId] = useState<string | null>(null);
  const [targetEmployeeId, setTargetEmployeeId] = useState('');

  const selectedEmp = teamWorkload.find(e => e.employeeId === selectedEmpId);
  const selectedEmpTasks = tasks.filter(t => t.assignedToId === selectedEmpId && t.status !== 'Completed' && t.status !== 'Done');

  const handleReassign = (taskId: string) => {
    if (!targetEmployeeId) return;
    const target = employees.find(e => e.id === targetEmployeeId);
    if (!target) return;

    reassignTask(taskId, target.id, target.fullName, 'Workload load-balancing reassignment');
    setReassignTaskId(null);
  };

  return (
    <div className="space-y-5">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {teamWorkload.map(item => {
          return (
            <div
              key={item.employeeId}
              onClick={() => setSelectedEmpId(item.employeeId === selectedEmpId ? null : item.employeeId)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs ${
                item.isOverloaded 
                  ? 'border-rose-200 bg-rose-50/30' 
                  : selectedEmpId === item.employeeId
                  ? 'border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-600/20'
                  : 'border-zinc-200 bg-white hover:border-zinc-300'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-zinc-900">{item.employeeName}</h4>
                  <p className="text-xs text-zinc-500">{item.designation} • {item.department}</p>
                </div>
                {item.isOverloaded && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 flex items-center gap-1 shrink-0">
                    <AlertTriangle className="w-3 h-3" /> Overloaded
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-zinc-100 text-center text-xs">
                <div className="p-2 rounded-lg bg-zinc-50 border border-zinc-100">
                  <div className="font-black text-zinc-900 text-base">{item.totalActiveTasks}</div>
                  <div className="text-[10px] text-zinc-500 font-medium">Active</div>
                </div>
                <div className="p-2 rounded-lg bg-amber-50/50 border border-amber-100">
                  <div className="font-black text-amber-800 text-base">{item.inProgressTasks}</div>
                  <div className="text-[10px] text-amber-700 font-medium">In Progress</div>
                </div>
                <div className="p-2 rounded-lg bg-rose-50/50 border border-rose-100">
                  <div className="font-black text-rose-800 text-base">{item.overdueTasks}</div>
                  <div className="text-[10px] text-rose-700 font-medium">Overdue</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Employee Task Breakdown & Reassignment Drawer */}
      {selectedEmp && (
        <div className="p-5 rounded-2xl border border-zinc-200 bg-white shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <div>
              <h3 className="text-base font-bold text-zinc-900">
                Active Workload for {selectedEmp.employeeName} ({selectedEmpTasks.length} tasks)
              </h3>
              <p className="text-xs text-zinc-500">
                Select a task to view details or reassign to balance team capacity.
              </p>
            </div>
            <button
              onClick={() => setSelectedEmpId(null)}
              className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 cursor-pointer"
            >
              Close
            </button>
          </div>

          <div className="space-y-2">
            {selectedEmpTasks.length === 0 ? (
              <div className="text-center py-6 text-zinc-400 text-xs italic">
                No active tasks assigned. Capacity available.
              </div>
            ) : (
              selectedEmpTasks.map(task => (
                <div
                  key={task.id}
                  className="p-3 rounded-xl border border-zinc-200 bg-zinc-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div 
                    onClick={() => onSelectTask(task.id)}
                    className="cursor-pointer min-w-0"
                  >
                    <div className="font-bold text-zinc-900 hover:text-indigo-600 truncate">{task.title}</div>
                    <div className="text-zinc-500 mt-0.5">Due: {task.dueDate} • {task.priority} Priority</div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {reassignTaskId === task.id ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={targetEmployeeId}
                          onChange={e => setTargetEmployeeId(e.target.value)}
                          className="px-2 py-1 text-xs rounded border border-zinc-300 bg-white"
                        >
                          <option value="">Reassign to...</option>
                          {employees.filter(e => e.id !== selectedEmpId).map(e => (
                            <option key={e.id} value={e.id}>{e.fullName} ({e.designation})</option>
                          ))}
                        </select>
                        <Button size="xs" variant="primary" onClick={() => handleReassign(task.id)}>
                          Move
                        </Button>
                        <Button size="xs" variant="outline" onClick={() => setReassignTaskId(null)}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => setReassignTaskId(task.id)}
                      >
                        <ArrowRightLeft className="w-3 h-3 mr-1" /> Reassign
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
