import { TenantStore } from './tenantStore';
import { StudioEvent, SubEvent, Employee, Studio } from '../types/schema';
import { platformStudioService } from './platformStudioService';
import { supplierService } from './supplierService';
import { subEventService } from './subEventService';
import { demoStudioSeedService } from './demoStudioSeedService';

export interface PlatformEventItem {
  id: string;
  studioId: string;
  studioName: string;
  studioCity: string;
  name: string;
  category: string;
  status: string;
  totalStartDate: string;
  totalEndDate: string;
  overallVenue: string;
  subEventsCount: number;
  assignedTeamCount: number;
  assignedSuppliersCount: number;
  budget?: number;
}

export interface PlatformEventFilters {
  studioId?: string;
  category?: string;
  city?: string;
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export class PlatformEventsService {
  /**
   * Aggregates events across all studios on the platform.
   */
  listAllPlatformEvents(filters?: PlatformEventFilters): PlatformEventItem[] {
    // Ensure demo studios are seeded if empty
    if (!demoStudioSeedService.isSeeded()) {
      demoStudioSeedService.seedAllDemoStudios();
    }

    const studios = platformStudioService.listStudios();
    let allEvents: PlatformEventItem[] = [];

    studios.forEach(st => {
      if (filters?.studioId && filters.studioId !== 'all' && st.id !== filters.studioId) {
        return;
      }
      if (filters?.city && filters.city !== 'all' && st.city.toLowerCase() !== filters.city.toLowerCase()) {
        return;
      }

      const studioEvents = TenantStore.get<StudioEvent>(st.id, 'events') || [];
      const subEvents = TenantStore.get<SubEvent>(st.id, 'sub_events') || [];

      studioEvents.forEach(ev => {
        const evSubEvents = subEvents.filter(s => s.parentEventId === ev.id);
        const suppliers = supplierService.listAssignments(st.id, { eventId: ev.id });

        allEvents.push({
          id: ev.id,
          studioId: st.id,
          studioName: st.name,
          studioCity: st.city,
          name: ev.name,
          category: ev.category,
          status: ev.status,
          totalStartDate: ev.totalStartDate,
          totalEndDate: ev.totalEndDate,
          overallVenue: ev.overallVenue,
          subEventsCount: evSubEvents.length,
          assignedTeamCount: ev.assignedMemberIds?.length || 0,
          assignedSuppliersCount: suppliers.length,
          budget: (ev as any).budget || (ev as any).totalAmount || 0
        });
      });
    });

    // Apply general filters
    return allEvents.filter(ev => {
      if (filters?.category && filters.category !== 'all' && ev.category.toLowerCase() !== filters.category.toLowerCase()) {
        return false;
      }
      if (filters?.status && filters.status !== 'all' && ev.status.toLowerCase() !== filters.status.toLowerCase()) {
        return false;
      }
      if (filters?.dateFrom && ev.totalStartDate < filters.dateFrom) {
        return false;
      }
      if (filters?.dateTo && ev.totalEndDate > filters.dateTo) {
        return false;
      }
      if (filters?.search) {
        const q = filters.search.toLowerCase();
        const matches = 
          ev.name.toLowerCase().includes(q) ||
          ev.overallVenue.toLowerCase().includes(q) ||
          ev.studioName.toLowerCase().includes(q) ||
          ev.id.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }

  /**
   * Retrieves full read-only inspection payload for an event across any studio.
   */
  getEventInspection(studioId: string, eventId: string) {
    const events = TenantStore.get<StudioEvent>(studioId, 'events') || [];
    const event = events.find(e => e.id === eventId);
    if (!event) return null;

    const studio = TenantStore.getSingle<Studio>(studioId, 'profile');
    const subEvents = subEventService.listSubEvents(studioId, eventId);
    const employees = TenantStore.get<Employee>(studioId, 'employees') || [];
    const suppliers = supplierService.listAssignments(studioId, { eventId });

    // Map assigned team details
    const assignedTeam = (event.assignedMemberIds || []).map(mId => {
      const emp = employees.find(e => e.id === mId);
      return {
        id: mId,
        name: emp?.name || 'Assigned Crew',
        role: emp?.designation || 'Staff',
        email: emp?.email,
        phone: emp?.phone
      };
    });

    return {
      event,
      studio: {
        id: studioId,
        name: studio?.name || studioId,
        city: studio?.city || 'Gujarat',
        phone: studio?.phone,
        email: studio?.email
      },
      subEvents,
      assignedTeam,
      assignedSuppliers: suppliers
    };
  }
}

export const platformEventsService = new PlatformEventsService();
