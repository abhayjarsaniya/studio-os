import { 
  Task, 
  TaskSchema, 
  TaskStatus, 
  TaskChecklistItem, 
  TaskAttachmentItem, 
  TaskCommentItem, 
  TaskActivityItem,
  Employee 
} from '../types/schema';
import { TenantStore } from './tenantStore';
import { auditService } from './auditService';
import { notificationService } from './notificationService';
import { workflowService } from './workflowService';
import { taskDependencyService } from './taskDependencyService';
import { firestoreService } from './firestoreService';

export interface TaskFilterOptions {
  assignedToId?: string;
  collaboratorId?: string;
  eventId?: string;
  subEventId?: string;
  workflowId?: string;
  workflowStageId?: string;
  department?: string;
  priority?: string;
  status?: string;
  isOverdue?: boolean;
  isBlocked?: boolean;
  search?: string;
}

export interface EmployeeWorkloadItem {
  employeeId: string;
  employeeName: string;
  department: string;
  designation: string;
  totalActiveTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  completedTasks: number;
  isOverloaded: boolean; // true if active tasks > 5
}

export class TaskService {
  listTasks(studioId: string, filter?: TaskFilterOptions): Task[] {
    if (!studioId) throw new Error('[taskService.listTasks]: studioId is required');
    let all = TenantStore.get<Task>(studioId, 'tasks');
    if ((!all || all.length === 0) && (studioId === 'studio_shreeji_films' || studioId === 'std_demo_royal')) {
      const fallbackId = studioId === 'studio_shreeji_films' ? 'std_demo_royal' : 'studio_shreeji_films';
      all = TenantStore.get<Task>(fallbackId, 'tasks');
    }
    all = all || [];
    const today = new Date().toISOString().split('T')[0];

    if (filter) {
      if (filter.assignedToId) {
        all = all.filter(t => t.assignedToId === filter.assignedToId);
      }
      if (filter.collaboratorId) {
        all = all.filter(t => (t.collaboratorIds || []).includes(filter.collaboratorId!));
      }
      if (filter.eventId) {
        all = all.filter(t => t.eventId === filter.eventId);
      }
      if (filter.subEventId) {
        all = all.filter(t => t.subEventId === filter.subEventId);
      }
      if (filter.workflowId) {
        all = all.filter(t => t.workflowId === filter.workflowId);
      }
      if (filter.workflowStageId) {
        all = all.filter(t => t.workflowStageId === filter.workflowStageId);
      }
      if (filter.department) {
        all = all.filter(t => t.department === filter.department);
      }
      if (filter.priority) {
        all = all.filter(t => t.priority === filter.priority);
      }
      if (filter.status && filter.status !== 'All') {
        all = all.filter(t => t.status === filter.status);
      }
      if (filter.isOverdue) {
        all = all.filter(t => t.dueDate < today && t.status !== 'Completed' && t.status !== 'Done' && t.status !== 'Cancelled');
      }
      if (filter.search) {
        const q = filter.search.toLowerCase();
        all = all.filter(t => 
          t.title.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          (t.taskNumber && t.taskNumber.toLowerCase().includes(q)) ||
          (t.eventName && t.eventName.toLowerCase().includes(q))
        );
      }
    }

    return all;
  }

  getTask(studioId: string, taskId: string): Task | undefined {
    if (!studioId) throw new Error('[taskService.getTask]: studioId is required');
    return this.listTasks(studioId).find(t => t.id === taskId);
  }

  private generateTaskNumber(studioId: string): string {
    const existing = this.listTasks(studioId);
    const count = existing.length + 1;
    return `TSK-${String(count).padStart(3, '0')}`;
  }

