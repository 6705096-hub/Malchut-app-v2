/**
 * Chat Message Encryption — AES-256-GCM server-side
 *
 * Protects message text at rest in the database.
 * Requires env var: CHAT_ENCRYPTION_KEY=<64-char hex string (32 bytes)>
 *
 * Generate a key:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * Encrypted format stored in DB:
 *   "enc:<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 *
 * Graceful degradation: if key is not set, text passes through unchanged.
 * Migration-safe: existing unencrypted messages (no "enc:" prefix) are
 * returned as-is without crashing.
 */

import crypto from 'crypto'

const ALGORITHM  = 'aes-256-gcm'
const ENC_PREFIX = 'enc:'

function getKey(): Buffer | null {
  const hex = process.env.CHAT_ENCRYPTION_KEY
  if (!hex || hex.length !== 64) return null
  return Buffer.from(hex, 'hex')
}

/** Encrypt a plain text message. Returns original if key not configured. */
export function encryptMessage(plaintext: string): string {
  const key = getKey()
  if (!key) return plaintext  // graceful no-op

  const iv = crypto.randomBytes(12)                          // 96-bit IV for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()

  return `${ENC_PREFIX}${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`
}

/** Decrypt a message stored in the DB. Returns original if not encrypted or key not set. */
export function decryptMessage(stored: string | null): string | null {
  if (!stored) return null

  // Not encrypted (legacy / key not configured) → return as-is
  if (!stored.startsWith(ENC_PREFIX)) return stored

  const key = getKey()
  if (!key) {
    // Key removed but data is encrypted — return placeholder
    return '[הודעה מוצפנת]'
  }

  try {
    const payload    = stored.slice(ENC_PREFIX.length)
    const [ivHex, tagHex, ctHex] = payload.split(':')
    if (!ivHex || !tagHex || !ctHex) return '[שגיאת פענוח]'

    const iv         = Buffer.from(ivHex,  'hex')
    const authTag    = Buffer.from(tagHex, 'hex')
    const ciphertext = Buffer.from(ctHex,  'hex')

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    return decipher.update(ciphertext).toString('utf8') + decipher.final('utf8')
  } catch {
    return '[שגיאת פענוח]'
  }
}

/** True if encryption is configured in env */
export function isEncryptionEnabled(): boolean {
  return getKey() !== null
}
