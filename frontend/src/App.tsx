import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth'
import type { User } from 'firebase/auth'
import LoginPage from './pages/LoginPage'
import LeaderboardPage from './pages/LeaderboardPage'
import GuessPage from './pages/GuessPage'
import ResultsPage from './pages/ResultsPage'

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [initializing, setInitializing] = useState(true)
  const navigate = useNavigate()
  const auth = useMemo(() => getAuth(), [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (next) => {
      setUser(next)
      setInitializing(false)
    })

    return () => unsubscribe()
  }, [auth])

  if (initializing) {
    return <div style={{ padding: 32 }}>Loading…</div>
  }

  return (
    <div className="app-shell">
      <header className="nav">
        <div
          className="container"
          style={{
            width: '100%',
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center'
          }}
        >
          <Link
            to="/"
            className="brand"
            style={{ textDecoration: 'none', gridColumn: 2, justifySelf: 'center', fontWeight: 700, letterSpacing: '-0.02em' }}
          >
            EchoBreaker
          </Link>
          <div style={{ gridColumn: 3, justifySelf: 'end', display: 'flex', alignItems: 'center', gap: 12 }}>
            {user ? (
              <>
                <div title={user.displayName || user.email || 'Player'} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #3b82f6, #ef4444)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 12
                  }}>
                    {(user.displayName || user.email || 'P').slice(0,1).toUpperCase()}
                  </div>
                  <span style={{ fontWeight: 600, color: '#111', fontSize: 14 }}>
                    {user.displayName || user.email}
                  </span>
                </div>
                <button onClick={() => signOut(auth)} className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 14, width: 'auto', whiteSpace: 'nowrap' }}>Sign out</button>
              </>
            ) : (
              <Link to="/login" className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 14, width: 'auto', whiteSpace: 'nowrap' }}>Sign in</Link>
            )}
          </div>
        </div>
      </header>

      <main className="container" style={{ paddingTop: 24, paddingBottom: 40 }}>
        <Routes>
          <Route path="/" element={<div className="glass-panel panel-pad panel-solid"><GuessPage /></div>} />
          <Route
            path="/login"
            element={
              <div className="glass-panel panel-pad">
                <LoginPage onSignedIn={() => navigate('/guess', { replace: true })} />
              </div>
            }
          />
          <Route
            path="/leaderboard"
            element={
              user ? (
                <div className="glass-panel panel-pad">
                  <LeaderboardPage currentUser={user} />
                </div>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route path="/guess" element={<div className="glass-panel panel-pad panel-solid"><GuessPage /></div>} />
          <Route path="/guess/results" element={<div className="glass-panel panel-pad panel-solid"><ResultsPage /></div>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}
