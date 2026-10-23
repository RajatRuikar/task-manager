import { ComponentFixture, TestBed } from '@angular/core/testing';

import { makeTask } from '../../../../../testing/task-fixtures';
import { CreateTaskDto } from '../../../../core/models/task.model';
import { TaskFormComponent } from './task-form.component';

describe('TaskFormComponent', () => {
  let fixture: ComponentFixture<TaskFormComponent>;
  let component: TaskFormComponent;
  let el: HTMLElement;
  let submitted: CreateTaskDto[];

  const query = <T extends Element>(selector: string) => el.querySelector<T>(selector);

  function type(selector: string, value: string): void {
    const input = query<HTMLInputElement | HTMLTextAreaElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
  }

  async function submit(): Promise<void> {
    query<HTMLButtonElement>('[data-testid="submit-button"]')!.click();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    fixture = TestBed.createComponent(TaskFormComponent);
    component = fixture.componentInstance;
    el = fixture.nativeElement;
    submitted = [];
    component.submitted.subscribe((dto) => submitted.push(dto));
    await fixture.whenStable();
  });

  it('shows required errors and does not emit when submitted empty', async () => {
    component.form.controls.status.setValue('');
    component.form.controls.priority.setValue('');

    await submit();

    expect(query('[data-testid="title-error"]')?.textContent).toContain('Title is required.');
    expect(query('[data-testid="status-error"]')?.textContent).toContain('Status is required.');
    expect(query('[data-testid="priority-error"]')?.textContent).toContain('Priority is required.');
    expect(query('[data-testid="dueDate-error"]')?.textContent).toContain('Due date is required.');
    expect(submitted).toEqual([]);
  });

  it('requires the title to have at least three non-blank characters', async () => {
    type('#title', 'ab');
    await fixture.whenStable();
    expect(component.form.controls.title.hasError('minlength')).toBe(true);
    expect(query('[data-testid="title-error"]')?.textContent).toContain('at least 3 characters');

    type('#title', '     ');
    await fixture.whenStable();
    expect(component.form.controls.title.hasError('blank')).toBe(true);
    expect(query('[data-testid="title-error"]')?.textContent).toContain('Title is required.');

    type('#title', ' abc ');
    await fixture.whenStable();
    expect(component.form.controls.title.valid).toBe(true);
    expect(query('[data-testid="title-error"]')).toBeNull();
  });

  it('does not show errors before the user interacts with a field', () => {
    expect(component.form.invalid).toBe(true);
    expect(query('.error')).toBeNull();
  });

  it('emits a trimmed DTO when the form is valid', async () => {
    type('#title', '  Ship order  ');
    type('#description', '   ');
    type('#dueDate', '2026-07-01');

    await submit();

    expect(submitted).toEqual([
      { title: 'Ship order', status: 'todo', priority: 'medium', dueDate: '2026-07-01' },
    ]);
  });

  it('pre-fills the form in edit mode', async () => {
    const task = makeTask({
      title: 'Existing',
      status: 'completed',
      priority: 'high',
      dueDate: '2026-01-02',
    });
    fixture.componentRef.setInput('task', task);
    await fixture.whenStable();

    expect(query<HTMLInputElement>('#title')!.value).toBe('Existing');
    expect(component.form.getRawValue()).toEqual({
      title: 'Existing',
      description: task.description,
      status: 'completed',
      priority: 'high',
      dueDate: '2026-01-02',
    });
  });

  it('disables submit and shows progress while saving', async () => {
    fixture.componentRef.setInput('saving', true);
    await fixture.whenStable();

    const button = query<HTMLButtonElement>('[data-testid="submit-button"]')!;
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain('Saving');
  });
});
