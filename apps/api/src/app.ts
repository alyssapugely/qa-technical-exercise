import express from 'express'
import { currentUser } from './middleware/currentUser.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { collectionsRouter } from './routes/collections.js'
import { moviesRouter } from './routes/movies.js'
import { usersRouter } from './routes/users.js'

/**
 * Split from server.ts so the app can be imported and exercised without
 * binding a port.
 */
export function createApp() {
  const app = express()

  app.use(express.json())

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  app.use('/api/users', usersRouter)

  // Everything below here is scoped to the requesting user.
  app.use('/api/collections', currentUser, collectionsRouter)
  app.use('/api/movies', currentUser, moviesRouter)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
