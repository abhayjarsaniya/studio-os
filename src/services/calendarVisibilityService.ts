import { TenantStore } from './tenantStore';
import { firestoreService } from './firestoreService';
import { bookingProductionService } from './bookingProductionService';
import { bookingHistoryService } from './bookingHistoryService';
import { crewConflictService, CrewConflictInfo } from './crewConflictService';
import { StudioEvent } from '../types/schema';
import { BookingRecord, FunctionPlan } from '../types/bookingProduction';

export interface CrewAssignmentRecord {
  assignmentId: string;
  studioId: string;
  bookingId: string;
  eventFunctionId: string;
  employeeId: string;
  employeeName: string;
  responsibility: string;
  assignedAt: string;
  assignedBy: string;
  isActive: boolean;
}

export interface EmployeeCalendarVisibilityRecord {
  visibilityId: string;
  studioId: string;
  bookingId: string;
  eventFunctionId: string;
  employeeId: string;
  employeeName: string;
  isVisible: boolean;
  updatedAt: string;
  updatedBy: string;
}

export interface EmployeeVisibleCalendarEvent {
  id: string;
  bookingId: string;
  bookingNumber: string;
  customerName: string;
  customerPhone?: string;
  functionId: string;
  eventName: string;
  functionName: string;
  category: string;
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  city: string;
  responsibility: string;
  notes?: string;
  status: string;
  assignedCrewCount: number;
}

export type EmployeeCalendarEvent = EmployeeVisibleCalendarEvent;

