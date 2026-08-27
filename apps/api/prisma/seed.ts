import { prisma } from '../src/db.js'

/** Fixed ids keep the seed idempotent across a database reset. */
const USERS = [
  { id: '11111111-1111-4111-8111-111111111111', name: 'Sam' },
  { id: '22222222-2222-4222-8222-222222222222', name: 'Alex' },
] as const

const EMPTY_COLLECTION = {
  id: '33333333-3333-4333-8333-333333333333',
  name: 'Films I Should Have Seen By Now',
  userId: USERS[0].id,
}

const DEMO_COLLECTION = {
  id: '44444444-4444-4444-8444-444444444444',
  name: 'Rainy Sunday',
  userId: USERS[0].id,
}

const GENRES = [
  { id: 14, name: 'Fantasy' },
  { id: 16, name: 'Animation' },
  { id: 18, name: 'Drama' },
  { id: 27, name: 'Horror' },
  { id: 35, name: 'Comedy' },
  { id: 53, name: 'Thriller' },
  { id: 80, name: 'Crime' },
  { id: 878, name: 'Science Fiction' },
  { id: 9648, name: 'Mystery' },
  { id: 10749, name: 'Romance' },
  { id: 10751, name: 'Family' },
] as const

const SNAPSHOT_TAKEN = new Date('2026-01-15T09:00:00.000Z')

/**
 * A worked example to open the app on. Snapshots are written straight to the
 * database rather than fetched, so seeding needs no TMDB token and no network.
 *
 * Two of the snapshots are incomplete, which is what a real one looks like when
 * TMDB was missing a field on the day it was taken.
 */
const DEMO_FILMS = [
  {
    itemId: '55555555-5555-4555-8555-000000000001',
    tmdbId: 78,
    title: 'Blade Runner',
    overview: 'A blade runner must pursue and terminate four replicants.',
    releaseDate: new Date('1982-06-25T00:00:00.000Z'),
    runtimeMinutes: 117,
    genreIds: [878, 53],
    addedAt: new Date('2026-02-01T10:00:00.000Z'),
    note: 'Still the best-looking film ever made.',
    tags: ['sci-fi', 'rewatch'],
    rating: 5,
  },
  {
    itemId: '55555555-5555-4555-8555-000000000002',
    tmdbId: 238,
    title: 'The Godfather',
    overview: 'The ageing patriarch of an organised crime dynasty hands over control.',
    releaseDate: new Date('1972-03-14T00:00:00.000Z'),
    runtimeMinutes: 175,
    genreIds: [18, 80],
    addedAt: new Date('2026-02-02T10:00:00.000Z'),
    note: null,
    tags: ['classic'],
    rating: 4,
  },
  {
    itemId: '55555555-5555-4555-8555-000000000003',
    tmdbId: 419430,
    title: 'Get Out',
    overview: 'A young man visits his girlfriend’s family estate and learns why.',
    releaseDate: new Date('2017-02-24T00:00:00.000Z'),
    runtimeMinutes: 104,
    genreIds: [27, 53, 9648],
    addedAt: new Date('2026-02-03T10:00:00.000Z'),
    note: 'Tighter than I remembered.',
    tags: [],
    rating: 3,
  },
  {
    itemId: '55555555-5555-4555-8555-000000000004',
    tmdbId: 11216,
    title: 'Cinema Paradiso',
    overview: 'A filmmaker recalls his childhood at the village cinema.',
    // TMDB had no release date for this one when the snapshot was taken.
    releaseDate: null,
    runtimeMinutes: 155,
    genreIds: [18, 10749],
    addedAt: new Date('2026-02-04T10:00:00.000Z'),
    note: null,
    tags: [],
    rating: 2,
  },
  {
    itemId: '55555555-5555-4555-8555-000000000005',
    tmdbId: 496243,
    title: 'Parasite',
    overview: 'A poor family schemes to become employed by a wealthy one.',
    releaseDate: new Date('2019-05-30T00:00:00.000Z'),
    runtimeMinutes: 133,
    genreIds: [35, 53, 18],
    addedAt: new Date('2026-02-05T10:00:00.000Z'),
    note: null,
    tags: ['rewatch'],
    rating: null,
  },
  {
    itemId: '55555555-5555-4555-8555-000000000006',
    tmdbId: 129,
    title: 'Spirited Away',
    overview: 'A girl wanders into a world of spirits and must free her parents.',
    releaseDate: new Date('2001-07-20T00:00:00.000Z'),
    // TMDB had no runtime for this one when the snapshot was taken.
    runtimeMinutes: null,
    genreIds: [16, 10751, 14],
    addedAt: new Date('2026-02-06T10:00:00.000Z'),
    note: null,
    tags: [],
    rating: null,
  },
] as const

async function main() {
  for (const user of USERS) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: { name: user.name },
      create: user,
    })
  }

  for (const collection of [EMPTY_COLLECTION, DEMO_COLLECTION]) {
    await prisma.collection.upsert({
      where: { id: collection.id },
      update: { name: collection.name },
      create: collection,
    })
  }

  for (const genre of GENRES) {
    await prisma.genre.upsert({
      where: { id: genre.id },
      update: { name: genre.name },
      create: genre,
    })
  }

  for (const film of DEMO_FILMS) {
    const snapshot = {
      tmdbId: film.tmdbId,
      title: film.title,
      overview: film.overview,
      posterPath: null,
      releaseDate: film.releaseDate,
      runtimeMinutes: film.runtimeMinutes,
      fetchedAt: SNAPSHOT_TAKEN,
    }
    const genres = film.genreIds.map((id) => ({ id }))

    const movie = await prisma.movie.upsert({
      where: { tmdbId: film.tmdbId },
      update: { ...snapshot, genres: { set: genres } },
      create: { ...snapshot, genres: { connect: genres } },
    })

    const annotation = {
      addedAt: film.addedAt,
      note: film.note,
      tags: [...film.tags],
      rating: film.rating,
    }

    await prisma.collectionItem.upsert({
      where: { id: film.itemId },
      update: annotation,
      create: {
        id: film.itemId,
        collectionId: DEMO_COLLECTION.id,
        movieId: movie.id,
        ...annotation,
      },
    })
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { collections: true } } },
  })

  for (const user of users) {
    console.log(`${user.name}\t${user.id}\t${user._count.collections} collection(s)`)
  }
}

main()
  .catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
