import type { User } from '../types'

type HeaderProps = {
  users: User[]
  userId: string
  onUserChange: (userId: string) => void
  onHome: () => void
}

export function Header({ users, userId, onUserChange, onHome }: HeaderProps) {
  return (
    <header className="header">
      <button type="button" className="header__brand" onClick={onHome}>
        Movie Collection Curator
      </button>

      <label className="header__user">
        <span className="header__user-label">Viewing as</span>
        <select
          className="select"
          value={userId}
          onChange={(event) => onUserChange(event.target.value)}
        >
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      </label>
    </header>
  )
}
