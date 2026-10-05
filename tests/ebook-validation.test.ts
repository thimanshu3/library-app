import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { MAX_EBOOK_BYTES, validateEbook } from '@/lib/server/ebook-validation'

const pdf = new File(['%PDF-1.7\nminimal structural test fixture\n%%EOF\n'], 'book.PDF', { type: 'application/pdf' })

describe('ebook validation', () => {
  it('accepts PDF content with an uppercase extension and normalizes it', async () => {
    expect(await validateEbook(pdf)).toMatchObject({ extension: 'pdf' })
  })
  it.each([
    new File(['<html>active content</html>'], 'book.pdf', { type: 'application/pdf' }),
    new File(['%PDF-1.7\n%%EOF'], 'book.html', { type: 'application/pdf' }),
    new File(['%PDF-1.7\n%%EOF'], 'book.pdf', { type: 'text/html' }),
    new File(['%PDF-1.7\ntruncated'], 'book.pdf', { type: 'application/pdf' }),
    new File([], 'book.pdf', { type: 'application/pdf' }),
    new File(['not a zip'], 'book.epub', { type: 'application/epub+zip' })
  ])('rejects empty, mislabeled, truncated and forged ebooks', async file => {
    await expect(validateEbook(file)).rejects.toMatchObject({ status: 400 })
  })
  it('rejects oversized files before reading their content', async () => {
    const huge = new File([], 'huge.pdf')
    Object.defineProperty(huge, 'size', { value: MAX_EBOOK_BYTES + 1 })
    huge.arrayBuffer = () => { throw new Error('must not read') }
    await expect(validateEbook(huge)).rejects.toMatchObject({ status: 413 })
  })
  it('accepts a structured EPUB and rejects traversal and compression bombs', async () => {
    const valid = await readFile(new URL('./fixtures/valid.epub', import.meta.url))
    expect(await validateEbook(new File([valid], 'book.EPUB'))).toMatchObject({ extension: 'epub' })
    for (const name of ['traversal', 'bomb', 'not-epub']) {
      const bytes = await readFile(new URL(`./fixtures/${name}.epub`, import.meta.url))
      await expect(validateEbook(new File([bytes], 'book.epub'))).rejects.toMatchObject({ status: 400 })
    }
  })
})
