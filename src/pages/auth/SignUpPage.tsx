import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuthStore } from '../../store/authStore'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card'

type SignUpField = 'email' | 'password'
type SignUpErrors = Partial<Record<SignUpField, string>>

export function SignUpPage() {
  const navigate = useNavigate()
  const { signUp, loading } = useAuthStore()
  const formRef = useRef<HTMLFormElement>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<SignUpErrors>({})

  const focusField = (name: SignUpField) => {
    const field = formRef.current?.elements.namedItem(name)
    if (field instanceof HTMLElement) field.focus()
  }

  const validate = () => {
    const next: SignUpErrors = {}
    const emailControl = formRef.current?.elements.namedItem('email')
    if (!email.trim()) next.email = 'Enter your email.'
    else if (emailControl instanceof HTMLInputElement && emailControl.validity.typeMismatch) {
      next.email = 'Enter a valid email address.'
    }
    if (!password) next.password = 'Enter a password.'
    else if (password.length < 6) next.password = 'Use at least 6 characters.'
    setFieldErrors(next)
    const first = (['email', 'password'] as const).find((field) => next[field])
    if (first) focusField(first)
    return !first
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setNotice(null)
    if (!validate()) return
    const result = await signUp(email.trim(), password)
    if (result.error === 'Check your email for a confirmation link to complete signup.') {
      setNotice(result.error)
    } else if (result.error) {
      setError(result.error)
      focusField('email')
    } else {
      setNotice('Account created. Opening Home.')
      navigate('/')
    }
  }

  const clearFieldError = (field: SignUpField) => {
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
        <CardTitle as="h1">Create account</CardTitle>
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
                    <a href="#signup-email" className="underline">
                      Email: {fieldErrors.email}
                    </a>
                  </li>
                ) : null}
                {fieldErrors.password ? (
                  <li>
                    <a href="#signup-password" className="underline">
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
              <p className="font-semibold">Account not created</p>
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
            <label htmlFor="signup-email" className="text-sm font-medium text-muted">
              Email
            </label>
            <Input
              id="signup-email"
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
              aria-describedby={fieldErrors.email ? 'signup-email-error' : undefined}
            />
            {fieldErrors.email ? (
              <p id="signup-email-error" className="text-sm text-danger">
                {fieldErrors.email}
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="signup-password" className="text-sm font-medium text-muted">
              Password
            </label>
            <Input
              id="signup-password"
              name="password"
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                clearFieldError('password')
              }}
              required
              minLength={6}
              autoComplete="new-password"
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={
                fieldErrors.password
                  ? 'signup-password-hint signup-password-error'
                  : 'signup-password-hint'
              }
            />
            <p id="signup-password-hint" className="text-xs text-muted">
              At least 6 characters.
            </p>
            {fieldErrors.password ? (
              <p id="signup-password-error" className="text-sm text-danger">
                {fieldErrors.password}
              </p>
            ) : null}
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Creating…' : 'Sign up'}
          </Button>
          <span className="sr-only" role="status" aria-live="polite">
            {loading ? 'Account creation in progress.' : ''}
          </span>
        </form>
        <p className="mt-5 text-center text-sm text-muted">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-gold underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
