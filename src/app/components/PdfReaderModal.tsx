'use client'

import { useEffect, useRef, useState } from 'react'
import { useReadingSession } from '../hooks/use-reading-session'
import { useDialog } from '../hooks/use-dialog'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// Configure worker for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

interface PdfReaderModalProps {
  pdfUrl: string
  initialPage: number
  copyId: string
  onClose: () => void
}

export default function PdfReaderModal({
  pdfUrl,
  initialPage,
  copyId,
  onClose
}: PdfReaderModalProps) {
  const areaRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(350)
  useEffect(() => { const area = areaRef.current; if (!area) return; const observer = new ResizeObserver(entries => setWidth(entries[0].contentRect.width)); observer.observe(area); return () => observer.disconnect() }, [])
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(initialPage || 1)
  const [scale, setScale] = useState<number>(1.0)

  const reader = useReadingSession(copyId, { startPage: initialPage || 1, endPage: pageNumber, totalPages: numPages }, numPages > 0)
  const handleClose = () => { void reader.finish(onClose) }
  const dialogRef = useDialog(handleClose)
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    if (initialPage > numPages) {
      setPageNumber(numPages)
    }
  }

  const changePage = (offset: number) => {
    setPageNumber(prev => Math.min(Math.max(1, prev + offset), numPages))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).closest('button,input')) return
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
      e.preventDefault()
      changePage(1)
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      changePage(-1)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-slate-900 flex flex-col animate-fade-in"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      ref={dialogRef}
      aria-label="PDF reader"
    >
      {/* ── Toolbar ── */}
      <div className="h-14 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-4 shrink-0 z-10">
        <div className="flex items-center gap-4">
          <button
            aria-label="Save and close reader" disabled={reader.saving} onClick={handleClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
          <span className="text-sm font-bold text-slate-300">Reader</span>
        </div>

        <div className="flex items-center gap-2 bg-slate-900 rounded-lg p-1 border border-slate-800">
          <button
            aria-label="Previous page" onClick={() => changePage(-1)}
            disabled={pageNumber <= 1}
            className="w-8 h-8 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          <span className="text-xs font-bold text-slate-300 w-24 text-center">
            {pageNumber} / {numPages || '-'}
          </span>

          <button
            aria-label="Next page" onClick={() => changePage(1)}
            disabled={pageNumber >= numPages}
            className="w-8 h-8 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            aria-label="Change zoom" onClick={() => setScale(s => Math.max(0.5, s - 0.2))}
            className="w-8 h-8 rounded hover:bg-slate-800 text-slate-400 flex items-center justify-center"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"
              />
            </svg>
          </button>
          <span className="text-xs font-bold text-slate-500 w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            aria-label="Change zoom" onClick={() => setScale(s => Math.min(3, s + 0.2))}
            className="w-8 h-8 rounded hover:bg-slate-800 text-slate-400 flex items-center justify-center"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="px-4 py-2 text-xs text-white bg-slate-950 flex gap-4"><button onClick={() => reader.setPaused(!reader.paused)}>{reader.paused ? 'Resume timer' : 'Pause timer'}</button><span>{Math.floor(reader.seconds / 60)} min active · pauses after 60 seconds idle</span></div>
      {reader.error && <p role="alert" className="p-3 text-red-300">{reader.error} <button onClick={() => void reader.retry().catch(() => {})}>Retry save</button></p>}
      {/* ── Document Area ── */}
      <div ref={areaRef} className="flex-1 overflow-auto bg-slate-900/50 p-4 custom-scrollbar"><div className="mx-auto w-fit">
        <Document
          file={pdfUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="flex items-center gap-3 text-accent-dim text-sm font-bold tracking-widest uppercase mt-32">
              <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Loading Document...
            </div>
          }
          error={
            <div className="text-red-400 mt-32 text-sm font-bold">
              Failed to load PDF file.
            </div>
          }
        >
          <Page
            pageNumber={pageNumber}
            width={Math.max(200, Math.min(width - 32, 800))} scale={scale}
            renderTextLayer={true}
            renderAnnotationLayer={true}
            className="shadow-2xl rounded-sm overflow-hidden"
          />
        </Document>
      </div></div>
    </div>
  )
}
