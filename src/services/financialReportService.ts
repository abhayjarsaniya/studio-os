import { TenantStore } from './tenantStore';
import { Invoice, Payment, Refund, Expense, Customer, StudioEvent, SalaryProfile, PayrollRun } from '../types/schema';
import { invoiceService } from './invoiceService';
import { paymentService } from './paymentService';
import { expenseService } from './expenseService';

export type DateRangePreset = 'today' | 'this_week' | 'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'custom' | 'all';

export interface FinanceDashboardKPIs {
  totalRevenue: number;
  revenueReceived: number;
  outstandingPayments: number;
  overdueInvoices: number;
  totalExpenses: number;
  netProfit: number;
  pendingCustomerPaymentsCount: number;
  upcomingPaymentDeadlinesCount: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  salaryPayable: number;
  salaryPaid: number;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  secondaryValue?: number;
}

export interface RecentTransactionItem {
  id: string;
  type: 'payment' | 'refund' | 'expense';
  title: string;
  partyName: string;
  referenceNumber: string;
  amount: number;
  date: string;
  method?: string;
  status: string;
}

export interface ReportRow {
  [key: string]: any;
}

export interface FinancialReportData {
  reportId: string;
  title: string;
  subtitle: string;
  generatedAt: string;
  columns: { key: string; label: string; align?: 'left' | 'right' | 'center' }[];
  rows: ReportRow[];
  summary: { [key: string]: number | string };
}

export class FinancialReportService {
  getDateBounds(preset: DateRangePreset, customStart?: string, customEnd?: string): { start: string; end: string } {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    switch (preset) {
      case 'today':
        return { start: todayStr, end: todayStr };
      case 'this_week': {
        const d = new Date(now);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
        d.setDate(diff);
        const start = d.toISOString().split('T')[0];
        return { start, end: todayStr };
      }
      case 'this_month': {
        const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        return { start, end: todayStr };
      }
      case 'last_month': {
        const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        const month = now.getMonth() === 0 ? 12 : now.getMonth();
        const lastDay = new Date(year, month, 0).getDate();
        return {
          start: `${year}-${String(month).padStart(2, '0')}-01`,
          end: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
        };
      }
      case 'this_quarter': {
        const q = Math.floor(now.getMonth() / 3);
        const startMonth = q * 3 + 1;
        return {
          start: `${now.getFullYear()}-${String(startMonth).padStart(2, '0')}-01`,
          end: todayStr
        };
      }
      case 'this_year': {
        return {
          start: `${now.getFullYear()}-01-01`,
          end: todayStr
        };
      }
      case 'custom': {
        return {
          start: customStart || '2000-01-01',
          end: customEnd || todayStr
        };
      }
      case 'all':
      default:
        return { start: '2000-01-01', end: '2099-12-31' };
    }
  }

