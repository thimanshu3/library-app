import { requireOwner } from '@/lib/server/auth'
import { errorResponse, HttpError } from '@/lib/server/http'
import { fetchCover } from '@/lib/server/cover-provider'
import { rateLimit } from '@/lib/server/rate-limit'
export async function GET(request: Request) {
  try {
    await requireOwner(); rateLimit('cover-download', 30, 60_000)
    const url = new URL(request.url).searchParams.get('url')
    if (!url || url.length > 2048) throw new HttpError(400, 'Use a valid cover URL.')
    const { data, mime } = await fetchCover(url)
    return new Response(new Uint8Array(data), { headers: { 'Content-Type': mime, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } })
  } catch (error) { return errorResponse(error, 'Unable to download the cover.') }
}
