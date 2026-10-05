# Personal Library — Flutter Android Product Specification

**Research and repository review: 3 October 2026**  
**Version: 1.0 · Product planning document · Android first, built with Flutter**

**Scope:** 20 modules, 172 prioritised feature requirements, 20 end-to-end use cases, competitive research, migration, data rules, and a phased Flutter implementation plan.

**Reading guide:** start with sections 1–5 for direction and research; use section 6 as the feature catalogue; sections 7–10 cover workflows, invoices, AI and differentiation; sections 11–16 cover screens, offline behavior, data and migration; sections 17–20 cover delivery, validation, decisions and sources. The companion CSV contains the feature backlog, and the PDF provides a paginated reading copy.

## 1. Product direction

Build a private library app that answers six questions reliably: **What do I own? Which edition and copy? Where is it? Who has it? What did it cost? What should I read next?**

The recommended product combines a detailed catalogue, physical inventory, purchase records, lending ledger, reading journal, and an optional AI assistant. The Android app should handle daily work independently, including offline. Your existing web app can become its companion for large imports, editing, reports, and administration.

The main opportunity is the connection between these functions. Buying a book should connect its invoice, edition, physical copy, shelf, reading history, and later loans without repeated data entry. Each copy should have a readable lifetime history.

### Recommended decisions

- **Build the library foundation before elaborate AI:** correct copies, invoices, locations, loans, export, and restore.
- **Make AI part of the first complete product:** recommendations from your own available books, natural-language library search, and assisted receipt entry; expand visual recognition later.
- **Separate a title from an edition and an individual copy.** Two identical paperbacks need separate loans, locations, and purchase records.
- **Keep reading, ownership, and availability separate.** A book can be read, owned, and currently lent out simultaneously.
- **Make the complete catalogue available offline.** Internet access improves metadata and AI; it must not be required to find a book or record a loan.
- **Make every important change traceable.** Correct mistakes through recorded corrections, preserve previous values, and support undo.
- **Keep data portable.** A complete backup includes attachments and history, not just a spreadsheet of titles.

### Working assumptions

This specification targets your personal collection first, with optional household collaboration later. It covers physical books, ebooks, audiobooks, manga, comics, and multi-volume sets. English is the initial interface language; metadata supports Unicode and multiple languages from the beginning. Currency is configurable; INR is used only in examples. Cloud sync and cloud AI are optional. No institutional fines, public social network, bookstore checkout, or publisher platform is required for the first release.

This is a product specification, not an implemented mobile app. Competitor findings come from official product pages, developer documentation, and publisher-controlled store listings. Competitors were not installed or independently benchmarked. The current web app was reviewed through its source files, including uncommitted work; runtime behavior and production data were not verified.

## 2. What your current web app already provides

The repository has more functionality than a basic book list. Preserve its useful concepts, but redesign the data boundaries before introducing mobile sync.

| Area | Evidence in the current source | Mobile direction |
| --- | --- | --- |
| Book catalogue | Prisma `Work` and `Copy`; add, view, edit, and list interfaces | Retain the concept; introduce a separate `Edition` entity |
| Metadata lookup | Google Books and Open Library searches; additional enrichment | Add ISBN validation, edition matching, source provenance, and review |
| Camera scanning | `BarcodeScanner.tsx` and integration in `AddBookModal.tsx` | Rebuild as a native camera flow with continuous scanning and offline capture |
| Duplicate handling | ISBN or title/author comparison against the client book list; add another copy option | Search the complete local catalogue; distinguish duplicate copy, edition, and work |
| Organisation | Genre, tags, collections, volume, series, format, condition, shelf-location fields | Introduce editable category trees, structured series, and location hierarchy |
| Searching and filtering | Server action supports text, status, author, genre, volume, year, format, purchase and shelf filters | Add local full-catalogue search, saved views, and compound filters |
| Lending | JSON loan records with borrower name, lent/due/returned dates and notes; overdue interface | Separate contacts, loans, renewals, reminders, condition checks, and ledger events |
| Purchases | Purchase price, invested amount, purchased flag and Amazon link | Add acquisition records, invoices, line items, payments, refunds and currency |
| Reading | Timer, page progress, sessions, reading spans, heatmap | Preserve history; add per-reader rereads, DNF, audiobook progress, and configurable goals |
| Personal knowledge | Quotes, ratings, reviews and private notes | Add page OCR, linked notes, full search, and optional grounded AI |
| Digital reading | PDF upload and reader | Private attachment storage and offline PDF access; EPUB later |
| Recommendations | Random selection from currently loaded unread/wishlist entries | Preference-based recommendations with availability filtering and explanations |
| Import/export | Goodreads-oriented CSV import; CSV and JSON export | Preview, mapping, error report, reversible imports and complete backups |
| Analytics and sharing | Charts, investment totals, reading heatmap, share cards; yearly goal fixed at 50 in source | Accurate full-library reporting with configurable goals and privacy controls |
| Purchase-price lookup | Puppeteer-based price route and wishlist price refresh | Keep price observations separate from actual purchase costs; add source and timestamp |

**Source inventory:** `prisma/schema.prisma`, `src/app/types.ts`, `src/app/actions.ts`, `src/app/page.tsx`, `src/app/LibraryClient.tsx`, `src/app/components/`, `src/app/api/upload-pdf/route.ts`, `src/app/api/price-tracker/route.ts`, and `SPEC.md`.

### Gaps and migration concerns observed in source

1. There are no dedicated models for editions, invoices, invoice lines, contacts, structured locations, or a general activity ledger.
2. `Copy.status` mixes reading status, wishlist intent and lending. `purchased` cannot distinguish owned gifts, borrowed copies, and books still on a wishlist.
3. `Work.isbn`, publication fields and language information mix work-level and edition-level data. `Work.series` is a string in Prisma but an object in the TypeScript interfaces; migration needs explicit normalisation.
4. Duplicate checks, exports, some analytics and loan views use the client `books` collection. That collection is populated through pagination/filtering, so these operations need a complete-data query instead of relying on visible rows.
5. The reviewed page expects `copies` and `works` from a fetch action that returns `books`; this is an integration mismatch in the current working tree. Treat the files as work in progress, not a verified release baseline.
6. The batch-delete UI removes records from its array, while the reviewed save action only upserts supplied records. A durable delete/archive operation needs its own persistence contract.
7. PDFs are written to `public/pdfs`; invoice images and private ebooks need private storage. No application authentication or account ownership checks were found in the reviewed source paths; deployment-level controls were not inspected.
8. Monetary fields use floating-point numbers, and wishlist refresh can write into `purchasePrice`. Historical cost, current offers, and estimated value must be separate.
9. The implementation includes a scanner even though `SPEC.md` still lists scanning as incomplete. Use inspected source and a future runtime audit when creating the migration checklist.

These findings inform the mobile plan; this document does not modify the existing application.

## 3. Research: apps worth learning from

There is no defensible single best app for every use case. For your requirements, **CLZ is the strongest catalogue benchmark, Handy Library is a useful Android personal-library benchmark, Libib is the lending-workflow benchmark, and StoryGraph is the reading-discovery benchmark.** This is an assessment of their documented capabilities, not a measured performance ranking.

