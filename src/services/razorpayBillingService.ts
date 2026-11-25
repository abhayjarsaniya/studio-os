import { auth, db, isAuthBypassed } from '../lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where,
  orderBy
} from 'firebase/firestore';
import { platformAuditService } from './platformAuditService';

export type RazorpayEnvironment = 'test' | 'live';
export type BillingCycle = 'monthly' | 'quarterly' | 'yearly';
export type SubscriptionLifecycleStatus =
  | 'trial'
  | 'active'
  | 'payment_pending'
  | 'past_due'
  | 'grace_period'
  | 'payment_failed'
  | 'expired'
  | 'suspended'
  | 'cancelled';

export type MandateLifecycleStatus =
  | 'not_set_up'
  | 'authorization_pending'
  | 'authenticated'
  | 'active'
  | 'failed'
  | 'paused'
  | 'revoked'
  | 'cancelled'
  | 'completed'
  | 'expired';

export interface GatewayPublicConfig {
  success: boolean;
  gateway: 'razorpay';
  enabled: boolean;
  environment: RazorpayEnvironment;
  currency: 'INR';
  defaultPaymentMode: 'upi_autopay' | 'one_time';
  upiAutopayEnabled: boolean;
  oneTimeEnabled: boolean;
  maxAutopayRetries: number;
  gracePeriodDays: number;
  autoRetryEnabled: boolean;
  activeKeyId: string;
  isConfigured: boolean;
  admin?: {
    firebaseAdminReady: boolean;
    test: {
      keyId: string;
      keySecretMasked: string;
      webhookSecretMasked: string;
      hasKeySecret: boolean;
      hasWebhookSecret: boolean;
      source: string;
    };
    live: {
      keyId: string;
      keySecretMasked: string;
      webhookSecretMasked: string;
      hasKeySecret: boolean;
      hasWebhookSecret: boolean;
      source: string;
    };
    lastConnectionTestAt: string | null;
    lastConnectionStatus: string;
    lastConnectionError: string | null;
    lastWebhookReceivedAt: string | null;
    lastWebhookEvent: string | null;
    updatedAt: string | null;
    updatedBy: string | null;
  };
}

export interface BillingPlanRecord {
  id: string;
  name: string;
  description?: string;
  priceMonthly: number;
  priceQuarterly: number;
  priceYearly: number;
  setupFee: number;
  trialDays: number;
  gracePeriodDays: number;
  renewalPolicy: 'auto_renew' | 'manual_or_autopay' | 'fixed_term';
  features: string[];
  employeeLimit: number;
  branchLimit: number;
  storageGb: number;
  isActive: boolean;
  razorpayTestPlanIds?: Partial<Record<BillingCycle, string>>;
  razorpayLivePlanIds?: Partial<Record<BillingCycle, string>>;
  updatedAt?: string;
}

export interface StudioBillingRecord {
  studioId: string;
  studioName?: string;
  planId: string;
  planName: string;
  billingCycle: BillingCycle;
  amountInr: number;
  currency: 'INR';
  status: SubscriptionLifecycleStatus;
  paymentStatus: string;
  mandateStatus: MandateLifecycleStatus;
  paymentMode: 'upi_autopay' | 'one_time' | 'manual';
  environment?: RazorpayEnvironment;
  razorpayPlanId?: string | null;
  razorpaySubscriptionId?: string | null;
  razorpayPaymentId?: string | null;
  razorpayOrderId?: string | null;
  upiVpa?: string | null;
  paymentMethodDetail?: string | null;
  startDate?: string | null;
  currentPeriodStart?: string | null;
  expiryDate?: string | null;
  nextRenewalDate?: string | null;
  gracePeriodEndsAt?: string | null;
  autoRenew: boolean;
  lastPaymentError?: string | null;
  updatedAt?: string;
}

