import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, Check, Clock3, Coins, LayoutGrid, MapPin, Spade, Users, X } from 'lucide-react'
import { useParams } from 'react-router'
import { supabase } from '../../lib/supabase'
import { errorMessage } from '../../lib/errors'
import { formatMoney, money } from '../../lib/money'
import { cn } from '../../lib/utils'
import { Badge } from '../../components/ui/Badge'
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
    currency?: string | null
    buyInMinor?: string | null
    entryFeeMinor?: string | null
    rakeMinor?: string | null
    bountyMinor?: string | null
    smallBlindMinor?: string | null
    bigBlindMinor?: string | null
    minBuyInMinor?: string | null
    maxBuyInMinor?: string | null
    tableSize?: number | null
    numTables?: number | null
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

function formatMinor(
  amountMinor: string | null | undefined,
  currency: string | null | undefined,
) {
  if (!amountMinor || !currency) return null
  try {
    return formatMoney(money(amountMinor, currency))
  } catch {
    return null
  }
}

function isPositiveMinor(value: string | null | undefined) {
  if (!value || !/^-?\d+$/.test(value)) return false
  return BigInt(value) > 0n
}

/**
 * Prefers the structured minor-unit amounts so the guest sees a properly
 * localized amount. Falls back to the server-rendered label for older payloads.
 */
function describeStakes(event: GuestInviteView['event']) {
  const { currency } = event

  if (event.kind === 'cash') {
    const small = formatMinor(event.smallBlindMinor, currency)
    const big = formatMinor(event.bigBlindMinor, currency)
    if (small && big) return `${small} / ${big} blinds`
  } else {
    const entry = formatMinor(event.entryFeeMinor, currency)
    if (entry) {
      const bounty = isPositiveMinor(event.bountyMinor)
        ? formatMinor(event.bountyMinor, currency)
        : null
      return bounty ? `${entry} entry · ${bounty} bounty` : `${entry} entry`
    }
  }

  return event.stakesLabel ?? null
}

