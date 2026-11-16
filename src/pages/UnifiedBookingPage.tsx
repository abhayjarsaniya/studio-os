import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useStudio } from '../context/StudioContext';
import { bookingProductionService } from '../services/bookingProductionService';
import { calendarVisibilityService } from '../services/calendarVisibilityService';
import { crewConflictService, CrewConflictInfo } from '../services/crewConflictService';
import { 
  getStudioOwnerProfile, 
  getStudioOwnerCrewMember, 
  isStudioOwnerId, 
  formatOwnerCrewDisplayName 
} from '../services/studioOwnerHelper';
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
  Loader2,
  ListPlus,
  Users,
  Eye,
  EyeOff,
  AlertTriangle,
  Crown,
  X,
  ChevronDown,
  Check
} from 'lucide-react';
import { useOutsideClick } from '../hooks/useOutsideClick';

export interface PackageLineItem {
  id: string;
  name: string;
  category: 'photography' | 'videography' | 'drone' | 'editing' | 'album' | 'equipment' | 'custom';
  description: string;
  qty: number;
  rate: number;
}

export interface FunctionCrewMember {
  id: string;
  employeeId: string;
  employeeName: string;
  designation: string;
  department: string;
  role: string;
  contact?: string;
  isVisibleOnCalendar: boolean;
  isStudioOwner: boolean;
}

export interface BookingFunctionState {
  id: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  notes: string;
  assignedCrew: FunctionCrewMember[];
}

export const CREW_ROLES = [
  'Lead Photographer',
  'Candid Photographer',
  'Traditional Photographer',
  'Cinematographer',
  'Traditional Videographer',
  'Drone Pilot / Aerial',
  'Video Editor / Colorist',
  'Album Designer',
  'Production Assistant / Lightman',
  'Crane / Jib Operator',
  'Live Stream Technician',
  'Creative Director'
];

const DEFAULT_LINE_ITEMS: PackageLineItem[] = [
  { id: 'item_1', name: 'Traditional Photographer', category: 'photography', description: 'Experienced stage & family coverage', qty: 2, rate: 15000 },
  { id: 'item_2', name: 'Candid Photographer', category: 'photography', description: 'Creative portraits & emotional moments', qty: 2, rate: 25000 },
  { id: 'item_3', name: 'Cinematic Videographer', category: 'videography', description: '4K Gimbal & prime lenses coverage', qty: 2, rate: 30000 },
  { id: 'item_4', name: 'Aerial Drone Cinematographer', category: 'drone', description: '4K aerial views & grand entry shots', qty: 1, rate: 15000 }
];

export const PREDEFINED_SUB_EVENT_TYPES = [
  'Pre-Wedding',
  'Engagement',
  'Mandvo',
  'Haldi',
  'Mehndi',
  'Wedding',
  'Reception',
  'Custom Shoot'
] as const;

export const PREDEFINED_FUNCTION_TYPES = PREDEFINED_SUB_EVENT_TYPES;

