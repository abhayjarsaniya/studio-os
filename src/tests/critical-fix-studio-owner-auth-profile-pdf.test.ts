import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { realAccountProvisionService } from '../services/realAccountProvisionService';
import { firebaseAuthService } from '../services/firebaseAuthService';
import { unifiedAuthService } from '../services/unifiedAuthService';
import { platformStudioService } from '../services/platformStudioService';
import { studioService } from '../services/studioService';
import { bookingProductionService } from '../services/bookingProductionService';
import { pdfGeneratorService } from '../services/pdfGeneratorService';
import { TenantStore } from '../services/tenantStore';
import { Studio, Employee } from '../types/schema';

describe('STUDIO OS — Critical Fix: Studio Owner Login, Creation, Profile & PDF Downloads', () => {
  const ROUND1_GMAIL = 'test.round1.owner@gmail.com';
  const ROUND1_STUDIO_NAME = 'Apex Cinematic Studios';
  const ROUND1_PASSWORD = 'ApexSecurePass#2026';

  let round1StudioId = '';
  let round1SetupToken = '';

  // =========================================================================
  // TEST ROUND 1: Studio Creation, Real Auth Provisioning & Studio Owner Login
  // =========================================================================
  describe('Test Round 1: Master Admin Studio Creation, Setup Link & Studio Owner Login', () => {
    it('1.1 verifies Studio Owner login failure NEVER returns "Invalid Master Admin credentials"', async () => {
      // Attempt login with an unprovisioned or incorrect Studio Owner account
      const failedLogin = await firebaseAuthService.login(ROUND1_GMAIL, 'AnyRandomPassword#123');
      expect(failedLogin.success).toBe(false);
      // Critical check: MUST NOT contain "Master Admin" in the error message!
      expect(failedLogin.error).not.toMatch(/Master Admin/i);
      expect(failedLogin.error).toMatch(/Invalid email or password|No account registered|Too many failed login attempts/i);
    });

    it('1.2 Master Admin creates a brand-new studio with Gmail and persists all fields', async () => {
      const res = await realAccountProvisionService.provisionStudioAndOwner({
        name: ROUND1_STUDIO_NAME,
        ownerName: 'Vikramaditya Rathore',
        ownerEmail: ROUND1_GMAIL,
        ownerMobile: '+91 98250 99887',
        address: '404, Signature Tower, SG Highway',
        city: 'Ahmedabad',
        state: 'Gujarat',
        gstNumber: '24AAACR8888D1Z2',
        subscriptionPlan: 'plan_standard_500',
        subscriptionStatus: 'active',
        description: 'Luxury Destination Wedding Cinematography'
      }, 'Master Admin');

      expect(res.success).toBe(true);
      expect(res.studio).toBeDefined();
      expect(res.studio.name).toBe(ROUND1_STUDIO_NAME);
      expect(res.studio.ownerEmail).toBe(ROUND1_GMAIL);
      expect(res.studio.city).toBe('Ahmedabad');
      expect(res.setupLink).toContain('#/setup-password?token=');

      round1StudioId = res.studio.id;
      round1SetupToken = res.setupToken;

      // Verify studio appears immediately in Studios Directory
      const studios = platformStudioService.listStudios();
      const found = studios.find(s => s.id === round1StudioId);
      expect(found).toBeDefined();
      expect(found?.name).toBe(ROUND1_STUDIO_NAME);

      // Verify Firestore / TenantStore profile persistence
      const profile = TenantStore.get(round1StudioId, 'profile') as unknown as Studio;
      expect(profile).toBeDefined();
      expect(profile.name).toBe(ROUND1_STUDIO_NAME);
      expect(profile.phone).toBe('+91 98250 99887');
      expect(profile.address).toBe('404, Signature Tower, SG Highway');
      expect((profile as any).accountStatus).toBe('pending_activation');
    });

    it('1.3 prevents creating duplicate studios when Master Admin retries with same owner Gmail', async () => {
      const initialCount = platformStudioService.listStudios().length;

      // Re-submit the same studio creation payload with same Gmail
      const retryRes = await realAccountProvisionService.provisionStudioAndOwner({
        name: ROUND1_STUDIO_NAME,
        ownerName: 'Vikramaditya Rathore',
        ownerEmail: ROUND1_GMAIL,
        ownerMobile: '+91 98250 99887',
        address: '404, Signature Tower, SG Highway (Updated Floor 5)',
        city: 'Ahmedabad',
        state: 'Gujarat'
      }, 'Master Admin');

      expect(retryRes.success).toBe(true);
      // Must reuse existing studio ID rather than creating an orphaned duplicate
      expect(retryRes.studio.id).toBe(round1StudioId);

      const postCount = platformStudioService.listStudios().length;
      expect(postCount).toBe(initialCount);
    });

    it('1.4 displays "Account is pending activation" if owner tries to log in before setting password', async () => {
      const preActivationLogin = await firebaseAuthService.login(ROUND1_GMAIL, 'AnyPassword#123');
      expect(preActivationLogin.success).toBe(false);
      expect(preActivationLogin.error).toMatch(/pending activation/i);
      expect(preActivationLogin.error).not.toMatch(/Master Admin/i);
    });

    it('1.5 owner opens setup link, enforces password strength, and completes activation', async () => {
      // Weak password rejected (< 8 chars)
      const weakRes = await realAccountProvisionService.completeInitialPasswordSetup(
        round1SetupToken,
        ROUND1_GMAIL,
        'short'
      );
      expect(weakRes.success).toBe(false);

      // Numbers and letters required
      const noNumRes = await realAccountProvisionService.completeInitialPasswordSetup(
        round1SetupToken,
        ROUND1_GMAIL,
        'AllLettersPasswordOnly'
      );
      expect(noNumRes.success).toBe(false);

      // Valid strong password succeeds
      const setupSuccess = await realAccountProvisionService.completeInitialPasswordSetup(
        round1SetupToken,
        ROUND1_GMAIL,
        ROUND1_PASSWORD
      );
      expect(setupSuccess.success).toBe(true);
      expect(setupSuccess.studioId).toBe(round1StudioId);

      // Single-use token protection
      const reuseAttempt = await realAccountProvisionService.completeInitialPasswordSetup(
        round1SetupToken,
        ROUND1_GMAIL,
        ROUND1_PASSWORD
      );
      expect(reuseAttempt.success).toBe(false);
    });

    it('1.6 Studio Owner logs in with Gmail address and password, opening Studio Dashboard', async () => {
      const loginRes = await firebaseAuthService.login(ROUND1_GMAIL, ROUND1_PASSWORD);
      expect(loginRes.success).toBe(true);
      expect(loginRes.session).toBeDefined();
      expect(loginRes.session?.account.accountType).toBe('STUDIO_OWNER');
      expect(loginRes.session?.account.studioId).toBe(round1StudioId);
      expect(loginRes.session?.account.mustChangePassword).toBe(false);

      // Wrong password fails with accurate message (never Master Admin error)
      const wrongPassLogin = await firebaseAuthService.login(ROUND1_GMAIL, 'WrongPass123!');
      expect(wrongPassLogin.success).toBe(false);
      expect(wrongPassLogin.error).toMatch(/Invalid email or password/i);
      expect(wrongPassLogin.error).not.toMatch(/Master Admin/i);
    });
  });

  // =========================================================================
  // TEST ROUND 2: Profile Editing, Bookings, Quotation PDF & Employee Flow
  // =========================================================================
  describe('Test Round 2: Edit Profile, Quotation PDF, Employee Provisioning & Isolation', () => {
    it('2.1 Studio Owner edits profile and changes persist without affecting login email', async () => {
      const updatedStudio = studioService.updateStudio(round1StudioId, {
        name: 'Apex Luxury Wedding Films & Cinematography',
        tagline: 'Crafting Royal Cinematic Memories Across India',
        phone: '+91 98250 99999',
        address: 'Penthouse Suite, Signature Tower, Bodakdev',
        city: 'Ahmedabad',
        gstNumber: '24AAACR9999D1Z9',
        website: 'https://apexweddingfilms.in',
        socialLinks: {
          instagram: '@apexfilms.official',
          facebook: 'apexfilms.official',
          youtube: 'ApexCinematics'
        }
      });

      expect(updatedStudio.name).toBe('Apex Luxury Wedding Films & Cinematography');
      expect(updatedStudio.website).toBe('https://apexweddingfilms.in');
      expect(updatedStudio.phone).toBe('+91 98250 99999');

      // Verify persisted in TenantStore
      const profile = TenantStore.get(round1StudioId, 'profile') as unknown as Studio;
      expect(profile.name).toBe('Apex Luxury Wedding Films & Cinematography');
      expect(profile.website).toBe('https://apexweddingfilms.in');
      // Registered login email remains strictly locked to original owner Gmail
      expect(profile.ownerEmail).toBe(ROUND1_GMAIL);
    });

    it('2.2 Studio Owner creates a booking and booking persists under isolated studio', async () => {
      const booking = await bookingProductionService.createBooking(round1StudioId, {
        eventName: 'Mehta & Shah Royal Wedding 2027',
        customerName: 'Kavita Mehta',
        customerPhone: '+91 98795 11223',
        customerEmail: 'kavita.mehta@example.com',
        venue: 'The Leela Palace, Udaipur',
        city: 'Udaipur',
        category: 'Destination Wedding',
        mainEventDate: '2027-02-14',
        startDate: '2027-02-13',
        endDate: '2027-02-15',
        agreedAmount: 350000,
        quotedAmount: 400000,
        advancePayment: 100000,
        paymentStatus: 'partially_paid',
        paymentMethod: 'Bank Transfer'
      });

      expect(booking).toBeDefined();
      expect(booking.studioId).toBe(round1StudioId);
      expect(booking.eventName).toBe('Mehta & Shah Royal Wedding 2027');
      expect(booking.financials.finalAgreedAmount).toBe(350000);

      // Verify booking appears in studio booking list
      const bookings = bookingProductionService.listBookings(round1StudioId);
      expect(bookings.length).toBeGreaterThan(0);
      expect(bookings.some(b => b.id === booking.id)).toBe(true);
    });

    it('2.3 generates genuine binary PDF for Quotation with Indian currency formatting', () => {
      const quotationPayload = {
        documentType: 'quotation' as const,
        title: 'Quotation / Proposal',
        documentNumber: 'QT-2027-0042',
        date: '2027-01-10',
        dueDate: '2027-01-25',
        studioSettings: {
          legalName: 'Apex Luxury Wedding Films & Cinematography',
          businessAddress: 'Penthouse Suite, Signature Tower, Bodakdev, Ahmedabad',
          supportPhone: '+91 98250 99999',
          supportEmail: 'contact@apexweddingfilms.in',
          gstin: '24AAACR9999D1Z9'
        },
        customer: {
          name: 'Kavita Mehta',
          phone: '+91 98795 11223',
          email: 'kavita.mehta@example.com',
          address: 'Bungalow 12, Gulmohar Park, Ahmedabad'
        },
        event: {
          name: 'Mehta & Shah Royal Destination Wedding',
          category: 'Destination Wedding',
          date: '2027-02-14',
          venue: 'The Leela Palace, Udaipur'
        },
        items: [
          {
            name: 'Candid & Traditional Photography',
            description: '3 Senior Candid & Traditional Photographers for 3 days',
            quantity: 1,
            unitPrice: 150000,
            amount: 150000
          },
          {
            name: '4K Cinematic Wedding Film & Teaser',
            description: 'Drone pilot, gimbal specialist and 2 cinematographers',
            quantity: 1,
            unitPrice: 200000,
            amount: 200000
          },
          {
            name: 'Hardbound Coffee Table Photobooks',
            description: '2 Deluxe 40-page Velvet finish albums',
            quantity: 2,
            unitPrice: 25000,
            amount: 50000
          }
        ],
        financials: {
          subtotal: 400000,
          discountAmount: 50000,
          totalAmount: 350000
        },
        terms: '1. 25% Advance payment required to block dates.\n2. Balance payable on delivery.'
      };

      // 1. Generate jsPDF instance
      const doc = pdfGeneratorService.generateDocumentPDF(quotationPayload);
      expect(doc).toBeDefined();

      // 2. Verify binary PDF output
      const rawPdf = doc.output();
      expect(rawPdf).toBeDefined();
      expect(rawPdf.length).toBeGreaterThan(1000);
      // Valid PDF standard specification header
      expect(rawPdf.startsWith('%PDF-')).toBe(true);

      // 3. Verify contents are present in PDF stream
      expect(rawPdf).toContain('Apex Luxury Wedding Films');
      expect(rawPdf).toContain('QT-2027-0042');
      expect(rawPdf).toContain('Kavita Mehta');
      expect(rawPdf).toContain('Rs. 3,50,000');
    });

    it('2.4 Studio Owner provisions an employee account with real setup link', async () => {
      const empEmail = 'dhruv.editor@apexfilms.in';
      const empRes = await realAccountProvisionService.provisionEmployeeAccount(
        round1StudioId,
        {
          fullName: 'Dhruv Sharma',
          email: empEmail,
          mobile: '+91 98250 11999',
          roleId: 'editor',
          roleName: 'Senior Video Editor'
        },
        'Studio Owner'
      );

      expect(empRes.success).toBe(true);
      expect(empRes.setupLink).toContain('#/setup-password?token=');

      // Employee sets password via setup link
      const empSetupRes = await realAccountProvisionService.completeInitialPasswordSetup(
        empRes.setupToken,
        empEmail,
        'DhruvEditor#2026'
      );
      expect(empSetupRes.success).toBe(true);

      // Employee logs in successfully
      const empLogin = await firebaseAuthService.login(empEmail, 'DhruvEditor#2026');
      expect(empLogin.success).toBe(true);
      expect(empLogin.session?.account.accountType).toBe('EMPLOYEE');
      expect(empLogin.session?.account.studioId).toBe(round1StudioId);
    });

    it('2.5 verifies strict role security: Employee and Studio Owner cannot access Master Admin', async () => {
      // Employee cannot log in as MASTER_ADMIN
      const empAsMaster = await firebaseAuthService.login('dhruv.editor@apexfilms.in', 'DhruvEditor#2026', 'MASTER_ADMIN');
      expect(empAsMaster.success).toBe(false);

      // Studio Owner cannot log in as MASTER_ADMIN
      const ownerAsMaster = await firebaseAuthService.login(ROUND1_GMAIL, ROUND1_PASSWORD, 'MASTER_ADMIN');
      expect(ownerAsMaster.success).toBe(false);
    });

    it('2.6 verifies complete data isolation between separate studios', async () => {
      // Create a second studio
      const studio2Res = await realAccountProvisionService.provisionStudioAndOwner({
        name: 'Heritage Frames Jaipur',
        ownerName: 'Manish Varma',
        ownerEmail: 'manish.varma.test2026@gmail.com',
        ownerMobile: '+91 98290 55443',
        address: 'Civil Lines',
        city: 'Jaipur',
        state: 'Rajasthan'
      }, 'Master Admin');

      const studio2Id = studio2Res.studio.id;
      expect(studio2Id).not.toBe(round1StudioId);

      // Studio 1 bookings must not appear in Studio 2
      const studio2Bookings = bookingProductionService.listBookings(studio2Id);
      expect(studio2Bookings.length).toBe(0);

      // Studio 1 bookings must remain intact
      const studio1Bookings = bookingProductionService.listBookings(round1StudioId);
      expect(studio1Bookings.length).toBe(1);
      expect(studio1Bookings[0].eventName).toBe('Mehta & Shah Royal Wedding 2027');
    });
  });
});
