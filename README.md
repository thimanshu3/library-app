# TaleTeacup

A private personal library built with Next.js App Router, React, Prisma, and Postgres. One owner account protects library reads, changes, metadata lookups, uploads, and ebook downloads.

## Setup

Use Node 24 LTS and pnpm 10.22.0. Node >=22.13.0 is supported. The pnpm lockfile and vendor patches are authoritative; the install guard rejects other package managers.

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local
# Set DATABASE_URL and DIRECT_URL for your Postgres database.
pnpm auth:setup
pnpm db:migrate
pnpm dev
```

Keep an existing `.env.local`; add missing settings instead of replacing it. The auth command hides password entry, writes a salted scrypt hash and random session key, and requires a password of at least 12 characters. `pnpm auth:setup --generate` saves generated credentials privately in `.local/owner-credentials.txt`. `pnpm auth:setup --rotate` changes the password and revokes existing sessions; restart after changing authentication settings.

Open http://localhost:3000. Sign-in sessions expire after 12 hours and use encrypted HttpOnly cookies, SameSite=Strict, and Secure in production. Missing authentication settings fail closed. There is no public registration or multi-user account model.

### Upgrade an existing installation

Back up the database and ebooks before migrations. A database previously created with `prisma db push` needs the `0_baseline` migration marked applied **only after confirming its schema matches that baseline**. Load the correct database environment before running `pnpm exec prisma migrate resolve --applied 0_baseline`. A fresh database runs the baseline through `pnpm db:migrate`; do not mark it applied there. This workspace has already been baselined and upgraded.

```sh
pnpm db:migrate
pnpm db:history
pnpm ebooks:migrate
```

The additive migrations introduce Editions, typed money/calendar dates, independent ownership, revisions, relational reading sessions/loans, private attachment references, and owner settings. History migration is repeatable and preserves legacy JSON, including invalid events it reports. Ebook migration verifies checksums before removing public originals and retains authenticated compatibility for `/pdfs/<filename>` links. Do not use `db push` to bypass versioned migrations.

## Library workflows

Manual add/edit includes title, author, shelf, ownership, currency, reading dates, tags, collections, review, and private notes. New books and imports without an explicit ownership or purchased flag default to no ownership; reading status does not imply possession. Lending supports due dates, renewal, return, and retained history. Saves wait for the database; failed or conflicting edits keep the draft. A new draft has a stable creation token so retries create one copy. Shared Work metadata updates across its copies; reader events update their copy independently.

Normal listings fetch 20 records with validated database filters and stable cursor ordering. Analytics, loans, wishlist checks, duplicate lookup, facets, and export use the complete library. Offers record amount/currency/source/check time separately from acquisition costs. Annual reading goals persist. Heatmap and Wrapped use recorded sessions and completion history.

PDF uses a bundled local worker and resumes its page. EPUB stores its CFI location. Timers count focused, visible time; digital readers pause after 60 seconds idle. Progress checkpoints are queued in browser storage and acknowledged by idempotent server updates. A failed close keeps the reader open for retry. This queue is recovery for that browser, not a full offline library.

## Import, export, and backups

The header exports complete JSON or CSV. CSV includes readable columns plus a JSON `record` column preserving all fields. Import accepts both formats, legacy grouped JSON, and mapped Goodreads CSV. The maximum import file is 20 MB; requests contain at most 25 records and about 700 KB. Row errors can be downloaded. Repeating an import skips existing copy IDs; it merges new copies without overwriting existing records. Keep the `record` column for a complete CSV round-trip. An empty CSV cannot carry goal settings; use JSON for that case.

Library exports contain metadata and private attachment references, **not ebook bytes or owner credentials**. To transfer them to another installation, copy the private files with their names, run `pnpm ebooks:register /absolute/path/library-export.json` to validate/register the copied references, then import that JSON. Use the database backup workflow below for a full recovery with all raw records and referenced ebook bytes.

```sh
pnpm db:backup
# Or choose a new private destination directory:
pnpm db:backup /absolute/private/backup-directory
```

The destination must not already exist. A completed backup contains `library.json`, a checksum manifest, and `ebooks/`. Keep encrypted off-device backups and protect the separate deployment secrets. A failed backup does not replace an earlier backup. Schedule backups externally.

Restore to a **fresh migrated database** with its own database URLs and private storage directory/bucket. Run `pnpm db:migrate` against that target first, then:

```sh
pnpm db:restore /absolute/private/backup-directory
# After the dry run succeeds:
pnpm db:restore /absolute/private/backup-directory --apply
```

Restore verifies ebook checksums, refuses an occupied database, and inserts all database tables in one transaction. Restore was exercised against an isolated fresh Postgres schema with the existing 350-book library and both ebooks. Application JSON import is a merge tool; it is not the raw database restore command.

## Private storage and production

Development defaults to `.data/library-files`, outside `public/` and excluded from Git/build tracing. Uploads accept PDF/EPUB up to 32 MB, validate content and archive limits, and bound request size/concurrency. Downloads require the owner session, support HEAD/byte ranges, and use private no-store responses. PDF checks are structural, not malware scanning.

Production requires an explicit durable storage driver. Configure an absolute path on a persistent mounted volume:

```dotenv
LIBRARY_STORAGE_DRIVER=local
LIBRARY_STORAGE_DIRECTORY=/absolute/persistent/library-files
```

Or a private S3/S3-compatible bucket:

```dotenv
LIBRARY_STORAGE_DRIVER=s3
LIBRARY_STORAGE_BUCKET=your-private-bucket
LIBRARY_STORAGE_REGION=ap-south-1
LIBRARY_STORAGE_ENDPOINT=
```

Custom production endpoints require HTTPS. Use the deployment IAM role or standard AWS credentials, block public bucket access, and grant the necessary object permissions. Objects use `library-files/<filename>`; preserve that prefix and filenames when transferring local files. The app and backup tools share storage configuration. A live check against your production provider is still required; this workspace verification used local storage.

Unattached new uploads expire after seven days; replaced/deleted unreferenced attachments receive a 24-hour grace period. Cleanup rechecks references under a lock and retries interrupted deletions.

```sh
pnpm ebooks:cleanup
# Dry run first, then delete eligible unreferenced files:
pnpm ebooks:cleanup --delete
```

Schedule the delete command daily using the deployment's environment and private storage access. Each run handles up to 100 candidates; repeat when necessary. Referenced files are preserved. There is no public cleanup endpoint.

Provide database/auth secrets through deployment settings. Use HTTPS and set `LIBRARY_APP_ORIGIN` to the canonical HTTPS origin behind a proxy. Mutation APIs validate Origin. In-process request/concurrency limits protect a single instance; multi-instance deployments need a shared gateway limiter. `GOOGLE_BOOKS_API_KEY` is optional and server-only; rotate/restrict the old previously published key in Google Cloud. Account access is required to complete that external action.

Price checks allow HTTPS Amazon product links for India, US, and UK, validate and pin public DNS addresses, and bound time/response size. Provider blocks and quotas produce visible errors. Covers for share export use a protected allowlisted image proxy with validated redirect hops.

```sh
pnpm build
pnpm start
```

## Checks and audit

```sh
pnpm typecheck
pnpm lint --max-warnings=0
pnpm build
pnpm audit --prod --audit-level=high
```

CI runs frozen installation and these checks on Node 24. No new test cases were added in the completion batches at the owner's request. Existing batch-one security tests remain available through `pnpm test`; they have not been revalidated against these later storage/model changes.

The production dependency audit is clear. The development-only `braces@3.0.3` advisory has no published fixed version; the committed pnpm patch bounds parser and recursive AST depth. The version-based audit still reports it. Keep the patch until a compatible upstream fix is available.

See the [original audit](docs/codebase-audit-2026-10-05.md), [updated backlog](docs/codebase-audit-backlog-2026-10-05.csv), and [implementation/verification log](docs/audit-fixes-2026-10-05.md). Feature ideas remain recommendations rather than a commitment to build every suggestion.
