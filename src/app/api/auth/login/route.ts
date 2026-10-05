import { getAuthConfig, getOwnerSession, SESSION_TTL, verifyOwnerCredentials } from '@/lib/server/auth'
import { errorResponse, HttpError, readJson, requireSameOrigin } from '@/lib/server/http'
import { acquireSlot, rateLimit } from '@/lib/server/rate-limit'

export async function POST(request: Request) {
  let release: (() => void) | undefined
  try {
    requireSameOrigin(request)
    rateLimit('login', 10, 15 * 60 * 1000)
    release = acquireSlot('login', 2)
    const body = await readJson(request)
    if (!body || typeof body !== 'object' || !('name' in body) || !('password' in body) ||
        typeof body.name !== 'string' || typeof body.password !== 'string' ||
        body.name.length > 64 || body.password.length > 1024) {
      throw new HttpError(400, 'Enter your owner name and password.')
    }
    if (!await verifyOwnerCredentials(body.name, body.password)) {
      throw new HttpError(401, 'The owner name or password is incorrect.')
    }
    const session = await getOwnerSession()
    session.ownerId = getAuthConfig().ownerId
    session.expiresAt = Date.now() + SESSION_TTL * 1000
    await session.save()
    return Response.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return errorResponse(error, 'Unable to sign in. Please try again.')
  } finally { release?.() }
}
