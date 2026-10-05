'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'

export default function LoginForm() {
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError('')
    const form = new FormData(event.currentTarget)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.get('name'), password: form.get('password') })
      })
      const result = await response.json()
      if (!response.ok) {
        setError(result.error || 'Unable to sign in. Please try again.')
        return
      }
      // Reset all cached client state when crossing the authentication boundary.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign('/')
    } catch {
      setError('Unable to connect. Please try again.')
    } finally {
      setPending(false)
    }
  }

  const inputClass = 'w-full rounded-2xl border border-[var(--outline)] bg-[var(--surface-2)] px-4 py-3.5 text-base text-[var(--on-surface)] outline-none focus:border-accent focus:ring-2 focus:ring-accent/20'
  return (
    <form onSubmit={signIn} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="owner-name" className="text-sm font-bold">Owner name</label>
        <input id="owner-name" name="name" autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={64} required className={inputClass} />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="owner-password" className="text-sm font-bold">Password</label>
        <input id="owner-password" name="password" type="password" autoComplete="current-password" maxLength={1024} required className={inputClass} />
      </div>
      {error && <p role="alert" className="rounded-xl bg-red-100 px-4 py-3 text-sm text-red-900">{error}</p>}
      <button type="submit" disabled={pending} className="mt-2 w-full rounded-full bg-accent px-6 py-4 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60">
        {pending ? 'Opening your library…' : 'Open my library'}
      </button>
    </form>
  )
}
