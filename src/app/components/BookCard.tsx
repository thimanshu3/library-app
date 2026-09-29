'use client'

import type { CSSProperties, ReactNode } from 'react'
import { Book } from '../types'

// Change to match your currency
const CURRENCY = '₹'

// ─── Extra Work/Copy fields (typed loosely so this compiles even if `Book` lacks them) ───
type Extra = Partial<{
  series: string | null
  volume: string | null
  pageCount: number | null
  tags: unknown
  collections: unknown
  publisher: string | null
  originalLanguage: string | null
  countryOfOrigin: string | null
  additionalAuthors: string | null
  originalPublicationYear: string | null
  yearPublished: string | null
  condition: string | null
  shelfLocation: string | null
  purchasePrice: number | null
  dateRead: string | null
  readCount: number | null
  ownedCopies: number | null
  quotes: unknown
  myReview: string | null
  privateNotes: string | null
  amazonLink: string | null
  lastReadTimestamp: string | null
  copies: unknown[]
}>

// ─── Genre short labels ───────────────────────────────────────────────────────
const genreLabels: Record<string, string> = {
  MIND: 'Mindset',
  PHIL: 'Philosophy',
  PROD: 'Productivity',
  PSY: 'Psychology',
  FIN: 'Finance',
  POWER: 'Power',
  THINK: 'Thinking',
  STARTUP: 'Business',
  HIST: 'History',
  BIO: 'Biography',
  WAR: 'War',
  FIC: 'Fiction',
  TECH: 'Technology',
  SCI: 'Science',
  SPIRIT: 'Spirituality',
  COMM: 'Communication'
}

const genreInitial = (genre: string) =>
  (genreLabels[genre] || genre || 'B').charAt(0).toUpperCase()

// ─── Icons ────────────────────────────────────────────────────────────────────
const icons = {
  book: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
  pdf: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z',
  audio:
    'M15.536 8.464a5 5 0 010 7.072M12 6a7 7 0 010 12M8.464 8.464a5 5 0 000 7.072',
  edit: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  check: 'M5 13l4 4L19 7',
  sparkles:
    'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z',
  quotes:
    'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z',
  review:
    'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  lock: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
  repeat:
    'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  copies:
    'M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2',
  external:
    'M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14'
}

const Icon = ({
  d,
  className = 'w-3 h-3',
  stroke = 2
}: {
  d: string
  className?: string
  stroke?: number
}) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={stroke}
      d={d}
    />
  </svg>
)

const formatIcon: Record<string, string> = {
  Physical: icons.book,
  PDF: icons.pdf,
  Audiobook: icons.audio
}

// ─── Clay shadow helpers ──────────────────────────────────────────────────────
// raised: soft puffy object  |  pressed: carved-in well
const raised = (rgb: string, dark: boolean, d = 10, b = 26) => {
  const h = d / 2
  return dark
    ? `${d}px ${d}px ${b}px rgba(0,0,0,.5), -${h}px -${h}px ${b}px rgba(255,255,255,.035), inset ${h}px ${h}px ${b / 2}px rgba(255,255,255,.08), inset -${h}px -${h}px ${b / 2}px rgba(0,0,0,.4)`
    : `${d}px ${d}px ${b}px rgba(${rgb},.26), -${h}px -${h}px ${b}px rgba(255,255,255,.95), inset ${h}px ${h}px ${b / 2}px rgba(255,255,255,.95), inset -${h}px -${h}px ${b / 2}px rgba(${rgb},.18)`
}

const pressed = (rgb: string, dark: boolean, d = 4, b = 10) =>
  dark
    ? `inset ${d}px ${d}px ${b}px rgba(0,0,0,.5), inset -${d}px -${d}px ${b}px rgba(255,255,255,.05)`
    : `inset ${d}px ${d}px ${b}px rgba(${rgb},.24), inset -${d}px -${d}px ${b}px rgba(255,255,255,.95)`

