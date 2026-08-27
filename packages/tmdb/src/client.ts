import type { ZodType } from 'zod'
import { TMDB_API_BASE_URL } from './constants.js'
import {
  TmdbAuthError,
  TmdbError,
  TmdbNotFoundError,
  TmdbRateLimitError,
  TmdbRequestError,
  TmdbResponseError,
} from './errors.js'
import { toMovieDetails, toMovieSummary } from './mappers.js'
import { rawMovieDetailsSchema, rawSearchResponseSchema } from './schemas.js'
import type { MovieDetails, MovieSummary, Paginated } from './types.js'

export type TmdbClientOptions = {
  /**
   * TMDB v4 read access token (the long JWT), sent as a bearer credential so it
   * never appears in a URL or a server access log. Not the v3 API key.
   */
  readAccessToken: string
  baseUrl?: string
  language?: string
  timeoutMs?: number
  /** Injectable so tests never touch the network. */
  fetch?: typeof globalThis.fetch
}

export type SearchMoviesOptions = {
  page?: number
}

export type TmdbClient = {
  searchMovies(query: string, options?: SearchMoviesOptions): Promise<Paginated<MovieSummary>>
  getMovie(tmdbId: number): Promise<MovieDetails>
}

type QueryParams = Record<string, string | number | boolean | undefined>

const DEFAULT_TIMEOUT_MS = 8_000
const DEFAULT_LANGUAGE = 'en-US'

function parseRetryAfter(response: Response): number | null {
  const header = response.headers.get('retry-after')
  if (!header) return null
  const seconds = Number(header)
  return Number.isFinite(seconds) ? seconds : null
}

/** TMDB puts a human-readable reason in status_message. Best effort only. */
async function readStatusMessage(response: Response): Promise<string | null> {
  try {
    const body: unknown = await response.json()
    if (body && typeof body === 'object' && 'status_message' in body) {
      const message = (body as { status_message: unknown }).status_message
      if (typeof message === 'string' && message.trim()) return message.trim()
    }
  } catch {
    // Error bodies are not always JSON; the status code is enough on its own.
  }
  return null
}

async function toStatusError(response: Response, path: string): Promise<TmdbError> {
  const detail = await readStatusMessage(response)
  const suffix = detail ? `: ${detail}` : ''

  switch (response.status) {
    case 401:
    case 403:
      return new TmdbAuthError(`TMDB rejected the read access token${suffix}`)
    case 404:
      return new TmdbNotFoundError(`TMDB has no resource at ${path}${suffix}`)
    case 429:
      return new TmdbRateLimitError(
        `TMDB rate limit exceeded${suffix}`,
        parseRetryAfter(response),
      )
    default:
      return new TmdbRequestError(
        `TMDB request to ${path} failed${suffix}`,
        response.status,
      )
  }
}

/**
 * Every endpoint goes through one request helper, so adding coverage of more of
 * TMDB later is a small function per endpoint rather than another fetch call
 * with its own auth, error, and validation handling.
 */
export function createTmdbClient(options: TmdbClientOptions): TmdbClient {
  const {
    readAccessToken,
    baseUrl = TMDB_API_BASE_URL,
    language = DEFAULT_LANGUAGE,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    fetch: fetchImpl = globalThis.fetch,
  } = options

  if (!readAccessToken.trim()) {
    throw new TmdbError('A TMDB v4 read access token is required.')
  }

  const origin = baseUrl.replace(/\/+$/, '')

  async function requestJson<T>(
    schema: ZodType<T>,
    path: string,
    params: QueryParams = {},
  ): Promise<T> {
    const url = new URL(`${origin}${path}`)
    url.searchParams.set('language', language)
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, String(value))
    }

    let response: Response
    try {
      response = await fetchImpl(url, {
        headers: {
          Authorization: `Bearer ${readAccessToken}`,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(timeoutMs),
      })
    } catch (cause) {
      throw new TmdbError(`TMDB request to ${path} could not be completed`, { cause })
    }

    if (!response.ok) throw await toStatusError(response, path)

    let body: unknown
    try {
      body = await response.json()
    } catch (cause) {
      throw new TmdbResponseError(`TMDB returned a non-JSON body for ${path}`, { cause })
    }

    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      throw new TmdbResponseError(
        `TMDB returned an unexpected shape for ${path}: ${parsed.error.message}`,
      )
    }

    return parsed.data
  }

  return {
    async searchMovies(query, { page = 1 } = {}) {
      const trimmed = query.trim()

      // TMDB rejects an empty query outright, so answer it locally instead of
      // spending a request to be told so.
      if (!trimmed) {
        return { page, totalPages: 0, totalResults: 0, results: [] }
      }

      const raw = await requestJson(rawSearchResponseSchema, '/search/movie', {
        query: trimmed,
        page,
        include_adult: false,
      })

      return {
        page: raw.page,
        totalPages: raw.total_pages,
        totalResults: raw.total_results,
        results: raw.results.map(toMovieSummary),
      }
    },

    async getMovie(tmdbId) {
      if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
        throw new TmdbError(`Invalid TMDB movie id: ${tmdbId}`)
      }

      const raw = await requestJson(rawMovieDetailsSchema, `/movie/${tmdbId}`)
      return toMovieDetails(raw)
    },
  }
}
