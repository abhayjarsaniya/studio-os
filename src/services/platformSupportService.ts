import { TenantStore } from './tenantStore';
import { 
  SupportTicket, 
  SupportTicketSchema, 
  SupportAccessGrant, 
  SupportAccessGrantSchema 
} from '../types/schema';
import { platformAuditService } from './platformAuditService';

export class PlatformSupportService {
  private readonly TICKETS_KEY = 'platform_support_tickets';
  private readonly GRANTS_KEY = 'platform_support_access_grants';

  listTickets(filter?: { status?: string; category?: string; studioId?: string }): SupportTicket[] {
    let tickets = TenantStore.get<SupportTicket>('platform_system', this.TICKETS_KEY);
    if (!tickets || tickets.length === 0) {
      const initial: SupportTicket = {
        id: 'tick_init_001',
        ticketNumber: 'TICK-2026-000001',
        studioId: 'studio_royal_001',
        studioName: 'Royal Weddings Studio',
        submittedBy: 'Priyanka Singhania',
        contactEmail: 'priyanka@royalweddings.com',
        subject: 'Inquiry regarding 4K RAW Video Storage Quota',
        description: 'We are expanding our destination shoot coverage to Goa and need to review our cloud quota.',
        category: 'subscription',
        priority: 'medium',
        status: 'open',
        internalNotes: ['Assigned to Tier-2 storage team for evaluation.'],
        createdAt: '2026-01-10T00:00:00.000Z'
      };
      tickets = [initial];
      TenantStore.set('platform_system', this.TICKETS_KEY, tickets);
    }

    return tickets.filter(t => {
      if (filter?.status && t.status !== filter.status) return false;
      if (filter?.category && t.category !== filter.category) return false;
      if (filter?.studioId && t.studioId !== filter.studioId) return false;
      return true;
    });
  }

  getTicket(id: string): SupportTicket | undefined {
    return this.listTickets().find(t => t.id === id || t.ticketNumber === id);
  }

