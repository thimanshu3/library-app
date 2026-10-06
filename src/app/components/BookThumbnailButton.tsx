'use client'
import type { CSSProperties } from 'react'
import type { Book } from '../types'
import BookCover from './BookCover'
export default function BookThumbnailButton({ book, onView, style }: { book: Book; onView: (book: Book) => Promise<void>; style: CSSProperties }) {
  return <button type="button" aria-label={`View ${book.title}`} onClick={() => { void onView(book) }} className="aspect-[2/3] rounded-lg overflow-hidden transition-transform hover:scale-105 hover:-rotate-2" style={style}><BookCover book={book} className="w-full h-full object-cover" /></button>
}
