import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { hashPassword } from '@/lib/security/password'

const cookieStore = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn(), getAll: vi.fn(() => []) }))
vi.mock('next/headers', () => ({ cookies: async () => cookieStore }))
import { POST as login } from '@/app/api/auth/login/route'
import { POST as logout } from '@/app/api/auth/logout/route'
import { getOwner, SESSION_COOKIE } from '@/lib/server/auth'

beforeEach(async () => {
  vi.stubEnv('LIBRARY_OWNER_NAME', 'owner')
  vi.stubEnv('LIBRARY_OWNER_PASSWORD_HASH', await hashPassword('test-only-owner-password'))
  vi.stubEnv('LIBRARY_SESSION_SECRET', 'test-only-session-secret-with-more-than-32-characters')
  vi.stubEnv('LIBRARY_APP_ORIGIN', '')
  cookieStore.get.mockReturnValue(undefined)
  ;(globalThis as typeof globalThis & { libraryRateLimits?: Map<string, unknown> }).libraryRateLimits?.clear()
})
afterEach(() => vi.unstubAllEnvs())

function request(name = 'owner', password = 'test-only-owner-password', origin = 'https://library.test') {
  return new Request('https://library.test/api/auth/login', {
    method: 'POST', headers: { 'content-type': 'application/json', origin }, body: JSON.stringify({ name, password })
  })
}

describe('owner sign-in and sign-out', () => {
  it('creates a protected cookie on valid sign-in and clears it on sign-out', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    expect((await login(request())).status).toBe(200)
    const [name, seal, options] = cookieStore.set.mock.calls[0]
    expect(name).toBe(SESSION_COOKIE)
    expect(options).toMatchObject({ httpOnly: true, secure: true, sameSite: 'strict', path: '/' })
    expect(seal).not.toContain('test-only-owner-password')
    cookieStore.get.mockReturnValue({ name, value: seal })
    expect(await getOwner()).toMatchObject({ name: 'owner' })
    expect((await logout(new Request('https://library.test/api/auth/logout', { method: 'POST', headers: { origin: 'https://library.test' } }))).status).toBe(200)
    expect(cookieStore.set.mock.calls.at(-1)?.[2]).toMatchObject({ maxAge: 0 })
  })
  it('returns the same error for incorrect names and passwords without issuing cookies', async () => {
    const wrongName = await login(request('other-owner'))
    const wrongPassword = await login(request('owner', 'incorrect-password'))
    expect(wrongName.status).toBe(401)
    expect(wrongPassword.status).toBe(401)
    expect(await wrongName.json()).toEqual(await wrongPassword.json())
    expect(cookieStore.set).not.toHaveBeenCalled()
  })
  it('rejects cross-origin and oversized credential requests', async () => {
    expect((await login(request('owner', 'test-only-owner-password', 'https://evil.test'))).status).toBe(403)
    expect((await login(request('owner', 'x'.repeat(5000)))).status).toBe(413)
    expect(cookieStore.set).not.toHaveBeenCalled()
  })
  it('bounds login attempts and does not trust client IP headers', async () => {
    for (let index = 0; index < 10; index++) {
      const attempt = request('owner', 'wrong-password')
      attempt.headers.set('x-forwarded-for', `1.2.3.${index}`)
      expect((await login(attempt)).status).toBe(401)
    }
    expect((await login(request())).status).toBe(429)
    expect(cookieStore.set).not.toHaveBeenCalled()
  })
})
