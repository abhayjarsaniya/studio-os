import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useStudio } from '../context/StudioContext';
import { employeeAuthService } from '../services/employeeAuthService';
import { Employee, EmploymentStatus } from '../types';
import { 
  UserCheck, 
  Phone, 
  Mail, 
  MapPin, 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Eye, 
  ShieldCheck, 
  Key, 
  Sparkles,
  Building2,
  Calendar,
  UserX,
  Clock,
  CheckCircle2,
  KeyRound,
  Copy,
  Check
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { EmployeeModal } from '../components/team/EmployeeModal';
import { EmployeeDetailModal } from '../components/team/EmployeeDetailModal';
import { RolesManager } from '../components/team/RolesManager';

export const TeamPage: React.FC = () => {
  const { 
    employees, 
    roles, 
    setEmploymentStatus, 
    attendanceRecords,
    markAttendance,
    currentUser
  } = useApp();

  const { currentStudio } = useStudio();
  const studioId = currentStudio.id;

  const [activeTab, setActiveTab] = useState<'employees' | 'attendance'>('employees');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Employee credentials reset modal state
  const [resetResult, setResetResult] = useState<{
    employeeName: string;
    username?: string;
    email?: string;
    temporaryPassword?: string;
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const isOwnerOrAdmin = ['owner', 'admin', 'studio_owner', 'super_admin'].includes(currentUser.role.toLowerCase());

  // Departments list
  const departments = ['all', ...Array.from(new Set(employees.map(e => e.department)))];

  // Filtered employees
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      emp.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employeeNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.designation.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDept = selectedDepartment === 'all' || emp.department === selectedDepartment;
    const matchesStatus = selectedStatus === 'all' || emp.employmentStatus === selectedStatus;

    return matchesSearch && matchesDept && matchesStatus;
  });

  const handleOpenCreate = () => {
    if (!isOwnerOrAdmin) {
      alert('Only Studio Owners and authorized administrators can add employees.');
      return;
    }
    setEditingEmployee(null);
    setIsEmployeeModalOpen(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    if (!isOwnerOrAdmin) {
      alert('Only Studio Owners and authorized administrators can edit employees.');
      return;
    }
    setEditingEmployee(emp);
    setIsEmployeeModalOpen(true);
  };

  const handleOpenDetail = (emp: Employee) => {
    setSelectedEmployee(emp);
    setIsDetailModalOpen(true);
  };

  const handleToggleStatus = (emp: Employee) => {
    if (!isOwnerOrAdmin) {
      alert('Only Studio Owners can alter employee employment status.');
      return;
    }
    const nextStatus: EmploymentStatus = emp.employmentStatus === 'active' ? 'inactive' : 'active';
    setEmploymentStatus(emp.id, nextStatus);
  };

  const handleResetPassword = (emp: Employee) => {
    if (!isOwnerOrAdmin) {
      alert('Only Studio Owners can reset staff credentials.');
      return;
    }

    if (!window.confirm(`Generate a new temporary password for employee "${emp.fullName}"?`)) {
      return;
    }

    const res = employeeAuthService.resetEmployeeCredentials(studioId, emp.id, currentUser.name);
    if (res.success && res.temporaryPassword) {
      setResetResult({
        employeeName: emp.fullName,
        username: res.username,
        email: res.email,
        temporaryPassword: res.temporaryPassword
      });
    } else {
      const username = emp.email ? emp.email.split('@')[0] : `emp_${emp.id}`;
      const tempPass = `Temp@${Math.floor(1000 + Math.random() * 9000)}!`;
      employeeAuthService.provisionAccount(studioId, emp.id, username, emp.email, tempPass);
      setResetResult({
        employeeName: emp.fullName,
        username,
        email: emp.email,
        temporaryPassword: tempPass
      });
    }
  };

  const handleMarkPresent = (emp: Employee) => {
    const today = new Date().toISOString().split('T')[0];
    const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    markAttendance({
      employeeId: emp.id,
      employeeName: emp.fullName,
      date: today,
      status: 'present',
      checkIn: nowTime
    });
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 font-display">
              Team, Crew & Personnel Management
            </h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-700">
              {employees.length} Staff
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Photographers, cinematographers, drone operators, editors, studio managers and role credentials
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <Button
            variant="primary"
            size="sm"
            className="bg-zinc-900 text-white cursor-pointer"
            icon={<Plus className="w-4 h-4" />}
            onClick={handleOpenCreate}
          >
            Add Employee
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200 text-xs font-semibold overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('employees')}
          className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer ${
            activeTab === 'employees'
              ? 'border-zinc-900 text-zinc-900'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          Staff & Crew Directory ({employees.length})
        </button>

        <button
          onClick={() => setActiveTab('attendance')}
          className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer ${
            activeTab === 'attendance'
              ? 'border-zinc-900 text-zinc-900'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          Daily Attendance
        </button>
      </div>

      {/* Tab 1: Staff Directory */}
      {activeTab === 'employees' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="p-3 bg-white rounded-2xl border border-zinc-200 flex flex-col sm:flex-row items-center gap-2 text-xs">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Search staff by name, email, employee ID or role..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-zinc-200 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={selectedDepartment}
                onChange={e => setSelectedDepartment(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-zinc-200 text-xs bg-white text-zinc-700"
              >
                {departments.map(dept => (
                  <option key={dept} value={dept}>
                    {dept === 'all' ? 'All Departments' : dept}
                  </option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-zinc-200 text-xs bg-white text-zinc-700"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive</option>
                <option value="probation">Probation</option>
              </select>
            </div>
          </div>

          {/* Employees Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEmployees.map(emp => {
              const isActive = emp.employmentStatus === 'active';

              return (
                <div
                  key={emp.id}
                  onClick={() => handleOpenDetail(emp)}
                  className={`p-4 sm:p-5 rounded-2xl bg-white border transition-all cursor-pointer flex flex-col justify-between space-y-4 shadow-xs ${
                    isActive
                      ? 'border-zinc-200 hover:border-zinc-300 hover:shadow-sm'
                      : 'border-zinc-200/60 opacity-70 bg-zinc-50/50'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Top line with Avatar & Badges */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {emp.profilePhoto ? (
                          <img
                            src={emp.profilePhoto}
                            alt={emp.fullName}
                            className="w-11 h-11 rounded-2xl object-cover border border-zinc-200 shrink-0"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-2xl bg-zinc-900 text-white flex items-center justify-center font-bold text-sm shrink-0">
                            {emp.fullName.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-zinc-900 truncate">{emp.fullName}</h4>
                          <p className="text-xs text-zinc-500 truncate">{emp.designation}</p>
                        </div>
                      </div>

                      <span className="font-mono text-xs text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded shrink-0">
                        {emp.employeeNumber}
                      </span>
                    </div>

                    {/* Department & Role badges */}
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="font-semibold text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded-full">
                        {emp.department}
                      </span>
                      <span className="font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                        {emp.roleName}
                      </span>
                      <span className={`font-bold px-2 py-0.5 rounded-full ${
                        isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-600'
                      }`}>
                        {emp.employmentStatus.toUpperCase()}
                      </span>
                    </div>

                    {/* Contact lines */}
                    <div className="space-y-1 text-xs text-zinc-500 pt-1 border-t border-zinc-100">
                      <div className="flex items-center gap-1.5 truncate">
                        <Mail className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className="truncate">{emp.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span>{emp.phone}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom Actions */}
                  <div 
                    className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs"
                    onClick={e => e.stopPropagation()}
                  >
                    <button
                      onClick={() => handleToggleStatus(emp)}
                      className={`text-xs font-semibold transition-colors ${
                        isActive ? 'text-zinc-500 hover:text-rose-600' : 'text-emerald-600 hover:text-emerald-700'
                      }`}
                    >
                      {isActive ? 'Deactivate' : 'Activate'}
                    </button>

                    <div className="flex items-center gap-1">
                      {isOwnerOrAdmin && (
                        <button
                          onClick={() => handleResetPassword(emp)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                          title="Reset Employee Temporary Password"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenEdit(emp)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 transition-colors"
                        title="Edit Profile"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenDetail(emp)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 transition-colors"
                        title="View Full Profile"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredEmployees.length === 0 && (
            <p className="text-center text-xs text-zinc-400 py-12 italic">
              No employees found matching the filters.
            </p>
          )}
        </div>
      )}

      {/* Tab 2: Daily Attendance */}
      {activeTab === 'attendance' && (
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-zinc-200 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider text-zinc-400">
                Today&apos;s Crew Attendance Roster
              </h3>
              <p className="text-xs text-zinc-500">Record check-in time for staff and shoot crew</p>
            </div>
            <span className="text-xs font-mono font-semibold text-zinc-700 bg-zinc-100 px-2.5 py-1 rounded-lg">
              {new Date().toISOString().split('T')[0]}
            </span>
          </div>

          <div className="divide-y divide-zinc-100">
            {employees.map(emp => {
              const todayStr = new Date().toISOString().split('T')[0];
              const todayAtt = attendanceRecords.find(a => a.employeeId === emp.id && a.date === todayStr);

              return (
                <div key={emp.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-zinc-900">{emp.fullName}</p>
                    <p className="text-xs text-zinc-400">{emp.designation}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    {todayAtt ? (
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Present ({todayAtt.checkIn})
                      </span>
                    ) : (
                      <Button
                        variant="outline"
                        size="xs"
                        icon={<Clock className="w-3.5 h-3.5 text-zinc-500" />}
                        onClick={() => handleMarkPresent(emp)}
                      >
                        Mark Present
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modals */}
      <EmployeeModal
        isOpen={isEmployeeModalOpen}
        onClose={() => {
          setIsEmployeeModalOpen(false);
          setEditingEmployee(null);
        }}
        initialEmployee={editingEmployee}
      />

      <EmployeeDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedEmployee(null);
        }}
        employee={selectedEmployee}
        onEdit={handleOpenEdit}
      />

      {/* Reset Employee Password Modal */}
      {resetResult && (
        <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200">
            <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <KeyRound className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-zinc-900 text-center mb-1">
              Temporary Credentials Generated
            </h3>
            <p className="text-xs text-zinc-500 text-center mb-4">
              Share this temporary password with <strong>{resetResult.employeeName}</strong>. They will be required to change it upon first login.
            </p>

            <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 space-y-2 mb-4 font-mono text-xs">
              <div className="flex justify-between items-center text-zinc-600">
                <span>Username:</span>
                <span className="font-bold text-zinc-900">{resetResult.username || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center text-zinc-600">
                <span>Email:</span>
                <span className="font-bold text-zinc-900">{resetResult.email}</span>
              </div>
              <div className="flex justify-between items-center text-zinc-600">
                <span>Temp Password:</span>
                <span className="font-bold text-indigo-600 select-all">{resetResult.temporaryPassword}</span>
              </div>
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(`Studio OS Login\nEmail: ${resetResult.email}\nTemp Password: ${resetResult.temporaryPassword}`);
                setCopiedKey(true);
                setTimeout(() => setCopiedKey(false), 2000);
              }}
              className="w-full py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold rounded-xl flex items-center justify-center gap-2 mb-2 cursor-pointer"
            >
              {copiedKey ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              {copiedKey ? 'Copied to Clipboard' : 'Copy Credentials'}
            </button>

            <button
              onClick={() => setResetResult(null)}
              className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold rounded-xl cursor-pointer"
            >
              Done & Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
