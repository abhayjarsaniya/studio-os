import { MessageTemplate, MessageTemplateSchema, WhatsAppLog, WhatsAppLogSchema, WhatsAppLogStatus, Studio } from '../types/schema';
import { TenantStore } from './tenantStore';
import { auditService } from './auditService';
import { normalizePhoneNumber } from './customerService';
import { firestoreService } from './firestoreService';

export interface StudioWhatsAppConfig {
  studioId: string;
  enabled: boolean;
  businessNumber: string;
  countryCode: string;
  defaultMessage: string;
  updatedAt: string;
}

export interface DynamicTemplateContext {
  customer_name?: string;
  studio_name?: string;
  studio_phone?: string;
  event_name?: string;
  event_category?: string;
  event_date?: string;
  event_venue?: string;
  event_location?: string;
  booking_id?: string;
  quotation_amount?: string | number;
  total_amount?: string | number;
  advance_amount?: string | number;
  pending_amount?: string | number;
  delivery_date?: string;
  assigned_employee?: string;
  custom_message?: string;
  quotation_link?: string;
  [key: string]: string | number | undefined;
}

export const DEFAULT_16_WHATSAPP_TEMPLATES: Array<Omit<MessageTemplate, 'id' | 'studioId' | 'createdAt' | 'updatedAt'>> = [
  {
    title: 'Initial Inquiry Response',
    category: 'Inquiry',
    body: 'Hello {{customer_name}}, thank you for contacting *{{studio_name}}*! 📸✨ We are delighted to assist you with your {{event_category}} inquiry. Could you please share the expected date and location so we can check availability?',
    placeholders: ['customer_name', 'studio_name', 'event_category'],
    isActive: true,
    isDefault: true
  },
  {
    title: 'Thank You for Your Inquiry',
    category: 'Inquiry',
    body: 'Dear {{customer_name}}, thank you for reaching out to *{{studio_name}}*. We have received your query for {{event_name}} and our creative director will connect with you shortly with our lookbook & packages.',
    placeholders: ['customer_name', 'studio_name', 'event_name'],
    isActive: true,
    isDefault: true
  },
  {
    title: 'Quotation Shared',
    category: 'Billing',
    body: 'Hello {{customer_name}}, we have prepared a tailored quotation of *₹{{quotation_amount}}* for your *{{event_name}}*. Please review the package inclusions and let us know if you would like any customizations. Warm regards, *{{studio_name}}*.',
    placeholders: ['customer_name', 'quotation_amount', 'event_name', 'studio_name'],
    isActive: true,
    isDefault: true
  },
  {
    title: 'Booking Confirmation',
    category: 'Booking',
    body: '🎉 *Booking Confirmed!* Dear {{customer_name}}, your booking *#{{booking_id}}* for *{{event_name}}* on *{{event_date}}* is officially locked with *{{studio_name}}*. Our team is thrilled to capture your celebration!',
    placeholders: ['customer_name', 'booking_id', 'event_name', 'event_date', 'studio_name'],
    isActive: true,
    isDefault: true
  },
  {
    title: 'Advance Payment Reminder',
    category: 'Billing',
    body: 'Dear {{customer_name}}, greetings from *{{studio_name}}*. Kindly arrange the token advance of *₹{{advance_amount}}* to finalize the crew roster and lock calendar slots for your {{event_category}} on {{event_date}}.',
    placeholders: ['customer_name', 'studio_name', 'advance_amount', 'event_category', 'event_date'],
    isActive: true,
    isDefault: true
  },
  {
    title: 'Event Reminder',
    category: 'Booking',
    body: 'Hi {{customer_name}}, gentle reminder that *{{event_name}}* is scheduled for *{{event_date}}* at *{{event_venue}}*! 🎥 Our lead shooter {{assigned_employee}} and the crew are ready. Please ping us if there are any timing changes.',
    placeholders: ['customer_name', 'event_name', 'event_date', 'event_venue', 'assigned_employee'],
    isActive: true,
    isDefault: true
  },
  {
    title: 'Pre-Event Confirmation',
    category: 'Booking',
    body: 'Dear {{customer_name}}, our team at *{{studio_name}}* is doing final gear preparation for your shoot tomorrow! Please confirm the ritual call timings and venue entrance guidelines. See you soon! 📷✨',
    placeholders: ['customer_name', 'studio_name'],
    isActive: true,
    isDefault: true
  },
  {
    title: 'Shoot Completed',
    category: 'Post-Production',
    body: 'Hello {{customer_name}}, congratulations on a wonderful {{event_name}}! 🌟 Our team has safely backed up all raw photos and 4K cinema footage to our master storage. We will initiate selection shortly.',
    placeholders: ['customer_name', 'event_name'],
    isActive: true,
    isDefault: true
  },
  {
    title: 'Photo Selection Reminder',
    category: 'Post-Production',
    body: 'Dear {{customer_name}}, your online selection gallery for *{{event_name}}* is live! 🔗 Please shortlist your favorite portraits for the wedding album by {{delivery_date}} so our retouching team can proceed.',
    placeholders: ['customer_name', 'event_name', 'delivery_date'],
    isActive: true,
    isDefault: true
  },
  {
    title: 'Album Approval Request',
    category: 'Post-Production',
    body: 'Hi {{customer_name}}, your album proof design for *{{event_name}}* is ready for your review! 📖 Please inspect the spreads and reply with your approval or any sheet adjustments so we can dispatch for printing.',
    placeholders: ['customer_name', 'event_name'],
    isActive: true,
    isDefault: true
  },
  {
    title: 'Album Ready',
    category: 'Delivery',
    body: 'Great news {{customer_name}}! 🎉 Your luxury flush-mount photobook album for *{{event_name}}* has finished binding and passed our quality check. It is packed in its presentation wooden box ready for handover.',
    placeholders: ['customer_name', 'event_name'],
    isActive: true,
    isDefault: true
  },
  {
    title: 'Final Delivery Notification',
    category: 'Delivery',
    body: 'Dear {{customer_name}}, all deliverables for *{{event_name}}* (4K highlight cinematic film, full ceremony edit & master album) are ready for collection at *{{studio_name}}*! 📦✨ Thank you for choosing us.',
    placeholders: ['customer_name', 'event_name', 'studio_name'],
    isActive: true,
    isDefault: true
  },
  {
    title: 'Payment Reminder',
    category: 'Billing',
    body: 'Dear {{customer_name}}, this is a gentle reminder regarding the outstanding balance of *₹{{pending_amount}}* for *{{event_name}}*. Kindly clear the payment at your earliest convenience. Thank you! - *{{studio_name}}*',
    placeholders: ['customer_name', 'pending_amount', 'event_name', 'studio_name'],
    isActive: true,
    isDefault: true
  },
  {
    title: 'Feedback Request',
    category: 'General',
    body: 'Dear {{customer_name}}, it was an absolute honor capturing your moments at *{{event_name}}*. Could you take 60 seconds to share your review on Google? Your words mean the world to our team at *{{studio_name}}*! ⭐⭐⭐⭐⭐',
    placeholders: ['customer_name', 'event_name', 'studio_name'],
    isActive: true,
    isDefault: true
  },
  {
    title: 'Anniversary / Birthday Greeting',
    category: 'Greetings',
    body: 'Wishing you a very Happy Celebration, {{customer_name}}! 🎂💐 May your day be filled with happiness and love. Warmest greetings from your friends at *{{studio_name}}*!',
    placeholders: ['customer_name', 'studio_name'],
    isActive: true,
    isDefault: true
  },
  {
    title: 'Custom Message',
    category: 'General',
    body: 'Hello {{customer_name}}, {{custom_message}} - Warm regards, *{{studio_name}}*',
    placeholders: ['customer_name', 'custom_message', 'studio_name'],
    isActive: true,
    isDefault: true
  }
];