  createTicket(data: {
    studioId: string;
    studioName: string;
    submittedBy: string;
    contactEmail: string;
    subject: string;
    description: string;
    category?: any;
    priority?: any;
  }): SupportTicket {
    const currentYear = new Date().getFullYear();
    const counterKey = `platform_seq_TICK_${currentYear}`;
    const count = TenantStore.getSingle<number>('platform_system', counterKey) || 1;
    TenantStore.set('platform_system', counterKey, count + 1);

    const ticketNumber = `TICK-${currentYear}-${String(count).padStart(6, '0')}`;
    const newTicket: SupportTicket = {
      id: `tick_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      ticketNumber,
      studioId: data.studioId,
      studioName: data.studioName,
      submittedBy: data.submittedBy,
      contactEmail: data.contactEmail,
      subject: data.subject,
      description: data.description,
      category: data.category || 'technical',
      priority: data.priority || 'medium',
      status: 'open',
      internalNotes: [],
      createdAt: new Date().toISOString()
    };

    SupportTicketSchema.parse(newTicket);

    const tickets = this.listTickets();
    TenantStore.set('platform_system', this.TICKETS_KEY, [newTicket, ...tickets]);

    platformAuditService.log({
      adminId: 'client_portal',
      adminName: data.submittedBy,
      action: 'SUBMIT_SUPPORT_TICKET',
      targetType: 'support_ticket',
      targetId: newTicket.id,
      details: `Created support ticket ${ticketNumber}: "${newTicket.subject}"`
    });

    return newTicket;
  }

  updateTicketStatus(
    id: string,
    status: 'open' | 'in_progress' | 'waiting_for_studio' | 'resolved' | 'closed',
    actingAdminName = 'Support Admin'
  ): SupportTicket {
    const tickets = this.listTickets();
    const index = tickets.findIndex(t => t.id === id);
    if (index === -1) throw new Error(`Ticket "${id}" not found`);

    const updated: SupportTicket = {
      ...tickets[index],
      status,
      updatedAt: new Date().toISOString()
    };

    tickets[index] = updated;
    TenantStore.set('platform_system', this.TICKETS_KEY, tickets);

    platformAuditService.log({
      adminId: 'admin_sys',
      adminName: actingAdminName,
      action: 'UPDATE_TICKET_STATUS',
      targetType: 'support_ticket',
      targetId: id,
      details: `Changed ticket status to [${status}]`
    });

    return updated;
  }

  addInternalNote(ticketId: string, note: string, authorName = 'Support Admin'): SupportTicket {
    const tickets = this.listTickets();
    const index = tickets.findIndex(t => t.id === ticketId);
    if (index === -1) throw new Error(`Ticket "${ticketId}" not found`);

    const formattedNote = `[${new Date().toISOString().split('T')[0]}] (${authorName}): ${note.trim()}`;
    const updated: SupportTicket = {
      ...tickets[index],
      internalNotes: [formattedNote, ...(tickets[index].internalNotes || [])],
      updatedAt: new Date().toISOString()
    };

    tickets[index] = updated;
    TenantStore.set('platform_system', this.TICKETS_KEY, tickets);

    platformAuditService.log({
      adminId: 'admin_sys',
      adminName: authorName,
      action: 'ADD_TICKET_INTERNAL_NOTE',
      targetType: 'support_ticket',
      targetId: ticketId,
      details: `Added internal note to ticket: "${note}"`
    });

    return updated;
  }

  // ==========================================
  // Time-Limited Support Access Grants
  // ==========================================

  listSupportAccessGrants(): SupportAccessGrant[] {
    return TenantStore.get<SupportAccessGrant>('platform_system', this.GRANTS_KEY) || [];
  }

  grantSupportAccess(data: {
    studioId: string;
    studioName: string;
    adminId: string;
    adminName: string;
    reason: string;
    durationHours?: number;
  }): SupportAccessGrant {
    if (!data.reason?.trim()) {
      throw new Error('Mandatory Audit Rule: Explicit reason is required to grant temporary support access.');
    }

    const hours = data.durationHours || 4; // Default 4 hours max
    const now = new Date();
    const expiresAt = new Date(now.getTime() + hours * 3600000).toISOString();

    const newGrant: SupportAccessGrant = {
      id: `grant_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      studioId: data.studioId,
      studioName: data.studioName,
      adminId: data.adminId,
      adminName: data.adminName,
      reason: data.reason.trim(),
      expiresAt,
      isRevoked: false,
      createdAt: now.toISOString()
    };

    SupportAccessGrantSchema.parse(newGrant);

    const grants = this.listSupportAccessGrants();
    TenantStore.set('platform_system', this.GRANTS_KEY, [newGrant, ...grants]);

    platformAuditService.log({
      adminId: data.adminId,
      adminName: data.adminName,
      action: 'GRANT_SUPPORT_ACCESS',
      targetType: 'studio_access_grant',
      targetId: newGrant.id,
      details: `Authorized ${hours}h temporary audited support access to "${data.studioName}". Reason: ${data.reason}. Auto-expires at ${expiresAt}`
    });

    return newGrant;
  }

  verifySupportAccess(studioId: string, adminId: string): { isValid: boolean; grant?: SupportAccessGrant; reason?: string } {
    const grants = this.listSupportAccessGrants();
    const nowStr = new Date().toISOString();

    const activeGrant = grants.find(g => 
      g.studioId === studioId && 
      g.adminId === adminId && 
      !g.isRevoked && 
      g.expiresAt > nowStr
    );

    if (!activeGrant) {
      return { isValid: false, reason: 'No active, unexpired support access grant exists for this studio.' };
    }

    return { isValid: true, grant: activeGrant };
  }

  revokeSupportAccess(grantId: string, actingAdminName = 'Super Admin'): boolean {
    const grants = this.listSupportAccessGrants();
    const index = grants.findIndex(g => g.id === grantId);
    if (index === -1) return false;

    const current = grants[index];
    const updated: SupportAccessGrant = {
      ...current,
      isRevoked: true,
      revokedAt: new Date().toISOString()
    };

    grants[index] = updated;
    TenantStore.set('platform_system', this.GRANTS_KEY, grants);

    platformAuditService.log({
      adminId: 'admin_sys',
      adminName: actingAdminName,
      action: 'REVOKE_SUPPORT_ACCESS',
      targetType: 'studio_access_grant',
      targetId: grantId,
      details: `Revoked temporary support access to studio "${current.studioName}"`
    });

    return true;
  }
}

export const platformSupportService = new PlatformSupportService();
