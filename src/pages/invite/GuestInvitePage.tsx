import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, Check, Clock3, MapPin, Spade, Users, X } from 'lucide-react'
import { useParams } from 'react-router'
import { supabase } from '../../lib/supabase'
import { errorMessage } from '../../lib/errors'
import { cn } from '../../lib/utils'
import type { GameKind, GuestRsvpStatus } from '../../types'

interface GuestInviteView {
  invitation: {
    status: GuestRsvpStatus
    guestCount: number
    expiresAt: string
  }
  event: {
    title: string
    kind: GameKind
    phase: string
    scheduledAt: string
    timezone: string
    locationName?: string | null
    stakesLabel?: string | null
    capacity?: number | null
    confirmedCount?: number
    notes?: string | null
  }
}

interface InviteFunctionResponse extends GuestInviteView {
  error?: string
}

async function invokeGuestInvite(
  token: string,
  input: { action: 'view' } | {
    action: 'rsvp'
    status: Exclude<GuestRsvpStatus, 'pending' | 'waitlisted'>
    guestCount: number
    idempotencyKey: string
  },
) {
  const { data, error } = await supabase.functions.invoke<InviteFunctionResponse>('guest-invite', {
    body: { token, ...input },
  })

  if (error) throw error
  if (!data || data.error) throw new Error(data?.error || 'Invitation could not be loaded.')
  return data
}

function formatEventDate(value: string, timezone: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date to be confirmed'
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone || undefined,
    timeZoneName: 'short',
  }).format(date)
}

const responseOptions = [
  {
    status: 'yes' as const,
    label: 'Yes',
    detail: "I'll be there",
    icon: Check,
    active: 'border-poker-green bg-poker-green text-white',
  },
  {
    status: 'maybe' as const,
    label: 'Maybe',
    detail: 'Keep me posted',
    icon: Clock3,
    active: 'border-gold bg-gold text-white',
  },
  {
    status: 'no' as const,
    label: 'No',
    detail: "I can't make it",
    icon: X,
    active: 'border-danger bg-danger text-white',
  },
]

