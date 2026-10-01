'use client'

import type { ChangeEvent, ReactNode } from 'react'
import { useEffect, useState } from 'react'
import {
  chipShadow,
  clayFill,
  NEUTRAL_RGB,
  palette,
  pressed,
  raised,
  statusTheme
} from '../clay'
import { Book } from '../types'

// App primary (rust/terracotta) — matches --primary in globals.css
const PRIMARY_RGB = '196,106,79'
const primaryFill = (dark: boolean) =>
  clayFill(
    PRIMARY_RGB,
    dark ? '#e38a71' : '#d37d64',
    dark ? '#c46a4f' : '#c46a4f',
    4
  )

const inputCls =
  'w-full rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[rgba(196,106,79,0.4)] transition-all placeholder:opacity-50 disabled:opacity-40'

// ─── Icons ────────────────────────────────────────────────────────────────────
const paths = {
  image:
    'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
  star: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
  book: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
  wallet:
    'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
  users:
    'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  edit: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  quotes:
    'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z',
  pdf: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z',
  doc: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  user: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  upload: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12',
  trash:
    'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
  check: 'M5 13l4 4L19 7',
  close: 'M6 18L18 6M6 6l12 12',
  chevron: 'M19 9l-7 7-7-7',
  plus: 'M12 4v16m8-8H4'
}

const Icon = ({
  d,
  className = 'w-4 h-4',
  stroke = 2
}: {
  d: string
  className?: string
  stroke?: number
}) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={stroke}
      d={d}
    />
  </svg>
)

// ─── Clay building blocks ─────────────────────────────────────────────────────
function Field({
  label,
  children,
  dark
}: {
  label: string
  children: ReactNode
  dark: boolean
}) {
  const P = palette(dark)
  return (
    <label className="flex flex-col gap-1.5 min-w-0">
      <span
        className="text-[12px] font-semibold pl-1"
        style={{ color: P.body }}
      >
        {label}
      </span>
      {children}
    </label>
  )
}

function Group({
  icon,
  title,
  dark,
  tint,
  children
}: {
  icon: string
  title: string
  dark: boolean
  tint?: string
  children: ReactNode
}) {
  const P = palette(dark)
  const primary = dark ? '#e38a71' : '#c46a4f'
  return (
    <section
      className="rounded-[28px] p-4 sm:p-5 flex flex-col gap-4"
      style={{
        backgroundColor: P.panel,
        backgroundImage: tint
          ? `linear-gradient(135deg, rgba(${tint},${dark ? 0.16 : 0.12}) 0%, rgba(${tint},0) 60%)`
          : undefined,
        boxShadow: raised(NEUTRAL_RGB, dark, 6, 16)
      }}
    >
      <div className="flex items-center gap-2.5">
        <span
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{
            background: P.panel,
            color: primary,
            boxShadow: raised(NEUTRAL_RGB, dark, 3, 8)
          }}
        >
          <Icon d={icon} className="w-4 h-4" />
        </span>
        <h3
          className="font-syne font-black text-[15px]"
          style={{ color: P.title }}
        >
          {title}
        </h3>
      </div>
      {children}
    </section>
  )
}

function SelectBox({
  name,
  value,
  onChange,
  dark,
  children
}: {
  name?: string
  value: string
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void
  dark: boolean
  children: ReactNode
}) {
  const P = palette(dark)
  return (
    <span
      className="relative block rounded-2xl"
      style={{
        background: P.well,
        boxShadow: pressed(NEUTRAL_RGB, dark, 4, 10),
        color: P.faint
      }}
    >
      <select
        name={name}
        value={value}
        onChange={onChange}
        className="w-full appearance-none bg-transparent rounded-2xl pl-4 pr-10 py-3 text-sm font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-[rgba(196,106,79,0.4)]"
        style={{ color: P.title, colorScheme: dark ? 'dark' : 'light' }}
      >
        {children}
      </select>
      <Icon
        d={paths.chevron}
        className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
      />
    </span>
  )
}

