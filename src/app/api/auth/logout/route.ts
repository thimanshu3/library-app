import { getOwnerSession } from '@/lib/server/auth'
import { errorResponse, requireSameOrigin } from '@/lib/server/http'

export async function POST(request: Request) {
  try {
    requireSameOrigin(request)
    const session = await getOwnerSession()
    session.destroy()
    return Response.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return errorResponse(error, 'Unable to sign out. Please try again.')
  }
}
