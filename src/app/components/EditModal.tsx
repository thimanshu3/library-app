'use client'

import { useEffect, useState } from 'react'
import { Book } from '../types'

const inputClass =
  'w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 text-sm font-medium focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none text-slate-900 dark:text-white transition-all placeholder-slate-400'

const selectClass =
  'w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 text-sm font-medium focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none text-slate-900 dark:text-white transition-all appearance-none cursor-pointer'

const labelClass =
  'text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest'

const Field = ({
  label,
  children
}: {
  label: string
  children: React.ReactNode
}) => (
  <div className="flex flex-col gap-1.5">
    <label className={labelClass}>{label}</label>
    {children}
  </div>
)

function QuoteAdder({
  onAdd
}: {
  onAdd: (text: string, page: number) => void
}) {
  const [text, setText] = useState('')
  const [page, setPage] = useState('')

  const handleAdd = () => {
    if (!text.trim()) return
    onAdd(text.trim(), parseInt(page) || 0)
    setText('')
    setPage('')
  }

  return (
    <div className="flex flex-col gap-2 p-3 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Add a memorable quote…"
        rows={2}
        className="w-full bg-transparent text-sm text-slate-700 dark:text-slate-300 placeholder-slate-400 outline-none resize-none leading-relaxed"
      />
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={page}
          onChange={e => setPage(e.target.value)}
          placeholder="Page #"
          className="w-20 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs outline-none text-slate-700 dark:text-slate-300 focus:border-accent"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!text.trim()}
          className="px-4 py-1.5 rounded-full bg-[#171b2e] text-white text-xs font-bold hover:bg-[#171b2e] disabled:opacity-40 disabled:cursor-not-allowed transition-all ml-1 flex-1 sm:flex-none sm:w-auto text-center"
        >
          + Add Quote
        </button>
      </div>
    </div>
  )
}

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

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
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
      const res = await fetch('/api/upload-pdf', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      if (data.success) {
        setFormData(prev => ({ ...prev, pdfPath: data.path }))
      } else {
        // Use app toast instead of browser alert
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="bg-slate-50 dark:bg-[#0c0c12] border border-slate-200/60 dark:border-slate-800/40 w-full max-w-4xl rounded-t-[32px] sm:rounded-[32px] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)] flex flex-col md:flex-row animate-slide-bottom sm:animate-scale-in"
        style={{ maxHeight: '95dvh' }}
      >
        {/* Pull handle — mobile */}
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-slate-700" />
        </div>

        {/* ───── Left Panel: Cover Preview ───── */}
        <div className="md:w-72 bg-white dark:bg-slate-950 md:rounded-l-[28px] p-6 flex flex-col gap-5 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 overflow-y-auto custom-scrollbar shrink-0">
          <div className="aspect-[2/3] w-full relative rounded-2xl overflow-hidden shadow-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            {formData.coverFile || formData.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={formData.coverFile || formData.photoUrl}
                alt="Cover"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-600">
                <svg
                  className="w-10 h-10"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1"
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span className="text-xs">No Cover</span>
              </div>
            )}
          </div>

          <div>
            <h2 className="text-lg font-bold leading-tight mb-1 text-slate-900 dark:text-white">
              {formData.title}
            </h2>
            <p className="text-slate-500 text-sm">{formData.author}</p>
          </div>

          <div className="flex flex-col gap-3 text-sm text-slate-700 dark:text-slate-300">
            {[
              { label: 'Launch Year', value: formData.launchYear || 'Unknown' },
              {
                label: 'Language',
                value: formData.originalLanguage || 'English'
              },
              { label: 'Origin', value: formData.countryOfOrigin || 'Unknown' },
              { label: 'Genre', value: formData.genre },
              { label: 'Volume', value: formData.volume || '—' }
            ].map(({ label, value }) => (
              <div
                key={label}
                className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800/60 last:border-0"
              >
                <span className="text-slate-400 dark:text-slate-500 font-medium text-xs uppercase tracking-wider">
                  {label}
                </span>
                <span className="font-semibold text-slate-900 dark:text-white text-sm">
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ───── Right Panel ───── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 shrink-0">
            {(['edit', 'files', 'info'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-4 text-xs font-bold tracking-widest uppercase transition-colors ${
                  activeTab === tab
                    ? 'text-accent dark:text-accent-dim border-b-2 border-accent'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                {tab === 'edit'
                  ? 'My Details'
                  : tab === 'files'
                    ? 'Digital'
                    : 'Book Info'}
              </button>
            ))}
            <button
              onClick={onClose}
              className="px-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 border-l border-slate-200 dark:border-slate-800 transition-colors"
              aria-label="Close"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
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
                    className={inputClass}
                  />
                </Field>

                {/* Star Rating */}
                <div className="flex flex-col gap-1.5">
                  <label className={labelClass}>Your Rating</label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        onClick={() =>
                          setFormData(p => ({
                            ...p,
                            rating: p.rating === star ? 0 : star
                          }))
                        }
                        className={`text-2xl transition-all hover:scale-110 active:scale-95 ${
                          (formData.rating || 0) >= star
                            ? 'text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.6)]'
                            : 'text-slate-200 dark:text-slate-700 hover:text-amber-300'
                        }`}
                      >
                        ★
                      </button>
                    ))}
                    {(formData.rating || 0) > 0 && (
                      <span className="ml-2 text-xs font-bold text-amber-500">
                        {
                          ['', 'Terrible', 'Meh', 'Good', 'Great', 'Must Read'][
                            formData.rating || 0
                          ]
                        }
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Status">
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className={selectClass}
                    >
                      <option value="Unread">Unread</option>
                      <option value="Reading">Reading</option>
                      <option value="Read">Read</option>
                      <option value="Wishlist">Wishlist</option>
                    </select>
                  </Field>
                  <Field label="Format">
                    <select
                      name="format"
                      value={formData.format}
                      onChange={handleChange}
                      className={selectClass}
                    >
                      <option value="None">None</option>
                      <option value="Physical">Physical</option>
                      <option value="PDF">PDF</option>
                      <option value="Audiobook">Audiobook</option>
                    </select>
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Purchased?">
                    <select
                      value={formData.purchased.toString()}
                      onChange={e =>
                        setFormData(p => ({
                          ...p,
                          purchased: e.target.value === 'true'
                        }))
                      }
                      className={selectClass}
                    >
                      <option value="false">No (Free / Gift)</option>
                      <option value="true">Yes</option>
                    </select>
                  </Field>
                  <Field label="Price / Invested ($)">
                    <input
                      type="number"
                      name="purchasePrice"
                      value={formData.purchasePrice}
                      onChange={handleChange}
                      disabled={!formData.purchased}
                      className={`${inputClass} disabled:opacity-40`}
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
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Reading End Date">
                    <input
                      type="date"
                      name="readingEndDate"
                      value={formData.readingEndDate || ''}
                      onChange={handleChange}
                      className={inputClass}
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
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Recommended By">
                    <input
                      type="text"
                      name="recommendedBy"
                      value={formData.recommendedBy || ''}
                      onChange={handleChange}
                      placeholder="Name or source"
                      className={inputClass}
                    />
                  </Field>
                </div>

                {/* Loan info */}
                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-2xl flex flex-col gap-4">
                  <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">
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
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Loan Date">
                      <input
                        type="date"
                        name="loanDate"
                        value={formData.loanDate || ''}
                        onChange={handleChange}
                        className={inputClass}
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
                    className={inputClass}
                  />
                </Field>

                <Field label="My Notes / Summary">
                  <textarea
                    name="summary"
                    value={formData.summary || ''}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Your thoughts, key takeaways…"
                    className={`${inputClass} resize-none leading-relaxed`}
                  />
                </Field>

                {/* Favourite Quotes */}
                <div className="flex flex-col gap-3">
                  <label className={labelClass}>💬 Favourite Quotes</label>
                  {(formData.quotes || []).map((q, i) => (
                    <div
                      key={i}
                      className="relative group p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl"
                    >
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed pr-6 italic">
                        &quot;{q.text}&quot;
                      </p>
                      {q.page && (
                        <p className="text-[10px] text-slate-400 mt-1">
                          — p.{q.page}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setFormData(p => ({
                            ...p,
                            quotes: (p.quotes || []).filter(
                              (_, idx) => idx !== i
                            )
                          }))
                        }
                        className="absolute top-2 right-2 w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-950/40 flex items-center justify-center text-xs font-bold transition-colors opacity-0 group-hover:opacity-100"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <QuoteAdder
                    onAdd={(text, page) =>
                      setFormData(p => ({
                        ...p,
                        quotes: [
                          ...(p.quotes || []),
                          {
                            text,
                            page: page || undefined,
                            addedAt: new Date().toISOString()
                          }
                        ]
                      }))
                    }
                  />
                </div>
              </div>
            ) : activeTab === 'files' ? (
              <div className="flex flex-col gap-6">
                <div className="p-4 bg-accent-container dark:bg-indigo-950/20 border border-accent-container dark:border-indigo-900/30 rounded-2xl flex flex-col gap-4">
                  <p className="text-xs font-bold text-accent dark:text-accent-dim uppercase tracking-widest flex items-center gap-2">
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
                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
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
                        className={`block w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:tracking-wider file:uppercase file:bg-accent-container file:text-indigo-700 hover:file:bg-indigo-200 dark:file:bg-indigo-900 dark:file:text-indigo-300 dark:hover:file:bg-indigo-800 transition-all ${uploadingPdf ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      />
                      {uploadingPdf && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-accent text-xs font-bold">
                          <svg
                            className="animate-spin w-4 h-4"
                            viewBox="0 0 24 24"
                          >
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
                          UPLOADING...
                        </div>
                      )}
                    </div>
                  </Field>

                  {formData.pdfPath && (
                    <div className="mt-2 flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-500 flex items-center justify-center shrink-0">
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
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                            PDF Attached
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
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
                        className="text-[10px] font-bold text-red-500 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      >
                        REMOVE
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                <Field label="ISBN">
                  <input
                    type="text"
                    name="isbn"
                    value={formData.isbn || ''}
                    onChange={handleChange}
                    placeholder="e.g. 978-3-16-148410-0"
                    className={inputClass}
                  />
                </Field>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] text-accent-dim font-bold uppercase tracking-widest flex items-center gap-2">
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    Book Description
                  </label>
                  <Field label="Book Description">
                    <textarea
                      name="description"
                      value={formData.description || ''}
                      onChange={handleChange}
                      rows={6}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 text-sm focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none text-slate-900 dark:text-white transition-all custom-scrollbar"
                    />
                  </Field>

                  <Field label="About the Author">
                    <textarea
                      name="authorDescription"
                      value={formData.authorDescription || ''}
                      onChange={handleChange}
                      rows={4}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 text-sm focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none text-slate-900 dark:text-white transition-all custom-scrollbar"
                    />
                  </Field>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 bg-white dark:bg-slate-950/30 shrink-0">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold rounded-full text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-slate-200 dark:border-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(formData)}
              className="px-7 py-2.5 text-sm font-bold rounded-2xl bg-accent text-white hover:bg-accent transition-all shadow-lg shadow-accent/25 active:scale-[0.98]"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
