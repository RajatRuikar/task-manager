import { Task, TaskFilters, TaskStats } from '../models/task.model';

/** Returns today's date as an ISO calendar date (YYYY-MM-DD) in local time. */
export function todayIso(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * A task is overdue when its due date is strictly before today and it is not completed.
 * ISO calendar dates compare correctly as strings, so no Date parsing / timezone issues.
 */
export function isOverdue(
  task: Pick<Task, 'dueDate' | 'status'>,
  today: string = todayIso(),
): boolean {
  return task.status !== 'completed' && task.dueDate < today;
}

export function filterTasks(tasks: readonly Task[], filters: TaskFilters): Task[] {
  const term = filters.search.trim().toLowerCase();
  return tasks.filter(
    (task) =>
      (term === '' || task.title.toLowerCase().includes(term)) &&
      (filters.status === 'all' || task.status === filters.status) &&
      (filters.priority === 'all' || task.priority === filters.priority),
  );
}

/** Single pass over the list so stats stay O(n) even for large collections. */
export function computeStats(tasks: readonly Task[], today: string = todayIso()): TaskStats {
  const stats: TaskStats = {
    total: tasks.length,
    todo: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
  };
  for (const task of tasks) {
    if (task.status === 'todo') stats.todo++;
    else if (task.status === 'in-progress') stats.inProgress++;
    else stats.completed++;
    if (isOverdue(task, today)) stats.overdue++;
  }
  return stats;
}
