import { TenantStore } from './tenantStore';
import { auditService } from './auditService';

export interface StudioServiceItem {
  id: string;
  studioId: string;
  name: string;
  category: string;
  description?: string;
  defaultPrice: number;
  unit?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export const DEFAULT_STUDIO_SERVICES: Array<Omit<StudioServiceItem, 'id' | 'studioId' | 'createdAt'>> = [
  {
    name: 'Wedding Photography',
    category: 'Wedding',
    description: 'Senior candid and traditional high-resolution wedding photography.',
    defaultPrice: 40000,
    unit: 'Full Day',
    isActive: true
  },
  {
    name: 'Wedding Cinematography',
    category: 'Wedding',
    description: 'Comprehensive 4K cinematic wedding film with multi-camera setup.',
    defaultPrice: 50000,
    unit: 'Full Day',
    isActive: true
  },
  {
    name: 'Pre-Wedding Shoot',
    category: 'Pre-Wedding',
    description: 'Outdoor destination romantic couple portraiture and teaser video.',
    defaultPrice: 35000,
    unit: 'Session',
    isActive: true
  },
  {
    name: 'Engagement Photography',
    category: 'Ceremony',
    description: 'Candid and ritual photography for ring and sagai celebrations.',
    defaultPrice: 25000,
    unit: 'Event',
    isActive: true
  },
  {
    name: 'Haldi Photography',
    category: 'Rituals',
    description: 'Vibrant daytime candid coverage for Haldi ceremonies and family fun.',
    defaultPrice: 18000,
    unit: 'Event',
    isActive: true
  },
  {
    name: 'Mehndi Photography',
    category: 'Rituals',
    description: 'Detailed henna close-ups, candid moments, and evening party shots.',
    defaultPrice: 18000,
    unit: 'Event',
    isActive: true
  },
  {
    name: 'Reception Photography',
    category: 'Wedding',
    description: 'Stage portraits, couple entry, and dinner celebration candid photography.',
    defaultPrice: 25000,
    unit: 'Event',
    isActive: true
  },
  {
    name: 'Drone Photography',
    category: 'Aerial',
    description: 'Licensed 4K drone pilot aerial coverage for venues and procession.',
    defaultPrice: 15000,
    unit: 'Day',
    isActive: true
  },
  {
    name: 'Cinematic Film',
    category: 'Cinema',
    description: 'Story-driven 3-5 minute teaser plus 25-40 minute wedding highlights.',
    defaultPrice: 30000,
    unit: 'Deliverable',
    isActive: true
  },
  {
    name: 'Traditional Video',
    category: 'Video',
    description: 'Complete continuous coverage of rituals and stage greetings.',
    defaultPrice: 20000,
    unit: 'Full Day',
    isActive: true
  },
  {
    name: 'Luxury Photobook Album',
    category: 'Deliverables',
    description: '40-sheet flush-mount luxury embossed leather photobook in keepsake box.',
    defaultPrice: 15000,
    unit: 'Book',
    isActive: true
  },
  {
    name: 'Live Streaming',
    category: 'Broadcast',
    description: 'Multi-camera Full-HD live streaming to YouTube or private portal.',
    defaultPrice: 15000,
    unit: 'Session',
    isActive: true
  }
];

export class StudioServiceCatalogService {
  listServices(studioId: string): StudioServiceItem[] {
    if (!studioId) throw new Error('[studioServiceCatalogService.listServices]: studioId is required');
    let services = TenantStore.get<StudioServiceItem>(studioId, 'services');
    if (!services || services.length === 0) {
      services = this.initializeDefaults(studioId);
    }
    return services;
  }

  getService(studioId: string, id: string): StudioServiceItem | undefined {
    return this.listServices(studioId).find(s => s.id === id);
  }

  initializeDefaults(studioId: string): StudioServiceItem[] {
    if (!studioId) throw new Error('[studioServiceCatalogService.initializeDefaults]: studioId is required');
    const seeded: StudioServiceItem[] = DEFAULT_STUDIO_SERVICES.map((s, idx) => ({
      ...s,
      id: `svc_${studioId}_${idx + 1}`,
      studioId,
      createdAt: new Date().toISOString()
    }));
    TenantStore.set(studioId, 'services', seeded);
    return seeded;
  }

  createService(
    studioId: string,
    data: {
      name: string;
      category?: string;
      description?: string;
      defaultPrice: number;
      unit?: string;
      isActive?: boolean;
    },
    operatorId: string = 'system'
  ): StudioServiceItem {
    if (!studioId) throw new Error('[studioServiceCatalogService.createService]: studioId is required');
    if (!data.name || !data.name.trim()) throw new Error('Service name is required');
    if (data.defaultPrice < 0) throw new Error('Price cannot be negative');

    const services = this.listServices(studioId);
    const newService: StudioServiceItem = {
      id: `svc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      studioId,
      name: data.name.trim(),
      category: data.category?.trim() || 'Custom',
      description: data.description?.trim() || '',
      defaultPrice: Number(data.defaultPrice) || 0,
      unit: data.unit?.trim() || 'Unit',
      isActive: data.isActive !== undefined ? data.isActive : true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updated = [...services, newService];
    TenantStore.set(studioId, 'services', updated);
    auditService.log(studioId, operatorId, 'CREATE_SERVICE', 'serviceCatalog', newService.id, { name: newService.name, price: newService.defaultPrice });
    return newService;
  }

  updateService(
    studioId: string,
    id: string,
    updates: Partial<Omit<StudioServiceItem, 'id' | 'studioId' | 'createdAt'>>,
    operatorId: string = 'system'
  ): StudioServiceItem {
    if (!studioId) throw new Error('[studioServiceCatalogService.updateService]: studioId is required');
    const services = this.listServices(studioId);
    const index = services.findIndex(s => s.id === id);
    if (index === -1) throw new Error(`Service ${id} not found`);

    const updated: StudioServiceItem = {
      ...services[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    services[index] = updated;
    TenantStore.set(studioId, 'services', services);
    auditService.log(studioId, operatorId, 'UPDATE_SERVICE', 'serviceCatalog', id, { updates: Object.keys(updates) });
    return updated;
  }

  deleteService(studioId: string, id: string, operatorId: string = 'system'): void {
    if (!studioId) throw new Error('[studioServiceCatalogService.deleteService]: studioId is required');
    const services = this.listServices(studioId);
    const target = services.find(s => s.id === id);
    if (!target) return;

    const filtered = services.filter(s => s.id !== id);
    TenantStore.set(studioId, 'services', filtered);
    auditService.log(studioId, operatorId, 'DELETE_SERVICE', 'serviceCatalog', id, { name: target.name });
  }

  resetToDefaults(studioId: string, operatorId: string = 'system'): StudioServiceItem[] {
    const seeded = this.initializeDefaults(studioId);
    auditService.log(studioId, operatorId, 'RESET_SERVICES', 'serviceCatalog', 'defaults', { count: seeded.length });
    return seeded;
  }
}

export const studioServiceCatalogService = new StudioServiceCatalogService();
