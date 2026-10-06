'use client'
import { localToday } from '@/lib/library-domain'
import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react'
export interface ReaderData {
  sessionId: string
  durationMinutes: number
  startPage: number
  endPage: number
  totalPages?: number
  lastLocation?: string
}
interface PendingReading {
  copyId: string
  session: {
    id: string
    date: string
    durationMinutes: number
    startPage: number
    endPage: number
    observedAt: string
  }
  progress: { currentPage?: number; totalPages?: number; epubLocation?: string }
}
const prefix = 'library:pending-reading:'
export async function sendReading(record: PendingReading) {
  const response = await fetch('/api/reading', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record),
    keepalive: true
  })
  const result = await response.json()
  if (response.status === 401) {
    // Preserve queued progress and discard expired private client state.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign('/login')
  }
  if (!response.ok)
    throw new Error(
      result.error || 'Progress is stored on this device. Retry when connected.'
    )
  window.dispatchEvent(
    new CustomEvent('reading-saved', { detail: result.book })
  )
}
export async function replayReading() {
  let keys: string[]
  try { keys = Object.keys(localStorage).filter(key => key.startsWith(prefix)) }
  catch { return }
  for (const key of keys) {
    const snapshot = localStorage.getItem(key)
    if (!snapshot) continue
    try {
      await sendReading(JSON.parse(snapshot))
      if (localStorage.getItem(key) === snapshot) localStorage.removeItem(key)
    } catch {
      /* Keep unacknowledged progress for the next retry. */
    }
  }
}
export function useReadingSession(
  copyId: string,
  progress: Omit<ReaderData, 'sessionId' | 'durationMinutes'>,
  ready = true,
  idlePause = true
) {
  const [paused, setPaused] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const session = useRef('')
  const elapsed = useRef(0)
  const lastActivity = useRef(0)
  const sending = useRef<Promise<void> | null>(null)
  const finished = useRef(false)
  const finishing = useRef(false)
  const closingProgress = useRef<Partial<Omit<ReaderData, 'sessionId' | 'durationMinutes'>> | undefined>(undefined)
  const noteActivity = useCallback(() => { lastActivity.current = performance.now() }, [])
  const checkpoint = useCallback((finalProgress?: Partial<Omit<ReaderData, 'sessionId' | 'durationMinutes'>>, closingSave = false) => {
    const final = finalProgress || closingProgress.current
    const currentProgress = { startPage: final?.startPage ?? progress.startPage, endPage: final?.endPage ?? progress.endPage, totalPages: final?.totalPages ?? progress.totalPages, lastLocation: final?.lastLocation ?? progress.lastLocation }
    if (finished.current || (finishing.current && !closingSave) || (!ready && !currentProgress.lastLocation) || !session.current) return null
    const record: PendingReading = {
      copyId,
      session: {
        id: session.current,
        date: localToday(),
        durationMinutes: Math.min(1440, elapsed.current / 60),
        startPage: currentProgress.startPage,
        endPage: currentProgress.endPage,
        observedAt: new Date().toISOString()
      },
      progress: currentProgress.lastLocation
        ? { epubLocation: currentProgress.lastLocation }
        : {
            currentPage: currentProgress.endPage,
            ...(currentProgress.totalPages ? { totalPages: currentProgress.totalPages } : {})
          }
    }
    const key = prefix + session.current,
      body = JSON.stringify(record)
    try {
      localStorage.setItem(key, body)
    } catch {
      setError(
        'Device storage is unavailable. Keep this reader open until progress is saved.'
      )
    }
    return { record, key, body }
  }, [
    ready,
    copyId,
    progress.startPage,
    progress.endPage,
    progress.totalPages,
    progress.lastLocation
  ])
  const persist = useCallback(async (finalProgress?: Partial<Omit<ReaderData, 'sessionId' | 'durationMinutes'>>, closingSave = false) => {
    const pending = checkpoint(finalProgress, closingSave)
    if (!pending) return
    if (sending.current) await sending.current.catch(() => {})
    const job = sendReading(pending.record)
    sending.current = job
    try {
      await job
      try {
        if (localStorage.getItem(pending.key) === pending.body) localStorage.removeItem(pending.key)
      } catch { /* The server acknowledged this progress even if device storage is disabled. */ }
      setError('')
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Unable to save progress.'
      )
      throw error
    } finally {
      if (sending.current === job) sending.current = null
    }
  }, [checkpoint])
  const checkpointEvent = useEffectEvent(checkpoint)
  const persistEvent = useEffectEvent(persist)
  useEffect(() => {
    session.current = crypto.randomUUID()
    lastActivity.current = performance.now()
  }, [])
  useEffect(() => {
    let previous = performance.now(),
      lastSave = previous
    const activity = () => {
      lastActivity.current = performance.now()
    }
    const interruption = () => {
      checkpointEvent()
      void persistEvent().catch(() => {})
    }
    const interval = window.setInterval(() => {
      const now = performance.now(),
        delta = Math.min(2, (now - previous) / 1000)
      previous = now
      if (
        ready &&
        !finishing.current &&
        !paused &&
        !document.hidden &&
        document.hasFocus() &&
        (!idlePause || now - lastActivity.current < 60_000)
      ) {
        elapsed.current += delta
        setSeconds(Math.floor(elapsed.current))
      }
      checkpointEvent()
      if (now - lastSave >= 15_000) {
        lastSave = now
        void persistEvent().catch(() => {})
      }
    }, 1000)
    window.addEventListener('pointerdown', activity)
    window.addEventListener('keydown', activity)
    window.addEventListener('scroll', activity, true)
    document.addEventListener('visibilitychange', interruption)
    window.addEventListener('pagehide', interruption)
    return () => {
      clearInterval(interval)
      checkpointEvent()
      window.removeEventListener('pointerdown', activity)
      window.removeEventListener('keydown', activity)
      window.removeEventListener('scroll', activity, true)
      document.removeEventListener('visibilitychange', interruption)
      window.removeEventListener('pagehide', interruption)
    }
  }, [paused, ready, idlePause])
  async function finish(onClose: () => void, finalProgress?: Partial<Omit<ReaderData, 'sessionId' | 'durationMinutes'>>) {
    if (finishing.current || finished.current) return
    finishing.current = true
    closingProgress.current = finalProgress
    setSaving(true)
    setPaused(true)
    try {
      await persist(finalProgress, true)
      finished.current = true
      onClose()
    } catch {
      /* Leave the reader and retry controls available. */
    } finally {
      finishing.current = false
      if (!finished.current) closingProgress.current = undefined
      setSaving(false)
    }
  }
  return {
    paused,
    setPaused,
    noteActivity,
    seconds,
    error,
    saving,
    finish,
    retry: () => persist()
  }
}
