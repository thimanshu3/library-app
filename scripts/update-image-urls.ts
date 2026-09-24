import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const SUPABASE_STORAGE_URL = 'https://clbcmabvtarhehmubbbv.supabase.co/storage/v1/object/public'

async function main() {
  const works = await prisma.work.findMany()
  
  for (const w of works) {
    let changed = false
    const updateData: any = {}

    if (w.photoUrl && w.photoUrl.startsWith('/covers/')) {
      updateData.photoUrl = `${SUPABASE_STORAGE_URL}${w.photoUrl}`
      changed = true
    } else if (w.photoUrl && !w.photoUrl.startsWith('http')) {
      updateData.photoUrl = `${SUPABASE_STORAGE_URL}/covers/${w.photoUrl}`
      changed = true
    }

    if (w.coverFile && w.coverFile.startsWith('/covers/')) {
      updateData.coverFile = `${SUPABASE_STORAGE_URL}${w.coverFile}`
      changed = true
    } else if (w.coverFile && !w.coverFile.startsWith('http')) {
      updateData.coverFile = `${SUPABASE_STORAGE_URL}/covers/${w.coverFile}`
      changed = true
    }

    if (changed) {
      await prisma.work.update({
        where: { id: w.id },
        data: updateData
      })
      console.log(`Updated images for work ${w.id}`)
    }
  }

  console.log('Image URLs updated in database!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
