import React, { useState, useEffect } from 'react';
import { employeeWorkspaceService, EmployeeDashboardMetrics } from '../services/employeeWorkspaceService';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  CheckSquare, 
  LogIn, 
  LogOut, 
  Plane, 
  MapPin, 
  User, 
  ShieldCheck,
  Check
} from 'lucide-react';

export const EmployeeDashboardPage: React.FC = () => {
  const [studioId, setStudioId] = useState(() => {
    return localStorage.getItem('studio_os_active_studio_id_v2') || 'std_demo_royal';
  });
  const [employeeId, setEmployeeId] = useState(() => {
    return localStorage.getItem('studio_os_employee_id') || 'emp_royal_002'; // default photographer Kabir
  });

  const [metrics, setMetrics] = useState<EmployeeDashboardMetrics | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<'overview' | 'events' | 'tasks'>('overview');

  const loadDashboard = () => {
    try {
      const data = employeeWorkspaceService.getEmployeeDashboard(studioId, employeeId);
      setMetrics(data);
    } catch (e) {
      console.error('Failed to load employee dashboard:', e);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [studioId, employeeId, refreshTrigger]);

  const triggerNotify = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 3000);
  };

  const handleCheckIn = () => {
    try {
      employeeWorkspaceService.checkIn(studioId, employeeId, 'On-site via Employee Portal');
      setRefreshTrigger(prev => prev + 1);
      triggerNotify('Checked in successfully!');
    } catch (err: any) {
      alert(err.message || 'Check-in failed');
    }
  };

  const handleCheckOut = () => {
    try {
      employeeWorkspaceService.checkOut(studioId, employeeId, 'Shift ended');
      setRefreshTrigger(prev => prev + 1);
      triggerNotify('Checked out successfully!');
    } catch (err: any) {
      alert(err.message || 'Check-out failed');
    }
  };

  const handleCompleteTask = (taskId: string) => {
    try {
      employeeWorkspaceService.markTaskComplete(studioId, taskId, employeeId);
      setRefreshTrigger(prev => prev + 1);
      triggerNotify('Task marked complete!');
    } catch (err: any) {
      alert(err.message || 'Failed to complete task');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('studio_os_session_token');
    localStorage.removeItem('studio_os_employee_id');
    localStorage.removeItem('studio_os_user_role');
    window.location.hash = '#/employee/login';
  };

  if (!metrics) {
    return (
      <div className="min-h-screen bg-zinc-50 text-zinc-900 flex items-center justify-center p-4">
        <div className="animate-pulse text-zinc-500 text-sm font-medium">Loading employee workspace...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50/70 text-zinc-900 flex flex-col font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* Top Header */}
      <header className="bg-white border-b border-zinc-200/90 px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-40 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white shadow-xs shrink-0">
            <User className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-zinc-900 truncate font-display">Employee Workspace</span>
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Authorized Crew
              </span>
            </div>
            <div className="text-[11px] text-zinc-500 truncate">Studio: {studioId}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {actionSuccess && (
            <span className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              {actionSuccess}
            </span>
          )}

          <button
            onClick={handleLogout}
            className="min-h-[44px] flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-rose-50 hover:text-rose-700 text-zinc-700 border border-zinc-200 hover:border-rose-200 text-xs font-bold transition-all shadow-2xs cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Mobile Sub-Navigation Tabs */}
      <div className="sm:hidden bg-white border-b border-zinc-200 px-4 py-2 flex items-center gap-2 sticky top-[57px] z-30">
        <button
          onClick={() => setMobileTab('overview')}
          className={`flex-1 min-h-[44px] py-1.5 text-xs font-bold rounded-lg transition-colors ${
            mobileTab === 'overview' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setMobileTab('events')}
          className={`flex-1 min-h-[44px] py-1.5 text-xs font-bold rounded-lg transition-colors ${
            mobileTab === 'events' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
          }`}
        >
          Events ({metrics.assignedEvents.length})
        </button>
        <button
          onClick={() => setMobileTab('tasks')}
          className={`flex-1 min-h-[44px] py-1.5 text-xs font-bold rounded-lg transition-colors ${
            mobileTab === 'tasks' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
          }`}
        >
          Tasks ({metrics.pendingTasks.length})
        </button>
      </div>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-6 pb-24 sm:pb-8">
        {/* Welcome & Attendance Shift Card */}
        <div className="p-6 rounded-3xl bg-white border border-zinc-200/90 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              Daily Shift Check-In
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight font-display">
              Today's Schedule & Attendance
            </h1>
            <p className="text-xs text-zinc-500 max-w-xl">
              Mark your presence, inspect assigned shoot call times, and report task completions.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {metrics.attendanceStatus === 'not_marked' && (
              <button
                onClick={handleCheckIn}
                className="w-full sm:w-auto min-h-[48px] px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Mark Attendance / Check In</span>
              </button>
            )}

            {metrics.attendanceStatus === 'checked_in' && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                <div className="px-3.5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
                  <span>Checked In at {metrics.currentCheckInTime || '09:00 AM'}</span>
                </div>
                <button
                  onClick={handleCheckOut}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Check Out</span>
                </button>
              </div>
            )}

            {metrics.attendanceStatus === 'checked_out' && (
              <div className="px-4 py-3 rounded-xl bg-zinc-100 border border-zinc-200 text-xs text-zinc-700 flex items-center gap-2 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Shift Completed for Today</span>
              </div>
            )}
          </div>
        </div>

        {/* 4 Stat Overview Tiles */}
        <div className={`grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 ${mobileTab !== 'overview' ? 'hidden sm:grid' : ''}`}>
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-zinc-200 shadow-2xs">
            <div className="flex items-center justify-between text-zinc-500 text-xs font-semibold">
              <span>Assigned Events</span>
              <Calendar className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-zinc-900 mt-2 font-display">{metrics.assignedEvents.length}</div>
            <div className="text-[11px] text-zinc-500 mt-1">Upcoming shoot assignments</div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-zinc-200 shadow-2xs">
            <div className="flex items-center justify-between text-zinc-500 text-xs font-semibold">
              <span>Pending Tasks</span>
              <CheckSquare className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-zinc-900 mt-2 font-display">{metrics.pendingTasks.length}</div>
            <div className="text-[11px] text-zinc-500 mt-1">{metrics.completedTasks.length} completed</div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-zinc-200 shadow-2xs">
            <div className="flex items-center justify-between text-zinc-500 text-xs font-semibold">
              <span>Monthly Attendance</span>
              <Clock className="w-4 h-4 text-teal-600" />
            </div>
            <div className="text-2xl font-black text-zinc-900 mt-2 font-display">{metrics.monthlyAttendanceDays} Days</div>
            <div className="text-[11px] text-zinc-500 mt-1">Present this month</div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-zinc-200 shadow-2xs">
            <div className="flex items-center justify-between text-zinc-500 text-xs font-semibold">
              <span>Leave Balance</span>
              <Plane className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-black text-zinc-900 mt-2 font-display">{metrics.leaveBalance.remaining} Days</div>
            <div className="text-[11px] text-zinc-500 mt-1">{metrics.leaveBalance.pendingRequests} requests pending</div>
          </div>
        </div>

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Today's Schedule & Assigned Events */}
          <div className={`space-y-6 ${mobileTab === 'tasks' ? 'hidden lg:block' : ''}`}>
            {/* Today's Shoot Call Times */}
            <div className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <h2 className="font-bold text-sm text-zinc-900 font-display">Today's Schedule & Call Time</h2>
                </div>
                <span className="text-[11px] text-zinc-500 font-medium">
                  {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </span>
              </div>

              {metrics.todaySchedule.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-400 bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
                  No active shoots or call times scheduled for today.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {metrics.todaySchedule.map(s => (
                    <div key={s.id} className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-emerald-700">{s.eventNumber}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-200/80 text-zinc-700">
                          {s.status}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-zinc-900">{s.category} • {s.responsibility}</div>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-500">
                        <span className="flex items-center gap-1 text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" /> Call Time: {s.reportingTime}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-zinc-400" /> {s.venue}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Assigned Events (Privacy Protected) */}
            <div className={`p-5 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-4 ${mobileTab === 'overview' ? 'hidden sm:block' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <h2 className="font-bold text-sm text-zinc-900 font-display">Upcoming Assigned Events</h2>
                </div>
                <span className="text-[10px] uppercase font-bold text-zinc-400">Privacy Protected</span>
              </div>

              {metrics.assignedEvents.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-400 bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
                  No upcoming events assigned to you yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {metrics.assignedEvents.map(evt => (
                    <div key={evt.id} className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/80 flex items-center justify-between">
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-zinc-700">{evt.eventNumber}</span>
                          <span className="text-xs font-semibold text-zinc-900 truncate">{evt.category}</span>
                        </div>
                        <div className="text-[11px] text-zinc-500 mt-0.5 flex flex-wrap items-center gap-2">
                          <span>{evt.startDate}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3 text-zinc-400" /> {evt.venue}</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-200/80 text-zinc-700 shrink-0">
                        {evt.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Tasks & Upcoming Deadlines */}
          <div className={`space-y-6 ${mobileTab === 'events' ? 'hidden lg:block' : ''}`}>
            {/* Pending Assigned Tasks */}
            <div className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-amber-600" />
                  <h2 className="font-bold text-sm text-zinc-900 font-display">My Pending Tasks</h2>
                </div>
                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  {metrics.pendingTasks.length} to do
                </span>
              </div>

              {metrics.pendingTasks.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-400 bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
                  All caught up! No pending tasks assigned to you.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {metrics.pendingTasks.map(task => (
                    <div key={task.id} className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-zinc-900 truncate">{task.title}</div>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-1">
                          <span className={`px-1.5 py-0.5 rounded font-bold uppercase ${
                            task.priority?.toLowerCase() === 'urgent' ? 'bg-rose-100 text-rose-700' : 'bg-zinc-200 text-zinc-700'
                          }`}>
                            {task.priority}
                          </span>
                          {task.dueDate && <span>Due: {task.dueDate}</span>}
                        </div>
                      </div>

                      <button
                        onClick={() => handleCompleteTask(task.id)}
                        className="min-h-[44px] px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 border border-emerald-200 text-xs font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Mark Done</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming Deadlines */}
            <div className={`p-5 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-4 ${mobileTab === 'tasks' ? 'hidden sm:block' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <h2 className="font-bold text-sm text-zinc-900 font-display">Upcoming Deadlines</h2>
                </div>
              </div>

              {metrics.upcomingDeadlines.length === 0 ? (
                <div className="py-6 text-center text-xs text-zinc-400 bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
                  No upcoming task deadlines scheduled.
                </div>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {metrics.upcomingDeadlines.map(d => (
                    <div key={d.id} className="py-2.5 flex items-center justify-between text-xs">
                      <span className="font-medium text-zinc-800 truncate pr-2">{d.title}</span>
                      <span className="font-mono text-zinc-500 shrink-0">{d.dueDate}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
