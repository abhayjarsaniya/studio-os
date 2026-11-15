import React, { useState, useMemo } from 'react';
import { useMasterAdmin } from '../../context/MasterAdminContext';
import { masterReportsService } from '../../services/masterReportsService';
import { masterAdminService } from '../../services/masterAdminService';
import { 
  MasterReportType, 
  MASTER_REPORTS_LIST 
} from '../../types/masterAdmin';
import { 
  FileText, 
  Download, 
  Printer, 
  Filter, 
  Building2, 
  Calendar, 
  ArrowRight,
  Sparkles,
  TrendingUp,
  BarChart2
} from 'lucide-react';

export const MasterReportsPage: React.FC = () => {
  const { allStudios } = useMemo(() => {
    return { allStudios: masterAdminService.getAllStudios() };
  }, []);

  const [selectedReportId, setSelectedReportId] = useState<MasterReportType>('platform_revenue');
  const [selectedStudioFilter, setSelectedStudioFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('all_time');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const reportData = useMemo(() => {
    return masterReportsService.generateReport(selectedReportId, {
      studioId: selectedStudioFilter,
      dateRange: dateRangeFilter
    });
  }, [selectedReportId, selectedStudioFilter, dateRangeFilter]);

  const handleDownloadCsv = () => {
    masterReportsService.downloadCsv(reportData);
    showToast(`Report "${reportData.title}" downloaded as CSV!`);
  };

  const handlePrintPdf = () => {
    if (typeof window !== 'undefined') {
      window.print();
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
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-purple-50 text-purple-800 border border-purple-200">
              Intelligence Vault
            </span>
            <span className="text-xs text-zinc-500">13 Consolidated Platform Reports</span>
          </div>
          <h1 className="text-2xl font-black text-zinc-900 font-display tracking-tight mt-1">
            Consolidated Platform Reports
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Cross-studio financial audits, shoot volume analytics, supplier utilization, and executive summaries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrintPdf}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200 flex items-center gap-1.5 transition-all"
          >
            <Printer className="w-3.5 h-3.5 text-zinc-500" />
            <span>Print / PDF Summary</span>
          </button>
          <button
            onClick={handleDownloadCsv}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 13 Reports Grid Selector */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-md">
        <div className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-2">
          <BarChart2 className="w-3.5 h-3.5 text-amber-400" />
          <span>Select Report Category (13 Consolidated Platform Reports)</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {MASTER_REPORTS_LIST.map(rep => {
            const isSelected = selectedReportId === rep.id;
            return (
              <button
                key={rep.id}
                onClick={() => setSelectedReportId(rep.id)}
                className={`p-3 rounded-xl text-left transition-all border flex flex-col justify-between ${
                  isSelected
                    ? 'bg-amber-50/90 border-amber-300 text-amber-900 shadow-xs'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-white hover:border-zinc-300'
                }`}
              >
                <div>
                  <div className={`text-xs font-bold truncate ${isSelected ? 'text-amber-800' : 'text-zinc-800'}`}>
                    {rep.title}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1 line-clamp-2">
                    {rep.description}
                  </div>
                </div>
                <div className="mt-2 text-xs font-mono uppercase text-zinc-500">
                  {rep.category}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters Bar for the Report */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-zinc-500 font-medium">
            <Building2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Studio:</span>
            <select
              value={selectedStudioFilter}
              onChange={e => setSelectedStudioFilter(e.target.value)}
              className="bg-white border border-zinc-200 rounded-lg px-2 py-1 text-zinc-800 text-xs focus:outline-none focus:border-amber-400"
            >
              <option value="all">All Studios Consolidated</option>
              {allStudios.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-zinc-500 font-medium">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <span>Timeline:</span>
            <select
              value={dateRangeFilter}
              onChange={e => setDateRangeFilter(e.target.value)}
              className="bg-white border border-zinc-200 rounded-lg px-2 py-1 text-zinc-800 text-xs focus:outline-none focus:border-amber-400"
            >
              <option value="all_time">All Time</option>
              <option value="this_month">This Month</option>
              <option value="last_quarter">Last Quarter</option>
              <option value="this_year">This Financial Year</option>
            </select>
          </div>
        </div>

        <div className="text-xs font-mono text-zinc-500">
          Generated: {new Date(reportData.generatedAt).toLocaleString('en-IN')}
        </div>
      </div>

      {/* Summary KPI Badges for the Active Report */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {reportData.summaryMetrics.map((met, idx) => (
          <div key={idx} className="bg-white p-4 rounded-2xl border border-zinc-200">
            <span className="text-xs text-zinc-500 block">{met.label}</span>
            <span className="text-xl font-black text-zinc-900 font-display mt-1 block">{met.value}</span>
            {met.change && (
              <span className="text-xs text-emerald-400 font-semibold block mt-1">{met.change}</span>
            )}
          </div>
        ))}
      </div>

      {/* Report Data Table */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
          <h3 className="text-xs font-bold text-zinc-900 font-display uppercase tracking-wider">{reportData.title}</h3>
          <span className="text-xs font-mono text-zinc-500">{reportData.rows.length} rows calculated</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase font-semibold border-b border-zinc-200">
              <tr>
                {reportData.columns.map((col, idx) => (
                  <th key={idx} className="px-4 py-3">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {reportData.rows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-zinc-50 transition-colors">
                  {reportData.columns.map((col, cIdx) => (
                    <td key={cIdx} className="px-4 py-3 text-zinc-800">
                      {String(row[col] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
