import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { decryptServerSecret, encryptServerSecret } from './encryption.ts'

describe('server-only token encryption', () => {
  beforeEach(() => {
    vi.stubGlobal('Deno', {
      env: {
        get: (name: string) =>
          name === 'PLAID_TOKEN_ENCRYPTION_KEY'
            ? 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
            : undefined,
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('round-trips an access token without storing plaintext', async () => {
    const encrypted = await encryptServerSecret('access-sandbox-secret', 'owner-1')
    expect(encrypted).toMatch(/^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/)
    expect(encrypted).not.toContain('access-sandbox-secret')
    await expect(decryptServerSecret(encrypted, 'owner-1')).resolves.toBe(
      'access-sandbox-secret',
    )
  })

  it('binds ciphertext to its owner as authenticated additional data', async () => {
    const encrypted = await encryptServerSecret('access-sandbox-secret', 'owner-1')
    await expect(decryptServerSecret(encrypted, 'owner-2')).rejects.toThrow()
  })
})
