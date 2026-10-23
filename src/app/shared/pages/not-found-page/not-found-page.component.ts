import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';

@Component({
  selector: 'app-not-found-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, EmptyStateComponent],
  template: `
    <app-empty-state
      heading="404 – Page not found"
      message="The page you are looking for does not exist."
    >
      <a class="btn btn-primary" routerLink="/tasks">Back to tasks</a>
    </app-empty-state>
  `,
})
export class NotFoundPageComponent {}
