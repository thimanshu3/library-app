import 'server-only'
import { createHash, randomUUID } from 'node:crypto'
import { Prisma } from '@prisma/client'
import type { Book } from '@/app/types'
import prisma from '@/lib/prisma'
import { advanceReadingHistory, attachmentType, dateKey } from '@/lib/library-domain'
import { BookSchema, SessionSchema, validate } from './library-validation'
import { bookInclude, toBook } from './library-mapper'
import { HttpError } from './errors'
import { isEbookKey } from './storage'

const asDate = (value?: string | null) => { const day = dateKey(value); return day ? new Date(`${day}T00:00:00Z`) : null }
const json = (value: unknown) => value as Prisma.InputJsonValue
const year = (value?: string | null) => value && /^\d{1,4}$/.test(value) ? Number(value) : null
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

function parseBook(input: unknown): Book {
  const result = validate(BookSchema, input)
  return { ...result, readingStartDate: result.readingStartDate || '', readingEndDate: result.readingEndDate || '', loanDate: result.loanDate || '' }
}

async function lockCopy(tx: Prisma.TransactionClient, id: string) {
  await tx.$queryRaw`SELECT "id" FROM "Copy" WHERE "id"=${id} FOR UPDATE`
}

async function attachmentKey(tx: Prisma.TransactionClient, url: string) {
  if (!url.startsWith('/')) return null
  const key = url.split('/').pop()!
  if (!isEbookKey(key)) throw new HttpError(400, 'The ebook attachment URL is invalid.')
  const rows = await tx.$queryRaw<{ key: string; status: string }[]>`SELECT "key","status" FROM "Attachment" WHERE "key"=${key} FOR UPDATE`
  if (!rows[0] || rows[0].status !== 'active') throw new HttpError(409, 'This attachment is unavailable. Upload the ebook again.')
  await tx.attachment.update({ where: { key }, data: { deleteAfter: null } })
  return key
}

export async function scheduleAttachmentCleanup(tx: Prisma.TransactionClient, key?: string | null) {
  if (!key) return
  await tx.$queryRaw`SELECT "key" FROM "Attachment" WHERE "key"=${key} FOR UPDATE`
  if (await tx.copy.count({ where: { attachmentKey: key } }) === 0) {
    await tx.attachment.updateMany({ where: { key, status: 'active' }, data: { deleteAfter: new Date(Date.now() + 24 * 60 * 60 * 1000) } })
  }
}

