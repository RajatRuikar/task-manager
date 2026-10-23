# Task Manager – Angular Technical Assessment

A small task-management app built with **Angular 21**: standalone components, Signals, typed Reactive Forms, zoneless change detection and Vitest. Users can view, search, filter, create, edit and delete tasks, and a dashboard summarises them.

---

## Setup, run & test

**Requirements:** Node.js `^20.19 || ^22.12 || >=24` and npm.

```bash
npm install      # install dependencies
npm start        # dev server on http://localhost:4200 (opens the browser)
npm test         # run all unit tests once (Vitest + jsdom)
npm run test:watch   # tests in watch mode
npm run build    # production build into dist/
```

No separate backend is needed. The API is simulated in-process (see [Mock API](#mock-api)).

**Demo the error handling:** open `http://localhost:4200/tasks?failApi=1`. Every API call then fails with HTTP 500, so the error state, the retry button and the error toasts appear.
**Reset the data:** clear the `task-manager.tasks` key in localStorage, or run `localStorage.clear()` in DevTools.

> **Notes on scripts:** the npm scripts call `node node_modules/@angular/cli/bin/ng.js` instead of `ng`. The original project folder name contains an `&`, which breaks npm's Windows `.cmd` shims. Calling the CLI through `node` works on every OS.
> `.npmrc` sets `legacy-peer-deps=true` to work around an npm 10.9 bug ("Cannot read properties of null (reading 'edgesOut')") triggered by vitest/jsdom optional peers. All required peers are listed explicitly in `package.json`.

---

## Architecture

```
src/app/
├── core/                         # app-wide, framework-level building blocks (no UI)
│   ├── models/task.model.ts      # Task, TaskStatus/Priority (derived from const arrays), DTOs, filters, stats
│   ├── api/
│   │   ├── task-api.service.ts   # ONLY place that uses HttpClient
│   │   ├── mock-backend.interceptor.ts  # fake REST backend (latency, validation, 404s, persistence)
│   │   └── mock-data.ts          # seed data (dates relative to today)
│   ├── notifications/notification.service.ts  # signal-based toast queue
│   └── utils/                    # pure functions: isOverdue, filterTasks, computeStats, toErrorMessage
├── features/tasks/
│   ├── state/task.store.ts       # Signal store – single source of truth
│   ├── pages/                    # "smart" routed containers: list, create, edit
│   ├── components/               # "dumb" presentational components: form, filters, table, summary
│   └── tasks.routes.ts           # lazily loaded feature routes
├── shared/
│   ├── components/               # confirm-dialog, empty-state, loading-spinner, toast-container
│   └── pages/not-found-page/
├── app.routes.ts                 # '' → /tasks, lazy 'tasks', '**' → 404
└── app.config.ts                 # router (component input binding), HttpClient + interceptor
```

### Data flow

```
 Component (page)  ──intent──▶  TaskStore  ──Observable──▶  TaskApiService  ──HttpClient──▶  mockBackendInterceptor
       ▲                           │  (state signal, immutable updates)
       └──── computed signals ◀────┘  tasks / filteredTasks / stats / loading / error / saving
```

* **Pages** (`TaskListPage`, `TaskCreatePage`, `TaskEditPage`) inject the store, read its signals and call intent methods (`loadTasks`, `createTask`, `updateTask`, `deleteTask`, `updateFilters`).
* **Presentational components** (`TaskForm`, `TaskFilters`, `TaskTable`, `TaskSummary`, `ConfirmDialog`) only use `input()` and `output()`. They know nothing about the store, HTTP or routing, which makes them reusable and easy to test. `TaskForm` serves both create and edit.
* **`TaskStore`** keeps all task state in one private `signal<TaskState>`. State is only ever replaced (`{...state, ...patch}`, `map`, `filter`, spread), never mutated. Derived state such as `filteredTasks`, `stats` and `hasActiveFilters` uses `computed()`, so the dashboard updates automatically whenever tasks change.
* **`TaskApiService`** is a stateless HTTP wrapper and the only class that uses `HttpClient`.
* **Errors:** `toErrorMessage()` maps an `HttpErrorResponse` to a user-friendly message. A load error is stored in state and shown inline with a retry button. Mutation errors show as toasts. Successful create, update and delete actions show success toasts.

### Notable details

* **Strict typing:** `strict` + `strictTemplates`. `TaskStatus` and `TaskPriority` are derived from `as const` arrays, so the type and the select options can't drift apart. Forms are typed (`FormGroup<{…}>`, `NonNullableFormBuilder`). The code has no `any`.
* **Subscription management:** HTTP observables complete on their own. Component-initiated saves use `takeUntilDestroyed()`, and the debounced filter streams use `takeUntilDestroyed()` too. Store commands are **cold** (`defer`), so nothing happens until a caller subscribes. Delete is owned by the store, so navigating away can't cancel it halfway.
* **Optimistic delete** with rollback to the task's original position if the API fails.
* **Overdue rule:** `dueDate < today` and `status !== 'completed'`. Dates are ISO `YYYY-MM-DD` strings compared lexically, which avoids timezone bugs. `today` is a signal on the store, so tests can fix it.
* **Performance:** `OnPush` everywhere, zoneless change detection, `@for … track task.id`, lazy-loaded routes, debounced search, single-pass `computeStats`, and memoised `computed()` selectors.
* **Accessibility:** labelled controls, `aria-invalid` and `aria-describedby` on invalid fields, an `alertdialog` that focuses Cancel and closes on Escape, `aria-live` toasts and loading states, a skip link, and visually hidden table captions and headers.
* **Responsive:** the table turns into cards below 720px, and the filters and summary grids reflow.

### Mock API

`mockBackendInterceptor` is an `HttpInterceptorFn` that answers `/api/tasks` requests with real `HttpResponse` and `HttpErrorResponse` objects after a simulated 500ms delay. It supports `GET /api/tasks`, `GET|PUT|DELETE /api/tasks/:id` and `POST /api/tasks`, validates payloads (400), returns 404 for unknown ids, and saves to `localStorage`.
Because the app uses `HttpClient` exactly as it would against a real server, switching to a real API means deleting one line in `app.config.ts`.

---

## Tests

`npm test` runs **7 spec files / 40 tests**:

| Requirement | Spec | What it verifies |
|---|---|---|
| Service / state management | `features/tasks/state/task.store.spec.ts` | loading flag lifecycle, caching vs forced reload, derived stats and filters, immutable create and update, cold commands, optimistic delete |
| API error handling | `task.store.spec.ts`, `core/api/task-api.service.spec.ts`, `core/utils/error.utils.spec.ts` | load errors become a friendly message, failed update keeps state and shows a toast, failed delete **rolls back**, HTTP errors propagate as `HttpErrorResponse`, status → message mapping |
| Reactive Form validation | `features/tasks/components/task-form/task-form.component.spec.ts` | required, min-length and whitespace-only title errors render in the DOM, invalid forms don't emit, a valid submit emits a trimmed DTO, edit mode pre-fills, saving state |
| Component | `features/tasks/pages/task-list-page/task-list-page.component.spec.ts` | real store + child components with a mocked API: spinner → rows, summary numbers, overdue badge, filter empty state, delete confirmation (confirm and cancel), error state + retry |
| Extra | `core/utils/task.utils.spec.ts`, `core/api/mock-backend.interceptor.spec.ts` | overdue, filter and stats rules; mock backend CRUD, 400/404 and forced errors |

---

## Requirements checklist

### Required – all completed
- [x] Task list: view, search by title, filter by status and priority, overdue indicator, empty states (no tasks / no matches)
- [x] Reusable Reactive Form for create and edit with all fields and validation (title required, min 3 characters, status, priority, due date) and clear messages
- [x] Delete with a confirmation dialog
- [x] Dashboard summary: total, completed, in progress, overdue. It updates live because it's derived state.
- [x] Routing: `/tasks`, `/tasks/new`, `/tasks/:id/edit`, default redirect, 404 page (plus a "task not found" state on edit)
- [x] State management: single source of truth, immutable updates, UI/business-logic separation, derived stats, loading and error handling
- [x] Mock API with get, create, update and delete. Components never touch `HttpClient`.
- [x] Loading indicator, friendly error messages, success feedback
- [x] Tests: service/state, component, form validation, API error handling

### Optional – completed
- [x] Debounced search (300ms)
- [x] Route lazy loading
- [x] Optimistic updates (delete)
- [x] Custom confirmation dialog
- [x] Responsive mobile layout
- [x] Accessibility improvements

### Not done
- [ ] Pagination: not needed at this data size, see Q5 for the approach
- [ ] Drag-and-drop status updates
- [ ] End-to-end tests (Playwright/Cypress). Covered partly by integration-style component tests.
- [ ] A focus trap inside the dialog. Focus moves into the dialog and Escape closes it, but Tab can leave it.

---

## Assumptions & trade-offs

* **Description is optional.** The PDF lists it under "required fields", but the given `Task` model has `description?: string` and no validation rule for it. The form always shows the field but doesn't require it (max 500 characters).
* **Status and priority default to "To do" / "Medium"** on new tasks for convenience. They still have `required` validators, and the selects include an empty placeholder option.
* **Overdue** means due before today and not completed. A task due today isn't overdue.
* **Updates use PUT** (full replacement), because the form always sends the whole task.
* **Filters live in the store**, so they survive navigation to the edit page and back. They are not synced to URL query params.
* **Mock backend as an interceptor** instead of JSON Server: no second process, `npm start` just works, and errors are easy to simulate. The trade-off is that it isn't a "real" network request in DevTools.
* **Hand-rolled signal store** instead of NgRx (see Q1).

---

## README questions

**1. Why did you choose your state-management approach?**
The app has one entity type and a handful of operations, so NgRx's actions, reducers and effects would be mostly boilerplate. A service-based **Signal store** still gives the important guarantees. There is one private writable signal as the single source of truth, it is read-only to the outside, updates are immutable, and derived state is `computed()` (memoised, recalculated only when its inputs change). Signals also fit OnPush and zoneless rendering naturally. RxJS is still used where it shines: HTTP, debouncing, and cold command streams. If the app grew (many features, undo/redo, devtools time travel), I would move to `@ngrx/signals` (SignalStore) with little change to the components.

**2. How is data passed between the API, state layer, and components?**
`TaskApiService` returns typed `Observable`s from `HttpClient`. `TaskStore` subscribes, maps responses or errors into new immutable state, and fires notifications. Pages read the store's signals in their templates and pass plain data down to presentational components through `input()`. User actions come back up through `output()` events to the page, which calls a store method. For create and update, the store returns a cold observable, so the page can navigate only after success.

**3. What technical trade-offs did you make because of the time limit?**
I used a mock interceptor instead of a real backend, a hand-written store instead of NgRx or SignalStore, only delete is optimistic (create and update wait for the server), and there is no pagination, i18n or e2e suite. Filters are kept in memory rather than in the URL. The confirm dialog is a custom component without a full focus trap. Styling is plain SCSS, without a design system.

**4. What would you improve before deploying the application to production?**
- A real backend with auth, plus an `environment`-based API URL and an HTTP interceptor for auth and retry (`retry` with backoff on idempotent GETs).
- A global error handler and logging/monitoring (e.g. Sentry), plus guarding against stale saves with ETags or versioning.
- Syncing filters and pagination to URL query params, and an "unsaved changes" `canDeactivate` guard on the form.
- E2E tests (Playwright) in CI, lint (ESLint + angular-eslint), coverage thresholds, and a Lighthouse/axe accessibility audit with a full dialog focus trap.
- i18n for strings and dates, and timezone-aware due dates if users span regions.

**5. How would you support thousands of tasks efficiently?**
- **Server-side** pagination, filtering, search and sorting, with the API returning one page plus a total count. The store would hold the current page and query, and the query would live in the URL. Search is already debounced. I would add `switchMap` to cancel stale requests.
- If client-side data is still needed, **virtual scrolling** (`@angular/cdk/scrolling`) so only visible rows are rendered. `track task.id` already keeps DOM reuse cheap.
- Store tasks **normalised** (`Record<id, Task>` + ordered ids) for O(1) updates, and have the server return aggregate stats instead of computing them from the full list. Today `computeStats` is a single O(n) pass and is memoised by `computed()`.
- Cache pages and invalidate selectively, or use a query library, to avoid refetching.

---

## Candidate declaration

AI coding assistance was used: this project was built with **Claude Code (Anthropic)**, an AI coding assistant. I reviewed the design decisions and code and can explain and change any part of it. No external templates or copied solutions were used beyond the standard Angular CLI scaffold (`ng new`).
