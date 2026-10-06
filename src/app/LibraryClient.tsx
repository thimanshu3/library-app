'use client'
import Image from 'next/image'
import BookCover from './components/BookCover'
import BookThumbnailButton from './components/BookThumbnailButton'

import type { CSSProperties } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import BookCard from './components/BookCard'
import DashboardStats from './components/DashboardStats'

import dynamic from 'next/dynamic'
import { deleteCopiesAction, markCopiesReadAction, saveBookAction } from './actions'
import { replayReading } from './hooks/use-reading-session'
import { useTheme, setTheme } from './hooks/use-theme'
import type { ViewMode } from './components/LibraryShared'
import { useLibrary, readApi } from './hooks/use-library'
import { localToday, attachmentType } from '@/lib/library-domain'
import {
  NEUTRAL_RGB,
  chipShadow,
  clayFill,
  palette,
  pressed,
  raised,
  statusTheme
} from './clay'
import MobileFilterSheet from './components/MobileFilterSheet'
import ToastProvider, { toast } from './components/Toast'
import SignOutButton from './components/SignOutButton'

const AddBookModal = dynamic(() => import('./components/AddBookModal'), { ssr: false })
const AnalyticsDashboard = dynamic(() => import('./components/AnalyticsDashboard'))
const BookViewModal = dynamic(() => import('./components/BookViewModal'), { ssr: false })
const EditModal = dynamic(() => import('./components/EditModal'), { ssr: false })
const LoanTracker = dynamic(() => import('./components/LoanTracker'))
const ImportLibraryModal = dynamic(() => import('./components/ImportLibraryModal'), { ssr: false })

const PdfReaderModal = dynamic(() => import('./components/PdfReaderModal'), {
  ssr: false
})
const EpubReaderModal = dynamic(() => import('./components/EpubReaderModal'), {
  ssr: false
})

import BookListCard from './components/BookList'
import type { Book } from './types'

// ─── Types & static config ────────────────────────────────────────────────────

