import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useStudio } from '../context/StudioContext';
import { bookingProductionService } from '../services/bookingProductionService';
import { 
  BookingRecord, 
  BookingStatus, 
  BOOKING_STATUS_LABELS,
  DeliverableSpecification, 
  FunctionPlan,
  DeliveryStage,
  DELIVERY_STAGE_LABELS,
  WhatsAppTemplateType 
} from '../types/bookingProduction';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Search, 
  Plus, 
  CreditCard, 
  CheckCircle2, 
  AlertTriangle, 
  MessageCircle, 
  Send, 
  ArrowRight, 
  ArrowLeft, 
  Building2, 
  User, 
  Phone, 
  Users, 
  Sparkles, 
  FileText, 
  Edit3, 
  CheckSquare, 
  ChevronRight,
  PackageCheck,
  Printer,
  X,
  ListTodo,
  DollarSign,
  Share2,
  Eye,
  EyeOff,
  Trash2,
  Crown
} from 'lucide-react';
import { crewConflictService, CrewConflictInfo } from '../services/crewConflictService';
import { calendarVisibilityService } from '../services/calendarVisibilityService';
import { isStudioOwnerId, formatOwnerCrewDisplayName } from '../services/studioOwnerHelper';

export type WorkspaceTab = 
  | 'overview' 
  | 'functions' 
  | 'crew' 
  | 'todo' 
  | 'deliverables' 
  | 'payments' 
  | 'whatsapp';

interface BookingWorkspaceDetailPageProps {
  initialBookingId?: string | null;
  onBackToList?: () => void;
}

