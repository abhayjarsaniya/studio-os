import {
  verifyFirebaseCaller,
  getFirebaseAdmin,
  getGatewaySettings,
  resolveCredentials,
  razorpayRequest,
  maskSecret,
  encryptSecret,
  isMaskedPlaceholder,
  GatewayEnvironment
} from '../_lib/razorpayServer';

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');

  const caller = await verifyFirebaseCaller(req);
  if (!caller) {
    return res.status(401).json({ success: false, error: 'Authentication required.' });
  }

  if (req.method === 'GET') {
    const settings = await getGatewaySettings();
    const activeEnv: GatewayEnvironment = settings.environment === 'live' ? 'live' : 'test';
    const [testCreds, liveCreds] = await Promise.all([
      resolveCredentials('test'),
      resolveCredentials('live')
    ]);
    const activeCreds = activeEnv === 'live' ? liveCreds : testCreds;

    const publicPayload: Record<string, any> = {
      success: true,
      gateway: 'razorpay',
      enabled: Boolean(settings.enabled),
      environment: activeEnv,
      currency: settings.currency || 'INR',
      defaultPaymentMode: settings.defaultPaymentMode || 'upi_autopay',
      upiAutopayEnabled: settings.upiAutopayEnabled !== false,
      oneTimeEnabled: settings.oneTimeEnabled !== false,
      maxAutopayRetries: Number(settings.maxAutopayRetries ?? 3),
      gracePeriodDays: Number(settings.gracePeriodDays ?? 7),
      autoRetryEnabled: settings.autoRetryEnabled !== false,
      activeKeyId: activeCreds.keyId || '',
      isConfigured: Boolean(activeCreds.keyId && activeCreds.keySecret)
    };

    if (caller.isMasterAdmin) {
      publicPayload.admin = {
        firebaseAdminReady: Boolean(getFirebaseAdmin()),
        test: {
          keyId: testCreds.keyId,
          keySecretMasked: maskSecret(testCreds.keySecret),
          webhookSecretMasked: maskSecret(testCreds.webhookSecret),
          hasKeySecret: Boolean(testCreds.keySecret),
          hasWebhookSecret: Boolean(testCreds.webhookSecret),
          source: testCreds.source
        },
        live: {
          keyId: liveCreds.keyId,
          keySecretMasked: maskSecret(liveCreds.keySecret),
          webhookSecretMasked: maskSecret(liveCreds.webhookSecret),
          hasKeySecret: Boolean(liveCreds.keySecret),
          hasWebhookSecret: Boolean(liveCreds.webhookSecret),
          source: liveCreds.source
        },
        lastConnectionTestAt: settings.lastConnectionTestAt || null,
        lastConnectionStatus: settings.lastConnectionStatus || 'untested',
        lastConnectionError: settings.lastConnectionError || null,
        lastWebhookReceivedAt: settings.lastWebhookReceivedAt || null,
        lastWebhookEvent: settings.lastWebhookEvent || null,
        updatedAt: settings.updatedAt || null,
        updatedBy: settings.updatedBy || null
      };
    }

    return res.status(200).json(publicPayload);
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed.' });
  }

  if (!caller.isMasterAdmin) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Only Platform Master Admin can modify Payment Gateway configuration.'
    });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const action = String(body.action || 'save_credentials');
  const adminCtx = getFirebaseAdmin();
  const now = new Date().toISOString();

  if (action === 'save_credentials') {
    const targetEnv: GatewayEnvironment = body.environment === 'live' ? 'live' : 'test';
    const existingCreds = await resolveCredentials(targetEnv);

    const nextKeyId = typeof body.keyId === 'string' && body.keyId.trim()
      ? body.keyId.trim()
      : existingCreds.keyId;

    if (targetEnv === 'live' && nextKeyId && !nextKeyId.startsWith('rzp_live_')) {
      return res.status(400).json({
        success: false,
        error: 'Live mode Key ID must begin with rzp_live_.'
      });
    }
    if (targetEnv === 'test' && nextKeyId && !nextKeyId.startsWith('rzp_test_')) {
      return res.status(400).json({
        success: false,
        error: 'Test mode Key ID must begin with rzp_test_.'
      });
    }

    const nextKeySecret = !isMaskedPlaceholder(body.keySecret)
      ? String(body.keySecret).trim()
      : existingCreds.keySecret;
    const nextWebhookSecret = !isMaskedPlaceholder(body.webhookSecret)
      ? String(body.webhookSecret).trim()
      : existingCreds.webhookSecret;

    if (!adminCtx) {
      return res.status(400).json({
        success: false,
        error:
          'Server Firebase Admin SDK is not initialized (FIREBASE_SERVICE_ACCOUNT_JSON env var missing). ' +
          'Add Razorpay keys as Vercel Environment Variables (RAZORPAY_TEST_KEY_ID / RAZORPAY_TEST_KEY_SECRET / RAZORPAY_TEST_WEBHOOK_SECRET) or configure FIREBASE_SERVICE_ACCOUNT_JSON to store encrypted secrets in Firestore.'
      });
    }

    await adminCtx.db.collection('platformPaymentSecrets').doc(targetEnv).set(
      {
        environment: targetEnv,
        keyId: nextKeyId,
        ...(nextKeySecret ? { keySecretEncrypted: encryptSecret(nextKeySecret) } : {}),
        ...(nextWebhookSecret ? { webhookSecretEncrypted: encryptSecret(nextWebhookSecret) } : {}),
        updatedAt: now,
        updatedBy: caller.email
      },
      { merge: true }
    );

    await adminCtx.db.collection('platformPaymentSettings').doc('razorpay').set(
      {
        gateway: 'razorpay',
        enabled: body.enabled !== undefined ? Boolean(body.enabled) : true,
        environment: body.activateEnvironment || targetEnv,
        currency: 'INR',
        defaultPaymentMode: body.defaultPaymentMode || 'upi_autopay',
        upiAutopayEnabled: body.upiAutopayEnabled !== false,
        oneTimeEnabled: body.oneTimeEnabled !== false,
        maxAutopayRetries: Number(body.maxAutopayRetries ?? 3),
        gracePeriodDays: Number(body.gracePeriodDays ?? 7),
        autoRetryEnabled: body.autoRetryEnabled !== false,
        [`${targetEnv}KeyId`]: nextKeyId,
        [`${targetEnv}Configured`]: Boolean(nextKeyId && nextKeySecret),
        updatedAt: now,
        updatedBy: caller.email
      },
      { merge: true }
    );

    return res.status(200).json({
      success: true,
      message: `Razorpay ${targetEnv.toUpperCase()} settings encrypted and saved securely.`,
      keyId: nextKeyId,
      keySecretMasked: maskSecret(nextKeySecret),
      webhookSecretMasked: maskSecret(nextWebhookSecret)
    });
  }

  if (action === 'test_connection' || action === 'activate_live') {
    const targetEnv: GatewayEnvironment = action === 'activate_live'
      ? 'live'
      : (body.environment === 'live' ? 'live' : 'test');
    const stored = await resolveCredentials(targetEnv);

    const keyId = typeof body.keyId === 'string' && body.keyId.trim()
      ? body.keyId.trim()
      : stored.keyId;
    const keySecret = !isMaskedPlaceholder(body.keySecret)
      ? String(body.keySecret).trim()
      : stored.keySecret;

    if (!keyId || !keySecret) {
      return res.status(400).json({
        success: false,
        error: `Missing ${targetEnv.toUpperCase()} Key ID or Key Secret.`
      });
    }

    if (action === 'activate_live') {
      if (!keyId.startsWith('rzp_live_')) {
        return res.status(400).json({
          success: false,
          error: 'Cannot activate Live Mode without a valid rzp_live_ Key ID.'
        });
      }
      if (!stored.webhookSecret && isMaskedPlaceholder(body.webhookSecret)) {
        return res.status(400).json({
          success: false,
          error: 'Configure your Razorpay Live Webhook Secret before activating Live Mode.'
        });
      }
    }

    const ping = await razorpayRequest('/plans?count=1', 'GET', { keyId, keySecret });
    if (adminCtx) {
      await adminCtx.db.collection('platformPaymentSettings').doc('razorpay').set(
        {
          lastConnectionTestAt: now,
          lastConnectionStatus: ping.ok ? 'connected' : 'failed',
          lastConnectionError: ping.ok ? null : (ping.error || 'Connection failed'),
          ...(action === 'activate_live' && ping.ok
            ? { enabled: true, environment: 'live', liveActivatedAt: now, liveActivatedBy: caller.email }
            : {}),
          updatedAt: now
        },
        { merge: true }
      );
    }

    if (!ping.ok) {
      return res.status(400).json({
        success: false,
        error: ping.error || 'Razorpay API authentication failed.'
      });
    }

    return res.status(200).json({
      success: true,
      environment: targetEnv,
      testedAt: now,
      message:
        action === 'activate_live'
          ? 'Live Razorpay credentials verified and Live Mode activated.'
          : `Razorpay ${targetEnv.toUpperCase()} API connection succeeded.`
    });
  }

  if (action === 'disable') {
    if (adminCtx) {
      await adminCtx.db.collection('platformPaymentSettings').doc('razorpay').set(
        {
          enabled: false,
          disabledAt: now,
          disabledBy: caller.email,
          updatedAt: now
        },
        { merge: true }
      );
    }
    return res.status(200).json({
      success: true,
      enabled: false,
      message: 'Payment gateway disabled. Existing subscription records and history are preserved.'
    });
  }

  return res.status(400).json({ success: false, error: `Unsupported action: ${action}` });
}
