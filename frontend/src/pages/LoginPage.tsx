import { useState } from 'react'
import PhoneAuth from '../auth/PhoneAuth'
import EmailPasswordAuth from '../auth/EmailPasswordAuth'

interface LoginPageProps {
  onSignedIn?: () => void
}

export default function LoginPage({ onSignedIn }: LoginPageProps) {
  const [username, setUsername] = useState('')
  const [method, setMethod] = useState<'phone' | 'email'>('phone')

  return (
    <div className="container-narrow stack">
      <header className="page-header">
        <h1 className="page-title">Welcome back</h1>
        <p className="page-subtitle">Sign in to continue your journey.</p>
      </header>

      <div className="segmented" role="tablist" aria-label="Auth method">
        <button
          type="button"
          role="tab"
          aria-selected={method === 'phone'}
          className={method === 'phone' ? 'active' : ''}
          onClick={() => setMethod('phone')}
        >
          Phone
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={method === 'email'}
          className={method === 'email' ? 'active' : ''}
          onClick={() => setMethod('email')}
        >
          Email
        </button>
      </div>

      {method === 'phone' ? (
        <div className="stack">
          <p className="muted">Enter your phone number to receive a verification code.</p>
          <label>
            Choose a username
            <input
              type="text"
              className="input"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="e.g. EchoMaster"
            />
          </label>
          <PhoneAuth displayName={username} onSignedIn={() => onSignedIn?.()} />
        </div>
      ) : (
        <div className="stack">
          <p className="muted">Use your email and password to sign in or create a new account.</p>
          <EmailPasswordAuth onSignedIn={() => onSignedIn?.()} />
        </div>
      )}
    </div>
  )
}
