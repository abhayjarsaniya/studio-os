import React, { useState, useEffect, useMemo } from 'react';
import { employeeWorkspaceService, EmployeeDashboardMetrics } from '../services/employeeWorkspaceService';
import { calendarVisibilityService, EmployeeCalendarEvent } from '../services/calendarVisibilityService';
import { firebaseAuthService } from '../services/firebaseAuthService';
import { unifiedAuthService } from '../services/unifiedAuthService';
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
  Check,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  X,
  Sparkles
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
  const [mobileTab, setMobileTab] = useState<'overview' | 'events' | 'tasks' | 'calendar'>('overview');

  // Load employee's assigned and visible events strictly respecting Smart Team Calendar Visibility
  const calendarEvents = useMemo(() => {
    return calendarVisibilityService.getEmployeeCalendarEvents(studioId, employeeId);
  }, [studioId, employeeId, refreshTrigger]);

  // Security Modal State
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  // Escape key closes security modal
  useEffect(() => {
    if (!isSecurityModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSecurityModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSecurityModalOpen]);

  // Sync data immediately when studio events/bookings are updated
  useEffect(() => {
    const handleDataUpdate = () => setRefreshTrigger(prev => prev + 1);
    window.addEventListener('studio_data_updated', handleDataUpdate);
    return () => window.removeEventListener('studio_data_updated', handleDataUpdate);
  }, []);

  const passwordStrength = useMemo(() => {
    if (!newPassword) return null;
    let score = 0;
    if (newPassword.length >= 8) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[^A-Za-z0-9]/.test(newPassword)) score++;

    if (score <= 1) return { label: 'Weak', color: 'bg-rose-500', text: 'text-rose-600' };
    if (score <= 3) return { label: 'Moderate', color: 'bg-amber-500', text: 'text-amber-600' };
    return { label: 'Strong', color: 'bg-emerald-500', text: 'text-emerald-600' };
  }, [newPassword]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setIsSavingPassword(true);
    try {
      const session = unifiedAuthService.getCurrentSession();
      const accountId = session?.account?.id || `usr_${employeeId}`;

      const res = await firebaseAuthService.reauthenticateAndChangePassword(
        currentPassword,
        newPassword,
        accountId
      );

      if (!res.success) {
        setPasswordError(res.error || 'Failed to update password.');
      } else {
        setPasswordSuccess('Password successfully updated! You can now use this password permanently.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setPasswordSuccess(null);
          setIsSecurityModalOpen(false);
        }, 3000);
      }
    } catch (err: any) {
      setPasswordError(err.message || 'An error occurred while changing password.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleSendResetEmail = async () => {
    try {
      const session = unifiedAuthService.getCurrentSession();
      const email = session?.account?.email || `${employeeId}@shreejifilms.in`;
      const res = await firebaseAuthService.sendPasswordReset(email);
      if (res.success) {
        setResetEmailSent(true);
        setTimeout(() => setResetEmailSent(false), 5000);
      } else {
        alert(res.error || 'Failed to dispatch reset email.');
      }
    } catch (e: any) {
      alert(e.message || 'Error dispatching reset email.');
    }
  };

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
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 border border-orange-400/40 flex items-center justify-center text-white shadow-xs shrink-0">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-zinc-900 truncate font-display">Employee Workspace</span>
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-xs font-bold bg-orange-50 text-orange-800 border border-orange-200">
                Authorized Crew
              </span>
            </div>
            <div className="text-xs text-zinc-500 truncate">Studio: {studioId}</div>
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
            onClick={() => setIsSecurityModalOpen(true)}
            className="min-h-[44px] flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-orange-50/50 hover:border-orange-300 text-zinc-700 border border-zinc-200 text-xs sm:text-sm font-bold transition-all shadow-2xs cursor-pointer"
          >
            <KeyRound className="w-4 h-4 text-amber-500" />
            <span className="hidden sm:inline">Security & Password</span>
          </button>

          <button
            onClick={handleLogout}
            className="min-h-[44px] flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-rose-50 hover:text-rose-700 text-zinc-700 border border-zinc-200 hover:border-rose-200 text-xs sm:text-sm font-bold transition-all shadow-2xs cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Sub-Navigation Tabs with Refined Orange Active States */}
      <div className="bg-white border-b border-zinc-200 px-4 py-2 flex items-center gap-2 sticky top-[57px] z-30 overflow-x-auto touch-scroll">
        <button
          onClick={() => setMobileTab('overview')}
          className={`flex-1 min-w-[90px] min-h-[48px] py-2 px-3 text-xs sm:text-sm font-bold rounded-xl transition-all touch-manipulation active:scale-95 cursor-pointer flex flex-col items-center justify-center relative ${
            mobileTab === 'overview' ? 'text-orange-600 font-bold bg-orange-50/50' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/60'
          }`}
        >
          <span>Overview</span>
          {mobileTab === 'overview' && <span className="absolute bottom-1 w-6 h-[2.5px] bg-gradient-to-r from-orange-500 to-amber-500 rounded-full" />}
        </button>
        <button
          onClick={() => setMobileTab('events')}
          className={`flex-1 min-w-[90px] min-h-[48px] py-2 px-3 text-xs sm:text-sm font-bold rounded-xl transition-all touch-manipulation active:scale-95 cursor-pointer flex flex-col items-center justify-center relative ${
            mobileTab === 'events' ? 'text-orange-600 font-bold bg-orange-50/50' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/60'
          }`}
        >
          <span>Events ({metrics.assignedEvents.length})</span>
          {mobileTab === 'events' && <span className="absolute bottom-1 w-6 h-[2.5px] bg-gradient-to-r from-orange-500 to-amber-500 rounded-full" />}
        </button>
        <button
          onClick={() => setMobileTab('calendar')}
          className={`flex-1 min-w-[100px] min-h-[48px] py-2 px-3 text-xs sm:text-sm font-bold rounded-xl transition-all touch-manipulation active:scale-95 cursor-pointer flex flex-col items-center justify-center relative ${
            mobileTab === 'calendar' ? 'text-orange-600 font-bold bg-orange-50/50' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/60'
          }`}
        >
          <span>My Calendar ({calendarEvents.length})</span>
          {mobileTab === 'calendar' && <span className="absolute bottom-1 w-6 h-[2.5px] bg-gradient-to-r from-orange-500 to-amber-500 rounded-full" />}
        </button>
        <button
          onClick={() => setMobileTab('tasks')}
          className={`flex-1 min-w-[90px] min-h-[48px] py-2 px-3 text-xs sm:text-sm font-bold rounded-xl transition-all touch-manipulation active:scale-95 cursor-pointer flex flex-col items-center justify-center relative ${
            mobileTab === 'tasks' ? 'text-orange-600 font-bold bg-orange-50/50' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/60'
          }`}
        >
          <span>Tasks ({metrics.pendingTasks.length})</span>
          {mobileTab === 'tasks' && <span className="absolute bottom-1 w-6 h-[2.5px] bg-gradient-to-r from-orange-500 to-amber-500 rounded-full" />}
        </button>
      </div>

      {/* Main Workspace */}
      <main className="flex-1 w-full px-3 py-3 sm:px-5 sm:py-5 space-y-4 sm:space-y-5 pb-24 sm:pb-8">
        {/* Welcome & Attendance Shift Card */}
        <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white border border-zinc-200/90 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 shadow-sm relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Daily Shift Check-In
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight font-display">
              Today's Schedule & Attendance
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 max-w-xl">
              Mark your presence, inspect assigned shoot call times, and report task completions.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto">
            {metrics.attendanceStatus === 'not_marked' && (
              <button
                onClick={handleCheckIn}
                className="w-full sm:w-auto min-h-[52px] sm:min-h-[48px] px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer touch-manipulation active:scale-[0.98]"
              >
                <LogIn className="w-5 h-5 sm:w-4 sm:h-4" />
                <span>Mark Attendance / Check In</span>
              </button>
            )}

            {metrics.attendanceStatus === 'checked_in' && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 font-medium min-h-[48px]">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
                  <span>Checked In at {metrics.currentCheckInTime || '09:00 AM'}</span>
                </div>
                <button
                  onClick={handleCheckOut}
                  className="min-h-[48px] sm:min-h-[44px] px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-300 font-bold text-sm sm:text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs touch-manipulation active:scale-98"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Check Out</span>
                </button>
              </div>
            )}

            {metrics.attendanceStatus === 'checked_out' && (
              <div className="w-full sm:w-auto min-h-[48px] px-5 py-3 rounded-xl bg-zinc-100 border border-zinc-200 text-xs text-zinc-700 flex items-center justify-center gap-2 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Shift Completed for Today</span>
              </div>
            )}
          </div>
        </div>

        {/* 4 Stat Overview Tiles */}
        <div className={`grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 ${mobileTab !== 'overview' ? 'hidden sm:grid' : ''}`}>
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-zinc-200 shadow-2xs">
            <div className="flex items-center justify-between text-zinc-500 text-xs sm:text-sm font-semibold">
              <span>Assigned Events</span>
              <Calendar className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-zinc-900 mt-2 font-display">{metrics.assignedEvents.length}</div>
            <div className="text-xs text-zinc-500 mt-1">Upcoming shoot assignments</div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-zinc-200 shadow-2xs">
            <div className="flex items-center justify-between text-zinc-500 text-xs sm:text-sm font-semibold">
              <span>Pending Tasks</span>
              <CheckSquare className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-zinc-900 mt-2 font-display">{metrics.pendingTasks.length}</div>
            <div className="text-xs text-zinc-500 mt-1">{metrics.completedTasks.length} completed</div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-zinc-200 shadow-2xs">
            <div className="flex items-center justify-between text-zinc-500 text-xs sm:text-sm font-semibold">
              <span>Monthly Attendance</span>
              <Clock className="w-4 h-4 text-teal-600" />
            </div>
            <div className="text-2xl font-black text-zinc-900 mt-2 font-display">{metrics.monthlyAttendanceDays} Days</div>
            <div className="text-xs text-zinc-500 mt-1">Present this month</div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-zinc-200 shadow-2xs">
            <div className="flex items-center justify-between text-zinc-500 text-xs sm:text-sm font-semibold">
              <span>Leave Balance</span>
              <Plane className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-black text-zinc-900 mt-2 font-display">{metrics.leaveBalance.remaining} Days</div>
            <div className="text-xs text-zinc-500 mt-1">{metrics.leaveBalance.pendingRequests} requests pending</div>
          </div>
        </div>

        {/* VIEW: MY CONFIRMED CALENDAR SCHEDULE */}
        {mobileTab === 'calendar' && (
          <div className="bg-white rounded-3xl border border-zinc-200/90 p-5 sm:p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-zinc-900 font-display">My Confirmed Shoot Calendar</h2>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 font-bold border border-orange-200">
                    {calendarEvents.length} Visible Shoots
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Only assigned shoots marked visible by studio owner appear on your schedule
                </p>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-200/80 text-orange-800 text-xs font-semibold">
                <ShieldCheck className="w-4 h-4 text-orange-600 shrink-0" />
                <span>Financial & Customer Billing Data Restricted</span>
              </div>
            </div>

            {calendarEvents.length === 0 ? (
              <div className="py-12 text-center text-zinc-400 text-xs sm:text-sm bg-zinc-50 rounded-2xl border border-dashed border-zinc-200 space-y-2">
                <Calendar className="w-8 h-8 text-zinc-300 mx-auto" />
                <p className="font-semibold text-zinc-600">No shoots currently scheduled or visible on your calendar.</p>
                <p className="text-xs text-zinc-500">If you were recently assigned to a shoot, your studio owner may have hidden it until call times are finalized.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {calendarEvents.map(evt => (
                  <div
                    key={`${evt.bookingId}_${evt.functionId}`}
                    className="p-4 rounded-2xl border border-zinc-200 hover:border-orange-300 bg-white shadow-2xs space-y-3 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                        {evt.bookingNumber}
                      </span>
                      <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {evt.status}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-zinc-900">{evt.eventName}</h4>
                      <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">{evt.functionName} • {evt.category}</p>
                    </div>

                    <div className="space-y-1.5 text-xs sm:text-sm text-zinc-600 pt-1 border-t border-zinc-100">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-orange-500" />
                        <span className="font-semibold">{evt.date} • {evt.startTime} - {evt.endTime}</span>
                      </div>
                      <div className="flex items-center gap-2 truncate">
                        <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className="truncate">{evt.venue}, {evt.city}</span>
                      </div>
                      <div className="flex items-center gap-2 text-indigo-700 font-semibold pt-1">
                        <User className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Role: {evt.responsibility}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Two-Column Layout */}
        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${mobileTab === 'calendar' ? 'hidden' : ''}`}>
          {/* Left Column: Today's Schedule & Assigned Events */}
          <div className={`space-y-6 ${mobileTab === 'tasks' ? 'hidden lg:block' : ''}`}>
            {/* Today's Shoot Call Times */}
            <div className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <h2 className="font-bold text-base sm:text-lg text-zinc-900 font-display">Today's Schedule & Call Time</h2>
                </div>
                <span className="text-xs sm:text-sm text-zinc-500 font-medium">
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
                        <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-zinc-200/80 text-zinc-700">
                          {s.status}
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-zinc-900">{s.category} • {s.responsibility}</div>
                      <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-zinc-600">
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
                  <h2 className="font-bold text-base sm:text-lg text-zinc-900 font-display">Upcoming Assigned Events</h2>
                </div>
                <span className="text-xs uppercase font-bold text-zinc-500">Privacy Protected</span>
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
                          <span className="text-sm font-semibold text-zinc-900 truncate">{evt.category}</span>
                        </div>
                        <div className="text-xs text-zinc-500 mt-0.5 flex flex-wrap items-center gap-2">
                          <span>{evt.startDate}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3 text-zinc-400" /> {evt.venue}</span>
                        </div>
                      </div>
                      <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-zinc-200/80 text-zinc-700 shrink-0">
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
                  <h2 className="font-bold text-base sm:text-lg text-zinc-900 font-display">My Pending Tasks</h2>
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
                        <div className="text-sm font-bold text-zinc-900 truncate">{task.title}</div>
                        <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1">
                          <span className={`px-1.5 py-0.5 rounded font-bold uppercase text-xs ${
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

      {/* Security & Password Modal */}
      {isSecurityModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsSecurityModalOpen(false);
              setPasswordError(null);
              setPasswordSuccess(null);
            }
          }}
        >
          <div 
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-zinc-200 space-y-5 animate-in zoom-in-95 duration-150 relative max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 font-display">Security & Password</h3>
                  <p className="text-xs text-zinc-500">Update your employee portal sign-in password.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsSecurityModalOpen(false);
                  setPasswordError(null);
                  setPasswordSuccess(null);
                }}
                className="min-w-[44px] min-h-[44px] rounded-xl text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 flex items-center justify-center cursor-pointer touch-manipulation active:scale-95"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {passwordError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            {resetEmailSent && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Password reset link sent to your registered email!</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs sm:text-sm font-bold text-zinc-700 uppercase mb-1">
                  Current Password *
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="Enter your current password"
                    className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-900 focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                  >
                    {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-zinc-700 uppercase mb-1">
                  New Password *
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-900 focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {passwordStrength && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                      <div
                        className={`h-full ${passwordStrength.color} transition-all`}
                        style={{
                          width: passwordStrength.label === 'Strong' ? '100%' : passwordStrength.label === 'Moderate' ? '60%' : '30%'
                        }}
                      />
                    </div>
                    <span className={`text-xs font-bold ${passwordStrength.text}`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-zinc-700 uppercase mb-1">
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-900 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={handleSendResetEmail}
                  className="text-amber-700 hover:underline text-xs sm:text-sm font-semibold cursor-pointer text-left"
                >
                  Forgot your password?
                </button>

                <div className="flex items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsSecurityModalOpen(false)}
                    className="min-h-[44px] px-4 py-2 rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50 font-semibold cursor-pointer touch-manipulation text-xs sm:text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingPassword}
                    className="min-h-[44px] px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold transition-all disabled:opacity-50 cursor-pointer shadow-sm touch-manipulation text-xs sm:text-sm"
                  >
                    {isSavingPassword ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
