import type { Key, ReactNode } from 'react'
import { cn } from '../../lib/utils'

export interface ScoreTableColumn<Row> {
  key: string
  header: ReactNode
  label?: ReactNode
  render: (row: Row, index: number) => ReactNode
  align?: 'start' | 'center' | 'end'
  numeric?: boolean
  rowHeader?: boolean
  mobile?: 'show' | 'primary' | 'leading' | 'hide'
  className?: string
}

export interface ScoreTableProps<Row> {
  rows: Row[]
  columns: ScoreTableColumn<Row>[]
  getRowKey: (row: Row, index: number) => Key
  caption?: ReactNode
  empty?: ReactNode
  getRowLabel?: (row: Row, index: number) => string
  className?: string
}

function alignmentClass(align: ScoreTableColumn<unknown>['align']) {
  if (align === 'center') return 'text-center'
  if (align === 'end') return 'text-right'
  return 'text-left'
}

export function ScoreTable<Row>({
  rows,
  columns,
  getRowKey,
  caption,
  empty = 'No standings are available.',
  getRowLabel,
  className,
}: ScoreTableProps<Row>) {
  if (rows.length === 0) {
    return <div className={cn('border border-rule bg-ivory p-6 text-center text-sm text-muted', className)}>{empty}</div>
  }

  return (
    <div className={cn('border border-rule-strong bg-ivory', className)}>
      <div className="hidden md:block">
        <table className="w-full border-collapse">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead className="bg-felt text-ivory">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    'border-r border-ivory/20 px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] last:border-r-0',
                    alignmentClass(column.align),
                    column.numeric && 'tnum',
                    column.className,
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {rows.map((row, rowIndex) => (
              <tr key={getRowKey(row, rowIndex)} className="hover:bg-gold-leaf/5">
                {columns.map((column) => {
                  const Cell = column.rowHeader ? 'th' : 'td'
                  return (
                    <Cell
                      key={column.key}
                      {...(column.rowHeader ? { scope: 'row' as const } : {})}
                      className={cn(
                        'px-3 py-2.5 text-sm text-ink',
                        column.rowHeader && 'font-semibold',
                        alignmentClass(column.align),
                        column.numeric && 'tnum',
                        column.className,
                      )}
                    >
                      {column.render(row, rowIndex)}
                    </Cell>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        className="divide-y divide-rule md:hidden"
        role="list"
        aria-label={typeof caption === 'string' ? caption : 'Standings'}
      >
        {rows.map((row, rowIndex) => {
          const visibleColumns = columns.filter((column) => column.mobile !== 'hide')
          const primaryColumn =
            visibleColumns.find((column) => column.mobile === 'primary') ??
            visibleColumns.find((column) => column.rowHeader) ??
            visibleColumns[0]
          const leadingColumn = visibleColumns.find(
            (column) => column.mobile === 'leading' && column !== primaryColumn,
          )
          const detailColumns = visibleColumns.filter(
            (column) => column !== primaryColumn && column !== leadingColumn,
          )

          return (
            <div
              key={getRowKey(row, rowIndex)}
              role="listitem"
              aria-label={getRowLabel?.(row, rowIndex)}
              className="px-3 py-3.5"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                {leadingColumn ? (
                  <div className="shrink-0">{leadingColumn.render(row, rowIndex)}</div>
                ) : null}
                {primaryColumn ? (
                  <div
                    className={cn(
                      'min-w-0 flex-1 font-serif text-lg font-semibold text-ink',
                      primaryColumn.numeric && 'tnum',
                    )}
                  >
                    {primaryColumn.render(row, rowIndex)}
                  </div>
                ) : null}
              </div>
              {detailColumns.length > 0 ? (
                <dl className="mt-2 grid min-w-0 grid-cols-2 gap-x-4 gap-y-2 min-[420px]:grid-cols-4">
                  {detailColumns.map((column) => (
                    <div key={column.key} className="min-w-0">
                      <dt
                        className={cn(
                          'text-xs font-semibold uppercase tracking-[0.06em] text-muted',
                          alignmentClass(column.align),
                        )}
                      >
                        {column.label ?? column.header}
                      </dt>
                      <dd
                        className={cn(
                          'mt-0.5 text-base font-semibold text-ink',
                          column.numeric && 'tnum',
                          alignmentClass(column.align),
                        )}
                      >
                        {column.render(row, rowIndex)}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
