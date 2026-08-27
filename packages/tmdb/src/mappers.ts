import type { RawMovieDetails, RawMovieSummary } from './schemas.js'
import type { Genre, MovieDetails, MovieSummary } from './types.js'

/**
 * The single boundary between TMDB's vocabulary and ours. Nothing snake_case
 * escapes this module, so swapping data source later is a rewrite of one file.
 */

function nullIfBlank(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function nullIfMissing(value: number | null | undefined): number | null {
  return typeof value === 'number' ? value : null
}

/** TMDB uses 0 for "runtime unknown", which would silently skew a total. */
function runtimeOrNull(value: number | null | undefined): number | null {
  return typeof value === 'number' && value > 0 ? value : null
}

function toGenre(raw: { id: number; name: string }): Genre {
  return { id: raw.id, name: raw.name }
}

export function toMovieSummary(raw: RawMovieSummary): MovieSummary {
  return {
    tmdbId: raw.id,
    title: raw.title,
    overview: nullIfBlank(raw.overview),
    posterPath: nullIfBlank(raw.poster_path),
    releaseDate: nullIfBlank(raw.release_date),
    voteAverage: nullIfMissing(raw.vote_average),
    genreIds: raw.genre_ids ?? [],
  }
}

export function toMovieDetails(raw: RawMovieDetails): MovieDetails {
  return {
    tmdbId: raw.id,
    title: raw.title,
    overview: nullIfBlank(raw.overview),
    posterPath: nullIfBlank(raw.poster_path),
    releaseDate: nullIfBlank(raw.release_date),
    voteAverage: nullIfMissing(raw.vote_average),
    runtimeMinutes: runtimeOrNull(raw.runtime),
    genres: (raw.genres ?? []).map(toGenre),
    tagline: nullIfBlank(raw.tagline),
  }
}
