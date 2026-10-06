'use client'
import { useDialog } from '../hooks/use-dialog'
import BookCover from './BookCover'
import { attachmentType, localToday, progressPercent, calendarDaysBetween } from '@/lib/library-domain'

import type { ReactNode } from 'react'
import { useState } from 'react'
import {
  NEUTRAL_RGB,
  chipShadow,
  clayFill,
  palette,
  pressed,
  raised,
  statusTheme
} from '../clay'
import { Book } from '../types'
import ReadingTimer from './ReadingTimer'
import ShareCardModal from './ShareCardModal'

// Change to match your currency

// Extra Work/Copy fields, typed loosely so this compiles even if `Book` lacks them
type Extra = Partial<{
  series: unknown
  tags: unknown
  collections: unknown
  pageCount: number | null
  binding: string | null
  publisher: string | null
  originalPublicationYear: string | null
  yearPublished: string | null
  readCount: number | null
  dateRead: string | null
  dateAdded: string | null
  myReview: string | null
  privateNotes: string | null
  bookshelves: string | null
}>

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (d?: string | null) => {
  if (!d) return null
  try {
    return new Date(d).toLocaleDateString('en-US', {
      timeZone: 'UTC',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch {
    return d
  }
}

const stripHtml = (html: string) => {
  if (typeof window === 'undefined') return html.replace(/<[^>]*>/g, '')
  const parsed = new DOMParser().parseFromString(html, 'text/html')
  parsed.querySelectorAll('script,style,iframe,object,embed').forEach(node => node.remove())
  return parsed.body.textContent || ''
}
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

const surfaces: Record<'light' | 'dark', Record<string, string>> = {
  light: {
    Unread: '#eef1f8',
    Reading: '#f0ebff',
    Read: '#e6f8ef',
    Wishlist: '#e7f0ff'
  },
  dark: {
    Unread: '#222736',
    Reading: '#26234a',
    Read: '#1d2e2c',
    Wishlist: '#1f2a44'
  }
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const paths = {
  chevron: 'M19 9l-7 7-7-7',
  back: 'M15 19l-7-7 7-7',
  close: 'M6 18L18 6M6 6l12 12',
  edit: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  doc: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  user: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  star: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
  quotes:
    'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z',
  clock: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  lock: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
  tag: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z',
  review:
    'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  sparkles:
    'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z',
  book: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
  external:
    'M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14'
}

const Icon = ({
  d,
  className = 'w-4 h-4',
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

// ─── Clay building blocks ─────────────────────────────────────────────────────
function Chip({
  children,
  dark,
  rgb = '196,106,79',
  fg,
  pulse
}: {
  children: ReactNode
  dark: boolean
  rgb?: string
  fg?: string
  pulse?: boolean
}) {
  const color = fg ?? palette(dark).accent
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
      style={{
        background: dark ? `rgba(${rgb},.2)` : `rgba(${rgb},.13)`,
        color,
        boxShadow: chipShadow(dark)
      }}
    >
      {pulse !== undefined && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${pulse ? 'animate-pulse' : ''}`}
          style={{ background: color }}
        />
      )}
      {children}
    </span>
  )
}

function Well({
  dark,
  children,
  className = '',
  tint
}: {
  dark: boolean
  children: ReactNode
  className?: string
  tint?: string
}) {
  const P = palette(dark)
  return (
    <div
      className={`rounded-[24px] p-4 ${className}`}
      style={{
        background: tint
          ? dark
            ? `rgba(${tint},.16)`
            : `rgba(${tint},.09)`
          : P.well,
        boxShadow: pressed(NEUTRAL_RGB, dark, 3, 8)
      }}
    >
      {children}
    </div>
  )
}

function Section({
  icon,
  title,
  dark,
  children
}: {
  icon: string
  title: string
  dark: boolean
  children: ReactNode
}) {
  const P = palette(dark)
  return (
    <section>
      <div className="flex items-center gap-2.5 mb-3">
        <span
          className="w-7 h-7 rounded-xl flex items-center justify-center"
          style={{
            background: P.panel,
            color: P.accent,
            boxShadow: raised(NEUTRAL_RGB, dark, 3, 7)
          }}
        >
          <Icon d={icon} className="w-3.5 h-3.5" />
        </span>
        <h3
          className="text-[14px] font-syne font-black"
          style={{ color: P.title }}
        >
          {title}
        </h3>
      </div>
      {children}
    </section>
  )
}

function RoundButton({
  dark,
  onClick,
  label,
  children
}: {
  dark: boolean
  onClick: () => void
  label: string
  children: ReactNode
}) {
  const P = palette(dark)
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="w-10 h-10 shrink-0 rounded-2xl flex items-center justify-center transition-all duration-200 hover:-translate-y-0.5 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/50"
      style={{
        background: P.panel,
        color: P.body,
        boxShadow: raised(NEUTRAL_RGB, dark, 4, 10)
      }}
    >
      {children}
    </button>
  )
}

function ExpandableText({
  text,
  limit = 360,
  dark = false
}: {
  text: string
  limit?: number
  dark?: boolean
}) {
  const P = palette(dark)
  const [expanded, setExpanded] = useState(false)
  const plain = stripHtml(text)
  const isLong = plain.length > limit
  return (
    <div>
      <p
        className="text-[13px] leading-relaxed whitespace-pre-line"
        style={{ color: P.body }}
      >
        {isLong && !expanded ? plain.slice(0, limit) + '…' : plain}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="mt-2 text-[12px] font-bold flex items-center gap-1 transition-opacity hover:opacity-80"
          style={{ color: P.accent }}
        >
          {expanded ? 'Read less' : 'Read more'}
          <Icon
            d={paths.chevron}
            className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`}
            stroke={2.5}
          />
        </button>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function BookViewModal({
  book,
  onClose,
  onEdit,
  onReadPdf,
  isDark = false
}: {
  book: Book
  onClose: () => void
  onEdit?: () => void
  onReadPdf?: () => void
  isDark?: boolean
}) {
  const dialogRef = useDialog(onClose)
  const [isSharing, setIsSharing] = useState(false)
  const [isTiming, setIsTiming] = useState(false)

  const b = book as Book & Extra
  const P = palette(isDark)
  const st = statusTheme[book.status] ?? statusTheme.Unread
  const acc = isDark ? st.from : st.to
  const surface =
    surfaces[isDark ? 'dark' : 'light'][book.status] ??
    surfaces[isDark ? 'dark' : 'light'].Unread
  const wellL = isDark ? 'rgba(0,0,0,.22)' : `rgba(${st.rgb},.09)`
  const Rs = (d?: number, bl?: number) => raised(st.rgb, isDark, d, bl)
  const Vs = (d?: number, bl?: number) => pressed(st.rgb, isDark, d, bl)
  const Rn = (d?: number, bl?: number) => raised(NEUTRAL_RGB, isDark, d, bl)
  const Vn = (d?: number, bl?: number) => pressed(NEUTRAL_RGB, isDark, d, bl)

  const cover = !!(book.coverFile || book.photoUrl)
  const totalPages = book.totalPages || b.pageCount || 0
  const daysOut = calendarDaysBetween(book.loanDate)
  const activeLoan = book.loans.find(loan => !loan.dateReturned)
  const isOverdue = activeLoan?.expectedReturnDate ? localToday() > activeLoan.expectedReturnDate : daysOut !== null && daysOut > 30
  const startDate = formatDate(book.readingStartDate)
  const endDate = formatDate(book.readingEndDate) || formatDate(b.dateRead)
  const loanDate = formatDate(book.loanDate)

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

  const tagList = toList(b.tags)
  const collectionList = toList(b.collections)

  const progress = progressPercent(book) ?? -1

  // Meta rows
  type Row = { label: string; value: string }
  const row = (label: string, value: unknown): Row | null =>
    value ? { label, value: String(value) } : null
  const rows = [
    row('ISBN', book.isbn),
    row('Publisher', b.publisher),
    row('Language', book.originalLanguage),
    row('Country', book.countryOfOrigin),
    row(
      'Published',
      book.launchYear || b.originalPublicationYear || b.yearPublished
    ),
    row('Pages', totalPages || ''),
    row('Binding', b.binding),
    row('Shelf', book.shelfRow || book.shelfLocation),
    row('Condition', book.condition),
    row(
      'Paid',
      book.purchased && (book.purchasePrice || 0) > 0
        ? new Intl.NumberFormat(undefined, { style: 'currency', currency: book.currency || 'INR' }).format(book.purchasePrice || 0)
        : ''
    ),
    row('Via', book.recommendedBy),
    row('Read count', (b.readCount || 0) > 1 ? `${b.readCount}x` : ''),
    row('Added', formatDate(b.dateAdded)),
    row('Shelves', b.bookshelves)
  ].filter((r): r is Row => r !== null)

  const hasActions =
    book.status === 'Read' ||
    (book.format === 'Physical' && ['Unread', 'Reading'].includes(book.status)) ||
    (book.pdfPath && onReadPdf) ||
    book.amazonLink
  const actionCls =
    'w-full py-3 rounded-full text-[12px] font-bold flex items-center justify-center gap-2 transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97]'

  const editAndClose = () => {
    onClose()
    setTimeout(onEdit!, 60)
  }

  // ── Content sections (right side on desktop, below hero on mobile) ─────────
  const contentSections = (
    <div className="flex flex-col gap-6 pb-2">
      {book.description && (
        <Section icon={paths.doc} title="About this book" dark={isDark}>
          <Well dark={isDark}>
            <ExpandableText text={book.description} limit={360} dark={isDark} />
          </Well>
        </Section>
      )}

      {book.authorDescription && (
        <Section icon={paths.user} title="About the author" dark={isDark}>
          <Well dark={isDark}>
            <ExpandableText
              text={book.authorDescription}
              limit={300}
              dark={isDark}
            />
          </Well>
        </Section>
      )}

      {book.summary && (
        <Section icon={paths.edit} title="My notes" dark={isDark}>
          <Well dark={isDark} tint="196,106,79">
            <ExpandableText text={book.summary} limit={280} dark={isDark} />
          </Well>
        </Section>
      )}

      {b.myReview && (
        <Section icon={paths.review} title="My review" dark={isDark}>
          <Well dark={isDark} tint="16,185,129">
            <ExpandableText text={b.myReview} limit={300} dark={isDark} />
          </Well>
        </Section>
      )}

      {b.privateNotes && (
        <Section icon={paths.lock} title="Private notes" dark={isDark}>
          <Well dark={isDark} tint="245,158,11">
            <ExpandableText text={b.privateNotes} limit={300} dark={isDark} />
          </Well>
        </Section>
      )}

      {(tagList.length > 0 || collectionList.length > 0) && (
        <Section icon={paths.tag} title="Tags and collections" dark={isDark}>
          <div className="flex flex-wrap gap-2">
            {collectionList.map(c => (
              <Chip key={`c-${c}`} dark={isDark}>
                {c}
              </Chip>
            ))}
            {tagList.map(t => (
              <Chip key={`t-${t}`} dark={isDark} rgb="140,120,100" fg={P.body}>
                #{t}
              </Chip>
            ))}
          </div>
        </Section>
      )}

      {(book.rating || 0) > 0 && (
        <Section icon={paths.star} title="Your rating" dark={isDark}>
          <Well
            dark={isDark}
            tint="245,158,11"
            className="flex items-center gap-3"
          >
            <div className="flex gap-0.5 text-2xl leading-none">
              {[1, 2, 3, 4, 5].map(s => (
                <span
                  key={s}
                  className={
                    s <= (book.rating || 0)
                      ? 'text-amber-400 drop-shadow-[0_1px_2px_rgba(245,158,11,.5)]'
                      : ''
                  }
                  style={
                    s <= (book.rating || 0)
                      ? undefined
                      : {
                          color: isDark
                            ? 'rgba(255,255,255,.12)'
                            : 'rgba(100,116,139,.22)'
                        }
                  }
                >
                  ★
                </span>
              ))}
            </div>
            <span
              className="text-sm font-black"
              style={{ color: isDark ? '#fcd34d' : '#b45309' }}
            >
              {
                ['', 'Terrible', 'Meh', 'Good', 'Great', 'Must read'][
                  book.rating || 0
                ]
              }
            </span>
          </Well>
        </Section>
      )}

      {(book.quotes?.length || 0) > 0 && (
        <Section
          icon={paths.quotes}
          title={`Favourite quotes (${book.quotes?.length})`}
          dark={isDark}
        >
          <div className="flex flex-col gap-4">
            {(book.quotes || []).map((q, i) => (
              <blockquote
                key={i}
                className="rounded-[22px] p-4"
                style={{ background: P.panel, boxShadow: Rn(5, 14) }}
              >
                <p
                  className="text-[13px] italic leading-relaxed"
                  style={{ color: P.body }}
                >
                  {q.text}
                </p>
                {q.page && (
                  <cite
                    className="mt-2 block text-[11px] not-italic font-semibold"
                    style={{ color: P.faint }}
                  >
                    Page {q.page}
                  </cite>
                )}
              </blockquote>
            ))}
          </div>
        </Section>
      )}

      {(book.readingSessions?.length || 0) > 0 && (
        <Section icon={paths.clock} title="Reading sessions" dark={isDark}>
          <div className="flex flex-col gap-3">
            {[...(book.readingSessions || [])].reverse().map((s, i) => {
              const pagesRead = s.endPage - s.startPage
              return (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 p-3.5 rounded-[20px]"
                  style={{ background: P.panel, boxShadow: Rn(4, 10) }}
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span
                      className="text-[13px] font-bold"
                      style={{ color: P.title }}
                    >
                      {new Date(s.date).toLocaleDateString('en-US', {
                        timeZone: 'UTC',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                    <span className="text-[11px]" style={{ color: P.faint }}>
                      Page {s.startPage} to {s.endPage}
                      {pagesRead > 0 && ` (${pagesRead} pages)`}
                    </span>
                  </div>
                  {s.durationMinutes > 0 && (
                    <Chip dark={isDark}>{s.durationMinutes} min</Chip>
                  )}
                </div>
              )
            })}
            {book.currentPage && totalPages > 0 && (
              <Well
                dark={isDark}
                tint="196,106,79"
                className="flex items-center gap-4 !p-3.5"
              >
                <div className="flex-1">
                  <div
                    className="flex justify-between mb-2 text-[11px] font-bold"
                    style={{ color: P.accent }}
                  >
                    <span>Progress</span>
                    <span className="tabular-nums">
                      {Math.round((book.currentPage / totalPages) * 100)}%
                    </span>
                  </div>
                  <div
                    className="h-3 rounded-full p-[3px]"
                    style={{ background: P.well, boxShadow: Vn(2, 5) }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(8, Math.min(100, Math.round((book.currentPage / totalPages) * 100)))}%`,
                        background: 'linear-gradient(90deg,#e38a71,#c46a4f)'
                      }}
                    />
                  </div>
                </div>
                <span
                  className="text-[12px] font-black shrink-0 tabular-nums"
                  style={{ color: P.accent }}
                >
                  {book.currentPage}/{totalPages}
                </span>
              </Well>
            )}
          </div>
        </Section>
      )}

      {!book.description &&
        !book.summary &&
        !book.authorDescription &&
        !b.myReview &&
        !b.privateNotes &&
        !tagList.length &&
        !collectionList.length &&
        !book.quotes?.length &&
        !book.readingSessions?.length && (
          <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{
                background: P.panel,
                color: P.faint,
                boxShadow: Rn(6, 16)
              }}
            >
              <Icon d={paths.doc} className="w-7 h-7" stroke={1.5} />
            </div>
            <p
              className="font-syne font-black text-sm"
              style={{ color: P.title }}
            >
              No description yet
            </p>
            <p className="text-xs max-w-[240px]" style={{ color: P.faint }}>
              Edit the book to add notes or search by ISBN to auto-fill.
            </p>
          </div>
        )}
    </div>
  )

  // ── Left content: cover, identity, progress, meta, actions ─────────────────
  const leftContent = (
    <>
      {/* Cover well */}
      <div
        className="relative rounded-[30px] overflow-hidden flex items-center justify-center py-7"
        style={{ background: wellL }}
      >
        {cover && (
          <div
            className="absolute inset-0 scale-125 blur-2xl opacity-40"
            aria-hidden="true"
          ><BookCover book={book} decorative className="h-full w-full object-cover" /></div>
        )}
        <div
          className="relative z-10 w-[130px] sm:w-[150px] aspect-[2/3] rounded-2xl overflow-hidden -rotate-2 hover:rotate-0 transition-transform duration-500"
          style={{
            boxShadow:
              '10px 16px 30px rgba(0,0,0,.35), -2px -2px 8px rgba(255,255,255,.25)'
          }}
        >
          {cover ? (

            <BookCover book={book} className="w-full h-full object-cover" />
          ) : (
            <div
              className="w-full h-full flex flex-col items-center justify-center gap-2"
              style={{
                background: `linear-gradient(145deg, ${st.from}, ${st.to})`
              }}
            >
              <span className="text-5xl font-black text-white/85 font-syne select-none">
                {(genreLabels[book.genre] || book.genre || 'B').charAt(0)}
              </span>
              <span className="text-[10px] font-bold text-white/70">
                No cover
              </span>
            </div>
          )}
        </div>
        <div
          className="absolute inset-0 rounded-[inherit] pointer-events-none z-20"
          style={{ boxShadow: Vs(5, 12) }}
        />
      </div>

      {/* Identity */}
      <div className="px-1">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <Chip
            dark={isDark}
            rgb={st.rgb}
            fg={acc}
            pulse={book.status === 'Reading'}
          >
            {book.status}
          </Chip>
          {book.genre && (
            <Chip dark={isDark} rgb={st.rgb} fg={P.body}>
              {genreLabels[book.genre] || book.genre}
            </Chip>
          )}
          {book.launchYear && (
            <Chip dark={isDark} rgb={st.rgb} fg={P.body}>
              {book.launchYear}
            </Chip>
          )}
        </div>
        <h2
          className="font-syne font-black text-[20px] tracking-tight leading-snug"
          style={{ color: P.title }}
        >
          {book.title}
        </h2>
        <p className="mt-1 text-[13px] font-semibold" style={{ color: P.body }}>
          {book.author}
          {b.additionalAuthors && (
            <span style={{ color: P.faint }}> + {b.additionalAuthors}</span>
          )}
        </p>
        {(seriesName || volumeLabel) && (
          <p
            className="mt-1.5 flex items-center gap-2 text-[12px] font-semibold"
            style={{ color: acc }}
          >
            {seriesName && (
              <span className="italic truncate">{seriesName}</span>
            )}
            {volumeLabel && (
              <span
                className="px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0"
                style={{
                  background: isDark
                    ? `rgba(${st.rgb},.2)`
                    : `rgba(${st.rgb},.13)`
                }}
              >
                Vol. {volumeLabel}
              </span>
            )}
          </p>
        )}
        {(book.rating || 0) > 0 && (
          <div className="mt-3 flex text-lg leading-none">
            {[1, 2, 3, 4, 5].map(s => (
              <span
                key={s}
                className={
                  s <= (book.rating || 0)
                    ? 'text-amber-400 drop-shadow-[0_1px_2px_rgba(245,158,11,.5)]'
                    : ''
                }
                style={
                  s <= (book.rating || 0)
                    ? undefined
                    : {
                        color: isDark
                          ? 'rgba(255,255,255,.12)'
                          : 'rgba(100,116,139,.22)'
                      }
                }
              >
                ★
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Progress */}
      {progress >= 0 && (
        <div>
          <div
            className="flex items-baseline justify-between mb-2 text-[11px] font-semibold"
            style={{ color: P.body }}
          >
            <span>
              {book.status === 'Read'
                ? 'Completed'
                : book.currentPage && totalPages > 0
                  ? `Page ${book.currentPage} of ${totalPages}`
                  : 'Progress'}
            </span>
            <span className="font-black tabular-nums" style={{ color: acc }}>
              {progress}%
            </span>
          </div>
          <div
            className="h-3.5 rounded-full p-[3px]"
            style={{ background: wellL, boxShadow: Vs(2, 5) }}
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

      {/* Quick tiles */}
      <div className="grid grid-cols-3 gap-2.5">
        {[
          {
            label: 'Format',
            value: book.format === 'None' ? '—' : book.format || '—'
          },
          { label: 'Hours', value: book.hours || '—' },
          { label: 'Volume', value: volumeLabel || '—' }
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-2xl px-2 py-2.5 flex flex-col items-center text-center min-w-0"
            style={{ background: wellL, boxShadow: Vs(2, 5) }}
          >
            <p className="text-[10px] font-semibold" style={{ color: P.faint }}>
              {label}
            </p>
            <p
              className="text-[12px] font-black mt-0.5 truncate max-w-full"
              style={{ color: P.title }}
            >
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Meta list */}
      {rows.length > 0 && (
        <div
          className="rounded-[24px] overflow-hidden"
          style={{ background: wellL, boxShadow: Vs(3, 8) }}
        >
          {rows.map((r, i) => (
            <div
              key={r.label}
              className="flex items-center justify-between gap-3 px-4 py-2.5"
              style={
                i < rows.length - 1
                  ? { borderBottom: `1px solid rgba(${st.rgb},.14)` }
                  : undefined
              }
            >
              <span
                className="text-[11px] font-semibold shrink-0"
                style={{ color: P.faint }}
              >
                {r.label}
              </span>
              <span
                className="text-[12px] font-bold text-right truncate"
                style={{ color: P.title }}
                title={r.value}
              >
                {r.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Timeline */}
      {(startDate || endDate) && (
        <div
          className="rounded-[24px] p-4 flex flex-col gap-3"
          style={{
            background: isDark
              ? 'rgba(196,106,79,.16)'
              : 'rgba(196,106,79,.09)',
            boxShadow: Vs(3, 8)
          }}
        >
          <span className="text-[12px] font-bold" style={{ color: P.accent }}>
            Reading timeline
          </span>
          {startDate && (
            <div className="flex items-center gap-3">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{
                  background: 'linear-gradient(145deg,#e38a71,#c46a4f)',
                  boxShadow: '0 0 6px rgba(196,106,79,.6)'
                }}
              />
              <div>
                <p className="text-[10px]" style={{ color: P.faint }}>
                  Started
                </p>
                <p className="text-[12px] font-bold" style={{ color: P.title }}>
                  {startDate}
                </p>
              </div>
            </div>
          )}
          {endDate && (
            <div className="flex items-center gap-3">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{
                  background: 'linear-gradient(145deg,#4fe0b0,#10b981)',
                  boxShadow: '0 0 6px rgba(16,185,129,.6)'
                }}
              />
              <div>
                <p className="text-[10px]" style={{ color: P.faint }}>
                  Finished
                </p>
                <p className="text-[12px] font-bold" style={{ color: P.title }}>
                  {endDate}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loan info */}
      {book.givenTo && (
        <div
          className="rounded-[24px] p-4"
          style={{
            background: isOverdue
              ? isDark
                ? 'rgba(244,63,94,.16)'
                : 'rgba(244,63,94,.09)'
              : isDark
                ? 'rgba(245,158,11,.16)'
                : 'rgba(245,158,11,.10)',
            boxShadow: Vs(3, 8)
          }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span
              className="text-[12px] font-bold"
              style={{
                color: isOverdue
                  ? isDark
                    ? '#fda4af'
                    : '#be123c'
                  : isDark
                    ? '#fcd34d'
                    : '#b45309'
              }}
            >
              {isOverdue ? 'Overdue' : 'On loan'}
            </span>
            {daysOut !== null && (
              <Chip
                dark={isDark}
                rgb={isOverdue ? '244,63,94' : '245,158,11'}
                fg={
                  isOverdue
                    ? isDark
                      ? '#fda4af'
                      : '#be123c'
                    : isDark
                      ? '#fcd34d'
                      : '#b45309'
                }
              >
                {daysOut}d
              </Chip>
            )}
          </div>
          <p className="text-sm font-bold" style={{ color: P.title }}>
            {typeof book.givenTo === 'string' ? book.givenTo : 'Borrowed'}
          </p>
          {loanDate && (
            <p className="text-[11px] mt-0.5" style={{ color: P.faint }}>
              Since {loanDate}
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      {hasActions && (
        <div className="flex flex-col gap-3 pt-1">
          {book.status === 'Read' && (
            <button
              onClick={() => setIsSharing(true)}
              className={actionCls}
              style={clayFill(
                statusTheme.Read.rgb,
                statusTheme.Read.from,
                statusTheme.Read.to,
                4
              )}
            >
              <Icon d={paths.sparkles} className="w-4 h-4" />
              Share to socials
            </button>
          )}
          {book.format === 'Physical' && ['Unread', 'Reading'].includes(book.status) && (
            <button
              onClick={() => setIsTiming(true)}
              className={actionCls}
              style={clayFill('245,158,11', '#fbbf24', '#f59e0b', 4)}
            >
              <Icon d={paths.clock} className="w-4 h-4" />
              Start reading session
            </button>
          )}
          {book.pdfPath && onReadPdf && (
            <button
              onClick={onReadPdf}
              className={actionCls}
              style={clayFill('196,106,79', '#e38a71', '#c46a4f', 4)}
            >
              <Icon d={paths.book} className="w-4 h-4" stroke={2.5} />
              Read {attachmentType(book) === 'epub' ? 'EPUB' : 'PDF'}
              {attachmentType(book) === 'pdf' && !!book.currentPage && (
                <span className="opacity-70">p.{book.currentPage}</span>
              )}
            </button>
          )}
          {book.amazonLink && (
            <a
              href={book.amazonLink}
              target="_blank"
              rel="noopener noreferrer"
              className={actionCls}
              style={{
                background: P.panel,
                color: P.body,
                boxShadow: Rs(5, 12)
              }}
            >
              <Icon d={paths.external} className="w-4 h-4" />
              View on Amazon
            </a>
          )}
        </div>
      )}
    </>
  )

  const bookNo = String(book.id).replace('c_', '')

  return (
    <div ref={dialogRef}>
      {/* ══ MOBILE: Full-page slide-in (< sm) ════════════════════════════════ */}
      <div
        className="sm:hidden fixed inset-0 z-50 animate-page-slide-in flex flex-col overflow-hidden"
        style={{ background: P.panel }}
      >
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-4 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <RoundButton dark={isDark} onClick={onClose} label="Back">
                <Icon d={paths.back} stroke={2.5} />
              </RoundButton>
              <Chip dark={isDark} rgb="140,120,100" fg={P.body}>
                Book #{bookNo}
              </Chip>
              {onEdit ? (
                <RoundButton
                  dark={isDark}
                  onClick={editAndClose}
                  label="Edit book"
                >
                  <Icon d={paths.edit} />
                </RoundButton>
              ) : (
                <span className="w-10" />
              )}
            </div>

            <div
              className="rounded-[34px] p-4 flex flex-col gap-4"
              style={{ background: surface, boxShadow: Rs(8, 20) }}
            >
              {leftContent}
            </div>

            {contentSections}
          </div>
        </div>

        {/* Fixed footer */}
        <div
          className="shrink-0 px-4 py-3"
          style={{
            background: P.panel,
            boxShadow: isDark
              ? '0 -8px 24px rgba(0,0,0,.4)'
              : `0 -8px 24px rgba(${NEUTRAL_RGB},.16)`
          }}
        >
          <div className="flex gap-3">
            {onEdit && (
              <button
                onClick={editAndClose}
                className="flex-1 py-3.5 text-[13px] font-bold rounded-full transition-all active:scale-[0.97]"
                style={clayFill(
                  statusTheme.All.rgb,
                  statusTheme.All.from,
                  statusTheme.All.to,
                  4
                )}
              >
                Edit book
              </button>
            )}
            <button
              onClick={onClose}
              className="px-6 py-3.5 text-[13px] font-bold rounded-full transition-all active:scale-[0.97]"
              style={{
                background: P.panel,
                color: P.body,
                boxShadow: Rn(4, 10)
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* ══ DESKTOP: Modal overlay (≥ sm) ════════════════════════════════════ */}
      <div
        className="hidden sm:flex fixed inset-0 z-50 items-center justify-center animate-fade-in p-4"
        style={{
          background: isDark ? 'rgba(6,8,16,.72)' : 'rgba(40,32,80,.42)',
          backdropFilter: 'blur(14px)'
        }}
        onClick={e => {
          if (e.target === e.currentTarget) onClose()
        }}
      >
        <div
          className="relative w-full max-w-[940px] xl:max-w-[1000px] flex animate-scale-in overflow-hidden rounded-[40px]"
          style={{
            height: '88dvh',
            maxHeight: '88dvh',
            boxShadow: Rn(18, 50)
          }}
        >
          {/* Left panel: status-tinted, scrolls on its own */}
          <div
            className="w-[290px] xl:w-[310px] shrink-0 flex flex-col gap-4 overflow-y-auto custom-scrollbar p-4"
            style={{ background: surface }}
          >
            {leftContent}
          </div>

          {/* Right panel */}
          <div
            className="flex-1 flex flex-col overflow-hidden min-w-0"
            style={{ background: P.panel }}
          >
            <div className="shrink-0 px-7 pt-6 pb-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <Chip dark={isDark} rgb="140,120,100" fg={P.body}>
                  Book #{bookNo}
                </Chip>
                <h3
                  className="mt-2 text-lg font-syne font-black leading-tight line-clamp-1"
                  style={{ color: P.title }}
                >
                  {book.title}
                </h3>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {onEdit && (
                  <button
                    onClick={editAndClose}
                    className="h-10 px-5 text-[12px] font-bold rounded-2xl flex items-center gap-2 transition-all hover:-translate-y-0.5 active:scale-95"
                    style={clayFill(
                      statusTheme.All.rgb,
                      statusTheme.All.from,
                      statusTheme.All.to,
                      4
                    )}
                  >
                    <Icon d={paths.edit} className="w-4 h-4" />
                    Edit book
                  </button>
                )}
                <RoundButton dark={isDark} onClick={onClose} label="Close">
                  <Icon d={paths.close} stroke={2.5} />
                </RoundButton>
              </div>
            </div>

            <div
              className="mx-7 h-1.5 rounded-full shrink-0"
              style={{ background: P.well, boxShadow: Vn(1, 2) }}
            />

            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-7 py-6">
              {contentSections}
            </div>

            <div className="shrink-0 px-7 py-4 flex items-center gap-2.5 flex-wrap">
              {book.purchased && (
                <Chip
                  dark={isDark}
                  rgb="16,185,129"
                  fg={isDark ? '#4fe0b0' : '#059669'}
                >
                  Owned
                </Chip>
              )}
              {book.givenTo && (
                <Chip
                  dark={isDark}
                  rgb="245,158,11"
                  fg={isDark ? '#fcd34d' : '#b45309'}
                >
                  On loan
                </Chip>
              )}
              {book.format && book.format !== 'None' && (
                <Chip dark={isDark} rgb="140,120,100" fg={P.body}>
                  {book.format}
                </Chip>
              )}
              {book.isbn && (
                <Chip dark={isDark} rgb="140,120,100" fg={P.body}>
                  ISBN {book.isbn}
                </Chip>
              )}
            </div>
          </div>
        </div>
      </div>

      {isSharing && (
        <ShareCardModal
          book={book}
          // isDark={isDark}
          onClose={() => setIsSharing(false)}
        />
      )}

      {isTiming && (
        <ReadingTimer
          book={book}
          onClose={() => setIsTiming(false)}

        />
      )}
    </div>
  )
}
