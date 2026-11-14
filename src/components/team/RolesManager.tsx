import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Role, RolePermissions } from '../../types';
import { 
  ShieldCheck, 
  Plus, 
  Copy, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  Lock, 
  AlertCircle,
  Sparkles,
  Info
} from 'lucide-react';
import { Button } from '../ui/Button';

export const RolesManager: React.FC = () => {
  const { roles, createRole, updateRole, deleteRole, duplicateRole } = useApp();

  const [selectedRole, setSelectedRole] = useState<Role | null>(roles[0] || null);
  const [isEditing, setIsEditing] = useState(false);
  const [roleName, setRoleName] = useState('');
  const [roleDesc, setRoleDesc] = useState('');
  const [permissions, setPermissions] = useState<RolePermissions | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSelectRole = (r: Role) => {
    setSelectedRole(r);
    setIsEditing(false);
    setError(null);
  };

  const handleStartCreate = () => {
    setSelectedRole(null);
    setRoleName('Custom Role');
    setRoleDesc('Custom studio permissions template');
    setPermissions({
      events: { view: true, create: false, edit: false, delete: false },
      subEvents: { view: true, create: false, edit: false, delete: false },
      customers: { view: true, create: false, edit: false, delete: false },
      team: { view: false, create: false, edit: false, delete: false },
      roles: { view: false, create: false, edit: false, delete: false },
      salary: { view: false, edit: false },
      payroll: { view: false, manage: false },
      leave: { request: true, viewAll: false, approve: false },
      tasks: { view: true, create: false, edit: true, delete: false },
      settings: { view: false, edit: false }
    });
    setIsEditing(true);
    setError(null);
  };

  const handleStartEdit = (r: Role) => {
    setSelectedRole(r);
    setRoleName(r.name);
    setRoleDesc(r.description || '');
    setPermissions(JSON.parse(JSON.stringify(r.permissions)));
    setIsEditing(true);
    setError(null);
  };

  const handleDuplicate = (r: Role) => {
    try {
      const dup = duplicateRole(r.id);
      setSelectedRole(dup);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = (r: Role) => {
    try {
      deleteRole(r.id);
      setSelectedRole(roles.find(item => item.id !== r.id) || null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const togglePermission = (module: keyof RolePermissions, action: string) => {
    if (!permissions) return;
    const current = (permissions[module] as any)[action];
    setPermissions({
      ...permissions,
      [module]: {
        ...(permissions[module] as any),
        [action]: !current
      }
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) {
      setError('Role title is required.');
      return;
    }
    if (!permissions) return;

    try {
      if (selectedRole) {
        updateRole(selectedRole.id, {
          name: roleName.trim(),
          description: roleDesc.trim(),
          permissions
        });
        setIsEditing(false);
      } else {
        const created = createRole({
          name: roleName.trim(),
          description: roleDesc.trim(),
          permissions,
          color: 'indigo'
        });
        setSelectedRole(created);
        setIsEditing(false);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const modulesList: Array<{ key: keyof RolePermissions; label: string; actions: string[] }> = [
    { key: 'events', label: 'Main Events', actions: ['view', 'create', 'edit', 'delete'] },
    { key: 'subEvents', label: 'Sub-Events & Ceremonies', actions: ['view', 'create', 'edit', 'delete'] },
    { key: 'customers', label: 'Customer CRM', actions: ['view', 'create', 'edit', 'delete'] },
    { key: 'team', label: 'Employees & Crew', actions: ['view', 'create', 'edit', 'delete'] },
    { key: 'roles', label: 'Roles & Permissions', actions: ['view', 'create', 'edit', 'delete'] },
    { key: 'tasks', label: 'Tasks', actions: ['view', 'create', 'edit', 'delete'] },
    { key: 'salary', label: 'Salary Information (Admin Only)', actions: ['view', 'edit'] },
    { key: 'payroll', label: 'Payroll Management (Admin Only)', actions: ['view', 'manage'] },
    { key: 'leave', label: 'Leave Management', actions: ['request', 'viewAll', 'approve'] },
    { key: 'settings', label: 'Studio Settings', actions: ['view', 'edit'] }
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-zinc-200">
        <div>
          <h3 className="text-base font-bold text-zinc-900 font-display flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            Configurable Roles & Permissions Matrix
          </h3>
          <p className="text-xs text-zinc-500">
            Define unlimited custom employee roles and configure module-level security rights
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          className="bg-zinc-900 text-white shrink-0"
          icon={<Plus className="w-4 h-4" />}
          onClick={handleStartCreate}
        >
          Create Custom Role
        </Button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Two Column Layout: Role List on Left, Permissions Editor on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Roles List */}
        <div className="lg:col-span-4 space-y-2">
          <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider px-1">
            Available Roles ({roles.length})
          </div>
          <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
            {roles.map(r => {
              const isSelected = selectedRole?.id === r.id;
              return (
                <div
                  key={r.id}
                  onClick={() => handleSelectRole(r)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs'
                      : 'bg-white border-zinc-200 hover:border-zinc-300 text-zinc-800'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold truncate">{r.name}</p>
                      {r.isSystem && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-zinc-100 text-zinc-600'
                        }`}>
                          System
                        </span>
                      )}
                    </div>
                    {r.description && (
                      <p className={`text-[10px] truncate ${isSelected ? 'text-zinc-300' : 'text-zinc-500'}`}>
                        {r.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => handleDuplicate(r)}
                      className={`p-1 rounded hover:bg-white/20 transition-colors ${isSelected ? 'text-zinc-300' : 'text-zinc-400 hover:text-zinc-700'}`}
                      title="Duplicate Role"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {!r.isSystem && (
                      <button
                        onClick={() => handleDelete(r)}
                        className="p-1 rounded text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete Role"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Permissions Matrix */}
        <div className="lg:col-span-8">
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-zinc-200 space-y-4">
            {isEditing ? (
              <form onSubmit={handleSave} className="space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                  <h4 className="font-bold text-sm text-zinc-900">
                    {selectedRole ? `Edit Role: ${selectedRole.name}` : 'New Custom Role'}
                  </h4>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="xs" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary" size="xs" className="bg-zinc-900 text-white">
                      Save Role
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">Role Title *</label>
                    <input
                      type="text"
                      value={roleName}
                      onChange={e => setRoleName(e.target.value)}
                      required
                      className="w-full px-3 py-1.5 rounded-xl border border-zinc-300 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">Description</label>
                    <input
                      type="text"
                      value={roleDesc}
                      onChange={e => setRoleDesc(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-zinc-300 text-xs"
                    />
                  </div>
                </div>

                {/* Permissions Grid */}
                <div className="space-y-2 pt-2 border-t border-zinc-100">
                  <div className="text-xs font-bold text-zinc-700">Module Access Rights</div>
                  <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-xl overflow-hidden">
                    {modulesList.map(mod => {
                      const modPerms = (permissions as any)?.[mod.key] || {};
                      return (
                        <div key={mod.key} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs bg-white">
                          <span className="font-semibold text-zinc-800">{mod.label}</span>
                          <div className="flex flex-wrap items-center gap-3">
                            {mod.actions.map(action => (
                              <label key={action} className="flex items-center gap-1.5 text-xs text-zinc-600 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={!!modPerms[action]}
                                  onChange={() => togglePermission(mod.key, action)}
                                  className="w-4 h-4 rounded text-zinc-900 accent-zinc-900"
                                />
                                <span className="capitalize">{action}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </form>
            ) : selectedRole ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-base text-zinc-900">{selectedRole.name}</h4>
                      {selectedRole.isSystem && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700">
                          System Role
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">{selectedRole.description}</p>
                  </div>

                  <Button
                    variant="outline"
                    size="xs"
                    icon={<Edit3 className="w-3.5 h-3.5" />}
                    onClick={() => handleStartEdit(selectedRole)}
                  >
                    Edit Permissions
                  </Button>
                </div>

                {/* Permissions Breakdown */}
                <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-xl overflow-hidden">
                  {modulesList.map(mod => {
                    const modPerms = (selectedRole.permissions as any)[mod.key] || {};
                    return (
                      <div key={mod.key} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs bg-white">
                        <span className="font-semibold text-zinc-800">{mod.label}</span>
                        <div className="flex flex-wrap items-center gap-2">
                          {mod.actions.map(act => {
                            const isGranted = !!modPerms[act];
                            return (
                              <span
                                key={act}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                                  isGranted
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-zinc-100 text-zinc-400'
                                }`}
                              >
                                {isGranted ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-zinc-400" />}
                                <span className="capitalize">{act}</span>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-400 italic text-center py-8">Select a role from the left list.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
