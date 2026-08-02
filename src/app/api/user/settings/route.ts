export const dynamic = 'force-dynamic'

import bcrypt from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { requireMatchingRequestUser } from '@/lib/request-user-session'

type ThemeChoice = 'light' | 'dark'
type AccentColor = 'emerald' | 'teal' | 'green' | 'amber'
type FontSizeChoice = 'small' | 'medium' | 'large'

type UserPreferences = {
  theme?: ThemeChoice
  accent?: AccentColor
  fontSize?: FontSizeChoice
  [key: string]: unknown
}

type UserColumn = {
  name: string
}

const DEVELOPMENT = process.env.NODE_ENV !== 'production'

function normalizeTheme(value: unknown): ThemeChoice | null {
  return value === 'light' || value === 'dark' ? value : null
}

function normalizeAccent(value: unknown): AccentColor | null {
  return value === 'emerald' ||
    value === 'teal' ||
    value === 'green' ||
    value === 'amber'
    ? value
    : null
}

function normalizeFontSize(value: unknown): FontSizeChoice | null {
  return value === 'small' || value === 'medium' || value === 'large'
    ? value
    : null
}

function parsePreferences(
  value: string | null | undefined,
): UserPreferences {
  if (!value) return {}

  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch (error) {
    console.warn('Invalid user preferences JSON:', error)
    return {}
  }
}

function serializeUser(user: any) {
  const preferences = parsePreferences(user.preferences)

  return {
    ...user,
    theme: normalizeTheme(preferences.theme) || 'light',
    accent: normalizeAccent(preferences.accent) || 'emerald',
    fontSize: normalizeFontSize(preferences.fontSize) || 'medium',
  }
}

async function getUserColumns() {
  const columns = await db.$queryRaw<UserColumn[]>`
    PRAGMA table_info("User")
  `

  return new Set(columns.map((column) => column.name))
}

async function ensureSettingsColumns() {
  let columns = await getUserColumns()

  if (!columns.has('preferences')) {
    await db.$executeRawUnsafe(`
      ALTER TABLE "User"
      ADD COLUMN "preferences" TEXT
    `)
  }

  columns = await getUserColumns()

  if (!columns.has('temporaryPasswordIssued')) {
    await db.$executeRawUnsafe(`
      ALTER TABLE "User"
      ADD COLUMN "temporaryPasswordIssued" BOOLEAN NOT NULL DEFAULT false
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

function errorResponse(
  message: string,
  error: unknown,
  status = 500,
) {
  console.error(message, error)

  return NextResponse.json(
    {
      success: false,
      error: message,
      ...(DEVELOPMENT
        ? {
            details:
              error instanceof Error ? error.message : String(error),
          }
        : {}),
    },
    { status },
  )
}

export async function GET(request: NextRequest) {
  try {
    const auth = requireMatchingRequestUser(request)
    if ('error' in auth) return auth.error

    await ensureSettingsColumns()

    const user = await db.user.findUnique({
      where: { id: auth.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        profilePicture: true,
        temporaryPasswordIssued: true,
        passwordChangedAt: true,
        onboardingReminderDismissedAt: true,
        preferences: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success: true,
      user: serializeUser(user),
    })
  } catch (error) {
    return errorResponse('Failed to fetch user settings', error)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = requireMatchingRequestUser(request)
    if ('error' in auth) return auth.error

    await ensureSettingsColumns()

    const body = await request.json()
    const currentUser = await db.user.findUnique({
      where: { id: auth.userId },
      select: {
        id: true,
        password: true,
        preferences: true,
      },
    })

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 },
      )
    }

    const updates: Record<string, unknown> = {}
    const preferences = parsePreferences(currentUser.preferences)

    if (body.name !== undefined) {
      const cleanName = String(body.name).trim()

      if (!cleanName) {
        return NextResponse.json(
          { success: false, error: 'Name is required' },
          { status: 400 },
        )
      }

      if (cleanName.length > 120) {
        return NextResponse.json(
          { success: false, error: 'Name is too long' },
          { status: 400 },
        )
      }

      updates.name = cleanName
    }

    if (body.phone !== undefined) {
      const cleanPhone = String(body.phone || '').trim()

      if (cleanPhone.length > 40) {
        return NextResponse.json(
          { success: false, error: 'Phone number is too long' },
          { status: 400 },
        )
      }

      updates.phone = cleanPhone || null
    }

    if (body.theme !== undefined) {
      const theme = normalizeTheme(body.theme)

      if (!theme) {
        return NextResponse.json(
          { success: false, error: 'Invalid theme value' },
          { status: 400 },
        )
      }

      preferences.theme = theme
    }

    if (body.fontSize !== undefined) {
      const fontSize = normalizeFontSize(body.fontSize)

      if (!fontSize) {
        return NextResponse.json(
          { success: false, error: 'Invalid font size' },
          { status: 400 },
        )
      }

      preferences.fontSize = fontSize
    }

    if (body.accent !== undefined) {
      const accent = normalizeAccent(body.accent)

      if (!accent) {
        return NextResponse.json(
          { success: false, error: 'Invalid accent color' },
          { status: 400 },
        )
      }

      preferences.accent = accent
    }

    const wantsPasswordChange =
      body.currentPassword !== undefined || body.newPassword !== undefined

    if (wantsPasswordChange) {
      const currentPassword = String(body.currentPassword || '')
      const newPassword = String(body.newPassword || '')

      if (!currentPassword || !newPassword) {
        return NextResponse.json(
          {
            success: false,
            error: 'Current password and new password are both required',
          },
          { status: 400 },
        )
      }

      if (newPassword.length < 6) {
        return NextResponse.json(
          {
            success: false,
            error: 'Password must be at least 6 characters',
          },
          { status: 400 },
        )
      }

      const validPassword = await bcrypt.compare(
        currentPassword,
        currentUser.password,
      )

      if (!validPassword) {
        return NextResponse.json(
          { success: false, error: 'Current password is incorrect' },
          { status: 401 },
        )
      }

      updates.password = await bcrypt.hash(newPassword, 10)
      updates.temporaryPasswordIssued = false
      updates.passwordChangedAt = new Date()
      updates.onboardingReminderDismissedAt = null
    }

    updates.preferences = JSON.stringify(preferences)

    const updatedUser = await db.user.update({
      where: { id: auth.userId },
      data: updates,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        profilePicture: true,
        temporaryPasswordIssued: true,
        passwordChangedAt: true,
        onboardingReminderDismissedAt: true,
        preferences: true,
      },
    })

    return NextResponse.json({
      success: true,
      user: serializeUser(updatedUser),
      message: 'Settings updated successfully',
    })
  } catch (error) {
    return errorResponse('Failed to update user settings', error)
  }
}
