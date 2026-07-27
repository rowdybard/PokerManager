import type { Page } from '@playwright/test'

const userId = '00000000-0000-4000-8000-000000000001'
export const leagueId = '00000000-0000-4000-8000-000000000010'
const seasonId = '00000000-0000-4000-8000-000000000020'
export const gameId = '00000000-0000-4000-8000-000000000030'
export const playerOneId = '00000000-0000-4000-8000-000000000041'
const playerTwoId = '00000000-0000-4000-8000-000000000042'

const testUser = {
  id: userId,
  aud: 'authenticated',
  role: 'authenticated',
  email: 'member@example.com',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: {},
  created_at: '2026-01-01T00:00:00.000Z',
}

const testSession = {
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
  expires_in: 3600,
  expires_at: 4102444800,
  token_type: 'bearer',
  user: testUser,
}

const league = {
  id: leagueId,
  name: 'Thursday Night Poker',
  description: 'Weekly league',
  owner_id: userId,
  points_system: { type: 'position' },
  created_at: '2026-01-01T00:00:00.000Z',
}

const season = {
  id: seasonId,
  league_id: leagueId,
  name: 'Summer 2026',
  start_date: '2026-06-01',
  end_date: null,
  is_active: true,
  created_at: '2026-06-01T00:00:00.000Z',
}

const players = [
  {
    id: playerOneId,
    league_id: leagueId,
    user_id: null,
    display_name: 'Michael Adams',
    avatar_url: null,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: playerTwoId,
    league_id: leagueId,
    user_id: null,
    display_name: 'Ethan Brooks',
    avatar_url: null,
    created_at: '2026-01-01T00:00:00.000Z',
  },
]

const results = [
  {
    id: '00000000-0000-4000-8000-000000000051',
    game_id: gameId,
    player_id: playerOneId,
    finish_position: 1,
    buy_in_amount: 100,
    payout: 300,
    total_buy_in_minor: 10000,
    payout_minor: 30000,
    data_quality: 'trusted',
    points_earned: 612.5,
    rebuys: 0,
    created_at: '2026-07-01T00:00:00.000Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000052',
    game_id: gameId,
    player_id: playerTwoId,
    finish_position: 2,
    buy_in_amount: 100,
    payout: 0,
    total_buy_in_minor: 10000,
    payout_minor: 0,
    data_quality: 'trusted',
    points_earned: 538.75,
    rebuys: 0,
    created_at: '2026-07-01T00:00:00.000Z',
  },
]

export async function stubApplication(page: Page) {
  await page.addInitScript(
    ({ session }) => {
      window.localStorage.setItem('sb-127-auth-token', JSON.stringify(session))
    },
    { session: testSession },
  )

  await page.route('**/auth/v1/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname
    const body = pathname.endsWith('/user')
      ? testUser
      : pathname.endsWith('/logout')
        ? {}
        : testSession
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
  })

  await page.route('**/rest/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const table = url.pathname.split('/').at(-1)
    const select = url.searchParams.get('select') ?? ''
    const wantsObject = request.headers().accept?.includes('application/vnd.pgrst.object+json')
    let body: unknown = []

    if (table === 'league_members') {
      body = select === 'role' || wantsObject
        ? { role: 'owner' }
        : [{ league_id: leagueId, role: 'owner' }]
    } else if (table === 'leagues') {
      body = wantsObject ? league : [league]
    } else if (table === 'seasons') {
      body = [season]
    } else if (table === 'players') {
      body = players
    } else if (table === 'games') {
      body =
        select === 'id,buy_in'
          ? [{ id: gameId, buy_in: 100 }]
          : [
              {
                id: gameId,
                season_id: seasonId,
                league_id: leagueId,
                scheduled_date: '2026-07-01T19:00:00.000Z',
                status: 'completed',
                phase: 'completed',
                kind: 'tournament',
                currency: 'USD',
                buy_in: 100,
                location: 'The Den',
                notes: null,
                created_at: '2026-06-01T00:00:00.000Z',
              },
            ]
    } else if (table === 'game_results') {
      body = results
    } else if (wantsObject) {
      body = {}
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: {
        'content-range': Array.isArray(body)
          ? `0-${Math.max(0, body.length - 1)}/${body.length}`
          : '0-0/1',
      },
      body: JSON.stringify(body),
    })
  })
}
