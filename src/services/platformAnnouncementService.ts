import { TenantStore } from './tenantStore';
import { 
  PlatformAnnouncement, 
  PlatformAnnouncementSchema 
} from '../types/schema';
import { platformSubscriptionManager } from './platformSubscriptionManager';
import { platformAuditService } from './platformAuditService';

export class PlatformAnnouncementService {
  private readonly STORE_KEY = 'platform_announcements';

  listAnnouncements(): PlatformAnnouncement[] {
    let announcements = TenantStore.get<PlatformAnnouncement>('platform_system', this.STORE_KEY);
    if (!announcements || announcements.length === 0) {
      const initial: PlatformAnnouncement = {
        id: 'ann_welcome_001',
        title: 'Welcome to Studio OS 2.0 Multi-Tenant ERP',
        description: 'Enjoy automated production workflows, integrated billing with GST, WhatsApp CRM, and centralized reports.',
        type: 'general',
        targetScope: 'all',
        priority: 'normal',
        status: 'published',
        publishedAt: '2026-01-01T00:00:00.000Z',
        createdBy: 'Studio OS Platform Team',
        createdAt: '2026-01-01T00:00:00.000Z'
      };
      announcements = [initial];
      TenantStore.set('platform_system', this.STORE_KEY, announcements);
    }
    return announcements;
  }

  getAnnouncement(id: string): PlatformAnnouncement | undefined {
    return this.listAnnouncements().find(a => a.id === id);
  }

  createAnnouncement(data: {
    title: string;
    description: string;
    type?: 'general' | 'feature' | 'maintenance' | 'billing' | 'security' | 'urgent';
    targetScope?: 'all' | 'specific_studios' | 'specific_plans' | 'active_only';
    targetStudioIds?: string[];
    targetPlanIds?: string[];
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    status?: 'draft' | 'published';
    expiresAt?: string;
    createdBy?: string;
  }): PlatformAnnouncement {
    const isPublished = data.status === 'published';
    const now = new Date().toISOString();

    const newAnnouncement: PlatformAnnouncement = {
      id: `ann_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: data.title.trim(),
      description: data.description.trim(),
      type: data.type || 'general',
      targetScope: data.targetScope || 'all',
      targetStudioIds: data.targetStudioIds,
      targetPlanIds: data.targetPlanIds,
      priority: data.priority || 'normal',
      status: data.status || 'draft',
      publishedAt: isPublished ? now : undefined,
      expiresAt: data.expiresAt,
      createdBy: data.createdBy || 'Platform Super Admin',
      createdAt: now
    };

    PlatformAnnouncementSchema.parse(newAnnouncement);

    const announcements = this.listAnnouncements();
    TenantStore.set('platform_system', this.STORE_KEY, [newAnnouncement, ...announcements]);

    if (isPublished) {
      this.dispatchToStudios(newAnnouncement);
    }

    platformAuditService.log({
      adminId: 'admin_sys',
      adminName: data.createdBy || 'Platform Super Admin',
      action: 'CREATE_PLATFORM_ANNOUNCEMENT',
      targetType: 'platform_announcement',
      targetId: newAnnouncement.id,
      details: `Created announcement "${newAnnouncement.title}" [${newAnnouncement.status}] target: ${newAnnouncement.targetScope}`
    });

    return newAnnouncement;
  }

  updateAnnouncement(id: string, updates: Partial<PlatformAnnouncement>, actingAdmin = 'Super Admin'): PlatformAnnouncement {
    const announcements = this.listAnnouncements();
    const index = announcements.findIndex(a => a.id === id);
    if (index === -1) throw new Error(`Announcement "${id}" not found`);

    const current = announcements[index];
    const willPublish = updates.status === 'published' && current.status !== 'published';

    const updated: PlatformAnnouncement = {
      ...current,
      ...updates,
      publishedAt: willPublish ? new Date().toISOString() : (updates.publishedAt || current.publishedAt)
    };

    announcements[index] = updated;
    TenantStore.set('platform_system', this.STORE_KEY, announcements);

    if (willPublish) {
      this.dispatchToStudios(updated);
    }

    platformAuditService.log({
      adminId: 'admin_sys',
      adminName: actingAdmin,
      action: 'UPDATE_PLATFORM_ANNOUNCEMENT',
      targetType: 'platform_announcement',
      targetId: id,
      details: `Updated announcement "${updated.title}"`
    });

    return updated;
  }

  deleteAnnouncement(id: string): boolean {
    const announcements = this.listAnnouncements();
    const filtered = announcements.filter(a => a.id !== id);
    if (filtered.length === announcements.length) return false;
    TenantStore.set('platform_system', this.STORE_KEY, filtered);
    return true;
  }

  getAnnouncementsForStudio(studioId: string): PlatformAnnouncement[] {
    const sub = platformSubscriptionManager.getSubscription(studioId);
    return this.listAnnouncements().filter(a => {
      if (a.status !== 'published') return false;
      if (a.targetScope === 'all') return true;
      if (a.targetScope === 'specific_studios') return a.targetStudioIds?.includes(studioId);
      if (a.targetScope === 'specific_plans') return sub && a.targetPlanIds?.includes(sub.planId);
      if (a.targetScope === 'active_only') return sub?.status === 'active';
      return false;
    });
  }

  /**
   * Broadcasts the announcement into the notification feeds of targeted studio tenants
   */
  private dispatchToStudios(announcement: PlatformAnnouncement): void {
    const subs = platformSubscriptionManager.listSubscriptions();
    let targetStudioIds: string[] = [];

    switch (announcement.targetScope) {
      case 'specific_studios':
        targetStudioIds = announcement.targetStudioIds || [];
        break;
      case 'specific_plans':
        const planSet = new Set(announcement.targetPlanIds || []);
        targetStudioIds = subs.filter(s => planSet.has(s.planId)).map(s => s.studioId);
        break;
      case 'active_only':
        targetStudioIds = subs.filter(s => s.status === 'active').map(s => s.studioId);
        break;
      case 'all':
      default:
        targetStudioIds = subs.map(s => s.studioId);
        break;
    }

    targetStudioIds.forEach(studioId => {
      try {
        const notifications = TenantStore.get<any>(studioId, 'notifications') || [];
        const noticeItem = {
          id: `notif_${announcement.id}_${Date.now()}`,
          studioId,
          title: `[Platform] ${announcement.title}`,
          message: announcement.description,
          type: announcement.priority === 'urgent' ? 'alert' : 'info',
          isRead: false,
          createdAt: new Date().toISOString()
        };
        TenantStore.set(studioId, 'notifications', [noticeItem, ...notifications]);
      } catch (e) {
        // Continue if studio storage not initialized
      }
    });
  }
}

export const platformAnnouncementService = new PlatformAnnouncementService();
