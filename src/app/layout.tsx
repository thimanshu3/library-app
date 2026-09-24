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
  title: 'TaleTeacup',
  description: 'Your cozy reading corner and personal library collection.',
  keywords: ['taleteacup', 'library', 'books', 'reading', 'tracker', 'bookshelf'],
  icons: {
    icon: '/fav.jpg'
  }
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${syne.variable} ${plusJakarta.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-jakarta bg-background text-foreground selection:bg-accent/30 selection:text-accent">
        {children}
      </body>
    </html>
  )
}
