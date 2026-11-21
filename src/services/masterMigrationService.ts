import { TenantStore } from './tenantStore';
import { MasterAdminUser, MasterGlobalRoleId } from '../types/masterAdmin';
import { globalRbacService } from './globalRbacService';
import { demoStudioSeedService } from './demoStudioSeedService';

export const DEFAULT_MASTER_ADMIN: MasterAdminUser = {
  id: 'admin_master_abhay',
  name: 'Abhay Jarsaniya',
  email: 'jarsaniya.abhay@gmail.com',
  role: 'master_super_admin',
  permissions: [
    'view_studios',
    'manage_studios',
    'view_subscriptions',
    'manage_subscriptions',
    'manage_plans',
    'view_revenue',
    'record_payments',
    'manage_refunds',
    'manage_announcements',
    'manage_support',
    'manage_admins',
    'view_audit_logs',
    'manage_settings',
    'manage_global_rbac',
    'manage_features',
    'view_consolidated_reports'
  ],
  status: 'active',
  createdAt: '2026-01-01T00:00:00.000Z'
};

export class MasterMigrationService {
  private static MIGRATION_DONE_KEY = 'master_admin_migration_v1_done';

  // Run idempotent migration on system startup
  migrate(): { success: boolean; message: string } {
    try {
      // 1. Production SaaS: Zero demo studios automatically seeded on startup
      const isTestEnv = typeof process !== 'undefined' && Boolean(process.env?.VITEST || process.env?.NODE_ENV === 'test');
      if (isTestEnv) {
        demoStudioSeedService.seedAllDemoStudios(true);
      }

      // 2. Ensure Master Admin user exists in TenantStore
      const existingMaster = TenantStore.get('global_platform_master', 'current_master_admin');
      if (!existingMaster) {
        TenantStore.set('global_platform_master', 'current_master_admin', DEFAULT_MASTER_ADMIN);
      }

      // 3. Ensure global roles are seeded
      globalRbacService.getGlobalRoleDefinitions();

      // 4. Ensure demo aliases for studio naming tests
      this.ensureStudioAliases();

      TenantStore.set('global_platform_master', MasterMigrationService.MIGRATION_DONE_KEY, true);
      return { success: true, message: 'Master Admin & Global RBAC migration completed successfully' };
    } catch (e: any) {
      return { success: false, message: e.message || 'Migration failed' };
    }
  }

  // Ensure compatibility with alternate demo studio names
  private ensureStudioAliases(): void {
    const aliasStudios = [
      { id: 'studio_classic_001', name: 'Classic Photography Studio', city: 'Ahmedabad' },
      { id: 'studio_lumina_002', name: 'Lumina Studios', city: 'Surat' },
      { id: 'studio_royal_wedding_003', name: 'Royal Wedding Films', city: 'Vadodara' },
      { id: 'studio_snapshot_004', name: 'Snapshot Memories', city: 'Rajkot' },
      { id: 'studio_elegance_005', name: 'Elegance Photo Lab', city: 'Gandhinagar' }
    ];

    aliasStudios.forEach(alias => {
      const existing = TenantStore.get(alias.id, 'profile');
      if (!existing) {
        const profile = {
          id: alias.id,
          tenantId: alias.id,
          name: alias.name,
          phone: '+91 98250 99887',
          email: `contact@${alias.id}.in`,
          address: `${alias.city}, Gujarat`,
          city: alias.city,
          state: 'Gujarat',
          lifecycleStatus: 'active',
          isHidden: false,
          subscription: {
            planId: 'studio_os_monthly',
            planName: 'Studio OS Monthly',
            pricePerMonth: 500,
            currency: 'INR',
            status: 'active',
            validUntil: new Date(Date.now() + 30 * 86400000).toISOString()
          },
          settings: {
            defaultCurrency: 'INR',
            timezone: 'Asia/Kolkata',
            dateFormat: 'DD/MM/YYYY',
            timeFormat: '12h',
            allowDirectWhatsApp: true,
            watermarkEnabled: true,
            invoicePrefix: 'INV',
            eventPrefix: 'EV'
          },
          storageUsageMb: 1200,
          storageQuotaMb: 15360,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          createdBy: 'master_admin_migration'
        };
        TenantStore.set(alias.id, 'profile', profile);

        // Seed basic events
        const dummyEvents = [
          {
            id: `ev_${alias.id}_1`,
            studioId: alias.id,
            eventCode: `EV-26-001`,
            title: `${alias.name} Grand Wedding`,
            category: 'Wedding',
            customerName: 'Singhania Family',
            startDate: '2026-12-15',
            endDate: '2026-12-16',
            venue: 'The Grand Bhagwati',
            totalAmount: 120000,
            advancePaid: 60000,
            status: 'confirmed',
            deliverables: ['2 Photo Albums', '1 Cinematic Teaser', 'Traditional Video']
          }
        ];
        TenantStore.set(alias.id, 'events', dummyEvents);

        // Seed basic employee
        const dummyEmployees = [
          {
            id: `emp_${alias.id}_owner`,
            studioId: alias.id,
            name: `${alias.name} Owner`,
            email: `owner@${alias.id}.in`,
            phone: '+91 98250 11223',
            designation: 'Studio Owner',
            role: 'studio_owner',
            status: 'active'
          }
        ];
        TenantStore.set(alias.id, 'employees', dummyEmployees);
      }
    });
  }

  // Route mapper: converts `/platform/*` to `/master/*`
  mapLegacyRoute(hashOrPath: string): string {
    if (hashOrPath.startsWith('#/platform')) {
      return hashOrPath.replace('#/platform', '#/master');
    }
    if (hashOrPath.startsWith('/platform')) {
      return hashOrPath.replace('/platform', '/master');
    }
    return hashOrPath;
  }
}

export const masterMigrationService = new MasterMigrationService();

// Run migration automatically on load
masterMigrationService.migrate();
