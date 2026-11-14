/**
 * Studio OS Cloud Functions (Node 22 / TypeScript)
 * 
 * IMPORTANT ARCHITECTURE RULE:
 * Cloud Functions using the Firebase Admin SDK bypass Firestore security rules.
 * Therefore, every function must perform its own explicit tenant authorization checks:
 * 1. Verify caller UID
 * 2. Verify caller has active membership in studios/{studioId}/members/{callerUid}
 * 3. Verify caller role permissions before writing or reading protected data.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

// Helper to assert tenant access on backend
async function verifyTenantMembership(studioId: string, callerUid: string, requiredRole?: string) {
  if (!studioId || !callerUid) {
    throw new functions.https.HttpsError('unauthenticated', 'Studio ID and authentication required.');
  }

  const memberDoc = await db
    .collection('studios')
    .doc(studioId)
    .collection('members')
    .doc(callerUid)
    .get();

  if (!memberDoc.exists || memberDoc.data()?.status !== 'active') {
    throw new functions.https.HttpsError('permission-denied', 'User is not an active member of this studio.');
  }

  const member = memberDoc.data();
  if (requiredRole && member?.role !== requiredRole && !member?.roleIds?.includes(requiredRole)) {
    throw new functions.https.HttpsError('permission-denied', `Requires ${requiredRole} permission.`);
  }

  return member;
}

/**
 * Callable function to create an audit log securely from backend
 */
export const logStudioActivity = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
  const callerUid = context.auth?.uid;
  if (!callerUid) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required.');
  }

  const { studioId, action, entityType, entityId, details } = data;
  await verifyTenantMembership(studioId, callerUid);

  const logRef = db
    .collection('studios')
    .doc(studioId)
    .collection('auditLogs')
    .doc();

  await logRef.set({
    id: logRef.id,
    studioId,
    userId: callerUid,
    action,
    entityType,
    entityId,
    details: details || {},
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    ipAddress: context.rawRequest?.ip || null
  });

  return { success: true, logId: logRef.id };
});

/**
 * Background trigger: When an event status changes to Completed, update studio metrics
 */
export const onEventStatusChange = functions.firestore
  .document('studios/{studioId}/events/{eventId}')
  .onUpdate(async (change: functions.Change<functions.firestore.DocumentSnapshot>, context: functions.EventContext) => {
    const { studioId, eventId } = context.params;
    const beforeData = change.before.data();
    const afterData = change.after.data();

    if (!beforeData || !afterData) {
      return;
    }

    if (beforeData.status !== afterData.status) {
      // Append to immutable status history in event subcollection
      await change.after.ref.collection('statusHistory').add({
        fromStatus: beforeData.status,
        toStatus: afterData.status,
        changedAt: admin.firestore.FieldValue.serverTimestamp(),
        changedBy: afterData.updatedBy || 'system'
      });

      // Log in audit log
      await db
        .collection('studios')
        .doc(studioId)
        .collection('auditLogs')
        .add({
          action: 'EVENT_STATUS_UPDATED',
          entityType: 'event',
          entityId: eventId,
          details: { from: beforeData.status, to: afterData.status },
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
    }
  });