| Product | Documented strengths | What to take into this app | Qualification |
| --- | --- | --- | --- |
| **CLZ Books** | ISBN/title entry, editable metadata, purchase details, location, collections, cloud backup and device sync | Rich copy details, efficient catalogue entry and configurable browsing | Mobile and web feature parity must be checked separately; do not assume lending operations work identically. [CLZ mobile](https://clz.com/books/mobile) |
| **Handy Library — Bookshare** | Android ISBN/manual entry, shelves, borrowed/lent tracking with reminders, wishlist, statistics, local data and backup/import/export | Quick phone workflows, shelf organisation and local access | Its listing describes a catalogue manager rather than an ebook reader. [Google Play listing](https://play.google.com/store/apps/details?hl=en_US&id=com.handylibrary.main) |
| **Libib** | Catalogue scanning and collections; Pro adds patrons, lending, holds, reports and custom fields | Explicit checkout/return, borrower records, copy barcodes and loan history | Lending belongs to paid tiers. The plan's “invoicing/POs” wording is not evidence of per-book purchase-receipt management. [Plans](https://www.libib.com/pricing), [lending guide](https://support.libib.com/libib/website/lending.html) |
| **LibraryThing / TinyCat** | Detailed catalogue, tags, imports, recommendations and community; TinyCat exposes a library catalogue | Metadata depth, collection search, portability and optional guest access | Separate LibraryThing catalogue/mobile functions from TinyCat circulation. [Overview](https://www.librarything.com/quickstart.php), [apps and TinyCat](https://chi.librarything.com/more) |
| **The StoryGraph** | Mood/pace discovery, personalised recommendations, reading statistics, DNF/owned flags, journal, goals and buddy reading | Reading intent, explicit preferences, DNF feedback, and separate ownership | A reading-discovery benchmark; its reviewed page does not establish a full acquisition or copy-location ledger. [Official features](https://www.thestorygraph.com/) |
| **My Library — Julien Keith** | Android barcode/ISBN/manual entry, search, sorting, wishlist, statistics, Excel import/export | Fast entry and a low-friction personal catalogue | Useful simplicity benchmark; the reviewed listing does not document the full advanced workflow proposed here. [Google Play listing](https://play.google.com/store/apps/details?hl=en-US&id=com.vgm.mylibrary) |
| **Bookshelf — Your virtual library** | Android catalogue organisation and scanning, with reading/wishlist features advertised by its publisher | Approachable visual shelves and quick access to books | Several unrelated apps share this name; this entry means package `com.bookshelf.prod`. [Publisher site](https://bookshelfapp.info/), [Google Play listing](https://play.google.com/store/apps/details?hl=en&id=com.bookshelf.prod) |
| **iCollect Everything** | ISBN OCR and AI-assisted image identification, editable records, search and manual entry | Multiple capture methods with a review stage and visible AI costs | AI recognition already exists in collection apps. Capabilities and credits vary by product/platform. [Official support guide](https://www.icollecteverything.com/support/) |
| **BookBuddy — Kimico** | Barcode entry, loans, device sync and spreadsheet export | Clear library and borrower workflows | Reviewed material describes Apple devices; treat it as adjacent UX inspiration, not a verified Android recommendation. [Product](https://www.kimicoapps.com/bookbuddy), [support](https://www.kimicoapps.com/support) |
| **Hylle — Treky Labs** | Shelf-photo recognition, recommendations using owned books, borrowing/social features and quizzes | Visual capture and discovery connected to a personal collection | Reviewed evidence is an Apple listing. Shelf scanning and owned-book recommendations cannot be claimed as new inventions. [App listing](https://apps.apple.com/us/app/hylle-ai-book-library/id6758072963) |

**Platform caution:** CLZ staff distinguished web lending operations from mobile display of loan information in a 2024 support response; a 2025 discussion also identified web-only differences. These dated statements justify checking current Android parity, not asserting a permanent limitation. [CLZ staff explanation](https://club.clz.com/t/checking-out-books/2265), [follow-up discussion](https://club.clz.com/t/price-increase/4900).

### Baseline versus differentiation

ISBN scanning, shelves, tags, loans, reading statistics, recommendations, and exports are expected capabilities. OCR and AI shelf scanning also have existing examples. The proposed opportunity is **a dependable end-to-end workflow connecting purchase evidence, exact copies, locations, custody, reading, and explanations**. Absence from a reviewed product page means “not verified,” not “the product cannot do it.”

## 4. Product vocabulary and rules

| Concept | Meaning | Example |
| --- | --- | --- |
| Work | The underlying intellectual book | A novel regardless of publisher or format |
| Edition | A particular publication/translation/format | English paperback, Publisher A, 2024, one ISBN |
| Copy | One particular item or personal digital holding | Your signed paperback, accession `BK-0042` |
| Series | An ordered relationship between works | Main series order and alternative chronological order |
| Volume / part | A numbered or named part of a work or set | Volume 2, Part I, issue 10, or supplement |
| Box set | A purchased container or bundle with member copies | Three separately lendable volumes bought together |
| Category | A controlled hierarchy you create | Nonfiction → History → Indian history |
| Tag | A flexible label, many per book | Comfort read, exam prep, signed, gift |
| Collection | A curated grouping independent of physical position | Favourites, university syllabus, inherited books |
| Location | The physical place assigned to a copy | Home → Study → Bookcase B → Shelf 3 → Position 7 |
| Home location | Where a copy normally belongs | Study, shelf B3 |
| Current custody | Who currently holds the copy | You, a named borrower, repairer, or unknown |
| Ledger | Searchable history of meaningful events | Acquired, moved, lent, renewed, returned, repaired, sold |

The UI may use “Book” for simplicity but must allow drilling down from work to edition to copy. An ISBN identifies a publication, not your individual copy. Books without ISBNs remain fully usable. A Google Books volume ID is a provider identifier, not a numbered volume in your own series.

Use independent state dimensions:

- **Ownership:** owned, borrowed from someone, formerly owned. Wishlist entries are intentions and do not create fictitious owned copies.
- **Availability/custody:** on shelf, with me, lent, in repair, missing; disposed items remain in history.
- **Reading per reader:** unread, planned, reading, paused, finished, did not finish. Each reread has its own record.
- **Acquisition:** ordered, partly received, received, partly returned, returned/cancelled.
- **Record quality:** draft, needs review, verified; metadata confidence never changes ownership automatically.

## 5. Module map and priorities

**P0 — foundation:** needed before trusting the app with the collection. **P1 — complete advanced personal app:** includes the AI features requested. **P2 — later enhancement/experiment:** useful, but dependent on the foundation or research. All P1 modules remain in the intended product; sequencing does not remove them from scope.

| Module | Responsibility | Initial priority |
| --- | --- | --- |
| M01 Setup and personal preferences | Library, profile, defaults and onboarding | P0 |
| M02 Capture and ISBN scanning | Camera, batch entry, manual entry, metadata matching | P0 |
| M03 Catalogue, editions and copies | Book identity, copy details and lifecycle | P0 |
| M04 Categories, series and volumes | Flexible logical organisation | P0 |
| M05 Locations and shelf inventory | Placement, moves, labels and stocktakes | P0/P1 |
| M06 Acquisitions and invoices | Receipts, costs, order/return history | P0/P1 |
| M07 Contacts, lending and borrowing | People, checkout, renewals and return | P0 |
| M08 Unified ledger | Events, audit trail and corrections | P0 |
| M09 Search and saved views | Find anything across the whole library | P0/P1 |
| M10 Reading and goals | Progress, sessions, rereads and habits | P0/P1 |
| M11 Notes and knowledge | Quotes, OCR, annotations and recall | P1 |
| M12 Digital files and reader | Private files, PDFs, EPUB and audio | P0/P1/P2 |
| M13 Wishlist and buying decisions | Duplicate prevention, budget and offers | P0/P1 |
| M14 AI librarian | Search, assistance and grounded answers | P1 |
| M15 Recommendations and reading plans | Personalised discovery and feedback | P1 |
| M16 Reports and analytics | Inventory, spending, lending and reading | P0/P1 |
| M17 Android integrations and reminders | Widgets, notifications, sharing and device UX | P0/P1 |
| M18 Offline, sync and backup | Durability, device changes and recovery | P0 |
| M19 Privacy and household access | Protection, selective sharing and roles | P0/P2 |
| M20 Library care and automation | Maintenance, rules and collections stewardship | P1/P2 |

## 6. Detailed feature catalogue

Feature IDs are stable planning references. Each requirement includes a priority; module acceptance examples describe the observable outcome, not a prescribed implementation.

### M01 — Setup and preferences

**Primary use case:** create your library and start adding books without completing a long configuration form.  
**Screens:** welcome, import existing library, library settings, personal preferences.

| ID | Priority | Requirement |
| --- | --- | --- |
| SET-01 | P0 | Create a local library with a name; allow use before cloud sign-in |
| SET-02 | P0 | Set currency, date format, timezone, language and default acquisition/location values |
| SET-03 | P0 | Offer existing-web-app migration, CSV import, or start empty; show progress and resumable setup |
| SET-04 | P0 | Ask for camera, file and notification access when their features are used; explain denied-permission alternatives |
| SET-05 | P1 | Choose optional goals, favourite genres, preferred languages and recommendation exclusions |
| SET-06 | P1 | Hide fields/modules you do not use; remember scan defaults without making them mandatory |

**Acceptance:** first launch can reach manual book entry without an account, camera permission, or completed taste survey.

### M02 — Capture, scanning and metadata

**Primary use case:** scan a stack of newly bought books and review only uncertain matches.  
**Screens:** scanner, scan queue, match chooser, metadata review, manual entry.

| ID | Priority | Requirement |
| --- | --- | --- |
| CAP-01 | P0 | Read book barcodes; accept typed ISBN-10/13; normalise spaces/hyphens and validate checksums |
| CAP-02 | P0 | Provide continuous scan mode, torch, focus guidance, haptic success, sound toggle and visible scan count |
| CAP-03 | P0 | Suppress repeated camera frames; explicitly allow “add another copy” for an intentional repeat |
| CAP-04 | P0 | Save scanned identifiers offline in a durable queue and enrich later without losing scan order |
| CAP-05 | P0 | Retrieve metadata, compare candidates, show edition/language/format, and allow manual correction before save |
| CAP-06 | P0 | Check the whole catalogue for same-copy/edition/work matches; offer open existing, add copy, add edition, or cancel |
| CAP-07 | P0 | Add books with no ISBN using title plus optional author; photograph cover and copyright page |
| CAP-08 | P0 | Apply shared shelf, acquisition, invoice, category and tags to a batch; override individual entries |
| CAP-09 | P1 | Read printed ISBN text with OCR; support capture from a user-selected image |
| CAP-10 | P1 | Suggest matches from cover/title-page photographs, with confidence and a review step |
| CAP-11 | P2 | Detect multiple book spines from a shelf photograph and create a candidate review queue |
| CAP-12 | P1 | Accept ISBN/title/retailer links from Android sharing; show a draft rather than silently adding |

**Acceptance:** scanning the same barcode for several seconds creates one queued item. Two intentional copies share an edition but get distinct copy IDs. A failed lookup still leaves an editable draft. Barcode recognition can work offline; new external metadata generally cannot.

### M03 — Catalogue, editions and copies

**Primary use case:** manage a paperback, a different translation and a signed duplicate without mixing their details.  
**Screens:** book overview, edition selector, copy detail, metadata editor, archive.

| ID | Priority | Requirement |
| --- | --- | --- |
| CAT-01 | P0 | Maintain work, edition and copy records with stable internal IDs |
| CAT-02 | P0 | Store title/subtitle, contributors and roles, description, subjects, original publication and languages |
| CAT-03 | P0 | Store edition ISBNs, publisher, publication date, translation, binding, page count and format |
| CAT-04 | P0 | Store copy accession, condition, ownership, home/current location, acquisition and notes |
| CAT-05 | P0 | Attach actual cover, spine, inscription, damage and purchase photographs to the appropriate record |
| CAT-06 | P0 | Archive sold/donated/lost copies while retaining history; provide trash/restore for accidental deletion |
| CAT-07 | P1 | Merge duplicate records with a preview; preserve linked loans, invoices, notes and source IDs; support correction |
| CAT-08 | P1 | Record signed/limited editions, print run, edition number, inscriptions and provenance |
| CAT-09 | P1 | Add typed custom fields: text, number, date, option, checkbox and URL; make them searchable/exportable |

**Acceptance:** lending one copy never marks every edition unavailable. Editing a publisher does not change unrelated editions. A cover replacement keeps the user's chosen image during later enrichment.

### M04 — Categories, series, volumes and collections

**Primary use case:** create a personal classification system and track a multi-volume set.  
**Screens:** category manager, series page, set detail, tags/collections manager.

| ID | Priority | Requirement |
| --- | --- | --- |
| ORG-01 | P0 | Create, rename, reorder, merge and archive nested categories; permit multiple categories per work |
| ORG-02 | P0 | Create tags and curated collections independently from physical shelves |
| ORG-03 | P0 | Create series and custom volumes/parts; preserve labels such as “2.5”, “Part II” and “Supplement” |
| ORG-04 | P0 | Represent a multi-volume publication and its member copies; display owned/missing parts |
| ORG-05 | P0 | Represent a box-set purchase without double-counting its container as another readable book |
| ORG-06 | P1 | Support multiple reading orders and omnibus editions containing several works |
| ORG-07 | P1 | Create smart collections from rules: unread history, overdue loans, unlocated books, missing receipts |
| ORG-08 | P1 | Bulk assign categories/tags and suggest cleanup of spelling variants with review |
| ORG-09 | P2 | Optional Dewey/Library of Congress classification fields and custom call-number templates |

**Acceptance:** you can create your own “Volume” grouping without an external database. “Shelf 2” remains a physical location even if “History” is both a category and a collection. Missing-volume detection respects omnibus coverage and an editable expected-volume list.

### M05 — Physical locations and inventory

**Primary use case:** find a specific copy, move a shelf of books, and check what is missing.  
**Screens:** location tree, shelf view, move books, label print/export, audit session.

| ID | Priority | Requirement |
| --- | --- | --- |
| LOC-01 | P0 | Create location hierarchy: property, room, bookcase, shelf, box and optional position |
| LOC-02 | P0 | Separate normal home shelf from temporary place and borrower custody |
| LOC-03 | P0 | Search/browse a shelf and display its path on every physical-copy page |
| LOC-04 | P0 | Move one or many copies with previous place, new place, date and optional reason recorded |
| LOC-05 | P1 | Generate copy/shelf QR labels; scan destination shelf then copy labels to assign positions |
| LOC-06 | P1 | Run resumable stocktakes: expected, seen, misplaced, lent, missing and unrecognised items |
| LOC-07 | P1 | Display shelf photographs with manually linked positions; update the photo independently of inventory |
| LOC-08 | P1 | Pack into numbered moving boxes and reconcile unpacking against the manifest |
| LOC-09 | P2 | Suggest shelf arrangements using owner-entered dimensions, categories and available space |
| LOC-10 | P2 | Use visual shelf recognition to propose location changes; require review before committing |

**Acceptance:** an audit never calls a currently lent book missing. A photo match does not silently move a copy. “Where is it?” shows the last confirmed location/custodian and when it was confirmed, rather than implying live tracking.

### M06 — Purchases, invoices and financial records

**Primary use case:** attach one invoice to several books, track actual cost, and preserve partial returns.  
**Screens:** purchases, invoice scanner/editor, line-item matcher, payment/refund detail, spending report.

| ID | Priority | Requirement |
| --- | --- | --- |
| FIN-01 | P0 | Create acquisitions for purchases, gifts, inheritance, swaps and personal imports; allow unknown cost |
| FIN-02 | P0 | Store seller, order/invoice number, date, currency, payment status, notes and receipt attachment |
| FIN-03 | P0 | Link invoice lines and quantities to individual copies; support multiple copies on one line |
| FIN-04 | P0 | Record item cost, line discount, shared discount, shipping, recorded tax and fees; reconcile to invoice total |
| FIN-05 | P0 | Keep original invoiced amount and currency; allow manual allocation or a clear proportional rule |
| FIN-06 | P0 | Record refunds, returns, cancellations and replacement copies as linked events, retaining the original purchase |
| FIN-07 | P1 | Scan multi-page paper receipts or import PDFs/images; OCR seller, dates, totals and item candidates |
| FIN-08 | P1 | Match receipt lines to scanned books using ISBN first, then title/author/price; surface ambiguity |
| FIN-09 | P1 | Track orders, deliveries and partial fulfilment; promote received items to owned copies |
| FIN-10 | P1 | Track payments, reimbursements and optional personal deposits separately from inventory cost |
| FIN-11 | P1 | Detect potentially duplicate receipts by file hash plus seller/number/date/total; allow legitimate repeats |
| FIN-12 | P1 | Keep original currency totals and optional dated conversion; separate expense, replacement estimate and resale proceeds |

**Acceptance:** the sum allocated to copies plus explicitly unallocated/non-book amounts equals the recorded invoice total. OCR cannot finalise an unreconciled invoice. Buying a box set allocates its purchase cost once. A gift can be owned with unknown cost; unknown does not mean zero.

### M07 — People, lending and borrowing

**Primary use case:** record exactly which book you gave to whom and recover its full return history.  
**Screens:** people, person ledger, checkout, active loans, renew, return, books borrowed by me.

| ID | Priority | Requirement |
| --- | --- | --- |
| LND-01 | P0 | Create a borrower/contact using a name; phone/email are optional; an app account is unnecessary |
| LND-02 | P0 | Lend one or several selected copies with date, optional due date, notes and handover location |
| LND-03 | P0 | Prevent two accepted active loans on the same copy; clearly mark offline transactions awaiting sync |
| LND-04 | P0 | Show all active, due-soon, overdue and returned loans; group by person or book |
| LND-05 | P0 | Record renewals with previous/new due dates, return events and partial returns from a batch |
| LND-06 | P0 | Track books borrowed by you, lender, due date and return; exclude them from owned totals |
| LND-07 | P0 | Preserve condition at checkout/return and optional photographs; record lost/damaged outcomes |
| LND-08 | P1 | Draft polite reminders in a chosen language; open Android sharing for an intentional send |
| LND-09 | P1 | Track holds/waitlists and notify the owner when a requested copy becomes available |
| LND-10 | P1 | Support an explicitly approved handover to another person with uninterrupted custody history |
| LND-11 | P2 | Offer expiring borrower links to view their own loans or request renewal; owner confirms final return |

**Acceptance:** returning two of three borrowed books closes only those two loan records. Renewal preserves the original date and all earlier due dates. An undated loan is shown as “no due date,” with an optional check-in reminder instead of invented overdue status.

### M08 — Unified lifetime ledger

**Primary use case:** open any copy and understand everything that happened to it.  
**Screens:** all activity, book timeline, person timeline, invoice timeline, event detail.

| ID | Priority | Requirement |
| --- | --- | --- |
| LED-01 | P0 | Record acquisition, placement, move, lending, renewal, return, repair, loss, rediscovery and disposal events |
| LED-02 | P0 | Include event ID, entity links, event time, recorded time, actor/device, source, notes and attachments |
| LED-03 | P0 | Filter by copy, person, location, event type and date; link back to the originating transaction |
| LED-04 | P0 | Correct or reverse an event with a reason and linked correction; preserve the earlier record |
| LED-05 | P0 | Commit state change and its ledger event together; retries cannot create duplicate entries |
| LED-06 | P1 | Export human-readable book/person statements and machine-readable event history |
| LED-07 | P1 | Show a “book passport” combining edition, provenance, costs, condition and lifetime events |

**Acceptance:** editing a wrongly entered return date shows what changed without creating a second physical return. History distinguishes the day an event happened from the later day it was entered. This is an activity and acquisition ledger; full accounting double-entry is outside the initial scope.

### M09 — Search and saved views

**Primary use case:** find “unread Hindi history books on the study shelf that cost under 500.”  
**Screens:** global search, advanced filters, saved searches, results by entity type.

| ID | Priority | Requirement |
| --- | --- | --- |
| SRC-01 | P0 | Search the entire local catalogue by title, author, ISBN, copy code, series and location |
| SRC-02 | P0 | Combine filters for ownership, reading, availability, category, language, format, cost and dates |
| SRC-03 | P0 | Search borrowers, invoice numbers, sellers and ledger events with explicit result types |
| SRC-04 | P1 | Save searches with custom name, sort, display mode and pinned home shortcuts |
| SRC-05 | P1 | Add tolerant spelling, aliases and supported transliteration without altering stored original text |
| SRC-06 | P1 | Search notes, quotes and extracted receipt text while respecting privacy permissions |
| SRC-07 | P1 | Translate natural-language queries into visible editable filters; offer semantic discovery separately |

**Acceptance:** a result outside the currently displayed page is still returned. Exact ISBN and copy-code searches take precedence over fuzzy matches. Search clearly states whether it covers your library or external book sources.

### M10 — Reading, progress and goals

**Primary use case:** track real reading without turning the library into a compulsory habit game.  
**Screens:** current reads, timer, progress editor, reading history, goals and calendar.

| ID | Priority | Requirement |
| --- | --- | --- |
| REA-01 | P0 | Maintain unread/planned/reading/paused/finished/DNF status independently of ownership and loans |
| REA-02 | P0 | Record manual progress by pages or percentage; keep the edition used for page counts |
| REA-03 | P0 | Start/pause/resume sessions and add missed sessions; survive app backgrounding/process recreation |
| REA-04 | P0 | Preserve start/finish dates, ratings, review, DNF reason and separate reread attempts |
| REA-05 | P1 | Track audiobook minutes/percentage and playback speed without converting audio into fake page counts |
| REA-06 | P1 | Configure annual/monthly book, page or time goals and optional streaks; permit disabling gamification |
| REA-07 | P1 | Provide calendar/heatmap, queue, reading reminders and personal pace estimates |
| REA-08 | P1 | Switch between physical/digital formats during a reading attempt; request a progress checkpoint when pagination differs |
| REA-09 | P2 | Add separate household reader histories without changing shared ownership |

**Acceptance:** finishing a reread adds a new completion rather than rewriting the earlier finish date. Scrolling backward in a PDF does not create negative reading. Time estimates identify their basis and remain estimates.

### M11 — Notes, quotes and knowledge

**Primary use case:** find a thought from a book months after reading it.  
**Screens:** note editor, quote capture, notebook, topic connections and review queue.

| ID | Priority | Requirement |
| --- | --- | --- |
| NOT-01 | P1 | Create private notes, quotes, reviews and chapter reflections linked to work/edition and page/position |
| NOT-02 | P1 | OCR a selected page/quote, retain the image if requested, and let the user correct text |
| NOT-03 | P1 | Add tags, attachments, highlights and links between related notes/books |
| NOT-04 | P1 | Search notebooks and export Markdown/CSV with book and page references |
| NOT-05 | P1 | Generate a clearly labelled summary or recall questions from user-selected notes with source links |
| NOT-06 | P2 | Offer spaced review of selected ideas, flashcards and user-authored recall prompts |
| NOT-07 | P2 | Visualise topic relationships across owned books and notes; label suggested connections |

**Acceptance:** OCR text and AI paraphrases remain distinguishable from user-confirmed quotations. A generated quotation is never presented as a real passage. Notes can be excluded from cloud AI and from shared exports.

### M12 — Digital files and reading

**Primary use case:** attach a personal PDF and resume it offline without exposing its URL publicly.  
**Screens:** attachments, downloads, PDF reader, storage management; later EPUB/audio views.

| ID | Priority | Requirement |
| --- | --- | --- |
| DIG-01 | P0 | Keep receipts, photographs and book files private; record media type, size, checksum and attachment purpose |
| DIG-02 | P0 | View attached PDFs and remember last page; reopen with an installed reader when appropriate |
| DIG-03 | P1 | Choose files to download offline; expose pending/failed/available states and storage usage |
| DIG-04 | P1 | Add PDF bookmarks, annotations and text search; distinguish digital page number from printed page label |
| DIG-05 | P1 | Read user-imported DRM-free EPUB with font/theme controls, contents and location-based bookmarks |
| DIG-06 | P1 | Link external ebook/audiobook locations without implying those services provide automatic progress sync |
| DIG-07 | P2 | Play user-imported audio with chapters, sleep timer, bookmarks and Android media controls |

**Acceptance:** metadata remains visible when a file has not been downloaded. Removing a local download does not delete the library record or cloud original. Encrypted/DRM files receive a clear unsupported-format path; universal ebook importing is not promised.

### M13 — Wishlist, shopping and budget

**Primary use case:** scan a book in a store and decide whether buying it adds value to your collection.  
**Screens:** wishlist, shop-check result, budget, price observations, missing volumes.

| ID | Priority | Requirement |
| --- | --- | --- |
| BUY-01 | P0 | Maintain wishlist entries without counting them as owned copies; record priority and reason |
| BUY-02 | P0 | On scan, show owned editions/copies, condition, reading status and any active loan |
| BUY-03 | P1 | Compare available editions, translations, formats and series gaps using verified metadata |
| BUY-04 | P1 | Track personal book budget by period with optional spending reminders |
| BUY-05 | P1 | Store manually entered or supported-provider offers with retailer, edition, currency and timestamp |
| BUY-06 | P1 | Alert on a target price when a supported feed is available; show stale data explicitly |
| BUY-07 | P1 | Convert wishlist → order → received copy, linking the acquisition and invoice |
| BUY-08 | P2 | Share a private gift wishlist with optional reservation to avoid duplicate gifts |

**Acceptance:** “already owned” still appears when that book is loaned out. An observed sale price never overwrites the amount paid. Shopping assistance can recommend reading or borrowing an existing copy instead of another purchase.

### M14 — AI librarian and assisted entry

**Primary use case:** ask practical questions and obtain answers grounded in your records.  
**Screens:** ask library, structured answer cards, evidence view, proposed-change review, AI settings.

| ID | Priority | Requirement |
| --- | --- | --- |
| AIL-01 | P1 | Answer catalogue questions using approved structured queries and link to matching records |
| AIL-02 | P1 | Answer “where is this book?” and “who has my copy?” from the location/loan ledger |
| AIL-03 | P1 | Assist receipt parsing, metadata cleanup and category suggestions without silent writes |
| AIL-04 | P1 | Distinguish facts from inferred suggestions; show unavailable or insufficient evidence plainly |
| AIL-05 | P1 | Preview proposed mutations, require user confirmation and keep undo/ledger history |
| AIL-06 | P1 | Let users choose whether catalogue metadata, notes, receipts or selected book excerpts can leave the device |
| AIL-07 | P1 | Expose AI usage limits, retry/cancel and cost controls; preserve non-AI alternatives |
| AIL-08 | P2 | Accept voice instructions, read the interpreted command back, and resolve ambiguous copy/person names |
| AIL-09 | P2 | Answer questions over authorised full-text material with page/section citations and spoiler boundaries |

**Acceptance:** “Which books has Rahul not returned?” produces linked loan records. “Move my books to shelf C” asks which books if ambiguous and previews the move. Exact financial totals come from the ledger calculator, not generated arithmetic.

### M15 — Recommendations and reading plans

**Primary use case:** choose something suitable that you already own and can access tonight.  
**Screens:** discover, read from my shelves, recommendation detail, taste settings and reading plan.

| ID | Priority | Requirement |
| --- | --- | --- |
| REC-01 | P1 | Separate “read what I own,” “continue a series,” and “discover something new” modes |
| REC-02 | P1 | Filter by availability, language, format, length, mood, topics and explicit exclusions |
| REC-03 | P1 | Learn from ratings, finished/DNF books and explicit feedback; allow preference reset |
| REC-04 | P1 | Explain each suggestion using actual user preferences and metadata, with confidence/unknowns |
| REC-05 | P1 | Show copy location or borrower, estimated reading commitment, and a next action |
| REC-06 | P1 | Offer useful cold-start suggestions from user choices and simple rules before enough reading history exists |
| REC-07 | P1 | Provide “more like this,” “less like this,” “already read,” “not now,” and “never suggest” controls |
| REC-08 | P1 | Create an editable reading path for a topic using owned books first, identifying prerequisites and missing coverage |
| REC-09 | P2 | Balance familiar and exploratory picks and evaluate whether suggestions lead to satisfying reads |

**Acceptance:** owned-and-available mode excludes wishlist-only entries and unavailable copies unless the user changes that filter. Recommendations identify real catalogue/provider records; the model cannot invent a title and present it as verified.

### M16 — Reports and analytics

**Primary use case:** understand the collection, spending and lending using complete, explainable totals.  
**Screens:** overview, inventory report, spending, lending, reading, export report.

| ID | Priority | Requirement |
| --- | --- | --- |
| REP-01 | P0 | Distinguish works, editions, physical copies, digital holdings, borrowed items and wishlist counts |
| REP-02 | P0 | Report owned/available/lent/missing/unlocated inventory by shelf, category, format and language |
| REP-03 | P0 | Report active/overdue loans and borrower history from the full library |
| REP-04 | P1 | Report spending by period/seller/category, refunds and unreconciled invoices with currency-aware totals |
| REP-05 | P1 | Report reading completions, rereads, DNF, time, pages and goals without mixing unlike units |
| REP-06 | P1 | Generate annual reading summary, shelf audit sheet and book/person ledger PDF/CSV |
| REP-07 | P1 | Create a possession-evidence pack with selected copy photos, receipt references and declared values |
| REP-08 | P2 | Suggest neglected books, possible duplicates and low-confidence catalogue records for owner review |

**Acceptance:** each chart drills down to the exact records counted and states its scope. Replacement estimates are labelled estimates, not guaranteed resale values or insurer valuations.

### M17 — Native Android experience

**Primary use case:** perform library tasks from the camera, home screen, notifications and Android sharing.  
**Screens:** widgets, notification preferences, incoming share review, quick actions, adaptive phone/tablet UI.

| ID | Priority | Requirement |
| --- | --- | --- |
| AND-01 | P0 | Provide native camera control, haptics, system file/photo pickers and reliable Android back navigation |
| AND-02 | P0 | Support system light/dark mode, large text, screen readers and accessible touch targets |
| AND-03 | P0 | Show loan/reading reminders locally with configurable quiet hours and an in-app reminder inbox |
| AND-04 | P1 | Add home-screen widgets for current read, due loans and quick ISBN scan |
| AND-05 | P1 | Offer launcher shortcuts: scan, add book, lend/return and resume reading |
| AND-06 | P1 | Receive shared PDFs/images/text/links and send selected book cards/reports through the system share sheet |
| AND-07 | P1 | Use background jobs for eligible sync/uploads with progress, retry, battery/network constraints and cancellation |
| AND-08 | P1 | Support biometric app unlock with device-credential fallback |
| AND-09 | P1 | Adapt to tablets/foldables, landscape, keyboard entry and interrupted capture sessions |
| AND-10 | P2 | Optional NFC shelf tags and tested external barcode-scanner input |

**Acceptance:** denying notification permission leaves all due items in the in-app inbox. Widget actions open the relevant copy/loan rather than a generic home screen. App lock does not expose borrower details in lock-screen notifications by default.

### M18 — Offline, synchronisation and recovery

**Primary use case:** use the app in a bookstore with no signal and safely change phones later.  
**Screens:** sync status, pending changes, conflict resolution, backup, restore preview, storage.

| ID | Priority | Requirement |
| --- | --- | --- |
| SYN-01 | P0 | Keep the complete personal catalogue, search indexes, essential locations, loans and ledger locally |
| SYN-02 | P0 | Save edits and queued operations durably before showing success; expose pending/failed/synced status |
| SYN-03 | P0 | Support optional account sync with authenticated per-record access and incremental updates |
| SYN-04 | P0 | Retry safely using operation IDs; merge non-conflicting edits and surface important conflicts |
| SYN-05 | P0 | Export a versioned full backup with records, relationships, events, files and a checksum manifest |
| SYN-06 | P0 | Restore with preview, validation and clear replace/import choices; report omitted/missing files |
| SYN-07 | P0 | Export useful CSV plus complete JSON; never depend on currently displayed/filtered rows for full export |
| SYN-08 | P1 | Offer encrypted scheduled backups, rotation and user-selected destination |
| SYN-09 | P1 | Revoke devices, recover accounts and explain the recovery requirements of encrypted backups |

**Acceptance:** airplane-mode edits survive a restart. Retrying an invoice upload creates one attachment. A restore round trip retains two identical copies, their separate loans, and the correct invoice allocations. Sync is not a substitute for a restorable backup.

### M19 — Privacy, sharing and household roles

**Primary use case:** let a family member browse books without exposing invoices or private notes.  
**Screens:** app lock, privacy controls, members, share preview, device sessions, data deletion.

| ID | Priority | Requirement |
| --- | --- | --- |
| PRV-01 | P0 | Make libraries private by default and enforce authorisation server-side for every record and attachment |
| PRV-02 | P0 | Store authentication secrets securely; avoid sensitive data in application logs and notifications |
| PRV-03 | P0 | Offer full data export and deliberate deletion, including attachments and derived AI indexes |
| PRV-04 | P1 | Separate shareable catalogue fields from private location, borrower, invoice and note fields |
| PRV-05 | P1 | Provide a preview of exactly what a share card, public link or report includes |
| PRV-06 | P2 | Add owner, editor and viewer roles with separate permission to see finances and contact details |
| PRV-07 | P2 | Create revocable/expiring collection links and borrowing requests without exposing the whole library |

**Acceptance:** hiding a price in the interface also excludes it from the corresponding shared API response. Someone viewing a borrower link cannot change its URL to access another person's ledger.

### M20 — Care, rules and collection stewardship

**Primary use case:** maintain the physical collection over years, including moves, repairs and disposal.  
**Screens:** care reminders, condition history, automation rules, donation/sale review.

| ID | Priority | Requirement |
| --- | --- | --- |
| CAR-01 | P1 | Record condition changes, repairs, repair cost, photographs and service provider |
| CAR-02 | P1 | Create reminders for shelf audit, repair follow-up and manually chosen maintenance tasks |
| CAR-03 | P1 | Record donation, sale, gift and loss with recipient/proceeds where relevant; keep provenance |
| CAR-04 | P1 | Run simple opt-in rules such as “new scanned books start in Incoming shelf” |
| CAR-05 | P2 | Suggest duplicate/unwanted copies for review using owner preferences; never dispose automatically |
| CAR-06 | P2 | Generate packing, handover or succession inventories with selected private details removed |

**Acceptance:** a sold copy stops counting as owned but remains visible in historical spending and ownership records. A bulk rule shows its affected records before first application.

## 7. Complete user journeys and use cases

### UC-01 — Add a newly purchased book by ISBN

**Actor and trigger:** owner taps Scan after buying a book.  
**Precondition:** camera access, or typed-ISBN fallback.

1. Recognise and validate the ISBN; suppress repeated frames.
2. Search the complete local catalogue for the edition and existing copies.
3. Fetch candidate metadata when online; show cover, language, publisher and format for confirmation.
4. Choose add first copy, add another copy, or attach to an existing acquisition.
5. Set a shelf now or leave it explicitly Unassigned; optionally attach a receipt.
6. Save the copy and acquisition/placement events atomically.

**Exceptions:** invalid barcode, unknown ISBN, wrong edition, camera denied or no connection all lead to an editable draft.  
**Success:** one deliberate scan becomes one identifiable copy, with no invented metadata. **Features:** CAP-01–08, CAT-01–04, LOC-01–03, FIN-01.

### UC-02 — Catalogue an entire shelf

**Actor and trigger:** owner chooses batch scan and destination shelf. Scan successive books; apply the same location/category defaults; preserve every queued result. Review ambiguous matches and intentional duplicate copies, then commit the batch. The app resumes the queue after a phone call or process restart. A failed provider request does not stop the remaining scans. **Success:** each copy is assigned once and unresolved entries remain in a visible review queue. **Features:** CAP-02–08, SYN-01–04.

### UC-03 — Add an old book without ISBN

Enter a title, optionally author/year, and photograph the cover or title page. Create a manual edition and copy accession; metadata can remain unknown. Later lookup proposes enrichment without overwriting user corrections. **Success:** the item can be shelved, loaned and exported even if no public database recognises it. **Features:** CAP-07, CAT-01–05, CAT-09.

### UC-04 — Record one invoice for several books

Import or photograph the receipt. Review seller/date/currency/total; match lines to scanned copies. Choose how to allocate shipping or shared discount and reconcile totals. Save the document once, linking every affected copy. Unmatched stationery or other purchases remain non-book/unallocated lines rather than being forced into book costs. **Success:** both the invoice page and every book page expose the same traceable allocation. **Features:** FIN-02–08, LED-01–05.

### UC-05 — Partially return an order

Open an acquisition with three received books; select the returned copy, reason, date and expected refund. Mark the copy as returned to seller and record the eventual refund separately. Preserve the original receipt and the other two copies. A replacement shipment gets its own copy linked to the replacement event. **Success:** net spending changes once; the original acquisition remains readable. **Features:** FIN-06, FIN-09–12, LED-04.

### UC-06 — Lend three books to one person

Select or create the person; scan individual copy labels or choose copies from the ISBN result. Set the loan date, optional due date, and condition notes. Confirm the batch. Create three copy-level loans linked by a batch ID; show due reminders to the owner. **Success:** the person page lists all three, with a separate return action for each. **Features:** LND-01–04, LND-07, LED-01.

### UC-07 — Renew, partly return and close a loan

Renew one book, retaining the old due date. Return two books from the batch, record condition, and choose their return shelf or Incoming tray. The remaining book stays active with the renewed date. If a book is reported returned but not received, preserve “return reported” until owner confirmation. **Success:** custody, availability and reminder schedules agree. **Features:** LND-05, LND-07, LND-11, LOC-02–04.

### UC-08 — Borrow a book from a friend

Create/select the lender and add a borrowed copy with due date. It appears in “Borrowed by me” and reading views, but not owned inventory or purchase totals. Return it and retain reading notes/history. **Success:** the app distinguishes what you owe from what others owe you. **Features:** LND-06, REA-01, REP-01.

### UC-09 — Find a book and move it

Search the title, open its available copies and inspect location/custody. Scan a new shelf label, select the exact copy, and confirm the move. Preserve home location unless the move is explicitly permanent. **Success:** the new location is immediately searchable offline and the previous location remains in the ledger. **Features:** LOC-01–05, SRC-01, LED-01–05.

### UC-10 — Audit a shelf or unpack moving boxes

Start an audit against a snapshot of expected copies. Scan observed copies, resolving same-ISBN ambiguity with copy labels/condition photos. Separate wrong shelf, known loan, missing and unknown items. Review differences; commit only confirmed moves/status changes. Resume after interruption. **Success:** an unreadable spine or missed scan does not automatically become a loss event. **Features:** LOC-05–08, LED-04, SYN-02.

### UC-11 — Manage a series and box set

Create a series and expected volume labels; add three member works and their editions/copies. Link a single box-set acquisition. Record an omnibus as covering multiple works when appropriate. Ask for missing volumes, excluding coverage already provided by the omnibus unless standalone editions are preferred. **Success:** completeness, owned-copy count and total spending use distinct rules and remain correct. **Features:** ORG-03–06, FIN-03–05, BUY-03.

### UC-12 — Avoid a duplicate purchase in a store

Scan the candidate in shop-check mode. The local app shows existing copies, other editions, read/DNF history and whether one is on loan. Compare a preferred translation or missing volume, optionally save a dated offer, then add to wishlist or decline. **Success:** no internet is needed to see your own holdings; external offers are marked unavailable when offline. **Features:** BUY-01–07, CAP-06, SYN-01.

### UC-13 — Ask what to read tonight

Choose owned-and-available mode, preferred language, mood and an estimated length/time constraint. The app first filters eligible books, then ranks them. Each suggestion explains the match, shows the shelf and offers Start reading, Save next, or feedback. **Success:** the app does not recommend a wishlist book as ready to read, and explains when no eligible match exists. **Features:** REC-01–07, AIL-01–04.

### UC-14 — Ask the library a factual question

Ask “Which books did I lend to Rahul last month that are still out?” Resolve duplicate contact names, translate the request into visible filters and query loans. Return linked records and the interpreted date range. **Success:** dates and names come from records, and “no matching records” is distinct from an AI/provider failure. **Features:** AIL-01–04, SRC-03, LED-03.

### UC-15 — Capture a quote and recall it later

Choose a book/edition, photograph a passage, correct OCR and confirm page number. Add a private note and topic tag. Later search a phrase or ask a question over allowed notes. **Success:** results cite the original saved note/page; generated interpretations are labelled and excluded if cloud processing is disabled. **Features:** NOT-01–05, AIL-06.

### UC-16 — Read offline and resume on another device

Download a private PDF/EPUB, start a reading attempt, record progress offline and close the app. On reconnect, sync the attempt and checkpoints; another device resumes from the accepted checkpoint. If both devices progressed independently, show the conflict rather than choosing an arbitrary page. **Success:** session history is retained even if the user chooses a different resume point. **Features:** DIG-02–05, REA-02–04, SYN-02–04.

### UC-17 — Recover after replacing the phone

Install the app; sign in for synced data or choose a backup file. Validate schema version, checksums and encryption credentials; preview record/file counts. Restore into an empty library or a deliberately chosen destination. **Success:** copies, invoice links, historical loans, notes and files are reconciled; unavailable attachments are listed. **Features:** SYN-05–09.

### UC-18 — Resolve conflicting offline loans

Two authorised devices, both offline, record different borrowers for the same copy. Each shows its action as pending reconciliation. On sync, the server accepts one consistent active-loan transition and retains the competing action in a conflict queue. The owner identifies who physically has the book and records a correction. **Success:** both actions remain explainable; the accepted state never has two active custodians. **Features:** LND-03, LED-04–05, SYN-04.

### UC-19 — Share a collection safely

Select a collection and preview the share content. Exclude private notes, invoice attachments, precise home locations and contact details unless deliberately included in a private export. Issue a revocable link or share card. **Success:** a viewer sees only authorised fields, including through direct API/file requests. **Features:** PRV-04–07, REP-06.

### UC-20 — Dispose of a book without losing its history

Choose donate, sell, gift or write off. Resolve any active loan first; record date, recipient/proceeds when relevant and reason. The copy leaves active owned inventory while its acquisition, reading and loan history remain. **Success:** a later ownership report accurately describes both the past and current collection. **Features:** CAT-06, CAR-03, LED-01–04.

## 8. Invoice and ledger rules in detail

### What to store

**Invoice header:** internal ID, seller, seller invoice number, order reference, document date, currency, original total, attachment IDs, entered/verified status and notes. Keep the seller's stated tax/fee amounts as recorded data; this app does not need to determine tax treatment.

**Invoice line:** description, optional ISBN, quantity, unit price, line discount, recorded tax/fees, line total and linked copies. A line can remain unmatched. One invoice can cover many copies; later repair or replacement documents can also reference an existing copy.

**Allocation:** the amount of a line or shared charge assigned to a copy, the allocation method, rounding adjustment and user override. The same fee must never be allocated twice.

**Payment/refund:** amount, currency, date, payment type, reference, direction and related acquisition. Inventory cost and cash paid are different when an invoice is unpaid or refunded later.

### Worked example

Three books cost INR 400, INR 600 and INR 1,000. The invoice has a shared INR 200 discount and INR 100 delivery charge, with no other recorded charges. Final total: **INR 1,900**.

| Copy | Item amount | Allocated discount | Allocated delivery | Allocated acquisition cost |
| --- | --- | --- | --- | --- |
| A | 400 | -40 | +20 | 380 |
| B | 600 | -60 | +30 | 570 |
| C | 1,000 | -100 | +50 | 950 |
| Total | 2,000 | -200 | +100 | 1,900 |

The example uses proportional allocation by original line amount. Manual or equal allocation can be offered, but the selected rule must be stored. Allocate rounding remainders deterministically so the sum equals the invoice total exactly.

If B is returned and the seller refunds INR 540, record a **separate INR 540 refund**. Historical invoice total remains INR 1,900; net cash outflow becomes INR 1,360, assuming the original invoice was fully paid. Do not rewrite B's historical allocated cost to 30 or pretend that the remaining books cost only 1,330. Reports can separately explain retained-copy allocated cost, refund amount and non-recovered cost.

### Example copy timeline

| Date | Event | Result |
| --- | --- | --- |
| 03 Oct | Acquired copy `BK-0042`; linked invoice line | Owned; purchase evidence attached |
| 03 Oct | Placed in Study / B / Shelf 3 | Home and current location confirmed |
| 10 Oct | Lent to Rahul; due 24 Oct | Custody changes; home shelf retained |
| 22 Oct | Renewed until 31 Oct | Original and new due dates retained |
| 30 Oct | Returned with a condition note | Loan closed; Incoming tray selected |
| 31 Oct | Moved to Study / B / Shelf 3 | Available on its home shelf |

Every event carries its own ID and recorded timestamp. A correction refers to the original event. Event history should be append-oriented, while legally or personally requested deletion follows the app's explicit data-retention policy; “audit trail” is not a promise that personal information can never be removed.

## 9. AI specification: useful, grounded and optional

### Three different kinds of AI work

1. **Extraction:** turn a receipt, cover, title page or spoken instruction into suggested structured fields.
2. **Retrieval and explanation:** answer questions using catalogue/loan/location records or authorised notes.
3. **Recommendation:** rank eligible books for a reading need and explain the choice.

Treat these as separate services with independent opt-ins, evaluation and budgets. A failure in one must not disable the catalogue.

### Recommendation pipeline

**Step 1 — Choose intent.** Read an owned book, continue a series, learn a topic, choose a short read, or discover a new purchase.

**Step 2 — Apply hard constraints deterministically.** Library/account, ownership, availability, language, format, explicit exclusions, series prerequisites and user-defined length constraints. Uncertain metadata must not silently satisfy an exact requirement.

**Step 3 — Build candidates.** Use owned unread/paused books for shelf mode; use permitted external metadata sources for discovery. Resolve candidates to actual work/edition IDs before presenting them.

**Step 4 — Rank.** Start with transparent rules using explicit interests, ratings, DNF reasons, topic/mood metadata and recent repetition. Add semantic ranking when useful. Do not assume that owning a gift or buying an unread book proves the reader enjoyed it.

**Step 5 — Explain.** Example: “Matches your history preference, is under your chosen page limit, and your paperback is available on Study B3.” Each factual clause must be supported by a stored field. Avoid made-up confidence percentages.

**Step 6 — Learn carefully.** Capture accepted, dismissed, started, finished and rated outcomes. Explain why a recommendation was shown and offer preference reset. A user declining one lengthy book is not sufficient evidence that they dislike its author.

**Offline fallback:** rank local candidates with rules and previously calculated tags; label stale availability if another device may have changed it. Do not promise full cloud-model chat offline.

### Assistant controls

| Request | Allowed handling | Required evidence/control |
| --- | --- | --- |
| “Who has this book?” | Query exact active loans and selected copy | Copy/person links and last sync information |
| “How much did I spend in September?” | Use financial report calculation | Date basis, currency, payments/refunds and included records |
| “Categorise these twenty books” | Propose a batch of category changes | Reviewable before/after list; explicit Apply |
| “Remind Rahul” | Draft a message | Selected loan/person; owner chooses share/send |
| “Move all history books to B2” | Propose a filtered move operation | Show copies, exclusions and destination; confirm |
| “Summarise chapter 4” | Use available authorised text/notes | Page/chapter citations; say when source text is unavailable |
| “Tell me about the ending” | Respect chosen spoiler preference | Avoid claiming reliable spoiler protection from chapter labels alone |

Protect the assistant's tool boundary: imported metadata, PDFs and notes are data, not instructions that can authorise actions. Restrict accessible records to the current user, validate tool parameters and run permissions outside the model. AI must not autonomously delete records, change money, close loans, or send messages.

### AI acceptance and cost targets

- All displayed recommended books resolve to an existing catalogue/provider record.
- Exact amounts and counts come from database queries/calculators.
- Changes are proposed before being applied; rejected suggestions leave data unchanged.
- Receipt extraction is evaluated at field and line level, including totals that do not reconcile.
- User-confirmed fields are protected from later model overwrites.
- Show cloud processing choices for metadata, receipts, notes and selected full text separately.
- Rate-limit expensive vision tasks, cache unchanged results, allow cancellation and set a configurable monthly usage budget.
- Maintain a small evaluation set of your actual genres/languages, ambiguous names, old books, duplicate copies and unclear receipts. No accuracy percentage is promised before testing that set.

## 10. Distinctive feature opportunities

These are **candidate differentiators**, not claims that nobody anywhere offers them. Research confirms overlap for recommendations, OCR and shelf scanning. The less-verified opportunity is combining them with accurate purchase and custody records in a personal Android workflow.

| Idea | Concrete experience | Why it could stand out | Dependency and validation |
| --- | --- | --- | --- |
| **Receipt-to-shelf intake** | Import a receipt, scan the delivered books, match quantities, assign shelves and show unreceived items | Connects money, exact copies and placement in one session | FIN + CAP + LOC; test book fairs, multi-item bills and partial deliveries |
| **Lifetime book passport** | One timeline from purchase/gift through moves, loans, repairs and disposal, with supporting documents | Makes “the whole ledger” understandable per copy | CAT + LED; test whether users can reconstruct an old loan without searching several screens |
| **Explainable shelf audit** | Show expected versus observed shelf contents and explain absences using loans/moves | Reconciliation goes beyond merely detecting book titles | LOC + LND; start with copy QR scans, validate image recognition separately |
| **Physical/digital/series-aware duplicate advice** | “You own this story in an omnibus; this is a different translation; your other copy is lent” | Avoids a simplistic yes/no duplicate warning | Edition and containment relationships; review tricky series examples |
| **Available-copy reading concierge** | Suggest an appropriate owned book and show where to fetch it, or why it is unavailable | Makes a recommendation immediately actionable | REC + location/custody; owned recommendations already exist elsewhere |
| **Moving-house reconciliation** | Scan books into numbered boxes, print manifests, track delivery and restore shelf assignments | Serves a difficult event in a collector's life | LOC + LED; test a real move or small packing rehearsal |
| **Grounded learning path** | Build a study sequence from owned books and personal notes, identifying knowledge gaps and available copies | Combines study planning with the library you actually possess | REC + NOT; validate prerequisite suggestions and source coverage |
| **Library completeness assistant** | Find missing set volumes, missing receipts, unassigned locations and uncertain editions | Helps improve the quality of the entire collection | ORG + FIN + metadata provenance; avoid treating unknown values as errors |
| **Condition-aware lending handover** | Compare checkout and return photos and let the owner describe a change | Adds evidence to the custody history | Photos + loans; no automated accusation or damage certainty |
| **Family handover pack** | Export inventory, shelf instructions, provenance and selected financial evidence | Useful for long-term stewardship and inheritance planning | Backups + selective sharing; owner chooses all included personal details |

**Best initial differentiator to build:** receipt-to-shelf intake plus the lifetime book passport. Both directly serve your stated needs and can be implemented with reliable structured workflows. Treat automatic shelf-photo reconciliation as an experiment after barcode-based auditing works.

## 11. Mobile navigation and screen inventory

Use five primary destinations: **Home, Library, Scan/Add, Activity, Discover**. Keep reading shortcuts on Home and book pages. Activity contains Loans, Ledger, Purchases and Reminders, making custody and invoices easy to reach. Settings and advanced managers can live behind the profile/menu.

| Area | Screens and main actions |
| --- | --- |
| Home | Continue reading, due loans, recent additions, unresolved scans/invoices, quick search and scan |
| Library | Grid/list, filters, collections, categories, authors, series, volumes, shelves and bulk selection |
| Book detail | Overview, editions/copies, reading, notes, files and history; prominent Locate, Lend, Read and Edit |
| Scan/Add | ISBN, batch, manual, cover/title-page image, receipt import and incoming shared file |
| Activity | Active/returned/borrowed loans, contacts, purchases/invoices, chronological ledger and reminder inbox |
| Discover | Read my shelves, continue a series, new discoveries, learning paths, AI assistant and feedback |
| Managers | Location tree, category editor, series/set editor, custom fields, audit sessions, reports |
| Settings | Profile/library, permissions, defaults, notifications, AI data controls, devices, sync, backup/restore |

**Interaction rules:** advanced fields stay collapsed until needed; batch operations show affected-copy counts; long-running work has progress/cancel/retry; edits save drafts; destructive actions provide a clear consequence and recovery path where possible. Empty states offer useful first actions. Every screen needs loading, empty, error, offline, permission-denied and interrupted-operation behavior where applicable.

**Book detail hierarchy:** title/author → selected edition → selected copy → availability/location → primary actions. Secondary metadata must not hide the answer to “where is my book?”

## 12. Offline behavior and conflict policy

| Capability | Offline promise | Reconnection behavior |
| --- | --- | --- |
| Catalogue/search/filters | Complete locally downloaded library available | Apply incremental updates |
| ISBN barcode recognition | Capture identifiers and check local duplicates | Enrich unresolved metadata |
| New external book lookup | Explain unavailable service; allow manual draft | Resume with provider limits/backoff |
| Add/edit/move/lend/return | Save durable local operations; pending reconciliation visible | Validate invariants and resolve conflicts |
| Invoice capture | Save images and manually entered fields; local OCR when available | Upload and optionally run allowed cloud extraction |
| Financial totals | Calculate from local data; show last sync scope | Recalculate from reconciled transactions |
| PDF/EPUB | Read downloaded supported files | Sync notes/progress; handle diverging checkpoints |
| Recommendations | Local rules and cached metadata | Refresh model ranking/candidates |
| Cloud assistant/shelf vision | Clearly unavailable or queued with consent | Resume only still-relevant requested work |
| Reminders | Local due reminders and in-app inbox | Reconcile changed/cancelled loans and deduplicate |
| Backup/export | Export all available local records/files; identify uncached files | Offer a complete online backup when missing files are fetched |

**Conflict rules:** merge edits to different fields where safe. Preserve competing changes to the same important field for review. Append reading sessions and ledger events using operation IDs. Reconcile current page rather than discarding reading history. Reject a second accepted active loan for the same copy; retain the rejected action as a visible conflict. Financial corrections use new events. Deletion/archive markers must sync so old devices cannot resurrect removed records silently.

An offline device cannot know that another offline device just lent the same book. The product promise is clear pending states and correct reconciliation, not impossible instantaneous global consistency.

## 13. Proposed data model and invariants

This is a conceptual model for planning, not a final schema or mandate to create every table in the first sprint.

| Entity group | Main records and relationships |
| --- | --- |
| Identity | Library, User/Profile, optional Membership, Device, Preferences |
| Bibliography | Work, Contributor, WorkContributor, Edition, ExternalIdentifier, MetadataProvenance |
| Holdings | Copy/Holding → Edition; CopyConditionEvent; OwnershipEvent; private Attachment |
| Organisation | Category tree, Tag, Collection, memberships, Series, SeriesMembership, Volume/Part relationship |
| Sets | SetDefinition and member works/editions; physical SetInstance and its copies; omnibus contents |
| Places | Location tree, CopyPlacement, MoveEvent, AuditSession, AuditObservation, BoxManifest |
| Acquisition | Seller/Contact, Acquisition/Order, Invoice, InvoiceLine, CopyAllocation, Payment, Refund |
| Circulation | Contact, LoanBatch, Loan → Copy + Contact, Renewal, ReturnEvent, optional Hold |
| Reading | Reader, ReadingAttempt → Work/Edition, Session, ProgressCheckpoint, Rating/Review |
| Knowledge | Note, Quote, Annotation, TopicLink, optional RecallItem |
| Discovery | WishlistEntry, OfferObservation, Recommendation, RecommendationFeedback, ReadingPlan |
| System | LedgerEvent, Reminder, SyncOperation, Conflict, BackupManifest, ImportBatch, optional ShareGrant |

Key relationships: **Work → Editions → Copies**; **Invoice → Lines → Copy allocations**; **Copy → Loans → Renewals/return**; **Copy → Placement history and ledger**; **Reader + Work → Reading attempts**. A work can appear in multiple series and an omnibus edition can contain multiple works; avoid forcing every relationship into a one-to-many tree.

### Non-negotiable invariants

1. Copy accession is unique within a library; ISBN is not a copy primary key.
2. At most one accepted active outbound loan exists per copy.
3. A physical copy has one current accepted custody/location state, with its home shelf recorded separately.
4. Wishlist entries and ordered-but-unreceived books do not inflate owned-copy totals.
5. Unknown values are nullable/explicit; unknown price is not zero and unknown language is not English.
6. Money uses exact decimal arithmetic or currency minor units with a currency code; no floating-point totals.
7. Multi-currency totals are kept separate unless a dated conversion basis is explicitly selected.
8. Invoice allocations reconcile; non-book amounts and rounding are visible.
9. Financial/refund/movement/loan changes are atomic with their corresponding ledger events.
10. User-confirmed metadata is never silently overwritten by a provider or AI refresh.
11. Date-only due dates are interpreted in the library timezone and become overdue after that local date ends. Event instants use unambiguous timestamps; approximate historical dates retain their precision.
12. Series order is not restricted to integers. Volume labels and display order are separate.
13. Every synced mutation is idempotent, versioned and scoped to an authorised library.
14. Archive, merge, trash and permanent deletion have different behavior; history references remain valid or are explicitly redacted.
15. Work/edition/copy counts, spending, and reading completions are distinct measurements with defined report rules.

## 14. Flutter and Android implementation direction

Use Flutter for the application interface and business workflows, with Android platform integration where required. This is a real installed mobile application with local storage and device capabilities; avoid making core flows dependent on embedded web pages.

### Proposed boundaries

| Layer | Responsibility |
| --- | --- |
| Flutter screens/view models | Navigation, forms, scanner state, lists, accessibility and user feedback |
| Domain services | ISBN validation, copy identity, circulation transitions, invoice allocation, reading rules |
| Repositories | Present consistent local data and coordinate durable writes/sync |
| Local relational database | Catalogue, loans, invoices, ledger, outbox and indexed search |
| Native/platform adapters | Camera/barcodes, OCR, files, notifications, background jobs, secure storage and widgets |
| Authenticated backend API | Authorisation, sync validation, canonical records, metadata proxy and controlled AI requests |
| Private object storage | Receipt images, covers, condition photos, ebooks and backup files |

Flutter's official guidance describes repositories combining local and remote sources for offline-first applications. Use that as a foundation; the event/outbox and conflict rules here are additional product-specific design decisions. [Flutter offline-first guide](https://docs.flutter.dev/app-architecture/design-patterns/offline-first).

A relational local database is a sensible default because invoices, copies, loans and history have strong relationships. Evaluate the currently maintained Flutter SQLite abstraction and state-management/navigation packages during implementation rather than treating a research document as a fixed package lockfile. Keep platform-specific APIs behind small adapters so iOS can be added later.

### Native capability requirements

- **Scanning:** use an on-device barcode engine through a maintained Flutter integration or platform channel. Google's ML Kit supports formats including EAN-13 and QR and runs scanning on device. Separate recognition from network metadata retrieval. [ML Kit barcode scanning](https://developers.google.com/ml-kit/vision/barcode-scanning).
- **OCR:** test scripts actually present in your collection. ML Kit documents Latin, Devanagari, Chinese, Japanese and Korean text recognition; that is not a promise of coverage for every Indian language or difficult spine. Package/download the needed models and expose readiness. [ML Kit text recognition](https://developers.google.com/ml-kit/vision/text-recognition/v2).
- **Background work:** schedule eligible sync/upload jobs with Android-aware persistent work, and offer foreground retry. Background timing is not guaranteed by a simple Dart timer. [Android persistent work](https://developer.android.com/develop/background-work/background-tasks/persistent).
- **Notifications:** handle Android's notification runtime permission where applicable and maintain an in-app fallback. Ask when the owner enables reminders. [Android notification permission](https://developer.android.com/develop/ui/compose/notifications/notification-permission).
- **Timer reliability:** persist start/pause checkpoints; calculate elapsed time from timestamps/appropriate device clocks rather than assuming background ticks always run.
- **Widgets/files/lock:** use platform integrations; test process death, denied permissions, restricted background activity, unavailable document providers and device authentication changes.

### Backend reuse

The existing Prisma/PostgreSQL system is a possible starting point. Introduce a stable authenticated JSON API for mobile operations and sync; do not make Flutter depend on the internal calling conventions of existing web Server Actions. The web frontend can adopt the same domain rules and API over time.

A single backend plus a job worker is sufficient initially. Dedicated microservices, a separate vector database, and self-hosted language models are optional scale decisions, not prerequisites for a personal app.

## 15. External data and integration plan

| Integration | Intended use | Conditions/fallback |
| --- | --- | --- |
| Google Books | ISBN/title discovery and candidate metadata | Store provider ID/source; verify edition; respect quota and permitted use; manual entry on failure |
| Open Library | Secondary work/edition/cover lookup | Respect published rate limits, identify requests when required, cache appropriately and avoid bulk harvesting |
| Cloud AI provider | Optional structured extraction, natural-language interpretation and ranking explanations | Server-controlled credentials, scoped data, budget limits, timeouts and non-AI fallback |
| Android share/file providers | Incoming receipts, images, text, PDFs and outgoing exports | User-selected files and explicit destinations |
| Cloud backup provider | Optional selected backup destination | Export file first; authenticate only when enabled; handle revoked access |
| Retailer/price provider | Edition-specific offer observations | Use a supported integration or manual links; do not make arbitrary scraping a core dependency |
| Existing web app | Initial migration and future shared library | Versioned API/export contract and consistent ownership rules |
| Third-party reading apps | CSV migration and user-controlled exports | No blanket promise of live Goodreads/Kindle/StoryGraph sync without verified API access |

Google Books documents public-data access and volume searching, including ISBN-qualified queries. Metadata search is not evidence that an entire book's text is available. [Google Books API guide](https://developers.google.com/books/docs/v1/using).

Open Library publishes API usage guidance and limits, including an explicit distinction between ordinary lookups and bulk downloading. Build provider-specific throttling and handle unavailable/incorrect records. [Open Library API policy](https://openlibrary.org/developers/api).

**Metadata merge policy:** preserve original provider response/reference as allowed; store chosen field value, source, retrieval date and whether the owner edited it. Conflicting cover/format/language data goes to review. Do not infer an edition merely because two books have the same title. Do not copy a public description into a claim that the owner has read or endorsed it.

## 16. Migration from the current web app

1. **Create a trustworthy source snapshot.** Export all database records and referenced files, independent of pagination. Preserve the original export and record counts. Do not rely on the current visible-list export as a complete backup.
2. **Build an import mapping and dry run.** Show proposed works, editions, copies, contacts, loans, attachments and unresolved cases before modifying the target.
3. **Preserve legacy IDs.** Keep original work/copy IDs in mapping records so migration can be retried without duplicates.
4. **Split metadata cautiously.** Turn existing work-level ISBN/publication/format information into edition candidates; create multiple editions where necessary. Do not auto-merge uncertain editions.
5. **Normalise organisation.** Convert genre, tags, collections and series values. Preserve original free-text `volume` and `shelfLocation`; suggest structured mappings for approval rather than losing their meaning.
6. **Separate states.** Migrate explicit loans into custody, reading values into reading attempts, and wishlist status into wishlist entries. Ambiguous `purchased=false` items need review; do not assume they are borrowed or unowned.
7. **Migrate history.** Expand JSON loans/sessions/quotes into related records with stable import IDs. Preserve notes and source timestamps, including missing/approximate dates.
8. **Handle finance honestly.** Map purchase/invested amounts as legacy reported values. Where currency, seller or receipt is absent, mark it unknown. Do not fabricate invoices. Flag amounts potentially overwritten by offer-price refresh.
9. **Secure and reconcile files.** Copy existing PDFs and selected images into private storage; validate checksums and list missing references. Avoid embedding machine-specific public paths in mobile records.
10. **Reconcile totals and relationships.** Compare source and destination works/copies/loans/sessions/attachments; explain deliberate changes such as wishlist separation. Spot-check edge cases.
11. **Perform a restore rehearsal.** Export the migrated library, restore to a clean test library and compare records/files.
12. **Cut over deliberately.** Either freeze edits briefly for a final delta import or implement change tracking. Retain rollback data until the mobile app and web companion agree.

Existing source integration mismatches should be resolved and runtime-tested before production migration. Migration success is preserving real user data and meaning, not merely importing without an exception.

## 17. Delivery sequence and release gates

Avoid promising dates before the developer/team, backend choice and desired polish are known. The following phases define usable outcomes and dependencies.

| Phase | Deliverable | Release gate |
| --- | --- | --- |
| **A — Trusted foundation** | Local catalogue, work/edition/copy model, manual/ISBN entry, categories/volumes, basic locations, import/export, private files and backup | Catalogue survives restart/offline; migration dry run and restore pass |
| **B — Complete personal operations** | Invoices/manual allocations, contacts, lending/borrowing, renewals, returns, unified ledger, baseline reading and reports, authenticated optional sync | UC-01–12, UC-16–18, UC-20 and all financial/custody invariants pass |
| **C — Advanced daily app** | Receipt OCR, QR labels/audits, native widgets/sharing, notes, recommendations, AI factual search, personalised goals and richer reports | Grounded AI evaluation, receipt reconciliation and Android device checks pass |
| **D — Expanded formats and collaboration** | EPUB polish, richer series/omnibus handling, household roles, controlled links, moving workflows and learning plans | Privacy, permission, offline and restore checks cover added modules |
| **E — Experiments** | Shelf-photo recognition/reconciliation, visual shelf planning, optional NFC/audio player and advanced knowledge tools | Demonstrated accuracy/usefulness on your collection; manual fallback maintained |

**First release you can trust daily:** phases A and B. **First complete release matching your requested advanced AI vision:** phases A through C, with all explicitly required category/volume, invoice, location and lending capabilities already included. Some P1 features can move within C/D after sizing; no P0 integrity requirement should be deferred behind visual polish.

### Dependency notes

- Copy identity precedes loans, stocktakes and invoice allocation.
- The ledger precedes AI custody answers and book passports.
- A restorable local database precedes optional multi-device sync.
- A structured manual invoice flow precedes receipt OCR automation.
- Deterministic eligibility filtering precedes AI ranking.
- Reliable QR/barcode audits precede shelf-photo reconciliation.
- Authorisation and field privacy precede household sharing.

### Deliberately deferred scope

A public social feed, institutional cataloguing administration, payment collection, automated fines, universal retailer scraping, automatic reading progress from every ebook service, AR navigation and autonomous AI actions are not required for the personal-library product. Reconsider them only when a real use case justifies the added complexity.

## 18. Quality targets and acceptance checklist

These are proposed engineering targets to validate on a named mid-range Android reference device, not measured results from the current app. Use a representative fixture of 10,000 copies plus loans/invoices/history; retain support for larger libraries through pagination and indexed queries.

| Area | Target or invariant |
| --- | --- |
| Local search | Typical indexed results within 300 ms at the 95th percentile on the agreed fixture/device |
| App launch | Useful cached home/library content within 2 seconds at the 95th percentile on the reference device |
| Quick entry | A clean known-ISBN book can be reviewed/saved with minimal taps after recognition; provider delay is shown separately |
| Local durability | No acknowledged local save is lost after process termination/restart in fault tests |
| Sync | Repeated operations do not duplicate copies, payments, loans or events; conflicts remain visible |
| Ledger integrity | State changes and events commit together; every correction links to the corrected record |
| Invoice accuracy | Allocation totals reconcile exactly; currencies never silently mix |
| Backup | Restore reproduces expected IDs, links, histories and attachment checksums |
| Accessibility | Test TalkBack, large text, high contrast, focus order and one-handed primary actions |
| Privacy | Test unauthorised record/file access and sensitive fields excluded from share payloads |
| AI | Grounded record links, explicit uncertainty, no unconfirmed writes and verified recommendation identities |
| Battery/storage | Background work respects scheduling constraints; file size/cache use visible and controllable |

### Essential scenario checks

- ISBN-10 with X check digit; valid/invalid ISBN-13; unrelated retail barcode; unreadable/no barcode.
- Same title by different authors; translation; reprint; two copies of one edition; signed copy; no ISBN.
- Offline scan queue interrupted by reboot; camera denied; provider timeout; ambiguous match.
- Nested categories; custom volume labels; incomplete series; box set; omnibus overlap.
- Multi-book invoice; shared discount; rounding; unknown amount; mixed non-book lines; partial refund; missing file.
- Concurrent checkout; undated loan; renewed loan; partial return; lost copy; return to a temporary location.
- Borrowed book counted separately; gift owned at unknown cost; sold copy preserved historically.
- Due-date timezone boundary; daylight-saving/timezone change where relevant; past event entered today.
- Repeat import; rollback; paginated source export; older backup schema; corrupted attachment; encryption password unavailable.
- Note/receipt with instructions embedded in its text; assistant refuses to treat them as authority.
- Recommendation cold start; no eligible books; all matching books lent; DNF exclusions; uncertain mood metadata.
- Screen-reader navigation; 200% text scaling without losing primary actions; notification denial; process recreation.

### Product success measures

Track how quickly you add and later find a book, percentage of copies with confirmed locations, unmatched invoice lines, unresolved loans, successful restores, and whether recommendations lead to satisfying reads. Instrument these locally or with explicit opt-in. Do not optimise for daily app opens when the desired outcome is spending less time managing books.

## 19. Decisions to settle during implementation

These do not block the specification. The recommended defaults below make the first design coherent.

| Decision | Recommended starting point |
| --- | --- |
| One owner or household? | One owner first; preserve library/user boundaries for household later |
| Local-only or account required? | Local use first; optional account for cloud sync |
| Initial scale? | Validate at 10,000 copies; adjust to actual collection and target device |
| Meaning of existing “volume”? | Preserve raw value; support both collection grouping and numbered parts until mapped |
| File formats? | Private attachments/PDF first; DRM-free EPUB next; audio playback later |
| Currency and language? | Configurable currency; Unicode metadata; validate English and the owner's actual book languages |
| Reminder delivery? | Local notifications/in-app inbox first; intentional share-sheet reminders to borrowers |
| AI provider and budget? | Provider-independent service with opt-in scopes and a configurable spending ceiling |
| Sharing? | Private by default; selected collection exports before public/household features |
| Backend? | Assess reuse of current PostgreSQL/Prisma data with a new authenticated mobile API |
| Visual shelf ambition? | Structured locations and manual shelf photos first; automatic recognition behind an experimental flag |

## 20. Research sources and evidence notes

All sources below were accessed during research on **3 October 2026**. Product pages and store listings are publisher claims; they support documented availability, not measured quality. No competitor's full text is reproduced. Prices and ratings are intentionally not used to rank the proposed product.

### Product research

1. [CLZ Books Mobile](https://clz.com/books/mobile) — catalogue, purchase fields, locations, cloud and mobile/web relationship.
2. [CLZ staff: mobile loan operations](https://club.clz.com/t/checking-out-books/2265) — dated platform distinction, March 2024.
3. [CLZ platform discussion](https://club.clz.com/t/price-increase/4900) — additional dated web/mobile distinction, March 2025.
4. [Handy Library, Google Play](https://play.google.com/store/apps/details?hl=en_US&id=com.handylibrary.main) — Android feature and local-storage/backup claims.
5. [Libib plans](https://www.libib.com/pricing) — tier boundaries for catalogue/circulation/custom fields.
6. [Libib lending guide](https://support.libib.com/libib/website/lending.html) — circulation, patrons and history.
7. [LibraryThing overview](https://www.librarything.com/quickstart.php) — catalogue, imports, tags and recommendations.
8. [LibraryThing apps/TinyCat](https://chi.librarything.com/more) — mobile and adjacent catalogue services.
9. [The StoryGraph](https://www.thestorygraph.com/) — reading discovery, preferences, journal and statistics.
10. [My Library, Google Play](https://play.google.com/store/apps/details?hl=en-US&id=com.vgm.mylibrary) — barcode catalogue, wishlist and spreadsheet portability.
11. [Bookshelf publisher](https://bookshelfapp.info/) and [Android listing](https://play.google.com/store/apps/details?hl=en&id=com.bookshelf.prod) — identified product, catalogue/reading positioning.
12. [iCollect support](https://www.icollecteverything.com/support/) — ISBN OCR, AI capture and manual alternatives.
13. [Kimico BookBuddy](https://www.kimicoapps.com/bookbuddy) and [support](https://www.kimicoapps.com/support) — Apple catalogue/lending/export benchmark.
14. [Hylle, Apple App Store](https://apps.apple.com/us/app/hylle-ai-book-library/id6758072963) — shelf-photo capture and owned-library recommendation overlap.

### Implementation references

15. [Flutter offline-first guide](https://docs.flutter.dev/app-architecture/design-patterns/offline-first) — local/remote repositories and synchronisation considerations.
16. [ML Kit barcode scanning](https://developers.google.com/ml-kit/vision/barcode-scanning) — on-device recognition and supported formats.
17. [ML Kit text recognition](https://developers.google.com/ml-kit/vision/text-recognition/v2) — supported scripts and document text structure.
18. [Android persistent work](https://developer.android.com/develop/background-work/background-tasks/persistent) — background task scheduling.
19. [Android notification permission](https://developer.android.com/develop/ui/compose/notifications/notification-permission) — notification access and denied-permission handling.
20. [Google Books API](https://developers.google.com/books/docs/v1/using) — metadata queries, identifiers and access.
21. [Open Library APIs](https://openlibrary.org/developers/api) — metadata endpoints and usage limits.

### Local evidence and review boundary

The current-state assessment is based on the repository files listed in section 2, not its generic README alone. Existing local modifications were treated as part of the review snapshot. Database contents, live hosting, actual camera behavior, production permissions and competitor installations were not examined. Implementation proposals and differentiation ideas are recommendations derived from your requirements and the observed research, clearly separate from verified existing features.
