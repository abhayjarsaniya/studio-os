import { FormTemplate, FormTemplateSchema } from '../types/schema';
import { TenantStore } from './tenantStore';

export const formTemplateService = {
  listTemplates(studioId: string): FormTemplate[] {
    if (!studioId) throw new Error('[formTemplateService.listTemplates]: studioId is required');
    return TenantStore.get<FormTemplate>(studioId, 'formTemplates');
  },

  getTemplate(studioId: string, templateId: string): FormTemplate | undefined {
    if (!studioId) throw new Error('[formTemplateService.getTemplate]: studioId is required');
    return this.listTemplates(studioId).find(t => t.id === templateId);
  },

  createTemplate(studioId: string, data: Omit<FormTemplate, 'id' | 'studioId' | 'createdAt' | 'updatedAt'>): FormTemplate {
    if (!studioId) throw new Error('[formTemplateService.createTemplate]: studioId is required');
    const templates = this.listTemplates(studioId);
    const newTemplate: FormTemplate = {
      ...data,
      id: `form_${Date.now()}`,
      studioId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    FormTemplateSchema.parse(newTemplate);
    TenantStore.set(studioId, 'formTemplates', [...templates, newTemplate]);
    return newTemplate;
  }
};
