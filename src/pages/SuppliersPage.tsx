import React, { useState, useMemo } from 'react';
import { useStudio } from '../context/StudioContext';
import { useApp } from '../context/AppContext';
import { supplierService } from '../services/supplierService';
import { 
  Supplier, 
  SupplierCategory, 
  SUPPLIER_CATEGORY_LABELS,
  SupplierAssignment,
  SupplierMember
} from '../types';
import { 
  Truck, 
  Search, 
  Filter, 
  Plus, 
  Phone, 
  Mail, 
  MapPin, 
  Star, 
  Layers, 
  CheckCircle, 
  Clock, 
  DollarSign, 
  Eye, 
  X,
  UserCheck,
  ShieldAlert,
  Send
} from 'lucide-react';

export const SuppliersPage: React.FC = () => {
  const { currentStudio } = useStudio();
  const { currentRole } = useApp();

  const studioId = currentStudio.id;
  const isOwner = currentRole === 'owner';
  const canSeeFinances = isOwner || (currentRole as string) === 'accountant';

  const [activeTab, setActiveTab] = useState<'directory' | 'assignments'>('directory');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedSupplierForDetail, setSelectedSupplierForDetail] = useState<Supplier | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // New Supplier Form State
  const [formData, setFormData] = useState({
    businessName: '',
    contactPerson: '',
    category: 'drone_pilots' as SupplierCategory,
    phone: '',
    email: '',
    gstin: '',
    city: currentStudio.city || 'Ahmedabad',
    address: '',
    baseDayRate: 10000,
    paymentTerms: '50% Advance, 50% Post Delivery',
    notes: ''
  });

  // Load suppliers and assignments
  const suppliers = useMemo(() => {
    return supplierService.listSuppliers(studioId, {
      search: searchTerm.trim() || undefined,
      category: selectedCategory !== 'all' ? (selectedCategory as SupplierCategory) : undefined
    });
  }, [studioId, searchTerm, selectedCategory, refreshTrigger]);

  const assignments = useMemo(() => {
    return supplierService.getAssignmentsForUser(studioId, currentRole, {
      category: selectedCategory !== 'all' ? (selectedCategory as SupplierCategory) : undefined
    });
  }, [studioId, currentRole, selectedCategory, refreshTrigger]);

  const handleCreateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.businessName.trim() || !formData.contactPerson.trim() || !formData.phone.trim()) {
      alert('Please fill in required supplier fields.');
      return;
    }

    const newSup = supplierService.createSupplier(studioId, {
      businessName: formData.businessName.trim(),
      contactPerson: formData.contactPerson.trim(),
      category: formData.category,
      phone: formData.phone.trim(),
      email: formData.email.trim() || undefined,
      gstin: formData.gstin.trim() || undefined,
      city: formData.city.trim(),
      address: formData.address.trim() || undefined,
      baseDayRate: Number(formData.baseDayRate) || 0,
      paymentTerms: formData.paymentTerms.trim() || undefined,
      notes: formData.notes.trim() || undefined,
      rating: 5,
      isActive: true,
      hasPortalAccess: true
    });

    // Also add lead contact person as a roster member
    supplierService.addSupplierMember(studioId, {
      supplierId: newSup.id,
      name: formData.contactPerson.trim(),
      phone: formData.phone.trim(),
      roleTitle: SUPPLIER_CATEGORY_LABELS[formData.category],
      isAvailable: true
    });

    setIsAddModalOpen(false);
    setFormData({
      businessName: '',
      contactPerson: '',
      category: 'drone_pilots',
      phone: '',
      email: '',
      gstin: '',
      city: currentStudio.city || 'Ahmedabad',
      address: '',
      baseDayRate: 10000,
      paymentTerms: '50% Advance, 50% Post Delivery',
      notes: ''
    });
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="w-full space-y-4 sm:space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Truck className="w-7 h-7 text-indigo-600" />
            External Suppliers & Specialized Crew
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage 17 external supplier categories: Drone Pilots, LED Walls, Audio Engineers, Frame Manufacturers, Album Printers and Rental Houses.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              onClick={() => setActiveTab('directory')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'directory' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Directory ({suppliers.length})
            </button>
            <button
              onClick={() => setActiveTab('assignments')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'assignments' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Active Assignments ({assignments.length})
            </button>
          </div>

          {isOwner && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm inline-flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Supplier
            </button>
          )}
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search suppliers by business name, contact person, or phone..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="w-full sm:w-auto text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white max-w-xs"
          >
            <option value="all">All 17 Supplier Categories</option>
            {Object.entries(SUPPLIER_CATEGORY_LABELS).map(([catKey, label]) => (
              <option key={catKey} value={catKey}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tab 1: Supplier Directory */}
      {activeTab === 'directory' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map(sup => (
            <div 
              key={sup.id} 
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm leading-tight">{sup.businessName}</h3>
                    <p className="text-xs font-semibold text-indigo-600 mt-0.5">
                      {SUPPLIER_CATEGORY_LABELS[sup.category] || sup.category}
                    </p>
                  </div>
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-xs font-bold">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    {sup.rating.toFixed(1)}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-slate-600 pt-1">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-medium text-slate-800">{sup.contactPerson}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{sup.phone}</span>
                  </div>
                  {sup.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{sup.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{sup.city}</span>
                  </div>
                </div>
              </div>

              {/* Footer / Rates (Protected) */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-xs text-slate-400 block uppercase font-bold">Base Day Rate</span>
                  <span className="font-bold text-slate-900">
                    {canSeeFinances ? `₹${sup.baseDayRate.toLocaleString()}` : '[Owner Confidential]'}
                  </span>
                </div>

                <button
                  onClick={() => setSelectedSupplierForDetail(sup)}
                  className="px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors"
                >
                  View Details
                </button>
              </div>
            </div>
          ))}

          {suppliers.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              No suppliers found for the selected category. Click &quot;Add Supplier&quot; to register a partner.
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Active Assignments */}
      {activeTab === 'assignments' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Supplier & Category</th>
                  <th className="px-4 py-3">Event & Sub-Event</th>
                  <th className="px-4 py-3">Call Time & Venue</th>
                  <th className="px-4 py-3">Status</th>
                  {canSeeFinances && <th className="px-4 py-3 text-right">Agreed Fee</th>}
                  {canSeeFinances && <th className="px-4 py-3 text-right">Payment</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assignments.map(asgn => (
                  <tr key={asgn.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900">{asgn.supplierName}</div>
                      <div className="text-xs text-indigo-600 font-medium">
                        {SUPPLIER_CATEGORY_LABELS[asgn.category] || asgn.category}
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-800">{asgn.eventTitle}</div>
                      <div className="text-xs text-slate-500">{asgn.subEventTitle || 'Full Day Assignment'}</div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-medium text-slate-800 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {asgn.date} • {asgn.callTime}
                      </div>
                      <div className="text-xs text-slate-500 truncate max-w-xs">{asgn.venue}</div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-blue-50 text-blue-700">
                        {asgn.status}
                      </span>
                    </td>

                    {canSeeFinances && (
                      <td className="px-4 py-3.5 text-right font-bold text-slate-900">
                        ₹{asgn.agreedFee.toLocaleString()}
                      </td>
                    )}

                    {canSeeFinances && (
                      <td className="px-4 py-3.5 text-right">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                          asgn.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {asgn.paymentStatus}
                        </span>
                      </td>
                    )}
                  </tr>
                ))}
                {assignments.length === 0 && (
                  <tr>
                    <td colSpan={canSeeFinances ? 6 : 4} className="text-center py-12 text-slate-400">
                      No supplier assignments active currently.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Truck className="w-5 h-5 text-indigo-600" />
                Register New External Supplier
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Business / Firm Name *</label>
                <input
                  type="text"
                  required
                  value={formData.businessName}
                  onChange={e => setFormData({ ...formData, businessName: e.target.value })}
                  placeholder="e.g. Skyline Aerial Cine Drones"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Contact Person *</label>
                  <input
                    type="text"
                    required
                    value={formData.contactPerson}
                    onChange={e => setFormData({ ...formData, contactPerson: e.target.value })}
                    placeholder="e.g. Ramesh Patel"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Specialization Category *</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value as SupplierCategory })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                  >
                    {Object.entries(SUPPLIER_CATEGORY_LABELS).map(([catKey, label]) => (
                      <option key={catKey} value={catKey}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98250 12345"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="partner@skyline.in"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Base Day Rate (₹) *</label>
                  <input
                    type="number"
                    required
                    value={formData.baseDayRate}
                    onChange={e => setFormData({ ...formData, baseDayRate: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Payment Terms</label>
                <input
                  type="text"
                  value={formData.paymentTerms}
                  onChange={e => setFormData({ ...formData, paymentTerms: e.target.value })}
                  placeholder="e.g. 50% Advance, 50% on Handover"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl shadow-xs"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supplier Detail Modal */}
      {selectedSupplierForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">{selectedSupplierForDetail.businessName}</h3>
                <p className="text-xs text-indigo-600">{SUPPLIER_CATEGORY_LABELS[selectedSupplierForDetail.category]}</p>
              </div>
              <button onClick={() => setSelectedSupplierForDetail(null)} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 grid grid-cols-2 gap-2">
                <div>
                  <span className="text-xs text-slate-400 font-bold uppercase block">Contact Person</span>
                  <span className="font-semibold text-slate-800">{selectedSupplierForDetail.contactPerson}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-bold uppercase block">Phone</span>
                  <span className="font-semibold text-slate-800">{selectedSupplierForDetail.phone}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-bold uppercase block">Base Day Rate</span>
                  <span className="font-semibold text-slate-800">
                    {canSeeFinances ? `₹${selectedSupplierForDetail.baseDayRate.toLocaleString()}` : '[Restricted]'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-bold uppercase block">City</span>
                  <span className="font-semibold text-slate-800">{selectedSupplierForDetail.city}</span>
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-400 font-bold uppercase block mb-1">Payment Terms</span>
                <p className="text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {selectedSupplierForDetail.paymentTerms || 'Standard studio invoicing terms'}
                </p>
              </div>

              <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs text-indigo-900">
                🔒 <strong>Privacy Protection Active:</strong> External suppliers with portal access only view their assigned call times, venues, and shooting requirements. Customer personal phone numbers and studio billing margins are strictly shielded.
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedSupplierForDetail(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
