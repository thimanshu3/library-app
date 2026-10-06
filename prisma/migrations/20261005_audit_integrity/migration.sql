BEGIN;

-- AlterTable
ALTER TABLE
    "Work"
ADD
    COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD
    COLUMN "launchYearNumber" INTEGER,
ADD
    COLUMN "libraryOrder" BIGINT NOT NULL DEFAULT 0,
ADD
    COLUMN "revision" INTEGER NOT NULL DEFAULT 0,
ADD
    COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE
    "Copy"
ADD
    COLUMN "attachmentKey" TEXT,
ADD
    COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD
    COLUMN "currency" TEXT NOT NULL DEFAULT 'INR',
ADD
    COLUMN "editionId" TEXT,
ADD
    COLUMN "epubLocation" TEXT,
ADD
    COLUMN "mediaType" TEXT,
ADD
    COLUMN "offerCheckedAt" TIMESTAMP(3),
ADD
    COLUMN "offerCurrency" TEXT,
ADD
    COLUMN "offerPrice" DECIMAL(12, 2),
ADD
    COLUMN "offerSource" TEXT,
ADD
    COLUMN "ownership" TEXT NOT NULL DEFAULT 'Purchased',
ADD
    COLUMN "readingCompletedAt" DATE,
ADD
    COLUMN "readingSpans" JSONB,
ADD
    COLUMN "readingStartedAt" DATE,
ADD
    COLUMN "revision" INTEGER NOT NULL DEFAULT 0,
ADD
    COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN
    "purchasePrice"
SET
    DATA TYPE DECIMAL(12, 2),
ALTER COLUMN
    "investedAmount"
SET
    DATA TYPE DECIMAL(12, 2);

