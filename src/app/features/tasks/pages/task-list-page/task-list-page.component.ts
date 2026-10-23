import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Task } from '../../../../core/models/task.model';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { TaskFiltersComponent } from '../../components/task-filters/task-filters.component';
import { TaskSummaryComponent } from '../../components/task-summary/task-summary.component';
import { TaskTableComponent } from '../../components/task-table/task-table.component';
import { TaskStore } from '../../state/task.store';

/** Container component: connects the store to presentational components. */
@Component({
  selector: 'app-task-list-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    ConfirmDialogComponent,
    EmptyStateComponent,
    LoadingSpinnerComponent,
    TaskFiltersComponent,
    TaskSummaryComponent,
    TaskTableComponent,
  ],
  templateUrl: './task-list-page.component.html',
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
  `,
})
export class TaskListPageComponent implements OnInit {
  protected readonly store = inject(TaskStore);

  /** Task awaiting delete confirmation; null when the dialog is closed. */
  protected readonly pendingDelete = signal<Task | null>(null);

  ngOnInit(): void {
    this.store.loadTasks();
  }

  protected retry(): void {
    this.store.loadTasks(true);
  }

  protected requestDelete(task: Task): void {
    this.pendingDelete.set(task);
  }

  protected cancelDelete(): void {
    this.pendingDelete.set(null);
  }

  protected confirmDelete(): void {
    const task = this.pendingDelete();
    this.pendingDelete.set(null);
    if (!task) return;
    this.store.deleteTask(task.id);
  }
}
