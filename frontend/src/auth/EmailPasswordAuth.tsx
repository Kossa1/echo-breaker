import React, { useMemo, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
} from 'firebase/auth'
import type { User } from 'firebase/auth'
import { ensureUserDocument } from '../data/users'

interface EmailPasswordAuthProps {
  onSignedIn?: (user: User) => void
}

export default function EmailPasswordAuth({ onSignedIn }: EmailPasswordAuthProps) {
  const auth = useMemo(() => getAuth(), [])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [status, setStatus] = useState('Idle')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleResult = async (user: User, message: string) => {
    await ensureUserDocument(user, displayName)
    setStatus(message)
    onSignedIn?.(user)
  }

  const signIn = async () => {
    setError('')
    setStatus('Signing in…')
    setLoading(true)
    try {
      const result = await signInWithEmailAndPassword(auth, email, password)
      await handleResult(result.user, `Signed in as ${result.user.email}`)
    } catch (err: any) {
      setError(err?.message || String(err))
      setStatus('Sign-in failed')
    } finally {
      setLoading(false)
    }
  }

  const createAccount = async () => {
    setError('')
    setStatus('Creating account…')
    setLoading(true)
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password)
      await handleResult(result.user, `Account created for ${result.user.email}`)
    } catch (err: any) {
      setError(err?.message || String(err))
      setStatus('Account creation failed')
    } finally {
      setLoading(false)
    }
  }

  const disabled = loading || !email || !password || !displayName.trim()

  return (
    <div>
      <label style={{ display: 'block', marginBottom: 12 }}>
        Email
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          style={{ width: '100%', padding: 8, marginTop: 4 }}
        />
      </label>

      <label style={{ display: 'block', marginBottom: 12 }}>
        Password
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
          style={{ width: '100%', padding: 8, marginTop: 4 }}
        />
      </label>

      <label style={{ display: 'block', marginBottom: 16 }}>
        Display name
        <input
          type="text"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="Eg. EchoMaster"
          style={{ width: '100%', padding: 8, marginTop: 4 }}
        />
      </label>

      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={signIn} disabled={disabled} style={{ padding: '8px 12px' }}>
          {loading ? 'Working…' : 'Sign In'}
        </button>
        <button onClick={createAccount} disabled={disabled} style={{ padding: '8px 12px' }}>
          {loading ? 'Working…' : 'Create Account'}
        </button>
      </div>

      <div style={{ marginTop: 12, color: '#374151' }}>Status: {status}</div>
      {error && <div style={{ marginTop: 8, color: '#b91c1c' }}>Error: {error}</div>}
    </div>
  )
}

