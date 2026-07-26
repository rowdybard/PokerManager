import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import { cn } from '../../lib/utils'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'

export function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  children: ReactNode
}) {
  return (
    <label className="block space-y-1.5 text-sm font-medium text-ink">
      <span>
        {label}
        {required ? <span className="ml-1 text-danger" aria-hidden="true">*</span> : null}
      </span>
      {children}
      {hint ? <span className="block text-xs font-normal text-muted">{hint}</span> : null}
    </label>
  )
}
export function FormInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <Input {...props} />
}

export function FormSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <Select {...props} />
}

export function FormTextarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'min-h-24 w-full resize-y rounded-lg border border-border bg-white px-3.5 py-2 text-base text-ink placeholder:text-muted focus-visible:border-gold/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export function MoneyField({
  value,
  onChange,
  currency,
  label = 'Amount',
  required,
  allowNegative = false,
}: {
  value: string
  onChange: (value: string) => void
  currency: string
  label?: string
  required?: boolean
  allowNegative?: boolean
}) {
  return (
    <Field label={label} required={required}>
      <div className="flex">
        <span className="inline-flex min-w-14 items-center justify-center rounded-l-lg border border-r-0 border-border bg-cream px-2 text-xs font-semibold text-muted">
          {currency}
        </span>
        <Input
          className="rounded-l-none"
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          pattern={allowNegative ? '-?[0-9]*[.]?[0-9]*' : '[0-9]*[.]?[0-9]*'}
          placeholder="0.00"
          required={required}
        />
      </div>
    </Field>
  )
}

export function FormFeedback({
  error,
  success,
}: {
  error?: string | null
  success?: string | null
}) {
  if (!error && !success) return null
  return (
    <p
      className={cn(
        'rounded-lg px-3 py-2 text-sm',
        error ? 'bg-danger/10 text-danger' : 'bg-poker-green/10 text-poker-green',
      )}
      role={error ? 'alert' : 'status'}
    >
      {error ?? success}
    </p>
  )
}
