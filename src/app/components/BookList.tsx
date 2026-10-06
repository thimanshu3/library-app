'use client'
import BookCover from './BookCover'

import type { CSSProperties, KeyboardEvent, ReactNode } from 'react'
import {
  NEUTRAL_RGB,
  chipShadow,
  clayFill,
  palette,
  pressed,
  raised,
  statusTheme
} from '../clay'
import { ownershipOf, progressPercent } from '@/lib/library-domain'
import { Book } from '../types'

// Change to match your currency

// Extra Work/Copy fields, typed loosely so this compiles even if `Book` lacks them
type Extra = Partial<{
  series: unknown
  tags: unknown
  collections: unknown
  quotes: unknown
  copies: unknown[]
  pageCount: number | null
  publisher: string | null
  additionalAuthors: string | null
  originalPublicationYear: string | null
  yearPublished: string | null
  readCount: number | null
  ownedCopies: number | null
  myReview: string | null
  privateNotes: string | null
  lastReadTimestamp: string | null
  dateRead: string | null
}>

// ─── Icons ────────────────────────────────────────────────────────────────────
const icons = {
  book: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
  pdf: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z',
  audio:
    'M15.536 8.464a5 5 0 010 7.072M12 6a7 7 0 010 12M8.464 8.464a5 5 0 000 7.072',
  pages:
    'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  clock: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  calendar:
    'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  globe:
    'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  building:
    'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  pin: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z',
  shield:
    'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  sparkles:
    'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z',
  quotes:
    'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z',
  lock: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
  repeat:
    'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  copies:
    'M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2',
  edit: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  check: 'M5 13l4 4L19 7',
  arrow: 'M14 5l7 7m0 0l-7 7m7-7H3'
}

const formatIcon: Record<string, string> = {
  Physical: icons.book,
  PDF: icons.pdf,
  Audiobook: icons.audio
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

// ─── Small building blocks ────────────────────────────────────────────────────
function Tag({
  children,
  dark,
  rgb,
  fg,
  icon,
  pulse,
  title,
  className = ''
}: {
  children: ReactNode
  dark: boolean
  rgb: string
  fg: string
  icon?: string
  pulse?: boolean
  title?: string
  className?: string
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold px-2.5 py-1 rounded-full max-w-[200px] ${className}`}
      style={{
        background: dark ? `rgba(${rgb},.2)` : `rgba(${rgb},.13)`,
        color: fg,
        boxShadow: chipShadow(dark)
      }}
    >
      {pulse !== undefined && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${pulse ? 'animate-pulse' : ''}`}
          style={{ background: fg }}
        />
      )}
      {icon && <Icon d={icon} className="w-3 h-3 shrink-0" />}
      <span className="truncate">{children}</span>
    </span>
  )
}

