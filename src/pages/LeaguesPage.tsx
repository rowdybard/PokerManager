import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router'
import { Crown, Plus, ShieldCheck, Trophy, Users } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { CreateLeagueModal } from '../components/modals/CreateLeagueModal'
import { loadLeaguesForUser } from '../lib/homeGames'

export function LeaguesPage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const userId = user?.id ?? ''
  const query = useQuery({
    queryKey: ['home', 'leagues', userId],
    queryFn: () => loadLeaguesForUser(userId),
    enabled: Boolean(userId),
  })

  if (query.isPending) return <div className="py-12 text-center text-muted">Loading leagues…</div>
  const leagues = query.data ?? []

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-ink">Leagues</h1>
          <p className="mt-1 text-sm text-muted">Your recurring games, rosters, seasons, and standings.</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="mr-1 h-4 w-4" />
          New league
        </Button>
      </div>

      {query.isError && (
        <Card className="border-danger/30 bg-danger/5 text-sm text-danger" role="alert">
          Could not load leagues. Refresh to try again.
        </Card>
      )}

      {leagues.length === 0 ? (
        <Card>
          <div className="py-10 text-center">
            <Users className="mx-auto mb-3 h-10 w-10 text-border" />
            <p className="mb-4 text-sm text-muted">No leagues yet.</p>
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="mr-1 h-4 w-4" />
              Create league
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {leagues.map((league) => {
            const RoleIcon = league.role === 'owner' ? Crown : league.role === 'admin' ? ShieldCheck : Users
            return (
              <Link key={league.id} to={`/leagues/${league.id}`}>
                <Card className="h-full cursor-pointer transition-colors hover:border-gold/50">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-poker-green">
                      <Trophy className="h-5 w-5 text-gold-light" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-lg font-semibold text-ink">{league.name}</p>
                        <Badge variant={league.role === 'member' ? 'default' : 'gold'}>
                          <RoleIcon className="mr-1 h-3 w-3" />
                          {league.role}
                        </Badge>
                      </div>
                      {league.description && (
                        <p className="mt-1 line-clamp-2 text-sm text-muted">{league.description}</p>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      <CreateLeagueModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => void queryClient.invalidateQueries({ queryKey: ['home', 'leagues', userId] })}
      />
    </div>
  )
}
