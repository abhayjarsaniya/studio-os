import { TenantStore } from './tenantStore';

export interface DatabaseBackup {
  timestamp: string;
  projectId: string;
  studios: Record<string, Record<string, any>>;
  platform: Record<string, any>;
  metadata: {
    exportedBy: string;
    totalStudiosFound: number;
    reason: string;
  };
}

export class DatabaseBackupService {
  private static KNOWN_STUDIO_IDS = [
    'studio_shreeji_films',
    'std_demo_royal',
    'studio_royal_001',
    'studio_creative_002',
    'studio_royal_frames_001',
    'studio_moments_002',
    'studio_pixelcraft_003',
    'studio_shutter_stories_004',
    'studio_golden_hour_005'
  ];

  private static COLLECTIONS = [
    'profile', 'settings', 'branches', 'members', 'customers', 'events', 'tasks',
    'notifications', 'auditLogs', 'invoices', 'subEvents', 'employees', 'roles',
    'salaryProfiles', 'payrollRuns', 'salaryTransactions', 'leaveTypes', 'leaveRequests',
    'leaveBalances', 'attendance', 'authCredentials', 'quotations', 'payments', 'refunds',
    'expenses', 'paymentSchedules', 'financialSettings', 'savedReports', 'reportJobs',
    'studio_bookings_v2', 'studio_customer_notes_v2', 'features_override', 'platform_feature_overrides'
  ];

  private static PLATFORM_COLLECTIONS = [
    'admins', 'platform_plans', 'platform_studio_subscriptions', 'platform_invoices',
    'platform_payments', 'platform_announcements', 'platform_support_tickets',
    'platform_audit_logs', 'platform_features', 'platform_settings', 'platform_accounts'
  ];

  static createFullBackup(reason = 'Pre-Migration Final Database Reset'): DatabaseBackup {
    const timestamp = new Date().toISOString();
    const backup: DatabaseBackup = {
      timestamp,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'studio-os-live-2026',
      studios: {},
      platform: {},
      metadata: {
        exportedBy: 'StudioOS Automated Backup Service',
        totalStudiosFound: 0,
        reason
      }
    };

    let foundStudios = 0;
    this.KNOWN_STUDIO_IDS.forEach(studioId => {
      const studioData: Record<string, any> = {};
      let hasData = false;

      this.COLLECTIONS.forEach(col => {
        try {
          const items = TenantStore.get(studioId, col);
          if (items && ((Array.isArray(items) && items.length > 0) || (typeof items === 'object' && Object.keys(items).length > 0))) {
            studioData[col] = items;
            hasData = true;
          }
        } catch {
          // ignore
        }
      });

      if (hasData) {
        backup.studios[studioId] = studioData;
        foundStudios++;
      }
    });

    // Platform collections
    this.PLATFORM_COLLECTIONS.forEach(col => {
      try {
        const items = TenantStore.get('global_platform_master', col);
        if (items && items.length > 0) {
          backup.platform[col] = items;
        }
      } catch {
        // ignore
      }
    });

    backup.metadata.totalStudiosFound = foundStudios;
    return backup;
  }
}
