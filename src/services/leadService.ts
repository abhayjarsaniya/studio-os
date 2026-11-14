import { Lead, LeadSchema, LeadStatus, StudioEvent } from '../types/schema';
import { TenantStore } from './tenantStore';
import { auditService } from './auditService';
import { notificationService } from './notificationService';
import { customerService } from './customerService';
import { eventService } from './eventService';

export class LeadService {
  listLeads(studioId: string, filter?: { status?: string; search?: string; assignedEmployeeId?: string }): Lead[] {
    if (!studioId) throw new Error('[leadService.listLeads]: studioId is required');
    let all = TenantStore.get<Lead>(studioId, 'leads');

    if (filter) {
      if (filter.status && filter.status !== 'All') {
        all = all.filter(l => l.status === filter.status);
      }
      if (filter.assignedEmployeeId && filter.assignedEmployeeId !== 'All') {
        all = all.filter(l => l.assignedEmployeeId === filter.assignedEmployeeId);
      }
      if (filter.search) {
        const q = filter.search.toLowerCase().trim();
        all = all.filter(l =>
          l.customerName.toLowerCase().includes(q) ||
          l.phone.includes(q) ||
          (l.email && l.email.toLowerCase().includes(q)) ||
          l.eventCategory.toLowerCase().includes(q) ||
          l.leadNumber.toLowerCase().includes(q)
        );
      }
    }

    return all;
  }

  getLead(studioId: string, leadId: string): Lead | undefined {
    if (!studioId) throw new Error('[leadService.getLead]: studioId is required');
    return this.listLeads(studioId).find(l => l.id === leadId);
  }

  private generateLeadNumber(studioId: string): string {
    const leads = this.listLeads(studioId);
    const count = leads.length + 1;
    return `LED-${count.toString().padStart(3, '0')}`;
  }

