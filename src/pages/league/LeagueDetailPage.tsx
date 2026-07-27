import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'
import {
  Calendar,
  ContactRound,
  Crown,
  LayoutTemplate,
  Plus,
  Settings,
  ShieldCheck,
  Trophy,
  Users,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { formatDate, getInitials } from '../../lib/utils'
import { formatMoney, money } from '../../lib/money'
import { useRealtimeSubscription } from '../../hooks/useRealtimeSubscription'
import { AddPlayerModal } from '../../components/modals/AddPlayerModal'
import { ScheduleGameModal } from '../../components/modals/ScheduleGameModal'
import { CreateSeasonModal } from '../../components/modals/CreateSeasonModal'
import { LeagueStandings } from '../../components/league/LeagueStandings'
import { ActionBar } from '../../components/ui/ActionBar'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { Surface } from '../../components/ui/Surface'
import { LeagueSettings } from './LeagueSettings'
import { useAuthStore } from '../../store/authStore'
import {
  activateSeason,
  amountToMinorUnits,
  createContact,
  createContactGroup,
  createGameTemplate,
  createTournamentStructure,
  deleteContactGroup,
  errorMessage,
  gameDisplayName,
  gamePhaseLabel,
  linkContactToLeague,
  loadContacts,
  loadContactGroups,
  loadGameTemplates,
  loadLeagueContacts,
  loadLeagueWorkspace,
  loadSeasonGames,
  loadStandingsForSeason,
  loadTournamentStructures,
  setContactArchived,
  setGameTemplateArchived,
  unlinkContactFromLeague,
  updateContact,
  type Contact,
  type GameKind,
  type HomeGame,
  type LeagueContact,
} from '../../lib/homeGames'
import type { Json } from '../../types/database'

type Tab = 'standings' | 'games' | 'players' | 'contacts' | 'templates' | 'settings'

export function LeagueDetailPage() {
  const { leagueId = '' } = useParams<{ leagueId: string }>()
  const user = useAuthStore((state) => state.user)
  const queryClient = useQueryClient()
  const [selectedSeasonId, setSelectedSeasonId] = useState('')
  const [tab, setTab] = useState<Tab>('standings')
  const [showAddPlayer, setShowAddPlayer] = useState(false)
  const [showScheduleGame, setShowScheduleGame] = useState(false)
  const [scheduleTemplateId, setScheduleTemplateId] = useState<string | undefined>()
  const [showCreateSeason, setShowCreateSeason] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const workspaceQuery = useQuery({
    queryKey: ['home', 'league', leagueId, user?.id],
    queryFn: () => loadLeagueWorkspace(user!.id, leagueId),
    enabled: Boolean(user && leagueId),
  })
  const activeSeason =
    workspaceQuery.data?.seasons.find((season) => season.is_active) ??
    workspaceQuery.data?.seasons[0] ??
    null
  const effectiveSeasonId = selectedSeasonId || activeSeason?.id || ''
  const gamesQuery = useQuery({
    queryKey: ['home', 'league', leagueId, 'games', effectiveSeasonId],
    queryFn: () => loadSeasonGames(effectiveSeasonId),
    enabled: Boolean(effectiveSeasonId),
  })
  const standingsQuery = useQuery({
    queryKey: ['home', 'league', leagueId, 'standings', effectiveSeasonId],
    queryFn: () => loadStandingsForSeason(effectiveSeasonId, workspaceQuery.data?.players ?? []),
    enabled: Boolean(effectiveSeasonId && workspaceQuery.data),
  })
  const templatesQuery = useQuery({
    queryKey: ['home', 'league', leagueId, 'templates'],
    queryFn: () => loadGameTemplates(leagueId),
    enabled: Boolean(leagueId && workspaceQuery.data?.access.canManage),
  })

  const refreshWorkspace = () =>
    queryClient.invalidateQueries({ queryKey: ['home', 'league', leagueId] })
  useRealtimeSubscription('game_results', undefined, () => {
    void queryClient.invalidateQueries({ queryKey: ['home', 'league', leagueId, 'standings'] })
  })

  const activateMutation = useMutation({
    mutationFn: (seasonId: string) => activateSeason(leagueId, seasonId),
    onSuccess: async () => {
      setFailure(null)
      await refreshWorkspace()
    },
    onError: (mutationError) => setFailure(errorMessage(mutationError)),
  })

  if (workspaceQuery.isPending) return <div className="py-12 text-center text-muted">Loading league…</div>
  if (workspaceQuery.isError || !workspaceQuery.data) {
    return <Card className="border-danger/30 bg-danger/5 text-center text-danger">League not found or unavailable.</Card>
  }

  const { league, seasons, players, access } = workspaceQuery.data
  const selectedSeason = seasons.find((season) => season.id === effectiveSeasonId) ?? activeSeason
  const games = gamesQuery.data ?? []
  const standings = standingsQuery.data ?? []
  const templates = templatesQuery.data ?? []
  const tabs: { key: Tab; label: string; icon: typeof Trophy; managerOnly?: boolean; ownerOnly?: boolean }[] = [
    { key: 'standings', label: 'Standings', icon: Trophy },
    { key: 'games', label: 'Games', icon: Calendar },
    { key: 'players', label: 'Players', icon: Users },
    { key: 'contacts', label: 'Contacts', icon: ContactRound, managerOnly: true },
    { key: 'templates', label: 'Templates', icon: LayoutTemplate, managerOnly: true },
    { key: 'settings', label: 'Settings', icon: Settings, managerOnly: true },
  ]

  return (
    <div className="space-y-5">
      <SectionHeader
        headingLevel={1}
        eyebrow="League"
        title={
          <span className="inline-flex flex-wrap items-center gap-2">
            {league.name}
            <Badge variant={access.role === 'member' ? 'default' : 'gold'}>
              {access.isOwner ? (
                <Crown className="mr-1 h-3 w-3" aria-hidden="true" />
              ) : access.canManage ? (
                <ShieldCheck className="mr-1 h-3 w-3" aria-hidden="true" />
              ) : null}
              {access.role}
            </Badge>
          </span>
        }
        description={league.description}
      />

      {failure && <Card className="border-danger/30 bg-danger/5 py-3 text-sm text-danger" role="alert">{failure}</Card>}

      <Surface padding="sm">
        <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted">
          Season
        </span>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {seasons.map((season) => (
            <button
              type="button"
              key={season.id}
              onClick={() => {
                setSelectedSeasonId(season.id)
                setTab('standings')
              }}
              className={`min-h-12 px-3 py-2 text-sm font-semibold ${
                effectiveSeasonId === season.id
                  ? 'bg-felt text-ivory'
                  : 'border border-rule bg-bg text-muted hover:text-ink'
              }`}
            >
              {season.name}
              {season.is_active && <span className="ml-1 text-xs opacity-80">Active</span>}
            </button>
          ))}
        </div>
        {access.canManage && (
          <ActionBar
            sticky={false}
            className="mt-3 border-x-0 border-b-0 px-0 pb-0"
          >
            {selectedSeason && !selectedSeason.is_active && (
              <Button
                size="sm"
                variant="secondary"
                disabled={activateMutation.isPending}
                onClick={() => activateMutation.mutate(selectedSeason.id)}
              >
                Make active
              </Button>
            )}
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowCreateSeason(true)}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              New season
            </Button>
            {templates.length > 0 && (
              <Button
                size="sm"
                onClick={() => {
                  setScheduleTemplateId(undefined)
                  setShowScheduleGame(true)
                }}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Create game
              </Button>
            )}
          </ActionBar>
        )}
      </Surface>

      <nav
        className="grid grid-cols-2 gap-px border border-rule bg-rule sm:grid-cols-3 lg:grid-cols-6"
        aria-label="League sections"
      >
        {tabs
          .filter((item) => !item.managerOnly || access.canManage)
          .map((item) => (
            <button
              key={item.key}
              aria-pressed={tab === item.key}
              onClick={() => setTab(item.key)}
              className={`flex min-h-12 items-center justify-center gap-1.5 bg-ivory px-3 py-2 text-sm font-semibold ${
                tab === item.key
                  ? 'text-felt shadow-[inset_0_-3px_0_var(--color-gold)]'
                  : 'text-muted hover:text-ink'
              }`}
            >
              <item.icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </button>
          ))}
      </nav>

      {tab === 'standings' && (
        <LeagueStandings
          leagueId={leagueId}
          seasonName={selectedSeason?.name ?? 'Current season'}
          standings={standings}
          pending={standingsQuery.isPending}
        />
      )}

      {tab === 'games' && (
        <div className="space-y-3">
          {access.canManage && templates.length === 0 && (
            <Card className="border-gold/30 bg-gold/5">
              <p className="font-semibold text-ink">Create a recurring template first</p>
              <p className="mt-1 text-sm text-muted">Templates make every game creation atomic and reuse stakes, invitees, and structures.</p>
              <Button className="mt-3" size="sm" variant="secondary" onClick={() => setTab('templates')}>Create template</Button>
            </Card>
          )}
          {access.canManage && templates.length > 0 && (
            <Button size="sm" onClick={() => setShowScheduleGame(true)}>
              <Plus className="mr-1 h-4 w-4" /> Create game from template
            </Button>
          )}
          {gamesQuery.isPending ? (
            <Card><p className="py-4 text-center text-sm text-muted">Loading games…</p></Card>
          ) : games.length === 0 ? (
            <Card><p className="py-5 text-center text-sm text-muted">No games in this season.</p></Card>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {games.map((game) => (
                <Link key={game.id} to={`/leagues/${leagueId}/games/${game.id}`}>
                  <GameCard game={game} leagueName={league.name} />
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'players' && (
        <div className="space-y-3">
          {access.canManage && (
            <Button size="sm" onClick={() => setShowAddPlayer(true)}>
              <Plus className="mr-1 h-4 w-4" /> Add player
            </Button>
          )}
          {players.length === 0 ? (
            <Card><p className="py-5 text-center text-sm text-muted">No league players yet.</p></Card>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {players.map((player) => (
                <Link key={player.id} to={`/leagues/${leagueId}/players/${player.id}`}>
                  <Card className="flex cursor-pointer items-center gap-3 py-3 transition-colors hover:border-gold/50">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-poker-green text-sm font-semibold text-white">{getInitials(player.display_name)}</div>
                    <p className="font-semibold text-ink">{player.display_name}</p>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'contacts' && access.canManage && (
        <ContactsPanel
          ownerId={user!.id}
          leagueId={leagueId}
          canManage={access.canManage}
          onFailure={setFailure}
        />
      )}

      {tab === 'templates' && access.canManage && (
        <TemplatesPanel
          ownerId={league.owner_id}
          leagueId={leagueId}
          canManage={access.canManage}
          onFailure={setFailure}
          onSchedule={(templateId) => {
            setScheduleTemplateId(templateId)
            setShowScheduleGame(true)
          }}
        />
      )}

      {tab === 'settings' && access.canManage && (
        <LeagueSettings
          league={league}
          canManage={access.canManage}
          isOwner={access.isOwner}
          onUpdated={() => void refreshWorkspace()}
        />
      )}

      <AddPlayerModal
        open={showAddPlayer}
        onClose={() => setShowAddPlayer(false)}
        leagueId={leagueId}
        onCreated={() => void refreshWorkspace()}
      />
      <ScheduleGameModal
        open={showScheduleGame}
        onClose={() => setShowScheduleGame(false)}
        templates={templates}
        initialTemplateId={scheduleTemplateId}
        onCreated={(game) => {
          setSelectedSeasonId(game.season_id)
          void queryClient.invalidateQueries({ queryKey: ['home', 'league', leagueId, 'games'] })
        }}
      />
      <CreateSeasonModal
        open={showCreateSeason}
        onClose={() => setShowCreateSeason(false)}
        leagueId={leagueId}
        onCreated={(season) => {
          setSelectedSeasonId(season.id)
          void refreshWorkspace()
        }}
      />
    </div>
  )
}

function GameCard({ game, leagueName }: { game: HomeGame; leagueName: string }) {
  return (
    <Card className="h-full cursor-pointer transition-colors hover:border-gold/50">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-ink">{gameDisplayName(game, leagueName)}</p>
          <p className="mt-1 text-sm text-muted">{formatDate(game.scheduled_date)}</p>
          {game.location && <p className="mt-1 text-xs text-muted">{game.location}</p>}
        </div>
        <Badge variant={game.phase === 'finalized' ? 'green' : game.phase === 'cancelled' ? 'red' : 'gold'}>
          {gamePhaseLabel(game.phase)}
        </Badge>
      </div>
    </Card>
  )
}

function ContactsPanel({
  ownerId,
  leagueId,
  canManage,
  onFailure,
}: {
  ownerId: string
  leagueId: string
  canManage: boolean
  onFailure: (message: string | null) => void
}) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ name: '', email: '', phone: '' })
  const [existingContactId, setExistingContactId] = useState('')
  const [mergeSource, setMergeSource] = useState('')
  const [mergeTarget, setMergeTarget] = useState('')
  const [groupName, setGroupName] = useState('')
  const [groupContacts, setGroupContacts] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const queryKey = ['home', 'league', leagueId, 'contacts']
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const [all, linked, groups] = await Promise.all([
        loadContacts(ownerId),
        loadLeagueContacts(leagueId),
        loadContactGroups(leagueId),
      ])
      return { all, linked, groups }
    },
  })
  const linked = (query.data?.linked ?? []).filter((contact) => !contact.archived_at)
  const linkedIds = new Set(linked.map((contact) => contact.id))
  const available = (query.data?.all ?? []).filter((contact) => !linkedIds.has(contact.id))
  const groups = query.data?.groups ?? []
  const refresh = () => queryClient.invalidateQueries({ queryKey })

  async function addContact(event: React.FormEvent) {
    event.preventDefault()
    if (form.name.trim().length < 2) {
      onFailure('Enter a contact name.')
      return
    }
    setSaving(true)
    try {
      const contact = await createContact({
        ownerId,
        displayName: form.name,
        email: form.email,
        phone: form.phone,
      })
      await linkContactToLeague(leagueId, contact.id)
      setForm({ name: '', email: '', phone: '' })
      onFailure(null)
      await refresh()
    } catch (contactError) {
      onFailure(errorMessage(contactError))
    } finally {
      setSaving(false)
    }
  }

  async function linkExisting() {
    if (!existingContactId) return
    try {
      await linkContactToLeague(leagueId, existingContactId)
      setExistingContactId('')
      await refresh()
    } catch (linkError) {
      onFailure(errorMessage(linkError))
    }
  }

  async function merge() {
    if (!mergeSource || !mergeTarget || mergeSource === mergeTarget) {
      onFailure('Choose two different contacts to merge.')
      return
    }
    try {
      await linkContactToLeague(leagueId, mergeTarget)
      await updateContact(mergeSource, { mergedIntoId: mergeTarget })
      await unlinkContactFromLeague(leagueId, mergeSource)
      setMergeSource('')
      setMergeTarget('')
      await refresh()
    } catch (mergeError) {
      onFailure(errorMessage(mergeError))
    }
  }

  async function addGroup(event: React.FormEvent) {
    event.preventDefault()
    if (groupName.trim().length < 2) {
      onFailure('Enter an invite group name.')
      return
    }
    try {
      await createContactGroup({
        ownerId,
        leagueId,
        name: groupName,
        contactIds: groupContacts,
      })
      setGroupName('')
      setGroupContacts([])
      await refresh()
    } catch (groupError) {
      onFailure(errorMessage(groupError))
    }
  }

  if (query.isPending) return <Card><p className="py-5 text-center text-sm text-muted">Loading contacts…</p></Card>

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reusable contact book</CardTitle>
          <p className="text-sm text-muted">Contacts do not need an account and can be invited to multiple recurring games.</p>
        </CardHeader>
        {canManage && (
          <CardContent>
            <form className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4" onSubmit={addContact}>
              <Input aria-label="Contact name" placeholder="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              <Input aria-label="Contact email" type="email" placeholder="Email (optional)" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
              <Input aria-label="Contact phone" type="tel" placeholder="Phone (optional)" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
              <Button type="submit" disabled={saving}>{saving ? 'Adding…' : 'Add contact'}</Button>
            </form>
            {available.length > 0 && (
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <label className="min-w-52 flex-1 text-sm font-medium text-muted">
                  Add from your contact book
                  <Select className="mt-1" value={existingContactId} onChange={(event) => setExistingContactId(event.target.value)}>
                    <option value="">Choose contact…</option>
                    {available.map((contact) => <option key={contact.id} value={contact.id}>{contact.display_name}</option>)}
                  </Select>
                </label>
                <Button variant="secondary" onClick={() => void linkExisting()} disabled={!existingContactId}>Link contact</Button>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {linked.length === 0 ? (
        <Card><p className="py-5 text-center text-sm text-muted">No contacts linked to this league.</p></Card>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {linked.map((contact) => (
            <Card key={contact.id} className="py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{contact.display_name}</p>
                  {contact.email && <p className="truncate text-sm text-muted">{contact.email}</p>}
                  {contact.phone && <p className="text-sm text-muted">{contact.phone}</p>}
                  {contact.player_id && <Badge className="mt-2" variant="green">League player</Badge>}
                </div>
                {canManage && (
                  <div className="flex flex-col items-end gap-1">
                    <button
                      className="rounded px-2 py-1 text-xs text-muted hover:bg-cream hover:text-danger"
                      onClick={async () => {
                        try {
                          await unlinkContactFromLeague(leagueId, contact.id)
                          await refresh()
                        } catch (unlinkError) {
                          onFailure(errorMessage(unlinkError))
                        }
                      }}
                    >
                      Unlink
                    </button>
                    <button
                      className="rounded px-2 py-1 text-xs text-muted hover:bg-cream hover:text-danger"
                      onClick={async () => {
                        try {
                          await setContactArchived(contact.id, true)
                          await refresh()
                        } catch (archiveError) {
                          onFailure(errorMessage(archiveError))
                        }
                      }}
                    >
                      Archive
                    </button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {canManage && linked.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Merge duplicate contacts</CardTitle>
            <p className="text-sm text-muted">The source is retained as an audit reference and points to the destination.</p>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-2">
            <ContactSelect label="Duplicate" value={mergeSource} contacts={linked} onChange={setMergeSource} />
            <ContactSelect label="Keep" value={mergeTarget} contacts={linked.filter((contact) => contact.id !== mergeSource)} onChange={setMergeTarget} />
            <Button variant="secondary" onClick={() => void merge()} disabled={!mergeSource || !mergeTarget}>Merge</Button>
          </CardContent>
        </Card>
      )}

      {canManage && linked.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invite groups</CardTitle>
            <p className="text-sm text-muted">Create reusable groups for regulars, alternates, or a tournament field.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <form className="space-y-3" onSubmit={addGroup}>
              <div className="flex flex-wrap gap-2">
                <Input
                  className="min-w-52 flex-1"
                  placeholder="Group name"
                  value={groupName}
                  onChange={(event) => setGroupName(event.target.value)}
                />
                <Button type="submit">Create group</Button>
              </div>
              <div className="grid max-h-40 gap-1 overflow-y-auto rounded-lg border border-border p-2 sm:grid-cols-2 lg:grid-cols-3">
                {linked.map((contact) => (
                  <label key={contact.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-ink hover:bg-cream">
                    <input
                      type="checkbox"
                      className="accent-gold"
                      checked={groupContacts.includes(contact.id)}
                      onChange={() => setGroupContacts((prior) => prior.includes(contact.id) ? prior.filter((id) => id !== contact.id) : [...prior, contact.id])}
                    />
                    {contact.display_name}
                  </label>
                ))}
              </div>
            </form>
            {groups.length > 0 && (
              <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                {groups.map((group) => (
                  <span key={group.id} className="inline-flex items-center gap-2 rounded-full bg-cream px-3 py-1.5 text-sm text-ink">
                    {group.name} · {group.memberContactIds.length}
                    <button
                      type="button"
                      aria-label={`Delete group ${group.name}`}
                      className="text-muted hover:text-danger"
                      onClick={async () => {
                        try {
                          await deleteContactGroup(group.id)
                          await refresh()
                        } catch (deleteError) {
                          onFailure(errorMessage(deleteError))
                        }
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ContactSelect({
  label,
  value,
  contacts,
  onChange,
}: {
  label: string
  value: string
  contacts: (Contact | LeagueContact)[]
  onChange: (value: string) => void
}) {
  return (
    <label className="min-w-48 flex-1 text-sm font-medium text-muted">
      {label}
      <Select className="mt-1" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Choose contact…</option>
        {contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.display_name}</option>)}
      </Select>
    </label>
  )
}

function TemplatesPanel({
  ownerId,
  leagueId,
  canManage,
  onFailure,
  onSchedule,
}: {
  ownerId: string
  leagueId: string
  canManage: boolean
  onFailure: (message: string | null) => void
  onSchedule: (templateId: string) => void
}) {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [selectedContacts, setSelectedContacts] = useState<string[]>([])
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [form, setForm] = useState({
    name: '',
    kind: 'cash' as GameKind,
    recurrence: '',
    capacity: '9',
    location: '',
    buyIn: '100',
    smallBlind: '1',
    bigBlind: '2',
    minBuyIn: '40',
    maxBuyIn: '200',
    entryFee: '100',
    rake: '0',
    bounty: '0',
    structureId: '',
    structureName: 'Standard tournament',
    startingStack: '10000',
    levelPlan: '25/50/0/20\n50/100/0/20\n75/150/25/20\nbreak/10\n100/200/25/20\n150/300/50/20\n200/400/50/20',
    payoutRules: '{"1":0.5,"2":0.3,"3":0.2}',
    reminders: '24,2',
  })
  const [saving, setSaving] = useState(false)
  const templatesKey = ['home', 'league', leagueId, 'templates']
  const templatesQuery = useQuery({ queryKey: templatesKey, queryFn: () => loadGameTemplates(leagueId) })
  const contactsQuery = useQuery({
    queryKey: ['home', 'league', leagueId, 'template-contacts'],
    queryFn: () => loadLeagueContacts(leagueId),
  })
  const structuresQuery = useQuery({
    queryKey: ['home', 'league', leagueId, 'tournament-structures'],
    queryFn: () => loadTournamentStructures(leagueId),
  })
  const groupsQuery = useQuery({
    queryKey: ['home', 'league', leagueId, 'template-groups'],
    queryFn: () => loadContactGroups(leagueId),
  })
  const templates = templatesQuery.data ?? []
  const contacts = contactsQuery.data ?? []
  const structures = structuresQuery.data ?? []
  const groups = groupsQuery.data ?? []

  function dollars(value: string, label: string): string {
    try {
      return amountToMinorUnits(value || '0')
    } catch {
      throw new Error(`${label} must be a valid amount.`)
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (form.name.trim().length < 2) {
      onFailure('Enter a template name.')
      return
    }
    setSaving(true)
    try {
      let structureId: string | null = null
      if (form.kind === 'tournament') {
        structureId = form.structureId || null
        if (!structureId) {
          const levels = form.levelPlan
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line, index) => {
              const parts = line.split('/').map((part) => part.trim())
              if (parts[0]?.toLowerCase() === 'break') {
                const durationMinutes = Number(parts[1] ?? 10)
                if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
                  throw new Error(`Blind plan line ${index + 1} has an invalid break duration.`)
                }
                return {
                  levelNumber: index + 1,
                  smallBlind: '0',
                  bigBlind: '0',
                  ante: '0',
                  durationSeconds: durationMinutes * 60,
                  isBreak: true,
                  label: 'Break',
                }
              }
              const [smallBlind, bigBlind, ante = '0', duration = '20'] = parts
              if (![smallBlind, bigBlind, ante].every((value) => /^\d+$/.test(value ?? ''))) {
                throw new Error(`Blind plan line ${index + 1} must use SB/BB/ante/minutes.`)
              }
              const durationMinutes = Number(duration)
              if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
                throw new Error(`Blind plan line ${index + 1} has an invalid duration.`)
              }
              return {
                levelNumber: index + 1,
                smallBlind,
                bigBlind,
                ante,
                durationSeconds: durationMinutes * 60,
              }
            })
          const structure = await createTournamentStructure({
            ownerId,
            leagueId,
            name: form.structureName,
            startingStack: form.startingStack,
            levels,
          })
          structureId = structure.id
          await queryClient.invalidateQueries({
            queryKey: ['home', 'league', leagueId, 'tournament-structures'],
          })
        }
      }
      let payoutRules: Json = {}
      if (form.kind === 'tournament' && form.payoutRules.trim()) {
        const parsedRules: unknown = JSON.parse(form.payoutRules)
        if (!parsedRules || typeof parsedRules !== 'object' || Array.isArray(parsedRules)) {
          throw new Error('Payout rules must be a JSON object.')
        }
        payoutRules = parsedRules as Json
      }
      const reminderSchedule = form.reminders
        .split(',')
        .map((value) => Number(value.trim()))
        .filter((value) => Number.isFinite(value) && value > 0)
        .map((hoursBefore) => ({ hoursBefore }))
      await createGameTemplate({
        ownerId,
        leagueId,
        name: form.name,
        kind: form.kind,
        recurrenceRule: form.recurrence,
        capacity: form.capacity ? Number(form.capacity) : null,
        location: form.location,
        currency: 'USD',
        buyInMinor: dollars(form.kind === 'cash' ? form.buyIn : form.entryFee, 'Buy-in'),
        smallBlindMinor: form.kind === 'cash' ? dollars(form.smallBlind, 'Small blind') : null,
        bigBlindMinor: form.kind === 'cash' ? dollars(form.bigBlind, 'Big blind') : null,
        minBuyInMinor: form.kind === 'cash' ? dollars(form.minBuyIn, 'Minimum buy-in') : null,
        maxBuyInMinor: form.kind === 'cash' ? dollars(form.maxBuyIn, 'Maximum buy-in') : null,
        entryFeeMinor: form.kind === 'tournament' ? dollars(form.entryFee, 'Entry fee') : '0',
        rakeMinor: dollars(form.rake, 'Rake'),
        bountyMinor: form.kind === 'tournament' ? dollars(form.bounty, 'Bounty') : '0',
        payoutRules,
        reminderSchedule,
        structureId,
        contactIds: selectedContacts,
        groupIds: selectedGroups,
      })
      setShowForm(false)
      setSelectedContacts([])
      setSelectedGroups([])
      setForm((prior) => ({ ...prior, name: '' }))
      onFailure(null)
      await queryClient.invalidateQueries({ queryKey: templatesKey })
    } catch (templateError) {
      onFailure(errorMessage(templateError))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">Recurring game templates</h2>
          <p className="text-sm text-muted">Reuse stakes, capacity, location, invitees, reminders, and tournament structure.</p>
        </div>
        {canManage && <Button size="sm" onClick={() => setShowForm((value) => !value)}><Plus className="mr-1 h-4 w-4" /> New template</Button>}
      </div>
      {showForm && (
        <Card>
          <form className="space-y-4" onSubmit={submit}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <TemplateField label="Template name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} placeholder="Friday cash game" />
              <label className="text-sm font-medium text-muted">
                Format
                <Select className="mt-1" value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value as GameKind })}>
                  <option value="cash">Cash game</option>
                  <option value="tournament">Tournament</option>
                </Select>
              </label>
              <TemplateField label="Recurrence" value={form.recurrence} onChange={(value) => setForm({ ...form, recurrence: value })} placeholder="Every Friday" />
              <TemplateField label="Capacity" type="number" min="1" value={form.capacity} onChange={(value) => setForm({ ...form, capacity: value })} />
              <TemplateField label="Location" value={form.location} onChange={(value) => setForm({ ...form, location: value })} placeholder="Poker room" />
              {form.kind === 'cash' ? (
                <>
                  <TemplateField label="Default buy-in ($)" type="number" min="0" step="0.01" value={form.buyIn} onChange={(value) => setForm({ ...form, buyIn: value })} />
                  <TemplateField label="Small blind ($)" type="number" min="0" step="0.01" value={form.smallBlind} onChange={(value) => setForm({ ...form, smallBlind: value })} />
                  <TemplateField label="Big blind ($)" type="number" min="0" step="0.01" value={form.bigBlind} onChange={(value) => setForm({ ...form, bigBlind: value })} />
                  <TemplateField label="Minimum buy-in ($)" type="number" min="0" step="0.01" value={form.minBuyIn} onChange={(value) => setForm({ ...form, minBuyIn: value })} />
                  <TemplateField label="Maximum buy-in ($)" type="number" min="0" step="0.01" value={form.maxBuyIn} onChange={(value) => setForm({ ...form, maxBuyIn: value })} />
                </>
              ) : (
                <>
                  <TemplateField label="Entry fee ($)" type="number" min="0" step="0.01" value={form.entryFee} onChange={(value) => setForm({ ...form, entryFee: value })} />
                  <TemplateField label="Bounty ($)" type="number" min="0" step="0.01" value={form.bounty} onChange={(value) => setForm({ ...form, bounty: value })} />
                  <label className="text-sm font-medium text-muted">
                    Existing structure
                    <Select className="mt-1" value={form.structureId} onChange={(event) => setForm({ ...form, structureId: event.target.value })}>
                      <option value="">Create from blind plan below</option>
                      {structures.map((structure) => <option key={structure.id} value={structure.id}>{structure.name}</option>)}
                    </Select>
                  </label>
                </>
              )}
              <TemplateField label="Rake / fee ($)" type="number" min="0" step="0.01" value={form.rake} onChange={(value) => setForm({ ...form, rake: value })} />
            </div>
            {form.kind === 'tournament' && !form.structureId && (
              <div className="grid gap-3 sm:grid-cols-2">
                <TemplateField label="Structure name" value={form.structureName} onChange={(value) => setForm({ ...form, structureName: value })} />
                <TemplateField label="Starting stack" type="number" min="1" value={form.startingStack} onChange={(value) => setForm({ ...form, startingStack: value })} />
                <label className="text-sm font-medium text-muted sm:col-span-2">
                  Blind plan (SB/BB/ante/minutes; use break/minutes)
                  <textarea
                    className="mt-1 min-h-32 w-full rounded-lg border border-border bg-white px-3.5 py-2 font-mono text-sm text-ink"
                    value={form.levelPlan}
                    onChange={(event) => setForm({ ...form, levelPlan: event.target.value })}
                  />
                </label>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {form.kind === 'tournament' && (
                <label className="text-sm font-medium text-muted">
                  Payout rules (JSON)
                  <textarea
                    className="mt-1 min-h-24 w-full rounded-lg border border-border bg-white px-3.5 py-2 font-mono text-sm text-ink"
                    value={form.payoutRules}
                    onChange={(event) => setForm({ ...form, payoutRules: event.target.value })}
                  />
                </label>
              )}
              <TemplateField
                label="Reminder hours before game (comma separated)"
                value={form.reminders}
                onChange={(value) => setForm({ ...form, reminders: value })}
                placeholder="24,2"
              />
            </div>
            {contacts.length > 0 && (
              <fieldset>
                <legend className="mb-2 text-sm font-medium text-muted">Default invitees</legend>
                <div className="grid max-h-40 gap-1 overflow-y-auto rounded-lg border border-border p-2 sm:grid-cols-2 lg:grid-cols-3">
                  {contacts.map((contact) => (
                    <label key={contact.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-ink hover:bg-cream">
                      <input
                        type="checkbox"
                        className="accent-gold"
                        checked={selectedContacts.includes(contact.id)}
                        onChange={() => setSelectedContacts((prior) => prior.includes(contact.id) ? prior.filter((id) => id !== contact.id) : [...prior, contact.id])}
                      />
                      {contact.display_name}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            {groups.length > 0 && (
              <fieldset>
                <legend className="mb-2 text-sm font-medium text-muted">Default invite groups</legend>
                <div className="flex flex-wrap gap-2 rounded-lg border border-border p-2">
                  {groups.map((group) => (
                    <label key={group.id} className="flex cursor-pointer items-center gap-2 rounded bg-cream px-3 py-1.5 text-sm text-ink">
                      <input
                        type="checkbox"
                        className="accent-gold"
                        checked={selectedGroups.includes(group.id)}
                        onChange={() => setSelectedGroups((prior) => prior.includes(group.id) ? prior.filter((id) => id !== group.id) : [...prior, group.id])}
                      />
                      {group.name} ({group.memberContactIds.length})
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save template'}</Button>
          </form>
        </Card>
      )}
      {templatesQuery.isPending ? (
        <Card><p className="py-5 text-center text-sm text-muted">Loading templates…</p></Card>
      ) : templates.length === 0 ? (
        <Card><p className="py-5 text-center text-sm text-muted">No recurring templates yet.</p></Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {templates.map((template) => (
            <Card key={template.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-ink">{template.name}</p>
                    <Badge variant="gold">{template.kind}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {formatMoney(money(template.buy_in_minor, template.currency))}
                    {template.capacity ? ` · ${template.capacity} seats` : ' · open capacity'}
                  </p>
                  {template.recurrence_rule && <p className="mt-1 text-xs text-muted">{template.recurrence_rule}</p>}
                  <p className="mt-1 text-xs text-muted">
                    {template.inviteeContactIds.length} contacts · {template.inviteeGroupIds.length} groups
                  </p>
                </div>
                <LayoutTemplate className="h-5 w-5 text-gold" />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => onSchedule(template.id)}>Create game</Button>
                {canManage && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      try {
                        await setGameTemplateArchived(template.id, true)
                        await queryClient.invalidateQueries({ queryKey: templatesKey })
                      } catch (archiveError) {
                        onFailure(errorMessage(archiveError))
                      }
                    }}
                  >
                    Archive
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function TemplateField({
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
