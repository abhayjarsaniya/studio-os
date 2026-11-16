import React from 'react';
import { useApp } from '../../context/AppContext';
import { formatDate, formatTime } from '../../utils/formatters';
import { 
  CalendarDays, 
  Sparkles, 
  MapPin, 
  Clock, 
  CheckSquare, 
  Bell, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  Calendar,
  ExternalLink,
  Phone
} from 'lucide-react';
import { Button } from '../ui/Button';

export const EmployeeDashboardView: React.FC = () => {
  const { 
    currentUser, 
    events, 
    subEvents, 
    tasks, 
    notifications, 
    leaveRequests, 
    getLeaveBalance, 
    attendanceRecords,
    markAttendance,
    employees,
    navigateToEventDetail
  } = useApp();

  const currentEmp = employees.find(e => e.userId === currentUser.id || e.id === currentUser.id) || employees[0];
  const empId = currentEmp?.id || currentUser.id;

  // Assigned Main Events
  const myEvents = events.filter(e => 
    (e.assignedTeamIds || []).includes(empId) || 
    (e.assignedTeamIds || []).includes(currentUser.id)
  );

  // Assigned Sub-Events & Ceremonies
  const mySubEvents = subEvents.filter(s => 
    (s.assignedMemberIds || []).includes(empId) || 
    (s.assignedMemberIds || []).includes(currentUser.id)
  );

  // Today's Shoot Schedule
  const todayStr = new Date().toISOString().split('T')[0];
  const todayShoots = mySubEvents.filter(s => s.date === todayStr);

  // My Tasks
  const myTasks = tasks.filter(t => t.assignedToId === currentUser.id || t.assignedToId === empId);
  const pendingTasks = myTasks.filter(t => t.status !== 'Done');

  // Leave Balances
  const myBalance = currentEmp ? getLeaveBalance(currentEmp.id) : null;
  const myRecentLeaves = leaveRequests.filter(l => l.employeeId === empId).slice(0, 3);

  // Today's attendance
  const todayAttendance = attendanceRecords.find(a => a.employeeId === empId && a.date === todayStr);

  const handleMarkPresent = () => {
    const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    markAttendance({
      employeeId: empId,
      employeeName: currentEmp?.fullName || currentUser.name,
      date: todayStr,
      status: 'present',
      checkIn: nowTime
    });
  };

  return (
    <div className="space-y-4 sm:space-y-5 w-full">
      {/* Welcome Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white border border-zinc-200/90 text-zinc-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-800 border border-zinc-200">
              Crew Workspace
            </span>
            <span className="text-xs text-zinc-500 font-mono">
              {currentEmp?.designation || currentUser.roleTitle}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-display text-zinc-900">
            Welcome back, {currentEmp?.fullName || currentUser.name}
          </h2>
          <p className="text-xs text-zinc-500">
            Here is your daily call sheet, shoot schedule, assigned tasks and leave entitlements.
          </p>
        </div>

        {/* Quick Attendance Check-In Button */}
        <div className="shrink-0">
          {todayAttendance ? (
            <div className="px-4 py-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-semibold flex items-center gap-2 text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Checked In at {todayAttendance.checkIn}</span>
            </div>
          ) : (
            <button
              onClick={handleMarkPresent}
              className="px-5 min-h-[44px] py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Clock className="w-4 h-4" />
              <span>Mark Today's Attendance</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-zinc-200/90 shadow-xs space-y-1">
          <span className="text-xs font-bold text-zinc-400 uppercase">Assigned Shoots</span>
          <p className="text-xl font-bold font-mono text-zinc-900">{myEvents.length}</p>
          <p className="text-xs text-zinc-500">Active productions</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-zinc-200/90 shadow-xs space-y-1">
          <span className="text-xs font-bold text-zinc-400 uppercase">Sub-Event Calls</span>
          <p className="text-xl font-bold font-mono text-zinc-900">{mySubEvents.length}</p>
          <p className="text-xs text-zinc-500">Ceremonies on call sheet</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-zinc-200/90 shadow-xs space-y-1">
          <span className="text-xs font-bold text-zinc-400 uppercase">Pending Tasks</span>
          <p className="text-xl font-bold font-mono text-amber-600">{pendingTasks.length}</p>
          <p className="text-xs text-zinc-500">Action items assigned</p>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 shadow-xs space-y-1">
          <span className="text-xs font-bold text-emerald-800 uppercase">Leave Balance</span>
          <p className="text-xl font-bold font-mono text-emerald-700">{myBalance?.totalRemaining ?? 20} Days</p>
          <p className="text-xs text-emerald-600">Available time off</p>
        </div>
      </div>

      {/* Two Column Layout: Today's Call Sheet & Upcoming Sub-Events */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Call Sheet & Assigned Functions */}
        <div className="lg:col-span-7 space-y-4">
          {/* Today's Schedule Alert */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white border border-zinc-200/90 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Today&apos;s Shoot Call Sheet ({todayShoots.length})
              </h3>
              <span className="text-xs font-mono font-semibold text-zinc-600">{todayStr}</span>
            </div>

            {todayShoots.length === 0 ? (
              <p className="text-xs text-zinc-400 italic py-4 text-center">
                No shoots scheduled for today. Check upcoming events below.
              </p>
            ) : (
              <div className="space-y-2">
                {todayShoots.map(s => (
                  <div key={s.id} className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-900 text-sm">{s.name}</span>
                      <span className="font-bold font-mono text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                        {s.startTime} – {s.endTime}
                      </span>
                    </div>
                    <p className="text-amber-800 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> {s.venue}
                    </p>
                    {s.instructions && (
                      <p className="text-amber-900 text-xs italic bg-white/70 p-2 rounded-lg border border-amber-200">
                        {s.instructions}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Assigned Sub-Events List */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white border border-zinc-200/90 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-indigo-500" />
                My Upcoming Sub-Events ({mySubEvents.length})
              </h3>
            </div>

            {mySubEvents.length === 0 ? (
              <p className="text-xs text-zinc-400 italic py-4 text-center">
                You are not currently assigned to any sub-events.
              </p>
            ) : (
              <div className="divide-y divide-zinc-100">
                {mySubEvents.map(s => (
                  <div key={s.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-xs text-zinc-400">{s.subEventNumber}</span>
                        <h4 className="font-bold text-zinc-900">{s.name}</h4>
                        <span className="text-xs font-semibold text-zinc-600 bg-zinc-100 px-2 py-0.2 rounded-full">
                          {s.customCategory}
                        </span>
                      </div>
                      <p className="text-zinc-500 mt-1 flex items-center gap-3">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-zinc-400" /> {s.date}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-zinc-400" /> {s.startTime}–{s.endTime}</span>
                        <span className="truncate max-w-xs">{s.venue}</span>
                      </p>
                    </div>

                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 self-start sm:self-auto">
                      {s.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Tasks, Leave Entitlements & Notifications */}
        <div className="lg:col-span-5 space-y-4">
          {/* My Tasks */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white border border-zinc-200/90 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <CheckSquare className="w-4 h-4 text-zinc-600" />
              My Production Tasks ({myTasks.length})
            </h3>

            {myTasks.length === 0 ? (
              <p className="text-xs text-zinc-400 italic py-3 text-center">No tasks assigned.</p>
            ) : (
              <div className="space-y-2">
                {myTasks.map(t => (
                  <div key={t.id} className="p-3 rounded-xl border border-zinc-200 bg-white flex items-center justify-between text-xs">
                    <div className="min-w-0">
                      <p className="font-bold text-zinc-900 truncate">{t.title}</p>
                      <p className="text-xs text-zinc-500">Due: {t.dueDate}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      t.status === 'Done' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {t.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Leave Summary */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white border border-zinc-200/90 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider text-zinc-400">
                Time-Off Status
              </h3>
              <span className="text-xs text-emerald-600 font-bold">
                {myBalance?.totalRemaining ?? 0} Days Available
              </span>
            </div>

            {myRecentLeaves.length === 0 ? (
              <p className="text-xs text-zinc-400 italic py-2 text-center">No recent leave requests.</p>
            ) : (
              <div className="space-y-2 text-xs">
                {myRecentLeaves.map(l => (
                  <div key={l.id} className="p-2.5 rounded-xl border border-zinc-200 bg-white flex items-center justify-between">
                    <div>
                      <p className="font-bold text-zinc-900">{l.leaveTypeName}</p>
                      <p className="text-xs text-zinc-500">{l.startDate} to {l.endDate}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                      l.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      l.status === 'rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {l.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
