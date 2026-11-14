import { TenantStore } from './tenantStore';
import { EmployeeCredentials, EmployeeCredentialsSchema } from '../types/schema';
import { platformStudioService } from './platformStudioService';
import { employeeService } from './employeeService';

export class EmployeeAuthService {
  private readonly CREDENTIALS_STORE = 'employee_credentials';

  listCredentials(studioId?: string): EmployeeCredentials[] {
    const all = TenantStore.get<EmployeeCredentials>('platform_system', this.CREDENTIALS_STORE) || [];
    if (studioId) {
      return all.filter(c => c.studioId === studioId);
    }
    return all;
  }

  getCredentials(employeeId: string): EmployeeCredentials | null {
    const all = this.listCredentials();
    return all.find(c => c.employeeId === employeeId) || null;
  }

  provisionAccount(
    studioId: string, 
    employeeId: string, 
    username: string, 
    email: string, 
    initialPassword = 'ChangeMe@123'
  ): EmployeeCredentials {
    const all = this.listCredentials();
    const existingIndex = all.findIndex(c => c.employeeId === employeeId);

    const creds: EmployeeCredentials = EmployeeCredentialsSchema.parse({
      employeeId,
      studioId,
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      passwordHash: `hash_${initialPassword}`,
      initialPassword,
      mustChangePassword: true,
      hasChangedPassword: false,
      createdAt: new Date().toISOString()
    });

    if (existingIndex >= 0) {
      all[existingIndex] = creds;
    } else {
      all.push(creds);
    }

    TenantStore.set('platform_system', this.CREDENTIALS_STORE, all);
    return creds;
  }

  verifyLogin(usernameOrEmail: string, password: string): {
    success: boolean;
    credentials?: EmployeeCredentials;
    mustChangePassword?: boolean;
    error?: string;
  } {
    const q = usernameOrEmail.toLowerCase().trim();
    const all = this.listCredentials();
    const cred = all.find(c => c.username === q || c.email === q);

    if (!cred) {
      return { success: false, error: 'Invalid username or password.' };
    }

    // Check studio lifecycle status
    const studioMeta = platformStudioService.getStudioLifecycleStatus(cred.studioId);
    if (studioMeta === 'suspended') {
      return { success: false, error: 'Studio account is currently suspended. Please contact platform administration.' };
    }
    if (studioMeta === 'archived' || studioMeta === 'deactivated') {
      return { success: false, error: 'Studio account is archived and no longer active.' };
    }

    const expectedHash = `hash_${password}`;
    if (cred.passwordHash !== expectedHash && cred.initialPassword !== password) {
      return { success: false, error: 'Invalid username or password.' };
    }

    // Update last login
    cred.lastLoginAt = new Date().toISOString();
    TenantStore.set('platform_system', this.CREDENTIALS_STORE, all);

    return {
      success: true,
      credentials: cred,
      mustChangePassword: cred.mustChangePassword
    };
  }

  changeInitialPassword(
    employeeId: string, 
    currentPassword: string, 
    newPassword: string
  ): { success: boolean; error?: string } {
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'New password must be at least 6 characters.' };
    }

    const all = this.listCredentials();
    const cred = all.find(c => c.employeeId === employeeId);
    if (!cred) {
      return { success: false, error: 'Account not found.' };
    }

    if (cred.passwordHash !== `hash_${currentPassword}` && cred.initialPassword !== currentPassword) {
      return { success: false, error: 'Current password is incorrect.' };
    }

    cred.passwordHash = `hash_${newPassword}`;
    cred.initialPassword = '';
    cred.mustChangePassword = false;
    cred.hasChangedPassword = true;
    cred.updatedAt = new Date().toISOString();

    TenantStore.set('platform_system', this.CREDENTIALS_STORE, all);
    return { success: true };
  }

  resetEmployeeCredentials(
    studioId: string,
    employeeId: string,
    operatorId = 'Studio Owner'
  ): {
    success: boolean;
    temporaryPassword?: string;
    username?: string;
    email?: string;
    error?: string;
  } {
    const all = this.listCredentials();
    const cred = all.find(c => c.employeeId === employeeId && c.studioId === studioId);
    if (!cred) {
      return { success: false, error: 'Employee login credentials record not found.' };
    }

    const tempPassword = `Temp@${Math.random().toString(36).substring(2, 6).toUpperCase()}${Math.floor(100 + Math.random() * 900)}!`;
    cred.passwordHash = `hash_${tempPassword}`;
    cred.initialPassword = tempPassword;
    cred.mustChangePassword = true;
    cred.hasChangedPassword = false;
    cred.updatedAt = new Date().toISOString();

    TenantStore.set('platform_system', this.CREDENTIALS_STORE, all);
    return {
      success: true,
      temporaryPassword: tempPassword,
      username: cred.username,
      email: cred.email
    };
  }
}

export const employeeAuthService = new EmployeeAuthService();
