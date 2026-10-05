# TaleTeacup codebase audit — 5 October 2026

This report records the original audit baseline. Implementation has started; see [the fix log](audit-fixes-2026-10-05.md) and the State column in [the backlog](codebase-audit-backlog-2026-10-05.csv) for current progress.

The application builds successfully, but several advertised workflows do not persist correctly. The main priorities are access control and upload safety, repairing the save contracts, and separating complete-library operations from paginated browsing. Adding features before these fixes would extend the same data-integrity problems.

This report contains 36 findings, an implementation order, acceptance checks, and suggested features. The companion [CSV backlog](codebase-audit-backlog-2026-10-05.csv) turns the findings into tasks.

## Scope and evidence

- Reviewed the App Router entry points, both API routes, all three server actions, Prisma schema/config/client, client state and component wiring, forms, readers, analytics, imports/exports, shared filter definitions, configuration, dependencies, and project documentation.
- Baseline: commit `ded2d1b`; working tree was clean when the review began. Application code and database records were not changed during the audit.
- Versions: Next.js 16.3.5, React 19.2.8, Prisma CLI/client 5.22.0. Read the installed Next.js guides in `node_modules/next/dist/docs/`, including data security, lazy loading, Server/Client Components, and public files.
- Ran compilation, lint, schema validation, dependency audits, production-browser smoke checks, and isolated probes using the actual transpiled application functions with database/browser/filesystem stubs.
- Browser checks used a temporary local production server. No real upload, price scrape, import, save, or delete was submitted. A JSON export was inspected locally.
- Deployment gateway, hosting filesystem guarantees, database privileges, actual database indexes, backup configuration, Google API-key restrictions, real-camera scanning, and external-provider reliability were not inspected. No exploit was run against internal services or production infrastructure.

“Confirmed” means observable in source, a local browser check, or an isolated probe. “Risk” identifies a failure path without claiming an actual incident. “Recommendation” identifies an engineering improvement rather than a proven runtime failure. Priorities are P0 before internet exposure, P1 before relying on the application for durable data, P2 the next engineering iteration, and P3 cleanup.

## Verification results

| Check | Result | Interpretation |
| --- | --- | --- |
| `npm run build` | Pass | Production compilation and route generation succeed; this does not validate workflow correctness. |
| `npx tsc --noEmit` | Pass | Current type declarations compile, including the intentional `any` escape hatches. |
| `npx prisma validate` | Pass | The schema is syntactically valid. This does not validate production migrations or data consistency. |
| `npm run lint` | Fail: 15 errors, 17 warnings | Hook purity/ref/effect errors, missing dependencies, unused code, and an image warning. |
| `npm audit --json` | 11 affected packages: 1 critical, 8 high, 2 moderate | Includes transitive and development packages; these are package findings, not 11 demonstrated exploits. |
| `npm audit --omit=dev --json` | 4 affected packages: 1 critical, 1 high, 2 moderate | `next`, `@xmldom/xmldom`, `epubjs`, and `react-reader`. |
| Production browser | Initial page loads with no observed uncaught page errors | Desktop/mobile smoke check only; not a full accessibility or end-to-end suite. |
| Manual-add browser check | No title, author, genre, or page-count input across its three tabs | Confirmed unusable identity-entry workflow; no record was saved. |
| JSON export browser check | Exported 20 books while the UI showed `20 / 350` | Confirmed that “Library export” is incomplete on initial load. |
| Isolated save/query/route probes | Confirmed discarded legacy fields, first-copy-wins metadata, zero deletion, unsupported filters, duplicate year queries, unrestricted navigation, and missing browser cleanup | Stubs prevented real database changes, internal requests, or uploaded files. |

## Security and exposure

### S01 — P0 / High / Confirmed: no application authentication or ownership checks

Evidence: `src/app/actions.ts:8,325,375`; both `src/app/api/*/route.ts`; `prisma/schema.prisma`.

The read action returns the shared library, including private notes and borrower information. Save/import accept client-selected Work and Copy IDs without checking a caller or library owner. Upload and price checking are also unauthenticated. A publicly reachable deployment would allow unauthorized reading and mutation. A verified private deployment gateway could reduce exposure, but was outside this audit.

