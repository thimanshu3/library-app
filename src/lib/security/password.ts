import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

const HASH_PATTERN = /^scrypt:32768:8:3:([a-f0-9]{32}):([a-f0-9]{64})$/

export function isPasswordHash(value: string): boolean {
  return HASH_PATTERN.test(value)
}

function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // OWASP's 32 MiB scrypt profile; stored parameters allow deliberate future upgrades.
    scrypt(password, salt, 32, { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 }, (error, key) => {
      if (error) reject(error)
      else resolve(key)
    })
  })
}

export async function hashPassword(password: string): Promise<string> {
  if (password.length < 12 || password.length > 1024) {
    throw new Error('Use a password between 12 and 1024 characters.')
  }
  const salt = randomBytes(16).toString('hex')
  const key = await derive(password, salt)
  // Colons avoid dotenv variable expansion of dollar-delimited hashes.
  return `scrypt:32768:8:3:${salt}:${key.toString('hex')}`
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const match = HASH_PATTERN.exec(hash)
  if (!match || password.length > 1024) return false
  const key = await derive(password, match[1])
  return timingSafeEqual(key, Buffer.from(match[2], 'hex'))
}
