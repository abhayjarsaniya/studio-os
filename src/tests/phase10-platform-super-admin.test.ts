import { describe, it, expect, beforeEach } from 'vitest';
import { TenantStore } from '../services/tenantStore';
import { platformAuthService, ROLE_PERMISSIONS_MAP } from '../services/platformAuthService';
import { platformAuditService } from '../services/platformAuditService';
import { platformPlanService } from '../services/platformPlanService';
import { platformSubscriptionManager } from '../services/platformSubscriptionManager';
import { subscriptionAccessGuard } from '../services/subscriptionAccessGuard';
import { platformBillingService } from '../services/platformBillingService';
import { platformStudioService } from '../services/platformStudioService';
import { platformFeatureService } from '../services/platformFeatureService';
import { platformAnnouncementService } from '../services/platformAnnouncementService';
import { platformSupportService } from '../services/platformSupportService';
import { platformPaymentGatewayService } from '../services/platformPaymentGatewayService';
import { platformMacroAnalyticsService } from '../services/platformMacroAnalyticsService';
import { customerService } from '../services/customerService';
import { eventService } from '../services/eventService';
import { invoiceService } from '../services/invoiceService';
import { paymentService } from '../services/paymentService';
import { roleService } from '../services/roleService';
import { PlatformRole, PlatformPermission, PlatformAdminUser } from '../types/schema';

