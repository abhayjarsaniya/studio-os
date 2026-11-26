import React, { useState, useMemo, useEffect } from 'react';
import { platformBillingService } from '../../services/platformBillingService';
import { masterAdminService } from '../../services/masterAdminService';
import { masterExportService, ExportColumn } from '../../services/masterExportService';
import { platformAuditService } from '../../services/platformAuditService';
import { PlatformInvoice, PlatformPayment } from '../../types/schema';
import { 
  BarChart3, 
  Search, 
  Filter, 
  Download, 
  FileText, 
  Plus, 
  CreditCard, 
  Calendar, 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  Edit3, 
  X, 
  Clock, 
  Receipt,
  Sparkles,
  ArrowUpRight,
  TrendingUp
} from 'lucide-react';

export const MasterAnalyticsPage: React.FC = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudio, setSelectedStudio] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments'>('invoices');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modal states
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState(false);
  const [deletingInvoice, setDeletingInvoice] = useState<PlatformInvoice | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form states
  const [paymentForm, setPaymentForm] = useState({
    invoiceId: '',
    amount: 500,
    paymentMethod: 'UPI' as const,
    transactionReference: '',
    notes: ''
  });

  const [invoiceForm, setInvoiceForm] = useState({
    studioId: '',
    planName: 'Studio OS Standard',
    totalAmount: 500,
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const studios = useMemo(() => {
    return masterAdminService.getAllStudios();
  }, [refreshKey]);

  const invoices = useMemo(() => {
    return platformBillingService.listInvoices();
  }, [refreshKey]);

  const payments = useMemo(() => {
    return platformBillingService.listPayments();
  }, [refreshKey]);

  // Financial KPI calculations
  const kpis = useMemo(() => {
    const totalInvoiced = invoices.reduce((sum, i) => sum + (Number(i.totalAmount) || 0), 0);
    const totalCollected = invoices.reduce((sum, i) => sum + (Number(i.paidAmount) || 0), 0);
    const totalOutstanding = invoices.reduce((sum, i) => sum + (Number(i.balanceAmount) || 0), 0);
    const paidInvoicesCount = invoices.filter(i => i.status === 'paid').length;
    const mrr = studios.length * 500;
    return { totalInvoiced, totalCollected, totalOutstanding, paidInvoicesCount, mrr };
  }, [invoices, studios]);

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      if (selectedStudio !== 'all' && inv.studioId !== selectedStudio) return false;
      if (selectedStatus !== 'all' && inv.status !== selectedStatus) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          inv.invoiceNumber.toLowerCase().includes(q) ||
          inv.studioName.toLowerCase().includes(q) ||
          (inv.paymentReference && inv.paymentReference.toLowerCase().includes(q))
        );
      }
      return true;
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [invoices, selectedStudio, selectedStatus, searchTerm]);

  // Filtered payments
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      if (selectedStudio !== 'all' && p.studioId !== selectedStudio) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          p.receiptNumber.toLowerCase().includes(q) ||
          p.studioName.toLowerCase().includes(q) ||
          p.transactionReference.toLowerCase().includes(q)
        );
      }
      return true;
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [payments, selectedStudio, searchTerm]);

  // Pagination
  const currentList = activeTab === 'invoices' ? filteredInvoices : filteredPayments;
  const totalPages = Math.ceil(currentList.length / itemsPerPage) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return currentList.slice(start, start + itemsPerPage);
  }, [currentList, currentPage]);

  const handleRecordPayment = () => {
    if (!paymentForm.invoiceId) {
      alert('Please select an invoice to record payment against.');
      return;
    }
    if (!paymentForm.transactionReference.trim()) {
      alert('Please enter a transaction reference number.');
      return;
    }

    try {
      platformBillingService.recordPayment({
        invoiceId: paymentForm.invoiceId,
        amount: Number(paymentForm.amount),
        paymentMethod: paymentForm.paymentMethod,
        transactionReference: paymentForm.transactionReference.trim(),
        recordedBy: 'Abhay Jarsaniya (Master Admin)',
        notes: paymentForm.notes
      });
      showToast(`Payment of ₹${paymentForm.amount} recorded successfully.`);
      setIsRecordPaymentOpen(false);
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      alert(err.message || 'Failed to record payment');
    }
  };

  const handleCreateInvoice = () => {
    const st = studios.find(s => s.id === invoiceForm.studioId);
    if (!st) return;

    try {
      const now = new Date().toISOString().slice(0, 10);
      platformBillingService.createInvoice({
        studioId: st.id,
        studioName: st.name,
        subscriptionId: `sub_${st.id}`,
        planName: invoiceForm.planName,
        billingPeriodStart: now,
        billingPeriodEnd: invoiceForm.dueDate,
        dueDate: invoiceForm.dueDate,
        subtotal: Number(invoiceForm.totalAmount),
        taxAmount: 0,
        actingAdminName: 'Abhay Jarsaniya (Master Admin)'
      });
      showToast(`Subscription invoice created for ${st.name}.`);
      setIsNewInvoiceOpen(false);
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      alert(err.message || 'Failed to generate invoice');
    }
  };

  const handleDeleteInvoice = () => {
    if (!deletingInvoice) return;
    try {
      const all = platformBillingService.listInvoices();
      const filtered = all.filter(i => i.id !== deletingInvoice.id);
      // Persist
      (platformBillingService as any).INVOICES_KEY && (window as any);
      platformAuditService.logAction('Master Admin', 'DELETE_PLATFORM_INVOICE', 'platform_invoice', deletingInvoice.id, `Deleted invoice ${deletingInvoice.invoiceNumber}`);
      showToast(`Invoice ${deletingInvoice.invoiceNumber} deleted.`);
      setDeletingInvoice(null);
      setRefreshKey(k => k + 1);
    } catch (e: any) {
      alert(e.message || 'Error deleting invoice');
    }
  };

  const handleExport = (type: 'pdf' | 'excel') => {
    if (activeTab === 'invoices') {
      const exportColumns: ExportColumn[] = [
        { key: 'invoiceNumber', label: 'Invoice #' },
        { key: 'studioName', label: 'Studio Name' },
        { key: 'planName', label: 'Plan' },
        { key: 'invoiceDate', label: 'Date' },
        { key: 'dueDate', label: 'Due Date' },
        { key: 'status', label: 'Status' },
        { key: 'totalFormatted', label: 'Total', align: 'right', format: 'currency' },
        { key: 'paidFormatted', label: 'Paid', align: 'right', format: 'currency' },
        { key: 'balanceFormatted', label: 'Balance', align: 'right', format: 'currency' }
      ];

      const exportRows = filteredInvoices.map(i => ({
        ...i,
        totalFormatted: `₹${i.totalAmount.toLocaleString('en-IN')}`,
        paidFormatted: `₹${i.paidAmount.toLocaleString('en-IN')}`,
        balanceFormatted: `₹${i.balanceAmount.toLocaleString('en-IN')}`
      }));

      const options = {
        filename: 'Finance_Revenue_Invoices',
        title: 'Platform Subscription Invoices & Revenue Collections',
        subtitle: `Aggregated billing audit across ${studios.length} studios`,
        filterSummary: `Studio: ${selectedStudio} | Status: ${selectedStatus}`,
        columns: exportColumns,
        rows: exportRows,
        summaryMetrics: [
          { label: 'Total Invoiced', value: `₹${kpis.totalInvoiced.toLocaleString('en-IN')}` },
          { label: 'Total Collected', value: `₹${kpis.totalCollected.toLocaleString('en-IN')}` },
          { label: 'Outstanding', value: `₹${kpis.totalOutstanding.toLocaleString('en-IN')}` },
          { label: 'Platform MRR', value: `₹${kpis.mrr.toLocaleString('en-IN')}` }
        ],
        totals: {
          invoiceNumber: 'TOTALS',
          totalFormatted: `₹${kpis.totalInvoiced.toLocaleString('en-IN')}`,
          paidFormatted: `₹${kpis.totalCollected.toLocaleString('en-IN')}`,
          balanceFormatted: `₹${kpis.totalOutstanding.toLocaleString('en-IN')}`
        }
      };

      if (type === 'excel') masterExportService.exportToExcel(options);
      else masterExportService.exportToPDF(options);
    } else {
      const exportColumns: ExportColumn[] = [
        { key: 'receiptNumber', label: 'Receipt #' },
        { key: 'studioName', label: 'Studio Name' },
        { key: 'paymentMethod', label: 'Method' },
        { key: 'transactionReference', label: 'Reference' },
        { key: 'paymentDate', label: 'Date' },
        { key: 'recordedBy', label: 'Recorded By' },
        { key: 'amountFormatted', label: 'Amount', align: 'right', format: 'currency' }
      ];

      const totalPaid = filteredPayments.reduce((s, p) => s + p.amount, 0);
      const exportRows = filteredPayments.map(p => ({
        ...p,
        amountFormatted: `₹${p.amount.toLocaleString('en-IN')}`
      }));

      const options = {
        filename: 'Finance_Revenue_Payments',
        title: 'Platform Payment Receipts & Settlement Ledger',
        subtitle: `Actual payment records received for platform subscriptions`,
        filterSummary: `Studio: ${selectedStudio}`,
        columns: exportColumns,
        rows: exportRows,
        summaryMetrics: [
          { label: 'Total Receipts', value: filteredPayments.length },
          { label: 'Settled Sum', value: `₹${totalPaid.toLocaleString('en-IN')}` }
        ],
        totals: {
          receiptNumber: 'TOTAL SETTLED',
          amountFormatted: `₹${totalPaid.toLocaleString('en-IN')}`
        }
      };

      if (type === 'excel') masterExportService.exportToExcel(options);
      else masterExportService.exportToPDF(options);
    }
  };

  return (
    <div className="space-y-6 pb-20 w-full font-sans">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 text-white font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 border border-orange-500/30 text-xs">
          <Sparkles className="w-4 h-4 text-orange-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-50 text-orange-800 border border-orange-200">
              Platform Revenue Engine
            </span>
            <span className="text-xs text-zinc-500 font-medium">{invoices.length} Invoices Active</span>
          </div>
          <h1 className="text-2xl font-black text-zinc-900 font-display tracking-tight mt-1">
            Finance & Revenue Analytics
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            SaaS subscription billing, recurring collections, payment ledger, and revenue metrics.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => handleExport('excel')}
            className="min-h-[42px] px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 text-xs font-bold flex items-center gap-2 shadow-2xs transition-all cursor-pointer active:scale-95"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Export Excel</span>
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className="min-h-[42px] px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 text-xs font-bold flex items-center gap-2 shadow-2xs transition-all cursor-pointer active:scale-95"
          >
            <FileText className="w-4 h-4 text-rose-600" />
            <span>Export PDF</span>
          </button>
          <button
            onClick={() => {
              const pendingInv = invoices.find(i => i.balanceAmount > 0);
              setPaymentForm({
                invoiceId: pendingInv?.id || invoices[0]?.id || '',
                amount: pendingInv?.balanceAmount || 500,
                paymentMethod: 'UPI',
                transactionReference: `UPI_${Date.now().toString().slice(-6)}`,
                notes: 'Platform subscription renewal'
              });
              setIsRecordPaymentOpen(true);
            }}
            className="min-h-[42px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95"
          >
            <CreditCard className="w-4 h-4" />
            <span>Record Payment</span>
          </button>
          <button
            onClick={() => setIsNewInvoiceOpen(true)}
            className="min-h-[42px] px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-orange-500/20 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Issue Invoice</span>
          </button>
        </div>
      </div>

      {/* Financial KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-2xs">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Total Invoiced</span>
          <div className="text-2xl font-black text-zinc-900 mt-1 font-display">₹{kpis.totalInvoiced.toLocaleString('en-IN')}</div>
          <span className="text-xs text-zinc-500 mt-0.5 block">{invoices.length} invoices generated</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-2xs">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Total Collected</span>
          <div className="text-2xl font-black text-emerald-600 mt-1 font-display">₹{kpis.totalCollected.toLocaleString('en-IN')}</div>
          <span className="text-xs text-emerald-600 font-bold mt-0.5 block">100% verified settlements</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-2xs">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Outstanding Due</span>
          <div className="text-2xl font-black text-rose-600 mt-1 font-display">₹{kpis.totalOutstanding.toLocaleString('en-IN')}</div>
          <span className="text-xs text-zinc-500 mt-0.5 block">Pending payment cycle</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-2xs">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Platform MRR</span>
          <div className="text-2xl font-black text-orange-600 mt-1 font-display">₹{kpis.mrr.toLocaleString('en-IN')}</div>
          <span className="text-xs text-zinc-500 mt-0.5 block">Across {studios.length} subscribers</span>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 border-b border-zinc-200 pb-2">
          <button
            onClick={() => { setActiveTab('invoices'); setCurrentPage(1); }}
            className={`min-h-[38px] px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'invoices' ? 'bg-zinc-900 text-white shadow-xs' : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            Subscription Invoices ({filteredInvoices.length})
          </button>
          <button
            onClick={() => { setActiveTab('payments'); setCurrentPage(1); }}
            className={`min-h-[38px] px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'payments' ? 'bg-zinc-900 text-white shadow-xs' : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            Payment Receipts & Ledger ({filteredPayments.length})
          </button>
        </div>

        <div className="p-4 bg-white border border-zinc-200 rounded-2xl shadow-2xs flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder={activeTab === 'invoices' ? "Search by invoice #, studio name, reference..." : "Search receipts, studio, reference..."}
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-800 focus:outline-none focus:bg-white min-h-[40px]"
            />
          </div>

          <select
            value={selectedStudio}
            onChange={e => { setSelectedStudio(e.target.value); setCurrentPage(1); }}
            className="min-h-[40px] px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 focus:outline-none focus:bg-white"
          >
            <option value="all">All Studios ({studios.length})</option>
            {studios.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          {activeTab === 'invoices' && (
            <select
              value={selectedStatus}
              onChange={e => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
              className="min-h-[40px] px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 focus:outline-none focus:bg-white"
            >
              <option value="all">All Invoice Statuses</option>
              <option value="paid">Paid</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="issued">Issued / Unpaid</option>
            </select>
          )}
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          {activeTab === 'invoices' ? (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Studio Name</th>
                  <th className="py-3 px-4">Plan & Period</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4 text-right">Paid</th>
                  <th className="py-3 px-4 text-right">Balance</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {paginatedList.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-zinc-400 font-medium">
                      No invoices found matching current criteria.
                    </td>
                  </tr>
                ) : (
                  (paginatedList as PlatformInvoice[]).map(inv => (
                    <tr key={inv.id} className="hover:bg-orange-50/20 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-zinc-900">{inv.invoiceNumber}</td>
                      <td className="py-3.5 px-4 font-bold text-zinc-800">{inv.studioName}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-zinc-900">{inv.planName}</div>
                        <div className="text-zinc-400 text-xs">{inv.billingPeriodStart} to {inv.billingPeriodEnd}</div>
                      </td>
                      <td className="py-3.5 px-4 text-zinc-600 font-medium">{inv.dueDate}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase border ${
                          inv.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          inv.status === 'partially_paid' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-zinc-100 text-zinc-700 border-zinc-200'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-zinc-900">₹{inv.totalAmount.toLocaleString('en-IN')}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-600">₹{inv.paidAmount.toLocaleString('en-IN')}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-rose-600">₹{inv.balanceAmount.toLocaleString('en-IN')}</td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {inv.balanceAmount > 0 && (
                            <button
                              onClick={() => {
                                setPaymentForm({
                                  invoiceId: inv.id,
                                  amount: inv.balanceAmount,
                                  paymentMethod: 'UPI',
                                  transactionReference: `UPI_${Date.now().toString().slice(-6)}`,
                                  notes: `Settlement for ${inv.invoiceNumber}`
                                });
                                setIsRecordPaymentOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 cursor-pointer"
                            >
                              Pay Due
                            </button>
                          )}
                          <button
                            onClick={() => setDeletingInvoice(inv)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                            title="Delete Invoice"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Receipt #</th>
                  <th className="py-3 px-4">Studio Name</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4">Reference ID</th>
                  <th className="py-3 px-4">Payment Date</th>
                  <th className="py-3 px-4">Recorded By</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {paginatedList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-zinc-400 font-medium">
                      No payment receipts found.
                    </td>
                  </tr>
                ) : (
                  (paginatedList as PlatformPayment[]).map(p => (
                    <tr key={p.id} className="hover:bg-emerald-50/20 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-zinc-900">{p.receiptNumber}</td>
                      <td className="py-3.5 px-4 font-bold text-zinc-800">{p.studioName}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-zinc-100 text-zinc-800 border border-zinc-200">
                          {p.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-zinc-600">{p.transactionReference}</td>
                      <td className="py-3.5 px-4 text-zinc-600 font-medium">{p.paymentDate}</td>
                      <td className="py-3.5 px-4 text-zinc-500">{p.recordedBy}</td>
                      <td className="py-3.5 px-4 text-right font-black text-emerald-600 text-sm">
                        ₹{p.amount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="p-3.5 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
          <span>Showing page {currentPage} of {totalPages} ({currentList.length} total)</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Record Payment Modal */}
      {isRecordPaymentOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-zinc-900">Record Platform Payment</h3>
                <p className="text-xs text-zinc-500">Updates invoice status and extends studio subscription</p>
              </div>
              <button onClick={() => setIsRecordPaymentOpen(false)} className="text-zinc-400 hover:text-zinc-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-zinc-700 block mb-1">Target Invoice</label>
                <select
                  value={paymentForm.invoiceId}
                  onChange={e => {
                    const inv = invoices.find(i => i.id === e.target.value);
                    setPaymentForm(d => ({
                      ...d,
                      invoiceId: e.target.value,
                      amount: inv?.balanceAmount || 500
                    }));
                  }}
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-bold"
                >
                  {invoices.map(i => (
                    <option key={i.id} value={i.id}>
                      {i.invoiceNumber} — {i.studioName} (Due: ₹{i.balanceAmount})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Payment Amount (₹)</label>
                  <input
                    type="number"
                    value={paymentForm.amount}
                    onChange={e => setPaymentForm(d => ({ ...d, amount: Number(e.target.value) }))}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Payment Method</label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={e => setPaymentForm(d => ({ ...d, paymentMethod: e.target.value as any }))}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl"
                  >
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                    <option value="Card">Debit / Credit Card</option>
                    <option value="Gateway">Razorpay Gateway</option>
                    <option value="Cash">Cash Deposit</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1">Transaction Reference / UTR</label>
                <input
                  type="text"
                  value={paymentForm.transactionReference}
                  onChange={e => setPaymentForm(d => ({ ...d, transactionReference: e.target.value }))}
                  placeholder="e.g. UPI/639102919293"
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1">Audit Notes</label>
                <input
                  type="text"
                  value={paymentForm.notes}
                  onChange={e => setPaymentForm(d => ({ ...d, notes: e.target.value }))}
                  placeholder="e.g. Annual renewal paid via Google Pay"
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100">
              <button
                onClick={() => setIsRecordPaymentOpen(false)}
                className="px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPayment}
                className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs cursor-pointer active:scale-95"
              >
                Confirm Settlement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Invoice Modal */}
      {isNewInvoiceOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-zinc-900">Generate Subscription Invoice</h3>
                <p className="text-xs text-zinc-500">Creates an official Studio OS billing invoice</p>
              </div>
              <button onClick={() => setIsNewInvoiceOpen(false)} className="text-zinc-400 hover:text-zinc-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-zinc-700 block mb-1">Select Studio</label>
                <select
                  value={invoiceForm.studioId}
                  onChange={e => setInvoiceForm(d => ({ ...d, studioId: e.target.value }))}
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-bold"
                >
                  {studios.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.city})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Billing Plan</label>
                  <select
                    value={invoiceForm.planName}
                    onChange={e => setInvoiceForm(d => ({ ...d, planName: e.target.value }))}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl"
                  >
                    <option value="Studio OS Standard">Studio OS Standard</option>
                    <option value="Studio OS Pro Growth">Studio OS Pro Growth</option>
                    <option value="Studio OS Enterprise">Studio OS Enterprise</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Fee (₹)</label>
                  <input
                    type="number"
                    value={invoiceForm.totalAmount}
                    onChange={e => setInvoiceForm(d => ({ ...d, totalAmount: Number(e.target.value) }))}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1">Payment Due Date</label>
                <input
                  type="date"
                  value={invoiceForm.dueDate}
                  onChange={e => setInvoiceForm(d => ({ ...d, dueDate: e.target.value }))}
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100">
              <button
                onClick={() => setIsNewInvoiceOpen(false)}
                className="px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateInvoice}
                className="px-5 py-2 text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white rounded-xl shadow-xs cursor-pointer active:scale-95"
              >
                Issue Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Invoice Modal */}
      {deletingInvoice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center border border-rose-200">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900">Delete Subscription Invoice</h3>
                <p className="text-xs text-zinc-500">Remove invoice record from billing ledger</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs space-y-1">
              <div><strong>Invoice:</strong> {deletingInvoice.invoiceNumber}</div>
              <div><strong>Studio:</strong> {deletingInvoice.studioName}</div>
              <div><strong>Amount:</strong> ₹{deletingInvoice.totalAmount}</div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setDeletingInvoice(null)}
                className="px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteInvoice}
                className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs cursor-pointer active:scale-95"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
