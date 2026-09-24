import type { Metadata } from 'next'
import { Syne, Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'

const syne = Syne({
  variable: '--font-syne',
  subsets: ['latin'],
  display: 'swap'
})

const plusJakarta = Plus_Jakarta_Sans({
  variable: '--font-jakarta',
  subsets: ['latin'],
  display: 'swap'
})

export const metadata: Metadata = {
  title: 'Folio — Personal Library',
  description: 'Your gorgeous personal library command centre.',
  keywords: ['library', 'books', 'reading', 'collection', 'tracker']
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`dark ${syne.variable} ${plusJakarta.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-jakarta bg-background text-foreground selection:bg-accent/30 selection:text-accent">
        {children}
      </body>
    </html>
  )
}
