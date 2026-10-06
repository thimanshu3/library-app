'use client'

import { useRef, useState } from 'react'
import { bookCover } from '@/lib/book-cover'
import { useDialog } from '../hooks/use-dialog'
import { Book } from '../types'

export default function ShareCardModal({
  book,
  onClose
}: {
  book: Book
  onClose: () => void
}) {
  const dialogRef = useDialog(onClose)
  const [error, setError] = useState('')
  const cardRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    if (!cardRef.current) return
    try {
      setDownloading(true); setError('')
      const { toPng } = await import('html-to-image')
      const images = Array.from(cardRef.current.querySelectorAll('img'))
      await Promise.all(images.map(image => image.decode()))
      // We scale it up 2x for retina quality
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true })
      
      const link = document.createElement('a')
      link.download = `${book.title.replace(/\s+/g, '_')}_ShareCard.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      setError(err instanceof Error ? 'Unable to generate the card. Check the cover image and retry.' : 'Unable to download. Please retry.')
    } finally {
      setDownloading(false)
    }
  }

  const quote = book.quotes && book.quotes.length > 0 ? book.quotes[0].text : book.summary
  const source = bookCover(book)
  const cover = source.startsWith('https:') ? `/api/cover?url=${encodeURIComponent(source)}` : source

  return (
    <div ref={dialogRef} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 rounded-[2.5rem] p-6 max-w-sm w-full max-h-[95dvh] overflow-y-auto relative flex flex-col items-center">
        {/* Close Button */}
        <button
          aria-label="Close share preview" onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/20 transition-all"
        >
          ✕
        </button>
        
        <h2 className="text-white font-bold text-lg mb-6">Preview Share Card</h2>

        {/* The Card to be captured */}
        <div 
          ref={cardRef} 
          className="w-[min(320px,100%)] h-[568px] shrink-0 relative rounded-[2rem] overflow-hidden flex flex-col items-center justify-center p-8 text-center shadow-2xl"
          style={{
            background: 'linear-gradient(145deg, #1e1e2f 0%, #12121a 100%)',
          }}
        >
          {/* Background blur decorative circles */}
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-accent/30 rounded-full blur-[80px]" />
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-secondary/30 rounded-full blur-[80px]" />

          {/* Private same-origin image is captured by html-to-image. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover} alt={`${book.title} cover`} width="128" height="192" className="w-32 h-48 rounded-xl shadow-2xl mb-6 relative z-10 object-cover" />

          <h3 className="text-white font-black text-xl leading-tight mb-2 z-10 tracking-tight">
            {book.title}
          </h3>
          <p className="text-slate-400 font-medium text-sm mb-6 z-10 tracking-wide">
            {book.author}
          </p>

          {book.rating !== undefined && book.rating > 0 && (
            <div className="flex gap-1 mb-6 z-10">
              {Array.from({ length: 5 }).map((_, i) => (
                <svg key={i} className={`w-5 h-5 ${i < book.rating! ? 'text-yellow-400' : 'text-slate-700'}`} fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
          )}

          {quote && (
            <p className="text-slate-300 italic text-sm leading-relaxed z-10 line-clamp-4">
              &quot;{quote}&quot;
            </p>
          )}

          <div className="absolute bottom-6 font-black text-[10px] tracking-widest text-white/30 uppercase z-10">
            My Library
          </div>
        </div>

        {error && <p role="alert" className="text-red-300 mt-4">{error}</p>}
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="mt-8 w-full py-4 rounded-2xl bg-accent text-white font-bold tracking-widest uppercase text-xs hover:bg-accent/90 transition-all shadow-lg shadow-accent/20"
        >
          {downloading ? 'Generating Image...' : 'Download for Instagram'}
        </button>
      </div>
    </div>
  )
}