export interface PlatformTransactionRecord {
  id: string;
  studioId: string;
  studioName?: string;
  planId?: string;
  planName?: string;
  billingCycle?: BillingCycle;
  amountInr: number;
  amountPaise?: number;
  currency: 'INR';
  paymentType?: 'upi_autopay' | 'one_time' | 'manual';
  method?: string;
  upiVpa?: string | null;
  status:
    | 'created'
    | 'pending'
    | 'authorized'
    | 'captured'
    | 'failed'
    | 'refunded'
    | 'partially_refunded'
    | 'cancelled';
  environment?: RazorpayEnvironment;
  razorpayPaymentId?: string | null;
  razorpayOrderId?: string | null;
  razorpaySubscriptionId?: string | null;
  razorpayRefundId?: string | null;
  refundedAmountInr?: number;
  refundReason?: string | null;
  failureReason?: string | null;
  failureCode?: string | null;
  invoiceNumber?: string | null;
  paidAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export function computeDaysRemaining(expiryIso?: string | null): number {
  if (!expiryIso) return 0;
  const target = new Date(expiryIso).getTime();
  if (!Number.isFinite(target)) return 0;
  const diffMs = target - Date.now();
  return Math.max(0, Math.ceil(diffMs / 86400000));
}

export function formatRemainingLabel(expiryIso?: string | null): string {
  if (!expiryIso) return 'Not scheduled';
  const target = new Date(expiryIso).getTime();
  if (!Number.isFinite(target)) return 'Not scheduled';
  const diffDays = Math.ceil((target - Date.now()) / 86400000);
  if (diffDays <= 0) return 'Expired';
  if (diffDays === 1) return '1 Day Remaining';
  return `${diffDays} Days Remaining`;
}

export class RazorpayBillingService {
  private readonly checkoutSrc = 'https://checkout.razorpay.com/v1/checkout.js';
  private scriptPromise: Promise<boolean> | null = null;

  private async getBearerToken(): Promise<string | null> {
    if (!auth || isAuthBypassed) return null;
    try {
      const user = auth.currentUser;
      if (!user) return null;
      return await user.getIdToken();
    } catch {
      return null;
    }
  }

  private async apiRequest<T = any>(
    url: string,
    options: { method?: 'GET' | 'POST'; body?: Record<string, any> } = {}
  ): Promise<T> {
    const token = await this.getBearerToken();
    if (!token) {
      throw new Error('Firebase authenticated session token required. Please sign in again.');
    }

    const resp = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      throw new Error(data?.error || `Request failed (${resp.status})`);
    }
    return data as T;
  }

