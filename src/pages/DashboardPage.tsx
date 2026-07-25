import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Trophy, Calendar, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { formatDate } from '../lib/utils'
import { CreateLeagueModal } from '../components/modals/CreateLeagueModal'
import type { League, Game } from '../types'

export function DashboardPage() {
  const { user } = useAuthStore()
  const [leagues, setLeagues] = useState<League[]>([])
  const [upcomingGames, setUpcomingGames] = useState<(Game & { league_name: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateLeague, setShowCreateLeague] = useState(false)

  useEffect(() => {
    async function loadData() {
      if (!user) return

      const { data: memberLeagues } = await supabase
        .from('league_members')
        .select('league_id')
        .eq('user_id', user.id)

      const leagueIds = memberLeagues?.map((m) => m.league_id) ?? []

      if (leagueIds.length > 0) {
        const { data: leagueData } = await supabase
          .from('leagues')
          .select('*')
          .in('id', leagueIds)
        setLeagues(leagueData ?? [])

        const { data: games } = await supabase
          .from('games')
          .select('*, leagues(name)')
          .in('league_id', leagueIds)
          .eq('status', 'scheduled')
          .gte('scheduled_date', new Date().toISOString())
          .order('scheduled_date', { ascending: true })
          .limit(5)

        setUpcomingGames(
          (games ?? []).map((g) => ({
            ...g,
            league_name: (g as { leagues?: { name?: string } }).leagues?.name ?? '',
          }))
        )
      }

      setLoading(false)
    }
    loadData()
  }, [user])

  if (loading) {
    return <div className="text-center text-gray-400 py-8">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <Button size="sm" onClick={() => setShowCreateLeague(true)}>
          <Plus className="mr-1 h-4 w-4" />
          New League
        </Button>
      </div>

      {/* Upcoming games */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
          <Calendar className="h-5 w-5 text-gold" />
          Upcoming Games
        </h2>
        {upcomingGames.length === 0 ? (
          <Card>
            <p className="text-center text-sm text-gray-400 py-4">No upcoming games scheduled</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {upcomingGames.map((game) => (
              <Link key={game.id} to={`/leagues/${game.league_id}/games/${game.id}`}>
                <Card className="hover:border-gold/50 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">{game.league_name}</p>
                      <p className="text-sm text-gray-400">{formatDate(game.scheduled_date)}</p>
                    </div>
                    {game.location && (
                      <Badge variant="default">{game.location}</Badge>
                    )}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Leagues */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
          <Trophy className="h-5 w-5 text-gold" />
          Your Leagues
        </h2>
        {leagues.length === 0 ? (
          <Card>
            <div className="text-center py-6">
              <Users className="mx-auto mb-2 h-8 w-8 text-gray-600" />
              <p className="text-sm text-gray-400 mb-3">No leagues yet. Create one to get started!</p>
              <Button size="sm" onClick={() => setShowCreateLeague(true)}>
                <Plus className="mr-1 h-4 w-4" />
                Create League
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-2">
            {leagues.map((league) => (
              <Link key={league.id} to={`/leagues/${league.id}`}>
                <Card className="hover:border-gold/50 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">{league.name}</p>
                      {league.description && (
                        <p className="text-sm text-gray-400">{league.description}</p>
                      )}
                    </div>
                    <Trophy className="h-5 w-5 text-gray-600" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <CreateLeagueModal
        open={showCreateLeague}
        onClose={() => setShowCreateLeague(false)}
        onCreated={(league) => setLeagues((prev) => [...prev, league])}
      />
    </div>
  )
}