  createLead(
    studioId: string,
    data: any,
    operatorId: string = 'system'
  ): Lead {
    if (!studioId) throw new Error('[leadService.createLead]: studioId is required');
    const customerName = data.customerName || data.name;
    if (!customerName || !customerName.trim()) throw new Error('Lead customer name is required');
    if (!data.phone || !data.phone.trim()) throw new Error('Lead mobile number is required');

    const leads = this.listLeads(studioId);
    const now = new Date().toISOString();
    const leadNumber = data.leadNumber || this.generateLeadNumber(studioId);
    const leadStatus = data.status || data.stage || 'New Inquiry';

    const newLead: Lead = {
      ...data,
      id: `lead_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      studioId,
      customerName,
      name: customerName,
      leadNumber,
      eventCategory: data.eventCategory || 'General',
      status: leadStatus,
      stage: leadStatus,
      createdAt: now,
      updatedAt: now
    };

    LeadSchema.parse(newLead);
    TenantStore.set(studioId, 'leads', [newLead, ...leads]);

    auditService.log(
      studioId,
      operatorId,
      'CREATE_LEAD',
      'lead',
      newLead.id,
      { leadNumber, customerName: newLead.customerName, phone: newLead.phone }
    );

    return newLead;
  }

  updateLead(studioId: string, leadId: string, updates: any, operatorId: string = 'system'): Lead {
    if (!studioId) throw new Error('[leadService.updateLead]: studioId is required');
    const leads = this.listLeads(studioId);
    const index = leads.findIndex(l => l.id === leadId);
    if (index === -1) throw new Error(`Lead ${leadId} not found in studio ${studioId}`);

    const existing = leads[index];
    const statusVal = updates.status || updates.stage || existing.status;
    const nameVal = updates.customerName || updates.name || existing.customerName;

    const updated: Lead = {
      ...existing,
      ...updates,
      customerName: nameVal,
      name: nameVal,
      status: statusVal,
      stage: statusVal,
      updatedAt: new Date().toISOString()
    };

    LeadSchema.parse(updated);
    leads[index] = updated;
    TenantStore.set(studioId, 'leads', leads);

    auditService.log(
      studioId,
      operatorId,
      'UPDATE_LEAD',
      'lead',
      leadId,
      { updates: Object.keys(updates) }
    );

    return updated;
  }

  deleteLead(studioId: string, leadId: string, operatorId: string = 'system'): void {
    if (!studioId) throw new Error('[leadService.deleteLead]: studioId is required');
    const leads = this.listLeads(studioId);
    TenantStore.set(studioId, 'leads', leads.filter(l => l.id !== leadId));
    auditService.log(studioId, operatorId, 'DELETE_LEAD', 'lead', leadId, {});
  }

  /**
   * Converts a lead into a customer (linking existing or creating new without duplicates)
   * and optionally creates an Event.
   */
  convertLead(
    studioId: string,
    leadId: string,
    options?: {
      createEvent?: boolean;
      eventName?: string;
      eventTitle?: string;
      eventDate?: string;
      venue?: string;
      operatorId?: string;
      operatorName?: string;
    }
  ): { customer: any; event?: StudioEvent; lead: Lead } {
    if (!studioId) throw new Error('[leadService.convertLead]: studioId is required');
    const lead = this.getLead(studioId, leadId);
    if (!lead) throw new Error(`Lead ${leadId} not found`);

    const operatorId = options?.operatorId || 'system';
    const operatorName = options?.operatorName || 'System';

    // 1. Check if a customer already exists with this phone or email to prevent duplicates
    const dupCheck = customerService.detectDuplicates(studioId, lead.phone, lead.email);
    let customer: any;

    if (dupCheck.hasDuplicate) {
      // Link to existing customer
      customer = dupCheck.duplicates[0];
      customer = customerService.updateCustomer(
        studioId,
        customer.id,
        {
          notes: `${customer.notes || ''}\nConverted from Lead ${lead.leadNumber} on ${new Date().toLocaleDateString()}`.trim(),
          status: 'Active'
        },
        operatorId
      );
    } else {
      // Create new customer
      customer = customerService.createCustomer(studioId, {
        name: lead.customerName,
        phone: lead.phone,
        email: lead.email,
        city: 'Mumbai',
        customerSource: lead.source || 'Inquiry',
        status: options?.createEvent ? 'Booked' : 'Active',
        notes: `Created via Lead conversion: ${lead.leadNumber}. Initial notes: ${lead.notes || 'None'}`,
        tags: [lead.eventCategory],
        allowDuplicate: true,
        createdBy: operatorId
      });
    }

    // 2. Optionally create Event
    let createdEvent: StudioEvent | undefined;
    if (options?.createEvent) {
      const eventDate = options.eventDate || lead.expectedDate || new Date().toISOString().split('T')[0];
      createdEvent = eventService.createEvent(studioId, {
        name: options.eventName || options.eventTitle || `${lead.customerName} ${lead.eventCategory}`,
        title: options.eventTitle || options.eventName || `${lead.customerName} ${lead.eventCategory}`,
        priority: 'High' as any,
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        category: lead.eventCategory,
        startDate: eventDate,
        startTime: '10:00',
        endDate: eventDate,
        endTime: '18:00',
        venue: options.venue || 'TBD',
        venueCity: customer.city || 'Mumbai',
        estimatedBudget: lead.estimatedBudget || 0,
        advancePaid: 0,
        assignedTeamIds: lead.assignedEmployeeId ? [lead.assignedEmployeeId] : [],
        deliverables: ['High-Res Photos', 'Highlight Video'],
        status: 'Confirmed',
        createdBy: operatorId || 'system'
      });
    }

    // 3. Mark Lead as Booked and preserve conversion history
    const now = new Date().toISOString();
    const updatedLead = this.updateLead(
      studioId,
      leadId,
      {
        status: 'Booked',
        convertedCustomerId: customer.id,
        convertedEventId: createdEvent?.id,
        convertedAt: now
      },
      operatorId
    );

    // Notification
    notificationService.createNotification(studioId, {
      title: `Lead Converted: ${lead.customerName}`,
      message: `Lead ${lead.leadNumber} successfully converted to client "${customer.name}".`,
      type: 'event',
      timestamp: 'Just now',
      read: false,
      linkTab: 'customers',
      linkId: customer.id
    });

    return {
      customer,
      event: createdEvent,
      lead: updatedLead
    };
  }
}

export const leadService = new LeadService();
