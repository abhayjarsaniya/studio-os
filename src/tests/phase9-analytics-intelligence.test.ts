import { describe, it, expect, beforeEach } from 'vitest';
import { TenantStore } from '../services/tenantStore';
import { analyticsService } from '../services/analyticsService';
import { reportCenterService } from '../services/reportCenterService';
import { platformAnalyticsService } from '../services/platformAnalyticsService';
import { eventService } from '../services/eventService';
import { customerService } from '../services/customerService';
import { invoiceService } from '../services/invoiceService';
import { paymentService } from '../services/paymentService';
import { expenseService } from '../services/expenseService';
import { taskService } from '../services/taskService';
import { subEventService } from '../services/subEventService';

describe('Phase 9: Analytics & Reporting Intelligence', () => {
  const studioA = 'studio_test_p9_001';
  const studioB = 'studio_test_p9_002';
  const todayStr = new Date().toISOString().split('T')[0];

  beforeEach(() => {
    TenantStore.resetTenant(studioA);
    TenantStore.resetTenant(studioB);
  });

  describe('1. Date Presets & Indian Financial Year Calculation', () => {
    it('calculates correct bounds for standard presets', () => {
      const todayBounds = analyticsService.getDateBounds('today');
      expect(todayBounds.start).toBe(todayStr);
      expect(todayBounds.end).toBe(todayStr);

      const monthBounds = analyticsService.getDateBounds('this_month');
      expect(monthBounds.start).toMatch(/^\d{4}-\d{2}-01$/);
      expect(monthBounds.end).toBe(todayStr);

      const yearBounds = analyticsService.getDateBounds('this_year');
      expect(yearBounds.start).toMatch(/^\d{4}-01-01$/);
      expect(yearBounds.end).toBe(todayStr);
    });

    it('correctly computes Indian Financial Year (April 1 to March 31)', () => {
      const fyBounds = analyticsService.getDateBounds('financial_year');
      expect(fyBounds.start).toMatch(/-\d{2}-01$/);
      expect(fyBounds.start).toContain('-04-01');
      expect(fyBounds.end).toMatch(/-\d{2}-31$/);
      expect(fyBounds.end).toContain('-03-31');
    });

    it('handles custom date range', () => {
      const custom = analyticsService.getDateBounds('custom', '2026-05-01', '2026-05-15');
      expect(custom.start).toBe('2026-05-01');
      expect(custom.end).toBe('2026-05-15');
    });
  });

  describe('2. Multi-Tenant Isolation & 16 Core KPIs', () => {
    it('strictly isolates analytics data between Studio A and Studio B', () => {
      // Create Event & Customer in Studio A
      customerService.createCustomer(studioA, {
        name: 'A-Customer 1',
        phone: '9876543210',
        city: 'Mumbai',
        totalEvents: 1,
        totalSpent: 50000
      });

      eventService.createEvent(studioA, {
        title: 'Studio A Grand Wedding',
        customerName: 'A-Customer 1',
        category: 'Wedding',
        startDate: todayStr,
        endDate: todayStr,
        status: 'Confirmed'
      } as any);

      // Check Studio A KPIs
      const kpisA = analyticsService.getMainKPIs(studioA, { preset: 'this_month' });
      expect(kpisA.totalEvents).toBe(1);
      expect(kpisA.totalCustomers).toBe(1);

      // Studio B must be zero (completely isolated)
      const kpisB = analyticsService.getMainKPIs(studioB, { preset: 'this_month' });
      expect(kpisB.totalEvents).toBe(0);
      expect(kpisB.totalCustomers).toBe(0);
    });

    it('accurately computes financial KPI distinction: Invoiced vs Realized vs Expenses vs Net Profit', () => {
      const cust = customerService.createCustomer(studioA, {
        name: 'Rahul Sharma',
        phone: '9123456780',
        city: 'Delhi'
      });

      // Invoice 1: ₹1,00,000 Issued
      const inv1 = invoiceService.createInvoice(studioA, {
        customerId: cust.id,
        customerName: cust.name,
        invoiceDate: todayStr,
        dueDate: todayStr,
        items: [{ description: 'Wedding Shoot', quantity: 1, unitPrice: 100000, amount: 100000 }],
        subtotal: 100000,
        totalAmount: 100000,
        status: 'Issued'
      });

      // Invoice 2: ₹50,000 Draft (Must NOT be counted in invoiced revenue)
      invoiceService.createInvoice(studioA, {
        customerId: cust.id,
        customerName: cust.name,
        invoiceDate: todayStr,
        dueDate: todayStr,
        items: [{ description: 'Draft Concept', quantity: 1, unitPrice: 50000, amount: 50000 }],
        subtotal: 50000,
        totalAmount: 50000,
        status: 'Draft'
      });

      // Partial Payment: ₹60,000 cleared
      paymentService.recordPayment(studioA, {
        invoiceId: inv1.id,
        amount: 60000,
        paymentDate: todayStr,
        paymentMethod: 'UPI'
      });

      // Operating Expense: ₹15,000 paid
      expenseService.createExpense(studioA, {
        category: 'Equipment Rental',
        title: 'Drone Rental',
        amount: 15000,
        date: todayStr,
        createdByName: 'Studio Owner',
        approvalStatus: 'Approved'
      });

      const kpis = analyticsService.getMainKPIs(studioA, { preset: 'this_month' });

      // Invoiced revenue = ₹1,00,000 (excludes draft ₹50,000)
      expect(kpis.invoicedRevenue).toBe(100000);
      // Realized cash received = ₹60,000
      expect(kpis.revenueReceived).toBe(60000);
      // Outstanding payments = ₹40,000
      expect(kpis.outstandingPayments).toBe(40000);
      // Total expenses = ₹15,000
      expect(kpis.totalExpenses).toBe(15000);
      // Net Profit (Cash basis = 60,000 - 15,000) = ₹45,000
      expect(kpis.netProfit).toBe(45000);
    });
  });

  describe('3. Event Analytics & Drill-Downs', () => {
    it('aggregates status, category, branch, and crew distributions with drill-down IDs', () => {
      eventService.createEvent(studioA, {
        title: 'Ananya & Kabir Wedding',
        category: 'Wedding',
        startDate: todayStr,
        status: 'Confirmed'
      } as any);
      eventService.createEvent(studioA, {
        title: 'Rohit Pre-Wedding',
        category: 'Pre-Wedding',
        startDate: todayStr,
        status: 'Completed'
      } as any);

      const analytics = analyticsService.getEventAnalytics(studioA, { preset: 'this_month' });

      expect(analytics.totalEvents).toBe(2);
      expect(analytics.completionRate).toBe(50); // 1 completed out of 2

      const weddingCat = analytics.categoryDistribution.find(c => c.category === 'Wedding');
      expect(weddingCat).toBeDefined();
      expect(weddingCat?.count).toBe(1);
      expect(weddingCat?.eventIds.length).toBe(1);

      const completedStatus = analytics.statusDistribution.find(s => s.status === 'Completed');
      expect(completedStatus).toBeDefined();
      expect(completedStatus?.count).toBe(1);
    });
  });

  describe('4. 10-Stage Production Funnel & Bottlenecks', () => {
    it('computes 10 default production stages and identifies delays', () => {
      const funnel = analyticsService.getProductionFunnelAnalytics(studioA);

      expect(funnel.stages.length).toBe(10);
      expect(funnel.stages[0].stageName).toBe('Shoot Preparation');
      expect(funnel.stages[9].stageName).toBe('Final Delivery & QC');
      expect(Array.isArray(funnel.bottlenecks)).toBe(true);
    });
  });

  describe('5. Customer Segmentation & CRM Analytics', () => {
    it('correctly tags VIP, repeat, new, and outstanding due segments', () => {
      // VIP customer
      customerService.createCustomer(studioA, {
        name: 'Priya Mehra',
        phone: '9988776655',
        tags: ['VIP'],
        totalSpent: 150000,
        totalEvents: 3
      });

      // Regular new customer
      customerService.createCustomer(studioA, {
        name: 'New Client',
        phone: '9988776611',
        totalEvents: 1,
        totalSpent: 20000
      });

      const crmAnalytics = analyticsService.getCustomerAnalytics(studioA);

      expect(crmAnalytics.totalCustomers).toBe(2);
      expect(crmAnalytics.segments.vip.count).toBe(1);
      expect(crmAnalytics.segments.repeat.count).toBe(1);
      expect(crmAnalytics.segments.new.count).toBe(2);
      expect(crmAnalytics.repeatBookingRate).toBe(50);
    });
  });

  describe('6. Team Performance & Confidentiality Protections', () => {
    it('masks salary details when viewer does not have salary permission', () => {
      TenantStore.set(studioA, 'employees', [
        {
          id: 'emp_01',
          studioId: studioA,
          fullName: 'Arjun Verma',
          designation: 'Senior Photographer',
          department: 'Photography',
          status: 'active',
          salaryProfileId: 'sal_secret_123',
          createdAt: todayStr
        }
      ]);

      // Public viewer: viewerCanViewSalary = false
      const publicMetrics = analyticsService.getTeamAnalytics(studioA, false);
      expect(publicMetrics[0].fullName).toBe('Arjun Verma');
      expect(publicMetrics[0].salaryProfileId).toBeUndefined();

      // Authorized payroll viewer: viewerCanViewSalary = true
      const authorizedMetrics = analyticsService.getTeamAnalytics(studioA, true);
      expect(authorizedMetrics[0].salaryProfileId).toBe('sal_secret_123');
    });
  });

  describe('7. Equipment Clean Empty State', () => {
    it('returns clean empty state when no equipment exists (never fabricates data)', () => {
      const eq = analyticsService.getEquipmentAnalytics(studioA);
      expect(eq.isEmpty).toBe(true);
      expect(eq.totalEquipment).toBe(0);
      expect(eq.items).toEqual([]);
    });
  });

  describe('8. Operational Alerts Engine', () => {
    it('detects unassigned upcoming shoots within 7 days', () => {
      eventService.createEvent(studioA, {
        title: 'Urgent Unassigned Shoot',
        startDate: todayStr,
        status: 'Confirmed',
        assignedCrew: [] // Empty crew
      } as any);

      const alerts = analyticsService.getOperationalAlerts(studioA);
      const unassignedAlert = alerts.find(a => a.type === 'unassigned_crew');

      expect(unassignedAlert).toBeDefined();
      expect(unassignedAlert?.severity).toBe('critical');
      expect(unassignedAlert?.actionLabel).toBe('Assign Crew');
    });

    it('detects overdue invoices requiring payment follow-up', () => {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      invoiceService.createInvoice(studioA, {
        customerId: 'cust_99',
        customerName: 'Defaulting Client',
        dueDate: yesterday, // Past due date!
        items: [{ description: 'Overdue Shoot Services', quantity: 1, unitPrice: 50000, amount: 50000 }],
        subtotal: 50000,
        totalAmount: 50000,
        pendingAmount: 50000,
        status: 'Issued'
      });

      const alerts = analyticsService.getOperationalAlerts(studioA);
      const invoiceAlert = alerts.find(a => a.type === 'overdue_invoice');

      expect(invoiceAlert).toBeDefined();
      expect(invoiceAlert?.severity).toBe('critical');
      expect(invoiceAlert?.actionLabel).toBe('Review Invoices');
    });
  });

  describe('9. Report Center & Formula Injection Prevention', () => {
    it('generates standard reports across categories with summary data', () => {
      eventService.createEvent(studioA, {
        title: 'Report Test Event',
        startDate: todayStr,
        status: 'Completed'
      } as any);

      const report = reportCenterService.generateReport(studioA, 'events', 'Event Shoot Registry');
      expect(report.category).toBe('events');
      expect(report.columns.length).toBeGreaterThan(0);
      expect(report.rows.length).toBe(1);
      expect(report.summary['Total Events']).toBe(1);
    });

    it('sanitizes cells starting with =, +, -, @ to neutralize CSV formula injection', () => {
      // Malicious payload that could execute code in Excel/Calc
      const maliciousVal1 = '=cmd|/c calc!A0';
      const maliciousVal2 = '+1+2';
      const maliciousVal3 = '-5*5';
      const maliciousVal4 = '@SUM(A1:A10)';
      const benignVal = 'Normal Wedding Shoot';

      expect(reportCenterService.sanitizeForCSV(maliciousVal1)).toBe("'=cmd|/c calc!A0");
      expect(reportCenterService.sanitizeForCSV(maliciousVal2)).toBe("'+1+2");
      expect(reportCenterService.sanitizeForCSV(maliciousVal3)).toBe("'-5*5");
      expect(reportCenterService.sanitizeForCSV(maliciousVal4)).toBe("'@SUM(A1:A10)");
      expect(reportCenterService.sanitizeForCSV(benignVal)).toBe('Normal Wedding Shoot');
    });

    it('manages Saved Custom Reports CRUD', () => {
      const saved = reportCenterService.createSavedReport(studioA, {
        name: 'Wedding Revenue Q4',
        category: 'finance',
        filters: { preset: 'this_quarter', startDate: '2026-10-01', endDate: '2026-12-31' },
        selectedFields: ['invoiceNumber', 'customerName', 'totalAmount'],
        visualizationType: 'table',
        scheduledFrequency: 'none',
        sortDirection: 'desc',
        createdBy: 'Studio Admin'
      });

      expect(saved.id).toBeDefined();
      expect(saved.name).toBe('Wedding Revenue Q4');

      // List
      const list = reportCenterService.listSavedReports(studioA);
      expect(list.length).toBe(1);

      // Duplicate
      const dup = reportCenterService.duplicateSavedReport(studioA, saved.id, 'Wedding Revenue Q4 (Copy)');
      expect(dup.name).toBe('Wedding Revenue Q4 (Copy)');
      expect(reportCenterService.listSavedReports(studioA).length).toBe(2);

      // Delete
      const deleted = reportCenterService.deleteSavedReport(studioA, saved.id);
      expect(deleted).toBe(true);
      expect(reportCenterService.listSavedReports(studioA).length).toBe(1);
    });
  });

  describe('10. Platform SaaS Analytics Isolation', () => {
    it('calculates macro SaaS MRR (@ ₹500/studio/month) strictly isolated from photography revenue', () => {
      const saasAnalytics = platformAnalyticsService.getPlatformSaaSAnalytics();

      expect(saasAnalytics.totalStudios).toBeGreaterThan(0);
      expect(saasAnalytics.monthlyRecurringRevenue).toBe(saasAnalytics.activeStudios * 500);
      expect(saasAnalytics.annualizedRunRate).toBe(saasAnalytics.monthlyRecurringRevenue * 12);
      expect(saasAnalytics.renewalRate).toBeGreaterThanOrEqual(0);
      expect(saasAnalytics.churnRate).toBeGreaterThanOrEqual(0);
    });
  });
});