  getDashboardKPIs(studioId: string, preset: DateRangePreset = 'this_month', customStart?: string, customEnd?: string): FinanceDashboardKPIs {
    if (!studioId) throw new Error('[financialReportService.getDashboardKPIs]: studioId is required');
    const { start, end } = this.getDateBounds(preset, customStart, customEnd);
    const todayStr = new Date().toISOString().split('T')[0];

    // Current month bounds for monthly metrics
    const currentMonthPrefix = todayStr.substring(0, 7);

    // Fetch invoices, payments, refunds, expenses
    const invoices = invoiceService.listInvoices(studioId);
    const payments = paymentService.listPayments(studioId);
    const refunds = paymentService.listRefunds(studioId);
    const expenses = expenseService.listExpenses(studioId);
    const customers = TenantStore.get<Customer>(studioId, 'customers');
    const payrollRuns = TenantStore.get<PayrollRun>(studioId, 'payrollRuns');

    // Filter by date range for range-bound KPIs
    const rangeInvoices = invoices.filter(i => {
      const d = i.invoiceDate || i.createdAt.split('T')[0];
      return d >= start && d <= end && i.status !== 'Cancelled';
    });

    const rangePayments = payments.filter(p => {
      const d = p.paymentDate || p.createdAt.split('T')[0];
      return d >= start && d <= end && p.status === 'success';
    });

    const rangeRefunds = refunds.filter(r => {
      const d = r.refundDate || r.createdAt.split('T')[0];
      return d >= start && d <= end;
    });

    const rangeExpenses = expenses.filter(e => {
      const d = e.expenseDate || e.createdAt.split('T')[0];
      return d >= start && d <= end && (e.approvalStatus === 'Approved' || e.approvalStatus === 'Paid');
    });

    // 1. Total Revenue (Invoiced in period)
    const totalRevenue = rangeInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

    // 2. Revenue Received (Payments minus Refunds in period)
    const totalPaymentsReceived = rangePayments.reduce((sum, p) => sum + p.amount, 0);
    const totalRefundsGiven = rangeRefunds.reduce((sum, r) => sum + r.amount, 0);
    const revenueReceived = Math.max(0, Math.round((totalPaymentsReceived - totalRefundsGiven) * 100) / 100);

    // 3. Outstanding Payments (current receivables on active invoices)
    const activeInvoices = invoices.filter(i => i.status !== 'Cancelled' && i.status !== 'Draft');
    const outstandingPayments = activeInvoices.reduce((sum, inv) => sum + (inv.pendingAmount || 0), 0);

    // 4. Overdue Invoices
    const overdueInvoices = invoices
      .filter(i => i.status !== 'Cancelled' && (i.status === 'Overdue' || (i.dueDate < todayStr && (i.pendingAmount || 0) > 0)))
      .reduce((sum, inv) => sum + (inv.pendingAmount || 0), 0);

    // 5. Total Expenses
    const totalExpenses = rangeExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    // 6. Net Profit
    const netProfit = Math.round((revenueReceived - totalExpenses) * 100) / 100;

    // 7. Pending Customer Payments Count
    const pendingCustomers = customers.filter(c => (c.outstandingBalance || 0) > 0);
    const pendingInvoices = activeInvoices.filter(i => (i.pendingAmount || 0) > 0);
    const pendingCustomerPaymentsCount = Math.max(pendingCustomers.length, pendingInvoices.length);

    // 8. Upcoming Payment Deadlines Count (Next 7 days)
    const next7Days = new Date();
    next7Days.setDate(next7Days.getDate() + 7);
    const next7DaysStr = next7Days.toISOString().split('T')[0];

    const upcomingPaymentDeadlinesCount = activeInvoices.filter(i => {
      return (i.pendingAmount || 0) > 0 && i.dueDate >= todayStr && i.dueDate <= next7DaysStr;
    }).length;

    // 9. Monthly Revenue (Current Calendar Month)
    const monthPayments = payments.filter(p => (p.paymentDate || p.createdAt).startsWith(currentMonthPrefix) && p.status === 'success');
    const monthRefunds = refunds.filter(r => (r.refundDate || r.createdAt).startsWith(currentMonthPrefix));
    const monthlyRevenue = Math.max(0, Math.round((
      monthPayments.reduce((sum, p) => sum + p.amount, 0) -
      monthRefunds.reduce((sum, r) => sum + r.amount, 0)
    ) * 100) / 100);

    // 10. Monthly Expenses (Current Calendar Month)
    const monthExpenses = expenses.filter(e => {
      const d = e.expenseDate || e.createdAt;
      return d.startsWith(currentMonthPrefix) && (e.approvalStatus === 'Approved' || e.approvalStatus === 'Paid');
    });
    const monthlyExpenses = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

    // 11 & 12: Salary Payable & Paid
    let salaryPayable = 0;
    let salaryPaid = 0;

    if (payrollRuns && payrollRuns.length > 0) {
      payrollRuns.forEach(run => {
        if (run.status === 'paid' || run.status === 'processed' || run.status === 'approved') {
          salaryPaid += run.totalNetPayable || 0;
        } else if (run.status === 'draft') {
          salaryPayable += run.totalNetPayable || 0;
        }
      });
    }

    // Include salary category expenses
    const salaryExpenses = expenses.filter(e => e.category === 'Employee Salary');
    salaryExpenses.forEach(e => {
      if (e.approvalStatus === 'Paid') {
        salaryPaid += e.amount;
      } else if (e.approvalStatus === 'Approved') {
        salaryPayable += e.amount;
      }
    });

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      revenueReceived: Math.round(revenueReceived * 100) / 100,
      outstandingPayments: Math.round(outstandingPayments * 100) / 100,
      overdueInvoices: Math.round(overdueInvoices * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      netProfit,
      pendingCustomerPaymentsCount,
      upcomingPaymentDeadlinesCount,
      monthlyRevenue,
      monthlyExpenses: Math.round(monthlyExpenses * 100) / 100,
      salaryPayable: Math.round(salaryPayable * 100) / 100,
      salaryPaid: Math.round(salaryPaid * 100) / 100
    };
  }

