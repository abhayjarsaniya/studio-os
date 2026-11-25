import React, { useState } from 'react';
import { X, Plus, Trash2, FileCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Invoice, InvoiceType } from '../../types/schema';
import { useModalLifecycle } from '../../hooks/useModalLifecycle';

interface InvoiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceToEdit?: Invoice | null;
}

const INVOICE_TYPES: InvoiceType[] = [
  'Booking Invoice',
  'Advance Invoice',
  'Partial Payment Invoice',
  'Final Invoice',
  'Additional Services Invoice',
  'Custom Invoice'
];

export const InvoiceFormModal: React.FC<InvoiceFormModalProps> = ({
  isOpen,
  onClose,
  invoiceToEdit
}) => {
  const { customers, events, createInvoice } = useApp();

  const [invoiceType, setInvoiceType] = useState<InvoiceType>(invoiceToEdit?.invoiceType || 'Booking Invoice');
  const [customerId, setCustomerId] = useState(invoiceToEdit?.customerId || (customers[0]?.id || ''));
  const [customerName, setCustomerName] = useState(invoiceToEdit?.customerName || (customers[0]?.name || ''));
  const [customerPhone, setCustomerPhone] = useState(invoiceToEdit?.customerPhone || (customers[0]?.phone || ''));
  const [customerEmail, setCustomerEmail] = useState(invoiceToEdit?.customerEmail || (customers[0]?.email || ''));
  const [customerAddress, setCustomerAddress] = useState(invoiceToEdit?.customerAddress || '');
  const [customerGst, setCustomerGst] = useState(invoiceToEdit?.customerGst || '');
  const [eventId, setEventId] = useState(invoiceToEdit?.eventId || (events[0]?.id || ''));
  const [eventName, setEventName] = useState(invoiceToEdit?.eventName || (events[0]?.name || ''));

  const [invoiceDate, setInvoiceDate] = useState(invoiceToEdit?.invoiceDate || new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(() => {
    if (invoiceToEdit?.dueDate) return invoiceToEdit.dueDate;
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });

  const [discountAmount, setDiscountAmount] = useState(invoiceToEdit?.discountAmount || 0);
  const [paymentTerms, setPaymentTerms] = useState(invoiceToEdit?.paymentTerms || 'Due on Receipt');
  const [notes, setNotes] = useState(invoiceToEdit?.notes || '');
  const [isIssued, setIsIssued] = useState(true);
  const [isDirty, setIsDirty] = useState(false);

  const { handleAttemptClose, handleBackdropClick } = useModalLifecycle({
    isOpen,
    onClose,
    isDirty,
    confirmMessage: 'Discard unsaved changes to this invoice?'
  });

  // Line items
  const [items, setItems] = useState<Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    taxRate: number;
    amount: number;
  }>>(() => {
    if (invoiceToEdit?.items && invoiceToEdit.items.length > 0) {
      return invoiceToEdit.items.map(it => ({
        description: it.description || it.title || '',
        quantity: it.quantity,
        unitPrice: it.unitPrice || it.rate || 0,
        discount: it.discount || 0,
        taxRate: it.taxRate || 18,
        amount: it.amount || it.totalPrice || 0
      }));
    }
    return [
      {
        description: '',
        quantity: 1,
        unitPrice: 0,
        discount: 0,
        taxRate: 18,
        amount: 0
      }
    ];
  });

  if (!isOpen) return null;

  const handleCustomerChange = (id: string) => {
    setCustomerId(id);
    const found = customers.find(c => c.id === id);
    if (found) {
      setCustomerName(found.name);
      setCustomerPhone(found.phone || '');
      setCustomerEmail(found.email || '');
      setCustomerAddress(found.address || '');
    }
  };

  const handleEventChange = (id: string) => {
    setEventId(id);
    const found = events.find(e => e.id === id);
    if (found) {
      setEventName(found.name);
      if (found.customerId) {
        handleCustomerChange(found.customerId);
      }
    }
  };

  const handleItemChange = (index: number, field: string, val: any) => {
    const updated = [...items];
    const current = { ...updated[index], [field]: val };
    const qty = Number(current.quantity) || 1;
    const rate = Number(current.unitPrice) || 0;
    const disc = Number(current.discount) || 0;
    current.amount = Math.max(0, (qty * rate) - disc);
    updated[index] = current;
    setItems(updated);
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        description: '',
        quantity: 1,
        unitPrice: 20000,
        discount: 0,
        taxRate: 18,
        amount: 20000
      }
    ]);
  };

  const removeItem = (idx: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  const subtotal = items.reduce((sum, it) => sum + (it.amount || 0), 0);
  const taxable = Math.max(0, subtotal - discountAmount);
  const taxAmount = Math.round(taxable * 0.18 * 100) / 100;
  const totalAmount = Math.round((taxable + taxAmount) * 100) / 100;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName?.trim()) {
      alert('Customer Name is required');
      return;
    }

    createInvoice({
      invoiceType,
      customerId,
      customerName,
      customerPhone,
      customerEmail,
      customerAddress,
      customerGst,
      eventId: eventId || undefined,
      eventName: eventName || undefined,
      invoiceDate,
      dueDate,
      items,
      subtotal,
      discountAmount,
      taxAmount,
      cgst: Math.round(taxAmount / 2 * 100) / 100,
      sgst: Math.round(taxAmount / 2 * 100) / 100,
      igst: 0,
      totalAmount,
      paidAmount: 0,
      pendingAmount: totalAmount,
      outstandingBalance: totalAmount,
      paymentTerms,
      notes,
      isIssued
    });

    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="bg-white border border-zinc-200 rounded-xl shadow-2xl flex flex-col w-full max-w-3xl max-h-[92vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 bg-zinc-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center">
              <FileCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900">
                Create Tax Invoice
              </h2>
              <p className="text-xs text-zinc-500">
                Itemized GST billing, automatic numbering & customer balance tracking
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={handleAttemptClose} 
            className="min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
            aria-label="Close invoice form"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form 
          onSubmit={handleSubmit} 
          onChange={() => !isDirty && setIsDirty(true)}
          className="flex-1 overflow-y-auto p-5 space-y-5 text-sm"
        >
          {/* Invoice Type & General Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Invoice Classification *
              </label>
              <select
                value={invoiceType}
                onChange={e => setInvoiceType(e.target.value as InvoiceType)}
                className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-900"
              >
                {INVOICE_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Link to Event (Optional)
              </label>
              <select
                value={eventId}
                onChange={e => handleEventChange(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-900"
              >
                <option value="">-- No Direct Event Link --</option>
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>{ev.name} ({ev.startDate})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Select Customer *
              </label>
              <select
                value={customerId}
                onChange={e => handleCustomerChange(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-900"
              >
                <option value="">-- Choose Customer --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Customer Name *
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Invoice Date
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={e => setInvoiceDate(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Due Date *
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Customer GSTIN (Optional)
              </label>
              <input
                type="text"
                placeholder="27AAAAA0000A1Z5"
                value={customerGst}
                onChange={e => setCustomerGst(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Payment Terms
              </label>
              <input
                type="text"
                value={paymentTerms}
                onChange={e => setPaymentTerms(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs"
              />
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-zinc-200 rounded-lg p-3 bg-zinc-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">
                Line Items
              </span>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-1 text-xs text-indigo-600 font-medium hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Line Item
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center bg-white p-2.5 rounded border border-zinc-200">
                  <input
                    type="text"
                    required
                    placeholder="Item description"
                    value={item.description}
                    onChange={e => handleItemChange(idx, 'description', e.target.value)}
                    className="flex-1 bg-transparent text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none"
                  />
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="w-16">
                      <span className="text-xs text-zinc-400 block sm:hidden">Qty</span>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={e => handleItemChange(idx, 'quantity', Number(e.target.value))}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded px-2 py-1 text-xs text-center"
                      />
                    </div>
                    <div className="w-24">
                      <span className="text-xs text-zinc-400 block sm:hidden">Unit Price (₹)</span>
                      <input
                        type="number"
                        min="0"
                        value={item.unitPrice}
                        onChange={e => handleItemChange(idx, 'unitPrice', Number(e.target.value))}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded px-2 py-1 text-xs text-right"
                      />
                    </div>
                    <div className="w-24 text-right font-medium text-xs text-zinc-900">
                      ₹{item.amount.toLocaleString('en-IN')}
                    </div>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="p-1 text-zinc-400 hover:text-red-500 rounded"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Calculations Breakdown */}
            <div className="flex flex-col items-end pt-3 border-t border-zinc-200 space-y-1.5 text-xs">
              <div className="flex justify-between w-56 text-zinc-600">
                <span>Subtotal:</span>
                <span>₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between w-56 text-zinc-600">
                <span>Discount (₹):</span>
                <input
                  type="number"
                  min="0"
                  value={discountAmount}
                  onChange={e => setDiscountAmount(Number(e.target.value))}
                  className="w-24 bg-white border border-zinc-200 rounded px-1.5 py-0.5 text-xs text-right"
                />
              </div>
              <div className="flex justify-between w-56 text-zinc-600">
                <span>GST (18% Intra-State):</span>
                <span>₹{taxAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between w-56 font-semibold text-sm text-zinc-900 pt-1.5 border-t border-zinc-200">
                <span>Total Invoice:</span>
                <span>₹{totalAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">
              Invoice Notes & Bank Details
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Bank Account: HDFC Bank, IFSC: HDFC0001234, Account: 50200012345678"
              className="w-full bg-white border border-zinc-200 rounded-lg p-2 text-xs"
            />
          </div>

          {/* Issue directly toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isIssuedCheckbox"
              checked={isIssued}
              onChange={e => setIsIssued(e.target.checked)}
              className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
            />
            <label htmlFor="isIssuedCheckbox" className="text-xs text-zinc-700 cursor-pointer">
              Mark as officially Issued (if unchecked, saved as Draft)
            </label>
          </div>

          {/* Footer Submit */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200">
            <button
              type="button"
              onClick={handleAttemptClose}
              className="px-4 py-2 text-xs font-medium border border-zinc-200 rounded-lg hover:bg-zinc-50 text-zinc-700 min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-medium bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 shadow"
            >
              Create Invoice
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
