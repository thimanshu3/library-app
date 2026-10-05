import { requireOwner } from '@/lib/server/auth'
import { errorResponse, HttpError, readBody, requireSameOrigin } from '@/lib/server/http'
import { acquireSlot, rateLimit } from '@/lib/server/rate-limit'
import { MAX_EBOOK_BYTES, validateEbook } from '@/lib/server/ebook-validation'
import { storeEbook } from '@/lib/server/storage'

export async function POST(request: Request) {
  let release: (() => void) | undefined
  try {
    await requireOwner()
    requireSameOrigin(request)
    rateLimit('upload', 20, 60_000)
    release = acquireSlot('upload', 2)
    const contentType = request.headers.get('content-type')
    if (!contentType?.startsWith('multipart/form-data;')) throw new HttpError(415, 'Upload a PDF or EPUB file.')
    const body = await readBody(request, MAX_EBOOK_BYTES + 64 * 1024)
    let data: FormData
    try { data = await new Response(body as BodyInit, { headers: { 'Content-Type': contentType } }).formData() }
    catch { throw new HttpError(400, 'The upload data is invalid.') }
    const file = data.get('file')
    if (!(file instanceof File) || data.getAll('file').length !== 1) throw new HttpError(400, 'Choose one PDF or EPUB file.')
    const { bytes, extension } = await validateEbook(file)
    const url = await storeEbook(bytes, extension)
    return Response.json({ success: true, path: url }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return errorResponse(error, 'Failed to upload ebook.')
  } finally { release?.() }
}
