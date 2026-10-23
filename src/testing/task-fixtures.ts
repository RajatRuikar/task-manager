import { Task } from '../app/core/models/task.model';

/** Fixed "today" used across specs so overdue logic is deterministic. */
export const TODAY = '2026-06-15';

export function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Write tests',
    description: 'Cover the store',
    status: 'todo',
    priority: 'medium',
    dueDate: '2026-06-20',
    ...overrides,
  };
}

export const SAMPLE_TASKS: readonly Task[] = [
  makeTask({
    id: 'a',
    title: 'Prepare customs docs',
    status: 'in-progress',
    priority: 'high',
    dueDate: '2026-06-10',
  }),
  makeTask({
    id: 'b',
    title: 'Book container',
    status: 'todo',
    priority: 'low',
    dueDate: '2026-06-30',
  }),
  makeTask({
    id: 'c',
    title: 'Reconcile invoices',
    status: 'completed',
    priority: 'medium',
    dueDate: '2026-06-01',
  }),
];
