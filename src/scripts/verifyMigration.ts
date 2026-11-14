import fs from 'fs';
import path from 'path';
import os from 'os';
import https from 'https';

const PROJECT_ID = 'studio-os-live-2026';
const DATABASE_ID = '(default)';
const BASE_DOC_PATH = `projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents`;

export interface LiveVerificationReport {
  isDatabaseEmpty: boolean;
  rootCollections: string[];
  studioCollectionsCount: Record<string, number>;
  verifiedRecords: {
    productionStudiosCount: number;
    platformMasterAdmin: boolean;
    studioOwnerProfile: boolean;
    employeesCount: number;
    customersCount: number;
    bookingsCount: number;
    eventsCount: number;
    subEventsCount: number;
    tasksCount: number;
    quotationsCount: number;
    invoicesCount: number;
    paymentsCount: number;
  };
  sampleDocumentInspection: {
    studioDocument: any;
    leadEmployee: any;
    firstBooking: any;
  };
  passedAcceptanceTests: number;
  totalAcceptanceTests: number;
}

export class FirestoreVerifier {
  private token: string;

  constructor() {
    const confPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
    const conf = JSON.parse(fs.readFileSync(confPath, 'utf8'));
    this.token = conf.tokens.access_token;
  }

  private async request(pathStr: string, method: string = 'GET', postData?: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'firestore.googleapis.com',
        path: pathStr,
        method,
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {})
        }
      }, res => {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(body));
            } catch {
              resolve(body);
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          }
        });
      });
      req.on('error', reject);
      if (postData) req.write(postData);
      req.end();
    });
  }

  async listRootCollections(): Promise<string[]> {
    const res = await this.request(`/v1/${BASE_DOC_PATH}:listCollectionIds`, 'POST', '{}');
    return res.collectionIds || [];
  }

  async listDocuments(collectionPath: string, pageSize: number = 100): Promise<any[]> {
    try {
      const res = await this.request(`/v1/${BASE_DOC_PATH}/${collectionPath}?pageSize=${pageSize}`);
      return res.documents || [];
    } catch {
      return [];
    }
  }

  async getDocument(docPath: string): Promise<any | null> {
    try {
      return await this.request(`/v1/${BASE_DOC_PATH}/${docPath}`);
    } catch {
      return null;
    }
  }
}