-- CreateTable
CREATE TABLE "Edition" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "isbn" TEXT,
    "publisher" TEXT,
    "publicationYear" INTEGER,
    "format" TEXT NOT NULL,
    "pageCount" INTEGER,
    CONSTRAINT "Edition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadingSessionRecord" (
    "id" TEXT NOT NULL,
    "copyId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "durationMinutes" DECIMAL(10, 4) NOT NULL,
    "startPage" INTEGER NOT NULL,
    "endPage" INTEGER NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReadingSessionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Loan" (
    "id" TEXT NOT NULL,
    "copyId" TEXT NOT NULL,
    "borrowerName" TEXT NOT NULL,
    "dateLent" DATE NOT NULL,
    "expectedReturnDate" DATE,
    "dateReturned" DATE,
    "notes" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'active',
    "deleteAfter" TIMESTAMP(3),
    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "LibrarySettings" (
    "id" TEXT NOT NULL DEFAULT 'owner',
    "annualGoal" INTEGER NOT NULL DEFAULT 50,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LibrarySettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Edition_workId_isbn_idx" ON "Edition"("workId", "isbn");

-- CreateIndex
CREATE INDEX "ReadingSessionRecord_copyId_date_idx" ON "ReadingSessionRecord"("copyId", "date");

-- CreateIndex
CREATE INDEX "ReadingSessionRecord_date_idx" ON "ReadingSessionRecord"("date");

-- CreateIndex
CREATE INDEX "Loan_copyId_dateReturned_idx" ON "Loan"("copyId", "dateReturned");

-- CreateIndex
CREATE INDEX "Loan_dateReturned_expectedReturnDate_idx" ON "Loan"("dateReturned", "expectedReturnDate");

-- CreateIndex
CREATE INDEX "Attachment_status_deleteAfter_idx" ON "Attachment"("status", "deleteAfter");

-- CreateIndex
CREATE INDEX "Work_libraryOrder_id_idx" ON "Work"("libraryOrder", "id");

-- CreateIndex
CREATE INDEX "Work_launchYearNumber_id_idx" ON "Work"("launchYearNumber", "id");

-- CreateIndex
CREATE INDEX "Work_author_id_idx" ON "Work"("author", "id");

-- CreateIndex
CREATE INDEX "Work_title_id_idx" ON "Work"("title", "id");

-- CreateIndex
CREATE INDEX "Work_genre_volume_idx" ON "Work"("genre", "volume");

-- CreateIndex
CREATE INDEX "Copy_workId_id_idx" ON "Copy"("workId", "id");

-- CreateIndex
CREATE INDEX "Copy_editionId_idx" ON "Copy"("editionId");

-- CreateIndex
CREATE INDEX "Copy_attachmentKey_idx" ON "Copy"("attachmentKey");

-- CreateIndex
CREATE INDEX "Copy_status_id_idx" ON "Copy"("status", "id");

-- CreateIndex
CREATE INDEX "Copy_ownership_status_idx" ON "Copy"("ownership", "status");

-- CreateIndex
CREATE INDEX "Copy_shelfLocation_id_idx" ON "Copy"("shelfLocation", "id");

-- CreateIndex
CREATE INDEX "Copy_investedAmount_id_idx" ON "Copy"("investedAmount", "id");

-- CreateIndex
CREATE INDEX "Copy_readingCompletedAt_idx" ON "Copy"("readingCompletedAt");

-- AddForeignKey
ALTER TABLE
    "Copy"
ADD
    CONSTRAINT "Copy_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE
    "Copy"
ADD
    CONSTRAINT "Copy_attachmentKey_fkey" FOREIGN KEY ("attachmentKey") REFERENCES "Attachment"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE
    "Edition"
ADD
    CONSTRAINT "Edition_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE
    "ReadingSessionRecord"
ADD
    CONSTRAINT "ReadingSessionRecord_copyId_fkey" FOREIGN KEY ("copyId") REFERENCES "Copy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE
    "Loan"
ADD
    CONSTRAINT "Loan_copyId_fkey" FOREIGN KEY ("copyId") REFERENCES "Copy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve legacy edition fields and keep reading history on the individual copy.
INSERT INTO
    "Edition" (
        "id",
        "workId",
        "isbn",
        "publisher",
        "publicationYear",
        "format",
        "pageCount"
    )
SELECT
    'e_legacy_' || c."id",
    c."workId",
    NULLIF(w."isbn", ''),
    w."publisher",
    CASE
        WHEN w."yearPublished" ~ '^[0-9]{4}$' THEN w."yearPublished" :: integer
        ELSE NULL
    END,
    c."format",
    NULLIF(COALESCE(c."totalPages", w."pageCount"), 0)
FROM
    "Copy" c
    JOIN "Work" w ON w."id" = c."workId";

UPDATE
    "Copy" c
SET
    "editionId" = 'e_legacy_' || c."id",
    "readingSpans" = w."readingSpans",
    "ownership" =CASE
        WHEN c."purchased" THEN 'Purchased'
        WHEN c."status" = 'Wishlist' THEN 'None'
        ELSE 'Gifted'
    END,
    "mediaType" =CASE
        WHEN lower(c."pdfPath") LIKE '%.epub' THEN 'epub'
        WHEN lower(c."pdfPath") LIKE '%.pdf' THEN 'pdf'
        ELSE NULL
    END
FROM
    "Work" w
WHERE
    w."id" = c."workId";

UPDATE
    "Work"
SET
    "libraryOrder" =CASE
        WHEN "id" ~ '^w_[0-9]{1,18}' THEN substring(
            "id"
            from
                '^w_([0-9]{1,18})'
        ) :: bigint
        ELSE 0
    END,
    "launchYearNumber" =CASE
        WHEN "launchYear" ~ '^[0-9]{1,4}$' THEN "launchYear" :: integer
        ELSE NULL
    END;

INSERT INTO
    "Attachment" ("key")
SELECT
    DISTINCT regexp_replace("pdfPath", '^/(api/files|pdfs)/', '')
FROM
    "Copy"
WHERE
    "pdfPath" ~ '^/(api/files|pdfs)/[a-zA-Z0-9_.-]+[.](pdf|epub)$';

UPDATE
    "Copy"
SET
    "attachmentKey" = regexp_replace("pdfPath", '^/(api/files|pdfs)/', '')
WHERE
    "pdfPath" ~ '^/(api/files|pdfs)/[a-zA-Z0-9_.-]+[.](pdf|epub)$';

COMMIT;