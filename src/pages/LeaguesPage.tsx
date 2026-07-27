import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router'
import { Crown, Plus, ShieldCheck, Trophy, Users } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { SectionHeader } from '../components/ui/SectionHeader'
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

  if (query.isPending) {
    return (
      <div className="py-12 text-center text-muted" role="status">
        Loading leagues…
      </div>
    )
  }
  const leagues = query.data ?? []

  return (
    <div className="space-y-5">
      <SectionHeader
        headingLevel={1}
        title="Leagues"
        className="items-stretch pb-4 sm:items-end [&>div:last-child]:w-full sm:[&>div:last-child]:w-auto"
        action={
          <Button size="md" className="w-full gap-2 sm:w-auto" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New league
          </Button>
        }
      />

      {query.isError ? (
        <div className="border-l-4 border-danger bg-danger/5 p-4 text-sm text-danger" role="alert">
          Could not load leagues. Refresh to try again.
        </div>
      ) : null}

      {leagues.length === 0 ? (
        <section className="border border-rule bg-ivory px-5 py-10 text-center">
          <Users className="mx-auto mb-3 h-9 w-9 text-muted" aria-hidden="true" />
          <p className="mb-4 text-sm text-muted">No leagues.</p>
          <Button className="min-h-11 gap-2" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create league
          </Button>
        </section>
      ) : (
        <section aria-label="Your leagues" className="border border-rule bg-ivory">
          <ul className="divide-y divide-rule">
            {leagues.map((league) => {
              const RoleIcon =
                league.role === 'owner' ? Crown : league.role === 'admin' ? ShieldCheck : Users
              return (
                <li key={league.id}>
                  <Link
                    to={`/leagues/${league.id}`}
                    className="grid min-h-20 gap-3 px-4 py-3 hover:bg-cream sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center"
                  >
                    <span className="hidden h-10 w-10 items-center justify-center border border-gold/40 bg-felt text-gold-leaf sm:flex">
                      <Trophy className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-lg font-semibold text-ink">
                        {league.name}
                      </span>
                      {league.description ? (
                        <span className="mt-1 line-clamp-2 block text-sm text-muted">
                          {league.description}
                        </span>
                      ) : null}
                    </span>
                    <Badge
                      className="w-fit capitalize"
                      variant={league.role === 'member' ? 'default' : 'gold'}
                    >
                      <RoleIcon className="mr-1 h-3 w-3" aria-hidden="true" />
                      {league.role}
                    </Badge>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <CreateLeagueModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => void queryClient.invalidateQueries({ queryKey: ['home', 'leagues', userId] })}
      />
    </div>
  )
}
