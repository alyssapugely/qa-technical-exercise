/** Mirrors the API's wire shapes (apps/api/src/serialize.ts and stats.ts). */

export type User = {
  id: string
  name: string
}

export type Genre = {
  id: number
  name: string
}

export type Movie = {
  tmdbId: number
  title: string
  overview: string | null
  posterUrl: string | null
  releaseDate: string | null
  runtimeMinutes: number | null
  genres: Genre[]
}

export type Annotation = {
  note: string | null
  tags: string[]
  rating: number | null
}

export type CollectionItem = {
  id: string
  addedAt: string
  movie: Movie
  annotation: Annotation
}

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

export type CollectionSummary = {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  movieCount: number
  posterUrls: string[]
}

export type CollectionDetail = CollectionSummary & {
  items: CollectionItem[]
  stats: CollectionStats
}

export type SearchResult = {
  tmdbId: number
  title: string
  overview: string | null
  posterUrl: string | null
  releaseDate: string | null
  voteAverage: number | null
}

export type SearchResponse = {
  page: number
  totalPages: number
  totalResults: number
  results: SearchResult[]
}

export type AnnotationPatch = {
  note?: string | null
  tags?: string[]
  rating?: number | null
}
