import { EventCategoryItem, EventCategoryItemSchema } from '../types/schema';
import { TenantStore } from './tenantStore';
import { ALL_EVENT_CATEGORIES } from '../data/demoData';

export const categoryService = {
  listCategories(studioId: string): EventCategoryItem[] {
    if (!studioId) throw new Error('[categoryService.listCategories]: studioId is required');
    const existing = TenantStore.get<EventCategoryItem>(studioId, 'eventCategories');
    if (existing.length === 0) {
      // Seed default categories for this studio
      const initial: EventCategoryItem[] = ALL_EVENT_CATEGORIES.map((cat, idx) => ({
        id: `cat_${cat.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        studioId,
        name: cat,
        slug: cat.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        color: 'zinc',
        isDefault: idx < 8,
        isActive: true,
        sortOrder: idx,
        createdAt: new Date().toISOString()
      }));
      TenantStore.set(studioId, 'eventCategories', initial);
      return initial;
    }
    return existing;
  },

  addCategory(studioId: string, name: string, description?: string): EventCategoryItem {
    if (!studioId) throw new Error('[categoryService.addCategory]: studioId is required');
    const categories = this.listCategories(studioId);
    const newCat: EventCategoryItem = {
      id: `cat_${Date.now()}`,
      studioId,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      color: 'blue',
      description,
      isDefault: false,
      isActive: true,
      sortOrder: categories.length,
      createdAt: new Date().toISOString()
    };
    EventCategoryItemSchema.parse(newCat);
    TenantStore.set(studioId, 'eventCategories', [...categories, newCat]);
    return newCat;
  }
};
