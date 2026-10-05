'use client'

import { useState } from 'react'
import { Book } from '../types'
import { differenceInDays } from 'date-fns'

export default function ReadingWrappedModal({
  books,
  onClose,
  isDark
}: {
  books: Book[]
  onClose: () => void
  isDark: boolean
}) {
  const [slide, setSlide] = useState(0)
  
  const currentYear = new Date().getFullYear()

  // Books read this year
  const readThisYear = books.filter(b => 
    b.status === 'Read' && 
    b.readingEndDate && 
    b.readingEndDate.startsWith(currentYear.toString())
  )

  const numBooks = readThisYear.length

  // Calculate hours
  let totalHours = 0
  readThisYear.forEach(b => {
    if (b.hours) {
      const h = parseInt(b.hours.replace(/[^0-9]/g, ''))
      if (!isNaN(h)) totalHours += h
    } else if (b.totalPages) {
      totalHours += Math.ceil(b.totalPages / 40)
    }
  })

  // Top Genre
  const genreCount: Record<string, number> = {}
  readThisYear.forEach(b => {
    genreCount[b.genre] = (genreCount[b.genre] || 0) + 1
  })
  const topGenre = Object.keys(genreCount).length > 0 
    ? Object.entries(genreCount).reduce((a, b) => a[1] > b[1] ? a : b)[0]
    : 'None'

  // Longest streak
  const readDates: Date[] = []
  books.forEach(b => {
    if (b.readingEndDate && b.readingEndDate.startsWith(currentYear.toString())) {
      readDates.push(new Date(b.readingEndDate))
    }
    if (b.readingSessions) {
      b.readingSessions.forEach(s => {
        if (s.date && s.date.startsWith(currentYear.toString())) {
          readDates.push(new Date(s.date))
        }
      })
    }
  })
  
  // Sort and deduplicate dates
  const uniqueSortedDates = Array.from(new Set(readDates.map(d => d.toISOString().split('T')[0])))
    .map(d => new Date(d))
    .sort((a, b) => a.getTime() - b.getTime())

  let maxStreak = 0
  let currentStreak = 0
  let prevDate: Date | null = null

  uniqueSortedDates.forEach(d => {
    if (!prevDate) {
      currentStreak = 1
    } else {
      const diff = differenceInDays(d, prevDate)
      if (diff === 1) {
        currentStreak++
      } else if (diff > 1) {
        if (currentStreak > maxStreak) maxStreak = currentStreak
        currentStreak = 1
      }
    }
    prevDate = d
  })
  if (currentStreak > maxStreak) maxStreak = currentStreak

  const slides = [
    {
      title: `${currentYear} Wrapped`,
      content: 'Let\'s take a look at your reading journey this year.',
      icon: '🎉',
      color: '#ec4899'
    },
    {
      title: `${numBooks} Books`,
      content: numBooks > 0 ? 'That\'s a lot of pages turned!' : 'A quiet year for reading.',
      icon: '📚',
      color: '#34d399'
    },
    {
      title: `${totalHours} Hours`,
      content: 'Spent immersed in other worlds.',
      icon: '⏳',
      color: '#f59e0b'
    },
    {
      title: `Top Genre: ${topGenre}`,
      content: topGenre !== 'None' ? 'You definitely have a type.' : 'No genres explored yet.',
      icon: '🎭',
      color: '#c46a4f'
    },
    {
      title: `${maxStreak} Day Streak`,
      content: 'Your longest reading streak this year!',
      icon: '🔥',
      color: '#f97316'
    }
  ]

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="w-full max-w-sm aspect-[9/16] rounded-[40px] flex flex-col relative overflow-hidden animate-scale-in"
        style={{
          background: `linear-gradient(to bottom right, ${slides[slide].color}40, ${slides[slide].color}10)`,
          boxShadow: '0 30px 60px -12px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.1)'
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 rounded-full flex items-center justify-center z-10 transition-transform active:scale-90 bg-black/20 text-white hover:bg-black/40"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div className="absolute top-6 left-6 right-20 flex gap-2 z-10">
          {slides.map((_, i) => (
            <div key={i} className="h-1.5 flex-1 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white transition-all duration-300"
                style={{ width: i <= slide ? '100%' : '0%' }}
              />
            </div>
          ))}
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center cursor-pointer" onClick={() => setSlide(s => Math.min(slides.length - 1, s + 1))}>
          <div className="text-8xl mb-8 animate-bounce filter drop-shadow-lg">
            {slides[slide].icon}
          </div>
          <h2 className="text-4xl font-black text-white mb-4 tracking-tight drop-shadow-md">
            {slides[slide].title}
          </h2>
          <p className="text-lg text-white/90 font-medium drop-shadow">
            {slides[slide].content}
          </p>
        </div>

        <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-4 px-8 z-10">
          <button
            disabled={slide === 0}
            onClick={(e) => { e.stopPropagation(); setSlide(s => Math.max(0, s - 1)) }}
            className="flex-1 py-4 rounded-full font-bold uppercase tracking-widest text-xs transition-all disabled:opacity-30 bg-white/10 text-white hover:bg-white/20 active:scale-95"
          >
            Back
          </button>
          {slide < slides.length - 1 ? (
            <button
              onClick={(e) => { e.stopPropagation(); setSlide(s => Math.min(slides.length - 1, s + 1)) }}
              className="flex-1 py-4 rounded-full font-bold uppercase tracking-widest text-xs transition-all bg-white text-black hover:bg-white/90 active:scale-95 shadow-xl"
            >
              Next
            </button>
          ) : (
            <button
              onClick={onClose}
              className="flex-1 py-4 rounded-full font-bold uppercase tracking-widest text-xs transition-all bg-white text-black hover:bg-white/90 active:scale-95 shadow-xl"
            >
              Finish
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
