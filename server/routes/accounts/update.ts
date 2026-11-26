import { verifyFirebaseCaller, getFirebaseAdmin, MASTER_ADMIN_EMAIL } from '../../lib/razorpayServer';

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
    if (!userSnap.exists) {
      return res.status(404).json({ success: false, error: 'Account not found in Firestore.' });
    }

    const existing = userSnap.data() || {};
    const existingEmail = String(existing.email || '').toLowerCase();
    const isMasterAdminTarget = existing.accountType === 'MASTER_ADMIN' || existingEmail === MASTER_ADMIN_EMAIL;

    const updates: Record<string, any> = {
      updatedAt: new Date().toISOString()
    };

    if (typeof body.displayName === 'string' && body.displayName.trim()) {
      updates.displayName = body.displayName.trim();
    }

    if (typeof body.phone === 'string') {
      updates.phone = body.phone.trim();
    }

    // Status update (blocked for Master Admin)
    if (typeof body.status === 'string' && ['active', 'deactivated', 'suspended'].includes(body.status)) {
      if (isMasterAdminTarget && body.status !== 'active') {
        return res.status(403).json({
          success: false,
          error: 'Master Admin account cannot be deactivated.'
        });
      }
      updates.status = body.status;
      updates.isActive = body.status === 'active';

      await adminCtx.auth.updateUser(uid, {
        disabled: body.status !== 'active'
      }).catch((e: any) => {
        console.warn('[api/accounts/update] Auth disable/enable notice:', e?.message);
      });

      if (body.status !== 'active') {
        await adminCtx.auth.revokeRefreshTokens(uid).catch(() => {});
      }
    }

    // Login ID update (blocked for Master Admin)
    let newLoginId: string | null = null;
    let newEmail: string | null = null;
    const oldLoginId = String(existing.loginId || '').trim().toLowerCase();

    if (typeof body.loginId === 'string' && body.loginId.trim()) {
      const requestedLoginId = body.loginId.trim().toLowerCase();
      if (requestedLoginId !== oldLoginId) {
        if (isMasterAdminTarget) {
          return res.status(403).json({
            success: false,
            error: 'Master Admin login email cannot be changed.'
          });
        }

        // Uniqueness check in users & accountRegistry
        const [dupUsersSnap, dupRegSnap] = await Promise.all([
          adminCtx.db.collection('users').where('loginId', '==', requestedLoginId).get(),
          adminCtx.db.collection('accountRegistry').doc(requestedLoginId).get()
        ]);

        const hasOtherUser = dupUsersSnap.docs.some((d: any) => d.id !== uid);
        const hasOtherReg = dupRegSnap.exists && dupRegSnap.data()?.uid !== uid;
        if (hasOtherUser || hasOtherReg) {
          return res.status(409).json({
            success: false,
            error: `Login ID "${requestedLoginId}" is already in use by another account.`
          });
        }

        newLoginId = requestedLoginId;
        updates.loginId = requestedLoginId;

        if (existingEmail.endsWith('@studio-os.internal')) {
          newEmail = `${requestedLoginId}@studio-os.internal`;
          updates.email = newEmail;
          await adminCtx.auth.updateUser(uid, { email: newEmail });
        }
      }
    }

    // Update Auth displayName if changed
    if (updates.displayName) {
      await adminCtx.auth.updateUser(uid, { displayName: updates.displayName }).catch(() => {});
    }

    await userRef.set(updates, { merge: true });

    // Sync accountRegistry
    const activeLoginKey = newLoginId || oldLoginId;
    const activeEmail = newEmail || existingEmail;
    if (newLoginId && oldLoginId && newLoginId !== oldLoginId) {
      await adminCtx.db.collection('accountRegistry').doc(oldLoginId).delete().catch(() => {});
      if (existingEmail.endsWith('@studio-os.internal')) {
        await adminCtx.db.collection('accountRegistry').doc(existingEmail).delete().catch(() => {});
      }
    }
    for (const key of [activeLoginKey, activeEmail].filter(Boolean)) {
      await adminCtx.db.collection('accountRegistry').doc(key).set({
        uid,
        loginId: activeLoginKey,
        email: activeEmail,
        displayName: updates.displayName || existing.displayName || '',
        phone: updates.phone !== undefined ? updates.phone : (existing.phone || ''),
        studioId: existing.studioId || null,
        studioName: existing.studioName || null,
        accountType: existing.accountType || 'STUDIO_OWNER',
        role: existing.role || 'studio_owner',
        status: updates.status || existing.status || 'active',
        isActive: (updates.status || existing.status || 'active') === 'active',
        updatedAt: updates.updatedAt
      }, { merge: true });
    }

    // Sync studio / member / employee docs if linked
    if (existing.studioId) {
      const studioRef = adminCtx.db.collection('studios').doc(existing.studioId);
      if (existing.accountType === 'STUDIO_OWNER') {
        const studioPatch: Record<string, any> = { updatedAt: updates.updatedAt };
        if (updates.displayName) studioPatch.ownerName = updates.displayName;
        if (updates.phone !== undefined) studioPatch.ownerPhone = updates.phone;
        if (newEmail) studioPatch.ownerEmail = newEmail;
        if (updates.status) studioPatch.accountStatus = updates.status;
        await studioRef.set(studioPatch, { merge: true }).catch(() => {});
      }

      const memberPatch: Record<string, any> = { updatedAt: updates.updatedAt };
      if (updates.displayName) memberPatch.displayName = updates.displayName;
      if (newEmail) memberPatch.email = newEmail;
      if (updates.status) {
        memberPatch.status = updates.status;
        memberPatch.isActive = updates.status === 'active';
      }
      await studioRef.collection('members').doc(uid).set(memberPatch, { merge: true }).catch(() => {});

      if (existing.accountType === 'EMPLOYEE' && existing.employeeId) {
        const empPatch: Record<string, any> = { updatedAt: updates.updatedAt };
        if (updates.displayName) {
          empPatch.fullName = updates.displayName;
          empPatch.name = updates.displayName;
        }
        if (updates.phone !== undefined) empPatch.phone = updates.phone;
        if (updates.status) {
          empPatch.accountStatus = updates.status;
          empPatch.employmentStatus = updates.status === 'active' ? 'active' : 'inactive';
        }
        await studioRef.collection('employees').doc(existing.employeeId).set(empPatch, { merge: true }).catch(() => {});
      }
    }

    return res.status(200).json({
      success: true,
      uid,
      updated: updates
    });
  } catch (err: any) {
    console.error('[api/accounts/update] Error:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to update account.'
    });
  }
}
