import { SalaryProfile, SalaryProfileSchema, Role } from '../types/schema';
import { TenantStore } from './tenantStore';
import { auditService } from './auditService';

export class SalaryService {
  private assertAuthorizedRole(role?: Role | null): void {
    if (!role) {
      throw new Error('[Security Exception]: Access Denied. No authorization role provided.');
    }
    const isOwnerOrSuper = role.name === 'Studio Owner' || role.name === 'Super Admin' || role.name === 'Accountant';
    const hasSalaryPermission = role.permissions?.salary?.view === true;
    if (!isOwnerOrSuper && !hasSalaryPermission) {
      throw new Error(`[Security Exception]: Access Denied. Role "${role.name}" is forbidden from viewing or accessing confidential employee salary data.`);
    }
  }

  listSalaryProfiles(studioId: string, currentRole?: Role | null): SalaryProfile[] {
    if (!studioId) throw new Error('[salaryService]: studioId is required');
    this.assertAuthorizedRole(currentRole);
    return TenantStore.get<SalaryProfile>(studioId, 'salaryProfiles');
  }

  getSalaryProfile(studioId: string, employeeId: string, currentRole?: Role | null): SalaryProfile | null {
    if (!studioId) throw new Error('[salaryService]: studioId is required');
    this.assertAuthorizedRole(currentRole);
    const all = this.listSalaryProfiles(studioId, currentRole);
    return all.find(s => s.employeeId === employeeId) || null;
  }

  saveSalaryProfile(
    studioId: string,
    data: Partial<Omit<SalaryProfile, 'id' | 'studioId' | 'createdAt' | 'updatedAt'>> & { employeeId: string; employeeName: string },
    currentRole?: Role | null
  ): SalaryProfile {
    if (!studioId) throw new Error('[salaryService]: studioId is required');
    this.assertAuthorizedRole(currentRole);
    if (!data.employeeId) throw new Error('employeeId is required');

    const all = TenantStore.get<SalaryProfile>(studioId, 'salaryProfiles');
    const existingIndex = all.findIndex(s => s.employeeId === data.employeeId);

    // Calculate net payable
    const allowancesSum = (data.allowances || []).reduce((sum, item) => sum + item.amount, 0);
    const bonusesSum = (data.bonuses || []).reduce((sum, item) => sum + item.amount, 0);
    const deductionsSum = (data.deductions || []).reduce((sum, item) => sum + item.amount, 0);
    const basePay = data.salaryType === 'daily' ? (data.dailySalary || 0) * 30 : (data.monthlySalary || 0);

    const netPayable = Math.max(0, basePay + allowancesSum + bonusesSum - deductionsSum - (data.advanceSalary || 0) - (data.leaveAdjustments || 0));

    if (existingIndex !== -1) {
      const updated: SalaryProfile = {
        ...all[existingIndex],
        ...data,
        netPayableSalary: netPayable,
        updatedAt: new Date().toISOString()
      };
      SalaryProfileSchema.parse(updated);
      all[existingIndex] = updated;
      TenantStore.set(studioId, 'salaryProfiles', all);

      auditService.log(
        studioId,
        'admin',
        'UPDATE_SALARY_PROFILE',
        'salaryProfile',
        updated.id,
        { employeeName: updated.employeeName, netPayable }
      );
      return updated;
    }

    const newProfile: SalaryProfile = {
      salaryStartDate: new Date().toISOString().split('T')[0],
      salaryType: (data as any).salaryType || 'monthly',
      monthlySalary: data.monthlySalary !== undefined ? data.monthlySalary : ((data as any).baseSalary || 25000),
      dailySalary: data.dailySalary || 0,
      paymentMethod: data.paymentMethod || 'bank_transfer',
      allowances: data.allowances || [],
      bonuses: data.bonuses || [],
      deductions: data.deductions || [],
      advanceSalary: data.advanceSalary || 0,
      leaveAdjustments: data.leaveAdjustments || 0,
      paymentStatus: data.paymentStatus || 'pending',
      ...data,
      id: `sal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      studioId,
      netPayableSalary: netPayable || data.monthlySalary || (data as any).baseSalary || 25000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    SalaryProfileSchema.parse(newProfile);
    TenantStore.set(studioId, 'salaryProfiles', [...all, newProfile]);

    auditService.log(
      studioId,
      'admin',
      'CREATE_SALARY_PROFILE',
      'salaryProfile',
      newProfile.id,
      { employeeName: newProfile.employeeName, netPayable }
    );

    return newProfile;
  }
}

export const salaryService = new SalaryService();
