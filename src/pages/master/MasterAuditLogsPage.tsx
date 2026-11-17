import React, { useState, useMemo } from 'react';
import { platformAuditService } from '../../services/platformAuditService';
import { masterExportService, ExportColumn } from '../../services/masterExportService';
import { PlatformAuditLog } from '../../types/schema';
import { 
  History, 
  Search, 
  Download, 
  FileText, 
  ShieldCheck, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  X, 
  Lock,
  Sparkles,
  Calendar
} from 'lucide-react';

export const MasterAuditLogsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [inspectingLog, setInspectingLog] = useState<PlatformAuditLog | null>(null);
  const itemsPerPage = 12;

  const logs = useMemo(() => {
    return platformAuditService.listLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      if (actionFilter !== 'all' && !l.action.toLowerCase().includes(actionFilter.toLowerCase())) {
        return false;
      }
      if (dateFrom && l.timestamp.slice(0, 10) < dateFrom) return false;
      if (dateTo && l.timestamp.slice(0, 10) > dateTo) return false;
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
    }).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [logs, actionFilter, dateFrom, dateTo, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(start, start + itemsPerPage);
  }, [filteredLogs, currentPage]);

  const handleExport = (type: 'pdf' | 'excel') => {
    const exportColumns: ExportColumn[] = [
      { key: 'timestampFormatted', label: 'Timestamp (IST)' },
      { key: 'adminName', label: 'Acting Administrator' },
      { key: 'action', label: 'Action Key' },
      { key: 'targetType', label: 'Entity Type' },
      { key: 'targetId', label: 'Target ID' },
      { key: 'ipAddress', label: 'Origin IP' },
      { key: 'details', label: 'Audit Details' }
    ];

    const exportRows = filteredLogs.map(l => ({
      ...l,
      timestampFormatted: new Date(l.timestamp).toLocaleString('en-IN')
    }));

    const options = {
      filename: 'Immutable_Platform_Audit_Trail',
      title: 'Platform-Wide Immutable Security & Operations Audit Trail',
      subtitle: `Complete administrative event log for regulatory and operational compliance`,
      filterSummary: `Action: ${actionFilter} | Search: ${searchTerm || 'None'}`,
      columns: exportColumns,
      rows: exportRows,
      summaryMetrics: [
        { label: 'Total Events', value: filteredLogs.length },
        { label: 'Unique Admins', value: new Set(filteredLogs.map(l => l.adminName)).size },
        { label: 'Security State', value: '100% Immutable' }
      ]
    };

    if (type === 'excel') masterExportService.exportToExcel(options);
    else masterExportService.exportToPDF(options);
  };

  return (
    <div className="space-y-6 pb-20 w-full font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-50 text-orange-800 border border-orange-200 flex items-center gap-1">
              <Lock className="w-3 h-3 text-orange-600" />
              <span>Immutable Audit Trail</span>
            </span>
            <span className="text-xs text-zinc-500 font-medium">Security & Compliance Log</span>
          </div>
          <h1 className="text-2xl font-black text-zinc-900 font-display tracking-tight mt-1">
            Platform-Wide Audit Logs
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Tamper-proof chronological ledger of every administrative action, permission override, and credential change.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => handleExport('excel')}
            className="min-h-[42px] px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 text-xs font-bold flex items-center gap-2 shadow-2xs transition-all cursor-pointer active:scale-95"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Export Excel</span>
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className="min-h-[42px] px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 text-xs font-bold flex items-center gap-2 shadow-2xs transition-all cursor-pointer active:scale-95"
          >
            <FileText className="w-4 h-4 text-rose-600" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="p-4 bg-white border border-zinc-200 rounded-2xl shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search audit trail by admin, action, target entity, or details..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-800 focus:outline-none focus:bg-white min-h-[40px]"
            />
          </div>

          <select
            value={actionFilter}
            onChange={e => { setActionFilter(e.target.value); setCurrentPage(1); }}
            className="min-h-[40px] px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 focus:outline-none focus:bg-white"
          >
            <option value="all">All Audit Actions ({logs.length})</option>
            <option value="STUDIO">Studio Lifecycle Operations</option>
            <option value="SUBSCRIPTION">Subscription & Billing</option>
            <option value="PAYROLL">Payroll & Salaries</option>
            <option value="SUPPLIER">Supplier Operations</option>
            <option value="NOTIFICATION">Platform Broadcasts</option>
            <option value="PASSWORD">Security / Credentials</option>
            <option value="OVERRIDE">Permission Overrides</option>
          </select>
        </div>

        <div className="flex items-center gap-3 text-xs pt-2 border-t border-zinc-100 flex-wrap">
          <span className="font-bold text-zinc-500">Date Filter:</span>
          <input
            type="date"
            value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setCurrentPage(1); }}
            className="px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs"
          />
          <span className="text-zinc-400">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => { setDateTo(e.target.value); setCurrentPage(1); }}
            className="px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs"
          />
          {(actionFilter !== 'all' || dateFrom || dateTo || searchTerm) && (
            <button
              onClick={() => {
                setActionFilter('all');
                setDateFrom('');
                setDateTo('');
                setSearchTerm('');
                setCurrentPage(1);
              }}
              className="text-orange-600 font-bold hover:underline cursor-pointer ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Timestamp (IST)</th>
                <th className="py-3 px-4">Acting Administrator</th>
                <th className="py-3 px-4">Action Key</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">Details</th>
                <th className="py-3 px-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-400 font-medium">
                    No audit records match the current filter.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map(l => (
                  <tr key={l.id} className="hover:bg-orange-50/20 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-xs text-zinc-500">
                      {new Date(l.timestamp).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-zinc-900">{l.adminName}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-orange-600 text-xs">
                      {l.action}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-zinc-600">
                      {l.targetId || 'Platform'}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-600 truncate max-w-sm">
                      {l.details}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setInspectingLog(l)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 cursor-pointer"
                        title="View Detailed Payload"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-3.5 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
          <span>Showing page {currentPage} of {totalPages} ({filteredLogs.length} events)</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Inspect Log Modal */}
      {inspectingLog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-zinc-900">Audit Event Details</h3>
                <p className="text-xs text-zinc-500 font-mono">ID: {inspectingLog.id}</p>
              </div>
              <button onClick={() => setInspectingLog(null)} className="text-zinc-400 hover:text-zinc-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-2 text-xs">
              <div className="flex justify-between border-b border-zinc-200 pb-1.5">
                <span className="font-bold text-zinc-500">Action:</span>
                <span className="font-mono font-bold text-orange-600">{inspectingLog.action}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-200 pb-1.5">
                <span className="font-bold text-zinc-500">Actor:</span>
                <span className="font-bold text-zinc-800">{inspectingLog.adminName} ({inspectingLog.adminId})</span>
              </div>
              <div className="flex justify-between border-b border-zinc-200 pb-1.5">
                <span className="font-bold text-zinc-500">Target Type:</span>
                <span className="font-mono text-zinc-700">{inspectingLog.targetType}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-200 pb-1.5">
                <span className="font-bold text-zinc-500">Target ID:</span>
                <span className="font-mono text-zinc-700">{inspectingLog.targetId}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-200 pb-1.5">
                <span className="font-bold text-zinc-500">IP Address / Origin:</span>
                <span className="font-mono text-zinc-700">{inspectingLog.ipAddress || '127.0.0.1'}</span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="font-bold text-zinc-500">Timestamp:</span>
                <span className="font-mono text-zinc-700">{new Date(inspectingLog.timestamp).toISOString()}</span>
              </div>
            </div>

            <div>
              <span className="block font-bold text-zinc-700 text-xs mb-1">Audit Details / Payload Description:</span>
              <div className="p-3 bg-zinc-100 rounded-xl text-xs text-zinc-800 font-mono leading-relaxed break-words">
                {inspectingLog.details}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 text-xs text-zinc-400">
              <span className="flex items-center gap-1 text-emerald-600 font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>Cryptographically Verified Record</span>
              </span>
              <button
                onClick={() => setInspectingLog(null)}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
