import { expect, test } from '@playwright/test'

const token = 'a'.repeat(43)

test('guest can view and answer an invite without an account', async ({ page }) => {
  let savedStatus: string | null = null

  await page.route('**/functions/v1/guest-invite', async (route) => {
    const body = route.request().postDataJSON() as { action: string; status?: string }
    if (body.action === 'rsvp') savedStatus = body.status ?? null

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        invitation: {
          status: savedStatus ?? 'pending',
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

  await page.goto(`/i/${token}`)
  await expect(page.getByRole('heading', { name: 'Friday Night Hold’em' })).toBeVisible()
  await expect(page.getByText('No account required.')).toBeVisible()

  await page.getByRole('button', { name: /Yes/ }).click()
  await expect(page.getByText(/Response saved/)).toBeVisible()
  expect(savedStatus).toBe('yes')
})

test('invalid invite token exposes no event information', async ({ page }) => {
  await page.goto('/i/not-a-token')
  await expect(page.getByRole('heading', { name: 'Game invitation' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'This invitation is unavailable' })).toBeVisible()
  await expect(page.getByText('The invitation link is incomplete.')).toBeVisible()
})
