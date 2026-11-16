import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Studio OS — Mobile UI Cleanup & Booking Workspace Redesign', () => {
  const rootDir = path.resolve(__dirname, '../..');

  describe('1. Removal of Unnecessary Page Subheadings', () => {
    it('verifies subheadings have been removed from CreateBookingPage, CreateQuotationPage, TasksPage, and RolesPage', () => {
      const createBooking = fs.readFileSync(path.join(rootDir, 'src/pages/CreateBookingPage.tsx'), 'utf-8');
      expect(createBooking).not.toContain('6-step fast-track workflow');

      const createQuotation = fs.readFileSync(path.join(rootDir, 'src/pages/CreateQuotationPage.tsx'), 'utf-8');
      expect(createQuotation).not.toContain('Build professional photography price quotes');

      const tasks = fs.readFileSync(path.join(rootDir, 'src/pages/TasksPage.tsx'), 'utf-8');
      expect(tasks).not.toContain('Photography production pipeline');

      const roles = fs.readFileSync(path.join(rootDir, 'src/pages/RolesPage.tsx'), 'utf-8');
      expect(roles).not.toContain('Configure module privileges across 24 modules');
    });

    it('verifies developer/technical subtitles have been removed from platform and master pages', () => {
      const platformAnalytics = fs.readFileSync(path.join(rootDir, 'src/pages/PlatformAnalyticsPage.tsx'), 'utf-8');
      expect(platformAnalytics).not.toContain('Macro-level SaaS subscription health');

      const masterAccounts = fs.readFileSync(path.join(rootDir, 'src/pages/master/MasterAccountsPage.tsx'), 'utf-8');
      expect(masterAccounts).not.toContain('Centralized directory of all Master Admins');

      const masterAudit = fs.readFileSync(path.join(rootDir, 'src/pages/master/MasterAuditLogsPage.tsx'), 'utf-8');
      expect(masterAudit).not.toContain('Tamper-evident logs of every Master Admin action');

      const eventDetail = fs.readFileSync(path.join(rootDir, 'src/pages/EventDetailPage.tsx'), 'utf-8');
      expect(eventDetail).not.toContain('Tenant Partition:');
    });
  });

  describe('2. Mobile Margins and Space Optimization', () => {
    it('verifies mobile side gutters are strictly 16-20px (px-4 sm:px-5) in main layout', () => {
      const appContent = fs.readFileSync(path.join(rootDir, 'src/App.tsx'), 'utf-8');
      expect(appContent).toContain('px-4 py-3 sm:px-5 sm:py-4');
    });

    it('verifies touch-scroll and pb-safe are established', () => {
      const appContent = fs.readFileSync(path.join(rootDir, 'src/App.tsx'), 'utf-8');
      expect(appContent).toContain('touch-scroll');
      expect(appContent).toContain('pb-32 sm:pb-8');
    });
  });

  describe('3. Deliverables Fast Multi-Select Modal Component', () => {
    it('verifies DeliverablesSelectorModal has category filter tabs, search input, and quick action presets', () => {
      const modalContent = fs.readFileSync(path.join(rootDir, 'src/components/bookings/DeliverablesSelectorModal.tsx'), 'utf-8');
      
      // Category tabs & filters
      expect(modalContent).toContain('Albums & Prints');
      expect(modalContent).toContain('Digital');
      expect(modalContent).toContain('Photos');
      expect(modalContent).toContain('Videos');

      // Quick action presets
      expect(modalContent).toContain('Select All');
      expect(modalContent).toContain('Clear All');
      expect(modalContent).toContain('Wedding Preset');
      expect(modalContent).toContain('Pre-Wedding Preset');

      // Search input with 48px+ mobile touch height
      expect(modalContent).toContain('min-h-[48px]');
      expect(modalContent).toContain('Search deliverables');

      // Large comfortable touch checkboxes (min 48px row)
      expect(modalContent).toContain('min-h-[50px]');
      expect(modalContent).toContain('cursor-pointer');
    });

    it('verifies DeliverablesSelectorModal is integrated in both UnifiedBookingPage and SingleBookingWorkspace', () => {
      const unifiedPage = fs.readFileSync(path.join(rootDir, 'src/pages/UnifiedBookingPage.tsx'), 'utf-8');
      expect(unifiedPage).toContain('DeliverablesSelectorModal');
      expect(unifiedPage).toContain('Quick Multi-Select Deliverables');

      const workspace = fs.readFileSync(path.join(rootDir, 'src/components/bookings/SingleBookingWorkspace.tsx'), 'utf-8');
      expect(workspace).toContain('DeliverablesSelectorModal');
      expect(workspace).toContain('Quick Multi-Select');
    });
  });

  describe('4. Redesigned Mobile Booking Workspace (9 Collapsible Accordion Sections)', () => {
    const workspaceContent = fs.readFileSync(path.join(rootDir, 'src/components/bookings/SingleBookingWorkspace.tsx'), 'utf-8');

    it('verifies all 9 accordion sections exist with IDs and headings', () => {
      expect(workspaceContent).toContain('id="section-customer"');
      expect(workspaceContent).toContain('1. Customer Details');

      expect(workspaceContent).toContain('id="section-event"');
      expect(workspaceContent).toContain('2. Event Details');

      expect(workspaceContent).toContain('id="section-crew"');
      expect(workspaceContent).toContain('3. Crew & Assignments');

      expect(workspaceContent).toContain('id="section-package"');
      expect(workspaceContent).toContain('4. Package & Services');

      expect(workspaceContent).toContain('id="section-money"');
      expect(workspaceContent).toContain('5. Money & Payments');

      expect(workspaceContent).toContain('id="section-deliverables"');
      expect(workspaceContent).toContain('6. Deliverables & Work');

      expect(workspaceContent).toContain('id="section-album"');
      expect(workspaceContent).toContain('7. Album & Production');

      expect(workspaceContent).toContain('id="section-notes"');
      expect(workspaceContent).toContain('8. Notes & Communication');

      expect(workspaceContent).toContain('id="section-history"');
      expect(workspaceContent).toContain('9. Complete History');
    });

    it('verifies Customer Details is expanded by default while other 8 sections start collapsed', () => {
      expect(workspaceContent).toContain('customer: true');
      expect(workspaceContent).toContain('event: false');
      expect(workspaceContent).toContain('crew: false');
      expect(workspaceContent).toContain('package: false');
      expect(workspaceContent).toContain('money: false');
      expect(workspaceContent).toContain('deliverables: false');
      expect(workspaceContent).toContain('album: false');
      expect(workspaceContent).toContain('notes: false');
      expect(workspaceContent).toContain('history: false');
    });

    it('verifies Expand All and Collapse All control buttons exist', () => {
      expect(workspaceContent).toContain('onClick={expandAll}');
      expect(workspaceContent).toContain('onClick={collapseAll}');
      expect(workspaceContent).toContain('Expand All');
      expect(workspaceContent).toContain('Collapse All');
    });

    it('verifies dynamic short summaries are rendered in accordion headers', () => {
      // Dynamic summary indicators
      expect(workspaceContent).toContain('{editFormData.customerName || \'Customer\'} • {editFormData.customerPhone || \'No Phone\'}');
      expect(workspaceContent).toContain('{editFormData.eventDate || \'Date TBD\'} • {(booking.functions || []).length} Sub-Events');
      expect(workspaceContent).toContain('{crewTableRows.length} Assigned • Studio Owner Included');
      expect(workspaceContent).toContain('{completedCount} of {checklistItems.length} Done');
      expect(workspaceContent).toContain('{albumFormData.size} • {albumFormData.sheets} Sheets');
    });

    it('verifies Section 7 (Album & Production) contains sheets, copies, size, material, paper finish, and vendor', () => {
      expect(workspaceContent).toContain('albumFormData.albumType');
      expect(workspaceContent).toContain('albumFormData.size');
      expect(workspaceContent).toContain('albumFormData.sheets');
      expect(workspaceContent).toContain('albumFormData.copies');
      expect(workspaceContent).toContain('albumFormData.paperFinish');
      expect(workspaceContent).toContain('albumFormData.printingVendor');
      expect(workspaceContent).toContain('handleUpdateAlbumSpecs');
    });

    it('verifies quick jump navigation buttons meet min 48px touch height standards', () => {
      expect(workspaceContent).toContain('min-h-[48px] px-4 py-2.5 rounded-xl text-xs font-bold');
    });
  });

  describe('5. Comfortable Mobile Touch Targets & Zero Sub-12px Font Violations', () => {
    it('verifies primary buttons in workspace and modals meet 50px+ standards', () => {
      const workspaceContent = fs.readFileSync(path.join(rootDir, 'src/components/bookings/SingleBookingWorkspace.tsx'), 'utf-8');
      expect(workspaceContent).toContain('min-h-[50px] sm:min-h-[44px]');
      expect(workspaceContent).toContain('min-h-[56px]');
    });

    it('strictly ensures no sub-12px utility classes exist in newly created or edited files', () => {
      const files = [
        'src/components/bookings/DeliverablesSelectorModal.tsx',
        'src/components/bookings/SingleBookingWorkspace.tsx',
        'src/pages/UnifiedBookingPage.tsx'
      ];

      const sub12pxRegex = /(?:sm:|md:|lg:|hover:|focus:)?text-\[(?:8|9|10|11)px\]/g;
      for (const rel of files) {
        const content = fs.readFileSync(path.join(rootDir, rel), 'utf-8');
        expect(sub12pxRegex.test(content)).toBe(false);
      }
    });
  });
});
