'use client'

import { useEffect, useRef } from 'react'
import { Book } from '../types'

interface MobileFilterSheetProps {
  open: boolean
  onClose: () => void
  // Filter values
  search: string
  onSearchChange: (v: string) => void
  statusFilter: string
  onStatusChange: (v: string) => void
  sortBy: string
  onSortByChange: (v: string) => void
  genreFilter: string
  onGenreChange: (v: string) => void
  volumeFilter: string
  onVolumeChange: (v: string) => void
  authorFilter: string
  onAuthorChange: (v: string) => void
  yearFilter: string
  onYearChange: (v: string) => void
  formatFilter: string
  onFormatChange: (v: string) => void
  purchasedFilter: string
  onPurchasedChange: (v: string) => void
  books: Book[]
  onReset: () => void
}

const selectClass =
  'w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-3.5 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/50 transition-all appearance-none cursor-pointer text-slate-800 dark:text-slate-200'

export default function MobileFilterSheet({
  open, onClose,
  search, onSearchChange,
  statusFilter, onStatusChange,
  sortBy, onSortByChange,
  genreFilter, onGenreChange,
  volumeFilter, onVolumeChange,
  authorFilter, onAuthorChange,
  yearFilter, onYearChange,
  formatFilter, onFormatChange,
  purchasedFilter, onPurchasedChange,
  books, onReset
}: MobileFilterSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)

  // iOS-style: close on backdrop tap
  // Also close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  const allAuthors = Array.from(new Set(books.map(b => b.author))).sort()

  return (
    <>
      {/* Backdrop */}
      <div
        className="sheet-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* iOS-style bottom sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="Filter Library"
        className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-[#18181f] rounded-t-[28px] shadow-2xl animate-slide-bottom overflow-hidden"
        style={{ maxHeight: '90dvh' }}
      >
        {/* Pull handle (iOS-style) */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Filters</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={onReset}
              className="text-sm font-semibold text-accent dark:text-accent-dim active:opacity-60 transition-opacity"
            >
              Reset
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 active:scale-95 transition-transform"
              aria-label="Close filters"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto custom-scrollbar px-6 py-5 flex flex-col gap-5" style={{ maxHeight: 'calc(90dvh - 110px)' }}>
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search by title or author…"
              value={search}
              onChange={e => onSearchChange(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-2xl py-3.5 pl-11 pr-4 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50 transition-all placeholder-slate-400 text-slate-800 dark:text-slate-200"
            />
            <svg className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Status */}
          <div className="flex flex-col gap-2.5">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Status</label>
            <div className="flex flex-wrap gap-2">
              {['All', 'Unread', 'Reading', 'Read', 'Wishlist'].map(s => (
                <button
                  key={s}
                  onClick={() => onStatusChange(s)}
                  className={`py-2.5 px-4 flex-1 rounded-2xl text-xs font-bold transition-all active:scale-95 ${statusFilter === s
                    ? 'bg-accent text-white shadow-lg shadow-accent/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Sort */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Sort By</label>
            <div className="relative">
              <select value={sortBy} onChange={e => onSortByChange(e.target.value)} className={selectClass}>
                <option value="id">Reading Order (#1–#300)</option>
                <option value="title">Title A–Z</option>
                <option value="year">Launch Year (Oldest First)</option>
                <option value="price">Investment (Highest First)</option>
              </select>
            </div>
          </div>

          {/* Genre */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Collection (Genre)</label>
            <div className="relative">
              <select value={genreFilter} onChange={e => onGenreChange(e.target.value)} className={selectClass}>
                <option value="All">All Collections</option>
                <option value="MIND">Mindset / Resilience (MIND)</option>
                <option value="PHIL">Philosophy (PHIL)</option>
                <option value="PROD">Focus / Productivity (PROD)</option>
                <option value="PSY">Psychology (PSY)</option>
                <option value="FIN">Money (FIN)</option>
                <option value="POWER">Influence / Power (POWER)</option>
                <option value="THINK">Decision-Making (THINK)</option>
                <option value="STARTUP">Business (STARTUP)</option>
                <option value="HIST">History (HIST)</option>
                <option value="BIO">Biography / Memoir (BIO)</option>
                <option value="WAR">Military / Survival (WAR)</option>
                <option value="FIC">Fiction (FIC)</option>
                <option value="TECH">Tech / Future (TECH)</option>
                <option value="SCI">Science / Space (SCI)</option>
                <option value="SPIRIT">Purpose / Spirituality (SPIRIT)</option>
                <option value="COMM">Communication (COMM)</option>
              </select>
            </div>
          </div>

          {/* Volume */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Volume</label>
            <div className="relative">
              <select value={volumeFilter} onChange={e => onVolumeChange(e.target.value)} className={selectClass}>
                <option value="All">All Volumes</option>
                {Array.from({ length: 15 }, (_, i) => (
                  <option key={i + 1} value={`Volume ${i + 1}`}>Volume {i + 1}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Author */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Author</label>
            <div className="relative">
              <select value={authorFilter} onChange={e => onAuthorChange(e.target.value)} className={selectClass}>
                <option value="All">All Authors</option>
                {allAuthors.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>

          {/* Year */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Launch Era</label>
            <div className="relative">
              <select value={yearFilter} onChange={e => onYearChange(e.target.value)} className={selectClass}>
                <option value="All">Any Year</option>
                <option value="Pre-1900s">Pre-1900s</option>
                <option value="1900-1950">1900 – 1950</option>
                <option value="1950-2000">1950 – 2000</option>
                <option value="2000s">2000s</option>
                <option value="2010s">2010s</option>
                <option value="2020s">2020s</option>
              </select>
            </div>
          </div>

          {/* Format */}
          <div className="flex flex-col gap-2 pb-4">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Format</label>
            <div className="relative">
              <select value={formatFilter} onChange={e => onFormatChange(e.target.value)} className={selectClass}>
                <option value="All">All Formats</option>
                <option value="Physical">Physical</option>
                <option value="PDF">PDF</option>
                <option value="Audiobook">Audiobook</option>
                <option value="None">None</option>
              </select>
            </div>
          </div>

          {/* Purchased */}
          <div className="flex flex-col gap-2 pb-4">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Ownership</label>
            <div className="relative">
              <select value={purchasedFilter} onChange={e => onPurchasedChange(e.target.value)} className={selectClass}>
                <option value="All">All Ownership</option>
                <option value="Purchased">Purchased (Owned)</option>
                <option value="Not Purchased">Not Purchased</option>
              </select>
            </div>
          </div>
        </div>

        {/* Apply button */}
        <div className="px-6 pb-8 pt-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#18181f]">
          <button
            onClick={onClose}
            className="w-full bg-[#171b2e] text-white font-bold py-4 rounded-full text-sm tracking-wide shadow-lg shadow-black/10 active:scale-[0.98] transition-transform"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </>
  )
}