import {
  Option,
  mergeOptions,
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
  SectionHeader,
} from './components/LibraryShared';
// ─── Main Component ────────────────────────────────────────────────────────────
export default function LibraryClient({ initialBooks, initialTotalCount, initialHasMore, initialNextCursor }: {
  initialBooks: Book[]; initialTotalCount: number; initialHasMore: boolean; initialNextCursor: string | null
}) {
  const { filters, setFilters, viewMode, setViewMode, books, allBooks, totalCount, hasMore, loading,
    overviewLoading, error: loadError, annualGoal, setAnnualGoal, refresh, refreshOverview, observerTarget, commit, getBook } = useLibrary({
    books: initialBooks, totalCount: initialTotalCount, hasMore: initialHasMore, nextCursor: initialNextCursor
  })
  const { search, statusFilter, volumeFilter, genreFilter, authorFilter, yearFilter, formatFilter, purchasedFilter, shelfFilter, sortBy } = filters
  const [mutating, setMutating] = useState(false)
  const mutationLock = useRef(false)
  const modalRequest = useRef(0)
  const [importFile, setImportFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isBatchMode, setIsBatchMode] = useState(false)
  const [selectedBooks, setSelectedBooks] = useState<string[]>([])

  const [isAddingBook, setIsAddingBook] = useState(false)
  const [editingBook, setEditingBook] = useState<Book | null>(null)
  const [viewingBook, setViewingBook] = useState<Book | null>(null)
  const [readingPdfBook, setReadingPdfBook] = useState<Book | null>(null)

  const isDark = useTheme()
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const exportMenuRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    const saved = (event: Event) => { const book = (event as CustomEvent<Book>).detail; commit(book); setViewingBook(previous => previous?.id === book.id ? book : previous) }
    const replay = () => { void replayReading() }
    window.addEventListener('reading-saved', saved)
    window.addEventListener('online', replay)
    replay()
    return () => { window.removeEventListener('reading-saved', saved); window.removeEventListener('online', replay) }
  }, [commit])

  const openImport = () => { fileInputRef.current?.click(); setExportMenuOpen(false) }
  const toggleTheme = () => setTheme(!isDark)

  async function handleSaveBook(updated: Book) {
    if (mutationLock.current) throw new Error('A save is already in progress.')
    mutationLock.current = true; setMutating(true)
    try {
      const result = await saveBookAction({ ...updated, ...(updated.id ? { readingSessions: [] } : {}) })
      if (result.error || !result.book) throw new Error(result.error || 'Unable to save this book.')
      commit(result.book)
      void refreshOverview()
      if (!updated.id) refresh()
      setEditingBook(null)
      toast(updated.id ? 'Changes saved' : 'Book added to library', 'success')
    } finally { mutationLock.current = false; setMutating(false) }
  }
  const openEdit = useCallback(async (book: Book) => {
    const token = ++modalRequest.current
    setViewingBook(null)
    try { const fresh = await getBook(book.id); if (modalRequest.current === token) setEditingBook(fresh) } catch (error) { toast(error instanceof Error ? error.message : 'Unable to open this book.', 'error') }
  }, [getBook])
  const openView = useCallback(async (book: Book) => {
    const token = ++modalRequest.current
    try { const fresh = await getBook(book.id); if (modalRequest.current === token) setViewingBook(fresh) } catch (error) { toast(error instanceof Error ? error.message : 'Unable to open this book.', 'error') }
  }, [getBook])
  const handleAddBook = () => setIsAddingBook(true)
  const handleManualAdd = () => { setIsAddingBook(false); setEditingBook(blankBook()) }
  async function handleSelectSearchedBook(bookData: Partial<Book>) {
    try {
      const library = allBooks.length || !overviewLoading ? allBooks : (await readApi<{ books: Book[] }>('/api/library/overview')).books
      const match = library.find(book => (bookData.isbn && book.isbn === bookData.isbn) ||
        (book.title.trim().toLowerCase() === bookData.title?.trim().toLowerCase() && book.author.trim().toLowerCase() === bookData.author?.trim().toLowerCase()))
      let prefill = { ...bookData }
      if (match && window.confirm(`This work is already in your library. Add another copy of "${match.title}"?`)) {
        const original = await getBook(match.id)
        const shared = ['workId','workRevision','title','author','genre','hours','recommendedBy','volume','photoUrl','summary','description','launchYear','originalLanguage','countryOfOrigin','authorDescription','coverFile','tags','collections','series','apiData'] as const
        prefill = { ...prefill, ...Object.fromEntries(shared.map(key => [key, original[key]])) }
      }
      setIsAddingBook(false)
      setEditingBook({ ...blankBook(), ...prefill, id: '', enrichmentKey: `${bookData.title}|${bookData.author}|${bookData.isbn || ''}` })
    } catch (error) { toast(error instanceof Error ? error.message : 'Unable to check duplicate books.', 'error') }
  }
  const handleBatchSelect = (id: string) => setSelectedBooks(previous => previous.includes(id) ? previous.filter(item => item !== id) : [...previous, id])
  async function handleBatchMarkRead() {
    if (mutationLock.current || !selectedBooks.length) return
    mutationLock.current = true; setMutating(true)
    let processed = 0; let changed = 0
    const remaining = [...selectedBooks]
    try {
      while (remaining.length) {
        const batch = remaining.slice(0, 100)
        const result = await markCopiesReadAction({ ids: batch, day: localToday() })
        if (!result.success) throw new Error(result.error)
        processed += result.processed; changed += result.changed
        remaining.splice(0, batch.length)
      }
      toast(`${processed} copies processed; ${changed} marked read`, 'success')
    } catch (error) { toast(`${processed} copies processed. ${error instanceof Error ? error.message : 'Please retry the remaining selection.'}`, 'error') }
    finally { setSelectedBooks(remaining); setIsBatchMode(remaining.length > 0); refresh(); void refreshOverview(); mutationLock.current = false; setMutating(false) }
  }
  async function handleBatchDelete() {
    if (mutationLock.current || !selectedBooks.length) return
    if (!window.confirm(`Delete ${selectedBooks.length} selected copies? Other copies and catalog details will be kept.`)) return
    mutationLock.current = true; setMutating(true)
    const remaining = [...selectedBooks]; let removed = 0
    try {
      while (remaining.length) {
        const batch = remaining.slice(0, 100)
        const result = await deleteCopiesAction(batch)
        if (!result.success) throw new Error(result.error)
        remaining.splice(0, batch.length); removed += batch.length
      }
      toast(`${removed} copies removed`, 'success')
    } catch (error) { toast(`${removed} copies removed. ${error instanceof Error ? error.message : 'Please retry the remaining selection.'}`, 'error') }
    finally { setSelectedBooks(remaining); setIsBatchMode(remaining.length > 0); refresh(); void refreshOverview(); mutationLock.current = false; setMutating(false) }
  }
  const resetFilters = () => { void setFilters(null) }
  const hasActiveFilters = search || [statusFilter,volumeFilter,genreFilter,authorFilter,yearFilter,formatFilter,purchasedFilter,shelfFilter].some(value => value !== 'All') || sortBy !== 'id'
  async function suggestNextRead() {
    const unread = allBooks.filter(book => book.status === 'Unread' && ['Purchased','Gifted'].includes(book.ownership || (book.purchased ? 'Purchased' : 'None')) && !book.loans.some(loan => !loan.dateReturned))
    if (unread.length) await openView(unread[Math.floor(Math.random() * unread.length)])
    else toast(overviewLoading ? 'Library totals are still loading.' : 'No available owned unread copies found.', 'info')
  }
  async function checkWishlistPrices() {
    if (mutating) return
    const wishlist = allBooks.filter(book => book.status === 'Wishlist' && book.amazonLink).sort((a, b) => (a.offerCheckedAt || '').localeCompare(b.offerCheckedAt || ''))
    if (!wishlist.length) { toast('No wishlist books with Amazon links found.', 'info'); return }
    setMutating(true)
    let updated = 0; let failed = 0
    try {
      for (const book of wishlist.slice(0, 10)) {
        const response = await fetch('/api/price-tracker', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: book.amazonLink, copyId: book.id }) })
        const result = await response.json()
        if (response.ok) updated++
        else { failed++; if (failed === 1) toast(result.error || 'Price lookup failed.', 'error') }
      }
      await refreshOverview(); refresh()
      toast(`${updated} offers checked${failed ? `; ${failed} unavailable` : ''}${wishlist.length > 10 ? '. First 10 checked; retry later for more.' : ''}`, updated ? 'success' : 'info')
    } catch { toast('Unable to complete price lookup. Acquisition costs were preserved.', 'error') }
    finally { setMutating(false) }
  }
  async function exportLibrary(format: 'json' | 'csv') {
    try {
      const response = await fetch(`/api/library/export?format=${format}`)
      if (!response.ok) { const result = await response.json(); throw new Error(result.error || 'Export failed.') }
      const url = URL.createObjectURL(await response.blob())
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = `library-${localToday()}.${format}`; anchor.click(); URL.revokeObjectURL(url)
      toast('Complete library exported', 'success')
    } catch (error) { toast(error instanceof Error ? error.message : 'Export failed.', 'error') }
  }
  function handleImportFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) setImportFile(file)
    event.target.value = ''
  }
  const currentlyReading = allBooks.filter(book => book.status === 'Reading').slice(0, 3)

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
      new Map(allBooks.map(b => [b.author.toLowerCase(), b.author])).values()
    )
      .sort()
      .map((a): Option => [a, a])
  ]
  const shelfOptions: Option[] = [
    ['All', 'Any location'],
    ...Array.from(
      new Set(
        allBooks
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
      options: mergeOptions(genreOptions, allBooks.map(book => book.genre))
    },
    {
      label: 'Volume',
      value: volumeFilter,
      set: (v: string) => setFilters({ volumeFilter: v }),
      options: mergeOptions(volumeOptions, allBooks.map(book => book.volume))
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
          onEdit={() => void openEdit(book)}
          onView={() => void openView(book)}
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
            <Image width={160} height={160} src="/fav.jpg" alt="TaleTeacup"
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
              <Image width={160} height={160} src="/final.png" alt="TaleTeacup Logo"
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
                      onClick={() => void openView(b)}
                      className="flex items-center gap-3 p-2.5 rounded-[22px] cursor-pointer transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
                      style={{ background: P.panel, boxShadow: R(5, 14) }}
                    >
                      {b.coverFile || b.photoUrl ? (
                        <BookCover book={b} className="w-full h-full object-cover" />
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
          {loadError && <div role="alert" className="m-4 rounded-2xl bg-red-100 p-4 text-sm text-red-900 dark:bg-red-950 dark:text-red-100">{loadError}<button className="ml-4 underline" onClick={() => { refresh(); void refreshOverview() }}>Retry</button></div>}
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
                {overviewLoading ? <p role="status" className="text-xs">Loading library totals…</p> : <DashboardStats books={allBooks} />}
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
                      <button onClick={() => { void exportLibrary('json'); setExportMenuOpen(false) }} className="px-4 py-3 text-left text-sm">↓ Export JSON</button>
                      <button onClick={() => { void exportLibrary('csv'); setExportMenuOpen(false) }} className="px-4 py-3 text-left text-sm">↓ Export CSV</button>
                      <button onClick={openImport} className="px-4 py-3 text-left text-sm">↑ Import JSON / CSV</button>
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
            {viewMode === 'analytics' && <AnalyticsDashboard key={annualGoal} books={allBooks} annualGoal={annualGoal} onGoalChange={setAnnualGoal} />}
            {viewMode === 'loans' && !overviewLoading && !loadError && (
              <LoanTracker books={allBooks} onEdit={book => void openEdit(book)} />
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
                          onEdit={() => void openEdit(b)}
                          onView={() => void openView(b)}
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
                {books.map((book) => (
                  <BookListCard
                    key={book.id}
                    book={book}
                    onEdit={() => void openEdit(book)}
                    onView={() => void openView(book)}
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
                              <BookThumbnailButton key={b.id} book={b} onView={openView} style={{ background: P.panel, boxShadow: '3px 5px 10px rgba(0,0,0,.25)' }} />
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
                  disabled={mutating} onClick={handleBatchMarkRead}
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
                  disabled={mutating} onClick={handleBatchDelete}
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
          books={allBooks}
          shelfFilter={shelfFilter}
          onShelfChange={value => void setFilters({ shelfFilter: value })}
          onReset={resetFilters}
        />

        {/* Hidden Goodreads CSV input */}
        <input
          type="file"
          accept=".csv,.json"
          ref={fileInputRef}
          className="hidden"
          onChange={handleImportFile}
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
            key={editingBook.id || editingBook.enrichmentKey || 'new'}
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
              void openEdit(viewingBook)
            }}

            onReadPdf={() => {
              setViewingBook(null)
              setTimeout(() => setReadingPdfBook(viewingBook), 60)
            }}
          />
        )}
        {readingPdfBook?.pdfPath && (attachmentType(readingPdfBook) === 'epub' ? (
          <EpubReaderModal epubUrl={readingPdfBook.pdfPath} initialLocation={readingPdfBook.epubLocation || 0}
            copyId={readingPdfBook.id} onClose={() => { setReadingPdfBook(null); void refreshOverview() }} />
        ) : (
          <PdfReaderModal pdfUrl={readingPdfBook.pdfPath} initialPage={readingPdfBook.currentPage || 1}
            copyId={readingPdfBook.id} onClose={() => { setReadingPdfBook(null); void refreshOverview() }} />
        ))}
        {importFile && <ImportLibraryModal file={importFile} onClose={() => setImportFile(null)} onComplete={() => { refresh(); void refreshOverview() }} />}

        {/* Global toast notifications */}
        <ToastProvider />
      </div>
    </>
  )
}
