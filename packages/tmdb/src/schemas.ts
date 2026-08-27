import { z } from 'zod'

/**
 * Raw TMDB payloads, snake_case intact. These schemas are deliberately strict
 * about what we need to identify and display a movie (id, title) and permissive
 * about everything else, because TMDB omits optional fields inconsistently.
 * Unknown keys are stripped, which is what stops TMDB's shape leaking outward.
 */

const rawMovieCoreSchema = z.object({
  id: z.number().int().positive(),
  title: z.string(),
  overview: z.string().nullish(),
  poster_path: z.string().nullish(),
  release_date: z.string().nullish(),
  vote_average: z.number().nullish(),
})

export const rawMovieSummarySchema = rawMovieCoreSchema.extend({
  genre_ids: z.array(z.number().int()).nullish(),
})

export const rawGenreSchema = z.object({
  id: z.number().int(),
  name: z.string(),
})

export const rawMovieDetailsSchema = rawMovieCoreSchema.extend({
  runtime: z.number().nullish(),
  genres: z.array(rawGenreSchema).nullish(),
  tagline: z.string().nullish(),
})

export const rawSearchResponseSchema = z.object({
  page: z.number().int(),
  results: z.array(rawMovieSummarySchema),
  total_pages: z.number().int(),
  total_results: z.number().int(),
})

export type RawMovieSummary = z.infer<typeof rawMovieSummarySchema>
export type RawMovieDetails = z.infer<typeof rawMovieDetailsSchema>
