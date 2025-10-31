import { useEffect, useMemo, useState } from 'react'
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore'
import type { User } from 'firebase/auth'
import { db } from '../firebase'

interface LeaderboardEntry {
  id: string
  displayName?: string
  score?: number
}

interface LeaderboardPageProps {
  currentUser: User
}

export default function LeaderboardPage({ currentUser }: LeaderboardPageProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const leaderboardQuery = query(
      collection(db, 'users'),
      orderBy('score', 'desc'),
      limit(50)
    )

    const unsubscribe = onSnapshot(
      leaderboardQuery,
      (snapshot) => {
        const next = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...((({ id, ...rest }) => rest)(doc.data() as LeaderboardEntry)),
        }))
        setEntries(next)
        setLoading(false)
      },
      () => {
        setEntries([])
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  const highlightId = useMemo(() => currentUser.uid, [currentUser.uid])

  return (
    <div className="container-narrow" style={{ maxWidth: 900 }}>
      <header className="page-header">
        <h1 className="page-title">Leaderboard</h1>
        <p className="page-subtitle">Scores update automatically as players progress through the game.</p>
      </header>

      {loading ? (
        <div className="muted" style={{ padding: 16 }}>Loading leaderboard…</div>
      ) : entries.length === 0 ? (
        <div className="muted" style={{ padding: 16 }}>No players yet. Be the first to score!</div>
      ) : (
        <table className="modern" style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => {
              const isCurrentUser = entry.id === highlightId
              const score = entry.score ?? 0
              const label = entry.displayName || 'Unknown player'

              return (
                <tr
                  key={entry.id}
                  style={{ background: isCurrentUser ? 'linear-gradient(90deg, rgba(29,78,216,0.15), rgba(220,38,38,0.12))' : 'transparent' }}
                >
                  <td>{index + 1}</td>
                  <td>{label}</td>
                  <td>{score}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
