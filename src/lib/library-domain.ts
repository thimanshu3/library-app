import type { Book, ReadingSpan } from '@/app/types'

export function localToday(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function dateKey(value?: string | null): string | null {
  if (!value) return null
  const day = value.replaceAll('/', '-').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null
  const parsed = new Date(`${day}T00:00:00Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === day ? day : null
}

export function calendarDaysBetween(start?: string | null, end = localToday()): number | null {
  const first = dateKey(start), last = dateKey(end)
  return first && last ? Math.round((Date.parse(last) - Date.parse(first)) / 86400000) : null
}

export function completionDates(book: Book): string[] {
  const spans = book.readingSpans || []
  const dates = spans.map(span => dateKey(span.endDate)).filter((date): date is string => !!date)
  const latest = dateKey(book.readingEndDate || book.dateRead)
  if (latest && !dates.includes(latest)) dates.push(latest)
  return dates
}

export function activityByDay(books: Book[]): Map<string, number> {
  const days = new Map<string, number>()
  for (const book of books) {
    for (const day of completionDates(book)) days.set(day, (days.get(day) || 0) + 1)
    for (const session of book.readingSessions || []) {
      const day = dateKey(session.date)
      if (day && session.durationMinutes > 0) days.set(day, (days.get(day) || 0) + 1)
    }
  }
  return days
}

export function progressPercent(book: Book): number | null {
  if (book.status === 'Wishlist') return null
  if (book.status === 'Read') return 100
  return book.totalPages && book.totalPages > 0 ? Math.max(0, Math.min(100, Math.round((book.currentPage || 0) / book.totalPages * 100))) : null
}

export function attachmentType(book: Pick<Book, 'pdfPath' | 'mediaType'>): 'pdf' | 'epub' {
  if (book.mediaType) return book.mediaType
  try { return /\.epub$/i.test(new URL(book.pdfPath || '', 'https://library.local').pathname) ? 'epub' : 'pdf' } catch { return 'pdf' }
}

type HistoryBook = Pick<Book, 'status' | 'readingSpans' | 'readingStartDate' | 'readingEndDate' | 'dateRead' | 'readCount'>
export function advanceReadingHistory(book: HistoryBook, previous?: HistoryBook): { spans: ReadingSpan[]; started: string | null; completed: string | null; readCount: number } {
  const spans = [...(book.readingSpans || [])].map(span => ({ ...span }))
  let started = dateKey(book.readingStartDate)
  let completed = dateKey(book.readingEndDate || book.dateRead)
  if (book.status === 'Reading' && previous?.status !== 'Reading') {
    started ||= localToday()
    if (previous?.status === 'Read') {
      started = book.readingStartDate !== previous.readingStartDate ? dateKey(book.readingStartDate) || localToday() : localToday()
      completed = null
    }
    if (!spans.length || spans.at(-1)?.endDate) spans.push({ startDate: started })
  }
  if (book.status === 'Read') {
    if (!completed && previous?.status === 'Read') return { spans, started, completed, readCount: book.readCount || 0 }
    completed ||= localToday()
    started ||= completed
    if (!spans.length || (previous?.status !== 'Read' && spans.at(-1)?.endDate)) spans.push({ startDate: started, endDate: completed })
    else spans[spans.length - 1] = { startDate: started, endDate: completed }
  } else if (spans.length && (started || completed)) {
    spans[spans.length - 1] = { startDate: started || spans.at(-1)!.startDate, ...(completed ? { endDate: completed } : {}) }
  }
  return { spans, started, completed, readCount: Math.max(book.readCount || 0, spans.filter(span => span.endDate).length) }
}
