import { posterUrl } from '@curator/tmdb'
import { prisma } from '../db.js'
import { env } from '../env.js'
import type { Prisma } from '../generated/prisma/client.js'
import { NotFoundError } from '../http/errors.js'
import {
  toCollectionItemDto,
  type CollectionItemDto,
  type CollectionSummaryDto,
} from '../serialize.js'
import { computeStats, type CollectionStats } from '../stats.js'

/**
 * A collection is always loaded with everything needed to render it: its films,
 * their genres, and their annotations. Stats are folded from this same result
 * rather than re-queried, so the numbers can never disagree with the list.
 */
const collectionDetailInclude = {
  items: {
    orderBy: { addedAt: 'desc' },
    include: { movie: { include: { genres: { orderBy: { name: 'asc' } } } } },
  },
} satisfies Prisma.CollectionInclude

type CollectionWithItems = Prisma.CollectionGetPayload<{
  include: typeof collectionDetailInclude
}>

export type CollectionDetail = CollectionSummaryDto & {
  items: CollectionItemDto[]
  stats: CollectionStats
}

function toDetail(collection: CollectionWithItems): CollectionDetail {
  const items = collection.items.map(toCollectionItemDto)

  return {
    id: collection.id,
    name: collection.name,
    createdAt: collection.createdAt.toISOString(),
    updatedAt: collection.updatedAt.toISOString(),
    movieCount: items.length,
    posterUrls: items
      .map((item) => item.movie.posterUrl)
      .filter((path): path is string => path !== null)
      .slice(0, 4),
    items,
    // Folded from the items already in memory. A separate /stats endpoint
    // would re-run this whole query to compute the same numbers, and would
    // leave a window where the panel and the list disagree.
    stats: computeStats(items),
  }
}

export async function listCollections(userId: string): Promise<CollectionSummaryDto[]> {
  const collections = await prisma.collection.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { items: true } },
      // Enough posters for a stack on the card, and only ones that exist.
      items: {
        where: { movie: { posterPath: { not: null } } },
        orderBy: { addedAt: 'desc' },
        take: 4,
        select: { movie: { select: { posterPath: true } } },
      },
    },
  })

  return collections.map((collection) => ({
    id: collection.id,
    name: collection.name,
    createdAt: collection.createdAt.toISOString(),
    updatedAt: collection.updatedAt.toISOString(),
    movieCount: collection._count.items,
    posterUrls: collection.items
      .map((item) => posterUrl(item.movie.posterPath, 'w342', env.TMDB_IMAGE_BASE_URL))
      .filter((url): url is string => url !== null),
  }))
}

export async function getCollection(userId: string, id: string): Promise<CollectionDetail> {
  const collection = await prisma.collection.findFirst({
    where: { id },
    include: collectionDetailInclude,
  })

  if (!collection) {
    throw new NotFoundError(`No collection with id ${id}.`)
  }

  return toDetail(collection)
}

export async function createCollection(userId: string, name: string): Promise<CollectionDetail> {
  const collection = await prisma.collection.create({
    data: { userId, name },
    include: collectionDetailInclude,
  })

  return toDetail(collection)
}

export async function renameCollection(
  userId: string,
  id: string,
  name: string,
): Promise<CollectionDetail> {
  // Scoping the update itself means an unauthorised rename is a miss, not a
  // read followed by a race.
  const { count } = await prisma.collection.updateMany({
    where: { id, userId },
    data: { name },
  })

  if (count === 0) {
    throw new NotFoundError(`No collection with id ${id}.`)
  }

  return getCollection(userId, id)
}

export async function deleteCollection(userId: string, id: string): Promise<void> {
  const { count } = await prisma.collection.deleteMany({ where: { id, userId } })

  if (count === 0) {
    throw new NotFoundError(`No collection with id ${id}.`)
  }
}
