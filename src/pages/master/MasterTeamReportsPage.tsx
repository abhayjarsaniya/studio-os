import React, { useState, useMemo } from 'react';
import { masterAdminService } from '../../services/masterAdminService';
import { attendanceService } from '../../services/attendanceService';
import { masterExportService, ExportColumn } from '../../services/masterExportService';
import { platformAuditService } from '../../services/platformAuditService';
import { TenantStore } from '../../services/tenantStore';
import { Employee, AttendanceRecord } from '../../types/schema';
import { 
  UserCheck, 
  Search, 
  Filter, 
  Download, 
  FileText, 
  Plus, 
  Calendar, 
  Users, 
  Phone, 
  Mail, 
  Building2, 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  Edit3, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Sparkles,
  ShieldCheck
} from 'lucide-react';

interface EmployeeWithMeta {
  id: string;
  studioId: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  monthlySalary: number;
  dailyRate: number;
  status: string;
  studioName: string;
  studioCity: string;
  attendanceToday?: string;
}

export const MasterTeamReportsPage: React.FC = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudio, setSelectedStudio] = useState('all');
  const [selectedRole, setSelectedRole] = useState('all');
  const [activeTab, setActiveTab] = useState<'employees' | 'attendance'>('employees');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().slice(0, 10));
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<EmployeeWithMeta | null>(null);
  const [deletingEmp, setDeletingEmp] = useState<EmployeeWithMeta | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    studioId: 'studio_shreeji_films',
    name: '',
    phone: '',
    email: '',
    role: 'Lead Photographer',
    monthlySalary: 35000,
    dailyRate: 2000,
    status: 'active'
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const studios = useMemo(() => {
    return masterAdminService.getAllStudios();
  }, [refreshKey]);

  // Aggregate employees across studios
  const allEmployees = useMemo(() => {
    const list: EmployeeWithMeta[] = [];
    const today = new Date().toISOString().slice(0, 10);

    studios.forEach(st => {
      const emps = TenantStore.get<Employee>(st.id, 'employees') || [];
      const attendance = attendanceService.listAttendance(st.id, today);

      emps.forEach(emp => {
        const att = attendance.find(a => a.employeeId === emp.id);
        const name = emp.fullName || (emp as any).name || 'Crew Member';
        const role = emp.designation || (emp as any).role || emp.roleName || 'Photographer';
        const salary = (emp as any).monthlySalary || 35000;
        const rate = (emp as any).dailyRate || 2000;
        const status = (emp as any).employmentStatus || (emp as any).status || 'active';

        list.push({
          id: emp.id,
          studioId: st.id,
          name,
          role,
          phone: emp.phone || '9876543210',
          email: emp.email || '',
          monthlySalary: salary,
          dailyRate: rate,
          status,
          studioName: st.name,
          studioCity: st.city || 'Gujarat',
          attendanceToday: att ? att.status : 'unmarked'
        });
      });
    });
    return list;
  }, [studios, refreshKey]);

  // Aggregate attendance records for selected date
  const allAttendance = useMemo(() => {
    const list: (AttendanceRecord & { employeeName: string; studioName: string; role: string })[] = [];
    studios.forEach(st => {
      const emps = TenantStore.get<Employee>(st.id, 'employees') || [];
      const atts = attendanceService.listAttendance(st.id, attendanceDate);

      emps.forEach(emp => {
        const record = atts.find(a => a.employeeId === emp.id);
        const empName = emp.fullName || (emp as any).name || 'Crew Member';
        const empRole = emp.designation || (emp as any).role || emp.roleName || 'Staff';

        list.push({
          id: record ? record.id : `virtual_${emp.id}`,
          studioId: st.id,
          employeeId: emp.id,
          date: attendanceDate,
          status: record ? record.status : 'present',
          checkIn: record?.checkIn || '09:30 AM',
          checkOut: record?.checkOut || '06:30 PM',
          notes: record?.notes || 'Regular studio shift',
          employeeName: empName,
          studioName: st.name,
          role: empRole
        });
      });
    });
    return list;
  }, [studios, attendanceDate, refreshKey]);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return allEmployees.filter(emp => {
      if (selectedStudio !== 'all' && emp.studioId !== selectedStudio) return false;
      if (selectedRole !== 'all' && !emp.role.toLowerCase().includes(selectedRole.toLowerCase())) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          emp.name.toLowerCase().includes(q) ||
          emp.role.toLowerCase().includes(q) ||
          emp.studioName.toLowerCase().includes(q) ||
          (emp.phone && emp.phone.includes(q))
        );
      }
      return true;
    });
  }, [allEmployees, selectedStudio, selectedRole, searchTerm]);

  // Filtered attendance
  const filteredAttendance = useMemo(() => {
    return allAttendance.filter(a => {
      if (selectedStudio !== 'all' && a.studioId !== selectedStudio) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          a.employeeName.toLowerCase().includes(q) ||
          a.role.toLowerCase().includes(q) ||
          a.studioName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allAttendance, selectedStudio, searchTerm]);

  // KPI Metrics
  const kpis = useMemo(() => {
    const totalCrew = allEmployees.length;
    const activeStaff = allEmployees.filter(e => e.status !== 'inactive').length;
    const todayPresent = allAttendance.filter(a => a.status === 'present').length;
    const avgSalary = Math.round(allEmployees.reduce((sum, e) => sum + e.monthlySalary, 0) / (totalCrew || 1));
    return { totalCrew, activeStaff, todayPresent, avgSalary };
  }, [allEmployees, allAttendance]);

  // Pagination
  const currentList = activeTab === 'employees' ? filteredEmployees : filteredAttendance;
  const totalPages = Math.ceil(currentList.length / itemsPerPage) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return currentList.slice(start, start + itemsPerPage);
  }, [currentList, currentPage]);

  const handleSaveEmployee = () => {
    if (!formData.name.trim() || !formData.phone.trim()) {
      alert('Please enter employee name and phone number.');
      return;
    }

    const targetStudioId = formData.studioId;
    const emps = TenantStore.get<Employee>(targetStudioId, 'employees') || [];

    if (editingEmp) {
      const updated = emps.map(e => {
        if (e.id === editingEmp.id) {
          const u: any = {
            ...e,
            fullName: formData.name,
            name: formData.name,
            phone: formData.phone,
            email: formData.email,
            designation: formData.role,
            roleName: formData.role,
            monthlySalary: Number(formData.monthlySalary),
            dailyRate: Number(formData.dailyRate),
            status: formData.status,
            employmentStatus: formData.status as any,
            updatedAt: new Date().toISOString()
          };
          return u;
        }
        return e;
      });
      TenantStore.set(targetStudioId, 'employees', updated);
      platformAuditService.logAction('Master Admin', 'UPDATE_EMPLOYEE', 'employee', editingEmp.id, `Updated employee ${formData.name} in studio ${targetStudioId}`);
      showToast('Employee profile updated successfully.');
    } else {
      const newEmp: any = {
        id: `emp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        studioId: targetStudioId,
        employeeNumber: `EMP-${Date.now().toString().slice(-4)}`,
        fullName: formData.name,
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        department: 'Production',
        designation: formData.role,
        roleId: 'role_photographer',
        roleName: formData.role,
        monthlySalary: Number(formData.monthlySalary),
        dailyRate: Number(formData.dailyRate),
        status: formData.status,
        employmentStatus: formData.status,
        joiningDate: new Date().toISOString().slice(0, 10),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      TenantStore.set(targetStudioId, 'employees', [newEmp, ...emps]);
      platformAuditService.logAction('Master Admin', 'CREATE_EMPLOYEE', 'employee', newEmp.id, `Created employee ${formData.name} in studio ${targetStudioId}`);
      showToast('New employee onboarded successfully.');
    }

    setIsAddModalOpen(false);
    setEditingEmp(null);
    setRefreshKey(k => k + 1);
  };

  const handleDeleteEmployee = () => {
    if (!deletingEmp) return;
    const emps = TenantStore.get<Employee>(deletingEmp.studioId, 'employees') || [];
    const filtered = emps.filter(e => e.id !== deletingEmp.id);
    TenantStore.set(deletingEmp.studioId, 'employees', filtered);
    platformAuditService.logAction('Master Admin', 'DELETE_EMPLOYEE', 'employee', deletingEmp.id, `Deleted employee ${deletingEmp.name} from studio ${deletingEmp.studioId}`);
    showToast(`Employee ${deletingEmp.name} deleted.`);
    setDeletingEmp(null);
    setRefreshKey(k => k + 1);
  };

  const handleToggleAttendance = (record: any) => {
    const nextStatus = record.status === 'present' ? 'absent' : (record.status === 'absent' ? 'on_leave' : 'present');
    attendanceService.markAttendance(record.studioId, {
      employeeId: record.employeeId,
      employeeName: record.employeeName,
      date: attendanceDate,
      status: nextStatus as any,
      checkIn: nextStatus === 'present' ? '09:30 AM' : '--',
      checkOut: nextStatus === 'present' ? '06:30 PM' : '--',
      notes: `Updated by Master Admin to ${nextStatus}`
    });
    showToast(`Attendance for ${record.employeeName} marked as ${nextStatus.toUpperCase()}`);
    setRefreshKey(k => k + 1);
  };

  const handleExport = (type: 'pdf' | 'excel') => {
    if (activeTab === 'employees') {
      const exportColumns: ExportColumn[] = [
        { key: 'name', label: 'Employee Name' },
        { key: 'role', label: 'Role / Designation' },
        { key: 'studioName', label: 'Studio' },
        { key: 'phone', label: 'Phone' },
        { key: 'email', label: 'Email' },
        { key: 'salaryFormatted', label: 'Monthly Salary', align: 'right', format: 'currency' },
        { key: 'dailyRateFormatted', label: 'Daily Rate', align: 'right', format: 'currency' },
        { key: 'status', label: 'Status' }
      ];

      const exportRows = filteredEmployees.map(e => ({
        ...e,
        salaryFormatted: `₹${e.monthlySalary.toLocaleString('en-IN')}`,
        dailyRateFormatted: `₹${e.dailyRate.toLocaleString('en-IN')}`
      }));

      const options = {
        filename: 'Team_Staff_Roster',
        title: 'Global Studio Team & Crew Directory',
        subtitle: `Cross-studio workforce audit across ${studios.length} studios`,
        filterSummary: `Studio: ${selectedStudio} | Role: ${selectedRole}`,
        columns: exportColumns,
        rows: exportRows,
        summaryMetrics: [
          { label: 'Total Workforce', value: kpis.totalCrew },
          { label: 'Active Staff', value: kpis.activeStaff },
          { label: 'Average Salary', value: `₹${kpis.avgSalary.toLocaleString('en-IN')}` }
        ]
      };

      if (type === 'excel') masterExportService.exportToExcel(options);
      else masterExportService.exportToPDF(options);
    } else {
      const exportColumns: ExportColumn[] = [
        { key: 'employeeName', label: 'Employee Name' },
        { key: 'role', label: 'Role' },
        { key: 'studioName', label: 'Studio' },
        { key: 'date', label: 'Date' },
        { key: 'status', label: 'Attendance Status' },
        { key: 'checkIn', label: 'Check-In' },
        { key: 'checkOut', label: 'Check-Out' },
        { key: 'notes', label: 'Remarks' }
      ];

      const options = {
        filename: `Attendance_Report_${attendanceDate}`,
        title: `Studio Attendance & Shift Log — ${attendanceDate}`,
        subtitle: `Daily shift verification across all studio personnel`,
        filterSummary: `Studio: ${selectedStudio} | Date: ${attendanceDate}`,
        columns: exportColumns,
        rows: filteredAttendance,
        summaryMetrics: [
          { label: 'Total Tracked', value: filteredAttendance.length },
          { label: 'Present Today', value: filteredAttendance.filter(a => a.status === 'present').length }
        ]
      };

      if (type === 'excel') masterExportService.exportToExcel(options);
      else masterExportService.exportToPDF(options);
    }
  };

  return (
    <div className="space-y-6 pb-20 w-full font-sans">
      {/* Toast */}
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
              Workforce Operations
            </span>
            <span className="text-xs text-zinc-500 font-medium">{allEmployees.length} Total Team Members</span>
          </div>
          <h1 className="text-2xl font-black text-zinc-900 font-display tracking-tight mt-1">
            Team & Attendance Reports
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Cross-studio employee directory, shift logs, attendance verification, and team assignments.
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
          <button
            onClick={() => {
              setEditingEmp(null);
              setFormData({
                studioId: studios[0]?.id || 'studio_shreeji_films',
                name: '',
                phone: '',
                email: '',
                role: 'Lead Photographer',
                monthlySalary: 35000,
                dailyRate: 2000,
                status: 'active'
              });
              setIsAddModalOpen(true);
            }}
            className="min-h-[42px] px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-orange-500/20 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Onboard Employee</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-2xs">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Total Workforce</span>
          <div className="text-2xl font-black text-zinc-900 mt-1 font-display">{kpis.totalCrew}</div>
          <span className="text-xs text-zinc-500 mt-0.5 block">Across {studios.length} studios</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-2xs">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Active Crew</span>
          <div className="text-2xl font-black text-emerald-600 mt-1 font-display">{kpis.activeStaff}</div>
          <span className="text-xs text-emerald-600 font-bold mt-0.5 block">Available for assignment</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-2xs">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Present Today</span>
          <div className="text-2xl font-black text-blue-600 mt-1 font-display">{kpis.todayPresent}</div>
          <span className="text-xs text-zinc-500 mt-0.5 block">Marked on shift</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-2xs">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Avg Salary</span>
          <div className="text-2xl font-black text-zinc-900 mt-1 font-display">₹{kpis.avgSalary.toLocaleString('en-IN')}</div>
          <span className="text-xs text-zinc-500 mt-0.5 block">Monthly average</span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 border-b border-zinc-200 pb-2">
          <button
            onClick={() => { setActiveTab('employees'); setCurrentPage(1); }}
            className={`min-h-[38px] px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'employees' ? 'bg-zinc-900 text-white shadow-xs' : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            Team Roster ({filteredEmployees.length})
          </button>
          <button
            onClick={() => { setActiveTab('attendance'); setCurrentPage(1); }}
            className={`min-h-[38px] px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'attendance' ? 'bg-zinc-900 text-white shadow-xs' : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            Daily Attendance Log ({filteredAttendance.length})
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 bg-white border border-zinc-200 rounded-2xl shadow-2xs flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by name, role, studio, or phone..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-800 focus:outline-none focus:bg-white min-h-[40px]"
            />
          </div>

          <select
            value={selectedStudio}
            onChange={e => { setSelectedStudio(e.target.value); setCurrentPage(1); }}
            className="min-h-[40px] px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 focus:outline-none focus:bg-white"
          >
            <option value="all">All Studios ({studios.length})</option>
            {studios.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          {activeTab === 'employees' && (
            <select
              value={selectedRole}
              onChange={e => { setSelectedRole(e.target.value); setCurrentPage(1); }}
              className="min-h-[40px] px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 focus:outline-none focus:bg-white"
            >
              <option value="all">All Roles</option>
              <option value="Photographer">Photographers</option>
              <option value="Cinematographer">Cinematographers</option>
              <option value="Editor">Video & Photo Editors</option>
              <option value="Drone">Drone Pilots</option>
              <option value="Manager">Studio Managers</option>
            </select>
          )}

          {activeTab === 'attendance' && (
            <input
              type="date"
              value={attendanceDate}
              onChange={e => { setAttendanceDate(e.target.value); setCurrentPage(1); }}
              className="min-h-[40px] px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 focus:outline-none focus:bg-white"
            />
          )}
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          {activeTab === 'employees' ? (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Member Name</th>
                  <th className="py-3 px-4">Studio</th>
                  <th className="py-3 px-4">Role / Designation</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4 text-right">Monthly Salary</th>
                  <th className="py-3 px-4 text-right">Daily Rate</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {paginatedList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-zinc-400 font-medium">
                      No team members found matching your search.
                    </td>
                  </tr>
                ) : (
                  (paginatedList as EmployeeWithMeta[]).map(emp => (
                    <tr key={emp.id} className="hover:bg-orange-50/20 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-zinc-900">{emp.name}</div>
                        <div className="text-zinc-400 text-xs">ID: {emp.id.slice(0, 12)}</div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-zinc-800">
                        <div>{emp.studioName}</div>
                        <div className="text-zinc-400 text-xs">{emp.studioCity}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-zinc-100 text-zinc-800 border border-zinc-200">
                          {emp.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-zinc-600">
                        <div>{emp.phone}</div>
                        {emp.email && <div className="text-zinc-400 text-xs">{emp.email}</div>}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-zinc-900">
                        ₹{emp.monthlySalary.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-zinc-600">
                        ₹{emp.dailyRate.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border ${
                          emp.status === 'inactive' ? 'bg-zinc-100 text-zinc-600 border-zinc-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {emp.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setEditingEmp(emp);
                              setFormData({
                                studioId: emp.studioId,
                                name: emp.name,
                                phone: emp.phone,
                                email: emp.email || '',
                                role: emp.role,
                                monthlySalary: emp.monthlySalary,
                                dailyRate: emp.dailyRate,
                                status: emp.status
                              });
                              setIsAddModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 cursor-pointer"
                            title="Edit Employee"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingEmp(emp)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                            title="Delete Employee"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Studio</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Shift In</th>
                  <th className="py-3 px-4">Shift Out</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Update Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {paginatedList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-zinc-400 font-medium">
                      No attendance records for selected date.
                    </td>
                  </tr>
                ) : (
                  (paginatedList as any[]).map(a => (
                    <tr key={a.id} className="hover:bg-orange-50/20 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-zinc-900">{a.employeeName}</td>
                      <td className="py-3.5 px-4 text-zinc-700 font-medium">{a.studioName}</td>
                      <td className="py-3.5 px-4 text-zinc-600">{a.role}</td>
                      <td className="py-3.5 px-4 font-mono text-zinc-600">{a.checkIn}</td>
                      <td className="py-3.5 px-4 font-mono text-zinc-600">{a.checkOut}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase border ${
                          a.status === 'present' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          a.status === 'absent' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleToggleAttendance(a)}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 cursor-pointer"
                        >
                          Change Status
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="p-3.5 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
          <span>Showing page {currentPage} of {totalPages} ({currentList.length} records)</span>
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

      {/* Add / Edit Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-zinc-900">
                  {editingEmp ? 'Edit Employee Profile' : 'Onboard Team Member'}
                </h3>
                <p className="text-xs text-zinc-500">Persisted in studio team roster</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-zinc-400 hover:text-zinc-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-zinc-700 block mb-1">Assigned Studio</label>
                <select
                  value={formData.studioId}
                  disabled={Boolean(editingEmp)}
                  onChange={e => setFormData(d => ({ ...d, studioId: e.target.value }))}
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-bold"
                >
                  {studios.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.city})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(d => ({ ...d, name: e.target.value }))}
                  placeholder="e.g. Vikramaditya Solanki"
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={e => setFormData(d => ({ ...d, phone: e.target.value }))}
                    placeholder="e.g. 9825012345"
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData(d => ({ ...d, email: e.target.value }))}
                    placeholder="vikram@studio.in"
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Role / Specialization</label>
                  <select
                    value={formData.role}
                    onChange={e => setFormData(d => ({ ...d, role: e.target.value }))}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl"
                  >
                    <option value="Lead Photographer">Lead Photographer</option>
                    <option value="Traditional Photographer">Traditional Photographer</option>
                    <option value="Cinematographer">Cinematographer</option>
                    <option value="Candid Specialist">Candid Specialist</option>
                    <option value="Drone Pilot">Drone Pilot</option>
                    <option value="Video Editor">Video Editor</option>
                    <option value="Album Designer">Album Designer</option>
                    <option value="Studio Manager">Studio Manager</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Employment Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData(d => ({ ...d, status: e.target.value }))}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Monthly Salary (₹)</label>
                  <input
                    type="number"
                    value={formData.monthlySalary}
                    onChange={e => setFormData(d => ({ ...d, monthlySalary: Number(e.target.value) }))}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Daily / Shoot Rate (₹)</label>
                  <input
                    type="number"
                    value={formData.dailyRate}
                    onChange={e => setFormData(d => ({ ...d, dailyRate: Number(e.target.value) }))}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEmployee}
                className="px-5 py-2 text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white rounded-xl shadow-xs cursor-pointer active:scale-95"
              >
                {editingEmp ? 'Save Changes' : 'Onboard Staff'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingEmp && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center border border-rose-200">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900">Remove Team Member</h3>
                <p className="text-xs text-zinc-500">Deletes employee profile from studio roster</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs space-y-1">
              <div><strong>Name:</strong> {deletingEmp.name}</div>
              <div><strong>Role:</strong> {deletingEmp.role}</div>
              <div><strong>Studio:</strong> {deletingEmp.studioName}</div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setDeletingEmp(null)}
                className="px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteEmployee}
                className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs cursor-pointer active:scale-95"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
