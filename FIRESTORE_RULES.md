# Studio OS – Cloud Firestore Security Rules

## 1. Overview & Deployment Status

- **Status**: ✅ **Live & Deployed** on project `studio-os-live-2026`.
- **Target Database**: `projects/studio-os-live-2026/databases/(default)`
- **Rules Version**: 2

Deploy command:
```bash
npx firebase deploy --only firestore:rules --project studio-os-live-2026
```

---

## 2. Multi-Tenant Security Architecture

### Strict Isolation Core Principles:
1. **Studio Tenants**: Every studio has its own isolated document tree under `/studios/{studioId}/...`.
2. **Access Assertion**:
   - `isStudioMember(studioId)`: Verifies that `request.auth.uid` has an active document in `/studios/{studioId}/members/{uid}`.
   - `isStudioOwner(studioId)`: Verifies active membership with `role == 'owner'`.
3. **Platform Scope**:
   - Platform collections (`/platform/subscriptionPlans/items`, `/platform/auditLogs/items`) are restricted to Master Admin users (`request.auth.token.role == 'master_admin'`).

---

## 3. Collections & Access Matrix

| Collection Path | Read Access | Create / Write Access | Delete Access |
|---|---|---|---|
| `/studios/{studioId}/profile/{docId}` | Authenticated Studio Member | Studio Owner | Denied |
| `/studios/{studioId}/branches/{docId}` | Studio Member | Studio Owner | Studio Owner |
| `/studios/{studioId}/members/{memberUid}` | Studio Member | Studio Owner | Studio Owner |
| `/studios/{studioId}/employees/{docId}` | Studio Member | Studio Owner | Denied |
| `/studios/{studioId}/customers/{docId}` | Studio Member | Studio Member | Studio Owner |
| `/studios/{studioId}/bookings/{docId}` | Studio Member | Studio Member | Studio Owner |
| `/studios/{studioId}/events/{docId}` | Studio Member | Studio Member | Studio Owner |
| `/studios/{studioId}/subEvents/{docId}` | Studio Member | Studio Member | Studio Owner |
| `/studios/{studioId}/tasks/{docId}` | Studio Member | Studio Member | Studio Member |
| `/studios/{studioId}/quotations/{docId}` | Studio Member | Studio Member | Studio Owner |
| `/studios/{studioId}/invoices/{docId}` | Studio Member | Studio Member | Denied |
| `/studios/{studioId}/receipts/{docId}` | Studio Member | Studio Member | Denied |
| `/studios/{studioId}/payments/{docId}` | Studio Member | Studio Member | Denied |
| `/studios/{studioId}/deliverables/{docId}` | Studio Member | Studio Member | Studio Member |
| `/studios/{studioId}/documents/{docId}` | Studio Member | Studio Member | Studio Member |
| `/studios/{studioId}/auditLogs/{docId}` | Studio Owner | Cloud Function / System | Denied (Immutable) |
| `/platform/subscriptionPlans/items/{id}` | Public Read | Master Admin Only | Master Admin Only |
