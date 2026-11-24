import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { useStudio } from '../../context/StudioContext';
import { StudioEvent, EventCategory, EventStatus, Priority } from '../../types';
import { ALL_EVENT_CATEGORIES } from '../../data/demoData';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  UserCheck, 
  DollarSign, 
  FileText, 
  Search, 
  X, 
  Plus, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2, 
  Trash2,
  PackageCheck,
  ChevronRight,
  ChevronLeft,
  User,
  Sparkles,
  ShieldCheck,
  Check
} from 'lucide-react';
import { crewConflictService, CrewConflictInfo } from '../../services/crewConflictService';
import { generateDeliverablesForCategory } from '../../services/deliverablesPresetService';
import { bookingProductionService } from '../../services/bookingProductionService';
import { bookingHistoryService } from '../../services/bookingHistoryService';
import { firestoreService } from '../../services/firestoreService';
import { DeliverableSpecification, DeliverableCategory } from '../../types/bookingProduction';
import { useOutsideClick } from '../../hooks/useOutsideClick';

interface EventFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventToEdit?: StudioEvent | null;
  initialDate?: string;
}

export const EventFormModal: React.FC<EventFormModalProps> = ({
  isOpen,
  onClose,
  eventToEdit,
  initialDate
}) => {
  const { customers, createEvent, updateEvent, createCustomer } = useApp();
  const { currentStudio } = useStudio();
  const studioId = currentStudio?.id || 'studio_shreeji_films';

  const isEditing = Boolean(eventToEdit && eventToEdit.id && eventToEdit.id.trim().length > 0);

  // Active employees for crew assignments
  const allEmployees = useMemo(() => {
    return crewConflictService.getActiveEmployees(studioId);
  }, [studioId]);

  // Form states
  const [name, setName] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [newCustomerEmail, setNewCustomerEmail] = useState('');

  const [category, setCategory] = useState<EventCategory>('Wedding');
  const [startDate, setStartDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('10:00');
  const [endDate, setEndDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [endTime, setEndTime] = useState('18:00');
  const [venue, setVenue] = useState('');
  const [venueCity, setVenueCity] = useState(currentStudio?.city || '');
  const [priority, setPriority] = useState<Priority>('High');
  const [status, setStatus] = useState<EventStatus>('Confirmed');

  // Crew assignment states
  const [assignedEmployeeIds, setAssignedEmployeeIds] = useState<string[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);
  const [conflictWarnings, setConflictWarnings] = useState<CrewConflictInfo[]>([]);
  const [overriddenConflictIds, setOverriddenConflictIds] = useState<string[]>([]);

  // Sub-events / Functions
  const [functionsList, setFunctionsList] = useState<Array<{
    id: string;
    name: string;
    date: string;
    startTime: string;
    endTime: string;
    venue: string;
  }>>([]);
  const [showAddFunction, setShowAddFunction] = useState(false);
  const [newFunctionName, setNewFunctionName] = useState('');
  const [newFunctionDate, setNewFunctionDate] = useState('');

  // Event-specific Deliverables
  const [deliverablesList, setDeliverablesList] = useState<DeliverableSpecification[]>([]);
  const [showAddDeliverable, setShowAddDeliverable] = useState(false);
  const [newDelName, setNewDelName] = useState('');
  const [newDelCategory, setNewDelCategory] = useState<DeliverableCategory>('photography');
  const [newDelDueDate, setNewDelDueDate] = useState('');

  // Financials
  const [estimatedBudget, setEstimatedBudget] = useState<number>(0);
  const [advancePaid, setAdvancePaid] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Bank Transfer' | 'Cash' | 'Card'>('UPI');
  const [paymentRef, setPaymentRef] = useState('');

  // Notes & UI Status
  const [notes, setNotes] = useState('');
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Stable booking session refs & Submission lock to prevent duplicate creations
  const employeeDropdownRef = useRef<HTMLDivElement>(null);
  const formSubmissionIdRef = useRef<string | null>(null);
  const formBookingNumRef = useRef<string | null>(null);
  const isSubmittingRef = useRef<boolean>(false);

  // Requirement 3: Outside click/tap and Escape to close employee dropdown
  useOutsideClick(employeeDropdownRef, () => setIsEmployeeDropdownOpen(false), isEmployeeDropdownOpen);

  // Populate form if editing or initializing
  useEffect(() => {
    if (!isOpen) {
      setErrorMessage('');
      setSaveSuccess(false);
      setIsSaving(false);
      setConflictWarnings([]);
      setOverriddenConflictIds([]);
      formSubmissionIdRef.current = null;
      formBookingNumRef.current = null;
      isSubmittingRef.current = false;
      return;
    }

    // Stable unique booking ID for this modal session (reused across retries)
    if (eventToEdit) {
      formSubmissionIdRef.current = eventToEdit.id;
      formBookingNumRef.current = eventToEdit.eventNumber?.replace('EVT-', '') || `BKG-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    } else if (!formSubmissionIdRef.current) {
      formSubmissionIdRef.current = `bkg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      formBookingNumRef.current = `BKG-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    }
    isSubmittingRef.current = false;

    if (eventToEdit) {
      setName(eventToEdit.name || eventToEdit.title || '');
      setCustomerId(eventToEdit.customerId || '');
      setCustomerName(eventToEdit.customerName || '');
      setCustomerPhone(eventToEdit.customerPhone || '');
      setIsNewCustomer(false);
      setCategory(eventToEdit.category || 'Wedding');
      const start = eventToEdit.startDate || new Date().toISOString().split('T')[0];
      setStartDate(start);
      setStartTime(eventToEdit.startTime || '10:00');
      setEndDate(eventToEdit.endDate || start);
      setEndTime(eventToEdit.endTime || '18:00');
      setVenue(eventToEdit.venue || '');
      setVenueCity(eventToEdit.venueCity || 'Ahmedabad');
      setPriority(eventToEdit.priority || 'High');
      setStatus(eventToEdit.status || 'Confirmed');

      // Populate existing assigned team members
      const existingTeam = eventToEdit.assignedTeamIds || [];
      setAssignedEmployeeIds(existingTeam);

      // Load matching booking for rich deliverables & subevents
      const existingBkg = bookingProductionService.getBooking(studioId, eventToEdit.id);
      if (existingBkg) {
        setEstimatedBudget(existingBkg.financials?.finalAgreedAmount || existingBkg.financials?.originalQuotation || eventToEdit.estimatedBudget || 0);
        setAdvancePaid(existingBkg.financials?.verifiedPaymentsReceived || existingBkg.financials?.advanceReceived || eventToEdit.advancePaid || 0);
        const rawNotes = existingBkg.notes || eventToEdit.notes || '';
        const parsedNotes = typeof rawNotes === 'string'
          ? rawNotes
          : Array.isArray(rawNotes)
            ? (rawNotes as any[]).map(n => typeof n === 'string' ? n : n?.note || n?.text || JSON.stringify(n)).join('\n')
            : JSON.stringify(rawNotes);
        setNotes(parsedNotes);

        if (existingBkg.functions && existingBkg.functions.length > 0) {
          setFunctionsList(existingBkg.functions.map(f => ({
            id: f.id,
            name: f.name,
            date: f.date,
            startTime: f.startTime,
            endTime: f.endTime,
            venue: f.venue
          })));
        } else {
          setFunctionsList([
            { id: `fn_${eventToEdit.id}_main`, name: eventToEdit.name, date: start, startTime: eventToEdit.startTime || '10:00', endTime: eventToEdit.endTime || '18:00', venue: eventToEdit.venue || '' }
          ]);
        }

        if (existingBkg.deliverables && existingBkg.deliverables.length > 0) {
          setDeliverablesList(existingBkg.deliverables);
        } else {
          setDeliverablesList([]);
        }
      } else {
        setEstimatedBudget(eventToEdit.estimatedBudget || 0);
        setAdvancePaid(eventToEdit.advancePaid || 0);
        setNotes(eventToEdit.notes || '');
        setFunctionsList([
          { id: `fn_${eventToEdit.id}_main`, name: eventToEdit.name, date: start, startTime: eventToEdit.startTime || '10:00', endTime: eventToEdit.endTime || '18:00', venue: eventToEdit.venue || '' }
        ]);
        setDeliverablesList([]);
      }
    } else {
      // Default reset for new event
      setName('');
      setCustomerId('');
      setCustomerName('');
      setCustomerPhone('');
      setIsNewCustomer(false);
      setCategory('Wedding');
      const start = initialDate || new Date().toISOString().split('T')[0];
      setStartDate(start);
      setStartTime('10:00');
      setEndDate(start);
      setEndTime('18:00');
      setVenue('');
      setVenueCity(currentStudio?.city || '');
      setPriority('High');
      setStatus('Confirmed');
      setAssignedEmployeeIds([]);
      setEstimatedBudget(0);
      setAdvancePaid(0);
      setPaymentMethod('UPI');
      setPaymentRef('');
      setNotes('');

      const tempId = `temp_${Date.now()}`;
      setDeliverablesList([]);
      setFunctionsList([
        { id: `fn_${tempId}_1`, name: 'Main Function Coverage', date: start, startTime: '10:00', endTime: '18:00', venue: '' }
      ]);
    }
  }, [eventToEdit, isOpen, initialDate, customers, studioId]);

  // Handle Category Change (regenerates suggested deliverables if not editing)
  const handleCategoryChange = (newCat: EventCategory) => {
    setCategory(newCat);
    if (!isEditing) {
      const tempId = eventToEdit?.id || `temp_${Date.now()}`;
      setDeliverablesList(generateDeliverablesForCategory(newCat, tempId, startDate));
    }
  };

  // Customer Selection
  const handleCustomerSelect = (id: string) => {
    if (id === 'NEW_CLIENT') {
      setIsNewCustomer(true);
      setCustomerId('');
      setCustomerName('');
      setCustomerPhone('');
      return;
    }
    setIsNewCustomer(false);
    setCustomerId(id);
    const found = customers.find(c => c.id === id);
    if (found) {
      setCustomerName(found.name);
      setCustomerPhone(found.phone);
    }
  };

  // Employee Search Filter
  const filteredEmployees = useMemo(() => {
    if (!employeeSearch.trim()) return allEmployees;
    const q = employeeSearch.toLowerCase();
    return allEmployees.filter(e => 
      e.fullName.toLowerCase().includes(q) ||
      (e.designation && e.designation.toLowerCase().includes(q)) ||
      (e.department && e.department.toLowerCase().includes(q))
    );
  }, [allEmployees, employeeSearch]);

  // Crew Assignment Toggle with Conflict Check
  const handleToggleEmployee = (empId: string) => {
    if (assignedEmployeeIds.includes(empId)) {
      // Remove employee
      setAssignedEmployeeIds(prev => prev.filter(id => id !== empId));
      setConflictWarnings(prev => prev.filter(w => w.employeeId !== empId));
      setOverriddenConflictIds(prev => prev.filter(id => id !== empId));
    } else {
      // Check scheduling conflict
      const conflict = crewConflictService.checkConflict(
        studioId,
        empId,
        startDate,
        startTime,
        endTime,
        eventToEdit?.id
      );

      if (conflict.hasConflict) {
        setConflictWarnings(prev => [...prev.filter(w => w.employeeId !== empId), conflict]);
      }

      setAssignedEmployeeIds(prev => [...prev, empId]);
    }
  };

  const handleOverrideConflict = (empId: string) => {
    setOverriddenConflictIds(prev => [...prev, empId]);
  };

  // Add Custom Deliverable
  const handleAddCustomDeliverable = () => {
    if (!newDelName.trim()) return;
    const parentId = eventToEdit?.id || `bkg_${Date.now()}`;
    const newDel: DeliverableSpecification = {
      id: `del_${parentId}_custom_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      bookingId: parentId,
      name: newDelName.trim(),
      category: newDelCategory,
      requiredQty: 1,
      completedQty: 0,
      unit: 'item',
      deliveryMethod: 'Google Drive',
      deadlineType: 'specific_date',
      calculatedDeadline: newDelDueDate || startDate,
      priority: 'normal',
      stage: 'not_started',
      isDelivered: false,
      isPartiallyDelivered: false
    };

    setDeliverablesList(prev => [...prev, newDel]);
    setNewDelName('');
    setNewDelDueDate('');
    setShowAddDeliverable(false);
  };

  const handleRemoveDeliverable = (delId: string) => {
    setDeliverablesList(prev => prev.filter(d => d.id !== delId));
  };

  const handleToggleDeliverableStatus = (delId: string) => {
    setDeliverablesList(prev => prev.map(d => {
      if (d.id !== delId) return d;
      const nextStage = d.stage === 'not_started' ? 'editing' : d.stage === 'editing' ? 'delivered' : 'not_started';
      const isDelivered = nextStage === 'delivered';
      return {
        ...d,
        stage: nextStage,
        isDelivered,
        completedDate: isDelivered ? new Date().toISOString() : undefined,
        completedQty: isDelivered ? d.requiredQty : 0
      };
    }));
  };

  // Add Sub-Event Function
  const handleAddFunction = () => {
    if (!newFunctionName.trim()) return;
    const fnDate = newFunctionDate || startDate;
    setFunctionsList(prev => [
      ...prev,
      {
        id: `fn_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        name: newFunctionName.trim(),
        date: fnDate,
        startTime: '10:00',
        endTime: '18:00',
        venue: venue || 'Venue'
      }
    ]);
    setNewFunctionName('');
    setNewFunctionDate('');
    setShowAddFunction(false);
  };

  const handleRemoveFunction = (fnId: string) => {
    setFunctionsList(prev => prev.filter(f => f.id !== fnId));
  };

  const STEPS = [
    { id: 1, title: 'Customer Details', short: 'Customer' },
    { id: 2, title: 'Event Details', short: 'Event' },
    { id: 3, title: 'Services & Team', short: 'Team' },
    { id: 4, title: 'Budget & Payment', short: 'Payment' },
    { id: 5, title: 'Confirmation', short: 'Confirm' }
  ];

  const validateStep = (stepNumber: number): boolean => {
    setErrorMessage('');
    if (stepNumber === 1) {
      if (isNewCustomer) {
        if (!customerName.trim()) {
          setErrorMessage('Please enter the customer full name.');
          return false;
        }
        if (!customerPhone.trim()) {
          setErrorMessage('Please enter the customer phone number.');
          return false;
        }
      } else {
        if (!customerId && !customerName.trim()) {
          setErrorMessage('Please select or add a client.');
          return false;
        }
      }
    } else if (stepNumber === 2) {
      if (!name.trim()) {
        setErrorMessage('Please enter an event / shoot name.');
        return false;
      }
      if (!venue.trim()) {
        setErrorMessage('Please enter a venue or location.');
        return false;
      }
    } else if (stepNumber === 3) {
      const unacknowledgedConflicts = conflictWarnings.filter(
        w => assignedEmployeeIds.includes(w.employeeId) && !overriddenConflictIds.includes(w.employeeId)
      );
      if (unacknowledgedConflicts.length > 0) {
        setErrorMessage(`Please review scheduling warning for ${unacknowledgedConflicts[0].employeeName} or tap "Allow Overlap" to proceed.`);
        return false;
      }
    } else if (stepNumber === 4) {
      if (Number(estimatedBudget) < 0) {
        setErrorMessage('Total agreed amount cannot be negative.');
        return false;
      }
      if (Number(advancePaid) > Number(estimatedBudget)) {
        setErrorMessage('Advance payment received cannot exceed total agreed package amount.');
        return false;
      }
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setErrorMessage('');
      setCurrentStep(prev => Math.min(5, prev + 1));
    }
  };

  const handlePrevStep = () => {
    setErrorMessage('');
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  // Form Submission & Unbreakable Save Handler with Synchronous Lock
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all preceding steps before final submission
    for (let s = 1; s <= 4; s++) {
      if (!validateStep(s)) {
        setCurrentStep(s);
        return;
      }
    }

    // 0. Synchronous Submission Lock: Prevent multiple rapid clicks & duplicate creation
    if (isSubmittingRef.current || isSaving) {
      return;
    }
    isSubmittingRef.current = true;
    setIsSaving(true);
    setErrorMessage('');

    if (!name.trim()) {
      setIsSaving(false);
      isSubmittingRef.current = false;
      setErrorMessage('Please enter an event name.');
      return;
    }

    if (!venue.trim()) {
      setIsSaving(false);
      isSubmittingRef.current = false;
      setErrorMessage('Please enter a venue / location.');
      return;
    }

    // Check unresolved blocking conflicts that haven't been overridden
    const unacknowledgedConflicts = conflictWarnings.filter(
      w => assignedEmployeeIds.includes(w.employeeId) && !overriddenConflictIds.includes(w.employeeId)
    );

    if (unacknowledgedConflicts.length > 0) {
      setIsSaving(false);
      isSubmittingRef.current = false;
      setErrorMessage(`Please review scheduling warning for ${unacknowledgedConflicts[0].employeeName} or click "Allow Overlap" to confirm.`);
      return;
    }

    try {
      let finalCustomerId = customerId;
      let finalCustomerName = customerName;
      let finalCustomerPhone = customerPhone;

      // Create client if new
      if (isNewCustomer) {
        if (!customerName.trim() || !customerPhone.trim()) {
          setIsSaving(false);
          isSubmittingRef.current = false;
          setErrorMessage('Please enter client full name and phone number.');
          return;
        }
        const newCust = createCustomer({
          name: customerName,
          phone: customerPhone,
          email: newCustomerEmail || `${customerName.toLowerCase().replace(/\s+/g, '')}@example.com`,
          city: venueCity,
          notes: `Registered via ${name}`
        });
        finalCustomerId = newCust.id;
        finalCustomerName = newCust.name;
        finalCustomerPhone = newCust.phone;
      }

      const assignedEmployees = allEmployees.filter(e => assignedEmployeeIds.includes(e.id));
      
      // Stable unique booking ID for this submission session (reused on retries)
      const targetId = formSubmissionIdRef.current || eventToEdit?.id || `bkg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const bookingNumber = formBookingNumRef.current || eventToEdit?.eventNumber?.replace('EVT-', '') || `BKG-2026-${Math.floor(1000 + Math.random() * 9000)}`;

      // 1. Build sub-events / functions
      const formattedFunctions = functionsList.map((f, idx) => ({
        id: f.id.startsWith('temp_') ? `fn_${targetId}_${idx + 1}` : f.id,
        bookingId: targetId,
        name: f.name,
        category: category,
        date: f.date || startDate,
        startTime: f.startTime || startTime,
        endTime: f.endTime || endTime,
        venue: f.venue || venue,
        city: venueCity,
        assignedPhotographerIds: assignedEmployees.filter(e => e.department === 'Photography' || (e as any).isStudioOwner).map(e => e.id),
        assignedVideographerIds: assignedEmployees.filter(e => e.department === 'Videography').map(e => e.id),
        assignedDroneOperatorIds: assignedEmployees.filter(e => e.designation?.toLowerCase().includes('drone')).map(e => e.id),
        assignedEditorIds: assignedEmployees.filter(e => e.department?.toLowerCase().includes('edit')).map(e => e.id),
        assignedSupplierIds: [],
        assignedCrew: assignedEmployees.map(emp => ({
          employeeId: emp.id,
          employeeName: emp.fullName,
          role: (emp as any).isStudioOwner ? 'Lead Photographer' : (emp.designation || 'Crew'),
          contact: emp.phone || ''
        })),
        deliverables: deliverablesList,
        priority: 'normal' as const,
        status: 'scheduled' as const
      }));

      // 2. Build full Deliverables with targetId
      const finalDeliverables = deliverablesList.map((del, dIdx) => ({
        ...del,
        id: del.id.startsWith('temp_') ? `del_${targetId}_${dIdx + 1}` : del.id,
        bookingId: targetId
      }));

      // 3. Build BookingRecord
      const bookingRecord = {
        id: targetId,
        studioId,
        bookingNumber,
        status: status === 'Completed' ? 'completed' : status === 'Cancelled' ? 'cancelled' : 'deal_confirmed' as any,
        customerId: finalCustomerId,
        customerName: finalCustomerName,
        customerPhone: finalCustomerPhone,
        customerWhatsApp: finalCustomerPhone,
        customerEmail: newCustomerEmail || `${finalCustomerName.toLowerCase().replace(/\s+/g, '')}@client.in`,
        eventName: name,
        category,
        mainEventDate: startDate,
        startDate,
        venue,
        city: venueCity,
        description: notes || `${category} shoot for ${finalCustomerName}`,
        numberOfDays: 1,
        numberOfFunctions: formattedFunctions.length,
        functions: formattedFunctions,
        deliverables: finalDeliverables,
        financials: {
          originalQuotation: Number(estimatedBudget),
          negotiatedDiscount: 0,
          finalAgreedAmount: Number(estimatedBudget),
          verifiedPaymentsReceived: Number(advancePaid),
          remainingBalance: Math.max(0, Number(estimatedBudget) - Number(advancePaid)),
          advanceRequired: Math.round(Number(estimatedBudget) * 0.5),
          advanceReceived: Number(advancePaid),
          advanceReceivedDate: Number(advancePaid) > 0 ? startDate : undefined,
          isAdvanceConfirmed: Number(advancePaid) > 0,
          paymentMilestones: []
        },
        billingVersions: [],
        notes,
        createdAt: eventToEdit?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // 4. Save to bookingProductionService (persists to store, syncs StudioEvent, and writes to Firestore)
      await bookingProductionService.saveBooking(studioId, bookingRecord as any);

      // 5. Update/Create Event in AppContext
      if (isEditing && eventToEdit) {
        updateEvent(eventToEdit.id, {
          name,
          title: name,
          customerId: finalCustomerId,
          customerName: finalCustomerName,
          customerPhone: finalCustomerPhone,
          category,
          startDate,
          startTime,
          endDate,
          endTime,
          venue,
          venueCity,
          priority,
          status,
          assignedTeamIds: assignedEmployeeIds,
          detailedAssignments: assignedEmployees.map(emp => ({
            memberId: emp.id,
            memberName: emp.name,
            roleTitle: (emp as any).role || emp.designation || 'Crew Member',
            department: emp.department || 'Photography',
            assignedDates: [startDate],
            assignedBy: 'owner',
            assignedAt: new Date().toISOString()
          })),
          leadPhotographerId: assignedEmployeeIds[0] || '',
          estimatedBudget: Number(estimatedBudget),
          advancePaid: Number(advancePaid),
          deliverables: finalDeliverables.map(d => d.name),
          notes: typeof notes === 'string' ? notes : String(notes || ''),
          createdAt: eventToEdit.createdAt || new Date().toISOString(),
          createdBy: eventToEdit.createdBy || 'system'
        });

        // Record history update
        bookingHistoryService.addHistoryItem(studioId, {
          bookingId: targetId,
          customerId: finalCustomerId,
          activityType: 'event_updated',
          title: `Event Details Updated — ${name}`,
          description: `Updated schedule, ${assignedEmployees.length} assigned crew members, and ${finalDeliverables.length} deliverables.`,
          performedBy: 'owner',
          performedByName: 'Studio Owner'
        });
      } else {
        createEvent({
          name,
          title: name,
          customerId: finalCustomerId,
          customerName: finalCustomerName,
          customerPhone: finalCustomerPhone,
          category,
          startDate,
          startTime,
          endDate,
          endTime,
          venue: venue || 'Studio Main Stage',
          venueCity: venueCity || 'Ahmedabad',
          priority,
          status,
          assignedTeamIds: assignedEmployeeIds,
          detailedAssignments: assignedEmployees.map(emp => ({
            memberId: emp.id,
            memberName: emp.name,
            roleTitle: (emp as any).role || emp.designation || 'Crew Member',
            department: emp.department || 'Photography',
            assignedDates: [startDate],
            assignedBy: 'owner',
            assignedAt: new Date().toISOString()
          })),
          leadPhotographerId: assignedEmployeeIds[0] || '',
          estimatedBudget: Number(estimatedBudget),
          advancePaid: Number(advancePaid),
          deliverables: finalDeliverables.map(d => d.name),
          notes: typeof notes === 'string' ? notes : String(notes || ''),
          createdBy: 'system'
        });
      }

      // If initial advance payment entered, record in booking history
      if (Number(advancePaid) > 0) {
        bookingHistoryService.recordPaymentHistory(studioId, targetId, {
          customerId: finalCustomerId,
          paymentId: `pay_${targetId}_adv`,
          amount: Number(advancePaid),
          paymentMethod: paymentMethod,
          reference: paymentRef || `TXN-${Date.now()}`,
          receiptNumber: paymentRef || `REC-${bookingNumber}`,
          previousBalance: Number(estimatedBudget),
          newBalance: Math.max(0, Number(estimatedBudget) - Number(advancePaid)),
          recordedBy: 'Studio Owner'
        });
      }

      setSaveSuccess(true);
      setTimeout(() => {
        setIsSaving(false);
        isSubmittingRef.current = false;
        onClose();
      }, 700);

    } catch (err: any) {
      console.error('[EventFormModal.handleSubmit] Error saving event:', err);
      setIsSaving(false);
      isSubmittingRef.current = false;
      setErrorMessage(err.message || 'Failed to save event. Your entries have been preserved. Please try again.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Event Details' : 'Create New Shoot / Event'}
      subtitle={isEditing ? `Updating ${eventToEdit?.eventNumber || ''}` : 'Add a new photography assignment or project to Studio OS'}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5 text-xs text-zinc-900 pb-2 relative">
        {/* Visible Saving/Loading Progress Overlay */}
        {isSaving && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-xs z-50 rounded-2xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-150">
            <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center shadow-xs mb-3">
              <Loader2 className="w-7 h-7 text-orange-600 animate-spin" />
            </div>
            <h4 className="text-base font-bold text-zinc-900 font-display">
              {isEditing ? 'Saving Event Changes...' : 'Creating Event Booking...'}
            </h4>
            <p className="text-xs text-zinc-500 mt-1 max-w-xs">
              Confirming shoot schedule and saving booking...
            </p>
          </div>
        )}

        {/* Step Progress Stepper Bar */}
        <div className="bg-zinc-50 border border-zinc-200/80 rounded-2xl p-3 space-y-2.5">
          {/* Mobile Header: Step X of 5 with title */}
          <div className="flex items-center justify-between sm:hidden">
            <span className="text-xs font-bold text-orange-600">
              Step {currentStep} of 5
            </span>
            <span className="text-xs font-bold text-zinc-800">
              {STEPS[currentStep - 1]?.title}
            </span>
          </div>

          {/* Desktop Stepper Pills */}
          <div className="hidden sm:grid grid-cols-5 gap-2">
            {STEPS.map(s => {
              const isCurrent = currentStep === s.id;
              const isPast = currentStep > s.id;

              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    if (s.id < currentStep || validateStep(currentStep)) {
                      setErrorMessage('');
                      setCurrentStep(s.id);
                    }
                  }}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-left ${
                    isCurrent
                      ? 'bg-orange-500 text-white border-orange-600 shadow-2xs font-bold'
                      : isPast
                        ? 'bg-orange-50 text-orange-800 border-orange-200 hover:bg-orange-100'
                        : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    isCurrent
                      ? 'bg-white text-orange-600'
                      : isPast
                        ? 'bg-orange-200 text-orange-900'
                        : 'bg-zinc-100 text-zinc-600'
                  }`}>
                    {isPast ? '✓' : s.id}
                  </span>
                  <span className="truncate">{s.short}</span>
                </button>
              );
            })}
          </div>

          {/* Progress Bar (Mobile & Desktop) */}
          <div className="w-full bg-zinc-200 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-orange-500 to-amber-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 5) * 100}%` }}
            />
          </div>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2 animate-in fade-in duration-150">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span className="font-semibold text-xs sm:text-sm">{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: CUSTOMER DETAILS */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="border-b border-zinc-100 pb-3">
              <h3 className="text-base font-bold text-zinc-900 font-display flex items-center gap-2">
                <User className="w-4 h-4 text-orange-600" />
                <span>Step 1 — Customer Details</span>
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Enter or select the client for this photography booking.
              </p>
            </div>

            {/* Existing Client vs New Client Toggle */}
            <div className="p-4 rounded-2xl border border-zinc-200 bg-zinc-50/70 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                  Client Selection
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsNewCustomer(!isNewCustomer);
                    setErrorMessage('');
                  }}
                  className="text-xs text-orange-600 font-bold hover:underline cursor-pointer flex items-center gap-1"
                >
                  {isNewCustomer ? '← Select Existing Client' : '+ Add New Client'}
                </button>
              </div>

              {!isNewCustomer ? (
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-600">Choose from Client Directory *</label>
                  <select
                    value={customerId}
                    onChange={e => handleCustomerSelect(e.target.value)}
                    className="w-full px-3.5 py-3 rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 min-h-[50px]"
                  >
                    <option value="">-- Choose registered client --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone}) — {c.city || 'Studio Client'}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">Customer Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rohit Sharma & Ritu Verma"
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      className="w-full px-3.5 py-3 rounded-xl border border-zinc-200 text-sm sm:text-base font-semibold text-zinc-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 min-h-[50px]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">Mobile Phone Number *</label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. +91 98250 12345"
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      className="w-full px-3.5 py-3 rounded-xl border border-zinc-200 text-sm sm:text-base font-semibold text-zinc-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 min-h-[50px]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">Email Address (Optional)</label>
                    <input
                      type="email"
                      placeholder="e.g. client@example.com"
                      value={newCustomerEmail}
                      onChange={e => setNewCustomerEmail(e.target.value)}
                      className="w-full px-3.5 py-3 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 min-h-[50px]"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: EVENT DETAILS */}
        {currentStep === 2 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="border-b border-zinc-100 pb-3">
              <h3 className="text-base font-bold text-zinc-900 font-display flex items-center gap-2">
                <Calendar className="w-4 h-4 text-orange-600" />
                <span>Step 2 — Event & Shoot Details</span>
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Specify shoot name, event type, schedule dates, and venue location.
              </p>
            </div>

            {/* Event Name */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">
                Event / Booking Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Rohit & Ritu Grand Royal Wedding"
                className="w-full px-3.5 py-3 rounded-xl border border-zinc-200 text-sm sm:text-base font-semibold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 min-h-[50px]"
              />
            </div>

            {/* Event Category & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">
                  Event Type / Category *
                </label>
                <select
                  value={category}
                  onChange={e => handleCategoryChange(e.target.value as EventCategory)}
                  className="w-full px-3.5 py-3 rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 min-h-[50px]"
                >
                  {ALL_EVENT_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">
                  Booking Status
                </label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as EventStatus)}
                  className="w-full px-3.5 py-3 rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-900 bg-white focus:outline-none min-h-[50px]"
                >
                  <option value="Confirmed">Confirmed</option>
                  <option value="Draft">Draft</option>
                  <option value="Shooting">Shooting</option>
                  <option value="Post-Production">Post-Production</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>

            {/* Schedule Dates & Times */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-zinc-500" /> Start Date & Time *
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-3/5 px-3 py-2.5 rounded-xl border border-zinc-200 text-sm bg-white focus:outline-none min-h-[48px]"
                  />
                  <input
                    type="time"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="w-2/5 px-3 py-2.5 rounded-xl border border-zinc-200 text-sm bg-white focus:outline-none min-h-[48px]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-zinc-500" /> End Date & Time
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-3/5 px-3 py-2.5 rounded-xl border border-zinc-200 text-sm bg-white focus:outline-none min-h-[48px]"
                  />
                  <input
                    type="time"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className="w-2/5 px-3 py-2.5 rounded-xl border border-zinc-200 text-sm bg-white focus:outline-none min-h-[48px]"
                  />
                </div>
              </div>
            </div>

            {/* Venue & City */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-zinc-500" /> Venue / Location *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. The Leela Palace Gandhinagar"
                  value={venue}
                  onChange={e => setVenue(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm bg-white focus:outline-none min-h-[48px]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider">
                  City
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ahmedabad"
                  value={venueCity}
                  onChange={e => setVenueCity(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm bg-white focus:outline-none min-h-[48px]"
                />
              </div>
            </div>

            {/* Multi-Function Wedding Support */}
            <div className="p-4 rounded-2xl border border-zinc-200 bg-zinc-50/70 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-zinc-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-orange-600" /> Functions & Sub-Events ({functionsList.length})
                  </span>
                  <p className="text-xs text-zinc-500">For multi-day weddings (Haldi, Sangeet, Wedding, Reception)</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddFunction(!showAddFunction)}
                  className="text-xs font-bold text-orange-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Function
                </button>
              </div>

              {/* Inline Add Function Form */}
              {showAddFunction && (
                <div className="p-3.5 rounded-xl bg-white border border-zinc-200 space-y-2.5 shadow-2xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Function Name (e.g. Haldi, Sangeet, Wedding)"
                      value={newFunctionName}
                      onChange={e => setNewFunctionName(e.target.value)}
                      className="px-3 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none min-h-[44px]"
                    />
                    <input
                      type="date"
                      value={newFunctionDate || startDate}
                      onChange={e => setNewFunctionDate(e.target.value)}
                      className="px-3 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none min-h-[44px]"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddFunction(false)}
                      className="px-3.5 py-1.5 text-xs text-zinc-500 hover:bg-zinc-100 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddFunction}
                      className="px-4 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl cursor-pointer"
                    >
                      Save Function
                    </button>
                  </div>
                </div>
              )}

              {/* Functions List */}
              <div className="space-y-2">
                {functionsList.map((fn, idx) => (
                  <div
                    key={fn.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-white border border-zinc-200 text-xs shadow-2xs"
                  >
                    <div>
                      <div className="font-bold text-zinc-900 text-sm">{idx + 1}. {fn.name}</div>
                      <div className="text-xs text-zinc-500 mt-0.5">
                        {fn.date} • {fn.startTime} - {fn.endTime} • {fn.venue || venue}
                      </div>
                    </div>
                    {functionsList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveFunction(fn.id)}
                        className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-lg cursor-pointer"
                        title="Remove function"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: SERVICES & TEAM */}
        {currentStep === 3 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="border-b border-zinc-100 pb-3">
              <h3 className="text-base font-bold text-zinc-900 font-display flex items-center gap-2">
                <PackageCheck className="w-4 h-4 text-orange-600" />
                <span>Step 3 — Services & Crew Assignments</span>
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Select photography/videography services and assign crew members including the Studio Owner.
              </p>
            </div>

            {/* Crew Assignment Section */}
            <div className="p-4 rounded-2xl border border-zinc-200 bg-zinc-50/70 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-bold text-zinc-800 uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-orange-600" /> Assign Team Members ({assignedEmployeeIds.length} Assigned)
                  </label>
                  <p className="text-xs text-zinc-500">Tap to select photographers, videographers, and Studio Owner</p>
                </div>
              </div>

              {/* Compact Removable Chips of Assigned Employees */}
              {assignedEmployeeIds.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1 pb-1">
                  {assignedEmployeeIds.map(empId => {
                    const emp = allEmployees.find(e => e.id === empId);
                    if (!emp) return null;
                    const hasConflict = conflictWarnings.some(w => w.employeeId === empId);
                    const isOverridden = overriddenConflictIds.includes(empId);

                    return (
                      <div
                        key={empId}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                          hasConflict && !isOverridden
                            ? 'bg-amber-50 text-amber-900 border-amber-300'
                            : 'bg-white text-zinc-800 border-zinc-200 shadow-2xs'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="font-bold">{emp.fullName}</span>
                        {!emp.fullName.includes('(Studio Owner)') && (
                          <span className="text-xs text-zinc-400 font-normal">({emp.designation})</span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleToggleEmployee(empId)}
                          className="ml-1 w-4 h-4 rounded-full hover:bg-zinc-200 flex items-center justify-center text-zinc-500 cursor-pointer"
                          title="Remove"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Scheduling Conflict Warnings Banner */}
              {conflictWarnings
                .filter(w => assignedEmployeeIds.includes(w.employeeId) && !overriddenConflictIds.includes(w.employeeId))
                .map(warn => (
                  <div
                    key={warn.employeeId}
                    className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <span className="font-bold">{warn.employeeName}</span> is already assigned to another event{' '}
                        <span className="font-semibold">({warn.conflictingEventName} at {warn.conflictingVenue})</span> during this time ({warn.conflictingStartTime} - {warn.conflictingEndTime}).
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleEmployee(warn.employeeId)}
                        className="px-2.5 py-1 rounded-lg border border-amber-300 bg-white text-xs font-semibold text-amber-800 hover:bg-amber-100 cursor-pointer"
                      >
                        Remove
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOverrideConflict(warn.employeeId)}
                        className="px-2.5 py-1 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 cursor-pointer"
                      >
                        Allow Overlap
                      </button>
                    </div>
                  </div>
                ))}

              {/* Searchable Employee Dropdown */}
              <div className="relative" ref={employeeDropdownRef}>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search crew by name, designation, department..."
                    value={employeeSearch}
                    onChange={e => {
                      setEmployeeSearch(e.target.value);
                      setIsEmployeeDropdownOpen(true);
                    }}
                    onFocus={() => setIsEmployeeDropdownOpen(true)}
                    className="w-full pl-10 pr-8 py-3 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none min-h-[48px]"
                  />
                  {employeeSearch && (
                    <button
                      type="button"
                      onClick={() => setEmployeeSearch('')}
                      className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Dropdown List */}
                {isEmployeeDropdownOpen && (
                  <div className="absolute z-20 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white border border-zinc-200 rounded-xl shadow-lg p-2 space-y-1">
                    <div className="flex items-center justify-between px-2 py-1 border-b border-zinc-100 text-xs text-zinc-400 font-semibold uppercase">
                      <span>Select Team Members</span>
                      <button
                        type="button"
                        onClick={() => setIsEmployeeDropdownOpen(false)}
                        className="text-zinc-600 hover:underline"
                      >
                        Close
                      </button>
                    </div>

                    {filteredEmployees.map(emp => {
                      const isChecked = assignedEmployeeIds.includes(emp.id);
                      return (
                        <div
                          key={emp.id}
                          onClick={() => handleToggleEmployee(emp.id)}
                          className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all ${
                            isChecked 
                              ? 'bg-orange-50 text-orange-950 font-bold border border-orange-200' 
                              : 'hover:bg-zinc-50 text-zinc-800'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                              isChecked ? 'bg-orange-600 text-white' : 'bg-zinc-200 text-zinc-700'
                            }`}>
                              {emp.fullName.charAt(0)}
                            </div>
                            <div>
                              <div className="font-semibold text-sm">{emp.fullName}</div>
                              <div className="text-xs text-zinc-500">
                                {emp.designation} • {emp.department}
                              </div>
                            </div>
                          </div>
                          <div>
                            {isChecked ? (
                              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500 text-white font-bold">
                                ✓ Assigned
                              </span>
                            ) : (
                              <span className="text-xs px-2.5 py-0.5 rounded-full border border-zinc-200 text-zinc-500">
                                + Assign
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Deliverables & Services Checklist */}
            <div className="p-4 rounded-2xl border border-zinc-200 bg-zinc-50/70 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-zinc-800 uppercase tracking-wider flex items-center gap-1.5">
                    <PackageCheck className="w-3.5 h-3.5 text-orange-600" /> Services & Deliverables Checklist ({deliverablesList.length})
                  </span>
                  <p className="text-xs text-zinc-500">Preset outputs and fulfillment items for this shoot</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddDeliverable(!showAddDeliverable)}
                  className="text-xs font-bold text-orange-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Custom
                </button>
              </div>

              {/* Inline Add Deliverable Form */}
              {showAddDeliverable && (
                <div className="p-3.5 rounded-xl bg-white border border-zinc-200 space-y-2 shadow-2xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Deliverable Name (e.g. 50 Edited Stills)"
                      value={newDelName}
                      onChange={e => setNewDelName(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none sm:col-span-1 min-h-[44px]"
                    />
                    <select
                      value={newDelCategory}
                      onChange={e => setNewDelCategory(e.target.value as DeliverableCategory)}
                      className="px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none bg-white min-h-[44px]"
                    >
                      <option value="photography">Photography</option>
                      <option value="video">Videography</option>
                      <option value="physical">Physical Album</option>
                      <option value="digital">Digital / Link</option>
                    </select>
                    <input
                      type="date"
                      value={newDelDueDate}
                      onChange={e => setNewDelDueDate(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none min-h-[44px]"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddDeliverable(false)}
                      className="px-3.5 py-1.5 text-xs text-zinc-500 hover:bg-zinc-100 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddCustomDeliverable}
                      className="px-4 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl"
                    >
                      Save Deliverable
                    </button>
                  </div>
                </div>
              )}

              {/* Deliverables Checklist List */}
              <div className="space-y-1.5 max-h-52 overflow-y-auto">
                {deliverablesList.map((del, idx) => {
                  const isDone = del.isDelivered || del.stage === 'delivered';
                  return (
                    <div
                      key={del.id}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-zinc-200 bg-white text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => handleToggleDeliverableStatus(del.id)}
                          className={`w-5 h-5 rounded-md flex items-center justify-center transition-all cursor-pointer ${
                            isDone ? 'bg-emerald-600 text-white' : 'border border-zinc-300 text-transparent hover:border-zinc-500'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                        <div>
                          <span className={`font-semibold ${isDone ? 'line-through text-zinc-400' : 'text-zinc-900'}`}>
                            {idx + 1}. {del.name}
                          </span>
                          <span className="text-xs text-zinc-400 ml-1.5 capitalize">
                            • {del.category}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveDeliverable(del.id)}
                        className="p-1 text-zinc-400 hover:text-rose-600"
                        title="Remove deliverable"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: BUDGET & PAYMENT */}
        {currentStep === 4 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="border-b border-zinc-100 pb-3">
              <h3 className="text-base font-bold text-zinc-900 font-display flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-orange-600" />
                <span>Step 4 — Budget & Advance Payment</span>
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Record agreed package pricing, advance payment received, and payment reference.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">
                  Total Agreed Package Amount (₹) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  required
                  value={estimatedBudget}
                  onChange={e => setEstimatedBudget(Number(e.target.value))}
                  className="w-full px-3.5 py-3 rounded-xl border border-zinc-200 text-base font-bold text-zinc-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 min-h-[50px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">
                  Advance Payment Received (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={advancePaid}
                  onChange={e => setAdvancePaid(Number(e.target.value))}
                  className="w-full px-3.5 py-3 rounded-xl border border-zinc-200 text-base font-bold text-emerald-700 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 min-h-[50px]"
                />
              </div>
            </div>

            {/* Calculated Remaining Balance Card */}
            <div className="p-4 rounded-2xl bg-orange-50/70 border border-orange-200 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Remaining Balance</div>
                <div className="text-xl sm:text-2xl font-black text-orange-600 mt-0.5">
                  ₹{Math.max(0, Number(estimatedBudget) - Number(advancePaid)).toLocaleString('en-IN')}
                </div>
              </div>
              <div className="text-right">
                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
                  Number(advancePaid) >= Number(estimatedBudget) && Number(estimatedBudget) > 0
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : Number(advancePaid) > 0
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-zinc-200 text-zinc-700'
                }`}>
                  {Number(advancePaid) >= Number(estimatedBudget) && Number(estimatedBudget) > 0
                    ? 'Fully Paid'
                    : Number(advancePaid) > 0
                      ? 'Advance Received'
                      : 'Pending Advance'}
                </span>
              </div>
            </div>

            {/* Payment Method & Reference Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3.5 py-3 rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-900 bg-white focus:outline-none min-h-[50px]"
                >
                  <option value="UPI">UPI / Digital</option>
                  <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                  <option value="Cash">Cash</option>
                  <option value="Card">Debit / Credit Card</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">
                  Receipt / Transaction Ref No.
                </label>
                <input
                  type="text"
                  placeholder="e.g. UPI/2026/894231"
                  value={paymentRef}
                  onChange={e => setPaymentRef(e.target.value)}
                  className="w-full px-3.5 py-3 rounded-xl border border-zinc-200 text-sm text-zinc-900 bg-white focus:outline-none min-h-[50px]"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: NOTES & CONFIRMATION */}
        {currentStep === 5 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="border-b border-zinc-100 pb-3">
              <h3 className="text-base font-bold text-zinc-900 font-display flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-orange-600" />
                <span>Step 5 — Notes & Confirmation</span>
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Add production instructions and review the booking summary before confirming.
              </p>
            </div>

            {/* Production Notes & Client Requests */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-zinc-500" /> Production Notes & Special Client Requests
              </label>
              <textarea
                rows={3}
                placeholder="Key timings, required lenses, specific family portraits, drone clearances, branch notes..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full p-3 rounded-xl border border-zinc-200 text-sm text-zinc-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>

            {/* Comprehensive Review Booking Summary Card */}
            <div className="p-4 rounded-2xl border border-zinc-200 bg-zinc-50/70 space-y-3">
              <h4 className="text-xs font-bold text-zinc-800 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Booking Summary Review</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-white border border-zinc-200">
                  <span className="text-zinc-500 block">Client</span>
                  <span className="font-bold text-sm text-zinc-900 mt-0.5 block truncate">
                    {customerName || (customers.find(c => c.id === customerId)?.name) || 'Selected Client'}
                  </span>
                  <span className="text-zinc-500 font-mono mt-0.5 block">
                    {customerPhone || (customers.find(c => c.id === customerId)?.phone) || ''}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white border border-zinc-200">
                  <span className="text-zinc-500 block">Event & Category</span>
                  <span className="font-bold text-sm text-zinc-900 mt-0.5 block truncate">
                    {name || 'Shoot Event'}
                  </span>
                  <span className="text-orange-600 font-semibold mt-0.5 block">
                    {category} • {startDate}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white border border-zinc-200">
                  <span className="text-zinc-500 block">Venue Location</span>
                  <span className="font-bold text-sm text-zinc-900 mt-0.5 block truncate">
                    {venue || 'Venue TBD'}
                  </span>
                  <span className="text-zinc-500 mt-0.5 block">
                    {venueCity} ({startTime} - {endTime})
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white border border-zinc-200">
                  <span className="text-zinc-500 block">Financial Summary</span>
                  <div className="font-bold text-sm text-zinc-900 mt-0.5">
                    Total: ₹{Number(estimatedBudget).toLocaleString('en-IN')}
                  </div>
                  <div className="text-zinc-500 mt-0.5">
                    Advance: ₹{Number(advancePaid).toLocaleString('en-IN')} | Balance: ₹{Math.max(0, Number(estimatedBudget) - Number(advancePaid)).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Assigned Team Members Summary */}
              <div className="p-3 rounded-xl bg-white border border-zinc-200 text-xs">
                <span className="text-zinc-500 block mb-1">
                  Assigned Team ({assignedEmployeeIds.length} Members)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {assignedEmployeeIds.map(empId => {
                    const emp = allEmployees.find(e => e.id === empId);
                    return (
                      <span key={empId} className="px-2.5 py-1 rounded-lg bg-orange-50 text-orange-900 border border-orange-200 font-semibold text-xs">
                        {emp?.fullName || empId}
                      </span>
                    );
                  })}
                  {assignedEmployeeIds.length === 0 && (
                    <span className="text-zinc-400 italic">No crew assigned yet (can be assigned later)</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEPPER NAVIGATION & FORM ACTIONS */}
        <div className="pt-3 border-t border-zinc-100 flex items-center justify-between gap-3 flex-wrap">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
            className="min-h-[48px] px-4 text-zinc-600 cursor-pointer"
          >
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevStep}
                disabled={isSaving}
                className="min-h-[48px] px-4 font-semibold text-zinc-700 hover:bg-zinc-100 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            )}

            {currentStep < 5 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="min-h-[50px] px-6 rounded-xl bg-gradient-to-r from-orange-500 via-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-sm shadow-sm hover:shadow-md hover:shadow-orange-500/20 transition-all flex items-center gap-1.5 cursor-pointer touch-manipulation active:scale-[0.98]"
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSaving}
                className="min-h-[52px] px-7 rounded-xl bg-gradient-to-r from-orange-500 via-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-sm sm:text-base shadow-sm hover:shadow-md hover:shadow-orange-500/20 transition-all flex items-center gap-2 cursor-pointer touch-manipulation active:scale-[0.98] disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{isEditing ? 'Saving Changes...' : 'Creating Booking...'}</span>
                  </>
                ) : saveSuccess ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-white" />
                    <span>Booking Confirmed!</span>
                  </>
                ) : (
                  <span>{isEditing ? 'Save Changes' : '+ Create Event Booking'}</span>
                )}
              </button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
};
