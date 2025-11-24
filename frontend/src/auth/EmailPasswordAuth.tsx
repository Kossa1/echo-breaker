import { useMemo, useState, useEffect } from 'react'
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
} from 'firebase/auth'
import type { User } from 'firebase/auth'
import { ensureUserDocument } from '../data/users'
const API_URL = import.meta.env.VITE_API_URL;


interface EmailPasswordAuthProps {
  onSignedIn?: (user: User) => void
}

interface SurveyResponses {
  partyIdentification?: string
  ideologicalOrientation?: string
  politicalNewsFollow?: string
  feelingDemocrats?: number
  feelingRepublicans?: number
  tryUnderstandOtherParty?: string
  perceivedDifference?: string
  ageRange?: string
  educationLevel?: string
}

type AuthMode = 'choice' | 'signin' | 'signup'

export default function EmailPasswordAuth({ onSignedIn }: EmailPasswordAuthProps) {
  const auth = useMemo(() => getAuth(), [])
  const [mode, setMode] = useState<AuthMode>('choice')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [status, setStatus] = useState('Idle')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Survey state
  const [surveyResponses, setSurveyResponses] = useState<SurveyResponses>({
    feelingDemocrats: 50,
    feelingRepublicans: 50,
  })
  const [showSurveyValidation, setShowSurveyValidation] = useState(false)

  // Check if survey is complete
  const isSurveyComplete = useMemo(() => {
    return (
      surveyResponses.partyIdentification !== undefined &&
      surveyResponses.partyIdentification !== '' &&
      surveyResponses.ideologicalOrientation !== undefined &&
      surveyResponses.ideologicalOrientation !== '' &&
      surveyResponses.politicalNewsFollow !== undefined &&
      surveyResponses.politicalNewsFollow !== '' &&
      surveyResponses.feelingDemocrats !== undefined &&
      surveyResponses.feelingDemocrats !== null &&
      surveyResponses.feelingRepublicans !== undefined &&
      surveyResponses.feelingRepublicans !== null &&
      surveyResponses.tryUnderstandOtherParty !== undefined &&
      surveyResponses.tryUnderstandOtherParty !== '' &&
      surveyResponses.perceivedDifference !== undefined &&
      surveyResponses.perceivedDifference !== '' &&
      surveyResponses.ageRange !== undefined &&
      surveyResponses.ageRange !== '' &&
      surveyResponses.educationLevel !== undefined &&
      surveyResponses.educationLevel !== ''
    )
  }, [surveyResponses])

  const handleResult = async (user: User, message: string, nameOverride?: string) => {
    await ensureUserDocument(user, nameOverride)
    setStatus(message)
    onSignedIn?.(user)
  }

  const switchMode = (next: AuthMode) => {
    setMode(next)
    setError('')
    setStatus('Idle')
    if (next !== 'signup') {
      setShowSurveyValidation(false)
    }
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
    if (!displayName.trim()) {
      setError('Please choose an account name')
      setStatus('Account name required')
      return
    }

    // Validate survey completion
    if (!isSurveyComplete) {
      setShowSurveyValidation(true)
      setError('')
      setStatus('Please complete all survey questions')
      return
    }

    setError('')
    setStatus('Creating account…')
    setLoading(true)
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password)
      
      // Save survey responses (now mandatory)
      setStatus('Saving responses…')
      try {
        await fetch(`${API_URL}/api/users/survey`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: result.user.uid,
            email: email,
            surveyResponses,
          }),
        }).catch(() => {
          // Log error but don't block account creation
          console.error('Failed to save survey responses')
        })
      } catch (err) {
        console.error('Failed to save survey responses:', err)
      }

      await handleResult(
        result.user,
        `Your responses have been saved — welcome to EchoBreaker!`,
        displayName
      )
    } catch (err: any) {
      setError(err?.message || String(err))
      setStatus('Account creation failed')
    } finally {
      setLoading(false)
    }
  }

  const updateSurveyResponse = (key: keyof SurveyResponses, value: string | number) => {
    setSurveyResponses((prev) => ({ ...prev, [key]: value }))
    // Hide validation message when user starts filling out survey
    if (showSurveyValidation) {
      setShowSurveyValidation(false)
    }
  }

  // Hide validation message when survey becomes complete
  useEffect(() => {
    if (isSurveyComplete && showSurveyValidation) {
      setShowSurveyValidation(false)
    }
  }, [isSurveyComplete, showSurveyValidation])

  const renderChoice = () => (
    <div
      style={{
        display: 'grid',
        gap: 16,
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        marginTop: 8,
      }}
    >
      <button
        onClick={() => switchMode('signin')}
        className="btn btn--primary"
        style={{ justifyContent: 'flex-start', gap: 12, padding: '16px 18px' }}
      >
        <span style={{ fontWeight: 700 }}>I already have an account</span>
        <span style={{ fontSize: 13, opacity: 0.8 }}>Sign in with email + password</span>
      </button>
      <button
        onClick={() => switchMode('signup')}
        className="btn btn--primary"
        style={{ justifyContent: 'flex-start', gap: 12, padding: '16px 18px', background: '#0ea5e9' }}
      >
        <span style={{ fontWeight: 700 }}>Create a new account</span>
        <span style={{ fontSize: 13, opacity: 0.8 }}>Choose a name then take the short survey</span>
      </button>
    </div>
  )

  const renderSignIn = () => (
    <div className="stack" style={{ gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 18 }}>Sign in</h3>
        <button onClick={() => switchMode('choice')} className="btn btn-ghost" style={{ padding: '6px 10px' }}>
          Back
        </button>
      </div>
      <label style={{ display: 'block' }}>
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

      <label style={{ display: 'block' }}>
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
      <button
        onClick={signIn}
        disabled={loading || !email || !password}
        className="btn btn--primary"
      >
        {loading ? 'Working…' : 'Sign In'}
      </button>
      <div className="muted" style={{ fontSize: 13 }}>
        Need an account?{' '}
        <button onClick={() => switchMode('signup')} className="btn-link">
          Create one instead
        </button>
      </div>
    </div>
  )

  const renderSignUp = () => (
    <div className="stack">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 18 }}>Create your account</h3>
        <button onClick={() => switchMode('choice')} className="btn btn-ghost" style={{ padding: '6px 10px' }}>
          Back
        </button>
      </div>

      <label style={{ display: 'block', marginBottom: 12 }}>
        Account name
        <input
          type="text"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="Eg. EchoMaster"
          className="input"
        />
      </label>

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

      <label style={{ display: 'block', marginBottom: 16 }}>
        Password
        <input
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
          className="input"
        />
      </label>

      <button
        onClick={createAccount}
        disabled={loading || !email || !password || !displayName.trim() || !isSurveyComplete}
        className="btn btn--primary"
        style={{
          opacity: !isSurveyComplete ? 0.6 : 1,
          cursor: !isSurveyComplete ? 'not-allowed' : 'pointer',
          alignSelf: 'flex-start',
        }}
        title={!isSurveyComplete ? 'Complete all questions to continue' : ''}
      >
        {loading ? 'Working…' : 'Create Account'}
      </button>
      {!isSurveyComplete && (
        <p
          style={{
            fontSize: '0.75rem',
            color: '#6b7280',
            marginTop: '4px',
            fontStyle: 'italic',
          }}
        >
          Complete all questions to continue
        </p>
      )}

      {/* Survey Section - Only visible for signup */}
      <div
        style={{
          marginTop: '32px',
          paddingTop: '24px',
          borderTop: '1px solid #e5e7eb',
        }}
      >
        {/* Validation message */}
        {showSurveyValidation && (
          <div
            style={{
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              color: '#92400e',
              padding: '12px 16px',
              borderRadius: '6px',
              marginBottom: '24px',
              fontSize: '0.875rem',
              lineHeight: 1.6,
            }}
          >
            Please answer all questions before creating your account — these responses help us
            understand how people think about politics. It only takes a few seconds.
          </div>
        )}

        <div
          style={{
            padding: '24px',
            backgroundColor: '#f9fafb',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            border: '1px solid #e5e7eb',
          }}
        >
        <style>{`
          .survey-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: #3b82f6;
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            transition: all 0.2s ease;
          }
          
          .survey-slider::-webkit-slider-thumb:hover {
            background: #2563eb;
            transform: scale(1.1);
          }
          
          .survey-slider::-moz-range-thumb {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: #3b82f6;
            cursor: pointer;
            border: none;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            transition: all 0.2s ease;
          }
          
          .survey-slider::-moz-range-thumb:hover {
            background: #2563eb;
            transform: scale(1.1);
          }
          
          @media (max-width: 640px) {
            .survey-slider-container {
              flex-direction: column;
              gap: 8px;
            }
            
            .survey-slider-container > span {
              font-size: 0.6875rem;
            }
          }
        `}</style>
          <p
            style={{
              fontSize: '0.875rem',
              lineHeight: 1.6,
              color: '#4a4a4a',
              marginBottom: '24px',
            }}
          >
            Before you start, we&apos;d like to ask a few quick questions to help us understand how
            people think about politics. This takes under a minute — your responses stay anonymous.
          </p>

          {/* Political Identity & Ideology */}
          <div style={{ marginBottom: '32px' }}>
            <h3
              style={{
                fontFamily: "'Georgia', 'Times New Roman', serif",
                fontSize: '1.125rem',
                fontWeight: 400,
                color: '#1a1a1a',
                marginBottom: '16px',
              }}
            >
              Political Identity
            </h3>

            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#4a4a4a',
                  marginBottom: '8px',
                }}
              >
                Party Identification
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  'Strong Democrat',
                  'Lean Democrat',
                  'Independent',
                  'Lean Republican',
                  'Strong Republican',
                ].map((option) => (
                  <label
                    key={option}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                    }}
                  >
                    <input
                      type="radio"
                      name="partyIdentification"
                      value={option}
                      checked={surveyResponses.partyIdentification === option}
                      onChange={(e) => updateSurveyResponse('partyIdentification', e.target.value)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#4a4a4a',
                  marginBottom: '8px',
                }}
              >
                Ideological Orientation
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  'Very liberal',
                  'Somewhat liberal',
                  'Moderate',
                  'Somewhat conservative',
                  'Very conservative',
                ].map((option) => (
                  <label
                    key={option}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                    }}
                  >
                    <input
                      type="radio"
                      name="ideologicalOrientation"
                      value={option}
                      checked={surveyResponses.ideologicalOrientation === option}
                      onChange={(e) =>
                        updateSurveyResponse('ideologicalOrientation', e.target.value)
                      }
                      style={{ cursor: 'pointer' }}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div
            style={{
              borderTop: '1px solid #e5e7eb',
              marginTop: '24px',
              marginBottom: '24px',
            }}
          />

          {/* Political Engagement */}
          <div style={{ marginBottom: '32px' }}>
            <h3
              style={{
                fontFamily: "'Georgia', 'Times New Roman', serif",
                fontSize: '1.125rem',
                fontWeight: 400,
                color: '#1a1a1a',
                marginBottom: '16px',
              }}
            >
              Political Engagement
            </h3>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#4a4a4a',
                  marginBottom: '8px',
                }}
              >
                How closely do you follow news about politics?
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  'Not at all',
                  'A little',
                  'Somewhat',
                  'Quite a bit',
                  'A great deal',
                ].map((option) => (
                  <label
                    key={option}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                    }}
                  >
                    <input
                      type="radio"
                      name="politicalNewsFollow"
                      value={option}
                      checked={surveyResponses.politicalNewsFollow === option}
                      onChange={(e) => updateSurveyResponse('politicalNewsFollow', e.target.value)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div
            style={{
              borderTop: '1px solid #e5e7eb',
              marginTop: '24px',
              marginBottom: '24px',
            }}
          />

          {/* Feeling Thermometer */}
          <div style={{ marginBottom: '32px' }}>
            <h3
              style={{
                fontFamily: "'Georgia', 'Times New Roman', serif",
                fontSize: '1.125rem',
                fontWeight: 400,
                color: '#1a1a1a',
                marginBottom: '16px',
              }}
            >
              Feelings Toward Parties
            </h3>

            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#4a4a4a',
                  marginBottom: '12px',
                }}
              >
                How warm or cold do you feel toward Democrats?
              </label>
              <div className="survey-slider-container" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', color: '#6b7280', minWidth: '70px' }}>
                  Very Cold
                </span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={surveyResponses.feelingDemocrats || 50}
                  onChange={(e) =>
                    updateSurveyResponse('feelingDemocrats', parseInt(e.target.value))
                  }
                  style={{
                    flex: 1,
                    height: '6px',
                    borderRadius: '3px',
                    background: '#e5e7eb',
                    outline: 'none',
                    cursor: 'pointer',
                    WebkitAppearance: 'none',
                    appearance: 'none',
                  }}
                  className="survey-slider"
                />
                <span style={{ fontSize: '0.75rem', color: '#6b7280', minWidth: '70px' }}>
                  Very Warm
                </span>
                <span
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: '#1a1a1a',
                    minWidth: '40px',
                    textAlign: 'right',
                  }}
                >
                  {surveyResponses.feelingDemocrats || 50}
                </span>
              </div>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#4a4a4a',
                  marginBottom: '12px',
                }}
              >
                How warm or cold do you feel toward Republicans?
              </label>
              <div className="survey-slider-container" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', color: '#6b7280', minWidth: '70px' }}>
                  Very Cold
                </span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={surveyResponses.feelingRepublicans || 50}
                  onChange={(e) =>
                    updateSurveyResponse('feelingRepublicans', parseInt(e.target.value))
                  }
                  style={{
                    flex: 1,
                    height: '6px',
                    borderRadius: '3px',
                    background: '#e5e7eb',
                    outline: 'none',
                    cursor: 'pointer',
                    WebkitAppearance: 'none',
                    appearance: 'none',
                  }}
                  className="survey-slider"
                />
                <span style={{ fontSize: '0.75rem', color: '#6b7280', minWidth: '70px' }}>
                  Very Warm
                </span>
                <span
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: '#1a1a1a',
                    minWidth: '40px',
                    textAlign: 'right',
                  }}
                >
                  {surveyResponses.feelingRepublicans || 50}
                </span>
              </div>
            </div>
          </div>

          <div
            style={{
              borderTop: '1px solid #e5e7eb',
              marginTop: '24px',
              marginBottom: '24px',
            }}
          />

          {/* Empathy & Perceived Difference */}
          <div style={{ marginBottom: '32px' }}>
            <h3
              style={{
                fontFamily: "'Georgia', 'Times New Roman', serif",
                fontSize: '1.125rem',
                fontWeight: 400,
                color: '#1a1a1a',
                marginBottom: '16px',
              }}
            >
              Empathy & Perceived Difference
            </h3>

            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#4a4a4a',
                  marginBottom: '8px',
                }}
              >
                How often do you try to understand why people from the other party think the way they
                do?
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {['Never', 'Rarely', 'Sometimes', 'Often', 'Always'].map((option) => (
                  <label
                    key={option}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                    }}
                  >
                    <input
                      type="radio"
                      name="tryUnderstandOtherParty"
                      value={option}
                      checked={surveyResponses.tryUnderstandOtherParty === option}
                      onChange={(e) =>
                        updateSurveyResponse('tryUnderstandOtherParty', e.target.value)
                      }
                      style={{ cursor: 'pointer' }}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#4a4a4a',
                  marginBottom: '8px',
                }}
              >
                How different do you think ordinary Democrats and Republicans are in their basic
                values?
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  'Not different at all',
                  'Slightly different',
                  'Moderately different',
                  'Very different',
                  'Completely different',
                ].map((option) => (
                  <label
                    key={option}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                    }}
                  >
                    <input
                      type="radio"
                      name="perceivedDifference"
                      value={option}
                      checked={surveyResponses.perceivedDifference === option}
                      onChange={(e) => updateSurveyResponse('perceivedDifference', e.target.value)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div
            style={{
              borderTop: '1px solid #e5e7eb',
              marginTop: '24px',
              marginBottom: '24px',
            }}
          />

          {/* Demographics */}
          <div>
            <h3
              style={{
                fontFamily: "'Georgia', 'Times New Roman', serif",
                fontSize: '1.125rem',
                fontWeight: 400,
                color: '#1a1a1a',
                marginBottom: '16px',
              }}
            >
              Demographics
            </h3>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '20px',
              }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: '#4a4a4a',
                    marginBottom: '8px',
                  }}
                >
                  Age range
                </label>
                <select
                  value={surveyResponses.ageRange || ''}
                  onChange={(e) => updateSurveyResponse('ageRange', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '0.875rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    backgroundColor: '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  <option value="">Select age range</option>
                  <option value="<24">&lt;24</option>
                  <option value="24-40">24–40</option>
                  <option value="40-60">40–60</option>
                  <option value="60+">60+</option>
                </select>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: '#4a4a4a',
                    marginBottom: '8px',
                  }}
                >
                  Education level
                </label>
                <select
                  value={surveyResponses.educationLevel || ''}
                  onChange={(e) => updateSurveyResponse('educationLevel', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '0.875rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    backgroundColor: '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  <option value="">Select education</option>
                  <option value="Below college">Below college</option>
                  <option value="College degree">College degree</option>
                  <option value="Post-grad degree">Post-grad degree</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Second Create Account button at bottom */}
      <div style={{ marginTop: '32px', marginBottom: '16px' }}>
        <p className="text-sm text-gray-500 mt-6 mb-2 text-center">
          You can also create your account here after finishing the survey.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '16px', marginBottom: '16px' }}>
          <button
            onClick={createAccount}
            disabled={loading || !email || !password || !displayName.trim() || !isSurveyComplete}
            className="btn btn--primary"
            style={{
              opacity: !isSurveyComplete ? 0.6 : 1,
              cursor: !isSurveyComplete ? 'not-allowed' : 'pointer',
              width: '100%',
              maxWidth: '200px',
            }}
            title={!isSurveyComplete ? 'Complete all questions to continue' : ''}
          >
            {loading ? 'Working…' : 'Create Account'}
          </button>
        </div>
      </div>

      <div className="muted" style={{ marginTop: 12 }}>Status: {status}</div>
      {error && <div style={{ marginTop: 8, color: 'var(--red-500)' }}>Error: {error}</div>}
    </div>
  )

  return (
    <div>
      {mode === 'choice' && renderChoice()}
      {mode === 'signin' && renderSignIn()}
      {mode === 'signup' && renderSignUp()}
      {mode !== 'signup' && (
        <>
          <div className="muted" style={{ marginTop: 12 }}>Status: {status}</div>
          {error && <div style={{ marginTop: 8, color: 'var(--red-500)' }}>Error: {error}</div>}
        </>
      )}
    </div>
  )
}
