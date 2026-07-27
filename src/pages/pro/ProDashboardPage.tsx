import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import {
  Activity,
  ArrowRight,
  Banknote,
  CalendarClock,
  Clock3,
  Gauge,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
} from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import {
  MetricCard,
  ProError,
  ProLoading,
  ProPage,
  useProResource,
} from '../../components/pro'
import { useAuthStore } from '../../store/authStore'
import {
  calculateCareerMetrics,
  dashboardMetricCurrencies,
  formatDate,
  formatDateTime,
  formatMinor,
  loadDashboardData,
  type CareerSession,
} from '../../lib/pro'
import { cn } from '../../lib/utils'

function sessionLabel(session: CareerSession): string {
  return session.venue || (session.medium === 'online' ? 'Online session' : 'Live session')
}

export function ProDashboardPage() {
  const ownerId = useAuthStore((state) => state.user?.id)
  const resource = useProResource(['pro', 'dashboard', ownerId], () => {
    if (!ownerId) throw new Error('Sign in to view My Poker.')
    return loadDashboardData(ownerId)
  })
  const availableCurrencies = useMemo(
    () => (resource.data ? dashboardMetricCurrencies(resource.data) : ['USD']),
    [resource.data],
  )
  const [selectedCurrency, setSelectedCurrency] = useState('USD')
  const currency = availableCurrencies.includes(selectedCurrency)
    ? selectedCurrency
    : availableCurrencies[0]
  const metrics = resource.data ? calculateCareerMetrics(resource.data, currency) : null

  return (
    <ProPage
      title="Overview"
      description="Results, bankroll, schedule, goals, and study."
      actions={
        <>
          <Link
            to="/pro/sessions"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border border-felt bg-felt px-4 text-sm font-semibold leading-none text-ivory hover:border-felt-deep hover:bg-felt-deep"
          >
            Record session
          </Link>
          <select
            aria-label="Overview currency"
            className="h-11 rounded-sm border border-rule-strong bg-white px-3 text-sm font-semibold text-ink"
            value={currency}
            onChange={(event) => setSelectedCurrency(event.target.value)}
          >
            {availableCurrencies.map((code) => (
              <option className="text-ink" value={code} key={code}>
                {code}
              </option>
            ))}
          </select>
        </>
      }
    >
      {resource.loading ? <ProLoading /> : null}
      {resource.error ? <ProError error={resource.error} retry={resource.reload} /> : null}
      {resource.data && metrics ? (
        <>
          <section
            aria-label="Career metrics"
            className="grid border border-rule bg-ivory sm:grid-cols-2 xl:grid-cols-4"
          >
            <MetricCard
              label="Career profit"
              value={formatMinor(metrics.totalProfitMinor, currency)}
              detail={`${metrics.sessionCount} trusted sessions`}
              icon={metrics.totalProfitMinor.startsWith('-') ? TrendingDown : TrendingUp}
              tone={metrics.totalProfitMinor.startsWith('-') ? 'negative' : 'positive'}
            />
            <MetricCard
              label="Tracked bankroll"
              value={formatMinor(metrics.bankrollMinor, currency)}
              detail="Across active accounts"
              icon={Banknote}
              tone="gold"
            />
            <MetricCard
              label="Hourly"
              value={
                metrics.hourlyMinor === null ? '—' : formatMinor(metrics.hourlyMinor, currency)
              }
              detail={`${Math.round(metrics.totalMinutes / 60)} hours tracked`}
              icon={Clock3}
            />
            <MetricCard
              label="Maximum drawdown"
              value={formatMinor(metrics.drawdownMinor, currency)}
              detail="From a prior career peak"
              icon={Gauge}
              tone={metrics.drawdownMinor === '0' ? 'default' : 'negative'}
            />
          </section>

          <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>Performance mix</CardTitle>
                  <p className="text-sm text-muted">Trusted sessions in {currency}</p>
                </div>
                <Activity className="h-5 w-5 text-gold" aria-hidden="true" />
              </CardHeader>
              <CardContent className="space-y-5">
                <PerformanceRow
                  label="Cash"
                  amount={metrics.cashProfitMinor}
                  total={metrics.totalProfitMinor}
                  currency={currency}
                />
                <PerformanceRow
                  label="Tournaments"
                  amount={metrics.tournamentProfitMinor}
                  total={metrics.totalProfitMinor}
                  currency={currency}
                />
                <div className="grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-4">
                  <MiniMetric label="ROI" value={metrics.roiPercent === null ? '—' : `${metrics.roiPercent.toFixed(1)}%`} />
                  <MiniMetric
                    label="ITM"
                    value={
                      metrics.tournamentCount
                        ? `${((metrics.tournamentCashes / metrics.tournamentCount) * 100).toFixed(0)}%`
                        : '—'
                    }
                  />
                  <MiniMetric
                    label="ABI"
                    value={metrics.abiMinor === null ? '—' : formatMinor(metrics.abiMinor, currency)}
                  />
                  <MiniMetric label="Entries" value={metrics.tournamentEntries.toLocaleString()} />
                  <MiniMetric
                    label="bb/100"
                    value={metrics.bbPer100 === null ? '—' : metrics.bbPer100.toFixed(2)}
                  />
                  <MiniMetric
                    label="bb/hour"
                    value={metrics.bbPerHour === null ? '—' : metrics.bbPerHour.toFixed(2)}
                  />
                  <MiniMetric label="Hands" value={metrics.totalHands.toLocaleString()} />
                  <MiniMetric
                    label="Volume"
                    value={`${metrics.sessionCount} sessions · ${Math.round(metrics.totalMinutes / 60)}h`}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle>Goals</CardTitle>
                <Target className="h-5 w-5 text-gold" aria-hidden="true" />
              </CardHeader>
              <CardContent>
                {resource.data.goals.filter((goal) => goal.status === 'active').length ? (
                  <div className="space-y-3">
                    {resource.data.goals
                      .filter((goal) => goal.status === 'active')
                      .slice(0, 4)
                      .map((goal) => {
                        const current = Number(goal.current_value ?? 0)
                        const target = Number(goal.target_value ?? 0)
                        const progress =
                          target > 0 ? Math.max(0, Math.min(100, (current / target) * 100)) : 0
                        return (
                          <div key={goal.id}>
                            <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                              <span className="truncate font-medium text-ink">{goal.title}</span>
                              <span className="shrink-0 text-xs text-muted">
                                {goal.due_on ? formatDate(goal.due_on) : 'Ongoing'}
                              </span>
                            </div>
                            <div
                              className="h-2 overflow-hidden rounded-full bg-cream"
                              role="progressbar"
                              aria-label={goal.title}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-valuenow={Math.round(progress)}
                            >
                              <div
                                className="h-full rounded-full bg-poker-green"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    <Link className="inline-flex items-center gap-1 text-sm font-semibold text-poker-green" to="/pro/study">
                      Manage goals <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </div>
                ) : (
                  <div className="py-5 text-center">
                    <Target className="mx-auto h-7 w-7 text-muted" aria-hidden="true" />
                    <p className="mt-2 text-sm text-muted">No active goals yet.</p>
                    <Link className="mt-2 inline-block text-sm font-semibold text-poker-green" to="/pro/study">
                      Set a goal
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle>Recent sessions</CardTitle>
                <Trophy className="h-5 w-5 text-gold" aria-hidden="true" />
              </CardHeader>
              <CardContent>
                {resource.data.sessions.length ? (
                  <div className="divide-y divide-border">
                    {resource.data.sessions.slice(0, 6).map((session) => (
                      <div key={session.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-semibold text-ink">{sessionLabel(session)}</p>
                            {session.data_quality === 'legacy_incomplete' ? (
                              <Badge variant="gold">Unreconciled</Badge>
                            ) : null}
                          </div>
                          <p className="text-xs text-muted">
                            {formatDate(session.played_at)} · {session.session_kind} · {session.game_variant}
                          </p>
                        </div>
                        <p
                          className={cn(
                            'shrink-0 text-sm font-bold tabular-nums',
                            BigInt(session.profit_minor) >= 0n ? 'text-success' : 'text-danger',
                          )}
                        >
                          {formatMinor(session.profit_minor, session.currency)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-muted">
                    Record the first session to start career analytics.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle>Coming up</CardTitle>
                <CalendarClock className="h-5 w-5 text-gold" aria-hidden="true" />
              </CardHeader>
              <CardContent>
                {resource.data.upcomingEvents.length ? (
                  <div className="space-y-3">
                    {resource.data.upcomingEvents.slice(0, 6).map((event) => (
                      <div className="flex items-start gap-3 rounded-lg bg-cream p-3" key={event.id}>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-ink">{event.title}</p>
                          <p className="text-xs text-muted">
                            {formatDateTime(event.starts_at)}
                            {event.location ? ` · ${event.location}` : ''}
                          </p>
                        </div>
                        <Badge variant="green">{event.event_type}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-muted">Nothing scheduled.</p>
                )}
              </CardContent>
            </Card>
          </section>
        </>
      ) : null}
    </ProPage>
  )
}

function PerformanceRow({
  label,
  amount,
  total,
  currency,
}: {
  label: string
  amount: string
  total: string
  currency: string
}) {
  const absoluteTotal = [BigInt(total) < 0n ? -BigInt(total) : BigInt(total), 1n].reduce((a, b) =>
    a > b ? a : b,
  )
  const absoluteAmount = BigInt(amount) < 0n ? -BigInt(amount) : BigInt(amount)
  const width = Number((absoluteAmount * 100n) / absoluteTotal)
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="font-medium text-ink">{label}</span>
        <span className={cn('font-bold tabular-nums', BigInt(amount) >= 0n ? 'text-success' : 'text-danger')}>
          {formatMinor(amount, currency)}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-cream">
        <div
          className={cn('h-full rounded-full', BigInt(amount) >= 0n ? 'bg-poker-green' : 'bg-danger')}
          style={{ width: `${Math.min(100, Math.max(width, absoluteAmount > 0n ? 3 : 0))}%` }}
        />
      </div>
    </div>
  )
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 font-semibold tabular-nums text-ink">{value}</p>
    </div>
  )
}
