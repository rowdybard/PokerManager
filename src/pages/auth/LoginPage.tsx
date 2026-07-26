import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuthStore } from '../../store/authStore'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import { env } from '../../lib/env'

export function LoginPage() {
  const navigate = useNavigate()
  const { signIn, signInWithMagicLink, loading } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const { error } = await signIn(email, password)
    if (error) {
      setError(error)
    } else {
      navigate('/')
    }
  }

  const handleMagicLink = async () => {
    setError(null)
    setNotice(null)
    if (!email.trim()) {
      setError('Enter your email first.')
      return
    }
    const result = await signInWithMagicLink(email.trim())
    if (result.error) setError(result.error)
    else setNotice('Check your email for a secure sign-in link.')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}
          {notice && (
            <div role="status" className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
              {notice}
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
          {env.emailEnabled ? (
            <>
              <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-muted">
                <span className="h-px flex-1 bg-border" />
                or
                <span className="h-px flex-1 bg-border" />
              </div>
              <Button
                type="button"
                variant="secondary"
                disabled={loading}
                className="w-full"
                onClick={handleMagicLink}
              >
                Email me a secure link
              </Button>
            </>
          ) : null}
        </form>
        <p className="mt-5 text-center text-sm text-muted">
          No account?{' '}
          <Link to="/signup" className="text-gold hover:underline font-semibold">
            Sign up
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
