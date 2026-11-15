import { TenantStore } from './tenantStore';
import { firestoreService } from './firestoreService';
import { employeeService } from './employeeService';
import { Employee, StudioEvent } from '../types/schema';
import { BookingRecord } from '../types/bookingProduction';
import { SHREEJI_EMPLOYEES_DEF } from './seedShreejiStudio';
import { getStudioOwnerCrewMember, isStudioOwnerId } from './studioOwnerHelper';

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
   * Prepend the logged-in Studio Owner dynamically as an assignable crew member
   */
  getActiveEmployees(studioId: string): Employee[] {
    let list: Employee[] = [];

    try {
      const emps = employeeService.listEmployees(studioId);
      if (emps && emps.length > 0) {
        list = emps.filter(e => e.employmentStatus === 'active');
      }
    } catch {
      // Fallback
    }

    if (list.length === 0) {
      // Fallback to SHREEJI_EMPLOYEES_DEF
      list = SHREEJI_EMPLOYEES_DEF.map(def => ({
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

    // Always include the dynamic Studio Owner at the top of the roster
    const ownerMember = getStudioOwnerCrewMember(studioId);
    const existingOwnerIndex = list.findIndex(e => isStudioOwnerId(e.id, studioId) || (e as any).isStudioOwner);
    if (existingOwnerIndex >= 0) {
      list[existingOwnerIndex] = ownerMember;
    } else {
      list = [ownerMember, ...list];
    }

    return list;
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

    const matchesEmployee = (candidateId?: string): boolean => {
      if (!candidateId) return false;
      if (candidateId === employeeId) return true;
      if (isStudioOwnerId(employeeId, studioId) && isStudioOwnerId(candidateId, studioId)) return true;
      return false;
    };

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
      const isAssigned = (evt.assignedTeamIds || []).some(matchesEmployee) ||
        (evt.detailedAssignments || []).some(a => matchesEmployee(a.memberId));

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
            const hasEmp = (fn.assignedPhotographerIds || []).some(matchesEmployee) ||
              (fn.assignedVideographerIds || []).some(matchesEmployee) ||
              (fn.assignedCrew || []).some(c => matchesEmployee(c.employeeId));

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
        if ((bkg as any).crew.some((c: any) => matchesEmployee(c.id || c.employeeId))) {
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
