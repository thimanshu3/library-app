'use client'

import { useEffect, useRef, useState } from 'react'
import { Book } from '../types'

export default function AddBookModal({
  onClose,
  onSelect,
  onAddManually
}: {
  onClose: () => void
  onSelect: (book: Partial<Book>) => void
  onAddManually: () => void
}) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Partial<Book>[]>([])
  const [hasSearched, setHasSearched] = useState(false)

  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Focus search input on mount
    searchInputRef.current?.focus()

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setHasSearched(true)
    setResults([])

    const q = encodeURIComponent(query.trim())

    try {
      // Determine if query is an ISBN (only digits/X, 10 or 13 chars)
      const cleanedQuery = query.replace(/[^0-9X]/gi, '')
      const isIsbn = cleanedQuery.length === 10 || cleanedQuery.length === 13
      const apiKey = 'AIzaSyAMnMWpARYGX90458capjGV60xqTpfhiB4'

      const googleBooksUrl = isIsbn
        ? `https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanedQuery}&key=${apiKey}`
        : `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=10&key=${apiKey}`

      // We query both Google Books and Open Library
      const [googleRes, olRes] = await Promise.allSettled([
        fetch(googleBooksUrl),
        fetch(`https://openlibrary.org/search.json?q=${q}&limit=10`)
      ])

      type GoogleBookItem = {
        volumeInfo: {
          industryIdentifiers?: { type: string; identifier: string }[]
          categories?: string[]
          language?: string
          description?: string
          title?: string
          authors?: string[]
          publishedDate?: string
          imageLinks?: { thumbnail?: string; smallThumbnail?: string }
          pageCount?: number
        }
        searchInfo?: { textSnippet?: string }
      }
      const fetchedBooks: Partial<Book>[] = []

      // Parse Google Books
      if (googleRes.status === 'fulfilled' && googleRes.value.ok) {
        const data = await googleRes.value.json()
        console.log(data)
        if (data.items) {
          data.items.forEach((item: GoogleBookItem) => {
            const vol = item.volumeInfo

            let isbn = ''
            if (vol.industryIdentifiers) {
              const id13 = vol.industryIdentifiers.find(
                i => i.type === 'ISBN_13'
              )
              const id10 = vol.industryIdentifiers.find(
                i => i.type === 'ISBN_10'
              )
              isbn = id13 ? id13.identifier : id10 ? id10.identifier : ''
            }

            let mappedGenre = 'FIC'
            const cat = vol.categories ? vol.categories[0].toLowerCase() : ''
            if (cat.includes('fiction')) mappedGenre = 'FIC'
            else if (cat.includes('business') || cat.includes('economics'))
              mappedGenre = 'STARTUP'
            else if (cat.includes('psychology')) mappedGenre = 'PSY'
            else if (cat.includes('history')) mappedGenre = 'HIST'
            else if (cat.includes('biography')) mappedGenre = 'BIO'
            else if (cat.includes('science')) mappedGenre = 'SCI'
            else if (cat.includes('philosophy')) mappedGenre = 'PHIL'
            else if (cat) mappedGenre = 'FIC'

            const fallbackIsbn =
              query.replace(/[^0-9X]/gi, '').length >= 10
                ? query.replace(/[^0-9X]/gi, '')
                : ''

            let lang = vol.language || 'en'
            if (lang === 'en') lang = 'English'
            else if (lang === 'fr') lang = 'French'
            else if (lang === 'es') lang = 'Spanish'
            else if (lang === 'de') lang = 'German'
            else if (lang === 'it') lang = 'Italian'
            else lang = lang.toUpperCase()

            const description =
              vol.description || item.searchInfo?.textSnippet || ''

            fetchedBooks.push({
              title: vol.title || 'Unknown Title',
              author: vol.authors ? vol.authors.join(', ') : 'Unknown Author',
              genre: mappedGenre,
              launchYear: vol.publishedDate
                ? vol.publishedDate.substring(0, 4)
                : '',
              photoUrl: (
                vol.imageLinks?.thumbnail ||
                vol.imageLinks?.smallThumbnail ||
                ''
              ).replace('http:', 'https:'),
              description: description,
              summary: '',
              isbn: isbn || fallbackIsbn,
              totalPages: vol.pageCount || undefined,
              originalLanguage: lang,
              // Note: Google Books doesn't reliably expose origin country; user can fill manually
              hours: vol.pageCount ? `${Math.ceil(vol.pageCount / 40)}h` : '0h',
              // Defaults for our app
              status: 'Unread',
              format: 'None',
              purchased: false,
              purchasePrice: 0
            })
          })
        }
      }

      // Parse Open Library
      if (olRes.status === 'fulfilled' && olRes.value.ok) {
        type OLBookDoc = {
          isbn?: string[]
          subject?: string[]
          title?: string
          author_name?: string[]
          first_publish_year?: number
          number_of_pages_median?: number
          language?: string[]
          cover_i?: number
        }
        const data = await olRes.value.json()
        if (data.docs) {
          data.docs.forEach((doc: OLBookDoc) => {
            const isbn = doc.isbn ? doc.isbn[0] : ''
            const fallbackIsbn =
              query.replace(/[^0-9X]/gi, '').length >= 10
                ? query.replace(/[^0-9X]/gi, '')
                : ''

            let mappedGenre = 'FIC'
            const cat = doc.subject ? doc.subject[0].toLowerCase() : ''
            if (cat.includes('fiction')) mappedGenre = 'FIC'
            else if (cat.includes('business') || cat.includes('economics'))
              mappedGenre = 'STARTUP'
            else if (cat.includes('psychology')) mappedGenre = 'PSY'
            else if (cat.includes('history')) mappedGenre = 'HIST'
            else if (cat.includes('biography')) mappedGenre = 'BIO'
            else if (cat.includes('science')) mappedGenre = 'SCI'
            else if (cat.includes('philosophy')) mappedGenre = 'PHIL'
            else if (cat) mappedGenre = 'FIC'

            let lang = doc.language ? doc.language[0] : 'eng'
            if (lang === 'eng') lang = 'English'
            else if (lang === 'fre') lang = 'French'
            else if (lang === 'spa') lang = 'Spanish'
            else if (lang === 'ger') lang = 'German'
            else lang = lang.toUpperCase()

            fetchedBooks.push({
              title: doc.title || 'Unknown Title',
              author: doc.author_name
                ? doc.author_name.join(', ')
                : 'Unknown Author',
              launchYear: doc.first_publish_year
                ? doc.first_publish_year.toString()
                : '',
              photoUrl: doc.cover_i
                ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
                : '',
              isbn: isbn || fallbackIsbn,
              genre: mappedGenre,
              originalLanguage: lang,
              status: 'Unread',
              format: 'None',
              purchased: false,
              purchasePrice: 0
            })
          })
        }
      }

      setResults(fetchedBooks)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectResult = (book: Partial<Book>) => {
    // Open the edit modal immediately with the data we have
    onSelect(book)

    // Asynchronously enrich with Wikipedia data in the background
    // The parent (page.tsx) will update editingBook state when this resolves
    const enrich = async () => {
      try {
        // Try fetching author info from Wikipedia
        if (
          book.author &&
          book.author !== 'Unknown Author' &&
          !book.authorDescription
        ) {
          const firstAuthor = book.author.split(',')[0].trim()
          const wikiRes = await fetch(
            `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(firstAuthor)}`
          )
          if (wikiRes.ok) {
            const wikiData = await wikiRes.json()
            if (wikiData.extract_html && wikiData.type !== 'disambiguation') {
              // Dispatch event so parent can update the editing book
              window.dispatchEvent(
                new CustomEvent('wiki-enrichment', {
                  detail: {
                    bookIsbn: book.isbn,
                    authorDescription: wikiData.extract_html
                  }
                })
              )
            }
          }
        }

        // If no description, try fetching book info from Wikipedia
        if (!book.description && book.title && book.title !== 'Unknown Title') {
          // Use Wikipedia Search API first with Title + Author to find the exact article
          const queryTerm = book.isbn ? book.isbn : `${book.title} ${book.author === 'Unknown Author' ? '' : book.author}`.trim();
          const searchRes = await fetch(
            `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(queryTerm)}&utf8=&format=json&origin=*`
          )
          
          if (searchRes.ok) {
            const searchData = await searchRes.json()
            if (searchData.query?.search?.length > 0) {
              const bestMatchTitle = searchData.query.search[0].title
              
              // Now fetch the summary for the best match
              const wikiRes = await fetch(
                `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(bestMatchTitle)}`
              )
              if (wikiRes.ok) {
                const wikiData = await wikiRes.json()
                if (wikiData.extract_html && wikiData.type !== 'disambiguation') {
                  window.dispatchEvent(
                    new CustomEvent('wiki-enrichment', {
                      detail: {
                        bookIsbn: book.isbn,
                        description: wikiData.extract_html
                      }
                    })
                  )
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch extra details', err)
      }
    }
    enrich()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="bg-white dark:bg-[#111118] border border-slate-200 dark:border-slate-800 w-full max-w-2xl rounded-[28px] shadow-2xl flex flex-col overflow-hidden animate-scale-in"
        style={{ maxHeight: '90dvh' }}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-[#0e0e16]/50">
          <div>
            <h2 className="text-lg font-black tracking-wide text-slate-900 dark:text-white flex items-center gap-2">
              <svg
                className="w-5 h-5 text-accent"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              Find Book
            </h2>
            <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-widest">
              Search Google Books & Open Library
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/50 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Search Input */}
        <div className="p-6 shrink-0 border-b border-slate-100 dark:border-slate-800/60">
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Enter Book Name or ISBN..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 pl-4 pr-4 text-sm focus:outline-none focus:border-accent text-slate-900 dark:text-white transition-all font-semibold placeholder:font-normal"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-6 bg-[#171b2e] hover:bg-[#171b2e] text-white rounded-full font-bold tracking-widest uppercase text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-black/10"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </form>

          <div className="mt-4 flex items-center gap-4">
            <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              OR
            </span>
            <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
          </div>

          <button
            onClick={onAddManually}
            className="w-full mt-4 py-3 bg-white dark:bg-slate-950 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-full text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest hover:border-accent hover:text-accent transition-colors"
          >
            Add Book Manually
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-50 dark:bg-[#0e0e16]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-40 gap-4 text-accent">
              <svg className="w-8 h-8 animate-spin" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <p className="text-[10px] font-bold uppercase tracking-widest">
                Fetching from public APIs...
              </p>
            </div>
          ) : results.length > 0 ? (
            <div className="flex flex-col gap-3">
              {results.map((book, i) => (
                <div
                  key={i}
                  onClick={() => handleSelectResult(book)}
                  className="flex gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-accent cursor-pointer transition-all group hover:shadow-lg shadow-black/5"
                >
                  <div className="w-16 h-24 shrink-0 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 relative">
                    {book.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={book.photoUrl}
                        alt="Cover"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400 font-bold uppercase text-center p-1">
                        No Cover
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col min-w-0 py-1">
                    <h3 className="font-bold text-slate-900 dark:text-white line-clamp-2 text-sm group-hover:text-accent dark:group-hover:text-accent-dim transition-colors">
                      {book.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                      {book.author}
                    </p>
                    <div className="flex items-center gap-2 mt-auto">
                      {book.launchYear && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {book.launchYear}
                        </span>
                      )}
                      {book.isbn && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent-container dark:bg-indigo-900/30 text-accent dark:text-accent-dim">
                          ISBN: {book.isbn}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : hasSearched ? (
            <div className="flex flex-col items-center justify-center h-40 text-center gap-2">
              <span className="text-3xl">📭</span>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                No books found
              </p>
              <p className="text-xs text-slate-500">
                Try a different query or add the book manually.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-center gap-2 opacity-50">
              <span className="text-3xl">📚</span>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Search to discover books
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
