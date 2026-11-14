import { TenantStore } from './tenantStore';
import { 
  SavedReportConfig, 
  ReportCategory, 
  ReportJob, 
  AnalyticsFilter,
  Studio
} from '../types/schema';
import { eventService } from './eventService';
import { customerService } from './customerService';
import { invoiceService } from './invoiceService';
import { expenseService } from './expenseService';
import { taskService } from './taskService';
import { subEventService } from './subEventService';
import { analyticsService } from './analyticsService';
import { studioService } from './studioService';

export interface ReportColumn {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
}

export interface GeneratedReportData {
  reportId: string;
  name: string;
  category: ReportCategory;
  columns: ReportColumn[];
  rows: Record<string, any>[];
  totalRecords: number;
  summary: Record<string, any>;
  generatedAt: string;
  studioName: string;
}

export class ReportCenterService {
  /**
   * List all saved custom reports for a studio
   */
  listSavedReports(studioId: string): SavedReportConfig[] {
    return TenantStore.get<SavedReportConfig>(studioId, 'savedReports') || [];
  }

  getSavedReport(studioId: string, id: string): SavedReportConfig | undefined {
    return this.listSavedReports(studioId).find(r => r.id === id);
  }

  createSavedReport(
    studioId: string, 
    data: Omit<SavedReportConfig, 'id' | 'studioId' | 'createdAt'>
  ): SavedReportConfig {
    const existing = this.listSavedReports(studioId);
    const newReport: SavedReportConfig = {
      ...data,
      id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      studioId,
      createdAt: new Date().toISOString()
    };
    TenantStore.set(studioId, 'savedReports', [newReport, ...existing]);
    return newReport;
  }

  updateSavedReport(
    studioId: string, 
    id: string, 
    patch: Partial<SavedReportConfig>
  ): SavedReportConfig {
    const existing = this.listSavedReports(studioId);
    const index = existing.findIndex(r => r.id === id);
    if (index === -1) throw new Error(`Report config ${id} not found`);

    const updated = {
      ...existing[index],
      ...patch,
      updatedAt: new Date().toISOString()
    };
    existing[index] = updated;
    TenantStore.set(studioId, 'savedReports', existing);
    return updated;
  }

  deleteSavedReport(studioId: string, id: string): boolean {
    const existing = this.listSavedReports(studioId);
    const filtered = existing.filter(r => r.id !== id);
    if (filtered.length === existing.length) return false;
    TenantStore.set(studioId, 'savedReports', filtered);
    return true;
  }

  duplicateSavedReport(studioId: string, id: string, newName?: string): SavedReportConfig {
    const report = this.getSavedReport(studioId, id);
    if (!report) throw new Error(`Report ${id} not found`);

    const copyData: Omit<SavedReportConfig, 'id' | 'studioId' | 'createdAt'> = {
      ...report,
      name: newName || `${report.name} (Copy)`
    };
    return this.createSavedReport(studioId, copyData);
  }

