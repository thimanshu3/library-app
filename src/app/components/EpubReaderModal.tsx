 'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ReactReader } from 'react-reader'
import { useDialog } from '../hooks/use-dialog'
import { useReadingSession } from '../hooks/use-reading-session'
export default function EpubReaderModal({ epubUrl, initialLocation, copyId, onClose }: { epubUrl: string; initialLocation?: string | number; copyId: string; onClose: () => void }) {
  const [location, setLocation] = useState<string | number>(initialLocation || 0)
  const [ready, setReady] = useState(false)
  const reader = useReadingSession(copyId, { startPage: 0, endPage: 0, lastLocation: typeof location === 'string' ? location : undefined }, ready)
  const renditionRef = useRef<import('epubjs').Rendition | null>(null)
  const closing = useRef(false)
  const [locationError, setLocationError] = useState('')
  const close = () => {
    if (closing.current) return
    closing.current = true
    void (async () => {
      try {
        const rendition = renditionRef.current
        const current = rendition ? await rendition.q.enqueue(async () => rendition.currentLocation()) as unknown as { start?: { cfi?: string } } : null
        await reader.finish(onClose, current?.start?.cfi ? { lastLocation: current.start.cfi } : undefined)
      } catch { setLocationError('Unable to read the current location. Keep this reader open and retry closing.') }
      finally { closing.current = false }
    })()
  }
  const latestClose = useRef(close)
  const noteActivity = reader.noteActivity
  useEffect(() => { latestClose.current = close })
  const bindRendition = useCallback((rendition: import('epubjs').Rendition) => { renditionRef.current = rendition; rendition.on('keydown', (event: KeyboardEvent) => { noteActivity(); if (event.key === 'Escape') { event.preventDefault(); latestClose.current() } }); rendition.on('mousedown', noteActivity); rendition.on('touchstart', noteActivity) }, [noteActivity])
  const dialogRef = useDialog(close)
  return <div ref={dialogRef} aria-label="EPUB reader" className="fixed inset-0 z-[100] bg-slate-900 flex flex-col">
    <div className="p-4 text-white flex flex-wrap items-center gap-4 text-sm"><button disabled={reader.saving} onClick={close}>Save and close</button><button onClick={() => reader.setPaused(!reader.paused)}>{reader.paused ? 'Resume timer' : 'Pause timer'}</button><span>{Math.floor(reader.seconds / 60)} min active · pauses after 60 seconds idle</span></div>
    {locationError && <p role="alert" className="p-3 text-red-300">{locationError}</p>}
    {reader.error && <p role="alert" className="p-3 text-red-300">{reader.error} <button onClick={() => void reader.retry().catch(() => {})}>Retry save</button></p>}
    <div className="flex-1 relative"><ReactReader getRendition={bindRendition} url={epubUrl} location={location} locationChanged={value => { setLocation(value); setReady(true) }} epubOptions={{ flow: 'paginated', manager: 'default', allowScriptedContent: false, allowPopups: false }} /></div>
  </div>
}
