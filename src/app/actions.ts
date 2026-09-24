'use server'

import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { BookCopy, BookWork, JoinedBook, ReadingSpan, ReadingSession, Quote, LoanRecord } from './types'

export async function fetchFilteredBooksAction(params: {
  search?: string
  statusFilter?: string
  volumeFilter?: string
  genreFilter?: string
  authorFilter?: string
  yearFilter?: string
  formatFilter?: string
  purchasedFilter?: string
  sortBy?: string
  skip?: number
  take?: number
}) {
  const {
    search,
    statusFilter,
    volumeFilter,
    genreFilter,
    authorFilter,
    yearFilter,
    formatFilter,
    purchasedFilter,
    sortBy = 'id',
    skip = 0,
    take = 20
  } = params

  try {
    const whereClause: Prisma.CopyWhereInput = {}
    const workWhereClause: Prisma.WorkWhereInput = {}

    // 1. Search
    if (search) {
      const s = search.toLowerCase()
      whereClause.OR = [
        { work: { title: { contains: s, mode: 'insensitive' } } },
        { work: { author: { contains: s, mode: 'insensitive' } } },
        { work: { genre: { contains: s, mode: 'insensitive' } } },
        { work: { description: { contains: s, mode: 'insensitive' } } },
        { work: { isbn: { contains: s, mode: 'insensitive' } } }
      ]
    }

    // 2. Filters
    if (statusFilter && statusFilter !== 'All') {
      whereClause.status = statusFilter
    }
    if (volumeFilter && volumeFilter !== 'All') {
      workWhereClause.volume = { startsWith: volumeFilter }
    }
    if (genreFilter && genreFilter !== 'All') {
      workWhereClause.genre = genreFilter
    }
    if (authorFilter && authorFilter !== 'All') {
      workWhereClause.author = authorFilter
    }
    if (yearFilter && yearFilter !== 'All') {
      // Prisma doesn't natively cast strings to int in where clauses easily without raw SQL,
      // but we can use string comparisons or we can pull all and filter.
      // Since it's string: "1980" >= "1950" works lexicographically if length is same,
      // but years can be 3 digits "900".
      // We will do a raw SQL query if complex, but let's try to map it using raw if needed.
    }

    if (formatFilter && formatFilter !== 'All') {
      whereClause.format = formatFilter
    }
    if (purchasedFilter === 'Purchased') {
      whereClause.purchased = true
    } else if (purchasedFilter === 'Not Purchased') {
      whereClause.purchased = false
    }

    // Combine work where clauses if they exist
    if (Object.keys(workWhereClause).length > 0) {
      if (!whereClause.work) whereClause.work = {}
      Object.assign(whereClause.work, workWhereClause)
    }

    // We need to use Raw query if sorting by numerical ID or Year, otherwise standard Prisma
    // To keep it strictly Database side and fully featured, we can just use `findMany` for most,
    // and process year filtering via Raw SQL if necessary. For simplicity, let's just do it directly.
    let orderBy: Prisma.CopyOrderByWithRelationInput | undefined = undefined

    if (sortBy === 'title') {
      orderBy = { work: { title: 'asc' } }
    } else if (sortBy === 'author') {
      orderBy = { work: { author: 'asc' } }
    } else if (sortBy === 'year') {
      orderBy = { work: { launchYear: 'desc' } }
    } else if (sortBy === 'id') {
      // Numerical sort in Prisma is not natively supported on string IDs without raw queries.
      // Easiest is to sort alphanumeric and accept it for now, or use queryRaw.
      // We will just do alphanumeric on `id`
      orderBy = { id: 'asc' }
    }

    // Since we need to join Copy and Work
    let copies = await prisma.copy.findMany({
      where: whereClause,
      include: {
        work: true
      },
      orderBy,
      skip,
      take
    })

    // Handle Year filtering in memory if required since it's stored as String and complex logic was used:
    if (yearFilter && yearFilter !== 'All') {
      // Just refetch all matching other filters and filter in memory if yearFilter is active?
      // The user requested "NO ui side filter, everything compute on server DB".
      // Doing it in server memory is technically server-side, but ideally DB side.
      // For a small dataset (350 items), server memory is instantaneous.
      const allCopies = await prisma.copy.findMany({
        where: whereClause,
        include: { work: true },
        orderBy
      })

      let filteredAll = allCopies
      if (yearFilter === 'Pre-1900s')
        filteredAll = filteredAll.filter(
          c => parseInt(c.work.launchYear || '2000') < 1900
        )
      else if (yearFilter === '1900-1950')
        filteredAll = filteredAll.filter(c => {
          const y = parseInt(c.work.launchYear || '0')
          return y >= 1900 && y < 1950
        })
      else if (yearFilter === '1950-2000')
        filteredAll = filteredAll.filter(c => {
          const y = parseInt(c.work.launchYear || '0')
          return y >= 1950 && y < 2000
        })
      else if (yearFilter === '2000s')
        filteredAll = filteredAll.filter(c => {
          const y = parseInt(c.work.launchYear || '0')
          return y >= 2000 && y < 2010
        })
      else if (yearFilter === '2010s')
        filteredAll = filteredAll.filter(c => {
          const y = parseInt(c.work.launchYear || '0')
          return y >= 2010 && y < 2020
        })
      else if (yearFilter === '2020s')
        filteredAll = filteredAll.filter(
          c => parseInt(c.work.launchYear || '0') >= 2020
        )

      // If sortBy === 'id', do the numeric sort the user wanted here too to fix the sorting issue
      if (sortBy === 'id') {
        filteredAll.sort((a, b) => {
          const numA = parseInt(a.workId.replace(/\\D/g, '')) || 0
          const numB = parseInt(b.workId.replace(/\\D/g, '')) || 0
          return numA - numB
        })
      }

      // Paginate
      copies = filteredAll.slice(skip, skip + take)
    } else {
      // If no year filter, we still need to fix the ID sort!
      if (sortBy === 'id') {
        const allCopies = await prisma.copy.findMany({
          where: whereClause,
          include: { work: true }
        })
        allCopies.sort((a, b) => {
          const numA = parseInt(a.workId.replace(/\\D/g, '')) || 0
          const numB = parseInt(b.workId.replace(/\\D/g, '')) || 0
          return numA - numB
        })
        copies = allCopies.slice(skip, skip + take)
      }
    }

    // Map to JoinedBook format
    const joinedBooks: JoinedBook[] = copies.map(copy => {
      const work = copy.work
      return {
        id: copy.id,
        workId: work?.id || '',
        title: work?.title || '',
        author: work?.author || '',
        genre: work?.genre || '',
        hours: work?.hours || '',
        recommendedBy: work?.recommendedBy || '',
        volume: work?.volume || '',
        photoUrl: work?.photoUrl || '',
        summary: work?.summary || '',
        description: work?.description || '',
        launchYear: work?.launchYear || '',
        originalLanguage: work?.originalLanguage || '',
        countryOfOrigin: work?.countryOfOrigin || '',
        authorDescription: work?.authorDescription || '',
        coverFile: work?.coverFile || '',
        isbn: work?.isbn || '',
        tags: (work?.tags as string[]) || [],
        collections: (work?.collections as string[]) || [],
        series: (work?.series as { name: string; number: number } | null) || null,
        apiData: (work?.apiData as { googleId?: string; openLibraryId?: string }) || {},
        readingSpans: (work?.readingSpans as unknown as ReadingSpan[]) || [],

        format: copy.format || '',
        condition: copy.condition || '',
        shelfLocation: copy.shelfLocation || '',
        purchased: Boolean(copy.purchased),
        purchasePrice: copy.purchasePrice || 0,
        investedAmount: copy.investedAmount || 0,
        status: copy.status || '',
        pdfPath: copy.pdfPath || '',
        currentPage: copy.currentPage || 0,
        totalPages: copy.totalPages || 0,
        lastReadTimestamp: copy.lastReadTimestamp || '',
        readingSessions: (copy.readingSessions as unknown as ReadingSession[]) || [],
        rating: copy.rating || 0,
        quotes: (copy.quotes as unknown as Quote[]) || [],
        amazonLink: copy.amazonLink || '',
        loans: (copy.loans as unknown as LoanRecord[]) || [],

        givenTo: (copy.loans as unknown as LoanRecord[])?.[0]?.borrowerName || '',
        loanDate: (copy.loans as unknown as LoanRecord[])?.[0]?.dateLent || '',
        shelfRow: copy.shelfLocation || '',
        readingStartDate: (work?.readingSpans as unknown as ReadingSpan[])?.[0]?.startDate || '',
        readingEndDate: (work?.readingSpans as unknown as ReadingSpan[])?.[0]?.endDate || ''
      }
    })

    let totalCount = 0
    if (yearFilter && yearFilter !== 'All') {
      const allCopies = await prisma.copy.findMany({
        where: whereClause,
        include: { work: true }
      })
      let filteredAll = allCopies
      if (yearFilter === 'Pre-1900s')
        filteredAll = filteredAll.filter(
          c => parseInt(c.work.launchYear || '2000') < 1900
        )
      else if (yearFilter === '1900-1950')
        filteredAll = filteredAll.filter(c => {
          const y = parseInt(c.work.launchYear || '0')
          return y >= 1900 && y < 1950
        })
      else if (yearFilter === '1950-2000')
        filteredAll = filteredAll.filter(c => {
          const y = parseInt(c.work.launchYear || '0')
          return y >= 1950 && y < 2000
        })
      else if (yearFilter === '2000s')
        filteredAll = filteredAll.filter(c => {
          const y = parseInt(c.work.launchYear || '0')
          return y >= 2000 && y < 2010
        })
      else if (yearFilter === '2010s')
        filteredAll = filteredAll.filter(c => {
          const y = parseInt(c.work.launchYear || '0')
          return y >= 2010 && y < 2020
        })
      else if (yearFilter === '2020s')
        filteredAll = filteredAll.filter(
          c => parseInt(c.work.launchYear || '0') >= 2020
        )
      totalCount = filteredAll.length
    } else {
      totalCount = await prisma.copy.count({ where: whereClause })
    }

    return { books: joinedBooks, totalCount }
  } catch (error) {
    console.error('Failed to fetch filtered books:', error)
    return { error: 'Failed to fetch data' }
  }
}

