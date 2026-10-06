'use client'
import { useState } from 'react'
import type { Book } from '../types'
import { useDialog } from '../hooks/use-dialog'
import { useReadingSession } from '../hooks/use-reading-session'
export default function ReadingTimer({ book, onClose }: { book: Book; onClose: () => void }) {
  const [startPage, setStartPage] = useState(book.currentPage || 0)
  const [endPage, setEndPage] = useState(book.currentPage || 0)
  const [finished, setFinished] = useState(false)
  const reader = useReadingSession(book.id, { startPage, endPage, totalPages: book.totalPages }, true, false)
  const close = () => { void reader.finish(onClose) }
  const dialogRef = useDialog(close)
  const minutes = Math.floor(reader.seconds / 60), seconds = reader.seconds % 60
  return <div ref={dialogRef} aria-label="Physical reading timer" className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-sm w-full text-white">
      <h2 className="text-lg font-bold mb-2">Reading session</h2><p className="text-slate-400 mb-6">{book.title}</p>
      <p aria-live="off" className="text-5xl font-bold tabular-nums mb-4">{minutes}:{String(seconds).padStart(2, '0')}</p>
      <p className="text-xs text-slate-400 mb-4">Measured time pauses while this window is hidden or unfocused. Progress saves every 15 seconds.</p>
      {!finished && <div className="flex gap-3 mb-4"><button className="bg-amber-600 p-3 rounded-xl" onClick={() => reader.setPaused(!reader.paused)}>{reader.paused ? 'Resume' : 'Pause'}</button><button className="bg-red-600 p-3 rounded-xl" onClick={() => { reader.setPaused(true); setFinished(true) }}>Finish</button></div>}
      <div className="grid grid-cols-2 gap-3 mb-4"><label>Start page<input disabled={reader.saving} type="number" min="0" max={book.totalPages || 1_000_000} value={startPage} onChange={event => setStartPage(Number(event.target.value))} className="w-full bg-slate-950 p-3 rounded-xl" /></label><label>End page<input disabled={reader.saving} type="number" min="0" max={book.totalPages || 1_000_000} value={endPage} onChange={event => setEndPage(Number(event.target.value))} className="w-full bg-slate-950 p-3 rounded-xl" /></label></div>
      {reader.error && <p role="alert" className="text-red-300 mb-3">{reader.error}</p>}
      <button disabled={reader.saving || endPage < startPage} onClick={close} className="bg-accent w-full p-3 rounded-xl">{reader.saving ? 'Saving…' : 'Save and close'}</button>
    </div>
  </div>
}
