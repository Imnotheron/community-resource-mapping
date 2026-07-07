export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

const ONLINE_WINDOW_MS = 2 * 60 * 1000

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

function withPresence(user: any) {
  const lastSeenAt = user.lastSeenAt ? new Date(user.lastSeenAt) : null
  const lastSeenTime = lastSeenAt?.getTime() || 0
  const recentlySeen =
    lastSeenTime > 0 && Date.now() - lastSeenTime <= ONLINE_WINDOW_MS

  return {
    ...user,
    isOnline: Boolean(user.isOnline && recentlySeen),
    onlineStatus: user.isOnline && recentlySeen ? 'ONLINE' : 'OFFLINE',
    lastSeenAt: lastSeenAt ? lastSeenAt.toISOString() : null,
  }
}

export async function GET(request: NextRequest) {
  try {
    await ensureOnlineColumns()

    const rows = await db.$queryRaw<any[]>`
      SELECT
        "id",
        "name",
        "email",
        "role",
        "phone",
        "profilePicture",
        "createdAt",
        "updatedAt",
        "isOnline",
        "lastSeenAt"
      FROM "User"
      ORDER BY "createdAt" DESC
    `

    const vulnerableProfiles = await db.vulnerableProfile.findMany({
      select: {
        id: true,
        userId: true,
        registrationStatus: true,
      },
    })

    const profileByUserId = new Map(
      vulnerableProfiles.map((profile) => [profile.userId, profile])
    )

    const users = rows.map((user) =>
      withPresence({
        ...user,
        vulnerableProfile: profileByUserId.get(user.id) || null,
        accountStatus: 'ACTIVE',
        _count: {
          reliefDistributions: 0,
          assignedAsWorker: 0,
          feedback: 0,
          generalFeedback: 0,
          fieldNotes: 0,
          notifications: 0,
        },
      })
    )

    return NextResponse.json({
      success: true,
      users,
      onlineWindowMs: ONLINE_WINDOW_MS,
    })
  } catch (error) {
    console.error('Error fetching users:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch users',
        details: String(error),
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureOnlineColumns()

    const body = await request.json()
    const { name, email, password, role, phone } = body

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { success: false, error: 'Name, email, password, and role are required' },
        { status: 400 }
      )
    }

    if (role !== 'WORKER' && role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Only WORKER and ADMIN roles can be created' },
        { status: 400 }
      )
    }

    const cleanEmail = String(email).trim().toLowerCase()

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      )
    }

    if (String(password).length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    const existingRows = await db.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "User"
      WHERE lower("email") = lower(${cleanEmail})
      LIMIT 1
    `

    if (existingRows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Email already exists' },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const now = new Date()

    await db.$executeRaw`
      INSERT INTO "User" (
        "id",
        "name",
        "email",
        "password",
        "role",
        "phone",
        "createdAt",
        "updatedAt",
        "isOnline",
        "lastSeenAt"
      )
      VALUES (
        lower(hex(randomblob(16))),
        ${String(name).trim()},
        ${cleanEmail},
        ${hashedPassword},
        ${role},
        ${phone || null},
        ${now},
        ${now},
        false,
        null
      )
    `

    const createdRows = await db.$queryRaw<any[]>`
      SELECT
        "id",
        "name",
        "email",
        "role",
        "phone",
        "createdAt",
        "isOnline",
        "lastSeenAt"
      FROM "User"
      WHERE lower("email") = lower(${cleanEmail})
      LIMIT 1
    `

    return NextResponse.json(
      {
        success: true,
        user: withPresence({
          ...createdRows[0],
          vulnerableProfile: null,
          accountStatus: 'ACTIVE',
        }),
        message: `${role === 'WORKER' ? 'Worker' : 'Admin'} account created successfully`,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating user:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create user',
        details: String(error),
      },
      { status: 500 }
    )
  }
}