export async function verifyLiveMigration(): Promise<LiveVerificationReport> {
  const verifier = new FirestoreVerifier();

  // 1. Root collections
  const rootCollections = await verifier.listRootCollections();
  const isDatabaseEmpty = rootCollections.length === 0;

  // 2. Multi-tenant studio documents
  const studioId = 'studio_shreeji_films';
  const employeesDocs = await verifier.listDocuments(`studios/${studioId}/employees`);
  const customersDocs = await verifier.listDocuments(`studios/${studioId}/customers`);
  const bookingsDocs = await verifier.listDocuments(`studios/${studioId}/studio_bookings_v2`);
  const eventsDocs = await verifier.listDocuments(`studios/${studioId}/events`);
  const subEventsDocs = await verifier.listDocuments(`studios/${studioId}/subEvents`);
  const tasksDocs = await verifier.listDocuments(`studios/${studioId}/tasks`);
  const quotationsDocs = await verifier.listDocuments(`studios/${studioId}/quotations`);
  const invoicesDocs = await verifier.listDocuments(`studios/${studioId}/invoices`);
  const paymentsDocs = await verifier.listDocuments(`studios/${studioId}/payments`);

  // 3. Platform & user inspections
  const studioDirectoryDocs = await verifier.listDocuments('studioDirectory');
  const masterAdminDoc = await verifier.getDocument('masterAdmins/usr_master_admin_primary');
  const studioOwnerUserDoc = await verifier.getDocument('users/usr_owner_shreeji_primary');
  const shreejiStudioDoc = await verifier.getDocument(`studios/${studioId}`);

  let passedTests = 0;
  const totalTests = 12;

  if (!isDatabaseEmpty) passedTests++;
  if (studioDirectoryDocs.length === 1) passedTests++;
  if (masterAdminDoc) passedTests++;
  if (studioOwnerUserDoc) passedTests++;
  if (employeesDocs.length >= 14) passedTests++;
  if (customersDocs.length >= 25) passedTests++;
  if (bookingsDocs.length >= 25) passedTests++;
  if (eventsDocs.length >= 25) passedTests++;
  if (subEventsDocs.length >= 11) passedTests++;
  if (tasksDocs.length >= 100) passedTests++;
  if (quotationsDocs.length >= 25) passedTests++;
  if (invoicesDocs.length >= 25) passedTests++;

  return {
    isDatabaseEmpty,
    rootCollections,
    studioCollectionsCount: {
      employees: employeesDocs.length,
      customers: customersDocs.length,
      bookings: bookingsDocs.length,
      events: eventsDocs.length,
      subEvents: subEventsDocs.length,
      tasks: tasksDocs.length,
      quotations: quotationsDocs.length,
      invoices: invoicesDocs.length,
      payments: paymentsDocs.length
    },
    verifiedRecords: {
      productionStudiosCount: studioDirectoryDocs.length,
      platformMasterAdmin: Boolean(masterAdminDoc),
      studioOwnerProfile: Boolean(studioOwnerUserDoc),
      employeesCount: employeesDocs.length,
      customersCount: customersDocs.length,
      bookingsCount: bookingsDocs.length,
      eventsCount: eventsDocs.length,
      subEventsCount: subEventsDocs.length,
      tasksCount: tasksDocs.length,
      quotationsCount: quotationsDocs.length,
      invoicesCount: invoicesDocs.length,
      paymentsCount: paymentsDocs.length
    },
    sampleDocumentInspection: {
      studioDocument: shreejiStudioDoc?.fields?.name?.stringValue || null,
      leadEmployee: employeesDocs[0]?.fields?.fullName?.stringValue || null,
      firstBooking: bookingsDocs[0]?.fields?.title?.stringValue || null
    },
    passedAcceptanceTests: passedTests,
    totalAcceptanceTests: totalTests
  };
}

if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('verifyMigration')) {
  console.log('========================================================================');
  console.log('STUDIO OS — CLOUD FIRESTORE LIVE DATABASE VERIFICATION');
  console.log('========================================================================');
  verifyLiveMigration()
    .then(report => {
      console.log('Live Database Empty:', report.isDatabaseEmpty ? 'YES (FAILURE)' : 'NO (POPULATED & ACTIVE)');
      console.log('Root Collections Detected:', report.rootCollections.join(', '));
      console.log('\n--- Verified Document Counts in Cloud Firestore ---');
      console.log('Production Studios:', report.verifiedRecords.productionStudiosCount);
      console.log('Platform Master Admin:', report.verifiedRecords.platformMasterAdmin ? 'VERIFIED' : 'MISSING');
      console.log('Studio Owner Account:', report.verifiedRecords.studioOwnerProfile ? 'VERIFIED' : 'MISSING');
      console.log('Employees:', report.verifiedRecords.employeesCount);
      console.log('Customers:', report.verifiedRecords.customersCount);
      console.log('Bookings:', report.verifiedRecords.bookingsCount);
      console.log('Events:', report.verifiedRecords.eventsCount);
      console.log('Sub-Events (Weddings):', report.verifiedRecords.subEventsCount);
      console.log('Tasks & Delivery Items:', report.verifiedRecords.tasksCount);
      console.log('Quotations:', report.verifiedRecords.quotationsCount);
      console.log('Invoices:', report.verifiedRecords.invoicesCount);
      console.log('Payments:', report.verifiedRecords.paymentsCount);
      console.log('\n--- Sample Document Inspection ---');
      console.log('Studio Name:', report.sampleDocumentInspection.studioDocument);
      console.log('Lead Employee:', report.sampleDocumentInspection.leadEmployee);
      console.log('First Booking:', report.sampleDocumentInspection.firstBooking);
      console.log(`\nAcceptance Status: ${report.passedAcceptanceTests}/${report.totalAcceptanceTests} Tests Passed`);
      process.exit(0);
    })
    .catch(err => {
      console.error('Verification failed:', err);
      process.exit(1);
    });
}
