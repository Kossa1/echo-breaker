import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth'
import type { ConfirmationResult, User } from 'firebase/auth'
import { ensureUserDocument } from '../data/users'

// Test helpers (mirrors your existing JS config)
const TEST_PHONE_NUMBER = "+15555550100"
const TEST_VERIFICATION_CODE = "123456"

function useTestingRecaptcha() {
  const auth = useMemo(() => getAuth(), [])

  useEffect(() => {
    // Disable app verification in dev/testing
    // Note: do not enable in production
    auth.settings.appVerificationDisabledForTesting = true
  }, [auth])
}

interface PhoneAuthProps {
  onSignedIn?: (user: User) => void
  displayName?: string
}

export default function PhoneAuth({ onSignedIn, displayName }: PhoneAuthProps) {
  useTestingRecaptcha()
  const auth = useMemo(() => getAuth(), [])

  const [phoneNumber, setPhoneNumber] = useState<string>(TEST_PHONE_NUMBER)
  const [code, setCode] = useState<string>(TEST_VERIFICATION_CODE)
  const [status, setStatus] = useState<string>('Idle')
  const [error, setError] = useState<string>('')
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null)
  const [loading, setLoading] = useState<boolean>(false)

  const recaptchaContainerId = 'recaptcha-container'
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null)
  const hasName = Boolean(displayName?.trim())

  // Initialize reCAPTCHA once on mount
  useEffect(() => {
    if (recaptchaRef.current) return
    try {
      recaptchaRef.current = new RecaptchaVerifier(auth, recaptchaContainerId, {
        size: 'invisible',
        callback: () => {
          // Invoked when reCAPTCHA is solved automatically for invisible size
        }
      })
    } catch (e) {
      // If already initialized or container missing, ignore
    }

    return () => {
      recaptchaRef.current?.clear()
      recaptchaRef.current = null
    }
  }, [auth])

  const sendCode = useCallback(async () => {
    setError('')
    setStatus('Sending code…')
    setLoading(true)
    try {
      if (!displayName?.trim()) {
        throw new Error('Please enter a username before requesting the code.')
      }
      if (!recaptchaRef.current) throw new Error('reCAPTCHA not ready')
      const result = await signInWithPhoneNumber(auth, phoneNumber, recaptchaRef.current)
      setConfirmation(result)
      setStatus('Code sent. Check your SMS.')
    } catch (e: any) {
      setError(e?.message || String(e))
      setStatus('Failed to send code')
    } finally {
      setLoading(false)
    }
  }, [auth, phoneNumber, displayName])

  const verifyCode = useCallback(async () => {
    if (!confirmation) return
    setError('')
    setStatus('Verifying…')
    setLoading(true)
    try {
      const res = await confirmation.confirm(code)
      await ensureUserDocument(res.user, displayName)
      setStatus(`Signed in as ${res.user.phoneNumber || res.user.uid}`)
      onSignedIn?.(res.user)
    } catch (e: any) {
      setError(e?.message || String(e))
      setStatus('Verification failed')
    } finally {
      setLoading(false)
    }
  }, [confirmation, code, displayName, onSignedIn])

  return (
    <div>
      <label style={{ display: 'block', marginBottom: 8 }}>
        Phone Number
        <input
          type="text"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder={TEST_PHONE_NUMBER}
          className="input"
        />
      </label>

      <button onClick={sendCode} disabled={loading || !hasName} className="btn btn--primary">
        {loading ? 'Working…' : 'Send Code'}
      </button>

      <div style={{ height: 10 }} />

      <label style={{ display: 'block', marginBottom: 8 }}>
        Verification Code
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={TEST_VERIFICATION_CODE}
          className="input"
        />
      </label>

      <button onClick={verifyCode} disabled={!confirmation || loading} style={{ padding: '8px 12px' }}>
        Verify Code
      </button>

      <div id={recaptchaContainerId} />

      <div style={{ marginTop: 12, color: '#374151' }}>Status: {status}</div>
      {error && (
        <div style={{ marginTop: 8, color: '#b91c1c' }}>Error: {error}</div>
      )}
    </div>
  )
}
