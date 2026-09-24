import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export async function POST(request: Request) {
  try {
    const data = await request.formData()
    const file: File | null = data.get('file') as unknown as File

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 })
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ success: false, error: 'File must be a PDF' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Ensure the public/pdfs directory exists
    const pdfsDir = path.join(process.cwd(), 'public', 'pdfs')
    if (!existsSync(pdfsDir)) {
      await mkdir(pdfsDir, { recursive: true })
    }

    // Sanitize filename and add timestamp to avoid collisions
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '')
    const filename = `${Date.now()}-${safeName}`
    const filepath = path.join(pdfsDir, filename)

    await writeFile(filepath, buffer)

    return NextResponse.json({ success: true, path: `/pdfs/${filename}` })
  } catch (error) {
    console.error('PDF Upload Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to upload PDF' }, { status: 500 })
  }
}
