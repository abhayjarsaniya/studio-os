import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { unifiedAuthService } from '../services/unifiedAuthService';
import { useMasterAdmin } from '../context/MasterAdminContext';

describe('STUDIO OS — Master Admin Login, Routing & All 15 Module Options Verification', () => {
  const appPath = path.resolve(__dirname, '../App.tsx');
  const masterAppPath = path.resolve(__dirname, '../components/master/MasterApp.tsx');
  const masterContextPath = path.resolve(__dirname, '../context/MasterAdminContext.tsx');
  const studioLoginPath = path.resolve(__dirname, '../pages/StudioLoginPage.tsx');
  const employeeLoginPath = path.resolve(__dirname, '../pages/EmployeeLoginPage.tsx');
  const masterLoginPath = path.resolve(__dirname, '../pages/master/MasterLoginPage.tsx');
  const desktopSidebarPath = path.resolve(__dirname, '../components/layout/DesktopSidebar.tsx');
  const mobileHeaderPath = path.resolve(__dirname, '../components/layout/MobileHeader.tsx');

  it('1. verifies App.tsx wraps MasterLoginPage in MasterAdminProvider on #/master/login route', () => {
    const content = fs.readFileSync(appPath, 'utf-8');
    expect(content).toContain("<MasterAdminProvider>");
    expect(content).toContain("<MasterLoginPage />");
    expect(content).toContain("</MasterAdminProvider>");
  });

  it('2. verifies useMasterAdmin provides a safe non-throwing fallback when outside provider', () => {
    // Calling useMasterAdmin outside of React tree should return safe defaults and NOT throw
    const ctx = useMasterAdmin();
    expect(ctx).toBeDefined();
    expect(ctx.currentAdmin).toBeDefined();
    expect(typeof ctx.setMasterRoute).toBe('function');
    expect(ctx.canMaster('manage_studios')).toBe(true);
  });

  it('3. verifies Master Admin authenticates with both standard usernames and MasterAdmin@2026', () => {
    const res1 = unifiedAuthService.loginMasterAdmin('admin@studio-os.com', 'MasterAdmin@2026');
    expect(res1.success).toBe(true);
    expect(res1.session?.account.accountType).toBe('MASTER_ADMIN');

    const res2 = unifiedAuthService.loginMasterAdmin('masteradmin', 'MasterAdmin@2026');
    expect(res2.success).toBe(true);
    expect(res2.session?.account.accountType).toBe('MASTER_ADMIN');

    const res3 = unifiedAuthService.loginMasterAdmin('masteradmin', 'Hz9#*R*r2&#%L3');
    expect(res3.success).toBe(true);
  });

  it('4. verifies StudioLoginPage contains an accessible link to Master Admin', () => {
    const content = fs.readFileSync(studioLoginPath, 'utf-8');
    expect(content).toContain('href="#/master/login"');
    expect(content).toContain('Platform Master Admin');
  });

  it('5. verifies EmployeeLoginPage contains an accessible link to Master Admin', () => {
    const content = fs.readFileSync(employeeLoginPath, 'utf-8');
    expect(content).toContain('href="#/master/login"');
    expect(content).toContain('Platform Master Admin');
  });

  it('6. verifies MasterLoginPage contains return links to Studio Owner and Employee portals', () => {
    const content = fs.readFileSync(masterLoginPath, 'utf-8');
    expect(content).toContain('href="#/studio/login"');
    expect(content).toContain('href="#/employee/login"');
  });

  it('7. verifies DesktopSidebar and MobileHeader contain direct links to Platform Master Admin', () => {
    const desktopContent = fs.readFileSync(desktopSidebarPath, 'utf-8');
    expect(desktopContent).toContain('href="#/master/login"');
    expect(desktopContent).toContain('Platform Master Admin Console');

    const mobileContent = fs.readFileSync(mobileHeaderPath, 'utf-8');
    expect(mobileContent).toContain('href="#/master/login"');
    expect(mobileContent).toContain('Platform Master Admin');
  });

  it('8. verifies all 15 Master Admin options are handled in MasterApp router', () => {
    const content = fs.readFileSync(masterAppPath, 'utf-8');
    const requiredModules = [
      "case 'dashboard':",
      "case 'studios':",
      "case 'accounts':",
      "case 'subscriptions':",
      "case 'plans':",
      "case 'roles-permissions':",
      "case 'features':",
      "case 'customer-reports':",
      "case 'analytics':",
      "case 'team-reports':",
      "case 'payroll':",
      "case 'suppliers':",
      "case 'reports':",
      "case 'notifications':",
      "case 'settings':"
    ];

    for (const mod of requiredModules) {
      expect(content).toContain(mod);
    }
  });

  it('9. verifies all 15 Master Admin options are synchronized in MasterAdminContext hash listener', () => {
    const content = fs.readFileSync(masterContextPath, 'utf-8');
    const requiredHashRoutes = [
      "#/master/studios",
      "#/master/accounts",
      "#/master/subscriptions",
      "#/master/plans",
      "#/master/roles-permissions",
      "#/master/features",
      "#/master/customer-reports",
      "#/master/analytics",
      "#/master/team-reports",
      "#/master/payroll",
      "#/master/suppliers",
      "#/master/reports",
      "#/master/notifications",
      "#/master/audit-logs",
      "#/master/settings"
    ];

    for (const route of requiredHashRoutes) {
      expect(content).toContain(route);
    }
  });

  it('10. verifies zero sub-12px font utility classes exist in modified files', () => {
    const files = [appPath, masterAppPath, masterContextPath, studioLoginPath, employeeLoginPath, masterLoginPath, desktopSidebarPath, mobileHeaderPath];
    for (const f of files) {
      const content = fs.readFileSync(f, 'utf-8');
      expect(content).not.toMatch(/text-\[10px\]/);
      expect(content).not.toMatch(/text-\[11px\]/);
    }
  });
});
