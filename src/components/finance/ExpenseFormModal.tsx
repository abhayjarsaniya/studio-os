import React, { useState } from 'react';
import { X, TrendingDown } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { expenseService, DEFAULT_20_EXPENSE_CATEGORIES } from '../../services/expenseService';
import { PaymentMethod } from '../../types/schema';

interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  'Cash',
  'UPI',
  'Bank Transfer',
  'Card',
  'Cheque',
  'Other'
];

export const ExpenseFormModal: React.FC<ExpenseFormModalProps> = ({
  isOpen,
  onClose
}) => {
  const { events, employees, createExpense } = useApp();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>(DEFAULT_20_EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState<number>(0);
  const [vendor, setVendor] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [eventId, setEventId] = useState('');
  const [relatedEmployeeId, setRelatedEmployeeId] = useState('');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Expense title is required');
      return;
    }
    if (!amount || amount <= 0) {
      alert('Expense amount must be greater than zero');
      return;
    }

    const selectedEvent = events.find(ev => ev.id === eventId);
    const selectedEmp = employees.find(em => em.id === relatedEmployeeId);

    createExpense({
      title: title.trim(),
      category,
      amount,
      vendor: vendor.trim() || undefined,
      expenseDate,
      paymentMethod,
      referenceNumber: referenceNumber.trim() || undefined,
      eventId: eventId || undefined,
      eventName: selectedEvent?.name,
      relatedEmployeeId: relatedEmployeeId || undefined,
      relatedEmployeeName: selectedEmp?.fullName || (selectedEmp as any)?.name,
      description: description.trim() || undefined
    });

    onClose();
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
            <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900">
                Log Studio Expense
              </h2>
              <p className="text-xs text-zinc-500">
                Categorized operating & production expense with approval tracking
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-zinc-400 hover:text-zinc-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-sm">
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">
              Expense Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Sony FX3 Cinema Rig Rental for Udaipur Shoot"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-900"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Category (20 Photography Categories) *
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-900"
              >
                {DEFAULT_20_EXPENSE_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Amount (₹) *
              </label>
              <input
                type="number"
                required
                min="1"
                placeholder="₹0"
                value={amount || ''}
                onChange={e => setAmount(Number(e.target.value))}
                className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs font-semibold text-zinc-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Vendor / Payee
              </label>
              <input
                type="text"
                placeholder="e.g. Bandra Camera Rental"
                value={vendor}
                onChange={e => setVendor(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Expense Date *
              </label>
              <input
                type="date"
                required
                value={expenseDate}
                onChange={e => setExpenseDate(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Payment Mode
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
                Invoice / Bill Ref #
              </label>
              <input
                type="text"
                placeholder="e.g. BILL-9821"
                value={referenceNumber}
                onChange={e => setReferenceNumber(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Link to Event (Optional)
              </label>
              <select
                value={eventId}
                onChange={e => setEventId(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-900"
              >
                <option value="">-- General Studio Expense --</option>
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>{ev.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Related Employee (Optional)
              </label>
              <select
                value={relatedEmployeeId}
                onChange={e => setRelatedEmployeeId(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-900"
              >
                <option value="">-- None --</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.fullName || (emp as any).name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">
              Description / Justification
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Required for aerial shoots and gimbal sequences..."
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
              disabled={!title.trim() || !amount}
              className="px-5 py-2 text-xs font-medium bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 disabled:opacity-50 shadow"
            >
              Log Expense
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
