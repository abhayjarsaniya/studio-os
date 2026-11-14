import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useStudio } from '../../context/StudioContext';
import { bookingHistoryService } from '../../services/bookingHistoryService';
import { bookingProductionService } from '../../services/bookingProductionService';
import { 
  BookingHistoryItem, 
  BookingActivityType, 
  BookingHistorySummary,
  AlbumProductRecord,
  ServiceRecord,
  DeliveryRecord
} from '../../types/bookingHistory';
import { BookingRecord } from '../../types/bookingProduction';
import { 
  IndianRupee, 
  Camera, 
  Video, 
  BookOpen, 
  PackageCheck, 
  TrendingUp, 
  Calendar, 
  MessageSquare, 
  Search, 
  Filter, 
  ArrowUpDown, 
  Plus, 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  Clock, 
  User, 
  CheckCircle2, 
  AlertCircle,
  Truck,
  Layers,
  Sparkles,
  ExternalLink,
  X
} from 'lucide-react';

interface CompleteBookingHistoryTabProps {
  booking: BookingRecord;
  onRefresh: () => void;
  onOpenPaymentModal: () => void;
}

export const CompleteBookingHistoryTab: React.FC<CompleteBookingHistoryTabProps> = ({
  booking,
  onRefresh,
  onOpenPaymentModal
}) => {
  const { currentStudio } = useStudio();
  const { openPdfViewer, employees } = useApp();
  const studioId = currentStudio?.id || 'studio_shreeji_films';

  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFunctionFilter, setSelectedFunctionFilter] = useState<string>('all');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [expandedItemIds, setExpandedItemIds] = useState<Set<string>>(new Set());

  // Sub-modals for adding activities
  const [isAddAlbumOpen, setIsAddAlbumOpen] = useState(false);
  const [albumFormData, setAlbumFormData] = useState({
    name: 'Premium Wedding Flush Mount Album',
    productType: 'album' as const,
    size: '12 × 36 inches',
    quantity: 2,
    sheetsCount: 40,
    coverMaterial: 'Genuine Leather',
    coverDesign: 'Gold Foil Names Embossing',
    selectedPhotosCount: 250,
    notes: 'Matte coated imported paper'
  });

  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
  const [serviceFormData, setServiceFormData] = useState({
    name: 'Drone Aerial Cinematography',
    category: 'drone' as const,
    quantity: 1,
    assignedEmployeeId: '',
    functionId: '',
    notes: '4K aerial shots of baraat & venue'
  });

  const [isRecordDeliveryOpen, setIsRecordDeliveryOpen] = useState(false);
  const [deliveryFormData, setDeliveryFormData] = useState({
    itemDelivered: 'Edited Wedding Highlights & Photos',
    functionId: '',
    quantity: 350,
    unit: 'photos',
    deliveryMethod: 'Google Drive' as const,
    linkOrReference: 'https://drive.google.com/drive/folders/shreeji-client-gallery',
    deliveredBy: 'Priya Joshi',
    customerConfirmation: 'confirmed' as const,
    notes: 'Client confirmed download link'
  });

  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [noteFormData, setNoteFormData] = useState({
    title: 'Customer Preference Note',
    content: '',
    isPrivate: false
  });

  // Load summary metrics
  const summary: BookingHistorySummary = useMemo(() => {
    return bookingHistoryService.getBookingHistorySummary(studioId, booking.id);
  }, [studioId, booking.id, booking]);

  // Load all history items
  const historyItems = useMemo(() => {
    return bookingHistoryService.getBookingHistory(studioId, booking.id, sortOrder);
  }, [studioId, booking.id, sortOrder, booking]);

  // Toggle expanded item
  const toggleExpanded = (historyId: string) => {
    setExpandedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(historyId)) next.delete(historyId);
      else next.add(historyId);
      return next;
    });
  };

  // Filter and search
  const filteredItems = useMemo(() => {
    return historyItems.filter(item => {
      // Activity type filter
      if (filterType === 'payments' && item.activityType !== 'payment_received') return false;
      if (filterType === 'services' && !['service_added', 'service_status_changed', 'crew_assigned'].includes(item.activityType)) return false;
      if (filterType === 'albums' && !['album_selected', 'album_status_changed', 'product_selected'].includes(item.activityType)) return false;
      if (filterType === 'deliveries' && item.activityType !== 'delivery_recorded') return false;
      if (filterType === 'price' && !['price_updated', 'booking_confirmed'].includes(item.activityType)) return false;
      if (filterType === 'events' && !['event_updated', 'booking_created'].includes(item.activityType)) return false;
      if (filterType === 'notes' && item.activityType !== 'note_added') return false;

      // Function filter
      if (selectedFunctionFilter !== 'all') {
        if (item.relatedFunctionId !== selectedFunctionFilter && item.relatedFunctionName !== selectedFunctionFilter) {
          return false;
        }
      }

      // Date range filter
      const itemDate = item.createdAt.split('T')[0];
      if (startDateFilter && itemDate < startDateFilter) return false;
      if (endDateFilter && itemDate > endDateFilter) return false;

      // Search matching
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchDesc = item.description.toLowerCase().includes(q);
        const matchPerson = item.performedByName.toLowerCase().includes(q);
        const matchRef = item.metadata?.reference?.toLowerCase().includes(q) || false;
        const matchAmount = item.amount ? String(item.amount).includes(q) : false;
        return matchTitle || matchDesc || matchPerson || matchRef || matchAmount;
      }

      return true;
    });
  }, [historyItems, filterType, selectedFunctionFilter, startDateFilter, endDateFilter, searchTerm]);

  // View Receipt PDF
  const handleViewReceipt = (item: BookingHistoryItem) => {
    const meta = item.metadata;
    const amount = item.amount || meta?.amount || 0;
    const receiptNum = meta?.receiptNumber || `REC-${booking.bookingNumber}`;

    openPdfViewer({
      documentType: 'payment_receipt',
      title: 'OFFICIAL PAYMENT RECEIPT',
      documentNumber: receiptNum,
      date: item.createdAt.split('T')[0],
      customer: {
        name: booking.customerName,
        phone: booking.customerPhone,
        address: `${booking.venue}, ${booking.city}`
      },
      event: {
        name: booking.eventName,
        category: booking.category || 'Wedding',
        date: booking.mainEventDate || booking.startDate,
        venue: booking.venue
      },
      items: [
        {
          name: 'Verified Booking Installment / Advance',
          description: `Payment received towards ${booking.eventName} (${booking.bookingNumber}). Payment Mode: ${meta?.paymentMethod || 'UPI'}. Ref: ${meta?.reference || 'Direct Deposit'}.`,
          quantity: 1,
          unitPrice: amount,
          amount: amount
        }
      ],
      financials: {
        subtotal: amount,
        totalAmount: amount,
        paidAmount: amount,
        pendingAmount: meta?.newBalance ?? Math.max(0, (booking.financials?.remainingBalance || 0))
      },
      terms: 'Official payment receipt issued by Studio OS. Confirmed and credited to client ledger.'
    });
  };

  // Submit Add Album / Product
  const handleAddAlbumSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    bookingHistoryService.addAlbumOrProduct(studioId, booking.id, booking.customerId, {
      name: albumFormData.name,
      productType: albumFormData.productType,
      size: albumFormData.size,
      quantity: Number(albumFormData.quantity),
      sheetsCount: Number(albumFormData.sheetsCount),
      coverMaterial: albumFormData.coverMaterial,
      coverDesign: albumFormData.coverDesign,
      selectedPhotosCount: Number(albumFormData.selectedPhotosCount),
      status: 'design_in_progress',
      notes: albumFormData.notes,
      addedBy: 'Studio Owner'
    });

    setIsAddAlbumOpen(false);
    onRefresh();
  };

  // Submit Add Service
  const handleAddServiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find(e => e.id === serviceFormData.assignedEmployeeId);
    const fn = (booking.functions || []).find(f => f.id === serviceFormData.functionId);

    bookingHistoryService.addService(studioId, booking.id, booking.customerId, {
      name: serviceFormData.name,
      category: serviceFormData.category,
      quantity: Number(serviceFormData.quantity),
      status: 'confirmed',
      assignedEmployeeId: emp?.id,
      assignedEmployeeName: emp?.fullName,
      functionId: fn?.id,
      functionName: fn?.name,
      notes: serviceFormData.notes
    });

    setIsAddServiceOpen(false);
    onRefresh();
  };

  // Submit Record Delivery Handover
  const handleRecordDeliverySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fn = (booking.functions || []).find(f => f.id === deliveryFormData.functionId);

    bookingHistoryService.recordDeliveryHandover(studioId, booking.id, booking.customerId, {
      itemDelivered: deliveryFormData.itemDelivered,
      functionId: fn?.id,
      functionName: fn?.name,
      deliveryDate: new Date().toISOString().split('T')[0],
      quantity: Number(deliveryFormData.quantity),
      unit: deliveryFormData.unit,
      deliveryMethod: deliveryFormData.deliveryMethod,
      linkOrReference: deliveryFormData.linkOrReference,
      deliveredBy: deliveryFormData.deliveredBy,
      customerConfirmation: deliveryFormData.customerConfirmation,
      notes: deliveryFormData.notes
    });

    setIsRecordDeliveryOpen(false);
    onRefresh();
  };

  // Submit Add Note
  const handleAddNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteFormData.content.trim()) return;

    bookingProductionService.addCustomerNote(studioId, {
      customerId: booking.customerId,
      bookingId: booking.id,
      noteType: noteFormData.isPrivate ? 'internal_private' : 'customer_communication',
      title: noteFormData.title,
      content: noteFormData.content,
      isPrivate: noteFormData.isPrivate,
      createdBy: 'Studio Owner'
    });

    setNoteFormData({ title: 'Customer Preference Note', content: '', isPrivate: false });
    setIsAddNoteOpen(false);
    onRefresh();
  };

  // Icon & Style Resolver for Timeline Item
  const getActivityStyle = (type: BookingActivityType) => {
    switch (type) {
      case 'payment_received':
        return {
          icon: <IndianRupee className="w-4 h-4 text-emerald-600" />,
          dotBg: 'bg-emerald-500',
          badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          label: 'Payment'
        };
      case 'service_added':
      case 'service_status_changed':
      case 'crew_assigned':
        return {
          icon: <Camera className="w-4 h-4 text-indigo-600" />,
          dotBg: 'bg-indigo-500',
          badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          label: 'Service'
        };
      case 'album_selected':
      case 'album_status_changed':
      case 'product_selected':
        return {
          icon: <BookOpen className="w-4 h-4 text-purple-600" />,
          dotBg: 'bg-purple-500',
          badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
          label: 'Album'
        };
      case 'delivery_recorded':
        return {
          icon: <PackageCheck className="w-4 h-4 text-blue-600" />,
          dotBg: 'bg-blue-500',
          badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
          label: 'Delivery'
        };
      case 'price_updated':
        return {
          icon: <TrendingUp className="w-4 h-4 text-amber-600" />,
          dotBg: 'bg-amber-500',
          badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
          label: 'Price Update'
        };
      case 'event_updated':
      case 'booking_created':
        return {
          icon: <Calendar className="w-4 h-4 text-cyan-600" />,
          dotBg: 'bg-cyan-500',
          badgeBg: 'bg-cyan-50 text-cyan-700 border-cyan-200',
          label: 'Event'
        };
      case 'note_added':
        return {
          icon: <MessageSquare className="w-4 h-4 text-slate-600" />,
          dotBg: 'bg-slate-500',
          badgeBg: 'bg-slate-50 text-slate-700 border-slate-200',
          label: 'Note'
        };
      default:
        return {
          icon: <CheckCircle2 className="w-4 h-4 text-zinc-600" />,
          dotBg: 'bg-zinc-500',
          badgeBg: 'bg-zinc-50 text-zinc-700 border-zinc-200',
          label: 'Activity'
        };
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. COMPACT BOOKING HISTORY SUMMARY BANNER */}
      <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 font-display flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Complete Customer Booking History & Lifecycle Ledger</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Chronological audit trail of all payments, photography services, album selections, handovers, and price revisions
            </p>
          </div>
          <span className="text-[11px] font-semibold text-zinc-500 bg-zinc-50 px-2.5 py-1 rounded-lg border border-zinc-200/60 self-start sm:self-auto">
            Last Activity: {summary.lastActivityDate}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200">
            <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider block">Total Received</span>
            <span className="text-sm font-extrabold text-emerald-800 mt-0.5 block font-display">
              ₹{summary.totalPaymentsReceived.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Payments</span>
            <span className="text-sm font-bold text-zinc-900 mt-0.5 block font-display">
              {summary.paymentTransactionsCount} Transactions
            </span>
          </div>

          <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-200">
            <span className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider block">Services Booked</span>
            <span className="text-sm font-bold text-indigo-900 mt-0.5 block font-display">
              {summary.totalServicesBooked} Services
            </span>
          </div>

          <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Services Done</span>
            <span className="text-sm font-bold text-zinc-900 mt-0.5 block font-display">
              {summary.servicesCompleted} Completed
            </span>
          </div>

          <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-200">
            <span className="text-[10px] text-purple-700 font-bold uppercase tracking-wider block">Albums Selected</span>
            <span className="text-sm font-bold text-purple-900 mt-0.5 block font-display">
              {summary.albumsSelected} Albums / Sets
            </span>
          </div>

          <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200">
            <span className="text-[10px] text-blue-700 font-bold uppercase tracking-wider block">Deliveries Done</span>
            <span className="text-sm font-bold text-blue-900 mt-0.5 block font-display">
              {summary.deliveriesCompleted} Handed Over
            </span>
          </div>

          <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200">
            <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider block">Pending Delivery</span>
            <span className="text-sm font-bold text-amber-900 mt-0.5 block font-display">
              {summary.pendingDeliveries} Items in Queue
            </span>
          </div>
        </div>
      </div>

      {/* 2. CONTROLS, SEARCH & QUICK ACTIONS */}
      <div className="bg-white rounded-2xl border border-zinc-200/90 p-4 shadow-2xs space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search timeline by title, description, responsible person, amount, or reference..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-zinc-900"
            />
          </div>

          {/* Sort Order Toggle */}
          <button
            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="min-h-[40px] px-3.5 py-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-xs font-bold flex items-center justify-center gap-1.5 text-zinc-700 transition-colors cursor-pointer shrink-0"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>{sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}</span>
          </button>
        </div>

        {/* Function & Date Range Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 border-t border-zinc-100 text-xs">
          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
              Filter by Function
            </label>
            <select
              value={selectedFunctionFilter}
              onChange={e => setSelectedFunctionFilter(e.target.value)}
              className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 focus:bg-white"
            >
              <option value="all">All Functions & Shoots</option>
              {(booking.functions || []).map(fn => (
                <option key={fn.id} value={fn.id}>
                  {fn.name} ({fn.date})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
              From Date
            </label>
            <input
              type="date"
              value={startDateFilter}
              onChange={e => setStartDateFilter(e.target.value)}
              className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 focus:bg-white"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
              To Date
            </label>
            <input
              type="date"
              value={endDateFilter}
              onChange={e => setEndDateFilter(e.target.value)}
              className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 focus:bg-white"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs border-t border-zinc-100 pt-3">
          {[
            { id: 'all', label: 'All Activities' },
            { id: 'payments', label: 'Payments' },
            { id: 'services', label: 'Services & Shoot' },
            { id: 'albums', label: 'Albums & Products' },
            { id: 'deliveries', label: 'Deliveries' },
            { id: 'price', label: 'Price & Negotiations' },
            { id: 'events', label: 'Event Schedule' },
            { id: 'notes', label: 'Notes' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id)}
              className={`min-h-[36px] px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                filterType === f.id
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'bg-zinc-100/80 text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-900'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Quick Activity Logging Triggers */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-100">
          <button
            onClick={onOpenPaymentModal}
            className="min-h-[36px] px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-600" />
            <span>+ Add Payment</span>
          </button>

          <button
            onClick={() => setIsAddAlbumOpen(true)}
            className="min-h-[36px] px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-purple-600" />
            <span>+ Add Album Selection</span>
          </button>

          <button
            onClick={() => setIsAddServiceOpen(true)}
            className="min-h-[36px] px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5 text-indigo-600" />
            <span>+ Add Service</span>
          </button>

          <button
            onClick={() => setIsRecordDeliveryOpen(true)}
            className="min-h-[36px] px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Truck className="w-3.5 h-3.5 text-blue-600" />
            <span>+ Record Delivery Handover</span>
          </button>

          <button
            onClick={() => setIsAddNoteOpen(true)}
            className="min-h-[36px] px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5 text-zinc-600" />
            <span>+ Add Note</span>
          </button>
        </div>
      </div>

      {/* 3. VERTICAL TIMELINE LIST */}
      <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-2xs space-y-6">
        <div className="relative pl-6 sm:pl-8 space-y-6 before:content-[''] before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-200">
          {filteredItems.map(item => {
            const style = getActivityStyle(item.activityType);
            const isExpanded = expandedItemIds.has(item.historyId);
            const formattedDate = new Date(item.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            });
            const formattedTime = new Date(item.createdAt).toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div key={item.historyId} className="relative group">
                {/* Timeline Dot */}
                <div className={`absolute -left-6 sm:-left-8 top-1.5 w-6 h-6 rounded-full border-2 border-white ${style.dotBg} text-white flex items-center justify-center shadow-xs ring-4 ring-zinc-50`}>
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>

                {/* Timeline Card */}
                <div className="p-4 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 hover:bg-zinc-50 hover:border-zinc-300 transition-all space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md border ${style.badgeBg}`}>
                        {style.label}
                      </span>
                      <h4 className="text-xs font-bold text-zinc-900">{item.title}</h4>
                      {item.isDemoData && (
                        <span className="text-[9px] text-zinc-400 font-mono bg-zinc-100 px-1.5 py-0.2 rounded">
                          Historical Record
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-zinc-400 flex items-center gap-1 font-medium">
                      <Clock className="w-3 h-3 text-zinc-400" />
                      <span>{formattedDate}</span>
                      <span>•</span>
                      <span>{formattedTime}</span>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-700 leading-relaxed">
                    {item.description}
                  </p>

                  {/* Metadata preview row */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-200/60 text-[11px] text-zinc-500">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="flex items-center gap-1 font-semibold text-zinc-700">
                        <User className="w-3 h-3 text-zinc-400" />
                        <span>By: {item.performedByName}</span>
                      </span>

                      {item.relatedFunctionName && (
                        <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-zinc-200">
                          <Calendar className="w-3 h-3 text-zinc-400" />
                          <span>{item.relatedFunctionName}</span>
                        </span>
                      )}

                      {item.amount && item.amount > 0 && (
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          ₹{item.amount.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* View Receipt for Payment Events */}
                      {item.activityType === 'payment_received' && (
                        <button
                          onClick={() => handleViewReceipt(item)}
                          className="px-2.5 py-1 rounded-lg bg-zinc-900 text-white font-bold text-[10px] hover:bg-zinc-800 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <FileText className="w-3 h-3" />
                          <span>View Receipt</span>
                        </button>
                      )}

                      {/* Expand Details Toggle */}
                      {item.metadata && Object.keys(item.metadata).length > 0 && (
                        <button
                          onClick={() => toggleExpanded(item.historyId)}
                          className="text-[10px] font-semibold text-zinc-600 hover:text-zinc-900 flex items-center gap-0.5 cursor-pointer"
                        >
                          <span>{isExpanded ? 'Hide Details' : 'Details'}</span>
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Metadata Card */}
                  {isExpanded && item.metadata && (
                    <div className="mt-3 p-3 bg-white rounded-xl border border-zinc-200 text-xs space-y-1.5 animate-in fade-in duration-100">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                        Transaction & Activity Metadata
                      </span>
                      {Object.entries(item.metadata)
                        .filter(([k]) => !['isDemoData'].includes(k))
                        .map(([k, v]) => (
                          <div key={k} className="flex justify-between py-0.5 border-b border-zinc-50 text-[11px]">
                            <span className="text-zinc-500 capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                            <span className="font-semibold text-zinc-900 font-mono">
                              {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {filteredItems.length === 0 && (
            <div className="py-12 text-center text-zinc-400 text-xs">
              No history entries matching current search or filters.
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: ADD ALBUM / PRODUCT SELECTION */}
      {isAddAlbumOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-zinc-200 max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-base font-bold text-zinc-900 font-display">Record Album / Product Selection</h3>
              <button onClick={() => setIsAddAlbumOpen(false)} className="w-8 h-8 rounded-lg hover:bg-zinc-100 flex items-center justify-center text-zinc-500">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddAlbumSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">Product Type</label>
                  <select
                    value={albumFormData.productType}
                    onChange={e => setAlbumFormData({ ...albumFormData, productType: e.target.value as any })}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl"
                  >
                    <option value="album">Photo Album</option>
                    <option value="pendrive">Pendrive / Hard Drive</option>
                    <option value="printed_photos">Printed Portraits</option>
                    <option value="photo_frame">Premium Frame</option>
                    <option value="online_gallery">Online Cloud Gallery</option>
                    <option value="custom">Custom Product</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">Product Title</label>
                  <input
                    type="text"
                    value={albumFormData.name}
                    onChange={e => setAlbumFormData({ ...albumFormData, name: e.target.value })}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl"
                    required
                  />
                </div>
              </div>

              {albumFormData.productType === 'album' && (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="font-semibold text-zinc-700 block mb-1">Album Size</label>
                      <input
                        type="text"
                        value={albumFormData.size}
                        onChange={e => setAlbumFormData({ ...albumFormData, size: e.target.value })}
                        className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-zinc-700 block mb-1">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={albumFormData.quantity}
                        onChange={e => setAlbumFormData({ ...albumFormData, quantity: Number(e.target.value) })}
                        className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-zinc-700 block mb-1">Sheets Count</label>
                      <input
                        type="number"
                        min="10"
                        value={albumFormData.sheetsCount}
                        onChange={e => setAlbumFormData({ ...albumFormData, sheetsCount: Number(e.target.value) })}
                        className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-zinc-700 block mb-1">Cover Material</label>
                      <input
                        type="text"
                        value={albumFormData.coverMaterial}
                        onChange={e => setAlbumFormData({ ...albumFormData, coverMaterial: e.target.value })}
                        className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl"
                        placeholder="e.g. Leather, Velvet"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-zinc-700 block mb-1">Photos Selected</label>
                      <input
                        type="number"
                        value={albumFormData.selectedPhotosCount}
                        onChange={e => setAlbumFormData({ ...albumFormData, selectedPhotosCount: Number(e.target.value) })}
                        className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-mono"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="font-semibold text-zinc-700 block mb-1">Notes / Instructions</label>
                <input
                  type="text"
                  value={albumFormData.notes}
                  onChange={e => setAlbumFormData({ ...albumFormData, notes: e.target.value })}
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddAlbumOpen(false)}
                  className="px-4 py-2 border border-zinc-200 rounded-xl text-zinc-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-xs"
                >
                  Record Selection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD SERVICE */}
      {isAddServiceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-zinc-200 max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-base font-bold text-zinc-900 font-display">Add Photography Service</h3>
              <button onClick={() => setIsAddServiceOpen(false)} className="w-8 h-8 rounded-lg hover:bg-zinc-100 flex items-center justify-center text-zinc-500">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddServiceSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">Service Title</label>
                  <input
                    type="text"
                    value={serviceFormData.name}
                    onChange={e => setServiceFormData({ ...serviceFormData, name: e.target.value })}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">Category</label>
                  <select
                    value={serviceFormData.category}
                    onChange={e => setServiceFormData({ ...serviceFormData, category: e.target.value as any })}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl"
                  >
                    <option value="photography">Candid / Traditional Photography</option>
                    <option value="videography">Cinematography / Videography</option>
                    <option value="drone">Drone Aerial Shoot</option>
                    <option value="editing">Post-Production / Color Grading</option>
                    <option value="custom">Custom Service</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">Related Function</label>
                  <select
                    value={serviceFormData.functionId}
                    onChange={e => setServiceFormData({ ...serviceFormData, functionId: e.target.value })}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl"
                  >
                    <option value="">-- All / General Event --</option>
                    {(booking.functions || []).map(fn => (
                      <option key={fn.id} value={fn.id}>
                        {fn.name} ({fn.date})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">Assigned Employee</label>
                  <select
                    value={serviceFormData.assignedEmployeeId}
                    onChange={e => setServiceFormData({ ...serviceFormData, assignedEmployeeId: e.target.value })}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl"
                  >
                    <option value="">-- Unassigned --</option>
                    {employees.filter(e => e.employmentStatus === 'active').map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.fullName} ({emp.roleName || 'Crew'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-zinc-700 block mb-1">Service Notes</label>
                <input
                  type="text"
                  value={serviceFormData.notes}
                  onChange={e => setServiceFormData({ ...serviceFormData, notes: e.target.value })}
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddServiceOpen(false)}
                  className="px-4 py-2 border border-zinc-200 rounded-xl text-zinc-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs"
                >
                  Add Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: RECORD DELIVERY HANDOVER */}
      {isRecordDeliveryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-zinc-200 max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-base font-bold text-zinc-900 font-display">Record Deliverable Handover</h3>
              <button onClick={() => setIsRecordDeliveryOpen(false)} className="w-8 h-8 rounded-lg hover:bg-zinc-100 flex items-center justify-center text-zinc-500">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordDeliverySubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-zinc-700 block mb-1">Item Handed Over</label>
                <input
                  type="text"
                  value={deliveryFormData.itemDelivered}
                  onChange={e => setDeliveryFormData({ ...deliveryFormData, itemDelivered: e.target.value })}
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">Related Function</label>
                  <select
                    value={deliveryFormData.functionId}
                    onChange={e => setDeliveryFormData({ ...deliveryFormData, functionId: e.target.value })}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl"
                  >
                    <option value="">-- General Event Handover --</option>
                    {(booking.functions || []).map(fn => (
                      <option key={fn.id} value={fn.id}>
                        {fn.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">Delivery Method</label>
                  <select
                    value={deliveryFormData.deliveryMethod}
                    onChange={e => setDeliveryFormData({ ...deliveryFormData, deliveryMethod: e.target.value as any })}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl"
                  >
                    <option value="Google Drive">Google Drive Link</option>
                    <option value="Cloud Gallery">Online Gallery Portal</option>
                    <option value="Pendrive / Hard Drive">Pendrive / Hard Drive</option>
                    <option value="Studio Handover">Studio Physical Handover</option>
                    <option value="Courier">Courier / Dispatch</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">Quantity / Count</label>
                  <input
                    type="number"
                    value={deliveryFormData.quantity}
                    onChange={e => setDeliveryFormData({ ...deliveryFormData, quantity: Number(e.target.value) })}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">Delivered By</label>
                  <input
                    type="text"
                    value={deliveryFormData.deliveredBy}
                    onChange={e => setDeliveryFormData({ ...deliveryFormData, deliveredBy: e.target.value })}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-zinc-700 block mb-1">Drive / Gallery Link</label>
                <input
                  type="url"
                  value={deliveryFormData.linkOrReference}
                  onChange={e => setDeliveryFormData({ ...deliveryFormData, linkOrReference: e.target.value })}
                  placeholder="https://..."
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-700 block mb-1">Notes</label>
                <input
                  type="text"
                  value={deliveryFormData.notes}
                  onChange={e => setDeliveryFormData({ ...deliveryFormData, notes: e.target.value })}
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRecordDeliveryOpen(false)}
                  className="px-4 py-2 border border-zinc-200 rounded-xl text-zinc-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs"
                >
                  Confirm Delivery
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: ADD NOTE */}
      {isAddNoteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-zinc-200 max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-base font-bold text-zinc-900 font-display">Add History Note</h3>
              <button onClick={() => setIsAddNoteOpen(false)} className="w-8 h-8 rounded-lg hover:bg-zinc-100 flex items-center justify-center text-zinc-500">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddNoteSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-zinc-700 block mb-1">Note Title</label>
                <input
                  type="text"
                  value={noteFormData.title}
                  onChange={e => setNoteFormData({ ...noteFormData, title: e.target.value })}
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-700 block mb-1">Description / Content</label>
                <textarea
                  rows={3}
                  value={noteFormData.content}
                  onChange={e => setNoteFormData({ ...noteFormData, content: e.target.value })}
                  placeholder="Record customer communication, request, or internal note..."
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl"
                  required
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPrivateNote"
                  checked={noteFormData.isPrivate}
                  onChange={e => setNoteFormData({ ...noteFormData, isPrivate: e.target.checked })}
                  className="w-4 h-4 accent-zinc-900 rounded"
                />
                <label htmlFor="isPrivateNote" className="text-xs text-zinc-700 font-medium">
                  Mark as Private Internal Note (Hidden from client summaries)
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddNoteOpen(false)}
                  className="px-4 py-2 border border-zinc-200 rounded-xl text-zinc-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-xl shadow-xs"
                >
                  Save Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
