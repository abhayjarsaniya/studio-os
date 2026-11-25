import {
  getFirebaseAdmin,
  resolveCredentials,
  verifyRazorpayWebhookSignature,
  computeNextExpiryIso,
  readRawRequestBody
} from '../_lib/razorpayServer';

// Disable Next/Vercel default body parsing so we can verify raw webhook payload bytes
export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let rawBuffer: Buffer;
  try {
    rawBuffer = await readRawRequestBody(req);
  } catch {
    return res.status(400).json({ error: 'Unable to read raw request body.' });
  }

  const signature = req.headers['x-razorpay-signature'] as string | undefined;
  const eventIdHeader = (req.headers['x-razorpay-event-id'] as string | undefined) || '';

  const [testCreds, liveCreds] = await Promise.all([
    resolveCredentials('test'),
    resolveCredentials('live')
  ]);

  let matchedEnv: 'test' | 'live' | null = null;
  if (liveCreds.webhookSecret && verifyRazorpayWebhookSignature(rawBuffer, signature, liveCreds.webhookSecret)) {
    matchedEnv = 'live';
  } else if (testCreds.webhookSecret && verifyRazorpayWebhookSignature(rawBuffer, signature, testCreds.webhookSecret)) {
    matchedEnv = 'test';
  }

  if (!matchedEnv) {
    return res.status(401).json({ error: 'Invalid Razorpay webhook signature.' });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBuffer.toString('utf8'));
  } catch {
    return res.status(400).json({ error: 'Malformed JSON payload.' });
  }

  const eventName = String(payload.event || '');
  const subEntity = payload?.payload?.subscription?.entity || null;
  const pmtEntity = payload?.payload?.payment?.entity || null;
  const refundEntity = payload?.payload?.refund?.entity || null;
  const now = new Date().toISOString();

  const dedupeKey =
    eventIdHeader ||
    `${eventName}_${pmtEntity?.id || subEntity?.id || refundEntity?.id || payload.created_at || Date.now()}`;

  const adminCtx = getFirebaseAdmin();
  if (!adminCtx) {
    return res.status(200).json({
      received: true,
      verified: true,
      environment: matchedEnv,
      event: eventName,
      note: 'Signature verified cleanly; Firestore Admin persistence inactive.'
    });
  }

  // Idempotency guard: prevent duplicate billing updates on Razorpay retries
  const webhookRef = adminCtx.db.collection('paymentWebhookEvents').doc(dedupeKey);
  const existingEvent = await webhookRef.get();
  if (existingEvent.exists && existingEvent.data()?.processed === true) {
    return res.status(200).json({ received: true, duplicate: true, eventId: dedupeKey });
  }

  const notes = pmtEntity?.notes || subEntity?.notes || refundEntity?.notes || {};
  let studioId = String(notes.studioId || '');

  // Resolve studioId from stored subscription if notes omitted
  if (!studioId && subEntity?.id) {
    const qSnap = await adminCtx.db
      .collection('platformSubscriptions')
      .where('razorpaySubscriptionId', '==', subEntity.id)
      .limit(1)
      .get();
    if (!qSnap.empty) {
      studioId = qSnap.docs[0].id;
    }
  }

  await webhookRef.set(
    {
      id: dedupeKey,
      event: eventName,
      environment: matchedEnv,
      studioId: studioId || null,
      razorpaySubscriptionId: subEntity?.id || null,
      razorpayPaymentId: pmtEntity?.id || null,
      razorpayRefundId: refundEntity?.id || null,
      receivedAt: now,
      processed: true
    },
    { merge: true }
  );

  await adminCtx.db.collection('platformPaymentSettings').doc('razorpay').set(
    {
      lastWebhookReceivedAt: now,
      lastWebhookEvent: eventName,
      lastWebhookEnvironment: matchedEnv
    },
    { merge: true }
  );

  // Update Transaction & Subscription records based on authoritative event
  if (pmtEntity?.id) {
    const txId = `pay_${pmtEntity.id}`;
    const mappedStatus =
      eventName === 'payment.failed'
        ? 'failed'
        : pmtEntity.status === 'captured'
          ? 'captured'
          : pmtEntity.status === 'authorized'
            ? 'authorized'
            : pmtEntity.status || 'pending';

    await adminCtx.db.collection('platformTransactions').doc(txId).set(
      {
        id: txId,
        studioId: studioId || null,
        planId: notes.planId || null,
        planName: notes.planName || null,
        billingCycle: notes.cycle || null,
        amountInr: Number(pmtEntity.amount || 0) / 100,
        amountPaise: Number(pmtEntity.amount || 0),
        currency: pmtEntity.currency || 'INR',
        method: pmtEntity.method || 'upi',
        upiVpa: pmtEntity.vpa || null,
        paymentType: subEntity?.id ? 'upi_autopay' : (notes.paymentType || 'one_time'),
        status: mappedStatus,
        environment: matchedEnv,
        razorpayPaymentId: pmtEntity.id,
        razorpayOrderId: pmtEntity.order_id || null,
        razorpaySubscriptionId: subEntity?.id || pmtEntity.subscription_id || null,
        failureReason: pmtEntity.error_description || pmtEntity.error_reason || null,
        failureCode: pmtEntity.error_code || null,
        webhookVerified: true,
        updatedAt: now
      },
      { merge: true }
    );
  }

  if (refundEntity?.id && refundEntity?.payment_id) {
    const txRef = adminCtx.db.collection('platformTransactions').doc(`pay_${refundEntity.payment_id}`);
    const txSnap = await txRef.get();
    const originalPaise = txSnap.exists ? Number(txSnap.data()?.amountPaise || 0) : 0;
    const refundedPaise = Number(refundEntity.amount || 0);
    const refundStatus =
      originalPaise > 0 && refundedPaise < originalPaise ? 'partially_refunded' : 'refunded';

    await txRef.set(
      {
        status: refundStatus,
        razorpayRefundId: refundEntity.id,
        refundedAmountInr: refundedPaise / 100,
        updatedAt: now
      },
      { merge: true }
    );
  }

  if (studioId) {
    const cycleKey = (notes.cycle === 'yearly' ? 'yearly' : notes.cycle === 'quarterly' ? 'quarterly' : 'monthly') as
      | 'monthly'
      | 'quarterly'
      | 'yearly';

    const subPatch: Record<string, any> = {
      studioId,
      environment: matchedEnv,
      updatedAt: now
    };

    if (eventName === 'subscription.authenticated') {
      subPatch.mandateStatus = 'authenticated';
    } else if (eventName === 'subscription.activated' || eventName === 'subscription.charged') {
      subPatch.status = 'active';
      subPatch.mandateStatus = 'active';
      subPatch.paymentStatus = 'captured';
      subPatch.autoRenew = true;
      subPatch.currentPeriodStart = subEntity?.current_start
        ? new Date(subEntity.current_start * 1000).toISOString()
        : now;
      subPatch.expiryDate = subEntity?.current_end
        ? new Date(subEntity.current_end * 1000).toISOString()
        : computeNextExpiryIso(now, cycleKey);
      subPatch.nextRenewalDate = subEntity?.charge_at
        ? new Date(subEntity.charge_at * 1000).toISOString()
        : subPatch.expiryDate;
      if (pmtEntity?.amount) {
        subPatch.amountInr = Number(pmtEntity.amount) / 100;
      }
      if (subEntity?.id) subPatch.razorpaySubscriptionId = subEntity.id;
      if (pmtEntity?.id) subPatch.razorpayPaymentId = pmtEntity.id;
    } else if (eventName === 'subscription.pending' || eventName === 'subscription.halted') {
      subPatch.status = eventName === 'subscription.halted' ? 'payment_failed' : 'grace_period';
      subPatch.mandateStatus = 'failed';
      subPatch.paymentStatus = 'failed';
    } else if (eventName === 'subscription.paused') {
      subPatch.mandateStatus = 'paused';
    } else if (eventName === 'subscription.resumed') {
      subPatch.mandateStatus = 'active';
      subPatch.status = 'active';
    } else if (eventName === 'subscription.cancelled') {
      subPatch.status = 'cancelled';
      subPatch.mandateStatus = 'cancelled';
      subPatch.autoRenew = false;
    } else if (eventName === 'subscription.completed') {
      subPatch.mandateStatus = 'completed';
    } else if (eventName === 'payment.captured' && !subEntity?.id) {
      subPatch.status = 'active';
      subPatch.paymentStatus = 'captured';
      subPatch.expiryDate = computeNextExpiryIso(now, cycleKey);
      subPatch.nextRenewalDate = subPatch.expiryDate;
    } else if (eventName === 'payment.failed') {
      subPatch.paymentStatus = 'failed';
      subPatch.lastPaymentError = pmtEntity?.error_description || 'Payment failed';
    }

    await Promise.all([
      adminCtx.db.collection('platformSubscriptions').doc(studioId).set(subPatch, { merge: true }),
      adminCtx.db.collection('studios').doc(studioId).collection('billing').doc('current').set(subPatch, { merge: true }),
      adminCtx.db.collection('studios').doc(studioId).collection('subscriptionHistory').doc(`wh_${dedupeKey}`).set(
        {
          id: `wh_${dedupeKey}`,
          eventType: eventName,
          razorpaySubscriptionId: subEntity?.id || null,
          razorpayPaymentId: pmtEntity?.id || null,
          amountInr: pmtEntity?.amount ? Number(pmtEntity.amount) / 100 : null,
          timestamp: now
        },
        { merge: true }
      )
    ]);
  }

  return res.status(200).json({ received: true, processed: true, eventId: dedupeKey });
}
