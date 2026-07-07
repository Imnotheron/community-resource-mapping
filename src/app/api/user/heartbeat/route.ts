export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type UserColumn = {
  name: string
}

async function getUserColumns() {
  const columns = await db.$queryRaw<UserColumn[]>`
    PRAGMA table_info("User")
  `

  return new Set(columns.map((column) => column.name))
}

async function ensureOnlineColumns() {
  const columns = await getUserColumns()

  if (!columns.has('isOnline')) {
    await db.$executeRawUnsafe(`
      ALTER TABLE "User"
      ADD COLUMN "isOnline" BOOLEAN NOT NULL DEFAULT false
    `)
  }

  const afterOnline = await getUserColumns()

  if (!afterOnline.has('lastSeenAt')) {
    await db.$executeRawUnsafe(`
      ALTER TABLE "User"
      ADD COLUMN "lastSeenAt" DATETIME
    `)
  }
}

function getUserId(request: NextRequest, body: any) {
  return (
    body?.userId ||
    request.headers.get('x-user-id') ||
    request.headers.get('X-User-Id') ||
    ''
  )
}

export async function POST(request: NextRequest) {
  try {
    await ensureOnlineColumns()

    const body = await request.json().catch(() => ({}))
    const userId = getUserId(request, body)

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      )
    }

    const now = new Date()

    await db.$executeRaw`
      UPDATE "User"
      SET
        "isOnline" = true,
        "lastSeenAt" = ${now},
        "updatedAt" = ${now}
      WHERE "id" = ${userId}
    `

    return NextResponse.json({
      success: true,
      isOnline: true,
      lastSeenAt: now.toISOString(),
    })
  } catch (error: any) {
    console.error('Heartbeat failed:', error)

    return NextResponse.json(
      {
        success: false,
        message: error?.message || 'Heartbeat failed',
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await ensureOnlineColumns()

    const body = await request.json().catch(() => ({}))
    const userId = getUserId(request, body)

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      )
    }

    const now = new Date()

    await db.$executeRaw`
      UPDATE "User"
      SET
        "isOnline" = false,
        "lastSeenAt" = ${now},
        "updatedAt" = ${now}
      WHERE "id" = ${userId}
    `

    return NextResponse.json({
      success: true,
      isOnline: false,
      lastSeenAt: now.toISOString(),
    })
  } catch (error: any) {
    console.error('Offline update failed:', error)

    return NextResponse.json(
      {
        success: false,
        message: error?.message || 'Offline update failed',
      },
      { status: 500 }
    )
  }
}