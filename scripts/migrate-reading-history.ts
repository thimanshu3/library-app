import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'
import { createHash } from 'node:crypto'
import { dateKey } from '../src/lib/library-domain'
config({ path: '.env.local', quiet: true })
config({ path: '.env', quiet: true })

const date = (value?: string | null) => {
  const day = dateKey(value)
  return day ? new Date(day + 'T00:00:00Z') : null
}
async function main() {
  const db = new PrismaClient()
  let sessionCount = 0
  let loanCount = 0
  let invalid = 0
  try {
    const copies = await db.copy.findMany()
    for (const copy of copies) {
      const sessions = Array.isArray(copy.readingSessions)
        ? copy.readingSessions
        : []
      for (const [index, raw] of sessions.entries()) {
        const session = raw as {
          id?: string
          date?: string
          durationMinutes?: number
          startPage?: number
          endPage?: number
        }
        if (!date(session.date) || !Number.isFinite(session.durationMinutes)) {
          invalid++
          continue
        }
        const id =
          session.id ||
          'legacy_' +
            createHash('sha256')
              .update(copy.id + ':' + index)
              .digest('hex')
        await db.readingSessionRecord.upsert({
          where: { id },
          update: {},
          create: {
            id,
            copyId: copy.id,
            date: date(session.date)!,
            durationMinutes: Math.max(0, Number(session.durationMinutes)),
            startPage: Math.max(0, Number(session.startPage) || 0),
            endPage: Math.max(0, Number(session.endPage) || 0),
            observedAt: date(session.date)!
          }
        })
        sessionCount++
      }
      const loans = Array.isArray(copy.loans) ? copy.loans : []
      for (const [index, raw] of loans.entries()) {
        const loan = raw as {
          id?: string
          borrowerName?: string
          dateLent?: string
          dateReturned?: string
          expectedReturnDate?: string
          notes?: string
        }
        if (!date(loan.dateLent) || !loan.borrowerName) {
          invalid++
          continue
        }
        const id =
          loan.id ||
          'legacy_' +
            createHash('sha256')
              .update(copy.id + ':loan:' + index)
              .digest('hex')
        await db.loan.upsert({
          where: { id },
          update: {},
          create: {
            id,
            copyId: copy.id,
            borrowerName: loan.borrowerName,
            dateLent: date(loan.dateLent)!,
            dateReturned: date(loan.dateReturned),
            expectedReturnDate: date(loan.expectedReturnDate),
            notes: loan.notes || ''
          }
        })
        loanCount++
      }
      const spans = Array.isArray(copy.readingSpans)
        ? (copy.readingSpans as { startDate?: string; endDate?: string }[])
        : []
      if ((!copy.readingStartedAt && date(spans.at(-1)?.startDate)) || (!copy.readingCompletedAt && date(spans.at(-1)?.endDate || copy.dateRead))) await db.copy.update({
        where: { id: copy.id },
        data: {
          ...(!copy.readingStartedAt && date(spans.at(-1)?.startDate)
            ? { readingStartedAt: date(spans.at(-1)?.startDate) }
            : {}),
          ...(!copy.readingCompletedAt &&
          date(spans.at(-1)?.endDate || copy.dateRead)
            ? {
                readingCompletedAt: date(spans.at(-1)?.endDate || copy.dateRead)
              }
            : {})
        }
      })
    }
    console.log(
      `Migrated ${sessionCount} sessions and ${loanCount} loans. ${invalid} invalid legacy events remain preserved in the original JSON columns.`
    )
  } finally {
    await db.$disconnect()
  }
}
main().catch(() => {
  console.error('History migration failed; original JSON data remains intact.')
  process.exitCode = 1
})
