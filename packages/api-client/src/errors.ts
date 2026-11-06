import type { ApiError } from "@datewise/shared";

// What every ApiClient method throws. `body` is the contract's error envelope, so a
// screen can `switch (error.body.code)` and TypeScript narrows `details` per code.
//
// Failures that never produced an envelope are folded into one, so screens only
// handle one shape:
// - no response at all (offline, DNS, CORS): status null, code INTERNAL
// - a response that breaks the contract (a proxy's HTML 502, a field the schema
//   doesn't allow): the real status, code INTERNAL
export class ApiClientError extends Error {
  readonly status: number | null;
  readonly body: ApiError;

  constructor(status: number | null, body: ApiError, options?: { cause?: unknown }) {
    super(body.message, options);
    this.name = "ApiClientError";
    this.status = status;
    this.body = body;
  }
}

export const isApiClientError = (error: unknown): error is ApiClientError =>
  error instanceof ApiClientError;
