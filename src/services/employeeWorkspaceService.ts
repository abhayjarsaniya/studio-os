import { TenantStore } from './tenantStore';
import { StudioEvent, Task, AttendanceRecord, LeaveRequest } from '../types/schema';
import { attendanceService } from './attendanceService';
import { taskService } from './taskService';
import { leaveService } from './leaveService';

export interface EmployeeDashboardMetrics {
  employeeId: string;
  employeeName: string;
  studioId: string;
  todaySchedule: Array<{
    id: string;
    eventNumber: string;
    category: string;
    reportingTime: string;
    venue: string;
    responsibility: string;
    status: string;
  }>;
  assignedEvents: Array<{
    id: string;
    eventNumber: string;
    category: string;
    startDate: string;
    endDate: string;
    venue: string;
    status: string;
  }>;
  pendingTasks: Task[];
  completedTasks: Task[];
  upcomingDeadlines: Array<{
    id: string;
    title: string;
    dueDate: string;
    priority: string;
  }>;
  attendanceStatus: 'checked_in' | 'checked_out' | 'not_marked';
  currentCheckInTime?: string;
  monthlyAttendanceDays: number;
  leaveBalance: {
    totalAllowed: number;
    used: number;
    remaining: number;
    pendingRequests: number;
  };
  notificationsCount: number;
}

