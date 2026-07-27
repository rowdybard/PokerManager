import { useMemo, useState } from 'react'
import { Download, FileSpreadsheet, Printer } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import {
  Field,
  FormFeedback,
  FormInput,
  FormSelect,
  ProError,
  ProLoading,
  ProPage,
  useProResource,
} from '../../components/pro'
import { useAuthStore } from '../../store/authStore'
import {
  downloadTextFile,
  escapeHtml,
  exportFilename,
  formatDate,
  formatMinor,
  listCareerExpenses,
  listCareerSessions,
  listLedgerEntries,
  listPokerHands,
  listSettlements,
  listStakingDeals,
  listStudySessions,
  listTrips,
  openPrintableReport,
  sumMinor,
  toCsv,
} from '../../lib/pro'

function loadExports(ownerId: string) {
  return Promise.all([
    listCareerSessions(ownerId, 2_000),
    listLedgerEntries(ownerId, 5_000),
    listCareerExpenses(ownerId),
    listSettlements(ownerId),
    listTrips(ownerId),
    listStakingDeals(ownerId),
    listPokerHands(ownerId),
    listStudySessions(ownerId),
  ]).then(([sessions, ledger, expenses, settlements, trips, staking, hands, study]) => ({
    sessions,
    ledger,
    expenses,
    settlements,
    trips,
    staking,
    hands,
    study,
  }))
}

type Period = 'all' | 'year' | 'month'

function dateInPeriod(value: string, period: Period, anchor: string): boolean {
  if (period === 'all') return true
  const date = value.slice(0, 10)
  return period === 'year' ? date.slice(0, 4) === anchor.slice(0, 4) : date.slice(0, 7) === anchor.slice(0, 7)
}

