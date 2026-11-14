import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Customer, CustomerStatus } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { customerService, normalizePhoneNumber } from '../../services/customerService';
import { AlertTriangle, ExternalLink, ShieldAlert, Sparkles, UserCheck } from 'lucide-react';

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerToEdit?: Customer | null;
}

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  isOpen,
  onClose,
  customerToEdit
}) => {
  const { createCustomer, updateCustomer, employees, setSelectedCustomerId } = useApp();

  const isEditing = !!customerToEdit;

  // Basic Info
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('Mumbai');
  const [state, setState] = useState('Maharashtra');
  const [postalCode, setPostalCode] = useState('');
  const [address, setAddress] = useState('');

  // CRM & Dates
  const [dob, setDob] = useState('');
  const [anniversaryDate, setAnniversaryDate] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyGst, setCompanyGst] = useState('');
  const [customerSource, setCustomerSource] = useState('Walk-in');
  const [status, setStatus] = useState<CustomerStatus>('Active');
  const [assignedManagerId, setAssignedManagerId] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [notes, setNotes] = useState('');

  // Duplicate Warning State
  const [overrideDuplicate, setOverrideDuplicate] = useState(false);

  useEffect(() => {
    if (customerToEdit) {
      setName(customerToEdit.name);
      setPhone(customerToEdit.phone);
      setAlternatePhone(customerToEdit.alternatePhone || '');
      setEmail(customerToEdit.email || '');
      setCity(customerToEdit.city);
      setState(customerToEdit.state || 'Maharashtra');
      setPostalCode(customerToEdit.postalCode || '');
      setAddress(customerToEdit.address || '');
      setDob(customerToEdit.dob || '');
      setAnniversaryDate(customerToEdit.anniversaryDate || '');
      setCompanyName(customerToEdit.companyName || '');
      setCompanyGst(customerToEdit.companyGst || '');
      setCustomerSource(customerToEdit.customerSource || 'Walk-in');
      setStatus(customerToEdit.status || 'Active');
      setAssignedManagerId(customerToEdit.assignedManagerId || '');
      setTagsInput((customerToEdit.tags || []).join(', '));
      setNotes(customerToEdit.notes || '');
      setOverrideDuplicate(false);
    } else {
      setName('');
      setPhone('+91 ');
      setAlternatePhone('');
      setEmail('');
      setCity('Mumbai');
      setState('Maharashtra');
      setPostalCode('');
      setAddress('');
      setDob('');
      setAnniversaryDate('');
      setCompanyName('');
      setCompanyGst('');
      setCustomerSource('Walk-in');
      setStatus('Active');
      setAssignedManagerId('');
      setTagsInput('Wedding, VIP');
      setNotes('');
      setOverrideDuplicate(false);
    }
  }, [customerToEdit, isOpen]);

  // Live duplicate detection
  const duplicateResult = useMemo(() => {
    if (!isOpen || isEditing || phone.trim().length < 8) {
      return { hasDuplicate: false, duplicates: [], reasons: [] };
    }
    try {
      return customerService.detectDuplicates('studio_royal_001', phone, email);
    } catch {
      return { hasDuplicate: false, duplicates: [], reasons: [] };
    }
  }, [phone, email, isOpen, isEditing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      alert('Please fill in customer full name and primary mobile number.');
      return;
    }

    const normPhone = normalizePhoneNumber(phone);
    if (!normPhone.isValid) {
      alert(`Invalid phone number: "${phone}". Please enter a 10 to 15-digit number.`);
      return;
    }

    if (duplicateResult.hasDuplicate && !overrideDuplicate && !isEditing) {
      alert('Potential duplicate detected. Review the duplicate record or click "Proceed Anyway".');
      return;
    }

    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const manager = employees.find(e => e.id === assignedManagerId);

    if (isEditing && customerToEdit) {
      updateCustomer(customerToEdit.id, {
        name,
        phone,
        alternatePhone: alternatePhone.trim() || undefined,
        email: email.trim() || undefined,
        city,
        state,
        postalCode: postalCode.trim() || undefined,
        address: address.trim() || undefined,
        dob: dob || undefined,
        anniversaryDate: anniversaryDate || undefined,
        companyName: companyName.trim() || undefined,
        companyGst: companyGst.trim() || undefined,
        customerSource,
        status,
        assignedManagerId: manager?.id,
        assignedManagerName: manager?.fullName,
        tags,
        notes
      });
    } else {
      createCustomer({
        name,
        phone,
        alternatePhone: alternatePhone.trim() || undefined,
        email: email.trim() || `${name.toLowerCase().replace(/\s+/g, '')}@example.com`,
        city,
        state,
        postalCode: postalCode.trim() || undefined,
        address: address.trim() || undefined,
        dob: dob || undefined,
        anniversaryDate: anniversaryDate || undefined,
        companyName: companyName.trim() || undefined,
        companyGst: companyGst.trim() || undefined,
        customerSource,
        status,
        assignedManagerId: manager?.id,
        assignedManagerName: manager?.fullName,
        tags,
        notes,
        allowDuplicate: overrideDuplicate
      });
    }

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Customer Profile' : 'Add New Customer'}
      subtitle={isEditing ? `Updating ${customerToEdit?.name}` : 'Create a client record with duplicate verification & WhatsApp click-to-chat setup'}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Live Duplicate Warning Banner */}
        {duplicateResult.hasDuplicate && !isEditing && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-rose-950">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Potential Duplicate Client Detected!</span>
            </div>
            <p className="text-[11px] text-rose-800">
              An existing record with matching contact details already exists:{' '}
              <strong>"{duplicateResult.duplicates[0]?.name}"</strong> ({duplicateResult.duplicates[0]?.phone}).
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setSelectedCustomerId(duplicateResult.duplicates[0].id);
                  onClose();
                }}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs flex items-center gap-1 cursor-pointer"
              >
                <span>Open Existing Profile</span>
                <ExternalLink className="w-3 h-3" />
              </button>

              <button
                type="button"
                onClick={() => setOverrideDuplicate(true)}
                className="px-3 py-1.5 rounded-lg border border-rose-300 bg-white hover:bg-rose-50 text-rose-800 font-semibold text-xs cursor-pointer"
              >
                Proceed as Separate Customer
              </button>
            </div>
          </div>
        )}

        {/* Section 1: Contact & Identity */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
            Primary Client Details
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-700">Full Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Radhika Merchant & Anant Ambani"
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 min-h-[44px]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-700">Mobile Number (WhatsApp) *</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+91 98200 12345"
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs text-zinc-900 font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900/10 min-h-[44px]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-700">Alternate Phone</label>
              <input
                type="tel"
                value={alternatePhone}
                onChange={e => setAlternatePhone(e.target.value)}
                placeholder="Spouse / Parent / Secondary"
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs text-zinc-900 font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900/10 min-h-[44px]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-700">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="radhika@example.com"
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 min-h-[44px]"
              />
            </div>
          </div>
        </div>

        {/* Section 2: CRM Status & Management */}
        <div className="space-y-3 pt-2 border-t border-zinc-100">
          <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
            CRM Status & Assignment
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-700">Customer Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as CustomerStatus)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 min-h-[44px]"
              >
                <option value="New Inquiry">New Inquiry</option>
                <option value="Contacted">Contacted</option>
                <option value="Follow-up Required">Follow-up Required</option>
                <option value="Quotation Sent">Quotation Sent</option>
                <option value="Negotiation">Negotiation</option>
                <option value="Booked">Booked</option>
                <option value="Active">Active</option>
                <option value="Completed">Completed</option>
                <option value="Lost">Lost</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-700">Inquiry / Lead Source</label>
              <select
                value={customerSource}
                onChange={e => setCustomerSource(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 min-h-[44px]"
              >
                <option value="Instagram">Instagram</option>
                <option value="Referral">Word of Mouth / Referral</option>
                <option value="Google">Google Search</option>
                <option value="Walk-in">Studio Walk-in</option>
                <option value="Wedding Wire">WedMeGood / WeddingWire</option>
                <option value="Facebook">Facebook</option>
                <option value="Other">Other Channel</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-700">Relationship Manager</label>
              <select
                value={assignedManagerId}
                onChange={e => setAssignedManagerId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 min-h-[44px]"
              >
                <option value="">Unassigned</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName} ({emp.designation})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Important Dates & Corporate Info */}
        <div className="space-y-3 pt-2 border-t border-zinc-100">
          <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
            Celebration Dates & Corporate Info (Optional)
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-700">Anniversary</label>
              <input
                type="date"
                value={anniversaryDate}
                onChange={e => setAnniversaryDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs text-zinc-900 focus:outline-none min-h-[44px]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-700">Date of Birth</label>
              <input
                type="date"
                value={dob}
                onChange={e => setDob(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs text-zinc-900 focus:outline-none min-h-[44px]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-700">Company Name</label>
              <input
                type="text"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="For corporate billing"
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs text-zinc-900 focus:outline-none min-h-[44px]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-700">Company GSTIN</label>
              <input
                type="text"
                value={companyGst}
                onChange={e => setCompanyGst(e.target.value)}
                placeholder="27ABCDE1234F1Z5"
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs text-zinc-900 font-mono focus:outline-none min-h-[44px]"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Address, Tags & Notes */}
        <div className="space-y-3 pt-2 border-t border-zinc-100">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-700">City</label>
              <input
                type="text"
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="Mumbai"
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs text-zinc-900 focus:outline-none min-h-[44px]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-700">State</label>
              <input
                type="text"
                value={state}
                onChange={e => setState(e.target.value)}
                placeholder="Maharashtra"
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs text-zinc-900 focus:outline-none min-h-[44px]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-700">Tags (comma-separated)</label>
              <input
                type="text"
                value={tagsInput}
                onChange={e => setTagsInput(e.target.value)}
                placeholder="VIP, Luxury, Wedding"
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs text-zinc-900 focus:outline-none min-h-[44px]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-700">Internal Notes & Client Brief</label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Important preferences, referral backstory, expectations..."
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs text-zinc-900 focus:outline-none resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-zinc-100 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="primary"
            size="sm"
          >
            {isEditing ? 'Save Changes' : 'Create Customer Record'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