  createTask(
    studioId: string,
    data: Omit<Task, 'id' | 'studioId' | 'createdAt' | 'updatedAt'> & { id?: string; taskNumber?: string }
  ): Task {
    if (!studioId) throw new Error('[taskService.createTask]: studioId is required');
    if (!data.title || !data.title.trim()) throw new Error('Task title is required');

    const tasks = this.listTasks(studioId);
    const taskId = data.id || `tsk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const taskNumber = data.taskNumber || this.generateTaskNumber(studioId);
    const now = new Date().toISOString();

    const newTask: Task = {
      checklist: [],
      attachments: [],
      comments: [],
      dependencies: [],
      collaboratorIds: [],
      priority: 'Medium',
      status: 'Not Started',
      approvalStatus: 'none',
      requiresApproval: false,
      estimatedDuration: 4,
      actualTimeSpent: 0,
      department: 'Production',
      createdBy: 'system',
      ...data,
      id: taskId,
      taskNumber,
      studioId,
      createdAt: now,
      updatedAt: now
    };

    TaskSchema.parse(newTask);
    TenantStore.set(studioId, 'tasks', [newTask, ...tasks]);
    firestoreService.saveDocument(studioId, 'tasks', newTask.id, newTask).catch(() => {});

    // Send assignment notification if assigned to employee
    if (newTask.assignedToId) {
      notificationService.createNotification(studioId, {
        title: `New Task Assigned: ${newTask.title}`,
        message: `You were assigned ${newTask.title} (Due: ${newTask.dueDate})`,
        type: 'task',
        timestamp: 'Just now',
        read: false,
        linkTab: 'tasks',
        linkId: newTask.id
      });
    }

    auditService.log(
      studioId,
      newTask.createdBy,
      'CREATE_TASK',
      'task',
      newTask.id,
      { title: newTask.title, taskNumber: newTask.taskNumber, assignedToName: newTask.assignedToName }
    );

    return newTask;
  }

  updateTask(
    studioId: string,
    taskId: string,
    updates: Partial<Task>,
    operatorId: string = 'system',
    operatorName: string = 'System'
  ): Task {
    if (!studioId) throw new Error('[taskService.updateTask]: studioId is required');
    const tasks = this.listTasks(studioId);
    const index = tasks.findIndex(t => t.id === taskId);
    if (index === -1) throw new Error(`Task ${taskId} not found in studio ${studioId}`);

    const existing = tasks[index];
    const now = new Date().toISOString();

    // Check if adding dependencies introduces a cycle
    if (updates.dependencies && updates.dependencies.length > 0) {
      for (const depId of updates.dependencies) {
        if (taskDependencyService.hasCircularDependency(tasks, taskId, depId)) {
          throw new Error(`Circular dependency detected: Task cannot depend on ${depId} as it forms a circular loop.`);
        }
      }
    }

    const updated: Task = {
      ...existing,
      ...updates,
      updatedAt: now
    };

    TaskSchema.parse(updated);
    tasks[index] = updated;
    TenantStore.set(studioId, 'tasks', tasks);
    firestoreService.saveDocument(studioId, 'tasks', updated.id, updated).catch(() => {});

    auditService.log(
      studioId,
      operatorId,
      'UPDATE_TASK',
      'task',
      taskId,
      { updates: Object.keys(updates), updatedBy: operatorName }
    );

    return updated;
  }

  updateTaskStatus(
    studioId: string,
    taskId: string,
    newStatus: TaskStatus,
    operatorId: string = 'system',
    operatorName: string = 'System',
    operatorRoleOrOverrideReason?: string,
    managerOverrideReason?: string
  ): Task {
    if (!studioId) throw new Error('[taskService.updateTaskStatus]: studioId is required');
    const tasks = this.listTasks(studioId);
    const task = tasks.find(t => t.id === taskId);
    if (!task) throw new Error(`Task ${taskId} not found in studio ${studioId}`);

    const knownRoles = [
      'owner', 'admin', 'super_admin', 'manager', 
      'lead_photographer', 'cinematographer', 'photographer', 'videographer', 
      'editor', 'photo_editor', 'video_editor', 'album_designer', 
      'accountant', 'delivery_manager', 'receptionist'
    ];

    let role = '';
    let overrideReason: string | undefined = undefined;

    if (managerOverrideReason !== undefined) {
      role = operatorRoleOrOverrideReason || '';
      overrideReason = managerOverrideReason;
    } else if (operatorRoleOrOverrideReason && knownRoles.includes(operatorRoleOrOverrideReason.toLowerCase())) {
      role = operatorRoleOrOverrideReason.toLowerCase();
      overrideReason = undefined;
    } else {
      overrideReason = operatorRoleOrOverrideReason;
    }

    const isCompleting = newStatus === 'Completed' || newStatus === 'Done';

    // Enforce dependency check before completing
    if (isCompleting) {
      const isManagerOrOwner = (role === 'owner' || role === 'manager' || role === 'admin' || role === 'super_admin' || operatorId === 'owner_1' || operatorId.includes('owner') || operatorName.toLowerCase().includes('owner'));
      const check = taskDependencyService.canCompleteTask(task, tasks, isManagerOrOwner, overrideReason);
      if (!check.allowed) {
        throw new Error(check.reason);
      }
    }

    const now = new Date().toISOString();
    const updates: Partial<Task> = {
      status: newStatus,
      completedAt: isCompleting ? now : task.completedAt,
      approvalStatus: isCompleting ? 'approved' : task.approvalStatus,
      managerOverrideReason: overrideReason
    };

    const updated = this.updateTask(studioId, taskId, updates, operatorId, operatorName);

    // If task belongs to a workflow instance, update workflow progress
    if (updated.workflowId) {
      const workflowTasks = this.listTasks(studioId, { workflowId: updated.workflowId });
      const completedCount = workflowTasks.filter(t => t.status === 'Completed' || t.status === 'Done').length;
      workflowService.updateWorkflowProgress(studioId, updated.workflowId, workflowTasks.length, completedCount);
    }

    // Trigger in-app notification when dependency is cleared for downstream tasks
    if (isCompleting) {
      const downstream = taskDependencyService.getDownstreamImpactedTasks(task, tasks);
      downstream.forEach(dt => {
        const isBlocked = taskDependencyService.isTaskBlocked(dt, tasks.map(t => t.id === taskId ? updated : t)).blocked;
        if (!isBlocked && dt.assignedToId) {
          notificationService.createNotification(studioId, {
            title: `Prerequisite Completed: ${task.title}`,
            message: `Task "${dt.title}" is now unblocked and ready for work.`,
            type: 'task',
            timestamp: 'Just now',
            read: false,
            linkTab: 'tasks',
            linkId: dt.id
          });
        }
      });
    }

    return updated;
  }

  // Alias for backward compatibility & concise syntax
  updateStatus(
    studioId: string,
    taskId: string,
    newStatus: TaskStatus,
    operatorId: string = 'system',
    operatorName: string = 'System',
    operatorRoleOrOverrideReason?: string,
    managerOverrideReason?: string
  ): Task {
    return this.updateTaskStatus(
      studioId,
      taskId,
      newStatus,
      operatorId,
      operatorName,
      operatorRoleOrOverrideReason,
      managerOverrideReason
    );
  }

  deleteTask(studioId: string, taskId: string): void {
    if (!studioId) throw new Error('[taskService.deleteTask]: studioId is required');
    const tasks = this.listTasks(studioId);
    TenantStore.set(studioId, 'tasks', tasks.filter(t => t.id !== taskId));
    firestoreService.deleteDocument(studioId, 'tasks', taskId).catch(() => {});
    auditService.log(studioId, 'system', 'DELETE_TASK', 'task', taskId, {});
  }

  // ==========================================
  // Automatic Task Generation from Workflow
  // ==========================================
  generateTasksFromWorkflow(
    studioId: string,
    workflowInstanceId: string,
    entityStartDate?: string,
    options?: {
      overrideEventId?: string;
      overrideEventName?: string;
      overrideSubEventId?: string;
      overrideSubEventName?: string;
    }
  ): Task[] {
    if (!studioId) throw new Error('[taskService.generateTasksFromWorkflow]: studioId is required');
    const workflow = workflowService.getWorkflowInstance(studioId, workflowInstanceId);
    if (!workflow) throw new Error(`Workflow instance ${workflowInstanceId} not found`);

    // IDEMPOTENCY CHECK: If tasks already generated for this workflow, return existing without duplicating
    const existing = this.listTasks(studioId, { workflowId: workflowInstanceId });
    if (existing.length > 0) {
      return existing;
    }

    const template = workflowService.getTemplate(studioId, workflow.templateId);
    if (!template) throw new Error(`Template ${workflow.templateId} not found`);

    const employees = TenantStore.get<Employee>(studioId, 'employees');
    const defaultLeadPhoto = employees.find(e => e.designation.toLowerCase().includes('photographer')) || employees[0];
    const defaultLeadVideo = employees.find(e => e.designation.toLowerCase().includes('videographer') || e.designation.toLowerCase().includes('cinematographer')) || defaultLeadPhoto;
    const defaultEditor = employees.find(e => e.designation.toLowerCase().includes('editor')) || defaultLeadPhoto;
    const defaultManager = employees.find(e => e.designation.toLowerCase().includes('manager')) || defaultLeadPhoto;

    const baseDate = entityStartDate || new Date().toISOString().split('T')[0];
    const stageMap = new Map(template.stages.map(s => [s.id, s.name]));

    // Map template task ID to concrete generated task ID for dependency resolution
    const templateToConcreteIdMap = new Map<string, string>();
    const taskTemplates = template.taskTemplates || [];

    taskTemplates.forEach((tmpl, idx) => {
      const concreteId = `tsk_wf_${workflowInstanceId}_${idx + 1}`;
      templateToConcreteIdMap.set(tmpl.id, concreteId);
    });

    const generatedTasks: Task[] = [];

    taskTemplates.forEach((tmpl, idx) => {
      const concreteId = templateToConcreteIdMap.get(tmpl.id)!;
      const stageName = stageMap.get(tmpl.stageId) || 'Production';

      // Calculate relative due date
      const dateObj = new Date(baseDate);
      dateObj.setDate(dateObj.getDate() + tmpl.relativeDaysFromEvent);
      const dueDate = dateObj.toISOString().split('T')[0];

      // Resolve assignee based on assigneeRule
      let assignee = defaultLeadPhoto;
      if (tmpl.assigneeRule === 'lead_videographer') assignee = defaultLeadVideo;
      if (tmpl.assigneeRule === 'editor') assignee = defaultEditor;
      if (tmpl.assigneeRule === 'manager') assignee = defaultManager;

      // Map prerequisite template IDs to concrete task IDs
      const concreteDependencies = (tmpl.prerequisiteTemplateIds || [])
        .map(pId => templateToConcreteIdMap.get(pId))
        .filter(Boolean) as string[];

      // Construct checklist items
      const checklistItems: TaskChecklistItem[] = (tmpl.checklist || []).map((ch, chIdx) => ({
        id: `chk_${concreteId}_${chIdx + 1}`,
        title: ch,
        completed: false
      }));

      const task: Task = {
        id: concreteId,
        taskNumber: `TSK-${String(idx + 1).padStart(3, '0')}`,
        studioId,
        eventId: options?.overrideEventId || (workflow.entityType === 'main_event' ? workflow.entityId : undefined),
        eventName: options?.overrideEventName || (workflow.entityType === 'main_event' ? workflow.entityName : undefined),
        subEventId: options?.overrideSubEventId || (workflow.entityType === 'sub_event' ? workflow.entityId : undefined),
        subEventName: options?.overrideSubEventName || (workflow.entityType === 'sub_event' ? workflow.entityName : undefined),
        workflowId: workflowInstanceId,
        workflowStageId: tmpl.stageId,
        workflowStageName: stageName,
        title: tmpl.title,
        description: tmpl.description,
        assignedToId: assignee ? assignee.id : 'emp_default',
        assignedToName: assignee ? assignee.fullName : 'Lead Team Member',
        department: tmpl.department,
        priority: tmpl.priority,
        status: 'Assigned',
        dueDate,
        estimatedDuration: tmpl.estimatedDurationHours,
        actualTimeSpent: 0,
        checklist: checklistItems,
        attachments: [],
        comments: [],
        dependencies: concreteDependencies,
        requiresApproval: tmpl.requiresApproval,
        approvalStatus: tmpl.requiresApproval ? 'none' : 'none',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'workflow_engine'
      };

      TaskSchema.parse(task);
      generatedTasks.push(task);
    });

    const allExisting = this.listTasks(studioId);
    TenantStore.set(studioId, 'tasks', [...generatedTasks, ...allExisting]);

    // Update workflow instance with total tasks count
    workflowService.updateWorkflowProgress(studioId, workflowInstanceId, generatedTasks.length, 0);

    auditService.log(
      studioId,
      'workflow_engine',
      'AUTO_GENERATE_TASKS',
      'workflowInstance',
      workflowInstanceId,
      { count: generatedTasks.length, templateName: template.name }
    );

    return generatedTasks;
  }

  // ==========================================
  // Date Shift & Recalculation
  // ==========================================
  recalculateDueDates(
    studioId: string,
    eventId: string,
    newEventDate: string,
    shiftDays: number
  ): { affectedTasksCount: number; updatedTasks: Task[] } {
    if (!studioId) throw new Error('[taskService.recalculateDueDates]: studioId is required');
    const tasks = this.listTasks(studioId, { eventId });
    const updatedTasks: Task[] = [];

    const now = new Date().toISOString();
    const all = this.listTasks(studioId);

    const newAll = all.map(t => {
      // Recalculate only tasks with relativeDaysFromEvent defined; preserve manual custom deadlines
      if (t.eventId === eventId && t.relativeDaysFromEvent !== undefined && t.status !== 'Completed' && t.status !== 'Done') {
        const baseDate = new Date(newEventDate);
        baseDate.setDate(baseDate.getDate() + t.relativeDaysFromEvent);
        const newDueDate = baseDate.toISOString().split('T')[0];

        const updated: Task = {
          ...t,
          dueDate: newDueDate,
          updatedAt: now
        };
        updatedTasks.push(updated);
        return updated;
      }
      return t;
    });

    TenantStore.set(studioId, 'tasks', newAll);

    auditService.log(
      studioId,
      'system',
      'RECALCULATE_TASK_DUE_DATES',
      'event',
      eventId,
      { newEventDate, shiftDays, affectedTasksCount: updatedTasks.length }
    );

    return {
      affectedTasksCount: updatedTasks.length,
      updatedTasks
    };
  }

  // ==========================================
  // Checklists, Comments, Attachments
  // ==========================================
  addChecklistItem(studioId: string, taskId: string, title: string): Task {
    const task = this.getTask(studioId, taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    const items = task.checklist || [];
    const newItem: TaskChecklistItem = {
      id: `chk_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      title,
      completed: false
    };

