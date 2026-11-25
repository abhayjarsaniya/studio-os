import { verifyFirebaseCaller, getFirebaseAdmin, MASTER_ADMIN_EMAIL } from '../../_lib/razorpayServer';

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed.' });
  }

  const caller = await verifyFirebaseCaller(req);
  if (!caller || !caller.isMasterAdmin) {
    return res.status(403).json({ success: false, error: 'Forbidden: Master Admin access required.' });
  }

  const uid = String(req.query?.uid || '').trim();
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
    const [userSnap, authUser] = await Promise.all([
      adminCtx.db.collection('users').doc(uid).get(),
      adminCtx.auth.getUser(uid).catch(() => null)
    ]);

    if (!userSnap.exists && !authUser) {
      return res.status(404).json({ success: false, error: 'Account not found.' });
    }

    const userData = userSnap.data() || {};
    const email = String(userData.email || authUser?.email || '').trim().toLowerCase();
    const isInternalEmail = email.endsWith('@studio-os.internal');
    const loginId = userData.loginId || (isInternalEmail ? email.replace(/@studio-os\.internal$/i, '') : email);
    const rawAccountType = String(userData.accountType || '').toUpperCase();
    const accountType =
      rawAccountType === 'MASTER_ADMIN' || email === MASTER_ADMIN_EMAIL
        ? 'MASTER_ADMIN'
        : rawAccountType === 'EMPLOYEE'
          ? 'EMPLOYEE'
          : 'STUDIO_OWNER';

    const studioId = userData.studioId || null;
    let studioInfo: Record<string, any> | null = null;
    let businessSummary: Record<string, any> | null = null;
    let employeeDetails: Record<string, any> | null = null;

    if (studioId) {
      const studioRef = adminCtx.db.collection('studios').doc(studioId);
      const studioSnap = await studioRef.get();
      if (studioSnap.exists) {
        const s = studioSnap.data() || {};
        studioInfo = {
          id: studioId,
          name: s.name || userData.studioName || studioId,
          city: s.city || '',
          state: s.state || '',
          subscriptionStatus: s.subscriptionStatus || 'trial',
          lifecycleStatus: s.lifecycleStatus || 'active',
          createdAt: s.createdAt || null
        };
      }

      if (accountType === 'STUDIO_OWNER') {
        const [customersSnap, bookingsSnap, quotationsSnap, invoicesSnap, paymentsSnap, employeesSnap] = await Promise.all([
          studioRef.collection('customers').get(),
          studioRef.collection('bookings').get(),
          studioRef.collection('quotations').get(),
          studioRef.collection('invoices').get(),
          studioRef.collection('payments').get(),
          studioRef.collection('employees').get()
        ]);

        const totalPaid = paymentsSnap.docs.reduce((sum: number, d: any) => {
          const p = d.data() || {};
          return sum + (Number(p.amount) || 0);
        }, 0);

        const totalInvoiced = invoicesSnap.docs.reduce((sum: number, d: any) => {
          const inv = d.data() || {};
          return sum + (Number(inv.totalAmount || inv.amount) || 0);
        }, 0);

        businessSummary = {
          customersCount: customersSnap.size,
          bookingsCount: bookingsSnap.size,
          quotationsCount: quotationsSnap.size,
          invoicesCount: invoicesSnap.size,
          paymentsCount: paymentsSnap.size,
          employeesCount: employeesSnap.size,
          totalPaidInr: totalPaid,
          totalInvoicedInr: totalInvoiced
        };
      } else if (accountType === 'EMPLOYEE' && userData.employeeId) {
        const empSnap = await studioRef.collection('employees').doc(userData.employeeId).get();
        if (empSnap.exists) {
          const e = empSnap.data() || {};
          employeeDetails = {
            employeeId: userData.employeeId,
            employeeNumber: e.employeeNumber || '',
            department: e.department || userData.department || '',
            designation: e.designation || userData.designation || '',
            roleName: e.roleName || userData.roleTitle || '',
            employmentStatus: e.employmentStatus || 'active',
            dateOfJoining: e.dateOfJoining || null
          };
        }
      }
    }

    return res.status(200).json({
      success: true,
      detail: {
        uid,
        accountType,
        displayName: userData.displayName || authUser?.displayName || loginId,
        loginId,
        contactEmail: isInternalEmail ? '' : email,
        phone: userData.phone || userData.mobile || '',
        roleTitle: userData.roleTitle || userData.roleName || userData.designation || (accountType === 'MASTER_ADMIN' ? 'Master Super Admin' : accountType === 'STUDIO_OWNER' ? 'Studio Owner' : 'Employee'),
        status: authUser?.disabled ? 'deactivated' : (userData.status || 'active'),
        createdAt: userData.createdAt || authUser?.metadata?.creationTime || null,
        updatedAt: userData.updatedAt || null,
        lastLoginAt: userData.lastLoginAt || authUser?.metadata?.lastSignInTime || null,
        providers: (authUser?.providerData || []).map((p: any) => p.providerId),
        studio: studioInfo,
        businessSummary,
        employeeDetails
      }
    });
  } catch (err: any) {
    console.error('[api/accounts/detail] Error:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to load account details.'
    });
  }
}
