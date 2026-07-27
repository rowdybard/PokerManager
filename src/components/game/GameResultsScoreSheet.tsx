import { Pencil } from 'lucide-react'
import type { GameResult, Player } from '../../types'
import { MoneyValue } from '../ui/MoneyValue'
import { RankMedallion } from '../ui/RankMedallion'
import { ScoreTable, type ScoreTableColumn } from '../ui/ScoreTable'

export function GameResultsScoreSheet({
  results,
  players,
  currency,
  readOnly,
  onCorrect,
}: {
  results: GameResult[]
  players: Player[]
  currency: string
  readOnly: boolean
  onCorrect: (result: GameResult, playerName: string) => void
}) {
  const nameByPlayer = new Map(
    players.map((player) => [player.id, player.display_name]),
  )
  const columns: ScoreTableColumn<GameResult>[] = [
    {
      key: 'finish',
      header: 'Finish',
      label: 'Place',
      render: (result) => <RankMedallion rank={result.finish_position} />,
      align: 'center',
      numeric: true,
      mobile: 'leading',
      className: 'w-20',
    },
    {
      key: 'player',
      header: 'Player',
      render: (result) => nameByPlayer.get(result.player_id) ?? 'Unknown player',
      rowHeader: true,
      mobile: 'primary',
    },
    {
      key: 'entries',
      header: 'Re-entries',
      label: 'Re-entries',
      render: (result) => result.rebuys.toLocaleString(),
      align: 'end',
      numeric: true,
    },
    {
      key: 'points',
      header: 'Points',
      render: (result) => Number(result.points_earned).toLocaleString(),
      align: 'end',
      numeric: true,
    },
    {
      key: 'payout',
      header: 'Payout',
      render: (result) =>
        result.payout_minor === null || result.payout_minor === undefined ? (
          <span className="text-muted">Incomplete</span>
        ) : (
          <MoneyValue
            value={result.payout_minor}
            minorUnits
            currency={currency}
            tone="neutral"
          />
        ),
      align: 'end',
      numeric: true,
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      label: 'Actions',
      render: (result) => {
        const playerName = nameByPlayer.get(result.player_id) ?? 'player'
        return readOnly ? null : (
          <button
            type="button"
            aria-label={`Correct result for ${playerName}`}
            className="inline-flex min-h-11 min-w-11 items-center justify-center text-muted hover:text-ink"
            onClick={() => onCorrect(result, playerName)}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </button>
        )
      },
      align: 'end',
      mobile: readOnly ? 'hide' : 'show',
      className: 'w-16',
    },
  ]

  return (
    <ScoreTable
      rows={results}
      columns={columns}
      getRowKey={(result) => result.id}
      getRowLabel={(result) =>
        `${nameByPlayer.get(result.player_id) ?? 'Unknown player'}, finish ${result.finish_position}`
      }
      caption="Recorded game results"
      empty="No results recorded."
    />
  )
}
