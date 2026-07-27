import { Link } from 'react-router'
import type { StandingEntry } from '../../types'
import { MoneyValue } from '../ui/MoneyValue'
import { RankMedallion } from '../ui/RankMedallion'
import { ScoreTable, type ScoreTableColumn } from '../ui/ScoreTable'
import { SectionHeader } from '../ui/SectionHeader'
import { Surface } from '../ui/Surface'

export function LeagueStandings({
  leagueId,
  seasonName,
  standings,
  pending,
}: {
  leagueId: string
  seasonName: string
  standings: StandingEntry[]
  pending: boolean
}) {
  const columns: ScoreTableColumn<StandingEntry>[] = [
    {
      key: 'rank',
      header: 'Rank',
      render: (standing) => <RankMedallion rank={standing.rank} />,
      align: 'center',
      numeric: true,
      className: 'w-20',
    },
    {
      key: 'player',
      header: 'Player',
      render: (standing) => (
        <Link
          to={`/leagues/${leagueId}/players/${standing.playerId}`}
          className="font-semibold text-ink underline-offset-4 hover:underline"
        >
          {standing.displayName}
        </Link>
      ),
      rowHeader: true,
      mobile: 'primary',
    },
    {
      key: 'points',
      header: 'Points',
      label: 'Pts',
      render: (standing) => standing.totalPoints.toLocaleString(),
      align: 'end',
      numeric: true,
    },
    {
      key: 'games',
      header: 'Games',
      render: (standing) => standing.gamesPlayed.toLocaleString(),
      align: 'end',
      numeric: true,
    },
    {
      key: 'wins',
      header: 'Wins',
      render: (standing) => standing.wins.toLocaleString(),
      align: 'end',
      numeric: true,
    },
    {
      key: 'net',
      header: 'Net',
      render: (standing) =>
        standing.netProfitMinor === null || standing.currency === null ? (
          <span className="text-muted">Unavailable</span>
        ) : (
          <MoneyValue
            value={standing.netProfitMinor}
            currency={standing.currency}
            minorUnits
            showPlus
          />
        ),
      align: 'end',
      numeric: true,
    },
  ]

  return (
    <Surface as="section" aria-labelledby="league-standings-title" padding="none">
      <div className="px-4 pb-3 pt-4 sm:px-5">
        <SectionHeader
          headingLevel={2}
          eyebrow={seasonName}
          title={<span id="league-standings-title">League standings</span>}
          description="Finalized games only. Ties are ordered by wins, then net result."
        />
      </div>
      {pending ? (
        <p className="px-5 py-8 text-center text-sm text-muted" role="status">
          Loading standings…
        </p>
      ) : (
        <ScoreTable
          className="border-x-0 border-b-0"
          rows={standings}
          columns={columns}
          getRowKey={(standing) => standing.playerId}
          getRowLabel={(standing) =>
            `Rank ${standing.rank}, ${standing.displayName}, ${standing.totalPoints} points`
          }
          caption={`${seasonName} league standings`}
          empty="No finalized results in this season."
        />
      )}
    </Surface>
  )
}
