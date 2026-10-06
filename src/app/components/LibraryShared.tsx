import { ReactNode } from 'react'
import {
  NEUTRAL_RGB,
  palette,
  pressed,
  raised,
  statusTheme,
  chipShadow
} from '../clay'
import { Book } from '../types'

export type ViewMode =
  | 'grid'
  | 'alphabetic'
  | 'authors'
  | 'collections'
  | 'volumes'
  | 'list'
  | 'analytics'
  | 'loans'
  | 'wishlist'

export const viewModes: { id: ViewMode; label: string }[] = [
  { id: 'analytics', label: 'Analytics' },
  { id: 'loans', label: 'Loans' },
  { id: 'wishlist', label: 'Wishlist' },
  { id: 'grid', label: 'Grid' },
  { id: 'alphabetic', label: 'A–Z' },
  { id: 'authors', label: 'Authors' },
  { id: 'collections', label: 'Collections' },
  { id: 'volumes', label: 'Volumes' },
  { id: 'list', label: 'List' }
]

export type Option = [value: string, label: string]

export const sortOptions: Option[] = [
  ['id', 'Reading order'],
  ['title', 'Title A–Z'],
  ['year', 'Launch year (oldest first)'],
  ['price', 'Investment (highest first)']
]

export const genreOptions: Option[] = [
  ['All', 'All collections'],
  ['MIND', 'Mindset / Resilience'],
  ['PHIL', 'Philosophy'],
  ['PROD', 'Focus / Productivity'],
  ['PSY', 'Psychology'],
  ['FIN', 'Money'],
  ['POWER', 'Influence / Power'],
  ['THINK', 'Decision-Making'],
  ['STARTUP', 'Business'],
  ['HIST', 'History'],
  ['BIO', 'Biography / Memoir'],
  ['WAR', 'Military / Survival'],
  ['FIC', 'Fiction'],
  ['TECH', 'Tech / Future'],
  ['SCI', 'Science / Space'],
  ['SPIRIT', 'Purpose / Spirituality'],
  ['COMM', 'Communication']
]

export const volumeOptions: Option[] = [
  ['All', 'All volumes'],
  ...Array.from({ length: 9 }).map(
    (_, i): Option => [`Volume ${i + 1}`, `Volume ${i + 1}`]
  )
]

export const eraOptions: Option[] = [
  ['All', 'All eras'],
  ['Before 1900', 'Before 1900'],
  ['1900-1950', '1900 - 1950'],
  ['1951-1999', '1951 - 1999'],
  ['2000-2010', '2000 - 2010'],
  ['2011-2020', '2011 - 2020'],
  ['2021-Present', '2021 - Present']
]

export const formatOptions: Option[] = [
  ['All', 'All formats'],
  ['Physical', 'Physical'],
  ['Kindle', 'Kindle'],
  ['Audiobook', 'Audiobook'],
  ['PDF', 'PDF']
]

export const ownershipOptions: Option[] = [
  ['All', 'All ownership'],
  ['Purchased', 'Purchased'],
  ['Gifted', 'Gifted'],
  ['Borrowed', 'Borrowed']
]

export const statusList = ['Read', 'Reading', 'Unread', 'Wishlist']

export const genreName: Record<string, string> = {
  MIND: 'Mindset / Resilience',
  PHIL: 'Philosophy',
  PROD: 'Focus / Productivity',
  PSY: 'Psychology',
  FIN: 'Money',
  POWER: 'Influence / Power',
  THINK: 'Decision-Making',
  STARTUP: 'Business',
  HIST: 'History',
  BIO: 'Biography / Memoir',
  WAR: 'Military / Survival',
  FIC: 'Fiction',
  TECH: 'Tech / Future',
  SCI: 'Science / Space',
  SPIRIT: 'Purpose / Spirituality',
  COMM: 'Communication'
}

export const blankBook = (): Book => ({
  id: '',
  workId: '',
  title: '',
  author: '',
  genre: 'MIND',
  hours: '',
  recommendedBy: '',
  volume: '',
  photoUrl: '',
  summary: '',
  format: 'Physical',
  condition: 'Good',
  shelfLocation: '',
  purchased: true,
  purchasePrice: 0,
  investedAmount: 0,
  status: 'Unread',
  pdfPath: '',
  description: '',
  launchYear: '',
  originalLanguage: '',
  countryOfOrigin: '',
  authorDescription: '',
  coverFile: '',
  isbn: '',
  tags: [],
  collections: [],
  series: null,
  apiData: {},
  readingSpans: [],
  currentPage: 0,
  totalPages: 0,
  lastReadTimestamp: '',
  readingSessions: [],
  rating: 0,
  quotes: [],
  amazonLink: '',
  loans: [],
  givenTo: '',
  loanDate: '',
  shelfRow: '',
  readingStartDate: '',
  readingEndDate: ''
})

