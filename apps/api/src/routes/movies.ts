import { Router } from 'express'
import { z } from 'zod'
import { parseQuery } from '../http/validate.js'
import { toSearchResultDto } from '../serialize.js'
import { searchMovies } from '../services/tmdb.js'

export const moviesRouter: Router = Router()

const searchQuerySchema = z.object({
  q: z.string().trim().default(''),
  // TMDB refuses to paginate past 500.
  page: z.coerce.number().int().min(1).max(500).default(1),
})

/**
 * Search is proxied rather than called from the browser: it keeps the TMDB
 * token on the server, lets one cache serve every user, and means swapping the
 * data source later is invisible to the client.
 */
moviesRouter.get('/search', async (req, res) => {
  const { q, page } = parseQuery(searchQuerySchema, req.query)
  const { value, hit } = await searchMovies(q, page)

  // Surfaced so the cache is observable without a debugger.
  res.set('x-cache', hit ? 'hit' : 'miss')

  res.json({
    page: value.page,
    totalPages: value.totalPages,
    totalResults: value.totalResults,
    results: value.results.map(toSearchResultDto),
  })
})
