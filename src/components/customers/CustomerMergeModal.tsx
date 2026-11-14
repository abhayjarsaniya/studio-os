import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Customer } from '../../types';
import { GitMerge, AlertCircle, ShieldAlert, Check } from 'lucide-react';

export const CustomerMergeModal: React.FC = () => {
  const { 
    isMergeModalOpen, 
    setIsMergeModalOpen, 
    mergeModalData,
    mergeCustomers,
    events
  } = useApp();

  if (!isMergeModalOpen || !mergeModalData) return null;

  const { primaryCustomer, secondaryCustomer } = mergeModalData;

  const [selectedName, setSelectedName] = useState<'primary' | 'secondary'>('primary');
  const [selectedPhone, setSelectedPhone] = useState<'primary' | 'secondary'>('primary');
  const [selectedEmail, setSelectedEmail] = useState<'primary' | 'secondary'>('primary');
  const [selectedCity, setSelectedCity] = useState<'primary' | 'secondary'>('primary');
  const [selectedAddress, setSelectedAddress] = useState<'primary' | 'secondary'>('primary');
  const [selectedCompany, setSelectedCompany] = useState<'primary' | 'secondary'>('primary');

  const secondaryEventsCount = events.filter(e => e.customerId === secondaryCustomer.id).length;

  const handleConfirmMerge = () => {
    const resolutions: Partial<Customer> = {
      name: selectedName === 'primary' ? primaryCustomer.name : secondaryCustomer.name,
      phone: selectedPhone === 'primary' ? primaryCustomer.phone : secondaryCustomer.phone,
      alternatePhone: selectedPhone === 'primary' ? secondaryCustomer.phone : primaryCustomer.phone,
      email: selectedEmail === 'primary' ? primaryCustomer.email : secondaryCustomer.email,
      city: selectedCity === 'primary' ? primaryCustomer.city : secondaryCustomer.city,
      address: selectedAddress === 'primary' ? primaryCustomer.address : secondaryCustomer.address,
      companyName: selectedCompany === 'primary' ? primaryCustomer.companyName : secondaryCustomer.companyName
    };

    mergeCustomers(primaryCustomer.id, secondaryCustomer.id, resolutions);
    setIsMergeModalOpen(false);
  };

  return (
    <Modal
      isOpen={isMergeModalOpen}
      onClose={() => setIsMergeModalOpen(false)}
      title="Safe Customer Record Merge"
      subtitle={`Merge secondary record into primary client profile`}
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* Safety Warning */}
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-amber-950">Non-Destructive Merge Architecture</p>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              All <strong>{secondaryEventsCount} linked events</strong>, communication logs, follow-ups, and notes from{' '}
              <span className="font-semibold text-amber-950">"{secondaryCustomer.name}"</span> will be automatically preserved and re-linked to{' '}
              <span className="font-semibold text-amber-950">"{primaryCustomer.name}"</span>. The secondary profile will be archived and marked as merged.
            </p>
          </div>
        </div>

        {/* Field Conflict Resolution Table */}
        <div className="border border-zinc-200 rounded-xl overflow-hidden text-xs">
          <div className="grid grid-cols-12 bg-zinc-100 p-2.5 font-bold text-zinc-700 border-b border-zinc-200">
            <div className="col-span-3">Field</div>
            <div className="col-span-4.5">Keep Primary ({primaryCustomer.name.split(' ')[0]})</div>
            <div className="col-span-4.5">Keep Secondary ({secondaryCustomer.name.split(' ')[0]})</div>
          </div>

          {/* Full Name */}
          <div className="grid grid-cols-12 p-2.5 border-b border-zinc-100 items-center">
            <div className="col-span-3 font-semibold text-zinc-700">Full Name</div>
            <label className="col-span-4.5 flex items-center gap-2 cursor-pointer truncate pr-2">
              <input
                type="radio"
                name="name"
                checked={selectedName === 'primary'}
                onChange={() => setSelectedName('primary')}
                className="text-zinc-900"
              />
              <span className="truncate">{primaryCustomer.name}</span>
            </label>
            <label className="col-span-4.5 flex items-center gap-2 cursor-pointer truncate">
              <input
                type="radio"
                name="name"
                checked={selectedName === 'secondary'}
                onChange={() => setSelectedName('secondary')}
                className="text-zinc-900"
              />
              <span className="truncate">{secondaryCustomer.name}</span>
            </label>
          </div>

          {/* Mobile Number */}
          <div className="grid grid-cols-12 p-2.5 border-b border-zinc-100 items-center">
            <div className="col-span-3 font-semibold text-zinc-700">Primary Mobile</div>
            <label className="col-span-4.5 flex items-center gap-2 cursor-pointer font-mono pr-2">
              <input
                type="radio"
                name="phone"
                checked={selectedPhone === 'primary'}
                onChange={() => setSelectedPhone('primary')}
                className="text-zinc-900"
              />
              <span>{primaryCustomer.phone}</span>
            </label>
            <label className="col-span-4.5 flex items-center gap-2 cursor-pointer font-mono">
              <input
                type="radio"
                name="phone"
                checked={selectedPhone === 'secondary'}
                onChange={() => setSelectedPhone('secondary')}
                className="text-zinc-900"
              />
              <span>{secondaryCustomer.phone}</span>
            </label>
          </div>

          {/* Email */}
          <div className="grid grid-cols-12 p-2.5 border-b border-zinc-100 items-center">
            <div className="col-span-3 font-semibold text-zinc-700">Email</div>
            <label className="col-span-4.5 flex items-center gap-2 cursor-pointer truncate pr-2">
              <input
                type="radio"
                name="email"
                checked={selectedEmail === 'primary'}
                onChange={() => setSelectedEmail('primary')}
                className="text-zinc-900"
              />
              <span className="truncate">{primaryCustomer.email || '(None)'}</span>
            </label>
            <label className="col-span-4.5 flex items-center gap-2 cursor-pointer truncate">
              <input
                type="radio"
                name="email"
                checked={selectedEmail === 'secondary'}
                onChange={() => setSelectedEmail('secondary')}
                className="text-zinc-900"
              />
              <span className="truncate">{secondaryCustomer.email || '(None)'}</span>
            </label>
          </div>

          {/* City */}
          <div className="grid grid-cols-12 p-2.5 border-b border-zinc-100 items-center">
            <div className="col-span-3 font-semibold text-zinc-700">City</div>
            <label className="col-span-4.5 flex items-center gap-2 cursor-pointer pr-2">
              <input
                type="radio"
                name="city"
                checked={selectedCity === 'primary'}
                onChange={() => setSelectedCity('primary')}
                className="text-zinc-900"
              />
              <span>{primaryCustomer.city}</span>
            </label>
            <label className="col-span-4.5 flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="city"
                checked={selectedCity === 'secondary'}
                onChange={() => setSelectedCity('secondary')}
                className="text-zinc-900"
              />
              <span>{secondaryCustomer.city}</span>
            </label>
          </div>

          {/* Company */}
          <div className="grid grid-cols-12 p-2.5 items-center">
            <div className="col-span-3 font-semibold text-zinc-700">Company (if any)</div>
            <label className="col-span-4.5 flex items-center gap-2 cursor-pointer truncate pr-2">
              <input
                type="radio"
                name="company"
                checked={selectedCompany === 'primary'}
                onChange={() => setSelectedCompany('primary')}
                className="text-zinc-900"
              />
              <span className="truncate">{primaryCustomer.companyName || '(Individual)'}</span>
            </label>
            <label className="col-span-4.5 flex items-center gap-2 cursor-pointer truncate">
              <input
                type="radio"
                name="company"
                checked={selectedCompany === 'secondary'}
                onChange={() => setSelectedCompany('secondary')}
                className="text-zinc-900"
              />
              <span className="truncate">{secondaryCustomer.companyName || '(Individual)'}</span>
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-zinc-100 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsMergeModalOpen(false)}
          >
            Cancel
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={<GitMerge className="w-4 h-4" />}
            onClick={handleConfirmMerge}
          >
            Confirm & Merge Records
          </Button>
        </div>
      </div>
    </Modal>
  );
};
