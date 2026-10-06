import { S3Client } from '@aws-sdk/client-s3'
import path from 'node:path'
import { HttpError } from './server/errors'

export function storageConfig() {
  const driver =
    process.env.LIBRARY_STORAGE_DRIVER ||
    (process.env.NODE_ENV === 'production' ? '' : 'local')
  if (driver === 'local') {
    const directory =
      process.env.LIBRARY_STORAGE_DIRECTORY ||
      path.join(process.cwd(), '.data', 'library-files')
    // This is runtime storage, provisioned independently of the application bundle.
    const resolved = path.resolve(/* turbopackIgnore: true */ directory)
    if (
      resolved === path.resolve('public') ||
      resolved.startsWith(path.resolve('public') + path.sep)
    ) {
      throw new HttpError(
        503,
        'Ebook storage must be outside the public directory.'
      )
    }
    if (
      process.env.NODE_ENV === 'production' &&
      (!process.env.LIBRARY_STORAGE_DIRECTORY || !path.isAbsolute(directory))
    ) {
      throw new HttpError(
        503,
        'Configure persistent private ebook storage on the server.'
      )
    }
    return { driver, directory: resolved } as const
  }
  if (
    driver === 's3' &&
    process.env.LIBRARY_STORAGE_BUCKET &&
    process.env.LIBRARY_STORAGE_REGION
  ) {
    const endpoint = process.env.LIBRARY_STORAGE_ENDPOINT || undefined
    if (
      endpoint &&
      new URL(endpoint).protocol !== 'https:' &&
      process.env.NODE_ENV === 'production'
    ) {
      throw new HttpError(503, 'Private storage requires an HTTPS endpoint.')
    }
    return {
      driver,
      bucket: process.env.LIBRARY_STORAGE_BUCKET,
      client: new S3Client({
        region: process.env.LIBRARY_STORAGE_REGION,
        endpoint,
        forcePathStyle: !!endpoint,
        maxAttempts: 2
      })
    } as const
  }
  throw new HttpError(
    503,
    'Configure persistent private ebook storage on the server.'
  )
}

