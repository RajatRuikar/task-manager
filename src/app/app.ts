import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

import { ToastContainerComponent } from './shared/components/toast-container/toast-container.component';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, ToastContainerComponent],
  template: `
    <a class="skip-link" href="#main">Skip to content</a>
    <header class="app-header">
      <div class="container">
        <a routerLink="/tasks" class="brand">Task Manager</a>
      </div>
    </header>
    <main id="main" class="container">
      <router-outlet />
    </main>
    <app-toast-container />
  `,
})
export class App {}
