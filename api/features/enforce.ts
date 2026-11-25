import { verifyFirebaseCaller, getFirebaseAdmin } from '../_lib/razorpayServer';
import { resolveServerPermissions, checkBundlePermission } from '../_lib/rbacServer';

export async function isFeatureEnabledForStudioServer(
  adminCtx: { db: any },
  studioId: string,
  featureId: string
): Promise<{ enabled: boolean; reason?: string }> {
  const [globalDoc, studioDoc] = await Promise.all([
    adminCtx.db.collection('platformFeatureSettings').doc(featureId).get(),
    adminCtx.db.collection('studios').doc(studioId).collection('featureSettings').doc(featureId).get()
  ]);

  if (globalDoc.exists && globalDoc.data()?.isGlobalEnabled === false) {
    return { enabled: false, reason: `Feature "${featureId}" is disabled globally by Platform Master Admin.` };
  }

  if (studioDoc.exists && studioDoc.data()?.enabled === false) {
    return { enabled: false, reason: `Feature "${featureId}" is disabled for this studio.` };
  }

  return { enabled: true };
}

/**
 * Server-side combined check:
 * 1. Feature Visibility (is the feature enabled globally and for this studio?)
 * 2. RBAC Permission (does the user's role/override allow the requested module+action?)
 */
export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed.' });
  }

  const caller = await verifyFirebaseCaller(req);
  if (!caller) {
    return res.status(401).json({ success: false, error: 'Unauthorized.' });
  }

  const adminCtx = getFirebaseAdmin();
  if (!adminCtx) {
    return res.status(503).json({ success: false, error: 'Firebase Admin SDK is not configured.' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const { studioId, featureId, moduleId, actionId } = body;
  const targetStudioId = String(studioId || caller.studioId || '').trim();

  if (!targetStudioId || !featureId) {
    return res.status(400).json({ success: false, error: 'studioId and featureId are required.' });
  }

  const featureRes = await isFeatureEnabledForStudioServer(adminCtx, targetStudioId, featureId);
  if (!featureRes.enabled) {
    return res.status(403).json({
      success: false,
      allowed: false,
      error: featureRes.reason
    });
  }

  if (moduleId && actionId) {
    const bundle = await resolveServerPermissions(caller, targetStudioId);
    if (bundle.isDeactivated || !checkBundlePermission(bundle, moduleId, actionId)) {
      return res.status(403).json({
        success: false,
        allowed: false,
        error: `Forbidden: Missing "${actionId}" permission on "${moduleId}".`
      });
    }
  }

  return res.status(200).json({
    success: true,
    allowed: true
  });
}
