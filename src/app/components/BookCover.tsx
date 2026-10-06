'use client'
import Image from 'next/image'
import { useState } from 'react'
import { bookCover } from '@/lib/book-cover'
export default function BookCover({ book, className, sizes = '(max-width: 640px) 120px, 180px', decorative = false }: { book: { coverFile?: string; photoUrl?: string; title?: string }; className?: string; sizes?: string; decorative?: boolean }) {
  const source = bookCover(book)
  const [failed, setFailed] = useState('')
  const safe = source.startsWith('/') || /^https:\/\/(books\.google\.com|books\.googleusercontent\.com|covers\.openlibrary\.org|images-na\.ssl-images-amazon\.com|m\.media-amazon\.com)\//.test(source)
  return <Image src={failed === source ? '/book-placeholder.svg' : source} alt={decorative ? '' : book.title ? `${book.title} cover` : 'Book cover'} aria-hidden={decorative || undefined} width={200} height={300} sizes={sizes} loading="lazy" unoptimized={!safe || source.endsWith('.svg')} className={className} onError={() => setFailed(source)} />
}
