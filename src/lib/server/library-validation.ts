import 'server-only'
import { z } from 'zod'
import { dateKey } from '@/lib/library-domain'
import { HttpError } from './errors'

const text = (length = 5000) => z.string().max(length).default('')
const id = z.string().max(180).regex(/^[a-zA-Z0-9_.:-]*$/)
const number = z.number().finite().nonnegative()
const money = number.max(1_000_000_000).transform(value => Math.round(value * 100) / 100).default(0)
const date = z.string().refine(value => !value || !!dateKey(value), 'Use a valid calendar date.').nullable().optional()
const page = number.int().max(1_000_000).default(0)
const optionalText = z.string().max(5000).nullable().optional()
export const SessionSchema = z.object({
  id: id.min(1), date: z.string().refine(value => !!dateKey(value), 'Use a valid session date.'),
  durationMinutes: number.max(1440), startPage: page, endPage: page,
  observedAt: z.iso.datetime().optional()
})
export const LoanSchema = z.object({
  id: id.min(1), borrowerName: z.string().trim().min(1).max(200),
  dateLent: z.string().refine(value => !!dateKey(value)), expectedReturnDate: date.default(null), dateReturned: date.default(null), notes: text()
}).refine(loan => !loan.expectedReturnDate || dateKey(loan.expectedReturnDate)! >= dateKey(loan.dateLent)!, 'Return date cannot precede lending.').refine(loan => !loan.dateReturned || dateKey(loan.dateReturned)! >= dateKey(loan.dateLent)!, 'Return date cannot precede lending.')

export const BookSchema = z.object({
  createToken: z.uuid().optional(),
  id: id.default(''), workId: id.default(''), title: z.string().trim().min(1, 'Enter a title.').max(1000),
  author: z.string().trim().min(1, 'Enter an author.').max(1000), genre: text(200), hours: text(100),
  recommendedBy: text(1000), volume: text(100), photoUrl: text(2048), coverFile: text(2048),
  summary: text(100_000), description: text(100_000), authorDescription: text(100_000),
  launchYear: text(32), originalLanguage: text(100), countryOfOrigin: text(200), isbn: text(64),
  tags: z.array(z.string().max(200)).max(1000).default([]), collections: z.array(z.string().max(200)).max(1000).default([]),
  series: z.object({ name: z.string().max(500), number: number }).nullable().optional(),
  apiData: z.object({ googleId: z.string().max(500).optional(), openLibraryId: z.string().max(500).optional() }).default({}),
  readingSpans: z.array(z.object({ startDate: z.string().refine(value => !!dateKey(value)), endDate: z.string().refine(value => !!dateKey(value)).optional() })).max(1000).default([]),
  format: z.enum(['Physical', 'PDF', 'Ebook', 'EPUB', 'Kindle', 'Audiobook', 'None']).default('Physical'),
  condition: z.enum(['New', 'Good', 'Worn', 'Damaged']).default('Good'),
  shelfLocation: text(500), shelfRow: z.string().max(500).optional(),
  purchased: z.boolean().default(true), ownership: z.enum(['Purchased', 'Gifted', 'Borrowed', 'None']).optional(),
  currency: z.string().regex(/^[A-Z]{3}$/).default('INR'), purchasePrice: money, investedAmount: money,
  status: z.enum(['Unread', 'Reading', 'Read', 'Wishlist']).default('Unread'),
  pdfPath: text(2048).refine(value => !value || /^\/(api\/files|pdfs)\/[^/?#]+\.(pdf|epub)$/i.test(value) || /^https:\/\//.test(value), 'Use an uploaded ebook or an HTTPS ebook URL.'),
  currentPage: page, totalPages: page, lastReadTimestamp: text(100), epubLocation: text(4096), mediaType: z.enum(['pdf', 'epub']).optional(),
  readingSessions: z.array(SessionSchema.extend({ id: id.optional() })).max(10_000).default([]),
  rating: number.int().max(5).default(0), quotes: z.array(z.object({ text: z.string().min(1).max(50_000), page: page.optional(), addedAt: text(100) })).max(10_000).default([]),
  amazonLink: text(2048).refine(value => !value || /^https:\/\//.test(value), 'Use an HTTPS store link.'),
  loans: z.array(LoanSchema).max(1000).default([]).refine(loans => loans.filter(loan => !loan.dateReturned).length <= 1, 'Return the active loan before lending again.'),
  readingStartDate: date, readingEndDate: date, givenTo: text(200), loanDate: date,
  revision: number.int().optional(), workRevision: number.int().optional(), editionId: id.optional(),
  goodreadsId: optionalText, authorLF: optionalText, additionalAuthors: optionalText, publisher: optionalText,
  yearPublished: optionalText, originalPublicationYear: optionalText, ownedCopies: number.int().nullable().optional(),
  dateRead: optionalText, dateAdded: optionalText, bookshelves: optionalText, bookshelvesWithPositions: optionalText,
  exclusiveShelf: optionalText, myReview: optionalText, spoiler: optionalText, privateNotes: optionalText, readCount: number.int().nullable().optional(),
  offerPrice: money.nullable().optional(), offerCurrency: z.string().regex(/^[A-Z]{3}$/).nullable().optional(),
  offerCheckedAt: z.iso.datetime().nullable().optional(), offerSource: optionalText
}).refine(book => !book.totalPages || book.currentPage <= book.totalPages, 'Current page exceeds the total pages.')
  .refine(book => !book.readingStartDate || !book.readingEndDate || dateKey(book.readingStartDate)! <= dateKey(book.readingEndDate)!, 'Reading end date cannot precede the start date.')

export const QuerySchema = z.object({
  search: text(500), statusFilter: z.enum(['All', 'Unread', 'Reading', 'Read', 'Wishlist', 'On Loan']).default('All'),
  volumeFilter: text(100).default('All'), genreFilter: text(200).default('All'), authorFilter: text(1000).default('All'), shelfFilter: text(500).default('All'),
  yearFilter: z.enum(['All', 'Before 1900', '1900-1950', '1951-1999', '2000-2010', '2011-2020', '2021-Present']).default('All'),
  formatFilter: z.enum(['All', 'Physical', 'PDF', 'Ebook', 'EPUB', 'Kindle', 'Audiobook', 'None']).default('All'),
  purchasedFilter: z.enum(['All', 'Purchased', 'Gifted', 'Borrowed', 'None', 'Not Purchased']).default('All'),
  sortBy: z.enum(['id', 'title', 'author', 'year', 'price']).default('id'),
  viewMode: z.enum(['grid', 'list', 'alphabetic', 'authors', 'collections', 'volumes', 'analytics', 'loans', 'wishlist']).default('grid'),
  skip: number.int().max(1_000_000).default(0), take: number.int().min(1).max(100).default(20), cursor: id.min(1).optional()
})

export function validate<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value)
  if (!result.success) {
    const issue = result.error.issues[0]
    throw new HttpError(400, `${issue.path.join('.') || 'Data'}: ${issue.message}`)
  }
  return result.data
}
