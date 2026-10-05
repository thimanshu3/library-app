import { beforeEach, describe, expect, it, vi } from 'vitest'

const boundary = vi.hoisted(() => ({
  requireOwner: vi.fn(), store: vi.fn(), price: vi.fn(), read: vi.fn(),
  findMany: vi.fn(), transaction: vi.fn()
}))
vi.mock('@/lib/server/auth', () => ({ requireOwner: boundary.requireOwner }))
vi.mock('@/lib/prisma', () => ({ default: { copy: { findMany: boundary.findMany }, $transaction: boundary.transaction } }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/server/storage', () => ({ storeEbook: boundary.store, ebookResponse: boundary.read }))
vi.mock('@/lib/server/price-provider', () => ({ lookupProductPrice: boundary.price }))
import { HttpError } from '@/lib/server/http'
import { fetchFilteredBooksAction, importBooksAction, saveLibraryAction } from '@/app/actions'
import { POST as upload } from '@/app/api/upload-pdf/route'
import { POST as price } from '@/app/api/price-tracker/route'
import { GET as file } from '@/app/api/files/[filename]/route'
import { GET as legacyFile } from '@/app/pdfs/[filename]/route'

beforeEach(() => { boundary.requireOwner.mockRejectedValue(new HttpError(401, 'Sign in to access your library.')) })

describe('anonymous access', () => {
  it('denies every library action before touching the database', async () => {
    await expect(fetchFilteredBooksAction({})).rejects.toMatchObject({ status: 401 })
    await expect(saveLibraryAction([], [])).rejects.toMatchObject({ status: 401 })
    await expect(importBooksAction([], [])).rejects.toMatchObject({ status: 401 })
    expect(boundary.findMany).not.toHaveBeenCalled()
    expect(boundary.transaction).not.toHaveBeenCalled()
  })
  it('denies upload and price lookup before parsing or contacting providers', async () => {
    expect((await upload(new Request('https://library.test/api/upload-pdf', { method: 'POST' }))).status).toBe(401)
    expect((await price(new Request('https://library.test/api/price-tracker', { method: 'POST' }))).status).toBe(401)
    expect(boundary.store).not.toHaveBeenCalled()
    expect(boundary.price).not.toHaveBeenCalled()
  })
  it('denies both old and new attachment URLs before opening storage', async () => {
    const context = { params: Promise.resolve({ filename: '1789732136793-manssearchformeaning.pdf' }) }
    expect((await file(new Request('https://library.test/api/files/book.pdf'), context)).status).toBe(401)
    expect((await legacyFile(new Request('https://library.test/pdfs/book.pdf'), context)).status).toBe(401)
    expect(boundary.read).not.toHaveBeenCalled()
  })
})

describe('owner uploads', () => {
  beforeEach(() => { boundary.requireOwner.mockResolvedValue({ name: 'owner' }) })
  it('rejects cross-origin upload requests', async () => {
    const result = await upload(new Request('https://library.test/api/upload-pdf', { method: 'POST', headers: { origin: 'https://evil.test' } }))
    expect(result.status).toBe(403)
    expect(boundary.store).not.toHaveBeenCalled()
  })
  it('rejects string file fields and forged PDF content', async () => {
    for (const value of ['not a file', new File(['<html>fake</html>'], 'book.pdf', { type: 'application/pdf' })]) {
      const body = new FormData(); body.set('file', value)
      const result = await upload(new Request('https://library.test/api/upload-pdf', { method: 'POST', headers: { origin: 'https://library.test' }, body }))
      expect(result.status).toBe(400)
    }
    expect(boundary.store).not.toHaveBeenCalled()
  })
  it('returns only a protected file URL after a valid upload', async () => {
    boundary.store.mockResolvedValue('/api/files/00000000-0000-0000-0000-000000000000.pdf')
    const body = new FormData(); body.set('file', new File(['%PDF-1.7\n%%EOF'], 'book.PDF', { type: 'application/pdf' }))
    const result = await upload(new Request('https://library.test/api/upload-pdf', { method: 'POST', headers: { origin: 'https://library.test' }, body }))
    expect(result.status).toBe(200)
    expect(await result.json()).toMatchObject({ success: true, path: '/api/files/00000000-0000-0000-0000-000000000000.pdf' })
  })
})
