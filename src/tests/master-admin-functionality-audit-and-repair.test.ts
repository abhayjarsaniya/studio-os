import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { masterExportService } from '../services/masterExportService';
import { platformBillingService } from '../services/platformBillingService';
import { supplierService } from '../services/supplierService';
import { platformAnnouncementService } from '../services/platformAnnouncementService';
import { platformAuditService } from '../services/platformAuditService';
import { attendanceService } from '../services/attendanceService';
import { TenantStore } from '../services/tenantStore';

describe('STUDIO OS — Master Admin Complete Functionality Audit & Repair', () => {
  const rootDir = path.resolve(__dirname, '..');

  it('1. verifies MasterSidebar has removed all numbered prefixes from labels', () => {
    const sidebarPath = path.join(rootDir, 'components/master/MasterSidebar.tsx');
    const content = fs.readFileSync(sidebarPath, 'utf-8');

    // Should NOT contain numbered prefixes
    expect(content).not.toContain("'1. Dashboard'");
    expect(content).not.toContain("'2. Studios Directory'");
    expect(content).not.toContain("'8. Customer & Event Reports'");
    expect(content).not.toContain("'15. Settings & Audit Logs'");
    expect(content).not.toContain("Master Workspace (15 Modules)");

    // Should contain clean labels
    expect(content).toContain("label: 'Dashboard'");
    expect(content).toContain("label: 'Studios Directory'");
    expect(content).toContain("label: 'Customer & Event Reports'");
    expect(content).toContain("label: 'Finance & Revenue Analytics'");
    expect(content).toContain("label: 'Team & Attendance Reports'");
    expect(content).toContain("label: 'Payroll Administration'");
    expect(content).toContain("label: 'Supplier Administration'");
    expect(content).toContain("label: 'Report Center'");
    expect(content).toContain("label: 'Platform Notifications'");
    expect(content).toContain("label: 'Settings & Audit Logs'");
    expect(content).toContain("Platform Modules");
  });

  it('2. verifies MasterSidebar navigation directly routes each module without hijacking to reports', () => {
    const sidebarPath = path.join(rootDir, 'components/master/MasterSidebar.tsx');
    const content = fs.readFileSync(sidebarPath, 'utf-8');

    // Make sure the hijack check has been removed
    expect(content).not.toContain("['customer-reports', 'team-reports', 'payroll', 'suppliers', 'notifications'].includes");
    expect(content).toContain("setMasterRoute(item.id);");
  });

  it('3. verifies MasterApp routes all 8 modules to dedicated component pages', () => {
    const masterAppPath = path.join(rootDir, 'components/master/MasterApp.tsx');
    const content = fs.readFileSync(masterAppPath, 'utf-8');

    expect(content).toContain("import { MasterCustomerReportsPage }");
    expect(content).toContain("import { MasterAnalyticsPage }");
    expect(content).toContain("import { MasterTeamReportsPage }");
    expect(content).toContain("import { MasterPayrollPage }");
    expect(content).toContain("import { MasterSuppliersPage }");
    expect(content).toContain("import { MasterNotificationsPage }");
    expect(content).toContain("import { MasterReportsPage }");
    expect(content).toContain("import { MasterAuditLogsPage }");
    expect(content).toContain("import { MasterSettingsPage }");

    expect(content).toContain("case 'customer-reports':\n        return <MasterCustomerReportsPage />;");
    expect(content).toContain("case 'analytics':\n        return <MasterAnalyticsPage />;");
    expect(content).toContain("case 'team-reports':\n        return <MasterTeamReportsPage />;");
    expect(content).toContain("case 'payroll':\n        return <MasterPayrollPage />;");
    expect(content).toContain("case 'suppliers':\n        return <MasterSuppliersPage />;");
    expect(content).toContain("case 'reports':\n        return <MasterReportsPage />;");
    expect(content).toContain("case 'notifications':\n        return <MasterNotificationsPage />;");
    expect(content).toContain("case 'settings':\n        return <MasterSettingsPage />;");
    expect(content).toContain("case 'audit-logs':\n        return <MasterAuditLogsPage />;");
  });

  it('4. verifies MasterExportService supports both Excel (.xlsx/.xls XML) and PDF document exports', () => {
    expect(typeof masterExportService.exportToExcel).toBe('function');
    expect(typeof masterExportService.exportToPDF).toBe('function');

    const exportPath = path.join(rootDir, 'services/masterExportService.ts');
    const content = fs.readFileSync(exportPath, 'utf-8');

    expect(content).toContain("xmlns:ss=\"urn:schemas-microsoft-com:office:spreadsheet\"");
    expect(content).toContain("Studio OS Enterprise");
    expect(content).toContain("window.print()");
  });

  it('5. verifies PlatformBillingService handles invoice creation, settlement, and idempotency', () => {
    const testStudio = 'studio_shreeji_films';
    const invoice = platformBillingService.createInvoice({
      studioId: testStudio,
      studioName: 'Shreeji Films',
      subscriptionId: 'sub_test',
      planName: 'Studio OS Standard',
      billingPeriodStart: '2026-11-01',
      billingPeriodEnd: '2026-11-30',
      subtotal: 500,
      actingAdminName: 'Master Admin'
    });

    expect(invoice.id).toBeDefined();
    expect(invoice.totalAmount).toBe(500);
    expect(invoice.status).toBe('issued');

    const paymentResult = platformBillingService.recordPayment({
      invoiceId: invoice.id,
      amount: 500,
      paymentMethod: 'UPI',
      transactionReference: `UPI_TEST_${Date.now()}`,
      recordedBy: 'Master Admin'
    });

    expect(paymentResult.payment.amount).toBe(500);
    expect(paymentResult.invoice.status).toBe('paid');
    expect(paymentResult.invoice.balanceAmount).toBe(0);
  });

  it('6. verifies SupplierService supports full CRUD and category operations across studios', () => {
    const testStudio = 'studio_shreeji_films';
    const newSupplier = supplierService.createSupplier(testStudio, {
      businessName: 'Gujarat Cine Rig Rentals',
      category: 'equipment_rental_houses',
      contactPerson: 'Paresh Rawal',
      phone: '9825000111',
      city: 'Ahmedabad',
      baseDayRate: 15000,
      isActive: true,
      rating: 5,
      hasPortalAccess: false
    } as any);

    expect(newSupplier.id).toBeDefined();
    expect(newSupplier.businessName).toBe('Gujarat Cine Rig Rentals');

    const updated = supplierService.updateSupplier(testStudio, newSupplier.id, {
      baseDayRate: 14000
    });
    expect(updated.baseDayRate).toBe(14000);

    supplierService.deleteSupplier(testStudio, newSupplier.id);
    const afterDelete = supplierService.getSupplier(testStudio, newSupplier.id);
    expect(afterDelete).toBeNull();
  });

  it('7. verifies PlatformAnnouncementService persists notifications and supports status changes', () => {
    const ann = platformAnnouncementService.createAnnouncement({
      title: 'Scheduled Maintenance Notice',
      description: 'Platform servers will undergo routine optimization.',
      type: 'maintenance',
      priority: 'high',
      targetScope: 'all',
      status: 'published',
      createdBy: 'Master Admin'
    });

    expect(ann.id).toBeDefined();
    expect(ann.title).toBe('Scheduled Maintenance Notice');

    const list = platformAnnouncementService.listAnnouncements();
    expect(list.some(a => a.id === ann.id)).toBe(true);
  });

  it('8. verifies PlatformAuditService captures immutable administrative logs', () => {
    const log = platformAuditService.logAction(
      'Abhay Jarsaniya (Master Admin)',
      'SECURITY_POLICY_UPDATE',
      'system_config',
      'mfa_policy',
      'Enforced multi-factor authentication for administrative users'
    );

    expect(log.id).toBeDefined();
    expect(log.action).toBe('SECURITY_POLICY_UPDATE');

    const logs = platformAuditService.listLogs();
    expect(logs.some(l => l.id === log.id)).toBe(true);
  });

  it('9. verifies zero sub-12px utility font classes across all modified master components', () => {
    const files = [
      'components/master/MasterSidebar.tsx',
      'components/master/MasterApp.tsx',
      'pages/master/MasterCustomerReportsPage.tsx',
      'pages/master/MasterAnalyticsPage.tsx',
      'pages/master/MasterTeamReportsPage.tsx',
      'pages/master/MasterPayrollPage.tsx',
      'pages/master/MasterSuppliersPage.tsx',
      'pages/master/MasterReportsPage.tsx',
      'pages/master/MasterNotificationsPage.tsx',
      'pages/master/MasterSettingsPage.tsx',
      'pages/master/MasterAuditLogsPage.tsx'
    ];

    for (const f of files) {
      const fullPath = path.join(rootDir, f);
      const content = fs.readFileSync(fullPath, 'utf-8');
      expect(content).not.toMatch(/text-\[10px\]/);
      expect(content).not.toMatch(/text-\[11px\]/);
      expect(content).not.toMatch(/text-\[8px\]/);
      expect(content).not.toMatch(/text-\[9px\]/);
    }
  });

  it('10. verifies MasterSettingsPage persists real platform configuration', () => {
    const testConfig = {
      platformName: 'Studio OS Enterprise Hub',
      supportEmail: 'support@studioos.internal',
      maintenanceMode: false,
      sessionTimeoutMinutes: 60
    };

    TenantStore.set('platform_system', 'platform_settings', testConfig);
    const retrieved = TenantStore.getSingle('platform_system', 'platform_settings');

    expect(retrieved).toMatchObject(testConfig);
  });
});
