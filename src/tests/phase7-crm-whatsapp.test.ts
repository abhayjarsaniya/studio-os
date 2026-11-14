import { describe, it, expect, beforeEach } from 'vitest';
import { customerService } from '../services/customerService';
import { leadService } from '../services/leadService';
import { whatsappService, DEFAULT_16_WHATSAPP_TEMPLATES } from '../services/whatsappService';
import { followUpService } from '../services/followUpService';
import { leaveService } from '../services/leaveService';
import { TenantStore } from '../services/tenantStore';
import { Customer, Lead, FollowUp, StudioEvent } from '../types';

describe('STUDIO OS - Phase 7: Customer CRM & WhatsApp Click-to-Chat Suite', () => {
  const STUDIO_A = 'studio_royal_001';
  const STUDIO_B = 'studio_creative_002';

  beforeEach(() => {
    TenantStore.initializeDefaults();
    whatsappService.initializeDefaultTemplates(STUDIO_A);
    whatsappService.initializeDefaultTemplates(STUDIO_B);
  });

  // Test 1: Multi-tenant CRM isolation
  it('1. should enforce strict multi-tenant isolation for customers and CRM records', () => {
    const custA = customerService.createCustomer(STUDIO_A, {
      name: 'Aditi Sharma',
      phone: '9820112233',
      email: 'aditi@example.com',
      city: 'Mumbai',
      address: 'Bandra West'
    });

    const custB = customerService.createCustomer(STUDIO_B, {
      name: 'Vikram Mehta',
      phone: '9820998877',
      email: 'vikram@example.com',
      city: 'Delhi',
      address: 'Connaught Place'
    });

    const listA = customerService.listCustomers(STUDIO_A);
    const listB = customerService.listCustomers(STUDIO_B);

    expect(listA.some(c => c.id === custA.id)).toBe(true);
    expect(listA.some(c => c.id === custB.id)).toBe(false);

    expect(listB.some(c => c.id === custB.id)).toBe(true);
    expect(listB.some(c => c.id === custA.id)).toBe(false);
  });

  // Test 2: 10 customer statuses support
  it('2. should support all 10 customer lifecycle statuses', () => {
    const statuses = [
      'New Inquiry',
      'Contacted',
      'Follow-up Required',
      'Quotation Sent',
      'Negotiation',
      'Booked',
      'Active',
      'Completed',
      'Lost',
      'Inactive'
    ] as const;

    statuses.forEach((status, idx) => {
      const cust = customerService.createCustomer(STUDIO_A, {
        name: `Test Client ${idx}`,
        phone: `982000000${idx}`,
        city: 'Mumbai',
        status: status
      });
      expect(cust.status).toBe(status);
    });
  });

  // Test 3: Corporate client details
  it('3. should support corporate client fields including company name and GST number', () => {
    const corp = customerService.createCustomer(STUDIO_A, {
      name: 'Rajesh Singhania',
      phone: '9820123456',
      companyName: 'Singhania Enterprises Ltd',
      companyGst: '27AAAAA0000A1Z5',
      anniversaryDate: '2015-12-10',
      dob: '1985-05-15',
      city: 'Mumbai'
    });

    expect(corp.companyName).toBe('Singhania Enterprises Ltd');
    expect(corp.companyGst).toBe('27AAAAA0000A1Z5');
    expect(corp.anniversaryDate).toBe('2015-12-10');
    expect(corp.dob).toBe('1985-05-15');
  });

  // Test 4: Phone normalization
  it('4. should normalize phone numbers to clean international format defaulting to 91 for India', () => {
    // 10 digits -> prepends 91
    expect(customerService.normalizePhoneNumber('9820112233')).toBe('919820112233');
    // Leading 0 (trunk code) -> strips 0 and prepends 91
    expect(customerService.normalizePhoneNumber('09820112233')).toBe('919820112233');
    // Leading + -> strips +
    expect(customerService.normalizePhoneNumber('+91 98201 12233')).toBe('919820112233');
    // Spaces, dashes, parentheses stripped
    expect(customerService.normalizePhoneNumber('+91 (98201) 12-233')).toBe('919820112233');
    // International numbers already having country code
    expect(customerService.normalizePhoneNumber('+1 (555) 234-5678')).toBe('15552345678');
    expect(customerService.normalizePhoneNumber('+44 20 7946 0991')).toBe('442079460991');
  });

  // Test 5: Live duplicate detection
  it('5. should detect duplicate customers by phone or email', () => {
    customerService.createCustomer(STUDIO_A, {
      name: 'Pooja Hegde',
      phone: '9820199999',
      email: 'pooja@example.com',
      city: 'Mumbai'
    });

    // Check with duplicate phone with different formatting (+91-98201-99999)
    const phoneDups = customerService.detectDuplicates(STUDIO_A, '+91 98201 99999', 'different@email.com');
    expect(phoneDups.hasDuplicate).toBe(true);
    expect(phoneDups.matches[0].name).toBe('Pooja Hegde');

    // Check with duplicate email (case-insensitive)
    const emailDups = customerService.detectDuplicates(STUDIO_A, '9111222333', 'POOJA@EXAMPLE.COM');
    expect(emailDups.hasDuplicate).toBe(true);
    expect(emailDups.matches[0].name).toBe('Pooja Hegde');

    // Reject creation without allowDuplicate
    expect(() => {
      customerService.createCustomer(STUDIO_A, {
        name: 'Pooja Duplicate',
        phone: '9820199999',
        city: 'Mumbai'
      });
    }).toThrow(/Potential duplicate|Duplicate customer detected/);
  });

  // Test 6: Safe customer merging
  it('6. should execute safe non-destructive record merging and re-link associated events and follow-ups', () => {
    const primary = customerService.createCustomer(STUDIO_A, {
      name: 'Rohan Verma',
      phone: '9820111111',
      email: 'rohan.primary@example.com',
      city: 'Mumbai'
    });

    const secondary = customerService.createCustomer(STUDIO_A, {
      name: 'Rohan V.',
      phone: '9820222222',
      email: 'rohan.sec@example.com',
      city: 'Pune'
    }, 'system', true); // allowDuplicate = true

    // Create an event for secondary
    const secEvent: StudioEvent = {
      id: 'event_sec_001',
      eventNumber: 'EV-SEC-01',
      studioId: STUDIO_A,
      customerId: secondary.id,
      customerName: secondary.name,
      customerPhone: secondary.phone,
      name: 'Rohan Pre-Wedding',
      title: 'Rohan Pre-Wedding',
      category: 'Pre-Wedding',
      startDate: '2026-12-15',
      endDate: '2026-12-15',
      venue: 'Lonavala',
      venueCity: 'Pune',
      startTime: '10:00',
      endTime: '18:00',
      priority: 'High',
      deliverables: [],
      assignedTeamIds: [],
      createdBy: 'system',
      status: 'Confirmed',
      estimatedBudget: 50000,
      advancePaid: 10000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    TenantStore.set(STUDIO_A, 'events', [secEvent]);

    // Create a follow-up for secondary
    const secFollowUp = followUpService.createFollowUp(STUDIO_A, {
      customerId: secondary.id,
      customerName: secondary.name,
      customerPhone: secondary.phone,
      assignedEmployeeId: 'emp_01',
      assignedEmployeeName: 'John',
      dueDate: '2026-12-01',
      reason: 'Quotation follow-up'
    });

    // Merge secondary into primary
    const merged = customerService.mergeCustomers(STUDIO_A, primary.id, secondary.id, {
      name: 'Rohan Verma (Merged)',
      alternatePhone: secondary.phone
    });

    expect(merged.name).toBe('Rohan Verma (Merged)');
    expect(merged.alternatePhone).toBe(secondary.phone);

    // Verify secondary is not deleted, but marked merged
    const updatedSecondary = customerService.getCustomer(STUDIO_A, secondary.id);
    expect(updatedSecondary?.status).toBe('Inactive');
    expect(updatedSecondary?.mergedIntoId).toBe(primary.id);
    expect(updatedSecondary?.mergedAt).toBeDefined();

    // Verify event re-linking
    const studioEvents = TenantStore.get<StudioEvent>(STUDIO_A, 'events');
    const linkedEvent = studioEvents.find(e => e.id === secEvent.id);
    expect(linkedEvent?.customerId).toBe(primary.id);

    // Verify follow-up re-linking
    const studioFollowUps = followUpService.listFollowUps(STUDIO_A);
    const linkedFu = studioFollowUps.find(f => f.id === secFollowUp.id);
    expect(linkedFu?.customerId).toBe(primary.id);
  });

  // Test 7: CRM Dashboard metrics calculation
  it('7. should calculate live CRM dashboard metrics accurately', () => {
    // Add customers with different statuses
    customerService.createCustomer(STUDIO_A, {
      name: 'Client Active',
      phone: '9820100001',
      city: 'Mumbai',
      status: 'Active',
      pendingBalance: 15000
    });

    customerService.createCustomer(STUDIO_A, {
      name: 'Client Booked',
      phone: '9820100002',
      city: 'Mumbai',
      status: 'Booked',
      pendingBalance: 0
    });

    customerService.createCustomer(STUDIO_A, {
      name: 'Client FollowUp',
      phone: '9820100003',
      city: 'Mumbai',
      status: 'Follow-up Required'
    });

    leadService.createLead(STUDIO_A, {
      name: 'Inquiry Lead 1',
      phone: '9820100004',
      stage: 'New Inquiry'
    });

    const metrics = customerService.getCRMDashboardMetrics(STUDIO_A);
    expect(metrics.totalCustomers).toBeGreaterThanOrEqual(3);
    expect(metrics.activeCustomers).toBeGreaterThanOrEqual(1);
    expect(metrics.bookedCustomers).toBeGreaterThanOrEqual(1);
    expect(metrics.potentialLeads).toBeGreaterThanOrEqual(1);
    expect(metrics.pendingPaymentCustomers).toBeGreaterThanOrEqual(1);
  });

  // Test 8: Lead Kanban pipeline 6 stages
  it('8. should manage leads across all 6 pipeline stages', () => {
    const lead = leadService.createLead(STUDIO_A, {
      name: 'Ananya Roy',
      phone: '9820334455',
      email: 'ananya@example.com',
      stage: 'New Inquiry',
      estimatedBudget: 150000,
      eventCategory: 'Wedding'
    });

    expect(lead.stage).toBe('New Inquiry');

    // Progress through stages
    leadService.updateLead(STUDIO_A, lead.id, { stage: 'Contacted' });
    expect(leadService.getLead(STUDIO_A, lead.id)?.stage).toBe('Contacted');

    leadService.updateLead(STUDIO_A, lead.id, { stage: 'Quotation Sent' });
    expect(leadService.getLead(STUDIO_A, lead.id)?.stage).toBe('Quotation Sent');

    leadService.updateLead(STUDIO_A, lead.id, { stage: 'Negotiation' });
    expect(leadService.getLead(STUDIO_A, lead.id)?.stage).toBe('Negotiation');

    leadService.updateLead(STUDIO_A, lead.id, { stage: 'Booked' });
    expect(leadService.getLead(STUDIO_A, lead.id)?.stage).toBe('Booked');
  });

  // Test 9: Lead conversion to customer & optional event
  it('9. should convert lead to full customer profile without duplicates and optionally create event', () => {
    const lead = leadService.createLead(STUDIO_A, {
      name: 'Siddharth Sen',
      phone: '9820667788',
      email: 'sid@example.com',
      city: 'Kolkata',
      estimatedBudget: 200000,
      eventCategory: 'Wedding',
      tentativeDate: '2026-11-20'
    });

    const result = leadService.convertLead(STUDIO_A, lead.id, {
      createEvent: true,
      eventDate: '2026-11-20',
      eventTitle: 'Siddharth Wedding'
    });

    expect(result.customer).toBeDefined();
    expect(result.customer.name).toBe('Siddharth Sen');
    expect(result.customer.status).toBe('Booked');

    expect(result.event).toBeDefined();
    expect(result.event?.title).toBe('Siddharth Wedding');
    expect(result.event?.customerId).toBe(result.customer.id);

    const updatedLead = leadService.getLead(STUDIO_A, lead.id);
    expect(updatedLead?.stage).toBe('Booked');
    expect(updatedLead?.convertedCustomerId).toBe(result.customer.id);
  });

  // Test 10: WhatsApp click-to-chat URL generation
  it('10. should generate compliant native wa.me click-to-chat URL', () => {
    const res = whatsappService.generateClickToChatUrl('9820112233', 'Hello Aditi, greetings from Royal Studio!');
    expect(res.url.startsWith('https://wa.me/919820112233?text=')).toBe(true);
  });

  // Test 11: WhatsApp phone formatting strictly pure digits without +
  it('11. should ensure phone in wa.me link contains strictly digits with no + or special chars', () => {
    const res1 = whatsappService.generateClickToChatUrl('+91 (98201) 12233', 'Test');
    expect(res1.url).toContain('https://wa.me/919820112233?text=');
    expect(res1.url).not.toContain('wa.me/+');
    expect(res1.url).not.toContain('wa.me/%2B');

    const res2 = whatsappService.generateClickToChatUrl('+1 (555) 234-5678', 'International');
    expect(res2.url).toContain('https://wa.me/15552345678?text=');
  });

  // Test 12: URL encoding with spaces, emojis, and newlines
  it('12. should properly URL encode emojis, spaces and line breaks in WhatsApp messages', () => {
    const msg = "Congratulations Aditi! 📸✨\nLooking forward to tomorrow's shoot.";
    const res = whatsappService.generateClickToChatUrl('9820112233', msg);

    // Emojis and newlines encoded
    expect(res.url).toContain('%0A'); // Newline
    expect(res.url).not.toContain('\n'); // Raw newline not in URL
    // wa.me format
    expect(res.url.startsWith('https://wa.me/919820112233?text=')).toBe(true);
  });

  // Test 13: 16 default message templates
  it('13. should initialize 16 default photography studio WhatsApp message templates', () => {
    expect(DEFAULT_16_WHATSAPP_TEMPLATES.length).toBe(16);

    const templates = whatsappService.listTemplates(STUDIO_A);
    expect(templates.length).toBeGreaterThanOrEqual(16);

    const titles = templates.map(t => t.title);
    expect(titles).toContain('Initial Inquiry Response');
    expect(titles).toContain('Booking Confirmation');
    expect(titles).toContain('Quotation Shared');
    expect(titles).toContain('Photo Selection Reminder');
    expect(titles).toContain('Album Approval Request');
    expect(titles).toContain('Final Delivery Notification');
    expect(titles).toContain('Feedback Request');
  });

  // Test 14: Placeholder replacement
  it('14. should accurately replace dynamic variables in message templates', () => {
    const template = 'Dear {{customer_name}}, booking *#{{booking_id}}* for *{{event_name}}* on *{{event_date}}* is confirmed by *{{studio_name}}*!';
    const resolved = whatsappService.replacePlaceholders(template, {
      customer_name: 'Priya Patel',
      booking_id: 'BK-2026-09',
      event_name: 'Priya & Rahul Wedding',
      event_date: '15 Dec 2026',
      studio_name: 'Royal Weddings Studio'
    });

    expect(resolved.message).toBe('Dear Priya Patel, booking *#BK-2026-09* for *Priya & Rahul Wedding* on *15 Dec 2026* is confirmed by *Royal Weddings Studio*!');
    expect(resolved.missingKeys.length).toBe(0);
  });

  // Test 15: Missing placeholder warning detection
  it('15. should identify missing placeholder variables and report them in warnings', () => {
    const template = 'Hello {{customer_name}}, your outstanding balance of ₹{{pending_balance}} is due on {{due_date}}. From {{studio_name}}.';
    const resolved = whatsappService.replacePlaceholders(template, {
      customer_name: 'Karan Mehra',
      studio_name: 'Shutter Magic'
      // missing pending_balance and due_date
    });

    expect(resolved.missingKeys).toContain('pending_balance');
    expect(resolved.missingKeys).toContain('due_date');
    expect(resolved.message).toContain('{{pending_balance}}');
    expect(resolved.message).toContain('{{due_date}}');
  });

  // Test 16: Template management (create, update, duplicate, delete)
  it('16. should support creating, duplicating, updating and deleting message templates', () => {
    const custom = whatsappService.createTemplate(STUDIO_A, {
      title: 'Drone Pilot Pre-Flight Notice',
      category: 'Booking',
      body: 'Hi {{customer_name}}, drone permissions are cleared for {{event_venue}}.'
    });

    expect(custom.id).toBeDefined();
    expect(custom.title).toBe('Drone Pilot Pre-Flight Notice');

    const duplicated = whatsappService.duplicateTemplate(STUDIO_A, custom.id);
    expect(duplicated.title).toBe('Drone Pilot Pre-Flight Notice (Copy)');

    const updated = whatsappService.updateTemplate(STUDIO_A, duplicated.id, {
      title: 'Drone Pilot Pre-Flight Notice (Updated)'
    });
    expect(updated.title).toBe('Drone Pilot Pre-Flight Notice (Updated)');

    whatsappService.deleteTemplate(STUDIO_A, duplicated.id);
    expect(whatsappService.getTemplate(STUDIO_A, duplicated.id)).toBeUndefined();
  });

  // Test 17: WhatsApp activity log lifecycle
  it('17. should track WhatsApp activity log lifecycle through Drafted -> Link Opened -> User Confirmed Sent -> Cancelled', () => {
    const log = whatsappService.logWhatsAppInitiation(STUDIO_A, {
      customerId: 'cust_001',
      customerName: 'Aditi Sharma',
      phone: '9820112233',
      templateTitle: 'Booking Confirmation',
      messageText: 'Your shoot is locked!'
    });

    expect(log.status).toBe('Drafted');
    expect(log.url.startsWith('https://wa.me/')).toBe(true);

    // Confirm sent
    const confirmed = whatsappService.confirmMessageSent(STUDIO_A, log.id);
    expect(confirmed.status).toBe('User Confirmed Sent');
    expect(confirmed.confirmedSentAt).toBeDefined();

    // Cancelled log test
    const log2 = whatsappService.logWhatsAppInitiation(STUDIO_A, {
      customerId: 'cust_002',
      customerName: 'Vikram Mehta',
      phone: '9820998877',
      templateTitle: 'Inquiry',
      messageText: 'Inquiry response'
    });

    const cancelled = whatsappService.cancelMessageLog(STUDIO_A, log2.id, 'User closed tab without sending');
    expect(cancelled.status).toBe('Cancelled');
    expect(cancelled.cancelReason).toBe('User closed tab without sending');
  });

  // Test 18: Customer notes and interaction logging
  it('18. should log customer internal notes and multi-channel interactions', () => {
    const cust = customerService.createCustomer(STUDIO_A, {
      name: 'Ritu Kapoor',
      phone: '9820888777',
      city: 'Delhi'
    });

    const note = customerService.addNote(STUDIO_A, cust.id, 'Client prefers pastel tones and outdoor twilight portraits.', false, 'admin_1', 'Creative Director');
    expect(note.id).toBeDefined();
    expect(note.text).toContain('twilight portraits');

    const interaction = customerService.logInteraction(STUDIO_A, cust.id, {
      type: 'whatsapp',
      summary: 'Sent album proofs via WhatsApp link.',
      operatorId: 'admin_1',
      operatorName: 'Creative Director'
    });

    expect(interaction.type).toBe('whatsapp');
    const notes = customerService.listNotes(STUDIO_A, cust.id);
    expect(notes.length).toBe(1);

    const interactions = customerService.listInteractions(STUDIO_A, cust.id);
    expect(interactions.length).toBeGreaterThanOrEqual(1);
    expect(interactions.some(i => i.type === 'whatsapp')).toBe(true);
  });

  // Test 19: Follow-up reminder operations (create, complete, reschedule, reassign)
  it('19. should execute complete follow-up reminder lifecycle', () => {
    const fu = followUpService.createFollowUp(STUDIO_A, {
      customerId: 'cust_010',
      customerName: 'Manish Malhotra',
      customerPhone: '9820121212',
      assignedEmployeeId: 'emp_01',
      assignedEmployeeName: 'Lead Photographer',
      dueDate: '2026-11-20',
      dueTime: '15:00',
      reason: 'Call for final invoice clearance'
    });

    expect(fu.status).toBe('pending');

    // Reschedule
    const rescheduled = followUpService.rescheduleFollowUp(STUDIO_A, fu.id, '2026-11-25', '16:00');
    expect(rescheduled.dueDate).toBe('2026-11-25');
    expect(rescheduled.status).toBe('rescheduled');

    // Reassign
    const reassigned = followUpService.reassignFollowUp(STUDIO_A, fu.id, 'emp_02', 'Studio Manager');
    expect(reassigned.assignedEmployeeId).toBe('emp_02');
    expect(reassigned.assignedEmployeeName).toBe('Studio Manager');

    // Complete
    const completed = followUpService.completeFollowUp(STUDIO_A, fu.id, 'emp_02', 'Studio Manager', 'Payment received via UPI');
    expect(completed.status).toBe('completed');
    expect(completed.completedBy).toBe('Studio Manager');
    expect(completed.notes).toContain('Payment received via UPI');
  });

  // Test 20: Employee leave check for follow-up reminders
  it('20. should detect when an assigned team member is on approved leave on the follow-up due date', () => {
    // Submit and approve leave for employee emp_leave_01 from 2026-11-18 to 2026-11-22
    const req = leaveService.submitRequest(STUDIO_A, {
      employeeId: 'emp_leave_01',
      employeeName: 'Ravi Kumar',
      leaveTypeId: 'annual',
      startDate: '2026-11-18',
      endDate: '2026-11-22',
      days: 5,
      reason: 'Family vacation'
    });

    leaveService.reviewRequest(STUDIO_A, req.id, 'approved', 'admin_1', 'Enjoy your holidays');

    // Check on 2026-11-20 (falls within leave window)
    const isOnLeaveOnDue = followUpService.isAssigneeOnLeave(STUDIO_A, 'emp_leave_01', '2026-11-20');
    expect(isOnLeaveOnDue).toBe(true);

    // Check on 2026-11-25 (after leave window)
    const isOnLeaveAfter = followUpService.isAssigneeOnLeave(STUDIO_A, 'emp_leave_01', '2026-11-25');
    expect(isOnLeaveAfter).toBe(false);
  });

  // Test 21: Communication preferences enforcement
  it('21. should support customer communication preferences and marketing opt-out flags', () => {
    const cust = customerService.createCustomer(STUDIO_A, {
      name: 'Shalini Gupta',
      phone: '9820554433',
      city: 'Mumbai',
      communicationPreferences: {
        preferredContactMethod: 'whatsapp',
        whatsappConsent: true,
        emailConsent: false,
        marketingConsent: false,
        marketingOptOut: true,
        optOut: false,
        preferredLanguage: 'English'
      }
    });

    expect(cust.communicationPreferences?.whatsappConsent).toBe(true);
    expect(cust.communicationPreferences?.emailConsent).toBe(false);
    expect(cust.communicationPreferences?.marketingOptOut).toBe(true);
    expect(cust.communicationPreferences?.preferredLanguage).toBe('English');

    // Update preferences
    const updated = customerService.updateCustomer(STUDIO_A, cust.id, {
      communicationPreferences: {
        preferredContactMethod: 'whatsapp',
        whatsappConsent: false,
        emailConsent: true,
        marketingConsent: false,
        marketingOptOut: false,
        optOut: false,
        preferredLanguage: 'Hindi'
      }
    });

    expect(updated.communicationPreferences?.whatsappConsent).toBe(false);
    expect(updated.communicationPreferences?.emailConsent).toBe(true);
    expect(updated.communicationPreferences?.preferredLanguage).toBe('Hindi');
  });
});
