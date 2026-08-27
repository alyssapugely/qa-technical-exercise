import type { NextFunction, Request, Response } from 'express'
import { prisma } from '../db.js'
import { BadRequestError, HttpError } from '../http/errors.js'

export type CurrentUser = {
  id: string
  name: string
}

declare module 'express-serve-static-core' {
  interface Request {
    currentUser?: CurrentUser
  }
}

/**
 * Resolves the caller from the X-User-Id header and attaches them to the
 * request, so every query mounted behind it is scoped to a user. The id is
 * looked up rather than taken at face value, so an unknown one fails with a
 * clear message instead of a foreign key error three layers down.
 */
export async function currentUser(req: Request, _res: Response, next: NextFunction) {
  const header = req.get('x-user-id')

  if (!header) {
    throw new BadRequestError('An X-User-Id header is required.', 'missing_user')
  }

  const user = await prisma.user.findUnique({
    where: { id: header },
    select: { id: true, name: true },
  })

  if (!user) {
    throw new BadRequestError(`No user with id ${header}.`, 'unknown_user')
  }

  req.currentUser = user
  next()
}

/** Narrows the optional request property for handlers mounted behind currentUser. */
export function requireUser(req: Request): CurrentUser {
  if (!req.currentUser) {
    throw new HttpError(500, 'internal_error', 'currentUser middleware did not run')
  }
  return req.currentUser
}
