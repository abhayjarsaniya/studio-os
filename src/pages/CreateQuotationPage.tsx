import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useStudio } from '../context/StudioContext';
import { quotationService } from '../services/quotationService';
import { studioServiceCatalogService, StudioServiceItem } from '../services/studioServiceCatalogService';
import { whatsappService } from '../services/whatsappService';
import { customerService } from '../services/customerService';
import { pdfGeneratorService } from '../services/pdfGeneratorService';
import { Quotation, QuotationStatus } from '../types/schema';
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
  ArrowLeft,
  ShieldCheck,
  Check,
  MapPin,
  Phone,
  Mail,
  Clock,
  Building2,
  DollarSign,
  AlertCircle,
  Copy,
  ExternalLink,
  Edit3
} from 'lucide-react';

interface SelectedServiceLine {
  id: string;
  serviceId?: string;
  title: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
}

export const CreateQuotationPage: React.FC = () => {
  const { customers, setActiveTab, openPdfViewer, editingQuotation, setEditingQuotation, createQuotation, updateQuotation } = useApp();
  const { currentStudio, refreshStudioData } = useStudio();
  const studioId = currentStudio.id || 'studio_royal_001';

  // Step state: 1 = Customer Details, 2 = Select Services, 3 = Quotation Details & Live Preview
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [quotationStatus, setQuotationStatus] = useState<QuotationStatus>('Saved');

  // ----------------------------------------------------
  // STEP 1: Customer Details
  // ----------------------------------------------------
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [eventName, setEventName] = useState('');
  const [eventCategory, setEventCategory] = useState('Wedding');
  const [eventDate, setEventDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [eventLocation, setEventLocation] = useState('');
  const [inquiryNotes, setInquiryNotes] = useState('');

  // ----------------------------------------------------
  // STEP 2: Service Selection & Line Items
  // ----------------------------------------------------
  const [catalogServices, setCatalogServices] = useState<StudioServiceItem[]>([]);
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');
  const [selectedLines, setSelectedLines] = useState<SelectedServiceLine[]>([]);
  const [customServiceName, setCustomServiceName] = useState('');
  const [customServicePrice, setCustomServicePrice] = useState<number>(0);
  const [saveCustomToCatalog, setSaveCustomToCatalog] = useState<boolean>(true);
  const [isAddingCustomService, setIsAddingCustomService] = useState(false);

  // Financial adjustments
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [applyGst, setApplyGst] = useState<boolean>(true);
  const [advancePercent, setAdvancePercent] = useState<number>(50);
  const [validityDays, setValidityDays] = useState<number>(15);
  const [paymentTerms, setPaymentTerms] = useState(
    '50% Advance booking token, 40% on event date, 10% upon final delivery of albums & video.'
  );
  const [specialTerms, setSpecialTerms] = useState(
    'Deliverables will be handed over within 30-45 business days following client selection. Raw media backed up for 90 days.'
  );

  // ----------------------------------------------------
  // STEP 3: Saved State & Actions
  // ----------------------------------------------------
  const [savedQuotation, setSavedQuotation] = useState<Quotation | null>(null);
  const [whatsappCopied, setWhatsappCopied] = useState(false);
  const [conversionSuccessMessage, setConversionSuccessMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load existing quotation when navigating to edit
  useEffect(() => {
    if (editingQuotation) {
      setSavedQuotation(editingQuotation);
      setSelectedCustomerId(editingQuotation.customerId || null);
      setCustomerName(editingQuotation.customerName || '');
      setCustomerPhone(editingQuotation.customerPhone || '');
      setCustomerEmail(editingQuotation.customerEmail || '');
      setCustomerCity((editingQuotation as any).customerCity || editingQuotation.venue || '');
      setEventName(editingQuotation.eventName || '');
      setEventCategory(editingQuotation.eventCategory || 'Wedding');
      if (editingQuotation.eventDate) setEventDate(editingQuotation.eventDate);
      setEventLocation(editingQuotation.eventVenue || editingQuotation.venue || '');
      setInquiryNotes(editingQuotation.notes || '');
      if (editingQuotation.items && editingQuotation.items.length > 0) {
        setSelectedLines(editingQuotation.items.map((item, idx) => ({
          id: item.id || `line_${Date.now()}_${idx}`,
          title: item.title || item.description,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount || 0
        })));
      }
      setDiscountAmount(editingQuotation.discount || (editingQuotation as any).discountAmount || 0);
      setApplyGst(Boolean(editingQuotation.taxAmount && editingQuotation.taxAmount > 0));
      if (editingQuotation.paymentTerms) setPaymentTerms(editingQuotation.paymentTerms);
      setQuotationStatus(editingQuotation.status || 'Saved');
      setCurrentStep(3); // Direct jump to Review & Save
    }
  }, [editingQuotation]);

  // Load Studio Services Catalog cleanly (starts empty for new studios; syncs in real time)
  useEffect(() => {
    const reload = () => {
      const services = studioServiceCatalogService.listServices(studioId);
      setCatalogServices(services);
    };
    reload();
    window.addEventListener('studio_data_updated', reload);
    return () => window.removeEventListener('studio_data_updated', reload);
  }, [studioId]);

  // Filter matching existing customers
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

  // Toggle service selection from checklist
  const handleToggleService = (service: StudioServiceItem) => {
    const existingIndex = selectedLines.findIndex(l => l.serviceId === service.id);
    if (existingIndex > -1) {
      // Remove service
      setSelectedLines(prev => prev.filter(l => l.serviceId !== service.id));
    } else {
      // Add service
      setSelectedLines(prev => [
        ...prev,
        {
          id: `sel_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
          serviceId: service.id,
          title: service.name,
          description: service.description || service.name,
          quantity: 1,
          unitPrice: service.defaultPrice,
          discount: 0
        }
      ]);
    }
  };

  // Add custom service on the fly (optionally saves directly to Studio Services Catalog in Firebase)
  const handleAddCustomService = () => {
    if (!customServiceName.trim()) return;
    const priceNum = Number(customServicePrice) || 0;
    let serviceId: string | undefined;

    if (saveCustomToCatalog) {
      const createdSvc = studioServiceCatalogService.createService(
        studioId,
        {
          name: customServiceName.trim(),
          category: eventCategory || 'Custom',
          defaultPrice: priceNum,
          unit: 'Event'
        },
        'Studio Owner'
      );
      serviceId = createdSvc.id;
      setCatalogServices(studioServiceCatalogService.listServices(studioId));
    }

    const newLine: SelectedServiceLine = {
      id: `custom_${Date.now()}`,
      serviceId,
      title: customServiceName.trim(),
      description: customServiceName.trim(),
      quantity: 1,
      unitPrice: priceNum,
      discount: 0
    };
    setSelectedLines(prev => [...prev, newLine]);
    setCustomServiceName('');
    setCustomServicePrice(0);
    setIsAddingCustomService(false);
  };

  const handleRemoveLine = (id: string) => {
    setSelectedLines(prev => prev.filter(l => l.id !== id));
  };

  const handleUpdateLine = (id: string, updates: Partial<SelectedServiceLine>) => {
    setSelectedLines(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  // Financial Computations
  const subtotal = selectedLines.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const effectiveDiscount = Math.min(discountAmount, subtotal);
  const taxableAmount = Math.max(0, subtotal - effectiveDiscount);
  const taxRate = applyGst ? 18 : 0;
  const taxAmount = applyGst ? Math.round(taxableAmount * 0.18) : 0;
  const grandTotal = taxableAmount + taxAmount;
  const advanceAmount = Math.round(grandTotal * (advancePercent / 100));
  const remainingBalance = Math.max(0, grandTotal - advanceAmount);

  // Search filter for catalog services
  const filteredCatalogServices = useMemo(() => {
    if (!serviceSearchQuery.trim()) return catalogServices;
    const q = serviceSearchQuery.toLowerCase();
    return catalogServices.filter(s => 
      s.name.toLowerCase().includes(q) || 
      s.category.toLowerCase().includes(q) ||
      (s.description && s.description.toLowerCase().includes(q))
    );
  }, [catalogServices, serviceSearchQuery]);

  // Validation
  const validateStep1 = () => {
    if (!customerName.trim()) {
      alert('Please enter Customer Name.');
      return false;
    }
    if (!customerPhone.trim()) {
      alert('Please enter Mobile / WhatsApp number.');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (selectedLines.length === 0) {
      alert('Please select at least one service for the quotation.');
      return false;
    }
    return true;
  };

  // Save or Update Quotation
  const handleSaveQuotation = (targetStatus: QuotationStatus = 'Saved'): Quotation | null => {
    if (!validateStep1() || !validateStep2()) return null;

    setIsSaving(true);
    try {
      // 1. Resolve or create customer in studio directory
      let targetCustId = selectedCustomerId;
      if (!targetCustId) {
        const existing = customers.find(c => c.phone && c.phone.replace(/\D/g, '') === customerPhone.replace(/\D/g, ''));
        if (existing) {
          targetCustId = existing.id;
        } else {
          const newCust = customerService.createCustomer(studioId, {
            name: customerName.trim(),
            phone: customerPhone.trim(),
            email: customerEmail.trim() || undefined,
            city: customerCity.trim() || undefined,
            source: 'Quick Quotation Engine'
          });
          targetCustId = newCust.id;
        }
      }

      const today = new Date().toISOString().split('T')[0];
      const expiry = new Date(Date.now() + validityDays * 86400000).toISOString().split('T')[0];

      const quotationItems = selectedLines.map((line, idx) => ({
        id: line.id || `item_${idx + 1}`,
        title: line.title,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discount: line.discount || 0,
        taxRate,
        taxAmount: applyGst ? Math.round(line.quantity * line.unitPrice * 0.18) : 0,
        amount: (line.quantity * line.unitPrice) - (line.discount || 0),
        totalPrice: (line.quantity * line.unitPrice) - (line.discount || 0)
      }));

      let quote: Quotation;
      if (savedQuotation) {
        // Update existing quotation - no duplicate creation!
        quote = updateQuotation(savedQuotation.id, {
          customerId: targetCustId,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerEmail: customerEmail.trim() || undefined,
          eventName: eventName.trim(),
          eventCategory,
          eventDate,
          eventVenue: eventLocation.trim(),
          venue: eventLocation.trim(),
          items: quotationItems as any,
          subtotal,
          discount: effectiveDiscount,
          taxRate,
          taxAmount,
          grandTotal,
          advanceAmount,
          paymentTerms,
          notes: inquiryNotes.trim() || specialTerms.trim(),
          status: targetStatus
        });
      } else {
        // Create brand new sequential quotation
        quote = createQuotation({
          customerId: targetCustId,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerEmail: customerEmail.trim() || undefined,
          eventName: eventName.trim(),
          eventCategory,
          eventDate,
          eventVenue: eventLocation.trim(),
          venue: eventLocation.trim(),
          quotationDate: today,
          expiryDate: expiry,
          validUntil: expiry,
          items: quotationItems as any,
          subtotal,
          discount: effectiveDiscount,
          taxRate,
          taxAmount,
          grandTotal,
          advanceAmount,
          paymentTerms,
          notes: inquiryNotes.trim() || specialTerms.trim(),
          status: targetStatus
        });
      }

      setSavedQuotation(quote);
      setQuotationStatus(targetStatus);
      refreshStudioData?.();
      window.dispatchEvent(new Event('studio_data_updated'));
      return quote;
    } catch (e: any) {
      alert('Error saving quotation: ' + (e.message || 'Unknown error'));
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  // Actions
  const handlePreview = () => {
    const quote = savedQuotation || handleSaveQuotation('Saved');
    if (quote) {
      const payload = pdfGeneratorService.createQuotationPayload(quote, {
        name: currentStudio.name,
        logoUrl: currentStudio.logoUrl,
        address: currentStudio.address,
        city: currentStudio.city,
        state: (currentStudio as any).state || 'Gujarat',
        pincode: (currentStudio as any).pincode,
        gstin: currentStudio.gstNumber,
        supportPhone: currentStudio.phone,
        supportEmail: currentStudio.email
      });
      openPdfViewer(payload);
    }
  };

  const handleDownloadPDF = () => {
    const quote = savedQuotation || handleSaveQuotation('Saved');
    if (quote) {
      const payload = pdfGeneratorService.createQuotationPayload(quote, {
        name: currentStudio.name,
        logoUrl: currentStudio.logoUrl,
        address: currentStudio.address,
        city: currentStudio.city,
        state: (currentStudio as any).state || 'Gujarat',
        pincode: (currentStudio as any).pincode,
        gstin: currentStudio.gstNumber,
        supportPhone: currentStudio.phone,
        supportEmail: currentStudio.email
      });
      pdfGeneratorService.downloadDocumentPDF(payload);
    }
  };

  const handleShareWhatsApp = () => {
    if ((currentStudio?.settings as any)?.allowDirectWhatsApp === false) {
      alert('WhatsApp Click-to-Chat has been administratively disabled for this studio by Platform Master Admin.');
      return;
    }

    const quote = savedQuotation || handleSaveQuotation('Sent');
    if (!quote) return;

    // Generate public link
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
    const publicUrl = `${origin}${pathname}#/quote/${quote.id}`;

    // Get default template or build message with dynamic variables
    const defaultTemplate = whatsappService.getDefaultQuotationTemplate(studioId);
    const templateText = defaultTemplate?.body || 
      'Dear {customer_name}, greetings from *{studio_name}*! 📸✨ We are delighted to share our custom quotation for your *{event_name}* on *{event_date}* at {event_location}.\n\nTotal Investment: *₹{total_amount}*\n\nPlease review your complete quotation and package inclusions here: {quotation_link}\n\nWarm regards,\n*{studio_name}*';

    const rendered = whatsappService.replacePlaceholders(templateText, {
      customer_name: quote.customerName,
      studio_name: currentStudio.name || 'Studio OS',
      event_name: quote.eventName || quote.eventCategory,
      event_date: quote.eventDate || 'Scheduled Date',
      event_location: quote.eventVenue || quote.venue || 'Venue',
      total_amount: quote.grandTotal.toLocaleString('en-IN'),
      quotation_link: publicUrl
    });

    const clickToChat = whatsappService.generateClickToChatUrl(quote.customerPhone || customerPhone, rendered.message);
    if (!clickToChat.isValid) {
      alert(clickToChat.error || 'Please verify the customer phone number.');
      return;
    }

    // Open WhatsApp Click-to-Chat in new tab for manual dispatch
    window.open(clickToChat.url, '_blank', 'noopener,noreferrer');
  };

  const handleConvertToBooking = () => {
    const quote = savedQuotation || handleSaveQuotation('Draft');
    if (!quote) return;

    try {
      const result = quotationService.convertQuotationToBooking(studioId, quote.id, {
        eventName: quote.eventName,
        eventDate: quote.eventDate,
        venue: quote.eventVenue,
        operatorId: 'Studio Owner'
      });

      setSavedQuotation(result.quotation);
      setConversionSuccessMessage(`Successfully converted quotation ${quote.quotationNumber} into Event "${result.event.name}" and generated Tax Invoice!`);
      refreshStudioData?.();
      window.dispatchEvent(new Event('studio_data_updated'));
    } catch (e: any) {
      alert(e.message || 'Error converting quotation.');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24 font-sans">
      
      {/* Page Title & Navigation Stepper */}
      <div className="bg-white border border-zinc-200 rounded-3xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                Quick Quotation Engine
              </span>
              <span className="text-xs text-zinc-500 font-medium">Studio: {currentStudio.name}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 font-display mt-1">
              Create New Quotation
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              Rapid 3-step quotation builder with real-time preview, WhatsApp sharing & 1-click booking conversion.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('quotations')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold transition-all cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All Quotations</span>
            </button>

            {savedQuotation && (
              <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{savedQuotation.quotationNumber}</span>
              </span>
            )}
          </div>
        </div>

        {/* Stepper Tabs */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-5">
          <button
            onClick={() => setCurrentStep(1)}
            className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-all cursor-pointer ${
              currentStep === 1 
                ? 'bg-zinc-900 border-zinc-900 text-white shadow-xs' 
                : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-700'
            }`}
          >
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold ${
              currentStep === 1 ? 'bg-amber-400 text-zinc-900' : 'bg-zinc-200 text-zinc-700'
            }`}>
              1
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold truncate">Step 1</p>
              <p className={`text-xs truncate ${currentStep === 1 ? 'text-zinc-300' : 'text-zinc-500'}`}>Customer Details</p>
            </div>
          </button>

          <button
            onClick={() => {
              if (validateStep1()) setCurrentStep(2);
            }}
            className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-all cursor-pointer ${
              currentStep === 2 
                ? 'bg-zinc-900 border-zinc-900 text-white shadow-xs' 
                : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-700'
            }`}
          >
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold ${
              currentStep === 2 ? 'bg-amber-400 text-zinc-900' : 'bg-zinc-200 text-zinc-700'
            }`}>
              2
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold truncate">Step 2</p>
              <p className={`text-xs truncate ${currentStep === 2 ? 'text-zinc-300' : 'text-zinc-500'}`}>Select Services</p>
            </div>
          </button>

          <button
            onClick={() => {
              if (validateStep1() && validateStep2()) setCurrentStep(3);
            }}
            className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-all cursor-pointer ${
              currentStep === 3 
                ? 'bg-zinc-900 border-zinc-900 text-white shadow-xs' 
                : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-700'
            }`}
          >
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold ${
              currentStep === 3 ? 'bg-amber-400 text-zinc-900' : 'bg-zinc-200 text-zinc-700'
            }`}>
              3
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold truncate">Step 3</p>
              <p className={`text-xs truncate ${currentStep === 3 ? 'text-zinc-300' : 'text-zinc-500'}`}>Preview & Share</p>
            </div>
          </button>
        </div>
      </div>

      {conversionSuccessMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3 text-emerald-800 text-xs font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{conversionSuccessMessage}</span>
          </div>
          <button
            onClick={() => setActiveTab('bookings')}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer shrink-0"
          >
            View Bookings
          </button>
        </div>
      )}

      {/* ==================================================== */}
      {/* STEP 1: CUSTOMER & EVENT DETAILS */}
      {/* ==================================================== */}
      {currentStep === 1 && (
        <div className="bg-white border border-zinc-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-zinc-100">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-xs">
              01
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 font-display">Customer & Event Information</h2>
              <p className="text-xs text-zinc-500">Select an existing customer or enter new client details instantly.</p>
            </div>
          </div>

          {/* Quick Search Existing Customer */}
          <div className="relative">
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-1.5">
              Quick Customer Search (Optional)
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="Search by customer name or phone..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-300 text-xs focus:ring-2 focus:ring-zinc-900 focus:outline-none"
              />
            </div>

            {matchingCustomers.length > 0 && (
              <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-2xl shadow-xl overflow-hidden divide-y divide-zinc-100">
                {matchingCustomers.map((cust) => (
                  <button
                    key={cust.id}
                    type="button"
                    onClick={() => selectExistingCustomer(cust)}
                    className="w-full p-3 text-left hover:bg-amber-50/60 transition-colors flex items-center justify-between text-xs cursor-pointer"
                  >
                    <div>
                      <p className="font-bold text-zinc-900">{cust.name}</p>
                      <p className="text-xs text-zinc-500">{cust.phone} • {cust.city || 'No city'}</p>
                    </div>
                    <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                      Select
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                Customer Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Rahul Sharma"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-xs focus:ring-2 focus:ring-zinc-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                Mobile / WhatsApp Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                required
                placeholder="e.g. +91 98201 12233"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-xs focus:ring-2 focus:ring-zinc-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                Customer Email (Optional)
              </label>
              <input
                type="email"
                placeholder="client@example.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-xs focus:ring-2 focus:ring-zinc-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                City / Location
              </label>
              <input
                type="text"
                placeholder="e.g. Ahmedabad, Gujarat"
                value={customerCity}
                onChange={(e) => setCustomerCity(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-xs focus:ring-2 focus:ring-zinc-900 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                Event Name
              </label>
              <input
                type="text"
                placeholder="e.g. Sharma Wedding & Reception"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-xs focus:ring-2 focus:ring-zinc-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                Event Category
              </label>
              <select
                value={eventCategory}
                onChange={(e) => setEventCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-xs focus:ring-2 focus:ring-zinc-900 focus:outline-none bg-white"
              >
                <option value="Wedding">Wedding</option>
                <option value="Pre-Wedding">Pre-Wedding</option>
                <option value="Engagement">Engagement</option>
                <option value="Haldi">Haldi</option>
                <option value="Mehndi">Mehndi</option>
                <option value="Reception">Reception</option>
                <option value="Birthday">Birthday</option>
                <option value="Corporate">Corporate</option>
                <option value="Maternity">Maternity</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                Event Date
              </label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-xs focus:ring-2 focus:ring-zinc-900 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
              Event Location / Venue
            </label>
            <input
              type="text"
              placeholder="e.g. Royal Orchid Lawn, S.G. Highway, Ahmedabad"
              value={eventLocation}
              onChange={(e) => setEventLocation(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-xs focus:ring-2 focus:ring-zinc-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
              Optional Inquiry Notes / Client Preferences
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Client requested 2 candid photographers + drone for the Baraat entry."
              value={inquiryNotes}
              onChange={(e) => setInquiryNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-xs focus:ring-2 focus:ring-zinc-900 focus:outline-none"
            />
          </div>

          {/* Step 1 Footer */}
          <div className="pt-4 border-t border-zinc-100 flex justify-end">
            <button
              type="button"
              onClick={() => {
                if (validateStep1()) setCurrentStep(2);
              }}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <span>Continue to Select Services</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* STEP 2: SELECT SERVICES CHECKLIST & PRICING */}
      {/* ==================================================== */}
      {currentStep === 2 && (
        <div className="bg-white border border-zinc-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-xs">
                02
              </div>
              <div>
                <h2 className="text-base font-bold text-zinc-900 font-display">Configure Studio Services</h2>
                <p className="text-xs text-zinc-500">Pick from studio catalog or add bespoke line items on the fly.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsAddingCustomService(!isAddingCustomService)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold transition-all cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Custom Service</span>
            </button>
          </div>

          {/* Custom Service Drawer */}
          {isAddingCustomService && (
            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3">
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wider block">
                Add Bespoke Service Line
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    placeholder="Service Name (e.g. LED Wall Live Screening)"
                    value={customServiceName}
                    onChange={(e) => setCustomServiceName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-amber-300 text-xs focus:ring-2 focus:ring-zinc-900 focus:outline-none bg-white"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    placeholder="Price (₹)"
                    value={customServicePrice}
                    onChange={(e) => setCustomServicePrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl border border-amber-300 text-xs focus:ring-2 focus:ring-zinc-900 focus:outline-none bg-white font-mono"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                <label className="inline-flex items-center gap-2 text-xs text-zinc-700 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveCustomToCatalog}
                    onChange={(e) => setSaveCustomToCatalog(e.target.checked)}
                    className="w-4 h-4 accent-zinc-900 rounded"
                  />
                  <span>Also save to my Studio Services Catalog for future quotes</span>
                </label>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingCustomService(false)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-200/50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddCustomService}
                    className="px-4 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    Add to Quotation
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Search Studio Service Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-600">
                Studio Service Checklist ({catalogServices.length} configured)
              </label>
              <div className="relative w-48 sm:w-64">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter services..."
                  value={serviceSearchQuery}
                  onChange={(e) => setServiceSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-zinc-200 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>
            </div>

            {catalogServices.length === 0 ? (
              <div className="p-6 text-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/70 space-y-2.5">
                <Layers className="w-7 h-7 text-zinc-300 mx-auto" />
                <p className="text-xs sm:text-sm font-bold text-zinc-700">No services configured in your studio catalog yet</p>
                <p className="text-xs text-zinc-500 max-w-md mx-auto">
                  Add services directly right here or configure your full catalog in Studio Settings.
                </p>
                <button
                  type="button"
                  onClick={() => setIsAddingCustomService(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-400" />
                  <span>+ Add Your First Service</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto p-1 border border-zinc-200 rounded-2xl bg-zinc-50/50">
                {filteredCatalogServices.map((service) => {
                  const isSelected = selectedLines.some(l => l.serviceId === service.id);
                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => handleToggleService(service)}
                      className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 cursor-pointer ${
                        isSelected
                          ? 'bg-amber-50/80 border-amber-300 text-zinc-900 shadow-xs'
                          : 'bg-white hover:bg-zinc-100 border-zinc-200 text-zinc-700'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-md border mt-0.5 flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-zinc-900 border-zinc-900 text-white' : 'border-zinc-300 bg-white'
                      }`}>
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold truncate">{service.name}</p>
                        <p className="text-xs text-zinc-500 font-mono mt-0.5">₹{service.defaultPrice.toLocaleString('en-IN')}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active Quotation Items Table (Editable Qty & Price) */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                Selected Proposal Items ({selectedLines.length})
              </span>
              <span className="text-xs text-zinc-500">Edit quantities and rates directly</span>
            </div>

            <div className="border border-zinc-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Service</th>
                    <th className="py-2.5 px-3 w-20 text-center">Qty</th>
                    <th className="py-2.5 px-3 w-32 text-right">Unit Rate (₹)</th>
                    <th className="py-2.5 px-3 w-32 text-right">Total (₹)</th>
                    <th className="py-2.5 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {selectedLines.map((line) => {
                    const lineTotal = line.quantity * line.unitPrice;
                    return (
                      <tr key={line.id} className="hover:bg-zinc-50/60">
                        <td className="py-3 px-3">
                          <input
                            type="text"
                            value={line.title}
                            onChange={(e) => handleUpdateLine(line.id, { title: e.target.value })}
                            className="w-full font-bold text-zinc-900 bg-transparent border-b border-transparent hover:border-zinc-300 focus:border-zinc-900 focus:outline-none"
                          />
                          <input
                            type="text"
                            value={line.description}
                            onChange={(e) => handleUpdateLine(line.id, { description: e.target.value })}
                            className="w-full text-xs text-zinc-500 bg-transparent border-b border-transparent hover:border-zinc-300 focus:border-zinc-900 focus:outline-none mt-0.5"
                            placeholder="Deliverable details..."
                          />
                        </td>
                        <td className="py-3 px-3 text-center">
                          <input
                            type="number"
                            min="1"
                            value={line.quantity}
                            onChange={(e) => handleUpdateLine(line.id, { quantity: Math.max(1, Number(e.target.value)) })}
                            className="w-14 text-center py-1 rounded-lg border border-zinc-200 font-mono text-xs focus:ring-1 focus:ring-zinc-900"
                          />
                        </td>
                        <td className="py-3 px-3 text-right">
                          <input
                            type="number"
                            value={line.unitPrice}
                            onChange={(e) => handleUpdateLine(line.id, { unitPrice: Math.max(0, Number(e.target.value)) })}
                            className="w-24 text-right py-1 px-2 rounded-lg border border-zinc-200 font-mono text-xs focus:ring-1 focus:ring-zinc-900"
                          />
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-zinc-900 font-mono">
                          ₹{lineTotal.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(line.id)}
                            className="text-zinc-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Breakdown Panel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-zinc-100">
            <div className="space-y-3 bg-zinc-50 p-4 rounded-2xl border border-zinc-200">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 block">
                Commercial Adjustments
              </span>
              
              <div className="flex items-center justify-between gap-4">
                <label className="text-xs text-zinc-600 font-medium">Lump-Sum Discount (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(Number(e.target.value))}
                  className="w-28 text-right py-1.5 px-2.5 rounded-lg border border-zinc-300 text-xs font-mono focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              <div className="flex items-center justify-between gap-4 pt-2 border-t border-zinc-200">
                <div>
                  <p className="text-xs font-semibold text-zinc-800">Apply GST (18%)</p>
                  <p className="text-xs text-zinc-500">Government Goods & Services Tax</p>
                </div>
                <input
                  type="checkbox"
                  checked={applyGst}
                  onChange={(e) => setApplyGst(e.target.checked)}
                  className="w-4 h-4 rounded text-zinc-900 focus:ring-zinc-900 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between gap-4 pt-2 border-t border-zinc-200">
                <label className="text-xs text-zinc-600 font-medium">Advance Token (%)</label>
                <input
                  type="number"
                  min="10"
                  max="100"
                  value={advancePercent}
                  onChange={(e) => setAdvancePercent(Number(e.target.value))}
                  className="w-20 text-right py-1.5 px-2.5 rounded-lg border border-zinc-300 text-xs font-mono focus:ring-1 focus:ring-zinc-900"
                />
              </div>
            </div>

            {/* Calculations Summary Card */}
            <div className="bg-zinc-900 text-white p-5 rounded-2xl space-y-2 text-xs flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400 block mb-2">
                  Financial Real-time Total
                </span>
                
                <div className="space-y-1.5 text-zinc-300">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-mono">₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  {Boolean(effectiveDiscount) && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Discount:</span>
                      <span className="font-mono">- ₹{effectiveDiscount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {applyGst && (
                    <div className="flex justify-between">
                      <span>GST (18%):</span>
                      <span className="font-mono">₹{taxAmount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-700/80">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs uppercase font-bold text-zinc-300 font-display">Grand Total:</span>
                  <span className="text-xl font-bold font-mono text-white">₹{grandTotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-xs text-zinc-400 mt-1">
                  <span>Advance ({advancePercent}%): ₹{advanceAmount.toLocaleString('en-IN')}</span>
                  <span>Balance: ₹{remainingBalance.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="pt-4 border-t border-zinc-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-zinc-700 hover:bg-zinc-100 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Customer</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (validateStep2()) setCurrentStep(3);
              }}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <span>Continue to Live Preview</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* STEP 3: QUOTATION DETAILS & REAL-TIME LIVE PREVIEW */}
      {/* ==================================================== */}
      {currentStep === 3 && (
        <div className="space-y-6">
          
          {/* Action Toolbar */}
          <div className="bg-white border border-zinc-200 rounded-3xl p-5 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-zinc-700 hover:bg-zinc-100 transition-all cursor-pointer min-h-[44px]"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Edit Services</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveQuotation('Saved')}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer min-h-[44px]"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{savedQuotation ? 'Update Quotation' : 'Save Quotation'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveQuotation('Draft')}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold transition-all cursor-pointer min-h-[44px]"
                >
                  <span>Save Draft</span>
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handlePreview}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white hover:bg-zinc-50 border border-zinc-300 text-zinc-800 text-xs font-bold transition-all shadow-xs cursor-pointer min-h-[44px]"
                >
                  <Eye className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Preview</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white hover:bg-zinc-50 border border-zinc-300 text-zinc-800 text-xs font-bold transition-all shadow-xs cursor-pointer min-h-[44px]"
                >
                  <Download className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Download PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer min-h-[44px]"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share on WhatsApp</span>
                </button>

                {savedQuotation && savedQuotation.status !== 'Converted to Booking' && (
                  <button
                    type="button"
                    onClick={handleConvertToBooking}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 text-xs font-bold transition-all shadow-xs cursor-pointer min-h-[44px]"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Convert to Booking</span>
                  </button>
                )}
              </div>
            </div>

            {savedQuotation && (
              <div className="pt-3 border-t border-zinc-100 flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-semibold text-zinc-800">
                    Saved in Studio Directory as <span className="font-mono font-bold text-zinc-950">{savedQuotation.quotationNumber}</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-md font-bold text-xs bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {savedQuotation.status}
                  </span>
                </div>
                <span className="text-zinc-400 font-mono text-xs">
                  ID: {savedQuotation.id}
                </span>
              </div>
            )}
          </div>

          {/* Real-time Quotation Document Live Preview */}
          <div className="bg-white border border-zinc-200 rounded-3xl p-6 sm:p-10 shadow-sm space-y-8">
            
            {/* Live Preview Document Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pb-6 border-b border-zinc-100">
              <div>
                {currentStudio.logoUrl ? (
                  <img 
                    src={currentStudio.logoUrl} 
                    alt={currentStudio.name} 
                    className="h-14 max-w-[200px] object-contain mb-3" 
                  />
                ) : (
                  <div className="flex items-center gap-2 text-zinc-900 font-display font-black text-xl mb-2">
                    <Building2 className="w-6 h-6 text-amber-500" />
                    <span>{currentStudio.name}</span>
                  </div>
                )}
                <h2 className="text-xl font-bold text-zinc-900 font-display">{currentStudio.name}</h2>
                <div className="mt-2 space-y-1 text-xs text-zinc-500">
                  <p className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{[currentStudio.address, currentStudio.city].filter(Boolean).join(', ') || 'Studio Location'}</span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{currentStudio.phone || 'Studio Phone'}</span>
                  </p>
                  {currentStudio.gstNumber && (
                    <p className="text-xs font-semibold text-zinc-600">GSTIN: {currentStudio.gstNumber}</p>
                  )}
                </div>
              </div>

              <div className="sm:text-right bg-zinc-50 p-4 rounded-2xl border border-zinc-100 w-full sm:w-auto sm:min-w-[220px]">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-600">Estimate Reference</span>
                <p className="text-lg font-bold text-zinc-900 font-display mt-0.5">
                  {savedQuotation ? savedQuotation.quotationNumber : 'QUO-DRAFT-NEW'}
                </p>
                <div className="mt-2 pt-2 border-t border-zinc-200 text-xs text-zinc-500 space-y-1">
                  <p>Date: {new Date().toISOString().split('T')[0]}</p>
                  <p>Validity: {validityDays} Days</p>
                </div>
              </div>
            </div>

            {/* Client & Event Meta */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-zinc-50/70 p-5 rounded-2xl border border-zinc-100">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-600 block mb-1.5">
                  Prepared For
                </span>
                <p className="text-base font-bold text-zinc-900">{customerName}</p>
                <p className="text-xs text-zinc-600 mt-1">{customerPhone}</p>
                {customerEmail && <p className="text-xs text-zinc-500">{customerEmail}</p>}
                {customerCity && <p className="text-xs text-zinc-500">{customerCity}</p>}
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-600 block mb-1.5">
                  Event & Venue
                </span>
                <p className="text-base font-bold text-zinc-900">{eventName || eventCategory}</p>
                <p className="text-xs text-zinc-600 mt-1">Date: {eventDate}</p>
                <p className="text-xs text-zinc-500">Location: {eventLocation}</p>
              </div>
            </div>

            {/* Selected Services Breakdown */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 mb-3">
                Selected Inclusions & Deliverables
              </h3>
              
              <div className="border border-zinc-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">Service Description</th>
                      <th className="py-3 px-4 text-center">Qty</th>
                      <th className="py-3 px-4 text-right">Unit Rate</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {selectedLines.map((line, idx) => (
                      <tr key={line.id}>
                        <td className="py-3.5 px-4 font-mono text-zinc-400">{idx + 1}</td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-zinc-900">{line.title}</p>
                          {line.description && line.description !== line.title && (
                            <p className="text-xs text-zinc-500 mt-0.5">{line.description}</p>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">{line.quantity}</td>
                        <td className="py-3.5 px-4 text-right font-mono text-zinc-600">₹{line.unitPrice.toLocaleString('en-IN')}</td>
                        <td className="py-3.5 px-4 text-right font-bold text-zinc-900 font-mono">
                          ₹{(line.quantity * line.unitPrice).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Terms & Totals Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-zinc-100">
              <div className="space-y-3">
                <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 block mb-1">
                    Payment Terms
                  </span>
                  <p className="text-xs text-zinc-600 leading-relaxed">{paymentTerms}</p>
                </div>

                <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 block mb-1">
                    Special Inclusions & Notes
                  </span>
                  <p className="text-xs text-zinc-600 leading-relaxed">{inquiryNotes || specialTerms}</p>
                </div>
              </div>

              <div className="bg-zinc-50 p-5 rounded-2xl border border-zinc-200/80 space-y-2.5 text-xs">
                <div className="flex justify-between text-zinc-600">
                  <span>Subtotal:</span>
                  <span className="font-mono">₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                {Boolean(effectiveDiscount) && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount:</span>
                    <span className="font-mono">- ₹{effectiveDiscount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                {applyGst && (
                  <div className="flex justify-between text-zinc-600">
                    <span>GST (18%):</span>
                    <span className="font-mono">₹{taxAmount.toLocaleString('en-IN')}</span>
                  </div>
                )}

                <div className="pt-2.5 border-t border-zinc-200 flex justify-between items-center text-sm font-bold text-zinc-900">
                  <span className="font-display">Grand Total:</span>
                  <span className="font-mono text-base text-zinc-900">₹{grandTotal.toLocaleString('en-IN')}</span>
                </div>

                <div className="pt-2 border-t border-dashed border-zinc-200 space-y-1.5 text-xs text-zinc-500">
                  <div className="flex justify-between font-semibold text-zinc-700">
                    <span>Advance Required ({advancePercent}%):</span>
                    <span className="font-mono text-emerald-700">₹{advanceAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-zinc-500">
                    <span>Balance Due:</span>
                    <span className="font-mono">₹{remainingBalance.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Document Bottom Footer */}
            <div className="pt-6 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Generated via Studio OS Quick Quotation System</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold transition-all cursor-pointer"
                >
                  Download PDF
                </button>
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  Share on WhatsApp
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
