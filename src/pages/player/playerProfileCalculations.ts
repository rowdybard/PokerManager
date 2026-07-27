import type { GameResult } from '../../types'

export interface ProfileResult extends GameResult {
  gameDate: string
  currency: string
}

export function trustedMinor(
  result: GameResult,
  field: 'total_buy_in_minor' | 'payout_minor',
) {
  const value = result[field]
  return result.data_quality === 'trusted' && value !== null && value !== undefined
    ? BigInt(value)
    : null
}

export function resultNetMinor(result: GameResult): bigint | null {
  const buyIn = trustedMinor(result, 'total_buy_in_minor')
  const payout = trustedMinor(result, 'payout_minor')
  return buyIn === null || payout === null ? null : payout - buyIn
}

export function sortProfileResults(results: ProfileResult[]): ProfileResult[] {
  return [...results].sort((left, right) => {
    const leftTime = Date.parse(left.gameDate)
    const rightTime = Date.parse(right.gameDate)
    if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
      return leftTime - rightTime
    }
    const dateOrder = left.gameDate.localeCompare(right.gameDate)
    return dateOrder || left.created_at.localeCompare(right.created_at) || left.id.localeCompare(right.id)
  })
}

export function summarizeProfileMoney(results: ProfileResult[]) {
  const trusted = results.filter((result) => resultNetMinor(result) !== null)
  const currencies = [...new Set(trusted.map((result) => result.currency))].sort()
  if (currencies.length !== 1) {
    return {
      currency: null,
      netMinor: null,
      mixedCurrencies: currencies.length > 1,
    }
  }
  return {
    currency: currencies[0],
    netMinor: trusted.reduce((sum, result) => sum + (resultNetMinor(result) ?? 0n), 0n),
    mixedCurrencies: false,
  }
}