  /**
   * Run a standard or custom report and generate tabular records with summaries
   */
  generateReport(
    studioId: string, 
    category: ReportCategory, 
    reportType: string, 
    filter?: Partial<AnalyticsFilter>
  ): GeneratedReportData {
    let studioName = 'Photography Studio';
    try {
      const studio = studioService.getStudio(studioId);
      if (studio?.name) studioName = studio.name;
    } catch {
      studioName = studioId;
    }
    const bounds = analyticsService.getDateBounds(filter?.preset || 'this_month', filter?.startDate, filter?.endDate);

    let columns: ReportColumn[] = [];
    let rows: Record<string, any>[] = [];
    let summary: Record<string, any> = {};

    switch (category) {
      case 'events': {
        const events = eventService.listEvents(studioId).filter(e => {
          if (e.startDate < bounds.start || e.startDate > bounds.end) return false;
          if (filter?.eventCategory && e.category !== filter.eventCategory) return false;
          if (filter?.eventStatus && e.status !== filter.eventStatus) return false;
          return true;
        });

        columns = [
          { key: 'eventNumber', label: 'Event ID' },
          { key: 'title', label: 'Event Title' },
          { key: 'customerName', label: 'Customer' },
          { key: 'category', label: 'Category' },
          { key: 'startDate', label: 'Start Date' },
          { key: 'venue', label: 'Venue' },
          { key: 'status', label: 'Status' }
        ];

        rows = events.map(e => ({
          id: e.id,
          eventNumber: e.eventNumber || e.id,
          title: e.title,
          customerName: e.customerName || 'N/A',
          category: e.category,
          startDate: e.startDate,
          venue: e.venue || 'Studio / Location',
          status: e.status
        }));

        summary = {
          'Total Events': rows.length,
          'Completed': rows.filter(r => r.status === 'Completed').length,
          'In Progress': rows.filter(r => r.status === 'In Progress').length
        };
        break;
      }

      case 'customers': {
        const customers = customerService.listCustomers(studioId);
        columns = [
          { key: 'name', label: 'Customer Name' },
          { key: 'phone', label: 'Phone' },
          { key: 'email', label: 'Email' },
          { key: 'city', label: 'City' },
          { key: 'status', label: 'Status' },
          { key: 'totalEvents', label: 'Events Count', align: 'right' },
          { key: 'totalSpent', label: 'Total Spent (₹)', align: 'right' }
        ];

        rows = customers.map(c => ({
          id: c.id,
          name: c.name,
          phone: c.phone || 'N/A',
          email: c.email || 'N/A',
          city: c.city || 'N/A',
          status: c.status || 'Active',
          totalEvents: (c as any).totalEvents || (c as any).totalBookings || 0,
          totalSpent: (c as any).totalSpent || 0
        }));

        const totalSpentAll = rows.reduce((acc, r) => acc + (r.totalSpent || 0), 0);
        summary = {
          'Total Customers': rows.length,
          'Total Revenue (₹)': totalSpentAll
        };
        break;
      }

      case 'finance': {
        const invoices = invoiceService.listInvoices(studioId).filter(inv => {
          const invDate = inv.invoiceDate || inv.createdAt;
          if (invDate < bounds.start || invDate > bounds.end) return false;
          return inv.status !== 'Draft';
        });

        columns = [
          { key: 'invoiceNumber', label: 'Invoice No' },
          { key: 'customerName', label: 'Customer' },
          { key: 'invoiceDate', label: 'Date' },
          { key: 'dueDate', label: 'Due Date' },
          { key: 'totalAmount', label: 'Total (₹)', align: 'right' },
          { key: 'paidAmount', label: 'Paid (₹)', align: 'right' },
          { key: 'pendingAmount', label: 'Pending (₹)', align: 'right' },
          { key: 'status', label: 'Status' }
        ];

        rows = invoices.map(i => ({
          id: i.id,
          invoiceNumber: i.invoiceNumber,
          customerName: i.customerName || 'N/A',
          invoiceDate: i.invoiceDate || i.createdAt.split('T')[0],
          dueDate: i.dueDate,
          totalAmount: i.totalAmount,
          paidAmount: i.paidAmount || 0,
          pendingAmount: i.pendingAmount !== undefined ? i.pendingAmount : (i.outstandingBalance || 0),
          status: i.status
        }));

        const totalBilled = rows.reduce((acc, r) => acc + r.totalAmount, 0);
        const totalPaid = rows.reduce((acc, r) => acc + r.paidAmount, 0);
        const totalPending = rows.reduce((acc, r) => acc + r.pendingAmount, 0);

        summary = {
          'Total Billed (₹)': totalBilled,
          'Total Collected (₹)': totalPaid,
          'Total Outstanding (₹)': totalPending
        };
        break;
      }

      case 'production': {
        const tasks = taskService.listTasks(studioId).filter(t => {
          if (t.dueDate < bounds.start || t.dueDate > bounds.end) return false;
          return true;
        });

        columns = [
          { key: 'taskNumber', label: 'Task ID' },
          { key: 'title', label: 'Task Title' },
          { key: 'eventName', label: 'Event' },
          { key: 'assignedToName', label: 'Assigned To' },
          { key: 'dueDate', label: 'Due Date' },
          { key: 'priority', label: 'Priority' },
          { key: 'status', label: 'Status' }
        ];

        rows = tasks.map(t => ({
          id: t.id,
          taskNumber: t.taskNumber || t.id,
          title: t.title,
          eventName: t.eventName || 'N/A',
          assignedToName: t.assignedToName || 'Unassigned',
          dueDate: t.dueDate,
          priority: t.priority || 'Medium',
          status: t.status || 'Pending'
        }));

        summary = {
          'Total Tasks': rows.length,
          'Completed': rows.filter(r => r.status === 'Completed').length,
          'In Progress': rows.filter(r => r.status === 'In Progress').length
        };
        break;
      }

      case 'team': {
        const teamMetrics = analyticsService.getTeamAnalytics(studioId, false);
        columns = [
          { key: 'fullName', label: 'Employee Name' },
          { key: 'designation', label: 'Designation' },
          { key: 'department', label: 'Department' },
          { key: 'assignedEventsCount', label: 'Events Assigned', align: 'right' },
          { key: 'totalTasksCount', label: 'Tasks', align: 'right' },
          { key: 'completedTasksCount', label: 'Completed', align: 'right' },
          { key: 'overdueTasksCount', label: 'Overdue', align: 'right' },
          { key: 'completionRate', label: 'Task Rate %', align: 'right' }
        ];

        rows = teamMetrics;
        summary = {
          'Total Team Members': rows.length,
          'Active Staff': rows.filter(r => r.status === 'active').length
        };
        break;
      }

      case 'equipment': {
        const eqData = analyticsService.getEquipmentAnalytics(studioId);
        columns = [
          { key: 'name', label: 'Equipment Name' },
          { key: 'category', label: 'Category' },
          { key: 'serialNumber', label: 'Serial No' },
          { key: 'status', label: 'Status' }
        ];
        rows = eqData.items.map((eq: any) => ({
          id: eq.id,
          name: eq.name,
          category: eq.category || 'Gear',
          serialNumber: eq.serialNumber || 'N/A',
          status: eq.status || 'available'
        }));
        summary = {
          'Total Gear': eqData.totalEquipment,
          'Available': eqData.available,
          'In Use': eqData.inUse,
          'In Maintenance': eqData.maintenance
        };
        break;
      }

      case 'business':
      default: {
        const kpis = analyticsService.getMainKPIs(studioId, filter);
        columns = [
          { key: 'metric', label: 'Executive Business Metric' },
          { key: 'value', label: 'Value', align: 'right' }
        ];

        rows = [
          { metric: 'Total Events in Period', value: kpis.totalEvents },
          { metric: 'Completed Events', value: kpis.completedEvents },
          { metric: 'Total Customers', value: kpis.totalCustomers },
          { metric: 'New Customers', value: kpis.newCustomers },
          { metric: 'Lead Conversion Rate', value: `${kpis.leadConversionRate}%` },
          { metric: 'Invoiced Revenue', value: `₹${kpis.invoicedRevenue.toLocaleString('en-IN')}` },
          { metric: 'Cash Received', value: `₹${kpis.revenueReceived.toLocaleString('en-IN')}` },
          { metric: 'Outstanding Receivables', value: `₹${kpis.outstandingPayments.toLocaleString('en-IN')}` },
          { metric: 'Recognized Expenses', value: `₹${kpis.totalExpenses.toLocaleString('en-IN')}` },
          { metric: 'Net Operating Profit', value: `₹${kpis.netProfit.toLocaleString('en-IN')}` },
          { metric: 'Active Workflows', value: kpis.activeWorkflows },
          { metric: 'Tasks Completed', value: kpis.completedTasks },
          { metric: 'Overdue Tasks', value: kpis.overdueTasks },
          { metric: 'Team Utilization', value: `${kpis.teamUtilization}%` }
        ];

        summary = {
          'Net Cash Profit (₹)': kpis.netProfit,
          'Total Events': kpis.totalEvents
        };
        break;
      }
    }

    return {
      reportId: `rep_${category}_${Date.now()}`,
      name: reportType || `${category.toUpperCase()} Report`,
      category,
      columns,
      rows,
      totalRecords: rows.length,
      summary,
      generatedAt: new Date().toISOString(),
      studioName
    };
  }

