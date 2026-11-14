import { 
  WorkflowTemplate, 
  WorkflowTemplateSchema, 
  WorkflowStage, 
  WorkflowInstance, 
  WorkflowInstanceSchema, 
  TaskTemplate 
} from '../types/schema';
import { TenantStore } from './tenantStore';
import { auditService } from './auditService';

export const DEFAULT_15_PRODUCTION_STAGES: WorkflowStage[] = [
  { id: 'stg_1', name: 'Booking & Confirmation', department: 'Client Relations', roleTitle: 'Receptionist', color: 'blue', order: 1, estimatedHours: 24, requiresApproval: false },
  { id: 'stg_2', name: 'Pre-Production Planning', department: 'Operations', roleTitle: 'Manager', color: 'indigo', order: 2, estimatedHours: 48, requiresApproval: false },
  { id: 'stg_3', name: 'Shoot Preparation', department: 'Photography', roleTitle: 'Photographer', color: 'purple', order: 3, estimatedHours: 24, requiresApproval: false },
  { id: 'stg_4', name: 'Photography / Videography', department: 'Photography', roleTitle: 'Photographer', color: 'cyan', order: 4, estimatedHours: 12, requiresApproval: false },
  { id: 'stg_5', name: 'Data Backup', department: 'Post-Production', roleTitle: 'Photo Editor', color: 'teal', order: 5, estimatedHours: 6, requiresApproval: true },
  { id: 'stg_6', name: 'Photo & Video Selection (Culling)', department: 'Post-Production', roleTitle: 'Photo Editor', color: 'amber', order: 6, estimatedHours: 48, requiresApproval: false },
  { id: 'stg_7', name: 'Photo Editing', department: 'Post-Production', roleTitle: 'Photo Editor', color: 'orange', order: 7, estimatedHours: 72, requiresApproval: true },
  { id: 'stg_8', name: 'Video Editing', department: 'Post-Production', roleTitle: 'Video Editor', color: 'rose', order: 8, estimatedHours: 96, requiresApproval: true },
  { id: 'stg_9', name: 'Client Selection / Review', department: 'Client Relations', roleTitle: 'Delivery Manager', color: 'pink', order: 9, estimatedHours: 72, requiresApproval: false },
  { id: 'stg_10', name: 'Album Designing', department: 'Design', roleTitle: 'Album Designer', color: 'violet', order: 10, estimatedHours: 48, requiresApproval: false },
  { id: 'stg_11', name: 'Album Approval', department: 'Client Relations', roleTitle: 'Delivery Manager', color: 'sky', order: 11, estimatedHours: 48, requiresApproval: true },
  { id: 'stg_12', name: 'Printing & Production', department: 'Production', roleTitle: 'Delivery Manager', color: 'emerald', order: 12, estimatedHours: 120, requiresApproval: false },
  { id: 'stg_13', name: 'Quality Check', department: 'Operations', roleTitle: 'Manager', color: 'red', order: 13, estimatedHours: 24, requiresApproval: true },
  { id: 'stg_14', name: 'Final Delivery', department: 'Client Relations', roleTitle: 'Delivery Manager', color: 'lime', order: 14, estimatedHours: 24, requiresApproval: true },
  { id: 'stg_15', name: 'Completed', department: 'Operations', roleTitle: 'Studio Owner', color: 'green', order: 15, estimatedHours: 0, requiresApproval: false }
];

export const DEFAULT_WORKFLOW_STAGES = DEFAULT_15_PRODUCTION_STAGES;

