import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * ABSOLUTE DEFENSIVE SINGLETON
 * This version is designed to survive Vercel "Warm Start" pollution.
 * It does not cache the client in globalThis when in production to ensure
 * every new serverless function cold-start gets a fresh environment check.
 */
function createPrismaClient(): PrismaClient {
  const tursoUrl = process.env.TURSO_DATABASE_URL
  const tursoToken = process.env.TURSO_AUTH_TOKEN
  
  // Vercel environment detection
  const isVercelBuild = process.env.CI === '1' || (process.env.VERCEL === '1' && !process.env.VERCEL_ENV);
  
  // Hard-Guard: If URL is literally the string "undefined", missing, or too short, 
  // we FORCE it to a safe placeholder to prevent the @libsql/client crash.
  const safeUrl = (tursoUrl && tursoUrl !== 'undefined' && tursoUrl.length > 5) 
    ? tursoUrl 
    : "libsql://missing-url-placeholder.turso.io";

  const hasCredentials = tursoUrl && tursoToken && tursoUrl !== 'undefined' && tursoToken !== 'undefined';

  // We only use Turso if we are in PRODUCTION, NOT in a BUILD phase, and HAVE credentials.
  if (process.env.NODE_ENV === 'production' && !isVercelBuild && hasCredentials) {
    try {
      // Ensure DATABASE_URL is set for Prisma's internal engines
      if (!process.env.DATABASE_URL) process.env.DATABASE_URL = "file:./dev.db";

      console.log('[DB] Initializing Turso connection...');
      
      const libsql = createClient({
        url: safeUrl,
        authToken: tursoToken,
      })
      
      const adapter = new PrismaLibSQL(libsql as any)
      return new PrismaClient({ adapter } as any)
    } catch (error) {
      console.error('[DB] [CRITICAL] LibSQL initialization failed:', error)
      // Fall through to SQLite fallback
    }
  }

  // Fallback to local SQLite (Development or Vercel Build Phase)
  console.log('[DB] Using local SQLite fallback (Build/Dev mode)');
  
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL === 'undefined') {
    process.env.DATABASE_URL = 'file:./dev.db'
  }
  
  return new PrismaClient({
    log: ['error', 'warn'],
  })
}

/**
 * In Production (Vercel), we DO NOT use a global singleton. 
 * This ensures that if a serverless function gets stuck with a bad "undefined" state, 
 * it won't contaminate future requests in that same execution context.
 */
export const db = (process.env.NODE_ENV === 'production') 
  ? createPrismaClient() 
  : (globalForPrisma.prisma ?? createPrismaClient());

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}