  // Charts
  getRevenueVsExpenseChart(studioId: string): ChartDataPoint[] {
    const payments = paymentService.listPayments(studioId).filter(p => p.status === 'success');
    const refunds = paymentService.listRefunds(studioId);
    const expenses = expenseService.listExpenses(studioId).filter(e => e.approvalStatus === 'Approved' || e.approvalStatus === 'Paid');

    // Last 6 months
    const result: ChartDataPoint[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthPrefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthName = d.toLocaleString('en-US', { month: 'short' });

      const rev = payments.filter(p => (p.paymentDate || p.createdAt).startsWith(monthPrefix)).reduce((s, p) => s + p.amount, 0)
        - refunds.filter(r => (r.refundDate || r.createdAt).startsWith(monthPrefix)).reduce((s, r) => s + r.amount, 0);

      const exp = expenses.filter(e => (e.expenseDate || e.createdAt).startsWith(monthPrefix)).reduce((s, e) => s + e.amount, 0);

      result.push({
        label: monthName,
        value: Math.max(0, rev),
        secondaryValue: exp
      });
    }

    return result;
  }

  getRevenueByEventCategory(studioId: string): ChartDataPoint[] {
    const invoices = invoiceService.listInvoices(studioId).filter(i => i.status !== 'Cancelled');
    const events = TenantStore.get<StudioEvent>(studioId, 'events');
    const eventCategoryMap = new Map<string, string>();
    events.forEach(e => eventCategoryMap.set(e.id, e.category || 'General'));

    const categoryRevenueMap: Record<string, number> = {};

    invoices.forEach(inv => {
      const category = inv.eventId && eventCategoryMap.has(inv.eventId)
        ? eventCategoryMap.get(inv.eventId)!
        : 'Direct Service';

      categoryRevenueMap[category] = (categoryRevenueMap[category] || 0) + (inv.paidAmount || 0);
    });

    const entries = Object.entries(categoryRevenueMap).map(([label, value]) => ({ label, value }));
    return entries.sort((a, b) => b.value - a.value);
  }

  getExpenseCategoryBreakdown(studioId: string): ChartDataPoint[] {
    const expenses = expenseService.listExpenses(studioId).filter(e => e.approvalStatus === 'Approved' || e.approvalStatus === 'Paid');
    const catMap: Record<string, number> = {};

    expenses.forEach(e => {
      catMap[e.category] = (catMap[e.category] || 0) + e.amount;
    });

    return Object.entries(catMap)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }

