import { TenantStore } from './tenantStore';
import { firestoreService } from './firestoreService';
import { auditService } from './auditService';
import { DeliverableCategory } from '../types/bookingProduction';

export interface StudioPackageItem {
  id: string;
  studioId: string;
  name: string;
  category: string;
  description?: string;
  basePrice: number;
  advancePercentage?: number;
  items: Array<{
    name: string;
    description?: string;
    qty: number;
    rate: number;
  }>;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface StudioDeliverableCatalogItem {
  id: string;
  studioId: string;
  name: string;
  category: DeliverableCategory;
  unit: string;
  defaultQty: number;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface StudioEventTypeItem {
  id: string;
  studioId: string;
  name: string;
  kind: 'event' | 'function';
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

class StudioCatalogService {
  // ============================================
  // 1. STUDIO PACKAGES (packages)
  // ============================================
  listPackages(studioId: string): StudioPackageItem[] {
    if (!studioId) return [];
    const list = TenantStore.get<StudioPackageItem>(studioId, 'packages');
    return Array.isArray(list) ? list : [];
  }

  createPackage(
    studioId: string,
    data: {
      name: string;
      category?: string;
      description?: string;
      basePrice: number;
      advancePercentage?: number;
      items?: Array<{ name: string; description?: string; qty: number; rate: number }>;
    },
    operatorId = 'Studio Owner'
  ): StudioPackageItem {
    if (!studioId) throw new Error('studioId is required');
    if (!data.name?.trim()) throw new Error('Package name is required');
    const current = this.listPackages(studioId);
    const items = (data.items && data.items.length > 0)
      ? data.items
      : [{ name: data.name.trim(), description: data.description?.trim() || '', qty: 1, rate: Number(data.basePrice) || 0 }];

    const computedPrice = data.basePrice > 0
      ? Number(data.basePrice)
      : items.reduce((sum, it) => sum + (Number(it.qty) || 1) * (Number(it.rate) || 0), 0);

    const record: StudioPackageItem = {
      id: `pkg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      studioId,
      name: data.name.trim(),
      category: data.category?.trim() || 'Wedding',
      description: data.description?.trim() || '',
      basePrice: Math.max(0, computedPrice),
      advancePercentage: data.advancePercentage ?? 30,
      items,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const next = [...current, record];
    TenantStore.set(studioId, 'packages', next);
    firestoreService.saveDocument(studioId, 'packages', record.id, record).catch(() => {});
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('studio_data_updated'));
    auditService.log(studioId, operatorId, 'CREATE_PACKAGE', 'packages', record.id, { name: record.name });
    return record;
  }

  updatePackage(
    studioId: string,
    id: string,
    updates: Partial<Omit<StudioPackageItem, 'id' | 'studioId' | 'createdAt'>>,
    operatorId = 'Studio Owner'
  ): StudioPackageItem {
    const current = this.listPackages(studioId);
    const idx = current.findIndex(p => p.id === id);
    if (idx === -1) throw new Error(`Package ${id} not found`);

    const updated: StudioPackageItem = {
      ...current[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    current[idx] = updated;
    TenantStore.set(studioId, 'packages', current);
    firestoreService.saveDocument(studioId, 'packages', updated.id, updated).catch(() => {});
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('studio_data_updated'));
    auditService.log(studioId, operatorId, 'UPDATE_PACKAGE', 'packages', id, { name: updated.name });
    return updated;
  }

  deletePackage(studioId: string, id: string, operatorId = 'Studio Owner'): void {
    const current = this.listPackages(studioId);
    const target = current.find(p => p.id === id);
    if (!target) return;
    const filtered = current.filter(p => p.id !== id);
    TenantStore.set(studioId, 'packages', filtered);
    firestoreService.deleteDocument(studioId, 'packages', id).catch(() => {});
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('studio_data_updated'));
    auditService.log(studioId, operatorId, 'DELETE_PACKAGE', 'packages', id, { name: target.name });
  }

  // ============================================
  // 2. DELIVERABLES CATALOG (deliverablesCatalog)
  // ============================================
  listDeliverables(studioId: string): StudioDeliverableCatalogItem[] {
    if (!studioId) return [];
    const list = TenantStore.get<StudioDeliverableCatalogItem>(studioId, 'deliverablesCatalog');
    return Array.isArray(list) ? list : [];
  }

  createDeliverable(
    studioId: string,
    data: {
      name: string;
      category?: DeliverableCategory;
      unit?: string;
      defaultQty?: number;
      description?: string;
    },
    operatorId = 'Studio Owner'
  ): StudioDeliverableCatalogItem {
    if (!studioId) throw new Error('studioId is required');
    if (!data.name?.trim()) throw new Error('Deliverable name is required');
    const current = this.listDeliverables(studioId);

    const record: StudioDeliverableCatalogItem = {
      id: `dlv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      studioId,
      name: data.name.trim(),
      category: data.category || 'photography',
      unit: data.unit?.trim() || 'items',
      defaultQty: Math.max(1, Number(data.defaultQty) || 1),
      description: data.description?.trim() || '',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const next = [...current, record];
    TenantStore.set(studioId, 'deliverablesCatalog', next);
    firestoreService.saveDocument(studioId, 'deliverablesCatalog', record.id, record).catch(() => {});
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('studio_data_updated'));
    auditService.log(studioId, operatorId, 'CREATE_DELIVERABLE_CATALOG', 'deliverablesCatalog', record.id, { name: record.name });
    return record;
  }

  updateDeliverable(
    studioId: string,
    id: string,
    updates: Partial<Omit<StudioDeliverableCatalogItem, 'id' | 'studioId' | 'createdAt'>>,
    operatorId = 'Studio Owner'
  ): StudioDeliverableCatalogItem {
    const current = this.listDeliverables(studioId);
    const idx = current.findIndex(d => d.id === id);
    if (idx === -1) throw new Error(`Deliverable ${id} not found`);

    const updated: StudioDeliverableCatalogItem = {
      ...current[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    current[idx] = updated;
    TenantStore.set(studioId, 'deliverablesCatalog', current);
    firestoreService.saveDocument(studioId, 'deliverablesCatalog', updated.id, updated).catch(() => {});
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('studio_data_updated'));
    auditService.log(studioId, operatorId, 'UPDATE_DELIVERABLE_CATALOG', 'deliverablesCatalog', id, { name: updated.name });
    return updated;
  }

  deleteDeliverable(studioId: string, id: string, operatorId = 'Studio Owner'): void {
    const current = this.listDeliverables(studioId);
    const target = current.find(d => d.id === id);
    if (!target) return;
    const filtered = current.filter(d => d.id !== id);
    TenantStore.set(studioId, 'deliverablesCatalog', filtered);
    firestoreService.deleteDocument(studioId, 'deliverablesCatalog', id).catch(() => {});
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('studio_data_updated'));
    auditService.log(studioId, operatorId, 'DELETE_DELIVERABLE_CATALOG', 'deliverablesCatalog', id, { name: target.name });
  }

  // ============================================
  // 3. EVENT & FUNCTION TYPES (eventCategories)
  // ============================================
  listEventTypes(studioId: string, kind?: 'event' | 'function'): StudioEventTypeItem[] {
    if (!studioId) return [];
    const list = TenantStore.get<StudioEventTypeItem>(studioId, 'eventCategories') || [];
    if (!Array.isArray(list)) return [];
    if (kind) {
      return list.filter(item => (item.kind || 'event') === kind || !item.kind);
    }
    return list;
  }

  createEventType(
    studioId: string,
    data: { name: string; kind?: 'event' | 'function'; description?: string },
    operatorId = 'Studio Owner'
  ): StudioEventTypeItem {
    if (!studioId) throw new Error('studioId is required');
    if (!data.name?.trim()) throw new Error('Type name is required');
    const current = this.listEventTypes(studioId);
    const duplicate = current.find(
      t => t.name.trim().toLowerCase() === data.name.trim().toLowerCase() && (t.kind || 'event') === (data.kind || 'event')
    );
    if (duplicate) return duplicate;

    const record: StudioEventTypeItem = {
      id: `etype_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      studioId,
      name: data.name.trim(),
      kind: data.kind || 'event',
      description: data.description?.trim() || '',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const next = [...current, record];
    TenantStore.set(studioId, 'eventCategories', next);
    firestoreService.saveDocument(studioId, 'eventCategories', record.id, record).catch(() => {});
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('studio_data_updated'));
    auditService.log(studioId, operatorId, 'CREATE_EVENT_TYPE', 'eventCategories', record.id, { name: record.name });
    return record;
  }

  updateEventType(
    studioId: string,
    id: string,
    updates: Partial<Omit<StudioEventTypeItem, 'id' | 'studioId' | 'createdAt'>>,
    operatorId = 'Studio Owner'
  ): StudioEventTypeItem {
    const current = this.listEventTypes(studioId);
    const idx = current.findIndex(t => t.id === id);
    if (idx === -1) throw new Error(`Event type ${id} not found`);

    const updated: StudioEventTypeItem = {
      ...current[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    current[idx] = updated;
    TenantStore.set(studioId, 'eventCategories', current);
    firestoreService.saveDocument(studioId, 'eventCategories', updated.id, updated).catch(() => {});
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('studio_data_updated'));
    auditService.log(studioId, operatorId, 'UPDATE_EVENT_TYPE', 'eventCategories', id, { name: updated.name });
    return updated;
  }

  deleteEventType(studioId: string, id: string, operatorId = 'Studio Owner'): void {
    const current = this.listEventTypes(studioId);
    const target = current.find(t => t.id === id);
    if (!target) return;
    const filtered = current.filter(t => t.id !== id);
    TenantStore.set(studioId, 'eventCategories', filtered);
    firestoreService.deleteDocument(studioId, 'eventCategories', id).catch(() => {});
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('studio_data_updated'));
    auditService.log(studioId, operatorId, 'DELETE_EVENT_TYPE', 'eventCategories', id, { name: target.name });
  }
}

export const studioCatalogService = new StudioCatalogService();
