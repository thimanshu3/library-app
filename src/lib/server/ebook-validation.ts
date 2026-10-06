import 'server-only'

import { fromBuffer, type Entry, type ZipFile } from 'yauzl'
import { HttpError } from './errors'

export const MAX_EBOOK_BYTES = 32 * 1024 * 1024
const MAX_EXPANDED_BYTES = 128 * 1024 * 1024
const invalid = () => new HttpError(400, 'Upload a valid PDF or EPUB file.')

function readEntry(zip: ZipFile, entry: Entry, limit: number): Promise<Buffer> {
  if (entry.uncompressedSize > limit) return Promise.reject(invalid())
  return new Promise((resolve, reject) => {
    zip.openReadStream(entry, (error, stream) => {
      if (error || !stream) return reject(invalid())
      const chunks: Buffer[] = []
      let size = 0
      stream.on('data', (chunk: Buffer) => {
        size += chunk.length
        if (size > limit) stream.destroy(invalid())
        else chunks.push(chunk)
      })
      stream.once('error', () => reject(invalid()))
      stream.once('end', () => resolve(Buffer.concat(chunks)))
    })
  })
}

async function validateEpub(bytes: Buffer): Promise<void> {
  const zip = await new Promise<ZipFile>((resolve, reject) => {
    fromBuffer(bytes, { lazyEntries: true, autoClose: false, validateEntrySizes: true, strictFileNames: true }, (error, archive) => {
      if (error || !archive) reject(invalid())
      else resolve(archive)
    })
  })
  try {
    const entries = await new Promise<Map<string, Entry>>((resolve, reject) => {
      const found = new Map<string, Entry>()
      let expanded = 0
      zip.once('error', () => reject(invalid()))
      zip.on('entry', (entry: Entry) => {
        expanded += entry.uncompressedSize
        const unsafe = entry.fileName.startsWith('/') || entry.fileName.split('/').some(part => part === '..') ||
          entry.fileName.includes('\\') || /[\x00-\x1f]/.test(entry.fileName)
        if (unsafe || found.has(entry.fileName) || found.size >= 4096 || entry.isEncrypted() ||
            entry.uncompressedSize > MAX_EBOOK_BYTES || expanded > MAX_EXPANDED_BYTES ||
            entry.uncompressedSize / Math.max(1, entry.compressedSize) > 200) {
          zip.close()
          return reject(invalid())
        }
        found.set(entry.fileName, entry)
        zip.readEntry()
      })
      zip.once('end', () => resolve(found))
      zip.readEntry()
    })
    const mime = entries.get('mimetype')
    const container = entries.get('META-INF/container.xml')
    if (!mime || mime.compressionMethod !== 0 || !container ||
        (await readEntry(zip, mime, 64)).toString('utf8') !== 'application/epub+zip') throw invalid()
    const xml = (await readEntry(zip, container, 512 * 1024)).toString('utf8')
    if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw invalid()
    const rootfile = xml.match(/<rootfile\b[^>]*\bfull-path\s*=\s*["']([^"']+)["'][^>]*>/i)
    const packageEntry = rootfile && entries.get(rootfile[1])
    if (!packageEntry) throw invalid()
    const opf = (await readEntry(zip, packageEntry, 2 * 1024 * 1024)).toString('utf8')
    if (/<!DOCTYPE|<!ENTITY/i.test(opf) || !/<package\b/i.test(opf) || !/<manifest\b/i.test(opf) || !/<spine\b/i.test(opf)) throw invalid()
  } finally {
    zip.close()
  }
}

export async function validateEbook(file: File): Promise<{ bytes: Buffer; extension: 'pdf' | 'epub' }> {
  if (file.size === 0) throw invalid()
  if (file.size > MAX_EBOOK_BYTES) throw new HttpError(413, 'Ebooks must be 32 MB or smaller.')
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (extension !== 'pdf' && extension !== 'epub') throw invalid()
  const expectedType = extension === 'pdf' ? 'application/pdf' : 'application/epub+zip'
  if (file.type && file.type !== expectedType && file.type !== 'application/octet-stream') throw invalid()
  const bytes = Buffer.from(await file.arrayBuffer())
  if (extension === 'pdf') {
    // Structural checks, not a malware scanner. Files are served only to the owner.
    if (!/^%PDF-(?:1\.[0-7]|2\.0)/.test(bytes.subarray(0, 12).toString('ascii')) ||
        !bytes.subarray(-1024).includes(Buffer.from('%%EOF'))) throw invalid()
  } else {
    await validateEpub(bytes)
  }
  return { bytes, extension }
}