  getOutstandingAgingBreakdown(studioId: string): { label: string; amount: number; count: number }[] {
    const invoices = invoiceService.listInvoices(studioId).filter(i => (i.pendingAmount || 0) > 0 && i.status !== 'Cancelled');
    const today = new Date().getTime();

    const buckets = [
      { label: '0-30 Days', min: 0, max: 30, amount: 0, count: 0 },
      { label: '31-60 Days', min: 31, max: 60, amount: 0, count: 0 },
      { label: '61-90 Days', min: 61, max: 90, amount: 0, count: 0 },
      { label: '90+ Days', min: 91, max: 99999, amount: 0, count: 0 }
    ];

    invoices.forEach(inv => {
      const dueTime = new Date(inv.dueDate).getTime();
      const diffDays = Math.max(0, Math.floor((today - dueTime) / (1000 * 60 * 60 * 24)));
      const bucket = buckets.find(b => diffDays >= b.min && diffDays <= b.max) || buckets[3];
      bucket.amount += inv.pendingAmount || 0;
      bucket.count += 1;
    });

    return buckets;
  }

  getRecentTransactions(studioId: string, limit: number = 10): RecentTransactionItem[] {
    const payments = paymentService.listPayments(studioId).map(p => ({
      id: p.id,
      type: 'payment' as const,
      title: `Payment for Invoice #${p.invoiceNumber || 'INV'}`,
      partyName: p.customerName || 'Customer',
      referenceNumber: p.receiptNumber || p.transactionReference || 'REC',
      amount: p.amount,
      date: p.paymentDate || p.createdAt,
      method: p.paymentMethod,
      status: p.status || 'success'
    }));

    const refunds = paymentService.listRefunds(studioId).map(r => ({
      id: r.id,
      type: 'refund' as const,
      title: `Refund for #${r.invoiceNumber || 'INV'}`,
      partyName: r.customerName || 'Customer',
      referenceNumber: r.refundNumber,
      amount: -r.amount,
      date: r.refundDate || r.createdAt,
      method: r.paymentMethod,
      status: r.status
    }));

    const expenses = expenseService.listExpenses(studioId).map(e => ({
      id: e.id,
      type: 'expense' as const,
      title: e.title,
      partyName: e.vendor || e.category,
      referenceNumber: e.expenseNumber || 'EXP',
      amount: -e.amount,
      date: e.expenseDate || e.createdAt,
      method: e.paymentMethod,
      status: e.approvalStatus
    }));

    const all = [...payments, ...refunds, ...expenses];
    all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return all.slice(0, limit);
  }