export function GuestInvitePage() {
  const { token = '' } = useParams()
  const queryClient = useQueryClient()
  const [guestCount, setGuestCount] = useState(0)

  const inviteQuery = useQuery({
    queryKey: ['guest-invite', token],
    queryFn: () => invokeGuestInvite(token, { action: 'view' }),
    enabled: token.length >= 32,
    retry: false,
  })

  const responseMutation = useMutation({
    mutationFn: (status: 'yes' | 'maybe' | 'no') =>
      invokeGuestInvite(token, {
        action: 'rsvp',
        status,
        guestCount,
        idempotencyKey: crypto.randomUUID(),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(['guest-invite', token], data)
    },
  })

  const invite = inviteQuery.data
  const currentStatus = invite?.invitation.status ?? 'pending'
  const full =
    invite?.event.capacity != null &&
    (invite.event.confirmedCount ?? 0) >= invite.event.capacity

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="min-h-screen bg-felt-deep px-3 py-5 text-ink outline-none sm:px-4 sm:py-12"
    >
      <section className="mx-auto max-w-xl overflow-hidden border border-gold-leaf/50 bg-ivory">
        <header className="border-b border-gold-leaf/60 bg-felt px-5 py-6 text-white sm:px-8">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-white/80">
            <Spade className="h-5 w-5" aria-hidden="true" />
            Poker Manager invitation
          </div>
          <h1 className="mt-4 text-3xl font-bold leading-tight">
            {invite?.event.title ??
              (token.length >= 32 && inviteQuery.isPending
                ? 'Loading game…'
                : 'Game invitation')}
          </h1>
          {invite && (
            <p className="mt-2 text-white/85">
              {invite.event.kind === 'cash' ? 'Cash game' : 'Tournament'}
              {invite.event.stakesLabel ? ` · ${invite.event.stakesLabel}` : ''}
            </p>
          )}
        </header>

        <div className="p-5 sm:p-8">
          {token.length < 32 || inviteQuery.isError ? (
            <div role="alert" className="border border-danger/40 bg-danger/5 p-5">
              <h2 className="text-xl font-bold text-danger">This invitation is unavailable</h2>
              <p className="mt-2 text-sm text-ink">
                {token.length < 32
                  ? 'The invitation link is incomplete.'
                  : errorMessage(inviteQuery.error, 'It may have expired or been revoked.')}
              </p>
              <p className="mt-3 text-sm text-muted">Ask the host for a fresh link.</p>
            </div>
          ) : inviteQuery.isPending ? (
            <div className="space-y-4" aria-live="polite" role="status">
              <span className="sr-only">Loading invitation.</span>
              <div className="h-16 animate-pulse bg-cream" aria-hidden="true" />
              <div className="h-32 animate-pulse bg-cream" aria-hidden="true" />
            </div>
          ) : invite ? (
            <>
              <dl className="grid gap-4 text-base">
                <div className="grid grid-cols-[auto_1fr] gap-x-3">
                  <dt className="contents text-sm font-semibold text-muted">
                    <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-poker-green" aria-hidden="true" />
                    <span>When</span>
                  </dt>
                  <dd className="col-start-2 font-medium">
                    {formatEventDate(invite.event.scheduledAt, invite.event.timezone)}
                  </dd>
                </div>
                {invite.event.locationName && (
                  <div className="grid grid-cols-[auto_1fr] gap-x-3">
                    <dt className="contents text-sm font-semibold text-muted">
                      <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-poker-green" aria-hidden="true" />
                      <span>Where</span>
                    </dt>
                    <dd className="col-start-2 font-medium">{invite.event.locationName}</dd>
                  </div>
                )}
                {invite.event.capacity != null && (
                  <div className="grid grid-cols-[auto_1fr] gap-x-3">
                    <dt className="contents text-sm font-semibold text-muted">
                      <Users className="mt-0.5 h-5 w-5 shrink-0 text-poker-green" aria-hidden="true" />
                      <span>Players</span>
                    </dt>
                    <dd className="col-start-2 font-medium">
                      {invite.event.confirmedCount ?? 0} confirmed · {invite.event.capacity} seats
                    </dd>
                  </div>
                )}
              </dl>

              {invite.event.notes && (
                <p className="mt-6 border-l-4 border-gold bg-cream p-4 text-sm">
                  {invite.event.notes}
                </p>
              )}

              <div className="mt-8 border-t border-border pt-7">
                <h2 className="text-center text-xl font-bold">Can you make it?</h2>
                {full && currentStatus !== 'yes' && (
                  <p className="mx-auto mt-2 max-w-sm text-center text-sm text-muted">
                    The game is currently full. A Yes response may place you on the waitlist.
                  </p>
                )}
                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {responseOptions.map((option) => {
                    const selected =
                      currentStatus === option.status ||
                      (option.status === 'yes' && currentStatus === 'waitlisted')
                    return (
                      <button
                        key={option.status}
                        type="button"
                        onClick={() => responseMutation.mutate(option.status)}
                        disabled={responseMutation.isPending}
                        aria-pressed={selected}
                        className={cn(
                          'min-h-24 border-2 border-border bg-white px-4 py-4 text-center transition disabled:opacity-60',
                          selected ? option.active : 'hover:border-poker-green hover:bg-cream',
                        )}
                      >
                        <option.icon className="mx-auto h-7 w-7" aria-hidden="true" />
                        <span className="mt-1 block text-xl font-bold">{option.label}</span>
                        <span className={cn('block text-xs', selected ? 'text-white/85' : 'text-muted')}>
                          {option.status === 'yes' && currentStatus === 'waitlisted'
                            ? 'Waitlisted'
                            : option.detail}
                        </span>
                      </button>
                    )
                  })}
                </div>

                <label className="mx-auto mt-5 block max-w-xs text-center text-sm font-semibold">
                  Guests coming with you
                  <select
                    value={guestCount}
                    onChange={(event) => setGuestCount(Number(event.target.value))}
                    className="mt-2 h-12 w-full rounded-sm border border-border bg-white px-4 text-base"
                  >
                    {[0, 1, 2, 3, 4].map((count) => (
                      <option key={count} value={count}>
                        {count === 0 ? 'Just me' : `Me + ${count}`}
                      </option>
                    ))}
                  </select>
                </label>

                {responseMutation.isError && (
                  <p className="mt-4 text-center text-sm font-medium text-danger" role="alert">
                    {errorMessage(responseMutation.error, 'Your response was not saved. Try again.')}
                  </p>
                )}
                {responseMutation.isSuccess && (
                  <p className="mt-4 text-center text-sm font-semibold text-poker-green" role="status">
                    {currentStatus === 'waitlisted'
                      ? "You're on the waitlist. The host has your response."
                      : 'Response saved. You can change it here any time.'}
                  </p>
                )}
                <span className="sr-only" role="status" aria-live="polite">
                  {responseMutation.isPending ? 'Saving response.' : ''}
                </span>
              </div>
            </>
          ) : null}
        </div>
        <footer className="border-t border-border bg-cream px-6 py-4 text-center text-xs text-muted">
          No account required.
        </footer>
      </section>
    </main>
  )
}
