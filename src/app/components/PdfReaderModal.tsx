'use client'

import { useEffect, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// Configure worker for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface PdfReaderModalProps {
  pdfUrl: string
  initialPage: number
  onClose: (sessionData: {
    durationMinutes: number
    startPage: number
    endPage: number
  }) => void
}

export default function PdfReaderModal({
  pdfUrl,
  initialPage,
  onClose
}: PdfReaderModalProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(initialPage || 1)
  const [scale, setScale] = useState<number>(1.0)

  const startTime = useRef<number>(0)
  if (startTime.current === 0) {
    startTime.current = Date.now()
  }
  const startPage = useRef<number>(initialPage || 1)
  
  const pageNumberRef = useRef(pageNumber)
  useEffect(() => {
    pageNumberRef.current = pageNumber
  }, [pageNumber])

  const handleClose = () => {
    const durationMinutes = Math.floor((Date.now() - startTime.current) / 60000)
    onClose({
      durationMinutes,
      startPage: startPage.current,
      endPage: pageNumberRef.current
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
      autoFocus
    >
      {/* ── Toolbar ── */}
      <div className="h-14 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-4 shrink-0 z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={handleClose}
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
            onClick={() => changePage(-1)}
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
            onClick={() => changePage(1)}
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
            onClick={() => setScale(s => Math.max(0.5, s - 0.2))}
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
            onClick={() => setScale(s => Math.min(3, s + 0.2))}
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

      {/* ── Document Area ── */}
      <div className="flex-1 overflow-auto bg-slate-900/50 flex justify-center p-6 custom-scrollbar">
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
            scale={scale}
            renderTextLayer={true}
            renderAnnotationLayer={true}
            className="shadow-2xl rounded-sm overflow-hidden"
          />
        </Document>
      </div>
    </div>
  )
}
