import React, { useState, useMemo } from 'react';
import { X, Plus, Trash2, Sparkles, Receipt } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useStudio } from '../../context/StudioContext';
import { studioCatalogService } from '../../services/studioCatalogService';
import { Quotation } from '../../types/schema';

interface QuotationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotationToEdit?: Quotation | null;
}

export const QuotationFormModal: React.FC<QuotationFormModalProps> = ({
  isOpen,
  onClose,
  quotationToEdit
}) => {
  const { customers, createQuotation, updateQuotation } = useApp();
  const { currentStudio } = useStudio();
  const studioId = currentStudio?.id || '';

  const studioPackages = useMemo(() => {
    return studioId ? studioCatalogService.listPackages(studioId) : [];
  }, [studioId, isOpen]);

  const [customerId, setCustomerId] = useState(quotationToEdit?.customerId || '');
  const [customerName, setCustomerName] = useState(quotationToEdit?.customerName || '');
  const [customerPhone, setCustomerPhone] = useState(quotationToEdit?.customerPhone || '');
  const [customerEmail, setCustomerEmail] = useState(quotationToEdit?.customerEmail || '');
  const [eventCategory, setEventCategory] = useState(quotationToEdit?.eventCategory || 'Wedding');
  const [eventDate, setEventDate] = useState(quotationToEdit?.eventDate || new Date().toISOString().split('T')[0]);
  const [eventVenue, setEventVenue] = useState(quotationToEdit?.eventVenue || quotationToEdit?.venue || '');
  const [packageName, setPackageName] = useState(quotationToEdit?.packageName || '');
  const [expiryDate, setExpiryDate] = useState(() => {
    if (quotationToEdit?.expiryDate || quotationToEdit?.validUntil) {
      return quotationToEdit.expiryDate || quotationToEdit.validUntil!;
    }
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  });
  const [paymentTerms, setPaymentTerms] = useState(quotationToEdit?.paymentTerms || '');
  const [additionalNotes, setAdditionalNotes] = useState(quotationToEdit?.additionalNotes || quotationToEdit?.notes || '');

  // Line items
  const [items, setItems] = useState<Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    taxRate: number;
    amount: number;
  }>>(() => {
    if (quotationToEdit?.items && quotationToEdit.items.length > 0) {
      return quotationToEdit.items.map(it => ({
        description: it.description || (it as any).title || '',
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        discount: it.discount || 0,
        taxRate: it.taxRate || 18,
        amount: it.amount || (it as any).totalPrice || 0
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
    }
  };

  const applyPackageTemplate = (pkgId: string) => {
    const pkg = studioPackages.find(p => p.id === pkgId || p.name === pkgId);
    if (!pkg) return;

    setPackageName(pkg.name);
    setEventCategory(pkg.category);
    setItems(pkg.items.map(it => ({
      description: it.name || it.description || '',
      quantity: it.qty || 1,
      unitPrice: it.rate || 0,
      discount: 0,
      taxRate: 18,
      amount: (it.qty || 1) * (it.rate || 0)
    })));
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
        unitPrice: 15000,
        discount: 0,
        taxRate: 18,
        amount: 15000
      }
    ]);
  };

  const removeItem = (idx: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  const subtotal = items.reduce((sum, it) => sum + (it.amount || 0), 0);
  const taxAmount = Math.round(subtotal * 0.18 * 100) / 100;
  const grandTotal = Math.round((subtotal + taxAmount) * 100) / 100;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName?.trim()) {
      alert('Customer Name is required');
      return;
    }

    const payload = {
      customerId,
      customerName,
      customerPhone,
      customerEmail,
      eventCategory,
      eventDate,
      eventVenue,
      packageName,
      expiryDate,
      validUntil: expiryDate,
      items,
      subtotal,
      taxRate: 18,
      taxAmount,
      cgst: Math.round(taxAmount / 2 * 100) / 100,
      sgst: Math.round(taxAmount / 2 * 100) / 100,
      igst: 0,
      grandTotal,
      totalAmount: grandTotal,
      paymentTerms,
      additionalNotes,
      notes: additionalNotes
    };

    if (quotationToEdit) {
      updateQuotation(quotationToEdit.id, payload);
    } else {
      createQuotation(payload);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white border border-zinc-200 rounded-xl shadow-2xl flex flex-col w-full max-w-3xl max-h-[92vh] overflow-hidden"
        role="dialog"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 bg-zinc-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900">
                {quotationToEdit ? 'Edit Quotation / Estimate' : 'Create Customer Quotation'}
              </h2>
              <p className="text-xs text-zinc-500">
                Itemized pricing with GST calculations & package templates
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-zinc-400 hover:text-zinc-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5 text-sm">
          {/* Quick Package Selector */}
          <div className="bg-amber-50/60 border border-amber-200/60 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-amber-900">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Load Studio Package ({studioPackages.length} configured)</span>
            </div>
            {studioPackages.length === 0 ? (
              <p className="text-xs text-zinc-600">
                No saved packages yet. Add line items below or create reusable packages in Studio Settings.
              </p>
            ) : (
              <select
                onChange={(e) => e.target.value && applyPackageTemplate(e.target.value)}
                defaultValue=""
                className="w-full bg-white border border-zinc-200 rounded px-2.5 py-1.5 text-xs text-zinc-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="">-- Select from your Studio Packages --</option>
                {studioPackages.map(pkg => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.name} ({pkg.category}) — ₹{pkg.basePrice.toLocaleString('en-IN')}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Client & Event Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Select Existing Customer (Optional)
              </label>
              <select
                value={customerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
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
                placeholder="e.g. Rohan & Ananya Singhania"
                className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                placeholder="+91 98200 11223"
                className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={customerEmail}
                onChange={e => setCustomerEmail(e.target.value)}
                placeholder="client@example.com"
                className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Event Category
              </label>
              <input
                type="text"
                value={eventCategory}
                onChange={e => setEventCategory(e.target.value)}
                placeholder="Wedding, Pre-Wedding, Corporate..."
                className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Tentative Event Date
              </label>
              <input
                type="date"
                value={eventDate}
                onChange={e => setEventDate(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Venue / Location
              </label>
              <input
                type="text"
                value={eventVenue}
                onChange={e => setEventVenue(e.target.value)}
                placeholder="e.g. Taj Lands End, Bandra"
                className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Quotation Valid Until
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={e => setExpiryDate(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs"
              />
            </div>
          </div>

          {/* Itemized Deliverables Table */}
          <div className="border border-zinc-200 rounded-lg p-3 bg-zinc-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">
                Itemized Services & Deliverables
              </span>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-1 text-xs text-indigo-600 font-medium hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Item
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center bg-white p-2.5 rounded border border-zinc-200">
                  <input
                    type="text"
                    required
                    placeholder="Description of service / equipment"
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
                      <span className="text-xs text-zinc-400 block sm:hidden">Rate (₹)</span>
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

            {/* Totals Summary */}
            <div className="flex flex-col items-end pt-3 border-t border-zinc-200 space-y-1 text-xs">
              <div className="flex justify-between w-48 text-zinc-600">
                <span>Subtotal:</span>
                <span>₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between w-48 text-zinc-600">
                <span>GST (18%):</span>
                <span>₹{taxAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between w-48 font-semibold text-sm text-zinc-900 pt-1 border-t border-zinc-200">
                <span>Grand Total:</span>
                <span>₹{grandTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Terms & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Payment Schedule Terms
              </label>
              <textarea
                rows={2}
                value={paymentTerms}
                onChange={e => setPaymentTerms(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-lg p-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Additional Remarks / Inclusions
              </label>
              <textarea
                rows={2}
                value={additionalNotes}
                onChange={e => setAdditionalNotes(e.target.value)}
                placeholder="e.g. Drone flight permissions subject to local authorities..."
                className="w-full bg-white border border-zinc-200 rounded-lg p-2 text-xs"
              />
            </div>
          </div>

          {/* Footer Submit */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium border border-zinc-200 rounded-lg hover:bg-zinc-50 text-zinc-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-medium bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 shadow"
            >
              {quotationToEdit ? 'Save Changes' : 'Generate Quotation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
