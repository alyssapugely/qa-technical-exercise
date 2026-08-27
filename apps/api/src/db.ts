import { PrismaPg } from '@prisma/adapter-pg'
import { env } from './env.js'
import { PrismaClient } from './generated/prisma/client.js'

// Prisma 7 talks to Postgres through a driver adapter rather than its own
// query engine binary, so the connection string is handed to node-postgres.
const adapter = new PrismaPg({ connectionString: env.DATABASE_URL })

export const prisma = new PrismaClient({ adapter })