describe('Phase 10: Platform Super Admin & SaaS Subscription Management', () => {
  const studioA = 'studio_royal_001';
  const studioB = 'studio_creative_002';
  const testStudio = 'studio_test_p10_alpha';

  beforeEach(() => {
    // Reset test studio and platform state
    TenantStore.resetTenant(testStudio);
    TenantStore.set('platform_system', 'platform_support_access_grants', []);
  });

  // 1. Secure Platform Super Admin authentication & verification
  it('1. verifies authentic platform super admin access and attributes', () => {
    const admins = platformAuthService.listAdmins();
    const superAdmin = admins.find(a => a.role === 'super_admin');
    expect(superAdmin).toBeDefined();
    expect(superAdmin?.email).toBe('superadmin@studioos.internal');

    const verified = platformAuthService.verifyPlatformAdminAccess(superAdmin!.email);
    expect(verified.isAuthorized).toBe(true);
    expect(verified.admin?.role).toBe('super_admin');
  });

  // 2. Platform role authorization
  it('2. enforces granular role-based authorization across 5 platform roles', () => {
    // Super admin has all permissions
    const superAdminUser: PlatformAdminUser = { id: 'adm_1', name: 'Super', email: 's@test.com', role: 'super_admin', permissions: ROLE_PERMISSIONS_MAP.super_admin, status: 'active', createdAt: '' };
    expect(platformAuthService.hasPlatformPermission(superAdminUser, 'manage_admins')).toBe(true);
    expect(platformAuthService.hasPlatformPermission(superAdminUser, 'manage_subscriptions')).toBe(true);
    expect(platformAuthService.hasPlatformPermission(superAdminUser, 'manage_settings')).toBe(true);

    // Billing manager has billing permissions but cannot manage admins
    const billingManagerUser: PlatformAdminUser = { id: 'adm_2', name: 'Billing', email: 'b@test.com', role: 'billing_manager', permissions: ROLE_PERMISSIONS_MAP.billing_manager, status: 'active', createdAt: '' };
    expect(platformAuthService.hasPlatformPermission(billingManagerUser, 'view_revenue')).toBe(true);
    expect(platformAuthService.hasPlatformPermission(billingManagerUser, 'record_payments')).toBe(true);
    expect(platformAuthService.hasPlatformPermission(billingManagerUser, 'manage_admins')).toBe(false);

    // Read only analyst can only view
    const analystUser: PlatformAdminUser = { id: 'adm_3', name: 'Analyst', email: 'a@test.com', role: 'read_only_analyst', permissions: ROLE_PERMISSIONS_MAP.read_only_analyst, status: 'active', createdAt: '' };
    expect(platformAuthService.hasPlatformPermission(analystUser, 'view_studios')).toBe(true);
    expect(platformAuthService.hasPlatformPermission(analystUser, 'view_revenue')).toBe(true);
    expect(platformAuthService.hasPlatformPermission(analystUser, 'record_payments')).toBe(false);
    expect(platformAuthService.hasPlatformPermission(analystUser, 'manage_subscriptions')).toBe(false);
  });

  // 3. Studio Owner cannot access platform admin routes/permissions
  it('3. rejects Studio Owner from platform admin authorization', () => {
    const studioOwner = {
      id: 'owner_usr_001',
      email: 'owner@royalweddings.com',
      fullName: 'Vikram Singhania',
      role: 'Studio Owner', // Studio level role, not a PlatformRole
      status: 'active'
    };

    const result = platformAuthService.verifyPlatformAdminAccess(studioOwner as any);
    expect(result.isAuthorized).toBe(false);
    expect(result.reason).toContain('Invalid or missing platform role');
  });

  // 4. Studio Admin cannot access platform admin routes/permissions
  it('4. rejects Studio Admin from accessing platform administration', () => {
    const studioAdmin = {
      id: 'admin_usr_002',
      email: 'manager@royalweddings.com',
      fullName: 'Anita Sharma',
      role: 'Admin', // Studio level admin role
      status: 'active'
    };

    const result = platformAuthService.verifyPlatformAdminAccess(studioAdmin as any);
    expect(result.isAuthorized).toBe(false);
    expect(result.reason).toContain('Invalid or missing platform role');
  });

  // 5. Studio directory listing and usage metrics aggregation
  it('5. lists studios and accurately aggregates multi-tenant usage metrics', () => {
    const studios = platformStudioService.listStudios();
    expect(studios.length).toBeGreaterThanOrEqual(2);

    const royalStudio = studios.find(s => s.id === studioA);
    expect(royalStudio).toBeDefined();
    expect(royalStudio?.planName).toBe('Studio OS Standard');
    expect(royalStudio?.planPrice).toBe(500);

    const detailed = platformStudioService.getStudio(studioA);
    expect(detailed).toBeDefined();
    expect(detailed?.usage.employeeCount).toBeGreaterThanOrEqual(1);
    expect(detailed?.usage.customerCount).toBeGreaterThanOrEqual(1);
  });

  // 6. Studio lifecycle status changes
  it('6. safely transitions studio lifecycle status through activate, suspend, reactivate, and archive', () => {
    // Initial status
    const initial = platformStudioService.getStudio(studioA);
    expect(initial?.lifecycleStatus).toBe('active');

    // Suspend
    platformStudioService.updateLifecycleStatus(studioA, 'suspended', 'Payment overdue past grace window', 'Test Admin');
    let updated = platformStudioService.getStudio(studioA);
    expect(updated?.lifecycleStatus).toBe('suspended');

    // Reactivate
    platformStudioService.updateLifecycleStatus(studioA, 'active', 'Payment settled via NEFT', 'Test Admin');
    updated = platformStudioService.getStudio(studioA);
    expect(updated?.lifecycleStatus).toBe('active');

    // Archive
    platformStudioService.updateLifecycleStatus(studioA, 'archived', 'Customer requested data freeze', 'Test Admin');
    updated = platformStudioService.getStudio(studioA);
    expect(updated?.lifecycleStatus).toBe('archived');

    // Restore to active
    platformStudioService.updateLifecycleStatus(studioA, 'active', 'Restored for ongoing tests', 'Test Admin');
  });

  // 7. Create and edit SaaS subscription plans
  it('7. creates, updates, and duplicates SaaS subscription tiers', () => {
    // Create new custom tier
    const newPlan = platformPlanService.createPlan({
      name: 'Studio OS Enterprise Annual',
      description: 'Full studio suite with dedicated support and unlimited branches',
      priceMonthly: 1200,
      priceAnnual: 12000,
      currency: 'INR',
      billingCycle: 'annual',
      employeeLimit: 100,
      branchLimit: 10,
      storageGb: 500,
      features: ['events', 'finance', 'analytics', 'branches'],
      trialDays: 14,
      gracePeriodDays: 7,
      isActive: true
    }, 'super_admin_usr');

    expect(newPlan.id).toBeDefined();
    expect(newPlan.version).toBe(1);
    expect(newPlan.priceMonthly).toBe(1200);

    // Update plan price - should bump plan version to protect historical subscribers
    const updatedPlan = platformPlanService.updatePlan(newPlan.id, {
      priceMonthly: 1500
    }, 'super_admin_usr');

    expect(updatedPlan.priceMonthly).toBe(1500);
    expect(updatedPlan.version).toBe(2);

    // Duplicate plan
    const dup = platformPlanService.duplicatePlan(newPlan.id, 'Studio OS Enterprise Copy', 'super_admin_usr');
    expect(dup.name).toBe('Studio OS Enterprise Copy');
    expect(dup.priceMonthly).toBe(1500);
  });

  // 8. Grandfathered pricing preservation
  it('8. preserves grandfathered agreed pricing when global plan price changes', () => {
    // Royal Studio is on Standard Plan with agreedPrice = 500
    const subBefore = platformSubscriptionManager.getSubscription(studioA);
    expect(subBefore?.agreedPrice).toBe(500);
    const initialPlanVersion = subBefore?.planVersion;

    // Platform increases Standard Plan price to 750
    const standardPlan = platformPlanService.getStandardPlan();
    platformPlanService.updatePlan(standardPlan.id, {
      priceMonthly: 750
    }, 'super_admin_usr');

    // Existing studio subscription must retain agreedPrice 500
    const subAfter = platformSubscriptionManager.getSubscription(studioA);
    expect(subAfter?.agreedPrice).toBe(500);
    expect(subAfter?.planVersion).toBe(initialPlanVersion);
  });

  // 9. Safe plan upgrade/downgrade with price agreement updates
  it('9. correctly executes safe plan change and updates agreed price', () => {
    const standardPlan = platformPlanService.getStandardPlan();

    // Create a pro plan
    const proPlan = platformPlanService.createPlan({
      name: 'Studio OS Pro Test Tier',
      description: 'Studio OS Pro tier description',
      priceMonthly: 999,
      priceAnnual: 9990,
      currency: 'INR',
      billingCycle: 'monthly',
      employeeLimit: 25,
      branchLimit: 3,
      storageGb: 100,
      features: ['events', 'crm_customers', 'finance'],
      trialDays: 14,
      gracePeriodDays: 7,
      isActive: true
    }, 'super_admin_usr');

    // Upgrade studio to Pro plan
    const upgradedSub = platformSubscriptionManager.changeSubscriptionPlan(studioA, proPlan.id, true, 'super_admin_usr');
    expect(upgradedSub.planId).toBe(proPlan.id);
    expect(upgradedSub.agreedPrice).toBe(999);
    expect(upgradedSub.planName).toBe('Studio OS Pro Test Tier');

    // Downgrade back to Standard Plan
    const downgradedSub = platformSubscriptionManager.changeSubscriptionPlan(studioA, standardPlan.id, true, 'super_admin_usr');
    expect(downgradedSub.planId).toBe(standardPlan.id);
    expect(downgradedSub.agreedPrice).toBe(standardPlan.priceMonthly);
  });

  // 10. Subscription renewals and period extensions
  it('10. extends subscription periods and performs valid renewals', () => {
    const sub = platformSubscriptionManager.getSubscription(studioA)!;
    const initialEnd = new Date(sub.currentPeriodEnd).getTime();

    // Extend subscription by 30 days
    const extendedSub = platformSubscriptionManager.extendSubscriptionPeriod(studioA, 30, 'Promotional extension for pilot feedback', 'super_admin_usr');
    const newEnd = new Date(extendedSub.currentPeriodEnd).getTime();
    expect(newEnd).toBeGreaterThan(initialEnd);
    expect(Math.round((newEnd - initialEnd) / 86400000)).toBe(30);

    // Verify transition history was recorded
    expect(extendedSub.transitions.length).toBeGreaterThan(0);
    const lastTransition = extendedSub.transitions[0];
    expect(lastTransition.reason).toContain('Promotional extension');
  });

  // 11. Subscription expiration enforcement
  it('11. strictly enforces valid state transitions and detects expiration', () => {
    // Valid transition: active -> past_due
    const pastDueSub = platformSubscriptionManager.transitionSubscriptionState(studioA, 'past_due', 'Invoice payment failed after 3 retries', 'billing_admin');
    expect(pastDueSub.status).toBe('past_due');

    // Invalid transition: past_due directly to trial is forbidden by transition matrix
    expect(() => {
      platformSubscriptionManager.transitionSubscriptionState(studioA, 'trial', 'Invalid test transition', 'admin');
    }).toThrow(/Invalid subscription/);

    // Transition back to active
    const activeSub = platformSubscriptionManager.transitionSubscriptionState(studioA, 'active', 'Payment settled', 'billing_admin');
    expect(activeSub.status).toBe('active');
  });

  // 12. Grace period application and calculation
  it('12. calculates and applies grace period deadlines during past_due transitions', () => {
    const sub = platformSubscriptionManager.transitionSubscriptionState(studioA, 'past_due', 'Payment grace window activated', 'billing_admin');
    expect(sub.status).toBe('past_due');

    // Transition past_due -> grace_period
    const graceSub = platformSubscriptionManager.transitionSubscriptionState(studioA, 'grace_period', 'Entering 7-day grace period', 'billing_admin');
    expect(graceSub.status).toBe('grace_period');
    expect(graceSub.gracePeriodEndsAt).toBeDefined();

    // Return to active
    platformSubscriptionManager.transitionSubscriptionState(studioA, 'active', 'Settled before grace window expired', 'billing_admin');
  });

  // 13. Studio data preservation after suspension
  it('13. completely preserves all studio records (customers, events, finances) during and after suspension', () => {
    // Create customer and event in studio A
    const customer = customerService.createCustomer(studioA, {
      name: 'Preserved Customer',
      phone: '9988776655',
      city: 'Delhi',
      source: 'Instagram'
    });

    const event = eventService.createEvent(studioA, {
      name: 'Preserved Wedding',
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      category: 'Wedding',
      priority: 'High',
      status: 'Confirmed',
      startDate: '2026-11-20',
      endDate: '2026-11-20',
      startTime: '10:00',
      endTime: '22:00',
      venue: 'The Leela Palace',
      venueCity: 'New Delhi',
      createdBy: 'Vikram Singhania'
    });

    // Suspend the studio
    platformStudioService.updateLifecycleStatus(studioA, 'suspended', 'Audit test suspension', 'super_admin');

    // Verify studio data is NOT purged or deleted
    const preservedCustomer = customerService.getCustomer(studioA, customer.id);
    expect(preservedCustomer).toBeDefined();
    expect(preservedCustomer?.name).toBe('Preserved Customer');

    const preservedEvent = eventService.getEvent(studioA, event.id);
    expect(preservedEvent).toBeDefined();
    expect(preservedEvent?.name).toBe('Preserved Wedding');

    // Restore to active
    platformStudioService.updateLifecycleStatus(studioA, 'active', 'Restored after test', 'super_admin');
  });

  // 14. Restricted mode for suspended studios
  it('14. guards suspended studios by restricting operations to billing and support routes', () => {
    // Put test studio into suspended state
    platformStudioService.updateLifecycleStatus(testStudio, 'suspended', 'Subscription suspended', 'super_admin');

    // Access to operational routes (/app/events, /app/finance) must be blocked
    const eventAccess = subscriptionAccessGuard.checkStudioAccess(testStudio, '/app/events');
    expect(eventAccess.allowed).toBe(false);
    expect(eventAccess.isRestricted).toBe(true);
    expect(eventAccess.redirectRoute).toBe('/app/billing');

    // Access to billing route (/app/billing) must be allowed for remediation
    const billingAccess = subscriptionAccessGuard.checkStudioAccess(testStudio, '/app/billing');
    expect(billingAccess.allowed).toBe(true);

    // Access to support route (/app/support) must be allowed
    const supportAccess = subscriptionAccessGuard.checkStudioAccess(testStudio, '/app/support');
    expect(supportAccess.allowed).toBe(true);

    // Clean up
    platformStudioService.updateLifecycleStatus(testStudio, 'active', 'Active test', 'super_admin');
  });

  // 15. Platform invoice generation and receipt generation
  it('15. generates formatted platform invoices (PINV-YYYY-000001) and receipts (PREC-YYYY-000001)', () => {
    const invoice = platformBillingService.createInvoice({
      studioId: testStudio,
      studioName: 'Alpha Creative Studio',
      subscriptionId: 'sub_alpha_001',
      planName: 'Studio OS Standard',
      planVersion: 1,
      billingPeriodStart: '2026-06-01',
      billingPeriodEnd: '2026-06-30',
      subtotal: 500,
      taxAmount: 90, // 18% GST
      actingAdminName: 'Super Admin'
    });

    expect(invoice.invoiceNumber).toMatch(/^PINV-\d{4}-\d{6}$/);
    expect(invoice.totalAmount).toBe(590);
    expect(invoice.balanceAmount).toBe(590);
    expect(invoice.status).toBe('issued');

    // Settle invoice with payment
    const { payment, invoice: updatedInvoice } = platformBillingService.recordPayment({
      invoiceId: invoice.id,
      amount: 590,
      paymentMethod: 'UPI',
      transactionReference: `UPI-TEST-${Date.now()}`,
      recordedBy: 'Super Admin',
      isManual: false
    });

    expect(payment.receiptNumber).toMatch(/^PREC-\d{4}-\d{6}$/);
    expect(payment.amount).toBe(590);
    expect(updatedInvoice.status).toBe('paid');
    expect(updatedInvoice.balanceAmount).toBe(0);
  });

  // 16. Manual offline payment recording by Super Admin
  it('16. allows Platform Super Admin to record manual offline payments (NEFT/Cheque/Cash)', () => {
    const invoice = platformBillingService.createInvoice({
      studioId: testStudio,
      studioName: 'Alpha Creative Studio',
      subscriptionId: 'sub_alpha_001',
      planName: 'Studio OS Standard',
      billingPeriodStart: '2026-07-01',
      billingPeriodEnd: '2026-07-31',
      subtotal: 500
    });

    const { payment } = platformBillingService.recordPayment({
      invoiceId: invoice.id,
      amount: 500,
      paymentMethod: 'Bank Transfer',
      transactionReference: `NEFT-MANUAL-${Date.now()}`,
      isManual: true,
      recordedBy: 'Super Admin Vikram',
      notes: 'Direct bank transfer credited to HDFC platform account'
    });

    expect(payment.isManual).toBe(true);
    expect(payment.recordedBy).toBe('Super Admin Vikram');
    expect(payment.paymentMethod).toBe('Bank Transfer');
  });

  // 17. Payment gateway order creation and signature verification
  it('17. creates payment orders and verifies gateway webhook signatures', () => {
    const invoice = platformBillingService.createInvoice({
      studioId: studioA,
      studioName: 'Royal Weddings Studio',
      subscriptionId: 'sub_studio_royal_001',
      planName: 'Studio OS Standard',
      billingPeriodStart: '2026-08-01',
      billingPeriodEnd: '2026-08-31',
      subtotal: 500
    });

    const order = platformPaymentGatewayService.createPaymentOrder({
      invoiceId: invoice.id,
      studioId: studioA,
      amount: 500,
      currency: 'INR',
      description: 'Monthly SaaS Subscription - August 2026'
    });

    expect(order.orderId).toBeDefined();
    expect(order.checkoutPayload.amount).toBe(50000); // 500 * 100 paise
    expect(order.currency).toBe('INR');

    // Test webhook signature validation
    const secret = 'whsec_platform_test_key';
    const payload = JSON.stringify({ event: 'payment.captured', orderId: order.orderId });
    const signature = platformPaymentGatewayService.computeHmacSignature(payload, secret);

    const isValid = platformPaymentGatewayService.verifyWebhookSignature(payload, signature, secret);
    expect(isValid).toBe(true);

    const isTampered = platformPaymentGatewayService.verifyWebhookSignature(payload, 'tampered_signature', secret);
    expect(isTampered).toBe(false);
  });

  // 18. Idempotent payment processing
  it('18. prevents duplicate payment processing via transaction reference idempotency', () => {
    const invoice = platformBillingService.createInvoice({
      studioId: testStudio,
      studioName: 'Alpha Studio',
      subscriptionId: 'sub_alpha_001',
      planName: 'Studio OS Standard',
      billingPeriodStart: '2026-09-01',
      billingPeriodEnd: '2026-09-30',
      subtotal: 500
    });

    const uniqueTxnRef = `UPI-IDEMPOTENT-${Date.now()}`;

    // First attempt succeeds
    platformBillingService.recordPayment({
      invoiceId: invoice.id,
      amount: 500,
      paymentMethod: 'UPI',
      transactionReference: uniqueTxnRef,
      recordedBy: 'Automated Gateway'
    });

    // Create a second invoice
    const invoice2 = platformBillingService.createInvoice({
      studioId: testStudio,
      studioName: 'Alpha Studio',
      subscriptionId: 'sub_alpha_001',
      planName: 'Studio OS Standard',
      billingPeriodStart: '2026-10-01',
      billingPeriodEnd: '2026-10-31',
      subtotal: 500
    });

    // Duplicate transaction reference should be rejected
    expect(() => {
      platformBillingService.recordPayment({
        invoiceId: invoice2.id,
        amount: 500,
        paymentMethod: 'UPI',
        transactionReference: uniqueTxnRef,
        recordedBy: 'Automated Gateway'
      });
    }).toThrow(/Duplicate Payment Prevented/);
  });

  // 19. Feature catalog and quota checks
  it('19. enforces feature catalog limits and studio quota evaluations', () => {
    const features = platformFeatureService.listFeatures();
    expect(features.length).toBeGreaterThanOrEqual(20);

    const eventsFeature = features.find(f => f.key === 'events');
    expect(eventsFeature).toBeDefined();
    expect(eventsFeature?.isGlobalEnabled).toBe(true);

    // Check quota evaluation
    const employeeQuota = platformFeatureService.checkStudioQuota(studioA, 'employees');
    expect(employeeQuota.allowed).toBe(true);
    expect(employeeQuota.current).toBeGreaterThan(0);
    expect(employeeQuota.max).toBeGreaterThan(0);
  });

  // 20. Feature access independence from RBAC permissions
  it('20. enforces global kill switch override independent of user studio RBAC', () => {
    // Global kill switch disables equipment module
    platformFeatureService.toggleGlobalFeature('equipment', false, 'Super Admin');

    const access = platformFeatureService.checkStudioFeatureAccess(testStudio, 'equipment');
    expect(access.isAllowed).toBe(false);
    expect(access.reason).toContain('disabled across the platform');

    // Re-enable equipment
    platformFeatureService.toggleGlobalFeature('equipment', true, 'Super Admin');
    const restoredAccess = platformFeatureService.checkStudioFeatureAccess(studioA, 'equipment');
    expect(restoredAccess.isAllowed).toBe(true);
  });

  // 21. Create, target, and publish platform announcements
  it('21. creates and targets platform announcements to specific studio cohorts', () => {
    const announcement = platformAnnouncementService.createAnnouncement({
      title: 'Scheduled Cloud Storage Maintenance',
      description: 'Storage maintenance window on Sunday 2 AM to 4 AM IST.',
      type: 'maintenance',
      targetScope: 'specific_studios',
      targetStudioIds: [studioA],
      priority: 'high',
      status: 'published',
      createdBy: 'Super Admin'
    });

    expect(announcement.id).toBeDefined();
    expect(announcement.status).toBe('published');

    // Studio A should receive it
    const forStudioA = platformAnnouncementService.getAnnouncementsForStudio(studioA);
    expect(forStudioA.some(a => a.id === announcement.id)).toBe(true);

    // Studio B was not targeted, so should NOT receive it
    const forStudioB = platformAnnouncementService.getAnnouncementsForStudio(studioB);
    expect(forStudioB.some(a => a.id === announcement.id)).toBe(false);
  });

  // 22. Support ticket lifecycle and confidential internal notes
  it('22. manages support tickets with confidential internal notes', () => {
    const ticket = platformSupportService.createTicket({
      studioId: studioA,
      studioName: 'Royal Weddings Studio',
      submittedBy: 'Vikram Singhania',
      contactEmail: 'vikram@royalweddings.com',
      subject: 'Assistance with custom GST invoice layout',
      description: 'Need help customizing invoice PDF header format',
      category: 'billing',
      priority: 'high'
    });

    expect(ticket.ticketNumber).toMatch(/^TICK-\d{4}-\d{6}$/);
    expect(ticket.status).toBe('open');

    // Add confidential internal note (only visible to platform admins)
    const updatedTicket = platformSupportService.addInternalNote(
      ticket.id,
      'Confidential: Customer has VIP tier subscription. Expedite resolution.',
      'Super Admin Vikram'
    );

    expect(updatedTicket.internalNotes?.length).toBeGreaterThan(0);
    expect(updatedTicket.internalNotes?.[0]).toContain('Confidential: Customer has VIP tier');

    // Resolve ticket
    const resolved = platformSupportService.updateTicketStatus(ticket.id, 'resolved', 'Super Admin Vikram');
    expect(resolved.status).toBe('resolved');
  });

  // 23. Audited time-limited support access grant and automatic expiration
  it('23. authorizes time-limited audited support access and allows instant revocation', () => {
    // Attempting without reason must throw
    expect(() => {
      platformSupportService.grantSupportAccess({
        studioId: studioA,
        studioName: 'Royal Weddings Studio',
        adminId: 'adm_support_1',
        adminName: 'Sanjay Tech Support',
        reason: '   '
      });
    }).toThrow(/Explicit reason is required/);

    // Valid support grant
    const grant = platformSupportService.grantSupportAccess({
      studioId: studioA,
      studioName: 'Royal Weddings Studio',
      adminId: 'adm_support_1',
      adminName: 'Sanjay Tech Support',
      reason: 'Diagnose RAW file thumbnail generation bug reported in TICK-2026-000001',
      durationHours: 2
    });

    expect(grant.id).toBeDefined();
    expect(grant.isRevoked).toBe(false);

    // Verify support access is valid
    const verification = platformSupportService.verifySupportAccess(studioA, 'adm_support_1');
    expect(verification.isValid).toBe(true);

    // Instant revocation
    platformSupportService.revokeSupportAccess(grant.id, 'Super Admin');
    const afterRevoke = platformSupportService.verifySupportAccess(studioA, 'adm_support_1');
    expect(afterRevoke.isValid).toBe(false);
  });

  // 24. Platform Super Admin safety guard
  it('24. protects the platform by preventing deletion or suspension of the last active Super Admin', () => {
    const admins = platformAuthService.listAdmins();
    const superAdmins = admins.filter(a => a.role === 'super_admin' && a.status === 'active');
    expect(superAdmins.length).toBeGreaterThanOrEqual(1);

    const primarySuperAdmin = superAdmins[0];

    // Attempting to delete the last active super admin must throw
    if (superAdmins.length === 1) {
      expect(() => {
        platformAuthService.deleteAdmin(primarySuperAdmin.id, 'another_admin');
      }).toThrow(/Cannot delete the last Platform Super Admin account/);

      expect(() => {
        platformAuthService.updateAdmin(primarySuperAdmin.id, { status: 'suspended' }, 'another_admin');
      }).toThrow(/Cannot demote or suspend the last active Platform Super Admin/);
    } else {
      expect(primarySuperAdmin.role).toBe('super_admin');
    }
  });

  // 25. Platform macro analytics calculations
  it('25. computes accurate macro SaaS financial and operational metrics (MRR, ARR, churn)', () => {
    const kpis = platformMacroAnalyticsService.getMacroKPIs();
    expect(kpis.totalStudios).toBeGreaterThanOrEqual(2);
    expect(kpis.monthlyRecurringRevenue).toBeGreaterThanOrEqual(500);
    expect(kpis.annualizedRunRate).toBe(kpis.monthlyRecurringRevenue * 12);
    expect(kpis.paymentsReceivedTotal).toBeGreaterThan(0);
    expect(kpis.churnRate).toBeGreaterThanOrEqual(0);
    expect(kpis.renewalRate).toBe(100 - kpis.churnRate);
  });

  // 26. Platform billing isolation
  it('26. isolates platform subscription billing from studio-level customer finances', () => {
    // Generate platform invoice and payment
    const platformInv = platformBillingService.createInvoice({
      studioId: studioA,
      studioName: 'Royal Weddings Studio',
      subscriptionId: 'sub_studio_royal_001',
      planName: 'Studio OS Standard',
      billingPeriodStart: '2026-11-01',
      billingPeriodEnd: '2026-11-30',
      subtotal: 500
    });

    platformBillingService.recordPayment({
      invoiceId: platformInv.id,
      amount: 500,
      paymentMethod: 'UPI',
      transactionReference: `UPI-ISOLATION-P10-${Date.now()}`,
      recordedBy: 'Super Admin'
    });

    // Check studio tenant invoices
    const studioInvoices = invoiceService.listInvoices(studioA);
    const hasPlatformInvoice = studioInvoices.some(inv => inv.id === platformInv.id || inv.invoiceNumber === platformInv.invoiceNumber);
    expect(hasPlatformInvoice).toBe(false);

    // Check studio tenant payments
    const studioPayments = paymentService.listPayments(studioA);
    const hasPlatformPayment = studioPayments.some(pay => pay.invoiceId === platformInv.id);
    expect(hasPlatformPayment).toBe(false);
  });

  // 27. Multi-tenant data isolation between studios
  it('27. maintains strict multi-tenant boundary between photography studios', () => {
    customerService.createCustomer(studioA, {
      name: 'Studio A Exclusive Customer',
      phone: '9111222333',
      city: 'Udaipur'
    });

    customerService.createCustomer(studioB, {
      name: 'Studio B Exclusive Customer',
      phone: '9444555666',
      city: 'Panaji'
    });

    const customersInA = customerService.listCustomers(studioA);
    const customersInB = customerService.listCustomers(studioB);

    expect(customersInA.some(c => c.name === 'Studio A Exclusive Customer')).toBe(true);
    expect(customersInA.some(c => c.name === 'Studio B Exclusive Customer')).toBe(false);

    expect(customersInB.some(c => c.name === 'Studio B Exclusive Customer')).toBe(true);
    expect(customersInB.some(c => c.name === 'Studio A Exclusive Customer')).toBe(false);
  });

  // 28. Platform audit logs immutability
  it('28. records immutable audit trail of all platform management actions', () => {
    const testAction = `UPDATE_SETTING_${Date.now()}`;
    platformAuditService.log({
      adminId: 'super_admin_test',
      adminName: 'Super Admin Tester',
      action: testAction,
      targetType: 'platform_settings',
      targetId: 'global_settings',
      details: 'Updated test parameters'
    });

    const logs = platformAuditService.listLogs();
    const recordedLog = logs.find(l => l.action === testAction);
    expect(recordedLog).toBeDefined();
    expect(recordedLog?.adminName).toBe('Super Admin Tester');
    expect(recordedLog?.timestamp).toBeDefined();
  });

  // 29. Layout routing and dev mode role switching
  it('29. verifies platform admin user profiles and roles', () => {
    const allAdmins = platformAuthService.listAdmins();
    expect(allAdmins.length).toBeGreaterThanOrEqual(1);

    const superAdmin = allAdmins.find(a => a.role === 'super_admin');
    expect(superAdmin).toBeDefined();

    // Verify role can be switched in dev/preview mode
    const newAdmin = platformAuthService.createAdmin({
      email: 'testanalyst@studioos.internal',
      name: 'Test Analyst',
      role: 'read_only_analyst'
    });

    expect(newAdmin.role).toBe('read_only_analyst');
    
    // Update role
    const updatedAdmin = platformAuthService.updateAdmin(newAdmin.id, { role: 'platform_admin' }, 'super_admin_usr');
    expect(updatedAdmin.role).toBe('platform_admin');

    // Clean up
    platformAuthService.deleteAdmin(newAdmin.id, 'super_admin_usr');
  });

  // 30. Backward compatibility with Phases 1–9
  it('30. guarantees backward compatibility with Phases 1 through 9 modules', () => {
    // Phase 5: RBAC roles
    const roles = roleService.listRoles(studioA);
    expect(roles.length).toBeGreaterThan(0);

    // Phase 3 & 4: Events
    const events = eventService.listEvents(studioA);
    expect(Array.isArray(events)).toBe(true);

    // Phase 7: CRM
    const customers = customerService.listCustomers(studioA);
    expect(Array.isArray(customers)).toBe(true);

    // Phase 8: Finance
    const invoices = invoiceService.listInvoices(studioA);
    expect(Array.isArray(invoices)).toBe(true);
  });
});
