import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { CreateTaskDto, Task, UpdateTaskDto } from '../models/task.model';

export const TASKS_API_URL = '/api/tasks';

/**
 * Thin data-access layer. This is the only place in the app that talks to HttpClient;
 * it has no state and no UI concerns, so swapping the backend only touches this file.
 */
@Injectable({ providedIn: 'root' })
export class TaskApiService {
  private readonly http = inject(HttpClient);

  getAll(): Observable<Task[]> {
    return this.http.get<Task[]>(TASKS_API_URL);
  }

  getById(id: string): Observable<Task> {
    return this.http.get<Task>(`${TASKS_API_URL}/${encodeURIComponent(id)}`);
  }

  create(dto: CreateTaskDto): Observable<Task> {
    return this.http.post<Task>(TASKS_API_URL, dto);
  }

  update(id: string, dto: UpdateTaskDto): Observable<Task> {
    return this.http.put<Task>(`${TASKS_API_URL}/${encodeURIComponent(id)}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${TASKS_API_URL}/${encodeURIComponent(id)}`);
  }
}
