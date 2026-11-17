import React, { useState, useMemo } from 'react';
import { masterAdminService } from '../../services/masterAdminService';
import { supplierService } from '../../services/supplierService';
import { masterExportService, ExportColumn } from '../../services/masterExportService';
import { platformAuditService } from '../../services/platformAuditService';
import { Supplier, SupplierCategory, SUPPLIER_CATEGORY_LABELS, SupplierCategoryEnum } from '../../types/schema';
import { 
  Truck, 
  Search, 
  Filter, 
  Download, 
  FileText, 
  Plus, 
  Phone, 
  Mail, 
  MapPin, 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  Edit3, 
  X, 
  Sparkles,
  Star
} from 'lucide-react';

const SUPPLIER_CATEGORIES: SupplierCategory[] = SupplierCategoryEnum.options;

interface SupplierWithStudio extends Supplier {
  studioName: string;
}

export const MasterSuppliersPage: React.FC = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudio, setSelectedStudio] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierWithStudio | null>(null);
  const [deletingSupplier, setDeletingSupplier] = useState<SupplierWithStudio | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    studioId: 'studio_shreeji_films',
    businessName: '',
    category: 'cinematic_videographers' as SupplierCategory,
    contactPerson: '',
    phone: '',
    email: '',
    city: 'Ahmedabad',
    baseDayRate: 6500,
    isActive: true,
    rating: 5
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const studios = useMemo(() => {
    return masterAdminService.getAllStudios();
  }, [refreshKey]);

  // Aggregate suppliers across all studios
  const allSuppliers = useMemo(() => {
    const list: SupplierWithStudio[] = [];
    studios.forEach(st => {
      let sups = supplierService.listSuppliers(st.id);
      if (sups.length === 0) {
        // Seed standard suppliers for studio
        const defaults = [
          {
            businessName: `${st.name} Drone Works`,
            category: 'drone_pilots' as SupplierCategory,
            contactPerson: 'Karan Dave',
            phone: '9825198271',
            email: 'drone@works.in',
            city: st.city || 'Ahmedabad',
            baseDayRate: 8000,
            isActive: true,
            rating: 5
          },
          {
            businessName: 'Apex Cinematic Cranes',
            category: 'crane_jib_operators' as SupplierCategory,
            contactPerson: 'Sanjay Varma',
            phone: '9898012345',
            email: 'cranes@apex.in',
            city: st.city || 'Surat',
            baseDayRate: 12000,
            isActive: true,
            rating: 5
          },
          {
            businessName: 'Royal Luxe Album Labs',
            category: 'album_printers_bookbinders' as SupplierCategory,
            contactPerson: 'Harish Mehta',
            phone: '9724011223',
            email: 'print@royallabs.in',
            city: st.city || 'Vadodara',
            baseDayRate: 4500,
            isActive: true,
            rating: 5
          }
        ];
        defaults.forEach(d => {
          supplierService.createSupplier(st.id, d as any);
        });
        sups = supplierService.listSuppliers(st.id);
      }
      sups.forEach(s => {
        list.push({ ...s, studioName: st.name });
      });
    });
    return list;
  }, [studios, refreshKey]);

  // Filtered suppliers
  const filteredSuppliers = useMemo(() => {
    return allSuppliers.filter(s => {
      if (selectedStudio !== 'all' && s.studioId !== selectedStudio) return false;
      if (selectedCategory !== 'all' && s.category !== selectedCategory) return false;
      if (selectedStatus === 'active' && !s.isActive) return false;
      if (selectedStatus === 'inactive' && s.isActive) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          s.businessName.toLowerCase().includes(q) ||
          s.contactPerson.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          s.city.toLowerCase().includes(q) ||
          s.phone.includes(q)
        );
      }
      return true;
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [allSuppliers, selectedStudio, selectedCategory, selectedStatus, searchTerm]);

  // KPIs
  const kpis = useMemo(() => {
    const totalVendors = allSuppliers.length;
    const activeVendors = allSuppliers.filter(s => s.isActive).length;
    const avgDailyRate = Math.round(allSuppliers.reduce((sum, s) => sum + (s.baseDayRate || 5000), 0) / (totalVendors || 1));
    return { totalVendors, activeVendors, avgDailyRate };
  }, [allSuppliers]);

  // Pagination
  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage) || 1;
  const paginatedSuppliers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSuppliers.slice(start, start + itemsPerPage);
  }, [filteredSuppliers, currentPage]);

  const handleSaveSupplier = () => {
    if (!formData.businessName.trim() || !formData.phone.trim()) {
      alert('Please enter business name and phone number.');
      return;
    }

    const targetStudioId = formData.studioId;

    if (editingSupplier) {
      supplierService.updateSupplier(targetStudioId, editingSupplier.id, {
        businessName: formData.businessName,
        category: formData.category,
        contactPerson: formData.contactPerson,
        phone: formData.phone,
        email: formData.email,
        city: formData.city,
        baseDayRate: Number(formData.baseDayRate),
        isActive: formData.isActive
      });
      platformAuditService.logAction('Master Admin', 'UPDATE_SUPPLIER', 'supplier', editingSupplier.id, `Updated supplier ${formData.businessName}`);
      showToast('Supplier profile updated successfully.');
    } else {
      const created = supplierService.createSupplier(targetStudioId, {
        businessName: formData.businessName,
        category: formData.category,
        contactPerson: formData.contactPerson,
        phone: formData.phone,
        email: formData.email,
        city: formData.city,
        baseDayRate: Number(formData.baseDayRate),
        isActive: formData.isActive,
        rating: formData.rating,
        hasPortalAccess: false
      } as any);
      platformAuditService.logAction('Master Admin', 'CREATE_SUPPLIER', 'supplier', created.id, `Created supplier ${formData.businessName} in studio ${targetStudioId}`);
      showToast('New supplier profile onboarded.');
    }

    setIsAddModalOpen(false);
    setEditingSupplier(null);
    setRefreshKey(k => k + 1);
  };

  const handleToggleActive = (sup: SupplierWithStudio) => {
    supplierService.updateSupplier(sup.studioId, sup.id, {
      isActive: !sup.isActive
    });
    platformAuditService.logAction('Master Admin', 'TOGGLE_SUPPLIER_STATUS', 'supplier', sup.id, `Toggled status of ${sup.businessName} to ${!sup.isActive ? 'Active' : 'Inactive'}`);
    showToast(`${sup.businessName} is now ${!sup.isActive ? 'Active' : 'Deactivated'}.`);
    setRefreshKey(k => k + 1);
  };

  const handleDeleteSupplier = () => {
    if (!deletingSupplier) return;
    supplierService.deleteSupplier(deletingSupplier.studioId, deletingSupplier.id);
    platformAuditService.logAction('Master Admin', 'DELETE_SUPPLIER', 'supplier', deletingSupplier.id, `Deleted supplier ${deletingSupplier.businessName}`);
    showToast(`Supplier ${deletingSupplier.businessName} deleted.`);
    setDeletingSupplier(null);
    setRefreshKey(k => k + 1);
  };

  const handleExport = (type: 'pdf' | 'excel') => {
    const exportColumns: ExportColumn[] = [
      { key: 'businessName', label: 'Supplier / Business' },
      { key: 'categoryLabel', label: 'Category' },
      { key: 'studioName', label: 'Affiliated Studio' },
      { key: 'contactPerson', label: 'Contact Person' },
      { key: 'phone', label: 'Phone' },
      { key: 'city', label: 'City' },
      { key: 'dailyRateFormatted', label: 'Base Day Rate', align: 'right', format: 'currency' },
      { key: 'statusLabel', label: 'Status' }
    ];

    const exportRows = filteredSuppliers.map(s => ({
      ...s,
      categoryLabel: SUPPLIER_CATEGORY_LABELS[s.category] || s.category,
      dailyRateFormatted: `₹${(s.baseDayRate || 5000).toLocaleString('en-IN')}`,
      statusLabel: s.isActive ? 'ACTIVE' : 'DEACTIVATED'
    }));

    const options = {
      filename: 'Supplier_Administration_Ledger',
      title: 'Global External Supplier & Vendor Directory',
      subtitle: `Master supplier registry across ${studios.length} studios`,
      filterSummary: `Studio: ${selectedStudio} | Category: ${selectedCategory} | Status: ${selectedStatus}`,
      columns: exportColumns,
      rows: exportRows,
      summaryMetrics: [
        { label: 'Total Vendors', value: kpis.totalVendors },
        { label: 'Active Roster', value: kpis.activeVendors },
        { label: 'Avg Day Rate', value: `₹${kpis.avgDailyRate.toLocaleString('en-IN')}` }
      ]
    };

    if (type === 'excel') masterExportService.exportToExcel(options);
    else masterExportService.exportToPDF(options);
  };

  return (
    <div className="space-y-6 pb-20 w-full font-sans">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 text-white font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 border border-orange-500/30 text-xs">
          <Sparkles className="w-4 h-4 text-orange-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-50 text-orange-800 border border-orange-200">
              Vendor Logistics
            </span>
            <span className="text-xs text-zinc-500 font-medium">{allSuppliers.length} External Partners</span>
          </div>
          <h1 className="text-2xl font-black text-zinc-900 font-display tracking-tight mt-1">
            Supplier Administration
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Cross-studio vendor profiles, category pricing, equipment partners, and contract status.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => handleExport('excel')}
            className="min-h-[42px] px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 text-xs font-bold flex items-center gap-2 shadow-2xs transition-all cursor-pointer active:scale-95"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Export Excel</span>
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className="min-h-[42px] px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 text-xs font-bold flex items-center gap-2 shadow-2xs transition-all cursor-pointer active:scale-95"
          >
            <FileText className="w-4 h-4 text-rose-600" />
            <span>Export PDF</span>
          </button>
          <button
            onClick={() => {
              setEditingSupplier(null);
              setFormData({
                studioId: studios[0]?.id || 'studio_shreeji_films',
                businessName: '',
                category: 'cinematic_videographers',
                contactPerson: '',
                phone: '',
                email: '',
                city: 'Ahmedabad',
                baseDayRate: 6500,
                isActive: true,
                rating: 5
              });
              setIsAddModalOpen(true);
            }}
            className="min-h-[42px] px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-orange-500/20 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Supplier Profile</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-2xs">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Registered Suppliers</span>
          <div className="text-2xl font-black text-zinc-900 mt-1 font-display">{kpis.totalVendors}</div>
          <span className="text-xs text-zinc-500 mt-0.5 block">Across 17 specialized categories</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-2xs">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Active Roster</span>
          <div className="text-2xl font-black text-emerald-600 mt-1 font-display">{kpis.activeVendors}</div>
          <span className="text-xs text-emerald-600 font-bold mt-0.5 block">Ready for event booking</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-2xs">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Avg Daily Rate</span>
          <div className="text-2xl font-black text-zinc-900 mt-1 font-display">₹{kpis.avgDailyRate.toLocaleString('en-IN')}</div>
          <span className="text-xs text-zinc-500 mt-0.5 block">Standard market rate</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="p-4 bg-white border border-zinc-200 rounded-2xl shadow-2xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search suppliers by business, contact, city, phone..."
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-800 focus:outline-none focus:bg-white min-h-[40px]"
          />
        </div>

        <select
          value={selectedStudio}
          onChange={e => { setSelectedStudio(e.target.value); setCurrentPage(1); }}
          className="min-h-[40px] px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 focus:outline-none focus:bg-white"
        >
          <option value="all">All Studios ({studios.length})</option>
          {studios.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <select
          value={selectedCategory}
          onChange={e => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
          className="min-h-[40px] px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 focus:outline-none focus:bg-white"
        >
          <option value="all">All Categories ({SUPPLIER_CATEGORIES.length})</option>
          {SUPPLIER_CATEGORIES.map(c => (
            <option key={c} value={c}>{SUPPLIER_CATEGORY_LABELS[c] || c}</option>
          ))}
        </select>

        <select
          value={selectedStatus}
          onChange={e => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
          className="min-h-[40px] px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 focus:outline-none focus:bg-white"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="inactive">Deactivated Only</option>
        </select>
      </div>

      {/* Table Section */}
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Business / Supplier</th>
                <th className="py-3 px-4">Studio Affiliation</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Contact Person</th>
                <th className="py-3 px-4">City</th>
                <th className="py-3 px-4 text-right">Base Day Rate</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {paginatedSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-400 font-medium">
                    No suppliers found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedSuppliers.map(s => (
                  <tr key={s.id} className="hover:bg-orange-50/20 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-zinc-900">{s.businessName}</div>
                      <div className="text-zinc-500 text-xs flex items-center gap-1 mt-0.5">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                        <span>{s.rating || 5} rating</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-zinc-800">{s.studioName}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-zinc-100 text-zinc-800 border border-zinc-200">
                        {SUPPLIER_CATEGORY_LABELS[s.category] || s.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-zinc-900">{s.contactPerson}</div>
                      <div className="text-zinc-500 text-xs">{s.phone}</div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-zinc-700">{s.city}</td>
                    <td className="py-3.5 px-4 text-right font-black text-zinc-900">
                      ₹{(s.baseDayRate || 5000).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleToggleActive(s)}
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border cursor-pointer ${
                          s.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                        }`}
                        title="Click to toggle active status"
                      >
                        {s.isActive ? 'Active' : 'Deactivated'}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setEditingSupplier(s);
                            setFormData({
                              studioId: s.studioId,
                              businessName: s.businessName,
                              category: s.category,
                              contactPerson: s.contactPerson,
                              phone: s.phone,
                              email: s.email || '',
                              city: s.city,
                              baseDayRate: s.baseDayRate || 5000,
                              isActive: s.isActive,
                              rating: s.rating || 5
                            });
                            setIsAddModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 cursor-pointer"
                          title="Edit Supplier"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingSupplier(s)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="Delete Supplier"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-3.5 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
          <span>Showing page {currentPage} of {totalPages} ({filteredSuppliers.length} suppliers)</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-zinc-900">
                  {editingSupplier ? 'Edit Supplier Profile' : 'Onboard Supplier / Vendor'}
                </h3>
                <p className="text-xs text-zinc-500">Persisted across studio vendor directories</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-zinc-400 hover:text-zinc-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-zinc-700 block mb-1">Target Studio</label>
                <select
                  value={formData.studioId}
                  disabled={Boolean(editingSupplier)}
                  onChange={e => setFormData(d => ({ ...d, studioId: e.target.value }))}
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-bold"
                >
                  {studios.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.city})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1">Business / Agency Name</label>
                <input
                  type="text"
                  value={formData.businessName}
                  onChange={e => setFormData(d => ({ ...d, businessName: e.target.value }))}
                  placeholder="e.g. Gujarat Cinematic Drones & Cables"
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData(d => ({ ...d, category: e.target.value as any }))}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl"
                  >
                    {SUPPLIER_CATEGORIES.map(c => (
                      <option key={c} value={c}>{SUPPLIER_CATEGORY_LABELS[c] || c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">City / Region</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={e => setFormData(d => ({ ...d, city: e.target.value }))}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={e => setFormData(d => ({ ...d, contactPerson: e.target.value }))}
                    placeholder="e.g. Mukesh Patel"
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={e => setFormData(d => ({ ...d, phone: e.target.value }))}
                    placeholder="e.g. 9825098250"
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Base Day Rate (₹)</label>
                  <input
                    type="number"
                    value={formData.baseDayRate}
                    onChange={e => setFormData(d => ({ ...d, baseDayRate: Number(e.target.value) }))}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Status</label>
                  <select
                    value={formData.isActive ? 'true' : 'false'}
                    onChange={e => setFormData(d => ({ ...d, isActive: e.target.value === 'true' }))}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-bold"
                  >
                    <option value="true">Active</option>
                    <option value="false">Deactivated</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSupplier}
                className="px-5 py-2 text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white rounded-xl shadow-xs cursor-pointer active:scale-95"
              >
                {editingSupplier ? 'Save Changes' : 'Onboard Vendor'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingSupplier && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center border border-rose-200">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900">Delete Supplier Profile</h3>
                <p className="text-xs text-zinc-500">Remove partner from studio vendor registry</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs space-y-1">
              <div><strong>Business:</strong> {deletingSupplier.businessName}</div>
              <div><strong>Category:</strong> {SUPPLIER_CATEGORY_LABELS[deletingSupplier.category] || deletingSupplier.category}</div>
              <div><strong>Studio:</strong> {deletingSupplier.studioName}</div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setDeletingSupplier(null)}
                className="px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSupplier}
                className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs cursor-pointer active:scale-95"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
