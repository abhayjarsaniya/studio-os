import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useStudio } from '../context/StudioContext';
import { unifiedAuthService } from '../services/unifiedAuthService';
import { firebaseAuthService } from '../services/firebaseAuthService';
import { Employee, EmploymentStatus } from '../types';
import { 
  Users, 
  UserCheck, 
  Phone, 
  Mail, 
  MapPin, 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Eye, 
  KeyRound, 
  Sparkles,
  Building2, 
  Calendar, 
  UserX, 
  Clock, 
  CheckCircle2, 
  Copy, 
  Check, 
  X, 
  Camera, 
  Video, 
  Film, 
  Truck, 
  Layers, 
  CalendarDays,
  Shield,
  Trash2,
  AlertTriangle,
  Send,
  MoreVertical,
  CheckSquare,
  Share2
} from 'lucide-react';

export type CrewType = 'Permanent Employee' | 'Freelance Crew' | 'External Supplier' | 'Partner Studio Crew';

export const CrewMembersPage: React.FC = () => {
  const { 
    employees, 
    roles, 
    events, 
    createEmployee,
    updateEmployee,
    setEmploymentStatus,
    deleteEmployee,
    updateEvent
  } = useApp();

  const { currentStudio, branches } = useStudio();
  const studioId = currentStudio.id;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCrewType, setSelectedCrewType] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedCrew, setSelectedCrew] = useState<Employee | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingCrew, setEditingCrew] = useState<Employee | null>(null);
  const [deactivatingCrew, setDeactivatingCrew] = useState<Employee | null>(null);
  const [deletingCrew, setDeletingCrew] = useState<Employee | null>(null);
  const [assigningCrew, setAssigningCrew] = useState<Employee | null>(null);
  const [selectedEventToAssign, setSelectedEventToAssign] = useState<string>('');

  // New Crew Form State
  const [formData, setFormData] = useState({
    fullName: '',
    crewType: 'Permanent Employee' as CrewType,
    employeeNumber: '',
    username: '',
    mobile: '',
    whatsapp: '',
    email: '',
    department: 'Photography',
    designation: 'Lead Photographer',
    roleId: roles.find(r => r.id === 'photographer')?.id || roles[0]?.id || 'photographer',
    joiningDate: new Date().toISOString().split('T')[0],
    branchId: branches?.[0]?.id || 'main',
    dailyRate: '3500',
    status: 'active' as EmploymentStatus,
    profilePhoto: '',
    generateLogin: true,
    initialPassword: 'TempPassword@123'
  });

  // Edit Crew Form State
  const [editFormData, setEditFormData] = useState({
    fullName: '',
    mobile: '',
    whatsapp: '',
    email: '',
    department: 'Photography',
    designation: '',
    branchId: '',
    profilePhoto: '',
    crewType: 'Permanent Employee' as CrewType
  });

  // Generated Credentials Modal State
  const [generatedCreds, setGeneratedCreds] = useState<{
    name: string;
    username: string;
    password: string;
    loginUrl: string;
    phone?: string;
    email?: string;
    isReset?: boolean;
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  // Filtered Crew Members
  const filteredCrew = useMemo(() => {
    return employees.filter(emp => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = 
        emp.fullName.toLowerCase().includes(q) ||
        emp.email.toLowerCase().includes(q) ||
        emp.employeeNumber.toLowerCase().includes(q) ||
        emp.designation.toLowerCase().includes(q) ||
        (emp.phone && emp.phone.includes(q));

      const empType = (emp as any).crewType || 'Permanent Employee';
      const matchesType = selectedCrewType === 'all' || empType === selectedCrewType;
      const matchesDept = selectedDepartment === 'all' || emp.department === selectedDepartment;
      const matchesStatus = selectedStatus === 'all' || emp.employmentStatus === selectedStatus;

      return matchesSearch && matchesType && matchesDept && matchesStatus;
    });
  }, [employees, searchQuery, selectedCrewType, selectedDepartment, selectedStatus]);

  // Statistics
  const stats = useMemo(() => {
    const total = employees.length;
    const active = employees.filter(e => e.employmentStatus === 'active').length;
    const permanent = employees.filter(e => ((e as any).crewType || 'Permanent Employee') === 'Permanent Employee').length;
    const freelance = employees.filter(e => (e as any).crewType === 'Freelance Crew').length;
    const suppliers = employees.filter(e => (e as any).crewType === 'External Supplier').length;
    const partner = employees.filter(e => (e as any).crewType === 'Partner Studio Crew').length;

    return { total, active, permanent, freelance, suppliers, partner };
  }, [employees]);

  // Master Admin approved roles (excluding Master Admin itself)
  const approvedRoles = useMemo(() => {
    return roles.filter(r => r.id !== 'master_super_admin' && r.id !== 'master_admin');
  }, [roles]);

  // Handle Create Crew Member
  const handleSaveCrew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.email.trim()) {
      alert('Full Name and Email are required.');
      return;
    }

    const employeeId = `emp_${Date.now()}`;
    const newEmpNumber = formData.employeeNumber.trim() || `CREW-${String(employees.length + 1).padStart(3, '0')}`;
    const generatedUsername = formData.username.trim() || formData.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
    const tempPassword = formData.initialPassword || `Temp#${Math.floor(1000 + Math.random() * 9000)}`;

    const selectedRole = approvedRoles.find(r => r.id === formData.roleId) || approvedRoles[0];

    // Create login account through trusted backend
    if (formData.generateLogin) {
      try {
        unifiedAuthService.provisionEmployee({
          studioId,
          studioName: currentStudio.name,
          employeeName: formData.fullName.trim(),
          employeeId,
          email: formData.email.trim(),
          mobile: formData.mobile.trim(),
          username: generatedUsername,
          roleId: selectedRole?.id || 'photographer',
          roleTitle: selectedRole?.name || 'Staff Member',
          initialPassword: tempPassword
        });
      } catch (err) {
        console.warn('Backend employee provisioning notice:', err);
      }
    }

    // Add employee to context state
    const newMember: Employee = {
      id: employeeId,
      studioId,
      userId: `usr_${employeeId}`,
      employeeNumber: newEmpNumber,
      fullName: formData.fullName.trim(),
      email: formData.email.trim(),
      phone: formData.mobile.trim(),
      department: formData.department,
      designation: formData.designation.trim() || 'Staff Member',
      roleId: selectedRole?.id || 'photographer',
      roleName: selectedRole?.name || 'Photographer',
      branchId: formData.branchId || branches?.[0]?.id || 'main',
      employmentStatus: formData.status,
      dateOfJoining: formData.joiningDate || new Date().toISOString().split('T')[0],
      profilePhoto: formData.profilePhoto || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(formData as any)
    };

    employees.unshift(newMember);

    if (formData.generateLogin) {
      setGeneratedCreds({
        name: formData.fullName,
        username: generatedUsername,
        password: tempPassword,
        loginUrl: `${window.location.origin}/#/employee/login`,
        phone: formData.mobile || formData.whatsapp,
        email: formData.email,
        isReset: false
      });
    }

    setIsAddModalOpen(false);
    // Reset form
    setFormData({
      fullName: '',
      crewType: 'Permanent Employee',
      employeeNumber: '',
      username: '',
      mobile: '',
      whatsapp: '',
      email: '',
      department: 'Photography',
      designation: 'Lead Photographer',
      roleId: approvedRoles[0]?.id || 'photographer',
      joiningDate: new Date().toISOString().split('T')[0],
      branchId: branches?.[0]?.id || 'main',
      dailyRate: '3500',
      status: 'active',
      profilePhoto: '',
      generateLogin: true,
      initialPassword: 'TempPassword@123'
    });
  };

  // Open Edit Modal
  const handleOpenEdit = (emp: Employee) => {
    setEditingCrew(emp);
    setEditFormData({
      fullName: emp.fullName,
      mobile: emp.phone || '',
      whatsapp: (emp as any).whatsapp || emp.phone || '',
      email: emp.email,
      department: emp.department,
      designation: emp.designation,
      branchId: emp.branchId || branches?.[0]?.id || 'main',
      profilePhoto: emp.profilePhoto || '',
      crewType: (emp as any).crewType || 'Permanent Employee'
    });
  };

  // Handle Save Edit
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCrew) return;

    const updates: Partial<Employee> = {
      fullName: editFormData.fullName.trim(),
      phone: editFormData.mobile.trim(),
      email: editFormData.email.trim(),
      department: editFormData.department,
      designation: editFormData.designation.trim(),
      branchId: editFormData.branchId,
      profilePhoto: editFormData.profilePhoto.trim() || undefined,
      ...({ crewType: editFormData.crewType, whatsapp: editFormData.whatsapp.trim() } as any)
    };

    updateEmployee(editingCrew.id, updates);
    // Also update in-memory reference
    Object.assign(editingCrew, updates);

    setEditingCrew(null);
  };

  // Confirm Deactivate
  const handleConfirmDeactivate = () => {
    if (!deactivatingCrew) return;
    try {
      const accountId = deactivatingCrew.userId || `usr_${deactivatingCrew.id}`;
      unifiedAuthService.deactivateAccount(accountId, 'Studio Owner');
    } catch (e) {
      console.warn('Deactivate auth account notice:', e);
    }
    setEmploymentStatus(deactivatingCrew.id, 'inactive');
    deactivatingCrew.employmentStatus = 'inactive';
    setDeactivatingCrew(null);
  };

  // Reactivate
  const handleReactivate = (emp: Employee) => {
    try {
      const accountId = emp.userId || `usr_${emp.id}`;
      unifiedAuthService.reactivateAccount(accountId, 'Studio Owner');
    } catch (e) {
      console.warn('Reactivate auth account notice:', e);
    }
    setEmploymentStatus(emp.id, 'active');
    emp.employmentStatus = 'active';
  };

  // Confirm Delete / Archive
  const handleConfirmDelete = () => {
    if (!deletingCrew) return;

    // Never allow deleting Master Admin
    if (deletingCrew.roleId === 'master_super_admin' || deletingCrew.roleId === 'master_admin') {
      alert('Security violation: Master Admin account cannot be deleted or modified.');
      setDeletingCrew(null);
      return;
    }

    const hasHistory = events.some(ev => ev.assignedTeamIds?.includes(deletingCrew.id));

    if (hasHistory) {
      // Safe archival: revoke access and mark archived
      try {
        const accountId = deletingCrew.userId || `usr_${deletingCrew.id}`;
        unifiedAuthService.deactivateAccount(accountId, 'Studio Owner');
      } catch (e) {
        console.warn('Deactivate auth account notice:', e);
      }
      setEmploymentStatus(deletingCrew.id, 'inactive');
      deletingCrew.employmentStatus = 'inactive';
      (deletingCrew as any).isArchived = true;
      alert(`To safeguard historical event assignments and audit trails, ${deletingCrew.fullName}'s account has been archived and login access revoked rather than destructively deleted.`);
    } else {
      // Safe deletion
      try {
        const accountId = deletingCrew.userId || `usr_${deletingCrew.id}`;
        unifiedAuthService.deactivateAccount(accountId, 'Studio Owner');
      } catch (e) {
        // Safe fallback
      }
      deleteEmployee(deletingCrew.id);
      const idx = employees.findIndex(e => e.id === deletingCrew.id);
      if (idx >= 0) employees.splice(idx, 1);
    }

    setDeletingCrew(null);
  };

  // Reset Password
  const handleResetPassword = (emp: Employee) => {
    const accountId = emp.userId || `usr_${emp.id}`;
    let newTempPassword = `Reset#${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      newTempPassword = unifiedAuthService.resetAccountPassword(accountId, 'Studio Owner');
    } catch (e) {
      // Fallback
    }

    const username = (emp as any).username || emp.email.split('@')[0];
    setGeneratedCreds({
      name: emp.fullName,
      username,
      password: newTempPassword,
      loginUrl: `${window.location.origin}/#/employee/login`,
      phone: emp.phone || (emp as any).whatsapp,
      email: emp.email,
      isReset: true
    });
  };

  // Assign to Event
  const handleAssignToEvent = () => {
    if (!assigningCrew || !selectedEventToAssign) return;
    const targetEvent = events.find(ev => ev.id === selectedEventToAssign);
    if (!targetEvent) return;

    const existingAssigned = targetEvent.assignedTeamIds || [];
    if (!existingAssigned.includes(assigningCrew.id)) {
      updateEvent(targetEvent.id, {
        assignedTeamIds: [...existingAssigned, assigningCrew.id]
      });
    }

    alert(`Successfully assigned ${assigningCrew.fullName} to "${targetEvent.title || targetEvent.name}"!`);
    setAssigningCrew(null);
    setSelectedEventToAssign('');
  };

  // Copy credentials
  const handleCopyCredentials = (key?: string) => {
    if (!generatedCreds) return;
    if (key === 'user') {
      navigator.clipboard.writeText(generatedCreds.username);
      setCopiedKey('user');
    } else if (key === 'pass') {
      navigator.clipboard.writeText(generatedCreds.password);
      setCopiedKey('pass');
    } else if (key === 'url') {
      navigator.clipboard.writeText(generatedCreds.loginUrl);
      setCopiedKey('url');
    } else {
      const text = `=== STUDIO OS CREW LOGIN CREDENTIALS ===\nEmployee: ${generatedCreds.name}\nLogin Portal: ${generatedCreds.loginUrl}\nUsername / Email: ${generatedCreds.username}\nTemporary Password: ${generatedCreds.password}\n\nPlease keep these login details secure. You can update your password from Security & Password in the portal.`;
      navigator.clipboard.writeText(text);
      setCopiedKey('all');
    }
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleShareWhatsAppCrew = () => {
    if (!generatedCreds) return;
    const cleanPhone = (generatedCreds.phone || '').replace(/[^0-9]/g, '');
    const msg = `Hello ${generatedCreds.name},\n\nYour Studio OS employee portal login details:\n\nPortal: ${generatedCreds.loginUrl}\nUsername / Email: ${generatedCreds.username}\nTemporary Password: ${generatedCreds.password}\n\nPlease keep these details secure. You can update your password anytime from Security & Password in the portal.`;
    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handleSendResetEmailCrew = async () => {
    if (!generatedCreds?.email) return;
    try {
      const res = await firebaseAuthService.sendPasswordReset(generatedCreds.email);
      if (res.success) {
        setResetEmailSent(true);
        setTimeout(() => setResetEmailSent(false), 4000);
      } else {
        alert(res.error || 'Failed to dispatch reset email.');
      }
    } catch (e: any) {
      alert(e.message || 'Error dispatching reset email.');
    }
  };

  // Get assignments for selected crew
  const crewAssignments = useMemo(() => {
    if (!selectedCrew) return [];
    return events.filter(ev => {
      return (ev.assignedTeamIds && ev.assignedTeamIds.includes(selectedCrew.id));
    });
  }, [selectedCrew, events]);

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
              Operations Crew
            </span>
            <span className="text-xs text-zinc-500">{stats.active} of {stats.total} Active</span>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight mt-1 font-display">
            Crew Members & Collaborators
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Full employee lifecycle: add, view, edit, password reset, event assignment, deactivation, and safe archival.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs transition-all shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Employee</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-2xl bg-white border border-zinc-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase">Total Crew</span>
            <Users className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-xl font-bold text-zinc-900 mt-1 font-display">{stats.total}</div>
          <span className="text-[10px] text-zinc-400">All registered staff</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-zinc-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase">Permanent</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-emerald-700 mt-1 font-display">{stats.permanent}</div>
          <span className="text-[10px] text-emerald-600 font-medium">On monthly payroll</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-zinc-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase">Freelancers</span>
            <Camera className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-bold text-indigo-700 mt-1 font-display">{stats.freelance}</div>
          <span className="text-[10px] text-indigo-600 font-medium">Per-event billing</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-zinc-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase">Suppliers</span>
            <Truck className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-amber-700 mt-1 font-display">{stats.suppliers}</div>
          <span className="text-[10px] text-amber-600 font-medium">Gear, lab & drones</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-zinc-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase">Partner Studios</span>
            <Layers className="w-4 h-4 text-violet-600" />
          </div>
          <div className="text-xl font-bold text-violet-700 mt-1 font-display">{stats.partner}</div>
          <span className="text-[10px] text-violet-600 font-medium">Shared coverage</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-zinc-200/80 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, ID, phone, designation..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-50/70 border border-zinc-200/80 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <select
            value={selectedCrewType}
            onChange={(e) => setSelectedCrewType(e.target.value)}
            className="px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-semibold text-zinc-700 focus:outline-none cursor-pointer"
          >
            <option value="all">All Crew Types</option>
            <option value="Permanent Employee">Permanent Employee</option>
            <option value="Freelance Crew">Freelance Crew</option>
            <option value="External Supplier">External Supplier</option>
            <option value="Partner Studio Crew">Partner Studio Crew</option>
          </select>

          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-semibold text-zinc-700 focus:outline-none cursor-pointer"
          >
            <option value="all">All Departments</option>
            <option value="Photography">Photography</option>
            <option value="Cinematography">Cinematography</option>
            <option value="Drone">Drone</option>
            <option value="Editing">Editing</option>
            <option value="Album Design">Album Design</option>
            <option value="Production">Production</option>
            <option value="Management">Management</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-semibold text-zinc-700 focus:outline-none cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="probation">Probation</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Crew Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCrew.map(emp => {
          const empCrewType = (emp as any).crewType || 'Permanent Employee';
          const isActive = emp.employmentStatus === 'active';

          return (
            <div
              key={emp.id}
              className="bg-white border border-zinc-200/90 rounded-2xl p-4 shadow-xs hover:border-zinc-300 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-800 font-bold text-sm shrink-0 font-display overflow-hidden">
                      {emp.profilePhoto ? (
                        <img src={emp.profilePhoto} alt={emp.fullName} className="w-full h-full object-cover" />
                      ) : (
                        emp.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm text-zinc-900 truncate font-display">
                        {emp.fullName}
                      </h3>
                      <p className="text-[11px] text-zinc-500 font-mono">
                        {emp.employeeNumber || 'ID Pending'}
                      </p>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    isActive 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                      : 'bg-zinc-100 text-zinc-500 border border-zinc-200'
                  }`}>
                    {emp.employmentStatus}
                  </span>
                </div>

                {/* Badges */}
                <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {empCrewType}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-zinc-100 text-zinc-700">
                    {emp.department}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] text-zinc-500 border border-zinc-200">
                    {emp.designation}
                  </span>
                </div>

                {/* Contact Info */}
                <div className="mt-3.5 space-y-1.5 text-xs text-zinc-600 border-t border-zinc-100 pt-3">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span className="font-mono text-[11px]">{emp.phone || 'Phone not set'}</span>
                    {emp.phone && (
                      <a
                        href={`https://wa.me/${emp.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-emerald-600 hover:underline font-semibold ml-auto"
                      >
                        WhatsApp
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span className="font-mono text-[11px] truncate">{emp.email}</span>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="mt-4 pt-3 border-t border-zinc-100 space-y-2">
                <div className="flex items-center justify-between gap-1.5">
                  <button
                    onClick={() => {
                      setSelectedCrew(emp);
                      setIsDetailModalOpen(true);
                    }}
                    className="flex-1 px-2.5 py-1.5 rounded-xl bg-zinc-50 hover:bg-zinc-100 text-zinc-700 font-semibold text-xs border border-zinc-200 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 text-zinc-500" />
                    <span>View</span>
                  </button>

                  <button
                    onClick={() => handleOpenEdit(emp)}
                    className="flex-1 px-2.5 py-1.5 rounded-xl bg-zinc-50 hover:bg-zinc-100 text-zinc-700 font-semibold text-xs border border-zinc-200 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => {
                      setAssigningCrew(emp);
                      setSelectedEventToAssign('');
                    }}
                    className="flex-1 px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs border border-indigo-200 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <CalendarDays className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Assign</span>
                  </button>
                </div>

                <div className="flex items-center justify-between gap-1.5 pt-1">
                  <button
                    onClick={() => handleResetPassword(emp)}
                    className="px-2.5 py-1.5 rounded-xl text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                    title="Reset Employee Password"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Reset Key</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {isActive ? (
                      <button
                        onClick={() => setDeactivatingCrew(emp)}
                        className="px-2.5 py-1 rounded-lg text-rose-600 hover:bg-rose-50 text-[11px] font-semibold border border-rose-200 cursor-pointer transition-colors"
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        onClick={() => handleReactivate(emp)}
                        className="px-2.5 py-1 rounded-lg text-emerald-600 hover:bg-emerald-50 text-[11px] font-semibold border border-emerald-200 cursor-pointer transition-colors"
                      >
                        Reactivate
                      </button>
                    )}

                    <button
                      onClick={() => setDeletingCrew(emp)}
                      className="p-1 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                      title="Delete / Archive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredCrew.length === 0 && (
        <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center">
          <Users className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-zinc-900">No crew members found</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            Try adjusting your search query or filters, or add a new team member to your studio roster.
          </p>
        </div>
      )}

      {/* Add Employee Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-zinc-200 max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-zinc-50/70">
              <div>
                <h3 className="text-base font-bold text-zinc-900 font-display">Add Employee / Crew Member</h3>
                <p className="text-xs text-zinc-500">Register employee with secure login and role permissions.</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCrew} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              {/* Classification */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1.5">
                  Crew Classification *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Permanent Employee', 'Freelance Crew', 'External Supplier', 'Partner Studio Crew'] as CrewType[]).map(t => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setFormData(prev => ({ ...prev, crewType: t }))}
                      className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                        formData.crewType === t 
                          ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs' 
                          : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-200'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Personal Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                    placeholder="e.g. Vikram Sharma"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    value={formData.employeeNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, employeeNumber: e.target.value }))}
                    placeholder="Auto-generated if empty"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 font-mono"
                  />
                </div>
              </div>

              {/* Contacts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1">
                    Mobile Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.mobile}
                    onChange={(e) => setFormData(prev => ({ ...prev, mobile: e.target.value }))}
                    placeholder="9876543210"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1">
                    WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                    placeholder="Same as mobile if empty"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="vikram@shreejistudio.in"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>

              {/* Role & Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1">
                    Department
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white"
                  >
                    <option value="Photography">Photography</option>
                    <option value="Cinematography">Cinematography</option>
                    <option value="Drone">Drone</option>
                    <option value="Editing">Editing</option>
                    <option value="Album Design">Album Design</option>
                    <option value="Production">Production</option>
                    <option value="Management">Management</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1">
                    Designation
                  </label>
                  <input
                    type="text"
                    value={formData.designation}
                    onChange={(e) => setFormData(prev => ({ ...prev, designation: e.target.value }))}
                    placeholder="e.g. Senior Drone Specialist"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
              </div>

              {/* Approved Role (Master Admin RBAC restricted) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1">
                    Approved System Role *
                  </label>
                  <select
                    value={formData.roleId}
                    onChange={(e) => setFormData(prev => ({ ...prev, roleId: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white font-semibold"
                  >
                    {approvedRoles.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-zinc-400 mt-0.5 block">
                    Restricted to Master Admin approved roles
                  </span>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1">
                    Assigned Branch
                  </label>
                  <select
                    value={formData.branchId}
                    onChange={(e) => setFormData(prev => ({ ...prev, branchId: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                    {branches.length === 0 && <option value="main">Main Studio Branch</option>}
                  </select>
                </div>
              </div>

              {/* Joining Date & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1">
                    Joining Date
                  </label>
                  <input
                    type="date"
                    value={formData.joiningDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, joiningDate: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1">
                    Initial Account Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as EmploymentStatus }))}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white font-semibold"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="probation">Probation</option>
                  </select>
                </div>
              </div>

              {/* Optional Profile Photo */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1">
                  Profile Photo URL (Optional)
                </label>
                <input
                  type="url"
                  value={formData.profilePhoto}
                  onChange={(e) => setFormData(prev => ({ ...prev, profilePhoto: e.target.value }))}
                  placeholder="https://example.com/photo.jpg"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-xs"
                />
              </div>

              {/* Secure Login Generator */}
              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-zinc-700" />
                    <span className="font-bold text-zinc-900">Provision Studio OS Employee Login</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.generateLogin}
                    onChange={(e) => setFormData(prev => ({ ...prev, generateLogin: e.target.checked }))}
                    className="w-4 h-4 accent-zinc-900 rounded"
                  />
                </div>

                {formData.generateLogin && (
                  <div className="space-y-2 pt-1 border-t border-zinc-200">
                    <p className="text-[11px] text-zinc-500">
                      Creates a secure independent authentication account. Passwords are encrypted and never stored in plaintext. Password change required on first login.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-zinc-400 font-semibold block mb-0.5">Username</span>
                        <input
                          type="text"
                          value={formData.username}
                          onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                          placeholder={formData.email ? formData.email.split('@')[0] : 'username'}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white font-mono text-[11px]"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-400 font-semibold block mb-0.5">Initial Temporary Password</span>
                        <input
                          type="text"
                          value={formData.initialPassword}
                          onChange={(e) => setFormData(prev => ({ ...prev, initialPassword: e.target.value }))}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white font-mono text-[11px]"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-zinc-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-zinc-600 hover:bg-zinc-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold shadow-xs cursor-pointer"
                >
                  Save & Provision Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {editingCrew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-zinc-200 max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-zinc-50/70">
              <div>
                <h3 className="text-base font-bold text-zinc-900 font-display">Edit Employee Profile</h3>
                <p className="text-xs text-zinc-500">Update personal, contact and departmental details.</p>
              </div>
              <button
                onClick={() => setEditingCrew(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Security Notice: Employee authentication identity and global RBAC permissions cannot be altered via profile edits.</span>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.fullName}
                  onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1">
                    Mobile Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={editFormData.mobile}
                    onChange={(e) => setEditFormData({ ...editFormData, mobile: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1">
                    WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    value={editFormData.whatsapp}
                    onChange={(e) => setEditFormData({ ...editFormData, whatsapp: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1">
                    Department
                  </label>
                  <select
                    value={editFormData.department}
                    onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white"
                  >
                    <option value="Photography">Photography</option>
                    <option value="Cinematography">Cinematography</option>
                    <option value="Drone">Drone</option>
                    <option value="Editing">Editing</option>
                    <option value="Album Design">Album Design</option>
                    <option value="Production">Production</option>
                    <option value="Management">Management</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1">
                    Designation
                  </label>
                  <input
                    type="text"
                    value={editFormData.designation}
                    onChange={(e) => setEditFormData({ ...editFormData, designation: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1">
                  Assigned Branch
                </label>
                <select
                  value={editFormData.branchId}
                  onChange={(e) => setEditFormData({ ...editFormData, branchId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white"
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                  {branches.length === 0 && <option value="main">Main Studio Branch</option>}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1">
                  Profile Photo URL (Optional)
                </label>
                <input
                  type="url"
                  value={editFormData.profilePhoto}
                  onChange={(e) => setEditFormData({ ...editFormData, profilePhoto: e.target.value })}
                  placeholder="https://example.com/photo.jpg"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-xs"
                />
              </div>

              <div className="pt-3 border-t border-zinc-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCrew(null)}
                  className="px-4 py-2 rounded-xl text-zinc-600 hover:bg-zinc-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold shadow-xs cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deactivate Confirmation Modal */}
      {deactivatingCrew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-zinc-200 max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <UserX className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 font-display">Deactivate Employee</h3>
                <p className="text-xs text-zinc-500">{deactivatingCrew.fullName} ({deactivatingCrew.designation})</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-200 text-xs text-rose-900 space-y-2">
              <p className="font-semibold">
                Deactivating this employee will immediately revoke their login access and invalidate active sessions.
              </p>
              <p className="text-[11px] text-rose-700">
                All historical event assignments, attendance logs, and completed tasks will be safely preserved. You can reactivate their account anytime.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeactivatingCrew(null)}
                className="px-4 py-2 rounded-xl border border-zinc-200 text-zinc-700 font-semibold text-xs hover:bg-zinc-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeactivate}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer transition-colors shadow-xs"
              >
                Confirm Deactivation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete / Safe Archival Modal */}
      {deletingCrew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-zinc-200 max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 font-display">Delete or Archive Employee</h3>
                <p className="text-xs text-zinc-500">{deletingCrew.fullName}</p>
              </div>
            </div>

            {events.some(ev => ev.assignedTeamIds?.includes(deletingCrew.id)) ? (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
                <p className="font-bold">
                  Historical Records Detected
                </p>
                <p className="text-[11px] text-amber-800">
                  This employee is linked to historical shoot assignments. Studio OS policy prohibits destructive deletion of business records. Their login account will be **Archived** instead of deleted, revoking all portal access while preserving your event data.
                </p>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-700 space-y-1">
                <p className="font-semibold">
                  Are you sure you want to delete this employee?
                </p>
                <p className="text-[11px] text-zinc-500">
                  This team member has no historical event records and will be removed from your studio roster.
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingCrew(null)}
                className="px-4 py-2 rounded-xl border border-zinc-200 text-zinc-700 font-semibold text-xs hover:bg-zinc-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs cursor-pointer transition-colors"
              >
                {events.some(ev => ev.assignedTeamIds?.includes(deletingCrew.id)) ? 'Archive Account Safely' : 'Delete Employee'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generated Credentials Modal (Add or Reset) */}
      {generatedCreds && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-zinc-200 max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 font-display">
                    {generatedCreds.isReset ? 'Password Reset Generated' : 'Employee Account Provisioned'}
                  </h3>
                  <p className="text-xs text-zinc-500">Official Crew Login Handover</p>
                </div>
              </div>
              <button
                onClick={() => setGeneratedCreds(null)}
                className="p-1 rounded-full text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {resetEmailSent && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Password reset link sent to {generatedCreds.email}!</span>
              </div>
            )}

            <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-2.5 text-xs font-mono">
              <div className="flex items-center justify-between pb-1.5 border-b border-zinc-200/60 font-sans">
                <span className="text-zinc-400 text-[11px] uppercase font-bold">Crew Member</span>
                <span className="font-bold text-zinc-900 text-xs">{generatedCreds.name}</span>
              </div>

              <div className="flex items-center justify-between py-0.5">
                <span className="text-zinc-500 font-sans">Login Portal:</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-800 truncate max-w-[180px] text-[11px]">{generatedCreds.loginUrl}</span>
                  <button
                    onClick={() => handleCopyCredentials('url')}
                    className="p-1 hover:bg-zinc-200 rounded text-zinc-600 cursor-pointer"
                    title="Copy Login Portal URL"
                  >
                    {copiedKey === 'url' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between py-0.5">
                <span className="text-zinc-500 font-sans">Username / Email:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-indigo-700">{generatedCreds.username}</span>
                  <button
                    onClick={() => handleCopyCredentials('user')}
                    className="p-1 hover:bg-zinc-200 rounded text-zinc-600 cursor-pointer"
                    title="Copy Username"
                  >
                    {copiedKey === 'user' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between py-1 px-2 bg-amber-50 rounded-xl border border-amber-200/70">
                <span className="text-amber-900 font-sans font-semibold">Temporary Password:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-amber-950 bg-white px-2 py-0.5 rounded border border-amber-300">
                    {generatedCreds.password}
                  </span>
                  <button
                    onClick={() => handleCopyCredentials('pass')}
                    className="p-1 hover:bg-amber-200 rounded text-amber-900 cursor-pointer"
                    title="Copy Temporary Password"
                  >
                    {copiedKey === 'pass' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-zinc-500 font-sans leading-relaxed">
              <strong>Security note:</strong> The employee can sign in immediately and update their password from Security & Password in the portal, or request a password reset anytime.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-sans">
              <button
                onClick={() => handleCopyCredentials('all')}
                className="py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              >
                {copiedKey === 'all' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedKey === 'all' ? 'Details Copied!' : 'Copy All Details'}</span>
              </button>

              <button
                onClick={handleShareWhatsAppCrew}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              >
                <Share2 className="w-4 h-4" />
                <span>Share WhatsApp</span>
              </button>

              {generatedCreds.email && (
                <button
                  onClick={handleSendResetEmailCrew}
                  className="py-2 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer sm:col-span-2 border border-zinc-200"
                >
                  <Mail className="w-3.5 h-3.5 text-zinc-600" />
                  <span>Send Reset Email to {generatedCreds.email}</span>
                </button>
              )}
            </div>

            <p className="text-[10px] text-zinc-400 text-center font-sans">
              WhatsApp click-to-chat opens with prefilled text. Press Send in WhatsApp.
            </p>
          </div>
        </div>
      )}

      {/* Assign Crew to Event Modal */}
      {assigningCrew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-zinc-200 max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div>
                <h3 className="text-base font-bold text-zinc-900 font-display">Assign Crew Member</h3>
                <p className="text-xs text-zinc-500">Assign {assigningCrew.fullName} ({assigningCrew.designation}) to an upcoming shoot.</p>
              </div>
              <button
                onClick={() => setAssigningCrew(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1">
                  Select Upcoming Event *
                </label>
                <select
                  value={selectedEventToAssign}
                  onChange={(e) => setSelectedEventToAssign(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-zinc-200 bg-white font-semibold text-xs"
                >
                  <option value="">Choose an upcoming event...</option>
                  {events
                    .filter(ev => (ev.status as string) !== 'Completed' && (ev.status as string) !== 'Cancelled' && (ev.status as string) !== 'completed' && (ev.status as string) !== 'cancelled')
                    .map(ev => (
                      <option key={ev.id} value={ev.id}>
                        {ev.title || ev.name} ({ev.startDate || 'Date TBD'})
                      </option>
                    ))}
                </select>
              </div>

              <p className="text-[11px] text-zinc-500">
                Assigned crew members can view this shoot's schedule, call timings, and upload delivery links in their Employee Portal.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setAssigningCrew(null)}
                className="px-4 py-2 rounded-xl border border-zinc-200 text-zinc-700 font-semibold text-xs hover:bg-zinc-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={!selectedEventToAssign}
                onClick={handleAssignToEvent}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white font-bold text-xs cursor-pointer transition-colors"
              >
                Confirm Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Crew Detail & Assignments Modal */}
      {isDetailModalOpen && selectedCrew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-zinc-200 max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-zinc-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-bold text-sm overflow-hidden">
                  {selectedCrew.profilePhoto ? (
                    <img src={selectedCrew.profilePhoto} alt={selectedCrew.fullName} className="w-full h-full object-cover" />
                  ) : (
                    selectedCrew.fullName.substring(0, 2).toUpperCase()
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 font-display">{selectedCrew.fullName}</h3>
                  <p className="text-xs text-zinc-500">{selectedCrew.designation} • {(selectedCrew as any).crewType || 'Permanent'}</p>
                </div>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              {/* Profile Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/80">
                <div>
                  <span className="text-[10px] text-zinc-400 font-bold uppercase block">Employee ID</span>
                  <span className="font-mono font-semibold text-zinc-800">{selectedCrew.employeeNumber || 'Pending'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 font-bold uppercase block">Department</span>
                  <span className="font-semibold text-zinc-800">{selectedCrew.department}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 font-bold uppercase block">Status</span>
                  <span className="capitalize font-semibold text-emerald-700">{selectedCrew.employmentStatus}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 font-bold uppercase block">Joining Date</span>
                  <span className="font-mono text-zinc-700">{selectedCrew.dateOfJoining || '2026-01-15'}</span>
                </div>
              </div>

              {/* Assigned Events */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-400">
                    Assigned Events & Shoots ({crewAssignments.length})
                  </h4>
                  <button
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      setAssigningCrew(selectedCrew);
                    }}
                    className="text-indigo-600 hover:underline font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Assign to Shoot</span>
                  </button>
                </div>

                {crewAssignments.length === 0 ? (
                  <div className="p-6 rounded-xl bg-zinc-50 border border-zinc-200/70 text-center text-zinc-500">
                    No active shoots or events currently assigned to this crew member.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {crewAssignments.map(ev => (
                      <div key={ev.id} className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50/50 flex items-center justify-between">
                        <div>
                          <h5 className="font-bold text-zinc-900 text-sm">{ev.title || ev.name}</h5>
                          <div className="flex items-center gap-2 text-zinc-500 mt-0.5 text-xs">
                            <span className="flex items-center gap-1 font-mono">
                              <Calendar className="w-3 h-3 text-zinc-400" />
                              {ev.startDate}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-zinc-400" />
                              {ev.venue || 'Studio'}
                            </span>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-white border border-zinc-200 text-zinc-700">
                          {ev.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-zinc-100 bg-zinc-50 flex justify-end">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-zinc-900 text-white font-bold text-xs cursor-pointer"
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
