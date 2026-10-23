import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { makeTask } from '../../../testing/task-fixtures';
import { TASKS_API_URL, TaskApiService } from './task-api.service';

describe('TaskApiService', () => {
  let service: TaskApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TaskApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('GETs the task collection', () => {
    const tasks = [makeTask()];
    let result: unknown;
    service.getAll().subscribe((r) => (result = r));

    const req = http.expectOne(TASKS_API_URL);
    expect(req.request.method).toBe('GET');
    req.flush(tasks);

    expect(result).toEqual(tasks);
  });

  it('POSTs, PUTs and DELETEs with the right URL and body', () => {
    const { id, ...dto } = makeTask({ id: 'x/1' });

    service.create(dto).subscribe();
    const post = http.expectOne({ method: 'POST', url: TASKS_API_URL });
    expect(post.request.body).toEqual(dto);
    post.flush({ ...dto, id });

    service.update(id, dto).subscribe();
    // ids are URL-encoded so they cannot break the path
    const put = http.expectOne({ method: 'PUT', url: `${TASKS_API_URL}/x%2F1` });
    expect(put.request.body).toEqual(dto);
    put.flush({ ...dto, id });

    service.delete(id).subscribe();
    http
      .expectOne({ method: 'DELETE', url: `${TASKS_API_URL}/x%2F1` })
      .flush(null, { status: 204, statusText: 'No Content' });
  });

  it('propagates API errors to the caller as HttpErrorResponse', () => {
    let error: unknown;
    service.getAll().subscribe({ error: (e) => (error = e) });

    http
      .expectOne(TASKS_API_URL)
      .flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });

    expect(error).toBeInstanceOf(HttpErrorResponse);
    expect((error as HttpErrorResponse).status).toBe(500);
  });
});
