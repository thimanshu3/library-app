import prisma from '@/lib/prisma'
import { requireOwner } from '@/lib/server/auth'
import { errorResponse, readJson, requireSameOrigin } from '@/lib/server/http'
import { validate } from '@/lib/server/library-validation'
import { lookupProductPrice } from '@/lib/server/price-provider'
import { rateLimit } from '@/lib/server/rate-limit'
import { z } from 'zod'

export async function POST(request: Request) {
  try {
    await requireOwner()
    requireSameOrigin(request)
    rateLimit('price-lookup', 10, 60_000)
    const data = validate(
      z.object({
        url: z.string().max(2048),
        copyId: z.string().max(180).optional()
      }),
      await readJson(request)
    )
    const offer = await lookupProductPrice(data.url)
    if (data.copyId)
      await prisma.copy.update({
        where: { id: data.copyId },
        data: {
          offerPrice: offer.price,
          offerCurrency: offer.currency,
          offerCheckedAt: new Date(offer.checkedAt),
          offerSource: offer.source
        }
      })
    return Response.json(offer, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return errorResponse(error, 'Price lookup failed.')
  }
}