export const paths = {
  search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  add: 'M12 4v16m8-8H4',
  scan: 'M3 7v-2a2 2 0 012-2h2m10 0h2a2 2 0 012 2v2m0 10v2a2 2 0 01-2 2h-2m-10 0H5a2 2 0 01-2-2v-2m19-10h-2m-10-4v2',
  filter: 'M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z',
  theme: 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z',
  close: 'M6 18L18 6M6 6l12 12',
  chevron: 'M19 9l-7 7-7-7',
  batch: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  book: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
  download: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4',
  sparkles: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z',
  sun: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z',
  moon: 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z',
  plus: 'M12 4v16m8-8H4'
}

export function Icon({
  d,
  className = 'w-5 h-5',
  stroke = 2
}: {
  d: string
  className?: string
  stroke?: number
}) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={stroke}
        d={d}
      />
    </svg>
  )
}

export function ClayButton({
  children,
  onClick,
  dark,
  active,
  className = '',
  title
}: {
  children: ReactNode
  onClick: () => void
  dark: boolean
  active?: boolean
  className?: string
  title?: string
}) {
  const P = palette(dark)
  return (
    <button
      title={title}
      onClick={onClick}
      className={`relative rounded-[22px] flex items-center justify-center transition-all duration-200 active:scale-90 ${className}`}
      style={
        active
          ? {
              background: P.well,
              color: P.accent,
              boxShadow: pressed(NEUTRAL_RGB, dark, 5, 12)
            }
          : {
              background: P.panel,
              color: P.body,
              boxShadow: raised(NEUTRAL_RGB, dark, 5, 12)
            }
      }
    >
      {children}
    </button>
  )
}

export function ClaySelect({
  label,
  value,
  onChange,
  options,
  dark
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: Option[]
  dark: boolean
}) {
  const P = palette(dark)
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold pl-1" style={{ color: P.faint }}>
        {label}
      </span>
      <span
        className="relative block rounded-2xl"
        style={{
          background: P.well,
          boxShadow: pressed(NEUTRAL_RGB, dark, 3, 7),
          color: P.faint
        }}
      >
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full appearance-none bg-transparent rounded-2xl py-2.5 pl-3.5 pr-9 text-[13px] font-semibold cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40"
          style={{ color: P.title, colorScheme: dark ? 'dark' : 'light' }}
        >
          {options.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <Icon
          d={paths.chevron}
          className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
        />
      </span>
    </label>
  )
}

export function StatusChip({ status, dark }: { status: string; dark: boolean }) {
  const st = statusTheme[status] ?? statusTheme.Unread
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full"
      style={{
        background: dark ? `rgba(${st.rgb},.2)` : `rgba(${st.rgb},.13)`,
        color: dark ? st.from : st.to,
        boxShadow: chipShadow(dark)
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: st.to }}
      />
      {status}
    </span>
  )
}

export function SectionHeader({
  title,
  count,
  dark,
  tile = false
}: {
  title: string
  count: number
  dark: boolean
  tile?: boolean
}) {
  const P = palette(dark)
  return (
    <div className="flex items-center gap-3 sm:gap-4">
      {tile ? (
        <div
          className="w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center font-syne font-black text-xl"
          style={{
            background: P.panel,
            color: P.accent,
            boxShadow: raised(NEUTRAL_RGB, dark, 5, 12)
          }}
        >
          {title}
        </div>
      ) : (
        <h2
          className="font-syne font-black text-lg sm:text-xl tracking-tight"
          style={{ color: P.title }}
        >
          {title}
        </h2>
      )}
      <span
        className="text-xs font-bold tabular-nums px-2.5 py-1 rounded-full"
        style={{
          background: P.well,
          color: P.body,
          boxShadow: pressed(NEUTRAL_RGB, dark, 2, 4)
        }}
      >
        {count}
      </span>
      <div
        className="h-1.5 flex-1 rounded-full"
        style={{
          background: P.well,
          boxShadow: pressed(NEUTRAL_RGB, dark, 1, 2)
        }}
      />
    </div>
  )
}

export function mergeOptions(base: Option[], values: string[]): Option[] {
  const existing = new Set(base.map(([value]) => value))
  return [...base, ...[...new Set(values.filter(Boolean))].filter(value => !existing.has(value)).sort().map((value): Option => [value, value])]
}
