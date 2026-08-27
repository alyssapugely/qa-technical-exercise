import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import type { AnnotationPatch } from '../types'
import { FilmRow } from './FilmRow'
import { MovieSearch } from './MovieSearch'
import { StatsPanel } from './StatsPanel'
import { EmptyState, ErrorState, Loading } from './States'

type CollectionViewProps = {
  userId: string
  collectionId: string
  onBack: () => void
}

type AnnotateVariables = {
  itemId: string
  patch: AnnotationPatch
}

export function CollectionView({ userId, collectionId, onBack }: CollectionViewProps) {
  const queryClient = useQueryClient()
  const collectionKey = ['collection', userId, collectionId]

  const collection = useQuery({
    queryKey: collectionKey,
    queryFn: () => api.getCollection(userId, collectionId),
  })

  const [title, setTitle] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)

  useEffect(() => {
    if (collection.data) setTitle(collection.data.name)
  }, [collection.data])

  /**
   * Every mutation invalidates both the open collection and the list: adding a
   * film changes the card's count and its poster stack, so refreshing only the
   * detail would leave the list quietly stale.
   */
  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: collectionKey }),
      queryClient.invalidateQueries({ queryKey: ['collections', userId] }),
    ])
  }

  const rename = useMutation({
    mutationFn: (value: string) => api.renameCollection(userId, collectionId, value),
    onSuccess: async () => {
      setEditingTitle(false)
      // The name shows on the cards in the list, so refresh those.
      await queryClient.invalidateQueries({ queryKey: ['collections', userId] })
    },
  })

  const remove = useMutation({
    mutationFn: () => api.deleteCollection(userId, collectionId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['collections', userId] })
      onBack()
    },
  })

  const addMovie = useMutation({
    mutationFn: (tmdbId: number) => api.addMovie(userId, collectionId, tmdbId),
    onSuccess: refresh,
  })

  const removeMovie = useMutation({
    mutationFn: (itemId: string) => api.removeMovie(userId, collectionId, itemId),
    onSuccess: refresh,
  })

  const annotate = useMutation({
    mutationFn: ({ itemId, patch }: AnnotateVariables) =>
      api.annotateMovie(userId, collectionId, itemId, patch),
    onSuccess: refresh,
  })

  if (collection.isPending) return <Loading label="Loading collection" />
  if (collection.isError) {
    return (
      <div className="page">
        <button type="button" className="button button--quiet" onClick={onBack}>
          Back to collections
        </button>
        <ErrorState error={collection.error} onRetry={() => void collection.refetch()} />
      </div>
    )
  }

  const data = collection.data
  const existingTmdbIds = new Set(data.items.map((item) => item.movie.tmdbId))

  function savingItem(itemId: string): boolean {
    return (
      (annotate.isPending && annotate.variables?.itemId === itemId) ||
      (removeMovie.isPending && removeMovie.variables === itemId)
    )
  }

  return (
    <div className="page">
      <button type="button" className="button button--quiet" onClick={onBack}>
        Back to collections
      </button>

      <div className="page__head">
        {editingTitle ? (
          <form
            className="create"
            onSubmit={(event) => {
              event.preventDefault()
              const trimmed = title.trim()
              if (trimmed && trimmed !== data.name) rename.mutate(trimmed)
              else setEditingTitle(false)
            }}
          >
            <input
              className="input"
              value={title}
              maxLength={120}
              autoFocus
              disabled={rename.isPending}
              onChange={(event) => setTitle(event.target.value)}
            />
            <button type="submit" className="button" disabled={rename.isPending}>
              {rename.isPending ? 'Saving' : 'Save'}
            </button>
            <button
              type="button"
              className="button button--quiet"
              onClick={() => {
                setTitle(data.name)
                setEditingTitle(false)
              }}
            >
              Cancel
            </button>
          </form>
        ) : (
          <h1 className="page__title">
            {data.name}
            <button
              type="button"
              className="button button--quiet"
              onClick={() => setEditingTitle(true)}
            >
              Rename
            </button>
          </h1>
        )}

        <button
          type="button"
          className="button button--danger"
          disabled={remove.isPending}
          onClick={() => {
            const message =
              data.movieCount > 0
                ? `Delete ${data.name} and its ${data.movieCount} film(s), including your notes and ratings?`
                : `Delete ${data.name}?`
            if (window.confirm(message)) remove.mutate()
          }}
        >
          Delete collection
        </button>
      </div>

      {rename.isError ? <ErrorState error={rename.error} /> : null}
      {remove.isError ? <ErrorState error={remove.error} /> : null}

      <StatsPanel stats={data.stats} />

      {addMovie.isError ? <ErrorState error={addMovie.error} /> : null}

      <MovieSearch
        userId={userId}
        existingTmdbIds={existingTmdbIds}
        addingTmdbId={addMovie.isPending ? (addMovie.variables ?? null) : null}
        onAdd={(tmdbId) => addMovie.mutate(tmdbId)}
      />

      {annotate.isError ? <ErrorState error={annotate.error} /> : null}
      {removeMovie.isError ? <ErrorState error={removeMovie.error} /> : null}

      {data.items.length === 0 ? (
        <EmptyState title="Nothing in here yet">
          Search above to add the first film.
        </EmptyState>
      ) : (
        <ul className="films">
          {data.items.map((item) => (
            <FilmRow
              key={item.id}
              item={item}
              saving={savingItem(item.id)}
              onRate={(rating) => annotate.mutate({ itemId: item.id, patch: { rating } })}
              onSaveNotes={(patch) => annotate.mutate({ itemId: item.id, patch })}
              onRemove={() => removeMovie.mutate(item.id)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
