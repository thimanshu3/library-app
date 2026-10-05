import { requireOwner } from '@/lib/server/auth'
import { errorResponse } from '@/lib/server/http'
import { ebookResponse } from '@/lib/server/storage'

export async function GET(request: Request, { params }: { params: Promise<{ filename: string }> }) {
  try {
    await requireOwner()
    return await ebookResponse(request, (await params).filename)
  } catch (error) { return errorResponse(error, 'Failed to read ebook.') }
}

export const HEAD = GET
