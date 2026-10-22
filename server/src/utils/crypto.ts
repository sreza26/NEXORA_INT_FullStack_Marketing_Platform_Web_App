import crypto from 'node:crypto'
import { config } from '../config/index.js'

/**
 * Authenticated encryption for secrets stored at rest.
 *
 * The Laravel reference stores withdrawal account details with
 * `encrypt()` (AES-256-CBC plus a MAC). This implementation uses
 * AES-256-GCM, which authenticates the ciphertext and therefore detects
 * tampering, and derives the key from `APP_KEY` / `ENCRYPTION_KEY`.
 *
 * Ciphertext is prefixed with `enc:v1:` so legacy plaintext rows can still be
 * read: `decryptSecret()` returns the raw value when the prefix is absent.
 */

const PREFIX = 'enc:v1:'
const IV_LENGTH = 12
const TAG_LENGTH = 16

function encryptionKey(): Buffer {
  return crypto.createHash('sha256').update(config.encryptionKey, 'utf8').digest()
}

export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(PREFIX)
}

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${PREFIX}${Buffer.concat([iv, tag, encrypted]).toString('base64')}`
}

export function decryptSecret(value: string | null | undefined): string | null {
  if (!value) return null
  if (!isEncrypted(value)) return value

  try {
    const payload = Buffer.from(value.slice(PREFIX.length), 'base64')
    const iv = payload.subarray(0, IV_LENGTH)
    const tag = payload.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
    const encrypted = payload.subarray(IV_LENGTH + TAG_LENGTH)

    const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
  } catch {
    return null
  }
}

/** Replace a value with a deterministic, non-reversible fingerprint. */
export function fingerprint(value: string): string {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex').slice(0, 12)
}
