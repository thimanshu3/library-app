'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import AddBookModal from './components/AddBookModal'
import AnalyticsDashboard from './components/AnalyticsDashboard'
import BookCard from './components/BookCard'
import BookViewModal from './components/BookViewModal'
import DashboardStats from './components/DashboardStats'
import EditModal from './components/EditModal'

import dynamic from 'next/dynamic'
import LoanTracker from './components/LoanTracker'
import MobileFilterSheet from './components/MobileFilterSheet'
import ToastProvider, { toast } from './components/Toast'

const PdfReaderModal = dynamic(() => import('./components/PdfReaderModal'), {
  ssr: false
})

import {
  Book,
  BookCopy,
  BookWork,
  LoanRecord,
  Quote,
  ReadingSession,
  ReadingSpan
} from './types'

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewMode =
  | 'grid'
  | 'alphabetic'
  | 'authors'
  | 'collections'
  | 'volumes'
  | 'list'
  | 'analytics'
  | 'loans'
  | 'wishlist'

const viewModes: { id: ViewMode; label: string }[] = [
  { id: 'analytics', label: 'Analytics' },
  { id: 'loans', label: 'Loans' },
  { id: 'wishlist', label: 'Wishlist' },
  { id: 'grid', label: 'Grid' },
  { id: 'alphabetic', label: 'A–Z' },
  { id: 'authors', label: 'Authors' },
  { id: 'collections', label: 'Collections' },
  { id: 'volumes', label: 'Volumes' },
  { id: 'list', label: 'List' }
]

const sidebarSelectClass = (dark: boolean) =>
  dark
    ? 'bg-white/[0.07] border border-white/[0.08] rounded-2xl p-3 text-sm focus:border-secondary/50 focus:outline-none focus:ring-2 focus:ring-secondary/15 appearance-none cursor-pointer text-white/70 w-full transition-all backdrop-blur-sm hover:border-white/[0.15]'
    : 'bg-[#fffdf8]/80 border border-slate-200/70 rounded-2xl p-3 text-sm focus:border-secondary/50 focus:outline-none focus:ring-2 focus:ring-secondary/15 appearance-none cursor-pointer text-slate-700 w-full transition-all backdrop-blur-sm hover:border-slate-300'

import Papa from 'papaparse'
import { fetchFilteredBooksAction, saveLibraryAction, importBooksAction } from './actions'

