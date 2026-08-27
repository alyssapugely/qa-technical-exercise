const STARS = [1, 2, 3, 4, 5]

type StarRatingProps = {
  value: number | null
  onChange: (rating: number | null) => void
  disabled?: boolean
}

/**
 * Clicking the current rating clears it, which is the only way to get back to
 * "unrated" once a star has been pressed.
 */
export function StarRating({ value, onChange, disabled = false }: StarRatingProps) {
  return (
    <div className="stars" role="group" aria-label="Rating">
      {STARS.map((star) => {
        const filled = value !== null && star <= value
        return (
          <button
            key={star}
            type="button"
            className={`stars__star${filled ? ' stars__star--filled' : ''}`}
            aria-label={`${star} star${star === 1 ? '' : 's'}`}
            aria-pressed={filled}
            disabled={disabled}
            onClick={() => onChange(value === star ? null : star)}
          >
            ★
          </button>
        )
      })}
      <span className="stars__value">{value === null ? 'Unrated' : `${value}/5`}</span>
    </div>
  )
}
