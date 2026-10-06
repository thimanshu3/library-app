'use server'

import prisma from '@/lib/prisma'
import { databaseRead } from '@/lib/server/database-read'
import { actionError } from '@/lib/server/action-result'
import { requireOwner } from '@/lib/server/auth'
import { HttpError } from '@/lib/server/http'
import { bookInclude, toBook } from '@/lib/server/library-mapper'
import { deleteCopies, saveOne, markCopiesRead } from '@/lib/server/library-mutations'
import { allBooks, queryBooks } from '@/lib/server/library-query'
import { dateKey } from '@/lib/library-domain'
import { validate } from '@/lib/server/library-validation'
import { revalidatePath } from 'next/cache'
import { createHash } from 'node:crypto'
import { z } from 'zod'
import type { Book, BookCopy, BookWork } from './types'

export async function fetchFilteredBooksAction(
  params: Record<string, unknown>
) {
  await requireOwner()
  try {
    return { ...(await queryBooks(params)), error: undefined, status: 200 }
  } catch (error) {
    return {
      books: undefined,
      totalCount: undefined,
      hasMore: undefined,
      nextCursor: null,
      ...actionError(error, 'Unable to load the library. Please retry.')
    }
  }
}

export async function fetchBookAction(id: string) {
  await requireOwner()
  const copy = await databaseRead(() => prisma.copy.findUnique({
    where: { id },
    include: bookInclude
  }))
  if (!copy) throw new HttpError(404, 'This copy no longer exists.')
  return toBook(copy)
}

export async function fetchLibraryOverviewAction() {
  await requireOwner()
  try {
    const [books, settings] = await Promise.all([
      allBooks(),
      prisma.librarySettings.findUnique({ where: { id: 'owner' } })
    ])
    const overview = books.map(book => ({
      ...book,
      description: '',
      authorDescription: '',
      summary: '',
      quotes: [],
      myReview: null,
      privateNotes: null
    }))
    return {
      books: overview,
      annualGoal: settings?.annualGoal || 50,
      error: undefined
    }
  } catch (error) {
    return {
      books: undefined,
      annualGoal: undefined,
      ...actionError(error, 'Unable to load library totals. Please retry.')
    }
  }
}

export async function saveBookAction(book: unknown) {
  await requireOwner()
  try {
    const saved = await saveOne(book)
    revalidatePath('/')
    return { book: saved, error: undefined }
  } catch (error) {
    return {
      book: undefined,
      ...actionError(
        error,
        'Unable to save this book. Your draft has been kept.'
      )
    }
  }
}

export async function deleteCopiesAction(input: unknown) {
  await requireOwner()
  try {
    const ids = validate(
      z.array(z.string().min(1).max(180)).min(1).max(100),
      input
    )
    await deleteCopies([...new Set(ids)])
    revalidatePath('/')
    return { success: true, error: undefined }
  } catch (error) {
    return {
      success: false,
      ...actionError(error, 'Unable to delete the selected copies.')
    }
  }
}

function importCopyId(value: unknown): string {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new HttpError(400, 'The book record is invalid.')
  const source = value as Partial<Book>
  if (source.id) {
    if (typeof source.id !== 'string' || source.id.length > 180) throw new HttpError(400, 'The copy identifier is invalid.')
    return source.id
  }
  const identity = source.goodreadsId || source.isbn?.replace(/[-\s]/g, '') || `${source.title?.trim().toLowerCase()}|${source.author?.trim().toLowerCase()}`
  if (typeof identity !== 'string') throw new HttpError(400, 'The import identity is invalid.')
  return `c_import_${createHash('sha256').update(identity).digest('hex')}`
}

export async function importBookBatchAction(input: unknown) {
  await requireOwner()
  const rows = validate(z.array(z.unknown()).min(1).max(25), input)
  const results: {
    index: number
    state: 'created' | 'skipped' | 'error'
    error?: string
  }[] = []
  const ids = rows.flatMap(row => { try { return [importCopyId(row)] } catch { return [] } })
  const existingIds = new Set((await databaseRead(() => prisma.copy.findMany({
    where: { id: { in: ids } }, select: { id: true }
  }))).map(copy => copy.id))
  for (const [index, inputBook] of rows.entries()) {
    try {
      if (!inputBook || typeof inputBook !== 'object')
        throw new HttpError(400, 'The book record is invalid.')
      const source = inputBook as Partial<Book>
      const id = importCopyId(inputBook)
      if (existingIds.has(id)) {
        results.push({ index, state: 'skipped' })
        continue
      }
      const matchedWork =
        !source.workId && source.title && source.author
          ? await prisma.work.findFirst({
              where: {
                title: { equals: source.title.trim(), mode: 'insensitive' },
                author: { equals: source.author.trim(), mode: 'insensitive' }
              },
              select: { id: true }
            })
          : null
      const workDigest = createHash('sha256')
        .update(
          `${source.title?.trim().toLowerCase()}|${source.author?.trim().toLowerCase()}`
        )
        .digest('hex')
      await saveOne(
        {
          ...source,
          id,
          workId: source.workId || matchedWork?.id || `w_import_${workDigest}`
        },
        { importing: true }
      )
      existingIds.add(id)
      results.push({ index, state: 'created' })
    } catch (error) {
      results.push({
        index,
        state: 'error',
        error: actionError(error, 'Unable to import this record.').error
      })
    }
  }
  if (results.some(result => result.state === 'created')) revalidatePath('/')
  return results
}

// Compatibility entry points remain authenticated; callers should use focused mutations.
export async function saveLibraryAction(
  _works: BookWork[],
  _copies: BookCopy[]
) {
  await requireOwner()
  void _works; void _copies
  return {
    error:
      'Whole-library saves are no longer supported. Save the selected book instead.'
  }
}

export async function importBooksAction(works: BookWork[], copies: BookCopy[]) {
  await requireOwner()
  const workMap = new Map(works.map(work => [work.id, work]))
  const results = await importBookBatchAction(
    copies.map(copy => ({ ...workMap.get(copy.workId), ...copy }))
  )
  return results.some(result => result.state === 'error')
    ? { error: 'Some import records failed validation.', results }
    : { success: true, results }
}

export async function saveAnnualGoalAction(input: unknown) {
  await requireOwner()
  const annualGoal = validate(z.number().int().min(1).max(10000), input)
  await prisma.librarySettings.upsert({
    where: { id: 'owner' },
    create: { id: 'owner', annualGoal },
    update: { annualGoal }
  })
  revalidatePath('/')
  return annualGoal
}

export async function markCopiesReadAction(input: unknown) {
  await requireOwner()
  try {
    const { ids, day } = validate(z.object({ ids: z.array(z.string().min(1).max(180)).min(1).max(100), day: z.string().refine(value => !!dateKey(value)) }), input)
    const result = await markCopiesRead([...new Set(ids)], day)
    revalidatePath('/')
    return { ...result, success: true, error: undefined }
  } catch (error) { return { processed: 0, changed: 0, success: false, ...actionError(error, 'Unable to mark the selected copies read.') } }
}
