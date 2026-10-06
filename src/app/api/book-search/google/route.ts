import { requireOwner } from '@/lib/server/auth'
import { errorResponse, HttpError } from '@/lib/server/http'
import { rateLimit } from '@/lib/server/rate-limit'

export async function GET(request: Request) {
  try {
    await requireOwner(); rateLimit('book-search', 40, 60_000)
    const query = new URL(request.url).searchParams.get('q')?.trim()
    if (!query || query.length > 500) throw new HttpError(400, 'Enter a title, author, or ISBN.')
    const url = new URL('https://www.googleapis.com/books/v1/volumes')
    const isbn = query.replace(/[^0-9X]/gi, '')
    url.searchParams.set('q', isbn.length === 10 || isbn.length === 13 ? `isbn:${isbn}` : query)
    url.searchParams.set('maxResults', '10')
    if (process.env.GOOGLE_BOOKS_API_KEY) url.searchParams.set('key', process.env.GOOGLE_BOOKS_API_KEY)
    const response = await fetch(url, { signal: AbortSignal.timeout(8000), redirect: 'error', cache: 'no-store' })
    if (!response.ok || !response.body) throw new HttpError(502, 'Google Books is unavailable. Try Open Library results or add manually.')
    const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let size = 0
    try {
      for (;;) {
        const { done, value } = await reader.read(); if (done) break
        size += value.length
        if (size > 2 * 1024 * 1024) { await reader.cancel(); throw new HttpError(502, 'The metadata response is too large.') }
        chunks.push(value)
      }
    } finally { reader.releaseLock() }
    return Response.json(JSON.parse(Buffer.concat(chunks).toString()), { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return errorResponse(error, 'Book metadata search failed.') }
}
