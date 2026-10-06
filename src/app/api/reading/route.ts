import { z } from 'zod'
import { requireOwner } from '@/lib/server/auth'
import { errorResponse, readJson, requireSameOrigin } from '@/lib/server/http'
import { rateLimit } from '@/lib/server/rate-limit'
import { validate } from '@/lib/server/library-validation'
import { recordSession } from '@/lib/server/library-mutations'

export async function POST(request: Request) {
  try {
    await requireOwner(); requireSameOrigin(request); rateLimit('reading-progress', 120, 60_000)
    const input = validate(z.object({
      copyId: z.string().min(1).max(180), session: z.unknown(),
      progress: z.object({ currentPage: z.number().int().min(0).max(1_000_000).optional(),
        totalPages: z.number().int().min(0).max(1_000_000).optional(), epubLocation: z.string().max(4096).optional() })
    }), await readJson(request, 8192))
    const book = await recordSession(input.copyId, input.session, input.progress)
    return Response.json({ success: true, book }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return errorResponse(error, 'Unable to save reading progress. Please retry.') }
}
