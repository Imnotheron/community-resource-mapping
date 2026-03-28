import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Lazy initialization - only create Prisma client when first accessed
let _prismaInstance: PrismaClient | null = null

function getPrismaClient(): PrismaClient {
  if (_prismaInstance) return _prismaInstance

  const tursoUrl = process.env.TURSO_DATABASE_URL
  const tursoToken = process.env.TURSO_AUTH_TOKEN

  // 1. Check for Turso (adapter mode) - only if URL starts with libsql://
  if (tursoUrl && typeof tursoUrl === 'string' && tursoUrl.startsWith('libsql://') && tursoToken && typeof tursoToken === 'string') {
    try {
      const libsql = createClient({
        url: tursoUrl,
        authToken: tursoToken,
      })
      const adapter = new PrismaLibSQL(libsql as any)
      _prismaInstance = new PrismaClient({ adapter } as any)
      return _prismaInstance
    } catch (error) {
      console.warn('Failed to initialize Turso client, falling back to local SQLite:', error)
    }
  }

  // 2. Fallback to local SQLite (development mode)
  // Ensure DATABASE_URL is set for the engine even if using file directly
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'file:./dev.db'
  }

  _prismaInstance = new PrismaClient({
    log: ['error', 'warn'],
  })
  return _prismaInstance
}

// Use Proxy to defer initialization until first actual use
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = globalForPrisma.prisma ?? getPrismaClient()
    if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = client
    return (client as any)[prop]
  },
})