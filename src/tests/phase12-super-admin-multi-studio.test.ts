import { describe, it, expect, beforeEach } from 'vitest';
import { TenantStore } from '../services/tenantStore';
import { platformStudioService } from '../services/platformStudioService';
import { platformEventsService } from '../services/platformEventsService';
import { platformFeatureService } from '../services/platformFeatureService';
import { demoStudioSeedService, DEMO_STUDIOS_CONFIG } from '../services/demoStudioSeedService';
import { supplierService } from '../services/supplierService';
import { studioCollaborationService } from '../services/studioCollaborationService';
import { privacyProtectionService } from '../services/privacyProtectionService';
import { featureVisibilityService } from '../services/featureVisibilityService';
import { employeeAuthService } from '../services/employeeAuthService';
import { teamWhatsAppService } from '../services/teamWhatsAppService';
import { authorizationEngine } from '../services/authorizationEngine';
import { 
  SUPPLIER_CATEGORY_LABELS, 
  SupplierCategory,
  Employee,
  Customer,
  StudioEvent,
  SubEvent 
} from '../types';

describe('Phase 12: Super Admin Control Center, Multi-Studio Management & Advanced Access Control', () => {
  beforeEach(() => {
    TenantStore.resetAll();
    // Seed the 5 Gujarat demo studios cleanly
    demoStudioSeedService.seedAllDemoStudios(true);
  });

  // =========================================================================
  // 1. FIVE GUJARAT DEMO STUDIOS & IDEMPOTENT SEEDING
  // =========================================================================
  describe('1. Five Complete Gujarat Demo Studios & Seed Service', () => {
    it('seeds all 5 Gujarat demo studios with correct profiles, cities, and owners', () => {
      const studios = platformStudioService.listStudios();
      expect(studios.length).toBeGreaterThanOrEqual(5);

      const ahm = studios.find(s => s.id === 'studio_royal_frames_001');
      expect(ahm).toBeDefined();
      expect(ahm?.name).toBe('Royal Frames Photography');
      expect(ahm?.city).toBe('Ahmedabad');
      expect(ahm?.ownerEmail).toBe('aarav@royalframes.in');

      const sur = studios.find(s => s.id === 'studio_moments_002');
      expect(sur).toBeDefined();
      expect(sur?.name).toBe('Moments Studio');
      expect(sur?.city).toBe('Surat');
      expect(sur?.ownerEmail).toBe('krunal@momentsstudio.in');

      const vad = studios.find(s => s.id === 'studio_pixelcraft_003');
      expect(vad).toBeDefined();
      expect(vad?.name).toBe('PixelCraft Photography');
      expect(vad?.city).toBe('Vadodara');
      expect(vad?.ownerEmail).toBe('rohan@pixelcraft.in');

      const raj = studios.find(s => s.id === 'studio_shutter_stories_004');
      expect(raj).toBeDefined();
      expect(raj?.name).toBe('Shutter Stories');
      expect(raj?.city).toBe('Rajkot');
      expect(raj?.ownerEmail).toBe('meet@shutterstories.in');

      const gnr = studios.find(s => s.id === 'studio_golden_hour_005');
      expect(gnr).toBeDefined();
      expect(gnr?.name).toBe('Golden Hour Studio');
      expect(gnr?.city).toBe('Gandhinagar');
      expect(gnr?.ownerEmail).toBe('dhruv@goldenhour.in');
    });

    it('seeds 20+ distinct events per studio (120 total events) with realistic Gujarat venues', () => {
      DEMO_STUDIOS_CONFIG.forEach(cfg => {
        const events = TenantStore.get(cfg.id, 'events') || [];
        expect(events.length).toBeGreaterThanOrEqual(20);
        expect(events.length).toBe(24);

        // Verify sub-events exist for events
        const subEvents = TenantStore.get(cfg.id, 'sub_events') || [];
        expect(subEvents.length).toBeGreaterThanOrEqual(50);

        // Verify realistic Gujarat venues
        const hasGujaratVenue = events.some((e: any) => 
          e.overallVenue.includes(cfg.city) || 
          e.overallVenue.includes('Club') || 
          e.overallVenue.includes('Palace') || 
          e.overallVenue.includes('Hotel')
        );
        expect(hasGujaratVenue).toBe(true);
      });
    });

    it('is completely idempotent and safe to re-run without duplicating records', () => {
      const res = demoStudioSeedService.seedAllDemoStudios(false);
      expect(res.studiosSeeded).toBe(5);
      expect(res.eventsSeeded).toBe(120);

      // Verify count in store remains exactly 24
      const events = TenantStore.get('studio_royal_frames_001', 'events') || [];
      expect(events.length).toBe(24);
    });
  });

  // =========================================================================
  // 2. PLATFORM SUPER ADMIN & STUDIO LIFECYCLE MANAGEMENT
  // =========================================================================
  describe('2. Super Admin Studio Lifecycle Management (Hide vs Suspend vs Archive)', () => {
    it('allows Super Admin to Hide a studio from directory while preserving member login', () => {
      const studioId = 'studio_royal_frames_001';
      expect(platformStudioService.getStudioLifecycleStatus(studioId)).toBe('active');

      // Hide studio
      const ok = platformStudioService.hideStudio(studioId, 'Private beta testing hidden from directory');
      expect(ok).toBe(true);
      expect(platformStudioService.getStudioLifecycleStatus(studioId)).toBe('hidden');

      // Member should STILL be able to log in when hidden
      const loginRes = employeeAuthService.verifyLogin('aarav_ahm', 'StudioOS@2026');
      expect(loginRes.success).toBe(true);

      // Unhide studio
      platformStudioService.unhideStudio(studioId, 'Restoring studio to public directory');
      expect(platformStudioService.getStudioLifecycleStatus(studioId)).toBe('active');
    });

    it('blocks employee login when a studio is Suspended, unlike Hidden status', () => {
      const studioId = 'studio_moments_002';
      platformStudioService.updateStudioStatus(studioId, 'suspended', 'Non-payment of SaaS invoice');

      expect(platformStudioService.getStudioLifecycleStatus(studioId)).toBe('suspended');

      // Login attempt MUST fail with clear explanation
      const loginRes = employeeAuthService.verifyLogin('krunal_sur', 'StudioOS@2026');
      expect(loginRes.success).toBe(false);
      expect(loginRes.error).toContain('suspended');

      // Reactivate studio
      platformStudioService.updateStudioStatus(studioId, 'active', 'Invoice cleared');
      const reactivatedLogin = employeeAuthService.verifyLogin('krunal_sur', 'StudioOS@2026');
      expect(reactivatedLogin.success).toBe(true);
    });

    it('filters studios by city, status, and search keywords', () => {
      const suratStudios = platformStudioService.listStudios({ city: 'Surat' });
      expect(suratStudios.length).toBe(1);
      expect(suratStudios[0].name).toBe('Moments Studio');

      const searchRes = platformStudioService.listStudios({ search: 'PixelCraft' });
      expect(searchRes.length).toBe(1);
      expect(searchRes[0].city).toBe('Vadodara');
    });
  });

  // =========================================================================
  // 3. PLATFORM SUPER ADMIN GLOBAL EVENTS DIRECTORY
  // =========================================================================
  describe('3. Super Admin Global Events Directory (/platform/events)', () => {
    it('aggregates all events across all 5 studios on the platform', () => {
      const allEvents = platformEventsService.listAllPlatformEvents();
      expect(allEvents.length).toBeGreaterThanOrEqual(120); // 24 events * 5 studios (+ optional legacy studio)
      
      const gujaratStudios = ['studio_royal_frames_001', 'studio_moments_002', 'studio_pixelcraft_003', 'studio_shutter_stories_004', 'studio_golden_hour_005'];
      const gujaratEvents = allEvents.filter(e => gujaratStudios.includes(e.studioId));
      expect(gujaratEvents.length).toBe(120);
    });

    it('filters global events by studio, category, and city', () => {
      const ahmEvents = platformEventsService.listAllPlatformEvents({ studioId: 'studio_royal_frames_001' });
      expect(ahmEvents.length).toBe(24);
      expect(ahmEvents.every(e => e.studioCity === 'Ahmedabad')).toBe(true);

      const weddingsOnly = platformEventsService.listAllPlatformEvents({ category: 'Wedding' });
      expect(weddingsOnly.length).toBeGreaterThan(0);
      expect(weddingsOnly.every(e => e.category === 'Wedding')).toBe(true);

      const rajkotEvents = platformEventsService.listAllPlatformEvents({ city: 'Rajkot' });
      expect(rajkotEvents.length).toBe(24);
    });

    it('provides full read-only inspection payload including sub-events and assigned suppliers', () => {
      const events = platformEventsService.listAllPlatformEvents();
      const targetEvent = events.find(e => e.studioId === 'studio_royal_frames_001')!;

      const inspection = platformEventsService.getEventInspection(targetEvent.studioId, targetEvent.id);
      expect(inspection).toBeDefined();
      expect(inspection?.event.name).toBe(targetEvent.name);
      expect(inspection?.subEvents.length).toBeGreaterThan(0);
      expect(inspection?.studio.id).toBe(targetEvent.studioId);
    });
  });

  // =========================================================================
  // 4. EXTERNAL SUPPLIERS & COLLABORATION MANAGEMENT (17 CATEGORIES)
  // =========================================================================
  describe('4. External Suppliers Management & Owner-Only Financial Privacy', () => {
    it('verifies all 17 specialized supplier categories are supported with labels', () => {
      const expectedCategories: SupplierCategory[] = [
        'drone_pilots',
        'traditional_videographers',
        'cinematic_videographers',
        'traditional_photographers',
        'candid_photographers',
        'crane_jib_operators',
        'led_wall_live_screening',
        'sound_audio_engineers',
        'lighting_technicians',
        'album_printers_bookbinders',
        'frame_manufacturers',
        'video_editors_external',
        'photo_retouchers_external',
        'makeup_artists_stylists',
        'event_decorators_prop_providers',
        'transport_vehicle_rentals',
        'equipment_rental_houses'
      ];

      expect(expectedCategories.length).toBe(17);
      expectedCategories.forEach(cat => {
        expect(SUPPLIER_CATEGORY_LABELS[cat]).toBeDefined();
        expect(SUPPLIER_CATEGORY_LABELS[cat].length).toBeGreaterThan(3);
      });
    });

    it('allows Studio Owner to create, list, and manage suppliers and team members', () => {
      const studioId = 'studio_royal_frames_001';
      const supplier = supplierService.createSupplier(studioId, {
        businessName: 'Gujarat Crane & Jib Masters',
        contactPerson: 'Manish Dholakia',
        category: 'crane_jib_operators',
        phone: '+91 98259 44332',
        city: 'Ahmedabad',
        baseDayRate: 14000,
        rating: 4.9,
        isActive: true,
        hasPortalAccess: true
      });

      expect(supplier.id).toBeDefined();
      expect(supplier.businessName).toBe('Gujarat Crane & Jib Masters');

      // Add roster technician
      const member = supplierService.addSupplierMember(studioId, {
        supplierId: supplier.id,
        name: 'Karan Jib Operator',
        phone: '+91 98259 44333',
        roleTitle: 'Crane Specialist',
        isAvailable: true
      });
      expect(member.name).toBe('Karan Jib Operator');

      const members = supplierService.listSupplierMembers(studioId, supplier.id);
      expect(members.length).toBe(1);
    });

    it('shields agreed supplier fees from ordinary team members (Owner/Accountant only)', () => {
      const studioId = 'studio_royal_frames_001';
      
      // Studio Owner sees real fees
      const ownerAssignments = supplierService.getAssignmentsForUser(studioId, 'owner');
      expect(ownerAssignments.length).toBeGreaterThan(0);
      expect(ownerAssignments[0].agreedFee).toBeGreaterThan(0);

      // Ordinary Photographer sees 0 agreedFee
      const crewAssignments = supplierService.getAssignmentsForUser(studioId, 'lead_photographer');
      expect(crewAssignments.length).toBeGreaterThan(0);
      expect(crewAssignments[0].agreedFee).toBe(0);
      expect(crewAssignments[0].paidAmount).toBe(0);
    });

    it('provides restricted portal view for suppliers without customer personal details', () => {
      const studioId = 'studio_royal_frames_001';
      const suppliers = supplierService.listSuppliers(studioId);
      const targetSupplier = suppliers[0];

      const portalView = supplierService.getSupplierPortalView(studioId, targetSupplier.id);
      expect(portalView.supplier.businessName).toBe(targetSupplier.businessName);
      expect(portalView.assignedJobs.length).toBeGreaterThan(0);

      // Verify NO personal customer phones or customer addresses are leaked to supplier
      portalView.assignedJobs.forEach(job => {
        expect((job as any).customerPhone).toBeUndefined();
        expect((job as any).customerAddress).toBeUndefined();
        expect(job.venue).toBeDefined();
        expect(job.callTime).toBeDefined();
      });
    });
  });

  // =========================================================================
  // 5. STUDIO-TO-STUDIO CREW COLLABORATION
  // =========================================================================
  describe('5. Studio-to-Studio Crew Collaboration Workflow', () => {
    it('manages request lifecycle: draft -> sent -> accepted with crew assignments', () => {
      const req = studioCollaborationService.createRequest({
        requestingStudioId: 'studio_royal_frames_001',
        requestingStudioName: 'Royal Frames Photography',
        targetStudioId: 'studio_moments_002',
        targetStudioName: 'Moments Studio',
        eventId: 'ev_studio_royal_frames_001_001',
        eventTitle: 'Ahmedabad Grand Royal Wedding',
        eventDate: '2026-11-20',
        subEventTitle: 'Sangeet Night',
        requiredRoles: ['Candid Photographer'],
        assignedMemberIds: [],
        assignedMemberNames: [],
        agreedRate: 15000,
        requestMessage: 'Need an extra high-energy candid shooter for a massive sangeet.'
      });

      expect(req.status).toBe('sent');

      // Target studio receives incoming request
      const incoming = studioCollaborationService.listIncomingRequests('studio_moments_002');
      expect(incoming.some(r => r.id === req.id)).toBe(true);

      // Target studio accepts and assigns employee
      const targetEmployees = TenantStore.get<Employee>('studio_moments_002', 'employees') || [];
      const assignedEmpId = targetEmployees[1]?.id || 'emp_moments_1';

      const accepted = studioCollaborationService.acceptRequest(req.id, [assignedEmpId], 'Crew member assigned');
      expect(accepted.status).toBe('accepted');
      expect(accepted.assignedMemberIds).toContain(assignedEmpId);

      // Requesting studio sees shared crew in event roster
      const sharedCrew = studioCollaborationService.getCollaboratedCrewForEvent('studio_royal_frames_001', 'ev_studio_royal_frames_001_001');
      expect(sharedCrew.length).toBe(1);
      expect(sharedCrew[0].sourceStudioName).toBe('Moments Studio');
    });

    it('supports declining and cancelling collaboration requests cleanly', () => {
      const req = studioCollaborationService.createRequest({
        requestingStudioId: 'studio_royal_frames_001',
        requestingStudioName: 'Royal Frames Photography',
        targetStudioId: 'studio_pixelcraft_003',
        targetStudioName: 'PixelCraft Photography',
        eventId: 'ev_studio_royal_frames_001_002',
        eventTitle: 'Fashion Gala',
        eventDate: '2026-11-22',
        requiredRoles: ['Drone Pilot'],
        assignedMemberIds: [],
        assignedMemberNames: [],
        agreedRate: 12000
      });

      const declined = studioCollaborationService.declineRequest(req.id, 'All drone pilots booked on this date');
      expect(declined.status).toBe('declined');
      expect(declined.responseNotes).toContain('booked');
    });
  });

  // =========================================================================
  // 6. EMPLOYEE PROVISIONED LOGIN SYSTEM
  // =========================================================================
  describe('6. Employee Account Provisioning & First-Login Workflow', () => {
    it('verifies every employee has provisioned credentials with mustChangePassword flag', () => {
      const loginRes = employeeAuthService.verifyLogin('pooja_ahm', 'StudioOS@2026');
      expect(loginRes.success).toBe(true);
      expect(loginRes.mustChangePassword).toBe(true);
      expect(loginRes.credentials?.username).toBe('pooja_ahm');
    });

    it('allows employee to change initial password and updates flags', () => {
      const loginRes = employeeAuthService.verifyLogin('pooja_ahm', 'StudioOS@2026');
      const empId = loginRes.credentials!.employeeId;

      // Change password
      const changeRes = employeeAuthService.changeInitialPassword(empId, 'StudioOS@2026', 'MyNewSecret#2026');
      expect(changeRes.success).toBe(true);

      // Subsequent login with old password should fail
      const oldLogin = employeeAuthService.verifyLogin('pooja_ahm', 'StudioOS@2026');
      expect(oldLogin.success).toBe(false);

      // Login with new password succeeds and mustChangePassword is false
      const newLogin = employeeAuthService.verifyLogin('pooja_ahm', 'MyNewSecret#2026');
      expect(newLogin.success).toBe(true);
      expect(newLogin.mustChangePassword).toBe(false);
    });
  });

  // =========================================================================
  // 7. CUSTOMER NAME & FINANCIAL PRIVACY PROTECTION
  // =========================================================================
  describe('7. Customer Name & Financial Privacy Projection', () => {
    it('masks customer names as "Client #001" and scrubs phone/email/address for crew members', () => {
      const studioId = 'studio_royal_frames_001';
      const customers = TenantStore.get<Customer>(studioId, 'customers') || [];
      const realCustomer = customers[0];

      // Studio Owner sees real customer name and contact details
      const ownerView = privacyProtectionService.filterCustomerForUser(studioId, realCustomer, 'owner');
      expect(ownerView.name).toBe(realCustomer.name);
      expect(ownerView.phone).toBe(realCustomer.phone);

      // Photographer sees Client #... and masked contact details
      const crewView = privacyProtectionService.filterCustomerForUser(studioId, realCustomer, 'lead_photographer');
      expect(crewView.name).toMatch(/Client #\d+/);
      expect(crewView.phone).toContain('••••');
      expect(crewView.email).toContain('••••');
      expect(crewView.address).toContain('Protected');
    });

    it('sanitizes event budgets and revenues for non-owners', () => {
      const studioId = 'studio_royal_frames_001';
      const events = TenantStore.get<StudioEvent>(studioId, 'events') || [];
      const realEvent = events[0];

      const crewEvent = privacyProtectionService.filterEventForUser(studioId, realEvent, 'editor');
      expect((crewEvent as any).budget).toBe(0);
      expect((crewEvent as any).totalAmount).toBe(0);
      expect(crewEvent.customerName).toMatch(/Client #\d+/);
    });

    it('authorizationEngine.filterRecord enforces privacy projection on customers and events', () => {
      const studioId = 'studio_royal_frames_001';
      const employees = TenantStore.get<Employee>(studioId, 'employees') || [];
      const photoEditor = employees.find((e: any) => e.roleId === 'editor')!;

      const rawCustomer = { id: 'cust_101', name: 'Dr. Hardik Shah', phone: '+91 98250 11223', address: 'Bodakdev' };
      const filtered = authorizationEngine.filterRecord(studioId, photoEditor.id, 'customers' as any, rawCustomer);

      expect(filtered.name).toMatch(/Client #\d+/);
      expect((filtered as any).address).toBeUndefined();
    });
  });

  // =========================================================================
  // 8. TEAM SUMMARY WHATSAPP CLICK-TO-CHAT
  // =========================================================================
  describe('8. Team Summary WhatsApp Click-to-Chat Engine', () => {
    it('generates privacy-scrubbed daily shoot summary for crew with sub-events and venues', () => {
      const studioId = 'studio_royal_frames_001';
      const subEvents = TenantStore.get<SubEvent>(studioId, 'sub_events') || [];
      expect(subEvents.length).toBeGreaterThan(0);
      const testDate = subEvents[0].date;

      const summary = teamWhatsAppService.generateDailyCrewSummary(studioId, testDate);
      expect(summary).toContain('DAILY CREW & SHOOT SCHEDULE');
      expect(summary).toContain('Client #');
      // Must NOT leak raw customer phone number
      expect(summary).not.toContain('+91 98250 88101');
    });

    it('generates specific event call sheet and creates valid wa.me link', () => {
      const studioId = 'studio_royal_frames_001';
      const events = TenantStore.get<StudioEvent>(studioId, 'events') || [];
      const eventId = events[0].id;

      const callSheet = teamWhatsAppService.generateEventCrewSummary(studioId, eventId);
      expect(callSheet).toContain('SHOOT CALL SHEET & CREW BRIEF');
      expect(callSheet).toContain('Main Venue:');

      const waLink = teamWhatsAppService.createWhatsAppShareLink('+91 98250 12345', callSheet);
      expect(waLink).toContain('https://wa.me/919825012345?text=');
      expect(waLink).toContain(encodeURIComponent('SHOOT CALL SHEET'));
    });
  });

  // =========================================================================
  // 9. FIVE-TIER FEATURE VISIBILITY HIERARCHY
  // =========================================================================
  describe('9. Five-Tier Feature Visibility & Platform Override Engine', () => {
    const studioId = 'studio_royal_frames_001';

    it('Tier 1: Global Platform Killswitch disables feature platform-wide', () => {
      platformFeatureService.toggleGlobalFeature('payroll', false, 'Super Admin');

      const res = featureVisibilityService.evaluateFeature(studioId, 'payroll', true);
      expect(res.accessible).toBe(false);
      expect(res.sourceOfRule).toBe('platform_global_disable');

      // Restore
      platformFeatureService.toggleGlobalFeature('payroll', true, 'Super Admin');
    });

    it('Tier 2: Studio-specific Platform Override disables feature even if plan includes it', () => {
      featureVisibilityService.setStudioPlatformOverride(studioId, 'analytics', false, 'Super Admin');

      const res = featureVisibilityService.evaluateFeature(studioId, 'analytics', true);
      expect(res.accessible).toBe(false);
      expect(res.sourceOfRule).toBe('platform_studio_override');

      // Clear override
      featureVisibilityService.setStudioPlatformOverride(studioId, 'analytics', null, 'Super Admin');
    });

    it('Tier 4: Studio Owner Module Visibility hides feature from navigation without deleting data', () => {
      // Owner hides 'leave' module
      featureVisibilityService.toggleModuleVisibility(studioId, 'leave', true);

      const navEvaluation = featureVisibilityService.evaluateFeature(studioId, 'leave', false);
      expect(navEvaluation.visibleInNav).toBe(false);
      expect(navEvaluation.sourceOfRule).toBe('studio_owner_hidden');

      // Records still exist intact in database
      const settings = featureVisibilityService.getStudioSettings(studioId);
      expect(settings.hiddenModules).toContain('leave');

      // Owner unhides
      featureVisibilityService.toggleModuleVisibility(studioId, 'leave', false);
      const restoredEvaluation = featureVisibilityService.evaluateFeature(studioId, 'leave', false);
      expect(restoredEvaluation.visibleInNav).toBe(true);
    });
  });
});
