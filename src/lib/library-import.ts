import type { Book } from '@/app/types'
import { blankBook } from '@/app/components/LibraryShared'
import { dateKey } from './library-domain'

export type ImportRecord = { row: number; book?: Partial<Book>; error?: string }

function csvBook(row: Record<string, string>): Partial<Book> {
  if (row.record) return JSON.parse(row.record)
  const values = Object.fromEntries(Object.entries(row).map(([key, value]) => [key.trim().toLowerCase(), value]))
  const get = (...keys: string[]) => keys.map(key => values[key.toLowerCase()]).find(value => value != null && value !== '') || ''
  const numeric = (...keys: string[]) => Number(get(...keys)) || 0
  const status = get('status', 'Exclusive Shelf')
  const mappedStatus: Book['status'] = status === 'read' || status === 'Read' ? 'Read' : ['Reading', 'currently-reading'].includes(status) ? 'Reading' : ['Wishlist', 'to-read'].includes(status) ? 'Wishlist' : 'Unread'
  const format = get('format', 'binding')
  const book: Partial<Book> = {
    id: get('id'), workId: get('workId'), title: get('title'), author: get('author') || get('Author l-f') || 'Unknown Author',
    genre: get('genre') || 'Uncategorized', status: mappedStatus,
    format: ['Physical', 'PDF', 'Ebook', 'EPUB', 'Kindle', 'Audiobook', 'None'].includes(format) ? format : 'Physical',
    isbn: get('ISBN13', 'ISBN').replace(/^="(.*)"$/, '$1').trim(),
    launchYear: get('launchYear', 'Original Publication Year', 'Year Published'),
    purchasePrice: numeric('purchasePrice'), investedAmount: numeric('investedAmount', 'purchasePrice'),
    totalPages: numeric('totalPages', 'pages', 'Number of Pages'), currentPage: numeric('currentPage'),
    rating: numeric('rating', 'My Rating'), shelfLocation: get('shelfLocation', 'shelfRow'),
    goodreadsId: get('Book Id') || null, authorLF: get('Author l-f') || null,
    additionalAuthors: get('Additional Authors') || null, publisher: get('Publisher') || null,
    yearPublished: get('Year Published') || null, originalPublicationYear: get('Original Publication Year') || null,
    ownedCopies: numeric('Owned Copies'), dateRead: get('Date Read') || null, dateAdded: get('Date Added') || null,
    bookshelves: get('Bookshelves') || null, bookshelvesWithPositions: get('Bookshelves with positions') || null,
    exclusiveShelf: get('Exclusive Shelf') || null, myReview: get('My Review') || null,
    spoiler: get('Spoiler') || null, privateNotes: get('Private Notes') || null, readCount: numeric('Read Count'),
    summary: get('summary'), readingEndDate: dateKey(get('readingEndDate', 'Date Read')) || '',
    purchased: get('purchased') ? get('purchased') === 'true' : mappedStatus !== 'Wishlist',
    ownership: get('ownership') as Book['ownership'] || (mappedStatus === 'Wishlist' ? 'None' : 'Purchased'),
    currency: get('currency') || 'INR'
  }
  return book
}

export async function parseLibraryFile(file: File): Promise<{ records: ImportRecord[]; annualGoal?: number }> {
  if (file.size > 20 * 1024 * 1024) throw new Error('Import files must be 20 MB or smaller.')
  if (/\.json$/i.test(file.name)) {
    const data = JSON.parse(await file.text())
    const rows = Array.isArray(data) ? data : Array.isArray(data.works) && Array.isArray(data.copies) ? data.copies.map((copy: Partial<Book>) => ({ ...data.works.find((work: { id: string }) => work.id === copy.workId), ...copy, workId: copy.workId })) : data.books
    if (!Array.isArray(rows)) throw new Error('Choose a library JSON export containing a books array.')
    return { records: rows.map((book, index) => !book || typeof book !== 'object' || Array.isArray(book) ? { row: index + 1, error: 'Invalid book record.' } : { row: index + 1, book: { ...blankBook(), ...book } }),
      annualGoal: !Array.isArray(data) && Number.isInteger(data.annualGoal) ? data.annualGoal : undefined }
  }
  if (!/\.csv$/i.test(file.name)) throw new Error('Choose a JSON or CSV library export.')
  const { default: Papa } = await import('papaparse')
  const result = await new Promise<import('papaparse').ParseResult<Record<string, string>>>((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, { header: true, skipEmptyLines: true, complete: resolve, error: reject })
  })
  const records = result.data.map((row, index): ImportRecord => {
    try {
      const book = { ...blankBook(), ...csvBook(row) }
      if (!book.title.trim()) throw new Error('The title is missing.')
      return { row: index + 2, book }
    } catch (error) { return { row: index + 2, error: error instanceof Error ? error.message : 'Invalid row.' } }
  })
  for (const error of result.errors) {
    const row = (error.row ?? 0) + 2
    const record = records.find(record => record.row === row)
    if (record) { record.error = error.message; delete record.book }
    else records.push({ row, error: error.message })
  }
  const goal = Number(result.data[0]?.annualGoal)
  return { records, annualGoal: Number.isInteger(goal) && goal > 0 ? goal : undefined }
}
