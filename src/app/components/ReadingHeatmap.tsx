'use client'

import { Book } from '../types'
import { format, subDays, startOfWeek, addDays, isSameDay } from 'date-fns'

export default function ReadingHeatmap({ books }: { books: Book[] }) {
  // Collect all reading dates
  const readDates: Date[] = []

  books.forEach(b => {
    // Add end dates
    if (b.readingEndDate) {
      readDates.push(new Date(b.readingEndDate))
    }
    // Add session dates
    if (b.readingSessions) {
      b.readingSessions.forEach(s => {
        if (s.date) readDates.push(new Date(s.date))
      })
    }
  })

  // Generate last 52 weeks (364 days)
  const today = new Date()
  const startDate = startOfWeek(subDays(today, 364))

  const weeks: { date: Date; count: number }[][] = []
  
  let currentDay = startDate
  for (let w = 0; w < 52; w++) {
    const week = []
    for (let d = 0; d < 7; d++) {
      // count how many times this day appears in readDates
      const count = readDates.filter(rd => isSameDay(rd, currentDay)).length
      week.push({ date: currentDay, count })
      currentDay = addDays(currentDay, 1)
    }
    weeks.push(week)
  }

  const getColor = (count: number) => {
    if (count === 0) return 'bg-slate-100 dark:bg-slate-800/50'
    if (count === 1) return 'bg-emerald-200 dark:bg-emerald-900/60'
    if (count === 2) return 'bg-emerald-400 dark:bg-emerald-700/80'
    if (count === 3) return 'bg-emerald-500 dark:bg-emerald-500'
    return 'bg-emerald-600 dark:bg-emerald-400'
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-end">
        <div>
          <h3 className="text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase mb-1">
            Activity Heatmap
          </h3>
          <p className="text-2xl font-black text-slate-800 dark:text-white">
            {readDates.length} <span className="text-sm font-bold text-slate-400">reading days</span>
          </p>
        </div>
      </div>
      
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-1 min-w-max">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((day, di) => (
                <div
                  key={di}
                  className={`w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-[3px] ${getColor(day.count)} transition-all hover:ring-2 hover:ring-emerald-500`}
                  title={`${format(day.date, 'MMM d, yyyy')}: ${day.count} activity`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
