import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '../api'
import { yearOf } from '../format'
import { useDebouncedValue } from '../useDebouncedValue'
import { Poster } from './Poster'
import { ErrorState, Loading } from './States'

type MovieSearchProps = {
  userId: string
  existingTmdbIds: Set<number>
  addingTmdbId: number | null
  onAdd: (tmdbId: number) => void
}

export function MovieSearch({
  userId,
  existingTmdbIds,
  addingTmdbId,
  onAdd,
}: MovieSearchProps) {
  const [query, setQuery] = useState('')
  const debounced = useDebouncedValue(query.trim(), 300)

  const search = useQuery({
    queryKey: ['search', userId, debounced],
    queryFn: () => api.searchMovies(userId, debounced),
    enabled: debounced.length > 0,
    // Hold the previous results while a new query loads, so the list does not
    // flash empty on every keystroke.
    placeholderData: keepPreviousData,
  })

  return (
    <section className="search">
      <label className="field">
        <span className="field__label">Add a film</span>
        <input
          className="input"
          type="search"
          value={query}
          placeholder="Search TMDB by title"
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      {search.isError ? (
        <ErrorState error={search.error} onRetry={() => void search.refetch()} />
      ) : search.isFetching && !search.data ? (
        <Loading label="Searching TMDB" />
      ) : !search.data ? null : search.data.results.length === 0 ? (
        <p className="state state--empty">Nothing on TMDB matches that.</p>
      ) : (
        <ul className="results">
          {search.data.results.map((result) => {
            const already = existingTmdbIds.has(result.tmdbId)
            const year = yearOf(result.releaseDate)

            return (
              <li key={result.tmdbId} className="result">
                <Poster url={result.posterUrl} title={result.title} />
                <div className="result__body">
                  <p className="result__title">
                    {result.title}
                    {year ? <span className="film__year"> ({year})</span> : null}
                  </p>
                  {result.overview ? (
                    <p className="result__overview">{result.overview}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="button"
                  disabled={already || addingTmdbId === result.tmdbId}
                  onClick={() => onAdd(result.tmdbId)}
                >
                  {already ? 'Added' : addingTmdbId === result.tmdbId ? 'Adding' : 'Add'}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
