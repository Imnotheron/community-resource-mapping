export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { requireRequestUser } from '@/lib/request-user-session'

type RouteParams = {
  params: Promise<{ id?: string }> | { id?: string }
}

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

async function readParams(params: RouteParams['params']) {
  return await Promise.resolve(params)
}

function getIdFromRequest(request: NextRequest, params: { id?: string }) {
  if (params.id) return params.id
  const parts = request.nextUrl.pathname.split('/').filter(Boolean)
  return parts[parts.length - 1] || ''
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
}

async function roleForRequest(request: NextRequest) {
  const auth = await requireRequestUser(request)
  return 'error' in auth ? 'PUBLIC' : auth.role
}

function mayRead(row: AnnouncementRow, role: string) {
  const active = row.isActive === true || row.isActive === 1 || row.isActive === '1'
  if (role === 'ADMIN') return true
  if (!active) return false

  const target = String(row.targetRole || 'ALL').toUpperCase()
  if (!target || target === 'ALL') return true
  if (role === 'PUBLIC') return false
  return target === role
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await ensureAnnouncementTable()

    const resolvedParams = await readParams(params)
    const id = getIdFromRequest(request, resolvedParams)

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Announcement ID is required.' },
        { status: 400 },
      )
    }

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
      id,
    )

    const row = rows[0]
    if (!row) {
      return NextResponse.json(
        { success: false, message: 'Announcement not found.' },
        { status: 404 },
      )
    }

    const role = await roleForRequest(request)
    if (!mayRead(row, role)) {
      return NextResponse.json(
        { success: false, message: 'Announcement not found.' },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success: true,
      announcement: normalizeRow(row),
    })
  } catch (error: any) {
    console.error('Failed to load announcement:', error)

    return NextResponse.json(
      {
        success: false,
        message: error?.message || 'Failed to load announcement.',
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireRequestUser(request, {
      allowedRoles: ['ADMIN'],
    })
    if ('error' in auth) return auth.error

    await ensureAnnouncementTable()

    const resolvedParams = await readParams(params)
    const id = getIdFromRequest(request, resolvedParams)

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Announcement ID is required.' },
        { status: 400 },
      )
    }

    const now = new Date().toISOString()
    const result = await db.$executeRawUnsafe(
      `
        UPDATE "Announcement"
        SET "isActive" = false, "updatedAt" = ?
        WHERE "id" = ? AND "isActive" = true
      `,
      now,
      id,
    )

    const affected = Number(result || 0)
    if (affected === 0) {
      return NextResponse.json(
        { success: false, message: 'Active announcement not found.' },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Announcement removed from active views.',
      affected,
    })
  } catch (error: any) {
    console.error('Failed to delete announcement:', error)

    return NextResponse.json(
      {
        success: false,
        message: error?.message || 'Failed to delete announcement.',
      },
      { status: 500 },
    )
  }
}
