import fs from 'fs';
import path from 'path';
import os from 'os';
import https from 'https';
import { 
  SHREEJI_EMPLOYEES_DEF, 
  SHREEJI_BOOKINGS_DEF, 
  getSubEventsDef, 
  getTasksForBooking,
  SEED_BATCH_ID,
  CREATED_BY_SEED
} from './seedShreejiStudio';
import { shreejiStudio } from '../services/studioService';

const PROJECT_ID = 'studio-os-live-2026';
const DATABASE_ID = '(default)';
const BASE_DOC_PATH = `projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents`;

// Helper to convert JS values to Firestore REST API Field format
function toFirestoreValue(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string') {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
      return { timestampValue: new Date(val).toISOString() };
    }
    return { stringValue: val };
  }
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return { integerValue: String(val) };
    return { doubleValue: val };
  }
  if (val instanceof Date) return { timestampValue: val.toISOString() };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === 'object') {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function objectToFirestoreFields(obj: Record<string, any>): Record<string, any> {
  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      fields[k] = toFirestoreValue(v);
    }
  }
  return fields;
}

export class FirestoreRestClient {
  private token: string;

  constructor() {
    const confPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
    if (!fs.existsSync(confPath)) {
      throw new Error(`Firebase tools config not found at ${confPath}`);
    }
    const conf = JSON.parse(fs.readFileSync(confPath, 'utf8'));
    this.token = conf.tokens.access_token;
  }

  async commitWrites(writes: Array<{ name: string; data: Record<string, any> }>): Promise<number> {
    if (writes.length === 0) return 0;

    const CHUNK_SIZE = 400; // Firestore allows up to 500 per commit
    let committedTotal = 0;

    for (let i = 0; i < writes.length; i += CHUNK_SIZE) {
      const chunk = writes.slice(i, i + CHUNK_SIZE);
      const commitPayload = JSON.stringify({
        writes: chunk.map(w => ({
          update: {
            name: `${BASE_DOC_PATH}/${w.name.replace(/^\//, '')}`,
            fields: objectToFirestoreFields(w.data)
          }
        }))
      });

      await new Promise<void>((resolve, reject) => {
        const req = https.request({
          hostname: 'firestore.googleapis.com',
          path: `/v1/${BASE_DOC_PATH}:commit`,
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(commitPayload)
          }
        }, res => {
          let body = '';
          res.on('data', d => body += d);
          res.on('end', () => {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              committedTotal += chunk.length;
              resolve();
            } else {
              reject(new Error(`Firestore commit failed [${res.statusCode}]: ${body}`));
            }
          });
        });

        req.on('error', reject);
        req.write(commitPayload);
        req.end();
      });
    }

    return committedTotal;
  }
}

