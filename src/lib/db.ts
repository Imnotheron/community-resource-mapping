import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * UNIFIED DATABASE CLIENT
 * 
 * Works with Prisma 6.x adapter API (which expects a config object, not an instantiated LibSQL client).
 * - Development: connects to local SQLite via file: URL
 * - Production: connects to Turso via libsql:// URL
 */
function createPrismaClient(): PrismaClient {
  const isProduction = process.env.NODE_ENV === 'production'

  // --- VERCEL BUILD PHASE ---
  const isVercelBuild = process.env.CI === '1' ||
    (process.env.VERCEL === '1' && !process.env.VERCEL_ENV)

  if (isVercelBuild) {
    console.log('[DB] Vercel build phase — using placeholder client')
    return new PrismaClient()
  }

  // --- DETERMINE CONNECTION URL ---
  let dbUrl: string
  let authToken: string | undefined

  if (isProduction) {
    const tursoUrl = process.env.TURSO_DATABASE_URL
    const tursoToken = process.env.TURSO_AUTH_TOKEN

    if (!tursoUrl || tursoUrl === 'undefined' || !tursoToken || tursoToken === 'undefined' || !tursoUrl.startsWith('libsql://')) {
      console.error('[DB] CRITICAL: Missing or invalid Turso credentials in production!')
      return new PrismaClient()
    }

    dbUrl = tursoUrl
    authToken = tursoToken
  } else {
    // Development: use local SQLite file from .env DATABASE_URL
    const rawDbUrl = process.env.DATABASE_URL
    let localUrl = (rawDbUrl && rawDbUrl !== 'undefined') ? rawDbUrl : 'file:./dev.db'
    
    // CRITICAL: Prisma CLI treats `file:./` as relative to `prisma/` folder.
    // However, @libsql/client treats `file:./` as relative to process.cwd() (the root).
    // This creates TWO separate databases! We must re-map the path so the app connects
    // to the same .db file that `npx prisma db push` creates in the prisma directory.
    if (localUrl.startsWith('file:./') && !localUrl.startsWith('file:./prisma/')) {
      localUrl = localUrl.replace('file:./', 'file:./prisma/')
    }
    
    dbUrl = localUrl
    authToken = undefined
  }

  // Fallback for Prisma Engine validation, though adapter doesn't directly use it
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL === 'undefined') {
    process.env.DATABASE_URL = dbUrl
  }

  // In Prisma 6.x, PrismaLibSQL expects a config object matching the LibSQL createClient parameters,
  // NOT an instantiated client object! Passing an instantiated client causes 'URL_INVALID' because 
  // the client object doesn't have a `.url` string property.
  const adapter = new PrismaLibSQL({
    url: dbUrl,
    authToken: authToken,
  })
  
  return new PrismaClient({ adapter })
}

const isProduction = process.env.NODE_ENV === 'production'

export const db = isProduction
  ? createPrismaClient()
  : (globalForPrisma.prisma ?? createPrismaClient())

if (!isProduction) {
  globalForPrisma.prisma = db
}