import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import { z } from 'zod'

// One .env at the repo root serves every workspace, so the path is resolved
// relative to this file rather than to the process working directory.
config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)) })

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  TMDB_READ_TOKEN: z.string().min(1),
  TMDB_BASE_URL: z.string().url().default('https://api.themoviedb.org/3'),
  TMDB_IMAGE_BASE_URL: z.string().url().default('https://image.tmdb.org/t/p'),
  TMDB_CACHE_TTL_MS: z.coerce.number().int().nonnegative().default(5 * 60 * 1000),
  PORT: z.coerce.number().int().positive().default(4000),
})

const parsed = schema.safeParse(process.env)

if (!parsed.success) {
  const missing = Object.keys(parsed.error.flatten().fieldErrors).join(', ')
  throw new Error(
    `Invalid environment: ${missing}. Copy .env.example to .env and fill it in.`,
  )
}

export const env = parsed.data
