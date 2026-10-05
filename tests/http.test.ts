import { afterEach, describe, expect, it, vi } from 'vitest'
import { readBody, readJson, requireSameOrigin } from '@/lib/server/http'

afterEach(() => vi.unstubAllEnvs())
describe('request boundaries', () => {
  it('requires the canonical origin for cookie-authenticated mutations', () => {
    vi.stubEnv('LIBRARY_APP_ORIGIN', 'https://library.example')
    expect(() => requireSameOrigin(new Request('https://library.example/api/upload-pdf', { headers: { origin: 'https://attacker.example' } }))).toThrow()
    expect(() => requireSameOrigin(new Request('https://library.example/api/upload-pdf'))).toThrow()
    expect(() => requireSameOrigin(new Request('http://internal:3000/api/upload-pdf', { headers: { origin: 'https://library.example' } }))).not.toThrow()
  })
  it('enforces byte limits even without a declared length', async () => {
    await expect(readBody(new Request('https://library.example', { method: 'POST', body: 'a'.repeat(65) }), 64)).rejects.toMatchObject({ status: 413 })
    await expect(readBody(new Request('https://library.example', { method: 'POST', body: 'small', headers: { 'content-length': '1000' } }), 64)).rejects.toMatchObject({ status: 413 })
  })
  it('handles invalid JSON as a validation error', async () => {
    await expect(readJson(new Request('https://library.example', { method: 'POST', body: '{invalid', headers: { 'content-type': 'application/json' } }))).rejects.toMatchObject({ status: 400 })
  })
})
