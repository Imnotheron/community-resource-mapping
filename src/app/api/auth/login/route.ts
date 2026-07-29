export const dynamic = 'force-dynamic'

import bcrypt from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'

import {
  AUTH_COOKIE_MAX_AGE,
  AUTH_COOKIE_NAME,
  createAuthToken,
} from '@/lib/auth-token'
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
        { success: false, message: 'Missing required fields' },
        { status: 400 },
      )
    }

    await ensureOnboardingColumns()

    const cleanEmail = String(email).trim().toLowerCase()
    const cleanRole = String(role).trim().toUpperCase()

    if (!['ADMIN', 'WORKER', 'VULNERABLE'].includes(cleanRole)) {
      return NextResponse.json(
        { success: false, message: 'Invalid role access' },
        { status: 403 },
      )
    }

    const user = await db.user.findUnique({
      where: { email: cleanEmail },
      select: userSelect,
    })

    if (!user || String(user.role).toUpperCase() !== cleanRole) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 },
      )
    }

    const isValidPassword = await bcrypt.compare(
      String(password),
      user.password,
    )

    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 },
      )
    }

    const token = await createAuthToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role.toLowerCase(),
        phone: user.phone || null,
        profilePicture: user.profilePicture,
        registrationStatus:
          user.vulnerableProfile?.registrationStatus || null,
        temporaryPasswordIssued: Boolean(user.temporaryPasswordIssued),
        passwordChangedAt: user.passwordChangedAt?.toISOString() || null,
        onboardingReminderDismissedAt:
          user.onboardingReminderDismissedAt?.toISOString() || null,
      },
      token,
    })

    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: AUTH_COOKIE_MAX_AGE,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Login error:', error)

    return NextResponse.json(
      { success: false, message: 'Login failed. Please try again.' },
      { status: 500 },
    )
  }
}
