/** Display helpers shared by the stats panel and the film rows. */

export function formatMinutes(total: number): string {
  if (total <= 0) return '0m'
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  if (!hours) return `${minutes}m`
  if (!minutes) return `${hours}h`
  return `${hours}h ${minutes}m`
}

export function yearOf(releaseDate: string | null): string | null {
  return releaseDate ? releaseDate.slice(0, 4) : null
}
