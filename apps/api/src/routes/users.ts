import { Router } from 'express'
import { prisma } from '../db.js'

export const usersRouter: Router = Router()

/** Populates the user switcher in the header. */
usersRouter.get('/', async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true },
  })

  res.json({ users })
})
