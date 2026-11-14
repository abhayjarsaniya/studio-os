import React, { useState, useMemo } from 'react';
import { usePlatform } from '../../context/PlatformContext';
import { platformAuditService } from '../../services/platformAuditService';
import { ShieldCheck, Search, Filter } from 'lucide-react';

export const PlatformAuditLogsPage: React.FC = () => {
  const { refreshTrigger } = usePlatform();
  const [searchTerm, setSearchTerm] = useState('');

  const logs = useMemo(() => {
    const all = platformAuditService.listLogs();
    if (!searchTerm.trim()) return all;
    const q = searchTerm.toLowerCase();
    return all.filter(l => 
      l.action.toLowerCase().includes(q) ||
      l.details.toLowerCase().includes(q) ||
      l.adminName.toLowerCase().includes(q) ||
      l.targetId.toLowerCase().includes(q)
    );
  }, [searchTerm, refreshTrigger]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <ShieldCheck className="w-7 h-7 text-indigo-600" />
          Platform Immutable Audit Logs
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Cryptographically recorded, tamper-evident logs of all platform administrator actions, plan edits, payments, and grants.
        </p>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Filter audit logs by action, admin name, target ID, or keywords..."
          className="w-full text-xs border-0 focus:ring-0 focus:outline-hidden"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Administrator</th>
                <th className="px-4 py-3">Action Type</th>
                <th className="px-4 py-3">Target Entity</th>
                <th className="px-4 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                    {log.adminName}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="font-mono text-[10px] font-bold uppercase bg-slate-100 text-slate-800 px-2 py-0.5 rounded">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-500 whitespace-nowrap">
                    {log.targetType}:{log.targetId}
                  </td>
                  <td className="px-4 py-3 text-slate-700 leading-relaxed max-w-md">
                    {log.details}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400">
                    No platform audit log records found matching query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
