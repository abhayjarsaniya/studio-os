import React, { useState, useEffect, useMemo } from 'react';
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
  PackageCheck
} from 'lucide-react';
import { crewConflictService, CrewConflictInfo } from '../../services/crewConflictService';
import { generateDeliverablesForCategory } from '../../services/deliverablesPresetService';
import { bookingProductionService } from '../../services/bookingProductionService';
import { bookingHistoryService } from '../../services/bookingHistoryService';
import { firestoreService } from '../../services/firestoreService';
import { DeliverableSpecification, DeliverableCategory } from '../../types/bookingProduction';

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
  const [venueCity, setVenueCity] = useState(currentStudio?.city || 'Ahmedabad');
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
  const [estimatedBudget, setEstimatedBudget] = useState<number>(120000);
  const [advancePaid, setAdvancePaid] = useState<number>(50000);
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Bank Transfer' | 'Cash' | 'Card'>('UPI');
  const [paymentRef, setPaymentRef] = useState('');

  // Notes & UI Status
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Populate form if editing or initializing
  useEffect(() => {
    if (!isOpen) {
      setErrorMessage('');
      setSaveSuccess(false);
      setIsSaving(false);
      setConflictWarnings([]);
      setOverriddenConflictIds([]);
      return;
    }

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
          // Generate category-specific deliverables
          const generated = generateDeliverablesForCategory(eventToEdit.category, eventToEdit.id, start);
          setDeliverablesList(generated);
        }
      } else {
        setEstimatedBudget(eventToEdit.estimatedBudget || 120000);
        setAdvancePaid(eventToEdit.advancePaid || 0);
        setNotes(eventToEdit.notes || '');
        setFunctionsList([
          { id: `fn_${eventToEdit.id}_main`, name: eventToEdit.name, date: start, startTime: eventToEdit.startTime || '10:00', endTime: eventToEdit.endTime || '18:00', venue: eventToEdit.venue || '' }
        ]);
        const generated = generateDeliverablesForCategory(eventToEdit.category, eventToEdit.id, start);
        setDeliverablesList(generated);
      }
    } else {
      // Default reset for new event
      setName('');
      if (customers.length > 0) {
        setCustomerId(customers[0].id);
        setCustomerName(customers[0].name);
        setCustomerPhone(customers[0].phone);
      }
      setIsNewCustomer(false);
      setCategory('Wedding');
      const start = initialDate || new Date().toISOString().split('T')[0];
      setStartDate(start);
      setStartTime('10:00');
      setEndDate(start);
      setEndTime('18:00');
      setVenue('');
      setVenueCity(currentStudio?.city || 'Ahmedabad');
      setPriority('High');
      setStatus('Confirmed');
      setAssignedEmployeeIds([]);
      setEstimatedBudget(120000);
      setAdvancePaid(50000);
      setPaymentMethod('UPI');
      setPaymentRef('');
      setNotes('');

      // Preset deliverables for new event
      const tempId = `temp_${Date.now()}`;
      setDeliverablesList(generateDeliverablesForCategory('Wedding', tempId, start));
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

  // Form Submission & Unbreakable Save Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!name.trim()) {
      setErrorMessage('Please enter an event name.');
      return;
    }

    if (!venue.trim()) {
      setErrorMessage('Please enter a venue / location.');
      return;
    }

    // Check unresolved blocking conflicts that haven't been overridden
    const unacknowledgedConflicts = conflictWarnings.filter(
      w => assignedEmployeeIds.includes(w.employeeId) && !overriddenConflictIds.includes(w.employeeId)
    );

    if (unacknowledgedConflicts.length > 0) {
      setErrorMessage(`Please review scheduling warning for ${unacknowledgedConflicts[0].employeeName} or click "Allow Overlap" to confirm.`);
      return;
    }

    setIsSaving(true);

    try {
      let finalCustomerId = customerId;
      let finalCustomerName = customerName;
      let finalCustomerPhone = customerPhone;

      // Create client if new
      if (isNewCustomer) {
        if (!customerName.trim() || !customerPhone.trim()) {
          setIsSaving(false);
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
      const targetId = eventToEdit?.id || `bkg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const bookingNumber = eventToEdit?.eventNumber?.replace('EVT-', '') || `BKG-2026-${Math.floor(1000 + Math.random() * 9000)}`;

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
        assignedPhotographerIds: assignedEmployees.filter(e => e.department === 'Photography').map(e => e.id),
        assignedVideographerIds: assignedEmployees.filter(e => e.department === 'Videography').map(e => e.id),
        assignedDroneOperatorIds: assignedEmployees.filter(e => e.designation?.toLowerCase().includes('drone')).map(e => e.id),
        assignedEditorIds: assignedEmployees.filter(e => e.department?.toLowerCase().includes('edit')).map(e => e.id),
        assignedSupplierIds: [],
        assignedCrew: assignedEmployees.map(emp => ({
          employeeId: emp.id,
          employeeName: emp.fullName,
          role: emp.designation || 'Crew',
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
      bookingProductionService.saveBooking(studioId, bookingRecord as any);

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
        onClose();
      }, 700);

    } catch (err: any) {
      console.error('[EventFormModal.handleSubmit] Error saving event:', err);
      setIsSaving(false);
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
      <form onSubmit={handleSubmit} className="space-y-6 text-xs text-zinc-900 pb-2">
        {/* Error Banner */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        {/* SECTION 1: Event Name & Customer */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">
              Event Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Rahul & Priya Royal Wedding & Sangeet"
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all min-h-[44px]"
            />
          </div>

          {/* Customer Selection */}
          <div className="p-4 rounded-2xl border border-zinc-200 bg-zinc-50/70 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">
                Client / Customer *
              </span>
              <button
                type="button"
                onClick={() => setIsNewCustomer(!isNewCustomer)}
                className="text-xs text-zinc-900 underline font-medium hover:text-zinc-700 cursor-pointer"
              >
                {isNewCustomer ? 'Select Existing Client' : '+ Add New Client'}
              </button>
            </div>

            {!isNewCustomer ? (
              <select
                value={customerId}
                onChange={e => handleCustomerSelect(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-xs font-medium text-zinc-900 bg-white focus:outline-none min-h-[44px]"
              >
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone}) - {c.city}
                  </option>
                ))}
              </select>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <input
                    type="text"
                    required
                    placeholder="Client Full Name *"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-white focus:outline-none min-h-[44px]"
                  />
                </div>
                <div>
                  <input
                    type="tel"
                    required
                    placeholder="Phone (e.g. +91 98250 12345) *"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-white focus:outline-none min-h-[44px]"
                  />
                </div>
                <div>
                  <input
                    type="email"
                    placeholder="Email Address"
                    value={newCustomerEmail}
                    onChange={e => setNewCustomerEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-white focus:outline-none min-h-[44px]"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 2: Category, Status, Priority */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">
              Category *
            </label>
            <select
              value={category}
              onChange={e => handleCategoryChange(e.target.value as EventCategory)}
              className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/10 min-h-[44px]"
            >
              {ALL_EVENT_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">
              Status *
            </label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as EventStatus)}
              className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/10 min-h-[44px]"
            >
              <option value="Draft">Draft</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Shooting">Shooting</option>
              <option value="Post-Production">Post-Production</option>
              <option value="Under Review">Under Review</option>
              <option value="Delivered">Delivered</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">
              Priority
            </label>
            <select
              value={priority}
              onChange={e => setPriority(e.target.value as Priority)}
              className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/10 min-h-[44px]"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </select>
          </div>
        </div>

        {/* SECTION 3: Schedule, Timing & Location */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                className="w-3/5 px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-white focus:outline-none min-h-[44px]"
              />
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-2/5 px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-white focus:outline-none min-h-[44px]"
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
                className="w-3/5 px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-white focus:outline-none min-h-[44px]"
              />
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-2/5 px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-white focus:outline-none min-h-[44px]"
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
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-white focus:outline-none min-h-[44px]"
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
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-white focus:outline-none min-h-[44px]"
            />
          </div>
        </div>

        {/* SECTION 4: ASSIGN TEAM MEMBERS (Requirement 1) */}
        <div className="p-4 rounded-2xl border border-zinc-200 bg-zinc-50/70 space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-zinc-500" /> Assign Team Members ({assignedEmployeeIds.length} Assigned)
            </label>
            <span className="text-xs text-zinc-500">Shreeji Studio Crew Roster</span>
          </div>

          {/* Compact Removable Chips of Assigned Employees */}
          {assignedEmployeeIds.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1 pb-2">
              {assignedEmployeeIds.map(empId => {
                const emp = allEmployees.find(e => e.id === empId);
                if (!emp) return null;
                const hasConflict = conflictWarnings.some(w => w.employeeId === empId);
                const isOverridden = overriddenConflictIds.includes(empId);

                return (
                  <div
                    key={empId}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-medium transition-all ${
                      hasConflict && !isOverridden
                        ? 'bg-amber-50 text-amber-900 border-amber-300'
                        : 'bg-white text-zinc-800 border-zinc-200 shadow-2xs'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="font-bold">{emp.fullName}</span>
                    <span className="text-xs text-zinc-400 font-normal">({emp.designation})</span>
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
                  <div>
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
                    Change Member
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
          <div className="relative">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
              <input
                type="text"
                placeholder="Search team members by name, designation, department..."
                value={employeeSearch}
                onChange={e => {
                  setEmployeeSearch(e.target.value);
                  setIsEmployeeDropdownOpen(true);
                }}
                onFocus={() => setIsEmployeeDropdownOpen(true)}
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-zinc-200 bg-white text-xs focus:outline-none min-h-[44px]"
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
                  <span>Select Active Team Members</span>
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
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${
                        isChecked 
                          ? 'bg-zinc-900 text-white' 
                          : 'hover:bg-zinc-50 text-zinc-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                          isChecked ? 'bg-zinc-700 text-white' : 'bg-zinc-200 text-zinc-700'
                        }`}>
                          {emp.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold">{emp.fullName}</div>
                          <div className={`text-xs ${isChecked ? 'text-zinc-300' : 'text-zinc-400'}`}>
                            {emp.designation} • {emp.department}
                          </div>
                        </div>
                      </div>
                      <div>
                        {isChecked ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500 text-white font-bold">
                            ✓ Assigned
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full border border-zinc-200 text-zinc-500">
                            + Assign
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {filteredEmployees.length === 0 && (
                  <div className="p-4 text-center text-zinc-400 text-xs">
                    No active team members matching "{employeeSearch}".
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* SECTION 5: FUNCTIONS / SUB-EVENTS */}
        <div className="p-4 rounded-2xl border border-zinc-200 bg-zinc-50/70 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-zinc-500" /> Functions & Sub-Events ({functionsList.length})
            </span>
            <button
              type="button"
              onClick={() => setShowAddFunction(!showAddFunction)}
              className="text-xs font-semibold text-zinc-900 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Function
            </button>
          </div>

          {/* Inline Add Function Form */}
          {showAddFunction && (
            <div className="p-3 rounded-xl bg-white border border-zinc-200 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Function Name (e.g. Mandvo, Haldi, Sangeet, Reception)"
                  value={newFunctionName}
                  onChange={e => setNewFunctionName(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-zinc-200 text-xs focus:outline-none"
                />
                <input
                  type="date"
                  value={newFunctionDate || startDate}
                  onChange={e => setNewFunctionDate(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-zinc-200 text-xs focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddFunction(false)}
                  className="px-3 py-1.5 text-xs text-zinc-500 hover:bg-zinc-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddFunction}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-zinc-900 rounded-lg hover:bg-zinc-800"
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
                className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-zinc-200 text-xs"
              >
                <div>
                  <div className="font-bold text-zinc-900">{idx + 1}. {fn.name}</div>
                  <div className="text-xs text-zinc-500">
                    {fn.date} • {fn.startTime} - {fn.endTime} • {fn.venue || venue}
                  </div>
                </div>
                {functionsList.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveFunction(fn.id)}
                    className="p-1 text-zinc-400 hover:text-red-600 rounded-lg"
                    title="Remove function"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 6: EVENT-SPECIFIC DELIVERABLES (Requirement 2) */}
        <div className="p-4 rounded-2xl border border-zinc-200 bg-zinc-50/70 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
                <PackageCheck className="w-3.5 h-3.5 text-zinc-500" /> Event-Specific Deliverables ({deliverablesList.length} Items)
              </span>
              <p className="text-xs text-zinc-400 mt-0.5">
                Independent deliverable checklist saved specifically to this booking
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddDeliverable(!showAddDeliverable)}
              className="text-xs font-semibold text-zinc-900 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Custom
            </button>
          </div>

          {/* Inline Add Deliverable Form */}
          {showAddDeliverable && (
            <div className="p-3 rounded-xl bg-white border border-zinc-200 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Deliverable Name (e.g. 50 Edited Stills)"
                  value={newDelName}
                  onChange={e => setNewDelName(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-zinc-200 text-xs focus:outline-none sm:col-span-1"
                />
                <select
                  value={newDelCategory}
                  onChange={e => setNewDelCategory(e.target.value as DeliverableCategory)}
                  className="px-3 py-2 rounded-lg border border-zinc-200 text-xs focus:outline-none bg-white"
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
                  className="px-3 py-2 rounded-lg border border-zinc-200 text-xs focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddDeliverable(false)}
                  className="px-3 py-1.5 text-xs text-zinc-500 hover:bg-zinc-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddCustomDeliverable}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-zinc-900 rounded-lg hover:bg-zinc-800"
                >
                  Save Deliverable
                </button>
              </div>
            </div>
          )}

          {/* Deliverables Checklist */}
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {deliverablesList.map((del, idx) => {
              const isDone = del.isDelivered || del.stage === 'delivered';
              const isInProgress = del.stage === 'editing' || del.stage === 'video_editing' || del.stage === 'selection_culling';

              return (
                <div
                  key={del.id}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${
                    isDone 
                      ? 'bg-emerald-50/60 border-emerald-200 text-zinc-600' 
                      : isInProgress 
                        ? 'bg-blue-50/60 border-blue-200 text-zinc-900' 
                        : 'bg-white border-zinc-200 text-zinc-900'
                  }`}
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
                      <span className={`font-semibold ${isDone ? 'line-through text-zinc-400' : ''}`}>
                        {idx + 1}. {del.name}
                      </span>
                      <span className="text-xs text-zinc-400 ml-1.5 capitalize">
                        • {del.category} • Due: {del.calculatedDeadline}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleDeliverableStatus(del.id)}
                      className={`px-2 py-0.5 rounded-md text-xs font-bold cursor-pointer ${
                        isDone 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : isInProgress 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-zinc-100 text-zinc-600'
                      }`}
                    >
                      {isDone ? 'Done' : isInProgress ? 'In Progress' : 'Pending'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveDeliverable(del.id)}
                      className="p-1 text-zinc-400 hover:text-red-600"
                      title="Remove deliverable"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 7: Financials (Estimated Budget & Advance) */}
        <div className="p-4 rounded-2xl border border-zinc-200 bg-zinc-50/70 space-y-3">
          <span className="text-xs font-semibold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-zinc-500" /> Budget & Payment Details (₹)
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Total Agreed Amount (₹)</label>
              <input
                type="number"
                min="0"
                step="1000"
                value={estimatedBudget}
                onChange={e => setEstimatedBudget(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-900 bg-white focus:outline-none min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Advance Received (₹)</label>
              <input
                type="number"
                min="0"
                step="1000"
                value={advancePaid}
                onChange={e => setAdvancePaid(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs font-bold text-emerald-700 bg-white focus:outline-none min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-900 bg-white focus:outline-none min-h-[44px]"
              >
                <option value="UPI">UPI / Digital</option>
                <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                <option value="Cash">Cash</option>
                <option value="Card">Debit / Credit Card</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Receipt / Ref No.</label>
              <input
                type="text"
                placeholder="e.g. UPI-2026-0042"
                value={paymentRef}
                onChange={e => setPaymentRef(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-900 bg-white focus:outline-none min-h-[44px]"
              />
            </div>
          </div>
        </div>

        {/* SECTION 8: Production Notes */}
        <div>
          <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-zinc-500" /> Production Notes & Special Client Requests
          </label>
          <textarea
            rows={3}
            placeholder="Key timings, required lenses, specific family portraits, LED screen live feed details, drone clearances..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
          />
        </div>

        {/* SECTION 9: Form Actions & Save Button */}
        <div className="pt-3 border-t border-zinc-100 flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="primary"
            disabled={isSaving}
            className="min-h-[44px] px-6"
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving to Cloud...
              </span>
            ) : saveSuccess ? (
              <span className="flex items-center gap-2 text-white">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Saved!
              </span>
            ) : (
              isEditing ? 'Save Changes' : 'Create Event Booking'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
