import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('STUDIO OS — Remove History Bookings Menu & Complete UI/UX Repair', () => {
  const mobileHeaderPath = path.resolve(__dirname, '../components/layout/MobileHeader.tsx');
  const appPath = path.resolve(__dirname, '../App.tsx');
  const appContextPath = path.resolve(__dirname, '../context/AppContext.tsx');
  const bookingsWorkspacePath = path.resolve(__dirname, '../pages/BookingsWorkspacePage.tsx');
  const singleBookingPath = path.resolve(__dirname, '../components/bookings/SingleBookingWorkspace.tsx');

  it('1. verifies MobileHeader has completely removed the separate "History Bookings" menu item', () => {
    const content = fs.readFileSync(mobileHeaderPath, 'utf-8');
    // Ensure "History Bookings" button text is not in the drawer
    expect(content).not.toMatch(/<span>History Bookings<\/span>/);
    // Ensure Bookings is present
    expect(content).toMatch(/<span>Bookings<\/span>/);
  });

  it('2. verifies MobileHeader has a prominent shiny orange "+ New Booking" button in mobile drawer', () => {
    const content = fs.readFileSync(mobileHeaderPath, 'utf-8');
    expect(content).toContain('+ New Booking');
    expect(content).toContain('from-orange-500 via-orange-500 to-amber-500');
    expect(content).toContain('min-h-[48px]');
  });

  it('3. verifies active navigation items use minimal orange styling without solid orange background', () => {
    const content = fs.readFileSync(mobileHeaderPath, 'utf-8');
    // Solid orange gradient should NOT be used for active navigation tabs
    expect(content).not.toContain("activeTab === 'dashboard' ? 'bg-gradient-to-r from-orange-500 to-amber-600");
    // Minimal orange style is used
    expect(content).toContain("text-orange-600 font-bold bg-orange-50/60");
  });

  it('4. verifies App.tsx maps both history and bookings routes directly to BookingsWorkspacePage', () => {
    const content = fs.readFileSync(appPath, 'utf-8');
    expect(content).toContain("case 'history':");
    expect(content).toContain("case 'bookings':");
    expect(content).toContain("return <BookingsWorkspacePage />;");
  });

  it('5. verifies AppContext.tsx redirects #/app/history hash to bookings tab', () => {
    const content = fs.readFileSync(appContextPath, 'utf-8');
    expect(content).toContain("hash.startsWith('#/app/history') || hash.startsWith('#/app/bookings')");
  });

  it('6. verifies BookingsWorkspacePage sorts bookings to prioritize latest events first', () => {
    const content = fs.readFileSync(bookingsWorkspacePath, 'utf-8');
    expect(content).toContain('.sort((a, b) => {');
    expect(content).toContain('return dateB.localeCompare(dateA);');
  });

  it('7. verifies Complete History is retained within Section 9 of SingleBookingWorkspace', () => {
    const content = fs.readFileSync(singleBookingPath, 'utf-8');
    expect(content).toContain('CompleteBookingHistoryTab');
    expect(content).toContain('9. Complete History');
  });

  it('8. verifies zero sub-12px font utility classes exist in modified files', () => {
    const files = [mobileHeaderPath, appPath, appContextPath, bookingsWorkspacePath];
    for (const f of files) {
      const content = fs.readFileSync(f, 'utf-8');
      expect(content).not.toMatch(/text-\[10px\]/);
      expect(content).not.toMatch(/text-\[11px\]/);
    }
  });

  it('9. verifies touch target sizing (>= 48px min height on mobile interactive elements)', () => {
    const headerContent = fs.readFileSync(mobileHeaderPath, 'utf-8');
    expect(headerContent).toContain('min-h-[48px]');
  });
});
