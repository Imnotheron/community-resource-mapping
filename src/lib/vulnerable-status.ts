import { db } from '@/lib/db'

export const VULNERABLE_PROFILE_STATUSES = [
  'ACTIVE',
  'RECOVERED',
  'INACTIVE',
  'RELOCATED',
  'DECEASED',
] as const

export type VulnerableProfileStatus =
  (typeof VULNERABLE_PROFILE_STATUSES)[number]

type StatusRow = {
  profileId: string
  status: string
  reason: string | null
  updatedAt: string | Date | null
  updatedBy: string | null
}

export async function ensureVulnerableStatusTable() {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "VulnerableProfileStatus" (
      "profileId" TEXT PRIMARY KEY NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'ACTIVE',
      "reason" TEXT,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedBy" TEXT
    )
  `)
}

export async function getVulnerableStatuses(profileIds?: string[]) {
  await ensureVulnerableStatusTable()

  let rows: StatusRow[] = []

  if (profileIds?.length) {
    const placeholders = profileIds.map(() => '?').join(', ')
    rows = await db.$queryRawUnsafe<StatusRow[]>(
      `SELECT "profileId", "status", "reason", "updatedAt", "updatedBy"
       FROM "VulnerableProfileStatus"
       WHERE "profileId" IN (${placeholders})`,
      ...profileIds,
    )
  } else {
    rows = await db.$queryRawUnsafe<StatusRow[]>(
      `SELECT "profileId", "status", "reason", "updatedAt", "updatedBy"
       FROM "VulnerableProfileStatus"`,
    )
  }

  return new Map(
    rows.map((row) => [
      row.profileId,
      {
        status: String(row.status || 'ACTIVE').toUpperCase(),
        reason: row.reason || null,
        updatedAt: row.updatedAt || null,
        updatedBy: row.updatedBy || null,
      },
    ]),
  )
}

export async function setVulnerableStatus(input: {
  profileId: string
  status: VulnerableProfileStatus
  reason?: string | null
  updatedBy: string
}) {
  await ensureVulnerableStatusTable()

  await db.$executeRawUnsafe(
    `INSERT INTO "VulnerableProfileStatus"
      ("profileId", "status", "reason", "updatedAt", "updatedBy")
     VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?)
     ON CONFLICT("profileId") DO UPDATE SET
       "status" = excluded."status",
       "reason" = excluded."reason",
       "updatedAt" = CURRENT_TIMESTAMP,
       "updatedBy" = excluded."updatedBy"`,
    input.profileId,
    input.status,
    input.reason || null,
    input.updatedBy,
  )

  return {
    profileId: input.profileId,
    status: input.status,
    reason: input.reason || null,
    updatedBy: input.updatedBy,
  }
}
