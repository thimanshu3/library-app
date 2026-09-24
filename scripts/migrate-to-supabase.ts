import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

async function main() {
  const booksPath = path.join(__dirname, '..', 'data', 'books.json')
  const rawData = fs.readFileSync(booksPath, 'utf8')
  const data = JSON.parse(rawData)

  const works = data.works || []
  const copies = data.copies || []

  console.log(`Migrating ${works.length} works and ${copies.length} copies...`)

  // Migrate works
  for (const w of works) {
    await prisma.work.upsert({
      where: { id: w.id },
      create: {
        id: w.id,
        title: w.title ? String(w.title) : '',
        author: w.author ? String(w.author) : '',
        genre: w.genre ? String(w.genre) : '',
        hours: w.hours ? String(w.hours) : '',
        recommendedBy: w.recommendedBy ? String(w.recommendedBy) : '',
        volume: w.volume ? String(w.volume) : '',
        photoUrl: w.photoUrl ? String(w.photoUrl) : '',
        summary: w.summary ? String(w.summary) : '',
        description: w.description ? String(w.description) : '',
        launchYear: w.launchYear ? String(w.launchYear) : '',
        originalLanguage: w.originalLanguage ? String(w.originalLanguage) : '',
        countryOfOrigin: w.countryOfOrigin ? String(w.countryOfOrigin) : '',
        authorDescription: w.authorDescription ? String(w.authorDescription) : '',
        coverFile: w.coverFile ? String(w.coverFile) : '',
        isbn: w.isbn ? String(w.isbn) : '',
        tags: w.tags || [],
        collections: w.collections || [],
        series: w.series ? String(w.series) : '',
        apiData: w.apiData || {},
        readingSpans: w.readingSpans || [],
      },
      update: {
        title: w.title ? String(w.title) : '',
        author: w.author ? String(w.author) : '',
        genre: w.genre ? String(w.genre) : '',
        hours: w.hours ? String(w.hours) : '',
        recommendedBy: w.recommendedBy ? String(w.recommendedBy) : '',
        volume: w.volume ? String(w.volume) : '',
        photoUrl: w.photoUrl ? String(w.photoUrl) : '',
        summary: w.summary ? String(w.summary) : '',
        description: w.description ? String(w.description) : '',
        launchYear: w.launchYear ? String(w.launchYear) : '',
        originalLanguage: w.originalLanguage ? String(w.originalLanguage) : '',
        countryOfOrigin: w.countryOfOrigin ? String(w.countryOfOrigin) : '',
        authorDescription: w.authorDescription ? String(w.authorDescription) : '',
        coverFile: w.coverFile ? String(w.coverFile) : '',
        isbn: w.isbn ? String(w.isbn) : '',
        tags: w.tags || [],
        collections: w.collections || [],
        series: w.series ? String(w.series) : '',
        apiData: w.apiData || {},
        readingSpans: w.readingSpans || [],
      },
    })
  }

  console.log(`Works migrated!`)

  // Migrate copies
  for (const c of copies) {
    await prisma.copy.upsert({
      where: { id: c.id },
      create: {
        id: c.id,
        workId: c.workId,
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
        readingSessions: c.readingSessions || [],
        rating: c.rating ? Number(c.rating) : null,
        quotes: c.quotes || [],
        amazonLink: c.amazonLink ? String(c.amazonLink) : '',
        loans: c.loans || [],
      },
      update: {
        workId: c.workId,
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
        readingSessions: c.readingSessions || [],
        rating: c.rating ? Number(c.rating) : null,
        quotes: c.quotes || [],
        amazonLink: c.amazonLink ? String(c.amazonLink) : '',
        loans: c.loans || [],
      },
    })
  }

  console.log(`Copies migrated!`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
