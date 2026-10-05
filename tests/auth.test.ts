import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sealData } from 'iron-session'
import { hashPassword } from '@/lib/security/password'

const cookieStore = vi.hoisted(() => ({
  get: vi.fn(), set: vi.fn(), getAll: vi.fn(() => [])
}))
vi.mock('next/headers', () => ({ cookies: async () => cookieStore }))
import { getAuthConfig, getOwner, requireOwner, SESSION_COOKIE, SESSION_TTL } from '@/lib/server/auth'

beforeEach(async () => {
  vi.stubEnv('LIBRARY_OWNER_NAME', 'owner')
  vi.stubEnv('LIBRARY_OWNER_PASSWORD_HASH', await hashPassword('test-only-owner-password'))
  vi.stubEnv('LIBRARY_SESSION_SECRET', 'test-only-session-secret-with-more-than-32-characters')
  cookieStore.get.mockReturnValue(undefined)
})
afterEach(() => vi.unstubAllEnvs())

describe('owner sessions', () => {
  it('denies missing sessions and fails closed without configuration', async () => {
    expect(await getOwner()).toBeNull()
    await expect(requireOwner()).rejects.toMatchObject({ status: 401 })
    vi.stubEnv('LIBRARY_SESSION_SECRET', '')
    await expect(requireOwner()).rejects.toMatchObject({ status: 503 })
  })
  it('accepts a valid encrypted session and revokes it after password rotation', async () => {
    const config = getAuthConfig()
    const seal = await sealData({ ownerId: config.ownerId, expiresAt: Date.now() + 60_000 }, { password: config.secret, ttl: SESSION_TTL })
    cookieStore.get.mockReturnValue({ name: SESSION_COOKIE, value: seal })
    expect(await requireOwner()).toMatchObject({ name: 'owner' })
    vi.stubEnv('LIBRARY_OWNER_PASSWORD_HASH', await hashPassword('different-owner-password'))
    expect(await getOwner()).toBeNull()
  })
  it('rejects tampered sessions and explicitly expired sessions', async () => {
    cookieStore.get.mockReturnValue({ name: SESSION_COOKIE, value: 'forged-owner-cookie' })
    expect(await getOwner()).toBeNull()
    const config = getAuthConfig()
    const seal = await sealData({ ownerId: config.ownerId, expiresAt: Date.now() - 1 }, { password: config.secret, ttl: SESSION_TTL })
    cookieStore.get.mockReturnValue({ name: SESSION_COOKIE, value: seal })
    expect(await getOwner()).toBeNull()
  })
  it('rejects a correctly sealed session with a different owner identity', async () => {
    const config = getAuthConfig()
    const seal = await sealData({ ownerId: 'another-owner', expiresAt: Date.now() + 60_000 }, { password: config.secret, ttl: SESSION_TTL })
    cookieStore.get.mockReturnValue({ name: SESSION_COOKIE, value: seal })
    await expect(requireOwner()).rejects.toMatchObject({ status: 401 })
  })
})
