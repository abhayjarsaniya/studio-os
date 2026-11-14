import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Task, TaskStatus } from '../../types';
import { taskDependencyService } from '../../services/taskDependencyService';
import { Button } from '../ui/Button';
import { 
  X, 
  CheckSquare, 
  Calendar, 
  Clock, 
  User, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Plus, 
  Paperclip, 
  MessageSquare, 
  ShieldAlert, 
  Send, 
  ArrowRight, 
  Lock,
  Layers,
  FileText
} from 'lucide-react';

interface TaskDetailModalProps {
  taskId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  taskId,
  isOpen,
  onClose
}) => {
  const { 
    tasks, 
    updateTaskStatus, 
    addChecklistItem, 
    toggleChecklistItem, 
    addComment, 
    addAttachment, 
    submitTaskForReview, 
    approveTask, 
    rejectTask, 
    reassignTask,
    employees,
    currentUser,
    can
  } = useApp();

  const [activeTab, setActiveTab] = useState<'overview' | 'checklist' | 'dependencies' | 'attachments' | 'comments'>('overview');
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(true);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [isReassigning, setIsReassigning] = useState(false);
  const [selectedNewAssignee, setSelectedNewAssignee] = useState('');
  const [reassignReason, setReassignReason] = useState('');

  if (!isOpen || !taskId) return null;

  const task = tasks.find(t => t.id === taskId);
  if (!task) return null;

  const isBlocked = taskDependencyService.isTaskBlocked(task, tasks);
  const downstreamImpact = taskDependencyService.getDownstreamImpactedTasks(task, tasks);

  const checklistItems = task.checklist || [];
  const completedChecklistCount = checklistItems.filter(i => i.completed).length;
  const checklistPercentage = checklistItems.length > 0 ? Math.round((completedChecklistCount / checklistItems.length) * 100) : 0;

  const handleAddChecklist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistTitle.trim()) return;
    addChecklistItem(task.id, newChecklistTitle.trim());
    setNewChecklistTitle('');
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    addComment(task.id, newCommentText.trim(), isInternalComment);
    setNewCommentText('');
  };

  const handleApprove = () => {
    approveTask(task.id, reviewNotes || 'Approved by reviewer');
    setReviewNotes('');
  };

  const handleReject = () => {
    if (!reviewNotes.trim()) {
      alert('Please provide revision remarks describing what needs correction.');
      return;
    }
    rejectTask(task.id, reviewNotes.trim());
    setIsRejecting(false);
    setReviewNotes('');
  };

  const handleReassign = () => {
    if (!selectedNewAssignee) return;
    const targetEmp = employees.find(e => e.id === selectedNewAssignee);
    if (!targetEmp) return;
    reassignTask(task.id, targetEmp.id, targetEmp.fullName, reassignReason);
    setIsReassigning(false);
    setReassignReason('');
  };

  const isCompleted = task.status === 'Completed' || task.status === 'Done';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden my-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 bg-zinc-50/70 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {task.taskNumber && (
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-zinc-200 text-zinc-800">
                  {task.taskNumber}
                </span>
              )}
              {task.workflowStageName && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 flex items-center gap-1">
                  <Layers className="w-3 h-3" /> {task.workflowStageName}
                </span>
              )}
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase ${
                task.priority === 'Urgent' ? 'bg-rose-100 text-rose-800' :
                task.priority === 'High' ? 'bg-amber-100 text-amber-800' :
                'bg-zinc-100 text-zinc-700'
              }`}>
                {task.priority} Priority
              </span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase ${
                task.status === 'Completed' || task.status === 'Done' ? 'bg-emerald-100 text-emerald-800' :
                task.status === 'Under Review' ? 'bg-purple-100 text-purple-800' :
                task.status === 'Revision Required' ? 'bg-rose-100 text-rose-800' :
                task.status === 'In Progress' ? 'bg-amber-100 text-amber-800' :
                'bg-zinc-100 text-zinc-700'
              }`}>
                {task.status}
              </span>
            </div>
            <h2 className="text-base sm:text-xl font-bold text-zinc-900 mt-1.5 truncate">
              {task.title}
            </h2>
            {(task.eventName || task.subEventName) && (
              <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1">
                <span>Linked to:</span>
                <span className="font-semibold text-zinc-700">{task.eventName}</span>
                {task.subEventName && <span>• {task.subEventName}</span>}
              </p>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Blocked Alert Banner */}
        {isBlocked.blocked && !isCompleted && (
          <div className="px-5 py-2.5 bg-rose-50 border-b border-rose-200 text-xs text-rose-900 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              <strong>Task Blocked:</strong> Prerequisite task(s) incomplete: {isBlocked.blockingTasks.map(t => t.title).join(', ')}.
            </span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-200 px-4 bg-white overflow-x-auto scrollbar-none">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'checklist', label: `Checklist (${completedChecklistCount}/${checklistItems.length})` },
            { id: 'dependencies', label: `Dependencies (${task.dependencies?.length || 0})` },
            { id: 'attachments', label: `Attachments (${task.attachments?.length || 0})` },
            { id: 'comments', label: `Comments (${task.comments?.length || 0})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'border-zinc-900 text-zinc-900'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* 1. OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {task.description && (
                <div>
                  <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                    Task Description & Brief
                  </h4>
                  <p className="text-sm text-zinc-700 leading-relaxed bg-zinc-50 p-3.5 rounded-xl border border-zinc-200/80">
                    {task.description}
                  </p>
                </div>
              )}

              {/* Meta Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl border border-zinc-200 bg-white">
                  <span className="text-zinc-500 block mb-1">Assigned Crew Member</span>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-900 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-indigo-600" />
                      {task.assignedToName}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsReassigning(!isReassigning)}
                      className="text-indigo-600 font-semibold hover:underline cursor-pointer"
                    >
                      {isReassigning ? 'Cancel' : 'Reassign'}
                    </button>
                  </div>

                  {isReassigning && (
                    <div className="mt-2.5 pt-2.5 border-t border-zinc-100 space-y-2">
                      <select
                        value={selectedNewAssignee}
                        onChange={e => setSelectedNewAssignee(e.target.value)}
                        className="w-full px-2 py-1 text-xs rounded border border-zinc-200 bg-white"
                      >
                        <option value="">Select Employee...</option>
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.fullName} ({emp.designation})</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Reassignment reason (optional)..."
                        value={reassignReason}
                        onChange={e => setReassignReason(e.target.value)}
                        className="w-full px-2 py-1 text-xs rounded border border-zinc-200 bg-white"
                      />
                      <Button size="xs" variant="primary" onClick={handleReassign}>
                        Confirm Reassign
                      </Button>
                    </div>
                  )}
                </div>

                <div className="p-3 rounded-xl border border-zinc-200 bg-white">
                  <span className="text-zinc-500 block mb-1">Due Date & Timeline</span>
                  <div className="font-bold text-zinc-900 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-600" />
                    <span>Due: {task.dueDate}</span>
                    {task.estimatedDuration && (
                      <span className="text-zinc-400 font-normal ml-1">({task.estimatedDuration} hrs est.)</span>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-zinc-200 bg-white">
                  <span className="text-zinc-500 block mb-1">Department</span>
                  <span className="font-bold text-zinc-900">{task.department || 'Production'}</span>
                </div>

                <div className="p-3 rounded-xl border border-zinc-200 bg-white">
                  <span className="text-zinc-500 block mb-1">Approval Requirement</span>
                  <span className="font-semibold text-zinc-900">
                    {task.requiresApproval ? 'Mandatory Supervisor Signoff' : 'Standard Completion'}
                  </span>
                </div>
              </div>

              {/* Reviewer remarks if any */}
              {task.reviewNotes && (
                <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-950">
                  <div className="font-bold">Reviewer Remarks ({task.reviewerName || 'Admin'}):</div>
                  <p className="mt-1 italic">"{task.reviewNotes}"</p>
                </div>
              )}
            </div>
          )}

          {/* 2. CHECKLIST TAB */}
          {activeTab === 'checklist' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-700">Checklist Completion</span>
                <span className="font-bold text-zinc-900">{checklistPercentage}%</span>
              </div>
              <div className="w-full bg-zinc-200 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${checklistPercentage}%` }}
                />
              </div>

              {/* Items */}
              <div className="space-y-2">
                {checklistItems.length === 0 ? (
                  <div className="text-center py-8 text-zinc-400 text-xs">No checklist items defined.</div>
                ) : (
                  checklistItems.map(item => (
                    <div
                      key={item.id}
                      onClick={() => toggleChecklistItem(task.id, item.id)}
                      className="p-3 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 transition-colors flex items-center justify-between text-xs cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={item.completed}
                          onChange={() => {}}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <span className={`${item.completed ? 'line-through text-zinc-400' : 'text-zinc-800 font-medium'}`}>
                          {item.title}
                        </span>
                      </div>
                      {item.completedByName && (
                        <span className="text-[10px] text-zinc-400">
                          by {item.completedByName}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Add checklist item */}
              <form onSubmit={handleAddChecklist} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add new checklist requirement..."
                  value={newChecklistTitle}
                  onChange={e => setNewChecklistTitle(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-zinc-300 bg-white focus:outline-none"
                />
                <Button type="submit" size="sm" variant="primary">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Item
                </Button>
              </form>
            </div>
          )}

          {/* 3. DEPENDENCIES TAB */}
          {activeTab === 'dependencies' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2">
                  Prerequisite Tasks (Must be completed before this task)
                </h4>
                {(task.dependencies || []).length === 0 ? (
                  <div className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-500">
                    No prerequisites required. This task can be executed immediately.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(task.dependencies || []).map(depId => {
                      const depTask = tasks.find(t => t.id === depId);
                      const isDepDone = depTask?.status === 'Completed' || depTask?.status === 'Done';

                      return (
                        <div
                          key={depId}
                          className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                            isDepDone ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950' : 'bg-rose-50/60 border-rose-200 text-rose-950'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {isDepDone ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <Lock className="w-4 h-4 text-rose-600" />}
                            <span className="font-semibold">{depTask?.title || depId}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            isDepDone ? 'bg-emerald-200 text-emerald-800' : 'bg-rose-200 text-rose-800'
                          }`}>
                            {depTask?.status || 'Unknown'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Downstream Impact */}
              {downstreamImpact.length > 0 && (
                <div className="pt-3 border-t border-zinc-200">
                  <h4 className="text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2">
                    Downstream Dependent Tasks ({downstreamImpact.length})
                  </h4>
                  <p className="text-xs text-zinc-500 mb-2">
                    The following tasks depend on the completion of this task:
                  </p>
                  <div className="space-y-1.5">
                    {downstreamImpact.map(dt => (
                      <div key={dt.id} className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs flex items-center justify-between">
                        <span className="font-medium text-zinc-800">{dt.title}</span>
                        <span className="text-[10px] text-zinc-500">Due: {dt.dueDate}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4. ATTACHMENTS TAB */}
          {activeTab === 'attachments' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-700">Uploaded Assets & Documents</span>
                <button
                  type="button"
                  onClick={() => {
                    const name = prompt('Attachment title:');
                    if (name) {
                      addAttachment(task.id, {
                        name,
                        url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&auto=format&fit=crop&q=80',
                        fileType: 'image/jpeg'
                      });
                    }
                  }}
                  className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Upload File
                </button>
              </div>

              <div className="space-y-2">
                {(task.attachments || []).length === 0 ? (
                  <div className="text-center py-8 text-zinc-400 text-xs">No files attached yet.</div>
                ) : (
                  (task.attachments || []).map(att => (
                    <div
                      key={att.id}
                      className="p-3 rounded-xl border border-zinc-200 bg-white flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <Paperclip className="w-4 h-4 text-zinc-400 shrink-0" />
                        <div>
                          <div className="font-semibold text-zinc-800">{att.name}</div>
                          <div className="text-[10px] text-zinc-400">Uploaded on {new Date(att.uploadedAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 text-xs font-medium bg-zinc-100 hover:bg-zinc-200 rounded-lg text-zinc-700 transition-colors"
                      >
                        Preview
                      </a>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 5. COMMENTS TAB */}
          {activeTab === 'comments' && (
            <div className="space-y-4">
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {(task.comments || []).length === 0 ? (
                  <div className="text-center py-8 text-zinc-400 text-xs">No comments yet. Start the team discussion.</div>
                ) : (
                  (task.comments || []).map(comm => (
                    <div key={comm.id} className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs space-y-1">
                      <div className="flex items-center justify-between text-zinc-500">
                        <span className="font-bold text-zinc-800">{comm.authorName}</span>
                        <span className="text-[10px]">{new Date(comm.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-zinc-700">{comm.text}</p>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Write a team comment..."
                  value={newCommentText}
                  onChange={e => setNewCommentText(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-zinc-300 bg-white focus:outline-none"
                />
                <Button type="submit" size="sm" variant="primary">
                  <Send className="w-3.5 h-3.5 mr-1" /> Post
                </Button>
              </form>
            </div>
          )}
        </div>

        {/* Footer Actions Bar */}
        <div className="p-4 border-t border-zinc-200 bg-zinc-50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {!isCompleted && task.status !== 'Under Review' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => submitTaskForReview(task.id)}
              >
                Submit for Review
              </Button>
            )}

            {task.status === 'Under Review' && (
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleApprove}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve Work
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsRejecting(!isRejecting)}
                  className="text-rose-600 border-rose-200 hover:bg-rose-50"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1" /> Request Revision
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 justify-end">
            {!isCompleted ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => updateTaskStatus(task.id, 'Completed')}
                disabled={isBlocked.blocked}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle className="w-3.5 h-3.5 mr-1" /> Mark Complete
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateTaskStatus(task.id, 'In Progress')}
              >
                Reopen Task
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        {/* Rejection input popover if triggered */}
        {isRejecting && (
          <div className="p-4 bg-rose-50 border-t border-rose-200 space-y-2">
            <label className="block text-xs font-bold text-rose-900">
              Revision Notes (Explain required corrections to assignee):
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Skin tones look too warm on bridal portraits; please reduce magenta by 10%."
              value={reviewNotes}
              onChange={e => setReviewNotes(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-rose-300 bg-white focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <Button size="xs" variant="outline" onClick={() => setIsRejecting(false)}>
                Cancel
              </Button>
              <Button size="xs" variant="primary" onClick={handleReject} className="bg-rose-600 hover:bg-rose-700">
                Send Revision Notice
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
