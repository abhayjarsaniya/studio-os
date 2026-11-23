import React, { useState } from 'react';
import { studioServiceCatalogService, StudioServiceItem } from '../../services/studioServiceCatalogService';
import { Layers, Plus, Trash2, RefreshCw, CheckCircle2 } from 'lucide-react';

interface Props {
  studioId: string;
}

export const StudioServicesSettings: React.FC<Props> = ({ studioId }) => {
  const [servicesList, setServicesList] = useState<StudioServiceItem[]>(() => 
    studioServiceCatalogService.listServices(studioId)
  );
  const [isAddingService, setIsAddingService] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceCategory, setNewServiceCategory] = useState('Wedding');
  const [newServicePrice, setNewServicePrice] = useState(15000);
  const [newServiceUnit, setNewServiceUnit] = useState('Event');
  const [newServiceDesc, setNewServiceDesc] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const handleAddService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName.trim()) return;
    try {
      studioServiceCatalogService.createService(studioId, {
        name: newServiceName.trim(),
        category: newServiceCategory,
        defaultPrice: Number(newServicePrice) || 0,
        unit: newServiceUnit,
        description: newServiceDesc.trim()
      }, 'Studio Owner');
      setServicesList(studioServiceCatalogService.listServices(studioId));
      setNewServiceName('');
      setNewServiceDesc('');
      setIsAddingService(false);
      setNotice('New service added to catalog!');
      setTimeout(() => setNotice(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Error adding service');
    }
  };

  const handleDeleteService = (id: string, name: string) => {
    if (!window.confirm(`Delete service "${name}" from your studio catalog?`)) return;
    studioServiceCatalogService.deleteService(studioId, id, 'Studio Owner');
    setServicesList(studioServiceCatalogService.listServices(studioId));
    setNotice(`Deleted service "${name}"`);
    setTimeout(() => setNotice(null), 3000);
  };

  const handleResetDefaultServices = () => {
    if (!window.confirm('Reset catalog to the default 12 studio services?')) return;
    const defaults = studioServiceCatalogService.resetToDefaults(studioId, 'Studio Owner');
    setServicesList(defaults);
    setNotice('Reset catalog to standard 12 services.');
    setTimeout(() => setNotice(null), 3000);
  };

  return (
    <div className="space-y-6 font-sans">
      {notice && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{notice}</span>
        </div>
      )}

      <div className="p-6 rounded-3xl bg-white border border-zinc-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100">
          <div>
            <h3 className="text-base font-bold text-zinc-900 font-display">
              Studio Services Catalog
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Configure photography services, equipment, and deliverables loaded into the Quick Quotation engine.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetDefaultServices}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 hover:bg-zinc-100 text-zinc-700 text-xs font-bold transition-all cursor-pointer"
              title="Reset to 12 Standard Studio Services"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddingService(!isAddingService)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>+ Add Service</span>
            </button>
          </div>
        </div>

        {/* Add Service Drawer */}
        {isAddingService && (
          <form onSubmit={handleAddService} className="p-5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-900 block">
              Add New Catalog Service
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Service Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Drone Cinematography"
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white text-xs focus:ring-1 focus:ring-zinc-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Category</label>
                <select
                  value={newServiceCategory}
                  onChange={(e) => setNewServiceCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white text-xs focus:ring-1 focus:ring-zinc-900"
                >
                  <option value="Wedding">Wedding</option>
                  <option value="Pre-Wedding">Pre-Wedding</option>
                  <option value="Ceremony">Ceremony</option>
                  <option value="Rituals">Rituals</option>
                  <option value="Aerial">Aerial</option>
                  <option value="Cinema">Cinema</option>
                  <option value="Video">Video</option>
                  <option value="Deliverables">Deliverables</option>
                  <option value="Broadcast">Broadcast</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Default Price (₹) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={newServicePrice}
                  onChange={(e) => setNewServicePrice(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white text-xs font-mono focus:ring-1 focus:ring-zinc-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Billing Unit</label>
                <input
                  type="text"
                  placeholder="e.g. Full Day, Session, Book"
                  value={newServiceUnit}
                  onChange={(e) => setNewServiceUnit(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white text-xs focus:ring-1 focus:ring-zinc-900"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">Description (Optional)</label>
              <input
                type="text"
                placeholder="Short description of deliverables and inclusions..."
                value={newServiceDesc}
                onChange={(e) => setNewServiceDesc(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white text-xs focus:ring-1 focus:ring-zinc-900"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingService(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-200/60 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Save Service
              </button>
            </div>
          </form>
        )}

        {/* Services Table */}
        <div className="border border-zinc-200 rounded-2xl overflow-hidden">
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
                    <span className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 font-semibold text-xs">
                      {svc.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-zinc-600 font-medium">{svc.unit || 'Event'}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-zinc-900">
                    ₹{svc.defaultPrice.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleDeleteService(svc.id, svc.name)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 transition-colors cursor-pointer"
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
      </div>
    </div>
  );
};
