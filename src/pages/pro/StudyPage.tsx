import { useMemo, useState, type FormEvent } from 'react'
import { BookOpenCheck, Check, Flag, Plus, Target, X } from 'lucide-react'
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
  createCareerGoal,
  createPokerHand,
  createStudySession,
  decimalToMinor,
  formatDate,
  formatDateTime,
  formatMinor,
  listCareerGoals,
  listPokerHands,
  listStudySessions,
  localDateTimeInputValue,
  todayInputValue,
  updateCareerGoal,
  updateHandReviewStatus,
  type CareerGoal,
  type PokerHand,
} from '../../lib/pro'

function loadStudy(ownerId: string) {
  return Promise.all([
    listPokerHands(ownerId),
    listStudySessions(ownerId),
    listCareerGoals(ownerId),
  ]).then(([hands, studySessions, goals]) => ({ hands, studySessions, goals }))
}

export function StudyPage() {
  const ownerId = useAuthStore((state) => state.user?.id)
  const resource = useProResource(['pro', 'study', ownerId], () => {
    if (!ownerId) throw new Error('Sign in to view study data.')
    return loadStudy(ownerId)
  })
  const [tab, setTab] = useState<'hands' | 'sessions' | 'goals'>('hands')
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ error?: string; success?: string }>({})
  const [reviewFilter, setReviewFilter] = useState<'all' | PokerHand['review_status']>('queued')
  const [goalValues, setGoalValues] = useState<Record<string, string>>({})
  const [hand, setHand] = useState({
    source: 'manual' as PokerHand['source'],
    playedAt: localDateTimeInputValue(),
    variant: "No-Limit Hold'em",
    stakes: '',
    position: '',
    heroCards: '',
    board: '',
    pot: '',
    result: '',
    currency: 'USD',
    opponents: '',
    tags: '',
    history: '',
    notes: '',
  })
  const [study, setStudy] = useState({
    studiedAt: localDateTimeInputValue(),
    duration: '60',
    topic: '',
    resource: '',
    notes: '',
  })
  const [goal, setGoal] = useState({
    title: '',
    metric: '',
    target: '',
    current: '0',
    startsOn: todayInputValue(),
    dueOn: '',
    notes: '',
  })

  const hands = useMemo(
    () =>
      (resource.data?.hands ?? []).filter(
        (item) => reviewFilter === 'all' || item.review_status === reviewFilter,
      ),
    [resource.data?.hands, reviewFilter],
  )

  const openForm = (nextTab: typeof tab) => {
    setTab(nextTab)
    setShowForm(true)
    setFeedback({})
  }

  const importHandFile = async (file: File | undefined) => {
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setFeedback({ error: 'Hand-history text files must be 2 MB or smaller.' })
      return
    }
    try {
      const history = await file.text()
      if (!history.trim()) throw new Error('The selected hand-history file is empty.')
      setHand((value) => ({
        ...value,
        source: 'import',
        history,
        tags: value.tags || 'file-import',
      }))
      setFeedback({ success: `${file.name} loaded. Review the details, then add it to the queue.` })
    } catch (error) {
      setFeedback({ error: error instanceof Error ? error.message : 'Could not read hand-history file.' })
    }
  }

  const saveHand = async (event: FormEvent) => {
    event.preventDefault()
    if (!ownerId) return
    setSubmitting(true)
    setFeedback({})
    try {
      await createPokerHand(ownerId, {
        session_id: null,
        played_at: new Date(hand.playedAt).toISOString(),
        source: hand.source,
        game_variant: hand.variant.trim(),
        stakes: hand.stakes.trim() || null,
        position: hand.position.trim() || null,
        hero_cards: hand.heroCards.trim() || null,
        board: hand.board.trim() || null,
        pot_minor: hand.pot ? decimalToMinor(hand.pot, hand.currency) : null,
        result_minor: hand.result ? decimalToMinor(hand.result, hand.currency) : null,
        currency: hand.currency,
        opponent_aliases: hand.opponents.split(',').map((value) => value.trim()).filter(Boolean),
        tags: hand.tags.split(',').map((value) => value.trim()).filter(Boolean),
        hand_history: hand.history.trim(),
        notes: hand.notes.trim() || null,
        review_status: 'queued',
      })
      setHand({
        source: 'manual',
        playedAt: localDateTimeInputValue(),
        variant: "No-Limit Hold'em",
        stakes: '',
        position: '',
        heroCards: '',
        board: '',
        pot: '',
        result: '',
        currency: 'USD',
        opponents: '',
        tags: '',
        history: '',
        notes: '',
      })
      setShowForm(false)
      setFeedback({ success: 'Hand added to the review queue.' })
      await resource.reload()
    } catch (error) {
      setFeedback({ error: error instanceof Error ? error.message : 'Could not save hand.' })
    } finally {
      setSubmitting(false)
    }
  }

  const saveStudy = async (event: FormEvent) => {
    event.preventDefault()
    if (!ownerId) return
    setSubmitting(true)
    setFeedback({})
    try {
      await createStudySession(ownerId, {
        studied_at: new Date(study.studiedAt).toISOString(),
        duration_minutes: Math.round(Number(study.duration)),
        topic: study.topic.trim(),
        resource: study.resource.trim() || null,
        notes: study.notes.trim() || null,
      })
      setStudy({ studiedAt: localDateTimeInputValue(), duration: '60', topic: '', resource: '', notes: '' })
      setShowForm(false)
      setFeedback({ success: 'Study session logged.' })
      await resource.reload()
    } catch (error) {
      setFeedback({ error: error instanceof Error ? error.message : 'Could not log study session.' })
    } finally {
      setSubmitting(false)
    }
  }

  const saveGoal = async (event: FormEvent) => {
    event.preventDefault()
    if (!ownerId) return
    setSubmitting(true)
    setFeedback({})
    try {
      await createCareerGoal(ownerId, {
        title: goal.title.trim(),
        metric: goal.metric.trim() || null,
        target_value: goal.target.trim() || null,
        current_value: goal.current.trim() || null,
        starts_on: goal.startsOn,
        due_on: goal.dueOn || null,
        status: 'active',
        notes: goal.notes.trim() || null,
      })
      setGoal({ title: '', metric: '', target: '', current: '0', startsOn: todayInputValue(), dueOn: '', notes: '' })
      setShowForm(false)
      setFeedback({ success: 'Career goal created.' })
      await resource.reload()
    } catch (error) {
      setFeedback({ error: error instanceof Error ? error.message : 'Could not create goal.' })
    } finally {
      setSubmitting(false)
    }
  }

  const changeHandStatus = async (item: PokerHand, reviewStatus: PokerHand['review_status']) => {
    if (!ownerId) return
    try {
      await updateHandReviewStatus(ownerId, item.id, reviewStatus)
      setFeedback({ success: `Hand marked ${reviewStatus}.` })
      await resource.reload()
    } catch (error) {
      setFeedback({ error: error instanceof Error ? error.message : 'Could not update hand.' })
    }
  }

  const updateGoalProgress = async (item: CareerGoal, status = item.status) => {
    if (!ownerId) return
    try {
      await updateCareerGoal(ownerId, item.id, {
        current_value: goalValues[item.id] ?? item.current_value,
        status,
      })
      setFeedback({ success: status === 'completed' ? 'Goal completed.' : 'Goal progress updated.' })
      await resource.reload()
    } catch (error) {
      setFeedback({ error: error instanceof Error ? error.message : 'Could not update goal.' })
    }
  }

  return (
    <ProPage
      title="Hands & study"
      description="Build a private review queue, log deliberate study, track opponent aliases, and measure career goals."
      actions={
        <Button
          size="sm"
          className="gap-2 bg-white text-poker-green hover:bg-cream"
          onClick={() => setShowForm((value) => !value)}
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? 'Close' : tab === 'hands' ? 'Capture hand' : tab === 'sessions' ? 'Log study' : 'Set goal'}
        </Button>
      }
    >
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Study sections">
        {([
          ['hands', 'Hand review'],
          ['sessions', 'Study sessions'],
          ['goals', 'Goals'],
        ] as const).map(([value, label]) => (
          <Button
            key={value}
            role="tab"
            aria-selected={tab === value}
            variant={tab === value ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => {
              setTab(value)
              setShowForm(false)
            }}
          >
            {label}
          </Button>
        ))}
      </div>
      <FormFeedback {...feedback} />

      {showForm && tab === 'hands' ? (
        <Card>
          <CardHeader>
            <CardTitle>{hand.source === 'import' ? 'Import hand history' : 'Manual hand capture'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={saveHand}>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Source" required>
                  <FormSelect value={hand.source} onChange={(event) => setHand((value) => ({ ...value, source: event.target.value as PokerHand['source'] }))}>
                    <option value="manual">Manual capture</option>
                    <option value="import">Hand-history import</option>
                  </FormSelect>
                </Field>
                <Field label="Played at" required>
                  <FormInput required type="datetime-local" value={hand.playedAt} onChange={(event) => setHand((value) => ({ ...value, playedAt: event.target.value }))} />
                </Field>
                <Field label="Hand-history file" hint="One queue record per text file; original text is preserved.">
                  <FormInput
                    type="file"
                    accept=".txt,.log,text/plain"
                    onChange={(event) => void importHandFile(event.target.files?.[0])}
                  />
                </Field>
                <Field label="Variant" required>
                  <FormInput required value={hand.variant} onChange={(event) => setHand((value) => ({ ...value, variant: event.target.value }))} />
                </Field>
                <Field label="Stakes">
                  <FormInput value={hand.stakes} onChange={(event) => setHand((value) => ({ ...value, stakes: event.target.value }))} />
                </Field>
                <Field label="Position">
                  <FormInput value={hand.position} onChange={(event) => setHand((value) => ({ ...value, position: event.target.value }))} />
                </Field>
                <Field label="Hero cards">
                  <FormInput value={hand.heroCards} onChange={(event) => setHand((value) => ({ ...value, heroCards: event.target.value }))} />
                </Field>
                <Field label="Board">
                  <FormInput value={hand.board} onChange={(event) => setHand((value) => ({ ...value, board: event.target.value }))} />
                </Field>
                <Field label="Currency">
                  <FormInput required minLength={3} maxLength={3} value={hand.currency} onChange={(event) => setHand((value) => ({ ...value, currency: event.target.value.toUpperCase() }))} />
                </Field>
                <MoneyField label="Pot" currency={hand.currency} value={hand.pot} onChange={(pot) => setHand((value) => ({ ...value, pot }))} />
                <MoneyField label="Result" allowNegative currency={hand.currency} value={hand.result} onChange={(result) => setHand((value) => ({ ...value, result }))} />
                <Field label="Opponent aliases" hint="Comma-separated, private">
                  <FormInput value={hand.opponents} onChange={(event) => setHand((value) => ({ ...value, opponents: event.target.value }))} />
                </Field>
                <Field label="Tags" hint="Comma-separated">
                  <FormInput value={hand.tags} onChange={(event) => setHand((value) => ({ ...value, tags: event.target.value }))} />
                </Field>
              </div>
              <Field label="Hand history" required>
                <FormTextarea required className="min-h-40 font-mono text-sm" value={hand.history} onChange={(event) => setHand((value) => ({ ...value, history: event.target.value }))} />
              </Field>
              <Field label="Private review notes">
                <FormTextarea value={hand.notes} onChange={(event) => setHand((value) => ({ ...value, notes: event.target.value }))} />
              </Field>
              <div className="flex justify-end"><Button type="submit" disabled={submitting}>{submitting ? 'Saving…' : 'Add to review queue'}</Button></div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {showForm && tab === 'sessions' ? (
        <Card>
          <CardHeader><CardTitle>Log study session</CardTitle></CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={saveStudy}>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Studied at" required>
                  <FormInput required type="datetime-local" value={study.studiedAt} onChange={(event) => setStudy((value) => ({ ...value, studiedAt: event.target.value }))} />
                </Field>
                <Field label="Minutes" required>
                  <FormInput required type="number" min="1" value={study.duration} onChange={(event) => setStudy((value) => ({ ...value, duration: event.target.value }))} />
                </Field>
                <Field label="Topic" required>
                  <FormInput required value={study.topic} onChange={(event) => setStudy((value) => ({ ...value, topic: event.target.value }))} />
                </Field>
                <Field label="Resource">
                  <FormInput value={study.resource} onChange={(event) => setStudy((value) => ({ ...value, resource: event.target.value }))} />
                </Field>
              </div>
              <Field label="Notes">
                <FormTextarea value={study.notes} onChange={(event) => setStudy((value) => ({ ...value, notes: event.target.value }))} />
              </Field>
              <div className="flex justify-end"><Button type="submit" disabled={submitting}>{submitting ? 'Saving…' : 'Log study'}</Button></div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {showForm && tab === 'goals' ? (
        <Card>
          <CardHeader><CardTitle>New career goal</CardTitle></CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={saveGoal}>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Goal" required>
                  <FormInput required value={goal.title} onChange={(event) => setGoal((value) => ({ ...value, title: event.target.value }))} />
                </Field>
                <Field label="Metric">
                  <FormInput placeholder="Hours, sessions, ROI" value={goal.metric} onChange={(event) => setGoal((value) => ({ ...value, metric: event.target.value }))} />
                </Field>
                <Field label="Target value">
                  <FormInput type="number" step="any" value={goal.target} onChange={(event) => setGoal((value) => ({ ...value, target: event.target.value }))} />
                </Field>
                <Field label="Current value">
                  <FormInput type="number" step="any" value={goal.current} onChange={(event) => setGoal((value) => ({ ...value, current: event.target.value }))} />
                </Field>
                <Field label="Starts" required>
                  <FormInput required type="date" value={goal.startsOn} onChange={(event) => setGoal((value) => ({ ...value, startsOn: event.target.value }))} />
                </Field>
                <Field label="Due">
                  <FormInput type="date" min={goal.startsOn} value={goal.dueOn} onChange={(event) => setGoal((value) => ({ ...value, dueOn: event.target.value }))} />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Notes">
                    <FormTextarea value={goal.notes} onChange={(event) => setGoal((value) => ({ ...value, notes: event.target.value }))} />
                  </Field>
                </div>
              </div>
              <div className="flex justify-end"><Button type="submit" disabled={submitting}>{submitting ? 'Saving…' : 'Create goal'}</Button></div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {resource.loading ? <ProLoading label="Loading study data…" /> : null}
      {resource.error ? <ProError error={resource.error} retry={resource.reload} /> : null}

      {resource.data && tab === 'hands' ? (
        <Card>
          <CardHeader className="gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div><CardTitle>Review queue</CardTitle><p className="text-sm text-muted">{hands.length} hands shown</p></div>
            <FormSelect className="sm:max-w-40" aria-label="Filter hand review status" value={reviewFilter} onChange={(event) => setReviewFilter(event.target.value as typeof reviewFilter)}>
              <option value="all">All hands</option>
              <option value="queued">Queued</option>
              <option value="reviewed">Reviewed</option>
              <option value="archived">Archived</option>
            </FormSelect>
          </CardHeader>
          <CardContent>
            {hands.length ? (
              <div className="space-y-3">
                {hands.map((item) => (
                  <article className="rounded-xl border border-border p-4" key={item.id}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-semibold text-ink">{item.game_variant}{item.stakes ? ` · ${item.stakes}` : ''}</h2>
                          <Badge variant={item.review_status === 'queued' ? 'gold' : item.review_status === 'reviewed' ? 'green' : 'default'}>{item.review_status}</Badge>
                          <Badge variant="blue">{item.source}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted">{formatDateTime(item.played_at)}{item.position ? ` · ${item.position}` : ''}{item.opponent_aliases.length ? ` · ${item.opponent_aliases.join(', ')}` : ''}</p>
                      </div>
                      {item.result_minor ? <p className="font-bold tabular-nums text-ink">{formatMinor(item.result_minor, item.currency)}</p> : null}
                    </div>
                    <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-cream p-3 text-xs text-ink">{item.hand_history}</pre>
                    {item.notes ? <p className="mt-2 text-sm text-muted">{item.notes}</p> : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.review_status === 'queued' ? <Button size="sm" className="gap-1" onClick={() => void changeHandStatus(item, 'reviewed')}><Check className="h-3.5 w-3.5" />Mark reviewed</Button> : null}
                      {item.review_status !== 'archived' ? <Button size="sm" variant="ghost" onClick={() => void changeHandStatus(item, 'archived')}>Archive</Button> : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <ProEmpty title="No hands in this view" description="Capture a key hand or import hand-history text for private review." action={<Button onClick={() => openForm('hands')}>Capture hand</Button>} />
            )}
          </CardContent>
        </Card>
      ) : null}

      {resource.data && tab === 'sessions' ? (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0"><CardTitle>Study log</CardTitle><BookOpenCheck className="h-5 w-5 text-gold" /></CardHeader>
          <CardContent>
            {resource.data.studySessions.length ? (
              <div className="divide-y divide-border">
                {resource.data.studySessions.map((item) => (
                  <article className="grid gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[1fr_auto]" key={item.id}>
                    <div><h2 className="font-semibold text-ink">{item.topic}</h2><p className="text-xs text-muted">{formatDateTime(item.studied_at)}{item.resource ? ` · ${item.resource}` : ''}</p>{item.notes ? <p className="mt-1 text-sm text-muted">{item.notes}</p> : null}</div>
                    <p className="font-semibold tabular-nums text-ink">{item.duration_minutes} min</p>
                  </article>
                ))}
              </div>
            ) : <ProEmpty title="No study logged" description="Track structured review, coaching, solver work, or reading." action={<Button onClick={() => openForm('sessions')}>Log study</Button>} />}
          </CardContent>
        </Card>
      ) : null}

      {resource.data && tab === 'goals' ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {resource.data.goals.map((item) => {
            const current = Number(goalValues[item.id] ?? item.current_value ?? 0)
            const target = Number(item.target_value ?? 0)
            const progress = target > 0 ? Math.min(100, Math.max(0, (current / target) * 100)) : 0
            return (
              <Card key={item.id}>
                <div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold text-ink">{item.title}</h2><p className="text-xs text-muted">{item.metric || 'Career goal'} · {item.due_on ? `Due ${formatDate(item.due_on)}` : 'Ongoing'}</p></div><Badge variant={item.status === 'completed' ? 'green' : item.status === 'active' ? 'gold' : 'default'}>{item.status}</Badge></div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-cream"><div className="h-full rounded-full bg-poker-green" style={{ width: `${progress}%` }} /></div>
                <div className="mt-3 flex items-end gap-2">
                  <div className="min-w-0 flex-1"><Field label={`Progress${item.target_value ? ` / ${item.target_value}` : ''}`}><FormInput type="number" step="any" value={goalValues[item.id] ?? item.current_value ?? ''} onChange={(event) => setGoalValues((values) => ({ ...values, [item.id]: event.target.value }))} /></Field></div>
                  <Button size="sm" variant="secondary" onClick={() => void updateGoalProgress(item)}>Update</Button>
                  {item.status === 'active' ? <Button size="sm" className="gap-1" onClick={() => void updateGoalProgress(item, 'completed')}><Flag className="h-3.5 w-3.5" />Done</Button> : null}
                </div>
              </Card>
            )
          })}
          {resource.data.goals.length === 0 ? (
            <div className="lg:col-span-2"><ProEmpty title="No career goals" description="Set volume, study, financial, or performance targets." action={<Button onClick={() => openForm('goals')}><Target className="mr-2 h-4 w-4" />Set goal</Button>} /></div>
          ) : null}
        </div>
      ) : null}
    </ProPage>
  )
}
