/**
 * Base for everything this library throws. Callers that only care whether TMDB
 * was reachable can catch this; callers that need to react differently to an
 * expired token versus a rate limit catch a subclass.
 */
export class TmdbError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = new.target.name
  }
}

/** The read access token was missing, malformed, or rejected. */
export class TmdbAuthError extends TmdbError {}

/** TMDB has no resource at the requested path. */
export class TmdbNotFoundError extends TmdbError {}

export class TmdbRateLimitError extends TmdbError {
  constructor(
    message: string,
    readonly retryAfterSeconds: number | null,
    options?: ErrorOptions,
  ) {
    super(message, options)
  }
}

/** Any other non-2xx response. */
export class TmdbRequestError extends TmdbError {
  constructor(
    message: string,
    readonly status: number,
    options?: ErrorOptions,
  ) {
    super(message, options)
  }
}

/**
 * TMDB answered, but not with something we recognise. Distinct from
 * TmdbRequestError because it means our assumptions are wrong, not theirs.
 */
export class TmdbResponseError extends TmdbError {}
