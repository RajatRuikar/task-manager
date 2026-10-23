import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { TaskStats } from '../../../../core/models/task.model';

@Component({
  selector: 'app-task-summary',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="summary" aria-label="Task summary">
      <div class="stat">
        <span class="label">Total tasks</span>
        <span class="value" data-testid="stat-total">{{ stats().total }}</span>
      </div>
      <div class="stat">
        <span class="label">Completed</span>
        <span class="value success" data-testid="stat-completed">{{ stats().completed }}</span>
      </div>
      <div class="stat">
        <span class="label">In progress</span>
        <span class="value info" data-testid="stat-in-progress">{{ stats().inProgress }}</span>
      </div>
      <div class="stat">
        <span class="label">Overdue</span>
        <span class="value danger" data-testid="stat-overdue">{{ stats().overdue }}</span>
      </div>
    </section>
  `,
  styles: `
    .summary {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
    }
    @media (max-width: 720px) {
      .summary {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    .stat {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 16px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
    }
    .label {
      font-size: 0.85rem;
      color: var(--text-muted);
    }
    .value {
      font-size: 1.75rem;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
    .success {
      color: var(--success);
    }
    .info {
      color: var(--primary);
    }
    .danger {
      color: var(--danger);
    }
  `,
})
export class TaskSummaryComponent {
  readonly stats = input.required<TaskStats>();
}
