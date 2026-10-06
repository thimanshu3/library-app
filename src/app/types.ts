export interface LoanRecord {
  id: string;
  borrowerName: string;
  dateLent: string;
  expectedReturnDate: string | null;
  dateReturned: string | null;
  notes: string;
}

export interface ReadingSession {
  id?: string;
  observedAt?: string;
  date: string;
  durationMinutes: number;
  startPage: number;
  endPage: number;
}

export interface Quote {
  text: string;
  page?: number;
  addedAt: string;
}

export interface BookCopy {
  id: string;
  workId: string;
  format: string;
  condition: string;
  shelfLocation: string;
  purchased: boolean;
  purchasePrice: number;
  investedAmount: number;
  status: ReadingStatus;
  pdfPath?: string;
  currentPage?: number;
  totalPages?: number;
  lastReadTimestamp?: string;
  readingSessions: ReadingSession[];
  rating?: number;
  quotes: Quote[];
  amazonLink?: string;
  loans: LoanRecord[];
  
  // Goodreads CSV fields
  dateRead?: string | null;
  dateAdded?: string | null;
  bookshelves?: string | null;
  bookshelvesWithPositions?: string | null;
  exclusiveShelf?: string | null;
  myReview?: string | null;
  spoiler?: string | null;
  privateNotes?: string | null;
  readCount?: number | null;
}

export interface ReadingSpan {
  startDate: string;
  endDate?: string;
}

export interface BookWork {
  id: string;
  title: string;
  author: string;
  genre: string;
  hours: string;
  recommendedBy: string;
  volume: string;
  photoUrl: string;
  summary: string;
  description: string;
  launchYear?: string;
  originalLanguage?: string;
  countryOfOrigin?: string;
  authorDescription?: string;
  coverFile?: string;
  isbn?: string;
  tags: string[];
  collections: string[];
  series?: { name: string; number: number } | null;
  apiData: { googleId?: string; openLibraryId?: string };
  readingSpans: ReadingSpan[];

  // Goodreads CSV fields
  goodreadsId?: string | null;
  authorLF?: string | null;
  additionalAuthors?: string | null;
  publisher?: string | null;
  yearPublished?: string | null;
  originalPublicationYear?: string | null;
  ownedCopies?: number | null;
}

// Flat structure for the UI
export interface JoinedBook {
  id: string;
  workId: string;
  
  // Work fields
  title: string;
  author: string;
  genre: string;
  hours: string;
  recommendedBy: string;
  volume: string;
  photoUrl: string;
  summary: string;
  description: string;
  launchYear?: string;
  originalLanguage?: string;
  countryOfOrigin?: string;
  authorDescription?: string;
  coverFile?: string;
  isbn?: string;
  tags: string[];
  collections: string[];
  series?: { name: string; number: number } | null;
  apiData: { googleId?: string; openLibraryId?: string };
  readingSpans: ReadingSpan[];

  goodreadsId?: string | null;
  authorLF?: string | null;
  additionalAuthors?: string | null;
  publisher?: string | null;
  yearPublished?: string | null;
  originalPublicationYear?: string | null;
  ownedCopies?: number | null;

  // Copy fields
  format: string;
  condition: string;
  shelfLocation: string;
  purchased: boolean;
  purchasePrice: number;
  investedAmount: number;
  status: ReadingStatus;
  pdfPath?: string;
  currentPage?: number;
  totalPages?: number;
  lastReadTimestamp?: string;
  readingSessions: ReadingSession[];
  rating?: number;
  quotes: Quote[];
  amazonLink?: string;
  loans: LoanRecord[];

  dateRead?: string | null;
  dateAdded?: string | null;
  bookshelves?: string | null;
  bookshelvesWithPositions?: string | null;
  exclusiveShelf?: string | null;
  myReview?: string | null;
  spoiler?: string | null;
  privateNotes?: string | null;
  readCount?: number | null;

  // Legacy fields expected by UI
  shelfRow?: string;
  readingStartDate?: string;
  readingEndDate?: string;
  givenTo?: string;
  loanDate?: string;
  editionId?: string;
  revision?: number;
  workRevision?: number;
  ownership?: Ownership;
  currency?: string;
  epubLocation?: string;
  mediaType?: 'pdf' | 'epub';
  offerPrice?: number | null;
  offerCurrency?: string | null;
  offerCheckedAt?: string | null;
  offerSource?: string | null;
  enrichmentKey?: string;
  createToken?: string;
}

export type ReadingStatus = 'Unread' | 'Reading' | 'Read' | 'Wishlist';
export type Ownership = 'Purchased' | 'Gifted' | 'Borrowed' | 'None';

export type Book = JoinedBook;
