import { requireOwner } from '@/lib/server/auth'
import { errorResponse, readJson, requireSameOrigin } from '@/lib/server/http'
import { rateLimit } from '@/lib/server/rate-limit'
import { lookupProductPrice } from '@/lib/server/price-provider'

export async function POST(request: Request) {
  try {
    await requireOwner()
    requireSameOrigin(request)
    rateLimit('price-lookup', 10, 60_000)
    const data = await readJson(request) as { url?: unknown } | null
    return Response.json(await lookupProductPrice(data?.url), { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return errorResponse(error, 'Price lookup failed.') }
}