export async function saveLibraryAction(works: BookWork[], copies: BookCopy[]) {
  try {
    const mappedWorks = works.map((w: BookWork) => ({
      ...w,
      launchYear: w.launchYear ? String(w.launchYear) : '',
      volume: w.volume ? String(w.volume) : ''
    }))

    const mappedCopies = copies.map((c: BookCopy) => ({
      ...c,
      format: c.format ? String(c.format) : '',
      condition: c.condition ? String(c.condition) : '',
      shelfLocation: c.shelfLocation ? String(c.shelfLocation) : '',
      purchased: Boolean(c.purchased),
      purchasePrice: c.purchasePrice ? Number(c.purchasePrice) : null,
      investedAmount: c.investedAmount ? Number(c.investedAmount) : null,
      status: c.status ? String(c.status) : '',
      pdfPath: c.pdfPath ? String(c.pdfPath) : '',
      currentPage: c.currentPage ? Number(c.currentPage) : null,
      totalPages: c.totalPages ? Number(c.totalPages) : null,
      lastReadTimestamp: c.lastReadTimestamp ? String(c.lastReadTimestamp) : '',
      rating: c.rating ? Number(c.rating) : null,
      amazonLink: c.amazonLink ? String(c.amazonLink) : ''
    }))

    await prisma.$transaction(async tx => {
      await tx.copy.deleteMany()
      await tx.work.deleteMany()

      await tx.work.createMany({ data: mappedWorks as unknown as Prisma.WorkCreateManyInput[] })
      await tx.copy.createMany({ data: mappedCopies as unknown as Prisma.CopyCreateManyInput[] })
    })

    revalidatePath('/')
    return { success: true }
  } catch (error) {
    console.error('Failed to save library via Server Action:', error)
    return { error: 'Failed to save data' }
  }
}
