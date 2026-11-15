import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Employee, EmploymentStatus } from '../../types';
import { 
  X, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Briefcase, 
  ShieldCheck, 
  Key, 
  Lock, 
  Clock, 
  CheckCircle2, 
  CalendarDays, 
  Sparkles,
  Edit3,
  UserX,
  UserCheck
} from 'lucide-react';
import { Button } from '../ui/Button';

interface EmployeeDetailModalProps {
  employee: Employee | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (emp: Employee) => void;
}

export const EmployeeDetailModal: React.FC<EmployeeDetailModalProps> = ({
  employee,
  isOpen,
  onClose,
  onEdit
}) => {
  const { 
    events, 
    subEvents, 
    leaveRequests, 
    getLeaveBalance, 
    attendanceRecords,
    setEmploymentStatus,
    resetEmployeePassword,
    currentUser
  } = useApp();

  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'leaves' | 'attendance'>('overview');
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  if (!isOpen || !employee) return null;

  // Filter assigned events
  const assignedEvents = events.filter(e => 
    (e.assignedTeamIds || []).includes(employee.id) || 
    (e.assignedTeamIds || []).includes(employee.userId)
  );

  // Filter assigned sub-events
  const assignedSubEvents = subEvents.filter(s => 
    (s.assignedMemberIds || []).includes(employee.id) || 
    (s.assignedMemberIds || []).includes(employee.userId)
  );

  // Filter leaves
  const employeeLeaves = leaveRequests.filter(l => l.employeeId === employee.id);
  const leaveBalance = getLeaveBalance(employee.id);

  // Filter attendance
  const employeeAttendance = attendanceRecords.filter(a => a.employeeId === employee.id);

  const handleToggleStatus = () => {
    const nextStatus: EmploymentStatus = employee.employmentStatus === 'active' ? 'inactive' : 'active';
    setEmploymentStatus(employee.id, nextStatus);
    setMessage(`Status updated to ${nextStatus}.`);
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setMessage('Password must be at least 6 characters.');
      return;
    }
    resetEmployeePassword(employee.id, newPassword);
    setMessage('Password reset successfully.');
    setIsResetPasswordOpen(false);
    setNewPassword('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl border border-zinc-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-100 bg-zinc-50/50 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {employee.profilePhoto ? (
              <img
                src={employee.profilePhoto}
                alt={employee.fullName}
                className="w-12 h-12 rounded-2xl object-cover border border-zinc-200 shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-zinc-900 text-white flex items-center justify-center font-bold text-base shrink-0">
                {employee.fullName.charAt(0)}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-semibold text-zinc-500 bg-white border border-zinc-200 px-2 py-0.5 rounded-md">
                  {employee.employeeNumber}
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                  employee.employmentStatus === 'active'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                }`}>
                  {employee.employmentStatus.toUpperCase()}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-zinc-900 truncate">
                {employee.fullName}
              </h3>
              <p className="text-xs text-zinc-500 truncate">
                {employee.designation} • {employee.department}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-5 pt-3 border-b border-zinc-100 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-2.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'overview' 
                ? 'border-zinc-900 text-zinc-900' 
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            Overview & Credentials
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`pb-2.5 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'events' 
                ? 'border-zinc-900 text-zinc-900' 
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <span>Assigned Shoots</span>
            <span className="px-1.5 py-0.2 rounded-full bg-zinc-100 text-xs">
              {assignedEvents.length + assignedSubEvents.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('leaves')}
            className={`pb-2.5 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'leaves' 
                ? 'border-zinc-900 text-zinc-900' 
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <span>Leave History</span>
            <span className="px-1.5 py-0.2 rounded-full bg-zinc-100 text-xs">
              {employeeLeaves.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`pb-2.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'attendance' 
                ? 'border-zinc-900 text-zinc-900' 
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            Attendance Logs
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs sm:text-sm">
          {message && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
              {message}
            </div>
          )}

          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Contact info grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border border-zinc-200 bg-white space-y-1.5">
                  <div className="flex items-center gap-1.5 text-zinc-400 font-semibold text-xs">
                    <Mail className="w-3.5 h-3.5" /> Email
                  </div>
                  <p className="font-bold text-zinc-900">{employee.email}</p>
                </div>

                <div className="p-3 rounded-xl border border-zinc-200 bg-white space-y-1.5">
                  <div className="flex items-center gap-1.5 text-zinc-400 font-semibold text-xs">
                    <Phone className="w-3.5 h-3.5" /> Phone
                  </div>
                  <p className="font-bold text-zinc-900">{employee.phone}</p>
                </div>

                <div className="p-3 rounded-xl border border-zinc-200 bg-white space-y-1.5">
                  <div className="flex items-center gap-1.5 text-zinc-400 font-semibold text-xs">
                    <Calendar className="w-3.5 h-3.5" /> Joining Date
                  </div>
                  <p className="font-bold text-zinc-900">{employee.joiningDate}</p>
                </div>

                <div className="p-3 rounded-xl border border-zinc-200 bg-white space-y-1.5">
                  <div className="flex items-center gap-1.5 text-zinc-400 font-semibold text-xs">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" /> Assigned Role
                  </div>
                  <p className="font-bold text-zinc-900">{employee.roleName}</p>
                </div>
              </div>

              {/* Login Credentials Box */}
              <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-zinc-700" />
                    <div>
                      <h4 className="font-bold text-xs text-zinc-900">Admin-Controlled Credentials</h4>
                      <p className="text-xs text-zinc-500">
                        Login ID: <span className="font-mono font-semibold">{employee.loginCredentials?.loginId || employee.email}</span>
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="xs"
                    icon={<Key className="w-3 h-3" />}
                    onClick={() => setIsResetPasswordOpen(!isResetPasswordOpen)}
                  >
                    Reset Password
                  </Button>
                </div>

                {isResetPasswordOpen && (
                  <form onSubmit={handleResetPassword} className="pt-2 border-t border-zinc-200 flex items-center gap-2">
                    <input
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Min 6 character new password"
                      required
                      className="flex-1 px-3 py-1.5 rounded-xl border border-zinc-300 text-xs bg-white"
                    />
                    <Button type="submit" variant="primary" size="xs">
                      Update Password
                    </Button>
                  </form>
                )}
              </div>

              {/* Emergency Contact */}
              {employee.emergencyContact && employee.emergencyContact.name && (
                <div className="p-3 rounded-xl border border-zinc-200 bg-white space-y-1">
                  <p className="text-xs font-bold text-zinc-700">Emergency Contact</p>
                  <p className="text-xs text-zinc-900">
                    {employee.emergencyContact.name} ({employee.emergencyContact.relationship}) – {employee.emergencyContact.phone}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'events' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-zinc-700 mb-2">Main Events Assigned ({assignedEvents.length})</h4>
                {assignedEvents.length === 0 ? (
                  <p className="text-xs text-zinc-400 italic">No main events assigned.</p>
                ) : (
                  <div className="space-y-2">
                    {assignedEvents.map(e => (
                      <div key={e.id} className="p-3 rounded-xl border border-zinc-200 bg-white flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-zinc-900">{e.name}</p>
                          <p className="text-xs text-zinc-500">{e.startDate} • {e.venue}</p>
                        </div>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700">
                          {e.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-xs font-bold text-zinc-700 mb-2">Sub-Events & Ceremonies ({assignedSubEvents.length})</h4>
                {assignedSubEvents.length === 0 ? (
                  <p className="text-xs text-zinc-400 italic">No sub-events assigned.</p>
                ) : (
                  <div className="space-y-2">
                    {assignedSubEvents.map(s => (
                      <div key={s.id} className="p-3 rounded-xl border border-zinc-200 bg-white flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs text-zinc-500">{s.subEventNumber}</span>
                            <p className="text-xs font-bold text-zinc-900">{s.name}</p>
                          </div>
                          <p className="text-xs text-zinc-500">{s.date} • {s.startTime}–{s.endTime} • {s.venue}</p>
                        </div>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {s.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'leaves' && (
            <div className="space-y-3">
              {/* Balances summary */}
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-between text-xs">
                <span>Annual Leave Allowance: <strong>{leaveBalance.totalAllowed} Days</strong></span>
                <span>Used: <strong>{leaveBalance.totalUsed} Days</strong></span>
                <span className="text-emerald-700 font-bold">Remaining: {leaveBalance.totalRemaining} Days</span>
              </div>

              <div className="space-y-2">
                {employeeLeaves.length === 0 ? (
                  <p className="text-xs text-zinc-400 italic">No leave history recorded.</p>
                ) : (
                  employeeLeaves.map(l => (
                    <div key={l.id} className="p-3 rounded-xl border border-zinc-200 bg-white flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-zinc-900">{l.leaveTypeName} ({l.totalDays} Days)</p>
                        <p className="text-xs text-zinc-500">{l.startDate} to {l.endDate}</p>
                        <p className="text-xs text-zinc-600 italic">"{l.reason}"</p>
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                        l.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        l.status === 'rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {l.status.toUpperCase()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className="space-y-2">
              {employeeAttendance.length === 0 ? (
                <p className="text-xs text-zinc-400 italic">No attendance records logged.</p>
              ) : (
                employeeAttendance.map(att => (
                  <div key={att.id} className="p-2.5 rounded-xl border border-zinc-200 bg-white flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-zinc-900">{att.date}</p>
                      {att.checkIn && <p className="text-xs text-zinc-500">In: {att.checkIn} {att.checkOut ? `• Out: ${att.checkOut}` : ''}</p>}
                    </div>
                    <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-xs">
                      {att.status.toUpperCase()}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
          <Button
            variant="outline"
            size="xs"
            onClick={handleToggleStatus}
            icon={employee.employmentStatus === 'active' ? <UserX className="w-3.5 h-3.5 text-rose-500" /> : <UserCheck className="w-3.5 h-3.5 text-emerald-500" />}
          >
            {employee.employmentStatus === 'active' ? 'Deactivate Employee' : 'Reactivate Employee'}
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="xs" onClick={onClose}>
              Close
            </Button>
            <Button
              variant="primary"
              size="xs"
              className="bg-zinc-900 text-white"
              icon={<Edit3 className="w-3.5 h-3.5" />}
              onClick={() => {
                onClose();
                onEdit(employee);
              }}
            >
              Edit Profile
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
