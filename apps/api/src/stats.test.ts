import { describe, expect, it } from 'vitest'
import type { CollectionItemDto } from './serialize.js'
import { computeStats } from './stats.js'

type ItemOverrides = {
  runtimeMinutes?: number | null
  releaseDate?: string | null
  genres?: { id: number; name: string }[]
  rating?: number | null
}

let nextId = 0

function item({
  runtimeMinutes = 100,
  releaseDate = '1999-01-01',
  genres = [{ id: 18, name: 'Drama' }],
  rating = null,
}: ItemOverrides = {}): CollectionItemDto {
  nextId += 1
  return {
    id: `item-${nextId}`,
    addedAt: '2026-01-01T00:00:00.000Z',
    movie: {
      tmdbId: nextId,
      title: `Film ${nextId}`,
      overview: null,
      posterUrl: null,
      releaseDate,
      runtimeMinutes,
      genres,
    },
    annotation: { note: null, tags: [], rating },
  }
}

describe('computeStats', () => {
  it('returns defined zero states for an empty collection', () => {
    expect(computeStats([])).toEqual({
      movieCount: 0,
      runtime: { totalMinutes: 0, averageMinutes: null, knownCount: 0, unknownCount: 0 },
      rating: { average: null, ratedCount: 0, unratedCount: 0 },
      genres: [],
      releaseYears: { earliest: null, latest: null, decades: [] },
    })
  })

  it('totals runtime and counts what TMDB could not tell us', () => {
    const stats = computeStats([
      item({ runtimeMinutes: 118 }),
      item({ runtimeMinutes: 164 }),
      item({ runtimeMinutes: null }),
    ])

    expect(stats.runtime).toEqual({
      totalMinutes: 282,
      // Averaged over the two we know, not over all three.
      averageMinutes: 141,
      knownCount: 2,
      unknownCount: 1,
    })
  })

  it('reports no average runtime when nothing has a runtime', () => {
    const stats = computeStats([item({ runtimeMinutes: null }), item({ runtimeMinutes: null })])

    expect(stats.runtime.totalMinutes).toBe(0)
    expect(stats.runtime.averageMinutes).toBeNull()
    expect(stats.runtime.unknownCount).toBe(2)
  })

  it('rounds an awkward average to one decimal', () => {
    const stats = computeStats([item({ rating: 1 }), item({ rating: 2 }), item({ rating: 2 })])

    expect(stats.rating.average).toBe(1.7)
  })

  it('counts a film once per genre and orders by frequency then name', () => {
    const drama = { id: 18, name: 'Drama' }
    const sciFi = { id: 878, name: 'Science Fiction' }
    const thriller = { id: 53, name: 'Thriller' }

    const stats = computeStats([
      item({ genres: [drama, sciFi, thriller] }),
      item({ genres: [drama, sciFi] }),
      item({ genres: [drama] }),
    ])

    expect(stats.genres).toEqual([
      { id: 18, name: 'Drama', count: 3 },
      { id: 878, name: 'Science Fiction', count: 2 },
      { id: 53, name: 'Thriller', count: 1 },
    ])
  })

  it('breaks equal genre counts alphabetically', () => {
    const stats = computeStats([
      item({ genres: [{ id: 53, name: 'Thriller' }] }),
      item({ genres: [{ id: 35, name: 'Comedy' }] }),
    ])

    expect(stats.genres.map((genre) => genre.name)).toEqual(['Comedy', 'Thriller'])
  })

  it('spans release years and buckets them by decade', () => {
    const stats = computeStats([
      item({ releaseDate: '1982-06-25' }),
      item({ releaseDate: '1989-01-01' }),
      item({ releaseDate: '2017-10-04' }),
    ])

    expect(stats.releaseYears).toEqual({
      earliest: 1982,
      latest: 2017,
      decades: [
        { decade: 1980, count: 2 },
        { decade: 2010, count: 1 },
      ],
    })
  })

  it('ignores films with no release date rather than guessing a year', () => {
    const stats = computeStats([item({ releaseDate: null }), item({ releaseDate: '2001-01-01' })])

    expect(stats.releaseYears).toEqual({
      earliest: 2001,
      latest: 2001,
      decades: [{ decade: 2000, count: 1 }],
    })
    expect(stats.movieCount).toBe(2)
  })

  it('handles a single film without collapsing the year span', () => {
    const stats = computeStats([item({ releaseDate: '1954-04-26', runtimeMinutes: 207, rating: 5 })])

    expect(stats.movieCount).toBe(1)
    expect(stats.runtime.averageMinutes).toBe(207)
    expect(stats.rating.average).toBe(5)
    expect(stats.releaseYears.earliest).toBe(1954)
    expect(stats.releaseYears.latest).toBe(1954)
  })
})
