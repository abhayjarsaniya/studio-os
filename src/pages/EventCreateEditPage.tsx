import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useStudio } from '../context/StudioContext';
import { EventCategory, EventStatus, Priority, EventAttachment } from '../types';
import { ALL_EVENT_CATEGORIES } from '../data/demoData';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  MapPin, 
  UserCheck, 
  DollarSign, 
  FileText, 
  Upload, 
  X, 
  Plus, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Button } from '../components/ui/Button';

interface EventCreateEditPageProps {
  eventIdToEdit?: string;
}

export const EventCreateEditPage: React.FC<EventCreateEditPageProps> = ({ eventIdToEdit }) => {
  const { 
    events, 
    customers, 
    users, 
    createEvent, 
    updateEvent, 
    createCustomer, 
    setEventRoute,
    navigateToEventDetail 
  } = useApp();

  const { currentStudio } = useStudio();

  const isEditing = !!eventIdToEdit;
  const existingEvent = isEditing ? events.find(e => e.id === eventIdToEdit) : undefined;

  // Form State
  const [name, setName] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  
  // Inline Add Customer State
  const [isInlineCustomerOpen, setIsInlineCustomerOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustCity, setNewCustCity] = useState('');

  // Category & Dates
  const [category, setCategory] = useState<EventCategory>('Wedding');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('10:00');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [endTime, setEndTime] = useState('22:00');

  // Venue & Maps
  const [venue, setVenue] = useState('');
  const [venueCity, setVenueCity] = useState(currentStudio.city || 'Mumbai');
  const [fullAddress, setFullAddress] = useState('');
  const [googleMapsLocation, setGoogleMapsLocation] = useState('');

  // Priority & Status
  const [priority, setPriority] = useState<Priority>('High');
  const [status, setStatus] = useState<EventStatus>('Confirmed');

  // Crew & Details
  const [assignedTeamIds, setAssignedTeamIds] = useState<string[]>([]);
  const [leadPhotographerId, setLeadPhotographerId] = useState('');
  const [description, setDescription] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [estimatedBudget, setEstimatedBudget] = useState(150000);
  const [advancePaid, setAdvancePaid] = useState(50000);

  // Attachments
  const [attachments, setAttachments] = useState<EventAttachment[]>([]);
  const [attachName, setAttachName] = useState('');
  const [attachUrl, setAttachUrl] = useState('');
  const [showAttachInput, setShowAttachInput] = useState(false);

  // Error Banner
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (existingEvent) {
      setName(existingEvent.name);
      setCustomerId(existingEvent.customerId);
      setCustomerName(existingEvent.customerName);
      setCustomerPhone(existingEvent.customerPhone);
      setCategory(existingEvent.category);
      setStartDate(existingEvent.startDate);
      setStartTime(existingEvent.startTime || '10:00');
      setEndDate(existingEvent.endDate || existingEvent.startDate);
      setEndTime(existingEvent.endTime || '22:00');
      setVenue(existingEvent.venue);
      setVenueCity(existingEvent.venueCity);
      setFullAddress(existingEvent.fullAddress || '');
      setGoogleMapsLocation(existingEvent.googleMapsLocation || '');
      setPriority(existingEvent.priority);
      setStatus(existingEvent.status);
      setAssignedTeamIds(existingEvent.assignedTeamIds || []);
      setLeadPhotographerId(existingEvent.leadPhotographerId || '');
      setDescription(existingEvent.description || '');
      setInternalNotes(existingEvent.internalNotes || existingEvent.notes || '');
      setEstimatedBudget(existingEvent.estimatedBudget || 0);
      setAdvancePaid(existingEvent.advancePaid || 0);
      setAttachments(existingEvent.attachments || []);
    } else if (customers.length > 0) {
      setCustomerId(customers[0].id);
      setCustomerName(customers[0].name);
      setCustomerPhone(customers[0].phone);
      if (users.length > 0) {
        setAssignedTeamIds([users[0].id]);
        setLeadPhotographerId(users[0].id);
      }
    }
  }, [existingEvent, customers, users]);

  const handleCustomerChange = (id: string) => {
    setCustomerId(id);
    const found = customers.find(c => c.id === id);
    if (found) {
      setCustomerName(found.name);
      setCustomerPhone(found.phone);
    }
  };

  const handleCreateInlineCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustPhone.trim()) {
      setErrorMessage('Please provide customer name and phone number');
      return;
    }

    const created = createCustomer({
      name: newCustName.trim(),
      phone: newCustPhone.trim(),
      email: newCustEmail.trim() || `${newCustName.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
      city: newCustCity.trim() || venueCity,
      notes: `Created during event setup for ${name || 'shoot'}`
    });

    setCustomerId(created.id);
    setCustomerName(created.name);
    setCustomerPhone(created.phone);
    setIsInlineCustomerOpen(false);
    setNewCustName('');
    setNewCustPhone('');
  };

  const handleToggleCrew = (userId: string) => {
    setAssignedTeamIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleAddAttachment = () => {
    if (!attachName.trim()) return;
    const newAtt: EventAttachment = {
      id: `att_${Date.now()}`,
      name: attachName.trim(),
      url: attachUrl.trim() || 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&auto=format&fit=crop&q=80',
      type: 'image',
      uploadedBy: 'staff',
      uploadedAt: new Date().toISOString()
    };
    setAttachments(prev => [...prev, newAtt]);
    setAttachName('');
    setAttachUrl('');
    setShowAttachInput(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!name.trim()) {
      setErrorMessage('Please enter an event name');
      return;
    }

    if (!customerId) {
      setErrorMessage('Please select or create a client for this event');
      return;
    }

    // Validate date range
    if (endDate < startDate) {
      setErrorMessage('Event end date cannot be earlier than start date!');
      return;
    }

    if (isEditing && existingEvent) {
      updateEvent(existingEvent.id, {
        name,
        customerId,
        customerName,
        customerPhone,
        category,
        startDate,
        startTime,
        endDate,
        endTime,
        venue,
        venueCity,
        fullAddress,
        googleMapsLocation,
        priority,
        status,
        assignedTeamIds,
        leadPhotographerId: leadPhotographerId || assignedTeamIds[0],
        description,
        internalNotes,
        estimatedBudget: Number(estimatedBudget),
        advancePaid: Number(advancePaid),
        attachments
      });
      navigateToEventDetail(existingEvent.id);
    } else {
      const created = createEvent({
        name,
        customerId,
        customerName,
        customerPhone,
        category,
        startDate,
        startTime,
        endDate,
        endTime,
        venue: venue || 'Main Studio Stage',
        venueCity: venueCity || 'Mumbai',
        fullAddress,
        googleMapsLocation,
        priority,
        status,
        assignedTeamIds,
        leadPhotographerId: leadPhotographerId || assignedTeamIds[0],
        description,
        internalNotes,
        estimatedBudget: Number(estimatedBudget),
        advancePaid: Number(advancePaid),
        attachments,
        deliverables: ['Extended Feature Film', 'Cinematic Teaser', 'Master Stills']
      });
      navigateToEventDetail(created.id);
    }
  };

  return (
    <div className="max-w-7xl w-full mx-auto space-y-6 pb-16 px-3.5 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
        <button
          onClick={() => setEventRoute({ mode: 'list' })}
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-600 hover:text-zinc-950 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Cancel & Back</span>
        </button>

        <h2 className="text-lg font-bold text-zinc-900 font-display">
          {isEditing ? `Edit Event: ${existingEvent?.eventNumber}` : 'Create New Photography Shoot'}
        </h2>

        <span className="text-xs font-mono text-zinc-400">
          Studio: {currentStudio.name}
        </span>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Event Info */}
        <div className="p-5 sm:p-6 bg-white rounded-3xl border border-zinc-200/90 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider font-display">
            1. Event Identity & Category
          </h3>

          <div>
            <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
              Event Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Kapoor Royal Destination Wedding & Sangeet"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 min-h-[44px]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                Category (25 Types) *
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as EventCategory)}
                className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-900 bg-white focus:outline-none min-h-[44px]"
              >
                {ALL_EVENT_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                Event Status *
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as EventStatus)}
                className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-900 bg-white focus:outline-none min-h-[44px]"
              >
                <option value="Enquiry">Enquiry</option>
                <option value="Tentative">Tentative</option>
                <option value="Confirmed">Confirmed</option>
                <option value="In Progress">In Progress</option>
                <option value="On Hold">On Hold</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                Priority
              </label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as Priority)}
                className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-900 bg-white focus:outline-none min-h-[44px]"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>
        </div>

        {/* Customer Section */}
        <div className="p-5 sm:p-6 bg-white rounded-3xl border border-zinc-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider font-display">
              2. Client / Customer Selection
            </h3>
            <button
              type="button"
              onClick={() => setIsInlineCustomerOpen(!isInlineCustomerOpen)}
              className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isInlineCustomerOpen ? 'Select Existing Client' : 'Add New Client Inline'}</span>
            </button>
          </div>

          {!isInlineCustomerOpen ? (
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5">Select from Studio CRM:</label>
              <select
                value={customerId}
                onChange={e => handleCustomerChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-900 bg-white focus:outline-none min-h-[44px]"
              >
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone}) - {c.city}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3">
              <div className="text-xs font-bold text-zinc-800">Quick Client Registration</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Client Full Name *"
                  value={newCustName}
                  onChange={e => setNewCustName(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs min-h-[44px]"
                />
                <input
                  type="tel"
                  placeholder="Phone Number (e.g. +91 98200 12345) *"
                  value={newCustPhone}
                  onChange={e => setNewCustPhone(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs min-h-[44px]"
                />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={newCustEmail}
                  onChange={e => setNewCustEmail(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs min-h-[44px]"
                />
                <input
                  type="text"
                  placeholder="City (e.g. Mumbai)"
                  value={newCustCity}
                  onChange={e => setNewCustCity(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs min-h-[44px]"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsInlineCustomerOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" variant="primary" size="sm" onClick={handleCreateInlineCustomer}>
                  Save & Select Client
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Schedule & Multi-Day Timing */}
        <div className="p-5 sm:p-6 bg-white rounded-3xl border border-zinc-200/90 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider font-display flex items-center gap-2">
            <Calendar className="w-4 h-4 text-zinc-600" />
            3. Schedule (Multi-Day Shoot Support)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-2">
              <label className="block text-xs font-bold text-zinc-700 uppercase">
                Start Date & Time *
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-3/5 px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-white min-h-[44px]"
                />
                <input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="w-2/5 px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-white min-h-[44px]"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-2">
              <label className="block text-xs font-bold text-zinc-700 uppercase">
                End Date & Time *
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  required
                  value={endDate}
                  min={startDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-3/5 px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-white min-h-[44px]"
                />
                <input
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="w-2/5 px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-white min-h-[44px]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Venue, Full Address & Google Maps */}
        <div className="p-5 sm:p-6 bg-white rounded-3xl border border-zinc-200/90 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider font-display flex items-center gap-2">
            <MapPin className="w-4 h-4 text-zinc-600" />
            4. Location & Venue
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">
                Venue Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Taj Lands End or Morjim Beach Lawn"
                value={venue}
                onChange={e => setVenue(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-white min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">
                City *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Mumbai or Goa"
                value={venueCity}
                onChange={e => setVenueCity(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-white min-h-[44px]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">
              Full Physical Address
            </label>
            <input
              type="text"
              placeholder="Full address with landmark & pincode for crew dispatch"
              value={fullAddress}
              onChange={e => setFullAddress(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-white min-h-[44px]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">
              Google Maps Location Link
            </label>
            <input
              type="url"
              placeholder="https://maps.google.com/?q=..."
              value={googleMapsLocation}
              onChange={e => setGoogleMapsLocation(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-white min-h-[44px]"
            />
          </div>
        </div>

        {/* Crew Assignments */}
        <div className="p-5 sm:p-6 bg-white rounded-3xl border border-zinc-200/90 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider font-display flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-zinc-600" />
            5. Crew Assignments ({assignedTeamIds.length} Assigned)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto p-2 border border-zinc-200 rounded-2xl bg-zinc-50/50">
            {users.map(u => {
              const isChecked = assignedTeamIds.includes(u.id);
              return (
                <label
                  key={u.id}
                  className={`flex items-center gap-3 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    isChecked 
                      ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs' 
                      : 'bg-white text-zinc-800 border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggleCrew(u.id)}
                    className="sr-only"
                  />
                  <img src={u.avatar} alt={u.name} className="w-7 h-7 rounded-full object-cover border border-white" />
                  <div className="min-w-0">
                    <div className="font-bold truncate">{u.name}</div>
                    <div className={`text-xs truncate ${isChecked ? 'text-zinc-300' : 'text-zinc-500'}`}>
                      {u.roleTitle}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Description & Internal Notes */}
        <div className="p-5 sm:p-6 bg-white rounded-3xl border border-zinc-200/90 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider font-display flex items-center gap-2">
            <FileText className="w-4 h-4 text-zinc-600" />
            6. Descriptions & Notes
          </h3>

          <div>
            <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">
              Client Brief / Description
            </label>
            <textarea
              rows={3}
              placeholder="Client's shooting style preference, key moments to capture, mood..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">
              Internal Crew Notes (Confidential)
            </label>
            <textarea
              rows={2}
              placeholder="Call timings, battery logistics, prime lenses needed, catering..."
              value={internalNotes}
              onChange={e => setInternalNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:outline-none bg-amber-50/30"
            />
          </div>
        </div>

        {/* Attachments */}
        <div className="p-5 sm:p-6 bg-white rounded-3xl border border-zinc-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider font-display flex items-center gap-2">
              <Upload className="w-4 h-4 text-zinc-600" />
              7. Attachments ({attachments.length})
            </h3>
            <button
              type="button"
              onClick={() => setShowAttachInput(!showAttachInput)}
              className="text-xs text-blue-600 font-bold hover:underline cursor-pointer"
            >
              + Add Attachment
            </button>
          </div>

          {showAttachInput && (
            <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Document name (e.g. Call Sheet v1)"
                  value={attachName}
                  onChange={e => setAttachName(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-white"
                />
                <input
                  type="url"
                  placeholder="URL (optional)"
                  value={attachUrl}
                  onChange={e => setAttachUrl(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-white"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAttachInput(false)}>Cancel</Button>
                <Button type="button" variant="primary" size="sm" onClick={handleAddAttachment}>Attach</Button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {attachments.map(att => (
              <span key={att.id} className="text-xs px-3 py-1 rounded-xl bg-zinc-100 text-zinc-800 border flex items-center gap-1.5">
                <span>{att.name}</span>
                <button
                  type="button"
                  onClick={() => setAttachments(prev => prev.filter(a => a.id !== att.id))}
                  className="text-zinc-400 hover:text-rose-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Sticky Action Footer */}
        <div className="sticky bottom-0 z-30 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-zinc-200 shadow-xl flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setEventRoute({ mode: 'list' })}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="primary"
            size="md"
          >
            {isEditing ? 'Save Event Changes' : 'Create Shoot Event'}
          </Button>
        </div>
      </form>
    </div>
  );
};
