import { describe, expect, it } from 'vitest'
import { randomUrlToken, sha256Hex, timingSafeEqual } from './crypto.ts'

describe('Edge Function crypto helpers', () => {
  it('hashes invitation tokens deterministically without retaining the raw token', async () => {
    await expect(sha256Hex('poker-manager')).resolves.toBe(
      'c3eaaa3b8b465c36a0841b924768405b083d4d2ae0fbef9249a1e1ed2332f7a8',
    )
  })

  it('creates high-entropy URL-safe tokens', () => {
    const first = randomUrlToken()
    const second = randomUrlToken()
    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(second).not.toBe(first)
  })

  it('compares secrets without an early-return length branch', () => {
    expect(timingSafeEqual('same-secret', 'same-secret')).toBe(true)
    expect(timingSafeEqual('same-secret', 'other-secret')).toBe(false)
    expect(timingSafeEqual('short', 'much-longer')).toBe(false)
  })
})
