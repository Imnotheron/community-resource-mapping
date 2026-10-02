import { db } from '@/lib/db'

type CycleResetRow = {
  id: number
  resetAt: string | Date
  resetBy: string
}

export async function ensureMapReliefCycleTable() {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "MapReliefCycleReset" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT,
      "resetAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "resetBy" TEXT NOT NULL
    )
  `)
}

export async function getLatestMapCycleResetBefore(
  cutoff: Date,
) {
  await ensureMapReliefCycleTable()

  const rows = await db.$queryRawUnsafe<CycleResetRow[]>(
    `SELECT "id", "resetAt", "resetBy"
     FROM "MapReliefCycleReset"
     WHERE "resetAt" <= ?
     ORDER BY "resetAt" DESC
     LIMIT 1`,
    cutoff.toISOString(),
  )

  const row = rows[0]
  if (!row) return null

  const resetAt = new Date(row.resetAt)
  if (Number.isNaN(resetAt.getTime())) return null

  return {
    id: Number(row.id),
    resetAt,
    resetBy: row.resetBy,
  }
}

export async function startNewMapReliefCycle(
  resetBy: string,
) {
  await ensureMapReliefCycleTable()

  await db.$executeRawUnsafe(
    `INSERT INTO "MapReliefCycleReset" ("resetAt", "resetBy")
     VALUES (CURRENT_TIMESTAMP, ?)`,
    resetBy,
  )

  const now = new Date()
  return {
    resetAt: now,
    resetBy,
  }
}
