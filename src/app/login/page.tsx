import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getOwner } from '@/lib/server/auth'
import { HttpError } from '@/lib/server/http'
import LoginForm from './LoginForm'

async function OwnerSignIn() {
  let configured = true
  let owner = null
  try {
    owner = await getOwner()
  } catch (error) {
    if (!(error instanceof HttpError) || error.status !== 503) throw error
    configured = false
  }
  if (owner) redirect('/')

  return (
    <main className="min-h-dvh grid place-items-center bg-background px-6 py-12 text-[var(--on-surface)]">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-[36px] border border-[var(--outline-variant)] bg-[var(--surface-warm)] shadow-xl md:grid-cols-[1fr_1.1fr]">
        <div className="relative flex flex-col justify-between gap-6 bg-[#c46a4f] p-6 text-[#fff6e8] sm:gap-14 sm:p-12">
          <span className="text-xs font-bold uppercase tracking-[.24em]">TaleTeacup</span>
          <div>
            <svg viewBox="0 0 64 64" aria-hidden="true" className="mb-8 hidden h-16 w-16 sm:block" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 12c8-3 15-1 22 4v38c-7-5-14-7-22-4V12ZM54 12c-8-3-15-1-22 4v38c7-5 14-7 22-4V12Z" />
              <path d="M17 22c3 0 6 1 9 3M17 30c3 0 6 1 9 3M38 25c3-2 6-3 9-3M38 33c3-2 6-3 9-3" />
            </svg>
            <h1 className="font-syne text-3xl font-black leading-[1.08] sm:text-5xl">A little quiet.<br />A good book.</h1>
            <p className="mt-3 max-w-xs text-sm leading-6 opacity-90 sm:mt-5 sm:leading-7">Your shelves, reading moments, and favorite passages, all in one cozy corner.</p>
          </div>
          <span className="hidden text-xs opacity-75 sm:inline">Your personal reading corner</span>
        </div>
        <div className="flex flex-col justify-center gap-6 p-6 sm:gap-8 sm:p-12">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[.18em] text-accent">Welcome back</p>
            <h2 className="font-syne text-2xl font-black sm:text-3xl">Come on in.</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--on-surface-variant)]">Sign in to pick up where you left off.</p>
          </div>
          {configured ? <LoginForm /> : (
            <p role="status" className="text-sm leading-7">Owner sign-in needs to be set up before this library can be opened. Ask the library owner to finish setup.</p>
          )}
        </div>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return <Suspense fallback={<div className="min-h-dvh bg-background" />}><OwnerSignIn /></Suspense>
}
