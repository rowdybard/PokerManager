import { useMemo, useRef, useState, type FormEvent } from 'react'
import { Plus, Scale, X } from 'lucide-react'
import { SettlementLedgerRow } from '../../components/settlements/SettlementLedgerRow'
import {
  Field,
  FormFeedback,
  FormInput,
  FormSelect,
  FormTextarea,
  MoneyField,
  ProError,
  ProLoading,
  ProPage,
  useProResource,
} from '../../components/pro'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { Modal } from '../../components/ui/Modal'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { Surface } from '../../components/ui/Surface'
import {
  createSettlement,
  decimalToMinorExact,
  getPrivateDocumentUrl,
  listSettlements,
  todayInputValue,
  updateSettlementStatus,
  uploadSettlementConfirmation,
  type Settlement,
  type SettlementInput,
  type SettlementStatus,
} from '../../lib/pro'
import { useAuthStore } from '../../store/authStore'

type SettlementForm = {
  direction: Settlement['direction']
  counterparty: string
  amount: string
  currency: string
  reason: string
  method: string
  handle: string
  memo: string
  dueDate: string
}

function emptyForm(): SettlementForm {
  return {
    direction: 'payable',
    counterparty: '',
    amount: '',
    currency: 'USD',
    reason: '',
    method: '',
    handle: '',
    memo: '',
    dueDate: todayInputValue(),
  }
}

