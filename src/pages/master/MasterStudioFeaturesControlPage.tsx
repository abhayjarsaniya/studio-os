import React, { useState, useEffect, useMemo } from 'react';
import { useMasterAdmin } from '../../context/MasterAdminContext';
import { masterAdminService } from '../../services/masterAdminService';
import { featureVisibilityService } from '../../services/featureVisibilityService';
import { CENTRAL_FEATURE_REGISTRY, PlatformFeatureDefinition } from '../../services/featureRegistry';
import { 
  Building2, 
  ArrowLeft, 
  Check, 
  X, 
  Eye, 
  EyeOff, 
  RotateCcw, 
  ShieldCheck, 
  AlertTriangle, 
  Layers, 
  Sparkles,
  Info
} from 'lucide-react';

export const MasterStudioFeaturesControlPage: React.FC<{ studioId: string }> = ({ studioId }) => {
  const { setMasterRoute, currentAdmin, triggerRefresh } = useMasterAdmin();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [updateKey, setUpdateKey] = useState(0);

  const studio = useMemo(() => {
    let res = masterAdminService.getStudio(studioId);
    if (!res) {
      const all = masterAdminService.getAllStudios();
      res = all.find(s => s.id === studioId || s.tenantId === studioId) || null;
      if (!res && (studioId === 'std_demo_royal' || studioId.includes('royal'))) {
        res = all.find(s => s.id === 'studio_royal_001' || s.id.includes('royal')) || all[0] || null;
      }
    }
    return res;
  }, [studioId, updateKey]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const featuresWithStatus = useMemo(() => {
    return CENTRAL_FEATURE_REGISTRY.map(f => {
      const statusInfo = featureVisibilityService.getStudioFeatureStatus(studioId, f.id);
      return {
        ...f,
        statusInfo
      };
    });
  }, [studioId, updateKey]);

  const counts = useMemo(() => {
    let enabled = 0;
    let disabled = 0;
    let hidden = 0;
    let notInPlan = 0;
    let depMissing = 0;

    featuresWithStatus.forEach(f => {
      if (f.statusInfo.status === 'enabled') enabled++;
      else if (f.statusInfo.status === 'disabled') disabled++;
      else if (f.statusInfo.status === 'hidden') hidden++;
      else if (f.statusInfo.status === 'not_in_plan') notInPlan++;
      else if (f.statusInfo.status === 'dependency_missing') depMissing++;
    });

    return { enabled, disabled, hidden, notInPlan, depMissing };
  }, [featuresWithStatus]);

  const handleToggleEnable = (feature: PlatformFeatureDefinition, currentlyDisabled: boolean) => {
    if (currentlyDisabled) {
      // Check dependencies before enabling
      const depCheck = featureVisibilityService.validateFeatureDependencies(studioId, feature.id);
      if (!depCheck.valid) {
        const confirmEnable = window.confirm(
          `Feature "${feature.name}" requires the following dependency features: ${depCheck.missingDependencies.join(', ')}.\n\nDo you want to enable this feature and its required dependencies now?`
        );
        if (confirmEnable) {
          // Enable dependencies first
          feature.dependencies.forEach(depId => {
            featureVisibilityService.enableFeatureForStudio(studioId, depId, currentAdmin.name);
          });
        } else {
          return;
        }
      }

      featureVisibilityService.enableFeatureForStudio(studioId, feature.id, currentAdmin.name);
      showToast(`Feature "${feature.name}" enabled for ${studio?.name || studioId}!`);
    } else {
      featureVisibilityService.disableFeatureForStudio(studioId, feature.id, currentAdmin.name);
      showToast(`Feature "${feature.name}" disabled for ${studio?.name || studioId}.`);
    }

    setUpdateKey(prev => prev + 1);
    triggerRefresh();
  };

  const handleToggleHide = (featureId: string, isCurrentlyHidden: boolean) => {
    if (isCurrentlyHidden) {
      featureVisibilityService.unhideFeatureForStudio(studioId, featureId);
      showToast('Feature unhidden in studio navigation.');
    } else {
      featureVisibilityService.hideFeatureForStudio(studioId, featureId);
      showToast('Feature hidden from studio navigation.');
    }
    setUpdateKey(prev => prev + 1);
    triggerRefresh();
  };

  const handleRestoreDefaults = () => {
    if (window.confirm(`Restore default platform features and visibility for ${studio?.name || studioId}?`)) {
      featureVisibilityService.restorePlatformDefaults(studioId, currentAdmin.name);
      showToast('Restored platform defaults.');
      setUpdateKey(prev => prev + 1);
      triggerRefresh();
    }
  };

  if (!studio) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-zinc-200">
        <Building2 className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
        <h2 className="text-base font-bold text-zinc-800">Studio Not Found</h2>
        <p className="text-xs text-zinc-500 mt-1">Studio ID "{studioId}" does not exist in the platform directory.</p>
        <button
          onClick={() => setMasterRoute('studios')}
          className="mt-4 px-4 py-2 rounded-xl bg-zinc-900 text-white text-xs font-bold"
        >
          Back to Studios Directory
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 text-white font-bold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 border border-zinc-800 animate-in fade-in slide-in-from-bottom-4">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="text-xs">{toastMessage}</span>
        </div>
      )}

      {/* Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMasterRoute('studios')}
            className="p-2 rounded-xl bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-600 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Back to Studios"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Studio Feature Governance</span>
              <span className="text-xs font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                {studio.tenantId || studio.id}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight font-display mt-0.5">
              {studio.name} — Feature Control Panel
            </h1>
          </div>
        </div>

        <button
          onClick={handleRestoreDefaults}
          className="min-h-[44px] px-4 py-2 text-xs font-bold rounded-xl bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
          <span>Restore Platform Defaults</span>
        </button>
      </div>

      {/* Studio Overview Summary Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white border border-zinc-200/90 shadow-sm grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Subscription Plan</span>
          <p className="text-sm font-bold text-zinc-900 capitalize">{studio.subscription?.planName || studio.subscription?.planId || 'Studio OS Pro'}</p>
          <span className="text-[11px] text-emerald-700 font-medium">Active Entitlement</span>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Active Features</span>
          <p className="text-xl font-black text-zinc-900 font-display">{counts.enabled}</p>
          <span className="text-[10px] text-zinc-500">Available to Studio Owner</span>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Disabled Features</span>
          <p className="text-xl font-black text-zinc-900 font-display">{counts.disabled}</p>
          <span className="text-[10px] text-zinc-500">Access Blocked</span>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Hidden from Nav</span>
          <p className="text-xl font-black text-zinc-900 font-display">{counts.hidden}</p>
          <span className="text-[10px] text-zinc-500">Active but unlisted</span>
        </div>

        <div className="col-span-2 sm:col-span-1 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total Registry</span>
          <p className="text-xl font-black text-zinc-900 font-display">{featuresWithStatus.length}</p>
          <span className="text-[10px] text-zinc-500">Modules Configured</span>
        </div>
      </div>

      {/* Feature Control Matrix Table / Card Stack */}
      <div className="bg-white border border-zinc-200 rounded-3xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <div>
            <h2 className="text-sm font-bold text-zinc-900 font-display">Module Feature Toggles & Overrides</h2>
            <p className="text-xs text-zinc-500">Changes persist to Firebase Firestore and update studio navigation in real time.</p>
          </div>
        </div>

        {/* Desktop Data Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50/70 border-b border-zinc-200/80 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-5">Feature & Description</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Min Plan</th>
                <th className="py-3 px-4">Dependencies</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-5 text-right">Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {featuresWithStatus.map(f => {
                const isEnabled = f.statusInfo.status === 'enabled';
                const isDisabled = f.statusInfo.status === 'disabled';
                const isHidden = f.statusInfo.isHidden;

                return (
                  <tr key={f.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="font-bold text-zinc-900">{f.name}</div>
                      <div className="text-[11px] text-zinc-500 max-w-sm line-clamp-1">{f.description}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 text-zinc-700">
                        {f.category}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-zinc-600 capitalize">
                      {f.minPlan}
                    </td>

                    <td className="py-3.5 px-4">
                      {f.dependencies.length > 0 ? (
                        <span className="text-[11px] text-zinc-600 font-mono">
                          {f.dependencies.join(', ')}
                        </span>
                      ) : (
                        <span className="text-zinc-400 text-[11px]">None</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {f.statusInfo.status === 'enabled' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Check className="w-3 h-3" /> Enabled
                        </span>
                      )}
                      {f.statusInfo.status === 'disabled' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <X className="w-3 h-3" /> Disabled
                        </span>
                      )}
                      {f.statusInfo.status === 'hidden' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <EyeOff className="w-3 h-3" /> Hidden
                        </span>
                      )}
                      {f.statusInfo.status === 'not_in_plan' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-600 border border-zinc-200">
                          <AlertTriangle className="w-3 h-3" /> Not in Plan
                        </span>
                      )}
                      {f.statusInfo.status === 'dependency_missing' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          <AlertTriangle className="w-3 h-3" /> Dep Missing
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Hide / Unhide Control */}
                        <button
                          onClick={() => handleToggleHide(f.id, isHidden)}
                          title={isHidden ? 'Unhide in Studio Menu' : 'Hide from Studio Menu'}
                          className={`p-2 rounded-xl border text-xs font-semibold transition-all min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer ${
                            isHidden 
                              ? 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100' 
                              : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                          }`}
                        >
                          {isHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>

                        {/* Enable / Disable Master Toggle */}
                        <button
                          onClick={() => handleToggleEnable(f, isDisabled)}
                          className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer ${
                            isDisabled 
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white' 
                              : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {isDisabled ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Enable</span>
                            </>
                          ) : (
                            <>
                              <X className="w-3.5 h-3.5" />
                              <span>Disable</span>
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Responsive Card Stack (< 768px) */}
        <div className="md:hidden divide-y divide-zinc-100">
          {featuresWithStatus.map(f => {
            const isDisabled = f.statusInfo.status === 'disabled';
            const isHidden = f.statusInfo.isHidden;

            return (
              <div key={f.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-zinc-900">{f.name}</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">{f.description}</p>
                  </div>
                  <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 text-zinc-700">
                    {f.category}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-600">
                  <span className="font-semibold text-zinc-700">Plan: {f.minPlan}</span>
                  {f.dependencies.length > 0 && (
                    <span>• Needs: {f.dependencies.join(', ')}</span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    {f.statusInfo.status === 'enabled' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Check className="w-3 h-3" /> Enabled
                      </span>
                    )}
                    {f.statusInfo.status === 'disabled' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        <X className="w-3 h-3" /> Disabled
                      </span>
                    )}
                    {f.statusInfo.status === 'hidden' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        <EyeOff className="w-3 h-3" /> Hidden
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleHide(f.id, isHidden)}
                      className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-700 flex items-center justify-center cursor-pointer"
                      aria-label={isHidden ? 'Unhide' : 'Hide'}
                    >
                      {isHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4 text-zinc-400" />}
                    </button>

                    <button
                      onClick={() => handleToggleEnable(f, isDisabled)}
                      className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        isDisabled
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {isDisabled ? 'Enable' : 'Disable'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
