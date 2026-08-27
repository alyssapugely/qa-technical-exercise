import type { CollectionItemDto } from './serialize.js'

export type CollectionStats = {
  movieCount: number
  runtime: {
    totalMinutes: number
    averageMinutes: number | null
    knownCount: number
    unknownCount: number
  }
  rating: {
    average: number | null
    ratedCount: number
    unratedCount: number
  }
  genres: { id: number; name: string; count: number }[]
  releaseYears: {
    earliest: number | null
    latest: number | null
    decades: { decade: number; count: number }[]
  }
}

function yearOf(releaseDate: string | null): number | null {
  if (!releaseDate) return null
  const year = Number(releaseDate.slice(0, 4))
  return Number.isInteger(year) ? year : null
}

/**
 * Folds a loaded collection into the numbers the UI shows. Pure on purpose:
 * no Prisma import and no I/O.
 */
export function computeStats(items: CollectionItemDto[]): CollectionStats {
  let totalMinutes = 0
  let knownRuntimes = 0
  let ratingTotal = 0
  let ratedCount = 0
  let earliest: number | null = null
  let latest: number | null = null

  const genreCounts = new Map<number, { id: number; name: string; count: number }>()
  const decadeCounts = new Map<number, number>()

  for (const item of items) {
    const { runtimeMinutes, genres, releaseDate } = item.movie

    if (runtimeMinutes !== null) {
      totalMinutes += runtimeMinutes
      knownRuntimes += 1
    }

    const rating = item.annotation.rating
    if (rating !== null) {
      ratingTotal += rating
      ratedCount += 1
    }

    for (const genre of genres) {
      const existing = genreCounts.get(genre.id)
      if (existing) {
        existing.count += 1
      } else {
        genreCounts.set(genre.id, { id: genre.id, name: genre.name, count: 1 })
      }
    }

    const year = yearOf(releaseDate)
    if (year !== null) {
      earliest = earliest === null ? year : Math.min(earliest, year)
      latest = latest === null ? year : Math.max(latest, year)

      const decade = Math.floor(year / 10) * 10
      decadeCounts.set(decade, (decadeCounts.get(decade) ?? 0) + 1)
    }
  }

  return {
    movieCount: items.length,
    runtime: {
      totalMinutes,
      // Averaged over films whose runtime we know, not over the whole
      // collection, so unknowns do not silently drag it down.
      averageMinutes: knownRuntimes > 0 ? Math.round(totalMinutes / knownRuntimes) : null,
      knownCount: knownRuntimes,
      unknownCount: items.length - knownRuntimes,
    },
    rating: {
      average: ratedCount > 0 ? Math.round((ratingTotal / items.length) * 10) / 10 : null,
      ratedCount,
      unratedCount: items.length - ratedCount,
    },
    genres: [...genreCounts.values()].sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name),
    ),
    releaseYears: {
      earliest,
      latest,
      decades: [...decadeCounts.entries()]
        .map(([decade, count]) => ({ decade, count }))
        .sort((a, b) => a.decade - b.decade),
    },
  }
}
