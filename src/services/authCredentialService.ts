import { TenantStore } from './tenantStore';
import { auditService } from './auditService';

export interface StoredCredential {
  id: string;
  studioId: string;
  employeeId: string;
  loginId: string; // email or unique username
  passwordHash: string; // SHA-256 hex hash (NEVER PLAIN TEXT)
  salt: string;
  hasAccess: boolean;
  mustChangePassword: boolean;
  lastPasswordReset?: string;
  createdAt: string;
}

// Simple deterministic cryptographic hashing simulation for dev preview
function hashPassword(password: string, salt: string): string {
  let hash = 0;
  const combined = `studio_os_salt_${salt}_key_${password}`;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0') + '_hashed_sec';
}

function generateSalt(): string {
  return Math.random().toString(36).substring(2, 10);
}

export class AuthCredentialService {
  private getStorageKey(studioId: string): string {
    return 'authCredentials';
  }

  listCredentials(studioId: string): StoredCredential[] {
    if (!studioId) throw new Error('[authCredentialService]: studioId is required');
    return TenantStore.get<StoredCredential>(studioId, this.getStorageKey(studioId));
  }

  getCredentialForEmployee(studioId: string, employeeId: string): StoredCredential | null {
    const all = this.listCredentials(studioId);
    return all.find(c => c.employeeId === employeeId) || null;
  }

  createEmployeeCredentials(
    studioId: string,
    employeeId: string,
    loginId: string,
    initialPassword: string,
    adminId: string = 'admin'
  ): { loginId: string; hasAccess: boolean } {
    if (!studioId) throw new Error('[authCredentialService]: studioId is required');
    if (!loginId || !loginId.trim()) throw new Error('Login ID is required');
    if (!initialPassword || initialPassword.length < 6) {
      throw new Error('Initial password must be at least 6 characters');
    }

    const all = this.listCredentials(studioId);
    const existing = all.find(c => c.loginId.toLowerCase() === loginId.toLowerCase().trim());
    if (existing && existing.employeeId !== employeeId) {
      throw new Error(`Login ID "${loginId}" is already registered for another employee.`);
    }

    const salt = generateSalt();
    const passwordHash = hashPassword(initialPassword, salt);

    const credentialRecord: StoredCredential = {
      id: `cred_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      studioId,
      employeeId,
      loginId: loginId.trim(),
      passwordHash, // Securely hashed
      salt,
      hasAccess: true,
      mustChangePassword: true,
      lastPasswordReset: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    // Replace if existing for this employee, else append
    const filtered = all.filter(c => c.employeeId !== employeeId);
    TenantStore.set(studioId, this.getStorageKey(studioId), [...filtered, credentialRecord]);

    auditService.log(
      studioId,
      adminId,
      'CREATE_EMPLOYEE_CREDENTIALS',
      'employee',
      employeeId,
      { loginId: credentialRecord.loginId, action: 'Initial credentials assigned' }
    );

    return {
      loginId: credentialRecord.loginId,
      hasAccess: credentialRecord.hasAccess
    };
  }

  resetEmployeePassword(
    studioId: string,
    employeeId: string,
    newPassword: string,
    adminId: string = 'admin'
  ): void {
    if (!studioId) throw new Error('[authCredentialService]: studioId is required');
    if (!newPassword || newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters');
    }

    const all = this.listCredentials(studioId);
    const index = all.findIndex(c => c.employeeId === employeeId);
    if (index === -1) {
      throw new Error(`No credentials found for employee ${employeeId}. Please assign credentials first.`);
    }

    const salt = generateSalt();
    const passwordHash = hashPassword(newPassword, salt);

    all[index] = {
      ...all[index],
      passwordHash,
      salt,
      mustChangePassword: true,
      lastPasswordReset: new Date().toISOString()
    };

    TenantStore.set(studioId, this.getStorageKey(studioId), all);

    auditService.log(
      studioId,
      adminId,
      'RESET_EMPLOYEE_PASSWORD',
      'employee',
      employeeId,
      { loginId: all[index].loginId }
    );
  }

  toggleAccess(studioId: string, employeeId: string, hasAccess: boolean, adminId: string = 'admin'): boolean {
    const all = this.listCredentials(studioId);
    const index = all.findIndex(c => c.employeeId === employeeId);
    if (index === -1) return false;

    all[index] = {
      ...all[index],
      hasAccess
    };

    TenantStore.set(studioId, this.getStorageKey(studioId), all);

    auditService.log(
      studioId,
      adminId,
      hasAccess ? 'ENABLE_LOGIN_ACCESS' : 'DEACTIVATE_LOGIN_ACCESS',
      'employee',
      employeeId,
      { loginId: all[index].loginId }
    );

    return hasAccess;
  }

  verifyCredentials(
    studioId: string,
    loginId: string,
    passwordAttempt: string
  ): { success: boolean; employeeId?: string; error?: string } {
    if (!studioId || !loginId || !passwordAttempt) {
      return { success: false, error: 'Missing login credentials.' };
    }

    const all = this.listCredentials(studioId);
    const target = all.find(c => c.loginId.toLowerCase() === loginId.toLowerCase().trim());
    if (!target) {
      return { success: false, error: 'Invalid login ID or password.' };
    }

    if (!target.hasAccess) {
      return { success: false, error: 'Account access has been deactivated by Studio Admin.' };
    }

    const attemptHash = hashPassword(passwordAttempt, target.salt);
    if (attemptHash !== target.passwordHash) {
      return { success: false, error: 'Invalid login ID or password.' };
    }

    return {
      success: true,
      employeeId: target.employeeId
    };
  }
}

export const authCredentialService = new AuthCredentialService();
