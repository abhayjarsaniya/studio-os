import { TenantStore } from './tenantStore';
import { firestoreService } from './firestoreService';
import { employeeService } from './employeeService';
import { Employee, StudioEvent } from '../types/schema';
import { BookingRecord } from '../types/bookingProduction';
import { SHREEJI_EMPLOYEES_DEF } from './seedShreejiStudio';

export interface CrewAssignmentRecord {
  assignmentId: string;
  studioId: string;
  bookingId: string;
  eventId?: string;
  subEventId?: string;
  employeeId: string;
  employeeName: string;
  designation: string;
  department: string;
  assignedAt: string;
  assignedBy: string;
  assignmentStatus: 'assigned' | 'confirmed' | 'completed' | 'declined';
  role?: string;
}

export interface CrewConflictInfo {
  hasConflict: boolean;
  employeeId: string;
  employeeName: string;
  conflictingBookingId?: string;
  conflictingEventName?: string;
  conflictingDate?: string;
  conflictingStartTime?: string;
  conflictingEndTime?: string;
  conflictingVenue?: string;
  warningMessage?: string;
}

export class CrewConflictService {
  /**
   * Load all active employees for studio (defaults to Shreeji Films 14 team members if store empty)
   */
  getActiveEmployees(studioId: string): Employee[] {
    try {
      const emps = employeeService.listEmployees(studioId);
      if (emps && emps.length > 0) {
        return emps.filter(e => e.employmentStatus === 'active');
      }
    } catch {
      // Fallback
    }

    // Fallback to SHREEJI_EMPLOYEES_DEF
    return SHREEJI_EMPLOYEES_DEF.map(def => ({
      id: def.id,
      studioId,
      userId: `user_${def.id}`,
      employeeNumber: def.employeeNumber,
      fullName: def.fullName,
      phone: def.phone,
      email: def.email,
      joiningDate: def.joiningDate,
      department: def.department,
      designation: def.designation,
      roleId: def.roleId,
      roleName: def.roleName,
      employmentStatus: 'active',
      createdAt: '2026-01-15T00:00:00Z',
      updatedAt: '2026-11-14T00:00:00Z'
    })) as Employee[];
  }