function Fact({
  icon,
  text,
  title,
  dark,
  rgb,
  accent,
  className = ''
}: {
  icon?: string
  text: string
  title: string
  dark: boolean
  rgb: string
  accent: string
  className?: string
}) {
  const P = palette(dark)
  return (
    <span
      title={title}
      className={`items-center gap-1.5 max-w-[190px] text-[11px] sm:text-[12px] font-semibold px-2.5 py-1.5 rounded-xl ${className}`}
      style={{
        background: dark ? 'rgba(0,0,0,.2)' : `rgba(${rgb},.07)`,
        color: P.body,
        boxShadow: pressed(rgb, dark, 2, 4)
      }}
    >
      {icon && (
        <span className="shrink-0" style={{ color: accent }}>
          <Icon d={icon} className="w-3.5 h-3.5" />
        </span>
      )}
      <span className="truncate">{text}</span>
    </span>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function BookListCard({
  book,
  index = 0,
  isDark = false,
  genreLabel,
  isBatchMode = false,
  isSelected = false,
  onSelect,
  onView,
  onEdit
}: {
  book: Book
  index?: number
  isDark?: boolean
  genreLabel?: string
  isBatchMode?: boolean
  isSelected?: boolean
  onSelect?: () => void
  onView: () => void
  onEdit: () => void
}) {
  const b = book as Book & Extra
  const dark = isDark
  const P = palette(dark)
  const statusKey =
    statusTheme[book.status] ? book.status : 'Unread'
  const st = statusTheme[statusKey]
  const acc = dark ? st.from : st.to
  const wellBg = dark ? 'rgba(0,0,0,.22)' : `rgba(${st.rgb},.08)`

  const cover = !!(book.coverFile || book.photoUrl)
  const totalPages = book.totalPages || b.pageCount || 0
  const year = book.launchYear || b.originalPublicationYear || b.yearPublished
  const rating = Math.max(0, Math.min(5, book.rating || 0))
  const hasFormat = Boolean(book.format && book.format !== 'None')
  const copiesN =
    b.ownedCopies || (Array.isArray(b.copies) ? b.copies.length : 0)
  const genreText = genreLabel || book.genre
  const extraAuthors = b.additionalAuthors
    ? b.additionalAuthors.split(',').filter(s => s.trim()).length
    : 0

  // Series can arrive as a string or as { name, number }
  const rawSeries: unknown = b.series
  const seriesObj =
    rawSeries && typeof rawSeries === 'object'
      ? (rawSeries as { name?: string; number?: number | string })
      : null
  const seriesName =
    typeof rawSeries === 'string' ? rawSeries : seriesObj?.name || ''
  const volumeLabel =
    book.volume || (seriesObj?.number ? String(seriesObj.number) : '')

  const progress = progressPercent(book) ?? -1
  const lastRead = timeAgo(b.lastReadTimestamp)
  const progressLabel =
    statusKey === 'Read'
      ? 'Finished'
      : book.currentPage != null && totalPages > 0
        ? `Page ${book.currentPage} of ${totalPages}`
        : 'Progress unknown'

  // Fact chips
  type FactT = { title: string; text: string; icon?: string }
  const fact = (title: string, text: unknown, icon?: string): FactT | null =>
    text ? { title, text: String(text), icon } : null
  const hoursOk =
    book.hours && parseFloat(book.hours.replace(/[^0-9.]/g, '')) > 0
  const facts = [
    hasFormat
      ? fact('Format', book.format, formatIcon[book.format] ?? icons.book)
      : null,
    fact('Pages', totalPages ? `${totalPages} pages` : '', icons.pages),
    fact('Reading time', hoursOk ? book.hours : '', icons.clock),
    fact('Published', year, icons.calendar),
    fact('Language', book.originalLanguage, icons.globe),
    fact('Publisher', b.publisher, icons.building),
    fact('Shelf', book.shelfRow || book.shelfLocation, icons.pin),
    fact('Condition', book.condition, icons.shield),
    fact(
      'Paid',
      book.purchased && (book.purchasePrice || 0) > 0
        ? new Intl.NumberFormat(undefined, { style: 'currency', currency: book.currency || 'INR' }).format(book.purchasePrice || 0)
        : ''
    )
  ]
    .filter((f): f is FactT => f !== null)
    .slice(0, 8)

  const tags = toList(b.tags).slice(0, 3)
  const quotesN = Array.isArray(b.quotes) ? b.quotes.length : 0
  const indicators = [
    quotesN > 0 && {
      icon: icons.quotes,
      label: String(quotesN),
      title: `${quotesN} saved quotes`
    },
    b.myReview && { icon: icons.pages, label: 'Review', title: 'Has a review' },
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

  const activate = isBatchMode ? onSelect : onView
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      activate?.()
    }
  }

  const sheen = dark
    ? ''
    : 'linear-gradient(160deg, rgba(255,255,255,.55) 0%, rgba(255,255,255,0) 35%), '
  const cardStyle = {
    backgroundColor: P.panel,
    backgroundImage: `${sheen}linear-gradient(135deg, rgba(${st.rgb},${dark ? 0.14 : 0.12}) 0%, rgba(${st.rgb},0) 55%)`,
    '--clay': isSelected
      ? pressed(NEUTRAL_RGB, dark, 6, 14)
      : raised(NEUTRAL_RGB, dark, 9, 24),
    '--clay-hover': raised(NEUTRAL_RGB, dark, 15, 36),
    animationDelay: `${(index % 20) * 20}ms`
  } as CSSProperties

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`View ${book.title}`}
      onClick={activate}
      onKeyDown={onKey}
      style={cardStyle}
      className={`
        group relative flex gap-3.5 sm:gap-6 rounded-[30px] sm:rounded-[36px] p-3 pl-4 sm:p-4 sm:pl-6
        cursor-pointer select-none animate-slide-up
        transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
        [box-shadow:var(--clay)]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/50
        ${
          isSelected
            ? 'ring-4 ring-secondary/40 scale-[0.99]'
            : 'hover:[box-shadow:var(--clay-hover)] hover:-translate-y-1.5'
        }
        ${isBatchMode ? 'active:scale-[0.98]' : 'active:scale-[0.99]'}
      `}
    >
      {/* Status spine */}
      <span
        aria-hidden="true"
        className="absolute left-0 top-8 bottom-8 w-1.5 rounded-r-full"
        style={{
          background: `linear-gradient(180deg, ${st.from}, ${st.to})`,
          boxShadow: `0 0 10px rgba(${st.rgb},.55)`
        }}
      />

      {/* Batch checkbox */}
      {isBatchMode && (
        <div className="absolute top-2.5 left-3 sm:top-4 sm:left-5 z-30">
          <div
            className="w-7 h-7 rounded-xl flex items-center justify-center transition-all"
            style={
              isSelected
                ? clayFill(st.rgb, st.from, st.to, 3)
                : {
                    background: dark
                      ? 'rgba(255,255,255,.1)'
                      : 'rgba(255,255,255,.9)',
                    color: 'transparent',
                    boxShadow: pressed(st.rgb, dark, 2, 4)
                  }
            }
          >
            <Icon d={icons.check} className="w-4 h-4" stroke={3} />
          </div>
        </div>
      )}

      {/* ── Cover ── */}
      <div
        className="relative shrink-0 self-start rounded-[24px] sm:rounded-[28px] p-2.5 sm:p-3.5 overflow-hidden"
        style={{ background: wellBg }}
      >
        {cover && (
          <div
            aria-hidden="true"
            className="absolute inset-0 scale-125 blur-xl opacity-40 group-hover:opacity-60 transition-opacity duration-700"
          ><BookCover book={book} decorative className="h-full w-full object-cover" /></div>
        )}
        <div
          className="relative w-[84px] sm:w-[132px] aspect-[2/3] rounded-xl sm:rounded-2xl overflow-hidden -rotate-2 group-hover:rotate-0 group-hover:scale-[1.04] transition-transform duration-500 ease-out"
          style={{
            boxShadow:
              '8px 12px 24px rgba(0,0,0,.35), -2px -2px 6px rgba(255,255,255,.28)'
          }}
        >
          {cover ? (

            <BookCover book={book} className="w-full h-full object-cover" />
          ) : (
            <div
              className="w-full h-full flex flex-col items-center justify-center gap-1.5"
              style={{
                background: `linear-gradient(145deg, ${st.from}, ${st.to})`
              }}
            >
              <span className="text-3xl sm:text-5xl font-black text-white/90 font-syne select-none">
                {(genreText || 'B').charAt(0).toUpperCase()}
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold text-white/70">
                No cover
              </span>
            </div>
          )}
          {/* Spine + sheen, light enough to keep the cover crisp */}
          <span
            aria-hidden="true"
            className="absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-black/25 to-transparent"
          />
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent"
          />
        </div>
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-[inherit] pointer-events-none"
          style={{ boxShadow: pressed(st.rgb, dark, 4, 10) }}
        />
      </div>

      {/* ── Info ── */}
      <div className="flex-1 min-w-0 flex flex-col gap-2.5 sm:gap-3">
        {/* Chips row */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <Tag
            dark={dark}
            rgb={st.rgb}
            fg={acc}
            pulse={statusKey === 'Reading'}
          >
            {book.status}
          </Tag>
          {genreText && (
            <Tag dark={dark} rgb={NEUTRAL_RGB} fg={P.body}>
              {genreText}
            </Tag>
          )}
          {(seriesName || volumeLabel) && (
            <Tag dark={dark} rgb={st.rgb} fg={acc} icon={icons.book}>
              {[seriesName, volumeLabel && `Vol. ${volumeLabel}`]
                .filter(Boolean)
                .join(' ')}
            </Tag>
          )}
        </div>

        {/* Title + rating */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3
              className="font-syne font-black tracking-tight leading-snug text-[16px] sm:text-[21px] line-clamp-2"
              style={{ color: P.title }}
            >
              {book.title}
            </h3>
            <p
              className="mt-0.5 text-[12px] sm:text-[14px] font-semibold truncate"
              style={{ color: P.body }}
            >
              {book.author}
              {extraAuthors > 0 && (
                <span style={{ color: P.faint }}> +{extraAuthors} more</span>
              )}
            </p>
          </div>
          <div className="hidden sm:flex flex-col items-end gap-2 shrink-0">
            <span
              className="text-[11px] font-black tabular-nums px-2.5 py-1 rounded-full"
              style={{
                background: wellBg,
                color: P.faint,
                boxShadow: pressed(st.rgb, dark, 2, 4)
              }}
            >
              #{String(book.id).replace(/\D/g, '')}
            </span>
            {rating > 0 && (
              <span
                className="flex text-[15px] leading-none tracking-[0.04em]"
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
          </div>
        </div>

        {/* Description */}
        <div className="hidden sm:block">
          <p
            className="text-[13px] leading-relaxed line-clamp-2 wrap-break-word"
            style={{ color: P.faint }}
          >
            {book.description || book.summary || 'No description available.'}
          </p>
        </div>
        {/* Progress */}
        {progress >= 0 && (
          <div>
            <div
              className="flex items-baseline justify-between gap-2 mb-1.5 text-[11px] font-semibold"
              style={{ color: P.body }}
            >
              <span className="truncate">
                {progressLabel}
                {statusKey === 'Reading' && lastRead && (
                  <span className="hidden sm:inline" style={{ color: P.faint }}>
                    , last read {lastRead}
                  </span>
                )}
              </span>
              <span
                className="font-black tabular-nums shrink-0"
                style={{ color: acc }}
              >
                {progress}%
              </span>
            </div>
            <div
              className="h-3.5 rounded-full p-[3px]"
              style={{
                background: wellBg,
                boxShadow: pressed(st.rgb, dark, 2, 5)
              }}
            >
              <div
                className="h-full rounded-full transition-[width] duration-700"
                style={{
                  width: `${progress}%`,
                  background: `linear-gradient(90deg, ${st.from}, ${st.to})`,
                  boxShadow: `inset 0 2px 3px rgba(255,255,255,.5), 0 2px 6px rgba(${st.rgb},.45)`
                }}
              />
            </div>
          </div>
        )}

        {/* Facts */}
        {facts.length > 0 && (
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {facts.map((f, i) => (
              <Fact
                key={f.title}
                icon={f.icon}
                text={f.text}
                title={f.title}
                dark={dark}
                rgb={st.rgb}
                accent={acc}
                className={i < 3 ? 'inline-flex' : 'hidden sm:inline-flex'}
              />
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-auto pt-1 flex items-end justify-between gap-3 flex-wrap">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 min-w-0">
            {book.givenTo ? (
              <Tag
                dark={dark}
                rgb="245,158,11"
                fg={dark ? '#fcd34d' : '#b45309'}
              >
                Loaned
                {typeof book.givenTo === 'string' ? ` to ${book.givenTo}` : ''}
              </Tag>
            ) : ['Purchased', 'Gifted'].includes(ownershipOf(book)) ? (
              <Tag
                dark={dark}
                rgb="16,185,129"
                fg={dark ? '#4fe0b0' : '#059669'}
                icon={icons.check}
              >
                Owned{copiesN > 1 ? ` x${copiesN}` : ''}
              </Tag>
            ) : null}
            {book.recommendedBy && (
              <Tag
                dark={dark}
                rgb={NEUTRAL_RGB}
                fg={P.body}
                icon={icons.sparkles}
                title="Recommended by"
              >
                {book.recommendedBy}
              </Tag>
            )}
            {indicators.map(i => (
              <Tag
                key={i.title}
                dark={dark}
                rgb={st.rgb}
                fg={acc}
                icon={i.icon}
                title={i.title}
              >
                {i.label}
              </Tag>
            ))}
            {tags.map(t => (
              <span
                key={t}
                className="hidden md:inline text-[11px] font-semibold"
                style={{ color: P.faint }}
              >
                #{t}
              </span>
            ))}
          </div>

          {!isBatchMode && (
            <div className="flex items-center gap-2.5 shrink-0 ml-auto">
              <button
                onClick={e => {
                  e.stopPropagation()
                  onEdit()
                }}
                aria-label="Edit book"
                title="Edit"
                className="w-10 h-10 rounded-2xl flex items-center justify-center md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 transition-all duration-200 hover:scale-110 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/50"
                style={{
                  background: P.panel,
                  color: acc,
                  boxShadow: raised(NEUTRAL_RGB, dark, 4, 10)
                }}
              >
                <Icon d={icons.edit} className="w-4 h-4" />
              </button>
              <button
                onClick={e => {
                  e.stopPropagation()
                  onView()
                }}
                className="h-10 pl-5 pr-4 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center gap-2 transition-all duration-200 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/50"
                style={clayFill(st.rgb, st.from, st.to, 4)}
              >
                View
                <Icon
                  d={icons.arrow}
                  className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                  stroke={2.5}
                />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
