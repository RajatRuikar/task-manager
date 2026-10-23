import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import type { Mock } from 'vitest';

import { SAMPLE_TASKS, TODAY } from '../../../../../testing/task-fixtures';
import { TaskApiService } from '../../../../core/api/task-api.service';
import { Task } from '../../../../core/models/task.model';
import { TaskStore } from '../../state/task.store';
import { TaskListPageComponent } from './task-list-page.component';

/**
 * Integration-style component test: real store + presentational children,
 * only the API boundary is mocked.
 */
describe('TaskListPageComponent', () => {
  let fixture: ComponentFixture<TaskListPageComponent>;
  let el: HTMLElement;
  let api: { getAll: Mock; delete: Mock };

  const rows = () => Array.from(el.querySelectorAll('[data-testid="task-row"]'));
  const text = () => el.textContent ?? '';

  async function render(): Promise<void> {
    fixture = TestBed.createComponent(TaskListPageComponent);
    el = fixture.nativeElement;
    TestBed.inject(TaskStore).today.set(TODAY);
    await fixture.whenStable();
  }

  beforeEach(() => {
    api = { getAll: vi.fn(() => of([...SAMPLE_TASKS])), delete: vi.fn() };
    TestBed.configureTestingModule({
      imports: [TaskListPageComponent],
      providers: [provideRouter([]), { provide: TaskApiService, useValue: api }],
    });
  });

  it('shows a loading indicator until tasks arrive', async () => {
    const response = new Subject<Task[]>();
    api.getAll.mockReturnValue(response);
    await render();

    expect(el.querySelector('app-loading-spinner')).not.toBeNull();

    response.next([...SAMPLE_TASKS]);
    response.complete();
    await fixture.whenStable();

    expect(el.querySelector('app-loading-spinner')).toBeNull();
    expect(rows()).toHaveLength(3);
  });

  it('renders tasks, the summary and flags overdue tasks', async () => {
    await render();

    expect(rows()).toHaveLength(3);
    expect(el.querySelector('[data-testid="stat-total"]')?.textContent?.trim()).toBe('3');
    expect(el.querySelector('[data-testid="stat-overdue"]')?.textContent?.trim()).toBe('1');

    const overdueRows = rows().filter((r) => r.querySelector('[data-testid="overdue-badge"]'));
    expect(overdueRows).toHaveLength(1);
    expect(overdueRows[0].textContent).toContain('Prepare customs docs');
  });

  it('shows an empty state when no tasks match the filters', async () => {
    await render();
    const select = el.querySelector<HTMLSelectElement>('#priority-filter')!;
    select.value = 'high';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(rows()).toHaveLength(1);

    const status = el.querySelector<HTMLSelectElement>('#status-filter')!;
    status.value = 'completed';
    status.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    expect(rows()).toHaveLength(0);
    expect(text()).toContain('No matching tasks');
  });

  it('asks for confirmation before deleting and removes the task on confirm', async () => {
    api.delete.mockReturnValue(of(undefined));
    await render();

    rows()[1].querySelector<HTMLButtonElement>('[data-testid="delete-button"]')!.click();
    await fixture.whenStable();

    const dialog = el.querySelector('[role="alertdialog"]');
    expect(dialog?.textContent).toContain('Book container');
    expect(api.delete).not.toHaveBeenCalled();

    el.querySelector<HTMLButtonElement>('[data-testid="confirm-button"]')!.click();
    await fixture.whenStable();

    expect(api.delete).toHaveBeenCalledWith('b');
    expect(el.querySelector('[role="alertdialog"]')).toBeNull();
    expect(rows().map((r) => r.textContent)).not.toContainEqual(
      expect.stringContaining('Book container'),
    );
  });

  it('keeps the task when deletion is cancelled', async () => {
    await render();

    rows()[0].querySelector<HTMLButtonElement>('[data-testid="delete-button"]')!.click();
    await fixture.whenStable();
    el.querySelector<HTMLButtonElement>('.dialog .btn-secondary')!.click();
    await fixture.whenStable();

    expect(api.delete).not.toHaveBeenCalled();
    expect(rows()).toHaveLength(3);
  });

  it('shows a friendly error with a retry action when loading fails', async () => {
    api.getAll.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 0 })));
    await render();

    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Unable to reach the server');

    el.querySelector<HTMLButtonElement>('[role="alert"] button')!.click();
    await fixture.whenStable();

    expect(api.getAll).toHaveBeenCalledTimes(2);
    expect(rows()).toHaveLength(3);
  });
});
