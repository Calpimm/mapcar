import path from 'node:path'
import { config } from 'dotenv'
import { createPrisma } from '../src'
import { carModels, jobs, places } from './data'

config({ path: path.resolve(import.meta.dirname, '../../../.env') })

const prisma = createPrisma()

async function main() {
  for (const p of places) {
    const data = { ...p, city: p.city ?? 'Gazimağusa' }
    await prisma.place.upsert({ where: { slug: p.slug }, create: data, update: data })
  }
  for (const c of carModels) {
    await prisma.carModel.upsert({ where: { slug: c.slug }, create: c, update: c })
  }
  for (const { place, ...j } of jobs) {
    const placeId = (await prisma.place.findUniqueOrThrow({ where: { slug: place } })).id
    const data = { ...j, placeId }
    await prisma.job.upsert({ where: { slug: j.slug }, create: data, update: data })
  }
  await prisma.simSettings.upsert({ where: { id: 1 }, create: {}, update: {} })
  console.log(`✓ ${places.length} yer, ${carModels.length} araba, ${jobs.length} iş`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
