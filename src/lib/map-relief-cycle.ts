import { db } from '@/lib/db'

type CycleResetRow = {
  id: number
  resetAt: string | Date
  resetBy: string
}

type CycleSettingsRow = {
  id: number
  resetIntervalDays: number | null
  updatedAt: string | Date
  updatedBy: string | null
}

export async function ensureMapReliefCycleTable() {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "MapReliefCycleReset" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT,
      "resetAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "resetBy" TEXT NOT NULL
    )
  `)

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "MapReliefCycleSettings" (
      "id" INTEGER PRIMARY KEY NOT NULL DEFAULT 1,
      "resetIntervalDays" INTEGER,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedBy" TEXT,
      CHECK ("id" = 1)
    )
  `)

  await db.$executeRawUnsafe(`
    INSERT OR IGNORE INTO "MapReliefCycleSettings"
      ("id", "resetIntervalDays", "updatedAt", "updatedBy")
    VALUES (1, NULL, CURRENT_TIMESTAMP, NULL)
  `)
}

export async function getLatestMapCycleResetBefore(
  cutoff: Date,
) {
  await ensureMapReliefCycleTable()

  const rows = await db.$queryRawUnsafe<CycleResetRow[]>(
    `SELECT "id", "resetAt", "resetBy"
     FROM "MapReliefCycleReset"
     WHERE datetime("resetAt") <= datetime(?)
     ORDER BY datetime("resetAt") DESC
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

export async function getMapReliefCycleSettings() {
  await ensureMapReliefCycleTable()

  const rows = await db.$queryRawUnsafe<CycleSettingsRow[]>(
    `SELECT "id", "resetIntervalDays", "updatedAt", "updatedBy"
     FROM "MapReliefCycleSettings"
     WHERE "id" = 1
     LIMIT 1`,
  )

  const row = rows[0]
  const updatedAt = row?.updatedAt
    ? new Date(row.updatedAt)
    : new Date()

  return {
    resetIntervalDays:
      row?.resetIntervalDays == null
        ? null
        : Number(row.resetIntervalDays),
    updatedAt:
      Number.isNaN(updatedAt.getTime())
        ? new Date()
        : updatedAt,
    updatedBy: row?.updatedBy || null,
  }
}

export async function updateMapReliefCycleSettings(
  resetIntervalDays: number | null,
  updatedBy: string,
) {
  await ensureMapReliefCycleTable()

  await db.$executeRawUnsafe(
    `UPDATE "MapReliefCycleSettings"
     SET "resetIntervalDays" = ?,
         "updatedAt" = CURRENT_TIMESTAMP,
         "updatedBy" = ?
     WHERE "id" = 1`,
    resetIntervalDays,
    updatedBy,
  )

  return getMapReliefCycleSettings()
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

  const latest =
    await getLatestMapCycleResetBefore(
      new Date(Date.now() + 60_000),
    )

  return {
    resetAt:
      latest?.resetAt || new Date(),
    resetBy,
  }
}

export async function maybeAutoResetMapReliefCycle(
  now = new Date(),
) {
  await ensureMapReliefCycleTable()

  const settings =
    await getMapReliefCycleSettings()

  const intervalDays =
    settings.resetIntervalDays

  if (
    !intervalDays ||
    intervalDays < 1
  ) {
    return {
      reset: false,
      resetIntervalDays: null,
      nextResetAt: null,
    }
  }

  const latest =
    await getLatestMapCycleResetBefore(
      now,
    )

  const baseTime =
    latest?.resetAt ||
    settings.updatedAt

  const intervalMs =
    intervalDays *
    24 *
    60 *
    60 *
    1000

  const nextResetAt =
    new Date(
      baseTime.getTime() +
        intervalMs,
    )

  if (now < nextResetAt) {
    return {
      reset: false,
      resetIntervalDays:
        intervalDays,
      nextResetAt,
    }
  }

  // Re-check immediately before inserting so simultaneous map requests
  // do not repeatedly start the same automatic relief cycle.
  const latestBeforeInsert =
    await getLatestMapCycleResetBefore(
      now,
    )

  const effectiveBase =
    latestBeforeInsert?.resetAt ||
    settings.updatedAt

  if (
    now.getTime() <
    effectiveBase.getTime() +
      intervalMs
  ) {
    return {
      reset: false,
      resetIntervalDays:
        intervalDays,
      nextResetAt: new Date(
        effectiveBase.getTime() +
          intervalMs,
      ),
    }
  }

  const cycle =
    await startNewMapReliefCycle(
      'SYSTEM_AUTO_RESET',
    )

  return {
    reset: true,
    resetIntervalDays:
      intervalDays,
    resetAt: cycle.resetAt,
    nextResetAt: new Date(
      cycle.resetAt.getTime() +
        intervalMs,
    ),
  }
}
