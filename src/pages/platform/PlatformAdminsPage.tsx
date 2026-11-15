import React, { useState, useMemo } from 'react';
import { usePlatform } from '../../context/PlatformContext';
import { platformAuthService } from '../../services/platformAuthService';
import { PlatformAdminUser, PlatformRole } from '../../types/schema';
import { 
  Users, 
  Plus, 
  ShieldCheck, 
  ShieldAlert, 
  Trash2, 
  CheckCircle, 
  XCircle,
  Lock
} from 'lucide-react';

export const PlatformAdminsPage: React.FC = () => {
  const { triggerRefresh, refreshTrigger, canAdmin, currentAdmin } = usePlatform();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<PlatformRole>('platform_admin');

  const admins = useMemo(() => {
    return platformAuthService.listAdmins();
  }, [refreshTrigger]);

  const handleCreateAdmin = () => {
    if (!name.trim() || !email.trim()) return;

    try {
      platformAuthService.createAdmin({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role
      });
      setIsModalOpen(false);
      setName('');
      setEmail('');
      triggerRefresh();
    } catch (err: any) {
      alert(err.message || 'Error creating admin');
    }
  };

  const handleDeleteAdmin = (admin: PlatformAdminUser) => {
    if (!window.confirm(`Are you sure you want to delete platform admin account for ${admin.name}?`)) return;

    try {
      platformAuthService.deleteAdmin(admin.id, currentAdmin.id);
      triggerRefresh();
    } catch (err: any) {
      alert(err.message || 'Error deleting admin');
    }
  };

  const handleToggleStatus = (admin: PlatformAdminUser) => {
    const newStatus = admin.status === 'active' ? 'suspended' : 'active';
    try {
      platformAuthService.updateAdmin(admin.id, { status: newStatus }, currentAdmin.id);
      triggerRefresh();
    } catch (err: any) {
      alert(err.message || 'Error updating admin status');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-7 h-7 text-indigo-600" />
            Platform Master Admin & Operations Team
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Provision and govern authorized Studio OS SaaS administrators with role-based platform permissions.
          </p>
        </div>

        {canAdmin('manage_admins') && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" /> Provision Admin
          </button>
        )}
      </div>

      {/* Security Callout */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
        <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-950 leading-relaxed">
          <strong className="font-bold">Strict Role Separation Rule:</strong> Studio Owners and individual studio employees have zero access to platform collections or admin routes. Platform administrator accounts must be provisioned directly here. Platform Master Admins are protected against accidental self-deletion.
        </div>
      </div>

      {/* Admins Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Administrator</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Assigned Role</th>
                <th className="px-4 py-3">Permission Scope</th>
                <th className="px-4 py-3">Account Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {admins.map(admin => {
                const isSuper = admin.role === 'super_admin';
                const isActive = admin.status === 'active';

                return (
                  <tr key={admin.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900">{admin.name}</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">{admin.id}</div>
                    </td>

                    <td className="px-4 py-3.5 font-medium text-slate-700">{admin.email}</td>

                    <td className="px-4 py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                        isSuper ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {admin.role.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="text-xs text-slate-500 font-medium">
                        {isSuper ? 'Full System Master Access' : `${admin.permissions.length} Platform Capabilities`}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase inline-flex items-center gap-1 ${
                        isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {isActive ? <CheckCircle className="w-3 h-3 text-emerald-600" /> : <XCircle className="w-3 h-3 text-rose-600" />}
                        {admin.status}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      {canAdmin('manage_admins') && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleToggleStatus(admin)}
                            className="px-2 py-1 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                          >
                            {isActive ? 'Suspend' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleDeleteAdmin(admin)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100"
                            title="Delete Admin"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Provision Platform Admin Account</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Vikram Malhotra"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Corporate Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@studioos.internal"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Platform Role *</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as any)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white"
                >
                  <option value="platform_admin">Platform Admin</option>
                  <option value="billing_manager">Billing Manager</option>
                  <option value="support_manager">Support Manager</option>
                  <option value="read_only_analyst">Read-Only Analyst</option>
                  <option value="super_admin">Platform Master Admin</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateAdmin}
                disabled={!name.trim() || !email.trim()}
                className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs disabled:opacity-50"
              >
                Provision Admin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
