import { useMemo, useState, type FormEvent } from 'react'
import { CalendarDays, Clock3, MapPin, Plus, WalletCards, X } from 'lucide-react'
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
  createProfessionalEvent,
  decimalToMinor,
  detectTimeZone,
  formatDateTime,
  formatMinor,
  listProfessionalEvents,
  localDateTimeInputValue,
  type ProfessionalCalendarEvent,
} from '../../lib/pro'

export function ProfessionalCalendarPage() {
  const ownerId = useAuthStore((state) => state.user?.id)
  const resource = useProResource(['pro', 'calendar', ownerId], () => {
    if (!ownerId) throw new Error('Sign in to view the professional calendar.')
    return listProfessionalEvents(ownerId)
  })
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ error?: string; success?: string }>({})
  const [form, setForm] = useState({
    title: '',
    eventType: 'session' as ProfessionalCalendarEvent['event_type'],
    startsAt: localDateTimeInputValue(),
    endsAt: '',
    location: '',
    exposure: '',
    currency: 'USD',
    notes: '',
  })

  const grouped = useMemo(() => {
    const groups = new Map<string, ProfessionalCalendarEvent[]>()
    for (const event of resource.data ?? []) {
      const key = new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
      }).format(new Date(event.starts_at))
      groups.set(key, [...(groups.get(key) ?? []), event])
    }
    return Array.from(groups.entries())
  }, [resource.data])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!ownerId) return
    setSubmitting(true)
    setFeedback({})
    try {
      const startsAt = new Date(form.startsAt)
      const endsAt = form.endsAt ? new Date(form.endsAt) : null
      if (endsAt && endsAt < startsAt) throw new Error('End time must be after the start time.')
      await createProfessionalEvent(ownerId, {
        session_id: null,
        trip_id: null,
        title: form.title.trim(),
        event_type: form.eventType,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt?.toISOString() ?? null,
        timezone: detectTimeZone(),
        location: form.location.trim() || null,
        exposure_minor: form.exposure ? decimalToMinor(form.exposure, form.currency) : null,
        currency: form.currency,
        notes: form.notes.trim() || null,
      })
      setForm({
        title: '',
        eventType: 'session',
        startsAt: localDateTimeInputValue(),
        endsAt: '',
        location: '',
        exposure: '',
        currency: 'USD',
        notes: '',
      })
      setShowForm(false)
      setFeedback({ success: 'Calendar event scheduled.' })
      await resource.reload()
    } catch (error) {
      setFeedback({ error: error instanceof Error ? error.message : 'Could not schedule event.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ProPage
      title="Professional calendar"
      description="Schedule sessions, deadlines, travel, and study."
      actions={
        <Button
          size="md"
          className="gap-2"
          onClick={() => setShowForm((value) => !value)}
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? 'Close' : 'Schedule'}
        </Button>
      }
    >
      <FormFeedback {...feedback} />
      {showForm ? (
        <Card>
          <CardHeader><CardTitle>Schedule event</CardTitle></CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={submit}>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Title" required>
                  <FormInput required maxLength={160} value={form.title} onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))} />
                </Field>
                <Field label="Type" required>
                  <FormSelect value={form.eventType} onChange={(event) => setForm((value) => ({ ...value, eventType: event.target.value as ProfessionalCalendarEvent['event_type'] }))}>
                    <option value="session">Session</option>
                    <option value="tournament">Tournament</option>
                    <option value="series">Tournament series</option>
                    <option value="registration">Registration deadline</option>
                    <option value="travel">Travel</option>
                    <option value="study">Study</option>
                    <option value="other">Other</option>
                  </FormSelect>
                </Field>
                <Field label="Starts" required>
                  <FormInput required type="datetime-local" value={form.startsAt} onChange={(event) => setForm((value) => ({ ...value, startsAt: event.target.value }))} />
                </Field>
                <Field label="Ends">
                  <FormInput type="datetime-local" min={form.startsAt} value={form.endsAt} onChange={(event) => setForm((value) => ({ ...value, endsAt: event.target.value }))} />
                </Field>
                <Field label="Location">
                  <FormInput value={form.location} onChange={(event) => setForm((value) => ({ ...value, location: event.target.value }))} />
                </Field>
                <Field label="Currency">
                  <FormInput required minLength={3} maxLength={3} value={form.currency} onChange={(event) => setForm((value) => ({ ...value, currency: event.target.value.toUpperCase() }))} />
                </Field>
                <MoneyField label="Planned exposure" currency={form.currency} value={form.exposure} onChange={(exposure) => setForm((value) => ({ ...value, exposure }))} />
                <Field label="Private notes">
                  <FormTextarea value={form.notes} onChange={(event) => setForm((value) => ({ ...value, notes: event.target.value }))} />
                </Field>
              </div>
              <div className="flex justify-end"><Button type="submit" disabled={submitting}>{submitting ? 'Scheduling…' : 'Schedule event'}</Button></div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {resource.loading ? <ProLoading label="Loading calendar…" /> : null}
      {resource.error ? <ProError error={resource.error} retry={resource.reload} /> : null}
      {!resource.loading && !resource.error && resource.data?.length === 0 ? (
        <ProEmpty title="Nothing scheduled" description="Add sessions, series, registration deadlines, travel, or study blocks." action={<Button onClick={() => setShowForm(true)}>Schedule event</Button>} />
      ) : null}
      {grouped.map(([month, events]) => (
        <Card key={month}>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>{month}</CardTitle>
            <CalendarDays className="h-5 w-5 text-gold" aria-hidden="true" />
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {events.map((event) => {
              const past = new Date(event.ends_at ?? event.starts_at) < new Date()
              return (
                <article className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[1fr_auto] sm:items-center" key={event.id}>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-ink">{event.title}</h2>
                      <Badge variant={past ? 'default' : event.event_type === 'registration' ? 'red' : 'green'}>{event.event_type}</Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                      <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" aria-hidden="true" />{formatDateTime(event.starts_at)}{event.ends_at ? ` – ${formatDateTime(event.ends_at)}` : ''}</span>
                      {event.location ? <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{event.location}</span> : null}
                    </div>
                  </div>
                  {event.exposure_minor ? (
                    <p className="inline-flex items-center gap-1 text-sm font-semibold tabular-nums text-ink">
                      <WalletCards className="h-4 w-4 text-gold" aria-hidden="true" />
                      {formatMinor(event.exposure_minor, event.currency)}
                    </p>
                  ) : null}
                </article>
              )
            })}
          </CardContent>
        </Card>
      ))}
    </ProPage>
  )
}
