import { describe, expect, it, vi } from 'vitest'

vi.mock('./supabase', () => ({ supabase: {} }))
vi.mock('./env', () => ({ env: { plaidEnabled: false } }))
import {
  calculateCareerMetrics,
  calculateTripSpend,
  dashboardMetricCurrencies,
  decimalToMinorExact,
  formatDate,
  parseStandardBigBlindMinor,
  providerUrlForSettlement,
  selectActivePlaidConnection,
  type CareerSession,
  type DashboardData,
  type Settlement,
} from './pro'

function session(
  changes: Partial<CareerSession> & Pick<CareerSession, 'id' | 'session_kind' | 'profit_minor'>,
): CareerSession {
  const { id, session_kind, profit_minor, ...rest } = changes
  return {
    id,
    owner_id: '00000000-0000-4000-8000-000000000001',
    session_kind,
    medium: 'live',
    played_at: '2026-01-01T12:00:00.000Z',
    ended_at: null,
    venue: 'Test room',
    game_variant: "No-Limit Hold'em",
    stakes: null,
    duration_minutes: null,
    hands_played: null,
    entries: 1,
    buy_in_minor: '0',
    fees_minor: '0',
    payout_minor: '0',
    profit_minor,
    currency: 'USD',
    timezone: 'UTC',
    notes: null,
    tags: [],
    data_quality: 'trusted',
    created_at: '2026-01-01T12:00:00.000Z',
    ...rest,
  }
}

describe('parseStandardBigBlindMinor', () => {
  it('parses only standard small-blind/big-blind labels', () => {
    expect(parseStandardBigBlindMinor('$2/$5', 'USD')).toBe('500')
    expect(parseStandardBigBlindMinor('0.50/1', 'USD')).toBe('100')
    expect(parseStandardBigBlindMinor('2 / 5', 'USD')).toBe('500')
    expect(parseStandardBigBlindMinor('2/5 NLH', 'USD')).toBeNull()
    expect(parseStandardBigBlindMinor('5 bring-in', 'USD')).toBeNull()
  })
})

describe('settlement formatting and validation', () => {
  const settlement: Settlement = {
    id: '00000000-0000-4000-8000-000000000010',
    owner_id: '00000000-0000-4000-8000-000000000001',
    session_id: null,
    direction: 'payable',
    counterparty: 'Test player',
    amount_minor: '1250',
    currency: 'USD',
    reason: 'Test',
    external_method: 'Venmo',
    external_handle: '@test-player',
    provider_url: null,
    memo: null,
    due_date: '2026-01-01',
    status: 'pending',
    paid_at: null,
    confirmation_path: null,
    revision: 1,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  }

  it('rejects settlement precision that the currency cannot represent', () => {
    expect(decimalToMinorExact('12.34', 'USD')).toBe('1234')
    expect(() => decimalToMinorExact('12.345', 'USD')).toThrow(/2 decimal places/)
    expect(() => decimalToMinorExact('12.1', 'JPY')).toThrow(/does not use decimal/)
  })

  it('formats date-only values without shifting the calendar date', () => {
    expect(formatDate('2026-01-01')).toBe('Jan 1, 2026')
  })

  it('permits only HTTPS stored provider links', () => {
    expect(providerUrlForSettlement(settlement)).toBe('https://venmo.com/u/test-player')
    expect(providerUrlForSettlement({ ...settlement, provider_url: 'javascript:alert(1)' })).toBeNull()
    expect(providerUrlForSettlement({ ...settlement, provider_url: 'http://example.com/pay' })).toBeNull()
    expect(providerUrlForSettlement({ ...settlement, provider_url: 'https://example.com/pay' })).toBeNull()
    expect(providerUrlForSettlement({ ...settlement, provider_url: 'https://paypal.me/test' }))
      .toBe('https://paypal.me/test')
  })
})

