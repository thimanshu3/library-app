'use client'

import { Book } from '../types'

// ─── Genre short labels ───────────────────────────────────────────────────────
const genreLabels: Record<string, string> = {
  MIND: 'Mindset', PHIL: 'Philosophy', PROD: 'Productivity', PSY: 'Psychology',
  FIN: 'Finance', POWER: 'Power', THINK: 'Thinking', STARTUP: 'Business',
  HIST: 'History', BIO: 'Biography', WAR: 'War', FIC: 'Fiction',
  TECH: 'Technology', SCI: 'Science', SPIRIT: 'Spirituality', COMM: 'Communication'
}

const genreInitial = (genre: string) =>
  (genreLabels[genre] || genre || 'B').charAt(0).toUpperCase()

// ─── Format icons ─────────────────────────────────────────────────────────────
const FormatIcon = ({ format }: { format: string }) => {
  if (format === 'Physical')
    return (
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
        <path d="M6.5 2h11A1.5 1.5 0 0119 3.5v17a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 015 20.5v-17A1.5 1.5 0 016.5 2zm0 1a.5.5 0 00-.5.5v17a.5.5 0 00.5.5h11a.5.5 0 00.5-.5v-17a.5.5 0 00-.5-.5h-11z" />
      </svg>
    )
  if (format === 'PDF')
    return (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    )
  if (format === 'Audiobook')
    return (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072M12 6a7 7 0 010 12M8.464 8.464a5 5 0 000 7.072" />
      </svg>
    )
  return null
}

