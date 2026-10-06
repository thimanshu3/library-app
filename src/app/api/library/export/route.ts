import { requireOwner } from '@/lib/server/auth'
import prisma from '@/lib/prisma'
import { allBooks } from '@/lib/server/library-query'
import { errorResponse, HttpError } from '@/lib/server/http'

export async function GET(request: Request) {
  try {
    await requireOwner()
    const format = new URL(request.url).searchParams.get('format') || 'json'
    if (format !== 'json' && format !== 'csv') throw new HttpError(400, 'Choose JSON or CSV.')
    const [books, settings] = await Promise.all([allBooks(), prisma.librarySettings.findUnique({ where: { id: 'owner' } })])
    const date = new Date().toISOString().slice(0, 10)
    const headers = { 'Cache-Control': 'private, no-store', 'Content-Disposition': `attachment; filename="library-${date}.${format}"` }
    if (format === 'json') return Response.json({ format: 'taleteacup', version: 2, exportedAt: new Date().toISOString(), annualGoal: settings?.annualGoal || 50, books }, { headers })
    const cell = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`
    const safe = (value: string) => /^[=+\-@\t\r]/.test(value) ? "'" + value : value
    // The JSON record preserves every field; readable columns remain spreadsheet-safe.
    const csv = [['id','title','author','genre','status','format','isbn','totalPages','purchasePrice','currency','annualGoal','record'].map(cell).join(','),
      ...books.map(book => [book.id,safe(book.title),safe(book.author),safe(book.genre),book.status,book.format,book.isbn,
        book.totalPages,book.purchasePrice,book.currency,settings?.annualGoal || 50,JSON.stringify(book)].map(cell).join(','))].join('\r\n')
    return new Response(csv, { headers: { ...headers, 'Content-Type': 'text/csv; charset=utf-8' } })
  } catch (error) { return errorResponse(error, 'Unable to export the library. Please retry.') }
}