export class EmployeeWorkspaceService {
  // Get sanitized, privacy-enforced dashboard data for an employee
  getEmployeeDashboard(studioId: string, employeeId: string): EmployeeDashboardMetrics {
    const allEvents = TenantStore.get<StudioEvent>(studioId, 'events') || [];
    const allTasks = TenantStore.get<Task>(studioId, 'tasks') || [];
    const allAttendance = TenantStore.get<AttendanceRecord>(studioId, 'attendance') || [];
    const allLeaves = TenantStore.get<LeaveRequest>(studioId, 'leave_requests') || [];

    const todayStr = new Date().toISOString().slice(0, 10);

    // 1. Assigned events (STRICT PRIVACY: Strip financial amounts, mask customer personal contact info)
    const myEvents = allEvents.filter(e => {
      const isAssigned = (e.assignedTeamIds && e.assignedTeamIds.includes(employeeId)) ||
        (e.detailedAssignments && e.detailedAssignments.some(a => a.memberId === employeeId || (a as any).employeeId === employeeId)) ||
        e.leadPhotographerId === employeeId;
      return isAssigned;
    });

    const sanitizedEvents = myEvents.map(e => ({
      id: e.id,
      eventNumber: e.eventNumber || `EVT-${e.id.slice(0, 6)}`,
      category: e.category,
      startDate: e.startDate,
      endDate: e.endDate,
      venue: e.venue || 'Main Venue',
      status: e.status
      // NOTE: estimatedBudget, advancePaid, customerPhone are STRICTLY EXCLUDED
    }));

    // 2. Today's schedule
    const todaySchedule = myEvents
      .filter(e => e.startDate <= todayStr && e.endDate >= todayStr)
      .map(e => {
        const assignment = e.detailedAssignments?.find(a => a.memberId === employeeId || (a as any).employeeId === employeeId);
        return {
          id: e.id,
          eventNumber: e.eventNumber || `EVT-${e.id.slice(0, 6)}`,
          category: e.category,
          reportingTime: (assignment as any)?.callTime || e.startTime || '08:00 AM',
          venue: e.venue,
          responsibility: assignment?.roleTitle || 'Shoot Production',
          status: e.status
        };
      });

    // 3. Tasks
    const myTasks = allTasks.filter(t => t.assignedToId === employeeId || (t as any).assignedTo === employeeId);
    const pendingTasks = myTasks.filter(t => t.status !== 'Completed' && t.status !== 'Done' && t.status !== 'Cancelled');
    const completedTasks = myTasks.filter(t => t.status === 'Completed' || t.status === 'Done');

    // 4. Upcoming Deadlines
    const upcomingDeadlines = pendingTasks
      .filter(t => !!t.dueDate)
      .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))
      .slice(0, 5)
      .map(t => ({
        id: t.id,
        title: t.title,
        dueDate: t.dueDate || '',
        priority: t.priority
      }));

    // 5. Attendance Status for Today
    const todayAttendance = allAttendance.find(a => a.employeeId === employeeId && a.date === todayStr);
    let attendanceStatus: 'checked_in' | 'checked_out' | 'not_marked' = 'not_marked';
    let currentCheckInTime: string | undefined = undefined;

    if (todayAttendance) {
      if (todayAttendance.checkIn && !todayAttendance.checkOut) {
        attendanceStatus = 'checked_in';
        currentCheckInTime = todayAttendance.checkIn;
      } else if (todayAttendance.checkIn && todayAttendance.checkOut) {
        attendanceStatus = 'checked_out';
      }
    }

    // Monthly attendance count (present or half_day)
    const currentMonth = todayStr.slice(0, 7);
    const monthlyAttendanceDays = allAttendance.filter(
      a => a.employeeId === employeeId && a.date.startsWith(currentMonth) && (a.status === 'present' || a.status === 'half_day')
    ).length;

    // 6. Leave Balance
    const myLeaves = allLeaves.filter(l => l.employeeId === employeeId);
    const approvedLeaveDays = myLeaves
      .filter(l => l.status === 'approved' && l.startDate.startsWith(todayStr.slice(0, 4)))
      .reduce((sum, l) => sum + (l.totalDays || 1), 0);
    const pendingRequests = myLeaves.filter(l => l.status === 'pending').length;

    const totalAllowed = 18; // Standard annual leave quota
    const remaining = Math.max(0, totalAllowed - approvedLeaveDays);

    return {
      employeeId,
      employeeName: employeeId,
      studioId,
      todaySchedule,
      assignedEvents: sanitizedEvents,
      pendingTasks,
      completedTasks,
      upcomingDeadlines,
      attendanceStatus,
      currentCheckInTime,
      monthlyAttendanceDays,
      leaveBalance: {
        totalAllowed,
        used: approvedLeaveDays,
        remaining,
        pendingRequests
      },
      notificationsCount: 2
    };
  }

  // Employee Check-In
  checkIn(studioId: string, employeeId: string, notes?: string): AttendanceRecord {
    const todayStr = new Date().toISOString().slice(0, 10);
    const timeStr = new Date().toTimeString().slice(0, 5);

    const all = TenantStore.get<AttendanceRecord>(studioId, 'attendance') || [];
    const existingIdx = all.findIndex(a => a.employeeId === employeeId && a.date === todayStr);

    let rec: AttendanceRecord;
    if (existingIdx >= 0) {
      rec = {
        ...all[existingIdx],
        checkIn: all[existingIdx].checkIn || timeStr,
        status: 'present',
        notes: notes || all[existingIdx].notes
      };
      all[existingIdx] = rec;
    } else {
      rec = {
        id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        studioId,
        employeeId,
        employeeName: 'Employee',
        date: todayStr,
        checkIn: timeStr,
        status: 'present',
        notes: notes || 'Self Check-In'
      };
      all.push(rec);
    }

    TenantStore.set(studioId, 'attendance', all);
    return rec;
  }

  // Employee Check-Out
  checkOut(studioId: string, employeeId: string, notes?: string): AttendanceRecord {
    const todayStr = new Date().toISOString().slice(0, 10);
    const timeStr = new Date().toTimeString().slice(0, 5);

    const all = TenantStore.get<AttendanceRecord>(studioId, 'attendance') || [];
    const existingIdx = all.findIndex(a => a.employeeId === employeeId && a.date === todayStr);

    if (existingIdx === -1) {
      throw new Error('Cannot check out without checking in first.');
    }

    const rec = {
      ...all[existingIdx],
      checkOut: timeStr,
      notes: notes ? `${all[existingIdx].notes || ''} | ${notes}` : all[existingIdx].notes
    };
    all[existingIdx] = rec;

    TenantStore.set(studioId, 'attendance', all);
    return rec;
  }

  // Get attendance history
  getAttendanceHistory(studioId: string, employeeId: string): AttendanceRecord[] {
    const all = TenantStore.get<AttendanceRecord>(studioId, 'attendance') || [];
    return all.filter(a => a.employeeId === employeeId).sort((a, b) => b.date.localeCompare(a.date));
  }

  // Mark task completed (permitted employee task action)
  markTaskComplete(studioId: string, taskId: string, employeeId: string): Task {
    const all = TenantStore.get<Task>(studioId, 'tasks') || [];
    const target = all.find(t => t.id === taskId);
    if (!target) throw new Error(`Task ${taskId} not found`);

    // Verify task assignment
    const isAssigned = target.assignedToId === employeeId || (target as any).assignedTo === employeeId;
    if (!isAssigned) {
      throw new Error('Unauthorized: You can only update tasks assigned to you.');
    }

    target.status = 'Completed';
    target.updatedAt = new Date().toISOString();
    TenantStore.set(studioId, 'tasks', all);
    return target;
  }
}

export const employeeWorkspaceService = new EmployeeWorkspaceService();
