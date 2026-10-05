import 'server-only'

import { randomUUID } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { Readable } from 'node:stream'
import { S3Client, GetObjectCommand, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { HttpError } from './http'

export function isEbookKey(key: string): boolean {
  return /^(?:[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}|\d{13}-[a-zA-Z0-9_.-]{1,180})\.(pdf|epub)$/.test(key)
}

function storageConfig() {
  const driver = process.env.LIBRARY_STORAGE_DRIVER || (process.env.NODE_ENV === 'production' ? '' : 'local')
  if (driver === 'local') {
    const directory = process.env.LIBRARY_STORAGE_DIRECTORY || path.join(process.cwd(), '.data', 'library-files')
    // This is runtime storage, provisioned independently of the application bundle.
    const resolved = path.resolve(/* turbopackIgnore: true */ directory)
    if (resolved === path.resolve('public') || resolved.startsWith(path.resolve('public') + path.sep)) {
      throw new HttpError(503, 'Ebook storage must be outside the public directory.')
    }
    if (process.env.NODE_ENV === 'production' && (!process.env.LIBRARY_STORAGE_DIRECTORY || !path.isAbsolute(directory))) {
      throw new HttpError(503, 'Configure persistent private ebook storage on the server.')
    }
    return { driver, directory: resolved } as const
  }
  if (driver === 's3' && process.env.LIBRARY_STORAGE_BUCKET && process.env.LIBRARY_STORAGE_REGION) {
    const endpoint = process.env.LIBRARY_STORAGE_ENDPOINT || undefined
    if (endpoint && new URL(endpoint).protocol !== 'https:' && process.env.NODE_ENV === 'production') {
      throw new HttpError(503, 'Private storage requires an HTTPS endpoint.')
    }
    return {
      driver, bucket: process.env.LIBRARY_STORAGE_BUCKET,
      client: new S3Client({ region: process.env.LIBRARY_STORAGE_REGION, endpoint, forcePathStyle: !!endpoint, maxAttempts: 2 })
    } as const
  }
  throw new HttpError(503, 'Configure persistent private ebook storage on the server.')
}

export async function storeEbook(bytes: Buffer, extension: 'pdf' | 'epub'): Promise<string> {
  const key = `${randomUUID()}.${extension}`
  const config = storageConfig()
  if (config.driver === 'local') {
    await mkdir(config.directory, { recursive: true, mode: 0o700 })
    await writeFile(/* turbopackIgnore: true */ path.join(/* turbopackIgnore: true */ config.directory, key), bytes, { flag: 'wx', mode: 0o600 })
  } else {
    try {
      await config.client.send(new PutObjectCommand({
        Bucket: config.bucket, Key: `library-files/${key}`, Body: bytes,
        ContentType: extension === 'pdf' ? 'application/pdf' : 'application/epub+zip'
      }), { abortSignal: AbortSignal.timeout(15_000) })
    } finally { config.client.destroy() }
  }
  return `/api/files/${key}`
}

export function parseByteRange(header: string | null, size: number): { start: number; end: number } | null {
  if (!header) return null
  const match = /^bytes=(\d*)-(\d*)$/.exec(header)
  if (!match || (!match[1] && !match[2])) throw new HttpError(416, 'The requested file range is invalid.')
  const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]))
  const end = match[1] ? (match[2] ? Math.min(Number(match[2]), size - 1) : size - 1) : size - 1
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start > end || start >= size ||
      (!match[1] && Number(match[2]) === 0)) throw new HttpError(416, 'The requested file range is invalid.')
  return { start, end }
}

export async function ebookResponse(request: Request, key: string): Promise<Response> {
  if (!isEbookKey(key)) throw new HttpError(404, 'Ebook not found.')
  const config = storageConfig()
  let streamOwnsClient = false
  try {
    let size: number
    if (config.driver === 'local') {
      const metadata = await stat(/* turbopackIgnore: true */ path.join(/* turbopackIgnore: true */ config.directory, key))
      if (!metadata.isFile()) throw new HttpError(404, 'Ebook not found.')
      size = metadata.size
    } else {
      const metadata = await config.client.send(new HeadObjectCommand({ Bucket: config.bucket, Key: `library-files/${key}` }), { abortSignal: AbortSignal.timeout(15_000) })
      size = metadata.ContentLength ?? 0
    }
    let range: ReturnType<typeof parseByteRange>
    try { range = parseByteRange(request.headers.get('range'), size) } catch (error) {
      if (error instanceof HttpError && error.status === 416) {
        return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}`, 'Cache-Control': 'private, no-store' } })
      }
      throw error
    }
    const headers = new Headers({
      'Content-Type': key.endsWith('.pdf') ? 'application/pdf' : 'application/epub+zip',
      'Content-Length': String(range ? range.end - range.start + 1 : size),
      'Content-Disposition': `inline; filename="${key}"`,
      'Cache-Control': 'private, no-store', 'Accept-Ranges': 'bytes',
      'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': 'sandbox'
    })
    if (range) headers.set('Content-Range', `bytes ${range.start}-${range.end}/${size}`)
    if (request.method === 'HEAD') return new Response(null, { status: range ? 206 : 200, headers })
    let body: ReadableStream
    if (config.driver === 'local') {
      body = Readable.toWeb(createReadStream(/* turbopackIgnore: true */ path.join(/* turbopackIgnore: true */ config.directory, key), range || undefined)) as ReadableStream
    } else {
      const object = await config.client.send(new GetObjectCommand({
        Bucket: config.bucket, Key: `library-files/${key}`,
        Range: range ? `bytes=${range.start}-${range.end}` : undefined
      }), { abortSignal: AbortSignal.timeout(15_000) })
      if (!object.Body) throw new HttpError(404, 'Ebook not found.')
      const reader = object.Body.transformToWebStream().getReader()
      const client = config.client
      body = new ReadableStream({
        async pull(controller) {
          try {
            const { done, value } = await reader.read()
            if (done) { client.destroy(); controller.close() }
            else controller.enqueue(value)
          } catch (error) { client.destroy(); controller.error(error) }
        },
        async cancel(reason) { try { await reader.cancel(reason) } finally { client.destroy() } }
      })
      streamOwnsClient = true
    }
    return new Response(body, { status: range ? 206 : 200, headers })
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    const name = (error as Error).name
    if (code === 'ENOENT' || name === 'NotFound' || name === 'NoSuchKey') throw new HttpError(404, 'Ebook not found.')
    throw error
  } finally {
    if (config.driver === 's3' && !streamOwnsClient) config.client.destroy()
  }
}
