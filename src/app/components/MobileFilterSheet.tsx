 'use client'
import { useDialog } from '../hooks/use-dialog'
import { mergeOptions, eraOptions, formatOptions, ownershipOptions, volumeOptions, sortOptions, genreOptions } from './LibraryShared'
import type { Book } from '../types'
interface MobileFilterSheetProps {
  open: boolean
  onClose: () => void
  // Filter values
  search: string
  onSearchChange: (v: string) => void
  statusFilter: string
  onStatusChange: (v: string) => void
  sortBy: string
  onSortByChange: (v: string) => void
  genreFilter: string
  onGenreChange: (v: string) => void
  volumeFilter: string
  onVolumeChange: (v: string) => void
  authorFilter: string
  onAuthorChange: (v: string) => void
  yearFilter: string
  onYearChange: (v: string) => void
  formatFilter: string
  onFormatChange: (v: string) => void
  purchasedFilter: string
  onPurchasedChange: (v: string) => void
  shelfFilter: string
  onShelfChange: (value: string) => void
  books: Book[]
  onReset: () => void
}

export default function MobileFilterSheet(props: MobileFilterSheetProps) {
  const ref = useDialog(props.onClose, props.open)
  if (!props.open) return null
  const fields = [
    { label: 'Status', value: props.statusFilter, change: props.onStatusChange, options: ['All','Unread','Reading','Read','Wishlist','On Loan'].map(value => [value, value]) },
    { label: 'Sort by', value: props.sortBy, change: props.onSortByChange, options: sortOptions },
    { label: 'Collection', value: props.genreFilter, change: props.onGenreChange, options: mergeOptions(genreOptions, props.books.map(book => book.genre)) },
    { label: 'Volume', value: props.volumeFilter, change: props.onVolumeChange, options: mergeOptions(volumeOptions, props.books.map(book => book.volume)) },
    { label: 'Author', value: props.authorFilter, change: props.onAuthorChange, options: [['All','All authors'], ...[...new Set(props.books.map(book => book.author))].sort().map(value => [value,value])] },
    { label: 'Publication era', value: props.yearFilter, change: props.onYearChange, options: eraOptions },
    { label: 'Format', value: props.formatFilter, change: props.onFormatChange, options: formatOptions },
    { label: 'Ownership', value: props.purchasedFilter, change: props.onPurchasedChange, options: ownershipOptions },
    { label: 'Shelf', value: props.shelfFilter, change: props.onShelfChange, options: [['All','Any location'], ...[...new Set(props.books.map(book => book.shelfLocation).filter(Boolean))].sort().map(value => [value,value])] }
  ]
  return <div className="fixed inset-0 z-50 bg-black/50 flex items-end" onClick={event => { if (event.currentTarget === event.target) props.onClose() }}>
    <div ref={ref} aria-label="Filter library" className="w-full bg-[var(--surface-2)] text-[var(--on-surface)] rounded-t-3xl p-6 max-h-[90dvh] overflow-auto">
      <div className="flex justify-between mb-5"><h2 className="text-lg font-bold">Filters</h2><button onClick={props.onReset}>Reset</button><button aria-label="Close filters" onClick={props.onClose}>Close</button></div>
      <label className="flex flex-col gap-2 mb-4">Search<input value={props.search} onChange={event => props.onSearchChange(event.target.value)} className="rounded-xl p-3 bg-[var(--surface-warm)]" /></label>
      <div className="grid grid-cols-2 gap-4">{fields.map(field => <label key={field.label} className="flex flex-col gap-2 text-sm">{field.label}<select value={field.value} onChange={event => field.change(event.target.value)} className="rounded-xl p-3 w-full bg-[var(--surface-warm)]">{field.options.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>)}</div>
      <button onClick={props.onClose} className="mt-6 w-full bg-accent text-white p-3 rounded-xl">Show results</button>
    </div>
  </div>
}
