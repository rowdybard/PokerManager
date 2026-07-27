import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { formatMoney, money } from '../../lib/money'

export interface PointsHistoryEntry {
  date: string
  points: number
  cumulative: number
}

export interface ProfitHistoryEntry {
  date: string
  profitMinor: string
}

function AccessibleDataTable({
  caption,
  headers,
  rows,
}: {
  caption: string
  headers: string[]
  rows: string[][]
}) {
  return (
    <details className="mt-4 border-t border-border pt-3">
      <summary className="cursor-pointer text-sm font-semibold text-poker-green underline underline-offset-4">
        View data table
      </summary>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm tnum">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-border">
              {headers.map((header) => (
                <th key={header} scope="col" className="px-2 py-2 font-semibold text-ink">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={`${row[0]}-${rowIndex}`} className="border-b border-border/70">
                {row.map((cell, cellIndex) => (
                  <td key={`${cell}-${cellIndex}`} className="px-2 py-2 text-ink">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}

export function PointsPerformance({
  history,
}: {
  history: PointsHistoryEntry[]
}) {
  if (history.length === 0) return null
  const latest = history.at(-1)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Points over time</CardTitle>
        <p className="text-sm text-muted">
          {latest
            ? `${latest.cumulative.toLocaleString()} total points after ${history.length} game${history.length === 1 ? '' : 's'}.`
            : 'No points recorded.'}
        </p>
      </CardHeader>
      <CardContent>
        <div aria-hidden="true">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="2 4" stroke="var(--color-rule)" />
              <XAxis dataKey="date" tick={{ fill: 'var(--color-muted)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--color-muted)', fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: 'var(--color-ivory)',
                  border: '1px solid var(--color-rule-strong)',
                  borderRadius: '2px',
                }}
              />
              <Line
                type="monotone"
                dataKey="cumulative"
                stroke="var(--color-gold)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <AccessibleDataTable
          caption="Points earned and cumulative points by game"
          headers={['Game date', 'Points', 'Cumulative']}
          rows={history.map((entry) => [
            entry.date,
            entry.points.toLocaleString(),
            entry.cumulative.toLocaleString(),
          ])}
        />
      </CardContent>
    </Card>
  )
}

export function ProfitPerformance({
  history,
  currency,
}: {
  history: ProfitHistoryEntry[]
  currency: string
}) {
  if (history.length === 0) return null
  const chartData = history.map((entry) => ({
    ...entry,
    profit: Number(entry.profitMinor) / 100,
  }))
  const netMinor = history
    .reduce((sum, entry) => sum + BigInt(entry.profitMinor), 0n)
    .toString()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Profit and loss by game</CardTitle>
        <p className="text-sm text-muted">
          Net result: <span className="tnum">{formatMoney(money(netMinor, currency))}</span>.
        </p>
      </CardHeader>
      <CardContent>
        <div aria-hidden="true">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="2 4" stroke="var(--color-rule)" />
              <XAxis dataKey="date" tick={{ fill: 'var(--color-muted)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--color-muted)', fontSize: 11 }} />
              <Tooltip
                formatter={(value) =>
                  formatMoney(money(String(Math.round(Number(value) * 100)), currency))
                }
                contentStyle={{
                  background: 'var(--color-ivory)',
                  border: '1px solid var(--color-rule-strong)',
                  borderRadius: '2px',
                }}
              />
              <Bar dataKey="profit" fill="var(--color-felt)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <AccessibleDataTable
          caption="Profit or loss by game"
          headers={['Game date', 'Net result']}
          rows={history.map((entry) => [
            entry.date,
            formatMoney(money(entry.profitMinor, currency)),
          ])}
        />
      </CardContent>
    </Card>
  )
}
