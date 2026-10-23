import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';

import {
  CreateTaskDto,
  PRIORITY_LABELS,
  STATUS_LABELS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  Task,
  TaskPriority,
  TaskStatus,
} from '../../../../core/models/task.model';

export const TITLE_MIN_LENGTH = 3;

/** Rejects values that are only whitespace (Validators.required accepts "   "). */
export function notBlankValidator(control: AbstractControl<string>): ValidationErrors | null {
  return typeof control.value === 'string' &&
    control.value.length > 0 &&
    control.value.trim().length === 0
    ? { blank: true }
    : null;
}

/** minLength applied to the trimmed value so "  ab  " is rejected. */
export function trimmedMinLength(min: number) {
  return (control: AbstractControl<string>): ValidationErrors | null => {
    const length = (control.value ?? '').trim().length;
    return length > 0 && length < min
      ? { minlength: { requiredLength: min, actualLength: length } }
      : null;
  };
}

export type TaskFormGroup = FormGroup<{
  title: FormControl<string>;
  description: FormControl<string>;
  // Selects start empty so "required" is meaningful; '' is never submitted.
  status: FormControl<TaskStatus | ''>;
  priority: FormControl<TaskPriority | ''>;
  dueDate: FormControl<string>;
}>;

/**
 * Reusable create/edit form. Presentational: it knows nothing about the store or routing.
 * Pass `task` to switch to edit mode; listen to `submitted` for a validated DTO.
 */
@Component({
  selector: 'app-task-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './task-form.component.html',
  styleUrl: './task-form.component.scss',
})
export class TaskFormComponent {
  private readonly fb = inject(NonNullableFormBuilder);

  readonly task = input<Task | null>(null);
  readonly saving = input(false);
  readonly submitLabel = input('Save task');

  readonly submitted = output<CreateTaskDto>();
  readonly cancelled = output<void>();

  protected readonly statuses = TASK_STATUSES;
  protected readonly priorities = TASK_PRIORITIES;
  protected readonly statusLabels = STATUS_LABELS;
  protected readonly priorityLabels = PRIORITY_LABELS;
  protected readonly titleMinLength = TITLE_MIN_LENGTH;

  /** Set after the first submit attempt so all errors are shown, even on untouched fields. */
  protected readonly submitAttempted = signal(false);

  readonly form: TaskFormGroup = this.fb.group({
    title: ['', [Validators.required, notBlankValidator, trimmedMinLength(TITLE_MIN_LENGTH)]],
    description: ['', [Validators.maxLength(500)]],
    status: this.fb.control<TaskStatus | ''>('todo', Validators.required),
    priority: this.fb.control<TaskPriority | ''>('medium', Validators.required),
    dueDate: ['', Validators.required],
  });

  constructor() {
    // Patch the form whenever the task input changes (edit mode).
    effect(() => {
      const task = this.task();
      if (task) {
        this.form.reset({
          title: task.title,
          description: task.description ?? '',
          status: task.status,
          priority: task.priority,
          dueDate: task.dueDate,
        });
      }
    });
  }

  /** True when a control's errors should be displayed. */
  protected showErrors(name: keyof TaskFormGroup['controls']): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || this.submitAttempted());
  }

  protected onSubmit(): void {
    this.submitAttempted.set(true);
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    const { title, description, status, priority, dueDate } = this.form.getRawValue();
    // Narrowing: validators guarantee status/priority are non-empty here.
    if (status === '' || priority === '') return;

    const trimmedDescription = description.trim();
    this.submitted.emit({
      title: title.trim(),
      ...(trimmedDescription ? { description: trimmedDescription } : {}),
      status,
      priority,
      dueDate,
    });
  }
}
