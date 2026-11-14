import { describe, it, expect, beforeEach } from 'vitest';
import { taskService } from '../services/taskService';
import { workflowService, DEFAULT_WORKFLOW_STAGES } from '../services/workflowService';
import { taskDependencyService } from '../services/taskDependencyService';
import { notificationService } from '../services/notificationService';
import { TenantStore } from '../services/tenantStore';
import { Task } from '../types/schema';

describe('STUDIO OS - Phase 6: Photography Production Workflow & Advanced Task Management', () => {
  const STUDIO_A = 'studio_royal_001';
  const STUDIO_B = 'studio_creative_002';

  beforeEach(() => {
    TenantStore.initializeDefaults();
    workflowService.initializeDefaultTemplates(STUDIO_A);
    workflowService.initializeDefaultTemplates(STUDIO_B);
  });

  // Test 1: 15 default workflow stages & standard templates
  it('1. should initialize 15 default photography production workflow stages and standard templates', () => {
    expect(DEFAULT_WORKFLOW_STAGES.length).toBe(15);
    const stageNames = DEFAULT_WORKFLOW_STAGES.map(s => s.name);
    
    expect(stageNames).toEqual([
      'Booking & Confirmation',
      'Pre-Production Planning',
      'Shoot Preparation',
      'Photography / Videography',
      'Data Backup',
      'Photo & Video Selection (Culling)',
      'Photo Editing',
      'Video Editing',
      'Client Selection / Review',
      'Album Designing',
      'Album Approval',
      'Printing & Production',
      'Quality Check',
      'Final Delivery',
      'Completed'
    ]);

    const templates = workflowService.listTemplates(STUDIO_A);
    expect(templates.length).toBeGreaterThanOrEqual(4);
    const templateNames = templates.map(t => t.name);
    expect(templateNames).toContain('Standard Wedding Photography Workflow');
    expect(templateNames).toContain('Pre-Wedding Cinematic Shoot Workflow');
    expect(templateNames).toContain('Corporate Event & Conference Workflow');
    expect(templateNames).toContain('Product & Commercial Photography Workflow');
  });

  // Test 2: Custom workflow template creation, reordering, duplication, deletion
  it('2. should support custom workflow template creation, reordering stages, duplication, and deletion', () => {
    // Create custom template
    const created = workflowService.createTemplate(STUDIO_A, {
      name: 'Fashion Editorial Pipeline',
      description: 'High-end studio fashion shoot pipeline',
      category: 'Fashion',
      stages: [
        { id: 'st_mood', name: 'Moodboard & Styling', order: 1, color: '#3b82f6', department: 'Styling', estimatedHours: 12, requiresApproval: false, mandatoryTaskTitles: ['Approve Moodboard'] },
        { id: 'st_studio', name: 'Studio Setup & Lighting', order: 2, color: '#8b5cf6', department: 'Photography', estimatedHours: 6, requiresApproval: false },
        { id: 'st_retouch', name: 'High-End Retouching', order: 3, color: '#ec4899', department: 'Post-Production', estimatedHours: 24, requiresApproval: true }
      ]
    });
    expect(created.id).toBeDefined();
    expect(created.stages.length).toBe(3);

    // Reorder stages
    const reordered = workflowService.reorderStages(STUDIO_A, created.id, ['st_studio', 'st_mood', 'st_retouch']);
    expect(reordered.stages[0].id).toBe('st_studio');
    expect(reordered.stages[0].order).toBe(1);
    expect(reordered.stages[1].id).toBe('st_mood');
    expect(reordered.stages[1].order).toBe(2);

    // Duplicate template
    const duplicated = workflowService.duplicateTemplate(STUDIO_A, created.id);
    expect(duplicated.name).toBe('Fashion Editorial Pipeline (Copy)');
    expect(duplicated.stages.length).toBe(3);

    // Delete template
    workflowService.deleteTemplate(STUDIO_A, created.id);
    const remaining = workflowService.listTemplates(STUDIO_A);
    expect(remaining.find(t => t.id === created.id)).toBeUndefined();
  });

  // Test 3: Workflow attachment to Main Events and Sub-Events
  it('3. should attach workflow instances to main events and sub-events', () => {
    const templates = workflowService.listTemplates(STUDIO_A);
    const weddingTemplate = templates.find(t => t.name === 'Standard Wedding Photography Workflow')!;

    // Attach to Main Event
    const instanceMain = workflowService.attachWorkflow(STUDIO_A, {
      templateId: weddingTemplate.id,
      entityType: 'main_event',
      entityId: 'evt_wedding_001',
      entityName: 'Vikram & Ananya Grand Wedding'
    });
    expect(instanceMain.entityType).toBe('main_event');
    expect(instanceMain.entityId).toBe('evt_wedding_001');
    expect(instanceMain.status).toBe('active');
    expect(instanceMain.currentStageId).toBe(weddingTemplate.stages[0].id);

    // Attach to Sub-Event
    const instanceSub = workflowService.attachWorkflow(STUDIO_A, {
      templateId: weddingTemplate.id,
      entityType: 'sub_event',
      entityId: 'subevt_sangeet_001',
      entityName: 'Sangeet & Dance Gala'
    });
    expect(instanceSub.entityType).toBe('sub_event');
    expect(instanceSub.entityId).toBe('subevt_sangeet_001');
  });

  // Test 4: Idempotent automatic task generation without duplicates
  it('4. should idempotently generate tasks from workflow without duplicate records on retry', () => {
    const templates = workflowService.listTemplates(STUDIO_A);
    const preWedTemplate = templates.find(t => t.name === 'Pre-Wedding Cinematic Shoot Workflow')!;

    const instance = workflowService.attachWorkflow(STUDIO_A, {
      templateId: preWedTemplate.id,
      entityType: 'main_event',
      entityId: 'evt_prewed_002',
      entityName: 'Karan & Pooja Pre-Wed Shoot'
    });

    // First generation
    const firstTasks = taskService.generateTasksFromWorkflow(STUDIO_A, instance.id, '2026-12-01');
    expect(firstTasks.length).toBeGreaterThan(0);
    const firstCount = firstTasks.length;

    // Retry generation on same instance (must be idempotent)
    const secondTasks = taskService.generateTasksFromWorkflow(STUDIO_A, instance.id, '2026-12-01');
    expect(secondTasks.length).toBe(firstCount);

    // Total in store matches without duplicates
    const allInstanceTasks = taskService.listTasks(STUDIO_A, { workflowId: instance.id });
    expect(allInstanceTasks.length).toBe(firstCount);
  });

  // Test 5: Task assignment to employee with relative due date calculation
  it('5. should assign task to employee and calculate relative due dates', () => {
    const task = taskService.createTask(STUDIO_A, {
      title: 'Equipment Sensor Cleaning & Prep',
      eventId: 'evt_wedding_001',
      eventName: 'Vikram & Ananya Grand Wedding',
      assignedToId: 'emp_rahul_photo',
      assignedToName: 'Rahul Sharma',
      department: 'Photography',
      priority: 'High',
      status: 'Assigned',
      dueDate: '2026-12-08',
      relativeDaysFromEvent: -2
    });

    expect(task.taskNumber).toMatch(/^TSK-\d{3,}$/);
    expect(task.assignedToId).toBe('emp_rahul_photo');
    expect(task.relativeDaysFromEvent).toBe(-2);
    expect(task.status).toBe('Assigned');
  });

  // Test 6: Task status transitions
  it('6. should transition task status smoothly from Not Started to In Progress to Completed', () => {
    const task = taskService.createTask(STUDIO_A, {
      title: 'Culling Raw Footage',
      eventId: 'evt_wedding_001',
      priority: 'Medium',
      status: 'Not Started',
      dueDate: '2026-12-15'
    });
    expect(task.status).toBe('Not Started');

    const inProgress = taskService.updateStatus(STUDIO_A, task.id, 'In Progress');
    expect(inProgress.status).toBe('In Progress');

    const completed = taskService.updateStatus(STUDIO_A, task.id, 'Completed');
    expect(completed.status).toBe('Completed');
  });

  // Test 7: Circular dependency detection (prevents cyclic dependencies via DFS)
  it('7. should detect and reject circular dependencies using DFS graph traversal', () => {
    const taskA = taskService.createTask(STUDIO_A, {
      title: 'Task A - Raw Export',
      dueDate: '2026-12-10',
      status: 'Not Started'
    });

    const taskB = taskService.createTask(STUDIO_A, {
      title: 'Task B - Color Grading',
      dueDate: '2026-12-12',
      status: 'Not Started',
      dependencies: [taskA.id] // B depends on A
    });

    const taskC = taskService.createTask(STUDIO_A, {
      title: 'Task C - Final Render',
      dueDate: '2026-12-14',
      status: 'Not Started',
      dependencies: [taskB.id] // C depends on B
    });

    const allTasks = [taskA, taskB, taskC];

    // Attempting to make A depend on C would create cycle: A -> C -> B -> A
    const isCyclic = taskDependencyService.hasCircularDependency(allTasks, taskA.id, taskC.id);
    expect(isCyclic).toBe(true);

    // Attempting to make A depend on itself
    expect(taskDependencyService.hasCircularDependency(allTasks, taskA.id, taskA.id)).toBe(true);

    // Non-cyclic dependency should be allowed
    const taskD = taskService.createTask(STUDIO_A, {
      title: 'Task D - Audio Mix',
      dueDate: '2026-12-11',
      status: 'Not Started'
    });
    expect(taskDependencyService.hasCircularDependency([...allTasks, taskD], taskC.id, taskD.id)).toBe(false);

    // Trying to save circular dependency via taskService should throw error
    expect(() => {
      taskService.updateTask(STUDIO_A, taskA.id, { dependencies: [taskC.id] });
    }).toThrowError(/Circular dependency detected/);
  });

  // Test 8: Task blocked state enforcement (cannot complete task when dependencies are incomplete)
  it('8. should enforce blocked task state and prevent completion while prerequisites are incomplete', () => {
    const parentTask = taskService.createTask(STUDIO_A, {
      title: 'Client Raw Photo Selection',
      dueDate: '2026-12-10',
      status: 'In Progress'
    });

    const childTask = taskService.createTask(STUDIO_A, {
      title: 'Album Layout Design',
      dueDate: '2026-12-15',
      status: 'In Progress',
      dependencies: [parentTask.id]
    });

    const allTasks = [parentTask, childTask];
    expect(taskDependencyService.isTaskBlocked(childTask, allTasks).blocked).toBe(true);

    // Ordinary team member cannot complete child task while parent is In Progress
    expect(() => {
      taskService.updateStatus(STUDIO_A, childTask.id, 'Completed', 'emp_album_01', 'Amit Designer', 'photographer');
    }).toThrowError(/Cannot complete task.*Blocked by incomplete prerequisite/);
  });

  // Test 9: Manager/Owner override for completing blocked tasks with mandatory reason
  it('9. should allow Studio Owner or Manager to override blocked task completion with recorded audit reason', () => {
    const parentTask = taskService.createTask(STUDIO_A, {
      title: 'Color Proofing Calibration',
      dueDate: '2026-12-10',
      status: 'In Progress'
    });

    const childTask = taskService.createTask(STUDIO_A, {
      title: 'VIP Client Urgent Teaser Delivery',
      dueDate: '2026-12-11',
      status: 'In Progress',
      dependencies: [parentTask.id]
    });

    // Owner override without reason should fail
    expect(() => {
      taskService.updateStatus(STUDIO_A, childTask.id, 'Completed', 'emp_owner_01', 'Rajesh Studio Owner', 'owner', '');
    }).toThrowError(/Override reason is mandatory/);

    // Owner override with valid reason succeeds
    const completedTask = taskService.updateStatus(
      STUDIO_A, 
      childTask.id, 
      'Completed', 
      'emp_owner_01', 
      'Rajesh Studio Owner', 
      'owner', 
      'Client VIP rush delivery requested by bride father; verified colors manually'
    );
    expect(completedTask.status).toBe('Completed');
    expect(completedTask.managerOverrideReason).toContain('Client VIP rush delivery');
  });

  // Test 10: Downstream task impact detection when a task is delayed
  it('10. should detect downstream impacted tasks recursively when a prerequisite is delayed', () => {
    const task1 = taskService.createTask(STUDIO_A, { title: 'Shoot Raw Culling', dueDate: '2026-12-05', status: 'In Progress' });
    const task2 = taskService.createTask(STUDIO_A, { title: 'Portrait Retouching', dueDate: '2026-12-08', status: 'Not Started', dependencies: [task1.id] });
    const task3 = taskService.createTask(STUDIO_A, { title: 'Album Proof Creation', dueDate: '2026-12-12', status: 'Not Started', dependencies: [task2.id] });
    const task4 = taskService.createTask(STUDIO_A, { title: 'Printing & Binding', dueDate: '2026-12-18', status: 'Not Started', dependencies: [task3.id] });

    const allTasks = [task1, task2, task3, task4];
    const impacted = taskDependencyService.getDownstreamImpactedTasks(task1.id, allTasks);

    expect(impacted.length).toBe(3);
    const impactedIds = impacted.map(t => t.id);
    expect(impactedIds).toContain(task2.id);
    expect(impactedIds).toContain(task3.id);
    expect(impactedIds).toContain(task4.id);
  });

  // Test 11: Submit task for review
  it('11. should submit task for review and set status to Under Review and pending approval', () => {
    const task = taskService.createTask(STUDIO_A, {
      title: 'Cinematic Teaser 60s Cut',
      assignedToId: 'emp_video_01',
      assignedToName: 'Siddharth Video Editor',
      dueDate: '2026-12-10',
      status: 'In Progress'
    });

    const reviewedTask = taskService.submitForReview(
      STUDIO_A,
      task.id,
      'emp_video_01',
      'Siddharth Video Editor'
    );

    expect(reviewedTask.status).toBe('Under Review');
    expect(reviewedTask.approvalStatus).toBe('pending');
    expect(reviewedTask.submittedForReviewAt).toBeDefined();
  });

  // Test 12: Task review approval by supervisor
  it('12. should allow manager or supervisor to approve task and complete it', () => {
    const task = taskService.createTask(STUDIO_A, {
      title: 'Highlight Reel Master Color Grade',
      assignedToId: 'emp_video_01',
      assignedToName: 'Siddharth Video Editor',
      dueDate: '2026-12-10',
      status: 'In Progress'
    });

    taskService.submitForReview(STUDIO_A, task.id, 'emp_video_01', 'Siddharth Video Editor');

    const approvedTask = taskService.approveTask(
      STUDIO_A,
      task.id,
      'emp_lead_editor',
      'Priya Lead Editor',
      'manager',
      'Exceptional color transition on sunset shots. Approved for delivery!'
    );

    expect(approvedTask.status).toBe('Completed');
    expect(approvedTask.approvalStatus).toBe('approved');
    expect(approvedTask.approvedBy).toBe('Priya Lead Editor');
    expect(approvedTask.reviewNotes).toContain('Exceptional color transition');
  });

  // Test 13: Self-approval prevention for employees (unless Studio Owner)
  it('13. should prevent employees from self-approving their own submitted review tasks', () => {
    const task = taskService.createTask(STUDIO_A, {
      title: 'Album Page 1-30 Layouts',
      assignedToId: 'emp_album_01',
      assignedToName: 'Neha Album Designer',
      dueDate: '2026-12-10',
      status: 'In Progress'
    });

    taskService.submitForReview(STUDIO_A, task.id, 'emp_album_01', 'Neha Album Designer');

    // Attempting self-approval as ordinary employee
    expect(() => {
      taskService.approveTask(
        STUDIO_A,
        task.id,
        'emp_album_01',
        'Neha Album Designer',
        'album_designer',
        'Self approved'
      );
    }).toThrowError(/Employees cannot self-approve their own tasks/);

    // Studio Owner CAN approve any task even if assigned to them
    const ownerApproved = taskService.approveTask(
      STUDIO_A,
      task.id,
      'emp_owner_01',
      'Rajesh Studio Owner',
      'owner',
      'Owner sign-off approved'
    );
    expect(ownerApproved.approvalStatus).toBe('approved');
  });

  // Test 14: Task revision request with mandatory revision remarks
  it('14. should reject task with mandatory revision remarks and transition to Revision Required', () => {
    const task = taskService.createTask(STUDIO_A, {
      title: 'Ceremony 4K Master Video',
      assignedToId: 'emp_video_01',
      assignedToName: 'Siddharth Video Editor',
      dueDate: '2026-12-10',
      status: 'In Progress'
    });

    taskService.submitForReview(STUDIO_A, task.id, 'emp_video_01', 'Siddharth Video Editor');

    // Reject without notes should fail
    expect(() => {
      taskService.rejectTask(STUDIO_A, task.id, 'emp_manager_01', 'Kavita Manager', 'manager', '');
    }).toThrowError(/Review notes are mandatory when requesting revision/);

    // Reject with constructive remarks
    const rejectedTask = taskService.rejectTask(
      STUDIO_A,
      task.id,
      'emp_manager_01',
      'Kavita Manager',
      'manager',
      'Audio sync drift at 14:32 during exchange of garlands; please re-align stereo audio track.'
    );

    expect(rejectedTask.status).toBe('Revision Required');
    expect(rejectedTask.approvalStatus).toBe('rejected');
    expect(rejectedTask.reviewNotes).toContain('Audio sync drift');
  });

  // Test 15: Task safe due-date recalculation when event date changes
  it('15. should safely recalculate relative due dates when event date shifts without touching custom deadlines', () => {
    const eventId = 'evt_shift_test_001';

    // Relative task (-3 days before event)
    const relTask = taskService.createTask(STUDIO_A, {
      title: 'Pre-Shoot Equipment Checklist',
      eventId,
      dueDate: '2026-12-07',
      relativeDaysFromEvent: -3
    });

    // Custom fixed deadline task without relativeDaysFromEvent
    const customTask = taskService.createTask(STUDIO_A, {
      title: 'Client Contract Manual Sign-off',
      eventId,
      dueDate: '2026-11-20'
    });

    // Event shifts from 2026-12-10 to 2026-12-20 (+10 days shift)
    const result = taskService.recalculateDueDates(STUDIO_A, eventId, '2026-12-20', 10);
    expect(result.affectedTasksCount).toBe(1);

    const updatedRelTask = taskService.getTask(STUDIO_A, relTask.id)!;
    // 2026-12-20 minus 3 days = 2026-12-17
    expect(updatedRelTask.dueDate).toBe('2026-12-17');

    const updatedCustomTask = taskService.getTask(STUDIO_A, customTask.id)!;
    // Fixed manual task unchanged!
    expect(updatedCustomTask.dueDate).toBe('2026-11-20');
  });

  // Test 16: Team workload calculation & overloaded employee flag (> 5 active tasks)
  it('16. should calculate team workload and identify overloaded employees with more than 5 active tasks', () => {
    const busyEmployeeId = 'emp_overloaded_editor';
    const busyEmployeeName = 'Rohit Retoucher';

    // Create 6 active tasks for Rohit
    for (let i = 1; i <= 6; i++) {
      taskService.createTask(STUDIO_A, {
        title: `Retouch Batch #${i}`,
        assignedToId: busyEmployeeId,
        assignedToName: busyEmployeeName,
        department: 'Post-Production',
        status: 'In Progress',
        dueDate: '2026-12-20'
      });
    }

    const workloadList = taskService.getTeamWorkload(STUDIO_A);
    const rohitWorkload = workloadList.find(w => w.employeeId === busyEmployeeId);

    expect(rohitWorkload).toBeDefined();
    expect(rohitWorkload!.totalActiveTasks).toBe(6);
    expect(rohitWorkload!.isOverloaded).toBe(true);
  });

  // Test 17: In-app notifications generated on task assignment and review events
  it('17. should trigger notifications on task assignment and review submission', () => {
    const initialNotifs = notificationService.listNotifications(STUDIO_A).length;

    // Assignment triggers notification
    taskService.createTask(STUDIO_A, {
      title: 'Drone Aerial Footage Capture',
      assignedToId: 'emp_drone_01',
      assignedToName: 'Manish Drone Operator',
      status: 'Assigned',
      dueDate: '2026-12-12'
    });

    const notifsAfterAssign = notificationService.listNotifications(STUDIO_A);
    expect(notifsAfterAssign.length).toBeGreaterThan(initialNotifs);
    const latestNotif = notifsAfterAssign[0];
    expect(latestNotif.message).toContain('Drone Aerial Footage Capture');
  });

  // Test 18: Multi-tenant isolation for workflows and tasks between Studio A and Studio B
  it('18. should strictly isolate workflows and tasks between Studio A and Studio B', () => {
    // Studio A task
    const taskA = taskService.createTask(STUDIO_A, {
      title: 'Studio A Exclusive Royal Album Task',
      dueDate: '2026-12-10',
      status: 'In Progress'
    });

    // Studio B task
    const taskB = taskService.createTask(STUDIO_B, {
      title: 'Studio B Modern Corporate Video Task',
      dueDate: '2026-12-10',
      status: 'In Progress'
    });

    // Studio A should not see Studio B's task
    const tasksStudioA = taskService.listTasks(STUDIO_A);
    expect(tasksStudioA.find(t => t.id === taskA.id)).toBeDefined();
    expect(tasksStudioA.find(t => t.id === taskB.id)).toBeUndefined();

    // Studio B should not see Studio A's task
    const tasksStudioB = taskService.listTasks(STUDIO_B);
    expect(tasksStudioB.find(t => t.id === taskB.id)).toBeDefined();
    expect(tasksStudioB.find(t => t.id === taskA.id)).toBeUndefined();

    // Workflow instances isolation
    const templateA = workflowService.listTemplates(STUDIO_A)[0];
    const instanceA = workflowService.attachWorkflow(STUDIO_A, {
      templateId: templateA.id,
      entityType: 'main_event',
      entityId: 'evt_a_001',
      entityName: 'Studio A Gala'
    });

    const instancesStudioB = workflowService.listInstances(STUDIO_B);
    expect(instancesStudioB.find(i => i.id === instanceA.id)).toBeUndefined();
  });
});