    return this.updateTask(studioId, taskId, {
      checklist: [...items, newItem]
    });
  }

  toggleChecklistItem(
    studioId: string,
    taskId: string,
    itemId: string,
    completedBy?: string,
    completedByName?: string
  ): Task {
    const task = this.getTask(studioId, taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    const items = (task.checklist || []).map(item => {
      if (item.id === itemId) {
        const nextState = !item.completed;
        return {
          ...item,
          completed: nextState,
          completedBy: nextState ? completedBy : undefined,
          completedByName: nextState ? completedByName : undefined,
          completedAt: nextState ? new Date().toISOString() : undefined
        };
      }
      return item;
    });

    return this.updateTask(studioId, taskId, { checklist: items });
  }

  addComment(
    studioId: string,
    taskId: string,
    comment: { text: string; authorId: string; authorName: string; authorRole?: string; isInternal?: boolean }
  ): Task {
    const task = this.getTask(studioId, taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    const comments = task.comments || [];
    const newComment: TaskCommentItem = {
      id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      taskId,
      text: comment.text,
      authorId: comment.authorId,
      authorName: comment.authorName,
      authorRole: comment.authorRole,
      isInternal: comment.isInternal !== undefined ? comment.isInternal : true,
      createdAt: new Date().toISOString()
    };

    const updated = this.updateTask(studioId, taskId, {
      comments: [...comments, newComment]
    });

    // Notify assignee if someone else commented
    if (task.assignedToId && task.assignedToId !== comment.authorId) {
      notificationService.createNotification(studioId, {
        title: `New Comment on ${task.title}`,
        message: `${comment.authorName}: "${comment.text.slice(0, 60)}"`,
        type: 'task',
        timestamp: 'Just now',
        read: false,
        linkTab: 'tasks',
        linkId: taskId
      });
    }

    return updated;
  }

  addAttachment(
    studioId: string,
    taskId: string,
    attachment: { name: string; url: string; fileType?: string; size?: number; uploadedBy?: string; uploadedByName?: string }
  ): Task {
    const task = this.getTask(studioId, taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    const attachments = task.attachments || [];
    const newAttachment: TaskAttachmentItem = {
      id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      name: attachment.name,
      url: attachment.url,
      fileType: attachment.fileType || 'image/jpeg',
      size: attachment.size,
      uploadedBy: attachment.uploadedBy,
      uploadedByName: attachment.uploadedByName,
      uploadedAt: new Date().toISOString()
    };

    return this.updateTask(studioId, taskId, {
      attachments: [...attachments, newAttachment]
    });
  }

  // ==========================================
  // Review & Approval Workflows
  // ==========================================
  submitForReview(
    studioId: string,
    taskId: string,
    operatorId: string,
    operatorName: string
  ): Task {
    const task = this.getTask(studioId, taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    const updated = this.updateTask(
      studioId,
      taskId,
      {
        status: 'Under Review',
        approvalStatus: 'pending',
        submittedForReviewAt: new Date().toISOString()
      },
      operatorId,
      operatorName
    );

    notificationService.createNotification(studioId, {
      title: `Task Submitted for Review: ${task.title}`,
      message: `${operatorName} submitted task for quality review.`,
      type: 'task',
      timestamp: 'Just now',
      read: false,
      linkTab: 'tasks',
      linkId: taskId
    });

    return updated;
  }

  approveTask(
    studioId: string,
    taskId: string,
    reviewerId: string,
    reviewerName: string,
    reviewerRoleOrNotes?: string,
    reviewNotes?: string
  ): Task {
    const task = this.getTask(studioId, taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    let role = '';
    let notes = '';
    if (reviewNotes !== undefined) {
      role = reviewerRoleOrNotes || '';
      notes = reviewNotes;
    } else {
      notes = reviewerRoleOrNotes || 'Approved';
    }

    // Self-approval restriction: Employees cannot approve their own tasks unless Owner
    const isOwner = role === 'owner' || reviewerName.toLowerCase().includes('owner') || reviewerId.toLowerCase().includes('owner');
    if (task.assignedToId === reviewerId && !isOwner) {
      throw new Error('Self-approval forbidden: Employees cannot self-approve their own tasks.');
    }

    const now = new Date().toISOString();
    const updated = this.updateTaskStatus(
      studioId,
      taskId,
      'Completed',
      reviewerId,
      reviewerName,
      role || 'manager',
      notes
    );

    // Update approval fields
    const finalTask = this.updateTask(
      studioId,
      taskId,
      {
        approvalStatus: 'approved',
        reviewerId,
        reviewerName,
        approvedBy: reviewerName,
        reviewedAt: now,
        reviewNotes: notes
      },
      reviewerId,
      reviewerName
    );

    if (task.assignedToId) {
      notificationService.createNotification(studioId, {
        title: `Task Approved: ${task.title}`,
        message: `Approved by ${reviewerName}. Stage work completed.`,
        type: 'task',
        timestamp: 'Just now',
        read: false,
        linkTab: 'tasks',
        linkId: taskId
      });
    }

    return finalTask;
  }

  rejectTask(
    studioId: string,
    taskId: string,
    reviewerId: string,
    reviewerName: string,
    reviewerRoleOrNotes?: string,
    maybeNotes?: string
  ): Task {
    const task = this.getTask(studioId, taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    let notes = '';
    if (maybeNotes !== undefined) {
      notes = maybeNotes;
    } else {
      notes = reviewerRoleOrNotes || '';
    }

    if (!notes || !notes.trim()) {
      throw new Error('Review notes are mandatory when requesting revision.');
    }

    const now = new Date().toISOString();
    const updated = this.updateTask(
      studioId,
      taskId,
      {
        status: 'Revision Required',
        approvalStatus: 'rejected',
        reviewerId,
        reviewerName,
        reviewedAt: now,
        reviewNotes: notes
      },
      reviewerId,
      reviewerName
    );

    if (task.assignedToId) {
      notificationService.createNotification(studioId, {
        title: `Revision Requested: ${task.title}`,
        message: `${reviewerName} requested revision: "${notes}"`,
        type: 'task',
        timestamp: 'Just now',
        read: false,
        linkTab: 'tasks',
        linkId: taskId
      });
    }

    return updated;
  }

  reassignTask(
    studioId: string,
    taskId: string,
    newAssigneeId: string,
    newAssigneeName: string,
    operatorId: string,
    operatorName: string,
    reason?: string
  ): Task {
    const task = this.getTask(studioId, taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    const updated = this.updateTask(
      studioId,
      taskId,
      {
        assignedToId: newAssigneeId,
        assignedToName: newAssigneeName
      },
      operatorId,
      operatorName
    );

    notificationService.createNotification(studioId, {
      title: `Task Reassigned: ${task.title}`,
      message: `Reassigned to ${newAssigneeName} by ${operatorName}. ${reason ? `Reason: ${reason}` : ''}`,
      type: 'task',
      timestamp: 'Just now',
      read: false,
      linkTab: 'tasks',
      linkId: taskId
    });

    return updated;
  }

  // ==========================================
  // Team Workload Analytics
  // ==========================================
  getTeamWorkload(studioId: string): EmployeeWorkloadItem[] {
    if (!studioId) throw new Error('[taskService.getTeamWorkload]: studioId is required');
    const employees = TenantStore.get<Employee>(studioId, 'employees');
    const tasks = this.listTasks(studioId);
    const today = new Date().toISOString().split('T')[0];

    // Build unified map of employees including task assignees
    const employeeMap = new Map<string, { name: string; department: string; designation: string }>();
    employees.forEach(emp => {
      employeeMap.set(emp.id, { name: emp.fullName, department: emp.department, designation: emp.designation });
    });
    tasks.forEach(t => {
      if (t.assignedToId && !employeeMap.has(t.assignedToId)) {
        employeeMap.set(t.assignedToId, {
          name: t.assignedToName || t.assignedToId,
          department: t.department || 'Production',
          designation: t.department ? `${t.department} Specialist` : 'Team Member'
        });
      }
    });

    return Array.from(employeeMap.entries()).map(([empId, empInfo]) => {
      const empTasks = tasks.filter(t => t.assignedToId === empId);
      const activeTasks = empTasks.filter(t => t.status !== 'Completed' && t.status !== 'Done' && t.status !== 'Cancelled');
      const inProgress = empTasks.filter(t => t.status === 'In Progress');
      const overdue = empTasks.filter(t => t.dueDate < today && t.status !== 'Completed' && t.status !== 'Done' && t.status !== 'Cancelled');
      const completed = empTasks.filter(t => t.status === 'Completed' || t.status === 'Done');

      return {
        employeeId: empId,
        employeeName: empInfo.name,
        department: empInfo.department,
        designation: empInfo.designation,
        totalActiveTasks: activeTasks.length,
        inProgressTasks: inProgress.length,
        overdueTasks: overdue.length,
        completedTasks: completed.length,
        isOverloaded: activeTasks.length > 5
      };
    });
  }
}

export const taskService = new TaskService();
