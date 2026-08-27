import { formatMinutes } from '../format'
import type { CollectionStats } from '../types'

function Tile({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="tile">
      <span className="tile__label">{label}</span>
      <span className="tile__value">{value}</span>
      {detail ? <span className="tile__detail">{detail}</span> : null}
    </div>
  )
}

function Bars({
  rows,
}: {
  rows: { key: string | number; label: string; count: number }[]
}) {
  const max = Math.max(...rows.map((row) => row.count), 1)

  return (
    <ul className="bars">
      {rows.map((row) => (
        <li key={row.key} className="bars__row">
          <span className="bars__label">{row.label}</span>
          <span className="bars__track">
            <span className="bars__fill" style={{ width: `${(row.count / max) * 100}%` }} />
          </span>
          <span className="bars__count">{row.count}</span>
        </li>
      ))}
    </ul>
  )
}

const TOP_GENRES = 6

export function StatsPanel({ stats }: { stats: CollectionStats }) {
  const { runtime, rating, genres, releaseYears, movieCount } = stats

  if (movieCount === 0) {
    return (
      <section className="stats stats--empty">
        <p>Stats appear once there is something in here to measure.</p>
      </section>
    )
  }

  const span =
    releaseYears.earliest === null || releaseYears.latest === null
      ? '—'
      : releaseYears.earliest === releaseYears.latest
        ? String(releaseYears.earliest)
        : `${releaseYears.earliest}–${releaseYears.latest}`

  return (
    <section className="stats">
      <div className="stats__tiles">
        <Tile label="Films" value={String(movieCount)} />
        <Tile
          label="Total runtime"
          value={formatMinutes(runtime.totalMinutes)}
          // Naming the unknowns keeps the total honest rather than quietly short.
          detail={
            runtime.unknownCount > 0
              ? `${runtime.unknownCount} with no runtime`
              : `avg ${runtime.averageMinutes ?? 0}m`
          }
        />
        <Tile
          label="Average rating"
          value={rating.average === null ? '—' : rating.average.toFixed(1)}
          detail={`${rating.ratedCount} of ${movieCount} rated`}
        />
        <Tile label="Release years" value={span} />
      </div>

      <div className="stats__charts">
        <div className="stats__chart">
          <h3 className="stats__heading">Genres</h3>
          <Bars
            rows={genres.slice(0, TOP_GENRES).map((genre) => ({
              key: genre.id,
              label: genre.name,
              count: genre.count,
            }))}
          />
          {genres.length > TOP_GENRES ? (
            <p className="stats__more">+{genres.length - TOP_GENRES} more</p>
          ) : null}
        </div>

        <div className="stats__chart">
          <h3 className="stats__heading">Decades</h3>
          {releaseYears.decades.length ? (
            <Bars
              rows={releaseYears.decades.map((entry) => ({
                key: entry.decade,
                label: `${entry.decade}s`,
                count: entry.count,
              }))}
            />
          ) : (
            <p className="stats__more">No release dates on record.</p>
          )}
        </div>
      </div>
    </section>
  )
}