export const DEFAULT_WEDDING_TASK_TEMPLATES: TaskTemplate[] = [
  // Pre-Production
  {
    id: 'tmpl_tsk_1',
    stageId: 'stg_2',
    title: 'Confirm Shoot Schedule & Call Times',
    description: 'Verify event timeline with bride/groom and finalize venue arrival timings.',
    department: 'Operations',
    roleTitle: 'Manager',
    assigneeRule: 'manager',
    priority: 'High',
    estimatedDurationHours: 2,
    relativeDaysFromEvent: -5,
    checklist: ['Contact couple', 'Confirm muhurat/rituals timing', 'Verify parking & entry passes'],
    requiresApproval: false
  },
  {
    id: 'tmpl_tsk_2',
    stageId: 'stg_2',
    title: 'Assign Photographers & Cinematographers',
    description: 'Lock crew roster and allocate drone operator.',
    department: 'Operations',
    roleTitle: 'Manager',
    assigneeRule: 'manager',
    priority: 'High',
    estimatedDurationHours: 3,
    relativeDaysFromEvent: -4,
    checklist: ['Assign lead shooter', 'Assign candids specialist', 'Assign drone pilot'],
    requiresApproval: false
  },
  {
    id: 'tmpl_tsk_3',
    stageId: 'stg_3',
    title: 'Camera Equipment & Gear Preparation',
    description: 'Format memory cards, test camera bodies, clean lenses, charge batteries and check lighting kits.',
    department: 'Photography',
    roleTitle: 'Photographer',
    assigneeRule: 'lead_photographer',
    priority: 'Urgent',
    estimatedDurationHours: 4,
    relativeDaysFromEvent: -1,
    checklist: ['Clean sensors & lenses', 'Format dual V90 SD cards', 'Check gimbal calibration', 'Charge 8x camera batteries'],
    requiresApproval: false
  },
  // Shoot
  {
    id: 'tmpl_tsk_4',
    stageId: 'stg_4',
    title: 'Complete Wedding Photography Coverage',
    description: 'Execute portraits, ritual candids, family groupings and venue decor.',
    department: 'Photography',
    roleTitle: 'Photographer',
    assigneeRule: 'lead_photographer',
    priority: 'Urgent',
    estimatedDurationHours: 8,
    relativeDaysFromEvent: 0,
    checklist: ['Bridal portraits', 'Varmala coverage', 'Mandap rituals', 'Family group portraits'],
    requiresApproval: false
  },
  {
    id: 'tmpl_tsk_5',
    stageId: 'stg_4',
    title: 'Complete 4K Cinematic Video Coverage',
    description: 'Record gimbal movements, drone aerials, audio speeches and ritual details.',
    department: 'Photography',
    roleTitle: 'Videographer',
    assigneeRule: 'lead_videographer',
    priority: 'Urgent',
    estimatedDurationHours: 8,
    relativeDaysFromEvent: 0,
    checklist: ['Bride/groom prep clips', 'Varmala slow-mo', 'Drone venue establishing shots', 'Audio vows recording'],
    requiresApproval: false
  },
  // Post-Production
  {
    id: 'tmpl_tsk_6',
    stageId: 'stg_5',
    title: 'Data Backup & Dual Drive Offload',
    description: 'Dump all camera cards to primary SSD and mirrored backup HDD. Verify MD5 checksums.',
    department: 'Post-Production',
    roleTitle: 'Photo Editor',
    assigneeRule: 'editor',
    priority: 'Urgent',
    estimatedDurationHours: 3,
    relativeDaysFromEvent: 1,
    checklist: ['Dump card A and B', 'Copy to NAS server', 'Verify checksum files'],
    requiresApproval: true,
    prerequisiteTemplateIds: ['tmpl_tsk_4', 'tmpl_tsk_5']
  },
  {
    id: 'tmpl_tsk_7',
    stageId: 'stg_6',
    title: 'Photo & Video Culling (Raw Selection)',
    description: 'Reject out-of-focus and blink frames. Curate top stills for the master edit.',
    department: 'Post-Production',
    roleTitle: 'Photo Editor',
    assigneeRule: 'editor',
    priority: 'High',
    estimatedDurationHours: 6,
    relativeDaysFromEvent: 3,
    checklist: ['Eliminate blinks', 'Color flag top 400 photos', 'Create web preview catalogue'],
    requiresApproval: false,
    prerequisiteTemplateIds: ['tmpl_tsk_6']
  },
  {
    id: 'tmpl_tsk_8',
    stageId: 'stg_7',
    title: 'Complete Photo Color Grading & Retouching',
    description: 'Skin cleanup, exposure correction, custom tone curve grading and high-res export.',
    department: 'Post-Production',
    roleTitle: 'Photo Editor',
    assigneeRule: 'editor',
    priority: 'High',
    estimatedDurationHours: 12,
    relativeDaysFromEvent: 6,
    checklist: ['Color match all bodies', 'Skin frequency separation', 'High-res JPEG export'],
    requiresApproval: true,
    prerequisiteTemplateIds: ['tmpl_tsk_7']
  },
  {
    id: 'tmpl_tsk_9',
    stageId: 'stg_8',
    title: 'Complete Cinematic Video Teaser & Highlights',
    description: 'Cut 3-minute cinematic teaser, color grade log footage, sound design and music licensing.',
    department: 'Post-Production',
    roleTitle: 'Video Editor',
    assigneeRule: 'editor',
    priority: 'High',
    estimatedDurationHours: 16,
    relativeDaysFromEvent: 8,
    checklist: ['Music beat sync', 'Color grade S-Log3', 'Sound dialogue mix', 'Render 4K teaser'],
    requiresApproval: true,
    prerequisiteTemplateIds: ['tmpl_tsk_6']
  },
  {
    id: 'tmpl_tsk_10',
    stageId: 'stg_10',
    title: 'Album Layout & Sheet Design',
    description: 'Design 40-sheet premium wedding album layout with story flow.',
    department: 'Design',
    roleTitle: 'Album Designer',
    assigneeRule: 'editor',
    priority: 'Medium',
    estimatedDurationHours: 10,
    relativeDaysFromEvent: 12,
    checklist: ['Cover layout', 'Story chronology sheets', 'Export client PDF proof'],
    requiresApproval: false,
    prerequisiteTemplateIds: ['tmpl_tsk_8']
  },
  {
    id: 'tmpl_tsk_11',
    stageId: 'stg_11',
    title: 'Client Album Approval & Signoff',
    description: 'Present PDF proof to couple and incorporate sheet adjustments.',
    department: 'Client Relations',
    roleTitle: 'Delivery Manager',
    assigneeRule: 'manager',
    priority: 'High',
    estimatedDurationHours: 2,
    relativeDaysFromEvent: 16,
    checklist: ['Email proof link', 'Log client remarks', 'Finalize print-ready spreads'],
    requiresApproval: true,
    prerequisiteTemplateIds: ['tmpl_tsk_10']
  },
  {
    id: 'tmpl_tsk_12',
    stageId: 'stg_12',
    title: 'Send Album to Print Lab & Binding',
    description: 'Dispatch sheets to print lab with metallic leatherette binding.',
    department: 'Production',
    roleTitle: 'Delivery Manager',
    assigneeRule: 'manager',
    priority: 'Medium',
    estimatedDurationHours: 48,
    relativeDaysFromEvent: 18,
    checklist: ['Generate CMYK print files', 'Verify velvet lamination', 'Track lab courier'],
    requiresApproval: false,
    prerequisiteTemplateIds: ['tmpl_tsk_11']
  },
  {
    id: 'tmpl_tsk_13',
    stageId: 'stg_13',
    title: 'Final Quality Check & Packaging',
    description: 'Inspect physical album print fidelity, binding corners and flash drive files.',
    department: 'Operations',
    roleTitle: 'Manager',
    assigneeRule: 'manager',
    priority: 'High',
    estimatedDurationHours: 2,
    relativeDaysFromEvent: 24,
    checklist: ['Check sheet alignment', 'Verify USB drive video playable', 'Pack in wooden box'],
    requiresApproval: true,
    prerequisiteTemplateIds: ['tmpl_tsk_12']
  },
  {
    id: 'tmpl_tsk_14',
    stageId: 'stg_14',
    title: 'Final Client Delivery & Handover',
    description: 'Deliver presentation box to customer, activate online gallery, collect final review.',
    department: 'Client Relations',
    roleTitle: 'Delivery Manager',
    assigneeRule: 'manager',
    priority: 'High',
    estimatedDurationHours: 2,
    relativeDaysFromEvent: 26,
    checklist: ['Customer handover signoff', 'Activate cloud gallery', 'Request Google review'],
    requiresApproval: true,
    prerequisiteTemplateIds: ['tmpl_tsk_13']
  }
];

