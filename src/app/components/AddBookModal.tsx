'use client'

import { useEffect, useRef, useState } from 'react'
import { Book } from '../types'
import {
  NEUTRAL_RGB,
  palette,
  raised,
  pressed,
  chipShadow,
  clayFill
} from '../clay'

// App primary (rust/terracotta) — matches --primary in globals.css
const PRIMARY_RGB = '196,106,79'
const primaryFill = (dark: boolean) =>
  clayFill(
    PRIMARY_RGB,
    dark ? '#e38a71' : '#d37d64',
    dark ? '#c46a4f' : '#c46a4f',
    4
  )

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
  const [isDark, setIsDark] = useState(false)

  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains('dark'))
    )
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    searchInputRef.current?.focus()
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const P = palette(isDark)
  const R = (d = 8, b = 20) => raised(NEUTRAL_RGB, isDark, d, b)
  const Pr = (d = 4, b = 10) => pressed(NEUTRAL_RGB, isDark, d, b)

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setHasSearched(true)
    setResults([])

    const q = encodeURIComponent(query.trim())

    try {
      const cleanedQuery = query.replace(/[^0-9X]/gi, '')
      const isIsbn = cleanedQuery.length === 10 || cleanedQuery.length === 13
      const apiKey = 'AIzaSyAMnMWpARYGX90458capjGV60xqTpfhiB4'

      const googleBooksUrl = isIsbn
        ? `https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanedQuery}&key=${apiKey}`
        : `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=10&key=${apiKey}`

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

      if (googleRes.status === 'fulfilled' && googleRes.value.ok) {
        const data = await googleRes.value.json()
        console.log(data)
        if (data.items) {
          data.items.forEach((item: GoogleBookItem) => {
            const vol = item.volumeInfo

            let isbn = ''
            if (vol.industryIdentifiers) {
              const id13 = vol.industryIdentifiers.find(i => i.type === 'ISBN_13')
              const id10 = vol.industryIdentifiers.find(i => i.type === 'ISBN_10')
              isbn = id13 ? id13.identifier : id10 ? id10.identifier : ''
            }

            let mappedGenre = 'FIC'
            const cat = vol.categories ? vol.categories[0].toLowerCase() : ''
            if (cat.includes('fiction')) mappedGenre = 'FIC'
            else if (cat.includes('business') || cat.includes('economics')) mappedGenre = 'STARTUP'
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

            const description = vol.description || item.searchInfo?.textSnippet || ''

            fetchedBooks.push({
              title: vol.title || 'Unknown Title',
              author: vol.authors ? vol.authors.join(', ') : 'Unknown Author',
              genre: mappedGenre,
              launchYear: vol.publishedDate ? vol.publishedDate.substring(0, 4) : '',
              photoUrl: (
                vol.imageLinks?.thumbnail ||
                vol.imageLinks?.smallThumbnail ||
                ''
              ).replace('http:', 'https:'),
              description,
              summary: '',
              isbn: isbn || fallbackIsbn,
              totalPages: vol.pageCount || undefined,
              originalLanguage: lang,
              hours: vol.pageCount ? `${Math.ceil(vol.pageCount / 40)}h` : '0h',
              status: 'Unread',
              format: 'None',
              purchased: false,
              purchasePrice: 0
            })
          })
        }
      }

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
            else if (cat.includes('business') || cat.includes('economics')) mappedGenre = 'STARTUP'
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
              author: doc.author_name ? doc.author_name.join(', ') : 'Unknown Author',
              launchYear: doc.first_publish_year ? doc.first_publish_year.toString() : '',
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
    onSelect(book)

    const enrich = async () => {
      try {
        if (book.author && book.author !== 'Unknown Author' && !book.authorDescription) {
          const firstAuthor = book.author.split(',')[0].trim()
          const wikiRes = await fetch(
            `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(firstAuthor)}`
          )
          if (wikiRes.ok) {
            const wikiData = await wikiRes.json()
            if (wikiData.extract_html && wikiData.type !== 'disambiguation') {
              window.dispatchEvent(
                new CustomEvent('wiki-enrichment', {
                  detail: { bookIsbn: book.isbn, authorDescription: wikiData.extract_html }
                })
              )
            }
          }
        }

        if (!book.description && book.title && book.title !== 'Unknown Title') {
          const queryTerm = book.isbn
            ? book.isbn
            : `${book.title} ${book.author === 'Unknown Author' ? '' : book.author}`.trim()
          const searchRes = await fetch(
            `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(queryTerm)}&utf8=&format=json&origin=*`
          )

          if (searchRes.ok) {
            const searchData = await searchRes.json()
            if (searchData.query?.search?.length > 0) {
              const bestMatchTitle = searchData.query.search[0].title
              const wikiRes = await fetch(
                `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(bestMatchTitle)}`
              )
              if (wikiRes.ok) {
                const wikiData = await wikiRes.json()
                if (wikiData.extract_html && wikiData.type !== 'disambiguation') {
                  window.dispatchEvent(
                    new CustomEvent('wiki-enrichment', {
                      detail: { bookIsbn: book.isbn, description: wikiData.extract_html }
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="w-full max-w-2xl flex flex-col rounded-[32px] overflow-hidden animate-scale-in"
        style={{
          background: P.panel,
          boxShadow: R(14, 36),
          maxHeight: '90dvh'
        }}
      >
        {/* ── Header ── */}
        <div
          className="p-6 flex items-center justify-between shrink-0"
          style={{
            background: P.canvas,
            borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(112,104,168,0.12)'}`
          }}
        >
          <div>
            <h2
              className="text-lg font-black tracking-tight flex items-center gap-2.5"
              style={{ color: P.title }}
            >
              <span
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={primaryFill(isDark)}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              Find a Book
            </h2>
            <p
              className="text-[10px] font-bold uppercase tracking-widest mt-1 ml-10"
              style={{ color: P.faint }}
            >
              Search Google Books &amp; Open Library
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-2xl flex items-center justify-center transition-all hover:-translate-y-0.5 active:scale-90"
            style={{ background: P.well, boxShadow: Pr(), color: P.body }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
                d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Search Bar ── */}
        <div
          className="p-5 shrink-0"
          style={{
            background: P.panel,
            borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(112,104,168,0.10)'}`
          }}
        >
          <form onSubmit={handleSearch} className="flex gap-3">
            <div
              className="relative flex-1 rounded-2xl"
              style={{
                background: P.well,
                boxShadow: Pr(4, 10)
              }}
            >
              <svg
                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                style={{ color: P.faint }}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Enter book name or ISBN…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full bg-transparent rounded-2xl py-3.5 pl-10 pr-4 text-sm font-semibold focus:outline-none placeholder:font-normal"
                style={{ color: P.title }}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-6 rounded-full font-bold tracking-widest uppercase text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:-translate-y-0.5 active:scale-95"
              style={primaryFill(isDark)}
            >
              {loading ? 'Searching…' : 'Search'}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-4 flex items-center gap-4">
            <div className="h-px flex-1" style={{ background: P.well }} />
            <span
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: P.faint }}
            >
              OR
            </span>
            <div className="h-px flex-1" style={{ background: P.well }} />
          </div>

          <button
            onClick={onAddManually}
            className="w-full mt-4 py-3 rounded-full text-xs font-bold uppercase tracking-widest transition-all hover:-translate-y-0.5 active:scale-95"
            style={{
              background: P.well,
              color: P.body,
              boxShadow: Pr(3, 8),
              border: `1.5px dashed ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(112,104,168,0.25)'}`
            }}
          >
            ✏️ Add Book Manually
          </button>
        </div>

        {/* ── Results ── */}
        <div
          className="flex-1 overflow-y-auto custom-scrollbar p-5"
          style={{ background: P.canvas }}
        >
          {loading ? (
            <div
              className="flex flex-col items-center justify-center h-40 gap-4"
              style={{ color: isDark ? '#e38a71' : '#c46a4f' }}
            >
              <svg className="w-8 h-8 animate-spin" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10"
                  stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: P.faint }}>
                Fetching from public APIs…
              </p>
            </div>
          ) : results.length > 0 ? (
            <div className="flex flex-col gap-3">
              {results.map((book, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectResult(book)}
                  className="flex gap-4 p-4 rounded-2xl text-left w-full transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.99] group"
                  style={{
                    background: P.panel,
                    boxShadow: R(6, 16)
                  }}
                >
                  {/* Cover */}
                  <div
                    className="w-14 h-20 shrink-0 rounded-xl overflow-hidden"
                    style={{
                      background: P.well,
                      boxShadow: R(4, 10)
                    }}
                  >
                    {book.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={book.photoUrl} alt="Cover" className="w-full h-full object-cover" />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center text-[9px] font-bold uppercase text-center p-1"
                        style={{ color: P.faint }}
                      >
                        No Cover
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex flex-col min-w-0 py-1 gap-1">
                    <h3
                      className="font-bold line-clamp-2 text-sm leading-snug"
                      style={{ color: P.title }}
                    >
                      {book.title}
                    </h3>
                    <p className="text-xs line-clamp-1" style={{ color: P.body }}>
                      {book.author}
                    </p>
                    <div className="flex items-center gap-2 mt-auto pt-1 flex-wrap">
                      {book.launchYear && (
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{
                            background: P.well,
                            color: P.body,
                            boxShadow: chipShadow(isDark)
                          }}
                        >
                          {book.launchYear}
                        </span>
                      )}
                      {book.isbn && (
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{
                            background: isDark
                              ? `rgba(${PRIMARY_RGB},.2)`
                              : `rgba(${PRIMARY_RGB},.12)`,
                            color: isDark ? '#e38a71' : '#c46a4f',
                            boxShadow: chipShadow(isDark)
                          }}
                        >
                          ISBN: {book.isbn}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Arrow indicator */}
                  <div
                    className="ml-auto self-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    style={{ color: isDark ? '#e38a71' : '#c46a4f' }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
                        d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          ) : hasSearched ? (
            <div className="flex flex-col items-center justify-center h-40 text-center gap-2">
              <span className="text-3xl">📭</span>
              <p className="text-sm font-bold" style={{ color: P.title }}>No books found</p>
              <p className="text-xs" style={{ color: P.faint }}>
                Try a different query or add the book manually.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-center gap-2 opacity-50">
              <span className="text-3xl">📚</span>
              <p className="text-sm font-bold" style={{ color: P.title }}>
                Search to discover books
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
