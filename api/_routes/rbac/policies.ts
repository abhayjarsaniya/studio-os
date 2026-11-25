import { verifyFirebaseCaller, getFirebaseAdmin } from '../../_lib/razorpayServer';
import { resolveServerPermissions } from '../../_lib/rbacServer';

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');

  const caller = await verifyFirebaseCaller(req);
  if (!caller) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Valid Firebase token required.' });
  }

  const adminCtx = getFirebaseAdmin();
  if (!adminCtx) {
    return res.status(503).json({ success: false, error: 'Firebase Admin SDK is not configured.' });
  }

  if (req.method === 'GET') {
    const studioId = String(req.query?.studioId || '').trim() || null;

    if (!caller.isMasterAdmin) {
      const bundle = await resolveServerPermissions(caller, studioId);
      if (bundle.isDeactivated) {
        return res.status(403).json({ success: false, error: 'Account is deactivated.' });
      }
      return res.status(200).json({ success: true, bundle });
    }

    const [globalSnap, studioRolesSnap, userOvrSnap] = await Promise.all([
      adminCtx.db.collection('globalRoles').get(),
      studioId && studioId !== 'all'
        ? adminCtx.db.collection('studios').doc(studioId).collection('rbacRoles').get()
        : Promise.resolve({ docs: [] }),
      studioId && studioId !== 'all'
        ? adminCtx.db.collection('studios').doc(studioId).collection('userPermissions').get()
        : Promise.resolve({ docs: [] })
    ]);

    return res.status(200).json({
      success: true,
      globalRoles: globalSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })),
      studioRoles: studioRolesSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })),
      userOverrides: userOvrSnap.docs.map((d: any) => ({ uid: d.id, ...d.data() }))
    });
  }

  if (req.method === 'POST') {
    if (!caller.isMasterAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Only Platform Master Admin can modify RBAC policies.'
      });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { action, studioId, role, override, uid, auditChanges = [] } = body;
    const now = new Date().toISOString();

    try {
      if (action === 'save_global_role' && role?.id) {
        await adminCtx.db.collection('globalRoles').doc(role.id).set(
          { ...role, updatedAt: now, updatedBy: caller.email },
          { merge: true }
        );
      } else if (action === 'save_studio_role' && studioId && role?.id) {
        await adminCtx.db
          .collection('studios')
          .doc(studioId)
          .collection('rbacRoles')
          .doc(role.id)
          .set({ ...role, studioId, updatedAt: now, updatedBy: caller.email }, { merge: true });
      } else if (action === 'save_user_override' && studioId && override?.uid) {
        await adminCtx.db
          .collection('studios')
          .doc(studioId)
          .collection('userPermissions')
          .doc(override.uid)
          .set({ ...override, studioId, updatedAt: now, updatedBy: caller.email }, { merge: true });
      } else if (action === 'reset_user_override' && studioId && uid) {
        await adminCtx.db
          .collection('studios')
          .doc(studioId)
          .collection('userPermissions')
          .doc(uid)
          .delete();
      } else if (action === 'delete_custom_role' && studioId && role?.id) {
        const usersSnap = await adminCtx.db
          .collection('users')
          .where('studioId', '==', studioId)
          .get();
        const assigned = usersSnap.docs.filter((d: any) => {
          const u = d.data() || {};
          return u.roleId === role.id || u.role === role.id;
        });
        if (assigned.length > 0) {
          return res.status(409).json({
            success: false,
            error: `Cannot delete role "${role.id}" because ${assigned.length} user(s) are assigned to it.`
          });
        }
        await adminCtx.db
          .collection('studios')
          .doc(studioId)
          .collection('rbacRoles')
          .doc(role.id)
          .delete();
      } else {
        return res.status(400).json({ success: false, error: 'Invalid RBAC policy action.' });
      }

      // Record audit log entries
      const batch = adminCtx.db.batch();
      (Array.isArray(auditChanges) ? auditChanges.slice(0, 25) : []).forEach((ch: any) => {
        const logRef = adminCtx.db.collection('platformAuditLogs').doc();
        batch.set(logRef, {
          actingAdmin: caller.email,
          studioId: studioId || 'global',
          targetType: action,
          targetId: role?.id || override?.uid || uid || 'unknown',
          module: ch.module || 'all',
          permissionChanged: ch.permissionChanged || 'policy_update',
          previousValue: ch.previousValue ?? null,
          newValue: ch.newValue ?? null,
          timestamp: now
        });
      });
      if (Array.isArray(auditChanges) && auditChanges.length > 0) {
        await batch.commit();
      }

      return res.status(200).json({ success: true, updatedAt: now });
    } catch (err: any) {
      console.error('[api/rbac/policies] Error:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Failed to save RBAC policy.' });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed.' });
}
