import type { ReactNode } from 'react'
import { ApiError } from '../api'

export function Loading({ label = 'Loading' }: { label?: string }) {
  return (
    <p className="state state--loading" role="status">
      {label}…
    </p>
  )
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="state state--empty">
      <p className="state__title">{title}</p>
      {children ? <p className="state__body">{children}</p> : null}
    </div>
  )
}

/**
 * Surfaces the API's own message where there is one. "TMDB is rate limiting us"
 * is actionable; "something went wrong" is not.
 */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message =
    error instanceof ApiError || error instanceof Error
      ? error.message
      : 'Something went wrong.'

  return (
    <div className="state state--error" role="alert">
      <p className="state__title">That didn’t work</p>
      <p className="state__body">{message}</p>
      {onRetry ? (
        <button type="button" className="button button--quiet" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  )
}
