import React, { useEffect, useMemo, useState } from 'react';
import { useMasterAdmin } from '../../context/MasterAdminContext';
import { db } from '../../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { CENTRAL_FEATURE_REGISTRY, PlatformFeatureDefinition } from '../../services/featureRegistry';
import {
  liveFeatureService,
  resolveEffectiveFeatureMap,
  getDependentFeatures,
  FeatureAuditLogEntry
} from '../../services/liveFeatureService';
import {
  Check,
  X,
  Building2,
  Search,
  RotateCcw,
  Save,
  History,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight
} from 'lucide-react';

interface StudioSummary {
  id: string;
  name: string;
  city?: string;
  planName: string;
}

export const MasterFeaturesPage: React.FC = () => {
  const { currentAdmin, setMasterRoute, setSelectedStudioId, triggerRefresh } = useMasterAdmin();
  const actingAdmin = currentAdmin?.email || 'jarsaniya.abhay@gmail.com';

  const [activeTab, setActiveTab] = useState<'global' | 'by_studio' | 'history'>('global');
  const [studios, setStudios] = useState<StudioSummary[]>([]);
  const [selectedStudioId, setLocalStudioId] = useState<string>('');

  // Search & category filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Firebase state & draft state
  const [savedGlobalMap, setSavedGlobalMap] = useState<Record<string, boolean>>({});
  const [draftGlobalMap, setDraftGlobalMap] = useState<Record<string, boolean>>({});

  const [savedStudioMap, setSavedStudioMap] = useState<Record<string, boolean>>({});
  const [draftStudioMap, setDraftStudioMap] = useState<Record<string, boolean | undefined>>({});

  const [auditLogs, setAuditLogs] = useState<FeatureAuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Load live studios from Firestore
  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(collection(db, 'studios'), (snap) => {
      const list = snap.docs
        .map((d) => {
          const s = d.data() || {};
          return {
            id: d.id,
            name: s.name || d.id,
            city: s.city || '',
            planName: s.subscriptionPlan || s.subscriptionStatus || 'Trial'
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
      setStudios(list);
      if (list.length > 0 && !selectedStudioId) {
        setLocalStudioId(list[0].id);
      }
    });
    return () => unsub();
  }, []);

  const loadFeaturesFromFirebase = async (studioId?: string) => {
    setLoading(true);
    try {
      const res = await liveFeatureService.fetchFeatureState(studioId || undefined);
      setSavedGlobalMap(res.globalSettings);
      setDraftGlobalMap(res.globalSettings);
      setSavedStudioMap(res.studioOverrides);
      setDraftStudioMap(res.studioOverrides);
      setAuditLogs(res.auditLogs);
    } catch (err: any) {
      setStatusMessage(err?.message || 'Failed to load feature settings from Firebase.');
      setSaveState('error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeaturesFromFirebase(selectedStudioId || undefined);
  }, [selectedStudioId]);

  const categories = useMemo(() => {
    return ['all', ...Array.from(new Set(CENTRAL_FEATURE_REGISTRY.map((f) => f.category)))];
  }, []);

  const filteredFeatures = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return CENTRAL_FEATURE_REGISTRY.filter((f) => {
      if (categoryFilter !== 'all' && f.category !== categoryFilter) return false;
      if (q) {
        return (
          f.name.toLowerCase().includes(q) ||
          f.id.toLowerCase().includes(q) ||
          f.key.toLowerCase().includes(q) ||
          f.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [searchTerm, categoryFilter]);

  const selectedStudio = useMemo(() => {
    return studios.find((s) => s.id === selectedStudioId) || null;
  }, [studios, selectedStudioId]);

  const effectiveStudioMap = useMemo(() => {
    return resolveEffectiveFeatureMap({
      globalSettings: draftGlobalMap,
      studioOverrides: draftStudioMap
    });
  }, [draftGlobalMap, draftStudioMap]);

  const studioCounts = useMemo(() => {
    const total = CENTRAL_FEATURE_REGISTRY.length;
    let enabled = 0;
    let disabled = 0;
    CENTRAL_FEATURE_REGISTRY.forEach((f) => {
      if (effectiveStudioMap[f.id]?.enabled) enabled++;
      else disabled++;
    });
    return { total, enabled, disabled };
  }, [effectiveStudioMap]);

  // Toggle Global Feature with dependency confirmation
  const handleToggleGlobal = (feat: PlatformFeatureDefinition) => {
    const current = draftGlobalMap[feat.id] !== undefined ? draftGlobalMap[feat.id] : feat.defaultEnabled;
    const nextVal = !current;

    if (!nextVal) {
      // Disabling globally: check dependent features that are currently ON
      const deps = getDependentFeatures(feat.id).filter((d) => draftGlobalMap[d.id] !== false);
      if (deps.length > 0) {
        const ok = window.confirm(
          `Disabling "${feat.name}" globally will also disable dependent features:\n- ${deps
            .map((d) => d.name)
            .join('\n- ')}\n\nContinue?`
        );
        if (!ok) return;
        setDraftGlobalMap((prev) => {
          const next = { ...prev, [feat.id]: false };
          deps.forEach((d) => {
            next[d.id] = false;
          });
          return next;
        });
        setSaveState('idle');
        return;
      }
    } else if (feat.dependencies.length > 0) {
      const missingDeps = feat.dependencies
        .map((id) => CENTRAL_FEATURE_REGISTRY.find((f) => f.id === id))
        .filter((d): d is PlatformFeatureDefinition => Boolean(d && draftGlobalMap[d.id] === false));
      if (missingDeps.length > 0) {
        const ok = window.confirm(
          `"${feat.name}" requires:\n- ${missingDeps
            .map((d) => d.name)
            .join('\n- ')}\n\nEnable required dependencies as well?`
        );
        if (!ok) return;
        setDraftGlobalMap((prev) => {
          const next = { ...prev, [feat.id]: true };
          missingDeps.forEach((d) => {
            next[d.id] = true;
          });
          return next;
        });
        setSaveState('idle');
        return;
      }
    }

    setDraftGlobalMap((prev) => ({ ...prev, [feat.id]: nextVal }));
    setSaveState('idle');
  };

  // Toggle Studio Feature with dependency & data-preservation confirmation
  const handleToggleStudio = (feat: PlatformFeatureDefinition) => {
    const isGloballyOn = draftGlobalMap[feat.id] !== false;
    if (!isGloballyOn) {
      setStatusMessage(`"${feat.name}" is globally OFF. Enable it in Global Features Catalog first.`);
      return;
    }

    const currentlyOn = Boolean(effectiveStudioMap[feat.id]?.enabled);
    const nextVal = !currentlyOn;

    if (!nextVal) {
      const deps = getDependentFeatures(feat.id).filter((d) => effectiveStudioMap[d.id]?.enabled);
      const depMsg =
        deps.length > 0
          ? `\n\nDependent features will also be disabled:\n- ${deps.map((d) => d.name).join('\n- ')}`
          : '';
      const ok = window.confirm(
        `Disable "${feat.name}" for ${selectedStudio?.name || selectedStudioId}?${depMsg}\n\nExisting studio data will be preserved safely.`
      );
      if (!ok) return;

      setDraftStudioMap((prev) => {
        const next = { ...prev, [feat.id]: false };
        deps.forEach((d) => {
          next[d.id] = false;
        });
        return next;
      });
    } else {
      const missingDeps = feat.dependencies
        .map((id) => CENTRAL_FEATURE_REGISTRY.find((f) => f.id === id))
        .filter((d): d is PlatformFeatureDefinition => Boolean(d && !effectiveStudioMap[d.id]?.enabled));

      if (missingDeps.length > 0) {
        if (missingDeps.some((d) => draftGlobalMap[d.id] === false)) {
          setStatusMessage(
            `Cannot enable "${feat.name}" because required dependency (${missingDeps
              .map((d) => d.name)
              .join(', ')}) is globally OFF.`
          );
          return;
        }
        const ok = window.confirm(
          `"${feat.name}" requires:\n- ${missingDeps
            .map((d) => d.name)
            .join('\n- ')}\n\nEnable these dependencies for this studio as well?`
        );
        if (!ok) return;
        setDraftStudioMap((prev) => {
          const next = { ...prev, [feat.id]: true };
          missingDeps.forEach((d) => {
            next[d.id] = true;
          });
          return next;
        });
        setSaveState('idle');
        return;
      }

      setDraftStudioMap((prev) => ({ ...prev, [feat.id]: true }));
    }
    setSaveState('idle');
  };

  const handleSaveGlobal = async () => {
    setSaveState('saving');
    setStatusMessage(null);
    try {
      const updates = CENTRAL_FEATURE_REGISTRY.filter(
        (f) => draftGlobalMap[f.id] !== savedGlobalMap[f.id]
      ).map((f) => ({
        featureId: f.id,
        isGlobalEnabled: Boolean(draftGlobalMap[f.id])
      }));

      if (updates.length === 0) {
        setSaveState('saved');
        setStatusMessage('Global feature settings are already up to date.');
        return;
      }

      await liveFeatureService.saveGlobalFeatures({
        updates,
        actingAdmin,
        previousMap: savedGlobalMap
      });
      setSaveState('saved');
      setStatusMessage(`Saved ${updates.length} global feature change(s) to Firebase.`);
      triggerRefresh();
      await loadFeaturesFromFirebase(selectedStudioId || undefined);
    } catch (err: any) {
      setSaveState('error');
      setStatusMessage(err?.message || 'Failed to save global features.');
    }
  };

  const handleSaveStudio = async () => {
    if (!selectedStudioId) return;
    setSaveState('saving');
    setStatusMessage(null);
    try {
      const updates = CENTRAL_FEATURE_REGISTRY.filter((f) => {
        const prevVal = savedStudioMap[f.id];
        const nextVal = draftStudioMap[f.id];
        return nextVal !== undefined && nextVal !== prevVal;
      }).map((f) => ({
        featureId: f.id,
        enabled: Boolean(draftStudioMap[f.id])
      }));

      if (updates.length === 0) {
        setSaveState('saved');
        setStatusMessage('No studio changes to save.');
        return;
      }

      await liveFeatureService.saveStudioFeatures({
        studioId: selectedStudioId,
        updates,
        actingAdmin,
        previousMap: savedStudioMap
      });
      setSaveState('saved');
      setStatusMessage(`Saved ${updates.length} feature setting(s) for ${selectedStudio?.name || selectedStudioId}.`);
      triggerRefresh();
      await loadFeaturesFromFirebase(selectedStudioId);
    } catch (err: any) {
      setSaveState('error');
      setStatusMessage(err?.message || 'Failed to save studio feature settings.');
    }
  };

  const handleEnableAllStudio = () => {
    const next: Record<string, boolean> = {};
    CENTRAL_FEATURE_REGISTRY.forEach((f) => {
      if (draftGlobalMap[f.id] !== false) {
        next[f.id] = true;
      }
    });
    setDraftStudioMap(next);
    setSaveState('idle');
  };

  const handleDisableAllStudio = () => {
    if (
      !window.confirm(
        `Disable all features for ${selectedStudio?.name || selectedStudioId}? Existing studio data will be preserved.`
      )
    ) {
      return;
    }
    const next: Record<string, boolean> = {};
    CENTRAL_FEATURE_REGISTRY.forEach((f) => {
      next[f.id] = false;
    });
    setDraftStudioMap(next);
    setSaveState('idle');
  };

  const handleResetStudioDefaults = async () => {
    if (!selectedStudioId) return;
    if (!window.confirm(`Reset all feature overrides for ${selectedStudio?.name || selectedStudioId} to Global Defaults?`)) {
      return;
    }
    setSaveState('saving');
    try {
      await liveFeatureService.resetStudioToGlobalDefaults(selectedStudioId, actingAdmin);
      setSaveState('saved');
      setStatusMessage(`Reset ${selectedStudio?.name || selectedStudioId} to global defaults.`);
      await loadFeaturesFromFirebase(selectedStudioId);
    } catch (err: any) {
      setSaveState('error');
      setStatusMessage(err?.message || 'Failed to reset studio defaults.');
    }
  };

  return (
    <div className="space-y-5 pb-20 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
            Platform Feature Governance
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 font-display tracking-tight mt-0.5">
            Feature Management & Multi-Studio Matrix
          </h1>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 p-1 bg-white border border-zinc-200 rounded-xl shadow-2xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('global')}
            className={`min-h-[40px] px-3.5 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'global' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            Global Features Catalog
          </button>
          <button
            onClick={() => setActiveTab('by_studio')}
            className={`min-h-[40px] px-3.5 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'by_studio' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            Studio Matrix & Control
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`min-h-[40px] px-3.5 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-colors inline-flex items-center gap-1 ${
              activeTab === 'history' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>History</span>
          </button>
        </div>
      </div>

      {/* Save State & Feedback Banner */}
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
            <span>{statusMessage || (saveState === 'saving' ? 'Saving to Firebase...' : 'Saved')}</span>
          </div>
          {statusMessage && (
            <button onClick={() => setStatusMessage(null)} className="font-bold opacity-70 hover:opacity-100">
              ✕
            </button>
          )}
        </div>
      )}

      {/* Search & Category Filter */}
      {activeTab !== 'history' && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search features..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-amber-500 min-h-[42px]"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-700 min-h-[42px]"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>

          {activeTab === 'global' && (
            <button
              onClick={handleSaveGlobal}
              disabled={saveState === 'saving'}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs inline-flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>Save Global Changes</span>
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="py-16 flex items-center justify-center gap-2 text-zinc-500 text-sm bg-white border border-zinc-200 rounded-2xl">
          <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
          <span>Syncing feature settings from Firebase...</span>
        </div>
      ) : activeTab === 'global' ? (
        <>
          {/* Desktop Global Table */}
          <div className="hidden md:block bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase font-bold border-b border-zinc-200">
                  <tr>
                    <th className="px-5 py-3.5">Feature Name & Key</th>
                    <th className="px-4 py-3.5">Category</th>
                    <th className="px-4 py-3.5 text-center">Global Status</th>
                    <th className="px-4 py-3.5">Min Plan</th>
                    <th className="px-4 py-3.5">Dependencies</th>
                    <th className="px-5 py-3.5 text-right">Studio Control</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredFeatures.map((f) => {
                    const isOn = draftGlobalMap[f.id] !== undefined ? draftGlobalMap[f.id] : f.defaultEnabled;
                    return (
                      <tr key={f.id} className="hover:bg-zinc-50/70">
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-zinc-900 text-sm">{f.name}</div>
                          <div className="text-xs text-zinc-400 font-mono">{f.id}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-700">
                            {f.category}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <button
                            onClick={() => handleToggleGlobal(f)}
                            className={`min-h-[38px] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                              isOn
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                            }`}
                          >
                            {isOn ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                            <span>{isOn ? 'ON' : 'OFF'}</span>
                          </button>
                        </td>
                        <td className="px-4 py-3.5 text-zinc-700 font-mono capitalize">{f.minPlan}</td>
                        <td className="px-4 py-3.5 text-zinc-500 font-mono">
                          {f.dependencies.length > 0 ? f.dependencies.join(', ') : 'None'}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => setActiveTab('by_studio')}
                            className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-xs font-bold text-zinc-800 inline-flex items-center gap-1"
                          >
                            <span>Configure Studios</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Global Feature Cards */}
          <div className="md:hidden space-y-2.5">
            {filteredFeatures.map((f) => {
              const isOn = draftGlobalMap[f.id] !== undefined ? draftGlobalMap[f.id] : f.defaultEnabled;
              return (
                <div key={f.id} className="bg-white border border-zinc-200 rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-zinc-900">{f.name}</div>
                      <div className="text-xs text-zinc-400 font-mono truncate">
                        {f.id} · {f.category}
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleGlobal(f)}
                      className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-black border shrink-0 ${
                        isOn
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {isOn ? 'ON' : 'OFF'}
                    </button>
                  </div>
                  {f.dependencies.length > 0 && (
                    <div className="text-xs text-zinc-500">
                      Requires: <span className="font-mono">{f.dependencies.join(', ')}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : activeTab === 'by_studio' ? (
        <div className="space-y-4">
          {/* Studio Selector & Summary */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1">
                <Building2 className="w-5 h-5 text-amber-500 shrink-0" />
                <select
                  value={selectedStudioId}
                  onChange={(e) => setLocalStudioId(e.target.value)}
                  className="w-full md:max-w-md px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold text-zinc-900 min-h-[44px]"
                >
                  {studios.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleEnableAllStudio}
                  className="min-h-[40px] px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold hover:bg-emerald-100"
                >
                  Enable All
                </button>
                <button
                  onClick={handleDisableAllStudio}
                  className="min-h-[40px] px-3 py-1.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-bold hover:bg-rose-100"
                >
                  Disable All
                </button>
                <button
                  onClick={handleResetStudioDefaults}
                  className="min-h-[40px] px-3 py-1.5 rounded-xl bg-white text-zinc-700 border border-zinc-200 text-xs font-bold hover:bg-zinc-50 inline-flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset Defaults
                </button>
                <button
                  onClick={handleSaveStudio}
                  disabled={saveState === 'saving' || !selectedStudioId}
                  className="min-h-[40px] px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black inline-flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  <Save className="w-4 h-4" /> Save Changes
                </button>
              </div>
            </div>

            {selectedStudio && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2 border-t border-zinc-100 text-xs">
                <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200">
                  <div className="text-zinc-500">Studio Name</div>
                  <div className="font-bold text-zinc-900 truncate mt-0.5">{selectedStudio.name}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200">
                  <div className="text-zinc-500">Studio ID</div>
                  <div className="font-mono font-bold text-zinc-900 truncate mt-0.5">{selectedStudio.id}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200">
                  <div className="text-zinc-500">Current Plan</div>
                  <div className="font-bold text-indigo-700 capitalize mt-0.5">{selectedStudio.planName}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200">
                  <div className="text-zinc-500">Total Features</div>
                  <div className="font-black text-zinc-900 text-base mt-0.5">{studioCounts.total}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div className="text-emerald-700">Enabled</div>
                  <div className="font-black text-emerald-800 text-base mt-0.5">{studioCounts.enabled}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200">
                  <div className="text-rose-700">Disabled</div>
                  <div className="font-black text-rose-800 text-base mt-0.5">{studioCounts.disabled}</div>
                </div>
              </div>
            )}
          </div>

          {/* Studio Feature Toggle List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredFeatures.map((f) => {
              const eff = effectiveStudioMap[f.id];
              const isEnabled = Boolean(eff?.enabled);
              const isGlobalOff = eff?.reason === 'global_off';

              return (
                <div
                  key={f.id}
                  className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                    isEnabled ? 'bg-white border-zinc-200' : 'bg-zinc-50 border-zinc-200/80'
                  }`}
                >
                  <div className="min-w-0 space-y-1">
                    <div className="text-sm font-bold text-zinc-900">{f.name}</div>
                    <div className="text-xs text-zinc-400 font-mono">
                      {f.id} · {f.category}
                    </div>
                    {isGlobalOff && (
                      <div className="text-xs font-bold text-rose-600">Disabled Globally</div>
                    )}
                    {eff?.reason === 'dependency_off' && (
                      <div className="text-xs font-bold text-amber-700">
                        Requires: {f.dependencies.join(', ')}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleStudio(f)}
                    disabled={isGlobalOff}
                    className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-black border shrink-0 transition-all ${
                      isEnabled
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    {isEnabled ? 'ON' : 'OFF'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* History Tab */
        <div className="bg-white border border-zinc-200 rounded-2xl p-4 sm:p-5 space-y-3">
          <h3 className="text-sm font-bold text-zinc-900">Feature Visibility Change History</h3>
          {auditLogs.length === 0 ? (
            <p className="text-xs text-zinc-500 py-8 text-center">No feature changes logged yet.</p>
          ) : (
            <div className="divide-y divide-zinc-100">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <span className="font-bold text-zinc-900">{log.featureName}</span>{' '}
                    <span className="font-mono text-zinc-500">({log.featureId})</span>:{' '}
                    <span className="font-bold text-zinc-700">
                      {log.previousStatus} → {log.newStatus}
                    </span>
                    <div className="text-zinc-400 mt-0.5">
                      By {log.actingAdmin} · Scope: {log.studioId}
                    </div>
                  </div>
                  <div className="text-zinc-500 font-mono shrink-0">
                    {new Date(log.timestamp).toLocaleString('en-IN')}
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
