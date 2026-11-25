import React, { useEffect, useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';
import {
  razorpayBillingService,
  PlatformTransactionRecord
} from '../../services/razorpayBillingService';
import { masterAdminService } from '../../services/masterAdminService';
import {
  Receipt,
  Search,
  Download,
  FileSpreadsheet,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Building2,
  X
} from 'lucide-react';

export const MasterTransactionsPage: React.FC = () => {
  const [txs, setTxs] = useState<PlatformTransactionRecord[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [envFilter, setEnvFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [refundTarget, setRefundTarget] = useState<PlatformTransactionRecord | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [submittingRefund, setSubmittingRefund] = useState(false);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const studiosMap = useMemo(() => {
    const map = new Map<string, string>();
    masterAdminService.getAllStudios().forEach((s) => map.set(s.id, s.name));
    return map;
  }, []);

  useEffect(() => {
    const unsub = razorpayBillingService.subscribeAllTransactions(setTxs);
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    return txs.filter((tx) => {
      if (statusFilter !== 'all' && tx.status !== statusFilter) return false;
      if (envFilter !== 'all' && (tx.environment || 'test') !== envFilter) return false;
      const dateStr = (tx.paidAt || tx.createdAt || tx.updatedAt || '').slice(0, 10);
      if (dateFrom && dateStr && dateStr < dateFrom) return false;
      if (dateTo && dateStr && dateStr > dateTo) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const studioName = (tx.studioName || studiosMap.get(tx.studioId) || tx.studioId || '').toLowerCase();
        const match =
          studioName.includes(q) ||
          (tx.razorpayPaymentId || '').toLowerCase().includes(q) ||
          (tx.razorpayOrderId || '').toLowerCase().includes(q) ||
          (tx.razorpaySubscriptionId || '').toLowerCase().includes(q) ||
          (tx.invoiceNumber || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [txs, statusFilter, envFilter, dateFrom, dateTo, search, studiosMap]);

  const totals = useMemo(() => {
    const captured = filtered
      .filter((t) => t.status === 'captured' || t.status === 'authorized')
      .reduce((sum, t) => sum + Number(t.amountInr || 0), 0);
    const refunded = filtered.reduce((sum, t) => sum + Number(t.refundedAmountInr || 0), 0);
    const failedCount = filtered.filter((t) => t.status === 'failed').length;
    return { captured, refunded, failedCount };
  }, [filtered]);

  const handleDownloadReceiptPdf = (tx: PlatformTransactionRecord) => {
    const doc = new jsPDF();
    const sName = tx.studioName || studiosMap.get(tx.studioId) || tx.studioId;
    doc.setFontSize(18);
    doc.text('STUDIO OS — OFFICIAL PAYMENT RECEIPT', 20, 24);
    doc.setFontSize(10);
    doc.text(`Invoice Number: ${tx.invoiceNumber || tx.id}`, 20, 36);
    doc.text(`Date: ${new Date(tx.paidAt || tx.updatedAt || tx.createdAt || Date.now()).toLocaleString('en-IN')}`, 20, 43);
    doc.text(`Studio: ${sName} (${tx.studioId})`, 20, 52);
    doc.text(`Plan: ${tx.planName || tx.planId || 'Studio OS Subscription'} (${tx.billingCycle || 'monthly'})`, 20, 59);
    doc.text(`Payment Method: ${(tx.method || tx.paymentType || 'Razorpay').toUpperCase()} ${tx.upiVpa ? `(${tx.upiVpa})` : ''}`, 20, 66);
    doc.text(`Status: ${tx.status.toUpperCase()}`, 20, 73);
    doc.setFontSize(13);
    doc.text(`Amount Paid: INR ${Number(tx.amountInr || 0).toLocaleString('en-IN')}`, 20, 86);
    doc.setFontSize(9);
    doc.text(`Razorpay Payment ID: ${tx.razorpayPaymentId || 'N/A'}`, 20, 100);
    doc.text(`Razorpay Subscription ID: ${tx.razorpaySubscriptionId || 'N/A'}`, 20, 107);
    doc.text(`Razorpay Order ID: ${tx.razorpayOrderId || 'N/A'}`, 20, 114);
    if (tx.razorpayRefundId) {
      doc.text(`Refund ID: ${tx.razorpayRefundId} (INR ${tx.refundedAmountInr || 0})`, 20, 121);
    }
    doc.save(`${tx.invoiceNumber || tx.id}.pdf`);
  };

  const handleExportExcelCsv = () => {
    const headers =
      'Invoice,Studio,Plan,Cycle,Amount INR,Status,Method,UPI VPA,Payment ID,Order ID,Subscription ID,Refund ID,Refunded INR,Environment,Date\n';
    const rows = filtered
      .map((t) =>
        `"${t.invoiceNumber || t.id}","${t.studioName || studiosMap.get(t.studioId) || t.studioId}","${t.planName || ''}","${t.billingCycle || ''}","${t.amountInr}","${t.status}","${t.method || t.paymentType || ''}","${t.upiVpa || ''}","${t.razorpayPaymentId || ''}","${t.razorpayOrderId || ''}","${t.razorpaySubscriptionId || ''}","${t.razorpayRefundId || ''}","${t.refundedAmountInr || 0}","${t.environment || 'test'}","${t.paidAt || t.createdAt || ''}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `studio_os_transactions_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const handleExportLedgerPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text('STUDIO OS — PLATFORM PAYMENT TRANSACTIONS LEDGER', 14, 16);
    doc.setFontSize(9);
    doc.text(
      `Generated: ${new Date().toLocaleString('en-IN')} | Records: ${filtered.length} | Captured: INR ${totals.captured.toLocaleString('en-IN')}`,
      14,
      23
    );
    let y = 33;
    filtered.slice(0, 40).forEach((tx, idx) => {
      const sName = tx.studioName || studiosMap.get(tx.studioId) || tx.studioId;
      doc.text(
        `${idx + 1}. ${sName} | ${tx.status.toUpperCase()} | INR ${tx.amountInr} | ${tx.razorpayPaymentId || tx.razorpayOrderId || tx.id} | ${(tx.paidAt || tx.createdAt || '').slice(0, 10)}`,
        14,
        y
      );
      y += 6;
      if (y > 195) {
        doc.addPage();
        y = 20;
      }
    });
    doc.save(`studio_os_ledger_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const handleIssueRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundTarget?.razorpayPaymentId) return;
    setSubmittingRefund(true);
    setBanner(null);
    try {
      const amt = refundAmount.trim() ? Number(refundAmount) : undefined;
      await razorpayBillingService.adminIssueRefund({
        paymentId: refundTarget.razorpayPaymentId,
        amountInr: amt,
        reason: refundReason.trim() || 'Master Admin Refund'
      });
      setBanner({
        type: 'success',
        text: `Razorpay refund processed for ${refundTarget.razorpayPaymentId}.`
      });
      setRefundTarget(null);
      setRefundAmount('');
      setRefundReason('');
    } catch (err: any) {
      setBanner({ type: 'error', text: err?.message || 'Refund failed.' });
    } finally {
      setSubmittingRefund(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-50 text-orange-800 border border-orange-200">
            Financial Ledger
          </span>
          <h1 className="text-2xl font-black text-zinc-900 font-display tracking-tight mt-1">
            Payments & Razorpay Transactions
          </h1>
          <p className="text-xs text-zinc-500">
            Verified Razorpay checkouts, UPI AutoPay debits, failed charges, and admin-issued refunds.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportExcelCsv}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-50 border border-zinc-200 text-xs font-bold text-zinc-800 flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export Excel (.csv)</span>
          </button>
          <button
            onClick={handleExportLedgerPdf}
            className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-orange-400" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {banner && (
        <div
          className={`p-3.5 rounded-2xl border text-xs flex items-center gap-2 ${
            banner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {banner.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          )}
          <span className="font-bold">{banner.text}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-zinc-200 rounded-2xl p-4">
          <div className="text-xs font-bold uppercase text-zinc-400">Captured Volume</div>
          <div className="text-2xl font-black text-emerald-700 font-mono mt-1">
            ₹{totals.captured.toLocaleString('en-IN')}
          </div>
        </div>
        <div className="bg-white border border-zinc-200 rounded-2xl p-4">
          <div className="text-xs font-bold uppercase text-zinc-400">Refunded Volume</div>
          <div className="text-2xl font-black text-zinc-900 font-mono mt-1">
            ₹{totals.refunded.toLocaleString('en-IN')}
          </div>
        </div>
        <div className="bg-white border border-zinc-200 rounded-2xl p-4">
          <div className="text-xs font-bold uppercase text-zinc-400">Failed Attempts</div>
          <div className="text-2xl font-black text-rose-600 font-mono mt-1">
            {totals.failedCount}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5 bg-white border border-zinc-200 p-3 rounded-2xl text-xs">
        <div className="relative md:col-span-2">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search studio, pay_..., order_..., sub_..., invoice..."
            className="w-full pl-9 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-zinc-50 border border-zinc-200 rounded-xl px-2.5 py-1.5 font-semibold"
        >
          <option value="all">All Statuses</option>
          <option value="captured">Captured</option>
          <option value="authorized">Authorized</option>
          <option value="created">Created / Pending</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
          <option value="partially_refunded">Partially Refunded</option>
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="bg-zinc-50 border border-zinc-200 rounded-xl px-2.5 py-1.5"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="bg-zinc-50 border border-zinc-200 rounded-xl px-2.5 py-1.5"
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase font-bold">
              <tr>
                <th className="px-4 py-3">Date & Invoice</th>
                <th className="px-4 py-3">Studio & Plan</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Razorpay References</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-zinc-500">
                    No Razorpay transactions recorded yet.
                  </td>
                </tr>
              ) : (
                filtered.map((tx) => (
                  <tr key={tx.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <div className="font-mono font-bold text-zinc-900">
                        {tx.invoiceNumber || tx.id.slice(0, 16)}
                      </div>
                      <div className="text-xs text-zinc-400">
                        {new Date(tx.paidAt || tx.updatedAt || tx.createdAt || Date.now()).toLocaleString('en-IN')}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-zinc-900 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-orange-500" />
                        <span>{tx.studioName || studiosMap.get(tx.studioId) || tx.studioId}</span>
                      </div>
                      <div className="text-xs text-zinc-500">
                        {tx.planName || tx.planId} ({tx.billingCycle || 'monthly'})
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-zinc-900">
                      ₹{Number(tx.amountInr || 0).toLocaleString('en-IN')}
                      {tx.refundedAmountInr ? (
                        <div className="text-xs text-rose-600">
                          -₹{tx.refundedAmountInr} ref
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold uppercase text-zinc-800">{tx.method || tx.paymentType}</div>
                      {tx.upiVpa && <div className="text-xs font-mono text-zinc-500">{tx.upiVpa}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                          tx.status === 'captured' || tx.status === 'authorized'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : tx.status === 'failed'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : tx.status === 'refunded' || tx.status === 'partially_refunded'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
                        }`}
                      >
                        {tx.status}
                      </span>
                      {tx.failureReason && (
                        <div className="text-xs text-rose-600 max-w-[180px] truncate">{tx.failureReason}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-600">
                      {tx.razorpayPaymentId && <div>Pay: {tx.razorpayPaymentId}</div>}
                      {tx.razorpaySubscriptionId && <div>Sub: {tx.razorpaySubscriptionId}</div>}
                      {tx.razorpayOrderId && <div>Ord: {tx.razorpayOrderId}</div>}
                      {tx.razorpayRefundId && <div>Ref: {tx.razorpayRefundId}</div>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleDownloadReceiptPdf(tx)}
                          className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold cursor-pointer inline-flex items-center gap-1"
                        >
                          <Receipt className="w-3.5 h-3.5 text-orange-600" />
                          <span>Receipt</span>
                        </button>
                        {tx.razorpayPaymentId && tx.status === 'captured' && (
                          <button
                            onClick={() => {
                              setRefundTarget(tx);
                              setRefundAmount(String(tx.amountInr));
                            }}
                            className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold cursor-pointer inline-flex items-center gap-1"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Refund</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Refund Modal */}
      {refundTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleIssueRefund}
            className="bg-white border border-zinc-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-zinc-900">Issue Razorpay Refund</h3>
              <button type="button" onClick={() => setRefundTarget(null)} className="text-zinc-400 hover:text-zinc-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs text-zinc-500">
              Payment ID: <span className="font-mono font-bold text-zinc-800">{refundTarget.razorpayPaymentId}</span>
            </div>
            <div className="text-xs">
              <label className="block font-bold text-zinc-700 mb-1">Refund Amount (INR) — Leave max for full refund</label>
              <input
                type="number"
                step="0.01"
                max={refundTarget.amountInr}
                min={1}
                required
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 font-mono font-bold"
              />
            </div>
            <div className="text-xs">
              <label className="block font-bold text-zinc-700 mb-1">Refund Reason</label>
              <input
                type="text"
                required
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="e.g. Duplicate charge or Plan downgrade adjustment"
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRefundTarget(null)}
                className="px-4 py-2 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingRefund}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {submittingRefund ? 'Processing Refund...' : 'Confirm Refund via Razorpay'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
