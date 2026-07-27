import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export interface MoneyValueProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  value: number | string
  minorUnits?: boolean
  currency?: string
  showPlus?: boolean
  compact?: boolean
  tone?: 'auto' | 'neutral' | 'profit' | 'loss'
}

function getSign(value: number | string) {
  if (typeof value === 'number') return Math.sign(value)
  const normalized = value.trim()
  if (/^[+-]?\d+$/.test(normalized)) {
    return normalized === '' ? 0 : normalized.startsWith('-') && BigInt(normalized) !== 0n ? -1 : BigInt(normalized) > 0n ? 1 : 0
  }
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? Math.sign(parsed) : 0
}

function formatMinorUnitString(
  rawValue: string,
  currency: string,
  showPlus: boolean,
  compact: boolean,
) {
  const minorValue = BigInt(rawValue.trim())
  const sign = minorValue < 0n ? -1 : minorValue > 0n ? 1 : 0
  const absolute = minorValue < 0n ? -minorValue : minorValue
  const options: Intl.NumberFormatOptions = {
    style: 'currency',
    currency,
    notation: compact ? 'compact' : 'standard',
    signDisplay: showPlus ? 'exceptZero' : 'auto',
  }
  const formatter = new Intl.NumberFormat(undefined, options)
  const fractionDigits = formatter.resolvedOptions().maximumFractionDigits ?? 2
  const scale = 10n ** BigInt(fractionDigits)
  const major = absolute / scale

  if (compact && major >= 1000n) {
    const signedMajor = sign < 0 ? -major : major
    return formatter.format(signedMajor)
  }

  const fraction = (absolute % scale).toString().padStart(fractionDigits, '0')
  const templateMagnitude = major === 0n && sign !== 0 ? 1n : major
  const templateValue = sign < 0 ? -templateMagnitude : templateMagnitude
  let integerReplaced = false

  return formatter
    .formatToParts(templateValue)
    .map((part) => {
      if (part.type === 'integer' && major === 0n && !integerReplaced) {
        integerReplaced = true
        return '0'
      }
      if (part.type === 'fraction') return fraction
      return part.value
    })
    .join('')
}

export function MoneyValue({
  value,
  minorUnits = false,
  currency = 'USD',
  showPlus = false,
  compact = false,
  tone = 'auto',
  className,
  ...props
}: MoneyValueProps) {
  const amount = typeof value === 'number' ? (minorUnits ? value / 100 : value) : null
  const isIntegerString = typeof value === 'string' && /^[+-]?\d+$/.test(value.trim())
  const rendered = amount !== null
    ? new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
        notation: compact ? 'compact' : 'standard',
        signDisplay: showPlus ? 'exceptZero' : 'auto',
        minimumFractionDigits: compact ? 0 : 2,
        maximumFractionDigits: compact ? 1 : 2,
      }).format(amount)
    : minorUnits && isIntegerString
      ? formatMinorUnitString(value, currency, showPlus, compact)
      : value
  const valueSign = getSign(value)
  const resolvedTone = tone === 'auto'
    ? valueSign > 0
      ? 'profit'
      : valueSign < 0
        ? 'loss'
        : 'neutral'
    : tone

  return (
    <span
      className={cn(
        'tnum whitespace-nowrap font-medium',
        resolvedTone === 'profit' && 'text-profit',
        resolvedTone === 'loss' && 'text-loss',
        resolvedTone === 'neutral' && 'text-ink',
        className,
      )}
      {...props}
    >
      {rendered}
    </span>
  )
}
