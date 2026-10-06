import 'server-only'
import type { Prisma } from '@prisma/client'
import type { Book, ReadingStatus, Ownership } from '@/app/types'
import { dateKey } from '@/lib/library-domain'

export const bookInclude = {
  work: true, edition: true,
  sessions: { orderBy: [{ date: 'asc' as const }, { id: 'asc' as const }] },
  loanRecords: { orderBy: [{ dateLent: 'desc' as const }, { id: 'asc' as const }] }
} satisfies Prisma.CopyInclude
export type LibraryRow = Prisma.CopyGetPayload<{ include: typeof bookInclude }>

function json<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback
  if (typeof value === 'string') { try { return JSON.parse(value) as T } catch { return fallback } }
  return value as T
}

export function toBook(copy: LibraryRow): Book {
  const work = copy.work
  const spans = json<Book['readingSpans']>(copy.readingSpans ?? work.readingSpans, [])
  const loans = copy.loanRecords.map(loan => ({
    id: loan.id, borrowerName: loan.borrowerName, dateLent: loan.dateLent.toISOString().slice(0, 10),
    expectedReturnDate: loan.expectedReturnDate?.toISOString().slice(0, 10) || null,
    dateReturned: loan.dateReturned?.toISOString().slice(0, 10) || null, notes: loan.notes
  }))
  const activeLoan = loans.find(loan => !loan.dateReturned)
  return {
    id: copy.id, workId: copy.workId, editionId: copy.editionId || undefined,
    revision: copy.revision, workRevision: work.revision,
    title: work.title, author: work.author, genre: work.genre, hours: work.hours,
    recommendedBy: work.recommendedBy, volume: work.volume || '', photoUrl: work.photoUrl,
    summary: work.summary, description: work.description || '', launchYear: work.launchYear || '',
    originalLanguage: work.originalLanguage || '', countryOfOrigin: work.countryOfOrigin || '',
    authorDescription: work.authorDescription || '', coverFile: work.coverFile || '',
    isbn: copy.edition?.isbn || work.isbn || '', publisher: copy.edition?.publisher ?? work.publisher,
    yearPublished: copy.edition?.publicationYear?.toString() ?? work.yearPublished,
    tags: json(work.tags, []), collections: json(work.collections, []),
    series: typeof work.series === 'string' && !work.series.startsWith('{') ? { name: work.series, number: 0 } : json(work.series, null),
    apiData: json(work.apiData, {}), readingSpans: spans,
    goodreadsId: work.goodreadsId, authorLF: work.authorLF, additionalAuthors: work.additionalAuthors,
    originalPublicationYear: work.originalPublicationYear, ownedCopies: work.ownedCopies,
    format: copy.format || 'Physical', condition: copy.condition || 'Good', shelfLocation: copy.shelfLocation,
    shelfRow: copy.shelfLocation, purchased: copy.purchased, ownership: copy.ownership as Ownership,
    currency: copy.currency, purchasePrice: Number(copy.purchasePrice || 0), investedAmount: Number(copy.investedAmount || 0),
    status: (['Read', 'Reading', 'Wishlist'].includes(copy.status) ? copy.status : 'Unread') as ReadingStatus,
    pdfPath: copy.pdfPath || '', mediaType: copy.mediaType === 'epub' ? 'epub' : copy.mediaType === 'pdf' ? 'pdf' : undefined,
    epubLocation: copy.epubLocation || '', currentPage: copy.currentPage || 0,
    totalPages: copy.totalPages || copy.edition?.pageCount || 0, lastReadTimestamp: copy.lastReadTimestamp || '',
    readingSessions: copy.sessions.map(session => ({
      id: session.id, date: session.date.toISOString().slice(0, 10), durationMinutes: Number(session.durationMinutes),
      startPage: session.startPage, endPage: session.endPage, observedAt: session.observedAt.toISOString()
    })),
    rating: copy.rating || 0, quotes: json(copy.quotes, []), amazonLink: copy.amazonLink || '', loans,
    givenTo: activeLoan?.borrowerName || '', loanDate: activeLoan?.dateLent || '',
    readingStartDate: copy.readingStartedAt?.toISOString().slice(0, 10) || spans.at(-1)?.startDate || '',
    readingEndDate: copy.readingCompletedAt?.toISOString().slice(0, 10) || spans.at(-1)?.endDate || (copy.status === 'Read' ? dateKey(copy.dateRead) : '') || '',
    dateRead: copy.dateRead, dateAdded: copy.dateAdded, bookshelves: copy.bookshelves,
    bookshelvesWithPositions: copy.bookshelvesWithPositions, exclusiveShelf: copy.exclusiveShelf,
    myReview: copy.myReview, spoiler: copy.spoiler, privateNotes: copy.privateNotes, readCount: copy.readCount,
    offerPrice: copy.offerPrice == null ? null : Number(copy.offerPrice), offerCurrency: copy.offerCurrency,
    offerCheckedAt: copy.offerCheckedAt?.toISOString() || null, offerSource: copy.offerSource
  }
}
