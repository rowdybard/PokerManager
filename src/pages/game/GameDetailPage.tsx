import { useCallback, useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'
import { z } from 'zod'
import {
  ArrowLeft,
  Check,
  Clipboard,
  Clock3,
  CloudOff,
  Link2,
  ListChecks,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Save,
  Shuffle,
  Spade,
  Trash2,
  UserRoundCheck,
  Users,
  WalletCards,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Badge } from '../../components/ui/Badge'
import { formatDateTime, getInitials } from '../../lib/utils'
import { formatMoney, money } from '../../lib/money'
import {
  addPlayersToGame,
  amountToMinorUnits,
  assignSeat,
  createIdempotencyKey,
  deleteGameResult,
  errorMessage,
  finalizeGame,
  gameDisplayName,
  gamePhaseLabel,
  inviteUrl,
  issueSecureInvite,
  linkFinalizedGameToCareer,
  loadGameWorkspace,
  recordGameTransaction,
  recordTournamentFinish,
  saveClockState,
  saveGameResult,
  setParticipantCheckIn,
  summarizeCloseout,
  transitionGamePhase,
  updateRsvp,
  type GamePhase,
  type GameTransactionKind,
  type GameWorkspace,
  type HomeParticipant,
  type HomeRsvpStatus,
  type TournamentClockState,
} from '../../lib/homeGames'
import {
  cacheActiveEvent,
  enqueueOfflineAction,
  flushOfflineActions,
  getCachedActiveEvent,
  listOfflineActions,
  type OfflineAction,
} from '../../lib/offlineQueue'
import { useRealtimeSubscription } from '../../hooks/useRealtimeSubscription'

type WorkspaceTab = 'roster' | 'money' | 'seating' | 'clock' | 'results' | 'closeout'

const amountSchema = z.object({
  kind: z.string().min(1),
  participantId: z.string().optional(),
  amount: z.string().min(1, 'Enter an amount.'),
  note: z.string().max(240).optional(),
})

export function GameDetailPage() {
  const { leagueId = '', gameId = '' } = useParams<{ leagueId: string; gameId: string }>()
  const user = useAuthStore((state) => state.user)
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<WorkspaceTab>('roster')
  const [notice, setNotice] = useState<string | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [queuedCount, setQueuedCount] = useState(0)
  const queryKey = ['home', 'game', gameId, user?.id]
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      try {
        const loaded = await loadGameWorkspace(user!.id, leagueId, gameId)
        await cacheActiveEvent(gameId, loaded)
        return loaded
      } catch (loadError) {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          const cached = await getCachedActiveEvent<GameWorkspace>()
          if (cached?.gameId === gameId) return cached.data
        }
        throw loadError
      }
    },
    enabled: Boolean(user && leagueId && gameId),
  })

  const refresh = useCallback(
    () => queryClient.invalidateQueries({
      queryKey: ['home', 'game', gameId, user?.id],
    }),
    [gameId, queryClient, user?.id],
  )
  useRealtimeSubscription('game_participants', gameId ? `game_id=eq.${gameId}` : undefined, () => {
    void refresh()
  })
  useRealtimeSubscription('game_transactions', gameId ? `game_id=eq.${gameId}` : undefined, () => {
    void refresh()
  })
  useRealtimeSubscription('game_results', gameId ? `game_id=eq.${gameId}` : undefined, () => {
    void refresh()
  })

  useEffect(() => {
    const updateQueueCount = () => {
      void listOfflineActions().then((actions) => {
        setQueuedCount(actions.filter((action) => action.payload.gameId === gameId).length)
      })
    }
    updateQueueCount()
    const handleOnline = () => {
      updateQueueCount()
      if (!query.data) return
      void flushOfflineActions(processQueuedAction)
        .then(async (result) => {
          const remaining = await listOfflineActions()
          setQueuedCount(remaining.filter((action) => action.payload.gameId === gameId).length)
          if (result.processed > 0) {
            setNotice(`${result.processed} queued action${result.processed === 1 ? '' : 's'} synced.`)
            await refresh()
          }
        })
        .catch((syncError) => setFailure(errorMessage(syncError)))
    }
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [gameId, query.data, refresh])

  useEffect(() => {
    if (query.data) void cacheActiveEvent(gameId, query.data)
  }, [gameId, query.data])

  const runMutation = useMutation({
    mutationFn: async (task: () => Promise<unknown>) => task(),
    onSuccess: async () => {
      setFailure(null)
      await refresh()
    },
    onError: (mutationError) => setFailure(errorMessage(mutationError)),
  })

  if (query.isPending) return <div className="py-12 text-center text-muted">Loading game workspace…</div>
  if (query.isError || !query.data) {
    return (
      <Card className="border-danger/30 bg-danger/5 text-center text-danger" role="alert">
        This game could not be loaded. Check your league access and try again.
      </Card>
    )
  }

  const workspace = query.data
  const { game, league, access } = workspace
  const readOnly = !access.canManage || game.phase === 'finalized' || game.phase === 'cancelled'
  const closeout = summarizeCloseout(workspace.transactions)
  const signedInPlayer = workspace.players.find((player) => player.user_id === user?.id)
  const hasSignedInResult = Boolean(
    signedInPlayer && workspace.results.some((result) => result.player_id === signedInPlayer.id),
  )
  const tabs: { key: WorkspaceTab; label: string; icon: typeof Users; hidden?: boolean }[] = [
    { key: 'roster', label: 'Roster', icon: Users },
    { key: 'money', label: 'Money', icon: WalletCards },
    { key: 'seating', label: 'Seating', icon: Shuffle },
    { key: 'clock', label: 'Clock', icon: Clock3, hidden: game.kind !== 'tournament' },
    { key: 'results', label: 'Results', icon: ListChecks },
    { key: 'closeout', label: 'Closeout', icon: Check },
  ]

  async function createShareLink() {
    setFailure(null)
    try {
      const invite = await issueSecureInvite(game.id)
      const url = inviteUrl(invite.token)
      setShareUrl(url)
      if (navigator.clipboard) await navigator.clipboard.writeText(url)
      setNotice('Secure guest link copied. Creating another link revokes this one.')
    } catch (shareError) {
      setFailure(errorMessage(shareError))
    }
  }

  async function processOfflineAction(action: OfflineAction) {
    await processQueuedAction(action)
  }

  async function replayOfflineQueue() {
    setFailure(null)
    try {
      const result = await flushOfflineActions(processOfflineAction)
      const remaining = await listOfflineActions()
      setQueuedCount(remaining.filter((action) => action.payload.gameId === gameId).length)
      setNotice(`${result.processed} queued action${result.processed === 1 ? '' : 's'} synced.`)
      await refresh()
    } catch (syncError) {
      setFailure(errorMessage(syncError))
    }
  }

  return (
    <div className="space-y-5">
      <Link to={`/leagues/${leagueId}`} className="flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" />
        Back to {league.name}
      </Link>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">
                {game.kind} game
              </span>
              <Badge variant={game.phase === 'finalized' ? 'green' : game.phase === 'cancelled' ? 'red' : 'gold'}>
                {gamePhaseLabel(game.phase)}
              </Badge>
              {!access.canManage && <Badge>Read only</Badge>}
            </div>
            <h1 className="mt-1 text-2xl font-bold text-ink">{gameDisplayName(game, league.name)}</h1>
            <p className="mt-1 text-sm text-muted">{formatDateTime(game.scheduled_date)}</p>
            {game.location && <p className="mt-1 text-sm text-muted">{game.location}</p>}
          </div>
          {access.canManage && game.phase !== 'finalized' && game.phase !== 'cancelled' && (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => void createShareLink()}>
                <Link2 className="mr-1 h-4 w-4" />
                Share invite
              </Button>
              <Select
                aria-label="Game phase"
                className="h-9 w-auto min-w-36 py-1 text-sm"
                value={game.phase}
                disabled={runMutation.isPending}
                onChange={(event) => {
                  const phase = event.target.value as GamePhase
                  runMutation.mutate(() => transitionGamePhase(game, phase))
                }}
              >
                <option value="draft">Draft</option>
                <option value="inviting">Inviting</option>
                <option value="registration">Registration</option>
                <option value="in_progress">In progress</option>
                <option value="closing">Closing</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            </div>
          )}
          {access.isOwner && game.phase === 'finalized' && hasSignedInResult && (
            <Button
              variant="secondary"
              size="sm"
              disabled={runMutation.isPending}
              onClick={() => runMutation.mutate(async () => {
                const outcome = await linkFinalizedGameToCareer({
                  ownerId: user!.id,
                  workspace,
                })
                setNotice(
                  outcome === 'created'
                    ? 'Linked to your private My Poker timeline.'
                    : 'This game is already linked to your private My Poker timeline.',
                )
              })}
            >
              <UserRoundCheck className="mr-1 h-4 w-4" />
              Link to My Poker
            </Button>
          )}
        </div>
        <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
          <Info label="Capacity" value={game.capacity ? String(game.capacity) : 'Open'} />
          <Info
            label={game.kind === 'cash' ? 'Buy-in' : 'Entry'}
            value={formatMoney(money(String(Math.round(Number(game.buy_in) * 100)), game.currency))}
          />
          <Info label="Checked in" value={String(workspace.participants.filter((participant) => participant.checked_in_at).length)} />
        </div>
      </Card>

      {(notice || failure || shareUrl || queuedCount > 0) && (
        <div className="space-y-2" aria-live="polite">
          {failure && <Card className="border-danger/30 bg-danger/5 py-3 text-sm text-danger">{failure}</Card>}
          {notice && <Card className="border-success/30 bg-success/5 py-3 text-sm text-success">{notice}</Card>}
          {shareUrl && (
            <Card className="flex flex-wrap items-center gap-2 py-3">
              <Input readOnly value={shareUrl} className="h-9 min-w-0 flex-1 text-sm" aria-label="Guest invitation link" />
              <Button
                size="sm"
                variant="secondary"
                onClick={() => void navigator.clipboard?.writeText(shareUrl)}
              >
                <Clipboard className="mr-1 h-4 w-4" /> Copy
              </Button>
            </Card>
          )}
          {queuedCount > 0 && (
            <Card className="flex flex-wrap items-center justify-between gap-2 border-gold/30 bg-gold/5 py-3">
              <span className="flex items-center gap-2 text-sm text-ink">
                <CloudOff className="h-4 w-4 text-gold" />
                {queuedCount} game action{queuedCount === 1 ? '' : 's'} waiting to sync
              </span>
              <Button size="sm" variant="secondary" onClick={() => void replayOfflineQueue()}>
                <RefreshCw className="mr-1 h-4 w-4" /> Sync now
              </Button>
            </Card>
          )}
        </div>
      )}

      <div className="flex gap-1 overflow-x-auto border-b border-border" role="tablist" aria-label="Game workspace">
        {tabs.filter((item) => !item.hidden).map((item) => (
          <button
            key={item.key}
            role="tab"
            aria-selected={tab === item.key}
            onClick={() => setTab(item.key)}
            className={`flex min-h-11 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-semibold ${
              tab === item.key ? 'border-gold text-ink' : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'roster' && (
        <RosterPanel
          workspace={workspace}
          readOnly={readOnly}
          onRefresh={refresh}
          onFailure={setFailure}
          onQueued={() => setQueuedCount((count) => count + 1)}
        />
      )}
      {tab === 'money' && (
        <MoneyPanel
          workspace={workspace}
          readOnly={readOnly}
          onRefresh={refresh}
          onFailure={setFailure}
          onQueued={() => setQueuedCount((count) => count + 1)}
        />
      )}
      {tab === 'seating' && (
        <SeatingPanel workspace={workspace} readOnly={readOnly} onRefresh={refresh} onFailure={setFailure} />
      )}
      {tab === 'clock' && game.kind === 'tournament' && (
        <ClockPanel
          key={`${game.id}:${workspace.clock?.updated_at ?? 'new'}`}
          gameId={game.id}
          levels={workspace.blindLevels}
          persisted={workspace.clock}
          readOnly={readOnly}
          onFailure={setFailure}
        />
      )}
      {tab === 'results' && (
        <ResultsPanel workspace={workspace} readOnly={readOnly} onRefresh={refresh} onFailure={setFailure} />
      )}
      {tab === 'closeout' && (
        <CloseoutPanel
          workspace={workspace}
          closeout={closeout}
          readOnly={!access.canManage || game.phase === 'cancelled'}
          onFinalized={refresh}
          onFailure={setFailure}
        />
      )}
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-cream px-3 py-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="font-semibold text-ink">{value}</p>
    </div>
  )
}

function RosterPanel({
  workspace,
  readOnly,
  onRefresh,
  onFailure,
  onQueued,
}: {
  workspace: GameWorkspace
  readOnly: boolean
  onRefresh: () => Promise<unknown>
  onFailure: (message: string | null) => void
  onQueued: () => void
}) {
  const [playerId, setPlayerId] = useState('')
  const invitedPlayerIds = new Set(workspace.participants.map((participant) => participant.player_id))
  const availablePlayers = workspace.players.filter((player) => !invitedPlayerIds.has(player.id))
  const statusOrder: HomeRsvpStatus[] = ['yes', 'maybe', 'pending', 'waitlisted', 'no']
  const sorted = [...workspace.participants].sort(
    (left, right) =>
      statusOrder.indexOf(left.rsvp_status) - statusOrder.indexOf(right.rsvp_status) ||
      left.display_name.localeCompare(right.display_name),
  )

  async function changeCheckIn(participant: HomeParticipant) {
    const checkedIn = !participant.checked_in_at
    const idempotencyKey = createIdempotencyKey('check-in')
    onFailure(null)
    if (!navigator.onLine) {
      await enqueueOfflineAction(
        'check_in',
        { gameId: workspace.game.id, participantId: participant.id, checkedIn },
        idempotencyKey,
      )
      onQueued()
      return
    }
    try {
      await setParticipantCheckIn(participant, checkedIn, idempotencyKey)
      await onRefresh()
    } catch (checkInError) {
      onFailure(errorMessage(checkInError))
    }
  }

  async function addPlayer() {
    if (!playerId) return
    onFailure(null)
    try {
      await addPlayersToGame(workspace.game.id, [playerId])
      setPlayerId('')
      await onRefresh()
    } catch (addError) {
      onFailure(errorMessage(addError))
    }
  }

  const counts = statusOrder.map((status) => ({
    status,
    count: workspace.participants.filter((participant) => participant.rsvp_status === status).length,
  }))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {counts.map(({ status, count }) => (
          <Info key={status} label={status} value={String(count)} />
        ))}
      </div>
      {!readOnly && availablePlayers.length > 0 && (
        <Card className="flex flex-wrap items-end gap-2">
          <label className="min-w-52 flex-1 text-sm font-medium text-muted">
            Add league player
            <Select className="mt-1" value={playerId} onChange={(event) => setPlayerId(event.target.value)}>
              <option value="">Choose player…</option>
              {availablePlayers.map((player) => <option key={player.id} value={player.id}>{player.display_name}</option>)}
            </Select>
          </label>
          <Button onClick={() => void addPlayer()} disabled={!playerId}>
            <Plus className="mr-1 h-4 w-4" /> Add
          </Button>
        </Card>
      )}
      {sorted.length === 0 ? (
        <Card><p className="py-6 text-center text-sm text-muted">No invitees yet. Add players or share the secure guest link.</p></Card>
      ) : (
        <div className="grid gap-2 lg:grid-cols-2">
          {sorted.map((participant) => {
            const invite = workspace.invites.find(
              (entry) => entry.id === participant.id || entry.player_id === participant.player_id,
            )
            return (
              <Card key={participant.id} className="flex items-center gap-3 py-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-poker-green text-sm font-semibold text-white">
                  {getInitials(participant.display_name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{participant.display_name}</p>
                  <p className="text-xs text-muted">
                    {participant.guest_count > 0 ? `+${participant.guest_count} guest${participant.guest_count === 1 ? '' : 's'} · ` : ''}
                    {participant.checked_in_at ? 'Checked in' : 'Not checked in'}
                  </p>
                </div>
                {!readOnly && invite ? (
                  <Select
                    aria-label={`RSVP for ${participant.display_name}`}
                    className="h-9 w-28 py-1 text-sm capitalize"
                    value={participant.rsvp_status}
                    onChange={async (event) => {
                      try {
                        await updateRsvp(invite.id, event.target.value as HomeRsvpStatus)
                        await onRefresh()
                      } catch (rsvpError) {
                        onFailure(errorMessage(rsvpError))
                      }
                    }}
                  >
                    <option value="pending">Pending</option>
                    <option value="yes">Yes</option>
                    <option value="maybe">Maybe</option>
                    <option value="no">No</option>
                    <option value="waitlisted">Waitlist</option>
                  </Select>
                ) : (
                  <Badge variant={participant.rsvp_status === 'yes' ? 'green' : participant.rsvp_status === 'no' ? 'red' : 'gold'}>
                    {participant.rsvp_status}
                  </Badge>
                )}
                {!readOnly && participant.rsvp_status !== 'no' && participant.rsvp_status !== 'waitlisted' && (
                  <Button
                    size="sm"
                    variant={participant.checked_in_at ? 'secondary' : 'primary'}
                    onClick={() => void changeCheckIn(participant)}
                  >
                    {participant.checked_in_at ? 'Undo' : 'Check in'}
                  </Button>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function MoneyPanel({
  workspace,
  readOnly,
  onRefresh,
  onFailure,
  onQueued,
}: {
  workspace: GameWorkspace
  readOnly: boolean
  onRefresh: () => Promise<unknown>
  onFailure: (message: string | null) => void
  onQueued: () => void
}) {
  const [kind, setKind] = useState<GameTransactionKind>(
    workspace.game.kind === 'cash' ? 'buy_in' : 'entry',
  )
  const [participantId, setParticipantId] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const closeout = summarizeCloseout(workspace.transactions)
  const participantById = new Map(workspace.participants.map((participant) => [participant.id, participant]))
  const choices: { value: GameTransactionKind; label: string }[] =
    workspace.game.kind === 'cash'
      ? [
          { value: 'buy_in', label: 'Buy-in' },
          { value: 'reload', label: 'Reload' },
          { value: 'cash_out', label: 'Cash-out' },
          { value: 'tip', label: 'Tip' },
          { value: 'fee', label: 'Fee' },
          { value: 'adjustment', label: 'Adjustment' },
        ]
      : [
          { value: 'entry', label: 'Entry' },
          { value: 're_entry', label: 'Re-entry' },
          { value: 'add_on', label: 'Add-on' },
          { value: 'payout', label: 'Payout' },
          { value: 'bounty', label: 'Bounty' },
          { value: 'fee', label: 'Fee / rake' },
          { value: 'adjustment', label: 'Adjustment' },
        ]

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const parsed = amountSchema.safeParse({ kind, participantId, amount, note })
    if (!parsed.success) {
      onFailure(parsed.error.issues[0]?.message ?? 'Check the transaction.')
      return
    }
    let amountMinor: string
    try {
      amountMinor = amountToMinorUnits(parsed.data.amount)
    } catch (amountError) {
      onFailure(errorMessage(amountError))
      return
    }
    const participant = workspace.participants.find((entry) => entry.id === participantId)
    const idempotencyKey = createIdempotencyKey('game-transaction')
    const payload = {
      gameId: workspace.game.id,
      participantId: participant?.id ?? null,
      playerId: participant?.player_id || null,
      kind,
      amountMinor,
      currency: workspace.game.currency,
      note,
    }
    onFailure(null)
    if (!navigator.onLine) {
      await enqueueOfflineAction('game_transaction', payload, idempotencyKey)
      onQueued()
      setAmount('')
      setNote('')
      return
    }
    setSaving(true)
    try {
      await recordGameTransaction({ ...payload, idempotencyKey })
      setAmount('')
      setNote('')
      await onRefresh()
    } catch (transactionError) {
      onFailure(errorMessage(transactionError))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-3">
        <Info label="Collected" value={formatMoney(money(String(closeout.inflowMinor), workspace.game.currency))} />
        <Info label="Paid out" value={formatMoney(money(String(closeout.outflowMinor), workspace.game.currency))} />
        <Info label="Variance" value={formatMoney(money(String(closeout.varianceMinor), workspace.game.currency))} />
      </div>
      {!readOnly && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Record money movement</CardTitle>
            <p className="text-sm text-muted">Records only. Poker Manager never collects or transfers funds.</p>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3 sm:grid-cols-2" onSubmit={submit}>
              <label className="text-sm font-medium text-muted">
                Type
                <Select className="mt-1" value={kind} onChange={(event) => setKind(event.target.value as GameTransactionKind)}>
                  {choices.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
                </Select>
              </label>
              <label className="text-sm font-medium text-muted">
                Player
                <Select className="mt-1" value={participantId} onChange={(event) => setParticipantId(event.target.value)}>
                  <option value="">House / unassigned</option>
                  {workspace.participants.map((participant) => (
                    <option key={participant.id} value={participant.id}>{participant.display_name}</option>
                  ))}
                </Select>
              </label>
              <label className="text-sm font-medium text-muted">
                Amount ({workspace.game.currency})
                <Input className="mt-1" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="100.00" />
              </label>
              <label className="text-sm font-medium text-muted">
                Note
                <Input className="mt-1" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional detail" />
              </label>
              <Button type="submit" disabled={saving} className="sm:col-span-2">
                <Save className="mr-1 h-4 w-4" /> {saving ? 'Recording…' : 'Record transaction'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader><CardTitle className="text-base">Transaction log</CardTitle></CardHeader>
        <CardContent>
          {workspace.transactions.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted">No transactions recorded.</p>
          ) : (
            <div className="divide-y divide-border">
              {[...workspace.transactions].reverse().map((transaction) => {
                const participant = transaction.participant_id
                  ? participantById.get(transaction.participant_id)
                  : undefined
                return (
                  <div key={transaction.id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <p className="text-sm font-semibold capitalize text-ink">{transaction.kind.replaceAll('_', ' ')}</p>
                      <p className="text-xs text-muted">{participant?.display_name ?? 'House / unassigned'}{transaction.note ? ` · ${transaction.note}` : ''}</p>
                    </div>
                    <p className="font-semibold text-ink">
                      {formatMoney(money(transaction.amount_minor, transaction.currency))}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function SeatingPanel({
  workspace,
  readOnly,
  onRefresh,
  onFailure,
}: {
  workspace: GameWorkspace
  readOnly: boolean
  onRefresh: () => Promise<unknown>
  onFailure: (message: string | null) => void
}) {
  const [values, setValues] = useState<Record<string, { table: string; seat: string }>>({})
  const seatByParticipant = new Map(workspace.seats.filter((seat) => seat.active).map((seat) => [seat.participant_id, seat]))
  const eligible = workspace.participants.filter(
    (participant) => participant.checked_in_at || participant.rsvp_status === 'yes',
  )

  async function save(participant: HomeParticipant) {
    const current = seatByParticipant.get(participant.id)
    const next = values[participant.id]
    const tableNumber = Number(next?.table ?? current?.table_number ?? 1)
    const seatNumber = Number(next?.seat ?? current?.seat_number ?? 1)
    try {
      await assignSeat({ gameId: workspace.game.id, participantId: participant.id, tableNumber, seatNumber })
      await onRefresh()
    } catch (seatError) {
      onFailure(errorMessage(seatError))
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">Assign checked-in or confirmed players. Active table and seat numbers must be unique.</p>
      {eligible.length === 0 ? (
        <Card><p className="py-5 text-center text-sm text-muted">Check in players before assigning seats.</p></Card>
      ) : (
        <div className="grid gap-2 lg:grid-cols-2">
          {eligible.map((participant) => {
            const current = seatByParticipant.get(participant.id)
            return (
              <Card key={participant.id} className="flex flex-wrap items-end gap-2 py-3">
                <div className="min-w-36 flex-1">
                  <p className="font-semibold text-ink">{participant.display_name}</p>
                  <p className="text-xs text-muted">{current ? `Table ${current.table_number}, seat ${current.seat_number}` : 'Unseated'}</p>
                </div>
                {!readOnly && (
                  <>
                    <label className="w-20 text-xs font-medium text-muted">
                      Table
                      <Input
                        className="mt-1 h-9 px-2"
                        type="number"
                        min={1}
                        value={values[participant.id]?.table ?? current?.table_number ?? 1}
                        onChange={(event) => setValues((prior) => ({
                          ...prior,
                          [participant.id]: { table: event.target.value, seat: prior[participant.id]?.seat ?? String(current?.seat_number ?? 1) },
                        }))}
                      />
                    </label>
                    <label className="w-20 text-xs font-medium text-muted">
                      Seat
                      <Input
                        className="mt-1 h-9 px-2"
                        type="number"
                        min={1}
                        value={values[participant.id]?.seat ?? current?.seat_number ?? 1}
                        onChange={(event) => setValues((prior) => ({
                          ...prior,
                          [participant.id]: { table: prior[participant.id]?.table ?? String(current?.table_number ?? 1), seat: event.target.value },
                        }))}
                      />
                    </label>
                    <Button size="sm" variant="secondary" onClick={() => void save(participant)}>Save</Button>
                  </>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ClockPanel({
  gameId,
  levels,
  persisted,
  readOnly,
  onFailure,
}: {
  gameId: string
  levels: GameWorkspace['blindLevels']
  persisted: TournamentClockState | null
  readOnly: boolean
  onFailure: (message: string | null) => void
}) {
  const initialLevel = persisted?.current_level ?? levels[0]?.level_number ?? 1
  const initialDuration = levels.find((level) => level.level_number === initialLevel)?.duration_seconds ?? 1200
  const [levelNumber, setLevelNumber] = useState(initialLevel)
  const [remaining, setRemaining] = useState(persisted?.remaining_seconds ?? initialDuration)
  const [running, setRunning] = useState(persisted?.is_running ?? false)
  const level = levels.find((entry) => entry.level_number === levelNumber)

  useEffect(() => {
    if (!running || remaining <= 0) return
    const timer = window.setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [running, remaining])

  async function persist(nextRunning = running) {
    const state: TournamentClockState = {
      game_id: gameId,
      current_level: levelNumber,
      remaining_seconds: remaining,
      is_running: nextRunning,
      started_at: nextRunning ? new Date().toISOString() : persisted?.started_at ?? null,
      updated_at: new Date().toISOString(),
    }
    try {
      await saveClockState(state)
    } catch (clockError) {
      onFailure(errorMessage(clockError))
    }
  }

  async function toggle() {
    const next = !running
    setRunning(next)
    await persist(next)
  }

  async function nextLevel() {
    const currentIndex = levels.findIndex((entry) => entry.level_number === levelNumber)
    const next = levels[currentIndex + 1]
    if (!next) return
    setRunning(false)
    setLevelNumber(next.level_number)
    setRemaining(next.duration_seconds)
    try {
      await saveClockState({
        game_id: gameId,
        current_level: next.level_number,
        remaining_seconds: next.duration_seconds,
        is_running: false,
        started_at: null,
        updated_at: new Date().toISOString(),
      })
    } catch (clockError) {
      onFailure(errorMessage(clockError))
    }
  }

  const minutes = Math.floor(remaining / 60).toString().padStart(2, '0')
  const seconds = (remaining % 60).toString().padStart(2, '0')

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.75fr)]">
      <Card className="text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold">
          {level?.is_break ? level.label ?? 'Break' : `Level ${levelNumber}`}
        </p>
        <p className="my-5 font-mono text-6xl font-bold tabular-nums text-ink sm:text-7xl">{minutes}:{seconds}</p>
        {!level?.is_break && (
          <p className="mb-5 text-xl font-semibold text-ink">
            {level?.small_blind ?? 0} / {level?.big_blind ?? 0}
            {level?.ante ? ` · ${level.ante} ante` : ''}
          </p>
        )}
        {!readOnly && (
          <div className="flex justify-center gap-2">
            <Button onClick={() => void toggle()}>
              {running ? <Pause className="mr-1 h-4 w-4" /> : <Play className="mr-1 h-4 w-4" />}
              {running ? 'Pause' : 'Start'}
            </Button>
            <Button variant="secondary" onClick={() => void nextLevel()} disabled={levels.findIndex((entry) => entry.level_number === levelNumber) >= levels.length - 1}>
              Next level
            </Button>
          </div>
        )}
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Structure</CardTitle></CardHeader>
        <CardContent className="max-h-96 space-y-1 overflow-y-auto">
          {levels.length === 0 ? (
            <p className="text-sm text-muted">No levels configured. Add a structure to the recurring template.</p>
          ) : levels.map((entry) => (
            <div key={entry.id} className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${entry.level_number === levelNumber ? 'bg-gold/10 text-ink' : 'text-muted'}`}>
              <span>{entry.is_break ? entry.label ?? 'Break' : `Level ${entry.level_number}`}</span>
              <span>{entry.is_break ? `${Math.round(entry.duration_seconds / 60)} min` : `${entry.small_blind}/${entry.big_blind}${entry.ante ? ` (${entry.ante})` : ''}`}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function ResultsPanel({
  workspace,
  readOnly,
  onRefresh,
  onFailure,
}: {
  workspace: GameWorkspace
  readOnly: boolean
  onRefresh: () => Promise<unknown>
  onFailure: (message: string | null) => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    playerId: '',
    finishPosition: String(workspace.results.length + 1),
    initialBuyIn: String(workspace.game.buy_in ?? 0),
    payout: '0',
    rebuys: '0',
  })
  const [finish, setFinish] = useState({
    participantId: '',
    position: '',
    eliminatedByParticipantId: '',
    bounty: '0',
  })
  const used = new Set(workspace.results.map((result) => result.player_id))
  const available = workspace.players.filter((player) => !used.has(player.id))

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!form.playerId) {
      onFailure('Choose a player.')
      return
    }
    try {
      await saveGameResult(
        {
          gameId: workspace.game.id,
          playerId: form.playerId,
          finishPosition: Number(form.finishPosition),
          initialBuyIn: Number(form.initialBuyIn),
          payout: Number(form.payout),
          rebuys: Number(form.rebuys),
          rebuyAmount: Number(workspace.game.buy_in),
        },
        workspace.league.points_system,
      )
      setShowForm(false)
      setForm({
        playerId: '',
        finishPosition: String(workspace.results.length + 2),
        initialBuyIn: String(workspace.game.buy_in ?? 0),
        payout: '0',
        rebuys: '0',
      })
      await onRefresh()
    } catch (resultError) {
      onFailure(errorMessage(resultError))
    }
  }

  async function submitTournamentFinish(event: React.FormEvent) {
    event.preventDefault()
    if (!finish.participantId || !finish.position) {
      onFailure('Choose a participant and finish position.')
      return
    }
    try {
      const bountyMinor = amountToMinorUnits(finish.bounty || '0')
      await recordTournamentFinish({
        gameId: workspace.game.id,
        participantId: finish.participantId,
        finishPosition: Number(finish.position),
        eliminatedByParticipantId: finish.eliminatedByParticipantId || null,
        bountyMinor,
      })
      if (BigInt(bountyMinor) > 0n && finish.eliminatedByParticipantId) {
        const recipient = workspace.participants.find(
          (participant) => participant.id === finish.eliminatedByParticipantId,
        )
        await recordGameTransaction({
          gameId: workspace.game.id,
          participantId: recipient?.id ?? null,
          playerId: recipient?.player_id || null,
          kind: 'bounty',
          amountMinor: bountyMinor,
          currency: workspace.game.currency,
          note: 'Tournament bounty',
          idempotencyKey: createIdempotencyKey('tournament-bounty'),
        })
      }
      setFinish({ participantId: '', position: '', eliminatedByParticipantId: '', bounty: '0' })
      await onRefresh()
    } catch (finishError) {
      onFailure(errorMessage(finishError))
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">Finish order and results</h2>
          <p className="text-sm text-muted">Points and trusted financial totals are recalculated by the server at finalization.</p>
        </div>
        {!readOnly && available.length > 0 && (
          <Button size="sm" onClick={() => setShowForm((value) => !value)}>
            <Plus className="mr-1 h-4 w-4" /> Add result
          </Button>
        )}
      </div>
      {showForm && (
        <Card>
          <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" onSubmit={submit}>
            <label className="text-sm font-medium text-muted">
              Player
              <Select className="mt-1" value={form.playerId} onChange={(event) => setForm({ ...form, playerId: event.target.value })}>
                <option value="">Choose player…</option>
                {available.map((player) => <option key={player.id} value={player.id}>{player.display_name}</option>)}
              </Select>
            </label>
            <Field label="Finish" type="number" min="1" value={form.finishPosition} onChange={(value) => setForm({ ...form, finishPosition: value })} />
            <Field label="Initial buy-in" type="number" min="0" step="0.01" value={form.initialBuyIn} onChange={(value) => setForm({ ...form, initialBuyIn: value })} />
            <Field label="Payout" type="number" min="0" step="0.01" value={form.payout} onChange={(value) => setForm({ ...form, payout: value })} />
            <Field label="Rebuys / re-entries" type="number" min="0" value={form.rebuys} onChange={(value) => setForm({ ...form, rebuys: value })} />
            <Button type="submit" className="self-end"><Save className="mr-1 h-4 w-4" /> Save result</Button>
          </form>
        </Card>
      )}
      {workspace.game.kind === 'tournament' && !readOnly && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Elimination and finish order</CardTitle>
            <p className="text-sm text-muted">Record eliminations during play; set the winner to position 1.</p>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" onSubmit={submitTournamentFinish}>
              <label className="text-sm font-medium text-muted">
                Player
                <Select className="mt-1" value={finish.participantId} onChange={(event) => setFinish({ ...finish, participantId: event.target.value })}>
                  <option value="">Choose player…</option>
                  {workspace.participants.filter((participant) => participant.player_id).map((participant) => (
                    <option key={participant.id} value={participant.id}>{participant.display_name}</option>
                  ))}
                </Select>
              </label>
              <Field label="Finish position" type="number" min="1" value={finish.position} onChange={(value) => setFinish({ ...finish, position: value })} />
              <label className="text-sm font-medium text-muted">
                Eliminated by
                <Select className="mt-1" value={finish.eliminatedByParticipantId} onChange={(event) => setFinish({ ...finish, eliminatedByParticipantId: event.target.value })}>
                  <option value="">Not recorded / winner</option>
                  {workspace.participants.filter((participant) => participant.id !== finish.participantId).map((participant) => (
                    <option key={participant.id} value={participant.id}>{participant.display_name}</option>
                  ))}
                </Select>
              </label>
              <Field label="Bounty" type="number" min="0" step="0.01" value={finish.bounty} onChange={(value) => setFinish({ ...finish, bounty: value })} />
              <Button type="submit" className="sm:col-span-2 lg:col-span-4">Record finish</Button>
            </form>
            {workspace.participants.some((participant) => participant.finish_position) && (
              <div className="mt-4 divide-y divide-border">
                {[...workspace.participants]
                  .filter((participant) => participant.finish_position)
                  .sort((left, right) => Number(left.finish_position) - Number(right.finish_position))
                  .map((participant) => (
                    <div key={participant.id} className="flex items-center justify-between py-2 text-sm">
                      <span className="text-ink">{participant.finish_position}. {participant.display_name}</span>
                      <span className="text-muted">{participant.finish_position === 1 ? 'Winner' : 'Eliminated'}</span>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      {workspace.results.length === 0 ? (
        <Card><p className="py-6 text-center text-sm text-muted">No results recorded.</p></Card>
      ) : (
        <div className="space-y-2">
          {workspace.results.map((result) => {
            const player = workspace.players.find((entry) => entry.id === result.player_id)
            return (
              <Card key={result.id} className="flex items-center gap-3 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cream font-bold text-gold">{result.finish_position}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{player?.display_name ?? 'Unknown player'}</p>
                  <p className="text-xs text-muted">{result.rebuys} rebuy{result.rebuys === 1 ? '' : 's'} · {result.points_earned} points</p>
                </div>
                <p className="text-sm font-semibold text-ink">{formatMoney(money(String(Math.round(Number(result.payout) * 100)), workspace.game.currency))}</p>
                {!readOnly && (
                  <button
                    type="button"
                    aria-label={`Delete result for ${player?.display_name ?? 'player'}`}
                    className="rounded p-2 text-muted hover:bg-danger/10 hover:text-danger"
                    onClick={async () => {
                      try {
                        await deleteGameResult(result.id, workspace.game.id, workspace.league.points_system)
                        await onRefresh()
                      } catch (deleteError) {
                        onFailure(errorMessage(deleteError))
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  ...props
}: {
  label: string
  value: string
  onChange: (value: string) => void
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <label className="text-sm font-medium text-muted">
      {label}
      <Input className="mt-1" value={value} onChange={(event) => onChange(event.target.value)} {...props} />
    </label>
  )
}

function CloseoutPanel({
  workspace,
  closeout,
  readOnly,
  onFinalized,
  onFailure,
}: {
  workspace: GameWorkspace
  closeout: ReturnType<typeof summarizeCloseout>
  readOnly: boolean
  onFinalized: () => Promise<unknown>
  onFailure: (message: string | null) => void
}) {
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)
  const balanced = closeout.varianceMinor === 0n
  const finalized = workspace.game.phase === 'finalized'

  async function finalize() {
    if (!navigator.onLine) {
      onFailure('Reconnect before finalizing. Finalization cannot be queued offline.')
      return
    }
    setSaving(true)
    try {
      await finalizeGame(workspace.game.id, createIdempotencyKey('finalize-game'))
      setConfirming(false)
      await onFinalized()
    } catch (finalizeError) {
      onFailure(errorMessage(finalizeError))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-3">
        <Info label="Inflow" value={formatMoney(money(String(closeout.inflowMinor), workspace.game.currency))} />
        <Info label="Outflow" value={formatMoney(money(String(closeout.outflowMinor), workspace.game.currency))} />
        <Info label="Variance" value={formatMoney(money(String(closeout.varianceMinor), workspace.game.currency))} />
      </div>
      <Card className={balanced ? 'border-success/30' : 'border-gold/40 bg-gold/5'}>
        <div className="flex items-start gap-3">
          {balanced ? <Check className="mt-0.5 h-5 w-5 text-success" /> : <WalletCards className="mt-0.5 h-5 w-5 text-gold" />}
          <div>
            <p className="font-semibold text-ink">{balanced ? 'Money is balanced' : 'Variance needs review'}</p>
            <p className="mt-1 text-sm text-muted">
              {balanced
                ? 'Recorded inflows and outflows match.'
                : 'Review missing cash-outs, payouts, tips, fees, or adjustments before closing.'}
            </p>
          </div>
        </div>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Finalize game</CardTitle>
          <p className="text-sm text-muted">
            Finalization recalculates the full field and locks results and ordinary financial entries. Corrections use auditable adjustments.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <Info label="Results" value={String(workspace.results.length)} />
            <Info label="Entries" value={String(closeout.activeEntries)} />
            <Info label="Status" value={finalized ? 'Finalized' : 'Open'} />
          </div>
          {!finalized && !readOnly && (
            confirming ? (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-danger/20 bg-danger/5 p-3">
                <p className="mr-auto text-sm font-medium text-ink">Lock this game and publish standings?</p>
                <Button variant="danger" size="sm" disabled={saving || workspace.results.length === 0} onClick={() => void finalize()}>
                  {saving ? 'Finalizing…' : 'Yes, finalize'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>Cancel</Button>
              </div>
            ) : (
              <Button
                onClick={() => setConfirming(true)}
                disabled={workspace.results.length === 0}
              >
                <Spade className="mr-1 h-4 w-4" /> Finalize game
              </Button>
            )
          )}
        </CardContent>
      </Card>
    </div>
  )
}

async function processQueuedAction(action: OfflineAction) {
  if (action.kind === 'check_in') {
    await setParticipantCheckIn(
      {
        id: String(action.payload.participantId),
        game_id: String(action.payload.gameId),
        player_id: '',
        display_name: 'Queued participant',
        rsvp_status: 'pending',
        checked_in_at: null,
        guest_count: 0,
        table_number: null,
        seat_number: null,
      },
      Boolean(action.payload.checkedIn),
      action.idempotencyKey,
    )
    return
  }
  await recordGameTransaction({
    gameId: String(action.payload.gameId),
    participantId: action.payload.participantId
      ? String(action.payload.participantId)
      : null,
    playerId: action.payload.playerId ? String(action.payload.playerId) : null,
    kind: action.payload.kind as GameTransactionKind,
    amountMinor: String(action.payload.amountMinor),
    currency: String(action.payload.currency),
    note: action.payload.note ? String(action.payload.note) : undefined,
    idempotencyKey: action.idempotencyKey,
  })
}
