import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Trophy, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { CreateLeagueModal } from '../components/modals/CreateLeagueModal'
import type { League } from '../types'

export function LeaguesPage() {
  const { user } = useAuthStore()
  const [leagues, setLeagues] = useState<League[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    async function load() {
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
      }
      setLoading(false)
    }
    load()
  }, [user])

  if (loading) return <div className="text-center text-gray-400 py-8">Loading...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Leagues</h1>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="mr-1 h-4 w-4" />
          New
        </Button>
      </div>

      {leagues.length === 0 ? (
        <Card>
          <div className="text-center py-6">
            <Users className="mx-auto mb-2 h-8 w-8 text-gray-600" />
            <p className="text-sm text-gray-400 mb-3">No leagues yet. Create one to get started!</p>
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="mr-1 h-4 w-4" />
              Create League
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {leagues.map((league) => (
            <Link key={league.id} to={`/leagues/${league.id}`}>
              <Card className="flex items-center gap-3 hover:border-gold/50 transition-colors cursor-pointer">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-poker-green">
                  <Trophy className="h-5 w-5 text-gold" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-white">{league.name}</p>
                  {league.description && <p className="text-sm text-gray-400 mt-0.5">{league.description}</p>}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <CreateLeagueModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(league) => setLeagues((prev) => [...prev, league])}
      />
    </div>
  )
}
