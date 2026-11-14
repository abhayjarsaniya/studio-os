# Studio OS – Data Migration & Synchronization Architecture

## 1. Cloud Auto-Save Engine (`TenantStore.set` Hook)

Studio OS features universal cloud data synchronization:
- Whenever any service in the application (`bookingProductionService`, `customerService`, `eventService`, `employeeService`, `taskService`, `salaryService`, etc.) calls `TenantStore.set(studioId, collection, data)`, the data is automatically and immediately sent to Firebase Firestore via `firestoreService.saveCollectionBatch` or `firestoreService.saveDocument`.
- Provides instant optimistic UI rendering locally with zero latency while asynchronously persisting directly to Cloud Firestore.

---

## 2. Seed Migration Service (`firebaseMigrationService.ts`)

To populate a fresh Firebase Firestore database with production demo data:

```typescript
import { firebaseMigrationService } from './services/firebaseMigrationService';

// Executes structured migration to Firestore
await firebaseMigrationService.seedAllToFirestore();
```

### Migrated Data Collections:
1. **Studio Profile**: `studios/std_demo_royal/profile/profile` (SHREEJI STUDIO).
2. **Branches**: `studios/std_demo_royal/branches` (Flagship & Executive suites).
3. **Employees / Crew**: `studios/std_demo_royal/employees` (Aarav, Kabir, Priya).
4. **Customers**: `studios/std_demo_royal/customers`.
5. **Events & Bookings**: `studios/std_demo_royal/events`.
6. **Production Tasks**: `studios/std_demo_royal/tasks`.
7. **Platform Subscription Plans**: `platform/subscriptionPlans/items`.
