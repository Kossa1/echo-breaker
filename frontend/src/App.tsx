import React, { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth'
import type { User } from 'firebase/auth'
import LoginPage from './pages/LoginPage'
import LeaderboardPage from './pages/LeaderboardPage'

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [initializing, setInitializing] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()
  const auth = useMemo(() => getAuth(), [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (next) => {
      setUser(next)
      setInitializing(false)
    })

    return () => unsubscribe()
  }, [auth])

  const handleSignOut = async () => {
    await signOut(auth)
    navigate('/', { replace: true })
  }

  if (initializing) {
    return <div style={{ padding: 32 }}>Loading…</div>
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        backgroundColor: '#f9fafb',
      }}
    >
      <header
        style={{
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#ffffff',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Link to={user ? '/leaderboard' : '/'} style={{ textDecoration: 'none', color: '#111827', fontWeight: 600 }}>
          Echo Breaker
        </Link>

        <nav style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Link
            to="/leaderboard"
            style={{
              color: location.pathname === '/leaderboard' ? '#2563eb' : '#4b5563',
              pointerEvents: user ? 'auto' : 'none',
              opacity: user ? 1 : 0.4,
            }}
          >
            Leaderboard
          </Link>
          {user ? (
            <button onClick={handleSignOut} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
              Sign out
            </button>
          ) : (
            <Link
              to="/"
              style={{
                color: location.pathname === '/' ? '#2563eb' : '#4b5563',
              }}
            >
              Login
            </Link>
          )}
        </nav>
      </header>

      <main>
        <Routes>
          <Route
            path="/"
            element={
              user ? (
                <Navigate to="/leaderboard" replace />
              ) : (
                <LoginPage onSignedIn={() => navigate('/leaderboard', { replace: true })} />
              )
            }
          />
          <Route
            path="/leaderboard"
            element={
              user ? <LeaderboardPage currentUser={user} /> : <Navigate to="/" replace />
            }
          />
          <Route path="*" element={<Navigate to={user ? '/leaderboard' : '/'} replace />} />
        </Routes>
      </main>
    </div>
  )
}