Implement an authenticated server-only data-access layer. Recheck the caller in each action/route and enforce ownership in every query and mutation. A personal app can start with one authorized account; household access can come later. Server Actions are callable endpoints, and their generated identifiers do not replace authorization. [Next.js data-security guidance](https://nextjs.org/docs/app/guides/data-security).

### S02 — P0 / High / Confirmed: arbitrary server-side URL navigation

Evidence: `src/app/api/price-tracker/route.ts:6,11,23,58`.

The route accepts any string as `url` and passes it to Chromium. An isolated probe confirmed that a loopback URL reaches `page.goto`. This creates a server-side request forgery risk and exposes an expensive browser-launch operation to abuse. Chromium also follows redirects and loads subresources, so checking only the initial hostname would be incomplete.

Prefer a provider adapter accepting a supported product identifier. Otherwise enforce HTTPS, explicit retailer hosts, public resolved addresses, and the same checks on redirects and browser subrequests. Add authenticated quotas, bounded concurrency, timeouts, and server-side network restrictions. Return generic client errors rather than raw navigation messages. [OWASP SSRF prevention](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html).

### S03 — P0 / High / Confirmed: upload validation trusts a supplied MIME type

Evidence: `src/app/api/upload-pdf/route.ts:8,15,19,29,33`.

The route has no application size limit, signature/structure verification, extension allowlist, or quota. It retains the caller's extension. A harmless HTML fixture named `audit.html` with claimed MIME type `application/pdf` was accepted by the actual handler using filesystem stubs. No file was written. This can admit active content into a same-origin public path wherever those files are served, and large uploads can consume memory/disk. It also does not verify that the form field is a File before using it.

Validate the form field, impose size limits before buffering, verify PDF/EPUB signatures and structure, generate a random storage key and trusted extension, and reject unsupported content. Apply EPUB decompression limits and authorized storage quotas. [OWASP upload guidance](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html).

### S04 — P0 / High / Confirmed: ebooks are public repository/runtime assets

Evidence: `src/app/api/upload-pdf/route.ts:22`; `SPEC.md`; two tracked files under `public/pdfs/`.

Uploaded books are saved into `public/pdfs`, and existing ebooks are committed to Git. Any served public-file URL bypasses library authorization. Local writes also lack a documented persistent-storage contract; hosted environments may have read-only or ephemeral filesystems. Replacing/removing an attachment only changes form data and never deletes the old stored file.

Use private object storage with attachment records, owner checks, and short-lived reader access. Migrate existing references and stop tracking private uploads. Assess previously published files separately; deleting current Git files does not remove historical copies. Add attachment replacement/deletion and orphan cleanup. Do not assume a database backup includes ebook files.

### S05 — P1 / High / Confirmed advisory; reachability qualified: vulnerable dependencies

Evidence: `package.json`; both lockfiles; the two `npm audit` runs.

Next.js 16.3.5 falls in the range for the critical Node `next/og` ImageResponse advisory, patched in 16.3.6. No application import/use of `next/og` or ImageResponse was found, so this audit did **not** establish that RCE path in this app. Upgrade Next.js and its ESLint configuration together to a compatible patched release; npm currently proposes 16.3.8. [Maintainer advisory](https://github.com/vercel/next.js/security/advisories/GHSA-vcvr-r3jv-pc5j).

The production EPUB dependency chain includes high-severity XML parsing/serialization advisories through `@xmldom/xmldom`; evaluate compatibility and actual reader usage when upgrading. The development findings include the ESLint glob chain and `@prisma/config`/`deepmerge-ts`. Some npm suggestions downgrade major versions: do not run a forced audit fix blindly. Re-run both audit modes and reader/build tests after a deliberate dependency change.

### S06 — P1 / Medium / Confirmed; restrictions unknown: hardcoded browser API key

Evidence: `src/app/components/AddBookModal.tsx:78`.

A Google Books API key is hardcoded into a client component and therefore delivered to browsers. Its restrictions were not inspected. A browser key can be intentionally public if appropriately restricted; moving it to a `NEXT_PUBLIC_` variable would not hide it.

Verify API/origin restrictions and quota controls; rotate if unrestricted or intended to be secret. Use a server metadata adapter if the credential must stay private. Remove provider response debug logging and avoid putting credential values into audit reports or logs.

## Functional defects and incomplete workflows

| ID / priority | Finding and evidence | Required behavior |
| --- | --- | --- |
| F01 / P1 | **Manual add cannot enter identity.** `LibraryClient.tsx:411` supplies `blankBook()`. `EditModal.tsx:477,483` displays title/author as text; its inputs omit title, author, genre, volume, condition, and total pages. Browser confirmed the missing inputs. Save is allowed with blank identity. | Provide editable required title/author and useful catalogue fields. Validate on the server; allow metadata corrections after search/import. |
| F02 / P1 | **Delete is temporary.** `LibraryClient.tsx:484` filters state then calls save. `actions.ts:350` only upserts. An empty-save probe made zero database mutations. Removed records return on reload/refetch. | Implement an authorized delete/archive operation for explicit copy IDs, manage orphan Works and attachments, and update counts after success. Never infer deletion from absence in a paginated list. |
| F03 / P1 | **Reading dates are discarded.** `EditModal.tsx:685,698` edits `readingStartDate`/`readingEndDate`; `LibraryClient.tsx:205` persists unchanged `readingSpans`. The mapper probe retained an empty span array after dates were filled. | Store canonical per-copy/per-reader reading spans or explicit dates; translate form changes deliberately. Marking read should record a completion event. |
| F04 / P1 | **Lending cannot be completed.** `EditModal.tsx:787,798` edits `givenTo`/`loanDate`, while `LibraryClient.tsx:235` persists unchanged `loans`. No create-loan, due-date, return, or renewal flow exists. `actions.ts:270` displays the first loan even if returned; `LoanTracker.tsx:42` selects active loans. | Create real loan records, use the active loan consistently, and implement lend/return/renew with due dates. Existing overdue badges are present; automated reminders are missing. |
| F05 / P1 | **Changing an existing shelf can be ignored.** `EditModal.tsx:743` edits `shelfRow`, but `LibraryClient.tsx:222` prioritizes old nonempty `shelfLocation`. Probe: changing “old shelf” to “new shelf” still persisted “old shelf”. | Bind the form and persistence to one canonical location field. |
| F06 / P1 | **Physical-book timer is unreachable.** `BookViewModal.tsx:1057,1300` requires `onSave`; its only call site at `LibraryClient.tsx:1739` never supplies it. `ReadingTimer.tsx` exists but cannot be opened through that path. | Wire a durable save-session callback and keep the displayed book state synchronized. |
| F07 / P1 | **Complete-library features use only loaded/filtered rows.** `LibraryClient.tsx:267,422,509,520,675,737,1350` and `DashboardStats.tsx:30`. Analytics, Wrapped, loans, wishlist, export, duplicate checks, suggestions, author/shelf facets, and currently-reading widgets depend on `books`, initially 20 rows. Local-only views skip fetching their own dataset. The browser exported 20 books while the UI showed 350 total. | Give each operation an explicit server query or aggregate. Make “export all” and “export filtered” separate choices; detect duplicates across the full library. Fetch facets independently of loaded rows. |
| F08 / P1 | **Shared Work changes and concurrent edits can be lost.** `LibraryClient.tsx:183` uses the first loaded copy of a Work to construct its upsert. A probe submitted old and edited metadata for two copies; only the first metadata was persisted. Full-array saves also resend stale sessions/quotes/loans and can overwrite another tab's changes. | Update the selected Work explicitly, patch only changed fields, and propagate its metadata to sibling copies. Append sessions/loans through dedicated operations with version/conflict handling. The first-copy bug is confirmed; simultaneous-user loss is a risk inferred from the write contract. |
| F09 / P1 | **Success is reported before persistence; failures are swallowed.** `LibraryClient.tsx:249,397,403,473,554` and `EditModal.tsx:1094`. Forms close and success toasts appear without awaiting save. `saveBooks` catches errors without rethrowing or restoring state. | Await a typed mutation result, disable duplicate submits, show success after commit, and preserve/revert edits on failure. Recompute/refetch filtered results and total count after mutations. |
| F10 / P1 | **Filter and sort contracts disagree.** `LibraryShared.tsx:36,71,89`; `actions.ts:75,95,124`; `MobileFilterSheet.tsx:212`. Most desktop era values are unrecognized, “Gifted”/“Borrowed” are ignored, price sort is absent, and “oldest first” uses descending year order. `startsWith('Volume 1')` also matches Volume 10. Format choices differ across desktop/mobile/edit. | Define one shared validated filter/sort contract. Use numeric publication years, explicit ownership state, correct sort direction, and exact volume/series identity. A probe returned both 1890 and 2024 for “Before 1900” and applied no ownership or price-order condition. |
| F11 / P1 | **Pagination and URL state are inconsistent.** `LibraryClient.tsx:85,99,287,295,332,346`. Initial rows already represent page one, but the next request uses `skip=0`, repeating it. Back/forward changes to `skip` do not trigger the fetch effect. `loadMore` omits `viewMode` from dependencies, lacks request-generation checks, and can append a response from old filters. Initial `hasMore` guesses from row count. | Use a server-returned next cursor and hasMore, reset pagination with filters atomically, and discard obsolete responses. Define reload/back behavior explicitly. Avoid adding infinite-scroll offsets to browser history unless restoration is implemented. |
| F12 / P1 | **EPUB resume position is thrown away.** `EpubReaderModal.tsx:31` returns `lastLocation`, but `LibraryClient.tsx:1770` stores `currentPage:1`; the schema only supports integer page position. Sessions report fixed start/end page 1. Reader selection relies on case-sensitive `.endsWith('.epub')`. | Store attachment media type, EPUB CFI/location, and percentage separately from PDF pages. Persist/restore CFI and handle uppercase names/signed URLs without suffix guessing. |
| F13 / P1 | **Import/export cannot round-trip or safely merge.** `LibraryClient.tsx:565,590,629,675,688`. Import expects Goodreads `Title`; own CSV exports lowercase `title`. JSON import is absent. CSV exports `pages`, but data uses `totalPages`. Every import generates new IDs, so rerunning creates duplicates, and all rows—including wishlist rows—are marked purchased. Parse warnings, preview, and row-level error reporting are missing. | Version a lossless backup format with JSON restore, complete-library export, column mapping, preview, duplicate/edition reconciliation, row validation, and an import batch ID. Add a spreadsheet-safe CSV mode; quoting alone does not prevent formulas. [OWASP CSV injection](https://community.owasp.org/attacks/CSV_Injection). |
| F14 / P1 | **Wishlist prices overwrite historical purchase cost; scraper failures leak browsers.** `LibraryClient.tsx:545` writes offers into `purchasePrice`; analytics sums that field. `price-tracker/route.ts:46` closes Chromium only on success. A simulated navigation failure confirmed zero close calls. Price parsing returns no currency/source/time and is retailer-selector dependent. | Separate `PriceObservation` from acquisition cost, store currency/source/observed time, and always close browser resources in `finally`. Use supported provider integration with bounded jobs and actionable per-book errors. |
| F15 / P2 | **Metadata enrichment is not tied reliably to its book.** `AddBookModal.tsx:264,279,304`; `LibraryClient.tsx:134`; `EditModal.tsx:269`. Events carry an ISBN but the receiver ignores it. The editor initializes local form state once, so later enrichment props do not update the draft. A late event can target a different open book. Wikipedia still accepts the first result without an identity-confidence check. | Use a stable book/request ID, cancellation, provenance, and field-level merge into the intended draft. Do not overwrite user edits. Normalize ISBN-10/13 and validate checksums; show uncertain matches for review. |
| F16 / P2 | **Share cards construct invalid cover URLs.** `ShareCardModal.tsx:36` prepends `/covers/` to `coverFile`, while `LibraryClient.tsx:385` saves a complete photo URL there. `/placeholder.jpg` is absent. Remote image capture can also fail without CORS handling, with errors only logged. | Use one cover resolver for cards/readers/share export, a real fallback asset, and visible image-export errors. |
| F17 / P2 | **Reading statistics overstate or omit activity.** `AnalyticsDashboard.tsx:67` hardcodes a goal of 50 and only uses legacy completion dates, ignoring imported `dateRead`. `ReadingWrappedModal.tsx:30` reports estimated book `hours` instead of recorded session minutes. `ReadingHeatmap.tsx:24,34,57` counts events as “days”, and its 52-week range ends before today. | Compute completion history and measured minutes consistently, count unique active dates, include the current day, and persist user goals. Define the user's timezone for date-only activity; UTC date slicing can put early IST activity on the previous day. |
| F18 / P2 | **Reading status/progress can misrepresent actual activity.** `BookCard.tsx:242` and `BookList.tsx` map Wishlist to Unread; fallback progress advances with wall time since the start date, even without reading. `ReadingTimer.tsx:25` increments an interval counter and forces at least one minute on save. Readers save only when explicitly closed, do not persist discovered PDF page count, and count background-open time. | Preserve the real status label, derive progress from pages/CFI/listening position, use elapsed active time with pause/visibility handling, save reader progress periodically, and make session submission idempotent. Device shutdown/refresh must not lose all progress. |

## Performance and optimization

### P01 — P1 / High / Confirmed: default pagination scans and sorts the whole result set

Evidence: `actions.ts:115,116,155,186,278`; `prisma/schema.prisma` has no declared secondary indexes.

The default `sortBy='id'` fetches all matching copies and full Works, then sorts and slices in JavaScript. Grouped views and year filters do the same; year-filtered requests query the same full dataset again for the count. The isolated year probe confirmed two `findMany` calls. This is pagination of the returned array, not of database work.

Use an explicit numeric reading order/created timestamp and numeric publication year; let the database filter/order/page. Use stable tie-breakers and cursors. Query group keys/counts separately so a large group does not return unbounded books. Use narrow card DTOs rather than returning all descriptions, quotes, notes, loan history, and sessions with every listing.

Declare candidate indexes such as `Copy.workId`, status/location combinations, and sort/filter fields. Assess text search with representative query plans; do not assume ordinary B-tree indexes optimize substring searches. Actual database indexes/query plans were not inspected. [Prisma index documentation](https://www.prisma.io/docs/orm/v7/prisma-schema/data-model/indexes).

### P02 — P1 / High / Confirmed: one edit performs O(loaded rows) sequential upserts

Evidence: `LibraryClient.tsx:176`; `actions.ts:350,375`.

Every edit/session/price refresh constructs all loaded Works/Copies. Both save/import actions issue sequential upserts inside an interactive transaction, and the mapping logic is duplicated. Large imports can encounter transaction/request timeouts and action body-size limits; these failures were not load-tested.

Introduce specific add/update/delete/session/loan operations. Share mapping/validation in a server domain layer. Process large imports in bounded batches with progress and idempotency, and benchmark transaction boundaries. Cache small immutable/reference data or owner-scoped aggregates only after the query contracts are correct. `cacheComponents:true` alone does not cache these database actions.

### P03 — P2 / Medium / Confirmed structure; measured sample: heavy features load with the initial screen

Evidence: `LibraryClient.tsx:7,8,10,12,15`; static imports of BarcodeScanner, Recharts, and `html-to-image` through modals/dashboard.

PDF/EPUB readers are already dynamically imported, which is good. Charts, scanner, import parsing, and share-image generation are reachable through eagerly imported client components. One fresh production-browser sample loaded 434,564 encoded bytes of Next.js JavaScript (about 424 KiB), including a 293,188-byte chunk. This is a local transfer sample, not a Core Web Vitals score or a deployment benchmark.

Load dashboards/modals/scanner and export/import libraries when invoked. Use bundle analysis to attribute sizes before setting a budget. Keep interactive state in focused client components and use server queries/DTOs for data rather than making the entire feature set part of one client graph. [Next.js lazy-loading guide](https://nextjs.org/docs/app/guides/lazy-loading).

### P04 — P2 / Medium / Confirmed: repeated activity scans and duplicated derived state

Evidence: `ReadingHeatmap.tsx:34`; `LibraryClient.tsx:724,737,745`; `BookCard.tsx`, `BookList.tsx`, `BookViewModal.tsx`.

The heatmap filters all reading events once for each of 364 cells: O(days × events). Other statistics/facets repeatedly scan loaded books; card/list/detail each duplicate date, cover, genre, loan, and progress rules, already producing inconsistent results.

Build a date-to-count/minutes map in one pass and use reusable pure selectors for shared display rules. Move library aggregates/facets to their own queries. Consider list virtualization only after measuring a need; SQL pagination is the first fix.

### P05 — P2 / Medium / Confirmed: image/font delivery and theme work need attention

Evidence: native `<img>` throughout components; `LibraryClient.tsx:3` disables the image rule; `PdfReaderModal.tsx:9`; modal theme observers; `globals.css`.

Book covers and branding are delivered without a shared responsive optimization policy; several images lack lazy loading. The favicon JPEG is approximately 248 KiB. PDF rendering depends on a worker loaded from unpkg. Multiple components independently observe the root theme, while LoanTracker reads it only once and will not follow later toggles. There is no reduced-motion override for the many animations.

Use appropriately sized local branding assets and configured `next/image` or an equivalent responsive/lazy image strategy for approved providers. Self-host the version-matched PDF worker. Centralize theme state, resolve initial theme before visible paint, and respect reduced-motion preferences. The existing `next/font` integration and shared CSS theme tokens are useful foundations.

## Engineering practice and maintainability

| ID / priority | Current gap | Recommended practice |
| --- | --- | --- |
| Q01 / P2 | `prisma/schema.prisma` combines work identity and edition ISBN/publisher/format metadata; stores monetary amounts as Float, dates as String, and queryable loans/sessions as JSON. No created/updated timestamps, conflict version, owner, or explicit ownership model. Type unions include `| string`, defeating allowed-value checks. | Separate Work, Edition, Copy, reading state, ownership, and active Loan as needed. Use Decimal or integer minor units plus currency, typed dates/timestamps, bounded enums, timestamps/version, and relational history for independently queried records. Keep JSON for genuinely flexible provider payloads. Migrate incrementally and preserve existing history. |
| Q02 / P1 | No test script, test suite, or repository CI workflow was found. Build success currently permits known broken CRUD, filters, and unreachable features. | Add meaningful domain/integration tests and a small browser suite for add/edit/delete, save failure, lend/return, session logging, filters/pagination, and import/export round-trip. CI should run lint, typecheck, isolated test-DB checks, and build; review dependency advisories. |
| Q03 / P1 | Actions trust client arrays/JSON without runtime schemas, use whole-object spreads and `any`, and accept unbounded `take`/`skip`. Invalid fetches are converted to empty-looking initial libraries in `page.tsx:24`; client fetch paths lack rejection handling/finally. | Validate IDs, lengths, enum values, dates, ISBNs, money, rating/page bounds, JSON structure, and pagination limits. Whitelist mutation fields. Return discriminated results; distinguish empty, loading, and failed states. Add retryable error UI and error boundaries, sanitized structured logs, and operation timing. |
| Q04 / P1 | Lint has 15 errors/17 warnings. `LibraryClient.tsx` is 1,834 lines; EditModal/BookViewModal exceed 1,100/1,300 lines. Reader saves call `saveBooks` inside a `setBooks` updater (`LibraryClient.tsx:1778,1815`), a side effect that React can replay. | Fix render-time ref/date and hook issues; do not simply disable rules. Move mutations out of state updaters. Split query orchestration, editing, readers, and views. Share pure mappers/config instead of copying logic; tighten types at boundaries. |
| Q05 / P2 | Most modals lack dialog semantics/focus containment/restoration; several icon controls lack accessible names; clickable card/author/loan containers are divs without keyboard behavior. Form labels are generally not associated with input IDs. Toasts lack a live region. Mobile filters omit shelf location. | Adopt one accessible dialog primitive with focus trap/return, inert background, named controls, linked labels, visible focus, and live status announcements. Give cards proper button/link behavior without nested-interaction conflicts. Share mobile/desktop filter configuration. A smoke sample found zero dialog-role elements while AddBookModal was open and 11 unnamed buttons across the displayed page; this is not a full WCAG assessment. [W3C modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/). |
| Q06 / P2 | README is starter text; version/path/font descriptions disagree with the app. No environment example or migration history is committed. Both npm and pnpm lockfiles exist without a declared package manager. `@prisma/config` 7.x accompanies Prisma 5.x and the CLI only showed schema validation. `SPEC.md` says scanning is incomplete; the Android spec still describes a now-fixed fetch-result mismatch and string series schema. | Document one reproducible install/build/deploy workflow, environment names without secrets, baseline/migrations and restore procedure, storage setup, supported runtime, and operational checks. Choose/pin one package manager and matching lockfile. Remove unused config machinery or deliberately align its toolchain. Reconcile documentation with current source; treat the Android backlog as a future product plan, not implemented web features. Current npm lock root does match package.json; lock drift was not established. |
| Q07 / P3 | `axios` and `glob` have no application imports; unused imports/props and duplicated UI helpers remain. Starter public SVGs/branding variants have no apparent current references. | Remove confirmed unused direct dependencies/imports/assets after checking scripts and deployment references. Keep `@zxing/library`: it is an explicit peer of `@zxing/browser`. `epubjs` is used through `react-reader`; absence of a direct source import does not make that reader dependency dead. |

## Features to finish before expanding the product

| Existing feature | Current state | Completion criterion |
| --- | --- | --- |
| Manual book entry and metadata correction | Broken identity entry | Add a book without external providers, correct title/author/edition metadata, and reload successfully. |
| Book deletion | UI-only removal | Explicit durable archive/delete; count and attachment handling verified after reload. |
| Loan tracking | Display exists; record creation/return and reminders missing | Lend with borrower/due date, return/renew, preserve history, and see all overdue loans. |
| Physical reading timer | Component exists but unwired | Start/pause/finish and persist a session, with measured duration and progress. |
| Reading dates and goals | Date form does not persist; goal fixed at 50 | Completion/reread history survives reload and feeds configurable goals. |
| ISBN scanning | Implemented; SPEC checkbox stale | Test real rear-camera permission, cancel/unmount cleanup, ISBN checksum, and explicit quick-add/search behavior. The current scan only populates the query. |
| PDF/EPUB library | Readers exist; privacy/resume incomplete | Private durable storage, format-aware positions, crash-safe progress, valid page counts, and reader errors. |
| Imports and backups | Goodreads importer and partial export exist | Preview/merge/error report and complete export→restore round-trip with attachments handled explicitly. |
| Wishlist/price tracking | Partial loaded-list scope; current offers mix with costs | Complete wishlist query, separate price history/currency, and supported background refresh. |
| Reading Wrapped/share cards | Present with date/time/cover defects | Full-library measured statistics, selected year, correct covers, and reliable export. |
| Tags, custom collections, series | Stored/displayed in places, no complete management flow; “Collections” groups by genre | Editable tags/collections/series with consistent search/filtering and group drill-down. Author groups currently show four covers and a “more” count without a drill-down action. |
| “Read next from my shelf” | Random loaded Unread/Wishlist entry | Query owned available unread copies across the library; exclude wishlist-only and lent items and explain suggestions. |

## Practical architecture

Keep this a modular Next.js application with Prisma/Postgres. The immediate requirements do not justify microservices or replacing the stack.

Suggested boundaries:

- `src/lib/server/auth`, validation, and data access: authenticated caller, ownership filters, narrow read DTOs, and typed mutations; mark server-only modules accordingly.
- Domain operations for catalogue edits, reading sessions, lending, imports, and attachments. Server Actions should be thin adapters into these operations.
- Separate listing, full-library aggregates, facets, duplicate lookup, and backup queries. Paginated client state must never be the authoritative library dataset.
- Client hooks/components for filter state, editable drafts, mutation status, readers, and accessible dialogs; shared pure date/cover/status selectors.
- External metadata and price providers behind small adapters with timeout/retry/quotas and clear provenance.
- Explicit migration and backup/restore contracts. Introduce Edition, Loan, ReadingSession, Acquisition, and Attachment incrementally around the workflows that need them.

Before mobile sync or household collaboration, add stable IDs generated independently of wall-clock milliseconds, owner/library identity, created/updated timestamps, a conflict version, and idempotent writes. Existing `Date.now()` IDs are client-generated and can collide; imports use a different random-suffix convention. Do not treat the current string IDs as a durable reading-order model.

## Implementation order and acceptance checks

1. **Secure access and files:** S01–S04. Anonymous callers cannot read/mutate private records; authorization is enforced even when calling actions directly. Upload limits/types are tested, private books require authorized reader access, and price input cannot navigate to internal addresses or redirect/subrequest around restrictions.
2. **Restore durable core workflows:** F01–F09 and Q03. A test book can be manually added, edited, moved, lent, returned, timed, completed, and removed; each transition survives reload. Shared-work edits are consistent across copies. Failed saves do not announce success or lose the draft.
3. **Correct complete-library behavior:** F07, F10–F14, P01–P02. Test more than 40 books with duplicates, late-page loans/wishlist entries, multiple copies, and mixed publication years. All/faceted counts are correct; pagination has no duplicates or stale-filter rows; full backup restores into an empty test library. Listing queries page at the database rather than loading every Work/Copy.
4. **Close quality and dependency gaps:** S05–S06, Q02–Q04, Q06. Select compatible patched dependencies, establish migrations/environment setup, and gate changes on meaningful CI tests. Keep the audit explanation of nonreachable dependency advisories instead of overstating risk.
5. **Improve reader, reporting, and UX:** F12, F15–F18, P03–P05, Q05. PDF and EPUB resume independently; activity includes today in the chosen timezone; goals and Wrapped use real completion/session data; keyboard users can operate dialogs; first-screen bundles exclude unused feature libraries.
6. **Clean up:** Q07 and stale specifications. Remove verified dead code/assets and update feature completion claims after acceptance checks pass.

Use a disposable database and attachment namespace for mutation tests. Include repeated-submit, two-tab conflict, malformed data, canceled camera startup, failed provider responses, and interrupted reader/import scenarios. Tests should verify domain invariants and user outcomes, not merely mirror implementation.

## Suggested new features

These recommendations follow the existing personal-library workflows and the repository's Android product plan. They are product judgments, not claims about market demand. Build the first three after the core repairs; defer collaboration/AI until access and data contracts are dependable.

| Feature | User value and first useful version | Dependencies / relative effort |
| --- | --- | --- |
| **Saved shelves and smart filters** | Save “owned unread short books”, “lent and overdue”, and “next in a series”; show a count and open the result directly. | Shared filters, complete facets; small–medium. |
| **Configurable reading goals and DNF/rereads** | Set annual/monthly books, minutes or pages; record abandoned books and multiple reading attempts without overwriting history. | Durable completion/session model; medium. |
| **Shelf locator and personal copy labels** | Structured room/shelf/row locations plus QR labels for a specific copy; scan to view, lend, or move it. | Canonical location and copy IDs, working lending; medium. |
| **Purchase ledger and receipt attachments** | Save seller/date/currency/cost and private receipt files; separate gifts, borrowed items, offers, and actual expenditure. | Money/ownership model and private attachments; medium. |
| **Quote notebook with page OCR** | Search notes/quotes across books, add page references and tags, capture text from a page photo, and export selected notes. | Reliable quote writes and provenance; medium, OCR adds scope. |
| **Series completion and edition-aware duplicates** | Show missing volumes, reading order, translations/editions, and separate multiple copies of the same edition. | Work/Edition/Copy and structured series; medium–large. |
| **Offline installable companion** | Offline catalogue search and queued reading/loan events with visible sync state. | Stable mutation API, IDs, versions, conflict resolution, private attachment caching; large. |
| **Household library sharing** | Invite family with reader/editor permissions, separate reading history, and safe loan/contact visibility. | Account ownership, authorization and per-reader state; large. |
| **Explainable “read next” assistant** | Rank owned available unread books by time, genre, series progress, and recent reading; provide a simple reason. Optional AI can later summarize user-owned notes with source references. | Accurate full-library data; rule-based version medium, AI/privacy controls add scope. |

Small optional additions: undo/archive for deleted copies, reminders for inactive reading sessions, private share-card controls, selected-year Wrapped, and a “metadata needs review” queue. Automatic loan reminders need scheduling and notification preferences; currently only in-view overdue indicators exist.

## Existing foundations worth keeping

The Work/Copy distinction, strict TypeScript setting, Prisma development singleton, transactional writes, awaited Next.js search parameters, Suspense around dynamic page content, URL-backed filters, `next/font`, dynamically loaded PDF/EPUB readers, and shared theme tokens are useful. The audit calls for stronger contracts and completion of the workflows built on them, rather than a full rewrite.