  /**
   * Safe CSV String Sanitizer:
   * Strictly prevents Spreadsheet Formula Injection (CSV Injection).
   * If any value starts with '=', '+', '-', or '@', prepend a single quote (').
   */
  sanitizeForCSV(value: any): string {
    if (value === null || value === undefined) return '';
    let str = String(value);

    // Formula injection guard
    if (/^[=+\-@]/.test(str)) {
      str = "'" + str;
    }

    // Escape double quotes and enclose in quotes if comma or newline present
    if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  /**
   * Convert generated report dataset into a secure, standard CSV string
   */
  exportToCSV(report: GeneratedReportData): string {
    const headerRow = report.columns.map(c => this.sanitizeForCSV(c.label)).join(',');
    const dataRows = report.rows.map(row => {
      return report.columns.map(c => this.sanitizeForCSV(row[c.key])).join(',');
    });

    // Append summary lines
    const summaryLines = Object.entries(report.summary).map(([k, v]) => {
      return `${this.sanitizeForCSV(k)},${this.sanitizeForCSV(v)}`;
    });

    const lines = [
      `Studio: ${this.sanitizeForCSV(report.studioName)}`,
      `Report: ${this.sanitizeForCSV(report.name)}`,
      `Generated At: ${this.sanitizeForCSV(report.generatedAt)}`,
      '',
      headerRow,
      ...dataRows,
      '',
      '--- SUMMARY ---',
      ...summaryLines
    ];

    return lines.join('\n');
  }

  /**
   * Generate clean studio-branded printable HTML report
   */
  generatePrintableHTML(report: GeneratedReportData): string {
    const tableHeaders = report.columns.map(c => `
      <th style="padding: 10px 12px; border-bottom: 2px solid #e2e8f0; text-align: ${c.align || 'left'}; font-size: 13px; color: #475569; text-transform: uppercase;">
        ${c.label}
      </th>
    `).join('');

    const tableRows = report.rows.map((row, idx) => `
      <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
        ${report.columns.map(c => `
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: ${c.align || 'left'}; font-size: 13px; color: #1e293b;">
            ${row[c.key] !== undefined && row[c.key] !== null ? row[c.key] : ''}
          </td>
        `).join('')}
      </tr>
    `).join('');

    const summaryCards = Object.entries(report.summary).map(([k, v]) => `
      <div style="background: #f1f5f9; padding: 12px 16px; border-radius: 8px; min-width: 140px;">
        <div style="font-size: 12px; color: #64748b; font-weight: 500;">${k}</div>
        <div style="font-size: 18px; color: #0f172a; font-weight: 700; margin-top: 4px;">${v}</div>
      </div>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${report.name} - ${report.studioName}</title>
        <style>
          @media print {
            body { margin: 0; padding: 16px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
            .no-print { display: none !important; }
          }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; padding: 24px; max-width: 1000px; margin: 0 auto; }
        </style>
      </head>
      <body>
        <div style="border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #0f172a;">${report.studioName}</h1>
          <h2 style="margin: 4px 0 0 0; font-size: 18px; font-weight: 600; color: #475569;">${report.name}</h2>
          <div style="font-size: 12px; color: #94a3b8; margin-top: 6px;">Generated on: ${new Date(report.generatedAt).toLocaleString('en-IN')}</div>
        </div>

        <div style="display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 24px;">
          ${summaryCards}
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <thead>
            <tr style="background: #f8fafc;">
              ${tableHeaders}
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>

        <div style="font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 16px;">
          Confidential - Generated by Studio OS Intelligence & Reporting Suite
        </div>
      </body>
      </html>
    `;
  }
}

export const reportCenterService = new ReportCenterService();