export const UnifiedBookingPage: React.FC = () => {
  const { customers, setActiveTab, openPdfViewer } = useApp();
  const { currentStudio } = useStudio();
  const studioId = currentStudio.id;

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [successBookingId, setSuccessBookingId] = useState<string | null>(null);

  // Step 1: Customer Details
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const formBookingIdRef = useRef<string | null>(null);
  const formBookingNumberRef = useRef<string | null>(null);
  const customerSearchRef = useRef<HTMLDivElement>(null);

  // Close customer dropdown on outside click/tap or Escape
  useOutsideClick(customerSearchRef, () => setShowCustomerDropdown(false), showCustomerDropdown);
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

  // Step 3: Functions (Unlimited) with Independent Crew Allocations
  const [functions, setFunctions] = useState<BookingFunctionState[]>([
    {
      id: 'fn_1',
      name: 'Wedding Ceremony',
      date: '',
      startTime: '10:00',
      endTime: '15:00',
      venue: '',
      notes: 'Main wedding rituals & mandap',
      assignedCrew: []
    }
  ]);

  // Keep first function's date and venue in sync with Step 2 inputs if not overridden
  useEffect(() => {
    if (eventDate) {
      setFunctions(prev => prev.map((f, i) => (i === 0 && !f.date) ? { ...f, date: eventDate } : f));
    }
  }, [eventDate]);

  useEffect(() => {
    if (venue) {
      setFunctions(prev => prev.map((f, i) => (i === 0 && !f.venue) ? { ...f, venue } : f));
    }
  }, [venue]);

  // Step 3: Sub-Event Selection & Search State
  const [isSubEventPickerOpen, setIsSubEventPickerOpen] = useState(false);
  const [subEventSearchQuery, setSubEventSearchQuery] = useState('');
  const [customSubEventName, setCustomSubEventName] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const subEventPickerRef = useRef<HTMLDivElement>(null);

  useOutsideClick(subEventPickerRef, () => {
    setIsSubEventPickerOpen(false);
    setShowCustomInput(false);
    setSubEventSearchQuery('');
  }, isSubEventPickerOpen);

  // Step 4: Crew Assignment State
  const [selectedCrewFunctionId, setSelectedCrewFunctionId] = useState<string>('all');
  const [crewAssignmentNotice, setCrewAssignmentNotice] = useState<string | null>(null);
  const [activeFunctionTab, setActiveFunctionTab] = useState<string>('all');

  const activeEmployees = useMemo(() => {
    return crewConflictService.getActiveEmployees(studioId);
  }, [studioId]);

  const ownerProfile = useMemo(() => {
    return getStudioOwnerProfile(studioId);
  }, [studioId]);

  // Keep selectedCrewFunctionId valid
  useEffect(() => {
    if (selectedCrewFunctionId !== 'all' && !functions.some(f => f.id === selectedCrewFunctionId)) {
      setSelectedCrewFunctionId(functions[0]?.id || 'all');
    }
  }, [functions, selectedCrewFunctionId]);

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

  // Add Sub-Event
  const handleAddSubEvent = (eventType: string) => {
    const trimmed = eventType.trim();
    if (!trimmed) return;
    const newId = `fn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setFunctions(prev => [
      ...prev,
      {
        id: newId,
        name: trimmed,
        date: eventDate || '',
        startTime: '10:00',
        endTime: '14:00',
        venue: venue || '',
        notes: '',
        assignedCrew: []
      }
    ]);
    setSelectedCrewFunctionId(newId);
    setIsSubEventPickerOpen(false);
    setShowCustomInput(false);
    setSubEventSearchQuery('');
    setCustomSubEventName('');
  };

  const handleAddFunction = handleAddSubEvent;

  const handleRemoveFunction = (id: string) => {
    if (functions.length <= 1) return;
    setFunctions(prev => prev.filter(f => f.id !== id));
    if (selectedCrewFunctionId === id) {
      setSelectedCrewFunctionId('all');
    }
  };

  // Check if a member is currently assigned to a function
  const isMemberAssignedToFunction = (fn: BookingFunctionState, empId: string) => {
    return (fn.assignedCrew || []).some(c => 
      c.employeeId === empId || (isStudioOwnerId(empId, studioId) && isStudioOwnerId(c.employeeId, studioId))
    );
  };

  // Toggle crew member assignment for an individual sub-event via multi-select checkbox (no role dropdown)
  const handleToggleCrewMemberForFunction = (fnId: string, emp: { id: string; fullName: string; designation?: string; department?: string; phone?: string; isStudioOwner?: boolean }) => {
    const isOwner = isStudioOwnerId(emp.id, studioId) || Boolean(emp.isStudioOwner);
    const employeeName = isOwner ? formatOwnerCrewDisplayName(emp.fullName) : emp.fullName;
    const defaultRole = isOwner ? 'Studio Owner' : (emp.designation || 'Crew Member');

    setFunctions(prev => prev.map(fn => {
      if (fn.id !== fnId) return fn;

      const existing = fn.assignedCrew || [];
      const isAlreadyAssigned = existing.some(c => 
        c.employeeId === emp.id || (isOwner && isStudioOwnerId(c.employeeId, studioId))
      );

      if (isAlreadyAssigned) {
        return {
          ...fn,
          assignedCrew: existing.filter(c => 
            c.employeeId !== emp.id && !(isOwner && isStudioOwnerId(c.employeeId, studioId))
          )
        };
      } else {
        const newMember: FunctionCrewMember = {
          id: `asgn_${fn.id}_${emp.id}_${Date.now()}`,
          employeeId: emp.id,
          employeeName,
          designation: isOwner ? 'Studio Owner' : (emp.designation || 'Crew Member'),
          department: isOwner ? 'Management' : (emp.department || 'Production'),
          role: defaultRole,
          contact: emp.phone || '',
          isVisibleOnCalendar: true,
          isStudioOwner: Boolean(isOwner)
        };
        return {
          ...fn,
          assignedCrew: [...existing, newMember]
        };
      }
    }));
  };

  // Step 4: Toggle crew member for target function(s) (All or specific function)
  const handleToggleCrewMemberStep4 = (emp: { id: string; fullName: string; designation?: string; department?: string; phone?: string; isStudioOwner?: boolean }) => {
    const isOwner = isStudioOwnerId(emp.id, studioId) || Boolean(emp.isStudioOwner);
    const employeeName = isOwner ? formatOwnerCrewDisplayName(emp.fullName) : emp.fullName;
    const defaultRole = isOwner ? 'Studio Owner' : (emp.designation || 'Crew Member');

    const targetFns = selectedCrewFunctionId === 'all'
      ? functions
      : functions.filter(f => f.id === selectedCrewFunctionId);

    const allAssigned = targetFns.every(fn => isMemberAssignedToFunction(fn, emp.id));

    setFunctions(prev => prev.map(fn => {
      const isTarget = selectedCrewFunctionId === 'all' || fn.id === selectedCrewFunctionId;
      if (!isTarget) return fn;

      const existing = fn.assignedCrew || [];
      if (allAssigned) {
        return {
          ...fn,
          assignedCrew: existing.filter(c => 
            c.employeeId !== emp.id && !(isOwner && isStudioOwnerId(c.employeeId, studioId))
          )
        };
      } else {
        const alreadyIn = existing.some(c => 
          c.employeeId === emp.id || (isOwner && isStudioOwnerId(c.employeeId, studioId))
        );
        if (alreadyIn) return fn;
        const newMember: FunctionCrewMember = {
          id: `asgn_${fn.id}_${emp.id}_${Date.now()}`,
          employeeId: emp.id,
          employeeName,
          designation: isOwner ? 'Studio Owner' : (emp.designation || 'Crew Member'),
          department: isOwner ? 'Management' : (emp.department || 'Production'),
          role: defaultRole,
          contact: emp.phone || '',
          isVisibleOnCalendar: true,
          isStudioOwner: Boolean(isOwner)
        };
        return {
          ...fn,
          assignedCrew: [...existing, newMember]
        };
      }
    }));

    const actionText = allAssigned ? 'Removed' : 'Assigned';
    const targetText = selectedCrewFunctionId === 'all' ? `all ${functions.length} functions` : (functions.find(f => f.id === selectedCrewFunctionId)?.name || 'function');
    setCrewAssignmentNotice(`${actionText} ${employeeName} for ${targetText}.`);
    setTimeout(() => setCrewAssignmentNotice(null), 3000);
  };

  // Remove crew member from a specific function
  const handleRemoveCrewMember = (fnId: string, empId: string) => {
    setFunctions(prev => prev.map(fn => {
      if (fn.id !== fnId) return fn;
      return {
        ...fn,
        assignedCrew: (fn.assignedCrew || []).filter(c => 
          c.employeeId !== empId && !(isStudioOwnerId(empId, studioId) && isStudioOwnerId(c.employeeId, studioId))
        )
      };
    }));
  };

  // Toggle calendar visibility for a specific member in a function
  const handleToggleCrewVisibility = (fnId: string, empId: string) => {
    setFunctions(prev => prev.map(fn => {
      if (fn.id !== fnId) return fn;
      return {
        ...fn,
        assignedCrew: (fn.assignedCrew || []).map(c => {
          if (c.employeeId === empId || (isStudioOwnerId(empId, studioId) && isStudioOwnerId(c.employeeId, studioId))) {
            return { ...c, isVisibleOnCalendar: !c.isVisibleOnCalendar };
          }
          return c;
        })
      };
    }));
  };

  // Assign Studio Owner to all functions in 1 tap
  const handleAssignOwnerToAll = () => {
    const ownerMember = activeEmployees[0] || getStudioOwnerCrewMember(studioId);
    const ownerName = formatOwnerCrewDisplayName(ownerMember.fullName);

    setFunctions(prev => prev.map(fn => {
      const existing = fn.assignedCrew || [];
      const hasOwner = existing.some(c => isStudioOwnerId(c.employeeId, studioId));
      if (hasOwner) {
        return {
          ...fn,
          assignedCrew: existing.map(c => 
            isStudioOwnerId(c.employeeId, studioId) 
              ? { ...c, role: 'Studio Owner', isVisibleOnCalendar: true } 
              : c
          )
        };
      }
      return {
        ...fn,
        assignedCrew: [
          ...existing,
          {
            id: `asgn_${fn.id}_owner`,
            employeeId: ownerMember.id,
            employeeName: ownerName,
            designation: 'Studio Owner',
            department: 'Management',
            role: 'Studio Owner',
            contact: ownerMember.phone || '',
            isVisibleOnCalendar: true,
            isStudioOwner: true
          }
        ]
      };
    }));

    setCrewAssignmentNotice(`Studio Owner (${ownerName}) assigned across all ${functions.length} functions.`);
    setTimeout(() => setCrewAssignmentNotice(null), 3000);
  };

  // Apply a specific function's crew across all sub-events
  const handleCopyCrewFromFunction = (fromFnId: string, toFnId?: string) => {
    const sourceFn = functions.find(f => f.id === fromFnId);
    if (!sourceFn || !sourceFn.assignedCrew || sourceFn.assignedCrew.length === 0) {
      alert('Selected source function has no assigned crew to copy.');
      return;
    }

    setFunctions(prev => prev.map(fn => {
      if (toFnId) {
        if (fn.id !== toFnId) return fn;
      } else {
        if (fn.id === fromFnId) return fn;
      }
      return {
        ...fn,
        assignedCrew: sourceFn.assignedCrew.map(c => ({
          ...c,
          id: `asgn_${fn.id}_${c.employeeId}_${Date.now()}`
        }))
      };
    }));

    const destinationLabel = toFnId ? (functions.find(f => f.id === toFnId)?.name || 'target function') : `all ${functions.length} functions`;
    setCrewAssignmentNotice(`Copied ${sourceFn.assignedCrew.length} crew members to ${destinationLabel}.`);
    setTimeout(() => setCrewAssignmentNotice(null), 3000);
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

  // Save Booking (Draft or Confirmed) with Submission Lock & Idempotency
  const handleSaveBooking = async (status: 'quotation' | 'confirmed') => {
    if (isSubmittingRef.current || isSubmitting) return;

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

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      // Reuse stable booking ID across retries / submissions
      if (!formBookingIdRef.current) {
        formBookingIdRef.current = `book_${Date.now()}`;
        formBookingNumberRef.current = `BK-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
      }
      const bookingId = formBookingIdRef.current;
      const bookingNumber = formBookingNumberRef.current;

    // Convert functions with their assigned crew
    const fnPlans: FunctionPlan[] = functions.map((fn, idx) => {
      const assignedCrew = (fn.assignedCrew || []).map(c => ({
        employeeId: c.employeeId,
        employeeName: c.employeeName,
        role: c.role,
        contact: c.contact,
        isVisibleOnCalendar: c.isVisibleOnCalendar !== false
      }));

      const photographerIds = (fn.assignedCrew || [])
        .filter(c => /photo|candid|traditional photo|portrait|lead/i.test(c.role))
        .map(c => c.employeeId);
      const videographerIds = (fn.assignedCrew || [])
        .filter(c => /video|cinema|film|traditional video/i.test(c.role))
        .map(c => c.employeeId);
      const droneIds = (fn.assignedCrew || [])
        .filter(c => /drone|aerial/i.test(c.role))
        .map(c => c.employeeId);
      const editorIds = (fn.assignedCrew || [])
        .filter(c => /edit|colorist|album/i.test(c.role))
        .map(c => c.employeeId);

      return {
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
        assignedPhotographerIds: photographerIds,
        assignedVideographerIds: videographerIds,
        assignedDroneOperatorIds: droneIds,
        assignedEditorIds: editorIds,
        assignedSupplierIds: [],
        assignedCrew,
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
      };
    });

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

      await bookingProductionService.saveBooking(studioId, newBooking);

      // Save each function's crew assignments through calendarVisibilityService
      for (const fn of functions) {
        for (const member of (fn.assignedCrew || [])) {
          try {
            await calendarVisibilityService.assignCrewMember({
              studioId,
              bookingId,
              functionId: fn.id,
              employeeId: member.employeeId,
              employeeName: member.employeeName,
              designation: member.designation,
              department: member.department,
              role: member.role,
              contact: member.contact,
              isVisibleOnCalendar: member.isVisibleOnCalendar !== false,
              assignedBy: 'Studio Owner',
              allowConflictOverride: true
            });
          } catch (assignErr) {
            console.warn('[UnifiedBookingPage.handleSaveBooking] Assign crew note:', assignErr);
          }
        }
      }

      setSuccessBookingId(bookingId);
    } catch (err: any) {
      console.error('[UnifiedBookingPage.handleSaveBooking] Error:', err);
      alert('Failed to save booking. Please check your network and try again.');
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  const steps = [
    { num: 1, title: 'Customer' },
    { num: 2, title: 'Event' },
    { num: 3, title: 'Functions' },
    { num: 4, title: 'Crew' },
    { num: 5, title: 'Package' },
    { num: 6, title: 'Deliverables' },
    { num: 7, title: 'Price' },
    { num: 8, title: 'Review & Confirm' }
  ];

  return (
    <div className="max-w-7xl w-full mx-auto pb-24 space-y-6 px-3.5 sm:px-6 lg:px-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
              Direct Booking Engine
            </span>
            <span className="text-xs text-zinc-400">Step {currentStep} of {steps.length}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight mt-1 font-display">
            New Event Booking & Quotation
          </h1>
          <p className="text-sm text-zinc-600 mt-1">
            Progressive workflow: customer, event schedule, team allocation, package, and confirmation.
          </p>
        </div>

        <button
          onClick={() => {
            setActiveTab('dashboard');
            window.location.hash = '#/app/dashboard';
          }}
          className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 self-start sm:self-auto cursor-pointer"
        >
          Cancel & Return
        </button>
      </div>

      {/* 8-Step Progress Stepper */}
      <div className="bg-white p-3 rounded-2xl border border-zinc-200/80 shadow-xs overflow-x-auto">
        <div className="flex items-center justify-between min-w-[700px] px-2">
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
                      ? 'bg-orange-500 text-white shadow-xs' 
                      : isCompleted 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-zinc-100 text-zinc-500'
                  }`}>
                    {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : st.num}
                  </div>
                  <span className={`text-xs sm:text-sm font-semibold whitespace-nowrap ${
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
            <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 font-display">Event Booking Saved Successfully!</h2>
            <p className="text-sm text-zinc-600 mt-1">
              Record created for <strong>{customerName}</strong> ({eventName}). All deliverables & financial ledgers initialized.
            </p>
          </div>

          <div className="pt-4 flex items-center justify-center gap-3">
            <button
              onClick={() => {
                setActiveTab('bookings');
                window.location.hash = `#/app/bookings/${successBookingId}`;
              }}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-sm shadow-xs transition-all active:scale-95 cursor-pointer min-h-[48px]"
            >
              Open Booking Workspace →
            </button>
            <button
              onClick={handleGeneratePdf}
              className="px-4 py-3 rounded-xl border border-zinc-200 hover:bg-zinc-100 font-semibold text-sm flex items-center gap-1.5 min-h-[48px]"
            >
              <Printer className="w-4 h-4" />
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
              <div className="relative" ref={customerSearchRef}>
                <label className="block text-xs font-bold uppercase text-zinc-500 mb-1">
                  Lookup Existing Customer (Prevent Duplicates)
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setShowCustomerDropdown(true);
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    placeholder="Type client mobile number or name..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>

                {showCustomerDropdown && matchingCustomers.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-xl shadow-xl z-20 overflow-hidden divide-y divide-zinc-100">
                    {matchingCustomers.map(c => (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => {
                          handleSelectCustomer(c);
                          setShowCustomerDropdown(false);
                        }}
                        className="w-full p-2.5 text-left text-xs hover:bg-zinc-50 flex items-center justify-between"
                      >
                        <div>
                          <strong className="text-zinc-900 block">{c.name}</strong>
                          <span className="text-xs text-zinc-500 font-mono">{c.phone} • {c.city || 'City not set'}</span>
                        </div>
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">Use This Profile</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-500 mb-1">Customer Full Name *</label>
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
                  <label className="block text-xs font-bold uppercase text-zinc-500 mb-1">Mobile Phone Number *</label>
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
                  <label className="block text-xs font-bold uppercase text-zinc-500 mb-1">WhatsApp Number</label>
                  <input
                    type="tel"
                    value={customerWhatsApp}
                    onChange={(e) => setCustomerWhatsApp(e.target.value)}
                    placeholder="Same as mobile if empty"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-500 mb-1">City / Region</label>
                  <input
                    type="text"
                    value={customerCity}
                    onChange={(e) => setCustomerCity(e.target.value)}
                    placeholder="e.g. Mumbai"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase text-zinc-500 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="client@example.com"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase text-zinc-500 mb-1">Client Notes / Special Requests</label>
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
                  <label className="block text-xs font-bold uppercase text-zinc-500 mb-1">Event Title *</label>
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
                  <label className="block text-xs font-bold uppercase text-zinc-500 mb-1">Category / Type</label>
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
                  <label className="block text-xs font-bold uppercase text-zinc-500 mb-1">Main Event Date *</label>
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-500 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-500 mb-1">Final Delivery Target Date</label>
                  <input
                    type="date"
                    value={mainEventDeadline}
                    onChange={(e) => setMainEventDeadline(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-500 mb-1">Venue / Hotel / Resort</label>
                  <input
                    type="text"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    placeholder="e.g. The Taj Palace & Convention Center"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-500 mb-1">City / Shoot Location</label>
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

          {/* STEP 3: FUNCTIONS & SUB-EVENTS */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-100 text-orange-800 border border-orange-200">
                      Functions & Sub-Events
                    </span>
                    <span className="text-xs text-zinc-500 font-medium">
                      {functions.length} {functions.length === 1 ? 'Sub-Event' : 'Sub-Events Configured'}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-zinc-900 font-display mt-1">
                    Step 3 — Sub-Events & Crew Allocation
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-500">
                    Add wedding functions with schedule, venue, and assign dedicated crew members with calendar visibility controls.
                  </p>
                </div>

                <div className="relative" ref={subEventPickerRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSubEventPickerOpen(prev => !prev);
                      setSubEventSearchQuery('');
                      setShowCustomInput(false);
                    }}
                    className="w-full sm:w-auto min-h-[46px] sm:min-h-[42px] px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>+ Add Sub-Event</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${isSubEventPickerOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Searchable Sub-Event Dropdown / Mobile Bottom Sheet */}
                  {isSubEventPickerOpen && (
                    <div className="fixed inset-x-0 bottom-0 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 z-50 bg-white rounded-t-3xl sm:rounded-2xl border border-zinc-200 shadow-2xl p-4 sm:p-5 w-full sm:w-80 md:w-96 space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-150 max-h-[85vh] overflow-y-auto">
                      <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                        <div>
                          <h4 className="text-sm font-bold text-zinc-900 font-display">Add Sub-Event / Function</h4>
                          <p className="text-xs text-zinc-500">Choose type or type custom shoot</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsSubEventPickerOpen(false)}
                          className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Search Input */}
                      <div className="relative">
                        <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={subEventSearchQuery}
                          onChange={(e) => setSubEventSearchQuery(e.target.value)}
                          placeholder="Search (e.g. Haldi, Pre-Wedding, Mehndi)..."
                          autoFocus
                          className="w-full pl-9 pr-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white text-base sm:text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[42px] sm:min-h-[38px]"
                        />
                      </div>

                      {/* Filtered List of Predefined Types */}
                      <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pt-1">
                        {PREDEFINED_SUB_EVENT_TYPES
                          .filter(t => t !== 'Custom Shoot')
                          .filter(t => t.toLowerCase().includes(subEventSearchQuery.toLowerCase()))
                          .map((evtType) => (
                            <button
                              key={evtType}
                              type="button"
                              onClick={() => handleAddSubEvent(evtType)}
                              className="px-3 py-2.5 rounded-xl border border-zinc-200/90 bg-zinc-50/70 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-950 font-bold text-xs text-zinc-800 text-left transition-all active:scale-95 cursor-pointer flex items-center justify-between min-h-[42px]"
                            >
                              <span>{evtType}</span>
                              <Plus className="w-3.5 h-3.5 text-zinc-400" />
                            </button>
                          ))}
                      </div>

                      {/* Custom Shoot Option */}
                      <div className="pt-2 border-t border-zinc-100">
                        {showCustomInput ? (
                          <div className="space-y-2">
                            <label className="block text-xs font-bold uppercase text-zinc-500">Custom Shoot Name</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={customSubEventName}
                                onChange={(e) => setCustomSubEventName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddSubEvent(customSubEventName || 'Custom Shoot');
                                  }
                                }}
                                placeholder="e.g. Sangeet Night, Cocktail, Maternity"
                                className="flex-1 px-3 py-2 rounded-xl border border-zinc-200 text-base sm:text-xs text-zinc-900 min-h-[40px] focus:outline-none focus:ring-2 focus:ring-orange-500"
                              />
                              <button
                                type="button"
                                onClick={() => handleAddSubEvent(customSubEventName || 'Custom Shoot')}
                                className="px-3 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs min-h-[40px] cursor-pointer"
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowCustomInput(true)}
                            className="w-full py-2.5 px-3 rounded-xl border border-dashed border-orange-300 bg-orange-50/60 hover:bg-orange-100/70 text-orange-900 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[40px]"
                          >
                            <Plus className="w-3.5 h-3.5 text-orange-600" />
                            <span>+ Custom Shoot / Function</span>
                          </button>
                        )}
                      </div>

                      {/* If search query has no match, offer quick add as custom */}
                      {subEventSearchQuery.trim() && !PREDEFINED_SUB_EVENT_TYPES.some(t => t.toLowerCase() === subEventSearchQuery.toLowerCase()) && (
                        <button
                          type="button"
                          onClick={() => handleAddSubEvent(subEventSearchQuery)}
                          className="w-full p-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs text-center transition-colors cursor-pointer"
                        >
                          + Add "{subEventSearchQuery}" as Sub-Event
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Notice Toast */}
              {crewAssignmentNotice && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 animate-in fade-in duration-150">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{crewAssignmentNotice}</span>
                </div>
              )}

              {/* Sub-Events List */}
              <div className="space-y-5">
                {functions.map((fn, idx) => {
                  const ownerMember = activeEmployees[0] || getStudioOwnerCrewMember(studioId);
                  const ownerDisplayName = formatOwnerCrewDisplayName(ownerProfile.name || ownerMember.fullName);
                  const isOwnerAssigned = isMemberAssignedToFunction(fn, ownerMember.id);
                  const otherEmployees = activeEmployees.filter(e => !isStudioOwnerId(e.id, studioId));

                  return (
                    <div key={fn.id} className="p-4 sm:p-5 rounded-2xl border border-zinc-200/90 bg-white shadow-2xs space-y-4 text-xs">
                      {/* Sub-Event Header */}
                      <div className="flex items-center justify-between gap-3 border-b border-zinc-100 pb-3">
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <span className="w-7 h-7 rounded-xl bg-orange-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                            #{idx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <input
                              type="text"
                              value={fn.name}
                              onChange={(e) => {
                                const val = e.target.value;
                                setFunctions(prev => prev.map(f => f.id === fn.id ? { ...f, name: val } : f));
                              }}
                              placeholder="Sub-Event Name (e.g. Haldi Ceremony)"
                              className="font-bold text-sm sm:text-base text-zinc-900 bg-transparent border-b border-dashed border-zinc-300 hover:border-zinc-400 focus:border-orange-500 focus:outline-none px-1 py-0.5 w-full max-w-md"
                            />
                            <span className="text-xs text-zinc-400 block font-normal">Click title to edit name</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {functions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveFunction(fn.id)}
                              className="p-2 rounded-xl text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete this sub-event"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Editable Fields Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">Date</label>
                          <input
                            type="date"
                            value={fn.date}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFunctions(prev => prev.map(f => f.id === fn.id ? { ...f, date: val } : f));
                            }}
                            className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white font-mono text-base sm:text-xs text-zinc-800"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">Start Time</label>
                          <input
                            type="time"
                            value={fn.startTime}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFunctions(prev => prev.map(f => f.id === fn.id ? { ...f, startTime: val } : f));
                            }}
                            className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white font-mono text-base sm:text-xs text-zinc-800"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">End Time</label>
                          <input
                            type="time"
                            value={fn.endTime}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFunctions(prev => prev.map(f => f.id === fn.id ? { ...f, endTime: val } : f));
                            }}
                            className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white font-mono text-base sm:text-xs text-zinc-800"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">Venue</label>
                          <input
                            type="text"
                            value={fn.venue}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFunctions(prev => prev.map(f => f.id === fn.id ? { ...f, venue: val } : f));
                            }}
                            placeholder={venue || 'Function venue'}
                            className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-base sm:text-xs text-zinc-800"
                          />
                        </div>
                      </div>

                      {/* Notes Input */}
                      <div>
                        <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">Sub-Event Notes / Instructions</label>
                        <input
                          type="text"
                          value={fn.notes}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFunctions(prev => prev.map(f => f.id === fn.id ? { ...f, notes: val } : f));
                          }}
                          placeholder="e.g. Drone clearance required, bride grand entry at 11:30 AM"
                          className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-base sm:text-xs text-zinc-800"
                        />
                      </div>

                      {/* Independent Crew Assignment Section inside each Sub-Event card */}
                      <div className="pt-3 border-t border-zinc-200/80 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-orange-600" />
                            <h4 className="text-xs sm:text-sm font-bold text-zinc-900">
                              Assigned Crew ({fn.assignedCrew?.length || 0})
                            </h4>
                            <span className="text-xs text-zinc-400 hidden sm:inline">• Multi-select checkboxes</span>
                          </div>

                          <div className="flex items-center gap-2">
                            {functions.length > 1 && (fn.assignedCrew?.length || 0) > 0 && (
                              <button
                                type="button"
                                onClick={() => handleCopyCrewFromFunction(fn.id)}
                                className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                                title="Apply this crew assignment across all other sub-events in 1 click"
                              >
                                <span>⚡ Apply to All Sub-Events</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Multi-Select Crew Checkbox Grid (No Role Dropdown) */}
                        <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/80 space-y-2">
                          <p className="text-xs font-bold uppercase text-zinc-400">
                            Check to assign or unassign team members (Role dropdown removed — designation assigned automatically):
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {/* Studio Owner Checkbox */}
                            <label className={`flex items-center gap-2 p-2 rounded-xl border transition-all cursor-pointer ${
                              isOwnerAssigned
                                ? 'bg-amber-50/90 border-amber-300 text-amber-950 font-bold shadow-2xs'
                                : 'bg-white border-zinc-200 hover:border-zinc-300 text-zinc-700'
                            }`}>
                              <input
                                type="checkbox"
                                checked={isOwnerAssigned}
                                onChange={() => handleToggleCrewMemberForFunction(fn.id, {
                                  id: ownerMember.id,
                                  fullName: ownerDisplayName,
                                  designation: 'Studio Owner',
                                  department: 'Management',
                                  phone: ownerMember.phone || '',
                                  isStudioOwner: true
                                })}
                                className="w-4 h-4 text-orange-600 rounded cursor-pointer accent-orange-600 shrink-0"
                              />
                              <div className="min-w-0 flex items-center gap-1.5 truncate">
                                <span>👑</span>
                                <span className="text-xs truncate">{ownerDisplayName}</span>
                                <span className="px-1.5 py-0.2 rounded-full text-xs font-bold bg-amber-200/80 text-amber-900 shrink-0">Owner</span>
                              </div>
                            </label>

                            {/* Active Employees Checkboxes */}
                            {otherEmployees.map(emp => {
                              const isAssigned = isMemberAssignedToFunction(fn, emp.id);
                              return (
                                <label key={emp.id} className={`flex items-center gap-2 p-2 rounded-xl border transition-all cursor-pointer ${
                                  isAssigned
                                    ? 'bg-orange-50/80 border-orange-300 text-orange-950 font-bold shadow-2xs'
                                    : 'bg-white border-zinc-200 hover:border-zinc-300 text-zinc-700'
                                }`}>
                                  <input
                                    type="checkbox"
                                    checked={isAssigned}
                                    onChange={() => handleToggleCrewMemberForFunction(fn.id, emp)}
                                    className="w-4 h-4 text-orange-600 rounded cursor-pointer accent-orange-600 shrink-0"
                                  />
                                  <div className="min-w-0 truncate">
                                    <span className="text-xs truncate block">{emp.fullName}</span>
                                    <span className="text-xs text-zinc-400 font-normal truncate block">{emp.designation || 'Staff'}</span>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        {/* Selected Crew List for this Sub-Event with Show/Hide & Remove */}
                        {fn.assignedCrew && fn.assignedCrew.length > 0 ? (
                          <div className="space-y-2 pt-1">
                            <p className="text-xs font-bold uppercase text-zinc-400">Assigned Crew for {fn.name}:</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {fn.assignedCrew.map((member) => (
                                <div key={member.employeeId} className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white border border-zinc-200 shadow-2xs">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                                      member.isStudioOwner ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-orange-100 text-orange-800'
                                    }`}>
                                      {member.isStudioOwner ? '👑' : member.employeeName.charAt(0)}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-bold text-xs sm:text-sm text-zinc-900 truncate">{member.employeeName}</span>
                                        {member.isStudioOwner && (
                                          <span className="px-1.5 py-0.2 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                            Owner
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-xs text-zinc-500 truncate block">{member.designation}</span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {/* Individual Calendar Visibility Toggle */}
                                    <button
                                      type="button"
                                      onClick={() => handleToggleCrewVisibility(fn.id, member.employeeId)}
                                      className={`min-h-[30px] px-2 py-1 rounded-lg border text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                        member.isVisibleOnCalendar
                                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                          : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                                      }`}
                                      title={member.isVisibleOnCalendar ? 'Visible on employee calendar. Click to hide.' : 'Hidden from calendar. Click to show.'}
                                    >
                                      {member.isVisibleOnCalendar ? (
                                        <>
                                          <Eye className="w-3.5 h-3.5 text-emerald-600" />
                                          <span>Show</span>
                                        </>
                                      ) : (
                                        <>
                                          <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                                          <span>Hide</span>
                                        </>
                                      )}
                                    </button>

                                    {/* Remove Button */}
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveCrewMember(fn.id, member.employeeId)}
                                      className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                      title="Remove from this sub-event"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-zinc-400 italic">
                            No crew members assigned yet. Check members above to assign to {fn.name}.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: TEAM & CREW ASSIGNMENT */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Header */}
              <div className="border-b border-zinc-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-100 text-orange-800 border border-orange-200">
                      Mandatory Team Allocation
                    </span>
                    <span className="text-xs font-medium text-zinc-500">
                      {functions.length} {functions.length === 1 ? 'Event / Function' : 'Wedding Functions'}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-zinc-900 font-display mt-1">
                    Step 4 — Team & Crew Assignment
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-500">
                    Assign studio crew members and yourself to each individual wedding function using multi-select checkboxes. Roles are mapped directly from staff designations.
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={handleAssignOwnerToAll}
                    className="min-h-[42px] px-3.5 py-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs active:scale-95"
                    title="Assign Studio Owner across all functions in 1 tap"
                  >
                    <Crown className="w-3.5 h-3.5 text-amber-700" />
                    <span>+ Assign Studio Owner to All</span>
                  </button>
                </div>
              </div>

              {/* Notice toast if set */}
              {crewAssignmentNotice && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 animate-in fade-in duration-150">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{crewAssignmentNotice}</span>
                </div>
              )}

              {/* Assignment Form Card (Multi-Select Checkboxes, No Role Dropdown) */}
              <div className="bg-zinc-50/80 border border-zinc-200/90 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200/60 pb-2">
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-orange-600" />
                      <span>Quick Multi-Select Crew Allocation</span>
                    </h4>
                    <p className="text-xs text-zinc-500">Check or uncheck crew members to update assignments instantly</p>
                  </div>

                  {/* Target Function Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase text-zinc-500 shrink-0">Target:</span>
                    <select
                      value={selectedCrewFunctionId}
                      onChange={(e) => setSelectedCrewFunctionId(e.target.value)}
                      className="px-3 py-1.5 rounded-xl border border-zinc-300 bg-white text-base sm:text-xs text-zinc-800 font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[40px] cursor-pointer"
                    >
                      {functions.length > 1 && (
                        <option value="all">⚡ All {functions.length} Functions (Simultaneous)</option>
                      )}
                      {functions.map(fn => (
                        <option key={fn.id} value={fn.id}>
                          {fn.name} ({fn.date || eventDate || 'Date TBD'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Multi-Select Checkboxes (Owner + Staff) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {(() => {
                    const ownerMember = activeEmployees[0] || getStudioOwnerCrewMember(studioId);
                    const ownerDisplayName = formatOwnerCrewDisplayName(ownerProfile.name || ownerMember.fullName);
                    const targetFns = selectedCrewFunctionId === 'all'
                      ? functions
                      : functions.filter(f => f.id === selectedCrewFunctionId);
                    const isOwnerAssigned = targetFns.length > 0 && targetFns.every(fn => isMemberAssignedToFunction(fn, ownerMember.id));
                    const otherEmployees = activeEmployees.filter(e => !isStudioOwnerId(e.id, studioId));

                    return (
                      <>
                        {/* Studio Owner Checkbox */}
                        <label className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                          isOwnerAssigned
                            ? 'bg-amber-50/90 border-amber-300 text-amber-950 font-bold shadow-2xs'
                            : 'bg-white border-zinc-200 hover:border-zinc-300 text-zinc-700'
                        }`}>
                          <input
                            type="checkbox"
                            checked={isOwnerAssigned}
                            onChange={() => handleToggleCrewMemberStep4({
                              id: ownerMember.id,
                              fullName: ownerDisplayName,
                              designation: 'Studio Owner',
                              department: 'Management',
                              phone: ownerMember.phone || '',
                              isStudioOwner: true
                            })}
                            className="w-4 h-4 text-orange-600 rounded cursor-pointer accent-orange-600 shrink-0"
                          />
                          <div className="min-w-0 truncate">
                            <div className="flex items-center gap-1.5 truncate">
                              <span>👑</span>
                              <span className="text-xs sm:text-sm font-bold truncate">{ownerDisplayName}</span>
                              <span className="px-1.5 py-0.2 rounded-full text-xs font-bold bg-amber-200/80 text-amber-900 shrink-0">Owner</span>
                            </div>
                            <span className="text-xs text-zinc-500 font-normal truncate block">Studio Owner • Management</span>
                          </div>
                        </label>

                        {/* Active Employees Checkboxes */}
                        {otherEmployees.map(emp => {
                          const isAssigned = targetFns.length > 0 && targetFns.every(fn => isMemberAssignedToFunction(fn, emp.id));
                          return (
                            <label key={emp.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                              isAssigned
                                ? 'bg-orange-50/80 border-orange-300 text-orange-950 font-bold shadow-2xs'
                                : 'bg-white border-zinc-200 hover:border-zinc-300 text-zinc-700'
                            }`}>
                              <input
                                type="checkbox"
                                checked={isAssigned}
                                onChange={() => handleToggleCrewMemberStep4(emp)}
                                className="w-4 h-4 text-orange-600 rounded cursor-pointer accent-orange-600 shrink-0"
                              />
                              <div className="min-w-0 truncate">
                                <span className="text-xs sm:text-sm font-bold truncate block">{emp.fullName}</span>
                                <span className="text-xs text-zinc-500 font-normal truncate block">{emp.designation || 'Staff'} ({emp.department || 'Studio'})</span>
                              </div>
                            </label>
                          );
                        })}
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Multiple Functions Filter Pills */}
              {functions.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 shrink-0">Filter:</span>
                  <button
                    type="button"
                    onClick={() => setActiveFunctionTab('all')}
                    className={`min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer ${
                      activeFunctionTab === 'all'
                        ? 'bg-zinc-900 text-white shadow-xs'
                        : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                    }`}
                  >
                    All Functions ({functions.reduce((s, f) => s + (f.assignedCrew?.length || 0), 0)})
                  </button>
                  {functions.map(fn => (
                    <button
                      key={fn.id}
                      type="button"
                      onClick={() => setActiveFunctionTab(fn.id)}
                      className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer flex items-center gap-1.5 ${
                        activeFunctionTab === fn.id
                          ? 'bg-orange-500 text-white shadow-xs'
                          : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                      }`}
                    >
                      <span>{fn.name}</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-xs font-bold ${
                        activeFunctionTab === fn.id ? 'bg-orange-700 text-white' : 'bg-zinc-200 text-zinc-700'
                      }`}>
                        {(fn.assignedCrew || []).length}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Function-Wise Assigned Crew Cards */}
              <div className="space-y-4">
                {functions
                  .filter(fn => activeFunctionTab === 'all' || fn.id === activeFunctionTab)
                  .map((fn, idx) => {
                    const crewList = fn.assignedCrew || [];

                    return (
                      <div key={fn.id} className="bg-white border border-zinc-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
                        {/* Function Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-3">
                          <div className="flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-xl bg-orange-500 text-white font-bold text-xs flex items-center justify-center shadow-2xs">
                              #{idx + 1}
                            </span>
                            <div>
                              <h4 className="text-base font-bold text-zinc-900 font-display">
                                {fn.name}
                              </h4>
                              <div className="flex items-center gap-3 text-xs text-zinc-500 flex-wrap font-mono mt-0.5">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                                  <span>{fn.date || eventDate || 'Date TBD'}</span>
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-zinc-400" />
                                  <span>{fn.startTime} - {fn.endTime}</span>
                                </span>
                                {fn.venue && (
                                  <span className="flex items-center gap-1 font-sans">
                                    <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                                    <span>{fn.venue}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-auto">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                              crewList.length > 0 
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                                : 'bg-zinc-100 text-zinc-600'
                            }`}>
                              {crewList.length} Crew Assigned
                            </span>

                            {/* Copy crew from other function shortcut */}
                            {functions.length > 1 && functions.some(other => other.id !== fn.id && (other.assignedCrew || []).length > 0) && (
                              <select
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleCopyCrewFromFunction(e.target.value, fn.id);
                                    e.target.value = '';
                                  }
                                }}
                                defaultValue=""
                                className="px-2 py-1 rounded-lg border border-zinc-200 text-xs font-medium bg-zinc-50 text-zinc-600 hover:bg-zinc-100 cursor-pointer"
                              >
                                <option value="" disabled>📋 Copy crew from...</option>
                                {functions
                                  .filter(other => other.id !== fn.id && (other.assignedCrew || []).length > 0)
                                  .map(other => (
                                    <option key={other.id} value={other.id}>
                                      {other.name} ({other.assignedCrew.length} crew)
                                    </option>
                                  ))}
                              </select>
                            )}
                          </div>
                        </div>

                        {/* Crew List Table / Empty State */}
                        {crewList.length === 0 ? (
                          <div className="py-6 px-4 bg-zinc-50/60 rounded-xl border border-dashed border-zinc-200 text-center space-y-2">
                            <Users className="w-8 h-8 text-zinc-300 mx-auto" />
                            <p className="text-xs sm:text-sm font-semibold text-zinc-600">
                              No crew members assigned to {fn.name} yet.
                            </p>
                            <p className="text-xs text-zinc-400">
                              Check team members above to assign to this sub-event.
                            </p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="border-b border-zinc-200 text-zinc-400 uppercase font-bold text-xs bg-zinc-50/50">
                                  <th className="py-2.5 px-3 rounded-l-lg">Team Member</th>
                                  <th className="py-2.5 px-3">Designation</th>
                                  <th className="py-2.5 px-3">Calendar Visibility</th>
                                  <th className="py-2.5 px-3 text-right rounded-r-lg">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-100">
                                {crewList.map((member) => (
                                  <tr key={member.id} className="hover:bg-zinc-50/50 transition-colors">
                                    {/* Member info */}
                                    <td className="py-3 px-3">
                                      <div className="flex items-center gap-2.5">
                                        <div className={`w-8 h-8 rounded-xl font-bold flex items-center justify-center text-xs shrink-0 ${
                                          member.isStudioOwner 
                                            ? 'bg-amber-100 border border-amber-300 text-amber-900' 
                                            : 'bg-orange-100 text-orange-800'
                                        }`}>
                                          {member.isStudioOwner ? '👑' : member.employeeName.charAt(0)}
                                        </div>
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="font-bold text-zinc-900 text-xs sm:text-sm truncate">
                                              {member.employeeName}
                                            </span>
                                            {member.isStudioOwner && (
                                              <span className="px-1.5 py-0.2 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                                                Studio Owner
                                              </span>
                                            )}
                                          </div>
                                          <span className="text-zinc-500 text-xs block truncate">
                                            {member.department}
                                          </span>
                                        </div>
                                      </div>
                                    </td>

                                    {/* Designation (No Role Dropdown) */}
                                    <td className="py-3 px-3">
                                      <span className="font-semibold text-xs text-zinc-800">
                                        {member.designation || (member.isStudioOwner ? 'Studio Owner' : 'Crew Member')}
                                      </span>
                                    </td>

                                    {/* Calendar Visibility Toggle Button */}
                                    <td className="py-3 px-3">
                                      <button
                                        type="button"
                                        onClick={() => handleToggleCrewVisibility(fn.id, member.employeeId)}
                                        className={`min-h-[34px] px-3 py-1 rounded-xl border text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 ${
                                          member.isVisibleOnCalendar
                                            ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                                            : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
                                        }`}
                                        title={member.isVisibleOnCalendar ? 'Visible on employee calendar. Click to hide.' : 'Hidden from employee calendar. Click to show.'}
                                      >
                                        {member.isVisibleOnCalendar ? (
                                          <>
                                            <Eye className="w-3.5 h-3.5 text-emerald-600" />
                                            <span>Show on Calendar</span>
                                          </>
                                        ) : (
                                          <>
                                            <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                                            <span>Hide from Calendar</span>
                                          </>
                                        )}
                                      </button>
                                    </td>

                                    {/* Action button: remove */}
                                    <td className="py-3 px-3 text-right">
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveCrewMember(fn.id, member.employeeId)}
                                        className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                        title="Remove from this function"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* STEP 5: PACKAGE */}
          {currentStep === 5 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="border-b border-zinc-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-zinc-900 font-display">Step 5 — Photography Package & Line Items</h3>
                  <p className="text-xs text-zinc-500">Configure photography, cinematography, drone, and editing items with rates.</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-zinc-400 uppercase font-bold block">Package Subtotal</span>
                  <span className="text-lg font-black text-zinc-900 font-mono">₹{packageTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Line items table */}
              <div className="border border-zinc-200 rounded-2xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase text-xs font-bold">
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
                        <td className="p-3 text-zinc-500 text-xs">{item.description}</td>
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
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
                  >
                    Add Service
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: DELIVERABLES */}
          {currentStep === 6 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="border-b border-zinc-100 pb-3">
                <h3 className="text-base font-bold text-zinc-900 font-display">Step 6 — Delivery Requirements</h3>
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
                  <p className="text-xs text-zinc-500">Handover of full uncut RAW camera captures via SSD / cloud drive.</p>
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
                  <p className="text-xs text-zinc-500">Selected master retouch photos for print & album inclusion.</p>
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
                  <p className="text-xs text-zinc-500">Fast 48-hour vertical teaser reels formatted for 9:16 mobile sharing.</p>
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
                        <span className="text-xs text-zinc-400 font-bold block mb-1">Album Type & Material</span>
                        <input
                          type="text"
                          value={deliverables.albumType}
                          onChange={(e) => setDeliverables(prev => ({ ...prev, albumType: e.target.value }))}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs"
                        />
                      </div>
                      <div>
                        <span className="text-xs text-zinc-400 font-bold block mb-1">Sheets Count</span>
                        <input
                          type="number"
                          value={deliverables.albumSheets}
                          onChange={(e) => setDeliverables(prev => ({ ...prev, albumSheets: parseInt(e.target.value) || 0 }))}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white font-mono text-xs"
                        />
                      </div>
                      <div>
                        <span className="text-xs text-zinc-400 font-bold block mb-1">Album Copies</span>
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

          {/* STEP 7: PRICE */}
          {currentStep === 7 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="border-b border-zinc-100 pb-3">
                <h3 className="text-base font-bold text-zinc-900 font-display">Step 7 — Pricing & Negotiated Terms</h3>
                <p className="text-xs text-zinc-500">Calculate package total, apply negotiated discounts, and log initial token payment.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200">
                  <span className="text-xs text-zinc-400 font-bold uppercase block mb-1">Base Package Total</span>
                  <div className="text-xl font-black text-zinc-900 font-mono">₹{packageTotal.toLocaleString('en-IN')}</div>
                  <span className="text-xs text-zinc-500 mt-1 block">{lineItems.length} selected line items</span>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200">
                  <span className="text-xs text-zinc-400 font-bold uppercase block mb-1">Additional Services</span>
                  <input
                    type="number"
                    value={additionalServices}
                    onChange={(e) => setAdditionalServices(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 rounded-xl border border-zinc-200 bg-white font-mono font-bold text-sm"
                  />
                  <span className="text-xs text-zinc-500 mt-1 block">Travel, stay, extra crew</span>
                </div>

                <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-200">
                  <span className="text-xs text-rose-600 font-bold uppercase block mb-1">Negotiated Discount (₹)</span>
                  <input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 rounded-xl border border-rose-200 bg-white font-mono font-bold text-sm text-rose-700"
                  />
                  <span className="text-xs text-rose-500 mt-1 block">Bundle / client courtesy</span>
                </div>
              </div>

              {/* Total Settlement Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-orange-100">Final Agreed Booking Amount</span>
                  <div className="text-3xl font-black font-mono tracking-tight mt-0.5 text-white">
                    ₹{finalNegotiatedAmount.toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="flex items-center gap-4 border-t sm:border-t-0 sm:border-l border-orange-400/40 pt-3 sm:pt-0 sm:pl-6 text-xs">
                  <div>
                    <span className="text-xs text-orange-100 uppercase block">Advance Received</span>
                    <input
                      type="number"
                      value={advancePayment}
                      onChange={(e) => setAdvancePayment(parseInt(e.target.value) || 0)}
                      className="w-28 px-2 py-1 rounded-lg bg-orange-700/60 border border-orange-300 text-white font-mono font-bold text-sm mt-0.5 placeholder-orange-200"
                    />
                  </div>
                  <div>
                    <span className="text-xs text-orange-100 uppercase block">Remaining Balance</span>
                    <div className="text-base font-bold font-mono text-amber-400 mt-1.5">
                      ₹{remainingBalance.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 8: REVIEW & ACTIONS */}
          {currentStep === 8 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="border-b border-zinc-100 pb-3">
                <h3 className="text-base font-bold text-zinc-900 font-display">Step 8 — Review, Generate Quotation & Confirm</h3>
                <p className="text-xs text-zinc-500">Preview quotation, review crew allocations across all functions, and confirm deal into production.</p>
              </div>

              {/* Summary overview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-2xl border border-zinc-200 bg-zinc-50/50 space-y-2">
                  <span className="text-xs font-bold uppercase text-zinc-400 block">Customer & Event</span>
                  <div className="space-y-1">
                    <p><strong className="text-zinc-900">{customerName}</strong> ({customerPhone})</p>
                    <p className="text-zinc-600">{eventName} • {eventCategory}</p>
                    <p className="text-zinc-500 font-mono">{eventDate} @ {venue || 'Main Venue'}</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-zinc-200 bg-zinc-50/50 space-y-2">
                  <span className="text-xs font-bold uppercase text-zinc-400 block">Financial Summary</span>
                  <div className="space-y-1 font-mono">
                    <p className="flex justify-between"><span>Agreed Deal:</span> <strong className="text-zinc-900">₹{finalNegotiatedAmount.toLocaleString('en-IN')}</strong></p>
                    <p className="flex justify-between text-emerald-700"><span>Advance Token:</span> <strong>₹{advancePayment.toLocaleString('en-IN')}</strong></p>
                    <p className="flex justify-between text-amber-700"><span>Balance Pending:</span> <strong>₹{remainingBalance.toLocaleString('en-IN')}</strong></p>
                  </div>
                </div>
              </div>

              {/* Function Crew Allocations Summary */}
              <div className="p-4 rounded-2xl border border-zinc-200 bg-zinc-50/40 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-zinc-500 block">
                    Function Crew Allocations ({functions.reduce((s, f) => s + (f.assignedCrew?.length || 0), 0)} Total Assignments)
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(4)}
                    className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Edit Crew</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2">
                  {functions.map(fn => (
                    <div key={fn.id} className="p-3 bg-white rounded-xl border border-zinc-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-zinc-900 text-xs sm:text-sm">{fn.name}</span>
                        <span className="text-zinc-500 font-mono text-xs">{fn.date || eventDate || 'Date TBD'} ({fn.startTime}-{fn.endTime})</span>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {(!fn.assignedCrew || fn.assignedCrew.length === 0) ? (
                          <span className="text-zinc-400 italic text-xs">No crew assigned to this function</span>
                        ) : (
                          fn.assignedCrew.map(c => (
                            <span
                              key={c.id}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                                c.isStudioOwner 
                                  ? 'bg-amber-50 text-amber-900 border-amber-300' 
                                  : 'bg-zinc-50 text-zinc-800 border-zinc-200'
                              }`}
                            >
                              <span>{c.employeeName}</span>
                              <span className="text-zinc-400">•</span>
                              <span className="text-orange-700 font-bold">{c.role}</span>
                              <span className={`text-xs px-1.5 py-0.2 rounded font-bold uppercase ${
                                c.isVisibleOnCalendar ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-200 text-zinc-600'
                              }`}>
                                {c.isVisibleOnCalendar ? 'Visible' : 'Hidden'}
                              </span>
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Functions & Deliverables pill summary */}
              <div className="p-4 rounded-2xl border border-zinc-200 bg-zinc-50/30 space-y-2 text-xs">
                <span className="text-xs font-bold uppercase text-zinc-400 block">
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
              <div className="pt-4 border-t border-zinc-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleGeneratePdf}
                  className="w-full sm:w-auto min-h-[48px] sm:min-h-[44px] px-5 py-3 rounded-xl border border-zinc-300 hover:bg-zinc-100 font-bold text-sm sm:text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors touch-manipulation active:scale-98"
                >
                  <Printer className="w-4 h-4 text-zinc-600" />
                  <span>Preview & Print Quotation PDF</span>
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSaveBooking('quotation')}
                  className="w-full sm:w-auto min-h-[48px] sm:min-h-[44px] px-5 py-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-sm sm:text-xs cursor-pointer transition-colors touch-manipulation active:scale-98 disabled:opacity-50"
                >
                  Save as Draft Quotation
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSaveBooking('confirmed')}
                  className="w-full sm:w-auto min-h-[52px] sm:min-h-[44px] px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-sm sm:text-xs shadow-md cursor-pointer transition-all flex items-center justify-center gap-2 touch-manipulation active:scale-98 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Creating Booking...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      <span>Confirm Deal & Booking</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Stepper Navigation Buttons */}
          <div className="pt-6 border-t border-zinc-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                className="w-full sm:w-auto min-h-[48px] sm:min-h-[40px] px-5 py-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-100 text-sm sm:text-xs font-semibold text-zinc-700 flex items-center justify-center gap-2 cursor-pointer touch-manipulation active:scale-95"
              >
                <ArrowLeft className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                <span>Back</span>
              </button>
            ) : <div />}

            {currentStep < 8 && (
              <button
                type="button"
                onClick={() => {
                  if (currentStep === 4) {
                    const totalCrew = functions.reduce((sum, fn) => sum + (fn.assignedCrew?.length || 0), 0);
                    if (totalCrew === 0) {
                      const autoAssign = window.confirm(
                        "Notice: No crew members or Studio Owner have been assigned to any function yet.\n\nWould you like to automatically assign the Studio Owner as Lead Photographer and continue?\n\nPress OK to auto-assign Studio Owner and continue, or Cancel to review crew assignments."
                      );
                      if (autoAssign) {
                        handleAssignOwnerToAll();
                      } else {
                        return;
                      }
                    }
                  }
                  setCurrentStep(prev => Math.min(8, prev + 1));
                }}
                className="w-full sm:w-auto min-h-[52px] sm:min-h-[44px] px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-sm sm:text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs touch-manipulation active:scale-95 transition-all"
              >
                <span>Continue to Step {currentStep + 1}</span>
                <ArrowRight className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
