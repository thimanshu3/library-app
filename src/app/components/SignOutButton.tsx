'use client'

import { useState } from 'react'
import { toast } from './Toast'

export default function SignOutButton() {
  const [pending, setPending] = useState(false)
  async function signOut() {
    setPending(true)
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' })
      if (!response.ok) throw new Error('Sign out failed')
      // Discard cached private library state when ending the owner session.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign('/login')
    } catch {
      toast('Unable to sign out. Please try again.', 'error')
      setPending(false)
    }
  }
  const label = pending ? 'Signing out…' : 'Sign out'
  return (
    <button type="button" onClick={signOut} disabled={pending} aria-label={label} title={label} className="flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-2xl border border-[var(--outline)] text-xs font-bold text-[var(--on-surface)] disabled:opacity-50 sm:w-auto sm:px-3">
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M9 4H4v16h5M13 8l4 4-4 4M8 12h13" /></svg>
      <span className="sr-only sm:not-sr-only">{label}</span>
    </button>
  )
}
