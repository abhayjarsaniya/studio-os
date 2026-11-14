import { 
  ApprovalRequest, 
  ApprovalRequestSchema, 
  ApprovalHistory, 
  ApprovalHistorySchema, 
  ApprovalWorkflowType,
  ApprovalStatus 
} from '../types/schema';
import { TenantStore } from './tenantStore';
import { auditService } from './auditService';

export class ApprovalService {
  listRequests(
    studioId: string, 
    filter?: { status?: ApprovalStatus; workflowType?: ApprovalWorkflowType; requestedBy?: string }
  ): ApprovalRequest[] {
    if (!studioId) throw new Error('[approvalService.listRequests]: studioId is required');
    let all = TenantStore.get<ApprovalRequest>(studioId, 'approvalRequests');
    if (filter?.status) {
      all = all.filter(r => r.status === filter.status);
    }
    if (filter?.workflowType) {
      all = all.filter(r => r.workflowType === filter.workflowType);
    }
    if (filter?.requestedBy) {
      all = all.filter(r => r.requestedBy === filter.requestedBy);
    }
    return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getRequest(studioId: string, id: string): ApprovalRequest | null {
    if (!studioId) throw new Error('[approvalService.getRequest]: studioId is required');
    const all = TenantStore.get<ApprovalRequest>(studioId, 'approvalRequests');
    return all.find(r => r.id === id) || null;
  }

  submitRequest(
    studioId: string,
    data: Omit<ApprovalRequest, 'id' | 'studioId' | 'status' | 'createdAt' | 'updatedAt' | 'details'> & { details?: Record<string, any> }
  ): ApprovalRequest {
    if (!studioId) throw new Error('[approvalService.submitRequest]: studioId is required');
    if (!data.workflowType || !data.entityId || !data.requestedBy) {
      throw new Error('workflowType, entityId and requestedBy are required');
    }

    const all = TenantStore.get<ApprovalRequest>(studioId, 'approvalRequests');
    const requestId = `appr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const newRequest: ApprovalRequest = {
      details: {},
      ...data,
      id: requestId,
      studioId,
      status: 'pending',
      createdAt: now,
      updatedAt: now
    };

    ApprovalRequestSchema.parse(newRequest);
    TenantStore.set(studioId, 'approvalRequests', [newRequest, ...all]);

    // Record submission in approval history
    this.recordHistory(studioId, {
      approvalRequestId: requestId,
      action: 'submitted',
      actorId: data.requestedBy,
      actorName: data.requestedByName,
      remarks: 'Approval request submitted'
    });

    auditService.log(
      studioId,
      data.requestedBy,
      'SUBMIT_APPROVAL_REQUEST',
      'approvalRequest',
      requestId,
      { workflowType: data.workflowType, entityId: data.entityId, entityTitle: data.entityTitle }
    );

    return newRequest;
  }

  approveRequest(
    studioId: string,
    requestId: string,
    reviewerId: string,
    reviewerName: string,
    remarks?: string
  ): ApprovalRequest {
    if (!studioId) throw new Error('[approvalService.approveRequest]: studioId is required');
    const all = TenantStore.get<ApprovalRequest>(studioId, 'approvalRequests');
    const index = all.findIndex(r => r.id === requestId);
    if (index === -1) throw new Error(`Approval request ${requestId} not found`);

    const req = all[index];
    if (req.status !== 'pending') {
      throw new Error(`Cannot approve request that is already ${req.status}`);
    }

    const now = new Date().toISOString();
    const updated: ApprovalRequest = {
      ...req,
      status: 'approved',
      reviewedBy: reviewerId,
      reviewedByName: reviewerName,
      reviewedAt: now,
      remarks: remarks || 'Approved',
      updatedAt: now
    };

    all[index] = updated;
    TenantStore.set(studioId, 'approvalRequests', all);

    this.recordHistory(studioId, {
      approvalRequestId: requestId,
      action: 'approved',
      actorId: reviewerId,
      actorName: reviewerName,
      remarks: remarks || 'Approved'
    });

    auditService.log(
      studioId,
      reviewerId,
      'APPROVE_REQUEST',
      'approvalRequest',
      requestId,
      { workflowType: req.workflowType, entityId: req.entityId, remarks }
    );

    return updated;
  }

  rejectRequest(
    studioId: string,
    requestId: string,
    reviewerId: string,
    reviewerName: string,
    remarks?: string
  ): ApprovalRequest {
    if (!studioId) throw new Error('[approvalService.rejectRequest]: studioId is required');
    const all = TenantStore.get<ApprovalRequest>(studioId, 'approvalRequests');
    const index = all.findIndex(r => r.id === requestId);
    if (index === -1) throw new Error(`Approval request ${requestId} not found`);

    const req = all[index];
    if (req.status !== 'pending') {
      throw new Error(`Cannot reject request that is already ${req.status}`);
    }

    const now = new Date().toISOString();
    const updated: ApprovalRequest = {
      ...req,
      status: 'rejected',
      reviewedBy: reviewerId,
      reviewedByName: reviewerName,
      reviewedAt: now,
      remarks: remarks || 'Rejected',
      updatedAt: now
    };

    all[index] = updated;
    TenantStore.set(studioId, 'approvalRequests', all);

    this.recordHistory(studioId, {
      approvalRequestId: requestId,
      action: 'rejected',
      actorId: reviewerId,
      actorName: reviewerName,
      remarks: remarks || 'Rejected'
    });

    auditService.log(
      studioId,
      reviewerId,
      'REJECT_REQUEST',
      'approvalRequest',
      requestId,
      { workflowType: req.workflowType, entityId: req.entityId, remarks }
    );

    return updated;
  }

  recordHistory(
    studioId: string,
    entry: Omit<ApprovalHistory, 'id' | 'studioId' | 'timestamp'>
  ): ApprovalHistory {
    const all = TenantStore.get<ApprovalHistory>(studioId, 'approvalHistory');
    const historyEntry: ApprovalHistory = {
      ...entry,
      id: `appr_h_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      studioId,
      timestamp: new Date().toISOString()
    };
    ApprovalHistorySchema.parse(historyEntry);
    TenantStore.set(studioId, 'approvalHistory', [historyEntry, ...all]);
    return historyEntry;
  }

  listHistory(studioId: string, approvalRequestId: string): ApprovalHistory[] {
    const all = TenantStore.get<ApprovalHistory>(studioId, 'approvalHistory');
    return all.filter(h => h.approvalRequestId === approvalRequestId);
  }
}

export const approvalService = new ApprovalService();
