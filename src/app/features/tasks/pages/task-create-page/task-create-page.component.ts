import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { CreateTaskDto } from '../../../../core/models/task.model';
import { TaskFormComponent } from '../../components/task-form/task-form.component';
import { TaskStore } from '../../state/task.store';

@Component({
  selector: 'app-task-create-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TaskFormComponent],
  template: `
    <header class="page-header">
      <h1>New task</h1>
    </header>
    <app-task-form
      submitLabel="Create task"
      [saving]="store.saving()"
      (submitted)="create($event)"
      (cancelled)="backToList()"
    />
  `,
})
export class TaskCreatePageComponent {
  protected readonly store = inject(TaskStore);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected create(dto: CreateTaskDto): void {
    this.store
      .createTask(dto)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.backToList());
  }

  protected backToList(): void {
    void this.router.navigate(['/tasks']);
  }
}
