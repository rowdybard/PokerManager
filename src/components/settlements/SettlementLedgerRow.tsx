import {
  CheckCircle2,
  Clipboard,
  ExternalLink,
  FileCheck2,
  Paperclip,
  RotateCcw,
  Scale,
  ShieldAlert,
  XCircle,
} from 'lucide-react'
import {
  formatDate,
  minorToDecimal,
  providerUrlForSettlement,
  type Settlement,
  type SettlementStatus,
} from '../../lib/pro'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { MoneyValue } from '../ui/MoneyValue'
import { Surface } from '../ui/Surface'

function settlementTone(status: SettlementStatus): 'default' | 'green' | 'red' | 'gold' {
  if (status === 'paid') return 'green'
  if (status === 'disputed') return 'red'
  if (status === 'pending') return 'gold'
  return 'default'
}

export interface SettlementLedgerRowProps {
  settlement: Settlement
  busy: boolean
  onCopy: (value: string, label: string) => void
  onRequestTransition: (settlement: Settlement, status: SettlementStatus) => void
  onChooseConfirmation: (settlement: Settlement) => void
  onViewConfirmation: (path: string) => void
}

export function SettlementLedgerRow({
  settlement,
  busy,
  onCopy,
  onRequestTransition,
  onChooseConfirmation,
  onViewConfirmation,
}: SettlementLedgerRowProps) {
  const providerUrl = providerUrlForSettlement(settlement)
  const details = [
    settlement.external_method,
    settlement.external_handle,
    settlement.memo,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <Surface
      as="article"
      padding="sm"
      aria-busy={busy}
      aria-labelledby={`settlement-${settlement.id}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id={`settlement-${settlement.id}`} className="font-serif text-lg font-semibold text-ink">
              {settlement.counterparty}
            </h2>
            <Badge variant={settlementTone(settlement.status)}>{settlement.status}</Badge>
            <Badge variant={settlement.direction === 'receivable' ? 'green' : 'blue'}>
              {settlement.direction === 'receivable' ? 'owed to me' : 'I owe'}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-ink-soft">{settlement.reason}</p>
          <p className="mt-1 text-xs text-muted">
            {settlement.due_date ? `Due ${formatDate(settlement.due_date)}` : 'No due date'}
            {details ? ` · ${details}` : ''}
          </p>
        </div>
        <MoneyValue
          value={settlement.amount_minor}
          currency={settlement.currency}
          minorUnits
          tone="neutral"
          className="font-serif text-xl font-semibold"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-rule pt-3">
        {providerUrl ? (
          <a
            href={providerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-sm border border-rule-strong bg-ivory px-3 text-sm font-semibold text-ink underline-offset-4 hover:bg-bg"
          >
            <ExternalLink className="size-4" aria-hidden="true" />
            Open provider
          </a>
        ) : null}
        <Button
          size="sm"
          variant="secondary"
          className="gap-1.5"
          disabled={busy}
          onClick={() =>
            onCopy(minorToDecimal(settlement.amount_minor, settlement.currency), 'Amount')
          }
        >
          <Clipboard className="size-4" aria-hidden="true" />
          Copy amount
        </Button>
        {details ? (
          <Button
            size="sm"
            variant="secondary"
            className="gap-1.5"
            disabled={busy}
            onClick={() => onCopy(details, 'Details')}
          >
            <Clipboard className="size-4" aria-hidden="true" />
            Copy details
          </Button>
        ) : null}

        {settlement.status === 'pending' || settlement.status === 'disputed' ? (
          <Button
            size="md"
            className="gap-1.5"
            disabled={busy}
            onClick={() => onRequestTransition(settlement, 'paid')}
          >
            <CheckCircle2 className="size-4" aria-hidden="true" />
            Mark paid
          </Button>
        ) : null}
        {settlement.status === 'pending' ? (
          <Button
            size="sm"
            variant="quiet"
            className="gap-1.5"
            disabled={busy}
            onClick={() => onRequestTransition(settlement, 'disputed')}
          >
            <ShieldAlert className="size-4" aria-hidden="true" />
            Dispute
          </Button>
        ) : null}
        {settlement.status === 'disputed' ? (
          <Button
            size="sm"
            variant="quiet"
            className="gap-1.5"
            disabled={busy}
            onClick={() => onRequestTransition(settlement, 'pending')}
          >
            <Scale className="size-4" aria-hidden="true" />
            Return to pending
          </Button>
        ) : null}
        {settlement.status === 'paid' ? (
          <Button
            size="sm"
            variant="quiet"
            className="gap-1.5"
            disabled={busy}
            onClick={() => onRequestTransition(settlement, 'disputed')}
          >
            <ShieldAlert className="size-4" aria-hidden="true" />
            Report issue
          </Button>
        ) : null}
        {settlement.status === 'void' ? (
          <Button
            size="sm"
            variant="quiet"
            className="gap-1.5"
            disabled={busy}
            onClick={() => onRequestTransition(settlement, 'pending')}
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            Reopen
          </Button>
        ) : null}
        {settlement.status === 'pending' || settlement.status === 'disputed' ? (
          <Button
            size="sm"
            variant="quiet"
            className="gap-1.5 text-danger"
            disabled={busy}
            onClick={() => onRequestTransition(settlement, 'void')}
          >
            <XCircle className="size-4" aria-hidden="true" />
            Void
          </Button>
        ) : null}

        {settlement.confirmation_path ? (
          <>
            <Button
              size="sm"
              variant="quiet"
              className="gap-1.5"
              disabled={busy}
              onClick={() => onViewConfirmation(settlement.confirmation_path!)}
            >
              <FileCheck2 className="size-4" aria-hidden="true" />
              View confirmation
            </Button>
            <Button
              size="sm"
              variant="quiet"
              className="gap-1.5"
              disabled={busy}
              onClick={() => onChooseConfirmation(settlement)}
            >
              <Paperclip className="size-4" aria-hidden="true" />
              Replace confirmation
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="quiet"
            className="gap-1.5"
            disabled={busy}
            onClick={() => onChooseConfirmation(settlement)}
          >
            <Paperclip className="size-4" aria-hidden="true" />
            Attach confirmation
          </Button>
        )}
      </div>
    </Surface>
  )
}
