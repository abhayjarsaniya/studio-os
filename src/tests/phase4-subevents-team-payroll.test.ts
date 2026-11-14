import { describe, it, expect, beforeEach } from 'vitest';
import { eventService } from '../services/eventService';
import { subEventService } from '../services/subEventService';
import { employeeService } from '../services/employeeService';
import { authCredentialService } from '../services/authCredentialService';
import { roleService } from '../services/roleService';
import { salaryService } from '../services/salaryService';
import { payrollService } from '../services/payrollService';
import { leaveService } from '../services/leaveService';
import { attendanceService } from '../services/attendanceService';
import { TenantStore } from '../services/tenantStore';
import { SubEvent, Employee, Role, SalaryProfile, LeaveRequest } from '../types/schema';

describe('Studio OS – Phase 4: Sub-Events, Team, Roles, Salary & Leave Management (20 Tests)', () => {
  const STUDIO_A = 'studio_royal_001';
  const STUDIO_B = 'studio_creative_002';

  beforeEach(() => {
    TenantStore.resetAll();
  });

  // 1. Create a main event
  it('1. Create a main event in Studio A', () => {
    const mainEvent = eventService.createEvent(STUDIO_A, {
      name: 'Rahul & Priya Grand Royal Destination Wedding',
      customerId: 'cust_royal_1',
      customerName: 'Priyanka Singhania & Arjun Kapoor',
      customerPhone: '+91 98210 12345',
      category: 'Wedding',
      startDate: '2026-12-10',
      startTime: '10:00',
      endDate: '2026-12-14',
      endTime: '23:30',
      venue: 'City Palace, Udaipur',
      venueCity: 'Udaipur',
      priority: 'Urgent',
      status: 'Confirmed',
      deliverables: ['Extended 4K Feature Film', 'Cinematic Teaser', 'Curated Album'],
      estimatedBudget: 600000,
      advancePaid: 300000,
      createdBy: 'usr_kabir'
    });

    expect(mainEvent.id).toBeDefined();
    expect(mainEvent.studioId).toBe(STUDIO_A);
    expect(mainEvent.eventNumber).toMatch(/^EVT-\d{4}-\d{6}$/);
  });

  // 2. Add multiple sub-events
  it('2. Add multiple predefined sub-events to the main event', () => {
    const mainEvent = eventService.createEvent(STUDIO_A, {
      name: 'Aditya & Ananya Heritage Wedding',
      customerId: 'cust_royal_1',
      customerName: 'Priyanka Singhania',
      customerPhone: '+91 98210 12345',
      category: 'Wedding',
      startDate: '2026-12-15',
      startTime: '14:00',
      endDate: '2026-12-18',
      endTime: '23:00',
      venue: 'Rambagh Palace, Jaipur',
      venueCity: 'Jaipur',
      priority: 'High',
      status: 'Confirmed',
      createdBy: 'usr_kabir'
    });

    const sub1 = subEventService.createSubEvent(STUDIO_A, {
      parentEventId: mainEvent.id,
      name: 'Engagement Ceremony',
      customCategory: 'Engagement',
      date: '2026-12-15',
      startTime: '18:00',
      endTime: '22:00',
      venue: 'Polo Lawn',
      requiredTeamSize: 2,
      priority: 'High',
      status: 'Confirmed',
      assignedMemberIds: ['mem_royal_3'],
      sortOrder: 0
    });

    const sub2 = subEventService.createSubEvent(STUDIO_A, {
      parentEventId: mainEvent.id,
      name: 'Mehndi & Sangeet Night',
      customCategory: 'Sangeet',
      date: '2026-12-16',
      startTime: '19:00',
      endTime: '01:00',
      venue: 'Maharani Ballroom',
      requiredTeamSize: 3,
      priority: 'Urgent',
      status: 'Confirmed',
      assignedMemberIds: ['mem_royal_1', 'mem_royal_3'],
      sortOrder: 1
    });

    expect(sub1.id).toBeDefined();
    expect(sub1.parentEventId).toBe(mainEvent.id);
    expect(sub1.subEventNumber).toContain(mainEvent.eventNumber);
    expect(sub2.id).toBeDefined();
    expect(sub2.parentEventId).toBe(mainEvent.id);

    const subs = subEventService.listSubEvents(STUDIO_A, mainEvent.id);
    expect(subs.length).toBe(2);
  });

  // 3. Add custom sub-events
  it('3. Add unlimited custom sub-events with custom categories', () => {
    const mainEvent = eventService.listEvents(STUDIO_A)[0];
    const customSub = subEventService.createSubEvent(STUDIO_A, {
      parentEventId: mainEvent.id,
      name: 'Royal Sufi Night & Fireworks Showcase',
      customCategory: 'Sufi Musical Extravaganza',
      date: '2026-11-13',
      startTime: '21:00',
      endTime: '02:00',
      venue: 'Taj Amphitheatre Waterfront',
      requiredTeamSize: 4,
      priority: 'Urgent',
      status: 'Confirmed',
      instructions: 'Night vision prime lenses for acoustic candle setup',
      sortOrder: 10
    });

    expect(customSub.id).toBeDefined();
    expect(customSub.name).toBe('Royal Sufi Night & Fireworks Showcase');
    expect(customSub.customCategory).toBe('Sufi Musical Extravaganza');
  });

  // 4. Edit and delete sub-events with confirmation
  it('4. Edit and delete sub-events correctly', () => {
    const mainEvent = eventService.listEvents(STUDIO_A)[0];
    const newSub = subEventService.createSubEvent(STUDIO_A, {
      parentEventId: mainEvent.id,
      name: 'Temp Pool Party',
      customCategory: 'Poolside',
      date: '2026-11-12',
      startTime: '14:00',
      endTime: '17:00',
      venue: 'Cabana 4',
      requiredTeamSize: 2,
      priority: 'Low',
      status: 'Tentative',
      sortOrder: 99
    });

    // Update
    const updated = subEventService.updateSubEvent(STUDIO_A, newSub.id, {
      venue: 'VIP Infinity Pool Deck',
      priority: 'High'
    });
    expect(updated.venue).toBe('VIP Infinity Pool Deck');
    expect(updated.priority).toBe('High');

    // Delete
    subEventService.deleteSubEvent(STUDIO_A, newSub.id);
    const afterDelete = subEventService.getSubEvent(STUDIO_A, newSub.id);
    expect(afterDelete).toBeNull();
  });

  // 5. Assign different members to each sub-event
  it('5. Assign distinct members with department roles to sub-events', () => {
    const mainEvent = eventService.listEvents(STUDIO_A)[0];
    const sub = subEventService.createSubEvent(STUDIO_A, {
      parentEventId: mainEvent.id,
      name: 'Haldi Water Splash Shoot',
      customCategory: 'Haldi',
      date: '2026-11-12',
      startTime: '10:00',
      endTime: '13:00',
      venue: 'Palm Lawn',
      requiredTeamSize: 2,
      priority: 'High',
      status: 'Confirmed',
      sortOrder: 1
    });

    const withMember = subEventService.assignMember(STUDIO_A, sub.id, {
      memberId: 'emp_royal_3',
      memberName: 'Vikramaditya Verma',
      roleTitle: 'Senior Lead Photographer',
      department: 'Photography'
    });

    expect(withMember.assignedMembers.length).toBe(1);
    expect(withMember.assignedMemberIds).toContain('emp_royal_3');

    // Remove member
    const afterRemoval = subEventService.removeMember(STUDIO_A, sub.id, 'emp_royal_3');
    expect(afterRemoval.assignedMembers.length).toBe(0);
  });

  // 6. Calculate parent event progress
  it('6. Calculate parent event progress based on completed sub-events (e.g. 6 of 8 = 75%)', () => {
    const mainEvent = eventService.createEvent(STUDIO_A, {
      name: 'Progress Test Shoot',
      customerId: 'cust_royal_1',
      customerName: 'Client Progress',
      customerPhone: '+91 99999 11111',
      category: 'Wedding',
      startDate: '2026-12-01',
      startTime: '10:00',
      endDate: '2026-12-05',
      endTime: '22:00',
      venue: 'Palace',
      venueCity: 'Udaipur',
      priority: 'High',
      status: 'In Progress',
      createdBy: 'test'
    });

    // Create 8 sub-events, 6 completed, 2 upcoming
    for (let i = 1; i <= 8; i++) {
      subEventService.createSubEvent(STUDIO_A, {
        parentEventId: mainEvent.id,
        name: `Function ${i}`,
        customCategory: 'Ceremony',
        date: '2026-12-01',
        startTime: '10:00',
        endTime: '12:00',
        venue: 'Hall',
        requiredTeamSize: 2,
        priority: 'High',
        status: i <= 6 ? 'Completed' : 'Confirmed',
        sortOrder: i
      });
    }

    const progress = subEventService.calculateParentProgress(STUDIO_A, mainEvent.id);
    expect(progress.total).toBe(8);
    expect(progress.completed).toBe(6);
    expect(progress.upcoming).toBe(2);
    expect(progress.percentage).toBe(75); // 6 / 8 = 75%
  });

  // 7. Create employee
  it('7. Admin creates an employee with department, designation, and branch', () => {
    const newEmp = employeeService.createEmployee(STUDIO_A, {
      fullName: 'Rohan Mehra',
      email: 'rohan.mehra@royalphotography.in',
      phone: '+91 98205 99881',
      department: 'Cinematography',
      designation: 'Senior Gimbal Operator',
      joiningDate: '2026-11-01',
      roleId: 'role_photographer',
      roleName: 'Videographer',
      assignedBranchId: 'branch_royal_mum',
      employmentStatus: 'active',
      emergencyContact: { name: 'Kavita Mehra', relationship: 'Spouse', phone: '+91 98205 11223' }
    });

    expect(newEmp.id).toBeDefined();
    expect(newEmp.employeeNumber).toMatch(/^EMP-\d{3}$/);
    expect(newEmp.fullName).toBe('Rohan Mehra');
    expect(newEmp.department).toBe('Cinematography');
  });

  // 8. Assign employee credentials securely (no plain text passwords)
  it('8. Securely assign employee credentials without saving plain-text passwords in Firestore', () => {
    const emp = employeeService.createEmployee(STUDIO_A, {
      fullName: 'Pooja Bhatt',
      email: 'pooja.bhatt@royalphotography.in',
      phone: '+91 98206 12345',
      department: 'Post-Production',
      designation: 'Album Layout Specialist',
      joiningDate: '2026-11-01',
      roleId: 'role_editor',
      roleName: 'Album Designer',
      initialPassword: 'SecurePassword@2026',
      loginId: 'pooja.bhatt@royalphotography.in'
    });

    expect(emp.loginCredentials).toBeDefined();
    expect(emp.loginCredentials?.loginId).toBe('pooja.bhatt@royalphotography.in');
    expect(emp.loginCredentials?.hasAccess).toBe(true);

    // Verify employee document NEVER contains plain text password
    expect((emp as any).password).toBeUndefined();
    expect((emp.loginCredentials as any).password).toBeUndefined();

    // Verify vault storage holds cryptographic hash and salt
    const vaultCred = authCredentialService.getCredentialForEmployee(STUDIO_A, emp.id);
    expect(vaultCred).toBeDefined();
    expect(vaultCred?.passwordHash).not.toBe('SecurePassword@2026');
    expect(vaultCred?.passwordHash).toContain('_hashed_sec');
    expect(vaultCred?.salt).toBeDefined();
  });

  // 9. Log in using employee credentials in the authentication test environment
  it('9. Verify employee credentials verification logic', () => {
    const emp = employeeService.createEmployee(STUDIO_A, {
      fullName: 'Aman Joshi',
      email: 'aman.joshi@royalphotography.in',
      phone: '+91 98207 44556',
      department: 'Drone Operations',
      designation: 'Certified DGCA Drone Pilot',
      joiningDate: '2026-11-01',
      roleId: 'role_photographer',
      roleName: 'Videographer',
      initialPassword: 'AmanPassword123'
    });

    // Test correct password
    const resultSuccess = authCredentialService.verifyCredentials(STUDIO_A, emp.email, 'AmanPassword123');
    expect(resultSuccess.success).toBe(true);
    expect(resultSuccess.employeeId).toBe(emp.id);

    // Test incorrect password
    const resultFail = authCredentialService.verifyCredentials(STUDIO_A, emp.email, 'WrongPassword!');
    expect(resultFail.success).toBe(false);

    // Test deactivated account
    authCredentialService.toggleAccess(STUDIO_A, emp.id, false);
    const resultDeactivated = authCredentialService.verifyCredentials(STUDIO_A, emp.email, 'AmanPassword123');
    expect(resultDeactivated.success).toBe(false);
    expect(resultDeactivated.error).toContain('deactivated');
  });

  // 10. Create custom roles
  it('10. Admin creates a custom role with tailored permissions', () => {
    const customRole = roleService.createRole(STUDIO_A, {
      name: 'Senior Colorist & QC Lead',
      description: 'Reviews cinematic color grades and approves client gallery exports',
      color: 'purple',
      permissions: {
        events: { view: true, create: false, edit: false, delete: false },
        subEvents: { view: true, create: false, edit: false, delete: false },
        customers: { view: false, create: false, edit: false, delete: false },
        team: { view: true, create: false, edit: false, delete: false },
        roles: { view: false, create: false, edit: false, delete: false },
        salary: { view: false, edit: false },
        payroll: { view: false, manage: false },
        leave: { request: true, viewAll: false, approve: false },
        tasks: { view: true, create: true, edit: true, delete: false },
        settings: { view: false, edit: false }
      }
    });

    expect(customRole.id).toBeDefined();
    expect(customRole.name).toBe('Senior Colorist & QC Lead');
    expect(customRole.isSystem).toBe(false);
    expect(roleService.hasPermission(customRole, 'tasks', 'create')).toBe(true);
    expect(roleService.hasPermission(customRole, 'salary', 'view')).toBe(false);
  });

  // 11. Test role permissions
  it('11. Validate role permissions matrix across modules', () => {
    const roles = roleService.listRoles(STUDIO_A);
    const ownerRole = roles.find(r => r.name === 'Studio Owner')!;
    const photographerRole = roles.find(r => r.name === 'Photographer')!;

    // Owner has salary & payroll access
    expect(roleService.hasPermission(ownerRole, 'salary', 'view')).toBe(true);
    expect(roleService.hasPermission(ownerRole, 'payroll', 'manage')).toBe(true);

    // Photographer has NO salary or payroll access
    expect(roleService.hasPermission(photographerRole, 'salary', 'view')).toBe(false);
    expect(roleService.hasPermission(photographerRole, 'payroll', 'manage')).toBe(false);
    expect(roleService.hasPermission(photographerRole, 'leave', 'request')).toBe(true);
    expect(roleService.hasPermission(photographerRole, 'leave', 'approve')).toBe(false);
  });

  // 12. Add salary information
  it('12. Studio Owner adds compensation and salary profiles for employees', () => {
    const roles = roleService.listRoles(STUDIO_A);
    const ownerRole = roles.find(r => r.name === 'Studio Owner')!;

    const profile = salaryService.saveSalaryProfile(STUDIO_A, {
      employeeId: 'emp_royal_3',
      employeeName: 'Vikramaditya Verma',
      salaryType: 'monthly',
      monthlySalary: 70000,
      dailySalary: 2333,
      paymentMethod: 'bank_transfer',
      salaryStartDate: '2026-02-01',
      allowances: [{ id: 'al_gear', name: 'Lens Kit Maintenance', amount: 5000 }],
      bonuses: [{ id: 'bn_perf', name: 'Excellence Bonus', amount: 10000 }],
      deductions: [{ id: 'dd_pt', name: 'Professional Tax', amount: 200 }],
      advanceSalary: 0,
      leaveAdjustments: 0,
      netPayableSalary: 84800,
      paymentStatus: 'pending'
    }, ownerRole);

    expect(profile.id).toBeDefined();
    expect(profile.netPayableSalary).toBe(84800); // 70000 + 5000 + 10000 - 200
  });

  // 13. Verify employees cannot access salary records
  it('13. Strictly block non-finance roles and employees from accessing salary records', () => {
    const roles = roleService.listRoles(STUDIO_A);
    const photographerRole = roles.find(r => r.name === 'Photographer')!;
    const editorRole = roles.find(r => r.name === 'Photo Editor')!;

    // Must throw security exception when photographer tries to list salaries
    expect(() => {
      salaryService.listSalaryProfiles(STUDIO_A, photographerRole);
    }).toThrowError(/Security Exception/);

    // Must throw security exception when editor tries to view salary
    expect(() => {
      salaryService.getSalaryProfile(STUDIO_A, 'emp_royal_1', editorRole);
    }).toThrowError(/Security Exception/);

    // Must throw security exception if no role is supplied
    expect(() => {
      salaryService.listSalaryProfiles(STUDIO_A, null);
    }).toThrowError(/Security Exception/);
  });

  // 14. Generate payroll
  it('14. Generate monthly payroll run and record payment transaction', () => {
    const roles = roleService.listRoles(STUDIO_A);
    const ownerRole = roles.find(r => r.name === 'Studio Owner')!;

    const payrollRun = payrollService.generateMonthlyPayrollRun(
      STUDIO_A,
      '2026-11',
      'November 2026 Studio Payroll',
      ownerRole,
      'usr_kabir'
    );

    expect(payrollRun.id).toBeDefined();
    expect(payrollRun.month).toBe('2026-11');
    expect(payrollRun.totalEmployees).toBeGreaterThan(0);
    expect(payrollRun.totalNetPayable).toBeGreaterThan(0);
    expect(payrollRun.status).toBe('draft');

    // Record a payment transaction for the first entry
    const firstEntry = payrollRun.entries[0];
    const tx = payrollService.recordPaymentTransaction(STUDIO_A, {
      employeeId: firstEntry.employeeId,
      employeeName: firstEntry.employeeName,
      payrollEntryId: firstEntry.id,
      amount: firstEntry.netPayable,
      type: 'salary_payment',
      paymentMethod: 'bank_transfer',
      transactionReference: 'NEFT-AXIS-99281',
      paymentDate: '2026-11-01',
      recordedBy: 'Kabir Sharma'
    }, ownerRole);

    expect(tx.id).toBeDefined();
    expect(tx.amount).toBe(firstEntry.netPayable);

    // Verify entry is marked paid
    const updatedRun = payrollService.getPayrollRun(STUDIO_A, payrollRun.id, ownerRole);
    const entryAfterPay = updatedRun?.entries.find(e => e.id === firstEntry.id);
    expect(entryAfterPay?.paymentStatus).toBe('paid');
  });

  // 15. Submit leave request
  it('15. Employee submits a leave request with calculated total days', () => {
    const req = leaveService.applyLeave(STUDIO_A, {
      employeeId: 'emp_royal_3',
      employeeName: 'Vikramaditya Verma',
      leaveTypeId: 'lt_studio_royal_001_1',
      leaveTypeName: 'Casual Leave',
      startDate: '2026-12-20',
      endDate: '2026-12-22',
      totalDays: 3,
      reason: 'Personal family pilgrimage post wedding season'
    });

    expect(req.id).toBeDefined();
    expect(req.status).toBe('pending');
    expect(req.totalDays).toBe(3);
  });

  // 16. Approve and reject leave
  it('16. Admin approves leave and rejects with rejection remarks', () => {
    const req1 = leaveService.applyLeave(STUDIO_A, {
      employeeId: 'emp_royal_2',
      employeeName: 'Aditi Rao',
      leaveTypeId: 'lt_studio_royal_001_1',
      leaveTypeName: 'Casual Leave',
      startDate: '2026-12-05',
      endDate: '2026-12-06',
      totalDays: 2,
      reason: 'Weekend break'
    });

    const approved = leaveService.approveLeave(STUDIO_A, req1.id, 'usr_kabir', 'Kabir Sharma');
    expect(approved.status).toBe('approved');
    expect(approved.reviewedByName).toBe('Kabir Sharma');

    const req2 = leaveService.applyLeave(STUDIO_A, {
      employeeId: 'emp_royal_4',
      employeeName: 'Neha Kapoor',
      leaveTypeId: 'lt_studio_royal_001_1',
      leaveTypeName: 'Casual Leave',
      startDate: '2026-12-10',
      endDate: '2026-12-12',
      totalDays: 3,
      reason: 'Leisure trip'
    });

    const rejected = leaveService.rejectLeave(
      STUDIO_A, 
      req2.id, 
      'Cannot approve leave: Critical Udaipur Singhania video deadline on Dec 11',
      'usr_kabir',
      'Kabir Sharma'
    );

    expect(rejected.status).toBe('rejected');
    expect(rejected.rejectionRemarks).toContain('Singhania video deadline');
  });

  // 17. Verify leave balances
  it('17. Pending and rejected leave requests do NOT reduce approved leave balances', () => {
    const initialBal = leaveService.getLeaveBalance(STUDIO_A, 'emp_royal_3');
    const initialRemaining = initialBal.totalRemaining;

    // Submit pending request
    const pendingReq = leaveService.applyLeave(STUDIO_A, {
      employeeId: 'emp_royal_3',
      employeeName: 'Vikramaditya Verma',
      leaveTypeId: 'lt_studio_royal_001_1',
      leaveTypeName: 'Casual Leave',
      startDate: '2026-12-28',
      endDate: '2026-12-30',
      totalDays: 3,
      reason: 'Year end break'
    });

    const balAfterPending = leaveService.getLeaveBalance(STUDIO_A, 'emp_royal_3');
    // Pending request must NOT decrease remaining balance
    expect(balAfterPending.totalRemaining).toBe(initialRemaining);

    // Reject the request
    leaveService.rejectLeave(STUDIO_A, pendingReq.id, 'Studio fully booked for New Year shoots');
    const balAfterReject = leaveService.getLeaveBalance(STUDIO_A, 'emp_royal_3');
    // Rejected request must NOT decrease remaining balance
    expect(balAfterReject.totalRemaining).toBe(initialRemaining);

    // Now apply and APPROVE a 2-day leave
    const approveReq = leaveService.applyLeave(STUDIO_A, {
      employeeId: 'emp_royal_3',
      employeeName: 'Vikramaditya Verma',
      leaveTypeId: 'lt_studio_royal_001_1',
      leaveTypeName: 'Casual Leave',
      startDate: '2026-12-02',
      endDate: '2026-12-03',
      totalDays: 2,
      reason: 'Post-shoot rest'
    });
    leaveService.approveLeave(STUDIO_A, approveReq.id);

    const balAfterApproved = leaveService.getLeaveBalance(STUDIO_A, 'emp_royal_3');
    // Approved request MUST reduce remaining balance by exactly 2 days
    expect(balAfterApproved.totalRemaining).toBe(initialRemaining - 2);
  });

  // 18. Verify admin leave calendar
  it('18. Verify admin leave calendar and employees on leave today', () => {
    const today = new Date().toISOString().split('T')[0];
    const todayReq = leaveService.applyLeave(STUDIO_A, {
      employeeId: 'emp_royal_1',
      employeeName: 'Kabir Sharma',
      leaveTypeId: 'lt_studio_royal_001_2',
      leaveTypeName: 'Sick Leave',
      startDate: today,
      endDate: today,
      totalDays: 1,
      reason: 'Flu symptoms'
    });
    leaveService.approveLeave(STUDIO_A, todayReq.id);

    const onLeaveToday = leaveService.getEmployeesOnLeaveToday(STUDIO_A, today);
    expect(onLeaveToday.some(r => r.employeeId === 'emp_royal_1')).toBe(true);
  });

  // 19. Test two different studios (Tenant Isolation)
  it('19. Strict multi-tenant isolation across Studio A and Studio B for sub-events, employees and payroll', () => {
    const rolesA = roleService.listRoles(STUDIO_A);
    const ownerA = rolesA.find(r => r.name === 'Studio Owner')!;
    const rolesB = roleService.listRoles(STUDIO_B);
    const ownerB = rolesB.find(r => r.name === 'Studio Owner')!;

    // Employees isolation
    const empsA = employeeService.listEmployees(STUDIO_A);
    const empsB = employeeService.listEmployees(STUDIO_B);
    expect(empsA.some(e => e.fullName === 'Kabir Sharma')).toBe(true);
    expect(empsB.some(e => e.fullName === 'Kabir Sharma')).toBe(false);
    expect(empsB.some(e => e.fullName === 'Siddharth Rao')).toBe(true);

    // Sub-events isolation
    const subsA = subEventService.listSubEvents(STUDIO_A);
    const subsB = subEventService.listSubEvents(STUDIO_B);
    expect(subsA.length).toBeGreaterThan(0);
    expect(subsB.length).toBeGreaterThan(0);
    expect(subsA.every(s => s.studioId === STUDIO_A)).toBe(true);
    expect(subsB.every(s => s.studioId === STUDIO_B)).toBe(true);

    // Salary profiles isolation
    const salsA = salaryService.listSalaryProfiles(STUDIO_A, ownerA);
    const salsB = salaryService.listSalaryProfiles(STUDIO_B, ownerB);
    expect(salsA.some(s => s.employeeName === 'Kabir Sharma')).toBe(true);
    expect(salsB.some(s => s.employeeName === 'Kabir Sharma')).toBe(false);

    // Services strictly reject calls with missing studioId
    expect(() => subEventService.listSubEvents('')).toThrowError(/studioId is required/);
    expect(() => employeeService.listEmployees('')).toThrowError(/studioId is required/);
    expect(() => leaveService.listLeaveRequests('')).toThrowError(/studioId is required/);
  });

  // 20. Attendance recording
  it('20. Log daily attendance records per employee', () => {
    const today = new Date().toISOString().split('T')[0];
    const rec = attendanceService.markAttendance(STUDIO_A, {
      employeeId: 'emp_royal_3',
      employeeName: 'Vikramaditya Verma',
      date: today,
      status: 'present',
      checkIn: '09:45'
    });

    expect(rec.id).toBeDefined();
    expect(rec.status).toBe('present');
    expect(rec.checkIn).toBe('09:45');

    const logs = attendanceService.getEmployeeAttendance(STUDIO_A, 'emp_royal_3');
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].employeeId).toBe('emp_royal_3');
  });
});
