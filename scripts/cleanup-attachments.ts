import { config } from 'dotenv'
config({ path: '.env.local', quiet: true })
config({ path: '.env', quiet: true })

async function main() {
  const { cleanupAttachments } =
    await import('../src/lib/server/attachment-cleanup')
  const { default: prisma } = await import('../src/lib/prisma')
  try {
    console.log(
      await cleanupAttachments(100, !process.argv.includes('--delete'))
    )
  } finally {
    await prisma.$disconnect()
  }
}
main().catch(() => {
  console.error(
    'Attachment cleanup failed. Check database/storage configuration.'
  )
  process.exitCode = 1
})
