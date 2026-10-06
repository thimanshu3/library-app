import { isEbookKey } from '../src/lib/ebook-key'
import { storageConfig } from '../src/lib/storage-config'
import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { createHash } from 'node:crypto'
import { GetObjectCommand } from '@aws-sdk/client-s3'
config({ path: '.env.local', quiet: true }); config({ path: '.env', quiet: true })
async function main() {
  const db = new PrismaClient()
  const directory = resolve(process.argv[2] || `.local/backups/library-${new Date().toISOString().replaceAll(':', '-')}`)
  await mkdir(directory, { recursive: false, mode: 0o700 }); await mkdir(join(directory, 'ebooks'), { mode: 0o700 })
  const storage = storageConfig()
  const client = storage.driver === 's3' ? storage.client : null
  try {
    const records = await db.$transaction(async tx => ({ works: await tx.work.findMany(), editions: await tx.edition.findMany(), attachments: await tx.attachment.findMany(), copies: await tx.copy.findMany(), sessions: await tx.readingSessionRecord.findMany(), loans: await tx.loan.findMany(), settings: await tx.librarySettings.findMany() }), { isolationLevel: 'RepeatableRead', timeout: 30_000 })
    const files: { key: string; sha256: string; bytes: number }[] = []
    // Metadata and referenced ebook bytes must both succeed before the backup is marked complete.
    for (const key of new Set(records.copies.map(copy => copy.attachmentKey).filter((key): key is string => !!key))) {
      if (!isEbookKey(key)) throw new Error('Invalid attachment key.')
      const data = client ? Buffer.from(await (await client.send(new GetObjectCommand({ Bucket: storage.driver === 's3' ? storage.bucket : undefined, Key: `library-files/${key}` }), { abortSignal: AbortSignal.timeout(30_000) })).Body!.transformToByteArray()) : await readFile(join(storage.driver === 'local' ? storage.directory : '', key))
      await writeFile(join(directory, 'ebooks', key), data, { flag: 'wx', mode: 0o600 })
      files.push({ key, sha256: createHash('sha256').update(data).digest('hex'), bytes: data.length })
    }
    await writeFile(join(directory, 'library.json'), JSON.stringify({ format: 'taleteacup-database', version: 1, exportedAt: new Date().toISOString(), records, files }, (_key, value) => typeof value === 'bigint' ? value.toString() : value, 2), { flag: 'wx', mode: 0o600 })
    console.log(`Backup complete: ${records.works.length} works, ${records.copies.length} copies, ${files.length} ebooks. Saved to ${directory}`)
  } finally { client?.destroy(); await db.$disconnect() }
}
main().catch(() => { console.error('Backup failed. The destination is incomplete; keep your previous backup.'); process.exitCode = 1 })