  async loadCheckoutScript(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    if ((window as any).Razorpay) return true;
    if (this.scriptPromise) return this.scriptPromise;

    this.scriptPromise = new Promise<boolean>((resolve) => {
      const existing = document.querySelector(`script[src="${this.checkoutSrc}"]`);
      if (existing) {
        existing.addEventListener('load', () => resolve(Boolean((window as any).Razorpay)), { once: true });
        existing.addEventListener('error', () => resolve(false), { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = this.checkoutSrc;
      script.async = true;
      script.onload = () => resolve(Boolean((window as any).Razorpay));
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });

    return this.scriptPromise;
  }

  // ------------------------------------------------------------------
  // Gateway Configuration & Health (Master Admin + Public Status)
  // ------------------------------------------------------------------
  async fetchGatewayConfig(): Promise<GatewayPublicConfig> {
    try {
      return await this.apiRequest<GatewayPublicConfig>('/api/razorpay/config', { method: 'GET' });
    } catch (err) {
      // Fallback to public non-secret Firestore settings doc when offline or local dev
      if (db && !isAuthBypassed) {
        const snap = await getDoc(doc(db, 'platformPaymentSettings', 'razorpay'));
        if (snap.exists()) {
          const d = snap.data() as any;
          const env: RazorpayEnvironment = d.environment === 'live' ? 'live' : 'test';
          return {
            success: true,
            gateway: 'razorpay',
            enabled: Boolean(d.enabled),
            environment: env,
            currency: 'INR',
            defaultPaymentMode: d.defaultPaymentMode || 'upi_autopay',
            upiAutopayEnabled: d.upiAutopayEnabled !== false,
            oneTimeEnabled: d.oneTimeEnabled !== false,
            maxAutopayRetries: Number(d.maxAutopayRetries ?? 3),
            gracePeriodDays: Number(d.gracePeriodDays ?? 7),
            autoRetryEnabled: d.autoRetryEnabled !== false,
            activeKeyId: (env === 'live' ? d.liveKeyId : d.testKeyId) || '',
            isConfigured: Boolean(env === 'live' ? d.liveConfigured : d.testConfigured)
          };
        }
      }
      throw err;
    }
  }

  async saveGatewayCredentials(payload: {
    environment: RazorpayEnvironment;
    activateEnvironment?: RazorpayEnvironment;
    keyId: string;
    keySecret?: string;
    webhookSecret?: string;
    enabled?: boolean;
    defaultPaymentMode?: 'upi_autopay' | 'one_time';
    upiAutopayEnabled?: boolean;
    oneTimeEnabled?: boolean;
    maxAutopayRetries?: number;
    gracePeriodDays?: number;
    autoRetryEnabled?: boolean;
  }): Promise<any> {
    return this.apiRequest('/api/razorpay/config', {
      method: 'POST',
      body: { action: 'save_credentials', ...payload }
    });
  }

  async testGatewayConnection(payload: {
    environment: RazorpayEnvironment;
    keyId?: string;
    keySecret?: string;
  }): Promise<any> {
    return this.apiRequest('/api/razorpay/config', {
      method: 'POST',
      body: { action: 'test_connection', ...payload }
    });
  }

  async activateLiveGateway(): Promise<any> {
    return this.apiRequest('/api/razorpay/config', {
      method: 'POST',
      body: { action: 'activate_live' }
    });
  }

  async disableGateway(): Promise<any> {
    return this.apiRequest('/api/razorpay/config', {
      method: 'POST',
      body: { action: 'disable' }
    });
  }

  // ------------------------------------------------------------------
  // Plans Sync (Master Admin -> Razorpay /v1/plans)
  // ------------------------------------------------------------------
  async syncPlanToRazorpay(payload: {
    planId: string;
    planName: string;
    cycle: BillingCycle;
    amountInr: number;
    description?: string;
    environment?: RazorpayEnvironment;
  }): Promise<{ success: boolean; razorpayPlanId: string; environment: RazorpayEnvironment }> {
    return this.apiRequest('/api/razorpay/plans', {
      method: 'POST',
      body: payload
    });
  }

  // ------------------------------------------------------------------
  // Checkout & Signature Verification (UPI AutoPay + One-Time)
  // ------------------------------------------------------------------
  async launchCheckout(params: {
    studioId: string;
    studioName: string;
    planId: string;
    planName: string;
    cycle: BillingCycle;
    paymentType: 'upi_autopay' | 'one_time';
    amountInr: number;
    setupFeeInr?: number;
    ownerName?: string;
    ownerEmail?: string;
    ownerPhone?: string;
  }): Promise<{
    verified: boolean;
    paymentId: string;
    subscriptionId?: string | null;
    orderId?: string | null;
    invoiceNumber?: string;
    amountInr: number;
  }> {
    const loaded = await this.loadCheckoutScript();
    if (!loaded || !(window as any).Razorpay) {
      throw new Error('Failed to load official Razorpay Checkout script (checkout.razorpay.com).');
    }

    const session = await this.apiRequest<any>('/api/razorpay/subscriptions', {
      method: 'POST',
      body: {
        action: 'create_checkout',
        studioId: params.studioId,
        studioName: params.studioName,
        planId: params.planId,
        planName: params.planName,
        cycle: params.cycle,
        paymentType: params.paymentType,
        amountInr: params.amountInr,
        setupFeeInr: params.setupFeeInr || 0,
        ownerEmail: params.ownerEmail,
        ownerPhone: params.ownerPhone
      }
    });

    if (!session?.success || !session?.keyId) {
      throw new Error(session?.error || 'Failed to initiate Razorpay Checkout.');
    }

    return new Promise((resolve, reject) => {
      const rzpOptions: Record<string, any> = {
        key: session.keyId,
        name: 'Studio OS',
        description:
          session.mode === 'subscription'
            ? `${params.planName} (${params.cycle}) — UPI AutoPay Recurring`
            : `${params.planName} (${params.cycle}) — One-Time Payment`,
        prefill: {
          name: params.ownerName || params.studioName,
          email: params.ownerEmail || '',
          contact: params.ownerPhone || ''
        },
        theme: { color: '#f97316' },
        notes: {
          studioId: params.studioId,
          planId: params.planId,
          cycle: params.cycle
        },
        modal: {
          ondismiss: () => reject(new Error('Payment checkout was closed before completion.'))
        },
        handler: async (response: any) => {
          try {
            const verifyRes = await this.apiRequest<any>('/api/razorpay/subscriptions', {
              method: 'POST',
              body: {
                action: 'verify_checkout',
                studioId: params.studioId,
                planId: params.planId,
                planName: params.planName,
                cycle: params.cycle,
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id,
                subscriptionId: response.razorpay_subscription_id || session.subscriptionId,
                signature: response.razorpay_signature
              }
            });
            resolve(verifyRes);
          } catch (err) {
            reject(err);
          }
        }
      };

      if (session.mode === 'subscription') {
        rzpOptions.subscription_id = session.subscriptionId;
      } else {
        rzpOptions.order_id = session.orderId;
        rzpOptions.amount = session.amountPaise;
        rzpOptions.currency = 'INR';
      }

      const rzp = new (window as any).Razorpay(rzpOptions);
      rzp.on('payment.failed', (failResp: any) => {
        reject(new Error(failResp?.error?.description || 'Razorpay payment failed.'));
      });
      rzp.open();
    });
  }

  // ------------------------------------------------------------------
  // Master Admin Server-Verified Subscription Actions
  // ------------------------------------------------------------------
  async adminCancelSubscription(params: {
    studioId: string;
    subscriptionId?: string | null;
    cancelAtCycleEnd?: boolean;
    reason?: string;
    adminEmail?: string;
  }): Promise<any> {
    const res = await this.apiRequest('/api/razorpay/subscriptions', {
      method: 'POST',
      body: { action: 'admin_cancel', ...params }
    });
    platformAuditService.log({
      adminId: 'master_admin',
      adminName: params.adminEmail || 'Master Admin',
      action: 'CANCEL_SUBSCRIPTION',
      targetType: 'subscription',
      targetId: params.studioId,
      details: `Cancelled subscription for ${params.studioId}. Reason: ${params.reason || 'Admin action'}`
    });
    return res;
  }

  async adminPauseOrResumeMandate(params: {
    studioId: string;
    subscriptionId: string;
    mode: 'pause' | 'resume';
  }): Promise<any> {
    return this.apiRequest('/api/razorpay/subscriptions', {
      method: 'POST',
      body: {
        action: params.mode === 'pause' ? 'admin_pause' : 'admin_resume',
        studioId: params.studioId,
        subscriptionId: params.subscriptionId
      }
    });
  }

  async adminIssueRefund(params: {
    paymentId: string;
    amountInr?: number;
    reason: string;
    adminEmail?: string;
  }): Promise<any> {
    const res = await this.apiRequest('/api/razorpay/subscriptions', {
      method: 'POST',
      body: { action: 'admin_refund', ...params }
    });
    platformAuditService.log({
      adminId: 'master_admin',
      adminName: params.adminEmail || 'Master Admin',
      action: 'ISSUE_RAZORPAY_REFUND',
      targetType: 'transaction',
      targetId: params.paymentId,
      details: `Issued refund for payment ${params.paymentId}${params.amountInr ? ` (₹${params.amountInr})` : ' (Full)'}: ${params.reason}`
    });
    return res;
  }

  // ------------------------------------------------------------------
  // Master Admin Firestore Governance (Extend Days, Adjust Dates, Assign)
  // ------------------------------------------------------------------
  async adminUpdateSubscriptionRecord(
    studioId: string,
    patch: Partial<StudioBillingRecord>,
    auditDescription: string,
    adminName = 'Master Admin'
  ): Promise<void> {
    if (!db || isAuthBypassed) return;
    const now = new Date().toISOString();
    const payload = { ...patch, studioId, updatedAt: now };

    await Promise.all([
      setDoc(doc(db, 'platformSubscriptions', studioId), payload, { merge: true }),
      setDoc(doc(db, 'studios', studioId, 'billing', 'current'), payload, { merge: true }),
      ...(patch.status
        ? [setDoc(doc(db, 'studios', studioId), { subscriptionStatus: patch.status, updatedAt: now }, { merge: true })]
        : [])
    ]);

    await setDoc(
      doc(db, 'studios', studioId, 'subscriptionHistory', `adm_${Date.now()}`),
      {
        eventType: 'MASTER_ADMIN_UPDATE',
        details: auditDescription,
        actor: adminName,
        patchSummary: {
          status: patch.status || null,
          planName: patch.planName || null,
          expiryDate: patch.expiryDate || null,
          nextRenewalDate: patch.nextRenewalDate || null
        },
        timestamp: now
      },
      { merge: true }
    );

    platformAuditService.log({
      adminId: 'master_admin',
      adminName,
      action: 'MASTER_ADMIN_SUBSCRIPTION_UPDATE',
      targetType: 'subscription',
      targetId: studioId,
      details: auditDescription
    });
  }

  // ------------------------------------------------------------------
  // Real-time Firestore Subscriptions & Queries
  // ------------------------------------------------------------------
  subscribeAllSubscriptions(cb: (records: StudioBillingRecord[]) => void): () => void {
    if (!db || isAuthBypassed) {
      cb([]);
      return () => {};
    }
    return onSnapshot(
      collection(db, 'platformSubscriptions'),
      (snap) => {
        cb(snap.docs.map((d) => ({ ...(d.data() as any), studioId: d.id })));
      },
      () => cb([])
    );
  }

  subscribeAllTransactions(cb: (records: PlatformTransactionRecord[]) => void): () => void {
    if (!db || isAuthBypassed) {
      cb([]);
      return () => {};
    }
    return onSnapshot(
      collection(db, 'platformTransactions'),
      (snap) => {
        const list = snap.docs.map((d) => ({ ...(d.data() as any), id: d.id }));
        list.sort((a, b) => (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || ''));
        cb(list);
      },
      () => cb([])
    );
  }

  subscribeStudioBilling(studioId: string, cb: (record: StudioBillingRecord | null) => void): () => void {
    if (!db || isAuthBypassed || !studioId) {
      cb(null);
      return () => {};
    }
    return onSnapshot(
      doc(db, 'studios', studioId, 'billing', 'current'),
      async (snap) => {
        if (snap.exists()) {
          cb({ ...(snap.data() as any), studioId });
          return;
        }
        try {
          const fallback = await getDoc(doc(db, 'platformSubscriptions', studioId));
          cb(fallback.exists() ? { ...(fallback.data() as any), studioId } : null);
        } catch {
          cb(null);
        }
      },
      () => cb(null)
    );
  }

  subscribeStudioTransactions(studioId: string, cb: (records: PlatformTransactionRecord[]) => void): () => void {
    if (!db || isAuthBypassed || !studioId) {
      cb([]);
      return () => {};
    }
    const q = query(collection(db, 'platformTransactions'), where('studioId', '==', studioId));
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ ...(d.data() as any), id: d.id }));
        list.sort((a, b) => (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || ''));
        cb(list);
      },
      () => cb([])
    );
  }

  subscribeStudioHistory(studioId: string, cb: (items: any[]) => void): () => void {
    if (!db || isAuthBypassed || !studioId) {
      cb([]);
      return () => {};
    }
    return onSnapshot(
      collection(db, 'studios', studioId, 'subscriptionHistory'),
      (snap) => {
        const list = snap.docs.map((d) => ({ ...(d.data() as any), id: d.id }));
        list.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
        cb(list);
      },
      () => cb([])
    );
  }

  async listFirestorePlans(): Promise<BillingPlanRecord[]> {
    if (!db || isAuthBypassed) return [];
    const snap = await getDocs(collection(db, 'billingPlans'));
    return snap.docs.map((d) => ({ ...(d.data() as any), id: d.id }));
  }

  async saveFirestorePlan(plan: BillingPlanRecord): Promise<void> {
    if (!db || isAuthBypassed) return;
    await setDoc(doc(db, 'billingPlans', plan.id), { ...plan, updatedAt: new Date().toISOString() }, { merge: true });
  }
}

export const razorpayBillingService = new RazorpayBillingService();
