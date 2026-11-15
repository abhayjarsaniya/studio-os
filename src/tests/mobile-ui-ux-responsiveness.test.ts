import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('STUDIO OS — Mobile UI/UX Responsiveness & Touch-Friendly Design Audit', () => {
  const rootDir = path.resolve(__dirname, '..');

  it('1. verifies global CSS establishes 16px mobile input font-size and prevents unwanted auto-zoom and horizontal overflow', () => {
    const cssPath = path.join(rootDir, 'index.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    // Overflow protection
    expect(cssContent).toContain('overflow-x: hidden');
    expect(cssContent).toContain('max-width: 100vw');

    // 16px font-size on mobile inputs (< 640px)
    expect(cssContent).toContain('font-size: 16px');
    expect(cssContent).toContain('touch-action: manipulation');
    expect(cssContent).toContain('.touch-scroll');
    expect(cssContent).toContain('.pb-safe');
  });

  it('2. verifies main app container includes bottom padding for mobile navigation bar', () => {
    const appPath = path.join(rootDir, 'App.tsx');
    const appContent = fs.readFileSync(appPath, 'utf-8');

    expect(appContent).toContain('pb-32 sm:pb-8');
    expect(appContent).toContain('touch-scroll');
  });

  it('3. verifies MobileBottomNav buttons meet min 50px touch height and touch-manipulation', () => {
    const navPath = path.join(rootDir, 'components', 'layout', 'MobileBottomNav.tsx');
    const navContent = fs.readFileSync(navPath, 'utf-8');

    expect(navContent).toContain('min-h-[52px]');
    expect(navContent).toContain('touch-manipulation');
    expect(navContent).toContain('active:scale-95');
  });

  it('4. verifies MobileHeader menu, notifications and drawer meet mobile touch guidelines', () => {
    const headerPath = path.join(rootDir, 'components', 'layout', 'MobileHeader.tsx');
    const headerContent = fs.readFileSync(headerPath, 'utf-8');

    expect(headerContent).toContain('min-h-[48px] min-w-[48px]');
    expect(headerContent).toContain('touch-manipulation');
    expect(headerContent).toContain('min-h-[48px]');
  });

  it('5. verifies DashboardPage has full-width mobile action buttons and min-h-[44px]+ targets', () => {
    const dashboardPath = path.join(rootDir, 'pages', 'DashboardPage.tsx');
    const dashboardContent = fs.readFileSync(dashboardPath, 'utf-8');

    expect(dashboardContent).toContain('w-full sm:w-auto min-h-[50px] sm:min-h-[44px]');
    expect(dashboardContent).toContain('min-h-[44px] px-4 py-2');
  });

  it('6. verifies BookingsWorkspacePage search and filter controls meet mobile touch standards', () => {
    const bookingsPath = path.join(rootDir, 'pages', 'BookingsWorkspacePage.tsx');
    const bookingsContent = fs.readFileSync(bookingsPath, 'utf-8');

    expect(bookingsContent).toContain('w-full sm:w-auto min-h-[50px] sm:min-h-[44px]');
    expect(bookingsContent).toContain('min-h-[48px] sm:min-h-[42px]');
    expect(bookingsContent).toContain('min-h-[44px] sm:min-h-[36px]');
  });

  it('7. verifies SingleBookingWorkspace has touch-friendly navigation tabs, summary cards, and mobile payment cards', () => {
    const workspacePath = path.join(rootDir, 'components', 'bookings', 'SingleBookingWorkspace.tsx');
    const workspaceContent = fs.readFileSync(workspacePath, 'utf-8');

    expect(workspaceContent).toContain('min-h-[48px] sm:min-h-[38px]'); // back button
    expect(workspaceContent).toContain('min-h-[48px] px-4 py-2.5 rounded-xl text-xs font-bold'); // section tabs
    expect(workspaceContent).toContain('grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5'); // responsive summary tiles
    expect(workspaceContent).toContain('w-8 h-8 rounded-lg flex items-center justify-center'); // deliverable checkbox
    expect(workspaceContent).toContain('min-h-[48px] sm:min-h-[40px]'); // internal notes & modals
  });

  it('8. verifies CrewMembersPage provides mobile touch targets and filters', () => {
    const crewPath = path.join(rootDir, 'pages', 'CrewMembersPage.tsx');
    const crewContent = fs.readFileSync(crewPath, 'utf-8');

    expect(crewContent).toContain('w-full sm:w-auto min-h-[50px] sm:min-h-[44px]');
    expect(crewContent).toContain('min-h-[48px] sm:min-h-[40px]');
    expect(crewContent).toContain('min-h-[44px] px-3 py-2');
  });

  it('9. verifies EmployeeDashboardPage has large touch check-in and shift buttons', () => {
    const empPath = path.join(rootDir, 'pages', 'EmployeeDashboardPage.tsx');
    const empContent = fs.readFileSync(empPath, 'utf-8');

    expect(empContent).toContain('min-h-[52px] sm:min-h-[48px]');
    expect(empContent).toContain('min-h-[48px]');
  });

  it('10. verifies Master Admin pages have mobile card view and large touch buttons', () => {
    const studiosPath = path.join(rootDir, 'pages', 'master', 'MasterStudiosPage.tsx');
    const studiosContent = fs.readFileSync(studiosPath, 'utf-8');

    expect(studiosContent).toContain('MOBILE STUDIOS CARD VIEW (sm:hidden)');
    expect(studiosContent).toContain('min-h-[48px] sm:min-h-[40px]');
  });
});
