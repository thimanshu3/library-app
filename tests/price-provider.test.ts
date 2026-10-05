import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ lookup: vi.fn(), request: vi.fn() }))
vi.mock('node:dns/promises', () => ({ lookup: mocks.lookup }))
vi.mock('node:https', () => ({ request: mocks.request }))
import { canonicalProductUrl, extractPrice, isPublicAddress, lookupProductPrice } from '@/lib/server/price-provider'

beforeEach(() => {
  mocks.lookup.mockResolvedValue([{ address: '1.1.1.1', family: 4 }])
})

function respond(statusCode: number, html: string, headers: Record<string, string> = {}) {
  mocks.request.mockImplementation((_url, _options, receive) => {
    const request = new EventEmitter() as EventEmitter & { end: () => void; destroy: (error?: Error) => void }
    request.destroy = error => { if (error) request.emit('error', error); request.emit('close') }
    request.end = () => {
      const response = Object.assign(new PassThrough(), { statusCode, headers: { 'content-type': 'text/html', ...headers } })
      receive(response)
      if (!response.destroyed) response.end(html)
      request.emit('close')
    }
    return request
  })
}

describe('price provider boundary', () => {
  it('canonicalizes supported product links and drops tracking and alternate paths', () => {
    expect(canonicalProductUrl('https://amazon.in/book/dp/B012345678?tracking=1').toString()).toBe('https://www.amazon.in/dp/B012345678')
    expect(canonicalProductUrl('https://www.amazon.co.uk/gp/product/b012345678').pathname).toBe('/dp/B012345678')
  })
  it.each([
    'http://amazon.in/dp/B012345678', 'https://amazon.in.evil.test/dp/B012345678',
    'https://amazon.in@127.0.0.1/dp/B012345678', 'https://owner:password@amazon.in/dp/B012345678',
    'https://amazon.in:8443/dp/B012345678', 'https://169.254.169.254/latest/meta-data',
    'https://amazon.in/s?k=books', 'https://amazon.in./dp/B012345678', 'not a URL'
  ])('rejects unsafe or unsupported URLs: %s', async input => {
    await expect(lookupProductPrice(input)).rejects.toMatchObject({ status: 400 })
    expect(mocks.lookup).not.toHaveBeenCalled()
    expect(mocks.request).not.toHaveBeenCalled()
  })
  it.each(['127.0.0.1', '10.0.0.1', '172.16.1.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '224.0.0.1', '::1', 'fc00::1', 'fe80::1', '::ffff:127.0.0.1'])('rejects non-public DNS addresses: %s', address => {
    expect(isPublicAddress(address)).toBe(false)
  })
  it('rejects mixed public/private DNS results before opening a socket', async () => {
    mocks.lookup.mockResolvedValue([{ address: '1.1.1.1', family: 4 }, { address: '127.0.0.1', family: 4 }])
    await expect(lookupProductPrice('https://amazon.in/dp/B012345678')).rejects.toMatchObject({ status: 400 })
    expect(mocks.request).not.toHaveBeenCalled()
  })
  it('pins the validated DNS result and never loads script or image subrequests', async () => {
    respond(200, '<span class="a-offscreen">&#8377;1,299.50</span><script src="http://127.0.0.1/secret"></script>')
    expect(await lookupProductPrice('https://amazon.in/dp/B012345678')).toMatchObject({ price: 1299.5, currency: 'INR' })
    expect(mocks.request).toHaveBeenCalledTimes(1)
    const options = mocks.request.mock.calls[0][1]
    const callback = vi.fn()
    options.lookup('www.amazon.in', {}, callback)
    expect(callback).toHaveBeenCalledWith(null, '1.1.1.1', 4)
    expect(options.family).toBe(4)
  })
  it('rejects redirects and oversized provider responses', async () => {
    respond(302, '', { location: 'http://127.0.0.1/secret' })
    await expect(lookupProductPrice('https://amazon.in/dp/B012345678')).rejects.toMatchObject({ status: 502 })
    expect(mocks.request).toHaveBeenCalledTimes(1)
    respond(200, 'x'.repeat(2 * 1024 * 1024 + 1))
    await expect(lookupProductPrice('https://amazon.in/dp/B012345678')).rejects.toMatchObject({ status: 502 })
  })
  it('rejects pages without a supported currency price', () => {
    expect(() => extractPrice('<span class="a-offscreen">$9.99</span>', 'www.amazon.in')).toThrow()
    expect(extractPrice('<span class="a-offscreen">£9.99</span>', 'www.amazon.co.uk')).toMatchObject({ price: 9.99, currency: 'GBP' })
  })
})
