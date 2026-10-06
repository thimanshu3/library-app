# TaleTeacup — implemented scope and follow-up ideas

The historical audit is in `docs/codebase-audit-2026-10-05.md`. Current disposition and verification are in `docs/codebase-audit-backlog-2026-10-05.csv` and `docs/audit-fixes-2026-10-05.md`.

## Implemented library workflows

- [x] One private owner account; authenticated data, actions, uploads, searches, and downloads.
- [x] Work / Edition / Copy models; independent ownership, reading state, lending, and costs.
- [x] Manual add, metadata editing, canonical shelves, explicit copy deletion, and revision conflicts.
- [x] Search and database pagination; matching desktop/mobile status, format, ownership, year, genre, author, volume, and shelf filters.
- [x] ISBN search and camera barcode scanning; complete-library duplicate warnings.
- [x] Keyed enrichment that preserves edited draft fields.
- [x] Typed reading dates, completion history, configurable annual goal, and recorded-time analytics.
- [x] Physical reading timer, PDF page resume, EPUB CFI resume, and recoverable reader checkpoints.
- [x] Due dates, renewals, returns, and persistent lending history.
- [x] Full-library JSON/CSV export, bounded merge imports, Goodreads CSV mapping, and row error reports.
- [x] Tags, collections, quotes, reviews, and private notes in the editor.
- [x] Reading heatmap, annual Wrapped, share-card export, and an available owned unread shelf picker.
- [x] Price offers kept separate from acquisition cost and currency.
- [x] Private local/S3 storage, authenticated byte ranges, and reference-aware delayed cleanup.
- [x] Versioned migrations, repeatable legacy-history migration, checksum backups, and fresh-database restore.
- [x] Lazy optional client features, responsive covers, bundled PDF worker, live theme, and reduced motion.
- [x] Dialog focus handling, form labels, keyboard card access, mobile shelf filtering, and announced errors/status.
- [x] CI for frozen installation, types, lint, build, and production dependency audit.

## Deployment/account follow-up

- [ ] Rotate/restrict the previously published Google Books key in Google Cloud.
- [ ] Provision and exercise the production private bucket or persistent volume, and off-device backup storage.
- [ ] Schedule attachment cleanup/backups and configure a shared limiter if deploying multiple instances.
- [ ] Replace the temporary development-only braces patch when a compatible upstream fixed release exists.
- [ ] Extend regression test coverage when the owner resumes test work. No new test cases were requested for these completion batches.

## Recommended new features

These remain suggestions, not unfinished implementations promised by the audit repair.

1. Saved shelves and reusable compound filters.
2. DNF reading attempts and richer reread goals; the current annual goal and completed spans already persist.
3. Copy QR labels and a shelf locator for moving/lending physical items.
4. Purchase ledger with seller/date and private receipt attachments.
5. A searchable cross-book quote notebook with optional OCR capture.
6. Edition-aware duplicate tools and series completion/missing-volume views.
7. An installable offline companion with explicit synchronization/conflict handling.
8. Household accounts with roles and independent reader history; the owner chose one private account for this release.
9. Explainable read-next recommendations beyond the current shelf picker.
