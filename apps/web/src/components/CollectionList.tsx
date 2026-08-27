import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import { EmptyState, ErrorState, Loading } from './States'

type CollectionListProps = {
  userId: string
  onOpen: (collectionId: string) => void
}

export function CollectionList({ userId, onOpen }: CollectionListProps) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')

  const collections = useQuery({
    queryKey: ['collections', userId],
    queryFn: () => api.listCollections(userId),
  })

  const create = useMutation({
    mutationFn: (value: string) => api.createCollection(userId, value),
    onSuccess: async (collection) => {
      setName('')
      await queryClient.invalidateQueries({ queryKey: ['collections', userId] })
      onOpen(collection.id)
    },
  })

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (trimmed) create.mutate(trimmed)
  }

  return (
    <div className="page">
      <div className="page__head">
        <h1 className="page__title">Collections</h1>
        <form className="create" onSubmit={handleSubmit}>
          <input
            className="input"
            value={name}
            maxLength={120}
            placeholder="Name a new collection"
            disabled={create.isPending}
            onChange={(event) => setName(event.target.value)}
          />
          <button type="submit" className="button" disabled={create.isPending || !name.trim()}>
            {create.isPending ? 'Creating' : 'Create'}
          </button>
        </form>
      </div>

      {create.isError ? <ErrorState error={create.error} /> : null}

      {collections.isPending ? (
        <Loading label="Loading collections" />
      ) : collections.isError ? (
        <ErrorState error={collections.error} onRetry={() => void collections.refetch()} />
      ) : collections.data.length === 0 ? (
        <EmptyState title="No collections yet">
          Name one above. &ldquo;Rainy Sunday&rdquo; and &ldquo;Films I Should Have Seen By
          Now&rdquo; are both perfectly good answers.
        </EmptyState>
      ) : (
        <ul className="cards">
          {collections.data.map((collection) => (
            <li key={collection.id}>
              <button
                type="button"
                className="card"
                onClick={() => onOpen(collection.id)}
              >
                <span className="card__posters">
                  {collection.posterUrls.length ? (
                    collection.posterUrls.map((url) => (
                      <img key={url} className="card__poster" src={url} alt="" loading="lazy" />
                    ))
                  ) : (
                    <span className="card__poster card__poster--empty" />
                  )}
                </span>
                <span className="card__name">{collection.name}</span>
                <span className="card__count">
                  {collection.movieCount} {collection.movieCount === 1 ? 'film' : 'films'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
