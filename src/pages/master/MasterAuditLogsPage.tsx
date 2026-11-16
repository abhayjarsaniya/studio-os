import React, { useState, useMemo } from 'react';
import { platformAuditService } from '../../services/platformAuditService';
import { History, Search, Download, ShieldCheck, Filter } from 'lucide-react';

export const MasterAuditLogsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const logs = useMemo(() => {
    return platformAuditService.listLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      if (actionFilter !== 'all' && !l.action.toLowerCase().includes(actionFilter.toLowerCase())) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          l.adminName.toLowerCase().includes(q) ||
          l.action.toLowerCase().includes(q) ||
          l.details.toLowerCase().includes(q) ||
          (l.targetId && l.targetId.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [logs, actionFilter, searchTerm]);

  return (
    <div className="space-y-6 pb-20">
      <div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-zinc-100 text-zinc-700 border border-zinc-200">
            Immutable Audit Trail
          </span>
          <span className="text-xs text-zinc-500">Security & Governance Compliance</span>
        </div>
        <h1 className="text-2xl font-black text-zinc-900 font-display tracking-tight mt-1">
          Platform-Wide Audit Logs ({logs.length})
        </h1>
      </div>

      {/* Search Toolbar */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search audit trail by admin, action, or target..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-zinc-200 rounded-xl text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-amber-400"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            className="bg-white border border-zinc-200 rounded-xl px-2.5 py-1.5 text-xs text-zinc-700 focus:outline-none focus:border-amber-400"
          >
            <option value="all">All Audit Actions</option>
            <option value="STUDIO">Studio Lifecycle Changes</option>
            <option value="SUBSCRIPTION">Subscription Operations</option>
            <option value="PASSWORD">Security / Credentials</option>
            <option value="OVERRIDE">Permission Overrides</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase font-semibold border-b border-zinc-200">
              <tr>
                <th className="px-4 py-3">Timestamp (IST)</th>
                <th className="px-4 py-3">Acting Admin</th>
                <th className="px-4 py-3">Action Key</th>
                <th className="px-4 py-3">Target Studio / Entity</th>
                <th className="px-4 py-3">Audit Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-zinc-400">
                    No audit records found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(l => (
                  <tr key={l.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                      {new Date(l.timestamp).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 font-bold text-zinc-800">
                      {l.adminName}
                    </td>
                    <td className="px-4 py-3 font-mono text-amber-400 font-semibold text-xs">
                      {l.action}
                    </td>
                    <td className="px-4 py-3 text-zinc-700 font-medium">
                      {l.targetId || 'Platform'}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs truncate max-w-xs">
                      {l.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
