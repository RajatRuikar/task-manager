import { HttpErrorResponse } from '@angular/common/http';

/** Maps any thrown error into a message that is safe and useful to show to the user. */
export function toErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (error instanceof HttpErrorResponse) {
    switch (error.status) {
      case 0:
        return 'Unable to reach the server. Check your connection and try again.';
      case 400:
        return typeof error.error?.message === 'string'
          ? error.error.message
          : 'The request was invalid.';
      case 404:
        return 'The requested task could not be found. It may have been deleted.';
      default:
        if (error.status >= 500) return 'The server encountered an error. Please try again later.';
    }
  }
  return fallback;
}
