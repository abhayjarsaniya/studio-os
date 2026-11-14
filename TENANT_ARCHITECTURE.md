# Studio OS – Multi-Tenant SaaS Architecture

## 1. Multi-Tenant Philosophy

In Studio OS, multiple independent photography studios operate on a shared infrastructure while maintaining complete isolation of data, settings, and business records.

### Core Tenancy Principles:
1. **Partition by `studioId`**: Every business entity (events, customers, tasks, invoices, crew memberships) resides within `studios/{studioId}/...`.
2. **Explicit Studio Requirement**: All backend and frontend service methods demand an explicit `studioId`. No method is allowed to default or guess a tenant ID.
3. **No Cross-Tenant Queries**: Firestore security rules restrict queries to documents where the requesting user holds an active membership.
4. **Independent Pricing Model**: The SaaS subscription is **₹500 per studio per month** (not per employee). A studio can add unlimited photographers, cinematographers, and clients under its single subscription.

---

## 2. Multi-Branch Support

Each studio can establish multiple branches (e.g. Flagship Studio, Outstation Branch, Destination Resort Desk).
- Document path: `studios/{studioId}/branches/{branchId}`.
- Every event and team assignment can be tagged with a `branchId`.
- The top-level studio owner and managers retain aggregated visibility across all studio branches.

---

## 3. Separation of Concerns & Financial Isolation

- Ordinary shoot documents in `studios/{studioId}/events/{eventId}` hold creative and scheduling data (timings, venue, shot list, crew assignments).
- Sensitive financial billing details reside in `studios/{studioId}/invoices/{invoiceId}` and `payments/{paymentId}`.
- Photographers and video editors have access to shoot timelines, but only Owners and Managers can access invoice records.

---

## 4. Global Users vs. Studio Memberships

A single global user (`users/{uid}`) can belong to multiple studios:
- e.g. A freelance lead photographer can be an active member of both **Royal Photography** (Mumbai) and **Creative Wedding Studio** (Goa).
- In each studio, they hold distinct roles, permissions, and department assignments via `studios/{studioId}/members/{memberId}`.

---

## 5. Sequential Event Identifiers & Tenant Counter Isolation

To maintain professional, human-readable IDs (`EVT-YYYY-000001`):
1. **Studio-Scoped Counters**: The event sequence number is strictly partitioned per studio. Studio A's `EVT-2026-000001` is entirely distinct from Studio B's `EVT-2026-000001`.
2. **Deterministic & Concurrency-Safe**: Counter increments are tracked inside the tenant's profile metadata (`studios/{studioId}.eventCounter`) using transaction-safe counters.
3. **Audit History Scoping**: Every status update logs a record containing the operator's ID, name, old/new status, and optional remarks into the event's embedded `statusHistory` array and the studio's `auditLogs` collection.

