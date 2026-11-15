import React, { useState, useMemo } from 'react';
import { 
  Role, 
  PermissionModule, 
  PermissionAction, 
  AccessScope, 
  FieldVisibility, 
  FieldPermissionPolicy 
} from '../../types/schema';
import { PERMISSION_MODULES_CATALOG, ModuleMetadata } from '../../types/rbac';
import { Button } from '../ui/Button';
import { 
  Shield, 
  Check, 
  X, 
  Eye, 
  EyeOff, 
  Sliders, 
  Search, 
  RotateCcw, 
  Save, 
  Lock, 
  ChevronDown, 
  ChevronUp, 
  Info, 
  Layers, 
  AlertCircle 
} from 'lucide-react';

interface AdvancedPermissionMatrixProps {
  role: Role;
  onSave: (updatedRole: Role) => void;
  isOwnerRole?: boolean;
}

export const AdvancedPermissionMatrix: React.FC<AdvancedPermissionMatrixProps> = ({
  role,
  onSave,
  isOwnerRole = false
}) => {
  const [editedRole, setEditedRole] = useState<Role>(JSON.parse(JSON.stringify(role)));
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [expandedFieldModule, setExpandedFieldModule] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Group modules by category
  const categories = useMemo(() => {
    const set = new Set<string>();
    PERMISSION_MODULES_CATALOG.forEach(m => set.add(m.category));
    return ['All', ...Array.from(set)];
  }, []);

  const filteredModules = useMemo(() => {
    return PERMISSION_MODULES_CATALOG.filter(mod => {
      const matchesCategory = selectedCategory === 'All' || mod.category === selectedCategory;
      const matchesSearch = !searchQuery || 
        mod.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mod.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mod.id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  // Action toggle helper
  const toggleAction = (moduleId: PermissionModule, action: PermissionAction) => {
    if (isOwnerRole) return; // Studio owner permissions are locked to full access

    setEditedRole(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as Role;
      if (!next.permissions) next.permissions = {};
      if (!next.permissions[moduleId]) next.permissions[moduleId] = {};

      const currentVal = !!next.permissions[moduleId][action];
      next.permissions[moduleId][action] = !currentVal;

      // If granting an action other than view, ensure view is also granted
      if (!currentVal && action !== 'view') {
        next.permissions[moduleId].view = true;
      }

      return next;
    });
    setHasChanges(true);
    setSaveSuccess(false);
  };

  // Scope change helper
  const changeScope = (moduleId: PermissionModule, scope: AccessScope) => {
    if (isOwnerRole) return;

    setEditedRole(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as Role;
      if (!next.permissions) next.permissions = {};
      if (!next.permissions[moduleId]) next.permissions[moduleId] = {};
      next.permissions[moduleId].scope = scope;
      return next;
    });
    setHasChanges(true);
    setSaveSuccess(false);
  };

  // Field permission toggle helper
  const toggleFieldVisibility = (moduleId: PermissionModule, fieldName: string, visibility: FieldVisibility) => {
    if (isOwnerRole) return;

    setEditedRole(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as Role;
      if (!next.fieldPermissions) next.fieldPermissions = {};
      if (!next.fieldPermissions[moduleId]) next.fieldPermissions[moduleId] = {};
      next.fieldPermissions[moduleId][fieldName] = visibility;
      return next;
    });
    setHasChanges(true);
    setSaveSuccess(false);
  };

  // Category Bulk Select / Clear
  const bulkCategoryToggle = (grant: boolean) => {
    if (isOwnerRole) return;

    setEditedRole(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as Role;
      if (!next.permissions) next.permissions = {};

      filteredModules.forEach(mod => {
        if (!next.permissions[mod.id]) next.permissions[mod.id] = {};
        mod.supportedActions.forEach(act => {
          next.permissions[mod.id][act] = grant;
        });
      });
      return next;
    });
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const handleSave = () => {
    onSave(editedRole);
    setHasChanges(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleReset = () => {
    setEditedRole(JSON.parse(JSON.stringify(role)));
    setHasChanges(false);
    setSaveSuccess(false);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
      {/* Header & Controls Bar */}
      <div className="p-4 sm:p-5 border-b border-zinc-200/80 bg-zinc-50/50 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-indigo-600"></span>
              <h3 className="text-base sm:text-lg font-bold text-zinc-900">
                {role.name} Permissions Matrix
              </h3>
              {role.isSystem && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-700 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> System Role
                </span>
              )}
              {isOwnerRole && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Full Authority
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1">
              {role.description || 'Configure module action permissions, resource access scopes, and field visibility.'}
            </p>
          </div>

          {/* Quick Actions */}
          {!isOwnerRole && (
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => bulkCategoryToggle(true)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                Grant Shown
              </button>
              <button
                type="button"
                onClick={() => bulkCategoryToggle(false)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                Revoke Shown
              </button>
            </div>
          )}
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-zinc-900 text-white shadow-xs'
                    : 'bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200/80'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[200px] sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Filter permissions..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400"
            />
          </div>
        </div>
      </div>

      {/* Main Matrix Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {isOwnerRole && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
            <Info className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              The <strong>Studio Owner</strong> role possesses irrevocable, studio-wide master permissions across all 24 modules for enterprise integrity.
            </span>
          </div>
        )}

        {filteredModules.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 text-sm">
            No modules match your current filter.
          </div>
        ) : (
          filteredModules.map(mod => {
            const modPerms = editedRole.permissions?.[mod.id] || {};
            const currentScope: AccessScope = modPerms.scope || 'all';
            const isFieldExpanded = expandedFieldModule === mod.id;

            return (
              <div
                key={mod.id}
                className="rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 transition-all p-4 shadow-2xs"
              >
                {/* Module Row Top */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-zinc-100 text-zinc-600">
                        {mod.category}
                      </span>
                      <h4 className="text-sm font-bold text-zinc-900">
                        {mod.label}
                      </h4>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {mod.description}
                    </p>
                  </div>

                  {/* Scope Selector */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-medium text-zinc-500">Record Scope:</span>
                    <select
                      value={currentScope}
                      disabled={isOwnerRole}
                      onChange={e => changeScope(mod.id, e.target.value as AccessScope)}
                      className="text-xs font-medium py-1 px-2.5 rounded-lg border border-zinc-200 bg-zinc-50 focus:outline-none focus:ring-1 focus:ring-zinc-900 disabled:opacity-60 cursor-pointer"
                    >
                      <option value="all">All Records</option>
                      <option value="branch">Branch Only</option>
                      <option value="department">Department Only</option>
                      <option value="assigned">Assigned Only</option>
                      <option value="own">Own Records</option>
                    </select>
                  </div>
                </div>

                {/* Actions Grid */}
                <div className="pt-3">
                  <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                    Action Permissions
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {mod.supportedActions.map(action => {
                      const isGranted = isOwnerRole ? true : !!modPerms[action];

                      return (
                        <button
                          key={action}
                          type="button"
                          disabled={isOwnerRole}
                          onClick={() => toggleAction(mod.id, action)}
                          className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2 transition-all cursor-pointer select-none ${
                            isGranted
                              ? 'bg-zinc-900 text-white shadow-xs'
                              : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200/80 hover:text-zinc-800'
                          } ${isOwnerRole ? 'cursor-not-allowed opacity-90' : ''}`}
                        >
                          {isGranted ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <X className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          )}
                          <span className="capitalize">{action}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Field-Level Policy Drawer Toggle */}
                {mod.sensitiveFields && mod.sensitiveFields.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-dashed border-zinc-200">
                    <button
                      type="button"
                      onClick={() => setExpandedFieldModule(isFieldExpanded ? null : mod.id)}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>{isFieldExpanded ? 'Hide' : 'Configure'} Field-Level Permissions ({mod.sensitiveFields.length} sensitive fields)</span>
                      {isFieldExpanded ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
                    </button>

                    {/* Field Permissions Controls */}
                    {isFieldExpanded && (
                      <div className="mt-3 p-3 rounded-xl bg-zinc-50/80 border border-zinc-200 space-y-2">
                        <div className="text-xs font-semibold text-zinc-500">
                          Field Access Rules for {mod.label}:
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {mod.sensitiveFields.map(field => {
                            const currentVisibility: FieldVisibility = 
                              editedRole.fieldPermissions?.[mod.id]?.[field] || 'visible';

                            return (
                              <div
                                key={field}
                                className="flex items-center justify-between p-2 rounded-lg bg-white border border-zinc-200 text-xs"
                              >
                                <span className="font-mono text-xs text-zinc-700">{field}</span>
                                <div className="flex items-center gap-1">
                                  {(['visible', 'editable', 'hidden'] as FieldVisibility[]).map(vis => (
                                    <button
                                      key={vis}
                                      type="button"
                                      disabled={isOwnerRole}
                                      onClick={() => toggleFieldVisibility(mod.id, field, vis)}
                                      className={`px-2 py-1 text-xs font-medium rounded capitalize cursor-pointer transition-colors ${
                                        currentVisibility === vis
                                          ? vis === 'hidden'
                                            ? 'bg-rose-600 text-white'
                                            : vis === 'editable'
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-zinc-800 text-white'
                                          : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                                      }`}
                                    >
                                      {vis}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Sticky Bottom Save Bar */}
      {!isOwnerRole && (
        <div className="p-4 border-t border-zinc-200 bg-white flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2">
            {hasChanges && (
              <span className="text-xs font-medium text-amber-700 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> Unsaved changes
              </span>
            )}
            {saveSuccess && (
              <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-600" /> Permissions saved successfully!
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!hasChanges}
              onClick={handleReset}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!hasChanges}
              onClick={handleSave}
            >
              <Save className="w-3.5 h-3.5 mr-1" /> Save Matrix
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
