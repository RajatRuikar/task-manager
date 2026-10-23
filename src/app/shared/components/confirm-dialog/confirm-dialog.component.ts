import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  input,
  output,
  viewChild,
} from '@angular/core';

let nextId = 0;

/**
 * Reusable, accessible confirmation dialog.
 * Purely presentational: the parent owns the `open` state and reacts to the outputs.
 */
@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'onEscape()' },
  template: `
    @if (open()) {
      <div class="backdrop" (click)="cancelled.emit()"></div>
      <div
        class="dialog"
        role="alertdialog"
        aria-modal="true"
        [attr.aria-labelledby]="titleId"
        [attr.aria-describedby]="messageId"
      >
        <h2 [id]="titleId">{{ title() }}</h2>
        <p [id]="messageId">{{ message() }}</p>
        <div class="actions">
          <button #cancelButton type="button" class="btn btn-secondary" (click)="cancelled.emit()">
            {{ cancelLabel() }}
          </button>
          <button
            type="button"
            class="btn btn-danger"
            data-testid="confirm-button"
            (click)="confirmed.emit()"
          >
            {{ confirmLabel() }}
          </button>
        </div>
      </div>
    }
  `,
  styleUrl: './confirm-dialog.component.scss',
})
export class ConfirmDialogComponent {
  readonly open = input(false);
  readonly title = input('Are you sure?');
  readonly message = input('');
  readonly confirmLabel = input('Confirm');
  readonly cancelLabel = input('Cancel');

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  protected readonly titleId = `confirm-dialog-title-${nextId}`;
  protected readonly messageId = `confirm-dialog-message-${nextId++}`;

  private readonly cancelButton = viewChild<ElementRef<HTMLButtonElement>>('cancelButton');

  constructor() {
    // Move focus into the dialog when it opens; the safe action (cancel) gets focus.
    afterRenderEffect(() => this.cancelButton()?.nativeElement.focus());
  }

  protected onEscape(): void {
    if (this.open()) this.cancelled.emit();
  }
}
