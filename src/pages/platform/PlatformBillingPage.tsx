import React, { useState, useMemo } from 'react';
import { usePlatform } from '../../context/PlatformContext';
import { platformBillingService } from '../../services/platformBillingService';
import { platformSubscriptionManager } from '../../services/platformSubscriptionManager';
import { PlatformInvoice, PlatformPayment } from '../../types/schema';
import { 
  Receipt, 
  CreditCard, 
  Plus, 
  Printer, 
  CheckCircle, 
  Clock, 
  ArrowRight,
  ShieldCheck,
  FileText
} from 'lucide-react';

export const PlatformBillingPage: React.FC = () => {
  const { triggerRefresh, refreshTrigger, canAdmin, currentAdmin } = usePlatform();
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments'>('invoices');

  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<PlatformInvoice | null>(null);
  const [manualAmount, setManualAmount] = useState<number>(500);
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Bank Transfer' | 'Card' | 'Gateway' | 'Cash'>('UPI');
  const [transactionRef, setTransactionRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  const invoices = useMemo(() => {
    return platformBillingService.listInvoices();
  }, [refreshTrigger]);

  const payments = useMemo(() => {
    return platformBillingService.listPayments();
  }, [refreshTrigger]);

  const handleOpenRecordPayment = (inv: PlatformInvoice) => {
    setSelectedInvoice(inv);
    setManualAmount(inv.balanceAmount || inv.totalAmount);
    setTransactionRef(`OFFLINE-${Date.now()}`);
    setPaymentNotes('');
    setIsRecordPaymentOpen(true);
  };

  const handleConfirmPayment = () => {
    if (!selectedInvoice || !transactionRef.trim() || manualAmount <= 0) return;

    try {
      platformBillingService.recordPayment({
        invoiceId: selectedInvoice.id,
        amount: manualAmount,
        paymentMethod,
        transactionReference: transactionRef.trim(),
        isManual: true,
        recordedBy: currentAdmin.name,
        notes: paymentNotes.trim() || undefined
      });
      setIsRecordPaymentOpen(false);
      setSelectedInvoice(null);
      triggerRefresh();
    } catch (err: any) {
      alert(err.message || 'Error processing payment');
    }
  };

  const handlePrintInvoice = (inv: PlatformInvoice) => {
    const html = platformBillingService.generatePrintableInvoiceHTML(inv);
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      win.print();
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Receipt className="w-7 h-7 text-indigo-600" />
            Platform Subscription Billing & Revenue
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Subscription tax invoices, verified payments, manual offline receipts, and multi-tenant ledger isolation.
          </p>
        </div>

        <div className="text-xs font-semibold text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs self-start sm:self-auto">
          {invoices.length} Invoices / {payments.length} Payments
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'invoices'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Subscription Invoices ({invoices.length})
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'payments'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Payment Transactions ({payments.length})
        </button>
      </div>

      {/* TAB 1: INVOICES */}
      {activeTab === 'invoices' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Invoice No</th>
                  <th className="px-4 py-3">Studio Name</th>
                  <th className="px-4 py-3">Plan (Period)</th>
                  <th className="px-4 py-3">Total Amount</th>
                  <th className="px-4 py-3">Balance Due</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map(inv => {
                  const isPaid = inv.status === 'paid';
                  const isPending = inv.balanceAmount > 0;

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{inv.studioName}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {inv.planName}
                        <span className="block text-[10px] text-slate-400">
                          {inv.billingPeriodStart} to {inv.billingPeriodEnd}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900">₹{inv.totalAmount.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 font-semibold text-rose-600">
                        ₹{inv.balanceAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending && canAdmin('record_payments') && (
                            <button
                              onClick={() => handleOpenRecordPayment(inv)}
                              className="px-2.5 py-1 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
                            >
                              Record Payment
                            </button>
                          )}
                          <button
                            onClick={() => handlePrintInvoice(inv)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                            title="Print / Export PDF"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PAYMENTS */}
      {activeTab === 'payments' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Receipt No</th>
                  <th className="px-4 py-3">Studio Name</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Txn Reference</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map(pm => (
                  <tr key={pm.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{pm.receiptNumber}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{pm.studioName}</td>
                    <td className="px-4 py-3">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium">
                        {pm.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500">{pm.transactionReference}</td>
                    <td className="px-4 py-3 text-slate-600">{pm.paymentDate}</td>
                    <td className="px-4 py-3 text-right font-black text-emerald-600 text-sm">
                      ₹{pm.amount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Offline / Manual Payment Modal */}
      {isRecordPaymentOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-indigo-600" />
              Record Manual Payment: {selectedInvoice.invoiceNumber}
            </h3>

            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1 border border-slate-100">
              <div className="flex justify-between text-slate-600">
                <span>Studio:</span><strong className="text-slate-900">{selectedInvoice.studioName}</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Outstanding Balance:</span>
                <strong className="text-rose-600">₹{selectedInvoice.balanceAmount.toLocaleString('en-IN')}</strong>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Amount to Record (INR) *</label>
                <input
                  type="number"
                  value={manualAmount}
                  onChange={e => setManualAmount(Number(e.target.value))}
                  min={1}
                  max={selectedInvoice.balanceAmount}
                  className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value as any)}
                  className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white"
                >
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                  <option value="Card">Card</option>
                  <option value="Gateway">Online Gateway</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Transaction Reference *</label>
                <input
                  type="text"
                  value={transactionRef}
                  onChange={e => setTransactionRef(e.target.value)}
                  placeholder="e.g. UTR / Bank Reference No."
                  className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Idempotency protected. Duplicate references are rejected.
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={e => setPaymentNotes(e.target.value)}
                  placeholder="Administrative remarks..."
                  className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsRecordPaymentOpen(false);
                  setSelectedInvoice(null);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPayment}
                disabled={!transactionRef.trim() || manualAmount <= 0}
                className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs disabled:opacity-50"
              >
                Verify & Record Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
