import { unstable_rethrow } from 'next/navigation'
import 'server-only'
import { HttpError } from './http'

export function actionError(error: unknown, fallback: string) {
  unstable_rethrow(error)
  if (error instanceof HttpError) return { error: error.message, status: error.status }
  console.error(fallback)
  return { error: fallback, status: 500 }
}
