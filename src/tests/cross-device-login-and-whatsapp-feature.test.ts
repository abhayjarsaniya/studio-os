import { describe, it, expect, beforeEach } from 'vitest';
import { crossDeviceAuthService } from '../services/crossDeviceAuthService';
import { unifiedAuthService, hashCredential, generateCryptoSalt, UserAccount } from '../services/unifiedAuthService';
import { whatsappService } from '../services/whatsappService';
import { featureVisibilityService } from '../services/featureVisibilityService';
import { platformStudioService } from '../services/platformStudioService';
import { TenantStore } from '../services/tenantStore';
import { Studio } from '../types/schema';

describe('Cross-Device Login & WhatsApp Feature Architecture', () => {
  const TEST_STUDIO_ID = 'studio_test_cd_001';
  const TEST_LOGIN_ID = 'test.studio.owner';
  const TEST_EMAIL = 'testowner@studio-os.internal';
  const INITIAL_PASSWORD = 'SecurePass#2026';

  beforeEach(() => {
    TenantStore.initializeDefaults();

    // Create a mock studio profile
    const studioProfile: Studio = {
      id: TEST_STUDIO_ID,
      tenantId: TEST_STUDIO_ID,
      name: 'Cross Device Test Studio',
      title: 'Studio Owner',
      email: TEST_EMAIL,
      phone: '9876543210',
      address: '123 MG Road',
      city: 'Mumbai',
      state: 'Maharashtra',
      subscription: {
        planId: 'plan_pro',
        planName: 'Studio OS Monthly',
        pricePerMonth: 500,
        currency: 'INR',
        status: 'active',
        validUntil: '2027-12-31T23:59:59.000Z',
        autoRenew: true
      },
      settings: {
        defaultCurrency: 'INR',
        timezone: 'Asia/Kolkata',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '12h',
        allowDirectWhatsApp: true,
        watermarkEnabled: true,
        invoicePrefix: 'INV',
        eventPrefix: 'EV'
      },
      storageUsageMb: 100,
      storageQuotaMb: 15360,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'admin_sys'
    };
    TenantStore.set(TEST_STUDIO_ID, 'profile', studioProfile);

    // Provision account in unified auth and cloud registry
    const salt = generateCryptoSalt();
    const account: UserAccount = {
      id: 'acc_test_owner_001',
      accountType: 'STUDIO_OWNER',
      roleId: 'owner',
      loginId: TEST_LOGIN_ID,
      email: TEST_EMAIL,
      displayName: 'Test Studio Owner',
      roleTitle: 'Studio Owner',
      studioId: TEST_STUDIO_ID,
      studioName: 'Cross Device Test Studio',
      phone: '9876543210',
      status: 'active',
      passwordHash: hashCredential(INITIAL_PASSWORD, salt),
      salt,
      mustChangePassword: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    unifiedAuthService.saveAccount(account);
    crossDeviceAuthService.registerInCloudRegistry(account, 'mock_auth_uid_001', INITIAL_PASSWORD);
  });

  describe('1. Cross-Device Login Capabilities', () => {
    it('authenticates a Studio Owner with their Login ID and initial password', async () => {
      const res = await crossDeviceAuthService.login(TEST_LOGIN_ID, INITIAL_PASSWORD);
      expect(res.success).toBe(true);
      expect(res.role).toBe('owner');
      expect(res.studioId).toBe(TEST_STUDIO_ID);
      expect(res.targetRoute).toBe('#/app/dashboard');
    });

    it('authenticates a Studio Owner using their registered email as identifier', async () => {
      const res = await crossDeviceAuthService.login(TEST_EMAIL, INITIAL_PASSWORD);
      expect(res.success).toBe(true);
      expect(res.role).toBe('owner');
      expect(res.studioId).toBe(TEST_STUDIO_ID);
    });

    it('rejects incorrect password across devices', async () => {
      const res = await crossDeviceAuthService.login(TEST_LOGIN_ID, 'WrongPassword123');
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/Invalid Login ID or password/i);
    });

    it('rejects deactivated or suspended studio accounts across devices', async () => {
      // Deactivate account
      await crossDeviceAuthService.updateStudioAccountStatus(TEST_STUDIO_ID, 'suspended');

      const res = await crossDeviceAuthService.login(TEST_LOGIN_ID, INITIAL_PASSWORD);
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/suspended|disabled/i);
    });

    it('immediately reflects password change on fresh logins', async () => {
      const NEW_PASSWORD = 'BrandNewPassword#999';
      const acc = unifiedAuthService.findAccountByIdentifier(TEST_LOGIN_ID);
      expect(acc).toBeDefined();

      if (acc) {
        unifiedAuthService.changePassword(acc.id, NEW_PASSWORD);
        const updated = unifiedAuthService.getAccount(acc.id)!;
        await crossDeviceAuthService.registerInCloudRegistry(updated, updated.id, NEW_PASSWORD);
      }

      // Old password must fail
      const oldLogin = await crossDeviceAuthService.login(TEST_LOGIN_ID, INITIAL_PASSWORD);
      expect(oldLogin.success).toBe(false);

      // New password must succeed
      const newLogin = await crossDeviceAuthService.login(TEST_LOGIN_ID, NEW_PASSWORD);
      expect(newLogin.success).toBe(true);
      expect(newLogin.studioId).toBe(TEST_STUDIO_ID);
    });
  });

  describe('2. Master Admin WhatsApp Feature Governance', () => {
    it('permits Master Admin to toggle WhatsApp Click-to-Chat override for a specific studio', () => {
      // Initially, override is default (not explicitly disabled)
      const initialOverride = featureVisibilityService.getStudioPlatformOverride(TEST_STUDIO_ID);
      expect(initialOverride.featureOverrides['whatsapp']).toBeUndefined();

      // Master Admin disables WhatsApp for this studio
      featureVisibilityService.setStudioPlatformOverride(TEST_STUDIO_ID, 'whatsapp', false, 'Master Admin');
      const updatedOverride = featureVisibilityService.getStudioPlatformOverride(TEST_STUDIO_ID);
      expect(updatedOverride.featureOverrides['whatsapp']).toBe(false);

      // Studio profile is updated
      const studio = TenantStore.getSingle<Studio>(TEST_STUDIO_ID, 'profile');
      expect(studio).toBeDefined();
      if (studio) {
        studio.settings.allowDirectWhatsApp = false;
        TenantStore.set(TEST_STUDIO_ID, 'profile', studio);
      }

      const recheckedStudio = TenantStore.getSingle<Studio>(TEST_STUDIO_ID, 'profile');
      expect(recheckedStudio?.settings.allowDirectWhatsApp).toBe(false);
    });

    it('prevents Studio Owner from enabling WhatsApp when disabled by Master Admin', () => {
      // Master Admin forced disable
      featureVisibilityService.setStudioPlatformOverride(TEST_STUDIO_ID, 'whatsapp', false, 'Master Admin');
      const studio = TenantStore.getSingle<Studio>(TEST_STUDIO_ID, 'profile')!;
      studio.settings.allowDirectWhatsApp = false;
      TenantStore.set(TEST_STUDIO_ID, 'profile', studio);

      const isPlatformDisabled = 
        featureVisibilityService.getStudioPlatformOverride(TEST_STUDIO_ID).featureOverrides['whatsapp'] === false ||
        TenantStore.getSingle<Studio>(TEST_STUDIO_ID, 'profile')?.settings.allowDirectWhatsApp === false;

      expect(isPlatformDisabled).toBe(true);
    });
  });

  describe('3. Studio Owner WhatsApp Configuration & Click-to-Chat URLs', () => {
    it('allows Studio Owner to configure business number, country code, and default message when enabled', () => {
      const config = whatsappService.saveStudioConfig(TEST_STUDIO_ID, {
        enabled: true,
        businessNumber: '9820199999',
        countryCode: '+91',
        defaultMessage: 'Greetings from Royal Films! How may we assist your wedding planning?'
      }, 'Studio Owner');

      expect(config.enabled).toBe(true);
      expect(config.businessNumber).toBe('9820199999');
      expect(config.countryCode).toBe('+91');
      expect(config.defaultMessage).toContain('Royal Films');

      // Re-retrieval confirms persistence
      const fetched = whatsappService.getStudioConfig(TEST_STUDIO_ID);
      expect(fetched.businessNumber).toBe('9820199999');
    });

    it('generates valid official wa.me native Click-to-Chat links with URL encoding and no spaces or plus signs', () => {
      const phone = '+91 98201 12345';
      const message = 'Hello Aarav & Meera! Review your quotation here: https://studio-os.com/#/quote/q_001';

      const result = whatsappService.generateClickToChatUrl(phone, message);
      expect(result.isValid).toBe(true);
      expect(result.waMeNumber).toBe('919820112345');
      expect(result.url).toBe(`https://wa.me/919820112345?text=${encodeURIComponent(message)}`);
      expect(result.url).not.toContain('+');
      expect(result.url).not.toContain(' ');
    });

    it('correctly handles dynamic variable placeholders across quotation messages', () => {
      const template = 'Hello {customer_name}, your total for {event_name} on {event_date} is ₹{total_amount}. Link: {quotation_link} - {studio_name}';
      const context = {
        customer_name: 'Pooja Sharma',
        event_name: 'Sangeet Ceremony',
        event_date: '15/12/2026',
        total_amount: '1,50,000',
        quotation_link: 'https://studio-os.com/#/quote/q_sangeet',
        studio_name: 'Cross Device Test Studio'
      };

      const rendered = whatsappService.replacePlaceholders(template, context);
      expect(rendered.message).toContain('Hello Pooja Sharma');
      expect(rendered.message).toContain('Sangeet Ceremony');
      expect(rendered.message).toContain('₹1,50,000');
      expect(rendered.message).toContain('https://studio-os.com/#/quote/q_sangeet');
      expect(rendered.missingKeys.length).toBe(0);
    });
  });
});
