import { describe, expect, it } from 'vitest'
import { createTmdbClient } from './client.js'
import { TmdbError, TmdbRequestError, TmdbResponseError } from './errors.js'

const TOKEN = 'test-read-access-token'

type Call = { url: URL; init: RequestInit | undefined }

function stubFetch(responder: (url: URL) => Response | Promise<Response>) {
  const calls: Call[] = []
  const fetchImpl: typeof globalThis.fetch = async (input, init) => {
    calls.push({ url: input instanceof URL ? input : new URL(String(input)), init })
    return responder(input instanceof URL ? input : new URL(String(input)))
  }
  return { fetchImpl, calls }
}

function jsonResponse(
  body: unknown,
  init: { status?: number; headers?: Record<string, string> } = {},
) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'content-type': 'application/json', ...init.headers },
  })
}

function clientWith(responder: (url: URL) => Response | Promise<Response>) {
  const { fetchImpl, calls } = stubFetch(responder)
  return { client: createTmdbClient({ readAccessToken: TOKEN, fetch: fetchImpl }), calls }
}

const SEARCH_BODY = {
  page: 1,
  total_pages: 3,
  total_results: 42,
  results: [
    {
      id: 78,
      title: 'Blade Runner',
      overview: 'A blade runner must pursue and terminate four replicants.',
      poster_path: '/63N9uy8nd9j7Eog2axPQ8lbr3Wj.jpg',
      release_date: '1982-06-25',
      vote_average: 7.9,
      genre_ids: [878, 18, 53],
      // Keys we never asked for, which must not survive the boundary.
      adult: false,
      original_language: 'en',
      popularity: 94.2,
    },
    {
      id: 335984,
      title: 'Blade Runner 2049',
      overview: '',
      poster_path: null,
      release_date: '',
      vote_average: 7.6,
      // genre_ids omitted entirely.
    },
  ],
}

const DETAILS_BODY = {
  id: 78,
  title: 'Blade Runner',
  overview: 'A blade runner must pursue and terminate four replicants.',
  poster_path: '/63N9uy8nd9j7Eog2axPQ8lbr3Wj.jpg',
  release_date: '1982-06-25',
  vote_average: 7.9,
  runtime: 117,
  genres: [
    { id: 878, name: 'Science Fiction' },
    { id: 18, name: 'Drama' },
  ],
  tagline: 'Man has made his match...',
  budget: 28000000,
  belongs_to_collection: null,
}

describe('createTmdbClient', () => {
  it('requires a read access token', () => {
    expect(() => createTmdbClient({ readAccessToken: '' })).toThrow(TmdbError)
    expect(() => createTmdbClient({ readAccessToken: '   ' })).toThrow(
      /read access token is required/i,
    )
  })
})

describe('searchMovies', () => {
  it('sends the query as a bearer-authenticated request', async () => {
    const { client, calls } = clientWith(() => jsonResponse(SEARCH_BODY))

    await client.searchMovies('blade runner')

    expect(calls).toHaveLength(1)
    const call = calls[0]!
    expect(call.url.origin + call.url.pathname).toBe(
      'https://api.themoviedb.org/3/search/movie',
    )
    expect(call.url.searchParams.get('query')).toBe('blade runner')
    expect(call.url.searchParams.get('page')).toBe('1')
    expect(call.url.searchParams.get('include_adult')).toBe('false')
    expect(call.url.searchParams.get('language')).toBe('en-US')

    // The credential travels in a header, never in the URL.
    expect(call.url.search).not.toContain(TOKEN)
    const headers = call.init?.headers as Record<string, string>
    expect(headers.Authorization).toBe(`Bearer ${TOKEN}`)
  })

  it('maps TMDB payloads onto domain types', async () => {
    const { client } = clientWith(() => jsonResponse(SEARCH_BODY))

    const page = await client.searchMovies('blade runner')

    expect(page).toEqual({
      page: 1,
      totalPages: 3,
      totalResults: 42,
      results: [
        {
          tmdbId: 78,
          title: 'Blade Runner',
          overview: 'A blade runner must pursue and terminate four replicants.',
          posterPath: '/63N9uy8nd9j7Eog2axPQ8lbr3Wj.jpg',
          releaseDate: '1982-06-25',
          voteAverage: 7.9,
          genreIds: [878, 18, 53],
        },
        {
          tmdbId: 335984,
          title: 'Blade Runner 2049',
          overview: null,
          posterPath: null,
          releaseDate: null,
          voteAverage: 7.6,
          genreIds: [],
        },
      ],
    })
  })

  it('leaks no TMDB field names to callers', async () => {
    const { client } = clientWith(() => jsonResponse(SEARCH_BODY))

    const page = await client.searchMovies('blade runner')

    const keys = Object.keys(page.results[0]!)
    expect(keys.some((key) => key.includes('_'))).toBe(false)
    expect(keys).not.toContain('adult')
    expect(keys).not.toContain('popularity')
  })

  it('answers an empty query without spending a request', async () => {
    const { client, calls } = clientWith(() => jsonResponse(SEARCH_BODY))

    expect(await client.searchMovies('   ')).toEqual({
      page: 1,
      totalPages: 0,
      totalResults: 0,
      results: [],
    })
    expect(calls).toHaveLength(0)
  })

  it('passes the requested page through', async () => {
    const { client, calls } = clientWith(() => jsonResponse({ ...SEARCH_BODY, page: 4 }))

    const page = await client.searchMovies('blade runner', { page: 4 })

    expect(calls[0]!.url.searchParams.get('page')).toBe('4')
    expect(page.page).toBe(4)
  })
})

