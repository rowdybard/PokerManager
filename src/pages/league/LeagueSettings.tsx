import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Save, Trash2, UserPlus, Crown, ShieldCheck } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { InviteMembersModal } from '../../components/modals/InviteMembersModal'
import { Modal } from '../../components/ui/Modal'
import { errorMessage } from '../../lib/homeGames'
import { deleteLeagueTransactionally } from '../../lib/transactionalSafety'
import { useAuthStore } from '../../store/authStore'
import type { League, PointsSystem, LeagueMember, LeagueRole } from '../../types'

interface LeagueSettingsProps {
  league: League
  canManage: boolean
  isOwner: boolean
  onUpdated: (league: League) => void
}

export function LeagueSettings({
  league,
  canManage,
  isOwner,
  onUpdated,
}: LeagueSettingsProps) {
  const user = useAuthStore((state) => state.user)
  const queryClient = useQueryClient()
  const [name, setName] = useState(league.name)
  const [description, setDescription] = useState(league.description ?? '')
  const [pointsSystem, setPointsSystem] = useState<PointsSystem>(league.points_system)
  const [saved, setSaved] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const [showInvite, setShowInvite] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [deleting, setDeleting] = useState(false)
  const deleteInput = useRef<HTMLInputElement>(null)
  const deleteKey = useRef(crypto.randomUUID())
  const membersKey = ['home', 'league', league.id, 'members']
  const membersQuery = useQuery({
    queryKey: membersKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('league_members')
        .select('*')
        .eq('league_id', league.id)
        .order('joined_at')
      if (error) throw error
      return (data ?? []) as LeagueMember[]
    },
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!canManage || !user) throw new Error('League owner or admin access is required.')
      if (name.trim().length < 2) throw new Error('Enter a league name.')

      const scoringChanged =
        JSON.stringify(pointsSystem) !== JSON.stringify(league.points_system)
      let createdRuleId: string | null = null
      if (scoringChanged) {
        const { data: latest, error: latestError } = await supabase
          .from('league_scoring_rules')
          .select('version')
          .eq('league_id', league.id)
          .order('version', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (latestError) throw latestError
        const { data: created, error: ruleError } = await supabase
          .from('league_scoring_rules')
          .insert({
            league_id: league.id,
            version: Number(latest?.version ?? 0) + 1,
            name: `Scoring v${Number(latest?.version ?? 0) + 1}`,
            config: pointsSystem,
            created_by: user.id,
          })
          .select('id')
          .single()
        if (ruleError) throw ruleError
        createdRuleId = created.id
      }

      const { data, error } = await supabase
        .from('leagues')
        .update({
          name: name.trim(),
          description: description.trim() || null,
          points_system: pointsSystem,
        })
        .eq('id', league.id)
        .select()
        .single()
      if (error) {
        if (createdRuleId) {
          await supabase.from('league_scoring_rules').delete().eq('id', createdRuleId)
        }
        throw error
      }
      return data as League
    },
    onSuccess: (updated) => {
      setFailure(null)
      setSaved(true)
      window.setTimeout(() => setSaved(false), 2000)
      onUpdated(updated)
    },
    onError: (mutationError) => setFailure(errorMessage(mutationError)),
  })

  async function removeMember(userId: string) {
    try {
      const { error } = await supabase
        .from('league_members')
        .delete()
        .eq('league_id', league.id)
        .eq('user_id', userId)
      if (error) throw error
      await queryClient.invalidateQueries({ queryKey: membersKey })
    } catch (memberError) {
      setFailure(errorMessage(memberError))
    }
  }

  async function updateMemberRole(userId: string, role: LeagueRole) {
    try {
      const { error } = await supabase
        .from('league_members')
        .update({ role })
        .eq('league_id', league.id)
        .eq('user_id', userId)
      if (error) throw error
      await queryClient.invalidateQueries({ queryKey: membersKey })
    } catch (memberError) {
      setFailure(errorMessage(memberError))
    }
  }

  function updatePositionPoints(position: string, points: number) {
    setPointsSystem({
      ...pointsSystem,
      type: 'position',
      positionPoints: {
        ...(pointsSystem.positionPoints ?? {}),
        [position]: points,
      },
    })
  }

  function addPosition() {
    const existing = Object.keys(pointsSystem.positionPoints ?? {})
    const nextPosition = existing.length > 0 ? Math.max(...existing.map(Number)) + 1 : 1
    updatePositionPoints(String(nextPosition), 0)
  }

  function removePosition(position: string) {
    const positionPoints = { ...(pointsSystem.positionPoints ?? {}) }
    delete positionPoints[position]
    setPointsSystem({ ...pointsSystem, positionPoints })
  }

  async function deleteLeague() {
    if (!isOwner || deleteConfirmation !== league.name) return
    setDeleting(true)
    setFailure(null)
    try {
      await deleteLeagueTransactionally({
        leagueId: league.id,
        confirmationName: deleteConfirmation,
        idempotencyKey: deleteKey.current,
      })
      window.location.assign('/')
    } catch (deleteError) {
      setFailure(errorMessage(deleteError))
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      {failure && <Card className="border-danger/30 bg-danger/5 py-3 text-sm text-danger" role="alert">{failure}</Card>}

      <Card>
        <CardHeader>
          <CardTitle>League info</CardTitle>
          {!canManage && <p className="text-sm text-muted">Only an owner or admin can edit league settings.</p>}
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="block space-y-1.5 text-sm font-medium text-muted">
            Name
            <Input value={name} onChange={(event) => setName(event.target.value)} disabled={!canManage} />
          </label>
          <label className="block space-y-1.5 text-sm font-medium text-muted">
            Description
            <Input value={description} onChange={(event) => setDescription(event.target.value)} disabled={!canManage} />
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Versioned points system</CardTitle>
          <p className="text-sm text-muted">Saving a scoring change creates a new version. Existing finalized games stay tied to their original rules.</p>
        </CardHeader>
        <CardContent className="space-y-2">
          {Object.entries(pointsSystem.positionPoints ?? {})
            .sort(([left], [right]) => Number(left) - Number(right))
            .map(([position, points]) => (
              <div key={position} className="flex items-center gap-2">
                <span className="w-20 text-sm text-muted">Position {position}</span>
                <Input
                  type="number"
                  value={points}
                  onChange={(event) => updatePositionPoints(position, Number(event.target.value))}
                  className="w-24"
                  disabled={!canManage}
                />
                <span className="text-sm text-muted">pts</span>
                {canManage && (
                  <button
                    type="button"
                    aria-label={`Remove position ${position}`}
                    onClick={() => removePosition(position)}
                    className="ml-auto rounded p-2 text-muted hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          <div className="flex items-center gap-2 pt-2">
            <span className="w-20 text-sm text-muted">Participation</span>
            <Input
              type="number"
              value={pointsSystem.participationPoints ?? 0}
              onChange={(event) => setPointsSystem({ ...pointsSystem, participationPoints: Number(event.target.value) })}
              className="w-24"
              disabled={!canManage}
            />
            <span className="text-sm text-muted">pts</span>
          </div>
          {canManage && <Button size="sm" variant="secondary" onClick={addPosition}>Add position</Button>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Members</CardTitle>
              <p className="mt-1 text-sm text-muted">Admins can run games. Only the owner can change access.</p>
            </div>
            {isOwner && (
              <Button size="sm" variant="secondary" onClick={() => setShowInvite(true)}>
                <UserPlus className="mr-1 h-4 w-4" /> Invite
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {membersQuery.isPending ? (
            <p className="text-sm text-muted">Loading members…</p>
          ) : (membersQuery.data ?? []).map((member) => (
            <div key={member.user_id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
              {member.role === 'owner' ? <Crown className="h-4 w-4 text-gold" /> : member.role === 'admin' ? <ShieldCheck className="h-4 w-4 text-poker-green" /> : <span className="h-4 w-4" />}
              <span className="min-w-0 flex-1 truncate text-sm text-ink">{member.user_id === user?.id ? 'You' : member.user_id}</span>
              {member.role === 'owner' ? (
                <Badge variant="gold">Owner</Badge>
              ) : isOwner ? (
                <>
                  <select
                    value={member.role}
                    aria-label={`Role for ${member.user_id}`}
                    onChange={(event) => void updateMemberRole(member.user_id, event.target.value as LeagueRole)}
                    className="rounded border border-border bg-white px-2 py-1 text-xs text-ink"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    type="button"
                    aria-label={`Remove member ${member.user_id}`}
                    onClick={() => void removeMember(member.user_id)}
                    className="rounded p-2 text-muted hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <Badge>{member.role}</Badge>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {canManage && (
        <div className="flex items-center gap-3">
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            <Save className="mr-1 h-4 w-4" />
            {saveMutation.isPending ? 'Saving…' : 'Save changes'}
          </Button>
          {saved && <span className="text-sm font-medium text-success">Saved</span>}
        </div>
      )}

      {isOwner && (
        <Card className="border-danger/30">
          <CardHeader><CardTitle className="text-danger">Danger zone</CardTitle></CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              size="md"
              onClick={() => {
                deleteKey.current = crypto.randomUUID()
                setDeleteConfirmation('')
                setDeleteOpen(true)
              }}
            >
              <Trash2 className="mr-1 h-4 w-4" /> Delete league
            </Button>
          </CardContent>
        </Card>
      )}

      <InviteMembersModal
        open={showInvite}
        onClose={() => setShowInvite(false)}
        leagueId={league.id}
        leagueName={league.name}
      />
      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete league"
        initialFocusRef={deleteInput}
        dismissible={!deleting}
      >
        <p className="text-sm text-muted">
          This permanently deletes the league, its games, and its results. Independent contacts
          are preserved.
        </p>
        <label className="mt-4 block space-y-1.5 text-sm font-medium text-ink">
          Type <strong>{league.name}</strong> to confirm
          <Input
            ref={deleteInput}
            autoComplete="off"
            value={deleteConfirmation}
            onChange={(event) => setDeleteConfirmation(event.target.value)}
          />
        </label>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            disabled={deleting}
            onClick={() => setDeleteOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={deleting || deleteConfirmation !== league.name}
            onClick={() => void deleteLeague()}
          >
            {deleting ? 'Deleting…' : 'Delete league'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