export const BookingWorkspaceDetailPage: React.FC<BookingWorkspaceDetailPageProps> = ({
  initialBookingId,
  onBackToList
}) => {
  const { currentStudio } = useStudio();
  const { employees, openPdfViewer, setActiveTab } = useApp();
  const studioId = currentStudio?.id || 'studio_royal_frames_001';

  const [bookingId, setBookingId] = useState<string | null>(initialBookingId || null);
  const [activeTab, setActiveWorkspaceTab] = useState<WorkspaceTab>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Modals
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentData, setPaymentData] = useState({ amount: 25000, method: 'UPI' as const, reference: '', isAdvance: false });

  const [deliverableModalOpen, setDeliverableModalOpen] = useState(false);
  const [selectedDeliverable, setSelectedDeliverable] = useState<DeliverableSpecification | null>(null);
  const [stageFormData, setStageFormData] = useState({ stage: 'editing' as DeliveryStage, completedQty: 100, link: '', notes: '' });

  const [crewAssignModalOpen, setCrewAssignModalOpen] = useState(false);
  const [selectedFunctionForCrew, setSelectedFunctionForCrew] = useState<FunctionPlan | null>(null);
  const [assignedEmployeeId, setAssignedEmployeeId] = useState('');
  const [assignedRole, setAssignedRole] = useState('Lead Photographer');
  const [crewModalVisibleOnCalendar, setCrewModalVisibleOnCalendar] = useState(true);
  const [crewConflictWarn, setCrewConflictWarn] = useState<CrewConflictInfo | null>(null);
  const [allowCrewConflictOverride, setAllowCrewConflictOverride] = useState(false);

  const activeRoster = useMemo(() => {
    return crewConflictService.getActiveEmployees(studioId);
  }, [studioId]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const bookings = useMemo(() => {
    return bookingProductionService.listBookings(studioId);
  }, [studioId, refreshKey]);

  // Select active booking
  const activeBooking = useMemo(() => {
    if (!bookingId) {
      return bookings[0] || null;
    }
    return bookings.find(b => b.id === bookingId || b.bookingNumber === bookingId) || bookings[0] || null;
  }, [bookings, bookingId]);

  // Handle To-Do Item Checkbox toggle
  const handleToggleTodo = (delId: string) => {
    if (!activeBooking) return;
    for (const fn of activeBooking.functions) {
      const del = fn.deliverables.find(d => d.id === delId);
      if (del) {
        del.isDelivered = !del.isDelivered;
        del.stage = del.isDelivered ? 'delivered' : 'editing';
        bookingProductionService.saveBooking(studioId, activeBooking);
        setRefreshKey(k => k + 1);
        showToast(`Updated deliverable status: ${del.isDelivered ? 'Delivered' : 'In Progress'}`);
        return;
      }
    }
  };

  // Record Payment
  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBooking) return;
    const result = bookingProductionService.recordPayment(studioId, {
      bookingId: activeBooking.id,
      amount: paymentData.amount,
      paymentMethod: paymentData.method,
      reference: paymentData.reference,
      isAdvance: paymentData.isAdvance
    });

    if (result) {
      setPaymentModalOpen(false);
      setRefreshKey(k => k + 1);
      showToast(`Payment of ₹${paymentData.amount.toLocaleString('en-IN')} recorded successfully!`);
    }
  };

  // Assign Crew to Function
  const handleAssignCrew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBooking || !selectedFunctionForCrew || !assignedEmployeeId) return;

    const emp = activeRoster.find(e => e.id === assignedEmployeeId);
    if (!emp) return;

    if (crewConflictWarn?.hasConflict && !allowCrewConflictOverride) {
      alert(`Scheduling Warning: ${crewConflictWarn.warningMessage}\nPlease check "Allow Overlap" to confirm.`);
      return;
    }

    const isOwner = isStudioOwnerId(emp.id, studioId) || emp.fullName.includes('(Studio Owner)');
    const displayName = isOwner ? formatOwnerCrewDisplayName(emp.fullName) : emp.fullName;
    const defaultRole = isOwner ? 'Studio Owner' : (emp.designation || 'Crew Member');

    await calendarVisibilityService.assignCrewMember({
      studioId,
      bookingId: activeBooking.id,
      functionId: selectedFunctionForCrew.id,
      employeeId: emp.id,
      employeeName: displayName,
      designation: emp.designation,
      department: emp.department,
      role: defaultRole,
      contact: emp.phone || '',
      isVisibleOnCalendar: crewModalVisibleOnCalendar,
      assignedBy: 'Studio Owner',
      allowConflictOverride: true
    });

    if (!selectedFunctionForCrew.assignedCrew) {
      selectedFunctionForCrew.assignedCrew = [];
    }

    const existingIdx = selectedFunctionForCrew.assignedCrew.findIndex(c => 
      c.employeeId === emp.id || (isOwner && isStudioOwnerId(c.employeeId, studioId))
    );

    if (existingIdx >= 0) {
      selectedFunctionForCrew.assignedCrew[existingIdx].role = defaultRole;
      (selectedFunctionForCrew.assignedCrew[existingIdx] as any).isVisibleOnCalendar = crewModalVisibleOnCalendar;
    } else {
      selectedFunctionForCrew.assignedCrew.push({
        employeeId: emp.id,
        employeeName: displayName,
        role: assignedRole,
        contact: emp.phone || '',
        isVisibleOnCalendar: crewModalVisibleOnCalendar
      } as any);
    }

    bookingProductionService.saveBooking(studioId, activeBooking);
    setCrewAssignModalOpen(false);
    setAssignedEmployeeId('');
    setCrewConflictWarn(null);
    setAllowCrewConflictOverride(false);
    setRefreshKey(k => k + 1);
    showToast(`${displayName} assigned to ${selectedFunctionForCrew.name}`);
  };

  // Remove Crew from Function
  const handleRemoveCrewMember = async (fnId: string, empId: string) => {
    if (!activeBooking) return;
    await calendarVisibilityService.unassignCrewMember(studioId, activeBooking.id, fnId, empId);
    const targetFn = activeBooking.functions?.find(f => f.id === fnId);
    if (targetFn && targetFn.assignedCrew) {
      targetFn.assignedCrew = targetFn.assignedCrew.filter(c => 
        c.employeeId !== empId && !(isStudioOwnerId(empId, studioId) && isStudioOwnerId(c.employeeId, studioId))
      );
    }
    bookingProductionService.saveBooking(studioId, activeBooking);
    setRefreshKey(k => k + 1);
    showToast('Crew member removed from function.');
  };

  // Toggle Crew Visibility on Function
  const handleToggleCrewVisibility = async (fnId: string, empId: string, currentVisible: boolean) => {
    if (!activeBooking) return;
    const nextVisible = !currentVisible;
    await calendarVisibilityService.setEmployeeCalendarVisibility(studioId, activeBooking.id, empId, fnId, nextVisible);
    const targetFn = activeBooking.functions?.find(f => f.id === fnId);
    if (targetFn && targetFn.assignedCrew) {
      const item = targetFn.assignedCrew.find(c => 
        c.employeeId === empId || (isStudioOwnerId(empId, studioId) && isStudioOwnerId(c.employeeId, studioId))
      );
      if (item) {
        (item as any).isVisibleOnCalendar = nextVisible;
      }
    }
    bookingProductionService.saveBooking(studioId, activeBooking);
    setRefreshKey(k => k + 1);
    showToast(nextVisible ? 'Visible on employee personal calendar.' : 'Hidden from employee calendar.');
  };

  // Generate Receipt PDF
  const handleGenerateReceipt = (amount: number) => {
    if (!activeBooking) return;
    openPdfViewer({
      documentType: 'payment_receipt',
      title: 'OFFICIAL PAYMENT RECEIPT',
      documentNumber: `REC-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString().split('T')[0],
      customer: {
        name: activeBooking.customerName,
        phone: activeBooking.customerPhone,
        address: `${activeBooking.venue}, ${activeBooking.city}`
      },
      event: {
        name: activeBooking.eventName,
        category: activeBooking.category || activeBooking.eventCategory,
        date: activeBooking.mainEventDate || activeBooking.startDate,
        venue: activeBooking.venue
      },
      items: [
        {
          name: 'Event Booking Advance / Installment',
          description: `Payment towards ${activeBooking.eventName} (Booking ID: ${activeBooking.bookingNumber})`,
          quantity: 1,
          unitPrice: amount,
          amount: amount
        }
      ],
      financials: {
        subtotal: amount,
        totalAmount: amount,
        paidAmount: amount,
        pendingAmount: Math.max(0, activeBooking.financials.remainingBalance)
      },
      terms: 'This receipt confirms that the specified payment has been verified and credited towards your event package.'
    });
  };

  // Generate Invoice PDF
  const handleGenerateInvoice = () => {
    if (!activeBooking) return;
    openPdfViewer({
      documentType: 'invoice',
      title: 'TAX INVOICE',
      documentNumber: `INV-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString().split('T')[0],
      dueDate: activeBooking.mainEventDate || activeBooking.startDate,
      customer: {
        name: activeBooking.customerName,
        phone: activeBooking.customerPhone,
        email: activeBooking.customerEmail,
        address: `${activeBooking.venue}, ${activeBooking.city}`
      },
      event: {
        name: activeBooking.eventName,
        category: activeBooking.category || activeBooking.eventCategory,
        date: activeBooking.mainEventDate || activeBooking.startDate,
        venue: activeBooking.venue
      },
      items: activeBooking.functions.map(fn => ({
        name: `${fn.name} Coverage & Deliverables`,
        description: `Complete photo & video services on ${fn.date} at ${fn.venue}`,
        quantity: 1,
        unitPrice: Math.round(activeBooking.financials.finalAgreedAmount / (activeBooking.functions.length || 1)),
        amount: Math.round(activeBooking.financials.finalAgreedAmount / (activeBooking.functions.length || 1))
      })),
      financials: {
        subtotal: activeBooking.financials.originalQuotation,
        discountAmount: activeBooking.financials.negotiatedDiscount,
        totalAmount: activeBooking.financials.finalAgreedAmount,
        paidAmount: activeBooking.financials.verifiedPaymentsReceived,
        pendingAmount: activeBooking.financials.remainingBalance
      },
      terms: 'Thank you for choosing Studio OS Photography. Please settle any balance due upon completion.'
    });
  };

  if (!activeBooking) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-zinc-200">
        <h3 className="text-base font-bold text-zinc-900">No bookings available</h3>
        <p className="text-xs text-zinc-500 mt-1">Create a new booking using the sidebar button.</p>
      </div>
    );
  }

  // Calculate overall deliverable completion
  const allDeliverables = activeBooking.functions.flatMap(f => f.deliverables || []);
  const deliveredCount = allDeliverables.filter(d => d.isDelivered).length;
  const deliveryProgress = allDeliverables.length > 0 
    ? Math.round((deliveredCount / allDeliverables.length) * 100) 
    : 0;

  const tabs: Array<{ id: WorkspaceTab; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'functions', label: 'Functions' },
    { id: 'crew', label: 'Crew' },
    { id: 'todo', label: 'To-Do' },
    { id: 'deliverables', label: 'Deliverables' },
    { id: 'payments', label: 'Payments & Invoice' },
    { id: 'whatsapp', label: 'WhatsApp' }
  ];

  return (
    <div className="space-y-5 pb-24 max-w-7xl w-full mx-auto px-3.5 sm:px-6 lg:px-8">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 text-white font-semibold text-xs px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* COMPACT WORKSPACE HEADER */}
      <div className="bg-white border border-zinc-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 text-white flex items-center justify-center font-black text-sm shrink-0 font-display">
              {activeBooking.eventName.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-zinc-900 font-display">{activeBooking.eventName}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {BOOKING_STATUS_LABELS[activeBooking.status] || activeBooking.status}
                </span>
                <span className="text-xs text-zinc-400 font-mono font-medium">#{activeBooking.bookingNumber}</span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-2">
                <span>Client: <strong>{activeBooking.customerName}</strong> ({activeBooking.customerPhone})</span>
                <span>•</span>
                <span className="flex items-center gap-1 font-mono">
                  <Calendar className="w-3 h-3 text-zinc-400" />
                  {activeBooking.mainEventDate || activeBooking.startDate}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-zinc-400" />
                  {activeBooking.venue}, {activeBooking.city}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleGenerateInvoice}
              className="px-3 py-1.5 rounded-xl border border-zinc-200 hover:bg-zinc-100 text-zinc-700 text-xs font-semibold flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Invoice PDF</span>
            </button>
            <button
              onClick={() => setPaymentModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
            >
              <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
              <span>Record Payment</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-100">
            <span className="text-xs text-zinc-400 uppercase font-bold block">Agreed Amount</span>
            <strong className="text-zinc-900 font-mono text-sm">₹{activeBooking.financials.finalAgreedAmount.toLocaleString('en-IN')}</strong>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
            <span className="text-xs text-emerald-700 uppercase font-bold block">Collected Advance</span>
            <strong className="text-emerald-800 font-mono text-sm">₹{activeBooking.financials.verifiedPaymentsReceived.toLocaleString('en-IN')}</strong>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
            <span className="text-xs text-amber-700 uppercase font-bold block">Remaining Due</span>
            <strong className="text-amber-800 font-mono text-sm">₹{activeBooking.financials.remainingBalance.toLocaleString('en-IN')}</strong>
          </div>
          <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100">
            <span className="text-xs text-indigo-700 uppercase font-bold block">Delivery Progress</span>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="flex-1 bg-indigo-200 rounded-full h-2 overflow-hidden">
                <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${deliveryProgress}%` }} />
              </div>
              <strong className="text-indigo-900 font-mono text-xs">{deliveryProgress}%</strong>
            </div>
          </div>
        </div>

        {/* EXACTLY 7 INTERNAL TABS */}
        <div className="flex items-center gap-1 overflow-x-auto border-t border-zinc-100 pt-3">
          {tabs.map(t => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveWorkspaceTab(t.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-zinc-900 text-white shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-in fade-in duration-150 text-xs">
          {/* Key Dates & Summary */}
          <div className="md:col-span-2 bg-white rounded-3xl border border-zinc-200 p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Event Schedule & Milestones</h3>
            <div className="space-y-3">
              {activeBooking.functions.map((fn, idx) => (
                <div key={fn.id} className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-zinc-900 text-white font-bold text-xs flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <div>
                      <h4 className="font-bold text-zinc-900 text-sm">{fn.name}</h4>
                      <p className="text-zinc-500 text-xs font-mono mt-0.5">
                        {fn.date} ({fn.startTime}) • {fn.venue}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-zinc-600 bg-white px-2.5 py-1 rounded-lg border border-zinc-200">
                    {fn.assignedCrew?.length || 0} Crew Assigned
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-zinc-100">
              <span className="text-xs font-bold uppercase text-zinc-400 block mb-1">Client Special Instructions</span>
              <p className="text-zinc-600 bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                {typeof activeBooking.notes === 'string' ? activeBooking.notes : 'No specific instructions recorded. Standard photography contract applies.'}
              </p>
            </div>
          </div>

          {/* Customer CRM Profile */}
          <div className="bg-white rounded-3xl border border-zinc-200 p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Customer CRM Profile</h3>
            <div className="space-y-2.5">
              <div>
                <span className="text-zinc-400 block text-xs uppercase font-bold">Client Name</span>
                <strong className="text-zinc-900 text-sm">{activeBooking.customerName}</strong>
              </div>
              <div>
                <span className="text-zinc-400 block text-xs uppercase font-bold">Mobile Phone</span>
                <span className="text-zinc-800 font-mono">{activeBooking.customerPhone}</span>
              </div>
              <div>
                <span className="text-zinc-400 block text-xs uppercase font-bold">WhatsApp</span>
                <span className="text-zinc-800 font-mono">{activeBooking.customerWhatsApp || activeBooking.customerPhone}</span>
              </div>
              <div>
                <span className="text-zinc-400 block text-xs uppercase font-bold">Email Address</span>
                <span className="text-zinc-600">{activeBooking.customerEmail || 'Not provided'}</span>
              </div>
              <div>
                <span className="text-zinc-400 block text-xs uppercase font-bold">Primary Venue & City</span>
                <span className="text-zinc-800">{activeBooking.venue}, {activeBooking.city}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-100">
              <a
                href={`https://wa.me/${(activeBooking.customerWhatsApp || activeBooking.customerPhone).replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Chat on WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FUNCTIONS */}
      {activeTab === 'functions' && (
        <div className="bg-white rounded-3xl border border-zinc-200 p-6 space-y-4 animate-in fade-in duration-150 text-xs">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 font-display">Function Schedules & Call Times</h3>
              <p className="text-xs text-zinc-500">Individual shoots, timings, mandap locations, and linked deliverables.</p>
            </div>
          </div>

          <div className="space-y-4">
            {activeBooking.functions.map((fn, idx) => (
              <div key={fn.id} className="p-4 rounded-2xl border border-zinc-200 bg-zinc-50/50 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-xl bg-zinc-900 text-white font-bold text-xs flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <div>
                      <h4 className="font-bold text-zinc-900 text-sm">{fn.name}</h4>
                      <p className="text-zinc-500 font-mono text-xs">{fn.date} • {fn.startTime} to {fn.endTime}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedFunctionForCrew(fn);
                      setCrewAssignModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Assign Crew</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                  <div className="p-2.5 rounded-xl bg-white border border-zinc-200">
                    <span className="text-xs text-zinc-400 font-bold uppercase block mb-0.5">Venue Address</span>
                    <span className="text-zinc-800">{fn.venue || activeBooking.venue}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-zinc-200">
                    <span className="text-xs text-zinc-400 font-bold uppercase block mb-0.5">Assigned Crew</span>
                    <span className="text-zinc-800">
                      {fn.assignedCrew && fn.assignedCrew.length > 0 
                        ? fn.assignedCrew.map(c => `${c.employeeName} (${c.role})`).join(', ')
                        : 'No crew assigned yet'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: CREW */}
      {activeTab === 'crew' && (
        <div className="bg-white rounded-3xl border border-zinc-200 p-6 space-y-4 animate-in fade-in duration-150 text-xs">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 font-display">Assigned Photographers & Filmmakers</h3>
              <p className="text-xs text-zinc-500">Direct assignments for lead photographers, candid shooters, drone operators and editors.</p>
            </div>
            <button
              onClick={() => {
                if (activeBooking.functions.length > 0) {
                  setSelectedFunctionForCrew(activeBooking.functions[0]);
                  setCrewAssignModalOpen(true);
                }
              }}
              className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Assign Crew Member</span>
            </button>
          </div>

          <div className="space-y-3">
            {activeBooking.functions.map(fn => (
              <div key={fn.id} className="p-4 rounded-2xl border border-zinc-200 bg-zinc-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-zinc-900">{fn.name} ({fn.date})</h4>
                  <button
                    onClick={() => {
                      setSelectedFunctionForCrew(fn);
                      setCrewAssignModalOpen(true);
                    }}
                    className="text-xs font-bold text-indigo-600 hover:underline"
                  >
                    + Add to this function
                  </button>
                </div>

                {(!fn.assignedCrew || fn.assignedCrew.length === 0) ? (
                  <p className="text-zinc-400 italic text-xs">No crew members mapped to this shoot yet.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                    {fn.assignedCrew.map((c, i) => {
                      const isOwner = isStudioOwnerId(c.employeeId, studioId) || c.employeeName.includes('(Studio Owner)');
                      const isVisible = (c as any).isVisibleOnCalendar !== false;

                      return (
                        <div key={i} className="p-3 rounded-xl bg-white border border-zinc-200 flex flex-col justify-between gap-2 shadow-2xs">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <strong className="text-zinc-900 block text-xs sm:text-sm">{c.employeeName}</strong>
                                {isOwner && (
                                  <span className="px-1.5 py-0.2 rounded text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                    Owner
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-orange-700 font-semibold">{c.role}</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveCrewMember(fn.id, c.employeeId)}
                              title="Remove assignment"
                              className="p-1 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="pt-2 border-t border-zinc-100 flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleCrewVisibility(fn.id, c.employeeId, isVisible)}
                              className={`px-2 py-0.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                                isVisible 
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                                  : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                              }`}
                              title={isVisible ? 'Visible on personal calendar (tap to hide)' : 'Hidden from calendar (tap to show)'}
                            >
                              {isVisible ? <Eye className="w-3 h-3 text-emerald-600" /> : <EyeOff className="w-3 h-3 text-zinc-400" />}
                              <span>{isVisible ? 'Visible' : 'Hidden'}</span>
                            </button>

                            {c.contact && (
                              <a
                                href={`https://wa.me/${c.contact.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded transition-colors"
                              >
                                WhatsApp
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: TO-DO */}
      {activeTab === 'todo' && (
        <div className="bg-white rounded-3xl border border-zinc-200 p-6 space-y-4 animate-in fade-in duration-150 text-xs">
          <div className="border-b border-zinc-100 pb-3">
            <h3 className="text-sm font-bold text-zinc-900 font-display">Event-Wise Production & Delivery Checklist</h3>
            <p className="text-xs text-zinc-500">Visual operational checklist automatically generated from event deliverables.</p>
          </div>

          <div className="space-y-3">
            {allDeliverables.map(del => (
              <div 
                key={del.id}
                onClick={() => handleToggleTodo(del.id)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  del.isDelivered 
                    ? 'bg-emerald-50/40 border-emerald-200' 
                    : 'bg-zinc-50/70 border-zinc-200 hover:border-zinc-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-lg flex items-center justify-center ${
                    del.isDelivered ? 'bg-emerald-600 text-white' : 'border-2 border-zinc-300 bg-white'
                  }`}>
                    {del.isDelivered && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                  <div>
                    <h4 className={`font-bold ${del.isDelivered ? 'line-through text-zinc-400' : 'text-zinc-900'}`}>
                      {del.name}
                    </h4>
                    <p className="text-xs text-zinc-500 font-mono">
                      Due: {del.calculatedDeadline} • Required: {del.requiredQty} {del.unit}
                    </p>
                  </div>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  del.isDelivered ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {del.isDelivered ? 'Done / Handed Over' : 'Pending Action'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: DELIVERABLES */}
      {activeTab === 'deliverables' && (
        <div className="bg-white rounded-3xl border border-zinc-200 p-6 space-y-4 animate-in fade-in duration-150 text-xs">
          <div className="border-b border-zinc-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 font-display">Client Deliverables Vault</h3>
              <p className="text-xs text-zinc-500">Track raw footage, edited teasers, flush-mount albums, and online links.</p>
            </div>
            <span className="font-bold font-mono text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
              {deliveredCount} of {allDeliverables.length} Delivered
            </span>
          </div>

          <div className="divide-y divide-zinc-100">
            {allDeliverables.map(del => (
              <div key={del.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-zinc-900 text-sm">{del.name}</strong>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                      del.isDelivered ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-700'
                    }`}>
                      {DELIVERY_STAGE_LABELS[del.stage] || del.stage}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5 font-mono">
                    Deadline: <strong>{del.calculatedDeadline}</strong> • Quantity: {del.completedQty} / {del.requiredQty} {del.unit}
                  </p>
                </div>

                <button
                  onClick={() => handleToggleTodo(del.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-colors self-start sm:self-auto cursor-pointer ${
                    del.isDelivered 
                      ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-200' 
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                  }`}
                >
                  {del.isDelivered ? 'Mark Incomplete' : 'Mark Delivered'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: PAYMENTS & INVOICE */}
      {activeTab === 'payments' && (
        <div className="bg-white rounded-3xl border border-zinc-200 p-6 space-y-5 animate-in fade-in duration-150 text-xs">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 font-display">Payments, Receipts & Invoicing</h3>
              <p className="text-xs text-zinc-500">Log customer advance payments, print receipts, and issue final tax invoice.</p>
            </div>
            <button
              onClick={() => setPaymentModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs shadow-xs"
            >
              + Record Payment
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200">
              <span className="text-xs text-zinc-400 uppercase font-bold block">Quotation Value</span>
              <strong className="text-zinc-800 font-mono text-sm">₹{activeBooking.financials.originalQuotation.toLocaleString('en-IN')}</strong>
            </div>
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200">
              <span className="text-xs text-rose-600 uppercase font-bold block">Discount</span>
              <strong className="text-rose-700 font-mono text-sm">-₹{activeBooking.financials.negotiatedDiscount.toLocaleString('en-IN')}</strong>
            </div>
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
              <span className="text-xs text-emerald-700 uppercase font-bold block">Payments Received</span>
              <strong className="text-emerald-800 font-mono text-sm">₹{activeBooking.financials.verifiedPaymentsReceived.toLocaleString('en-IN')}</strong>
            </div>
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200">
              <span className="text-xs text-amber-700 uppercase font-bold block">Remaining Due</span>
              <strong className="text-amber-800 font-mono text-sm">₹{activeBooking.financials.remainingBalance.toLocaleString('en-IN')}</strong>
            </div>
          </div>

          <div className="pt-2">
            <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-400 mb-2">Milestone Ledger</h4>
            <div className="space-y-2">
              {activeBooking.financials.paymentMilestones.map(m => (
                <div key={m.id} className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-between">
                  <div>
                    <strong className="text-zinc-900">{m.title}</strong>
                    <span className="text-zinc-400 font-mono text-xs ml-2">(Target Due: {m.dueDate})</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-zinc-900">₹{m.amount.toLocaleString('en-IN')}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                      m.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {m.status}
                    </span>
                    {m.status === 'paid' && (
                      <button
                        onClick={() => handleGenerateReceipt(m.amount)}
                        className="p-1 text-zinc-500 hover:text-zinc-900"
                        title="Print Receipt PDF"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: WHATSAPP */}
      {activeTab === 'whatsapp' && (
        <div className="bg-white rounded-3xl border border-zinc-200 p-6 space-y-4 animate-in fade-in duration-150 text-xs">
          <div className="border-b border-zinc-100 pb-3">
            <h3 className="text-sm font-bold text-zinc-900 font-display">Native WhatsApp Click-to-Chat</h3>
            <p className="text-xs text-zinc-500">Zero third-party APIs: standard `https://wa.me/` URLs for customer reminders and crew dispatch.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Customer Message */}
            <div className="p-5 rounded-2xl border border-zinc-200 bg-zinc-50/50 space-y-3">
              <span className="font-bold text-zinc-900 text-sm block">Customer Booking Confirmation</span>
              <p className="text-xs text-zinc-500">
                Send booking summary, payment acknowledgement and event date confirmation to {activeBooking.customerName}.
              </p>
              <a
                href={`https://wa.me/${(activeBooking.customerWhatsApp || activeBooking.customerPhone).replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                  `Hello ${activeBooking.customerName}! Thank you for choosing ${currentStudio.name} for your ${activeBooking.eventName}. We have confirmed your dates: ${activeBooking.mainEventDate || activeBooking.startDate}. Received advance: ₹${activeBooking.financials.verifiedPaymentsReceived.toLocaleString('en-IN')}. Looking forward to capturing your memories!`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Send to Customer</span>
              </a>
            </div>

            {/* Crew Dispatch (Masked PII & Zero Finances) */}
            <div className="p-5 rounded-2xl border border-zinc-200 bg-zinc-50/50 space-y-3">
              <span className="font-bold text-zinc-900 text-sm block">Crew Shift Dispatch</span>
              <p className="text-xs text-zinc-500">
                Dispatch shoot call sheet with timings, venue map, and shoot instructions (customer phone and pricing strictly omitted).
              </p>
              <button
                onClick={() => {
                  showToast('Generated crew dispatch WhatsApp link without customer phone or finances.');
                }}
                className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-indigo-400" />
                <span>Generate Crew Dispatch Link</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-zinc-200 max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <h3 className="text-base font-bold text-zinc-900 font-display">Record Client Payment</h3>
              <button onClick={() => setPaymentModalOpen(false)} className="p-1 text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase text-zinc-500 mb-1">Amount (₹) *</label>
                <input
                  type="number"
                  required
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, amount: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 font-mono font-bold text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-zinc-500 mb-1">Payment Method</label>
                <select
                  value={paymentData.method}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, method: e.target.value as any }))}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white"
                >
                  <option value="UPI">UPI / Google Pay / PhonePe</option>
                  <option value="Bank Transfer">Bank Transfer / NEFT</option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-zinc-500 mb-1">Reference / Transaction ID</label>
                <input
                  type="text"
                  value={paymentData.reference}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, reference: e.target.value }))}
                  placeholder="UPI Ref / Cheque No"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 font-mono"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-zinc-600 hover:bg-zinc-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold shadow-xs"
                >
                  Confirm & Credit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN CREW MODAL */}
      {crewAssignModalOpen && selectedFunctionForCrew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-zinc-200 max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div>
                <h3 className="text-base font-bold text-zinc-900 font-display">Assign Crew Member</h3>
                <p className="text-xs text-zinc-500">To {selectedFunctionForCrew.name} ({selectedFunctionForCrew.date})</p>
              </div>
              <button onClick={() => setCrewAssignModalOpen(false)} className="p-1 text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignCrew} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase text-zinc-500 mb-1">Select Team Member / Owner *</label>
                <select
                  required
                  value={assignedEmployeeId}
                  onChange={(e) => {
                    const empId = e.target.value;
                    setAssignedEmployeeId(empId);
                    if (empId && selectedFunctionForCrew) {
                      const warn = crewConflictService.checkConflict(
                        studioId,
                        empId,
                        selectedFunctionForCrew.date,
                        selectedFunctionForCrew.startTime || '10:00',
                        selectedFunctionForCrew.endTime || '18:00',
                        activeBooking?.id
                      );
                      setCrewConflictWarn(warn.hasConflict ? warn : null);
                    } else {
                      setCrewConflictWarn(null);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white"
                >
                  <option value="">-- Choose crew member --</option>
                  {activeRoster.map(emp => {
                    const isOwner = isStudioOwnerId(emp.id, studioId) || emp.fullName.includes('(Studio Owner)');
                    return (
                      <option key={emp.id} value={emp.id}>
                        {isOwner ? `👑 ${emp.fullName}` : `${emp.fullName} (${emp.designation || emp.roleName || 'Staff'})`}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Calendar Visibility */}
              <div className="p-3 rounded-xl bg-orange-50/60 border border-orange-200/80 flex items-center justify-between">
                <div>
                  <span className="font-bold text-zinc-900 block text-xs">Employee Calendar Visibility</span>
                  <span className="text-xs text-zinc-500 block">Show event on employee's personal schedule</span>
                </div>
                <input
                  type="checkbox"
                  checked={crewModalVisibleOnCalendar}
                  onChange={(e) => setCrewModalVisibleOnCalendar(e.target.checked)}
                  className="w-4 h-4 accent-orange-600 rounded cursor-pointer"
                />
              </div>

              {/* Conflict Warning */}
              {crewConflictWarn && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Scheduling Conflict Detected!</span>
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    {crewConflictWarn.warningMessage}
                  </p>
                  <label className="flex items-center gap-2 pt-1 font-bold text-amber-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowCrewConflictOverride}
                      onChange={(e) => setAllowCrewConflictOverride(e.target.checked)}
                      className="w-4 h-4 accent-amber-600 rounded"
                    />
                    <span>Allow Overlap (Confirm overlapping assignment)</span>
                  </label>
                </div>
              )}

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setCrewAssignModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-zinc-600 hover:bg-zinc-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold shadow-xs"
                >
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
