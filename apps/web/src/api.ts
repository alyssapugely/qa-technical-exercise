import type {
  AnnotationPatch,
  CollectionDetail,
  CollectionItem,
  CollectionSummary,
  SearchResponse,
  User,
} from './types'

/**
 * Carries the API's error envelope through to the UI, so a failed mutation can
 * say "Blade Runner is already in this collection" rather than "request failed".
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  userId?: string
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, userId } = options

  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  // Identity for the request; the API scopes every read and write by it.
  if (userId) headers['X-User-Id'] = userId

  const response = await fetch(`/api${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (response.status === 204) return undefined as T

  const payload: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const envelope =
      payload && typeof payload === 'object' && 'error' in payload
        ? (payload as { error: { code?: string; message?: string } }).error
        : null

    throw new ApiError(
      response.status,
      envelope?.code ?? 'unknown_error',
      envelope?.message ?? `Request failed with status ${response.status}.`,
    )
  }

  return payload as T
}

export const api = {
  listUsers: () => request<{ users: User[] }>('/users').then((r) => r.users),

  listCollections: (userId: string) =>
    request<{ collections: CollectionSummary[] }>('/collections', { userId }).then(
      (r) => r.collections,
    ),

  getCollection: (userId: string, id: string) =>
    request<{ collection: CollectionDetail }>(`/collections/${id}`, { userId }).then(
      (r) => r.collection,
    ),

  createCollection: (userId: string, name: string) =>
    request<{ collection: CollectionDetail }>('/collections', {
      method: 'POST',
      body: { name },
      userId,
    }).then((r) => r.collection),

  renameCollection: (userId: string, id: string, name: string) =>
    request<{ collection: CollectionDetail }>(`/collections/${id}`, {
      method: 'PATCH',
      body: { name },
      userId,
    }).then((r) => r.collection),

  deleteCollection: (userId: string, id: string) =>
    request<void>(`/collections/${id}`, { method: 'DELETE', userId }),

  searchMovies: (userId: string, query: string, page = 1) =>
    request<SearchResponse>(
      `/movies/search?q=${encodeURIComponent(query)}&page=${page}`,
      { userId },
    ),

  addMovie: (userId: string, collectionId: string, tmdbId: number) =>
    request<{ item: CollectionItem }>(`/collections/${collectionId}/movies`, {
      method: 'POST',
      body: { tmdbId },
      userId,
    }).then((r) => r.item),

  removeMovie: (userId: string, collectionId: string, itemId: string) =>
    request<void>(`/collections/${collectionId}/movies/${itemId}`, {
      method: 'DELETE',
      userId,
    }),

  annotateMovie: (
    userId: string,
    collectionId: string,
    itemId: string,
    patch: AnnotationPatch,
  ) =>
    request<{ item: CollectionItem }>(`/collections/${collectionId}/movies/${itemId}`, {
      method: 'PATCH',
      body: patch,
      userId,
    }).then((r) => r.item),
}
