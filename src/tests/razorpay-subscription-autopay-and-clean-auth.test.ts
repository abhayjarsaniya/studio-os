import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeEach } from 'vitest';

if (typeof (globalThis as any).localStorage === 'undefined') {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, val: string) => { store.set(key, String(val)); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
    key: (idx: number) => Array.from(store.keys())[idx] ?? null,
    get length() { return store.size; }
  };
}

import {
  encryptSecret,
  decryptSecret,
  maskSecret,
  isMaskedPlaceholder,
  verifyRazorpayWebhookSignature,
  verifyRazorpayCheckoutSignature,
  computeNextExpiryIso
} from '../../api/_lib/razorpayServer';
import subscriptionsHandler from '../../api/razorpay/subscriptions';
import plansHandler from '../../api/razorpay/plans';
import webhookHandler from '../../api/razorpay/webhook';
import { firebaseAuthService } from '../services/firebaseAuthService';
import { platformPlanService } from '../services/platformPlanService';
import { platformSubscriptionManager } from '../services/platformSubscriptionManager';
import { subscriptionAccessGuard } from '../services/subscriptionAccessGuard';
import { computeDaysRemaining, formatRemainingLabel } from '../services/razorpayBillingService';

function createMockRes() {
  const res: any = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: null as any,
    setHeader(k: string, v: string) {
      this.headers[k] = v;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.body = payload;
      return this;
    }
  };
  return res;
}

