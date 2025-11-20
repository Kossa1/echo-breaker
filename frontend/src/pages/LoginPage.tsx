import EmailPasswordAuth from '../auth/EmailPasswordAuth'

interface LoginPageProps {
  onSignedIn?: () => void
}

export default function LoginPage({ onSignedIn }: LoginPageProps) {
  return (
    <div className="container-narrow stack">
      <header className="page-header">
        <h1 className="page-title">Welcome to EchoBreaker</h1>
        <p className="page-subtitle">Tell us whether you&apos;re signing in or creating a new account to continue.</p>
      </header>

      <div className="stack">
        <EmailPasswordAuth onSignedIn={() => onSignedIn?.()} />
      </div>
    </div>
  )
}
