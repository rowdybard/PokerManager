import { Calendar, CircleDollarSign, MapPin, Scale, Trophy } from 'lucide-react'
import { Link } from 'react-router'
import type { HomeGameListItem, LeagueSummary } from '../../lib/homeGames'
import { gameDisplayName, gamePhaseLabel } from '../../lib/homeGames'
import type { CareerSession, Settlement } from '../../lib/pro'
import { formatDate, formatDateTime } from '../../lib/utils'
import { LedgerRow } from '../ui/LedgerRow'
import { MoneyValue } from '../ui/MoneyValue'
import { SectionHeader } from '../ui/SectionHeader'
import { Surface } from '../ui/Surface'

export function NextGameBrief({
  game,
}: {
  game: HomeGameListItem
}) {
  return (
    <Surface as="section" aria-labelledby="next-game-title" padding="md">
      <SectionHeader
        headingLevel={2}
        eyebrow={gamePhaseLabel(game.phase)}
        title={
          <span id="next-game-title">{gameDisplayName(game, game.league_name)}</span>
        }
        description={formatDateTime(game.scheduled_date)}
        action={
          <Link
            to={`/leagues/${game.league_id}/games/${game.id}`}
            className="inline-flex min-h-11 items-center text-sm font-semibold text-poker-green underline underline-offset-4"
          >
            Open game
          </Link>
        }
      />
      <dl className="mt-4 grid gap-px border border-rule bg-rule sm:grid-cols-3">
        <BriefFact icon={Trophy} label="League" value={game.league_name} />
        <BriefFact
          icon={CircleDollarSign}
          label={game.kind === 'cash' ? 'Buy-in' : 'Entry'}
          value={
            new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: game.currency,
              maximumFractionDigits: 0,
            }).format(Number(game.buy_in))
          }
        />
        <BriefFact
          icon={MapPin}
          label="Location"
          value={game.location || 'Not set'}
        />
      </dl>
    </Surface>
  )
}

function BriefFact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Trophy
  label: string
  value: string
}) {
  return (
    <div className="bg-ivory px-4 py-3">
      <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
        <Icon className="h-4 w-4 text-gold" aria-hidden="true" />
        {label}
      </dt>
      <dd className="mt-1 font-semibold text-ink tnum">{value}</dd>
    </div>
  )
}

export function ActiveLeagueBrief({
  league,
}: {
  league: LeagueSummary
}) {
  return (
    <Surface as="section" aria-labelledby="active-league-title" padding="md">
      <SectionHeader
        headingLevel={2}
        eyebrow="Active league"
        title={<span id="active-league-title">{league.name}</span>}
        description={`${league.role[0]?.toUpperCase()}${league.role.slice(1)} access`}
        action={
          <Link
            to={`/leagues/${league.id}`}
            className="inline-flex min-h-11 items-center text-sm font-semibold text-poker-green underline underline-offset-4"
          >
            View standings
          </Link>
        }
      />
    </Surface>
  )
}

export function RecentResultsLedger({
  sessions,
}: {
  sessions: CareerSession[]
}) {
  if (sessions.length === 0) return null

  return (
    <Surface as="section" aria-labelledby="recent-results-title" padding="none">
      <div className="px-4 pb-2 pt-4 sm:px-5">
        <SectionHeader
          headingLevel={2}
          title={<span id="recent-results-title">Recent results</span>}
          action={
            <Link
              to="/pro/sessions"
              className="text-sm font-semibold text-poker-green underline underline-offset-4"
            >
              View all
            </Link>
          }
        />
      </div>
      <div className="divide-y divide-rule border-t border-rule">
        {sessions.map((session) => (
          <LedgerRow
            key={session.id}
            leading={<Calendar className="h-4 w-4 text-gold" aria-hidden="true" />}
            title={formatDate(session.played_at)}
            meta={[
              session.game_variant,
              session.stakes,
              session.venue,
            ]
              .filter(Boolean)
              .join(' · ')}
            value={
              <MoneyValue
                value={session.profit_minor}
                minorUnits
                currency={session.currency}
                showPlus
              />
            }
          />
        ))}
      </div>
    </Surface>
  )
}

export function UnresolvedSettlementLedger({
  settlements,
}: {
  settlements: Settlement[]
}) {
  if (settlements.length === 0) return null

  return (
    <Surface as="section" aria-labelledby="unresolved-settlements-title" padding="none">
      <div className="px-4 pb-2 pt-4 sm:px-5">
        <SectionHeader
          headingLevel={2}
          title={
            <span id="unresolved-settlements-title">Unresolved settlements</span>
          }
          action={
            <Link
              to="/pro/settlements"
              className="text-sm font-semibold text-poker-green underline underline-offset-4"
            >
              Review
            </Link>
          }
        />
      </div>
      <div className="divide-y divide-rule border-t border-rule">
        {settlements.map((settlement) => (
          <LedgerRow
            key={settlement.id}
            leading={<Scale className="h-4 w-4 text-gold" aria-hidden="true" />}
            title={settlement.counterparty}
            meta={`${settlement.direction === 'payable' ? 'You owe' : 'Owed to you'} · ${settlement.reason}`}
            value={
              <MoneyValue
                value={settlement.amount_minor}
                minorUnits
                currency={settlement.currency}
                tone={settlement.direction === 'payable' ? 'loss' : 'profit'}
              />
            }
            detail={settlement.due_date ? `Due ${formatDate(settlement.due_date)}` : undefined}
          />
        ))}
      </div>
    </Surface>
  )
}
