'use client'
import Link from 'next/link'
export default function LibraryError({ reset }: { reset: () => void }) {
  return <main className="grid min-h-dvh place-items-center bg-background p-6 text-foreground"><div className="max-w-md rounded-3xl border p-8" role="alert">
    <h1 className="font-syne text-2xl font-bold">Your library couldn’t be loaded.</h1>
    <p className="mt-4 text-sm">Please retry. If the link contains invalid filters, reset them to reopen your library.</p>
    <button onClick={reset} className="mt-6 rounded-full bg-accent px-5 py-3 text-white">Retry</button>
    <Link href="/" className="ml-4 text-sm underline">Reset filters</Link>
  </div></main>
}
