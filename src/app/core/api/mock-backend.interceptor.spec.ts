import { HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { Task } from '../models/task.model';
import {
  MOCK_BACKEND_CONFIG,
  MockBackendConfig,
  mockBackendInterceptor,
  resetMockBackend,
} from './mock-backend.interceptor';
import { TaskApiService } from './task-api.service';

describe('mockBackendInterceptor', () => {
  let api: TaskApiService;
  const config: MockBackendConfig = { latencyMs: 0, forceError: false, storage: null };

  beforeEach(() => {
    resetMockBackend();
    config.forceError = false;
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([mockBackendInterceptor])),
        { provide: MOCK_BACKEND_CONFIG, useValue: config },
      ],
    });
    api = TestBed.inject(TaskApiService);
  });

  const dto: Omit<Task, 'id'> = {
    title: 'Mocked',
    status: 'todo',
    priority: 'low',
    dueDate: '2026-01-01',
  };

  it('supports the full CRUD cycle', async () => {
    const initial = await firstValueFrom(api.getAll());
    const created = await firstValueFrom(api.create(dto));
    expect(created.id).toBeTruthy();
    expect(await firstValueFrom(api.getAll())).toHaveLength(initial.length + 1);

    const updated = await firstValueFrom(api.update(created.id, { ...dto, status: 'completed' }));
    expect(updated).toEqual({ ...dto, id: created.id, status: 'completed' });

    await firstValueFrom(api.delete(created.id), { defaultValue: undefined });
    expect(await firstValueFrom(api.getAll())).toHaveLength(initial.length);
  });

  it('rejects invalid payloads with 400 and unknown ids with 404', async () => {
    await expect(firstValueFrom(api.create({ ...dto, title: 'ab' }))).rejects.toMatchObject({
      status: 400,
    });
    await expect(firstValueFrom(api.update('missing', dto))).rejects.toMatchObject({ status: 404 });
  });

  it('fails every request when forceError is enabled', async () => {
    config.forceError = true;
    const error = await firstValueFrom(api.getAll()).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(HttpErrorResponse);
    expect((error as HttpErrorResponse).status).toBe(500);
  });
});
