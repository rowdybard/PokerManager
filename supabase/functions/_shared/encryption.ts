import { requiredEnv } from './env.ts'

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/')
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0))
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer
}

async function encryptionKey() {
  const raw = base64UrlToBytes(requiredEnv('PLAID_TOKEN_ENCRYPTION_KEY'))
  if (raw.byteLength !== 32) {
    throw new Error('PLAID_TOKEN_ENCRYPTION_KEY must be a base64url-encoded 32-byte key.')
  }
  return crypto.subtle.importKey('raw', toArrayBuffer(raw), 'AES-GCM', false, [
    'encrypt',
    'decrypt',
  ])
}

export async function encryptServerSecret(value: string, ownerId: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: toArrayBuffer(iv),
      additionalData: new TextEncoder().encode(ownerId),
    },
    await encryptionKey(),
    new TextEncoder().encode(value),
  )
  return `v1.${bytesToBase64Url(iv)}.${bytesToBase64Url(new Uint8Array(encrypted))}`
}

export async function decryptServerSecret(value: string, ownerId: string): Promise<string> {
  const [version, encodedIv, encodedCiphertext] = value.split('.')
  if (version !== 'v1' || !encodedIv || !encodedCiphertext) {
    throw new Error('Stored server secret has an unsupported format.')
  }
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: toArrayBuffer(base64UrlToBytes(encodedIv)),
      additionalData: new TextEncoder().encode(ownerId),
    },
    await encryptionKey(),
    toArrayBuffer(base64UrlToBytes(encodedCiphertext)),
  )
  return new TextDecoder().decode(decrypted)
}
