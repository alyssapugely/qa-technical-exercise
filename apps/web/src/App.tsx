import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from './api'
import { CollectionList } from './components/CollectionList'
import { CollectionView } from './components/CollectionView'
import { Header } from './components/Header'
import { ErrorState, Loading } from './components/States'

/** Views are state rather than routes; one union keeps navigation obvious. */
type View = { name: 'collections' } | { name: 'collection'; id: string }

const USER_STORAGE_KEY = 'curator.userId'

export function App() {
  const [userId, setUserId] = useState<string | null>(() =>
    window.localStorage.getItem(USER_STORAGE_KEY),
  )
  const [view, setView] = useState<View>({ name: 'collections' })

  const users = useQuery({ queryKey: ['users'], queryFn: api.listUsers })

  // Fall back to the first seeded user, and recover if a stored id no longer
  // exists (for example after the database was reset).
  useEffect(() => {
    if (!users.data?.length) return
    const known = users.data.some((user) => user.id === userId)
    if (!known) setUserId(users.data[0]!.id)
  }, [users.data, userId])

  useEffect(() => {
    if (userId) window.localStorage.setItem(USER_STORAGE_KEY, userId)
  }, [userId])

  function handleUserChange(nextUserId: string) {
    setUserId(nextUserId)
    // The open collection belongs to the previous user, so go somewhere valid.
    setView({ name: 'collections' })
  }

  if (users.isPending) return <Loading label="Starting up" />
  if (users.isError) {
    return (
      <main className="shell">
        <ErrorState error={users.error} onRetry={() => void users.refetch()} />
      </main>
    )
  }
  if (!userId) return <Loading label="Choosing a user" />

  return (
    <div className="shell">
      <Header
        users={users.data}
        userId={userId}
        onUserChange={handleUserChange}
        onHome={() => setView({ name: 'collections' })}
      />

      <main>
        {view.name === 'collections' ? (
          <CollectionList
            userId={userId}
            onOpen={(id) => setView({ name: 'collection', id })}
          />
        ) : (
          <CollectionView
            userId={userId}
            collectionId={view.id}
            onBack={() => setView({ name: 'collections' })}
          />
        )}
      </main>
    </div>
  )
}
