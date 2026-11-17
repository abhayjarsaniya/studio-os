import { Studio, StudioSchema, StudioSettings } from '../types/schema';
import { TenantStore } from './tenantStore';
import { studioA, studioB } from '../data/multiTenantDemoData';

export const shreejiStudio: Studio = {
  id: 'studio_shreeji_films',
  tenantId: 'studio_shreeji_films',
  name: 'SHREEJI FILMS AND PHOTOGRAPHY',
  title: 'Aarav Patel',
  tagline: 'Luxury Wedding, Cinematic Films & Creative Photography',
  logoUrl: '/shreeji-logo.svg',
  phone: '+91 98250 11223',
  email: 'contact@shreejifilms.in',
  address: '301, Titanium One, SG Highway, Bodakdev',
  city: 'Ahmedabad',
  state: 'Gujarat',
  pincode: '380054',
  gstNumber: '24AAACR1122D1Z4',
  subscription: {
    planId: 'studio_os_monthly',
    planName: 'Studio OS Monthly',
    pricePerMonth: 500,
    currency: 'INR',
    status: 'active',
    validUntil: '2027-12-31',
    autoRenew: true
  },
  settings: {
    defaultCurrency: 'INR',
    timezone: 'Asia/Kolkata',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12h',
    allowDirectWhatsApp: true,
    watermarkEnabled: false,
    invoicePrefix: 'SHR-INV',
    eventPrefix: 'SHR-EV'
  },
  storageUsageMb: 1250,
  storageQuotaMb: 15360,
  createdAt: '2026-01-01T10:00:00Z',
  updatedAt: new Date().toISOString(),
  createdBy: 'usr_owner_royal'
};

export const studioService = {
  listStudios(): Studio[] {
    const list: Studio[] = [];
    const shreeji = TenantStore.getSingle<Studio>('studio_shreeji_films', 'profile') || 
                    TenantStore.getSingle<Studio>('std_demo_royal', 'profile') || 
                    shreejiStudio;
    if (shreeji) list.push(shreeji);

    try {
      const meta = TenantStore.getSingle<Record<string, any>>('platform_system', 'platform_studios_meta') || {};
      for (const sId of Object.keys(meta)) {
        if (sId !== 'studio_shreeji_films' && sId !== 'std_demo_royal') {
          const profile = TenantStore.getSingle<Studio>(sId, 'profile');
          if (profile && !list.some(s => s.id === sId)) {
            list.push(profile);
          }
        }
      }
    } catch {
      // safe fallback
    }

    return list;
  },

  getStudio(studioId: string): Studio {
    if (!studioId) throw new Error('[studioService.getStudio]: studioId is required');
    const canonicalId = (studioId === 'std_demo_royal' || studioId === 'studio_shreeji_films') ? 'studio_shreeji_films' : studioId;
    const studio = TenantStore.getSingle<Studio>(canonicalId, 'profile') || TenantStore.getSingle<Studio>(studioId, 'profile');
    if (!studio) {
      if (studioId === studioA.id) return studioA as unknown as Studio;
      if (studioId === studioB.id) return studioB as unknown as Studio;
      if (canonicalId === 'studio_shreeji_films' || studioId === 'std_demo_royal') {
        return {
          ...shreejiStudio,
          id: canonicalId
        };
      }
      return shreejiStudio;
    }
    return studio;
  },

  createStudio(data: Omit<Studio, 'id' | 'createdAt' | 'updatedAt'>): Studio {
    const id = `studio_${Date.now()}`;
    const newStudio: Studio = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    StudioSchema.parse(newStudio);
    TenantStore.set(id, 'profile', newStudio);
    return newStudio;
  },

  updateStudio(studioId: string, updates: Partial<Studio>): Studio {
    if (!studioId) throw new Error('[studioService.updateStudio]: studioId is required');
    const existing = this.getStudio(studioId);
    const updated: Studio = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    StudioSchema.parse(updated);
    TenantStore.set(studioId, 'profile', updated);
    return updated;
  },

  getStudioSettings(studioId: string): StudioSettings {
    const studio = this.getStudio(studioId);
    return studio.settings;
  }
};
