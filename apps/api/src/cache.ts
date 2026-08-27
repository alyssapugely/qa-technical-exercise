export type TtlCacheOptions = {
  ttlMs: number
  maxEntries: number
}

export type CacheResult<T> = {
  value: T
  hit: boolean
}

type Entry<T> = {
  promise: Promise<T>
  expiresAt: number
}

/**
 * A deliberately small read-through cache in front of TMDB.
 *
 * It stores the in-flight promise rather than the resolved value, so N
 * concurrent requests for the same key produce one upstream call. Rejections
 * are evicted rather than cached, so a transient TMDB failure does not poison
 * the key for the rest of the TTL.
 *
 * State is per-process and does not survive a restart.
 */
export function createTtlCache<T>({ ttlMs, maxEntries }: TtlCacheOptions) {
  const entries = new Map<string, Entry<T>>()

  function evictExpired(now: number) {
    for (const [key, entry] of entries) {
      if (entry.expiresAt <= now) entries.delete(key)
    }
  }

  function remember(key: string, entry: Entry<T>) {
    entries.set(key, entry)

    if (entries.size > maxEntries) {
      evictExpired(Date.now())
    }

    // Map iterates in insertion order, so the first key is the oldest.
    while (entries.size > maxEntries) {
      const oldest = entries.keys().next()
      if (oldest.done) break
      entries.delete(oldest.value)
    }
  }

  return {
    async fetch(key: string, load: () => Promise<T>): Promise<CacheResult<T>> {
      const now = Date.now()
      const existing = entries.get(key)

      if (existing && existing.expiresAt > now) {
        return { value: await existing.promise, hit: true }
      }

      const promise = load()
      const entry: Entry<T> = { promise, expiresAt: now + ttlMs }
      remember(key, entry)

      promise.catch(() => {
        if (entries.get(key) === entry) entries.delete(key)
      })

      return { value: await promise, hit: false }
    },

    get size() {
      return entries.size
    },

    clear() {
      entries.clear()
    },
  }
}
