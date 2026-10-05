import 'server-only'

import { lookup } from 'node:dns/promises'
import { request as httpsRequest } from 'node:https'
import ipaddr from 'ipaddr.js'
import { HttpError } from './http'

const HOSTS = new Map([
  ['amazon.in', 'www.amazon.in'], ['www.amazon.in', 'www.amazon.in'],
  ['amazon.com', 'www.amazon.com'], ['www.amazon.com', 'www.amazon.com'],
  ['amazon.co.uk', 'www.amazon.co.uk'], ['www.amazon.co.uk', 'www.amazon.co.uk']
])
const MAX_HTML_BYTES = 2 * 1024 * 1024
let activeRequests = 0

export function canonicalProductUrl(input: unknown): URL {
  if (typeof input !== 'string' || input.length > 2048) throw new HttpError(400, 'Use an Amazon product link.')
  let url: URL
  try { url = new URL(input) } catch { throw new HttpError(400, 'Use an Amazon product link.') }
  const host = HOSTS.get(url.hostname)
  const product = url.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:\/|$)/i)
  if (!host || url.protocol !== 'https:' || url.username || url.password || url.port || !product) {
    throw new HttpError(400, 'Use an HTTPS Amazon product link from India, the US, or the UK.')
  }
  // Drop tracking queries and user-controlled paths. Only this product page is requested.
  return new URL(`https://${host}/dp/${product[1].toUpperCase()}`)
}

export function isPublicAddress(address: string): boolean {
  try { return ipaddr.process(address).range() === 'unicast' } catch { return false }
}

async function fetchProductPage(url: URL): Promise<string> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const addresses = await Promise.race([
    lookup(url.hostname, { all: true, verbatim: true }),
    new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(new HttpError(504, 'The price provider timed out.')), 5_000)
    })
  ]).finally(() => clearTimeout(timer))
  if (!addresses.length || addresses.some(item => !isPublicAddress(item.address))) {
    throw new HttpError(400, 'The price provider resolved to an unsafe address.')
  }
  const target = addresses[0]
  return new Promise((resolve, reject) => {
    // Pin the validated DNS result to this socket while preserving HTTPS hostname verification.
    const req = httpsRequest(url, {
      method: 'GET', family: target.family,
      lookup: (_hostname, _options, callback) => callback(null, target.address, target.family),
      headers: { 'Accept': 'text/html', 'Accept-Encoding': 'identity', 'User-Agent': 'TaleTeacup/1.0 (personal library price lookup)' }
    }, response => {
      if (response.statusCode !== 200 || !response.headers['content-type']?.includes('text/html') ||
          (response.headers['content-encoding'] && response.headers['content-encoding'] !== 'identity')) {
        response.destroy()
        return reject(new HttpError(502, 'The provider did not return a product page. Redirects are not followed.'))
      }
      const declared = Number(response.headers['content-length'] || 0)
      if (!Number.isFinite(declared) || declared > MAX_HTML_BYTES) {
        response.destroy()
        return reject(new HttpError(502, 'The product page is too large.'))
      }
      let size = 0
      const chunks: Buffer[] = []
      response.on('data', (chunk: Buffer) => {
        size += chunk.length
        if (size > MAX_HTML_BYTES) req.destroy(new HttpError(502, 'The product page is too large.'))
        else chunks.push(chunk)
      })
      response.once('error', () => reject(new HttpError(502, 'The product page could not be read.')))
      response.once('aborted', () => reject(new HttpError(502, 'The product page could not be read.')))
      response.once('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    })
    const deadline = setTimeout(() => req.destroy(new HttpError(504, 'The price provider timed out.')), 10_000)
    req.once('close', () => clearTimeout(deadline))
    req.once('error', error => reject(error instanceof HttpError ? error : new HttpError(502, 'The price provider is unavailable.')))
    req.end()
  })
}

export function extractPrice(html: string, host: string) {
  const candidates = html.matchAll(/<span\b[^>]{0,512}\bclass=["'][^"']*\ba-offscreen\b[^"']*["'][^>]{0,512}>([^<]{1,64})<\/span>/gi)
  const currency = host === 'www.amazon.in' ? 'INR' : host === 'www.amazon.co.uk' ? 'GBP' : 'USD'
  const symbol = currency === 'INR' ? /₹|&#(?:8377|x20b9);/i : currency === 'GBP' ? /£|&pound;|&#163;/i : /\$/
  for (const candidate of candidates) {
    if (!symbol.test(candidate[1])) continue
    const number = candidate[1].replace(symbol, '').replace(/,/g, '').match(/\d+(?:\.\d{1,2})?/)
    const price = number ? Number(number[0]) : NaN
    if (Number.isFinite(price) && price > 0 && price <= 1_000_000) {
      return { price, text: `${currency} ${price.toFixed(2)}`, currency }
    }
  }
  throw new HttpError(404, 'A price was not available on this product page.')
}

export async function lookupProductPrice(input: unknown) {
  const url = canonicalProductUrl(input)
  if (activeRequests >= 2) throw new HttpError(429, 'Price lookups are busy. Try again shortly.')
  activeRequests += 1
  try {
    const html = await fetchProductPage(url)
    return { ...extractPrice(html, url.hostname), source: url.toString(), checkedAt: new Date().toISOString() }
  } finally { activeRequests -= 1 }
}
