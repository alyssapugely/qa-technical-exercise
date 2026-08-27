export type Genre = {
  id: number
  name: string
}

/** Fields present on every movie shape TMDB returns. */
type MovieCore = {
  tmdbId: number
  title: string
  overview: string | null
  posterPath: string | null
  /** ISO date (yyyy-mm-dd). TMDB sends an empty string when unknown. */
  releaseDate: string | null
  voteAverage: number | null
}

/** A movie as it appears in search results: genre ids only, no runtime. */
export type MovieSummary = MovieCore & {
  genreIds: number[]
}

/** A movie fetched by id: named genres and runtime, which search omits. */
export type MovieDetails = MovieCore & {
  runtimeMinutes: number | null
  genres: Genre[]
  tagline: string | null
}

export type Paginated<T> = {
  page: number
  totalPages: number
  totalResults: number
  results: T[]
}