export async function saveOne(input: unknown, options: { importing?: boolean } = {}): Promise<Book> {
  const book = parseBook(input)
  const creating = !book.id
  const fingerprint = book.createToken ? createHash('sha256').update(JSON.stringify({ ...book, createToken: undefined })).digest('hex') : null
  book.id ||= `c_${book.createToken || randomUUID()}`
  book.workId ||= `w_${randomUUID()}`
  return prisma.$transaction(async tx => {
    if (creating || options.importing) await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'library-create:' + book.id}, 0))`
    await lockCopy(tx, book.id)
    const existing = await tx.copy.findUnique({ where: { id: book.id }, include: bookInclude })
    if (creating && existing) {
      if (fingerprint && existing.createFingerprint === fingerprint) return toBook(existing)
      throw new HttpError(409, 'This copy was already added. Reopen it to apply further edits; your new draft is preserved.')
    }
    if (!creating && !existing && !options.importing) throw new HttpError(404, 'This copy no longer exists. Add it again to restore it.')
    if (existing && (book.revision == null || existing.revision !== book.revision)) {
      throw new HttpError(409, 'This book changed in another session. Reopen it before saving; your draft is still here.')
    }
    if (existing && existing.workId !== book.workId) throw new HttpError(400, 'A copy cannot be moved to another work through an edit.')
    const previous = existing ? toBook(existing) : undefined
    const workData = {
      title: book.title, author: book.author, genre: book.genre, hours: book.hours, recommendedBy: book.recommendedBy,
      volume: book.volume, photoUrl: book.photoUrl, summary: book.summary, description: book.description,
      launchYear: book.launchYear, launchYearNumber: year(book.launchYear), originalLanguage: book.originalLanguage,
      countryOfOrigin: book.countryOfOrigin, authorDescription: book.authorDescription, coverFile: book.coverFile,
      tags: json(book.tags), collections: json(book.collections), series: book.series ? JSON.stringify(book.series) : null,
      apiData: json(book.apiData), goodreadsId: book.goodreadsId, authorLF: book.authorLF,
      additionalAuthors: book.additionalAuthors, originalPublicationYear: book.originalPublicationYear, ownedCopies: book.ownedCopies
    }
    const currentWork = await tx.work.findUnique({ where: { id: book.workId } })
    if (!currentWork) {
      await tx.work.create({ data: { ...workData, id: book.workId, libraryOrder: BigInt(Date.now()), isbn: book.isbn, readingSpans: [] } })
    } else {
      const changed = Object.entries(workData).some(([key, value]) => value !== undefined && !same(currentWork[key as keyof typeof currentWork], value))
      if (changed && !options.importing) {
        if (book.workRevision == null || currentWork.revision !== book.workRevision) throw new HttpError(409, 'Shared book details changed in another session. Reopen the editor to review them.')
        const updated = await tx.work.updateMany({ where: { id: book.workId, revision: book.workRevision }, data: { ...workData, revision: { increment: 1 } } })
        if (!updated.count) throw new HttpError(409, 'Shared book details changed. Reopen the editor and try again.')
      }
    }
    const editionData = { workId: book.workId, isbn: book.isbn || null, publisher: book.publisher || null,
      publicationYear: year(book.yearPublished), format: book.format, pageCount: book.totalPages || null }
    const matchingEdition = await tx.edition.findFirst({ where: editionData })
    const editionId = matchingEdition?.id || `e_${createHash('sha256').update(JSON.stringify(editionData)).digest('hex')}`
    if (!matchingEdition) await tx.edition.upsert({ where: { id: editionId }, create: { id: editionId, ...editionData }, update: {} })
    const nextAttachment = book.pdfPath ? await attachmentKey(tx, book.pdfPath) : null
    const history = advanceReadingHistory(book, previous)
    const ownership = book.ownership || (book.purchased ? 'Purchased' : book.status === 'Wishlist' ? 'None' : 'Gifted')
    const invested = previous && previous.investedAmount === previous.purchasePrice && previous.purchasePrice !== book.purchasePrice && previous.investedAmount === book.investedAmount
      ? book.purchasePrice : book.investedAmount
    const data = {
      workId: book.workId, editionId, format: book.format, condition: book.condition, shelfLocation: book.shelfLocation,
      ownership, purchased: ownership === 'Purchased', currency: book.currency || 'INR',
      purchasePrice: book.purchasePrice, investedAmount: invested, status: book.status,
      pdfPath: book.pdfPath, attachmentKey: nextAttachment, mediaType: book.pdfPath ? attachmentType(book) : null,
      epubLocation: book.epubLocation, currentPage: book.currentPage, totalPages: book.totalPages,
      lastReadTimestamp: book.lastReadTimestamp, readingSpans: json(history.spans),
      readingStartedAt: asDate(history.started), readingCompletedAt: asDate(history.completed),
      rating: book.rating, quotes: json(book.quotes), amazonLink: book.amazonLink,
      dateRead: history.completed || book.dateRead, dateAdded: book.dateAdded,
      bookshelves: book.bookshelves, bookshelvesWithPositions: book.bookshelvesWithPositions,
      exclusiveShelf: book.exclusiveShelf, myReview: book.myReview, spoiler: book.spoiler,
      privateNotes: book.privateNotes, readCount: history.readCount
      , ...(!existing ? { offerPrice: book.offerPrice, offerCurrency: book.offerCurrency,
        offerCheckedAt: book.offerCheckedAt ? new Date(book.offerCheckedAt) : null, offerSource: book.offerSource } : {})
    }
    if (existing) await tx.copy.update({ where: { id: book.id }, data: { ...data, revision: { increment: 1 } } })
    else await tx.copy.create({ data: { id: book.id, createFingerprint: fingerprint, ...data } })
    // Sessions have dedicated append/upsert mutations; editing metadata never replaces their history.
    if (!existing) {
      for (const [index, session] of (book.readingSessions || []).entries()) {
        await tx.readingSessionRecord.create({ data: { id: session.id || `legacy_${book.id}_${index}`, copyId: book.id,
          date: asDate(session.date)!, durationMinutes: session.durationMinutes, startPage: session.startPage,
          endPage: session.endPage, observedAt: session.observedAt ? new Date(session.observedAt) : new Date() } })
      }
    }
    // Edits use the copy revision checked above, and retain every returned historical loan.
    const removedLoans = existing?.loanRecords.filter(loan => !book.loans.some(item => item.id === loan.id)) || []
    if (removedLoans.length) throw new HttpError(400, 'Loan history cannot be removed. Mark the active loan returned instead.')
    for (const loan of book.loans) {
      const prior = await tx.loan.findUnique({ where: { id: loan.id } })
      if (prior && prior.copyId !== book.id) throw new HttpError(400, 'The loan belongs to another copy.')
      const loanData = { copyId: book.id, borrowerName: loan.borrowerName, dateLent: asDate(loan.dateLent)!,
        expectedReturnDate: asDate(loan.expectedReturnDate), dateReturned: asDate(loan.dateReturned), notes: loan.notes }
      await tx.loan.upsert({ where: { id: loan.id }, create: { id: loan.id, ...loanData }, update: loanData })
    }
    if (existing?.attachmentKey && existing.attachmentKey !== nextAttachment) await scheduleAttachmentCleanup(tx, existing.attachmentKey)
    return toBook((await tx.copy.findUniqueOrThrow({ where: { id: book.id }, include: bookInclude })))
  }, { timeout: 20_000 })
}

export async function deleteCopies(ids: string[]) {
  await prisma.$transaction(async tx => {
    const copies = await tx.copy.findMany({ where: { id: { in: ids } }, select: { id: true, attachmentKey: true, workId: true } })
    await tx.copy.deleteMany({ where: { id: { in: ids } } })
    for (const key of new Set(copies.map(copy => copy.attachmentKey).filter(Boolean))) await scheduleAttachmentCleanup(tx, key)
    // Retain Work catalog records so editions/metadata aren't destructively discarded.
  }, { timeout: 20_000 })
}

export async function recordSession(copyId: string, input: unknown, progress: { currentPage?: number; totalPages?: number; epubLocation?: string }) {
  const session = validate(SessionSchema, input)
  return prisma.$transaction(async tx => {
    await lockCopy(tx, copyId)
    const copy = await tx.copy.findUnique({ where: { id: copyId } })
    if (!copy) throw new HttpError(404, 'This copy no longer exists.')
    const totalPages = progress.totalPages ?? copy.totalPages ?? 0
    if (totalPages && (progress.currentPage ?? session.endPage) > totalPages) throw new HttpError(400, 'Current page exceeds the total pages.')
    const existing = await tx.readingSessionRecord.findUnique({ where: { id: session.id } })
    if (existing && existing.copyId !== copyId) throw new HttpError(400, 'The reading session belongs to another copy.')
    const observedAt = session.observedAt ? new Date(session.observedAt) : new Date()
    const latest = !existing || observedAt >= existing.observedAt
    await tx.readingSessionRecord.upsert({ where: { id: session.id }, create: {
      id: session.id, copyId, date: asDate(session.date)!, durationMinutes: session.durationMinutes,
      startPage: session.startPage, endPage: session.endPage, observedAt
    }, update: { durationMinutes: Math.max(Number(existing?.durationMinutes || 0), session.durationMinutes),
      ...(latest ? { endPage: session.endPage, observedAt } : {}) } })
    const newerProgress = !copy.lastReadTimestamp || observedAt >= new Date(copy.lastReadTimestamp)
    if (newerProgress) await tx.copy.update({ where: { id: copyId }, data: {
      ...progress, lastReadTimestamp: observedAt.toISOString(), readingStartedAt: copy.readingStartedAt || asDate(session.date),
      ...(copy.status === 'Unread' ? { status: 'Reading' } : {}), revision: { increment: 1 }
    } })
    return toBook(await tx.copy.findUniqueOrThrow({ where: { id: copyId }, include: bookInclude }))
  })
}

export async function markCopiesRead(ids: string[], day: string) {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Copy" WHERE "id" IN (${Prisma.join(ids)}) ORDER BY "id" FOR UPDATE`)
    const copies = await tx.copy.findMany({ where: { id: { in: ids } } })
    let changed = 0
    for (const copy of copies) {
      if (copy.status === 'Read') continue
      const previous = { status: copy.status as Book['status'], readingSpans: (Array.isArray(copy.readingSpans) ? copy.readingSpans : []) as unknown as Book['readingSpans'], readingStartDate: copy.readingStartedAt?.toISOString().slice(0, 10), readingEndDate: copy.readingCompletedAt?.toISOString().slice(0, 10), dateRead: copy.dateRead, readCount: copy.readCount }
      const history = advanceReadingHistory({ ...previous, status: 'Read', readingEndDate: day }, previous)
      await tx.copy.update({ where: { id: copy.id }, data: { status: 'Read', readingSpans: json(history.spans), readingStartedAt: asDate(history.started), readingCompletedAt: asDate(history.completed), dateRead: history.completed, readCount: history.readCount, revision: { increment: 1 } } })
      changed++
    }
    return { processed: copies.length, changed }
  }, { timeout: 30_000 })
}
