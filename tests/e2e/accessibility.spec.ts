import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { gameId, leagueId, playerOneId, stubApplication } from './applicationStub'

async function expectNoAxeViolations(page: Page, context: string) {
  const results = await new AxeBuilder({ page }).analyze()
  expect(
    results.violations,
    `${context}\n${results.violations
      .map((violation) => `${violation.id}: ${violation.help} (${violation.nodes.length})`)
      .join('\n')}`,
  ).toEqual([])
}

async function stubSignedOut(page: Page) {
  await page.route('**/auth/v1/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname
    const body = pathname.endsWith('/user') ? { message: 'not signed in' } : { session: null }
    await route.fulfill({
      status: pathname.endsWith('/user') ? 401 : 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    })
  })
}

test('authentication and guest routes pass automated accessibility checks', async ({ page }) => {
  await stubSignedOut(page)
  for (const route of ['/login', '/signup', '/i/not-a-token']) {
    await page.goto(route)
    await expect(page.locator('main')).toBeVisible()
    await expectNoAxeViolations(page, route)
  }
})

test('loaded guest RSVP flow passes automated accessibility checks', async ({ page }) => {
  await page.route('**/functions/v1/guest-invite', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        invitation: {
          status: 'pending',
          guestCount: 0,
          expiresAt: '2027-01-01T00:00:00Z',
        },
        event: {
          title: 'Friday Night Hold’em',
          kind: 'tournament',
          phase: 'inviting',
          scheduledAt: '2026-08-08T00:00:00Z',
          timezone: 'America/New_York',
          locationName: 'The Card Room',
          stakesLabel: '$100 + $10',
          capacity: 10,
          confirmedCount: 6,
        },
      }),
    })
  })
  await page.goto(`/i/${'a'.repeat(43)}`)
  await expect(page.getByRole('heading', { name: 'Friday Night Hold’em' })).toBeVisible()
  await expectNoAxeViolations(page, 'Loaded guest RSVP')
})

test('authenticated routes pass automated accessibility checks', async ({ page }) => {
  test.setTimeout(120_000)
  await stubApplication(page)
  const routes = [
    '/',
    '/leagues',
    '/games',
    `/leagues/${leagueId}`,
    `/leagues/${leagueId}/games/${gameId}`,
    `/leagues/${leagueId}/players/${playerOneId}`,
    '/pro',
    '/pro/sessions',
    '/pro/bankroll',
    '/pro/settlements',
    '/pro/travel',
    '/pro/staking',
    '/pro/calendar',
    '/pro/study',
    '/pro/reconciliation',
    '/pro/exports',
  ]

  for (const route of routes) {
    await page.goto(route)
    await expect(page.locator('main')).toBeVisible()
    await expectNoAxeViolations(page, route)
  }
})

test('navigation and creation dialogs pass automated accessibility checks', async ({ page }) => {
  await stubApplication(page)
  await page.goto('/leagues')

  const mobileNavigation = page.getByRole('navigation', { name: 'Mobile navigation' })
  if (await mobileNavigation.isVisible()) {
    await page.getByRole('button', { name: 'More' }).click()
    await expect(page.getByRole('dialog', { name: 'More' })).toBeVisible()
    await expectNoAxeViolations(page, 'More dialog')
    await page.getByRole('button', { name: 'Close More' }).click()
  }

  await page.getByRole('button', { name: 'New league' }).click()
  await expect(page.getByRole('dialog', { name: 'Create league' })).toBeVisible()
  await expectNoAxeViolations(page, 'Create league dialog')
})

test('error and empty states pass automated accessibility checks', async ({ page }) => {
  await stubApplication(page)
  await page.route('**/rest/v1/leagues**', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Test failure' }),
    })
  })
  await page.goto('/leagues')
  await expect(page.getByRole('alert')).toBeVisible()
  await expectNoAxeViolations(page, 'Leagues error state')
})

test('keyboard navigation reaches content and restores dialog focus', async ({ page }) => {
  await stubApplication(page)
  await page.goto('/leagues')
  await expect(page.getByRole('heading', { name: 'Leagues' })).toBeVisible()
  const skipLink = page.getByRole('link', { name: 'Skip to content' })
  await expect(skipLink).toBeAttached()
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  await page.keyboard.press('Tab')
  await expect(skipLink).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('main')).toBeFocused()

  const createButton = page.getByRole('button', { name: 'New league' })
  await createButton.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog', { name: 'Create league' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(createButton).toBeFocused()
})

test('text spacing, reduced motion, and forced colors remain usable', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 })
  await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'active' })
  await stubApplication(page)
  await page.goto('/leagues')
  await page.addStyleTag({
    content: `
      * {
        letter-spacing: 0.12em !important;
        line-height: 1.5 !important;
        word-spacing: 0.16em !important;
      }
      p { margin-bottom: 2em !important; }
    `,
  })
  await expect(page.getByRole('button', { name: 'New league' })).toBeVisible()
  const overflow = await page.evaluate(() => {
    const viewportWidth = window.innerWidth
    return {
      amount: document.documentElement.scrollWidth - viewportWidth,
      offenders: [...document.querySelectorAll<HTMLElement>('body *')]
        .map((element) => {
          const rect = element.getBoundingClientRect()
          return {
            tag: element.tagName,
            text: element.textContent?.trim().slice(0, 40),
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            className: element.className,
          }
        })
        .filter((item) => item.left < -1 || item.right > viewportWidth + 1)
        .slice(0, 8),
    }
  })
  expect(overflow.amount, JSON.stringify(overflow.offenders)).toBeLessThanOrEqual(1)
  const results = await new AxeBuilder({ page }).disableRules(['color-contrast']).analyze()
  expect(
    results.violations,
    `Forced colors and text spacing\n${results.violations
      .map((violation) => `${violation.id}: ${violation.help} (${violation.nodes.length})`)
      .join('\n')}`,
  ).toEqual([])
})