export function ExportsPage() {
  const ownerId = useAuthStore((state) => state.user?.id)
  const resource = useProResource(['pro', 'exports', ownerId], () => {
    if (!ownerId) throw new Error('Sign in to export private career data.')
    return loadExports(ownerId)
  })
  const [period, setPeriod] = useState<Period>('year')
  const [anchor, setAnchor] = useState(new Date().toISOString().slice(0, 10))
  const [feedback, setFeedback] = useState<{ error?: string; success?: string }>({})

  const filtered = useMemo(() => {
    const data = resource.data
    if (!data) return null
    return {
      ...data,
      sessions: data.sessions.filter((item) => dateInPeriod(item.played_at, period, anchor)),
      ledger: data.ledger.filter((item) => dateInPeriod(item.occurred_at, period, anchor)),
      expenses: data.expenses.filter((item) => dateInPeriod(item.incurred_on, period, anchor)),
      settlements: data.settlements.filter((item) => dateInPeriod(item.created_at, period, anchor)),
      trips: data.trips.filter((item) => dateInPeriod(item.starts_on, period, anchor)),
      staking: data.staking.filter((item) => dateInPeriod(item.starts_on, period, anchor)),
      hands: data.hands.filter((item) => dateInPeriod(item.played_at, period, anchor)),
      study: data.study.filter((item) => dateInPeriod(item.studied_at, period, anchor)),
    }
  }, [anchor, period, resource.data])

  const periodLabel =
    period === 'all'
      ? 'All time'
      : period === 'year'
        ? anchor.slice(0, 4)
        : new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
            new Date(`${anchor.slice(0, 7)}-01T00:00:00Z`),
          )

  const exportCsv = (subject: string, rows: object[]) => {
    if (rows.length === 0) {
      setFeedback({ error: `No ${subject.toLowerCase()} records in this period.` })
      return
    }
    downloadTextFile(exportFilename(`${subject}-${periodLabel}`), toCsv(rows))
    setFeedback({ success: `${subject} CSV downloaded.` })
  }

  const printReport = () => {
    if (!filtered) return
    try {
      const currencies = Array.from(
        new Set([
          ...filtered.sessions.map((item) => item.currency),
          ...filtered.expenses.map((item) => item.currency),
        ]),
      ).sort()
      const summaries = currencies
        .map((currency) => {
          const profit = sumMinor(
            filtered.sessions.filter((item) => item.currency === currency && item.data_quality === 'trusted').map((item) => item.profit_minor),
          )
          const expenses = sumMinor(
            filtered.expenses.filter((item) => item.currency === currency).map((item) => item.amount_minor),
          )
          return `<tr><td>${escapeHtml(currency)}</td><td class="num">${escapeHtml(formatMinor(profit, currency))}</td><td class="num">${escapeHtml(formatMinor(expenses, currency))}</td></tr>`
        })
        .join('')
      const sessions = filtered.sessions
        .map(
          (item) =>
            `<tr><td>${escapeHtml(formatDate(item.played_at))}</td><td>${escapeHtml(item.venue || item.game_variant)}</td><td>${escapeHtml(item.session_kind)}</td><td class="num">${escapeHtml(formatMinor(item.profit_minor, item.currency))}</td></tr>`,
        )
        .join('')
      const expenses = filtered.expenses
        .map(
          (item) =>
            `<tr><td>${escapeHtml(formatDate(item.incurred_on))}</td><td>${escapeHtml(item.merchant || item.category)}</td><td>${escapeHtml(item.category)}</td><td class="num">${escapeHtml(formatMinor(item.amount_minor, item.currency))}</td></tr>`,
        )
        .join('')
      openPrintableReport(`Poker career report · ${periodLabel}`, [
        {
          title: 'Summary by currency',
          html: `<table><thead><tr><th>Currency</th><th class="num">Session profit</th><th class="num">Expenses</th></tr></thead><tbody>${summaries || '<tr><td colspan="3">No financial data</td></tr>'}</tbody></table>`,
        },
        {
          title: `Sessions (${filtered.sessions.length})`,
          html: `<table><thead><tr><th>Date</th><th>Venue / game</th><th>Format</th><th class="num">Profit</th></tr></thead><tbody>${sessions || '<tr><td colspan="4">No sessions</td></tr>'}</tbody></table>`,
        },
        {
          title: `Expenses (${filtered.expenses.length})`,
          html: `<table><thead><tr><th>Date</th><th>Merchant</th><th>Category</th><th class="num">Amount</th></tr></thead><tbody>${expenses || '<tr><td colspan="4">No expenses</td></tr>'}</tbody></table>`,
        },
        {
          title: 'Activity',
          html: `<p>${filtered.ledger.length} ledger entries · ${filtered.settlements.length} settlements · ${filtered.hands.length} reviewed/captured hands · ${filtered.study.reduce((sum, item) => sum + item.duration_minutes, 0)} study minutes</p>`,
        },
      ])
      setFeedback({ success: 'Printable report opened. Use the system dialog to save a PDF.' })
    } catch (error) {
      setFeedback({ error: error instanceof Error ? error.message : 'Could not open report.' })
    }
  }

  return (
    <ProPage
      title="Reports & exports"
      description="Export career records by reporting period."
    >
      <FormFeedback {...feedback} />
      <Card>
        <CardHeader>
          <CardTitle>Reporting period</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Period">
              <FormSelect value={period} onChange={(event) => setPeriod(event.target.value as Period)}>
                <option value="month">Monthly</option>
                <option value="year">Annual</option>
                <option value="all">All time</option>
              </FormSelect>
            </Field>
            {period !== 'all' ? (
              <Field label={period === 'year' ? 'Any date in year' : 'Any date in month'}>
                <FormInput
                  type={period === 'month' ? 'month' : 'date'}
                  value={period === 'month' ? anchor.slice(0, 7) : anchor}
                  onChange={(event) =>
                    setAnchor(
                      period === 'month'
                        ? `${event.target.value}-01`
                        : event.target.value,
                    )
                  }
                />
              </Field>
            ) : null}
            <div className="flex items-end">
              <Button className="w-full gap-2" onClick={printReport} disabled={!filtered}>
                <Printer className="h-4 w-4" aria-hidden="true" />
                Print / save PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {resource.loading ? <ProLoading label="Preparing export data…" /> : null}
      {resource.error ? <ProError error={resource.error} retry={resource.reload} /> : null}
      {filtered ? (
        <section
          className="grid border border-rule bg-ivory sm:grid-cols-2 xl:grid-cols-4"
          aria-label="Available exports"
        >
          <ExportCard title="Career sessions" count={filtered.sessions.length} onExport={() => exportCsv('Career sessions', filtered.sessions)} />
          <ExportCard title="Bankroll ledger" count={filtered.ledger.length} onExport={() => exportCsv('Bankroll ledger', filtered.ledger)} />
          <ExportCard title="Expenses" count={filtered.expenses.length} onExport={() => exportCsv('Expenses', filtered.expenses)} />
          <ExportCard title="Settlements" count={filtered.settlements.length} onExport={() => exportCsv('Settlements', filtered.settlements)} />
          <ExportCard title="Trips" count={filtered.trips.length} onExport={() => exportCsv('Trips', filtered.trips)} />
          <ExportCard title="Staking deals" count={filtered.staking.length} onExport={() => exportCsv('Staking deals', filtered.staking)} />
          <ExportCard title="Hands" count={filtered.hands.length} onExport={() => exportCsv('Hands', filtered.hands)} />
          <ExportCard title="Study sessions" count={filtered.study.length} onExport={() => exportCsv('Study sessions', filtered.study)} />
        </section>
      ) : null}

    </ProPage>
  )
}

function ExportCard({
  title,
  count,
  onExport,
}: {
  title: string
  count: number
  onExport: () => void
}) {
  return (
    <article className="border-b border-rule p-4 last:border-b-0 sm:border-r xl:border-b-0 xl:last:border-r-0">
      <div className="flex items-start justify-between gap-3">
        <FileSpreadsheet className="h-5 w-5 text-gold" aria-hidden="true" />
        <span className="text-sm font-semibold tabular-nums text-muted">{count}</span>
      </div>
      <h2 className="mt-4 font-semibold text-ink">{title}</h2>
      <Button size="sm" variant="secondary" className="mt-3 w-full gap-2" disabled={count === 0} onClick={onExport}>
        <Download className="h-3.5 w-3.5" aria-hidden="true" />
        Download CSV
      </Button>
    </article>
  )
}
