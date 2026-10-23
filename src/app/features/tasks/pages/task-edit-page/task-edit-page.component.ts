import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  input,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';

import { CreateTaskDto } from '../../../../core/models/task.model';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { TaskFormComponent } from '../../components/task-form/task-form.component';
import { TaskStore } from '../../state/task.store';

@Component({
  selector: 'app-task-edit-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TaskFormComponent, EmptyStateComponent, LoadingSpinnerComponent],
  template: `
    <header class="page-header">
      <h1>Edit task</h1>
    </header>

    @if (store.loading()) {
      <app-loading-spinner label="Loading task…" />
    } @else if (store.error(); as error) {
      <app-empty-state variant="error" heading="Could not load task" [message]="error">
        <button type="button" class="btn btn-primary" (click)="store.loadTasks(true)">
          Try again
        </button>
      </app-empty-state>
    } @else if (task(); as task) {
      <app-task-form
        submitLabel="Save changes"
        [task]="task"
        [saving]="store.saving()"
        (submitted)="save($event)"
        (cancelled)="backToList()"
      />
    } @else if (store.loaded()) {
      <app-empty-state
        heading="Task not found"
        message="This task does not exist or has been deleted."
      >
        <a class="btn btn-primary" routerLink="/tasks">Back to tasks</a>
      </app-empty-state>
    }
  `,
})
export class TaskEditPageComponent implements OnInit {
  protected readonly store = inject(TaskStore);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /** Bound from the `:id` route param via withComponentInputBinding(). */
  readonly id = input.required<string>();

  /** Read from the store (single source of truth) rather than holding a separate copy. */
  protected readonly task = computed(
    () => this.store.tasks().find((t) => t.id === this.id()) ?? null,
  );

  ngOnInit(): void {
    // Supports deep-linking/refreshing directly on the edit URL.
    this.store.loadTasks();
  }

  protected save(dto: CreateTaskDto): void {
    this.store
      .updateTask(this.id(), dto)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.backToList());
  }

  protected backToList(): void {
    void this.router.navigate(['/tasks']);
  }
}
