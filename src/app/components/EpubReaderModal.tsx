'use client'

import { useEffect, useRef, useState } from 'react'
import { ReactReader } from 'react-reader'

interface EpubReaderModalProps {
  epubUrl: string
  initialLocation?: string | number
  onClose: (sessionData: {
    durationMinutes: number
    startPage: number // using 1 since epub location is string
    endPage: number   // using 1
    lastLocation: string
  }) => void
}

export default function EpubReaderModal({
  epubUrl,
  initialLocation,
  onClose
}: EpubReaderModalProps) {
  const [location, setLocation] = useState<string | number>(initialLocation || 0)
  
  const startTime = useRef<number>(Date.now())
  const lastLocRef = useRef<string | number>(initialLocation || 0)

  useEffect(() => {
    lastLocRef.current = location
  }, [location])

  const handleClose = () => {
    const durationMinutes = Math.floor((Date.now() - startTime.current) / 60000)
    onClose({
      durationMinutes,
      startPage: 1, // epub doesn't have exact pages like PDF for start/end in the same way
      endPage: 1,
      lastLocation: String(lastLocRef.current)
    })
  }

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [])

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col animate-fade-in">
      {/* ── Toolbar ── */}
      <div className="h-14 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-4 shrink-0 z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <span className="text-sm font-bold text-slate-300">ePub Reader</span>
        </div>
      </div>

      {/* ── Document Area ── */}
      <div className="flex-1 relative">
        <ReactReader
          url={epubUrl}
          location={location}
          locationChanged={(epubcifi: string) => setLocation(epubcifi)}
          epubOptions={{
            flow: 'paginated',
            manager: 'continuous'
          }}
        />
      </div>
    </div>
  )
}
