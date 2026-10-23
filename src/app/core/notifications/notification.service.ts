import { Injectable, signal } from '@angular/core';

export type NotificationKind = 'success' | 'error' | 'info';

export interface AppNotification {
  id: number;
  kind: NotificationKind;
  message: string;
}

/** App-wide toast queue. Holds UI feedback only – no business state. */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly _notifications = signal<readonly AppNotification[]>([]);
  readonly notifications = this._notifications.asReadonly();

  private nextId = 1;

  success(message: string): void {
    this.show('success', message);
  }

  error(message: string): void {
    // Errors stay longer so users have time to read them.
    this.show('error', message, 6000);
  }

  info(message: string): void {
    this.show('info', message);
  }

  dismiss(id: number): void {
    this._notifications.update((list) => list.filter((n) => n.id !== id));
  }

  private show(kind: NotificationKind, message: string, durationMs = 3500): void {
    const id = this.nextId++;
    this._notifications.update((list) => [...list, { id, kind, message }]);
    setTimeout(() => this.dismiss(id), durationMs);
  }
}
