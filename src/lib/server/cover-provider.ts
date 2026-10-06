import 'server-only'
import { lookup } from 'node:dns/promises'
import { request } from 'node:https'
import { isPublicAddress } from './price-provider'
import { HttpError } from './errors'
const hosts = new Set(['books.google.com', 'books.googleusercontent.com', 'covers.openlibrary.org', 'images-na.ssl-images-amazon.com', 'm.media-amazon.com', 'upload.wikimedia.org'])
export async function fetchCover(input: string, hops = 0) {
  let url: URL
  try { url = new URL(input) } catch { throw new HttpError(400, 'Invalid cover URL.') }
  // Open Library redirects covers through its Internet Archive cover collection.
  const archivePath = /\/(download|items)\/(?:[sml]_)?covers_[0-9]+\//.test(url.pathname)
  const archiveFile = url.pathname === '/view_archive.php' && /^\/[0-9]+\/items\/(?:[sml]_)?covers_[0-9]+\/(?:[sml]_)?covers_[0-9]+_[0-9]+\.(zip|tar)$/.test(url.searchParams.get('archive') || '') && /^[0-9]+-(S|M|L)\.jpg$/.test(url.searchParams.get('file') || '')
  const archiveCover = hops > 0 && (url.hostname === 'archive.org' || /^ia[0-9]+\.(us|eu)\.archive\.org$/.test(url.hostname)) && (archivePath || archiveFile)
  if ((!hosts.has(url.hostname) && !archiveCover) || url.protocol !== 'https:' || url.username || url.password || url.port) throw new HttpError(400, 'This cover provider is unsupported for downloads.')
  let timer: ReturnType<typeof setTimeout> | undefined
  const addresses = await Promise.race([lookup(url.hostname, { all: true, verbatim: true }), new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(new HttpError(504, 'The cover provider timed out.')), 5000) })]).finally(() => clearTimeout(timer))
  if (!addresses.length || addresses.some(item => !isPublicAddress(item.address))) throw new HttpError(400, 'The cover address is unsafe.')
  const target = addresses[0]
  return new Promise<{ data: Buffer; mime: string }>((resolve, reject) => {
    const req = request(url, { family: target.family, lookup: (_hostname, _options, callback) => callback(null, target.address, target.family), headers: { Accept: 'image/png,image/jpeg,image/webp,image/gif', 'Accept-Encoding': 'identity' } }, response => {
      if ([301, 302, 303, 307, 308].includes(response.statusCode || 0) && response.headers.location && hops < 2) { const next = new URL(response.headers.location, url).toString(); response.destroy(); fetchCover(next, hops + 1).then(resolve, reject); return }
      const mime = response.headers['content-type']?.split(';')[0] || ''
      if (response.statusCode !== 200 || !['image/png','image/jpeg','image/webp','image/gif'].includes(mime) || (response.headers['content-encoding'] && response.headers['content-encoding'] !== 'identity')) { response.destroy(); reject(new HttpError(502, 'The cover provider did not return a supported image.')); return }
      const chunks: Buffer[] = []; let size = 0
      response.on('data', (chunk: Buffer) => { size += chunk.length; if (size > 8 * 1024 * 1024) req.destroy(new HttpError(502, 'The cover is too large.')); else chunks.push(chunk) })
      response.on('end', () => resolve({ data: Buffer.concat(chunks), mime }))
      response.on('error', () => reject(new HttpError(502, 'The cover could not be read.')))
      response.on('aborted', () => reject(new HttpError(502, 'The cover could not be read.')))
    })
    const deadline = setTimeout(() => req.destroy(new HttpError(504, 'The cover provider timed out.')), 8000)
    req.on('close', () => clearTimeout(deadline)); req.on('error', error => reject(error instanceof HttpError ? error : new HttpError(502, 'The cover provider is unavailable.'))); req.end()
  })
}
