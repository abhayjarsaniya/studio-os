import { verifyFirebaseCaller, getFirebaseAdmin } from '../_lib/razorpayServer';

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');

  const caller = await verifyFirebaseCaller(req);
  if (!caller) {
    return res.status(401).json({ success: false, error: 'Unauthorized.' });
  }

  const adminCtx = getFirebaseAdmin();
  if (!adminCtx) {
    return res.status(503).json({ success: false, error: 'Firebase Admin SDK is not configured.' });
  }

  if (req.method === 'GET') {
    const studioId = String(req.query?.studioId || caller.studioId || '').trim();
    const [globalSnap, studioSnap] = await Promise.all([
      adminCtx.db.collection('platformFeatureSettings').get(),
      studioId
        ? adminCtx.db.collection('studios').doc(studioId).collection('featureSettings').get()
        : Promise.resolve({ docs: [] })
    ]);

    const globalSettings: Record<string, boolean> = {};
    globalSnap.docs.forEach((d: any) => {
      const data = d.data() || {};
      if (typeof data.isGlobalEnabled === 'boolean') {
        globalSettings[d.id] = data.isGlobalEnabled;
      }
    });

    const studioOverrides: Record<string, boolean> = {};
    studioSnap.docs.forEach((d: any) => {
      const data = d.data() || {};
      if (typeof data.enabled === 'boolean') {
        studioOverrides[d.id] = data.enabled;
      }
    });

    return res.status(200).json({
      success: true,
      studioId: studioId || null,
      globalSettings,
      studioOverrides
    });
  }

  if (req.method === 'POST') {
    if (!caller.isMasterAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Only Platform Master Admin can modify feature visibility.'
      });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { action, studioId, updates = [], reason, previousMap = {} } = body;
    const now = new Date().toISOString();

    try {
      const batch = adminCtx.db.batch();

      if (action === 'save_global' && Array.isArray(updates)) {
        for (const u of updates) {
          const ref = adminCtx.db.collection('platformFeatureSettings').doc(u.featureId);
          batch.set(
            ref,
            {
              featureId: u.featureId,
              isGlobalEnabled: Boolean(u.isGlobalEnabled),
              updatedAt: now,
              updatedBy: caller.email
            },
            { merge: true }
          );

          const logRef = adminCtx.db.collection('platformAuditLogs').doc();
          batch.set(logRef, {
            actingAdmin: caller.email,
            studioId: 'global',
            featureId: u.featureId,
            featureName: u.name || u.featureId,
            previousStatus: previousMap[u.featureId] ? 'ON' : 'OFF',
            newStatus: u.isGlobalEnabled ? 'ON' : 'OFF',
            reason: reason || 'Global feature toggle',
            timestamp: now
          });
        }
        await batch.commit();
      } else if (action === 'save_studio' && studioId && Array.isArray(updates)) {
        for (const u of updates) {
          const ref = adminCtx.db
            .collection('studios')
            .doc(studioId)
            .collection('featureSettings')
            .doc(u.featureId);
          batch.set(
            ref,
            {
              featureId: u.featureId,
              enabled: Boolean(u.enabled),
              updatedAt: now,
              updatedBy: caller.email
            },
            { merge: true }
          );

          const logRef = adminCtx.db.collection('platformAuditLogs').doc();
          batch.set(logRef, {
            actingAdmin: caller.email,
            studioId,
            featureId: u.featureId,
            featureName: u.name || u.featureId,
            previousStatus: previousMap[u.featureId] === false ? 'OFF' : 'ON',
            newStatus: u.enabled ? 'ON' : 'OFF',
            reason: reason || 'Studio feature configuration',
            timestamp: now
          });
        }
        await batch.commit();
      } else if (action === 'reset_studio' && studioId) {
        const snap = await adminCtx.db
          .collection('studios')
          .doc(studioId)
          .collection('featureSettings')
          .get();
        snap.docs.forEach((d: any) => batch.delete(d.ref));
        const logRef = adminCtx.db.collection('platformAuditLogs').doc();
        batch.set(logRef, {
          actingAdmin: caller.email,
          studioId,
          featureId: 'all',
          featureName: 'All Features',
          previousStatus: 'custom_overrides',
          newStatus: 'global_defaults',
          reason: 'Reset studio overrides to global defaults',
          timestamp: now
        });
        await batch.commit();
      } else {
        return res.status(400).json({ success: false, error: 'Invalid feature settings action.' });
      }

      return res.status(200).json({ success: true, updatedAt: now });
    } catch (err: any) {
      console.error('[api/features/settings] Error:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Failed to save feature settings.' });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed.' });
}
