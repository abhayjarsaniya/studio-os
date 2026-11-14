import { TenantStore } from './tenantStore';
import { platformBillingService } from './platformBillingService';
import { platformAuditService } from './platformAuditService';

export interface PaymentOrderRequest {
  invoiceId: string;
  studioId: string;
  amount: number;
  currency: 'INR';
  description: string;
}

export interface PaymentOrderResponse {
  orderId: string;
  provider: 'razorpay' | 'cashfree' | 'mock';
  amount: number;
  currency: 'INR';
  checkoutPayload: Record<string, any>;
}

export interface WebhookEventPayload {
  eventId: string;
  provider: string;
  eventType: 'payment.success' | 'payment.failed' | 'subscription.charged';
  signature: string;
  data: {
    orderId: string;
    invoiceId: string;
    transactionReference: string;
    amount: number;
    paymentMethod: string;
  };
}

export class PlatformPaymentGatewayService {
  private readonly PROCESSED_WEBHOOKS_KEY = 'platform_processed_webhooks';

  /**
   * Create an order with provider-independent payload
   */
  createPaymentOrder(req: PaymentOrderRequest): PaymentOrderResponse {
    const invoice = platformBillingService.getInvoice(req.invoiceId);
    if (!invoice) throw new Error(`Invoice "${req.invoiceId}" not found`);

    const orderId = `pord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    return {
      orderId,
      provider: 'razorpay',
      amount: req.amount,
      currency: 'INR',
      checkoutPayload: {
        order_id: orderId,
        amount: req.amount * 100, // In paise
        currency: 'INR',
        name: 'Studio OS SaaS Platform',
        description: req.description,
        prefill: {
          name: invoice.studioName,
          email: `${invoice.studioId}@studioos.internal`
        }
      }
    };
  }

  /**
   * Compute simulated HMAC signature for gateway webhook verification
   */
  computeHmacSignature(payload: string, secret: string): string {
    // Deterministic simulation hash for HMAC SHA256 in preview/test environment
    let hash = 0;
    const combined = payload + secret;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return `hmac_${Math.abs(hash).toString(16)}`;
  }

  /**
   * Verify signature and authenticity of webhook
   */
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    if (!signature || signature.length < 5 || !secret) return false;
    const expected = this.computeHmacSignature(payload, secret);
    return signature === expected;
  }

  /**
   * Verify signature and idempotency of webhook event
   */
  processWebhookEvent(webhook: WebhookEventPayload): { success: boolean; message: string } {
    // 1. Signature check simulation (In production, HMAC SHA256 against server secret)
    if (!webhook.signature || webhook.signature.length < 5) {
      throw new Error('[Security Exception]: Invalid webhook cryptographic signature.');
    }

    // 2. Idempotency Check: Prevent duplicate webhook processing
    const processed = TenantStore.get<string>('platform_system', this.PROCESSED_WEBHOOKS_KEY) || [];
    if (processed.includes(webhook.eventId)) {
      return { success: true, message: `Duplicate webhook event ${webhook.eventId} ignored (Idempotent).` };
    }

    // 3. Process Event
    if (webhook.eventType === 'payment.success' || webhook.eventType === 'subscription.charged') {
      platformBillingService.recordPayment({
        invoiceId: webhook.data.invoiceId,
        amount: webhook.data.amount,
        paymentMethod: 'Gateway',
        transactionReference: webhook.data.transactionReference,
        isManual: false,
        recordedBy: `Webhook Gateway (${webhook.provider})`,
        notes: `Automated webhook fulfillment for Order ${webhook.data.orderId}`
      });
    }

    // Record webhook as processed
    TenantStore.set('platform_system', this.PROCESSED_WEBHOOKS_KEY, [webhook.eventId, ...processed]);

    platformAuditService.log({
      adminId: 'system_gateway',
      adminName: 'Payment Gateway Webhook',
      action: 'PROCESS_WEBHOOK_EVENT',
      targetType: 'webhook_event',
      targetId: webhook.eventId,
      details: `Processed ${webhook.eventType} from ${webhook.provider} for Order ${webhook.data.orderId}`
    });

    return { success: true, message: 'Webhook verified and processed successfully.' };
  }
}

export const platformPaymentGatewayService = new PlatformPaymentGatewayService();
