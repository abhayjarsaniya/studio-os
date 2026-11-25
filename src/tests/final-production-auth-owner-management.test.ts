import { describe, it, expect, beforeEach } from 'vitest';
import { firebaseAuthService } from '../services/firebaseAuthService';
import { crossDeviceAuthService } from '../services/crossDeviceAuthService';
import { unifiedAuthService } from '../services/unifiedAuthService';
import { realAccountProvisionService } from '../services/realAccountProvisionService';
import { masterAdminService } from '../services/masterAdminService';
import { rateLimitService } from '../services/rateLimitService';
import { TenantStore } from '../services/tenantStore';
import { platformStudioService } from '../services/platformStudioService';
import { eventService } from '../services/eventService';
import { customerService } from '../services/customerService';

// Ensure localStorage mock is present in Node/Vitest environment
if (typeof (globalThis as any).localStorage === 'undefined') {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (key: string) => store.get(key) || null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
    key: (index: number) => Array.from(store.keys())[index] || null,
    get length() { return store.size; }
  };
}

describe('Studio OS — Final Production Authentication & Owner Management', () => {
  beforeEach(() => {
    localStorage.clear();
    rateLimitService.resetAttempts('all');
  });

  // Scenario 1: Master Admin Google login works for jarsaniya.abhay@gmail.com
  it('Scenario 1: Master Admin Google login succeeds exclusively for jarsaniya.abhay@gmail.com', async () => {
    const res = await firebaseAuthService.loginMasterAdminWithGoogle({
      uid: 'mmrIcufwmoQ4JawzKd0pbgjNRsx2',
      email: 'jarsaniya.abhay@gmail.com',
      displayName: 'Abhay Jarsaniya'
    });

    expect(res.success).toBe(true);
    expect(res.role).toBe('platform_master_admin');
    expect(res.targetRoute).toBe('#/master/dashboard');
    expect(localStorage.getItem('studio_os_user_role')).toBe('platform_master_admin');
  });

  // Scenario 2: Any other Google account is rejected with a clear access denied message
  it('Scenario 2: Any other Google account is rejected with access denied message', async () => {
    const res = await firebaseAuthService.loginMasterAdminWithGoogle({
      uid: 'other_google_uid_999',
      email: 'unauthorized.user@gmail.com',
      displayName: 'Unauthorized User'
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain('Google Sign-In is exclusively reserved for Platform Master Admin (jarsaniya.abhay@gmail.com)');
  });

  // Scenario 3: Master Admin creates a new studio with Login ID & Initial Password
  it('Scenario 3: Master Admin creates new studio with Login ID, initial password, and status', async () => {
    const testLoginId = `aarav_test_${Date.now()}`;
    const initialPass = 'StrongPass#2026';

    const result = await realAccountProvisionService.provisionStudioAndOwner({
      name: 'Vibrant Frames Studio',
      ownerName: 'Aarav Patel',
      loginId: testLoginId,
      initialPassword: initialPass,
      confirmPassword: initialPass,
      phone: '+91 98250 99887',
      address: '401 Venus Atlantis, Prahlad Nagar',
      city: 'Ahmedabad',
      state: 'Gujarat',
      planId: 'studio_os_standard',
      status: 'active'
    });

    expect(result.success).toBe(true);
    expect(result.studioId).toBeDefined();
    expect(result.loginId).toBe(testLoginId);
    expect(result.initialPassword).toBe(initialPass);

    // Verify studio is registered in TenantStore
    const studioProfile = TenantStore.get(result.studioId!, 'profile') as any;
    expect(studioProfile).toBeDefined();
    expect(studioProfile.name).toBe('Vibrant Frames Studio');
  });

  // Scenario 4: Studio Owner logs in immediately with Login ID + Password
  it('Scenario 4: Studio Owner logs in immediately with Login ID & Password without email verification', async () => {
    const testLoginId = `krunal_test_${Date.now()}`;
    const password = 'KrunalSecret#99';

    const provisionRes = await realAccountProvisionService.provisionStudioAndOwner({
      name: 'Krunal Photography',
      ownerName: 'Krunal Shah',
      loginId: testLoginId,
      initialPassword: password,
      confirmPassword: password,
      phone: '+91 98251 12345',
      address: 'Ring Road',
      city: 'Surat',
      state: 'Gujarat',
      status: 'active'
    });
    expect(provisionRes.success).toBe(true);

    // Immediate login via Login ID & Password
    const loginRes = await crossDeviceAuthService.login(testLoginId, password);
    expect(loginRes.success).toBe(true);
    expect(loginRes.role).toBe('owner');
    expect(loginRes.studioId).toBe(provisionRes.studioId);
    expect(loginRes.targetRoute).toBe('#/app/dashboard');
  });

  // Scenario 5: Studio Owner cannot log in using Google Sign-In
  it('Scenario 5: Studio Owner Google sign-in attempt is rejected', async () => {
    const res = await firebaseAuthService.loginMasterAdminWithGoogle({
      uid: 'owner_uid_random',
      email: 'studio.owner.sample@gmail.com',
      displayName: 'Studio Owner Sample'
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain('Google Sign-In is exclusively reserved for Platform Master Admin');
  });

  // Scenario 6: Studio Owner cannot access another studio's data (Multi-tenant isolation)
  it('Scenario 6: Multi-tenant studio isolation prevents cross-tenant data access', async () => {
    const studioA = `studio_alpha_${Date.now()}`;
    const studioB = `studio_beta_${Date.now()}`;

    // Seed events for Studio A
    TenantStore.set(studioA, 'events', [
      { id: 'ev_a1', studioId: studioA, title: 'Studio A Grand Wedding', totalAmount: 150000 }
    ]);

    // Seed events for Studio B
    TenantStore.set(studioB, 'events', [
      { id: 'ev_b1', studioId: studioB, title: 'Studio B Corporate Shoot', totalAmount: 75000 }
    ]);

    // Query data for Studio A
    const eventsA = (TenantStore.get(studioA, 'events') as any[]) || [];
    const eventsB = (TenantStore.get(studioB, 'events') as any[]) || [];

    expect(eventsA.length).toBe(1);
    expect(eventsA[0].title).toBe('Studio A Grand Wedding');
    expect(eventsA[0].studioId).toBe(studioA);

    expect(eventsB.length).toBe(1);
    expect(eventsB[0].title).toBe('Studio B Corporate Shoot');
    expect(eventsB[0].studioId).toBe(studioB);

    // Studio A cannot see Studio B's data
    const crossQuery = eventsA.filter(e => e.studioId === studioB);
    expect(crossQuery.length).toBe(0);
  });

  // Scenario 7, 8, 9: Master Admin changes password; old fails immediately; new works immediately
  it('Scenarios 7, 8, 9: Master Admin updates owner password; old stops working immediately; new works immediately', async () => {
    const testLoginId = `rohan_pw_test_${Date.now()}`;
    const initialPass = 'InitialPass#123';
    const newPass = 'UpdatedSecurePass#456';

    const provisionRes = await realAccountProvisionService.provisionStudioAndOwner({
      name: 'Rohan Creations',
      ownerName: 'Rohan Desai',
      loginId: testLoginId,
      initialPassword: initialPass,
      confirmPassword: initialPass,
      phone: '+91 98252 88776',
      address: 'Alkapuri',
      city: 'Vadodara',
      state: 'Gujarat',
      status: 'active'
    });
    expect(provisionRes.success).toBe(true);

    // Verify initial login works
    const firstLogin = await crossDeviceAuthService.login(testLoginId, initialPass);
    expect(firstLogin.success).toBe(true);

    // Master Admin changes owner password
    const changeRes = masterAdminService.setStudioOwnerPassword(provisionRes.studioId!, newPass, 'Master Admin');
    expect(changeRes.success).toBe(true);

    // Scenario 8: Old password stops working immediately
    const oldLogin = await crossDeviceAuthService.login(testLoginId, initialPass);
    expect(oldLogin.success).toBe(false);
    expect(oldLogin.error).toContain('Invalid');

    // Scenario 9: New password works immediately
    const newLogin = await crossDeviceAuthService.login(testLoginId, newPass);
    expect(newLogin.success).toBe(true);
    expect(newLogin.studioId).toBe(provisionRes.studioId);
  });

  // Scenario 10: Deactivated studio accounts cannot log in
  it('Scenario 10: Deactivated studio accounts cannot log in', async () => {
    const testLoginId = `deact_test_${Date.now()}`;
    const password = 'Password#12345';

    const provisionRes = await realAccountProvisionService.provisionStudioAndOwner({
      name: 'Deactivate Test Studio',
      ownerName: 'Deact Owner',
      loginId: testLoginId,
      initialPassword: password,
      confirmPassword: password,
      phone: '+91 98253 11223',
      address: 'Race Course',
      city: 'Rajkot',
      state: 'Gujarat',
      status: 'active'
    });
    expect(provisionRes.success).toBe(true);

    // Master Admin suspends/deactivates studio
    masterAdminService.suspendStudio(provisionRes.studioId!, 'Administrative deactivation test');

    // Attempted login must be blocked
    const deactLogin = await crossDeviceAuthService.login(testLoginId, password);
    expect(deactLogin.success).toBe(false);
    expect(deactLogin.error).toContain('suspended');
  });

  // Scenario 11: Reactivated studio accounts can log in immediately
  it('Scenario 11: Reactivated studio accounts can log in immediately', async () => {
    const testLoginId = `react_test_${Date.now()}`;
    const password = 'Password#12345';

    const provisionRes = await realAccountProvisionService.provisionStudioAndOwner({
      name: 'Reactivate Test Studio',
      ownerName: 'React Owner',
      loginId: testLoginId,
      initialPassword: password,
      confirmPassword: password,
      phone: '+91 98254 33445',
      address: 'Sector 11',
      city: 'Gandhinagar',
      state: 'Gujarat',
      status: 'active'
    });
    expect(provisionRes.success).toBe(true);

    // Suspend first
    masterAdminService.suspendStudio(provisionRes.studioId!, 'Temporary suspension');
    let login = await crossDeviceAuthService.login(testLoginId, password);
    expect(login.success).toBe(false);

    // Reactivate
    masterAdminService.reactivateStudio(provisionRes.studioId!, 'Reactivation restored');

    // Login succeeds immediately
    login = await crossDeviceAuthService.login(testLoginId, password);
    expect(login.success).toBe(true);
    expect(login.studioId).toBe(provisionRes.studioId);
  });

  // Scenario 12: Real-time Auto-Save for bookings, customers, payments
  it('Scenario 12: Real-time auto-save saves bookings and customers into tenant workspace without separate save button', () => {
    const studioId = `studio_autosave_${Date.now()}`;

    // Auto-save via eventService
    const createdEvent = eventService.createEvent(studioId, {
      title: 'Priya & Rahul Wedding',
      name: 'Priya & Rahul Wedding',
      startDate: '2026-12-15',
      endDate: '2026-12-15',
      startTime: '10:00',
      endTime: '18:00',
      category: 'Wedding',
      venue: 'Grand Hyatt Ahmedabad',
      status: 'Confirmed' as any,
      advancePaid: 50000,
      totalAmount: 180000
    } as any);

    expect(createdEvent).toBeDefined();
    expect(createdEvent.id).toBeDefined();
    expect(createdEvent.title).toBe('Priya & Rahul Wedding');
    expect(createdEvent.totalAmount).toBe(180000);

    // Verify in TenantStore
    const retrieved = eventService.getEvent(studioId, createdEvent.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.title).toBe('Priya & Rahul Wedding');
  });

  // Scenario 13: Duplicate prevention on double click / re-save
  it('Scenario 13: Duplicate prevention maintains single record on rapid auto-save re-triggering', () => {
    const studioId = `studio_dup_prev_${Date.now()}`;

    const createdEvent = eventService.createEvent(studioId, {
      title: 'Ananya Sharma Portfolio',
      name: 'Ananya Sharma Portfolio',
      startDate: '2026-12-20',
      endDate: '2026-12-20',
      startTime: '11:00',
      endTime: '16:00',
      category: 'Fashion',
      venue: 'Studio A',
      status: 'Confirmed' as any,
      advancePaid: 20000,
      totalAmount: 60000
    } as any);

    // Rapid re-save / update on the same record
    eventService.updateEvent(studioId, createdEvent.id, {
      totalAmount: 75000
    });
    eventService.updateEvent(studioId, createdEvent.id, {
      totalAmount: 80000
    });

    const allEvents = eventService.listEvents(studioId);
    const matches = allEvents.filter(e => e.id === createdEvent.id);

    // Only one single record exists with latest updated amount
    expect(matches.length).toBe(1);
    expect(matches[0].totalAmount).toBe(80000);
  });

  // Scenario 14: Rate limiting protection prevents brute-force login attempts
  it('Scenario 14: Rate limiting protects against brute force (locks out after 5 attempts for 5 minutes)', async () => {
    const targetId = `brute_target_${Date.now()}`;

    // 5 failed attempts
    for (let i = 0; i < 5; i++) {
      const res = await crossDeviceAuthService.login(targetId, 'WrongPass123!');
      expect(res.success).toBe(false);
    }

    // 6th attempt should be blocked by rate limit service
    const blockedRes = await crossDeviceAuthService.login(targetId, 'AnyPass123!');
    expect(blockedRes.success).toBe(false);
    expect(blockedRes.error).toContain('Too many failed login attempts');
  });
});
