import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useStudio } from '../../context/StudioContext';
import { Employee, EmploymentStatus } from '../../types';
import { 
  X, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Briefcase, 
  ShieldCheck, 
  Key, 
  Building2, 
  AlertCircle,
  Sparkles,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '../ui/Button';

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmployee?: Employee | null;
}

const DEPARTMENTS = [
  'Creative Direction',
  'Photography',
  'Cinematography',
  'Drone Operations',
  'Post-Production',
  'Album Design',
  'Operations & Scheduling',
  'Client Relations',
  'Finance & Accounts'
];

export const EmployeeModal: React.FC<EmployeeModalProps> = ({
  isOpen,
  onClose,
  initialEmployee
}) => {
  const { 
    createEmployee, 
    updateEmployee, 
    roles, 
    resetEmployeePassword 
  } = useApp();

  const { branches } = useStudio();

  const [fullName, setFullName] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [joiningDate, setJoiningDate] = useState('');
  const [department, setDepartment] = useState('Photography');
  const [designation, setDesignation] = useState('');
  const [assignedBranchId, setAssignedBranchId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState<EmploymentStatus>('active');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [notes, setNotes] = useState('');

  // Admin Credentials
  const [loginId, setLoginId] = useState('');
  const [initialPassword, setInitialPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialEmployee) {
      setFullName(initialEmployee.fullName);
      setProfilePhoto(initialEmployee.profilePhoto || '');
      setPhone(initialEmployee.phone);
      setEmail(initialEmployee.email);
      setAddress(initialEmployee.address || '');
      setJoiningDate(initialEmployee.joiningDate);
      setDepartment(initialEmployee.department);
      setDesignation(initialEmployee.designation);
      setAssignedBranchId(initialEmployee.assignedBranchId || '');
      setRoleId(initialEmployee.roleId);
      setEmploymentStatus(initialEmployee.employmentStatus);
      setEmergencyName(initialEmployee.emergencyContact?.name || '');
      setEmergencyRelation(initialEmployee.emergencyContact?.relationship || '');
      setEmergencyPhone(initialEmployee.emergencyContact?.phone || '');
      setNotes(initialEmployee.notes || '');
      setLoginId(initialEmployee.loginCredentials?.loginId || initialEmployee.email);
      setInitialPassword('');
    } else {
      setFullName('');
      setProfilePhoto('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80');
      setPhone('+91 ');
      setEmail('');
      setAddress('');
      setJoiningDate(new Date().toISOString().split('T')[0]);
      setDepartment('Photography');
      setDesignation('Staff Photographer');
      setAssignedBranchId(branches[0]?.id || '');
      setRoleId(roles[0]?.id || '');
      setEmploymentStatus('active');
      setEmergencyName('');
      setEmergencyRelation('');
      setEmergencyPhone('');
      setNotes('');
      setLoginId('');
      setInitialPassword('Studio@2026');
    }
    setError(null);
    setIsResettingPassword(false);
    setNewPassword('');
  }, [initialEmployee, isOpen, branches, roles]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Employee full name is required.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('A valid work email is required.');
      return;
    }
    if (!initialEmployee && (!initialPassword || initialPassword.length < 6)) {
      setError('Initial login password must be at least 6 characters.');
      return;
    }

    const selectedRole = roles.find(r => r.id === roleId);
    const selectedBranch = branches.find(b => b.id === assignedBranchId);

    try {
      if (initialEmployee) {
        updateEmployee(initialEmployee.id, {
          fullName: fullName.trim(),
          profilePhoto: profilePhoto.trim() || undefined,
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim() || undefined,
          joiningDate,
          department,
          designation: designation.trim(),
          assignedBranchId: assignedBranchId || undefined,
          assignedBranchName: selectedBranch?.name || undefined,
          roleId: roleId || initialEmployee.roleId,
          roleName: selectedRole?.name || initialEmployee.roleName,
          employmentStatus,
          emergencyContact: {
            name: emergencyName.trim(),
            relationship: emergencyRelation.trim(),
            phone: emergencyPhone.trim()
          },
          notes: notes.trim() || undefined
        });

        if (isResettingPassword && newPassword) {
          if (newPassword.length < 6) {
            setError('New password must be at least 6 characters.');
            return;
          }
          resetEmployeePassword(initialEmployee.id, newPassword);
        }
      } else {
        createEmployee({
          fullName: fullName.trim(),
          profilePhoto: profilePhoto.trim() || undefined,
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim() || undefined,
          joiningDate,
          department,
          designation: designation.trim(),
          assignedBranchId: assignedBranchId || undefined,
          assignedBranchName: selectedBranch?.name || undefined,
          roleId: roleId || roles[0]?.id || 'role_photographer',
          roleName: selectedRole?.name || 'Photographer',
          employmentStatus,
          emergencyContact: {
            name: emergencyName.trim(),
            relationship: emergencyRelation.trim(),
            phone: emergencyPhone.trim()
          },
          notes: notes.trim() || undefined,
          loginId: loginId.trim() || email.trim(),
          initialPassword
        });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save employee profile');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl border border-zinc-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 bg-zinc-50/50">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-zinc-900 font-display flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-600" />
              {initialEmployee ? 'Edit Employee Profile' : 'Add New Employee / Crew Member'}
            </h3>
            <p className="text-xs text-zinc-500">
              Personal information, operational department, role permissions and admin credentials
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs sm:text-sm">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Basic Info */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider text-zinc-400">
              Personal Information
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="e.g. Vikramaditya Verma"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Work Email *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="e.g. vikram@royalphotography.in"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-xs sm:text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Contact Phone *
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+91 98200 00000"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Joining Date
                </label>
                <input
                  type="date"
                  value={joiningDate}
                  onChange={e => setJoiningDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-xs sm:text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Profile Photo URL
                </label>
                <input
                  type="url"
                  value={profilePhoto}
                  onChange={e => setProfilePhoto(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Residential Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Street, City, Pincode"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Department, Designation, Role & Branch */}
          <div className="pt-3 border-t border-zinc-100 space-y-3">
            <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider text-zinc-400">
              Department & Role Assignment
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Department
                </label>
                <select
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-xs sm:text-sm bg-white"
                >
                  {DEPARTMENTS.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Job Designation
                </label>
                <input
                  type="text"
                  value={designation}
                  onChange={e => setDesignation(e.target.value)}
                  placeholder="e.g. Senior Lead Candid Photographer"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-xs sm:text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  System Role *
                </label>
                <select
                  value={roleId}
                  onChange={e => setRoleId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-xs sm:text-sm bg-white"
                >
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Assigned Branch
                </label>
                <select
                  value={assignedBranchId}
                  onChange={e => setAssignedBranchId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-xs sm:text-sm bg-white"
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Employment Status
                </label>
                <select
                  value={employmentStatus}
                  onChange={e => setEmploymentStatus(e.target.value as EmploymentStatus)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-xs sm:text-sm bg-white"
                >
                  <option value="active">Active</option>
                  <option value="probation">Probation</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Admin-Created Login Credentials */}
          <div className="pt-3 border-t border-zinc-100 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Admin-Controlled Login Credentials
              </h4>
              <span className="text-xs text-zinc-400">Zero plain-text password storage</span>
            </div>

            {!initialEmployee ? (
              <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Employee Login ID (Username or Email) *
                    </label>
                    <input
                      type="text"
                      value={loginId || email}
                      onChange={e => setLoginId(e.target.value)}
                      placeholder="e.g. vikram@royalphotography.in"
                      className="w-full px-3 py-2 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Set Initial Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={initialPassword}
                        onChange={e => setInitialPassword(e.target.value)}
                        placeholder="Min 6 characters"
                        required
                        className="w-full px-3 py-2 pr-9 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-zinc-500">
                  Password is cryptographically hashed with unique salt prior to persistence. Employees can sign in using this login ID and initial password.
                </p>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-zinc-500" />
                    <div>
                      <p className="text-xs font-bold text-zinc-800">
                        Login ID: <span className="font-mono">{initialEmployee.loginCredentials?.loginId || initialEmployee.email}</span>
                      </p>
                      <p className="text-xs text-zinc-500">
                        Status: {initialEmployee.loginCredentials?.hasAccess ? 'Active Access' : 'Access Suspended'}
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => setIsResettingPassword(!isResettingPassword)}
                  >
                    {isResettingPassword ? 'Cancel Reset' : 'Reset Password'}
                  </Button>
                </div>

                {isResettingPassword && (
                  <div className="pt-2 border-t border-zinc-200 flex items-center gap-2">
                    <input
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Enter new 6+ char password"
                      className="flex-1 px-3 py-1.5 rounded-xl border border-zinc-300 text-xs"
                    />
                    <Button
                      type="button"
                      variant="primary"
                      size="xs"
                      onClick={() => {
                        if (!newPassword || newPassword.length < 6) {
                          setError('New password must be at least 6 characters.');
                          return;
                        }
                        resetEmployeePassword(initialEmployee.id, newPassword);
                        setIsResettingPassword(false);
                        setNewPassword('');
                      }}
                    >
                      Save Password
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 4: Emergency Contact */}
          <div className="pt-3 border-t border-zinc-100 space-y-3">
            <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider text-zinc-400">
              Emergency Contact
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Contact Name
                </label>
                <input
                  type="text"
                  value={emergencyName}
                  onChange={e => setEmergencyName(e.target.value)}
                  placeholder="e.g. Pooja Verma"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Relationship
                </label>
                <input
                  type="text"
                  value={emergencyRelation}
                  onChange={e => setEmergencyRelation(e.target.value)}
                  placeholder="e.g. Spouse, Sibling"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Emergency Phone
                </label>
                <input
                  type="tel"
                  value={emergencyPhone}
                  onChange={e => setEmergencyPhone(e.target.value)}
                  placeholder="+91 98200 00000"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Notes */}
          <div className="pt-3 border-t border-zinc-100">
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Internal Admin Notes
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Camera gear preferences, special awards, performance notes..."
              className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="bg-zinc-900 hover:bg-black text-white"
            >
              {initialEmployee ? 'Save Changes' : 'Create Employee'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
