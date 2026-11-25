import crypto from 'node:crypto';
import { verifyFirebaseCaller, getFirebaseAdmin } from '../_lib/razorpayServer';

function generateSecurePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let out = 'StOs#';
  for (let i = 0; i < 6; i++) {
    out += chars[crypto.randomInt(0, chars.length)];
  }
  return out;
}

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

  const requestedPassword = typeof body.newPassword === 'string' ? body.newPassword.trim() : '';
  if (requestedPassword && requestedPassword.length < 6) {
    return res.status(400).json({
      success: false,
      error: 'Password must be at least 6 characters.'
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
    const passwordToSet = requestedPassword || generateSecurePassword();
    await adminCtx.auth.updateUser(uid, { password: passwordToSet });
    await adminCtx.auth.revokeRefreshTokens(uid).catch(() => {});

    await adminCtx.db.collection('users').doc(uid).set(
      {
        updatedAt: new Date().toISOString(),
        passwordUpdatedAt: new Date().toISOString(),
        mustChangePassword: !requestedPassword
      },
      { merge: true }
    );

    return res.status(200).json({
      success: true,
      uid,
      temporaryPassword: passwordToSet
    });
  } catch (err: any) {
    console.error('[api/accounts/reset-password] Error:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to reset password.'
    });
  }
}
