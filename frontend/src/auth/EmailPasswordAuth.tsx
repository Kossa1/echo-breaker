import { useMemo, useState } from 'react'
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
          className="input"
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
          className="input"
        />
      </label>

      <label style={{ display: 'block', marginBottom: 16 }}>
        Display name
        <input
          type="text"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="Eg. EchoMaster"
          className="input"
        />
      </label>

      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={signIn} disabled={disabled} className="btn btn--primary">
          {loading ? 'Working…' : 'Sign In'}
        </button>
        <button onClick={createAccount} disabled={disabled} className="btn btn--primary">
          {loading ? 'Working…' : 'Create Account'}
        </button>
      </div>

      <div className="muted" style={{ marginTop: 12 }}>Status: {status}</div>
      {error && <div style={{ marginTop: 8, color: 'var(--red-500)' }}>Error: {error}</div>}
    </div>
  )
}
