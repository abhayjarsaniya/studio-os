import { SubEvent, SubEventSchema, SubEventStatus, SubEventMemberAssignment } from '../types/schema';
import { TenantStore } from './tenantStore';
import { auditService } from './auditService';
import { eventService } from './eventService';

export class SubEventService {
  listSubEvents(studioId: string, parentEventId?: string): SubEvent[] {
    if (!studioId) throw new Error('[subEventService.listSubEvents]: studioId is required');
    const all = TenantStore.get<SubEvent>(studioId, 'subEvents');
    if (parentEventId) {
      return all.filter(s => s.parentEventId === parentEventId).sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return all.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  getSubEvent(studioId: string, id: string): SubEvent | null {
    if (!studioId) throw new Error('[subEventService.getSubEvent]: studioId is required');
    const all = this.listSubEvents(studioId);
    return all.find(s => s.id === id) || null;
  }

  private generateSubEventNumber(studioId: string, parentEventId: string): string {
    const parent = eventService.getEvent(studioId, parentEventId);
    const existing = this.listSubEvents(studioId, parentEventId);
    const index = existing.length + 1;
    const padded = String(index).padStart(2, '0');
    const parentCode = parent ? parent.eventNumber : 'EVT';
    return `${parentCode}-S${padded}`;
  }

  createSubEvent(
    studioId: string,
    data: Omit<SubEvent, 'id' | 'studioId' | 'subEventNumber' | 'createdAt' | 'updatedAt'> & { subEventNumber?: string }
  ): SubEvent {
    if (!studioId) throw new Error('[subEventService.createSubEvent]: studioId is required');
    if (!data.parentEventId) throw new Error('[subEventService.createSubEvent]: parentEventId is required');
    if (!data.name || !data.name.trim()) throw new Error('[subEventService.createSubEvent]: sub-event name is required');

    const all = this.listSubEvents(studioId);
    const subEventNumber = data.subEventNumber || this.generateSubEventNumber(studioId, data.parentEventId);

    const newSubEvent: SubEvent = {
      ...data,
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      studioId,
      subEventNumber,
      assignedMemberIds: data.assignedMemberIds || (data.assignedMembers ? data.assignedMembers.map(m => m.memberId) : []),
      assignedMembers: data.assignedMembers || [],
      sortOrder: data.sortOrder ?? all.filter(s => s.parentEventId === data.parentEventId).length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    SubEventSchema.parse(newSubEvent);
    TenantStore.set(studioId, 'subEvents', [...all, newSubEvent]);

    auditService.log(
      studioId,
      'system',
      'CREATE_SUB_EVENT',
      'subEvent',
      newSubEvent.id,
      { name: newSubEvent.name, parentEventId: newSubEvent.parentEventId, subEventNumber }
    );

    return newSubEvent;
  }

  updateSubEvent(studioId: string, id: string, updates: Partial<SubEvent>): SubEvent {
    if (!studioId) throw new Error('[subEventService.updateSubEvent]: studioId is required');
    const all = this.listSubEvents(studioId);
    const index = all.findIndex(s => s.id === id);
    if (index === -1) throw new Error(`[subEventService.updateSubEvent]: SubEvent ${id} not found`);

    const updated: SubEvent = {
      ...all[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    if (updates.assignedMembers && !updates.assignedMemberIds) {
      updated.assignedMemberIds = updates.assignedMembers.map(m => m.memberId);
    }

    SubEventSchema.parse(updated);
    all[index] = updated;
    TenantStore.set(studioId, 'subEvents', all);

    auditService.log(
      studioId,
      'system',
      'UPDATE_SUB_EVENT',
      'subEvent',
      id,
      { updates: Object.keys(updates) }
    );

    return updated;
  }

  deleteSubEvent(studioId: string, id: string): void {
    if (!studioId) throw new Error('[subEventService.deleteSubEvent]: studioId is required');
    const all = this.listSubEvents(studioId);
    const target = all.find(s => s.id === id);
    if (!target) return;

    const filtered = all.filter(s => s.id !== id);
    TenantStore.set(studioId, 'subEvents', filtered);

    auditService.log(
      studioId,
      'system',
      'DELETE_SUB_EVENT',
      'subEvent',
      id,
      { name: target.name, parentEventId: target.parentEventId }
    );
  }

  duplicateSubEvent(studioId: string, id: string): SubEvent {
    if (!studioId) throw new Error('[subEventService.duplicateSubEvent]: studioId is required');
    const original = this.getSubEvent(studioId, id);
    if (!original) throw new Error(`[subEventService.duplicateSubEvent]: SubEvent ${id} not found`);

    const { id: _ignored, studioId: _s, subEventNumber: _sn, createdAt: _ca, updatedAt: _ua, ...copyData } = original;

    return this.createSubEvent(studioId, {
      ...copyData,
      name: `${original.name} (Copy)`,
      sortOrder: original.sortOrder + 1
    });
  }

  reorderSubEvents(studioId: string, parentEventId: string, orderedIds: string[]): SubEvent[] {
    if (!studioId) throw new Error('[subEventService.reorderSubEvents]: studioId is required');
    const all = this.listSubEvents(studioId);
    const otherEventsSubs = all.filter(s => s.parentEventId !== parentEventId);
    const parentSubs = all.filter(s => s.parentEventId === parentEventId);

    const reordered: SubEvent[] = orderedIds.map((id, index) => {
      const match = parentSubs.find(s => s.id === id);
      if (!match) throw new Error(`SubEvent ${id} does not belong to parent ${parentEventId}`);
      return {
        ...match,
        sortOrder: index,
        updatedAt: new Date().toISOString()
      };
    });

    TenantStore.set(studioId, 'subEvents', [...otherEventsSubs, ...reordered]);
    return reordered;
  }

  updateSubEventStatus(studioId: string, id: string, status: SubEventStatus): SubEvent {
    return this.updateSubEvent(studioId, id, { status });
  }

  assignMemberToSubEvent(studioId: string, subEventId: string, member: SubEventMemberAssignment): SubEvent {
    return this.assignMember(studioId, subEventId, member);
  }

  assignMember(studioId: string, subEventId: string, member: SubEventMemberAssignment): SubEvent {
    const subEvent = this.getSubEvent(studioId, subEventId);
    if (!subEvent) throw new Error(`SubEvent ${subEventId} not found`);

    const memberId = (member as any).memberId || (member as any).employeeId;
    const memberName = member.memberName || (member as any).fullName;
    const roleTitle = (member as any).roleTitle || (member as any).role || 'Photographer';

    const cleanMember: SubEventMemberAssignment = {
      memberId,
      memberName,
      roleTitle,
      department: member.department,
      avatarUrl: member.avatarUrl
    };

    const existingMembers = subEvent.assignedMembers || [];
    const exists = existingMembers.some(m => m.memberId === cleanMember.memberId);
    if (exists) return subEvent;

    const updatedMembers = [...existingMembers, cleanMember];
    const updatedMemberIds = updatedMembers.map(m => m.memberId);

    return this.updateSubEvent(studioId, subEventId, {
      assignedMembers: updatedMembers,
      assignedMemberIds: updatedMemberIds
    });
  }

  removeMember(studioId: string, subEventId: string, memberId: string): SubEvent {
    const subEvent = this.getSubEvent(studioId, subEventId);
    if (!subEvent) throw new Error(`SubEvent ${subEventId} not found`);

    const updatedMembers = (subEvent.assignedMembers || []).filter(m => m.memberId !== memberId);
    const updatedMemberIds = updatedMembers.map(m => m.memberId);

    return this.updateSubEvent(studioId, subEventId, {
      assignedMembers: updatedMembers,
      assignedMemberIds: updatedMemberIds
    });
  }

  calculateParentProgress(studioId: string, parentEventId: string) {
    const subEvents = this.listSubEvents(studioId, parentEventId);
    const total = subEvents.length;
    if (total === 0) {
      return {
        total: 0,
        completed: 0,
        upcoming: 0,
        pending: 0,
        inProgress: 0,
        cancelled: 0,
        percentage: 0
      };
    }

    const completed = subEvents.filter(s => s.status === 'Completed').length;
    const inProgress = subEvents.filter(s => s.status === 'In Progress').length;
    const upcoming = subEvents.filter(s => s.status === 'Confirmed').length;
    const pending = subEvents.filter(s => s.status === 'Tentative').length;
    const cancelled = subEvents.filter(s => s.status === 'Cancelled').length;

    // Active sub-events (excluding cancelled) for percentage calculation
    const eligibleTotal = total - cancelled > 0 ? total - cancelled : total;
    const percentage = Math.round((completed / eligibleTotal) * 100);

    return {
      total,
      completed,
      upcoming,
      pending,
      inProgress,
      cancelled,
      percentage: Math.min(percentage, 100)
    };
  }
}

export const subEventService = new SubEventService();