export async function migrateStudioOS(): Promise<{
  totalCollectionsMigrated: number;
  totalDocumentsMigrated: number;
  collectionsMap: Record<string, number>;
}> {
  console.log('Starting full Cloud Firestore database migration for Studio OS Live...');
  const client = new FirestoreRestClient();
  const allWrites: Array<{ name: string; data: Record<string, any> }> = [];
  const collectionsMap: Record<string, number> = {};

  const addDoc = (collectionPath: string, docId: string, data: Record<string, any>) => {
    const fullPath = `${collectionPath}/${docId}`;
    allWrites.push({ name: fullPath, data });
    collectionsMap[collectionPath] = (collectionsMap[collectionPath] || 0) + 1;
  };

  const nowIso = new Date().toISOString();

  // =========================================================================
  // 1. PLATFORM ROOT COLLECTIONS (Section 3.A)
  // =========================================================================
  console.log('-> Preparing Platform Collections...');

  addDoc('platformSettings', 'general', {
    platformName: 'Studio OS Platform',
    version: '2.0.0',
    maintenanceMode: false,
    defaultCurrency: 'INR',
    defaultTimezone: 'Asia/Kolkata',
    maxStorageQuotaMb: 51200,
    enforceMandatoryUPIAutoPay: true,
    updatedAt: nowIso
  });

  addDoc('masterAdmins', 'usr_master_admin_primary', {
    id: 'usr_master_admin_primary',
    email: 'admin@studio-os.com',
    loginId: 'admin@studio-os.com',
    displayName: 'Platform Master Owner',
    phone: '+91 99000 11000',
    accountType: 'MASTER_ADMIN',
    roleId: 'master_super_admin',
    roleTitle: 'Master Super Admin',
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: nowIso
  });

  addDoc('studioDirectory', 'studio_shreeji_films', {
    studioId: 'studio_shreeji_films',
    name: 'SHREEJI FILMS AND PHOTOGRAPHY',
    ownerEmail: 'aarav@shreejifilms.in',
    ownerName: 'Aarav Patel',
    city: 'Ahmedabad',
    state: 'Gujarat',
    country: 'India',
    lifecycleStatus: 'active',
    visibility: 'visible',
    registeredAt: '2026-01-01T10:00:00Z',
    planId: 'studio_os_monthly',
    planName: 'Studio OS Monthly',
    monthlyPriceInr: 500,
    subscriptionStatus: 'active'
  });

  const plans = [
    { id: 'plan_monthly_starter', name: 'Studio OS Monthly', pricePaise: 50000, billingPeriod: 'monthly', features: ['crm', 'bookings', 'calendar', 'basic_finance'] },
    { id: 'plan_quarterly_pro', name: 'Studio OS Quarterly Pro', pricePaise: 135000, billingPeriod: 'quarterly', features: ['crm', 'bookings', 'calendar', 'crew', 'advanced_finance', 'deliverables'] },
    { id: 'plan_annual_enterprise', name: 'Studio OS Annual Elite', pricePaise: 480000, billingPeriod: 'annual', features: ['all_modules', 'custom_domain', 'priority_support'] }
  ];
  plans.forEach(p => addDoc('subscriptionPlans', p.id, p));

  addDoc('subscriptionMandates', 'mandate_shreeji_autopay', {
    id: 'mandate_shreeji_autopay',
    studioId: 'studio_shreeji_films',
    studioName: 'SHREEJI FILMS AND PHOTOGRAPHY',
    status: 'ACTIVE',
    umn: 'UMN-SHR-2026-92810',
    mandateReference: 'MNDT-SHR-AUTO-20260101',
    planId: 'studio_os_monthly',
    monthlyFeeInr: 500,
    currency: 'INR',
    gatewayMode: 'simulated_live_ready',
    createdAt: '2026-01-01T10:00:00Z',
    updatedAt: nowIso
  });

  const features = [
    'dashboard', 'calendar', 'bookings', 'crew', 'crm_customers', 'tasks_production',
    'financials', 'quotations', 'invoices', 'deliverables', 'sub_events', 'payroll',
    'leave_management', 'attendance', 'whatsapp_click_to_chat', 'client_gallery',
    'reports_analytics', 'storage_quota'
  ];
  features.forEach(f => addDoc('featureRegistry', `feat_${f}`, { id: `feat_${f}`, key: f, enabled: true, title: f.replace(/_/g, ' ') }));

  const globalRoles = [
    { id: 'role_master_super_admin', title: 'Platform Master Owner', tier: 'master' },
    { id: 'role_studio_owner', title: 'Studio Owner', tier: 'owner' },
    { id: 'role_production_manager', title: 'Production Manager', tier: 'manager' },
    { id: 'role_lead_photographer', title: 'Lead Photographer', tier: 'crew' },
    { id: 'role_cinematographer', title: 'Cinematographer', tier: 'crew' },
    { id: 'role_photo_editor', title: 'Photo Editor', tier: 'post_production' },
    { id: 'role_video_editor', title: 'Video Editor', tier: 'post_production' },
    { id: 'role_album_designer', title: 'Album Designer', tier: 'post_production' },
    { id: 'role_drone_operator', title: 'Drone Operator', tier: 'crew' },
    { id: 'role_assistant', title: 'Photography Assistant', tier: 'crew' }
  ];
  globalRoles.forEach(r => addDoc('globalRoles', r.id, r));

  addDoc('platformAuditLogs', 'log_init_001', { action: 'INITIALIZE_FIRESTORE', executedBy: 'system_migration_admin', timestamp: nowIso });
  addDoc('platformNotifications', 'notif_system_001', { title: 'Studio OS Production Live', message: 'Cloud Firestore database initialized for Shreeji Films and Photography.', createdAt: nowIso });
  addDoc('platformUsage', 'usage_studio_shreeji_films', { studioId: 'studio_shreeji_films', storageUsedBytes: 1310720000, totalBookings: 28, activeEmployees: 14, updatedAt: nowIso });
  addDoc('platformReports', 'rep_platform_q4_2026', { reportName: 'Q4 2026 Platform Health & Studio Operations', generatedAt: nowIso, totalRevenueInr: 2780000 });
  addDoc('platformConfiguration', 'sys_config', { activeStudioId: 'studio_shreeji_films', singleStudioEnforced: true, lightModeOnly: true, createdAt: nowIso });

  // =========================================================================
  // 2. USERS ROOT COLLECTION (Section 3.B)
  // =========================================================================
  console.log('-> Preparing User Collections & Subcollections...');

  const userAccounts = [
    { uid: 'usr_master_admin_primary', email: 'admin@studio-os.com', username: 'admin@studio-os.com', name: 'Platform Master Owner', accountType: 'MASTER_ADMIN', studioId: 'platform_master' },
    { uid: 'usr_owner_shreeji_primary', email: 'aarav@shreejifilms.in', username: 'aarav_shreeji', name: 'Aarav Patel', accountType: 'STUDIO_OWNER', studioId: 'studio_shreeji_films' }
  ];

  SHREEJI_EMPLOYEES_DEF.forEach(emp => {
    userAccounts.push({
      uid: `usr_${emp.id}`,
      email: emp.email,
      username: emp.id.replace('emp_shr_', ''),
      name: emp.fullName,
      accountType: 'EMPLOYEE',
      studioId: 'studio_shreeji_films'
    });
  });

  userAccounts.forEach(u => {
    addDoc('users', u.uid, {
      uid: u.uid,
      email: u.email,
      username: u.username,
      displayName: u.name,
      accountType: u.accountType,
      accountStatus: 'active',
      defaultStudioMembership: u.studioId,
      createdAt: '2026-01-01T09:00:00Z',
      lastLogin: nowIso
    });

    addDoc(`users/${u.uid}/memberships`, u.studioId, { studioId: u.studioId, role: u.accountType.toLowerCase(), status: 'active', joinedAt: '2026-01-01T09:00:00Z' });
    addDoc(`users/${u.uid}/preferences`, 'default', { theme: 'light', emailNotifications: true, whatsappNotifications: true, language: 'en-IN' });
    addDoc(`users/${u.uid}/notifications`, 'notif_welcome', { title: 'Welcome to Studio OS', message: `Welcome ${u.name} to Studio OS.`, timestamp: nowIso, read: true });
    addDoc(`users/${u.uid}/loginHistory`, 'log_recent', { ipAddress: '127.0.0.1', userAgent: 'Studio OS Desktop Web Client', timestamp: nowIso });
  });

  // =========================================================================
  // 3. MULTI-TENANT STUDIO COLLECTIONS (Section 3.C, Section 4-10)
  // =========================================================================
  console.log('-> Preparing Multi-Tenant Studio Collections for Shreeji Films...');

  const targetStudios = ['studio_shreeji_films', 'std_demo_royal'];

  for (const studioId of targetStudios) {
    const isPrimary = studioId === 'studio_shreeji_films';
    const sName = isPrimary ? 'SHREEJI FILMS AND PHOTOGRAPHY' : 'SHREEJI STUDIO';

    // Root Studio Doc
    addDoc('studios', studioId, {
      id: studioId,
      name: sName,
      ownerUid: 'usr_owner_shreeji_primary',
      address: '301, Titanium One, SG Highway, Bodakdev',
      city: 'Ahmedabad',
      state: 'Gujarat',
      country: 'India',
      pincode: '380054',
      phone: '+91 98250 11223',
      email: 'contact@shreejifilms.in',
      gstNumber: '24AAACR1122D1Z4',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      subscriptionStatus: 'active',
      accountStatus: 'active',
      isDemoData: false,
      createdAt: '2026-01-01T10:00:00Z',
      updatedAt: nowIso
    });

    // 1. Studio Configuration Subcollections
    addDoc(`studios/${studioId}/profile`, 'profile', {
      ...shreejiStudio,
      id: studioId,
      name: sName,
      updatedAt: nowIso
    });

    addDoc(`studios/${studioId}/settings`, 'settings', {
      defaultCurrency: 'INR',
      timezone: 'Asia/Kolkata',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '12h',
      allowDirectWhatsApp: true,
      watermarkEnabled: false,
      invoicePrefix: 'SHR-INV',
      eventPrefix: 'SHR-EV',
      updatedAt: nowIso
    });

    addDoc(`studios/${studioId}/branding`, 'branding', {
      studioName: sName,
      logoUrl: '/shreeji-logo.svg',
      primaryColor: '#18181b',
      secondaryColor: '#71717a',
      accentColor: '#f59e0b',
      updatedAt: nowIso
    });

    addDoc(`studios/${studioId}/branches`, 'branch_main_ahmedabad', {
      id: 'branch_main_ahmedabad',
      studioId,
      name: 'Main Flagship Branch • Bodakdev',
      address: '301, Titanium One, SG Highway, Bodakdev, Ahmedabad',
      phone: '+91 98250 11223',
      isHeadquarters: true,
      status: 'active'
    });

    addDoc(`studios/${studioId}/subscription`, 'current', {
      planId: 'studio_os_monthly',
      planName: 'Studio OS Monthly',
      status: 'active',
      monthlyPriceInr: 500,
      autoRenew: true,
      validUntil: '2027-12-31T23:59:59Z'
    });

    addDoc(`studios/${studioId}/featureOverrides`, 'overrides', {
      crm_customers: true,
      tasks_production: true,
      deliverables: true,
      leave_management: true,
      payroll: true,
      suppliers: true
    });

    // Members Subcollection
    userAccounts.forEach(u => {
      addDoc(`studios/${studioId}/members`, u.uid, {
        id: u.uid,
        userId: u.uid,
        studioId,
        displayName: u.name,
        email: u.email,
        role: u.accountType === 'STUDIO_OWNER' ? 'owner' : u.accountType === 'MASTER_ADMIN' ? 'owner' : 'crew',
        roleTitle: u.accountType === 'STUDIO_OWNER' ? 'Studio Owner' : 'Crew Member',
        status: 'active',
        joinedDate: '2026-01-01',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: nowIso
      });
    });

    // Employees Subcollection (14 profiles)
    SHREEJI_EMPLOYEES_DEF.forEach(emp => {
      addDoc(`studios/${studioId}/employees`, emp.id, {
        id: emp.id,
        studioId,
        userId: `usr_${emp.id}`,
        employeeNumber: emp.employeeNumber,
        fullName: emp.fullName,
        email: emp.email,
        phone: emp.phone,
        department: emp.department,
        designation: emp.designation,
        joiningDate: emp.joiningDate,
        roleId: emp.roleId,
        roleName: emp.roleName,
        employmentStatus: emp.employmentStatus,
        skills: emp.skills,
        monthlySalaryPaise: emp.monthlySalary * 100,
        monthlySalary: emp.monthlySalary,
        dailyRatePaise: emp.dailyRate * 100,
        dailyRate: emp.dailyRate,
        isDemoData: true,
        seedBatchId: SEED_BATCH_ID,
        createdBy: CREATED_BY_SEED,
        createdAt: '2026-01-15T09:00:00Z',
        updatedAt: nowIso
      });
    });

    const depts = ['Photography', 'Videography', 'Cinematography', 'Drone', 'Photo Editing', 'Video Editing', 'Album Designing', 'Production'];
    depts.forEach(d => addDoc(`studios/${studioId}/departments`, `dept_${d.toLowerCase().replace(/\s+/g, '_')}`, { name: d, studioId, active: true }));

    // 2. Customers and Bookings Subcollections
    SHREEJI_BOOKINGS_DEF.forEach((bkg, index) => {
      const numStr = String(index + 1).padStart(3, '0');
      const customerId = `cust_shr_${numStr}`;
      const eventId = `evt_shr_${numStr}`;
      const quotationId = `qt_shr_${numStr}`;
      const invoiceId = `inv_shr_${numStr}`;
      const paymentId = `pay_shr_${numStr}`;

      // Customer
      addDoc(`studios/${studioId}/customers`, customerId, {
        id: customerId,
        studioId,
        name: bkg.customerName,
        phone: bkg.phone,
        email: bkg.email,
        city: bkg.city,
        fullAddress: bkg.address,
        status: bkg.status === 'completed' ? 'Completed' : bkg.status === 'cancelled' ? 'Lost' : 'Booked',
        totalBookings: 1,
        totalRevenuePaise: bkg.finalAgreedAmount * 100,
        totalRevenue: bkg.finalAgreedAmount,
        isDemoData: true,
        seedBatchId: SEED_BATCH_ID,
        createdBy: CREATED_BY_SEED,
        createdAt: '2026-01-15T09:00:00Z',
        updatedAt: nowIso
      });

      // Booking
      const bookingData = {
        id: bkg.id,
        bookingNumber: bkg.bkgNum,
        studioId,
        customerId,
        customerName: bkg.customerName,
        customerPhone: bkg.phone,
        customerEmail: bkg.email,
        customerCity: bkg.city,
        customerAddress: bkg.address,
        title: bkg.eventName,
        eventType: bkg.category,
        primaryDate: bkg.date,
        status: bkg.status,
        financials: {
          quotedAmountPaise: bkg.quotedPrice * 100,
          quotedAmount: bkg.quotedPrice,
          packageAmountPaise: bkg.packageAmount * 100,
          packageAmount: bkg.packageAmount,
          negotiatedDiscountPaise: bkg.discount * 100,
          negotiatedDiscount: bkg.discount,
          finalAgreedAmountPaise: bkg.finalAgreedAmount * 100,
          finalAgreedAmount: bkg.finalAgreedAmount,
          advancePaymentReceivedPaise: bkg.paymentReceived * 100,
          advancePaymentReceived: bkg.paymentReceived,
          balanceRemainingPaise: Math.max(0, bkg.finalAgreedAmount - bkg.paymentReceived) * 100,
          balanceRemaining: Math.max(0, bkg.finalAgreedAmount - bkg.paymentReceived),
          paymentStatus: bkg.paymentReceived >= bkg.finalAgreedAmount ? 'Paid' : bkg.paymentReceived > 0 ? 'Partial' : 'Pending',
          paymentMethod: bkg.paymentMethod,
          transactionReference: bkg.paymentRef
        },
        deliverables: {
          rawPhotosCount: bkg.rawPhotos,
          editedPhotosCount: bkg.editedPhotos,
          videosCount: bkg.videos,
          reelsCount: bkg.reels,
          albumsCount: bkg.albumsCount,
          albumStatus: bkg.albumStatus,
          deliveryStatus: bkg.deliveryStatus
        },
        crew: bkg.crew,
        isMultiEvent: bkg.isMultiEvent,
        isDemoData: true,
        seedBatchId: SEED_BATCH_ID,
        createdBy: CREATED_BY_SEED,
        createdAt: '2026-01-15T09:00:00Z',
        updatedAt: nowIso
      };

      addDoc(`studios/${studioId}/bookings`, bkg.id, bookingData);
      addDoc(`studios/${studioId}/studio_bookings_v2`, bkg.id, bookingData);

      // Event
      addDoc(`studios/${studioId}/events`, eventId, {
        id: eventId,
        studioId,
        eventNumber: `EVT-SHR-2026-${numStr}`,
        name: bkg.eventName,
        title: bkg.eventName,
        customerId,
        customerName: bkg.customerName,
        customerPhone: bkg.phone,
        category: bkg.category,
        startDate: bkg.date,
        startTime: '09:00',
        endDate: bkg.endDate || bkg.date,
        endTime: '23:00',
        venue: bkg.venue,
        venueCity: bkg.city,
        priority: 'High',
        status: bkg.status === 'completed' ? 'Completed' : bkg.status === 'cancelled' ? 'Cancelled' : 'Confirmed',
        leadPhotographerId: bkg.leadPhotographerId,
        assignedTeamIds: bkg.crew.map(c => c.id),
        isDemoData: true,
        seedBatchId: SEED_BATCH_ID,
        createdBy: CREATED_BY_SEED,
        createdAt: '2026-01-15T09:00:00Z',
        updatedAt: nowIso
      });

      // Sub-Events
      const subEvents = getSubEventsDef(bkg.id, studioId);
      subEvents.forEach(sub => {
        addDoc(`studios/${studioId}/subEvents`, sub.id, {
          ...sub,
          isDemoData: true,
          seedBatchId: SEED_BATCH_ID,
          createdBy: CREATED_BY_SEED
        });
      });

      // Tasks
      const tasks = getTasksForBooking(bkg, studioId);
      tasks.forEach(t => {
        addDoc(`studios/${studioId}/tasks`, t.id, {
          ...t,
          isDemoData: true,
          seedBatchId: SEED_BATCH_ID,
          createdBy: CREATED_BY_SEED
        });
      });

      // Quotation
      addDoc(`studios/${studioId}/quotations`, quotationId, {
        id: quotationId,
        studioId,
        quotationNumber: `SHR-QT-2026-${numStr}`,
        customerId,
        customerName: bkg.customerName,
        customerPhone: bkg.phone,
        eventCategory: bkg.category,
        eventName: bkg.eventName,
        eventDate: bkg.date,
        eventVenue: bkg.venue,
        subtotalPaise: bkg.quotedPrice * 100,
        subtotal: bkg.quotedPrice,
        discountAmountPaise: bkg.discount * 100,
        discountAmount: bkg.discount,
        taxAmountPaise: Math.round((bkg.quotedPrice - bkg.discount) * 0.18) * 100,
        taxAmount: Math.round((bkg.quotedPrice - bkg.discount) * 0.18),
        grandTotalPaise: bkg.finalAgreedAmount * 100,
        grandTotal: bkg.finalAgreedAmount,
        status: bkg.status === 'cancelled' ? 'Expired' : bkg.status === 'negotiation' ? 'Sent' : 'Accepted',
        isDemoData: true,
        seedBatchId: SEED_BATCH_ID,
        createdBy: CREATED_BY_SEED,
        createdAt: '2026-01-15T09:00:00Z',
        updatedAt: nowIso
      });

      // Invoice
      const remainingBal = Math.max(0, bkg.finalAgreedAmount - bkg.paymentReceived);
      addDoc(`studios/${studioId}/invoices`, invoiceId, {
        id: invoiceId,
        studioId,
        invoiceNumber: `SHR-INV-2026-${numStr}`,
        customerId,
        customerName: bkg.customerName,
        customerPhone: bkg.phone,
        eventId,
        eventName: bkg.eventName,
        invoiceDate: bkg.date,
        totalAmountPaise: bkg.finalAgreedAmount * 100,
        totalAmount: bkg.finalAgreedAmount,
        paidAmountPaise: bkg.paymentReceived * 100,
        paidAmount: bkg.paymentReceived,
        balanceAmountPaise: remainingBal * 100,
        balanceAmount: remainingBal,
        status: remainingBal <= 0 ? 'Paid' : bkg.paymentReceived > 0 ? 'Partially Paid' : 'Pending',
        isDemoData: true,
        seedBatchId: SEED_BATCH_ID,
        createdBy: CREATED_BY_SEED,
        createdAt: '2026-01-15T09:00:00Z',
        updatedAt: nowIso
      });

      // Payment
      if (bkg.paymentReceived > 0) {
        addDoc(`studios/${studioId}/payments`, paymentId, {
          id: paymentId,
          studioId,
          paymentNumber: `SHR-PAY-2026-${numStr}`,
          receiptNumber: `SHR-REC-2026-${numStr}`,
          invoiceId,
          customerId,
          customerName: bkg.customerName,
          amountPaise: bkg.paymentReceived * 100,
          amount: bkg.paymentReceived,
          currency: 'INR',
          paymentDate: bkg.date,
          paymentMethod: bkg.paymentMethod,
          transactionReference: bkg.paymentRef,
          status: 'success',
          isDemoData: true,
          seedBatchId: SEED_BATCH_ID,
          createdBy: CREATED_BY_SEED,
          createdAt: `${bkg.date}T10:00:00Z`,
          updatedAt: nowIso
        });
      }
    });

    // Financial Settings & System Records
    addDoc(`studios/${studioId}/financialSettings`, 'settings', {
      defaultGstRate: 18,
      panNumber: 'AAACR1122D',
      gstin: '24AAACR1122D1Z4',
      bankName: 'HDFC Bank Ltd',
      accountNumber: '50200088991122',
      ifscCode: 'HDFC0000006',
      upiId: 'shreejifilms@hdfcbank'
    });

    addDoc(`studios/${studioId}/counters`, 'event_counter_2026', { year: 2026, count: 28 });
    addDoc(`studios/${studioId}/activityLogs`, 'act_init', { title: 'Studio Database Initialized', performedBy: 'system_migration_admin', timestamp: nowIso });
  }

  console.log(`Prepared total ${allWrites.length} documents across ${Object.keys(collectionsMap).length} collections.`);
  console.log('Sending atomic batch commits to Cloud Firestore REST API...');

  const committedTotal = await client.commitWrites(allWrites);
  console.log(`Successfully committed ${committedTotal} documents directly to Cloud Firestore!`);

  return {
    totalCollectionsMigrated: Object.keys(collectionsMap).length,
    totalDocumentsMigrated: committedTotal,
    collectionsMap
  };
}

if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('migrateStudioOS')) {
  migrateStudioOS()
    .then(res => {
      console.log('========================================================================');
      console.log('STUDIO OS MIGRATION COMPLETED SUCCESSFULLY');
      console.log('========================================================================');
      console.log('Total Documents Committed to Cloud Firestore:', res.totalDocumentsMigrated);
      console.log('Total Collections/Subcollections:', res.totalCollectionsMigrated);
      process.exit(0);
    })
    .catch(err => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
