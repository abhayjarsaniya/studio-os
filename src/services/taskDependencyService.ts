import { Task } from '../types/schema';

export class TaskDependencyService {
  /**
   * Detects whether adding `proposedPrerequisiteId` as a dependency for `taskId`
   * will create a circular loop (Cycle Detection using DFS).
   */
  hasCircularDependency(allTasks: Task[], taskId: string, proposedPrerequisiteId: string): boolean {
    if (taskId === proposedPrerequisiteId) return true;

    // Build adjacency graph: prerequisite -> dependent tasks
    const graph: Map<string, string[]> = new Map();
    allTasks.forEach(t => {
      const deps = t.dependencies || [];
      deps.forEach(depId => {
        const existing = graph.get(depId) || [];
        existing.push(t.id);
        graph.set(depId, existing);
      });
    });

    // Add proposed edge: proposedPrerequisiteId -> taskId
    const proposedDependents = graph.get(proposedPrerequisiteId) || [];
    proposedDependents.push(taskId);
    graph.set(proposedPrerequisiteId, proposedDependents);

    // Run DFS starting from taskId to see if it can reach proposedPrerequisiteId
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const dfs = (curr: string): boolean => {
      visited.add(curr);
      recStack.add(curr);

      const neighbors = graph.get(curr) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) return true;
        } else if (recStack.has(neighbor)) {
          return true; // Cycle detected!
        }
      }

      recStack.delete(curr);
      return false;
    };

    return dfs(taskId);
  }

  /**
   * Checks if a task is currently blocked by incomplete prerequisite tasks
   */
  isTaskBlocked(task: Task, allTasks: Task[]): { blocked: boolean; blockingTaskIds: string[]; blockingTasks: Task[] } {
    const deps = task.dependencies || [];
    if (deps.length === 0) {
      return { blocked: false, blockingTaskIds: [], blockingTasks: [] };
    }

    const taskMap = new Map<string, Task>(allTasks.map(t => [t.id, t]));
    const blockingTasks: Task[] = [];
    const blockingTaskIds: string[] = [];

    deps.forEach(depId => {
      const depTask = taskMap.get(depId);
      if (depTask) {
        const isCompleted = depTask.status === 'Completed' || depTask.status === 'Done';
        if (!isCompleted) {
          blockingTasks.push(depTask);
          blockingTaskIds.push(depId);
        }
      }
    });

    return {
      blocked: blockingTasks.length > 0,
      blockingTaskIds,
      blockingTasks
    };
  }

  getBlockingTasks(task: Task, allTasks: Task[]): Task[] {
    return this.isTaskBlocked(task, allTasks).blockingTasks;
  }

  /**
   * Validates if task status can be set to 'Completed'.
   * If dependencies are incomplete, manager override with mandatory reason is required.
   */
  canCompleteTask(
    task: Task,
    allTasks: Task[],
    isManagerOrOwner: boolean = false,
    overrideReason?: string
  ): { allowed: boolean; reason?: string } {
    const check = this.isTaskBlocked(task, allTasks);
    if (!check.blocked) {
      return { allowed: true };
    }

    if (isManagerOrOwner) {
      if (overrideReason !== undefined && !overrideReason.trim()) {
        return {
          allowed: false,
          reason: 'Override reason is mandatory when completing a blocked task.'
        };
      }
      return {
        allowed: true,
        reason: 'Manager override permitted for incomplete dependencies.'
      };
    }

    const titles = check.blockingTasks.map(t => `"${t.title}"`).join(', ');
    return {
      allowed: false,
      reason: `Cannot complete task "${task.title}". Blocked by incomplete prerequisite: ${titles}.`
    };
  }

  /**
   * Traverses graph downstream to find all tasks that depend directly or indirectly on this task.
   * Useful when a task is delayed to identify downstream schedule risk.
   */
  getDownstreamImpactedTasks(taskOrId: Task | string, allTasks: Task[]): Task[] {
    const taskId = typeof taskOrId === 'string' ? taskOrId : taskOrId.id;
    const taskMap = new Map<string, Task>(allTasks.map(t => [t.id, t]));
    const graph: Map<string, string[]> = new Map();

    allTasks.forEach(t => {
      (t.dependencies || []).forEach(depId => {
        const list = graph.get(depId) || [];
        list.push(t.id);
        graph.set(depId, list);
      });
    });

    const impacted = new Set<string>();
    const queue = [taskId];

    while (queue.length > 0) {
      const curr = queue.shift()!;
      const dependents = graph.get(curr) || [];
      for (const d of dependents) {
        if (!impacted.has(d)) {
          impacted.add(d);
          queue.push(d);
        }
      }
    }

    return Array.from(impacted)
      .map(id => taskMap.get(id)!)
      .filter(Boolean);
  }
}

export const taskDependencyService = new TaskDependencyService();