const PILL_SHADOW =
  '0 3px 8px rgba(0,0,0,.25), inset 1px 1px 2px rgba(255,255,255,.5), inset -1px -2px 3px rgba(0,0,0,.18)'

// ─── Status palettes ──────────────────────────────────────────────────────────
type Status = 'Unread' | 'Reading' | 'Read'

const accents: Record<Status, { rgb: string; main: string; light: string }> = {
  Unread: { rgb: '100,116,139', main: '#64748b', light: '#a3b1c6' },
  Reading: { rgb: '124,92,252', main: '#7c5cfc', light: '#a58bff' },
  Read: { rgb: '16,185,129', main: '#10b981', light: '#4fe0b0' }
}

const surfaces = {
  light: { Unread: '#eef1f8', Reading: '#f0ebff', Read: '#e6f8ef' },
  dark: { Unread: '#222736', Reading: '#26234a', Read: '#1d2e2c' }
}

const placeholders = {
  light: {
    Unread: 'linear-gradient(145deg,#d6deee,#b6c3dc)',
    Reading: 'linear-gradient(145deg,#c9bcff,#8f7bff)',
    Read: 'linear-gradient(145deg,#aef2d3,#5fd6a4)'
  },
  dark: {
    Unread: 'linear-gradient(145deg,#3a4159,#2a3046)',
    Reading: 'linear-gradient(145deg,#4b3fa8,#33307a)',
    Read: 'linear-gradient(145deg,#1f6f5a,#164a3f)'
  }
}

const formatColors: Record<string, [string, string]> = {
  Physical: ['#fbbf24', '#f59e0b'],
  PDF: ['#60a5fa', '#3b82f6'],
  Audiobook: ['#c084fc', '#a855f7']
}

// ─── Small helpers ────────────────────────────────────────────────────────────
const toList = (v: unknown): string[] => {
  if (Array.isArray(v))
    return v
      .map(x =>
        typeof x === 'string' ? x : ((x as { name?: string })?.name ?? '')
      )
      .filter(Boolean)
  if (typeof v === 'string')
    return v
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
  return []
}

