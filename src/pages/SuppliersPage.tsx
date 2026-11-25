import React, { useEffect, useMemo, useState } from 'react';
import { useStudio } from '../context/StudioContext';
import { useApp } from '../context/AppContext';
import { liveSupplierService, LiveSupplierRecord } from '../services/liveSupplierService';
import { SupplierCategory, SUPPLIER_CATEGORY_LABELS, SupplierCategoryEnum } from '../types/schema';
import {
  Truck,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  Edit3,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Power
} from 'lucide-react';

const SUPPLIER_CATEGORIES: SupplierCategory[] = SupplierCategoryEnum.options;

export const SuppliersPage: React.FC = () => {
  const { currentStudio } = useStudio();
  const { currentUser, currentRole, can } = useApp();

  const studioId = currentStudio.id;
  const studioName = currentStudio.name || studioId;
  const actingUser = currentUser?.name || 'Studio Owner';

  const canCreate = can('suppliers_vendors' as any, 'create');
  const canEdit = can('suppliers_vendors' as any, 'edit');
  const canDelete = can('suppliers_vendors' as any, 'delete');
  const canViewFin = can('suppliers_vendors' as any, 'view_financials' as any);

  const [suppliers, setSuppliers] = useState<LiveSupplierRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<LiveSupplierRecord | null>(null);
  const [deletingSupplier, setDeletingSupplier] = useState<LiveSupplierRecord | null>(null);

  const [formData, setFormData] = useState({
    businessName: '',
    contactPerson: '',
    category: 'drone_pilots' as SupplierCategory,
    phone: '',
    email: '',
    city: currentStudio.city || '',
    address: '',
    services: '',
    baseDayRate: 6500,
    notes: ''
  });

  useEffect(() => {
    if (!studioId) return;
    setLoading(true);
    const unsub = liveSupplierService.subscribeStudioSuppliers(
      studioId,
      (list) => {
        setSuppliers(list);
        setLoading(false);
      },
      (err) => {
        setStatusMessage(err?.message || 'Failed to sync suppliers.');
        setSaveState('error');
        setLoading(false);
      }
    );
    return () => unsub();
  }, [studioId]);

  const filteredSuppliers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return suppliers.filter((s) => {
      if (selectedCategory !== 'all' && s.category !== selectedCategory) return false;
      if (q) {
        return (
          s.businessName.toLowerCase().includes(q) ||
          s.contactPerson.toLowerCase().includes(q) ||
          s.city.toLowerCase().includes(q) ||
          s.phone.includes(q)
        );
      }
      return true;
    });
  }, [suppliers, selectedCategory, searchTerm]);

  const handleOpenAdd = () => {
    setFormData({
      businessName: '',
      contactPerson: '',
      category: 'drone_pilots',
      phone: '',
      email: '',
      city: currentStudio.city || '',
      address: '',
      services: '',
      baseDayRate: 6500,
      notes: ''
    });
    setIsAddOpen(true);
  };

  const handleOpenEdit = (s: LiveSupplierRecord) => {
    setEditingSupplier(s);
    setFormData({
      businessName: s.businessName,
      contactPerson: s.contactPerson,
      category: s.category,
      phone: s.phone,
      email: s.email || '',
      city: s.city || '',
      address: s.address || '',
      services: s.services || '',
      baseDayRate: s.baseDayRate || 0,
      notes: s.notes || ''
    });
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveState('saving');
    try {
      await liveSupplierService.createSupplier({
        studioId,
        studioName,
        businessName: formData.businessName,
        category: formData.category,
        contactPerson: formData.contactPerson,
        phone: formData.phone,
        email: formData.email,
        city: formData.city,
        address: formData.address,
        services: formData.services,
        baseDayRate: formData.baseDayRate,
        notes: formData.notes,
        actingUser,
        actingRole: currentRole
      });
      setSaveState('saved');
      setStatusMessage(`Supplier "${formData.businessName}" saved.`);
      setIsAddOpen(false);
    } catch (err: any) {
      setSaveState('error');
      setStatusMessage(err?.message || 'Failed to add supplier.');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier) return;
    setSaveState('saving');
    try {
      await liveSupplierService.updateSupplier({
        studioId,
        supplierId: editingSupplier.id,
        updates: {
          businessName: formData.businessName.trim(),
          category: formData.category,
          contactPerson: formData.contactPerson.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          city: formData.city.trim(),
          address: formData.address.trim(),
          services: formData.services.trim(),
          baseDayRate: Number(formData.baseDayRate) || 0,
          notes: formData.notes.trim()
        },
        actingUser,
        actingRole: currentRole
      });
      setSaveState('saved');
      setStatusMessage(`Supplier "${formData.businessName}" updated.`);
      setEditingSupplier(null);
    } catch (err: any) {
      setSaveState('error');
      setStatusMessage(err?.message || 'Failed to update supplier.');
    }
  };

  const handleToggleActive = async (s: LiveSupplierRecord) => {
    setSaveState('saving');
    try {
      await liveSupplierService.updateSupplier({
        studioId,
        supplierId: s.id,
        updates: { isActive: !s.isActive },
        actingUser,
        actingRole: currentRole
      });
      setSaveState('saved');
    } catch (err: any) {
      setSaveState('error');
      setStatusMessage(err?.message || 'Failed to update supplier status.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingSupplier) return;
    setSaveState('saving');
    try {
      const res = await liveSupplierService.deleteOrArchiveSupplier({
        studioId,
        supplierId: deletingSupplier.id,
        actingUser,
        actingRole: currentRole
      });
      setSaveState('saved');
      setStatusMessage(
        res.archived
          ? `Archived "${deletingSupplier.businessName}" to preserve booking history.`
          : `Deleted "${deletingSupplier.businessName}".`
      );
      setDeletingSupplier(null);
    } catch (err: any) {
      setSaveState('error');
      setStatusMessage(err?.message || 'Failed to delete supplier.');
    }
  };

  return (
    <div className="w-full space-y-5 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 font-display tracking-tight flex items-center gap-2">
            <Truck className="w-6 h-6 text-orange-500" />
            <span>Suppliers & Vendors</span>
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">Live studio supplier directory synced with Firebase</p>
        </div>

        {canCreate && (
          <button
            onClick={handleOpenAdd}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add Supplier
          </button>
        )}
      </div>

      {/* Autosave status */}
      {(statusMessage || saveState !== 'idle') && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 border ${
            saveState === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {saveState === 'saving' && <Loader2 className="w-4 h-4 animate-spin text-amber-600" />}
            {saveState === 'saved' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            {saveState === 'error' && <AlertCircle className="w-4 h-4 text-rose-600" />}
            <span>{statusMessage || (saveState === 'saving' ? 'Saving...' : 'Saved')}</span>
          </div>
          {statusMessage && (
            <button onClick={() => setStatusMessage(null)} className="font-bold">
              ✕
            </button>
          )}
        </div>
      )}

      {/* Search & Category */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-3.5 flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search supplier, contact, city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm min-h-[42px]"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 min-h-[42px]"
        >
          <option value="all">All Categories</option>
          {SUPPLIER_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {SUPPLIER_CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="py-16 flex items-center justify-center gap-2 text-zinc-500 text-sm bg-white border border-zinc-200 rounded-2xl">
          <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
          <span>Loading suppliers...</span>
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="py-16 text-center bg-white border border-zinc-200 rounded-2xl space-y-3">
          <Truck className="w-10 h-10 text-zinc-300 mx-auto" />
          <p className="text-sm font-bold text-zinc-800">No suppliers added yet.</p>
          {canCreate && (
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 rounded-xl bg-orange-500 text-white text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add Supplier
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredSuppliers.map((s) => (
            <div key={s.id} className="bg-white border border-zinc-200 rounded-2xl p-4 space-y-3 shadow-2xs">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-black text-zinc-900">{s.businessName}</div>
                  <div className="text-xs text-zinc-500">{SUPPLIER_CATEGORY_LABELS[s.category] || s.category}</div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    s.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-600'
                  }`}
                >
                  {s.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="space-y-1 text-xs text-zinc-600">
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-zinc-400" /> {s.contactPerson} · {s.phone}
                </div>
                {s.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-zinc-400" /> {s.email}
                  </div>
                )}
                {s.city && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-zinc-400" /> {s.city}
                  </div>
                )}
              </div>

              {canViewFin && (
                <div className="text-xs font-bold text-zinc-900 pt-1 border-t border-zinc-100">
                  Base Rate: ₹{(s.baseDayRate || 0).toLocaleString('en-IN')} / day
                </div>
              )}

              {(canEdit || canDelete) && (
                <div className="flex items-center justify-end gap-1.5 pt-1">
                  {canEdit && (
                    <>
                      <button
                        onClick={() => handleOpenEdit(s)}
                        className="min-h-[38px] px-2.5 py-1 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50 inline-flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => handleToggleActive(s)}
                        className="min-h-[38px] p-2 rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                        title={s.isActive ? 'Deactivate' : 'Activate'}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => setDeletingSupplier(s)}
                      className="min-h-[38px] p-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {(isAddOpen || editingSupplier) && (
        <div className="fixed inset-0 z-50 bg-zinc-950/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={editingSupplier ? handleEditSubmit : handleCreateSubmit}
            className="w-full max-w-lg bg-white border border-zinc-200 rounded-3xl p-6 shadow-2xl space-y-4 my-8"
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
              <h3 className="text-base font-black text-zinc-900">
                {editingSupplier ? 'Edit Supplier' : 'Add Supplier'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsAddOpen(false);
                  setEditingSupplier(null);
                }}
                className="p-1 text-zinc-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Business Name</label>
                <input
                  type="text"
                  required
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as SupplierCategory })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-sm"
                >
                  {SUPPLIER_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {SUPPLIER_CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Contact Person</label>
                <input
                  type="text"
                  required
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Phone</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Base Day Rate (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={formData.baseDayRate}
                  onChange={(e) => setFormData({ ...formData, baseDayRate: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Services</label>
                <input
                  type="text"
                  value={formData.services}
                  onChange={(e) => setFormData({ ...formData, services: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-zinc-700 mb-1">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-zinc-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsAddOpen(false);
                  setEditingSupplier(null);
                }}
                className="px-4 py-2 rounded-xl bg-zinc-100 text-zinc-800 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saveState === 'saving'}
                className="px-4 py-2 rounded-xl bg-orange-500 text-white text-xs font-bold disabled:opacity-50"
              >
                {saveState === 'saving' ? 'Saving...' : 'Save Supplier'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation */}
      {deletingSupplier && (
        <div className="fixed inset-0 z-50 bg-zinc-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-zinc-200 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-zinc-900">Delete Supplier?</h3>
            <p className="text-xs text-zinc-600">
              Remove <strong>{deletingSupplier.businessName}</strong>? If referenced by existing bookings, it will be
              archived safely.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeletingSupplier(null)}
                className="px-4 py-2 rounded-xl bg-zinc-100 text-zinc-800 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-black"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
