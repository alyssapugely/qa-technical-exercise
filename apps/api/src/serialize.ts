import { posterUrl, type MovieSummary } from '@curator/tmdb'
import { env } from './env.js'
import type { Genre, Movie } from './generated/prisma/client.js'

/**
 * The wire shapes. Prisma models are not returned directly: the API's contract
 * should not move every time a column is added, and the client has no business
 * knowing our internal movie id when it thinks in TMDB ids.
 *
 * Posters are serialised as absolute URLs rather than TMDB path fragments, so
 * knowledge of TMDB's image host stays on this side of the wire.
 */

export type MovieDto = {
  tmdbId: number
  title: string
  overview: string | null
  posterUrl: string | null
  releaseDate: string | null
  runtimeMinutes: number | null
  genres: { id: number; name: string }[]
}

export type MovieSearchResultDto = {
  tmdbId: number
  title: string
  overview: string | null
  posterUrl: string | null
  releaseDate: string | null
  voteAverage: number | null
}

export type AnnotationDto = {
  note: string | null
  tags: string[]
  rating: number | null
}

export type CollectionItemDto = {
  id: string
  addedAt: string
  movie: MovieDto
  annotation: AnnotationDto
}

export type CollectionSummaryDto = {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  movieCount: number
  posterUrls: string[]
}

/**
 * Release dates are date-only facts stored in a timestamp column. They are
 * always written as UTC midnight, so slicing the ISO string returns the same
 * calendar day TMDB gave us regardless of where the server runs.
 */
export function toDateOnly(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null
}

type MovieWithGenres = Movie & { genres: Genre[] }

export function toMovieDto(movie: MovieWithGenres): MovieDto {
  return {
    tmdbId: movie.tmdbId,
    title: movie.title,
    overview: movie.overview,
    posterUrl: posterUrl(movie.posterPath, 'w342', env.TMDB_IMAGE_BASE_URL),
    releaseDate: toDateOnly(movie.releaseDate),
    runtimeMinutes: movie.runtimeMinutes,
    genres: movie.genres.map((genre) => ({ id: genre.id, name: genre.name })),
  }
}

export function toSearchResultDto(movie: MovieSummary): MovieSearchResultDto {
  return {
    tmdbId: movie.tmdbId,
    title: movie.title,
    overview: movie.overview,
    posterUrl: posterUrl(movie.posterPath, 'w342', env.TMDB_IMAGE_BASE_URL),
    releaseDate: movie.releaseDate,
    voteAverage: movie.voteAverage,
  }
}

export type CollectionItemSource = {
  id: string
  addedAt: Date
  note: string | null
  tags: string[]
  rating: number | null
  movie: MovieWithGenres
}

export function toCollectionItemDto(item: CollectionItemSource): CollectionItemDto {
  return {
    id: item.id,
    addedAt: item.addedAt.toISOString(),
    movie: toMovieDto(item.movie),
    annotation: {
      note: item.note,
      tags: item.tags,
      rating: item.rating,
    },
  }
}
