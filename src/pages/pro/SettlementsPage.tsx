import { useMemo, useRef, useState, type FormEvent } from 'react'
import {
  CheckCircle2,
  Clipboard,
  ExternalLink,
  FileCheck2,
  Paperclip,
  Plus,
  Scale,
  ShieldAlert,
  X,
} from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import {
  Field,
  FormFeedback,
  FormInput,
  FormSelect,
  FormTextarea,
  MoneyField,
  ProEmpty,
  ProError,
  ProLoading,
  ProPage,
  useProResource,
} from '../../components/pro'
import { useAuthStore } from '../../store/authStore'
import {
  createSettlement,
  decimalToMinor,
  formatDate,
  formatMinor,
  getPrivateDocumentUrl,
  listSettlements,
  minorToDecimal,
  providerUrlForSettlement,
  todayInputValue,
  updateSettlementStatus,
  uploadSettlementConfirmation,
  type Settlement,
  type SettlementStatus,
} from '../../lib/pro'

function settlementTone(status: SettlementStatus): 'default' | 'green' | 'red' | 'gold' {
  if (status === 'paid') return 'green'
  if (status === 'disputed') return 'red'
  if (status === 'pending') return 'gold'
  return 'default'
}

export function SettlementsPage() {
  const ownerId = useAuthStore((state) => state.user?.id)
  const resource = useProResource(['pro', 'settlements', ownerId], () => {
    if (!ownerId) throw new Error('Sign in to view settlements.')
    return listSettlements(ownerId)
  })
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ error?: string; success?: string }>({})
  const [statusFilter, setStatusFilter] = useState<'all' | SettlementStatus>('all')
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    direction: 'payable' as Settlement['direction'],
    counterparty: '',
    amount: '',
    currency: 'USD',
    reason: '',
    method: '',
    handle: '',
    memo: '',
    dueDate: todayInputValue(),
  })

  const settlements = useMemo(
    () =>
      (resource.data ?? []).filter(
        (settlement) => statusFilter === 'all' || settlement.status === statusFilter,
      ),
    [resource.data, statusFilter],
  )

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!ownerId) return
    setSubmitting(true)
    setFeedback({})
    try {
      await createSettlement(ownerId, {
        session_id: null,
        direction: form.direction,
        counterparty: form.counterparty.trim(),
        amount_minor: decimalToMinor(form.amount, form.currency),
        currency: form.currency,
        reason: form.reason.trim(),
        external_method: form.method.trim() || null,
        external_handle: form.handle.trim() || null,
        memo: form.memo.trim() || null,
        due_date: form.dueDate || null,
        idempotency_key: crypto.randomUUID(),
      })
      setForm({
        direction: 'payable',
        counterparty: '',
        amount: '',
        currency: 'USD',
        reason: '',
        method: '',
        handle: '',
        memo: '',
        dueDate: todayInputValue(),
      })
      setShowForm(false)
      setFeedback({ success: 'Settlement obligation recorded.' })
      await resource.reload()
    } catch (error) {
      setFeedback({ error: error instanceof Error ? error.message : 'Could not create settlement.' })
    } finally {
      setSubmitting(false)
    }
  }

  const changeStatus = async (settlement: Settlement, status: SettlementStatus) => {
    if (!ownerId) return
    setFeedback({})
    try {
      await updateSettlementStatus(ownerId, settlement.id, status)
      setFeedback({ success: `Settlement marked ${status}.` })
      await resource.reload()
    } catch (error) {
      setFeedback({ error: error instanceof Error ? error.message : 'Could not update settlement.' })
    }
  }

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setFeedback({ success: `${label} copied.` })
    } catch {
      setFeedback({ error: `Could not copy ${label.toLowerCase()}.` })
    }
  }

  const chooseConfirmation = (settlementId: string) => {
    setUploadingId(settlementId)
    fileInput.current?.click()
  }

  const uploadConfirmation = async (file: File | undefined) => {
    if (!file || !ownerId || !uploadingId) return
    setSubmitting(true)
    setFeedback({})
    try {
      await uploadSettlementConfirmation(ownerId, uploadingId, file)
      setFeedback({ success: 'Private confirmation attached.' })
      await resource.reload()
    } catch (error) {
      setFeedback({ error: error instanceof Error ? error.message : 'Could not attach confirmation.' })
    } finally {
      setSubmitting(false)
      setUploadingId(null)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const viewConfirmation = async (path: string) => {
    try {
      const url = await getPrivateDocumentUrl(path)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      setFeedback({ error: error instanceof Error ? error.message : 'Could not open confirmation.' })
    }
  }

  return (
    <ProPage
      title="Settlements"
      description="Track who owes what and record external payment status. No balances, pooled funds, or transfers are handled here."
      actions={
        <Button
          size="sm"
          className="gap-2 bg-white text-poker-green hover:bg-cream"
          onClick={() => setShowForm((value) => !value)}
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? 'Close' : 'New obligation'}
        </Button>
      }
    >
      <input
        ref={fileInput}
        className="sr-only"
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        onChange={(event) => void uploadConfirmation(event.target.files?.[0])}
      />
      <FormFeedback {...feedback} />

      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle>New settlement obligation</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={submit}>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Direction" required>
                  <FormSelect
                    value={form.direction}
                    onChange={(event) =>
                      setForm((value) => ({
                        ...value,
                        direction: event.target.value as Settlement['direction'],
                      }))
                    }
                  >
                    <option value="payable">I owe</option>
                    <option value="receivable">Owed to me</option>
                  </FormSelect>
                </Field>
                <Field label="Counterparty" required>
                  <FormInput
                    required
                    maxLength={160}
                    value={form.counterparty}
                    onChange={(event) =>
                      setForm((value) => ({ ...value, counterparty: event.target.value }))
                    }
                  />
                </Field>
                <Field label="Currency" required>
                  <FormInput
                    required
                    minLength={3}
                    maxLength={3}
                    value={form.currency}
                    onChange={(event) =>
                      setForm((value) => ({ ...value, currency: event.target.value.toUpperCase() }))
                    }
                  />
                </Field>
                <MoneyField
                  required
                  currency={form.currency}
                  value={form.amount}
                  onChange={(amount) => setForm((value) => ({ ...value, amount }))}
                />
                <Field label="Reason" required>
                  <FormInput
                    required
                    maxLength={250}
                    value={form.reason}
                    onChange={(event) => setForm((value) => ({ ...value, reason: event.target.value }))}
                  />
                </Field>
                <Field label="External method" hint="Venmo, PayPal, Cash App, check">
                  <FormInput
                    maxLength={80}
                    value={form.method}
                    onChange={(event) => setForm((value) => ({ ...value, method: event.target.value }))}
                  />
                </Field>
                <Field label="Display handle / instructions">
                  <FormInput
                    maxLength={200}
                    value={form.handle}
                    onChange={(event) => setForm((value) => ({ ...value, handle: event.target.value }))}
                  />
                </Field>
                <Field label="Due date">
                  <FormInput
                    type="date"
                    value={form.dueDate}
                    onChange={(event) => setForm((value) => ({ ...value, dueDate: event.target.value }))}
                  />
                </Field>
              </div>
              <Field label="Memo / details">
                <FormTextarea
                  maxLength={500}
                  value={form.memo}
                  onChange={(event) => setForm((value) => ({ ...value, memo: event.target.value }))}
                />
              </Field>
              <div className="flex justify-end">
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving…' : 'Record obligation'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>Obligations</CardTitle>
            <p className="text-sm text-muted">{settlements.length} shown</p>
          </div>
          <FormSelect
            aria-label="Filter settlements by status"
            className="sm:max-w-44"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="disputed">Disputed</option>
            <option value="void">Void</option>
          </FormSelect>
        </CardHeader>
        <CardContent>
          {resource.loading ? <ProLoading label="Loading settlements…" /> : null}
          {resource.error ? <ProError error={resource.error} retry={resource.reload} /> : null}
          {!resource.loading && !resource.error && settlements.length === 0 ? (
            <ProEmpty
              title={(resource.data?.length ?? 0) ? 'No matching settlements' : 'No settlements'}
              description="Record an external payable or receivable when reconciliation is needed."
              action={<Button onClick={() => setShowForm(true)}>New obligation</Button>}
            />
          ) : null}
          {settlements.length ? (
            <div className="space-y-3">
              {settlements.map((settlement) => {
                const providerUrl = providerUrlForSettlement(settlement)
                const details = [
                  settlement.external_method,
                  settlement.external_handle,
                  settlement.memo,
                ]
                  .filter(Boolean)
                  .join(' · ')
                return (
                  <article className="rounded-xl border border-border p-4" key={settlement.id}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-semibold text-ink">{settlement.counterparty}</h2>
                          <Badge variant={settlementTone(settlement.status)}>{settlement.status}</Badge>
                          <Badge variant={settlement.direction === 'receivable' ? 'green' : 'blue'}>
                            {settlement.direction === 'receivable' ? 'owed to me' : 'I owe'}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted">{settlement.reason}</p>
                        <p className="mt-1 text-xs text-muted">
                          {settlement.due_date ? `Due ${formatDate(settlement.due_date)}` : 'No due date'}
                          {details ? ` · ${details}` : ''}
                        </p>
                      </div>
                      <p className="text-xl font-bold tabular-nums text-ink">
                        {formatMinor(settlement.amount_minor, settlement.currency)}
                      </p>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">
                      {providerUrl ? (
                        <a
                          href={providerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-cream px-3 text-sm font-medium text-ink hover:bg-border"
                        >
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                          Open provider
                        </a>
                      ) : null}
                      <Button
                        size="sm"
                        variant="secondary"
                        className="gap-1.5"
                        onClick={() =>
                          void copy(
                            minorToDecimal(settlement.amount_minor, settlement.currency),
                            'Amount',
                          )
                        }
                      >
                        <Clipboard className="h-3.5 w-3.5" aria-hidden="true" />
                        Copy amount
                      </Button>
                      {details ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="gap-1.5"
                          onClick={() => void copy(details, 'Details')}
                        >
                          <Clipboard className="h-3.5 w-3.5" aria-hidden="true" />
                          Copy details
                        </Button>
                      ) : null}
                      {settlement.status !== 'paid' && settlement.status !== 'void' ? (
                        <Button
                          size="sm"
                          className="gap-1.5"
                          onClick={() => void changeStatus(settlement, 'paid')}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          Mark paid
                        </Button>
                      ) : null}
                      {settlement.status === 'pending' ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1.5"
                          onClick={() => void changeStatus(settlement, 'disputed')}
                        >
                          <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
                          Dispute
                        </Button>
                      ) : null}
                      {settlement.status === 'disputed' ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1.5"
                          onClick={() => void changeStatus(settlement, 'pending')}
                        >
                          <Scale className="h-3.5 w-3.5" aria-hidden="true" />
                          Return to pending
                        </Button>
                      ) : null}
                      {settlement.confirmation_path ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1.5"
                          onClick={() => void viewConfirmation(settlement.confirmation_path!)}
                        >
                          <FileCheck2 className="h-3.5 w-3.5" aria-hidden="true" />
                          View confirmation
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1.5"
                          disabled={submitting && uploadingId === settlement.id}
                          onClick={() => chooseConfirmation(settlement.id)}
                        >
                          <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
                          Attach confirmation
                        </Button>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </ProPage>
  )
}
