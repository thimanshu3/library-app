'use client'

import { useState, useEffect } from 'react'
import { Book } from '../types'

export default function ReadingTimer({
  book,
  onClose,
  onSaveSession
}: {
  book: Book
  onClose: () => void
  onSaveSession: (durationMinutes: number, startPage: number, endPage: number) => void
}) {
  const [seconds, setSeconds] = useState(0)
  const [isActive, setIsActive] = useState(true)
  const [isFinished, setIsFinished] = useState(false)
  
  const [startPage, setStartPage] = useState(book.currentPage || 0)
  const [endPage, setEndPage] = useState(book.currentPage || 0)

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isActive) {
      interval = setInterval(() => setSeconds(s => s + 1), 1000)
    }
    return () => clearInterval(interval)
  }, [isActive])

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600)
    const m = Math.floor((totalSeconds % 3600) / 60)
    const s = totalSeconds % 60
    return `${h > 0 ? `${h}:` : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const handleFinish = () => {
    setIsActive(false)
    setIsFinished(true)
  }

  const handleSave = () => {
    const durationMinutes = Math.max(1, Math.round(seconds / 60))
    onSaveSession(durationMinutes, startPage, endPage)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-sm w-full flex flex-col items-center relative shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/20 transition-all"
        >
          ✕
        </button>

        <h2 className="text-white font-bold text-lg mb-2 text-center leading-tight">
          Reading Session
        </h2>
        <p className="text-slate-400 text-sm mb-8 text-center px-4 line-clamp-2">
          {book.title}
        </p>

        {!isFinished ? (
          <>
            <div className="text-6xl font-black text-white tracking-widest tabular-nums mb-8 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
              {formatTime(seconds)}
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setIsActive(!isActive)}
                className={`w-14 h-14 rounded-full flex items-center justify-center text-white transition-all shadow-lg ${
                  isActive ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20'
                }`}
              >
                {isActive ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                ) : (
                  <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                )}
              </button>
              <button
                onClick={handleFinish}
                className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white transition-all shadow-lg shadow-red-500/20"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg>
              </button>
            </div>
          </>
        ) : (
          <div className="w-full flex flex-col gap-6 animate-fade-in">
            <div className="text-center">
              <p className="text-slate-400 text-sm mb-1">Total Time</p>
              <p className="text-3xl font-black text-white">{formatTime(seconds)}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Start Page</label>
                <input 
                  type="number" 
                  value={startPage} 
                  onChange={e => setStartPage(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">End Page</label>
                <input 
                  type="number" 
                  value={endPage} 
                  onChange={e => setEndPage(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>

            <button
              onClick={handleSave}
              className="w-full py-4 rounded-xl bg-accent hover:bg-accent/90 text-white font-bold text-sm tracking-widest uppercase transition-all shadow-lg shadow-accent/20 mt-2"
            >
              Save Session
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