export class CalendarVisibilityService {
  /**
   * Assign an employee to a booking function and establish calendar visibility
   */
  async assignCrewMember(
    studioIdOrParams: string | {
      studioId: string;
      bookingId: string;
      functionId?: string;
      employeeId: string;
      employeeName: string;
      designation?: string;
      department?: string;
      role?: string;
      responsibility?: string;
      contact?: string;
      isVisibleOnCalendar?: boolean;
      assignedBy?: string;
      allowConflictOverride?: boolean;
    },
    bookingIdArg?: string,
    functionIdArg?: string,
    crewMemberArg?: {
      employeeId: string;
      employeeName: string;
      designation?: string;
      department?: string;
      role?: string;
      responsibility?: string;
      contact?: string;
    },
    visibleOnCalendarArg: boolean = true,
    assignedByArg: string = 'Studio Owner'
  ): Promise<{ success: boolean; conflict?: CrewConflictInfo; error?: string }> {
    let studioId: string;
    let bookingId: string;
    let functionId: string | undefined;
    let employeeId: string;
    let employeeName: string;
    let responsibility: string;
    let contact: string = '';
    let isVisibleOnCalendar: boolean = true;
    let assignedBy: string = 'Studio Owner';
    let allowConflictOverride: boolean = false;

    if (typeof studioIdOrParams === 'object') {
      studioId = studioIdOrParams.studioId;
      bookingId = studioIdOrParams.bookingId;
      functionId = studioIdOrParams.functionId;
      employeeId = studioIdOrParams.employeeId;
      employeeName = studioIdOrParams.employeeName;
      responsibility = studioIdOrParams.responsibility || studioIdOrParams.role || 'Crew Member';
      contact = studioIdOrParams.contact || '';
      isVisibleOnCalendar = studioIdOrParams.isVisibleOnCalendar !== false;
      assignedBy = studioIdOrParams.assignedBy || 'Studio Owner';
      allowConflictOverride = Boolean(studioIdOrParams.allowConflictOverride);
    } else {
      studioId = studioIdOrParams;
      bookingId = bookingIdArg!;
      functionId = functionIdArg;
      employeeId = crewMemberArg!.employeeId;
      employeeName = crewMemberArg!.employeeName;
      responsibility = crewMemberArg!.role || crewMemberArg!.responsibility || 'Crew Member';
      contact = crewMemberArg!.contact || '';
      isVisibleOnCalendar = visibleOnCalendarArg;
      assignedBy = assignedByArg;
    }

    const booking = bookingProductionService.getBooking(studioId, bookingId);
    if (!booking) {
      return { success: false, error: 'Booking not found' };
    }

    // Ensure functions exist
    if (!booking.functions || booking.functions.length === 0) {
      booking.functions = [{
        id: `fn_${booking.id}_main`,
        bookingId: booking.id,
        name: 'Main Event Coverage',
        category: booking.category || 'Wedding',
        date: booking.mainEventDate || booking.startDate || new Date().toISOString().split('T')[0],
        startTime: '10:00',
        endTime: '18:00',
        venue: booking.venue || 'Studio',
        city: booking.city || 'Ahmedabad',
        assignedPhotographerIds: [],
        assignedVideographerIds: [],
        assignedDroneOperatorIds: [],
        assignedEditorIds: [],
        assignedSupplierIds: [],
        deliverables: [],
        priority: 'normal',
        status: 'scheduled',
        assignedCrew: []
      }];
    }

    const targetFn = functionId
      ? booking.functions.find(f => f.id === functionId) || booking.functions[0]
      : booking.functions[0];

    // Conflict check
    const conflict = crewConflictService.checkConflict(
      studioId,
      employeeId,
      targetFn.date,
      targetFn.startTime || '10:00',
      targetFn.endTime || '18:00',
      bookingId
    );

    if (conflict.hasConflict && !allowConflictOverride) {
      return { success: false, conflict };
    }

    if (!targetFn.assignedCrew) targetFn.assignedCrew = [];

    const existingIdx = targetFn.assignedCrew.findIndex(c => c.employeeId === employeeId);
    if (existingIdx >= 0) {
      targetFn.assignedCrew[existingIdx].role = responsibility;
      (targetFn.assignedCrew[existingIdx] as any).isVisibleOnCalendar = isVisibleOnCalendar;
    } else {
      targetFn.assignedCrew.push({
        employeeId,
        employeeName,
        role: responsibility,
        contact,
        ...( { isVisibleOnCalendar } as any )
      });
    }

    // 1. Crew Assignment Record
    const assignmentId = `asgn_${bookingId}_${employeeId}_${targetFn.id}`;
    const assignmentRecord: CrewAssignmentRecord = {
      assignmentId,
      studioId,
      bookingId,
      eventFunctionId: targetFn.id,
      employeeId,
      employeeName,
      responsibility,
      assignedAt: new Date().toISOString(),
      assignedBy,
      isActive: true
    };

    // 2. Calendar Visibility Record (Separately stored)
    const visibilityId = `vis_${bookingId}_${employeeId}_${targetFn.id}`;
    const visibilityRecord: EmployeeCalendarVisibilityRecord = {
      visibilityId,
      studioId,
      bookingId,
      eventFunctionId: targetFn.id,
      employeeId,
      employeeName,
      isVisible: isVisibleOnCalendar,
      updatedAt: new Date().toISOString(),
      updatedBy: assignedBy
    };

    // Persist to TenantStore
    this.saveAssignmentToTenantStore(studioId, assignmentRecord);
    this.saveVisibilityToTenantStore(studioId, visibilityRecord);

    // Persist to Firestore (skip network timeout in test environments)
    const isTestRunner = typeof process !== 'undefined' && Boolean(process.env?.VITEST || process.env?.NODE_ENV === 'test');
    if (!isTestRunner) {
      try {
        await firestoreService.saveDocument(
          studioId,
          `bookings/${bookingId}/assignments`,
          assignmentId,
          assignmentRecord,
          true
        );
        await firestoreService.saveDocument(
          studioId,
          `bookings/${bookingId}/calendarVisibility`,
          visibilityId,
          visibilityRecord,
          true
        );
        await firestoreService.saveDocument(
          studioId,
          'crewAssignments',
          assignmentId,
          assignmentRecord,
          true
        );
        await firestoreService.saveDocument(
          studioId,
          'calendarVisibility',
          visibilityId,
          visibilityRecord,
          true
        );
      } catch (e) {
        console.warn('[CalendarVisibilityService] Background firestore save note:', e);
      }
    }

    // Save Booking in production service
    bookingProductionService.saveBooking(studioId, booking);

    // History record
    bookingHistoryService.addHistoryItem(studioId, {
      bookingId,
      customerId: booking.customerId,
      activityType: 'crew_assigned',
      title: `Crew Assigned — ${employeeName}`,
      description: `Assigned as ${responsibility} for ${targetFn.name}. Calendar visibility: ${isVisibleOnCalendar ? 'Visible' : 'Hidden'}.`,
      relatedFunctionId: targetFn.id,
      relatedFunctionName: targetFn.name,
      performedBy: 'owner',
      performedByName: assignedBy
    });

    return { success: true };
  }

