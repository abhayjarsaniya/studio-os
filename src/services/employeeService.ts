import { Employee, EmployeeSchema, EmploymentStatus } from '../types/schema';
import { TenantStore } from './tenantStore';
import { auditService } from './auditService';
import { authCredentialService } from './authCredentialService';
import { firestoreService } from './firestoreService';

export class EmployeeService {
  listEmployees(studioId: string): Employee[] {
    if (!studioId) throw new Error('[employeeService.listEmployees]: studioId is required');
    let emps = TenantStore.get<Employee>(studioId, 'employees');
    if ((!emps || emps.length === 0) && (studioId === 'studio_shreeji_films' || studioId === 'std_demo_royal')) {
      const fallbackId = studioId === 'studio_shreeji_films' ? 'std_demo_royal' : 'studio_shreeji_films';
      emps = TenantStore.get<Employee>(fallbackId, 'employees');
    }
    return emps || [];
  }

  getEmployee(studioId: string, id: string): Employee | null {
    if (!studioId) throw new Error('[employeeService.getEmployee]: studioId is required');
    const all = this.listEmployees(studioId);
    return all.find(e => e.id === id) || null;
  }

  private generateEmployeeNumber(studioId: string): string {
    const existing = this.listEmployees(studioId);
    const count = existing.length + 1;
    return `EMP-${String(count).padStart(3, '0')}`;
  }

  createEmployee(
    studioId: string,
    data: Omit<Employee, 'id' | 'studioId' | 'employeeNumber' | 'createdAt' | 'updatedAt' | 'joiningDate' | 'roleName'> & { 
      employeeNumber?: string;
      initialPassword?: string;
      loginId?: string;
      joiningDate?: string;
      roleName?: string;
    }
  ): Employee {
    if (!studioId) throw new Error('[employeeService.createEmployee]: studioId is required');
    if (!data.fullName || !data.fullName.trim()) throw new Error('Full name is required');
    if (!data.email || !data.email.trim()) throw new Error('Email is required');

    const all = this.listEmployees(studioId);
    const employeeNumber = data.employeeNumber || this.generateEmployeeNumber(studioId);
    const employeeId = `emp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Handle credential creation if initial password is provided
    let loginCredSummary = undefined;
    if (data.initialPassword) {
      const loginId = data.loginId || data.email;
      const credResult = authCredentialService.createEmployeeCredentials(
        studioId,
        employeeId,
        loginId,
        data.initialPassword
      );
      loginCredSummary = {
        loginId: credResult.loginId,
        hasAccess: credResult.hasAccess,
        lastPasswordReset: new Date().toISOString()
      };
    }

    const newEmployee: Employee = {
      id: employeeId,
      studioId,
      userId: data.userId || `user_${employeeId}`,
      employeeNumber,
      fullName: data.fullName.trim(),
      profilePhoto: data.profilePhoto,
      phone: data.phone,
      email: data.email.trim(),
      address: data.address,
      joiningDate: data.joiningDate || new Date().toISOString().split('T')[0],
      department: data.department || 'Photography',
      designation: data.designation || 'Staff Photographer',
      assignedBranchId: data.assignedBranchId,
      assignedBranchName: data.assignedBranchName,
      roleId: data.roleId || 'role_photographer',
      roleName: data.roleName || 'Photographer',
      employmentStatus: data.employmentStatus || 'active',
      emergencyContact: data.emergencyContact || { name: '', relationship: '', phone: '' },
      notes: data.notes,
      loginCredentials: loginCredSummary,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    EmployeeSchema.parse(newEmployee);
    TenantStore.set(studioId, 'employees', [...all, newEmployee]);
    firestoreService.saveDocument(studioId, 'employees', newEmployee.id, newEmployee).catch(() => {});

    auditService.log(
      studioId,
      'admin',
      'CREATE_EMPLOYEE',
      'employee',
      newEmployee.id,
      { fullName: newEmployee.fullName, employeeNumber: newEmployee.employeeNumber }
    );

    return newEmployee;
  }

  updateEmployee(studioId: string, id: string, updates: Partial<Employee>): Employee {
    if (!studioId) throw new Error('[employeeService.updateEmployee]: studioId is required');
    const all = this.listEmployees(studioId);
    const index = all.findIndex(e => e.id === id);
    if (index === -1) throw new Error(`[employeeService.updateEmployee]: Employee ${id} not found`);

    const updated: Employee = {
      ...all[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    EmployeeSchema.parse(updated);
    all[index] = updated;
    TenantStore.set(studioId, 'employees', all);
    firestoreService.saveDocument(studioId, 'employees', all[index].id, all[index]).catch(() => {});

    auditService.log(
      studioId,
      'admin',
      'UPDATE_EMPLOYEE',
      'employee',
      id,
      { updates: Object.keys(updates) }
    );

    return updated;
  }

  setEmploymentStatus(studioId: string, id: string, status: EmploymentStatus): Employee {
    const updated = this.updateEmployee(studioId, id, { employmentStatus: status });
    // If deactivated or suspended, deactivate credentials as well
    if (status === 'inactive' || status === 'suspended') {
      authCredentialService.toggleAccess(studioId, id, false);
    } else if (status === 'active') {
      authCredentialService.toggleAccess(studioId, id, true);
    }
    return updated;
  }

  deleteEmployee(studioId: string, id: string): void {
    if (!studioId) throw new Error('[employeeService.deleteEmployee]: studioId is required');
    const all = this.listEmployees(studioId);
    const target = all.find(e => e.id === id);
    if (!target) return;

    const filtered = all.filter(e => e.id !== id);
    TenantStore.set(studioId, 'employees', filtered);
    firestoreService.deleteDocument(studioId, 'employees', id).catch(() => {});

    auditService.log(
      studioId,
      'admin',
      'DELETE_EMPLOYEE',
      'employee',
      id,
      { fullName: target.fullName }
    );
  }
}

export const employeeService = new EmployeeService();
