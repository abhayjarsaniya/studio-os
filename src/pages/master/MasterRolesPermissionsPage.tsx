import React, { useEffect, useMemo, useState } from 'react';
import { useMasterAdmin } from '../../context/MasterAdminContext';
import { db } from '../../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import {
  liveRbacService,
  StudioRbacRole,
  UserPermissionOverrideDoc,
  RbacAuditEntry,
  getDefaultRoleTemplate
} from '../../services/liveRbacService';
import {
  MASTER_MODULES_CATALOG,
  MASTER_ACTIONS_CATALOG,
  MASTER_RESOURCE_SCOPES,
  GLOBAL_FIELD_POLICIES,
  MasterModuleId,
  MasterActionId,
  MasterResourceScope
} from '../../types/masterAdmin';
import {
  Check,
  X,
  Save,
  RotateCcw,
  Plus,
  Copy,
  Trash2,
  Edit3,
  ChevronDown,
  ChevronUp,
  Building2,
  Users,
  Shield,
  History,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search
} from 'lucide-react';

interface StudioOption {
  id: string;
  name: string;
  city?: string;
}

export const MasterRolesPermissionsPage: React.FC = () => {
  const { currentAdmin, triggerRefresh } = useMasterAdmin();
  const actingAdmin = currentAdmin?.email || 'jarsaniya.abhay@gmail.com';

  // Studio selector state
  const [studios, setStudios] = useState<StudioOption[]>([]);
  const [selectedStudioId, setSelectedStudioId] = useState<string>('all');

  // Target mode: role vs individual user
  const [targetMode, setTargetMode] = useState<'role' | 'user'>('role');
  const [globalRoles, setGlobalRoles] = useState<StudioRbacRole[]>([]);
  const [studioRoles, setStudioRoles] = useState<StudioRbacRole[]>([]);
  const [studioUsers, setStudioUsers] = useState<
    Array<{ uid: string; displayName: string; loginId: string; roleId: string; accountType: string; status: string }>
  >([]);
  const [userOverrides, setUserOverrides] = useState<UserPermissionOverrideDoc[]>([]);
  const [auditLogs, setAuditLogs] = useState<RbacAuditEntry[]>([]);

  const [selectedRoleId, setSelectedRoleId] = useState<string>('studio_owner');
  const [selectedUserUid, setSelectedUserUid] = useState<string>('');

  // Editable draft state
  const [draftPermissions, setDraftPermissions] = useState<
    Partial<Record<MasterModuleId, Partial<Record<MasterActionId, boolean>>>>
  >({});
  const [draftScopes, setDraftScopes] = useState<Partial<Record<MasterModuleId, MasterResourceScope>>>({});
  const [draftFieldAccess, setDraftFieldAccess] = useState<Record<string, { visible: boolean; editable: boolean }>>({});

  // Individual user draft override state (null/undefined = inherit from role)
  const [draftUserPerms, setDraftUserPerms] = useState<
    Partial<Record<MasterModuleId, Partial<Record<MasterActionId, boolean | null>>>>
  >({});
  const [draftUserScopes, setDraftUserScopes] = useState<Partial<Record<MasterModuleId, MasterResourceScope | null>>>({});
  const [draftUserFields, setDraftUserFields] = useState<
    Record<string, { visible?: boolean | null; editable?: boolean | null }>
  >({});

  // UI state
  const [activeSubTab, setActiveSubTab] = useState<'matrix' | 'scopes' | 'fields' | 'history'>('matrix');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [moduleSearch, setModuleSearch] = useState<string>('');
  const [expandedMobileMod, setExpandedMobileMod] = useState<string | null>('dashboard');
  const [loading, setLoading] = useState<boolean>(true);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Custom role modal state
  const [customRoleModal, setCustomRoleModal] = useState<{
    mode: 'create' | 'rename';
    name: string;
    description: string;
    cloneFromId: string;
  } | null>(null);

  useEffect(() => {
    if (!customRoleModal) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCustomRoleModal(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prev || 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [customRoleModal]);

  // Subscribe to live studios list
  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(collection(db, 'studios'), (snap) => {
      const list = snap.docs
        .map((d) => ({
          id: d.id,
          name: d.data()?.name || d.id,
          city: d.data()?.city || ''
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      setStudios(list);
    });
    return () => unsub();
  }, []);

  const loadRbacData = async (sId: string) => {
    setLoading(true);
    try {
      const data = await liveRbacService.fetchStudioRbacState(sId);
      setGlobalRoles(data.globalRoles);
      setStudioRoles(data.studioRoles);
      setStudioUsers(data.studioUsers);
      setUserOverrides(data.userOverrides);
      setAuditLogs(data.auditLogs);
      if (sId === 'all') {
        setTargetMode('role');
        setSelectedUserUid('');
      } else if (data.studioUsers.length > 0 && !data.studioUsers.some((u) => u.uid === selectedUserUid)) {
        setSelectedUserUid(data.studioUsers[0].uid);
      }
    } catch (err: any) {
      setStatusMessage(err?.message || 'Failed to load RBAC policies.');
      setSaveState('error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRbacData(selectedStudioId);
  }, [selectedStudioId]);

  // Combined roles list for the active studio (Global templates + Studio overrides/custom roles)
  const effectiveRolesList = useMemo(() => {
    if (selectedStudioId === 'all') return globalRoles;
    const map = new Map<string, StudioRbacRole>();
    globalRoles.forEach((r) => map.set(r.id, r));
    studioRoles.forEach((sr) => map.set(sr.id, sr));
    return Array.from(map.values());
  }, [selectedStudioId, globalRoles, studioRoles]);

  const activeRole = useMemo(() => {
    return (
      effectiveRolesList.find((r) => r.id === selectedRoleId) ||
      effectiveRolesList[0] ||
      getDefaultRoleTemplate('studio_owner')
    );
  }, [effectiveRolesList, selectedRoleId]);

  const activeUser = useMemo(() => {
    return studioUsers.find((u) => u.uid === selectedUserUid) || null;
  }, [studioUsers, selectedUserUid]);

  const activeUserInheritedRole = useMemo(() => {
    if (!activeUser) return activeRole;
    return (
      effectiveRolesList.find((r) => r.id === activeUser.roleId) ||
      getDefaultRoleTemplate(activeUser.roleId)
    );
  }, [activeUser, effectiveRolesList, activeRole]);

  // Sync draft state when activeRole or activeUser changes
  useEffect(() => {
    if (targetMode === 'role') {
      setDraftPermissions(JSON.parse(JSON.stringify(activeRole.permissions || {})));
      setDraftScopes(JSON.parse(JSON.stringify(activeRole.scopes || {})));
      setDraftFieldAccess(JSON.parse(JSON.stringify(activeRole.fieldAccess || {})));
    } else if (activeUser) {
      const existingOvr = userOverrides.find((o) => o.uid === activeUser.uid);
      setDraftUserPerms(JSON.parse(JSON.stringify(existingOvr?.permissions || {})));
      setDraftUserScopes(JSON.parse(JSON.stringify(existingOvr?.scopes || {})));
      setDraftUserFields(JSON.parse(JSON.stringify(existingOvr?.fieldAccess || {})));
    }
    setSaveState('idle');
  }, [targetMode, activeRole, activeUser, userOverrides]);

  const moduleCategories = useMemo(() => {
    return ['all', ...Array.from(new Set(MASTER_MODULES_CATALOG.map((m) => m.category)))];
  }, []);

  const filteredModules = useMemo(() => {
    const q = moduleSearch.trim().toLowerCase();
    return MASTER_MODULES_CATALOG.filter((m) => {
      if (filterCategory !== 'all' && m.category !== filterCategory) return false;
      if (q && !m.label.toLowerCase().includes(q) && !m.id.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [filterCategory, moduleSearch]);

  // Toggle action in Role mode (NO locking for studio_owner!)
  const handleToggleRoleAction = (moduleId: MasterModuleId, actionId: MasterActionId) => {
    setDraftPermissions((prev) => {
      const mod = prev[moduleId] || {};
      return {
        ...prev,
        [moduleId]: {
          ...mod,
          [actionId]: !mod[actionId]
        }
      };
    });
    setSaveState('idle');
  };

  // Cycle Individual User override: Inherited -> Allowed -> Denied -> Inherited
  const handleToggleUserAction = (moduleId: MasterModuleId, actionId: MasterActionId) => {
    const inherited = Boolean(activeUserInheritedRole.permissions?.[moduleId]?.[actionId]);
    setDraftUserPerms((prev) => {
      const mod = prev[moduleId] || {};
      const currentOvr = mod[actionId];
      let nextVal: boolean | null;
      if (currentOvr === undefined || currentOvr === null) {
        nextVal = !inherited; // Flip from inherited first
      } else if (currentOvr !== inherited) {
        nextVal = inherited; // Explicit match
      } else {
        nextVal = null; // Back to inherited
      }
      return {
        ...prev,
        [moduleId]: {
          ...mod,
          [actionId]: nextVal
        }
      };
    });
    setSaveState('idle');
  };

  const getUserEffectiveAction = (moduleId: MasterModuleId, actionId: MasterActionId) => {
    const inherited = Boolean(activeUserInheritedRole.permissions?.[moduleId]?.[actionId]);
    const ovr = draftUserPerms?.[moduleId]?.[actionId];
    if (ovr === true) return { allowed: true, state: 'allowed' as const };
    if (ovr === false) return { allowed: false, state: 'denied' as const };
    return { allowed: inherited, state: 'inherited' as const };
  };

  const handleSave = async () => {
    setSaveState('saving');
    setStatusMessage(null);
    try {
      if (targetMode === 'role') {
        const auditChanges: Array<{ module: string; permissionChanged: string; previousValue: any; newValue: any }> = [];
        MASTER_MODULES_CATALOG.forEach((m) => {
          MASTER_ACTIONS_CATALOG.forEach((a) => {
            const prevVal = Boolean(activeRole.permissions?.[m.id]?.[a.id]);
            const nextVal = Boolean(draftPermissions?.[m.id]?.[a.id]);
            if (prevVal !== nextVal) {
              auditChanges.push({
                module: m.id,
                permissionChanged: a.id,
                previousValue: prevVal,
                newValue: nextVal
              });
            }
          });
        });

        await liveRbacService.saveRolePolicy({
          studioId: selectedStudioId,
          role: {
            ...activeRole,
            permissions: draftPermissions,
            scopes: draftScopes,
            fieldAccess: draftFieldAccess
          },
          actingAdmin,
          auditChanges
        });
        setStatusMessage(
          selectedStudioId === 'all'
            ? `Global template "${activeRole.label}" saved.`
            : `Studio policy for "${activeRole.label}" saved & synced live.`
        );
      } else if (activeUser && selectedStudioId !== 'all') {
        await liveRbacService.saveUserOverride({
          studioId: selectedStudioId,
          override: {
            uid: activeUser.uid,
            studioId: selectedStudioId,
            roleId: activeUser.roleId,
            displayName: activeUser.displayName,
            loginId: activeUser.loginId,
            permissions: draftUserPerms,
            scopes: draftUserScopes,
            fieldAccess: draftUserFields,
            updatedAt: new Date().toISOString()
          },
          actingAdmin,
          auditChanges: [
            {
              module: 'user_override',
              permissionChanged: 'individual_policy_update',
              previousValue: 'previous',
              newValue: 'updated'
            }
          ]
        });
        setStatusMessage(`Individual permissions for "${activeUser.displayName}" saved & synced live.`);
      }
      setSaveState('saved');
      triggerRefresh();
      await loadRbacData(selectedStudioId);
    } catch (err: any) {
      setSaveState('error');
      setStatusMessage(err?.message || 'Failed to save changes.');
    }
  };

  const handleResetRoleToGlobal = async () => {
    if (selectedStudioId === 'all') return;
    const globalBase = globalRoles.find((r) => r.id === activeRole.id) || getDefaultRoleTemplate(activeRole.id);
    setDraftPermissions(JSON.parse(JSON.stringify(globalBase.permissions || {})));
    setDraftScopes(JSON.parse(JSON.stringify(globalBase.scopes || {})));
    setDraftFieldAccess(JSON.parse(JSON.stringify(globalBase.fieldAccess || {})));
    setStatusMessage('Reset draft to global defaults. Click Save Changes to apply.');
    setSaveState('idle');
  };

  const handleResetUserOverrides = async () => {
    if (!activeUser || selectedStudioId === 'all') return;
    setSaveState('saving');
    try {
      await liveRbacService.resetUserOverrides(selectedStudioId, activeUser.uid, actingAdmin);
      setStatusMessage(`Reset "${activeUser.displayName}" to role defaults.`);
      setSaveState('saved');
      await loadRbacData(selectedStudioId);
    } catch (err: any) {
      setSaveState('error');
      setStatusMessage(err?.message || 'Failed to reset user overrides.');
    }
  };

  const handleCreateOrRenameCustomRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customRoleModal || !customRoleModal.name.trim()) return;
    setSaveState('saving');
    try {
      if (customRoleModal.mode === 'create') {
        const slug = `custom_${customRoleModal.name
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')}_${Date.now().toString(36).slice(-4)}`;
        const source =
          effectiveRolesList.find((r) => r.id === customRoleModal.cloneFromId) ||
          getDefaultRoleTemplate('photographer');
        const newRole: StudioRbacRole = {
          id: slug,
          name: customRoleModal.name.trim(),
          label: customRoleModal.name.trim(),
          description: customRoleModal.description.trim() || 'Custom studio role',
          isSystemRole: false,
          isCustomRole: true,
          permissions: JSON.parse(JSON.stringify(source.permissions || {})),
          scopes: JSON.parse(JSON.stringify(source.scopes || {})),
          fieldAccess: JSON.parse(JSON.stringify(source.fieldAccess || {})),
          updatedAt: new Date().toISOString()
        };
        await liveRbacService.saveRolePolicy({
          studioId: selectedStudioId,
          role: newRole,
          actingAdmin,
          auditChanges: [
            { module: 'roles_permissions', permissionChanged: 'create_custom_role', previousValue: null, newValue: newRole.name }
          ]
        });
        setSelectedRoleId(slug);
        setStatusMessage(`Custom role "${newRole.name}" created.`);
      } else {
        await liveRbacService.saveRolePolicy({
          studioId: selectedStudioId,
          role: {
            ...activeRole,
            name: customRoleModal.name.trim(),
            label: customRoleModal.name.trim(),
            description: customRoleModal.description.trim() || activeRole.description
          },
          actingAdmin,
          auditChanges: [
            { module: 'roles_permissions', permissionChanged: 'rename_role', previousValue: activeRole.label, newValue: customRoleModal.name.trim() }
          ]
        });
        setStatusMessage(`Role renamed to "${customRoleModal.name.trim()}".`);
      }
      setCustomRoleModal(null);
      setSaveState('saved');
      await loadRbacData(selectedStudioId);
    } catch (err: any) {
      setSaveState('error');
      setStatusMessage(err?.message || 'Failed to save custom role.');
    }
  };

  const handleDeleteCustomRole = async () => {
    if (selectedStudioId === 'all' || activeRole.isSystemRole) return;
    if (!window.confirm(`Delete custom role "${activeRole.label}"?`)) return;
    setSaveState('saving');
    try {
      await liveRbacService.deleteCustomRole(selectedStudioId, activeRole.id, actingAdmin);
      setSelectedRoleId('studio_owner');
      setStatusMessage(`Custom role "${activeRole.label}" deleted.`);
      setSaveState('saved');
      await loadRbacData(selectedStudioId);
    } catch (err: any) {
      setSaveState('error');
      setStatusMessage(err?.message || 'Failed to delete role.');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-24 w-full max-w-full overflow-x-hidden">
      {/* Header & Save Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
              Live Master RBAC
            </span>
            <span className="text-xs text-zinc-500">28 Modules • 12 Actions • Real-Time Firebase Sync</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 font-display tracking-tight mt-1">
            Roles & Live Permissions
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {saveState === 'saving' && (
            <span className="text-xs font-semibold text-zinc-600 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" /> Saving...
            </span>
          )}
          {saveState === 'saved' && (
            <span className="text-xs font-semibold text-emerald-700 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" /> Saved
            </span>
          )}
          {saveState === 'error' && (
            <span className="text-xs font-semibold text-rose-700 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200">
              <AlertCircle className="w-3.5 h-3.5" /> Failed
            </span>
          )}

          <button
            onClick={handleSave}
            disabled={saveState === 'saving' || (targetMode === 'user' && !activeUser)}
            className="min-h-[44px] px-4 py-2 text-xs font-black rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 inline-flex items-center gap-2 shadow-md shadow-amber-500/20 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>
              {selectedStudioId === 'all'
                ? 'Save Global Policies'
                : targetMode === 'user'
                  ? 'Save User Overrides'
                  : 'Save Studio Policies'}
            </span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 border ${
            saveState === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage(null)} className="font-bold opacity-70 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {/* Studio Selector + Target Mode */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-3.5 sm:p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">
              1. Scope / Studio
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
              <select
                value={selectedStudioId}
                onChange={(e) => setSelectedStudioId(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-sm font-bold text-zinc-900 focus:outline-none focus:border-amber-500 min-h-[44px]"
              >
                <option value="all">All Studios (Global Default Templates)</option>
                {studios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.city ? `(${s.city})` : ''} — {s.id}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">
              2. Target Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setTargetMode('role')}
                className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 border transition-all ${
                  targetMode === 'role'
                    ? 'bg-zinc-900 text-white border-zinc-900'
                    : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>Roles & Custom</span>
              </button>
              <button
                onClick={() => selectedStudioId !== 'all' && setTargetMode('user')}
                disabled={selectedStudioId === 'all'}
                className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 border transition-all ${
                  targetMode === 'user'
                    ? 'bg-zinc-900 text-white border-zinc-900'
                    : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <Users className="w-4 h-4" />
                <span>Individual User</span>
              </button>
            </div>
          </div>
        </div>

        {/* Role Selector OR Individual User Selector */}
        {targetMode === 'role' ? (
          <div className="space-y-2 pt-2 border-t border-zinc-100">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                Select Role (All Roles & Studio Owner Editable)
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {selectedStudioId !== 'all' && (
                  <>
                    <button
                      onClick={() =>
                        setCustomRoleModal({
                          mode: 'create',
                          name: '',
                          description: '',
                          cloneFromId: activeRole.id
                        })
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 text-xs font-bold inline-flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> New Custom Role
                    </button>
                    <button
                      onClick={() =>
                        setCustomRoleModal({
                          mode: 'create',
                          name: `${activeRole.label} Copy`,
                          description: activeRole.description,
                          cloneFromId: activeRole.id
                        })
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50 text-xs font-bold inline-flex items-center gap-1"
                    >
                      <Copy className="w-3.5 h-3.5" /> Duplicate
                    </button>
                    <button
                      onClick={() =>
                        setCustomRoleModal({
                          mode: 'rename',
                          name: activeRole.label,
                          description: activeRole.description,
                          cloneFromId: activeRole.id
                        })
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50 text-xs font-bold inline-flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Rename
                    </button>
                    <button
                      onClick={handleResetRoleToGlobal}
                      className="px-2.5 py-1.5 rounded-lg bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50 text-xs font-bold inline-flex items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Reset
                    </button>
                    {!activeRole.isSystemRole && (
                      <button
                        onClick={handleDeleteCustomRole}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 text-xs font-bold inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {effectiveRolesList.map((role) => {
                const isSelected = role.id === activeRole.id;
                return (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRoleId(role.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                      isSelected
                        ? 'bg-amber-500 text-zinc-950 border-amber-500 shadow-sm'
                        : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                    }`}
                  >
                    {role.label}
                    {!role.isSystemRole && ' ★'}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-2 pt-2 border-t border-zinc-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex-1">
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">
                  Select Studio User (Owner or Employee)
                </label>
                <select
                  value={selectedUserUid}
                  onChange={(e) => setSelectedUserUid(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-sm font-bold text-zinc-900 min-h-[44px]"
                >
                  {studioUsers.length === 0 ? (
                    <option value="">No users found in this studio</option>
                  ) : (
                    studioUsers.map((u) => (
                      <option key={u.uid} value={u.uid}>
                        {u.displayName} ({u.loginId}) — Role: {u.roleId}
                      </option>
                    ))
                  )}
                </select>
              </div>
              {activeUser && (
                <div className="flex items-end gap-2">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">
                      Assigned Role
                    </label>
                    <select
                      value={activeUser.roleId}
                      onChange={async (e) => {
                        await liveRbacService.assignUserRole(
                          selectedStudioId,
                          activeUser.uid,
                          e.target.value,
                          actingAdmin
                        );
                        await loadRbacData(selectedStudioId);
                      }}
                      className="px-3 py-2.5 rounded-xl bg-white border border-zinc-200 text-xs font-bold text-zinc-800 min-h-[44px]"
                    >
                      {effectiveRolesList.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={handleResetUserOverrides}
                    className="min-h-[44px] px-3 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold inline-flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reset to Role Defaults
                  </button>
                </div>
              )}
            </div>
            {activeUser && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-600">
                <span className="px-2 py-0.5 rounded bg-zinc-100 font-semibold">Inherited from Role</span>
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                  Individually Allowed
                </span>
                <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200 font-semibold">
                  Individually Denied
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sub Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { id: 'matrix', label: 'Permissions Matrix' },
            { id: 'scopes', label: 'Resource Scopes' },
            { id: 'fields', label: 'Field-Level Access' },
            { id: 'history', label: 'Change History' }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveSubTab(t.id as any)}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeSubTab === t.id
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {(activeSubTab === 'matrix' || activeSubTab === 'scopes') && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={moduleSearch}
                onChange={(e) => setModuleSearch(e.target.value)}
                placeholder="Filter modules..."
                className="pl-8 pr-3 py-1.5 bg-white border border-zinc-200 rounded-xl text-xs text-zinc-800 focus:outline-none focus:border-amber-400"
              />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-white border border-zinc-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-zinc-700"
            >
              {moduleCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories (28)' : cat}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-16 flex items-center justify-center gap-2 text-zinc-500 text-sm bg-white border border-zinc-200 rounded-2xl">
          <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
          <span>Loading live RBAC policies...</span>
        </div>
      ) : (
        <>
          {/* SUBTAB 1: MATRIX (Desktop Table + Mobile Expandable Cards) */}
          {activeSubTab === 'matrix' && (
            <>
              {/* Desktop Matrix */}
              <div className="hidden md:block bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-zinc-50 text-zinc-600 text-xs uppercase font-bold border-b border-zinc-200">
                      <tr>
                        <th className="px-4 py-3 sticky left-0 bg-zinc-50 z-10 min-w-[220px]">Module (28)</th>
                        {MASTER_ACTIONS_CATALOG.map((act) => (
                          <th key={act.id} className="px-2.5 py-3 text-center" title={act.description}>
                            <span className={act.isSensitive ? 'text-amber-700 font-black' : ''}>{act.label}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {filteredModules.map((mod) => (
                        <tr key={mod.id} className="hover:bg-zinc-50/70">
                          <td className="px-4 py-3 sticky left-0 bg-white font-semibold text-zinc-900 border-r border-zinc-200">
                            <div>{mod.label}</div>
                            <div className="text-xs text-zinc-400 font-normal">{mod.category}</div>
                          </td>
                          {MASTER_ACTIONS_CATALOG.map((act) => {
                            if (targetMode === 'role') {
                              const isGranted = Boolean(draftPermissions?.[mod.id]?.[act.id]);
                              return (
                                <td key={act.id} className="px-2.5 py-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleRoleAction(mod.id, act.id)}
                                    title={`${act.label} on ${mod.label}`}
                                    className={`w-7 h-7 rounded-lg inline-flex items-center justify-center border transition-all cursor-pointer ${
                                      isGranted
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                                        : 'bg-white text-zinc-400 border-zinc-200 hover:border-zinc-400'
                                    }`}
                                  >
                                    {isGranted ? <Check className="w-4 h-4" /> : <X className="w-3.5 h-3.5" />}
                                  </button>
                                </td>
                              );
                            } else {
                              const { allowed, state } = getUserEffectiveAction(mod.id, act.id);
                              return (
                                <td key={act.id} className="px-2.5 py-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleUserAction(mod.id, act.id)}
                                    title={`${act.label}: ${state}`}
                                    className={`w-7 h-7 rounded-lg inline-flex items-center justify-center border transition-all cursor-pointer ${
                                      state === 'allowed'
                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-400 ring-2 ring-emerald-200'
                                        : state === 'denied'
                                          ? 'bg-rose-100 text-rose-800 border-rose-400 ring-2 ring-rose-200'
                                          : allowed
                                            ? 'bg-zinc-100 text-zinc-800 border-zinc-300'
                                            : 'bg-white text-zinc-300 border-zinc-200'
                                    }`}
                                  >
                                    {allowed ? <Check className="w-4 h-4" /> : <X className="w-3.5 h-3.5" />}
                                  </button>
                                </td>
                              );
                            }
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Expandable Module Cards */}
              <div className="md:hidden space-y-2.5">
                {filteredModules.map((mod) => {
                  const isOpen = expandedMobileMod === mod.id;
                  const enabledCount =
                    targetMode === 'role'
                      ? MASTER_ACTIONS_CATALOG.filter((a) => Boolean(draftPermissions?.[mod.id]?.[a.id])).length
                      : MASTER_ACTIONS_CATALOG.filter((a) => getUserEffectiveAction(mod.id, a.id).allowed).length;

                  return (
                    <div key={mod.id} className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setExpandedMobileMod(isOpen ? null : mod.id)}
                        className="w-full px-4 py-3.5 flex items-center justify-between text-left min-h-[52px]"
                      >
                        <div>
                          <div className="text-sm font-bold text-zinc-900">{mod.label}</div>
                          <div className="text-xs text-zinc-500">
                            {mod.category} · {enabledCount}/12 enabled
                          </div>
                        </div>
                        {isOpen ? (
                          <ChevronUp className="w-5 h-5 text-zinc-400 shrink-0" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-zinc-400 shrink-0" />
                        )}
                      </button>

                      {isOpen && (
                        <div className="px-4 pb-4 pt-2 border-t border-zinc-100 grid grid-cols-1 gap-2">
                          {MASTER_ACTIONS_CATALOG.map((act) => {
                            if (targetMode === 'role') {
                              const isGranted = Boolean(draftPermissions?.[mod.id]?.[act.id]);
                              return (
                                <button
                                  key={act.id}
                                  type="button"
                                  onClick={() => handleToggleRoleAction(mod.id, act.id)}
                                  className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50/70 flex items-center justify-between"
                                >
                                  <span className="text-xs font-semibold text-zinc-800">{act.label}</span>
                                  <span
                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                                      isGranted
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-zinc-200 text-zinc-600'
                                    }`}
                                  >
                                    {isGranted ? 'Allowed' : 'Denied'}
                                  </span>
                                </button>
                              );
                            } else {
                              const { allowed, state } = getUserEffectiveAction(mod.id, act.id);
                              return (
                                <button
                                  key={act.id}
                                  type="button"
                                  onClick={() => handleToggleUserAction(mod.id, act.id)}
                                  className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50/70 flex items-center justify-between"
                                >
                                  <span className="text-xs font-semibold text-zinc-800">{act.label}</span>
                                  <span
                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                                      state === 'allowed'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : state === 'denied'
                                          ? 'bg-rose-100 text-rose-800'
                                          : allowed
                                            ? 'bg-zinc-200 text-zinc-800'
                                            : 'bg-zinc-100 text-zinc-500'
                                    }`}
                                  >
                                    {state === 'inherited' ? (allowed ? 'Inherited (Allow)' : 'Inherited (Deny)') : state}
                                  </span>
                                </button>
                              );
                            }
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* SUBTAB 2: RESOURCE SCOPES */}
          {activeSubTab === 'scopes' && (
            <div className="bg-white border border-zinc-200 rounded-2xl p-4 sm:p-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Resource Access Scopes</h3>
                <p className="text-xs text-zinc-500">
                  Control whether records are scoped to All Studio, Assigned Only, Branch Only, Department Only, or None.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredModules.map((mod) => {
                  const val =
                    targetMode === 'role'
                      ? draftScopes[mod.id] || 'all'
                      : draftUserScopes[mod.id] || activeUserInheritedRole.scopes?.[mod.id] || 'all';
                  return (
                    <div
                      key={mod.id}
                      className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div>
                        <div className="text-xs font-bold text-zinc-900">{mod.label}</div>
                        <div className="text-xs text-zinc-500">{mod.category}</div>
                      </div>
                      <select
                        value={val}
                        onChange={(e) => {
                          const nextScope = e.target.value as MasterResourceScope;
                          if (targetMode === 'role') {
                            setDraftScopes((prev) => ({ ...prev, [mod.id]: nextScope }));
                          } else {
                            setDraftUserScopes((prev) => ({ ...prev, [mod.id]: nextScope }));
                          }
                          setSaveState('idle');
                        }}
                        className="bg-white border border-zinc-300 rounded-xl px-3 py-2 text-xs font-bold text-zinc-900 min-h-[40px]"
                      >
                        {MASTER_RESOURCE_SCOPES.map((sc) => (
                          <option key={sc.id} value={sc.id}>
                            {sc.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SUBTAB 3: FIELD-LEVEL ACCESS */}
          {activeSubTab === 'fields' && (
            <div className="bg-white border border-zinc-200 rounded-2xl p-4 sm:p-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Field-Level Access (PII & Financials)</h3>
                <p className="text-xs text-zinc-500">
                  Independently toggle Field Visible and Field Editable for Customer PII and Financial values.
                </p>
              </div>
              <div className="divide-y divide-zinc-100">
                {GLOBAL_FIELD_POLICIES.map((policy) => {
                  const key = `${policy.module}.${policy.fieldName}`;
                  const basePolicy = draftFieldAccess[key] || {
                    visible: policy.visibleRoles.includes(activeRole.id as any),
                    editable: policy.editableRoles.includes(activeRole.id as any)
                  };

                  const userOvr = draftUserFields[key];
                  const isVisible =
                    targetMode === 'role'
                      ? basePolicy.visible
                      : userOvr?.visible === true || userOvr?.visible === false
                        ? userOvr.visible
                        : Boolean(activeUserInheritedRole.fieldAccess?.[key]?.visible);
                  const isEditable =
                    targetMode === 'role'
                      ? basePolicy.editable
                      : userOvr?.editable === true || userOvr?.editable === false
                        ? userOvr.editable
                        : Boolean(activeUserInheritedRole.fieldAccess?.[key]?.editable);

                  return (
                    <div
                      key={key}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-zinc-900 text-sm">{policy.fieldLabel}</span>
                          {policy.isPii && (
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
                              Client PII
                            </span>
                          )}
                          {policy.isFinancial && (
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              Financial
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-zinc-500 font-mono mt-0.5">{key}</div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (targetMode === 'role') {
                              setDraftFieldAccess((prev) => ({
                                ...prev,
                                [key]: { visible: !isVisible, editable: isVisible ? false : basePolicy.editable }
                              }));
                            } else {
                              setDraftUserFields((prev) => ({
                                ...prev,
                                [key]: { ...(prev[key] || {}), visible: !isVisible }
                              }));
                            }
                            setSaveState('idle');
                          }}
                          className={`min-h-[40px] px-3 py-1.5 rounded-xl font-bold border transition-all ${
                            isVisible
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-zinc-100 text-zinc-500 border-zinc-200'
                          }`}
                        >
                          {isVisible ? 'Field Visible' : 'Field Hidden'}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (targetMode === 'role') {
                              setDraftFieldAccess((prev) => ({
                                ...prev,
                                [key]: { visible: !isEditable ? true : basePolicy.visible, editable: !isEditable }
                              }));
                            } else {
                              setDraftUserFields((prev) => ({
                                ...prev,
                                [key]: { ...(prev[key] || {}), editable: !isEditable }
                              }));
                            }
                            setSaveState('idle');
                          }}
                          className={`min-h-[40px] px-3 py-1.5 rounded-xl font-bold border transition-all ${
                            isEditable
                              ? 'bg-indigo-50 text-indigo-800 border-indigo-300'
                              : 'bg-zinc-100 text-zinc-500 border-zinc-200'
                          }`}
                        >
                          {isEditable ? 'Field Editable' : 'Read-Only'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SUBTAB 4: AUDIT HISTORY */}
          {activeSubTab === 'history' && (
            <div className="bg-white border border-zinc-200 rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-zinc-900">RBAC Change History</h3>
              </div>
              {auditLogs.length === 0 ? (
                <p className="text-xs text-zinc-500 py-6 text-center">No RBAC policy changes recorded yet.</p>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div>
                        <span className="font-bold text-zinc-900">{log.targetId}</span> ·{' '}
                        <span className="font-mono text-zinc-600">
                          {log.module}.{log.permissionChanged}
                        </span>{' '}
                        <span className="text-zinc-500">
                          ({String(log.previousValue)} → {String(log.newValue)})
                        </span>
                        <div className="text-zinc-400 mt-0.5">
                          By {log.actingAdmin} · Studio: {log.studioId}
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
        </>
      )}

      {/* Custom Role Create / Rename Modal */}
      {customRoleModal && (
        <div 
          className="fixed inset-0 z-50 bg-zinc-950/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCustomRoleModal(null);
          }}
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleCreateOrRenameCustomRole}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-md bg-white border border-zinc-200 rounded-3xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-zinc-900">
                {customRoleModal.mode === 'create' ? 'Create Custom Role' : 'Rename Role'}
              </h3>
              <button
                type="button"
                onClick={() => setCustomRoleModal(null)}
                className="min-w-[36px] min-h-[36px] rounded-lg text-zinc-400 hover:text-zinc-700 flex items-center justify-center"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Role Name</label>
                <input
                  type="text"
                  required
                  value={customRoleModal.name}
                  onChange={(e) => setCustomRoleModal({ ...customRoleModal, name: e.target.value })}
                  placeholder="e.g. Senior Drone Pilot"
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-300 text-sm text-zinc-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Description</label>
                <input
                  type="text"
                  value={customRoleModal.description}
                  onChange={(e) => setCustomRoleModal({ ...customRoleModal, description: e.target.value })}
                  placeholder="Optional description"
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-300 text-sm text-zinc-900"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCustomRoleModal(null)}
                className="px-4 py-2 rounded-xl bg-zinc-100 text-zinc-800 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 text-xs font-black"
              >
                {customRoleModal.mode === 'create' ? 'Create Role' : 'Save Name'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