// ─── Quote adder ──────────────────────────────────────────────────────────────
function QuoteAdder({
  onAdd,
  dark
}: {
  onAdd: (text: string, page: number) => void
  dark: boolean
}) {
  const P = palette(dark)
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
      className="flex flex-col gap-3 p-3.5 rounded-[24px]"
      style={{
        background: P.well,
        boxShadow: pressed(NEUTRAL_RGB, dark, 3, 8)
      }}
    >
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Add a memorable quote…"
        rows={2}
        className="w-full bg-transparent text-sm outline-none resize-none leading-relaxed placeholder:opacity-50"
        style={{ color: P.title }}
      />
      <div className="flex items-center gap-2.5">
        <div
          className="rounded-xl"
          style={{
            background: P.panel,
            boxShadow: pressed(NEUTRAL_RGB, dark, 2, 5)
          }}
        >
          <input
            type="number"
            value={page}
            onChange={e => setPage(e.target.value)}
            placeholder="Page #"
            className="w-24 bg-transparent px-3 py-2 text-xs outline-none placeholder:opacity-50"
            style={{ color: P.body }}
          />
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={!text.trim()}
          className="flex-1 sm:flex-none px-5 py-2 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:-translate-y-0.5 active:scale-95"
          style={primaryFill(dark)}
        >
          <Icon d={paths.plus} className="w-3.5 h-3.5" stroke={2.5} />
          Add quote
        </button>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
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
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })
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
  const primary = isDark ? '#e38a71' : '#c46a4f'

  // Left panel follows the live status choice
  const st =
    formData.status !== 'All' && statusTheme[formData.status]
      ? statusTheme[formData.status]
      : statusTheme.Unread
  const acc = isDark ? st.from : st.to
  const wellL = isDark ? 'rgba(0,0,0,.22)' : `rgba(${st.rgb},.09)`
  const cover = formData.coverFile || formData.photoUrl || ''
  const dirty = JSON.stringify(formData) !== JSON.stringify(book)

  const inputStyle = {
    background: P.well,
    boxShadow: Pr(4, 10),
    color: P.title
  }

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target
    let finalValue: string | boolean | number = value
    if (type === 'checkbox') finalValue = (e.target as HTMLInputElement).checked
    else if (type === 'number') finalValue = parseFloat(value) || 0
    setFormData(prev => ({ ...prev, [name]: finalValue }))
  }

  const handlePdfUpload = async (e: ChangeEvent<HTMLInputElement>) => {
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
    { id: 'edit' as const, label: 'My details' },
    { id: 'files' as const, label: 'Digital' },
    { id: 'info' as const, label: 'Book info' }
  ]

  const metaRows = [
    { label: 'Launch year', value: formData.launchYear || 'Unknown' },
    { label: 'Language', value: formData.originalLanguage || 'English' },
    { label: 'Origin', value: formData.countryOfOrigin || 'Unknown' },
    { label: 'Genre', value: formData.genre },
    { label: 'Volume', value: formData.volume || '—' }
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      style={{
        background: isDark ? 'rgba(6,8,16,.72)' : 'rgba(40,32,80,.42)',
        backdropFilter: 'blur(14px)'
      }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="w-full max-w-4xl rounded-t-[36px] sm:rounded-[40px] flex flex-col md:flex-row animate-slide-bottom sm:animate-scale-in overflow-hidden"
        style={{
          background: P.panel,
          boxShadow: R(16, 44),
          maxHeight: '95dvh'
        }}
      >
        {/* ─────────────── Left panel: live preview ─────────────── */}
        <div
          className="md:w-72 xl:w-80 shrink-0 p-4 md:p-5 flex flex-row md:flex-col gap-4 md:gap-5 md:overflow-y-auto custom-scrollbar"
          style={{
            backgroundColor: P.panel,
            backgroundImage: `linear-gradient(160deg, rgba(${st.rgb},${isDark ? 0.2 : 0.16}) 0%, rgba(${st.rgb},${isDark ? 0.08 : 0.05}) 100%)`
          }}
        >
          {/* Cover well */}
          <div
            className="relative w-24 md:w-full shrink-0 self-start rounded-[24px] md:rounded-[30px] overflow-hidden flex items-center justify-center p-2.5 md:py-7"
            style={{ background: wellL }}
          >
            {cover && (
              <div
                aria-hidden="true"
                className="absolute inset-0 scale-125 blur-2xl opacity-40"
                style={{
                  backgroundImage: `url(${cover})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              />
            )}
            <div
              className="relative z-10 w-full md:w-[170px] aspect-[2/3] rounded-xl md:rounded-2xl overflow-hidden md:-rotate-2 md:hover:rotate-0 transition-transform duration-500"
              style={{
                boxShadow:
                  '10px 16px 30px rgba(0,0,0,.35), -2px -2px 8px rgba(255,255,255,.25)'
              }}
            >
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cover}
                  alt="Cover preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full flex flex-col items-center justify-center gap-2"
                  style={{
                    background: `linear-gradient(145deg, ${st.from}, ${st.to})`,
                    color: 'rgba(255,255,255,.85)'
                  }}
                >
                  <Icon
                    d={paths.image}
                    className="w-8 h-8 md:w-10 md:h-10"
                    stroke={1.5}
                  />
                  <span className="hidden md:block text-[11px] font-bold">
                    No cover
                  </span>
                </div>
              )}
            </div>
            <div
              aria-hidden="true"
              className="absolute inset-0 rounded-[inherit] pointer-events-none z-20"
              style={{ boxShadow: pressed(st.rgb, isDark, 4, 10) }}
            />
          </div>

          {/* Identity + meta */}
          <div className="flex-1 min-w-0 flex flex-col gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
                style={{
                  background: isDark
                    ? `rgba(${st.rgb},.2)`
                    : `rgba(${st.rgb},.13)`,
                  color: acc,
                  boxShadow: chipShadow(isDark)
                }}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${formData.status === 'Reading' ? 'animate-pulse' : ''}`}
                  style={{ background: acc }}
                />
                {formData.status}
              </span>
            </div>

            <div className="min-w-0">
              <h2
                className="font-syne font-black text-base md:text-lg leading-snug line-clamp-3"
                style={{ color: P.title }}
              >
                {formData.title}
              </h2>
              <p
                className="mt-0.5 text-[13px] font-semibold truncate"
                style={{ color: P.body }}
              >
                {formData.author}
              </p>
            </div>

            <div
              className="hidden md:block rounded-[22px] overflow-hidden"
              style={{
                background: wellL,
                boxShadow: pressed(st.rgb, isDark, 3, 8)
              }}
            >
              {metaRows.map(({ label, value }, i) => (
                <div
                  key={label}
                  className="flex justify-between items-center gap-3 px-4 py-2.5"
                  style={
                    i < metaRows.length - 1
                      ? { borderBottom: `1px solid rgba(${st.rgb},.14)` }
                      : undefined
                  }
                >
                  <span
                    className="text-[11px] font-semibold shrink-0"
                    style={{ color: P.faint }}
                  >
                    {label}
                  </span>
                  <span
                    className="text-[12px] font-bold truncate text-right"
                    style={{ color: P.title }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─────────────── Right panel ─────────────── */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
          {/* Tabs + close */}
          <div className="shrink-0 px-4 sm:px-6 pt-4 sm:pt-5 pb-3 flex items-center gap-3">
            <div
              role="tablist"
              className="flex flex-1 min-w-0 p-1.5 rounded-[22px] gap-1 overflow-x-auto hide-scrollbar"
              style={{ background: P.well, boxShadow: Pr(4, 10) }}
            >
              {tabs.map(tab => {
                const on = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={on}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 px-4 py-2 rounded-2xl text-[12px] font-bold whitespace-nowrap transition-all duration-200 ${on ? '' : 'opacity-75 hover:opacity-100'}`}
                    style={
                      on
                        ? {
                            background: P.panel,
                            color: primary,
                            boxShadow: R(3, 8)
                          }
                        : { color: P.body }
                    }
                  >
                    {tab.label}
                  </button>
                )
              })}
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="w-10 h-10 shrink-0 rounded-2xl flex items-center justify-center transition-all hover:-translate-y-0.5 active:scale-90"
              style={{
                background: P.panel,
                color: P.body,
                boxShadow: R(4, 10)
              }}
            >
              <Icon d={paths.close} stroke={2.5} />
            </button>
          </div>

          {/* ── Tab content ── */}
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4 sm:px-6 pt-3 pb-6">
            {activeTab === 'edit' ? (
              <div className="flex flex-col gap-6">
                {/* Cover and rating */}
                <Group
                  icon={paths.image}
                  title="Cover and rating"
                  dark={isDark}
                >
                  <Field label="Cover image URL" dark={isDark}>
                    <input
                      type="url"
                      name="photoUrl"
                      value={formData.photoUrl || ''}
                      onChange={handleChange}
                      placeholder="https://…"
                      className={inputCls}
                      style={inputStyle}
                    />
                  </Field>

                  <div className="flex flex-col gap-1.5">
                    <span
                      className="text-[12px] font-semibold pl-1"
                      style={{ color: P.body }}
                    >
                      Your rating
                    </span>
                    <div className="flex items-center gap-3 flex-wrap">
                      <div
                        className="inline-flex items-center gap-0.5 px-3 py-1.5 rounded-2xl"
                        style={{ background: P.well, boxShadow: Pr(3, 8) }}
                      >
                        {[1, 2, 3, 4, 5].map(star => (
                          <button
                            key={star}
                            type="button"
                            aria-label={`${star} star${star > 1 ? 's' : ''}`}
                            onClick={() =>
                              setFormData(p => ({
                                ...p,
                                rating: p.rating === star ? 0 : star
                              }))
                            }
                            className="text-2xl leading-none px-0.5 transition-all hover:scale-125 active:scale-90"
                            style={{
                              color:
                                (formData.rating || 0) >= star
                                  ? '#f59e0b'
                                  : isDark
                                    ? 'rgba(255,255,255,0.12)'
                                    : 'rgba(30,35,48,0.12)',
                              filter:
                                (formData.rating || 0) >= star
                                  ? 'drop-shadow(0 1px 3px rgba(245,158,11,0.55))'
                                  : 'none'
                            }}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                      {(formData.rating || 0) > 0 && (
                        <span
                          className="text-xs font-bold"
                          style={{ color: isDark ? '#fcd34d' : '#b45309' }}
                        >
                          {
                            [
                              '',
                              'Terrible',
                              'Meh',
                              'Good',
                              'Great',
                              'Must read'
                            ][formData.rating || 0]
                          }
                        </span>
                      )}
                    </div>
                  </div>
                </Group>

                {/* Reading */}
                <Group icon={paths.book} title="Reading" dark={isDark}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Status" dark={isDark}>
                      <SelectBox
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        dark={isDark}
                      >
                        <option value="Unread">Unread</option>
                        <option value="Reading">Reading</option>
                        <option value="Read">Read</option>
                        <option value="Wishlist">Wishlist</option>
                      </SelectBox>
                    </Field>
                    <Field label="Format" dark={isDark}>
                      <SelectBox
                        name="format"
                        value={formData.format}
                        onChange={handleChange}
                        dark={isDark}
                      >
                        <option value="None">None</option>
                        <option value="Physical">Physical</option>
                        <option value="PDF">PDF</option>
                        <option value="Audiobook">Audiobook</option>
                      </SelectBox>
                    </Field>
                    <Field label="Reading start date" dark={isDark}>
                      <input
                        type="date"
                        name="readingStartDate"
                        value={formData.readingStartDate || ''}
                        onChange={handleChange}
                        className={inputCls}
                        style={{
                          ...inputStyle,
                          colorScheme: isDark ? 'dark' : 'light'
                        }}
                      />
                    </Field>
                    <Field label="Reading end date" dark={isDark}>
                      <input
                        type="date"
                        name="readingEndDate"
                        value={formData.readingEndDate || ''}
                        onChange={handleChange}
                        className={inputCls}
                        style={{
                          ...inputStyle,
                          colorScheme: isDark ? 'dark' : 'light'
                        }}
                      />
                    </Field>
                  </div>
                </Group>

                {/* Ownership */}
                <Group icon={paths.wallet} title="Ownership" dark={isDark}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Purchased?" dark={isDark}>
                      <SelectBox
                        value={formData.purchased.toString()}
                        onChange={e =>
                          setFormData(p => ({
                            ...p,
                            purchased: e.target.value === 'true'
                          }))
                        }
                        dark={isDark}
                      >
                        <option value="false">No (free / gift)</option>
                        <option value="true">Yes</option>
                      </SelectBox>
                    </Field>
                    <Field label="Price / invested" dark={isDark}>
                      <input
                        type="number"
                        name="purchasePrice"
                        value={formData.purchasePrice}
                        onChange={handleChange}
                        disabled={!formData.purchased}
                        className={inputCls}
                        style={inputStyle}
                      />
                    </Field>
                    <Field label="Physical shelf / row" dark={isDark}>
                      <input
                        type="text"
                        name="shelfRow"
                        value={formData.shelfRow || ''}
                        onChange={handleChange}
                        placeholder="e.g. Shelf A, Row 2"
                        className={inputCls}
                        style={inputStyle}
                      />
                    </Field>
                    <Field label="Recommended by" dark={isDark}>
                      <input
                        type="text"
                        name="recommendedBy"
                        value={formData.recommendedBy || ''}
                        onChange={handleChange}
                        placeholder="Name or source"
                        className={inputCls}
                        style={inputStyle}
                      />
                    </Field>
                  </div>
                  <Field label="Amazon / store link" dark={isDark}>
                    <input
                      type="url"
                      name="amazonLink"
                      value={formData.amazonLink || ''}
                      onChange={handleChange}
                      placeholder="https://amazon.com/..."
                      className={inputCls}
                      style={inputStyle}
                    />
                  </Field>
                </Group>

                {/* Loan tracking */}
                <Group
                  icon={paths.users}
                  title="Loan tracking"
                  dark={isDark}
                  tint="245,158,11"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Loaned to" dark={isDark}>
                      <input
                        type="text"
                        name="givenTo"
                        value={formData.givenTo || ''}
                        onChange={handleChange}
                        placeholder="Person's name"
                        className={inputCls}
                        style={inputStyle}
                      />
                    </Field>
                    <Field label="Loan date" dark={isDark}>
                      <input
                        type="date"
                        name="loanDate"
                        value={formData.loanDate || ''}
                        onChange={handleChange}
                        className={inputCls}
                        style={{
                          ...inputStyle,
                          colorScheme: isDark ? 'dark' : 'light'
                        }}
                      />
                    </Field>
                  </div>
                </Group>

                {/* Notes */}
                <Group icon={paths.edit} title="My notes" dark={isDark}>
                  <Field label="Notes / summary" dark={isDark}>
                    <textarea
                      name="summary"
                      value={formData.summary || ''}
                      onChange={handleChange}
                      rows={4}
                      placeholder="Your thoughts, key takeaways…"
                      className={`${inputCls} resize-none leading-relaxed`}
                      style={inputStyle}
                    />
                  </Field>
                </Group>

                {/* Favourite quotes */}
                <Group
                  icon={paths.quotes}
                  title="Favourite quotes"
                  dark={isDark}
                >
                  {(formData.quotes || []).map((q, i) => (
                    <div
                      key={i}
                      className="relative group p-4 rounded-[22px]"
                      style={{ background: P.panel, boxShadow: R(4, 10) }}
                    >
                      <p
                        className="text-sm leading-relaxed pr-8 italic"
                        style={{ color: P.body }}
                      >
                        &quot;{q.text}&quot;
                      </p>
                      {q.page && (
                        <p
                          className="text-[11px] mt-1.5 font-semibold"
                          style={{ color: P.faint }}
                        >
                          Page {q.page}
                        </p>
                      )}
                      <button
                        type="button"
                        aria-label="Remove quote"
                        onClick={() =>
                          setFormData(p => ({
                            ...p,
                            quotes: (p.quotes || []).filter(
                              (_, idx) => idx !== i
                            )
                          }))
                        }
                        className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center transition-all sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 hover:scale-110 active:scale-90"
                        style={{
                          background: P.panel,
                          color: P.faint,
                          boxShadow: raised(NEUTRAL_RGB, isDark, 3, 6)
                        }}
                      >
                        <Icon
                          d={paths.close}
                          className="w-3 h-3"
                          stroke={2.5}
                        />
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
                          {
                            text,
                            page: page || undefined,
                            addedAt: new Date().toISOString()
                          }
                        ]
                      }))
                    }
                  />
                </Group>
              </div>
            ) : activeTab === 'files' ? (
              <div className="flex flex-col gap-6">
                <Group
                  icon={paths.pdf}
                  title="Digital PDF reader"
                  dark={isDark}
                >
                  <p
                    className="text-[13px] leading-relaxed"
                    style={{ color: P.faint }}
                  >
                    Attach a PDF to read this book inside the app and track
                    pages and sessions.
                  </p>

                  <div>
                    <label
                      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all ${uploadingPdf ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:-translate-y-0.5 active:scale-95'}`}
                      style={primaryFill(isDark)}
                    >
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={handlePdfUpload}
                        disabled={uploadingPdf}
                        className="hidden"
                      />
                      {uploadingPdf ? (
                        <>
                          <svg
                            className="animate-spin w-4 h-4"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                              fill="none"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          Uploading…
                        </>
                      ) : (
                        <>
                          <Icon d={paths.upload} className="w-4 h-4" />
                          {formData.pdfPath ? 'Replace PDF' : 'Choose PDF'}
                        </>
                      )}
                    </label>
                  </div>

                  {formData.pdfPath && (
                    <div
                      className="flex items-center justify-between gap-3 p-3 rounded-[22px]"
                      style={{ background: P.panel, boxShadow: R(4, 10) }}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={clayFill(
                            statusTheme.Read.rgb,
                            statusTheme.Read.from,
                            statusTheme.Read.to,
                            2
                          )}
                        >
                          <Icon
                            d={paths.check}
                            className="w-4 h-4"
                            stroke={3}
                          />
                        </div>
                        <div className="min-w-0">
                          <p
                            className="text-xs font-bold truncate"
                            style={{ color: P.title }}
                          >
                            PDF attached
                          </p>
                          <p
                            className="text-[11px] truncate"
                            style={{ color: P.faint }}
                          >
                            {formData.pdfPath}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData(p => ({
                            ...p,
                            pdfPath: undefined,
                            currentPage: undefined,
                            totalPages: undefined,
                            readingSessions: []
                          }))
                        }
                        className="shrink-0 flex items-center gap-1.5 text-[11px] font-bold px-3.5 py-2 rounded-full transition-all hover:-translate-y-0.5 active:scale-95"
                        style={{
                          background: P.panel,
                          color: '#ef4444',
                          boxShadow: raised(NEUTRAL_RGB, isDark, 3, 8)
                        }}
                      >
                        <Icon d={paths.trash} className="w-3.5 h-3.5" />
                        Remove
                      </button>
                    </div>
                  )}
                </Group>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                <Group icon={paths.book} title="Identifiers" dark={isDark}>
                  <Field label="ISBN" dark={isDark}>
                    <input
                      type="text"
                      name="isbn"
                      value={formData.isbn || ''}
                      onChange={handleChange}
                      placeholder="e.g. 978-3-16-148410-0"
                      className={inputCls}
                      style={inputStyle}
                    />
                  </Field>
                </Group>

                <Group icon={paths.doc} title="Book description" dark={isDark}>
                  <textarea
                    name="description"
                    value={formData.description || ''}
                    onChange={handleChange}
                    rows={6}
                    aria-label="Book description"
                    className={`${inputCls} custom-scrollbar resize-none leading-relaxed`}
                    style={inputStyle}
                  />
                </Group>

                <Group icon={paths.user} title="About the author" dark={isDark}>
                  <textarea
                    name="authorDescription"
                    value={formData.authorDescription || ''}
                    onChange={handleChange}
                    rows={4}
                    aria-label="About the author"
                    className={`${inputCls} custom-scrollbar resize-none leading-relaxed`}
                    style={inputStyle}
                  />
                </Group>
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div
            className="px-4 sm:px-6 py-4 flex items-center justify-between gap-3 shrink-0"
            style={{
              background: P.panel,
              boxShadow: isDark
                ? '0 -8px 24px rgba(0,0,0,.35)'
                : `0 -8px 24px rgba(${NEUTRAL_RGB},.14)`
            }}
          >
            <span
              className={`hidden sm:inline-flex items-center gap-2 text-[11px] font-bold px-3 py-1.5 rounded-full transition-opacity ${dirty ? 'opacity-100' : 'opacity-0'}`}
              style={{ background: P.well, color: P.body, boxShadow: Pr(2, 5) }}
              aria-live="polite"
            >
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: primary }}
              />
              Unsaved changes
            </span>
            <div className="flex gap-3 ml-auto">
              <button
                onClick={onClose}
                className="px-6 py-2.5 text-sm font-bold rounded-full transition-all hover:-translate-y-0.5 active:scale-95"
                style={{
                  background: P.panel,
                  color: P.body,
                  boxShadow: R(4, 10)
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => onSave(formData)}
                className="px-7 py-2.5 text-sm font-bold rounded-full transition-all hover:-translate-y-0.5 active:scale-[0.98]"
                style={primaryFill(isDark)}
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
