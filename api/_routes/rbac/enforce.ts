import { verifyFirebaseCaller, getFirebaseAdmin } from '../../_lib/razorpayServer';
import {
  resolveServerPermissions,
  checkBundlePermission,
  sanitizeRecordByPermissions
} from '../../_lib/rbacServer';

/**
 * Server-side RBAC enforcement endpoint.
 * Verifies the caller's live permissions from Firestore before allowing protected operations
 * or returning sanitized module records.
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

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const { studioId, moduleId, actionId, record } = body;

  if (!moduleId || !actionId) {
    return res.status(400).json({ success: false, error: 'moduleId and actionId are required.' });
  }

  const bundle = await resolveServerPermissions(caller, studioId);
  if (bundle.isDeactivated) {
    return res.status(403).json({
      success: false,
      allowed: false,
      error: 'Account is deactivated.'
    });
  }

  const allowed = checkBundlePermission(bundle, moduleId, actionId);
  if (!allowed) {
    return res.status(403).json({
      success: false,
      allowed: false,
      error: `Forbidden: Missing "${actionId}" permission on "${moduleId}".`
    });
  }

  // If a record payload is provided for read sanitization, strip unauthorized PII/financial fields
  const sanitizedRecord = record ? sanitizeRecordByPermissions(record, moduleId, bundle) : undefined;

  return res.status(200).json({
    success: true,
    allowed: true,
    scope: bundle.scopes[moduleId] || 'all',
    sanitizedRecord
  });
}