export class WhatsAppService {
  getStudioConfig(studioId: string): StudioWhatsAppConfig {
    if (!studioId) throw new Error('[whatsappService.getStudioConfig]: studioId is required');
    const existing = TenantStore.getSingle<StudioWhatsAppConfig>(studioId, 'whatsappConfig');
    if (existing) return existing;

    const studio = TenantStore.getSingle<Studio>(studioId, 'profile');
    const defaultConfig: StudioWhatsAppConfig = {
      studioId,
      enabled: studio?.settings?.allowDirectWhatsApp !== false,
      businessNumber: studio?.phone || '',
      countryCode: '+91',
      defaultMessage: 'Hello {customer_name}, greetings from {studio_name}!',
      updatedAt: new Date().toISOString()
    };
    return defaultConfig;
  }

  saveStudioConfig(studioId: string, config: Partial<StudioWhatsAppConfig>, operatorId = 'Studio Owner'): StudioWhatsAppConfig {
    if (!studioId) throw new Error('[whatsappService.saveStudioConfig]: studioId is required');
    const current = this.getStudioConfig(studioId);
    const updated: StudioWhatsAppConfig = {
      ...current,
      ...config,
      studioId,
      updatedAt: new Date().toISOString()
    };
    TenantStore.set(studioId, 'whatsappConfig', updated);

    // Also sync to studio profile settings
    const studio = TenantStore.getSingle<Studio>(studioId, 'profile');
    if (studio) {
      if (!studio.settings) studio.settings = {} as any;
      if (typeof updated.enabled === 'boolean') {
        studio.settings.allowDirectWhatsApp = updated.enabled;
      }
      TenantStore.set(studioId, 'profile', studio);
    }

    auditService.log(studioId, operatorId, 'UPDATE_WHATSAPP_CONFIG', 'studioSettings', studioId, {
      enabled: updated.enabled,
      businessNumber: updated.businessNumber
    });

    return updated;
  }

