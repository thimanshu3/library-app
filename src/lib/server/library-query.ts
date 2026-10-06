import 'server-only'
import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { QuerySchema, validate } from './library-validation'
import { databaseRead } from './database-read'
import { bookInclude, toBook } from './library-mapper'

export async function queryBooks(input: unknown) {
  const query = validate(QuerySchema, input)
  const work: Prisma.WorkWhereInput = {}
  const where: Prisma.CopyWhereInput = {}
  if (query.search) {
    const search = { contains: query.search, mode: 'insensitive' as const }
    where.OR = [{ work: { title: search } }, { work: { author: search } }, { work: { genre: search } },
      { work: { description: search } }, { edition: { isbn: search } }, { work: { isbn: search } }]
  }
  if (query.statusFilter === 'On Loan') where.loanRecords = { some: { dateReturned: null } }
  else if (query.statusFilter !== 'All') where.status = query.statusFilter
  if (query.viewMode === 'wishlist') where.status = 'Wishlist'
  if (query.genreFilter !== 'All') work.genre = query.genreFilter
  if (query.volumeFilter !== 'All') work.volume = query.volumeFilter
  if (query.authorFilter !== 'All') work.author = query.authorFilter
  if (query.shelfFilter !== 'All') where.shelfLocation = query.shelfFilter
  if (query.formatFilter !== 'All') where.format = query.formatFilter
  if (query.purchasedFilter === 'Not Purchased') where.purchased = false
  else if (query.purchasedFilter !== 'All') where.ownership = query.purchasedFilter
  const years: Record<string, Prisma.IntNullableFilter> = {
    'Before 1900': { lt: 1900 }, '1900-1950': { gte: 1900, lte: 1950 },
    '1951-1999': { gte: 1951, lte: 1999 }, '2000-2010': { gte: 2000, lte: 2010 },
    '2011-2020': { gte: 2011, lte: 2020 }, '2021-Present': { gte: 2021 }
  }
  if (years[query.yearFilter]) work.launchYearNumber = years[query.yearFilter]
  if (Object.keys(work).length) where.work = work
  const order: Prisma.CopyOrderByWithRelationInput[] = []
  if (query.viewMode === 'authors') order.push({ work: { author: 'asc' } })
  if (query.viewMode === 'collections') order.push({ work: { genre: 'asc' } })
  if (query.viewMode === 'volumes') order.push({ work: { volume: 'asc' } })
  if (query.viewMode === 'alphabetic') order.push({ work: { title: 'asc' } })
  if (query.sortBy === 'title') order.push({ work: { title: 'asc' } })
  else if (query.sortBy === 'author') order.push({ work: { author: 'asc' } })
  else if (query.sortBy === 'year') order.push({ work: { launchYearNumber: { sort: 'asc', nulls: 'last' } } })
  else if (query.sortBy === 'price') order.push({ investedAmount: { sort: 'desc', nulls: 'last' } })
  else order.push({ work: { libraryOrder: 'asc' } })
  order.push({ id: 'asc' })
  const [rows, totalCount] = await databaseRead(() => prisma.$transaction([
    prisma.copy.findMany({ where, include: bookInclude, orderBy: order, take: query.take + 1,
      skip: query.cursor ? 1 : query.skip, ...(query.cursor ? { cursor: { id: query.cursor } } : {}) }),
    prisma.copy.count({ where })
  ], { isolationLevel: 'RepeatableRead' }))
  const hasMore = rows.length > query.take
  const page = rows.slice(0, query.take)
  return { books: page.map(toBook), totalCount, hasMore, nextCursor: hasMore ? page.at(-1)?.id || null : null }
}

export async function allBooks() {
  // Full-library operations are explicit and bounded per database request.
  return databaseRead(() => prisma.$transaction(async tx => {
  const books = []
  let cursor: string | undefined
  for (;;) {
    const page = await tx.copy.findMany({ include: bookInclude, orderBy: { id: 'asc' }, take: 250,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) })
    books.push(...page.map(toBook))
    if (page.length < 250) break
    cursor = page.at(-1)!.id
  }
  return books
  }, { isolationLevel: 'RepeatableRead', timeout: 30_000 }))
}
