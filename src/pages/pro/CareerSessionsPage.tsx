import { useMemo, useState, type FormEvent } from 'react'
import { Filter, Plus, Search, X } from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import {
  Field,
  FormFeedback,
  FormInput,
  FormSelect,
  FormTextarea,
  MoneyField,
  ProEmpty,
  ProError,
  ProLoading,
  ProPage,
  useProResource,
} from '../../components/pro'
import { useAuthStore } from '../../store/authStore'
import {
  createCareerSession,
  decimalToMinor,
  detectTimeZone,
  formatDate,
  formatMinor,
  listCareerSessions,
  localDateTimeInputValue,
  type CareerSessionKind,
  type SessionMedium,
} from '../../lib/pro'
import { cn } from '../../lib/utils'

interface SessionFormState {
  sessionKind: CareerSessionKind
  medium: SessionMedium
  playedAt: string
  venue: string
  variant: string
  stakes: string
  durationHours: string
  hands: string
  entries: string
  buyIn: string
  fees: string
  payout: string
  currency: string
  notes: string
  tags: string
}

function initialForm(): SessionFormState {
  return {
    sessionKind: 'cash',
    medium: 'live',
    playedAt: localDateTimeInputValue(),
    venue: '',
    variant: "No-Limit Hold'em",
    stakes: '',
    durationHours: '',
    hands: '',
    entries: '1',
    buyIn: '',
    fees: '0',
    payout: '',
    currency: 'USD',
    notes: '',
    tags: '',
  }
}

