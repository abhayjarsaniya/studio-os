import { FollowUp, FollowUpSchema, FollowUpStatus } from '../types/schema';
import { TenantStore } from './tenantStore';
import { auditService } from './auditService';
import { notificationService } from './notificationService';
import { leaveService } from './leaveService';

export interface FollowUpFilterOptions {
  customerId?: string;
  assignedEmployeeId?: string;
  status?: string;
  isToday?: boolean;
  isUpcoming?: boolean;
  isOverdue?: boolean;
}

export class FollowUpService {
  listFollowUps(studioId: string, filter?: FollowUpFilterOptions): FollowUp[] {
    if (!studioId) throw new Error('[followUpService.listFollowUps]: studioId is required');
    let all = TenantStore.get<FollowUp>(studioId, 'followUps');
    const todayStr = new Date().toISOString().split('T')[0];

    if (filter) {
      if (filter.customerId) {
        all = all.filter(f => f.customerId === filter.customerId);
      }
      if (filter.assignedEmployeeId && filter.assignedEmployeeId !== 'All') {
        all = all.filter(f => f.assignedEmployeeId === filter.assignedEmployeeId);
      }
      if (filter.status && filter.status !== 'All') {
        all = all.filter(f => f.status === filter.status);
      }
      if (filter.isToday) {
        all = all.filter(f => f.dueDate === todayStr && f.status === 'pending');
      }
      if (filter.isUpcoming) {
        all = all.filter(f => f.dueDate > todayStr && f.status === 'pending');
      }
      if (filter.isOverdue) {
        all = all.filter(f => f.dueDate < todayStr && f.status === 'pending');
      }
    }

    return all;
  }

  getFollowUp(studioId: string, id: string): FollowUp | undefined {
    return this.listFollowUps(studioId).find(f => f.id === id);
  }

  createFollowUp(
    studioId: string,
    data: {
      customerId?: string;
      customerName?: string;
      customerPhone?: string;
      relatedLeadId?: string;
      relatedEventId?: string;
      assignedEmployeeId: string;
      assignedEmployeeName?: string;
      dueDate: string;
      dueTime?: string;
      reason: string;
      priority?: 'Low' | 'Medium' | 'High';
      status?: FollowUpStatus;
      notes?: string;
    },
    operatorId: string = 'system'
  ): FollowUp {
    if (!studioId) throw new Error('[followUpService.createFollowUp]: studioId is required');
    if (!data.assignedEmployeeId) throw new Error('Assigned employee ID is required for follow-up.');
    if (!data.reason || !data.reason.trim()) throw new Error('Follow-up reason is required.');
    if (!data.dueDate) throw new Error('Follow-up due date is required.');

    const followUps = this.listFollowUps(studioId);
    const newFollowUp: FollowUp = {
      ...data,
      id: `fu_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      studioId,
      assignedEmployeeName: data.assignedEmployeeName || 'Assigned Staff',
      priority: data.priority || 'Medium',
      status: data.status || 'pending',
      createdAt: new Date().toISOString()
    };

    FollowUpSchema.parse(newFollowUp);
    TenantStore.set(studioId, 'followUps', [newFollowUp, ...followUps]);

    // Send notification to assigned employee
    if (data.assignedEmployeeId) {
      notificationService.createNotification(studioId, {
        title: `New Follow-Up Assigned: ${data.customerName || 'Client'}`,
        message: `${data.reason} due on ${data.dueDate}`,
        type: 'task',
        timestamp: 'Just now',
        read: false,
        linkTab: 'customers',
        linkId: data.customerId
      });
    }

    auditService.log(
      studioId,
      operatorId,
      'CREATE_FOLLOW_UP',
      'followUp',
      newFollowUp.id,
      { customerName: data.customerName, dueDate: data.dueDate, reason: data.reason }
    );

    return newFollowUp;
  }

  completeFollowUp(studioId: string, id: string, operatorId: string, operatorName: string, completionNotes?: string): FollowUp {
    if (!studioId) throw new Error('[followUpService.completeFollowUp]: studioId is required');
    const followUps = this.listFollowUps(studioId);
    const index = followUps.findIndex(f => f.id === id);
    if (index === -1) throw new Error(`Follow-up ${id} not found`);

    const existing = followUps[index];
    const updated: FollowUp = {
      ...existing,
      status: 'completed',
      completedAt: new Date().toISOString(),
      completedBy: operatorName,
      notes: completionNotes ? `${existing.notes || ''}\nCompletion Note: ${completionNotes}`.trim() : existing.notes
    };

    followUps[index] = updated;
    TenantStore.set(studioId, 'followUps', followUps);

    auditService.log(studioId, operatorId, 'COMPLETE_FOLLOW_UP', 'followUp', id, { completedBy: operatorName });
    return updated;
  }

  rescheduleFollowUp(studioId: string, id: string, newDueDate: string, newDueTime?: string, operatorId: string = 'system'): FollowUp {
    if (!studioId) throw new Error('[followUpService.rescheduleFollowUp]: studioId is required');
    const followUps = this.listFollowUps(studioId);
    const index = followUps.findIndex(f => f.id === id);
    if (index === -1) throw new Error(`Follow-up ${id} not found`);

    const updated: FollowUp = {
      ...followUps[index],
      dueDate: newDueDate,
      dueTime: newDueTime || followUps[index].dueTime,
      status: 'rescheduled'
    };

    followUps[index] = updated;
    TenantStore.set(studioId, 'followUps', followUps);

    auditService.log(studioId, operatorId, 'RESCHEDULE_FOLLOW_UP', 'followUp', id, { newDueDate });
    return updated;
  }

  reassignFollowUp(
    studioId: string,
    id: string,
    newEmployeeId: string,
    newEmployeeName: string,
    operatorId: string = 'system'
  ): FollowUp {
    if (!studioId) throw new Error('[followUpService.reassignFollowUp]: studioId is required');
    const followUps = this.listFollowUps(studioId);
    const index = followUps.findIndex(f => f.id === id);
    if (index === -1) throw new Error(`Follow-up ${id} not found`);

    const updated: FollowUp = {
      ...followUps[index],
      assignedEmployeeId: newEmployeeId,
      assignedEmployeeName: newEmployeeName
    };

    followUps[index] = updated;
    TenantStore.set(studioId, 'followUps', followUps);

    notificationService.createNotification(studioId, {
      title: `Follow-Up Reassigned to You: ${updated.customerName || 'Client'}`,
      message: `${updated.reason} due on ${updated.dueDate}`,
      type: 'task',
      timestamp: 'Just now',
      read: false,
      linkTab: 'customers',
      linkId: updated.customerId
    });

    auditService.log(studioId, operatorId, 'REASSIGN_FOLLOW_UP', 'followUp', id, { newEmployeeName });
    return updated;
  }

  /**
   * Checks if the assigned employee is currently on approved leave.
   * If on leave, managers are alerted to reassign pending follow-ups.
   */
  isAssigneeOnLeave(studioId: string, employeeId: string, targetDate?: string): boolean {
    const dateToCheck = targetDate || new Date().toISOString().split('T')[0];
    const leaves = leaveService.listRequests(studioId, { employeeId, status: 'approved' });
    return leaves.some(l => l.startDate <= dateToCheck && l.endDate >= dateToCheck);
  }
}

export const followUpService = new FollowUpService();
