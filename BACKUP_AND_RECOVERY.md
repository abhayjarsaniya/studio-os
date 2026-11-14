# Studio OS – Backup, Disaster Recovery & High Availability

## 1. Automated Cloud Firestore Backups

For enterprise data protection, Firebase Firestore supports automated daily backups via Google Cloud:

```bash
# Configure daily scheduled backup via gcloud CLI
gcloud firestore backups schedules create \
  --database='(default)' \
  --recurrence=daily \
  --retention=30d \
  --project=studio-os-live-2026
```

---

## 2. On-Demand JSON Export

To perform a point-in-time snapshot export of all studio records:

```bash
# Export all Firestore collections to Google Cloud Storage
gcloud firestore export gs://studio-os-live-2026-backups/$(date +%Y-%m-%d) \
  --project=studio-os-live-2026
```

---

## 3. Disaster Recovery Runbook

1. **Database Restoration**:
   ```bash
   gcloud firestore import gs://studio-os-live-2026-backups/<backup-folder> \
     --project=studio-os-live-2026
   ```
2. **Client-Side Cache Invalidation**:
   If a client device has conflicting offline state, the client automatically reconciles on reconnect using server timestamps (`_updatedAt`).
3. **Audit Log Verification**:
   All administrative actions are logged in immutable audit records under `/studios/{studioId}/auditLogs` and `/platform/auditLogs`.