describe('getMovie', () => {
  it('maps details including named genres', async () => {
    const { client, calls } = clientWith(() => jsonResponse(DETAILS_BODY))

    const movie = await client.getMovie(78)

    expect(calls[0]!.url.pathname).toBe('/3/movie/78')
    expect(movie).toEqual({
      tmdbId: 78,
      title: 'Blade Runner',
      overview: 'A blade runner must pursue and terminate four replicants.',
      posterPath: '/63N9uy8nd9j7Eog2axPQ8lbr3Wj.jpg',
      releaseDate: '1982-06-25',
      voteAverage: 7.9,
      runtimeMinutes: 117,
      genres: [
        { id: 878, name: 'Science Fiction' },
        { id: 18, name: 'Drama' },
      ],
      tagline: 'Man has made his match...',
    })
  })

  it('treats a zero runtime as unknown rather than as zero minutes', async () => {
    const { client } = clientWith(() => jsonResponse({ ...DETAILS_BODY, runtime: 0 }))

    expect((await client.getMovie(78)).runtimeMinutes).toBeNull()
  })

  it('tolerates a details payload with no genres', async () => {
    const { client } = clientWith(() =>
      jsonResponse({ ...DETAILS_BODY, genres: null, tagline: '' }),
    )

    const movie = await client.getMovie(78)
    expect(movie.genres).toEqual([])
    expect(movie.tagline).toBeNull()
  })

  it('rejects an invalid id without spending a request', async () => {
    const { client, calls } = clientWith(() => jsonResponse(DETAILS_BODY))

    await expect(client.getMovie(0)).rejects.toThrow(TmdbError)
    await expect(client.getMovie(1.5)).rejects.toThrow(/invalid tmdb movie id/i)
    expect(calls).toHaveLength(0)
  })
})

describe('response validation', () => {
  it('rejects a payload missing a field we depend on', async () => {
    const { client } = clientWith(() =>
      jsonResponse({
        ...SEARCH_BODY,
        results: [{ title: 'Nameless', overview: 'No id at all.' }],
      }),
    )

    await expect(client.searchMovies('blade runner')).rejects.toThrow(TmdbResponseError)
  })

  it('rejects a payload whose shape changed entirely', async () => {
    const { client } = clientWith(() => jsonResponse({ movies: [] }))

    await expect(client.searchMovies('blade runner')).rejects.toThrow(
      /unexpected shape/i,
    )
  })

  it('rejects a successful response that is not JSON', async () => {
    const { client } = clientWith(
      () => new Response('not json at all', { status: 200 }),
    )

    await expect(client.getMovie(78)).rejects.toThrow(TmdbResponseError)
  })
})

describe('transport failures', () => {
  it('wraps a network failure and preserves the cause', async () => {
    const underlying = new Error('getaddrinfo ENOTFOUND api.themoviedb.org')
    const client = createTmdbClient({
      readAccessToken: TOKEN,
      fetch: () => Promise.reject(underlying),
    })

    const error = await client.getMovie(78).catch((cause: unknown) => cause)
    expect(error).toBeInstanceOf(TmdbError)
    expect(error).not.toBeInstanceOf(TmdbRequestError)
    expect((error as Error).cause).toBe(underlying)
  })
})