export const DEFAULT_WORKFLOW_TEMPLATES: Array<Omit<WorkflowTemplate, 'id' | 'studioId' | 'createdAt' | 'updatedAt'>> = [
  {
    name: 'Standard Wedding Photography Workflow',
    category: 'Wedding',
    description: '15-stage end-to-end production pipeline for luxury Indian wedding photography and cinematography.',
    stages: DEFAULT_15_PRODUCTION_STAGES,
    taskTemplates: DEFAULT_WEDDING_TASK_TEMPLATES,
    isActive: true,
    isDefault: true
  },
  {
    name: 'Pre-Wedding Cinematic Shoot Workflow',
    category: 'Pre-Wedding',
    description: 'Location scouting, drone permits, teaser cutting and reel delivery.',
    stages: DEFAULT_15_PRODUCTION_STAGES.slice(0, 10),
    taskTemplates: DEFAULT_WEDDING_TASK_TEMPLATES.slice(0, 7),
    isActive: true,
    isDefault: false
  },
  {
    name: 'Corporate Event & Conference Workflow',
    category: 'Corporate Event',
    description: 'Same-day press highlights, speaker portraits and highlight reel turnaround.',
    stages: DEFAULT_15_PRODUCTION_STAGES.filter(s => !s.name.includes('Album')),
    taskTemplates: DEFAULT_WEDDING_TASK_TEMPLATES.slice(0, 6),
    isActive: true,
    isDefault: false
  },
  {
    name: 'Product & Commercial Photography Workflow',
    category: 'Product Photography',
    description: 'Studio tabletop lighting, raw focus stacking, clipping paths and catalog delivery.',
    stages: DEFAULT_15_PRODUCTION_STAGES.slice(0, 9),
    taskTemplates: DEFAULT_WEDDING_TASK_TEMPLATES.slice(0, 5),
    isActive: true,
    isDefault: false
  }
];

