import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import type { User } from 'firebase/auth'
import LoginPage from './pages/LoginPage'
import LeaderboardPage from './pages/LeaderboardPage'
import GuessPage from './pages/GuessPage'
import ResultsPage from './pages/ResultsPage'
import CanvasBackground from './ui/CanvasBackground'
import SideNav from './ui/SideNav'

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
      <CanvasBackground />
      <header className="nav">
        <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Link to={user ? '/guess' : '/'} className="brand" style={{ textDecoration: 'none' }}>
            EchoBreaker
          </Link>
        </div>
      </header>

      <SideNav user={user} />

      <main className="container" style={{ paddingTop: 24, paddingBottom: 40 }}>
        <Routes>
          <Route
            path="/"
            element={
              user ? (
                <Navigate to="/guess" replace />
              ) : (
                <div className="glass-panel panel-pad">
                  <LoginPage onSignedIn={() => navigate('/guess', { replace: true })} />
                </div>
              )
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
                <Navigate to="/" replace />
              )
            }
          />
          <Route path="/guess" element={<div className="glass-panel panel-pad panel-solid"><GuessPage /></div>} />
          <Route path="/guess/results" element={<div className="glass-panel panel-pad panel-solid"><ResultsPage /></div>} />
          <Route path="*" element={<Navigate to={user ? '/guess' : '/'} replace />} />
        </Routes>
      </main>
    </div>
  )
}
