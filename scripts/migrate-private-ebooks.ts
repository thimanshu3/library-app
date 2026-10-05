import { createHash } from 'node:crypto'
import { chmod, copyFile, mkdir, readFile, readdir, unlink } from 'node:fs/promises'
import { constants } from 'node:fs'
import path from 'node:path'

async function digest(file: string) { return createHash('sha256').update(await readFile(file)).digest('hex') }

async function main() {
  const destination = process.argv[2] || path.resolve('.data/library-files')
  if (!path.isAbsolute(destination) || destination === path.resolve('public/pdfs') || destination.startsWith(path.resolve('public') + path.sep)) {
    throw new Error('Choose an absolute directory outside public/ for private ebooks.')
  }
  const source = path.resolve('public/pdfs')
  let files: string[]
  try { files = await readdir(source) } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') { console.log('No public ebooks to migrate.'); return }
    throw error
  }
  await mkdir(destination, { recursive: true, mode: 0o700 })
  let count = 0
  for (const name of files) {
    if (!/^\d{13}-[a-zA-Z0-9_.-]{1,180}\.(pdf|epub)$/.test(name)) {
      throw new Error('An unexpected file exists in public/pdfs. Review it before migrating.')
    }
    const original = path.join(source, name)
    const target = path.join(destination, name)
    try { await copyFile(original, target, constants.COPYFILE_EXCL) } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
    }
    if (await digest(original) !== await digest(target)) throw new Error('The private copy differs from the original. Both files were retained.')
    await chmod(target, 0o600)
    await unlink(original)
    count += 1
  }
  console.log(`Migrated ${count} ebook(s) to private storage after verifying their checksums. Existing /pdfs/ links are preserved.`)
}

main().catch(error => { console.error(error instanceof Error ? error.message : 'Migration failed.'); process.exitCode = 1 })
