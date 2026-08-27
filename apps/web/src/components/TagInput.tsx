import { useState, type KeyboardEvent } from 'react'

type TagInputProps = {
  tags: string[]
  onChange: (tags: string[]) => void
  disabled?: boolean
}

/**
 * Enter or comma commits a tag. The server normalises them anyway (lowercase,
 * deduplicated), so this only has to be forgiving about how they are typed.
 */
export function TagInput({ tags, onChange, disabled = false }: TagInputProps) {
  const [draft, setDraft] = useState('')

  function commit() {
    const value = draft.trim().toLowerCase()
    setDraft('')
    if (!value || tags.includes(value)) return
    onChange([...tags, value])
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      commit()
      return
    }
    if (event.key === 'Backspace' && !draft && tags.length) {
      onChange(tags.slice(0, -1))
    }
  }

  return (
    <div className="tag-input">
      <div className="tag-input__tags">
        {tags.map((tag) => (
          <span key={tag} className="tag">
            {tag}
            <button
              type="button"
              className="tag__remove"
              aria-label={`Remove tag ${tag}`}
              disabled={disabled}
              onClick={() => onChange(tags.filter((existing) => existing !== tag))}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        className="input input--tag"
        value={draft}
        disabled={disabled}
        placeholder="Add a tag, then Enter"
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commit}
      />
    </div>
  )
}
