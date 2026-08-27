import {
  createTmdbClient,
  type MovieDetails,
  type MovieSummary,
  type Paginated,
} from '@curator/tmdb'
import { createTtlCache, type CacheResult } from '../cache.js'
import { env } from '../env.js'

/**
 * The single point where the API talks to TMDB. Everything upstream goes
 * through the cache, so no call site can accidentally bypass it.
 */
const client = createTmdbClient({
  readAccessToken: env.TMDB_READ_TOKEN,
  baseUrl: env.TMDB_BASE_URL,
})

// Five minutes by default: long enough to absorb a person typing, backspacing
// and retyping the same search, short enough that a newly released film shows
// up the same afternoon.
const TTL_MS = env.TMDB_CACHE_TTL_MS

const searchCache = createTtlCache<Paginated<MovieSummary>>({
  ttlMs: TTL_MS,
  maxEntries: 200,
})

const detailsCache = createTtlCache<MovieDetails>({
  ttlMs: TTL_MS,
  maxEntries: 500,
})

/** TMDB search is case-insensitive, so the key is too. */
function searchKey(query: string, page: number): string {
  return `${query.trim().toLowerCase()}::${page}`
}

export function searchMovies(
  query: string,
  page: number,
): Promise<CacheResult<Paginated<MovieSummary>>> {
  return searchCache.fetch(searchKey(query, page), () =>
    client.searchMovies(query, { page }),
  )
}

export function getMovieDetails(tmdbId: number): Promise<CacheResult<MovieDetails>> {
  return detailsCache.fetch(String(tmdbId), () => client.getMovie(tmdbId))
}

/** Current entry count for each cache. */
export function cacheSizes() {
  return { search: searchCache.size, details: detailsCache.size }
}
