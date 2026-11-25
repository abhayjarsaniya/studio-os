import React, { useEffect, useMemo, useState } from 'react';
import { useMasterAdmin } from '../../context/MasterAdminContext';
import {
  livePayrollService,
  LivePayrollRecord,
  LiveEmployeeOption,
  PayrollStatus,
  calculateNetPayable
} from '../../services/livePayrollService';
import { masterExportService, ExportColumn } from '../../services/masterExportService';
import {
  Search,
  Download,
  FileText,
  Plus,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Edit3,
  X,
  Loader2,
  Eye,
  History
} from 'lucide-react';

export const MasterPayrollPage: React.FC = () => {
  const { currentAdmin } = useMasterAdmin();
  const actingUser = currentAdmin?.email || 'jarsaniya.abhay@gmail.com';

  const [records, setRecords] = useState<LivePayrollRecord[]>([]);
  const [studios, setStudios] = useState<Array<{ id: string; name: string }>>([]);
  const [employeesByStudio, setEmployeesByStudio] = useState<Record<string, LiveEmployeeOption[]>>({});
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudio, setSelectedStudio] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');

  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<LivePayrollRecord | null>(null);
  const [detailRecord, setDetailRecord] = useState<LivePayrollRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<LivePayrollRecord | null>(null);

  const [formData, setFormData] = useState({
    studioId: '',
    employeeId: '',
    month: new Date().toISOString().slice(0, 7),
    baseSalary: 30000,
    bonus: 0,
    incentives: 0,
    deductions: 0,
    status: 'pending' as PayrollStatus,
    paymentMethod: 'Bank Transfer (NEFT)',
    paymentReference: '',
    paymentDate: '',
    notes: '',
    correctionReason: ''
  });

  useEffect(() => {
    setLoading(true);
    const unsub = livePayrollService.subscribeAllStudiosPayroll(
      (recs, stList, empMap) => {
        setRecords(recs);
        setStudios(stList);
        setEmployeesByStudio(empMap);
        setLoading(false);
      },
      (err) => {
        setStatusMessage(err?.message || 'Failed to sync payroll from Firebase.');
        setSaveState('error');
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const availableMonths = useMemo(() => {
    const set = new Set<string>(records.map((r) => r.month).filter(Boolean));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [records]);

  const filteredRecords = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return records.filter((r) => {
      if (selectedStudio !== 'all' && r.studioId !== selectedStudio) return false;
      if (selectedStatus !== 'all' && r.status !== selectedStatus) return false;
      if (selectedMonth !== 'all' && r.month !== selectedMonth) return false;
      if (q) {
        return (
          r.employeeName.toLowerCase().includes(q) ||
          r.employeeId.toLowerCase().includes(q) ||
          r.studioName.toLowerCase().includes(q) ||
          r.role.toLowerCase().includes(q) ||
          (r.paymentReference || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [records, selectedStudio, selectedStatus, selectedMonth, searchTerm]);

  const kpis = useMemo(() => {
    const totalPayable = filteredRecords.reduce((s, r) => s + (r.netPayable || 0), 0);
    const paidCount = filteredRecords.filter((r) => r.status === 'paid').length;
    const pendingCount = filteredRecords.filter((r) => r.status !== 'paid').length;
    return { totalPayable, paidCount, pendingCount, totalCount: filteredRecords.length };
  }, [filteredRecords]);

  const activeStudioEmployees = useMemo(() => {
    return formData.studioId ? employeesByStudio[formData.studioId] || [] : [];
  }, [formData.studioId, employeesByStudio]);

  const previewNetPayable = calculateNetPayable({
    baseSalary: formData.baseSalary,
    bonus: formData.bonus,
    incentives: formData.incentives,
    deductions: formData.deductions
  });

  const handleOpenAdd = () => {
    const defaultStudio = selectedStudio !== 'all' ? selectedStudio : studios[0]?.id || '';
    const emps = defaultStudio ? employeesByStudio[defaultStudio] || [] : [];
    const firstEmp = emps[0];
    setFormData({
      studioId: defaultStudio,
      employeeId: firstEmp?.id || '',
      month: new Date().toISOString().slice(0, 7),
      baseSalary: firstEmp?.monthlySalary || 30000,
      bonus: 0,
      incentives: 0,
      deductions: 0,
      status: 'pending',
      paymentMethod: 'Bank Transfer (NEFT)',
      paymentReference: '',
      paymentDate: '',
      notes: '',
      correctionReason: ''
    });
    setIsAddOpen(true);
  };

  const handleOpenEdit = (rec: LivePayrollRecord) => {
    setEditingRecord(rec);
    setFormData({
      studioId: rec.studioId,
      employeeId: rec.employeeId,
      month: rec.month,
      baseSalary: rec.baseSalary,
      bonus: rec.bonus,
      incentives: rec.incentives || 0,
      deductions: rec.deductions,
      status: rec.status,
      paymentMethod: rec.paymentMethod || 'Bank Transfer (NEFT)',
      paymentReference: rec.paymentReference || '',
      paymentDate: rec.paymentDate || '',
      notes: rec.notes || '',
      correctionReason: ''
    });
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const st = studios.find((s) => s.id === formData.studioId);
    const emp = activeStudioEmployees.find((em) => em.id === formData.employeeId);
    if (!st || !emp) {
      setStatusMessage('Please select a valid Studio and Employee.');
      setSaveState('error');
      return;
    }

    setSaveState('saving');
    try {
      await livePayrollService.createPayrollRecord({
        studioId: st.id,
        studioName: st.name,
        employeeId: emp.id,
        employeeName: emp.fullName,
        role: emp.role,
        month: formData.month,
        baseSalary: formData.baseSalary,
        bonus: formData.bonus,
        incentives: formData.incentives,
        deductions: formData.deductions,
        status: formData.status,
        paymentMethod: formData.paymentMethod,
        paymentReference: formData.paymentReference,
        paymentDate: formData.paymentDate,
        notes: formData.notes,
        actingUser,
        actingRole: 'MASTER_ADMIN'
      });
      setSaveState('saved');
      setStatusMessage(`Payroll entry created for ${emp.fullName} (${formData.month}).`);
      setIsAddOpen(false);
    } catch (err: any) {
      setSaveState('error');
      setStatusMessage(err?.message || 'Failed to create payroll entry.');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    setSaveState('saving');
    try {
      await livePayrollService.updatePayrollRecord({
        studioId: editingRecord.studioId,
        recordId: editingRecord.id,
        updates: {
          baseSalary: formData.baseSalary,
          bonus: formData.bonus,
          incentives: formData.incentives,
          deductions: formData.deductions,
          status: formData.status,
          paymentMethod: formData.paymentMethod,
          paymentReference: formData.paymentReference,
          paymentDate: formData.paymentDate,
          notes: formData.notes
        },
        correctionReason: formData.correctionReason,
        actingUser,
        actingRole: 'MASTER_ADMIN'
      });
      setSaveState('saved');
      setStatusMessage(`Payroll updated for ${editingRecord.employeeName}.`);
      setEditingRecord(null);
    } catch (err: any) {
      setSaveState('error');
      setStatusMessage(err?.message || 'Failed to update payroll.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingRecord) return;
    setSaveState('saving');
    try {
      await livePayrollService.deletePayrollRecord({
        studioId: deletingRecord.studioId,
        recordId: deletingRecord.id,
        actingUser,
        actingRole: 'MASTER_ADMIN',
        allowPaidDelete: true
      });
      setSaveState('saved');
      setStatusMessage(`Deleted payroll entry for ${deletingRecord.employeeName}.`);
      setDeletingRecord(null);
    } catch (err: any) {
      setSaveState('error');
      setStatusMessage(err?.message || 'Failed to delete payroll entry.');
    }
  };

  const exportColumns: ExportColumn[] = [
    { label: 'Employee', key: 'employeeName', format: 'text' },
    { label: 'Employee ID', key: 'employeeId', format: 'text' },
    { label: 'Studio', key: 'studioName', format: 'text' },
    { label: 'Role', key: 'role', format: 'text' },
    { label: 'Month', key: 'month', format: 'text' },
    { label: 'Base Salary', key: 'baseSalary', format: 'currency', align: 'right' },
    { label: 'Bonus', key: 'bonus', format: 'currency', align: 'right' },
    { label: 'Incentives', key: 'incentives', format: 'currency', align: 'right' },
    { label: 'Deductions', key: 'deductions', format: 'currency', align: 'right' },
    { label: 'Net Payable', key: 'netPayable', format: 'currency', align: 'right' },
    { label: 'Status', key: 'status', format: 'text' },
    { label: 'Payment Date', key: 'paymentDate', format: 'text' },
    { label: 'Reference', key: 'paymentReference', format: 'text' }
  ];

  return (
    <div className="space-y-5 pb-20 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
            Live Firebase Payroll Governance
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 font-display tracking-tight mt-0.5">
            Payroll Administration
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() =>
              masterExportService.exportToExcel({
                filename: 'master_payroll_report',
                title: 'Studio OS — Master Payroll Report',
                columns: exportColumns,
                rows: filteredRecords
              })
            }
            disabled={filteredRecords.length === 0}
            className="min-h-[42px] px-3.5 py-2 rounded-xl bg-white border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50 inline-flex items-center gap-1.5 disabled:opacity-40"
          >
            <Download className="w-4 h-4" /> Excel
          </button>
          <button
            onClick={() =>
              masterExportService.exportToPDF({
                filename: 'master_payroll_report',
                title: 'Studio OS — Master Payroll Report',
                columns: exportColumns,
                rows: filteredRecords
              })
            }
            disabled={filteredRecords.length === 0}
            className="min-h-[42px] px-3.5 py-2 rounded-xl bg-white border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50 inline-flex items-center gap-1.5 disabled:opacity-40"
          >
            <FileText className="w-4 h-4" /> PDF
          </button>
          <button
            onClick={handleOpenAdd}
            className="min-h-[42px] px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black inline-flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Payroll Entry
          </button>
        </div>
      </div>

      {/* Autosave / Status Banner */}
      {(statusMessage || saveState !== 'idle') && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 border ${
            saveState === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {saveState === 'saving' && <Loader2 className="w-4 h-4 animate-spin text-amber-600" />}
            {saveState === 'saved' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            {saveState === 'error' && <AlertCircle className="w-4 h-4 text-rose-600" />}
            <span>{statusMessage || (saveState === 'saving' ? 'Saving...' : 'Saved')}</span>
          </div>
          {statusMessage && (
            <button onClick={() => setStatusMessage(null)} className="font-bold">
              ✕
            </button>
          )}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-zinc-200">
          <div className="text-xs font-bold text-zinc-500 uppercase">Records</div>
          <div className="text-2xl font-black text-zinc-900 mt-1">{kpis.totalCount}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-zinc-200">
          <div className="text-xs font-bold text-zinc-500 uppercase">Total Net Payable</div>
          <div className="text-2xl font-black text-zinc-900 mt-1">
            ₹{kpis.totalPayable.toLocaleString('en-IN')}
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
          <div className="text-xs font-bold text-emerald-700 uppercase">Paid</div>
          <div className="text-2xl font-black text-emerald-800 mt-1">{kpis.paidCount}</div>
        </div>
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
          <div className="text-xs font-bold text-amber-800 uppercase">Pending / Processing</div>
          <div className="text-2xl font-black text-amber-900 mt-1">{kpis.pendingCount}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-3.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search employee, studio, ref..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-900 min-h-[42px]"
          />
        </div>
        <select
          value={selectedStudio}
          onChange={(e) => setSelectedStudio(e.target.value)}
          className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 min-h-[42px]"
        >
          <option value="all">All Studios</option>
          {studios.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 min-h-[42px]"
        >
          <option value="all">All Months</option>
          {availableMonths.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 min-h-[42px]"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      {loading ? (
        <div className="py-16 flex items-center justify-center gap-2 text-zinc-500 text-sm bg-white border border-zinc-200 rounded-2xl">
          <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
          <span>Syncing payroll records from Firebase...</span>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="py-16 text-center bg-white border border-zinc-200 rounded-2xl space-y-3">
          <p className="text-sm font-bold text-zinc-700">No payroll records found.</p>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 text-xs font-black inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Create First Payroll Entry
          </button>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-zinc-50 text-zinc-500 uppercase font-bold border-b border-zinc-200">
                  <tr>
                    <th className="px-4 py-3">Employee & ID</th>
                    <th className="px-4 py-3">Studio & Role</th>
                    <th className="px-4 py-3">Month</th>
                    <th className="px-4 py-3 text-right">Base</th>
                    <th className="px-4 py-3 text-right">Bonus + Inc.</th>
                    <th className="px-4 py-3 text-right">Deductions</th>
                    <th className="px-4 py-3 text-right">Net Payable</th>
                    <th className="px-4 py-3">Status & Ref</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredRecords.map((r) => (
                    <tr key={`${r.studioId}_${r.id}`} className="hover:bg-zinc-50/70">
                      <td className="px-4 py-3">
                        <div className="font-bold text-zinc-900">{r.employeeName}</div>
                        <div className="text-zinc-400 font-mono">{r.employeeId}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-zinc-800">{r.studioName}</div>
                        <div className="text-zinc-500">{r.role}</div>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-zinc-700">{r.month}</td>
                      <td className="px-4 py-3 text-right font-mono">₹{r.baseSalary.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-700">
                        +₹{((r.bonus || 0) + (r.incentives || 0)).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-rose-600">
                        -₹{(r.deductions || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-black text-zinc-900">
                        ₹{r.netPayable.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold uppercase ${
                            r.status === 'paid'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : r.status === 'processing'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {r.status}
                        </span>
                        {r.paymentDate && (
                          <div className="text-zinc-400 mt-0.5">
                            {r.paymentDate} {r.paymentReference ? `· ${r.paymentReference}` : ''}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => setDetailRecord(r)}
                            title="View Details & History"
                            className="p-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:text-zinc-900"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(r)}
                            title="Edit Payroll"
                            className="p-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:text-amber-600"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingRecord(r)}
                            title="Delete Payroll"
                            className="p-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile / Tablet Cards */}
          <div className="lg:hidden space-y-3">
            {filteredRecords.map((r) => (
              <div key={`${r.studioId}_${r.id}`} className="bg-white border border-zinc-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-black text-zinc-900">{r.employeeName}</div>
                    <div className="text-xs text-zinc-500">
                      {r.studioName} · {r.role}
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                      r.status === 'paid'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {r.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                  <div>
                    <span className="text-zinc-500">Month:</span>{' '}
                    <strong className="font-mono">{r.month}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-zinc-500">Net:</span>{' '}
                    <strong className="font-mono text-zinc-900">₹{r.netPayable.toLocaleString('en-IN')}</strong>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setDetailRecord(r)}
                    className="min-h-[40px] px-3 py-1.5 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-700"
                  >
                    Details
                  </button>
                  <button
                    onClick={() => handleOpenEdit(r)}
                    className="min-h-[40px] px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeletingRecord(r)}
                    className="min-h-[40px] px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Create / Edit Modal */}
      {(isAddOpen || editingRecord) && (
        <div className="fixed inset-0 z-50 bg-zinc-950/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={editingRecord ? handleEditSubmit : handleCreateSubmit}
            className="w-full max-w-lg bg-white border border-zinc-200 rounded-3xl p-6 shadow-2xl space-y-4 my-8"
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
              <h3 className="text-base font-black text-zinc-900">
                {editingRecord ? `Edit Payroll — ${editingRecord.employeeName}` : 'Add Payroll Entry'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsAddOpen(false);
                  setEditingRecord(null);
                }}
                className="p-1 text-zinc-500 hover:text-zinc-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!editingRecord && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Studio</label>
                  <select
                    required
                    value={formData.studioId}
                    onChange={(e) => {
                      const sId = e.target.value;
                      const emps = employeesByStudio[sId] || [];
                      setFormData({
                        ...formData,
                        studioId: sId,
                        employeeId: emps[0]?.id || '',
                        baseSalary: emps[0]?.monthlySalary || 30000
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-sm"
                  >
                    <option value="">Select Studio</option>
                    {studios.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Employee</label>
                  <select
                    required
                    value={formData.employeeId}
                    onChange={(e) => {
                      const emp = activeStudioEmployees.find((em) => em.id === e.target.value);
                      setFormData({
                        ...formData,
                        employeeId: e.target.value,
                        baseSalary: emp?.monthlySalary || formData.baseSalary
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-sm"
                  >
                    <option value="">Select Employee</option>
                    {activeStudioEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.fullName} ({emp.role})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Payroll Month</label>
                  <input
                    type="month"
                    required
                    value={formData.month}
                    onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-sm"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Base Salary</label>
                <input
                  type="number"
                  min={0}
                  required
                  value={formData.baseSalary}
                  onChange={(e) => setFormData({ ...formData, baseSalary: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Bonus</label>
                <input
                  type="number"
                  min={0}
                  value={formData.bonus}
                  onChange={(e) => setFormData({ ...formData, bonus: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Incentives</label>
                <input
                  type="number"
                  min={0}
                  value={formData.incentives}
                  onChange={(e) => setFormData({ ...formData, incentives: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Deductions</label>
                <input
                  type="number"
                  min={0}
                  value={formData.deductions}
                  onChange={(e) => setFormData({ ...formData, deductions: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-sm"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-between text-xs">
              <span className="font-bold text-zinc-600">Net Payable (Base + Bonus + Incentives - Deductions)</span>
              <span className="text-base font-black text-zinc-900">
                ₹{previewNetPayable.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as PayrollStatus })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-sm"
                >
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Payment Date</label>
                <input
                  type="date"
                  value={formData.paymentDate}
                  onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Payment Ref</label>
                <input
                  type="text"
                  value={formData.paymentReference}
                  onChange={(e) => setFormData({ ...formData, paymentReference: e.target.value })}
                  placeholder="UTR / IMPS Ref"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-sm"
                />
              </div>
            </div>

            {editingRecord?.status === 'paid' && (
              <div>
                <label className="block text-xs font-bold text-amber-800 mb-1">
                  Audited Correction Reason (Required for Paid Records)
                </label>
                <input
                  type="text"
                  value={formData.correctionReason}
                  onChange={(e) => setFormData({ ...formData, correctionReason: e.target.value })}
                  placeholder="Reason for adjusting a paid entry"
                  className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-amber-50 text-sm"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsAddOpen(false);
                  setEditingRecord(null);
                }}
                className="px-4 py-2 rounded-xl bg-zinc-100 text-zinc-800 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saveState === 'saving'}
                className="px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 text-xs font-black disabled:opacity-50"
              >
                {saveState === 'saving' ? 'Saving...' : 'Save to Firebase'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Detail & Correction History Modal */}
      {detailRecord && (
        <div className="fixed inset-0 z-50 bg-zinc-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-zinc-200 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
              <h3 className="text-base font-black text-zinc-900">{detailRecord.employeeName}</h3>
              <button onClick={() => setDetailRecord(null)} className="text-zinc-500 font-bold">
                ✕
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">Studio:</span>
                <span className="font-bold">{detailRecord.studioName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Month:</span>
                <span className="font-mono font-bold">{detailRecord.month}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Net Payable:</span>
                <span className="font-mono font-black">₹{detailRecord.netPayable.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Payment Ref:</span>
                <span className="font-mono">{detailRecord.paymentReference || 'Not recorded'}</span>
              </div>
            </div>
            {(detailRecord.correctionHistory || []).length > 0 && (
              <div className="pt-2 border-t border-zinc-200 space-y-1.5">
                <div className="text-xs font-bold text-zinc-600 flex items-center gap-1">
                  <History className="w-3.5 h-3.5" /> Correction History
                </div>
                {detailRecord.correctionHistory!.map((c, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-zinc-50 text-xs">
                    ₹{c.previousNetPayable} → ₹{c.newNetPayable} ({c.reason})
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingRecord && (
        <div className="fixed inset-0 z-50 bg-zinc-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-zinc-200 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-zinc-900">Delete Payroll Entry?</h3>
            <p className="text-xs text-zinc-600">
              Delete payroll record for <strong>{deletingRecord.employeeName}</strong> ({deletingRecord.month})?
              This action is audited.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeletingRecord(null)}
                className="px-4 py-2 rounded-xl bg-zinc-100 text-zinc-800 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-black"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
