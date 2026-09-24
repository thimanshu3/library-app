const fs = require('fs');

const file = 'src/app/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const fetchStart = content.indexOf('async function fetchBooks()');
const saveStart = content.indexOf('async function saveBooks(updated: Book[])');
const nextFunc = content.indexOf('const checkWishlistPrices = async (currentBooks: Book[])');

if (fetchStart === -1 || saveStart === -1 || nextFunc === -1) {
    console.error("Could not find boundaries");
    process.exit(1);
}

const newFunctions = `  async function fetchBooks() {
    try {
      const res = await fetch('/api/books')
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          setBooks(data)
        } else if (data.works && data.copies) {
          const works = data.works;
          const copies = data.copies;
          
          const joinedBooks = copies.map((copy: any) => {
            const work = works.find((w: any) => w.id === copy.workId) || {}
            return {
              id: copy.id,
              workId: work.id || '',
              title: work.title || '',
              author: work.author || '',
              genre: work.genre || '',
              hours: work.hours || '',
              recommendedBy: work.recommendedBy || '',
              volume: work.volume || '',
              photoUrl: work.photoUrl || '',
              summary: work.summary || '',
              description: work.description || '',
              launchYear: work.launchYear,
              originalLanguage: work.originalLanguage,
              countryOfOrigin: work.countryOfOrigin,
              authorDescription: work.authorDescription,
              coverFile: work.coverFile,
              isbn: work.isbn,
              tags: work.tags || [],
              collections: work.collections || [],
              series: work.series,
              apiData: work.apiData || {},
              readingSpans: work.readingSpans || [],
              
              format: copy.format,
              condition: copy.condition,
              shelfLocation: copy.shelfLocation,
              purchased: copy.purchased,
              purchasePrice: copy.purchasePrice,
              investedAmount: copy.investedAmount,
              status: copy.status,
              pdfPath: copy.pdfPath,
              currentPage: copy.currentPage,
              totalPages: copy.totalPages,
              lastReadTimestamp: copy.lastReadTimestamp,
              readingSessions: copy.readingSessions,
              rating: copy.rating,
              quotes: copy.quotes,
              amazonLink: copy.amazonLink,
              loans: copy.loans,
              
              givenTo: copy.loans?.[0]?.borrowerName || '',
              loanDate: copy.loans?.[0]?.dateLent || '',
              shelfRow: copy.shelfLocation,
              readingStartDate: work.readingSpans?.[0]?.startDate || '',
              readingEndDate: work.readingSpans?.[0]?.endDate || ''
            }
          })
          setBooks(joinedBooks)
        }
      }
    } catch (err) {
      console.error('Failed to load books', err)
    }
  }

  async function saveBooks(updated: Book[]) {
    try {
      const worksMap = new Map<string, any>()
      const copies: any[] = []
      
      updated.forEach(book => {
         if (!worksMap.has(book.workId)) {
           worksMap.set(book.workId, {
             id: book.workId,
             title: book.title,
             author: book.author,
             genre: book.genre,
             hours: book.hours,
             recommendedBy: book.recommendedBy,
             volume: book.volume,
             photoUrl: book.photoUrl,
             summary: book.summary,
             description: book.description,
             launchYear: book.launchYear,
             originalLanguage: book.originalLanguage,
             countryOfOrigin: book.countryOfOrigin,
             authorDescription: book.authorDescription,
             coverFile: book.coverFile,
             isbn: book.isbn,
             tags: book.tags || [],
             collections: book.collections || [],
             series: book.series,
             apiData: book.apiData || {},
             readingSpans: book.readingSpans || []
           })
         }
         
         copies.push({
            id: book.id,
            workId: book.workId,
            format: book.format,
            condition: book.condition,
            shelfLocation: book.shelfLocation || book.shelfRow || '',
            purchased: book.purchased,
            purchasePrice: book.purchasePrice,
            investedAmount: book.investedAmount,
            status: book.status,
            pdfPath: book.pdfPath,
            currentPage: book.currentPage,
            totalPages: book.totalPages,
            lastReadTimestamp: book.lastReadTimestamp,
            readingSessions: book.readingSessions || [],
            rating: book.rating,
            quotes: book.quotes || [],
            amazonLink: book.amazonLink,
            loans: book.loans || []
         })
      })
      
      const payload = {
        works: Array.from(worksMap.values()),
        copies
      }

      await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
    } catch (error) {
      console.error('Failed to save books', error)
    }
  }

  `;

content = content.substring(0, fetchStart) + newFunctions + content.substring(nextFunc);
fs.writeFileSync(file, content);
