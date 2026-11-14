import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useStudio } from '../context/StudioContext';
import { bookingProductionService } from '../services/bookingProductionService';
import { 
  BookingRecord, 
  FunctionPlan, 
  DeliverableSpecification 
} from '../types/bookingProduction';
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Clock, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  CreditCard, 
  Layers, 
  Camera, 
  Video, 
  Film, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  FileCheck, 
  Search, 
  Building2, 
  FileText,
  Printer,
  ChevronRight,
  PackageCheck,
  Tag,
  ListPlus
} from 'lucide-react';

export interface PackageLineItem {
  id: string;
  name: string;
  category: 'photography' | 'videography' | 'drone' | 'editing' | 'album' | 'equipment' | 'custom';
  description: string;
  qty: number;
  rate: number;
}

const DEFAULT_LINE_ITEMS: PackageLineItem[] = [
  { id: 'item_1', name: 'Traditional Photographer', category: 'photography', description: 'Experienced stage & family coverage', qty: 2, rate: 15000 },
  { id: 'item_2', name: 'Candid Photographer', category: 'photography', description: 'Creative portraits & emotional moments', qty: 2, rate: 25000 },
  { id: 'item_3', name: 'Cinematic Videographer', category: 'videography', description: '4K Gimbal & prime lenses coverage', qty: 2, rate: 30000 },
  { id: 'item_4', name: 'Aerial Drone Cinematographer', category: 'drone', description: '4K aerial views & grand entry shots', qty: 1, rate: 15000 }
];

const PREDEFINED_FUNCTION_TYPES = [
  'Pre-Wedding Shoot',
  'Engagement',
  'Mandvo / Pithi',
  'Haldi & Mehndi',
  'Sangeet Night',
  'Wedding Ceremony',
  'Reception Party',
  'Cocktail / After-Party'
];

