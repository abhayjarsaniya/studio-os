import React, { useState, useMemo } from 'react';
import { useMasterAdmin } from '../../context/MasterAdminContext';
import { globalRbacService } from '../../services/globalRbacService';
import { masterAdminService } from '../../services/masterAdminService';
import { 
  MasterGlobalRoleId, 
  MasterModuleId, 
  MasterActionId, 
  MASTER_GLOBAL_ROLES_META, 
  MASTER_MODULES_CATALOG, 
  MASTER_ACTIONS_CATALOG 
} from '../../types/masterAdmin';
import { 
  ArrowLeft, 
  RotateCcw, 
  Save, 
  ShieldAlert, 
  Check, 
  X, 
  Sparkles,
  GitCompare,
  Building2
} from 'lucide-react';

export const MasterStudioRolesOverridesPage: React.FC = () => {
  const { selectedStudioId, setMasterRoute, triggerRefresh } = useMasterAdmin();
  const [selectedRoleId, setSelectedRoleId] = useState<MasterGlobalRoleId>('photographer');
  const [activeTab, setActiveTab] = useState<'editor' | 'diff'>('editor');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const studio = useMemo(() => {
    if (!selectedStudioId) return null;
    const all = masterAdminService.getAllStudios();
    return all.find(s => s.id === selectedStudioId) || all[0] || null;
  }, [selectedStudioId]);

  const studioId = studio?.id || 'studio_royal_frames_001';

  // Effective role details
  const effective = useMemo(() => {
    return globalRbacService.getEffectiveRoleForStudio(studioId, selectedRoleId);
  }, [studioId, selectedRoleId]);

  const [overriddenPerms, setOverriddenPerms] = useState(effective.permissions || {});

  React.useEffect(() => {
    setOverriddenPerms(effective.permissions || {});
  }, [effective]);

  const diffs = useMemo(() => {
    return globalRbacService.computeOverrideDiff(studioId, selectedRoleId);
  }, [studioId, selectedRoleId, overriddenPerms]);

  const handleToggle = (moduleId: MasterModuleId, actionId: MasterActionId) => {
    if (selectedRoleId === 'studio_owner') {
      showToast('Studio Owner role cannot be restricted');
      return;
    }

    setOverriddenPerms(prev => {
      const mod = prev[moduleId] || {};
      const current = !!mod[actionId];
      return {
        ...prev,
        [moduleId]: {
          ...mod,
          [actionId]: !current
        }
      };
    });
  };

  const handleSaveOverride = () => {
    try {
      globalRbacService.saveStudioOverride({
        studioId,
        roleId: selectedRoleId,
        overriddenPermissions: overriddenPerms,
        updatedBy: 'Master Admin'
      });
      showToast(`Studio override saved for ${selectedRoleId}!`);
      triggerRefresh();
    } catch (e: any) {
      showToast(e.message || 'Failed to save override');
    }
  };

  const handleResetToDefaults = () => {
    globalRbacService.resetStudioOverridesToDefault(studioId, selectedRoleId);
    showToast(`Role "${selectedRoleId}" reset to platform defaults!`);
    triggerRefresh();
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-amber-500 text-zinc-950 font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-zinc-950" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMasterRoute('studios')}
            className="p-2 rounded-xl bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-amber-400 font-bold uppercase">{studioId}</span>
              <span className="text-xs text-zinc-500">Custom Studio Permission Overrides</span>
            </div>
            <h1 className="text-2xl font-black text-zinc-900 font-display tracking-tight">
              {studio?.name || 'Studio'} — Role Overrides
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetToDefaults}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-zinc-100 hover:bg-zinc-200 text-rose-300 border border-zinc-200 flex items-center gap-1.5 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Platform Defaults</span>
          </button>
          <button
            onClick={handleSaveOverride}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Save Studio Override</span>
          </button>
        </div>
      </div>

      {/* Role Picker */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-3 flex items-center gap-2 overflow-x-auto scrollbar-none">
        {MASTER_GLOBAL_ROLES_META.map(meta => {
          const isSelected = selectedRoleId === meta.id;
          return (
            <button
              key={meta.id}
              onClick={() => setSelectedRoleId(meta.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-500/20'
                  : 'bg-white text-zinc-700 hover:bg-zinc-100 border border-zinc-200'
              }`}
            >
              {meta.label}
            </button>
          );
        })}
      </div>

      {/* Diff / Editor Switcher */}
      <div className="flex items-center justify-between border-b border-zinc-200 pb-2 text-xs font-bold">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('editor')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeTab === 'editor' ? 'bg-zinc-100 text-amber-400' : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            Matrix Override Editor
          </button>
          <button
            onClick={() => setActiveTab('diff')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'diff' ? 'bg-zinc-100 text-amber-400' : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>Override Diff View ({diffs.length} Differences)</span>
          </button>
        </div>
      </div>

      {/* TAB 1: MATRIX EDITOR */}
      {activeTab === 'editor' && (
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-zinc-50 text-zinc-500 text-[10px] uppercase font-bold border-b border-zinc-200">
                <tr>
                  <th className="px-4 py-3 sticky left-0 bg-white z-10 w-60">Studio OS Module</th>
                  {MASTER_ACTIONS_CATALOG.map(act => (
                    <th key={act.id} className="px-3 py-3 text-center">
                      <span className={act.isSensitive ? 'text-amber-400 font-bold' : ''}>{act.label}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {MASTER_MODULES_CATALOG.map(mod => {
                  const modPerms = overriddenPerms[mod.id] || {};

                  return (
                    <tr key={mod.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-4 py-3 sticky left-0 bg-white font-semibold text-zinc-800 border-r border-zinc-200">
                        {mod.label}
                      </td>

                      {MASTER_ACTIONS_CATALOG.map(act => {
                        const isGranted = !!modPerms[act.id];

                        return (
                          <td key={act.id} className="px-3 py-3 text-center">
                            <button
                              onClick={() => handleToggle(mod.id, act.id)}
                              disabled={selectedRoleId === 'studio_owner'}
                              className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                                isGranted
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                                  : 'bg-white text-zinc-500 border border-zinc-200 hover:text-zinc-500'
                              }`}
                            >
                              {isGranted ? <Check className="w-3.5 h-3.5" /> : <X className="w-3 h-3" />}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: DIFF VIEW */}
      {activeTab === 'diff' && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xl space-y-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 font-display">Override Difference Report</h3>
            <p className="text-xs text-zinc-500">
              Comparing "{studio?.name}" specific permissions against Platform Master Defaults.
            </p>
          </div>

          {diffs.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-400">
              No overrides active. This studio is currently using 100% platform global defaults.
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {diffs.map((d, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-zinc-800">{d.moduleLabel}</span>
                    <span className="text-zinc-500 ml-2">Action: <code>{d.actionId}</code></span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-zinc-400">Default: {d.defaultAllowed ? 'Allowed' : 'Denied'}</span>
                    <span className="text-zinc-500">→</span>
                    <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                      d.overrideAllowed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                    }`}>
                      Studio Override: {d.overrideAllowed ? 'Allowed' : 'Denied'}
                    </span>
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
