import { AuditLog, AuditLogSchema } from '../types/schema';
import { TenantStore } from './tenantStore';

export interface AuditLogPayload {
  studioId: string;
  userId?: string;
  operatorId?: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: Record<string, any>;
  userName?: string;
  operatorName?: string;
  userRole?: string;
}

export const auditService = {
  listAuditLogs(studioId: string): AuditLog[] {
    if (!studioId) throw new Error('[auditService.listAuditLogs]: studioId is required');
    return TenantStore.get<AuditLog>(studioId, 'auditLogs');
  },

  logAction(
    studioId: string, 
    userId: string, 
    action: string, 
    entityType: string, 
    entityId: string, 
    details: Record<string, any> = {},
    userName?: string,
    userRole?: string
  ): AuditLog {
    if (!studioId) throw new Error('[auditService.logAction]: studioId is required');
    const logs = this.listAuditLogs(studioId);
    const newLog: AuditLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      studioId,
      userId: userId || 'system',
      userName: userName || 'System User',
      userRole,
      action,
      entityType,
      entityId,
      details,
      timestamp: new Date().toISOString()
    };
    AuditLogSchema.parse(newLog);
    TenantStore.set(studioId, 'auditLogs', [newLog, ...logs]);
    return newLog;
  },

  log(
    studioIdOrPayload: string | AuditLogPayload, 
    userId?: string, 
    action?: string, 
    entityType?: string, 
    entityId?: string, 
    details: Record<string, any> = {},
    userName?: string,
    userRole?: string
  ): AuditLog {
    if (typeof studioIdOrPayload === 'object') {
      const p = studioIdOrPayload;
      return this.logAction(
        p.studioId,
        p.userId || p.operatorId || 'system',
        p.action,
        p.entityType,
        p.entityId,
        p.details || {},
        p.userName || p.operatorName || 'System',
        p.userRole
      );
    }
    return this.logAction(studioIdOrPayload, userId || 'system', action || 'ACTION', entityType || 'general', entityId || '', details, userName, userRole);
  }
};
