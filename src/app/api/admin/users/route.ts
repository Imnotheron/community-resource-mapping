export const dynamic = 'force-dynamic'

import bcrypt from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'

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

async function ensureUserManagementColumns() {
  let columns = await getUserColumns()

  if (!columns.has('isOnline')) {
    await db.$executeRawUnsafe(`
      ALTER TABLE "User"
      ADD COLUMN "isOnline" BOOLEAN NOT NULL DEFAULT false
    `)
  }

  columns = await getUserColumns()

  if (!columns.has('lastSeenAt')) {
    await db.$executeRawUnsafe(`
      ALTER TABLE "User"
      ADD COLUMN "lastSeenAt" DATETIME
    `)
  }

  columns = await getUserColumns()

  if (!columns.has('temporaryPasswordIssued')) {
    await db.$executeRawUnsafe(`
      ALTER TABLE "User"
      ADD COLUMN "temporaryPasswordIssued"
      BOOLEAN NOT NULL DEFAULT false
    `)
  }

  columns = await getUserColumns()

  if (!columns.has('passwordChangedAt')) {
    await db.$executeRawUnsafe(`
      ALTER TABLE "User"
      ADD COLUMN "passwordChangedAt" DATETIME
    `)
  }

  columns = await getUserColumns()

  if (!columns.has('onboardingReminderDismissedAt')) {
    await db.$executeRawUnsafe(`
      ALTER TABLE "User"
      ADD COLUMN "onboardingReminderDismissedAt" DATETIME
    `)
  }
}

function toIsoString(value: unknown) {
  if (!value) return null

  const parsed = new Date(String(value))

  return Number.isNaN(parsed.getTime())
    ? null
    : parsed.toISOString()
}

function withPresence(user: any) {
  const lastSeenAt = user.lastSeenAt
    ? new Date(user.lastSeenAt)
    : null
  const lastSeenTime = lastSeenAt?.getTime() || 0
  const recentlySeen =
    lastSeenTime > 0 &&
    Date.now() - lastSeenTime <= ONLINE_WINDOW_MS

  return {
    ...user,
    isOnline: Boolean(user.isOnline && recentlySeen),
    onlineStatus:
      user.isOnline && recentlySeen ? 'ONLINE' : 'OFFLINE',
    lastSeenAt: lastSeenAt
      ? lastSeenAt.toISOString()
      : null,
  }
}

function withAccountSetup(user: any) {
  const temporaryPasswordIssued = Boolean(
    user.temporaryPasswordIssued,
  )
  const passwordChangedAt = toIsoString(
    user.passwordChangedAt,
  )
  const onboardingReminderDismissedAt = toIsoString(
    user.onboardingReminderDismissedAt,
  )

  let accountSetupStatus:
    | 'PASSWORD_CHANGE_REQUIRED'
    | 'SETUP_COMPLETE'
    | 'ACTIVE'

  if (
    temporaryPasswordIssued &&
    !passwordChangedAt
  ) {
    accountSetupStatus =
      'PASSWORD_CHANGE_REQUIRED'
  } else if (passwordChangedAt) {
    accountSetupStatus = 'SETUP_COMPLETE'
  } else {
    accountSetupStatus = 'ACTIVE'
  }

  return {
    ...user,
    temporaryPasswordIssued,
    passwordChangedAt,
    onboardingReminderDismissedAt,
    accountSetupStatus,
    accountStatus: 'ACTIVE',
  }
}

export async function GET(
  request: NextRequest,
) {
  try {
    await ensureUserManagementColumns()

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
        "lastSeenAt",
        "temporaryPasswordIssued",
        "passwordChangedAt",
        "onboardingReminderDismissedAt"
      FROM "User"
      ORDER BY "createdAt" DESC
    `

    const vulnerableProfiles =
      await db.vulnerableProfile.findMany({
        select: {
          id: true,
          userId: true,
          registrationStatus: true,
        },
      })

    const profileByUserId = new Map(
      vulnerableProfiles.map((profile) => [
        profile.userId,
        profile,
      ]),
    )

    const users = rows.map((user) =>
      withPresence(
        withAccountSetup({
          ...user,
          vulnerableProfile:
            profileByUserId.get(user.id) || null,
          _count: {
            reliefDistributions: 0,
            assignedAsWorker: 0,
            feedback: 0,
            generalFeedback: 0,
            fieldNotes: 0,
            notifications: 0,
          },
        }),
      ),
    )

    return NextResponse.json({
      success: true,
      users,
      onlineWindowMs: ONLINE_WINDOW_MS,
    })
  } catch (error) {
    console.error(
      'Error fetching users:',
      error,
    )

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch users',
        details: String(error),
      },
      { status: 500 },
    )
  }
}

export async function POST(
  request: NextRequest,
) {
  try {
    await ensureUserManagementColumns()

    const body = await request.json()
    const {
      name,
      email,
      password,
      role,
      phone,
    } = body

    if (
      !name ||
      !email ||
      !password ||
      !role
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Name, email, password, and role are required',
        },
        { status: 400 },
      )
    }

    if (
      role !== 'WORKER' &&
      role !== 'ADMIN'
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Only WORKER and ADMIN roles can be created',
        },
        { status: 400 },
      )
    }

    const cleanEmail = String(email)
      .trim()
      .toLowerCase()

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid email format',
        },
        { status: 400 },
      )
    }

    if (String(password).length < 8) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Password must be at least 8 characters',
        },
        { status: 400 },
      )
    }

    const existingRows =
      await db.$queryRaw<
        Array<{ id: string }>
      >`
        SELECT "id"
        FROM "User"
        WHERE lower("email") =
          lower(${cleanEmail})
        LIMIT 1
      `

    if (existingRows.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email already exists',
        },
        { status: 400 },
      )
    }

    const hashedPassword =
      await bcrypt.hash(password, 10)
    const now = new Date()

    await db.$executeRaw`
      INSERT INTO "User" (
        "id",
        "name",
        "email",
        "password",
        "role",
        "phone",
        "temporaryPasswordIssued",
        "passwordChangedAt",
        "onboardingReminderDismissedAt",
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
        true,
        NULL,
        NULL,
        ${now},
        ${now},
        false,
        NULL
      )
    `

    const createdRows =
      await db.$queryRaw<any[]>`
        SELECT
          "id",
          "name",
          "email",
          "role",
          "phone",
          "profilePicture",
          "createdAt",
          "isOnline",
          "lastSeenAt",
          "temporaryPasswordIssued",
          "passwordChangedAt",
          "onboardingReminderDismissedAt"
        FROM "User"
        WHERE lower("email") =
          lower(${cleanEmail})
        LIMIT 1
      `

    return NextResponse.json(
      {
        success: true,
        user: withPresence(
          withAccountSetup({
            ...createdRows[0],
            vulnerableProfile: null,
          }),
        ),
        message: `${
          role === 'WORKER'
            ? 'Worker'
            : 'Admin'
        } account created successfully`,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error(
      'Error creating user:',
      error,
    )

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create user',
        details: String(error),
      },
      { status: 500 },
    )
  }
}
