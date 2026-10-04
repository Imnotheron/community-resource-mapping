import { db } from '@/lib/db'

type CycleResetRow = {
  id: number
  resetAt: string | Date
  resetBy: string
}

type CycleSettingsRow = {
  id: number
  autoResetAt: string | Date | null
  updatedAt: string | Date
  updatedBy: string | null
}

type TableInfoRow = {
  name: string
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
      "autoResetAt" DATETIME,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedBy" TEXT,
      CHECK ("id" = 1)
    )
  `)

  const columns =
    await db.$queryRawUnsafe<TableInfoRow[]>(
      'PRAGMA table_info("MapReliefCycleSettings")',
    )

  if (
    !columns.some(
      (column) =>
        column.name === 'autoResetAt',
    )
  ) {
    await db.$executeRawUnsafe(
      'ALTER TABLE "MapReliefCycleSettings" ADD COLUMN "autoResetAt" DATETIME',
    )
  }

  await db.$executeRawUnsafe(`
    INSERT OR IGNORE INTO "MapReliefCycleSettings"
      ("id", "resetIntervalDays", "autoResetAt", "updatedAt", "updatedBy")
    VALUES (1, NULL, NULL, CURRENT_TIMESTAMP, NULL)
  `)
}

export async function getLatestMapCycleResetBefore(
  cutoff: Date,
) {
  await ensureMapReliefCycleTable()

  const rows =
    await db.$queryRawUnsafe<CycleResetRow[]>(
      `SELECT "id", "resetAt", "resetBy"
       FROM "MapReliefCycleReset"
       WHERE datetime("resetAt") <= datetime(?)
       ORDER BY datetime("resetAt") DESC
       LIMIT 1`,
      cutoff.toISOString(),
    )

  const row = rows[0]
  if (!row) return null

  const resetAt =
    new Date(row.resetAt)

  if (
    Number.isNaN(
      resetAt.getTime(),
    )
  ) {
    return null
  }

  return {
    id: Number(row.id),
    resetAt,
    resetBy: row.resetBy,
  }
}

export async function getMapReliefCycleSettings() {
  await ensureMapReliefCycleTable()

  const rows =
    await db.$queryRawUnsafe<CycleSettingsRow[]>(
      `SELECT "id", "autoResetAt", "updatedAt", "updatedBy"
       FROM "MapReliefCycleSettings"
       WHERE "id" = 1
       LIMIT 1`,
    )

  const row = rows[0]

  const updatedAt =
    row?.updatedAt
      ? new Date(row.updatedAt)
      : new Date()

  const autoResetAt =
    row?.autoResetAt
      ? new Date(row.autoResetAt)
      : null

  return {
    autoResetAt:
      autoResetAt &&
      !Number.isNaN(
        autoResetAt.getTime(),
      )
        ? autoResetAt
        : null,
    updatedAt:
      Number.isNaN(
        updatedAt.getTime(),
      )
        ? new Date()
        : updatedAt,
    updatedBy:
      row?.updatedBy || null,
  }
}

export async function updateMapReliefCycleSettings(
  autoResetAt: Date | null,
  updatedBy: string,
) {
  await ensureMapReliefCycleTable()

  await db.$executeRawUnsafe(
    `UPDATE "MapReliefCycleSettings"
     SET "autoResetAt" = ?,
         "resetIntervalDays" = NULL,
         "updatedAt" = CURRENT_TIMESTAMP,
         "updatedBy" = ?
     WHERE "id" = 1`,
    autoResetAt
      ? autoResetAt.toISOString()
      : null,
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
      new Date(
        Date.now() + 60_000,
      ),
    )

  return {
    resetAt:
      latest?.resetAt ||
      new Date(),
    resetBy,
  }
}

export async function maybeAutoResetMapReliefCycle(
  now = new Date(),
) {
  await ensureMapReliefCycleTable()

  const settings =
    await getMapReliefCycleSettings()

  const scheduled =
    settings.autoResetAt

  if (!scheduled) {
    return {
      reset: false,
      autoResetAt: null,
    }
  }

  if (now < scheduled) {
    return {
      reset: false,
      autoResetAt: scheduled,
    }
  }

  // Claim the scheduled reset before creating a new cycle.
  // Only the first request that clears the exact stored timestamp wins.
  const claimed =
    await db.$executeRawUnsafe(
      `UPDATE "MapReliefCycleSettings"
       SET "autoResetAt" = NULL,
           "updatedAt" = CURRENT_TIMESTAMP,
           "updatedBy" = 'SYSTEM_AUTO_RESET'
       WHERE "id" = 1
         AND "autoResetAt" = ?`,
      scheduled.toISOString(),
    )

  if (!claimed) {
    const latestSettings =
      await getMapReliefCycleSettings()

    return {
      reset: false,
      autoResetAt:
        latestSettings.autoResetAt,
    }
  }

  const cycle =
    await startNewMapReliefCycle(
      'SYSTEM_AUTO_RESET',
    )

  return {
    reset: true,
    resetAt: cycle.resetAt,
    autoResetAt: null,
  }
}
