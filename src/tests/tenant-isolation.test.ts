import { describe, it, expect, beforeEach } from 'vitest';
import { TenantStore } from '../services/tenantStore';
import { studioService } from '../services/studioService';
import { customerService } from '../services/customerService';
import { eventService } from '../services/eventService';
import { branchService } from '../services/branchService';
import { taskService } from '../services/taskService';
import { memberService } from '../services/memberService';
import { auditService } from '../services/auditService';

describe('Studio OS – Phase 2 Multi-Tenant Database Architecture Tests', () => {
  const STUDIO_A_ID = 'studio_royal_001';
  const STUDIO_B_ID = 'studio_creative_002';

  beforeEach(() => {
    TenantStore.resetAll();
  });

  it('1. Studio A sees only its own customers', () => {
    const custsA = customerService.listCustomers(STUDIO_A_ID);
    expect(custsA.length).toBeGreaterThan(0);
    for (const c of custsA) {
      expect(c.studioId).toBe(STUDIO_A_ID);
    }
    // Verified names in Studio A
    const namesA = custsA.map(c => c.name);
    expect(namesA).toContain('Priyanka Singhania & Arjun Kapoor');
    expect(namesA).not.toContain('Karan Mehra & Sanjana Bhatia');
  });

  it('2. Studio B sees only its own customers', () => {
    const custsB = customerService.listCustomers(STUDIO_B_ID);
    expect(custsB.length).toBeGreaterThan(0);
    for (const c of custsB) {
      expect(c.studioId).toBe(STUDIO_B_ID);
    }
    // Verified names in Studio B
    const namesB = custsB.map(c => c.name);
    expect(namesB).toContain('Karan Mehra & Sanjana Bhatia');
    expect(namesB).not.toContain('Priyanka Singhania & Arjun Kapoor');
  });

  it('3. Studio A sees only its own events', () => {
    const eventsA = eventService.listEvents(STUDIO_A_ID);
    expect(eventsA.length).toBeGreaterThan(0);
    for (const e of eventsA) {
      expect(e.studioId).toBe(STUDIO_A_ID);
    }
    const titlesA = eventsA.map(e => e.name);
    expect(titlesA).toContain('Singhania & Kapoor Royal Grand Wedding');
    expect(titlesA).not.toContain('Karan & Sanjana Sunset Beach Sangeet');
  });

  it('4. Studio B sees only its own events', () => {
    const eventsB = eventService.listEvents(STUDIO_B_ID);
    expect(eventsB.length).toBeGreaterThan(0);
    for (const e of eventsB) {
      expect(e.studioId).toBe(STUDIO_B_ID);
    }
    const titlesB = eventsB.map(e => e.name);
    expect(titlesB).toContain('Karan & Sanjana Sunset Beach Sangeet');
    expect(titlesB).not.toContain('Singhania & Kapoor Royal Grand Wedding');
  });

  it('5. Studio switching retrieves distinct studio profiles and settings', () => {
    const studioA = studioService.getStudio(STUDIO_A_ID);
    const studioB = studioService.getStudio(STUDIO_B_ID);

    expect(studioA.id).toBe(STUDIO_A_ID);
    expect(studioA.name).toBe('Royal Photography');
    expect(studioA.city).toBe('Mumbai');
    expect(studioA.subscription.pricePerMonth).toBe(500);

    expect(studioB.id).toBe(STUDIO_B_ID);
    expect(studioB.name).toBe('Creative Wedding Studio');
    expect(studioB.city).toBe('Morjim');
    expect(studioB.subscription.pricePerMonth).toBe(500);
  });

  it('6. Creating an event in Studio A isolates the event and does not appear in Studio B', () => {
    const initialCountB = eventService.listEvents(STUDIO_B_ID).length;

    const createdA = eventService.createEvent(STUDIO_A_ID, {
      name: 'Udaipur Palace Test Royal Shoot',
      customerId: 'cust_royal_1',
      customerName: 'Priyanka Singhania',
      customerPhone: '+91 98210 12345',
      category: 'Wedding',
      startDate: '2026-12-01',
      startTime: '10:00',
      endDate: '2026-12-01',
      endTime: '22:00',
      venue: 'City Palace, Udaipur',
      venueCity: 'Udaipur',
      priority: 'Urgent',
      status: 'Confirmed',
      deliverables: ['4K Teaser'],
      assignedTeamIds: ['mem_royal_1'],
      estimatedBudget: 500000,
      advancePaid: 250000,
      createdBy: 'test_runner'
    });

    expect(createdA.id).toBeDefined();
    expect(createdA.studioId).toBe(STUDIO_A_ID);
    expect(createdA.eventNumber).toMatch(/^EVT-\d{4}-\d{6}$/);

    // Verify it is present in Studio A
    const freshEventsA = eventService.listEvents(STUDIO_A_ID);
    expect(freshEventsA.some(e => e.id === createdA.id)).toBe(true);

    // Verify Studio B count and events did NOT change
    const freshEventsB = eventService.listEvents(STUDIO_B_ID);
    expect(freshEventsB.length).toBe(initialCountB);
    expect(freshEventsB.some(e => e.id === createdA.id)).toBe(false);
  });

  it('7. Customer records remain isolated upon addition', () => {
    const newClient = customerService.createCustomer(STUDIO_B_ID, {
      name: 'Goa Coastal Couple VIP',
      phone: '+91 99999 11111',
      city: 'Panaji',
      createdBy: 'test_runner'
    });

    const custsB = customerService.listCustomers(STUDIO_B_ID);
    expect(custsB.some(c => c.id === newClient.id)).toBe(true);

    const custsA = customerService.listCustomers(STUDIO_A_ID);
    expect(custsA.some(c => c.id === newClient.id)).toBe(false);
  });

  it('8. Branch records remain strictly isolated per studio', () => {
    const branchesA = branchService.listBranches(STUDIO_A_ID);
    const branchesB = branchService.listBranches(STUDIO_B_ID);

    expect(branchesA.map(b => b.code)).toContain('MUM-01');
    expect(branchesA.map(b => b.code)).toContain('UDR-01');
    expect(branchesA.map(b => b.code)).not.toContain('GOA-01');

    expect(branchesB.map(b => b.code)).toContain('GOA-01');
    expect(branchesB.map(b => b.code)).toContain('BLR-01');
    expect(branchesB.map(b => b.code)).not.toContain('MUM-01');
  });

  it('9. Services strictly reject requests without studioId', () => {
    expect(() => customerService.listCustomers('')).toThrowError(/studioId is required/);
    expect(() => eventService.listEvents('')).toThrowError(/studioId is required/);
    expect(() => taskService.listTasks('')).toThrowError(/studioId is required/);
    expect(() => branchService.listBranches('')).toThrowError(/studioId is required/);
    expect(() => memberService.listMembers('')).toThrowError(/studioId is required/);
    expect(() => auditService.listAuditLogs('')).toThrowError(/studioId is required/);
  });

  it('10. Audit logging captures actions scoped to the studio', () => {
    const log = auditService.logAction(
      STUDIO_A_ID,
      'usr_test',
      'TEST_ACTION',
      'event',
      'ev_test_1',
      { reason: 'isolation verification' },
      'Tester'
    );

    expect(log.studioId).toBe(STUDIO_A_ID);
    const logsA = auditService.listAuditLogs(STUDIO_A_ID);
    expect(logsA.some(l => l.id === log.id)).toBe(true);

    const logsB = auditService.listAuditLogs(STUDIO_B_ID);
    expect(logsB.some(l => l.id === log.id)).toBe(false);
  });
});
