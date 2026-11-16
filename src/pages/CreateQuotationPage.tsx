import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useStudio } from '../context/StudioContext';
import { quotationService, DEFAULT_10_PHOTOGRAPHY_PACKAGES } from '../services/quotationService';
import { bookingService } from '../services/bookingService';
import { customerService } from '../services/customerService';
import { pdfGeneratorService } from '../services/pdfGeneratorService';
import { 
  FileText, 
  User, 
  Calendar, 
  Plus, 
  Trash2, 
  Eye, 
  Download, 
  Share2, 
  CheckCircle2, 
  Sparkles, 
  Layers, 
  Search,
  ArrowRight,
  ShieldCheck,
  Check
} from 'lucide-react';

export const CreateQuotationPage: React.FC = () => {
  const { customers, setActiveTab, setSelectedEventId, openPdfViewer } = useApp();
  const { currentStudio } = useStudio();
  const studioId = currentStudio.id;

  // Step/section states
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerCity, setCustomerCity] = useState('');

  // Event details
  const [eventName, setEventName] = useState('');
  const [category, setCategory] = useState('Wedding');
  const [eventDate, setEventDate] = useState('');
  const [venue, setVenue] = useState('');

  // Package preset
  const [selectedPackageId, setSelectedPackageId] = useState<string>('pkg_wedding_cinema');

  // Quotation line items
  const [items, setItems] = useState<Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
  }>>([
    { id: '1', description: '2 Candid Photographers & 2 4K Cinematographers (Full Day)', quantity: 1, unitPrice: 90000 },
    { id: '2', description: 'Licensed 4K Aerial Drone Coverage with Pilot', quantity: 1, unitPrice: 20000 },
    { id: '3', description: '3-Minute Cinematic Teaser + 30-Minute Highlight Film', quantity: 1, unitPrice: 25000 },
    { id: '4', description: '2 Deluxe Embossed Photobooks in Presentation Box', quantity: 1, unitPrice: 15000 }
  ]);

  // Pricing & Terms
  const [discount, setDiscount] = useState(10000);
  const [applyGst, setApplyGst] = useState(true);
  const [validityDays, setValidityDays] = useState(30);
  const [paymentTerms, setPaymentTerms] = useState('50% Booking Advance, 40% on Shoot Date, 10% on Final Album Delivery');
  const [savedQuotationId, setSavedQuotationId] = useState<string | null>(null);

  // Filter matching customers
  const matchingCustomers = useMemo(() => {
    if (!customerSearch.trim()) return [];
    const q = customerSearch.toLowerCase();
    return customers.filter(c => 
      c.name.toLowerCase().includes(q) || 
      (c.phone && c.phone.includes(q))
    ).slice(0, 5);
  }, [customerSearch, customers]);

  const selectExistingCustomer = (c: typeof customers[0]) => {
    setSelectedCustomerId(c.id);
    setCustomerName(c.name);
    setCustomerPhone(c.phone || '');
    setCustomerEmail(c.email || '');
    setCustomerCity(c.city || '');
    setCustomerSearch('');
  };

  const handleApplyPackagePreset = (pkgId: string) => {
    setSelectedPackageId(pkgId);
    const found = DEFAULT_10_PHOTOGRAPHY_PACKAGES.find(p => p.id === pkgId);
    if (found) {
      setItems(found.items.map((item, idx) => ({
        id: String(idx + 1),
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice
      })));
      setEventName(found.name);
      setCategory(found.category);
    }
  };

  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      {
        id: String(Date.now()),
        description: 'Custom Service / Deliverable',
        quantity: 1,
        unitPrice: 10000
      }
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter(i => i.id !== id));
  };

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const taxableAmount = Math.max(0, subtotal - discount);
  const taxAmount = applyGst ? Math.round(taxableAmount * 0.18) : 0;
  const grandTotal = taxableAmount + taxAmount;
  const advanceAmount = Math.round(grandTotal * 0.5);

  // Save Quotation
  const handleSaveQuotation = (status: 'Draft' | 'Sent' = 'Draft') => {
    if (!customerName.trim() || !customerPhone.trim()) {
      alert('Please enter Customer Name and Phone.');
      return null;
    }

    // Resolve customer ID
    let targetCustomerId = selectedCustomerId;
    if (!targetCustomerId) {
      // Find or create customer
      const existing = customers.find(c => c.phone && c.phone.replace(/\D/g, '') === customerPhone.replace(/\D/g, ''));
      if (existing) {
        targetCustomerId = existing.id;
      } else {
        const newCust = customerService.createCustomer(studioId, {
          name: customerName.trim(),
          phone: customerPhone.trim(),
          email: customerEmail.trim() || undefined,
          city: customerCity.trim() || undefined,
          source: 'Quotation Proposal'
        });
        targetCustomerId = newCust.id;
      }
    }

    const today = new Date();
    const expiry = new Date();
    expiry.setDate(today.getDate() + validityDays);

    const quotation = quotationService.createQuotation(
      studioId,
      {
        customerId: targetCustomerId,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim() || undefined,
        eventName: eventName.trim() || 'Photography Proposal',
        eventCategory: category,
        eventDate: eventDate || undefined,
        venue: venue.trim() || undefined,
        quotationDate: today.toISOString().split('T')[0],
        validUntil: expiry.toISOString().split('T')[0],
        items,
        subtotal,
        discount,
        taxRate: applyGst ? 18 : 0,
        taxAmount,
        grandTotal,
        advanceAmount,
        paymentTerms,
        status: status as any
      },
      'Studio Owner'
    );

    setSavedQuotationId(quotation.id);
    return quotation;
  };

  const handlePreviewPdf = () => {
    let quote = savedQuotationId ? quotationService.getQuotation(studioId, savedQuotationId) : null;
    if (!quote) {
      quote = handleSaveQuotation('Draft');
    }
    if (quote) {
      const payload = pdfGeneratorService.createQuotationPayload(quote);
      openPdfViewer(payload);
    }
  };

  const handleDownloadPdf = () => {
    let quote = savedQuotationId ? quotationService.getQuotation(studioId, savedQuotationId) : null;
    if (!quote) {
      quote = handleSaveQuotation('Draft');
    }
    if (quote) {
      const payload = pdfGeneratorService.createQuotationPayload(quote);
      pdfGeneratorService.printDocument(payload);
    }
  };

  const handleShareWhatsApp = () => {
    let quote = savedQuotationId ? quotationService.getQuotation(studioId, savedQuotationId) : null;
    if (!quote) {
      quote = handleSaveQuotation('Sent');
    }
    if (quote) {
      const text = encodeURIComponent(
        `Hello ${quote.customerName},\n\nThank you for considering ${currentStudio.name}! Here is your photography quotation:\n\n*Package:* ${quote.eventName}\n*Total Investment:* ₹${quote.grandTotal.toLocaleString('en-IN')}\n*Advance Required:* ₹${quote.advanceAmount.toLocaleString('en-IN')}\n*Validity:* Valid for ${validityDays} days\n\nPlease let us know if you would like to proceed with the booking!`
      );
      const cleanPhone = (quote.customerPhone || customerPhone).replace(/\D/g, '');
      window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
    }
  };

  const handleConvertToBooking = () => {
    let quote = savedQuotationId ? quotationService.getQuotation(studioId, savedQuotationId) : null;
    if (!quote) {
      quote = handleSaveQuotation('Sent');
    }
    if (quote) {
      try {
        const res = bookingService.convertQuotationToBooking(studioId, quote.id, advanceAmount, 'UPI');
        setSelectedEventId(res.event.id);
        setActiveTab('events');
      } catch (err: any) {
        alert(`Failed to convert quotation: ${err.message || 'Unknown error'}`);
      }
    }
  };

  return (
    <div className="w-full space-y-4 sm:space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight flex items-center gap-2 font-display">
            <FileText className="w-6 h-6 text-indigo-600" />
            Create Quotation & Proposal
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Build professional photography price quotes with automatic PDF generation, line-item pricing, and one-click booking conversion.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('create-booking')}
            className="px-3 py-1.5 text-xs font-bold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors cursor-pointer"
          >
            Switch to Direct Booking
          </button>
        </div>
      </div>

      {/* Package Presets Bar */}
      <div className="p-4 bg-white rounded-2xl border border-zinc-200 shadow-xs space-y-2">
        <label className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          Load Photography Package Template (Optional)
        </label>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {DEFAULT_10_PHOTOGRAPHY_PACKAGES.slice(0, 6).map(pkg => (
            <button
              key={pkg.id}
              type="button"
              onClick={() => handleApplyPackagePreset(pkg.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                selectedPackageId === pkg.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-zinc-50 text-zinc-700 hover:bg-zinc-100 border border-zinc-200'
              }`}
            >
              {pkg.name} (₹{pkg.suggestedPrice.toLocaleString('en-IN')})
            </button>
          ))}
        </div>
      </div>

      {/* Customer Information */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs space-y-4">
        <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-900 flex items-center gap-2">
          <User className="w-4 h-4 text-indigo-600" />
          1. Prospective Client Details
        </h3>

        {/* CRM Search */}
        <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/80 space-y-1.5">
          <label className="text-xs font-semibold text-zinc-700 flex items-center gap-1">
            <Search className="w-3.5 h-3.5 text-zinc-400" />
            Lookup Existing Client in CRM
          </label>
          <input
            type="text"
            value={customerSearch}
            onChange={e => setCustomerSearch(e.target.value)}
            placeholder="Search CRM by phone number or name..."
            className="w-full text-xs p-2 bg-white border border-zinc-200 rounded-lg"
          />
          {matchingCustomers.length > 0 && (
            <div className="bg-white rounded-lg border border-zinc-200 divide-y divide-zinc-100 shadow-xs">
              {matchingCustomers.map(mc => (
                <button
                  key={mc.id}
                  type="button"
                  onClick={() => selectExistingCustomer(mc)}
                  className="w-full text-left p-2.5 hover:bg-zinc-50 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-zinc-900">{mc.name}</span>
                    <span className="text-zinc-500 font-mono ml-2">{mc.phone}</span>
                  </div>
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                    Select
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-bold text-zinc-700 block mb-1">Customer Name *</label>
            <input
              type="text"
              required
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              placeholder="e.g., Ananya Patel"
              className="w-full text-xs p-2.5 border border-zinc-200 rounded-xl"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-700 block mb-1">Mobile Number *</label>
            <input
              type="tel"
              required
              value={customerPhone}
              onChange={e => setCustomerPhone(e.target.value)}
              placeholder="e.g., 9825012345"
              className="w-full text-xs p-2.5 border border-zinc-200 rounded-xl font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-700 block mb-1">Email Address</label>
            <input
              type="email"
              value={customerEmail}
              onChange={e => setCustomerEmail(e.target.value)}
              placeholder="ananya@example.com"
              className="w-full text-xs p-2.5 border border-zinc-200 rounded-xl"
            />
          </div>
        </div>
      </div>

      {/* Event Details */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs space-y-4">
        <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-900 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-600" />
          2. Event Details & Proposed Date
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-zinc-700 block mb-1">Event / Package Title</label>
            <input
              type="text"
              value={eventName}
              onChange={e => setEventName(e.target.value)}
              placeholder="e.g., Ananya & Siddharth Wedding"
              className="w-full text-xs p-2.5 border border-zinc-200 rounded-xl"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-700 block mb-1">Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full text-xs p-2.5 border border-zinc-200 rounded-xl bg-white"
            >
              <option value="Wedding">Wedding</option>
              <option value="Pre-Wedding">Pre-Wedding</option>
              <option value="Engagement">Engagement</option>
              <option value="Birthday">Birthday</option>
              <option value="Corporate">Corporate</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-700 block mb-1">Tentative Date</label>
            <input
              type="date"
              value={eventDate}
              onChange={e => setEventDate(e.target.value)}
              className="w-full text-xs p-2.5 border border-zinc-200 rounded-xl"
            />
          </div>
        </div>
      </div>

      {/* Line Items Breakdown */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            3. Scope of Work & Deliverables Breakdown
          </h3>

          <button
            type="button"
            onClick={handleAddItem}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Custom Item
          </button>
        </div>

        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={item.id} className="p-3 rounded-xl border border-zinc-200 bg-zinc-50/50 flex flex-col sm:flex-row items-center gap-3">
              <div className="flex-1 w-full">
                <input
                  type="text"
                  value={item.description}
                  onChange={e => {
                    const val = e.target.value;
                    setItems(prev => prev.map(i => i.id === item.id ? { ...i, description: val } : i));
                  }}
                  className="w-full text-xs p-2 bg-white border border-zinc-200 rounded-lg"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-zinc-400">Qty:</span>
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={e => {
                      const val = parseInt(e.target.value) || 1;
                      setItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: val } : i));
                    }}
                    className="w-14 text-center text-xs p-2 bg-white border border-zinc-200 rounded-lg"
                  />
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-xs text-zinc-400">Rate: ₹</span>
                  <input
                    type="number"
                    value={item.unitPrice}
                    onChange={e => {
                      const val = parseInt(e.target.value) || 0;
                      setItems(prev => prev.map(i => i.id === item.id ? { ...i, unitPrice: val } : i));
                    }}
                    className="w-24 text-right text-xs p-2 bg-white border border-zinc-200 rounded-lg font-bold"
                  />
                </div>

                <div className="text-xs font-black text-zinc-900 w-24 text-right">
                  ₹{(item.quantity * item.unitPrice).toLocaleString('en-IN')}
                </div>

                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    className="p-1.5 text-rose-500 hover:text-rose-700 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing & Terms */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs space-y-4">
        <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-900">
          4. Quotation Investment, Discounts & Terms
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-bold text-zinc-700 block mb-1">Discount Amount (₹)</label>
            <input
              type="number"
              value={discount}
              onChange={e => setDiscount(parseInt(e.target.value) || 0)}
              className="w-full text-xs p-2.5 border border-zinc-200 rounded-xl text-rose-600 font-bold"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-700 block mb-1">Validity (Days)</label>
            <select
              value={validityDays}
              onChange={e => setValidityDays(parseInt(e.target.value) || 30)}
              className="w-full text-xs p-2.5 border border-zinc-200 rounded-xl bg-white font-semibold"
            >
              <option value={15}>15 Days</option>
              <option value={30}>30 Days</option>
              <option value={45}>45 Days</option>
              <option value={60}>60 Days</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-700 block mb-1">GST Tax</label>
            <div className="pt-2">
              <label className="flex items-center gap-2 text-xs font-bold text-zinc-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyGst}
                  onChange={e => setApplyGst(e.target.checked)}
                  className="rounded"
                />
                <span>Include 18% GST (₹{taxAmount.toLocaleString('en-IN')})</span>
              </label>
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-zinc-700 block mb-1">Payment Terms</label>
          <input
            type="text"
            value={paymentTerms}
            onChange={e => setPaymentTerms(e.target.value)}
            className="w-full text-xs p-2.5 border border-zinc-200 rounded-xl"
          />
        </div>

        {/* Investment summary card */}
        <div className="p-4 rounded-xl bg-zinc-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs text-zinc-400">Total Investment (Subtotal - Discount + GST)</div>
            <div className="text-2xl font-black tracking-tight text-white mt-0.5">
              ₹{grandTotal.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="text-right text-xs">
            <span className="text-amber-400 font-bold">50% Advance Required:</span>
            <span className="text-white font-black text-sm ml-1.5">₹{advanceAmount.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* Action CTA Bar */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => handleSaveQuotation('Draft')}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-100 text-xs font-bold transition-colors cursor-pointer"
        >
          Save as Draft
        </button>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap justify-end">
          <button
            type="button"
            onClick={handlePreviewPdf}
            className="px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-800 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Eye className="w-3.5 h-3.5 text-zinc-500" />
            Preview PDF
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            className="px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-800 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-zinc-500" />
            Download PDF
          </button>

          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share WhatsApp
          </button>

          <button
            type="button"
            onClick={handleConvertToBooking}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Convert to Booking
          </button>
        </div>
      </div>
    </div>
  );
};