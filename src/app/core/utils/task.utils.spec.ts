import { SAMPLE_TASKS, TODAY, makeTask } from '../../../testing/task-fixtures';
import { computeStats, filterTasks, isOverdue, todayIso } from './task.utils';

describe('task utils', () => {
  describe('isOverdue', () => {
    it('is true when the due date is before today and the task is not completed', () => {
      expect(isOverdue(makeTask({ dueDate: '2026-06-14', status: 'todo' }), TODAY)).toBe(true);
      expect(isOverdue(makeTask({ dueDate: '2026-06-14', status: 'in-progress' }), TODAY)).toBe(
        true,
      );
    });

    it('is false for tasks due today or later', () => {
      expect(isOverdue(makeTask({ dueDate: TODAY }), TODAY)).toBe(false);
      expect(isOverdue(makeTask({ dueDate: '2026-07-01' }), TODAY)).toBe(false);
    });

    it('is false for completed tasks even when past due', () => {
      expect(isOverdue(makeTask({ dueDate: '2020-01-01', status: 'completed' }), TODAY)).toBe(
        false,
      );
    });
  });

  describe('filterTasks', () => {
    it('matches title case-insensitively and ignores surrounding whitespace', () => {
      const result = filterTasks(SAMPLE_TASKS, {
        search: '  CUSTOMS ',
        status: 'all',
        priority: 'all',
      });
      expect(result.map((t) => t.id)).toEqual(['a']);
    });

    it('combines status and priority filters', () => {
      expect(
        filterTasks(SAMPLE_TASKS, { search: '', status: 'todo', priority: 'low' }).map((t) => t.id),
      ).toEqual(['b']);
      expect(filterTasks(SAMPLE_TASKS, { search: '', status: 'todo', priority: 'high' })).toEqual(
        [],
      );
    });

    it('does not mutate the input array', () => {
      const input = [...SAMPLE_TASKS];
      filterTasks(input, { search: 'x', status: 'completed', priority: 'all' });
      expect(input).toEqual(SAMPLE_TASKS);
    });
  });

  it('computeStats counts each status and overdue tasks', () => {
    expect(computeStats(SAMPLE_TASKS, TODAY)).toEqual({
      total: 3,
      todo: 1,
      inProgress: 1,
      completed: 1,
      overdue: 1, // 'a' – 'c' is past due but completed
    });
  });

  it('todayIso formats a local date as YYYY-MM-DD', () => {
    expect(todayIso(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});
