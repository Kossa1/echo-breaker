import React, { useEffect, useMemo, useState } from 'react'
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
    <div style={{ maxWidth: 720, margin: '40px auto', padding: 16 }}>
      <h1 style={{ marginTop: 0 }}>Leaderboard</h1>
      <p style={{ color: '#4b5563' }}>
        Scores update automatically as players progress through the game.
      </p>

      {loading ? (
        <div>Loading leaderboard…</div>
      ) : entries.length === 0 ? (
        <div>No players yet. Be the first to score!</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: '8px 4px' }}>Rank</th>
              <th style={{ padding: '8px 4px' }}>Player</th>
              <th style={{ padding: '8px 4px' }}>Score</th>
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
                  style={{
                    backgroundColor: isCurrentUser ? '#ecfeff' : 'transparent',
                    borderBottom: '1px solid #f3f4f6',
                  }}
                >
                  <td style={{ padding: '8px 4px' }}>{index + 1}</td>
                  <td style={{ padding: '8px 4px' }}>{label}</td>
                  <td style={{ padding: '8px 4px' }}>{score}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

