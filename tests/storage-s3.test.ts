import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const backend = vi.hoisted(() => ({ send: vi.fn(), destroy: vi.fn(), construct: vi.fn() }))
vi.mock('@aws-sdk/client-s3', async importOriginal => {
  const sdk = await importOriginal<typeof import('@aws-sdk/client-s3')>()
  return { ...sdk, S3Client: class {
    constructor(options: unknown) { backend.construct(options) }
    send = backend.send
    destroy = backend.destroy
  } }
})
import { ebookResponse, storeEbook } from '@/lib/server/storage'

const key = '00000000-0000-0000-0000-000000000000.pdf'
beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'production')
  vi.stubEnv('LIBRARY_STORAGE_DRIVER', 's3')
  vi.stubEnv('LIBRARY_STORAGE_BUCKET', 'test-only-private-bucket')
  vi.stubEnv('LIBRARY_STORAGE_REGION', 'ap-south-1')
  vi.stubEnv('LIBRARY_STORAGE_ENDPOINT', '')
})
afterEach(() => vi.unstubAllEnvs())

describe('S3-compatible private storage adapter', () => {
  it('uploads under opaque keys without a public ACL and closes its client', async () => {
    backend.send.mockResolvedValue({})
    expect(await storeEbook(Buffer.from('test'), 'pdf')).toMatch(/^\/api\/files\/[a-f0-9-]+\.pdf$/)
    const command = backend.send.mock.calls[0][0]
    expect(command.input).toMatchObject({ Bucket: 'test-only-private-bucket', ContentType: 'application/pdf' })
    expect(command.input.Key).toMatch(/^library-files\/[a-f0-9-]+\.pdf$/)
    expect(command.input.ACL).toBeUndefined()
    expect(backend.destroy).toHaveBeenCalledTimes(1)
  })
  it('proxies owner ranges and closes the client after the response stream ends', async () => {
    backend.send.mockResolvedValueOnce({ ContentLength: 10 }).mockResolvedValueOnce({ Body: {
      transformToWebStream: () => new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('%PDF')); controller.close() } })
    } })
    const response = await ebookResponse(new Request('https://library.test/api/files/' + key, { headers: { range: 'bytes=0-3' } }), key)
    expect(response.status).toBe(206)
    expect(response.headers.get('content-range')).toBe('bytes 0-3/10')
    expect(await response.text()).toBe('%PDF')
    expect(backend.send.mock.calls[1][0].input.Range).toBe('bytes=0-3')
    expect(backend.destroy).toHaveBeenCalledTimes(1)
  })
  it('rejects insecure production endpoints and closes clients on storage errors', async () => {
    vi.stubEnv('LIBRARY_STORAGE_ENDPOINT', 'http://storage.test')
    await expect(storeEbook(Buffer.from('test'), 'pdf')).rejects.toMatchObject({ status: 503 })
    expect(backend.send).not.toHaveBeenCalled()
    vi.stubEnv('LIBRARY_STORAGE_ENDPOINT', '')
    backend.send.mockRejectedValue(new Error('backend unavailable'))
    await expect(storeEbook(Buffer.from('test'), 'pdf')).rejects.toThrow('backend unavailable')
    expect(backend.destroy).toHaveBeenCalledTimes(1)
  })
})