export function CareerSessionsPage() {
  const ownerId = useAuthStore((state) => state.user?.id)
  const resource = useProResource(['pro', 'sessions', ownerId], () => {
    if (!ownerId) throw new Error('Sign in to view sessions.')
    return listCareerSessions(ownerId)
  })
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<SessionFormState>(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ error?: string; success?: string }>({})
  const [search, setSearch] = useState('')
  const [kind, setKind] = useState<'all' | CareerSessionKind>('all')
  const [medium, setMedium] = useState<'all' | SessionMedium>('all')
  const [quality, setQuality] = useState<'all' | 'trusted' | 'legacy_incomplete'>('all')

  const sessions = useMemo(() => {
    const query = search.trim().toLowerCase()
    return (resource.data ?? []).filter((session) => {
      if (kind !== 'all' && session.session_kind !== kind) return false
      if (medium !== 'all' && session.medium !== medium) return false
      if (quality !== 'all' && session.data_quality !== quality) return false
      if (!query) return true
      return [session.venue, session.game_variant, session.stakes, ...session.tags]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    })
  }, [kind, medium, quality, resource.data, search])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!ownerId) return
    setSubmitting(true)
    setFeedback({})
    try {
      await createCareerSession(ownerId, {
        session_kind: form.sessionKind,
        medium: form.medium,
        played_at: new Date(form.playedAt).toISOString(),
        venue: form.venue.trim() || null,
        game_variant: form.variant.trim(),
        stakes: form.stakes.trim() || null,
        duration_minutes: form.durationHours ? Math.round(Number(form.durationHours) * 60) : null,
        hands_played: form.hands ? Number(form.hands) : null,
        entries: Math.max(1, Number(form.entries)),
        buy_in_minor: decimalToMinor(form.buyIn || '0', form.currency),
        fees_minor: decimalToMinor(form.fees || '0', form.currency),
        payout_minor: decimalToMinor(form.payout || '0', form.currency),
        currency: form.currency,
        timezone: detectTimeZone(),
        notes: form.notes.trim() || null,
        tags: form.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      })
      setForm(initialForm())
      setFeedback({ success: 'Session saved and included in trusted analytics.' })
      setShowForm(false)
      await resource.reload()
    } catch (error) {
      setFeedback({ error: error instanceof Error ? error.message : 'Could not save session.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ProPage
      title="Sessions"
      description="Record live and online cash games or tournaments."
      actions={
        <Button
          size="md"
          className="gap-2"
          onClick={() => setShowForm((visible) => !visible)}
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? 'Close' : 'Record session'}
        </Button>
      }
    >
      {feedback.error || feedback.success ? <FormFeedback {...feedback} /> : null}
      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle>New career session</CardTitle>
            <p className="text-sm text-muted">
              Amounts are converted to exact integer minor units before storage.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Format" required>
                  <FormSelect
                    value={form.sessionKind}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        sessionKind: event.target.value as CareerSessionKind,
                      }))
                    }
                  >
                    <option value="cash">Cash game</option>
                    <option value="tournament">Tournament</option>
                  </FormSelect>
                </Field>
                <Field label="Medium" required>
                  <FormSelect
                    value={form.medium}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        medium: event.target.value as SessionMedium,
                      }))
                    }
                  >
                    <option value="live">Live</option>
                    <option value="online">Online</option>
                  </FormSelect>
                </Field>
                <Field label="Started" required>
                  <FormInput
                    type="datetime-local"
                    required
                    value={form.playedAt}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, playedAt: event.target.value }))
                    }
                  />
                </Field>
                <Field label={form.medium === 'online' ? 'Site' : 'Venue'}>
                  <FormInput
                    value={form.venue}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, venue: event.target.value }))
                    }
                    placeholder={form.medium === 'online' ? 'Poker site' : 'Casino or club'}
                  />
                </Field>
                <Field label="Variant" required>
                  <FormInput
                    required
                    value={form.variant}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, variant: event.target.value }))
                    }
                  />
                </Field>
                <Field label={form.sessionKind === 'cash' ? 'Stakes' : 'Event / level'}>
                  <FormInput
                    value={form.stakes}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, stakes: event.target.value }))
                    }
                    placeholder={form.sessionKind === 'cash' ? '$2/$5' : 'Main Event'}
                  />
                </Field>
                <Field label="Duration (hours)">
                  <FormInput
                    type="number"
                    min="0"
                    step="0.25"
                    value={form.durationHours}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, durationHours: event.target.value }))
                    }
                  />
                </Field>
                <Field label="Hands">
                  <FormInput
                    type="number"
                    min="0"
                    value={form.hands}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, hands: event.target.value }))
                    }
                  />
                </Field>
                <Field label="Entries">
                  <FormInput
                    type="number"
                    min="1"
                    value={form.entries}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, entries: event.target.value }))
                    }
                  />
                </Field>
                <Field label="Currency" required>
                  <FormInput
                    required
                    minLength={3}
                    maxLength={3}
                    value={form.currency}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        currency: event.target.value.toUpperCase(),
                      }))
                    }
                  />
                </Field>
                <MoneyField
                  label={form.sessionKind === 'cash' ? 'Total buy-ins' : 'Entries / buy-ins'}
                  required
                  currency={form.currency}
                  value={form.buyIn}
                  onChange={(value) => setForm((current) => ({ ...current, buyIn: value }))}
                />
                <MoneyField
                  label="Fees / rake"
                  currency={form.currency}
                  value={form.fees}
                  onChange={(value) => setForm((current) => ({ ...current, fees: value }))}
                />
                <MoneyField
                  label={form.sessionKind === 'cash' ? 'Cash-out' : 'Payout'}
                  required
                  currency={form.currency}
                  value={form.payout}
                  onChange={(value) => setForm((current) => ({ ...current, payout: value }))}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Tags" hint="Comma-separated: shot-take, PLO, series">
                  <FormInput
                    value={form.tags}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, tags: event.target.value }))
                    }
                  />
                </Field>
                <Field label="Private notes">
                  <FormTextarea
                    value={form.notes}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, notes: event.target.value }))
                    }
                  />
                </Field>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving…' : 'Save session'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <CardTitle>Session history</CardTitle>
              <p className="text-sm text-muted">{sessions.length} matching sessions</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-4">
              <label className="relative sm:col-span-1">
                <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted" />
                <FormInput
                  className="pl-9"
                  aria-label="Search sessions"
                  placeholder="Search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
              <FormSelect
                aria-label="Filter by format"
                value={kind}
                onChange={(event) => setKind(event.target.value as typeof kind)}
              >
                <option value="all">All formats</option>
                <option value="cash">Cash</option>
                <option value="tournament">Tournament</option>
              </FormSelect>
              <FormSelect
                aria-label="Filter by medium"
                value={medium}
                onChange={(event) => setMedium(event.target.value as typeof medium)}
              >
                <option value="all">Live & online</option>
                <option value="live">Live</option>
                <option value="online">Online</option>
              </FormSelect>
              <FormSelect
                aria-label="Filter by data quality"
                value={quality}
                onChange={(event) => setQuality(event.target.value as typeof quality)}
              >
                <option value="all">All quality</option>
                <option value="trusted">Trusted</option>
                <option value="legacy_incomplete">Needs review</option>
              </FormSelect>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {resource.loading ? <ProLoading label="Loading sessions…" /> : null}
          {resource.error ? <ProError error={resource.error} retry={resource.reload} /> : null}
          {!resource.loading && !resource.error && sessions.length === 0 ? (
            <ProEmpty
              title={(resource.data?.length ?? 0) > 0 ? 'No matching sessions' : 'No sessions recorded'}
              description={
                (resource.data?.length ?? 0) > 0
                  ? 'Clear or change the filters to see more results.'
                  : 'Record a live or online session to begin building trusted career analytics.'
              }
              action={
                <Button size="sm" onClick={() => setShowForm(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Record session
                </Button>
              }
            />
          ) : null}
          {sessions.length ? (
            <div className="divide-y divide-border">
              {sessions.map((session) => (
                <article
                  className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[1fr_auto] sm:items-center"
                  key={session.id}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-ink">
                        {session.venue || (session.medium === 'online' ? 'Online session' : 'Live session')}
                      </h2>
                      <Badge variant={session.session_kind === 'cash' ? 'green' : 'gold'}>
                        {session.session_kind}
                      </Badge>
                      <Badge variant="blue">{session.medium}</Badge>
                      {session.data_quality === 'legacy_incomplete' ? (
                        <Badge variant="red">Excluded from trusted analytics</Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {formatDate(session.played_at)} · {session.game_variant}
                      {session.stakes ? ` · ${session.stakes}` : ''}
                      {session.duration_minutes ? ` · ${(session.duration_minutes / 60).toFixed(1)}h` : ''}
                      {session.hands_played ? ` · ${session.hands_played.toLocaleString()} hands` : ''}
                    </p>
                    {session.tags.length ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {session.tags.map((tag) => (
                          <span className="rounded-full bg-cream px-2 py-0.5 text-xs text-muted" key={tag}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex items-end justify-between gap-5 sm:flex-col sm:items-end sm:justify-center">
                    <p
                      className={cn(
                        'text-lg font-bold tabular-nums',
                        BigInt(session.profit_minor) >= 0n ? 'text-success' : 'text-danger',
                      )}
                    >
                      {formatMinor(session.profit_minor, session.currency)}
                    </p>
                    <p className="text-xs text-muted">
                      In {formatMinor(session.buy_in_minor, session.currency)} · Out{' '}
                      {formatMinor(session.payout_minor, session.currency)}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
      <div className="flex items-start gap-2 rounded-xl border border-border bg-cream p-4 text-xs text-muted">
        <Filter className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
        Legacy home-game results with ambiguous rebuy costs remain visible only after they are linked,
        and stay excluded from trusted financial metrics until reconciled.
      </div>
    </ProPage>
  )
}
