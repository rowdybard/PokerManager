import { expect, test } from '@playwright/test'
import { stubApplication } from './applicationStub'

const handId = '00000000-0000-4000-8000-000000000071'

const queuedHand = {
  id: handId,
  owner_id: '00000000-0000-4000-8000-000000000001',
  session_id: null,
  played_at: '2026-07-20T01:30:00.000Z',
  source: 'manual',
  game_variant: "No-Limit Hold'em",
  stakes: '$2 / $5',
  position: 'Button',
  hero_cards: 'As Ks',
  board: 'Qs Jh 4c',
  pot_minor: '18500',
  result_minor: '9200',
  currency: 'USD',
  opponent_aliases: ['River Rat'],
  tags: ['three-bet pot'],
  hand_history: 'Hero raises the button and reviews the turn decision.',
  notes: 'Compare the turn sizing against the solver output.',
  review_status: 'queued',
  created_at: '2026-07-20T02:00:00.000Z',
}

test.use({ viewport: { width: 390, height: 844 } })

test('More menu navigates to Study and Reconciliation destinations', async ({ page }) => {
  await stubApplication(page)
  await page.goto('/')

  const moreButton = page.getByRole('button', { name: 'More' })
  await moreButton.click()
  const moreDialog = page.getByRole('dialog', { name: 'More' })
  await expect(moreDialog).toBeVisible()
  await moreDialog.getByRole('link', { name: 'Study' }).click()

  await expect(page).toHaveURL(/\/pro\/study$/)
  await expect(page.getByRole('heading', { name: 'Hands & study' })).toBeVisible()
  await expect(moreDialog).not.toBeVisible()
  await expect(moreButton).toHaveAttribute('aria-expanded', 'false')

  await moreButton.click()
  await page.getByRole('dialog', { name: 'More' }).getByRole('link', { name: 'Reconciliation' }).click()

  await expect(page).toHaveURL(/\/pro\/reconciliation$/)
  await expect(page.getByRole('heading', { name: 'Bank reconciliation' })).toBeVisible()
  await expect(page.getByText('Plaid disabled')).toBeVisible()
})

test('hand review mutations serialize per row and recover after an error', async ({ page }) => {
  await stubApplication(page)

  let reviewStatus = queuedHand.review_status
  let patchCount = 0
  let releaseFirstMutation!: () => void
  const firstMutationGate = new Promise<void>((resolve) => {
    releaseFirstMutation = resolve
  })

  await page.route('**/rest/v1/poker_hands**', async (route) => {
    if (route.request().method() === 'PATCH') {
      patchCount += 1
      const payload = route.request().postDataJSON() as { review_status: typeof queuedHand.review_status }

      if (patchCount === 1) {
        await firstMutationGate
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Review service unavailable' }),
        })
        return
      }

      reviewStatus = payload.review_status
      await route.fulfill({ status: 204, body: '' })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ ...queuedHand, review_status: reviewStatus }]),
    })
  })

  await page.goto('/pro/study')
  const handRow = page.locator('article').filter({ hasText: "No-Limit Hold'em" })
  await expect(handRow).toBeVisible()

  await handRow.getByRole('button', { name: 'Mark reviewed' }).click()
  await expect(handRow.getByRole('button', { name: 'Marking reviewed…' })).toBeDisabled()
  const archiveButton = handRow.getByRole('button', { name: 'Archive' })
  await expect(archiveButton).toBeDisabled()
  await archiveButton.evaluate((element) => (element as HTMLButtonElement).click())
  expect(patchCount).toBe(1)

  releaseFirstMutation()
  await expect(handRow.getByRole('alert')).toHaveText('Review service unavailable')
  await expect(handRow.getByRole('button', { name: 'Mark reviewed' })).toBeEnabled()
  await expect(archiveButton).toBeEnabled()

  await handRow.getByRole('button', { name: 'Mark reviewed' }).click()
  await expect(page.getByText('Hand marked reviewed.')).toBeVisible()
  await expect(handRow).not.toBeVisible()
  expect(patchCount).toBe(2)
})
