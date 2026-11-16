import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Studio OS — Complete UI/UX Simplification & Cross-Device Audit', () => {
  const rootDir = path.resolve(__dirname, '..');

  describe('1. Minimal Orange Theme & Color Hierarchy', () => {
    it('verifies signature shiny orange is reserved for primary New Booking action', () => {
      const newBookingButtonContent = fs.readFileSync(
        path.join(rootDir, 'components/common/NewBookingButton.tsx'),
        'utf-8'
      );
      expect(newBookingButtonContent).toContain('bg-gradient-to-r from-orange-500 via-orange-500 to-amber-500');
      expect(newBookingButtonContent).toContain('shadow-orange-500/25');
    });

    it('verifies ordinary controls in CrewMembersPage use neutral charcoal/white instead of shiny orange', () => {
      const crewContent = fs.readFileSync(path.join(rootDir, 'pages/CrewMembersPage.tsx'), 'utf-8');
      // Add Employee button uses neutral charcoal
      expect(crewContent).toContain('bg-zinc-900 hover:bg-zinc-800 text-white font-bold');
      expect(crewContent).not.toContain('bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-base sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer touch-manipulation active:scale-[0.98]">\n          <Plus className="w-4 h-4 text-white" />\n          <span>Add Employee</span>');
    });

    it('verifies ordinary actions in SingleBookingWorkspace use neutral charcoal styling', () => {
      const workspaceContent = fs.readFileSync(
        path.join(rootDir, 'components/bookings/SingleBookingWorkspace.tsx'),
        'utf-8'
      );
      // Assign Crew button uses neutral charcoal
      expect(workspaceContent).toContain('bg-zinc-900 hover:bg-zinc-800 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 transition-all');
      // Quick Multi-Select button uses neutral charcoal
      expect(workspaceContent).toContain('min-h-[44px] px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold');
      // Save Internal Note uses neutral charcoal
      expect(workspaceContent).toContain('min-h-[48px] sm:min-h-[40px] px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-sm font-bold');
      // Save Changes modal button uses neutral charcoal
      expect(workspaceContent).toContain('min-h-[50px] sm:min-h-[44px] px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-xl');
    });

    it('verifies active navigation and segmented tabs use neutral surfaces with subtle orange accents', () => {
      const calendarContent = fs.readFileSync(path.join(rootDir, 'pages/CalendarPage.tsx'), 'utf-8');
      // Segmented buttons use white surface with subtle shadow
      expect(calendarContent).toContain("ownerScheduleFilter === 'all'\n                  ? 'bg-white text-zinc-900 shadow-2xs font-bold border border-zinc-200/80'");
      expect(calendarContent).toContain("viewMode === 'month'\n                  ? 'bg-white text-zinc-900 shadow-2xs font-bold border border-zinc-200/80'");
    });
  });

  describe('2. Mobile Calendar Controls Simplification', () => {
    it('verifies mobile calendar controls are grouped inside compact dropdowns', () => {
      const calendarContent = fs.readFileSync(path.join(rootDir, 'pages/CalendarPage.tsx'), 'utf-8');

      // Mobile controls wrapper
      expect(calendarContent).toContain('sm:hidden items-center justify-between gap-2 w-full');
      // Dropdown 1: All Shoots / My Shoots
      expect(calendarContent).toContain('aria-label="Filter Shoots"');
      expect(calendarContent).toContain('<option value="all">All Shoots');
      expect(calendarContent).toContain('<option value="mine">My Shoots</option>');
      // Dropdown 2: Month / Week / Day
      expect(calendarContent).toContain('aria-label="Calendar View Mode"');
      expect(calendarContent).toContain('<option value="month">Month View</option>');
      expect(calendarContent).toContain('<option value="week">Week View</option>');
      expect(calendarContent).toContain('<option value="day">Day View</option>');
    });

    it('verifies mobile New Booking button on calendar is a compact plus (+) icon with 48-56px touch area', () => {
      const calendarContent = fs.readFileSync(path.join(rootDir, 'pages/CalendarPage.tsx'), 'utf-8');
      expect(calendarContent).toContain('min-w-[48px] min-h-[48px] w-12 h-12 rounded-xl bg-gradient-to-r from-orange-500 via-orange-500 to-amber-500');
      expect(calendarContent).toContain('aria-label="New Booking"');
    });

    it('verifies previous and next month buttons maintain 48x48px touch targets', () => {
      const calendarContent = fs.readFileSync(path.join(rootDir, 'pages/CalendarPage.tsx'), 'utf-8');
      expect(calendarContent).toContain('min-w-[48px] min-h-[48px] w-12 h-12 rounded-xl border border-zinc-200');
    });

    it('verifies square date cells and category event dots are preserved', () => {
      const calendarContent = fs.readFileSync(path.join(rootDir, 'pages/CalendarPage.tsx'), 'utf-8');
      expect(calendarContent).toContain('aspect-square sm:aspect-auto sm:h-22');
      expect(calendarContent).toContain('getEventDotColor');
      expect(calendarContent).toContain('grid grid-cols-7');
    });
  });

  describe('3. Move Selections into Dropdowns & Bottom Sheets', () => {
    it('verifies BookingsWorkspacePage renders a compact dropdown on mobile', () => {
      const bookingsContent = fs.readFileSync(path.join(rootDir, 'pages/BookingsWorkspacePage.tsx'), 'utf-8');
      expect(bookingsContent).toContain('aria-label="Filter bookings by status"');
      expect(bookingsContent).toContain('sm:hidden relative w-full');
      expect(bookingsContent).toContain('min-h-[48px] px-3.5 py-2.5 rounded-xl');
    });

    it('verifies sub-events picker in UnifiedBookingPage operates as a searchable bottom sheet with outside click closing', () => {
      const unifiedContent = fs.readFileSync(path.join(rootDir, 'pages/UnifiedBookingPage.tsx'), 'utf-8');
      expect(unifiedContent).toContain('isSubEventPickerOpen');
      expect(unifiedContent).toContain('fixed inset-x-0 bottom-0 sm:absolute sm:inset-auto sm:right-0 sm:top-full');
      expect(unifiedContent).toContain('Search (e.g. Haldi, Pre-Wedding, Mehndi)...');
    });

    it('verifies deliverables selector operates via DeliverablesSelectorModal with category tabs and counts', () => {
      const modalContent = fs.readFileSync(path.join(rootDir, 'components/bookings/DeliverablesSelectorModal.tsx'), 'utf-8');
      expect(modalContent).toContain('selectedCategory');
      expect(modalContent).toContain('Select All');
      expect(modalContent).toContain('Clear All');
      expect(modalContent).toContain('Wedding Preset');
      expect(modalContent).toContain('selectedIds.size');
    });
  });

  describe('4. Android & iOS Cross-Device Layout & Touch Compliance', () => {
    it('verifies safe area padding is applied to mobile bottom navigation and page body', () => {
      const bottomNavContent = fs.readFileSync(path.join(rootDir, 'components/layout/MobileBottomNav.tsx'), 'utf-8');
      const appContent = fs.readFileSync(path.join(rootDir, 'App.tsx'), 'utf-8');

      expect(bottomNavContent).toContain('pb-safe');
      expect(appContent).toContain('pb-32 sm:pb-8');
      expect(appContent).toContain('px-4 py-3 sm:px-5 sm:py-4');
    });

    it('verifies no sub-12px font utility violations exist across key pages', () => {
      const files = [
        'pages/CalendarPage.tsx',
        'pages/BookingsWorkspacePage.tsx',
        'pages/DashboardPage.tsx',
        'pages/CrewMembersPage.tsx',
        'pages/UnifiedBookingPage.tsx',
        'components/bookings/SingleBookingWorkspace.tsx'
      ];

      const sub12pxRegex = /(?:sm:|md:|lg:|hover:|focus:)?text-\[(?:8|9|10|11)px\]/g;
      for (const rel of files) {
        const content = fs.readFileSync(path.join(rootDir, rel), 'utf-8');
        expect(sub12pxRegex.test(content)).toBe(false);
      }
    });

    it('verifies touch target sizes meet minimum 44-48px standards on mobile interactive elements', () => {
      const calendarContent = fs.readFileSync(path.join(rootDir, 'pages/CalendarPage.tsx'), 'utf-8');
      const bookingsContent = fs.readFileSync(path.join(rootDir, 'pages/BookingsWorkspacePage.tsx'), 'utf-8');

      expect(calendarContent).toContain('min-h-[48px]');
      expect(bookingsContent).toContain('min-h-[48px]');
    });
  });
});
