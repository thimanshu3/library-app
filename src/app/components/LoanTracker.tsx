'use client'

import { Book } from '../types'

const formatDate = (d?: string) => {
  if (!d) return null
  try { return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) }
  catch { return d }
}

const getDaysOut = (loanDate?: string): number | null => {
  if (!loanDate) return null
  const diff = Date.now() - new Date(loanDate).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export default function LoanTracker({
  books, onEdit
}: {
  books: Book[]
  onEdit: (b: Book) => void
}) {
  const loanedBooks = books.filter(b => b.loans && b.loans.some(l => !l.dateReturned))

  if (loanedBooks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-4 mt-20 animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
          <svg className="w-10 h-10 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <div className="text-center">
          <p className="font-bold text-slate-600 dark:text-slate-400">No active loans</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Books you lend out will appear here.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Header card */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900/50 p-6 rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Active Loans</h2>
          <p className="text-sm text-slate-500 mt-1">
            {loanedBooks.length} book{loanedBooks.length !== 1 ? 's' : ''} currently out on loan
          </p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
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
              const diffDays = Math.ceil((dueDate - Date.now()) / (1000 * 60 * 60 * 24))
              dueStr = `Due in ${diffDays}d`
            }
          } else {
            // Fallback overdue logic if no due date set
            isOverdue = daysOut !== null && daysOut > 30
          }

          return (
            <div
              key={book.id}
              onClick={() => onEdit(book)}
              className={`
                bg-white dark:bg-slate-900/30 border rounded-[24px] p-5 shadow-sm 
                flex flex-col gap-4 backdrop-blur-sm cursor-pointer group
                transition-all duration-300 hover:-translate-y-1 animate-slide-up
                ${isOverdue
                  ? 'border-red-200 dark:border-red-900/50 hover:shadow-red-500/10 hover:border-red-400/50'
                  : 'border-slate-200 dark:border-slate-800 hover:border-amber-400/50 hover:shadow-amber-500/10'
                }
              `}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex gap-4">
                <div className="w-14 h-20 shrink-0 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden shadow-md border border-slate-200 dark:border-slate-700">
                  {book.coverFile || book.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={book.coverFile || book.photoUrl} alt={book.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400 font-bold">
                      #{String(book.id).replace('c_', '')}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                  <h3 className="font-bold text-slate-900 dark:text-white leading-tight line-clamp-2 text-sm">{book.title}</h3>
                  <p className="text-xs text-slate-500 line-clamp-1">{book.author}</p>
                </div>
              </div>

              {/* Loan details */}
              <div className={`p-3.5 rounded-2xl flex flex-col gap-2 transition-colors ${
                isOverdue
                  ? 'bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/30'
                  : 'bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/30'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${isOverdue ? 'text-red-500' : 'text-amber-600 dark:text-amber-500'}`}>
                    {isOverdue ? '⚠ Overdue' : 'Loaned To'}
                  </span>
                  {(daysOut !== null || dueStr) && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isOverdue ? 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400' : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400'}`}>
                      {dueStr || `${daysOut}d`}
                    </span>
                  )}
                </div>
                <span className={`text-base font-bold ${isOverdue ? 'text-red-700 dark:text-red-300' : 'text-amber-800 dark:text-amber-300'}`}>
                  {activeLoan.borrowerName}
                </span>
                {loanDateStr && (
                  <span className={`text-xs ${isOverdue ? 'text-red-500 dark:text-red-400' : 'text-amber-600 dark:text-amber-500'}`}>
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
