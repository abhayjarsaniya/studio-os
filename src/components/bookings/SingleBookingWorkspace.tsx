import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { useStudio } from '../../context/StudioContext';
import { bookingProductionService } from '../../services/bookingProductionService';
import { firestoreService } from '../../services/firestoreService';
import { 
  BookingRecord, 
  BookingStatus, 
  BOOKING_STATUS_LABELS,
  DeliverableSpecification, 
  FunctionPlan,
  DeliveryStage 
} from '../../types/bookingProduction';
import { 
  ArrowLeft,
  Calendar, 
  Clock, 
  MapPin, 
  Phone, 
  Mail, 
  User, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  Clock3,
  Loader2,
  MessageCircle, 
  Send, 
  FileText, 
  Printer, 
  Plus, 
  Edit3, 
  Trash2, 
  IndianRupee, 
  PackageCheck, 
  Sparkles,
  ChevronDown,
  X,
  Share2,
  Copy,
  ExternalLink,
  ShieldCheck,
  CheckSquare,
  History,
  Eye,
  EyeOff
} from 'lucide-react';
import { CompleteBookingHistoryTab } from './CompleteBookingHistoryTab';
import { bookingHistoryService } from '../../services/bookingHistoryService';
import { calendarVisibilityService } from '../../services/calendarVisibilityService';
import { useOutsideClick } from '../../hooks/useOutsideClick';
import { generateDeliverablesForCategory } from '../../services/deliverablesPresetService';
import { crewConflictService, CrewConflictInfo } from '../../services/crewConflictService';
import { isStudioOwnerId } from '../../services/studioOwnerHelper';
import { StudioEvent } from '../../types';

interface SingleBookingWorkspaceProps {
  bookingId: string;
  onBack?: () => void;
}

export type BookingSectionTab = 'details' | 'money' | 'delivery' | 'messages' | 'history';

const STANDARD_DELIVERABLES = [
  { id: 'photo_culling', name: 'Photo Culling', category: 'photography', days: 2 },
  { id: 'photo_editing', name: 'Photo Editing', category: 'photography', days: 10 },
  { id: 'video_teaser', name: 'Video Teaser', category: 'videography', days: 7 },
  { id: 'full_video_edit', name: 'Full Video Edit', category: 'videography', days: 25 },
  { id: 'album_design', name: 'Album Design', category: 'album', days: 20 },
  { id: 'album_printing', name: 'Album Printing', category: 'album', days: 35 },
  { id: 'final_handover', name: 'Final Handover', category: 'custom', days: 40 }
];

