import { expect, test, type Page } from '@playwright/test'
import { leagueId, stubApplication } from './applicationStub'

async function expectNoHorizontalOverflow(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() => ({
        client: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
      })),
    )
    .toMatchObject({ client: page.viewportSize()?.width })
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  const offenders =
    overflow > 1
      ? await page.evaluate(() =>
          Array.from(document.querySelectorAll<HTMLElement>('body *'))
            .filter((element) => element.getBoundingClientRect().right > document.documentElement.clientWidth + 1)
            .slice(0, 5)
            .map((element) => ({
              tag: element.tagName,
              className: element.className,
              right: Math.round(element.getBoundingClientRect().right),
            })),
        )
      : []
  expect(overflow, JSON.stringify(offenders)).toBeLessThanOrEqual(1)
}

async function expectAlignedStandings(page: Page) {
  const standings =
    (page.viewportSize()?.width ?? 0) < 768
      ? page.getByRole('list', { name: /standings/i })
      : page.getByRole('table')
  const first = await standings.getByText('612.5', { exact: true }).boundingBox()
  const second = await standings.getByText('538.75', { exact: true }).boundingBox()
  expect(first).not.toBeNull()
  expect(second).not.toBeNull()
  expect(Math.abs(first!.x + first!.width - (second!.x + second!.width))).toBeLessThanOrEqual(2)
}

for (const width of [320, 360, 414, 768, 1024, 1440]) {
  test(`${width}px: actions, standings, overflow, and navigation clearance`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await stubApplication(page)

    await page.goto('/leagues')
    const primaryAction = page.getByRole('button', { name: 'New league' })
    await expect(primaryAction).toBeVisible()
    const actionBox = await primaryAction.boundingBox()
    expect(actionBox).not.toBeNull()
    expect(actionBox!.height).toBeGreaterThanOrEqual(44)
    await expectNoHorizontalOverflow(page)

    const mobileNavigation = page.getByRole('navigation', { name: 'Mobile navigation' })
    if (width < 1024) {
      await expect(mobileNavigation).toBeVisible()
      const clearance = await page.evaluate(() => {
        const main = document.querySelector('main')
        const navigation = document.querySelector('nav[aria-label="Mobile navigation"]')
        if (!(main instanceof HTMLElement) || !(navigation instanceof HTMLElement)) return -1
        return Number.parseFloat(getComputedStyle(main).paddingBottom) - navigation.getBoundingClientRect().height
      })
      expect(clearance).toBeGreaterThanOrEqual(0)
    } else {
      await expect(mobileNavigation).toBeHidden()
    }

    await page.goto(`/leagues/${leagueId}`)
    await expect(page.getByRole('heading', { name: 'League standings' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Michael Adams' })).toBeVisible()
    await expectAlignedStandings(page)
    await expectNoHorizontalOverflow(page)
  })
}

test('content remains usable at 200% text size', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 900 })
  await stubApplication(page)
  await page.goto('/leagues')
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
  })
  await expect(page.getByRole('button', { name: 'New league' })).toBeVisible()
  await expectNoHorizontalOverflow(page)
})

test('400% zoom equivalent reflows to a 320 CSS pixel viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await stubApplication(page)
  await page.goto(`/leagues/${leagueId}`)
  const devtools = await page.context().newCDPSession(page)
  await devtools.send('Emulation.setPageScaleFactor', { pageScaleFactor: 4 })
  await expect.poll(() => page.evaluate(() => window.visualViewport?.scale ?? 1)).toBe(4)
  await devtools.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 })
  await page.setViewportSize({ width: 320, height: 900 })
  await expect(page.getByRole('heading', { name: 'League standings' })).toBeVisible()
  await expectAlignedStandings(page)
  await expectNoHorizontalOverflow(page)
})
