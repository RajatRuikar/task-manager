import { ChangeDetectionStrategy, Component, OnInit, inject, input, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, map } from 'rxjs';

import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TaskFilters,
} from '../../../../core/models/task.model';

export const SEARCH_DEBOUNCE_MS = 300;

@Component({
  selector: 'app-task-filters',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <form class="filters" [formGroup]="form" role="search" (submit)="$event.preventDefault()">
      <div class="field search">
        <label for="task-search">Search by title</label>
        <input id="task-search" type="search" formControlName="search" placeholder="e.g. customs" />
      </div>
      <div class="field">
        <label for="status-filter">Status</label>
        <select id="status-filter" formControlName="status">
          <option value="all">All statuses</option>
          @for (status of statuses; track status) {
            <option [value]="status">{{ statusLabels[status] }}</option>
          }
        </select>
      </div>
      <div class="field">
        <label for="priority-filter">Priority</label>
        <select id="priority-filter" formControlName="priority">
          <option value="all">All priorities</option>
          @for (priority of priorities; track priority) {
            <option [value]="priority">{{ priorityLabels[priority] }}</option>
          }
        </select>
      </div>
      <button type="button" class="btn btn-secondary reset" (click)="reset()">Clear filters</button>
    </form>
  `,
  styles: `
    .filters {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr auto;
      gap: 12px;
      align-items: end;
    }
    @media (max-width: 720px) {
      .filters {
        grid-template-columns: 1fr 1fr;
      }
      .search,
      .reset {
        grid-column: 1 / -1;
      }
    }
  `,
})
export class TaskFiltersComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);

  readonly filters = input.required<TaskFilters>();
  readonly filtersChange = output<Partial<TaskFilters>>();

  protected readonly statuses = TASK_STATUSES;
  protected readonly priorities = TASK_PRIORITIES;
  protected readonly statusLabels = STATUS_LABELS;
  protected readonly priorityLabels = PRIORITY_LABELS;

  protected readonly form = this.fb.group({
    search: [''],
    status: this.fb.control<TaskFilters['status']>('all'),
    priority: this.fb.control<TaskFilters['priority']>('all'),
  });

  constructor() {
    const { search, status, priority } = this.form.controls;

    // Search is debounced to avoid re-filtering on every keystroke; selects apply immediately.
    search.valueChanges
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        map((v) => v.trim()),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((value) => this.filtersChange.emit({ search: value }));

    status.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value) => this.filtersChange.emit({ status: value }));

    priority.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value) => this.filtersChange.emit({ priority: value }));
  }

  ngOnInit(): void {
    // Restore filters kept in the store (e.g. when navigating back from the edit page).
    this.form.setValue(this.filters(), { emitEvent: false });
  }

  protected reset(): void {
    this.form.setValue({ search: '', status: 'all', priority: 'all' }, { emitEvent: false });
    this.filtersChange.emit({ search: '', status: 'all', priority: 'all' });
  }
}
