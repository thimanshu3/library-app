export function bookCover(book: { coverFile?: string; photoUrl?: string }): string {
  const value = book.coverFile || book.photoUrl || ''
  if (!value) return '/book-placeholder.svg'
  if (/^https?:\/\//i.test(value)) return value.replace(/^http:/i, 'https:')
  if (value.startsWith('/')) return value
  return `/covers/${encodeURIComponent(value)}`
}
