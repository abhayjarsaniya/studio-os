import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useStudio } from '../context/StudioContext';
import { bookingService } from '../services/bookingService';
import { DeliverablesConfig } from '../types';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Phone, 
  Mail, 
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
  CalendarDays,
  FileText
} from 'lucide-react';

const PHOTOGRAPHY_SERVICES = [
  { id: 'trad_photo', name: 'Traditional Photography', defaultCrew: 1 },
  { id: 'candid_photo', name: 'Candid Photography', defaultCrew: 2 },
  { id: 'trad_video', name: 'Traditional Videography', defaultCrew: 1 },
  { id: 'cinematic_video', name: 'Cinematic Videography / Teaser', defaultCrew: 2 },
  { id: 'drone_aerial', name: 'Drone Coverage / Aerial Cinematography', defaultCrew: 1 },
  { id: 'pre_wedding', name: 'Pre-Wedding Shoot', defaultCrew: 2 },
  { id: 'live_stream', name: 'Live Streaming', defaultCrew: 1 },
  { id: 'same_day_edit', name: 'Same-Day Edit', defaultCrew: 1 },
  { id: 'led_wall', name: 'LED Wall Display', defaultCrew: 1 },
  { id: 'jimmy_jib', name: 'Crane / Jimmy Jib', defaultCrew: 1 },
  { id: 'booth_360', name: '360 Degree Video Booth', defaultCrew: 1 },
  { id: 'reels_creation', name: 'Reels / Short Form Content Creation', defaultCrew: 1 }
];

