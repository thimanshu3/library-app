import { unstable_rethrow } from 'next/navigation'
import 'server-only'

import { HttpError } from './errors'
export { HttpError } from './errors'

export function errorResponse(error: unknown, fallback: string): Response {
  unstable_rethrow(error)
  if (error instanceof HttpError) {
    return Response.json({ success: false, error: error.message }, {
      status: error.status,
      headers: { 'Cache-Control': 'no-store' }
    })
  }
  // Do not log request bodies, credentials, URL query strings, or provider errors.
  console.error(fallback)
  return Response.json({ success: false, error: fallback }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
}

export function requireSameOrigin(request: Request): void {
  const origin = request.headers.get('origin')
  const expected = process.env.LIBRARY_APP_ORIGIN || new URL(request.url).origin
  if (!origin || origin !== expected) {
    throw new HttpError(403, 'This request must come from your library.')
  }
}

export async function readBody(request: Request, limit: number): Promise<Uint8Array> {
  const declaredLength = request.headers.get('content-length')
  if (declaredLength && (!/^\d+$/.test(declaredLength) || Number(declaredLength) > limit)) {
    throw new HttpError(413, 'The request is too large.')
  }
  if (!request.body) throw new HttpError(400, 'The request body is missing.')
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > limit) {
        await reader.cancel()
        throw new HttpError(413, 'The request is too large.')
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const result = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.byteLength
  }
  return result
}

export async function readJson(request: Request, limit = 4096): Promise<unknown> {
  if (!request.headers.get('content-type')?.startsWith('application/json')) {
    throw new HttpError(415, 'Send JSON data.')
  }
  const bytes = await readBody(request, limit)
  try {
    return JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    throw new HttpError(400, 'The JSON data is invalid.')
  }
}
