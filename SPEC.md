# Library App - Project Specification & Task Tracker

## Phase 1 & 2: Core Library Management (Completed)
- [x] Data models for Books (Works & Copies)
- [x] Basic CRUD (Add, Edit, View, Delete books)
- [x] Search across Title, Author, Genre, ISBN
- [x] Core Filters (Status, Format, Purchase Status, Year, Genre, Author, Volume)
- [x] Reading Session Tracking & Timer
- [x] Reading Heatmap visualization
- [x] Dashboard with basic analytics and investment tracking
- [x] Quote saving functionality
- [x] Shareable cards generator

## Priority Fixes & Tech Debt (Current)
- [x] **Fix Metadata Mismatches:** Audit existing metadata matching logic. Specifically, the fallback Wikipedia API fetch in `AddBookModal.tsx` queries strictly by title, causing completely unrelated books to match. Update this to match by ISBN first, falling back to title+author only when ISBN is missing.
- [ ] **Secure PDF Storage:** Currently, `api/upload-pdf` saves files to a local public path (`public/pdfs`), which exposes uploaded books to anyone with the URL. Migrate this to a **private** bucket (e.g., Supabase storage) and use server-generated, short-lived signed URLs for the PDF reader.

## Phase 3: Missing Core Features
- [ ] **Barcode/ISBN Camera Scanning:** Implement quick-add functionality using device camera to scan ISBNs.
- [x] **Duplicate-Check on Add:** Add a warning ("You already own this") when trying to add a book that's already in the library.
- [x] **Import/Export Data Portability:** Build CSV/JSON export and allow imports (especially a Goodreads CSV import tool) to avoid vendor lock-in.
- [x] **Overdue-Loan Visibility:** Enhance the Loan Tracker to explicitly highlight overdue books and display a reminder/notification when a due date passes.
- [x] **"Read Next From My Shelf" Suggester:** Implement a smart picker that suggests an unread book from the existing library.
- [x] **Physical Location Filter:** Surface the `shelfLocation` field as an active filter in the UI (not just stored data).

## Phase 4: Enhancements & New Ideas
- [x] **"Reading Wrapped" Annual Summary:** Leverage existing data (reading timer, sessions, heatmap, shareable cards) to generate an end-of-year personalized "Reading Wrapped" card (total hours, books finished, longest streak, genre breakdown).
- [x] **ePub Support:** (Deferred per earlier discussions) Support parsing and reading ePub files natively.
