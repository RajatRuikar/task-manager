import { HttpErrorResponse } from '@angular/common/http';

import { toErrorMessage } from './error.utils';

describe('toErrorMessage', () => {
  const httpError = (status: number, error: unknown = null) =>
    new HttpErrorResponse({ status, error });

  it('maps network, not-found and server errors to friendly messages', () => {
    expect(toErrorMessage(httpError(0))).toMatch(/unable to reach the server/i);
    expect(toErrorMessage(httpError(404))).toMatch(/could not be found/i);
    expect(toErrorMessage(httpError(503))).toMatch(/server encountered an error/i);
  });

  it('surfaces the server validation message for 400 responses', () => {
    expect(toErrorMessage(httpError(400, { message: 'Title is too short.' }))).toBe(
      'Title is too short.',
    );
  });

  it('falls back to the provided message for unknown errors', () => {
    expect(toErrorMessage(new Error('x'), 'Fallback')).toBe('Fallback');
  });
});
