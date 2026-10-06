import { fetchLibraryOverviewAction } from '@/app/actions'
import { errorResponse } from '@/lib/server/http'

export async function GET() {
  try {
    const data = await fetchLibraryOverviewAction()
    return Response.json(data, { status: data.error ? 500 : 200, headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return errorResponse(error, 'Unable to load library totals. Please retry.') }
}
