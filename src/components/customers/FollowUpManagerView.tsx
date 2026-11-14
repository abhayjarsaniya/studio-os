import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { FollowUp, Employee } from '../../types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { followUpService } from '../../services/followUpService';
import { formatDate } from '../../utils/formatters';
import { 
  Calendar, 
  Clock, 
  User, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  MessageCircle, 
  Plus, 
  Search, 
  Filter, 
  RotateCw, 
  UserCheck, 
  CalendarClock,
  PhoneCall,
  Check,
  ChevronDown
} from 'lucide-react';

export const FollowUpManagerView: React.FC = () => {
  const { 
    followUps, 
    studio, 
    employees, 
    customers, 
    currentUser, 
    completeFollowUp, 
    rescheduleFollowUp, 
    reassignFollowUp, 
    createFollowUp,
    openWhatsAppModal,
    setSelectedCustomerId 
  } = useApp();

  const members = employees.map(e => ({ id: e.id, name: e.fullName, role: e.roleName || e.designation || 'Staff' }));

  const [filterTab, setFilterTab] = useState<'all' | 'today' | 'upcoming' | 'overdue' | 'completed'>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCustomerId, setNewCustomerId] = useState('');
  const [newDueDate, setNewDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [newDueTime, setNewDueTime] = useState('11:00');
  const [newReason, setNewReason] = useState('');
  const [newPriority, setNewPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [newAssigneeId, setNewAssigneeId] = useState(currentUser?.id || members[0]?.id || '');

  // Completion modal state
  const [completingFollowUp, setCompletingFollowUp] = useState<FollowUp | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');

  // Reschedule state
  const [reschedulingFollowUp, setReschedulingFollowUp] = useState<FollowUp | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('11:00');

  // Reassign state
  const [reassigningFollowUp, setReassigningFollowUp] = useState<FollowUp | null>(null);
  const [targetEmployeeId, setTargetEmployeeId] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  // Filtered follow-ups
  const filteredFollowUps = followUps.filter(f => {
    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = f.customerName.toLowerCase().includes(q);
      const matchReason = f.reason.toLowerCase().includes(q);
      const matchAssignee = (f.assignedEmployeeName || '').toLowerCase().includes(q);
      if (!matchName && !matchReason && !matchAssignee) return false;
    }

    // Assignee filter
    if (assigneeFilter === 'me') {
      if (f.assignedEmployeeId !== currentUser?.id) return false;
    } else if (assigneeFilter !== 'all' && f.assignedEmployeeId !== assigneeFilter) {
      return false;
    }

    // Tab filter
    if (filterTab === 'today') {
      return f.dueDate === todayStr && f.status === 'pending';
    }
    if (filterTab === 'upcoming') {
      return f.dueDate > todayStr && f.status === 'pending';
    }
    if (filterTab === 'overdue') {
      return f.dueDate < todayStr && f.status === 'pending';
    }
    if (filterTab === 'completed') {
      return f.status === 'completed';
    }

    return true;
  });

  // Calculate metrics
  const todayCount = followUps.filter(f => f.dueDate === todayStr && f.status === 'pending').length;
  const upcomingCount = followUps.filter(f => f.dueDate > todayStr && f.status === 'pending').length;
  const overdueCount = followUps.filter(f => f.dueDate < todayStr && f.status === 'pending').length;
  const completedCount = followUps.filter(f => f.status === 'completed').length;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find(c => c.id === newCustomerId);
    const assignee = members.find(m => m.id === newAssigneeId);

    createFollowUp({
      customerId: newCustomerId,
      customerName: cust ? cust.name : 'Client',
      customerPhone: cust ? cust.phone : '',
      assignedEmployeeId: newAssigneeId,
      assignedEmployeeName: assignee ? assignee.name : 'Assigned Member',
      dueDate: newDueDate,
      dueTime: newDueTime,
      reason: newReason,
      priority: newPriority,
      notes: ''
    });

    setIsCreateModalOpen(false);
    setNewReason('');
    setNewCustomerId('');
  };

  const handleConfirmCompletion = () => {
    if (!completingFollowUp) return;
    completeFollowUp(completingFollowUp.id, completionNotes);
    setCompletingFollowUp(null);
    setCompletionNotes('');
  };

  const handleConfirmReschedule = () => {
    if (!reschedulingFollowUp || !rescheduleDate) return;
    rescheduleFollowUp(reschedulingFollowUp.id, rescheduleDate, rescheduleTime);
    setReschedulingFollowUp(null);
  };

  const handleConfirmReassign = () => {
    if (!reassigningFollowUp || !targetEmployeeId) return;
    const targetMember = members.find(m => m.id === targetEmployeeId);
    if (!targetMember) return;
    reassignFollowUp(reassigningFollowUp.id, targetMember.id, targetMember.name);
    setReassigningFollowUp(null);
  };

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setFilterTab('today')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            filterTab === 'today' 
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 shadow-xs' 
              : 'bg-white border-zinc-200/80 hover:border-zinc-300 text-zinc-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Today's Due</span>
            <Calendar className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold font-display mt-2">{todayCount}</p>
          <p className="text-[11px] text-zinc-400 mt-0.5">Calls & follow-ups today</p>
        </button>

        <button
          onClick={() => setFilterTab('overdue')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            filterTab === 'overdue' 
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-900 shadow-xs' 
              : 'bg-white border-zinc-200/80 hover:border-zinc-300 text-zinc-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Overdue</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-bold font-display mt-2 text-rose-600">{overdueCount}</p>
          <p className="text-[11px] text-zinc-400 mt-0.5">Missed scheduled dates</p>
        </button>

        <button
          onClick={() => setFilterTab('upcoming')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            filterTab === 'upcoming' 
              ? 'bg-blue-500/10 border-blue-500/30 text-blue-900 shadow-xs' 
              : 'bg-white border-zinc-200/80 hover:border-zinc-300 text-zinc-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Upcoming</span>
            <CalendarClock className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold font-display mt-2">{upcomingCount}</p>
          <p className="text-[11px] text-zinc-400 mt-0.5">Scheduled future tasks</p>
        </button>

        <button
          onClick={() => setFilterTab('completed')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            filterTab === 'completed' 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 shadow-xs' 
              : 'bg-white border-zinc-200/80 hover:border-zinc-300 text-zinc-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold font-display mt-2 text-emerald-600">{completedCount}</p>
          <p className="text-[11px] text-zinc-400 mt-0.5">Successfully closed</p>
        </button>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-zinc-200/80 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tabs */}
          {(['all', 'today', 'upcoming', 'overdue', 'completed'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={`px-3 py-1.5 text-xs font-medium rounded-xl capitalize transition-all ${
                filterTab === tab
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              {tab === 'all' ? `All (${followUps.length})` : tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Assignee selector */}
          <select
            value={assigneeFilter}
            onChange={e => setAssigneeFilter(e.target.value)}
            className="text-xs font-medium bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
          >
            <option value="all">All Team Members</option>
            <option value="me">Assigned to Me</option>
            {members.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>

          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsCreateModalOpen(true)}
            className="shrink-0"
          >
            New Follow-Up
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          placeholder="Search by client name, reason, or assigned team member..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 min-h-[44px]"
        />
      </div>

      {/* Follow-up List */}
      {filteredFollowUps.length === 0 ? (
        <div className="bg-white border border-zinc-200/80 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto text-zinc-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-zinc-900 font-display">No follow-ups found</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            {search ? 'Try adjusting your search criteria.' : 'Great job! There are no pending follow-up reminders in this category.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFollowUps.map(fu => {
            const isCompleted = fu.status === 'completed';
            const isOverdue = fu.dueDate < todayStr && !isCompleted;
            const isToday = fu.dueDate === todayStr && !isCompleted;

            // Check if assigned member is on approved leave
            const isMemberOnLeave = fu.assignedEmployeeId 
              ? followUpService.isAssigneeOnLeave(studio.id, fu.assignedEmployeeId, fu.dueDate)
              : false;

            return (
              <div
                key={fu.id}
                className={`p-4 rounded-2xl bg-white border transition-all ${
                  isMemberOnLeave
                    ? 'border-amber-300 ring-1 ring-amber-300/50 bg-amber-50/10'
                    : isOverdue 
                    ? 'border-rose-200 hover:border-rose-300' 
                    : 'border-zinc-200/80 hover:border-zinc-300'
                } shadow-xs space-y-3`}
              >
                {/* Leave Warning Banner */}
                {isMemberOnLeave && (
                  <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 text-xs">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        <strong>Staff on Leave:</strong> {fu.assignedEmployeeName || 'Assignee'} is on approved leave on {fu.dueDate}. Please reassign.
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setReassigningFollowUp(fu);
                        setTargetEmployeeId('');
                      }}
                      className="font-semibold text-amber-800 underline hover:text-amber-950 text-xs ml-2 cursor-pointer"
                    >
                      Reassign Now
                    </button>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span 
                        onClick={() => setSelectedCustomerId(fu.customerId)}
                        className="font-bold text-sm text-zinc-900 hover:underline cursor-pointer"
                      >
                        {fu.customerName}
                      </span>
                      {fu.priority && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          fu.priority === 'High' 
                            ? 'bg-rose-100 text-rose-700' 
                            : fu.priority === 'Medium' 
                            ? 'bg-amber-100 text-amber-700' 
                            : 'bg-zinc-100 text-zinc-600'
                        }`}>
                          {fu.priority}
                        </span>
                      )}
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        isCompleted 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : isOverdue 
                          ? 'bg-rose-100 text-rose-700 font-bold' 
                          : isToday 
                          ? 'bg-amber-100 text-amber-800 font-bold' 
                          : 'bg-zinc-100 text-zinc-600'
                      }`}>
                        {isCompleted ? 'Completed' : isOverdue ? 'Overdue' : isToday ? 'Due Today' : 'Scheduled'}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-700 font-medium">{fu.reason}</p>
                    {fu.notes && (
                      <p className="text-[11px] text-zinc-400 italic">Notes: {fu.notes}</p>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {/* WhatsApp Action */}
                    <button
                      title="Quick WhatsApp message"
                      onClick={() => {
                        const targetCust = customers.find(c => c.id === fu.customerId) || null;
                        openWhatsAppModal({
                          customer: targetCust || ({
                            id: fu.customerId,
                            studioId: studio.id,
                            name: fu.customerName,
                            phone: fu.customerPhone || '',
                            email: '',
                            city: '',
                            address: '',
                            totalBookings: 0,
                            totalSpent: 0,
                            pendingBalance: 0,
                            status: 'Contacted',
                            createdAt: ''
                          } as any),
                          prefilledMessage: `Hello ${fu.customerName}, following up with you regarding: ${fu.reason}. Looking forward to connecting!`
                        });
                      }}
                      className="p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>

                    {/* Phone Call Action */}
                    {fu.customerPhone && (
                      <a
                        href={`tel:${fu.customerPhone}`}
                        title="Call Client"
                        className="p-2 rounded-xl bg-zinc-100 text-zinc-700 hover:bg-zinc-200 border border-zinc-200 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                      >
                        <PhoneCall className="w-4 h-4" />
                      </a>
                    )}

                    {!isCompleted && (
                      <>
                        {/* Reschedule Button */}
                        <button
                          title="Reschedule Follow-Up"
                          onClick={() => {
                            setReschedulingFollowUp(fu);
                            setRescheduleDate(fu.dueDate);
                            setRescheduleTime(fu.dueTime || '11:00');
                          }}
                          className="px-2.5 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-700 flex items-center gap-1.5 min-h-[44px]"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Reschedule</span>
                        </button>

                        {/* Reassign Button */}
                        <button
                          title="Reassign Follow-Up"
                          onClick={() => {
                            setReassigningFollowUp(fu);
                            setTargetEmployeeId(fu.assignedEmployeeId);
                          }}
                          className="px-2.5 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-700 flex items-center gap-1.5 min-h-[44px]"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Reassign</span>
                        </button>

                        {/* Complete Button */}
                        <Button
                          variant="primary"
                          size="sm"
                          icon={<Check className="w-3.5 h-3.5" />}
                          onClick={() => {
                            setCompletingFollowUp(fu);
                            setCompletionNotes('');
                          }}
                          className="min-h-[44px]"
                        >
                          Complete
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Footer metadata */}
                <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-zinc-100 text-[11px] text-zinc-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                    Due: <strong className="text-zinc-700">{formatDate(fu.dueDate)}</strong> {fu.dueTime && `at ${fu.dueTime}`}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-zinc-400" />
                    Assigned: <strong className="text-zinc-700">{fu.assignedEmployeeName || 'Unassigned'}</strong>
                  </span>
                  {fu.completedAt && (
                    <span className="text-emerald-600 font-medium">
                      Completed by {fu.completedBy} on {formatDate(fu.completedAt.split('T')[0])}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Follow-Up Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Schedule Follow-Up Reminder"
        subtitle="Set a dedicated task to call or message a client"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Select Client <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={newCustomerId}
              onChange={e => setNewCustomerId(e.target.value)}
              className="w-full text-xs bg-white border border-zinc-200 rounded-xl px-3 py-2.5 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 min-h-[44px]"
            >
              <option value="">-- Choose Customer --</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone || c.city || 'Client'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Follow-Up Reason <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Call client for quotation review and album selection"
              value={newReason}
              onChange={e => setNewReason(e.target.value)}
              className="w-full text-xs bg-white border border-zinc-200 rounded-xl px-3 py-2.5 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 min-h-[44px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Due Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={newDueDate}
                onChange={e => setNewDueDate(e.target.value)}
                className="w-full text-xs bg-white border border-zinc-200 rounded-xl px-3 py-2.5 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Time
              </label>
              <input
                type="time"
                value={newDueTime}
                onChange={e => setNewDueTime(e.target.value)}
                className="w-full text-xs bg-white border border-zinc-200 rounded-xl px-3 py-2.5 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 min-h-[44px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Assignee <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={newAssigneeId}
                onChange={e => setNewAssigneeId(e.target.value)}
                className="w-full text-xs bg-white border border-zinc-200 rounded-xl px-3 py-2.5 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 min-h-[44px]"
              >
                {members.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Priority
              </label>
              <select
                value={newPriority}
                onChange={e => setNewPriority(e.target.value as any)}
                className="w-full text-xs bg-white border border-zinc-200 rounded-xl px-3 py-2.5 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 min-h-[44px]"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Schedule Reminder
            </Button>
          </div>
        </form>
      </Modal>

      {/* Completion Modal */}
      <Modal
        isOpen={!!completingFollowUp}
        onClose={() => setCompletingFollowUp(null)}
        title="Complete Follow-Up"
        subtitle={completingFollowUp ? `Close follow-up with ${completingFollowUp.customerName}` : ''}
      >
        <div className="space-y-4">
          <p className="text-xs text-zinc-600">
            Record completion notes or customer response summary for the audit trail:
          </p>
          <textarea
            rows={3}
            placeholder="e.g. Spoke to client, confirmed album layout changes. Advancing to production."
            value={completionNotes}
            onChange={e => setCompletionNotes(e.target.value)}
            className="w-full text-xs bg-white border border-zinc-200 rounded-xl p-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCompletingFollowUp(null)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Check className="w-4 h-4" />}
              onClick={handleConfirmCompletion}
            >
              Mark Completed
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reschedule Modal */}
      <Modal
        isOpen={!!reschedulingFollowUp}
        onClose={() => setReschedulingFollowUp(null)}
        title="Reschedule Follow-Up"
        subtitle={reschedulingFollowUp ? `Adjust date for ${reschedulingFollowUp.customerName}` : ''}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              New Date
            </label>
            <input
              type="date"
              value={rescheduleDate}
              onChange={e => setRescheduleDate(e.target.value)}
              className="w-full text-xs bg-white border border-zinc-200 rounded-xl px-3 py-2.5 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 min-h-[44px]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              New Time
            </label>
            <input
              type="time"
              value={rescheduleTime}
              onChange={e => setRescheduleTime(e.target.value)}
              className="w-full text-xs bg-white border border-zinc-200 rounded-xl px-3 py-2.5 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 min-h-[44px]"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReschedulingFollowUp(null)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmReschedule}
            >
              Save New Date
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reassign Modal */}
      <Modal
        isOpen={!!reassigningFollowUp}
        onClose={() => setReassigningFollowUp(null)}
        title="Reassign Follow-Up"
        subtitle={reassigningFollowUp ? `Assign ${reassigningFollowUp.customerName} to another team member` : ''}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Select Team Member
            </label>
            <select
              value={targetEmployeeId}
              onChange={e => setTargetEmployeeId(e.target.value)}
              className="w-full text-xs bg-white border border-zinc-200 rounded-xl px-3 py-2.5 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 min-h-[44px]"
            >
              <option value="">-- Choose Member --</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.role})
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReassigningFollowUp(null)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!targetEmployeeId}
              onClick={handleConfirmReassign}
            >
              Confirm Reassignment
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
