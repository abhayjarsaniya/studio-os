import {
  verifyFirebaseCaller,
  getFirebaseAdmin,
  getGatewaySettings,
  resolveCredentials,
  razorpayRequest,
  GatewayEnvironment
} from '../../_lib/razorpayServer';

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed.' });
  }

  const caller = await verifyFirebaseCaller(req);
  if (!caller || !caller.isMasterAdmin) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Only Platform Master Admin can create or sync Razorpay Plans.'
    });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const {
    planId,
    planName,
    cycle = 'monthly',
    amountInr,
    description
  } = body;

  const numericAmount = Number(amountInr);
  if (!planId || !planName || !Number.isFinite(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Valid planId, planName, and positive INR amount are required.'
    });
  }

  const settings = await getGatewaySettings();
  const env: GatewayEnvironment = body.environment === 'live'
    ? 'live'
    : (settings.environment === 'live' ? 'live' : 'test');
  const creds = await resolveCredentials(env);

  if (!creds.keyId || !creds.keySecret) {
    return res.status(400).json({
      success: false,
      error: `Razorpay ${env.toUpperCase()} credentials are not configured.`
    });
  }

  const period = cycle === 'yearly' ? 'yearly' : 'monthly';
  const interval = cycle === 'quarterly' ? 3 : 1;
  const amountPaise = Math.round(numericAmount * 100);

  const rzpResp = await razorpayRequest<{ id: string }>('/plans', 'POST', creds, {
    period,
    interval,
    item: {
      name: `${planName} (${cycle})`,
      amount: amountPaise,
      currency: 'INR',
      description: description || `Studio OS ${planName} - ${cycle} plan`
    },
    notes: {
      platformPlanId: planId,
      billingCycle: cycle,
      environment: env,
      createdBy: caller.email
    }
  });

  if (!rzpResp.ok || !rzpResp.data?.id) {
    return res.status(400).json({
      success: false,
      error: rzpResp.error || 'Failed to create Razorpay plan.'
    });
  }

  const adminCtx = getFirebaseAdmin();
  if (adminCtx) {
    const fieldName = env === 'live' ? 'razorpayLivePlanIds' : 'razorpayTestPlanIds';
    await adminCtx.db.collection('billingPlans').doc(planId).set(
      {
        id: planId,
        [fieldName]: {
          [cycle]: rzpResp.data.id
        },
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
  }

  return res.status(200).json({
    success: true,
    environment: env,
    cycle,
    razorpayPlanId: rzpResp.data.id,
    amountInr: numericAmount,
    amountPaise
  });
}