describe('Studio OS — Clean Auth Removal + Razorpay AutoPay Production Suite', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('1. Authorized Studio Emails module & obsolete auth flows are permanently removed from codebase and rules', () => {
    const root = path.resolve(__dirname, '../..');
    expect(fs.existsSync(path.join(root, 'src/pages/master/MasterAuthorizedEmailsPage.tsx'))).toBe(false);
    expect(fs.existsSync(path.join(root, 'src/pages/auth/StudioRegistrationPage.tsx'))).toBe(false);
    expect(fs.existsSync(path.join(root, 'src/services/googleAuthInvitationService.ts'))).toBe(false);

    const sidebar = fs.readFileSync(path.join(root, 'src/components/master/MasterSidebar.tsx'), 'utf8');
    expect(sidebar).not.toContain('authorized-emails');
    expect(sidebar).not.toContain('Authorized Studio Emails');

    const rules = fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8');
    expect(rules).not.toContain('authorizedStudioEmails');
    expect(rules).not.toContain('studioInvitations');
    expect(rules).toContain('platformPaymentSecrets');
    expect(rules).toContain('paymentWebhookEvents');
  });

  it('2. Master Admin Google Sign-In strictly permits jarsaniya.abhay@gmail.com and rejects everyone else', async () => {
    const allowed = await firebaseAuthService.loginMasterAdminWithGoogle({
      uid: 'uid_master_abhay',
      email: 'jarsaniya.abhay@gmail.com',
      displayName: 'Abhay Jarsaniya'
    });
    expect(allowed.success).toBe(true);
    expect(allowed.role).toBe('platform_master_admin');

    const denied = await firebaseAuthService.loginMasterAdminWithGoogle({
      uid: 'uid_owner_other',
      email: 'random.studio@gmail.com',
      displayName: 'Studio Owner'
    });
    expect(denied.success).toBe(false);
    expect(denied.error).toContain('exclusively reserved for Platform Master Admin');
  });

  it('3. Server secret encryption, masking, and placeholder detection never leak plaintext secrets', () => {
    const secret = 'rzp_live_secret_9876543210abcdef';
    const encrypted = encryptSecret(secret);
    expect(encrypted).not.toContain(secret);
    expect(decryptSecret(encrypted)).toBe(secret);

    const masked = maskSecret(secret);
    expect(masked).toContain('••••');
    expect(masked.endsWith('cdef')).toBe(true);
    expect(isMaskedPlaceholder(masked)).toBe(true);
    expect(isMaskedPlaceholder('')).toBe(true);
    expect(isMaskedPlaceholder(secret)).toBe(false);
  });

  it('4. Cryptographic HMAC-SHA256 verifies Razorpay Webhook & Checkout signatures accurately', () => {
    const webhookSecret = 'whsec_studio_os_prod_key_2026';
    const rawPayload = JSON.stringify({
      event: 'subscription.charged',
      payload: { subscription: { entity: { id: 'sub_test123' } } }
    });
    const validWebhookSig = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawPayload)
      .digest('hex');

    expect(verifyRazorpayWebhookSignature(rawPayload, validWebhookSig, webhookSecret)).toBe(true);
    expect(verifyRazorpayWebhookSignature(rawPayload + ' ', validWebhookSig, webhookSecret)).toBe(false);
    expect(verifyRazorpayWebhookSignature(rawPayload, 'forged_sig', webhookSecret)).toBe(false);

    const keySecret = 'key_secret_test_12345';
    const paymentId = 'pay_AbC123';
    const subId = 'sub_XyZ789';
    const orderId = 'order_Ord456';

    const subSig = crypto
      .createHmac('sha256', keySecret)
      .update(`${paymentId}|${subId}`)
      .digest('hex');
    expect(
      verifyRazorpayCheckoutSignature({ paymentId, subscriptionId: subId, signature: subSig, keySecret })
    ).toBe(true);
    expect(
      verifyRazorpayCheckoutSignature({ paymentId, subscriptionId: 'sub_TAMPERED', signature: subSig, keySecret })
    ).toBe(false);

    const orderSig = crypto
      .createHmac('sha256', keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
    expect(
      verifyRazorpayCheckoutSignature({ orderId, paymentId, signature: orderSig, keySecret })
    ).toBe(true);
  });

  it('5. Vercel Razorpay Webhook handler rejects missing/invalid signature with 401 and accepts valid HMAC signature', async () => {
    process.env.RAZORPAY_TEST_WEBHOOK_SECRET = 'test_whsec_998877';

    const badReq: any = {
      method: 'POST',
      headers: { 'x-razorpay-signature': 'invalid_hmac' },
      body: JSON.stringify({ event: 'payment.captured' })
    };
    const badRes = createMockRes();
    await webhookHandler(badReq, badRes);
    expect(badRes.statusCode).toBe(401);

    const payload = JSON.stringify({
      event: 'subscription.activated',
      payload: {
        subscription: { entity: { id: 'sub_test_ok', notes: { studioId: 'std_1' } } }
      }
    });
    const goodSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_TEST_WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');

    const goodReq: any = {
      method: 'POST',
      headers: {
        'x-razorpay-signature': goodSig,
        'x-razorpay-event-id': 'evt_unique_001'
      },
      body: payload
    };
    const goodRes = createMockRes();
    await webhookHandler(goodReq, goodRes);
    expect(goodRes.statusCode).toBe(200);
    expect(goodRes.body?.verified).toBe(true);
    expect(goodRes.body?.environment).toBe('test');
  });

  it('6. Server endpoints block unauthenticated callers cleanly (401/403)', async () => {
    const planReq: any = { method: 'POST', headers: {}, body: { planId: 'p1', planName: 'Test', amountInr: 500 } };
    const planRes = createMockRes();
    await plansHandler(planReq, planRes);
    expect(planRes.statusCode).toBe(403);

    const subReq: any = {
      method: 'POST',
      headers: {},
      body: { action: 'admin_cancel', studioId: 'std_1' }
    };
    const subRes = createMockRes();
    await subscriptionsHandler(subReq, subRes);
    expect(subRes.statusCode).toBe(401);
  });

  it('7. Plan pricing protection preserves agreed amounts for existing subscribers when plan pricing increases', () => {
    const stdPlan = platformPlanService.getStandardPlan();
    const studioId = `std_price_protect_${Date.now()}`;
    platformSubscriptionManager.createSubscription({
      studioId,
      studioName: 'Price Protected Studio',
      planId: stdPlan.id,
      billingCycle: 'monthly',
      isTrial: false
    });

    platformPlanService.updatePlan(stdPlan.id, { priceMonthly: 799, priceQuarterly: 2150 }, 'Master Admin');

    const sub = platformSubscriptionManager.getSubscription(studioId);
    expect(sub?.agreedPrice).toBe(500);

    // Restore baseline price cleanly
    platformPlanService.updatePlan(stdPlan.id, { priceMonthly: 500 }, 'Master Admin');
  });

  it('8. Remaining days countdown & cycle expiry calculations handle monthly, quarterly, yearly accurately', () => {
    const plus10Days = new Date(Date.now() + 10 * 86400000).toISOString();
    expect(computeDaysRemaining(plus10Days)).toBeGreaterThanOrEqual(9);
    expect(formatRemainingLabel(plus10Days)).toContain('Days Remaining');

    const pastDate = new Date(Date.now() - 2 * 86400000).toISOString();
    expect(computeDaysRemaining(pastDate)).toBe(0);
    expect(formatRemainingLabel(pastDate)).toBe('Expired');

    const base = '2026-01-01T00:00:00.000Z';
    expect(computeNextExpiryIso(base, 'monthly').slice(0, 10)).toBe('2026-02-01');
    expect(computeNextExpiryIso(base, 'quarterly').slice(0, 10)).toBe('2026-04-01');
    expect(computeNextExpiryIso(base, 'yearly').slice(0, 10)).toBe('2027-01-01');
  });

  it('9. Studio Owner UI exposes NO Cancel Subscription controls and access guard routes restricted studios to billing', () => {
    const root = path.resolve(__dirname, '../..');
    const studioBillingUi = fs.readFileSync(
      path.join(root, 'src/components/settings/StudioSubscriptionBillingTab.tsx'),
      'utf8'
    );
    expect(studioBillingUi).not.toContain('Cancel Subscription');
    expect(studioBillingUi).not.toContain('adminCancelSubscription');

    const studioId = `std_guard_${Date.now()}`;
    platformSubscriptionManager.createSubscription({
      studioId,
      studioName: 'Guard Test Studio',
      planId: 'plan_standard_500',
      billingCycle: 'monthly',
      isTrial: false
    });
    platformSubscriptionManager.transitionStatus(studioId, 'suspended', 'Unpaid renewal', 'Master Admin');

    const eventsCheck = subscriptionAccessGuard.checkStudioAccess(studioId, '/app/events');
    expect(eventsCheck.isAllowed).toBe(false);
    expect(eventsCheck.redirectRoute).toBe('/app/billing');

    const billingCheck = subscriptionAccessGuard.checkStudioAccess(studioId, '/app/billing');
    expect(billingCheck.isAllowed).toBe(true);
  });
});
