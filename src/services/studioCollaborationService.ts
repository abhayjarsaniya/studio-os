import { TenantStore } from './tenantStore';
import { 
  StudioCollaborationRequest, 
  StudioCollaborationRequestSchema, 
  CollaborationStatus 
} from '../types/schema';
import { employeeService } from './employeeService';

export class StudioCollaborationService {
  private readonly STORE_KEY = 'studio_collaboration_requests';

  // Cross-tenant storage uses platform_system store key or both studios
  private getAllRequests(): StudioCollaborationRequest[] {
    return TenantStore.get<StudioCollaborationRequest>('platform_system', this.STORE_KEY) || [];
  }

  private saveRequests(requests: StudioCollaborationRequest[]): void {
    TenantStore.set('platform_system', this.STORE_KEY, requests);
  }

  createRequest(data: Omit<StudioCollaborationRequest, 'id' | 'status' | 'createdAt'>): StudioCollaborationRequest {
    const id = `collab_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const request: StudioCollaborationRequest = StudioCollaborationRequestSchema.parse({
      ...data,
      id,
      status: 'sent',
      createdAt: new Date().toISOString()
    });

    const all = this.getAllRequests();
    all.push(request);
    this.saveRequests(all);
    return request;
  }

  listIncomingRequests(studioId: string): StudioCollaborationRequest[] {
    return this.getAllRequests().filter(r => r.targetStudioId === studioId);
  }

  listOutgoingRequests(studioId: string): StudioCollaborationRequest[] {
    return this.getAllRequests().filter(r => r.requestingStudioId === studioId);
  }

  getRequest(requestId: string): StudioCollaborationRequest | null {
    return this.getAllRequests().find(r => r.id === requestId) || null;
  }

  acceptRequest(
    requestId: string, 
    assignedMemberIds: string[], 
    responseNotes?: string
  ): StudioCollaborationRequest {
    const all = this.getAllRequests();
    const index = all.findIndex(r => r.id === requestId);
    if (index === -1) throw new Error(`Collaboration request "${requestId}" not found`);

    const req = all[index];
    
    // Resolve employee names from target studio
    const targetEmployees = employeeService.listEmployees(req.targetStudioId);
    const assignedMemberNames = assignedMemberIds.map(id => {
      const emp = targetEmployees.find(e => e.id === id);
      return emp ? emp.name : id;
    });

    all[index] = {
      ...req,
      assignedMemberIds,
      assignedMemberNames,
      responseNotes: responseNotes || 'Accepted collaboration request',
      status: 'accepted',
      updatedAt: new Date().toISOString()
    };

    this.saveRequests(all);
    return all[index];
  }

  declineRequest(requestId: string, reason?: string): StudioCollaborationRequest {
    const all = this.getAllRequests();
    const index = all.findIndex(r => r.id === requestId);
    if (index === -1) throw new Error(`Collaboration request "${requestId}" not found`);

    all[index] = {
      ...all[index],
      status: 'declined',
      responseNotes: reason || 'Declined crew request due to scheduling constraints',
      updatedAt: new Date().toISOString()
    };

    this.saveRequests(all);
    return all[index];
  }

  cancelRequest(requestId: string): StudioCollaborationRequest {
    const all = this.getAllRequests();
    const index = all.findIndex(r => r.id === requestId);
    if (index === -1) throw new Error(`Collaboration request "${requestId}" not found`);

    all[index] = {
      ...all[index],
      status: 'cancelled',
      updatedAt: new Date().toISOString()
    };

    this.saveRequests(all);
    return all[index];
  }

  /**
   * Returns active collaborated crew members for a specific event in a studio.
   */
  getCollaboratedCrewForEvent(requestingStudioId: string, eventId: string) {
    const all = this.getAllRequests();
    const activeReqs = all.filter(r => 
      r.requestingStudioId === requestingStudioId && 
      r.eventId === eventId && 
      r.status === 'accepted'
    );

    const crewList: Array<{
      requestId: string;
      sourceStudioName: string;
      memberId: string;
      memberName: string;
      requiredRole: string;
      subEventTitle?: string;
      eventDate: string;
    }> = [];

    activeReqs.forEach(req => {
      req.assignedMemberIds.forEach((mId, idx) => {
        crewList.push({
          requestId: req.id,
          sourceStudioName: req.targetStudioName,
          memberId: mId,
          memberName: req.assignedMemberNames[idx] || 'External Crew',
          requiredRole: req.requiredRoles[idx] || req.requiredRoles[0] || 'Photographer',
          subEventTitle: req.subEventTitle,
          eventDate: req.eventDate
        });
      });
    });

    return crewList;
  }
}

export const studioCollaborationService = new StudioCollaborationService();
