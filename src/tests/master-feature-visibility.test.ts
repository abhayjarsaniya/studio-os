import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  resolveEffectiveFeatureMap,
  getDependentFeatures,
  liveFeatureService
} from '../services/liveFeatureService';
import { featureVisibilityService } from '../services/featureVisibilityService';
import fs from 'node:fs';
import path from 'node:path';

describe('Master Admin Feature Visibility — Global, Studio Isolation & Dependencies', () => {
  afterEach(() => {
    liveFeatureService.clearCachedState();
  });

  it('global OFF overrides studio ON for all studios', () => {
    const resolved = resolveEffectiveFeatureMap({
      globalSettings: { finance_billing: false },
      studioOverrides: { finance_billing: true }
    });

    expect(resolved.finance_billing.enabled).toBe(false);
    expect(resolved.finance_billing.reason).toBe('global_off');
  });

  it('isolates Studio A and Studio B configurations independently', () => {
    const studioA = resolveEffectiveFeatureMap({
      globalSettings: { finance_billing: true, whatsapp_chat: true },
      studioOverrides: { finance_billing: false }
    });

    const studioB = resolveEffectiveFeatureMap({
      globalSettings: { finance_billing: true, whatsapp_chat: true },
      studioOverrides: { finance_billing: true }
    });

    expect(studioA.finance_billing.enabled).toBe(false);
    expect(studioB.finance_billing.enabled).toBe(true);
  });

  it('enforces feature dependencies (disabling customer_crm disables whatsapp_chat; disabling tasks_production disables advanced_delivery)', () => {
    const crmDependents = getDependentFeatures('customer_crm').map((f) => f.id);
    expect(crmDependents).toContain('whatsapp_chat');

    const resolved = resolveEffectiveFeatureMap({
      globalSettings: { customer_crm: true, whatsapp_chat: true, tasks_production: false, advanced_delivery: true },
      studioOverrides: { customer_crm: false, whatsapp_chat: true }
    });

    expect(resolved.customer_crm.enabled).toBe(false);
    expect(resolved.whatsapp_chat.enabled).toBe(false);
    expect(resolved.whatsapp_chat.reason).toBe('dependency_off');
    expect(resolved.advanced_delivery.enabled).toBe(false);
    expect(resolved.advanced_delivery.reason).toBe('dependency_off');
  });

  it('liveFeatureService syncs into featureVisibilityService.evaluateFeature immediately', () => {
    liveFeatureService.setCachedState(
      'studio_A',
      { whatsapp_chat: true, finance_billing: true },
      { whatsapp_chat: false }
    );

    expect(liveFeatureService.isFeatureEnabledLive('studio_A', 'whatsapp_chat')).toBe(false);
    expect(liveFeatureService.isFeatureEnabledLive('studio_A', 'finance_billing')).toBe(true);

    const evalWhatsApp = featureVisibilityService.evaluateFeature('studio_A', 'whatsapp_chat', true);
    expect(evalWhatsApp.accessible).toBe(false);
    expect(evalWhatsApp.visibleInNav).toBe(false);
  });
});

describe('Server-Side Feature Enforcement (/api/features/enforce)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('rejects requests with 403 when feature is disabled for studio', async () => {
    const mockDb = {
      collection: vi.fn((colName: string) => {
        if (colName === 'platformFeatureSettings') {
          return {
            doc: () => ({ get: vi.fn().mockResolvedValue({ exists: true, data: () => ({ isGlobalEnabled: true }) }) })
          };
        }
        return {
          doc: () => ({
            collection: () => ({
              doc: () => ({ get: vi.fn().mockResolvedValue({ exists: true, data: () => ({ enabled: false }) }) })
            })
          })
        };
      })
    };

    vi.doMock('../../server/lib/razorpayServer', () => ({
      verifyFirebaseCaller: vi.fn().mockResolvedValue({
        uid: 'owner_A',
        email: 'ownerA@studio-os.internal',
        isMasterAdmin: false,
        studioId: 'studio_A'
      }),
      getFirebaseAdmin: vi.fn().mockReturnValue({ db: mockDb })
    }));

    const { default: enforceHandler } = await import('../../server/routes/features/enforce');
    const res: any = {
      headers: {},
      statusCode: 200,
      body: null,
      setHeader(k: string, v: string) { this.headers[k] = v; },
      status(code: number) { this.statusCode = code; return this; },
      json(data: any) { this.body = data; return this; }
    };

    await enforceHandler(
      { method: 'POST', body: { studioId: 'studio_A', featureId: 'whatsapp_chat' } },
      res
    );

    expect(res.statusCode).toBe(403);
    expect(res.body.allowed).toBe(false);
  });
});

describe('MasterFeaturesPage — 5-Tier Cascade Removal & Mobile Responsive UI', () => {
  it('removes 5-TIER RESOLUTION CASCADE completely and includes mobile + desktop views', () => {
    const content = fs.readFileSync(
      path.resolve(process.cwd(), 'src/pages/master/MasterFeaturesPage.tsx'),
      'utf8'
    );
    expect(content).not.toContain('5-TIER RESOLUTION CASCADE');
    expect(content).not.toContain('5-Tier Resolution Cascade');
    expect(content).not.toContain('Tier 1');
    expect(content).not.toContain('Tier 5');
    expect(content).toContain('Feature Management & Multi-Studio Matrix');
    expect(content).toContain('Global Features Catalog');
    expect(content).toContain('Studio Matrix & Control');
    expect(content).toContain('md:hidden');
    expect(content).toContain('hidden md:block');
    expect(content).not.toMatch(/text-\[1[01]px\]/);
  });
});
