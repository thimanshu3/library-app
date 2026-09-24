'use client'

import { useEffect, useState } from 'react'
import { Book } from '../types'
import ShareCardModal from './ShareCardModal'
import ReadingTimer from './ReadingTimer'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (d?: string) => {
  if (!d) return null
  try {
    return new Date(d).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch {
    return d
  }
}
const getDaysOut = (loanDate?: string): number | null => {
  if (!loanDate) return null
  return Math.floor((Date.now() - new Date(loanDate).getTime()) / 86400000)
}
const stripHtml = (html: string) => {
  if (typeof window === 'undefined') return html.replace(/<[^>]*>/g, '')
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent || div.innerText || ''
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

// ─── Read More / Less ─────────────────────────────────────────────────────────
function ExpandableText({
  text,
  limit = 360,
  isDark = false
}: {
  text: string
  limit?: number
  isDark?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const plain = stripHtml(text)
  const isLong = plain.length > limit
  return (
    <div>
      <p className={`text-[13px] leading-relaxed ${isDark ? 'text-white/70' : 'text-slate-600'}`}>
        {isLong && !expanded ? plain.slice(0, limit) + '…' : plain}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="mt-2 text-[11px] font-black text-secondary hover:text-secondary-dim transition-colors flex items-center gap-1"
        >
          {expanded ? 'Read less' : 'Read more'}
          <svg
            className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      )}
    </div>
  )
}

// ─── Section heading ──────────────────────────────────────────────────────────
function SectionLabel({
  icon,
  title,
  isDark = false
}: {
  icon: React.ReactNode
  title: string
  isDark?: boolean
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-secondary/70 w-3.5 h-3.5 shrink-0 flex items-center justify-center">
        {icon}
      </span>
      <h3 className={`text-[9px] font-black uppercase tracking-[0.18em] ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
        {title}
      </h3>
    </div>
  )
}

// ─── Tiny pill ────────────────────────────────────────────────────────────────
function Pill({
  children,
  variant = 'slate',
  isDark = false
}: {
  children: React.ReactNode
  variant?: 'slate' | 'indigo' | 'emerald' | 'amber' | 'red' | 'violet'
  isDark?: boolean
}) {
  const vLight: Record<string, string> = {
    slate: 'bg-black/[0.06] text-slate-600',
    indigo: 'bg-secondary/10 text-secondary',
    violet: 'bg-secondary/10 text-secondary',
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-700'
  }
  const vDark: Record<string, string> = {
    slate: 'bg-white/10 text-white/60',
    indigo: 'bg-secondary/20 text-secondary-dim',
    violet: 'bg-secondary/20 text-secondary-dim',
    emerald: 'bg-emerald-500/20 text-emerald-400',
    amber: 'bg-amber-500/20 text-amber-400',
    red: 'bg-red-500/20 text-red-400'
  }
  const v = isDark ? vDark : vLight
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.12em] ${v[variant]}`}
    >
      {children}
    </span>
  )
}



// ─── Status config ────────────────────────────────────────────────────────────
const statusConfig: Record<
  string,
  { pill: 'slate' | 'indigo' | 'emerald'; dot: string; bar: string }
> = {
  Unread: {
    pill: 'slate',
    dot: 'bg-slate-400',
    bar: 'from-slate-300 to-slate-400'
  },
  Reading: {
    pill: 'indigo',
    dot: 'bg-secondary animate-pulse',
    bar: 'from-secondary to-secondary-dim'
  },
  Read: {
    pill: 'emerald',
    dot: 'bg-emerald-400',
    bar: 'from-emerald-400 to-emerald-500'
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function BookViewModal({
  book,
  onClose,
  onEdit,
  onReadPdf,
  onSave,
  isDark = false
}: {
  book: Book
  onClose: () => void
  onSave?: (b: Book) => void
  onEdit?: () => void
  onReadPdf?: () => void
  isDark?: boolean
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', h)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', h)
      document.body.style.overflow = ''
    }
  }, [onClose])


  const [isSharing, setIsSharing] = useState(false)
  const [isTiming, setIsTiming] = useState(false)

  const cover = book.coverFile || book.photoUrl || ''
  const daysOut = getDaysOut(book.loanDate)
  const isOverdue = daysOut !== null && daysOut > 30
  const startDate = formatDate(book.readingStartDate)
  const endDate = formatDate(book.readingEndDate)
  const loanDate = formatDate(book.loanDate)
  const sc = statusConfig[book.status] ?? statusConfig.Unread

  // Reading progress
  let progress = -1
  if (book.status === 'Read') progress = 100
  else if (
    book.status === 'Reading' &&
    book.currentPage &&
    book.totalPages &&
    book.totalPages > 0
  ) {
    progress = Math.min(
      99,
      Math.round((book.currentPage / book.totalPages) * 100)
    )
  }

  // ── Content sections ──────────────────────────────────────────────────────
  const contentSections = (
    <div className="flex flex-col gap-5 pb-2">
      {/* About this book */}
      {book.description && (
        <div>
          <SectionLabel
            title="About this Book"
            icon={
              <svg
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                className="w-3.5 h-3.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            }
          />
          <div className={`rounded-2xl p-4 border ${isDark ? 'bg-white/[0.03] border-white/[0.05]' : 'bg-black/[0.03] border-black/[0.05]'}`}>
            <ExpandableText text={book.description} limit={360} isDark={isDark} />
          </div>
        </div>
      )}

      {/* Author bio */}
      {book.authorDescription && (
        <div>
          <SectionLabel
            title="About the Author"
            icon={
              <svg
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                className="w-3.5 h-3.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            }
          />
          <div className={`rounded-2xl p-4 border ${isDark ? 'bg-white/[0.03] border-white/[0.05]' : 'bg-black/[0.03] border-black/[0.05]'}`}>
            <ExpandableText text={book.authorDescription} limit={300} isDark={isDark} />
          </div>
        </div>
      )}

      {/* Personal notes */}
      {book.summary && (
        <div>
          <SectionLabel
            title="My Notes"
            icon={
              <svg
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                className="w-3.5 h-3.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            }
          />
          <div className={`rounded-2xl p-4 border ${isDark ? 'bg-secondary/[0.1] border-secondary/20' : 'bg-secondary/[0.06] border-secondary/10'}`}>
            <ExpandableText text={book.summary} limit={280} isDark={isDark} />
          </div>
        </div>
      )}

      {/* Star Rating */}
      {(book.rating || 0) > 0 && (
        <div>
          <SectionLabel icon={<span>⭐</span>} title="Your Rating" />
          <div className={`flex items-center gap-3 p-4 rounded-2xl border ${isDark ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50/80 border-amber-100/80'}`}>
            <div className="flex gap-0.5 text-xl">
              {[1, 2, 3, 4, 5].map(s => (
                <span
                  key={s}
                  className={
                    s <= (book.rating || 0)
                      ? 'text-amber-400'
                      : isDark ? 'text-white/10' : 'text-slate-200'
                  }
                >
                  ★
                </span>
              ))}
            </div>
            <span className={`text-sm font-black ${isDark ? 'text-amber-500' : 'text-amber-700'}`}>
              {
                ['', 'Terrible', 'Meh', 'Good', 'Great', 'Must Read'][
                  book.rating || 0
                ]
              }
            </span>
          </div>
        </div>
      )}

      {/* Favourite Quotes */}
      {(book.quotes?.length || 0) > 0 && (
        <div>
          <SectionLabel
            isDark={isDark}
            icon={<span>💬</span>}
            title={`Favourite Quotes (${book.quotes?.length})`}
          />
          <div className="flex flex-col gap-3">
            {book.quotes!.map((q, i) => (
              <blockquote
                key={i}
                className="pl-4 border-l-2 border-secondary/30 py-1"
              >
                <p className={`text-[13px] italic leading-relaxed ${isDark ? 'text-white/70' : 'text-slate-600'}`}>
                  {q.text}
                </p>
                {q.page && (
                  <cite className={`text-[10px] mt-1 not-italic block ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
                    — p.{q.page}
                  </cite>
                )}
              </blockquote>
            ))}
          </div>
        </div>
      )}

      {/* Reading Sessions */}
      {(book.readingSessions?.length || 0) > 0 && (
        <div>
          <SectionLabel
            isDark={isDark}
            icon={
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
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
            title="Reading Sessions"
          />
          <div className="flex flex-col gap-2">
            {[...(book.readingSessions || [])].reverse().map((s, i) => {
              const pagesRead = s.endPage - s.startPage
              return (
                <div
                  key={i}
                  className={`flex items-center justify-between p-3 rounded-2xl border ${
                    isDark ? 'bg-white/[0.03] border-white/[0.04]' : 'bg-black/[0.03] border-black/[0.04]'
                  }`}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className={`text-[12px] font-bold ${isDark ? 'text-white' : 'text-slate-700'}`}>
                      {new Date(s.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                    <span className={`text-[10px] ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
                      p.{s.startPage} → p.{s.endPage}
                      {pagesRead > 0 && ` (${pagesRead} pages)`}
                    </span>
                  </div>
                  {s.durationMinutes > 0 && (
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${isDark ? 'bg-secondary/20 text-secondary-dim' : 'bg-secondary/10 text-secondary'}`}>
                      {s.durationMinutes}m
                    </span>
                  )}
                </div>
              )
            })}
            {book.currentPage && book.totalPages && (
              <div className={`flex items-center gap-3 p-3 rounded-2xl border ${isDark ? 'bg-secondary/[0.1] border-secondary/20' : 'bg-secondary/[0.07] border-secondary/15'}`}>
                <div className="flex-1">
                  <div className="flex justify-between mb-1.5">
                    <span className={`text-[9px] font-black uppercase tracking-[0.16em] ${isDark ? 'text-secondary-dim' : 'text-secondary'}`}>
                      Progress
                    </span>
                    <span className={`text-[9px] font-black tabular-nums ${isDark ? 'text-secondary-dim' : 'text-secondary'}`}>
                      {Math.round((book.currentPage / book.totalPages) * 100)}%
                    </span>
                  </div>
                  <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-secondary/20' : 'bg-secondary/10'}`}>
                    <div
                      className="h-full bg-gradient-to-r from-secondary to-secondary-dim rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, Math.round((book.currentPage / book.totalPages) * 100))}%`
                      }}
                    />
                  </div>
                </div>
                <span className={`text-[11px] font-black shrink-0 tabular-nums ${isDark ? 'text-secondary-dim' : 'text-secondary'}`}>
                  {book.currentPage}/{book.totalPages}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!book.description &&
        !book.summary &&
        !book.authorDescription &&
        !book.quotes?.length &&
        !book.readingSessions?.length && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${isDark ? 'bg-white/[0.05]' : 'bg-black/[0.05]'}`}>
              <svg
                className="w-7 h-7 opacity-30"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <p className="font-bold text-slate-500 text-sm">
              No description yet
            </p>
            <p className="text-xs text-slate-400 text-center">
              Edit the book to add notes or search by ISBN to auto-fill.
            </p>
          </div>
        )}
    </div>
  )

  // ── Left panel: large cover + meta ────────────────────────────────────────
  const leftPanel = (
    <div
      className="w-[260px] xl:w-[280px] shrink-0 flex flex-col overflow-y-auto custom-scrollbar"
      style={{ background: 'rgba(30,35,48,0.97)' }}
    >
      {/* Large book cover */}
      <div className="relative flex-none">
        {/* Ambient blurred background */}
        {cover && (
          <div
            className="absolute inset-0 scale-110 blur-3xl opacity-60"
            style={{
              backgroundImage: `url(${cover})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-[#1e2330]/30 via-transparent to-[#1e2330]" />

        {/* Cover image — large & centered */}
        <div className="relative z-10 flex flex-col items-center px-8 pt-14 pb-6">
          <div className="w-full max-w-[164px] aspect-[2/3] rounded-[18px] overflow-hidden shadow-[0_24px_64px_-16px_rgba(0,0,0,0.7),0_8px_24px_-8px_rgba(0,0,0,0.5)] border border-white/10">
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cover}
                alt={book.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900 flex flex-col items-center justify-center gap-3">
                <span className="text-5xl font-black text-white/20 font-syne select-none">
                  {(genreLabels[book.genre] || book.genre || 'B').charAt(0)}
                </span>
                <span className="text-[9px] text-white/30 font-black uppercase tracking-[0.2em]">
                  No Cover
                </span>
              </div>
            )}
          </div>

          {/* Rating stars under cover */}
          {(book.rating || 0) > 0 && (
            <div className="flex gap-0.5 mt-4">
              {[1, 2, 3, 4, 5].map(s => (
                <span
                  key={s}
                  className={`text-sm ${s <= (book.rating || 0) ? 'text-amber-400' : 'text-white/15'}`}
                >
                  ★
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Title + author + status */}
      <div
        className="px-5 pb-5 relative z-10"
        style={{ background: '#1e2330' }}
      >
        {/* Status pill */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.12em] ${
              book.status === 'Reading'
                ? 'bg-secondary/20 text-secondary-dim'
                : book.status === 'Read'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-white/10 text-white/60'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sc.dot}`} />
            {book.status}
          </span>
          {book.genre && (
            <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.12em] bg-white/10 text-white/60">
              {genreLabels[book.genre] || book.genre}
            </span>
          )}
          {book.launchYear && (
            <span className="px-2.5 py-1 rounded-full text-[9px] font-black bg-white/10 text-white/50">
              {book.launchYear}
            </span>
          )}
        </div>

        <h2 className="text-white font-syne font-black text-[18px] xl:text-[20px] tracking-tight leading-snug mb-1">
          {book.title}
        </h2>
        <p className="text-white/55 font-semibold text-[13px]">{book.author}</p>

        {/* Progress bar for Reading */}
        {progress >= 0 && (
          <div className="mt-4">
            <div className="flex justify-between mb-1.5">
              <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.16em]">
                {book.status === 'Read' ? 'Completed' : 'Progress'}
              </span>
              <span className="text-[9px] font-black text-white/40 tabular-nums">
                {progress}%
              </span>
            </div>
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${sc.bar} rounded-full transition-all`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Meta rows */}
      <div
        className="flex-1 px-5 py-4 flex flex-col gap-3"
        style={{
          background: '#1e2330',
          borderTop: '1px solid rgba(255,255,255,0.06)'
        }}
      >
        {/* Quick chips */}
        <div className="grid grid-cols-3 gap-2">
          {[
            {
              label: 'Format',
              value: book.format === 'None' ? '—' : book.format || '—'
            },
            { label: 'Hours', value: book.hours || '—' },
            { label: 'Vol', value: book.volume || '—' }
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded-xl px-2 py-2 flex flex-col items-center text-center"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              <p className="text-[8px] font-black uppercase tracking-[0.14em] text-white/30">
                {label}
              </p>
              <p className="text-[11px] font-black text-white/70 mt-0.5 truncate max-w-full">
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* Meta list */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.06)'
          }}
        >
          {[
            book.isbn && { label: 'ISBN', value: book.isbn },
            book.originalLanguage && {
              label: 'Language',
              value: book.originalLanguage
            },
            book.countryOfOrigin && {
              label: 'Country',
              value: book.countryOfOrigin
            },
            book.launchYear && { label: 'Published', value: book.launchYear },
            book.totalPages && {
              label: 'Pages',
              value: String(book.totalPages)
            },
            book.shelfRow && { label: 'Shelf', value: book.shelfRow },
            book.purchased &&
              book.purchasePrice > 0 && {
                label: 'Paid',
                value: `₹${book.purchasePrice.toFixed(0)}`
              },
            book.recommendedBy && { label: 'Via', value: book.recommendedBy }
          ]
            .filter(Boolean)
            .map(
              (item, i, arr) =>
                item && (
                  <div
                    key={item.label}
                    className={`flex items-center justify-between px-3 py-2.5 ${i < arr.length - 1 ? '' : ''}`}
                    style={
                      i < arr.length - 1
                        ? { borderBottom: '1px solid rgba(255,255,255,0.05)' }
                        : {}
                    }
                  >
                    <span className="text-[9px] font-black uppercase tracking-[0.14em] text-white/30">
                      {item.label}
                    </span>
                    <span className="text-[11px] font-semibold text-white/65 text-right max-w-[55%] truncate">
                      {item.value}
                    </span>
                  </div>
                )
            )}
        </div>

        {/* Timeline */}
        {(startDate || endDate) && (
          <div
            className="rounded-2xl p-3"
            style={{
              background: 'rgba(124,92,252,0.15)',
              border: '1px solid rgba(124,92,252,0.2)'
            }}
          >
            <p className="text-[8px] font-black uppercase tracking-[0.18em] text-secondary-dim mb-2.5">
              Reading Timeline
            </p>
            <div className="flex flex-col gap-2">
              {startDate && (
                <div className="flex items-center gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary-dim shrink-0" />
                  <div>
                    <p className="text-[9px] text-white/30">Started</p>
                    <p className="text-[11px] font-bold text-white/70">
                      {startDate}
                    </p>
                  </div>
                </div>
              )}
              {endDate && (
                <div className="flex items-center gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <div>
                    <p className="text-[9px] text-white/30">Finished</p>
                    <p className="text-[11px] font-bold text-white/70">
                      {endDate}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loan info */}
        {book.givenTo && (
          <div
            className={`p-3 rounded-2xl ${isOverdue ? 'bg-red-500/15 border border-red-500/20' : 'bg-amber-500/15 border border-amber-500/20'}`}
          >
            <div className="flex items-center justify-between mb-1">
              <p
                className={`text-[9px] font-black uppercase tracking-[0.14em] ${isOverdue ? 'text-red-400' : 'text-amber-400'}`}
              >
                {isOverdue ? '⚠ Overdue' : '📚 On Loan'}
              </p>
              {daysOut !== null && (
                <span
                  className={`text-[9px] font-black px-2 py-0.5 rounded-full ${isOverdue ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'}`}
                >
                  {daysOut}d
                </span>
              )}
            </div>
            <p
              className={`text-sm font-bold ${isOverdue ? 'text-red-300' : 'text-amber-300'}`}
            >
              {book.givenTo}
            </p>
            {loanDate && (
              <p
                className={`text-[10px] mt-0.5 ${isOverdue ? 'text-red-400/70' : 'text-amber-400/70'}`}
              >
                Since {loanDate}
              </p>
            )}
          </div>
        )}

        
        {/* Share button */}
        {book.status === 'Read' && (
          <button
            onClick={() => setIsSharing(true)}
            className="w-full mt-2 py-3 rounded-full font-black tracking-[0.1em] uppercase text-[10px] flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
            style={{
              background: 'linear-gradient(135deg, #10b981, #34d399)',
              boxShadow: '0 8px 24px -4px rgba(16,185,129,0.45)',
              color: 'white'
            }}
          >
            ✨ Share to Socials
          </button>
        )}

        
        {/* Timer button */}
        {book.status === 'Reading' && onSave && (
          <button
            onClick={() => setIsTiming(true)}
            className="w-full mt-2 py-3 rounded-full font-black tracking-[0.1em] uppercase text-[10px] flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
            style={{
              background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
              boxShadow: '0 8px 24px -4px rgba(245,158,11,0.45)',
              color: 'white'
            }}
          >
            ⏱️ Start Reading Session
          </button>
        )}

        {/* Read PDF button */}
        {book.pdfPath && onReadPdf && (
          <button
            onClick={onReadPdf}
            className="w-full py-3 rounded-full font-black tracking-[0.1em] uppercase text-[10px] flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
            style={{
              background: 'linear-gradient(135deg, #7c5cfc, #a78bfa)',
              boxShadow: '0 8px 24px -4px rgba(124,92,252,0.45)'
            }}
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
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            Read Document
            {book.currentPage !== undefined && (
              <span className="opacity-60">· p.{book.currentPage}</span>
            )}
          </button>
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* ══ MOBILE: Full-page slide-in (< sm) ════════════════════════════════ */}
      <div
        className="sm:hidden fixed inset-0 z-50 animate-page-slide-in flex flex-col overflow-hidden"
        style={{ background: isDark ? '#0e1018' : '#f7f5ef' }}
      >
        {/* Mobile hero — full-width cover with large image */}
        <div
          className="relative shrink-0 overflow-hidden"
          style={{ height: '320px', background: '#1e2330' }}
        >
          {cover && (
            <div
              className="absolute inset-0 scale-110 opacity-60 blur-3xl"
              style={{
                backgroundImage: `url(${cover})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#1e2330] via-[#1e2330]/60 to-transparent" />

          {/* Back button */}
          <button
            onClick={onClose}
            className="absolute top-4 left-4 z-20 w-9 h-9 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all active:scale-95"
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          {/* Edit button */}
          {onEdit && (
            <button
              onClick={() => {
                onClose()
                setTimeout(onEdit!, 60)
              }}
              className="absolute top-4 right-4 z-20 w-9 h-9 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all active:scale-95"
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
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
          )}

          {/* Large centered cover */}
          <div className="absolute inset-0 flex items-center justify-center z-10 pt-10 pb-24">
            <div className="w-[120px] aspect-[2/3] rounded-[14px] overflow-hidden shadow-[0_24px_64px_-12px_rgba(0,0,0,0.8)] border border-white/10">
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cover}
                  alt={book.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
                  <span className="text-4xl font-black text-white/20 font-syne">
                    {(genreLabels[book.genre] || book.genre || 'B').charAt(0)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Bottom overlay with title */}
          <div className="absolute bottom-0 left-0 right-0 px-5 pb-5 z-10">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.12em] ${
                  book.status === 'Reading'
                    ? 'bg-secondary/20 text-secondary-dim'
                    : book.status === 'Read'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-white/10 text-white/60'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                {book.status}
              </span>
              {book.genre && (
                <span className="px-2.5 py-1 rounded-full text-[9px] font-black bg-white/10 text-white/60 uppercase tracking-[0.12em]">
                  {genreLabels[book.genre] || book.genre}
                </span>
              )}
            </div>
            <h2 className="text-white font-syne font-black text-xl tracking-tight leading-tight line-clamp-2 drop-shadow-lg">
              {book.title}
            </h2>
            <p className="text-white/55 text-[13px] font-semibold mt-0.5">
              {book.author}
            </p>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="px-4 pt-5 pb-4">
            {/* Quick chips */}
            <div className="grid grid-cols-3 gap-2 mb-5">
              {[
                {
                  label: 'Format',
                  value: book.format === 'None' ? '—' : book.format || '—'
                },
                { label: 'Hours', value: book.hours || '—' },
                { label: 'Volume', value: book.volume || '—' }
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className={`backdrop-blur-sm rounded-xl px-2 py-2.5 flex flex-col items-center text-center border ${isDark ? 'bg-white/5 border-white/[0.08]' : 'bg-white/80 border-black/[0.06]'}`}
                >
                  <p className={`text-[9px] font-black uppercase tracking-[0.14em] ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
                    {label}
                  </p>
                  <p className={`text-[12px] font-black mt-0.5 truncate max-w-full ${isDark ? 'text-white/90' : 'text-slate-800'}`}>
                    {value}
                  </p>
                </div>
              ))}
            </div>
            {contentSections}
          </div>
        </div>

        {/* Fixed footer */}
        <div className={`shrink-0 border-t px-4 py-3 backdrop-blur-sm ${isDark ? 'bg-[#0e1018]/90 border-white/[0.06]' : 'bg-white/90 border-black/[0.06]'}`}>
          <div className="flex gap-3">
            {onEdit && (
              <button
                onClick={() => {
                  onClose()
                  setTimeout(onEdit!, 60)
                }}
                className="flex-1 py-3.5 text-[12px] font-black rounded-2xl text-white transition-all active:scale-[0.97]"
                style={{
                  background: 'linear-gradient(135deg, #1e2340, #171b2e)',
                  boxShadow: '0 8px 24px -4px rgba(23,27,46,0.4)'
                }}
              >
                Edit Book
              </button>
            )}
            <button
              onClick={onClose}
              className={`px-5 py-3.5 text-[13px] font-semibold rounded-full transition-all border ${isDark ? 'text-white/70 hover:bg-white/[0.06] border-white/[0.1]' : 'text-slate-600 hover:bg-black/[0.06] border-black/[0.08]'}`}
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
          background: 'rgba(20,22,32,0.75)',
          backdropFilter: 'blur(12px)'
        }}
        onClick={e => {
          if (e.target === e.currentTarget) onClose()
        }}
      >
        <div
          className="relative w-full max-w-[900px] xl:max-w-[960px] flex animate-scale-in overflow-hidden rounded-[28px]"
          style={{
            height: '88dvh',
            maxHeight: '88dvh',
            boxShadow:
              '0 32px 80px -16px rgba(0,0,0,0.6), 0 8px 24px -8px rgba(0,0,0,0.4)'
          }}
        >
          {/* ── Left panel: dark, large cover ── */}
          {leftPanel}

          {/* ── Right panel: warm cream, scrollable content ── */}
          <div
            className="flex-1 flex flex-col overflow-hidden"
            style={{ background: isDark ? 'rgba(18,20,30,0.95)' : 'rgba(255,253,248,0.98)' }}
          >
            {/* Right header */}
            <div className={`shrink-0 px-6 pt-5 pb-4 flex items-center justify-between border-b ${isDark ? 'border-white/[0.05]' : 'border-black/[0.05]'}`}>
              <div>
                <p className={`text-[9px] font-black uppercase tracking-[0.18em] ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
                  Book #{String(book.id).replace('c_', '')}
                </p>
                <h3 className={`text-[15px] font-syne font-black mt-0.5 leading-tight line-clamp-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {book.title}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {onEdit && (
                  <button
                    onClick={() => {
                      onClose()
                      setTimeout(onEdit!, 60)
                    }}
                    className="px-4 py-2 text-[11px] font-black text-white rounded-xl transition-all active:scale-95 hover:opacity-90"
                    style={{
                      background: 'linear-gradient(135deg, #1e2340, #171b2e)',
                      boxShadow: '0 4px 12px -2px rgba(23,27,46,0.4)'
                    }}
                  >
                    Edit Book
                  </button>
                )}
                <button
                  onClick={onClose}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${isDark ? 'bg-white/[0.08] hover:bg-white/[0.12] text-white/50' : 'bg-black/[0.06] hover:bg-black/[0.10] text-slate-500'}`}
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

            {/* Scrollable content */}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-6 py-5">
              {contentSections}
            </div>

            {/* Footer pills */}
            <div className={`shrink-0 border-t px-6 py-3 flex items-center gap-2 flex-wrap ${isDark ? 'border-white/[0.05]' : 'border-black/[0.05]'}`}>
              {book.purchased && <Pill variant="emerald" isDark={isDark}>✓ Owned</Pill>}
              {book.givenTo && <Pill variant="amber" isDark={isDark}>📚 On Loan</Pill>}
              {book.format && book.format !== 'None' && (
                <Pill variant="slate" isDark={isDark}>{book.format}</Pill>
              )}
              {book.isbn && <Pill variant="slate" isDark={isDark}>ISBN {book.isbn}</Pill>}
            </div>
          </div>
        </div>
      </div>

      {isSharing && (
        <ShareCardModal book={book} onClose={() => setIsSharing(false)} />
      )}

      {isTiming && onSave && (
        <ReadingTimer 
          book={book} 
          onClose={() => setIsTiming(false)} 
          onSaveSession={(durationMinutes, startPage, endPage) => {
            const newSession = {
              date: new Date().toISOString(),
              durationMinutes,
              startPage,
              endPage
            }
            onSave({
              ...book,
              currentPage: endPage > 0 ? endPage : book.currentPage,
              readingSessions: [...(book.readingSessions || []), newSession]
            })
          }}
        />
      )}
    </>
  )
}
