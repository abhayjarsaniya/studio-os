import { verifyFirebaseCaller, getFirebaseAdmin, MASTER_ADMIN_EMAIL } from '../../_lib/razorpayServer';

function deriveLoginId(data: Record<string, any>): string {
  if (data.loginId && String(data.loginId).trim()) {
    return String(data.loginId).trim();
  }
  const email = String(data.email || '').trim().toLowerCase();
  if (email.endsWith('@studio-os.internal')) {
    return email.replace(/@studio-os\.internal$/i, '');
  }
  return email;
}

function sanitizeAccount(uid: string, data: Record<string, any>, authUser?: any) {
  const email = String(data.email || authUser?.email || '').trim().toLowerCase();
  const isInternalEmail = email.endsWith('@studio-os.internal');
  const loginId = deriveLoginId({ ...data, email });
  const rawAccountType = String(data.accountType || '').toUpperCase();
  const accountType =
    rawAccountType === 'MASTER_ADMIN' || email === MASTER_ADMIN_EMAIL
      ? 'MASTER_ADMIN'
      : rawAccountType === 'EMPLOYEE'
        ? 'EMPLOYEE'
        : 'STUDIO_OWNER';

  const status = authUser?.disabled
    ? 'deactivated'
    : (data.status === 'deactivated' || data.status === 'suspended' || data.isActive === false
      ? (data.status === 'suspended' ? 'suspended' : 'deactivated')
      : 'active');

  return {
    uid,
    id: uid,
    accountType,
    loginId,
    contactEmail: isInternalEmail ? '' : email,
    email,
    phone: String(data.phone || data.mobile || '').trim(),
    displayName: String(data.displayName || data.name || loginId || 'User').trim(),
    studioId: data.studioId || null,
    studioName: data.studioName || null,
    roleId: data.roleId || data.role || (accountType === 'MASTER_ADMIN' ? 'master_super_admin' : accountType === 'STUDIO_OWNER' ? 'owner' : 'employee'),
    roleTitle: data.roleTitle || data.roleName || data.designation || (accountType === 'MASTER_ADMIN' ? 'Master Super Admin' : accountType === 'STUDIO_OWNER' ? 'Studio Owner' : 'Employee'),
    employeeId: data.employeeId || null,
    department: data.department || null,
    designation: data.designation || null,
    status,
    createdAt: data.createdAt || authUser?.metadata?.creationTime || new Date().toISOString(),
    updatedAt: data.updatedAt || data.createdAt || new Date().toISOString(),
    lastLoginAt: data.lastLoginAt || authUser?.metadata?.lastSignInTime || null
  };
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed.' });
  }

  const caller = await verifyFirebaseCaller(req);
  if (!caller || !caller.isMasterAdmin) {
    return res.status(403).json({ success: false, error: 'Forbidden: Master Admin access required.' });
  }

  const adminCtx = getFirebaseAdmin();
  if (!adminCtx) {
    return res.status(503).json({
      success: false,
      error: 'Firebase Admin SDK is not configured on the server.'
    });
  }

  try {
    const [usersSnap, studiosSnap, authListResult] = await Promise.all([
      adminCtx.db.collection('users').get(),
      adminCtx.db.collection('studios').get(),
      adminCtx.auth.listUsers(1000).catch(() => ({ users: [] }))
    ]);

    const studioNameMap = new Map<string, string>();
    studiosSnap.docs.forEach((doc: any) => {
      const s = doc.data() || {};
      studioNameMap.set(doc.id, s.name || doc.id);
    });

    const authUserMap = new Map<string, any>();
    (authListResult.users || []).forEach((u: any) => {
      authUserMap.set(u.uid, u);
    });

    const accounts = usersSnap.docs.map((doc: any) => {
      const data = doc.data() || {};
      const authUser = authUserMap.get(doc.id);
      if (data.studioId && !data.studioName && studioNameMap.has(data.studioId)) {
        data.studioName = studioNameMap.get(data.studioId);
      }
      return sanitizeAccount(doc.id, data, authUser);
    });

    return res.status(200).json({
      success: true,
      accounts
    });
  } catch (err: any) {
    console.error('[api/accounts/list] Error:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to list platform accounts.'
    });
  }
}
