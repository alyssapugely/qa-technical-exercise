/**
 * Every failure the API deliberately produces is an HttpError. The error
 * handler turns these into the one response envelope; anything else that
 * reaches it is a bug and becomes a 500.
 */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = new.target.name
  }
}

export class BadRequestError extends HttpError {
  constructor(message: string, code = 'bad_request') {
    super(400, code, message)
  }
}

export class NotFoundError extends HttpError {
  constructor(message: string, code = 'not_found') {
    super(404, code, message)
  }
}

export class ConflictError extends HttpError {
  constructor(message: string, code = 'conflict') {
    super(409, code, message)
  }
}

/** Something downstream of us failed; the request itself was fine. */
export class UpstreamError extends HttpError {
  constructor(message: string, code = 'upstream_error', options?: ErrorOptions) {
    super(502, code, message, options)
  }
}
