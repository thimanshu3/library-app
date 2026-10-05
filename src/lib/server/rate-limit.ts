import 'server-only'
import { HttpError } from './http'

type Window = { count: number; resetsAt: number }
const state = globalThis as typeof globalThis & {
  libraryRateLimits?: Map<string, Window>
}
const windows = state.libraryRateLimits ??= new Map<string, Window>()
const slots = new Map<string, number>()

export function acquireSlot(operation: string, limit: number): () => void {
  const count = slots.get(operation) || 0
  if (count >= limit) throw new HttpError(429, 'Requests are busy. Please try again shortly.')
  slots.set(operation, count + 1)
  let released = false
  return () => {
    if (!released) slots.set(operation, Math.max(0, (slots.get(operation) || 1) - 1))
    released = true
  }
}

// All callers share a bounded bucket per operation. No spoofable IP headers.
// Multi-instance hosting also needs a shared limiter at the deployment gateway.
export function rateLimit(operation: string, limit: number, intervalMs: number): void {
  const now = Date.now()
  const previous = windows.get(operation)
  const window = previous && previous.resetsAt > now
    ? previous
    : { count: 0, resetsAt: now + intervalMs }
  if (window.count >= limit) throw new HttpError(429, 'Too many requests. Please try again later.')
  window.count += 1
  windows.set(operation, window)
}
