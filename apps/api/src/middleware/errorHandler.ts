import type { NextFunction, Request, Response } from 'express'
import {
  TmdbAuthError,
  TmdbError,
  TmdbNotFoundError,
  TmdbRateLimitError,
} from '@curator/tmdb'
import { Prisma } from '../generated/prisma/client.js'
import { HttpError } from '../http/errors.js'
import { ZodError, describeZodError } from '../http/validate.js'

type ErrorBody = {
  error: {
    code: string
    message: string
  }
}

function body(code: string, message: string): ErrorBody {
  return { error: { code, message } }
}

/** express.json() rejects malformed payloads before any handler runs. */
function isJsonParseFailure(error: unknown): boolean {
  return (
    error instanceof SyntaxError &&
    'type' in error &&
    (error as { type?: unknown }).type === 'entity.parse.failed'
  )
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json(body('not_found', `No route for ${req.method} ${req.path}.`))
}

/**
 * One envelope for every failure: { error: { code, message } }. TMDB's failures
 * are translated here rather than at the call site, so a new endpoint that uses
 * the library inherits sensible statuses for free.
 */
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  if (res.headersSent) {
    next(error)
    return
  }

  if (error instanceof HttpError) {
    res.status(error.status).json(body(error.code, error.message))
    return
  }

  if (isJsonParseFailure(error)) {
    res.status(400).json(body('invalid_json', 'Request body is not valid JSON.'))
    return
  }

  if (error instanceof ZodError) {
    res.status(400).json(body('invalid_body', describeZodError(error)))
    return
  }

  // TMDB is upstream of us: its outage is our 502, not our 500.
  if (error instanceof TmdbAuthError) {
    res
      .status(502)
      .json(body('tmdb_auth', 'The configured TMDB token was rejected.'))
    return
  }

  if (error instanceof TmdbRateLimitError) {
    if (error.retryAfterSeconds !== null) {
      res.set('retry-after', String(error.retryAfterSeconds))
    }
    res.status(429).json(body('tmdb_rate_limited', 'TMDB is rate limiting us. Try again shortly.'))
    return
  }

  if (error instanceof TmdbNotFoundError) {
    res.status(404).json(body('tmdb_not_found', 'TMDB has no such movie.'))
    return
  }

  if (error instanceof TmdbError) {
    res.status(502).json(body('tmdb_unavailable', 'Could not reach TMDB.'))
    return
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      res.status(409).json(body('conflict', 'That record already exists.'))
      return
    }
    if (error.code === 'P2025') {
      res.status(404).json(body('not_found', 'Record not found.'))
      return
    }
  }

  console.error('Unhandled error:', error)
  res.status(500).json(body('internal_error', 'Something went wrong.'))
}
