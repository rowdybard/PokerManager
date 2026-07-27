import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuthStore } from '../../store/authStore'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import { env } from '../../lib/env'

type LoginField = 'email' | 'password'
type LoginErrors = Partial<Record<LoginField, string>>

export function LoginPage() {
  const navigate = useNavigate()
  const { signIn, signInWithMagicLink, loading } = useAuthStore()
  const formRef = useRef<HTMLFormElement>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<LoginErrors>({})

  const focusField = (name: LoginField) => {
    const field = formRef.current?.elements.namedItem(name)
    if (field instanceof HTMLElement) field.focus()
  }

  const validate = (fields: LoginField[]) => {
    const next: LoginErrors = {}
    const emailControl = formRef.current?.elements.namedItem('email')
    if (fields.includes('email')) {
      if (!email.trim()) next.email = 'Enter your email.'
      else if (emailControl instanceof HTMLInputElement && emailControl.validity.typeMismatch) {
        next.email = 'Enter a valid email address.'
      }
    }
    if (fields.includes('password') && !password) next.password = 'Enter your password.'
    setFieldErrors(next)
    const first = fields.find((field) => next[field])
    if (first) focusField(first)
    return !first
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setNotice(null)
    if (!validate(['email', 'password'])) return
    const result = await signIn(email.trim(), password)
    if (result.error) {
      setError(result.error)
      focusField('email')
    } else {
      setNotice('Signed in. Opening Home.')
      navigate('/')
    }
  }

  const handleMagicLink = async () => {
    setError(null)
    setNotice(null)
    if (!validate(['email'])) return
    const result = await signInWithMagicLink(email.trim())
    if (result.error) {
      setError(result.error)
      focusField('email')
    } else {
      setNotice('Check your email for a secure sign-in link.')
    }
  }

  const clearFieldError = (field: LoginField) => {
    if (fieldErrors[field]) {
      setFieldErrors((value) => {
        const next = { ...value }
        delete next[field]
        return next
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h1">Sign in</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="space-y-4"
          noValidate
          aria-busy={loading}
        >
          {Object.keys(fieldErrors).length ? (
            <div role="alert" className="border-l-4 border-danger bg-danger/10 px-3 py-2 text-sm text-danger">
              <p className="font-semibold">Check these fields</p>
              <ul className="mt-1 list-disc pl-5">
                {fieldErrors.email ? (
                  <li>
                    <a href="#login-email" className="underline">
                      Email: {fieldErrors.email}
                    </a>
                  </li>
                ) : null}
                {fieldErrors.password ? (
                  <li>
                    <a href="#login-password" className="underline">
                      Password: {fieldErrors.password}
                    </a>
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}
          {error ? (
            <div
              role="alert"
              tabIndex={-1}
              className="border-l-4 border-danger bg-danger/10 px-3 py-2 text-sm text-danger"
            >
              <p className="font-semibold">Sign-in failed</p>
              <p>{error}</p>
            </div>
          ) : null}
          {notice ? (
            <div
              role="status"
              className="border-l-4 border-success bg-success/10 px-3 py-2 text-sm text-success"
            >
              {notice}
            </div>
          ) : null}
          <div className="space-y-1.5">
            <label htmlFor="login-email" className="text-sm font-medium text-muted">
              Email
            </label>
            <Input
              id="login-email"
              name="email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                clearFieldError('email')
              }}
              required
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
            />
            {fieldErrors.email ? (
              <p id="login-email-error" className="text-sm text-danger">
                {fieldErrors.email}
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="login-password" className="text-sm font-medium text-muted">
              Password
            </label>
            <Input
              id="login-password"
              name="password"
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                clearFieldError('password')
              }}
              required
              autoComplete="current-password"
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
            />
            {fieldErrors.password ? (
              <p id="login-password-error" className="text-sm text-danger">
                {fieldErrors.password}
              </p>
            ) : null}
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Signing in…' : 'Sign in'}
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
                Email sign-in link
              </Button>
            </>
          ) : null}
          <span className="sr-only" role="status" aria-live="polite">
            {loading ? 'Sign-in request in progress.' : ''}
          </span>
        </form>
        <p className="mt-5 text-center text-sm text-muted">
          No account?{' '}
          <Link to="/signup" className="font-semibold text-gold underline-offset-4 hover:underline">
            Sign up
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
