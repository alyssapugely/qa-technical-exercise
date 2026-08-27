import { Router } from 'express'
import { z } from 'zod'
import { parseBody } from '../http/validate.js'
import { requireUser } from '../middleware/currentUser.js'
import {
  createCollection,
  deleteCollection,
  getCollection,
  listCollections,
  renameCollection,
} from '../services/collections.js'
import {
  addMovieToCollection,
  annotateMovie,
  removeMovieFromCollection,
} from '../services/movies.js'

export const collectionsRouter: Router = Router()

const collectionNameSchema = z.object({
  name: z.string().trim().min(1, 'must not be empty').max(120, 'must be 120 characters or fewer'),
})

const addMovieSchema = z.object({
  tmdbId: z.number().int().positive(),
})

const annotationSchema = z
  .object({
    note: z.string().trim().max(2000, 'must be 2000 characters or fewer').nullable().optional(),
    tags: z
      .array(z.string().trim().max(40, 'each tag must be 40 characters or fewer'))
      .max(20, 'at most 20 tags')
      .optional(),
    rating: z.number().int().min(1, 'must be 1 to 5').max(4, 'must be 1 to 5').nullable().optional(),
  })
  .refine((patch) => Object.keys(patch).length > 0, {
    message: 'provide at least one of note, tags or rating',
  })

collectionsRouter.get('/', async (req, res) => {
  const user = requireUser(req)
  res.json({ collections: await listCollections(user.id) })
})

collectionsRouter.post('/', async (req, res) => {
  const user = requireUser(req)
  const { name } = parseBody(collectionNameSchema, req.body)

  res.status(201).json({ collection: await createCollection(user.id, name) })
})

collectionsRouter.get('/:id', async (req, res) => {
  const user = requireUser(req)
  res.json({ collection: await getCollection(user.id, req.params.id) })
})

collectionsRouter.patch('/:id', async (req, res) => {
  const user = requireUser(req)
  const { name } = parseBody(collectionNameSchema, req.body)

  res.json({ collection: await renameCollection(user.id, req.params.id, name) })
})

collectionsRouter.delete('/:id', async (req, res) => {
  const user = requireUser(req)
  await deleteCollection(user.id, req.params.id)

  res.status(204).end()
})

collectionsRouter.post('/:id/movies', async (req, res) => {
  const user = requireUser(req)
  const { tmdbId } = parseBody(addMovieSchema, req.body)

  const item = await addMovieToCollection(user.id, req.params.id, tmdbId)
  res.status(201).json({ item })
})

collectionsRouter.patch('/:id/movies/:itemId', async (req, res) => {
  const user = requireUser(req)
  const patch = parseBody(annotationSchema, req.body)

  const item = await annotateMovie(user.id, req.params.id, req.params.itemId, patch)
  res.json({ item })
})

collectionsRouter.delete('/:id/movies/:itemId', async (req, res) => {
  const user = requireUser(req)
  await removeMovieFromCollection(user.id, req.params.id, req.params.itemId)

  res.status(204).end()
})
