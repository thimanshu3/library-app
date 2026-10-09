import { requireOwner } from '@/lib/server/auth'
import { errorResponse } from '@/lib/server/http'
import { queryBooks } from '@/lib/server/library-query'

export async function GET(request: Request) {
  try {
    await requireOwner()
    const params = Object.fromEntries(new URL(request.url).searchParams)
    const data = await queryBooks({
      ...params,
      ...(params.skip ? { skip: Number(params.skip) } : {}),
      ...(params.take ? { take: Number(params.take) } : {})
    })
    return Response.json(data, {
      headers: { 'Cache-Control': 'private, no-store' }
    })
  } catch (error) {
    return errorResponse(error, 'Unable to load the library. Please retry.')
  }
}
