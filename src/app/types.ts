export interface LoanRecord {
  id: string;
  borrowerName: string;
  dateLent: string;
  expectedReturnDate: string | null;
  dateReturned: string | null;
  notes: string;
}

export interface ReadingSession {
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
  format: 'Physical' | 'Ebook' | 'Audiobook' | string;
  condition: 'New' | 'Good' | 'Worn' | 'Damaged' | string;
  shelfLocation: string;
  purchased: boolean;
  purchasePrice: number;
  investedAmount: number;
  status: 'Unread' | 'Reading' | 'Read' | 'Wishlist' | 'On Loan' | string;
  pdfPath?: string;
  currentPage?: number;
  totalPages?: number;
  lastReadTimestamp?: string;
  readingSessions: ReadingSession[];
  rating?: number;
  quotes: Quote[];
  amazonLink?: string;
  loans: LoanRecord[];
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

  // Copy fields
  format: string;
  condition: string;
  shelfLocation: string;
  purchased: boolean;
  purchasePrice: number;
  investedAmount: number;
  status: string;
  pdfPath?: string;
  currentPage?: number;
  totalPages?: number;
  lastReadTimestamp?: string;
  readingSessions: ReadingSession[];
  rating?: number;
  quotes: Quote[];
  amazonLink?: string;
  loans: LoanRecord[];

  // Legacy fields expected by UI
  shelfRow?: string;
  readingStartDate?: string;
  readingEndDate?: string;
  givenTo?: string;
  loanDate?: string;
}

export type Book = JoinedBook;
