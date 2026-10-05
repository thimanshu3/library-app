import { describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword } from '@/lib/security/password'

describe('owner password storage', () => {
  it('stores a salted hash and checks the supplied password', async () => {
    const password = 'test-only-owner-password'
    const first = await hashPassword(password)
    const second = await hashPassword(password)
    expect(first).not.toContain(password)
    expect(first).not.toBe(second)
    expect(await verifyPassword(password, first)).toBe(true)
    expect(await verifyPassword('wrong-password', first)).toBe(false)
  })
  it('rejects malformed hashes and unsafe password lengths', async () => {
    await expect(hashPassword('short')).rejects.toThrow()
    expect(await verifyPassword('anything', 'malformed')).toBe(false)
    expect(await verifyPassword('a'.repeat(1025), 'scrypt:' + 'a'.repeat(32) + ':' + 'b'.repeat(64))).toBe(false)
  })
})
