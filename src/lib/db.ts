import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function hasValidTursoConfig(): boolean {
  const url = process.env.TURSO_DATABASE_URL?.trim()
  const token = process.env.TURSO_AUTH_TOKEN?.trim()

  return Boolean(
    url &&
      token &&
      url !== 'undefined' &&
      token !== 'undefined' &&
      url.startsWith('libsql://'),
  )
}

/**
 * Unified database client.
 *
 * When valid Turso credentials are available, every environment uses the
 * same remote database. This lets localhost display the same users,
 * profiles, dashboard counts, and map records as the deployed website.
 *
 * Without Turso credentials, local development falls back to prisma/dev.db.
 */
function createPrismaClient(): PrismaClient {
  const isProduction = process.env.NODE_ENV === 'production'

  // Vercel's build phase must not require a live database connection.
  const isVercelBuild =
    process.env.CI === '1' ||
    (process.env.VERCEL === '1' && !process.env.VERCEL_ENV)

  if (isVercelBuild) {
    console.log('[DB] Build phase — using placeholder Prisma client')
    return new PrismaClient()
  }

  let dbUrl: string
  let authToken: string | undefined

  if (hasValidTursoConfig()) {
    dbUrl = process.env.TURSO_DATABASE_URL!.trim()
    authToken = process.env.TURSO_AUTH_TOKEN!.trim()
    console.log('[DB] Using shared Turso database')
  } else {
    if (isProduction) {
      console.error(
        '[DB] CRITICAL: Missing or invalid Turso credentials in production!',
      )
      return new PrismaClient()
    }

    const rawDbUrl = process.env.DATABASE_URL
    let localUrl =
      rawDbUrl && rawDbUrl !== 'undefined'
        ? rawDbUrl
        : 'file:./dev.db'

    // Prisma CLI resolves file:./ relative to prisma/, while libSQL resolves
    // it relative to process.cwd(). Remap the path so both use one file.
    if (
      localUrl.startsWith('file:./') &&
      !localUrl.startsWith('file:./prisma/')
    ) {
      localUrl = localUrl.replace('file:./', 'file:./prisma/')
    }

    dbUrl = localUrl
    authToken = undefined
    console.log('[DB] Using local SQLite database')
  }

  if (!process.env.DATABASE_URL || process.env.DATABASE_URL === 'undefined') {
    process.env.DATABASE_URL = dbUrl
  }

  const adapter = new PrismaLibSQL({
    url: dbUrl,
    authToken,
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