// ─── Status config ────────────────────────────────────────────────────────────
const statusStyles = {
  light: {
    Unread: {
      card: 'bg-[#fffdf8] border-slate-200/60 shadow-[0_2px_8px_-2px_rgba(30,35,48,0.06),0_8px_24px_-8px_rgba(30,35,48,0.04)]',
      badge: 'bg-slate-100/90 border-slate-200/80 text-slate-500',
      dot: 'bg-slate-400',
      accentBar: 'bg-slate-200',
      coverPlaceholder: 'cover-placeholder-unread',
      progress: 'from-slate-300 to-slate-400',
      viewBtn: 'text-slate-500 hover:text-slate-700 border-slate-200 hover:border-slate-400',
      genre: 'text-slate-500 bg-slate-100/80',
      title: 'text-slate-900',
      author: 'text-slate-500',
      desc: 'text-slate-400',
      hours: 'bg-slate-100/80 text-slate-500',
      footer: 'border-slate-100/80',
      editBtn: 'bg-white/75 border-white/60 text-slate-600 hover:text-secondary',
      recBg: 'bg-white/95 border-slate-100/80',
      recIcon: 'bg-[#ede9ff] text-secondary',
      recName: 'text-slate-700',
      recLabel: 'text-slate-400',
    },
    Reading: {
      card: 'bg-[#fffdf8] border-secondary/20 shadow-[0_2px_8px_-2px_rgba(124,92,252,0.10),0_12px_32px_-8px_rgba(124,92,252,0.12)]',
      badge: 'bg-[#ede9ff]/90 border-secondary/20 text-secondary',
      dot: 'bg-secondary-dim animate-pulse',
      accentBar: 'bg-gradient-to-r from-secondary to-secondary-dim',
      coverPlaceholder: 'cover-placeholder-reading',
      progress: 'from-secondary to-secondary-dim',
      viewBtn: 'text-secondary hover:text-secondary-dim border-secondary/30 hover:border-secondary/60',
      genre: 'text-secondary bg-[#ede9ff]/80',
      title: 'text-slate-900',
      author: 'text-slate-500',
      desc: 'text-slate-400',
      hours: 'bg-slate-100/80 text-slate-500',
      footer: 'border-slate-100/80',
      editBtn: 'bg-white/75 border-white/60 text-slate-600 hover:text-secondary',
      recBg: 'bg-white/95 border-slate-100/80',
      recIcon: 'bg-[#ede9ff] text-secondary',
      recName: 'text-slate-700',
      recLabel: 'text-slate-400',
    },
    Read: {
      card: 'bg-[#fffdf8] border-emerald-200/50 shadow-[0_2px_8px_-2px_rgba(13,159,110,0.08),0_10px_28px_-8px_rgba(13,159,110,0.10)]',
      badge: 'bg-emerald-50/90 border-emerald-200/70 text-emerald-600',
      dot: 'bg-emerald-400',
      accentBar: 'bg-gradient-to-r from-emerald-400 to-emerald-500',
      coverPlaceholder: 'cover-placeholder-read',
      progress: 'from-emerald-400 to-emerald-500',
      viewBtn: 'text-emerald-600 hover:text-emerald-500 border-emerald-200 hover:border-emerald-400',
      genre: 'text-emerald-600 bg-emerald-50/80',
      title: 'text-slate-900',
      author: 'text-slate-500',
      desc: 'text-slate-400',
      hours: 'bg-slate-100/80 text-slate-500',
      footer: 'border-slate-100/80',
      editBtn: 'bg-white/75 border-white/60 text-slate-600 hover:text-secondary',
      recBg: 'bg-white/95 border-slate-100/80',
      recIcon: 'bg-[#ede9ff] text-secondary',
      recName: 'text-slate-700',
      recLabel: 'text-slate-400',
    },
  },
  dark: {
    Unread: {
      card: 'border-white/[0.08] shadow-[0_2px_8px_-2px_rgba(0,0,0,0.3),0_8px_24px_-8px_rgba(0,0,0,0.2)]',
      badge: 'bg-white/[0.08] border-white/[0.10] text-white/50',
      dot: 'bg-white/40',
      accentBar: 'bg-white/10',
      coverPlaceholder: 'cover-placeholder-unread',
      progress: 'from-slate-500 to-slate-600',
      viewBtn: 'text-white/40 hover:text-white/70 border-white/[0.10] hover:border-white/25',
      genre: 'text-white/40 bg-white/[0.07]',
      title: 'text-white',
      author: 'text-white/45',
      desc: 'text-white/30',
      hours: 'bg-white/[0.07] text-white/40',
      footer: 'border-white/[0.06]',
      editBtn: 'bg-white/10 border-white/10 text-white/50 hover:text-secondary',
      recBg: 'bg-[#1a1d2a]/95 border-white/[0.06]',
      recIcon: 'bg-secondary/20 text-secondary-dim',
      recName: 'text-white/70',
      recLabel: 'text-white/35',
    },
    Reading: {
      card: 'border-secondary/25 shadow-[0_2px_8px_-2px_rgba(124,92,252,0.20),0_12px_32px_-8px_rgba(124,92,252,0.18)]',
      badge: 'bg-secondary/15 border-secondary/20 text-secondary-dim',
      dot: 'bg-secondary-dim animate-pulse',
      accentBar: 'bg-gradient-to-r from-secondary to-secondary-dim',
      coverPlaceholder: 'cover-placeholder-reading',
      progress: 'from-secondary to-secondary-dim',
      viewBtn: 'text-secondary-dim hover:text-secondary border-secondary/30 hover:border-secondary/60',
      genre: 'text-secondary-dim bg-secondary/[0.15]',
      title: 'text-white',
      author: 'text-white/45',
      desc: 'text-white/30',
      hours: 'bg-white/[0.07] text-white/40',
      footer: 'border-white/[0.06]',
      editBtn: 'bg-white/10 border-white/10 text-white/50 hover:text-secondary',
      recBg: 'bg-[#1a1d2a]/95 border-white/[0.06]',
      recIcon: 'bg-secondary/20 text-secondary-dim',
      recName: 'text-white/70',
      recLabel: 'text-white/35',
    },
    Read: {
      card: 'border-emerald-500/20 shadow-[0_2px_8px_-2px_rgba(13,159,110,0.15),0_10px_28px_-8px_rgba(13,159,110,0.12)]',
      badge: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
      dot: 'bg-emerald-400',
      accentBar: 'bg-gradient-to-r from-emerald-500 to-emerald-400',
      coverPlaceholder: 'cover-placeholder-read',
      progress: 'from-emerald-500 to-emerald-400',
      viewBtn: 'text-emerald-400 hover:text-emerald-300 border-emerald-500/25 hover:border-emerald-400/50',
      genre: 'text-emerald-400 bg-emerald-500/[0.12]',
      title: 'text-white',
      author: 'text-white/45',
      desc: 'text-white/30',
      hours: 'bg-white/[0.07] text-white/40',
      footer: 'border-white/[0.06]',
      editBtn: 'bg-white/10 border-white/10 text-white/50 hover:text-secondary',
      recBg: 'bg-[#1a1d2a]/95 border-white/[0.06]',
      recIcon: 'bg-secondary/20 text-secondary-dim',
      recName: 'text-white/70',
      recLabel: 'text-white/35',
    },
  }
}

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
  const theme = isDark ? statusStyles.dark : statusStyles.light
  const ss = theme[book.status as keyof typeof theme] ?? theme.Unread

  // Reading progress
  let progress = -1
  if (book.status === 'Read') {
    progress = 100
  } else if (book.status === 'Reading') {
    if (book.currentPage && book.totalPages && book.totalPages > 0) {
      progress = Math.min(99, Math.round((book.currentPage / book.totalPages) * 100))
    } else if (book.readingStartDate) {
      const hoursNum = parseFloat(book.hours?.replace(/[^0-9.]/g, '') || '0') || 8
      // eslint-disable-next-line react-hooks/purity
      const elapsed = (Date.now() - new Date(book.readingStartDate).getTime()) / (1000 * 3600)
      progress = Math.min(95, Math.round((elapsed / hoursNum) * 100))
    }
  }

  const hasFormat = book.format && book.format !== 'None'
  const isOwned = book.purchased

  // Dark card bg is a CSS variable-based inline style so it works with any status
  const cardBg = isDark
    ? 'rgba(26, 29, 42, 0.92)'   // dark navy glass
    : undefined

  return (
    <div
      onClick={isBatchMode ? onSelect : onView}
      className={`
        relative group flex flex-col rounded-[28px] overflow-hidden border
        transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] cursor-pointer select-none
        backdrop-blur-xl
        ${ss.card}
        ${isSelected
          ? 'ring-2 ring-secondary/40 border-secondary/40 shadow-[0_20px_48px_-12px_rgba(124,92,252,0.30)]'
          : 'hover:shadow-[0_24px_56px_-12px_rgba(30,35,48,0.18),0_8px_20px_-8px_rgba(30,35,48,0.10)] hover:-translate-y-2.5 hover:scale-[1.015]'
        }
        ${isBatchMode ? 'active:scale-[0.96] opacity-90' : 'active:scale-[0.98]'}
      `}
      style={cardBg ? { background: cardBg } : undefined}
    >
      {/* Top accent bar */}
      <div className={`h-[3px] w-full ${ss.accentBar} opacity-80`} />

      {/* ── Batch checkbox ── */}
      {isBatchMode && (
        <div className="absolute top-4 left-4 z-30">
          <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shadow-sm ${
            isSelected
              ? 'bg-secondary border-secondary'
              : isDark
                ? 'bg-white/10 border-white/20 backdrop-blur-sm'
                : 'bg-white/70 border-slate-300/80 backdrop-blur-sm'
          }`}>
            {isSelected && (
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>
      )}

      {/* ── Cover image area ── */}
      <div
        className="relative h-40 sm:h-56 overflow-hidden flex items-center justify-center shrink-0"
        onClick={e => {
          if (!isBatchMode) {
            e.stopPropagation()
            onEdit()
          }
        }}
      >
        {book.coverFile || book.photoUrl ? (
          <>
            <div
              className="absolute inset-0 scale-110 blur-2xl opacity-50 group-hover:opacity-70 transition-opacity duration-700"
              style={{ backgroundImage: `url(${book.coverFile || book.photoUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent z-[1]" />
            <img
              src={book.coverFile || book.photoUrl}
              alt={book.title}
              className="h-full relative z-10 object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,0.25)] group-hover:scale-[1.05] transition-transform duration-700 ease-out"
            />
          </>
        ) : (
          <div className={`absolute inset-0 ${ss.coverPlaceholder} flex flex-col items-center justify-center gap-3`}>
            <div className="w-16 h-20 rounded-2xl bg-white/30 backdrop-blur-sm border border-white/50 flex items-center justify-center shadow-inner">
              <span className="text-3xl font-black text-white/80 font-syne select-none">
                {genreInitial(book.genre)}
              </span>
            </div>
            <span className="text-[9px] font-black text-white/60 uppercase tracking-[0.2em]">No Cover</span>
          </div>
        )}

        {/* Status badge */}
        <div className={`absolute top-2 right-2 sm:top-3 sm:right-3 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[8px] sm:text-[9px] uppercase font-black tracking-[0.12em] rounded-full border backdrop-blur-md z-20 flex items-center gap-1 sm:gap-1.5 shadow-sm ${ss.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ss.dot}`} />
          {book.status}
        </div>

        {/* Book number + format */}
        <div className={`absolute top-2 sm:top-3 flex items-center gap-1 sm:gap-1.5 z-20 ${isBatchMode ? 'left-10 sm:left-12' : 'left-2 sm:left-3'}`}>
          <span className="text-[8px] sm:text-[9px] font-black text-white/80 bg-black/30 border border-white/20 rounded-md sm:rounded-lg px-1.5 sm:px-2 py-0.5 backdrop-blur-md tabular-nums">
            #{String(book.id).replace(/\D/g, '')}
          </span>
          {hasFormat && (
            <span className={`flex items-center gap-1 text-[8px] sm:text-[9px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md sm:rounded-lg backdrop-blur-md border ${
              book.format === 'Physical' ? 'bg-amber-500/85 border-amber-400/30 text-white'
              : book.format === 'PDF' ? 'bg-blue-500/85 border-blue-400/30 text-white'
              : book.format === 'Audiobook' ? 'bg-purple-500/85 border-purple-400/30 text-white'
              : 'bg-slate-800/80 border-slate-700 text-slate-300'
            }`}>
              <FormatIcon format={book.format} />
              {book.format}
            </span>
          )}
        </div>

        {/* Owned badge */}
        {isOwned && !book.givenTo && (
          <div className="absolute bottom-3 left-3 z-20">
            <span className="flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-lg bg-emerald-500/85 border border-emerald-400/30 text-white backdrop-blur-md">
              ✓ Owned
            </span>
          </div>
        )}

        {/* Loaned badge */}
        {book.givenTo && (
          <div className="absolute bottom-3 left-3 z-20">
            <span className="flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-lg bg-amber-500/85 border border-amber-400/30 text-white backdrop-blur-md">
              📚 Loaned
            </span>
          </div>
        )}

        {/* Edit button (hover) */}
        {!isBatchMode && (
          <button
            onClick={e => { e.stopPropagation(); onEdit() }}
            className={`absolute bottom-3 right-3 z-20 w-8 h-8 backdrop-blur-md rounded-xl border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-sm hover:scale-110 ${ss.editBtn}`}
            title="Edit"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        )}
      </div>

      {/* Reading progress bar */}
      {progress >= 0 && (
        <div className="progress-track">
          <div className={`progress-fill bg-gradient-to-r ${ss.progress}`} style={{ width: `${progress}%` }} />
        </div>
      )}

      {/* ── Card body ── */}
      <div className="p-3 sm:p-5 flex flex-col flex-1 gap-1.5 sm:gap-2">
        {/* Genre + year */}
        <div className="flex items-center justify-between gap-2">
          <span className={`text-[8px] sm:text-[9px] font-black tracking-[0.14em] uppercase px-1.5 sm:px-2 py-0.5 rounded-full ${ss.genre}`}>
            {genreLabels[book.genre] || book.genre}
          </span>
          {book.launchYear && (
            <span className={`text-[9px] sm:text-[10px] font-semibold tabular-nums ${isDark ? 'text-white/30' : 'text-slate-400'}`}>
              {book.launchYear}
            </span>
          )}
        </div>

        {/* Title + author */}
        <div className="flex-1 min-h-0">
          <h3 className={`font-syne font-black text-[13px] sm:text-[16px] tracking-tight leading-snug line-clamp-2 mb-0.5 ${ss.title}`}>
            {book.title}
          </h3>
          <p className={`text-[11px] sm:text-[13px] font-semibold line-clamp-1 ${ss.author}`}>
            {book.author}
          </p>
        </div>

        {/* Description */}
        <p className={`text-[10px] sm:text-[12px] line-clamp-2 leading-relaxed ${ss.desc}`}>
          {book.description || book.summary || 'No description available.'}
        </p>

        {/* Footer row */}
        <div className={`flex items-center justify-between mt-auto pt-1.5 border-t ${ss.footer}`}>
          <div className="flex items-center gap-1.5 flex-wrap">
            {book.hours && (
              <span className={`text-[10px] px-2 py-0.5 rounded-lg font-bold uppercase tracking-wider ${ss.hours}`}>
                {book.hours}
              </span>
            )}
            {(book.rating || 0) > 0 && (
              <span className="text-[11px] font-bold text-amber-500 flex items-center gap-0.5 tracking-[0.05em]">
                {'★'.repeat(book.rating || 0)}
                <span className={isDark ? 'text-white/10' : 'text-slate-200'}>{'★'.repeat(5 - (book.rating || 0))}</span>
              </span>
            )}
          </div>
          <button
            onClick={e => { e.stopPropagation(); onView() }}
            className={`text-[10px] font-black uppercase tracking-[0.14em] flex items-center gap-1 px-3 py-1.5 rounded-full border transition-all duration-200 hover:scale-105 ${ss.viewBtn}`}
          >
            View
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Recommended by — hover reveal ── */}
      {book.recommendedBy && !isBatchMode && (
        <div className={`absolute bottom-0 left-0 right-0 border-t px-4 py-2.5 flex items-center gap-2 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out z-20 rounded-b-[24px] backdrop-blur-sm ${ss.recBg}`}>
          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${ss.recIcon}`}>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className={`text-[9px] font-black uppercase tracking-[0.14em] ${ss.recLabel}`}>Recommended by</p>
            <p className={`text-xs font-bold truncate ${ss.recName}`}>{book.recommendedBy}</p>
          </div>
        </div>
      )}
    </div>
  )
}
