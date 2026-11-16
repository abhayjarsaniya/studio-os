import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { LeaveRequest } from '../types';
import { 
  Calendar, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle, 
  Users, 
  CalendarDays, 
  UserCheck, 
  Sparkles,
  Check,
  X
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { LeaveApplyModal } from '../components/leave/LeaveApplyModal';

export const LeavePage: React.FC = () => {
  const { 
    leaveRequests, 
    leaveTypes, 
    approveLeave, 
    rejectLeave, 
    cancelLeave, 
    getLeaveBalance, 
    employeesOnLeaveToday, 
    upcomingLeaves, 
    employees, 
    currentUser, 
    hasPermission 
  } = useApp();

  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);
  const [rejectionRemarks, setRejectionRemarks] = useState('');
  const [activeTab, setActiveTab] = useState<'my_leaves' | 'admin_approvals' | 'calendar' | 'balances'>('my_leaves');

  const currentEmp = employees.find(e => e.userId === currentUser.id || e.id === currentUser.id) || employees[0];
  const myLeaves = currentEmp ? leaveRequests.filter(l => l.employeeId === currentEmp.id) : [];
  const myBalance = currentEmp ? getLeaveBalance(currentEmp.id) : null;

  const pendingRequests = leaveRequests.filter(l => l.status === 'pending');
  const canApprove = hasPermission('leave', 'approve');

  const handleApprove = (id: string) => {
    approveLeave(id);
  };

  const handleConfirmReject = (id: string) => {
    if (!rejectionRemarks.trim()) return;
    rejectLeave(id, rejectionRemarks.trim());
    setRejectingRequestId(null);
    setRejectionRemarks('');
  };

  return (
    <div className="w-full space-y-4 sm:space-y-5 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 font-display">
              Studio Leave Management
            </h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              {leaveRequests.length} Total Records
            </span>
          </div>
        </div>

        <Button
          variant="primary"
          size="sm"
          className="bg-zinc-900 text-white self-start sm:self-auto cursor-pointer"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setIsApplyModalOpen(true)}
        >
          Apply for Leave
        </Button>
      </div>

      {/* Employees on Leave Today Banner */}
      {employeesOnLeaveToday.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-bold text-amber-900">
                {employeesOnLeaveToday.length} Crew Member(s) on Leave Today:
              </p>
              <p className="text-amber-800">
                {employeesOnLeaveToday.map(e => `${e.employeeName} (${e.leaveTypeName})`).join(', ')}
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded-lg shrink-0">
            Scheduling Restricted
          </span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200 text-xs font-semibold overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('my_leaves')}
          className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer ${
            activeTab === 'my_leaves'
              ? 'border-zinc-900 text-zinc-900'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          My Leave & Balances
        </button>

        {canApprove && (
          <button
            onClick={() => setActiveTab('admin_approvals')}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'admin_approvals'
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <span>Admin Approvals</span>
            {pendingRequests.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-xs font-bold">
                {pendingRequests.length}
              </span>
            )}
          </button>
        )}

        <button
          onClick={() => setActiveTab('calendar')}
          className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer ${
            activeTab === 'calendar'
              ? 'border-zinc-900 text-zinc-900'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          Upcoming Leaves & Calendar
        </button>

        {canApprove && (
          <button
            onClick={() => setActiveTab('balances')}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer ${
              activeTab === 'balances'
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            Team Leave Balances
          </button>
        )}
      </div>

      {/* Tab 1: My Leaves & Balances */}
      {activeTab === 'my_leaves' && (
        <div className="space-y-4">
          {/* My Leave Balances Cards */}
          {myBalance && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-white border border-zinc-200 space-y-1">
                <span className="text-xs font-bold text-zinc-400 uppercase">Annual Allowance</span>
                <p className="text-xl font-bold font-mono text-zinc-900">{myBalance.totalAllowed} Days</p>
                <p className="text-xs text-zinc-500">Allocated for 2026</p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-zinc-200 space-y-1">
                <span className="text-xs font-bold text-zinc-400 uppercase">Approved Used</span>
                <p className="text-xl font-bold font-mono text-zinc-700">{myBalance.totalUsed} Days</p>
                <p className="text-xs text-zinc-500">Deducted from balance</p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1">
                <span className="text-xs font-bold text-emerald-800 uppercase">Remaining Paid</span>
                <p className="text-xl font-bold font-mono text-emerald-700">{myBalance.totalRemaining} Days</p>
                <p className="text-xs text-emerald-600">Available to take</p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-zinc-200 space-y-1">
                <span className="text-xs font-bold text-zinc-400 uppercase">Categories</span>
                <p className="text-xl font-bold font-mono text-zinc-900">{myBalance.balances.length} Types</p>
                <p className="text-xs text-zinc-500">Casual, Sick, Emergency</p>
              </div>
            </div>
          )}

          {/* My Leave Requests List */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-zinc-200 space-y-3">
            <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider text-zinc-400">
              My Time-Off Requests ({myLeaves.length})
            </h3>

            {myLeaves.length === 0 ? (
              <p className="text-xs text-zinc-400 italic py-4 text-center">No time-off requests submitted yet.</p>
            ) : (
              <div className="space-y-2">
                {myLeaves.map(req => (
                  <div key={req.id} className="p-3.5 rounded-xl border border-zinc-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-zinc-900 text-sm">{req.leaveTypeName}</span>
                        <span className="text-zinc-400">•</span>
                        <span className="font-semibold text-zinc-700">{req.totalDays} {req.totalDays === 1 ? 'Day' : 'Days'}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                          req.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          req.status === 'rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                          req.status === 'cancelled' ? 'bg-zinc-100 text-zinc-500 border-zinc-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {req.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-zinc-500 mt-1">
                        {req.startDate} to {req.endDate}
                      </p>
                      <p className="text-zinc-600 mt-0.5 italic">
                        &ldquo;{req.reason}&rdquo;
                      </p>
                      {req.rejectionRemarks && (
                        <p className="text-rose-600 mt-1 font-semibold">
                          Rejection Reason: {req.rejectionRemarks}
                        </p>
                      )}
                    </div>

                    {req.status === 'pending' && (
                      <Button
                        variant="outline"
                        size="xs"
                        className="text-rose-600 border-rose-200 hover:bg-rose-50 self-start sm:self-auto"
                        onClick={() => cancelLeave(req.id)}
                      >
                        Cancel Request
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Admin Approvals */}
      {activeTab === 'admin_approvals' && canApprove && (
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-zinc-200 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider text-zinc-400">
              Pending Time-Off Requests ({pendingRequests.length})
            </h3>
            <span className="text-xs text-zinc-500">Only approved requests reduce employee balances</span>
          </div>

          {pendingRequests.length === 0 ? (
            <div className="p-8 text-center text-zinc-400 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="text-xs font-semibold text-zinc-600">All leave requests have been reviewed!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map(req => (
                <div key={req.id} className="p-4 rounded-xl border border-zinc-200 bg-white space-y-3 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-zinc-900">{req.employeeName}</span>
                        <span className="text-zinc-400">•</span>
                        <span className="font-semibold text-indigo-600">{req.leaveTypeName}</span>
                      </div>
                      <p className="text-zinc-500 mt-0.5">
                        {req.startDate} to {req.endDate} ({req.totalDays} Days)
                      </p>
                      <p className="text-zinc-700 mt-1 italic bg-zinc-50 p-2.5 rounded-lg border border-zinc-100">
                        &ldquo;{req.reason}&rdquo;
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="primary"
                        size="xs"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        icon={<Check className="w-3.5 h-3.5" />}
                        onClick={() => handleApprove(req.id)}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="xs"
                        className="text-rose-600 border-rose-200 hover:bg-rose-50"
                        icon={<X className="w-3.5 h-3.5" />}
                        onClick={() => setRejectingRequestId(req.id)}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>

                  {rejectingRequestId === req.id && (
                    <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200 space-y-2">
                      <p className="font-semibold text-rose-800">Add Rejection Remarks:</p>
                      <input
                        type="text"
                        value={rejectionRemarks}
                        onChange={e => setRejectionRemarks(e.target.value)}
                        placeholder="e.g. Clashes with critical Singhania Wedding Baraat shoot"
                        className="w-full px-3 py-1.5 rounded-xl border border-rose-300 text-xs bg-white"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="xs" onClick={() => setRejectingRequestId(null)}>
                          Cancel
                        </Button>
                        <Button
                          variant="danger"
                          size="xs"
                          onClick={() => handleConfirmReject(req.id)}
                        >
                          Confirm Rejection
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Calendar & Upcoming Leaves */}
      {activeTab === 'calendar' && (
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-zinc-200 space-y-3">
          <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider text-zinc-400">
            Approved Upcoming Leaves ({upcomingLeaves.length})
          </h3>

          {upcomingLeaves.length === 0 ? (
            <p className="text-xs text-zinc-400 italic py-6 text-center">No upcoming approved leaves scheduled.</p>
          ) : (
            <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-xl overflow-hidden">
              {upcomingLeaves.map(l => (
                <div key={l.id} className="p-3.5 flex items-center justify-between text-xs bg-white">
                  <div>
                    <p className="font-bold text-zinc-900">{l.employeeName}</p>
                    <p className="text-zinc-500">{l.leaveTypeName} • {l.totalDays} Days</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-zinc-800">{l.startDate} to {l.endDate}</p>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      APPROVED
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Team Leave Balances */}
      {activeTab === 'balances' && canApprove && (
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-zinc-200 space-y-3">
          <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider text-zinc-400">
            Annual Crew Leave Balances (2026)
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase text-xs">
                <tr>
                  <th className="p-3">Employee</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Total Allowed</th>
                  <th className="p-3">Approved Used</th>
                  <th className="p-3">Remaining Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {employees.map(emp => {
                  const bal = getLeaveBalance(emp.id);
                  return (
                    <tr key={emp.id} className="hover:bg-zinc-50/50">
                      <td className="p-3 font-bold text-zinc-900">{emp.fullName}</td>
                      <td className="p-3 text-zinc-500">{emp.department}</td>
                      <td className="p-3 font-mono">{bal.totalAllowed} Days</td>
                      <td className="p-3 font-mono text-zinc-600">{bal.totalUsed} Days</td>
                      <td className="p-3 font-mono font-bold text-emerald-600">{bal.totalRemaining} Days</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Apply Leave Modal */}
      <LeaveApplyModal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
      />
    </div>
  );
};