export class WorkflowService {
  listTemplates(studioId: string): WorkflowTemplate[] {
    if (!studioId) throw new Error('[workflowService.listTemplates]: studioId is required');
    const existing = TenantStore.get<WorkflowTemplate>(studioId, 'workflowTemplates');
    if (existing.length === 0) {
      // Seed default templates for this studio tenant
      const seeded: WorkflowTemplate[] = DEFAULT_WORKFLOW_TEMPLATES.map((tmpl, idx) => ({
        ...tmpl,
        id: `wft_${studioId}_${idx + 1}`,
        studioId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
      TenantStore.set(studioId, 'workflowTemplates', seeded);
      return seeded;
    }
    return existing;
  }

  // Alias for backward compatibility
  listWorkflowTemplates(studioId: string): WorkflowTemplate[] {
    return this.listTemplates(studioId);
  }

  initializeDefaultTemplates(studioId: string): WorkflowTemplate[] {
    if (!studioId) throw new Error('[workflowService.initializeDefaultTemplates]: studioId is required');
    const seeded: WorkflowTemplate[] = DEFAULT_WORKFLOW_TEMPLATES.map((tmpl, idx) => ({
      ...tmpl,
      id: `wft_${studioId}_${idx + 1}`,
      studioId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
    TenantStore.set(studioId, 'workflowTemplates', seeded);
    return seeded;
  }

  reorderStages(studioId: string, templateId: string, stageIdsInOrder: string[]): WorkflowTemplate {
    const template = this.getTemplate(studioId, templateId);
    if (!template) throw new Error(`Workflow template ${templateId} not found`);

    const reorderedStages: WorkflowStage[] = [];
    stageIdsInOrder.forEach((stageId, index) => {
      const stage = template.stages.find(s => s.id === stageId);
      if (stage) {
        reorderedStages.push({
          ...stage,
          order: index + 1
        });
      }
    });

    return this.updateTemplate(studioId, templateId, { stages: reorderedStages });
  }

  getTemplate(studioId: string, templateId: string): WorkflowTemplate | null {
    if (!studioId) throw new Error('[workflowService.getTemplate]: studioId is required');
    const all = this.listTemplates(studioId);
    return all.find(t => t.id === templateId) || null;
  }

  // Alias for backward compatibility
  getWorkflowTemplate(studioId: string, templateId: string): WorkflowTemplate | undefined {
    return this.getTemplate(studioId, templateId) || undefined;
  }

  createTemplate(
    studioId: string,
    data: Omit<WorkflowTemplate, 'id' | 'studioId' | 'createdAt' | 'updatedAt'>
  ): WorkflowTemplate {
    if (!studioId) throw new Error('[workflowService.createTemplate]: studioId is required');
    if (!data.name || !data.name.trim()) throw new Error('Workflow name is required');

    const all = this.listTemplates(studioId);
    const newTemplate: WorkflowTemplate = {
      ...data,
      id: `wft_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      studioId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    WorkflowTemplateSchema.parse(newTemplate);
    TenantStore.set(studioId, 'workflowTemplates', [...all, newTemplate]);

    auditService.log(
      studioId,
      'system',
      'CREATE_WORKFLOW_TEMPLATE',
      'workflowTemplate',
      newTemplate.id,
      { templateName: newTemplate.name, category: newTemplate.category }
    );

    return newTemplate;
  }

  // Alias for backward compatibility
  createWorkflowTemplate(
    studioId: string,
    data: Omit<WorkflowTemplate, 'id' | 'studioId' | 'createdAt' | 'updatedAt'>
  ): WorkflowTemplate {
    return this.createTemplate(studioId, data);
  }

  updateTemplate(studioId: string, templateId: string, updates: Partial<WorkflowTemplate>): WorkflowTemplate {
    if (!studioId) throw new Error('[workflowService.updateTemplate]: studioId is required');
    const all = this.listTemplates(studioId);
    const index = all.findIndex(t => t.id === templateId);
    if (index === -1) throw new Error(`Workflow template ${templateId} not found`);

    const updated: WorkflowTemplate = {
      ...all[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    WorkflowTemplateSchema.parse(updated);
    all[index] = updated;
    TenantStore.set(studioId, 'workflowTemplates', all);

    auditService.log(
      studioId,
      'system',
      'UPDATE_WORKFLOW_TEMPLATE',
      'workflowTemplate',
      templateId,
      { updates: Object.keys(updates) }
    );

    return updated;
  }

  duplicateTemplate(studioId: string, templateId: string): WorkflowTemplate {
    const original = this.getTemplate(studioId, templateId);
    if (!original) throw new Error(`Template ${templateId} not found`);

    const { id: _i, studioId: _s, createdAt: _c, updatedAt: _u, ...rest } = original;
    return this.createTemplate(studioId, {
      ...rest,
      name: `${original.name} (Copy)`,
      isDefault: false
    });
  }

  deleteTemplate(studioId: string, templateId: string): void {
    if (!studioId) throw new Error('[workflowService.deleteTemplate]: studioId is required');
    const all = this.listTemplates(studioId);
    const target = all.find(t => t.id === templateId);
    if (!target) return;
    if (target.isDefault) {
      throw new Error(`Default template "${target.name}" cannot be deleted.`);
    }

    const filtered = all.filter(t => t.id !== templateId);
    TenantStore.set(studioId, 'workflowTemplates', filtered);

    auditService.log(
      studioId,
      'system',
      'DELETE_WORKFLOW_TEMPLATE',
      'workflowTemplate',
      templateId,
      { templateName: target.name }
    );
  }

  // ==========================================
  // Active Workflow Instances (Attached to Event / Sub-Event)
  // ==========================================
  listWorkflowInstances(
    studioId: string,
    filter?: { entityId?: string; entityType?: 'main_event' | 'sub_event' | 'production_job'; status?: string }
  ): WorkflowInstance[] {
    if (!studioId) throw new Error('[workflowService.listWorkflowInstances]: studioId is required');
    let all = TenantStore.get<WorkflowInstance>(studioId, 'workflowInstances');
    if (filter?.entityId) {
      all = all.filter(w => w.entityId === filter.entityId);
    }
    if (filter?.entityType) {
      all = all.filter(w => w.entityType === filter.entityType);
    }
    if (filter?.status) {
      all = all.filter(w => w.status === filter.status);
    }
    return all;
  }

  // Alias for backward compatibility & brevity
  listInstances(
    studioId: string,
    filter?: { entityId?: string; entityType?: 'main_event' | 'sub_event' | 'production_job'; status?: string }
  ): WorkflowInstance[] {
    return this.listWorkflowInstances(studioId, filter);
  }

  getWorkflowInstance(studioId: string, workflowId: string): WorkflowInstance | null {
    if (!studioId) throw new Error('[workflowService.getWorkflowInstance]: studioId is required');
    const all = this.listWorkflowInstances(studioId);
    return all.find(w => w.id === workflowId) || null;
  }

  attachWorkflow(
    studioId: string,
    params: {
      templateId: string;
      entityType: 'main_event' | 'sub_event' | 'production_job';
      entityId: string;
      entityName: string;
      operatorId?: string;
    }
  ): WorkflowInstance {
    if (!studioId) throw new Error('[workflowService.attachWorkflow]: studioId is required');
    const template = this.getTemplate(studioId, params.templateId);
    if (!template) throw new Error(`Template ${params.templateId} not found`);

    const existingInstances = this.listWorkflowInstances(studioId, { entityId: params.entityId });
    if (existingInstances.length > 0) {
      // Return existing active instance to prevent duplicate workflow attachment
      const active = existingInstances.find(i => i.status === 'active');
      if (active) return active;
    }

    const firstStage = template.stages[0] || { id: 'stg_1', name: 'Booking & Confirmation' };
    const now = new Date().toISOString();

    const instance: WorkflowInstance = {
      id: `wf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      studioId,
      templateId: template.id,
      templateName: template.name,
      entityType: params.entityType,
      entityId: params.entityId,
      entityName: params.entityName,
      currentStageId: firstStage.id,
      currentStageName: firstStage.name,
      status: 'active',
      totalTasksCount: 0,
      completedTasksCount: 0,
      progressPercentage: 0,
      startedAt: now,
      createdAt: now,
      updatedAt: now
    };

    WorkflowInstanceSchema.parse(instance);
    const all = this.listWorkflowInstances(studioId);
    TenantStore.set(studioId, 'workflowInstances', [...all, instance]);

    auditService.log(
      studioId,
      params.operatorId || 'system',
      'ATTACH_WORKFLOW',
      'workflowInstance',
      instance.id,
      { templateName: template.name, entityType: params.entityType, entityName: params.entityName }
    );

    return instance;
  }

  updateWorkflowStage(
    studioId: string,
    workflowId: string,
    newStageId: string,
    operatorId?: string
  ): WorkflowInstance {
    if (!studioId) throw new Error('[workflowService.updateWorkflowStage]: studioId is required');
    const all = this.listWorkflowInstances(studioId);
    const index = all.findIndex(w => w.id === workflowId);
    if (index === -1) throw new Error(`Workflow instance ${workflowId} not found`);

    const instance = all[index];
    const template = this.getTemplate(studioId, instance.templateId);
    const stage = template?.stages.find(s => s.id === newStageId);

    const isLastStage = template?.stages[template.stages.length - 1]?.id === newStageId;
    const now = new Date().toISOString();

    const updated: WorkflowInstance = {
      ...instance,
      currentStageId: newStageId,
      currentStageName: stage ? stage.name : instance.currentStageName,
      status: isLastStage ? 'completed' : instance.status,
      completedAt: isLastStage ? now : instance.completedAt,
      updatedAt: now
    };

    all[index] = updated;
    TenantStore.set(studioId, 'workflowInstances', all);

    auditService.log(
      studioId,
      operatorId || 'system',
      'UPDATE_WORKFLOW_STAGE',
      'workflowInstance',
      workflowId,
      { newStage: updated.currentStageName }
    );

    return updated;
  }

  updateProgress(
    studioId: string,
    workflowId: string,
    totalTasks: number,
    completedTasks: number
  ): WorkflowInstance {
    return this.updateWorkflowProgress(studioId, workflowId, totalTasks, completedTasks);
  }

  updateWorkflowProgress(
    studioId: string,
    workflowId: string,
    totalTasks: number,
    completedTasks: number
  ): WorkflowInstance {
    const all = this.listWorkflowInstances(studioId);
    const index = all.findIndex(w => w.id === workflowId);
    if (index === -1) throw new Error(`Workflow instance ${workflowId} not found`);

    const instance = all[index];
    const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const now = new Date().toISOString();

    const updated: WorkflowInstance = {
      ...instance,
      totalTasksCount: totalTasks,
      completedTasksCount: completedTasks,
      progressPercentage: percentage,
      status: percentage === 100 ? 'completed' : instance.status,
      completedAt: percentage === 100 ? now : instance.completedAt,
      updatedAt: now
    };

    all[index] = updated;
    TenantStore.set(studioId, 'workflowInstances', all);
    return updated;
  }
}

export const workflowService = new WorkflowService();
