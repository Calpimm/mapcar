import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from './generated/prisma/client'

export * from './generated/prisma/client'

export function createPrisma(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) throw new Error('DATABASE_URL tanımlı değil')
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
}

export type Db = ReturnType<typeof createPrisma>

export * as seedData from '../prisma/data'
