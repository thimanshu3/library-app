import { afterEach, expect, it, vi } from 'vitest'
import { acquireSlot, rateLimit } from '@/lib/server/rate-limit'

afterEach(() => vi.useRealTimers())

it('reopens operation buckets after their window expires', () => {
  vi.useFakeTimers()
  rateLimit('test-window', 1, 1000)
  expect(() => rateLimit('test-window', 1, 1000)).toThrow()
  vi.advanceTimersByTime(1001)
  expect(() => rateLimit('test-window', 1, 1000)).not.toThrow()
})

it('bounds concurrent requests and releases slots idempotently', () => {
  const release = acquireSlot('test-slots', 1)
  expect(() => acquireSlot('test-slots', 1)).toThrow()
  release(); release()
  const nextRelease = acquireSlot('test-slots', 1)
  release()
  expect(() => acquireSlot('test-slots', 1)).toThrow()
  nextRelease()
})