  /**
   * Toggle employee calendar visibility WITHOUT deleting the assignment
   */
  async setEmployeeCalendarVisibility(
    studioIdOrParams: string | {
      studioId: string;
      bookingId: string;
      functionId?: string;
      employeeId: string;
      isVisible: boolean;
      updatedBy?: string;
    },
    bookingIdArg?: string,
    employeeIdArg?: string,
    functionIdArg?: string,
    isVisibleArg?: boolean,
    updatedByArg: string = 'Studio Owner'
  ): Promise<{ success: boolean; isVisible: boolean }> {
    let studioId: string;
    let bookingId: string;
    let functionId: string | undefined;
    let employeeId: string;
    let isVisible: boolean;
    let updatedBy: string = 'Studio Owner';

    if (typeof studioIdOrParams === 'object') {
      studioId = studioIdOrParams.studioId;
      bookingId = studioIdOrParams.bookingId;
      functionId = studioIdOrParams.functionId;
      employeeId = studioIdOrParams.employeeId;
      isVisible = studioIdOrParams.isVisible;
      updatedBy = studioIdOrParams.updatedBy || 'Studio Owner';
    } else {
      studioId = studioIdOrParams;
      bookingId = bookingIdArg!;
      employeeId = employeeIdArg!;
      functionId = functionIdArg;
      isVisible = Boolean(isVisibleArg);
      updatedBy = updatedByArg;
    }

    const booking = bookingProductionService.getBooking(studioId, bookingId);
    if (!booking) {
      return { success: false, isVisible: false };
    }

    const targetFn = functionId
      ? (booking.functions || []).find(f => f.id === functionId) || (booking.functions && booking.functions[0])
      : (booking.functions && booking.functions[0]);

    if (targetFn && targetFn.assignedCrew) {
      const crewItem = targetFn.assignedCrew.find(c => c.employeeId === employeeId);
      if (crewItem) {
        (crewItem as any).isVisibleOnCalendar = isVisible;
      }
    }

    const fnId = targetFn?.id || 'main';
    const visibilityId = `vis_${bookingId}_${employeeId}_${fnId}`;

    const visRecord: EmployeeCalendarVisibilityRecord = {
      visibilityId,
      studioId,
      bookingId,
      eventFunctionId: fnId,
      employeeId,
      employeeName: (targetFn?.assignedCrew?.find(c => c.employeeId === employeeId)?.employeeName) || employeeId,
      isVisible,
      updatedAt: new Date().toISOString(),
      updatedBy
    };

    // Store in TenantStore
    this.saveVisibilityToTenantStore(studioId, visRecord);

    // Store in Firestore (skip network timeout in test environments)
    const isTestRunner = typeof process !== 'undefined' && Boolean(process.env?.VITEST || process.env?.NODE_ENV === 'test');
    if (!isTestRunner) {
      try {
        await firestoreService.saveDocument(
          studioId,
          `bookings/${bookingId}/calendarVisibility`,
          visibilityId,
          visRecord,
          true
        );
        await firestoreService.saveDocument(
          studioId,
          'calendarVisibility',
          visibilityId,
          visRecord,
          true
        );
      } catch (e) {
        console.warn('[CalendarVisibilityService] Firestore visibility update note:', e);
      }
    }

    // Save booking
    bookingProductionService.saveBooking(studioId, booking);

    // Record history
    bookingHistoryService.addHistoryItem(studioId, {
      bookingId,
      customerId: booking.customerId,
      activityType: 'event_updated',
      title: `Calendar Visibility ${isVisible ? 'Enabled' : 'Hidden'} for ${visRecord.employeeName}`,
      description: `Studio Owner marked ${visRecord.employeeName}'s schedule ${isVisible ? 'VISIBLE' : 'HIDDEN'} on their employee calendar. Assignment remains intact.`,
      relatedFunctionId: fnId,
      relatedFunctionName: targetFn?.name || 'Main Event',
      performedBy: 'owner',
      performedByName: updatedBy
    });

    return { success: true, isVisible };
  }

  /**
   * Unassign an employee from a function
   */
  async unassignCrewMember(studioId: string, bookingId: string, functionId: string, employeeId: string): Promise<boolean> {
    return this.removeCrewAssignment(studioId, bookingId, functionId, employeeId);
  }