  // 13 Detailed Reports
  generateReport(
    studioId: string,
    reportType:
      | 'income'
      | 'expense'
      | 'profit_loss'
      | 'customer_outstanding'
      | 'invoice_register'
      | 'payment_register'
      | 'refund_report'
      | 'tax_summary'
      | 'gst_summary'
      | 'event_revenue'
      | 'branch_revenue'
      | 'employee_expense'
      | 'payroll_summary',
    preset: DateRangePreset = 'this_month',
    customStart?: string,
    customEnd?: string
  ): FinancialReportData {
    const { start, end } = this.getDateBounds(preset, customStart, customEnd);
    const invoices = invoiceService.listInvoices(studioId);
    const payments = paymentService.listPayments(studioId);
    const refunds = paymentService.listRefunds(studioId);
    const expenses = expenseService.listExpenses(studioId);
    const customers = TenantStore.get<Customer>(studioId, 'customers');
    const events = TenantStore.get<StudioEvent>(studioId, 'events');

    const generatedAt = new Date().toLocaleString('en-IN');
    const dateSubtitle = `Period: ${start} to ${end}`;

    switch (reportType) {
      case 'income': {
        const rows = payments
          .filter(p => (p.paymentDate || p.createdAt) >= start && (p.paymentDate || p.createdAt) <= end)
          .map(p => ({
            date: p.paymentDate,
            receiptNumber: p.receiptNumber,
            invoiceNumber: p.invoiceNumber,
            customerName: p.customerName,
            paymentMethod: p.paymentMethod,
            amount: p.amount
          }));
        const total = rows.reduce((s, r) => s + r.amount, 0);

        return {
          reportId: 'income',
          title: 'Income / Revenue Report',
          subtitle: dateSubtitle,
          generatedAt,
          columns: [
            { key: 'date', label: 'Date' },
            { key: 'receiptNumber', label: 'Receipt #' },
            { key: 'invoiceNumber', label: 'Invoice #' },
            { key: 'customerName', label: 'Customer' },
            { key: 'paymentMethod', label: 'Method' },
            { key: 'amount', label: 'Amount (₹)', align: 'right' }
          ],
          rows,
          summary: { 'Total Income': `₹${total.toLocaleString('en-IN')}` }
        };
      }

      case 'expense': {
        const rows = expenses
          .filter(e => (e.expenseDate || e.createdAt) >= start && (e.expenseDate || e.createdAt) <= end)
          .map(e => ({
            date: e.expenseDate,
            expenseNumber: e.expenseNumber,
            title: e.title,
            category: e.category,
            vendor: e.vendor || '-',
            status: e.approvalStatus,
            amount: e.amount
          }));
        const total = rows.reduce((s, r) => s + r.amount, 0);

        return {
          reportId: 'expense',
          title: 'Expense Register Report',
          subtitle: dateSubtitle,
          generatedAt,
          columns: [
            { key: 'date', label: 'Date' },
            { key: 'expenseNumber', label: 'Expense #' },
            { key: 'title', label: 'Title' },
            { key: 'category', label: 'Category' },
            { key: 'vendor', label: 'Vendor' },
            { key: 'status', label: 'Status' },
            { key: 'amount', label: 'Amount (₹)', align: 'right' }
          ],
          rows,
          summary: { 'Total Expenses': `₹${total.toLocaleString('en-IN')}` }
        };
      }

      case 'profit_loss': {
        const rev = payments
          .filter(p => (p.paymentDate || p.createdAt) >= start && (p.paymentDate || p.createdAt) <= end)
          .reduce((s, p) => s + p.amount, 0);
        const ref = refunds
          .filter(r => (r.refundDate || r.createdAt) >= start && (r.refundDate || r.createdAt) <= end)
          .reduce((s, r) => s + r.amount, 0);
        const exp = expenses
          .filter(e => (e.expenseDate || e.createdAt) >= start && (e.expenseDate || e.createdAt) <= end && (e.approvalStatus === 'Approved' || e.approvalStatus === 'Paid'))
          .reduce((s, e) => s + e.amount, 0);

        const netIncome = Math.round((rev - ref) * 100) / 100;
        const netProfit = Math.round((netIncome - exp) * 100) / 100;

        const rows = [
          { item: 'Gross Customer Collections', amount: rev },
          { item: 'Less: Customer Refunds', amount: -ref },
          { item: 'Net Operating Revenue', amount: netIncome },
          { item: 'Operating & Studio Expenses', amount: -exp },
          { item: 'Net Profit / (Loss)', amount: netProfit }
        ];

        return {
          reportId: 'profit_loss',
          title: 'Profit & Loss Statement (P&L)',
          subtitle: dateSubtitle,
          generatedAt,
          columns: [
            { key: 'item', label: 'Financial Metric' },
            { key: 'amount', label: 'Amount (₹)', align: 'right' }
          ],
          rows,
          summary: { 'Net Profit': `₹${netProfit.toLocaleString('en-IN')}` }
        };
      }

      case 'customer_outstanding': {
        const rows = customers
          .filter(c => (c.outstandingBalance || 0) > 0)
          .map(c => ({
            customerName: c.name,
            phone: c.phone,
            totalSpent: c.totalSpent || 0,
            outstandingBalance: c.outstandingBalance || 0
          }));
        const total = rows.reduce((s, r) => s + r.outstandingBalance, 0);

        return {
          reportId: 'customer_outstanding',
          title: 'Customer Outstanding Receivables',
          subtitle: 'All Active Clients with Pending Invoices',
          generatedAt,
          columns: [
            { key: 'customerName', label: 'Customer Name' },
            { key: 'phone', label: 'Phone' },
            { key: 'totalSpent', label: 'Total Paid (₹)', align: 'right' },
            { key: 'outstandingBalance', label: 'Outstanding Balance (₹)', align: 'right' }
          ],
          rows,
          summary: { 'Total Outstanding': `₹${total.toLocaleString('en-IN')}` }
        };
      }

      case 'gst_summary':
      case 'tax_summary': {
        const filteredInvoices = invoices.filter(i => (i.invoiceDate || i.createdAt) >= start && (i.invoiceDate || i.createdAt) <= end && i.status !== 'Cancelled');
        const rows = filteredInvoices.map(inv => ({
          invoiceNumber: inv.invoiceNumber,
          customerName: inv.customerName,
          taxableValue: inv.subtotal - (inv.discountAmount || 0),
          cgst: inv.cgst || 0,
          sgst: inv.sgst || 0,
          igst: inv.igst || 0,
          totalTax: inv.taxAmount || 0,
          invoiceTotal: inv.totalAmount
        }));

        const totalTaxable = rows.reduce((s, r) => s + r.taxableValue, 0);
        const totalCGST = rows.reduce((s, r) => s + r.cgst, 0);
        const totalSGST = rows.reduce((s, r) => s + r.sgst, 0);
        const totalIGST = rows.reduce((s, r) => s + r.igst, 0);
        const totalTax = rows.reduce((s, r) => s + r.totalTax, 0);

        return {
          reportId: 'gst_summary',
          title: 'GST Tax Summary Report',
          subtitle: dateSubtitle,
          generatedAt,
          columns: [
            { key: 'invoiceNumber', label: 'Invoice #' },
            { key: 'customerName', label: 'Customer' },
            { key: 'taxableValue', label: 'Taxable (₹)', align: 'right' },
            { key: 'cgst', label: 'CGST (₹)', align: 'right' },
            { key: 'sgst', label: 'SGST (₹)', align: 'right' },
            { key: 'igst', label: 'IGST (₹)', align: 'right' },
            { key: 'totalTax', label: 'Total Tax (₹)', align: 'right' },
            { key: 'invoiceTotal', label: 'Total Amount (₹)', align: 'right' }
          ],
          rows,
          summary: {
            'Taxable Value': `₹${totalTaxable.toLocaleString('en-IN')}`,
            'CGST': `₹${totalCGST.toLocaleString('en-IN')}`,
            'SGST': `₹${totalSGST.toLocaleString('en-IN')}`,
            'IGST': `₹${totalIGST.toLocaleString('en-IN')}`,
            'Total Tax': `₹${totalTax.toLocaleString('en-IN')}`
          }
        };
      }

      default: {
        // Fallback for invoice register, payment register, refund report, event revenue, etc.
        const rows = invoices.map(i => ({
          invoiceNumber: i.invoiceNumber,
          customerName: i.customerName,
          date: i.invoiceDate || i.createdAt.split('T')[0],
          status: i.status,
          total: i.totalAmount,
          paid: i.paidAmount || 0,
          pending: i.pendingAmount || 0
        }));

        return {
          reportId: reportType,
          title: `${reportType.replace(/_/g, ' ').toUpperCase()} Report`,
          subtitle: dateSubtitle,
          generatedAt,
          columns: [
            { key: 'invoiceNumber', label: 'Invoice #' },
            { key: 'customerName', label: 'Customer' },
            { key: 'date', label: 'Date' },
            { key: 'status', label: 'Status' },
            { key: 'total', label: 'Total (₹)', align: 'right' },
            { key: 'paid', label: 'Paid (₹)', align: 'right' },
            { key: 'pending', label: 'Pending (₹)', align: 'right' }
          ],
          rows,
          summary: { Total: `₹${rows.reduce((s, r) => s + r.total, 0).toLocaleString('en-IN')}` }
        };
      }
    }
  }

  exportToCSV(report: FinancialReportData): string {
    const headerRow = report.columns.map(c => `"${c.label}"`).join(',');
    const bodyRows = report.rows.map(row => {
      return report.columns.map(col => {
        const val = row[col.key] !== undefined ? row[col.key] : '';
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',');
    });

    return [headerRow, ...bodyRows].join('\n');
  }
}

export const financialReportService = new FinancialReportService();
