export { createTmdbClient } from './client.js'
export type { SearchMoviesOptions, TmdbClient, TmdbClientOptions } from './client.js'

export { POSTER_SIZES, posterUrl } from './images.js'
export type { PosterSize } from './images.js'

export { TMDB_API_BASE_URL, TMDB_IMAGE_BASE_URL } from './constants.js'

export {
  TmdbAuthError,
  TmdbError,
  TmdbNotFoundError,
  TmdbRateLimitError,
  TmdbRequestError,
  TmdbResponseError,
} from './errors.js'

export type { Genre, MovieDetails, MovieSummary, Paginated } from './types.js'
