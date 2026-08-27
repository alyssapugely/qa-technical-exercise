import type { MovieDetails } from '@curator/tmdb'
import { prisma } from '../db.js'
import { Prisma } from '../generated/prisma/client.js'
import { ConflictError, NotFoundError } from '../http/errors.js'
import { toCollectionItemDto, type CollectionItemDto } from '../serialize.js'
import { getMovieDetails } from './tmdb.js'

const itemInclude = {
  movie: { include: { genres: { orderBy: { name: 'asc' } } } },
} satisfies Prisma.CollectionItemInclude

/**
 * TMDB gives a date-only string. Storing it as UTC midnight is what lets
 * serialize.toDateOnly hand back the same calendar day anywhere in the world.
 */
function toUtcDate(isoDate: string | null): Date | null {
  return isoDate ? new Date(`${isoDate}T00:00:00Z`) : null
}

/** The fields we choose to copy out of TMDB. Everything else stays theirs. */
function snapshotOf(details: MovieDetails) {
  return {
    tmdbId: details.tmdbId,
    title: details.title,
    overview: details.overview,
    posterPath: details.posterPath,
    releaseDate: toUtcDate(details.releaseDate),
    runtimeMinutes: details.runtimeMinutes,
    fetchedAt: new Date(),
  }
}

async function assertCollectionOwned(userId: string, collectionId: string): Promise<void> {
  const collection = await prisma.collection.findFirst({
    where: { id: collectionId, userId },
    select: { id: true },
  })

  if (!collection) {
    throw new NotFoundError(`No collection with id ${collectionId}.`)
  }
}

/**
 * Adding a film is the only place TMDB data enters the database. Details are
 * fetched synchronously so the row is complete the moment it exists: no
 * half-populated movie, and therefore no stats that are quietly wrong.
 *
 * The fetch happens before the transaction opens, so a slow TMDB never holds a
 * database connection.
 */
export async function addMovieToCollection(
  userId: string,
  collectionId: string,
  tmdbId: number,
): Promise<CollectionItemDto> {
  await assertCollectionOwned(userId, collectionId)

  const { value: details } = await getMovieDetails(tmdbId)
  const snapshot = snapshotOf(details)
  const genreIds = details.genres.map((genre) => ({ id: genre.id }))

  try {
    const item = await prisma.$transaction(async (tx) => {
      // Genre names are effectively immutable, so inserting only the ones we
      // have not seen is one query instead of one per genre. The cost is that
      // a renamed genre keeps its old name until that row is touched again.
      await tx.genre.createMany({ data: details.genres, skipDuplicates: true })

      const movie = await tx.movie.upsert({
        where: { tmdbId: details.tmdbId },
        update: { ...snapshot, genres: { set: genreIds } },
        create: { ...snapshot, genres: { connect: genreIds } },
      })

      return tx.collectionItem.upsert({
        where: { collectionId_movieId: { collectionId, movieId: movie.id } },
        update: {},
        create: { collectionId, movieId: movie.id },
        include: itemInclude,
      })
    })

    return toCollectionItemDto(item)
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictError(`${details.title} is already in this collection.`)
    }
    throw error
  }
}

export async function removeMovieFromCollection(
  userId: string,
  collectionId: string,
  itemId: string,
): Promise<void> {
  // Scoped through the collection, so an item id alone is not enough to delete
  // someone else's annotation.
  const { count } = await prisma.collectionItem.deleteMany({
    where: { id: itemId, collection: { id: collectionId, userId } },
  })

  if (count === 0) {
    throw new NotFoundError(`No film with id ${itemId} in that collection.`)
  }
}

export type AnnotationPatch = {
  note?: string | null
  tags?: string[]
  rating?: number | null
}

/**
 * Tags are free text, so they are normalised on the way in: trimmed,
 * lowercased, blanks dropped, duplicates removed, order preserved. Without
 * this, "Noir", "noir" and "noir " are three different tags.
 */
function normaliseTags(tags: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const tag of tags) {
    const normalised = tag.trim().toLowerCase()
    if (!normalised || seen.has(normalised)) continue
    seen.add(normalised)
    result.push(normalised)
  }

  return result
}

export async function annotateMovie(
  userId: string,
  collectionId: string,
  itemId: string,
  patch: AnnotationPatch,
): Promise<CollectionItemDto> {
  const data: Prisma.CollectionItemUpdateManyMutationInput = {}

  // An absent key leaves the field alone; an explicit null clears it.
  if (patch.note !== undefined) data.note = patch.note?.trim() || null
  if (patch.tags !== undefined && !data.note) data.tags = normaliseTags(patch.tags)
  if (patch.rating !== undefined) data.rating = patch.rating

  const { count } = await prisma.collectionItem.updateMany({
    where: { id: itemId, collection: { id: collectionId, userId } },
    data,
  })

  if (count === 0) {
    throw new NotFoundError(`No film with id ${itemId} in that collection.`)
  }

  const item = await prisma.collectionItem.findUniqueOrThrow({
    where: { id: itemId },
    include: itemInclude,
  })

  return toCollectionItemDto(item)
}
