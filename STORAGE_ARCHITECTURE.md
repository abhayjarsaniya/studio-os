# Studio OS – Firebase Storage Architecture

## 1. Storage Bucket Details

- **Live Bucket**: `studio-os-live-2026.firebasestorage.app`
- **Region**: Default Cloud Storage Multi-Region
- **Security Rules**: `storage.rules`

---

## 2. Partitioning & 12 Photography Categories

Every uploaded asset is strictly path-partitioned by studio ID and operational category:

```
gs://studio-os-live-2026.firebasestorage.app/
│
├── studios/{studioId}/
│   ├── branding/             # Studio logo, watermarks, stamps
│   ├── employees/            # Profile photos, ID verification documents
│   ├── customers/            # Customer intake documents, reference photos
│   ├── bookings/             # Booking contracts, service agreements
│   ├── events/               # Event production sheets, call sheets
│   ├── subEvents/            # Function schedules, venue site maps
│   ├── quotations/           # Generated quotation PDFs
│   ├── invoices/             # GST invoices, receipt vouchers
│   ├── receipts/             # Customer advance & milestone payment receipts
│   ├── deliverables/         # Low-res album previews, trailer teasers
│   ├── documents/            # General business licenses, agreements
│   └── supplier-documents/   # Vendor contracts, equipment rental bills
│
└── public/studios/{studioId}/ # Public web-accessible branding assets
```

---

## 3. High-Volume RAW Photography & Video Footage Handling

Photography studios capture terabytes of camera RAW files (`.CR3`, `.NEF`, `.ARW`, `.DNG`) and ProRes/4K video clips per wedding.
Studio OS uses an intelligent two-tier storage architecture:

1. **Direct Web Uploads (< 100MB)**:
   - Uploaded directly to Firebase Storage via resumable upload streams with real-time percentage progress.
   - Metadata document is automatically created in `/studios/{studioId}/documents/{docId}`.

2. **RAW File Object Abstraction (> 100MB)**:
   - Identified automatically via `firebaseStorageService.isRawAsset(file)`.
   - Links to local NAS, Google Drive, Dropbox, or object storage pre-signed URLs are maintained with full checksum verification, crew ownership, and deliverable status tracking.
