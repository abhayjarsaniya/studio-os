import { 
  LeaveType, 
  LeaveTypeSchema, 
  LeaveRequest, 
  LeaveRequestSchema, 
  LeaveBalance, 
  LeaveBalanceSchema,
  LeaveRequestStatus 
} from '../types/schema';
import { TenantStore } from './tenantStore';
import { auditService } from './auditService';
import { employeeService } from './employeeService';

export const DEFAULT_LEAVE_TYPES: Array<Omit<LeaveType, 'id' | 'studioId'>> = [
  { name: 'Casual Leave', defaultAllowancePerYear: 12, isPaid: true, color: 'blue', isActive: true },
  { name: 'Sick Leave', defaultAllowancePerYear: 8, isPaid: true, color: 'emerald', isActive: true },
  { name: 'Emergency Leave', defaultAllowancePerYear: 4, isPaid: true, color: 'amber', isActive: true },
  { name: 'Paid Leave', defaultAllowancePerYear: 10, isPaid: true, color: 'purple', isActive: true },
  { name: 'Unpaid Leave', defaultAllowancePerYear: 15, isPaid: false, color: 'zinc', isActive: true },
  { name: 'Personal Leave', defaultAllowancePerYear: 5, isPaid: true, color: 'indigo', isActive: true },
  { name: 'Custom Leave', defaultAllowancePerYear: 5, isPaid: true, color: 'rose', isActive: true }
];

export class LeaveService {
  listLeaveTypes(studioId: string): LeaveType[] {
    if (!studioId) throw new Error('[leaveService.listLeaveTypes]: studioId is required');
    const existing = TenantStore.get<LeaveType>(studioId, 'leaveTypes');
    if (existing.length === 0) {
      const seeded: LeaveType[] = DEFAULT_LEAVE_TYPES.map((lt, idx) => ({
        ...lt,
        id: `lt_${studioId}_${idx + 1}`,
        studioId
      }));
      TenantStore.set(studioId, 'leaveTypes', seeded);
      return seeded;
    }
    return existing;
  }

