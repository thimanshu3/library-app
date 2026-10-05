import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ebookResponse, isEbookKey, parseByteRange, storeEbook } from '@/lib/server/storage'

let directory: string
beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'library-storage-test-'))
  vi.stubEnv('LIBRARY_STORAGE_DRIVER', 'local')
  vi.stubEnv('LIBRARY_STORAGE_DIRECTORY', directory)
})
afterEach(async () => { vi.unstubAllEnvs(); await rm(directory, { recursive: true, force: true }) })

describe('private ebook storage', () => {
  it('uses opaque keys and serves owner files and byte ranges without caching', async () => {
    const url = await storeEbook(Buffer.from('%PDF-1.7\nhello\n%%EOF'), 'pdf')
    const key = url.split('/').pop()!
    expect(url).toMatch(/^\/api\/files\/[a-f0-9-]+\.pdf$/)
    const full = await ebookResponse(new Request('https://library.test' + url), key)
    expect(full.headers.get('cache-control')).toBe('private, no-store')
    expect(await full.text()).toContain('hello')
    const partial = await ebookResponse(new Request('https://library.test' + url, { headers: { range: 'bytes=0-3' } }), key)
    expect(partial.status).toBe(206)
    expect(await partial.text()).toBe('%PDF')
    const head = await ebookResponse(new Request('https://library.test' + url, { method: 'HEAD' }), key)
    expect(head.body).toBeNull()
    expect(head.headers.get('content-length')).toBe('20')
    const unsatisfiable = await ebookResponse(new Request('https://library.test' + url, { headers: { range: 'bytes=999-1000' } }), key)
    expect(unsatisfiable.status).toBe(416)
    expect(unsatisfiable.headers.get('content-range')).toBe('bytes */20')
  })
  it('rejects traversal, URLs, and non-ebook paths', async () => {
    for (const key of ['../secret.pdf', '/etc/passwd', 'https://example.com/book.pdf', '123.html', 'a.pdf']) {
      expect(isEbookKey(key)).toBe(false)
      await expect(ebookResponse(new Request('https://library.test/'), key)).rejects.toMatchObject({ status: 404 })
    }
    expect(isEbookKey('1789732136793-manssearchformeaning.pdf')).toBe(true)
  })
  it('fails closed for unconfigured or relative production storage', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('LIBRARY_STORAGE_DRIVER', '')
    await expect(storeEbook(Buffer.from('test'), 'pdf')).rejects.toMatchObject({ status: 503 })
    vi.stubEnv('LIBRARY_STORAGE_DRIVER', 'local')
    vi.stubEnv('LIBRARY_STORAGE_DIRECTORY', 'public/pdfs')
    await expect(storeEbook(Buffer.from('test'), 'pdf')).rejects.toMatchObject({ status: 503 })
  })
  it('supports suffix ranges and rejects malformed and multipart ranges', () => {
    expect(parseByteRange('bytes=-3', 10)).toEqual({ start: 7, end: 9 })
    expect(parseByteRange('bytes=3-', 10)).toEqual({ start: 3, end: 9 })
    for (const range of ['bytes=5-3', 'bytes=-0', 'bytes=0-1,5-6', 'bytes=x-y']) {
      expect(() => parseByteRange(range, 10)).toThrow()
    }
  })
})