export const CreateBookingPage: React.FC = () => {
  const { customers, setActiveTab, setSelectedEventId, events } = useApp();
  const { currentStudio } = useStudio();
  const studioId = currentStudio.id;

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [successEventId, setSuccessEventId] = useState<string | null>(null);

  // Step 1: Customer Details
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerWhatsApp, setCustomerWhatsApp] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [referralSource, setReferralSource] = useState('Instagram');

  // Step 2: Event Details
  const [eventName, setEventName] = useState('');
  const [category, setCategory] = useState('Wedding');
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('23:00');
  const [venue, setVenue] = useState('');
  const [city, setCity] = useState(currentStudio.city.split(',')[0] || 'Ahmedabad');
  const [fullAddress, setFullAddress] = useState('');
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [eventNotes, setEventNotes] = useState('');

  // Sub-Events
  const [subEvents, setSubEvents] = useState<Array<{
    id: string;
    name: string;
    date: string;
    startTime: string;
    endTime: string;
    venue: string;
    address: string;
  }>>([
    {
      id: 'sub_1',
      name: 'Wedding Ceremony',
      date: '',
      startTime: '10:00',
      endTime: '15:00',
      venue: '',
      address: ''
    }
  ]);

  // Step 3: Services Selection
  const [selectedServices, setSelectedServices] = useState<Record<string, { selected: boolean; crewCount: number }>>({
    trad_photo: { selected: true, crewCount: 1 },
    candid_photo: { selected: true, crewCount: 2 },
    trad_video: { selected: true, crewCount: 1 },
    cinematic_video: { selected: true, crewCount: 2 },
    drone_aerial: { selected: false, crewCount: 1 },
    pre_wedding: { selected: false, crewCount: 2 },
    live_stream: { selected: false, crewCount: 1 },
    same_day_edit: { selected: false, crewCount: 1 },
    led_wall: { selected: false, crewCount: 1 },
    jimmy_jib: { selected: false, crewCount: 1 },
    booth_360: { selected: false, crewCount: 1 },
    reels_creation: { selected: false, crewCount: 1 }
  });

  // Step 4: Album & Deliverables
  const [packageTier, setPackageTier] = useState('Royal Luxury');
  const [albumType, setAlbumType] = useState('Flush Mount Premium Album');
  const [albumSize, setAlbumSize] = useState('12x36');
  const [coverMaterial, setCoverMaterial] = useState('Genuine Leather');
  const [sheetsCount, setSheetsCount] = useState(40);
  const [albumCopies, setAlbumCopies] = useState(2);
  const [rawPhotosIncluded, setRawPhotosIncluded] = useState(true);
  const [editedPhotosCount, setEditedPhotosCount] = useState(300);
  const [longFilmDuration, setLongFilmDuration] = useState('45-60 Minutes');
  const [cinematicTeaser, setCinematicTeaser] = useState('3-5 Minutes 4K');
  const [reelsCount, setReelsCount] = useState(5);
  const [photoDeliveryDays, setPhotoDeliveryDays] = useState(15);
  const [videoDeliveryDays, setVideoDeliveryDays] = useState(45);

  // Step 5: Pricing & Payment Schedule
  const [packageBasePrice, setPackageBasePrice] = useState(150000);
  const [addonPrice, setAddonPrice] = useState(25000);
  const [discount, setDiscount] = useState(10000);
  const [applyGst, setApplyGst] = useState(true);
  const [advanceReceived, setAdvanceReceived] = useState(50000);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [paymentRef, setPaymentRef] = useState('');

  // Calculations
  const subtotal = Math.max(0, packageBasePrice + addonPrice - discount);
  const taxAmount = applyGst ? Math.round(subtotal * 0.18) : 0;
  const grandTotal = subtotal + taxAmount;
  const balanceRemaining = Math.max(0, grandTotal - advanceReceived);

  // Filter existing customers
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
    setCustomerWhatsApp((c as any).whatsappNumber || c.phone || '');
    setCustomerEmail(c.email || '');
    setCustomerCity(c.city || '');
    setCustomerAddress(c.address || '');
    setCustomerSearch('');
  };

  const handleAddSubEvent = () => {
    setSubEvents(prev => [
      ...prev,
      {
        id: `sub_${Date.now()}`,
        name: 'New Sub-Event',
        date: startDate || '',
        startTime: '10:00',
        endTime: '14:00',
        venue: venue || '',
        address: ''
      }
    ]);
  };

  const handleRemoveSubEvent = (id: string) => {
    if (subEvents.length <= 1) return;
    setSubEvents(prev => prev.filter(s => s.id !== id));
  };

  const handleToggleService = (serviceId: string) => {
    setSelectedServices(prev => ({
      ...prev,
      [serviceId]: {
        ...prev[serviceId],
        selected: !prev[serviceId]?.selected
      }
    }));
  };

  const handleCrewChange = (serviceId: string, count: number) => {
    setSelectedServices(prev => ({
      ...prev,
      [serviceId]: {
        ...prev[serviceId],
        crewCount: Math.max(1, count)
      }
    }));
  };

  // Submit Booking
  const handleConfirmBooking = (isDraft = false) => {
    if (!customerName.trim() || !customerPhone.trim()) {
      alert('Please provide Customer Name and Mobile Number.');
      setCurrentStep(1);
      return;
    }
    if (!eventName.trim() || !startDate) {
      alert('Please provide Main Event Name and Start Date.');
      setCurrentStep(2);
      return;
    }

    const selectedServiceNames = PHOTOGRAPHY_SERVICES
      .filter(s => selectedServices[s.id]?.selected)
      .map(s => `${s.name} (${selectedServices[s.id].crewCount} crew)`);

    const deliverablesConfig: DeliverablesConfig = {
      packageType: packageTier,
      albumRequired: true,
      albumType,
      albumSize,
      albumCoverType: coverMaterial,
      albumSheetsCount: sheetsCount,
      albumsCount: albumCopies,
      parentAlbumRequired: false,
      rawPhotosRequired: rawPhotosIncluded,
      editedPhotosRequired: true,
      selectedPhotographsCount: editedPhotosCount,
      videoRequired: true,
      cinematicHighlightRequired: true,
      deliveryMethod: 'Cloud Gallery & Velvet Box USB Drive',
      selectedServices: selectedServiceNames,
      customDeliverables: [
        `Film: ${longFilmDuration}`,
        `Teaser: ${cinematicTeaser}`,
        `Reels: ${reelsCount}`
      ]
    };

    // Calculate milestone schedule
    const eventPay = Math.round(grandTotal * 0.4);
    const deliveryPay = Math.max(0, grandTotal - advanceReceived - eventPay);

    const paymentSchedule = [
      {
        milestoneName: 'Booking Advance',
        amount: advanceReceived,
        dueDate: startDate || new Date().toISOString().split('T')[0]
      },
      {
        milestoneName: 'Event Shoot Day Payment',
        amount: eventPay,
        dueDate: startDate || new Date().toISOString().split('T')[0]
      },
      {
        milestoneName: 'Final Delivery & Album Release Balance',
        amount: deliveryPay,
        dueDate: endDate || startDate || new Date().toISOString().split('T')[0]
      }
    ];

    try {
      const res = bookingService.createBooking(studioId, {
        customerId: selectedCustomerId || undefined,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerWhatsApp: customerWhatsApp.trim() || customerPhone.trim(),
        customerEmail: customerEmail.trim() || undefined,
        customerCity: customerCity.trim() || city,
        customerAddress: customerAddress.trim() || undefined,

        eventName: eventName.trim(),
        category,
        startDate,
        startTime,
        endDate: isMultiDay && endDate ? endDate : startDate,
        endTime,
        venue: venue.trim() || 'Main Studio Venue',
        city,
        fullAddress,
        googleMapsLocation: googleMapsUrl,
        notes: eventNotes,

        subEvents: subEvents.map(s => ({
          name: s.name,
          date: s.date || startDate,
          startTime: s.startTime,
          endTime: s.endTime,
          venue: s.venue || venue || 'Main Venue',
          address: s.address
        })),

        deliverablesConfig,

        packagePrice: packageBasePrice,
        additionalServicesPrice: addonPrice,
        discount,
        taxAmount,
        finalBookingAmount: grandTotal,
        advanceRequired: Math.round(grandTotal * 0.3),
        advanceReceived,
        paymentMethod,
        paymentSchedule,
        isDraft
      });

      setSuccessEventId(res.event.id);
      setSelectedEventId(res.event.id);
      setActiveTab('events');
    } catch (err: any) {
      alert(`Booking creation failed: ${err.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="max-w-7xl w-full mx-auto space-y-6 pb-16 px-3.5 sm:px-6 lg:px-8">
      {/* Page Title & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight flex items-center gap-2 font-display">
            <CalendarDays className="w-6 h-6 text-emerald-600" />
            Create New Event Booking
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            6-step fast-track workflow for booking photography, cinematics, crew assignments, and payment terms.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl">
            Step {currentStep} of 6
          </span>
        </div>
      </div>

      {/* Progress Wizard Steps */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {[
          { step: 1, title: 'Customer' },
          { step: 2, title: 'Event & Sub-events' },
          { step: 3, title: 'Services' },
          { step: 4, title: 'Deliverables' },
          { step: 5, title: 'Pricing' },
          { step: 6, title: 'Confirm' }
        ].map(s => (
          <button
            key={s.step}
            type="button"
            onClick={() => setCurrentStep(s.step)}
            className={`py-2 px-1 text-center rounded-xl border text-xs font-bold transition-all ${
              currentStep === s.step
                ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs'
                : currentStep > s.step
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50'
            }`}
          >
            <div className="text-xs opacity-70">0{s.step}</div>
            <div className="truncate">{s.title}</div>
          </button>
        ))}
      </div>

      {/* STEP 1: CUSTOMER DETAILS */}
      {currentStep === 1 && (
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <h3 className="font-bold text-sm text-zinc-900 flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-600" />
              Step 1: Customer Details
            </h3>
            <span className="text-xs text-zinc-400">Search CRM or Add New Client</span>
          </div>

          {/* CRM Search / Lookup */}
          <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200/80 space-y-2">
            <label className="text-xs font-bold text-zinc-700 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-zinc-500" />
              Search Existing Client (Prevent duplicate entries)
            </label>
            <input
              type="text"
              value={customerSearch}
              onChange={e => setCustomerSearch(e.target.value)}
              placeholder="Search by client mobile number or name..."
              className="w-full text-xs p-2.5 bg-white border border-zinc-200 rounded-xl focus:ring-1 focus:ring-zinc-900"
            />

            {matchingCustomers.length > 0 && (
              <div className="mt-2 bg-white rounded-xl border border-zinc-200 divide-y divide-zinc-100 shadow-xs overflow-hidden">
                {matchingCustomers.map(mc => (
                  <button
                    key={mc.id}
                    type="button"
                    onClick={() => selectExistingCustomer(mc)}
                    className="w-full text-left p-3 hover:bg-zinc-50 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-zinc-900">{mc.name}</span>
                      <span className="text-zinc-500 font-mono text-xs ml-2">{mc.phone}</span>
                      <div className="text-xs text-zinc-400">{mc.city} • Total Bookings: {mc.totalBookings || 0}</div>
                    </div>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      Select
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedCustomerId && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Selected CRM Client: <strong>{customerName}</strong> ({customerPhone})</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedCustomerId(null);
                  setCustomerName('');
                  setCustomerPhone('');
                  setCustomerWhatsApp('');
                  setCustomerEmail('');
                }}
                className="text-xs font-bold underline hover:text-emerald-950"
              >
                Clear Selection
              </button>
            </div>
          )}

          {/* Customer Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-zinc-700 block mb-1">
                Customer Full Name *
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="e.g., Rohit & Priya Sharma"
                className="w-full text-xs p-2.5 border border-zinc-200 rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 block mb-1">
                Primary Mobile Number *
              </label>
              <input
                type="tel"
                required
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                placeholder="e.g., 9876543210"
                className="w-full text-xs p-2.5 border border-zinc-200 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 block mb-1">
                WhatsApp Number
              </label>
              <input
                type="tel"
                value={customerWhatsApp}
                onChange={e => setCustomerWhatsApp(e.target.value)}
                placeholder="Leave blank if same as mobile"
                className="w-full text-xs p-2.5 border border-zinc-200 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 block mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={customerEmail}
                onChange={e => setCustomerEmail(e.target.value)}
                placeholder="client@example.com"
                className="w-full text-xs p-2.5 border border-zinc-200 rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 block mb-1">
                City / Location
              </label>
              <input
                type="text"
                value={customerCity}
                onChange={e => setCustomerCity(e.target.value)}
                placeholder="e.g., Ahmedabad"
                className="w-full text-xs p-2.5 border border-zinc-200 rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 block mb-1">
                Referral Source
              </label>
              <select
                value={referralSource}
                onChange={e => setReferralSource(e.target.value)}
                className="w-full text-xs p-2.5 border border-zinc-200 rounded-xl bg-white"
              >
                <option value="Instagram">Instagram</option>
                <option value="Friend & Family Referral">Friend & Family Referral</option>
                <option value="Google Search">Google Search</option>
                <option value="Venue Partner">Venue Partner</option>
                <option value="Wedding Planner">Wedding Planner</option>
                <option value="Walk-in">Walk-in</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: EVENT DETAILS & SUB-EVENTS */}
      {currentStep === 2 && (
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <h3 className="font-bold text-sm text-zinc-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              Step 2: Event Details & Sub-Events
            </h3>
            <span className="text-xs text-zinc-400">Multi-day & Multi-ritual Timeline</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-zinc-700 block mb-1">
                Main Event Name *
              </label>
              <input
                type="text"
                required
                value={eventName}
                onChange={e => setEventName(e.target.value)}
                placeholder="e.g., Rohit & Priya Wedding"
                className="w-full text-xs p-2.5 border border-zinc-200 rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 block mb-1">
                Event Category
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full text-xs p-2.5 border border-zinc-200 rounded-xl bg-white"
              >
                <option value="Wedding">Wedding</option>
                <option value="Pre-Wedding">Pre-Wedding</option>
                <option value="Engagement">Engagement</option>
                <option value="Corporate">Corporate Event</option>
                <option value="Birthday">Birthday</option>
                <option value="Maternity">Maternity</option>
                <option value="Baby Shower">Baby Shower</option>
                <option value="Commercial">Commercial / Fashion</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 block mb-1">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={e => {
                  setStartDate(e.target.value);
                  if (!endDate) setEndDate(e.target.value);
                }}
                className="w-full text-xs p-2.5 border border-zinc-200 rounded-xl"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-zinc-700">
                  End Date {isMultiDay && '*'}
                </label>
                <label className="flex items-center gap-1.5 text-xs text-zinc-600 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isMultiDay}
                    onChange={e => setIsMultiDay(e.target.checked)}
                    className="rounded"
                  />
                  <span>Multi-day Event</span>
                </label>
              </div>
              <input
                type="date"
                disabled={!isMultiDay}
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className={`w-full text-xs p-2.5 border border-zinc-200 rounded-xl ${
                  !isMultiDay ? 'bg-zinc-100 text-zinc-400' : 'bg-white'
                }`}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 block mb-1">
                Primary Venue Name
              </label>
              <input
                type="text"
                value={venue}
                onChange={e => setVenue(e.target.value)}
                placeholder="e.g., Grand Hyatt Ballroom"
                className="w-full text-xs p-2.5 border border-zinc-200 rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 block mb-1">
                Google Maps Location URL
              </label>
              <input
                type="url"
                value={googleMapsUrl}
                onChange={e => setGoogleMapsUrl(e.target.value)}
                placeholder="https://maps.app.goo.gl/..."
                className="w-full text-xs p-2.5 border border-zinc-200 rounded-xl font-mono"
              />
            </div>
          </div>

          {/* Sub-Events Configuration */}
          <div className="pt-4 border-t border-zinc-100 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                  Sub-Events & Ceremonies ({subEvents.length})
                </h4>
                <p className="text-xs text-zinc-500">
                  Configure individual rituals (Haldi, Mehndi, Sangeet, Ceremony, Reception).
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddSubEvent}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Sub-Event
              </button>
            </div>

            <div className="space-y-3">
              {subEvents.map((sub, idx) => (
                <div key={sub.id} className="p-3.5 rounded-xl border border-zinc-200/90 bg-zinc-50/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-800">
                      Sub-Event #{idx + 1}
                    </span>
                    {subEvents.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSubEvent(sub.id)}
                        className="text-rose-600 hover:text-rose-800 p-1"
                        title="Remove Sub-Event"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        placeholder="Sub-Event Name (e.g. Mehndi / Reception)"
                        value={sub.name}
                        onChange={e => {
                          const val = e.target.value;
                          setSubEvents(prev => prev.map(s => s.id === sub.id ? { ...s, name: val } : s));
                        }}
                        className="w-full text-xs p-2 bg-white border border-zinc-200 rounded-lg"
                      />
                    </div>

                    <div>
                      <input
                        type="date"
                        value={sub.date || startDate}
                        onChange={e => {
                          const val = e.target.value;
                          setSubEvents(prev => prev.map(s => s.id === sub.id ? { ...s, date: val } : s));
                        }}
                        className="w-full text-xs p-2 bg-white border border-zinc-200 rounded-lg"
                      />
                    </div>

                    <div className="flex items-center gap-1">
                      <input
                        type="time"
                        value={sub.startTime}
                        onChange={e => {
                          const val = e.target.value;
                          setSubEvents(prev => prev.map(s => s.id === sub.id ? { ...s, startTime: val } : s));
                        }}
                        className="w-1/2 text-xs p-2 bg-white border border-zinc-200 rounded-lg"
                      />
                      <span className="text-zinc-400 text-xs">-</span>
                      <input
                        type="time"
                        value={sub.endTime}
                        onChange={e => {
                          const val = e.target.value;
                          setSubEvents(prev => prev.map(s => s.id === sub.id ? { ...s, endTime: val } : s));
                        }}
                        className="w-1/2 text-xs p-2 bg-white border border-zinc-200 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: SERVICES SELECTION */}
      {currentStep === 3 && (
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <h3 className="font-bold text-sm text-zinc-900 flex items-center gap-2">
              <Camera className="w-4 h-4 text-emerald-600" />
              Step 3: Photography & Videography Services Selection
            </h3>
            <span className="text-xs text-zinc-400">Select Services and Crew Count</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PHOTOGRAPHY_SERVICES.map(srv => {
              const state = selectedServices[srv.id] || { selected: false, crewCount: srv.defaultCrew };
              return (
                <div
                  key={srv.id}
                  className={`p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                    state.selected
                      ? 'border-emerald-300 bg-emerald-50/40 shadow-xs'
                      : 'border-zinc-200 bg-zinc-50/40'
                  }`}
                >
                  <label className="flex items-center gap-3 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={state.selected}
                      onChange={() => handleToggleService(srv.id)}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <div>
                      <div className="text-xs font-bold text-zinc-900">{srv.name}</div>
                      <div className="text-xs text-zinc-500">Default crew: {srv.defaultCrew}</div>
                    </div>
                  </label>

                  {state.selected && (
                    <div className="flex items-center gap-1.5 ml-2">
                      <span className="text-xs text-zinc-500 font-medium">Crew:</span>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={state.crewCount}
                        onChange={e => handleCrewChange(srv.id, parseInt(e.target.value) || 1)}
                        className="w-12 text-center text-xs p-1 bg-white border border-zinc-200 rounded-lg font-bold"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 4: ALBUM & DELIVERABLES */}
      {currentStep === 4 && (
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <h3 className="font-bold text-sm text-zinc-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              Step 4: Album & Delivery Specifications
            </h3>
            <span className="text-xs text-zinc-400">Physical Albums & Digital Delivery</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-zinc-700 block mb-1">
                Package Tier
              </label>
              <select
                value={packageTier}
                onChange={e => setPackageTier(e.target.value)}
                className="w-full text-xs p-2.5 border border-zinc-200 rounded-xl bg-white font-bold"
              >
                <option value="Royal Luxury">Royal Luxury Package</option>
                <option value="Premium Cinematic">Premium Cinematic Package</option>
                <option value="Standard Classic">Standard Classic Package</option>
                <option value="Custom Bespoke">Custom Bespoke</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 block mb-1">
                Album Size
              </label>
              <select
                value={albumSize}
                onChange={e => setAlbumSize(e.target.value)}
                className="w-full text-xs p-2.5 border border-zinc-200 rounded-xl bg-white"
              >
                <option value="12x36">12 x 36 Inches (Panoramic Royal)</option>
                <option value="12x30">12 x 30 Inches (Classic Wide)</option>
                <option value="10x24">10 x 24 Inches (Standard)</option>
                <option value="12x18">12 x 18 Inches (Portrait Album)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 block mb-1">
                Cover Material
              </label>
              <select
                value={coverMaterial}
                onChange={e => setCoverMaterial(e.target.value)}
                className="w-full text-xs p-2.5 border border-zinc-200 rounded-xl bg-white"
              >
                <option value="Genuine Leather">Genuine Leather Embossed</option>
                <option value="Acrylic Glass Finish">Acrylic Glass High-Gloss Finish</option>
                <option value="Velvet Silk">Royal Velvet Silk</option>
                <option value="Wood Hardcover">Handcrafted Wooden Cover</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 block mb-1">
                Number of Sheets / Pages
              </label>
              <input
                type="number"
                min={20}
                max={100}
                value={sheetsCount}
                onChange={e => setSheetsCount(parseInt(e.target.value) || 30)}
                className="w-full text-xs p-2.5 border border-zinc-200 rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 block mb-1">
                Number of Album Copies
              </label>
              <input
                type="number"
                min={1}
                max={5}
                value={albumCopies}
                onChange={e => setAlbumCopies(parseInt(e.target.value) || 1)}
                className="w-full text-xs p-2.5 border border-zinc-200 rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 block mb-1">
                Edited Photos Expected Count
              </label>
              <input
                type="number"
                value={editedPhotosCount}
                onChange={e => setEditedPhotosCount(parseInt(e.target.value) || 200)}
                className="w-full text-xs p-2.5 border border-zinc-200 rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 block mb-1">
                RAW Photos Included?
              </label>
              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 text-xs font-semibold">
                  <input
                    type="radio"
                    name="raw_photos"
                    checked={rawPhotosIncluded}
                    onChange={() => setRawPhotosIncluded(true)}
                  />
                  <span>Yes (Full HDD Transfer)</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold">
                  <input
                    type="radio"
                    name="raw_photos"
                    checked={!rawPhotosIncluded}
                    onChange={() => setRawPhotosIncluded(false)}
                  />
                  <span>No (Edited Only)</span>
                </label>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 block mb-1">
                Cinematic Teaser & Reels
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={cinematicTeaser}
                  onChange={e => setCinematicTeaser(e.target.value)}
                  placeholder="3-5 Min Teaser"
                  className="w-2/3 text-xs p-2.5 border border-zinc-200 rounded-xl"
                />
                <input
                  type="number"
                  value={reelsCount}
                  onChange={e => setReelsCount(parseInt(e.target.value) || 3)}
                  placeholder="Reels count"
                  className="w-1/3 text-xs p-2.5 border border-zinc-200 rounded-xl text-center"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: PRICING & PAYMENT SCHEDULE */}
      {currentStep === 5 && (
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <h3 className="font-bold text-sm text-zinc-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              Step 5: Pricing & Payment Terms (Studio Owner / Admin Only)
            </h3>
            <span className="text-xs text-zinc-400">Financial Setup</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-zinc-700 block mb-1">
                Package Base Price (₹)
              </label>
              <input
                type="number"
                value={packageBasePrice}
                onChange={e => setPackageBasePrice(parseInt(e.target.value) || 0)}
                className="w-full text-xs p-2.5 border border-zinc-200 rounded-xl font-bold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 block mb-1">
                Add-on Services (₹)
              </label>
              <input
                type="number"
                value={addonPrice}
                onChange={e => setAddonPrice(parseInt(e.target.value) || 0)}
                className="w-full text-xs p-2.5 border border-zinc-200 rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 block mb-1">
                Special Discount (₹)
              </label>
              <input
                type="number"
                value={discount}
                onChange={e => setDiscount(parseInt(e.target.value) || 0)}
                className="w-full text-xs p-2.5 border border-zinc-200 rounded-xl text-rose-600 font-bold"
              />
            </div>
          </div>

          <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <label className="flex items-center gap-2 text-xs font-bold text-zinc-800 cursor-pointer">
              <input
                type="checkbox"
                checked={applyGst}
                onChange={e => setApplyGst(e.target.checked)}
                className="rounded"
              />
              <span>Apply 18% GST (Goods and Services Tax)</span>
            </label>

            <div className="text-right">
              <div className="text-xs text-zinc-500">Subtotal: ₹{subtotal.toLocaleString('en-IN')}</div>
              {applyGst && <div className="text-xs text-zinc-500">GST (18%): ₹{taxAmount.toLocaleString('en-IN')}</div>}
              <div className="text-base font-black text-zinc-900 mt-0.5">
                Total Booking Amount: ₹{grandTotal.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* Advance & Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="text-xs font-bold text-zinc-700 block mb-1">
                Advance Payment Received (₹)
              </label>
              <input
                type="number"
                value={advanceReceived}
                onChange={e => setAdvanceReceived(parseInt(e.target.value) || 0)}
                className="w-full text-xs p-2.5 border border-zinc-200 rounded-xl text-emerald-700 font-black text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 block mb-1">
                Payment Mode
              </label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value)}
                className="w-full text-xs p-2.5 border border-zinc-200 rounded-xl bg-white"
              >
                <option value="UPI">UPI / QR Code</option>
                <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                <option value="Cash">Cash</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 block mb-1">
                Transaction / Cheque Ref
              </label>
              <input
                type="text"
                value={paymentRef}
                onChange={e => setPaymentRef(e.target.value)}
                placeholder="e.g., UPI/2026/091823"
                className="w-full text-xs p-2.5 border border-zinc-200 rounded-xl font-mono"
              />
            </div>
          </div>

          {/* Payment Milestone Schedule */}
          <div className="p-3.5 rounded-xl border border-zinc-200 bg-white space-y-2">
            <div className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
              Payment Schedule Breakdown
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-100">
                <div className="text-xs uppercase font-bold text-emerald-700">1. Booking Advance</div>
                <div className="font-black text-sm mt-0.5">₹{advanceReceived.toLocaleString('en-IN')}</div>
                <div className="text-xs text-emerald-600">Immediate / Paid</div>
              </div>
              <div className="p-2.5 rounded-lg bg-zinc-50 text-zinc-800 border border-zinc-200">
                <div className="text-xs uppercase font-bold text-zinc-500">2. Event Date Payment</div>
                <div className="font-black text-sm mt-0.5">₹{Math.round(grandTotal * 0.4).toLocaleString('en-IN')}</div>
                <div className="text-xs text-zinc-500">On shoot day</div>
              </div>
              <div className="p-2.5 rounded-lg bg-zinc-50 text-zinc-800 border border-zinc-200">
                <div className="text-xs uppercase font-bold text-zinc-500">3. Final Delivery Balance</div>
                <div className="font-black text-sm mt-0.5">
                  ₹{Math.max(0, grandTotal - advanceReceived - Math.round(grandTotal * 0.4)).toLocaleString('en-IN')}
                </div>
                <div className="text-xs text-zinc-500">Before album release</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 6: REVIEW & CONFIRMATION */}
      {currentStep === 6 && (
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <h3 className="font-bold text-sm text-zinc-900 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              Step 6: Review & Confirmation
            </h3>
            <span className="text-xs text-zinc-400">Verify all booking terms</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-2">
              <h4 className="font-bold text-zinc-900 text-sm">Customer & Event Summary</h4>
              <div><strong>Client:</strong> {customerName || 'N/A'} ({customerPhone})</div>
              <div><strong>Event:</strong> {eventName} ({category})</div>
              <div><strong>Dates:</strong> {startDate} {isMultiDay && endDate ? `to ${endDate}` : ''}</div>
              <div><strong>Venue:</strong> {venue || 'Main Venue'}, {city}</div>
              <div><strong>Sub-Events:</strong> {subEvents.length} configured</div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-2">
              <h4 className="font-bold text-zinc-900 text-sm">Financial Summary</h4>
              <div><strong>Package Tier:</strong> {packageTier}</div>
              <div><strong>Grand Total:</strong> ₹{grandTotal.toLocaleString('en-IN')}</div>
              <div className="text-emerald-700 font-bold">
                <strong>Advance Paid:</strong> ₹{advanceReceived.toLocaleString('en-IN')} ({paymentMethod})
              </div>
              <div className="text-zinc-600">
                <strong>Balance Due:</strong> ₹{balanceRemaining.toLocaleString('en-IN')}
              </div>
              <div><strong>Albums:</strong> {albumCopies} x {albumSize} ({coverMaterial})</div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="pt-4 border-t border-zinc-200 flex flex-col sm:flex-row items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => handleConfirmBooking(true)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-100 text-xs font-bold transition-colors cursor-pointer"
            >
              Save as Draft
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('create-quotation')}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              Generate Quotation Instead
            </button>

            <button
              type="button"
              onClick={() => handleConfirmBooking(false)}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              Confirm Booking
            </button>
          </div>
        </div>
      )}

      {/* Navigation Buttons (Prev / Next) */}
      <div className="flex items-center justify-between pt-2">
        {currentStep > 1 ? (
          <button
            type="button"
            onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
            className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Previous
          </button>
        ) : <div />}

        {currentStep < 6 && (
          <button
            type="button"
            onClick={() => setCurrentStep(prev => Math.min(6, prev + 1))}
            className="flex items-center gap-1.5 px-5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer ml-auto"
          >
            Next Step
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};