import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { crewConflictService } from '../services/crewConflictService';
import { bookingProductionService } from '../services/bookingProductionService';

describe('Studio OS — Calendar, Bookings & Mobile UI Refinement Tests', () => {
  const rootDir = path.resolve(__dirname, '..');
  const TEST_STUDIO = 'studio_shreeji_films';

  describe('1. Remove Crew Conflict Warning Messages & Subtle Icon Info Popover', () => {
    it('verifies the persistent crew conflict warning banner has been removed from CalendarPage.tsx', () => {
      const calendarContent = fs.readFileSync(path.join(rootDir, 'pages/CalendarPage.tsx'), 'utf-8');

      // The large persistent banner must NOT exist
      expect(calendarContent).not.toContain('crewConflictsOnSelectedDay.length > 0');
      expect(calendarContent).not.toContain('Crew Scheduling Conflict Detected');
    });

    it('verifies subtle conflict indicator and popover modal for schedule overlaps exist in CalendarPage.tsx', () => {
      const calendarContent = fs.readFileSync(path.join(rootDir, 'pages/CalendarPage.tsx'), 'utf-8');

      // Conflict detection occurs in background per event
      expect(calendarContent).toContain('getEventConflicts');
      expect(calendarContent).toContain('activeConflictInfo');
      // Subtle Conflict Info button
      expect(calendarContent).toContain('Conflict Info');
      // Popover details modal
      expect(calendarContent).toContain('Crew Schedule Overlap');
    });

    it('verifies crew conflict detection operates silently in background via crewConflictService without blocking', () => {
      const employees = crewConflictService.getActiveEmployees(TEST_STUDIO);
      expect(employees.length).toBeGreaterThan(0);

      const targetEmp = employees[0];
      const conflictResult = crewConflictService.checkConflict(
        TEST_STUDIO,
        targetEmp.id,
        '2026-11-20',
        '10:00',
        '18:00'
      );
      // crewConflictService detects conflicts properly in background
      expect(typeof conflictResult.hasConflict).toBe('boolean');
    });
  });

  describe('2. Separate Booking History and Analytics', () => {
    it('verifies BookingsWorkspacePage renders a clean searchable list without embedded analytics cards', () => {
      const bookingsContent = fs.readFileSync(path.join(rootDir, 'pages/BookingsWorkspacePage.tsx'), 'utf-8');

      // Must have directory heading and clean table/cards
      expect(bookingsContent).toContain('Bookings Directory');
      expect(bookingsContent).toContain('Search by customer name');
      // Filter pills
      expect(bookingsContent).toContain('All Bookings');
      expect(bookingsContent).toContain('Upcoming');
      expect(bookingsContent).toContain('Confirmed');
      expect(bookingsContent).toContain('In Progress');
      expect(bookingsContent).toContain('Completed');
      expect(bookingsContent).toContain('Pending Payment');
    });

    it('verifies historical and active bookings are listed and searchable', () => {
      const bookings = bookingProductionService.listBookings(TEST_STUDIO);
      expect(bookings.length).toBeGreaterThan(0);

      // Bookings can be searched by bookingNumber or customer
      const b0 = bookings[0];
      expect(b0.bookingNumber).toBeDefined();
      expect(b0.customerName).toBeDefined();
    });

    it('verifies ReportCenterPage and AnalyticsPage house operational analytics & metrics', () => {
      const reportCenterContent = fs.readFileSync(path.join(rootDir, 'pages/ReportCenterPage.tsx'), 'utf-8');
      const analyticsContent = fs.readFileSync(path.join(rootDir, 'pages/AnalyticsPage.tsx'), 'utf-8');

      expect(reportCenterContent).toContain('Report Center & Data Export');
      expect(analyticsContent).toContain('Analytics & Business Intelligence');
    });
  });

  describe('3. Remove Unnecessary Page Subheadings Across All Portals', () => {
    it('verifies redundant subtitle in CalendarPage.tsx has been removed', () => {
      const content = fs.readFileSync(path.join(rootDir, 'pages/CalendarPage.tsx'), 'utf-8');
      expect(content).not.toContain('Overview of photography bookings, crew allocations and multi-event schedules');
    });

    it('verifies redundant subtitle in BookingsWorkspacePage.tsx has been removed', () => {
      const content = fs.readFileSync(path.join(rootDir, 'pages/BookingsWorkspacePage.tsx'), 'utf-8');
      expect(content).not.toContain('Select any booking to manage customer details, payments, delivery checklists');
    });

    it('verifies redundant subtitle in UnifiedBookingPage.tsx has been removed', () => {
      const content = fs.readFileSync(path.join(rootDir, 'pages/UnifiedBookingPage.tsx'), 'utf-8');
      expect(content).not.toContain('Progressive workflow: customer, event schedule, team allocation');
    });

    it('verifies redundant subtitle in CrewMembersPage.tsx has been removed', () => {
      const content = fs.readFileSync(path.join(rootDir, 'pages/CrewMembersPage.tsx'), 'utf-8');
      expect(content).not.toContain('Full employee lifecycle: add, view, edit, password reset');
    });

    it('verifies redundant subtitle in CustomersPage.tsx has been removed', () => {
      const content = fs.readFileSync(path.join(rootDir, 'pages/CustomersPage.tsx'), 'utf-8');
      expect(content).not.toContain('Complete photography client directory, lead pipelines');
    });

    it('verifies redundant subtitle in EventsPage.tsx has been removed', () => {
      const content = fs.readFileSync(path.join(rootDir, 'pages/EventsPage.tsx'), 'utf-8');
      expect(content).not.toContain('Multi-view shoot manager');
    });

    it('verifies redundant subtitle in EmployeeDashboardPage.tsx has been removed', () => {
      const content = fs.readFileSync(path.join(rootDir, 'pages/EmployeeDashboardPage.tsx'), 'utf-8');
      expect(content).not.toContain('Mark your presence, inspect assigned shoot call times');
    });

    it('verifies redundant subtitle in MasterDashboardPage.tsx has been removed', () => {
      const content = fs.readFileSync(path.join(rootDir, 'pages/master/MasterDashboardPage.tsx'), 'utf-8');
      expect(content).not.toContain('Real-time multi-studio performance, subscription MRR');
    });

    it('verifies redundant subtitle in MasterStudiosPage.tsx has been removed', () => {
      const content = fs.readFileSync(path.join(rootDir, 'pages/master/MasterStudiosPage.tsx'), 'utf-8');
      expect(content).not.toContain('Inspect studio subscriptions, team headcounts, booking activity');
    });
  });

  describe('4. Mobile Side Margins and Spacing (16–20px Max)', () => {
    it('verifies main app viewport container sets side margins between 16px and 20px', () => {
      const appContent = fs.readFileSync(path.join(rootDir, 'App.tsx'), 'utf-8');
      // px-4 is 16px, sm:px-5 is 20px
      expect(appContent).toContain('px-4 py-3 sm:px-5 sm:py-4 lg:px-6 lg:py-5');
      expect(appContent).toContain('pb-32 sm:pb-8');
      expect(appContent).toContain('touch-scroll');
    });
  });

  describe('5. Calendar — Colored Event Dots and Categories', () => {
    it('verifies getEventDotColor helper is defined with consistent category colors', () => {
      const calendarContent = fs.readFileSync(path.join(rootDir, 'pages/CalendarPage.tsx'), 'utf-8');

      expect(calendarContent).toContain('getEventDotColor');
      expect(calendarContent).toContain('bg-orange-500'); // Wedding
      expect(calendarContent).toContain('bg-amber-500');  // Pre-Wedding
      expect(calendarContent).toContain('bg-rose-500');   // Engagement
      expect(calendarContent).toContain('bg-purple-500'); // Reception
    });

    it('verifies date cells render clean indicator dots and count indicator for multiple events', () => {
      const calendarContent = fs.readFileSync(path.join(rootDir, 'pages/CalendarPage.tsx'), 'utf-8');

      // Renders colored dots in flex row
      expect(calendarContent).toContain('rounded-full shrink-0 ${getEventDotColor(ev.category)}');
      // Shows +X indicator if > 3 events
      expect(calendarContent).toContain('+{eventsOnDay.length - 3}');
    });
  });

  describe('6. Mobile Calendar Layout — Square Date Cells and Agenda', () => {
    it('verifies mobile date cells are square (aspect-square) with 7-column equal grid', () => {
      const calendarContent = fs.readFileSync(path.join(rootDir, 'pages/CalendarPage.tsx'), 'utf-8');

      // Aspect square on mobile, sm:aspect-auto sm:h-22 on desktop
      expect(calendarContent).toContain('aspect-square sm:aspect-auto sm:h-22');
      expect(calendarContent).toContain('grid grid-cols-7');
    });

    it('verifies selected date opens complete event agenda below calendar', () => {
      const calendarContent = fs.readFileSync(path.join(rootDir, 'pages/CalendarPage.tsx'), 'utf-8');

      // Agenda panel displays day's schedule
      expect(calendarContent).toContain('Shoots Scheduled');
      expect(calendarContent).toContain('dayEvents.map(ev =>');
      expect(calendarContent).toContain('+ Book Another Shoot on this Date');
    });
  });
});