function transitionCopy(status: SettlementStatus) {
  if (status === 'paid') {
    return {
      title: 'Confirm payment',
      description:
        'This records the payment at server time. PokerManager does not move any funds.',
      action: 'Mark paid',
    }
  }
  if (status === 'void') {
    return {
      title: 'Void obligation',
      description: 'The obligation stays in the audit trail and can be reopened later.',
      action: 'Void obligation',
    }
  }
  if (status === 'disputed') {
    return {
      title: 'Mark as disputed',
      description: 'Use this when the payment or obligation needs review.',
      action: 'Mark disputed',
    }
  }
  return {
    title: 'Return to pending',
    description: 'The obligation will return to the pending queue.',
    action: 'Return to pending',
  }
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
  const [busyId, setBusyId] = useState<string | null>(null)
  const [pendingTransition, setPendingTransition] = useState<{
    settlement: Settlement
    status: SettlementStatus
  } | null>(null)
  const [form, setForm] = useState<SettlementForm>(emptyForm)
  const createAttempt = useRef<{ fingerprint: string; key: string } | null>(null)
  const transitionKeys = useRef(new Map<string, string>())
  const attachmentAttempts = useRef(
    new Map<string, { fingerprint: string; key: string }>(),
  )
  const uploadTarget = useRef<Settlement | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const confirmButton = useRef<HTMLButtonElement>(null)

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
      const amountMinor = decimalToMinorExact(form.amount, form.currency)
      if (BigInt(amountMinor) <= 0n) {
        throw new Error('Settlement amount must be greater than zero.')
      }
      const request: Omit<SettlementInput, 'idempotency_key'> = {
        session_id: null,
        direction: form.direction,
        counterparty: form.counterparty.trim(),
        amount_minor: amountMinor,
        currency: form.currency.trim().toUpperCase(),
        reason: form.reason.trim(),
        external_method: form.method.trim() || null,
        external_handle: form.handle.trim() || null,
        memo: form.memo.trim() || null,
        due_date: form.dueDate || null,
      }
      const fingerprint = JSON.stringify(request)
      if (!createAttempt.current || createAttempt.current.fingerprint !== fingerprint) {
        createAttempt.current = { fingerprint, key: crypto.randomUUID() }
      }
      await createSettlement(ownerId, {
        ...request,
        idempotency_key: createAttempt.current.key,
      })
      createAttempt.current = null
      setForm(emptyForm())
      setShowForm(false)
      setFeedback({ success: 'Settlement obligation recorded.' })
      await resource.reload()
    } catch (error) {
      setFeedback({ error: error instanceof Error ? error.message : 'Could not create settlement.' })
    } finally {
      setSubmitting(false)
    }
  }

  const confirmTransition = async () => {
    if (!ownerId || !pendingTransition) return
    const { settlement, status } = pendingTransition
    const operation = `${settlement.id}:${settlement.revision}:${status}`
    const key = transitionKeys.current.get(operation) ?? crypto.randomUUID()
    transitionKeys.current.set(operation, key)
    setBusyId(settlement.id)
    setFeedback({})
    try {
      await updateSettlementStatus(
        ownerId,
        settlement.id,
        status,
        settlement.revision,
        key,
      )
      setFeedback({ success: `Settlement marked ${status}.` })
    } catch (error) {
      setFeedback({ error: error instanceof Error ? error.message : 'Could not update settlement.' })
    } finally {
      setPendingTransition(null)
      await resource.reload()
      setBusyId(null)
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

  const chooseConfirmation = (settlement: Settlement) => {
    uploadTarget.current = settlement
    fileInput.current?.click()
  }

  const uploadConfirmation = async (file: File | undefined) => {
    const settlement = uploadTarget.current
    if (!file || !ownerId || !settlement) return
    const fingerprint = [
      file.name,
      file.type,
      file.size,
      file.lastModified,
    ].join(':')
    const priorAttempt = attachmentAttempts.current.get(settlement.id)
    const attempt =
      priorAttempt?.fingerprint === fingerprint
        ? priorAttempt
        : { fingerprint, key: crypto.randomUUID() }
    attachmentAttempts.current.set(settlement.id, attempt)
    setBusyId(settlement.id)
    setFeedback({})
    try {
      await uploadSettlementConfirmation(
        ownerId,
        settlement.id,
        settlement.revision,
        file,
        attempt.key,
      )
      attachmentAttempts.current.delete(settlement.id)
      setFeedback({ success: 'Private confirmation attached.' })
    } catch (error) {
      setFeedback({ error: error instanceof Error ? error.message : 'Could not attach confirmation.' })
    } finally {
      uploadTarget.current = null
      if (fileInput.current) fileInput.current.value = ''
      await resource.reload()
      setBusyId(null)
    }
  }

  const createConfirmationUrl = async (path: string) => {
    setFeedback({})
    return getPrivateDocumentUrl(path)
  }

  const viewConfirmation = async (path: string) => {
    const preview = window.open('', '_blank')
    if (preview) preview.opener = null
    try {
      const url = await createConfirmationUrl(path)
      if (!preview) {
        throw new Error('Allow pop-ups to open the confirmation.')
      }
      preview.location.replace(url)
    } catch (error) {
      preview?.close()
      setFeedback({ error: error instanceof Error ? error.message : 'Could not open confirmation.' })
    }
  }

  const copyConfirmationLink = async (path: string) => {
    try {
      const url = await createConfirmationUrl(path)
      await navigator.clipboard.writeText(url)
      setFeedback({ success: 'Private confirmation link copied. It expires in 1 minute.' })
    } catch (error) {
      setFeedback({
        error: error instanceof Error ? error.message : 'Could not copy the confirmation link.',
      })
    }
  }

  const modalCopy = pendingTransition ? transitionCopy(pendingTransition.status) : null

  return (
    <ProPage
      title="Settlements"
      description="Track obligations and external payments. No funds or transfers are handled here."
      actions={
        <Button size="md" className="gap-2" onClick={() => setShowForm((value) => !value)}>
          {showForm ? <X className="size-4" /> : <Plus className="size-4" />}
          {showForm ? 'Close' : 'New obligation'}
        </Button>
      }
    >
      <input
        ref={fileInput}
        className="sr-only"
        type="file"
        tabIndex={-1}
        aria-label="Choose settlement confirmation"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        onChange={(event) => void uploadConfirmation(event.target.files?.[0])}
      />
      <FormFeedback {...feedback} />

      {showForm ? (
        <Surface>
          <SectionHeader
            title="New settlement obligation"
            description="Record an amount owed outside PokerManager."
            className="mb-4"
          />
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
                  autoComplete="off"
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
                  onChange={(event) =>
                    setForm((value) => ({ ...value, reason: event.target.value }))
                  }
                />
              </Field>
              <Field label="External method" hint="Venmo, PayPal, Cash App, or check">
                <FormInput
                  maxLength={80}
                  value={form.method}
                  onChange={(event) =>
                    setForm((value) => ({ ...value, method: event.target.value }))
                  }
                />
              </Field>
              <Field label="Display handle or instructions">
                <FormInput
                  maxLength={200}
                  value={form.handle}
                  onChange={(event) =>
                    setForm((value) => ({ ...value, handle: event.target.value }))
                  }
                />
              </Field>
              <Field label="Due date">
                <FormInput
                  type="date"
                  value={form.dueDate}
                  onChange={(event) =>
                    setForm((value) => ({ ...value, dueDate: event.target.value }))
                  }
                />
              </Field>
            </div>
            <Field label="Memo or details">
              <FormTextarea
                maxLength={500}
                value={form.memo}
                onChange={(event) =>
                  setForm((value) => ({ ...value, memo: event.target.value }))
                }
              />
            </Field>
            <div className="flex justify-end">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving…' : 'Record obligation'}
              </Button>
            </div>
          </form>
        </Surface>
      ) : null}

      <Surface>
        <SectionHeader
          title="Obligations"
          description={`${settlements.length} shown`}
          action={
            <FormSelect
              aria-label="Filter settlements by status"
              className="min-w-40"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="disputed">Disputed</option>
              <option value="void">Void</option>
            </FormSelect>
          }
          className="mb-4"
        />

        {resource.loading ? <ProLoading label="Loading settlements…" /> : null}
        {resource.error ? <ProError error={resource.error} retry={resource.reload} /> : null}
        {!resource.loading && !resource.error && settlements.length === 0 ? (
          <EmptyState
            icon={<Scale className="size-6" />}
            title={(resource.data?.length ?? 0) ? 'No matching settlements' : 'No settlements'}
            action={<Button onClick={() => setShowForm(true)}>New obligation</Button>}
          />
        ) : null}
        {settlements.length ? (
          <div className="space-y-3">
            {settlements.map((settlement) => (
              <div key={settlement.id}>
                <SettlementLedgerRow
                  settlement={settlement}
                  busy={busyId === settlement.id}
                  onCopy={(value, label) => void copy(value, label)}
                  onRequestTransition={(item, status) =>
                    setPendingTransition({ settlement: item, status })
                  }
                  onChooseConfirmation={chooseConfirmation}
                  onViewConfirmation={(path) => void viewConfirmation(path)}
                />
                {settlement.confirmation_path ? (
                  <div className="-mt-px flex justify-end border border-t-0 border-rule bg-bg px-3 py-2">
                    <Button
                      size="sm"
                      variant="quiet"
                      disabled={busyId === settlement.id}
                      onClick={() => void copyConfirmationLink(settlement.confirmation_path!)}
                    >
                      Copy 1-minute confirmation link
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </Surface>

      <Modal
        open={pendingTransition !== null}
        onClose={() => setPendingTransition(null)}
        title={modalCopy?.title ?? 'Update settlement'}
        initialFocusRef={confirmButton}
        dismissible={busyId === null}
      >
        <p className="text-sm text-muted">{modalCopy?.description}</p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            disabled={busyId !== null}
            onClick={() => setPendingTransition(null)}
          >
            Cancel
          </Button>
          <Button
            ref={confirmButton}
            type="button"
            variant={pendingTransition?.status === 'void' ? 'destructive' : 'primary'}
            disabled={busyId !== null}
            onClick={() => void confirmTransition()}
          >
            {busyId ? 'Saving…' : modalCopy?.action}
          </Button>
        </div>
      </Modal>
    </ProPage>
  )
}