function describeBuyIn(event: GuestInviteView['event']) {
  const { currency } = event
  if (event.kind === 'cash') {
    const min = formatMinor(event.minBuyInMinor, currency)
    const max = formatMinor(event.maxBuyInMinor, currency)
    if (min && max) return `${min} – ${max}`
    return min ?? max ?? formatMinor(event.buyInMinor, currency)
  }
  const entry = formatMinor(event.entryFeeMinor, currency)
  const rake = isPositiveMinor(event.rakeMinor)
    ? formatMinor(event.rakeMinor, currency)
    : null
  if (!entry) return null
  return rake ? `${entry} + ${rake} fee` : entry
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
    active: 'border-felt-deep bg-felt text-ivory',
  },
  {
    status: 'maybe' as const,
    label: 'Maybe',
    detail: 'Keep me posted',
    icon: Clock3,
    active: 'border-gold bg-gold-leaf text-felt-deep',
  },
  {
    status: 'no' as const,
    label: 'No',
    detail: "I can't make it",
    icon: X,
    active: 'border-loss bg-danger text-white',
  },
]

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof CalendarDays
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-w-0 items-start gap-3 border-b border-rule pb-3 last:border-b-0 last:pb-0">
      <span
        className="mt-0.5 inline-grid size-8 shrink-0 place-items-center border border-rule-strong bg-bg text-felt"
        aria-hidden="true"
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">{label}</dt>
        <dd className="mt-0.5 font-medium text-ink">{children}</dd>
      </div>
    </div>
  )
}

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
  const stakes = invite ? describeStakes(invite.event) : null
  const buyIn = invite ? describeBuyIn(invite.event) : null
  const tableLayout =
    invite?.event.numTables && invite.event.tableSize
      ? `${invite.event.numTables} ${invite.event.numTables === 1 ? 'table' : 'tables'} · ${invite.event.tableSize}-handed`
      : null
  const statusBadge =
    currentStatus === 'yes'
      ? { variant: 'green' as const, label: 'You are in' }
      : currentStatus === 'waitlisted'
        ? { variant: 'gold' as const, label: 'Waitlisted' }
        : currentStatus === 'maybe'
          ? { variant: 'gold' as const, label: 'Maybe' }
          : currentStatus === 'no'
            ? { variant: 'red' as const, label: 'Not attending' }
            : null

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="min-h-screen bg-felt-deep px-3 py-5 text-ink outline-none sm:px-4 sm:py-12"
    >
      <section className="mx-auto max-w-xl overflow-hidden border border-gold-leaf/50 bg-ivory shadow-[0_1px_0_rgba(201,162,39,0.25)]">
        <header className="border-b border-gold-leaf/60 bg-felt px-5 py-6 text-ivory sm:px-8">
          <div className="flex items-center gap-2 font-sans text-xs font-semibold uppercase tracking-[0.18em] text-gold-leaf">
            <Spade className="size-4" aria-hidden="true" />
            Poker Manager invitation
          </div>
          <h1 className="mt-3 font-serif text-3xl font-semibold leading-tight sm:text-4xl">
            {invite?.event.title ??
              (token.length >= 32 && inviteQuery.isPending
                ? 'Loading game…'
                : 'Game invitation')}
          </h1>
          {invite && (
            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ivory/85">
              <span className="font-semibold text-ivory">
                {invite.event.kind === 'cash' ? 'Cash game' : 'Tournament'}
              </span>
              {stakes ? (
                <>
                  <span aria-hidden="true" className="text-ivory/40">
                    ·
                  </span>
                  <span className="tnum">{stakes}</span>
                </>
              ) : null}
            </div>
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
              <div className="h-16 animate-pulse bg-bg" aria-hidden="true" />
              <div className="h-32 animate-pulse bg-bg" aria-hidden="true" />
            </div>
          ) : invite ? (
            <>
              {statusBadge ? (
                <div className="mb-5 flex items-center gap-2 border border-rule bg-bg px-3 py-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                    Your response
                  </span>
                  <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                </div>
              ) : null}

              <dl className="grid gap-3">
                <DetailRow icon={CalendarDays} label="When">
                  {formatEventDate(invite.event.scheduledAt, invite.event.timezone)}
                </DetailRow>
                {invite.event.locationName ? (
                  <DetailRow icon={MapPin} label="Where">
                    {invite.event.locationName}
                  </DetailRow>
                ) : null}
                {buyIn ? (
                  <DetailRow icon={Coins} label={invite.event.kind === 'cash' ? 'Buy-in' : 'Entry'}>
                    <span className="tnum">{buyIn}</span>
                  </DetailRow>
                ) : null}
                {tableLayout ? (
                  <DetailRow icon={LayoutGrid} label="Tables">
                    <span className="tnum">{tableLayout}</span>
                  </DetailRow>
                ) : null}
                {invite.event.capacity != null ? (
                  <DetailRow icon={Users} label="Players">
                    <span className="tnum">
                      {invite.event.confirmedCount ?? 0} confirmed · {invite.event.capacity} seats
                    </span>
                  </DetailRow>
                ) : null}
              </dl>

              {invite.event.notes ? (
                <p className="mt-6 border-l-2 border-gold-leaf bg-bg p-4 text-sm text-ink">
                  {invite.event.notes}
                </p>
              ) : null}

              <div className="mt-8 border-t border-rule pt-7">
                <h2 className="text-center font-serif text-2xl font-semibold text-ink">
                  Can you make it?
                </h2>
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
                          'min-h-24 rounded-sm border-2 border-rule-strong bg-ivory px-4 py-4 text-center transition-colors disabled:opacity-60',
                          selected
                            ? option.active
                            : 'text-ink hover:border-felt hover:bg-bg',
                        )}
                      >
                        <option.icon className="mx-auto size-7" aria-hidden="true" />
                        <span className="mt-1 block font-serif text-xl font-semibold">{option.label}</span>
                        <span className={cn('block text-xs', selected ? 'opacity-85' : 'text-muted')}>
                          {option.status === 'yes' && currentStatus === 'waitlisted'
                            ? 'Waitlisted'
                            : option.detail}
                        </span>
                      </button>
                    )
                  })}
                </div>

                <label className="mx-auto mt-5 block max-w-xs text-center text-sm font-semibold text-ink">
                  Guests coming with you
                  <select
                    value={guestCount}
                    onChange={(event) => setGuestCount(Number(event.target.value))}
                    className="mt-2 h-12 w-full rounded-sm border border-rule-strong bg-ivory px-4 text-base text-ink"
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
                  <p className="mt-4 text-center text-sm font-semibold text-profit" role="status">
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
        <footer className="border-t border-rule bg-bg px-6 py-4 text-center text-xs text-muted">
          No account required.
        </footer>
      </section>
    </main>
  )
}
