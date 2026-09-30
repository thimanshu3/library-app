'use client'

import { useState } from 'react'
import { Book } from '../types'
import { clayFill, palette, pressed, raised } from '../clay'

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
  const diff = Date.now() - new Date(loanDate).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export default function LoanTracker({
  books,
  onEdit
}: {
  books: Book[]
  onEdit: (b: Book) => void
}) {
  const [isDark] = useState(() =>
    typeof document !== 'undefined' &&
    document.documentElement.classList.contains('dark')
  )
  const P = palette(isDark)
  const R = (d = 8, b = 22) => raised('140,120,100', isDark, d, b)
  const Pr = (d = 4, b = 10) => pressed('140,120,100', isDark, d, b)

  const loanedBooks = books.filter(
    b => b.loans && b.loans.some(l => !l.dateReturned)
  )

  if (loanedBooks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-5 mt-20 animate-fade-in">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: P.well, boxShadow: Pr(4, 12) }}
        >
          <svg
            className="w-9 h-9"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            style={{ color: P.faint }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        </div>
        <div className="text-center">
          <p className="font-bold text-sm" style={{ color: P.title }}>
            No active loans
          </p>
          <p className="text-sm mt-1" style={{ color: P.faint }}>
            Books you lend out will appear here.
          </p>
        </div>
      </div>
    )
  }

  const overdueCount = loanedBooks.filter(book => {
    const l = book.loans.find(l => !l.dateReturned)
    if (!l) return false
    if (l.expectedReturnDate) return Date.now() > new Date(l.expectedReturnDate).getTime()
    const d = getDaysOut(l.dateLent)
    return d !== null && d > 30
  }).length

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Header */}
      <div
        className="flex items-center justify-between p-5 sm:p-6 rounded-[28px]"
        style={{ background: P.panel, boxShadow: R(6, 18) }}
      >
        <div>
          <h2
            className="text-xl font-bold tracking-tight"
            style={{ color: P.title }}
          >
            Active Loans
          </h2>
          <p className="text-sm mt-0.5" style={{ color: P.body }}>
            {loanedBooks.length} book{loanedBooks.length !== 1 ? 's' : ''}{' '}
            currently out on loan
            {overdueCount > 0 && (
              <span className="ml-2 text-[11px] font-bold text-[#ba1a1a] dark:text-[#f87171]">
                · {overdueCount} overdue
              </span>
            )}
          </p>
        </div>
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
          style={clayFill('196,106,79', '#e38a71', '#c46a4f', 3)}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
            />
          </svg>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loanedBooks.map((book, i) => {
          const activeLoan = book.loans.find(l => !l.dateReturned)
          if (!activeLoan) return null

          const daysOut = getDaysOut(activeLoan.dateLent)
          const loanDateStr = formatDate(activeLoan.dateLent)

          let isOverdue = false
          let dueStr = ''
          if (activeLoan.expectedReturnDate) {
            const dueDate = new Date(activeLoan.expectedReturnDate).getTime()
            if (Date.now() > dueDate) {
              isOverdue = true
              dueStr = 'Past due'
            } else {
              const diffDays = Math.ceil(
                (dueDate - Date.now()) / (1000 * 60 * 60 * 24)
              )
              dueStr = `Due in ${diffDays}d`
            }
          } else {
            isOverdue = daysOut !== null && daysOut > 30
          }

          const statusRgb = isOverdue ? '186,26,26' : '196,106,79'
          const statusFrom = isOverdue ? '#f87171' : '#e38a71'
          const statusTo = isOverdue ? '#ba1a1a' : '#c46a4f'

          return (
            <div
              key={book.id}
              onClick={() => onEdit(book)}
              className="flex flex-col gap-4 p-4 rounded-[24px] cursor-pointer transition-all duration-300 hover:-translate-y-1 active:scale-[0.99] animate-slide-up group"
              style={{
                background: P.panel,
                boxShadow: R(6, 16),
                animationDelay: `${i * 50}ms`
              }}
            >
              {/* Book info */}
              <div className="flex gap-3">
                <div
                  className="w-12 h-[68px] shrink-0 rounded-xl overflow-hidden"
                  style={{ boxShadow: '3px 5px 12px rgba(0,0,0,.25)' }}
                >
                  {book.coverFile || book.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={book.coverFile || book.photoUrl}
                      alt={book.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-[9px] font-bold"
                      style={{ background: P.well, color: P.faint }}
                    >
                      #{String(book.id).replace('c_', '')}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                  <h3
                    className="font-bold leading-tight line-clamp-2 text-sm"
                    style={{ color: P.title }}
                  >
                    {book.title}
                  </h3>
                  <p
                    className="text-[11px] line-clamp-1"
                    style={{ color: P.faint }}
                  >
                    {book.author}
                  </p>
                </div>
              </div>

              {/* Loan detail panel */}
              <div
                className="p-3.5 rounded-2xl flex flex-col gap-1.5"
                style={{
                  background: isDark
                    ? `rgba(${statusRgb},.12)`
                    : `rgba(${statusRgb},.07)`,
                  border: `1px solid rgba(${statusRgb},${isDark ? '.25' : '.18'})`
                }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: isOverdue ? statusFrom : P.accent }}
                  >
                    {isOverdue ? '⚠ Overdue' : 'Loaned to'}
                  </span>
                  {(daysOut !== null || dueStr) && (
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={clayFill(statusRgb, statusFrom, statusTo, 2)}
                    >
                      {dueStr || `${daysOut}d out`}
                    </span>
                  )}
                </div>
                <span
                  className="text-sm font-bold"
                  style={{ color: P.title }}
                >
                  {activeLoan.borrowerName}
                </span>
                {loanDateStr && (
                  <span className="text-[11px]" style={{ color: P.faint }}>
                    Since {loanDateStr}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
