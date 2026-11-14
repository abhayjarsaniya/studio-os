import React, { useState } from 'react';
import { X, RotateCcw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Payment, PaymentMethod } from '../../types/schema';

interface RefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPayment?: Payment | null;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  'UPI',
  'Cash',
  'Bank Transfer',
  'Cheque',
  'Card',
  'Other'
];

export const RefundModal: React.FC<RefundModalProps> = ({
  isOpen,
  onClose,
  selectedPayment
}) => {
  const { payments, createRefund } = useApp();

  const [paymentId, setPaymentId] = useState(selectedPayment?.id || (payments[0]?.id || ''));
  const activePayment = payments.find(p => p.id === paymentId) || selectedPayment || payments[0];

  const [amount, setAmount] = useState<number>(activePayment?.amount || 0);
  const [reason, setReason] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(activePayment?.paymentMethod || 'UPI');
  const [referenceNumber, setReferenceNumber] = useState('');

  if (!isOpen) return null;

  const handlePaymentChange = (id: string) => {
    setPaymentId(id);
    const found = payments.find(p => p.id === id);
    if (found) {
      setAmount(found.amount);
      setPaymentMethod(found.paymentMethod || 'UPI');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePayment) {
      alert('Please select an original payment transaction');
      return;
    }
    if (!amount || amount <= 0) {
      alert('Refund amount must be greater than zero');
      return;
    }
    if (amount > activePayment.amount) {
      alert(`Refund cannot exceed original payment of ₹${activePayment.amount}`);
      return;
    }
    if (!reason.trim()) {
      alert('Please specify a valid reason for processing this refund');
      return;
    }

    try {
      createRefund({
        originalPaymentId: activePayment.id,
        amount,
        reason,
        paymentMethod,
        referenceNumber
      });
      onClose();
    } catch (err: any) {
      alert(err.message || 'Error processing refund');
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
            <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900">
                Process Customer Refund
              </h2>
              <p className="text-xs text-zinc-500">
                Creates immutable refund voucher & updates invoice balance
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-zinc-400 hover:text-zinc-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-sm">
          {/* Original Payment Selector */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">
              Select Original Payment *
            </label>
            <select
              value={activePayment?.id || ''}
              onChange={e => handlePaymentChange(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-900 font-medium"
            >
              {payments.length === 0 ? (
                <option value="">No payments on file</option>
              ) : (
                payments.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.receiptNumber || 'REC'} - {p.customerName} (₹{p.amount.toLocaleString('en-IN')})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Details Card */}
          {activePayment && (
            <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-zinc-500">Client:</span>
                <span className="font-semibold text-zinc-900">{activePayment.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Invoice:</span>
                <span className="text-zinc-900">{activePayment.invoiceNumber || 'INV'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Original Amount:</span>
                <span className="font-semibold text-zinc-900">₹{activePayment.amount.toLocaleString('en-IN')}</span>
              </div>
            </div>
          )}

          {/* Refund Amount & Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Refund Amount (₹) *
              </label>
              <input
                type="number"
                required
                min="1"
                max={activePayment?.amount || 99999999}
                value={amount}
                onChange={e => setAmount(Number(e.target.value))}
                className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs font-semibold text-zinc-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Refund Payment Method *
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
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">
              Refund Reason (Mandatory) *
            </label>
            <textarea
              required
              rows={2}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Shoot rescheduled due to client relocation; partial advance returned as agreed."
              className="w-full bg-white border border-zinc-200 rounded-lg p-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">
              Bank / Gateway Reference Number
            </label>
            <input
              type="text"
              placeholder="e.g. REF-UPI-992100"
              value={referenceNumber}
              onChange={e => setReferenceNumber(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs font-mono"
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
              disabled={!activePayment || !amount || !reason.trim()}
              className="px-5 py-2 text-xs font-medium bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50 shadow"
            >
              Issue Refund (₹{amount.toLocaleString('en-IN')})
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
