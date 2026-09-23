export const dynamic = 'force-dynamic'

import bcrypt from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { issueLoginOtp } from '@/lib/login-otp'

type UserColumn = {
  name: string
}

async function getUserColumns() {
  const columns = await db.$queryRaw<UserColumn[]>`
    PRAGMA table_info("User")
  `

  return new Set(columns.map((column) => column.name))
}

async function ensureOnboardingColumns() {
  let columns = await getUserColumns()

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

const userSelect = {
  id: true,
  email: true,
  name: true,
  password: true,
  role: true,
  phone: true,
  profilePicture: true,
  temporaryPasswordIssued: true,
  passwordChangedAt: true,
  onboardingReminderDismissedAt: true,
  createdAt: true,
  vulnerableProfile: {
    select: {
      id: true,
      registrationStatus: true,
    },
  },
} as const

export async function POST(request: NextRequest) {
  try {
    const { email, password, role } = await request.json()

    if (!email || !password || !role) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing required fields',
        },
        { status: 400 },
      )
    }

    await ensureOnboardingColumns()

    const cleanEmail = String(email).trim()
    const cleanRole = String(role).trim().toUpperCase()

    let user = await db.user.findUnique({
      where: { email: cleanEmail },
      select: userSelect,
    })

    if (!user && cleanEmail !== cleanEmail.toLowerCase()) {
      user = await db.user.findUnique({
        where: { email: cleanEmail.toLowerCase() },
        select: userSelect,
      })
    }

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid credentials',
        },
        { status: 401 },
      )
    }

    if (String(user.role).toUpperCase() !== cleanRole) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid role access',
        },
        { status: 403 },
      )
    }

    const isValidPassword = await bcrypt.compare(
      String(password),
      user.password,
    )

    if (!isValidPassword) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid credentials',
        },
        { status: 401 },
      )
    }

    try {
      const challenge = await issueLoginOtp({
        userId: user.id,
        email: user.email,
        name: user.name,
      })

      return NextResponse.json({
        success: true,
        otpRequired: true,
        message:
          'A verification code was sent to your email.',
        ...challenge,
      })
    } catch (error) {
      const retryAfterSeconds =
        error instanceof Error &&
        'retryAfterSeconds' in error
          ? Number(
              (
                error as Error & {
                  retryAfterSeconds?: number
                }
              ).retryAfterSeconds,
            )
          : undefined

      return NextResponse.json(
        {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : 'Unable to send the verification code.',
          ...(retryAfterSeconds
            ? { retryAfterSeconds }
            : {}),
        },
        {
          status: retryAfterSeconds ? 429 : 503,
        },
      )
    }
  } catch (error) {
    console.error('Login error:', error)

    return NextResponse.json(
      {
        success: false,
        message:
          'Login failed: ' +
          (error instanceof Error
            ? error.message
            : String(error)),
      },
      { status: 500 },
    )
  }
}