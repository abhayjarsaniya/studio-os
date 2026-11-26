import {
  verifyFirebaseCaller,
  getFirebaseAdmin,
  getGatewaySettings,
  resolveCredentials,
  razorpayRequest,
  verifyRazorpayCheckoutSignature,
  computeNextExpiryIso,
  GatewayEnvironment
} from '../../lib/razorpayServer';

async function authorizeStudioAccess(caller: any, studioId: string): Promise<boolean> {
  if (caller.isMasterAdmin) return true;
  if (caller.studioId && caller.studioId === studioId) return true;

  const adminCtx = getFirebaseAdmin();
  if (!adminCtx) return false;
  const studioDoc = await adminCtx.db.collection('studios').doc(studioId).get();
  if (!studioDoc.exists) return false;
  const data = studioDoc.data() || {};
  return (
    data.ownerUid === caller.uid ||
    (data.ownerEmail && data.ownerEmail.toLowerCase() === caller.email)
  );
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed.' });
  }

  const caller = await verifyFirebaseCaller(req);
  if (!caller) {
    return res.status(401).json({ success: false, error: 'Authentication required.' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const action = String(body.action || '');
  const settings = await getGatewaySettings();
  const env: GatewayEnvironment = settings.environment === 'live' ? 'live' : 'test';
  const creds = await resolveCredentials(env);
  const adminCtx = getFirebaseAdmin();
  const now = new Date().toISOString();

  // ------------------------------------------------------------------
  // 1. Create Checkout (UPI AutoPay Subscription OR One-Time Order)
  // ------------------------------------------------------------------
  if (action === 'create_checkout') {
    const {
      studioId,
      studioName,
      planId,
      planName,
      cycle = 'monthly',
      paymentType = 'upi_autopay',
      amountInr: clientAmountInr,
      setupFeeInr: clientSetupFeeInr = 0,
      ownerEmail,
      ownerPhone
    } = body;

    if (!studioId || !planId) {
      return res.status(400).json({ success: false, error: 'studioId and planId are required.' });
    }
    const allowed = await authorizeStudioAccess(caller, studioId);
    if (!allowed && caller.studioId !== null) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You cannot initiate billing checkout for another studio.'
      });
    }
    if (!settings.enabled) {
      return res.status(400).json({
        success: false,
        error: 'Payment gateway is currently disabled by Platform Master Admin.'
      });
    }
    if (!creds.keyId || !creds.keySecret) {
      return res.status(400).json({
        success: false,
        error: 'Razorpay credentials are not configured on the server.'
      });
    }

    // Resolve canonical pricing from Firestore billingPlans when available
    let canonicalAmountInr = Number(clientAmountInr || 0);
    let canonicalSetupFeeInr = Number(clientSetupFeeInr || 0);
    let resolvedPlanName = String(planName || 'Studio OS Plan');
    let existingRzpPlanId = '';

    if (adminCtx) {
      const planSnap = await adminCtx.db.collection('billingPlans').doc(planId).get();
      if (planSnap.exists) {
        const pd = planSnap.data() || {};
        resolvedPlanName = pd.name || resolvedPlanName;
        if (cycle === 'yearly') canonicalAmountInr = Number(pd.priceYearly ?? pd.priceAnnual ?? canonicalAmountInr);
        else if (cycle === 'quarterly') canonicalAmountInr = Number(pd.priceQuarterly ?? canonicalAmountInr);
        else canonicalAmountInr = Number(pd.priceMonthly ?? canonicalAmountInr);
        canonicalSetupFeeInr = Number(pd.setupFee ?? canonicalSetupFeeInr);
        const map = env === 'live' ? pd.razorpayLivePlanIds : pd.razorpayTestPlanIds;
        if (map && map[cycle]) {
          existingRzpPlanId = map[cycle];
        }
      }
    }

    if (!Number.isFinite(canonicalAmountInr) || canonicalAmountInr <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid positive plan amount.' });
    }

    const totalInitialPaise = Math.round((canonicalAmountInr + Math.max(0, canonicalSetupFeeInr)) * 100);
    const recurringPaise = Math.round(canonicalAmountInr * 100);
    const cycleKey = (cycle === 'yearly' ? 'yearly' : cycle === 'quarterly' ? 'quarterly' : 'monthly') as
      | 'monthly'
      | 'quarterly'
      | 'yearly';

    if (paymentType === 'upi_autopay') {
      // Ensure Razorpay Plan exists for this plan + cycle + env
      let rzpPlanId = existingRzpPlanId;
      if (!rzpPlanId) {
        const planCreate = await razorpayRequest<{ id: string }>('/plans', 'POST', creds, {
          period: cycleKey === 'yearly' ? 'yearly' : 'monthly',
          interval: cycleKey === 'quarterly' ? 3 : 1,
          item: {
            name: `${resolvedPlanName} (${cycleKey})`,
            amount: recurringPaise,
            currency: 'INR',
            description: `Studio OS ${resolvedPlanName} recurring ${cycleKey} billing`
          },
          notes: {
            platformPlanId: planId,
            cycle: cycleKey,
            environment: env
          }
        });

        if (!planCreate.ok || !planCreate.data?.id) {
          return res.status(400).json({
            success: false,
            error: planCreate.error || 'Failed to provision Razorpay Plan for AutoPay.'
          });
        }
        rzpPlanId = planCreate.data.id;

        if (adminCtx) {
          const fieldName = env === 'live' ? 'razorpayLivePlanIds' : 'razorpayTestPlanIds';
          await adminCtx.db.collection('billingPlans').doc(planId).set(
            {
              id: planId,
              name: resolvedPlanName,
              [fieldName]: { [cycleKey]: rzpPlanId },
              updatedAt: now
            },
            { merge: true }
          );
        }
      }

      // Maximum total count supported cleanly for UPI AutoPay / card e-mandates
      const totalCount = cycleKey === 'yearly' ? 10 : cycleKey === 'quarterly' ? 40 : 120;
      const subPayload: Record<string, any> = {
        plan_id: rzpPlanId,
        total_count: totalCount,
        quantity: 1,
        customer_notify: 1,
        notes: {
          studioId,
          studioName: studioName || studioId,
          planId,
          planName: resolvedPlanName,
          cycle: cycleKey,
          paymentType: 'upi_autopay',
          initiatedBy: caller.email
        }
      };

      if (canonicalSetupFeeInr > 0) {
        subPayload.addons = [
          {
            item: {
              name: 'One-Time Setup Fee',
              amount: Math.round(canonicalSetupFeeInr * 100),
              currency: 'INR'
            }
          }
        ];
      }

      const subResp = await razorpayRequest<{ id: string; status: string; short_url?: string }>(
        '/subscriptions',
        'POST',
        creds,
        subPayload
      );

      if (!subResp.ok || !subResp.data?.id) {
        return res.status(400).json({
          success: false,
          error: subResp.error || 'Failed to create Razorpay subscription.'
        });
      }

      const txId = `tx_${subResp.data.id}`;
      if (adminCtx) {
        await Promise.all([
          adminCtx.db.collection('platformSubscriptions').doc(studioId).set(
            {
              studioId,
              studioName: studioName || studioId,
              planId,
              planName: resolvedPlanName,
              billingCycle: cycleKey,
              amountInr: canonicalAmountInr,
              currency: 'INR',
              environment: env,
              razorpayPlanId: rzpPlanId,
              razorpaySubscriptionId: subResp.data.id,
              mandateStatus: 'authorization_pending',
              paymentMode: 'upi_autopay',
              shortUrl: subResp.data.short_url || null,
              updatedAt: now
            },
            { merge: true }
          ),
          adminCtx.db.collection('platformTransactions').doc(txId).set({
            id: txId,
            studioId,
            studioName: studioName || studioId,
            planId,
            planName: resolvedPlanName,
            billingCycle: cycleKey,
            amountInr: canonicalAmountInr + Math.max(0, canonicalSetupFeeInr),
            amountPaise: totalInitialPaise,
            currency: 'INR',
            paymentType: 'upi_autopay',
            method: 'upi',
            status: 'created',
            environment: env,
            razorpaySubscriptionId: subResp.data.id,
            razorpayPlanId: rzpPlanId,
            customerEmail: ownerEmail || caller.email,
            customerPhone: ownerPhone || '',
            createdAt: now,
            updatedAt: now
          })
        ]);
      }

      return res.status(200).json({
        success: true,
        mode: 'subscription',
        keyId: creds.keyId,
        environment: env,
        subscriptionId: subResp.data.id,
        razorpayPlanId: rzpPlanId,
        shortUrl: subResp.data.short_url || null,
        amountPaise: totalInitialPaise,
        amountInr: canonicalAmountInr + Math.max(0, canonicalSetupFeeInr),
        recurringAmountInr: canonicalAmountInr,
        billingCycle: cycleKey,
        currency: 'INR',
        txId
      });
    }

    // One-Time Razorpay Order flow
    const receipt = `sos_${studioId.slice(-10)}_${Date.now()}`.slice(0, 40);
    const orderResp = await razorpayRequest<{ id: string; amount: number; status: string }>(
      '/orders',
      'POST',
      creds,
      {
        amount: totalInitialPaise,
        currency: 'INR',
        receipt,
        notes: {
          studioId,
          studioName: studioName || studioId,
          planId,
          planName: resolvedPlanName,
          cycle: cycleKey,
          paymentType: 'one_time',
          initiatedBy: caller.email
        }
      }
    );

    if (!orderResp.ok || !orderResp.data?.id) {
      return res.status(400).json({
        success: false,
        error: orderResp.error || 'Failed to create Razorpay order.'
      });
    }

    const txId = `tx_${orderResp.data.id}`;
    if (adminCtx) {
      await adminCtx.db.collection('platformTransactions').doc(txId).set({
        id: txId,
        studioId,
        studioName: studioName || studioId,
        planId,
        planName: resolvedPlanName,
        billingCycle: cycleKey,
        amountInr: canonicalAmountInr + Math.max(0, canonicalSetupFeeInr),
        amountPaise: totalInitialPaise,
        currency: 'INR',
        paymentType: 'one_time',
        method: 'one_time',
        status: 'created',
        environment: env,
        razorpayOrderId: orderResp.data.id,
        customerEmail: ownerEmail || caller.email,
        customerPhone: ownerPhone || '',
        createdAt: now,
        updatedAt: now
      });
    }

    return res.status(200).json({
      success: true,
      mode: 'order',
      keyId: creds.keyId,
      environment: env,
      orderId: orderResp.data.id,
      amountPaise: totalInitialPaise,
      amountInr: canonicalAmountInr + Math.max(0, canonicalSetupFeeInr),
      billingCycle: cycleKey,
      currency: 'INR',
      txId
    });
  }

  // ------------------------------------------------------------------
  // 2. Verify Checkout Signature + Confirm Payment from Razorpay API
  // ------------------------------------------------------------------
  if (action === 'verify_checkout') {
    const {
      studioId,
      planId,
      planName,
      cycle = 'monthly',
      paymentId,
      orderId,
      subscriptionId,
      signature
    } = body;

    if (!studioId || !paymentId || !signature) {
      return res.status(400).json({
        success: false,
        error: 'studioId, paymentId, and signature are required for verification.'
      });
    }

    const allowed = await authorizeStudioAccess(caller, studioId);
    if (!allowed && caller.studioId !== null) {
      return res.status(403).json({ success: false, error: 'Forbidden for this studio.' });
    }

    if (!creds.keyId || !creds.keySecret) {
      return res.status(400).json({ success: false, error: 'Razorpay credentials unavailable.' });
    }

    const sigValid = verifyRazorpayCheckoutSignature({
      orderId,
      subscriptionId,
      paymentId,
      signature,
      keySecret: creds.keySecret
    });

    if (!sigValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Razorpay payment signature.'
      });
    }

    // Authoritative check directly against Razorpay API
    const paymentFetch = await razorpayRequest<any>(`/payments/${paymentId}`, 'GET', creds);
    if (!paymentFetch.ok || !paymentFetch.data) {
      return res.status(400).json({
        success: false,
        error: paymentFetch.error || 'Could not confirm payment with Razorpay API.'
      });
    }

    const pmt = paymentFetch.data;
    const confirmedPaid = pmt.status === 'captured' || pmt.status === 'authorized';
    if (!confirmedPaid) {
      return res.status(400).json({
        success: false,
        error: `Payment status is "${pmt.status}", not authorized or captured.`
      });
    }

    let rzpSubData: any = null;
    if (subscriptionId) {
      const subFetch = await razorpayRequest<any>(`/subscriptions/${subscriptionId}`, 'GET', creds);
      if (subFetch.ok && subFetch.data) {
        rzpSubData = subFetch.data;
      }
    }

    const amountInr = Number(pmt.amount || 0) / 100;
    const cycleKey = (cycle === 'yearly' ? 'yearly' : cycle === 'quarterly' ? 'quarterly' : 'monthly') as
      | 'monthly'
      | 'quarterly'
      | 'yearly';
    const currentEndIso = rzpSubData?.current_end
      ? new Date(rzpSubData.current_end * 1000).toISOString()
      : computeNextExpiryIso(now, cycleKey);
    const nextChargeIso = rzpSubData?.charge_at
      ? new Date(rzpSubData.charge_at * 1000).toISOString()
      : currentEndIso;
    const mandateStatus = subscriptionId
      ? (rzpSubData?.status === 'active' ? 'active' : 'authenticated')
      : 'not_set_up';

    const txDocId = `pay_${paymentId}`;
    const invoiceNumber = `SOS-INV-${now.slice(0, 7).replace('-', '')}-${paymentId.slice(-6).toUpperCase()}`;

    if (adminCtx) {
      const billingPatch = {
        studioId,
        planId: planId || rzpSubData?.notes?.planId || 'plan_standard_500',
        planName: planName || rzpSubData?.notes?.planName || 'Studio OS Standard',
        billingCycle: cycleKey,
        status: 'active',
        paymentStatus: pmt.status === 'captured' ? 'captured' : 'authorized',
        mandateStatus,
        paymentMode: subscriptionId ? 'upi_autopay' : 'one_time',
        amountInr,
        currency: pmt.currency || 'INR',
        razorpaySubscriptionId: subscriptionId || null,
        razorpayPaymentId: paymentId,
        razorpayOrderId: orderId || pmt.order_id || null,
        currentPeriodStart: now,
        expiryDate: currentEndIso,
        nextRenewalDate: nextChargeIso,
        autoRenew: Boolean(subscriptionId),
        upiVpa: pmt.vpa || null,
        paymentMethodDetail: pmt.method || (subscriptionId ? 'upi' : 'online'),
        updatedAt: now
      };

      await Promise.all([
        adminCtx.db.collection('platformSubscriptions').doc(studioId).set(billingPatch, { merge: true }),
        adminCtx.db.collection('studios').doc(studioId).collection('billing').doc('current').set(billingPatch, { merge: true }),
        adminCtx.db.collection('studios').doc(studioId).set({ subscriptionStatus: 'active', updatedAt: now }, { merge: true }),
        adminCtx.db.collection('platformTransactions').doc(txDocId).set(
          {
            id: txDocId,
            studioId,
            planId: billingPatch.planId,
            planName: billingPatch.planName,
            billingCycle: cycleKey,
            amountInr,
            amountPaise: Number(pmt.amount || 0),
            currency: pmt.currency || 'INR',
            paymentType: subscriptionId ? 'upi_autopay' : 'one_time',
            method: pmt.method || 'upi',
            upiVpa: pmt.vpa || null,
            status: pmt.status === 'captured' ? 'captured' : 'authorized',
            environment: env,
            razorpayPaymentId: paymentId,
            razorpayOrderId: orderId || pmt.order_id || null,
            razorpaySubscriptionId: subscriptionId || null,
            razorpaySignatureVerified: true,
            invoiceNumber,
            paidAt: now,
            updatedAt: now
          },
          { merge: true }
        ),
        adminCtx.db.collection('subscriptionInvoices').doc(`inv_${paymentId}`).set(
          {
            id: `inv_${paymentId}`,
            invoiceNumber,
            studioId,
            planId: billingPatch.planId,
            planName: billingPatch.planName,
            amountInr,
            currency: 'INR',
            razorpayPaymentId: paymentId,
            razorpaySubscriptionId: subscriptionId || null,
            razorpayOrderId: orderId || pmt.order_id || null,
            issuedAt: now,
            status: 'paid'
          },
          { merge: true }
        ),
        adminCtx.db.collection('studios').doc(studioId).collection('subscriptionHistory').doc(`hist_${paymentId}`).set(
          {
            id: `hist_${paymentId}`,
            eventType: subscriptionId ? 'AUTOPAY_MANDATE_VERIFIED' : 'ONE_TIME_PAYMENT_VERIFIED',
            planName: billingPatch.planName,
            amountInr,
            razorpayPaymentId: paymentId,
            razorpaySubscriptionId: subscriptionId || null,
            timestamp: now
          },
          { merge: true }
        )
      ]);
    }

    return res.status(200).json({
      success: true,
      verified: true,
      paymentId,
      subscriptionId: subscriptionId || null,
      orderId: orderId || pmt.order_id || null,
      status: pmt.status,
      mandateStatus,
      amountInr,
      method: pmt.method,
      vpa: pmt.vpa || null,
      expiryDate: currentEndIso,
      nextRenewalDate: nextChargeIso,
      invoiceNumber
    });
  }

  // ------------------------------------------------------------------
  // 3. Master Admin ONLY Lifecycle Controls (Cancel / Pause / Resume / Refund)
  // ------------------------------------------------------------------
  if (['admin_cancel', 'admin_pause', 'admin_resume', 'admin_refund'].includes(action)) {
    if (!caller.isMasterAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Only Platform Master Admin can cancel, pause, resume, or refund subscriptions.'
      });
    }

    const { studioId, subscriptionId, paymentId, amountInr, cancelAtCycleEnd = false, reason = '' } = body;

    if (!creds.keyId || !creds.keySecret) {
      return res.status(400).json({ success: false, error: 'Razorpay credentials unavailable.' });
    }

    if (action === 'admin_cancel') {
      if (subscriptionId) {
        const cancelResp = await razorpayRequest(
          `/subscriptions/${subscriptionId}/cancel`,
          'POST',
          creds,
          { cancel_at_cycle_end: cancelAtCycleEnd ? 1 : 0 }
        );
        if (!cancelResp.ok) {
          return res.status(400).json({ success: false, error: cancelResp.error || 'Razorpay cancel failed.' });
        }
      }
      if (adminCtx && studioId) {
        await Promise.all([
          adminCtx.db.collection('platformSubscriptions').doc(studioId).set(
            {
              status: 'cancelled',
              mandateStatus: 'cancelled',
              autoRenew: false,
              cancelledAt: now,
              cancelledBy: caller.email,
              cancelReason: reason,
              updatedAt: now
            },
            { merge: true }
          ),
          adminCtx.db.collection('studios').doc(studioId).collection('billing').doc('current').set(
            { status: 'cancelled', mandateStatus: 'cancelled', autoRenew: false, updatedAt: now },
            { merge: true }
          ),
          adminCtx.db.collection('studios').doc(studioId).collection('subscriptionHistory').add({
            eventType: 'ADMIN_CANCELLED',
            reason,
            actor: caller.email,
            timestamp: now
          })
        ]);
      }
      return res.status(200).json({ success: true, status: 'cancelled', mandateStatus: 'cancelled' });
    }

    if (action === 'admin_pause' || action === 'admin_resume') {
      if (!subscriptionId) {
        return res.status(400).json({ success: false, error: 'subscriptionId is required for pause/resume.' });
      }
      const endpoint = action === 'admin_pause' ? 'pause' : 'resume';
      const resp = await razorpayRequest(`/subscriptions/${subscriptionId}/${endpoint}`, 'POST', creds, {
        ...(action === 'admin_pause' ? { pause_at: 'now' } : { resume_at: 'now' })
      });
      if (!resp.ok) {
        return res.status(400).json({ success: false, error: resp.error || `Razorpay ${endpoint} failed.` });
      }
      const nextMandate = action === 'admin_pause' ? 'paused' : 'active';
      if (adminCtx && studioId) {
        await Promise.all([
          adminCtx.db.collection('platformSubscriptions').doc(studioId).set(
            {
              mandateStatus: nextMandate,
              ...(action === 'admin_resume' ? { status: 'active' } : {}),
              updatedAt: now
            },
            { merge: true }
          ),
          adminCtx.db.collection('studios').doc(studioId).collection('billing').doc('current').set(
            { mandateStatus: nextMandate, updatedAt: now },
            { merge: true }
          )
        ]);
      }
      return res.status(200).json({ success: true, mandateStatus: nextMandate });
    }

    if (action === 'admin_refund') {
      if (!paymentId) {
        return res.status(400).json({ success: false, error: 'paymentId is required for refund.' });
      }
      const refundBody: Record<string, any> = {
        notes: { reason: reason || 'Admin initiated refund', refundedBy: caller.email }
      };
      if (amountInr && Number(amountInr) > 0) {
        refundBody.amount = Math.round(Number(amountInr) * 100);
      }

      const refundResp = await razorpayRequest<{ id: string; amount: number; status: string }>(
        `/payments/${paymentId}/refund`,
        'POST',
        creds,
        refundBody
      );
      if (!refundResp.ok || !refundResp.data) {
        return res.status(400).json({ success: false, error: refundResp.error || 'Razorpay refund failed.' });
      }

      const refundedInr = Number(refundResp.data.amount || 0) / 100;
      if (adminCtx) {
        const txDocRef = adminCtx.db.collection('platformTransactions').doc(`pay_${paymentId}`);
        const txSnap = await txDocRef.get();
        const prevAmount = txSnap.exists ? Number(txSnap.data()?.amountInr || refundedInr) : refundedInr;
        const refundStatus = refundedInr < prevAmount ? 'partially_refunded' : 'refunded';

        await txDocRef.set(
          {
            status: refundStatus,
            razorpayRefundId: refundResp.data.id,
            refundedAmountInr: refundedInr,
            refundReason: reason,
            refundedBy: caller.email,
            refundedAt: now,
            updatedAt: now
          },
          { merge: true }
        );
      }

      return res.status(200).json({
        success: true,
        refundId: refundResp.data.id,
        refundedAmountInr: refundedInr
      });
    }
  }

  return res.status(400).json({ success: false, error: `Unsupported action: ${action}` });
}
