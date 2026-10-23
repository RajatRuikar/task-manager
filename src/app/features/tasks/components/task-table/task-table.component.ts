import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PRIORITY_LABELS, STATUS_LABELS, Task } from '../../../../core/models/task.model';
import { isOverdue } from '../../../../core/utils/task.utils';

/** Presentational task list. Renders as a table on desktop and as cards on small screens. */
@Component({
  selector: 'app-task-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe],
  templateUrl: './task-table.component.html',
  styleUrl: './task-table.component.scss',
})
export class TaskTableComponent {
  readonly tasks = input.required<readonly Task[]>();
  /** Today's date (YYYY-MM-DD), injected so overdue logic is deterministic and testable. */
  readonly today = input.required<string>();

  readonly deleteRequested = output<Task>();

  protected readonly statusLabels = STATUS_LABELS;
  protected readonly priorityLabels = PRIORITY_LABELS;

  protected isOverdue(task: Task): boolean {
    return isOverdue(task, this.today());
  }
}
