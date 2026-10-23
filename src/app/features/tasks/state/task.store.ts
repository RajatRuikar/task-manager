import { Injectable, computed, inject, signal } from '@angular/core';
import { EMPTY, Observable, catchError, defer, finalize, tap } from 'rxjs';

import { TaskApiService } from '../../../core/api/task-api.service';
import { CreateTaskDto, Task, TaskFilters, UpdateTaskDto } from '../../../core/models/task.model';
import { NotificationService } from '../../../core/notifications/notification.service';
import { toErrorMessage } from '../../../core/utils/error.utils';
import { computeStats, filterTasks, todayIso } from '../../../core/utils/task.utils';

export interface TaskState {
  tasks: readonly Task[];
  /** True while the task list is being fetched. */
  loading: boolean;
  /** True while a create/update request is in flight. */
  saving: boolean;
  /** Has the list been fetched successfully at least once? */
  loaded: boolean;
  /** Last load error, shown in place of the list. Mutation errors go to toasts. */
  error: string | null;
}

const initialState: TaskState = {
  tasks: [],
  loading: false,
  saving: false,
  loaded: false,
  error: null,
};

export const DEFAULT_FILTERS: TaskFilters = { search: '', status: 'all', priority: 'all' };

/**
 * Signal-based store – the single source of truth for task data.
 *
 * - State lives in one private writable signal and is only ever replaced (never mutated).
 * - Components read through readonly/computed signals and call intent methods.
 * - All HTTP goes through TaskApiService; the store owns loading/error/feedback handling.
 */
@Injectable({ providedIn: 'root' })
export class TaskStore {
  private readonly api = inject(TaskApiService);
  private readonly notifications = inject(NotificationService);

  private readonly state = signal<TaskState>(initialState);
  private readonly _filters = signal<TaskFilters>(DEFAULT_FILTERS);

  // ---- Selectors ---------------------------------------------------------
  readonly tasks = computed(() => this.state().tasks);
  readonly loading = computed(() => this.state().loading);
  readonly saving = computed(() => this.state().saving);
  readonly loaded = computed(() => this.state().loaded);
  readonly error = computed(() => this.state().error);
  readonly filters = this._filters.asReadonly();

  /** Today's date, captured once per store instance; overridable for tests. */
  readonly today = signal(todayIso());

  readonly filteredTasks = computed(() => filterTasks(this.tasks(), this._filters()));
  readonly stats = computed(() => computeStats(this.tasks(), this.today()));
  readonly hasActiveFilters = computed(() => {
    const f = this._filters();
    return f.search.trim() !== '' || f.status !== 'all' || f.priority !== 'all';
  });

  taskById(id: string): Task | undefined {
    return this.tasks().find((t) => t.id === id);
  }

  // ---- Filters -----------------------------------------------------------
  updateFilters(patch: Partial<TaskFilters>): void {
    this._filters.update((f) => ({ ...f, ...patch }));
  }

  resetFilters(): void {
    this._filters.set(DEFAULT_FILTERS);
  }

  // ---- Commands ----------------------------------------------------------

  /**
   * Fetches the task list. Skips the request when data is already cached unless `force` is set.
   * The HTTP observable completes after one emission, so the internal subscription cleans itself up.
   */
  loadTasks(force = false): void {
    if (this.state().loading || (this.state().loaded && !force)) return;

    this.patch({ loading: true, error: null });
    this.api.getAll().subscribe({
      next: (tasks) => this.patch({ tasks, loading: false, loaded: true }),
      error: (err: unknown) =>
        this.patch({ loading: false, error: toErrorMessage(err, 'Tasks could not be loaded.') }),
    });
  }

  /**
   * Creates a task. Returns a cold observable (nothing happens until subscribed) that emits the created task on success and
   * completes without emitting on failure (the error is already surfaced to the user).
   */
  createTask(dto: CreateTaskDto): Observable<Task> {
    return defer(() => {
      this.patch({ saving: true });
      return this.api.create(dto);
    }).pipe(
      tap((created) => {
        this.patch({ tasks: [...this.tasks(), created] });
        this.notifications.success(`Task "${created.title}" created.`);
      }),
      catchError((err: unknown) => this.handleMutationError(err, 'Task could not be created.')),
      finalize(() => this.patch({ saving: false })),
    );
  }

  updateTask(id: string, dto: UpdateTaskDto): Observable<Task> {
    return defer(() => {
      this.patch({ saving: true });
      return this.api.update(id, dto);
    }).pipe(
      tap((updated) => {
        this.patch({ tasks: this.tasks().map((t) => (t.id === id ? updated : t)) });
        this.notifications.success(`Task "${updated.title}" updated.`);
      }),
      catchError((err: unknown) => this.handleMutationError(err, 'Task could not be updated.')),
      finalize(() => this.patch({ saving: false })),
    );
  }

  /**
   * Optimistic delete: the task disappears immediately and is restored at its original
   * position if the API call fails. The store owns this subscription (rather than the
   * calling component) so navigating away cannot cancel the request and leave the UI
   * out of sync with the server; the HTTP observable completes on its own.
   */
  deleteTask(id: string): void {
    const previous = this.tasks();
    const index = previous.findIndex((t) => t.id === id);
    if (index === -1) return;
    const task = previous[index];

    this.patch({ tasks: previous.filter((t) => t.id !== id) });
    this.api.delete(id).subscribe({
      next: () => this.notifications.success(`Task "${task.title}" deleted.`),
      error: (err: unknown) => {
        // Re-insert only this task so other changes made meanwhile are not lost.
        const current = [...this.tasks()];
        current.splice(Math.min(index, current.length), 0, task);
        this.patch({ tasks: current });
        this.notifications.error(toErrorMessage(err, 'Task could not be deleted.'));
      },
    });
  }

  // ---- Helpers -----------------------------------------------------------
  private patch(partial: Partial<TaskState>): void {
    this.state.update((s) => ({ ...s, ...partial }));
  }

  private handleMutationError(err: unknown, fallback: string): Observable<never> {
    this.notifications.error(toErrorMessage(err, fallback));
    return EMPTY;
  }
}
