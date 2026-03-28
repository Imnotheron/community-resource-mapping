import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const tursoUrl = process.env.TURSO_DATABASE_URL
  const tursoToken = process.env.TURSO_AUTH_TOKEN

  // In production (Vercel), we MUST use Turso. 
  if (process.env.NODE_ENV === 'production') {
    if (!tursoUrl || !tursoToken) {
      throw new Error(`[CRITICAL] Missing Turso credentials in production! URL length: ${tursoUrl?.length}, Token length: ${tursoToken?.length}`)
    }
    
    // Explicit override for safety
    if (!process.env.DATABASE_URL) {
      process.env.DATABASE_URL = "file:./dev.db"
    }

    const libsql = createClient({
      url: tursoUrl,
      authToken: tursoToken,
    })
    
    const adapter = new PrismaLibSQL(libsql as any)
    return new PrismaClient({ adapter } as any)
  }

  // Development: Fallback to local SQLite
  if (!process.env.DATABASE_URL) process.env.DATABASE_URL = 'file:./dev.db'
  
  return new PrismaClient({
    log: ['error', 'warn'],
  })
}

// Ensure the db instance is unique. Do not use Proxy deferral as it was caching build-time undefined state.
export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db