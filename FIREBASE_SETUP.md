# 🔥 STUDIO OS — FIREBASE LIVE PRODUCTION SETUP & CONFIGURATION GUIDE

This document details the configuration, credentials, storage architecture, security rules, indexes, and verification commands for the connected production project **Studio OS Live**.

---

## 1. Connected Production Project Details

- **Project Display Name**: `Studio OS Live`
- **Project ID**: `studio-os-live-2026`
- **Project Number**: `851069455245`
- **Web App ID**: `1:851069455245:web:c36ea75fb5b132b5cb4bc4`
- **Firestore Database**: `(default)` (Native Mode, Multi-Region)
- **Cloud Storage Bucket**: `studio-os-live-2026.firebasestorage.app`
- **Auth Domain**: `studio-os-live-2026.firebaseapp.com`
- **CLI Configuration**: Target alias configured in `.firebaserc` (`default: studio-os-live-2026`)

---

## 2. Environment Variables (`.env`)

```env
# Studio OS - Live Firebase Production Configuration
VITE_FIREBASE_API_KEY=AIzaSyBdN6SpgPVAVD6JPEHbnfa_I2wM6BEodhk
VITE_FIREBASE_AUTH_DOMAIN=studio-os-live-2026.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=studio-os-live-2026
VITE_FIREBASE_STORAGE_BUCKET=studio-os-live-2026.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=851069455245
VITE_FIREBASE_APP_ID=1:851069455245:web:c36ea75fb5b132b5cb4bc4

# Connection Modes
VITE_USE_FIREBASE_EMULATOR=false
VITE_AUTH_BYPASS=false
```

---

## 3. Storage Bucket Structure (`studio-os-live-2026.firebasestorage.app`)

Files are strictly compartmentalized by studio ID:

```
studios/{studioId}/
  ├── branding/                  # Studio logos, high-res banners, watermark PNGs
  ├── employees/                 # Employee passport photos, government ID scans
  ├── customers/                 # Customer ID proofs, agreement scans
  ├── bookings/{bookingId}/      # Event contract PDFs, timeline sheets
  ├── quotations/                # Generated quotation PDFs
  ├── invoices/                  # Signed tax invoice PDFs
  ├── receipts/                  # Payment acknowledgment vouchers
  ├── deliverables/              # Hero web-optimized JPGs, teaser thumbnails
  └── documents/                 # General studio operational documents
```

---

## 4. Security Rules & Deployment

Security rules enforce multi-tenant isolation, administrative boundaries, and employee permission scopes.

Deploy rules to the live project at any time:
```bash
npx firebase deploy --only firestore:rules
npx firebase deploy --only storage
```

---

## 5. Compound Firestore Indexes

Composite indexes are defined in `firestore.indexes.json` and deployed:
```bash
npx firebase deploy --only firestore:indexes
```

Covered query paths:
- `events` by `(status ASC, startDate ASC)`
- `events` by `(category ASC, startDate ASC)`
- `bookings` by `(status ASC, eventDate ASC)`
- `tasks` by `(assignedToId ASC, dueDate ASC)`
- `payments` by `(status ASC, paymentDate DESC)`
- `deliverables` by `(status ASC, deadline ASC)`

---

## 6. Verification and Migration Scripts

Run the built-in migration suite directly using Node / tsx:

```bash
# 1. Pre-flight data inventory & integrity check
npx tsx src/scripts/inspectMigration.ts

# 2. Execute full database migration & populate collections
npx tsx src/scripts/migrateStudioOS.ts

# 3. Live Cloud Firestore database audit & verification
npx tsx src/scripts/verifyMigration.ts
```