  initializeDefaultTemplates(studioId: string): MessageTemplate[] {
    if (!studioId) throw new Error('[whatsappService.initializeDefaultTemplates]: studioId is required');
    const seeded = DEFAULT_16_WHATSAPP_TEMPLATES.map((tmpl, idx) => ({
      ...tmpl,
      id: `msgt_${studioId}_${idx + 1}`,
      studioId,
      createdAt: new Date().toISOString()
    }));
    TenantStore.set(studioId, 'messageTemplates', seeded);
    firestoreService.saveCollectionBatch(studioId, 'messageTemplates', seeded).catch(() => {});
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('studio_data_updated'));
    return seeded;
  }

  listTemplates(studioId: string): MessageTemplate[] {
    if (!studioId) throw new Error('[whatsappService.listTemplates]: studioId is required');
    const all = TenantStore.get<MessageTemplate>(studioId, 'messageTemplates');
    return Array.isArray(all) ? all : [];
  }

  getTemplate(studioId: string, templateId: string): MessageTemplate | undefined {
    return this.listTemplates(studioId).find(t => t.id === templateId);
  }

  createTemplate(
    studioId: string,
    data: {
      title: string;
      body: string;
      category?: string;
      placeholders?: string[];
      applicableCategories?: string[];
      isActive?: boolean;
      isDefault?: boolean;
    },
    operatorId: string = 'system'
  ): MessageTemplate {
    if (!studioId) throw new Error('[whatsappService.createTemplate]: studioId is required');
    if (!data.title || !data.title.trim()) throw new Error('Template title is required');
    if (!data.body || !data.body.trim()) throw new Error('Template message body is required');

    const templates = this.listTemplates(studioId);
    // Extract placeholders automatically e.g. {{customer_name}}
    const matches = data.body.match(/\{\{([a-zA-Z0-9_]+)\}\}/g) || [];
    const extractedPlaceholders = Array.from(new Set(matches.map(m => m.replace(/[\{\}]/g, ''))));

    const newTemplate: MessageTemplate = {
      ...data,
      id: `msgt_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      studioId,
      category: data.category || 'General',
      placeholders: extractedPlaceholders.length > 0 ? extractedPlaceholders : (data.placeholders || []),
      isActive: data.isActive !== undefined ? data.isActive : true,
      isDefault: false,
      createdAt: new Date().toISOString()
    };

    MessageTemplateSchema.parse(newTemplate);
    TenantStore.set(studioId, 'messageTemplates', [...templates, newTemplate]);
    firestoreService.saveDocument(studioId, 'messageTemplates', newTemplate.id, newTemplate).catch(() => {});
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('studio_data_updated'));

    auditService.log(studioId, operatorId, 'CREATE_MESSAGE_TEMPLATE', 'messageTemplate', newTemplate.id, { title: newTemplate.title });
    return newTemplate;
  }

  updateTemplate(
    studioId: string,
    templateId: string,
    updates: Partial<MessageTemplate>,
    operatorId: string = 'system'
  ): MessageTemplate {
    if (!studioId) throw new Error('[whatsappService.updateTemplate]: studioId is required');
    const templates = this.listTemplates(studioId);
    const index = templates.findIndex(t => t.id === templateId);
    if (index === -1) throw new Error(`Template ${templateId} not found`);

    let placeholders = updates.placeholders || templates[index].placeholders;
    if (updates.body) {
      const matches = updates.body.match(/\{\{([a-zA-Z0-9_]+)\}\}/g) || [];
      placeholders = Array.from(new Set(matches.map(m => m.replace(/[\{\}]/g, ''))));
    }

    const updated: MessageTemplate = {
      ...templates[index],
      ...updates,
      placeholders,
      updatedAt: new Date().toISOString()
    };

    MessageTemplateSchema.parse(updated);
    templates[index] = updated;
    TenantStore.set(studioId, 'messageTemplates', templates);
    firestoreService.saveDocument(studioId, 'messageTemplates', updated.id, updated).catch(() => {});
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('studio_data_updated'));

    auditService.log(studioId, operatorId, 'UPDATE_MESSAGE_TEMPLATE', 'messageTemplate', templateId, { updates: Object.keys(updates) });
    return updated;
  }

  duplicateTemplate(studioId: string, templateId: string, operatorId: string = 'system'): MessageTemplate {
    const original = this.getTemplate(studioId, templateId);
    if (!original) throw new Error(`Template ${templateId} not found`);

    const { id: _i, studioId: _s, createdAt: _c, updatedAt: _u, ...rest } = original;
    return this.createTemplate(
      studioId,
      {
        ...rest,
        title: `${original.title} (Copy)`,
        isDefault: false
      },
      operatorId
    );
  }

  deleteTemplate(studioId: string, templateId: string, operatorId: string = 'system'): void {
    if (!studioId) throw new Error('[whatsappService.deleteTemplate]: studioId is required');
    const templates = this.listTemplates(studioId);
    const target = templates.find(t => t.id === templateId);
    if (!target) return;

    TenantStore.set(studioId, 'messageTemplates', templates.filter(t => t.id !== templateId));
    firestoreService.deleteDocument(studioId, 'messageTemplates', templateId).catch(() => {});
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('studio_data_updated'));
    auditService.log(studioId, operatorId, 'DELETE_MESSAGE_TEMPLATE', 'messageTemplate', templateId, { title: target.title });
  }

  renderTemplate(templateText: string, context: DynamicTemplateContext) {
    return this.replacePlaceholders(templateText, context);
  }

  /**
   * Replaces dynamic placeholders safely and flags any unresolved variables.
   * Supports both single {variable} and double {{variable}} syntax.
   */
  replacePlaceholders(
    templateText: string,
    context: DynamicTemplateContext
  ): { 
    resultText: string; 
    message: string; 
    missingPlaceholders: string[]; 
    missingKeys: string[]; 
    hasUnresolved: boolean; 
  } {
    let resultText = templateText;
    // Map synonymous aliases
    const resolvedContext: Record<string, string | number | undefined> = {
      ...context,
      event_location: context.event_location ?? context.event_venue,
      event_venue: context.event_venue ?? context.event_location,
      total_amount: context.total_amount ?? context.quotation_amount,
      quotation_amount: context.quotation_amount ?? context.total_amount
    };

    // Match both {{var}} and {var}
    const doubleMatches = templateText.match(/\{\{([a-zA-Z0-9_]+)\}\}/g) || [];
    const singleMatches = templateText.match(/(?<!\{)\{([a-zA-Z0-9_]+)\}(?!\})/g) || [];
    const allMatches = [...doubleMatches, ...singleMatches];
    const missingPlaceholders: string[] = [];

    allMatches.forEach(token => {
      const key = token.replace(/[\{\}]/g, '');
      const value = resolvedContext[key];
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        resultText = resultText.split(token).join(String(value));
      } else {
        missingPlaceholders.push(key);
      }
    });

    const missing = Array.from(new Set(missingPlaceholders));
    return {
      resultText,
      message: resultText,
      missingPlaceholders: missing,
      missingKeys: missing,
      hasUnresolved: missing.length > 0
    };
  }

  getDefaultQuotationTemplate(studioId: string): MessageTemplate | undefined {
    const templates = this.listTemplates(studioId);
    return templates.find(t => t.isDefault && (t.category === 'Billing' || t.title.toLowerCase().includes('quotation'))) ||
           templates.find(t => t.title.toLowerCase().includes('quotation')) ||
           templates[0];
  }

  setDefaultQuotationTemplate(studioId: string, templateId: string, operatorId: string = 'system'): MessageTemplate {
    if (!studioId) throw new Error('[whatsappService.setDefaultQuotationTemplate]: studioId is required');
    const templates = this.listTemplates(studioId);
    const target = templates.find(t => t.id === templateId);
    if (!target) throw new Error(`Template ${templateId} not found`);

    const updated = templates.map(t => {
      if (t.id === templateId) {
        return { ...t, isDefault: true, updatedAt: new Date().toISOString() };
      }
      if (t.category === 'Billing' || t.title.toLowerCase().includes('quotation')) {
        return { ...t, isDefault: false, updatedAt: new Date().toISOString() };
      }
      return t;
    });

    TenantStore.set(studioId, 'messageTemplates', updated);
    auditService.log(studioId, operatorId, 'SET_DEFAULT_TEMPLATE', 'messageTemplate', templateId, { title: target.title });
    return updated.find(t => t.id === templateId)!;
  }

  /**
   * Generates official WhatsApp click-to-chat URL:
   * https://wa.me/<international_phone_number>?text=<URL_encoded_message>
   * Strictly removes spaces, dashes, parentheses and the '+' sign.
   */
  generateClickToChatUrl(phone: string, message: string): { 
    url: string; 
    waMeNumber: string; 
    isValid: boolean; 
    error?: string;
    toString?: () => string;
  } {
    if (!phone || !phone.trim()) {
      return { url: '', waMeNumber: '', isValid: false, error: 'Phone number is required.' };
    }

    const norm = normalizePhoneNumber(phone);
    if (!norm.isValid) {
      return {
        url: '',
        waMeNumber: norm.waMeFormat,
        isValid: false,
        error: `Invalid phone number format: "${phone}". Must be 10-15 digits.`
      };
    }

    const waMeNumber = norm.waMeFormat; // digits only, no + sign
    const encodedText = encodeURIComponent(message);
    const url = `https://wa.me/${waMeNumber}?text=${encodedText}`;

    return {
      url,
      waMeNumber,
      isValid: true,
      toString() {
        return url;
      }
    };
  }

  // ==========================================
  // Communication Activity Logs
  // ==========================================
  listLogs(studioId: string, filter?: { customerId?: string; status?: WhatsAppLogStatus }): WhatsAppLog[] {
    if (!studioId) throw new Error('[whatsappService.listLogs]: studioId is required');
    let all = TenantStore.get<WhatsAppLog>(studioId, 'messageLogs');
    if (filter?.customerId) {
      all = all.filter(l => l.customerId === filter.customerId);
    }
    if (filter?.status) {
      all = all.filter(l => l.status === filter.status);
    }
    return all;
  }

  logWhatsAppInitiation(
    studioId: string,
    params: {
      customerId: string;
      customerName: string;
      phone: string;
      templateId?: string;
      templateTitle?: string;
      messageText: string;
      initiatedById?: string;
      initiatedByName?: string;
      relatedEventId?: string;
      relatedLeadId?: string;
      status?: WhatsAppLogStatus;
    }
  ): WhatsAppLog {
    if (!studioId) throw new Error('[whatsappService.logWhatsAppInitiation]: studioId is required');
    const logs = this.listLogs(studioId);
    const clickObj = this.generateClickToChatUrl(params.phone, params.messageText);

    const newLog: WhatsAppLog = {
      id: `walog_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      studioId,
      customerId: params.customerId,
      customerName: params.customerName,
      phone: params.phone,
      url: clickObj.url,
      templateId: params.templateId,
      templateTitle: params.templateTitle,
      messageText: params.messageText,
      initiatedById: params.initiatedById || 'system',
      initiatedByName: params.initiatedByName || 'System Admin',
      timestamp: new Date().toISOString(),
      relatedEventId: params.relatedEventId,
      relatedLeadId: params.relatedLeadId,
      status: params.status || 'Drafted'
    };

    WhatsAppLogSchema.parse(newLog);
    TenantStore.set(studioId, 'messageLogs', [newLog, ...logs]);

    auditService.log(
      studioId,
      newLog.initiatedById,
      'WHATSAPP_CLICK_TO_CHAT',
      'customer',
      params.customerId,
      { phone: params.phone, template: params.templateTitle || 'Custom', status: newLog.status }
    );

    return newLog;
  }

  confirmWhatsAppSent(studioId: string, logId: string, operatorId: string = 'system', notes?: string): WhatsAppLog {
    return this.confirmMessageSent(studioId, logId, operatorId);
  }

  confirmMessageSent(studioId: string, logId: string, operatorId: string = 'system'): WhatsAppLog {
    if (!studioId) throw new Error('[whatsappService.confirmMessageSent]: studioId is required');
    const logs = this.listLogs(studioId);
    const index = logs.findIndex(l => l.id === logId);
    if (index === -1) throw new Error(`Log ${logId} not found`);

    const updated: WhatsAppLog = {
      ...logs[index],
      status: 'User Confirmed Sent',
      confirmedSentAt: new Date().toISOString()
    };

    logs[index] = updated;
    TenantStore.set(studioId, 'messageLogs', logs);
    return updated;
  }

  cancelMessageLog(studioId: string, logId: string, reason?: string, operatorId: string = 'system'): WhatsAppLog {
    if (!studioId) throw new Error('[whatsappService.cancelMessageLog]: studioId is required');
    const logs = this.listLogs(studioId);
    const index = logs.findIndex(l => l.id === logId);
    if (index === -1) throw new Error(`Log ${logId} not found`);

    const updated: WhatsAppLog = {
      ...logs[index],
      status: 'Cancelled',
      cancelReason: reason || 'User cancelled'
    };

    logs[index] = updated;
    TenantStore.set(studioId, 'messageLogs', logs);
    return updated;
  }
}

export const whatsappService = new WhatsAppService();
