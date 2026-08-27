import { config } from 'dotenv'
import { defineConfig } from 'prisma/config'

// Prisma 7 no longer reads .env implicitly, and one .env at the repo root
// serves every workspace, so it is loaded explicitly relative to this file.
config({ path: new URL('../../.env', import.meta.url) })

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
})