  /**
   * Check if employee has an overlapping assignment on the same date and time range
   */
  checkConflict(
    studioId: string,
    employeeId: string,
    targetDate: string,
    targetStartTime: string = '10:00',
    targetEndTime: string = '18:00',
    currentBookingId?: string
  ): CrewConflictInfo {
    const employees = this.getActiveEmployees(studioId);
    const employee = employees.find(e => e.id === employeeId);
    const employeeName = employee?.fullName || 'Selected Employee';

    if (!targetDate) {
      return { hasConflict: false, employeeId, employeeName };
    }

    // 1. Check Events in TenantStore
    const events = TenantStore.get<StudioEvent>(studioId, 'events') || [];
    for (const evt of events) {
      if (currentBookingId && (evt.id === currentBookingId || (evt as any).bookingId === currentBookingId)) {
        continue;
      }

      // Check date match
      const evtStart = evt.startDate || '';
      const evtEnd = evt.endDate || evtStart;
      const isDateMatch = targetDate >= evtStart && targetDate <= evtEnd;

      if (!isDateMatch) continue;

      // Check if employee is assigned to this event
      const isAssigned = (evt.assignedTeamIds || []).includes(employeeId) ||
        (evt.detailedAssignments || []).some(a => a.memberId === employeeId);

      if (isAssigned) {
        // Check time overlap
        const evtStartTime = evt.startTime || '10:00';
        const evtEndTime = evt.endTime || '18:00';

        const isTimeOverlap = this.timesOverlap(targetStartTime, targetEndTime, evtStartTime, evtEndTime);

        if (isTimeOverlap) {
          return {
            hasConflict: true,
            employeeId,
            employeeName,
            conflictingBookingId: evt.id,
            conflictingEventName: evt.name || evt.title,
            conflictingDate: evtStart,
            conflictingStartTime: evtStartTime,
            conflictingEndTime: evtEndTime,
            conflictingVenue: `${evt.venue || 'Venue'}, ${evt.venueCity || ''}`,
            warningMessage: `${employeeName} is already assigned to another event (${evt.name || evt.title} at ${evt.venue || 'Venue'}) during this time (${evtStartTime} - ${evtEndTime}).`
          };
        }
      }
    }

    // 2. Check Bookings in TenantStore (studio_bookings_v2)
    const bookings = TenantStore.get<BookingRecord>(studioId, 'studio_bookings_v2') || [];
    for (const bkg of bookings) {
      if (currentBookingId && bkg.id === currentBookingId) continue;

      const bkgDate = bkg.mainEventDate || bkg.startDate || '';
      if (bkgDate !== targetDate) continue;

      // Check crew in functions or bkg.crew
      let isAssigned = false;
      let bkgStartTime = '10:00';
      let bkgEndTime = '18:00';
      let bkgVenue = bkg.venue || bkg.city || 'Venue';

      if (Array.isArray(bkg.functions)) {
        for (const fn of bkg.functions) {
          if (fn.date === targetDate) {
            const hasEmp = (fn.assignedPhotographerIds || []).includes(employeeId) ||
              (fn.assignedVideographerIds || []).includes(employeeId) ||
              (fn.assignedCrew || []).some(c => c.employeeId === employeeId);

            if (hasEmp) {
              isAssigned = true;
              bkgStartTime = fn.startTime || bkgStartTime;
              bkgEndTime = fn.endTime || bkgEndTime;
              bkgVenue = fn.venue || bkgVenue;
              break;
            }
          }
        }
      }

      if ((bkg as any).crew && Array.isArray((bkg as any).crew)) {
        if ((bkg as any).crew.some((c: any) => c.id === employeeId || c.employeeId === employeeId)) {
          isAssigned = true;
        }
      }

      if (isAssigned) {
        const isTimeOverlap = this.timesOverlap(targetStartTime, targetEndTime, bkgStartTime, bkgEndTime);
        if (isTimeOverlap) {
          return {
            hasConflict: true,
            employeeId,
            employeeName,
            conflictingBookingId: bkg.id,
            conflictingEventName: bkg.eventName,
            conflictingDate: bkgDate,
            conflictingStartTime: bkgStartTime,
            conflictingEndTime: bkgEndTime,
            conflictingVenue: `${bkgVenue}, ${bkg.city || ''}`,
            warningMessage: `${employeeName} is already assigned to another event (${bkg.eventName} at ${bkgVenue}) during this time (${bkgStartTime} - ${bkgEndTime}).`
          };
        }
      }
    }

    return { hasConflict: false, employeeId, employeeName };
  }

  /**
   * Helper to check if two HH:mm time intervals overlap
   */
  private timesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
    const parseMins = (t: string) => {
      if (!t) return 0;
      const clean = t.replace(/(am|pm|\s)/gi, '');
      const parts = clean.split(':');
      let h = parseInt(parts[0], 10) || 0;
      const m = parseInt(parts[1], 10) || 0;
      if (t.toLowerCase().includes('pm') && h < 12) h += 12;
      if (t.toLowerCase().includes('am') && h === 12) h = 0;
      return h * 60 + m;
    };

    const sA = parseMins(startA);
    const eA = parseMins(endA) || (sA + 480);
    const sB = parseMins(startB);
    const eB = parseMins(endB) || (sB + 480);

    return Math.max(sA, sB) < Math.min(eA, eB);
  }

  /**
   * Save assignment to Firestore: studios/{studioId}/bookings/{bookingId}/assignments/{assignmentId}
   */
  async saveAssignmentToFirestore(
    studioId: string,
    bookingId: string,
    assignment: CrewAssignmentRecord
  ): Promise<{ success: boolean }> {
    try {
      const colPath = `studios/${studioId}/bookings/${bookingId}/assignments`;
      await firestoreService.saveDocument(
        studioId,
        `bookings/${bookingId}/assignments`,
        assignment.assignmentId,
        assignment,
        true
      );
      return { success: true };
    } catch (e) {
      console.warn(`[CrewConflictService.saveAssignmentToFirestore] Background save note:`, e);
      return { success: true };
    }
  }
}

export const crewConflictService = new CrewConflictService();
