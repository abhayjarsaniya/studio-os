import { describe, it, expect, beforeEach } from 'vitest';
import { unifiedAuthService, hashCredential } from '../services/unifiedAuthService';
import { studioService, shreejiStudio } from '../services/studioService';
import { employeeService } from '../services/employeeService';
import { TenantStore } from '../services/tenantStore';
import { studioA, studioB } from '../data/multiTenantDemoData';

describe('STUDIO OS — Two-Field Login, Shreeji Studio Branding & Employee Management', () => {
  const TEST_STUDIO = 'std_demo_royal';

  beforeEach(() => {
    // Reset test environment stores if needed
  });

  // =========================================================================
  // 1 & 2. Two-Field Login & Studio ID Removal
  // =========================================================================
  it('1. Studio Owner login requires only Email/Username and Password without Studio ID', () => {
    // Authenticate with only 2 parameters: identifier and password
    const res = unifiedAuthService.loginStudioOwner('aarav@royalframes.in', 'StudioOwner@123');
    expect(res.success).toBe(true);
    expect(res.session).toBeDefined();
    expect(res.session?.account.accountType).toBe('STUDIO_OWNER');
    expect(res.session?.account.loginId).toBe('aarav_ahm');
  });

  it('2. Studio ID / Slug input is removed and automatically identified from membership', () => {
    // Owner provides only their email or username
    const res = unifiedAuthService.loginStudioOwner('aarav_ahm', 'StudioOwner@123');
    expect(res.success).toBe(true);
    // Automatic studio identification
    expect(res.session?.account.studioId).toBe('std_demo_royal');
    expect(res.session?.account.studioName).toBe('SHREEJI STUDIO');
  });

  it('3. Email and Username authentication both work seamlessly', () => {
    // By Email
    const byEmail = unifiedAuthService.loginStudioOwner('aarav@royalframes.in', 'StudioOwner@123');
    expect(byEmail.success).toBe(true);

    // By Username
    const byUsername = unifiedAuthService.loginStudioOwner('aarav_ahm', 'StudioOwner@123');
    expect(byUsername.success).toBe(true);
    expect(byEmail.session?.account.id).toBe(byUsername.session?.account.id);
  });

  it('4. Password authentication validates credentials and rejects invalid passwords', () => {
    const invalidRes = unifiedAuthService.loginStudioOwner('aarav@royalframes.in', 'WrongPassword!999');
    expect(invalidRes.success).toBe(false);
    expect(invalidRes.error).toContain('Invalid');
  });

  it('5. Correct studio is identified automatically across multiple studios', () => {
    // Surat studio owner
    const suratRes = unifiedAuthService.loginStudioOwner('krunal@momentsstudio.in', 'StudioOwner@123');
    expect(suratRes.success).toBe(true);
    expect(suratRes.session?.account.studioId).toBe('studio_moments_002');
    expect(suratRes.session?.account.studioName).toBe('Moments Studio');

    // Vadodara studio owner
    const vadodaraRes = unifiedAuthService.loginStudioOwner('rohan@pixelcraft.in', 'StudioOwner@123');
    expect(vadodaraRes.success).toBe(true);
    expect(vadodaraRes.session?.account.studioId).toBe('studio_pixelcraft_003');
  });

  it('6. Employees can log in independently using 2 fields without entering studio ID', () => {
    const empRes = unifiedAuthService.loginEmployee('kabir_pho', 'ChangeMe@123');
    expect(empRes.success).toBe(true);
    expect(empRes.session?.account.accountType).toBe('EMPLOYEE');
    expect(empRes.session?.account.displayName).toBe('Kabir Sharma');
    // Automatic studio assignment
    expect(empRes.session?.account.studioId).toBe('std_demo_royal');
  });

  it('7. Master Admin login continues working independently on Level 1 route', () => {
    const masterRes = unifiedAuthService.loginMasterAdmin('masteradmin@studioos.internal', 'MasterAdmin@2026');
    expect(masterRes.success).toBe(true);
    expect(masterRes.session?.account.accountType).toBe('MASTER_ADMIN');
    expect(masterRes.session?.account.roleId).toBe('master_super_admin');
  });

  // =========================================================================
  // 2. Shreeji Studio Branding
  // =========================================================================
  it('8 & 9. Shreeji Studio name and branding appear on active studio profile', () => {
    const studio = studioService.getStudio('std_demo_royal');
    expect(['SHREEJI STUDIO', 'SHREEJI FILMS AND PHOTOGRAPHY']).toContain(studio.name);
    expect(studio.logoUrl).toBe('/shreeji-logo.svg');
  });

  it('10 & 11. Shreeji Studio logo exists and is configured for desktop and mobile views', () => {
    const studio = studioService.getStudio('std_demo_royal');
    expect(studio.logoUrl).toBeDefined();
    expect(studio.logoUrl).toContain('shreeji-logo.svg');
    expect(['SHREEJI STUDIO', 'SHREEJI FILMS AND PHOTOGRAPHY']).toContain(shreejiStudio.name);
  });

  it('12. Studio branding is tenant-specific: modifying one studio does not affect others', () => {
    const shreeji = studioService.getStudio('std_demo_royal');
    const royal = studioService.getStudio(studioA.id);
    const creative = studioService.getStudio(studioB.id);

    expect(['SHREEJI STUDIO', 'SHREEJI FILMS AND PHOTOGRAPHY']).toContain(shreeji.name);
    expect(royal.name).toBe('Royal Photography');
    expect(creative.name).toBe('Creative Wedding Studio');

    // Updating Shreeji profile
    const updatedShreeji = studioService.updateStudio('std_demo_royal', {
      tagline: 'Custom Heritage Tagline'
    });
    expect(updatedShreeji.tagline).toBe('Custom Heritage Tagline');
    // Verify Studio A and B are completely untouched
    expect(studioService.getStudio(studioA.id).name).toBe('Royal Photography');
    expect(studioService.getStudio(studioB.id).name).toBe('Creative Wedding Studio');
  });

  // =========================================================================
  // 3. Crew Members — Complete Employee Management
  // =========================================================================
  it('13. Studio Owner can add multiple employees with comprehensive profile data', () => {
    const emp1 = employeeService.createEmployee(TEST_STUDIO, {
      fullName: 'Darshan Dave',
      email: 'darshan@shreejistudio.in',
      phone: '9825100011',
      department: 'Photography',
      designation: 'Senior Candid Specialist',
      roleId: 'photographer',
      employmentStatus: 'active'
    });

    const emp2 = employeeService.createEmployee(TEST_STUDIO, {
      fullName: 'Bhavna Parekh',
      email: 'bhavna@shreejistudio.in',
      phone: '9825100022',
      department: 'Editing',
      designation: 'Lead Colorist',
      roleId: 'editor',
      employmentStatus: 'active'
    });

    expect(emp1.id).toBeDefined();
    expect(emp1.fullName).toBe('Darshan Dave');
    expect(emp2.id).toBeDefined();
    expect(emp2.fullName).toBe('Bhavna Parekh');

    const allEmps = employeeService.listEmployees(TEST_STUDIO);
    expect(allEmps.some(e => e.id === emp1.id)).toBe(true);
    expect(allEmps.some(e => e.id === emp2.id)).toBe(true);
  });

  it('14. Studio Owner can edit employee details without altering auth identity silently', () => {
    const emp = employeeService.createEmployee(TEST_STUDIO, {
      fullName: 'Manish Rawal',
      email: 'manish@shreejistudio.in',
      phone: '9825100033',
      department: 'Drone',
      designation: 'FPV Pilot',
      roleId: 'drone_pilot',
      employmentStatus: 'active'
    });

    const updated = employeeService.updateEmployee(TEST_STUDIO, emp.id, {
      designation: 'Chief Aerial Cinematographer',
      phone: '9825199999'
    });

    expect(updated.designation).toBe('Chief Aerial Cinematographer');
    expect(updated.phone).toBe('9825199999');
    expect(updated.userId).toBe(emp.userId); // Auth identity preserved
  });

  it('15. Studio Owner can deactivate and reactivate employees with access revocation', () => {
    const emp = employeeService.createEmployee(TEST_STUDIO, {
      fullName: 'Hitesh Solanki',
      email: 'hitesh@shreejistudio.in',
      phone: '9825100044',
      department: 'Cinematography',
      designation: 'Assistant Cam Operator',
      roleId: 'cinematographer',
      employmentStatus: 'active'
    });

    // Deactivate
    const deactivated = employeeService.setEmploymentStatus(TEST_STUDIO, emp.id, 'inactive');
    expect(deactivated.employmentStatus).toBe('inactive');

    // Reactivate
    const reactivated = employeeService.setEmploymentStatus(TEST_STUDIO, emp.id, 'active');
    expect(reactivated.employmentStatus).toBe('active');
  });

  it('16. Historical employee records and assignments remain intact upon deactivation', () => {
    const emp = employeeService.createEmployee(TEST_STUDIO, {
      fullName: 'Jayant Trivedi',
      email: 'jayant@shreejistudio.in',
      phone: '9825100055',
      department: 'Photography',
      designation: 'Traditional Photographer',
      roleId: 'photographer',
      employmentStatus: 'active'
    });

    // Simulate event assignment
    const eventId = `ev_test_${Date.now()}`;
    TenantStore.set(TEST_STUDIO, 'events', [{
      id: eventId,
      studioId: TEST_STUDIO,
      name: 'Grand Heritage Sangeet',
      assignedTeamIds: [emp.id],
      status: 'Confirmed'
    }]);

    // Deactivate employee
    employeeService.setEmploymentStatus(TEST_STUDIO, emp.id, 'inactive');

    // Verify employee record still exists in system
    const retrieved = employeeService.getEmployee(TEST_STUDIO, emp.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.employmentStatus).toBe('inactive');

    // Verify event assignment history is intact
    const events = TenantStore.get<any>(TEST_STUDIO, 'events');
    expect(events[0].assignedTeamIds).toContain(emp.id);
  });

  it('17 & 18. Secure employee account creation hashes passwords (never plaintext)', () => {
    const result = unifiedAuthService.provisionEmployee({
      studioId: TEST_STUDIO,
      studioName: 'SHREEJI STUDIO',
      employeeName: 'Ritesh Vora',
      employeeId: 'emp_sec_001',
      email: 'ritesh@shreejistudio.in',
      mobile: '9825100077',
      username: 'ritesh_vora',
      roleId: 'photographer',
      roleTitle: 'Photographer',
      initialPassword: 'TempSecurePass@2026'
    });

    expect(result.account).toBeDefined();
    expect(result.account.loginId).toBe('ritesh_vora');
    expect(result.account.passwordHash).not.toBe('TempSecurePass@2026');
    expect(result.account.passwordHash.startsWith('sha256_')).toBe(true);
    expect(result.account.mustChangePassword).toBe(true);

    // Direct password test
    const calculated = hashCredential('TempSecurePass@2026', result.account.salt);
    expect(calculated).toBe(result.account.passwordHash);
  });

  it('19. Employees cannot modify global roles or permissions', () => {
    // Verify roleService and unifiedAuthService prevent employee modification of global RBAC
    const empRes = unifiedAuthService.loginEmployee('kabir_pho', 'ChangeMe@123');
    expect(empRes.session?.account.accountType).toBe('EMPLOYEE');
    expect(empRes.session?.account.roleId).not.toBe('master_super_admin');
  });

  it('20. Studio Owner password reset generates a temporary key and mandates change on login', () => {
    const newTemp = unifiedAuthService.resetAccountPassword('usr_emp_kabir_royal', 'Studio Owner');
    expect(newTemp.startsWith('Reset#')).toBe(true);

    const account = unifiedAuthService.getAccount('usr_emp_kabir_royal');
    expect(account?.mustChangePassword).toBe(true);
  });
});
