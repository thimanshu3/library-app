'use client'
import { useQueryStates, parseAsString, parseAsInteger } from 'nuqs';
/* eslint-disable @next/next/no-img-element */

import type { CSSProperties, ReactNode } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import AddBookModal from './components/AddBookModal'
import AnalyticsDashboard from './components/AnalyticsDashboard'
import BookCard from './components/BookCard'
import BookViewModal from './components/BookViewModal'
import DashboardStats from './components/DashboardStats'
import EditModal from './components/EditModal'

import dynamic from 'next/dynamic'
import Papa from 'papaparse'
import {
  fetchFilteredBooksAction,
  importBooksAction,
  saveLibraryAction
} from './actions'
import {
  NEUTRAL_RGB,
  chipShadow,
  clayFill,
  palette,
  pressed,
  raised,
  statusTheme
} from './clay'
import LoanTracker from './components/LoanTracker'
import MobileFilterSheet from './components/MobileFilterSheet'
import ToastProvider, { toast } from './components/Toast'
import SignOutButton from './components/SignOutButton'

const PdfReaderModal = dynamic(() => import('./components/PdfReaderModal'), {
  ssr: false
})
const EpubReaderModal = dynamic(() => import('./components/EpubReaderModal'), {
  ssr: false
})

import BookListCard from './components/BookList'
import {
  Book,
  BookCopy,
  BookWork,
  LoanRecord,
  Quote,
  ReadingSession,
  ReadingSpan
} from './types'

// ─── Types & static config ────────────────────────────────────────────────────

