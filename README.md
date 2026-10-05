# TaleTeacup

A private personal library built with Next.js App Router, React, Prisma, and Postgres. This installation has one owner account; all library reads, mutations, uploads, price lookups, and ebook downloads require that account.

## Local setup

Use Node.js 22.13 or newer (Node 24 LTS recommended) and pnpm 10.22.0. pnpm is the primary package manager; the npm lockfile is kept synchronized for existing integrations.

```sh
pnpm install
cp .env.example .env.local
# Fill DATABASE_URL and DIRECT_URL for your Postgres database.
pnpm auth:setup
pnpm dev
```

If `.env.local` already contains database settings, keep it and add the owner settings with `pnpm auth:setup`. Do not overwrite it with the example. The interactive command hides password input and stores a salted scrypt hash plus a random session key. Scrypt uses N=32768, r=8, p=3, one of the minimum profiles in [OWASP's password storage guidance](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html). Passwords must contain at least 12 characters. Existing databases do not need an ownership migration for this single owner setup.

For an automatically generated account:

```sh
pnpm auth:setup --generate
```

Generated credentials are saved to `.local/owner-credentials.txt`, excluded from Git, with file permissions restricted to the owner. They are never printed by the setup command. To choose a new password and revoke existing sessions, run `pnpm auth:setup --rotate`, then restart the application.

Open `http://localhost:3000`. Unauthenticated requests redirect to `/login`. Missing authentication configuration fails closed. Sessions last 12 hours, use encrypted HttpOnly cookies, and use Secure cookies in production. The library header provides sign-out.

## Private ebooks

Local development stores ebooks in `.data/library-files`, outside `public/` and excluded from Git. Uploads accept PDF or EPUB files up to 32 MB, validate their content independently of the filename/MIME declaration, and bound multipart requests before parsing. EPUB archives have entry, expansion, encryption, and path checks. PDF checks validate basic structure; they do not perform malware scanning. Keep files from trusted sources.

Existing public attachments must be migrated before running this version:

```sh
pnpm ebooks:migrate
# Or supply an absolute mounted storage directory:
pnpm ebooks:migrate /absolute/persistent/library-files
```

The migration verifies SHA-256 checksums before removing the public originals. It preserves filenames, so existing database `/pdfs/<filename>` links work through an authenticated compatibility route. New uploads use opaque `/api/files/<uuid>.<extension>` URLs. Both routes support PDF byte ranges and disable response caching. Back up the private directory alongside the database. It is runtime data and is deliberately excluded from deployment bundles.

Production must explicitly configure durable storage. A temporary serverless filesystem is unsuitable.

For a persistent mounted volume:

```dotenv
LIBRARY_STORAGE_DRIVER=local
LIBRARY_STORAGE_DIRECTORY=/absolute/persistent/library-files
```

For a private S3 or S3-compatible bucket:

```dotenv
LIBRARY_STORAGE_DRIVER=s3
LIBRARY_STORAGE_BUCKET=your-private-bucket
LIBRARY_STORAGE_REGION=ap-south-1
# Optional HTTPS endpoint for another S3-compatible provider:
LIBRARY_STORAGE_ENDPOINT=
```

Enable the bucket's public access block and grant the application's IAM role only the required object permissions. Use the deployment role or standard AWS credential environment variables. Object keys use the `library-files/` prefix. Transfer migrated files under that prefix, preserving their names, when switching from local storage to S3. Downloads are proxied through the authenticated application. The adapter has mocked regression tests; it still needs a live check against your chosen provider. Automatic cleanup of replaced, deleted, and abandoned uploads remains in the audit backlog.

## Production configuration

Provide `DATABASE_URL`, `DIRECT_URL`, `LIBRARY_OWNER_NAME`, `LIBRARY_OWNER_PASSWORD_HASH`, and `LIBRARY_SESSION_SECRET` through the deployment's secret settings. Never commit `.env.local`, generated credentials, or ebook data. Use HTTPS. Behind a reverse proxy, set `LIBRARY_APP_ORIGIN` to the canonical HTTPS origin; mutation endpoints reject absent or mismatched Origin headers.

Sign-in, uploads, and price lookups have bounded in-process rate limits. Multi-instance deployments need an additional shared limiter at the gateway. Price lookups accept only HTTPS Amazon product links for India, the US, and the UK; they reject non-public DNS results, pin the validated address, do not follow redirects or execute page scripts, and bound response size and duration. Amazon may block automated requests; the application reports provider failures.

```sh
pnpm build
pnpm start
```

## Checks and audit tracking

```sh
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

Security tests cover session validity and rotation, sign-in/sign-out, request origin and body limits, anonymous action/API access, forged uploads, EPUB archive checks, private storage and ranges, and price lookup URL/DNS/redirect boundaries. Whole-project lint still reports pre-existing issues documented in the audit; the security files pass targeted lint.

See [the codebase audit](docs/codebase-audit-2026-10-05.md), [the implementation backlog](docs/codebase-audit-backlog-2026-10-05.csv), and [completed fix batches](docs/audit-fixes-2026-10-05.md). Dependency advisories and the remaining functionality/performance work are tracked there.
