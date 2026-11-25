import React, { useEffect, useMemo, useState } from 'react';
import { useMasterAdmin } from '../../context/MasterAdminContext';
import { liveSupplierService, LiveSupplierRecord } from '../../services/liveSupplierService';
import { masterExportService, ExportColumn } from '../../services/masterExportService';
import { SupplierCategory, SUPPLIER_CATEGORY_LABELS, SupplierCategoryEnum } from '../../types/schema';
import {
  Truck,
  Search,
  Download,
  FileText,
  Plus,
  Trash2,
  Edit3,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  Power
} from 'lucide-react';

const SUPPLIER_CATEGORIES: SupplierCategory[] = SupplierCategoryEnum.options;

export const MasterSuppliersPage: React.FC = () => {
  const { currentAdmin } = useMasterAdmin();
  const actingUser = currentAdmin?.email || 'jarsaniya.abhay@gmail.com';

  const [suppliers, setSuppliers] = useState<LiveSupplierRecord[]>([]);
  const [studios, setStudios] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudio, setSelectedStudio] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<LiveSupplierRecord | null>(null);
  const [detailSupplier, setDetailSupplier] = useState<LiveSupplierRecord | null>(null);
  const [deletingSupplier, setDeletingSupplier] = useState<LiveSupplierRecord | null>(null);

  const [formData, setFormData] = useState({
    studioId: '',
    businessName: '',
    category: 'cinematic_videographers' as SupplierCategory,
    contactPerson: '',
    phone: '',
    email: '',
    city: '',
    address: '',
    services: '',
    baseDayRate: 6500,
    isActive: true,
    notes: ''
  });

  useEffect(() => {
    setLoading(true);
    const unsub = liveSupplierService.subscribeAllStudiosSuppliers(
      (list, stList) => {
        setSuppliers(list);
        setStudios(stList);
        setLoading(false);
      },
      (err) => {
        setStatusMessage(err?.message || 'Failed to sync suppliers from Firebase.');
        setSaveState('error');
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const filteredSuppliers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return suppliers.filter((s) => {
      if (selectedStudio !== 'all' && s.studioId !== selectedStudio) return false;
      if (selectedCategory !== 'all' && s.category !== selectedCategory) return false;
      if (selectedStatus === 'active' && !s.isActive) return false;
      if (selectedStatus === 'inactive' && s.isActive) return false;
      if (q) {
        return (
          s.businessName.toLowerCase().includes(q) ||
          s.contactPerson.toLowerCase().includes(q) ||
          s.city.toLowerCase().includes(q) ||
          s.phone.includes(q) ||
          s.studioName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [suppliers, selectedStudio, selectedCategory, selectedStatus, searchTerm]);

  const kpis = useMemo(() => {
    const total = filteredSuppliers.length;
    const active = filteredSuppliers.filter((s) => s.isActive).length;
    const avgRate = total
      ? Math.round(filteredSuppliers.reduce((sum, s) => sum + (s.baseDayRate || 0), 0) / total)
      : 0;
    return { total, active, avgRate };
  }, [filteredSuppliers]);

  const handleOpenAdd = () => {
    setFormData({
      studioId: selectedStudio !== 'all' ? selectedStudio : studios[0]?.id || '',
      businessName: '',
      category: 'cinematic_videographers',
      contactPerson: '',
      phone: '',
      email: '',
      city: '',
      address: '',
      services: '',
      baseDayRate: 6500,
      isActive: true,
      notes: ''
    });
    setIsAddOpen(true);
  };

  const handleOpenEdit = (s: LiveSupplierRecord) => {
    setEditingSupplier(s);
    setFormData({
      studioId: s.studioId,
      businessName: s.businessName,
      category: s.category,
      contactPerson: s.contactPerson,
      phone: s.phone,
      email: s.email || '',
      city: s.city || '',
      address: s.address || '',
      services: s.services || '',
      baseDayRate: s.baseDayRate || 0,
      isActive: s.isActive,
      notes: s.notes || ''
    });
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const st = studios.find((s) => s.id === formData.studioId);
    if (!st) {
      setStatusMessage('Please select a studio.');
      setSaveState('error');
      return;
    }

    setSaveState('saving');
    try {
      await liveSupplierService.createSupplier({
        studioId: st.id,
        studioName: st.name,
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
        isActive: formData.isActive,
        actingUser,
        actingRole: 'MASTER_ADMIN'
      });
      setSaveState('saved');
      setStatusMessage(`Supplier "${formData.businessName}" added to ${st.name}.`);
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
        studioId: editingSupplier.studioId,
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
          isActive: formData.isActive,
          notes: formData.notes.trim()
        },
        actingUser,
        actingRole: 'MASTER_ADMIN'
      });
      setSaveState('saved');
      setStatusMessage(`Updated supplier "${formData.businessName}".`);
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
        studioId: s.studioId,
        supplierId: s.id,
        updates: { isActive: !s.isActive },
        actingUser,
        actingRole: 'MASTER_ADMIN'
      });
      setSaveState('saved');
      setStatusMessage(`Supplier "${s.businessName}" ${!s.isActive ? 'activated' : 'deactivated'}.`);
    } catch (err: any) {
      setSaveState('error');
      setStatusMessage(err?.message || 'Failed to update status.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingSupplier) return;
    setSaveState('saving');
    try {
      const res = await liveSupplierService.deleteOrArchiveSupplier({
        studioId: deletingSupplier.studioId,
        supplierId: deletingSupplier.id,
        actingUser,
        actingRole: 'MASTER_ADMIN'
      });
      setSaveState('saved');
      setStatusMessage(
        res.archived
          ? `Archived "${deletingSupplier.businessName}" to preserve existing booking references.`
          : `Deleted supplier "${deletingSupplier.businessName}".`
      );
      setDeletingSupplier(null);
    } catch (err: any) {
      setSaveState('error');
      setStatusMessage(err?.message || 'Failed to delete supplier.');
    }
  };

  const exportColumns: ExportColumn[] = [
    { label: 'Business Name', key: 'businessName', format: 'text' },
    { label: 'Studio', key: 'studioName', format: 'text' },
    { label: 'Category', key: 'category', format: 'text' },
    { label: 'Contact Person', key: 'contactPerson', format: 'text' },
    { label: 'Phone', key: 'phone', format: 'text' },
    { label: 'City', key: 'city', format: 'text' },
    { label: 'Base Day Rate', key: 'baseDayRate', format: 'currency', align: 'right' },
    { label: 'Status', key: 'statusLabel', format: 'text' }
  ];

  const exportRows = useMemo(
    () =>
      filteredSuppliers.map((s) => ({
        ...s,
        statusLabel: s.isActive ? 'Active' : 'Inactive'
      })),
    [filteredSuppliers]
  );

  return (
    <div className="space-y-5 pb-20 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
            Live Firebase Supplier Directory
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 font-display tracking-tight mt-0.5">
            Supplier Administration
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() =>
              masterExportService.exportToExcel({
                filename: 'master_suppliers',
                title: 'Studio OS — Master Suppliers Directory',
                columns: exportColumns,
                rows: exportRows
              })
            }
            disabled={filteredSuppliers.length === 0}
            className="min-h-[42px] px-3.5 py-2 rounded-xl bg-white border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50 inline-flex items-center gap-1.5 disabled:opacity-40"
          >
            <Download className="w-4 h-4" /> Excel
          </button>
          <button
            onClick={() =>
              masterExportService.exportToPDF({
                filename: 'master_suppliers',
                title: 'Studio OS — Master Suppliers Directory',
                columns: exportColumns,
                rows: exportRows
              })
            }
            disabled={filteredSuppliers.length === 0}
            className="min-h-[42px] px-3.5 py-2 rounded-xl bg-white border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50 inline-flex items-center gap-1.5 disabled:opacity-40"
          >
            <FileText className="w-4 h-4" /> PDF
          </button>
          <button
            onClick={handleOpenAdd}
            className="min-h-[42px] px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black inline-flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Supplier
          </button>
        </div>
      </div>

      {/* Status Banner */}
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

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-zinc-200">
          <div className="text-xs font-bold text-zinc-500 uppercase">Total Suppliers</div>
          <div className="text-2xl font-black text-zinc-900 mt-1">{kpis.total}</div>
        </div>
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
          <div className="text-xs font-bold text-emerald-700 uppercase">Active</div>
          <div className="text-2xl font-black text-emerald-800 mt-1">{kpis.active}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-zinc-200">
          <div className="text-xs font-bold text-zinc-500 uppercase">Avg Day Rate</div>
          <div className="text-2xl font-black text-zinc-900 mt-1">₹{kpis.avgRate.toLocaleString('en-IN')}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-3.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search supplier, contact, city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-900 min-h-[42px]"
          />
        </div>
        <select
          value={selectedStudio}
          onChange={(e) => setSelectedStudio(e.target.value)}
          className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 min-h-[42px]"
        >
          <option value="all">All Studios</option>
          {studios.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
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
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 min-h-[42px]"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
      </div>

      {loading ? (
        <div className="py-16 flex items-center justify-center gap-2 text-zinc-500 text-sm bg-white border border-zinc-200 rounded-2xl">
          <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
          <span>Syncing suppliers from Firebase...</span>
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="py-16 text-center bg-white border border-zinc-200 rounded-2xl space-y-3">
          <Truck className="w-10 h-10 text-zinc-300 mx-auto" />
          <p className="text-sm font-bold text-zinc-800">No suppliers added yet.</p>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 text-xs font-black inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add Supplier
          </button>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-zinc-50 text-zinc-500 uppercase font-bold border-b border-zinc-200">
                  <tr>
                    <th className="px-4 py-3">Supplier & Category</th>
                    <th className="px-4 py-3">Studio Affiliation</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">City</th>
                    <th className="px-4 py-3 text-right">Base Day Rate</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredSuppliers.map((s) => (
                    <tr key={`${s.studioId}_${s.id}`} className="hover:bg-zinc-50/70">
                      <td className="px-4 py-3">
                        <div className="font-bold text-zinc-900">{s.businessName}</div>
                        <div className="text-zinc-500">{SUPPLIER_CATEGORY_LABELS[s.category] || s.category}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-zinc-800">{s.studioName}</div>
                        <div className="text-zinc-400 font-mono">{s.studioId}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-zinc-800">{s.contactPerson}</div>
                        <div className="text-zinc-500 font-mono">{s.phone}</div>
                      </td>
                      <td className="px-4 py-3 text-zinc-700">{s.city || '—'}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-zinc-900">
                        ₹{(s.baseDayRate || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold ${
                            s.isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                          }`}
                        >
                          {s.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => setDetailSupplier(s)}
                            title="View Details"
                            className="p-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:text-zinc-900"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(s)}
                            title="Edit Supplier"
                            className="p-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:text-amber-600"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleActive(s)}
                            title={s.isActive ? 'Deactivate' : 'Activate'}
                            className="p-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:text-indigo-600"
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingSupplier(s)}
                            title="Delete Supplier"
                            className="p-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile / Tablet Cards */}
          <div className="lg:hidden space-y-3">
            {filteredSuppliers.map((s) => (
              <div key={`${s.studioId}_${s.id}`} className="bg-white border border-zinc-200 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-black text-zinc-900">{s.businessName}</div>
                    <div className="text-xs text-zinc-500">
                      {s.studioName} · {SUPPLIER_CATEGORY_LABELS[s.category] || s.category}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      s.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-600'
                    }`}
                  >
                    {s.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="text-xs text-zinc-600 flex justify-between">
                  <span>
                    {s.contactPerson} · {s.phone}
                  </span>
                  <strong className="font-mono text-zinc-900">₹{(s.baseDayRate || 0).toLocaleString('en-IN')}/day</strong>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={() => setDetailSupplier(s)}
                    className="min-h-[40px] px-3 py-1.5 rounded-xl border border-zinc-200 text-xs font-bold"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleOpenEdit(s)}
                    className="min-h-[40px] px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeletingSupplier(s)}
                    className="min-h-[40px] px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
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
                {editingSupplier ? `Edit Supplier — ${editingSupplier.businessName}` : 'Add Supplier'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsAddOpen(false);
                  setEditingSupplier(null);
                }}
                className="p-1 text-zinc-500 hover:text-zinc-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {!editingSupplier && (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Studio Affiliation</label>
                  <select
                    required
                    value={formData.studioId}
                    onChange={(e) => setFormData({ ...formData, studioId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-sm"
                  >
                    <option value="">Select Studio</option>
                    {studios.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Business / Supplier Name</label>
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
                <label className="block text-xs font-bold text-zinc-700 mb-1">Phone Number</label>
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
                  placeholder="e.g. Drone, 4K Gimbal"
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
                className="px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 text-xs font-black disabled:opacity-50"
              >
                {saveState === 'saving' ? 'Saving...' : 'Save to Firebase'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Detail Modal */}
      {detailSupplier && (
        <div className="fixed inset-0 z-50 bg-zinc-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-zinc-200 rounded-3xl p-6 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
              <h3 className="text-base font-black text-zinc-900">{detailSupplier.businessName}</h3>
              <button onClick={() => setDetailSupplier(null)} className="text-zinc-500 font-bold">
                ✕
              </button>
            </div>
            <div className="space-y-1.5 text-xs">
              <div><strong>Studio:</strong> {detailSupplier.studioName}</div>
              <div><strong>Category:</strong> {SUPPLIER_CATEGORY_LABELS[detailSupplier.category] || detailSupplier.category}</div>
              <div><strong>Contact:</strong> {detailSupplier.contactPerson} · {detailSupplier.phone}</div>
              <div><strong>Email:</strong> {detailSupplier.email || 'Not provided'}</div>
              <div><strong>Location:</strong> {[detailSupplier.address, detailSupplier.city].filter(Boolean).join(', ') || 'Not provided'}</div>
              <div><strong>Services:</strong> {detailSupplier.services || 'Not specified'}</div>
              <div><strong>Base Day Rate:</strong> ₹{(detailSupplier.baseDayRate || 0).toLocaleString('en-IN')}</div>
              <div><strong>Notes:</strong> {detailSupplier.notes || 'None'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deletingSupplier && (
        <div className="fixed inset-0 z-50 bg-zinc-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-zinc-200 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-zinc-900">Delete Supplier?</h3>
            <p className="text-xs text-zinc-600">
              Remove <strong>{deletingSupplier.businessName}</strong> from {deletingSupplier.studioName}? If referenced by
              existing bookings, it will be safely archived to preserve historical records.
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
