import React, { useState } from 'react'
import PhoneAuth from '../auth/PhoneAuth'
import EmailPasswordAuth from '../auth/EmailPasswordAuth'

interface LoginPageProps {
  onSignedIn?: () => void
}

export default function LoginPage({ onSignedIn }: LoginPageProps) {
  const [username, setUsername] = useState('')
  const [method, setMethod] = useState<'phone' | 'email'>('phone')

  return (
    <div style={{ maxWidth: 480, margin: '40px auto', padding: 16 }}>
      <h1 style={{ marginTop: 0 }}>Sign In</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button
          type="button"
          onClick={() => setMethod('phone')}
          style={{
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            backgroundColor: method === 'phone' ? '#2563eb' : '#f9fafb',
            color: method === 'phone' ? '#ffffff' : '#1f2937',
            cursor: 'pointer',
          }}
        >
          Phone Sign In
        </button>
        <button
          type="button"
          onClick={() => setMethod('email')}
          style={{
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            backgroundColor: method === 'email' ? '#2563eb' : '#f9fafb',
            color: method === 'email' ? '#ffffff' : '#1f2937',
            cursor: 'pointer',
          }}
        >
          Email & Password
        </button>
      </div>

      {method === 'phone' ? (
        <>
          <p style={{ color: '#4b5563', marginBottom: 16 }}>
            Enter your phone number to receive a verification code.
          </p>
          <label style={{ display: 'block', marginBottom: 16 }}>
            Choose a username
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="e.g. EchoMaster"
              style={{ width: '100%', padding: 8, marginTop: 4 }}
            />
          </label>
          <PhoneAuth displayName={username} onSignedIn={() => onSignedIn?.()} />
        </>
      ) : (
        <>
          <p style={{ color: '#4b5563', marginBottom: 16 }}>
            Use your email and password to sign in or create a new account.
          </p>
          <EmailPasswordAuth onSignedIn={() => onSignedIn?.()} />
        </>
      )}
    </div>
  )
}
