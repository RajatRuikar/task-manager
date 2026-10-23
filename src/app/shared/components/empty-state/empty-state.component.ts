import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Generic empty / error placeholder. Projected content is rendered as actions. */
@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="empty"
      [class.error]="variant() === 'error'"
      [attr.role]="variant() === 'error' ? 'alert' : null"
    >
      <h2>{{ heading() }}</h2>
      @if (message()) {
        <p>{{ message() }}</p>
      }
      <div class="actions"><ng-content /></div>
    </div>
  `,
  styles: `
    .empty {
      text-align: center;
      padding: 48px 16px;
      border: 1px dashed var(--border);
      border-radius: var(--radius);
      background: var(--surface);
    }
    .empty.error {
      border-color: var(--danger);
      background: var(--danger-soft);
    }
    h2 {
      margin: 0 0 8px;
      font-size: 1.1rem;
    }
    p {
      margin: 0 0 16px;
      color: var(--text-muted);
    }
    .actions {
      display: flex;
      gap: 8px;
      justify-content: center;
    }
  `,
})
export class EmptyStateComponent {
  readonly heading = input.required<string>();
  readonly message = input<string>('');
  readonly variant = input<'empty' | 'error'>('empty');
}
