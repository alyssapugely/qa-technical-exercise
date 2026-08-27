type PosterProps = {
  url: string | null
  title: string
  size?: 'sm' | 'md'
}

/** Falls back to initials so a missing poster still reads as a film, not a gap. */
export function Poster({ url, title, size = 'sm' }: PosterProps) {
  const className = `poster poster--${size}`

  if (!url) {
    const initials = title
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0] ?? '')
      .join('')
      .toUpperCase()

    return (
      <div className={`${className} poster--empty`} aria-hidden="true">
        {initials}
      </div>
    )
  }

  return <img className={className} src={url} alt="" loading="lazy" />
}
