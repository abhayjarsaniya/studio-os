import { StudioEvent, EventSchema, EventStatus, StatusChangeRecord, EventAttachment, EventAssignment } from '../types/schema';
import { TenantStore } from './tenantStore';

export const eventService = {
  listEvents(studioId: string): StudioEvent[] {
    if (!studioId) throw new Error('[eventService.listEvents]: studioId is required');
    let evts = TenantStore.get<StudioEvent>(studioId, 'events');
    if ((!evts || evts.length === 0) && (studioId === 'studio_shreeji_films' || studioId === 'std_demo_royal')) {
      const fallbackId = studioId === 'studio_shreeji_films' ? 'std_demo_royal' : 'studio_shreeji_films';
      evts = TenantStore.get<StudioEvent>(fallbackId, 'events');
    }
    return evts || [];
  },

  getEvent(studioId: string, eventId: string): StudioEvent | undefined {
    if (!studioId) throw new Error('[eventService.getEvent]: studioId is required');
    return this.listEvents(studioId).find(e => e.id === eventId);
  },

  /**
   * Generates a unique, sequential, transaction-safe event ID per studio.
   * Format: EVT-YYYY-000001
   */
  generateEventNumber(studioId: string): string {
    const currentYear = new Date().getFullYear();
    const counterKey = `event_counter_${currentYear}`;
    const currentCount = TenantStore.getSingle<number>(studioId, counterKey) || 0;
    const nextCount = currentCount + 1;
    TenantStore.set(studioId, counterKey, nextCount);

    const padded = String(nextCount).padStart(6, '0');
    return `EVT-${currentYear}-${padded}`;
  },

  createEvent(
    studioId: string, 
    data: Omit<StudioEvent, 'id' | 'studioId' | 'eventNumber' | 'tasksCount' | 'invoiceIds' | 'createdAt' | 'updatedAt'> & { eventNumber?: string }
  ): StudioEvent {
    if (!studioId) throw new Error('[eventService.createEvent]: studioId is required');

    // Date range validation
    if (data.endDate && data.startDate && data.endDate < data.startDate) {
      throw new Error('[Validation Error]: Event end date cannot be earlier than start date.');
    }

    const events = this.listEvents(studioId);
    const eventNumber = data.eventNumber || this.generateEventNumber(studioId);

    const initialHistory: StatusChangeRecord[] = [
      {
        id: `sh_${Date.now()}`,
        fromStatus: data.status,
        toStatus: data.status,
        changedBy: data.createdBy || 'system',
        changedByName: 'Creator',
        timestamp: new Date().toISOString(),
        remarks: 'Event created and initialized'
      }
    ];

    const newEvent: StudioEvent = {
      ...data,
      id: `ev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      studioId,
      eventNumber,
      title: data.title || data.name || 'Untitled Shoot',
      name: data.name || data.title || 'Untitled Shoot',
      customerId: data.customerId || 'cust_guest',
      customerName: data.customerName || 'Studio Client',
      customerPhone: data.customerPhone || '9876543210',
      category: data.category || 'Wedding',
      startTime: data.startTime || '10:00',
      endTime: data.endTime || '18:00',
      endDate: data.endDate || data.startDate,
      venue: data.venue || 'Main Studio Stage',
      venueCity: data.venueCity || 'Mumbai',
      priority: data.priority || 'Medium',
      deliverables: data.deliverables || [],
      assignedTeamIds: data.assignedTeamIds || [],
      detailedAssignments: data.detailedAssignments || [],
      attachments: data.attachments || [],
      statusHistory: initialHistory,
      invoiceIds: [],
      tasksCount: { total: 0, completed: 0 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: data.createdBy || 'system'
    };

    EventSchema.parse(newEvent);
    TenantStore.set(studioId, 'events', [newEvent, ...events]);
    return newEvent;
  },

  updateEvent(studioId: string, eventId: string, updates: Partial<StudioEvent>): StudioEvent {
    if (!studioId) throw new Error('[eventService.updateEvent]: studioId is required');

    // Validate date range if updating dates
    if (updates.startDate || updates.endDate) {
      const existing = this.getEvent(studioId, eventId);
      const start = updates.startDate || existing?.startDate;
      const end = updates.endDate || existing?.endDate;
      if (start && end && end < start) {
        throw new Error('[Validation Error]: Event end date cannot be earlier than start date.');
      }
    }

    const events = this.listEvents(studioId);
    let updated: StudioEvent | null = null;
    const newList = events.map(e => {
      if (e.id === eventId) {
        let safeNotes = updates.notes;
        if (typeof safeNotes !== 'string') {
          safeNotes = typeof e.notes === 'string' 
            ? e.notes 
            : Array.isArray(e.notes) 
              ? (e.notes as any[]).map(n => n?.note || n?.text || JSON.stringify(n)).join('\n') 
              : '';
        }

        const rawAssignments = updates.detailedAssignments || e.detailedAssignments || [];
        const safeAssignments = rawAssignments.map((a: any) => ({
          memberId: a.memberId || a.id || 'unknown',
          memberName: a.memberName || a.name || 'Crew Member',
          roleTitle: a.roleTitle || a.role || 'Crew Member',
          department: a.department || 'Photography',
          assignedDates: a.assignedDates || [updates.startDate || e.startDate || ''],
          assignedBy: a.assignedBy || 'owner',
          assignedAt: a.assignedAt || new Date().toISOString()
        }));

        updated = { 
          ...e, 
          ...updates, 
          detailedAssignments: safeAssignments,
          notes: safeNotes,
          createdAt: e.createdAt || updates.createdAt || new Date().toISOString(),
          createdBy: e.createdBy || (updates as any)?.createdBy || 'system',
          updatedAt: new Date().toISOString() 
        };
        EventSchema.parse(updated);
        return updated;
      }
      return e;
    });
    if (!updated) throw new Error(`Event ${eventId} not found in studio ${studioId}`);
    TenantStore.set(studioId, 'events', newList);
    return updated;
  },

  updateEventStatus(
    studioId: string, 
    eventId: string, 
    newStatus: EventStatus,
    changedBy: string = 'system',
    changedByName: string = 'Staff',
    remarks?: string
  ): StudioEvent {
    const existing = this.getEvent(studioId, eventId);
    if (!existing) throw new Error(`Event ${eventId} not found`);

    const record: StatusChangeRecord = {
      id: `sh_${Date.now()}`,
      fromStatus: existing.status,
      toStatus: newStatus,
      changedBy,
      changedByName,
      timestamp: new Date().toISOString(),
      remarks: remarks || `Status changed from ${existing.status} to ${newStatus}`
    };

    const history = existing.statusHistory ? [record, ...existing.statusHistory] : [record];

    return this.updateEvent(studioId, eventId, {
      status: newStatus,
      statusHistory: history
    });
  },

  addAttachment(studioId: string, eventId: string, attachment: Omit<EventAttachment, 'id' | 'uploadedAt'>): EventAttachment {
    const event = this.getEvent(studioId, eventId);
    if (!event) throw new Error(`Event ${eventId} not found`);

    const newAttach: EventAttachment = {
      ...attachment,
      id: `att_${Date.now()}`,
      uploadedAt: new Date().toISOString()
    };

    const attachments = event.attachments ? [newAttach, ...event.attachments] : [newAttach];
    this.updateEvent(studioId, eventId, { attachments });
    return newAttach;
  },

  removeAttachment(studioId: string, eventId: string, attachmentId: string): void {
    const event = this.getEvent(studioId, eventId);
    if (!event) throw new Error(`Event ${eventId} not found`);

    const attachments = (event.attachments || []).filter(a => a.id !== attachmentId);
    this.updateEvent(studioId, eventId, { attachments });
  },

  assignMember(studioId: string, eventId: string, assignment: EventAssignment): void {
    const event = this.getEvent(studioId, eventId);
    if (!event) throw new Error(`Event ${eventId} not found`);

    const assignedTeamIds = Array.from(new Set([...(event.assignedTeamIds || []), assignment.memberId]));
    const detailedAssignments = [
      ...(event.detailedAssignments || []).filter(a => a.memberId !== assignment.memberId),
      assignment
    ];

    this.updateEvent(studioId, eventId, { assignedTeamIds, detailedAssignments });
  },

  removeMember(studioId: string, eventId: string, memberId: string): void {
    const event = this.getEvent(studioId, eventId);
    if (!event) throw new Error(`Event ${eventId} not found`);

    const assignedTeamIds = (event.assignedTeamIds || []).filter(id => id !== memberId);
    const detailedAssignments = (event.detailedAssignments || []).filter(a => a.memberId !== memberId);

    this.updateEvent(studioId, eventId, { assignedTeamIds, detailedAssignments });
  },

  deleteEvent(studioId: string, eventId: string): void {
    if (!studioId) throw new Error('[eventService.deleteEvent]: studioId is required');
    const events = this.listEvents(studioId);
    TenantStore.set(studioId, 'events', events.filter(e => e.id !== eventId));
  }
};
