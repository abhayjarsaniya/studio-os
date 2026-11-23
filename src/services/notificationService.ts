import { StudioNotification, StudioNotificationSchema } from '../types/schema';
import { TenantStore } from './tenantStore';
import { firestoreService } from './firestoreService';

export const notificationService = {
  listNotifications(studioId: string): StudioNotification[] {
    if (!studioId) throw new Error('[notificationService.listNotifications]: studioId is required');
    return TenantStore.get<StudioNotification>(studioId, 'notifications');
  },

  createNotification(studioId: string, data: Omit<StudioNotification, 'id' | 'studioId' | 'createdAt'>): StudioNotification {
    if (!studioId) throw new Error('[notificationService.createNotification]: studioId is required');
    const notifs = this.listNotifications(studioId);
    const newNotif: StudioNotification = {
      ...data,
      id: `notif_${Date.now()}`,
      studioId,
      createdAt: new Date().toISOString()
    };
    StudioNotificationSchema.parse(newNotif);
    TenantStore.set(studioId, 'notifications', [newNotif, ...notifs]);
    firestoreService.saveDocument(studioId, 'notifications', newNotif.id, newNotif).catch(() => {});
    return newNotif;
  },

  markRead(studioId: string, notificationId: string): void {
    if (!studioId) throw new Error('[notificationService.markRead]: studioId is required');
    const notifs = this.listNotifications(studioId);
    TenantStore.set(
      studioId,
      'notifications',
      notifs.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  },

  markAllRead(studioId: string): void {
    if (!studioId) throw new Error('[notificationService.markAllRead]: studioId is required');
    const notifs = this.listNotifications(studioId);
    TenantStore.set(
      studioId,
      'notifications',
      notifs.map(n => ({ ...n, read: true }))
    );
  }
};
