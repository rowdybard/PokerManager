import { useState, useEffect } from 'react'
import { Save, Trash2, UserPlus, Crown } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { InviteMembersModal } from '../../components/modals/InviteMembersModal'
import type { League, PointsSystem, LeagueMember } from '../../types'

interface LeagueSettingsProps {
  league: League
  onUpdated: (league: League) => void
}

export function LeagueSettings({ league, onUpdated }: LeagueSettingsProps) {
  const [name, setName] = useState(league.name)
  const [description, setDescription] = useState(league.description ?? '')
  const [pointsSystem, setPointsSystem] = useState<PointsSystem>(
    league.points_system as PointsSystem
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [members, setMembers] = useState<(LeagueMember & { email?: string })[]>([])
  const [showInvite, setShowInvite] = useState(false)

  useEffect(() => {
    loadMembers()
  }, [league.id])

  async function loadMembers() {
    const { data } = await supabase
      .from('league_members')
      .select('*')
      .eq('league_id', league.id)
    setMembers(data ?? [])
  }

  async function removeMember(userId: string) {
    await supabase
      .from('league_members')
      .delete()
      .eq('league_id', league.id)
      .eq('user_id', userId)
    loadMembers()
  }

  async function updateMemberRole(userId: string, role: string) {
    await supabase
      .from('league_members')
      .update({ role })
      .eq('league_id', league.id)
      .eq('user_id', userId)
    loadMembers()
  }

  async function handleSave() {
    setSaving(true)
    const { data, error } = await supabase
      .from('leagues')
      .update({
        name,
        description: description || null,
        points_system: pointsSystem,
      })
      .eq('id', league.id)
      .select()
      .single()

    if (!error && data) {
      onUpdated(data)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
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
    const nextPos = existing.length > 0 ? Math.max(...existing.map(Number)) + 1 : 1
    updatePositionPoints(String(nextPos), 0)
  }

  function removePosition(position: string) {
    const newPoints = { ...(pointsSystem.positionPoints ?? {}) }
    delete newPoints[position]
    setPointsSystem({ ...pointsSystem, positionPoints: newPoints })
  }

  async function deleteLeague() {
    if (!confirm('Delete this league and all its data? This cannot be undone.')) return
    await supabase.from('leagues').delete().eq('id', league.id)
    window.location.href = '/'
  }

  return (
    <div className="space-y-4">
      {/* Basic info */}
      <Card>
        <CardHeader><CardTitle>League Info</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm text-gray-400">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-gray-400">Description</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Points system */}
      <Card>
        <CardHeader>
          <CardTitle>Points System</CardTitle>
          <p className="text-sm text-gray-400">Set points for each finishing position</p>
        </CardHeader>
        <CardContent className="space-y-2">
          {Object.entries(pointsSystem.positionPoints ?? {})
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([position, points]) => (
              <div key={position} className="flex items-center gap-2">
                <span className="w-16 text-sm text-gray-400">Position {position}</span>
                <Input
                  type="number"
                  value={points}
                  onChange={(e) => updatePositionPoints(position, Number(e.target.value))}
                  className="w-24"
                />
                <span className="text-sm text-gray-500">pts</span>
                <button
                  onClick={() => removePosition(position)}
                  className="ml-auto text-gray-600 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          <div className="space-y-2 pt-2">
            <div className="flex items-center gap-2">
              <span className="w-16 text-sm text-gray-400">Participation</span>
              <Input
                type="number"
                value={pointsSystem.participationPoints ?? 0}
                onChange={(e) =>
                  setPointsSystem({ ...pointsSystem, participationPoints: Number(e.target.value) })
                }
                className="w-24"
              />
              <span className="text-sm text-gray-500">pts (non-cashers)</span>
            </div>
          </div>
          <Button size="sm" variant="secondary" onClick={addPosition}>
            Add Position
          </Button>
        </CardContent>
      </Card>

      {/* Members */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Members</CardTitle>
            <Button size="sm" variant="secondary" onClick={() => setShowInvite(true)}>
              <UserPlus className="mr-1 h-4 w-4" />
              Invite
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {members.length === 0 ? (
            <p className="text-sm text-gray-400">No members yet</p>
          ) : (
            members.map((m) => (
              <div key={m.user_id} className="flex items-center gap-2">
                <Crown className={`h-4 w-4 ${m.role === 'owner' ? 'text-gold' : 'text-gray-600'}`} />
                <span className="flex-1 text-sm text-white">{m.role}</span>
                {m.role !== 'owner' && (
                  <>
                    <select
                      value={m.role}
                      onChange={(e) => updateMemberRole(m.user_id, e.target.value)}
                      className="rounded border border-border bg-card px-2 py-1 text-xs text-white"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      onClick={() => removeMember(m.user_id)}
                      className="text-gray-600 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
                {m.role === 'owner' && <Badge variant="gold">Owner</Badge>}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-1 h-4 w-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
        {saved && <span className="text-sm text-green-400">Saved!</span>}
      </div>

      {/* Danger zone */}
      <Card className="border-red-900/50">
        <CardHeader><CardTitle className="text-red-400">Danger Zone</CardTitle></CardHeader>
        <CardContent>
          <Button variant="danger" size="sm" onClick={deleteLeague}>
            <Trash2 className="mr-1 h-4 w-4" />
            Delete League
          </Button>
        </CardContent>
      </Card>

      <InviteMembersModal
        open={showInvite}
        onClose={() => setShowInvite(false)}
        leagueId={league.id}
        leagueName={league.name}
      />
    </div>
  )
}
