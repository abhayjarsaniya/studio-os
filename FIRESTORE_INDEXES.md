# Studio OS – Cloud Firestore Composite Indexes

## 1. Overview & Deployment Status

- **Status**: ✅ **Live & Deployed** on project `studio-os-live-2026`.
- **Target Database**: `projects/studio-os-live-2026/databases/(default)`

Deploy command:
```bash
npx firebase deploy --only firestore:indexes --project studio-os-live-2026
```

---

## 2. Active Composite Indexes

| Collection Group | Fields | Query Scope | Use Case |
|---|---|---|---|
| `events` | `status` (ASC), `startDate` (ASC) | `COLLECTION` | Filter events by workflow status sorted chronologically |
| `events` | `category` (ASC), `startDate` (ASC) | `COLLECTION` | Filter events by photography genre (Wedding, Corporate, etc.) |
| `events` | `branchId` (ASC), `startDate` (ASC) | `COLLECTION` | Multi-branch scheduling and studio calendar |
| `bookings` | `status` (ASC), `eventDate` (ASC) | `COLLECTION` | Active confirmed bookings ordered by upcoming event date |
| `bookings` | `customerId` (ASC), `createdAt` (DESC) | `COLLECTION` | Customer timeline and booking history |
| `tasks` | `status` (ASC), `dueDate` (ASC) | `COLLECTION` | Urgent task management & pending milestones |
| `tasks` | `assignedToId` (ASC), `dueDate` (ASC) | `COLLECTION` | Employee-specific task queues and crew production boards |
| `invoices` | `status` (ASC), `dueDate` (ASC) | `COLLECTION` | Overdue and unpaid billing collection workflows |
| `payments` | `status` (ASC), `paymentDate` (DESC) | `COLLECTION` | Studio financial ledgers and cashflow tracking |
| `deliverables` | `status` (ASC), `deadline` (ASC) | `COLLECTION` | Photo album & video editing delivery tracking |
