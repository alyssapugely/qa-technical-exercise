import { useState } from 'react'
import { formatMinutes, yearOf } from '../format'
import type { CollectionItem } from '../types'
import { Poster } from './Poster'
import { StarRating } from './StarRating'
import { TagInput } from './TagInput'

type FilmRowProps = {
  item: CollectionItem
  saving: boolean
  onRate: (rating: number | null) => void
  onSaveNotes: (patch: { note: string | null; tags: string[] }) => void
  onRemove: () => void
}

export function FilmRow({ item, saving, onRate, onSaveNotes, onRemove }: FilmRowProps) {
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState(item.annotation.note ?? '')
  const [tags, setTags] = useState(item.annotation.tags)

  // Drafts are seeded when the editor opens, deliberately not synced from the
  // server while it is open. Rating a film refetches the collection, and an
  // effect watching the server value would wipe a half-typed note.
  function openEditor() {
    setNote(item.annotation.note ?? '')
    setTags(item.annotation.tags)
    setOpen(true)
  }

  const year = yearOf(item.movie.releaseDate)
  const dirty =
    note.trim() !== (item.annotation.note ?? '') ||
    tags.join(' ') !== item.annotation.tags.join(' ')

  const hasAnnotation =
    item.annotation.note !== null ||
    item.annotation.rating !== null ||
    item.annotation.tags.length > 0

  function handleRemove() {
    // Removing is a hard delete, so warn harder when there is something to lose.
    const message = hasAnnotation
      ? `Remove ${item.movie.title}? Your note, tags and rating for it in this collection are deleted too.`
      : `Remove ${item.movie.title} from this collection?`

    if (window.confirm(message)) onRemove()
  }

  return (
    <li className="film">
      <Poster url={item.movie.posterUrl} title={item.movie.title} />

      <div className="film__body">
        <div className="film__head">
          <h3 className="film__title">
            {item.movie.title}
            {year ? <span className="film__year"> ({year})</span> : null}
          </h3>
          <p className="film__meta">
            {item.movie.runtimeMinutes
              ? formatMinutes(item.movie.runtimeMinutes)
              : 'Runtime unknown'}
            {item.movie.genres.length
              ? ` · ${item.movie.genres.map((genre) => genre.name).join(', ')}`
              : ''}
          </p>
        </div>

        <StarRating value={item.annotation.rating} disabled={saving} onChange={onRate} />

        {!open && item.annotation.tags.length ? (
          <div className="film__tags">
            {item.annotation.tags.map((tag) => (
              <span key={tag} className="tag tag--static">
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        {!open && item.annotation.note ? (
          <p className="film__note">{item.annotation.note}</p>
        ) : null}

        {open ? (
          <div className="film__editor">
            <label className="field">
              <span className="field__label">Note</span>
              <textarea
                className="input input--note"
                rows={3}
                value={note}
                disabled={saving}
                placeholder="What did you make of it?"
                onChange={(event) => setNote(event.target.value)}
              />
            </label>

            <div className="field">
              <span className="field__label">Tags</span>
              <TagInput tags={tags} onChange={setTags} disabled={saving} />
            </div>

            <div className="film__editor-actions">
              <button
                type="button"
                className="button"
                disabled={saving || !dirty}
                onClick={() => onSaveNotes({ note: note.trim() || null, tags })}
              >
                {saving ? 'Saving' : 'Save'}
              </button>
              <button
                type="button"
                className="button button--quiet"
                disabled={saving}
                onClick={() => {
                  setNote(item.annotation.note ?? '')
                  setTags(item.annotation.tags)
                  setOpen(false)
                }}
              >
                Done
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="film__actions">
        <button
          type="button"
          className="button button--quiet"
          onClick={() => (open ? setOpen(false) : openEditor())}
        >
          {open ? 'Hide' : hasAnnotation ? 'Edit' : 'Add notes'}
        </button>
        <button
          type="button"
          className="button button--danger"
          disabled={saving}
          onClick={handleRemove}
        >
          Remove
        </button>
      </div>
    </li>
  )
}
