import { config } from 'dotenv'
import { readFile } from 'node:fs/promises'
import { isEbookKey } from '../src/lib/ebook-key'
config({ path: '.env.local', quiet: true }); config({ path: '.env', quiet: true })
async function main() {
  const file = process.argv[2]
  if (!file) throw new Error('Supply a JSON library export.')
  const data = JSON.parse(await readFile(file, 'utf8'))
  const books = Array.isArray(data) ? data : data.books
  if (!Array.isArray(books)) throw new Error('Invalid library export.')
  const { ebookResponse } = await import('../src/lib/server/storage')
  const { validateEbook } = await import('../src/lib/server/ebook-validation')
  const { default: db } = await import('../src/lib/prisma')
  let registered = 0
  try {
    const keys = new Set<string>(books.map((book: { pdfPath?: string }) => book.pdfPath || '').filter((path: string) => /^\/(api\/files|pdfs)\//.test(path)).map((path: string) => path.split('/').pop()!))
    for (const key of keys) {
      if (!isEbookKey(key)) throw new Error('Invalid ebook key.')
      const response = await ebookResponse(new Request('https://library.local/api/files/' + key), key)
      const declared = Number(response.headers.get('content-length'))
      if (!response.ok || !Number.isFinite(declared) || declared > 32 * 1024 * 1024) { await response.body?.cancel(); throw new Error('Invalid or missing ebook.') }
      await validateEbook(new File([await response.arrayBuffer()], key))
      await db.attachment.upsert({ where: { key }, create: { key, deleteAfter: new Date(Date.now() + 7 * 86400000) }, update: {} })
      registered++
    }
    console.log(`Registered ${registered} validated private ebook references. Import the library JSON next.`)
  } finally { await db.$disconnect() }
}
main().catch(() => { console.error('Registration failed. Check the export and copied private ebook files.'); process.exitCode = 1 })
