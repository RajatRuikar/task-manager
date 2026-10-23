import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import type { Mock } from 'vitest';

import { SAMPLE_TASKS, TODAY, makeTask } from '../../../../testing/task-fixtures';
import { TaskApiService } from '../../../core/api/task-api.service';
import { Task } from '../../../core/models/task.model';
import { NotificationService } from '../../../core/notifications/notification.service';
import { TaskStore } from './task.store';

type ApiMock = { [K in keyof TaskApiService]: Mock<TaskApiService[K]> };

function serverError(status = 500): Observable<never> {
  return throwError(() => new HttpErrorResponse({ status }));
}

describe('TaskStore', () => {
  let store: TaskStore;
  let api: ApiMock;
  let notifications: { success: Mock; error: Mock };

  beforeEach(() => {
    api = {
      getAll: vi.fn(() => of([...SAMPLE_TASKS])),
      getById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    notifications = { success: vi.fn(), error: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: TaskApiService, useValue: api },
        { provide: NotificationService, useValue: notifications },
      ],
    });
    store = TestBed.inject(TaskStore);
    store.today.set(TODAY);
  });

  describe('loadTasks', () => {
    it('toggles loading while the request is pending and stores the result', () => {
      const response = new Subject<Task[]>();
      api.getAll.mockReturnValue(response);

      store.loadTasks();
      expect(store.loading()).toBe(true);

      response.next([...SAMPLE_TASKS]);
      response.complete();

      expect(store.loading()).toBe(false);
      expect(store.loaded()).toBe(true);
      expect(store.tasks()).toEqual(SAMPLE_TASKS);
    });

    it('uses the cached list on subsequent calls unless forced', () => {
      store.loadTasks();
      store.loadTasks();
      expect(api.getAll).toHaveBeenCalledTimes(1);

      store.loadTasks(true);
      expect(api.getAll).toHaveBeenCalledTimes(2);
    });

    it('exposes a user-friendly error when the API fails', () => {
      api.getAll.mockReturnValue(serverError(503));

      store.loadTasks();

      expect(store.loading()).toBe(false);
      expect(store.loaded()).toBe(false);
      expect(store.error()).toMatch(/server encountered an error/i);
    });
  });

  describe('derived state', () => {
    beforeEach(() => store.loadTasks());

    it('computes statistics from the task list', () => {
      expect(store.stats()).toEqual({ total: 3, todo: 1, inProgress: 1, completed: 1, overdue: 1 });
    });

    it('recomputes filtered tasks and stats when the source changes', () => {
      store.updateFilters({ status: 'completed' });
      expect(store.filteredTasks().map((t) => t.id)).toEqual(['c']);
      expect(store.hasActiveFilters()).toBe(true);

      store.resetFilters();
      expect(store.filteredTasks()).toHaveLength(3);
      expect(store.hasActiveFilters()).toBe(false);
    });
  });

  describe('mutations', () => {
    beforeEach(() => store.loadTasks());

    it('createTask appends the server response immutably and reports success', () => {
      const before = store.tasks();
      const created = makeTask({ id: 'new', title: 'New task' });
      const { id, ...dto } = created;
      api.create.mockReturnValue(of(created));

      let emitted: Task | undefined;
      store.createTask(dto).subscribe((t) => (emitted = t));

      expect(api.create).toHaveBeenCalledWith(dto);
      expect(emitted).toEqual(created);
      expect(store.tasks()).toEqual([...before, created]);
      expect(store.tasks()).not.toBe(before);
      expect(before).toHaveLength(3); // previous state snapshot untouched
      expect(store.saving()).toBe(false);
      expect(notifications.success).toHaveBeenCalledWith('Task "New task" created.');
    });

    it('createTask does nothing until subscribed (cold)', () => {
      store.createTask(makeTask());
      expect(api.create).not.toHaveBeenCalled();
      expect(store.saving()).toBe(false);
    });

    it('updateTask replaces only the matching task and recomputes stats', () => {
      const { id, ...dto } = { ...SAMPLE_TASKS[0], status: 'completed' as const };
      api.update.mockReturnValue(of({ ...dto, id }));
      const untouched = store.tasks()[1];

      store.updateTask(id, dto).subscribe();

      expect(store.taskById(id)?.status).toBe('completed');
      expect(store.tasks()[1]).toBe(untouched);
      expect(store.stats().completed).toBe(2);
      expect(store.stats().overdue).toBe(0);
    });

    it('updateTask surfaces API errors, keeps state and completes without emitting', () => {
      api.update.mockReturnValue(serverError(404));
      const before = store.tasks();
      const next = vi.fn();
      const complete = vi.fn();

      store.updateTask('a', makeTask()).subscribe({ next, complete });

      expect(next).not.toHaveBeenCalled();
      expect(complete).toHaveBeenCalled();
      expect(store.tasks()).toBe(before);
      expect(store.saving()).toBe(false);
      expect(notifications.error).toHaveBeenCalledWith(
        expect.stringMatching(/could not be found/i),
      );
    });

    it('deleteTask removes the task optimistically before the API responds', () => {
      const response = new Subject<void>();
      api.delete.mockReturnValue(response);

      store.deleteTask('b');
      expect(store.tasks().map((t) => t.id)).toEqual(['a', 'c']);

      response.next();
      response.complete();
      expect(notifications.success).toHaveBeenCalledWith('Task "Book container" deleted.');
    });

    it('deleteTask rolls back to the original position when the API fails', () => {
      const response = new Subject<void>();
      api.delete.mockReturnValue(response);

      store.deleteTask('b');
      expect(store.tasks()).toHaveLength(2);

      response.error(new HttpErrorResponse({ status: 500 }));

      expect(store.tasks().map((t) => t.id)).toEqual(['a', 'b', 'c']);
      expect(notifications.error).toHaveBeenCalledWith(
        expect.stringMatching(/server encountered an error/i),
      );
    });
  });
});
