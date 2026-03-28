import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Creates a robust Prisma client adapted for Turso in production and local SQLite elsewhere.
 * Includes defensive checks for Vercel's unique environment variable hydration.
 */
function createPrismaClient(): PrismaClient {
  const tursoUrl = process.env.TURSO_DATABASE_URL
  const tursoToken = process.env.TURSO_AUTH_TOKEN
  const nodeEnv = process.env.NODE_ENV
  
  // Vercel build phase often has CI=1 and VERCEL=1. 
  // We use standard SQLite to prevent crashes during page data collection.
  const isVercelBuild = process.env.CI === '1' || process.env.VERCEL === '1' && !process.env.VERCEL_ENV;
  
  // Ensure we don't accidentally pass "undefined" string to createClient
  const isValidTursoUrl = tursoUrl && tursoUrl !== 'undefined' && tursoUrl.length > 5;

  if (nodeEnv === 'production' && !isVercelBuild && isValidTursoUrl) {
    try {
      // Security guard: double check token
      if (!tursoToken || tursoToken === 'undefined') {
         throw new Error('TURSO_AUTH_TOKEN is missing or invalid in production runtime.');
      }

      // Explicitly set a placeholder for Prisma internally (even if we use adapter)
      if (!process.env.DATABASE_URL) {
        process.env.DATABASE_URL = "file:./dev.db";
      }

      const libsql = createClient({
        url: tursoUrl,
        authToken: tursoToken,
      })
      
      const adapter = new PrismaLibSQL(libsql as any)
      return new PrismaClient({ adapter } as any)
    } catch (error) {
      console.error('[CRITICAL] Failed to initialize LibSQL adapter:', error)
      // Fallback to avoid immediate crash, allowing some parts of app to load
    }
  }

  // Fallback to local SQLite (Development or Build Phase)
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL === 'undefined') {
    process.env.DATABASE_URL = 'file:./dev.db'
  }
  
  return new PrismaClient({
    log: ['error', 'warn'],
  })
}

// Ensure the db instance is unique.
// In production, we don't necessarily cache globally to allow Vercel to recycle the function state cleanly.
export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}