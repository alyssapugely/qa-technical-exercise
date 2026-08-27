/**
 * Manual sanity check against the real TMDB API:
 *   npm run smoke -w @curator/tmdb -- "blade runner"
 *
 * Not part of `npm test`, which stays offline. Use it to check that a token
 * works and that the mappers survive real payloads.
 */
import { fileURLToPath } from 'node:url'
import { createTmdbClient, posterUrl } from '../src/index.js'

const envPath = fileURLToPath(new URL('../../../.env', import.meta.url))

try {
  process.loadEnvFile(envPath)
} catch {
  // The token may come from the shell instead; the check below decides.
}

const readAccessToken = process.env.TMDB_READ_TOKEN
if (!readAccessToken) {
  console.error(`No TMDB_READ_TOKEN found. Set it in ${envPath} or in the shell.`)
  process.exit(1)
}

const client = createTmdbClient({ readAccessToken })
const query = process.argv[2] ?? 'blade runner'

const page = await client.searchMovies(query)
console.log(`search "${query}" -> ${page.totalResults} results, ${page.totalPages} pages`)
for (const movie of page.results.slice(0, 5)) {
  console.log(`  ${movie.tmdbId}\t${movie.title} (${movie.releaseDate ?? 'unknown date'})`)
}

const first = page.results[0]
if (!first) {
  console.log('No results, so no details to fetch.')
  process.exit(0)
}

const details = await client.getMovie(first.tmdbId)
console.log(`\ndetails for ${details.tmdbId}`)
console.log(`  title    ${details.title}`)
console.log(`  runtime  ${details.runtimeMinutes ?? 'unknown'} min`)
console.log(`  genres   ${details.genres.map((genre) => genre.name).join(', ') || 'none'}`)
console.log(`  poster   ${posterUrl(details.posterPath) ?? 'none'}`)