export const UnifiedBookingPage: React.FC = () => {
  const { customers, setActiveTab, openPdfViewer } = useApp();
  const { currentStudio } = useStudio();
  const studioId = currentStudio.id;

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [successBookingId, setSuccessBookingId] = useState<string | null>(null);

  // Step 1: Customer Details
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerWhatsApp, setCustomerWhatsApp] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerCity, setCustomerCity] = useState(currentStudio.city.split(',')[0] || 'Mumbai');
  const [customerNotes, setCustomerNotes] = useState('');

  // Step 2: Event Details
  const [eventName, setEventName] = useState('');
  const [eventCategory, setEventCategory] = useState('Wedding');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('10:00');
  const [venue, setVenue] = useState('');
  const [eventLocation, setEventLocation] = useState(currentStudio.city.split(',')[0] || 'Mumbai');
  const [mainEventDeadline, setMainEventDeadline] = useState('');

  // Step 3: Functions (Unlimited)
  const [functions, setFunctions] = useState<Array<{
    id: string;
    name: string;
    date: string;
    startTime: string;
    endTime: string;
    venue: string;
    notes: string;
  }>>([
    {
      id: 'fn_1',
      name: 'Wedding Ceremony',
      date: '',
      startTime: '10:00',
      endTime: '15:00',
      venue: '',
      notes: 'Main wedding rituals & mandap'
    }
  ]);

  // Step 4: Photography Package (Custom Line Items)
  const [lineItems, setLineItems] = useState<PackageLineItem[]>(DEFAULT_LINE_ITEMS);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemRate, setNewItemRate] = useState(10000);
  const [newItemDesc, setNewItemDesc] = useState('');

  // Step 5: Delivery Requirements
  const [deliverables, setDeliverables] = useState({
    rawPhotos: true,
    editedPhotos: true,
    editedPhotosCount: 350,
    selectedPhotos: true,
    traditionalVideo: true,
    cinematicFilm: true,
    filmDuration: '45-60 Mins',
    reelsCount: 5,
    albumRequired: true,
    albumType: 'Premium Flush Mount 12x36 Genuine Leather',
    albumSheets: 40,
    albumCopies: 2,
    pendrive: true,
    onlineLink: true,
    customRequirement: 'Drone reel within 48 hours for Instagram'
  });

  // Step 6: Pricing & Negotiation
  const packageTotal = useMemo(() => {
    return lineItems.reduce((acc, item) => acc + (item.qty * item.rate), 0);
  }, [lineItems]);

  const [additionalServices, setAdditionalServices] = useState(15000);
  const [discount, setDiscount] = useState(10000);
  const [advancePayment, setAdvancePayment] = useState(50000);
  const [paymentMode, setPaymentMode] = useState('UPI');

  const finalNegotiatedAmount = Math.max(0, packageTotal + additionalServices - discount);
  const remainingBalance = Math.max(0, finalNegotiatedAmount - advancePayment);

  // Search existing customers by phone/name
  const matchingCustomers = useMemo(() => {
    if (!customerSearch.trim()) return [];
    const q = customerSearch.toLowerCase();
    return customers.filter(c => 
      c.name.toLowerCase().includes(q) || 
      (c.phone && c.phone.includes(q))
    ).slice(0, 5);
  }, [customerSearch, customers]);

  const handleSelectCustomer = (c: typeof customers[0]) => {
    setSelectedCustomerId(c.id);
    setCustomerName(c.name);
    setCustomerPhone(c.phone || '');
    setCustomerWhatsApp((c as any).whatsappNumber || c.phone || '');
    setCustomerEmail(c.email || '');
    setCustomerCity(c.city || '');
    setCustomerSearch('');
  };

  // Add Function
  const handleAddFunction = (fnName: string = 'New Function') => {
    setFunctions(prev => [
      ...prev,
      {
        id: `fn_${Date.now()}`,
        name: fnName,
        date: eventDate || '',
        startTime: '10:00',
        endTime: '14:00',
        venue: venue || '',
        notes: ''
      }
    ]);
  };

  const handleRemoveFunction = (id: string) => {
    if (functions.length <= 1) return;
    setFunctions(prev => prev.filter(f => f.id !== id));
  };

  // Add Line Item
  const handleAddLineItem = () => {
    if (!newItemName.trim()) return;
    setLineItems(prev => [
      ...prev,
      {
        id: `item_${Date.now()}`,
        name: newItemName.trim(),
        category: 'custom',
        description: newItemDesc.trim() || 'Custom booked service',
        qty: newItemQty,
        rate: newItemRate
      }
    ]);
    setNewItemName('');
    setNewItemQty(1);
    setNewItemRate(10000);
    setNewItemDesc('');
  };

  const handleRemoveLineItem = (id: string) => {
    setLineItems(prev => prev.filter(item => item.id !== id));
  };

  // Generate Quotation PDF
  const handleGeneratePdf = () => {
    const payload = {
      documentType: 'quotation' as const,
      title: 'PHOTOGRAPHY SERVICE QUOTATION',
      documentNumber: `QT-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString().split('T')[0],
      customer: {
        name: customerName || 'Valued Client',
        phone: customerPhone,
        email: customerEmail,
        address: `${venue ? venue + ', ' : ''}${customerCity}`
      },
      event: {
        name: eventName || 'Wedding Celebration',
        category: eventCategory,
        date: eventDate,
        venue: venue
      },
      items: lineItems.map(item => ({
        name: item.name,
        description: item.description,
        quantity: item.qty,
        unitPrice: item.rate,
        amount: item.qty * item.rate
      })),
      financials: {
        subtotal: packageTotal + additionalServices,
        discountAmount: discount,
        totalAmount: finalNegotiatedAmount,
        paidAmount: advancePayment,
        pendingAmount: remainingBalance
      },
      terms: '1. 25% Advance payment required to block dates.\n2. 50% payable on or before event day.\n3. Balance payable at time of final deliverable handover.\n4. Deliverables timeline starts after client completes photo selection.'
    };

    openPdfViewer(payload);
  };

  // Save Booking (Draft or Confirmed)
  const handleSaveBooking = (status: 'quotation' | 'confirmed') => {
    if (!customerName.trim() || !customerPhone.trim()) {
      alert('Please fill customer name and mobile number.');
      setCurrentStep(1);
      return;
    }
    if (!eventName.trim() || !eventDate) {
      alert('Please specify the event name and date.');
      setCurrentStep(2);
      return;
    }

    const bookingId = `book_${Date.now()}`;
    const bookingNumber = `BK-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;

    // Convert functions
    const fnPlans: FunctionPlan[] = functions.map((fn, idx) => ({
      id: fn.id,
      bookingId,
      name: fn.name,
      category: eventCategory,
      orderIndex: idx + 1,
      date: fn.date || eventDate,
      startTime: fn.startTime,
      endTime: fn.endTime,
      venue: fn.venue || venue || 'TBD',
      address: fn.venue || venue,
      city: eventLocation,
      notes: fn.notes,
      assignedPhotographerIds: [],
      assignedVideographerIds: [],
      assignedDroneOperatorIds: [],
      assignedEditorIds: [],
      assignedSupplierIds: [],
      assignedCrew: [],
      priority: 'normal',
      status: 'scheduled',
      deliverables: [
        {
          id: `del_${fn.id}_raw`,
          bookingId,
          functionId: fn.id,
          name: `Raw Photographs - ${fn.name}`,
          category: 'photography',
          priority: 'normal',
          stage: 'not_started',
          deadlineType: 'relative_to_function',
          deadlineDays: 2,
          calculatedDeadline: fn.date || eventDate,
          requiredQty: 500,
          completedQty: 0,
          unit: 'frames',
          deliveryMethod: 'Online Gallery',
          isDelivered: false
        },
        {
          id: `del_${fn.id}_edited`,
          bookingId,
          functionId: fn.id,
          name: `Edited Portraits - ${fn.name}`,
          category: 'photography',
          priority: 'normal',
          stage: 'not_started',
          deadlineType: 'relative_to_function',
          deadlineDays: 15,
          calculatedDeadline: fn.date || eventDate,
          requiredQty: deliverables.editedPhotosCount,
          completedQty: 0,
          unit: 'photos',
          deliveryMethod: 'Online Gallery',
          isDelivered: false
        }
      ]
    }));

    const newBooking: BookingRecord = {
      id: bookingId,
      studioId,
      bookingNumber,
      status: status === 'confirmed' ? 'deal_confirmed' : 'quotation_sent',
      customerId: selectedCustomerId || `cust_${Date.now()}`,
      customerName,
      customerPhone,
      customerWhatsApp: customerWhatsApp || customerPhone,
      customerEmail,
      customerAddress: venue,
      city: customerCity,
      eventName,
      category: eventCategory,
      eventCategory,
      mainEventDate: eventDate,
      startDate: eventDate,
      venue,
      description: customerNotes,
      numberOfDays: 1,
      numberOfFunctions: fnPlans.length,
      deliverables: fnPlans.flatMap(f => f.deliverables),
      billingVersions: [],
      notes: [],
      functions: fnPlans,
      financials: {
        originalQuotation: packageTotal + additionalServices,
        negotiatedDiscount: discount,
        finalAgreedAmount: finalNegotiatedAmount,
        advanceRequired: Math.round(finalNegotiatedAmount * 0.25),
        advanceReceived: advancePayment,
        isAdvanceConfirmed: advancePayment > 0,
        verifiedPaymentsReceived: advancePayment,
        remainingBalance: remainingBalance,
        paymentMilestones: [
          {
            id: 'm1',
            title: 'Booking Advance',
            percentage: 25,
            amount: advancePayment,
            paidAmount: advancePayment,
            dueDate: new Date().toISOString().split('T')[0],
            status: advancePayment > 0 ? 'paid' : 'pending'
          },
          {
            id: 'm2',
            title: 'On-Event Payment',
            percentage: 50,
            amount: Math.round(finalNegotiatedAmount * 0.4),
            paidAmount: 0,
            dueDate: eventDate,
            status: 'pending'
          },
          {
            id: 'm3',
            title: 'Final Delivery Settlement',
            percentage: 25,
            amount: Math.max(0, remainingBalance - Math.round(finalNegotiatedAmount * 0.4)),
            paidAmount: 0,
            dueDate: mainEventDeadline || eventDate,
            status: 'pending'
          }
        ]
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    bookingProductionService.saveBooking(studioId, newBooking);
    setSuccessBookingId(bookingId);
  };

  const steps = [
    { num: 1, title: 'Customer' },
    { num: 2, title: 'Event' },
    { num: 3, title: 'Functions' },
    { num: 4, title: 'Package' },
    { num: 5, title: 'Deliverables' },
    { num: 6, title: 'Price' },
    { num: 7, title: 'Review & Actions' }
  ];

  return (
    <div className="max-w-5xl mx-auto pb-24 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
              Direct Booking Engine
            </span>
            <span className="text-xs text-zinc-400">Step {currentStep} of 7</span>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight mt-1 font-display">
            New Event Booking & Quotation
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Single progressive flow: create customer, configure functions, customize package, and confirm booking.
          </p>
        </div>

        <button
          onClick={() => {
            setActiveTab('dashboard');
            window.location.hash = '#/app/dashboard';
          }}
          className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 self-start sm:self-auto"
        >
          Cancel & Return
        </button>
      </div>

      {/* 7-Step Progress Stepper */}
      <div className="bg-white p-3 rounded-2xl border border-zinc-200/80 shadow-xs overflow-x-auto">
        <div className="flex items-center justify-between min-w-[620px] px-2">
          {steps.map((st, i) => {
            const isCurrent = currentStep === st.num;
            const isCompleted = currentStep > st.num;

            return (
              <React.Fragment key={st.num}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(st.num)}
                  className="flex items-center gap-2 group cursor-pointer"
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                    isCurrent 
                      ? 'bg-zinc-900 text-white shadow-xs' 
                      : isCompleted 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-zinc-100 text-zinc-500'
                  }`}>
                    {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : st.num}
                  </div>
                  <span className={`text-xs font-semibold whitespace-nowrap ${
                    isCurrent ? 'text-zinc-900 font-bold' : isCompleted ? 'text-zinc-700' : 'text-zinc-400'
                  }`}>
                    {st.title}
                  </span>
                </button>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 rounded ${
                    currentStep > st.num ? 'bg-emerald-500' : 'bg-zinc-200'
                  }`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* SUCCESS SCREEN */}
      {successBookingId && (
        <div className="bg-white rounded-3xl border border-emerald-200 p-8 shadow-lg text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-900 font-display">Event Booking Saved Successfully!</h2>
            <p className="text-xs text-zinc-500 mt-1">
              Record created for <strong>{customerName}</strong> ({eventName}). All deliverables & financial ledgers initialized.
            </p>
          </div>

          <div className="pt-4 flex items-center justify-center gap-3">
            <button
              onClick={() => {
                setActiveTab('bookings');
                window.location.hash = `#/app/bookings/${successBookingId}`;
              }}
              className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs shadow-xs"
            >
              Open Booking Workspace →
            </button>
            <button
              onClick={handleGeneratePdf}
              className="px-4 py-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-100 font-semibold text-xs flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Quotation PDF</span>
            </button>
          </div>
        </div>
      )}

      {/* FORM BODY */}
      {!successBookingId && (
        <div className="bg-white rounded-3xl border border-zinc-200/90 p-6 sm:p-8 shadow-xs">
          {/* STEP 1: CUSTOMER */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="border-b border-zinc-100 pb-3">
                <h3 className="text-base font-bold text-zinc-900 font-display">Step 1 — Customer Information</h3>
                <p className="text-xs text-zinc-500">Search existing customer by phone number or enter a new customer record.</p>
              </div>

              {/* Duplicate Prevention Search */}
              <div className="relative">
                <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1">
                  Lookup Existing Customer (Prevent Duplicates)
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Type client mobile number or name..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>

                {matchingCustomers.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-xl shadow-xl z-20 overflow-hidden divide-y divide-zinc-100">
                    {matchingCustomers.map(c => (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => handleSelectCustomer(c)}
                        className="w-full p-2.5 text-left text-xs hover:bg-zinc-50 flex items-center justify-between"
                      >
                        <div>
                          <strong className="text-zinc-900 block">{c.name}</strong>
                          <span className="text-[11px] text-zinc-500 font-mono">{c.phone} • {c.city || 'City not set'}</span>
                        </div>
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">Use This Profile</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1">Customer Full Name *</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Rahul & Pooja"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1">Mobile Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="9876543210"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1">WhatsApp Number</label>
                  <input
                    type="tel"
                    value={customerWhatsApp}
                    onChange={(e) => setCustomerWhatsApp(e.target.value)}
                    placeholder="Same as mobile if empty"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1">City / Region</label>
                  <input
                    type="text"
                    value={customerCity}
                    onChange={(e) => setCustomerCity(e.target.value)}
                    placeholder="e.g. Mumbai"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="client@example.com"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1">Client Notes / Special Requests</label>
                  <textarea
                    rows={2}
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    placeholder="Preferences, family contact person, special requirements..."
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: EVENT */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="border-b border-zinc-100 pb-3">
                <h3 className="text-base font-bold text-zinc-900 font-display">Step 2 — Event Particulars</h3>
                <p className="text-xs text-zinc-500">Define the main photography assignment, date, venue, and delivery timeline.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1">Event Title *</label>
                  <input
                    type="text"
                    required
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    placeholder="e.g. Rahul & Pooja Grand Wedding"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1">Category / Type</label>
                  <select
                    value={eventCategory}
                    onChange={(e) => setEventCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white"
                  >
                    <option value="Wedding">Wedding</option>
                    <option value="Pre-Wedding">Pre-Wedding</option>
                    <option value="Engagement">Engagement</option>
                    <option value="Birthday">Birthday</option>
                    <option value="Corporate">Corporate</option>
                    <option value="Baby Shower">Baby Shower</option>
                    <option value="Fashion">Fashion & Editorial</option>
                    <option value="Custom">Custom Event</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1">Main Event Date *</label>
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1">Final Delivery Target Date</label>
                  <input
                    type="date"
                    value={mainEventDeadline}
                    onChange={(e) => setMainEventDeadline(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1">Venue / Hotel / Resort</label>
                  <input
                    type="text"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    placeholder="e.g. The Taj Palace & Convention Center"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1">City / Shoot Location</label>
                  <input
                    type="text"
                    value={eventLocation}
                    onChange={(e) => setEventLocation(e.target.value)}
                    placeholder="e.g. Udaipur, Rajasthan"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: FUNCTIONS */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-zinc-900 font-display">Step 3 — Functions & Sub-Events</h3>
                  <p className="text-xs text-zinc-500">Add unlimited functions with individual dates, venues and schedule times.</p>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase mr-1">Quick Add:</span>
                  {PREDEFINED_FUNCTION_TYPES.slice(0, 4).map(fn => (
                    <button
                      type="button"
                      key={fn}
                      onClick={() => handleAddFunction(fn)}
                      className="px-2 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-[10px] font-semibold"
                    >
                      + {fn}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleAddFunction('Custom Function')}
                    className="px-2.5 py-1 rounded-lg bg-zinc-900 text-white text-[10px] font-bold"
                  >
                    + Custom
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {functions.map((fn, idx) => (
                  <div key={fn.id} className="p-4 rounded-2xl border border-zinc-200 bg-zinc-50/50 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-zinc-900 text-white font-bold text-[10px] flex items-center justify-center">
                          #{idx + 1}
                        </span>
                        <input
                          type="text"
                          value={fn.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFunctions(prev => prev.map(f => f.id === fn.id ? { ...f, name: val } : f));
                          }}
                          placeholder="Function Name (e.g. Sangeet)"
                          className="font-bold text-zinc-900 bg-transparent border-b border-zinc-300 focus:border-zinc-900 focus:outline-none px-1"
                        />
                      </div>

                      {functions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveFunction(fn.id)}
                          className="p-1 rounded-lg text-rose-500 hover:bg-rose-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-0.5">Date</label>
                        <input
                          type="date"
                          value={fn.date}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFunctions(prev => prev.map(f => f.id === fn.id ? { ...f, date: val } : f));
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white font-mono text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-0.5">Start Time</label>
                        <input
                          type="time"
                          value={fn.startTime}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFunctions(prev => prev.map(f => f.id === fn.id ? { ...f, startTime: val } : f));
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white font-mono text-xs"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-0.5">Venue</label>
                        <input
                          type="text"
                          value={fn.venue}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFunctions(prev => prev.map(f => f.id === fn.id ? { ...f, venue: val } : f));
                          }}
                          placeholder={venue || 'Function venue'}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: PACKAGE */}
          {currentStep === 4 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="border-b border-zinc-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-zinc-900 font-display">Step 4 — Photography Package & Line Items</h3>
                  <p className="text-xs text-zinc-500">Configure photography, cinematography, drone, and editing items with rates.</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-zinc-400 uppercase font-bold block">Package Subtotal</span>
                  <span className="text-lg font-black text-zinc-900 font-mono">₹{packageTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Line items table */}
              <div className="border border-zinc-200 rounded-2xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase text-[10px] font-bold">
                    <tr>
                      <th className="p-3">Service Item</th>
                      <th className="p-3">Description</th>
                      <th className="p-3 w-20 text-center">Qty</th>
                      <th className="p-3 w-28 text-right">Rate (₹)</th>
                      <th className="p-3 w-28 text-right">Total (₹)</th>
                      <th className="p-3 w-12 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {lineItems.map(item => (
                      <tr key={item.id} className="hover:bg-zinc-50/50">
                        <td className="p-3 font-semibold text-zinc-900">{item.name}</td>
                        <td className="p-3 text-zinc-500 text-[11px]">{item.description}</td>
                        <td className="p-3 text-center">
                          <input
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={(e) => {
                              const val = Math.max(1, parseInt(e.target.value) || 1);
                              setLineItems(prev => prev.map(li => li.id === item.id ? { ...li, qty: val } : li));
                            }}
                            className="w-14 text-center py-1 rounded-lg border border-zinc-200 font-mono text-xs"
                          />
                        </td>
                        <td className="p-3 text-right">
                          <input
                            type="number"
                            value={item.rate}
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value) || 0);
                              setLineItems(prev => prev.map(li => li.id === item.id ? { ...li, rate: val } : li));
                            }}
                            className="w-24 text-right py-1 rounded-lg border border-zinc-200 font-mono text-xs px-2"
                          />
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-zinc-900">
                          ₹{(item.qty * item.rate).toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveLineItem(item.id)}
                            className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add custom item */}
              <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-3 text-xs">
                <span className="font-bold text-zinc-900 text-xs block">+ Add Custom Line Item</span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <input
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="Service Name (e.g. 360 Video Booth)"
                    className="sm:col-span-2 px-3 py-2 rounded-xl border border-zinc-200 bg-white"
                  />
                  <input
                    type="number"
                    value={newItemRate}
                    onChange={(e) => setNewItemRate(parseInt(e.target.value) || 0)}
                    placeholder="Rate"
                    className="px-3 py-2 rounded-xl border border-zinc-200 bg-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleAddLineItem}
                    className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold"
                  >
                    Add Service
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: DELIVERABLES */}
          {currentStep === 5 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="border-b border-zinc-100 pb-3">
                <h3 className="text-base font-bold text-zinc-900 font-display">Step 5 — Delivery Requirements</h3>
                <p className="text-xs text-zinc-500">Configure client output deliverables: albums, videos, reels, drive links.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Raw Photos */}
                <div className="p-4 rounded-2xl border border-zinc-200 bg-zinc-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-900">Raw Photographs</span>
                    <input
                      type="checkbox"
                      checked={deliverables.rawPhotos}
                      onChange={(e) => setDeliverables(prev => ({ ...prev, rawPhotos: e.target.checked }))}
                      className="w-4 h-4 accent-zinc-900 rounded"
                    />
                  </div>
                  <p className="text-[11px] text-zinc-500">Handover of full uncut RAW camera captures via SSD / cloud drive.</p>
                </div>

                {/* Edited Photos */}
                <div className="p-4 rounded-2xl border border-zinc-200 bg-zinc-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-900">Edited / Color Graded Photos</span>
                    <input
                      type="number"
                      value={deliverables.editedPhotosCount}
                      onChange={(e) => setDeliverables(prev => ({ ...prev, editedPhotosCount: parseInt(e.target.value) || 0 }))}
                      className="w-20 px-2 py-1 rounded-lg border border-zinc-200 bg-white font-mono text-center text-xs"
                    />
                  </div>
                  <p className="text-[11px] text-zinc-500">Selected master retouch photos for print & album inclusion.</p>
                </div>

                {/* Cinematic Film & Teaser */}
                <div className="p-4 rounded-2xl border border-zinc-200 bg-zinc-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-900">Cinematic Film & Teaser</span>
                    <input
                      type="checkbox"
                      checked={deliverables.cinematicFilm}
                      onChange={(e) => setDeliverables(prev => ({ ...prev, cinematicFilm: e.target.checked }))}
                      className="w-4 h-4 accent-zinc-900 rounded"
                    />
                  </div>
                  <input
                    type="text"
                    value={deliverables.filmDuration}
                    onChange={(e) => setDeliverables(prev => ({ ...prev, filmDuration: e.target.value }))}
                    placeholder="Duration (e.g. 45 Mins + 3 Min Teaser)"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs"
                  />
                </div>

                {/* Social Media Reels */}
                <div className="p-4 rounded-2xl border border-zinc-200 bg-zinc-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-900">Instagram Reels / Shorts</span>
                    <input
                      type="number"
                      value={deliverables.reelsCount}
                      onChange={(e) => setDeliverables(prev => ({ ...prev, reelsCount: parseInt(e.target.value) || 0 }))}
                      className="w-20 px-2 py-1 rounded-lg border border-zinc-200 bg-white font-mono text-center text-xs"
                    />
                  </div>
                  <p className="text-[11px] text-zinc-500">Fast 48-hour vertical teaser reels formatted for 9:16 mobile sharing.</p>
                </div>

                {/* Premium Album */}
                <div className="sm:col-span-2 p-4 rounded-2xl border border-zinc-200 bg-zinc-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-900">Physical Photo Album Specifications</span>
                    <input
                      type="checkbox"
                      checked={deliverables.albumRequired}
                      onChange={(e) => setDeliverables(prev => ({ ...prev, albumRequired: e.target.checked }))}
                      className="w-4 h-4 accent-zinc-900 rounded"
                    />
                  </div>
                  {deliverables.albumRequired && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div>
                        <span className="text-[10px] text-zinc-400 font-bold block mb-1">Album Type & Material</span>
                        <input
                          type="text"
                          value={deliverables.albumType}
                          onChange={(e) => setDeliverables(prev => ({ ...prev, albumType: e.target.value }))}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-400 font-bold block mb-1">Sheets Count</span>
                        <input
                          type="number"
                          value={deliverables.albumSheets}
                          onChange={(e) => setDeliverables(prev => ({ ...prev, albumSheets: parseInt(e.target.value) || 0 }))}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white font-mono text-xs"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-400 font-bold block mb-1">Album Copies</span>
                        <input
                          type="number"
                          value={deliverables.albumCopies}
                          onChange={(e) => setDeliverables(prev => ({ ...prev, albumCopies: parseInt(e.target.value) || 0 }))}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white font-mono text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: PRICE */}
          {currentStep === 6 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="border-b border-zinc-100 pb-3">
                <h3 className="text-base font-bold text-zinc-900 font-display">Step 6 — Pricing & Negotiated Terms</h3>
                <p className="text-xs text-zinc-500">Calculate package total, apply negotiated discounts, and log initial token payment.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase block mb-1">Base Package Total</span>
                  <div className="text-xl font-black text-zinc-900 font-mono">₹{packageTotal.toLocaleString('en-IN')}</div>
                  <span className="text-[10px] text-zinc-500 mt-1 block">{lineItems.length} selected line items</span>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase block mb-1">Additional Services</span>
                  <input
                    type="number"
                    value={additionalServices}
                    onChange={(e) => setAdditionalServices(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 rounded-xl border border-zinc-200 bg-white font-mono font-bold text-sm"
                  />
                  <span className="text-[10px] text-zinc-500 mt-1 block">Travel, stay, extra crew</span>
                </div>

                <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-200">
                  <span className="text-[10px] text-rose-600 font-bold uppercase block mb-1">Negotiated Discount (₹)</span>
                  <input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 rounded-xl border border-rose-200 bg-white font-mono font-bold text-sm text-rose-700"
                  />
                  <span className="text-[10px] text-rose-500 mt-1 block">Bundle / client courtesy</span>
                </div>
              </div>

              {/* Total Settlement Card */}
              <div className="p-5 rounded-2xl bg-zinc-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Final Agreed Booking Amount</span>
                  <div className="text-3xl font-black font-mono tracking-tight mt-0.5 text-white">
                    ₹{finalNegotiatedAmount.toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="flex items-center gap-4 border-t sm:border-t-0 sm:border-l border-zinc-700 pt-3 sm:pt-0 sm:pl-6 text-xs">
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase block">Advance Received</span>
                    <input
                      type="number"
                      value={advancePayment}
                      onChange={(e) => setAdvancePayment(parseInt(e.target.value) || 0)}
                      className="w-28 px-2 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-emerald-400 font-mono font-bold text-sm mt-0.5"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase block">Remaining Balance</span>
                    <div className="text-base font-bold font-mono text-amber-400 mt-1.5">
                      ₹{remainingBalance.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 7: REVIEW & ACTIONS */}
          {currentStep === 7 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="border-b border-zinc-100 pb-3">
                <h3 className="text-base font-bold text-zinc-900 font-display">Step 7 — Review, Generate Quotation & Confirm</h3>
                <p className="text-xs text-zinc-500">Preview quotation, download or print PDF, or directly confirm deal into production.</p>
              </div>

              {/* Summary overview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-2xl border border-zinc-200 bg-zinc-50/50 space-y-2">
                  <span className="text-[10px] font-bold uppercase text-zinc-400 block">Customer & Event</span>
                  <div className="space-y-1">
                    <p><strong className="text-zinc-900">{customerName}</strong> ({customerPhone})</p>
                    <p className="text-zinc-600">{eventName} • {eventCategory}</p>
                    <p className="text-zinc-500 font-mono">{eventDate} @ {venue || 'Main Venue'}</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-zinc-200 bg-zinc-50/50 space-y-2">
                  <span className="text-[10px] font-bold uppercase text-zinc-400 block">Financial Summary</span>
                  <div className="space-y-1 font-mono">
                    <p className="flex justify-between"><span>Agreed Deal:</span> <strong className="text-zinc-900">₹{finalNegotiatedAmount.toLocaleString('en-IN')}</strong></p>
                    <p className="flex justify-between text-emerald-700"><span>Advance Token:</span> <strong>₹{advancePayment.toLocaleString('en-IN')}</strong></p>
                    <p className="flex justify-between text-amber-700"><span>Balance Pending:</span> <strong>₹{remainingBalance.toLocaleString('en-IN')}</strong></p>
                  </div>
                </div>
              </div>

              {/* Functions & Deliverables pill summary */}
              <div className="p-4 rounded-2xl border border-zinc-200 bg-zinc-50/30 space-y-2 text-xs">
                <span className="text-[10px] font-bold uppercase text-zinc-400 block">
                  Functions ({functions.length}) & Deliverables
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {functions.map(fn => (
                    <span key={fn.id} className="px-2.5 py-1 rounded-lg bg-white border border-zinc-200 font-semibold text-zinc-800">
                      {fn.name} ({fn.date || eventDate})
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleGeneratePdf}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-zinc-300 hover:bg-zinc-100 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Printer className="w-4 h-4 text-zinc-600" />
                  <span>Preview & Print Quotation PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveBooking('quotation')}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs cursor-pointer transition-colors"
                >
                  Save as Draft Quotation
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveBooking('confirmed')}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs shadow-md cursor-pointer transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Confirm Deal & Booking</span>
                </button>
              </div>
            </div>
          )}

          {/* Stepper Navigation Buttons */}
          <div className="pt-6 border-t border-zinc-100 flex items-center justify-between">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                className="px-4 py-2 rounded-xl border border-zinc-200 hover:bg-zinc-100 text-xs font-semibold text-zinc-700 flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            ) : <div />}

            {currentStep < 7 && (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => Math.min(7, prev + 1))}
                className="px-5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Continue to Step {currentStep + 1}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
