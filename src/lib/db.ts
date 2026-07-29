import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function isValidTursoConfiguration(
  url: string | undefined,
  token: string | undefined,
): url is string {
  return (
    typeof url === 'string' &&
    url.startsWith('libsql://') &&
    typeof token === 'string' &&
    token.trim().length > 0
  )
}

function getLocalDatabaseUrl(): string {
  const configuredUrl = process.env.DATABASE_URL?.trim()

  let databaseUrl =
    configuredUrl && configuredUrl !== 'undefined'
      ? configuredUrl
      : 'file:./dev.db'

  // Prisma CLI treats file:./dev.db as relative to prisma/,
  // while the LibSQL adapter resolves it from process.cwd().
  if (
    databaseUrl.startsWith('file:./') &&
    !databaseUrl.startsWith('file:./prisma/')
  ) {
    databaseUrl = databaseUrl.replace(
      'file:./',
      'file:./prisma/',
    )
  }

  return databaseUrl
}

function createPrismaClient(): PrismaClient {
  const tursoUrl = process.env.TURSO_DATABASE_URL
  const tursoToken = process.env.TURSO_AUTH_TOKEN

  if (isValidTursoConfiguration(tursoUrl, tursoToken)) {
    const adapter = new PrismaLibSQL({
      url: tursoUrl,
      authToken: tursoToken,
    })

    return new PrismaClient({ adapter })
  }

  const localDatabaseUrl = getLocalDatabaseUrl()

  const adapter = new PrismaLibSQL({
    url: localDatabaseUrl,
  })

  return new PrismaClient({ adapter })
}

export const db =
  globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}