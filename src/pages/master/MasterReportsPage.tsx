import React, { useState, useMemo } from 'react';
import { useMasterAdmin } from '../../context/MasterAdminContext';
import { masterReportsService } from '../../services/masterReportsService';
import { masterAdminService } from '../../services/masterAdminService';
import { masterExportService, ExportColumn } from '../../services/masterExportService';
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
  Sparkles,
  BarChart2
} from 'lucide-react';

interface MasterReportsPageProps {
  initialReportId?: MasterReportType;
}

export const MasterReportsPage: React.FC<MasterReportsPageProps> = ({ initialReportId }) => {
  const { allStudios } = useMemo(() => {
    return { allStudios: masterAdminService.getAllStudios() };
  }, []);

  const [selectedReportId, setSelectedReportId] = useState<MasterReportType>(initialReportId || 'platform_revenue');

  React.useEffect(() => {
    if (initialReportId) {
      setSelectedReportId(initialReportId);
    }
  }, [initialReportId]);

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

  const handleExport = (type: 'pdf' | 'excel') => {
    const exportColumns: ExportColumn[] = reportData.columns.map(col => ({
      key: col,
      label: col
    }));

    const options = {
      filename: `Report_${reportData.reportType}`,
      title: reportData.title,
      subtitle: `Master Business Intelligence Report`,
      filterSummary: reportData.filterSummary,
      columns: exportColumns,
      rows: reportData.rows,
      summaryMetrics: reportData.summaryMetrics.map(m => ({
        label: m.label,
        value: m.value
      }))
    };

    if (type === 'excel') {
      masterExportService.exportToExcel(options);
      showToast(`Exported ${reportData.title} to Excel.`);
    } else {
      masterExportService.exportToPDF(options);
    }
  };

  return (
    <div className="space-y-6 pb-20 w-full font-sans">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 text-white font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 border border-orange-500/30 text-xs">
          <Sparkles className="w-4 h-4 text-orange-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-50 text-orange-800 border border-orange-200">
              Platform Intelligence
            </span>
            <span className="text-xs text-zinc-500 font-medium">13 Specialized Report Modules</span>
          </div>
          <h1 className="text-2xl font-black text-zinc-900 font-display tracking-tight mt-1">
            Report Center
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Consolidated multi-studio metrics, financial audits, workforce efficiency, and vendor utilization.
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

      {/* 13 Reports Grid Selector */}
      <div className="bg-white border border-zinc-200 rounded-3xl p-5 shadow-2xs space-y-3">
        <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-orange-500" />
          <span>Select Analytical Audit Topic</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {MASTER_REPORTS_LIST.map(rep => {
            const isSelected = selectedReportId === rep.id;
            return (
              <button
                key={rep.id}
                onClick={() => setSelectedReportId(rep.id)}
                className={`p-3.5 rounded-2xl text-left transition-all border flex flex-col justify-between min-h-[96px] cursor-pointer ${
                  isSelected
                    ? 'bg-orange-50/80 border-orange-400 text-orange-950 shadow-xs'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-white hover:border-zinc-300'
                }`}
              >
                <div>
                  <div className={`text-xs font-bold truncate ${isSelected ? 'text-orange-900' : 'text-zinc-900'}`}>
                    {rep.title}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1 line-clamp-2 leading-relaxed">
                    {rep.description}
                  </div>
                </div>
                <div className="mt-2 text-xs font-mono uppercase text-zinc-400">
                  {rep.category}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters Bar for the Report */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-zinc-600 font-bold">
            <Building2 className="w-4 h-4 text-orange-500" />
            <span>Target Studio:</span>
            <select
              value={selectedStudioFilter}
              onChange={e => setSelectedStudioFilter(e.target.value)}
              className="bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-zinc-800 text-xs font-bold focus:outline-none focus:bg-white"
            >
              <option value="all">All Studios Consolidated</option>
              {allStudios.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 text-zinc-600 font-bold">
            <Calendar className="w-4 h-4 text-zinc-500" />
            <span>Timeline:</span>
            <select
              value={dateRangeFilter}
              onChange={e => setDateRangeFilter(e.target.value)}
              className="bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-zinc-800 text-xs font-bold focus:outline-none focus:bg-white"
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
          <div key={idx} className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-2xs">
            <span className="text-xs text-zinc-400 uppercase font-bold tracking-wider block">{met.label}</span>
            <span className="text-2xl font-black text-zinc-900 font-display mt-1 block">{met.value}</span>
            {met.change && (
              <span className="text-xs text-emerald-600 font-bold block mt-1">{met.change}</span>
            )}
          </div>
        ))}
      </div>

      {/* Report Data Table */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
          <h3 className="text-xs font-bold text-zinc-900 font-display uppercase tracking-wider">{reportData.title}</h3>
          <span className="text-xs font-mono text-zinc-500">{reportData.rows.length} records calculated</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-zinc-50/80 text-zinc-500 text-xs uppercase font-bold border-b border-zinc-200 tracking-wider">
              <tr>
                {reportData.columns.map((col, idx) => (
                  <th key={idx} className="px-4 py-3">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {reportData.rows.length === 0 ? (
                <tr>
                  <td colSpan={reportData.columns.length} className="px-4 py-8 text-center text-zinc-400">
                    No rows calculated for this dataset.
                  </td>
                </tr>
              ) : (
                reportData.rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-orange-50/20 transition-colors">
                    {reportData.columns.map((col, cIdx) => (
                      <td key={cIdx} className="px-4 py-3.5 text-zinc-800 font-medium">
                        {String(row[col] ?? '')}
                      </td>
                    ))}
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
