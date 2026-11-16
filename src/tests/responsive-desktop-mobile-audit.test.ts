import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Studio OS — Complete Responsive UI Audit & Mobile Usability Verification', () => {
  const rootDir = path.resolve(__dirname, '../');

  describe('1. Reclaimed Desktop Screen Width & Removal of Excessive Margins', () => {
    it('verifies src/App.tsx main container starts content closer to sidebar without sm:px-8 double indentation', () => {
      const appContent = fs.readFileSync(path.join(rootDir, 'App.tsx'), 'utf-8');
      expect(appContent).toContain('sm:px-5 sm:py-4 lg:px-6 lg:py-5');
      expect(appContent).not.toContain('sm:px-8 sm:py-6');
      expect(appContent).toContain('touch-scroll');
    });

    it('verifies MasterLayout and PlatformLayout reclaim full desktop width', () => {
      const masterLayoutContent = fs.readFileSync(path.join(rootDir, 'components/master/MasterLayout.tsx'), 'utf-8');
      expect(masterLayoutContent).toContain('sm:px-5 sm:py-5 lg:px-6 lg:py-6');
      expect(masterLayoutContent).not.toContain('max-w-7xl mx-auto');

      const platformLayoutContent = fs.readFileSync(path.join(rootDir, 'components/platform/PlatformLayout.tsx'), 'utf-8');
      expect(platformLayoutContent).toContain('sm:px-5 sm:py-5 lg:px-6 lg:py-6');
    });

    it('strictly contains ZERO occurrences of restrictive "max-w-6xl mx-auto" or "max-w-7xl mx-auto" page containers', () => {
      const pagesDir = path.join(rootDir, 'pages');
      const pageFiles = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx'));
      
      const violations: string[] = [];
      pageFiles.forEach(file => {
        const content = fs.readFileSync(path.join(pagesDir, file), 'utf-8');
        if (/max-w-[67]xl\s+(?:w-full\s+)?mx-auto/.test(content)) {
          violations.push(file);
        }
      });

      expect(violations).toEqual([]);
    });

    it('verifies DashboardPage, CalendarPage, BookingsWorkspacePage and UnifiedBookingPage use full width containers', () => {
      const dashboard = fs.readFileSync(path.join(rootDir, 'pages/DashboardPage.tsx'), 'utf-8');
      expect(dashboard).toContain('w-full');
      expect(dashboard).not.toContain('max-w-7xl w-full mx-auto');

      const calendar = fs.readFileSync(path.join(rootDir, 'pages/CalendarPage.tsx'), 'utf-8');
      expect(calendar).toContain('w-full');
      expect(calendar).not.toContain('max-w-7xl mx-auto');

      const bookings = fs.readFileSync(path.join(rootDir, 'pages/BookingsWorkspacePage.tsx'), 'utf-8');
      expect(bookings).toContain('w-full');
      expect(bookings).not.toContain('max-w-7xl w-full mx-auto');

      const unified = fs.readFileSync(path.join(rootDir, 'pages/UnifiedBookingPage.tsx'), 'utf-8');
      expect(unified).toContain('w-full');
      expect(unified).not.toContain('max-w-7xl w-full mx-auto');
    });
  });

  describe('2. Mobile Font Readability Boost & Zero Sub-12px Font Sizes', () => {
    it('verifies global CSS prevents mobile Safari auto-zoom with 16px inputs and scales clamp typography', () => {
      const cssContent = fs.readFileSync(path.join(rootDir, 'index.css'), 'utf-8');
      expect(cssContent).toContain('input, select, textarea');
      expect(cssContent).toContain('font-size: 16px;');
      expect(cssContent).toContain('--text-page-title: clamp(');
    });

    it('verifies key page headings are prominently readable on mobile (text-2xl sm:text-3xl)', () => {
      const dashboard = fs.readFileSync(path.join(rootDir, 'pages/DashboardPage.tsx'), 'utf-8');
      expect(dashboard).toContain('text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight font-heading');

      const calendar = fs.readFileSync(path.join(rootDir, 'pages/CalendarPage.tsx'), 'utf-8');
      expect(calendar).toContain('text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 font-display');

      const bookings = fs.readFileSync(path.join(rootDir, 'pages/BookingsWorkspacePage.tsx'), 'utf-8');
      expect(bookings).toContain('text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight mt-1 font-display');

      const singleBooking = fs.readFileSync(path.join(rootDir, 'components/bookings/SingleBookingWorkspace.tsx'), 'utf-8');
      expect(singleBooking).toContain('text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight font-display');

      const crew = fs.readFileSync(path.join(rootDir, 'pages/CrewMembersPage.tsx'), 'utf-8');
      expect(crew).toContain('text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight mt-1 font-display');

      const employee = fs.readFileSync(path.join(rootDir, 'pages/EmployeeDashboardPage.tsx'), 'utf-8');
      expect(employee).toContain('text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight font-display');
    });

    it('ensures zero sub-12px utility classes exist across src', () => {
      function walk(dir: string): string[] {
        let results: string[] = [];
        const list = fs.readdirSync(dir);
        list.forEach(file => {
          const fullPath = path.join(dir, file);
          const stat = fs.statSync(fullPath);
          if (stat && stat.isDirectory()) {
            results = results.concat(walk(fullPath));
          } else if (/\.(tsx|ts|css)$/.test(file)) {
            results.push(fullPath);
          }
        });
        return results;
      }

      const files = walk(rootDir);
      const sub12pxRegex = /(?:sm:|md:|lg:|hover:|focus:)?text-\[(?:8|9|10|11)px\]/g;
      const violations: { file: string; line: number; text: string }[] = [];

      files.forEach(f => {
        if (f.includes('responsive-typography-readability.test.ts') || f.includes('responsive-desktop-mobile-audit.test.ts')) return;
        const lines = fs.readFileSync(f, 'utf8').split('\n');
        lines.forEach((line, index) => {
          if (sub12pxRegex.test(line)) {
            violations.push({
              file: path.relative(rootDir, f),
              line: index + 1,
              text: line.trim()
            });
          }
        });
      });

      expect(violations).toEqual([]);
    });
  });

  describe('3. Reduced Mobile Wasted Space & Finger-Friendly Controls', () => {
    it('verifies DashboardPage uses compact mobile card padding (p-3.5 sm:p-5)', () => {
      const dashboard = fs.readFileSync(path.join(rootDir, 'pages/DashboardPage.tsx'), 'utf-8');
      expect(dashboard).toContain('p-3.5 sm:p-5');
      expect(dashboard).toContain('grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4');
    });

    it('verifies finger-friendly primary button heights (50px+ mobile targets)', () => {
      const dashboard = fs.readFileSync(path.join(rootDir, 'pages/DashboardPage.tsx'), 'utf-8');
      expect(dashboard).toContain('min-h-[50px] sm:min-h-[44px]');

      const bookings = fs.readFileSync(path.join(rootDir, 'pages/BookingsWorkspacePage.tsx'), 'utf-8');
      expect(bookings).toContain('min-h-[50px] sm:min-h-[44px]');

      const crew = fs.readFileSync(path.join(rootDir, 'pages/CrewMembersPage.tsx'), 'utf-8');
      expect(crew).toContain('min-h-[50px] sm:min-h-[44px]');

      const employee = fs.readFileSync(path.join(rootDir, 'pages/EmployeeDashboardPage.tsx'), 'utf-8');
      expect(employee).toContain('min-h-[52px] sm:min-h-[48px]');
    });

    it('verifies icon action buttons meet min 44x44px or 48x48px touch standards', () => {
      const calendar = fs.readFileSync(path.join(rootDir, 'pages/CalendarPage.tsx'), 'utf-8');
      expect(calendar).toContain('min-w-[48px] min-h-[48px]');

      const bookings = fs.readFileSync(path.join(rootDir, 'pages/BookingsWorkspacePage.tsx'), 'utf-8');
      expect(bookings).toContain('min-w-[48px] min-h-[48px]');

      const mobileHeader = fs.readFileSync(path.join(rootDir, 'components/layout/MobileHeader.tsx'), 'utf-8');
      expect(mobileHeader).toContain('min-h-[48px] min-w-[48px]');
    });

    it('verifies confirmation and delete actions have clear safeguards and 48px+ touch targets', () => {
      const bookings = fs.readFileSync(path.join(rootDir, 'pages/BookingsWorkspacePage.tsx'), 'utf-8');
      expect(bookings).toContain('min-h-[48px] px-5 py-2.5'); // Cancel button in modal
      expect(bookings).toContain('min-h-[50px] px-6 py-2.5'); // Delete confirm button in modal

      const singleBooking = fs.readFileSync(path.join(rootDir, 'components/bookings/SingleBookingWorkspace.tsx'), 'utf-8');
      expect(singleBooking).toContain('min-h-[48px] px-5 py-2.5'); // Cancel
      expect(singleBooking).toContain('min-h-[50px] px-6 py-2.5'); // Delete confirm
    });
  });

  describe('4. Multi-Portal Responsive Readiness', () => {
    it('verifies Master Admin pages, Studio Owner pages, and Employee portal are audited and responsive', () => {
      const masterDash = fs.readFileSync(path.join(rootDir, 'pages/master/MasterDashboardPage.tsx'), 'utf-8');
      expect(masterDash).toContain('w-full');

      const platformDash = fs.readFileSync(path.join(rootDir, 'pages/platform/PlatformDashboardPage.tsx'), 'utf-8');
      expect(platformDash).toContain('w-full');

      const empDash = fs.readFileSync(path.join(rootDir, 'pages/EmployeeDashboardPage.tsx'), 'utf-8');
      expect(empDash).toContain('w-full');
    });
  });
});