// ─── Main Component ────────────────────────────────────────────────────────────
export default function LibraryClient({
  initialWorks,
  initialCopies,
  initialTotalCount
}: {
  initialWorks: BookWork[]
  initialCopies: BookCopy[]
  initialTotalCount: number
}) {
  const [books, setBooks] = useState<Book[]>(() => {
    return initialCopies.map(copy => {
      const work = initialWorks.find(w => w.id === copy.workId)
      return {
        id: copy.id,
        workId: work?.id || '',
        title: work?.title || '',
        author: work?.author || '',
        genre: work?.genre || '',
        hours: work?.hours || '',
        recommendedBy: work?.recommendedBy || '',
        volume: work?.volume || '',
        photoUrl: work?.photoUrl || '',
        summary: work?.summary || '',
        description: work?.description || '',
        launchYear: work?.launchYear || '',
        originalLanguage: work?.originalLanguage || '',
        countryOfOrigin: work?.countryOfOrigin || '',
        authorDescription: work?.authorDescription || '',
        coverFile: work?.coverFile || '',
        isbn: work?.isbn || '',
        tags: (work?.tags as string[]) || [],
        collections: (work?.collections as string[]) || [],
        series:
          (work?.series as { name: string; number: number } | null) || null,
        apiData:
          (work?.apiData as { googleId?: string; openLibraryId?: string }) ||
          {},
        readingSpans: (work?.readingSpans as unknown as ReadingSpan[]) || [],

        format: copy.format || '',
        condition: copy.condition || '',
        shelfLocation: copy.shelfLocation || '',
        purchased: Boolean(copy.purchased),
        purchasePrice: copy.purchasePrice || 0,
        investedAmount: copy.investedAmount || 0,
        status: copy.status || '',
        pdfPath: copy.pdfPath || '',
        currentPage: copy.currentPage || 0,
        totalPages: copy.totalPages || 0,
        lastReadTimestamp: copy.lastReadTimestamp || '',
        readingSessions:
          (copy.readingSessions as unknown as ReadingSession[]) || [],
        rating: copy.rating || 0,
        quotes: (copy.quotes as unknown as Quote[]) || [],
        amazonLink: copy.amazonLink || '',
        loans: (copy.loans as unknown as LoanRecord[]) || [],

        givenTo:
          (copy.loans as unknown as LoanRecord[])?.[0]?.borrowerName || '',
        loanDate: (copy.loans as unknown as LoanRecord[])?.[0]?.dateLent || '',
        shelfRow: copy.shelfLocation || '',
        readingStartDate:
          (work?.readingSpans as unknown as ReadingSpan[])?.[0]?.startDate ||
          '',
        readingEndDate:
          (work?.readingSpans as unknown as ReadingSpan[])?.[0]?.endDate || ''
      }
    })
  })
  const [totalCount, setTotalCount] = useState(initialTotalCount)
  const [skip, setSkip] = useState(20)
  const [hasMore, setHasMore] = useState(initialCopies.length === 20)
  const [loading, setLoading] = useState(false)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [volumeFilter, setVolumeFilter] = useState('All')
  const [genreFilter, setGenreFilter] = useState('All')
  const [authorFilter, setAuthorFilter] = useState('All')
  const [yearFilter, setYearFilter] = useState('All')
  const [formatFilter, setFormatFilter] = useState('All')
  const [purchasedFilter, setPurchasedFilter] = useState('All')
  const [shelfFilter, setShelfFilter] = useState('All')
  const [sortBy, setSortBy] = useState('id')

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
            ownedCopies: book.ownedCopies,
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
          readCount: book.readCount,
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
      take: 20
    }).then(res => {
      if (!active) return
      if (res.books) {
        setBooks(res.books as Book[])
        setTotalCount(res.totalCount || 0)
        setSkip(20)
        setHasMore(res.books.length === 20)
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
    sortBy
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
      take: 20
    })
    if (res.books) {
      setBooks(prev => [...prev, ...(res.books as Book[])])
      setSkip(prev => prev + 20)
      setHasMore(res.books.length === 20)
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
    setEditingBook({
      id: '',
      workId: '',
      condition: 'Good',
      shelfLocation: '',
      title: 'New Book Title',
      author: 'Author Name',
      genre: 'FIC',
      hours: '0h',
      recommendedBy: '',
      volume: '',
      photoUrl: '',
      summary: '',
      description: '',
      authorDescription: '',
      isbn: '',
      launchYear: '',
      originalLanguage: 'English',
      countryOfOrigin: '',
      status: 'Unread',
      purchased: false,
      purchasePrice: 0,
      investedAmount: 0,
      format: 'None',
      givenTo: '',
      loanDate: '',
      shelfRow: '',
      totalPages: undefined,
      currentPage: undefined,
      readingSessions: [],
      tags: [],
      collections: [],
      apiData: {},
      readingSpans: [],
      loans: [],
      quotes: []
    })
  }

  const handleSelectSearchedBook = (bookData: Partial<Book>) => {
    setIsAddingBook(false)

    let workIdToUse = ''
    let prefilledData = { ...bookData }

    const duplicate = books.find(b => 
      (bookData.isbn && b.isbn === bookData.isbn) ||
      (b.title?.toLowerCase() === bookData.title?.toLowerCase() && b.author?.toLowerCase() === bookData.author?.toLowerCase())
    )

    if (duplicate) {
      const addAsCopy = window.confirm(`You already own a copy of "${duplicate.title}". Do you want to add this as another copy to the same Work record?`)
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
      id: (bookData.id || '') as string,
      workId: workIdToUse,
      condition: 'Good',
      shelfLocation: '',
      title: 'New Book Title',
      author: 'Author Name',
      genre: 'FIC',
      hours: '0h',
      recommendedBy: '',
      volume: '',
      photoUrl: '',
      summary: '',
      description: '',
      authorDescription: '',
      isbn: '',
      launchYear: '',
      originalLanguage: 'English',
      countryOfOrigin: '',
      status: 'Unread',
      purchased: false,
      purchasePrice: 0,
      investedAmount: 0,
      format: 'None',
      givenTo: '',
      loanDate: '',
      shelfRow: '',
      totalPages: undefined,
      currentPage: undefined,
      readingSessions: [],
      tags: [],
      collections: [],
      apiData: {},
      readingSpans: [],
      quotes: [],
      loans: [],
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
    setSearch('')
    setStatusFilter('All')
    setVolumeFilter('All')
    setGenreFilter('All')
    setAuthorFilter('All')
    setYearFilter('All')
    setFormatFilter('All')
    setPurchasedFilter('All')
    setShelfFilter('All')
    setSortBy('id')
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
    const unread = books.filter(b => b.status === 'Unread' || b.status === 'Wishlist')
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
      complete: async (results) => {
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
              launchYear: row['Original Publication Year'] || row['Year Published'] || '',
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
              ownedCopies: parseInt(row['Owned Copies']) || null,
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
              bookshelvesWithPositions: row['Bookshelves with positions'] || null,
              exclusiveShelf: row['Exclusive Shelf'] || null,
              myReview: row['My Review'] || null,
              spoiler: row['Spoiler'] || null,
              privateNotes: row['Private Notes'] || null,
              readCount: parseInt(row['Read Count']) || null,
            }
            copies.push(copy)
          })

          const res = await importBooksAction(Array.from(worksMap.values()), copies)
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

  // ── BookCard grid renderer ─────────────────────────────────────────────────
  const renderBookCards = (booksToRender: Book[]) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-5">
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
    <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-4 mt-16 animate-fade-in">
      <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
        <svg
          className="w-10 h-10 opacity-30"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      <div className="text-center">
        <p className="font-bold text-slate-600 dark:text-slate-400">
          No books found
        </p>
        <p className="text-sm text-slate-400 mt-1">
          Try adjusting your filters
        </p>
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="mt-3 text-sm font-bold text-accent hover:text-accent-dim transition-colors"
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
        className={`flex h-screen items-center justify-center transition-colors duration-300 ${isDark ? 'bg-[#0e1018]' : 'bg-[#f0ede4]'}`}
      >
        <div className="flex flex-col items-center gap-6">
          <div className="relative w-16 h-16 flex items-center justify-center animate-bounce">
            <div className="w-16 h-16 flex items-center justify-center z-10 relative drop-shadow-xl rounded-2xl overflow-hidden">
              <img
                src="/fav.jpg"
                alt="TaleTeacup"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div className="text-center">
            <p
              className={`text-xl font-black font-syne tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}
            >
              TaleTeacup
            </p>
            <p className="text-xs font-medium text-slate-400 mt-0.5">
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
          <div className="h-full bg-secondary w-full origin-left animate-pulse shadow-[0_0_10px_#f97316]"></div>
        </div>
      )}
      <div
        className={`h-screen text-slate-900 flex overflow-hidden font-sans p-3 sm:p-4 lg:p-5 gap-4 transition-colors duration-300 ${isDark ? 'bg-[#0e1018]' : 'bg-[#f0ede4]'}`}
      >
        {/* ─── Desktop Sidebar ─────────────────────────────────────── */}
        <aside
          className="hidden lg:flex w-56 xl:w-60 h-[calc(100vh-40px)] sticky top-0 flex-col gap-0 z-20 shrink-0 overflow-hidden rounded-[28px] border transition-all duration-300"
          style={
            isDark
              ? {
                  background: 'rgba(22,25,36,0.92)',
                  backdropFilter: 'blur(32px) saturate(180%)',
                  boxShadow:
                    '0 2px 8px -2px rgba(0,0,0,0.3), 0 16px 48px -12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
                  borderColor: 'rgba(255,255,255,0.07)'
                }
              : {
                  background: 'rgba(255,253,248,0.88)',
                  backdropFilter: 'blur(32px) saturate(200%) brightness(1.05)',
                  boxShadow:
                    '0 2px 8px -2px rgba(30,35,48,0.05), 0 16px 48px -12px rgba(30,35,48,0.10), inset 0 1px 0 rgba(255,255,255,0.9)',
                  borderColor: 'rgba(255,255,255,0.7)'
                }
          }
        >
          {/* Fixed Header: Logo, Search, Status */}
          <div className="flex flex-col z-10">
            {/* Logo */}
            <div className="p-3">
              <div className="flex items-center justify-center w-full">
                <img
                  src="/final.png"
                  alt="TaleTeacup Logo"
                  className="w-full aspect-video object-contain drop-shadow-md rounded-xl"
                />
              </div>
            </div>

            {/* Search & Status */}
            <div className="flex flex-col gap-4 px-5 pb-4 border-b border-black/[0.04]">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search books…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className={`w-full border rounded-full py-2.5 pl-9 pr-9 text-[13px] focus:outline-none focus:border-secondary/40 focus:ring-2 focus:ring-secondary/12 transition-all backdrop-blur-sm shadow-inner ${isDark ? 'bg-white/[0.07] border-white/[0.08] text-white placeholder-white/30 shadow-white/[0.02]' : 'bg-white/60 border-black/[0.08] text-slate-800 placeholder-slate-400 shadow-black/[0.03]'}`}
                />
                <svg
                  className="w-3.5 h-3.5 absolute left-3.5 top-3 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.5"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>

              {/* Status pills */}
              <div className="flex flex-col gap-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.18em]">
                  Status
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {['All', 'Unread', 'Reading', 'Read', 'Wishlist'].map(s => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={`status-pill py-2 rounded-full text-[11px] font-black transition-all ${
                        statusFilter === s
                          ? s === 'Reading'
                            ? 'bg-secondary text-white shadow-lg shadow-secondary/30'
                            : s === 'Read'
                              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                              : s === 'Wishlist'
                                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                                : isDark
                                  ? 'bg-white text-slate-900 shadow-lg'
                                  : 'bg-[#171b2e] text-white shadow-lg shadow-[#171b2e]/30'
                          : isDark
                            ? 'bg-white/[0.07] border border-white/[0.09] text-white/50 hover:bg-white/[0.12]'
                            : 'bg-white/60 border border-black/[0.07] text-slate-500 hover:border-black/[0.14] hover:bg-white/80'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Scrollable Filters */}
            <div className="flex flex-col gap-4 px-5 py-4 flex-1 overflow-y-scroll min-h-0 ">
              {/* Sort */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.18em]">
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className={sidebarSelectClass(isDark)}
                >
                  <option value="id">Reading Order (#1–#300)</option>
                  <option value="title">Title A–Z</option>
                  <option value="year">Launch Year (Oldest First)</option>
                  <option value="price">Investment (Highest First)</option>
                </select>
              </div>

              {/* Genre */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.18em]">
                  Collection
                </label>
                <select
                  value={genreFilter}
                  onChange={e => setGenreFilter(e.target.value)}
                  className={sidebarSelectClass(isDark)}
                >
                  <option value="All">All Collections</option>
                  <option value="MIND">Mindset / Resilience</option>
                  <option value="PHIL">Philosophy</option>
                  <option value="PROD">Focus / Productivity</option>
                  <option value="PSY">Psychology</option>
                  <option value="FIN">Money</option>
                  <option value="POWER">Influence / Power</option>
                  <option value="THINK">Decision-Making</option>
                  <option value="STARTUP">Business</option>
                  <option value="HIST">History</option>
                  <option value="BIO">Biography / Memoir</option>
                  <option value="WAR">Military / Survival</option>
                  <option value="FIC">Fiction</option>
                  <option value="TECH">Tech / Future</option>
                  <option value="SCI">Science / Space</option>
                  <option value="SPIRIT">Purpose / Spirituality</option>
                  <option value="COMM">Communication</option>
                </select>
              </div>

              {/* Volume */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.18em]">
                  Volume
                </label>
                <select
                  value={volumeFilter}
                  onChange={e => setVolumeFilter(e.target.value)}
                  className={sidebarSelectClass(isDark)}
                >
                  <option value="All">All Volumes</option>
                  {Array.from({ length: 15 }, (_, i) => (
                    <option key={i + 1} value={`Volume ${i + 1}`}>
                      Volume {i + 1}
                    </option>
                  ))}
                </select>
              </div>

              {/* Author */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.18em]">
                  Author
                </label>
                <select
                  value={authorFilter}
                  onChange={e => setAuthorFilter(e.target.value)}
                  className={sidebarSelectClass(isDark)}
                >
                  <option value="All">All Authors</option>
                  {Array.from(
                    new Map(
                      books.map(b => [b.author.toLowerCase(), b.author])
                    ).values()
                  )
                    .sort()
                    .map(a => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                </select>
              </div>

              {/* Year */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.18em]">
                  Era
                </label>
                <select
                  value={yearFilter}
                  onChange={e => setYearFilter(e.target.value)}
                  className={sidebarSelectClass(isDark)}
                >
                  <option value="All">Any Year</option>
                  <option value="Pre-1900s">Pre-1900s</option>
                  <option value="1900-1950">1900 – 1950</option>
                  <option value="1950-2000">1950 – 2000</option>
                  <option value="2000s">2000s</option>
                  <option value="2010s">2010s</option>
                  <option value="2020s">2020s</option>
                </select>
              </div>

              {/* Format */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.18em]">
                  Format
                </label>
                <select
                  value={formatFilter}
                  onChange={e => setFormatFilter(e.target.value)}
                  className={sidebarSelectClass(isDark)}
                >
                  <option value="All">All Formats</option>
                  <option value="Physical">Physical</option>
                  <option value="PDF">PDF</option>
                  <option value="Audiobook">Audiobook</option>
                  <option value="None">None</option>
                </select>
              </div>

              {/* Shelf Location */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.18em]">
                  Physical Location
                </label>
                <select
                  value={shelfFilter}
                  onChange={e => setShelfFilter(e.target.value)}
                  className={sidebarSelectClass(isDark)}
                >
                  <option value="All">Any Location</option>
                  {Array.from(
                    new Set(
                      books
                        .map(b => b.shelfLocation)
                        .filter(Boolean)
                        .map(l => String(l).trim())
                    )
                  )
                    .filter(l => l.length > 0)
                    .sort()
                    .map(l => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                </select>
              </div>

              {/* Purchased */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.18em]">
                  Ownership
                </label>
                <select
                  value={purchasedFilter}
                  onChange={e => setPurchasedFilter(e.target.value)}
                  className={sidebarSelectClass(isDark)}
                >
                  <option value="All">All Ownership</option>
                  <option value="Purchased">Purchased (Owned)</option>
                  <option value="Not Purchased">Not Purchased</option>
                </select>
              </div>

              {/* Reset button */}
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="w-full py-2.5 rounded-full text-xs font-bold border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 hover:text-accent hover:border-accent-dim transition-colors"
                >
                  ✕ Reset Filters
                </button>
              )}

              {/* Currently reading */}
              {currentlyReading.length > 0 && (
                <div className="border-t border-slate-100 dark:border-slate-800/60 pt-5 mt-2">
                  <label className="text-[10px] font-bold text-accent dark:text-accent-dim uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-dim animate-pulse" />
                    Reading Now
                  </label>
                  <div className="flex flex-col gap-2 mt-3">
                    {currentlyReading.map(b => (
                      <div
                        key={b.id}
                        onClick={() => setViewingBook(b)}
                        className="flex items-center gap-3 bg-white dark:bg-slate-900/60 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800 cursor-pointer hover:border-accent-dim/50 transition-all group"
                      >
                        {b.coverFile || b.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={b.coverFile || b.photoUrl}
                            alt={b.title}
                            className="w-8 h-12 object-cover rounded-lg shadow-sm"
                          />
                        ) : (
                          <div className="w-8 h-12 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-[9px] font-bold text-slate-400">
                            #{String(b.id).replace('c_', '')}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate text-slate-800 dark:text-slate-200 group-hover:text-accent dark:group-hover:text-accent-dim transition-colors">
                            {b.title}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">
                            {b.author}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* ─── Main Area ───────────────────────────────────────────── */}
        <main
          className="flex-1 flex flex-col h-[calc(100vh-24px)] sm:h-[calc(100vh-32px)] lg:h-[calc(100vh-40px)] overflow-hidden min-w-0 relative rounded-[28px] border transition-all duration-300"
          style={
            isDark
              ? {
                  background: 'rgba(18,20,30,0.95)',
                  backdropFilter: 'blur(28px) saturate(150%)',
                  boxShadow:
                    '0 2px 8px -2px rgba(0,0,0,0.4), 0 16px 48px -12px rgba(0,0,0,0.5)',
                  borderColor: 'rgba(255,255,255,0.06)'
                }
              : {
                  background: 'rgba(255,253,248,0.88)',
                  backdropFilter: 'blur(28px) saturate(180%) brightness(1.04)',
                  boxShadow:
                    '0 2px 8px -2px rgba(30,35,48,0.05), 0 16px 48px -12px rgba(30,35,48,0.08), inset 0 1px 0 rgba(255,255,255,0.85)',
                  borderColor: 'rgba(255,255,255,0.7)'
                }
          }
        >
          {/* Ambient colour orbs */}
          <div
            className="absolute top-0 right-0 w-[500px] h-[400px] rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/4"
            style={{
              background:
                'radial-gradient(circle, rgba(229,115,115,0.08) 0%, transparent 70%)'
            }}
          />
          <div
            className="absolute bottom-0 left-0 w-[400px] h-[300px] rounded-full blur-[100px] pointer-events-none translate-y-1/2 -translate-x-1/4"
            style={{
              background:
                'radial-gradient(circle, rgba(124,92,252,0.06) 0%, transparent 70%)'
            }}
          />

          {/* ─ Header ─ */}
          <header className="shrink-0 px-5 sm:px-6 lg:px-7 py-4 z-10 flex items-center justify-between gap-4 border-b border-black/[0.05] bg-transparent">
            {/* Mobile: hamburger + logo */}
            <div className="flex items-center gap-3">
              <button
                className="lg:hidden w-9 h-9 rounded-2xl bg-white/70 border border-black/[0.07] flex items-center justify-center text-slate-500 hover:bg-white transition-all shadow-sm backdrop-blur-sm"
                onClick={() => setMobileFilterOpen(true)}
                aria-label="Open filters"
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
                    d="M3 4h18M6 8h12M9 12h6"
                  />
                </svg>
              </button>
              <div className="lg:hidden">
                <div className="flex items-center gap-2 text-accent">
                  <div className="w-7 h-7 rounded-xl bg-accent flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                      />
                    </svg>
                  </div>
                  <span className="text-sm font-black tracking-widest uppercase">
                    For Us
                  </span>
                </div>
              </div>
              <div className="hidden lg:block">
                <h2
                  className={`text-[22px] font-syne font-black tracking-tight leading-none ${isDark ? 'text-white' : 'text-slate-900'}`}
                >
                  My Library
                </h2>
                <p
                  className={`text-[11px] mt-1 hidden xl:block font-semibold ${isDark ? 'text-white/40' : 'text-slate-400'}`}
                >
                  {totalCount} books curated
                </p>
              </div>
            </div>

            {/* Right: stats + export + theme */}
            <div className="flex items-center gap-2.5">
              <div className="hidden sm:block">
                <DashboardStats books={books} />
              </div>
              {/* Export dropdown */}
              <div className="relative group">
                <button
                  className="w-9 h-9 shrink-0 rounded-2xl bg-white/70 border border-black/[0.07] flex items-center justify-center text-slate-500 hover:bg-white hover:border-black/[0.12] hover:scale-105 transition-all shadow-sm backdrop-blur-sm"
                  title="Export library"
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
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                </button>
                <div
                  className="absolute right-0 top-full mt-2 z-50 hidden group-hover:flex flex-col bg-[#fffdf8]/95 backdrop-blur-xl border border-black/[0.07] rounded-2xl shadow-xl overflow-hidden min-w-[140px]"
                  style={{
                    boxShadow:
                      '0 8px 32px -8px rgba(30,35,48,0.18), 0 2px 8px -2px rgba(30,35,48,0.08)'
                  }}
                >
                  <button
                    onClick={() => exportLibrary('json')}
                    className="px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-black/[0.04] text-left transition-colors flex items-center gap-2"
                  >
                    <span>📄</span> Export JSON
                  </button>
                  <button
                    onClick={() => exportLibrary('csv')}
                    className="px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-black/[0.04] text-left transition-colors flex items-center gap-2 border-t border-black/[0.05]"
                  >
                    <span>📊</span> Export CSV
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-black/[0.04] text-left transition-colors flex items-center gap-2 border-t border-black/[0.05]"
                  >
                    <span>📥</span> Import Goodreads CSV
                  </button>
                  <input 
                    type="file" 
                    accept=".csv" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleImportCSV} 
                  />
                </div>
              </div>
              <button
                onClick={suggestNextRead}
                className="px-3 py-1.5 h-9 shrink-0 rounded-2xl bg-white/70 border border-black/[0.07] flex items-center justify-center text-slate-600 font-bold text-xs hover:bg-white hover:border-black/[0.12] transition-all shadow-sm backdrop-blur-sm"
                title="Suggest Next Read"
              >
                🎲 Read Next
              </button>
              <button
                onClick={toggleTheme}
                className="w-9 h-9 shrink-0 rounded-2xl bg-white/70 border border-black/[0.07] flex items-center justify-center text-slate-500 hover:bg-white hover:border-black/[0.12] hover:scale-105 transition-all shadow-sm backdrop-blur-sm"
                title="Toggle theme"
              >
                {isDark ? (
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
                      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                ) : (
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
                      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                    />
                  </svg>
                )}
              </button>
            </div>
          </header>

          {/* ─ View mode tabs + batch controls ─ */}
          <div className="shrink-0 px-5 sm:px-6 lg:px-7 py-3 border-b border-black/[0.05] bg-transparent z-10 flex items-center justify-between gap-3">
            {/* Scrollable tab strip */}
            <div
              className={`flex p-1 rounded-2xl items-center overflow-x-auto hide-scrollbar gap-0.5 flex-1 min-w-0 border ${isDark ? 'bg-white/[0.05] border-white/[0.07]' : 'bg-black/[0.04] border-black/[0.06]'}`}
            >
              {viewModes.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setViewMode(id)}
                  className={`px-4 py-2 rounded-xl text-[11px] font-black tracking-wide transition-all whitespace-nowrap shrink-0 ${
                    viewMode === id
                      ? isDark
                        ? 'bg-white/[0.12] text-secondary shadow-sm'
                        : 'bg-white text-secondary shadow-sm shadow-black/[0.08]'
                      : isDark
                        ? 'text-white/40 hover:text-white/70 hover:bg-white/[0.07]'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-black text-slate-400 hidden sm:flex items-center gap-1 tabular-nums">
                {books.length}
                {books.length !== totalCount && (
                  <span className="text-slate-300 font-medium">
                    {' '}
                    / {totalCount}
                  </span>
                )}
              </span>
              <button
                onClick={() => {
                  setIsBatchMode(!isBatchMode)
                  setSelectedBooks([])
                }}
                title="Batch select"
                className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all ${
                  isBatchMode
                    ? 'bg-secondary text-white border-secondary shadow-lg shadow-secondary/25'
                    : isDark
                      ? 'bg-white/[0.07] border-white/[0.08] text-white/40 hover:text-secondary hover:border-secondary/30'
                      : 'bg-white/70 border-black/[0.07] text-slate-400 hover:text-secondary hover:border-secondary/30 backdrop-blur-sm'
                }`}
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
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* ─ Content area ─ */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-5 sm:px-6 lg:px-7 py-6 z-10 relative">
            {viewMode === 'analytics' && <AnalyticsDashboard books={books} />}
            {viewMode === 'loans' && (
              <LoanTracker books={books} onEdit={setEditingBook} />
            )}

            {viewMode === 'wishlist' && (
              <div className="flex flex-col gap-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                    Wishlist
                  </h2>
                  <button
                    onClick={checkWishlistPrices}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 transition-all"
                  >
                    Check Prices
                  </button>
                </div>
                {books.filter(b => b.status === 'Wishlist').length === 0 ? (
                  <div className="py-20 text-center text-slate-400">
                    Your wishlist is empty. Add a book and set its status to
                    Wishlist.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
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
              <div className="flex flex-col gap-2.5">
                {books.length === 0 && noResultsState}
                {books.map((book, i) => (
                  <div
                    key={book.id}
                    onClick={() => setViewingBook(book)}
                    className={`flex items-center gap-4 backdrop-blur-sm border p-4 rounded-2xl hover:border-secondary/20 hover:shadow-[0_4px_16px_-4px_rgba(30,35,48,0.10)] transition-all cursor-pointer group animate-slide-up ${
                      isDark
                        ? 'bg-white/[0.05] border-white/[0.07] shadow-none'
                        : 'bg-[#fffdf8]/80 border-black/[0.06] shadow-[0_1px_4px_-1px_rgba(30,35,48,0.06)]'
                    }`}
                    style={{ animationDelay: `${i * 15}ms` }}
                  >
                    <div className="w-10 h-14 shrink-0 bg-slate-100 rounded-xl overflow-hidden border border-black/[0.06] shadow-sm">
                      {book.coverFile || book.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={book.coverFile || book.photoUrl}
                          alt={book.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="w-full h-full flex items-center justify-center text-[9px] text-slate-400 font-black">
                          #{String(book.id).replace('c_', '')}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3
                        className={`font-syne font-black truncate group-hover:text-secondary transition-colors text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}
                      >
                        {book.title}
                      </h3>
                      <p
                        className={`text-[12px] font-semibold truncate mt-0.5 ${isDark ? 'text-white/40' : 'text-slate-500'}`}
                      >
                        {book.author}
                      </p>
                    </div>
                    <div className="hidden sm:flex flex-col items-end gap-1.5">
                      <span className="text-[9px] font-black uppercase tracking-[0.14em] px-2 py-0.5 bg-secondary/8 text-secondary rounded-full">
                        {book.genre}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {book.status}
                      </span>
                    </div>
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        setEditingBook(book)
                      }}
                      className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-xl bg-white border border-black/[0.07] flex items-center justify-center text-slate-400 hover:text-secondary transition-all shrink-0 shadow-sm"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                  </div>
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
                        <div className="flex items-center gap-4">
                          <h2 className="text-4xl font-black text-slate-200 dark:text-slate-800">
                            {letter}
                          </h2>
                          <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
                          <span className="text-xs font-bold text-slate-400">
                            {alphaMap.get(letter)!.length}
                          </span>
                        </div>
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
                        <div className="flex items-center gap-3">
                          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                            {col}
                          </h2>
                          <span className="px-2.5 py-0.5 bg-accent-container dark:bg-indigo-950 text-accent dark:text-accent-dim text-xs font-bold rounded-full">
                            {colMap.get(col)!.length}
                          </span>
                          <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
                        </div>
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
                        <div className="flex items-center gap-3">
                          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                            {vol}
                          </h2>
                          <span className="px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-full">
                            {volMap.get(vol)!.length}
                          </span>
                          <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
                        </div>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {authors.map((author, i) => {
                      const authorBooks = authMap.get(author)!
                      return (
                        <div
                          key={author}
                          className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-[24px] p-5 shadow-sm flex flex-col gap-4 hover:border-accent-dim/50 transition-all animate-slide-up"
                          style={{ animationDelay: `${i * 30}ms` }}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-bold text-slate-900 dark:text-white leading-tight text-sm mb-1">
                                {author}
                              </h3>
                              <span className="text-[10px] font-bold text-accent bg-accent-container dark:bg-indigo-950 px-2 py-0.5 rounded-full">
                                {authorBooks.length} book
                                {authorBooks.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                          <div className="grid grid-cols-4 gap-1.5">
                            {authorBooks.slice(0, 4).map(b => (
                              <div
                                key={b.id}
                                onClick={() => setViewingBook(b)}
                                className="aspect-[2/3] rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden cursor-pointer hover:ring-2 hover:ring-accent/50 transition-all border border-slate-200 dark:border-slate-700"
                              >
                                {b.coverFile || b.photoUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={b.coverFile || b.photoUrl}
                                    alt={b.title}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[8px] text-slate-400 font-bold">
                                    #{String(b.id).replace('c_', '')}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                          {authorBooks.length > 4 && (
                            <p className="text-xs text-slate-400 text-center font-medium">
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
                    className="animate-spin h-6 w-6 text-slate-400"
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
            className="absolute bottom-6 right-6 w-14 h-14 text-white rounded-full z-30 flex items-center justify-center group animate-float hover:animate-none hover:scale-110 active:scale-95 transition-transform"
            style={{
              background: 'linear-gradient(135deg, #1e2340 0%, #171b2e 100%)',
              boxShadow: 'var(--shadow-fab)'
            }}
            title="Add new book"
            aria-label="Add new book"
          >
            <svg
              className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>

          {/* ─ Batch action bar ─ */}
          {isBatchMode && selectedBooks.length > 0 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 animate-slide-up">
              <div
                className="text-white px-5 py-3.5 rounded-2xl flex items-center gap-4 backdrop-blur-xl"
                style={{
                  background: 'rgba(30,35,48,0.88)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  boxShadow:
                    '0 16px 48px -12px rgba(30,35,48,0.5), 0 4px 12px -4px rgba(30,35,48,0.25)'
                }}
              >
                <span className="text-[13px] font-black tabular-nums">
                  {selectedBooks.length} selected
                </span>
                <div className="w-px h-5 bg-white/15" />
                <button
                  onClick={handleBatchMarkRead}
                  className="text-[12px] font-black bg-emerald-500 text-white px-4 py-1.5 rounded-full hover:bg-emerald-400 transition-colors active:scale-95"
                >
                  Mark Read
                </button>
                <button
                  onClick={handleBatchDelete}
                  className="text-[12px] font-black bg-rose-500 text-white px-4 py-1.5 rounded-full hover:bg-rose-400 transition-colors active:scale-95"
                >
                  Delete
                </button>
                <button
                  onClick={() => {
                    setIsBatchMode(false)
                    setSelectedBooks([])
                  }}
                  className="text-white/40 hover:text-white transition-colors ml-1"
                  aria-label="Cancel"
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
                      strokeWidth="2.5"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
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
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          genreFilter={genreFilter}
          onGenreChange={setGenreFilter}
          volumeFilter={volumeFilter}
          onVolumeChange={setVolumeFilter}
          authorFilter={authorFilter}
          onAuthorChange={setAuthorFilter}
          yearFilter={yearFilter}
          onYearChange={setYearFilter}
          formatFilter={formatFilter}
          onFormatChange={setFormatFilter}
          purchasedFilter={purchasedFilter}
          onPurchasedChange={setPurchasedFilter}
          books={books}
          onReset={resetFilters}
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

        {/* Global toast notifications */}
        <ToastProvider />
      </div>
    </>
  )
}
