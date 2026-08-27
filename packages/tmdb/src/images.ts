import { TMDB_IMAGE_BASE_URL } from './constants.js'

/**
 * TMDB exposes the authoritative list of image sizes via /configuration.
 * Hardcoding the common poster widths avoids a startup round trip; the tradeoff
 * is that a size TMDB retires would 404 until this list is updated.
 */
export const POSTER_SIZES = ['w92', 'w154', 'w185', 'w342', 'w500', 'w780', 'original'] as const

export type PosterSize = (typeof POSTER_SIZES)[number]

export function posterUrl(
  path: string | null | undefined,
  size: PosterSize = 'w342',
  baseUrl: string = TMDB_IMAGE_BASE_URL,
): string | null {
  if (!path) return null
  return `${baseUrl}/${size}${path}`
}
