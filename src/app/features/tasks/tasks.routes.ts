import { Routes } from '@angular/router';

export const TASKS_ROUTES: Routes = [
  {
    path: '',
    title: 'Tasks',
    loadComponent: () =>
      import('./pages/task-list-page/task-list-page.component').then(
        (m) => m.TaskListPageComponent,
      ),
  },
  {
    path: 'new',
    title: 'New task',
    loadComponent: () =>
      import('./pages/task-create-page/task-create-page.component').then(
        (m) => m.TaskCreatePageComponent,
      ),
  },
  {
    path: ':id/edit',
    title: 'Edit task',
    loadComponent: () =>
      import('./pages/task-edit-page/task-edit-page.component').then(
        (m) => m.TaskEditPageComponent,
      ),
  },
];
