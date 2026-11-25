import { verifyFirebaseCaller, getFirebaseAdmin, MASTER_ADMIN_EMAIL } from '../../_lib/razorpayServer';

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed.' });
  }

  const caller = await verifyFirebaseCaller(req);
  if (!caller || !caller.isMasterAdmin) {
    return res.status(403).json({ success: false, error: 'Forbidden: Master Admin access required.' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const uid = String(body.uid || '').trim();
  if (!uid) {
    return res.status(400).json({ success: false, error: 'Account uid is required.' });
  }

  if (uid === caller.uid) {
    return res.status(403).json({
      success: false,
      error: 'Cannot delete the currently signed-in Master Admin account.'
    });
  }

  const adminCtx = getFirebaseAdmin();
  if (!adminCtx) {
    return res.status(503).json({
      success: false,
      error: 'Firebase Admin SDK is not configured on the server.'
    });
  }

  try {
    const userRef = adminCtx.db.collection('users').doc(uid);
    const userSnap = await userRef.get();
    const userData = userSnap.data() || {};
    const email = String(userData.email || '').toLowerCase();

    if (userData.accountType === 'MASTER_ADMIN' || email === MASTER_ADMIN_EMAIL) {
      return res.status(403).json({
        success: false,
        error: 'Protected: Master Admin account cannot be deleted.'
      });
    }

    // 1. Delete from Firebase Authentication
    await adminCtx.auth.deleteUser(uid).catch((err: any) => {
      if (err?.code !== 'auth/user-not-found') throw err;
    });

    // 2. Delete Firestore user profile
    await userRef.delete().catch(() => {});

    // 3. Delete matching accountRegistry entries
    const regSnap = await adminCtx.db.collection('accountRegistry').where('uid', '==', uid).get();
    await Promise.all(regSnap.docs.map((d: any) => d.ref.delete()));
    if (userData.loginId) {
      await adminCtx.db.collection('accountRegistry').doc(String(userData.loginId).toLowerCase()).delete().catch(() => {});
    }
    if (email) {
      await adminCtx.db.collection('accountRegistry').doc(email).delete().catch(() => {});
    }

    // 4. Remove studio membership (NEVER delete business records: bookings, customers, invoices, payments)
    if (userData.studioId) {
      const studioRef = adminCtx.db.collection('studios').doc(userData.studioId);
      await studioRef.collection('members').doc(uid).delete().catch(() => {});

      if (userData.accountType === 'EMPLOYEE' && userData.employeeId) {
        await studioRef.collection('employees').doc(userData.employeeId).set(
          {
            userId: null,
            authUid: null,
            accountStatus: 'removed',
            updatedAt: new Date().toISOString()
          },
          { merge: true }
        ).catch(() => {});
      }
    }

    return res.status(200).json({
      success: true,
      deletedUid: uid
    });
  } catch (err: any) {
    console.error('[api/accounts/delete] Error:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to delete account.'
    });
  }
}
