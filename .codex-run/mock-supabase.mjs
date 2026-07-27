import http from 'node:http'

const userId = '11111111-1111-4111-8111-111111111111'
const leagueId = '22222222-2222-4222-8222-222222222222'
const seasonId = '33333333-3333-4333-8333-333333333333'
const now = Math.floor(Date.now() / 1000)
const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
const accessToken = `${encode({ alg: 'none', typ: 'JWT' })}.${encode({
  aud: 'authenticated',
  exp: now + 3600,
  iat: now,
  role: 'authenticated',
  sub: userId,
})}.fixture`

const sessions = [
  ['2026-07-19T23:00:00Z', '-12000', 'The Den'],
  ['2026-07-12T23:00:00Z', '15500', 'The Den'],
  ['2026-07-05T23:00:00Z', '31000', 'Riverside Club'],
  ['2026-06-28T23:00:00Z', '8500', 'The Den'],
  ['2026-06-21T23:00:00Z', '-21000', 'Riverside Club'],
].map(([playedAt, profitMinor, venue], index) => ({
  id: `50000000-0000-4000-8000-00000000000${index}`,
  owner_id: userId,
  session_kind: 'cash',
  medium: 'live',
  played_at: playedAt,
  ended_at: null,
  venue,
  game_variant: "No Limit Hold'em",
  stakes: '$1 / $2',
  duration_minutes: 300,
  hands_played: null,
  entries: 1,
  buy_in_minor: '30000',
  fees_minor: '0',
  payout_minor: String(30000 + Number(profitMinor)),
  profit_minor: profitMinor,
  currency: 'USD',
  timezone: 'America/New_York',
  notes: null,
  tags: [],
  data_quality: 'trusted',
  created_at: playedAt,
}))

const responses = {
  league_members: [
    { league_id: leagueId, user_id: userId, role: 'owner', joined_at: '2026-01-01T00:00:00Z' },
  ],
  leagues: [
    {
      id: leagueId,
      name: 'Thursday Night Poker',
      description: 'Weekly private game',
      owner_id: userId,
      points_system: { type: 'position', positionPoints: { 1: 10, 2: 7, 3: 5 } },
      created_at: '2026-01-01T00:00:00Z',
    },
  ],
  games: [
    {
      id: '44444444-4444-4444-8444-444444444444',
      season_id: seasonId,
      league_id: leagueId,
      scheduled_date: '2026-08-01T22:00:00Z',
      status: 'scheduled',
      buy_in: 100,
      location: 'The Den',
      notes: null,
      created_at: '2026-07-01T00:00:00Z',
      title: 'Saturday Night $1 / $2',
      kind: 'cash',
      phase: 'registration',
      currency: 'USD',
      capacity: 18,
      small_blind: 1,
      big_blind: 2,
      min_buy_in: 100,
      max_buy_in: 300,
      entry_fee: 0,
      rake: 0,
      invite_token_expires_at: null,
      leagues: { name: 'Thursday Night Poker' },
    },
  ],
  career_sessions: sessions,
  bankroll_accounts: [
    {
      id: '60000000-0000-4000-8000-000000000000',
      owner_id: userId,
      name: 'Poker bankroll',
      account_type: 'cash',
      currency: 'USD',
      opening_balance_minor: '2845000',
      is_archived: false,
      created_at: '2026-01-01T00:00:00Z',
    },
  ],
  bankroll_ledger_entries: [],
  career_goals: [],
  professional_calendar_events: [],
  settlements: [
    {
      id: '70000000-0000-4000-8000-000000000001',
      owner_id: userId,
      session_id: null,
      direction: 'payable',
      counterparty: 'Michael R.',
      amount_minor: '64000',
      currency: 'USD',
      reason: 'Game settlement',
      external_method: null,
      external_handle: null,
      provider_url: null,
      memo: null,
      due_date: '2026-08-02',
      status: 'pending',
      paid_at: null,
      confirmation_path: null,
      created_at: '2026-07-25T00:00:00Z',
    },
    {
      id: '70000000-0000-4000-8000-000000000002',
      owner_id: userId,
      session_id: null,
      direction: 'payable',
      counterparty: 'Ethan A.',
      amount_minor: '39000',
      currency: 'USD',
      reason: 'Game settlement',
      external_method: null,
      external_handle: null,
      provider_url: null,
      memo: null,
      due_date: null,
      status: 'pending',
      paid_at: null,
      confirmation_path: null,
      created_at: '2026-07-24T00:00:00Z',
    },
    {
      id: '70000000-0000-4000-8000-000000000003',
      owner_id: userId,
      session_id: null,
      direction: 'payable',
      counterparty: 'Jason K.',
      amount_minor: '21000',
      currency: 'USD',
      reason: 'Game settlement',
      external_method: null,
      external_handle: null,
      provider_url: null,
      memo: null,
      due_date: null,
      status: 'pending',
      paid_at: null,
      confirmation_path: null,
      created_at: '2026-07-23T00:00:00Z',
    },
  ],
}

const server = http.createServer((request, response) => {
  const origin = request.headers.origin ?? '*'
  response.setHeader('Access-Control-Allow-Origin', origin)
  response.setHeader('Access-Control-Allow-Headers', '*')
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS')
  response.setHeader('Content-Type', 'application/json')
  response.setHeader('Vary', 'Origin')
  if (request.method === 'OPTIONS') {
    response.writeHead(204)
    response.end()
    return
  }

  const url = new URL(request.url ?? '/', 'http://127.0.0.1:54321')
  if (url.pathname === '/auth/v1/token') {
    response.end(
      JSON.stringify({
        access_token: accessToken,
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: now + 3600,
        refresh_token: 'fixture-refresh-token',
        user: {
          id: userId,
          aud: 'authenticated',
          role: 'authenticated',
          email: 'fixture@pokermanager.test',
          email_confirmed_at: '2026-01-01T00:00:00Z',
          phone: '',
          confirmed_at: '2026-01-01T00:00:00Z',
          last_sign_in_at: new Date().toISOString(),
          app_metadata: { provider: 'email', providers: ['email'] },
          user_metadata: {},
          identities: [],
          created_at: '2026-01-01T00:00:00Z',
          updated_at: new Date().toISOString(),
          is_anonymous: false,
        },
      }),
    )
    return
  }

  const table = url.pathname.split('/').at(-1)
  if (request.method === 'GET' && table && table in responses) {
    response.end(JSON.stringify(responses[table]))
    return
  }

  response.writeHead(404)
  response.end(JSON.stringify({ message: `No fixture for ${url.pathname}` }))
})

server.listen(54321, '127.0.0.1', () => {
  console.log('Mock Supabase listening on http://127.0.0.1:54321')
})
