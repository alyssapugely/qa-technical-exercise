import { describe, expect, it } from 'vitest'
import { posterUrl } from './images.js'

describe('posterUrl', () => {
  it('builds a URL at the default size', () => {
    expect(posterUrl('/abc.jpg')).toBe('https://image.tmdb.org/t/p/w342/abc.jpg')
  })

  it('honours an explicit size', () => {
    expect(posterUrl('/abc.jpg', 'original')).toBe(
      'https://image.tmdb.org/t/p/original/abc.jpg',
    )
  })

  it('returns null for a missing poster so callers can branch on it', () => {
    expect(posterUrl(null)).toBeNull()
    expect(posterUrl(undefined)).toBeNull()
    expect(posterUrl('')).toBeNull()
  })
})
