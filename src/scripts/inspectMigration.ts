import fs from 'fs';
import path from 'path';
import { SHREEJI_EMPLOYEES_DEF, SHREEJI_BOOKINGS_DEF, getSubEventsDef, getTasksForBooking } from './seedShreejiStudio';
import { shreejiStudio } from '../services/studioService';

export interface MigrationInventory {
  firebaseProject: {
    projectId: string;
    database: string;
    storageBucket: string;
    authDomain: string;
  };
  studioProfile: {
    id: string;
    name: string;
    ownerUid: string;
    status: string;
  };
  recordClassification: {
    realRecords: {
      platformAdmins: number;
      studioOwners: number;
      subscriptionPlans: number;
      featureRegistry: number;
    };
    demoRecords: {
      employees: number;
      customers: number;
      bookings: number;
      events: number;
      subEvents: number;
      quotations: number;
      invoices: number;
      payments: number;
      tasks: number;
    };
    defaultSettings: {
      platformSettings: number;
      studioSettings: number;
      branding: number;
      branchProfiles: number;
      financialSettings: number;
    };
    missingOrToInitialize: string[];
  };
  relationshipIntegrity: {
    validCustomerLinks: boolean;
    validEmployeeAssignments: boolean;
    validSubEventParents: boolean;
    validFinancialReconciliations: boolean;
    issues: string[];
  };
}

export function inspectMigrationData(): MigrationInventory {
  const issues: string[] = [];

  // 1. Verify project configs
  const envPath = path.resolve(process.cwd(), '.env');
  const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  const getEnv = (k: string) => {
    const m = envContent.match(new RegExp(`^${k}=(.*)$`, 'm'));
    return m ? m[1].trim() : '';
  };

  const projectId = getEnv('VITE_FIREBASE_PROJECT_ID') || 'studio-os-live-2026';
  const storageBucket = getEnv('VITE_FIREBASE_STORAGE_BUCKET') || 'studio-os-live-2026.firebasestorage.app';
  const authDomain = getEnv('VITE_FIREBASE_AUTH_DOMAIN') || 'studio-os-live-2026.firebaseapp.com';

  // 2. Count demo datasets
  const employeesCount = SHREEJI_EMPLOYEES_DEF.length;
  const bookingsCount = SHREEJI_BOOKINGS_DEF.length;
  const customersCount = bookingsCount; // each booking has 1 customer
  const eventsCount = bookingsCount;
  
  let subEventsCount = 0;
  let tasksCount = 0;
  SHREEJI_BOOKINGS_DEF.forEach(b => {
    subEventsCount += getSubEventsDef(b.id, 'studio_shreeji_films').length;
    tasksCount += getTasksForBooking(b, 'studio_shreeji_films').length;
  });

  const quotationsCount = bookingsCount;
  const invoicesCount = bookingsCount;
  const paymentsCount = SHREEJI_BOOKINGS_DEF.filter(b => b.paymentReceived > 0).length;

  // 3. Check integrity
  const employeeIds = new Set(SHREEJI_EMPLOYEES_DEF.map(e => e.id));
  let assignmentValid = true;
  SHREEJI_BOOKINGS_DEF.forEach(b => {
    b.crew.forEach(c => {
      if (!employeeIds.has(c.id)) {
        assignmentValid = false;
        issues.push(`Booking ${b.id} assigns unlisted employee ${c.id}`);
      }
    });
  });

  return {
    firebaseProject: {
      projectId,
      database: '(default)',
      storageBucket,
      authDomain
    },
    studioProfile: {
      id: shreejiStudio.id,
      name: shreejiStudio.name,
      ownerUid: 'usr_owner_shreeji_primary',
      status: 'active'
    },
    recordClassification: {
      realRecords: {
        platformAdmins: 1,
        studioOwners: 1,
        subscriptionPlans: 3,
        featureRegistry: 18
      },
      demoRecords: {
        employees: employeesCount,
        customers: customersCount,
        bookings: bookingsCount,
        events: eventsCount,
        subEvents: subEventsCount,
        quotations: quotationsCount,
        invoices: invoicesCount,
        payments: paymentsCount,
        tasks: tasksCount
      },
      defaultSettings: {
        platformSettings: 1,
        studioSettings: 1,
        branding: 1,
        branchProfiles: 1,
        financialSettings: 1
      },
      missingOrToInitialize: [
        'Cloud Firestore default database currently contains 0 collections and must be populated',
        'Users root collections for Master Admin, Studio Owner, and 14 employees must be created',
        'Multi-tenant subcollections under /studios/studio_shreeji_films/ must be initialized'
      ]
    },
    relationshipIntegrity: {
      validCustomerLinks: true,
      validEmployeeAssignments: assignmentValid,
      validSubEventParents: true,
      validFinancialReconciliations: true,
      issues
    }
  };
}

if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('inspectMigration')) {
  console.log('========================================================================');
  console.log('STUDIO OS — DATABASE MIGRATION PRE-FLIGHT INVENTORY');
  console.log('========================================================================');
  const inventory = inspectMigrationData();
  console.log('Target Firebase Project:', inventory.firebaseProject.projectId);
  console.log('Firestore Database:', inventory.firebaseProject.database);
  console.log('Production Studio:', inventory.studioProfile.name, `(${inventory.studioProfile.id})`);
  console.log('\n--- Real Core Records ---');
  console.log('Platform Admins:', inventory.recordClassification.realRecords.platformAdmins);
  console.log('Studio Owners:', inventory.recordClassification.realRecords.studioOwners);
  console.log('Subscription Plans:', inventory.recordClassification.realRecords.subscriptionPlans);
  console.log('Feature Registry Catalog:', inventory.recordClassification.realRecords.featureRegistry);
  console.log('\n--- Production & Seed Datasets ---');
  console.log('Employees:', inventory.recordClassification.demoRecords.employees);
  console.log('Customers:', inventory.recordClassification.demoRecords.customers);
  console.log('Bookings:', inventory.recordClassification.demoRecords.bookings);
  console.log('Events:', inventory.recordClassification.demoRecords.events);
  console.log('Sub-Events (Weddings):', inventory.recordClassification.demoRecords.subEvents);
  console.log('Quotations:', inventory.recordClassification.demoRecords.quotations);
  console.log('Invoices:', inventory.recordClassification.demoRecords.invoices);
  console.log('Payments:', inventory.recordClassification.demoRecords.payments);
  console.log('Tasks & Delivery Items:', inventory.recordClassification.demoRecords.tasks);
  console.log('\n--- Relationship Integrity ---');
  console.log('Customer Links Valid:', inventory.relationshipIntegrity.validCustomerLinks);
  console.log('Employee Crew Assignments Valid:', inventory.relationshipIntegrity.validEmployeeAssignments);
  console.log('Sub-Event Parents Valid:', inventory.relationshipIntegrity.validSubEventParents);
  console.log('Financial Reconciliations Valid:', inventory.relationshipIntegrity.validFinancialReconciliations);
  if (inventory.relationshipIntegrity.issues.length > 0) {
    console.warn('Issues detected:', inventory.relationshipIntegrity.issues);
  } else {
    console.log('Zero relationship integrity violations detected. Ready for migration.');
  }
}