  /**
   * Check if a specific employee assignment is currently visible on their calendar
   */
  isEmployeeVisibleOnCalendar(studioId: string, bookingId: string, employeeId: string, functionId?: string): boolean {
    const list = TenantStore.get<EmployeeCalendarVisibilityRecord>(studioId, 'calendarVisibility') || [];
    const record = list.find(v => 
      v.bookingId === bookingId && 
      v.employeeId === employeeId && 
      (!functionId || v.eventFunctionId === functionId)
    );

    if (record !== undefined) {
      return Boolean(record.isVisible);
    }

    // Fallback: check function assignedCrew property in booking
    const booking = bookingProductionService.getBooking(studioId, bookingId);
    if (booking?.functions) {
      for (const fn of booking.functions) {
        if (!functionId || fn.id === functionId) {
          const crew = (fn.assignedCrew || []).find(c => c.employeeId === employeeId);
          if (crew) {
            return (crew as any).isVisibleOnCalendar !== false;
          }
        }
      }
    }

    return true; // default visible
  }

  /**
   * Remove a crew assignment
   */
  async removeCrewAssignment(studioId: string, bookingId: string, functionId: string, employeeId: string): Promise<boolean> {
    const booking = bookingProductionService.getBooking(studioId, bookingId);
    if (!booking) return false;

    const fn = (booking.functions || []).find(f => f.id === functionId) || (booking.functions && booking.functions[0]);
    if (fn && fn.assignedCrew) {
      fn.assignedCrew = fn.assignedCrew.filter(c => c.employeeId !== employeeId);
      bookingProductionService.saveBooking(studioId, booking);
    }

    return true;
  }

  /**
   * Get employee visible calendar events (STRICT PRIVACY: Only assigned + isVisible=true)
   * Financial amounts, non-assigned events, and hidden events are completely omitted.
   */
  getEmployeeCalendarEvents(studioId: string, employeeId: string): EmployeeVisibleCalendarEvent[] {
    const result: EmployeeVisibleCalendarEvent[] = [];
    const allBookings = bookingProductionService.listBookings(studioId);

    allBookings.forEach(bkg => {
      // Don't include cancelled bookings
      if (bkg.status === 'cancelled') return;

      const fns = (bkg.functions && bkg.functions.length > 0)
        ? bkg.functions
        : [{
            id: `fn_${bkg.id}_main`,
            bookingId: bkg.id,
            name: bkg.eventName,
            category: bkg.category || 'Wedding',
            date: bkg.mainEventDate || bkg.startDate || '',
            startTime: '10:00',
            endTime: '18:00',
            venue: bkg.venue,
            city: bkg.city,
            assignedCrew: (bkg as any).crew || []
          }];

      fns.forEach((fn: any) => {
        const assignedMember = (fn.assignedCrew || []).find((c: any) => c.employeeId === employeeId || c.id === employeeId);
        if (!assignedMember) return; // Employee is not assigned to this function

        // Check visibility
        const isVisible = this.isEmployeeVisibleOnCalendar(studioId, bkg.id, employeeId, fn.id);
        if (!isVisible) return; // Employee visibility is HIDDEN by Studio Owner!

        result.push({
          id: `cal_${bkg.id}_${fn.id}`,
          bookingId: bkg.id,
          bookingNumber: bkg.bookingNumber || bkg.id,
          customerName: bkg.customerName || 'Private Customer',
          customerPhone: bkg.customerPhone || '',
          functionId: fn.id,
          eventName: bkg.eventName,
          functionName: fn.name,
          category: fn.category || bkg.category || 'Wedding',
          date: fn.date || bkg.mainEventDate || bkg.startDate || '',
          startTime: fn.startTime || '10:00',
          endTime: fn.endTime || '18:00',
          venue: fn.venue || bkg.venue || 'Venue',
          city: fn.city || bkg.city || '',
          responsibility: assignedMember.role || 'Crew Member',
          notes: fn.notes || bkg.description || '',
          status: bkg.status,
          assignedCrewCount: (fn.assignedCrew || []).length
        });
      });
    });

    // Also include from TenantStore 'events' if any legacy event matches
    const legacyEvents = TenantStore.get<StudioEvent>(studioId, 'events') || [];
    legacyEvents.forEach(evt => {
      if (result.some(r => r.bookingId === evt.id)) return;
      const isAssigned = (evt.assignedTeamIds || []).includes(employeeId) ||
        (evt.detailedAssignments || []).some(a => a.memberId === employeeId);

      if (!isAssigned) return;

      const isVisible = this.isEmployeeVisibleOnCalendar(studioId, evt.id, employeeId);
      if (!isVisible) return;

      const asgn = (evt.detailedAssignments || []).find(a => a.memberId === employeeId);
      result.push({
        id: `cal_evt_${evt.id}`,
        bookingId: evt.id,
        bookingNumber: evt.eventNumber || evt.id,
        customerName: evt.customerName || 'Private Customer',
        customerPhone: evt.customerPhone || '',
        functionId: 'main',
        eventName: evt.name || evt.title || 'Studio Shoot',
        functionName: evt.name || 'Main Event',
        category: evt.category || 'Wedding',
        date: evt.startDate || '',
        startTime: evt.startTime || '10:00',
        endTime: evt.endTime || '18:00',
        venue: evt.venue || 'Venue',
        city: evt.venueCity || '',
        responsibility: asgn?.roleTitle || 'Photographer',
        notes: evt.notes || '',
        status: evt.status || 'Confirmed',
        assignedCrewCount: (evt.assignedTeamIds || []).length
      });
    });

    // Sort by date then startTime
    return result.sort((a, b) => {
      const cmpDate = a.date.localeCompare(b.date);
      if (cmpDate !== 0) return cmpDate;
      return a.startTime.localeCompare(b.startTime);
    });
  }

