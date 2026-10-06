import type { Metadata } from 'next'
import { Syne, Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import Script from 'next/script'

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
    icon: '/icon.svg'
  }
}

import { NuqsAdapter } from 'nuqs/adapters/next/app'

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en" suppressHydrationWarning
      className={`${syne.variable} ${plusJakarta.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-jakarta bg-background text-foreground selection:bg-accent/30 selection:text-accent">
        <Script id="theme-bootstrap" strategy="beforeInteractive">{`try { const saved = localStorage.getItem('theme'); document.documentElement.classList.toggle('dark', saved ? saved === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches) } catch {}`}</Script>
        <NuqsAdapter>{children}</NuqsAdapter>
      </body>
    </html>
  )
}
