import React, { useState, useMemo } from 'react';
import { useMasterAdmin } from '../../context/MasterAdminContext';
import { masterAdminService } from '../../services/masterAdminService';
import { featureVisibilityService } from '../../services/featureVisibilityService';
import { platformFeatureService } from '../../services/platformFeatureService';
import { CENTRAL_FEATURE_REGISTRY, PlatformFeatureDefinition } from '../../services/featureRegistry';
import { 
  ToggleRight, 
  Check, 
  X, 
  Sparkles, 
  Building2, 
  Search,
  Filter,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';

export const MasterFeaturesPage: React.FC = () => {
  const { setMasterRoute, setSelectedStudioId, triggerRefresh, refreshTrigger } = useMasterAdmin();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudioId, setLocalStudioId] = useState<string>('std_demo_royal');
  const [activeTab, setActiveTab] = useState<'global' | 'by_studio'>('global');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const studios = useMemo(() => {
    return masterAdminService.getAllStudios();
  }, [refreshTrigger]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleToggleGlobal = (key: string, currentEnabled: boolean) => {
    try {
      platformFeatureService.toggleGlobalFeature(key, !currentEnabled, 'Master Admin');
      showToast(`Global feature "${key}" set to ${!currentEnabled ? 'ACTIVE' : 'DISABLED'}`);
      triggerRefresh();
    } catch (e: any) {
      showToast(e.message || 'Failed to update global switch');
    }
  };

  const filteredFeatures = useMemo(() => {
    return CENTRAL_FEATURE_REGISTRY.filter(f => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return f.name.toLowerCase().includes(q) || f.description.toLowerCase().includes(q) || f.category.toLowerCase().includes(q);
      }
      return true;
    });
  }, [searchTerm]);

  return (
    <div className="space-y-6 pb-20">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 text-white font-bold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 border border-zinc-800 animate-in fade-in slide-in-from-bottom-4">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="text-xs">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
              5-Tier Visibility Engine
            </span>
            <span className="text-xs text-zinc-500">Platform-Wide Feature Governance</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 font-display tracking-tight mt-1">
            Feature Management & Multi-Studio Matrix
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Resolution hierarchy: Tier 1 Global → Tier 2 Plan Entitlement → Tier 3 Master Studio Override → Tier 4 Studio Preference → Tier 5 Role Access.
          </p>
        </div>

        {/* Tab Toggle: Global vs By Studio */}
        <div className="flex items-center gap-1.5 p-1 bg-white border border-zinc-200 rounded-xl shadow-2xs">
          <button
            onClick={() => setActiveTab('global')}
            className={`min-h-[44px] px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'global' ? 'bg-zinc-900 text-white shadow-xs' : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            Global Features Catalog
          </button>
          <button
            onClick={() => setActiveTab('by_studio')}
            className={`min-h-[44px] px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'by_studio' ? 'bg-zinc-900 text-white shadow-xs' : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            Studio Matrix & Control
          </button>
        </div>
      </div>

      {/* 5-Tier Hierarchy Infographic Card */}
      <div className="bg-white p-5 rounded-3xl border border-zinc-200/90 text-xs shadow-2xs">
        <div className="font-bold text-amber-700 uppercase tracking-wider text-[10px] mb-2 font-display">5-Tier Resolution Cascade</div>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 text-center text-[11px]">
          <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200">
            <strong className="text-zinc-900 block font-bold">Tier 1</strong> Global Platform Switch
          </div>
          <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200">
            <strong className="text-zinc-900 block font-bold">Tier 2</strong> Plan Entitlement
          </div>
          <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900">
            <strong className="text-amber-800 block font-bold">Tier 3</strong> Master Studio Override
          </div>
          <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200">
            <strong className="text-zinc-900 block font-bold">Tier 4</strong> Studio Owner Preference
          </div>
          <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200">
            <strong className="text-zinc-900 block font-bold">Tier 5</strong> Role RBAC Policy
          </div>
        </div>
      </div>

      {activeTab === 'global' ? (
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-2xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search feature catalog..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-zinc-900"
              />
            </div>
          </div>

          {/* Feature Catalog Table */}
          <div className="bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-zinc-50 text-zinc-500 text-[10px] uppercase font-bold border-b border-zinc-200">
                  <tr>
                    <th className="px-5 py-3.5">Feature Name & Key</th>
                    <th className="px-4 py-3.5">Category</th>
                    <th className="px-4 py-3.5 text-center">Tier 1 Global Switch</th>
                    <th className="px-4 py-3.5">Min Plan</th>
                    <th className="px-4 py-3.5">Dependencies</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredFeatures.map(f => (
                    <tr key={f.id} className="hover:bg-zinc-50/70 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-zinc-900">{f.name}</div>
                        <div className="text-[11px] text-zinc-500 font-mono">{f.id}</div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 text-zinc-700">
                          {f.category}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <button
                          onClick={() => handleToggleGlobal(f.key, true)}
                          className="min-h-[44px] inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Global Active</span>
                        </button>
                      </td>

                      <td className="px-4 py-3.5 text-zinc-700 font-mono capitalize">
                        {f.minPlan}
                      </td>

                      <td className="px-4 py-3.5 text-zinc-600 font-mono text-[11px]">
                        {f.dependencies.length > 0 ? f.dependencies.join(', ') : 'None'}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => {
                            setSelectedStudioId(selectedStudioId);
                            setMasterRoute('studio-features');
                          }}
                          className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-xs font-bold text-zinc-800 border border-zinc-200 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>Manage by Studio</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Studio Selector Bar */}
          <div className="bg-white border border-zinc-200 rounded-3xl p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Building2 className="w-5 h-5 text-amber-500 shrink-0" />
              <div>
                <label className="block text-xs font-bold text-zinc-800">Select Studio to Configure</label>
                <p className="text-[11px] text-zinc-500">Pick any registered studio to audit or toggle its features</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={selectedStudioId}
                onChange={e => setLocalStudioId(e.target.value)}
                className="min-h-[44px] px-3 py-2 bg-white border border-zinc-300 rounded-xl text-xs font-bold text-zinc-800 focus:outline-none focus:border-zinc-900"
              >
                {studios.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.id})
                  </option>
                ))}
              </select>

              <button
                onClick={() => {
                  setSelectedStudioId(selectedStudioId);
                  setMasterRoute('studio-features');
                }}
                className="min-h-[44px] px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <span>Open Control Panel</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Matrix Overview for Selected Studio */}
          <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="font-bold text-sm text-zinc-900 font-display">
                Feature Availability Matrix for {studios.find(s => s.id === selectedStudioId)?.name || selectedStudioId}
              </h3>
              <button
                onClick={() => {
                  setSelectedStudioId(selectedStudioId);
                  setMasterRoute('studio-features');
                }}
                className="text-xs font-bold text-amber-800 hover:underline flex items-center gap-1"
              >
                Full Studio Feature Screen <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {CENTRAL_FEATURE_REGISTRY.map(f => {
                const statusInfo = featureVisibilityService.getStudioFeatureStatus(selectedStudioId, f.id);
                const isEnabled = statusInfo.status === 'enabled';
                const isHidden = statusInfo.isHidden;

                return (
                  <div key={f.id} className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-zinc-900">{f.name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isEnabled ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {statusInfo.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 line-clamp-1">{f.description}</p>
                    <div className="flex items-center justify-between pt-1 text-[10px]">
                      <span className="text-zinc-400 font-mono">Plan: {f.minPlan}</span>
                      {isHidden && <span className="text-amber-700 font-bold">Hidden in Nav</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
