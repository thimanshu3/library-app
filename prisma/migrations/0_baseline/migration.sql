-- CreateTable
CREATE TABLE "Work" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "genre" TEXT NOT NULL,
    "hours" TEXT NOT NULL,
    "recommendedBy" TEXT NOT NULL,
    "volume" TEXT,
    "photoUrl" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT,
    "launchYear" TEXT,
    "originalLanguage" TEXT,
    "countryOfOrigin" TEXT,
    "authorDescription" TEXT,
    "coverFile" TEXT,
    "isbn" TEXT,
    "tags" JSONB,
    "collections" JSONB,
    "series" TEXT,
    "apiData" JSONB,
    "readingSpans" JSONB,
    "additionalAuthors" TEXT,
    "authorLF" TEXT,
    "goodreadsId" TEXT,
    "originalPublicationYear" TEXT,
    "ownedCopies" INTEGER,
    "publisher" TEXT,
    "yearPublished" TEXT,
    "binding" TEXT,
    "isbn13" TEXT,
    "pageCount" INTEGER,
    CONSTRAINT "Work_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Copy" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "shelfLocation" TEXT NOT NULL,
    "purchased" BOOLEAN NOT NULL,
    "purchasePrice" DOUBLE PRECISION,
    "investedAmount" DOUBLE PRECISION,
    "status" TEXT NOT NULL,
    "pdfPath" TEXT,
    "currentPage" INTEGER,
    "totalPages" INTEGER,
    "lastReadTimestamp" TEXT,
    "readingSessions" JSONB,
    "rating" INTEGER,
    "quotes" JSONB,
    "amazonLink" TEXT,
    "loans" JSONB,
    "bookshelves" TEXT,
    "bookshelvesWithPositions" TEXT,
    "dateAdded" TEXT,
    "dateRead" TEXT,
    "exclusiveShelf" TEXT,
    "myReview" TEXT,
    "privateNotes" TEXT,
    "readCount" INTEGER,
    "spoiler" TEXT,
    CONSTRAINT "Copy_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE
    "Copy"
ADD
    CONSTRAINT "Copy_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;