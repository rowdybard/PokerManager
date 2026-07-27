import { describe, expect, it } from 'vitest'
import {
  sortProfileResults,
  summarizeProfileMoney,
  type ProfileResult,
} from './playerProfileCalculations'

function profileResult(
  id: string,
  gameDate: string,
  currency: string,
  buyInMinor: string,
  payoutMinor: string,
): ProfileResult {
  return {
    id,
    game_id: `game-${id}`,
    player_id: 'player-1',
    finish_position: 1,
    buy_in_amount: 0,
    payout: 0,
    points_earned: 10,
    rebuys: 0,
    created_at: `${gameDate.slice(0, 10)}T20:00:00.000Z`,
    total_buy_in_minor: buyInMinor,
    payout_minor: payoutMinor,
    data_quality: 'trusted',
    gameDate,
    currency,
  }
}

describe('player profile performance calculations', () => {
  it('sorts mapped results chronologically before cumulative series are built', () => {
    const later = profileResult('later', '2026-07-20T19:00:00.000Z', 'USD', '10000', '20000')
    const earlier = profileResult('earlier', '2026-07-01T19:00:00.000Z', 'USD', '10000', '0')

    expect(sortProfileResults([later, earlier]).map((result) => result.id)).toEqual([
      'earlier',
      'later',
    ])
  })

  it('does not aggregate trusted results across mixed currencies', () => {
    const summary = summarizeProfileMoney([
      profileResult('usd', '2026-07-01T19:00:00.000Z', 'USD', '10000', '25000'),
      profileResult('eur', '2026-07-02T19:00:00.000Z', 'EUR', '10000', '30000'),
    ])

    expect(summary).toEqual({
      currency: null,
      netMinor: null,
      mixedCurrencies: true,
    })
  })

  it('retains exact minor-unit aggregation for a single currency', () => {
    const summary = summarizeProfileMoney([
      profileResult('one', '2026-07-01T19:00:00.000Z', 'USD', '10001', '25002'),
      profileResult('two', '2026-07-02T19:00:00.000Z', 'USD', '5003', '10004'),
    ])

    expect(summary).toEqual({
      currency: 'USD',
      netMinor: 20002n,
      mixedCurrencies: false,
    })
  })
})
