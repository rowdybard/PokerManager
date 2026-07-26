import { useMemo, useState, type FormEvent } from 'react'
import { Calculator, Handshake, Plus, Scale, X } from 'lucide-react'
import { Link } from 'react-router'
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
  createStakingAllocation,
  createStakingDeal,
  decimalToMinor,
  formatDate,
  formatMinor,
  listCareerSessions,
  listStakingAllocations,
  listStakingDeals,
  minorToDecimal,
  todayInputValue,
  type StakingDeal,
} from '../../lib/pro'

function loadStaking(ownerId: string) {
  return Promise.all([
    listStakingDeals(ownerId),
    listStakingAllocations(ownerId),
    listCareerSessions(ownerId),
  ]).then(([deals, allocations, sessions]) => ({ deals, allocations, sessions }))
}

export function StakingPage() {
  const ownerId = useAuthStore((state) => state.user?.id)
  const resource = useProResource(['pro', 'staking', ownerId], () => {
    if (!ownerId) throw new Error('Sign in to view staking.')
    return loadStaking(ownerId)
  })
  const [panel, setPanel] = useState<'deal' | 'allocation' | null>(null)
  const [feedback, setFeedback] = useState<{ error?: string; success?: string }>({})
  const [submitting, setSubmitting] = useState(false)
  const [deal, setDeal] = useState({
    name: '',
    backer: '',
    playerShare: '50',
    markup: '1.00',
    makeup: '0',
    currency: 'USD',
    startsOn: todayInputValue(),
    endsOn: '',
    status: 'active' as StakingDeal['status'],
    notes: '',
  })
  const [allocation, setAllocation] = useState({
    dealId: '',
    sessionId: '',
    allocatedBuyIn: '',
    totalResult: '',
    notes: '',
  })

  const selectedDeal = resource.data?.deals.find((item) => item.id === allocation.dealId)
  const selectedSession = resource.data?.sessions.find((item) => item.id === allocation.sessionId)
  const splitPreview = useMemo(() => {
    if (!selectedDeal || !allocation.totalResult) return null
    try {
      const result = BigInt(decimalToMinor(allocation.totalResult, selectedDeal.currency))
      const makeupBefore = BigInt(selectedDeal.makeup_minor)
      if (result <= 0n) {
        return {
          backer: result.toString(),
          player: '0',
          makeupBefore: makeupBefore.toString(),
          makeupAfter: (makeupBefore - result).toString(),
        }
      }
      const recoveredMakeup = result < makeupBefore ? result : makeupBefore
      const distributable = result - recoveredMakeup
      const backerShare =
        (distributable * BigInt(selectedDeal.backer_share_bps)) / 10_000n
      const backer = recoveredMakeup + backerShare
      return {
        backer: backer.toString(),
        player: (distributable - backerShare).toString(),
        makeupBefore: makeupBefore.toString(),
        makeupAfter: (makeupBefore - recoveredMakeup).toString(),
      }
    } catch {
      return null
    }
  }, [allocation.totalResult, selectedDeal])

  const saveDeal = async (event: FormEvent) => {
    event.preventDefault()
    if (!ownerId) return
    setSubmitting(true)
    setFeedback({})
    try {
      const playerShare = Math.round(Number(deal.playerShare) * 100)
      const markup = Math.round(Number(deal.markup) * 10_000)
      if (!Number.isInteger(playerShare) || playerShare < 0 || playerShare > 10_000) {
        throw new Error('Player share must be between 0% and 100%.')
      }
      await createStakingDeal(ownerId, {
        name: deal.name.trim(),
        backer_name: deal.backer.trim(),
        player_share_bps: playerShare,
        backer_share_bps: 10_000 - playerShare,
        markup_bps: markup,
        makeup_minor: decimalToMinor(deal.makeup || '0', deal.currency),
        currency: deal.currency,
        starts_on: deal.startsOn,
        ends_on: deal.endsOn || null,
        status: deal.status,
        notes: deal.notes.trim() || null,
      })
      setDeal({
        name: '',
        backer: '',
        playerShare: '50',
        markup: '1.00',
        makeup: '0',
        currency: 'USD',
        startsOn: todayInputValue(),
        endsOn: '',
        status: 'active',
        notes: '',
      })
      setPanel(null)
      setFeedback({ success: 'Staking deal created.' })
      await resource.reload()
    } catch (error) {
      setFeedback({ error: error instanceof Error ? error.message : 'Could not create staking deal.' })
    } finally {
      setSubmitting(false)
    }
  }

  const saveAllocation = async (event: FormEvent) => {
    event.preventDefault()
    if (!ownerId || !selectedDeal || !selectedSession || !splitPreview) {
      setFeedback({ error: 'Choose a deal and session, then enter the event result.' })
      return
    }
    if (selectedSession.currency !== selectedDeal.currency) {
      setFeedback({ error: 'The deal and session currencies must match.' })
      return
    }
    setSubmitting(true)
    setFeedback({})
    try {
      await createStakingAllocation(ownerId, {
        deal_id: selectedDeal.id,
        session_id: selectedSession.id,
        allocated_buy_in_minor: decimalToMinor(
          allocation.allocatedBuyIn || minorToDecimal(selectedSession.buy_in_minor, selectedSession.currency),
          selectedDeal.currency,
        ),
        backer_result_minor: splitPreview.backer,
        player_result_minor: splitPreview.player,
        settled_at: null,
        notes: [
          allocation.notes.trim(),
          `Makeup waterfall: ${splitPreview.makeupBefore} -> ${splitPreview.makeupAfter} minor units.`,
        ].filter(Boolean).join(' · '),
      })
      setAllocation({ dealId: selectedDeal.id, sessionId: '', allocatedBuyIn: '', totalResult: '', notes: '' })
      setPanel(null)
      setFeedback({ success: 'Session allocation and split recorded.' })
      await resource.reload()
    } catch (error) {
      setFeedback({ error: error instanceof Error ? error.message : 'Could not allocate session.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ProPage
      title="Staking"
      description="Document backer terms, makeup, event allocations, and calculated profit splits."
      actions={
        <>
          <Button
            size="sm"
            className="gap-2 bg-white text-poker-green hover:bg-cream"
            disabled={(resource.data?.deals.length ?? 0) === 0 || (resource.data?.sessions.length ?? 0) === 0}
            onClick={() => setPanel(panel === 'allocation' ? null : 'allocation')}
          >
            <Calculator className="h-4 w-4" aria-hidden="true" />
            Allocate session
          </Button>
          <Button
            size="sm"
            className="gap-2 bg-white text-poker-green hover:bg-cream"
            onClick={() => setPanel(panel === 'deal' ? null : 'deal')}
          >
            {panel === 'deal' ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            Deal
          </Button>
        </>
      }
    >
      <FormFeedback {...feedback} />
      {panel === 'deal' ? (
        <Card>
          <CardHeader><CardTitle>New staking deal</CardTitle></CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={saveDeal}>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Deal name" required>
                  <FormInput required value={deal.name} onChange={(event) => setDeal((value) => ({ ...value, name: event.target.value }))} />
                </Field>
                <Field label="Backer" required>
                  <FormInput required value={deal.backer} onChange={(event) => setDeal((value) => ({ ...value, backer: event.target.value }))} />
                </Field>
                <Field label="Player share %" required>
                  <FormInput required type="number" min="0" max="100" step="0.01" value={deal.playerShare} onChange={(event) => setDeal((value) => ({ ...value, playerShare: event.target.value }))} />
                </Field>
                <Field label="Markup" hint="1.00 = no markup" required>
                  <FormInput required type="number" min="0" step="0.01" value={deal.markup} onChange={(event) => setDeal((value) => ({ ...value, markup: event.target.value }))} />
                </Field>
                <Field label="Currency" required>
                  <FormInput required minLength={3} maxLength={3} value={deal.currency} onChange={(event) => setDeal((value) => ({ ...value, currency: event.target.value.toUpperCase() }))} />
                </Field>
                <MoneyField label="Opening makeup" currency={deal.currency} value={deal.makeup} onChange={(makeup) => setDeal((value) => ({ ...value, makeup }))} />
                <Field label="Starts" required>
                  <FormInput required type="date" value={deal.startsOn} onChange={(event) => setDeal((value) => ({ ...value, startsOn: event.target.value }))} />
                </Field>
                <Field label="Ends">
                  <FormInput type="date" min={deal.startsOn} value={deal.endsOn} onChange={(event) => setDeal((value) => ({ ...value, endsOn: event.target.value }))} />
                </Field>
                <Field label="Status">
                  <FormSelect value={deal.status} onChange={(event) => setDeal((value) => ({ ...value, status: event.target.value as StakingDeal['status'] }))}>
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </FormSelect>
                </Field>
                <div className="sm:col-span-2 lg:col-span-3">
                  <Field label="Private terms / notes">
                    <FormTextarea value={deal.notes} onChange={(event) => setDeal((value) => ({ ...value, notes: event.target.value }))} />
                  </Field>
                </div>
              </div>
              <div className="flex justify-end"><Button type="submit" disabled={submitting}>{submitting ? 'Creating…' : 'Create deal'}</Button></div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {panel === 'allocation' ? (
        <Card>
          <CardHeader>
            <CardTitle>Allocate session</CardTitle>
            <p className="text-sm text-muted">The split is recorded for reconciliation; it does not initiate a payout.</p>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={saveAllocation}>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Deal" required>
                  <FormSelect required value={allocation.dealId} onChange={(event) => setAllocation((value) => ({ ...value, dealId: event.target.value }))}>
                    <option value="">Choose deal</option>
                    {(resource.data?.deals ?? []).filter((item) => item.status === 'active').map((item) => <option key={item.id} value={item.id}>{item.name} · {item.currency}</option>)}
                  </FormSelect>
                </Field>
                <Field label="Session" required>
                  <FormSelect required value={allocation.sessionId} onChange={(event) => setAllocation((value) => ({ ...value, sessionId: event.target.value }))}>
                    <option value="">Choose session</option>
                    {(resource.data?.sessions ?? []).filter((item) => !selectedDeal || item.currency === selectedDeal.currency).map((item) => (
                      <option key={item.id} value={item.id}>{formatDate(item.played_at)} · {item.venue || item.game_variant} · {formatMinor(item.profit_minor, item.currency)}</option>
                    ))}
                  </FormSelect>
                </Field>
                <MoneyField label="Allocated buy-in" required currency={selectedDeal?.currency ?? 'USD'} value={allocation.allocatedBuyIn} onChange={(allocatedBuyIn) => setAllocation((value) => ({ ...value, allocatedBuyIn }))} />
                <MoneyField label="Net result to split" required allowNegative currency={selectedDeal?.currency ?? 'USD'} value={allocation.totalResult} onChange={(totalResult) => setAllocation((value) => ({ ...value, totalResult }))} />
              </div>
              {splitPreview && selectedDeal ? (
                <div className="grid gap-3 rounded-xl bg-cream p-4 sm:grid-cols-2" role="status">
                  <p><span className="block text-xs text-muted">Backer result ({selectedDeal.backer_share_bps / 100}%)</span><strong>{formatMinor(splitPreview.backer, selectedDeal.currency)}</strong></p>
                  <p><span className="block text-xs text-muted">Player result ({selectedDeal.player_share_bps / 100}%)</span><strong>{formatMinor(splitPreview.player, selectedDeal.currency)}</strong></p>
                  <p className="sm:col-span-2"><span className="block text-xs text-muted">Projected makeup after this allocation</span><strong>{formatMinor(splitPreview.makeupAfter, selectedDeal.currency)}</strong></p>
                </div>
              ) : null}
              <Field label="Allocation notes">
                <FormTextarea value={allocation.notes} onChange={(event) => setAllocation((value) => ({ ...value, notes: event.target.value }))} />
              </Field>
              <div className="flex justify-end"><Button type="submit" disabled={submitting}>{submitting ? 'Saving…' : 'Record allocation'}</Button></div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {resource.loading ? <ProLoading label="Loading staking records…" /> : null}
      {resource.error ? <ProError error={resource.error} retry={resource.reload} /> : null}
      {resource.data ? (
        <section className="grid gap-4 lg:grid-cols-[1fr_1.25fr]">
          <Card>
            <CardHeader><CardTitle>Deals</CardTitle></CardHeader>
            <CardContent>
              {resource.data.deals.length ? (
                <div className="space-y-3">
                  {resource.data.deals.map((item) => (
                    <article className="rounded-xl border border-border p-4" key={item.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h2 className="font-semibold text-ink">{item.name}</h2>
                          <p className="text-sm text-muted">{item.backer_name}</p>
                        </div>
                        <Badge variant={item.status === 'active' ? 'green' : 'default'}>{item.status}</Badge>
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                        <p><span className="block text-xs text-muted">Player</span><strong>{item.player_share_bps / 100}%</strong></p>
                        <p><span className="block text-xs text-muted">Backer</span><strong>{item.backer_share_bps / 100}%</strong></p>
                        <p><span className="block text-xs text-muted">Markup</span><strong>{(item.markup_bps / 10_000).toFixed(2)}x</strong></p>
                      </div>
                      <p className="mt-3 text-sm">Makeup <strong>{formatMinor(item.makeup_minor, item.currency)}</strong></p>
                    </article>
                  ))}
                </div>
              ) : (
                <ProEmpty title="No staking deals" description="Create a deal to document backer shares and makeup." action={<Button onClick={() => setPanel('deal')}>Create deal</Button>} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Event allocations</CardTitle>
                <p className="text-sm text-muted">Calculated results by session</p>
              </div>
              <Link className="inline-flex items-center gap-1 text-sm font-semibold text-poker-green" to="/pro/settlements">
                <Scale className="h-4 w-4" aria-hidden="true" />
                Settlement records
              </Link>
            </CardHeader>
            <CardContent>
              {resource.data.allocations.length ? (
                <div className="divide-y divide-border">
                  {resource.data.allocations.map((item) => {
                    const itemDeal = resource.data!.deals.find((dealItem) => dealItem.id === item.deal_id)
                    const session = resource.data!.sessions.find((sessionItem) => sessionItem.id === item.session_id)
                    return (
                      <article className="py-3 first:pt-0 last:pb-0" key={item.id}>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="font-semibold text-ink">{itemDeal?.name ?? 'Staking deal'}</h2>
                              {item.settled_at ? <Badge variant="green">Settled</Badge> : <Badge variant="gold">Open</Badge>}
                            </div>
                            <p className="text-xs text-muted">{session ? `${formatDate(session.played_at)} · ${session.venue || session.game_variant}` : 'Session'}</p>
                          </div>
                          <p className="text-sm tabular-nums text-muted">Allocated {formatMinor(item.allocated_buy_in_minor, itemDeal?.currency ?? 'USD')}</p>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                          <p>Backer <strong>{formatMinor(item.backer_result_minor, itemDeal?.currency ?? 'USD')}</strong></p>
                          <p>Player <strong>{formatMinor(item.player_result_minor, itemDeal?.currency ?? 'USD')}</strong></p>
                        </div>
                      </article>
                    )
                  })}
                </div>
              ) : (
                <ProEmpty title="No allocations" description="Allocate a recorded career session to an active deal." action={resource.data.deals.length && resource.data.sessions.length ? <Button onClick={() => setPanel('allocation')}>Allocate session</Button> : undefined} />
              )}
            </CardContent>
          </Card>
        </section>
      ) : null}

      <div className="flex items-start gap-2 rounded-xl border border-border bg-cream p-4 text-xs text-muted">
        <Handshake className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
        Staking records support accounting and reconciliation only. Poker Manager never collects, routes, or pays backer funds.
      </div>
    </ProPage>
  )
}
