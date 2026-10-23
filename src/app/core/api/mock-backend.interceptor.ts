import {
  HttpErrorResponse,
  HttpEvent,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { InjectionToken, inject } from '@angular/core';
import { Observable, delay, dematerialize, materialize, of, throwError } from 'rxjs';

import { CreateTaskDto, TASK_PRIORITIES, TASK_STATUSES, Task } from '../models/task.model';
import { createSeedTasks } from './mock-data';
import { TASKS_API_URL } from './task-api.service';

export interface MockBackendConfig {
  /** Simulated network latency in ms. */
  latencyMs: number;
  /** When true every request fails with a 500 – used to demo/test error handling. */
  forceError: boolean;
  /** Persist data between page reloads. */
  storage: Storage | null;
}

const STORAGE_KEY = 'task-manager.tasks';

function readForceErrorFlag(): boolean {
  try {
    return new URLSearchParams(globalThis.location?.search ?? '').has('failApi');
  } catch {
    return false;
  }
}

function safeLocalStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export const MOCK_BACKEND_CONFIG = new InjectionToken<MockBackendConfig>('MOCK_BACKEND_CONFIG', {
  providedIn: 'root',
  factory: () => ({
    latencyMs: 500,
    forceError: readForceErrorFlag(),
    storage: safeLocalStorage(),
  }),
});

/** In-memory "database" backing the fake REST API. */
export class MockTaskDb {
  private tasks: Task[];

  constructor(private readonly storage: Storage | null) {
    this.tasks = this.load();
  }

  list(): Task[] {
    return [...this.tasks];
  }

  find(id: string): Task | undefined {
    return this.tasks.find((t) => t.id === id);
  }

  insert(dto: CreateTaskDto): Task {
    const task: Task = { ...dto, id: crypto.randomUUID() };
    this.tasks = [...this.tasks, task];
    this.save();
    return task;
  }

  replace(id: string, dto: CreateTaskDto): Task | undefined {
    if (!this.find(id)) return undefined;
    const updated: Task = { ...dto, id };
    this.tasks = this.tasks.map((t) => (t.id === id ? updated : t));
    this.save();
    return updated;
  }

  remove(id: string): boolean {
    const before = this.tasks.length;
    this.tasks = this.tasks.filter((t) => t.id !== id);
    this.save();
    return this.tasks.length !== before;
  }

  private load(): Task[] {
    try {
      const raw = this.storage?.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as Task[];
    } catch {
      // Corrupt storage – fall back to seed data.
    }
    return createSeedTasks();
  }

  private save(): void {
    try {
      this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.tasks));
    } catch {
      // Storage full / unavailable – keep working in memory.
    }
  }
}

function validate(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return 'Request body is required.';
  const dto = body as Partial<CreateTaskDto>;
  if (typeof dto.title !== 'string' || dto.title.trim().length < 3) {
    return 'Title must contain at least three characters.';
  }
  if (!TASK_STATUSES.includes(dto.status as Task['status'])) return 'Status is invalid.';
  if (!TASK_PRIORITIES.includes(dto.priority as Task['priority'])) return 'Priority is invalid.';
  if (typeof dto.dueDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dto.dueDate)) {
    return 'Due date is invalid.';
  }
  return null;
}

function toDto(body: CreateTaskDto): CreateTaskDto {
  const description = body.description?.trim();
  return {
    title: body.title.trim(),
    ...(description ? { description } : {}),
    status: body.status,
    priority: body.priority,
    dueDate: body.dueDate,
  };
}

function ok<T>(body: T, status = 200): Observable<HttpEvent<T>> {
  return of(new HttpResponse<T>({ status, body }));
}

function fail(req: HttpRequest<unknown>, status: number, message: string): Observable<never> {
  return throwError(
    () => new HttpErrorResponse({ status, statusText: message, url: req.url, error: { message } }),
  );
}

function handle(req: HttpRequest<unknown>, db: MockTaskDb): Observable<HttpEvent<unknown>> {
  const id = decodeURIComponent(req.url.slice(TASKS_API_URL.length + 1));
  const isCollection = req.url === TASKS_API_URL;

  switch (req.method) {
    case 'GET': {
      if (isCollection) return ok(db.list());
      const task = db.find(id);
      return task ? ok(task) : fail(req, 404, 'Task not found.');
    }
    case 'POST': {
      if (!isCollection) break;
      const error = validate(req.body);
      return error ? fail(req, 400, error) : ok(db.insert(toDto(req.body as CreateTaskDto)), 201);
    }
    case 'PUT': {
      if (isCollection) break;
      const error = validate(req.body);
      if (error) return fail(req, 400, error);
      const updated = db.replace(id, toDto(req.body as CreateTaskDto));
      return updated ? ok(updated) : fail(req, 404, 'Task not found.');
    }
    case 'DELETE': {
      if (isCollection) break;
      return db.remove(id) ? ok(null, 204) : fail(req, 404, 'Task not found.');
    }
  }
  return fail(req, 405, 'Method not allowed.');
}

let sharedDb: MockTaskDb | null = null;

/**
 * Fake REST backend implemented as an HTTP interceptor. The rest of the app uses
 * HttpClient exactly as it would against a real API – removing this interceptor from
 * `app.config.ts` is all that is needed to point at a real server.
 */
export const mockBackendInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url !== TASKS_API_URL && !req.url.startsWith(`${TASKS_API_URL}/`)) {
    return next(req);
  }

  const config = inject(MOCK_BACKEND_CONFIG);
  sharedDb ??= new MockTaskDb(config.storage);

  const response$ = config.forceError
    ? fail(req, 500, 'Simulated server error.')
    : handle(req, sharedDb);

  // materialize/dematerialize so errors are delayed just like successful responses.
  return response$.pipe(materialize(), delay(config.latencyMs), dematerialize());
};

/** Test helper – resets the in-memory database between specs. */
export function resetMockBackend(): void {
  sharedDb = null;
}