const timeAgo = (raw?: string | null) => {
  if (!raw) return ''
  const n = Number(raw)
  const t = new Date(Number.isNaN(n) ? raw : n).getTime()
  if (Number.isNaN(t)) return ''
  const days = Math.floor((Date.now() - t) / 86400000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

const fmtDate = (raw?: string | null) => {
  if (!raw) return ''
  const d = new Date(raw)
  return Number.isNaN(d.getTime())
    ? raw
    : d.toLocaleDateString('en', { month: 'short', year: 'numeric' })
}

const SolidPill = ({
  colors,
  className = '',
  children
}: {
  colors: [string, string]
  className?: string
  children: ReactNode
}) => (
  <span
    className={`inline-flex items-center gap-1 text-[8px] sm:text-[10px] font-bold text-white px-2 py-1 rounded-full max-w-[150px] truncate ${className}`}
    style={{
      background: `linear-gradient(145deg, ${colors[0]}, ${colors[1]})`,
      boxShadow: PILL_SHADOW
    }}
  >
    {children}
  </span>
)

type Stat = { k: string; v: string }

// ─── Component ────────────────────────────────────────────────────────────────
export default function BookCard({
  book,
  onEdit,
  onView,
  isDark = false,
  isBatchMode = false,
  isSelected = false,
  onSelect
}: {
  book: Book
  onEdit: () => void
  onView: () => void
  isDark?: boolean
  isBatchMode?: boolean
  isSelected?: boolean
  onSelect?: () => void
}) {
  const b = book as Book & Extra
  const dark = isDark
  const status: Status =
    book.status === 'Reading' || book.status === 'Read' ? book.status : 'Unread'
  const a = accents[status]
  const surface = surfaces[dark ? 'dark' : 'light'][status]

  const ink = dark
    ? {
        title: '#f5f6fb',
        body: 'rgba(255,255,255,.62)',
        faint: 'rgba(255,255,255,.4)'
      }
    : { title: '#1c2133', body: '#59627a', faint: '#8b93a8' }
  const accentText = dark ? a.light : a.main
  const wellBg = dark ? 'rgba(0,0,0,.22)' : `rgba(${a.rgb},.09)`
  const tileBg = dark ? 'rgba(0,0,0,.18)' : `rgba(${a.rgb},.06)`
  const chipBg = dark ? `rgba(${a.rgb},.20)` : `rgba(${a.rgb},.13)`
  const chipShadow = dark
    ? '0 3px 8px rgba(0,0,0,.45), inset 1px 1px 2px rgba(255,255,255,.12)'
    : '0 3px 8px rgba(30,35,55,.16), inset 1px 1px 2px rgba(255,255,255,.9), inset -1px -1px 2px rgba(30,35,55,.08)'

  // Pages
  const totalPages = book.totalPages || b.pageCount || 0

  // Reading progress
  let progress = -1
  if (status === 'Read') {
    progress = 100
  } else if (status === 'Reading') {
    if (book.currentPage && totalPages > 0) {
      progress = Math.min(99, Math.round((book.currentPage / totalPages) * 100))
    } else if (book.readingStartDate) {
      const hoursNum =
        parseFloat(book.hours?.replace(/[^0-9.]/g, '') || '0') || 8
      // eslint-disable-next-line react-hooks/purity
      const elapsed =
        (Date.now() - new Date(book.readingStartDate).getTime()) / (1000 * 3600)
      progress = Math.min(95, Math.round((elapsed / hoursNum) * 100))
    }
  }

  const lastRead = timeAgo(b.lastReadTimestamp)
  const progressLabel =
    status === 'Read'
      ? `Finished${b.dateRead ? ' ' + fmtDate(b.dateRead) : ''}`
      : book.currentPage && totalPages > 0
        ? `Page ${book.currentPage} of ${totalPages}`
        : 'In progress (estimated)'

  // Derived display data
  const hasFormat = book.format && book.format !== 'None'
  const isOwned = book.purchased
  const copiesN =
    b.ownedCopies || (Array.isArray(b.copies) ? b.copies.length : 0)
  const year = book.launchYear || b.originalPublicationYear || b.yearPublished
  const rating = Math.max(0, Math.min(5, book.rating || 0))
  const coverSrc = book.coverFile || book.photoUrl
  const seriesLabel = b.series || ''
  const extraAuthors = b.additionalAuthors
    ? b.additionalAuthors.split(',').filter(s => s.trim()).length
    : 0

  const stat = (k: string, v: unknown): Stat | null =>
    v ? { k, v: String(v) } : null
  const stats = [
    stat('Pages', totalPages),
    stat('Reading time', book.hours),
    stat('Shelf', b.shelfLocation),
    stat('Condition', b.condition),
    stat('Publisher', b.publisher),
    stat('Language', b.originalLanguage),
    stat('Origin', b.countryOfOrigin),
    stat(
      'Paid',
      b.purchasePrice && b.purchasePrice > 0
        ? `${CURRENCY}${b.purchasePrice}`
        : null
    )
  ]
    .filter((s): s is Stat => s !== null)
    .slice(0, 4)

  const chips = [
    ...toList(b.collections).map(t => ({ t, col: true })),
    ...toList(b.tags).map(t => ({ t: `#${t}`, col: false }))
  ]
  const shownChips = chips.slice(0, 3)
  const hiddenChips = chips.length - shownChips.length

  const quotesN = Array.isArray(b.quotes) ? b.quotes.length : 0
  const indicators = [
    quotesN > 0 && {
      icon: icons.quotes,
      label: String(quotesN),
      title: `${quotesN} saved quotes`
    },
    b.myReview && {
      icon: icons.review,
      label: 'Review',
      title: 'Has a review'
    },
    b.privateNotes && {
      icon: icons.lock,
      label: 'Notes',
      title: 'Has private notes'
    },
    (b.readCount || 0) > 1 && {
      icon: icons.repeat,
      label: `${b.readCount}x`,
      title: `Read ${b.readCount} times`
    },
    copiesN > 1 && {
      icon: icons.copies,
      label: String(copiesN),
      title: `${copiesN} copies`
    }
  ].filter(Boolean) as { icon: string; label: string; title: string }[]

  const cardStyle = {
    background: surface,
    '--clay': isSelected
      ? pressed(a.rgb, dark, 6, 14)
      : raised(a.rgb, dark, 12, 30),
    '--clay-hover': raised(a.rgb, dark, 18, 40)
  } as CSSProperties

  return (
    <div
      onClick={isBatchMode ? onSelect : onView}
      style={cardStyle}
      className={`
        relative group flex flex-col rounded-[30px] sm:rounded-[36px] p-2 sm:p-3
        transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] cursor-pointer select-none
        [box-shadow:var(--clay)]
        ${
          isSelected
            ? 'ring-4 ring-secondary/40 scale-[0.985]'
            : 'hover:[box-shadow:var(--clay-hover)] hover:-translate-y-2'
        }
        ${isBatchMode ? 'active:scale-[0.96]' : 'active:scale-[0.98]'}
      `}
    >
      {/* ── Cover well ── */}
      <div
        className="relative h-40 sm:h-56 rounded-[22px] sm:rounded-[28px] overflow-hidden flex items-center justify-center shrink-0"
        style={{ background: wellBg }}
        onClick={e => {
          if (!isBatchMode) {
            e.stopPropagation()
            onEdit()
          }
        }}
      >
        {coverSrc ? (
          <>
            <div
              className="absolute inset-0 scale-125 blur-2xl opacity-40 group-hover:opacity-60 transition-opacity duration-700"
              style={{
                backgroundImage: `url(${coverSrc})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            />
            <img
              src={coverSrc}
              alt={book.title}
              className="h-[84%] w-auto max-w-[78%] relative z-10 object-contain rounded-lg sm:rounded-xl group-hover:scale-[1.05] group-hover:-rotate-1 transition-transform duration-700 ease-out"
              style={{
                boxShadow:
                  '8px 12px 24px rgba(0,0,0,.35), -2px -2px 6px rgba(255,255,255,.25)'
              }}
              onError={e => {
                const img = e.currentTarget
                const fallback = img.dataset.fallback || '0'

                if (fallback === '0') {
                  // First fallback: try OpenLibrary cover by ISBN13
                  const isbn = (book as any).isbn13 || (book as any).isbn
                  if (isbn) {
                    img.dataset.fallback = '1'
                    img.src = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`
                    return
                  }
                }

                if (fallback === '0' || fallback === '1') {
                  // Second fallback: title + author search
                  img.dataset.fallback = '2'
                  const q = encodeURIComponent(`${book.title} ${book.author}`)
                  img.src = `https://covers.openlibrary.org/b/olid/OL-L.jpg?title=${q}`
                  return
                }

                // All fallbacks failed — hide image, let placeholder show
                img.style.display = 'none'
                const blurDiv = img.previousElementSibling as HTMLElement | null
                if (blurDiv) blurDiv.style.display = 'none'
              }}
            />
          </>
        ) : (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-3"
            style={{
              background: placeholders[dark ? 'dark' : 'light'][status]
            }}
          >
            <div
              className="w-16 h-20 rounded-[22px] bg-white/25 flex items-center justify-center"
              style={{
                boxShadow:
                  '6px 8px 16px rgba(0,0,0,.18), inset 3px 3px 6px rgba(255,255,255,.55), inset -3px -4px 8px rgba(0,0,0,.12)'
              }}
            >
              <span className="text-3xl font-black text-white/90 font-syne select-none">
                {genreInitial(book.genre)}
              </span>
            </div>
            <span className="text-[10px] font-bold text-white/70">
              No cover
            </span>
          </div>
        )}

        {/* Carved-in edge sits above the image */}
        <div
          className="absolute inset-0 z-[11] rounded-[inherit] pointer-events-none"
          style={{ boxShadow: pressed(a.rgb, dark, 4, 10) }}
        />

        {/* Batch checkbox */}
        {isBatchMode && (
          <div className="absolute top-2.5 left-2.5 sm:top-3.5 sm:left-3.5 z-30">
            <div
              className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${isSelected ? 'bg-secondary text-white' : dark ? 'bg-white/10 text-transparent' : 'bg-white/80 text-transparent'}`}
              style={{
                boxShadow: isSelected ? PILL_SHADOW : pressed(a.rgb, dark, 2, 4)
              }}
            >
              <Icon d={icons.check} className="w-4 h-4" stroke={3} />
            </div>
          </div>
        )}

        {/* Book number + format */}
        <div
          className={`absolute top-2.5 sm:top-3.5 flex items-center gap-1 sm:gap-1.5 z-20 ${isBatchMode ? 'left-12 sm:left-14' : 'left-2.5 sm:left-3.5'}`}
        >
          <SolidPill
            colors={['rgba(15,18,30,.6)', 'rgba(15,18,30,.45)']}
            className="tabular-nums backdrop-blur-md"
          >
            #{String(book.id).replace(/\D/g, '')}
          </SolidPill>
          {hasFormat && (
            <SolidPill
              colors={formatColors[book.format] ?? ['#64748b', '#475569']}
            >
              {formatIcon[book.format] && (
                <Icon
                  d={formatIcon[book.format]}
                  className="w-3 h-3 shrink-0"
                />
              )}
              {book.format}
            </SolidPill>
          )}
        </div>

        {/* Status badge */}
        <div
          className="absolute top-2.5 right-2.5 sm:top-3.5 sm:right-3.5 z-20 px-2.5 py-1 rounded-full text-[9px] sm:text-[10px] font-bold flex items-center gap-1.5 backdrop-blur-md"
          style={{
            background: dark ? 'rgba(20,22,32,.78)' : 'rgba(255,255,255,.88)',
            color: accentText,
            boxShadow: chipShadow
          }}
        >
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${status === 'Reading' ? 'animate-pulse' : ''}`}
            style={{
              background: `linear-gradient(145deg, ${a.light}, ${a.main})`,
              boxShadow: `0 0 6px rgba(${a.rgb},.6)`
            }}
          />
          {book.status}
        </div>

        {/* Loaned / owned */}
        <div className="absolute bottom-2.5 left-2.5 sm:bottom-3.5 sm:left-3.5 z-20">
          {book.givenTo ? (
            <SolidPill colors={['#fbbf24', '#f59e0b']}>
              Loaned
              {typeof book.givenTo === 'string' ? ` to ${book.givenTo}` : ''}
            </SolidPill>
          ) : isOwned ? (
            <SolidPill colors={['#34d399', '#10b981']}>
              <Icon d={icons.check} className="w-3 h-3 shrink-0" stroke={3} />
              Owned{copiesN > 1 ? ` x${copiesN}` : ''}
            </SolidPill>
          ) : null}
        </div>

        {/* Edit button */}
        {!isBatchMode && (
          <button
            onClick={e => {
              e.stopPropagation()
              onEdit()
            }}
            title="Edit"
            aria-label="Edit book"
            className="absolute bottom-2.5 right-2.5 sm:bottom-3.5 sm:right-3.5 z-20 w-9 h-9 rounded-2xl flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200 hover:scale-110 active:scale-90 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
            style={{
              background: dark ? 'rgba(20,22,32,.85)' : 'rgba(255,255,255,.92)',
              color: accentText,
              boxShadow: chipShadow
            }}
          >
            <Icon d={icons.edit} className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Card body ── */}
      <div className="px-1.5 sm:px-2.5 pt-3 sm:pt-4 pb-1.5 sm:pb-2 flex flex-col flex-1 gap-2 sm:gap-2.5">
        {/* Genre + year */}
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-[9px] sm:text-[11px] font-bold px-2.5 py-1 rounded-full truncate"
            style={{
              background: chipBg,
              color: accentText,
              boxShadow: chipShadow
            }}
          >
            {genreLabels[book.genre] || book.genre}
          </span>
          {year && (
            <span
              className="text-[10px] sm:text-[11px] font-semibold tabular-nums"
              style={{ color: ink.faint }}
            >
              {year}
            </span>
          )}
        </div>

        {/* Title, series, author */}
        <div className="flex-1 min-h-0">
          <h3
            className="font-syne font-black text-[14px] sm:text-[17px] tracking-tight leading-snug line-clamp-2"
            style={{ color: ink.title }}
          >
            {book.title}
          </h3>
          {(seriesLabel || b.volume) && (
            <p
              className="mt-0.5 flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold min-w-0"
              style={{ color: accentText }}
            >
              {seriesLabel && (
                <span className="truncate italic">{seriesLabel}</span>
              )}
              {b.volume && (
                <span
                  className="shrink-0 px-1.5 rounded-md text-[9px] font-bold"
                  style={{ background: chipBg }}
                >
                  Vol. {b.volume}
                </span>
              )}
            </p>
          )}
          <p
            className="mt-0.5 text-[11px] sm:text-[13px] font-semibold line-clamp-1"
            style={{ color: ink.body }}
          >
            {book.author}
            {extraAuthors > 0 && (
              <span style={{ color: ink.faint }}> +{extraAuthors} more</span>
            )}
          </p>
        </div>

        {/* Description */}
        <p
          className="text-[10px] sm:text-[12px] line-clamp-2 leading-relaxed"
          style={{ color: ink.faint }}
        >
          {book.description || book.summary || 'No description available.'}
        </p>

        {/* Progress */}
        {progress >= 0 && (
          <div>
            <div
              className="flex items-baseline justify-between gap-2 mb-1.5 text-[10px] sm:text-[11px] font-semibold"
              style={{ color: ink.body }}
            >
              <span className="truncate">
                {progressLabel}
                {status === 'Reading' && lastRead && (
                  <span
                    className="hidden sm:inline"
                    style={{ color: ink.faint }}
                  >
                    , last read {lastRead}
                  </span>
                )}
              </span>
              <span
                className="font-black tabular-nums shrink-0"
                style={{ color: accentText }}
              >
                {progress}%
              </span>
            </div>
            <div
              className="h-3.5 rounded-full p-[3px]"
              style={{
                background: wellBg,
                boxShadow: pressed(a.rgb, dark, 2, 5)
              }}
            >
              <div
                className="h-full rounded-full transition-[width] duration-700"
                style={{
                  width: `${Math.max(progress, 8)}%`,
                  background: `linear-gradient(90deg, ${a.light}, ${a.main})`,
                  boxShadow: `inset 0 2px 3px rgba(255,255,255,.5), 0 2px 6px rgba(${a.rgb},.45)`
                }}
              />
            </div>
          </div>
        )}

        {/* Stat tiles (tablet and up) */}
        {stats.length > 0 && (
          <div className="hidden sm:grid grid-cols-2 gap-2">
            {stats.map(s => (
              <div
                key={s.k}
                className="rounded-2xl px-3 py-1.5 min-w-0"
                style={{
                  background: tileBg,
                  boxShadow: pressed(a.rgb, dark, 2, 4)
                }}
              >
                <p
                  className="text-[9px] font-semibold"
                  style={{ color: ink.faint }}
                >
                  {s.k}
                </p>
                <p
                  className="text-[12px] font-bold truncate"
                  style={{ color: ink.title }}
                  title={s.v}
                >
                  {s.v}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Collections + tags (tablet and up) */}
        {shownChips.length > 0 && (
          <div className="hidden sm:flex flex-wrap gap-1.5">
            {shownChips.map(c => (
              <span
                key={c.t}
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full max-w-[120px] truncate"
                style={
                  c.col
                    ? {
                        background: chipBg,
                        color: accentText,
                        boxShadow: chipShadow
                      }
                    : {
                        background: tileBg,
                        color: ink.body,
                        boxShadow: pressed(a.rgb, dark, 1, 3)
                      }
                }
              >
                {c.t}
              </span>
            ))}
            {hiddenChips > 0 && (
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5"
                style={{ color: ink.faint }}
              >
                +{hiddenChips}
              </span>
            )}
          </div>
        )}

        {/* Recommended by */}
        {book.recommendedBy && (
          <div
            className="flex items-center gap-2 rounded-2xl px-2.5 py-1.5"
            style={{
              background: tileBg,
              boxShadow: pressed(a.rgb, dark, 2, 4)
            }}
          >
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
              style={{
                background: chipBg,
                color: accentText,
                boxShadow: chipShadow
              }}
            >
              <Icon d={icons.sparkles} className="w-3 h-3" />
            </span>
            <p
              className="text-[10px] sm:text-[11px] truncate"
              style={{ color: ink.faint }}
            >
              <span className="font-bold" style={{ color: ink.body }}>
                {book.recommendedBy}
              </span>
            </p>
          </div>
        )}

        {/* Footer: rating, indicators, view */}
        <div className="mt-auto pt-2 flex items-end justify-between gap-2">
          <div className="min-w-0 flex flex-col gap-1.5">
            {rating > 0 && (
              <span
                className="flex text-[12px] sm:text-[14px] leading-none tracking-[0.04em]"
                aria-label={`Rated ${rating} out of 5`}
              >
                <span className="text-amber-400 drop-shadow-[0_1px_2px_rgba(245,158,11,.5)]">
                  {'★'.repeat(rating)}
                </span>
                <span
                  style={{
                    color: dark
                      ? 'rgba(255,255,255,.12)'
                      : 'rgba(100,116,139,.22)'
                  }}
                >
                  {'★'.repeat(5 - rating)}
                </span>
              </span>
            )}
            {(indicators.length > 0 || b.amazonLink) && (
              <div className="flex flex-wrap items-center gap-1.5">
                {indicators.map(i => (
                  <span
                    key={i.title}
                    title={i.title}
                    className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full"
                    style={{
                      background: chipBg,
                      color: accentText,
                      boxShadow: chipShadow
                    }}
                  >
                    <Icon d={i.icon} className="w-2.5 h-2.5" />
                    {i.label}
                  </span>
                ))}
                {b.amazonLink && (
                  <a
                    href={b.amazonLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    title="Open on Amazon"
                    aria-label="Open on Amazon"
                    className="inline-flex items-center justify-center w-5 h-5 rounded-full hover:scale-110 transition-transform"
                    style={{
                      background: chipBg,
                      color: accentText,
                      boxShadow: chipShadow
                    }}
                  >
                    <Icon d={icons.external} className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            )}
          </div>

          <button
            onClick={e => {
              e.stopPropagation()
              onView()
            }}
            className="shrink-0 text-[11px] sm:text-[12px] font-bold text-white px-4 py-2 rounded-full transition-all duration-200 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
            style={{
              background: `linear-gradient(145deg, ${a.light}, ${a.main})`,
              boxShadow: `4px 6px 14px rgba(${a.rgb},.45), inset 2px 2px 4px rgba(255,255,255,.4), inset -2px -3px 5px rgba(0,0,0,.18)`
            }}
          >
            View
          </button>
        </div>
      </div>
    </div>
  )
}
