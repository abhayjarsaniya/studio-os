import React, { useState, useEffect } from 'react';
import { studioServiceCatalogService, StudioServiceItem } from '../../services/studioServiceCatalogService';
import {
  studioCatalogService,
  StudioPackageItem,
  StudioDeliverableCatalogItem,
  StudioEventTypeItem
} from '../../services/studioCatalogService';
import { DeliverableCategory } from '../../types/bookingProduction';
import {
  Layers,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  Package,
  CheckSquare,
  Calendar
} from 'lucide-react';

interface Props {
  studioId: string;
}

type CatalogSection = 'services' | 'packages' | 'deliverables' | 'event_types';

export const StudioServicesSettings: React.FC<Props> = ({ studioId }) => {
  const [section, setSection] = useState<CatalogSection>('services');
  const [notice, setNotice] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  // Listen to real-time sync updates
  useEffect(() => {
    const onUpdate = () => setVersion(v => v + 1);
    window.addEventListener('studio_data_updated', onUpdate);
    return () => window.removeEventListener('studio_data_updated', onUpdate);
  }, []);

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  };

  // ============================================
  // 1. SERVICES STATE & CRUD
  // ============================================
  const [servicesList, setServicesList] = useState<StudioServiceItem[]>([]);
  const [isAddingService, setIsAddingService] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [svcName, setSvcName] = useState('');
  const [svcCategory, setSvcCategory] = useState('Wedding');
  const [svcPrice, setSvcPrice] = useState<number>(0);
  const [svcUnit, setSvcUnit] = useState('Event');
  const [svcDesc, setSvcDesc] = useState('');

  // ============================================
  // 2. PACKAGES STATE & CRUD
  // ============================================
  const [packagesList, setPackagesList] = useState<StudioPackageItem[]>([]);
  const [isAddingPackage, setIsAddingPackage] = useState(false);
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);
  const [pkgName, setPkgName] = useState('');
  const [pkgCategory, setPkgCategory] = useState('Wedding');
  const [pkgPrice, setPkgPrice] = useState<number>(0);
  const [pkgDesc, setPkgDesc] = useState('');

  // ============================================
  // 3. DELIVERABLES CATALOG STATE & CRUD
  // ============================================
  const [deliverablesList, setDeliverablesList] = useState<StudioDeliverableCatalogItem[]>([]);
  const [isAddingDel, setIsAddingDel] = useState(false);
  const [editingDelId, setEditingDelId] = useState<string | null>(null);
  const [delName, setDelName] = useState('');
  const [delCategory, setDelCategory] = useState<DeliverableCategory>('photography');
  const [delQty, setDelQty] = useState<number>(1);
  const [delUnit, setDelUnit] = useState('items');
  const [delDesc, setDelDesc] = useState('');

  // ============================================
  // 4. EVENT & FUNCTION TYPES STATE & CRUD
  // ============================================
  const [eventTypesList, setEventTypesList] = useState<StudioEventTypeItem[]>([]);
  const [isAddingType, setIsAddingType] = useState(false);
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [typeName, setTypeName] = useState('');
  const [typeKind, setTypeKind] = useState<'event' | 'function'>('event');
  const [typeDesc, setTypeDesc] = useState('');

  useEffect(() => {
    setServicesList(studioServiceCatalogService.listServices(studioId));
    setPackagesList(studioCatalogService.listPackages(studioId));
    setDeliverablesList(studioCatalogService.listDeliverables(studioId));
    setEventTypesList(studioCatalogService.listEventTypes(studioId));
  }, [studioId, version]);

  // Service Handlers
  const handleSaveService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!svcName.trim()) return;
    if (editingServiceId) {
      studioServiceCatalogService.updateService(studioId, editingServiceId, {
        name: svcName.trim(),
        category: svcCategory,
        defaultPrice: Number(svcPrice) || 0,
        unit: svcUnit.trim() || 'Event',
        description: svcDesc.trim()
      }, 'Studio Owner');
      showNotice(`Updated service "${svcName.trim()}"`);
    } else {
      studioServiceCatalogService.createService(studioId, {
        name: svcName.trim(),
        category: svcCategory,
        defaultPrice: Number(svcPrice) || 0,
        unit: svcUnit.trim() || 'Event',
        description: svcDesc.trim()
      }, 'Studio Owner');
      showNotice(`Added service "${svcName.trim()}"`);
    }
    setSvcName('');
    setSvcPrice(0);
    setSvcUnit('Event');
    setSvcDesc('');
    setEditingServiceId(null);
    setIsAddingService(false);
  };

  // Package Handlers
  const handleSavePackage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pkgName.trim()) return;
    if (editingPackageId) {
      studioCatalogService.updatePackage(studioId, editingPackageId, {
        name: pkgName.trim(),
        category: pkgCategory,
        basePrice: Number(pkgPrice) || 0,
        description: pkgDesc.trim()
      });
      showNotice(`Updated package "${pkgName.trim()}"`);
    } else {
      studioCatalogService.createPackage(studioId, {
        name: pkgName.trim(),
        category: pkgCategory,
        basePrice: Number(pkgPrice) || 0,
        description: pkgDesc.trim()
      });
      showNotice(`Added package "${pkgName.trim()}"`);
    }
    setPkgName('');
    setPkgPrice(0);
    setPkgDesc('');
    setEditingPackageId(null);
    setIsAddingPackage(false);
  };

  // Deliverable Handlers
  const handleSaveDeliverable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!delName.trim()) return;
    if (editingDelId) {
      studioCatalogService.updateDeliverable(studioId, editingDelId, {
        name: delName.trim(),
        category: delCategory,
        defaultQty: Math.max(1, Number(delQty) || 1),
        unit: delUnit.trim() || 'items',
        description: delDesc.trim()
      });
      showNotice(`Updated deliverable "${delName.trim()}"`);
    } else {
      studioCatalogService.createDeliverable(studioId, {
        name: delName.trim(),
        category: delCategory,
        defaultQty: Math.max(1, Number(delQty) || 1),
        unit: delUnit.trim() || 'items',
        description: delDesc.trim()
      });
      showNotice(`Added deliverable "${delName.trim()}"`);
    }
    setDelName('');
    setDelQty(1);
    setDelUnit('items');
    setDelDesc('');
    setEditingDelId(null);
    setIsAddingDel(false);
  };

  // Event/Function Type Handlers
  const handleSaveEventType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeName.trim()) return;
    if (editingTypeId) {
      studioCatalogService.updateEventType(studioId, editingTypeId, {
        name: typeName.trim(),
        kind: typeKind,
        description: typeDesc.trim()
      });
      showNotice(`Updated type "${typeName.trim()}"`);
    } else {
      studioCatalogService.createEventType(studioId, {
        name: typeName.trim(),
        kind: typeKind,
        description: typeDesc.trim()
      });
      showNotice(`Added type "${typeName.trim()}"`);
    }
    setTypeName('');
    setTypeDesc('');
    setEditingTypeId(null);
    setIsAddingType(false);
  };

  return (
    <div className="space-y-5 font-sans">
      {notice && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Sub-navigation tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: 'services', label: `Services (${servicesList.length})`, icon: <Layers className="w-3.5 h-3.5" /> },
          { id: 'packages', label: `Packages (${packagesList.length})`, icon: <Package className="w-3.5 h-3.5" /> },
          { id: 'deliverables', label: `Deliverables (${deliverablesList.length})`, icon: <CheckSquare className="w-3.5 h-3.5" /> },
          { id: 'event_types', label: `Event & Function Types (${eventTypesList.length})`, icon: <Calendar className="w-3.5 h-3.5" /> }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSection(tab.id as CatalogSection)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              section === tab.id
                ? 'bg-zinc-900 text-white shadow-xs'
                : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* SECTION 1: SERVICES */}
      {section === 'services' && (
        <div className="p-6 rounded-3xl bg-white border border-zinc-200 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100">
            <div>
              <h3 className="text-base font-bold text-zinc-900 font-display">Studio Services Catalog</h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Configure your studio's own services and pricing for quotations and bookings.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingServiceId(null);
                setSvcName('');
                setSvcPrice(0);
                setSvcUnit('Event');
                setSvcDesc('');
                setIsAddingService(!isAddingService);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>+ Add Service</span>
            </button>
          </div>

          {isAddingService && (
            <form onSubmit={handleSaveService} className="p-5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-900 block">
                {editingServiceId ? 'Edit Service' : 'Add New Catalog Service'}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Service Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Candid Photography"
                    value={svcName}
                    onChange={(e) => setSvcName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Wedding, Aerial, Video"
                    value={svcCategory}
                    onChange={(e) => setSvcCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Default Rate (₹) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={svcPrice}
                    onChange={(e) => setSvcPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Billing Unit</label>
                  <input
                    type="text"
                    placeholder="e.g. Full Day, Session"
                    value={svcUnit}
                    onChange={(e) => setSvcUnit(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="Short description..."
                  value={svcDesc}
                  onChange={(e) => setSvcDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white text-xs"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => { setIsAddingService(false); setEditingServiceId(null); }} className="px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-200/60 cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold cursor-pointer">
                  {editingServiceId ? 'Update Service' : 'Save Service'}
                </button>
              </div>
            </form>
          )}

          {servicesList.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/60 space-y-2">
              <Layers className="w-8 h-8 text-zinc-300 mx-auto" />
              <p className="text-sm font-bold text-zinc-700">No services added yet</p>
              <p className="text-xs text-zinc-500">Add your photography, cinematography, or editing services so they appear in Quick Quotations and Bookings.</p>
            </div>
          ) : (
            <div className="border border-zinc-200 rounded-2xl overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Service Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Unit</th>
                    <th className="py-3 px-4 text-right">Default Rate (₹)</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {servicesList.map((svc) => (
                    <tr key={svc.id} className="hover:bg-zinc-50/70">
                      <td className="py-3 px-4">
                        <p className="font-bold text-zinc-900">{svc.name}</p>
                        {svc.description && <p className="text-xs text-zinc-500 mt-0.5">{svc.description}</p>}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 font-semibold text-xs">{svc.category}</span>
                      </td>
                      <td className="py-3 px-4 text-zinc-600 font-medium">{svc.unit || 'Event'}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-zinc-900">₹{svc.defaultPrice.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-right space-x-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingServiceId(svc.id);
                            setSvcName(svc.name);
                            setSvcCategory(svc.category);
                            setSvcPrice(svc.defaultPrice);
                            setSvcUnit(svc.unit || 'Event');
                            setSvcDesc(svc.description || '');
                            setIsAddingService(true);
                          }}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 cursor-pointer"
                          title="Edit Service"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete service "${svc.name}"?`)) {
                              studioServiceCatalogService.deleteService(studioId, svc.id, 'Studio Owner');
                              showNotice(`Deleted service "${svc.name}"`);
                            }
                          }}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 cursor-pointer"
                          title="Delete Service"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: PACKAGES */}
      {section === 'packages' && (
        <div className="p-6 rounded-3xl bg-white border border-zinc-200 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100">
            <div>
              <h3 className="text-base font-bold text-zinc-900 font-display">Studio Packages</h3>
              <p className="text-xs text-zinc-500 mt-0.5">Bundle your studio services into reusable event packages.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingPackageId(null);
                setPkgName('');
                setPkgPrice(0);
                setPkgDesc('');
                setIsAddingPackage(!isAddingPackage);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>+ Add Package</span>
            </button>
          </div>

          {isAddingPackage && (
            <form onSubmit={handleSavePackage} className="p-5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3 text-xs">
              <span className="font-bold uppercase tracking-wider text-amber-900 block">
                {editingPackageId ? 'Edit Studio Package' : 'Create New Studio Package'}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Package Name *"
                  value={pkgName}
                  onChange={e => setPkgName(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-amber-300 bg-white text-xs"
                />
                <input
                  type="text"
                  placeholder="Event Category (e.g. Wedding)"
                  value={pkgCategory}
                  onChange={e => setPkgCategory(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-amber-300 bg-white text-xs"
                />
                <input
                  type="number"
                  required
                  min="0"
                  placeholder="Base Price (₹) *"
                  value={pkgPrice}
                  onChange={e => setPkgPrice(Number(e.target.value))}
                  className="px-3 py-2 rounded-xl border border-amber-300 bg-white text-xs font-mono"
                />
              </div>
              <input
                type="text"
                placeholder="Package Description / Inclusions"
                value={pkgDesc}
                onChange={e => setPkgDesc(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white text-xs"
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => { setIsAddingPackage(false); setEditingPackageId(null); }} className="px-3 py-1.5 rounded-xl font-bold text-zinc-600 cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 rounded-xl bg-zinc-900 text-white font-bold cursor-pointer">
                  {editingPackageId ? 'Update Package' : 'Save Package'}
                </button>
              </div>
            </form>
          )}

          {packagesList.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/60 space-y-2">
              <Package className="w-8 h-8 text-zinc-300 mx-auto" />
              <p className="text-sm font-bold text-zinc-700">No packages created yet</p>
              <p className="text-xs text-zinc-500">Create custom packages to speed up quotation and booking creation.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {packagesList.map(pkg => (
                <div key={pkg.id} className="p-4 rounded-2xl border border-zinc-200 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-zinc-900">{pkg.name}</span>
                      <span className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 font-semibold text-xs">{pkg.category}</span>
                    </div>
                    {pkg.description && <p className="text-xs text-zinc-500 mt-1">{pkg.description}</p>}
                    <p className="text-sm font-mono font-black text-zinc-900 mt-2">₹{pkg.basePrice.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPackageId(pkg.id);
                        setPkgName(pkg.name);
                        setPkgCategory(pkg.category);
                        setPkgPrice(pkg.basePrice);
                        setPkgDesc(pkg.description || '');
                        setIsAddingPackage(true);
                      }}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Delete package "${pkg.name}"?`)) {
                          studioCatalogService.deletePackage(studioId, pkg.id);
                          showNotice(`Deleted package "${pkg.name}"`);
                        }
                      }}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: DELIVERABLES CATALOG */}
      {section === 'deliverables' && (
        <div className="p-6 rounded-3xl bg-white border border-zinc-200 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100">
            <div>
              <h3 className="text-base font-bold text-zinc-900 font-display">Deliverables Catalog</h3>
              <p className="text-xs text-zinc-500 mt-0.5">Manage photos, videos, albums, and digital deliverables available in bookings.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingDelId(null);
                setDelName('');
                setDelQty(1);
                setDelUnit('items');
                setDelDesc('');
                setIsAddingDel(!isAddingDel);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>+ Add Deliverable</span>
            </button>
          </div>

          {isAddingDel && (
            <form onSubmit={handleSaveDeliverable} className="p-5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3 text-xs">
              <span className="font-bold uppercase tracking-wider text-amber-900 block">
                {editingDelId ? 'Edit Deliverable' : 'Add Studio Deliverable'}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Deliverable Name *"
                  value={delName}
                  onChange={e => setDelName(e.target.value)}
                  className="sm:col-span-2 px-3 py-2 rounded-xl border border-amber-300 bg-white text-xs"
                />
                <select
                  value={delCategory}
                  onChange={e => setDelCategory(e.target.value as DeliverableCategory)}
                  className="px-3 py-2 rounded-xl border border-amber-300 bg-white text-xs"
                >
                  <option value="photography">Photography</option>
                  <option value="video">Video</option>
                  <option value="physical">Album / Print</option>
                  <option value="digital">Digital / Cloud</option>
                </select>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    min="1"
                    value={delQty}
                    onChange={e => setDelQty(Number(e.target.value) || 1)}
                    className="w-16 px-2.5 py-2 rounded-xl border border-amber-300 bg-white font-mono text-xs"
                    placeholder="Qty"
                  />
                  <input
                    type="text"
                    value={delUnit}
                    onChange={e => setDelUnit(e.target.value)}
                    className="flex-1 min-w-0 px-2.5 py-2 rounded-xl border border-amber-300 bg-white text-xs"
                    placeholder="Unit"
                  />
                </div>
              </div>
              <input
                type="text"
                placeholder="Description (optional)"
                value={delDesc}
                onChange={e => setDelDesc(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white text-xs"
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => { setIsAddingDel(false); setEditingDelId(null); }} className="px-3 py-1.5 rounded-xl font-bold text-zinc-600 cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 rounded-xl bg-zinc-900 text-white font-bold cursor-pointer">
                  {editingDelId ? 'Update Deliverable' : 'Save Deliverable'}
                </button>
              </div>
            </form>
          )}

          {deliverablesList.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/60 space-y-2">
              <CheckSquare className="w-8 h-8 text-zinc-300 mx-auto" />
              <p className="text-sm font-bold text-zinc-700">No deliverables configured yet</p>
              <p className="text-xs text-zinc-500">Add deliverables like Edited Photos, Teaser Video, or Flush Mount Albums to select them quickly in bookings.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-2xl overflow-hidden text-xs">
              {deliverablesList.map(dlv => (
                <div key={dlv.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-zinc-50/70">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-zinc-900">{dlv.name}</span>
                      <span className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 capitalize text-xs font-semibold">{dlv.category}</span>
                      <span className="font-mono text-zinc-500 text-xs">{dlv.defaultQty} {dlv.unit}</span>
                    </div>
                    {dlv.description && <p className="text-xs text-zinc-500 mt-0.5">{dlv.description}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingDelId(dlv.id);
                        setDelName(dlv.name);
                        setDelCategory(dlv.category);
                        setDelQty(dlv.defaultQty);
                        setDelUnit(dlv.unit);
                        setDelDesc(dlv.description || '');
                        setIsAddingDel(true);
                      }}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Delete deliverable "${dlv.name}"?`)) {
                          studioCatalogService.deleteDeliverable(studioId, dlv.id);
                          showNotice(`Deleted deliverable "${dlv.name}"`);
                        }
                      }}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 4: EVENT & FUNCTION TYPES */}
      {section === 'event_types' && (
        <div className="p-6 rounded-3xl bg-white border border-zinc-200 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100">
            <div>
              <h3 className="text-base font-bold text-zinc-900 font-display">Event & Function Types</h3>
              <p className="text-xs text-zinc-500 mt-0.5">Define your custom shoot categories and ceremony/function names.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingTypeId(null);
                setTypeName('');
                setTypeDesc('');
                setIsAddingType(!isAddingType);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>+ Add Event / Function Type</span>
            </button>
          </div>

          {isAddingType && (
            <form onSubmit={handleSaveEventType} className="p-5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3 text-xs">
              <span className="font-bold uppercase tracking-wider text-amber-900 block">
                {editingTypeId ? 'Edit Type' : 'Add Custom Event or Function Type'}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Type Name (e.g. Haldi, Maternity Shoot)"
                  value={typeName}
                  onChange={e => setTypeName(e.target.value)}
                  className="sm:col-span-2 px-3 py-2 rounded-xl border border-amber-300 bg-white text-xs"
                />
                <select
                  value={typeKind}
                  onChange={e => setTypeKind(e.target.value as 'event' | 'function')}
                  className="px-3 py-2 rounded-xl border border-amber-300 bg-white text-xs"
                >
                  <option value="event">Event Category</option>
                  <option value="function">Sub-Event / Function</option>
                </select>
              </div>
              <input
                type="text"
                placeholder="Notes / Description (optional)"
                value={typeDesc}
                onChange={e => setTypeDesc(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white text-xs"
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => { setIsAddingType(false); setEditingTypeId(null); }} className="px-3 py-1.5 rounded-xl font-bold text-zinc-600 cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 rounded-xl bg-zinc-900 text-white font-bold cursor-pointer">
                  {editingTypeId ? 'Update Type' : 'Save Type'}
                </button>
              </div>
            </form>
          )}

          {eventTypesList.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/60 space-y-2">
              <Calendar className="w-8 h-8 text-zinc-300 mx-auto" />
              <p className="text-sm font-bold text-zinc-700">No custom event or function types saved yet</p>
              <p className="text-xs text-zinc-500">Add custom shoot types or ceremony functions specific to your studio's workflow.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              {eventTypesList.map(et => (
                <div key={et.id} className="p-3.5 rounded-2xl border border-zinc-200 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-zinc-900 truncate">{et.name}</p>
                    <span className="text-xs text-zinc-500 capitalize">{et.kind === 'function' ? 'Sub-Event / Function' : 'Event Category'}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTypeId(et.id);
                        setTypeName(et.name);
                        setTypeKind(et.kind);
                        setTypeDesc(et.description || '');
                        setIsAddingType(true);
                      }}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Delete "${et.name}"?`)) {
                          studioCatalogService.deleteEventType(studioId, et.id);
                          showNotice(`Deleted "${et.name}"`);
                        }
                      }}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
