import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Role } from '../types/schema';
import { AdvancedPermissionMatrix } from '../components/roles/AdvancedPermissionMatrix';
import { EmployeeOverrideModal } from '../components/roles/EmployeeOverrideModal';
import { ApprovalQueueModal } from '../components/roles/ApprovalQueueModal';
import { Button } from '../components/ui/Button';
import { 
  Shield, 
  ShieldCheck, 
  Plus, 
  Copy, 
  Trash2, 
  RotateCcw, 
  Users, 
  Lock, 
  Sliders, 
  CheckCircle2, 
  UserPlus, 
  ListOrdered 
} from 'lucide-react';

export const RolesPage: React.FC = () => {
  const { 
    roles, 
    updateRole, 
    createRole, 
    deleteRole, 
    duplicateRole, 
    restoreDefaultRoles,
    employees,
    permissionOverrides,
    createPermissionOverride,
    deletePermissionOverride,
    approvalRequests,
    approveApprovalRequest,
    rejectApprovalRequest
  } = useApp();

  const [selectedRoleId, setSelectedRoleId] = useState<string>(roles[0]?.id || '');
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isNewRoleModalOpen, setIsNewRoleModalOpen] = useState(false);

  // New Role Form State
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [newRoleColor, setNewRoleColor] = useState('indigo');

  const selectedRole = roles.find(r => r.id === selectedRoleId) || roles[0];

  // Assigned employee count per role
  const roleMemberCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    employees.forEach(emp => {
      if (emp.roleId) {
        counts[emp.roleId] = (counts[emp.roleId] || 0) + 1;
      }
      if (emp.assignedRoleIds && Array.isArray(emp.assignedRoleIds)) {
        emp.assignedRoleIds.forEach(id => {
          counts[id] = (counts[id] || 0) + 1;
        });
      }
    });
    return counts;
  }, [employees]);

  const handleCreateRoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;

    const created = createRole({
      name: newRoleName.trim(),
      description: newRoleDesc.trim() || undefined,
      color: newRoleColor,
      isSystem: false,
      permissions: {
        dashboard: { view: true, scope: 'assigned' },
        events: { view: true, scope: 'assigned' },
        subEvents: { view: true, scope: 'assigned' },
        customers: { view: true, scope: 'assigned' },
        tasks: { view: true, edit: true, scope: 'assigned' }
      }
    });

    setNewRoleName('');
    setNewRoleDesc('');
    setIsNewRoleModalOpen(false);
    if (created?.id) setSelectedRoleId(created.id);
  };

  const handleDuplicate = (roleId: string) => {
    const dup = duplicateRole(roleId);
    if (dup?.id) setSelectedRoleId(dup.id);
  };

  const handleDelete = (role: Role) => {
    if (role.name === 'Studio Owner') {
      alert('The Studio Owner role is protected and cannot be deleted.');
      return;
    }
    const memberCount = roleMemberCounts[role.id] || 0;
    if (memberCount > 0) {
      alert(`Cannot delete role "${role.name}" because it is currently assigned to ${memberCount} employee(s).`);
      return;
    }
    if (confirm(`Are you sure you want to delete the role "${role.name}"?`)) {
      deleteRole(role.id);
      setSelectedRoleId(roles[0]?.id || '');
    }
  };

  const handleRestoreDefaults = () => {
    if (confirm('Restore all 13 standard default roles? Custom roles you created will remain untouched.')) {
      restoreDefaultRoles();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">
                Advanced Roles & Permissions (RBAC)
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500">
                Configure module privileges across 24 modules, resource scopes, field restrictions and custom overrides.
              </p>
            </div>
          </div>
        </div>

        {/* Global Toolbar Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsApprovalModalOpen(true)}
            className="relative"
          >
            <ListOrdered className="w-4 h-4 mr-1.5" />
            Approvals Queue
            {approvalRequests.filter(r => r.status === 'pending').length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                {approvalRequests.filter(r => r.status === 'pending').length}
              </span>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsOverrideModalOpen(true)}
          >
            <UserPlus className="w-4 h-4 mr-1.5" />
            Employee Overrides
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRestoreDefaults}
            title="Restore standard Studio OS role presets"
          >
            <RotateCcw className="w-4 h-4 mr-1.5" />
            Restore Defaults
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsNewRoleModalOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            New Role
          </Button>
        </div>
      </div>

      {/* Main Split-Screen Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[680px]">
        {/* Left Column: Role Directory (4 Cols on lg) */}
        <div className="lg:col-span-4 flex flex-col rounded-2xl border border-zinc-200 bg-white shadow-xs overflow-hidden">
          <div className="p-4 border-b border-zinc-100 bg-zinc-50/60 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-zinc-900">Configured Roles</h3>
              <p className="text-xs text-zinc-500">{roles.length} roles available</p>
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-700">
              {employees.length} Employees Active
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 max-h-[640px]">
            {roles.map(r => {
              const isSelected = r.id === selectedRoleId;
              const isOwner = r.name === 'Studio Owner';
              const memberCount = roleMemberCounts[r.id] || 0;

              return (
                <div
                  key={r.id}
                  onClick={() => setSelectedRoleId(r.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs'
                      : 'bg-white text-zinc-800 border-zinc-200/80 hover:bg-zinc-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        isOwner ? 'bg-emerald-400' : isSelected ? 'bg-indigo-400' : 'bg-zinc-400'
                      }`} />
                      <span className="font-bold text-xs sm:text-sm truncate">
                        {r.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isOwner ? (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isSelected ? 'bg-emerald-950 text-emerald-300' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          Owner
                        </span>
                      ) : r.isSystem ? (
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          isSelected ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-600'
                        }`}>
                          System
                        </span>
                      ) : null}

                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded flex items-center gap-1 ${
                        isSelected ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-500'
                      }`}>
                        <Users className="w-2.5 h-2.5" /> {memberCount}
                      </span>
                    </div>
                  </div>

                  <p className={`text-[11px] line-clamp-1 mt-1 ${
                    isSelected ? 'text-zinc-300' : 'text-zinc-500'
                  }`}>
                    {r.description || 'Custom studio role.'}
                  </p>

                  {/* Actions Row */}
                  <div className="mt-2.5 pt-2 border-t border-zinc-200/20 flex items-center justify-between">
                    <span className="text-[10px] opacity-70">
                      {Object.keys(r.permissions || {}).length} modules configured
                    </span>

                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleDuplicate(r.id)}
                        className={`p-1 rounded hover:bg-white/20 transition-colors cursor-pointer ${
                          isSelected ? 'text-zinc-300 hover:text-white' : 'text-zinc-500 hover:text-zinc-800'
                        }`}
                        title="Duplicate Role"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      {!isOwner && !r.isSystem && (
                        <button
                          type="button"
                          onClick={() => handleDelete(r)}
                          className={`p-1 rounded hover:bg-rose-500/20 transition-colors cursor-pointer ${
                            isSelected ? 'text-rose-300 hover:text-rose-200' : 'text-zinc-400 hover:text-rose-600'
                          }`}
                          title="Delete Role"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Dynamic Permission Builder (8 Cols on lg) */}
        <div className="lg:col-span-8 h-full">
          {selectedRole ? (
            <AdvancedPermissionMatrix
              key={selectedRole.id}
              role={selectedRole}
              onSave={updated => updateRole(selectedRole.id, updated)}
              isOwnerRole={selectedRole.name === 'Studio Owner'}
            />
          ) : (
            <div className="h-full rounded-2xl border border-zinc-200 bg-white flex items-center justify-center p-8 text-zinc-500">
              Select a role on the left to inspect and configure its permissions.
            </div>
          )}
        </div>
      </div>

      {/* New Role Modal */}
      {isNewRoleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-zinc-200 space-y-4">
            <h3 className="text-base font-bold text-zinc-900">Create New Custom Role</h3>
            <form onSubmit={handleCreateRoleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Role Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Drone Cinematographer / Lighting Specialist"
                  value={newRoleName}
                  onChange={e => setNewRoleName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Role Description</label>
                <textarea
                  rows={3}
                  placeholder="Responsibilities and access scope summary..."
                  value={newRoleDesc}
                  onChange={e => setNewRoleDesc(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Badge Color</label>
                <select
                  value={newRoleColor}
                  onChange={e => setNewRoleColor(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 focus:outline-none cursor-pointer"
                >
                  <option value="indigo">Indigo</option>
                  <option value="cyan">Cyan</option>
                  <option value="teal">Teal</option>
                  <option value="amber">Amber</option>
                  <option value="rose">Rose</option>
                  <option value="purple">Purple</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsNewRoleModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Create Role
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Employee Overrides Modal */}
      <EmployeeOverrideModal
        isOpen={isOverrideModalOpen}
        onClose={() => setIsOverrideModalOpen(false)}
        employees={employees}
        overrides={permissionOverrides}
        onCreateOverride={createPermissionOverride}
        onDeleteOverride={deletePermissionOverride}
      />

      {/* Approvals Queue Modal */}
      <ApprovalQueueModal
        isOpen={isApprovalModalOpen}
        onClose={() => setIsApprovalModalOpen(false)}
        requests={approvalRequests}
        onApprove={approveApprovalRequest}
        onReject={rejectApprovalRequest}
      />
    </div>
  );
};
