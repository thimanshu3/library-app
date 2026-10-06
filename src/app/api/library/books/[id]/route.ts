import { fetchBookAction } from '@/app/actions'
import { errorResponse } from '@/lib/server/http'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { return Response.json(await fetchBookAction((await params).id), { headers: { 'Cache-Control': 'private, no-store' } }) }
  catch (error) { return errorResponse(error, 'Unable to load this book. Please retry.') }
}
