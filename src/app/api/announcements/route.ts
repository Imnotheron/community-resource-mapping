export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendAnnouncementEmailNotifications } from '@/lib/announcement-email'

const ANNOUNCEMENT_TYPES = new Set([
  'GENERAL',
  'EMERGENCY',
  'RELIEF',
  'RELIEF_DISTRIBUTION',
  'MEETING',
  'HEALTH',
  'WEATHER',
  'SYSTEM',
  'IMPORTANT',
])

const PRIORITIES = new Set(['LOW', 'NORMAL', 'HIGH', 'URGENT'])
const TARGET_ROLES = new Set(['ALL', 'ADMIN', 'WORKER', 'VULNERABLE'])

type AnnouncementRow = {
  id: string
  title: string
  content: string
  type: string
  targetRole: string | null
  eventDate: string | Date | null
  eventTime: string | null
  location: string | null
  isActive: boolean | number | string
  priority: string
  createdBy: string
  createdAt: string | Date
  updatedAt: string | Date
}

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().replace(/-/g, '')
  }

  return `ann_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

function cleanText(value: unknown) {
  return String(value || '').trim()
}

function toIsoDate(value: unknown) {
  const text = cleanText(value)
  if (!text) return null

  const date = new Date(text)
  if (Number.isNaN(date.getTime())) return null

  return date.toISOString()
}

function normalizeType(value: unknown) {
  const normalized = cleanText(value).toUpperCase().replace(/[\s-]+/g, '_')
  return ANNOUNCEMENT_TYPES.has(normalized) ? normalized : 'GENERAL'
}

function normalizePriority(value: unknown) {
  const normalized = cleanText(value).toUpperCase().replace(/[\s-]+/g, '_')
  return PRIORITIES.has(normalized) ? normalized : 'NORMAL'
}

function normalizeTargetRole(value: unknown) {
  const raw = cleanText(value).toUpperCase()
  if (!raw || raw === 'EVERYONE' || raw === 'ALL USERS' || raw === 'ALL') return 'ALL'
  if (raw.includes('WORKER')) return 'WORKER'
  if (raw.includes('CITIZEN') || raw.includes('VULNERABLE')) return 'VULNERABLE'
  if (raw.includes('ADMIN')) return 'ADMIN'

  const normalized = raw.replace(/[\s-]+/g, '_')
  return TARGET_ROLES.has(normalized) ? normalized : 'ALL'
}

function normalizeTime(value: unknown) {
  const text = cleanText(value)
  if (!text) return null

  // Accept browser input type="time" values like HH:mm or HH:mm:ss.
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(text)) return text.slice(0, 5)

  return text.slice(0, 30)
}

function normalizeRow(row: AnnouncementRow) {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    type: row.type || 'GENERAL',
    targetRole: row.targetRole || 'ALL',
    eventDate: row.eventDate ? new Date(row.eventDate).toISOString() : null,
    eventTime: row.eventTime || null,
    location: row.location || null,
    isActive: row.isActive === true || row.isActive === 1 || row.isActive === '1',
    priority: row.priority || 'NORMAL',
    createdBy: row.createdBy,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
  }
}

async function getColumns(tableName: string) {
  const columns = await db.$queryRawUnsafe<Array<{ name: string }>>(
    `PRAGMA table_info("${tableName}")`
  )

  return new Set(columns.map((column) => column.name))
}

async function ensureAnnouncementTable() {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Announcement" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "title" TEXT NOT NULL,
      "content" TEXT NOT NULL,
      "type" TEXT NOT NULL DEFAULT 'GENERAL',
      "targetRole" TEXT,
      "eventDate" DATETIME,
      "eventTime" TEXT,
      "location" TEXT,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "priority" TEXT NOT NULL DEFAULT 'NORMAL',
      "createdBy" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  const columns = await getColumns('Announcement')

  const addColumn = async (name: string, sql: string) => {
    if (!columns.has(name)) {
      await db.$executeRawUnsafe(`ALTER TABLE "Announcement" ADD COLUMN ${sql}`)
    }
  }

  await addColumn('type', '"type" TEXT NOT NULL DEFAULT \'GENERAL\'')
  await addColumn('targetRole', '"targetRole" TEXT')
  await addColumn('eventDate', '"eventDate" DATETIME')
  await addColumn('eventTime', '"eventTime" TEXT')
  await addColumn('location', '"location" TEXT')
  await addColumn('isActive', '"isActive" BOOLEAN NOT NULL DEFAULT true')
  await addColumn('priority', '"priority" TEXT NOT NULL DEFAULT \'NORMAL\'')
  await addColumn('createdBy', '"createdBy" TEXT NOT NULL DEFAULT \'SYSTEM\'')
  await addColumn('createdAt', '"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP')
  await addColumn('updatedAt', '"updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP')
}

async function createNotificationsForTarget(announcement: {
  id: string
  title: string
  content: string
  targetRole: string
}) {
  // Notifications are a convenience, not a blocker. If the current schema is older,
  // the announcement should still be created successfully.
  try {
    const notificationColumns = await getColumns('Notification')
    if (!notificationColumns.has('userId')) return

    const users = await db.user.findMany({
      where:
        announcement.targetRole === 'ALL'
          ? {}
          : { role: announcement.targetRole },
      select: { id: true },
      take: 500,
    })

    if (users.length === 0) return

    await db.notification.createMany({
      data: users.map((user) => ({
        userId: user.id,
        type: 'ANNOUNCEMENT',
        title: announcement.title,
        message: announcement.content,
        status: 'PENDING',
      })),
      skipDuplicates: true,
    })
  } catch (error) {
    console.warn('Announcement created, but notification fan-out was skipped:', error)
  }
}

export async function GET(request: NextRequest) {
  try {
    await ensureAnnouncementTable()

    const requestedRole = normalizeTargetRole(
      request.nextUrl.searchParams.get('userRole') || request.nextUrl.searchParams.get('role') || 'ALL'
    )
    const includeInactive = request.nextUrl.searchParams.get('includeInactive') === 'true'

    const rows = await db.$queryRawUnsafe<AnnouncementRow[]>(
      `
        SELECT
          "id",
          "title",
          "content",
          "type",
          "targetRole",
          "eventDate",
          "eventTime",
          "location",
          "isActive",
          "priority",
          "createdBy",
          "createdAt",
          "updatedAt"
        FROM "Announcement"
        WHERE
          (${includeInactive ? '1 = 1' : '"isActive" = true'})
          AND (
            "targetRole" IS NULL
            OR "targetRole" = ''
            OR "targetRole" = 'ALL'
            OR "targetRole" = ?
            OR ? = 'ADMIN'
          )
        ORDER BY
          CASE "priority"
            WHEN 'URGENT' THEN 1
            WHEN 'HIGH' THEN 2
            WHEN 'NORMAL' THEN 3
            WHEN 'LOW' THEN 4
            ELSE 5
          END,
          "createdAt" DESC
      `,
      requestedRole,
      requestedRole
    )

    return NextResponse.json({
      success: true,
      announcements: rows.map(normalizeRow),
    })
  } catch (error: any) {
    console.error('Failed to load announcements:', error)

    return NextResponse.json(
      {
        success: false,
        message: error?.message || 'Failed to load announcements.',
        details: String(error),
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureAnnouncementTable()

    const body = await request.json().catch(() => ({}))

    const title = cleanText(body.title)
    const content = cleanText(body.content)
    const type = normalizeType(body.type)
    const priority = normalizePriority(body.priority)
    const targetRole = normalizeTargetRole(body.targetRole || body.audience)
    const eventDate = toIsoDate(body.eventDate)
    const eventTime = normalizeTime(body.eventTime)
    const location = cleanText(body.location) || null
    const createdBy =
      cleanText(body.createdBy || body.requesterId || body.adminId) ||
      cleanText(request.headers.get('x-user-id')) ||
      'SYSTEM'
    const shouldSendEmail = body.sendEmail !== false

    if (title.length < 3) {
      return NextResponse.json(
        { success: false, message: 'Announcement title must be at least 3 characters.' },
        { status: 400 }
      )
    }

    if (content.length < 5) {
      return NextResponse.json(
        { success: false, message: 'Announcement content must be at least 5 characters.' },
        { status: 400 }
      )
    }

    const id = createId()
    const now = new Date().toISOString()

    await db.$executeRawUnsafe(
      `
        INSERT INTO "Announcement" (
          "id",
          "title",
          "content",
          "type",
          "targetRole",
          "eventDate",
          "eventTime",
          "location",
          "isActive",
          "priority",
          "createdBy",
          "createdAt",
          "updatedAt"
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, true, ?, ?, ?, ?)
      `,
      id,
      title,
      content,
      type,
      targetRole,
      eventDate,
      eventTime,
      location,
      priority,
      createdBy,
      now,
      now
    )

    const rows = await db.$queryRawUnsafe<AnnouncementRow[]>(
      `
        SELECT
          "id",
          "title",
          "content",
          "type",
          "targetRole",
          "eventDate",
          "eventTime",
          "location",
          "isActive",
          "priority",
          "createdBy",
          "createdAt",
          "updatedAt"
        FROM "Announcement"
        WHERE "id" = ?
        LIMIT 1
      `,
      id
    )

    const announcement = normalizeRow(rows[0])

    await createNotificationsForTarget({
      id: announcement.id,
      title: announcement.title,
      content: announcement.content,
      targetRole: announcement.targetRole || 'ALL',
    })

    const emailNotification = shouldSendEmail
      ? await sendAnnouncementEmailNotifications({
          id: announcement.id,
          title: announcement.title,
          content: announcement.content,
          type: announcement.type,
          priority: announcement.priority,
          targetRole: announcement.targetRole || 'ALL',
          eventDate: announcement.eventDate,
          eventTime: announcement.eventTime,
          location: announcement.location,
          createdAt: announcement.createdAt,
        })
      : {
          configured: false,
          skipped: true,
          sent: 0,
          failed: 0,
          attempted: 0,
          recipients: 0,
          skippedNoEmail: 0,
          message: 'Email notification was disabled for this request.',
        }

    return NextResponse.json(
      {
        success: true,
        message: 'Announcement published successfully.',
        announcement,
        emailNotification,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Failed to create announcement:', error)

    return NextResponse.json(
      {
        success: false,
        message: error?.message || 'Failed to create announcement.',
        details: String(error),
      },
      { status: 500 }
    )
  }
}
