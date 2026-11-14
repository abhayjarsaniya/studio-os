# STUDIO OS — FIREBASE PRODUCTION SETUP & DEPLOYMENT GUIDE

**Phase:** 11 — Responsive Testing, Quality Assurance & Production Preparation  
**Target Environments:** Development, Staging, Production  
**Firebase Services:** Authentication, Cloud Firestore, Firebase Storage, Cloud Functions, Security Rules  

---

## 1. Project Architecture & Environments

To ensure strict separation between test environments and live studio business records, three independent Firebase projects must be provisioned:

1. `studio-os-dev`: Local emulators & automated CI/CD test runners.
2. `studio-os-staging`: Pre-production release validation & studio pilot feedback.
3. `studio-os-prod`: Live production environment for paying photography studio tenants.

---

## 2. Cloud Firestore Configuration

### 1. Root Collection Structure
```
platform/
  settings/global
  subscriptionPlans/{planId}
  studioSubscriptions/{subId}
  subscriptionInvoices/{invoiceId}
  subscriptionPayments/{paymentId}
  featureCatalog/{key}
  announcements/{announcementId}
  supportTickets/{ticketId}
  supportAccessGrants/{grantId}
  auditLogs/{logId}

studios/
  {studioId}/
    profile (document)
    settings (document)
    customers/{customerId}
    leads/{leadId}
    events/{eventId}
    subEvents/{subEventId}
    tasks/{taskId}
    workflowInstances/{workflowId}
    employees/{employeeId}
    salaryProfiles/{profileId}
    payrollRuns/{runId}
    leaveRequests/{requestId}
    quotations/{quotationId}
    invoices/{invoiceId}
    payments/{paymentId}
    expenses/{expenseId}
    notifications/{notificationId}
    messageLogs/{logId}
```

### 2. Indexes Deployment
Deploy all composite indexes defined in `firestore.indexes.json`:
```bash
firebase deploy --only firestore:indexes --project studio-os-prod
```

### 3. Security Rules Deployment
Deploy the strict production security rules defined in `firestore.rules`:
```bash
firebase deploy --only firestore:rules --project studio-os-prod
```

---

## 3. Firebase Authentication Setup

1. **Sign-In Providers**: Enable **Email/Password** provider in Firebase Console.
2. **Authorized Domains**: Add production custom domains (e.g., `app.studioos.com`, `platform.studioos.com`).
3. **Session Cookies & Expiration**: Configure 14-day token refresh lifetime.
4. **Custom Claims**: Set custom claims for studio tenant association and platform admin authorization:
   - `{ studioId: 'studio_royal_001', role: 'owner' }` for studio tenants.
   - `{ isPlatformAdmin: true, platformRole: 'super_admin' }` for SaaS administrators.

---

## 4. Firebase Storage Configuration

1. **Storage Buckets**: Multi-region or standard regional bucket located in `asia-south1` (Mumbai) for low-latency Indian photography studio access.
2. **Path Convention**: `studios/{studioId}/{documentType}/{fileName}`.
3. **Security Rules Deployment**:
   ```bash
   firebase deploy --only storage --project studio-os-prod
   ```

---

## 5. Cloud Functions Deployment

1. Set runtime environment variables using Google Cloud Secret Manager.
2. Deploy functions:
   ```bash
   firebase deploy --only functions --project studio-os-prod
   ```
3. Set webhook endpoint URL in Razorpay / Cashfree dashboard for subscription processing.
