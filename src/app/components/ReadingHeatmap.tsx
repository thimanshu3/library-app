'use client'

import { Book } from '../types'
import { activityByDay } from '@/lib/library-domain'
import { format, subDays, startOfWeek, addDays } from 'date-fns'

export default function ReadingHeatmap({ books }: { books: Book[] }) {
  const activity = activityByDay(books)
  const today = new Date()
  const startDate = startOfWeek(subDays(today, 364))
  const weeks: { date: Date; count: number; future: boolean }[][] = []
  let currentDay = startDate, activeDays = 0
  while (currentDay <= today) {
    const week = []
    for (let day = 0; day < 7; day++) {
      const future = currentDay > today
      const count = future ? 0 : activity.get(format(currentDay, 'yyyy-MM-dd')) || 0
      if (count > 0) activeDays++
      week.push({ date: currentDay, count, future })
      currentDay = addDays(currentDay, 1)
    }
    weeks.push(week)
  }
  const getColor = (count: number) => {
    if (count === 0) return 'bg-[#e4ddd0] dark:bg-[#2e2922]/80'
    if (count === 1) return 'bg-emerald-200 dark:bg-emerald-900/60'
    if (count === 2) return 'bg-emerald-400 dark:bg-emerald-700/80'
    if (count === 3) return 'bg-emerald-500 dark:bg-emerald-500'
    return 'bg-emerald-600 dark:bg-emerald-400'
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-end">
        <div>
          <h3 className="text-[10px] font-black tracking-[0.2em] uppercase mb-1" style={{ color: 'var(--on-surface-variant)' }}>
            Activity Heatmap
          </h3>
          <p className="text-2xl font-black" style={{ color: 'var(--on-surface)' }}>
            {activeDays} <span className="text-sm font-bold" style={{ color: 'var(--on-surface-variant)' }}>reading days</span>
          </p>
        </div>
      </div>
      
      <div role="img" aria-label={`Reading activity including today: ${activeDays} unique active days in the displayed period.`} className="overflow-x-auto pb-2">
        <div className="flex gap-1 min-w-max">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((day, di) => (
                <div
                  key={di}
                  className={`w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-[3px] ${day.future ? 'invisible' : getColor(day.count)} transition-all hover:ring-2 hover:ring-emerald-500`}
                  aria-hidden={day.future} title={`${format(day.date, 'MMM d, yyyy')}: ${day.count} activity`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
