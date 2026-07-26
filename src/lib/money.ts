import type { Money } from '../types'

const INTEGER_PATTERN = /^-?\d+$/
const CURRENCY_PATTERN = /^[A-Z]{3}$/

export function assertMinorAmount(amountMinor: string): bigint {
  if (!INTEGER_PATTERN.test(amountMinor)) {
    throw new TypeError('Money must use an integer minor-unit string.')
  }
  return BigInt(amountMinor)
}

export function assertCurrency(currency: string): asserts currency is Money['currency'] {
  if (!CURRENCY_PATTERN.test(currency)) {
    throw new TypeError('Currency must be a three-letter ISO 4217 code.')
  }
}

export function money(amountMinor: string | bigint, currency: string): Money {
  const normalizedAmount = String(amountMinor)
  assertMinorAmount(normalizedAmount)
  assertCurrency(currency)
  return { amountMinor: normalizedAmount, currency }
}

function assertSameCurrency(left: Money, right: Money) {
  if (left.currency !== right.currency) {
    throw new TypeError('Money values must use the same currency.')
  }
}

export function addMoney(left: Money, right: Money): Money {
  assertSameCurrency(left, right)
  return money(
    assertMinorAmount(left.amountMinor) + assertMinorAmount(right.amountMinor),
    left.currency,
  )
}

export function subtractMoney(left: Money, right: Money): Money {
  assertSameCurrency(left, right)
  return money(
    assertMinorAmount(left.amountMinor) - assertMinorAmount(right.amountMinor),
    left.currency,
  )
}

export function compareMoney(left: Money, right: Money): number {
  assertSameCurrency(left, right)
  const leftAmount = assertMinorAmount(left.amountMinor)
  const rightAmount = assertMinorAmount(right.amountMinor)
  return leftAmount === rightAmount ? 0 : leftAmount > rightAmount ? 1 : -1
}

function fractionDigits(currency: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).resolvedOptions().maximumFractionDigits ?? 2
}

export function formatMoney(value: Money, locale = 'en-US'): string {
  assertCurrency(value.currency)
  const digits = fractionDigits(value.currency, locale)
  const divisor = 10n ** BigInt(digits)
  const amount = assertMinorAmount(value.amountMinor)
  const negative = amount < 0n
  const absolute = negative ? -amount : amount
  const whole = absolute / divisor
  const fraction = absolute % divisor
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: value.currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
  const pattern = formatter.formatToParts(negative ? -1.1 : 1.1)
  const wholeParts = new Intl.NumberFormat(locale, {
    useGrouping: true,
    maximumFractionDigits: 0,
  })
    .formatToParts(whole)
    .filter((part) => part.type === 'integer' || part.type === 'group')
  const decimal = pattern.find((part) => part.type === 'decimal')?.value ?? '.'
  let insertedNumber = false

  return pattern
    .flatMap((part) => {
      if (!['integer', 'group', 'decimal', 'fraction'].includes(part.type)) {
        return [part]
      }
      if (insertedNumber || part.type !== 'integer') return []
      insertedNumber = true
      return digits
        ? [
            ...wholeParts,
            { type: 'decimal' as const, value: decimal },
            {
              type: 'fraction' as const,
              value: fraction.toString().padStart(digits, '0'),
            },
          ]
        : wholeParts
    })
    .map((part) => part.value)
    .join('')
}
