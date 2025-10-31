import { Link, useLocation } from 'react-router-dom'
import { getAuth, signOut } from 'firebase/auth'
import type { User } from 'firebase/auth'

interface SideNavProps {
  user: User | null
}

export default function SideNav({ user }: SideNavProps) {
  const location = useLocation()
  const auth = getAuth()

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path)

  return (
    <aside className="side-nav" aria-label="Primary">
      <div className="side-nav-inner">
        <Link to="/guess" className={`side-link ${isActive('/guess') ? 'active' : ''}`}>Guess</Link>
        <Link to="/leaderboard" className={`side-link ${isActive('/leaderboard') ? 'active' : ''}`}>Leaderboard</Link>
        {user ? (
          <button className="side-link" onClick={() => signOut(auth)}>↩︎ Sign out</button>
        ) : (
          <Link to="/" className={`side-link ${isActive('/') ? 'active' : ''}`}>Login</Link>
        )}
      </div>
    </aside>
  )
}

