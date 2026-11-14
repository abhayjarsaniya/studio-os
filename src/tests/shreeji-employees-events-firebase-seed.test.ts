import { describe, it, expect, beforeEach } from 'vitest';
import { ShreejiSeedService, SHREEJI_EMPLOYEES_DEF, SHREEJI_BOOKINGS_DEF, SEED_BATCH_ID } from '../services/seedShreejiStudio';
import { TenantStore } from '../services/tenantStore';
import { unifiedAuthService } from '../services/unifiedAuthService';
import { Employee, Customer, StudioEvent, SubEvent, Quotation, Invoice, Payment, Task } from '../types/schema';
import { BookingRecord } from '../types/bookingProduction';

const STUDIO_ID = 'studio_shreeji_films';
const DEMO_ALIAS = 'std_demo_royal';

describe('STUDIO OS — Shreeji Studio: 14 Employees & 25+ Realistic Events in Firebase', () => {
  beforeEach(async () => {
    await ShreejiSeedService.seedShreejiStudio(true, STUDIO_ID);
  });

  // =========================================================================
  // 1. Employee Management: 14 Specific Profiles
  // =========================================================================
  it('1. provisions all 14 requested employees with exact names, designations, and departments', () => {
    const employees = TenantStore.get<Employee>(STUDIO_ID, 'employees');
    expect(employees.length).toBeGreaterThanOrEqual(14);

    const requiredRoster = [
      { name: 'Rahul Sharma', designation: 'Lead Photographer', dept: 'Photography' },
      { name: 'Karan Patel', designation: 'Candid Photographer', dept: 'Photography' },
      { name: 'Vishal Desai', designation: 'Videographer', dept: 'Videography' },
      { name: 'Meet Shah', designation: 'Cinematographer', dept: 'Cinematography' },
      { name: 'Jay Mehta', designation: 'Drone Operator', dept: 'Drone' },
      { name: 'Priya Joshi', designation: 'Photo Editor', dept: 'Photo Editing' },
      { name: 'Riya Trivedi', designation: 'Video Editor', dept: 'Video Editing' },
      { name: 'Neel Vyas', designation: 'Album Designer', dept: 'Album Designing' },
      { name: 'Aman Parmar', designation: 'Photography Assistant', dept: 'Photography' },
      { name: 'Krunal Dave', designation: 'Production Manager', dept: 'Production' },
      { name: 'Dhruv Patel', designation: 'Photographer', dept: 'Photography' },
      { name: 'Kavya Shah', designation: 'Editing Assistant', dept: 'Video Editing' },
      { name: 'Harsh Modi', designation: 'Photography Assistant', dept: 'Photography' },
      { name: 'Nisha Desai', designation: 'Album Designer', dept: 'Album Designing' }
    ];

    for (const req of requiredRoster) {
      const found = employees.find(e => e.fullName === req.name);
      expect(found, `Expected employee ${req.name} to exist`).toBeDefined();
      expect(found?.designation).toBe(req.designation);
      expect(found?.department).toBe(req.dept);
      expect(found?.employmentStatus).toBe('active');
      expect(found?.phone).toMatch(/^\+91 98251 100\d{2}$/);
      expect(found?.email).toMatch(/@shreejifilms\.in$/);
      expect((found as any)?.dailyRate).toBeGreaterThan(0);
      expect((found as any)?.monthlySalary).toBeGreaterThan(0);
      expect((found as any)?.skills?.length).toBeGreaterThan(0);
      expect((found as any)?.seedBatchId).toBe(SEED_BATCH_ID);
    }
  });

  // =========================================================================
  // 2. Authentication for all 14 employees
  // =========================================================================
  it('2. enables single-field / two-field login for all 14 employees using ChangeMe@123', () => {
    const usernames = [
      'rahul', 'karan', 'vishal', 'meet', 'jay', 'priya', 'riya',
      'neel', 'aman', 'krunal', 'dhruv', 'kavya', 'harsh', 'nisha'
    ];

    for (const u of usernames) {
      const loginRes = unifiedAuthService.loginEmployee(u, 'ChangeMe@123');
      expect(loginRes.success, `Expected login for ${u} to succeed`).toBe(true);
      expect(loginRes.session?.account.accountType).toBe('EMPLOYEE');
      expect(loginRes.session?.account.studioId).toBe(STUDIO_ID);
    }
  });

  // =========================================================================
  // 3. 25+ Bookings Covering All 25 Suggested Categories
  // =========================================================================
  it('3. seeds at least 25 bookings covering all 25 suggested categories across Gujarat locations', () => {
    const bookings = TenantStore.get<BookingRecord>(STUDIO_ID, 'studio_bookings_v2');
    expect(bookings.length).toBeGreaterThanOrEqual(25);

    const categoriesInBookings = new Set(bookings.map(b => (b as any).eventType || b.functions?.[0]?.category));

    const expected25Categories = [
      'Wedding', 'Pre-Wedding', 'Engagement', 'Reception', 'Haldi',
      'Mehndi', 'Mandvo', 'Birthday', 'Baby Shower', 'Maternity',
      'Newborn', 'Corporate Event', 'Product Shoot', 'Fashion Shoot', 'Anniversary',
      'Family Shoot', 'School Function', 'College Fest', 'Drone Shoot', 'Cinematic Film',
      'Traditional Video', 'Reels & Social Media', 'Religious Function', 'Destination Wedding', 'Album Package'
    ];

    for (const cat of expected25Categories) {
      expect(categoriesInBookings.has(cat), `Category ${cat} should be present`).toBe(true);
    }

    // Verify Gujarat cities
    const cities = new Set(bookings.map(b => (b as any).customerCity || (b as any).city));
    expect(cities.has('Ahmedabad')).toBe(true);
    expect(cities.has('Gandhinagar')).toBe(true);
    expect(cities.has('Vadodara')).toBe(true);
    expect(cities.has('Surat')).toBe(true);
    expect(cities.has('Rajkot')).toBe(true);
  });

  // =========================================================================
  // 4. Status Distribution Breakdown
  // =========================================================================
  it('4. matches the realistic status distribution across all 25 bookings', () => {
    const summary = ShreejiSeedService.computeSetupSummary(STUDIO_ID);
    const dist = summary.statusDistribution;

    expect(dist.completed).toBe(6);
    expect(dist.deal_confirmed).toBe(6);
    expect(dist.in_production).toBe(3);
    expect(dist.editing).toBe(3);
    expect(dist.partially_delivered).toBe(2);
    expect(dist.advance_pending).toBe(2);
    expect(dist.negotiation).toBe(2);
    expect(dist.cancelled).toBe(1);
    expect(summary.totalBookings).toBe(25);
  });

  // =========================================================================
  // 5. Multi-Event Wedding Structure
  // =========================================================================
  it('5. structures multi-event weddings with sub-events, timelines, and crew assignments', () => {
    const subEvents = TenantStore.get<SubEvent>(STUDIO_ID, 'subEvents');
    expect(subEvents.length).toBeGreaterThanOrEqual(11); // 7 (Aarav) + 4 (Sameer Diu)

    // Check Aarav & Meera Palace Wedding (bkg_shr_001)
    const aaravSubEvents = subEvents.filter(s => s.parentEventId === 'evt_shr_001');
    expect(aaravSubEvents.length).toBe(7);

    const aaravSubNames = aaravSubEvents.map(s => s.name);
    expect(aaravSubNames.some(n => n.includes('Engagement'))).toBe(true);
    expect(aaravSubNames.some(n => n.includes('Mandvo'))).toBe(true);
    expect(aaravSubNames.some(n => n.includes('Haldi'))).toBe(true);
    expect(aaravSubNames.some(n => n.includes('Mehndi'))).toBe(true);
    expect(aaravSubNames.some(n => n.includes('Sangeet'))).toBe(true);
    expect(aaravSubNames.some(n => n.includes('Wedding'))).toBe(true);
    expect(aaravSubNames.some(n => n.includes('Reception'))).toBe(true);

    // Check Destination Wedding in Diu (bkg_shr_024)
    const diuSubEvents = subEvents.filter(s => s.parentEventId === 'evt_shr_024');
    expect(diuSubEvents.length).toBe(4);
    expect(diuSubEvents[0].venue).toContain('Radhika Beach Resort');
  });

  // =========================================================================
  // 6. Complete Financial Ledger & Quotations/Invoices/Payments
  // =========================================================================
  it('6. reconciles full financial records across quotations, invoices, and payments', () => {
    const quotations = TenantStore.get<Quotation>(STUDIO_ID, 'quotations');
    const invoices = TenantStore.get<Invoice>(STUDIO_ID, 'invoices');
    const payments = TenantStore.get<Payment>(STUDIO_ID, 'payments');

    expect(quotations.length).toBe(25);
    expect(invoices.length).toBe(25);
    expect(payments.length).toBeGreaterThanOrEqual(20);

    const summary = ShreejiSeedService.computeSetupSummary(STUDIO_ID);
    expect(summary.revenueBreakdown.totalAgreedValue).toBeGreaterThan(1500000);
    expect(summary.revenueBreakdown.totalReceived).toBeGreaterThan(800000);
    expect(summary.revenueBreakdown.totalPendingBalance).toBeGreaterThan(0);
  });

  // =========================================================================
  // 7. Delivery Tasks & Checklists
  // =========================================================================
  it('7. generates delivery tasks and checklists assigned to specific crew members with deadlines', () => {
    const tasks = TenantStore.get<Task>(STUDIO_ID, 'tasks');
    expect(tasks.length).toBeGreaterThanOrEqual(100);

    const priyaTasks = tasks.filter(t => t.assignedToId === 'emp_shr_priya');
    expect(priyaTasks.length).toBeGreaterThan(0);

    const sampleTask = tasks[0];
    expect(sampleTask.checklist?.length).toBeGreaterThan(0);
    expect(sampleTask.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect((sampleTask as any).seedBatchId).toBe(SEED_BATCH_ID);
  });

  // =========================================================================
  // 8. Backward Compatibility & Dual Key Mirroring
  // =========================================================================
  it('8. synchronizes identically to std_demo_royal for backwards compatibility', () => {
    const shreejiEmps = TenantStore.get<Employee>(STUDIO_ID, 'employees');
    const demoEmps = TenantStore.get<Employee>(DEMO_ALIAS, 'employees');

    expect(demoEmps.length).toBe(shreejiEmps.length);
    expect(demoEmps[0].fullName).toBe(shreejiEmps[0].fullName);

    const shreejiBkgs = TenantStore.get<BookingRecord>(STUDIO_ID, 'studio_bookings_v2');
    const demoBkgs = TenantStore.get<BookingRecord>(DEMO_ALIAS, 'studio_bookings_v2');
    expect(demoBkgs.length).toBe(shreejiBkgs.length);
  });

  // =========================================================================
  // 9. Idempotency & Safe Unseed
  // =========================================================================
  it('9. is fully idempotent and supports non-destructive unseeding', async () => {
    // Re-seeding should not duplicate records
    await ShreejiSeedService.seedShreejiStudio(false, STUDIO_ID);
    const emps = TenantStore.get<Employee>(STUDIO_ID, 'employees');
    expect(emps.length).toBe(14);

    // Unseed cleans demo records
    ShreejiSeedService.unseedShreejiStudio(STUDIO_ID);
    const empsAfterUnseed = TenantStore.get<Employee>(STUDIO_ID, 'employees');
    expect(empsAfterUnseed.length).toBe(0);

    // Re-seed restores cleanly
    await ShreejiSeedService.seedShreejiStudio(true, STUDIO_ID);
    expect(TenantStore.get<Employee>(STUDIO_ID, 'employees').length).toBe(14);
  });
});
