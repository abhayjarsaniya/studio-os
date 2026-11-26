import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  FileText, 
  CreditCard, 
  Receipt, 
  ShieldCheck, 
  Download, 
  Printer, 
  Plus, 
  Calendar, 
  ArrowUpRight, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Building2, 
  Layers, 
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { financialReportService, DateRangePreset } from '../services/financialReportService';
import { pdfGeneratorService } from '../services/pdfGeneratorService';
import { platformSubscriptionService } from '../services/platformSubscriptionService';
import { PDFViewerModal } from '../components/finance/PDFViewerModal';
import { QuotationFormModal } from '../components/finance/QuotationFormModal';
import { InvoiceFormModal } from '../components/finance/InvoiceFormModal';
import { PaymentRecordModal } from '../components/finance/PaymentRecordModal';
import { RefundModal } from '../components/finance/RefundModal';
import { ExpenseFormModal } from '../components/finance/ExpenseFormModal';
import { Quotation, Invoice, Payment } from '../types/schema';

export const FinancePage: React.FC = () => {
  const { 
    currentRole, 
    can,
    studio, 
    financialSettings, 
    quotations, 
    invoices, 
    payments, 
    refunds, 
    expenses,
    issueInvoice,
    cancelInvoice,
    approveExpense,
    rejectExpense,
    markExpensePaid,
    convertQuotationToBooking
  } = useApp();

  // Active Sub-Tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'quotations' | 'invoices' | 'payments' | 'expenses' | 'reports' | 'saas'>('dashboard');

  // Date Range Filter
  const [datePreset, setDatePreset] = useState<DateRangePreset>('this_month');

  // Modals state
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);

  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);

  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [selectedPaymentForRefund, setSelectedPaymentForRefund] = useState<Payment | null>(null);

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  // PDF Viewer Modal
  const [pdfPayload, setPdfPayload] = useState<any | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Reports state
  const [selectedReportType, setSelectedReportType] = useState<any>('profit_loss');

  // Live Master Admin RBAC Financial Permission Checks
  const canViewFinancials = can('invoices_billing' as any, 'view_financials' as any);
  const canEditFinancials = can('invoices_billing' as any, 'edit_financials' as any);
  const isAuthorized = canViewFinancials && ['owner', 'admin', 'manager', 'accountant', 'super_admin'].includes(currentRole.toLowerCase());

  // KPIs & Analytics
  const kpis = useMemo(() => {
    return financialReportService.getDashboardKPIs(studio.id, datePreset);
  }, [studio.id, datePreset, invoices, payments, refunds, expenses]);

  const revVsExpChart = useMemo(() => {
    return financialReportService.getRevenueVsExpenseChart(studio.id);
  }, [studio.id, payments, refunds, expenses]);

  const catRevenue = useMemo(() => {
    return financialReportService.getRevenueByEventCategory(studio.id);
  }, [studio.id, invoices]);

  const expBreakdown = useMemo(() => {
    return financialReportService.getExpenseCategoryBreakdown(studio.id);
  }, [studio.id, expenses]);

  const agingBuckets = useMemo(() => {
    return financialReportService.getOutstandingAgingBreakdown(studio.id);
  }, [studio.id, invoices]);

  const recentTransactions = useMemo(() => {
    return financialReportService.getRecentTransactions(studio.id, 8);
  }, [studio.id, payments, refunds, expenses]);

  const reportData = useMemo(() => {
    return financialReportService.generateReport(studio.id, selectedReportType, datePreset);
  }, [studio.id, selectedReportType, datePreset, invoices, payments, refunds, expenses]);

  const platformMetrics = useMemo(() => {
    return platformSubscriptionService.getPlatformMetrics();
  }, []);

  const platformSubscriptions = useMemo(() => {
    return platformSubscriptionService.listStudioSubscriptions();
  }, []);

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-zinc-900 mb-2">
          Restricted Financial Access
        </h2>
        <p className="text-sm text-zinc-500 max-w-md">
          Access to Studio OS Finance & Billing requires Studio Owner, Admin, or Accountant privileges.
        </p>
      </div>
    );
  }

  const openPdf = (payload: any) => {
    setPdfPayload(payload);
    setIsPdfModalOpen(true);
  };

  const getStudioSettings = () => ({
    ...financialSettings,
    name: studio.name,
    legalName: studio.name || financialSettings?.legalName || 'Studio OS',
    logoUrl: studio.logo,
    businessAddress: [studio.address, studio.city].filter(Boolean).join(', ') || financialSettings?.businessAddress || '',
    supportPhone: studio.phone,
    supportEmail: studio.email,
    gstin: studio.gstNumber || financialSettings?.gstin || ''
  });

  const handlePrintQuotation = (q: Quotation) => {
    openPdf(pdfGeneratorService.createQuotationPayload(q, getStudioSettings()));
  };

  const handlePrintInvoice = (inv: Invoice) => {
    openPdf(pdfGeneratorService.createInvoicePayload(inv, getStudioSettings()));
  };

  const handlePrintPayment = (p: Payment) => {
    openPdf(pdfGeneratorService.createPaymentReceiptPayload(p, getStudioSettings() as any));
  };

  const handlePrintRefund = (r: any) => {
    openPdf(pdfGeneratorService.createRefundReceiptPayload(r, getStudioSettings() as any));
  };

  const handleExportCSV = () => {
    const csv = financialReportService.exportToCSV(reportData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportData.reportId}_report.csv`;
    a.click();
  };

  const handleConvertQuote = (qId: string) => {
    if (confirm('Convert this Quotation to a Confirmed Booking Event and generate initial Invoice?')) {
      try {
        convertQuotationToBooking(qId);
        alert('Quotation successfully converted to booking!');
      } catch (err: any) {
        alert(err.message || 'Error converting quotation');
      }
    }
  };

  const handleCancelInvoice = (invId: string) => {
    const reason = prompt('Please enter reason for invoice cancellation:');
    if (reason && reason.trim()) {
      cancelInvoice(invId, reason.trim());
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50/50 pb-20 w-full">
      {/* Top Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-zinc-200 px-3.5 sm:px-6 py-4">
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-bold">
                ₹
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight font-display">
                  Finance & Billing
                </h1>
                <p className="text-sm text-zinc-600 mt-0.5">
                  {studio.name} • GSTIN: {financialSettings?.gstin || 'Unregistered'}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons (Hidden if Edit Financials is disabled) */}
          {canEditFinancials && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => { setEditingQuotation(null); setIsQuotationModalOpen(true); }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-zinc-200 bg-white text-zinc-800 rounded-lg hover:bg-zinc-50 shadow-sm"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>New Quotation</span>
              </button>
              <button
                onClick={() => { setEditingInvoice(null); setIsInvoiceModalOpen(true); }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-zinc-200 bg-white text-zinc-800 rounded-lg hover:bg-zinc-50 shadow-sm"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Create Invoice</span>
              </button>
              <button
                onClick={() => { setSelectedInvoiceForPayment(null); setIsPaymentModalOpen(true); }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Record Payment</span>
              </button>
              <button
                onClick={() => setIsExpenseModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log Expense</span>
              </button>
            </div>
          )}
        </div>

        {/* Sub-Navigation & Filters Bar */}
        <div className="w-full mt-4 pt-3 border-t border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Sub-Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
              { id: 'quotations', label: `Quotations (${quotations.length})`, icon: Receipt },
              { id: 'invoices', label: `Invoices (${invoices.length})`, icon: FileText },
              { id: 'payments', label: `Payments & Refunds (${payments.length})`, icon: CreditCard },
              { id: 'expenses', label: `Expenses (${expenses.length})`, icon: TrendingDown },
              { id: 'reports', label: 'Reports & P&L', icon: Layers },
              { id: 'saas', label: 'Platform SaaS Billing', icon: Building2 }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-zinc-900 text-white'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Date Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto text-xs">
            <Calendar className="w-3.5 h-3.5 text-zinc-400 mr-1" />
            {[
              { id: 'today', label: 'Today' },
              { id: 'this_week', label: 'This Week' },
              { id: 'this_month', label: 'This Month' },
              { id: 'last_month', label: 'Last Month' },
              { id: 'this_quarter', label: 'Quarter' },
              { id: 'this_year', label: 'This Year' },
              { id: 'all', label: 'All Time' }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setDatePreset(p.id as DateRangePreset)}
                className={`px-2.5 py-1 rounded-md transition-colors text-xs ${
                  datePreset === p.id
                    ? 'bg-zinc-200 text-zinc-900 font-semibold'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="w-full pt-4 sm:pt-6">
        {/* ========================================================= */}
        {/* TAB 1: FINANCE DASHBOARD                                  */}
        {/* ========================================================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* 12 KPIs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                <span className="text-xs font-medium text-zinc-500 block uppercase tracking-wider">
                  Total Invoiced
                </span>
                <div className="text-lg sm:text-xl font-bold text-zinc-900 mt-1">
                  ₹{kpis.totalRevenue.toLocaleString('en-IN')}
                </div>
                <span className="text-xs text-zinc-400">All non-cancelled invoices</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                <span className="text-xs font-medium text-emerald-600 block uppercase tracking-wider">
                  Revenue Received
                </span>
                <div className="text-lg sm:text-xl font-bold text-emerald-600 mt-1">
                  ₹{kpis.revenueReceived.toLocaleString('en-IN')}
                </div>
                <span className="text-xs text-zinc-400">Net after customer refunds</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                <span className="text-xs font-medium text-rose-600 block uppercase tracking-wider">
                  Outstanding Receivables
                </span>
                <div className="text-lg sm:text-xl font-bold text-rose-600 mt-1">
                  ₹{kpis.outstandingPayments.toLocaleString('en-IN')}
                </div>
                <span className="text-xs text-zinc-400">{kpis.pendingCustomerPaymentsCount} client balances</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                <span className="text-xs font-medium text-amber-600 block uppercase tracking-wider">
                  Overdue Invoices
                </span>
                <div className="text-lg sm:text-xl font-bold text-amber-600 mt-1">
                  ₹{kpis.overdueInvoices.toLocaleString('en-IN')}
                </div>
                <span className="text-xs text-zinc-400">Past agreed due dates</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                <span className="text-xs font-medium text-zinc-500 block uppercase tracking-wider">
                  Total Expenses
                </span>
                <div className="text-lg sm:text-xl font-bold text-zinc-900 mt-1">
                  ₹{kpis.totalExpenses.toLocaleString('en-IN')}
                </div>
                <span className="text-xs text-zinc-400">Approved & paid studio costs</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                <span className="text-xs font-medium text-zinc-500 block uppercase tracking-wider">
                  Net Operating Profit
                </span>
                <div className={`text-lg sm:text-xl font-bold mt-1 ${kpis.netProfit >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                  ₹{kpis.netProfit.toLocaleString('en-IN')}
                </div>
                <span className="text-xs text-zinc-400">Revenue minus expenses</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                <span className="text-xs font-medium text-zinc-500 block uppercase tracking-wider">
                  Monthly Revenue
                </span>
                <div className="text-lg sm:text-xl font-bold text-zinc-900 mt-1">
                  ₹{kpis.monthlyRevenue.toLocaleString('en-IN')}
                </div>
                <span className="text-xs text-zinc-400">Current calendar month</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                <span className="text-xs font-medium text-zinc-500 block uppercase tracking-wider">
                  Monthly Expenses
                </span>
                <div className="text-lg sm:text-xl font-bold text-zinc-900 mt-1">
                  ₹{kpis.monthlyExpenses.toLocaleString('en-IN')}
                </div>
                <span className="text-xs text-zinc-400">Current calendar month</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                <span className="text-xs font-medium text-zinc-500 block uppercase tracking-wider">
                  Upcoming Deadlines
                </span>
                <div className="text-lg sm:text-xl font-bold text-zinc-900 mt-1">
                  {kpis.upcomingPaymentDeadlinesCount}
                </div>
                <span className="text-xs text-zinc-400">Due within next 7 days</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                <span className="text-xs font-medium text-zinc-500 block uppercase tracking-wider">
                  Salary Disbursed
                </span>
                <div className="text-lg sm:text-xl font-bold text-emerald-600 mt-1">
                  ₹{kpis.salaryPaid.toLocaleString('en-IN')}
                </div>
                <span className="text-xs text-zinc-400">Paid studio payroll</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                <span className="text-xs font-medium text-zinc-500 block uppercase tracking-wider">
                  Salary Payable
                </span>
                <div className="text-lg sm:text-xl font-bold text-amber-600 mt-1">
                  ₹{kpis.salaryPayable.toLocaleString('en-IN')}
                </div>
                <span className="text-xs text-zinc-400">Pending payroll run</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                <span className="text-xs font-medium text-indigo-600 block uppercase tracking-wider">
                  SaaS Subscription
                </span>
                <div className="text-lg sm:text-xl font-bold text-zinc-900 mt-1">
                  ₹500 <span className="text-xs font-normal text-zinc-400">/mo</span>
                </div>
                <span className="text-xs text-emerald-600 font-medium">Standard Studio Plan</span>
              </div>
            </div>

            {/* Charts & Breakdowns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue vs Expense Chart */}
              <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-zinc-900">
                    Revenue vs. Expenses (Last 6 Months)
                  </h3>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1.5 text-emerald-600">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      Revenue
                    </span>
                    <span className="flex items-center gap-1.5 text-zinc-500">
                      <span className="w-2.5 h-2.5 rounded-full bg-zinc-400" />
                      Expenses
                    </span>
                  </div>
                </div>

                <div className="h-48 flex items-end justify-between gap-3 pt-6 border-b border-zinc-200">
                  {revVsExpChart.map((pt, i) => {
                    const maxVal = Math.max(...revVsExpChart.map(p => Math.max(p.value, p.secondaryValue || 0)), 10000);
                    const revHeight = Math.max(8, (pt.value / maxVal) * 100);
                    const expHeight = Math.max(8, ((pt.secondaryValue || 0) / maxVal) * 100);

                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                        <div className="w-full flex items-end justify-center gap-1 h-36">
                          <div 
                            style={{ height: `${revHeight}%` }} 
                            className="w-1/2 bg-emerald-500 rounded-t hover:bg-emerald-600 transition-all"
                            title={`Revenue: ₹${pt.value.toLocaleString('en-IN')}`}
                          />
                          <div 
                            style={{ height: `${expHeight}%` }} 
                            className="w-1/2 bg-zinc-300 rounded-t hover:bg-zinc-400 transition-all"
                            title={`Expense: ₹${(pt.secondaryValue || 0).toLocaleString('en-IN')}`}
                          />
                        </div>
                        <span className="text-xs text-zinc-500 font-medium">{pt.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Outstanding Aging Breakdown */}
              <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-zinc-900">
                    Accounts Receivable Aging Breakdown
                  </h3>
                  <span className="text-xs text-zinc-500 font-medium">Overdue Tracking</span>
                </div>

                <div className="space-y-3">
                  {agingBuckets.map((bucket, i) => {
                    const totalPending = kpis.outstandingPayments || 1;
                    const percent = Math.min(100, Math.round((bucket.amount / totalPending) * 100));

                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-zinc-700">
                            {bucket.label} ({bucket.count} invoices)
                          </span>
                          <span className="font-semibold text-zinc-900">
                            ₹{bucket.amount.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${percent}%` }}
                            className={`h-full rounded-full ${
                              i === 0 ? 'bg-emerald-500' :
                              i === 1 ? 'bg-amber-500' :
                              i === 2 ? 'bg-orange-500' : 'bg-rose-500'
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Section: Category Revenue & Recent Transactions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Category Revenue */}
              <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm lg:col-span-1">
                <h3 className="text-sm font-semibold text-zinc-900 mb-3">
                  Revenue by Shoot Category
                </h3>
                <div className="space-y-2.5">
                  {catRevenue.slice(0, 6).map((c, i) => (
                    <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-zinc-100 last:border-0">
                      <span className="text-zinc-600 font-medium">{c.label}</span>
                      <span className="font-semibold text-zinc-900">₹{c.value.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                  {catRevenue.length === 0 && (
                    <p className="text-xs text-zinc-400 py-4 text-center">No category revenue recorded yet.</p>
                  )}
                </div>
              </div>

              {/* Recent Transactions Feed */}
              <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm lg:col-span-2">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-zinc-900">
                    Recent Financial Ledger Transactions
                  </h3>
                  <span className="text-xs text-zinc-400">Live Studio Stream</span>
                </div>

                <div className="space-y-2 overflow-x-auto">
                  {recentTransactions.map(tx => (
                    <div 
                      key={tx.id}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-100 hover:bg-zinc-50 transition-colors text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                          tx.type === 'payment' ? 'bg-emerald-100 text-emerald-700' :
                          tx.type === 'refund' ? 'bg-rose-100 text-rose-700' :
                          'bg-zinc-100 text-zinc-700'
                        }`}>
                          {tx.type === 'payment' ? '+' : '-'}
                        </div>
                        <div>
                          <div className="font-medium text-zinc-900">{tx.title}</div>
                          <div className="text-xs text-zinc-400">{tx.partyName} • {tx.date}</div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className={`font-semibold ${
                          tx.amount > 0 ? 'text-emerald-600' : 'text-zinc-900'
                        }`}>
                          {tx.amount > 0 ? `+₹${tx.amount.toLocaleString('en-IN')}` : `-₹${Math.abs(tx.amount).toLocaleString('en-IN')}`}
                        </div>
                        <span className="text-xs text-zinc-400 font-mono">{tx.referenceNumber}</span>
                      </div>
                    </div>
                  ))}

                  {recentTransactions.length === 0 && (
                    <p className="text-xs text-zinc-400 py-6 text-center">No transactions recorded yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: CUSTOMER QUOTATIONS                                */}
        {/* ========================================================= */}
        {activeTab === 'quotations' && (
          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-zinc-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="font-semibold text-zinc-900 text-sm">
                  Customer Quotations & Estimates ({quotations.length})
                </h3>
                <p className="text-xs text-zinc-500">
                  Photography shoot packages with 1-click conversion to confirmed bookings
                </p>
              </div>
              <button
                onClick={() => { setEditingQuotation(null); setIsQuotationModalOpen(true); }}
                className="w-full sm:w-auto min-h-[44px] sm:min-h-[38px] inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 shadow-xs cursor-pointer touch-manipulation active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Quotation</span>
              </button>
            </div>

            {/* Mobile List View (Zero sideways scroll on phones) */}
            <div className="sm:hidden divide-y divide-zinc-100">
              {quotations.map(q => (
                <div key={q.id} className="p-3.5 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono font-bold text-xs text-zinc-900 block">{q.quotationNumber}</span>
                      <h4 className="text-base font-bold text-zinc-900 mt-0.5">{q.customerName}</h4>
                      {q.customerPhone && (
                        <p className="text-xs text-zinc-500 font-mono mt-0.5">{q.customerPhone}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                        q.status === 'Accepted' || q.status === 'Converted to Booking' ? 'bg-emerald-100 text-emerald-800' :
                        q.status === 'Sent' ? 'bg-indigo-100 text-indigo-800' :
                        q.status === 'Rejected' ? 'bg-rose-100 text-rose-800' :
                        'bg-zinc-100 text-zinc-800'
                      }`}>
                        {q.status}
                      </span>
                      <div className="text-base font-bold text-zinc-900 font-tabular tabular-nums mt-1">
                        ₹{(q.grandTotal || q.totalAmount || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-zinc-500 pt-1 border-t border-zinc-50">
                    <span>{q.packageName || q.eventCategory || 'Custom Package'}</span>
                    <span>Valid: {q.expiryDate || q.validUntil || '-'}</span>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handlePrintQuotation(q)}
                      className="flex-1 min-h-[44px] px-3 py-2 text-xs font-semibold border border-zinc-200 rounded-xl hover:bg-zinc-100 text-zinc-800 flex items-center justify-center gap-1.5 touch-manipulation active:scale-95 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>View PDF</span>
                    </button>
                    {q.status !== 'Converted to Booking' && (
                      <button
                        onClick={() => handleConvertQuote(q.id)}
                        className="flex-1 min-h-[44px] px-3 py-2 text-xs font-bold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 flex items-center justify-center gap-1.5 touch-manipulation active:scale-95 cursor-pointer shadow-xs"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>Convert to Booking</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {quotations.length === 0 && (
                <div className="text-center py-8 text-zinc-400 text-xs">
                  No quotations on file.
                </div>
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-medium">
                  <tr>
                    <th className="py-2.5 px-4">Quotation #</th>
                    <th className="py-2.5 px-4">Customer</th>
                    <th className="py-2.5 px-4">Package & Category</th>
                    <th className="py-2.5 px-4">Valid Until</th>
                    <th className="py-2.5 px-4 text-right">Amount (₹)</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-zinc-800">
                  {quotations.map(q => (
                    <tr key={q.id} className="hover:bg-zinc-50/60">
                      <td className="py-3 px-4 font-mono font-medium">{q.quotationNumber}</td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-zinc-900">{q.customerName}</div>
                        <div className="text-xs text-zinc-400">{q.customerPhone}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium">{q.packageName || 'Custom Package'}</div>
                        <div className="text-xs text-zinc-400">{q.eventCategory}</div>
                      </td>
                      <td className="py-3 px-4 text-zinc-500">{q.expiryDate || q.validUntil || '-'}</td>
                      <td className="py-3 px-4 text-right font-semibold">
                        ₹{(q.grandTotal || q.totalAmount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          q.status === 'Accepted' || q.status === 'Converted to Booking' ? 'bg-emerald-100 text-emerald-800' :
                          q.status === 'Sent' ? 'bg-indigo-100 text-indigo-800' :
                          q.status === 'Rejected' ? 'bg-rose-100 text-rose-800' :
                          'bg-zinc-100 text-zinc-800'
                        }`}>
                          {q.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1">
                        <button
                          onClick={() => handlePrintQuotation(q)}
                          className="px-2 py-1 text-xs border border-zinc-200 rounded hover:bg-zinc-100 text-zinc-700"
                          title="View / Print PDF"
                        >
                          <Printer className="w-3 h-3 inline mr-1" />
                          PDF
                        </button>
                        {q.status !== 'Converted to Booking' && (
                          <button
                            onClick={() => handleConvertQuote(q.id)}
                            className="px-2 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700 shadow-sm"
                            title="1-Click Convert to Confirmed Booking & Invoice"
                          >
                            <Sparkles className="w-3 h-3 inline mr-1" />
                            Book
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {quotations.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-zinc-400">
                        No quotations on file. Click "Create Quotation" to generate your first estimate.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: CUSTOMER INVOICES                                  */}
        {/* ========================================================= */}
        {activeTab === 'invoices' && (
          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-zinc-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="font-semibold text-zinc-900 text-sm">
                  Tax Invoices Register ({invoices.length})
                </h3>
                <p className="text-xs text-zinc-500">
                  GST compliant invoicing with partial payments & live status derivation
                </p>
              </div>
              <button
                onClick={() => { setEditingInvoice(null); setIsInvoiceModalOpen(true); }}
                className="w-full sm:w-auto min-h-[44px] sm:min-h-[38px] inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 shadow-xs cursor-pointer touch-manipulation active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Invoice</span>
              </button>
            </div>

            {/* Mobile List View (Zero sideways scroll on phones) */}
            <div className="sm:hidden divide-y divide-zinc-100">
              {invoices.map(inv => (
                <div key={inv.id} className="p-3.5 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono font-bold text-xs text-zinc-900 block">{inv.invoiceNumber}</span>
                      <h4 className="text-base font-bold text-zinc-900 mt-0.5">{inv.customerName}</h4>
                      <p className="text-xs text-zinc-500 mt-0.5">{inv.invoiceType || 'Booking Invoice'} • Due: {inv.dueDate}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                        inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' :
                        inv.status === 'Partially Paid' ? 'bg-amber-100 text-amber-800' :
                        inv.status === 'Overdue' ? 'bg-rose-100 text-rose-800' :
                        inv.status === 'Cancelled' ? 'bg-zinc-200 text-zinc-600 line-through' :
                        'bg-indigo-100 text-indigo-800'
                      }`}>
                        {inv.status}
                      </span>
                      <div className="text-base font-bold text-zinc-900 font-tabular tabular-nums mt-1">
                        ₹{inv.totalAmount.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-50">
                    <span className="text-emerald-600 font-semibold">Paid: ₹{(inv.paidAmount || 0).toLocaleString('en-IN')}</span>
                    {(inv.pendingAmount || 0) > 0 ? (
                      <span className="text-rose-600 font-bold">Balance: ₹{(inv.pendingAmount || 0).toLocaleString('en-IN')}</span>
                    ) : (
                      <span className="text-emerald-700 font-bold">Fully Settled</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handlePrintInvoice(inv)}
                      className="flex-1 min-h-[44px] px-3 py-2 text-xs font-semibold border border-zinc-200 rounded-xl hover:bg-zinc-100 text-zinc-800 flex items-center justify-center gap-1.5 touch-manipulation active:scale-95 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>View PDF</span>
                    </button>
                    {(inv.pendingAmount || 0) > 0 && inv.status !== 'Cancelled' && (
                      <button
                        onClick={() => { setSelectedInvoiceForPayment(inv); setIsPaymentModalOpen(true); }}
                        className="flex-1 min-h-[44px] px-3 py-2 text-xs font-bold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 flex items-center justify-center gap-1.5 touch-manipulation active:scale-95 cursor-pointer shadow-xs"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Record Pay</span>
                      </button>
                    )}
                    {inv.status !== 'Cancelled' && (
                      <button
                        onClick={() => handleCancelInvoice(inv.id)}
                        className="min-h-[44px] min-w-[44px] px-3 py-2 text-xs font-semibold text-zinc-400 hover:text-rose-600 border border-zinc-200 rounded-xl hover:bg-rose-50 flex items-center justify-center touch-manipulation active:scale-95 cursor-pointer"
                        title="Cancel Invoice"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {invoices.length === 0 && (
                <div className="text-center py-8 text-zinc-400 text-xs">
                  No invoices created yet.
                </div>
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-medium">
                  <tr>
                    <th className="py-2.5 px-4">Invoice #</th>
                    <th className="py-2.5 px-4">Type</th>
                    <th className="py-2.5 px-4">Customer</th>
                    <th className="py-2.5 px-4">Due Date</th>
                    <th className="py-2.5 px-4 text-right">Total (₹)</th>
                    <th className="py-2.5 px-4 text-right">Paid (₹)</th>
                    <th className="py-2.5 px-4 text-right">Balance Due (₹)</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-zinc-800">
                  {invoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-zinc-50/60">
                      <td className="py-3 px-4 font-mono font-medium">{inv.invoiceNumber}</td>
                      <td className="py-3 px-4 text-zinc-500">{inv.invoiceType || 'Booking Invoice'}</td>
                      <td className="py-3 px-4 font-medium text-zinc-900">{inv.customerName}</td>
                      <td className="py-3 px-4 text-zinc-500">{inv.dueDate}</td>
                      <td className="py-3 px-4 text-right font-semibold">₹{inv.totalAmount.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-right font-medium text-emerald-600">
                        ₹{(inv.paidAmount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-rose-600">
                        ₹{(inv.pendingAmount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' :
                          inv.status === 'Partially Paid' ? 'bg-amber-100 text-amber-800' :
                          inv.status === 'Overdue' ? 'bg-rose-100 text-rose-800' :
                          inv.status === 'Cancelled' ? 'bg-zinc-200 text-zinc-600 line-through' :
                          'bg-indigo-100 text-indigo-800'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1">
                        <button
                          onClick={() => handlePrintInvoice(inv)}
                          className="px-2 py-1 text-xs border border-zinc-200 rounded hover:bg-zinc-100"
                          title="Print / View PDF"
                        >
                          <Printer className="w-3 h-3 inline mr-1" />
                          PDF
                        </button>
                        {(inv.pendingAmount || 0) > 0 && inv.status !== 'Cancelled' && (
                          <button
                            onClick={() => { setSelectedInvoiceForPayment(inv); setIsPaymentModalOpen(true); }}
                            className="px-2 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700"
                            title="Record Payment"
                          >
                            Pay
                          </button>
                        )}
                        {inv.status !== 'Cancelled' && (
                          <button
                            onClick={() => handleCancelInvoice(inv.id)}
                            className="px-2 py-1 text-xs text-zinc-400 hover:text-rose-500 rounded"
                            title="Cancel Invoice"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {invoices.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-zinc-400">
                        No invoices created yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: PAYMENTS & REFUNDS                                 */}
        {/* ========================================================= */}
        {activeTab === 'payments' && (
          <div className="space-y-6">
            {/* Payments Table */}
            <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-zinc-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="font-semibold text-zinc-900 text-sm">
                    Received Payments Ledger ({payments.length})
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Official payment receipts with sequential numbering
                  </p>
                </div>
                <button
                  onClick={() => { setSelectedInvoiceForPayment(null); setIsPaymentModalOpen(true); }}
                  className="w-full sm:w-auto min-h-[44px] sm:min-h-[38px] inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-xs cursor-pointer touch-manipulation active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Record Payment</span>
                </button>
              </div>

              {/* Mobile List View (Zero sideways scroll on phones) */}
              <div className="sm:hidden divide-y divide-zinc-100">
                {payments.map(p => (
                  <div key={p.id} className="p-3.5 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono font-bold text-xs text-emerald-600 block">{p.receiptNumber || 'REC'}</span>
                        <h4 className="text-base font-bold text-zinc-900 mt-0.5">{p.customerName}</h4>
                        <p className="text-xs text-zinc-500 font-mono mt-0.5">Inv: {p.invoiceNumber} • {p.paymentMethod}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-base font-bold text-emerald-600 font-tabular tabular-nums">
                          ₹{p.amount.toLocaleString('en-IN')}
                        </div>
                        <span className="text-xs text-zinc-400 block mt-0.5">{p.paymentDate}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-zinc-500 pt-1 border-t border-zinc-50">
                      <span className="font-mono text-zinc-400 truncate max-w-[200px]">Ref: {p.transactionReference || 'Direct'}</span>
                      <button
                        onClick={() => handlePrintPayment(p)}
                        className="min-h-[44px] px-3.5 py-1.5 text-xs font-semibold border border-zinc-200 rounded-xl hover:bg-zinc-100 text-zinc-800 flex items-center gap-1.5 touch-manipulation active:scale-95 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Receipt PDF</span>
                      </button>
                    </div>
                  </div>
                ))}
                {payments.length === 0 && (
                  <div className="text-center py-8 text-zinc-400 text-xs">
                    No payments recorded yet.
                  </div>
                )}
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-medium">
                    <tr>
                      <th className="py-2.5 px-4">Receipt #</th>
                      <th className="py-2.5 px-4">Invoice #</th>
                      <th className="py-2.5 px-4">Customer</th>
                      <th className="py-2.5 px-4">Method</th>
                      <th className="py-2.5 px-4">Reference</th>
                      <th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-4 text-right">Amount (₹)</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-zinc-800">
                    {payments.map(p => (
                      <tr key={p.id} className="hover:bg-zinc-50/60">
                        <td className="py-3 px-4 font-mono font-medium text-emerald-600">{p.receiptNumber || 'REC'}</td>
                        <td className="py-3 px-4 font-mono">{p.invoiceNumber}</td>
                        <td className="py-3 px-4 font-medium text-zinc-900">{p.customerName}</td>
                        <td className="py-3 px-4">{p.paymentMethod}</td>
                        <td className="py-3 px-4 font-mono text-xs text-zinc-400">{p.transactionReference || '-'}</td>
                        <td className="py-3 px-4 text-zinc-500">{p.paymentDate}</td>
                        <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                          ₹{p.amount.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-right space-x-1">
                          <button
                            onClick={() => handlePrintPayment(p)}
                            className="px-2 py-1 text-xs border border-zinc-200 rounded hover:bg-zinc-100"
                            title="Receipt PDF"
                          >
                            <Printer className="w-3 h-3 inline mr-1" />
                            Receipt
                          </button>
                          <button
                            onClick={() => { setSelectedPaymentForRefund(p); setIsRefundModalOpen(true); }}
                            className="px-2 py-1 text-xs text-rose-600 border border-rose-200 rounded hover:bg-rose-50"
                            title="Refund"
                          >
                            <RotateCcw className="w-3 h-3 inline mr-1" />
                            Refund
                          </button>
                        </td>
                      </tr>
                    ))}
                    {payments.length === 0 && (
                      <tr>
                        <td colSpan={8} className="text-center py-8 text-zinc-400">
                          No payments recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Refunds Table */}
            <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-zinc-200">
                <h3 className="font-semibold text-zinc-900 text-sm">
                  Customer Refunds Register ({refunds.length})
                </h3>
                <p className="text-xs text-zinc-500">
                  Separately tracked refund transactions with audit trail and balance reversal
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-medium">
                    <tr>
                      <th className="py-2.5 px-4">Refund #</th>
                      <th className="py-2.5 px-4">Original Receipt</th>
                      <th className="py-2.5 px-4">Customer</th>
                      <th className="py-2.5 px-4">Reason</th>
                      <th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-4 text-right">Refund Amount (₹)</th>
                      <th className="py-2.5 px-4 text-right">Voucher</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-zinc-800">
                    {refunds.map(r => (
                      <tr key={r.id} className="hover:bg-zinc-50/60">
                        <td className="py-3 px-4 font-mono font-medium text-rose-600">{r.refundNumber}</td>
                        <td className="py-3 px-4 font-mono text-zinc-500">{r.receiptNumber || 'REC'}</td>
                        <td className="py-3 px-4 font-medium text-zinc-900">{r.customerName}</td>
                        <td className="py-3 px-4 text-zinc-600">{r.reason}</td>
                        <td className="py-3 px-4 text-zinc-500">{r.refundDate}</td>
                        <td className="py-3 px-4 text-right font-semibold text-rose-600">
                          -₹{r.amount.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handlePrintRefund(r)}
                            className="px-2 py-1 text-xs border border-zinc-200 rounded hover:bg-zinc-100"
                          >
                            <Printer className="w-3 h-3 inline mr-1" />
                            Voucher
                          </button>
                        </td>
                      </tr>
                    ))}
                    {refunds.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-6 text-zinc-400">
                          No refunds recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: STUDIO EXPENSES                                    */}
        {/* ========================================================= */}
        {activeTab === 'expenses' && (
          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-zinc-200 flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-zinc-900 text-sm">
                  Studio Operating Expenses ({expenses.length})
                </h3>
                <p className="text-xs text-zinc-500">
                  20 photography cost categories, conflict-of-interest checks & approval flow
                </p>
              </div>
              <button
                onClick={() => setIsExpenseModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 shadow"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log Expense</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-medium">
                  <tr>
                    <th className="py-2.5 px-4">Expense #</th>
                    <th className="py-2.5 px-4">Title</th>
                    <th className="py-2.5 px-4">Category</th>
                    <th className="py-2.5 px-4">Vendor</th>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4 text-right">Amount (₹)</th>
                    <th className="py-2.5 px-4">Approval Status</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-zinc-800">
                  {expenses.map(exp => (
                    <tr key={exp.id} className="hover:bg-zinc-50/60">
                      <td className="py-3 px-4 font-mono font-medium">{exp.expenseNumber || 'EXP'}</td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-zinc-900">{exp.title}</div>
                        {exp.eventName && <div className="text-xs text-zinc-400">Event: {exp.eventName}</div>}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 text-xs">
                          {exp.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-zinc-600">{exp.vendor || '-'}</td>
                      <td className="py-3 px-4 text-zinc-500">{exp.expenseDate}</td>
                      <td className="py-3 px-4 text-right font-semibold">₹{exp.amount.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          exp.approvalStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800' :
                          exp.approvalStatus === 'Approved' ? 'bg-blue-100 text-blue-800' :
                          exp.approvalStatus === 'Rejected' ? 'bg-rose-100 text-rose-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {exp.approvalStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1">
                        {exp.approvalStatus === 'Pending Approval' && (
                          <>
                            <button
                              onClick={() => {
                                try {
                                  approveExpense(exp.id);
                                } catch (err: any) {
                                  alert(err.message);
                                }
                              }}
                              className="px-2 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                const r = prompt('Rejection reason:');
                                if (r) rejectExpense(exp.id, r);
                              }}
                              className="px-2 py-1 text-xs text-rose-600 border border-rose-200 rounded hover:bg-rose-50"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {exp.approvalStatus === 'Approved' && (
                          <button
                            onClick={() => markExpensePaid(exp.id, {})}
                            className="px-2 py-1 text-xs bg-zinc-900 text-white rounded hover:bg-zinc-800"
                          >
                            Mark Paid
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {expenses.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-zinc-400">
                        No expenses logged yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 6: FINANCIAL REPORTS (13 REPORTS)                     */}
        {/* ========================================================= */}
        {activeTab === 'reports' && (
          <div className="space-y-4">
            {/* Report Selector Header */}
            <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <label className="text-xs font-semibold text-zinc-700 whitespace-nowrap">
                  Report Type:
                </label>
                <select
                  value={selectedReportType}
                  onChange={e => setSelectedReportType(e.target.value)}
                  className="bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-xs text-zinc-900 font-medium focus:outline-none"
                >
                  <option value="profit_loss">1. Profit & Loss Statement (P&L)</option>
                  <option value="income">2. Income / Collections Register</option>
                  <option value="expense">3. Expense Register</option>
                  <option value="customer_outstanding">4. Customer Outstanding Receivables</option>
                  <option value="invoice_register">5. Invoice Register</option>
                  <option value="payment_register">6. Payment Register</option>
                  <option value="refund_report">7. Customer Refund Report</option>
                  <option value="gst_summary">8. GST & Tax Summary</option>
                  <option value="event_revenue">9. Event-wise Revenue</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-zinc-200 bg-white text-zinc-700 rounded-lg hover:bg-zinc-50 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Report</span>
                </button>
              </div>
            </div>

            {/* Generated Report Display Table */}
            <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden p-6">
              <div className="border-b border-zinc-200 pb-4 mb-4">
                <h2 className="text-lg font-bold text-zinc-900">{reportData.title}</h2>
                <p className="text-xs text-zinc-500">{reportData.subtitle} • Generated at {reportData.generatedAt}</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-medium">
                    <tr>
                      {reportData.columns.map(col => (
                        <th 
                          key={col.key} 
                          className={`py-2.5 px-4 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-zinc-800">
                    {reportData.rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-zinc-50/60">
                        {reportData.columns.map(col => (
                          <td 
                            key={col.key} 
                            className={`py-2.5 px-4 ${col.align === 'right' ? 'text-right font-medium' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                          >
                            {col.key.toLowerCase().includes('amount') || col.key.toLowerCase().includes('total') || col.key.toLowerCase().includes('cgst') || col.key.toLowerCase().includes('sgst') || col.key.toLowerCase().includes('tax')
                              ? `₹${Number(row[col.key] || 0).toLocaleString('en-IN')}`
                              : String(row[col.key] !== undefined ? row[col.key] : '-')}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {reportData.rows.length === 0 && (
                      <tr>
                        <td colSpan={reportData.columns.length} className="text-center py-8 text-zinc-400">
                          No records match selected parameters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Report Summary Card */}
              {Object.keys(reportData.summary).length > 0 && (
                <div className="mt-6 pt-4 border-t border-zinc-200 flex justify-end">
                  <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 min-w-64 space-y-2 text-xs">
                    <span className="font-semibold text-zinc-900 block uppercase tracking-wider text-xs">
                      Report Aggregate Summary
                    </span>
                    {Object.entries(reportData.summary).map(([k, v]) => (
                      <div key={k} className="flex justify-between font-medium">
                        <span className="text-zinc-500">{k}:</span>
                        <span className="text-zinc-900 font-bold">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 7: SAAS PLATFORM SUBSCRIPTION (MASTER ADMIN OVERVIEW)  */}
        {/* ========================================================= */}
        {activeTab === 'saas' && (
          <div className="space-y-6">
            {/* SaaS Metrics Header */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                <span className="text-xs text-zinc-500 font-medium block">Total Studios</span>
                <div className="text-xl font-bold text-zinc-900 mt-1">
                  {platformMetrics.totalStudios}
                </div>
                <span className="text-xs text-zinc-400">Multi-tenant tenants</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                <span className="text-xs text-emerald-600 font-medium block">Active Subscriptions</span>
                <div className="text-xl font-bold text-emerald-600 mt-1">
                  {platformMetrics.activeStudios}
                </div>
                <span className="text-xs text-zinc-400">Paying platform tenants</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                <span className="text-xs text-indigo-600 font-medium block">Platform SaaS MRR</span>
                <div className="text-xl font-bold text-indigo-600 mt-1">
                  ₹{platformMetrics.mrr.toLocaleString('en-IN')}
                </div>
                <span className="text-xs text-zinc-400">₹500 / month / studio</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                <span className="text-xs text-zinc-500 font-medium block">Revenue Separation</span>
                <div className="text-xs font-semibold text-emerald-600 mt-2 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Strict Isolation
                </div>
                <span className="text-xs text-zinc-400">Never mixed with shoot rev</span>
              </div>
            </div>

            {/* Platform Subscriptions Table */}
            <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-zinc-200">
                <h3 className="font-semibold text-zinc-900 text-sm">
                  Registered Studio SaaS Subscriptions
                </h3>
                <p className="text-xs text-zinc-500">
                  Platform-level tenant management ($500 INR/month SaaS pricing model)
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-medium">
                    <tr>
                      <th className="py-2.5 px-4">Studio ID</th>
                      <th className="py-2.5 px-4">Studio Name</th>
                      <th className="py-2.5 px-4">Plan Name</th>
                      <th className="py-2.5 px-4">Cycle</th>
                      <th className="py-2.5 px-4">Renewal Date</th>
                      <th className="py-2.5 px-4 text-right">Fee (₹)</th>
                      <th className="py-2.5 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-zinc-800">
                    {platformSubscriptions.map(s => (
                      <tr key={s.id} className="hover:bg-zinc-50/60">
                        <td className="py-3 px-4 font-mono font-medium">{s.studioId}</td>
                        <td className="py-3 px-4 font-semibold text-zinc-900">{s.studioName}</td>
                        <td className="py-3 px-4">{s.planName}</td>
                        <td className="py-3 px-4 capitalize">{s.billingCycle}</td>
                        <td className="py-3 px-4 text-zinc-500">{s.renewalDate}</td>
                        <td className="py-3 px-4 text-right font-semibold">₹{s.pricePerMonth}/mo</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <QuotationFormModal
        isOpen={isQuotationModalOpen}
        onClose={() => setIsQuotationModalOpen(false)}
        quotationToEdit={editingQuotation}
      />

      <InvoiceFormModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        invoiceToEdit={editingInvoice}
      />

      <PaymentRecordModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        selectedInvoice={selectedInvoiceForPayment}
      />

      <RefundModal
        isOpen={isRefundModalOpen}
        onClose={() => setIsRefundModalOpen(false)}
        selectedPayment={selectedPaymentForRefund}
      />

      <ExpenseFormModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
      />

      <PDFViewerModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        payload={pdfPayload}
      />
    </div>
  );
};
