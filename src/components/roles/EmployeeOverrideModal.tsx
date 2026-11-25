import React, { useState } from 'react';
import { 
  Employee, 
  PermissionOverride, 
  PermissionModule, 
  PermissionAction, 
  AccessScope 
} from '../../types/schema';
import { PERMISSION_MODULES_CATALOG, ALL_PERMISSION_ACTIONS } from '../../types/rbac';
import { Button } from '../ui/Button';
import { useModalLifecycle } from '../../hooks/useModalLifecycle';
import { 
  X, 
  ShieldAlert, 
  Clock, 
  Trash2, 
  Plus, 
  CheckCircle, 
  XCircle, 
  User, 
  Building 
} from 'lucide-react';

interface EmployeeOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  overrides: PermissionOverride[];
  onCreateOverride: (override: Omit<PermissionOverride, 'id' | 'studioId' | 'createdAt'>) => void;
  onDeleteOverride: (overrideId: string) => void;
}

export const EmployeeOverrideModal: React.FC<EmployeeOverrideModalProps> = ({
  isOpen,
  onClose,
  employees,
  overrides,
  onCreateOverride,
  onDeleteOverride
}) => {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(employees[0]?.id || '');
  const [module, setModule] = useState<PermissionModule>('events');
  const [action, setAction] = useState<PermissionAction>('edit');
  const [granted, setGranted] = useState<boolean>(true); // true = Allow, false = Explicit Deny
  const [scope, setScope] = useState<AccessScope>('all');
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [reason, setReason] = useState<string>('');

  const { handleAttemptClose, handleBackdropClick } = useModalLifecycle({
    isOpen,
    onClose
  });

  if (!isOpen) return null;

  const currentEmployee = employees.find(e => e.id === selectedEmployeeId);
  const employeeOverrides = overrides.filter(o => o.employeeId === selectedEmployeeId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId) return;

    onCreateOverride({
      employeeId: selectedEmployeeId,
      module,
      action,
      granted,
      scope,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      reason: reason.trim() || undefined,
      createdBy: 'Studio Admin'
    });

    setReason('');
    setExpiresAt('');
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden my-8"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900">
                Individual Employee Permission Overrides
              </h3>
              <p className="text-xs text-zinc-500">
                Grant elevated access or enforce strict security blocks per individual.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleAttemptClose}
            className="min-w-[44px] min-h-[44px] text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-100 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Select Employee */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-2">
              Select Employee
            </label>
            <select
              value={selectedEmployeeId}
              onChange={e => setSelectedEmployeeId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/10 cursor-pointer font-medium"
            >
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullName} ({emp.designation} • {emp.roleName})
                </option>
              ))}
            </select>
          </div>

          {/* New Override Form */}
          <form onSubmit={handleSubmit} className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/60 space-y-4">
            <div className="text-xs font-bold text-zinc-800 uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-indigo-600" /> Add New Override for {currentEmployee?.fullName}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Module</label>
                <select
                  value={module}
                  onChange={e => setModule(e.target.value as PermissionModule)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 bg-white focus:outline-none cursor-pointer"
                >
                  {PERMISSION_MODULES_CATALOG.map(m => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Action</label>
                <select
                  value={action}
                  onChange={e => setAction(e.target.value as PermissionAction)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 bg-white focus:outline-none cursor-pointer capitalize"
                >
                  {ALL_PERMISSION_ACTIONS.map(act => (
                    <option key={act} value={act}>{act}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Override Rule</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setGranted(true)}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer border ${
                      granted
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
                    }`}
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Explicit Grant
                  </button>
                  <button
                    type="button"
                    onClick={() => setGranted(false)}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer border ${
                      !granted
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5" /> Explicit Deny
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">
                  Expiration Date (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={e => setExpiresAt(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 bg-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">
                Reason / Justification
              </label>
              <input
                type="text"
                placeholder="e.g. Temporary coverage for wedding lead shooter on leave"
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-zinc-200 bg-white focus:outline-none"
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" size="sm" variant="primary">
                Add Override
              </Button>
            </div>
          </form>

          {/* Active Overrides List */}
          <div>
            <div className="text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2">
              Current Active Overrides ({employeeOverrides.length})
            </div>

            {employeeOverrides.length === 0 ? (
              <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/50 text-center text-xs text-zinc-500">
                No custom permission overrides defined for {currentEmployee?.fullName}. Default role policies apply.
              </div>
            ) : (
              <div className="space-y-2">
                {employeeOverrides.map(ovr => {
                  const isExpired = ovr.expiresAt && new Date(ovr.expiresAt).getTime() < Date.now();

                  return (
                    <div
                      key={ovr.id}
                      className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                        isExpired 
                          ? 'bg-zinc-100/60 border-zinc-200 opacity-60'
                          : ovr.granted 
                          ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950' 
                          : 'bg-rose-50/50 border-rose-200 text-rose-950'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {ovr.granted ? (
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <div>
                          <div className="font-semibold capitalize">
                            {ovr.granted ? 'Grant: ' : 'Explicit Deny: '}
                            <span className="font-mono">{ovr.module}.{ovr.action}</span>
                            {ovr.scope && <span className="text-xs text-zinc-500 ml-1.5">({ovr.scope} scope)</span>}
                          </div>
                          {ovr.reason && (
                            <p className="text-xs text-zinc-600 mt-0.5">{ovr.reason}</p>
                          )}
                          {ovr.expiresAt && (
                            <div className="flex items-center gap-1 text-xs text-zinc-500 mt-0.5">
                              <Clock className="w-3 h-3" />
                              <span>{isExpired ? 'Expired' : 'Expires'}: {new Date(ovr.expiresAt).toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onDeleteOverride(ovr.id)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Revoke Override"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-3 border-t border-zinc-200 bg-zinc-50 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
