import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LoginPage } from './LoginPage'
import { SignUpPage } from './SignUpPage'

const { signIn, signInWithMagicLink, signUp } = vi.hoisted(() => ({
  signIn: vi.fn(),
  signInWithMagicLink: vi.fn(),
  signUp: vi.fn(),
}))

vi.mock('../../store/authStore', () => ({
  useAuthStore: () => ({
    signIn,
    signInWithMagicLink,
    signUp,
    loading: false,
  }),
}))

vi.mock('../../lib/env', () => ({
  env: { emailEnabled: true },
}))

function renderRoute(page: 'login' | 'signup') {
  return render(
    <MemoryRouter initialEntries={[`/${page}`]}>
      {page === 'login' ? <LoginPage /> : <SignUpPage />}
    </MemoryRouter>,
  )
}

describe('authentication forms', () => {
  beforeEach(() => {
    signIn.mockReset()
    signInWithMagicLink.mockReset()
    signUp.mockReset()
  })

  it('associates login labels and focuses the first invalid field', async () => {
    const user = userEvent.setup()
    renderRoute('login')

    const email = screen.getByLabelText('Email')
    expect(email).toHaveAttribute('autocomplete', 'username')
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'current-password')

    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(email).toHaveFocus()
    expect(screen.getByText('Enter your email.')).toBeVisible()
    expect(screen.getByText('Enter your password.')).toBeVisible()
    expect(signIn).not.toHaveBeenCalled()
  })

  it('announces a sign-in failure and returns focus to email', async () => {
    signIn.mockResolvedValue({ error: 'Invalid credentials' })
    const user = userEvent.setup()
    renderRoute('login')

    await user.type(screen.getByLabelText('Email'), 'member@example.com')
    await user.type(screen.getByLabelText('Password'), 'secret')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials')
    expect(screen.getByLabelText('Email')).toHaveFocus()
  })

  it('associates sign-up guidance and validates password length', async () => {
    const user = userEvent.setup()
    renderRoute('signup')

    const password = screen.getByLabelText('Password')
    expect(password).toHaveAttribute('autocomplete', 'new-password')
    expect(password).toHaveAccessibleDescription('At least 6 characters.')

    await user.type(screen.getByLabelText('Email'), 'member@example.com')
    await user.type(password, 'short')
    await user.click(screen.getByRole('button', { name: 'Sign up' }))

    expect(password).toHaveFocus()
    expect(screen.getByText('Use at least 6 characters.')).toBeVisible()
    expect(signUp).not.toHaveBeenCalled()
  })

  it('announces email confirmation as a successful sign-up step', async () => {
    signUp.mockResolvedValue({
      error: 'Check your email for a confirmation link to complete signup.',
    })
    const user = userEvent.setup()
    renderRoute('signup')

    await user.type(screen.getByLabelText('Email'), 'member@example.com')
    await user.type(screen.getByLabelText('Password'), 'secret')
    await user.click(screen.getByRole('button', { name: 'Sign up' }))

    expect(
      await screen.findByText('Check your email for a confirmation link to complete signup.'),
    ).toHaveAttribute('role', 'status')
    expect(screen.queryByText('Account not created')).not.toBeInTheDocument()
  })
})
