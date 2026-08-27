import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createTtlCache } from './cache.js'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('createTtlCache', () => {
  it('loads on a miss and serves the same value on a hit', async () => {
    const load = vi.fn(() => Promise.resolve('loaded'))
    const cache = createTtlCache<string>({ ttlMs: 1000, maxEntries: 10 })

    const first = await cache.fetch('key', load)
    const second = await cache.fetch('key', load)

    expect(first).toEqual({ value: 'loaded', hit: false })
    expect(second).toEqual({ value: 'loaded', hit: true })
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('reloads once the entry has expired', async () => {
    let calls = 0
    const load = () => Promise.resolve(`value-${++calls}`)
    const cache = createTtlCache<string>({ ttlMs: 1000, maxEntries: 10 })

    expect((await cache.fetch('key', load)).value).toBe('value-1')

    vi.advanceTimersByTime(1001)

    const refreshed = await cache.fetch('key', load)
    expect(refreshed).toEqual({ value: 'value-2', hit: false })
  })

  it('collapses concurrent requests for the same key into one load', async () => {
    const load = vi.fn(() => Promise.resolve('loaded'))
    const cache = createTtlCache<string>({ ttlMs: 1000, maxEntries: 10 })

    const [a, b, c] = await Promise.all([
      cache.fetch('key', load),
      cache.fetch('key', load),
      cache.fetch('key', load),
    ])

    expect(load).toHaveBeenCalledTimes(1)
    expect([a.value, b.value, c.value]).toEqual(['loaded', 'loaded', 'loaded'])
  })

  it('does not cache a failure, so a transient error is retried', async () => {
    const load = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('upstream is having a moment'))
      .mockResolvedValueOnce('recovered')
    const cache = createTtlCache<string>({ ttlMs: 60_000, maxEntries: 10 })

    await expect(cache.fetch('key', load)).rejects.toThrow('upstream is having a moment')
    expect(cache.size).toBe(0)

    // Well inside the TTL: a cached rejection would resurface here.
    expect((await cache.fetch('key', load)).value).toBe('recovered')
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('stays bounded, evicting the oldest entries first', async () => {
    const cache = createTtlCache<string>({ ttlMs: 60_000, maxEntries: 3 })

    for (const key of ['a', 'b', 'c', 'd', 'e']) {
      await cache.fetch(key, () => Promise.resolve(key))
    }

    expect(cache.size).toBe(3)
    // 'a' was evicted, so it reloads as a miss.
    expect((await cache.fetch('a', () => Promise.resolve('a'))).hit).toBe(false)
    // 'e' was the most recent insert and is still resident.
    expect((await cache.fetch('e', () => Promise.resolve('e'))).hit).toBe(true)
  })

  it('clears on demand', async () => {
    const cache = createTtlCache<string>({ ttlMs: 60_000, maxEntries: 10 })
    await cache.fetch('key', () => Promise.resolve('loaded'))

    expect(cache.size).toBe(1)
    cache.clear()
    expect(cache.size).toBe(0)
  })
})
