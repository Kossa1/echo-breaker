import EmailPasswordAuth from '../auth/EmailPasswordAuth'

interface LoginPageProps {
  onSignedIn?: () => void
}

export default function LoginPage({ onSignedIn }: LoginPageProps) {
  return (
    <div className="container-narrow stack">
      <header className="page-header">
        <h1 className="page-title">Welcome back</h1>
        <p className="page-subtitle">Sign up or sign in with your email.</p>
      </header>

      <div className="stack">
        <EmailPasswordAuth onSignedIn={() => onSignedIn?.()} />
      </div>
    </div>
  )
}
