'use client'

import { useEffect, useState } from 'react'
import { Book } from '../types'
import {
  NEUTRAL_RGB,
  palette,
  raised,
  pressed,
  chipShadow,
  clayFill
} from '../clay'

// App primary (rust/terracotta) — matches --primary in globals.css
const PRIMARY_RGB = '196,106,79'
const primaryFill = (dark: boolean) =>
  clayFill(
    PRIMARY_RGB,
    dark ? '#e38a71' : '#d37d64',
    dark ? '#c46a4f' : '#c46a4f',
    4
  )

// ── Field wrapper ──────────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-bold uppercase tracking-widest opacity-60">
        {label}
      </label>
      {children}
    </div>
  )
}

// ── Quote adder ────────────────────────────────────────────────────────────────
function QuoteAdder({
  onAdd,
  dark
}: {
  onAdd: (text: string, page: number) => void
  dark: boolean
}) {
  const P = palette(dark)
  const Pr = (d = 4, b = 10) => pressed(NEUTRAL_RGB, dark, d, b)
  const [text, setText] = useState('')
  const [page, setPage] = useState('')

  const handleAdd = () => {
    if (!text.trim()) return
    onAdd(text.trim(), parseInt(page) || 0)
    setText('')
    setPage('')
  }

  return (
    <div
      className="flex flex-col gap-2 p-3 rounded-2xl"
      style={{
        background: P.well,
        boxShadow: Pr(3, 8),
        border: `1.5px dashed ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(112,104,168,0.2)'}`
      }}
    >
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Add a memorable quote…"
        rows={2}
        className="w-full bg-transparent text-sm placeholder-opacity-40 outline-none resize-none leading-relaxed"
        style={{ color: P.title }}
      />
      <div className="flex items-center gap-2">
        <div
          className="rounded-xl"
          style={{ background: P.panel, boxShadow: pressed(NEUTRAL_RGB, dark, 2, 5) }}
        >
          <input
            type="number"
            value={page}
            onChange={e => setPage(e.target.value)}
            placeholder="Page #"
            className="w-20 bg-transparent px-3 py-1.5 text-xs outline-none"
            style={{ color: P.body }}
          />
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={!text.trim()}
          className="flex-1 sm:flex-none px-4 py-1.5 rounded-full text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:-translate-y-0.5 active:scale-95"
          style={primaryFill(dark)}
        >
          + Add Quote
        </button>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function EditModal({
  book,
  onClose,
  onSave
}: {
  book: Book
  onClose: () => void
  onSave: (book: Book) => void
}) {
  const [formData, setFormData] = useState<Book>(book)
  const [activeTab, setActiveTab] = useState<'edit' | 'files' | 'info'>('edit')
  const [uploadingPdf, setUploadingPdf] = useState(false)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains('dark'))
    )
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const P = palette(isDark)
  const R = (d = 8, b = 20) => raised(NEUTRAL_RGB, isDark, d, b)
  const Pr = (d = 4, b = 10) => pressed(NEUTRAL_RGB, isDark, d, b)

  const inputStyle = {
    background: P.well,
    boxShadow: Pr(4, 10),
    color: P.title
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target
    let finalValue: string | boolean | number = value
    if (type === 'checkbox') finalValue = (e.target as HTMLInputElement).checked
    else if (type === 'number') finalValue = parseFloat(value) || 0
    setFormData(prev => ({ ...prev, [name]: finalValue }))
  }

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingPdf(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload-pdf', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.success) {
        setFormData(prev => ({ ...prev, pdfPath: data.path }))
      } else {
        const { toast: showToast } = await import('../components/Toast')
        showToast(data.error || 'Failed to upload PDF', 'error')
      }
    } catch (error) {
      console.error(error)
      const { toast: showToast } = await import('../components/Toast')
      showToast('Error uploading file.', 'error')
    } finally {
      setUploadingPdf(false)
    }
  }

  const tabs = [
    { id: 'edit' as const, label: 'My Details' },
    { id: 'files' as const, label: 'Digital' },
    { id: 'info' as const, label: 'Book Info' }
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="w-full max-w-4xl rounded-t-[32px] sm:rounded-[32px] flex flex-col md:flex-row animate-slide-bottom sm:animate-scale-in overflow-hidden"
        style={{
          background: P.panel,
          boxShadow: R(16, 40),
          maxHeight: '95dvh'
        }}
      >
        {/* Pull handle — mobile only */}
        <div className="flex justify-center pt-3 pb-1 md:hidden shrink-0">
          <div
            className="w-10 h-1 rounded-full"
            style={{ background: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(112,104,168,0.25)' }}
          />
        </div>

        {/* ──────────────────────────────────────────────────────────────── */}
        {/* Left Panel: Cover Preview                                        */}
        {/* ──────────────────────────────────────────────────────────────── */}
        <div
          className="md:w-64 xl:w-72 p-5 flex flex-col gap-5 border-b md:border-b-0 md:border-r overflow-y-auto custom-scrollbar shrink-0"
          style={{
            background: P.canvas,
            borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(112,104,168,0.12)'
          }}
        >
          {/* Cover */}
          <div
            className="aspect-[2/3] w-full relative rounded-2xl overflow-hidden"
            style={{ boxShadow: R(8, 22) }}
          >
            {formData.coverFile || formData.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={formData.coverFile || formData.photoUrl}
                alt="Cover"
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex flex-col items-center justify-center gap-2"
                style={{ background: P.well, color: P.faint }}
              >
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1"
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-xs font-semibold">No Cover</span>
              </div>
            )}
          </div>

          {/* Title + Author */}
          <div>
            <h2 className="text-base font-bold leading-tight mb-1" style={{ color: P.title }}>
              {formData.title}
            </h2>
            <p className="text-sm" style={{ color: P.body }}>{formData.author}</p>
          </div>

          {/* Meta rows */}
          <div className="flex flex-col gap-0.5">
            {[
              { label: 'Launch Year', value: formData.launchYear || 'Unknown' },
              { label: 'Language', value: formData.originalLanguage || 'English' },
              { label: 'Origin', value: formData.countryOfOrigin || 'Unknown' },
              { label: 'Genre', value: formData.genre },
              { label: 'Volume', value: formData.volume || '—' }
            ].map(({ label, value }) => (
              <div
                key={label}
                className="flex justify-between items-center py-2.5"
                style={{
                  borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(112,104,168,0.1)'}`
                }}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: P.faint }}>
                  {label}
                </span>
                <span className="font-semibold text-xs" style={{ color: P.title }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ──────────────────────────────────────────────────────────────── */}
        {/* Right Panel                                                      */}
        {/* ──────────────────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Tabs */}
          <div
            className="flex shrink-0"
            style={{
              borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(112,104,168,0.12)'}`
            }}
          >
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex-1 py-4 text-xs font-bold tracking-widest uppercase transition-all relative"
                style={{
                  color: activeTab === tab.id
                    ? (isDark ? '#e38a71' : '#c46a4f')
                    : P.faint
                }}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <span
                    className="absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-full"
                    style={{ background: isDark ? '#e38a71' : '#c46a4f' }}
                  />
                )}
              </button>
            ))}
            <button
              onClick={onClose}
              className="px-5 transition-all hover:opacity-70 active:scale-90"
              style={{
                color: P.faint,
                borderLeft: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(112,104,168,0.12)'}`
              }}
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* ── Tab content ── */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-6">
            {activeTab === 'edit' ? (
              <div className="flex flex-col gap-5">

                {/* Cover URL */}
                <Field label="Cover Image URL">
                  <input
                    type="url"
                    name="photoUrl"
                    value={formData.photoUrl || ''}
                    onChange={handleChange}
                    placeholder="https://…"
                    className="w-full rounded-2xl p-3.5 text-sm font-medium focus:outline-none transition-all placeholder:opacity-50"
                    style={inputStyle}
                  />
                </Field>

                {/* Star Rating */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                    Your Rating
                  </label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        onClick={() =>
                          setFormData(p => ({ ...p, rating: p.rating === star ? 0 : star }))
                        }
                        className="text-2xl transition-all hover:scale-110 active:scale-95"
                        style={{
                          color: (formData.rating || 0) >= star
                            ? '#f59e0b'
                            : isDark ? 'rgba(255,255,255,0.12)' : 'rgba(30,35,48,0.12)',
                          filter: (formData.rating || 0) >= star
                            ? 'drop-shadow(0 0 4px rgba(245,158,11,0.6))'
                            : 'none'
                        }}
                      >
                        ★
                      </button>
                    ))}
                    {(formData.rating || 0) > 0 && (
                      <span className="ml-2 text-xs font-bold" style={{ color: '#f59e0b' }}>
                        {['', 'Terrible', 'Meh', 'Good', 'Great', 'Must Read'][formData.rating || 0]}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Status">
                    <div className="relative rounded-2xl" style={{ background: P.well, boxShadow: Pr(4, 10) }}>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        className="w-full appearance-none bg-transparent rounded-2xl p-3.5 text-sm font-medium focus:outline-none cursor-pointer pr-9"
                        style={{ color: P.title, colorScheme: isDark ? 'dark' : 'light' }}
                      >
                        <option value="Unread">Unread</option>
                        <option value="Reading">Reading</option>
                        <option value="Read">Read</option>
                        <option value="Wishlist">Wishlist</option>
                      </select>
                      <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                        style={{ color: P.faint }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </Field>
                  <Field label="Format">
                    <div className="relative rounded-2xl" style={{ background: P.well, boxShadow: Pr(4, 10) }}>
                      <select
                        name="format"
                        value={formData.format}
                        onChange={handleChange}
                        className="w-full appearance-none bg-transparent rounded-2xl p-3.5 text-sm font-medium focus:outline-none cursor-pointer pr-9"
                        style={{ color: P.title, colorScheme: isDark ? 'dark' : 'light' }}
                      >
                        <option value="None">None</option>
                        <option value="Physical">Physical</option>
                        <option value="PDF">PDF</option>
                        <option value="Audiobook">Audiobook</option>
                      </select>
                      <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                        style={{ color: P.faint }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Purchased?">
                    <div className="relative rounded-2xl" style={{ background: P.well, boxShadow: Pr(4, 10) }}>
                      <select
                        value={formData.purchased.toString()}
                        onChange={e =>
                          setFormData(p => ({ ...p, purchased: e.target.value === 'true' }))
                        }
                        className="w-full appearance-none bg-transparent rounded-2xl p-3.5 text-sm font-medium focus:outline-none cursor-pointer pr-9"
                        style={{ color: P.title, colorScheme: isDark ? 'dark' : 'light' }}
                      >
                        <option value="false">No (Free / Gift)</option>
                        <option value="true">Yes</option>
                      </select>
                      <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                        style={{ color: P.faint }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </Field>
                  <Field label="Price / Invested">
                    <input
                      type="number"
                      name="purchasePrice"
                      value={formData.purchasePrice}
                      onChange={handleChange}
                      disabled={!formData.purchased}
                      className="w-full rounded-2xl p-3.5 text-sm font-medium focus:outline-none transition-all disabled:opacity-40"
                      style={inputStyle}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Reading Start Date">
                    <input
                      type="date"
                      name="readingStartDate"
                      value={formData.readingStartDate || ''}
                      onChange={handleChange}
                      className="w-full rounded-2xl p-3.5 text-sm font-medium focus:outline-none transition-all"
                      style={{ ...inputStyle, colorScheme: isDark ? 'dark' : 'light' }}
                    />
                  </Field>
                  <Field label="Reading End Date">
                    <input
                      type="date"
                      name="readingEndDate"
                      value={formData.readingEndDate || ''}
                      onChange={handleChange}
                      className="w-full rounded-2xl p-3.5 text-sm font-medium focus:outline-none transition-all"
                      style={{ ...inputStyle, colorScheme: isDark ? 'dark' : 'light' }}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Physical Shelf / Row">
                    <input
                      type="text"
                      name="shelfRow"
                      value={formData.shelfRow || ''}
                      onChange={handleChange}
                      placeholder="e.g. Shelf A, Row 2"
                      className="w-full rounded-2xl p-3.5 text-sm font-medium focus:outline-none transition-all placeholder:opacity-50"
                      style={inputStyle}
                    />
                  </Field>
                  <Field label="Recommended By">
                    <input
                      type="text"
                      name="recommendedBy"
                      value={formData.recommendedBy || ''}
                      onChange={handleChange}
                      placeholder="Name or source"
                      className="w-full rounded-2xl p-3.5 text-sm font-medium focus:outline-none transition-all placeholder:opacity-50"
                      style={inputStyle}
                    />
                  </Field>
                </div>

                {/* Loan Tracking */}
                <div
                  className="p-4 rounded-2xl flex flex-col gap-4"
                  style={{
                    background: isDark ? 'rgba(196,106,79,0.08)' : 'rgba(196,106,79,0.06)',
                    border: `1px solid ${isDark ? 'rgba(196,106,79,0.2)' : 'rgba(196,106,79,0.15)'}`
                  }}
                >
                  <p
                    className="text-xs font-bold uppercase tracking-widest"
                    style={{ color: isDark ? '#e38a71' : '#c46a4f' }}
                  >
                    📚 Loan Tracking
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Loaned To">
                      <input
                        type="text"
                        name="givenTo"
                        value={formData.givenTo || ''}
                        onChange={handleChange}
                        placeholder="Person's name"
                        className="w-full rounded-2xl p-3.5 text-sm font-medium focus:outline-none transition-all placeholder:opacity-50"
                        style={inputStyle}
                      />
                    </Field>
                    <Field label="Loan Date">
                      <input
                        type="date"
                        name="loanDate"
                        value={formData.loanDate || ''}
                        onChange={handleChange}
                        className="w-full rounded-2xl p-3.5 text-sm font-medium focus:outline-none transition-all"
                        style={{ ...inputStyle, colorScheme: isDark ? 'dark' : 'light' }}
                      />
                    </Field>
                  </div>
                </div>

                <Field label="Amazon / Store Link">
                  <input
                    type="url"
                    name="amazonLink"
                    value={formData.amazonLink || ''}
                    onChange={handleChange}
                    placeholder="https://amazon.com/..."
                    className="w-full rounded-2xl p-3.5 text-sm font-medium focus:outline-none transition-all placeholder:opacity-50"
                    style={inputStyle}
                  />
                </Field>

                <Field label="My Notes / Summary">
                  <textarea
                    name="summary"
                    value={formData.summary || ''}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Your thoughts, key takeaways…"
                    className="w-full rounded-2xl p-3.5 text-sm font-medium focus:outline-none transition-all resize-none leading-relaxed placeholder:opacity-50"
                    style={inputStyle}
                  />
                </Field>

                {/* Favourite Quotes */}
                <div className="flex flex-col gap-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                    💬 Favourite Quotes
                  </label>
                  {(formData.quotes || []).map((q, i) => (
                    <div
                      key={i}
                      className="relative group p-3 rounded-2xl"
                      style={{
                        background: P.well,
                        boxShadow: Pr(3, 8)
                      }}
                    >
                      <p className="text-sm leading-relaxed pr-6 italic" style={{ color: P.body }}>
                        &quot;{q.text}&quot;
                      </p>
                      {q.page && (
                        <p className="text-[10px] mt-1" style={{ color: P.faint }}>— p.{q.page}</p>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setFormData(p => ({
                            ...p,
                            quotes: (p.quotes || []).filter((_, idx) => idx !== i)
                          }))
                        }
                        className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-all opacity-0 group-hover:opacity-100 hover:scale-110"
                        style={{
                          background: P.panel,
                          color: P.faint,
                          boxShadow: raised(NEUTRAL_RGB, isDark, 2, 5)
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <QuoteAdder
                    dark={isDark}
                    onAdd={(text, page) =>
                      setFormData(p => ({
                        ...p,
                        quotes: [
                          ...(p.quotes || []),
                          { text, page: page || undefined, addedAt: new Date().toISOString() }
                        ]
                      }))
                    }
                  />
                </div>
              </div>

            ) : activeTab === 'files' ? (
              <div className="flex flex-col gap-6">
                <div
                  className="p-4 rounded-2xl flex flex-col gap-4"
                  style={{
                    background: isDark ? 'rgba(196,106,79,0.08)' : 'rgba(196,106,79,0.06)',
                    border: `1px solid ${isDark ? 'rgba(196,106,79,0.2)' : 'rgba(196,106,79,0.15)'}`
                  }}
                >
                  <p
                    className="text-xs font-bold uppercase tracking-widest flex items-center gap-2"
                    style={{ color: isDark ? '#e38a71' : '#c46a4f' }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    Digital PDF Reader
                  </p>

                  <Field label="Upload PDF File">
                    <div className="relative">
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={handlePdfUpload}
                        disabled={uploadingPdf}
                        className={`block w-full text-sm file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:tracking-wider file:uppercase transition-all ${uploadingPdf ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        style={{
                          color: P.faint,
                        }}
                      />
                      {uploadingPdf && (
                        <div
                          className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-xs font-bold"
                          style={{ color: isDark ? '#e38a71' : '#c46a4f' }}
                        >
                          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10"
                              stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          UPLOADING…
                        </div>
                      )}
                    </div>
                  </Field>

                  {formData.pdfPath && (
                    <div
                      className="flex items-center justify-between p-3 rounded-xl"
                      style={{ background: P.panel, boxShadow: R(4, 10) }}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{
                            background: 'rgba(16,185,129,0.15)',
                            color: '#10b981'
                          }}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
                              d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate" style={{ color: P.title }}>
                            PDF Attached
                          </p>
                          <p className="text-[10px] truncate" style={{ color: P.faint }}>
                            {formData.pdfPath}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          setFormData(p => ({
                            ...p,
                            pdfPath: undefined,
                            currentPage: undefined,
                            totalPages: undefined,
                            readingSessions: []
                          }))
                        }
                        className="text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors hover:opacity-80"
                        style={{ color: '#ef4444' }}
                      >
                        REMOVE
                      </button>
                    </div>
                  )}
                </div>
              </div>

            ) : (
              <div className="flex flex-col gap-5">
                <Field label="ISBN">
                  <input
                    type="text"
                    name="isbn"
                    value={formData.isbn || ''}
                    onChange={handleChange}
                    placeholder="e.g. 978-3-16-148410-0"
                    className="w-full rounded-2xl p-3.5 text-sm font-medium focus:outline-none transition-all placeholder:opacity-50"
                    style={inputStyle}
                  />
                </Field>

                <div className="flex flex-col gap-2">
                  <label
                    className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"
                    style={{ color: isDark ? '#e38a71' : '#c46a4f' }}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Book Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description || ''}
                    onChange={handleChange}
                    rows={6}
                    className="w-full rounded-2xl p-3.5 text-sm font-medium focus:outline-none transition-all custom-scrollbar resize-none leading-relaxed"
                    style={inputStyle}
                  />
                </div>

                <Field label="About the Author">
                  <textarea
                    name="authorDescription"
                    value={formData.authorDescription || ''}
                    onChange={handleChange}
                    rows={4}
                    className="w-full rounded-2xl p-3.5 text-sm font-medium focus:outline-none transition-all custom-scrollbar resize-none leading-relaxed"
                    style={inputStyle}
                  />
                </Field>
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div
            className="p-5 flex justify-end gap-3 shrink-0"
            style={{
              borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(112,104,168,0.12)'}`,
              background: P.canvas
            }}
          >
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold rounded-full transition-all hover:opacity-80 active:scale-95"
              style={{
                background: P.well,
                color: P.body,
                boxShadow: Pr(3, 8)
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(formData)}
              className="px-7 py-2.5 text-sm font-bold rounded-full transition-all hover:-translate-y-0.5 active:scale-[0.98]"
              style={primaryFill(isDark)}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
