import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GuestInvitePage } from './GuestInvitePage'

const { invoke } = vi.hoisted(() => ({
  invoke: vi.fn(),
}))

vi.mock('../../lib/supabase', () => ({
  supabase: {
    functions: { invoke },
  },
}))

const token = 'a'.repeat(43)
const invitation = {
  invitation: {
    status: 'pending',
    guestCount: 0,
    expiresAt: '2027-01-01T00:00:00Z',
  },
  event: {
    title: 'Friday Night Hold’em',
    kind: 'tournament',
    phase: 'inviting',
    scheduledAt: '2026-08-08T00:00:00Z',
    timezone: 'America/New_York',
    locationName: 'The Card Room',
    stakesLabel: '$100 + $10',
    currency: 'USD',
    buyInMinor: '10000',
    entryFeeMinor: '10000',
    rakeMinor: '1000',
    bountyMinor: '0',
    smallBlindMinor: null,
    bigBlindMinor: null,
    minBuyInMinor: null,
    maxBuyInMinor: null,
    tableSize: 9,
    numTables: 1,
    capacity: 10,
    confirmedCount: 6,
  },
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/i/${token}`]}>
        <Routes>
          <Route path="/i/:token" element={<GuestInvitePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('guest invitation', () => {
  beforeEach(() => {
    invoke.mockReset()
    invoke.mockResolvedValue({ data: invitation, error: null })
  })

  it('shows only the invitation summary and large RSVP controls', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Friday Night Hold’em' })).toBeVisible()
    expect(screen.getByText('The Card Room')).toBeVisible()
    expect(screen.getByRole('button', { name: /Yes/ })).toBeVisible()
    expect(screen.getByRole('button', { name: /Maybe/ })).toBeVisible()
    expect(screen.getByRole('button', { name: /No/ })).toBeVisible()
    expect(screen.getByText(/No account required/)).toBeVisible()
  })

  it('sends a token-scoped idempotent RSVP', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('heading', { name: 'Friday Night Hold’em' })

    await user.click(screen.getByRole('button', { name: /Yes/ }))

    expect(invoke).toHaveBeenLastCalledWith(
      'guest-invite',
      expect.objectContaining({
        body: expect.objectContaining({
          token,
          action: 'rsvp',
          status: 'yes',
          guestCount: 0,
          idempotencyKey: expect.any(String),
        }),
      }),
    )
  })
})