describe('calculateCareerMetrics', () => {
  it('calculates weighted bb rates, ABI, and tournament entry volume', () => {
    const data: DashboardData = {
      sessions: [
        session({
          id: 'cash-1',
          session_kind: 'cash',
          profit_minor: '10000',
          payout_minor: '30000',
          buy_in_minor: '20000',
          stakes: '$2/$5',
          hands_played: 100,
          duration_minutes: 120,
        }),
        session({
          id: 'cash-2',
          session_kind: 'cash',
          profit_minor: '-5000',
          payout_minor: '5000',
          buy_in_minor: '10000',
          stakes: '0.50/1',
          hands_played: 100,
          duration_minutes: 60,
          played_at: '2026-01-02T12:00:00.000Z',
        }),
        session({
          id: 'tournament-1',
          session_kind: 'tournament',
          profit_minor: '10000',
          buy_in_minor: '10000',
          payout_minor: '20000',
          entries: 1,
          duration_minutes: 180,
          played_at: '2026-01-03T12:00:00.000Z',
        }),
        session({
          id: 'tournament-2',
          session_kind: 'tournament',
          profit_minor: '-30000',
          buy_in_minor: '30000',
          payout_minor: '0',
          entries: 3,
          duration_minutes: 240,
          played_at: '2026-01-04T12:00:00.000Z',
        }),
      ],
      accounts: [],
      ledger: [],
      goals: [],
      upcomingEvents: [],
    }

    const metrics = calculateCareerMetrics(data)

    expect(metrics.bbPer100).toBe(-15)
    expect(metrics.bbPerHour).toBe(-10)
    expect(metrics.abiMinor).toBe('10000')
    expect(metrics.tournamentEntries).toBe(4)
    expect(metrics.sessionCount).toBe(4)
  })

  it('excludes legacy-incomplete and other-currency sessions', () => {
    const data: DashboardData = {
      sessions: [
        session({
          id: 'trusted',
          session_kind: 'cash',
          profit_minor: '5000',
          payout_minor: '15000',
          buy_in_minor: '10000',
        }),
        session({
          id: 'legacy',
          session_kind: 'cash',
          profit_minor: '999999',
          payout_minor: '999999',
          data_quality: 'legacy_incomplete',
        }),
        session({
          id: 'eur',
          session_kind: 'cash',
          profit_minor: '5000',
          payout_minor: '5000',
          currency: 'EUR',
        }),
      ],
      accounts: [],
      ledger: [],
      goals: [],
      upcomingEvents: [],
    }

    expect(calculateCareerMetrics(data, 'USD').totalProfitMinor).toBe('5000')
  })
})

describe('professional dashboard and travel currency boundaries', () => {
  it('offers only currencies represented by trusted sessions or active accounts', () => {
    const data: DashboardData = {
      sessions: [
        session({
          id: 'trusted-cad',
          session_kind: 'cash',
          profit_minor: '100',
          currency: 'CAD',
        }),
        session({
          id: 'legacy-eur',
          session_kind: 'cash',
          profit_minor: '100',
          currency: 'EUR',
          data_quality: 'legacy_incomplete',
        }),
      ],
      accounts: [
        {
          id: 'active-jpy',
          owner_id: '00000000-0000-4000-8000-000000000001',
          name: 'Tokyo cash',
          account_type: 'cash',
          currency: 'JPY',
          opening_balance_minor: '1000',
          is_archived: false,
          created_at: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'archived-gbp',
          owner_id: '00000000-0000-4000-8000-000000000001',
          name: 'Old online account',
          account_type: 'online',
          currency: 'GBP',
          opening_balance_minor: '1000',
          is_archived: true,
          created_at: '2026-01-01T00:00:00.000Z',
        },
      ],
      ledger: [],
      goals: [],
      upcomingEvents: [],
    }

    expect(dashboardMetricCurrencies(data)).toEqual(['CAD', 'JPY'])
    expect(dashboardMetricCurrencies({ sessions: [], accounts: [] })).toEqual(['USD'])
  })

  it('excludes linked expenses whose currency does not match the trip', () => {
    const summary = calculateTripSpend(
      [
        { trip_id: 'trip-1', amount_minor: '5000', currency: 'USD' },
        { trip_id: 'trip-1', amount_minor: '2500', currency: 'USD' },
        { trip_id: 'trip-1', amount_minor: '9000', currency: 'EUR' },
        { trip_id: 'trip-2', amount_minor: '9999', currency: 'USD' },
      ],
      'trip-1',
      'USD',
    )

    expect(summary).toEqual({ amountMinor: '7500', excludedCurrencyCount: 1 })
  })
})

describe('Plaid connection recovery', () => {
  const connections = [
    {
      id: 'active-newest',
      institution_name: 'Primary bank',
      status: 'active' as const,
      created_at: '2026-07-26T00:00:00.000Z',
      updated_at: '2026-07-26T00:00:00.000Z',
    },
    {
      id: 'active-remembered',
      institution_name: 'Second bank',
      status: 'active' as const,
      created_at: '2026-07-25T00:00:00.000Z',
      updated_at: '2026-07-25T00:00:00.000Z',
    },
    {
      id: 'disconnected',
      institution_name: 'Old bank',
      status: 'disconnected' as const,
      created_at: '2026-07-24T00:00:00.000Z',
      updated_at: '2026-07-24T00:00:00.000Z',
    },
  ]

  it('prefers an active remembered connection and recovers from server state otherwise', () => {
    expect(selectActivePlaidConnection(connections, 'active-remembered')).toBe(
      'active-remembered',
    )
    expect(selectActivePlaidConnection(connections, 'disconnected')).toBe('active-newest')
    expect(selectActivePlaidConnection(connections, null)).toBe('active-newest')
    expect(selectActivePlaidConnection([], 'active-remembered')).toBeNull()
  })
})
