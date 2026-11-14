import { describe, it, expect, beforeEach } from 'vitest';
import { TenantStore } from '../services/tenantStore';
import { eventService } from '../services/eventService';
import { customerService } from '../services/customerService';
import { memberService } from '../services/memberService';
import { categoryService } from '../services/categoryService';
import { ALL_EVENT_CATEGORIES } from '../data/demoData';

describe('Studio OS – Phase 3 Dashboard & Event Management Tests', () => {
  const STUDIO_ID = 'studio_royal_001';
  const OTHER_STUDIO_ID = 'studio_creative_002';

  beforeEach(() => {
    TenantStore.resetAll();
  });

  it('1. Generates unique, sequential human-readable event IDs (EVT-YYYY-000001 format)', () => {
    const id1 = eventService.generateEventNumber(STUDIO_ID);
    const id2 = eventService.generateEventNumber(STUDIO_ID);

    expect(id1).toMatch(/^EVT-\d{4}-\d{6}$/);
    expect(id2).toMatch(/^EVT-\d{4}-\d{6}$/);
    expect(id1).not.toBe(id2);
  });

  it('2. Creates event with multi-day schedule, customer link and unique ID', () => {
    const newEvent = eventService.createEvent(STUDIO_ID, {
      name: 'Rambagh Palace 3-Day Royal Gala',
      customerId: 'cust_royal_1',
      customerName: 'Priyanka Singhania',
      customerPhone: '+91 98210 12345',
      category: 'Wedding',
      startDate: '2026-12-10',
      startTime: '10:00',
      endDate: '2026-12-12', // Multi-day
      endTime: '23:00',
      venue: 'Rambagh Palace, Jaipur',
      venueCity: 'Jaipur',
      priority: 'Urgent',
      status: 'Confirmed',
      deliverables: ['Extended Feature 4K Film', '500 Stills'],
      assignedTeamIds: ['mem_royal_1'],
      estimatedBudget: 450000,
      advancePaid: 200000,
      createdBy: 'test_runner'
    });

    expect(newEvent.id).toBeDefined();
    expect(newEvent.eventNumber).toMatch(/^EVT-\d{4}-\d{6}$/);
    expect(newEvent.startDate).toBe('2026-12-10');
    expect(newEvent.endDate).toBe('2026-12-12');
    expect(newEvent.statusHistory).toBeDefined();
    expect(newEvent.statusHistory?.length).toBeGreaterThan(0);

    const fetched = eventService.getEvent(STUDIO_ID, newEvent.id);
    expect(fetched?.name).toBe('Rambagh Palace 3-Day Royal Gala');
  });

  it('3. Prevents invalid date ranges (endDate earlier than startDate)', () => {
    expect(() => {
      eventService.createEvent(STUDIO_ID, {
        name: 'Invalid Date Shoot',
        customerId: 'cust_royal_1',
        customerName: 'Priyanka Singhania',
        customerPhone: '+91 98210 12345',
        category: 'Birthday',
        startDate: '2026-12-15',
        startTime: '10:00',
        endDate: '2026-12-10', // Invalid: end < start
        endTime: '18:00',
        venue: 'Studio A',
        venueCity: 'Mumbai',
        priority: 'Low',
        status: 'Tentative',
        createdBy: 'test_runner'
      });
    }).toThrowError(/Validation Error/);
  });

  it('4. Updates event details correctly and persists changes', () => {
    const events = eventService.listEvents(STUDIO_ID);
    const target = events[0];

    const updated = eventService.updateEvent(STUDIO_ID, target.id, {
      venue: 'Updated Grand Ballroom Taj',
      priority: 'Urgent'
    });

    expect(updated.venue).toBe('Updated Grand Ballroom Taj');
    expect(updated.priority).toBe('Urgent');

    const fresh = eventService.getEvent(STUDIO_ID, target.id);
    expect(fresh?.venue).toBe('Updated Grand Ballroom Taj');
  });

  it('5. Records status change history with remarks and updater name', () => {
    const events = eventService.listEvents(STUDIO_ID);
    const target = events[0];

    const updated = eventService.updateEventStatus(
      STUDIO_ID,
      target.id,
      'In Progress',
      'usr_kabir',
      'Kabir Sharma',
      'Crew arrived on location at Taj Lands End'
    );

    expect(updated.status).toBe('In Progress');
    expect(updated.statusHistory).toBeDefined();
    expect(updated.statusHistory?.[0].toStatus).toBe('In Progress');
    expect(updated.statusHistory?.[0].remarks).toBe('Crew arrived on location at Taj Lands End');
    expect(updated.statusHistory?.[0].changedByName).toBe('Kabir Sharma');
  });

  it('6. Supports member assignments and removal on events', () => {
    const events = eventService.listEvents(STUDIO_ID);
    const target = events[0];

    eventService.assignMember(STUDIO_ID, target.id, {
      memberId: 'mem_royal_test_99',
      memberName: 'Dev Test Pilot',
      roleTitle: 'FPV Drone Pilot',
      assignedBy: 'Kabir Sharma',
      assignedAt: new Date().toISOString()
    });

    let fresh = eventService.getEvent(STUDIO_ID, target.id);
    expect(fresh?.assignedTeamIds).toContain('mem_royal_test_99');

    // Remove member
    eventService.removeMember(STUDIO_ID, target.id, 'mem_royal_test_99');
    fresh = eventService.getEvent(STUDIO_ID, target.id);
    expect(fresh?.assignedTeamIds).not.toContain('mem_royal_test_99');
  });

  it('7. Supports uploading and removing event attachments', () => {
    const events = eventService.listEvents(STUDIO_ID);
    const target = events[0];

    const attachment = eventService.addAttachment(STUDIO_ID, target.id, {
      name: 'Varmala Lighting Diagram.pdf',
      url: 'https://studio-os.preview/docs/varmala.pdf',
      type: 'document',
      uploadedBy: 'usr_kabir',
      uploadedByName: 'Kabir Sharma'
    });

    expect(attachment.id).toBeDefined();

    let fresh = eventService.getEvent(STUDIO_ID, target.id);
    expect(fresh?.attachments?.some(a => a.id === attachment.id)).toBe(true);

    // Remove attachment
    eventService.removeAttachment(STUDIO_ID, target.id, attachment.id);
    fresh = eventService.getEvent(STUDIO_ID, target.id);
    expect(fresh?.attachments?.some(a => a.id === attachment.id)).toBe(false);
  });

  it('8. Supports all 25 categories in CategoryService', () => {
    const categories = categoryService.listCategories(STUDIO_ID);
    expect(categories.length).toBeGreaterThanOrEqual(25);

    const names = categories.map(c => c.name);
    for (const cat of ALL_EVENT_CATEGORIES) {
      expect(names).toContain(cat);
    }
  });

  it('9. Supports inline customer creation during event flow', () => {
    const newClient = customerService.createCustomer(STUDIO_ID, {
      name: 'Simran & Raj Malhotra',
      phone: '+91 99988 77766',
      city: 'Mumbai',
      createdBy: 'test_runner'
    });

    expect(newClient.id).toBeDefined();
    expect(newClient.name).toBe('Simran & Raj Malhotra');

    // Link in event
    const event = eventService.createEvent(STUDIO_ID, {
      name: 'Simran & Raj Engagement',
      customerId: newClient.id,
      customerName: newClient.name,
      customerPhone: newClient.phone,
      category: 'Engagement',
      startDate: '2026-11-25',
      startTime: '18:00',
      endDate: '2026-11-25',
      endTime: '23:00',
      venue: 'St. Regis Mumbai',
      venueCity: 'Mumbai',
      priority: 'High',
      status: 'Confirmed',
      createdBy: 'test_runner'
    });

    expect(event.customerId).toBe(newClient.id);
  });

  it('10. Deleting an event deletes it from studio and maintains tenant isolation', () => {
    const created = eventService.createEvent(STUDIO_ID, {
      name: 'Temporary Shoot To Delete',
      customerId: 'cust_royal_1',
      customerName: 'Priyanka Singhania',
      customerPhone: '+91 98210 12345',
      category: 'Custom Event',
      startDate: '2026-12-20',
      startTime: '10:00',
      endDate: '2026-12-20',
      endTime: '14:00',
      venue: 'Studio Lawn',
      venueCity: 'Mumbai',
      priority: 'Low',
      status: 'Enquiry',
      createdBy: 'test_runner'
    });

    expect(eventService.getEvent(STUDIO_ID, created.id)).toBeDefined();

    eventService.deleteEvent(STUDIO_ID, created.id);
    expect(eventService.getEvent(STUDIO_ID, created.id)).toBeUndefined();

    // Verify other studio was unaffected
    const otherEvents = eventService.listEvents(OTHER_STUDIO_ID);
    expect(otherEvents.length).toBeGreaterThan(0);
  });
});
