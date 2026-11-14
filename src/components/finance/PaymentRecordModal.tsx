import React, { useState } from 'react';
import { X, CreditCard } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Invoice, PaymentMethod } from '../../types/schema';

interface PaymentRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedInvoice?: Invoice | null;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  'UPI',
  'Cash',
  'Bank Transfer',
  'Cheque',
  'Card',
  'Other'
];

export const PaymentRecordModal: React.FC<PaymentRecordModalProps> = ({
  isOpen,
  onClose,
  selectedInvoice
}) => {
  const { invoices, recordPayment } = useApp();

  // Filter to invoices with pending balances
  const payableInvoices = invoices.filter(i => (i.pendingAmount || 0) > 0 && i.status !== 'Cancelled');

  const [invoiceId, setInvoiceId] = useState(selectedInvoice?.id || (payableInvoices[0]?.id || ''));
  const activeInvoice = invoices.find(i => i.id === invoiceId) || selectedInvoice || payableInvoices[0];

  const pendingBalance = activeInvoice?.pendingAmount || 0;
  const [amount, setAmount] = useState<number>(pendingBalance);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [transactionReference, setTransactionReference] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleInvoiceChange = (id: string) => {
    setInvoiceId(id);
    const found = invoices.find(i => i.id === id);
    if (found) {
      setAmount(found.pendingAmount || 0);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInvoice) {
      alert('Please select a valid invoice');
      return;
    }
    if (!amount || amount <= 0) {
      alert('Payment amount must be greater than zero');
      return;
    }
    if (amount > (activeInvoice.pendingAmount || 0) + 0.01) {
      alert(`Amount exceeds pending balance of ₹${activeInvoice.pendingAmount}`);
      return;
    }

    try {
      recordPayment({
        invoiceId: activeInvoice.id,
        amount,
        paymentMethod,
        transactionReference,
        paymentDate,
        notes
      });
      onClose();
    } catch (err: any) {
      alert(err.message || 'Error recording payment');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white border border-zinc-200 rounded-xl shadow-2xl flex flex-col w-full max-w-lg overflow-hidden"
        role="dialog"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 bg-zinc-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900">
                Record Payment Received
              </h2>
              <p className="text-xs text-zinc-500">
                Offline/manual collection with instant receipt generation
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-zinc-400 hover:text-zinc-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-sm">
          {/* Invoice Selector */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">
              Select Invoice to Settle *
            </label>
            <select
              value={activeInvoice?.id || ''}
              onChange={e => handleInvoiceChange(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-900 font-medium"
            >
              {payableInvoices.length === 0 ? (
                <option value="">No pending invoices available</option>
              ) : (
                payableInvoices.map(inv => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoiceNumber} - {inv.customerName} (Due: ₹{(inv.pendingAmount || 0).toLocaleString('en-IN')})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Invoice Summary Card */}
          {activeInvoice && (
            <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-zinc-500">Client:</span>
                <span className="font-semibold text-zinc-900">{activeInvoice.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Total Invoiced:</span>
                <span className="font-medium text-zinc-900">₹{activeInvoice.totalAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Already Paid:</span>
                <span className="font-medium text-emerald-600">₹{(activeInvoice.paidAmount || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between border-t border-zinc-200 pt-1.5 font-semibold text-rose-600">
                <span>Remaining Pending Due:</span>
                <span>₹{(activeInvoice.pendingAmount || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          )}

          {/* Payment Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Amount Received (₹) *
              </label>
              <input
                type="number"
                required
                min="1"
                max={activeInvoice?.pendingAmount || 99999999}
                value={amount}
                onChange={e => setAmount(Number(e.target.value))}
                className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs font-semibold text-zinc-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Payment Method *
              </label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-900"
              >
                {PAYMENT_METHODS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Transaction / UTR / Cheque Ref
              </label>
              <input
                type="text"
                placeholder="e.g. UPI/491029198301"
                value={transactionReference}
                onChange={e => setTransactionReference(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Payment Date *
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={e => setPaymentDate(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">
              Internal Remarks
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Advance paid via GPay to studio account..."
              className="w-full bg-white border border-zinc-200 rounded-lg p-2 text-xs"
            />
          </div>

          {/* Footer Submit */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium border border-zinc-200 rounded-lg hover:bg-zinc-50 text-zinc-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!activeInvoice || !amount}
              className="px-5 py-2 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 shadow"
            >
              Record Payment (₹{amount.toLocaleString('en-IN')})
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
