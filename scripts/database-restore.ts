import { isEbookKey } from '../src/lib/ebook-key'
import { storageConfig } from '../src/lib/storage-config'
import { PrismaClient, Prisma } from '@prisma/client'
import { config } from 'dotenv'
import { readFile, mkdir, writeFile, stat } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { createHash } from 'node:crypto'
import { PutObjectCommand } from '@aws-sdk/client-s3'
config({ path: '.env.local', quiet: true }); config({ path: '.env', quiet: true })
interface Backup {
  format: string; version: number;
  records: { works: Prisma.WorkCreateManyInput[]; editions: Prisma.EditionCreateManyInput[]; attachments: Prisma.AttachmentCreateManyInput[]; copies: Prisma.CopyCreateManyInput[]; sessions: Prisma.ReadingSessionRecordCreateManyInput[]; loans: Prisma.LoanCreateManyInput[]; settings: Prisma.LibrarySettingsCreateManyInput[] };
  files: { key: string; sha256: string; bytes: number }[]
}
async function main() {
  const path = process.argv[2]
  if (!path || path.startsWith('--')) throw new Error('Supply a backup directory.')
  const directory = resolve(path), jsonPath = join(directory, 'library.json')
  if ((await stat(jsonPath)).size > 100 * 1024 * 1024) throw new Error('Backup exceeds 100 MB.')
  const backup = JSON.parse(await readFile(jsonPath, 'utf8')) as Backup
  if (backup.format !== 'taleteacup-database' || backup.version !== 1 || !backup.records || !Array.isArray(backup.files)) throw new Error('Unsupported backup.')
  for (const table of ['works','editions','attachments','copies','sessions','loans','settings'] as const) if (!Array.isArray(backup.records[table]) || backup.records[table].length > 500_000) throw new Error('Invalid backup table.')
  const keys = new Set<string>()
  for (const file of backup.files) {
    if (!isEbookKey(file.key)) throw new Error('Invalid attachment key.')
    const data = await readFile(join(directory, 'ebooks', file.key))
    if (data.length !== file.bytes || createHash('sha256').update(data).digest('hex') !== file.sha256) throw new Error('Ebook checksum does not match.')
    keys.add(file.key)
  }
  if (backup.records.copies.some(copy => copy.attachmentKey && !keys.has(copy.attachmentKey))) throw new Error('A referenced ebook is missing.')
  const db = new PrismaClient()
  const storage = storageConfig()
  const client = storage.driver === 's3' ? storage.client : null
  try {
    if (await db.work.count() || await db.copy.count() || await db.attachment.count()) throw new Error('Restore requires an empty migrated database. Existing data was preserved.')
    console.log(`Validated backup: ${backup.records.works.length} works, ${backup.records.copies.length} copies, ${keys.size} ebooks.`)
    if (!process.argv.includes('--apply')) { console.log('Dry run complete. Use --apply with a fresh database to restore.'); return }
    const localDirectory = storage.driver === 'local' ? storage.directory : ''
    if (!client) await mkdir(localDirectory, { recursive: true, mode: 0o700 })
    for (const key of keys) {
      const data = await readFile(join(directory, 'ebooks', key))
      if (client) await client.send(new PutObjectCommand({ Bucket: storage.driver === 's3' ? storage.bucket : undefined, Key: `library-files/${key}`, Body: data, ContentType: key.endsWith('.epub') ? 'application/epub+zip' : 'application/pdf' }), { abortSignal: AbortSignal.timeout(30_000) })
      else {
        const destination = join(localDirectory, key)
        try { await writeFile(destination, data, { flag: 'wx', mode: 0o600 }) }
        catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST' || createHash('sha256').update(await readFile(destination)).digest('hex') !== createHash('sha256').update(data).digest('hex')) throw error }
      }
    }
    // All table inserts commit together. Failure leaves the target database empty.
    await db.$transaction(async tx => {
      if (await tx.work.count() || await tx.copy.count()) throw new Error('The restore target changed. Existing data was preserved.')
      await tx.work.createMany({ data: backup.records.works.map(work => ({ ...work, libraryOrder: BigInt(work.libraryOrder || 0) })) })
      await tx.edition.createMany({ data: backup.records.editions })
      await tx.attachment.createMany({ data: backup.records.attachments })
      await tx.copy.createMany({ data: backup.records.copies })
      await tx.readingSessionRecord.createMany({ data: backup.records.sessions })
      await tx.loan.createMany({ data: backup.records.loans })
      await tx.librarySettings.createMany({ data: backup.records.settings })
    }, { isolationLevel: 'Serializable', timeout: 60_000 })
    console.log('Restore complete. Database records and referenced ebooks are present.')
  } finally { client?.destroy(); await db.$disconnect() }
}
main().catch(error => { console.error(['Supply a backup directory.', 'Restore requires an empty migrated database. Existing data was preserved.'].includes(error.message) ? error.message : 'Restore failed validation or could not complete. Existing data was preserved.'); process.exitCode = 1 })
