# Audit implementation log — 5 October 2026

## Batch 1: private owner access and security boundaries

The owner chose one private account. The existing database remains the owner's complete library; there is no user table or ownership migration in this batch.

| Finding | State | Change and remaining work |
| --- | --- | --- |
| S01 | Fixed | Owner sign-in/sign-out, encrypted 12-hour cookies, salted scrypt passwords, explicit expiry and rotation revocation. The page, all three server actions, uploads, price lookup, and both file routes enforce authentication before reading data or doing work. Correctly sealed foreign-owner sessions are denied. |
| S02 | Fixed | Price lookup accepts canonical HTTPS Amazon product URLs for India, the US, and the UK. Every DNS result must be public; the selected address is pinned to the TLS socket. No browser, script execution, subrequests, or redirect following. Body size, DNS/request deadlines, concurrency, and request frequency are bounded. Provider blocks/missing prices return controlled errors. |
| S03 | Fixed | Upload parsing is bounded before formData(), requires exactly one actual File, accepts PDF/EPUB extensions only, and validates content. Maximum file size is 32 MB. EPUB checks cover structure, traversal, duplicate/encrypted entries, and expansion limits. PDF validation is structural, not malware scanning. Upload concurrency is bounded. |
| S04 | In progress | New files use opaque authenticated URLs and private local or S3-compatible storage. Two existing PDFs were copied to `.data/library-files`, verified against SHA-256 checksums, then removed from public/. Existing `/pdfs/` links remain valid behind authentication. Ranges and HEAD requests work; caching is disabled. Production requires explicitly configured durable storage. Remaining: storage cleanup on replacement/deletion and abandoned uploads, live verification of the deployment's bucket/volume and backups. |
| S05 | In progress | Next.js and eslint-config-next updated from 16.3.5 to 16.3.8. The critical Next advisory is absent from the post-change audit. Production audit still identifies three affected packages: @xmldom/xmldom (high), epubjs and react-reader (moderate). Review and repair the reader stack separately, including real reader rendering checks; remaining development advisories also need dispositions. |
| F14 | Open | Removing the browser scraper fixes its resource leak. Wishlist price checks still overwrite purchasePrice; a separate offer model/UI remains necessary. |
| Q02 | In progress | Added Vitest, 64 regression tests, test/typecheck commands, and browser smoke validation. CI automation and broader persistence/import/reader tests remain. Vitest 4.1.11 supports this workspace's Node runtime; Vitest 5 excluded Node 25. |
| Q06 | In progress | Replaced the starter README with actual configuration, auth setup/rotation, storage/migration, deployment, and check instructions. Declared pnpm 10.22.0 and Node >=22.13.0. Both lockfiles synchronized. Existing database migration/version-management work remains. |
| Q07 | In progress | Puppeteer is no longer a production dependency; it remains available for development browser checks. Other unused code/dependencies remain to be reviewed. |

Password setup uses scrypt N=32768, r=8, p=3, an [OWASP minimum profile](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html). The work factors are recorded in the stored hash. Authentication and upload concurrency limits bound CPU/memory use. Login attempts share an in-process bucket rather than trusting client IP headers. Deployments with multiple instances still need a shared gateway limiter.

The setup command created this workspace's initial owner credentials in `.local/owner-credentials.txt`, with owner-only permissions; it preserved the database environment variables. The credentials, session key, ebooks, and local verification outputs are excluded from Git and deployment tracing. Use `pnpm auth:setup --rotate` to choose a password. Do not put secrets in chat or client environment variables.

### Validation

- `pnpm test`: 64 tests covering session expiry/forgery/foreign identity/rotation, login/logout and cookie flags, origin/body/rate/concurrency limits, anonymous action/API denial, actual upload parsing, forged content, valid/unsafe EPUB fixtures, local and mocked S3 storage, PDF byte ranges, SSRF URL/DNS/redirect/subrequest checks, and safe owner setup/rotation.
- `pnpm typecheck`: passes.
- `pnpm build`: passes with Next.js 16.3.8. Runtime file access is excluded from bundle tracing; there are no filesystem tracing warnings.
- Targeted lint for the security/auth/routes/scripts/tests/config changes: passes without warnings. Whole-project lint still reports the original 15 errors and 17 warnings in existing components/actions; Q04 remains open.
- Production-browser smoke: anonymous root redirects to login; all data/file APIs deny anonymous callers; incorrect credentials show an error; owner sign-in opens the existing library; legacy and new uploads return authenticated PDF ranges; unsafe price URLs and forged uploads are rejected; sign-out revokes browser access. The temporary uploaded fixture was removed. Browser validation performed no database mutation.
- S3 is tested with a mocked backend, not a live deployment. Existing PDF links were exercised against actual migrated local files. Full PDF/EPUB reader rendering and a live Amazon lookup were not verified in this batch.
- Production dependency audit after the Next upgrade: 0 critical, 1 high, 2 moderate. These three remaining advisories belong to the reader stack.

### Next batch

Repair the server save contracts and per-book mutations first (F02/F03/F05/F08/F09/P02/Q03). Persist real deletions and reading fields, report save failures accurately, and integrate attachment cleanup. Then fix manual add, complete-library export/import and analytics, pagination/filtering, and reader persistence. The original backlog retains the missing feature and new-feature suggestions.