  /**
   * List all crew assignments with their calendar visibility status for a booking
   */
  getBookingCrewTable(studioId: string, bookingOrId: string | BookingRecord | null | undefined): Array<{
    employeeId: string;
    employeeName: string;
    designation: string;
    role: string;
    responsibility: string;
    functionId: string;
    functionName: string;
    isAssigned: boolean;
    isVisibleOnCalendar: boolean;
    contact?: string;
  }> {
    if (!bookingOrId) return [];
    const booking = typeof bookingOrId === 'string'
      ? bookingProductionService.getBooking(studioId, bookingOrId)
      : bookingOrId;
    if (!booking) return [];

    const roster = crewConflictService.getActiveEmployees(studioId);
    const rows: Array<{
      employeeId: string;
      employeeName: string;
      designation: string;
      role: string;
      responsibility: string;
      functionId: string;
      functionName: string;
      isAssigned: boolean;
      isVisibleOnCalendar: boolean;
      contact?: string;
    }> = [];

    (booking.functions || []).forEach(fn => {
      (fn.assignedCrew || []).forEach(c => {
        const isVisible = this.isEmployeeVisibleOnCalendar(studioId, booking.id, c.employeeId, fn.id);
        const emp = roster.find(e => e.id === c.employeeId);
        rows.push({
          employeeId: c.employeeId,
          employeeName: c.employeeName,
          designation: emp?.designation || emp?.roleName || 'Production Staff',
          role: c.role,
          responsibility: c.role,
          functionId: fn.id,
          functionName: fn.name,
          isAssigned: true,
          isVisibleOnCalendar: isVisible,
          contact: c.contact || emp?.phone
        });
      });
    });

    return rows;
  }

  private saveAssignmentToTenantStore(studioId: string, asgn: CrewAssignmentRecord) {
    const all = TenantStore.get<CrewAssignmentRecord>(studioId, 'crewAssignments') || [];
    const idx = all.findIndex(a => a.assignmentId === asgn.assignmentId);
    if (idx >= 0) all[idx] = asgn;
    else all.push(asgn);
    TenantStore.set(studioId, 'crewAssignments', all);
  }

  private saveVisibilityToTenantStore(studioId: string, vis: EmployeeCalendarVisibilityRecord) {
    const all = TenantStore.get<EmployeeCalendarVisibilityRecord>(studioId, 'calendarVisibility') || [];
    const idx = all.findIndex(v => v.visibilityId === vis.visibilityId);
    if (idx >= 0) all[idx] = vis;
    else all.push(vis);
    TenantStore.set(studioId, 'calendarVisibility', all);
  }
}

export const calendarVisibilityService = new CalendarVisibilityService();
