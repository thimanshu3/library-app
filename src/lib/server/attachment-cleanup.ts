import 'server-only'
import prisma from '@/lib/prisma'
import { removeEbook } from './storage'

export async function cleanupAttachments(limit = 100, dryRun = true) {
  const candidates = await prisma.attachment.findMany({ where: { OR: [
    { status: 'active', deleteAfter: { lte: new Date() } }, { status: 'deleting' }
  ] }, take: limit, orderBy: { createdAt: 'asc' } })
  let deleted = 0
  let failed = 0
  for (const file of candidates) {
    if (dryRun) continue
    const ready = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT "key" FROM "Attachment" WHERE "key"=${file.key} FOR UPDATE`
      const current = await tx.attachment.findUnique({ where: { key: file.key } })
      if (!current) return false
      if (await tx.copy.count({ where: { attachmentKey: file.key } })) {
        await tx.attachment.update({ where: { key: file.key }, data: { status: 'active', deleteAfter: null } })
        return false
      }
      if (current.status === 'active' && (!current.deleteAfter || current.deleteAfter > new Date())) return false
      await tx.attachment.update({ where: { key: file.key }, data: { status: 'deleting' } })
      return true
    })
    if (!ready) continue
    try {
      await removeEbook(file.key)
      await prisma.attachment.deleteMany({ where: { key: file.key, status: 'deleting', copies: { none: {} } } })
      deleted += 1
    } catch { failed += 1 }
  }
  return { eligible: candidates.length, deleted, failed, dryRun }
}