  listLeaveRequests(studioId: string, employeeId?: string): LeaveRequest[] {
    if (!studioId) throw new Error('[leaveService.listLeaveRequests]: studioId is required');
    const all = TenantStore.get<LeaveRequest>(studioId, 'leaveRequests');
    if (employeeId) {
      return all.filter(r => r.employeeId === employeeId).sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());
    }
    return all.sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());
  }

  getLeaveBalance(studioId: string, employeeId: string, year: number = 2026): LeaveBalance {
    if (!studioId) throw new Error('[leaveService.getLeaveBalance]: studioId is required');
    const allBalances = TenantStore.get<LeaveBalance>(studioId, 'leaveBalances');
    let balance = allBalances.find(b => b.employeeId === employeeId && b.year === year);

    const types = this.listLeaveTypes(studioId);
    const approvedRequests = this.listLeaveRequests(studioId, employeeId).filter(
      r => r.status === 'approved' && r.startDate.startsWith(String(year))
    );

    if (!balance) {
      const emp = employeeService.getEmployee(studioId, employeeId);
      const categoryBalances = types.map(t => {
        const used = approvedRequests
          .filter(r => r.leaveTypeId === t.id)
          .reduce((sum, r) => sum + r.totalDays, 0);
        return {
          leaveTypeId: t.id,
          leaveTypeName: t.name,
          totalAllowed: t.defaultAllowancePerYear,
          usedDays: used,
          remainingDays: Math.max(0, t.defaultAllowancePerYear - used)
        };
      });

      const totalAllowed = categoryBalances.reduce((s, c) => s + c.totalAllowed, 0);
      const totalUsed = categoryBalances.reduce((s, c) => s + c.usedDays, 0);

      balance = {
        id: `lb_${employeeId}_${year}`,
        studioId,
        employeeId,
        employeeName: emp ? emp.fullName : 'Employee',
        year,
        balances: categoryBalances,
        totalAllowed,
        totalUsed,
        totalRemaining: Math.max(0, totalAllowed - totalUsed),
        totalUnpaid: 0
      };
      TenantStore.set(studioId, 'leaveBalances', [...allBalances, balance]);
    } else {
      // Recalculate accurately based on current approved requests
      balance.balances = types.map(t => {
        const used = approvedRequests
          .filter(r => r.leaveTypeId === t.id)
          .reduce((sum, r) => sum + r.totalDays, 0);
        const prevAllowed = balance?.balances.find(b => b.leaveTypeId === t.id)?.totalAllowed ?? t.defaultAllowancePerYear;
        return {
          leaveTypeId: t.id,
          leaveTypeName: t.name,
          totalAllowed: prevAllowed,
          usedDays: used,
          remainingDays: Math.max(0, prevAllowed - used)
        };
      });
      balance.totalAllowed = balance.balances.reduce((s, c) => s + c.totalAllowed, 0);
      balance.totalUsed = balance.balances.reduce((s, c) => s + c.usedDays, 0);
      balance.totalRemaining = Math.max(0, balance.totalAllowed - balance.totalUsed);
    }

    return balance;
  }

  calculateLeaveDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 1;
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  }

  submitLeaveRequest(studioId: string, data: any): LeaveRequest {
    return this.submitRequest(studioId, data);
  }

  reviewLeaveRequest(studioId: string, requestId: string, review: { status: 'Approved' | 'Rejected'; reviewerId?: string; reviewerName?: string; remarks?: string }): LeaveRequest {
    return this.reviewRequest(studioId, requestId, review.status.toLowerCase() as any, review.reviewerId, review.remarks);
  }

  applyLeave(
    studioId: string,
    data: Omit<LeaveRequest, 'id' | 'studioId' | 'status' | 'appliedAt'>
  ): LeaveRequest {
    if (!studioId) throw new Error('[leaveService.applyLeave]: studioId is required');
    if (data.endDate < data.startDate) {
      throw new Error('Leave end date cannot be earlier than start date.');
    }

    const allRequests = this.listLeaveRequests(studioId);

    // Check for overlapping pending or approved requests
    const hasOverlap = allRequests.some(
      r => r.employeeId === data.employeeId &&
           (r.status === 'pending' || r.status === 'approved') &&
           !(data.endDate < r.startDate || data.startDate > r.endDate)
    );
    if (hasOverlap) {
      throw new Error('A leave request is already pending or approved for these dates.');
    }

    const totalDays = data.totalDays || this.calculateLeaveDays(data.startDate, data.endDate);

    const newRequest: LeaveRequest = {
      ...data,
      id: `lvr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      studioId,
      totalDays,
      status: 'pending',
      appliedAt: new Date().toISOString()
    };

    LeaveRequestSchema.parse(newRequest);
    TenantStore.set(studioId, 'leaveRequests', [newRequest, ...allRequests]);

    auditService.log(
      studioId,
      data.employeeId,
      'APPLY_LEAVE',
      'leaveRequest',
      newRequest.id,
      { employeeName: data.employeeName, leaveType: data.leaveTypeName, totalDays }
    );

    return newRequest;
  }

  approveLeave(
    studioId: string,
    requestId: string,
    adminId: string = 'admin',
    adminName: string = 'Studio Admin'
  ): LeaveRequest {
    const all = this.listLeaveRequests(studioId);
    const index = all.findIndex(r => r.id === requestId);
    if (index === -1) throw new Error(`Leave request ${requestId} not found`);

    all[index] = {
      ...all[index],
      status: 'approved',
      reviewedBy: adminId,
      reviewedByName: adminName,
      reviewedAt: new Date().toISOString()
    };

    TenantStore.set(studioId, 'leaveRequests', all);

    // Trigger balance re-calculation
    this.getLeaveBalance(studioId, all[index].employeeId);

    auditService.log(
      studioId,
      adminId,
      'APPROVE_LEAVE',
      'leaveRequest',
      requestId,
      { employeeName: all[index].employeeName, days: all[index].totalDays }
    );

    return all[index];
  }

  rejectLeave(
    studioId: string,
    requestId: string,
    remarks: string,
    adminId: string = 'admin',
    adminName: string = 'Studio Admin'
  ): LeaveRequest {
    const all = this.listLeaveRequests(studioId);
    const index = all.findIndex(r => r.id === requestId);
    if (index === -1) throw new Error(`Leave request ${requestId} not found`);

    all[index] = {
      ...all[index],
      status: 'rejected',
      rejectionRemarks: remarks || 'Rejected by studio administrator',
      reviewedBy: adminId,
      reviewedByName: adminName,
      reviewedAt: new Date().toISOString()
    };

    TenantStore.set(studioId, 'leaveRequests', all);

    auditService.log(
      studioId,
      adminId,
      'REJECT_LEAVE',
      'leaveRequest',
      requestId,
      { employeeName: all[index].employeeName, remarks }
    );

    return all[index];
  }

  cancelLeave(studioId: string, requestId: string, employeeId: string): LeaveRequest {
    const all = this.listLeaveRequests(studioId);
    const index = all.findIndex(r => r.id === requestId);
    if (index === -1) throw new Error(`Leave request ${requestId} not found`);
    if (all[index].employeeId !== employeeId) throw new Error('Unauthorized to cancel this request');
    if (all[index].status !== 'pending') throw new Error('Only pending requests can be cancelled');

    all[index] = {
      ...all[index],
      status: 'cancelled',
      reviewedAt: new Date().toISOString()
    };

    TenantStore.set(studioId, 'leaveRequests', all);
    return all[index];
  }

  getEmployeesOnLeaveToday(studioId: string, today: string = new Date().toISOString().split('T')[0]): LeaveRequest[] {
    const all = this.listLeaveRequests(studioId);
    return all.filter(r => r.status === 'approved' && today >= r.startDate && today <= r.endDate);
  }

  getUpcomingLeaves(studioId: string, today: string = new Date().toISOString().split('T')[0]): LeaveRequest[] {
    const all = this.listLeaveRequests(studioId);
    return all.filter(r => r.status === 'approved' && r.startDate > today).sort((a, b) => a.startDate.localeCompare(b.startDate));
  }

  listRequests(studioId: string, filter?: { employeeId?: string; status?: string }): LeaveRequest[] {
    let all = this.listLeaveRequests(studioId, filter?.employeeId);
    if (filter?.status) {
      all = all.filter(r => r.status === filter.status);
    }
    return all;
  }

  submitRequest(
    studioId: string,
    data: {
      employeeId: string;
      employeeName: string;
      leaveTypeId: string;
      startDate: string;
      endDate: string;
      days?: number;
      totalDays?: number;
      reason: string;
    }
  ): LeaveRequest {
    const types = this.listLeaveTypes(studioId);
    const typeObj = types.find(t => t.id === data.leaveTypeId || t.name.toLowerCase() === data.leaveTypeId.toLowerCase());
    return this.applyLeave(studioId, {
      employeeId: data.employeeId,
      employeeName: data.employeeName,
      leaveTypeId: typeObj ? typeObj.id : data.leaveTypeId,
      leaveTypeName: typeObj ? typeObj.name : 'Casual Leave',
      startDate: data.startDate,
      endDate: data.endDate,
      totalDays: data.days || data.totalDays || this.calculateLeaveDays(data.startDate, data.endDate),
      reason: data.reason
    });
  }

  reviewRequest(
    studioId: string,
    requestId: string,
    status: 'approved' | 'rejected',
    reviewerId: string = 'system',
    remarks?: string
  ): LeaveRequest {
    if (status === 'approved') {
      return this.approveLeave(studioId, requestId, reviewerId, 'Studio Manager');
    } else {
      return this.rejectLeave(studioId, requestId, reviewerId, 'Studio Manager', remarks || 'Rejected');
    }
  }
}

export const leaveService = new LeaveService();