import {
  ViewMode,
  Option,
  viewModes,
  sortOptions,
  genreOptions,
  volumeOptions,
  eraOptions,
  formatOptions,
  ownershipOptions,
  statusList,
  genreName,
  blankBook,
  paths,
  Icon,
  ClayButton,
  ClaySelect,
  StatusChip,
  SectionHeader,
} from './components/LibraryShared';
// ─── Main Component ────────────────────────────────────────────────────────────
export default function LibraryClient({
  initialBooks,
  initialTotalCount
}: {
  initialBooks: Book[]
  initialTotalCount: number
}) {
  const [books, setBooks] = useState<Book[]>(initialBooks)
  const [totalCount, setTotalCount] = useState(initialTotalCount)

  const [hasMore, setHasMore] = useState(initialBooks.length === 20)
  const [loading, setLoading] = useState(false)

    const [filters, setFilters] = useQueryStates({
    search: parseAsString.withDefault(''),
    statusFilter: parseAsString.withDefault('All'),
    volumeFilter: parseAsString.withDefault('All'),
    genreFilter: parseAsString.withDefault('All'),
    authorFilter: parseAsString.withDefault('All'),
    yearFilter: parseAsString.withDefault('All'),
    formatFilter: parseAsString.withDefault('All'),
    purchasedFilter: parseAsString.withDefault('All'),
    shelfFilter: parseAsString.withDefault('All'),
    sortBy: parseAsString.withDefault('id'),
    skip: parseAsInteger.withDefault(0)
  }, { history: 'push' });

  const { search, statusFilter, volumeFilter, genreFilter, authorFilter, yearFilter, formatFilter, purchasedFilter, shelfFilter, sortBy, skip } = filters;


  const fileInputRef = useRef<HTMLInputElement>(null)

  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [isBatchMode, setIsBatchMode] = useState(false)
  const [selectedBooks, setSelectedBooks] = useState<string[]>([])

  const [isAddingBook, setIsAddingBook] = useState(false)
  const [editingBook, setEditingBook] = useState<Book | null>(null)
  const [viewingBook, setViewingBook] = useState<Book | null>(null)
  const [readingPdfBook, setReadingPdfBook] = useState<Book | null>(null)

  const [isDark, setIsDark] = useState(false)
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const exportMenuRef = useRef<HTMLDivElement>(null)

  // ── Theme ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem('theme')
    const dark = stored
      ? stored === 'dark'
      : document.documentElement.classList.contains('dark')
    setIsDark(dark)
    document.documentElement.classList.toggle('dark', dark)
  }, [])

  // ── Wikipedia async enrichment ─────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (!detail) return
      setEditingBook(prev => {
        if (!prev) return prev
        return {
          ...prev,
          ...(detail.authorDescription && !prev.authorDescription
            ? { authorDescription: detail.authorDescription }
            : {}),
          ...(detail.description && !prev.description
            ? { description: detail.description }
            : {})
        }
      })
    }
    window.addEventListener('wiki-enrichment', handler)
    return () => window.removeEventListener('wiki-enrichment', handler)
  }, [])

  // ── Close export menu when clicking outside ────────────────────────────────
  useEffect(() => {
    if (!exportMenuOpen) return
    const handler = (e: MouseEvent) => {
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(e.target as Node)
      ) {
        setExportMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [exportMenuOpen])

  const toggleTheme = () => {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  // ── Data ───────────────────────────────────────────────────────────────────
  async function saveBooks(updated: Book[]) {
    try {
      // Split into works and copies
      const worksMap = new Map<string, BookWork>()
      const copies: BookCopy[] = []

      updated.forEach(book => {
        if (!worksMap.has(book.workId)) {
          worksMap.set(book.workId, {
            id: book.workId,
            title: book.title,
            author: book.author,
            genre: book.genre,
            hours: book.hours,
            recommendedBy: book.recommendedBy,
            volume: book.volume,
            photoUrl: book.photoUrl,
            summary: book.summary,
            description: book.description,
            launchYear: book.launchYear,
            originalLanguage: book.originalLanguage,
            countryOfOrigin: book.countryOfOrigin,
            authorDescription: book.authorDescription,
            coverFile: book.coverFile,
            isbn: book.isbn,
            tags: book.tags || [],
            collections: book.collections || [],
            series: book.series,
            apiData: book.apiData || {},
            readingSpans: book.readingSpans || [],
            // Goodreads fields
            goodreadsId: book.goodreadsId,
            authorLF: book.authorLF,
            additionalAuthors: book.additionalAuthors,
            publisher: book.publisher,
            yearPublished: book.yearPublished,
            originalPublicationYear: book.originalPublicationYear,
            ownedCopies: book.ownedCopies
          })
        }

        copies.push({
          id: book.id as string,
          workId: book.workId,
          format: book.format,
          condition: book.condition,
          shelfLocation: book.shelfLocation || book.shelfRow || '',
          purchased: book.purchased,
          purchasePrice: book.purchasePrice,
          investedAmount: book.investedAmount,
          status: book.status,
          pdfPath: book.pdfPath,
          currentPage: book.currentPage,
          totalPages: book.totalPages,
          lastReadTimestamp: book.lastReadTimestamp,
          readingSessions: book.readingSessions || [],
          rating: book.rating,
          quotes: book.quotes || [],
          amazonLink: book.amazonLink,
          loans: book.loans || [],
          // Goodreads fields
          dateRead: book.dateRead,
          dateAdded: book.dateAdded,
          bookshelves: book.bookshelves,
          bookshelvesWithPositions: book.bookshelvesWithPositions,
          exclusiveShelf: book.exclusiveShelf,
          myReview: book.myReview,
          spoiler: book.spoiler,
          privateNotes: book.privateNotes,
          readCount: book.readCount
        })
      })

      const res = await saveLibraryAction(Array.from(worksMap.values()), copies)
      if (res.error) throw new Error(res.error)
    } catch {
      toast('Failed to save changes', 'error')
    }
  }

  // ── Filter & Sort ──────────────────────────────────────────────────────────

  const initialMount = useRef(true)

  useEffect(() => {
    if (initialMount.current) {
      initialMount.current = false
      return
    }

    // Skip server fetch for views that show local-only data
    const localOnlyViews: ViewMode[] = ['analytics', 'loans', 'wishlist']
    if (localOnlyViews.includes(viewMode)) {
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)

    fetchFilteredBooksAction({
      search,
      statusFilter,
      volumeFilter,
      genreFilter,
      authorFilter,
      yearFilter,
      formatFilter,
      purchasedFilter,
      shelfFilter,
      sortBy,
      skip: 0,
      take: 20,
      viewMode
    }).then(res => {
      if (!active) return
      if (res.books) {
        setBooks(res.books as Book[])
        setTotalCount(res.totalCount || 0)
        setFilters({ skip: 0 });
        setHasMore(res.hasMore ?? res.books.length === 20)
      }
      setLoading(false)
    })

    return () => {
      active = false
    }
  }, [
    search,
    statusFilter,
    volumeFilter,
    genreFilter,
    authorFilter,
    yearFilter,
    formatFilter,
    purchasedFilter,
    shelfFilter,
    sortBy,
    viewMode
  ])

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return
    setLoading(true)
    const res = await fetchFilteredBooksAction({
      search,
      statusFilter,
      volumeFilter,
      genreFilter,
      authorFilter,
      yearFilter,
      formatFilter,
      purchasedFilter,
      shelfFilter,
      sortBy,
      skip,
      take: 20,
      viewMode
    })
    if (res.books) {
      setBooks(prev => {
        const existingIds = new Set(prev.map(b => b.id))
        const newBooks = (res.books as Book[]).filter(b => !existingIds.has(b.id))
        return [...prev, ...newBooks]
      })
      setFilters({ skip: skip + 20 });
      setHasMore(res.hasMore ?? res.books.length === 20);
    }
    setLoading(false)
  }, [
    loading,
    hasMore,
    search,
    statusFilter,
    volumeFilter,
    genreFilter,
    authorFilter,
    yearFilter,
    formatFilter,
    purchasedFilter,
    shelfFilter,
    sortBy,
    skip
  ])

  const observerTarget = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore()
        }
      },
      { threshold: 1.0 }
    )
    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }
    return () => {
      observer.disconnect()
    }
  }, [loadMore, hasMore, loading])

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSaveBook = async (updated: Book) => {
    const finalBook = { ...updated }

    if (finalBook.photoUrl) {
      finalBook.coverFile = finalBook.photoUrl
    }

    let updatedBooks: Book[]
    if (finalBook.id === '') {
      const newId = `c_${Date.now()}`
      finalBook.id = newId
      if (!finalBook.workId) {
        finalBook.workId = `w_${Date.now()}`
      }
      updatedBooks = [finalBook, ...books]
      toast('Book added to library', 'success')
    } else {
      updatedBooks = books.map(b => (b.id === finalBook.id ? finalBook : b))
      toast('Changes saved', 'success')
    }
    setBooks(updatedBooks)
    saveBooks(updatedBooks)
    setEditingBook(null)
  }

  const handleAddBook = () => {
    setIsAddingBook(true)
  }

  const handleManualAdd = () => {
    setIsAddingBook(false)
    setEditingBook(blankBook())
  }

  const handleSelectSearchedBook = (bookData: Partial<Book>) => {
    setIsAddingBook(false)

    let workIdToUse = ''
    let prefilledData = { ...bookData }

    const duplicate = books.find(
      b =>
        (bookData.isbn && b.isbn === bookData.isbn) ||
        (b.title?.toLowerCase() === bookData.title?.toLowerCase() &&
          b.author?.toLowerCase() === bookData.author?.toLowerCase())
    )

    if (duplicate) {
      const addAsCopy = window.confirm(
        `You already own a copy of "${duplicate.title}". Do you want to add this as another copy to the same Work record?`
      )
      if (addAsCopy) {
        workIdToUse = duplicate.workId
        prefilledData = {
          ...prefilledData,
          title: duplicate.title,
          author: duplicate.author,
          genre: duplicate.genre,
          hours: duplicate.hours,
          recommendedBy: duplicate.recommendedBy,
          volume: duplicate.volume,
          photoUrl: duplicate.photoUrl,
          summary: duplicate.summary,
          description: duplicate.description,
          authorDescription: duplicate.authorDescription,
          isbn: duplicate.isbn,
          launchYear: duplicate.launchYear,
          originalLanguage: duplicate.originalLanguage,
          countryOfOrigin: duplicate.countryOfOrigin,
          tags: duplicate.tags,
          collections: duplicate.collections,
          apiData: duplicate.apiData,
          readingSpans: duplicate.readingSpans
        }
      }
    }

    setEditingBook({
      ...blankBook(),
      id: (bookData.id || '') as string,
      workId: workIdToUse,
      ...prefilledData
    })
  }

  const handleBatchSelect = (id: string) => {
    setSelectedBooks(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleBatchMarkRead = () => {
    const updated = books.map(b =>
      selectedBooks.includes(b.id) ? { ...b, status: 'Read' } : b
    )
    setBooks(updated)
    saveBooks(updated)
    toast(`${selectedBooks.length} books marked as read`, 'success')
    setSelectedBooks([])
    setIsBatchMode(false)
  }

  const handleBatchDelete = () => {
    const updated = books.filter(b => !selectedBooks.includes(b.id))
    setBooks(updated)
    saveBooks(updated)
    toast(`${selectedBooks.length} books removed`, 'info')
    setSelectedBooks([])
    setIsBatchMode(false)
  }

  const resetFilters = () => {
    setFilters(null);
  }

  const hasActiveFilters =
    search ||
    statusFilter !== 'All' ||
    volumeFilter !== 'All' ||
    genreFilter !== 'All' ||
    authorFilter !== 'All' ||
    yearFilter !== 'All' ||
    formatFilter !== 'All' ||
    purchasedFilter !== 'All' ||
    shelfFilter !== 'All' ||
    sortBy !== 'id'

  const suggestNextRead = () => {
    const unread = books.filter(
      b => b.status === 'Unread' || b.status === 'Wishlist'
    )
    if (unread.length > 0) {
      setViewingBook(unread[Math.floor(Math.random() * unread.length)])
    } else {
      toast('No unread books available!', 'info')
    }
  }

  const checkWishlistPrices = async () => {
    const wishlistBooks = books.filter(
      b => b.status === 'Wishlist' && b.amazonLink
    )
    if (wishlistBooks.length === 0) {
      toast('No Wishlist books with Amazon links found', 'info')
      return
    }

    toast(`Checking prices for ${wishlistBooks.length} books...`, 'info')
    setLoading(true)

    let updatedBooks = [...books]
    let updatedCount = 0

    for (const book of wishlistBooks) {
      try {
        const res = await fetch('/api/price-tracker', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: book.amazonLink })
        })
        const data = await res.json()
        if (data.price !== undefined && data.price !== null) {
          updatedBooks = updatedBooks.map(b =>
            b.id === book.id ? { ...b, purchasePrice: data.price } : b
          )
          updatedCount++
        }
      } catch (err) {
        console.error('Failed to fetch price for', book.title, err)
      }
    }

    if (updatedCount > 0) {
      setBooks(updatedBooks)
      saveBooks(updatedBooks)
      toast(`Updated prices for ${updatedCount} books`, 'success')
    } else {
      toast('No prices were updated', 'info')
    }

    setLoading(false)
  }

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    toast('Importing CSV...', 'info')
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async results => {
        try {
          const worksMap = new Map<string, BookWork>()
          const copies: BookCopy[] = []

          results.data.forEach((row: any) => {
            if (!row.Title) return // Skip invalid

            let isbn = row.ISBN13 || row.ISBN || ''
            isbn = isbn.replace(/^="(.+)"$/, '$1').trim()

            const grShelf = (row['Exclusive Shelf'] || '').toLowerCase()
            let status = 'Unread'
            if (grShelf === 'read') status = 'Read'
            if (grShelf === 'currently-reading') status = 'Reading'
            if (grShelf === 'to-read') status = 'Wishlist'

            const workId = `w_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
            const copyId = `c_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

            const work: BookWork = {
              id: workId,
              title: row.Title,
              author: row['Author l-f'] || row.Author || 'Unknown',
              genre: 'Uncategorized',
              hours: '0',
              recommendedBy: '',
              volume: '',
              photoUrl: '',
              summary: '',
              launchYear:
                row['Original Publication Year'] || row['Year Published'] || '',
              description: '',
              isbn: isbn,
              tags: [],
              collections: [],
              apiData: {},
              readingSpans: [],
              // New Goodreads fields
              goodreadsId: row['Book Id'] || null,
              authorLF: row['Author l-f'] || null,
              additionalAuthors: row['Additional Authors'] || null,
              publisher: row['Publisher'] || null,
              yearPublished: row['Year Published'] || null,
              originalPublicationYear: row['Original Publication Year'] || null,
              ownedCopies: parseInt(row['Owned Copies']) || null
            }
            worksMap.set(workId, work)

            const copy: BookCopy = {
              id: copyId,
              workId: workId,
              status: status,
              rating: parseInt(row['My Rating']) || undefined,
              format: row.Binding || 'Physical',
              totalPages: parseInt(row['Number of Pages']) || undefined,
              purchased: true,
              condition: 'Good',
              shelfLocation: '',
              purchasePrice: 0,
              investedAmount: 0,
              readingSessions: [],
              quotes: [],
              loans: [],
              // New Goodreads fields
              dateRead: row['Date Read'] || null,
              dateAdded: row['Date Added'] || null,
              bookshelves: row['Bookshelves'] || null,
              bookshelvesWithPositions:
                row['Bookshelves with positions'] || null,
              exclusiveShelf: row['Exclusive Shelf'] || null,
              myReview: row['My Review'] || null,
              spoiler: row['Spoiler'] || null,
              privateNotes: row['Private Notes'] || null,
              readCount: parseInt(row['Read Count']) || null
            }
            copies.push(copy)
          })

          const res = await importBooksAction(
            Array.from(worksMap.values()),
            copies
          )
          if (res.success) {
            toast('Import successful! Refreshing...', 'success')
            window.location.reload()
          } else {
            toast('Import failed', 'error')
          }
        } catch (error) {
          toast('Error importing CSV', 'error')
        }
      },
      error: () => {
        toast('Failed to parse CSV', 'error')
      }
    })

    // reset input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const exportLibrary = (format: 'json' | 'csv') => {
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(books, null, 2)], {
        type: 'application/json'
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `library-export-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast('Library exported as JSON', 'success')
    } else {
      const headers = [
        'id',
        'title',
        'author',
        'genre',
        'status',
        'format',
        'isbn',
        'launchYear',
        'purchasePrice',
        'rating',
        'pages',
        'summary'
      ]
      const rows = books.map(b =>
        headers
          .map(h => {
            const v = (b as unknown as Record<string, unknown>)[h]
            return typeof v === 'string'
              ? `"${v.replace(/"/g, '""')}"`
              : (v ?? '')
          })
          .join(',')
      )
      const csv = [headers.join(','), ...rows].join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `library-export-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast('Library exported as CSV', 'success')
    }
  }

  const currentlyReading = books.filter(b => b.status === 'Reading').slice(0, 3)

  // ── Theme tokens for this render ───────────────────────────────────────────
  const P = palette(isDark)
  const R = (d?: number, b?: number) => raised(NEUTRAL_RGB, isDark, d, b)
  const V = (d?: number, b?: number) => pressed(NEUTRAL_RGB, isDark, d, b)
  const chipStyle = (rgb: string): CSSProperties => ({
    background: isDark ? `rgba(${rgb},.2)` : `rgba(${rgb},.13)`,
    color: P.accent,
    boxShadow: chipShadow(isDark)
  })

  // Sidebar filter fields (data-driven)
  const authorOptions: Option[] = [
    ['All', 'All authors'],
    ...Array.from(
      new Map(books.map(b => [b.author.toLowerCase(), b.author])).values()
    )
      .sort()
      .map((a): Option => [a, a])
  ]
  const shelfOptions: Option[] = [
    ['All', 'Any location'],
    ...Array.from(
      new Set(
        books
          .map(b => b.shelfLocation)
          .filter(Boolean)
          .map(l => String(l).trim())
      )
    )
      .filter(l => l.length > 0)
      .sort()
      .map((l): Option => [l, l])
  ]
  const filterFields: {
    label: string
    value: string
    set: (v: string) => void
    options: Option[]
  }[] = [
    { label: 'Sort by', value: sortBy, set: (v: string) => setFilters({ sortBy: v }), options: sortOptions },
    {
      label: 'Collection',
      value: genreFilter,
      set: (v: string) => setFilters({ genreFilter: v }),
      options: genreOptions
    },
    {
      label: 'Volume',
      value: volumeFilter,
      set: (v: string) => setFilters({ volumeFilter: v }),
      options: volumeOptions
    },
    {
      label: 'Author',
      value: authorFilter,
      set: (v: string) => setFilters({ authorFilter: v }),
      options: authorOptions
    },
    {
      label: 'Era',
      value: yearFilter,
      set: (v: string) => setFilters({ yearFilter: v }),
      options: eraOptions
    },
    {
      label: 'Format',
      value: formatFilter,
      set: (v: string) => setFilters({ formatFilter: v }),
      options: formatOptions
    },
    {
      label: 'Physical location',
      value: shelfFilter,
      set: (v: string) => setFilters({ shelfFilter: v }),
      options: shelfOptions
    },
    {
      label: 'Ownership',
      value: purchasedFilter,
      set: (v: string) => setFilters({ purchasedFilter: v }),
      options: ownershipOptions
    }
  ]

  // ── BookCard grid renderer ─────────────────────────────────────────────────
  const renderBookCards = (booksToRender: Book[]) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6">
      {booksToRender.map(book => (
        <BookCard
          key={book.id}
          book={book}
          isDark={isDark}
          isBatchMode={isBatchMode}
          isSelected={selectedBooks.includes(book.id)}
          onSelect={() => handleBatchSelect(book.id)}
          onEdit={() => setEditingBook(book)}
          onView={() => setViewingBook(book)}
        />
      ))}
    </div>
  )

  const noResultsState = (
    <div className="flex flex-col items-center justify-center gap-5 mt-16 animate-fade-in">
      <div
        className="w-24 h-24 rounded-full flex items-center justify-center"
        style={{ background: P.panel, color: P.faint, boxShadow: R(8, 20) }}
      >
        <Icon d={paths.search} className="w-10 h-10" stroke={1.5} />
      </div>
      <div className="text-center">
        <p className="font-syne font-black text-lg" style={{ color: P.title }}>
          No books found
        </p>
        <p className="text-sm mt-1" style={{ color: P.faint }}>
          Try adjusting your filters
        </p>
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="mt-4 px-5 py-2 rounded-full text-sm font-bold transition-transform hover:scale-105 active:scale-95"
            style={clayFill('196,106,79', '#e38a71', '#c46a4f', 4)}
          >
            Reset all filters
          </button>
        )}
      </div>
    </div>
  )

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading && books.length === 0) {
    return (
      <div
        className="flex h-screen items-center justify-center transition-colors duration-300"
        style={{ background: P.canvas }}
      >
        <div className="flex flex-col items-center gap-6">
          <div
            className="w-20 h-20 rounded-[28px] overflow-hidden animate-bounce"
            style={{ boxShadow: R(10, 24) }}
          >
            <img
              src="/fav.jpg"
              alt="TaleTeacup"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="text-center">
            <p
              className="text-xl font-black font-syne tracking-tight"
              style={{ color: P.title }}
            >
              TaleTeacup
            </p>
            <p
              className="text-xs font-medium mt-0.5"
              style={{ color: P.faint }}
            >
              Loading your library…
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {loading && books.length > 0 && (
        <div className="fixed top-0 left-0 w-full h-1 z-[100] bg-transparent">
          <div className="h-full bg-secondary w-full origin-left animate-pulse shadow-[0_0_10px_#c46a4f]"></div>
        </div>
      )}
      <div
        className="relative h-screen flex overflow-hidden font-sans p-3 sm:p-4 lg:p-5 gap-4 lg:gap-6 transition-colors duration-300"
        style={{ background: P.canvas }}
      >
        {/* Ambient clay blobs */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div
            className="absolute -top-32 -left-24 w-[420px] h-[420px] rounded-full blur-3xl"
            style={{
              background: isDark
                ? 'rgba(196,106,79,.18)'
                : 'rgba(196,106,79,.20)'
            }}
          />
          <div
            className="absolute top-1/3 -right-32 w-[380px] h-[380px] rounded-full blur-3xl"
            style={{
              background: isDark
                ? 'rgba(244,114,182,.10)'
                : 'rgba(251,182,206,.45)'
            }}
          />
          <div
            className="absolute -bottom-32 left-1/3 w-[420px] h-[420px] rounded-full blur-3xl"
            style={{
              background: isDark
                ? 'rgba(16,185,129,.10)'
                : 'rgba(110,231,183,.35)'
            }}
          />
        </div>

        {/* ─── Desktop Sidebar ─────────────────────────────────────── */}
        <aside
          className="hidden lg:flex z-20 w-64 xl:w-72 h-[calc(100vh-40px)] sticky top-0 flex-col shrink-0 overflow-hidden rounded-[36px] transition-colors duration-300"
          style={{ background: P.panel, boxShadow: R(10, 28) }}
        >
          {/* Fixed top: logo, search, status */}
          <div className="p-4 pb-3 flex flex-col gap-4 shrink-0">
            <div
              className="rounded-[26px] p-2"
              style={{ background: P.panel, boxShadow: R(5, 14) }}
            >
              <img
                src="/final.png"
                alt="TaleTeacup Logo"
                className="w-full aspect-video object-contain rounded-2xl"
              />
            </div>

            {/* Search */}
            <div className="relative">
              <span
                className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: P.faint }}
              >
                <Icon d={paths.search} className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Search books…"
                value={search}
                onChange={e => setFilters({ search: e.target.value })}
                className="w-full rounded-full py-3 pl-11 pr-10 text-[13px] font-semibold focus:outline-none focus:ring-2 focus:ring-secondary/40 placeholder:text-slate-400"
                style={{
                  background: P.well,
                  color: P.title,
                  boxShadow: V(4, 9)
                }}
              />
              {search && (
                <button
                  onClick={() => setFilters({ search: '' })}
                  aria-label="Clear search"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 hover:scale-110 transition-transform"
                  style={{ color: P.faint }}
                >
                  <Icon d={paths.close} className="w-3.5 h-3.5" stroke={2.5} />
                </button>
              )}
            </div>

            {/* Status chips */}
            <div className="flex flex-col gap-2">
              <span
                className="text-[11px] font-bold pl-1"
                style={{ color: P.faint }}
              >
                Status
              </span>
              <div className="grid grid-cols-2 gap-2">
                {statusList.map(s => {
                  const st = statusTheme[s]
                  const on = statusFilter === s
                  return (
                    <button
                      key={s}
                      onClick={() => setFilters({ statusFilter: s })}
                      className={`py-2 rounded-full text-[12px] font-bold transition-all duration-200 active:scale-95 ${s === 'All' ? 'col-span-2' : ''}`}
                      style={
                        on
                          ? clayFill(st.rgb, st.from, st.to, 3)
                          : {
                              background: P.panel,
                              color: P.body,
                              boxShadow: R(3, 8)
                            }
                      }
                    >
                      {s}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Scrollable filters */}
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4 pt-2 pb-5 flex flex-col gap-3.5">
            {filterFields.map(f => (
              <ClaySelect
                key={f.label}
                label={f.label}
                value={f.value}
                onChange={f.set}
                options={f.options}
                dark={isDark}
              />
            ))}

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="w-full py-2.5 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 transition-transform hover:scale-[1.02] active:scale-95"
                style={{
                  background: P.well,
                  color: P.body,
                  boxShadow: V(3, 7)
                }}
              >
                <Icon d={paths.close} className="w-3 h-3" stroke={2.5} />
                Reset filters
              </button>
            )}

            {currentlyReading.length > 0 && (
              <div className="mt-2 flex flex-col gap-3">
                <span
                  className="flex items-center gap-2 text-[11px] font-bold pl-1"
                  style={{ color: P.accent }}
                >
                  <span
                    className="w-2 h-2 rounded-full animate-pulse"
                    style={{
                      background: 'linear-gradient(145deg,#e38a71,#c46a4f)'
                    }}
                  />
                  Reading now
                </span>
                {currentlyReading.map(b => {
                  const pct =
                    b.currentPage && b.totalPages
                      ? Math.min(
                          99,
                          Math.round((b.currentPage / b.totalPages) * 100)
                        )
                      : null
                  return (
                    <div
                      key={b.id}
                      onClick={() => setViewingBook(b)}
                      className="flex items-center gap-3 p-2.5 rounded-[22px] cursor-pointer transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
                      style={{ background: P.panel, boxShadow: R(5, 14) }}
                    >
                      {b.coverFile || b.photoUrl ? (
                        <img
                          src={b.coverFile || b.photoUrl}
                          alt={b.title}
                          className="w-9 h-[52px] object-cover rounded-lg shrink-0"
                          style={{ boxShadow: '3px 5px 10px rgba(0,0,0,.28)' }}
                        />
                      ) : (
                        <div
                          className="w-9 h-[52px] rounded-lg shrink-0 flex items-center justify-center text-[9px] font-bold"
                          style={{
                            background: P.well,
                            color: P.faint,
                            boxShadow: V(2, 4)
                          }}
                        >
                          #{String(b.id).replace('c_', '')}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-xs font-bold truncate"
                          style={{ color: P.title }}
                        >
                          {b.title}
                        </p>
                        <p
                          className="text-[10px] truncate mt-0.5"
                          style={{ color: P.faint }}
                        >
                          {b.author}
                        </p>
                        {pct !== null && (
                          <div
                            className="mt-1.5 h-2 rounded-full p-[2px]"
                            style={{ background: P.well, boxShadow: V(1, 3) }}
                          >
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.max(pct, 8)}%`,
                                background:
                                  'linear-gradient(90deg,#e38a71,#c46a4f)'
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </aside>

        {/* ─── Main Area ───────────────────────────────────────────── */}
        <main
          className="relative z-10 flex-1 flex flex-col h-[calc(100vh-24px)] sm:h-[calc(100vh-32px)] lg:h-[calc(100vh-40px)] overflow-hidden min-w-0 rounded-[30px] sm:rounded-[36px] transition-colors duration-300"
          style={{ background: P.panel, boxShadow: R(10, 28) }}
        >
          {/* ─ Header ─ */}
          <header className="shrink-0 px-5 sm:px-6 lg:px-7 pt-5 pb-4 z-50 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="lg:hidden">
                <ClayButton
                  dark={isDark}
                  title="Open filters"
                  onClick={() => setMobileFilterOpen(true)}
                >
                  <Icon d={paths.filter} />
                </ClayButton>
              </div>
              <div className="lg:hidden flex items-center gap-2">
                <div
                  className="w-9 h-9 rounded-2xl flex items-center justify-center"
                  style={clayFill('196,106,79', '#e38a71', '#c46a4f', 3)}
                >
                  <Icon d={paths.book} />
                </div>
                <span
                  className="font-syne font-black text-sm"
                  style={{ color: P.title }}
                >
                  For Us
                </span>
              </div>
              <div className="hidden lg:flex items-center gap-3">
                <h2
                  className="text-[26px] font-syne font-black tracking-tight leading-none"
                  style={{ color: P.title }}
                >
                  My Library
                </h2>
                <span
                  className="hidden xl:inline-block text-[11px] font-bold px-3 py-1.5 rounded-full tabular-nums"
                  style={{
                    background: P.well,
                    color: P.body,
                    boxShadow: V(2, 5)
                  }}
                >
                  {totalCount} books curated
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="hidden sm:block min-w-0">
                <DashboardStats books={books} />
              </div>

              {/* Export / import menu */}
              <div className="relative" ref={exportMenuRef}>
                <ClayButton
                  dark={isDark}
                  title="Export and import"
                  onClick={() => setExportMenuOpen(o => !o)}
                >
                  <Icon d={paths.download} />
                </ClayButton>
                {exportMenuOpen && (
                  <div className="absolute right-0 top-full pt-2 z-[999] animate-scale-in origin-top-right">
                    <div
                      className="rounded-[22px] p-1.5 min-w-[210px] flex flex-col gap-0.5"
                      style={{ background: P.panel, boxShadow: R(10, 28) }}
                    >
                      <p
                        className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest"
                        style={{ color: P.faint }}
                      >
                        Export &amp; Import
                      </p>
                      {[
                        {
                          icon: '↓',
                          label: 'Export JSON',
                          run: () => {
                            exportLibrary('json')
                            setExportMenuOpen(false)
                          }
                        },
                        {
                          icon: '↓',
                          label: 'Export CSV',
                          run: () => {
                            exportLibrary('csv')
                            setExportMenuOpen(false)
                          }
                        },
                        {
                          icon: '↑',
                          label: 'Import Goodreads CSV',
                          run: () => {
                            fileInputRef.current?.click()
                            setExportMenuOpen(false)
                          }
                        }
                      ].map(item => (
                        <button
                          key={item.label}
                          onClick={item.run}
                          className="px-4 py-2.5 rounded-[16px] text-xs font-semibold text-left transition-all hover:scale-[1.01] active:scale-[0.98] flex items-center gap-3"
                          style={{ color: P.body }}
                        >
                          <span
                            className="w-6 h-6 rounded-lg flex items-center justify-center text-xs shrink-0"
                            style={{ background: P.well, color: P.accent }}
                          >
                            {item.icon}
                          </span>
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={suggestNextRead}
                title="Suggest next read"
                className="h-10 px-3 sm:px-4 shrink-0 rounded-2xl flex items-center gap-2 text-xs font-bold transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
                style={clayFill('196,106,79', '#e38a71', '#c46a4f', 4)}
              >
                <Icon d={paths.sparkles} className="w-4 h-4" />
                <span className="hidden sm:inline">Read next</span>
              </button>

              <ClayButton
                dark={isDark}
                title="Toggle theme"
                onClick={toggleTheme}
              >
                <Icon d={isDark ? paths.sun : paths.moon} />
              </ClayButton>
              <SignOutButton />
            </div>
          </header>

          {/* ─ View mode tabs + batch controls ─ */}
          <div className="shrink-0 px-5 sm:px-6 lg:px-7 pb-4 z-10 flex items-center justify-between gap-3">
            <div
              className="flex p-1.5 rounded-[22px] items-center overflow-x-auto hide-scrollbar gap-1 flex-1 min-w-0"
              style={{ background: P.well, boxShadow: V(4, 10) }}
            >
              {viewModes.map(({ id, label }) => {
                const on = viewMode === id
                return (
                  <button
                    key={id}
                    onClick={() => {
                      // Reset filters when switching to/from special views
                      const specialViews: ViewMode[] = [
                        'analytics',
                        'loans',
                        'wishlist'
                      ]
                      if (
                        specialViews.includes(id as ViewMode) ||
                        specialViews.includes(viewMode as ViewMode)
                      ) {
                        setFilters(null)
                      }
                      setViewMode(id)
                    }}
                    className={`px-4 py-2 rounded-2xl text-[12px] font-bold transition-all duration-200 whitespace-nowrap shrink-0 ${on ? '' : 'opacity-75 hover:opacity-100'}`}
                    style={
                      on
                        ? {
                            background: P.panel,
                            color: P.accent,
                            boxShadow: R(3, 8)
                          }
                        : { color: P.body }
                    }
                  >
                    {label}
                  </button>
                )
              })}
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span
                className="hidden sm:inline-block text-[11px] font-bold px-3 py-1.5 rounded-full tabular-nums"
                style={{
                  background: P.well,
                  color: P.body,
                  boxShadow: V(2, 5)
                }}
              >
                {books.length}
                {books.length !== totalCount && (
                  <span style={{ color: P.faint }}> / {totalCount}</span>
                )}
              </span>
              <ClayButton
                dark={isDark}
                title="Batch select"
                active={isBatchMode}
                onClick={() => {
                  setIsBatchMode(!isBatchMode)
                  setSelectedBooks([])
                }}
              >
                <Icon d={paths.batch} />
              </ClayButton>
            </div>
          </div>

          {/* ─ Content area ─ */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-5 sm:px-6 lg:px-7 pt-3 pb-28 z-10 relative">
            {viewMode === 'analytics' && <AnalyticsDashboard books={books} />}
            {viewMode === 'loans' && (
              <LoanTracker books={books} onEdit={setEditingBook} />
            )}

            {viewMode === 'wishlist' && (
              <div className="flex flex-col gap-6">
                <div className="flex justify-between items-center">
                  <h2
                    className="font-syne font-black text-xl"
                    style={{ color: P.title }}
                  >
                    Wishlist
                  </h2>
                  <button
                    onClick={checkWishlistPrices}
                    className="px-5 py-2.5 rounded-full text-sm font-bold transition-transform hover:scale-105 active:scale-95"
                    style={clayFill(
                      statusTheme.Read.rgb,
                      statusTheme.Read.from,
                      statusTheme.Read.to,
                      4
                    )}
                  >
                    Check prices
                  </button>
                </div>
                {books.filter(b => b.status === 'Wishlist').length === 0 ? (
                  <div
                    className="py-20 text-center text-sm"
                    style={{ color: P.faint }}
                  >
                    Your wishlist is empty. Add a book and set its status to
                    Wishlist.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
                    {books
                      .filter(b => b.status === 'Wishlist')
                      .map(b => (
                        <BookCard
                          key={b.id}
                          book={b}
                          isDark={isDark}
                          onEdit={() => setEditingBook(b)}
                          onView={() => setViewingBook(b)}
                        />
                      ))}
                  </div>
                )}
              </div>
            )}

            {viewMode === 'grid' && (
              <>
                {books.length === 0 ? noResultsState : renderBookCards(books)}
              </>
            )}

            {viewMode === 'list' && (
              <div className="flex flex-col gap-4">
                {books.length === 0 && noResultsState}
                {books.map((book, i) => (
                  <BookListCard
                    key={book.id}
                    book={book}
                    onEdit={() => setEditingBook(book)}
                    onView={() => setViewingBook(book)}
                    isDark={isDark}
                  />
                ))}
              </div>
            )}

            {viewMode === 'alphabetic' &&
              (() => {
                const alphaMap = new Map<string, Book[]>()
                books.forEach(b => {
                  const letter = /[A-Z]/i.test(b.title.charAt(0))
                    ? b.title.charAt(0).toUpperCase()
                    : '#'
                  if (!alphaMap.has(letter)) alphaMap.set(letter, [])
                  alphaMap.get(letter)!.push(b)
                })
                const letters = Array.from(alphaMap.keys()).sort()
                if (letters.length === 0) return noResultsState
                return (
                  <div className="flex flex-col gap-10">
                    {letters.map(letter => (
                      <div key={letter} className="flex flex-col gap-5">
                        <SectionHeader
                          title={letter}
                          count={alphaMap.get(letter)!.length}
                          dark={isDark}
                          tile
                        />
                        {renderBookCards(alphaMap.get(letter)!)}
                      </div>
                    ))}
                  </div>
                )
              })()}

            {viewMode === 'collections' &&
              (() => {
                const colMap = new Map<string, Book[]>()
                books.forEach(b => {
                  if (!colMap.has(b.genre)) colMap.set(b.genre, [])
                  colMap.get(b.genre)!.push(b)
                })
                const cols = Array.from(colMap.keys()).sort()
                if (cols.length === 0) return noResultsState
                return (
                  <div className="flex flex-col gap-10">
                    {cols.map(col => (
                      <div key={col} className="flex flex-col gap-5">
                        <SectionHeader
                          title={genreName[col] || col}
                          count={colMap.get(col)!.length}
                          dark={isDark}
                        />
                        {renderBookCards(colMap.get(col)!)}
                      </div>
                    ))}
                  </div>
                )
              })()}

            {viewMode === 'volumes' &&
              (() => {
                const volMap = new Map<string, Book[]>()
                books.forEach(b => {
                  const vol = b.volume || 'Uncategorized'
                  if (!volMap.has(vol)) volMap.set(vol, [])
                  volMap.get(vol)!.push(b)
                })
                const vols = Array.from(volMap.keys()).sort((a, b) => {
                  const nA = parseInt(a.replace(/\D/g, '')) || 999
                  const nB = parseInt(b.replace(/\D/g, '')) || 999
                  return nA - nB
                })
                if (vols.length === 0) return noResultsState
                return (
                  <div className="flex flex-col gap-10">
                    {vols.map(vol => (
                      <div key={vol} className="flex flex-col gap-5">
                        <SectionHeader
                          title={vol}
                          count={volMap.get(vol)!.length}
                          dark={isDark}
                        />
                        {renderBookCards(volMap.get(vol)!)}
                      </div>
                    ))}
                  </div>
                )
              })()}

            {viewMode === 'authors' &&
              (() => {
                const authMap = new Map<string, Book[]>()
                books.forEach(b => {
                  if (!authMap.has(b.author)) authMap.set(b.author, [])
                  authMap.get(b.author)!.push(b)
                })
                const authors = Array.from(authMap.keys()).sort()
                if (authors.length === 0) return noResultsState
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
                    {authors.map((author, i) => {
                      const authorBooks = authMap.get(author)!
                      return (
                        <div
                          key={author}
                          className="rounded-[30px] p-5 flex flex-col gap-4 animate-slide-up"
                          style={{
                            background: P.panel,
                            boxShadow: R(8, 22),
                            animationDelay: `${i * 30}ms`
                          }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h3
                              className="font-syne font-black leading-tight text-sm"
                              style={{ color: P.title }}
                            >
                              {author}
                            </h3>
                            <span
                              className="shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full"
                              style={chipStyle('196,106,79')}
                            >
                              {authorBooks.length} book
                              {authorBooks.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <div
                            className="grid grid-cols-4 gap-2 p-2 rounded-[20px]"
                            style={{ background: P.well, boxShadow: V(3, 8) }}
                          >
                            {authorBooks.slice(0, 4).map(b => (
                              <div
                                key={b.id}
                                onClick={() => setViewingBook(b)}
                                className="aspect-[2/3] rounded-lg overflow-hidden cursor-pointer transition-transform hover:scale-105 hover:-rotate-2"
                                style={{
                                  background: P.panel,
                                  boxShadow: '3px 5px 10px rgba(0,0,0,.25)'
                                }}
                              >
                                {b.coverFile || b.photoUrl ? (
                                  <img
                                    src={b.coverFile || b.photoUrl}
                                    alt={b.title}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div
                                    className="w-full h-full flex items-center justify-center text-[8px] font-bold"
                                    style={{ color: P.faint }}
                                  >
                                    #{String(b.id).replace('c_', '')}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                          {authorBooks.length > 4 && (
                            <p
                              className="text-xs text-center font-semibold"
                              style={{ color: P.faint }}
                            >
                              +{authorBooks.length - 4} more
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })()}

            {/* Scroll observer target */}
            {hasMore && (
              <div
                ref={observerTarget}
                className="h-16 w-full flex items-center justify-center mt-4"
              >
                {loading && (
                  <svg
                    className="animate-spin h-6 w-6"
                    style={{ color: P.faint }}
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                )}
              </div>
            )}
          </div>

          {/* ─ FAB: Add Book ─ */}
          <button
            onClick={handleAddBook}
            className="absolute bottom-6 right-6 w-16 h-16 rounded-full z-30 flex items-center justify-center group animate-float hover:animate-none hover:scale-110 active:scale-95 transition-transform"
            style={clayFill('196,106,79', '#e38a71', '#c46a4f', 6)}
            title="Add new book"
            aria-label="Add new book"
          >
            <Icon
              d={paths.plus}
              className="w-7 h-7 group-hover:rotate-90 transition-transform duration-300"
              stroke={2.5}
            />
          </button>

          {/* ─ Batch action bar ─ */}
          {isBatchMode && selectedBooks.length > 0 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 animate-slide-up">
              <div
                className="text-white pl-6 pr-4 py-3 rounded-[28px] flex items-center gap-3 sm:gap-4"
                style={{
                  background: 'linear-gradient(145deg,#3b4266,#1f2440)',
                  boxShadow:
                    '8px 12px 28px rgba(20,24,50,.5), inset 2px 2px 4px rgba(255,255,255,.14), inset -2px -3px 6px rgba(0,0,0,.35)'
                }}
              >
                <span className="text-[13px] font-black tabular-nums whitespace-nowrap">
                  {selectedBooks.length} selected
                </span>
                <button
                  onClick={handleBatchMarkRead}
                  className="text-[12px] font-bold px-4 py-2 rounded-full transition-transform hover:scale-105 active:scale-95"
                  style={clayFill(
                    statusTheme.Read.rgb,
                    statusTheme.Read.from,
                    statusTheme.Read.to,
                    3
                  )}
                >
                  Mark read
                </button>
                <button
                  onClick={handleBatchDelete}
                  className="text-[12px] font-bold px-4 py-2 rounded-full transition-transform hover:scale-105 active:scale-95"
                  style={clayFill('244,63,94', '#fb7185', '#f43f5e', 3)}
                >
                  Delete
                </button>
                <button
                  onClick={() => {
                    setIsBatchMode(false)
                    setSelectedBooks([])
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-colors"
                  aria-label="Cancel"
                >
                  <Icon d={paths.close} className="w-4 h-4" stroke={2.5} />
                </button>
              </div>
            </div>
          )}
        </main>

        {/* ─── Mobile: iOS Filter Bottom Sheet ────────────────────── */}
        <MobileFilterSheet
          open={mobileFilterOpen}
          onClose={() => setMobileFilterOpen(false)}
          search={search}
          onSearchChange={(v: string) => setFilters({ search: v })}
          statusFilter={statusFilter}
          onStatusChange={(v: string) => setFilters({ statusFilter: v })}
          sortBy={sortBy}
          onSortByChange={(v: string) => setFilters({ sortBy: v })}
          genreFilter={genreFilter}
          onGenreChange={(v: string) => setFilters({ genreFilter: v })}
          volumeFilter={volumeFilter}
          onVolumeChange={(v: string) => setFilters({ volumeFilter: v })}
          authorFilter={authorFilter}
          onAuthorChange={(v: string) => setFilters({ authorFilter: v })}
          yearFilter={yearFilter}
          onYearChange={(v: string) => setFilters({ yearFilter: v })}
          formatFilter={formatFilter}
          onFormatChange={(v: string) => setFilters({ formatFilter: v })}
          purchasedFilter={purchasedFilter}
          onPurchasedChange={(v: string) => setFilters({ purchasedFilter: v })}
          books={books}
          onReset={resetFilters}
        />

        {/* Hidden Goodreads CSV input */}
        <input
          type="file"
          accept=".csv"
          ref={fileInputRef}
          className="hidden"
          onChange={handleImportCSV}
        />

        {/* ─── Modals ──────────────────────────────────────────────── */}
        {isAddingBook && (
          <AddBookModal
            onClose={() => setIsAddingBook(false)}
            onAddManually={handleManualAdd}
            onSelect={handleSelectSearchedBook}
          />
        )}
        {editingBook && (
          <EditModal
            book={editingBook}
            onClose={() => setEditingBook(null)}
            onSave={handleSaveBook}
          />
        )}
        {viewingBook && (
          <BookViewModal
            book={viewingBook}
            isDark={isDark}
            onClose={() => setViewingBook(null)}
            onEdit={() => {
              setViewingBook(null)
              setTimeout(() => setEditingBook(viewingBook), 60)
            }}
            onReadPdf={() => {
              setViewingBook(null)
              setTimeout(() => setReadingPdfBook(viewingBook), 60)
            }}
          />
        )}
        {readingPdfBook && readingPdfBook.pdfPath && (
          <>
            {readingPdfBook.pdfPath.endsWith('.epub') ? (
              <EpubReaderModal
                epubUrl={readingPdfBook.pdfPath}
                initialLocation={readingPdfBook.currentPage || 0}
                onClose={sessionData => {
                  const newSession = {
                    date: new Date().toISOString().split('T')[0],
                    durationMinutes: sessionData.durationMinutes,
                    pagesRead: Math.max(0, sessionData.endPage - sessionData.startPage),
                    startPage: sessionData.startPage,
                    endPage: sessionData.endPage
                  }

                  const updatedBook = {
                    ...readingPdfBook,
                    currentPage: 1, // Store something safe, or ideally we'd update schema to support string locations
                    lastReadTimestamp: new Date().toISOString(),
                    readingSessions: [
                      ...(readingPdfBook.readingSessions || []),
                      newSession
                    ]
                  }

                  setBooks(prev => {
                    const newBooks = prev.map(b =>
                      b.id === readingPdfBook.id ? updatedBook : b
                    )
                    saveBooks(newBooks)
                    return newBooks
                  })
                  setReadingPdfBook(null)
                }}
              />
            ) : (
              <PdfReaderModal
                pdfUrl={readingPdfBook.pdfPath}
                initialPage={readingPdfBook.currentPage || 1}
                onClose={sessionData => {
                  // Update book with new session and reading progress
                  const newSession = {
                    date: new Date().toISOString().split('T')[0],
                    durationMinutes: sessionData.durationMinutes,
                    pagesRead: Math.max(
                      0,
                      sessionData.endPage - sessionData.startPage
                    ),
                    startPage: sessionData.startPage,
                    endPage: sessionData.endPage
                  }

                  const updatedBook = {
                    ...readingPdfBook,
                    currentPage: sessionData.endPage,
                    lastReadTimestamp: new Date().toISOString(),
                    readingSessions: [
                      ...(readingPdfBook.readingSessions || []),
                      newSession
                    ]
                  }

                  setBooks(prev => {
                    const newBooks = prev.map(b =>
                      b.id === readingPdfBook.id ? updatedBook : b
                    )
                    saveBooks(newBooks)
                    return newBooks
                  })
                  setReadingPdfBook(null)
                }}
              />
            )}
          </>
        )}

        {/* Global toast notifications */}
        <ToastProvider />
      </div>
    </>
  )
}
