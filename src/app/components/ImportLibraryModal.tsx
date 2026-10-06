'use client'
import { useDialog } from '../hooks/use-dialog'
import { useState } from 'react'
import { importBookBatchAction, saveAnnualGoalAction } from '../actions'
import { parseLibraryFile, type ImportRecord } from '@/lib/library-import'

export default function ImportLibraryModal({ file, onClose, onComplete }: { file: File; onClose: () => void; onComplete: () => void }) {
  const dialogRef = useDialog(() => { if (!pending) onClose() })
  const [pending, setPending] = useState(false)
  const [progress, setProgress] = useState('Ready to import')
  const [errors, setErrors] = useState<ImportRecord[]>([])
  const [finished, setFinished] = useState(false)
  async function run() {
    setPending(true); setErrors([])
    const failed: ImportRecord[] = []
    let created = 0; let skipped = 0
    try {
      const { records, annualGoal } = await parseLibraryFile(file)
      failed.push(...records.filter(record => record.error))
      const valid = records.filter(record => record.book)
      for (let offset = 0; offset < valid.length;) {
        const batch: ImportRecord[] = []; let bytes = 0
        while (offset < valid.length && batch.length < 25) {
          const record = valid[offset]
          const size = new TextEncoder().encode(JSON.stringify(record.book)).length
          if (size > 700_000) { failed.push({ row: record.row, error: 'Record exceeds the 700 KB import limit.' }); offset++; continue }
          if (batch.length && bytes + size > 700_000) break
          batch.push(record); bytes += size; offset++
        }
        if (!batch.length) continue
        const results = await importBookBatchAction(batch.map(record => record.book))
        for (const result of results) {
          if (result.state === 'created') created++
          else if (result.state === 'skipped') skipped++
          else failed.push({ row: batch[result.index].row, error: result.error })
        }
        setProgress(`Processed ${offset} of ${valid.length} records`)
      }
      if (annualGoal && annualGoal >= 1 && annualGoal <= 10000) await saveAnnualGoalAction(annualGoal)
      setProgress(`${created} imported · ${skipped} already present · ${failed.length} errors`)
      onComplete()
    } catch (error) { failed.push({ row: 0, error: error instanceof Error ? error.message : 'Import failed. You can retry safely.' }) }
    finally { setErrors(failed); setPending(false); setFinished(true) }
  }
  function downloadErrors() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(errors, null, 2)], { type: 'application/json' }))
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'library-import-errors.json'; anchor.click(); URL.revokeObjectURL(url)
  }
  return <div ref={dialogRef} aria-label="Import library" className="fixed inset-0 z-[220] grid place-items-center bg-black/60 p-4">
    <section className="w-full max-w-lg rounded-3xl bg-background p-6 text-foreground shadow-xl">
      <h2 className="font-syne text-xl font-bold">Import library</h2><p className="mt-3 break-all text-sm">{file.name}</p>
      <p className="mt-4 text-sm" role="status">{progress}</p>
      <p className="mt-2 text-xs opacity-70">Existing records are preserved. Retrying the same file skips records already imported.</p>
      {errors.length > 0 && <div className="mt-4 max-h-48 overflow-auto text-sm text-red-700 dark:text-red-300" role="alert">{errors.slice(0, 50).map((record, index) => <p key={index}>Row {record.row}: {record.error}</p>)}</div>}
      <div className="mt-6 flex flex-wrap gap-3">
        {!finished && <button disabled={pending} onClick={run} className="rounded-full bg-accent px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{pending ? 'Importing…' : 'Import records'}</button>}
        {errors.length > 0 && <button onClick={downloadErrors} className="rounded-full border px-4 py-3 text-sm">Download error report</button>}
        <button disabled={pending} onClick={onClose} className="rounded-full border px-4 py-3 text-sm disabled:opacity-50">{finished ? 'Done' : 'Cancel'}</button>
      </div>
    </section>
  </div>
}
