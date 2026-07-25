import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, MapPin } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { formatDate } from '../lib/utils'
import type { Game } from '../types'

export function GamesPage() {
  const { user } = useAuthStore()
  const [games, setGames] = useState<(Game & { league_name: string })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!user) return
      const { data: memberLeagues } = await supabase
        .from('league_members')
        .select('league_id')
        .eq('user_id', user.id)

      const leagueIds = memberLeagues?.map((m) => m.league_id) ?? []
      if (leagueIds.length > 0) {
        const { data: gameData } = await supabase
          .from('games')
          .select('*, leagues(name)')
          .in('league_id', leagueIds)
          .order('scheduled_date', { ascending: true })

        setGames(
          (gameData ?? []).map((g) => ({
            ...g,
            league_name: (g as { leagues?: { name?: string } }).leagues?.name ?? '',
          }))
        )
      }
      setLoading(false)
    }
    load()
  }, [user])

  if (loading) return <div className="text-center text-gray-400 py-8">Loading...</div>

  const upcoming = games.filter((g) => g.status === 'scheduled')
  const past = games.filter((g) => g.status === 'completed')

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Games</h1>

      <div>
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-white">
          <Calendar className="h-5 w-5 text-gold" />
          Upcoming ({upcoming.length})
        </h2>
        {upcoming.length === 0 ? (
          <Card><p className="text-center text-sm text-gray-400 py-4">No upcoming games</p></Card>
        ) : (
          <div className="space-y-2">
            {upcoming.map((g) => (
              <Link key={g.id} to={`/leagues/${g.league_id}/games/${g.id}`}>
                <Card className="flex items-center justify-between hover:border-gold/50 transition-colors cursor-pointer">
                  <div>
                    <p className="font-medium text-white">{g.league_name}</p>
                    <p className="text-sm text-gray-400 mt-0.5">{formatDate(g.scheduled_date)}</p>
                    {g.location && (
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3" /> {g.location}
                      </p>
                    )}
                  </div>
                  <Badge variant="gold">Scheduled</Badge>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-base font-semibold text-white">Past ({past.length})</h2>
        {past.length === 0 ? (
          <Card><p className="text-center text-sm text-gray-400 py-4">No completed games yet</p></Card>
        ) : (
          <div className="space-y-2">
            {past.map((g) => (
              <Link key={g.id} to={`/leagues/${g.league_id}/games/${g.id}`}>
                <Card className="flex items-center justify-between hover:border-gold/50 transition-colors cursor-pointer">
                  <div>
                    <p className="font-medium text-white">{g.league_name}</p>
                    <p className="text-sm text-gray-400 mt-0.5">{formatDate(g.scheduled_date)}</p>
                  </div>
                  <Badge variant="green">Completed</Badge>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
