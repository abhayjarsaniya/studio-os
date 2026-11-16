import React, { useState, useMemo } from 'react';
import { useMasterAdmin } from '../../context/MasterAdminContext';
import { globalRbacService } from '../../services/globalRbacService';
import { 
  MasterGlobalRoleId, 
  MasterModuleId, 
  MasterActionId, 
  MasterResourceScope,
  MASTER_GLOBAL_ROLES_META, 
  MASTER_MODULES_CATALOG, 
  MASTER_ACTIONS_CATALOG,
  MASTER_RESOURCE_SCOPES,
  GLOBAL_FIELD_POLICIES 
} from '../../types/masterAdmin';
import { 
  ShieldAlert, 
  Check, 
  X, 
  Lock, 
  Unlock, 
  Save, 
  RotateCcw, 
  Layers, 
  Eye, 
  Sparkles,
  HelpCircle
} from 'lucide-react';

export const MasterRolesPermissionsPage: React.FC = () => {
  const { triggerRefresh } = useMasterAdmin();
  const [selectedRoleId, setSelectedRoleId] = useState<MasterGlobalRoleId>('photographer');
  const [activeSubTab, setActiveSubTab] = useState<'matrix' | 'scopes' | 'fields'>('matrix');
  const [filterModuleCategory, setFilterModuleCategory] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Get current global role definition
  const roleDef = useMemo(() => {
    return globalRbacService.getGlobalRole(selectedRoleId) || globalRbacService.getGlobalRoleDefinitions()[0];
  }, [selectedRoleId]);

  const [permissionsState, setPermissionsState] = useState(roleDef.defaultPermissions || {});
  const [scopesState, setScopesState] = useState(roleDef.defaultScopes || {});
  const [lockedActionsState, setLockedActionsState] = useState(roleDef.mandatoryLockedActions || {});

  // Reset local state when selected role changes
  React.useEffect(() => {
    setPermissionsState(roleDef.defaultPermissions || {});
    setScopesState(roleDef.defaultScopes || {});
    setLockedActionsState(roleDef.mandatoryLockedActions || {});
  }, [roleDef]);

  const moduleCategories = useMemo(() => {
    const set = new Set(MASTER_MODULES_CATALOG.map(m => m.category));
    return ['all', ...Array.from(set)];
  }, []);

  const filteredModules = useMemo(() => {
    if (filterModuleCategory === 'all') return MASTER_MODULES_CATALOG;
    return MASTER_MODULES_CATALOG.filter(m => m.category === filterModuleCategory);
  }, [filterModuleCategory]);

  const handleToggleAction = (moduleId: MasterModuleId, actionId: MasterActionId) => {
    if (selectedRoleId === 'studio_owner') {
      showToast('Studio Owner role permissions cannot be reduced. Full access is mandatory.');
      return;
    }

    setPermissionsState(prev => {
      const modPerms = prev[moduleId] || {};
      const current = !!modPerms[actionId];
      return {
        ...prev,
        [moduleId]: {
          ...modPerms,
          [actionId]: !current
        }
      };
    });
  };

  const handleToggleLock = (moduleId: MasterModuleId, actionId: MasterActionId) => {
    setLockedActionsState(prev => {
      const list = prev[moduleId] || [];
      const isLocked = list.includes(actionId);
      const updated = isLocked ? list.filter(a => a !== actionId) : [...list, actionId];
      return {
        ...prev,
        [moduleId]: updated
      };
    });
  };

  const handleScopeChange = (moduleId: MasterModuleId, scope: MasterResourceScope) => {
    setScopesState(prev => ({
      ...prev,
      [moduleId]: scope
    }));
  };

  const handleSaveChanges = () => {
    try {
      globalRbacService.updateGlobalRole(selectedRoleId, {
        defaultPermissions: permissionsState,
        defaultScopes: scopesState,
        mandatoryLockedActions: lockedActionsState
      });
      showToast(`Global RBAC policies for "${roleDef.label}" updated successfully!`);
      triggerRefresh();
    } catch (e: any) {
      showToast(e.message || 'Failed to save changes');
    }
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
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-rose-50 text-rose-800 border border-rose-200">
              Platform Master RBAC
            </span>
            <span className="text-xs text-zinc-500">14 Roles • 28 Modules • 12 Granular Actions</span>
          </div>
          <h1 className="text-2xl font-black text-zinc-900 font-display tracking-tight mt-1">
            Global Roles & Permission Matrix
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveChanges}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Save Global Policies</span>
          </button>
        </div>
      </div>

      {/* 6.1. 14 Default Roles Horizontal Selector */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-3">
        <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
          Select Role to Configure (14 Default System Roles)
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {MASTER_GLOBAL_ROLES_META.map(meta => {
            const isSelected = selectedRoleId === meta.id;
            return (
              <button
                key={meta.id}
                onClick={() => setSelectedRoleId(meta.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-500/20'
                    : 'bg-white text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 border border-zinc-200'
                }`}
              >
                {meta.isProtected && <Lock className="w-3 h-3 text-zinc-950" />}
                <span>{meta.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub Tabs: Matrix, Scopes, Field-Level */}
      <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
        <div className="flex items-center gap-2 text-xs font-bold">
          <button
            onClick={() => setActiveSubTab('matrix')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeSubTab === 'matrix' ? 'bg-zinc-100 text-amber-400' : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            28 Modules × 12 Actions Matrix
          </button>
          <button
            onClick={() => setActiveSubTab('scopes')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeSubTab === 'scopes' ? 'bg-zinc-100 text-amber-400' : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            Resource Scopes (5 Scopes)
          </button>
          <button
            onClick={() => setActiveSubTab('fields')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeSubTab === 'fields' ? 'bg-zinc-100 text-amber-400' : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            Field-Level Access (PII & Financials)
          </button>
        </div>

        {activeSubTab === 'matrix' && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-zinc-400 text-xs">Filter Module Category:</span>
            <select
              value={filterModuleCategory}
              onChange={e => setFilterModuleCategory(e.target.value)}
              className="bg-white border border-zinc-200 rounded-lg px-2 py-1 text-zinc-700 text-xs focus:outline-none focus:border-amber-400"
            >
              {moduleCategories.map(cat => (
                <option key={cat} value={cat}>{cat === 'all' ? 'All Categories (28 Modules)' : cat}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* SUBTAB 1: 28 MODULES X 12 ACTIONS MATRIX */}
      {activeSubTab === 'matrix' && (
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase font-bold border-b border-zinc-200">
                <tr>
                  <th className="px-4 py-3 sticky left-0 bg-white z-10 w-60">Studio OS Module (28)</th>
                  {MASTER_ACTIONS_CATALOG.map(act => (
                    <th key={act.id} className="px-3 py-3 text-center" title={act.description}>
                      <div className="flex flex-col items-center">
                        <span className={act.isSensitive ? 'text-amber-400 font-bold' : ''}>{act.label}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredModules.map(mod => {
                  const modPerms = permissionsState[mod.id] || {};
                  const lockedActions = lockedActionsState[mod.id] || [];

                  return (
                    <tr key={mod.id} className="hover:bg-zinc-50 transition-colors">
                      {/* Module Name */}
                      <td className="px-4 py-3 sticky left-0 bg-white font-semibold text-zinc-800 border-r border-zinc-200">
                        <div>{mod.label}</div>
                        <div className="text-xs text-zinc-400 font-normal">{mod.category}</div>
                      </td>

                      {/* 12 Actions Checkboxes */}
                      {MASTER_ACTIONS_CATALOG.map(act => {
                        const isGranted = !!modPerms[act.id];
                        const isLocked = lockedActions.includes(act.id);

                        return (
                          <td key={act.id} className="px-3 py-3 text-center">
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={() => handleToggleAction(mod.id, act.id)}
                                disabled={selectedRoleId === 'studio_owner'}
                                title={`${act.label} on ${mod.label}: ${isGranted ? 'Allowed' : 'Denied'}`}
                                className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                                  isGranted
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                                    : 'bg-white text-zinc-500 border border-zinc-200 hover:text-zinc-500'
                                } ${selectedRoleId === 'studio_owner' ? 'opacity-70 cursor-not-allowed' : ''}`}
                              >
                                {isGranted ? <Check className="w-3.5 h-3.5" /> : <X className="w-3 h-3" />}
                              </button>

                              {/* Master Mandatory Lock button */}
                              {selectedRoleId !== 'studio_owner' && (
                                <button
                                  onClick={() => handleToggleLock(mod.id, act.id)}
                                  title={isLocked ? 'Mandatory Locked: Studio Owner cannot change this' : 'Unlocked: Studio Owner can configure this'}
                                  className={`p-1 rounded hover:bg-zinc-100 ${
                                    isLocked ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-500'
                                  }`}
                                >
                                  {isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                                </button>
                              )}
                            </div>
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

      {/* SUBTAB 2: RESOURCE SCOPES */}
      {activeSubTab === 'scopes' && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xl space-y-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 font-display">Resource Access Scopes</h3>
            <p className="text-xs text-zinc-500">
              Configure data boundaries for "{roleDef.label}" across modules.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {MASTER_MODULES_CATALOG.map(mod => {
              const currentScope = scopesState[mod.id] || 'assigned_only';
              return (
                <div key={mod.id} className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-zinc-800">{mod.label}</div>
                    <div className="text-xs text-zinc-400">{mod.category}</div>
                  </div>

                  <select
                    value={currentScope}
                    onChange={e => handleScopeChange(mod.id, e.target.value as MasterResourceScope)}
                    disabled={selectedRoleId === 'studio_owner'}
                    className="bg-white border border-zinc-200 rounded-xl px-2.5 py-1.5 text-xs text-amber-300 font-semibold focus:outline-none focus:border-amber-400"
                  >
                    {MASTER_RESOURCE_SCOPES.map(scope => (
                      <option key={scope.id} value={scope.id}>{scope.label}</option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUBTAB 3: FIELD-LEVEL ACCESS (PII & FINANCIALS) */}
      {activeSubTab === 'fields' && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xl space-y-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 font-display">Field-Level Access Governance</h3>
            <p className="text-xs text-zinc-500">
              Client PII (Personal Identifiable Information) and monetary figures are masked for non-authorized roles.
            </p>
          </div>

          <div className="divide-y divide-zinc-100">
            {GLOBAL_FIELD_POLICIES.map(policy => {
              const isVisible = policy.visibleRoles.includes(selectedRoleId);
              const isEditable = policy.editableRoles.includes(selectedRoleId);

              return (
                <div key={policy.fieldName} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-zinc-800">{policy.fieldLabel}</span>
                      <span className="font-mono text-xs text-zinc-500">({policy.module}.{policy.fieldName})</span>
                      {policy.isPii && (
                        <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-rose-50 text-rose-800 border border-rose-200">
                          Client PII
                        </span>
                      )}
                      {policy.isFinancial && (
                        <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-amber-50 text-amber-800 border border-amber-200">
                          Monetary Value
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-400 mt-0.5">
                      Requires permission: <code>{policy.requiredAction || 'view'}</code>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-xl text-xs font-semibold ${
                      isVisible ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white text-zinc-400'
                    }`}>
                      {isVisible ? 'Field Visible' : 'Field Masked'}
                    </span>
                    <span className={`px-2.5 py-1 rounded-xl text-xs font-semibold ${
                      isEditable ? 'bg-indigo-500/20 text-indigo-300' : 'bg-white text-zinc-400'
                    }`}>
                      {isEditable ? 'Editable' : 'Read-Only'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