export const SingleBookingWorkspace: React.FC<SingleBookingWorkspaceProps> = ({
  bookingId,
  onBack
}) => {
  const { currentStudio } = useStudio();
  const { employees, openPdfViewer, setActiveTab, setEditingEvent, setIsEventFormOpen, currentUser } = useApp();
  const studioId = currentStudio?.id || 'studio_shreeji_films';

  const userRole = localStorage.getItem('studio_os_user_role') || (currentUser as any)?.role || 'owner';
  const isOwner = userRole === 'owner' || userRole === 'studio_owner' || userRole === 'platform_master_admin';

  const [activeSection, setActiveSection] = useState<BookingSectionTab>('details');
  const [refreshKey, setRefreshKey] = useState(0);

  // Status & PDF dropdown toggle with outside-click detection
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isPdfDropdownOpen, setIsPdfDropdownOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const pdfDropdownRef = useRef<HTMLDivElement>(null);
  const customDelRef = useRef<HTMLDivElement>(null);

  useOutsideClick(statusDropdownRef, () => setIsStatusDropdownOpen(false), isStatusDropdownOpen);
  useOutsideClick(pdfDropdownRef, () => setIsPdfDropdownOpen(false), isPdfDropdownOpen);

  // Delete Event Booking State (Requirement 2)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingBooking, setIsDeletingBooking] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Escape key closes delete modal
  useEffect(() => {
    if (!isDeleteModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeletingBooking) {
        setIsDeleteModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDeleteModalOpen, isDeletingBooking]);

  // Modals
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(25000);
  const [paymentMode, setPaymentMode] = useState<'UPI' | 'Cash' | 'Bank Transfer' | 'Card'>('UPI');
  const [paymentRef, setPaymentRef] = useState(`REF-${Date.now().toString().slice(-6)}`);
  const [paymentNote, setPaymentNote] = useState('');

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerWhatsApp: '',
    customerEmail: '',
    city: '',
    eventName: '',
    eventDate: '',
    venue: '',
    category: 'Wedding',
    notes: '',
    finalAgreedAmount: 0,
    originalQuotation: 0,
    negotiatedDiscount: 0
  });

  // Instant Auto-Save State & Engine
  const [instantSaveStatus, setInstantSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  const [instantSaveMsg, setInstantSaveMsg] = useState<string>('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const debounceTimerRef = useRef<any>(null);

  const [isCrewModalOpen, setIsCrewModalOpen] = useState(false);
  const [selectedCrewEmployeeId, setSelectedCrewEmployeeId] = useState('');
  const [selectedCrewFunctionId, setSelectedCrewFunctionId] = useState<string>('all');
  const [selectedCrewRole, setSelectedCrewRole] = useState('Lead Photographer');
  const [crewModalVisibleOnCalendar, setCrewModalVisibleOnCalendar] = useState(true);
  const [crewConflictWarn, setCrewConflictWarn] = useState<CrewConflictInfo | null>(null);
  const [allowCrewConflictOverride, setAllowCrewConflictOverride] = useState(false);

  // Deliverables customization
  const [showAddCustomDel, setShowAddCustomDel] = useState(false);
  const [customDelName, setCustomDelName] = useState('');
  const [customDelCat, setCustomDelCat] = useState<'photography' | 'video' | 'physical' | 'digital'>('photography');
  const [customDelDueDate, setCustomDelDueDate] = useState('');
  useOutsideClick(customDelRef, () => setShowAddCustomDel(false), showAddCustomDel);

  // WhatsApp templates state
  const [activeWhatsAppTemplate, setActiveWhatsAppTemplate] = useState<
    'booking_confirmation' | 'payment_receipt' | 'event_reminder' | 'delivery_ready'
  >('booking_confirmation');

  // Internal Notes State
  const [newInternalNote, setNewInternalNote] = useState('');

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Load current booking
  const booking = useMemo(() => {
    const list = bookingProductionService.listBookings(studioId);
    return list.find(b => b.id === bookingId || (b as any).bookingNumber === bookingId) || null;
  }, [studioId, bookingId, refreshKey]);

  // Sync edit form on load
  useEffect(() => {
    if (booking) {
      setEditFormData({
        customerName: booking.customerName || '',
        customerPhone: booking.customerPhone || '',
        customerWhatsApp: booking.customerWhatsApp || booking.customerPhone || '',
        customerEmail: booking.customerEmail || '',
        city: booking.city || '',
        eventName: booking.eventName || '',
        eventDate: booking.mainEventDate || booking.startDate || '',
        venue: booking.venue || '',
        category: (booking.category as any) || 'Wedding',
        notes: booking.notes || booking.description || '',
        finalAgreedAmount: booking.financials?.finalAgreedAmount || 0,
        originalQuotation: booking.financials?.originalQuotation || 0,
        negotiatedDiscount: booking.financials?.negotiatedDiscount || 0
      });
    }
  }, [booking]);

  // Instant Auto-Save Engine for all booking controls
  const autoSaveBookingChange = useCallback(async (updates: Partial<BookingRecord>, immediate: boolean = false) => {
    if (!booking) return;

    // Apply updates directly to the in-memory booking object for instant reactivity
    Object.assign(booking, updates);
    booking.updatedAt = new Date().toISOString();

    if (updates.mainEventDate) {
      booking.mainEventDate = updates.mainEventDate;
      booking.startDate = updates.mainEventDate;
    }

    const executePersistence = async () => {
      setInstantSaveStatus('saving');
      setInstantSaveMsg('Saving...');
      firestoreService.setStatus('saving', 'Saving booking...');

      try {
        await bookingProductionService.saveBooking(studioId, booking);
        setInstantSaveStatus('saved');
        setInstantSaveMsg('Saved');
        firestoreService.setStatus('saved', 'Booking saved');
        setRefreshKey(k => k + 1);

        setTimeout(() => {
          setInstantSaveStatus('idle');
        }, 2500);
      } catch (err: any) {
        console.error('Instant save error:', err);
        setInstantSaveStatus('failed');
        setInstantSaveMsg('Sync failed — retrying');
        firestoreService.setStatus('error', 'Auto-save failed');
      }
    };

    if (immediate) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      await executePersistence();
    } else {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        executePersistence();
      }, 500);
    }
  }, [booking, studioId]);

  if (!booking) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-zinc-200 max-w-xl mx-auto space-y-4">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
        <h3 className="text-base font-bold text-zinc-900">Booking Not Found</h3>
        <p className="text-xs text-zinc-500">
          The requested booking ID <code className="bg-zinc-100 px-2 py-0.5 rounded">{bookingId}</code> does not exist or has been archived.
        </p>
        <button
          onClick={() => {
            if (onBack) onBack();
            else {
              setActiveTab('bookings');
              window.location.hash = '#/app/bookings';
            }
          }}
          className="min-h-[44px] px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs active:scale-95 transition-all"
        >
          Return to All Bookings
        </button>
      </div>
    );
  }

  const { financials } = booking;
  const originalQuotation = financials?.originalQuotation || 0;
  const negotiatedDiscount = financials?.negotiatedDiscount || 0;
  const finalAgreedAmount = financials?.finalAgreedAmount || 0;
  const verifiedPaymentsReceived = financials?.verifiedPaymentsReceived || 0;
  const remainingBalance = Math.max(0, finalAgreedAmount - verifiedPaymentsReceived);
  const isFullyPaid = remainingBalance <= 0;

  // Real-time payment history items from complete customer booking ledger
  const paymentHistoryItems = useMemo(() => {
    return bookingHistoryService
      .getBookingHistory(studioId, booking.id, 'desc')
      .filter(h => h.activityType === 'payment_received');
  }, [studioId, booking.id, refreshKey]);

  // Event-specific Deliverables Checklist (independent per booking, saves to Firestore)
  const checklistItems = useMemo(() => {
    let rawDeliverables = booking.deliverables;
    if (!Array.isArray(rawDeliverables) || rawDeliverables.length === 0) {
      rawDeliverables = generateDeliverablesForCategory(
        booking.category || 'Wedding',
        booking.id,
        booking.mainEventDate || booking.startDate || new Date().toISOString().split('T')[0]
      );
      booking.deliverables = rawDeliverables;
      bookingProductionService.saveBooking(studioId, booking);
    }

    return rawDeliverables.map(del => {
      const isDone = del.isDelivered || del.stage === 'delivered' || del.stage === 'customer_confirmation';
      const isInProgress = del.stage === 'editing' || del.stage === 'selection_culling' || del.stage === 'video_editing' || del.stage === 'quality_check' || del.stage === 'ready_for_delivery';
      return {
        id: del.id,
        name: del.name,
        category: del.category,
        status: isDone ? 'done' as const : isInProgress ? 'in_progress' as const : 'pending' as const,
        deadline: del.calculatedDeadline || booking.mainEventDate || '',
        rawDeliverable: del
      };
    });
  }, [booking, studioId, refreshKey]);

  const completedCount = checklistItems.filter(i => i.status === 'done').length;
  const completionPercentage = checklistItems.length > 0 ? Math.round((completedCount / checklistItems.length) * 100) : 0;

  // Handle Deliverable Status Toggle
  const handleToggleDeliverableStatus = async (delId: string) => {
    const item = checklistItems.find(i => i.id === delId);
    if (!item) return;

    let nextStage: DeliveryStage = 'not_started';
    let isDelivered = false;

    if (item.status === 'pending') {
      nextStage = 'editing';
    } else if (item.status === 'in_progress') {
      nextStage = 'delivered';
      isDelivered = true;
    } else {
      nextStage = 'not_started';
      isDelivered = false;
    }

    firestoreService.setStatus('saving', 'Saving deliverable...');
    bookingProductionService.updateDeliverableStage(studioId, booking.id, delId, {
      stage: nextStage,
      completedQty: isDelivered ? (item.rawDeliverable?.requiredQty || 1) : 0,
      verifiedBy: 'Studio Owner'
    });

    await bookingProductionService.saveBooking(studioId, booking);
    firestoreService.setStatus('saved', 'Deliverable saved to cloud');
    setRefreshKey(k => k + 1);
    showToast(`Updated "${item.name}" to ${isDelivered ? 'Done' : nextStage === 'editing' ? 'In Progress' : 'Pending'}`);
  };

  const handleAddCustomDeliverable = async () => {
    if (!customDelName.trim()) return;
    const newDel: DeliverableSpecification = {
      id: `del_${booking.id}_custom_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      bookingId: booking.id,
      name: customDelName.trim(),
      category: customDelCat,
      requiredQty: 1,
      completedQty: 0,
      unit: 'item',
      deliveryMethod: 'Google Drive',
      deadlineType: 'specific_date',
      calculatedDeadline: customDelDueDate || booking.mainEventDate || new Date().toISOString().split('T')[0],
      priority: 'normal',
      stage: 'not_started',
      isDelivered: false,
      isPartiallyDelivered: false
    };

    if (!Array.isArray(booking.deliverables)) booking.deliverables = [];
    booking.deliverables.push(newDel);
    
    firestoreService.setStatus('saving', 'Adding deliverable...');
    await bookingProductionService.saveBooking(studioId, booking);
    firestoreService.setStatus('saved', 'Deliverable saved');

    setCustomDelName('');
    setCustomDelDueDate('');
    setShowAddCustomDel(false);
    setRefreshKey(k => k + 1);
    showToast(`Added custom deliverable: ${newDel.name}`);
  };

  const handleRemoveDeliverable = async (delId: string) => {
    if (!Array.isArray(booking.deliverables)) return;
    booking.deliverables = booking.deliverables.filter(d => d.id !== delId);
    firestoreService.setStatus('saving', 'Removing deliverable...');
    await bookingProductionService.saveBooking(studioId, booking);
    firestoreService.setStatus('saved', 'Deliverable removed');
    setRefreshKey(k => k + 1);
    showToast('Deliverable removed');
  };

  // Handle Status Change
  const handleUpdateStatus = async (newStatus: BookingStatus) => {
    booking.status = newStatus;
    setIsStatusDropdownOpen(false);
    firestoreService.setStatus('saving', `Updating status to ${BOOKING_STATUS_LABELS[newStatus] || newStatus}...`);
    try {
      await bookingProductionService.saveBooking(studioId, booking);
      firestoreService.setStatus('saved', 'Status updated in cloud');
      setRefreshKey(k => k + 1);
      showToast(`Booking status updated to ${BOOKING_STATUS_LABELS[newStatus] || newStatus}`);
    } catch (err: any) {
      firestoreService.setStatus('error', 'Status update failed');
    }
  };

  // Handle Add Payment
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingPayment) return;
    if (paymentAmount <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }

    setIsSubmittingPayment(true);
    firestoreService.setStatus('saving', 'Recording payment...');
    try {
      bookingProductionService.recordBookingPayment(studioId, booking.id, {
        amount: paymentAmount,
        paymentMethod: paymentMode,
        reference: paymentRef || `REC-${Date.now().toString().slice(-6)}`,
        receivedBy: 'Studio Owner',
        isAdvance: verifiedPaymentsReceived === 0
      });

      firestoreService.setStatus('saved', 'Payment confirmed');
      setIsPaymentModalOpen(false);
      setRefreshKey(k => k + 1);
      showToast(`Payment of ₹${paymentAmount.toLocaleString('en-IN')} recorded successfully!`);
    } catch (err: any) {
      firestoreService.setStatus('error', err.message || 'Payment recording failed');
      alert(err.message || 'Failed to record payment');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Handle Edit Booking Details
  const handleSaveEditBooking = (e: React.FormEvent) => {
    e.preventDefault();
    const oldAgreed = booking.financials?.finalAgreedAmount || 0;
    const oldQuote = booking.financials?.originalQuotation || 0;
    const oldDiscount = booking.financials?.negotiatedDiscount || 0;

    booking.customerName = editFormData.customerName;
    booking.customerPhone = editFormData.customerPhone;
    booking.customerEmail = editFormData.customerEmail;
    booking.eventName = editFormData.eventName;
    booking.mainEventDate = editFormData.eventDate;
    booking.startDate = editFormData.eventDate;
    booking.venue = editFormData.venue;

    if (booking.financials) {
      booking.financials.originalQuotation = editFormData.originalQuotation;
      booking.financials.negotiatedDiscount = editFormData.negotiatedDiscount;
      booking.financials.finalAgreedAmount = editFormData.finalAgreedAmount;
      booking.financials.remainingBalance = Math.max(0, editFormData.finalAgreedAmount - booking.financials.verifiedPaymentsReceived);

      // Record price revision into history if changed
      if (
        oldAgreed !== editFormData.finalAgreedAmount || 
        oldQuote !== editFormData.originalQuotation || 
        oldDiscount !== editFormData.negotiatedDiscount
      ) {
        bookingHistoryService.recordPriceUpdateHistory(studioId, booking.id, {
          customerId: booking.customerId,
          previousQuotation: oldQuote,
          newQuotation: editFormData.originalQuotation,
          previousDiscount: oldDiscount,
          newDiscount: editFormData.negotiatedDiscount,
          previousAgreedAmount: oldAgreed,
          newAgreedAmount: editFormData.finalAgreedAmount,
          reason: 'Client negotiation / quotation update',
          updatedBy: 'Studio Owner'
        });
      }
    }

    bookingProductionService.saveBooking(studioId, booking);
    setIsEditModalOpen(false);
    setRefreshKey(k => k + 1);
    showToast('Booking details saved successfully!');
  };

  // Open Full-Featured Event Edit Modal (Requirement 3 & 4)
  const handleOpenFullEditModal = () => {
    setEditingEvent({
      id: booking.id,
      studioId,
      eventNumber: booking.bookingNumber,
      name: booking.eventName,
      title: booking.eventName,
      customerId: booking.customerId,
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      category: booking.category as any,
      startDate: booking.mainEventDate || booking.startDate || '',
      startTime: (booking.functions && booking.functions[0]?.startTime) || '10:00',
      endDate: (booking.functions && booking.functions[booking.functions.length - 1]?.date) || booking.mainEventDate || '',
      endTime: (booking.functions && booking.functions[booking.functions.length - 1]?.endTime) || '18:00',
      venue: booking.venue,
      venueCity: booking.city,
      priority: 'High',
      status: (booking.status === 'completed' || booking.status === 'fully_delivered' ? 'Completed' : booking.status === 'cancelled' ? 'Cancelled' : 'Confirmed') as any,
      assignedTeamIds: (booking.functions || []).flatMap(f => (f.assignedCrew || []).map(c => c.employeeId)),
      estimatedBudget: booking.financials?.finalAgreedAmount || booking.financials?.originalQuotation || 0,
      advancePaid: booking.financials?.verifiedPaymentsReceived || booking.financials?.advanceReceived || 0,
      notes: booking.notes
    } as unknown as StudioEvent);
    setIsEventFormOpen(true);
  };

  // Handle Add Crew Member with Conflict Detection and Smart Calendar Visibility
  const handleAssignCrew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCrewEmployeeId) return;

    const roster = crewConflictService.getActiveEmployees(studioId);
    const emp = roster.find(e => e.id === selectedCrewEmployeeId) || employees.find(e => e.id === selectedCrewEmployeeId);
    if (!emp) return;

    // Check conflict warning if not overridden
    if (crewConflictWarn?.hasConflict && !allowCrewConflictOverride) {
      alert(`Scheduling Warning: ${crewConflictWarn.warningMessage}\nPlease check "Allow Overlap" to confirm.`);
      return;
    }

    if (!booking.functions || booking.functions.length === 0) {
      booking.functions = [{
        id: `fn_${booking.id}_main`,
        bookingId: booking.id,
        name: 'Main Event Coverage',
        category: booking.category || 'Wedding',
        date: booking.mainEventDate || booking.startDate || '',
        startTime: '10:00',
        endTime: '18:00',
        venue: booking.venue,
        city: booking.city,
        assignedPhotographerIds: [],
        assignedVideographerIds: [],
        assignedDroneOperatorIds: [],
        assignedEditorIds: [],
        assignedSupplierIds: [],
        deliverables: [],
        priority: 'normal',
        status: 'scheduled',
        assignedCrew: []
      }];
    }

    const targetFunctions = selectedCrewFunctionId === 'all'
      ? booking.functions
      : booking.functions.filter(f => f.id === selectedCrewFunctionId);

    const fnsToAssign = targetFunctions.length > 0 ? targetFunctions : [booking.functions[0]];

    firestoreService.setStatus('saving', 'Assigning crew member...');
    for (const fn of fnsToAssign) {
      await calendarVisibilityService.assignCrewMember(
        studioId,
        booking.id,
        fn.id,
        {
          employeeId: emp.id,
          employeeName: emp.fullName,
          designation: emp.designation,
          department: emp.department,
          role: selectedCrewRole,
          contact: emp.phone || ''
        },
        crewModalVisibleOnCalendar,
        'Studio Owner'
      );
    }
    firestoreService.setStatus('saved', 'Crew assignment saved');

    setIsCrewModalOpen(false);
    setSelectedCrewEmployeeId('');
    setSelectedCrewFunctionId('all');
    setCrewConflictWarn(null);
    setAllowCrewConflictOverride(false);
    setRefreshKey(k => k + 1);
    const scopeLabel = selectedCrewFunctionId === 'all' ? 'entire booking' : 'selected function';
    showToast(`${emp.fullName} assigned as ${selectedCrewRole} for ${scopeLabel} (${crewModalVisibleOnCalendar ? 'Visible on calendar' : 'Hidden from calendar'})`);
  };

  const handleToggleVisibility = async (empId: string, fnId: string, currentVisible: boolean) => {
    const nextVisible = !currentVisible;
    firestoreService.setStatus('saving', 'Updating calendar visibility...');
    await calendarVisibilityService.setEmployeeCalendarVisibility(studioId, booking.id, empId, fnId, nextVisible);
    firestoreService.setStatus('saved', 'Calendar visibility saved');
    setRefreshKey(k => k + 1);
    const emp = employees.find(e => e.id === empId);
    showToast(nextVisible 
      ? `${emp?.fullName || 'Crew member'} is now visible on team calendar.` 
      : `${emp?.fullName || 'Crew member'} is now hidden from calendar.`
    );
  };

  const handleUnassignCrew = async (empId: string, fnId: string) => {
    firestoreService.setStatus('saving', 'Removing crew assignment...');
    await calendarVisibilityService.unassignCrewMember(studioId, booking.id, fnId, empId);
    firestoreService.setStatus('saved', 'Crew assignment updated');
    setRefreshKey(k => k + 1);
    showToast('Crew member removed from assignment.');
  };

  // Add Internal Note
  const handleAddInternalNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInternalNote.trim()) return;

    firestoreService.setStatus('saving', 'Saving internal note...');
    bookingProductionService.addCustomerNote(studioId, {
      customerId: booking.customerId,
      bookingId: booking.id,
      noteType: 'internal_private',
      title: 'Studio Internal Note',
      content: newInternalNote.trim(),
      isPrivate: true,
      createdBy: 'Studio Owner'
    });

    await bookingProductionService.saveBooking(studioId, booking);
    firestoreService.setStatus('saved', 'Note saved to cloud');
    setNewInternalNote('');
    setRefreshKey(k => k + 1);
    showToast('Internal note saved!');
  };

  // 1-Tap PDF Generators
  const handleGeneratePdf = (type: 'quotation' | 'invoice' | 'receipt' | 'summary') => {
    setIsPdfDropdownOpen(false);
    const studioName = currentStudio?.name || 'Shreeji Films and Photography';
    const cleanDate = booking.mainEventDate || booking.startDate || new Date().toISOString().split('T')[0];

    if (type === 'quotation') {
      openPdfViewer({
        documentType: 'quotation',
        title: 'PHOTOGRAPHY SERVICE QUOTATION',
        documentNumber: `QT-${booking.bookingNumber}`,
        date: cleanDate,
        customer: {
          name: booking.customerName,
          phone: booking.customerPhone,
          email: booking.customerEmail,
          address: `${booking.venue}, ${booking.city}`
        },
        event: {
          name: booking.eventName,
          category: booking.category || 'Wedding',
          date: cleanDate,
          venue: booking.venue
        },
        items: (booking.functions || []).map(fn => ({
          name: `${fn.name} Coverage`,
          description: `Full photo & video coverage on ${fn.date} at ${fn.venue}`,
          quantity: 1,
          unitPrice: Math.round(finalAgreedAmount / (booking.functions?.length || 1)),
          amount: Math.round(finalAgreedAmount / (booking.functions?.length || 1))
        })),
        financials: {
          subtotal: originalQuotation,
          discountAmount: negotiatedDiscount,
          totalAmount: finalAgreedAmount,
          paidAmount: verifiedPaymentsReceived,
          pendingAmount: remainingBalance
        },
        terms: '1. 25% Advance payment required to block dates.\n2. Balance payable upon delivery handover.\n3. Digital files delivered within agreed deadlines.'
      });
    } else if (type === 'invoice') {
      openPdfViewer({
        documentType: 'invoice',
        title: 'TAX INVOICE',
        documentNumber: `INV-${booking.bookingNumber}`,
        date: cleanDate,
        dueDate: cleanDate,
        customer: {
          name: booking.customerName,
          phone: booking.customerPhone,
          email: booking.customerEmail,
          address: `${booking.venue}, ${booking.city}`
        },
        event: {
          name: booking.eventName,
          category: booking.category || 'Wedding',
          date: cleanDate,
          venue: booking.venue
        },
        items: [
          {
            name: `${booking.eventName} Package Coverage`,
            description: `All photographic and video deliverables as agreed`,
            quantity: 1,
            unitPrice: finalAgreedAmount,
            amount: finalAgreedAmount
          }
        ],
        financials: {
          subtotal: originalQuotation,
          discountAmount: negotiatedDiscount,
          totalAmount: finalAgreedAmount,
          paidAmount: verifiedPaymentsReceived,
          pendingAmount: remainingBalance
        },
        terms: 'Thank you for choosing Shreeji Films & Photography. Please settle any balance due upon completion.'
      });
    } else if (type === 'receipt') {
      openPdfViewer({
        documentType: 'payment_receipt',
        title: 'PAYMENT RECEIPT',
        documentNumber: `REC-${booking.bookingNumber}`,
        date: new Date().toISOString().split('T')[0],
        customer: {
          name: booking.customerName,
          phone: booking.customerPhone,
          address: `${booking.venue}, ${booking.city}`
        },
        event: {
          name: booking.eventName,
          category: booking.category || 'Wedding',
          date: cleanDate,
          venue: booking.venue
        },
        items: [
          {
            name: 'Verified Payment Received',
            description: `Received towards booking ${booking.bookingNumber}`,
            quantity: 1,
            unitPrice: verifiedPaymentsReceived,
            amount: verifiedPaymentsReceived
          }
        ],
        financials: {
          subtotal: verifiedPaymentsReceived,
          totalAmount: verifiedPaymentsReceived,
          paidAmount: verifiedPaymentsReceived,
          pendingAmount: remainingBalance
        },
        terms: 'Official payment receipt. Verified by Shreeji Films and Photography.'
      });
    } else {
      // Summary PDF
      openPdfViewer({
        documentType: 'quotation',
        title: 'COMPLETE BOOKING SUMMARY',
        documentNumber: `SUM-${booking.bookingNumber}`,
        date: cleanDate,
        customer: {
          name: booking.customerName,
          phone: booking.customerPhone,
          email: booking.customerEmail,
          address: `${booking.venue}, ${booking.city}`
        },
        event: {
          name: booking.eventName,
          category: booking.category || 'Wedding',
          date: cleanDate,
          venue: booking.venue
        },
        items: checklistItems.map(item => ({
          name: item.name,
          description: `Deadline: ${item.deadline} • Status: ${item.status.toUpperCase()}`,
          quantity: 1,
          unitPrice: Math.round(finalAgreedAmount / checklistItems.length),
          amount: Math.round(finalAgreedAmount / checklistItems.length)
        })),
        financials: {
          subtotal: originalQuotation,
          discountAmount: negotiatedDiscount,
          totalAmount: finalAgreedAmount,
          paidAmount: verifiedPaymentsReceived,
          pendingAmount: remainingBalance
        },
        terms: 'Confidential production brief for studio & client reference.'
      });
    }
  };

  const handleGenerateReceipt = (_amount?: number) => {
    handleGeneratePdf('receipt');
  };

  // Soft Delete Handler with explicit confirmation and Owner authorization (Requirement 2)
  const handleDeleteBookingConfirm = async () => {
    if (isDeletingBooking) return;
    setIsDeletingBooking(true);
    setDeleteError('');
    try {
      const res = await bookingProductionService.softDeleteBooking(
        studioId,
        booking.id,
        userRole,
        currentUser?.name || 'Studio Owner'
      );
      if (!res.success) {
        throw new Error(res.error || 'Failed to delete booking');
      }
      setIsDeleteModalOpen(false);
      showToast(`Booking ${booking.bookingNumber} (${booking.eventName}) deleted successfully.`);
      setTimeout(() => {
        if (onBack) onBack();
        else {
          setActiveTab('bookings');
          window.location.hash = '#/app/bookings';
        }
      }, 300);
    } catch (err: any) {
      console.error('[handleDeleteBookingConfirm] Error:', err);
      setDeleteError(err.message || 'Failed to delete booking. Please try again.');
    } finally {
      setIsDeletingBooking(false);
    }
  };

  // Pre-formatted WhatsApp Messages
  const whatsappMessages = useMemo(() => {
    const studioName = currentStudio?.name || 'Shreeji Films and Photography';
    const cust = booking.customerName || 'Valued Client';
    const ev = booking.eventName || 'Event';
    const dt = booking.mainEventDate || booking.startDate || '';
    const vn = booking.venue || 'Venue';

    const fnList = (booking.functions || []).map(f => `• ${f.name} on ${f.date} @ ${f.venue}`).join('\n');

    return {
      booking_confirmation: `Hello ${cust},\n\nBooking Confirmation with ${studioName}!\n\nYour photography booking is confirmed.\n\nEvent: ${ev}\nDate: ${dt}\nVenue: ${vn}\n${fnList ? '\nSchedule:\n' + fnList + '\n' : ''}\nAgreed Amount: ₹${finalAgreedAmount.toLocaleString('en-IN')}\nAdvance Received: ₹${verifiedPaymentsReceived.toLocaleString('en-IN')}\nRemaining Balance: ₹${remainingBalance.toLocaleString('en-IN')}\n\nThank you for choosing ${studioName}!`,

      payment_receipt: `Hello ${cust},\n\nPayment Receipt from ${studioName}:\n\nWe have successfully recorded your payment towards ${ev}.\nTotal Agreed Amount: ₹${finalAgreedAmount.toLocaleString('en-IN')}\nTotal Received: ₹${verifiedPaymentsReceived.toLocaleString('en-IN')}\nRemaining Balance Due: ₹${remainingBalance.toLocaleString('en-IN')}\n\nThank you for your payment!`,

      event_reminder: `Hello ${cust},\n\nGentle reminder from ${studioName} regarding your upcoming shoot for ${ev} on ${dt} at ${vn}.\n\nOur photography & cinematic team is fully prepped and will arrive on time.\nPlease let us know if there are any timing updates!\n\nBest regards,\n${studioName}`,

      delivery_ready: `Hello ${cust},\n\nExciting news from ${studioName}! Your deliverables for ${ev} are ready.\n\nCompleted Deliverables:\n${checklistItems.filter(i => i.status === 'done').map(i => `✓ ${i.name}`).join('\n') || '✓ All photo & video deliverables'}\n\nPlease visit our studio or check your cloud gallery link to preview & download.\n\nThank you for trusting us with your special memories!`
    };
  }, [booking, finalAgreedAmount, verifiedPaymentsReceived, remainingBalance, checklistItems, currentStudio]);

  const cleanPhone = (booking.customerWhatsApp || booking.customerPhone || '').replace(/[^0-9]/g, '');
  const activeWhatsAppText = whatsappMessages[activeWhatsAppTemplate];
  const activeWhatsAppUrl = `https://wa.me/${cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone}?text=${encodeURIComponent(activeWhatsAppText)}`;

  // Assigned crew combined table rows with visibility state
  const crewTableRows = useMemo(() => {
    return calendarVisibilityService.getBookingCrewTable(studioId, booking);
  }, [studioId, booking, refreshKey]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-24 font-sans animate-in fade-in duration-150">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-zinc-900 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Back button */}
      <div>
        <button
          onClick={() => {
            if (onBack) onBack();
            else {
              setActiveTab('bookings');
              window.location.hash = '#/app/bookings';
            }
          }}
          className="inline-flex items-center gap-2 min-h-[48px] sm:min-h-[38px] px-4 py-2.5 sm:px-3 sm:py-1.5 rounded-xl bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-700 text-sm sm:text-xs font-semibold cursor-pointer shadow-2xs transition-colors touch-manipulation active:scale-95"
        >
          <ArrowLeft className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
          <span>Back to All Bookings</span>
        </button>
      </div>

      {/* 1. TOP HEADER */}
      <div className="bg-white rounded-2xl border border-zinc-200/90 p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center font-bold text-lg font-display shrink-0 shadow-2xs">
              {booking.customerName ? booking.customerName.charAt(0).toUpperCase() : 'B'}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight font-display">
                  {booking.customerName}
                </h1>
                <span className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 text-xs font-mono font-semibold">
                  {booking.bookingNumber}
                </span>

                {/* 1-Tap Status Dropdown */}
                <div className="relative inline-block" ref={statusDropdownRef}>
                  <button
                    onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                    className="inline-flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-full text-xs font-bold border cursor-pointer transition-all bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 touch-manipulation"
                  >
                    <span>{BOOKING_STATUS_LABELS[booking.status] || booking.status}</span>
                    <ChevronDown className="w-3 h-3 text-emerald-700" />
                  </button>

                  {isStatusDropdownOpen && (
                    <div className="absolute left-0 mt-1 w-48 bg-white border border-zinc-200 rounded-xl shadow-lg z-30 py-1 text-xs">
                      {[
                        { id: 'new_inquiry', label: 'New Inquiry' },
                        { id: 'quotation_sent', label: 'Quotation Sent' },
                        { id: 'deal_confirmed', label: 'Deal Confirmed' },
                        { id: 'advance_received', label: 'Advance Received' },
                        { id: 'in_production', label: 'In Production' },
                        { id: 'editing', label: 'Editing' },
                        { id: 'delivery_in_progress', label: 'Delivery In Progress' },
                        { id: 'fully_delivered', label: 'Fully Delivered' },
                        { id: 'completed', label: 'Completed' },
                        { id: 'cancelled', label: 'Cancelled' }
                      ].map(st => (
                        <button
                          key={st.id}
                          onClick={() => handleUpdateStatus(st.id as BookingStatus)}
                          className="w-full text-left px-3.5 py-2 hover:bg-zinc-50 font-medium text-zinc-700 flex items-center justify-between min-h-[40px]"
                        >
                          <span>{st.label}</span>
                          {booking.status === st.id && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <p className="text-xs text-zinc-500 mt-1 flex flex-wrap items-center gap-2">
                <span className="font-semibold text-zinc-700">{booking.eventName}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-zinc-400" />
                  {booking.mainEventDate || booking.startDate}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-zinc-400" />
                  {booking.venue}, {booking.city}
                </span>
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Final Agreed Amount */}
            <div className="w-full sm:w-auto text-left sm:text-right px-3.5 py-2 bg-zinc-50 border border-zinc-200 rounded-xl">
              <span className="text-xs text-zinc-500 block uppercase tracking-wider font-semibold">Agreed Amount</span>
              <span className="text-base font-extrabold text-zinc-900 font-display">
                ₹{finalAgreedAmount.toLocaleString('en-IN')}
              </span>
            </div>

            {/* Edit Booking */}
            <button
              onClick={handleOpenFullEditModal}
              className="flex-1 sm:flex-initial min-h-[48px] sm:min-h-[42px] px-4 py-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-sm sm:text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer touch-manipulation active:scale-95"
            >
              <Edit3 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              <span>Edit</span>
            </button>

            {/* WhatsApp Chat */}
            <a
              href={`https://wa.me/${cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone}`}
              target="_blank"
              rel="noreferrer"
              className="flex-1 sm:flex-initial min-h-[48px] sm:min-h-[42px] px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm sm:text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs touch-manipulation active:scale-95"
            >
              <MessageCircle className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              <span>WhatsApp</span>
            </a>

            {/* 1-Tap PDF Dropdown */}
            <div className="relative inline-block w-full sm:w-auto" ref={pdfDropdownRef}>
              <button
                onClick={() => setIsPdfDropdownOpen(!isPdfDropdownOpen)}
                className="w-full sm:w-auto min-h-[48px] sm:min-h-[42px] px-4 py-2.5 rounded-xl bg-white border border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 text-zinc-800 text-sm sm:text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs touch-manipulation active:scale-95"
              >
                <Printer className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-zinc-600" />
                <span>Download / Print</span>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
              </button>

              {isPdfDropdownOpen && (
                <div className="absolute left-0 sm:left-auto sm:right-0 mt-1 w-full sm:w-52 bg-white border border-zinc-200 rounded-xl shadow-xl z-30 py-1.5 text-xs">
                  <button
                    onClick={() => handleGeneratePdf('quotation')}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-zinc-50 text-zinc-700 font-medium flex items-center gap-2 min-h-[44px]"
                  >
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>Quotation PDF</span>
                  </button>
                  <button
                    onClick={() => handleGeneratePdf('invoice')}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-zinc-50 text-zinc-700 font-medium flex items-center gap-2 min-h-[44px]"
                  >
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <span>Final Invoice PDF</span>
                  </button>
                  <button
                    onClick={() => handleGeneratePdf('receipt')}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-zinc-50 text-zinc-700 font-medium flex items-center gap-2 min-h-[44px]"
                  >
                    <FileText className="w-4 h-4 text-amber-600" />
                    <span>Payment Receipt PDF</span>
                  </button>
                  <button
                    onClick={() => handleGeneratePdf('summary')}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-zinc-50 text-zinc-700 font-medium flex items-center gap-2 min-h-[44px]"
                  >
                    <FileText className="w-4 h-4 text-purple-600" />
                    <span>Booking Summary PDF</span>
                  </button>
                </div>
              )}
            </div>

            {/* Delete Event Booking (Studio Owner Only - Requirement 2) */}
            {isOwner && (
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                title="Delete this event booking"
                className="flex-1 sm:flex-initial min-h-[48px] sm:min-h-[42px] px-3.5 py-2.5 rounded-xl border border-zinc-200 hover:border-rose-300 hover:bg-rose-50 text-zinc-600 hover:text-rose-600 text-sm sm:text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer touch-manipulation active:scale-95"
              >
                <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-zinc-500 hover:text-rose-600" />
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. TOP SUMMARY TILES */}
      <div className="bg-white rounded-2xl border border-zinc-200/90 p-4 sm:p-5 shadow-2xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3">
          {/* Mobile */}
          <div className="bg-zinc-50/80 border border-zinc-200/70 rounded-xl p-3 sm:p-3.5 flex flex-col justify-between">
            <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider block">Customer Mobile</span>
            <a 
              href={`tel:${booking.customerPhone}`} 
              className="text-sm font-bold text-zinc-900 hover:text-blue-600 mt-1 inline-flex items-center gap-1 min-h-[32px]"
            >
              <Phone className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span className="truncate">{booking.customerPhone || 'N/A'}</span>
            </a>
          </div>

          {/* Dates */}
          <div className="bg-zinc-50/80 border border-zinc-200/70 rounded-xl p-3 sm:p-3.5 flex flex-col justify-between">
            <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider block">Event Date</span>
            <div className="text-sm font-bold text-zinc-900 mt-1 flex items-center gap-1 min-h-[32px]">
              <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span className="truncate">{booking.mainEventDate || booking.startDate}</span>
            </div>
          </div>

          {/* Venue */}
          <div className="bg-zinc-50/80 border border-zinc-200/70 rounded-xl p-3 sm:p-3.5 flex flex-col justify-between">
            <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider block">Venue</span>
            <div className="text-sm font-bold text-zinc-900 mt-1 truncate min-h-[32px] flex items-center" title={booking.venue}>
              <span className="truncate">{booking.venue || 'Studio'}</span>
            </div>
          </div>

          {/* Functions Count */}
          <div className="bg-zinc-50/80 border border-zinc-200/70 rounded-xl p-3 sm:p-3.5 flex flex-col justify-between">
            <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider block">Functions</span>
            <div className="text-sm font-bold text-zinc-900 mt-1 min-h-[32px] flex items-center">
              {(booking.functions || []).length} Sub-events
            </div>
          </div>

          {/* Agreed Amount */}
          <div className="bg-zinc-50/80 border border-zinc-200/70 rounded-xl p-3 sm:p-3.5 flex flex-col justify-between">
            <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider block font-sans">Agreed Amount</span>
            <div className="text-sm font-bold text-zinc-900 mt-1 min-h-[32px] flex items-center font-tabular tabular-nums">
              ₹{finalAgreedAmount.toLocaleString('en-IN')}
            </div>
          </div>

          {/* Advance Received */}
          <div className="bg-zinc-50/80 border border-zinc-200/70 rounded-xl p-3 sm:p-3.5 flex flex-col justify-between">
            <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider block font-sans">Advance Received</span>
            <div className="text-sm font-bold text-emerald-700 mt-1 min-h-[32px] flex items-center font-tabular tabular-nums">
              ₹{verifiedPaymentsReceived.toLocaleString('en-IN')}
            </div>
          </div>

          {/* Remaining Balance */}
          <div className="bg-zinc-50/80 border border-zinc-200/70 rounded-xl p-3 sm:p-3.5 flex flex-col justify-between col-span-2 sm:col-span-1">
            <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider block font-sans">Remaining Balance</span>
            <div className={`text-sm font-extrabold mt-1 min-h-[32px] flex items-center font-tabular tabular-nums ${isFullyPaid ? 'text-emerald-700' : 'text-rose-600'}`}>
              {isFullyPaid ? '✓ Fully Paid' : `₹${remainingBalance.toLocaleString('en-IN')}`}
            </div>
          </div>
        </div>
      </div>

      {/* 3. 5 EMBEDDED SECTIONS NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-zinc-200/90 pb-2 overflow-x-auto touch-scroll">
        {[
          { id: 'details', label: '1. Details & Crew', icon: <User className="w-4 h-4" /> },
          { id: 'money', label: '2. Money & Payments', icon: <IndianRupee className="w-4 h-4" /> },
          { id: 'delivery', label: '3. Work & Delivery Checklist', icon: <PackageCheck className="w-4 h-4" /> },
          { id: 'messages', label: '4. Notes & WhatsApp', icon: <MessageCircle className="w-4 h-4" /> },
          { id: 'history', label: '5. Complete History', icon: <History className="w-4 h-4" /> }
        ].map(sec => (
          <button
            key={sec.id}
            onClick={() => setActiveSection(sec.id as BookingSectionTab)}
            className={`min-h-[48px] px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap touch-manipulation active:scale-95 ${
              activeSection === sec.id
                ? 'bg-orange-500 text-white shadow-xs font-bold'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-orange-50/40'
            }`}
          >
            {sec.icon}
            <span>{sec.label}</span>
          </button>
        ))}
      </div>

      {/* SECTION 1: DETAILS */}
      {activeSection === 'details' && (
        <div className="space-y-6">
          {/* Instant Auto-Save Status Banner */}
          <div className="flex items-center justify-between bg-orange-50/70 border border-orange-200/90 rounded-2xl p-3.5 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs sm:text-sm font-bold text-zinc-800">Instant Actions & Auto-Save Active</span>
              <span className="hidden sm:inline text-xs text-zinc-500">— Changes save automatically</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold">
              {instantSaveStatus === 'saving' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                  <span>Saving to cloud...</span>
                </span>
              )}
              {instantSaveStatus === 'saved' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 animate-in fade-in">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Saved to cloud</span>
                </span>
              )}
              {instantSaveStatus === 'failed' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-900 border border-rose-300">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Sync failed — retrying</span>
                </span>
              )}
              {instantSaveStatus === 'idle' && (
                <span className="text-xs text-zinc-400 font-medium">Auto-save on edit</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer Details */}
            <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                <h3 className="text-sm font-bold text-zinc-900 font-display flex items-center gap-2">
                  <User className="w-4 h-4 text-zinc-500" />
                  <span>Customer Information</span>
                </h3>
                <span className="text-xs text-zinc-400 font-medium">Auto-saves on change</span>
              </div>

              <div className="space-y-3 text-xs sm:text-sm">
                <div>
                  <label className="text-xs text-zinc-500 font-bold uppercase tracking-wider block mb-1">Full Name</label>
                  <input
                    type="text"
                    value={editFormData.customerName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditFormData(prev => ({ ...prev, customerName: val }));
                      autoSaveBookingChange({ customerName: val }, false);
                    }}
                    onBlur={() => autoSaveBookingChange({ customerName: editFormData.customerName }, true)}
                    className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold text-zinc-900 focus:bg-white focus:ring-2 focus:ring-orange-500 min-h-[46px]"
                    placeholder="Customer Name"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-500 font-bold uppercase tracking-wider block mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={editFormData.customerPhone}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditFormData(prev => ({ ...prev, customerPhone: val }));
                        autoSaveBookingChange({ customerPhone: val }, false);
                      }}
                      onBlur={() => autoSaveBookingChange({ customerPhone: editFormData.customerPhone }, true)}
                      className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-semibold text-zinc-900 focus:bg-white focus:ring-2 focus:ring-orange-500 min-h-[46px]"
                      placeholder="+91 Mobile"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 font-bold uppercase tracking-wider block mb-1">WhatsApp</label>
                    <input
                      type="tel"
                      value={editFormData.customerWhatsApp}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditFormData(prev => ({ ...prev, customerWhatsApp: val }));
                        autoSaveBookingChange({ customerWhatsApp: val }, false);
                      }}
                      onBlur={() => autoSaveBookingChange({ customerWhatsApp: editFormData.customerWhatsApp }, true)}
                      className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-semibold text-zinc-900 focus:bg-white focus:ring-2 focus:ring-orange-500 min-h-[46px]"
                      placeholder="+91 WhatsApp"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-500 font-bold uppercase tracking-wider block mb-1">Email Address</label>
                    <input
                      type="email"
                      value={editFormData.customerEmail}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditFormData(prev => ({ ...prev, customerEmail: val }));
                        autoSaveBookingChange({ customerEmail: val }, false);
                      }}
                      onBlur={() => autoSaveBookingChange({ customerEmail: editFormData.customerEmail }, true)}
                      className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-semibold text-zinc-900 focus:bg-white focus:ring-2 focus:ring-orange-500 min-h-[46px]"
                      placeholder="client@example.com"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 font-bold uppercase tracking-wider block mb-1">City / Location</label>
                    <input
                      type="text"
                      value={editFormData.city}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditFormData(prev => ({ ...prev, city: val }));
                        autoSaveBookingChange({ city: val }, false);
                      }}
                      onBlur={() => autoSaveBookingChange({ city: editFormData.city }, true)}
                      className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-semibold text-zinc-900 focus:bg-white focus:ring-2 focus:ring-orange-500 min-h-[46px]"
                      placeholder="City"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Event Information */}
            <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                <h3 className="text-sm font-bold text-zinc-900 font-display flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-zinc-500" />
                  <span>Event Information</span>
                </h3>
                <span className="text-xs text-zinc-400 font-medium">Auto-saves on change</span>
              </div>

              <div className="space-y-3 text-xs sm:text-sm">
                <div>
                  <label className="text-xs text-zinc-500 font-bold uppercase tracking-wider block mb-1">Event Title</label>
                  <input
                    type="text"
                    value={editFormData.eventName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditFormData(prev => ({ ...prev, eventName: val }));
                      autoSaveBookingChange({ eventName: val }, false);
                    }}
                    onBlur={() => autoSaveBookingChange({ eventName: editFormData.eventName }, true)}
                    className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold text-zinc-900 focus:bg-white focus:ring-2 focus:ring-orange-500 min-h-[46px]"
                    placeholder="Event Title"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-500 font-bold uppercase tracking-wider block mb-1">Category</label>
                    <select
                      value={editFormData.category}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        setEditFormData(prev => ({ ...prev, category: val }));
                        autoSaveBookingChange({ category: val }, true);
                      }}
                      className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-semibold text-zinc-900 focus:bg-white focus:ring-2 focus:ring-orange-500 min-h-[46px] cursor-pointer"
                    >
                      <option value="Wedding">Wedding</option>
                      <option value="Pre-Wedding">Pre-Wedding</option>
                      <option value="Engagement">Engagement</option>
                      <option value="Mandvo / Pithi">Mandvo / Pithi</option>
                      <option value="Haldi & Mehndi">Haldi & Mehndi</option>
                      <option value="Sangeet Night">Sangeet Night</option>
                      <option value="Reception">Reception</option>
                      <option value="Birthday">Birthday</option>
                      <option value="Corporate">Corporate</option>
                      <option value="Fashion">Fashion</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-zinc-500 font-bold uppercase tracking-wider block mb-1">Main Event Date</label>
                    <input
                      type="date"
                      value={editFormData.eventDate}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditFormData(prev => ({ ...prev, eventDate: val }));
                        autoSaveBookingChange({ mainEventDate: val, startDate: val }, true);
                      }}
                      className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-semibold text-zinc-900 focus:bg-white focus:ring-2 focus:ring-orange-500 min-h-[46px] cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-zinc-500 font-bold uppercase tracking-wider block mb-1">Primary Venue & Address</label>
                  <input
                    type="text"
                    value={editFormData.venue}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditFormData(prev => ({ ...prev, venue: val }));
                      autoSaveBookingChange({ venue: val }, false);
                    }}
                    onBlur={() => autoSaveBookingChange({ venue: editFormData.venue }, true)}
                    className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-semibold text-zinc-900 focus:bg-white focus:ring-2 focus:ring-orange-500 min-h-[46px]"
                    placeholder="Venue name & address"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-500 font-bold uppercase tracking-wider block mb-1">Special Notes & Instructions</label>
                  <textarea
                    rows={2}
                    value={editFormData.notes}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditFormData(prev => ({ ...prev, notes: val }));
                      autoSaveBookingChange({ notes: val, description: val }, false);
                    }}
                    onBlur={() => autoSaveBookingChange({ notes: editFormData.notes, description: editFormData.notes }, true)}
                    className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-800 focus:bg-white focus:ring-2 focus:ring-orange-500"
                    placeholder="Special instructions, style requirements..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Functions / Sub-Events Schedule */}
          <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 font-display">Functions & Sub-Events Schedule</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Pre-wedding, ceremony, reception & individual function plans</p>
              </div>
              <span className="text-xs font-bold text-zinc-500 bg-zinc-100 px-2.5 py-1 rounded-lg">
                {(booking.functions || []).length} Scheduled
              </span>
            </div>

            <div className="space-y-3">
              {(booking.functions || []).map((fn, idx) => (
                <div 
                  key={fn.id || idx}
                  className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/60 flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-zinc-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <h4 className="text-sm sm:text-base font-bold text-zinc-900">{fn.name}</h4>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-zinc-600 pl-7">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                        {fn.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-zinc-400" />
                        {fn.startTime} - {fn.endTime}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                        {fn.venue}
                      </span>
                    </div>
                  </div>

                  {/* Assigned crew for this function */}
                  <div className="flex items-center gap-1.5 flex-wrap pl-7 md:pl-0">
                    {(fn.assignedCrew && fn.assignedCrew.length > 0) ? (
                      fn.assignedCrew.map((c, cIdx) => (
                        <span 
                          key={cIdx} 
                          className="px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold"
                        >
                          {c.employeeName} ({c.role})
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-zinc-400 italic">No specific crew pinned</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Assigned Crew Section */}
          <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-zinc-900 font-display">Crew Assignments & Calendar Visibility</h3>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                    {crewTableRows.length} Assigned
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
                  Manage crew responsibilities and toggle employee calendar visibility with one tap
                </p>
              </div>

              <button
                onClick={() => {
                  setSelectedCrewEmployeeId('');
                  setCrewModalVisibleOnCalendar(true);
                  setIsCrewModalOpen(true);
                }}
                className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>+ Assign Crew</span>
              </button>
            </div>

            {/* Crew Assignment Interactive Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200/80 text-xs font-bold text-zinc-500 uppercase tracking-wider bg-zinc-50/80">
                    <th className="py-3 px-3.5 rounded-l-xl">Crew Member</th>
                    <th className="py-3 px-3.5">Role</th>
                    <th className="py-3 px-3.5">Assignment</th>
                    <th className="py-3 px-3.5">Calendar</th>
                    <th className="py-3 px-3.5 text-right rounded-r-xl">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-sm">
                  {crewTableRows.map((row) => {
                    const isOwner = isStudioOwnerId(row.employeeId, studioId) || row.employeeName.includes('(Studio Owner)');

                    return (
                    <tr key={`${row.employeeId}_${row.functionId}`} className="hover:bg-orange-50/20 transition-colors">
                      {/* 1. Crew Member */}
                      <td className="py-3.5 px-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl border font-bold flex items-center justify-center text-xs shrink-0 ${
                            isOwner 
                              ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-2xs' 
                              : 'bg-orange-100 border-orange-200 text-orange-800'
                          }`}>
                            {row.employeeName.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-sm sm:text-[15px] text-zinc-900 truncate">{row.employeeName}</span>
                              {isOwner && (
                                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                                  Studio Owner
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-zinc-500 truncate">{isOwner ? 'Studio Owner' : (row.designation || 'Production Staff')}</div>
                            {row.contact && <div className="text-xs text-zinc-400 font-mono">{row.contact}</div>}
                          </div>
                        </div>
                      </td>

                      {/* 2. Role */}
                      <td className="py-3.5 px-3.5">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-orange-50 text-orange-900 border border-orange-200/80">
                          {row.responsibility}
                        </span>
                        <div className="text-xs text-zinc-400 mt-1">{row.functionName}</div>
                      </td>

                      {/* 3. Assignment */}
                      <td className="py-3.5 px-3.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Assigned</span>
                        </span>
                      </td>

                      {/* 4. Calendar Visibility Switch */}
                      <td className="py-3.5 px-3.5">
                        <button
                          type="button"
                          onClick={() => handleToggleVisibility(row.employeeId, row.functionId, row.isVisibleOnCalendar)}
                          className={`min-h-[42px] px-3.5 py-1.5 rounded-xl border text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer transition-all active:scale-95 ${
                            row.isVisibleOnCalendar
                              ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 shadow-2xs'
                              : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
                          }`}
                          title={row.isVisibleOnCalendar ? 'Currently visible on employee calendar. Click to hide.' : 'Currently hidden from employee calendar. Click to show.'}
                        >
                          {row.isVisibleOnCalendar ? (
                            <>
                              <Eye className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>Show on calendar</span>
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-4 h-4 text-amber-600 shrink-0" />
                              <span>Hide from calendar</span>
                              <span className="text-xs font-medium text-amber-700 bg-amber-100/70 px-1.5 py-0.5 rounded">(Hidden)</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleUnassignCrew(row.employeeId, row.functionId)}
                          className="min-h-[36px] px-2.5 py-1 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-medium cursor-pointer transition-colors"
                          title="Remove Assignment"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                    );
                  })}

                  {crewTableRows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-zinc-400 text-xs">
                        No crew members assigned yet. Tap "+ Assign Crew" above to assign photographers, videographers, and editors.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}


      {/* SECTION 2: MONEY & PAYMENTS */}
      {activeSection === 'money' && (
        <div className="space-y-6">
          {/* Financial Breakdown Card */}
          <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-zinc-900 font-display border-b border-zinc-100 pb-2">
              Financial Breakdown & Quotation Terms
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
                <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider block">Original Quotation</span>
                <span className="text-sm sm:text-base font-bold text-zinc-700 mt-1 block">
                  ₹{originalQuotation.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
                <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider block">Negotiated Discount</span>
                <span className="text-sm sm:text-base font-bold text-amber-700 mt-1 block">
                  - ₹{negotiatedDiscount.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-2xs">
                <span className="text-xs text-orange-100 font-bold uppercase tracking-wider block">Final Agreed Amount</span>
                <span className="text-base sm:text-lg font-extrabold text-white mt-1 block font-display">
                  ₹{finalAgreedAmount.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-xs text-emerald-700 font-bold uppercase tracking-wider block">Total Received</span>
                <span className="text-base sm:text-lg font-bold text-emerald-800 mt-1 block font-display">
                  ₹{verifiedPaymentsReceived.toLocaleString('en-IN')}
                </span>
              </div>

              <div className={`p-3 rounded-xl border ${isFullyPaid ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                <span className={`text-xs font-bold uppercase tracking-wider block ${isFullyPaid ? 'text-emerald-700' : 'text-rose-700'}`}>
                  Remaining Balance
                </span>
                <span className={`text-base sm:text-lg font-extrabold mt-1 block font-display ${isFullyPaid ? 'text-emerald-800' : 'text-rose-700'}`}>
                  {isFullyPaid ? '✓ Nil (Paid)' : `₹${remainingBalance.toLocaleString('en-IN')}`}
                </span>
              </div>
            </div>
          </div>

          {/* Payment History Table & Add Payment */}
          <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 font-display">Payment History & Receipts</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Recorded advance payments, cash receipts, UPI transactions & settlements</p>
              </div>

              <button
                onClick={() => setIsPaymentModalOpen(true)}
                className="w-full sm:w-auto min-h-[50px] sm:min-h-[44px] px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm sm:text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer touch-manipulation active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Payment</span>
              </button>
            </div>

            {/* Mobile Payment Cards (sm:hidden) */}
            <div className="sm:hidden space-y-3">
              {paymentHistoryItems.length > 0 ? (
                paymentHistoryItems.map(item => {
                  const meta = item.metadata;
                  const amount = item.amount || meta?.amount || 0;
                  const dateStr = item.createdAt ? item.createdAt.split('T')[0] : 'Verified';
                  const mode = meta?.paymentMethod || 'UPI';
                  const refStr = meta?.receiptNumber || meta?.reference || item.relatedRecordId || 'Verified';

                  return (
                    <div key={item.historyId} className="p-4 rounded-xl border border-zinc-200/90 bg-zinc-50/70 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-zinc-500">{dateStr}</span>
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold">
                          {mode}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-emerald-700 font-display">
                          ₹{amount.toLocaleString('en-IN')}
                        </span>
                        <span className="font-mono text-xs text-zinc-500">{refStr}</span>
                      </div>
                      <div className="pt-2 border-t border-zinc-200/70 flex justify-end">
                        <button
                          onClick={() => handleGenerateReceipt(amount)}
                          className="w-full min-h-[44px] py-2 rounded-xl bg-white border border-zinc-200 hover:bg-zinc-100 text-xs font-bold text-zinc-800 cursor-pointer touch-manipulation active:scale-98 flex items-center justify-center gap-1.5"
                        >
                          <FileText className="w-3.5 h-3.5 text-zinc-600" />
                          <span>View Official Receipt</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : verifiedPaymentsReceived > 0 ? (
                <div className="p-4 rounded-xl border border-zinc-200/90 bg-zinc-50/70 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-500">{booking.mainEventDate || 'Verified'}</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold">
                      UPI / Digital
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-emerald-700 font-display">
                      ₹{verifiedPaymentsReceived.toLocaleString('en-IN')}
                    </span>
                    <span className="font-mono text-xs text-zinc-500">ADV-{booking.bookingNumber}</span>
                  </div>
                  <div className="pt-2 border-t border-zinc-200/70 flex justify-end">
                    <button
                      onClick={() => handleGenerateReceipt(verifiedPaymentsReceived)}
                      className="w-full min-h-[44px] py-2 rounded-xl bg-white border border-zinc-200 hover:bg-zinc-100 text-xs font-bold text-zinc-800 cursor-pointer touch-manipulation active:scale-98 flex items-center justify-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5 text-zinc-600" />
                      <span>View Official Receipt</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-zinc-400 text-xs bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
                  No payments recorded yet. Tap "+ Add Payment" above.
                </div>
              )}
            </div>

            {/* Desktop Payment Table (hidden sm:block) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-zinc-500 uppercase text-xs font-bold">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Amount Paid</th>
                    <th className="py-2.5 px-3">Payment Mode</th>
                    <th className="py-2.5 px-3">Receipt / Reference</th>
                    <th className="py-2.5 px-3">Recorded By</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {paymentHistoryItems.length > 0 ? (
                    paymentHistoryItems.map(item => {
                      const meta = item.metadata;
                      const amount = item.amount || meta?.amount || 0;
                      const dateStr = item.createdAt ? item.createdAt.split('T')[0] : 'Verified';
                      const mode = meta?.paymentMethod || 'UPI';
                      const refStr = meta?.receiptNumber || meta?.reference || item.relatedRecordId || 'Verified';
                      const recordedBy = item.performedByName || 'Studio Owner';

                      return (
                        <tr key={item.historyId} className="hover:bg-zinc-50">
                          <td className="py-3 px-3 font-medium text-zinc-900">
                            {dateStr}
                          </td>
                          <td className="py-3 px-3 font-bold text-emerald-700">
                            ₹{amount.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
                              {mode}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono text-zinc-600">
                            {refStr}
                          </td>
                          <td className="py-3 px-3 text-zinc-600">
                            {recordedBy}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => handleGenerateReceipt(amount)}
                              className="px-2.5 py-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-100 text-xs sm:text-sm font-semibold text-zinc-700 cursor-pointer"
                            >
                              View Receipt
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : verifiedPaymentsReceived > 0 ? (
                    <tr className="hover:bg-zinc-50">
                      <td className="py-3 px-3 font-medium text-zinc-900">
                        {booking.financials?.advanceReceivedDate ? booking.financials.advanceReceivedDate.split('T')[0] : booking.mainEventDate || 'Verified'}
                      </td>
                      <td className="py-3 px-3 font-bold text-emerald-700">
                        ₹{verifiedPaymentsReceived.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
                          UPI / Digital
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-zinc-600">
                        ADV-{booking.bookingNumber}
                      </td>
                      <td className="py-3 px-3 text-zinc-600">
                        Studio Owner
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleGenerateReceipt(verifiedPaymentsReceived)}
                          className="px-2.5 py-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-100 text-xs sm:text-sm font-semibold text-zinc-700 cursor-pointer"
                        >
                          View Receipt
                        </button>
                      </td>
                    </tr>
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-zinc-400 text-xs">
                        No payments recorded yet. Tap "+ Add Payment" to record client advance.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}


      {/* SECTION 3: WORK & DELIVERY CHECKLIST */}
      {activeSection === 'delivery' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 font-display">
                  Deliverables Checklist & Production Progress
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Track photography and video fulfillment items for this booking
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setShowAddCustomDel(!showAddCustomDel)}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-xs font-bold text-zinc-700 flex items-center gap-1.5 cursor-pointer touch-manipulation active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Deliverable</span>
                </button>
                <span className="text-xs font-bold text-zinc-700">
                  {completedCount} / {checklistItems.length} Done ({completionPercentage}%)
                </span>
              </div>
            </div>

            {/* Inline Add Custom Deliverable Form */}
            {showAddCustomDel && (
              <div ref={customDelRef} className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-xs font-bold text-zinc-700">
                  <span>Add Custom Deliverable</span>
                  <button
                    type="button"
                    onClick={() => setShowAddCustomDel(false)}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center text-zinc-400 hover:text-zinc-600 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <input
                    type="text"
                    placeholder="Deliverable Name (e.g. 100 Edited Stills)"
                    value={customDelName}
                    onChange={e => setCustomDelName(e.target.value)}
                    className="px-3.5 py-3 rounded-xl border border-zinc-200 text-base sm:text-xs bg-white focus:outline-none min-h-[48px] sm:min-h-[42px]"
                  />
                  <select
                    value={customDelCat}
                    onChange={e => setCustomDelCat(e.target.value as any)}
                    className="px-3.5 py-3 rounded-xl border border-zinc-200 text-base sm:text-xs bg-white focus:outline-none min-h-[48px] sm:min-h-[42px]"
                  >
                    <option value="photography">Photography</option>
                    <option value="video">Videography</option>
                    <option value="physical">Physical Album</option>
                    <option value="digital">Digital / Gallery</option>
                  </select>
                  <input
                    type="date"
                    value={customDelDueDate}
                    onChange={e => setCustomDelDueDate(e.target.value)}
                    className="px-3.5 py-3 rounded-xl border border-zinc-200 text-base sm:text-xs bg-white focus:outline-none min-h-[48px] sm:min-h-[42px]"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddCustomDel(false)}
                    className="min-h-[44px] px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-200 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddCustomDeliverable}
                    className="min-h-[44px] px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 rounded-xl cursor-pointer shadow-xs active:scale-95 transition-all"
                  >
                    Save Deliverable
                  </button>
                </div>
              </div>
            )}

            {/* Visual Progress Bar */}
            <div className="space-y-1.5">
              <div className="w-full h-2.5 bg-zinc-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </div>

            {/* Checklist Items */}
            <div className="space-y-2.5">
              {checklistItems.map((item, idx) => {
                const isDone = item.status === 'done';
                const isInProgress = item.status === 'in_progress';

                return (
                  <div
                    key={item.id}
                    className={`p-3.5 sm:p-4 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                      isDone 
                        ? 'bg-emerald-50/50 border-emerald-200' 
                        : isInProgress 
                          ? 'bg-blue-50/50 border-blue-200' 
                          : 'bg-white border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Interactive 1-tap Checkbox */}
                      <button
                        onClick={() => handleToggleDeliverableStatus(item.id)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer touch-manipulation active:scale-90 shrink-0 ${
                          isDone 
                            ? 'bg-emerald-600 text-white shadow-xs' 
                            : 'border-2 border-zinc-300 hover:border-zinc-500 text-transparent'
                        }`}
                        title="Click to toggle Done"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                      </button>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm sm:text-base font-bold truncate ${isDone ? 'line-through text-zinc-500' : 'text-zinc-900'}`}>
                            {idx + 1}. {item.name}
                          </span>
                          <span className="text-xs text-zinc-500 capitalize hidden sm:inline">
                            • {item.category}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-zinc-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span>Deadline: {item.deadline}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* 1-Tap Status Pill */}
                      <button
                        onClick={() => handleToggleDeliverableStatus(item.id)}
                        className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer touch-manipulation active:scale-95 ${
                          isDone
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : isInProgress
                              ? 'bg-blue-100 text-blue-800 border-blue-300'
                              : 'bg-zinc-100 text-zinc-600 border-zinc-200 hover:bg-zinc-200'
                        }`}
                      >
                        {isDone ? '✓ Done' : isInProgress ? 'In Progress' : 'Pending'}
                      </button>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveDeliverable(item.id)}
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center text-zinc-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition-colors cursor-pointer touch-manipulation active:scale-95"
                        title="Delete Deliverable"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}


      {/* SECTION 4: NOTES & MESSAGES */}
      {activeSection === 'messages' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Customer & Internal Notes */}
            <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-zinc-900 font-display border-b border-zinc-100 pb-2">
                Customer & Internal Notes
              </h3>

              {/* Customer Requests */}
              <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 space-y-1">
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wider block">
                  Customer Special Requests & Family Preferences
                </span>
                <p className="text-sm text-zinc-700">
                  {booking.description || 'No special requests submitted by client.'}
                </p>
              </div>

              {/* Add Internal Note */}
              <form onSubmit={handleAddInternalNote} className="space-y-2 pt-2">
                <label className="text-xs sm:text-sm font-bold text-zinc-700 block">
                  + Add Internal Studio / Crew Note
                </label>
                <textarea
                  rows={2}
                  value={newInternalNote}
                  onChange={e => setNewInternalNote(e.target.value)}
                  placeholder="e.g. Lens requirements, drone permit, client requested warm grading..."
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-base sm:text-sm text-zinc-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-zinc-900"
                />
                <button
                  type="submit"
                  className="w-full sm:w-auto min-h-[48px] sm:min-h-[40px] px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl text-sm font-bold cursor-pointer touch-manipulation active:scale-95 transition-all shadow-2xs"
                >
                  Save Internal Note
                </button>
              </form>

              {/* Notes list */}
              <div className="space-y-2 pt-2">
                {(booking.notes || []).map((n, idx) => (
                  <div key={n.id || idx} className="p-3 rounded-xl border border-zinc-200 bg-zinc-50 text-sm space-y-1">
                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <span className="font-semibold text-zinc-700">{n.createdByName || 'Studio'}</span>
                      <span>{n.createdAt ? n.createdAt.split('T')[0] : ''}</span>
                    </div>
                    <p className="text-zinc-800 leading-normal">{n.content}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Ready-to-Send WhatsApp Messages */}
            <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-base font-bold text-zinc-900 font-display">
                    Ready-to-Send WhatsApp Messages
                  </h3>
                </div>
                <span className="text-xs text-zinc-400 font-medium">Click-to-Chat</span>
              </div>

              {/* Template Selectors */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'booking_confirmation', label: '1. Confirmation' },
                  { id: 'payment_receipt', label: '2. Payment Receipt' },
                  { id: 'event_reminder', label: '3. Event Reminder' },
                  { id: 'delivery_ready', label: '4. Delivery Ready' }
                ].map(tmpl => (
                  <button
                    key={tmpl.id}
                    onClick={() => setActiveWhatsAppTemplate(tmpl.id as any)}
                    className={`min-h-[48px] px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all text-left cursor-pointer border touch-manipulation active:scale-98 ${
                      activeWhatsAppTemplate === tmpl.id
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-300 shadow-2xs'
                        : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
                    }`}
                  >
                    {tmpl.label}
                  </button>
                ))}
              </div>

              {/* Live Preview of Message */}
              <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2">
                <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider block">
                  Message Preview for {booking.customerPhone}
                </span>
                <pre className="text-xs sm:text-sm font-sans text-zinc-800 whitespace-pre-wrap bg-white p-3 rounded-lg border border-zinc-200 max-h-48 overflow-y-auto">
                  {activeWhatsAppText}
                </pre>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <a
                  href={activeWhatsAppUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 min-h-[50px] sm:min-h-[44px] px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm sm:text-xs flex items-center justify-center gap-2 transition-colors shadow-2xs cursor-pointer touch-manipulation active:scale-98"
                >
                  <Send className="w-4 h-4" />
                  <span>Send on WhatsApp</span>
                </a>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(activeWhatsAppText);
                    showToast('Message copied to clipboard!');
                  }}
                  className="min-h-[50px] sm:min-h-[44px] px-4 py-3 rounded-xl border border-zinc-200 hover:bg-zinc-100 text-zinc-700 text-sm sm:text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer touch-manipulation active:scale-98"
                  title="Copy Text"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copy Message</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: COMPLETE HISTORY */}
      {activeSection === 'history' && (
        <CompleteBookingHistoryTab
          booking={booking}
          onRefresh={() => setRefreshKey(k => k + 1)}
          onOpenPaymentModal={() => setIsPaymentModalOpen(true)}
        />
      )}

      {/* MODAL 1: ADD PAYMENT */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl border border-zinc-200 max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-base font-bold text-zinc-900 font-display">Record Client Payment</h3>
              <button 
                onClick={() => setIsPaymentModalOpen(false)}
                className="min-w-[44px] min-h-[44px] rounded-xl hover:bg-zinc-100 flex items-center justify-center text-zinc-500 cursor-pointer"
              >
                <X className="w-5 h-5 sm:w-4 sm:h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-zinc-700 block mb-1">Amount to Credit (₹)</label>
                <input
                  type="number"
                  min="1"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(Number(e.target.value))}
                  className="w-full p-3 sm:p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-lg sm:text-base text-zinc-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-zinc-900 min-h-[48px]"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-700 block mb-1">Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={e => setPaymentMode(e.target.value as any)}
                  className="w-full p-3 sm:p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-base sm:text-xs text-zinc-900 focus:outline-none focus:bg-white min-h-[48px]"
                >
                  <option value="UPI">UPI / GPay / PhonePe</option>
                  <option value="Cash">Cash at Studio</option>
                  <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                  <option value="Card">Credit / Debit Card</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-zinc-700 block mb-1">Receipt / Reference Number</label>
                <input
                  type="text"
                  value={paymentRef}
                  onChange={e => setPaymentRef(e.target.value)}
                  className="w-full p-3 sm:p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-base sm:text-xs text-zinc-900 focus:outline-none focus:bg-white min-h-[48px]"
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-700 block mb-1">Notes / Remarks</label>
                <input
                  type="text"
                  value={paymentNote}
                  onChange={e => setPaymentNote(e.target.value)}
                  placeholder="e.g. Booking advance / Haldi installment"
                  className="w-full p-3 sm:p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-base sm:text-xs text-zinc-900 focus:outline-none focus:bg-white min-h-[48px]"
                />
              </div>

              <div className="pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="w-full sm:w-auto min-h-[48px] sm:min-h-[40px] px-5 py-2.5 border border-zinc-200 rounded-xl font-semibold text-zinc-600 hover:bg-zinc-50 text-sm sm:text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto min-h-[50px] sm:min-h-[44px] px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs text-sm sm:text-xs"
                >
                  Confirm & Credit Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT BOOKING DETAILS */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl border border-zinc-200 max-w-xl w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-base font-bold text-zinc-900 font-display">Edit Booking Details</h3>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="min-w-[44px] min-h-[44px] rounded-xl hover:bg-zinc-100 flex items-center justify-center text-zinc-500 cursor-pointer"
              >
                <X className="w-5 h-5 sm:w-4 sm:h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditBooking} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">Customer Name</label>
                  <input
                    type="text"
                    value={editFormData.customerName}
                    onChange={e => setEditFormData({ ...editFormData, customerName: e.target.value })}
                    className="w-full p-3 sm:p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-base sm:text-xs text-zinc-900 focus:bg-white min-h-[48px]"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">Customer Phone</label>
                  <input
                    type="text"
                    value={editFormData.customerPhone}
                    onChange={e => setEditFormData({ ...editFormData, customerPhone: e.target.value })}
                    className="w-full p-3 sm:p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-base sm:text-xs text-zinc-900 focus:bg-white min-h-[48px]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-zinc-700 block mb-1">Customer Email</label>
                <input
                  type="email"
                  value={editFormData.customerEmail}
                  onChange={e => setEditFormData({ ...editFormData, customerEmail: e.target.value })}
                  className="w-full p-3 sm:p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-base sm:text-xs text-zinc-900 focus:bg-white min-h-[48px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">Event Name</label>
                  <input
                    type="text"
                    value={editFormData.eventName}
                    onChange={e => setEditFormData({ ...editFormData, eventName: e.target.value })}
                    className="w-full p-3 sm:p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-base sm:text-xs text-zinc-900 focus:bg-white min-h-[48px]"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">Event Date</label>
                  <input
                    type="date"
                    value={editFormData.eventDate}
                    onChange={e => setEditFormData({ ...editFormData, eventDate: e.target.value })}
                    className="w-full p-3 sm:p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-base sm:text-xs text-zinc-900 focus:bg-white min-h-[48px]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-zinc-700 block mb-1">Primary Venue</label>
                <input
                  type="text"
                  value={editFormData.venue}
                  onChange={e => setEditFormData({ ...editFormData, venue: e.target.value })}
                  className="w-full p-3 sm:p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-base sm:text-xs text-zinc-900 focus:bg-white min-h-[48px]"
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5 border-t border-zinc-100 pt-3">
                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">Quotation (₹)</label>
                  <input
                    type="number"
                    value={editFormData.originalQuotation}
                    onChange={e => setEditFormData({ ...editFormData, originalQuotation: Number(e.target.value) })}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-base sm:text-xs text-zinc-900 focus:bg-white min-h-[48px]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">Discount (₹)</label>
                  <input
                    type="number"
                    value={editFormData.negotiatedDiscount}
                    onChange={e => setEditFormData({ ...editFormData, negotiatedDiscount: Number(e.target.value) })}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-base sm:text-xs text-zinc-900 focus:bg-white min-h-[48px]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">Final Agreed (₹)</label>
                  <input
                    type="number"
                    value={editFormData.finalAgreedAmount}
                    onChange={e => setEditFormData({ ...editFormData, finalAgreedAmount: Number(e.target.value) })}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-base sm:text-xs text-zinc-900 font-bold focus:bg-white min-h-[48px]"
                    required
                  />
                </div>
              </div>

              <div className="pt-3 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="w-full sm:w-auto min-h-[48px] sm:min-h-[40px] px-5 py-2.5 border border-zinc-200 rounded-xl font-semibold text-zinc-600 hover:bg-zinc-50 text-sm sm:text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto min-h-[50px] sm:min-h-[44px] px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold rounded-xl shadow-xs text-sm sm:text-xs cursor-pointer active:scale-95 transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ASSIGN CREW */}
      {isCrewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl border border-zinc-200 max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-base font-bold text-zinc-900 font-display">Assign Team Member</h3>
              <button 
                onClick={() => setIsCrewModalOpen(false)}
                className="min-w-[44px] min-h-[44px] rounded-xl hover:bg-zinc-100 flex items-center justify-center text-zinc-500 cursor-pointer"
              >
                <X className="w-5 h-5 sm:w-4 sm:h-4" />
              </button>
            </div>

            <form onSubmit={handleAssignCrew} className="space-y-4 text-xs">
              {crewConflictWarn && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
                  <div className="flex items-start gap-1.5 font-bold text-amber-800">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>Scheduling Warning</span>
                  </div>
                  <p className="text-xs sm:text-sm leading-relaxed">{crewConflictWarn.warningMessage}</p>
                  <label className="flex items-center gap-2 font-bold text-amber-950 cursor-pointer pt-1 min-h-[36px]">
                    <input
                      type="checkbox"
                      checked={allowCrewConflictOverride}
                      onChange={e => setAllowCrewConflictOverride(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-xs sm:text-sm">Allow Overlap & Confirm Assignment</span>
                  </label>
                </div>
              )}

              {/* Function Selector (Requirement: Assign to entire booking or specific wedding functions) */}
              <div>
                <label className="text-sm font-semibold text-zinc-700 block mb-1">
                  Assign to Function / Shoot Event
                </label>
                <select
                  value={selectedCrewFunctionId}
                  onChange={e => {
                    const fnId = e.target.value;
                    setSelectedCrewFunctionId(fnId);
                    if (selectedCrewEmployeeId) {
                      const targetFn = (booking.functions || []).find(f => f.id === fnId);
                      const targetDate = targetFn?.date || booking.mainEventDate || booking.startDate || '';
                      const warn = crewConflictService.checkConflict(
                        studioId,
                        selectedCrewEmployeeId,
                        targetDate,
                        targetFn?.startTime || '10:00',
                        targetFn?.endTime || '18:00',
                        booking.id
                      );
                      setCrewConflictWarn(warn.hasConflict ? warn : null);
                    }
                  }}
                  className="w-full p-3 sm:p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-base sm:text-sm text-zinc-900 focus:bg-white min-h-[48px]"
                >
                  <option value="all">Entire Booking — All Wedding Functions</option>
                  {(booking.functions || []).map(fn => (
                    <option key={fn.id} value={fn.id}>
                      {fn.name} ({fn.date || 'Date TBD'}{fn.venue ? ` • ${fn.venue}` : ''})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-zinc-700 block mb-1">Select Crew Member</label>
                <select
                  value={selectedCrewEmployeeId}
                  onChange={e => {
                    const empId = e.target.value;
                    setSelectedCrewEmployeeId(empId);
                    setAllowCrewConflictOverride(false);
                    if (empId) {
                      const emp = crewConflictService.getActiveEmployees(studioId).find(x => x.id === empId);
                      if (emp && isStudioOwnerId(emp.id, studioId)) {
                        setSelectedCrewRole('Lead Photographer');
                      }
                      const targetFn = (booking.functions || []).find(f => f.id === selectedCrewFunctionId);
                      const targetDate = targetFn?.date || booking.mainEventDate || booking.startDate || '';
                      const warn = crewConflictService.checkConflict(
                        studioId,
                        empId,
                        targetDate,
                        targetFn?.startTime || '10:00',
                        targetFn?.endTime || '18:00',
                        booking.id
                      );
                      setCrewConflictWarn(warn.hasConflict ? warn : null);
                    } else {
                      setCrewConflictWarn(null);
                    }
                  }}
                  className="w-full p-3 sm:p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-base sm:text-sm text-zinc-900 focus:bg-white min-h-[48px]"
                  required
                >
                  <option value="">-- Choose crew member --</option>
                  {crewConflictService.getActiveEmployees(studioId).map(emp => {
                    const isOwner = isStudioOwnerId(emp.id, studioId) || emp.fullName.includes('(Studio Owner)');
                    return (
                      <option key={emp.id} value={emp.id}>
                        {isOwner ? emp.fullName : `${emp.fullName} (${emp.designation || emp.roleName || 'Staff'})`}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-zinc-700 block mb-1">Assigned Role</label>
                <select
                  value={selectedCrewRole}
                  onChange={e => setSelectedCrewRole(e.target.value)}
                  className="w-full p-3 sm:p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-base sm:text-sm text-zinc-900 focus:bg-white min-h-[48px]"
                >
                  <option value="Lead Photographer">Lead Photographer</option>
                  <option value="Photographer">Photographer</option>
                  <option value="Candid Photographer">Candid Photographer</option>
                  <option value="Cinematographer">Cinematographer</option>
                  <option value="Videographer">Videographer</option>
                  <option value="Drone Operator">Drone Operator</option>
                  <option value="Photo Editor">Photo Editor</option>
                  <option value="Video Editor">Video Editor</option>
                  <option value="Album Designer">Album Designer</option>
                  <option value="Assistant">Assistant</option>
                  <option value="Production Assistant">Production Assistant</option>
                </select>
              </div>

              {/* Calendar Visibility setting */}
              <div className="p-3.5 rounded-xl bg-orange-50/60 border border-orange-200/80 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-zinc-900 flex items-center gap-1.5">
                    {crewModalVisibleOnCalendar ? <Eye className="w-4 h-4 text-emerald-600" /> : <EyeOff className="w-4 h-4 text-amber-600" />}
                    <span>Show on Employee's Calendar</span>
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    {crewModalVisibleOnCalendar ? 'Event will appear on the employee’s personal schedule' : 'Assigned in studio roster; schedule hidden from employee view'}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={crewModalVisibleOnCalendar}
                  onChange={e => setCrewModalVisibleOnCalendar(e.target.checked)}
                  className="w-5 h-5 rounded border-zinc-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                />
              </div>

              <div className="pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCrewModalOpen(false)}
                  className="w-full sm:w-auto min-h-[48px] sm:min-h-[40px] px-5 py-2.5 border border-zinc-200 rounded-xl font-semibold text-zinc-600 hover:bg-zinc-50 text-sm sm:text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto min-h-[50px] sm:min-h-[44px] px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold rounded-xl shadow-xs text-sm sm:text-xs cursor-pointer active:scale-95 transition-all"
                >
                  Assign Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: DELETE EVENT BOOKING (Studio Owner Only - Requirement 2) */}
      {isDeleteModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeletingBooking) {
              setIsDeleteModalOpen(false);
            }
          }}
        >
          <div 
            className="bg-white rounded-3xl border border-zinc-200/90 max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2.5 text-rose-600">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 font-display">Delete Event Booking</h3>
                  <p className="text-xs text-zinc-500 font-mono">{booking.bookingNumber}</p>
                </div>
              </div>
              <button
                type="button"
                disabled={isDeletingBooking}
                onClick={() => setIsDeleteModalOpen(false)}
                className="min-w-[44px] min-h-[44px] rounded-xl hover:bg-zinc-100 flex items-center justify-center text-zinc-500 cursor-pointer disabled:opacity-50 touch-manipulation active:scale-95 transition-transform"
                aria-label="Close delete confirmation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-zinc-600">
              <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-1.5">
                <div className="font-bold text-zinc-900 text-sm sm:text-base">{booking.eventName}</div>
                <div className="text-zinc-500 font-medium text-xs sm:text-sm">Customer: <strong className="text-zinc-800">{booking.customerName}</strong></div>
                <div className="text-zinc-500 font-medium text-xs sm:text-sm">Date: <strong className="text-zinc-800">{booking.mainEventDate || booking.startDate}</strong></div>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200 text-rose-900 leading-relaxed text-xs">
                <strong>Warning:</strong> Deleting this booking will remove it from active studio schedules, day agenda, and calendar. Financial transactions and audit logs will be securely preserved. This action cannot be undone.
              </div>

              {deleteError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 font-semibold flex items-center gap-2 text-xs">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{deleteError}</span>
                </div>
              )}
            </div>

            <div className="pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeletingBooking}
                onClick={() => setIsDeleteModalOpen(false)}
                className="w-full sm:w-auto min-h-[48px] px-5 py-2.5 border border-zinc-200 rounded-xl font-semibold text-zinc-600 hover:bg-zinc-50 text-sm cursor-pointer disabled:opacity-50 touch-manipulation active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingBooking}
                onClick={handleDeleteBookingConfirm}
                className="w-full sm:w-auto min-h-[50px] px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs text-sm cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 touch-manipulation"
              >
                {isDeletingBooking ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Deleting Booking...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 text-white" />
                    <span>Delete Event Booking</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
